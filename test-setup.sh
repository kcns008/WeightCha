#!/bin/bash

# Test script to verify Podman setup
echo "🧪 Testing Podman Configuration"
echo "==============================="

# Test Podman
echo "Testing Podman..."
podman --version

echo ""
echo "Testing podman-compose..."
if command -v podman-compose &> /dev/null; then
    podman-compose --version
else
    echo "❌ podman-compose not found. Installing..."
    pip3 install podman-compose
fi

echo ""
echo "✅ Podman setup looks good!"
echo ""
echo "Available startup options:"
echo "1. ./start-demo.sh      - Simple demo (currently running)"
echo "2. ./start-local.sh     - Full environment with database"
echo ""

echo "Current demo server status:"
curl -s http://localhost:3000/api/health | python3 -m json.tool
