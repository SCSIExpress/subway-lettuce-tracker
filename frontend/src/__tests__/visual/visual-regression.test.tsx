import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { LocationCard } from '../../components/LocationCard';
import { LocationPanel } from '../../components/LocationPanel';
import { RatingModal } from '../../components/RatingModal';
import { MapView } from '../../components/MapView';
import { LocationPermissionHandler } from '../../components/LocationPermissionHandler';
import { ManualLocationEntry } from '../../components/ManualLocationEntry';
import { SubwayLocation } from '../../types';

// Mock Google Maps
const mockMap = {
  setCenter: vi.fn(),
  setZoom: vi.fn(),
  addListener: vi.fn(),
};

const mockMarker = {
  setPosition: vi.fn(),
  setMap: vi.fn(),
  addListener: vi.fn(),
};

Object.defineProperty(window, 'google', {
  value: {
    maps: {
      Map: vi.fn(() => mockMap),
      Marker: vi.fn(() => mockMarker),
      InfoWindow: vi.fn(() => ({
        setContent: vi.fn(),
        open: vi.fn(),
        close: vi.fn(),
      })),
      LatLng: vi.fn((lat, lng) => ({ lat: () => lat, lng: () => lng })),
      MarkerClusterer: vi.fn(),
    },
  },
  writable: true,
});

// Mock location context
vi.mock('../../contexts/LocationContext', () => ({
  useLocation: () => ({
    state: {
      userLocation: { lat: 40.7128, lng: -74.0060 },
      permissionState: 'granted',
      isLoading: false,
      error: null,
    },
    actions: {
      requestLocation: vi.fn(),
      requestPermission: vi.fn(),
      setManualLocation: vi.fn(),
      getCurrentLocation: () => ({ lat: 40.7128, lng: -74.0060 }),
    },
  }),
}));

const mockLocation: SubwayLocation = {
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
};

const mockLocations: SubwayLocation[] = [
  mockLocation,
  {
    ...mockLocation,
    id: '2',
    name: 'Subway - Penn Station',
    address: '2 Penn Plaza, New York, NY 10121',
    lettuceScore: 3.8,
    recentlyRated: false,
    distanceFromUser: 180,
  },
  {
    ...mockLocation,
    id: '3',
    name: 'Subway - Union Square',
    address: '4 Union Square S, New York, NY 10003',
    lettuceScore: 2.9,
    recentlyRated: false,
    distanceFromUser: 320,
  },
];

