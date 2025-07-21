import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LocationCard from '../LocationCard';
import { SubwayLocation } from '../../types';

// Mock location data
const mockLocation: SubwayLocation = {
  id: '1',
  name: 'Subway Downtown',
  address: '123 Main St, Downtown, NY 10001',
  coordinates: { lat: 40.7128, lng: -74.0060 },
  hours: {
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '23:00' },
    saturday: { open: '10:00', close: '23:00' },
    sunday: { open: '10:00', close: '21:00' },
    timezone: 'America/New_York'
  },
  lettuceScore: 4.2,
  lastRated: new Date('2024-01-15T14:30:00Z'),
  recentlyRated: true,
  distanceFromUser: 250,
  isOpen: true
};

const mockLocationNoRating: SubwayLocation = {
  ...mockLocation,
  id: '2',
  name: 'Subway Uptown',
  lettuceScore: 0,
  lastRated: undefined,
  recentlyRated: false
};

const mockLocationClosed: SubwayLocation = {
  ...mockLocation,
  id: '3',
  name: 'Subway Closed',
  hours: {
    ...mockLocation.hours,
    monday: { open: '09:00', close: '22:00', closed: true }
  },
  isOpen: false
};

describe('LocationCard', () => {
  const mockOnSelect = vi.fn();
  const mockOnRate = vi.fn();
  const mockOnDirections = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current time to be 2:30 PM on a Monday (14:30 = 1430 in time format)
    vi.setSystemTime(new Date('2024-01-15T14:30:00'));
  });

  describe('Basic Rendering', () => {
    it('renders location name and address', () => {
      render(<LocationCard location={mockLocation} />);
      
      expect(screen.getByText('Subway Downtown')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, Downtown, NY 10001')).toBeInTheDocument();
    });

    it('displays distance when provided', () => {
      render(<LocationCard location={mockLocation} />);
      
      expect(screen.getByText('250m')).toBeInTheDocument();
    });

    it('formats distance correctly for kilometers', () => {
      const locationWithKmDistance = { ...mockLocation, distanceFromUser: 1500 };
      render(<LocationCard location={locationWithKmDistance} />);
      
      expect(screen.getByText('1.5km')).toBeInTheDocument();
    });

    it('does not display distance when not provided', () => {
      const locationWithoutDistance = { ...mockLocation, distanceFromUser: undefined };
      render(<LocationCard location={locationWithoutDistance} />);
      
      expect(screen.queryByText(/m$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/km$/)).not.toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('displays numerical score correctly', () => {
      render(<LocationCard location={mockLocation} />);
      
      expect(screen.getByText('4.2')).toBeInTheDocument();
    });

    it('displays star rating for valid scores', () => {
      render(<LocationCard location={mockLocation} />);
      
      // Should have 4 full stars for score of 4.2 (no half star since 4.2 < 4.5)
      const fullStars = screen.getAllByText('★');
      expect(fullStars).toHaveLength(4);
    });

    it('displays "N/A" for locations without ratings', () => {
      render(<LocationCard location={mockLocationNoRating} />);
      
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.getByText('No ratings')).toBeInTheDocument();
    });

    it('applies correct color classes based on score', () => {
      const { rerender } = render(<LocationCard location={mockLocation} />);
      
      // Score 4.2 should have green color - the score element itself has the color class
      let scoreElement = screen.getByText('4.2');
      expect(scoreElement).toHaveClass('bg-green-500');
      
      // Test different score ranges
      const lowScoreLocation = { ...mockLocation, lettuceScore: 2.1 };
      rerender(<LocationCard location={lowScoreLocation} />);
      
      scoreElement = screen.getByText('2.1');
      expect(scoreElement).toHaveClass('bg-orange-600');
    });

    it('displays score description text', () => {
      render(<LocationCard location={mockLocation} />);
      
      expect(screen.getByText('Very Good')).toBeInTheDocument();
    });
  });

  describe('Recently Rated Indicator', () => {
    it('shows recently rated indicator when recentlyRated is true', () => {
      render(<LocationCard location={mockLocation} />);
      
      expect(screen.getByText('Fresh')).toBeInTheDocument();
      expect(screen.getByTitle('Recently rated within the last 2 hours')).toBeInTheDocument();
    });

    it('does not show recently rated indicator when recentlyRated is false', () => {
      render(<LocationCard location={mockLocationNoRating} />);
      
      expect(screen.queryByText('Fresh')).not.toBeInTheDocument();
    });

    it('has pulsing animation for recently rated indicator', () => {
      render(<LocationCard location={mockLocation} />);
      
      const pulsingDot = screen.getByTitle('Recently rated within the last 2 hours').querySelector('.animate-pulse');
      expect(pulsingDot).toBeInTheDocument();
    });
  });

  describe('Open/Close Hours Display', () => {
    it('displays open status correctly', () => {
      render(<LocationCard location={mockLocation} />);
      
      expect(screen.getByText('Open until 22:00')).toBeInTheDocument();
    });

    it('displays closed status for closed locations', () => {
      render(<LocationCard location={mockLocationClosed} />);
      
      expect(screen.getByText('Closed today')).toBeInTheDocument();
    });

    it('shows correct status indicator colors', () => {
      const { rerender } = render(<LocationCard location={mockLocation} />);
      
      // Open location should have green indicator
      let statusText = screen.getByText('Open until 22:00');
      expect(statusText).toHaveClass('text-green-600');
      
      // Closed location should have red indicator
      rerender(<LocationCard location={mockLocationClosed} />);
      statusText = screen.getByText('Closed today');
      expect(statusText).toHaveClass('text-red-600');
    });
  });

  describe('Last Rated Information', () => {
    it('displays last rated time when available', () => {
      render(<LocationCard location={mockLocation} />);
      
      expect(screen.getByText(/Last rated:/)).toBeInTheDocument();
    });

    it('does not display last rated when not available', () => {
      render(<LocationCard location={mockLocationNoRating} />);
      
      expect(screen.queryByText(/Last rated:/)).not.toBeInTheDocument();
    });

    it('formats recent ratings correctly', () => {
      const recentLocation = {
        ...mockLocation,
        lastRated: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      };
      
      render(<LocationCard location={recentLocation} />);
      
      expect(screen.getByText(/Last rated: Just rated|Last rated: \d+h ago/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('displays action buttons when showActions is true and isSelected is true', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
          onRate={mockOnRate}
          onDirections={mockOnDirections}
          showActions={true}
        />
      );
      
      expect(screen.getByText('Rate Lettuce')).toBeInTheDocument();
      expect(screen.getByText('Directions')).toBeInTheDocument();
    });

    it('does not display action buttons when showActions is false', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
          onRate={mockOnRate}
          onDirections={mockOnDirections}
          showActions={false}
        />
      );
      
      expect(screen.queryByText('Rate Lettuce')).not.toBeInTheDocument();
      expect(screen.queryByText('Directions')).not.toBeInTheDocument();
    });

    it('calls onRate when Rate button is clicked', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
          onRate={mockOnRate}
          onDirections={mockOnDirections}
        />
      );
      
      fireEvent.click(screen.getByText('Rate Lettuce'));
      expect(mockOnRate).toHaveBeenCalledWith(mockLocation.id);
    });

    it('calls onDirections when Directions button is clicked', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
          onRate={mockOnRate}
          onDirections={mockOnDirections}
        />
      );
      
      fireEvent.click(screen.getByText('Directions'));
      expect(mockOnDirections).toHaveBeenCalledWith(mockLocation);
    });

    it('prevents event propagation when action buttons are clicked', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
          onSelect={mockOnSelect}
          onRate={mockOnRate}
          onDirections={mockOnDirections}
        />
      );
      
      fireEvent.click(screen.getByText('Rate Lettuce'));
      expect(mockOnSelect).not.toHaveBeenCalled();
      
      fireEvent.click(screen.getByText('Directions'));
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Card Selection', () => {
    it('calls onSelect when card is clicked', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          onSelect={mockOnSelect}
        />
      );
      
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnSelect).toHaveBeenCalledWith(mockLocation);
    });

    it('applies selected styling when isSelected is true', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
        />
      );
      
      const card = screen.getByRole('article');
      expect(card).toHaveClass('ring-2', 'ring-green-500');
    });

    it('supports keyboard navigation', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          onSelect={mockOnSelect}
        />
      );
      
      const card = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockOnSelect).toHaveBeenCalledWith(mockLocation);
      
      // Test Space key
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockOnSelect).toHaveBeenCalledTimes(2);
    });

    it('has proper accessibility attributes', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          onSelect={mockOnSelect}
        />
      );
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'Select Subway Downtown');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Responsive Design', () => {
    it('applies custom className when provided', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          className="custom-class"
        />
      );
      
      const card = screen.getByRole('article');
      expect(card).toHaveClass('custom-class');
    });

    it('has responsive padding classes', () => {
      render(<LocationCard location={mockLocation} />);
      
      const cardContent = screen.getByRole('article').firstChild;
      expect(cardContent).toHaveClass('p-4', 'sm:p-5');
    });

    it('hides score description on small screens', () => {
      render(<LocationCard location={mockLocation} />);
      
      const scoreDescription = screen.getByText('Very Good');
      expect(scoreDescription.parentElement).toHaveClass('hidden', 'sm:block');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing hours data gracefully', () => {
      const locationWithBadHours = {
        ...mockLocation,
        hours: {
          ...mockLocation.hours,
          monday: undefined as any
        }
      };
      
      render(<LocationCard location={locationWithBadHours} />);
      
      expect(screen.getByText('Hours unavailable')).toBeInTheDocument();
    });

    it('handles very long location names', () => {
      const locationWithLongName = {
        ...mockLocation,
        name: 'Subway Restaurant with an Extremely Long Name That Should Be Truncated'
      };
      
      render(<LocationCard location={locationWithLongName} />);
      
      const nameElement = screen.getByText(locationWithLongName.name);
      expect(nameElement).toHaveClass('truncate');
    });

    it('handles zero distance correctly', () => {
      const locationAtZeroDistance = { ...mockLocation, distanceFromUser: 0 };
      render(<LocationCard location={locationAtZeroDistance} />);
      
      expect(screen.getByText('0m')).toBeInTheDocument();
    });

    it('handles fractional scores correctly', () => {
      const locationWithFractionalScore = { ...mockLocation, lettuceScore: 3.7 };
      render(<LocationCard location={locationWithFractionalScore} />);
      
      expect(screen.getByText('3.7')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('includes lettuce emoji in rate button', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
          onRate={mockOnRate}
        />
      );
      
      expect(screen.getByText('🥬')).toBeInTheDocument();
    });

    it('includes compass emoji in directions button', () => {
      render(
        <LocationCard 
          location={mockLocation} 
          isSelected={true}
          onDirections={mockOnDirections}
        />
      );
      
      expect(screen.getByText('🧭')).toBeInTheDocument();
    });

    it('has proper hover effects', () => {
      render(<LocationCard location={mockLocation} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveClass('hover:shadow-lg');
    });

    it('has proper transition effects', () => {
      render(<LocationCard location={mockLocation} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveClass('transition-all', 'duration-200');
    });
  });
});