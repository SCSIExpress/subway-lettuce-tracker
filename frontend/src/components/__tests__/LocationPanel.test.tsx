import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LocationPanel from '../LocationPanel';
import { SubwayLocation } from '../../types';

// Mock data
const mockLocations: SubwayLocation[] = [
  {
    id: '1',
    name: 'Subway - Times Square',
    address: '1560 Broadway, New York, NY 10036',
    coordinates: { lat: 40.7589, lng: -73.9851 },
    hours: {
      monday: { open: '06:00', close: '23:00' },
      tuesday: { open: '06:00', close: '23:00' },
      wednesday: { open: '06:00', close: '23:00' },
      thursday: { open: '06:00', close: '23:00' },
      friday: { open: '06:00', close: '23:00' },
      saturday: { open: '07:00', close: '23:00' },
      sunday: { open: '08:00', close: '22:00' },
      timezone: 'America/New_York',
    },
    lettuceScore: 4.2,
    recentlyRated: true,
    distanceFromUser: 250,
    isOpen: true,
  },
  {
    id: '2',
    name: 'Subway - Penn Station',
    address: '2 Penn Plaza, New York, NY 10121',
    coordinates: { lat: 40.7505, lng: -73.9934 },
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
    lettuceScore: 3.8,
    recentlyRated: false,
    distanceFromUser: 180,
    isOpen: true,
  },
  {
    id: '3',
    name: 'Subway - Union Square',
    address: '4 Union Square S, New York, NY 10003',
    coordinates: { lat: 40.7359, lng: -73.9911 },
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
    lettuceScore: 2.9,
    recentlyRated: false,
    distanceFromUser: 320,
    isOpen: true,
  },
];

// Generate more locations for infinite scroll testing
const generateMockLocations = (count: number): SubwayLocation[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `location-${index + 4}`,
    name: `Subway - Location ${index + 4}`,
    address: `${index + 100} Test Street, Test City, TC 12345`,
    coordinates: { lat: 40.7 + index * 0.01, lng: -73.9 + index * 0.01 },
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
    lettuceScore: 3.0 + (index % 3),
    recentlyRated: index % 2 === 0,
    distanceFromUser: 400 + index * 100,
    isOpen: true,
  }));
};

const defaultProps = {
  locations: mockLocations,
  selectedLocation: undefined,
  onLocationSelect: vi.fn(),
  onRate: vi.fn(),
  onDirections: vi.fn(),
  isOpen: false,
  onToggle: vi.fn(),
};