describe('Visual Regression Tests', () => {
  describe('LocationCard Component', () => {
    it('should render location card with high score', () => {
      const { container } = render(
        <LocationCard
          location={mockLocation}
          isSelected={false}
          onSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-card-high-score');
    });

    it('should render location card with low score', () => {
      const lowScoreLocation = { ...mockLocation, lettuceScore: 2.1, recentlyRated: false };
      
      const { container } = render(
        <LocationCard
          location={lowScoreLocation}
          isSelected={false}
          onSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-card-low-score');
    });

    it('should render selected location card', () => {
      const { container } = render(
        <LocationCard
          location={mockLocation}
          isSelected={true}
          onSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-card-selected');
    });

    it('should render closed location card', () => {
      const closedLocation = { ...mockLocation, isOpen: false };
      
      const { container } = render(
        <LocationCard
          location={closedLocation}
          isSelected={false}
          onSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-card-closed');
    });
  });

  describe('LocationPanel Component', () => {
    it('should render location panel in closed state', () => {
      const { container } = render(
        <LocationPanel
          locations={mockLocations}
          selectedLocation={undefined}
          onLocationSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
          isOpen={false}
          onToggle={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-panel-closed');
    });

    it('should render location panel in open state', () => {
      const { container } = render(
        <LocationPanel
          locations={mockLocations}
          selectedLocation={mockLocation}
          onLocationSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-panel-open');
    });

    it('should render location panel with loading state', () => {
      const { container } = render(
        <LocationPanel
          locations={[]}
          selectedLocation={undefined}
          onLocationSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
          isRefetching={true}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-panel-loading');
    });

    it('should render location panel with error state', () => {
      const { container } = render(
        <LocationPanel
          locations={[]}
          selectedLocation={undefined}
          onLocationSelect={vi.fn()}
          onRate={vi.fn()}
          onDirections={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
          error={new Error('Failed to load locations')}
          onRetry={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('location-panel-error');
    });
  });

  describe('RatingModal Component', () => {
    it('should render rating modal', () => {
      const { container } = render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('rating-modal-open');
    });

    it('should render rating modal with optimal times', () => {
      const locationWithTimes = {
        ...mockLocation,
        timeRecommendations: [
          {
            period: 'morning' as const,
            averageScore: 4.5,
            confidence: 'high' as const,
            sampleSize: 15,
            timeRange: '6:00 AM - 11:00 AM',
          },
          {
            period: 'lunch' as const,
            averageScore: 3.8,
            confidence: 'medium' as const,
            sampleSize: 8,
            timeRange: '11:00 AM - 3:00 PM',
          },
        ],
      };
      
      const { container } = render(
        <RatingModal
          location={locationWithTimes}
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('rating-modal-with-times');
    });

    it('should not render when closed', () => {
      const { container } = render(
        <RatingModal
          location={mockLocation}
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('rating-modal-closed');
    });
  });

  describe('LocationPermissionHandler Component', () => {
    it('should render location permission request', () => {
      const { container } = render(
        <LocationPermissionHandler>
          {(location, isLoading) => (
            location ? <div>Has location</div> : <div>No location</div>
          )}
        </LocationPermissionHandler>
      );
      
      expect(container.firstChild).toMatchSnapshot('location-permission-request');
    });

    it('should render loading state', () => {
      // Mock loading state
      vi.mocked(require('../../contexts/LocationContext').useLocation).mockReturnValue({
        state: {
          userLocation: null,
          permissionState: 'granted',
          isLoading: true,
          error: null,
        },
        actions: {
          requestLocation: vi.fn(),
          requestPermission: vi.fn(),
          setManualLocation: vi.fn(),
          getCurrentLocation: () => null,
        },
      });

      const { container } = render(
        <LocationPermissionHandler>
          {(location, isLoading) => (
            isLoading ? <div>Loading...</div> : <div>Not loading</div>
          )}
        </LocationPermissionHandler>
      );
      
      expect(container.firstChild).toMatchSnapshot('location-permission-loading');
    });

    it('should render permission denied state', () => {
      vi.mocked(require('../../contexts/LocationContext').useLocation).mockReturnValue({
        state: {
          userLocation: null,
          permissionState: 'denied',
          isLoading: false,
          error: { type: 'PERMISSION_DENIED', message: 'Permission denied' },
        },
        actions: {
          requestLocation: vi.fn(),
          requestPermission: vi.fn(),
          setManualLocation: vi.fn(),
          getCurrentLocation: () => null,
        },
      });

      const { container } = render(
        <LocationPermissionHandler>
          {(location, isLoading) => (
            location ? <div>Has location</div> : <div>No location</div>
          )}
        </LocationPermissionHandler>
      );
      
      expect(container.firstChild).toMatchSnapshot('location-permission-denied');
    });
  });

  describe('ManualLocationEntry Component', () => {
    it('should render manual location entry modal', () => {
      const { container } = render(
        <ManualLocationEntry
          isOpen={true}
          onLocationSet={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('manual-location-entry-open');
    });

    it('should render coordinates tab', () => {
      const { container, rerender } = render(
        <ManualLocationEntry
          isOpen={true}
          onLocationSet={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      
      // Click coordinates tab (simulate state change)
      rerender(
        <ManualLocationEntry
          isOpen={true}
          onLocationSet={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('manual-location-entry-coordinates');
    });

    it('should not render when closed', () => {
      const { container } = render(
        <ManualLocationEntry
          isOpen={false}
          onLocationSet={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot('manual-location-entry-closed');
    });
  });

  describe('Responsive Design Snapshots', () => {
    beforeEach(() => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
    });

    it('should render location card on mobile', () => {
      const { container } = render(
        <div style={{ width: '375px' }}>
          <LocationCard
            location={mockLocation}
            isSelected={false}
            onSelect={vi.fn()}
            onRate={vi.fn()}
            onDirections={vi.fn()}
          />
        </div>
      );
      
      expect(container.firstChild).toMatchSnapshot('location-card-mobile');
    });

    it('should render location panel on mobile', () => {
      const { container } = render(
        <div style={{ width: '375px', height: '667px' }}>
          <LocationPanel
            locations={mockLocations}
            selectedLocation={mockLocation}
            onLocationSelect={vi.fn()}
            onRate={vi.fn()}
            onDirections={vi.fn()}
            isOpen={true}
            onToggle={vi.fn()}
          />
        </div>
      );
      
      expect(container.firstChild).toMatchSnapshot('location-panel-mobile');
    });

    it('should render rating modal on mobile', () => {
      const { container } = render(
        <div style={{ width: '375px', height: '667px' }}>
          <RatingModal
            location={mockLocation}
            isOpen={true}
            onClose={vi.fn()}
            onSubmit={vi.fn()}
          />
        </div>
      );
      
      expect(container.firstChild).toMatchSnapshot('rating-modal-mobile');
    });
  });

  describe('Dark Mode Snapshots', () => {
    beforeEach(() => {
      // Add dark mode class to document
      document.documentElement.classList.add('dark');
    });

    afterEach(() => {
      document.documentElement.classList.remove('dark');
    });

    it('should render location card in dark mode', () => {
      const { container } = render(
        <div className="dark">
          <LocationCard
            location={mockLocation}
            isSelected={false}
            onSelect={vi.fn()}
            onRate={vi.fn()}
            onDirections={vi.fn()}
          />
        </div>
      );
      
      expect(container.firstChild).toMatchSnapshot('location-card-dark-mode');
    });

    it('should render location panel in dark mode', () => {
      const { container } = render(
        <div className="dark">
          <LocationPanel
            locations={mockLocations}
            selectedLocation={mockLocation}
            onLocationSelect={vi.fn()}
            onRate={vi.fn()}
            onDirections={vi.fn()}
            isOpen={true}
            onToggle={vi.fn()}
          />
        </div>
      );
      
      expect(container.firstChild).toMatchSnapshot('location-panel-dark-mode');
    });
  });
});