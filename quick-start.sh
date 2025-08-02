#!/bin/bash

# WeightCha Quick Start Script
# Sets up WeightCha for development and testing

set -e

echo "🚀 WeightCha Quick Start"
echo "======================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed."
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker found"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration..."
    cat > .env << EOF
# WeightCha Environment Configuration
NODE_ENV=development
API_PORT=3001
DEMO_PORT=3000

# Database
POSTGRES_USER=weightcha
POSTGRES_PASSWORD=weightcha_dev_password
POSTGRES_DB=weightcha

# Redis
REDIS_PASSWORD=weightcha_redis_dev

# API Security
JWT_SECRET=your-jwt-secret-key-here-change-in-production
API_KEY_SALT=your-api-key-salt-here-change-in-production

# Demo Configuration
DEMO_API_KEY=demo-key
EOF
    echo "✅ Environment file created"
else
    echo "✅ Environment file exists"
fi

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services started successfully!"
else
    echo "❌ Some services failed to start"
    docker-compose logs
    exit 1
fi

# Initialize database
echo "🗄️  Initializing database..."
docker-compose exec -T api npm run init-db || echo "Database already initialized"

# Create demo API key
echo "🔑 Creating demo API key..."
docker-compose exec -T api npm run create-demo-key || echo "Demo key already exists"

echo ""
echo "🎉 WeightCha is ready!"
echo "====================="
echo ""
echo "📍 Services running at:"
echo "   • Demo Website: http://localhost:3000"
echo "   • API Server:   http://localhost:3001"
echo "   • API Health:   http://localhost:3001/api/health"
echo ""
echo "🧪 Try WeightCha:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Use a MacBook with trackpad for best experience"
echo "   3. Follow the on-screen instructions"
echo ""
echo "📖 Next steps:"
echo "   • Read the docs: ./docs/getting-started.md"
echo "   • Check examples: ./docs/examples/"
echo "   • Join Discord: https://discord.gg/weightcha"
echo ""
echo "🛑 To stop: ./stop.sh"
echo "📊 To check status: ./status.sh"
echo ""
