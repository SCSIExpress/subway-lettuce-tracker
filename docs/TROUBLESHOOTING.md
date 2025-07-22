# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### Container Issues

#### Container Won't Start

**Symptoms**: Container exits immediately or fails to start

**Solutions**:
1. Check Docker logs:
   ```bash
   docker logs subway-lettuce-aio
   ```

2. Verify required environment variables:
   ```bash
   # Required variables
   DATABASE_URL=postgresql://user:pass@host:5432/db
   REDIS_URL=redis://host:6379
   VITE_GOOGLE_MAPS_API_KEY=your_api_key
   ```

3. Test database connectivity:
   ```bash
   # Test PostgreSQL connection
   docker run --rm postgres:15-alpine psql $DATABASE_URL -c "SELECT 1;"
   
   # Test Redis connection
   docker run --rm redis:7-alpine redis-cli -u $REDIS_URL ping
   ```

#### Port Already in Use

**Symptoms**: `bind: address already in use`

**Solutions**:
1. Check what's using the port:
   ```bash
   sudo lsof -i :8080
   netstat -tulpn | grep :8080
   ```

2. Stop conflicting services:
   ```bash
   sudo systemctl stop service-name
   # Or kill the process
   sudo kill -9 PID
   ```

3. Use a different port:
   ```bash
   docker run -p 8081:8080 ...
   ```

### Database Issues

#### Database Connection Failed

**Symptoms**: `ECONNREFUSED` or `connection refused` errors

**Solutions**:
1. Verify database is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check database logs:
   ```bash
   docker logs postgres-container-name
   ```

3. Test connection string format:
   ```bash
   # Correct format
   DATABASE_URL=postgresql://username:password@hostname:port/database_name
   
   # Example
   DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/subway_lettuce_tracker
   ```

4. Check network connectivity:
   ```bash
   # If using Docker Compose
   docker-compose exec subway-lettuce-aio ping postgres
   ```

#### Database Migrations Failed

**Symptoms**: Migration errors in container logs

**Solutions**:
1. Check migration files exist:
   ```bash
   docker exec subway-lettuce-aio ls -la /app/backend/database/migrations/
   ```

2. Run migrations manually:
   ```bash
   docker exec subway-lettuce-aio npm run migrate
   ```

3. Reset database (development only):
   ```bash
   docker exec postgres-container dropdb -U postgres subway_lettuce_tracker
   docker exec postgres-container createdb -U postgres subway_lettuce_tracker
   ```

### Google Maps Issues

#### Maps Not Loading

**Symptoms**: Blank map area or "This page can't load Google Maps correctly"

**Solutions**:
1. Verify API key is set:
   ```bash
   docker exec subway-lettuce-aio env | grep GOOGLE_MAPS
   ```

2. Check API key in browser console:
   - Open browser developer tools
   - Look for Google Maps API errors
   - Common errors: "API key not valid" or "API not enabled"

3. Verify Google Cloud Console settings:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Check API key restrictions
   - Ensure these APIs are enabled:
     - Maps JavaScript API
     - Places API
     - Directions API

4. Test API key directly:
   ```bash
   curl "https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places"
   ```

#### Location Services Not Working

**Symptoms**: "Location not found" or geolocation errors

**Solutions**:
1. Check browser permissions:
   - Allow location access in browser
   - Check site permissions in browser settings

2. Test with HTTPS:
   - Geolocation requires HTTPS in production
   - Use reverse proxy with SSL certificate

3. Verify Places API is enabled:
   - Check Google Cloud Console
   - Ensure Places API quota is not exceeded

### Redis Issues

#### Redis Connection Failed

**Symptoms**: `ECONNREFUSED` to Redis or caching not working

**Solutions**:
1. Check Redis container:
   ```bash
   docker ps | grep redis
   docker logs redis-container-name
   ```

2. Test Redis connection:
   ```bash
   docker exec redis-container redis-cli ping
   ```

