import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import MapView from '../MapView';
import { SubwayLocation } from '../../types';

// Mock Google Maps
const mockMap = {
  setCenter: vi.fn(),
  setZoom: vi.fn(),
};

const mockMarker = {
  setMap: vi.fn(),
  addListener: vi.fn(),
  getTitle: vi.fn(),
};

const mockInfoWindow = {
  setContent: vi.fn(),
  open: vi.fn(),
};

const mockGoogleMaps = {
  Map: vi.fn(() => mockMap),
  Marker: vi.fn(() => mockMarker),
  InfoWindow: vi.fn(() => mockInfoWindow),
  SymbolPath: { CIRCLE: 'circle' },
  Size: vi.fn(),
  Point: vi.fn(),
};

// Mock the Google Maps wrapper
vi.mock('@googlemaps/react-wrapper', () => ({
  Wrapper: ({ children, render }: any) => {
    // Simulate different loading states
    const status = (global as any).__GOOGLE_MAPS_STATUS__ || 'SUCCESS';
    
    if (status === 'LOADING') {
      return render('LOADING');
    } else if (status === 'FAILURE') {
      return render('FAILURE');
    } else {
      return children;
    }
  },
  Status: {
    LOADING: 'LOADING',
    FAILURE: 'FAILURE',
    SUCCESS: 'SUCCESS',
  },
}));

// Mock MarkerClusterer
const mockMarkerClusterer = {
  clearMarkers: vi.fn(),
};

vi.mock('@googlemaps/markerclusterer', () => ({
  MarkerClusterer: vi.fn(() => mockMarkerClusterer),
}));

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  (global as any).google = { maps: mockGoogleMaps };
  (global as any).__GOOGLE_MAPS_STATUS__ = 'SUCCESS';
});

afterEach(() => {
  process.env = originalEnv;
  delete (global as any).google;
  delete (global as any).__GOOGLE_MAPS_STATUS__;
});

const mockUserLocation = { lat: 40.7589, lng: -73.9851 };
const mockSubwayLocations: SubwayLocation[] = [
  {
    id: '1',
    name: 'Subway - Times Square',
    address: '1560 Broadway, New York, NY 10036',
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
  },
  {
    id: '2',
    name: 'Subway - Penn Station',
    address: '2 Penn Plaza, New York, NY 10121',
    coordinates: { lat: 40.7505, lng: -73.9934 },
    hours: {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '07:00', close: '21:00' },
      sunday: { open: '08:00', close: '20:00' },
      timezone: 'America/New_York',
    },
    lettuceScore: 3.8,
    recentlyRated: false,
    distanceFromUser: 180,
    isOpen: true,
  },
];

const mockOnLocationSelect = vi.fn();

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show configuration error when API key is missing', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = '';

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    expect(screen.getByText('Configuration Error')).toBeInTheDocument();
    expect(screen.getByText('Google Maps API key is not configured')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';
    (global as any).__GOOGLE_MAPS_STATUS__ = 'LOADING';

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('should show error state with fallback list view', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';
    (global as any).__GOOGLE_MAPS_STATUS__ = 'FAILURE';

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    expect(screen.getByText('Map Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Failed to load Google Maps')).toBeInTheDocument();
    expect(screen.getByText('Nearby Subway Locations')).toBeInTheDocument();
    
    // Should show locations in fallback list
    expect(screen.getByText('Subway - Times Square')).toBeInTheDocument();
    expect(screen.getByText('Subway - Penn Station')).toBeInTheDocument();
  });

  it('should handle retry button click in error state', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';
    (global as any).__GOOGLE_MAPS_STATUS__ = 'FAILURE';

    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    fireEvent.click(screen.getByText('Retry'));
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should handle location selection in fallback list view', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';
    (global as any).__GOOGLE_MAPS_STATUS__ = 'FAILURE';

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    // Click on a location in the fallback list
    fireEvent.click(screen.getByText('Subway - Times Square'));
    expect(mockOnLocationSelect).toHaveBeenCalledWith(mockSubwayLocations[0]);
  });

  it('should show location details in fallback list view', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';
    (global as any).__GOOGLE_MAPS_STATUS__ = 'FAILURE';

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    // Check location details
    expect(screen.getByText('1560 Broadway, New York, NY 10036')).toBeInTheDocument();
    expect(screen.getByText('0.3 km away')).toBeInTheDocument(); // 250m = 0.25km rounded to 0.3
    expect(screen.getByText('4.2')).toBeInTheDocument(); // Lettuce score
    expect(screen.getByText('🟢')).toBeInTheDocument(); // Recently rated indicator
  });

  it('should show empty state in fallback list when no locations', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';
    (global as any).__GOOGLE_MAPS_STATUS__ = 'FAILURE';

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={[]}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    expect(screen.getByText('No locations found')).toBeInTheDocument();
  });

  it('should render successfully when Google Maps loads', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';
    (global as any).__GOOGLE_MAPS_STATUS__ = 'SUCCESS';

    render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    // Should not show error states
    expect(screen.queryByText('Map Unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    expect(screen.queryByText('Configuration Error')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'test-api-key';

    const { container } = render(
      <MapView
        userLocation={mockUserLocation}
        subwayLocations={mockSubwayLocations}
        onLocationSelect={mockOnLocationSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});