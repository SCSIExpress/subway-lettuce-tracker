import React, { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { ManualLocationEntry } from './ManualLocationEntry';

interface LocationPermissionHandlerProps {
  children: (location: { lat: number; lng: number } | null, isLoading: boolean) => React.ReactNode;
  onLocationObtained?: (location: { lat: number; lng: number }) => void;
}

export function LocationPermissionHandler({ children, onLocationObtained }: LocationPermissionHandlerProps) {
  const { state, actions } = useLocation();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [hasAttemptedLocation, setHasAttemptedLocation] = useState(false);

  // Get current effective location
  const currentLocation = actions.getCurrentLocation();

  // Notify parent when location is obtained
  useEffect(() => {
    if (currentLocation && onLocationObtained) {
      onLocationObtained(currentLocation);
    }
  }, [currentLocation, onLocationObtained]);

  // Auto-request location on mount if permission is granted
  useEffect(() => {
    if (state.permissionState === 'granted' && !currentLocation && !hasAttemptedLocation) {
      setHasAttemptedLocation(true);
      actions.requestLocation();
    }
  }, [state.permissionState, currentLocation, hasAttemptedLocation, actions]);

  const handleRequestLocation = async () => {
    setHasAttemptedLocation(true);
    
    // Check permission first
    const permission = await actions.requestPermission();
    
    if (permission === 'denied') {
      setShowManualEntry(true);
      return;
    }

    // Try to get location
    try {
      await actions.requestLocation();
    } catch (error) {
      // If location request fails, show manual entry
      setShowManualEntry(true);
    }
  };

  const handleManualLocationSet = (coordinates: { lat: number; lng: number }) => {
    actions.setManualLocation(coordinates);
    setShowManualEntry(false);
  };

  const handleManualLocationCancel = () => {
    setShowManualEntry(false);
  };

  const handleRetryLocation = () => {
    actions.requestLocation();
  };

  const handleUseManualEntry = () => {
    setShowManualEntry(true);
  };

  // If we have a location, render children
  if (currentLocation) {
    return <>{children(currentLocation, state.isLoading)}</>;
  }

  // If loading, show loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  // Show location request UI
  return (
    <>
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📍</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Location Access Needed
            </h2>
            <p className="text-gray-600 text-sm">
              We need your location to find nearby Subway restaurants and show you the freshest lettuce options.
            </p>
          </div>

          {/* Error display */}
          {state.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 mb-2">
                {state.error.type === 'PERMISSION_DENIED' 
                  ? 'Location access was denied'
                  : state.error.type === 'NOT_SUPPORTED'
                  ? 'Location services are not supported'
                  : state.error.type === 'TIMEOUT'
                  ? 'Location request timed out'
                  : 'Unable to get your location'
                }
              </p>
              {state.error.type === 'PERMISSION_DENIED' && (
                <p className="text-xs text-red-500">
                  You can enable location access in your browser settings or enter your location manually.
                </p>
              )}
            </div>
          )}

          {/* Permission state specific content */}
          {state.permissionState === 'denied' ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  Location access is blocked. You can still use the app by entering your location manually.
                </p>
              </div>
              <button
                onClick={handleUseManualEntry}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Enter Location Manually
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleRequestLocation}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Allow Location Access
              </button>
              
              {hasAttemptedLocation && state.error && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRetryLocation}
                    className="flex-1 py-2 px-3 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleUseManualEntry}
                    className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Enter Manually
                  </button>
                </div>
              )}
              
              {!hasAttemptedLocation && (
                <button
                  onClick={handleUseManualEntry}
                  className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Or enter location manually
                </button>
              )}
            </div>
          )}

          {/* Privacy note */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              🔒 Your location is only used to find nearby restaurants and is not stored or shared.
            </p>
          </div>
        </div>
      </div>

      {/* Manual location entry modal */}
      <ManualLocationEntry
        isOpen={showManualEntry}
        onLocationSet={handleManualLocationSet}
        onCancel={handleManualLocationCancel}
      />
    </>
  );
}