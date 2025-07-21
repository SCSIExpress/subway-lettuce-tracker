import React, { useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Coordinates, SubwayLocation } from '../types';

interface MapViewProps {
  userLocation: Coordinates;
  subwayLocations: SubwayLocation[];
  selectedLocation?: SubwayLocation;
  onLocationSelect: (location: SubwayLocation) => void;
  className?: string;
}

interface GoogleMapProps {
  userLocation: Coordinates;
  subwayLocations: SubwayLocation[];
  selectedLocation?: SubwayLocation;
  onLocationSelect: (location: SubwayLocation) => void;
}

// Map component that uses the Google Maps API directly
const GoogleMapComponent: React.FC<GoogleMapProps> = ({
  userLocation,
  subwayLocations,
  selectedLocation,
  onLocationSelect,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const subwayMarkersRef = useRef<google.maps.Marker[]>([]);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: userLocation,
      zoom: 13,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.business',
          stylers: [{ visibility: 'off' }],
        },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    // Create info window
    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      // Cleanup
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
      }
      subwayMarkersRef.current.forEach(marker => marker.setMap(null));
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
    };
  }, [userLocation]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // Create new user marker
    const userMarker = new google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 1000,
    });

    userMarkerRef.current = userMarker;

    // Center map on user location
    mapInstanceRef.current.setCenter(userLocation);
  }, [userLocation]);

  // Update Subway location markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers and clusterer
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }
    subwayMarkersRef.current.forEach(marker => marker.setMap(null));
    subwayMarkersRef.current = [];

    // Create new markers
    const markers = subwayLocations.map(location => {
      const marker = new google.maps.Marker({
        position: location.coordinates,
        title: location.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="${getMarkerColor(location)}" stroke="#ffffff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
      });

      // Add click listener
      marker.addListener('click', () => {
        onLocationSelect(location);
        showInfoWindow(marker, location);
      });

      return marker;
    });

    subwayMarkersRef.current = markers;

    // Create marker clusterer
    if (markers.length > 0) {
      markerClustererRef.current = new MarkerClusterer({
        map: mapInstanceRef.current,
        markers,
      });
    }
  }, [subwayLocations, onLocationSelect]);

  // Handle selected location
  useEffect(() => {
    if (!selectedLocation || !mapInstanceRef.current) return;

    // Find the marker for the selected location
    const selectedMarker = subwayMarkersRef.current.find(marker => 
      marker.getTitle() === selectedLocation.name
    );

    if (selectedMarker) {
      // Center map on selected location
      mapInstanceRef.current.setCenter(selectedLocation.coordinates);
      mapInstanceRef.current.setZoom(15);
      
      // Show info window
      showInfoWindow(selectedMarker, selectedLocation);
    }
  }, [selectedLocation]);

  const getMarkerColor = (location: SubwayLocation): string => {
    if (location.recentlyRated) return '#059669'; // green-600
    if (location.lettuceScore >= 4) return '#16a34a'; // green-600
    if (location.lettuceScore >= 3) return '#eab308'; // yellow-500
    if (location.lettuceScore >= 2) return '#f97316'; // orange-500
    if (location.lettuceScore >= 1) return '#dc2626'; // red-600
    return '#6b7280'; // gray-500 for unrated
  };

  const showInfoWindow = (marker: google.maps.Marker, location: SubwayLocation) => {
    if (!infoWindowRef.current) return;

    const content = `
      <div class="p-2 min-w-[200px]">
        <h3 class="font-semibold text-gray-800 mb-1">${location.name}</h3>
        <p class="text-sm text-gray-600 mb-2">${location.address}</p>
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <span class="text-sm font-medium">Lettuce Score:</span>
            <span class="ml-1 px-2 py-1 rounded text-xs font-bold text-white" 
                  style="background-color: ${getMarkerColor(location)}">
              ${location.lettuceScore > 0 ? location.lettuceScore.toFixed(1) : 'N/A'}
            </span>
          </div>
          ${location.recentlyRated ? '<span class="text-xs text-green-600 font-medium">Recently Rated</span>' : ''}
        </div>
        ${location.distanceFromUser ? `<p class="text-xs text-gray-500 mt-1">${(location.distanceFromUser / 1000).toFixed(1)} km away</p>` : ''}
      </div>
    `;

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(mapInstanceRef.current, marker);
  };

  return <div ref={mapRef} className="w-full h-full" />;
};

// Loading component
const MapLoading: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading map...</p>
    </div>
  </div>
);

// Error component with graceful degradation
const MapError: React.FC<{ error: Error; subwayLocations: SubwayLocation[]; onLocationSelect: (location: SubwayLocation) => void }> = ({ 
  error, 
  subwayLocations, 
  onLocationSelect 
}) => (
  <div className="w-full h-full flex flex-col bg-red-50">
    {/* Error message at top */}
    <div className="bg-red-100 border-b border-red-200 p-4">
      <div className="flex items-center gap-3">
        <div className="text-red-500 text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800">Map Unavailable</h3>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
    
    {/* Fallback list view */}
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h4 className="text-gray-800 font-medium mb-4">Nearby Subway Locations</h4>
        <div className="space-y-3">
          {subwayLocations.map((location) => (
            <div
              key={location.id}
              onClick={() => onLocationSelect(location)}
              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-800">{location.name}</h5>
                  <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                  {location.distanceFromUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(location.distanceFromUser / 1000).toFixed(1)} km away
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {location.recentlyRated && (
                    <span className="text-green-600 text-sm">🟢</span>
                  )}
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-800">
                      {location.lettuceScore > 0 ? location.lettuceScore.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Lettuce Score</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {subwayLocations.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📍</div>
            <p className="text-gray-600">No locations found</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Render function for the wrapper - needs to be inside MapView to access props
const createRender = (subwayLocations: SubwayLocation[], onLocationSelect: (location: SubwayLocation) => void) => 
  (status: Status): React.ReactElement => {
    switch (status) {
      case Status.LOADING:
        return <MapLoading />;
      case Status.FAILURE:
        return <MapError error={new Error('Failed to load Google Maps')} subwayLocations={subwayLocations} onLocationSelect={onLocationSelect} />;
      case Status.SUCCESS:
        return <div>Map loaded successfully</div>;
      default:
        return <MapLoading />;
    }
  };

// Main MapView component
const MapView: React.FC<MapViewProps> = ({
  userLocation,
  subwayLocations,
  selectedLocation,
  onLocationSelect,
  className = '',
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-yellow-50 ${className}`}>
        <div className="text-center p-6">
          <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Configuration Error</h3>
          <p className="text-yellow-600 text-sm">Google Maps API key is not configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <Wrapper apiKey={apiKey} render={createRender(subwayLocations, onLocationSelect)} libraries={['marker']}>
        <GoogleMapComponent
          userLocation={userLocation}
          subwayLocations={subwayLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={onLocationSelect}
        />
      </Wrapper>
    </div>
  );
};

export default MapView;