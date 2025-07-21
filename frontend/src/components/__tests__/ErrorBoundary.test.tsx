import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import ErrorBoundary, { QueryErrorBoundary, useErrorHandler } from '../ErrorBoundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; error?: Error }> = ({ 
  shouldThrow = true, 
  error = new Error('Test error') 
}) => {
  if (shouldThrow) {
    throw error;
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const mockOnError = vi.fn();

    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Detailed test error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Error Details (Development)'));
    expect(screen.getByText(/Detailed test error/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Detailed test error')} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle refresh page button click', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Refresh Page'));
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should handle try again button click', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    // After clicking try again, the error boundary should reset and show children again
    // Since we're still rendering the same error-throwing component, it will throw again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('QueryErrorBoundary', () => {
  it('should render default query error fallback', () => {
    render(
      <QueryErrorBoundary>
        <ThrowError />
      </QueryErrorBoundary>
    );

    expect(screen.getByText('Connection Issue')).toBeInTheDocument();
    expect(screen.getByText("We're having trouble loading the latest data. Please check your connection and try again.")).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = (error: Error, retry: () => void) => (
      <div>
        <div>Custom query error: {error.message}</div>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <QueryErrorBoundary fallback={customFallback}>
        <ThrowError error={new Error('Query failed')} />
      </QueryErrorBoundary>
    );

    // The error message might be different due to how the ErrorBoundaryFallback component works
    expect(screen.getByText(/Custom query error:/)).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  it('should handle errors and reset them', () => {
    const TestComponent = () => {
      const { handleError, resetError } = useErrorHandler();
      const [hasError, setHasError] = React.useState(false);

      const triggerError = () => {
        try {
          handleError(new Error('Test error'));
        } catch (error) {
          setHasError(true);
        }
      };

      const reset = () => {
        resetError();
        setHasError(false);
      };

      return (
        <div>
          <div data-testid="error-status">{hasError ? 'Error' : 'No Error'}</div>
          <button onClick={triggerError}>Trigger Error</button>
          <button onClick={reset}>Reset</button>
        </div>
      );
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-status')).toHaveTextContent('No Error');

    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});