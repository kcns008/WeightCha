# WeightCha AI Development Instructions

## Architecture Overview

WeightCha is a human verification system using trackpad pressure detection as an alternative to traditional CAPTCHAs. The system consists of:

- **Backend API** (`backend-api/`): Node.js/Express service with PostgreSQL + Redis
- **Web SDK** (`web-sdk/`): TypeScript SDK for website integration  
- **Demo Site** (`demo/`): Example camping resort with WeightCha integration
- **macOS Client** (`macos-client/`): Swift WebSocket server for native trackpad access

## Key Development Patterns

### Service Architecture (backend-api/src/)
- **Routes** (`routes/`) expose REST endpoints with Joi validation
- **Services** (`services/`) contain business logic and external integrations
- **Middleware** (`middleware/`) handles auth, logging, validation, and error handling
- **Database** (`database/`) uses custom query builder, not an ORM
- Redis caching pattern: `await redisClient.get('api_key:${key}')` for performance

### Authentication Flow
```javascript
// API key auth in headers: Authorization: Bearer <api-key>
// JWT tokens for verification results: { token, isHuman, confidence }
// Cache API keys in Redis for performance
```

### Human Pattern Analysis
The core algorithm in `services/humanPatternAnalyzer.js` detects:
- Pressure variance (natural micro-variations vs bot-like consistency)
- Timing patterns (human irregularity vs programmatic timing)
- Statistical analysis (coefficient of variation, linearity detection)

### Web SDK Integration Pattern
```typescript
const weightcha = new WeightCha({ apiKey: 'key' });
await weightcha.verify('container-id', {
  onSuccess: (token) => submitForm(token),
  onError: (error) => handleError(error)
});
```

## Development Workflows

### Local Development
```bash
./start-local.sh    # Full environment (Podman + containers)
./start-demo.sh     # Demo only (simulated verification)
./status.sh         # Check service health
```

### Container Strategy
- Uses **Podman** (not Docker) for local development
- Services: weightcha-api:3001, demo-site:3000, postgres:5432, redis:6379
- Network: `weightcha-network` for inter-service communication
- Environment files: Production configs in docker-compose.yml

### Database Patterns
```javascript
// Custom query builder (no ORM)
const rows = await database('api_keys')
  .select('id', 'permissions')
  .where('key_hash', hash)
  .where('is_active', true);
```

### Error Handling Convention
```javascript
// Services throw errors, routes catch and format
try {
  const result = await service.method(params);
  res.json({ success: true, data: result });
} catch (error) {
  next(error); // Handled by errorHandler middleware
}
```

## Integration Points

### WebSocket Communication
- macOS client (`macos-client/WeightChaWebSocketServer.swift`) exposes trackpad data
- Web SDK connects via WebSocket for native pressure detection
- Falls back to browser APIs when WebSocket unavailable

### Challenge Types
1. `pressure_pattern` - Detect natural pressure variations
2. `rhythm_test` - Timing pattern analysis  
3. `sustained_pressure` - Continuous pressure validation
4. `progressive_pressure` - Graduated pressure increase

### API Token Validation
Backend validates WeightCha tokens in client applications:
```javascript
POST /api/v1/verification/validate-token
{ "token": "jwt-token" }
// Returns: { isValid, isHuman, confidence, expiresAt }
```

## Critical Configuration

### Environment Variables
```bash
# Backend API
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret
RATE_LIMIT_MAX_REQUESTS=100

# Demo Site  
WEIGHTCHA_API_URL=http://localhost:3001/api
WEIGHTCHA_ENABLED=true
```

### Security Patterns
- API keys hashed with bcrypt, cached in Redis
- Rate limiting per IP: 100 requests/15min default
- Helmet.js for security headers
- CORS configured per environment
- Input validation with Joi schemas on all endpoints

## Testing Approach

### Demo Testing Flow
1. Visit http://localhost:3000 (camping demo)
2. Fill contact form and submit
3. WeightCha prompt appears
4. Apply trackpad pressure (MacBook 2015+)
5. System validates human patterns
6. Form submits with verification token

### API Testing
```bash
# Health check
curl http://localhost:3001/api/health

# Create challenge
curl -X POST http://localhost:3001/api/v1/challenges \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json"
```

This codebase prioritizes privacy (no biometric storage), performance (Redis caching), and developer experience (comprehensive SDK with TypeScript support).
