# 🚀 Manual Unraid Deployment Guide

## Overview

This guide helps you manually deploy the Subway Lettuce Tracker to Unraid using pre-built Docker images while waiting for the automated GitHub Container Registry (GHCR) setup to complete.

## 📦 Files Created

I've built the Docker images locally and created the following files for you:

- `subway-lettuce-tracker-backend.tar` (131 MB) - Backend API server
- `subway-lettuce-tracker-frontend.tar` (52 MB) - Frontend React application
- `load-images-unraid.sh` - Script to load images on Unraid

## 🔧 Step-by-Step Deployment

### Step 1: Transfer Files to Unraid

1. **Copy the tar files to your Unraid server**:
   ```bash
   # From your local machine, copy to Unraid
   scp subway-lettuce-tracker-*.tar root@YOUR_UNRAID_IP:/tmp/
   scp load-images-unraid.sh root@YOUR_UNRAID_IP:/tmp/
   ```

   Or use the Unraid web interface:
   - Go to **Main** → **Flash** → **Upload**
   - Upload the `.tar` files and the script

### Step 2: Load Images on Unraid

1. **SSH into your Unraid server**:
   ```bash
   ssh root@YOUR_UNRAID_IP
   ```

2. **Navigate to the files and load them**:
   ```bash
   cd /tmp
   chmod +x load-images-unraid.sh
   ./load-images-unraid.sh
   ```

   Or manually load each image:
   ```bash
   docker load -i subway-lettuce-tracker-backend.tar
   docker load -i subway-lettuce-tracker-frontend.tar
   ```

3. **Verify images are loaded**:
   ```bash
   docker images | grep subway-lettuce-tracker
   ```

### Step 3: Set Up Docker Network

1. **Create the custom network** (if not already created):
   ```bash
   docker network create --driver bridge --subnet=172.20.0.0/16 subway-network
   ```

### Step 4: Deploy Containers

#### Option A: Using Unraid Templates (Recommended)

1. **Add the templates** to your Unraid Docker templates:
   - Copy the XML files from `unraid-templates/` directory
   - Or use the direct URLs (after GitHub setup is complete)

2. **Install containers in this order**:
   1. PostgreSQL (`subway-lettuce-postgres.xml`)
   2. Redis (`subway-lettuce-redis.xml`)
   3. Main application (`subway-lettuce-tracker-stack.xml`)

#### Option B: Manual Docker Commands

1. **Start PostgreSQL**:
   ```bash
   docker run -d \
     --name subway-lettuce-postgres \
     --network subway-network \
     -p 5432:5432 \
     -e POSTGRES_DB=subway_lettuce_tracker \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres123 \
     -e POSTGRES_HOST_AUTH_METHOD=md5 \
     -v /mnt/user/appdata/subway-lettuce-tracker/postgres:/var/lib/postgresql/data \
     postgis/postgis:15-3.3-alpine
   ```

2. **Start Redis**:
   ```bash
   docker run -d \
     --name subway-lettuce-redis \
     --network subway-network \
     -p 6379:6379 \
     -v /mnt/user/appdata/subway-lettuce-tracker/redis:/data \
     redis:7-alpine \
     redis-server --appendonly yes --requirepass redis123
   ```

3. **Start Backend**:
   ```bash
   docker run -d \
     --name subway-lettuce-backend \
     --network subway-network \
     -p 5000:5000 \
     -e NODE_ENV=production \
     -e DATABASE_URL=postgresql://postgres:postgres123@subway-lettuce-postgres:5432/subway_lettuce_tracker \
     -e REDIS_URL=redis://:redis123@subway-lettuce-redis:6379 \
     -e FRONTEND_URL=http://YOUR_UNRAID_IP:3000 \
     -v /mnt/user/appdata/subway-lettuce-tracker/logs:/app/logs \
     ghcr.io/scsiexpress/subway-lettuce-tracker-backend:latest
   ```

4. **Start Frontend**:
   ```bash
   docker run -d \
     --name subway-lettuce-frontend \
     --network subway-network \
     -p 3000:8080 \
     -e VITE_API_URL=http://YOUR_UNRAID_IP:5000/api \
     -e VITE_GOOGLE_MAPS_API_KEY=your_api_key_here \
     -e VITE_APP_NAME="Subway Lettuce Tracker" \
     ghcr.io/scsiexpress/subway-lettuce-tracker-frontend:latest
   ```

### Step 5: Configure Environment Variables

**Critical variables to set**:

- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (required for maps)
- `POSTGRES_PASSWORD` - Change from default `postgres123`
- `REDIS_PASSWORD` - Change from default `redis123`
- `VITE_API_URL` - Set to `http://YOUR_UNRAID_IP:5000/api`
- `FRONTEND_URL` - Set to `http://YOUR_UNRAID_IP:3000`

### Step 6: Verify Deployment

1. **Check container status**:
   ```bash
   docker ps | grep subway-lettuce
   ```

2. **Check logs if needed**:
   ```bash
   docker logs subway-lettuce-backend
   docker logs subway-lettuce-frontend
   ```

3. **Test the application**:
   - Frontend: `http://YOUR_UNRAID_IP:3000`
   - Backend API: `http://YOUR_UNRAID_IP:5000/health`

## 🔧 Troubleshooting

### Common Issues

1. **Images not found**:
   - Verify images are loaded: `docker images | grep subway-lettuce`
   - Re-run the load script if needed

2. **Network issues**:
   - Ensure all containers are on the same network: `subway-network`
   - Check network exists: `docker network ls | grep subway`

3. **Database connection errors**:
   - Ensure PostgreSQL container is running and healthy
   - Check database credentials match between containers

4. **Frontend can't reach backend**:
   - Verify `VITE_API_URL` points to correct IP and port
   - Test backend directly: `curl http://YOUR_UNRAID_IP:5000/health`

### Container Management

```bash
# Stop all containers
docker stop subway-lettuce-frontend subway-lettuce-backend subway-lettuce-redis subway-lettuce-postgres

# Start all containers
docker start subway-lettuce-postgres subway-lettuce-redis subway-lettuce-backend subway-lettuce-frontend

# Remove all containers (if needed to start over)
docker rm subway-lettuce-frontend subway-lettuce-backend subway-lettuce-redis subway-lettuce-postgres
```

## 🔄 Transition to Automated Deployment

Once GitHub Actions completes building the images:

1. **Images will be available at**:
   - `ghcr.io/scsiexpress/subway-lettuce-tracker-backend:latest`
   - `ghcr.io/scsiexpress/subway-lettuce-tracker-frontend:latest`

2. **Templates will be updated** automatically with correct URLs

3. **You can switch to using** the automated images by:
   - Stopping current containers
   - Pulling new images: `docker pull ghcr.io/scsiexpress/subway-lettuce-tracker-backend:latest`
   - Restarting containers with new images

## 📊 Resource Usage

**Approximate resource requirements**:
- **CPU**: 2-4 cores recommended
- **RAM**: 2-4 GB total
- **Storage**: 1-2 GB for images + data storage
- **Network**: Standard Docker bridge networking

## 🎉 Success!

Once deployed, you'll have:

✅ Complete Subway Lettuce Tracker application running on Unraid  
✅ PostgreSQL database with PostGIS for location data  
✅ Redis caching for improved performance  
✅ React frontend with Google Maps integration  
✅ Node.js backend API with full functionality  

Your application will be accessible at `http://YOUR_UNRAID_IP:3000`!