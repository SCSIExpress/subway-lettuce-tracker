// Repository exports for easy importing
export { LocationRepository } from './LocationRepository';
export { RatingRepository } from './RatingRepository';

// Import classes for singleton creation
import { LocationRepository } from './LocationRepository';
import { RatingRepository } from './RatingRepository';

// Create singleton instances for use throughout the application
export const locationRepository = new LocationRepository();
export const ratingRepository = new RatingRepository();