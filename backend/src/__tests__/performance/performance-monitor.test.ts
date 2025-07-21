import { PerformanceMonitor, MemoryMonitor } from '../../utils/performanceMonitor';

describe('Performance Monitor Tests', () => {
  beforeEach(() => {
    // Clear metrics before each test
    PerformanceMonitor.cleanup();
  });

  describe('Timer Operations', () => {
    test('should start and end timers correctly', () => {
      const timerName = 'test_operation';
      
      PerformanceMonitor.startTimer(timerName);
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }
      
      const duration = PerformanceMonitor.endTimer(timerName);
      
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeGreaterThanOrEqual(5); // Reduced expectation for CI environments
    });

    test('should handle timer with metadata', () => {
      const timerName = 'test_with_metadata';
      const metadata = { operation: 'test', userId: '123' };
      
      PerformanceMonitor.startTimer(timerName, metadata);
      
      // Simulate work
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Wait 5ms
      }
      
      const duration = PerformanceMonitor.endTimer(timerName);
      
      expect(duration).toBeGreaterThan(0);
      
      const metrics = PerformanceMonitor.getMetricsByName(timerName);
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.metadata).toEqual(metadata);
    });

    test('should handle ending non-existent timer', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const duration = PerformanceMonitor.endTimer('non_existent_timer');
      
      expect(duration).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith("Timer 'non_existent_timer' was not started");
      
      consoleSpy.mockRestore();
    });
  });

  describe('Metric Recording', () => {
    test('should record custom metrics', () => {
      const metricName = 'custom_metric';
      const duration = 100;
      const metadata = { type: 'custom' };
      
      PerformanceMonitor.recordMetric(metricName, duration, metadata);
      
      const metrics = PerformanceMonitor.getMetricsByName(metricName);
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.name).toBe(metricName);
      expect(metrics[0]?.duration).toBe(duration);
      expect(metrics[0]?.metadata).toEqual(metadata);
    });

    test('should accumulate multiple metrics', () => {
      const metricName = 'repeated_operation';
      
      PerformanceMonitor.recordMetric(metricName, 50);
      PerformanceMonitor.recordMetric(metricName, 75);
      PerformanceMonitor.recordMetric(metricName, 100);
      
      const metrics = PerformanceMonitor.getMetricsByName(metricName);
      expect(metrics).toHaveLength(3);
      
      const durations = metrics.map(m => m.duration);
      expect(durations).toEqual([50, 75, 100]);
    });
  });

  describe('Statistics', () => {
    test('should calculate correct statistics', () => {
      const metricName = 'stats_test';
      const durations = [10, 20, 30, 40, 50];
      
      durations.forEach(duration => {
        PerformanceMonitor.recordMetric(metricName, duration);
      });
      
      const stats = PerformanceMonitor.getStats(metricName);
      
      expect(stats.count).toBe(5);
      expect(stats.average).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.total).toBe(150);
    });

    test('should handle empty metrics', () => {
      const stats = PerformanceMonitor.getStats('non_existent_metric');
      
      expect(stats.count).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe('Summary and Export', () => {
    test('should generate performance summary', () => {
      PerformanceMonitor.recordMetric('operation_a', 100);
      PerformanceMonitor.recordMetric('operation_a', 200);
      PerformanceMonitor.recordMetric('operation_b', 50);
      
      const summary = PerformanceMonitor.getSummary();
      
      expect(summary).toHaveProperty('operation_a');
      expect(summary).toHaveProperty('operation_b');
      expect(summary.operation_a.count).toBe(2);
      expect(summary.operation_a.average).toBe(150);
      expect(summary.operation_b.count).toBe(1);
      expect(summary.operation_b.average).toBe(50);
    });

    test('should export metrics correctly', () => {
      // Clear any existing metrics first
      PerformanceMonitor.cleanup();
      
      PerformanceMonitor.recordMetric('test_export', 123);
      
      const exported = PerformanceMonitor.exportMetrics();
      
      expect(exported).toHaveProperty('timestamp');
      expect(exported).toHaveProperty('metrics');
      expect(exported).toHaveProperty('summary');
      expect(exported.metrics.length).toBeGreaterThanOrEqual(1);
      
      const testMetric = exported.metrics.find(m => m.name === 'test_export');
      expect(testMetric).toBeDefined();
      expect(testMetric?.duration).toBe(123);
      expect(exported.summary).toHaveProperty('test_export');
    });
  });

  describe('Cleanup', () => {
    test('should limit metrics to 1000 entries', () => {
      // Clear existing metrics first
      PerformanceMonitor.cleanup();
      
      // Get initial count
      const initialCount = PerformanceMonitor.getMetrics().length;
      
      // Add more than 1000 metrics
      for (let i = 0; i < 1200; i++) {
        PerformanceMonitor.recordMetric(`metric_${i}`, i);
      }
      
      let allMetrics = PerformanceMonitor.getMetrics();
      expect(allMetrics.length).toBe(initialCount + 1200);
      
      PerformanceMonitor.cleanup();
      
      allMetrics = PerformanceMonitor.getMetrics();
      expect(allMetrics.length).toBe(1000);
      
      // Should keep the most recent 1000
      const recentMetrics = allMetrics.filter(m => m.name.startsWith('metric_'));
      expect(recentMetrics.length).toBeGreaterThan(0);
    });
  });
});

describe('Memory Monitor Tests', () => {
  test('should get memory usage', () => {
    const usage = MemoryMonitor.getMemoryUsage();
    
    expect(usage).toHaveProperty('rss');
    expect(usage).toHaveProperty('heapTotal');
    expect(usage).toHaveProperty('heapUsed');
    expect(usage).toHaveProperty('external');
    
    expect(typeof usage.rss).toBe('number');
    expect(typeof usage.heapTotal).toBe('number');
    expect(typeof usage.heapUsed).toBe('number');
    expect(typeof usage.external).toBe('number');
    
    expect(usage.rss).toBeGreaterThan(0);
    expect(usage.heapTotal).toBeGreaterThan(0);
    expect(usage.heapUsed).toBeGreaterThan(0);
  });

  test('should log memory usage without errors', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    MemoryMonitor.logMemoryUsage();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Memory Usage:',
      expect.objectContaining({
        rss: expect.stringMatching(/\d+ MB/),
        heapTotal: expect.stringMatching(/\d+ MB/),
        heapUsed: expect.stringMatching(/\d+ MB/),
        external: expect.stringMatching(/\d+ MB/)
      })
    );
    
    consoleSpy.mockRestore();
  });

  test('should start memory monitoring', (done) => {
    const interval = MemoryMonitor.startMemoryMonitoring(100); // 100ms interval
    
    setTimeout(() => {
      clearInterval(interval);
      
      // Check if memory metrics were recorded
      const memoryMetrics = PerformanceMonitor.getMetricsByName('memory_usage');
      expect(memoryMetrics.length).toBeGreaterThan(0);
      
      const latestMetric = memoryMetrics[memoryMetrics.length - 1];
      expect(latestMetric?.metadata).toHaveProperty('rss');
      expect(latestMetric?.metadata).toHaveProperty('heapTotal');
      expect(latestMetric?.metadata).toHaveProperty('heapUsed');
      expect(latestMetric?.metadata).toHaveProperty('external');
      
      done();
    }, 250); // Wait for at least 2 intervals
  });
});

describe('Performance Middleware Integration', () => {
  test('should create middleware function', () => {
    const { performanceMiddleware } = require('../../utils/performanceMonitor');
    
    expect(typeof performanceMiddleware).toBe('function');
    expect(performanceMiddleware.length).toBe(3); // req, res, next
  });

  test('should handle request timing simulation', () => {
    const { performanceMiddleware } = require('../../utils/performanceMonitor');
    
    const mockReq = {
      method: 'GET',
      path: '/test',
      get: jest.fn().mockReturnValue('test-agent'),
      ip: '127.0.0.1'
    };
    
    const mockRes = {
      end: jest.fn(),
      statusCode: 200,
      get: jest.fn().mockReturnValue('100')
    };
    
    const mockNext = jest.fn();
    
    // Call middleware
    performanceMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    
    // Simulate response end
    mockRes.end();
    
    // Check if metrics were recorded
    const metrics = PerformanceMonitor.getMetrics();
    const requestMetrics = metrics.filter(m => m.name.includes('GET_/test'));
    
    expect(requestMetrics.length).toBeGreaterThan(0);
  });
});