import express from 'express';
import { LocationRepository } from '../repositories/LocationRepository';
import { RatingRepository } from '../repositories/RatingRepository';
import { validateCoordinates, validateLocationId } from '../utils/validation';
import { calculateWeightedScore } from '../utils/weightedScore';
import { NearbyLocationsRequest, NearbyLocationsResponse, ApiError, SubmitRatingRequest, SubmitRatingResponse } from '../types';

const router = express.Router();
const locationRepository = new LocationRepository();
const ratingRepository = new RatingRepository();

/**
 * GET /api/locations/nearby
 * Get nearby Subway locations based on user coordinates
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000, limit = 20 } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      const error: ApiError = {
        error: 'Missing required parameters',
        message: 'Both lat and lng parameters are required'
      };
      return res.status(400).json(error);
    }

    // Parse and validate coordinates
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = parseInt(radius as string);
    const maxResults = parseInt(limit as string);

    if (!validateCoordinates({ lat: latitude, lng: longitude })) {
      const error: ApiError = {
        error: 'Invalid coordinates',
        message: 'Latitude must be between -90 and 90, longitude must be between -180 and 180'
      };
      return res.status(400).json(error);
    }

    if (searchRadius < 100 || searchRadius > 50000) {
      const error: ApiError = {
        error: 'Invalid radius',
        message: 'Radius must be between 100 and 50000 meters'
      };
      return res.status(400).json(error);
    }

    if (maxResults < 1 || maxResults > 100) {
      const error: ApiError = {
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 100'
      };
      return res.status(400).json(error);
    }

    // Fetch nearby locations
    const locations = await locationRepository.getNearbyLocations(
      { lat: latitude, lng: longitude },
      searchRadius
    );

    // Limit results
    const limitedLocations = locations.slice(0, maxResults);

    const response: NearbyLocationsResponse = {
      locations: limitedLocations,
      userLocation: { lat: latitude, lng: longitude },
      searchRadius,
      totalFound: locations.length
    };

    return res.json(response);
  } catch (error) {
    console.error('Error in GET /api/locations/nearby:', error);
    const apiError: ApiError = {
      error: 'Internal server error',
      message: 'Failed to fetch nearby locations'
    };
    return res.status(500).json(apiError);
  }
});

/**
 * GET /api/locations/:id
 * Get detailed information for a specific location
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate location ID format
    if (!validateLocationId(id)) {
      const error: ApiError = {
        error: 'Invalid location ID',
        message: 'Location ID must be a valid UUID'
      };
      return res.status(400).json(error);
    }

    // Fetch location details
    const location = await locationRepository.getLocationById(id);

    if (!location) {
      const error: ApiError = {
        error: 'Location not found',
        message: `No location found with ID: ${id}`
      };
      return res.status(404).json(error);
    }

    return res.json(location);
  } catch (error) {
    console.error('Error in GET /api/locations/:id:', error);
    const apiError: ApiError = {
      error: 'Internal server error',
      message: 'Failed to fetch location details'
    };
    return res.status(500).json(apiError);
  }
});

/**
 * POST /api/locations/:id/ratings
 * Submit a new rating for a location
 */
router.post('/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, userId }: { score: number; userId?: string } = req.body;

    // Validate location ID format
    if (!validateLocationId(id)) {
      const error: ApiError = {
        error: 'Invalid location ID',
        message: 'Location ID must be a valid UUID'
      };
      return res.status(400).json(error);
    }

    // Validate rating score
    if (!score || typeof score !== 'number' || score < 1 || score > 5) {
      const error: ApiError = {
        error: 'Invalid rating score',
        message: 'Rating score must be a number between 1 and 5'
      };
      return res.status(400).json(error);
    }

    // Check if location exists
    const location = await locationRepository.getLocationById(id);
    if (!location) {
      const error: ApiError = {
        error: 'Location not found',
        message: `No location found with ID: ${id}`
      };
      return res.status(404).json(error);
    }

    // Create the rating
    const ratingId = await ratingRepository.createRating(id, score, userId);

    // Get the newly created rating
    const ratings = await ratingRepository.getRatingsByLocation(id, 1);
    if (ratings.length === 0) {
      throw new Error('Failed to retrieve newly created rating');
    }
    const newRating = ratings[0]!;

    // Calculate new weighted score
    const newLocationScore = await calculateWeightedScore(id);

    const response: SubmitRatingResponse = {
      rating: newRating,
      newLocationScore,
      message: 'Rating submitted successfully'
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /api/locations/:id/ratings:', error);
    const apiError: ApiError = {
      error: 'Internal server error',
      message: 'Failed to submit rating'
    };
    return res.status(500).json(apiError);
  }
});

/**
 * GET /api/locations/:id/ratings/summary
 * Get rating summary and analysis for a location
 */
router.get('/:id/ratings/summary', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate location ID format
    if (!validateLocationId(id)) {
      const error: ApiError = {
        error: 'Invalid location ID',
        message: 'Location ID must be a valid UUID'
      };
      return res.status(400).json(error);
    }

    // Check if location exists
    const location = await locationRepository.getLocationById(id);
    if (!location) {
      const error: ApiError = {
        error: 'Location not found',
        message: `No location found with ID: ${id}`
      };
      return res.status(404).json(error);
    }

    // Get rating statistics
    const stats = await ratingRepository.getRatingStats(id);
    
    // Get weighted score
    const currentScore = await calculateWeightedScore(id);
    
    // Get time-based analysis
    const optimalTimes = await ratingRepository.getTimeBasedAnalysis(id);
    
    // Get last rating timestamp
    const recentRatings = await ratingRepository.getRatingsByLocation(id, 1);
    const lastRated = recentRatings.length > 0 ? recentRatings[0]?.timestamp : null;

    const response = {
      currentScore,
      totalRatings: stats.totalRatings,
      lastRated,
      optimalTimes: optimalTimes.map(time => ({
        ...time,
        timeRange: getTimeRangeForPeriod(time.period)
      })),
      recentActivity: stats.recentRatings,
      scoreDistribution: stats.scoreDistribution
    };

    return res.json(response);
  } catch (error) {
    console.error('Error in GET /api/locations/:id/ratings/summary:', error);
    const apiError: ApiError = {
      error: 'Internal server error',
      message: 'Failed to fetch rating summary'
    };
    return res.status(500).json(apiError);
  }
});



/**
 * Get time range string for a given period
 */
function getTimeRangeForPeriod(period: 'morning' | 'lunch' | 'afternoon' | 'evening'): string {
  switch (period) {
    case 'morning':
      return '6:00 AM - 11:00 AM';
    case 'lunch':
      return '11:00 AM - 3:00 PM';
    case 'afternoon':
      return '3:00 PM - 7:00 PM';
    case 'evening':
      return '7:00 PM - 10:00 PM';
    default:
      return 'Unknown';
  }
}

export default router;