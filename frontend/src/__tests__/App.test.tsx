import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

// Mock all the components and services
vi.mock('../components', () => ({
  LocationPermissionHandler: ({ children, onLocationObtained }: any) => {
    // Simulate location obtained
    if (onLocationObtained) {
      setTimeout(() => onLocationObtained({ lat: 40.7128, lng: -74.0060 }), 100);
    }
    return children({ lat: 40.7128, lng: -74.0060 }, false);
  },
  MapView: ({ userLocation, subwayLocations, onLocationSelect }: any) => (
    <div data-testid="map-view">
      <div>User Location: {userLocation.lat}, {userLocation.lng}</div>
      <div>Locations: {subwayLocations.length}</div>
      <button onClick={() => onLocationSelect(subwayLocations[0])}>
        Select First Location
      </button>
    </div>
  ),
  LocationPanel: ({ locations, isOpen, onToggle, onRate, onDirections }: any) => (
    <div data-testid="location-panel">
      <div>Panel Open: {isOpen.toString()}</div>
      <div>Locations: {locations.length}</div>
      <button onClick={onToggle}>Toggle Panel</button>
      <button onClick={() => onRate(locations[0]?.id)}>Rate First</button>
      <button onClick={() => onDirections(locations[0])}>Directions</button>
    </div>
  ),
  RatingModal: ({ isOpen, location, onClose, onSubmit }: any) => (
    isOpen ? (
      <div data-testid="rating-modal">
        <div>Rating: {location?.name}</div>
        <button onClick={() => onSubmit(5)}>Submit Rating</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
  ErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
  QueryErrorBoundary: ({ children }: any) => <div data-testid="query-error-boundary">{children}</div>,
  DataSyncIndicator: () => <div data-testid="data-sync-indicator">Sync</div>,
  OfflineIndicator: () => <div data-testid="offline-indicator">Offline</div>,
}));

vi.mock('../hooks/useLocationQueries', () => ({
  useLocationData: () => ({
    locations: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isRefetching: false,
    dataUpdatedAt: Date.now(),
    isStale: false,
  }),
}));

vi.mock('../services', () => ({
  directionsService: {
    openDirections: vi.fn(),
  },
}));

vi.mock('../contexts/LocationContext', () => ({
  LocationProvider: ({ children }: any) => <div data-testid="location-provider">{children}</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main app structure', () => {
    render(<App />);

    expect(screen.getByText('🥬 Leaf App')).toBeInTheDocument();
    expect(screen.getByText('Find the freshest lettuce at Subway')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('data-sync-indicator')).toBeInTheDocument();
  });

  it('renders location permission handler and map view', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });

    expect(screen.getByText('User Location: 40.7128, -74.006')).toBeInTheDocument();
    expect(screen.getByText('Locations: 3')).toBeInTheDocument(); // Sample locations
  });

  it('handles location selection and panel opening', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });

    // Initially panel should be closed
    expect(screen.getByText('Panel Open: false')).toBeInTheDocument();

    // Select a location
    const selectButton = screen.getByText('Select First Location');
    fireEvent.click(selectButton);

    // Panel should open
    expect(screen.getByText('Panel Open: true')).toBeInTheDocument();
  });

  it('handles panel toggle', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('location-panel')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText('Toggle Panel');
    
    // Initially closed
    expect(screen.getByText('Panel Open: false')).toBeInTheDocument();
    
    // Toggle open
    fireEvent.click(toggleButton);
    expect(screen.getByText('Panel Open: true')).toBeInTheDocument();
    
    // Toggle closed
    fireEvent.click(toggleButton);
    expect(screen.getByText('Panel Open: false')).toBeInTheDocument();
  });

  it('handles rating modal opening and closing', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('location-panel')).toBeInTheDocument();
    });

    // Initially no rating modal
    expect(screen.queryByTestId('rating-modal')).not.toBeInTheDocument();

    // Open rating modal
    const rateButton = screen.getByText('Rate First');
    fireEvent.click(rateButton);

    expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
    expect(screen.getByText('Rating: Subway - Times Square')).toBeInTheDocument();

    // Close rating modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('rating-modal')).not.toBeInTheDocument();
  });

  it('handles rating submission', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('location-panel')).toBeInTheDocument();
    });

    // Open rating modal
    const rateButton = screen.getByText('Rate First');
    fireEvent.click(rateButton);

    // Submit rating
    const submitButton = screen.getByText('Submit Rating');
    fireEvent.click(submitButton);

    // Modal should close after submission
    await waitFor(() => {
      expect(screen.queryByTestId('rating-modal')).not.toBeInTheDocument();
    });
  });

  it('handles directions request', async () => {
    const { directionsService } = await import('../services');
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('location-panel')).toBeInTheDocument();
    });

    const directionsButton = screen.getByText('Directions');
    fireEvent.click(directionsButton);

    expect(directionsService.openDirections).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        name: 'Subway - Times Square',
      })
    );
  });

  it('handles directions error with fallback', async () => {
    const { directionsService } = await import('../services');
    directionsService.openDirections.mockRejectedValue(new Error('Directions failed'));

    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', { value: mockOpen, writable: true });

    // Mock alert
    const mockAlert = vi.fn();
    Object.defineProperty(window, 'alert', { value: mockAlert, writable: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('location-panel')).toBeInTheDocument();
    });

    const directionsButton = screen.getByText('Directions');
    fireEvent.click(directionsButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Directions Error: Directions failed');
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('google.com/maps'),
        '_blank'
      );
    });
  });

  it('displays sample locations when API data is not available', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Locations: 3')).toBeInTheDocument();
    });
  });

  it('wraps components with proper providers', () => {
    render(<App />);

    expect(screen.getByTestId('location-provider')).toBeInTheDocument();
    expect(screen.getByTestId('query-error-boundary')).toBeInTheDocument();
  });
});