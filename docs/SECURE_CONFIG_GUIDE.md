# Secure Configuration Guide for Subway Lettuce Tracker AIO

This guide shows you how to run the AIO container securely without hardcoding API keys.

## 🔒 Security Benefits

✅ **No API keys in Docker images**  
✅ **Runtime environment variable injection**  
✅ **Different keys for different environments**  
✅ **Compatible with orchestration tools (Kubernetes, Docker Swarm)**  
✅ **Easy key rotation without rebuilding images**

## 🚀 Quick Start

### 1. Build the Secure Container

```bash
./build-aio-with-api-key.sh
```

This builds a container that accepts API keys at runtime, not build time.

### 2. Configure Your Environment

Create or update your `.env` file:

```bash
# Required - Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here

# Required - Database Configuration
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/subway_lettuce_tracker
POSTGRES_PASSWORD=your_secure_postgres_password

# Required - Redis Configuration  
REDIS_URL=redis://:your_password@redis:6379
REDIS_PASSWORD=your_secure_redis_password

# Optional - API Configuration
VITE_API_URL=http://localhost:8080/api
NODE_ENV=production

# Optional - App Configuration
VITE_APP_NAME=Subway Lettuce Tracker
VITE_DEFAULT_RADIUS=5000
VITE_MAX_LOCATIONS=50
```

### 3. Test Locally

```bash
./test-aio-local.sh
```

This tests the container with your `.env` configuration.

## 📋 Deployment Options

### Option 1: Docker Run with Environment File

```bash
docker run -d --name subway-lettuce-aio \
  -p 8080:8080 \
  --env-file .env \
  subway-lettuce-aio:latest
```

### Option 2: Docker Run with Individual Variables

```bash
docker run -d --name subway-lettuce-aio \
  -p 8080:8080 \
  -e VITE_GOOGLE_MAPS_API_KEY=your_api_key \
  -e DATABASE_URL=your_database_url \
  -e REDIS_URL=your_redis_url \
  subway-lettuce-aio:latest
```

### Option 3: Docker Compose (Recommended)

```bash
docker-compose -f docker-compose.aio.yml up -d
```

This uses the secure AIO compose file with runtime environment injection.

### Option 4: Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: subway-lettuce-aio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: subway-lettuce-aio
  template:
    metadata:
      labels:
        app: subway-lettuce-aio
    spec:
      containers:
      - name: subway-lettuce-aio
        image: subway-lettuce-aio:latest
        ports:
        - containerPort: 8080
        env:
        - name: VITE_GOOGLE_MAPS_API_KEY
          valueFrom:
            secretKeyRef:
              name: google-maps-secret
              key: api-key
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_GOOGLE_MAPS_API_KEY` | ✅ | Google Maps API key | None |
| `DATABASE_URL` | ✅ | PostgreSQL connection string | None |
| `REDIS_URL` | ✅ | Redis connection string | None |
| `VITE_API_URL` | ❌ | Backend API URL | `http://localhost:8080/api` |
| `NODE_ENV` | ❌ | Node environment | `production` |
| `PORT` | ❌ | Backend port | `5000` |
| `ENABLE_FRONTEND` | ❌ | Enable frontend serving | `true` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENABLE_OFFLINE_MODE` | Enable offline functionality | `true` |
| `VITE_ENABLE_PWA` | Enable Progressive Web App | `true` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` |

## 🛠️ How It Works

1. **Build Time**: Container is built with placeholder values
2. **Runtime**: Startup script replaces placeholders with actual environment variables
3. **Security**: API keys never stored in the Docker image

### Runtime Injection Process

```bash
# Container startup process:
1. Load environment variables
2. Find all built frontend files (*.js, *.html)
3. Replace __GOOGLE_MAPS_API_KEY_PLACEHOLDER__ with actual key
4. Replace __API_URL_PLACEHOLDER__ with actual API URL
5. Start services (nginx + backend)
```

## 🔍 Troubleshooting

### Check if API Key is Injected

```bash
# Check container logs
docker logs subway-lettuce-aio | grep -i "injecting"

# Check if key is in frontend files
docker exec subway-lettuce-aio grep -r "AIzaSy" /app/frontend/
```

### Verify Environment Variables

```bash
# Check environment in running container
docker exec subway-lettuce-aio env | grep GOOGLE
```

### Test API Key Separately

```bash
# Test your API key directly
node quick-google-api-test.js YOUR_API_KEY
```

## 🔄 Key Rotation

To rotate API keys without downtime:

1. Update your `.env` file or environment variables
2. Restart the container:
   ```bash
   docker restart subway-lettuce-aio
   ```

The new key will be injected at startup.

## 🌍 Multiple Environments

### Development
```bash
# .env.development
VITE_GOOGLE_MAPS_API_KEY=dev_api_key
VITE_API_URL=http://localhost:8080/api
NODE_ENV=development
```

### Staging
```bash
# .env.staging  
VITE_GOOGLE_MAPS_API_KEY=staging_api_key
VITE_API_URL=https://staging-api.yourdomain.com/api
NODE_ENV=staging
```

### Production
```bash
# .env.production
VITE_GOOGLE_MAPS_API_KEY=prod_api_key
VITE_API_URL=https://api.yourdomain.com/api
NODE_ENV=production
```

## 📊 Monitoring

The container includes health checks and logging:

```bash
# Check health
docker exec subway-lettuce-aio /app/healthcheck.sh

# View logs
docker logs subway-lettuce-aio

# Monitor resource usage
docker stats subway-lettuce-aio
```

## 🆘 Support

If you encounter issues:

1. Run the diagnostic script: `node diagnose-location-issues.js`
2. Test locally: `./test-aio-local.sh`
3. Check the troubleshooting section above
4. Verify your Google Cloud Console API settings