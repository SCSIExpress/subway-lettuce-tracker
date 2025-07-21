import { Rating, TimeRecommendation, TimePeriod, ConfidenceLevel } from '../types';

/**
 * Time period definitions in hours (24-hour format)
 */
export const TIME_PERIODS = {
  morning: { start: 6, end: 10, label: '6:00 AM - 11:00 AM' },
  lunch: { start: 11, end: 14, label: '11:00 AM - 3:00 PM' },
  afternoon: { start: 15, end: 18, label: '3:00 PM - 7:00 PM' },
  evening: { start: 19, end: 23, label: '7:00 PM - 12:00 AM' }
} as const;

/**
 * Confidence thresholds based on sample size
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 20,
  medium: 10,
  low: 5
} as const;

/**
 * Categorize a timestamp into a time period
 */
export function categorizeTimeByPeriod(timestamp: Date): TimePeriod {
  const hour = timestamp.getHours();
  
  if (hour >= TIME_PERIODS.morning.start && hour <= TIME_PERIODS.morning.end) {
    return 'morning';
  } else if (hour >= TIME_PERIODS.lunch.start && hour <= TIME_PERIODS.lunch.end) {
    return 'lunch';
  } else if (hour >= TIME_PERIODS.afternoon.start && hour <= TIME_PERIODS.afternoon.end) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

/**
 * Calculate confidence level based on sample size
 */
export function calculateConfidence(sampleSize: number): ConfidenceLevel {
  if (sampleSize >= CONFIDENCE_THRESHOLDS.high) {
    return 'high';
  } else if (sampleSize >= CONFIDENCE_THRESHOLDS.medium) {
    return 'medium';
  } else if (sampleSize >= CONFIDENCE_THRESHOLDS.low) {
    return 'low';
  } else {
    return 'low';
  }
}

/**
 * Group ratings by time period
 */
export function groupRatingsByTimePeriod(ratings: Rating[]): Map<TimePeriod, Rating[]> {
  const grouped = new Map<TimePeriod, Rating[]>();
  
  // Initialize all periods
  (['morning', 'lunch', 'afternoon', 'evening'] as TimePeriod[]).forEach(period => {
    grouped.set(period, []);
  });
  
  // Group ratings by time period
  ratings.forEach(rating => {
    const period = categorizeTimeByPeriod(rating.timestamp);
    const periodRatings = grouped.get(period) || [];
    periodRatings.push(rating);
    grouped.set(period, periodRatings);
  });
  
  return grouped;
}

/**
 * Calculate average score for a group of ratings
 */
export function calculateAverageScore(ratings: Rating[]): number {
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((total, rating) => total + rating.score, 0);
  return Math.round((sum / ratings.length) * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate time recommendations from grouped ratings
 */
export function generateTimeRecommendations(groupedRatings: Map<TimePeriod, Rating[]>): TimeRecommendation[] {
  const recommendations: TimeRecommendation[] = [];
  
  groupedRatings.forEach((ratings, period) => {
    const sampleSize = ratings.length;
    
    // Only include periods with at least some data
    if (sampleSize > 0) {
      const averageScore = calculateAverageScore(ratings);
      const confidence = calculateConfidence(sampleSize);
      const timeRange = TIME_PERIODS[period].label;
      
      recommendations.push({
        period,
        averageScore,
        confidence,
        sampleSize,
        timeRange
      });
    }
  });
  
  // Sort by average score (highest first)
  return recommendations.sort((a, b) => b.averageScore - a.averageScore);
}

/**
 * Analyze historical patterns for optimal timing
 */
export function analyzeHistoricalPatterns(ratings: Rating[]): {
  timeRecommendations: TimeRecommendation[];
  bestPeriod?: TimePeriod | undefined;
  worstPeriod?: TimePeriod | undefined;
  totalAnalyzedRatings: number;
  hasReliableData: boolean;
} {
  const groupedRatings = groupRatingsByTimePeriod(ratings);
  const timeRecommendations = generateTimeRecommendations(groupedRatings);
  
  // Find best and worst periods (only if we have reliable data)
  let bestPeriod: TimePeriod | undefined = undefined;
  let worstPeriod: TimePeriod | undefined = undefined;
  
  const reliableRecommendations = timeRecommendations.filter(
    rec => rec.confidence !== 'low' || rec.sampleSize >= CONFIDENCE_THRESHOLDS.low
  );
  
  if (reliableRecommendations.length > 0) {
    const firstRec = reliableRecommendations[0];
    const lastRec = reliableRecommendations[reliableRecommendations.length - 1];
    if (firstRec) {
      bestPeriod = firstRec.period;
    }
    if (lastRec) {
      worstPeriod = lastRec.period;
    }
  }
  
  const totalAnalyzedRatings = ratings.length;
  const hasReliableData = reliableRecommendations.length > 0 && 
                         reliableRecommendations.some(rec => rec.confidence === 'high' || rec.confidence === 'medium');
  
  return {
    timeRecommendations,
    bestPeriod,
    worstPeriod,
    totalAnalyzedRatings,
    hasReliableData
  };
}

/**
 * Filter ratings by date range (for historical analysis)
 */
export function filterRatingsByDateRange(
  ratings: Rating[], 
  daysBack: number = 30
): Rating[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  return ratings.filter(rating => rating.timestamp >= cutoffDate);
}

/**
 * Get optimal timing message for display
 */
export function getOptimalTimingMessage(analysis: {
  timeRecommendations: TimeRecommendation[];
  bestPeriod?: TimePeriod | undefined;
  worstPeriod?: TimePeriod | undefined;
  totalAnalyzedRatings: number;
  hasReliableData: boolean;
}): string {
  if (!analysis.hasReliableData) {
    return "Not enough data for time recommendations";
  }
  
  if (analysis.bestPeriod && analysis.timeRecommendations.length > 0) {
    const bestRec = analysis.timeRecommendations[0];
    if (bestRec) {
      const periodLabel = TIME_PERIODS[analysis.bestPeriod].label;
      return `Best time: ${analysis.bestPeriod} (${periodLabel}) - Avg: ${bestRec.averageScore}/5`;
    }
  }
  
  return "Unable to determine optimal timing";
}