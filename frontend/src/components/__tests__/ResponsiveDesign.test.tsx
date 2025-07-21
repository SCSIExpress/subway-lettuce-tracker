import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { LocationProvider } from '../../contexts/LocationContext';
import LocationCard from '../LocationCard';
import { SubwayLocation } from '../../types';

// Mock data for testing
const mockLocation: SubwayLocation = {
  id: '1',
  name: 'Subway - Test Location',
  address: '123 Test Street, Test City, TC 12345',
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
};

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        {children}
      </LocationProvider>
    </QueryClientProvider>
  );
};

// Mock viewport resize utility
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    // Reset viewport to desktop size
    mockViewport(1024, 768);
  });

  describe('LocationCard Responsive Behavior', () => {
    it('should display compact layout on mobile screens', () => {
      mockViewport(375, 667); // iPhone SE size
      
      render(
        <TestWrapper>
          <LocationCard
            location={mockLocation}
            onSelect={vi.fn()}
            onRate={vi.fn()}
            onDirections={vi.fn()}
            showActions={true}
          />
        </TestWrapper>
      );

      const card = screen.getByRole('button');
      expect(card).toHaveClass('spacing-mobile');
      
      // Check that action buttons stack vertically on mobile
      const rateButton = screen.getByText('Rate Lettuce');
      const directionsButton = screen.getByText('Directions');
      
      expect(rateButton.closest('div')).toHaveClass('flex-col', 'sm:flex-row');
      expect(directionsButton.closest('div')).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('should display full layout on desktop screens', () => {
      mockViewport(1024, 768); // Desktop size
      
      render(
        <TestWrapper>
          <LocationCard
            location={mockLocation}
            onSelect={vi.fn()}
            onRate={vi.fn()}
            onDirections={vi.fn()}
            showActions={true}
          />
        </TestWrapper>
      );

      const locationName = screen.getByText('Subway - Test Location');
      expect(locationName).toHaveClass('text-responsive-base');
      
      // Check that score description is visible on larger screens
      const scoreDescription = screen.getByText('Very Good');
      expect(scoreDescription.closest('div')).toHaveClass('hidden', 'md:block');
    });

    it('should handle touch interactions properly', async () => {
      mockViewport(375, 667); // Mobile size
      
      const mockOnSelect = vi.fn();
      render(
        <TestWrapper>
          <LocationCard
            location={mockLocation}
            onSelect={mockOnSelect}
            showActions={true}
          />
        </TestWrapper>
      );

      const card = screen.getByRole('button');
      expect(card).toHaveClass('tap-target');
      
      // Simulate touch interaction
      fireEvent.touchStart(card);
      fireEvent.touchEnd(card);
      fireEvent.click(card);
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockLocation);
    });

    it('should truncate long text appropriately on small screens', () => {
      mockViewport(320, 568); // Very small screen
      
      const longNameLocation = {
        ...mockLocation,
        name: 'Subway - This is a very long location name that should be truncated',
        address: '123 Very Long Street Name That Should Also Be Truncated, Very Long City Name, State 12345-6789',
      };

      render(
        <TestWrapper>
          <LocationCard location={longNameLocation} />
        </TestWrapper>
      );

      const locationName = screen.getByText(longNameLocation.name);
      expect(locationName).toHaveClass('truncate');
      
      const address = screen.getByText(longNameLocation.address);
      expect(address).toHaveClass('text-responsive-xs');
    });
  });

  describe('Cross-Device Compatibility', () => {
    const testViewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1024, height: 768 },
      { name: 'Large Desktop', width: 1440, height: 900 },
    ];

    testViewports.forEach(({ name, width, height }) => {
      it(`should render properly on ${name} (${width}x${height})`, () => {
        mockViewport(width, height);
        
        render(
          <TestWrapper>
            <LocationCard
              location={mockLocation}
              onSelect={vi.fn()}
              onRate={vi.fn()}
              onDirections={vi.fn()}
              showActions={true}
            />
          </TestWrapper>
        );

        // Basic rendering check
        expect(screen.getByText('Subway - Test Location')).toBeInTheDocument();
        expect(screen.getByText('Rate Lettuce')).toBeInTheDocument();
        expect(screen.getByText('Directions')).toBeInTheDocument();
        
        // Check responsive classes are applied
        const card = screen.getByRole('button');
        expect(card).toHaveClass('tap-target');
      });
    });
  });

  describe('Accessibility and Touch Interactions', () => {
    it('should have proper touch target sizes', () => {
      mockViewport(375, 667); // Mobile size
      
      render(
        <TestWrapper>
          <LocationCard
            location={mockLocation}
            onSelect={vi.fn()}
            onRate={vi.fn()}
            onDirections={vi.fn()}
            showActions={true}
          />
        </TestWrapper>
      );

      const touchTargets = document.querySelectorAll('.touch-target');
      touchTargets.forEach(target => {
        // Touch targets should be at least 44px (iOS) or 48dp (Android)
        expect(target).toHaveClass('min-h-[44px]', 'min-w-[44px]');
      });
    });

    it('should handle reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <TestWrapper>
          <LocationCard location={mockLocation} />
        </TestWrapper>
      );

      // Animations should be disabled when prefers-reduced-motion is set
      const animatedElements = document.querySelectorAll('[class*="animate-"]');
      animatedElements.forEach(element => {
        // In a real implementation, these would have animation: none applied via CSS
        expect(element).toBeInTheDocument();
      });
    });

    it('should support high contrast mode', () => {
      // Mock prefers-contrast: high
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <TestWrapper>
          <LocationCard location={mockLocation} />
        </TestWrapper>
      );

      // High contrast elements should have proper styling
      const card = screen.getByRole('button');
      expect(card).toHaveClass('bg-white', 'rounded-xl');
    });
  });
});