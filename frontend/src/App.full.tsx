import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LocationProvider } from './contexts/LocationContext';
import { 
  LocationPermissionHandler, 
  MapView, 
  LocationPanel, 
  RatingModal, 
  ErrorBoundary,
  QueryErrorBoundary,
  DataSyncIndicator,
  OfflineIndicator 
} from './components';
import { SubwayLocation } from './types';
import { directionsService } from './services';
import { useLocationData } from './hooks/useLocationQueries';
import { useState } from 'react';

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Sample Subway locations for demonstration
const sampleSubwayLocations: SubwayLocation[] = [
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
  {
    id: '3',
    name: 'Subway - Union Square',
    address: '4 Union Square S, New York, NY 10003',
    coordinates: { lat: 40.7359, lng: -73.9911 },
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
    lettuceScore: 2.9,
    recentlyRated: false,
    distanceFromUser: 320,
    isOpen: true,
  },
];

// Main App component with real-time data integration
const AppContent: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<SubwayLocation | undefined>();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [locationToRate, setLocationToRate] = useState<SubwayLocation | undefined>();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Use real-time location data
  const { 
    locations, 
    isLoading, 
    error, 
    refetch, 
    isRefetching,
    dataUpdatedAt,
    isStale 
  } = useLocationData(userLocation, {
    enableRealTimeUpdates: true,
    enableAutoRefresh: true,
  });

  // Fallback to sample data if API is not available
  const displayLocations = locations.length > 0 ? locations : sampleSubwayLocations;

  const handleLocationSelect = (location: SubwayLocation) => {
    setSelectedLocation(location);
    if (!isPanelOpen) {
      setIsPanelOpen(true);
    }
  };

  const handleRate = (locationId: string) => {
    const location = displayLocations.find(loc => loc.id === locationId);
    if (location) {
      setLocationToRate(location);
      setRatingModalOpen(true);
    }
  };

  const handleRatingSubmit = (rating: number) => {
    console.log('Rating submitted:', rating, 'for location:', locationToRate?.name);
    // The rating submission is handled by the RatingModal component via the useSubmitRating hook
  };

  const handleRatingModalClose = () => {
    setRatingModalOpen(false);
    setLocationToRate(undefined);
  };

  const handleDirections = async (location: SubwayLocation) => {
    try {
      console.log('Getting directions to:', location.name);
      await directionsService.openDirections(location);
    } catch (error) {
      console.error('Failed to open directions:', error);
      
      // Show user-friendly error message
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as any).message 
        : 'Unable to open directions. Please try again.';
      
      // For now, show an alert. In a production app, you'd use a toast notification
      alert(`Directions Error: ${errorMessage}`);
      
      // Fallback: try to open basic Google Maps URL
      try {
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
        window.open(fallbackUrl, '_blank');
      } catch (fallbackError) {
        console.error('Fallback directions also failed:', fallbackError);
      }
    }
  };

  return (
    <ErrorBoundary>
      <OfflineIndicator />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header with bento box design principles and sync indicator */}
        <header className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 sm:p-4 shadow-lg safe-area-top flex-shrink-0">
          <div className="container mx-auto flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">🥬 Leaf App</h1>
              <p className="text-green-100 text-xs sm:text-sm hidden xs:block">Find the freshest lettuce at Subway</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <DataSyncIndicator className="text-white" />
              {(isLoading || isRefetching) && (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>
        </header>

        {/* Main content area with location handling */}
        <main className="relative flex-1 min-h-0">
          <QueryErrorBoundary>
            <LocationPermissionHandler
              onLocationObtained={(location) => {
                console.log('Location obtained:', location);
                setUserLocation({ lat: location.lat, lng: location.lng });
              }}
            >
              {(location) => (
                <div className="absolute inset-0">
                  {location ? (
                    <>
                      <MapView
                        userLocation={location}
                        subwayLocations={displayLocations}
                        selectedLocation={selectedLocation}
                        onLocationSelect={handleLocationSelect}
                      />
                      <LocationPanel
                        locations={displayLocations}
                        selectedLocation={selectedLocation}
                        onLocationSelect={handleLocationSelect}
                        onRate={handleRate}
                        onDirections={handleDirections}
                        isOpen={isPanelOpen}
                        onToggle={() => setIsPanelOpen(!isPanelOpen)}
                        dataUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined}
                        isStale={isStale}
                        isRefetching={isRefetching}
                        error={error}
                        onRetry={() => refetch()}
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <div className="bg-white rounded-2xl shadow-xl p-8 mx-4 max-w-md text-center">
                        <div className="mb-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🗺️</span>
                          </div>
                          <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Welcome to Leaf App
                          </h2>
                          <p className="text-gray-600 text-sm">
                            Your crowd-sourced guide to fresh lettuce at Subway locations.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </LocationPermissionHandler>
          </QueryErrorBoundary>
        </main>

        {/* Error display for data loading issues */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <h4 className="text-red-800 font-medium text-sm">Data Loading Issue</h4>
                <p className="text-red-600 text-xs mt-1">
                  Using cached data. Check your connection.
                </p>
                <button
                  onClick={() => refetch()}
                  className="text-red-700 text-xs underline mt-2 hover:no-underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Rating Modal */}
      {locationToRate && (
        <RatingModal
          location={locationToRate}
          isOpen={ratingModalOpen}
          onClose={handleRatingModalClose}
          onSubmit={handleRatingSubmit}
        />
      )}
    </ErrorBoundary>
  );
};

// Main App component with providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <AppContent />
        
        {/* React Query DevTools - only in development */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </LocationProvider>
    </QueryClientProvider>
  );
}

export default App;