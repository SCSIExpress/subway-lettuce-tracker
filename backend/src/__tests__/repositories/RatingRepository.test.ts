import { RatingRepository } from '../../repositories/RatingRepository';
import pool from '../../database/connection';

// Mock the database connection
jest.mock('../../database/connection', () => ({
  query: jest.fn(),
}));

// Mock the historical analysis utils
jest.mock('../../utils/historicalAnalysis', () => ({
  analyzeHistoricalPatterns: jest.fn(),
  filterRatingsByDateRange: jest.fn(),
  getOptimalTimingMessage: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;
const mockHistoricalAnalysis = require('../../utils/historicalAnalysis');

describe('RatingRepository', () => {
  let ratingRepository: RatingRepository;

  beforeEach(() => {
    ratingRepository = new RatingRepository();
    jest.clearAllMocks();
  });

  describe('createRating', () => {
    it('should create a rating with valid score', async () => {
      const newRatingId = 'rating-123';
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: newRatingId }] 
      } as any);

      const result = await ratingRepository.createRating(
        'location-123',
        4,
        'user-123'
      );

      expect(result).toBe(newRatingId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ratings'),
        ['location-123', 4, 'user-123']
      );
    });

    it('should reject invalid rating scores', async () => {
      await expect(
        ratingRepository.createRating('location-123', 0)
      ).rejects.toThrow('Rating score must be between 1 and 5');

      await expect(
        ratingRepository.createRating('location-123', 6)
      ).rejects.toThrow('Rating score must be between 1 and 5');
    });

    it('should handle null user ID', async () => {
      const newRatingId = 'rating-124';
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: newRatingId }] 
      } as any);

      const result = await ratingRepository.createRating('location-123', 3);

      expect(result).toBe(newRatingId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ratings'),
        ['location-123', 3, null]
      );
    });
  });

  describe('getRatingsByLocation', () => {
    it('should return ratings for a location', async () => {
      const mockRatings = [
        {
          id: 'rating-1',
          location_id: 'location-123',
          score: 5,
          timestamp: new Date('2023-01-01'),
          user_id: 'user-1'
        },
        {
          id: 'rating-2',
          location_id: 'location-123',
          score: 4,
          timestamp: new Date('2023-01-02'),
          user_id: null
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRatings } as any);

      const result = await ratingRepository.getRatingsByLocation('location-123', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'rating-1',
        locationId: 'location-123',
        score: 5,
        timestamp: new Date('2023-01-01'),
        userId: 'user-1'
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, location_id, score, timestamp, user_id'),
        ['location-123', 10]
      );
    });
  });

  describe('getRatingStats', () => {
    it('should return comprehensive rating statistics', async () => {
      const mockStats = {
        average_score: '4.2',
        total_ratings: '25',
        recent_ratings: '3'
      };

      const mockDistribution = [
        { score: 1, count: '1' },
        { score: 2, count: '2' },
        { score: 3, count: '5' },
        { score: 4, count: '10' },
        { score: 5, count: '7' }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockStats] } as any)
        .mockResolvedValueOnce({ rows: mockDistribution } as any);

      const result = await ratingRepository.getRatingStats('location-123');

      expect(result).toEqual({
        averageScore: 4.2,
        totalRatings: 25,
        recentRatings: 3,
        scoreDistribution: [
          { score: 1, count: 1 },
          { score: 2, count: 2 },
          { score: 3, count: 5 },
          { score: 4, count: 10 },
          { score: 5, count: 7 }
        ]
      });
    });
  });

  describe('getWeightedScore', () => {
    it('should return weighted score from database function', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ weighted_score: '4.35' }] 
      } as any);

      const result = await ratingRepository.getWeightedScore('location-123');

      expect(result).toBe(4.35);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT calculate_lettuce_score($1) as weighted_score',
        ['location-123']
      );
    });

    it('should return 0 for locations with no ratings', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ weighted_score: null }] 
      } as any);

      const result = await ratingRepository.getWeightedScore('location-123');

      expect(result).toBe(0);
    });
  });

  describe('isRecentlyRated', () => {
    it('should return true for recently rated locations', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ recently_rated: true }] 
      } as any);

      const result = await ratingRepository.isRecentlyRated('location-123');

      expect(result).toBe(true);
    });

    it('should return false for locations not recently rated', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ recently_rated: false }] 
      } as any);

      const result = await ratingRepository.isRecentlyRated('location-123');

      expect(result).toBe(false);
    });
  });

  describe('getTimeBasedAnalysis', () => {
    it('should return time-based rating analysis using historical analysis system', async () => {
      const mockRatings = [
        {
          id: 'rating-1',
          location_id: 'location-123',
          score: 5,
          timestamp: new Date('2023-01-01T08:00:00'),
          user_id: 'user-1'
        },
        {
          id: 'rating-2',
          location_id: 'location-123',
          score: 4,
          timestamp: new Date('2023-01-01T12:00:00'),
          user_id: 'user-2'
        }
      ];

      const mockTimeRecommendations = [
        {
          period: 'morning',
          averageScore: 4.5,
          confidence: 'high',
          sampleSize: 15,
          timeRange: '6:00 AM - 11:00 AM'
        },
        {
          period: 'lunch',
          averageScore: 3.8,
          confidence: 'medium',
          sampleSize: 8,
          timeRange: '11:00 AM - 3:00 PM'
        }
      ];

      // Mock database query for ratings
      mockPool.query.mockResolvedValueOnce({ rows: mockRatings } as any);

      // Mock historical analysis functions
      mockHistoricalAnalysis.filterRatingsByDateRange.mockReturnValue(mockRatings);
      mockHistoricalAnalysis.analyzeHistoricalPatterns.mockReturnValue({
        timeRecommendations: mockTimeRecommendations,
        bestPeriod: 'morning',
        worstPeriod: 'lunch',
        totalAnalyzedRatings: 23,
        hasReliableData: true
      });

      const result = await ratingRepository.getTimeBasedAnalysis('location-123', 30);

      expect(result).toEqual(mockTimeRecommendations);
      expect(mockHistoricalAnalysis.filterRatingsByDateRange).toHaveBeenCalledWith(mockRatings, 30);
      expect(mockHistoricalAnalysis.analyzeHistoricalPatterns).toHaveBeenCalledWith(mockRatings);
    });

    it('should handle errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        ratingRepository.getTimeBasedAnalysis('location-123')
      ).rejects.toThrow('Failed to fetch time-based analysis');
    });
  });

  describe('getHistoricalAnalysis', () => {
    it('should return comprehensive historical analysis', async () => {
      const mockRatings = [
        {
          id: 'rating-1',
          location_id: 'location-123',
          score: 5,
          timestamp: new Date('2023-01-01T08:00:00'),
          user_id: 'user-1'
        },
        {
          id: 'rating-2',
          location_id: 'location-123',
          score: 4,
          timestamp: new Date('2023-01-01T12:00:00'),
          user_id: 'user-2'
        }
      ];

      const mockAnalysisResult = {
        timeRecommendations: [
          {
            period: 'morning',
            averageScore: 4.5,
            confidence: 'high',
            sampleSize: 15,
            timeRange: '6:00 AM - 11:00 AM'
          }
        ],
        bestPeriod: 'morning',
        worstPeriod: 'afternoon',
        totalAnalyzedRatings: 23,
        hasReliableData: true
      };

      const mockOptimalMessage = 'Best time: morning (6:00 AM - 11:00 AM) - Avg: 4.5/5';

      // Mock database query for ratings
      mockPool.query.mockResolvedValueOnce({ rows: mockRatings } as any);

      // Mock historical analysis functions
      mockHistoricalAnalysis.filterRatingsByDateRange.mockReturnValue(mockRatings);
      mockHistoricalAnalysis.analyzeHistoricalPatterns.mockReturnValue(mockAnalysisResult);
      mockHistoricalAnalysis.getOptimalTimingMessage.mockReturnValue(mockOptimalMessage);

      const result = await ratingRepository.getHistoricalAnalysis('location-123', 30);

      expect(result).toEqual({
        timeRecommendations: mockAnalysisResult.timeRecommendations,
        bestPeriod: mockAnalysisResult.bestPeriod,
        worstPeriod: mockAnalysisResult.worstPeriod,
        totalAnalyzedRatings: mockAnalysisResult.totalAnalyzedRatings,
        hasReliableData: mockAnalysisResult.hasReliableData,
        optimalTimingMessage: mockOptimalMessage
      });

      expect(mockHistoricalAnalysis.filterRatingsByDateRange).toHaveBeenCalledWith(mockRatings, 30);
      expect(mockHistoricalAnalysis.analyzeHistoricalPatterns).toHaveBeenCalledWith(mockRatings);
      expect(mockHistoricalAnalysis.getOptimalTimingMessage).toHaveBeenCalledWith(mockAnalysisResult);
    });

    it('should handle insufficient data gracefully', async () => {
      const mockRatings = [
        {
          id: 'rating-1',
          location_id: 'location-123',
          score: 3,
          timestamp: new Date('2023-01-01T08:00:00'),
          user_id: 'user-1'
        }
      ];

      const mockAnalysisResult = {
        timeRecommendations: [],
        bestPeriod: undefined,
        worstPeriod: undefined,
        totalAnalyzedRatings: 1,
        hasReliableData: false
      };

      const mockOptimalMessage = 'Not enough data for time recommendations';

      // Mock database query for ratings
      mockPool.query.mockResolvedValueOnce({ rows: mockRatings } as any);

      // Mock historical analysis functions
      mockHistoricalAnalysis.filterRatingsByDateRange.mockReturnValue(mockRatings);
      mockHistoricalAnalysis.analyzeHistoricalPatterns.mockReturnValue(mockAnalysisResult);
      mockHistoricalAnalysis.getOptimalTimingMessage.mockReturnValue(mockOptimalMessage);

      const result = await ratingRepository.getHistoricalAnalysis('location-123');

      expect(result.hasReliableData).toBe(false);
      expect(result.optimalTimingMessage).toBe('Not enough data for time recommendations');
      expect(result.timeRecommendations).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        ratingRepository.getHistoricalAnalysis('location-123')
      ).rejects.toThrow('Failed to fetch historical analysis');
    });
  });
});