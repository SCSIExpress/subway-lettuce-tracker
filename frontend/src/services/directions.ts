import { Coordinates, SubwayLocation } from '../types';

export interface DirectionsError {
  code: string;
  message: string;
  type: 'GOOGLE_MAPS_ERROR' | 'NETWORK_ERROR' | 'INVALID_LOCATION' | 'NOT_SUPPORTED';
}

export interface DirectionsOptions {
  travelMode?: google.maps.TravelMode;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
}

export class DirectionsService {
  private static instance: DirectionsService;

  static getInstance(): DirectionsService {
    if (!DirectionsService.instance) {
      DirectionsService.instance = new DirectionsService();
    }
    return DirectionsService.instance;
  }

  /**
   * Check if Google Maps is available
   */
  isGoogleMapsAvailable(): boolean {
    return typeof google !== 'undefined' && 
           typeof google.maps !== 'undefined' && 
           typeof google.maps.DirectionsService !== 'undefined';
  }

  /**
   * Open Google Maps with directions to the specified location
   * This is the primary method for navigation integration
   */
  async openDirections(
    destination: SubwayLocation,
    origin?: Coordinates
  ): Promise<void> {
    try {
      // Validate destination
      if (!this.validateLocation(destination)) {
        throw {
          code: 'INVALID_DESTINATION',
          message: 'Invalid destination location provided',
          type: 'INVALID_LOCATION'
        } as DirectionsError;
      }

      // Build Google Maps URL
      const mapsUrl = this.buildGoogleMapsUrl(destination, origin);
      
      // Open in new tab/window
      const opened = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      
      if (!opened) {
        // Fallback: try to navigate in same window
        window.location.href = mapsUrl;
      }
    } catch (error) {
      throw this.handleDirectionsError(error);
    }
  }

  /**
   * Get directions using Google Maps Directions API
   * This can be used for displaying route information within the app
   */
  async getDirections(
    destination: SubwayLocation,
    origin: Coordinates,
    options: DirectionsOptions = {}
  ): Promise<google.maps.DirectionsResult> {
    if (!this.isGoogleMapsAvailable()) {
      throw {
        code: 'GOOGLE_MAPS_NOT_AVAILABLE',
        message: 'Google Maps API is not available',
        type: 'NOT_SUPPORTED'
      } as DirectionsError;
    }

    return new Promise((resolve, reject) => {
      try {
        const directionsService = new google.maps.DirectionsService();
        
        const request: google.maps.DirectionsRequest = {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.coordinates.lat, lng: destination.coordinates.lng },
          travelMode: options.travelMode || google.maps.TravelMode.DRIVING,
          avoidHighways: options.avoidHighways || false,
          avoidTolls: options.avoidTolls || false,
          unitSystem: google.maps.UnitSystem.METRIC
        };

        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(this.mapDirectionsStatus(status));
          }
        });
      } catch (error) {
        reject(this.handleDirectionsError(error));
      }
    });
  }

  /**
   * Get estimated travel time and distance
   */
  async getTravelInfo(
    destination: SubwayLocation,
    origin: Coordinates,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ): Promise<{ duration: string; distance: string; durationValue: number; distanceValue: number }> {
    try {
      const directions = await this.getDirections(destination, origin, { travelMode });
      const route = directions.routes[0];
      const leg = route.legs[0];

      return {
        duration: leg.duration?.text || 'Unknown',
        distance: leg.distance?.text || 'Unknown',
        durationValue: leg.duration?.value || 0,
        distanceValue: leg.distance?.value || 0
      };
    } catch (error) {
      throw this.handleDirectionsError(error);
    }
  }

  /**
   * Build Google Maps URL for external navigation
   */
  private buildGoogleMapsUrl(destination: SubwayLocation, origin?: Coordinates): string {
    const baseUrl = 'https://www.google.com/maps/dir/';
    
    // Build destination string with coordinates and name for better accuracy
    const destinationStr = `${destination.coordinates.lat},${destination.coordinates.lng}`;
    // Destination info available for future use
    // const destinationName = encodeURIComponent(destination.name);
    // const destinationAddress = encodeURIComponent(destination.address);
    
    let url = baseUrl;
    
    if (origin) {
      // Include origin coordinates
      url += `${origin.lat},${origin.lng}/`;
    }
    
    // Add destination with coordinates and place information
    url += `${destinationStr}/@${destination.coordinates.lat},${destination.coordinates.lng},15z`;
    
    // Add query parameters for better place identification
    const params = new URLSearchParams({
      'api': '1',
      'destination': `${destinationStr}`,
      'destination_place_id': '', // Could be enhanced with place ID if available
      'travelmode': 'driving'
    });

    // Add place name as query for better identification
    if (destination.name) {
      params.set('query', `${destination.name} ${destination.address}`);
    }

    return `${url}?${params.toString()}`;
  }

  /**
   * Validate location data
   */
  private validateLocation(location: SubwayLocation): boolean {
    if (!location || !location.coordinates) {
      return false;
    }

    const { lat, lng } = location.coordinates;
    
    // Check if coordinates are within valid ranges
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    
    // Check if coordinates are not null island (0,0)
    if (lat === 0 && lng === 0) return false;
    
    return true;
  }

  /**
   * Map Google Maps DirectionsStatus to our error format
   */
  private mapDirectionsStatus(status: google.maps.DirectionsStatus): DirectionsError {
    switch (status) {
      case google.maps.DirectionsStatus.NOT_FOUND:
        return {
          code: 'ROUTE_NOT_FOUND',
          message: 'No route could be found between the origin and destination',
          type: 'GOOGLE_MAPS_ERROR'
        };
      case google.maps.DirectionsStatus.ZERO_RESULTS:
        return {
          code: 'NO_ROUTES_AVAILABLE',
          message: 'No routes are available for the specified locations',
          type: 'GOOGLE_MAPS_ERROR'
        };
      case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
        return {
          code: 'TOO_MANY_WAYPOINTS',
          message: 'Too many waypoints were provided in the request',
          type: 'GOOGLE_MAPS_ERROR'
        };
      case google.maps.DirectionsStatus.INVALID_REQUEST:
        return {
          code: 'INVALID_REQUEST',
          message: 'The DirectionsRequest provided was invalid',
          type: 'GOOGLE_MAPS_ERROR'
        };
      case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
        return {
          code: 'QUOTA_EXCEEDED',
          message: 'The application has exceeded the daily quota for directions requests',
          type: 'GOOGLE_MAPS_ERROR'
        };
      case google.maps.DirectionsStatus.REQUEST_DENIED:
        return {
          code: 'REQUEST_DENIED',
          message: 'The application is not allowed to use the DirectionsService',
          type: 'GOOGLE_MAPS_ERROR'
        };
      case google.maps.DirectionsStatus.UNKNOWN_ERROR:
      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred while processing the directions request',
          type: 'GOOGLE_MAPS_ERROR'
        };
    }
  }

  /**
   * Handle and normalize various error types
   */
  private handleDirectionsError(error: any): DirectionsError {
    if (error && typeof error === 'object' && 'type' in error) {
      // Already a DirectionsError
      return error as DirectionsError;
    }

    if (error instanceof Error) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        type: 'NETWORK_ERROR'
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred while getting directions',
      type: 'GOOGLE_MAPS_ERROR'
    };
  }
}

export const directionsService = DirectionsService.getInstance();