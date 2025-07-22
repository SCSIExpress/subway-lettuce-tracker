#!/bin/bash

# Build AIO Container for Subway Lettuce Tracker
# This script builds the All-in-One container with runtime environment variable injection

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

print_header "Building Subway Lettuce Tracker AIO Container"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if Dockerfile.aio exists
if [ ! -f "Dockerfile.aio" ]; then
    print_error "Dockerfile.aio not found in current directory"
    print_error "Please run this script from the project root"
    exit 1
fi

print_status "Building AIO container..."
print_status "This container uses runtime environment variable injection"
print_status "No API keys are hardcoded - they're injected when you run the container"

# Build the container
echo ""
print_status "Building Docker image..."
if docker build -f Dockerfile.aio -t subway-lettuce-aio:latest .; then
    print_status "✅ Container built successfully!"
else
    print_error "❌ Container build failed"
    exit 1
fi

# Tag for GHCR
print_status "Tagging for GitHub Container Registry..."
docker tag subway-lettuce-aio:latest ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest

echo ""
print_header "🎉 Build Complete!"

print_status "Container images created:"
echo "  - subway-lettuce-aio:latest (local)"
echo "  - ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest (for GHCR)"

echo ""
print_status "Next steps:"
echo "1. Test the container locally:"
echo "   ./scripts/test-aio.sh"
echo ""
echo "2. Push to GitHub Container Registry:"
echo "   ./scripts/push-to-ghcr.sh"
echo ""
echo "3. Deploy with Docker Compose:"
echo "   docker-compose -f docker-compose.aio.yml up -d"

echo ""
print_status "Example usage:"
echo "docker run -d --name subway-lettuce-tracker \\"
echo "  -p 8080:8080 \\"
echo "  -e DATABASE_URL=postgresql://user:pass@host:5432/db \\"
echo "  -e REDIS_URL=redis://host:6379 \\"
echo "  -e VITE_GOOGLE_MAPS_API_KEY=your_api_key_here \\"
echo "  subway-lettuce-aio:latest"

echo ""
print_warning "Security Benefits:"
echo "✓ No API keys in Docker image"
echo "✓ API keys only exist at runtime"
echo "✓ Can use different keys for different environments"
echo "✓ Keys can be managed by orchestration tools"