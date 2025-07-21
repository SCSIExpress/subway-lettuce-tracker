import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { 
  useNearbyLocations, 
  useLocationDetail, 
  useSubmitRating, 
  useLocationData
} from '../useLocationQueries';
import { Coordinates, SubwayLocation, SubmitRatingRequest } from '../../types';

// Mock fetch globally
global.fetch = vi.fn();

// Create a test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockLocation: SubwayLocation = {
  id: '1',
  name: 'Test Subway',
  address: '123 Test St',
  coordinates: { lat: 40.7128, lng: -74.0060 },
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
  lettuceScore: 4.2,
  recentlyRated: true,
  distanceFromUser: 100,
  isOpen: true,
};

const mockCoordinates: Coordinates = { lat: 40.7128, lng: -74.0060 };

describe('useLocationQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  describe('useNearbyLocations', () => {
    it('should fetch nearby locations successfully', async () => {
      const mockResponse = {
        locations: [mockLocation],
        userLocation: mockCoordinates,
        searchRadius: 5000,
        totalFound: 1,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useNearbyLocations(mockCoordinates),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/locations/nearby')
      );
    });

    it('should handle fetch errors gracefully', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () => useNearbyLocations(mockCoordinates),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should not fetch when coordinates are null', () => {
      const { result } = renderHook(
        () => useNearbyLocations(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.isIdle).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('useLocationDetail', () => {
    it('should fetch location detail successfully', async () => {
      const mockDetailResponse = {
        ...mockLocation,
        ratings: [],
        timeRecommendations: [],
        totalRatings: 0,
        averageScore: 0,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetailResponse,
      });

      const { result } = renderHook(
        () => useLocationDetail('1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDetailResponse);
      expect(fetch).toHaveBeenCalledWith('/api/locations/1');
    });

    it('should not fetch when locationId is null', () => {
      const { result } = renderHook(
        () => useLocationDetail(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.isIdle).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('useSubmitRating', () => {
    it('should submit rating successfully', async () => {
      const mockRatingRequest: SubmitRatingRequest = {
        locationId: '1',
        score: 5,
      };

      const mockRatingResponse = {
        rating: {
          id: 'rating-1',
          locationId: '1',
          score: 5,
          timestamp: new Date(),
        },
        newLocationScore: 4.5,
        message: 'Rating submitted successfully',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRatingResponse,
      });

      const { result } = renderHook(
        () => useSubmitRating(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(mockRatingRequest);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRatingResponse);
    });

    it('should handle rating submission errors', async () => {
      const mockRatingRequest: SubmitRatingRequest = {
        locationId: '1',
        score: 5,
      };

      (fetch as any).mockRejectedValueOnce(new Error('Submission failed'));

      const { result } = renderHook(
        () => useSubmitRating(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(mockRatingRequest);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useLocationData', () => {
    it('should integrate nearby locations with real-time updates', async () => {
      const mockResponse = {
        locations: [mockLocation],
        userLocation: mockCoordinates,
        searchRadius: 5000,
        totalFound: 1,
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useLocationData(mockCoordinates, {
          enableRealTimeUpdates: true,
          enableAutoRefresh: true,
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.locations).toEqual([mockLocation]);
      expect(result.current.error).toBeNull();
    });

    it('should return empty array when no user location', () => {
      const { result } = renderHook(
        () => useLocationData(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.locations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('Error Handling and Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retry failed requests with exponential backoff', async () => {
    // Mock first two calls to fail, third to succeed
    (fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ locations: [], userLocation: mockCoordinates, searchRadius: 5000, totalFound: 0 }),
      });

    const { result } = renderHook(
      () => useNearbyLocations(mockCoordinates),
      { wrapper: createWrapper() }
    );

    // Wait for the query to eventually succeed after retries
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 10000 });

    // Should have been called 3 times (initial + 2 retries)
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should not retry validation errors', async () => {
    (fetch as any).mockRejectedValue(new Error('400 Bad Request - validation error'));

    const { result } = renderHook(
      () => useNearbyLocations(mockCoordinates),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should only be called once (no retries for validation errors)
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});