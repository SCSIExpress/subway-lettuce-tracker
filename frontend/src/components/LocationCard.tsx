import React from 'react';
import { SubwayLocation } from '../types';
import { DataFreshnessIndicator } from './DataSyncIndicator';

interface LocationCardProps {
  location: SubwayLocation;
  isSelected?: boolean;
  onSelect?: (location: SubwayLocation) => void;
  onRate?: (locationId: string) => void;
  onDirections?: (location: SubwayLocation) => void;
  showActions?: boolean;
  className?: string;
  dataUpdatedAt?: Date;
  isStale?: boolean;
}

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  isSelected = false,
  onSelect,
  onRate,
  onDirections,
  showActions = true,
  className = '',
  dataUpdatedAt,
  isStale = false,
}) => {
  const formatDistance = (distance?: number): string => {
    if (distance === undefined || distance === null) return '';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4.5) return 'bg-green-600';
    if (score >= 4) return 'bg-green-500';
    if (score >= 3.5) return 'bg-yellow-500';
    if (score >= 3) return 'bg-yellow-600';
    if (score >= 2.5) return 'bg-orange-500';
    if (score >= 2) return 'bg-orange-600';
    if (score >= 1) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 4.5) return 'text-green-700';
    if (score >= 4) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    if (score >= 3) return 'text-yellow-700';
    if (score >= 2.5) return 'text-orange-600';
    if (score >= 2) return 'text-orange-700';
    if (score >= 1) return 'text-red-600';
    return 'text-gray-500';
  };

  const renderStars = (score: number): JSX.Element[] => {
    const stars = [];
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={`full-${i}`} className="text-yellow-400 text-lg">
          ★
        </span>
      );
    }
    
    // Half star
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400 text-lg relative">
          <span className="absolute inset-0">☆</span>
          <span className="absolute inset-0 overflow-hidden w-1/2">★</span>
        </span>
      );
    }
    
    // Empty stars
    const emptyStars = 5 - Math.ceil(score);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300 text-lg">
          ☆
        </span>
      );
    }
    
    return stars;
  };

  const getCurrentStatus = (): { isOpen: boolean; text: string; color: string } => {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()] as keyof typeof location.hours;
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const todayHours = location.hours[currentDay];
    
    // Handle case where hours might be undefined or in wrong format
    if (typeof todayHours === 'string' || !todayHours) {
      return { isOpen: false, text: 'Hours unavailable', color: 'text-gray-500' };
    }
    
    if (todayHours.closed) {
      return { isOpen: false, text: 'Closed today', color: 'text-red-600' };
    }

    // Parse time strings (assuming format like "09:00" or "9:00")
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 100 + (minutes || 0);
    };

    const openTime = parseTime(todayHours.open);
    const closeTime = parseTime(todayHours.close);
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    
    if (isOpen) {
      return { 
        isOpen: true, 
        text: `Open until ${todayHours.close}`, 
        color: 'text-green-600' 
      };
    } else if (currentTime < openTime) {
      return { 
        isOpen: false, 
        text: `Opens at ${todayHours.open}`, 
        color: 'text-orange-600' 
      };
    } else {
      return { 
        isOpen: false, 
        text: 'Closed', 
        color: 'text-red-600' 
      };
    }
  };

  const formatLastRated = (lastRated?: Date): string => {
    if (!lastRated) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastRated).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just rated';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(lastRated).toLocaleDateString();
  };

  const status = getCurrentStatus();
  const hasValidScore = location.lettuceScore > 0;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(location);
    }
  };

  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRate) {
      onRate(location.id);
    }
  };

  const handleDirectionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDirections) {
      onDirections(location);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 tap-target ${
        isSelected ? 'ring-2 ring-green-500 shadow-lg' : ''
      } ${onSelect ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleCardClick}
      role={onSelect ? 'button' : 'article'}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      } : undefined}
      aria-label={onSelect ? `Select ${location.name}` : undefined}
    >
      <div className="spacing-mobile">
        {/* Header with name, distance, and recently rated indicator */}
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-responsive-base leading-tight truncate">
                {location.name}
              </h3>
              {location.recentlyRated && (
                <div 
                  className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full flex-shrink-0"
                  title="Recently rated within the last 2 hours"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-700 font-medium whitespace-nowrap">
                    Fresh
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-responsive-xs leading-relaxed">
              {location.address}
            </p>
          </div>
          
          {location.distanceFromUser !== undefined && location.distanceFromUser !== null && (
            <div className="text-right ml-2 sm:ml-3 flex-shrink-0">
              <span className="text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                {formatDistance(location.distanceFromUser)}
              </span>
            </div>
          )}
        </div>

        {/* Score display with stars and colors */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Numerical score badge */}
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-sm flex-shrink-0 ${
                  hasValidScore ? getScoreColor(location.lettuceScore) : 'bg-gray-400'
                }`}
                title={hasValidScore ? `Lettuce freshness score: ${location.lettuceScore.toFixed(1)}/5` : 'No ratings yet'}
              >
                {hasValidScore ? location.lettuceScore.toFixed(1) : 'N/A'}
              </div>
              
              {/* Star rating */}
              <div className="flex items-center gap-0.5 min-w-0">
                {hasValidScore ? (
                  <div className="flex items-center gap-0.5">
                    {renderStars(location.lettuceScore).map((star, index) => (
                      <span key={index} className="text-sm sm:text-lg">
                        {star}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-responsive-xs">No ratings</span>
                )}
              </div>
            </div>

            {/* Score text description */}
            {hasValidScore && (
              <div className="hidden md:block flex-shrink-0">
                <span className={`text-responsive-xs font-medium ${getScoreTextColor(location.lettuceScore)}`}>
                  {location.lettuceScore >= 4.5 ? 'Excellent' :
                   location.lettuceScore >= 4 ? 'Very Good' :
                   location.lettuceScore >= 3.5 ? 'Good' :
                   location.lettuceScore >= 3 ? 'Fair' :
                   location.lettuceScore >= 2 ? 'Poor' : 'Very Poor'}
                </span>
              </div>
            )}
          </div>

          {/* Open/closed status */}
          <div className="text-right flex-shrink-0 ml-2">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-medium ${status.color} whitespace-nowrap`}>
                {status.text}
              </span>
            </div>
          </div>
        </div>

        {/* Last rated information and data freshness */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between flex-wrap gap-2">
          {location.lastRated && (
            <span className="text-responsive-xs text-gray-500">
              Last rated: {formatLastRated(location.lastRated)}
            </span>
          )}
          <DataFreshnessIndicator 
            lastUpdated={dataUpdatedAt}
            isStale={isStale}
            className="ml-auto flex-shrink-0"
          />
        </div>

        {/* Action buttons - show when selected or always if showActions is true */}
        {showActions && (isSelected || !onSelect) && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
            {onRate && (
              <button
                onClick={handleRateClick}
                className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 sm:py-2.5 px-4 rounded-xl text-responsive-xs font-medium transition-colors touch-target tap-target focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label={`Rate lettuce freshness at ${location.name}`}
              >
                <span className="flex items-center justify-center gap-1.5 sm:gap-1">
                  <span>Rate Lettuce</span>
                  <span className="text-base sm:text-lg">🥬</span>
                </span>
              </button>
            )}
            {onDirections && (
              <button
                onClick={handleDirectionsClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 sm:py-2.5 px-4 rounded-xl text-responsive-xs font-medium transition-colors touch-target tap-target focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Get directions to ${location.name}`}
              >
                <span className="flex items-center justify-center gap-1.5 sm:gap-1">
                  <span>Directions</span>
                  <span className="text-base sm:text-lg">🧭</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationCard;