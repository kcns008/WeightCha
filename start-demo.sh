#!/bin/bash

# Simple WeightCha Demo Startup (No Database Required)
# This script runs just the demo site for quick testing

set -e

echo "🏕️ Starting WeightCha Demo Site (Simple Mode)"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Change to demo directory
cd "$(dirname "$0")/demo"

print_status "Installing demo dependencies..."
npm install

print_status "Creating .env file if not exists..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file"
fi

print_status "Starting demo server..."
echo ""
echo "🎉 WeightCha Demo Site Starting..."
echo "================================="
echo ""
echo "📱 Demo Site:          http://localhost:3000"
echo "📊 Health Check:       http://localhost:3000/api/health"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Fill out the contact form"
echo "   3. When prompted, place your hand on the trackpad and apply slight pressure"
echo "   4. The system will detect pressure patterns to verify you're human"
echo ""
echo "Note: This demo runs without the full WeightCha backend"
echo "      For full testing, use './start-local.sh' instead"
echo ""

# Start the server
npm run dev
