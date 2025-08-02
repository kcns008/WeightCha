# WeightCha Backend API

A Node.js API service for WeightCha human verification system that uses MacBook trackpad pressure detection.

## Features

- **RESTful API** for challenge creation and verification
- **Human Pattern Analysis** using advanced algorithms
- **Redis Caching** for performance optimization
- **PostgreSQL** for persistent data storage
- **JWT-based** verification tokens
- **Rate Limiting** and security middleware
- **Comprehensive Logging** with Winston
- **API Key Management** for client authentication

## Quick Start

### Prerequisites

- Node.js 18.0+
- PostgreSQL 12+
- Redis 6.0+

### Installation

1. **Clone and navigate to backend directory:**
```bash
cd WeightCha/backend-api
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database setup:**
```bash
# Create PostgreSQL database
createdb weightcha

# Run migrations (you'll need to create these)
npm run migrate
```

5. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

All API endpoints require authentication via Bearer token:
```
Authorization: Bearer your-api-key-here
```

### Challenge Management

#### Create Challenge
```http
POST /api/v1/challenges
Content-Type: application/json

{
  "type": "pressure_pattern",
  "difficulty": "medium",
  "duration": 5,
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challengeId": "uuid",
    "type": "pressure_pattern",
    "difficulty": "medium",
    "duration": 5,
    "instructions": "Apply gentle, steady pressure on your trackpad for 5 seconds",
    "expiresAt": "2024-01-01T12:00:00Z",
    "websocketUrl": "ws://localhost:3000/ws/challenge/uuid"
  }
}
```

#### Get Challenge
```http
GET /api/v1/challenges/{challengeId}
```

#### Cancel Challenge
```http
DELETE /api/v1/challenges/{challengeId}
```

### Verification

#### Submit Verification
```http
POST /api/v1/verification/submit
Content-Type: application/json

{
  "challengeId": "uuid",
  "pressureData": [
    {
      "timestamp": 1642781234567,
      "pressure": 15.5,
      "touchArea": 120.0,
      "position": { "x": 100, "y": 200 }
    }
  ],
  "clientInfo": {
    "userAgent": "Mozilla/5.0...",
    "platform": "macOS",
    "trackpadModel": "Force Touch"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verificationId": "uuid",
    "challengeId": "uuid",
    "status": "completed",
    "isHuman": true,
    "confidence": 0.85,
    "submittedAt": "2024-01-01T12:00:00Z",
    "token": "jwt-verification-token"
  }
}
```

#### Get Verification Result
```http
GET /api/v1/verification/{verificationId}
```

#### Validate Token
```http
POST /api/v1/verification/validate-token
Content-Type: application/json

{
  "token": "jwt-verification-token"
}
```

### API Key Management

#### Create API Key
```http
POST /api/v1/api-keys
Content-Type: application/json

{
  "name": "My Website",
  "description": "API key for example.com",
  "permissions": ["create_challenge", "verify"]
}
```

#### List API Keys
```http
GET /api/v1/api-keys
```

#### Revoke API Key
```http
DELETE /api/v1/api-keys/{keyId}
```

## Challenge Types

### 1. Pressure Pattern
```json
{
  "type": "pressure_pattern",
  "duration": 5
}
```
User applies steady pressure for specified duration.

### 2. Rhythm Test
```json
{
  "type": "rhythm_test",
  "difficulty": "easy"
}
```
User follows a tap rhythm pattern.

### 3. Sustained Pressure
```json
{
  "type": "sustained_pressure",
  "duration": 10
}
```
User maintains pressure while moving finger.

### 4. Progressive Pressure
```json
{
  "type": "progressive_pressure",
  "duration": 7
}
```
User gradually increases pressure over time.

## Human Detection Algorithm

The system analyzes several factors to determine if interaction is human:

### Pressure Analysis
- **Variance**: Humans have natural micro-variations (10-25% CV)
- **Range**: Pressure values within realistic human limits
- **Naturalness**: Absence of repeated or linear patterns

### Timing Analysis
- **Intervals**: Natural variation in timing between samples
- **Rhythm**: For rhythm tests, human-like timing inconsistencies
- **Progression**: Smooth but imperfect pressure changes

### Pattern Recognition
- **Fluctuations**: Micro-fluctuations indicating finger tremor
- **Movement**: Natural movement patterns if position data available
- **Stability**: Relative stability without perfection

### Confidence Scoring
- **Multi-factor**: Combines all analysis dimensions
- **Threshold**: Configurable confidence threshold (default: 0.8)
- **Adaptive**: Adjusts based on challenge type and difficulty

## Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=weightcha
DB_USER=weightcha_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WeightCha Settings
CHALLENGE_EXPIRY_MINUTES=5
VERIFICATION_EXPIRY_MINUTES=30
PRESSURE_VARIANCE_THRESHOLD=0.15
MIN_PRESSURE_SAMPLES=50
HUMAN_PATTERN_CONFIDENCE_THRESHOLD=0.8
```

