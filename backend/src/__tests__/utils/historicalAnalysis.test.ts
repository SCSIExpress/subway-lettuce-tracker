import {
  categorizeTimeByPeriod,
  calculateConfidence,
  groupRatingsByTimePeriod,
  calculateAverageScore,
  generateTimeRecommendations,
  analyzeHistoricalPatterns,
  filterRatingsByDateRange,
  getOptimalTimingMessage,
  TIME_PERIODS,
  CONFIDENCE_THRESHOLDS
} from '../../utils/historicalAnalysis';
import { Rating, TimePeriod } from '../../types';

// Helper function to create test ratings
function createTestRating(score: number, hoursAgo: number, minutesOffset: number = 0): Rating {
  const timestamp = new Date();
  timestamp.setHours(timestamp.getHours() - hoursAgo);
  timestamp.setMinutes(minutesOffset);
  
  return {
    id: `rating-${Date.now()}-${Math.random()}`,
    locationId: 'test-location',
    score,
    timestamp,
    userId: 'test-user'
  };
}

// Helper function to create rating at specific hour
function createRatingAtHour(score: number, hour: number): Rating {
  const timestamp = new Date();
  timestamp.setHours(hour, 0, 0, 0);
  
  return {
    id: `rating-${Date.now()}-${Math.random()}`,
    locationId: 'test-location',
    score,
    timestamp,
    userId: 'test-user'
  };
}

