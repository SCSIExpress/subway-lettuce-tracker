#!/bin/bash

# Staging Deployment Script for Subway Lettuce Tracker
set -e

echo "🚀 Starting staging deployment..."

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo "❌ .env.staging file not found. Please create it with staging environment variables."
    exit 1
fi

# Load staging environment variables
export $(cat .env.staging | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "STAGING_FRONTEND_URL" "STAGING_GOOGLE_MAPS_API_KEY" "STAGING_JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build staging images
echo "🔄 Building staging images..."
docker-compose -f docker-compose.staging.yml build --no-cache

# Stop existing containers
echo "🛑 Stopping existing staging containers..."
docker-compose -f docker-compose.staging.yml down

# Start services
echo "🚀 Starting staging services..."
docker-compose -f docker-compose.staging.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=60
while ! docker-compose -f docker-compose.staging.yml exec postgres pg_isready -U $POSTGRES_USER -d subway_lettuce_tracker_staging; do
    sleep 2
    timeout=$((timeout - 2))
    if [ $timeout -le 0 ]; then
        echo "❌ Database failed to start within 60 seconds"
        exit 1
    fi
done

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.staging.yml run --rm backend npm run migrate

# Wait for services to be healthy
echo "🏥 Waiting for services to be healthy..."
sleep 30

# Health check
echo "🔍 Performing health checks..."
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    docker-compose -f docker-compose.staging.yml logs backend
    exit 1
fi

if curl -f http://localhost:8081/health > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    docker-compose -f docker-compose.staging.yml logs frontend
    exit 1
fi

echo "🎉 Staging deployment completed successfully!"
echo "📍 Frontend: http://localhost:8081"
echo "📍 Backend API: http://localhost:5001"
echo "📍 Health Check: http://localhost:5001/health"

# Show running containers
echo "📋 Running containers:"
docker-compose -f docker-compose.staging.yml ps