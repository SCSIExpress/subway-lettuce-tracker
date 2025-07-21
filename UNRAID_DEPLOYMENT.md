# 🐳 Unraid Deployment Guide

## Overview

This guide covers deploying the Subway Lettuce Tracker application on Unraid using Docker containers. The application consists of multiple services that work together to provide a complete location-based rating system.

## 📋 Prerequisites

- Unraid 6.8+ with Docker enabled
- Community Applications plugin installed
- At least 2GB RAM available
- Google Maps API key

## 🏗️ Architecture

The Subway Lettuce Tracker consists of these components:

1. **PostgreSQL Database** - Stores location and rating data
2. **Redis Cache** - Provides high-performance caching
3. **Backend API** - Node.js/Express API server
4. **Frontend** - React web application
5. **Nginx** (Optional) - Reverse proxy for production

## 🚀 Installation Methods

### Method 1: Using XML Templates (Recommended)

1. **Download Templates**:
   - Copy the XML templates from the `unraid-templates/` directory
   - Place them in your Unraid templates folder or use direct URLs

2. **Install Components in Order**:
   - Install PostgreSQL first
   - Install Redis second
   - Install the main application stack

### Method 2: Manual Docker Container Setup

Follow the manual setup instructions below for each component.

## 📦 Component Installation

### 1. PostgreSQL Database

**Container Settings**:
- **Name**: `Subway-Lettuce-Postgres`
- **Repository**: `postgis/postgis:15-3.3-alpine`
- **Network Type**: `Custom: subway-network`

**Port Mappings**:
- Container Port: `5432` → Host Port: `5432`

**Volume Mappings**:
- Container Path: `/var/lib/postgresql/data` → Host Path: `/mnt/user/appdata/subway-lettuce-tracker/postgres`
- Container Path: `/docker-entrypoint-initdb.d` → Host Path: `/mnt/user/appdata/subway-lettuce-tracker/migrations` (Optional)

**Environment Variables**:
```
POSTGRES_DB=subway_lettuce_tracker
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_HOST_AUTH_METHOD=md5
TZ=America/New_York
```

### 2. Redis Cache

**Container Settings**:
- **Name**: `Subway-Lettuce-Redis`
- **Repository**: `redis:7-alpine`
- **Network Type**: `Custom: subway-network`

**Port Mappings**:
- Container Port: `6379` → Host Port: `6379`

**Volume Mappings**:
- Container Path: `/data` → Host Path: `/mnt/user/appdata/subway-lettuce-tracker/redis`

**Environment Variables**:
```
REDIS_PASSWORD=your_secure_redis_password_here
TZ=America/New_York
```

**Post Arguments**:
```
redis-server --appendonly yes --requirepass your_secure_redis_password_here --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 3. Main Application Stack

**Container Settings**:
- **Name**: `Subway-Lettuce-Tracker-Stack`
- **Repository**: `ghcr.io/your-username/subway-lettuce-tracker:latest`
- **Network Type**: `Custom: subway-network`

**Port Mappings**:
- Container Port: `8080` → Host Port: `3000` (Frontend)
- Container Port: `5000` → Host Port: `5000` (Backend API)

**Volume Mappings**:
- Container Path: `/app/data` → Host Path: `/mnt/user/appdata/subway-lettuce-tracker`
- Container Path: `/app/logs` → Host Path: `/mnt/user/appdata/subway-lettuce-tracker/logs`

**Environment Variables**:
```
# Required
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
DATABASE_URL=postgresql://postgres:your_secure_password_here@subway-lettuce-postgres:5432/subway_lettuce_tracker
REDIS_URL=redis://:your_secure_redis_password_here@subway-lettuce-redis:6379

# Application Configuration
NODE_ENV=production
VITE_APP_NAME=Subway Lettuce Tracker
VITE_API_URL=http://YOUR_UNRAID_IP:5000/api
FRONTEND_URL=http://YOUR_UNRAID_IP:3000
VITE_DEFAULT_RADIUS=5000
VITE_MAX_LOCATIONS=50

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
ENABLE_CACHE=true
CACHE_TTL=3600

# Performance
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_PERFORMANCE_MONITORING=true

