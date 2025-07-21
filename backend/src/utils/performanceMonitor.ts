import { performance } from 'perf_hooks';

// Performance metrics interface
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any> | undefined;
}

// Performance monitoring class
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  static startTimer(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.timers.set(name, startTime);
    
    if (metadata) {
      this.timers.set(`${name}_metadata`, metadata as any);
    }
  }

  /**
   * End timing an operation and record the metric
   */
  static endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const metadata = this.timers.get(`${name}_metadata`) as Record<string, any> | undefined;

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      ...(metadata && { metadata })
    };

    this.metrics.push(metric);
    this.timers.delete(name);
    this.timers.delete(`${name}_metadata`);

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Record a custom metric
   */
  static recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
  }

  /**
   * Get all metrics
   */
  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  static getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  /**
   * Get performance statistics for a metric
   */
  static getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    total: number;
  } {
    const metrics = this.getMetricsByName(name);
    
    if (metrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, total: 0 };
    }

    const durations = metrics.map(m => m.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: metrics.length,
      average: total / metrics.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total
    };
  }

  /**
   * Clear old metrics (keep last 1000)
   */
  static cleanup(): void {
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance summary
   */
  static getSummary(): Record<string, any> {
    const metricNames = [...new Set(this.metrics.map(m => m.name))];
    const summary: Record<string, any> = {};

    metricNames.forEach(name => {
      summary[name] = this.getStats(name);
    });

    return summary;
  }

  /**
   * Export metrics for external monitoring
   */
  static exportMetrics(): {
    timestamp: number;
    metrics: PerformanceMetric[];
    summary: Record<string, any>;
  } {
    return {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      summary: this.getSummary()
    };
  }
}

// Middleware to monitor API request performance
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = performance.now();
  const timerName = `${req.method}_${req.path}`;

  PerformanceMonitor.startTimer(timerName, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = PerformanceMonitor.endTimer(timerName);
    
    // Add response metadata
    PerformanceMonitor.recordMetric(`${timerName}_complete`, duration, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length')
    });

    originalEnd.apply(res, args);
  };

  next();
};

// Database query performance decorator
export function measureQuery(target: any, propertyName: string, descriptor?: PropertyDescriptor) {
  if (!descriptor) {
    // Handle case where decorator is used without parentheses
    descriptor = Object.getOwnPropertyDescriptor(target, propertyName)!;
  }
  
  const method = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    const timerName = `db_${propertyName}`;
    PerformanceMonitor.startTimer(timerName, {
      method: propertyName,
      args: args.length
    });

    try {
      const result = await method.apply(this, args);
      PerformanceMonitor.endTimer(timerName);
      return result;
    } catch (error) {
      PerformanceMonitor.endTimer(timerName);
      throw error;
    }
  };

  return descriptor;
}

// Memory usage monitoring
export class MemoryMonitor {
  private static memoryHistory: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  private static readonly MAX_HISTORY = 100;

  static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  static logMemoryUsage(): void {
    const usage = this.getMemoryUsage();
    console.log('Memory Usage:', {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`
    });
  }

  static startMemoryMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const usage = this.getMemoryUsage();
      const timestamp = Date.now();
      
      // Store in history
      this.memoryHistory.push({ timestamp, usage });
      if (this.memoryHistory.length > this.MAX_HISTORY) {
        this.memoryHistory.shift();
      }
      
      // Record metric
      PerformanceMonitor.recordMetric('memory_usage', usage.heapUsed, {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        timestamp
      });

      // Check for memory leaks
      this.checkMemoryLeaks();
    }, intervalMs);
  }

  static getMemoryTrend(): {
    trend: 'increasing' | 'decreasing' | 'stable';
    averageUsage: number;
    peakUsage: number;
    currentUsage: number;
  } {
    if (this.memoryHistory.length < 5) {
      const current = this.getMemoryUsage();
      return {
        trend: 'stable',
        averageUsage: current.heapUsed,
        peakUsage: current.heapUsed,
        currentUsage: current.heapUsed
      };
    }

    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, item) => sum + item.usage.heapUsed, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, item) => sum + item.usage.heapUsed, 0) / older.length 
      : recentAvg;

    const trend = recentAvg > olderAvg * 1.1 ? 'increasing' 
                : recentAvg < olderAvg * 0.9 ? 'decreasing' 
                : 'stable';

    const allUsages = this.memoryHistory.map(item => item.usage.heapUsed);
    const averageUsage = allUsages.reduce((sum, usage) => sum + usage, 0) / allUsages.length;
    const peakUsage = Math.max(...allUsages);
    const currentUsage = this.getMemoryUsage().heapUsed;

    return { trend, averageUsage, peakUsage, currentUsage };
  }

  private static checkMemoryLeaks(): void {
    const trend = this.getMemoryTrend();
    
    if (trend.trend === 'increasing' && trend.currentUsage > trend.averageUsage * 1.5) {
      console.warn('⚠️ Potential memory leak detected:', {
        current: `${Math.round(trend.currentUsage / 1024 / 1024)} MB`,
        average: `${Math.round(trend.averageUsage / 1024 / 1024)} MB`,
        peak: `${Math.round(trend.peakUsage / 1024 / 1024)} MB`
      });
    }
  }
}

// Advanced performance monitoring
export class AdvancedPerformanceMonitor {
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly MEMORY_LEAK_THRESHOLD = 200 * 1024 * 1024; // 200MB
  
  /**
   * Monitor database query performance
   */
  static async monitorDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      PerformanceMonitor.recordMetric(`db_${queryName}`, duration, {
        ...metadata,
        memoryDelta,
        success: true
      });
      
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      PerformanceMonitor.recordMetric(`db_${queryName}`, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Monitor API endpoint performance
   */
  static monitorApiEndpoint(endpoint: string) {
    return (req: any, res: any, next: any) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      // Override res.end to capture metrics
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const duration = performance.now() - startTime;
        const memoryDelta = process.memoryUsage().heapUsed - startMemory;
        
        PerformanceMonitor.recordMetric(`api_${endpoint}`, duration, {
          method: req.method,
          statusCode: res.statusCode,
          memoryDelta,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Get performance dashboard data
   */
  static getPerformanceDashboard(): {
    summary: Record<string, any>;
    slowQueries: Array<{ name: string; avgDuration: number; count: number }>;
    memoryTrend: ReturnType<typeof MemoryMonitor.getMemoryTrend>;
    errorRate: number;
    topEndpoints: Array<{ name: string; avgDuration: number; count: number }>;
  } {
    const summary = PerformanceMonitor.getSummary();
    const allMetrics = PerformanceMonitor.getMetrics();
    
    // Find slow queries
    const slowQueries = Object.entries(summary)
      .filter(([name, stats]) => name.startsWith('db_') && stats.average > this.SLOW_QUERY_THRESHOLD)
      .map(([name, stats]) => ({
        name: name.replace('db_', ''),
        avgDuration: stats.average,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // Calculate error rate
    const totalRequests = allMetrics.filter(m => m.name.startsWith('api_')).length;
    const errorRequests = allMetrics.filter(m => 
      m.name.startsWith('api_') && 
      m.metadata?.statusCode >= 400
    ).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    // Top endpoints by usage
    const topEndpoints = Object.entries(summary)
      .filter(([name]) => name.startsWith('api_'))
      .map(([name, stats]) => ({
        name: name.replace('api_', ''),
        avgDuration: stats.average,
        count: stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      summary,
      slowQueries,
      memoryTrend: MemoryMonitor.getMemoryTrend(),
      errorRate,
      topEndpoints
    };
  }
}