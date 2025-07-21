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

// Utility types
export type TimePeriod = 'morning' | 'lunch' | 'afternoon' | 'evening';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Frontend-specific types
export interface UserLocation {
  coordinates: Coordinates;
  accuracy?: number;
  timestamp: Date;
}

export interface MapState {
  center: Coordinates;
  zoom: number;
  selectedLocationId?: string;
}

export interface LocationPanelState {
  isOpen: boolean;
  selectedLocation?: SubwayLocation;
  locations: SubwayLocation[];
}

export interface RatingModalState {
  isOpen: boolean;
  location?: SubwayLocation;
}