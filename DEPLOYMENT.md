# Subway Lettuce Tracker - Docker Deployment Guide

This guide provides comprehensive instructions for deploying the Subway Lettuce Tracker application using Docker containers.

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 10GB+ disk space

### 1. Clone and Setup

```bash
git clone <repository-url>
cd subway-lettuce-tracker
chmod +x docker-setup.sh
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (REQUIRED)
nano .env
```

**Important**: Set your `GOOGLE_MAPS_API_KEY` in the `.env` file!

### 3. Start Development Environment

```bash
./docker-setup.sh setup dev
```

### 4. Start Production Environment

```bash
./docker-setup.sh setup prod
```

## 📋 Available Commands

The `docker-setup.sh` script provides easy management:

```bash
# Setup and start
./docker-setup.sh setup [dev|prod]     # Complete setup
./docker-setup.sh build [dev|prod]     # Build images only
./docker-setup.sh start [dev|prod]     # Start services

# Management
./docker-setup.sh stop [dev|prod]      # Stop services
./docker-setup.sh restart [dev|prod]   # Restart services
./docker-setup.sh logs [dev|prod]      # View logs
./docker-setup.sh status [dev|prod]    # Check status

# Database
./docker-setup.sh migrate [dev|prod]   # Run migrations
./docker-setup.sh seed [dev|prod]      # Seed sample data

# Testing
./docker-setup.sh test [dev|prod]      # Run tests

# Cleanup
./docker-setup.sh cleanup              # Clean up containers
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │    Frontend     │    │    Backend      │
│  Load Balancer  │────│   React App     │────│   Node.js API   │
│   (Port 80/443) │    │   (Port 8080)   │    │   (Port 5000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │   PostgreSQL    │
                       │     Cache       │    │    Database     │
                       │   (Port 6379)   │    │   (Port 5432)   │
                       └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `production` | No |
| `POSTGRES_PASSWORD` | Database password | - | Yes |
| `REDIS_PASSWORD` | Redis password | - | Yes |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | - | Yes |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` | No |
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` | No |

### Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
4. Create credentials (API Key)
5. Add the API key to your `.env` file

## 🌍 Deployment Environments

### Development Environment

- **Purpose**: Local development with hot reload
- **Command**: `./docker-setup.sh setup dev`
- **Features**:
  - Hot reload for code changes
  - Development dependencies included
  - Debug logging enabled
  - Source maps available

**Services**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432
- Redis: localhost:6379

### Production Environment

- **Purpose**: Production deployment with optimizations
- **Command**: `./docker-setup.sh setup prod`
- **Features**:
  - Optimized builds
  - Nginx load balancer
  - SSL/TLS support
  - Health checks
  - Resource limits

**Services**:
- Application: http://localhost (via Nginx)
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔒 Security Features

### Network Security
- Isolated Docker network
- Internal service communication
- Nginx reverse proxy
- Rate limiting configured

### Application Security
- Non-root containers
- Security headers (HSTS, CSP, etc.)
- Input validation
- CORS protection

### Data Security
- Encrypted Redis passwords
- PostgreSQL authentication
- Environment variable isolation

## 📊 Monitoring (Optional)

Enable monitoring with Prometheus and Grafana:

```bash
# Start with monitoring
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Access monitoring
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :5000

# Stop conflicting services
sudo systemctl stop <service-name>
```

#### 2. Database Connection Failed
```bash
# Check database logs
./docker-setup.sh logs dev | grep postgres

# Restart database
docker-compose restart postgres
```

#### 3. Google Maps Not Loading
- Verify API key is set in `.env`
- Check browser console for API errors
- Ensure required APIs are enabled in Google Cloud

#### 4. Out of Memory
```bash
# Check container resource usage
docker stats

# Increase Docker memory limit in Docker Desktop
```

### Health Checks

```bash
# Check all service health
./docker-setup.sh status

# Individual service health
curl http://localhost:5000/health
curl http://localhost:3000/health
```

### Logs and Debugging

```bash
# View all logs
./docker-setup.sh logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend
```

## 🚀 Production Deployment

### Server Requirements

**Minimum**:
- 2 CPU cores
- 4GB RAM
- 20GB disk space
- Ubuntu 20.04+ or similar

**Recommended**:
- 4 CPU cores
- 8GB RAM
- 50GB SSD
- Load balancer (if scaling)

### SSL/TLS Setup

1. **Obtain SSL certificates**:
```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

2. **Copy certificates**:
```bash
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/private.key
```

3. **Update configuration**:
```bash
# Edit nginx/nginx.conf
# Update server_name to your domain
```

### Domain Setup

1. Point your domain to server IP
2. Update `DOMAIN_NAME` in `.env`
3. Update `FRONTEND_URL` and `VITE_API_URL` accordingly

### Backup Strategy

```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres subway_lettuce_tracker > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres subway_lettuce_tracker < backup.sql

# Volume backup
docker run --rm -v subway-lettuce-tracker_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale with load balancer
# Update nginx.conf upstream configuration
```

### Database Scaling

- Consider PostgreSQL read replicas
- Implement connection pooling
- Use Redis for session storage

## 🔄 Updates and Maintenance

### Application Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
./docker-setup.sh build prod
./docker-setup.sh restart prod
```

### Database Migrations

```bash
# Run new migrations
./docker-setup.sh migrate prod

# Rollback if needed (manual process)
docker-compose exec backend npm run migrate:rollback
```

### Security Updates

```bash
# Update base images
docker-compose pull
./docker-setup.sh build prod

# Update dependencies
# (Rebuild images after updating package.json files)
```

## 📞 Support

### Getting Help

1. Check logs: `./docker-setup.sh logs`
2. Verify configuration: `./docker-setup.sh status`
3. Review this documentation
4. Check GitHub issues

### Performance Monitoring

- Monitor container resources: `docker stats`
- Check application metrics: http://localhost:9090 (if monitoring enabled)
- Review Nginx logs: `docker-compose logs nginx`

---

## 🎯 Quick Reference

### Essential Commands
```bash
# Start development
./docker-setup.sh setup dev

# Start production
./docker-setup.sh setup prod

# View logs
./docker-setup.sh logs

# Stop everything
./docker-setup.sh stop

# Clean up
./docker-setup.sh cleanup
```

### Important URLs
- **Development Frontend**: http://localhost:3000
- **Production Frontend**: http://localhost (via Nginx)
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **Monitoring**: http://localhost:9090 (Prometheus), http://localhost:3001 (Grafana)

This deployment setup provides a robust, scalable, and secure foundation for running the Subway Lettuce Tracker application in any environment.