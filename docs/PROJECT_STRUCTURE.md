# 📁 Project Structure

## Overview

The Subway Lettuce Tracker project is organized around an All-in-One (AIO) Docker container approach for easy deployment, with a focus on Unraid compatibility.

## Directory Structure

```
subway-lettuce-tracker/
├── README.md                           # Main project documentation
├── .env                               # Environment configuration
├── .env.example                       # Environment template
├── docker-compose.aio.yml             # AIO Docker Compose configuration
├── Dockerfile.aio                     # AIO container build file
├── nginx.conf                         # Nginx configuration for AIO
├── test-aio-local.sh                  # Local AIO testing script
│
├── backend/                           # Node.js backend application
│   ├── src/                          # Source code
│   ├── package.json                  # Dependencies
│   ├── Dockerfile                    # Backend container (legacy)
│   └── ...
│
├── frontend/                          # React frontend application
│   ├── src/                          # Source code
│   ├── package.json                  # Dependencies
│   ├── Dockerfile                    # Frontend container (legacy)
│   └── ...
│
├── docs/                             # Documentation
│   ├── README.md                     # Comprehensive project guide
│   ├── UNRAID_DEPLOYMENT.md          # Unraid deployment guide
│   ├── DOCKER_CONFIGURATION.md       # Advanced Docker setup
│   ├── TROUBLESHOOTING.md            # Common issues and solutions
│   ├── PROJECT_STRUCTURE.md          # This file
│   └── [other documentation files]
│
├── scripts/                          # Build and deployment scripts
│   ├── build-aio.sh                 # Build AIO container
│   ├── test-aio.sh                  # Test AIO container
│   ├── push-to-ghcr.sh              # Push to GitHub Container Registry
│   ├── setup-ghcr.sh                # GitHub Container Registry setup
│   └── [other utility scripts]
│
├── unraid-templates/                 # Unraid Docker templates
│   ├── subway-lettuce-tracker-all-in-one.xml
│   ├── subway-lettuce-postgres.xml
│   ├── subway-lettuce-redis.xml
│   └── subway-lettuce-tracker-stack.xml
│
└── [configuration files]
    ├── .gitignore
    ├── package.json                  # Root package.json
    └── ...
```

## Key Components

### 🐳 AIO Container (`Dockerfile.aio`)

The All-in-One container is the primary deployment method:
- **Multi-stage build**: Optimized for production
- **Runtime injection**: API keys injected at runtime for security
- **Supervisor**: Manages multiple processes (backend, nginx)
- **Health checks**: Built-in monitoring

### 📋 Docker Compose (`docker-compose.aio.yml`)

Complete stack configuration:
- **PostgreSQL**: Database with PostGIS extension
- **Redis**: Caching layer
- **AIO Container**: Main application
- **Networking**: Isolated container network
- **Volumes**: Persistent data storage

### 🛠️ Scripts Directory

Automated build and deployment tools:
- `build-aio.sh`: Build the AIO container locally
- `test-aio.sh`: Test container functionality
- `push-to-ghcr.sh`: Push to GitHub Container Registry
- `setup-ghcr.sh`: Configure GHCR integration

### 📚 Documentation

Comprehensive guides for different use cases:
- **README.md**: Quick start and overview
- **UNRAID_DEPLOYMENT.md**: Unraid-specific deployment
- **DOCKER_CONFIGURATION.md**: Advanced Docker setups
- **TROUBLESHOOTING.md**: Common issues and solutions

### 🎯 Unraid Templates

Ready-to-use Unraid Docker templates:
- **All-in-One**: Single container deployment
- **Individual components**: Separate containers for advanced setups
- **Auto-configuration**: Pre-configured environment variables

## Deployment Approaches

### 1. AIO Container (Recommended)

**Best for**: Most users, Unraid deployments, simple setups

```bash
docker-compose -f docker-compose.aio.yml up -d
```

**Includes**:
- Frontend (React + Nginx)
- Backend (Node.js API)
- Reverse proxy configuration
- Health monitoring

### 2. Individual Containers (Advanced)

**Best for**: Scaling, custom configurations, development

**Components**:
- PostgreSQL container
- Redis container
- Backend API container
- Frontend container
- Nginx load balancer

### 3. Unraid Templates

**Best for**: Unraid users, GUI-based deployment

**Templates available**:
- All-in-One template (simplest)
- Individual component templates
- Pre-configured with sensible defaults

## Configuration Management

### Environment Variables

**Runtime injection approach**:
- API keys not baked into images
- Environment-specific configuration
- Secure secrets management

**Key variables**:
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps integration
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection

### Security Features

- **Non-root containers**: Enhanced security
- **Runtime injection**: No hardcoded secrets
- **Network isolation**: Container networking
- **Input validation**: API security
- **Rate limiting**: DDoS protection

## Development Workflow

### Local Development

1. **Setup**: Copy `.env.example` to `.env`
2. **Configure**: Add API keys and database URLs
3. **Build**: `./scripts/build-aio.sh`
4. **Test**: `./scripts/test-aio.sh`
5. **Deploy**: `docker-compose -f docker-compose.aio.yml up -d`

### Production Deployment

1. **Build**: Automated via GitHub Actions
2. **Push**: Images pushed to GHCR
3. **Deploy**: Use Unraid templates or Docker Compose
4. **Monitor**: Built-in health checks

## Migration from Legacy Setup

### What Changed

- **Consolidated containers**: Multiple containers → Single AIO
- **Simplified deployment**: Complex setup → One-command deployment
- **Enhanced security**: Build-time secrets → Runtime injection
- **Better documentation**: Scattered docs → Organized structure

### Migration Steps

1. **Backup data**: Export existing database and configurations
2. **Update configuration**: Use new environment variable format
3. **Deploy AIO**: Use `docker-compose.aio.yml`
4. **Restore data**: Import database and verify functionality
5. **Update monitoring**: Use new health check endpoints

## Maintenance

### Regular Tasks

- **Updates**: Pull latest images from GHCR
- **Backups**: Database and configuration backups
- **Monitoring**: Check health endpoints and logs
- **Security**: Update API keys and passwords

### Troubleshooting

- **Logs**: `docker logs subway-lettuce-aio`
- **Health**: `curl http://localhost:8080/api/health`
- **Debug**: Use troubleshooting guide in docs

## Future Enhancements

### Planned Features

- **Kubernetes support**: Helm charts for K8s deployment
- **Monitoring stack**: Prometheus/Grafana integration
- **Auto-scaling**: Horizontal pod autoscaling
- **CI/CD improvements**: Enhanced GitHub Actions

### Community Contributions

- **Templates**: Additional deployment templates
- **Documentation**: Improved guides and tutorials
- **Features**: New application functionality
- **Testing**: Enhanced test coverage

This structure provides a clean, maintainable, and scalable foundation for the Subway Lettuce Tracker project, with a focus on ease of deployment and Unraid compatibility.