import React from 'react';
import { useDataSyncStatus } from '../hooks/useLocationQueries';

interface DataSyncIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const DataSyncIndicator: React.FC<DataSyncIndicatorProps> = ({
  className = '',
  showDetails = false,
}) => {
  const syncStatus = useDataSyncStatus();

  const formatLastSync = (lastSyncTime: Date | null): string => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return lastSyncTime.toLocaleTimeString();
  };

  const getSyncStatusColor = () => {
    if (syncStatus.isSyncing) return 'text-blue-600';
    if (syncStatus.failedQueries > 0) return 'text-red-600';
    return 'text-green-600';
  };

  const getSyncStatusIcon = () => {
    if (syncStatus.isSyncing) return '🔄';
    if (syncStatus.failedQueries > 0) return '⚠️';
    return '✅';
  };

  const getSyncStatusText = () => {
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.failedQueries > 0) return 'Sync issues';
    return 'Up to date';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className="text-sm">{getSyncStatusIcon()}</span>
        {syncStatus.isSyncing && (
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSyncStatusIcon()}</span>
          <div>
            <p className={`text-sm font-medium ${getSyncStatusColor()}`}>
              {getSyncStatusText()}
            </p>
            <p className="text-xs text-gray-500">
              Last sync: {formatLastSync(syncStatus.lastSyncTime)}
            </p>
          </div>
        </div>
        
        {syncStatus.isSyncing && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
      
      {syncStatus.failedQueries > 0 && (
        <div className="mt-2 text-xs text-red-600">
          {syncStatus.failedQueries} failed request{syncStatus.failedQueries !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

// Component for showing data freshness on location cards
interface DataFreshnessIndicatorProps {
  lastUpdated?: Date;
  isStale?: boolean;
  className?: string;
}

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  lastUpdated,
  isStale = false,
  className = '',
}) => {
  const getTimeSinceUpdate = (): string => {
    if (!lastUpdated) return 'Unknown';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 30) return 'Live';
    if (diffSeconds < 60) return `${diffSeconds}s`;
    if (diffMinutes < 60) return `${diffMinutes}m`;
    return `${Math.floor(diffMinutes / 60)}h`;
  };

  const getFreshnessColor = (): string => {
    if (!lastUpdated) return 'text-gray-400';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (isStale || diffMinutes > 10) return 'text-red-500';
    if (diffMinutes > 5) return 'text-yellow-500';
    if (diffMinutes > 2) return 'text-blue-500';
    return 'text-green-500';
  };

  const getFreshnessIcon = (): string => {
    if (!lastUpdated) return '❓';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (isStale || diffMinutes > 10) return '🔴';
    if (diffMinutes > 5) return '🟡';
    if (diffMinutes > 2) return '🔵';
    return '🟢';
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs">{getFreshnessIcon()}</span>
      <span className={`text-xs font-medium ${getFreshnessColor()}`}>
        {getTimeSinceUpdate()}
      </span>
    </div>
  );
};

export default DataSyncIndicator;