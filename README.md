# Leaf App - Subway Lettuce Tracker

A crowd-sourced web application that allows users to report and view the freshness status of lettuce at Subway restaurant locations.

## Features

- 🗺️ Interactive map showing nearby Subway locations
- ⭐ Crowd-sourced lettuce freshness ratings (1-5 scale)
- 📍 Location-based services with distance sorting
- 📱 Responsive bento box design for mobile compatibility
- 🕒 Historical analysis for optimal timing recommendations
- 🧭 Google Maps integration for directions

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- React Query for server state management
- Zustand for client state management
- Google Maps JavaScript API

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL with PostGIS extension
- Redis for caching
- JWT authentication (future feature)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Google Maps API key

### Using Docker (Recommended)

1. Clone the repository
2. Copy environment files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Add your Google Maps API key to the environment files

4. Start all services:
   ```bash
   docker-compose up -d
   ```

5. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432
   - Redis: localhost:6379

### Local Development

1. Start the database services:
   ```bash
   docker-compose up postgres redis -d
   ```

2. Install and run backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. Install and run frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Environment Variables

### Required
- `GOOGLE_MAPS_API_KEY`: Your Google Maps JavaScript API key

### Optional
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database configuration
- `REDIS_URL`: Redis connection string
- `PORT`: Backend server port (default: 5000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

## API Endpoints

- `GET /health` - Health check
- `GET /api/test` - Test endpoint
- `GET /api/locations/nearby` - Get nearby Subway locations (coming soon)
- `POST /api/locations/:id/ratings` - Submit lettuce rating (coming soon)

## Database Schema

The application uses PostgreSQL with PostGIS extension for geospatial queries:

- `locations` table: Subway location data with coordinates
- `ratings` table: User-submitted lettuce freshness ratings
- Spatial indexes for efficient location-based queries
- Functions for weighted score calculations

## Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Database Migrations
```bash
cd backend && npm run migrate
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details