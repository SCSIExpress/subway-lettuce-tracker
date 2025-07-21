import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  SubwayLocationDetail, 
  NearbyLocationsResponse, 
  SubmitRatingRequest, 
  SubmitRatingResponse,
  Coordinates,
  SubwayLocation 
} from '../types';
import { useOfflineAwareQuery } from './useOfflineStatus';

// API base URL
const API_BASE = '/api';

// Query keys
export const locationKeys = {
  all: ['locations'] as const,
  nearby: (coords: Coordinates, radius?: number) => 
    [...locationKeys.all, 'nearby', coords, radius] as const,
  detail: (id: string) => [...locationKeys.all, 'detail', id] as const,
  ratings: (id: string) => [...locationKeys.all, 'ratings', id] as const,
};

// API functions
const fetchNearbyLocations = async (
  lat: number, 
  lng: number, 
  radius = 5000, 
  limit = 20
): Promise<NearbyLocationsResponse> => {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radius.toString(),
    limit: limit.toString(),
  });
  
  const response = await fetch(`${API_BASE}/locations/nearby?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch nearby locations: ${response.statusText}`);
  }
  
  return response.json();
};

const fetchLocationDetail = async (id: string): Promise<SubwayLocationDetail> => {
  const response = await fetch(`${API_BASE}/locations/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch location detail: ${response.statusText}`);
  }
  
  return response.json();
};

const submitRating = async (request: SubmitRatingRequest): Promise<SubmitRatingResponse> => {
  const response = await fetch(`${API_BASE}/locations/${request.locationId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      score: request.score,
      userId: request.userId,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to submit rating: ${response.statusText}`);
  }
  
  return response.json();
};

// React Query hooks with real-time updates
export const useNearbyLocations = (
  coordinates: Coordinates | null,
  radius = 5000,
  limit = 20,
  enabled = true,
  options?: {
    enableRealTimeUpdates?: boolean;
    refetchInterval?: number;
  }
) => {
  const { enableRealTimeUpdates = true, refetchInterval = 2 * 60 * 1000 } = options || {};
  const { shouldRetry, getRetryDelay, isOffline } = useOfflineAwareQuery();

  return useQuery({
    queryKey: locationKeys.nearby(coordinates || { lat: 0, lng: 0 }, radius),
    queryFn: () => {
      if (!coordinates) {
        throw new Error('Coordinates are required');
      }
      return fetchNearbyLocations(coordinates.lat, coordinates.lng, radius, limit);
    },
    enabled: enabled && !!coordinates,
    staleTime: 1 * 60 * 1000, // 1 minute - shorter for real-time feel
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: shouldRetry,
    retryDelay: getRetryDelay,
    // Enable background refetching for real-time updates, but not when offline
    refetchInterval: enableRealTimeUpdates && !isOffline ? refetchInterval : false,
    refetchIntervalInBackground: false, // Only refetch when tab is active
    refetchOnWindowFocus: !isOffline,
    refetchOnReconnect: true,
  });
};

export const useLocationDetail = (
  locationId: string | null, 
  enabled = true,
  options?: {
    enableRealTimeUpdates?: boolean;
    refetchInterval?: number;
  }
) => {
  const { enableRealTimeUpdates = true, refetchInterval = 30 * 1000 } = options || {};
  const { shouldRetry, getRetryDelay, isOffline } = useOfflineAwareQuery();

  return useQuery({
    queryKey: locationKeys.detail(locationId || ''),
    queryFn: () => {
      if (!locationId) {
        throw new Error('Location ID is required');
      }
      return fetchLocationDetail(locationId);
    },
    enabled: enabled && !!locationId,
    staleTime: 30 * 1000, // 30 seconds - very fresh for active locations
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: shouldRetry,
    retryDelay: getRetryDelay,
    // Enable frequent updates for location details, but not when offline
    refetchInterval: enableRealTimeUpdates && !isOffline ? refetchInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: !isOffline,
    refetchOnReconnect: true,
  });
};

