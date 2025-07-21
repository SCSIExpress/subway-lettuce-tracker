// Core coordinate interface
export interface Coordinates {
  lat: number;
  lng: number;
}

// Store hours interface
export interface StoreHours {
  monday: { open: string; close: string; closed?: boolean };
  tuesday: { open: string; close: string; closed?: boolean };
  wednesday: { open: string; close: string; closed?: boolean };
  thursday: { open: string; close: string; closed?: boolean };
  friday: { open: string; close: string; closed?: boolean };
  saturday: { open: string; close: string; closed?: boolean };
  sunday: { open: string; close: string; closed?: boolean };
  timezone: string;
}

// Database row interfaces (matching SQL schema)
export interface LocationRow {
  id: string;
  name: string;
  address: string;
  coordinates: string; // PostGIS POINT as string
  hours: StoreHours;
  created_at: Date;
  updated_at: Date;
}

export interface RatingRow {
  id: string;
  location_id: string;
  score: number;
  timestamp: Date;
  user_id?: string;
}

// API response interfaces
export interface SubwayLocation {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  hours: StoreHours;
  lettuceScore: number; // 1-5, weighted average of last 10 ratings
  lastRated?: Date;
  recentlyRated: boolean; // rated within last 2 hours
  distanceFromUser?: number; // in meters
  isOpen?: boolean; // calculated based on current time and hours
}

export interface Rating {
  id: string;
  locationId: string;
  score: number; // 1-5
  timestamp: Date;
  userId?: string; // for future user tracking
}

export interface TimeRecommendation {
  period: 'morning' | 'lunch' | 'afternoon' | 'evening';
  averageScore: number;
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
  timeRange: string; // e.g., "6:00 AM - 11:00 AM"
}

export interface SubwayLocationDetail extends SubwayLocation {
  ratings: Rating[];
  timeRecommendations: TimeRecommendation[];
  totalRatings: number;
  averageScore: number;
}

// API request/response types
export interface NearbyLocationsRequest {
  lat: number;
  lng: number;
  radius?: number; // meters, default 5000
  limit?: number; // max results, default 20
}

export interface NearbyLocationsResponse {
  locations: SubwayLocation[];
  userLocation: Coordinates;
  searchRadius: number;
  totalFound: number;
}

export interface SubmitRatingRequest {
  locationId: string;
  score: number; // 1-5
  userId?: string; // optional for future use
}

export interface SubmitRatingResponse {
  rating: Rating;
  newLocationScore: number;
  message: string;
}

// Error response interface
export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

// Validation schemas (for runtime validation)
export interface LocationValidation {
  name: { minLength: 1; maxLength: 255 };
  address: { minLength: 5; maxLength: 500 };
  coordinates: { lat: { min: -90; max: 90 }; lng: { min: -180; max: 180 } };
  score: { min: 1; max: 5 };
}

// Utility types
export type TimePeriod = 'morning' | 'lunch' | 'afternoon' | 'evening';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';