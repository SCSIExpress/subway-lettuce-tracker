import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectionsService, directionsService } from '../directions';
import { SubwayLocation } from '../../types';

// Mock Google Maps API
const mockDirectionsService = {
  route: vi.fn()
};

const mockGoogle = {
  maps: {
    DirectionsService: vi.fn(() => mockDirectionsService),
    DirectionsStatus: {
      OK: 'OK',
      NOT_FOUND: 'NOT_FOUND',
      ZERO_RESULTS: 'ZERO_RESULTS',
      MAX_WAYPOINTS_EXCEEDED: 'MAX_WAYPOINTS_EXCEEDED',
      INVALID_REQUEST: 'INVALID_REQUEST',
      OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
      REQUEST_DENIED: 'REQUEST_DENIED',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    },
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      BICYCLING: 'BICYCLING',
      TRANSIT: 'TRANSIT'
    },
    UnitSystem: {
      METRIC: 'METRIC'
    }
  }
};

// Mock window.open
const mockWindowOpen = vi.fn();
const originalWindowOpen = window.open;

// Sample test data
const sampleLocation: SubwayLocation = {
  id: '1',
  name: 'Subway - Test Location',
  address: '123 Test Street, Test City, TC 12345',
  coordinates: { lat: 40.7589, lng: -73.9851 },
  hours: {
    monday: { open: '06:00', close: '23:00' },
    tuesday: { open: '06:00', close: '23:00' },
    wednesday: { open: '06:00', close: '23:00' },
    thursday: { open: '06:00', close: '23:00' },
    friday: { open: '06:00', close: '23:00' },
    saturday: { open: '07:00', close: '23:00' },
    sunday: { open: '08:00', close: '22:00' },
    timezone: 'America/New_York',
  },
  lettuceScore: 4.2,
  recentlyRated: true,
  distanceFromUser: 250,
  isOpen: true,
};

const sampleOrigin = { lat: 40.7505, lng: -73.9934 };

const mockDirectionsResult = {
  routes: [{
    legs: [{
      duration: { text: '5 mins', value: 300 },
      distance: { text: '0.5 km', value: 500 }
    }]
  }]
};

