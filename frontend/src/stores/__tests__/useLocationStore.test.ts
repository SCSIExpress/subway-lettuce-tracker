import { renderHook, act } from '@testing-library/react';
import { useLocationStore } from '../useLocationStore';
import { SubwayLocation } from '../../types';

describe('useLocationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLocationStore.setState({
      userLocation: null,
      locationPermission: null,
      mapState: {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 12,
        selectedLocationId: undefined,
      },
      locationPanel: {
        isOpen: false,
        selectedLocation: undefined,
        locations: [],
      },
      ratingModal: {
        isOpen: false,
        location: undefined,
      },
      isLoadingUserLocation: false,
      isLoadingLocations: false,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useLocationStore());

      expect(result.current.userLocation).toBeNull();
      expect(result.current.locationPermission).toBeNull();
      expect(result.current.mapState.center).toEqual({ lat: 40.7128, lng: -74.0060 });
      expect(result.current.mapState.zoom).toBe(12);
      expect(result.current.mapState.selectedLocationId).toBeUndefined();
      expect(result.current.locationPanel.isOpen).toBe(false);
      expect(result.current.ratingModal.isOpen).toBe(false);
      expect(result.current.isLoadingUserLocation).toBe(false);
      expect(result.current.isLoadingLocations).toBe(false);
    });
  });

  describe('user location actions', () => {
    it('sets user location', () => {
      const { result } = renderHook(() => useLocationStore());
      const userLocation = { lat: 40.7589, lng: -73.9851 };

      act(() => {
        result.current.setUserLocation(userLocation);
      });

      expect(result.current.userLocation).toEqual(userLocation);
    });

    it('clears user location', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.setUserLocation({ lat: 40.7589, lng: -73.9851 });
        result.current.setUserLocation(null);
      });

      expect(result.current.userLocation).toBeNull();
    });

    it('sets location permission', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.setLocationPermission('granted');
      });

      expect(result.current.locationPermission).toBe('granted');

      act(() => {
        result.current.setLocationPermission('denied');
      });

      expect(result.current.locationPermission).toBe('denied');
    });
  });

  describe('map actions', () => {
    it('sets map center', () => {
      const { result } = renderHook(() => useLocationStore());
      const newCenter = { lat: 34.0522, lng: -118.2437 };

      act(() => {
        result.current.setMapCenter(newCenter);
      });

      expect(result.current.mapState.center).toEqual(newCenter);
      expect(result.current.mapState.zoom).toBe(12); // Should not change
    });

    it('sets map zoom', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.setMapZoom(15);
      });

      expect(result.current.mapState.zoom).toBe(15);
      expect(result.current.mapState.center).toEqual({ lat: 40.7128, lng: -74.0060 }); // Should not change
    });

    it('sets selected location', () => {
      const { result } = renderHook(() => useLocationStore());
      const locationId = 'location-123';

      act(() => {
        result.current.setSelectedLocation(locationId);
      });

      expect(result.current.mapState.selectedLocationId).toBe(locationId);

      act(() => {
        result.current.setSelectedLocation(undefined);
      });

      expect(result.current.mapState.selectedLocationId).toBeUndefined();
    });
  });

  describe('location panel actions', () => {
    it('opens and closes location panel', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.openLocationPanel();
      });

      expect(result.current.locationPanel.isOpen).toBe(true);

      act(() => {
        result.current.closeLocationPanel();
      });

      expect(result.current.locationPanel.isOpen).toBe(false);
    });

    it('sets location panel data', () => {
      const { result } = renderHook(() => useLocationStore());
      const locations: SubwayLocation[] = [
        {
          id: '1',
          name: 'Subway Times Square',
          address: '123 Broadway, New York, NY',
          coordinates: { lat: 40.7589, lng: -73.9851 },
          hours: { open: '06:00', close: '23:00', isOpen: true },
          lettuceScore: 4.2,
          lastRated: new Date('2024-01-15T10:30:00Z'),
          recentlyRated: true,
          distanceFromUser: 500,
        },
      ];

      act(() => {
        result.current.setLocationPanelData(locations);
      });

      expect(result.current.locationPanel.locations).toEqual(locations);
    });

    it('selects location in panel', () => {
      const { result } = renderHook(() => useLocationStore());
      const location: SubwayLocation = {
        id: '1',
        name: 'Subway Times Square',
        address: '123 Broadway, New York, NY',
        coordinates: { lat: 40.7589, lng: -73.9851 },
        hours: { open: '06:00', close: '23:00', isOpen: true },
        lettuceScore: 4.2,
        lastRated: new Date('2024-01-15T10:30:00Z'),
        recentlyRated: true,
        distanceFromUser: 500,
      };

      act(() => {
        result.current.selectLocationInPanel(location);
      });

      expect(result.current.locationPanel.selectedLocation).toEqual(location);
    });
  });

  describe('rating modal actions', () => {
    it('opens and closes rating modal', () => {
      const { result } = renderHook(() => useLocationStore());
      const location: SubwayLocation = {
        id: '1',
        name: 'Subway Times Square',
        address: '123 Broadway, New York, NY',
        coordinates: { lat: 40.7589, lng: -73.9851 },
        hours: { open: '06:00', close: '23:00', isOpen: true },
        lettuceScore: 4.2,
        lastRated: new Date('2024-01-15T10:30:00Z'),
        recentlyRated: true,
        distanceFromUser: 500,
      };

      act(() => {
        result.current.openRatingModal(location);
      });

      expect(result.current.ratingModal.isOpen).toBe(true);
      expect(result.current.ratingModal.location).toEqual(location);

      act(() => {
        result.current.closeRatingModal();
      });

      expect(result.current.ratingModal.isOpen).toBe(false);
      expect(result.current.ratingModal.location).toBeUndefined();
    });
  });

  describe('loading actions', () => {
    it('sets loading states', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.setLoadingUserLocation(true);
      });

      expect(result.current.isLoadingUserLocation).toBe(true);

      act(() => {
        result.current.setLoadingLocations(true);
      });

      expect(result.current.isLoadingLocations).toBe(true);

      act(() => {
        result.current.setLoadingUserLocation(false);
        result.current.setLoadingLocations(false);
      });

      expect(result.current.isLoadingUserLocation).toBe(false);
      expect(result.current.isLoadingLocations).toBe(false);
    });
  });

  describe('state persistence', () => {
    it('maintains state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useLocationStore());
      const { result: result2 } = renderHook(() => useLocationStore());

      act(() => {
        result1.current.setUserLocation({ lat: 40.7589, lng: -73.9851 });
      });

      expect(result2.current.userLocation).toEqual({ lat: 40.7589, lng: -73.9851 });
    });
  });

  describe('complex state updates', () => {
    it('handles multiple simultaneous state updates', () => {
      const { result } = renderHook(() => useLocationStore());
      const userLocation = { lat: 40.7589, lng: -73.9851 };
      const mapCenter = { lat: 34.0522, lng: -118.2437 };

      act(() => {
        result.current.setUserLocation(userLocation);
        result.current.setMapCenter(mapCenter);
        result.current.setMapZoom(15);
        result.current.setLocationPermission('granted');
        result.current.openLocationPanel();
      });

      expect(result.current.userLocation).toEqual(userLocation);
      expect(result.current.mapState.center).toEqual(mapCenter);
      expect(result.current.mapState.zoom).toBe(15);
      expect(result.current.locationPermission).toBe('granted');
      expect(result.current.locationPanel.isOpen).toBe(true);
    });
  });
});