export const useSubmitRating = () => {
  const queryClient = useQueryClient();
  const { shouldRetry, getRetryDelay } = useOfflineAwareQuery();
  
  return useMutation({
    mutationFn: submitRating,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: locationKeys.detail(variables.locationId) });
      await queryClient.cancelQueries({ queryKey: locationKeys.all });

      // Snapshot the previous values
      const previousLocationDetail = queryClient.getQueryData(locationKeys.detail(variables.locationId));
      const previousNearbyLocations = queryClient.getQueriesData({ queryKey: locationKeys.all });

      // Optimistically update location detail
      queryClient.setQueryData(
        locationKeys.detail(variables.locationId),
        (oldData: SubwayLocationDetail | undefined) => {
          if (oldData) {
            // Calculate optimistic new score (rough estimate)
            const currentRatings = oldData.ratings || [];
            const recentRatings = currentRatings.slice(-9); // Keep last 9 + new one = 10
            const newRating = {
              id: 'temp-' + Date.now(),
              locationId: variables.locationId,
              score: variables.score,
              timestamp: new Date(),
              userId: variables.userId,
            };
            const allRatings = [...recentRatings, newRating];
            
            // Simple weighted average calculation
            const totalWeight = allRatings.reduce((sum, _rating, index) => {
              const weight = Math.pow(0.9, allRatings.length - 1 - index);
              return sum + weight;
            }, 0);
            
            const weightedSum = allRatings.reduce((sum, rating, index) => {
              const weight = Math.pow(0.9, allRatings.length - 1 - index);
              return sum + (rating.score * weight);
            }, 0);
            
            const optimisticScore = weightedSum / totalWeight;

            return {
              ...oldData,
              lettuceScore: optimisticScore,
              lastRated: new Date(),
              recentlyRated: true,
              ratings: allRatings,
              totalRatings: (oldData.totalRatings || 0) + 1,
            };
          }
          return oldData;
        }
      );

      // Optimistically update nearby locations
      previousNearbyLocations.forEach(([queryKey, queryData]) => {
        if (queryData && typeof queryData === 'object' && 'locations' in queryData) {
          const nearbyData = queryData as NearbyLocationsResponse;
          const updatedLocations = nearbyData.locations.map((location: SubwayLocation) => {
            if (location.id === variables.locationId) {
              // Use the same optimistic calculation logic
              const optimisticScore = Math.min(5, Math.max(1, 
                (location.lettuceScore * 9 + variables.score) / 10
              ));
              
              return {
                ...location,
                lettuceScore: optimisticScore,
                lastRated: new Date(),
                recentlyRated: true,
              };
            }
            return location;
          });

          queryClient.setQueryData(queryKey, {
            ...nearbyData,
            locations: updatedLocations,
          });
        }
      });

      // Return a context object with the snapshotted values
      return { previousLocationDetail, previousNearbyLocations };
    },
    onSuccess: (data, variables, _context) => {
      // Update with real data from server
      queryClient.setQueryData(
        locationKeys.detail(variables.locationId),
        (oldData: SubwayLocationDetail | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              lettuceScore: data.newLocationScore,
              lastRated: new Date(),
              recentlyRated: true,
            };
          }
          return oldData;
        }
      );

      // Update nearby locations with real score
      const nearbyQueries = queryClient.getQueriesData({ queryKey: locationKeys.all });
      nearbyQueries.forEach(([queryKey, queryData]) => {
        if (queryData && typeof queryData === 'object' && 'locations' in queryData) {
          const nearbyData = queryData as NearbyLocationsResponse;
          const updatedLocations = nearbyData.locations.map((location: SubwayLocation) => {
            if (location.id === variables.locationId) {
              return {
                ...location,
                lettuceScore: data.newLocationScore,
                lastRated: new Date(),
                recentlyRated: true,
              };
            }
            return location;
          });

          queryClient.setQueryData(queryKey, {
            ...nearbyData,
            locations: updatedLocations,
          });
        }
      });

      // Invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({ 
        queryKey: locationKeys.detail(variables.locationId),
        refetchType: 'none' // Don't refetch immediately since we just updated
      });
    },
    onError: (error, variables, context) => {
      console.error('Failed to submit rating:', error);
      
      // Revert optimistic updates on error
      if (context?.previousLocationDetail !== undefined) {
        queryClient.setQueryData(
          locationKeys.detail(variables.locationId),
          context.previousLocationDetail
        );
      }

      if (context?.previousNearbyLocations) {
        context.previousNearbyLocations.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
    },
    retry: shouldRetry,
    retryDelay: getRetryDelay,
  });
};

