#!/bin/bash

# Test AIO Container Locally with Runtime Environment Variables
# This script tests the secure AIO container with your local .env file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing AIO Container with Runtime Environment Variables${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Check if container exists
if ! docker images | grep -q "subway-lettuce-aio"; then
    echo -e "${RED}ERROR: subway-lettuce-aio container not found${NC}"
    echo -e "${YELLOW}Please build the container first:${NC}"
    echo "./build-aio-with-api-key.sh"
    exit 1
fi

# Load environment variables from .env file
if [ -f .env ]; then
    echo -e "${GREEN}Loading environment variables from .env file...${NC}"
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
    echo -e "${RED}ERROR: .env file not found${NC}"
    echo -e "${YELLOW}Please create a .env file with your configuration${NC}"
    exit 1
fi

# Check required variables
REQUIRED_VARS=("DATABASE_URL" "REDIS_URL" "VITE_GOOGLE_MAPS_API_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}ERROR: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "${RED}  - $var${NC}"
    done
    echo -e "${YELLOW}Please add them to your .env file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables found${NC}"
echo -e "${BLUE}  - DATABASE_URL: ${DATABASE_URL%%@*}@***${NC}"
echo -e "${BLUE}  - REDIS_URL: ${REDIS_URL%%@*}@***${NC}"
echo -e "${BLUE}  - GOOGLE_MAPS_API_KEY: ${VITE_GOOGLE_MAPS_API_KEY:0:15}...${NC}"

# Stop any existing test container
docker stop test-aio-local 2>/dev/null || true
docker rm test-aio-local 2>/dev/null || true

echo -e "\n${BLUE}Starting test container...${NC}"

# Start container with environment variables
docker run -d --name test-aio-local \
    -p 8081:8080 \
    -e DATABASE_URL="$DATABASE_URL" \
    -e REDIS_URL="$REDIS_URL" \
    -e VITE_GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY" \
    -e VITE_API_URL="${VITE_API_URL:-http://localhost:8081/api}" \
    subway-lettuce-aio:latest

# Wait for container to start
echo -e "${YELLOW}Waiting for container to start...${NC}"
sleep 10

# Check if container is running
if docker ps | grep -q "test-aio-local"; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
    
    # Check logs for environment variable injection
    echo -e "\n${BLUE}Checking environment variable injection...${NC}"
    INJECTION_LOG=$(docker logs test-aio-local 2>&1 | grep -i "injecting" || echo "")
    
    if [ -n "$INJECTION_LOG" ]; then
        echo -e "${GREEN}✓ Environment variables injected:${NC}"
        echo -e "${BLUE}$INJECTION_LOG${NC}"
    else
        echo -e "${YELLOW}⚠ No injection logs found${NC}"
    fi
    
    # Test frontend accessibility
    echo -e "\n${BLUE}Testing frontend accessibility...${NC}"
    sleep 5
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/ || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Frontend accessible at http://localhost:8081/${NC}"
        
        # Test if API key is in the frontend files
        echo -e "\n${BLUE}Testing API key injection...${NC}"
        API_KEY_TEST=$(curl -s http://localhost:8081/ | grep -o "AIzaSy[A-Za-z0-9_-]*" | head -1 || echo "")
        
        if [ -n "$API_KEY_TEST" ]; then
            echo -e "${GREEN}✓ API key found in frontend: ${API_KEY_TEST:0:15}...${NC}"
        else
            echo -e "${YELLOW}⚠ API key not found in frontend HTML${NC}"
            echo -e "${BLUE}Checking JavaScript files...${NC}"
            
            # Get a JS file and check for API key
            JS_FILE=$(curl -s http://localhost:8081/ | grep -o 'assets/[^"]*\.js' | head -1)
            if [ -n "$JS_FILE" ]; then
                JS_API_KEY=$(curl -s "http://localhost:8081/$JS_FILE" | grep -o "AIzaSy[A-Za-z0-9_-]*" | head -1 || echo "")
                if [ -n "$JS_API_KEY" ]; then
                    echo -e "${GREEN}✓ API key found in JavaScript: ${JS_API_KEY:0:15}...${NC}"
                else
                    echo -e "${RED}✗ API key not found in JavaScript files${NC}"
                fi
            fi
        fi
        
        echo -e "\n${GREEN}🎉 Test completed successfully!${NC}"
        echo -e "${BLUE}Your container is ready to use with runtime environment variables.${NC}"
        echo -e "\n${YELLOW}To use this container permanently:${NC}"
        echo "1. Stop the test container: docker stop test-aio-local"
        echo "2. Run with your preferred name:"
        echo "   docker run -d --name subway-lettuce-aio \\"
        echo "     -p 8080:8080 \\"
        echo "     --env-file .env \\"
        echo "     subway-lettuce-aio:latest"
        
    else
        echo -e "${RED}✗ Frontend not accessible (HTTP $HTTP_CODE)${NC}"
        echo -e "${YELLOW}Container logs:${NC}"
        docker logs test-aio-local 2>&1 | tail -20
    fi
    
else
    echo -e "${RED}✗ Container failed to start${NC}"
    echo -e "${YELLOW}Container logs:${NC}"
    docker logs test-aio-local 2>&1 | tail -20
fi

#echo -e "\n${BLUE}Cleaning up test container...${NC}"
#docker stop test-aio-local 2>/dev/null || true
#docker rm test-aio-local 2>/dev/null || true

echo -e "${GREEN}Test completed!${NC}"