## Database Schema

### Tables

#### api_keys
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `description` (TEXT)
- `key_hash` (VARCHAR, Indexed)
- `permissions` (JSON)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP, Nullable)
- `last_used_at` (TIMESTAMP, Nullable)

#### challenges
- `id` (UUID, Primary Key)
- `type` (VARCHAR)
- `difficulty` (VARCHAR)
- `duration` (INTEGER)
- `instructions` (TEXT)
- `status` (VARCHAR)
- `api_key_id` (UUID, Foreign Key)
- `metadata` (JSON)
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP)

#### verifications
- `id` (UUID, Primary Key)
- `challenge_id` (UUID, Foreign Key)
- `status` (VARCHAR)
- `is_human` (BOOLEAN)
- `confidence` (DECIMAL)
- `analysis_details` (JSON)
- `submitted_at` (TIMESTAMP)
- `processed_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP)
- `api_key_id` (UUID, Foreign Key)
- `client_info` (JSON)
- `verification_token` (TEXT)

#### pressure_data
- `id` (UUID, Primary Key)
- `verification_id` (UUID, Foreign Key)
- `challenge_id` (UUID, Foreign Key)
- `pressure_samples` (JSON)
- `sample_count` (INTEGER)
- `created_at` (TIMESTAMP)

## Security

### API Key Security
- Keys are hashed using SHA-256
- Rate limiting per API key
- Permission-based access control
- Key expiration support

### Data Protection
- Pressure data stored separately from verification results
- JWT tokens for verification results
- CORS protection
- Input validation and sanitization

### Privacy
- No biometric data storage
- Local pressure processing
- Configurable data retention
- GDPR compliance ready

## Performance

### Caching Strategy
- Redis for API keys (5 minutes)
- Challenge data (until expiry)
- Verification results (30 minutes)

### Database Optimization
- Indexed API key hashes
- Partitioned pressure data by date
- Automatic cleanup of expired records

### Monitoring
- Request/response logging
- Error tracking
- Performance metrics
- Health check endpoint

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Docker Development
```bash
npm run docker:build
npm run docker:run
```

### Database Migrations
```bash
# Create migration
npm run migrate:make migration_name

# Run migrations
npm run migrate:latest

# Rollback migration
npm run migrate:rollback
```

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up Redis cluster
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
6. Configure monitoring

### Health Checks
```http
GET /health
```

Returns server status and version information.

## Integration Examples

### Website Integration
```javascript
// Create challenge
const challenge = await fetch('/api/v1/challenges', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'pressure_pattern',
    difficulty: 'medium'
  })
});

// Submit verification
const verification = await fetch('/api/v1/verification/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    challengeId: challenge.challengeId,
    pressureData: pressureDataFromClient
  })
});
```

### Backend Validation
```javascript
// Validate verification token
const validation = await fetch('/api/v1/verification/validate-token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: verificationToken
  })
});

if (validation.data.valid && validation.data.isHuman) {
  // User verified as human
  processUserRequest();
}
```

## License

MIT License - see LICENSE file for details.
