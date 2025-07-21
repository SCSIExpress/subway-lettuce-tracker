import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { LocationRepository } from '../../repositories/LocationRepository';
import { RatingRepository } from '../../repositories/RatingRepository';
import locationRoutes from '../../routes/locations';
import { SubwayLocation, SubwayLocationDetail, Rating } from '../../types';

// Mock the repositories
jest.mock('../../repositories/LocationRepository');
jest.mock('../../repositories/RatingRepository');
jest.mock('../../utils/weightedScore', () => ({
  calculateWeightedScore: jest.fn().mockResolvedValue(4.3)
}));

const MockedLocationRepository = LocationRepository as jest.MockedClass<typeof LocationRepository>;
const MockedRatingRepository = RatingRepository as jest.MockedClass<typeof RatingRepository>;

describe('API Integration Tests', () => {
  let app: express.Application;
  let mockLocationRepo: jest.Mocked<LocationRepository>;
  let mockRatingRepo: jest.Mocked<RatingRepository>;

  beforeEach(() => {
    // Create Express app with middleware similar to production
    app = express();
    
    // Add middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Add rate limiting (more lenient for tests)
    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    app.use('/api/', limiter);
    
    // Add routes
    app.use('/api/locations', locationRoutes);
    
    // Global error handler
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
  });

  const mockLocations: SubwayLocation[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Subway Downtown',
      address: '123 Main St, City, State 12345',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      hours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '21:00' },
        sunday: { open: '08:00', close: '20:00' },
        timezone: 'America/New_York'
      },
      lettuceScore: 4.2,
      lastRated: new Date('2024-01-15T10:30:00Z'),
      recentlyRated: true,
      distanceFromUser: 150
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      name: 'Subway Uptown',
      address: '456 Oak Ave, City, State 12345',
      coordinates: { lat: 40.7589, lng: -73.9851 },
      hours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '21:00' },
        sunday: { open: '08:00', close: '20:00' },
        timezone: 'America/New_York'
      },
      lettuceScore: 3.8,
      lastRated: new Date('2024-01-15T08:15:00Z'),
      recentlyRated: false,
      distanceFromUser: 320
    }
  ];

  describe('Complete User Journey', () => {
    it('should handle complete user flow: search -> view details -> rate -> view updated summary', async () => {
      // Step 1: Search for nearby locations
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);
      
      const searchResponse = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.locations).toHaveLength(2);
      
      const locationId = searchResponse.body.locations[0].id;

      // Step 2: Get detailed location information
      const mockLocationDetail: SubwayLocationDetail = {
        ...mockLocations[0],
        ratings: [
          {
            id: '321e4567-e89b-12d3-a456-426614174002',
            locationId: locationId,
            score: 4,
            timestamp: new Date('2024-01-15T10:30:00Z')
          }
        ],
        timeRecommendations: [
          {
            period: 'morning',
            averageScore: 4.2,
            confidence: 'medium',
            sampleSize: 5,
            timeRange: '6:00 AM - 11:00 AM'
          }
        ],
        totalRatings: 1,
        averageScore: 4.0
      };

      mockLocationRepo.getLocationById.mockResolvedValue(mockLocationDetail);

      const detailResponse = await request(app)
        .get(`/api/locations/${locationId}`);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.id).toBe(locationId);
      expect(detailResponse.body.ratings).toHaveLength(1);

      // Step 3: Submit a rating
      mockRatingRepo.createRating.mockResolvedValue('new-rating-id');
      mockRatingRepo.getRatingsByLocation.mockResolvedValue([
        ...mockLocationDetail.ratings,
        {
          id: 'new-rating-id',
          locationId: locationId,
          score: 5,
          timestamp: new Date()
        }
      ]);

      const ratingResponse = await request(app)
        .post(`/api/locations/${locationId}/ratings`)
        .send({ score: 5 });

      expect(ratingResponse.status).toBe(201);
      expect(ratingResponse.body.rating.score).toBe(5);
      expect(ratingResponse.body.newLocationScore).toBe(4.3);

      // Step 4: Get updated rating summary
      mockRatingRepo.getRatingStats.mockResolvedValue({
        averageScore: 4.3,
        totalRatings: 2,
        recentRatings: 1,
        scoreDistribution: [
          { score: 4, count: 1 },
          { score: 5, count: 1 }
        ]
      });

      mockRatingRepo.getTimeBasedAnalysis.mockResolvedValue([
        {
          period: 'morning',
          averageScore: 4.5,
          confidence: 'medium',
          sampleSize: 6,
          timeRange: '6:00 AM - 11:00 AM'
        }
      ]);

      const summaryResponse = await request(app)
        .get(`/api/locations/${locationId}/ratings/summary`);

      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.totalRatings).toBe(2);
      expect(summaryResponse.body.currentScore).toBe(4.3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings')
        .set('Content-Type', 'application/json')
        .send('{"score": invalid}');

      expect(response.status).toBe(400);
    });

    it('should handle very large request bodies', async () => {
      const largeData = 'x'.repeat(11 * 1024 * 1024); // 11MB, larger than 10MB limit
      
      const response = await request(app)
        .post('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings')
        .send({ score: 5, data: largeData });

      expect(response.status).toBe(413); // Payload too large
    });

    it('should handle concurrent rating submissions', async () => {
      mockLocationRepo.getLocationById.mockResolvedValue({
        ...mockLocations[0],
        ratings: [],
        timeRecommendations: [],
        totalRatings: 0,
        averageScore: 0
      } as SubwayLocationDetail);
      
      mockRatingRepo.createRating.mockResolvedValue('rating-id');
      mockRatingRepo.getRatingsByLocation.mockResolvedValue([]);

      const locationId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Submit multiple ratings concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post(`/api/locations/${locationId}/ratings`)
          .send({ score: i + 1 })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should have called createRating 5 times
      expect(mockRatingRepo.createRating).toHaveBeenCalledTimes(5);
    });

    it('should handle database connection failures gracefully', async () => {
      mockLocationRepo.getNearbyLocations.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Failed to fetch nearby locations');
    });

    it('should handle partial data corruption', async () => {
      // Mock corrupted location data (missing required fields)
      const corruptedLocation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Subway Downtown',
        // Missing address, coordinates, etc.
      };

      mockLocationRepo.getNearbyLocations.mockResolvedValue([corruptedLocation as any]);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      // Should still return 200 but with filtered/validated data
      expect(response.status).toBe(200);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple simultaneous location searches', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);

      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/locations/nearby')
          .query({ lat: 40.7128, lng: -74.0060 })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.locations).toHaveLength(2);
      });

      expect(mockLocationRepo.getNearbyLocations).toHaveBeenCalledTimes(10);
    });

    it('should handle large result sets efficiently', async () => {
      // Create 100 mock locations
      const largeLocationSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockLocations[0],
        id: `location-${i}`,
        name: `Subway Location ${i}`,
        distanceFromUser: i * 10
      }));

      mockLocationRepo.getNearbyLocations.mockResolvedValue(largeLocationSet);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060, limit: 50 });

      expect(response.status).toBe(200);
      expect(response.body.locations).toHaveLength(50); // Should respect limit
      expect(response.body.totalFound).toBe(100);
    });
  });

  describe('Security and Validation', () => {
    it('should sanitize input parameters', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ 
          lat: '40.7128<script>alert("xss")</script>', 
          lng: -74.0060 
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid coordinates');
    });

    it('should prevent SQL injection attempts', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ 
          lat: "40.7128'; DROP TABLE locations; --", 
          lng: -74.0060 
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid coordinates');
    });

    it('should validate UUID format strictly', async () => {
      const maliciousIds = [
        '../../../etc/passwd',
        '123e4567-e89b-12d3-a456-426614174000; DROP TABLE ratings;',
        '<script>alert("xss")</script>',
        '../../admin/users'
      ];

      for (const id of maliciousIds) {
        const response = await request(app)
          .get(`/api/locations/${id}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid location ID');
      }
    });

    it('should enforce rate limiting', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);

      // Make requests up to the limit (100 per minute in test config)
      const promises = Array.from({ length: 101 }, () =>
        request(app)
          .get('/api/locations/nearby')
          .query({ lat: 40.7128, lng: -74.0060 })
      );

      const responses = await Promise.all(promises);
      
      // First 100 should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses.length).toBe(100);
      expect(rateLimitedResponses.length).toBe(1);
    });
  });

  describe('CORS and Headers', () => {
    it('should include proper CORS headers', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 })
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include security headers', async () => {
      mockLocationRepo.getNearbyLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });
});