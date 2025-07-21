import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geolocationService, GeolocationService } from '../geolocation';
import { mockGeolocation, mockPermissions } from '../../test/setup';

describe('GeolocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    geolocationService.clearWatch();
  });

  describe('isSupported', () => {
    it('should return true when geolocation is supported', () => {
      expect(geolocationService.isSupported()).toBe(true);
    });

    it('should return false when geolocation is not supported', () => {
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      delete global.navigator.geolocation;
      
      expect(geolocationService.isSupported()).toBe(false);
      
      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('getCurrentPosition', () => {
    it('should resolve with coordinates when geolocation succeeds', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await geolocationService.getCurrentPosition();

      expect(result).toEqual({
        coordinates: {
          lat: 40.7128,
          lng: -74.0060,
        },
        accuracy: 10,
        timestamp: new Date(mockPosition.timestamp),
      });
    });

    it('should reject with PERMISSION_DENIED error when permission is denied', async () => {
      const mockError = {
        code: 1,
        message: 'User denied the request for Geolocation.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(geolocationService.getCurrentPosition()).rejects.toEqual({
        code: 1,
        message: 'Location access denied by user',
        type: 'PERMISSION_DENIED',
      });
    });

    it('should reject with POSITION_UNAVAILABLE error when position is unavailable', async () => {
      const mockError = {
        code: 2,
        message: 'Network error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(geolocationService.getCurrentPosition()).rejects.toEqual({
        code: 2,
        message: 'Location information is unavailable',
        type: 'POSITION_UNAVAILABLE',
      });
    });

    it('should reject with TIMEOUT error when request times out', async () => {
      const mockError = {
        code: 3,
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(geolocationService.getCurrentPosition()).rejects.toEqual({
        code: 3,
        message: 'Location request timed out',
        type: 'TIMEOUT',
      });
    });

    it('should reject with NOT_SUPPORTED error when geolocation is not supported', async () => {
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      delete global.navigator.geolocation;

      await expect(geolocationService.getCurrentPosition()).rejects.toEqual({
        code: 0,
        message: 'Geolocation is not supported by this browser',
        type: 'NOT_SUPPORTED',
      });

      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('watchPosition', () => {
    it('should start watching position and call success callback', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const mockWatchId = 123;

      mockGeolocation.watchPosition.mockReturnValue(mockWatchId);

      const watchId = geolocationService.watchPosition(onSuccess, onError);

      expect(watchId).toBe(mockWatchId);
      expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        })
      );

      // Simulate successful position update
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];
      successCallback(mockPosition);

      expect(onSuccess).toHaveBeenCalledWith({
        coordinates: {
          lat: 40.7128,
          lng: -74.0060,
        },
        accuracy: 10,
        timestamp: new Date(mockPosition.timestamp),
      });
    });

    it('should call error callback when watch position fails', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      mockGeolocation.watchPosition.mockReturnValue(123);

      geolocationService.watchPosition(onSuccess, onError);

      // Simulate error
      const mockError = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      const errorCallback = mockGeolocation.watchPosition.mock.calls[0][1];
      errorCallback(mockError);

      expect(onError).toHaveBeenCalledWith({
        code: 1,
        message: 'Location access denied by user',
        type: 'PERMISSION_DENIED',
      });
    });

    it('should return -1 and call error callback when geolocation is not supported', () => {
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      delete global.navigator.geolocation;

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const watchId = geolocationService.watchPosition(onSuccess, onError);

      expect(watchId).toBe(-1);
      expect(onError).toHaveBeenCalledWith({
        code: 0,
        message: 'Geolocation is not supported by this browser',
        type: 'NOT_SUPPORTED',
      });

      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('clearWatch', () => {
    it('should clear watch when watch ID exists', () => {
      const mockWatchId = 123;
      mockGeolocation.watchPosition.mockReturnValue(mockWatchId);

      geolocationService.watchPosition(vi.fn(), vi.fn());
      geolocationService.clearWatch();

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(mockWatchId);
    });

    it('should not call clearWatch when no watch ID exists', () => {
      geolocationService.clearWatch();
      expect(mockGeolocation.clearWatch).not.toHaveBeenCalled();
    });
  });

  describe('requestPermission', () => {
    it('should return permission state when permissions API is supported', async () => {
      const mockPermission = { state: 'granted' as PermissionState };
      mockPermissions.query.mockResolvedValue(mockPermission);

      const result = await geolocationService.requestPermission();

      expect(result).toBe('granted');
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    });

    it('should return "prompt" when permissions API is not supported', async () => {
      mockPermissions.query.mockRejectedValue(new Error('Not supported'));

      const result = await geolocationService.requestPermission();

      expect(result).toBe('prompt');
    });

    it('should return "prompt" when permissions API does not exist', async () => {
      const originalPermissions = global.navigator.permissions;
      // @ts-ignore
      delete global.navigator.permissions;

      const result = await geolocationService.requestPermission();

      expect(result).toBe('prompt');

      global.navigator.permissions = originalPermissions;
    });
  });

  describe('validateCoordinates', () => {
    it('should return true for valid coordinates', () => {
      expect(geolocationService.validateCoordinates({ lat: 40.7128, lng: -74.0060 })).toBe(true);
      expect(geolocationService.validateCoordinates({ lat: -90, lng: -180 })).toBe(true);
      expect(geolocationService.validateCoordinates({ lat: 90, lng: 180 })).toBe(true);
    });

    it('should return false for invalid latitude', () => {
      expect(geolocationService.validateCoordinates({ lat: 91, lng: 0 })).toBe(false);
      expect(geolocationService.validateCoordinates({ lat: -91, lng: 0 })).toBe(false);
    });

    it('should return false for invalid longitude', () => {
      expect(geolocationService.validateCoordinates({ lat: 0, lng: 181 })).toBe(false);
      expect(geolocationService.validateCoordinates({ lat: 0, lng: -181 })).toBe(false);
    });

    it('should return false for null island coordinates (0,0)', () => {
      expect(geolocationService.validateCoordinates({ lat: 0, lng: 0 })).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const coord1 = { lat: 40.7128, lng: -74.0060 }; // New York
      const coord2 = { lat: 34.0522, lng: -118.2437 }; // Los Angeles

      const distance = geolocationService.calculateDistance(coord1, coord2);

      // Distance between NYC and LA is approximately 3,944 km
      expect(distance).toBeGreaterThan(3900000); // 3,900 km
      expect(distance).toBeLessThan(4000000); // 4,000 km
    });

    it('should return 0 for identical coordinates', () => {
      const coord = { lat: 40.7128, lng: -74.0060 };
      const distance = geolocationService.calculateDistance(coord, coord);

      expect(distance).toBeCloseTo(0, 1);
    });

    it('should calculate short distances accurately', () => {
      const coord1 = { lat: 40.7128, lng: -74.0060 };
      const coord2 = { lat: 40.7129, lng: -74.0061 }; // Very close coordinates

      const distance = geolocationService.calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Should be less than 20 meters
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GeolocationService.getInstance();
      const instance2 = GeolocationService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(geolocationService);
    });
  });
});