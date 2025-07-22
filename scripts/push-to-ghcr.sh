#!/bin/bash

# Push AIO Container to GitHub Container Registry (GHCR)

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

print_header "Push AIO Container to GitHub Container Registry"

# Check if AIO image exists
print_status "Checking for AIO Docker image..."
if ! docker images | grep -q "ghcr.io/scsiexpress/subway-lettuce-tracker-aio"; then
    print_error "AIO image not found!"
    print_error "Please build the image first: ./scripts/build-aio.sh"
    exit 1
fi

print_status "✅ Found AIO image:"
docker images | grep "ghcr.io/scsiexpress/subway-lettuce-tracker-aio"

echo ""
print_warning "You need a GitHub Personal Access Token with 'write:packages' permission."
print_warning "Create one at: https://github.com/settings/tokens"
echo ""

read -p "Do you have a GitHub Personal Access Token ready? (y/n): " TOKEN_READY

if [ "$TOKEN_READY" != "y" ] && [ "$TOKEN_READY" != "Y" ]; then
    echo ""
    print_status "Please create a GitHub Personal Access Token first:"
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select scopes: write:packages, read:packages"
    echo "4. Copy the token"
    echo "5. Run this script again"
    exit 0
fi

echo ""
print_status "Please enter your GitHub Personal Access Token:"
read -s GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    print_error "No token provided. Exiting."
    exit 1
fi

# Login to GHCR
print_status "Logging in to GitHub Container Registry..."
if echo "$GITHUB_TOKEN" | docker login ghcr.io -u SCSIExpress --password-stdin; then
    print_status "✅ Successfully logged in to GHCR"
else
    print_error "❌ Failed to login to GHCR"
    print_error "Please check your token and try again"
    exit 1
fi

# Push AIO image
print_status "Pushing AIO image..."
if docker push ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest; then
    print_status "✅ AIO image pushed successfully"
else
    print_error "❌ Failed to push AIO image"
    exit 1
fi

print_header "🎉 Success!"

print_status "AIO image has been pushed to GHCR:"
echo "- ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest"

echo ""
print_status "Your AIO image is now publicly available and can be used with:"
echo "- Unraid templates"
echo "- Docker Compose"
echo "- Kubernetes"
echo "- Any Docker environment"

echo ""
print_status "To verify the image is available:"
echo "docker pull ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest"

echo ""
print_status "Unraid template is available at:"
echo "https://raw.githubusercontent.com/SCSIExpress/subway-lettuce-tracker/main/unraid-templates/subway-lettuce-tracker-all-in-one.xml"

# Logout for security
docker logout ghcr.io
print_status "Logged out of GHCR for security"