# System
TZ=America/New_York
PUID=99
PGID=100
```

## 🌐 Network Configuration

### Create Custom Network

1. Go to **Docker** → **Networks**
2. Click **Add Network**
3. **Name**: `subway-network`
4. **Driver**: `bridge`
5. **Subnet**: `172.20.0.0/16` (optional)

### Container Network Settings

All containers should use the `subway-network` custom network to communicate with each other.

## 🔧 Configuration Steps

### 1. Prepare Directories

Create the necessary directories on your Unraid server:

```bash
mkdir -p /mnt/user/appdata/subway-lettuce-tracker/{postgres,redis,logs,migrations}
chown -R 99:100 /mnt/user/appdata/subway-lettuce-tracker
```

### 2. Set Up Database Migrations (Optional)

If you have database migration files:

```bash
# Copy migration files to the migrations directory
cp backend/src/database/migrations/* /mnt/user/appdata/subway-lettuce-tracker/migrations/
```

### 3. Configure Environment Variables

**Critical Variables to Change**:
- `POSTGRES_PASSWORD` - Use a strong password
- `REDIS_PASSWORD` - Use a strong password
- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps API key
- `VITE_API_URL` - Replace with your Unraid server IP
- `FRONTEND_URL` - Replace with your Unraid server IP

### 4. Start Containers in Order

1. Start PostgreSQL container first
2. Wait for it to be healthy (check logs)
3. Start Redis container
4. Wait for it to be healthy
5. Start the main application stack

## 🔍 Verification

### Check Container Status

1. Go to **Docker** tab in Unraid
2. Verify all containers are running
3. Check logs for any errors

### Test Application

1. **Frontend**: Navigate to `http://YOUR_UNRAID_IP:3000`
2. **Backend API**: Test `http://YOUR_UNRAID_IP:5000/health`
3. **Database**: Check PostgreSQL logs for successful connections

### Health Checks

The containers include built-in health checks:
- PostgreSQL: `pg_isready` command
- Redis: `redis-cli ping` command
- Application: HTTP health endpoints

## 🔒 Security Considerations

### 1. Change Default Passwords

Always change these default passwords:
- PostgreSQL: `POSTGRES_PASSWORD`
- Redis: `REDIS_PASSWORD`

### 2. Network Security

- Use custom Docker network for container isolation
- Consider using Unraid's VPN if accessing remotely
- Set up proper firewall rules

### 3. Data Protection

- Regular backups of `/mnt/user/appdata/subway-lettuce-tracker/`
- Monitor disk usage and set up alerts
- Use strong authentication for database access

## 📊 Monitoring and Maintenance

### Log Locations

- **Application Logs**: `/mnt/user/appdata/subway-lettuce-tracker/logs/`
- **Container Logs**: Available through Unraid Docker interface
- **System Logs**: Unraid system logs

### Performance Monitoring

Monitor these metrics:
- Container CPU and memory usage
- Database connection count
- Redis memory usage
- Application response times

### Backup Strategy

```bash
# Database backup
docker exec Subway-Lettuce-Postgres pg_dump -U postgres subway_lettuce_tracker > backup_$(date +%Y%m%d).sql

# Application data backup
tar -czf subway-lettuce-backup_$(date +%Y%m%d).tar.gz /mnt/user/appdata/subway-lettuce-tracker/
```

## 🚨 Troubleshooting

### Common Issues

1. **Containers won't start**:
   - Check Docker logs
   - Verify network configuration
   - Ensure directories exist with correct permissions

2. **Database connection errors**:
   - Verify PostgreSQL container is running
   - Check database credentials
   - Ensure network connectivity between containers

3. **Frontend can't reach backend**:
   - Verify `VITE_API_URL` points to correct IP and port
   - Check backend container logs
   - Test API endpoint directly

4. **Maps not loading**:
   - Verify `VITE_GOOGLE_MAPS_API_KEY` is set correctly
   - Check Google Cloud Console for API key restrictions
   - Ensure Maps JavaScript API is enabled

### Log Analysis

```bash
# View container logs
docker logs Subway-Lettuce-Tracker-Stack

# Follow logs in real-time
docker logs -f Subway-Lettuce-Postgres

# Check specific service logs
docker exec Subway-Lettuce-Tracker-Stack cat /app/logs/application.log
```

## 🔄 Updates

### Updating the Application

1. Stop the main application container
2. Pull the latest image
3. Start the container with the same configuration
4. Verify functionality

### Database Updates

- Database migrations should run automatically on container start
- Always backup before major updates
- Test updates in a development environment first

## 📞 Support

For issues specific to:
- **Unraid**: Check Unraid forums and documentation
- **Application**: Check the GitHub repository issues
- **Docker**: Refer to Docker documentation

This deployment guide provides a complete setup for running the Subway Lettuce Tracker on Unraid with proper security, monitoring, and maintenance considerations.