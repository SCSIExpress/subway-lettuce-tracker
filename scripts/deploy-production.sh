#!/bin/bash

# Subway Lettuce Tracker - Production Deployment Script
# This script deploys the application in production mode with proper security and optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Do not run this script as root for security reasons"
    exit 1
fi

print_header "Subway Lettuce Tracker - Production Deployment"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check for production environment file
if [ ! -f .env.production ]; then
    print_warning "Production environment file not found."
    if [ -f .env.production.template ]; then
        print_status "Creating .env.production from template..."
        cp .env.production.template .env.production
        print_warning "Please edit .env.production with your production configuration before proceeding!"
        print_warning "Especially important:"
        print_warning "  - POSTGRES_PASSWORD"
        print_warning "  - REDIS_PASSWORD"
        print_warning "  - VITE_GOOGLE_MAPS_API_KEY"
        print_warning "  - DOMAIN_NAME"
        read -p "Press Enter after editing .env.production..."
    else
        print_error ".env.production.template not found. Cannot create production environment file."
        exit 1
    fi
fi

# Validate critical environment variables
print_status "Validating production environment..."

source .env.production

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_secure_postgres_password_here" ]; then
    print_error "POSTGRES_PASSWORD must be set to a secure password in .env.production"
    exit 1
fi

if [ -z "$REDIS_PASSWORD" ] || [ "$REDIS_PASSWORD" = "your_secure_redis_password_here" ]; then
    print_error "REDIS_PASSWORD must be set to a secure password in .env.production"
    exit 1
fi

if [ -z "$VITE_GOOGLE_MAPS_API_KEY" ] || [ "$VITE_GOOGLE_MAPS_API_KEY" = "your_google_maps_api_key_here" ]; then
    print_warning "VITE_GOOGLE_MAPS_API_KEY is not set. Maps functionality will not work."
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p logs

# Stop existing containers if running
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans || true

# Pull latest images
print_status "Pulling latest base images..."
docker-compose -f docker-compose.prod.yml --env-file .env.production pull postgres redis nginx

# Build application images
print_status "Building application images..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# Start services
print_status "Starting production services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."
BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' subway-lettuce-backend-prod 2>/dev/null || echo "unknown")
FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' subway-lettuce-frontend-prod 2>/dev/null || echo "unknown")

if [ "$BACKEND_HEALTH" = "healthy" ]; then
    print_status "✓ Backend is healthy"
else
    print_warning "⚠ Backend health status: $BACKEND_HEALTH"
fi

if [ "$FRONTEND_HEALTH" = "healthy" ]; then
    print_status "✓ Frontend is healthy"
else
    print_warning "⚠ Frontend health status: $FRONTEND_HEALTH"
fi

# Show running containers
print_status "Running containers:"
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# Show logs for any failed services
FAILED_SERVICES=$(docker-compose -f docker-compose.prod.yml --env-file .env.production ps --services --filter "status=exited")
if [ -n "$FAILED_SERVICES" ]; then
    print_warning "Some services failed to start. Showing logs:"
    for service in $FAILED_SERVICES; do
        print_warning "Logs for $service:"
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=20 "$service"
    done
fi

# Final status
print_header "Deployment Complete"

if [ -n "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" != "your-domain.com" ]; then
    print_status "Application should be available at:"
    print_status "  Frontend: https://$DOMAIN_NAME"
    print_status "  Backend API: https://$DOMAIN_NAME/api"
else
    print_status "Application should be available at:"
    print_status "  Frontend: http://localhost"
    print_status "  Backend API: http://localhost/api"
fi

print_status "To view logs: docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f"
print_status "To stop: docker-compose -f docker-compose.prod.yml --env-file .env.production down"

print_warning "Remember to:"
print_warning "  - Set up SSL certificates in nginx/ssl/ directory"
print_warning "  - Configure your domain's DNS to point to this server"
print_warning "  - Set up regular backups"
print_warning "  - Monitor logs and performance"