#!/bin/bash

# Script to test the AIO container with real credentials
# This script prompts for sensitive information securely

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

print_header "Subway Lettuce Tracker AIO Container Test"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! sudo docker info &> /dev/null; then
    print_error "Docker is not running or you don't have permission"
    exit 1
fi

print_status "Docker is available and running"

# Check if AIO image exists
if ! sudo docker images | grep -q "ghcr.io/scsiexpress/subway-lettuce-tracker-aio"; then
    print_warning "AIO image not found locally. Pulling from GHCR..."
    if ! sudo docker pull ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest; then
        print_error "Failed to pull AIO image from GHCR"
        exit 1
    fi
fi

print_status "✅ AIO image is available"

echo ""
print_header "Database Configuration"

# Get database configuration
echo "Please provide your PostgreSQL database connection details:"
echo ""

read -p "PostgreSQL Host (e.g., localhost, your-db-server.com): " DB_HOST
read -p "PostgreSQL Port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database Name (default: subway_lettuce_tracker): " DB_NAME
DB_NAME=${DB_NAME:-subway_lettuce_tracker}

read -p "Database Username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

echo -n "Database Password: "
read -s DB_PASSWORD
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo ""
print_header "Redis Configuration"

# Get Redis configuration
echo "Please provide your Redis connection details:"
echo ""

read -p "Redis Host (e.g., localhost, your-redis-server.com): " REDIS_HOST
read -p "Redis Port (default: 6379): " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}

echo -n "Redis Password (leave empty if no password): "
read -s REDIS_PASSWORD
echo ""

# Construct REDIS_URL
if [ -z "$REDIS_PASSWORD" ]; then
    REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
else
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
fi

echo ""
print_header "Google Maps API Configuration"

# Get Google Maps API key
echo "Please provide your Google Maps API key:"
echo "Get one from: https://console.cloud.google.com/"
echo ""

echo -n "Google Maps API Key: "
read -s GOOGLE_MAPS_API_KEY
echo ""

if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
    print_warning "No Google Maps API key provided. Maps functionality will not work."
    GOOGLE_MAPS_API_KEY="test_key_no_maps"
fi

echo ""
print_header "Container Configuration"

# Ask about frontend
read -p "Enable frontend web interface? (y/n, default: y): " ENABLE_FRONTEND_INPUT
ENABLE_FRONTEND_INPUT=${ENABLE_FRONTEND_INPUT:-y}

if [[ "$ENABLE_FRONTEND_INPUT" =~ ^[Yy]$ ]]; then
    ENABLE_FRONTEND="true"
    FRONTEND_PORT="8080"
    print_status "Frontend will be enabled on port 8080"
else
    ENABLE_FRONTEND="false"
    FRONTEND_PORT=""
    print_status "Frontend will be disabled (API-only mode)"
fi

# Ask about ports
read -p "API Port (default: 5001): " API_PORT
API_PORT=${API_PORT:-5001}

if [ "$ENABLE_FRONTEND" = "true" ]; then
    read -p "Frontend Port (default: 8080): " FRONTEND_PORT
    FRONTEND_PORT=${FRONTEND_PORT:-8080}
fi

echo ""
print_header "Starting Test Container"

# Clean up any existing test container
CONTAINER_NAME="subway-lettuce-aio-test"
if sudo docker ps -a | grep -q "$CONTAINER_NAME"; then
    print_status "Removing existing test container..."
    sudo docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

# Build Docker run command
DOCKER_CMD="sudo docker run -d --name $CONTAINER_NAME"

# Add port mappings
DOCKER_CMD="$DOCKER_CMD -p $API_PORT:5000"
if [ "$ENABLE_FRONTEND" = "true" ]; then
    DOCKER_CMD="$DOCKER_CMD -p $FRONTEND_PORT:8080"
fi

# Add environment variables
DOCKER_CMD="$DOCKER_CMD -e DATABASE_URL='$DATABASE_URL'"
DOCKER_CMD="$DOCKER_CMD -e REDIS_URL='$REDIS_URL'"
DOCKER_CMD="$DOCKER_CMD -e VITE_GOOGLE_MAPS_API_KEY='$GOOGLE_MAPS_API_KEY'"
DOCKER_CMD="$DOCKER_CMD -e ENABLE_FRONTEND=$ENABLE_FRONTEND"
DOCKER_CMD="$DOCKER_CMD -e NODE_ENV=production"

# Add the image
DOCKER_CMD="$DOCKER_CMD ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest"

print_status "Starting container with configuration:"
echo "- Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "- Redis: ${REDIS_HOST}:${REDIS_PORT}"
echo "- Frontend: $ENABLE_FRONTEND"
echo "- API Port: $API_PORT"
if [ "$ENABLE_FRONTEND" = "true" ]; then
    echo "- Frontend Port: $FRONTEND_PORT"
fi

# Execute the command
eval $DOCKER_CMD

if [ $? -eq 0 ]; then
    print_status "✅ Container started successfully!"
    
    echo ""
    print_header "Container Information"
    
    # Wait a moment for container to initialize
    sleep 3
    
    # Show container status
    print_status "Container status:"
    sudo docker ps | grep "$CONTAINER_NAME" || print_warning "Container not found in running processes"
    
    echo ""
    print_status "Container logs (last 20 lines):"
    sudo docker logs --tail 20 "$CONTAINER_NAME"
    
    echo ""
    print_header "Testing Endpoints"
    
    # Test API endpoint
    print_status "Testing API health endpoint..."
    sleep 5  # Give more time for startup
    
    if curl -f -s "http://localhost:$API_PORT/health" >/dev/null; then
        print_status "✅ API is responding at http://localhost:$API_PORT"
        echo "Health check response:"
        curl -s "http://localhost:$API_PORT/health" | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:$API_PORT/health"
    else
        print_warning "❌ API health check failed"
        print_status "API logs:"
        sudo docker logs --tail 10 "$CONTAINER_NAME"
    fi
    
    # Test frontend if enabled
    if [ "$ENABLE_FRONTEND" = "true" ]; then
        echo ""
        print_status "Testing frontend endpoint..."
        
        if curl -f -s "http://localhost:$FRONTEND_PORT" >/dev/null; then
            print_status "✅ Frontend is responding at http://localhost:$FRONTEND_PORT"
        else
            print_warning "❌ Frontend health check failed"
        fi
    fi
    
    echo ""
    print_header "🎉 Test Complete!"
    
    echo "Your Subway Lettuce Tracker AIO container is running!"
    echo ""
    echo "Access URLs:"
    echo "- API: http://localhost:$API_PORT"
    if [ "$ENABLE_FRONTEND" = "true" ]; then
        echo "- Frontend: http://localhost:$FRONTEND_PORT"
    fi
    echo ""
    echo "Useful commands:"
    echo "- View logs: sudo docker logs -f $CONTAINER_NAME"
    echo "- Stop container: sudo docker stop $CONTAINER_NAME"
    echo "- Remove container: sudo docker rm -f $CONTAINER_NAME"
    
else
    print_error "❌ Failed to start container"
    exit 1
fi