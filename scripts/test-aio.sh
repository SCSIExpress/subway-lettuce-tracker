#!/bin/bash

# Test AIO Container for Subway Lettuce Tracker

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

print_header "Testing AIO Container"

# Check if container exists
if ! docker images | grep -q "subway-lettuce-aio"; then
    print_error "subway-lettuce-aio container not found"
    print_error "Please build the container first: ./scripts/build-aio.sh"
    exit 1
fi

print_status "✅ Container found"

# Test 1: Check container structure
print_status "Test 1: Checking container structure..."
STRUCTURE_CHECK=$(docker run --rm subway-lettuce-aio:latest ls -la /app/ | grep -E "(backend|frontend|start.sh|healthcheck.sh)" || echo "")

if [ -n "$STRUCTURE_CHECK" ]; then
    print_status "✅ Container structure is correct:"
    echo "$STRUCTURE_CHECK"
else
    print_error "❌ Container structure is incorrect"
fi

# Test 2: Check if runtime injection works
print_status "Test 2: Testing runtime environment variable injection..."
PLACEHOLDER_CHECK=$(docker run --rm subway-lettuce-aio:latest sh -c "find /app/frontend -name '*.js' -exec grep -l '__GOOGLE_MAPS_API_KEY_PLACEHOLDER__' {} \; 2>/dev/null | head -1")

if [ -n "$PLACEHOLDER_CHECK" ]; then
    print_status "✅ Runtime injection placeholders found in built files"
    print_status "   Found in: $PLACEHOLDER_CHECK"
else
    print_warning "⚠ No placeholders found - this may be normal if build process changed"
fi

# Test 3: Quick container start test
print_status "Test 3: Quick container start test..."
print_warning "Starting container for 10 seconds..."

# Start container in background with test environment
docker run -d --name test-aio-container \
    -p 8081:8080 \
    -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
    -e REDIS_URL="redis://localhost:6379" \
    -e VITE_GOOGLE_MAPS_API_KEY="test_api_key" \
    subway-lettuce-aio:latest >/dev/null 2>&1

sleep 5

# Check if container is running
if docker ps | grep -q "test-aio-container"; then
    print_status "✅ Container started successfully"
    
    # Try to access the health endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/health 2>/dev/null | grep -q "200"; then
        print_status "✅ Health endpoint accessible"
    else
        print_warning "⚠ Health endpoint not accessible (expected without real database)"
    fi
    
    # Check if frontend is served
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/ 2>/dev/null | grep -q "200"; then
        print_status "✅ Frontend accessible at http://localhost:8081/"
    else
        print_warning "⚠ Frontend not accessible"
    fi
else
    print_error "❌ Container failed to start"
    print_status "Container logs:"
    docker logs test-aio-container 2>&1 | tail -10
fi

# Test 4: Check environment variable injection
print_status "Test 4: Checking environment variable injection..."
if docker ps | grep -q "test-aio-container"; then
    ENV_INJECTION=$(docker exec test-aio-container sh -c "find /app/frontend -name '*.js' -exec grep -l 'test_api_key' {} \; 2>/dev/null | head -1" || echo "")
    
    if [ -n "$ENV_INJECTION" ]; then
        print_status "✅ Environment variable injection working"
        print_status "   API key injected into: $ENV_INJECTION"
    else
        print_warning "⚠ Environment variable injection may not be working"
    fi
fi

# Cleanup
docker stop test-aio-container >/dev/null 2>&1 || true
docker rm test-aio-container >/dev/null 2>&1 || true

print_header "Test Summary"

print_status "Container tests completed!"
echo ""
print_status "Next steps:"
echo "1. If tests passed, push to GHCR: ./scripts/push-to-ghcr.sh"
echo "2. Deploy with Docker Compose: docker-compose -f docker-compose.aio.yml up -d"
echo "3. Test with real database and Redis connections"

echo ""
print_status "For production deployment:"
echo "1. Set up PostgreSQL and Redis"
echo "2. Configure environment variables in .env file"
echo "3. Use docker-compose.aio.yml for complete stack"

echo ""
print_warning "Remember to:"
echo "- Use a real Google Maps API key"
echo "- Set up proper database and Redis connections"
echo "- Configure security settings for production"