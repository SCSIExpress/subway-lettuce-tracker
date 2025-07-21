import React, { useState, useEffect } from 'react';
import { SubwayLocation } from '../types';
import { useSubmitRating, useLocationDetail } from '../hooks/useLocationQueries';

interface RatingModalProps {
  location: SubwayLocation;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (rating: number) => void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  location,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  
  const submitRatingMutation = useSubmitRating();
  const { data: locationDetail } = useLocationDetail(location.id, isOpen);

  // Reset rating when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRating(0);
      setHoveredRating(0);
    }
  }, [isOpen]);

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) return;

    try {
      await submitRatingMutation.mutateAsync({
        locationId: location.id,
        score: selectedRating,
      });
      
      if (onSubmit) {
        onSubmit(selectedRating);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const formatLastRated = (lastRated?: Date): string => {
    if (!lastRated) return 'Never rated';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastRated).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return new Date(lastRated).toLocaleDateString();
  };

  const getRatingDescription = (rating: number): string => {
    switch (rating) {
      case 1: return 'Very Poor - Wilted/Brown';
      case 2: return 'Poor - Not Fresh';
      case 3: return 'Fair - Acceptable';
      case 4: return 'Good - Fresh';
      case 5: return 'Excellent - Very Fresh';
      default: return 'Select a rating';
    }
  };

  const renderTimeRecommendations = () => {
    if (!locationDetail?.timeRecommendations || locationDetail.timeRecommendations.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Not enough data for time recommendations</p>
        </div>
      );
    }

    const sortedRecommendations = [...locationDetail.timeRecommendations]
      .sort((a, b) => b.averageScore - a.averageScore);

    return (
      <div className="space-y-2">
        {sortedRecommendations.map((rec) => (
          <div key={rec.period} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize">{rec.period}</span>
              <span className="text-xs text-gray-500">({rec.timeRange})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-sm ${
                      star <= rec.averageScore ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                ({rec.sampleSize} rating{rec.sampleSize !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:w-full max-h-[90vh] overflow-y-auto safe-area-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="spacing-mobile border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-responsive-lg font-bold text-gray-900 mb-1">
                  Rate Lettuce Freshness
                </h2>
                <p className="text-responsive-sm text-gray-600 truncate">
                  {location.name}
                </p>
                <p className="text-responsive-xs text-gray-500 mt-1">
                  {location.address}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-3 sm:ml-4 touch-target tap-target hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="spacing-mobile">
            {/* Current Score Display */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-responsive-xs text-gray-600 mb-1">Current Score</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      {location.lettuceScore > 0 ? location.lettuceScore.toFixed(1) : 'N/A'}
                    </span>
                    <div className="flex">
                      {location.lettuceScore > 0 ? (
                        [1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-base sm:text-lg ${
                              star <= location.lettuceScore ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-responsive-xs">No ratings yet</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-responsive-xs text-gray-500">Last rated</p>
                  <p className="text-responsive-xs font-medium text-gray-700">
                    {formatLastRated(location.lastRated)}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Selection */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-responsive-base font-semibold text-gray-900 mb-3 text-center">
                How fresh is the lettuce? 🥬
              </h3>
              
              {/* Star Rating */}
              <div className="flex justify-center gap-1 sm:gap-2 mb-4 touch-target">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingClick(rating)}
                    onMouseEnter={() => setHoveredRating(rating)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="text-3xl sm:text-4xl transition-all duration-150 hover:scale-110 focus:outline-none focus:scale-110 touch-target tap-target p-1"
                    aria-label={`Rate ${rating} star${rating !== 1 ? 's' : ''}`}
                  >
                    <span
                      className={`${
                        rating <= (hoveredRating || selectedRating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  </button>
                ))}
              </div>

              {/* Rating Description */}
              <div className="text-center">
                <p className="text-responsive-sm font-medium text-gray-700">
                  {getRatingDescription(hoveredRating || selectedRating)}
                </p>
              </div>
            </div>

            {/* Optimal Times Section */}
            {locationDetail && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-responsive-base font-semibold text-gray-900 mb-3">
                  Optimal Freshness Times
                </h3>
                {renderTimeRecommendations()}
              </div>
            )}

            {/* Error Display */}
            {submitRatingMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-responsive-xs text-red-700">
                  Failed to submit rating. Please try again.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="spacing-mobile border-t border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 sm:py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-medium transition-colors touch-target tap-target focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedRating === 0 || submitRatingMutation.isPending}
                className="flex-1 px-4 py-3 sm:py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors touch-target tap-target focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {submitRatingMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-responsive-xs">Submitting...</span>
                  </span>
                ) : (
                  <span className="text-responsive-xs">Submit Rating</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RatingModal;