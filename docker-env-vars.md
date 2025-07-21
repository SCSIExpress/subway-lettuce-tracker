# 🔧 Docker Runtime Environment Variables

This document lists all environment variables that can be passed to the Docker containers at runtime.

## 🚀 Quick Start Commands

### Development with Custom Environment Variables
```bash
# Start with custom Google Maps API key
sudo docker run -d \
  --name subway-lettuce-frontend \
  -p 3000:3000 \
  -e VITE_GOOGLE_MAPS_API_KEY="your_actual_api_key_here" \
  -e VITE_API_URL="http://localhost:5000/api" \
  leafapp-frontend

# Start backend with custom database
sudo docker run -d \
  --name subway-lettuce-backend \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  -e REDIS_URL="redis://:password@host:6379" \
  leafapp-backend
```

### Production with Environment File
```bash
# Create production environment file
cat > .env.production << EOF
NODE_ENV=production
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_redis_password
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_API_URL=https://your-domain.com/api
FRONTEND_URL=https://your-domain.com
DOMAIN_NAME=your-domain.com
EOF

# Start with environment file
sudo docker-compose --env-file .env.production up -d
```

## 📋 Environment Variables Reference

### 🎨 Frontend Variables (React/Vite)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | `""` | No* |
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` | Yes |
| `NODE_ENV` | Application environment | `production` | No |

*Required for Google Maps functionality

### 🔧 Backend Variables (Node.js)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `production` | No |
| `PORT` | Server port | `5000` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_URL` | Redis connection string | - | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |

### 🗄️ Database Variables (PostgreSQL)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_DB` | Database name | `subway_lettuce_tracker` | No |
| `POSTGRES_USER` | Database user | `postgres` | No |
| `POSTGRES_PASSWORD` | Database password | - | Yes |

### 🔄 Cache Variables (Redis)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_PASSWORD` | Redis password | - | No |

### 🌐 Production Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOMAIN_NAME` | Your domain name | `localhost` | No |
| `SSL_CERT_PATH` | SSL certificate path | `/etc/nginx/ssl/cert.pem` | No |
| `SSL_KEY_PATH` | SSL private key path | `/etc/nginx/ssl/private.key` | No |

## 🚀 Usage Examples

### Example 1: Development with Google Maps
```bash
sudo docker run -d \
  --name subway-lettuce-frontend-dev \
  -p 3000:3000 \
  -e VITE_GOOGLE_MAPS_API_KEY="AIzaSyBvOkBwgGlbUiuS-oKrPGmHEHtHMra2oM0" \
  -e VITE_API_URL="http://localhost:5000/api" \
  leafapp-frontend
```

### Example 2: Production Backend
```bash
sudo docker run -d \
  --name subway-lettuce-backend-prod \
  -p 5000:5000 \
  -e NODE_ENV="production" \
  -e DATABASE_URL="postgresql://postgres:securepass@db.example.com:5432/subway_lettuce_tracker" \
  -e REDIS_URL="redis://:redispass@cache.example.com:6379" \
  -e FRONTEND_URL="https://leafapp.example.com" \
  -e RATE_LIMIT_MAX_REQUESTS="200" \
  leafapp-backend
```

### Example 3: Complete Stack with Docker Compose
```bash
# Using environment variables with docker-compose
POSTGRES_PASSWORD=mypassword \
REDIS_PASSWORD=myredispass \
VITE_GOOGLE_MAPS_API_KEY=myapikey \
DOMAIN_NAME=myapp.com \
sudo docker-compose up -d
```

## 🔐 Security Best Practices

### 1. Use Environment Files for Secrets
```bash
# Create secure environment file
cat > .env.secrets << EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key
EOF

# Set proper permissions
chmod 600 .env.secrets

# Use with docker-compose
sudo docker-compose --env-file .env.secrets up -d
```

### 2. Use Docker Secrets (Docker Swarm)
```bash
# Create secrets
echo "your_db_password" | sudo docker secret create postgres_password -
echo "your_redis_password" | sudo docker secret create redis_password -

# Reference in docker-compose.yml
# secrets:
#   postgres_password:
#     external: true
```

### 3. Use Kubernetes ConfigMaps/Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: subway-lettuce-secrets
type: Opaque
data:
  postgres-password: <base64-encoded-password>
  redis-password: <base64-encoded-password>
  google-maps-api-key: <base64-encoded-api-key>
```

## 🔄 Runtime Configuration Changes

### Update Environment Variables Without Rebuilding
```bash
# Stop container
sudo docker stop subway-lettuce-frontend-dev

# Start with new environment variables
sudo docker run -d \
  --name subway-lettuce-frontend-dev \
  -p 3000:3000 \
  -e VITE_GOOGLE_MAPS_API_KEY="new_api_key_here" \
  -e VITE_API_URL="http://new-backend:5000/api" \
  leafapp-frontend
```

### Update Docker Compose Environment
```bash
# Update .env file
echo "VITE_GOOGLE_MAPS_API_KEY=new_api_key" >> .env

# Restart services
sudo docker-compose restart frontend
```

## 🎯 Common Use Cases

### Local Development
```bash
export VITE_GOOGLE_MAPS_API_KEY="your_dev_api_key"
export VITE_API_URL="http://localhost:5000/api"
./docker-setup.sh start dev
```

### Staging Environment
```bash
export NODE_ENV="staging"
export POSTGRES_PASSWORD="staging_password"
export VITE_GOOGLE_MAPS_API_KEY="staging_api_key"
export DOMAIN_NAME="staging.yourapp.com"
./docker-setup.sh start prod
```

### Production Deployment
```bash
export NODE_ENV="production"
export POSTGRES_PASSWORD="$(cat /run/secrets/postgres_password)"
export REDIS_PASSWORD="$(cat /run/secrets/redis_password)"
export VITE_GOOGLE_MAPS_API_KEY="$(cat /run/secrets/google_maps_api_key)"
export DOMAIN_NAME="yourapp.com"
./docker-setup.sh start prod
```

This approach allows you to configure the application at runtime without rebuilding Docker images, making it perfect for different environments and CI/CD pipelines!