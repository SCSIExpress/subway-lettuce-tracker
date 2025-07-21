import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationPermissionHandler } from '../LocationPermissionHandler';
import { LocationProvider } from '../../contexts/LocationContext';
import { vi } from 'vitest';

// Mock the ManualLocationEntry component
vi.mock('../ManualLocationEntry', () => ({
  ManualLocationEntry: ({ isOpen, onLocationSet, onCancel }: any) => (
    isOpen ? (
      <div data-testid="manual-location-entry">
        <button onClick={() => onLocationSet({ lat: 40.7128, lng: -74.0060 })}>
          Set Location
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  )
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock permissions API
const mockPermissions = {
  query: vi.fn(),
};

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
});

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <LocationProvider>
      {component}
    </LocationProvider>
  );
};

describe('LocationPermissionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when location is being fetched', () => {
    renderWithProvider(
      <LocationPermissionHandler>
        {(location, isLoading) => (
          isLoading ? <div>Loading...</div> : <div>Content</div>
        )}
      </LocationPermissionHandler>
    );

    expect(screen.getByText('Getting your location...')).toBeInTheDocument();
  });

  it('renders children when location is available', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
      });
    });

    renderWithProvider(
      <LocationPermissionHandler>
        {(location, isLoading) => (
          location ? <div>Location: {location.lat}, {location.lng}</div> : <div>No location</div>
        )}
      </LocationPermissionHandler>
    );

    await waitFor(() => {
      expect(screen.getByText('Location: 40.7128, -74.006')).toBeInTheDocument();
    });
  });

  it('shows location request UI when no location is available', () => {
    renderWithProvider(
      <LocationPermissionHandler>
        {(location, isLoading) => (
          location ? <div>Has location</div> : <div>No location</div>
        )}
      </LocationPermissionHandler>
    );

    expect(screen.getByText('Location Access Needed')).toBeInTheDocument();
    expect(screen.getByText('Allow Location Access')).toBeInTheDocument();
  });

  it('handles location permission request', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'prompt' });
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
      });
    });

    renderWithProvider(
      <LocationPermissionHandler>
        {(location, isLoading) => (
          location ? <div>Has location</div> : <div>No location</div>
        )}
      </LocationPermissionHandler>
    );

    const allowButton = screen.getByText('Allow Location Access');
    fireEvent.click(allowButton);

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  it('shows manual entry when permission is denied', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'denied' });

    renderWithProvider(
      <LocationPermissionHandler>
        {(location, isLoading) => (
          location ? <div>Has location</div> : <div>No location</div>
        )}
      </LocationPermissionHandler>
    );

    await waitFor(() => {
      expect(screen.getByText('Location access is blocked')).toBeInTheDocument();
    });

    const manualButton = screen.getByText('Enter Location Manually');
    fireEvent.click(manualButton);

    expect(screen.getByTestId('manual-location-entry')).toBeInTheDocument();
  });

  it('handles manual location entry', async () => {
    const onLocationObtained = vi.fn();

    renderWithProvider(
      <LocationPermissionHandler onLocationObtained={onLocationObtained}>
        {(location, isLoading) => (
          location ? <div>Has location</div> : <div>No location</div>
        )}
      </LocationPermissionHandler>
    );

    // Click to show manual entry
    const manualButton = screen.getByText('Or enter location manually');
    fireEvent.click(manualButton);

    // Set location through manual entry
    const setLocationButton = screen.getByText('Set Location');
    fireEvent.click(setLocationButton);

    await waitFor(() => {
      expect(onLocationObtained).toHaveBeenCalledWith({ lat: 40.7128, lng: -74.0060 });
    });
  });

  it('shows error message when location request fails', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({
        code: 1,
        message: 'Permission denied',
      });
    });

    renderWithProvider(
      <LocationPermissionHandler>
        {(location, isLoading) => (
          location ? <div>Has location</div> : <div>No location</div>
        )}
      </LocationPermissionHandler>
    );

    const allowButton = screen.getByText('Allow Location Access');
    fireEvent.click(allowButton);

    await waitFor(() => {
      expect(screen.getByText('Location access was denied')).toBeInTheDocument();
    });
  });

  it('provides retry functionality after error', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    mockGeolocation.getCurrentPosition
      .mockImplementationOnce((success, error) => {
        error({
          code: 1,
          message: 'Permission denied',
        });
      })
      .mockImplementationOnce((success) => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10,
          },
        });
      });

    renderWithProvider(
      <LocationPermissionHandler>
        {(location, isLoading) => (
          location ? <div>Location: {location.lat}, {location.lng}</div> : <div>No location</div>
        )}
      </LocationPermissionHandler>
    );

    // First attempt fails
    const allowButton = screen.getByText('Allow Location Access');
    fireEvent.click(allowButton);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    // Retry succeeds
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Location: 40.7128, -74.006')).toBeInTheDocument();
    });
  });
});