import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DataSyncIndicator, { DataFreshnessIndicator } from '../DataSyncIndicator';

// Mock the useDataSyncStatus hook
vi.mock('../../hooks/useLocationQueries', () => ({
  useDataSyncStatus: vi.fn(),
}));

import { useDataSyncStatus } from '../../hooks/useLocationQueries';

const mockUseDataSyncStatus = useDataSyncStatus as ReturnType<typeof vi.fn>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('DataSyncIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show syncing status when data is being fetched', () => {
    mockUseDataSyncStatus.mockReturnValue({
      isSyncing: true,
      lastSyncTime: null,
      failedQueries: 0,
    });

    render(
      <DataSyncIndicator showDetails={true} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('should show up-to-date status when sync is complete', () => {
    const lastSyncTime = new Date();
    mockUseDataSyncStatus.mockReturnValue({
      isSyncing: false,
      lastSyncTime,
      failedQueries: 0,
    });

    render(
      <DataSyncIndicator showDetails={true} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('should show error status when there are failed queries', () => {
    const lastSyncTime = new Date();
    mockUseDataSyncStatus.mockReturnValue({
      isSyncing: false,
      lastSyncTime,
      failedQueries: 2,
    });

    render(
      <DataSyncIndicator showDetails={true} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Sync issues')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    expect(screen.getByText('2 failed requests')).toBeInTheDocument();
  });

  it('should show minimal indicator when showDetails is false', () => {
    mockUseDataSyncStatus.mockReturnValue({
      isSyncing: false,
      lastSyncTime: new Date(),
      failedQueries: 0,
    });

    render(
      <DataSyncIndicator showDetails={false} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.queryByText('Up to date')).not.toBeInTheDocument();
  });
});

describe('DataFreshnessIndicator', () => {
  it('should show "Live" for very recent updates', () => {
    const justNow = new Date(Date.now() - 10 * 1000); // 10 seconds ago

    render(<DataFreshnessIndicator lastUpdated={justNow} />);

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();
  });

  it('should show seconds for recent updates', () => {
    const fortySecondsAgo = new Date(Date.now() - 40 * 1000);

    render(<DataFreshnessIndicator lastUpdated={fortySecondsAgo} />);

    expect(screen.getByText('40s')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();
  });

  it('should show minutes for older updates', () => {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    render(<DataFreshnessIndicator lastUpdated={threeMinutesAgo} />);

    expect(screen.getByText('3m')).toBeInTheDocument();
    expect(screen.getByText('🔵')).toBeInTheDocument();
  });

  it('should show hours for very old updates', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    render(<DataFreshnessIndicator lastUpdated={twoHoursAgo} />);

    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('should show stale indicator when isStale is true', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    render(<DataFreshnessIndicator lastUpdated={oneMinuteAgo} isStale={true} />);

    expect(screen.getByText('1m')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('should show unknown when lastUpdated is not provided', () => {
    render(<DataFreshnessIndicator />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('❓')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DataFreshnessIndicator className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});