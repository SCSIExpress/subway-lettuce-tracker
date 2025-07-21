import { renderHook, act } from '@testing-library/react';
import { useOfflineStatus, useOfflineAwareQuery } from '../useOfflineStatus';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock fetch
global.fetch = vi.fn();

describe('useOfflineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    // Clean up any event listeners
    vi.clearAllTimers();
  });

  it('should return online status initially', () => {
    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('should detect when going offline', () => {
    const { result } = renderHook(() => useOfflineStatus());

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('should detect when coming back online', () => {
    const { result } = renderHook(() => useOfflineStatus());

    // Go offline first
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOffline).toBe(true);

    // Come back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it('should check connection periodically when offline', async () => {
    vi.useFakeTimers();
    (global.fetch as any).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useOfflineStatus());

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOffline).toBe(true);

    // Fast-forward 30 seconds to trigger the periodic check
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Wait for the fetch to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith('/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    vi.useRealTimers();
  });

  it('should handle fetch errors during connection check', async () => {
    vi.useFakeTimers();
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOfflineStatus());

    // Start online
    expect(result.current.isOnline).toBe(true);

    // Go offline first to trigger the periodic check
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOffline).toBe(true);

    // Fast-forward to trigger the periodic check
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Wait for the fetch to resolve
    await act(async () => {
      await Promise.resolve();
    });

    // Should remain offline due to fetch error
    expect(result.current.isOffline).toBe(true);
    expect(result.current.wasOffline).toBe(true);

    vi.useRealTimers();
  });
});

describe('useOfflineAwareQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('should provide retry logic that respects offline status', () => {
    const { result } = renderHook(() => useOfflineAwareQuery());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);

    // Should retry network errors when online
    expect(result.current.shouldRetry(1, new Error('Network error'))).toBe(true);
    expect(result.current.shouldRetry(3, new Error('Network error'))).toBe(false);

    // Should not retry client errors
    expect(result.current.shouldRetry(1, new Error('400 Bad Request'))).toBe(false);
    expect(result.current.shouldRetry(1, new Error('404 Not Found'))).toBe(false);
  });

  it('should not retry when offline', () => {
    const { result } = renderHook(() => useOfflineAwareQuery());

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOffline).toBe(true);
    expect(result.current.shouldRetry(1, new Error('Network error'))).toBe(false);
  });

  it('should provide exponential backoff with jitter', () => {
    const { result } = renderHook(() => useOfflineAwareQuery());

    const delay1 = result.current.getRetryDelay(0);
    const delay2 = result.current.getRetryDelay(1);
    const delay3 = result.current.getRetryDelay(2);

    // Should increase exponentially
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay3).toBeGreaterThan(delay2);

    // Should cap at 10 seconds
    const delay10 = result.current.getRetryDelay(10);
    expect(delay10).toBeLessThanOrEqual(11000); // 10000 + max jitter
  });
});