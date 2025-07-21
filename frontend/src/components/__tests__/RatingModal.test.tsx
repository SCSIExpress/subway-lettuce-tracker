import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RatingModal from '../RatingModal';
import { SubwayLocation } from '../../types';

// Mock the hooks
vi.mock('../../hooks/useLocationQueries', () => ({
  useSubmitRating: vi.fn(),
  useLocationDetail: vi.fn(),
}));

import { useSubmitRating, useLocationDetail } from '../../hooks/useLocationQueries';

const mockUseSubmitRating = vi.mocked(useSubmitRating);
const mockUseLocationDetail = vi.mocked(useLocationDetail);

// Test data
const mockLocation: SubwayLocation = {
  id: 'test-location-1',
  name: 'Subway Downtown',
  address: '123 Main St, Downtown',
  coordinates: { lat: 40.7128, lng: -74.0060 },
  hours: {
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '22:00' },
    saturday: { open: '10:00', close: '21:00' },
    sunday: { open: '10:00', close: '21:00' },
    timezone: 'America/New_York',
  },
  lettuceScore: 4.2,
  lastRated: new Date('2024-01-15T10:30:00Z'),
  recentlyRated: true,
  distanceFromUser: 500,
};

const mockLocationDetail = {
  ...mockLocation,
  ratings: [],
  timeRecommendations: [
    {
      period: 'morning' as const,
      averageScore: 4.5,
      confidence: 'high' as const,
      sampleSize: 25,
      timeRange: '6:00 AM - 11:00 AM',
    },
    {
      period: 'lunch' as const,
      averageScore: 3.8,
      confidence: 'medium' as const,
      sampleSize: 15,
      timeRange: '11:00 AM - 2:00 PM',
    },
  ],
  totalRatings: 40,
  averageScore: 4.2,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('RatingModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseSubmitRating.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      isIdle: true,
      mutate: vi.fn(),
      reset: vi.fn(),
    });

    mockUseLocationDetail.mockReturnValue({
      data: mockLocationDetail,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={false}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByText('Rate Lettuce Freshness')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Rate Lettuce Freshness')).toBeInTheDocument();
      expect(screen.getByText('Subway Downtown')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, Downtown')).toBeInTheDocument();
    });

    it('should display current score information', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Current Score')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument();
    });

    it('should display last rated information', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Last rated')).toBeInTheDocument();
    });

    it('should display rating stars', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const ratingButtons = screen.getAllByRole('button').filter(button => 
        button.getAttribute('aria-label')?.includes('Rate') && 
        button.getAttribute('aria-label')?.includes('star')
      );
      expect(ratingButtons).toHaveLength(5);
    });

    it('should display optimal times section', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Optimal Freshness Times')).toBeInTheDocument();
      expect(screen.getByText('morning')).toBeInTheDocument();
      expect(screen.getByText('lunch')).toBeInTheDocument();
    });

    it('should show "Not enough data" when no time recommendations', () => {
      mockUseLocationDetail.mockReturnValue({
        data: { ...mockLocationDetail, timeRecommendations: [] },
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        refetch: vi.fn(),
      });

      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Not enough data for time recommendations')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should close modal when close button is clicked', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when backdrop is clicked', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const backdrop = screen.getByRole('button', { name: /close modal/i }).parentElement?.previousElementSibling;
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should close modal when cancel button is clicked', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should select rating when star is clicked', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const fourStarButton = screen.getByLabelText('Rate 4 stars');
      fireEvent.click(fourStarButton);

      expect(screen.getByText('Good - Fresh')).toBeInTheDocument();
    });

    it('should show hover effects on star rating', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const threeStarButton = screen.getByLabelText('Rate 3 stars');
      fireEvent.mouseEnter(threeStarButton);

      expect(screen.getByText('Fair - Acceptable')).toBeInTheDocument();

      fireEvent.mouseLeave(threeStarButton);
      expect(screen.getByText('Select a rating')).toBeInTheDocument();
    });

    it('should disable submit button when no rating selected', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByText('Submit Rating');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when rating is selected', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const fiveStarButton = screen.getByLabelText('Rate 5 stars');
      fireEvent.click(fiveStarButton);

      const submitButton = screen.getByText('Submit Rating');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Rating Submission', () => {
    it('should submit rating when submit button is clicked', async () => {
      mockMutateAsync.mockResolvedValue({
        rating: { id: 'new-rating', locationId: mockLocation.id, score: 4, timestamp: new Date() },
        newLocationScore: 4.3,
        message: 'Rating submitted successfully',
      });

      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: createWrapper() }
      );

      // Select a rating
      const fourStarButton = screen.getByLabelText('Rate 4 stars');
      fireEvent.click(fourStarButton);

      // Submit the rating
      const submitButton = screen.getByText('Submit Rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          locationId: mockLocation.id,
          score: 4,
        });
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(4);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      mockUseSubmitRating.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
        isIdle: false,
        mutate: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      const submitButton = screen.getByText('Submitting...').closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('should show error message when submission fails', () => {
      mockUseSubmitRating.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: true,
        error: new Error('Network error'),
        data: undefined,
        isSuccess: false,
        isIdle: false,
        mutate: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Failed to submit rating. Please try again.')).toBeInTheDocument();
    });

    it('should handle submission error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockMutateAsync.mockRejectedValue(new Error('Submission failed'));

      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: createWrapper() }
      );

      // Select a rating
      const threeStarButton = screen.getByLabelText('Rate 3 stars');
      fireEvent.click(threeStarButton);

      // Submit the rating
      const submitButton = screen.getByText('Submit Rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to submit rating:', expect.any(Error));
      });

      // Modal should not close on error
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Rating Descriptions', () => {
    const ratingDescriptions = [
      { rating: 1, description: 'Very Poor - Wilted/Brown' },
      { rating: 2, description: 'Poor - Not Fresh' },
      { rating: 3, description: 'Fair - Acceptable' },
      { rating: 4, description: 'Good - Fresh' },
      { rating: 5, description: 'Excellent - Very Fresh' },
    ];

    ratingDescriptions.forEach(({ rating, description }) => {
      it(`should show correct description for ${rating} star rating`, () => {
        render(
          <RatingModal
            location={mockLocation}
            isOpen={true}
            onClose={mockOnClose}
          />,
          { wrapper: createWrapper() }
        );

        const starButton = screen.getByLabelText(`Rate ${rating} star${rating !== 1 ? 's' : ''}`);
        fireEvent.click(starButton);

        expect(screen.getByText(description)).toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('should format recent timestamps correctly', () => {
      const recentLocation = {
        ...mockLocation,
        lastRated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      render(
        <RatingModal
          location={recentLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
    });

    it('should show "Never rated" for locations without ratings', () => {
      const unratedLocation = {
        ...mockLocation,
        lastRated: undefined,
        lettuceScore: 0,
      };

      render(
        <RatingModal
          location={unratedLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Never rated')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for star buttons', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText('Rate 1 star')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 2 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 3 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 4 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 5 stars')).toBeInTheDocument();
    });

    it('should have proper ARIA label for close button', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should prevent modal content click from closing modal', () => {
      render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      const modalContent = screen.getByText('Rate Lettuce Freshness').closest('div');
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('State Reset', () => {
    it('should reset rating selection when modal reopens', () => {
      const { rerender } = render(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      // Select a rating
      const fourStarButton = screen.getByLabelText('Rate 4 stars');
      fireEvent.click(fourStarButton);
      expect(screen.getByText('Good - Fresh')).toBeInTheDocument();

      // Close modal
      rerender(
        <RatingModal
          location={mockLocation}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      // Reopen modal
      rerender(
        <RatingModal
          location={mockLocation}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Rating should be reset
      expect(screen.getByText('Select a rating')).toBeInTheDocument();
    });
  });
});