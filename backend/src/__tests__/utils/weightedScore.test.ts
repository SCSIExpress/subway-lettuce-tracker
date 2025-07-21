import { RatingRepository } from '../../repositories/RatingRepository';
import { Rating } from '../../types';
import { calculateWeightedScore, calculateTimeBasedWeight, calculateAdvancedWeightedScore } from '../../utils/weightedScore';

// Mock the rating repository
jest.mock('../../repositories/RatingRepository');
const MockedRatingRepository = RatingRepository as jest.MockedClass<typeof RatingRepository>;

describe('Weighted Score Calculation', () => {
  let mockRatingRepo: jest.Mocked<RatingRepository>;

  beforeEach(() => {
    mockRatingRepo = new MockedRatingRepository() as jest.Mocked<RatingRepository>;
    jest.clearAllMocks();
  });

  describe('calculateWeightedScore', () => {
    it('should return 0 for location with no ratings', async () => {
      mockRatingRepo.getRatingsByLocation.mockResolvedValue([]);

      const result = await calculateWeightedScore('location-id', mockRatingRepo);

      expect(result).toBe(0);
      expect(mockRatingRepo.getRatingsByLocation).toHaveBeenCalledWith('location-id', 10);
    });

    it('should return the score for a single rating', async () => {
      const ratings: Rating[] = [
        {
          id: '1',
          locationId: 'location-id',
          score: 4,
          timestamp: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockRatingRepo.getRatingsByLocation.mockResolvedValue(ratings);

      const result = await calculateWeightedScore('location-id', mockRatingRepo);

      expect(result).toBe(4.0);
    });

    it('should weight recent ratings more heavily', async () => {
      const ratings: Rating[] = [
        {
          id: '1',
          locationId: 'location-id',
          score: 5, // Most recent - weight 1.0
          timestamp: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: '2',
          locationId: 'location-id',
          score: 1, // Second most recent - weight 0.9
          timestamp: new Date('2024-01-15T09:00:00Z')
        }
      ];
      mockRatingRepo.getRatingsByLocation.mockResolvedValue(ratings);

      const result = await calculateWeightedScore('location-id', mockRatingRepo);

      // Expected calculation: (5 * 1.0 + 1 * 0.9) / (1.0 + 0.9) = 5.9 / 1.9 ≈ 3.1
      expect(result).toBe(3.1);
    });

    it('should handle 10 ratings with exponential decay', async () => {
      const ratings: Rating[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        locationId: 'location-id',
        score: 5, // All ratings are 5
        timestamp: new Date(`2024-01-15T${10 + i}:00:00Z`)
      }));
      mockRatingRepo.getRatingsByLocation.mockResolvedValue(ratings);

      const result = await calculateWeightedScore('location-id', mockRatingRepo);

      // Since all ratings are 5, weighted average should be 5.0
      expect(result).toBe(5.0);
    });

    it('should demonstrate exponential decay effect', async () => {
      const ratings: Rating[] = [
        { id: '1', locationId: 'location-id', score: 5, timestamp: new Date() }, // weight: 1.0
        { id: '2', locationId: 'location-id', score: 1, timestamp: new Date() }, // weight: 0.9
        { id: '3', locationId: 'location-id', score: 1, timestamp: new Date() }, // weight: 0.81
        { id: '4', locationId: 'location-id', score: 1, timestamp: new Date() }, // weight: 0.729
        { id: '5', locationId: 'location-id', score: 1, timestamp: new Date() }  // weight: 0.6561
      ];
      mockRatingRepo.getRatingsByLocation.mockResolvedValue(ratings);

      const result = await calculateWeightedScore('location-id', mockRatingRepo);

      // The most recent rating (5) should have much more influence than older ratings (1)
      expect(result).toBeGreaterThan(1.5); // Should be closer to 5 than to 1
      expect(result).toBeLessThan(5.0);
    });

    it('should round to 1 decimal place', async () => {
      const ratings: Rating[] = [
        { id: '1', locationId: 'location-id', score: 3, timestamp: new Date() },
        { id: '2', locationId: 'location-id', score: 4, timestamp: new Date() },
        { id: '3', locationId: 'location-id', score: 3, timestamp: new Date() }
      ];
      mockRatingRepo.getRatingsByLocation.mockResolvedValue(ratings);

      const result = await calculateWeightedScore('location-id', mockRatingRepo);

      // Result should be rounded to 1 decimal place
      expect(result.toString()).toMatch(/^\d+\.\d$/);
    });

    it('should handle repository errors gracefully', async () => {
      mockRatingRepo.getRatingsByLocation.mockRejectedValue(new Error('Database error'));

      const result = await calculateWeightedScore('location-id', mockRatingRepo);

      expect(result).toBe(0);
    });
  });

  describe('calculateTimeBasedWeight', () => {
    it('should return 1.0 for very recent ratings (< 1 hour)', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const recentTime = new Date('2024-01-15T11:30:00Z'); // 30 minutes ago

      const weight = calculateTimeBasedWeight(recentTime, currentTime);

      expect(weight).toBe(1.0);
    });

    it('should return 0.5 for ratings 24 hours old', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const oldTime = new Date('2024-01-14T12:00:00Z'); // 24 hours ago

      const weight = calculateTimeBasedWeight(oldTime, currentTime);

      expect(weight).toBe(0.5);
    });

    it('should return 0.25 for ratings 48 hours old', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const oldTime = new Date('2024-01-13T12:00:00Z'); // 48 hours ago

      const weight = calculateTimeBasedWeight(oldTime, currentTime);

      expect(weight).toBe(0.25);
    });

    it('should handle very old ratings', () => {
      const currentTime = new Date('2024-01-15T12:00:00Z');
      const veryOldTime = new Date('2024-01-01T12:00:00Z'); // 14 days ago

      const weight = calculateTimeBasedWeight(veryOldTime, currentTime);

      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThan(0.01); // Very small weight
    });
  });

  describe('calculateAdvancedWeightedScore', () => {
    it('should combine recency and time-based weights', async () => {
      const ratings: Rating[] = [
        {
          id: '1',
          locationId: 'location-id',
          score: 5,
          timestamp: new Date('2024-01-15T11:30:00Z') // 30 minutes ago - recent
        },
        {
          id: '2',
          locationId: 'location-id',
          score: 1,
          timestamp: new Date('2024-01-14T12:00:00Z') // 24 hours ago - older
        }
      ];
      mockRatingRepo.getRatingsByLocation.mockResolvedValue(ratings);

      const result = await calculateAdvancedWeightedScore('location-id', mockRatingRepo);

      // Recent high rating should dominate over older low rating
      expect(result).toBeGreaterThan(3.5);
    });

    it('should return 0 for location with no ratings', async () => {
      mockRatingRepo.getRatingsByLocation.mockResolvedValue([]);

      const result = await calculateAdvancedWeightedScore('location-id', mockRatingRepo);

      expect(result).toBe(0);
    });
  });
});