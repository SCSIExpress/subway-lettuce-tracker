import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SubwayLocation, UserLocation, MapState, LocationPanelState, RatingModalState } from '../types';

interface LocationStore {
  // User location state
  userLocation: UserLocation | null;
  locationPermission: 'granted' | 'denied' | 'prompt' | null;
  
  // Map state
  mapState: MapState;
  
  // Location panel state
  locationPanel: LocationPanelState;
  
  // Rating modal state
  ratingModal: RatingModalState;
  
  // Loading states
  isLoadingUserLocation: boolean;
  isLoadingLocations: boolean;
  
  // Actions
  setUserLocation: (location: UserLocation | null) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'prompt') => void;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setSelectedLocation: (locationId: string | undefined) => void;
  
  // Location panel actions
  openLocationPanel: () => void;
  closeLocationPanel: () => void;
  setLocationPanelData: (locations: SubwayLocation[]) => void;
  selectLocationInPanel: (location: SubwayLocation) => void;
  
  // Rating modal actions
  openRatingModal: (location: SubwayLocation) => void;
  closeRatingModal: () => void;
  
  // Loading actions
  setLoadingUserLocation: (loading: boolean) => void;
  setLoadingLocations: (loading: boolean) => void;
}

export const useLocationStore = create<LocationStore>()(
  devtools(
    (set) => ({
      // Initial state
      userLocation: null,
      locationPermission: null,
      mapState: {
        center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
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

      // User location actions
      setUserLocation: (location) => 
        set({ userLocation: location }, false, 'setUserLocation'),
      
      setLocationPermission: (permission) => 
        set({ locationPermission: permission }, false, 'setLocationPermission'),

      // Map actions
      setMapCenter: (center) => 
        set((state) => ({
          mapState: { ...state.mapState, center }
        }), false, 'setMapCenter'),
      
      setMapZoom: (zoom) => 
        set((state) => ({
          mapState: { ...state.mapState, zoom }
        }), false, 'setMapZoom'),
      
      setSelectedLocation: (locationId) => 
        set((state) => ({
          mapState: { ...state.mapState, selectedLocationId: locationId }
        }), false, 'setSelectedLocation'),

      // Location panel actions
      openLocationPanel: () => 
        set((state) => ({
          locationPanel: { ...state.locationPanel, isOpen: true }
        }), false, 'openLocationPanel'),
      
      closeLocationPanel: () => 
        set((state) => ({
          locationPanel: { ...state.locationPanel, isOpen: false }
        }), false, 'closeLocationPanel'),
      
      setLocationPanelData: (locations) => 
        set((state) => ({
          locationPanel: { ...state.locationPanel, locations }
        }), false, 'setLocationPanelData'),
      
      selectLocationInPanel: (location) => 
        set((state) => ({
          locationPanel: { ...state.locationPanel, selectedLocation: location }
        }), false, 'selectLocationInPanel'),

      // Rating modal actions
      openRatingModal: (location) => 
        set({
          ratingModal: { isOpen: true, location }
        }, false, 'openRatingModal'),
      
      closeRatingModal: () => 
        set({
          ratingModal: { isOpen: false, location: undefined }
        }, false, 'closeRatingModal'),

      // Loading actions
      setLoadingUserLocation: (loading) => 
        set({ isLoadingUserLocation: loading }, false, 'setLoadingUserLocation'),
      
      setLoadingLocations: (loading) => 
        set({ isLoadingLocations: loading }, false, 'setLoadingLocations'),
    }),
    {
      name: 'location-store',
    }
  )
);