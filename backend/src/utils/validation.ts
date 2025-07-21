import Joi from 'joi';
import { Coordinates, StoreHours } from '../types';

// Time pattern for HH:MM format (including 24:00 for midnight)
const timePattern = /^([0-1][0-9]|2[0-4]):[0-5][0-9]$/;

// Day hours schema
const dayHoursSchema = Joi.object({
  open: Joi.string().pattern(timePattern).required(),
  close: Joi.string().pattern(timePattern).required(),
  closed: Joi.boolean().optional()
});

// Store hours validation schema
export const storeHoursSchema = Joi.object({
  monday: dayHoursSchema.required(),
  tuesday: dayHoursSchema.required(),
  wednesday: dayHoursSchema.required(),
  thursday: dayHoursSchema.required(),
  friday: dayHoursSchema.required(),
  saturday: dayHoursSchema.required(),
  sunday: dayHoursSchema.required(),
  timezone: Joi.string().required()
});

// Coordinate validation schema
export const coordinatesSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

// Enhanced location validation schema
export const locationSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  address: Joi.string().min(5).max(500).required(),
  coordinates: coordinatesSchema.required(),
  hours: storeHoursSchema.required()
});

// Rating validation schema
export const ratingSchema = Joi.object({
  score: Joi.number().integer().min(1).max(5).required(),
  locationId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().optional()
});

// Nearby locations query validation
export const nearbyQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(100).max(50000).default(5000)
});

/**
 * Validate coordinates
 */
export const validateCoordinates = (coordinates: any): coordinates is Coordinates => {
  const { error } = coordinatesSchema.validate(coordinates);
  return !error;
};

/**
 * Validate rating score
 */
export const validateRatingScore = (score: any): score is number => {
  return typeof score === 'number' && score >= 1 && score <= 5 && Number.isInteger(score);
};

/**
 * Validate UUID format
 */
export const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Validate location ID (alias for validateUUID for clarity)
 */
export const validateLocationId = (id: string): boolean => {
  return validateUUID(id);
};

/**
 * Sanitize and validate location data
 */
export const validateLocationData = (data: any) => {
  const { error, value } = locationSchema.validate(data, { stripUnknown: true });
  
  if (error) {
    throw new Error(`Invalid location data: ${error.details.map(d => d.message).join(', ')}`);
  }
  
  return value;
};

/**
 * Sanitize and validate rating data
 */
export const validateRatingData = (data: any) => {
  const { error, value } = ratingSchema.validate(data, { stripUnknown: true });
  
  if (error) {
    throw new Error(`Invalid rating data: ${error.details.map(d => d.message).join(', ')}`);
  }
  
  return value;
};

/**
 * Validate nearby locations query parameters
 */
export const validateNearbyQuery = (data: any) => {
  const { error, value } = nearbyQuerySchema.validate(data);
  
  if (error) {
    throw new Error(`Invalid query parameters: ${error.details.map(d => d.message).join(', ')}`);
  }
  
  return value;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Validate store hours structure and logic
 */
export const validateStoreHours = (hours: any): hours is StoreHours => {
  const { error } = storeHoursSchema.validate(hours);
  if (error) {
    return false;
  }

  // Additional logical validation
  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of requiredDays) {
    const dayHours = hours[day];
    
    if (dayHours.closed) {
      continue; // Skip validation for closed days
    }

    // Validate time logic
    if (!isValidTimeRange(dayHours.open, dayHours.close)) {
      return false;
    }
  }

  return true;
};

/**
 * Check if a time range is valid (close time after open time)
 */
export const isValidTimeRange = (openTime: string, closeTime: string): boolean => {
  // Handle special case of 24:00 (midnight)
  if (closeTime === '24:00') {
    return true;
  }

  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  // Allow overnight hours (close time next day)
  if (closeMinutes === 0 && openMinutes > 0) {
    return true; // e.g., 22:00 - 00:00
  }

  return closeMinutes > openMinutes;
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr || '0', 10);
  const minutes = parseInt(minutesStr || '0', 10);
  return hours * 60 + minutes;
};

/**
 * Check if a store is currently open based on hours and timezone
 */
export const isStoreOpen = (hours: StoreHours, currentTime?: Date): boolean => {
  const now = currentTime || new Date();
  
  try {
    // Convert to store's timezone
    const storeTime = new Date(now.toLocaleString("en-US", { timeZone: hours.timezone }));
    const dayName = storeTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTimeStr = storeTime.toTimeString().slice(0, 5); // HH:MM format
    
    const dayHours = hours[dayName as keyof Omit<StoreHours, 'timezone'>];
    
    if (!dayHours || typeof dayHours === 'string' || dayHours.closed) {
      return false;
    }

    const currentMinutes = timeToMinutes(currentTimeStr);
    const openMinutes = timeToMinutes(dayHours.open);
    let closeMinutes = timeToMinutes(dayHours.close);

    // Handle 24:00 as end of day
    if (dayHours.close === '24:00') {
      closeMinutes = 24 * 60; // 1440 minutes
    }

    // Handle overnight hours
    if (closeMinutes <= openMinutes) {
      // Store is open overnight (e.g., 22:00 - 06:00)
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }

    // Normal hours (same day)
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

  } catch (error) {
    console.error('Error checking store hours:', error);
    return false;
  }
};

/**
 * Validate timezone string
 */
export const isValidTimezone = (timezone: string): boolean => {
  if (!timezone || timezone.length === 0) {
    return false;
  }
  
  try {
    // Test with a known date to see if timezone is valid
    new Date().toLocaleString("en-US", { timeZone: timezone });
    
    // Additional check: reject common abbreviations that might pass but aren't IANA names
    const abbreviations = ['EST', 'PST', 'CST', 'MST', 'EDT', 'PDT', 'CDT', 'MDT'];
    if (abbreviations.includes(timezone.toUpperCase())) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if coordinates are within a reasonable range for Subway locations
 * (roughly continental US bounds, can be expanded)
 */
export const isValidSubwayLocation = (coordinates: Coordinates): boolean => {
  // Expanded bounds to include most populated areas where Subway operates
  const bounds = {
    north: 71.5,   // Northern Canada/Alaska
    south: 18.0,   // Southern Mexico/Caribbean
    east: -66.0,   // Eastern US coast
    west: -180.0   // Western Pacific (Hawaii, etc.)
  };

  return coordinates.lat >= bounds.south && 
         coordinates.lat <= bounds.north &&
         coordinates.lng >= bounds.west && 
         coordinates.lng <= bounds.east;
};

/**
 * Validate complete location seed data
 */
export const validateLocationSeedData = (data: any): boolean => {
  try {
    // Use Joi schema for basic validation
    const { error } = locationSchema.validate(data);
    if (error) {
      return false;
    }

    // Additional business logic validation
    if (!isValidSubwayLocation(data.coordinates)) {
      return false;
    }

    if (!validateStoreHours(data.hours)) {
      return false;
    }

    if (!isValidTimezone(data.hours.timezone)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};