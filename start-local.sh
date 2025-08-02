#!/bin/bash

# WeightCha Local Development Startup Script
# This script sets up and runs the WeightCha system locally using Podman

set -e

echo "🏕️ Starting WeightCha Local Development Environment"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Podman is installed
if ! command -v podman &> /dev/null; then
    print_error "Podman is not installed. Please install Podman first."
    exit 1
fi

# Check if podman-compose is available
if ! command -v podman-compose &> /dev/null; then
    print_warning "podman-compose not found. Installing via pip..."
    pip3 install podman-compose
fi

# Change to the WeightCha directory
cd "$(dirname "$0")"

print_status "Current directory: $(pwd)"

# Create .env files if they don't exist
if [ ! -f "./backend-api/.env" ]; then
    print_status "Creating backend-api .env file..."
    cp ./backend-api/.env.example ./backend-api/.env
    print_success "Created backend-api/.env from example"
fi

if [ ! -f "./demo/.env" ]; then
    print_status "Creating demo .env file..."
    cp ./demo/.env.example ./demo/.env
    print_success "Created demo/.env from example"
fi

# Stop any existing containers
print_status "Stopping any existing WeightCha containers..."
podman-compose down --remove-orphans 2>/dev/null || true

# Build and start the services
print_status "Building and starting WeightCha services..."
podman-compose up --build -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Check if services are running
print_status "Checking service health..."

# Check backend API
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "✅ WeightCha Backend API is running on http://localhost:3001"
else
    print_error "❌ WeightCha Backend API failed to start"
fi

# Check demo site
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_success "✅ WeightCha Demo Site is running on http://localhost:3000"
else
    print_error "❌ WeightCha Demo Site failed to start"
fi

# Check database
if podman exec weightcha-postgres pg_isready -U weightcha > /dev/null 2>&1; then
    print_success "✅ PostgreSQL database is ready"
else
    print_error "❌ PostgreSQL database is not ready"
fi

# Check Redis
if podman exec weightcha-redis redis-cli ping > /dev/null 2>&1; then
    print_success "✅ Redis cache is ready"
else
    print_error "❌ Redis cache is not ready"
fi

echo ""
echo "🎉 WeightCha Development Environment Ready!"
echo "=========================================="
echo ""
echo "📱 Demo Site:          http://localhost:3000"
echo "🔧 Backend API:        http://localhost:3001"
echo "📊 API Health Check:   http://localhost:3001/api/health"
echo "🗄️  PostgreSQL:        localhost:5432 (user: weightcha, db: weightcha)"
echo "🚀 Redis:              localhost:6379"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:          podman-compose logs -f"
echo "   Stop services:      podman-compose down"
echo "   Restart services:   podman-compose restart"
echo "   Shell into backend: podman exec -it weightcha-api sh"
echo "   Shell into demo:    podman exec -it weightcha-demo sh"
echo ""
echo "🧪 Testing the Demo:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Fill out the contact form"
echo "   3. When prompted, place your hand on the trackpad and apply slight pressure"
echo "   4. The system will verify you're human using pressure patterns"
echo ""
echo "⚙️  Configuration:"
echo "   Backend config:     ./backend-api/.env"
echo "   Demo site config:   ./demo/.env"
echo ""

# Offer to open the demo site
if command -v open &> /dev/null; then
    read -p "🌐 Would you like to open the demo site in your browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open http://localhost:3000
        print_success "Demo site opened in browser"
    fi
fi

print_status "WeightCha is ready for development! 🚀"
