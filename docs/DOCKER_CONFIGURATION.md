# 🐳 Docker Configuration Guide

## Overview

The Subway Lettuce Tracker uses an All-in-One (AIO) Docker container that includes the frontend, backend, and Nginx reverse proxy in a single container. This guide covers advanced Docker configuration options.

## 🏗️ Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AIO Container                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Nginx    │  │  Frontend   │  │      Backend        │  │
│  │   (Port 80) │◄─┤React (8080) │◄─┤   Node.js (5000)   │  │
│  │Load Balancer│  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │   External      │
                    │   PostgreSQL    │
                    │   & Redis       │
                    └─────────────────┘
```

## 🚀 Deployment Options

### Option 1: AIO with Docker Compose (Recommended)

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3-alpine
    environment:
      POSTGRES_DB: subway_lettuce_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  subway-lettuce-aio:
    image: ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/subway_lettuce_tracker
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      VITE_GOOGLE_MAPS_API_KEY: ${VITE_GOOGLE_MAPS_API_KEY}
      VITE_API_URL: http://localhost:8080/api
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "sh", "/app/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Option 2: AIO with External Services

```bash
docker run -d --name subway-lettuce-tracker \
  -p 8080:8080 \
  -e DATABASE_URL=postgresql://user:pass@external-db:5432/subway_lettuce_tracker \
  -e REDIS_URL=redis://external-redis:6379 \
  -e VITE_GOOGLE_MAPS_API_KEY=your_api_key \
  -e VITE_API_URL=http://your-domain.com:8080/api \
  --restart unless-stopped \
  ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest
```

### Option 3: Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: subway-lettuce-tracker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: subway-lettuce-tracker
  template:
    metadata:
      labels:
        app: subway-lettuce-tracker
    spec:
      containers:
      - name: aio
        image: ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: subway-lettuce-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: subway-lettuce-secrets
              key: redis-url
        - name: VITE_GOOGLE_MAPS_API_KEY
          valueFrom:
            secretKeyRef:
              name: subway-lettuce-secrets
              key: google-maps-api-key
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: subway-lettuce-service
spec:
  selector:
    app: subway-lettuce-tracker
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

## 🔧 Environment Variables

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | - | Google Maps API key |

### Application Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `production` | Application environment |
| `PORT` | No | `5000` | Backend server port |
| `VITE_API_URL` | No | `http://localhost:8080/api` | Frontend API endpoint |
| `ENABLE_FRONTEND` | No | `true` | Enable/disable frontend |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_OFFLINE_MODE` | `true` | Enable offline functionality |
| `VITE_ENABLE_PWA` | `true` | Enable Progressive Web App features |
| `VITE_ENABLE_ANALYTICS` | `false` | Enable analytics tracking |

### Performance Tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limiting window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `CACHE_TTL` | `3600` | Cache time-to-live (seconds) |
| `ENABLE_CACHE` | `true` | Enable Redis caching |

### Logging and Monitoring

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `ENABLE_PERFORMANCE_MONITORING` | `true` | Enable performance metrics |

## 🔒 Security Configuration

### Runtime Security

The AIO container implements several security measures:

- **Non-root execution**: Container runs as non-privileged user
- **API key injection**: Keys are injected at runtime, not baked into images
- **Input validation**: All API inputs are validated and sanitized
- **Rate limiting**: Built-in rate limiting for API endpoints
- **CORS protection**: Configurable CORS policies

### Network Security

```yaml
# Docker Compose with custom network
networks:
  subway-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  subway-lettuce-aio:
    networks:
      - subway-network
    # ... other configuration
```

### Secrets Management

For production deployments, use proper secrets management:

```bash
# Using Docker secrets
echo "your_api_key" | docker secret create google_maps_api_key -
echo "postgresql://..." | docker secret create database_url -

docker service create \
  --name subway-lettuce-tracker \
  --secret google_maps_api_key \
  --secret database_url \
  --env VITE_GOOGLE_MAPS_API_KEY_FILE=/run/secrets/google_maps_api_key \
  --env DATABASE_URL_FILE=/run/secrets/database_url \
  ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest
```

## 📊 Health Checks and Monitoring

### Built-in Health Checks

The container includes comprehensive health checks:

```bash
# Manual health check
curl http://localhost:8080/api/health

# Response format
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "frontend": "serving"
  }
}
```

### Docker Health Check Configuration

```yaml
healthcheck:
  test: ["CMD", "sh", "/app/healthcheck.sh"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### Monitoring with Prometheus

The container exposes metrics for Prometheus monitoring:

```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🚀 Performance Optimization

### Resource Limits

```yaml
services:
  subway-lettuce-aio:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

### Caching Configuration

```bash
# Environment variables for caching
ENABLE_CACHE=true
CACHE_TTL=3600
REDIS_URL=redis://redis:6379
```

### Database Connection Pooling

The backend automatically configures connection pooling:

```javascript
// Automatic configuration based on environment
const pool = {
  max: process.env.DB_POOL_MAX || 20,
  min: process.env.DB_POOL_MIN || 5,
  idle: process.env.DB_POOL_IDLE || 10000
}
```

## 🔄 Scaling and Load Balancing

### Horizontal Scaling

```yaml
# Docker Compose scaling
services:
  subway-lettuce-aio:
    # ... configuration
    deploy:
      replicas: 3

  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - subway-lettuce-aio
```

### Load Balancer Configuration

```nginx
# nginx-lb.conf
upstream backend {
    server subway-lettuce-aio_1:8080;
    server subway-lettuce-aio_2:8080;
    server subway-lettuce-aio_3:8080;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🛠️ Development Configuration

### Development Override

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  subway-lettuce-aio:
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
      VITE_API_URL: http://localhost:8080/api
    volumes:
      - ./logs:/app/logs
    ports:
      - "8080:8080"
      - "5000:5000"  # Direct backend access for debugging
```

### Local Development

```bash
# Start with development overrides
docker-compose -f docker-compose.aio.yml -f docker-compose.override.yml up -d

# View logs
docker-compose logs -f subway-lettuce-aio

# Access development tools
docker exec -it subway-lettuce-aio sh
```

## 📋 Maintenance

### Container Updates

```bash
# Pull latest image
docker pull ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest

# Recreate container with new image
docker-compose up -d --force-recreate subway-lettuce-aio
```

### Database Maintenance

```bash
# Database backup
docker exec postgres pg_dump -U postgres subway_lettuce_tracker > backup.sql

# Database restore
docker exec -i postgres psql -U postgres subway_lettuce_tracker < backup.sql
```

### Log Rotation

```yaml
services:
  subway-lettuce-aio:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

This configuration provides a robust, scalable, and secure deployment of the Subway Lettuce Tracker using Docker containers.