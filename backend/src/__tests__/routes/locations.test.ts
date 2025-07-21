import request from 'supertest';
import express from 'express';
import { SubwayLocation, SubwayLocationDetail } from '../../types';

// Mock the LocationRepository before importing the routes
const mockGetNearbyLocations = jest.fn();
const mockGetLocationById = jest.fn();

jest.mock('../../repositories/LocationRepository', () => {
  return {
    LocationRepository: jest.fn().mockImplementation(() => ({
      getNearbyLocations: mockGetNearbyLocations,
      getLocationById: mockGetLocationById
    }))
  };
});

// Import routes after mocking
import locationRoutes from '../../routes/locations';

const app = express();
app.use(express.json());
app.use('/api/locations', locationRoutes);

describe('Location Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/locations/nearby', () => {
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

    it('should return nearby locations successfully', async () => {
      mockGetNearbyLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(response.status).toBe(200);
      expect(response.body.userLocation).toEqual({ lat: 40.7128, lng: -74.0060 });
      expect(response.body.searchRadius).toBe(5000);
      expect(response.body.totalFound).toBe(2);
      expect(response.body.locations).toHaveLength(2);
      
      // Check first location structure (dates are serialized as strings in JSON)
      expect(response.body.locations[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(response.body.locations[0].name).toBe('Subway Downtown');
      expect(response.body.locations[0].lettuceScore).toBe(4.2);
      expect(response.body.locations[0].lastRated).toBe('2024-01-15T10:30:00.000Z');

      expect(mockGetNearbyLocations).toHaveBeenCalledWith(
        { lat: 40.7128, lng: -74.0060 },
        5000
      );
    });

    it('should handle custom radius and limit parameters', async () => {
      mockGetNearbyLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060, radius: 2000, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.locations).toHaveLength(1);
      expect(response.body.searchRadius).toBe(2000);

      expect(mockGetNearbyLocations).toHaveBeenCalledWith(
        { lat: 40.7128, lng: -74.0060 },
        2000
      );
    });

    it('should return 400 for missing lat parameter', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lng: -74.0060 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.message).toBe('Both lat and lng parameters are required');
    });

    it('should return 400 for missing lng parameter', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.message).toBe('Both lat and lng parameters are required');
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 91, lng: -74.0060 }); // Invalid latitude > 90

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid coordinates');
    });

    it('should return 400 for invalid radius', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060, radius: 50 }); // Too small

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid radius');
      expect(response.body.message).toBe('Radius must be between 100 and 50000 meters');
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060, limit: 0 }); // Too small

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid limit');
      expect(response.body.message).toBe('Limit must be between 1 and 100');
    });

    it('should handle repository errors', async () => {
      mockGetNearbyLocations.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Failed to fetch nearby locations');
    });

    it('should parse string coordinates correctly', async () => {
      mockGetNearbyLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: '40.7128', lng: '-74.0060' });

      expect(response.status).toBe(200);
      expect(mockGetNearbyLocations).toHaveBeenCalledWith(
        { lat: 40.7128, lng: -74.0060 },
        5000
      );
    });
  });

  describe('GET /api/locations/:id', () => {
    const mockLocationDetail: SubwayLocationDetail = {
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
      ratings: [
        {
          id: '321e4567-e89b-12d3-a456-426614174002',
          locationId: '123e4567-e89b-12d3-a456-426614174000',
          score: 5,
          timestamp: new Date('2024-01-15T10:30:00Z')
        },
        {
          id: '421e4567-e89b-12d3-a456-426614174003',
          locationId: '123e4567-e89b-12d3-a456-426614174000',
          score: 4,
          timestamp: new Date('2024-01-15T09:15:00Z')
        }
      ],
      timeRecommendations: [
        {
          period: 'morning',
          averageScore: 4.5,
          confidence: 'high',
          sampleSize: 15,
          timeRange: '6:00 AM - 11:00 AM'
        },
        {
          period: 'lunch',
          averageScore: 4.0,
          confidence: 'medium',
          sampleSize: 8,
          timeRange: '11:00 AM - 3:00 PM'
        }
      ],
      totalRatings: 2,
      averageScore: 4.5
    };

    it('should return location details successfully', async () => {
      mockGetLocationById.mockResolvedValue(mockLocationDetail);

      const response = await request(app)
        .get('/api/locations/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      
      // Check main properties (dates are serialized as strings in JSON)
      expect(response.body.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(response.body.name).toBe('Subway Downtown');
      expect(response.body.lettuceScore).toBe(4.2);
      expect(response.body.lastRated).toBe('2024-01-15T10:30:00.000Z');
      expect(response.body.totalRatings).toBe(2);
      expect(response.body.averageScore).toBe(4.5);
      
      // Check ratings array
      expect(response.body.ratings).toHaveLength(2);
      expect(response.body.ratings[0].score).toBe(5);
      expect(response.body.ratings[0].timestamp).toBe('2024-01-15T10:30:00.000Z');
      
      // Check time recommendations
      expect(response.body.timeRecommendations).toHaveLength(2);
      expect(response.body.timeRecommendations[0].period).toBe('morning');
      expect(response.body.timeRecommendations[0].averageScore).toBe(4.5);
      
      expect(mockGetLocationById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should return 404 for non-existent location', async () => {
      mockGetLocationById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/locations/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Location not found');
      expect(response.body.message).toBe('No location found with ID: 123e4567-e89b-12d3-a456-426614174000');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/locations/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid location ID');
      expect(response.body.message).toBe('Location ID must be a valid UUID');
    });

    it('should handle repository errors', async () => {
      mockGetLocationById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/locations/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Failed to fetch location details');
    });

    it('should accept valid UUID formats', async () => {
      mockGetLocationById.mockResolvedValue(mockLocationDetail);

      // Test various valid UUID formats
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'A1B2C3D4-E5F6-1234-A567-123456789ABC',
        'ffffffff-ffff-1fff-8fff-ffffffffffff'
      ];

      for (const uuid of validUUIDs) {
        const response = await request(app)
          .get(`/api/locations/${uuid}`);

        expect(response.status).not.toBe(400);
        expect(mockGetLocationById).toHaveBeenCalledWith(uuid);
      }
    });

    it('should reject invalid UUID formats', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '123e4567-e89b-12d3-g456-426614174000' // invalid character 'g'
      ];

      for (const uuid of invalidUUIDs) {
        const response = await request(app)
          .get(`/api/locations/${uuid}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid location ID');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON in query parameters', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .query({ lat: 'not-a-number', lng: -74.0060 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid coordinates');
    });

    it('should handle extreme coordinate values', async () => {
      const extremeCoordinates = [
        { lat: -91, lng: 0 },    // lat too small
        { lat: 91, lng: 0 },     // lat too large
        { lat: 0, lng: -181 },   // lng too small
        { lat: 0, lng: 181 }     // lng too large
      ];

      for (const coords of extremeCoordinates) {
        const response = await request(app)
          .get('/api/locations/nearby')
          .query(coords);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid coordinates');
      }
    });

    it('should handle boundary coordinate values', async () => {
      mockGetNearbyLocations.mockResolvedValue([]);

      const boundaryCoordinates = [
        { lat: -90, lng: -180 },  // minimum values
        { lat: 90, lng: 180 },    // maximum values
        { lat: 0, lng: 0 }        // equator/prime meridian
      ];

      for (const coords of boundaryCoordinates) {
        const response = await request(app)
          .get('/api/locations/nearby')
          .query(coords);

        expect(response.status).toBe(200);
        expect(mockGetNearbyLocations).toHaveBeenCalledWith(
          coords,
          5000
        );
      }
    });
  });
});