describe('Historical Analysis Utils', () => {
  describe('categorizeTimeByPeriod', () => {
    it('should categorize morning hours correctly', () => {
      const morningTime = new Date();
      morningTime.setHours(8, 0, 0, 0);
      expect(categorizeTimeByPeriod(morningTime)).toBe('morning');
      
      // Test boundary cases
      morningTime.setHours(6, 0, 0, 0);
      expect(categorizeTimeByPeriod(morningTime)).toBe('morning');
      
      morningTime.setHours(10, 59, 59, 999);
      expect(categorizeTimeByPeriod(morningTime)).toBe('morning');
    });

    it('should categorize lunch hours correctly', () => {
      const lunchTime = new Date();
      lunchTime.setHours(12, 0, 0, 0);
      expect(categorizeTimeByPeriod(lunchTime)).toBe('lunch');
      
      // Test boundary cases
      lunchTime.setHours(11, 0, 0, 0);
      expect(categorizeTimeByPeriod(lunchTime)).toBe('lunch');
      
      lunchTime.setHours(14, 59, 59, 999);
      expect(categorizeTimeByPeriod(lunchTime)).toBe('lunch');
    });

    it('should categorize afternoon hours correctly', () => {
      const afternoonTime = new Date();
      afternoonTime.setHours(16, 0, 0, 0);
      expect(categorizeTimeByPeriod(afternoonTime)).toBe('afternoon');
      
      // Test boundary cases
      afternoonTime.setHours(15, 0, 0, 0);
      expect(categorizeTimeByPeriod(afternoonTime)).toBe('afternoon');
      
      afternoonTime.setHours(18, 59, 59, 999);
      expect(categorizeTimeByPeriod(afternoonTime)).toBe('afternoon');
    });

    it('should categorize evening hours correctly', () => {
      const eveningTime = new Date();
      eveningTime.setHours(20, 0, 0, 0);
      expect(categorizeTimeByPeriod(eveningTime)).toBe('evening');
      
      // Test early morning as evening
      eveningTime.setHours(2, 0, 0, 0);
      expect(categorizeTimeByPeriod(eveningTime)).toBe('evening');
      
      // Test late night as evening
      eveningTime.setHours(23, 59, 59, 999);
      expect(categorizeTimeByPeriod(eveningTime)).toBe('evening');
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for large sample sizes', () => {
      expect(calculateConfidence(25)).toBe('high');
      expect(calculateConfidence(CONFIDENCE_THRESHOLDS.high)).toBe('high');
    });

    it('should return medium confidence for moderate sample sizes', () => {
      expect(calculateConfidence(15)).toBe('medium');
      expect(calculateConfidence(CONFIDENCE_THRESHOLDS.medium)).toBe('medium');
    });

    it('should return low confidence for small sample sizes', () => {
      expect(calculateConfidence(7)).toBe('low');
      expect(calculateConfidence(CONFIDENCE_THRESHOLDS.low)).toBe('low');
      expect(calculateConfidence(2)).toBe('low');
      expect(calculateConfidence(0)).toBe('low');
    });
  });

  describe('groupRatingsByTimePeriod', () => {
    it('should group ratings by time periods correctly', () => {
      const ratings = [
        createRatingAtHour(5, 8),  // morning
        createRatingAtHour(4, 12), // lunch
        createRatingAtHour(3, 16), // afternoon
        createRatingAtHour(2, 20), // evening
        createRatingAtHour(5, 9),  // morning
        createRatingAtHour(4, 13), // lunch
      ];

      const grouped = groupRatingsByTimePeriod(ratings);

      expect(grouped.get('morning')).toHaveLength(2);
      expect(grouped.get('lunch')).toHaveLength(2);
      expect(grouped.get('afternoon')).toHaveLength(1);
      expect(grouped.get('evening')).toHaveLength(1);
    });

    it('should initialize all periods even with empty ratings', () => {
      const grouped = groupRatingsByTimePeriod([]);

      expect(grouped.has('morning')).toBe(true);
      expect(grouped.has('lunch')).toBe(true);
      expect(grouped.has('afternoon')).toBe(true);
      expect(grouped.has('evening')).toBe(true);
      
      expect(grouped.get('morning')).toHaveLength(0);
      expect(grouped.get('lunch')).toHaveLength(0);
      expect(grouped.get('afternoon')).toHaveLength(0);
      expect(grouped.get('evening')).toHaveLength(0);
    });
  });

  describe('calculateAverageScore', () => {
    it('should calculate average score correctly', () => {
      const ratings = [
        createTestRating(5, 1),
        createTestRating(4, 2),
        createTestRating(3, 3),
      ];

      expect(calculateAverageScore(ratings)).toBe(4);
    });

    it('should handle decimal averages correctly', () => {
      const ratings = [
        createTestRating(5, 1),
        createTestRating(4, 2),
      ];

      expect(calculateAverageScore(ratings)).toBe(4.5);
    });

    it('should return 0 for empty ratings array', () => {
      expect(calculateAverageScore([])).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const ratings = [
        createTestRating(5, 1),
        createTestRating(4, 2),
        createTestRating(4, 3),
      ];

      expect(calculateAverageScore(ratings)).toBe(4.33);
    });
  });

  describe('generateTimeRecommendations', () => {
    it('should generate recommendations sorted by average score', () => {
      const groupedRatings = new Map();
      groupedRatings.set('morning', [createTestRating(5, 1), createTestRating(4, 2)]);
      groupedRatings.set('lunch', [createTestRating(3, 3), createTestRating(2, 4)]);
      groupedRatings.set('afternoon', [createTestRating(4, 5)]);
      groupedRatings.set('evening', []);

      const recommendations = generateTimeRecommendations(groupedRatings);

      expect(recommendations).toHaveLength(3); // evening excluded due to no data
      expect(recommendations[0]?.period).toBe('morning');
      expect(recommendations[0]?.averageScore).toBe(4.5);
      expect(recommendations[1]?.period).toBe('afternoon');
      expect(recommendations[1]?.averageScore).toBe(4);
      expect(recommendations[2]?.period).toBe('lunch');
      expect(recommendations[2]?.averageScore).toBe(2.5);
    });

    it('should include correct confidence levels and sample sizes', () => {
      const groupedRatings = new Map();
      // High confidence (20+ ratings)
      const highConfidenceRatings = Array(25).fill(null).map(() => createTestRating(4, 1));
      groupedRatings.set('morning', highConfidenceRatings);
      
      // Medium confidence (10-19 ratings)
      const mediumConfidenceRatings = Array(15).fill(null).map(() => createTestRating(3, 2));
      groupedRatings.set('lunch', mediumConfidenceRatings);
      
      // Low confidence (5-9 ratings)
      const lowConfidenceRatings = Array(7).fill(null).map(() => createTestRating(2, 3));
      groupedRatings.set('afternoon', lowConfidenceRatings);

      const recommendations = generateTimeRecommendations(groupedRatings);

      const morningRec = recommendations.find(r => r.period === 'morning');
      const lunchRec = recommendations.find(r => r.period === 'lunch');
      const afternoonRec = recommendations.find(r => r.period === 'afternoon');

      expect(morningRec?.confidence).toBe('high');
      expect(morningRec?.sampleSize).toBe(25);
      
      expect(lunchRec?.confidence).toBe('medium');
      expect(lunchRec?.sampleSize).toBe(15);
      
      expect(afternoonRec?.confidence).toBe('low');
      expect(afternoonRec?.sampleSize).toBe(7);
    });

    it('should include time range labels', () => {
      const groupedRatings = new Map();
      groupedRatings.set('morning', [createTestRating(4, 1)]);

      const recommendations = generateTimeRecommendations(groupedRatings);

      expect(recommendations[0]?.timeRange).toBe(TIME_PERIODS.morning.label);
    });
  });

  describe('analyzeHistoricalPatterns', () => {
    it('should analyze patterns and identify best/worst periods', () => {
      const ratings = [
        // Morning: high scores, high confidence
        ...Array(25).fill(null).map(() => createRatingAtHour(5, 8)),
        // Lunch: medium scores, medium confidence
        ...Array(15).fill(null).map(() => createRatingAtHour(3, 12)),
        // Afternoon: low scores, low confidence
        ...Array(7).fill(null).map(() => createRatingAtHour(2, 16)),
      ];

      const analysis = analyzeHistoricalPatterns(ratings);

      expect(analysis.bestPeriod).toBe('morning');
      expect(analysis.worstPeriod).toBe('afternoon');
      expect(analysis.totalAnalyzedRatings).toBe(47);
      expect(analysis.hasReliableData).toBe(true);
      expect(analysis.timeRecommendations).toHaveLength(3);
    });

    it('should handle insufficient data gracefully', () => {
      const ratings = [
        createRatingAtHour(3, 8), // Only 1 rating
      ];

      const analysis = analyzeHistoricalPatterns(ratings);

      expect(analysis.bestPeriod).toBeUndefined();
      expect(analysis.worstPeriod).toBeUndefined();
      expect(analysis.hasReliableData).toBe(false);
      expect(analysis.totalAnalyzedRatings).toBe(1);
    });

    it('should handle empty ratings array', () => {
      const analysis = analyzeHistoricalPatterns([]);

      expect(analysis.bestPeriod).toBeUndefined();
      expect(analysis.worstPeriod).toBeUndefined();
      expect(analysis.hasReliableData).toBe(false);
      expect(analysis.totalAnalyzedRatings).toBe(0);
      expect(analysis.timeRecommendations).toHaveLength(0);
    });
  });

  describe('filterRatingsByDateRange', () => {
    it('should filter ratings within date range', () => {
      const now = new Date();
      const ratings = [
        createTestRating(5, 1),   // 1 hour ago - should be included
        createTestRating(4, 24),  // 1 day ago - should be included
        createTestRating(3, 24 * 15), // 15 days ago - should be included
        createTestRating(2, 24 * 35), // 35 days ago - should be excluded
      ];

      const filtered = filterRatingsByDateRange(ratings, 30);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(r => r.score)).toEqual([5, 4, 3]);
    });

    it('should use default 30 days if no range specified', () => {
      const ratings = [
        createTestRating(5, 24 * 25), // 25 days ago
        createTestRating(4, 24 * 35), // 35 days ago
      ];

      const filtered = filterRatingsByDateRange(ratings);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.score).toBe(5);
    });
  });

  describe('getOptimalTimingMessage', () => {
    it('should return appropriate message for reliable data', () => {
      const analysis = {
        timeRecommendations: [{
          period: 'morning' as TimePeriod,
          averageScore: 4.5,
          confidence: 'high' as const,
          sampleSize: 25,
          timeRange: '6:00 AM - 11:00 AM'
        }],
        bestPeriod: 'morning' as TimePeriod,
        worstPeriod: 'afternoon' as TimePeriod,
        totalAnalyzedRatings: 25,
        hasReliableData: true
      };

      const message = getOptimalTimingMessage(analysis);

      expect(message).toContain('Best time: morning');
      expect(message).toContain('6:00 AM - 11:00 AM');
      expect(message).toContain('Avg: 4.5/5');
    });

    it('should return insufficient data message when no reliable data', () => {
      const analysis = {
        timeRecommendations: [],
        bestPeriod: undefined as TimePeriod | undefined,
        worstPeriod: undefined as TimePeriod | undefined,
        totalAnalyzedRatings: 2,
        hasReliableData: false
      };

      const message = getOptimalTimingMessage(analysis);

      expect(message).toBe("Not enough data for time recommendations");
    });

    it('should return fallback message when data exists but no best period', () => {
      const analysis = {
        timeRecommendations: [{
          period: 'morning' as TimePeriod,
          averageScore: 3,
          confidence: 'low' as const,
          sampleSize: 3,
          timeRange: '6:00 AM - 11:00 AM'
        }],
        bestPeriod: undefined as TimePeriod | undefined,
        worstPeriod: undefined as TimePeriod | undefined,
        totalAnalyzedRatings: 3,
        hasReliableData: true
      };

      const message = getOptimalTimingMessage(analysis);

      expect(message).toBe("Unable to determine optimal timing");
    });
  });

  describe('Integration Tests', () => {
    it('should perform complete historical analysis workflow', () => {
      // Create realistic test data
      const ratings = [
        // Morning ratings (generally high)
        ...Array(20).fill(null).map((_, i) => createRatingAtHour(4 + (i % 2), 8)),
        // Lunch ratings (mixed)
        ...Array(15).fill(null).map((_, i) => createRatingAtHour(3 + (i % 3), 12)),
        // Afternoon ratings (generally lower)
        ...Array(10).fill(null).map((_, i) => createRatingAtHour(2 + (i % 2), 16)),
        // Evening ratings (few data points)
        ...Array(3).fill(null).map(() => createRatingAtHour(3, 20)),
      ];

      // Filter to recent ratings
      const recentRatings = filterRatingsByDateRange(ratings, 30);
      
      // Perform analysis
      const analysis = analyzeHistoricalPatterns(recentRatings);
      
      // Generate message
      const message = getOptimalTimingMessage(analysis);

      // Verify results
      expect(analysis.hasReliableData).toBe(true);
      expect(analysis.timeRecommendations.length).toBeGreaterThan(0);
      expect(analysis.bestPeriod).toBeDefined();
      expect(message).not.toBe("Not enough data for time recommendations");
      
      // Morning should likely be the best period due to higher scores
      expect(analysis.bestPeriod).toBe('morning');
    });
  });
});