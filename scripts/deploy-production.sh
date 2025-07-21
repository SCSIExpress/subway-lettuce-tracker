#!/bin/bash

# Production Deployment Script for Subway Lettuce Tracker
set -e

echo "🚀 Starting production deployment..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found. Please create it with production environment variables."
    exit 1
fi

# Load production environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "FRONTEND_URL" "GOOGLE_MAPS_API_KEY" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Create backup of current deployment (if exists)
if [ "$(docker ps -q -f name=subway-lettuce)" ]; then
    echo "📦 Creating backup of current deployment..."
    docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U $POSTGRES_USER subway_lettuce_tracker > backup_$(date +%Y%m%d_%H%M%S).sql
    echo "✅ Database backup created"
fi

# Pull latest images and build
echo "🔄 Building production images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start database and wait for it to be ready
echo "🗄️ Starting database..."
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=60
while ! docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U $POSTGRES_USER -d subway_lettuce_tracker; do
    sleep 2
    timeout=$((timeout - 2))
    if [ $timeout -le 0 ]; then
        echo "❌ Database failed to start within 60 seconds"
        exit 1
    fi
done

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Start all services
echo "🚀 Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "🏥 Waiting for services to be healthy..."
sleep 30

# Health check
echo "🔍 Performing health checks..."
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

# Clean up old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Production deployment completed successfully!"
echo "📍 Frontend: http://localhost:8080"
echo "📍 Backend API: http://localhost:5000"
echo "📍 Health Check: http://localhost:5000/health"

# Show running containers
echo "📋 Running containers:"
docker-compose -f docker-compose.prod.yml ps