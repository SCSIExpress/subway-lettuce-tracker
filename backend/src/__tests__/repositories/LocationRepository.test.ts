import { LocationRepository } from '../../repositories/LocationRepository';
import pool from '../../database/connection';

// Mock the database connection
jest.mock('../../database/connection');
const mockPool = pool as jest.Mocked<typeof pool>;

describe('LocationRepository', () => {
  let locationRepository: LocationRepository;

  beforeEach(() => {
    locationRepository = new LocationRepository();
    jest.clearAllMocks();
  });

  describe('getNearbyLocations', () => {
    it('should return nearby locations with correct format', async () => {
      const mockRows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Subway Downtown',
          address: '123 Main St',
          lat: '40.7128',
          lng: '-74.0060',
          hours: { open: '06:00', close: '22:00', isOpen: true },
          lettuce_score: '4.2',
          distance_meters: 500,
          last_rated: new Date('2023-01-01'),
          recently_rated: true
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRows } as any);

      const result = await locationRepository.getNearbyLocations(
        { lat: 40.7128, lng: -74.0060 },
        1000
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Subway Downtown',
        address: '123 Main St',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        hours: { open: '06:00', close: '22:00', isOpen: true },
        lettuceScore: 4.2,
        lastRated: new Date('2023-01-01'),
        recentlyRated: true,
        distanceFromUser: 500
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_nearby_locations'),
        [40.7128, -74.0060, 1000]
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        locationRepository.getNearbyLocations({ lat: 40.7128, lng: -74.0060 })
      ).rejects.toThrow('Failed to fetch nearby locations');
    });
  });

  describe('createLocation', () => {
    it('should create a new location and return its ID', async () => {
      const newLocationId = '123e4567-e89b-12d3-a456-426614174001';
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: newLocationId }] 
      } as any);

      const locationData = {
        name: 'New Subway',
        address: '456 Oak St',
        coordinates: { lat: 40.7589, lng: -73.9851 },
        hours: { open: '07:00', close: '21:00', isOpen: true }
      };

      const result = await locationRepository.createLocation(locationData);

      expect(result).toBe(newLocationId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO locations'),
        [
          'New Subway',
          '456 Oak St',
          -73.9851, // lng first for PostGIS
          40.7589,  // lat second
          JSON.stringify(locationData.hours)
        ]
      );
    });
  });

  describe('getLocationById', () => {
    it('should return null for non-existent location', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // location query
        .mockResolvedValueOnce({ rows: [] } as any) // ratings query
        .mockResolvedValueOnce({ rows: [] } as any); // time recommendations query

      const result = await locationRepository.getLocationById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return detailed location data when found', async () => {
      const locationRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Subway Downtown',
        address: '123 Main St',
        lat: '40.7128',
        lng: '-74.0060',
        hours: { open: '06:00', close: '22:00', isOpen: true },
        lettuce_score: '4.2',
        last_rated: new Date('2023-01-01'),
        recently_rated: true
      };

      const ratingsRows = [
        {
          id: 'rating-1',
          location_id: '123e4567-e89b-12d3-a456-426614174000',
          score: 5,
          timestamp: new Date('2023-01-01'),
          user_id: null
        }
      ];

      const timeRecommendationsRows = [
        {
          period: 'morning',
          average_score: '4.5',
          sample_size: '10',
          confidence: 'high'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [locationRow] } as any)
        .mockResolvedValueOnce({ rows: ratingsRows } as any)
        .mockResolvedValueOnce({ rows: timeRecommendationsRows } as any);

      const result = await locationRepository.getLocationById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBeDefined();
      expect(result!.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result!.ratings).toHaveLength(1);
      expect(result!.timeRecommendations).toHaveLength(1);
      expect(result!.timeRecommendations[0].period).toBe('morning');
    });
  });
});