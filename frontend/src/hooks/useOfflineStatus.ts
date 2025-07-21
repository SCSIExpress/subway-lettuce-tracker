import { useState, useEffect } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
}

export const useOfflineStatus = (): OfflineStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Keep track that we were offline for showing reconnection messages
      if (!navigator.onLine) {
        setWasOffline(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check periodically by trying to fetch a small resource
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to verify actual connectivity
        const response = await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        
        if (response.ok && !isOnline) {
          setIsOnline(true);
        }
      } catch (error) {
        if (isOnline) {
          setIsOnline(false);
          setWasOffline(true);
        }
      }
    };

    // Check connection every 30 seconds when offline
    const intervalId = setInterval(() => {
      if (!isOnline) {
        checkConnection();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  };
};

// Hook for managing offline-aware API calls
export const useOfflineAwareQuery = () => {
  const { isOnline, isOffline } = useOfflineStatus();

  const shouldRetry = (failureCount: number, error: any): boolean => {
    // Don't retry if we're offline
    if (isOffline) return false;
    
    // Don't retry client errors (4xx)
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as any).message.toLowerCase();
      if (message.includes('400') || message.includes('404') || message.includes('401')) {
        return false;
      }
    }
    
    // Retry up to 3 times for network errors
    return failureCount < 3;
  };

  const getRetryDelay = (attemptIndex: number): number => {
    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, attemptIndex), 10000);
    const jitter = Math.random() * 0.1 * baseDelay;
    return baseDelay + jitter;
  };

  return {
    isOnline,
    isOffline,
    shouldRetry,
    getRetryDelay,
  };
};