describe('LocationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Panel State Management', () => {
    it('renders in closed state by default', () => {
      render(<LocationPanel {...defaultProps} />);
      
      // Panel should be translated down (closed)
      const panel = screen.getByRole('region');
      expect(panel).toHaveClass('translate-y-[calc(100%-120px)]');
    });

    it('renders in open state when isOpen is true', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      // Panel should be translated to normal position (open)
      const panel = screen.getByRole('region');
      expect(panel).toHaveClass('translate-y-0');
    });

    it('shows backdrop when panel is open', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      const backdrop = document.querySelector('.bg-black.bg-opacity-20');
      expect(backdrop).toBeInTheDocument();
    });

    it('calls onToggle when handle bar is clicked', () => {
      render(<LocationPanel {...defaultProps} />);
      
      const handleBar = document.querySelector('.w-12.h-1.bg-gray-300');
      fireEvent.click(handleBar!);
      
      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when backdrop is clicked', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      const backdrop = document.querySelector('.bg-black.bg-opacity-20');
      fireEvent.click(backdrop!);
      
      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Location Display and Sorting', () => {
    it('displays locations sorted by distance', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      const locationCards = screen.getAllByText(/Subway -/);
      
      // Should be sorted by distance: Penn Station (180m), Times Square (250m), Union Square (320m)
      expect(locationCards[0]).toHaveTextContent('Subway - Penn Station');
      expect(locationCards[1]).toHaveTextContent('Subway - Times Square');
      expect(locationCards[2]).toHaveTextContent('Subway - Union Square');
    });

    it('displays correct distance formatting', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      // Check distance display for different formats
      expect(screen.getByText('180m')).toBeInTheDocument();
      expect(screen.getByText('250m')).toBeInTheDocument();
      expect(screen.getByText('320m')).toBeInTheDocument();
    });

    it('displays location count in header', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      expect(screen.getByText('3 locations found')).toBeInTheDocument();
    });

    it('handles singular location count', () => {
      render(<LocationPanel {...defaultProps} locations={[mockLocations[0]]} isOpen={true} />);
      
      expect(screen.getByText('1 location found')).toBeInTheDocument();
    });
  });

  describe('Location Cards', () => {
    it('displays location information correctly', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      // Check first location details
      expect(screen.getByText('Subway - Times Square')).toBeInTheDocument();
      expect(screen.getByText('1560 Broadway, New York, NY 10036')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument();
    });

    it('shows recently rated indicator', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });

    it('displays lettuce score with correct color coding', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      const scoreElements = screen.getAllByText(/^\d\.\d$/);
      
      // Times Square (4.2) should have green background
      const highScoreElement = scoreElements.find(el => el.textContent === '4.2');
      expect(highScoreElement).toHaveClass('bg-green-500');
      
      // Union Square (2.9) should have orange background
      const lowScoreElement = scoreElements.find(el => el.textContent === '2.9');
      expect(lowScoreElement).toHaveClass('bg-orange-500');
    });

    it('calls onLocationSelect when card is clicked', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      const firstCard = screen.getByText('Subway - Penn Station').closest('div');
      fireEvent.click(firstCard!);
      
      expect(defaultProps.onLocationSelect).toHaveBeenCalledWith(mockLocations[1]);
    });

    it('shows action buttons when location is selected', () => {
      render(<LocationPanel {...defaultProps} selectedLocation={mockLocations[0]} isOpen={true} />);
      
      expect(screen.getByText('Rate Lettuce')).toBeInTheDocument();
      expect(screen.getByText('Directions')).toBeInTheDocument();
    });

    it('calls onRate when Rate button is clicked', () => {
      render(<LocationPanel {...defaultProps} selectedLocation={mockLocations[0]} isOpen={true} />);
      
      const rateButton = screen.getByText('Rate Lettuce');
      fireEvent.click(rateButton);
      
      expect(defaultProps.onRate).toHaveBeenCalledWith('1');
    });

    it('calls onDirections when Directions button is clicked', () => {
      render(<LocationPanel {...defaultProps} selectedLocation={mockLocations[0]} isOpen={true} />);
      
      const directionsButton = screen.getByText('Directions');
      fireEvent.click(directionsButton);
      
      expect(defaultProps.onDirections).toHaveBeenCalledWith(mockLocations[0]);
    });
  });

  describe('Infinite Scroll', () => {
    it('initially loads first 10 locations', () => {
      const manyLocations = [...mockLocations, ...generateMockLocations(20)];
      render(<LocationPanel {...defaultProps} locations={manyLocations} isOpen={true} />);
      
      // Should show first 10 locations (3 original + 7 generated)
      const locationCards = screen.getAllByText(/Subway -/);
      expect(locationCards).toHaveLength(10);
    });

    it('loads more locations on scroll', async () => {
      const manyLocations = [...mockLocations, ...generateMockLocations(20)];
      render(<LocationPanel {...defaultProps} locations={manyLocations} isOpen={true} />);
      
      // Get the scrollable container
      const scrollContainer = screen.getByRole('region').querySelector('[class*="overflow-y-auto"]');
      
      // Simulate scroll to bottom
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 1000, writable: true });
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1200, writable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 400, writable: true });
      
      fireEvent.scroll(scrollContainer!);
      
      // Wait for loading and new items
      await waitFor(() => {
        const locationCards = screen.getAllByText(/Subway -/);
        expect(locationCards.length).toBeGreaterThan(10);
      });
    });

    it('shows loading indicator during infinite scroll', async () => {
      const manyLocations = [...mockLocations, ...generateMockLocations(20)];
      render(<LocationPanel {...defaultProps} locations={manyLocations} isOpen={true} />);
      
      const scrollContainer = screen.getByRole('region').querySelector('[class*="overflow-y-auto"]');
      
      // Trigger scroll
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 1000, writable: true });
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1200, writable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 400, writable: true });
      
      fireEvent.scroll(scrollContainer!);
      
      // Should show loading spinner briefly
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('shows end of list message when all locations are loaded', async () => {
      const fewLocations = [...mockLocations, ...generateMockLocations(5)];
      render(<LocationPanel {...defaultProps} locations={fewLocations} isOpen={true} />);
      
      const scrollContainer = screen.getByRole('region').querySelector('[class*="overflow-y-auto"]');
      
      // Scroll to load all items
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 1000, writable: true });
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1200, writable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 400, writable: true });
      
      fireEvent.scroll(scrollContainer!);
      
      await waitFor(() => {
        expect(screen.getByText("You've reached the end of the list")).toBeInTheDocument();
      });
    });
  });

  describe('Touch Gestures', () => {
    it('opens panel on upward swipe when closed', () => {
      render(<LocationPanel {...defaultProps} isOpen={false} />);
      
      const panel = screen.getByRole('region');
      
      // Simulate touch start
      fireEvent.touchStart(panel, {
        touches: [{ clientY: 500 }],
      });
      
      // Simulate upward swipe (touch move with lower Y)
      fireEvent.touchMove(panel, {
        touches: [{ clientY: 400 }],
      });
      
      fireEvent.touchEnd(panel);
      
      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it('closes panel on downward swipe when open and at top', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      const panel = screen.getByRole('region');
      
      // Mock scroll position at top
      const scrollContainer = panel.querySelector('[class*="overflow-y-auto"]');
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
      
      // Simulate touch start
      fireEvent.touchStart(panel, {
        touches: [{ clientY: 200 }],
      });
      
      // Simulate downward swipe (touch move with higher Y)
      fireEvent.touchMove(panel, {
        touches: [{ clientY: 300 }],
      });
      
      fireEvent.touchEnd(panel);
      
      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Collapsed Preview', () => {
    it('shows collapsed preview when panel is closed', () => {
      render(<LocationPanel {...defaultProps} isOpen={false} />);
      
      expect(screen.getByText('Closest: Subway - Penn Station')).toBeInTheDocument();
      expect(screen.getByText('0.2km away')).toBeInTheDocument();
    });

    it('hides collapsed preview when panel is open', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      expect(screen.queryByText('Closest: Subway - Penn Station')).not.toBeInTheDocument();
    });

    it('shows correct score in collapsed preview', () => {
      render(<LocationPanel {...defaultProps} isOpen={false} />);
      
      // Penn Station has score 3.8, should show in collapsed preview (smaller size)
      const collapsedPreview = document.querySelector('.px-4.pb-4');
      expect(collapsedPreview).toBeInTheDocument();
      expect(collapsedPreview?.textContent).toContain('3.8');
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no locations provided', () => {
      render(<LocationPanel {...defaultProps} locations={[]} isOpen={true} />);
      
      expect(screen.getByText('No Subway locations found nearby')).toBeInTheDocument();
      expect(screen.getByText('🏪')).toBeInTheDocument();
    });

    it('shows correct count for empty locations', () => {
      render(<LocationPanel {...defaultProps} locations={[]} isOpen={true} />);
      
      expect(screen.getByText('0 locations found')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Nearby Locations' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<LocationPanel {...defaultProps} isOpen={true} />);
      
      const toggleButton = screen.getByRole('button', { name: 'Toggle location panel' });
      toggleButton.focus();
      
      fireEvent.keyDown(toggleButton, { key: 'Enter' });
      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });
  });
});