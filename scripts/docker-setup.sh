#!/bin/bash

# Subway Lettuce Tracker - Docker Setup Script
# This script helps you set up and manage the Docker containers for the application

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

# Function to check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_status "Docker and Docker Compose are available"
}

# Function to create .env file if it doesn't exist
setup_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before proceeding"
        print_warning "Especially set your GOOGLE_MAPS_API_KEY"
        read -p "Press Enter to continue after editing .env file..."
    else
        print_status ".env file found"
    fi
}

# Function to build images
build_images() {
    print_header "Building Docker Images"
    
    if [ "$1" = "dev" ]; then
        print_status "Building development images..."
        docker-compose -f docker-compose.dev.yml build --no-cache
    else
        print_status "Building production images..."
        docker-compose build --no-cache
    fi
    
    print_status "Images built successfully"
}

# Function to start services
start_services() {
    print_header "Starting Services"
    
    if [ "$1" = "dev" ]; then
        print_status "Starting development environment..."
        docker-compose -f docker-compose.dev.yml up -d
        
        print_status "Waiting for services to be healthy..."
        sleep 30
        
        print_status "Development environment started!"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:5000"
        print_status "Database: localhost:5432"
        print_status "Redis: localhost:6379"
        
    elif [ "$1" = "prod" ]; then
        print_status "Starting production environment..."
        docker-compose --profile production up -d
        
        print_status "Waiting for services to be healthy..."
        sleep 30
        
        print_status "Production environment started!"
        print_status "Application: http://localhost (via Nginx)"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:5000"
        
    else
        print_status "Starting basic environment..."
        docker-compose up -d postgres redis backend frontend
        
        print_status "Waiting for services to be healthy..."
        sleep 30
        
        print_status "Basic environment started!"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:5000"
    fi
}

# Function to stop services
stop_services() {
    print_header "Stopping Services"
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml down
    else
        docker-compose down
    fi
    
    print_status "Services stopped"
}

# Function to show logs
show_logs() {
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Function to run database migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml exec backend npm run migrate
    else
        docker-compose exec backend npm run migrate
    fi
    
    print_status "Migrations completed"
}

# Function to seed database
seed_database() {
    print_header "Seeding Database"
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml exec backend npm run seed
    else
        docker-compose exec backend npm run seed
    fi
    
    print_status "Database seeded"
}

# Function to run tests
run_tests() {
    print_header "Running Tests"
    
    print_status "Running backend tests..."
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml exec backend npm test
    else
        docker-compose exec backend npm test
    fi
    
    print_status "Running frontend tests..."
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml exec frontend npm test
    else
        docker-compose exec frontend npm test
    fi
    
    print_status "Tests completed"
}

# Function to clean up
cleanup() {
    print_header "Cleaning Up"
    
    print_status "Stopping all containers..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    print_status "Removing unused images..."
    docker image prune -f
    
    print_status "Removing unused volumes..."
    docker volume prune -f
    
    print_status "Cleanup completed"
}

# Function to show status
show_status() {
    print_header "Service Status"
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml ps
    else
        docker-compose ps
    fi
}

# Function to show help
show_help() {
    echo "Subway Lettuce Tracker - Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  setup [dev|prod]     - Set up and start the application"
    echo "  build [dev|prod]     - Build Docker images"
    echo "  start [dev|prod]     - Start services"
    echo "  stop [dev|prod]      - Stop services"
    echo "  restart [dev|prod]   - Restart services"
    echo "  logs [dev|prod]      - Show service logs"
    echo "  status [dev|prod]    - Show service status"
    echo "  migrate [dev|prod]   - Run database migrations"
    echo "  seed [dev|prod]      - Seed database with sample data"
    echo "  test [dev|prod]      - Run tests"
    echo "  cleanup              - Clean up containers and images"
    echo "  help                 - Show this help message"
    echo ""
    echo "Environments:"
    echo "  dev                  - Development environment with hot reload"
    echo "  prod                 - Production environment with Nginx"
    echo "  (none)               - Basic environment"
    echo ""
    echo "Examples:"
    echo "  $0 setup dev         - Set up development environment"
    echo "  $0 start prod        - Start production environment"
    echo "  $0 logs              - Show logs for basic environment"
}

# Main script logic
case "$1" in
    setup)
        check_docker
        setup_env
        build_images "$2"
        start_services "$2"
        if [ "$2" != "prod" ]; then
            run_migrations "$2"
            seed_database "$2"
        fi
        ;;
    build)
        check_docker
        build_images "$2"
        ;;
    start)
        check_docker
        start_services "$2"
        ;;
    stop)
        stop_services "$2"
        ;;
    restart)
        stop_services "$2"
        start_services "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status "$2"
        ;;
    migrate)
        run_migrations "$2"
        ;;
    seed)
        seed_database "$2"
        ;;
    test)
        run_tests "$2"
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac