#!/bin/bash

# Quick test script using local databases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_header "Quick AIO Test with Local Databases"

# Check if local databases are running
if ! sudo docker ps | grep -q "subway-lettuce-postgres-dev"; then
    print_error "Local PostgreSQL container not running. Start it with:"
    echo "sudo docker-compose -f docker-compose.dev.yml up -d postgres"
    exit 1
fi

if ! sudo docker ps | grep -q "subway-lettuce-redis-dev"; then
    print_error "Local Redis container not running. Start it with:"
    echo "sudo docker-compose -f docker-compose.dev.yml up -d redis"
    exit 1
fi

print_status "✅ Local databases are running"

# Get Google Maps API key
echo ""
print_status "Please provide your Google Maps API key (or press Enter to skip):"
echo -n "Google Maps API Key: "
read -s GOOGLE_MAPS_API_KEY
echo ""

if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
    print_warning "No API key provided. Using test key (maps won't work)"
    GOOGLE_MAPS_API_KEY="test_key_for_development"
fi

# Configuration
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/subway_lettuce_tracker"
REDIS_URL="redis://:redis123@localhost:6379"
CONTAINER_NAME="subway-lettuce-aio-test"
API_PORT="5001"
FRONTEND_PORT="8080"

print_header "Starting AIO Container"

# Clean up existing container
if sudo docker ps -a | grep -q "$CONTAINER_NAME"; then
    print_status "Removing existing test container..."
    sudo docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

# Start the container
print_status "Starting container with local database connections..."

sudo docker run -d \
  --name "$CONTAINER_NAME" \
  --network host \
  -e DATABASE_URL="$DATABASE_URL" \
  -e REDIS_URL="$REDIS_URL" \
  -e VITE_GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" \
  -e ENABLE_FRONTEND=true \
  -e NODE_ENV=production \
  ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest

if [ $? -eq 0 ]; then
    print_status "✅ Container started successfully!"
    
    # Wait for startup
    print_status "Waiting for services to start..."
    sleep 10
    
    # Show logs
    print_status "Container logs:"
    sudo docker logs --tail 15 "$CONTAINER_NAME"
    
    echo ""
    print_header "Testing Endpoints"
    
    # Test API
    print_status "Testing API health endpoint..."
    if curl -f -s "http://localhost:$API_PORT/health" >/dev/null; then
        print_status "✅ API is responding at http://localhost:$API_PORT"
        echo ""
        echo "API Health Response:"
        curl -s "http://localhost:$API_PORT/health" | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:$API_PORT/health"
    else
        print_warning "❌ API not responding yet. Check logs:"
        sudo docker logs --tail 10 "$CONTAINER_NAME"
    fi
    
    echo ""
    
    # Test frontend
    print_status "Testing frontend endpoint..."
    if curl -f -s "http://localhost:$FRONTEND_PORT" >/dev/null; then
        print_status "✅ Frontend is responding at http://localhost:$FRONTEND_PORT"
    else
        print_warning "❌ Frontend not responding yet"
    fi
    
    echo ""
    print_header "🎉 Test Results"
    
    echo "Container Status:"
    sudo docker ps | grep "$CONTAINER_NAME" || echo "Container not in running state"
    
    echo ""
    echo "Access your application:"
    echo "- 🌐 Frontend: http://localhost:$FRONTEND_PORT"
    echo "- 🔌 API: http://localhost:$API_PORT"
    echo "- 📊 Health: http://localhost:$API_PORT/health"
    
    echo ""
    echo "Management commands:"
    echo "- View logs: sudo docker logs -f $CONTAINER_NAME"
    echo "- Stop: sudo docker stop $CONTAINER_NAME"
    echo "- Remove: sudo docker rm -f $CONTAINER_NAME"
    
else
    print_error "❌ Failed to start container"
    exit 1
fi