3. Check Redis URL format:
   ```bash
   # Without password
   REDIS_URL=redis://hostname:6379
   
   # With password
   REDIS_URL=redis://:password@hostname:6379
   ```

4. Verify Redis authentication:
   ```bash
   docker exec redis-container redis-cli -a password ping
   ```

### Performance Issues

#### Slow Response Times

**Symptoms**: Application loads slowly or times out

**Solutions**:
1. Check container resources:
   ```bash
   docker stats subway-lettuce-aio
   ```

2. Increase container memory:
   ```yaml
   # In docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 2G
   ```

3. Enable Redis caching:
   ```bash
   ENABLE_CACHE=true
   CACHE_TTL=3600
   ```

4. Optimize database queries:
   - Check database logs for slow queries
   - Add database indexes if needed

#### High Memory Usage

**Symptoms**: Container using excessive memory

**Solutions**:
1. Set memory limits:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G
   ```

2. Check for memory leaks:
   ```bash
   docker exec subway-lettuce-aio node --inspect=0.0.0.0:9229 /app/backend/server.js
   ```

3. Restart container periodically:
   ```bash
   docker restart subway-lettuce-aio
   ```

### Unraid Specific Issues

#### Template Not Found

**Symptoms**: Can't find Subway Lettuce Tracker in Community Applications

**Solutions**:
1. Add template URL manually:
   ```
   https://raw.githubusercontent.com/SCSIExpress/subway-lettuce-tracker/main/unraid-templates/
   ```

2. Check template repository:
   - Go to Docker → Templates
   - Verify template repositories are configured

#### Container Won't Start on Unraid

**Symptoms**: Container fails to start in Unraid

**Solutions**:
1. Check Unraid Docker logs:
   - Go to Docker tab
   - Click container name
   - View logs

2. Verify network settings:
   - Use bridge network for simple setup
   - Check port conflicts with other containers

3. Check file permissions:
   ```bash
   # On Unraid terminal
   chown -R 99:100 /mnt/user/appdata/subway-lettuce-tracker/
   ```

### SSL/HTTPS Issues

#### Mixed Content Errors

**Symptoms**: HTTPS site loading HTTP resources

**Solutions**:
1. Use HTTPS for all external resources
2. Configure reverse proxy with SSL:
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://subway-lettuce-aio:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

## Diagnostic Commands

### Health Check Commands

```bash
# Container health
docker exec subway-lettuce-aio /app/healthcheck.sh

# API health
curl http://localhost:8080/api/health

# Database health
docker exec postgres-container pg_isready -U postgres

# Redis health
docker exec redis-container redis-cli ping
```

### Log Analysis

```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f subway-lettuce-aio

# View last 100 lines
docker logs --tail 100 subway-lettuce-aio

# Search for errors
docker logs subway-lettuce-aio 2>&1 | grep -i error
```

### Network Debugging

```bash
# Check container networking
docker network ls
docker network inspect bridge

# Test connectivity between containers
docker exec subway-lettuce-aio ping postgres
docker exec subway-lettuce-aio nslookup postgres

# Check port accessibility
telnet localhost 8080
nc -zv localhost 8080
```

### Performance Monitoring

```bash
# Container resource usage
docker stats

# System resource usage
htop
free -h
df -h

# Database performance
docker exec postgres-container psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

## Getting Help

### Log Collection

When reporting issues, collect these logs:

```bash
# Container logs
docker logs subway-lettuce-aio > container.log 2>&1

# System information
docker version > system-info.txt
docker-compose version >> system-info.txt
uname -a >> system-info.txt

# Container inspection
docker inspect subway-lettuce-aio > container-inspect.json
```

### Support Channels

1. **GitHub Issues**: Report bugs and feature requests
2. **Unraid Forums**: Unraid-specific deployment issues
3. **Docker Documentation**: General Docker troubleshooting

### Before Reporting Issues

1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Collect relevant logs and system information
4. Provide steps to reproduce the issue
5. Include environment details (OS, Docker version, etc.)

Remember to remove sensitive information (API keys, passwords) from logs before sharing!