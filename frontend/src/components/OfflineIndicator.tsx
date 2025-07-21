import React, { useState, useEffect } from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

interface OfflineIndicatorProps {
  className?: string;
  showReconnectedMessage?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showReconnectedMessage = true,
}) => {
  const { isOnline, wasOffline } = useOfflineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show reconnected message when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && showReconnectedMessage) {
      setShowReconnected(true);
      
      // Hide the reconnected message after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, showReconnectedMessage]);

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
          <span className="text-sm">✅</span>
          <span className="text-sm font-medium">Back online!</span>
        </div>
      </div>
    );
  }

  // Don't show anything when online
  if (isOnline) {
    return null;
  }

  // Show offline indicator
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="bg-red-500 text-white px-4 py-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">📡</span>
          <span className="text-sm font-medium">You're offline</span>
          <span className="text-xs opacity-75">• Some features may not work</span>
        </div>
      </div>
    </div>
  );
};

// Component for showing offline message in specific areas
interface OfflineMessageProps {
  title?: string;
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
}

export const OfflineMessage: React.FC<OfflineMessageProps> = ({
  title = 'You\'re offline',
  message = 'Check your internet connection and try again.',
  showRetry = true,
  onRetry,
  className = '',
}) => {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">📡</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

// Hook for showing offline-aware error messages
export const useOfflineErrorMessage = () => {
  const { isOffline } = useOfflineStatus();

  const getErrorMessage = (error: any): string => {
    if (isOffline) {
      return 'You\'re currently offline. Please check your internet connection.';
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as any).message.toLowerCase();
      
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      
      if (message.includes('500')) {
        return 'Server error. Please try again in a moment.';
      }
      
      if (message.includes('404')) {
        return 'The requested resource was not found.';
      }
      
      if (message.includes('401') || message.includes('403')) {
        return 'Access denied. Please check your permissions.';
      }
    }

    return 'Something went wrong. Please try again.';
  };

  const shouldShowRetry = (error: any): boolean => {
    if (isOffline) return true;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as any).message.toLowerCase();
      // Don't show retry for client errors that won't be fixed by retrying
      if (message.includes('401') || message.includes('403') || message.includes('404')) {
        return false;
      }
    }
    
    return true;
  };

  return {
    isOffline,
    getErrorMessage,
    shouldShowRetry,
  };
};

export default OfflineIndicator;