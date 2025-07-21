import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SubwayLocation } from '../types';
import LocationCard from './LocationCard';
import { OfflineMessage, useOfflineErrorMessage } from './OfflineIndicator';

interface LocationPanelProps {
  locations: SubwayLocation[];
  selectedLocation?: SubwayLocation;
  onLocationSelect: (location: SubwayLocation) => void;
  onRate: (locationId: string) => void;
  onDirections: (location: SubwayLocation) => void;
  isOpen: boolean;
  onToggle: () => void;
  dataUpdatedAt?: Date;
  isStale?: boolean;
  isRefetching?: boolean;
  error?: any;
  onRetry?: () => void;
}



// Main LocationPanel component
const LocationPanel: React.FC<LocationPanelProps> = ({
  locations,
  selectedLocation,
  onLocationSelect,
  onRate,
  onDirections,
  isOpen,
  onToggle,
  dataUpdatedAt,
  isStale = false,
  isRefetching = false,
  error,
  onRetry,
}) => {
  const [visibleLocations, setVisibleLocations] = useState<SubwayLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const ITEMS_PER_PAGE = 10;
  
  // Use the offline error message hook at the component level
  const { getErrorMessage, shouldShowRetry } = useOfflineErrorMessage();

  // Sort locations by distance
  const sortedLocations = React.useMemo(() => {
    return [...locations].sort((a, b) => {
      const distanceA = a.distanceFromUser || Infinity;
      const distanceB = b.distanceFromUser || Infinity;
      return distanceA - distanceB;
    });
  }, [locations]);

  // Initialize visible locations
  useEffect(() => {
    const initialItems = sortedLocations.slice(0, ITEMS_PER_PAGE);
    setVisibleLocations(initialItems);
    setHasMore(sortedLocations.length > ITEMS_PER_PAGE);
  }, [sortedLocations]);

  // Load more locations for infinite scroll
  const loadMoreLocations = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const currentLength = visibleLocations.length;
      const nextItems = sortedLocations.slice(currentLength, currentLength + ITEMS_PER_PAGE);
      
      setVisibleLocations(prev => [...prev, ...nextItems]);
      setHasMore(currentLength + nextItems.length < sortedLocations.length);
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore, visibleLocations.length, sortedLocations]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 100; // Load more when 100px from bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMoreLocations();
    }
  }, [loadMoreLocations]);

  // Touch gesture handlers for mobile compatibility
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;
    
    // If panel is closed and user swipes up, open it
    if (!isOpen && deltaY < -50) {
      onToggle();
      isDragging.current = true;
    }
    
    // If panel is open and user swipes down at the top, close it
    if (isOpen && deltaY > 50 && scrollContainerRef.current?.scrollTop === 0) {
      onToggle();
      isDragging.current = true;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40 transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Panel */}
      <div
        role="region"
        aria-label="Location panel"
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl sm:rounded-t-3xl shadow-2xl z-50 transition-transform duration-300 ease-out safe-area-bottom ${
          isOpen ? 'transform translate-y-0' : 'transform translate-y-[calc(100%-100px)] sm:translate-y-[calc(100%-120px)]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 sm:pt-3 pb-2 touch-target">
          <div
            className="w-10 sm:w-12 h-1 bg-gray-300 rounded-full cursor-pointer hover:bg-gray-400 transition-colors tap-target"
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Toggle location panel"
          />
        </div>

        {/* Header */}
        <div className="spacing-mobile-x pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-responsive-lg font-bold text-gray-800 truncate">Nearby Locations</h2>
                {isRefetching && (
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-responsive-xs text-gray-600">
                  {locations.length} location{locations.length !== 1 ? 's' : ''} found
                </p>
                {dataUpdatedAt && (
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                    isStale ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {isStale ? 'Updating...' : 'Live'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-target tap-target flex-shrink-0 ml-2"
              aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
            >
              <svg
                className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-600 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollContainerRef}
          className={`overflow-y-auto scrollbar-thin spacing-mobile-x py-3 sm:py-4 transition-all duration-300 ${
            isOpen ? 'max-h-[60vh] sm:max-h-[70vh]' : 'max-h-0'
          }`}
          onScroll={handleScroll}
        >
          {error ? (
            <OfflineMessage
              title="Unable to load locations"
              message={getErrorMessage(error)}
              showRetry={shouldShowRetry(error)}
              onRetry={onRetry}
              className="mx-2"
            />
          ) : visibleLocations.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="text-gray-400 text-3xl sm:text-4xl mb-3 sm:mb-4">🏪</div>
              <p className="text-responsive-sm text-gray-600">No Subway locations found nearby</p>
            </div>
          ) : (
            <>
              {visibleLocations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  isSelected={selectedLocation?.id === location.id}
                  onSelect={onLocationSelect}
                  onRate={onRate}
                  onDirections={onDirections}
                  showActions={true}
                  className="mb-3 sm:mb-4"
                  dataUpdatedAt={dataUpdatedAt}
                  isStale={isStale}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-center py-4 touch-target">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600" role="status" aria-label="Loading more locations"></div>
                </div>
              )}

              {/* End of list indicator */}
              {!hasMore && visibleLocations.length > 0 && (
                <div className="text-center py-4 text-gray-500 text-responsive-xs">
                  You've reached the end of the list
                </div>
              )}
            </>
          )}
        </div>

        {/* Collapsed preview - show when panel is closed */}
        {!isOpen && sortedLocations.length > 0 && (
          <div className="spacing-mobile-x pb-3 sm:pb-4">
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 tap-target" onClick={onToggle}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-responsive-sm font-medium text-gray-800 truncate">
                    Closest: {sortedLocations[0]?.name}
                  </p>
                  <p className="text-responsive-xs text-gray-600 mt-0.5">
                    {sortedLocations[0]?.distanceFromUser && 
                      `${(sortedLocations[0].distanceFromUser / 1000).toFixed(1)}km away`
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    sortedLocations[0]?.lettuceScore >= 4 ? 'bg-green-500' :
                    sortedLocations[0]?.lettuceScore >= 3 ? 'bg-yellow-500' :
                    sortedLocations[0]?.lettuceScore >= 2 ? 'bg-orange-500' :
                    sortedLocations[0]?.lettuceScore >= 1 ? 'bg-red-500' : 'bg-gray-400'
                  }`}>
                    {sortedLocations[0]?.lettuceScore > 0 ? sortedLocations[0].lettuceScore.toFixed(1) : 'N/A'}
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LocationPanel;