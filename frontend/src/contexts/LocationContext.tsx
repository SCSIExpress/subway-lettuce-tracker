import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Coordinates } from '../types';
import { geolocationService, GeolocationResult, GeolocationError } from '../services/geolocation';

// Location state interface
export interface LocationState {
  // Current user location
  userLocation: Coordinates | null;
  accuracy: number | null;
  lastUpdated: Date | null;
  
  // Permission and loading states
  permissionState: PermissionState | null;
  isLoading: boolean;
  error: GeolocationError | null;
  
  // Manual location entry
  manualLocation: Coordinates | null;
  isUsingManualLocation: boolean;
  
  // Watch position
  isWatching: boolean;
}

// Location actions
export type LocationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PERMISSION'; payload: PermissionState }
  | { type: 'SET_LOCATION'; payload: GeolocationResult }
  | { type: 'SET_ERROR'; payload: GeolocationError | null }
  | { type: 'SET_MANUAL_LOCATION'; payload: Coordinates }
  | { type: 'CLEAR_MANUAL_LOCATION' }
  | { type: 'SET_WATCHING'; payload: boolean }
  | { type: 'RESET_STATE' };

// Location context interface
export interface LocationContextType {
  state: LocationState;
  actions: {
    requestLocation: () => Promise<void>;
    requestPermission: () => Promise<PermissionState>;
    setManualLocation: (coordinates: Coordinates) => void;
    clearManualLocation: () => void;
    startWatching: () => void;
    stopWatching: () => void;
    getCurrentLocation: () => Coordinates | null;
    resetLocationState: () => void;
  };
}

// Initial state
const initialState: LocationState = {
  userLocation: null,
  accuracy: null,
  lastUpdated: null,
  permissionState: null,
  isLoading: false,
  error: null,
  manualLocation: null,
  isUsingManualLocation: false,
  isWatching: false,
};

// Location reducer
function locationReducer(state: LocationState, action: LocationAction): LocationState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error, // Clear error when starting to load
      };
    
    case 'SET_PERMISSION':
      return {
        ...state,
        permissionState: action.payload,
      };
    
    case 'SET_LOCATION':
      return {
        ...state,
        userLocation: action.payload.coordinates,
        accuracy: action.payload.accuracy,
        lastUpdated: action.payload.timestamp,
        isLoading: false,
        error: null,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case 'SET_MANUAL_LOCATION':
      return {
        ...state,
        manualLocation: action.payload,
        isUsingManualLocation: true,
        error: null,
      };
    
    case 'CLEAR_MANUAL_LOCATION':
      return {
        ...state,
        manualLocation: null,
        isUsingManualLocation: false,
      };
    
    case 'SET_WATCHING':
      return {
        ...state,
        isWatching: action.payload,
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Create context
const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Location provider props
interface LocationProviderProps {
  children: ReactNode;
}

// Location provider component
export function LocationProvider({ children }: LocationProviderProps) {
  const [state, dispatch] = useReducer(locationReducer, initialState);

  // Request user location
  const requestLocation = async (): Promise<void> => {
    if (!geolocationService.isSupported()) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          code: 0,
          message: 'Geolocation is not supported by this browser',
          type: 'NOT_SUPPORTED'
        }
      });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const result = await geolocationService.getCurrentPosition();
      
      if (!geolocationService.validateCoordinates(result.coordinates)) {
        throw {
          code: 2,
          message: 'Invalid coordinates received',
          type: 'POSITION_UNAVAILABLE'
        };
      }

      dispatch({ type: 'SET_LOCATION', payload: result });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as GeolocationError });
    }
  };

  // Request permission
  const requestPermission = async (): Promise<PermissionState> => {
    const permission = await geolocationService.requestPermission();
    dispatch({ type: 'SET_PERMISSION', payload: permission });
    return permission;
  };

  // Set manual location
  const setManualLocation = (coordinates: Coordinates): void => {
    if (!geolocationService.validateCoordinates(coordinates)) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          code: 2,
          message: 'Invalid coordinates provided',
          type: 'POSITION_UNAVAILABLE'
        }
      });
      return;
    }

    dispatch({ type: 'SET_MANUAL_LOCATION', payload: coordinates });
  };

  // Clear manual location
  const clearManualLocation = (): void => {
    dispatch({ type: 'CLEAR_MANUAL_LOCATION' });
  };

  // Start watching position
  const startWatching = (): void => {
    if (state.isWatching) return;

    dispatch({ type: 'SET_WATCHING', payload: true });

    geolocationService.watchPosition(
      (result) => {
        if (geolocationService.validateCoordinates(result.coordinates)) {
          dispatch({ type: 'SET_LOCATION', payload: result });
        }
      },
      (error) => {
        dispatch({ type: 'SET_ERROR', payload: error });
        dispatch({ type: 'SET_WATCHING', payload: false });
      }
    );
  };

  // Stop watching position
  const stopWatching = (): void => {
    if (!state.isWatching) return;

    geolocationService.clearWatch();
    dispatch({ type: 'SET_WATCHING', payload: false });
  };

  // Get current effective location (manual or GPS)
  const getCurrentLocation = (): Coordinates | null => {
    if (state.isUsingManualLocation && state.manualLocation) {
      return state.manualLocation;
    }
    return state.userLocation;
  };

  // Reset location state
  const resetLocationState = (): void => {
    if (state.isWatching) {
      stopWatching();
    }
    dispatch({ type: 'RESET_STATE' });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isWatching) {
        geolocationService.clearWatch();
      }
    };
  }, [state.isWatching]);

  // Check permission on mount
  useEffect(() => {
    requestPermission();
  }, []);

  const contextValue: LocationContextType = {
    state,
    actions: {
      requestLocation,
      requestPermission,
      setManualLocation,
      clearManualLocation,
      startWatching,
      stopWatching,
      getCurrentLocation,
      resetLocationState,
    },
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

// Custom hook to use location context
export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

// Custom hook for getting current location with automatic fallback
export function useCurrentLocation(): {
  location: Coordinates | null;
  isLoading: boolean;
  error: GeolocationError | null;
  requestLocation: () => Promise<void>;
  isUsingManualLocation: boolean;
} {
  const { state, actions } = useLocation();

  return {
    location: actions.getCurrentLocation(),
    isLoading: state.isLoading,
    error: state.error,
    requestLocation: actions.requestLocation,
    isUsingManualLocation: state.isUsingManualLocation,
  };
}