describe('DirectionsService', () => {
  let service: DirectionsService;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock window.open
    window.open = mockWindowOpen;
    
    // Mock Google Maps API
    (global as any).google = mockGoogle;
    
    // Get fresh instance
    service = DirectionsService.getInstance();
  });

  afterEach(() => {
    // Restore window.open
    window.open = originalWindowOpen;
    
    // Clean up global google mock
    delete (global as any).google;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DirectionsService.getInstance();
      const instance2 = DirectionsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isGoogleMapsAvailable', () => {
    it('should return true when Google Maps API is available', () => {
      expect(service.isGoogleMapsAvailable()).toBe(true);
    });

    it('should return false when Google Maps API is not available', () => {
      delete (global as any).google;
      expect(service.isGoogleMapsAvailable()).toBe(false);
    });

    it('should return false when DirectionsService is not available', () => {
      (global as any).google = { maps: {} };
      expect(service.isGoogleMapsAvailable()).toBe(false);
    });
  });

  describe('openDirections', () => {
    it('should open Google Maps with correct URL', async () => {
      mockWindowOpen.mockReturnValue({});
      
      await service.openDirections(sampleLocation);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://www.google.com/maps/dir/'),
        '_blank',
        'noopener,noreferrer'
      );
      
      const calledUrl = mockWindowOpen.mock.calls[0][0];
      expect(calledUrl).toContain('40.7589,-73.9851');
      expect(calledUrl).toContain('destination=40.7589%2C-73.9851');
    });

    it('should include origin coordinates when provided', async () => {
      mockWindowOpen.mockReturnValue({});
      
      await service.openDirections(sampleLocation, sampleOrigin);
      
      const calledUrl = mockWindowOpen.mock.calls[0][0];
      expect(calledUrl).toContain('40.7505,-73.9934');
    });

    it('should fallback to same window when popup blocked', async () => {
      mockWindowOpen.mockReturnValue(null);
      const originalLocation = window.location.href;
      
      // Mock window.location.href setter
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });
      
      await service.openDirections(sampleLocation);
      
      expect(window.location.href).toContain('https://www.google.com/maps/dir/');
      
      // Restore original location
      window.location.href = originalLocation;
    });

    it('should throw error for invalid location', async () => {
      const invalidLocation = {
        ...sampleLocation,
        coordinates: { lat: 0, lng: 0 }
      };
      
      await expect(service.openDirections(invalidLocation)).rejects.toMatchObject({
        code: 'INVALID_DESTINATION',
        type: 'INVALID_LOCATION'
      });
    });

    it('should throw error for location with invalid coordinates', async () => {
      const invalidLocation = {
        ...sampleLocation,
        coordinates: { lat: 91, lng: -73.9851 } // Invalid latitude
      };
      
      await expect(service.openDirections(invalidLocation)).rejects.toMatchObject({
        code: 'INVALID_DESTINATION',
        type: 'INVALID_LOCATION'
      });
    });
  });

  describe('getDirections', () => {
    it('should return directions result on success', async () => {
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(mockDirectionsResult, mockGoogle.maps.DirectionsStatus.OK);
      });
      
      const result = await service.getDirections(sampleLocation, sampleOrigin);
      
      expect(result).toEqual(mockDirectionsResult);
      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: { lat: 40.7505, lng: -73.9934 },
          destination: { lat: 40.7589, lng: -73.9851 },
          travelMode: 'DRIVING',
          avoidHighways: false,
          avoidTolls: false,
          unitSystem: 'METRIC'
        }),
        expect.any(Function)
      );
    });

    it('should use custom travel mode and options', async () => {
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(mockDirectionsResult, mockGoogle.maps.DirectionsStatus.OK);
      });
      
      await service.getDirections(sampleLocation, sampleOrigin, {
        travelMode: mockGoogle.maps.TravelMode.WALKING,
        avoidHighways: true,
        avoidTolls: true
      });
      
      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          travelMode: 'WALKING',
          avoidHighways: true,
          avoidTolls: true
        }),
        expect.any(Function)
      );
    });

    it('should throw error when Google Maps is not available', async () => {
      delete (global as any).google;
      
      await expect(service.getDirections(sampleLocation, sampleOrigin)).rejects.toMatchObject({
        code: 'GOOGLE_MAPS_NOT_AVAILABLE',
        type: 'NOT_SUPPORTED'
      });
    });

    it('should handle NOT_FOUND status', async () => {
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(null, mockGoogle.maps.DirectionsStatus.NOT_FOUND);
      });
      
      await expect(service.getDirections(sampleLocation, sampleOrigin)).rejects.toMatchObject({
        code: 'ROUTE_NOT_FOUND',
        type: 'GOOGLE_MAPS_ERROR'
      });
    });

    it('should handle ZERO_RESULTS status', async () => {
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(null, mockGoogle.maps.DirectionsStatus.ZERO_RESULTS);
      });
      
      await expect(service.getDirections(sampleLocation, sampleOrigin)).rejects.toMatchObject({
        code: 'NO_ROUTES_AVAILABLE',
        type: 'GOOGLE_MAPS_ERROR'
      });
    });

    it('should handle OVER_QUERY_LIMIT status', async () => {
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(null, mockGoogle.maps.DirectionsStatus.OVER_QUERY_LIMIT);
      });
      
      await expect(service.getDirections(sampleLocation, sampleOrigin)).rejects.toMatchObject({
        code: 'QUOTA_EXCEEDED',
        type: 'GOOGLE_MAPS_ERROR'
      });
    });
  });

  describe('getTravelInfo', () => {
    it('should return travel information', async () => {
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(mockDirectionsResult, mockGoogle.maps.DirectionsStatus.OK);
      });
      
      const travelInfo = await service.getTravelInfo(sampleLocation, sampleOrigin);
      
      expect(travelInfo).toEqual({
        duration: '5 mins',
        distance: '0.5 km',
        durationValue: 300,
        distanceValue: 500
      });
    });

    it('should handle missing duration/distance data', async () => {
      const incompleteResult = {
        routes: [{
          legs: [{}] // Missing duration and distance
        }]
      };
      
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(incompleteResult, mockGoogle.maps.DirectionsStatus.OK);
      });
      
      const travelInfo = await service.getTravelInfo(sampleLocation, sampleOrigin);
      
      expect(travelInfo).toEqual({
        duration: 'Unknown',
        distance: 'Unknown',
        durationValue: 0,
        distanceValue: 0
      });
    });

    it('should propagate directions errors', async () => {
      mockDirectionsService.route.mockImplementation((request, callback) => {
        callback(null, mockGoogle.maps.DirectionsStatus.NOT_FOUND);
      });
      
      await expect(service.getTravelInfo(sampleLocation, sampleOrigin)).rejects.toMatchObject({
        code: 'ROUTE_NOT_FOUND',
        type: 'GOOGLE_MAPS_ERROR'
      });
    });
  });

  describe('URL building', () => {
    it('should build correct Google Maps URL without origin', async () => {
      mockWindowOpen.mockReturnValue({});
      
      await service.openDirections(sampleLocation);
      
      const calledUrl = mockWindowOpen.mock.calls[0][0];
      expect(calledUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//);
      expect(calledUrl).toContain('40.7589,-73.9851');
      expect(calledUrl).toContain('api=1');
      expect(calledUrl).toContain('destination=40.7589%2C-73.9851');
      expect(calledUrl).toContain('travelmode=driving');
    });

    it('should build correct Google Maps URL with origin', async () => {
      mockWindowOpen.mockReturnValue({});
      
      await service.openDirections(sampleLocation, sampleOrigin);
      
      const calledUrl = mockWindowOpen.mock.calls[0][0];
      expect(calledUrl).toContain('40.7505,-73.9934/40.7589,-73.9851');
    });

    it('should encode location name and address in query', async () => {
      mockWindowOpen.mockReturnValue({});
      
      await service.openDirections(sampleLocation);
      
      const calledUrl = mockWindowOpen.mock.calls[0][0];
      expect(calledUrl).toContain('query=');
      // The URL uses + instead of %20 for spaces in the query parameter
      expect(calledUrl).toContain('Subway+-+Test+Location');
      expect(calledUrl).toContain('123+Test+Street');
    });
  });

  describe('validation', () => {
    it('should validate valid coordinates', async () => {
      mockWindowOpen.mockReturnValue({});
      
      await expect(service.openDirections(sampleLocation)).resolves.toBeUndefined();
    });

    it('should reject coordinates outside valid range', async () => {
      const invalidLocations = [
        { ...sampleLocation, coordinates: { lat: 91, lng: 0 } }, // lat > 90
        { ...sampleLocation, coordinates: { lat: -91, lng: 0 } }, // lat < -90
        { ...sampleLocation, coordinates: { lat: 0, lng: 181 } }, // lng > 180
        { ...sampleLocation, coordinates: { lat: 0, lng: -181 } }, // lng < -180
        { ...sampleLocation, coordinates: { lat: 0, lng: 0 } }, // null island
      ];
      
      for (const invalidLocation of invalidLocations) {
        await expect(service.openDirections(invalidLocation)).rejects.toMatchObject({
          code: 'INVALID_DESTINATION',
          type: 'INVALID_LOCATION'
        });
      }
    });

    it('should reject location without coordinates', async () => {
      const invalidLocation = { ...sampleLocation, coordinates: undefined as any };
      
      await expect(service.openDirections(invalidLocation)).rejects.toMatchObject({
        code: 'INVALID_DESTINATION',
        type: 'INVALID_LOCATION'
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockDirectionsService.route.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      await expect(service.getDirections(sampleLocation, sampleOrigin)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        type: 'NETWORK_ERROR'
      });
    });

    it('should handle unknown errors', async () => {
      mockDirectionsService.route.mockImplementation(() => {
        throw 'Unknown error';
      });
      
      await expect(service.getDirections(sampleLocation, sampleOrigin)).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        type: 'GOOGLE_MAPS_ERROR'
      });
    });
  });
});

describe('directionsService singleton', () => {
  it('should export singleton instance', () => {
    expect(directionsService).toBeInstanceOf(DirectionsService);
    expect(directionsService).toBe(DirectionsService.getInstance());
  });
});