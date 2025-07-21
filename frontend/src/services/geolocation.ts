import { Coordinates } from '../types';

export interface GeolocationResult {
  coordinates: Coordinates;
  accuracy: number;
  timestamp: Date;
}

export interface GeolocationError {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
}

export class GeolocationService {
  private static instance: GeolocationService;
  private watchId: number | null = null;

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Check if geolocation is supported by the browser
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get current position with high accuracy
   */
  async getCurrentPosition(): Promise<GeolocationResult> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject({
          code: 0,
          message: 'Geolocation is not supported by this browser',
          type: 'NOT_SUPPORTED'
        } as GeolocationError);
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 60000 // 1 minute
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          });
        },
        (error) => {
          reject(this.mapGeolocationError(error));
        },
        options
      );
    });
  }

  /**
   * Watch position changes for real-time updates
   */
  watchPosition(
    onSuccess: (result: GeolocationResult) => void,
    onError: (error: GeolocationError) => void
  ): number {
    if (!this.isSupported()) {
      onError({
        code: 0,
        message: 'Geolocation is not supported by this browser',
        type: 'NOT_SUPPORTED'
      });
      return -1;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds for watch
      maximumAge: 30000 // 30 seconds for watch
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        });
      },
      (error) => {
        onError(this.mapGeolocationError(error));
      },
      options
    );

    return this.watchId;
  }

  /**
   * Stop watching position changes
   */
  clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Request permission for geolocation (for browsers that support it)
   */
  async requestPermission(): Promise<PermissionState> {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      } catch (error) {
        // Fallback for browsers that don't support permissions API
        console.warn('Permissions API not supported, falling back to direct geolocation request');
        return 'prompt';
      }
    }
    return 'prompt';
  }

  /**
   * Validate coordinates to ensure they're reasonable
   */
  validateCoordinates(coordinates: Coordinates): boolean {
    const { lat, lng } = coordinates;
    
    // Check if coordinates are within valid ranges
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    
    // Check if coordinates are not null island (0,0)
    if (lat === 0 && lng === 0) return false;
    
    return true;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.lat * Math.PI) / 180;
    const φ2 = (coord2.lat * Math.PI) / 180;
    const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Map browser geolocation errors to our error format
   */
  private mapGeolocationError(error: GeolocationPositionError): GeolocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: error.code,
          message: 'Location access denied by user',
          type: 'PERMISSION_DENIED'
        };
      case error.POSITION_UNAVAILABLE:
        return {
          code: error.code,
          message: 'Location information is unavailable',
          type: 'POSITION_UNAVAILABLE'
        };
      case error.TIMEOUT:
        return {
          code: error.code,
          message: 'Location request timed out',
          type: 'TIMEOUT'
        };
      default:
        return {
          code: error.code,
          message: error.message || 'Unknown geolocation error',
          type: 'POSITION_UNAVAILABLE'
        };
    }
  }
}

export const geolocationService = GeolocationService.getInstance();