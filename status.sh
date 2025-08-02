#!/bin/bash

echo "🏕️ WeightCha Status Dashboard"
echo "============================="
echo ""

# Check demo server
echo "📱 Demo Server Status:"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "   ✅ Demo site running at http://localhost:3000"
    echo "   📊 Health: $(curl -s http://localhost:3000/api/health | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['status'])")"
else
    echo "   ❌ Demo site not running"
fi

echo ""

# Check backend API (if running)
echo "🔧 Backend API Status:"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "   ✅ Backend API running at http://localhost:3001"
else
    echo "   ❌ Backend API not running (use ./start-local.sh to start)"
fi

echo ""

# Check containers
echo "🐳 Container Status:"
if command -v podman &> /dev/null; then
    CONTAINERS=$(podman ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(weightcha|postgres|redis)" || echo "   No WeightCha containers running")
    if [ "$CONTAINERS" != "   No WeightCha containers running" ]; then
        echo "$CONTAINERS"
    else
        echo "   No containers running (use ./start-local.sh for full environment)"
    fi
else
    echo "   Podman not available"
fi

echo ""
echo "🌐 Quick Links:"
echo "   Demo Site:     http://localhost:3000"
echo "   Backend API:   http://localhost:3001"
echo "   Health Check:  http://localhost:3000/api/health"
echo ""
echo "📝 Commands:"
echo "   Stop demo:     Ctrl+C in the demo terminal"
echo "   Start full:    ./start-local.sh"
echo "   View logs:     podman-compose logs -f"
