import request from 'supertest';
import express from 'express';
import { LocationRepository } from '../../repositories/LocationRepository';
import { RatingRepository } from '../../repositories/RatingRepository';
import locationRoutes from '../../routes/locations';
import { SubwayLocation, SubwayLocationDetail, Rating } from '../../types';
import { calculateWeightedScore } from '../../utils/weightedScore';

// Mock the repositories and utilities
jest.mock('../../repositories/LocationRepository');
jest.mock('../../repositories/RatingRepository');
jest.mock('../../utils/weightedScore', () => ({
  calculateWeightedScore: jest.fn()
}));

const MockedLocationRepository = LocationRepository as jest.MockedClass<typeof LocationRepository>;
const MockedRatingRepository = RatingRepository as jest.MockedClass<typeof RatingRepository>;

describe('Rating Endpoints', () => {
  let app: express.Application;
  let mockLocationRepo: jest.Mocked<LocationRepository>;
  let mockRatingRepo: jest.Mocked<RatingRepository>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/locations', locationRoutes);

    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLocationRepo = new MockedLocationRepository() as jest.Mocked<LocationRepository>;
    mockRatingRepo = new MockedRatingRepository() as jest.Mocked<RatingRepository>;

    // Mock the constructor calls
    MockedLocationRepository.mockImplementation(() => mockLocationRepo);
    MockedRatingRepository.mockImplementation(() => mockRatingRepo);

    // Mock the calculateWeightedScore function
    (calculateWeightedScore as jest.MockedFunction<typeof calculateWeightedScore>).mockResolvedValue(4.3);
  });

  const mockLocation: SubwayLocationDetail = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Subway - Test Location',
    address: '123 Test St, Test City, TC 12345',
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
    recentlyRated: false,
    ratings: [],
    timeRecommendations: [],
    totalRatings: 0,
    averageScore: 4.2
  };

  const mockRating: Rating = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    locationId: '123e4567-e89b-12d3-a456-426614174000',
    score: 4,
    timestamp: new Date('2024-01-15T10:30:00Z')
  };

  describe('POST /api/locations/:id/ratings', () => {
    it('should successfully submit a rating', async () => {
      mockLocationRepo.getLocationById.mockResolvedValue(mockLocation);
      mockRatingRepo.createRating.mockResolvedValue('456e7890-e89b-12d3-a456-426614174001');
      mockRatingRepo.getRatingsByLocation.mockResolvedValue([mockRating]);

      const response = await request(app)
        .post('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings')
        .send({ score: 4 });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('newLocationScore');
      expect(response.body).toHaveProperty('message');
      expect(response.body.rating.score).toBe(4);
      expect(mockRatingRepo.createRating).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        4,
        undefined
      );
    });

    it('should reject invalid location ID', async () => {
      const response = await request(app)
        .post('/api/locations/invalid-id/ratings')
        .send({ score: 4 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid location ID');
    });

    it('should reject invalid rating score', async () => {
      const response = await request(app)
        .post('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings')
        .send({ score: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid rating score');
    });

    it('should reject missing rating score', async () => {
      const response = await request(app)
        .post('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid rating score');
    });

    it('should return 404 for non-existent location', async () => {
      mockLocationRepo.getLocationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings')
        .send({ score: 4 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Location not found');
    });

    it('should handle repository errors', async () => {
      mockLocationRepo.getLocationById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings')
        .send({ score: 4 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/locations/:id/ratings/summary', () => {
    const mockStats = {
      averageScore: 4.2,
      totalRatings: 15,
      recentRatings: 3,
      scoreDistribution: [
        { score: 1, count: 1 },
        { score: 2, count: 2 },
        { score: 3, count: 3 },
        { score: 4, count: 5 },
        { score: 5, count: 4 }
      ]
    };

    const mockTimeAnalysis = [
      {
        period: 'morning' as const,
        averageScore: 4.5,
        confidence: 'high' as const,
        sampleSize: 12,
        timeRange: '6:00 AM - 11:00 AM'
      },
      {
        period: 'lunch' as const,
        averageScore: 3.8,
        confidence: 'medium' as const,
        sampleSize: 8,
        timeRange: '11:00 AM - 3:00 PM'
      }
    ];

    it('should return rating summary successfully', async () => {
      mockLocationRepo.getLocationById.mockResolvedValue(mockLocation);
      mockRatingRepo.getRatingStats.mockResolvedValue(mockStats);
      mockRatingRepo.getTimeBasedAnalysis.mockResolvedValue(mockTimeAnalysis);
      mockRatingRepo.getRatingsByLocation.mockResolvedValue([mockRating]);

      const response = await request(app)
        .get('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings/summary');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('currentScore');
      expect(response.body).toHaveProperty('totalRatings', 15);
      expect(response.body).toHaveProperty('lastRated');
      expect(response.body).toHaveProperty('optimalTimes');
      expect(response.body).toHaveProperty('recentActivity', 3);
      expect(response.body).toHaveProperty('scoreDistribution');
      
      expect(response.body.optimalTimes).toHaveLength(2);
      expect(response.body.optimalTimes[0]).toHaveProperty('timeRange', '6:00 AM - 11:00 AM');
      expect(response.body.optimalTimes[1]).toHaveProperty('timeRange', '11:00 AM - 3:00 PM');
    });

    it('should reject invalid location ID', async () => {
      const response = await request(app)
        .get('/api/locations/invalid-id/ratings/summary');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid location ID');
    });

    it('should return 404 for non-existent location', async () => {
      mockLocationRepo.getLocationById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings/summary');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Location not found');
    });

    it('should handle repository errors', async () => {
      mockLocationRepo.getLocationById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/locations/123e4567-e89b-12d3-a456-426614174000/ratings/summary');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});