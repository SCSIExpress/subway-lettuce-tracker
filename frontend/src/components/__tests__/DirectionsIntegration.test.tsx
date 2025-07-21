import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationProvider } from '../../contexts/LocationContext';
import LocationCard from '../LocationCard';
import { SubwayLocation } from '../../types';
import * as directionsService from '../../services/directions';

// Mock the directions service
vi.mock('../../services/directions', () => ({
  directionsService: {
    openDirections: vi.fn()
  }
}));

const mockDirectionsService = vi.mocked(directionsService.directionsService);

// Mock window.alert
const mockAlert = vi.fn();
const originalAlert = window.alert;

// Sample test data
const sampleLocation: SubwayLocation = {
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

// Test wrapper component
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

describe('Directions Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = mockAlert;
  });

  afterEach(() => {
    window.alert = originalAlert;
  });

  describe('LocationCard Directions Button', () => {
    it('should render directions button', () => {
      const mockOnDirections = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      expect(directionsButton).toBeInTheDocument();
      expect(directionsButton).toHaveTextContent('Directions');
    });

    it('should call onDirections when directions button is clicked', async () => {
      const mockOnDirections = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      fireEvent.click(directionsButton);

      expect(mockOnDirections).toHaveBeenCalledWith(sampleLocation);
    });

    it('should not show directions button when onDirections is not provided', () => {
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.queryByRole('button', { name: /get directions/i });
      expect(directionsButton).not.toBeInTheDocument();
    });

    it('should not show directions button when showActions is false', () => {
      const mockOnDirections = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={false}
          />
        </TestWrapper>
      );

      const directionsButton = screen.queryByRole('button', { name: /get directions/i });
      expect(directionsButton).not.toBeInTheDocument();
    });

    it('should prevent event propagation when directions button is clicked', () => {
      const mockOnDirections = vi.fn();
      const mockOnSelect = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            onSelect={mockOnSelect}
            isSelected={true} // Need to set isSelected to true to show action buttons
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      fireEvent.click(directionsButton);

      expect(mockOnDirections).toHaveBeenCalledWith(sampleLocation);
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Directions Service Integration', () => {
    it('should call directions service when handleDirections is called', async () => {
      mockDirectionsService.openDirections.mockResolvedValue();
      
      const mockOnDirections = vi.fn(async (location: SubwayLocation) => {
        try {
          await directionsService.directionsService.openDirections(location);
        } catch (error) {
          console.error('Failed to open directions:', error);
        }
      });
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      fireEvent.click(directionsButton);

      await waitFor(() => {
        expect(mockDirectionsService.openDirections).toHaveBeenCalledWith(sampleLocation);
      });
    });

    it('should handle directions service errors gracefully', async () => {
      const mockError = {
        code: 'INVALID_DESTINATION',
        message: 'Invalid destination location provided',
        type: 'INVALID_LOCATION'
      };
      
      mockDirectionsService.openDirections.mockRejectedValue(mockError);
      
      const mockOnDirections = vi.fn(async (location: SubwayLocation) => {
        try {
          await directionsService.directionsService.openDirections(location);
        } catch (error) {
          console.error('Failed to open directions:', error);
          // In a real app, this would show a toast or other user feedback
          throw error;
        }
      });
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      fireEvent.click(directionsButton);

      await waitFor(() => {
        expect(mockDirectionsService.openDirections).toHaveBeenCalledWith(sampleLocation);
      });
    });
  });

  describe('Button Styling and Accessibility', () => {
    it('should have proper accessibility attributes', () => {
      const mockOnDirections = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      
      expect(directionsButton).toHaveAttribute('aria-label', `Get directions to ${sampleLocation.name}`);
      expect(directionsButton).toHaveClass('bg-blue-600', 'hover:bg-blue-700');
    });

    it('should have proper focus styles', () => {
      const mockOnDirections = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      
      expect(directionsButton).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      );
    });

    it('should display compass emoji icon', () => {
      const mockOnDirections = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      expect(directionsButton).toHaveTextContent('🧭');
    });
  });

  describe('Button Layout and Responsive Design', () => {
    it('should render both rate and directions buttons side by side', () => {
      const mockOnDirections = vi.fn();
      const mockOnRate = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            onRate={mockOnRate}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      const rateButton = screen.getByRole('button', { name: /rate lettuce/i });
      
      expect(directionsButton).toBeInTheDocument();
      expect(rateButton).toBeInTheDocument();
      
      // Both buttons should have flex-1 class for equal width
      expect(directionsButton).toHaveClass('flex-1');
      expect(rateButton).toHaveClass('flex-1');
    });

    it('should render only directions button when rate handler is not provided', () => {
      const mockOnDirections = vi.fn();
      
      render(
        <TestWrapper>
          <LocationCard
            location={sampleLocation}
            onDirections={mockOnDirections}
            showActions={true}
          />
        </TestWrapper>
      );

      const directionsButton = screen.getByRole('button', { name: /get directions/i });
      const rateButton = screen.queryByRole('button', { name: /rate lettuce/i });
      
      expect(directionsButton).toBeInTheDocument();
      expect(rateButton).not.toBeInTheDocument();
    });
  });
});