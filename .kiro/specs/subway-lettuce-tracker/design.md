npm# Design Document - Subway Lettuce Tracker

## Overview

The Leaf App is a Progressive Web Application (PWA) built with modern web technologies to enable seamless transition to mobile. The application uses a microservices architecture with a React frontend, Node.js backend, and PostgreSQL database. The design emphasizes real-time data updates, responsive UI, and efficient location-based queries.

**Recommended Database:** PostgreSQL with PostGIS extension
- Excellent geospatial capabilities for location-based queries
- Strong consistency for rating data
- Time-series optimization for historical analysis
- JSON support for flexible schema evolution

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React PWA     │    │   Node.js API   │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend       │◄──►│   + PostGIS     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Google Maps    │    │   Subway Store  │
│     API         │    │   Locator API   │
└─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend:** React 18 with TypeScript, Tailwind CSS for bento box design
- **State Management:** React Query for server state, Zustand for client state
- **Maps:** Google Maps JavaScript API with React Google Maps
- **Backend:** Node.js with Express, TypeScript
- **Database:** PostgreSQL 15+ with PostGIS extension
- **Authentication:** JWT tokens (future feature)
- **Deployment:** Docker containers, cloud-ready

## Components and Interfaces

### Frontend Components

#### 1. MapView Component
```typescript
interface MapViewProps {
  userLocation: Coordinates;
  subwayLocations: SubwayLocation[];
  selectedLocation?: SubwayLocation;
  onLocationSelect: (location: SubwayLocation) => void;
}
```
- Renders Google Maps with Subway location markers
- Handles user location detection and permissions
- Manages map interactions and marker clustering

#### 2. LocationPanel Component
```typescript
interface LocationPanelProps {
  locations: SubwayLocation[];
  selectedLocation?: SubwayLocation;
  onLocationSelect: (location: SubwayLocation) => void;
  onRate: (locationId: string) => void;
  onDirections: (location: SubwayLocation) => void;
}
```
- Slide-up panel with infinite scroll
- Rounded rectangle cards for each location
- Rating indicators and freshness scores

#### 3. RatingModal Component
```typescript
interface RatingModalProps {
  location: SubwayLocation;
  onSubmit: (rating: number) => void;
  onClose: () => void;
}
```
- 1-5 star rating interface
- Shows last rating timestamp
- Displays optimal timing recommendations

### Backend API Endpoints

#### Location Service
```typescript
GET /api/locations/nearby
Query: { lat: number, lng: number, radius?: number }
Response: SubwayLocation[]

GET /api/locations/:id
Response: SubwayLocationDetail

POST /api/locations/:id/ratings
Body: { rating: number, timestamp: Date }
Response: { success: boolean, newScore: number }
```

#### Rating Service
```typescript
GET /api/locations/:id/ratings/summary
Response: {
  currentScore: number,
  totalRatings: number,
  lastRated: Date,
  optimalTimes: TimeRecommendation[]
}
```

## Data Models

### SubwayLocation
```typescript
interface SubwayLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  hours: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  lettuceScore: number; // 1-5, weighted average of last 10 ratings
  lastRated?: Date;
  recentlyRated: boolean; // rated within last 2 hours
  distanceFromUser?: number; // in meters
}
```

### Rating
```typescript
interface Rating {
  id: string;
  locationId: string;
  score: number; // 1-5
  timestamp: Date;
  userId?: string; // for future user tracking
}
```

### TimeRecommendation
```typescript
interface TimeRecommendation {
  period: 'morning' | 'lunch' | 'afternoon' | 'evening';
  averageScore: number;
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
}
```

## Database Schema

### locations table
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  coordinates POINT NOT NULL, -- PostGIS point type
  hours JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_coordinates ON locations USING GIST (coordinates);
```

### ratings table
```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  score INTEGER CHECK (score >= 1 AND score <= 5),
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id UUID NULL -- for future use
);

CREATE INDEX idx_ratings_location_timestamp ON ratings (location_id, timestamp DESC);
```

## Error Handling

### Frontend Error Boundaries
- Map loading failures with fallback to list view
- Location permission denied with manual location entry
- Network failures with offline capability (PWA)
- Rating submission failures with retry mechanism

### Backend Error Responses
```typescript
interface ErrorResponse {
  error: string;
  message: string;
  code: number;
  timestamp: Date;
}
```

### Common Error Scenarios
- Google Maps API quota exceeded
- Database connection failures
- Invalid location coordinates
- Rating validation failures

## Testing Strategy

### Frontend Testing
- **Unit Tests:** Component logic with Jest and React Testing Library
- **Integration Tests:** API integration with Mock Service Worker
- **E2E Tests:** Critical user flows with Playwright
- **Visual Tests:** Component snapshots and responsive design

### Backend Testing
- **Unit Tests:** Service layer logic with Jest
- **Integration Tests:** Database operations with test containers
- **API Tests:** Endpoint validation with Supertest
- **Load Tests:** Rating submission performance with Artillery

### Database Testing
- **Migration Tests:** Schema changes and rollbacks
- **Performance Tests:** Geospatial query optimization
- **Data Integrity Tests:** Rating calculation accuracy

### Test Coverage Goals
- Frontend: 80% line coverage
- Backend: 85% line coverage
- Critical paths: 95% coverage

## Performance Considerations

### Frontend Optimization
- Map marker clustering for dense areas
- Virtual scrolling for location list
- Image lazy loading for location photos
- Service worker caching for offline support

### Backend Optimization
- Database connection pooling
- Redis caching for frequently accessed locations
- Rate limiting for rating submissions
- Geospatial indexing for location queries

### Database Optimization
- Materialized views for score calculations
- Partitioning ratings table by date
- Regular cleanup of old ratings (>6 months)
- Query optimization for distance calculations

## Security Considerations

### Data Protection
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS protection with Content Security Policy
- Rate limiting to prevent spam ratings

### API Security
- CORS configuration for allowed origins
- Request size limits
- API key protection for Google Maps
- Future: JWT authentication for user accounts