#!/bin/bash

# Subway Lettuce Tracker - Unraid Setup Script
# This script helps prepare your Unraid server for the Subway Lettuce Tracker application

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

print_header "Subway Lettuce Tracker - Unraid Setup"

# Check if running on Unraid
if [ ! -f /etc/unraid-version ]; then
    print_warning "This script is designed for Unraid systems."
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not available. Please enable Docker in Unraid settings."
    exit 1
fi

print_status "Setting up Subway Lettuce Tracker on Unraid..."

# Create application directories
print_status "Creating application directories..."
APP_DIR="/mnt/user/appdata/subway-lettuce-tracker"
mkdir -p "$APP_DIR"/{postgres,redis,logs,ssl,migrations,config}

# Set proper permissions
print_status "Setting directory permissions..."
chown -R 99:100 "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Create Docker network
print_status "Creating Docker network..."
if ! docker network ls | grep -q subway-network; then
    docker network create --driver bridge --subnet=172.20.0.0/16 subway-network
    print_status "Created subway-network"
else
    print_status "subway-network already exists"
fi

# Create environment file template
print_status "Creating environment configuration..."
cat > "$APP_DIR/config/.env" << 'EOF'
# Subway Lettuce Tracker - Unraid Configuration
# Edit these values according to your setup

# REQUIRED: Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=

# SECURITY: Change these passwords!
POSTGRES_PASSWORD=postgres123
REDIS_PASSWORD=redis123

# Application Configuration
VITE_APP_NAME=Subway Lettuce Tracker
NODE_ENV=production
VITE_DEFAULT_RADIUS=5000
VITE_MAX_LOCATIONS=50

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
ENABLE_CACHE=true

# Performance
CACHE_TTL=3600
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_PERFORMANCE_MONITORING=true

# System
TZ=America/New_York
PUID=99
PGID=100
EOF

# Create nginx configuration for reverse proxy
print_status "Creating nginx configuration..."
cat > "$APP_DIR/config/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server localhost:3000;
    }
    
    upstream backend {
        server localhost:5000;
    }
    
    server {
        listen 8080;
        server_name _;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health check
        location /health {
            proxy_pass http://backend/health;
        }
    }
}
EOF

# Create database initialization script
print_status "Creating database initialization..."
cat > "$APP_DIR/migrations/001_init.sql" << 'EOF'
-- Subway Lettuce Tracker Database Initialization
-- This script sets up the basic database structure

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_locations_geography ON locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_ratings_location_id ON ratings (location_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings (created_at);

-- Update location geography from lat/lng
UPDATE locations SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE location IS NULL;
EOF

# Create docker-compose file for Unraid
print_status "Creating docker-compose configuration..."
cat > "$APP_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3-alpine
    container_name: subway-lettuce-postgres
    environment:
      POSTGRES_DB: subway_lettuce_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres123}
      POSTGRES_HOST_AUTH_METHOD: md5
    volumes:
      - /mnt/user/appdata/subway-lettuce-tracker/postgres:/var/lib/postgresql/data
      - /mnt/user/appdata/subway-lettuce-tracker/migrations:/docker-entrypoint-initdb.d
    networks:
      - subway-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: subway-lettuce-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis123}
    volumes:
      - /mnt/user/appdata/subway-lettuce-tracker/redis:/data
    networks:
      - subway-network
    restart: unless-stopped

  app:
    image: ghcr.io/your-username/subway-lettuce-tracker:latest
    container_name: subway-lettuce-tracker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD:-postgres123}@postgres:5432/subway_lettuce_tracker
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis123}@redis:6379
      - VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
      - VITE_APP_NAME=${VITE_APP_NAME:-Subway Lettuce Tracker}
      - VITE_DEFAULT_RADIUS=${VITE_DEFAULT_RADIUS:-5000}
      - VITE_MAX_LOCATIONS=${VITE_MAX_LOCATIONS:-50}
      - VITE_ENABLE_OFFLINE_MODE=${VITE_ENABLE_OFFLINE_MODE:-true}
      - VITE_ENABLE_PWA=${VITE_ENABLE_PWA:-true}
      - VITE_ENABLE_ANALYTICS=${VITE_ENABLE_ANALYTICS:-false}
      - ENABLE_CACHE=${ENABLE_CACHE:-true}
      - CACHE_TTL=${CACHE_TTL:-3600}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - TZ=${TZ:-America/New_York}
      - PUID=${PUID:-99}
      - PGID=${PGID:-100}
    ports:
      - "8080:8080"
      - "5000:5000"
    volumes:
      - /mnt/user/appdata/subway-lettuce-tracker:/app/data
      - /mnt/user/appdata/subway-lettuce-tracker/logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - subway-network
    restart: unless-stopped

networks:
  subway-network:
    external: true
EOF

# Create startup script
print_status "Creating startup script..."
cat > "$APP_DIR/start.sh" << 'EOF'
#!/bin/bash
cd /mnt/user/appdata/subway-lettuce-tracker
docker-compose --env-file config/.env up -d
EOF

chmod +x "$APP_DIR/start.sh"

# Create stop script
cat > "$APP_DIR/stop.sh" << 'EOF'
#!/bin/bash
cd /mnt/user/appdata/subway-lettuce-tracker
docker-compose down
EOF

chmod +x "$APP_DIR/stop.sh"

# Display setup completion
print_header "Setup Complete!"

print_status "Directory structure created at: $APP_DIR"
print_status "Docker network 'subway-network' created"
print_status "Configuration files generated"

print_warning "IMPORTANT: Before starting the application:"
print_warning "1. Edit $APP_DIR/config/.env"
print_warning "2. Set your Google Maps API key: VITE_GOOGLE_MAPS_API_KEY"
print_warning "3. Change default passwords: POSTGRES_PASSWORD and REDIS_PASSWORD"

echo ""
print_status "Next steps:"
echo "1. Install the Subway Lettuce Tracker template in Unraid Docker"
echo "2. Or use the docker-compose file: $APP_DIR/docker-compose.yml"
echo "3. Or use the startup script: $APP_DIR/start.sh"

echo ""
print_status "Template files available:"
echo "- All-in-One: unraid-templates/subway-lettuce-tracker-all-in-one.xml"
echo "- Individual components: unraid-templates/subway-lettuce-*.xml"

echo ""
print_status "For detailed instructions, see: UNRAID_DEPLOYMENT.md"

print_header "Setup completed successfully!"