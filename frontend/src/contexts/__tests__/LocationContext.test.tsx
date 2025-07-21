import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { LocationProvider, useLocation, useCurrentLocation } from '../LocationContext';
import { mockGeolocation, mockPermissions } from '../../test/setup';

// Test component to use the context
function TestComponent() {
  const { state, actions } = useLocation();
  
  return (
    <div>
      <div data-testid="loading">{state.isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="permission">{state.permissionState || 'null'}</div>
      <div data-testid="location">
        {state.userLocation ? `${state.userLocation.lat},${state.userLocation.lng}` : 'null'}
      </div>
      <div data-testid="manual-location">
        {state.manualLocation ? `${state.manualLocation.lat},${state.manualLocation.lng}` : 'null'}
      </div>
      <div data-testid="using-manual">{state.isUsingManualLocation ? 'true' : 'false'}</div>
      <div data-testid="error">{state.error?.message || 'null'}</div>
      <div data-testid="watching">{state.isWatching ? 'true' : 'false'}</div>
      
      <button onClick={() => actions.requestLocation()}>Request Location</button>
      <button onClick={() => actions.setManualLocation({ lat: 40.7128, lng: -74.0060 })}>
        Set Manual Location
      </button>
      <button onClick={() => actions.clearManualLocation()}>Clear Manual Location</button>
      <button onClick={() => actions.startWatching()}>Start Watching</button>
      <button onClick={() => actions.stopWatching()}>Stop Watching</button>
      <button onClick={() => actions.resetLocationState()}>Reset State</button>
    </div>
  );
}

function CurrentLocationTestComponent() {
  const { location, isLoading, error, requestLocation, isUsingManualLocation } = useCurrentLocation();
  
  return (
    <div>
      <div data-testid="current-location">
        {location ? `${location.lat},${location.lng}` : 'null'}
      </div>
      <div data-testid="current-loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="current-error">{error?.message || 'null'}</div>
      <div data-testid="current-manual">{isUsingManualLocation ? 'true' : 'false'}</div>
      <button onClick={() => requestLocation()}>Request Current Location</button>
    </div>
  );
}

describe('LocationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LocationProvider', () => {
    it('should provide initial state', () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('location')).toHaveTextContent('null');
      expect(screen.getByTestId('manual-location')).toHaveTextContent('null');
      expect(screen.getByTestId('using-manual')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
      expect(screen.getByTestId('watching')).toHaveTextContent('false');
    });

    it('should request permission on mount', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('permission')).toHaveTextContent('granted');
      });
    });
  });

  describe('requestLocation', () => {
    it('should successfully get location', async () => {
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

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      const button = screen.getByText('Request Location');
      
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('40.7128,-74.006');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });

    it('should handle geolocation errors', async () => {
      const mockError = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      const button = screen.getByText('Request Location');
      
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Location access denied by user');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });
    });

    it('should handle unsupported geolocation', async () => {
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      delete global.navigator.geolocation;

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      const button = screen.getByText('Request Location');
      
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Geolocation is not supported by this browser');
      });

      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('manual location', () => {
    it('should set manual location', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      const button = screen.getByText('Set Manual Location');
      
      await act(async () => {
        button.click();
      });

      expect(screen.getByTestId('manual-location')).toHaveTextContent('40.7128,-74.006');
      expect(screen.getByTestId('using-manual')).toHaveTextContent('true');
    });

    it('should clear manual location', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      // Set manual location first
      const setButton = screen.getByText('Set Manual Location');
      await act(async () => {
        setButton.click();
      });

      expect(screen.getByTestId('using-manual')).toHaveTextContent('true');

      // Clear manual location
      const clearButton = screen.getByText('Clear Manual Location');
      await act(async () => {
        clearButton.click();
      });

      expect(screen.getByTestId('manual-location')).toHaveTextContent('null');
      expect(screen.getByTestId('using-manual')).toHaveTextContent('false');
    });
  });

  describe('watch position', () => {
    it('should start and stop watching position', async () => {
      const mockWatchId = 123;
      mockGeolocation.watchPosition.mockReturnValue(mockWatchId);

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      // Start watching
      const startButton = screen.getByText('Start Watching');
      await act(async () => {
        startButton.click();
      });

      expect(screen.getByTestId('watching')).toHaveTextContent('true');
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();

      // Stop watching
      const stopButton = screen.getByText('Stop Watching');
      await act(async () => {
        stopButton.click();
      });

      expect(screen.getByTestId('watching')).toHaveTextContent('false');
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(mockWatchId);
    });
  });

  describe('reset state', () => {
    it('should reset all state to initial values', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      // Set some state first
      const setManualButton = screen.getByText('Set Manual Location');
      await act(async () => {
        setManualButton.click();
      });

      expect(screen.getByTestId('using-manual')).toHaveTextContent('true');

      // Reset state
      const resetButton = screen.getByText('Reset State');
      await act(async () => {
        resetButton.click();
      });

      expect(screen.getByTestId('location')).toHaveTextContent('null');
      expect(screen.getByTestId('manual-location')).toHaveTextContent('null');
      expect(screen.getByTestId('using-manual')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
      expect(screen.getByTestId('watching')).toHaveTextContent('false');
    });
  });

  describe('useCurrentLocation hook', () => {
    it('should return GPS location when available', async () => {
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

      render(
        <LocationProvider>
          <CurrentLocationTestComponent />
        </LocationProvider>
      );

      const button = screen.getByText('Request Current Location');
      
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-location')).toHaveTextContent('40.7128,-74.006');
        expect(screen.getByTestId('current-manual')).toHaveTextContent('false');
      });
    });

    it('should prioritize manual location over GPS location', async () => {
      render(
        <LocationProvider>
          <TestComponent />
          <CurrentLocationTestComponent />
        </LocationProvider>
      );

      // Set manual location
      const setManualButton = screen.getByText('Set Manual Location');
      await act(async () => {
        setManualButton.click();
      });

      expect(screen.getByTestId('current-location')).toHaveTextContent('40.7128,-74.006');
      expect(screen.getByTestId('current-manual')).toHaveTextContent('true');
    });
  });

  describe('error handling', () => {
    it('should throw error when useLocation is used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useLocation must be used within a LocationProvider');

      console.error = originalError;
    });
  });
});