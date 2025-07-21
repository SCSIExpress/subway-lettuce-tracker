import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import OfflineIndicator, { OfflineMessage, useOfflineErrorMessage } from '../OfflineIndicator';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

// Mock the useOfflineStatus hook
vi.mock('../../hooks/useOfflineStatus');
const mockUseOfflineStatus = vi.mocked(useOfflineStatus);

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when online', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });

    render(<OfflineIndicator />);
    
    expect(screen.queryByText("You're offline")).not.toBeInTheDocument();
  });

  it('should render offline indicator when offline', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    });

    render(<OfflineIndicator />);
    
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText('• Some features may not work')).toBeInTheDocument();
  });

  it('should show reconnected message when coming back online', () => {
    // Start offline
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    });

    const { rerender } = render(<OfflineIndicator />);
    
    expect(screen.getByText("You're offline")).toBeInTheDocument();

    // Come back online
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });

    rerender(<OfflineIndicator />);
    
    expect(screen.getByText('Back online!')).toBeInTheDocument();
    expect(screen.queryByText("You're offline")).not.toBeInTheDocument();
  });

  it('should not show reconnected message when showReconnectedMessage is false', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });

    render(<OfflineIndicator showReconnectedMessage={false} />);
    
    expect(screen.queryByText('Back online!')).not.toBeInTheDocument();
  });
});

describe('OfflineMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when online', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });

    render(<OfflineMessage />);
    
    expect(screen.queryByText("You're offline")).not.toBeInTheDocument();
  });

  it('should render offline message when offline', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    });

    render(<OfflineMessage />);
    
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection and try again.')).toBeInTheDocument();
  });

  it('should render custom title and message', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    });

    render(
      <OfflineMessage 
        title="Custom Title" 
        message="Custom message" 
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('should show retry button and handle retry click', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    });

    const mockRetry = vi.fn();
    render(<OfflineMessage onRetry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button when showRetry is false', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    });

    render(<OfflineMessage showRetry={false} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});

describe('useOfflineErrorMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return offline message when offline', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    });

    const TestComponent = () => {
      const { getErrorMessage, shouldShowRetry, isOffline } = useOfflineErrorMessage();
      return (
        <div>
          <div data-testid="offline">{isOffline.toString()}</div>
          <div data-testid="message">{getErrorMessage(new Error('Network error'))}</div>
          <div data-testid="retry">{shouldShowRetry(new Error('Network error')).toString()}</div>
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByTestId('offline')).toHaveTextContent('true');
    expect(screen.getByTestId('message')).toHaveTextContent("You're currently offline");
    expect(screen.getByTestId('retry')).toHaveTextContent('true');
  });

  it('should return appropriate messages for different error types', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });

    const TestComponent = ({ error }: { error: Error }) => {
      const { getErrorMessage, shouldShowRetry } = useOfflineErrorMessage();
      return (
        <div>
          <div data-testid="message">{getErrorMessage(error)}</div>
          <div data-testid="retry">{shouldShowRetry(error).toString()}</div>
        </div>
      );
    };

    // Network error
    const { rerender } = render(<TestComponent error={new Error('Network error')} />);
    expect(screen.getByTestId('message')).toHaveTextContent('Network error');
    expect(screen.getByTestId('retry')).toHaveTextContent('true');

    // Timeout error
    rerender(<TestComponent error={new Error('Request timeout')} />);
    expect(screen.getByTestId('message')).toHaveTextContent('Request timed out');
    expect(screen.getByTestId('retry')).toHaveTextContent('true');

    // Server error
    rerender(<TestComponent error={new Error('500 Internal Server Error')} />);
    expect(screen.getByTestId('message')).toHaveTextContent('Server error');
    expect(screen.getByTestId('retry')).toHaveTextContent('true');

    // 404 error
    rerender(<TestComponent error={new Error('404 Not Found')} />);
    expect(screen.getByTestId('message')).toHaveTextContent('The requested resource was not found');
    expect(screen.getByTestId('retry')).toHaveTextContent('false');

    // 401 error
    rerender(<TestComponent error={new Error('401 Unauthorized')} />);
    expect(screen.getByTestId('message')).toHaveTextContent('Access denied');
    expect(screen.getByTestId('retry')).toHaveTextContent('false');

    // Generic error
    rerender(<TestComponent error={new Error('Something went wrong')} />);
    expect(screen.getByTestId('message')).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.getByTestId('retry')).toHaveTextContent('true');
  });
});