#!/bin/bash

# Script to push Subway Lettuce Tracker images to GitHub Container Registry (GHCR)

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

print_header "Push to GitHub Container Registry (GHCR)"

# Check if images exist
print_status "Checking for local Docker images..."
if ! sudo docker images | grep -q "ghcr.io/scsiexpress/subway-lettuce-tracker"; then
    print_error "GHCR-tagged images not found!"
    print_error "Please run the build process first to create the images."
    exit 1
fi

print_status "✅ Found GHCR-tagged images:"
sudo docker images | grep "ghcr.io/scsiexpress/subway-lettuce-tracker"

echo ""
print_warning "Before proceeding, you need a GitHub Personal Access Token with 'write:packages' permission."
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
if echo "$GITHUB_TOKEN" | sudo docker login ghcr.io -u SCSIExpress --password-stdin; then
    print_status "✅ Successfully logged in to GHCR"
else
    print_error "❌ Failed to login to GHCR"
    print_error "Please check your token and try again"
    exit 1
fi

# Push backend image
print_status "Pushing backend image..."
if sudo docker push ghcr.io/scsiexpress/subway-lettuce-tracker-backend:latest; then
    print_status "✅ Backend image pushed successfully"
else
    print_error "❌ Failed to push backend image"
    exit 1
fi

# Push frontend image
print_status "Pushing frontend image..."
if sudo docker push ghcr.io/scsiexpress/subway-lettuce-tracker-frontend:latest; then
    print_status "✅ Frontend image pushed successfully"
else
    print_error "❌ Failed to push frontend image"
    exit 1
fi

print_header "🎉 Success!"

print_status "Both images have been pushed to GHCR:"
echo "- ghcr.io/scsiexpress/subway-lettuce-tracker-backend:latest"
echo "- ghcr.io/scsiexpress/subway-lettuce-tracker-frontend:latest"

echo ""
print_status "Your images are now publicly available and can be used with:"
echo "- Unraid templates"
echo "- Docker Compose"
echo "- Any Docker environment"

echo ""
print_status "To verify the images are available:"
echo "docker pull ghcr.io/scsiexpress/subway-lettuce-tracker-backend:latest"
echo "docker pull ghcr.io/scsiexpress/subway-lettuce-tracker-frontend:latest"

echo ""
print_status "You can now use your Unraid templates without needing to manually load images!"

# Logout for security
sudo docker logout ghcr.io
print_status "Logged out of GHCR for security"