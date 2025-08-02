#!/bin/bash

# WeightCha Stop Script
# Stops all WeightCha services

echo "🛑 Stopping WeightCha services..."

docker-compose down

echo "✅ All services stopped"
echo ""
echo "📝 To restart: ./quick-start.sh"
echo "📊 View logs: docker-compose logs"
