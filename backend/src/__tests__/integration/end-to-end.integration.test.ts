import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { LocationRepository } from '../../repositories/LocationRepository';
import { RatingRepository } from '../../repositories/RatingRepository';
import locationRoutes from '../../routes/locations';
import { SubwayLocation, SubwayLocationDetail, Rating } from '../../types';

// Mock the repositories for integration testing
jest.mock('../../repositories/LocationRepository');
jest.mock('../../repositories/RatingRepository');
jest.mock('../../utils/weightedScore', () => ({
  calculateWeightedScore: jest.fn().mockResolvedValue(4.3)
}));

const MockedLocationRepository = LocationRepository as jest.MockedClass<typeof LocationRepository>;
const MockedRatingRepository = RatingRepository as jest.MockedClass<typeof RatingRepository>;

describe('End-to-End Integration Tests', () => {
  let app: express.Application;
  let mockLocationRepo: jest.Mocked<LocationRepository>;
  let mockRatingRepo: jest.Mocked<RatingRepository>;

  beforeEach(() => {
    // Create Express app with production-like middleware
    app = express();
    
    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
    }));
    
    // CORS configuration
    app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
    });
    app.use('/api/', limiter);
    
    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Health check endpoints
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: 'test'
      });
    });
    
    // API routes
    app.use('/api/locations', locationRoutes);
    
    // Error handling
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error(err.stack);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong!'
      });
    });

    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLocationRepo = new MockedLocationRepository() as jest.Mocked<LocationRepository>;
    mockRatingRepo = new MockedRatingRepository() as jest.Mocked<RatingRepository>;

    // Mock the constructor calls
    MockedLocationRepository.mockImplementation(() => mockLocationRepo);
    MockedRatingRepository.mockImplementation(() => mockRatingRepo);
    
    // Set up default mock implementations
    mockLocationRepo.getNearbyLocations = jest.fn().mockResolvedValue([]);
    mockLocationRepo.getLocationById = jest.fn().mockResolvedValue(null);
    mockLocationRepo.createLocation = jest.fn().mockResolvedValue('');
    mockRatingRepo.createRating = jest.fn().mockResolvedValue('');
    mockRatingRepo.getRatingsByLocation = jest.fn().mockResolvedValue([]);
    mockRatingRepo.getRatingStats = jest.fn().mockResolvedValue({
      averageScore: 0,
      totalRatings: 0,
      recentRatings: 0,
      scoreDistribution: []
    });
    mockRatingRepo.getTimeBasedAnalysis = jest.fn().mockResolvedValue([]);
  });

  const mockLocations: SubwayLocation[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Subway - Times Square',
      address: '1560 Broadway, New York, NY 10036',
      coordinates: { lat: 40.7589, lng: -73.9851 },
      hours: {
        monday: { open: '06:00', close: '23:00' },
        tuesday: { open: '06:00', close: '23:00' },
        wednesday: { open: '06:00', close: '23:00' },
        thursday: { open: '06:00', close: '23:00' },
        friday: { open: '06:00', close: '23:00' },
        saturday: { open: '07:00', close: '23:00' },
        sunday: { open: '08:00', close: '22:00' },
        timezone: 'America/New_York',
      },
      lettuceScore: 4.2,
      lastRated: new Date('2024-01-15T10:30:00Z'),
      recentlyRated: true,
      distanceFromUser: 250,
      isOpen: true,
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      name: 'Subway - Penn Station',
      address: '2 Penn Plaza, New York, NY 10121',
      coordinates: { lat: 40.7505, lng: -73.9934 },
      hours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '21:00' },
        sunday: { open: '08:00', close: '20:00' },
        timezone: 'America/New_York',
      },
      lettuceScore: 3.8,
      lastRated: new Date('2024-01-15T08:15:00Z'),
      recentlyRated: false,
      distanceFromUser: 180,
      isOpen: true,
    },
    {
      id: '323e4567-e89b-12d3-a456-426614174002',
      name: 'Subway - Union Square',
      address: '4 Union Square S, New York, NY 10003',
      coordinates: { lat: 40.7359, lng: -73.9911 },
      hours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '21:00' },
        sunday: { open: '08:00', close: '20:00' },
        timezone: 'America/New_York',
      },
      lettuceScore: 2.9,
      lastRated: new Date('2024-01-15T06:45:00Z'),
      recentlyRated: false,
      distanceFromUser: 320,
      isOpen: true,
    }
  ];

  describe('Complete User Journey - Map to Rating Submission', () => {
    it('should handle complete user workflow: location search -> view details -> submit rating -> view updated data', async () => {
      // Step 1: User opens app and searches for nearby locations
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);
      
      const searchResponse = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060, radius: 5000, limit: 20 });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.locations).toHaveLength(3);
      expect(searchResponse.body.locations[0].name).toBe('Subway - Times Square');
      expect(searchResponse.body.locations[0].lettuceScore).toBe(4.2);
      expect(searchResponse.body.locations[0].distanceFromUser).toBe(250);
      
      const selectedLocationId = searchResponse.body.locations[0].id;

      // Step 2: User selects a location to view details
      const mockLocationDetail: SubwayLocationDetail = {
        id: selectedLocationId,
        name: 'Subway - Times Square',
        address: '1560 Broadway, New York, NY 10036',
        coordinates: { lat: 40.7589, lng: -73.9851 },
        hours: {
          monday: { open: '06:00', close: '23:00' },
          tuesday: { open: '06:00', close: '23:00' },
          wednesday: { open: '06:00', close: '23:00' },
          thursday: { open: '06:00', close: '23:00' },
          friday: { open: '06:00', close: '23:00' },
          saturday: { open: '07:00', close: '23:00' },
          sunday: { open: '08:00', close: '22:00' },
          timezone: 'America/New_York',
        },
        lettuceScore: 4.2,
        lastRated: new Date('2024-01-15T10:30:00Z'),
        recentlyRated: true,
        distanceFromUser: 250,
        isOpen: true,
        ratings: [
          {
            id: '321e4567-e89b-12d3-a456-426614174002',
            locationId: selectedLocationId,
            score: 4,
            timestamp: new Date('2024-01-15T10:30:00Z')
          },
          {
            id: '421e4567-e89b-12d3-a456-426614174003',
            locationId: selectedLocationId,
            score: 5,
            timestamp: new Date('2024-01-15T09:15:00Z')
          }
        ],
        timeRecommendations: [
          {
            period: 'morning',
            averageScore: 4.5,
            confidence: 'medium',
            sampleSize: 8,
            timeRange: '6:00 AM - 11:00 AM'
          },
          {
            period: 'lunch',
            averageScore: 3.8,
            confidence: 'high',
            sampleSize: 15,
            timeRange: '11:00 AM - 3:00 PM'
          }
        ],
        totalRatings: 12,
        averageScore: 4.2
      };

      mockLocationRepo.getLocationById.mockResolvedValue(mockLocationDetail);

      const detailResponse = await request(app)
        .get(`/api/locations/${selectedLocationId}`);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.id).toBe(selectedLocationId);
      expect(detailResponse.body.ratings).toHaveLength(2);
      expect(detailResponse.body.timeRecommendations).toHaveLength(2);
      expect(detailResponse.body.timeRecommendations[0].period).toBe('morning');

      // Step 3: User submits a rating
      const newRatingId = 'new-rating-id-123';
      mockRatingRepo.createRating.mockResolvedValue(newRatingId);
      mockRatingRepo.getRatingsByLocation.mockResolvedValue([
        {
          id: newRatingId,
          locationId: selectedLocationId,
          score: 5,
          timestamp: new Date()
        }
      ]);

      const ratingResponse = await request(app)
        .post(`/api/locations/${selectedLocationId}/ratings`)
        .send({ score: 5 });

      expect(ratingResponse.status).toBe(201);
      expect(ratingResponse.body.rating.score).toBe(5);
      expect(ratingResponse.body.newLocationScore).toBe(4.3);
      expect(ratingResponse.body.message).toBe('Rating submitted successfully');

      // Step 4: User views updated rating summary
      mockRatingRepo.getRatingStats.mockResolvedValue({
        averageScore: 4.3,
        totalRatings: 13,
        recentRatings: 2,
        scoreDistribution: [
          { score: 3, count: 1 },
          { score: 4, count: 6 },
          { score: 5, count: 6 }
        ]
      });

      mockRatingRepo.getTimeBasedAnalysis.mockResolvedValue([
        {
          period: 'morning',
          averageScore: 4.6,
          confidence: 'high',
          sampleSize: 9,
          timeRange: '6:00 AM - 11:00 AM'
        },
        {
          period: 'lunch',
          averageScore: 3.9,
          confidence: 'high',
          sampleSize: 16,
          timeRange: '11:00 AM - 3:00 PM'
        }
      ]);

      const summaryResponse = await request(app)
        .get(`/api/locations/${selectedLocationId}/ratings/summary`);

      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.totalRatings).toBe(13);
      expect(summaryResponse.body.currentScore).toBe(4.3);
      expect(summaryResponse.body.optimalTimes).toHaveLength(2);
      expect(summaryResponse.body.scoreDistribution).toHaveLength(3);

      // Verify all repository methods were called correctly
      expect(mockLocationRepo.getNearbyLocations).toHaveBeenCalledWith(
        { lat: 40.7128, lng: -74.0060 },
        5000
      );
      expect(mockLocationRepo.getLocationById).toHaveBeenCalledWith(selectedLocationId);
      expect(mockRatingRepo.createRating).toHaveBeenCalledWith(selectedLocationId, 5, undefined);
      expect(mockRatingRepo.getRatingStats).toHaveBeenCalledWith(selectedLocationId);
      expect(mockRatingRepo.getTimeBasedAnalysis).toHaveBeenCalledWith(selectedLocationId);
    });
  });

  describe('Google Maps Integration Validation', () => {
    it('should provide correct data format for Google Maps integration', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);
      
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(response.status).toBe(200);
      
      // Validate each location has required fields for Google Maps
      response.body.locations.forEach((location: any) => {
        expect(location).toHaveProperty('id');
        expect(location).toHaveProperty('name');
        expect(location).toHaveProperty('address');
        expect(location).toHaveProperty('coordinates');
        expect(location.coordinates).toHaveProperty('lat');
        expect(location.coordinates).toHaveProperty('lng');
        expect(typeof location.coordinates.lat).toBe('number');
        expect(typeof location.coordinates.lng).toBe('number');
        expect(location.coordinates.lat).toBeGreaterThan(-90);
        expect(location.coordinates.lat).toBeLessThan(90);
        expect(location.coordinates.lng).toBeGreaterThan(-180);
        expect(location.coordinates.lng).toBeLessThan(180);
      });
    });
  });

  describe('Responsive Design Data Requirements', () => {
    it('should provide data optimized for mobile and desktop views', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);
      
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060, limit: 10 });

      expect(response.status).toBe(200);
      
      // Validate data structure supports responsive design
      response.body.locations.forEach((location: any) => {
        // Essential fields for mobile cards
        expect(location).toHaveProperty('name');
        expect(location).toHaveProperty('lettuceScore');
        expect(location).toHaveProperty('distanceFromUser');
        expect(location).toHaveProperty('recentlyRated');
        expect(location).toHaveProperty('isOpen');
        
        // Detailed fields for desktop/expanded views
        expect(location).toHaveProperty('address');
        expect(location).toHaveProperty('hours');
        expect(location).toHaveProperty('lastRated');
        
        // Validate score is in correct range
        expect(location.lettuceScore).toBeGreaterThanOrEqual(0);
        expect(location.lettuceScore).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Rating Calculation Validation', () => {
    it('should validate rating calculations and score updates work correctly', async () => {
      const locationId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Mock location exists
      mockLocationRepo.getLocationById.mockResolvedValue(mockLocations[0] as SubwayLocationDetail);
      
      // Test multiple rating submissions
      const ratings = [5, 4, 5, 3, 4];
      
      for (let i = 0; i < ratings.length; i++) {
        const score = ratings[i]!;
        const ratingId = `rating-${i}`;
        
        mockRatingRepo.createRating.mockResolvedValue(ratingId);
        mockRatingRepo.getRatingsByLocation.mockResolvedValue([
          {
            id: ratingId,
            locationId,
            score,
            timestamp: new Date()
          }
        ]);
        
        const response = await request(app)
          .post(`/api/locations/${locationId}/ratings`)
          .send({ score });

        expect(response.status).toBe(201);
        expect(response.body.rating.score).toBe(score);
        expect(response.body.newLocationScore).toBe(4.3); // Mocked weighted score
      }
      
      // Verify all ratings were processed
      expect(mockRatingRepo.createRating).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      mockLocationRepo.getNearbyLocations.mockRejectedValue(new Error('Network timeout'));
      
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Failed to fetch nearby locations');
    });

    it('should handle invalid coordinates gracefully', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 'invalid', lng: -74.0060 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid coordinates');
    });

    it('should handle rating submission errors', async () => {
      const locationId = '123e4567-e89b-12d3-a456-426614174000';
      mockLocationRepo.getLocationById.mockResolvedValue(mockLocations[0] as SubwayLocationDetail);
      mockRatingRepo.createRating.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post(`/api/locations/${locationId}/ratings`)
        .send({ score: 5 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);
      
      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/locations/nearby')
          .query({ lat: 40.7128, lng: -74.0060 })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.locations).toHaveLength(3);
      });

      expect(mockLocationRepo.getNearbyLocations).toHaveBeenCalledTimes(10);
    });

    it('should handle large result sets with pagination', async () => {
      // Create 100 mock locations
      const largeLocationSet: SubwayLocation[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockLocations[0]!,
        id: `location-${i}`,
        name: `Subway Location ${i}`,
        distanceFromUser: i * 10
      }));

      mockLocationRepo.getNearbyLocations.mockResolvedValue(largeLocationSet);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.locations).toHaveLength(20); // Should respect limit
      expect(response.body.totalFound).toBe(100);
    });
  });

  describe('Security Validation', () => {
    it('should include proper security headers', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should validate input parameters strictly', async () => {
      const maliciousInputs = [
        { lat: '40.7128<script>alert("xss")</script>', lng: -74.0060 },
        { lat: "40.7128'; DROP TABLE locations; --", lng: -74.0060 },
        { lat: 40.7128, lng: '../../etc/passwd' }
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .get('/api/locations/nearby')
          .query(input);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid coordinates');
      }
    });
  });

  describe('Health Check Integration', () => {
    it('should provide health check endpoint for monitoring', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.environment).toBe('test');
    });
  });
});