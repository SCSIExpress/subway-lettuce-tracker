import pool from '../database/connection';
import { Rating, TimeRecommendation } from '../types';
import { 
  analyzeHistoricalPatterns, 
  filterRatingsByDateRange,
  getOptimalTimingMessage 
} from '../utils/historicalAnalysis';
import { LocationRepository } from './LocationRepository';

export class RatingRepository {

  /**
   * Submit a new rating for a location
   */
  async createRating(locationId: string, score: number, userId?: string): Promise<string> {
    // Validate score range
    if (score < 1 || score > 5) {
      throw new Error('Rating score must be between 1 and 5');
    }

    const query = `
      INSERT INTO ratings (location_id, score, user_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    try {
      const result = await pool.query(query, [locationId, score, userId || null]);
      const ratingId = result.rows[0].id;
      
      // Invalidate cache for this location after rating is created
      const locationRepository = new LocationRepository();
      await locationRepository.invalidateLocationCache(locationId);
      
      return ratingId;
    } catch (error) {
      console.error('Error creating rating:', error);
      throw new Error('Failed to create rating');
    }
  }

  /**
   * Get ratings for a specific location
   */
  async getRatingsByLocation(locationId: string, limit: number = 50): Promise<Rating[]> {
    const query = `
      SELECT id, location_id, score, timestamp, user_id
      FROM ratings
      WHERE location_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [locationId, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        locationId: row.location_id,
        score: row.score,
        timestamp: row.timestamp,
        userId: row.user_id
      }));
    } catch (error) {
      console.error('Error fetching ratings:', error);
      throw new Error('Failed to fetch ratings');
    }
  }

  /**
   * Get recent ratings across all locations
   */
  async getRecentRatings(limit: number = 100): Promise<Rating[]> {
    const query = `
      SELECT id, location_id, score, timestamp, user_id
      FROM ratings
      ORDER BY timestamp DESC
      LIMIT $1
    `;

    try {
      const result = await pool.query(query, [limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        locationId: row.location_id,
        score: row.score,
        timestamp: row.timestamp,
        userId: row.user_id
      }));
    } catch (error) {
      console.error('Error fetching recent ratings:', error);
      throw new Error('Failed to fetch recent ratings');
    }
  }

  /**
   * Get rating statistics for a location
   */
  async getRatingStats(locationId: string): Promise<{
    averageScore: number;
    totalRatings: number;
    recentRatings: number; // last 24 hours
    scoreDistribution: { score: number; count: number }[];
  }> {
    const statsQuery = `
      SELECT 
        AVG(score) as average_score,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_ratings
      FROM ratings
      WHERE location_id = $1
    `;

    const distributionQuery = `
      SELECT score, COUNT(*) as count
      FROM ratings
      WHERE location_id = $1
      GROUP BY score
      ORDER BY score
    `;

    try {
      const [statsResult, distributionResult] = await Promise.all([
        pool.query(statsQuery, [locationId]),
        pool.query(distributionQuery, [locationId])
      ]);

      const stats = statsResult.rows[0];
      
      return {
        averageScore: parseFloat(stats.average_score) || 0,
        totalRatings: parseInt(stats.total_ratings) || 0,
        recentRatings: parseInt(stats.recent_ratings) || 0,
        scoreDistribution: distributionResult.rows.map(row => ({
          score: row.score,
          count: parseInt(row.count)
        }))
      };
    } catch (error) {
      console.error('Error fetching rating stats:', error);
      throw new Error('Failed to fetch rating statistics');
    }
  }

  /**
   * Calculate weighted lettuce score for a location
   */
  async getWeightedScore(locationId: string): Promise<number> {
    const query = `SELECT calculate_lettuce_score($1) as weighted_score`;

    try {
      const result = await pool.query(query, [locationId]);
      return parseFloat(result.rows[0].weighted_score) || 0;
    } catch (error) {
      console.error('Error calculating weighted score:', error);
      throw new Error('Failed to calculate weighted score');
    }
  }

  /**
   * Check if location was recently rated (within 2 hours)
   */
  async isRecentlyRated(locationId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) > 0 as recently_rated
      FROM ratings
      WHERE location_id = $1
      AND timestamp > NOW() - INTERVAL '2 hours'
    `;

    try {
      const result = await pool.query(query, [locationId]);
      return result.rows[0].recently_rated;
    } catch (error) {
      console.error('Error checking recent ratings:', error);
      throw new Error('Failed to check recent ratings');
    }
  }

  /**
   * Get time-based rating analysis for a location using historical analysis system
   */
  async getTimeBasedAnalysis(locationId: string, daysPeriod: number = 30): Promise<TimeRecommendation[]> {
    try {
      // Get all ratings for the location
      const allRatings = await this.getRatingsByLocation(locationId, 1000); // Get more ratings for better analysis
      
      // Filter ratings by date range
      const recentRatings = filterRatingsByDateRange(allRatings, daysPeriod);
      
      // Perform historical analysis
      const analysis = analyzeHistoricalPatterns(recentRatings);
      
      return analysis.timeRecommendations;
    } catch (error) {
      console.error('Error fetching time-based analysis:', error);
      throw new Error('Failed to fetch time-based analysis');
    }
  }

  /**
   * Get comprehensive historical analysis for a location
   */
  async getHistoricalAnalysis(locationId: string, daysPeriod: number = 30): Promise<{
    timeRecommendations: TimeRecommendation[];
    bestPeriod?: string | undefined;
    worstPeriod?: string | undefined;
    totalAnalyzedRatings: number;
    hasReliableData: boolean;
    optimalTimingMessage: string;
  }> {
    try {
      // Get all ratings for the location
      const allRatings = await this.getRatingsByLocation(locationId, 1000);
      
      // Filter ratings by date range
      const recentRatings = filterRatingsByDateRange(allRatings, daysPeriod);
      
      // Perform historical analysis
      const analysis = analyzeHistoricalPatterns(recentRatings);
      
      // Generate optimal timing message
      const optimalTimingMessage = getOptimalTimingMessage(analysis);
      
      return {
        timeRecommendations: analysis.timeRecommendations,
        bestPeriod: analysis.bestPeriod,
        worstPeriod: analysis.worstPeriod,
        totalAnalyzedRatings: analysis.totalAnalyzedRatings,
        hasReliableData: analysis.hasReliableData,
        optimalTimingMessage
      };
    } catch (error) {
      console.error('Error fetching historical analysis:', error);
      throw new Error('Failed to fetch historical analysis');
    }
  }

  /**
   * Delete a rating (admin function)
   */
  async deleteRating(ratingId: string): Promise<boolean> {
    const query = `DELETE FROM ratings WHERE id = $1`;

    try {
      const result = await pool.query(query, [ratingId]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting rating:', error);
      throw new Error('Failed to delete rating');
    }
  }
}