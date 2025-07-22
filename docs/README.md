# Subway Lettuce Tracker

A crowd-sourced web application that allows users to report and view the freshness status of lettuce at Subway restaurant locations.

## 🚀 Quick Start with AIO Container

The easiest way to run the Subway Lettuce Tracker is using our All-in-One (AIO) Docker container:

```bash
# Using Docker Compose (Recommended)
docker-compose -f docker-compose.aio.yml up -d

# Or using Docker directly
docker run -d --name subway-lettuce-tracker \
  -p 8080:8080 \
  -e VITE_GOOGLE_MAPS_API_KEY=your_api_key_here \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  ghcr.io/scsiexpress/subway-lettuce-tracker-aio:latest
```

## 📦 What's Included

The AIO container includes:
- **Frontend**: React application with Google Maps integration
- **Backend**: Node.js API server
- **Nginx**: Reverse proxy and static file serving
- **Health Checks**: Built-in monitoring

## 🔧 Configuration

### Required Environment Variables

- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps JavaScript API key
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

### Optional Environment Variables

- `NODE_ENV` - Application environment (default: production)
- `PORT` - Backend port (default: 5000)
- `VITE_API_URL` - API endpoint URL (default: http://localhost:8080/api)
- `ENABLE_FRONTEND` - Enable/disable frontend (default: true)

## 🐳 Unraid Deployment

For Unraid users, we provide ready-to-use templates:

1. **All-in-One Template**: Single container with everything included
2. **Individual Components**: Separate containers for advanced setups

Templates are available at:
```
https://raw.githubusercontent.com/SCSIExpress/subway-lettuce-tracker/main/unraid-templates/
```

See [Unraid Deployment Guide](UNRAID_DEPLOYMENT.md) for detailed instructions.

## 🛠️ Development

For local development:

```bash
# Clone the repository
git clone https://github.com/SCSIExpress/subway-lettuce-tracker.git
cd subway-lettuce-tracker

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development environment
docker-compose -f docker-compose.aio.yml up -d
```

## 📚 Documentation

- [Unraid Deployment Guide](docs/UNRAID_DEPLOYMENT.md) - Complete Unraid setup
- [Docker Configuration](docs/DOCKER_CONFIGURATION.md) - Advanced Docker setup
- [API Documentation](docs/API.md) - Backend API reference
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🔒 Security

- API keys are injected at runtime (not baked into images)
- Non-root containers
- Network isolation
- Input validation and rate limiting

## 📊 Features

- 🗺️ Interactive map with nearby Subway locations
- ⭐ Crowd-sourced lettuce freshness ratings (1-5 scale)
- 📍 Location-based services with distance sorting
- 📱 Responsive design for mobile compatibility
- 🕒 Historical analysis for optimal timing
- 🧭 Google Maps integration for directions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details