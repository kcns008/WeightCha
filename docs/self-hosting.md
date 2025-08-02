# Self-Hosting WeightCha

This guide will help you set up your own WeightCha instance for complete control over your human verification system.

## 🚀 Quick Deploy

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/weightcha/weightcha.git
cd weightcha

# Start all services
docker-compose up -d

# Check status
./status.sh
```

Your WeightCha API will be available at `http://localhost:3001`

### Option 2: One-Click Cloud Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/weightcha)
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/weightcha/weightcha)
[![Deploy on DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/weightcha/weightcha)

## 🛠️ Manual Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6.0+
- Docker (optional)

### 1. Database Setup

#### PostgreSQL
```sql
-- Create database
CREATE DATABASE weightcha;

-- Create user
CREATE USER weightcha_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE weightcha TO weightcha_user;
```

#### Redis
```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 2. Backend API Setup

```bash
# Navigate to backend directory
cd backend-api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Environment Configuration (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
API_HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://weightcha_user:your_secure_password@localhost:5432/weightcha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=weightcha
DB_USER=weightcha_user
DB_PASSWORD=your_secure_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-super-secret-jwt-key-here
API_KEY_SALT=your-api-key-salt-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Logging
LOG_LEVEL=info
```

### 3. Initialize Database

```bash
# Run database migrations
npm run migrate

# Create initial API key
npm run create-api-key
```

### 4. Start the API Server

```bash
# Development
npm run dev

# Production
npm start

# With PM2 (recommended for production)
npm install -g pm2
pm2 start src/server.js --name "weightcha-api"
```

### 5. Frontend SDK (Optional)

If you want to build and serve your own SDK:

```bash
cd ../web-sdk

# Install dependencies
npm install

# Build SDK
npm run build

# The built files will be in dist/
# Serve them from your CDN or static server
```

## 🔒 Production Configuration

### SSL/TLS Setup

#### Using Nginx
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Using Caddy
```caddyfile
api.yourdomain.com {
    reverse_proxy localhost:3001
}
```

### Environment Variables for Production

```bash
# Security
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 64)
API_KEY_SALT=$(openssl rand -base64 32)

# Database (use connection pooling)
DATABASE_URL=postgresql://user:pass@host:5432/weightcha?pool_size=20

# Redis (use password)
REDIS_URL=redis://:password@host:6379

# CORS (your actual domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate limiting (adjust based on usage)
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Monitoring
LOG_LEVEL=warn
ENABLE_METRICS=true
```

## 📊 Monitoring and Logging

### Health Checks
```bash
# API health
curl http://localhost:3001/api/health

# Database health
curl http://localhost:3001/api/health/database

# Redis health
curl http://localhost:3001/api/health/redis
```

### Logging
Logs are written to:
- Console (development)
- Files in `logs/` directory (production)
- Structured JSON format for easy parsing

### Metrics
Enable metrics collection:
```bash
# Add to .env
ENABLE_METRICS=true
METRICS_PORT=9090

# Prometheus metrics available at
curl http://localhost:9090/metrics
```

## 🔧 Scaling

### Horizontal Scaling

#### Load Balancer Configuration
```nginx
upstream weightcha_api {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    location / {
        proxy_pass http://weightcha_api;
    }
}
```

#### Multiple API Instances
```bash
# Run multiple instances with PM2
pm2 start ecosystem.config.js
```

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'weightcha-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Database Scaling

#### PostgreSQL Optimization
```sql
-- Increase connection limit
ALTER SYSTEM SET max_connections = 200;

-- Optimize for WeightCha workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;

-- Restart PostgreSQL
SELECT pg_reload_conf();
```

#### Read Replicas
```bash
# Configure read replica in .env
DATABASE_READ_URL=postgresql://user:pass@replica-host:5432/weightcha
```

#### Redis Clustering
```bash
# Redis cluster configuration
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

## 🔐 Security Hardening

### API Security
```bash
# Generate strong secrets
export JWT_SECRET=$(openssl rand -base64 64)
export API_KEY_SALT=$(openssl rand -base64 32)

# Set secure headers
HELMET_ENABLED=true
TRUST_PROXY=true
```

### Database Security
```sql
-- Create limited privilege user
CREATE USER weightcha_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE weightcha TO weightcha_app;
GRANT USAGE ON SCHEMA public TO weightcha_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO weightcha_app;
```

### Network Security
```bash
# Firewall rules (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3001/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 6379/tcp
sudo ufw enable
```

## 📈 Performance Optimization

### API Response Time
- Target: < 100ms for verification
- Database queries optimized with indexes
- Redis caching for API keys and challenges
- Connection pooling enabled

### Caching Strategy
```javascript
// API keys cached for 1 hour
await redis.setex(`api_key:${keyHash}`, 3600, JSON.stringify(keyData));

// Challenges cached for 5 minutes
await redis.setex(`challenge:${challengeId}`, 300, JSON.stringify(challenge));
```

### Database Indexes
```sql
-- Essential indexes for performance
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_challenges_id ON challenges(id);
CREATE INDEX idx_verifications_challenge_id ON verifications(challenge_id);
CREATE INDEX idx_pressure_data_verification_id ON pressure_data(verification_id);
```

## 🔄 Backup and Recovery

### Automated Backups
```bash
#!/bin/bash
# backup.sh - Daily database backup

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/weightcha"
DB_NAME="weightcha"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DB_NAME > $BACKUP_DIR/weightcha_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/weightcha_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: weightcha_$DATE.sql.gz"
```

### Cron Job
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

### Restore from Backup
```bash
# Restore database
gunzip -c /backups/weightcha/weightcha_20240101_020000.sql.gz | psql weightcha
```

## 🚀 Deployment Strategies

### Blue-Green Deployment
```bash
# Deploy to green environment
docker-compose -f docker-compose.green.yml up -d

# Test green environment
./test-deployment.sh green

# Switch traffic to green
./switch-traffic.sh green

# Stop blue environment
docker-compose -f docker-compose.blue.yml down
```

### Rolling Updates
```bash
# Update with zero downtime
pm2 reload all
```

### Rollback Plan
```bash
# Quick rollback
git checkout previous-release-tag
docker-compose restart api
```

## 📱 Client Applications

### macOS Client
```bash
cd macos-client

# Build the WebSocket server
swift build

# Run in background
./WeightChaWebSocketServer &
```

### Custom Clients
See [API Reference](./api-reference.md) for building custom clients.

## 📊 Monitoring Dashboard

### Grafana Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Key Metrics to Monitor
- API response times
- Verification success rates
- Database connection pool
- Redis memory usage
- Error rates by endpoint

## 🆘 Troubleshooting

### Common Issues

#### "Database connection failed"
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U weightcha_user -d weightcha
```

#### "Redis connection timeout"
```bash
# Check Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping
```

#### "High API response times"
```bash
# Check database performance
EXPLAIN ANALYZE SELECT * FROM api_keys WHERE key_hash = 'hash';

# Check Redis memory
redis-cli info memory
```

## 📞 Support

- 📖 **Documentation**: [docs.weightcha.com](https://docs.weightcha.com)
- 💬 **Discord**: [discord.gg/weightcha](https://discord.gg/weightcha)
- 🐛 **Issues**: [GitHub Issues](https://github.com/weightcha/weightcha/issues)
- 📧 **Email**: [support@weightcha.com](mailto:support@weightcha.com)

---

**🚀 Successfully self-hosting WeightCha? [Share your experience](https://github.com/weightcha/weightcha/discussions) with the community!**
