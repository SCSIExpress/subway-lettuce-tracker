# 🚀 Production Deployment Guide

## Overview

This guide covers deploying the Subway Lettuce Tracker application in production mode using Docker Compose with proper security, optimization, and monitoring.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Domain name configured (optional but recommended)
- SSL certificates (for HTTPS)
- Google Maps API key

## 🔧 Production Setup Options

### Option 1: Using docker-compose.prod.yml (Recommended)

This is a dedicated production configuration with optimizations:

```bash
# 1. Create production environment file
cp .env.production.template .env.production

# 2. Edit with your production settings
nano .env.production

# 3. Deploy using the script
./deploy-production.sh
```

### Option 2: Using main docker-compose.yml

The main docker-compose.yml file is also production-ready:

```bash
# 1. Create production environment file
cp .env.production.template .env.production

# 2. Edit with your production settings
nano .env.production

# 3. Deploy with nginx proxy
docker-compose --env-file .env.production --profile production up -d
```

### Option 3: Manual Docker Compose

```bash
# Start production services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Or with main compose file
docker-compose --env-file .env.production up -d
```

## 🔑 Critical Configuration

### Required Environment Variables

Edit `.env.production` and set these critical values:

```bash
# Security - CHANGE THESE!
POSTGRES_PASSWORD=your_secure_postgres_password_here
REDIS_PASSWORD=your_secure_redis_password_here

# Domain configuration
DOMAIN_NAME=your-domain.com
FRONTEND_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com/api

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Production Optimizations

The production configuration includes:

- **Resource limits** for containers
- **Stricter rate limiting**
- **Enhanced security settings**
- **Optimized caching**
- **Production logging levels**
- **Health checks with longer timeouts**
- **Automatic restart policies**

## 🌐 Domain and SSL Setup

### 1. Domain Configuration

Point your domain's DNS to your server:

```
A record: your-domain.com → your-server-ip
A record: www.your-domain.com → your-server-ip
```

### 2. SSL Certificates

#### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot

# Get certificates
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*
```

#### Option B: Custom Certificates

Place your certificates in the `nginx/ssl/` directory:

```bash
mkdir -p nginx/ssl
cp your-certificate.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem
```

## 🔒 Security Considerations

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. Database Security

- Use strong passwords
- Limit database connections
- Regular security updates

### 3. Application Security

- Environment variables are properly isolated
- Rate limiting is enabled
- CORS is configured
- Trust proxy settings for reverse proxy

## 📊 Monitoring and Maintenance

### Health Checks

Check service health:

```bash
# Check all services
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# Check specific service health
docker inspect --format='{{.State.Health.Status}}' subway-lettuce-backend-prod
```

### Logs

View application logs:

```bash
# All services
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Specific service
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f backend
```

### Updates

Update the application:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml --env-file .env.production down
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 🔄 Backup Strategy

### Database Backup

```bash
# Create backup
docker exec subway-lettuce-postgres-prod pg_dump -U postgres subway_lettuce_tracker > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i subway-lettuce-postgres-prod psql -U postgres subway_lettuce_tracker < backup_file.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v subway-lettuce-tracker_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v subway-lettuce-tracker_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data
```

## 🚨 Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml --env-file .env.production logs
   
   # Check system resources
   docker system df
   free -h
   ```

2. **SSL certificate issues**:
   ```bash
   # Verify certificates
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   
   # Test SSL
   curl -I https://your-domain.com
   ```

3. **Database connection issues**:
   ```bash
   # Test database connection
   docker exec subway-lettuce-postgres-prod psql -U postgres -d subway_lettuce_tracker -c "SELECT 1;"
   ```

### Performance Optimization

1. **Monitor resource usage**:
   ```bash
   docker stats
   ```

2. **Optimize database**:
   ```bash
   # Run VACUUM and ANALYZE
   docker exec subway-lettuce-postgres-prod psql -U postgres -d subway_lettuce_tracker -c "VACUUM ANALYZE;"
   ```

3. **Clear Redis cache if needed**:
   ```bash
   docker exec subway-lettuce-redis-prod redis-cli -a your_redis_password FLUSHALL
   ```

## 📈 Scaling

For high-traffic scenarios:

1. **Use external database** (AWS RDS, Google Cloud SQL)
2. **Use external Redis** (AWS ElastiCache, Redis Cloud)
3. **Load balancer** for multiple frontend instances
4. **CDN** for static assets

## 🔧 Environment Variables Reference

See `.env.production.template` for a complete list of available environment variables with descriptions.

## 📞 Support

If you encounter issues:

1. Check the logs first
2. Verify environment variables
3. Ensure all required services are healthy
4. Check network connectivity
5. Verify SSL certificates (if using HTTPS)

This production deployment is designed to be secure, scalable, and maintainable for real-world usage.