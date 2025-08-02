# WeightCha Local Development

This directory contains everything needed to run WeightCha locally for development and testing.

## Quick Start (Demo Only)

For a quick demo without the full backend infrastructure:

```bash
# From the WeightCha directory
./start-demo.sh
```

This will:
- Install demo dependencies
- Start the camping site demo on http://localhost:3000
- Use simulated WeightCha validation for testing

## Full Development Environment

For complete testing with the full WeightCha backend API:

```bash
# From the WeightCha directory
./start-local.sh
```

This will:
- Start PostgreSQL database
- Start Redis cache
- Build and start the WeightCha backend API
- Start the demo site
- All services run in Podman containers

## What You'll Get

### Demo Site (http://localhost:3000)
- Interactive Orillia Camping Resort contact form
- Real-time pressure detection using browser APIs
- Visual feedback during verification
- Complete form submission flow

### Backend API (http://localhost:3001)
- Full WeightCha verification API
- Human pattern analysis
- Token validation
- Analytics and monitoring

## Testing the WeightCha System

1. **Open the demo site** in a modern browser (Chrome, Safari, or Edge recommended)
2. **Fill out the contact form** with your information
3. **Click Submit** - you'll see the WeightCha verification prompt
4. **Place your hand** on your MacBook's trackpad
5. **Apply gentle, steady pressure** for 2-3 seconds
6. **Watch the visual feedback** as the system detects your pressure patterns
7. **Form submits** once you're verified as human

## Browser API Support

The system automatically detects and uses the best available API:

- **Chrome/Edge**: WebHID API for direct hardware access
- **Safari**: Force Touch API for native pressure detection
- **All Browsers**: Pointer Events with pressure simulation
- **Mobile/Fallback**: Motion sensors and traditional CAPTCHA

## Development Files

```
WeightCha/
├── start-local.sh           # Full environment startup
├── start-demo.sh            # Demo-only startup
├── docker-compose.yml       # Full service orchestration
├── backend-api/             # WeightCha API service
│   ├── Dockerfile
│   ├── src/
│   └── database/
└── demo/                    # Camping site demo
    ├── Dockerfile
    ├── camping-backend.js   # Demo server
    ├── orillia-camping-demo.html
    └── package.json
```

## Configuration

### Demo Configuration (.env)
```bash
# Demo site settings
PORT=3000
WEIGHTCHA_ENABLED=true
WEIGHTCHA_API_URL=http://localhost:3001/api
SMTP_HOST=smtp.gmail.com
```

### Backend Configuration (.env)
```bash
# Backend API settings
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://weightcha:password@localhost:5432/weightcha
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Podman Issues
```bash
# Check Podman status
podman version

# Install podman-compose if missing
pip3 install podman-compose

# Reset containers
podman-compose down --volumes
podman system prune -f
```

### Permission Issues
```bash
# Make scripts executable
chmod +x start-local.sh start-demo.sh
```

### Port Conflicts
If ports 3000 or 3001 are in use:
```bash
# Find processes using ports
lsof -i :3000
lsof -i :3001

# Kill processes if needed
kill -9 <PID>
```

### Browser API Issues
- **Chrome**: Enable "Experimental Web Platform features" in chrome://flags
- **Safari**: Enable "Develop" menu and "Experimental Features"
- **Firefox**: May require manual API enabling in about:config

## Monitoring

### View Logs
```bash
# All services
podman-compose logs -f

# Specific service
podman-compose logs -f weightcha-demo
podman-compose logs -f weightcha-api
```

### Database Access
```bash
# Connect to PostgreSQL
podman exec -it weightcha-postgres psql -U weightcha -d weightcha

# Connect to Redis
podman exec -it weightcha-redis redis-cli
```

## Production Deployment

The system is designed for easy deployment to:
- **Vercel/Netlify**: Static demo site with serverless functions
- **Docker/Kubernetes**: Containerized backend services
- **AWS/Azure/GCP**: Cloud-native deployment with managed databases

See `integration-guide.md` for detailed production deployment instructions.

## Support

For issues or questions:
1. Check the browser console for API errors
2. Review service logs using `podman-compose logs`
3. Verify your trackpad supports Force Touch (MacBook 2015+)
4. Test with different browsers if one isn't working

The system gracefully degrades if trackpad pressure isn't available, falling back to traditional CAPTCHA methods.
