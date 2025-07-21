#!/bin/bash

# Script to load Docker images on Unraid
# Run this script on your Unraid server after transferring the .tar files

echo "Loading Subway Lettuce Tracker Docker images..."

# Load backend image
if [ -f "subway-lettuce-tracker-backend.tar" ]; then
    echo "Loading backend image..."
    docker load -i subway-lettuce-tracker-backend.tar
    echo "✅ Backend image loaded"
else
    echo "❌ Backend image file not found: subway-lettuce-tracker-backend.tar"
fi

# Load frontend image
if [ -f "subway-lettuce-tracker-frontend.tar" ]; then
    echo "Loading frontend image..."
    docker load -i subway-lettuce-tracker-frontend.tar
    echo "✅ Frontend image loaded"
else
    echo "❌ Frontend image file not found: subway-lettuce-tracker-frontend.tar"
fi

# Verify images are loaded
echo ""
echo "Verifying loaded images:"
docker images | grep subway-lettuce-tracker

echo ""
echo "🎉 Images loaded successfully!"
echo ""
echo "You can now use the Unraid templates with these images:"
echo "- ghcr.io/scsiexpress/subway-lettuce-tracker-backend:latest"
echo "- ghcr.io/scsiexpress/subway-lettuce-tracker-frontend:latest"
echo ""
echo "Don't forget to also set up PostgreSQL and Redis containers using the provided templates."