// Hook for real-time score monitoring of a specific location
export const useRealTimeLocationScore = (
  locationId: string | null,
  enabled = true
) => {
  return useQuery({
    queryKey: [...locationKeys.detail(locationId || ''), 'score'],
    queryFn: async () => {
      if (!locationId) throw new Error('Location ID is required');
      
      const response = await fetch(`${API_BASE}/locations/${locationId}/ratings/summary`);
      if (!response.ok) {
        throw new Error(`Failed to fetch location score: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: enabled && !!locationId,
    staleTime: 10 * 1000, // 10 seconds - very fresh for score updates
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for real-time feel
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });
};

// Hook for managing automatic data refresh with smart intervals
export const useAutoRefresh = (
  userLocation: Coordinates | null,
  options?: {
    enableAutoRefresh?: boolean;
    baseInterval?: number;
    maxInterval?: number;
    backoffMultiplier?: number;
  }
) => {
  const {
    enableAutoRefresh = true,
    baseInterval = 30 * 1000, // 30 seconds
    maxInterval = 5 * 60 * 1000, // 5 minutes
    backoffMultiplier = 1.5,
  } = options || {};

  const queryClient = useQueryClient();

  // Smart refresh logic that adjusts interval based on activity
  const refreshData = React.useCallback(async () => {
    if (!userLocation || !enableAutoRefresh) return;

    try {
      // Invalidate and refetch nearby locations
      await queryClient.invalidateQueries({ 
        queryKey: locationKeys.nearby(userLocation),
        refetchType: 'active'
      });
    } catch (error) {
      console.warn('Auto-refresh failed:', error);
    }
  }, [userLocation, enableAutoRefresh, queryClient]);

  // Set up interval with exponential backoff on errors
  React.useEffect(() => {
    if (!enableAutoRefresh) return;

    let currentInterval = baseInterval;
    let timeoutId: number;

    const scheduleNext = () => {
      timeoutId = setTimeout(async () => {
        try {
          await refreshData();
          currentInterval = baseInterval; // Reset on success
        } catch (error) {
          currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
        }
        scheduleNext();
      }, currentInterval);
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enableAutoRefresh, baseInterval, maxInterval, backoffMultiplier, refreshData]);

  return { refreshData };
};

// Enhanced hook for managing location queries with real-time updates
export const useLocationData = (
  userLocation: Coordinates | null,
  options?: {
    enableRealTimeUpdates?: boolean;
    enableAutoRefresh?: boolean;
  }
) => {
  const { enableRealTimeUpdates = true, enableAutoRefresh = true } = options || {};
  
  const nearbyQuery = useNearbyLocations(userLocation, 5000, 20, true, {
    enableRealTimeUpdates,
    refetchInterval: enableRealTimeUpdates ? 2 * 60 * 1000 : undefined,
  });

  // Set up auto-refresh
  useAutoRefresh(userLocation, {
    enableAutoRefresh,
  });
  
  return {
    locations: nearbyQuery.data?.locations || [],
    isLoading: nearbyQuery.isLoading,
    error: nearbyQuery.error,
    refetch: nearbyQuery.refetch,
    isRefetching: nearbyQuery.isRefetching,
    isFetching: nearbyQuery.isFetching,
    dataUpdatedAt: nearbyQuery.dataUpdatedAt,
    isStale: nearbyQuery.isStale,
  };
};

// Hook for data synchronization status
export const useDataSyncStatus = () => {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = React.useState<{
    isSyncing: boolean;
    lastSyncTime: Date | null;
    failedQueries: number;
  }>({
    isSyncing: false,
    lastSyncTime: null,
    failedQueries: 0,
  });

  React.useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'added' || event.type === 'updated') {
        const query = event.query;
        
        if (query.state.status === 'pending') {
          setSyncStatus(prev => ({ ...prev, isSyncing: true }));
        } else {
          setSyncStatus(prev => ({
            isSyncing: false,
            lastSyncTime: new Date(),
            failedQueries: query.state.error ? prev.failedQueries + 1 : 0,
          }));
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return syncStatus;
};