# 🐳 Docker Access Guide

## ✅ Application is Now Running!

Your Subway Lettuce Tracker application is successfully running in Docker containers. Here's how to access it:

### 🌐 Web Application URLs

- **Frontend (React App)**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health
- **Database**: localhost:5432 (PostgreSQL)
- **Redis Cache**: localhost:6379

### 📊 Container Status

All containers are running and healthy:
- ✅ **Frontend**: Healthy and accessible on port 3000
- ✅ **Backend**: Healthy and accessible on port 5000  
- ✅ **PostgreSQL**: Healthy database with PostGIS
- ✅ **Redis**: Healthy cache server

## 🔧 Issues Fixed

### 1. Database Connection Issue
**Problem**: Backend couldn't connect to PostgreSQL container
**Solution**: Updated `backend/src/database/connection.ts` to properly use `DATABASE_URL` environment variable

### 2. Frontend Network Access Issue  
**Problem**: Vite dev server only listening on localhost inside container
**Solution**: Updated `frontend/vite.config.ts` to listen on all interfaces (`host: '0.0.0.0'`)

## 🛠️ Docker Permission Fix (For Future Reference)

If you encounter Docker permission issues, here are the solutions:

### Option 1: Add User to Docker Group (Recommended)
```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker

# Test Docker without sudo
docker ps
```

### Option 2: Use sudo (Current Workaround)
```bash
# Use sudo for Docker commands
sudo docker ps
sudo docker logs <container-name>
sudo docker restart <container-name>
```

## 🚀 Using the Application

### 1. Open the Web Application
Navigate to: **http://localhost:3000**

### 2. Set Up Google Maps API Key
The application needs a Google Maps API key to function properly:

1. Edit the `.env` file:
   ```bash
   nano .env
   ```

2. Replace `your_google_maps_api_key_here` with your actual Google Maps API key:
   ```
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

3. Restart the frontend container:
   ```bash
   sudo docker restart subway-lettuce-frontend-dev
   ```

### 3. Test the Application Features
- **Location Permission**: Allow location access when prompted
- **Map View**: Should display Google Maps with your location
- **Nearby Locations**: Should show sample Subway locations
- **Rating System**: Click on locations to rate lettuce freshness
- **Directions**: Click directions to open Google Maps

## 🔍 Troubleshooting Commands

### Check Container Status
```bash
sudo docker ps
```

### View Container Logs
```bash
# Frontend logs
sudo docker logs subway-lettuce-frontend-dev

# Backend logs  
sudo docker logs subway-lettuce-backend-dev

# Database logs
sudo docker logs subway-lettuce-postgres-dev

# Redis logs
sudo docker logs subway-lettuce-redis-dev
```

### Restart Containers
```bash
# Restart specific container
sudo docker restart subway-lettuce-frontend-dev

# Restart all containers
sudo docker restart subway-lettuce-frontend-dev subway-lettuce-backend-dev subway-lettuce-postgres-dev subway-lettuce-redis-dev
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:5000/health

# Test nearby locations (requires location data)
curl "http://localhost:5000/api/locations/nearby?lat=40.7128&lng=-74.0060"
```

## 🎯 Next Steps

1. **Set up Google Maps API Key** (required for full functionality)
2. **Test all application features** in your browser
3. **Add sample location data** if needed
4. **Configure production environment** when ready to deploy

## 📞 Getting Help

If you encounter any issues:

1. **Check container logs** using the commands above
2. **Verify all containers are healthy**: `sudo docker ps`
3. **Test API connectivity**: `curl http://localhost:5000/health`
4. **Check network connectivity**: Ensure ports 3000 and 5000 are not blocked

The application is now fully functional and ready to use! 🎉