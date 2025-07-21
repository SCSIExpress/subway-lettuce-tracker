import { Router } from 'express';
import { PerformanceMonitor, MemoryMonitor, AdvancedPerformanceMonitor } from '../utils/performanceMonitor';
import { CacheService } from '../cache/redisClient';
import { cacheWarmingService } from '../services/cacheWarmingService';

const router = Router();

/**
 * GET /api/performance/metrics
 * Get comprehensive performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const dashboard = AdvancedPerformanceMonitor.getPerformanceDashboard();
    const cacheStats = await CacheService.getStats();
    const cacheHitRate = await CacheService.getCacheHitRate();
    const warmingStats = await cacheWarmingService.getCacheWarmingStats();

    res.json({
      timestamp: new Date().toISOString(),
      performance: dashboard,
      cache: {
        ...cacheStats,
        hitRate: cacheHitRate,
        warming: warmingStats
      },
      memory: MemoryMonitor.getMemoryTrend(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/summary
 * Get performance summary for monitoring dashboards
 */
router.get('/summary', (req, res) => {
  try {
    const summary = PerformanceMonitor.getSummary();
    const memoryTrend = MemoryMonitor.getMemoryTrend();
    
    res.json({
      timestamp: new Date().toISOString(),
      summary,
      memory: {
        trend: memoryTrend.trend,
        currentUsageMB: Math.round(memoryTrend.currentUsage / 1024 / 1024),
        averageUsageMB: Math.round(memoryTrend.averageUsage / 1024 / 1024),
        peakUsageMB: Math.round(memoryTrend.peakUsage / 1024 / 1024)
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Error getting performance summary:', error);
    res.status(500).json({
      error: 'Failed to get performance summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/slow-queries
 * Get slow database queries
 */
router.get('/slow-queries', (req, res) => {
  try {
    const dashboard = AdvancedPerformanceMonitor.getPerformanceDashboard();
    
    res.json({
      timestamp: new Date().toISOString(),
      slowQueries: dashboard.slowQueries,
      threshold: 1000 // ms
    });
  } catch (error) {
    console.error('Error getting slow queries:', error);
    res.status(500).json({
      error: 'Failed to get slow queries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/cache
 * Get cache performance metrics
 */
router.get('/cache', async (req, res) => {
  try {
    const cacheStats = await CacheService.getStats();
    const hitRate = await CacheService.getCacheHitRate();
    const warmingStats = await cacheWarmingService.getCacheWarmingStats();

    res.json({
      timestamp: new Date().toISOString(),
      connected: cacheStats.connected,
      keyCount: cacheStats.keyCount,
      hitRate: hitRate.hitRate,
      hits: hitRate.hits,
      misses: hitRate.misses,
      warming: {
        isRunning: warmingStats.isRunning,
        lastWarming: warmingStats.lastWarming
      }
    });
  } catch (error) {
    console.error('Error getting cache metrics:', error);
    res.status(500).json({
      error: 'Failed to get cache metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/performance/cache/warm
 * Manually trigger cache warming
 */
router.post('/cache/warm', async (req, res) => {
  try {
    await cacheWarmingService.warmCache();
    
    res.json({
      success: true,
      message: 'Cache warming initiated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error warming cache:', error);
    res.status(500).json({
      error: 'Failed to warm cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/performance/cache
 * Clear cache (for testing/debugging)
 */
router.delete('/cache', async (req, res) => {
  try {
    const patterns = req.body.patterns || ['*'];
    await cacheWarmingService.invalidateCache(patterns);
    
    res.json({
      success: true,
      message: 'Cache cleared',
      patterns,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/health
 * Health check endpoint with performance indicators
 */
router.get('/health', async (req, res) => {
  try {
    const memoryTrend = MemoryMonitor.getMemoryTrend();
    const cacheStats = await CacheService.getStats();
    const dashboard = AdvancedPerformanceMonitor.getPerformanceDashboard();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        status: memoryTrend.trend === 'increasing' && 
                memoryTrend.currentUsage > memoryTrend.averageUsage * 2 
                ? 'warning' : 'healthy',
        usage: Math.round(memoryTrend.currentUsage / 1024 / 1024),
        trend: memoryTrend.trend
      },
      cache: {
        status: cacheStats.connected ? 'healthy' : 'unhealthy',
        connected: cacheStats.connected,
        keyCount: cacheStats.keyCount
      },
      performance: {
        errorRate: dashboard.errorRate,
        slowQueriesCount: dashboard.slowQueries.length
      }
    };

    // Determine overall health status
    if (!cacheStats.connected || dashboard.errorRate > 10) {
      health.status = 'unhealthy';
      res.status(503);
    } else if (memoryTrend.trend === 'increasing' || dashboard.errorRate > 5) {
      health.status = 'warning';
    }

    res.json(health);
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to get health status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/performance/export
 * Export all performance data for external monitoring
 */
router.get('/export', async (req, res) => {
  try {
    const exportData = PerformanceMonitor.exportMetrics();
    const memoryTrend = MemoryMonitor.getMemoryTrend();
    const cacheStats = await CacheService.getStats();
    const hitRate = await CacheService.getCacheHitRate();

    res.json({
      ...exportData,
      memory: memoryTrend,
      cache: {
        ...cacheStats,
        hitRate: hitRate.hitRate,
        hits: hitRate.hits,
        misses: hitRate.misses
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (error) {
    console.error('Error exporting performance data:', error);
    res.status(500).json({
      error: 'Failed to export performance data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;