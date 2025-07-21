import { RatingRepository } from '../repositories/RatingRepository';
import { Rating } from '../types';

/**
 * Calculate weighted score for a location using last 10 ratings
 * More recent ratings have higher weight using exponential decay
 */
export async function calculateWeightedScore(locationId: string, ratingRepository?: RatingRepository): Promise<number> {
  try {
    const repo = ratingRepository || new RatingRepository();
    
    // Get last 10 ratings for the location
    const ratings = await repo.getRatingsByLocation(locationId, 10);
    
    if (ratings.length === 0) {
      return 0;
    }

    // Calculate weighted average with exponential decay
    // Most recent rating gets weight 1.0, each older rating gets weight * 0.9
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    ratings.forEach((rating, index) => {
      const weight = Math.pow(0.9, index); // Exponential decay
      totalWeightedScore += rating.score * weight;
      totalWeight += weight;
    });

    const weightedScore = totalWeightedScore / totalWeight;
    
    // Round to 1 decimal place
    return Math.round(weightedScore * 10) / 10;
  } catch (error) {
    console.error('Error calculating weighted score:', error);
    return 0;
  }
}

/**
 * Calculate time-based weight for a rating based on how recent it is
 * More recent ratings get higher weight
 */
export function calculateTimeBasedWeight(ratingTimestamp: Date, currentTime: Date = new Date()): number {
  const hoursDiff = (currentTime.getTime() - ratingTimestamp.getTime()) / (1000 * 60 * 60);
  
  // Weight decreases exponentially with time
  // Recent ratings (< 1 hour) get full weight
  // Weight halves every 24 hours
  if (hoursDiff <= 1) {
    return 1.0;
  }
  
  return Math.pow(0.5, hoursDiff / 24);
}

/**
 * Calculate weighted score with both recency and time-based weights
 */
export async function calculateAdvancedWeightedScore(locationId: string, ratingRepository?: RatingRepository): Promise<number> {
  try {
    const repo = ratingRepository || new RatingRepository();
    const ratings = await repo.getRatingsByLocation(locationId, 10);
    
    if (ratings.length === 0) {
      return 0;
    }

    const currentTime = new Date();
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    ratings.forEach((rating, index) => {
      // Combine recency weight (position in list) with time-based weight
      const recencyWeight = Math.pow(0.9, index);
      const timeWeight = calculateTimeBasedWeight(rating.timestamp, currentTime);
      const combinedWeight = recencyWeight * timeWeight;
      
      totalWeightedScore += rating.score * combinedWeight;
      totalWeight += combinedWeight;
    });

    const weightedScore = totalWeightedScore / totalWeight;
    
    // Round to 1 decimal place
    return Math.round(weightedScore * 10) / 10;
  } catch (error) {
    console.error('Error calculating advanced weighted score:', error);
    return 0;
  }
}