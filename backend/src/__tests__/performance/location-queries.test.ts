import { LocationRepository } from '../../repositories/LocationRepository';
import { RatingRepository } from '../../repositories/RatingRepository';
import { PerformanceMonitor } from '../../utils/performanceMonitor';
import pool from '../../database/connection';

describe('Location Query Performance Tests', () => {
  let locationRepository: LocationRepository;
  let ratingRepository: RatingRepository;
  
  beforeAll(async () => {
    locationRepository = new LocationRepository();
    ratingRepository = new RatingRepository();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Nearby Locations Performance', () => {
    test('should fetch nearby locations within acceptable time', async () => {
      const startTime = performance.now();
      
      const locations = await locationRepository.getNearbyLocations(
        { lat: 40.7128, lng: -74.0060 }, // NYC coordinates
        5000 // 5km radius
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 500ms
      expect(duration).toBeLessThan(500);
      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
      
      console.log(`Nearby locations query took ${duration.toFixed(2)}ms`);
    });

    test('should handle large radius queries efficiently', async () => {
      const startTime = performance.now();
      
      const locations = await locationRepository.getNearbyLocations(
        { lat: 40.7128, lng: -74.0060 },
        50000 // 50km radius
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second even for large radius
      expect(duration).toBeLessThan(1000);
      expect(locations).toBeDefined();
      
      console.log(`Large radius query took ${duration.toFixed(2)}ms`);
    });

    test('should benefit from caching on repeated queries', async () => {
      const coordinates = { lat: 40.7128, lng: -74.0060 };
      const radius = 5000;
      
      // First query (no cache)
      const start1 = performance.now();
      const locations1 = await locationRepository.getNearbyLocations(coordinates, radius);
      const duration1 = performance.now() - start1;
      
      // Second query (should use cache)
      const start2 = performance.now();
      const locations2 = await locationRepository.getNearbyLocations(coordinates, radius);
      const duration2 = performance.now() - start2;
      
      // Cached query should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
      expect(locations1).toEqual(locations2);
      
      console.log(`First query: ${duration1.toFixed(2)}ms, Cached query: ${duration2.toFixed(2)}ms`);
    });
  });

  describe('Location Detail Performance', () => {
    test('should fetch location details efficiently', async () => {
      // First get a location ID
      const locations = await locationRepository.getNearbyLocations(
        { lat: 40.7128, lng: -74.0060 },
        5000
      );
      
      if (locations.length === 0) {
        console.log('No locations found for performance test');
        return;
      }

      const locationId = locations[0]!.id;
      const startTime = performance.now();
      
      const locationDetail = await locationRepository.getLocationById(locationId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 300ms
      expect(duration).toBeLessThan(300);
      expect(locationDetail).toBeDefined();
      expect(locationDetail?.id).toBe(locationId);
      
      console.log(`Location detail query took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Rating Operations Performance', () => {
    test('should create ratings efficiently', async () => {
      // Get a location to rate
      const locations = await locationRepository.getNearbyLocations(
        { lat: 40.7128, lng: -74.0060 },
        5000
      );
      
      if (locations.length === 0) {
        console.log('No locations found for rating performance test');
        return;
      }

      const locationId = locations[0]!.id;
      const startTime = performance.now();
      
      const ratingId = await ratingRepository.createRating(locationId, 4);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 200ms
      expect(duration).toBeLessThan(200);
      expect(ratingId).toBeDefined();
      
      console.log(`Rating creation took ${duration.toFixed(2)}ms`);
    });

    test('should fetch rating statistics efficiently', async () => {
      const locations = await locationRepository.getNearbyLocations(
        { lat: 40.7128, lng: -74.0060 },
        5000
      );
      
      if (locations.length === 0) {
        console.log('No locations found for rating stats test');
        return;
      }

      const locationId = locations[0]!.id;
      const startTime = performance.now();
      
      const stats = await ratingRepository.getRatingStats(locationId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 150ms
      expect(duration).toBeLessThan(150);
      expect(stats).toBeDefined();
      expect(typeof stats.averageScore).toBe('number');
      
      console.log(`Rating stats query took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Query Performance', () => {
    test('should handle concurrent nearby location queries', async () => {
      const coordinates = [
        { lat: 40.7128, lng: -74.0060 }, // NYC
        { lat: 34.0522, lng: -118.2437 }, // LA
        { lat: 41.8781, lng: -87.6298 }, // Chicago
        { lat: 29.7604, lng: -95.3698 }, // Houston
        { lat: 33.4484, lng: -112.0740 }, // Phoenix
      ];

      const startTime = performance.now();
      
      const promises = coordinates.map(coord => 
        locationRepository.getNearbyLocations(coord, 5000)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // All 5 concurrent queries should complete within 1 second
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
      
      console.log(`5 concurrent queries took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should record performance metrics', async () => {
      // Clear existing metrics
      PerformanceMonitor.cleanup();
      
      // Perform some operations
      await locationRepository.getNearbyLocations(
        { lat: 40.7128, lng: -74.0060 },
        5000
      );
      
      // Check if metrics were recorded
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const nearbyMetrics = PerformanceMonitor.getMetricsByName('db_getNearbyLocations');
      expect(nearbyMetrics.length).toBeGreaterThan(0);
      
      const stats = PerformanceMonitor.getStats('db_getNearbyLocations');
      expect(stats.count).toBeGreaterThan(0);
      expect(stats.average).toBeGreaterThan(0);
      
      console.log('Performance metrics:', stats);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not cause memory leaks with repeated queries', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many queries
      for (let i = 0; i < 50; i++) {
        await locationRepository.getNearbyLocations(
          { lat: 40.7128 + (Math.random() - 0.5) * 0.1, lng: -74.0060 + (Math.random() - 0.5) * 0.1 },
          5000
        );
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Database Connection Pool Performance', () => {
    test('should handle connection pool efficiently', async () => {
      const startTime = performance.now();
      
      // Create many concurrent database operations
      const promises = Array.from({ length: 20 }, (_, i) => 
        locationRepository.getNearbyLocations(
          { lat: 40.7128 + i * 0.001, lng: -74.0060 + i * 0.001 },
          1000
        )
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 20 concurrent operations should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
      expect(results).toHaveLength(20);
      
      console.log(`20 concurrent DB operations took ${duration.toFixed(2)}ms`);
    });
  });
});

// Comprehensive benchmark utility
export class LocationQueryBenchmark {
  private locationRepository: LocationRepository;
  private ratingRepository: RatingRepository;
  
  constructor() {
    this.locationRepository = new LocationRepository();
    this.ratingRepository = new RatingRepository();
  }
  
  async runFullBenchmark(): Promise<BenchmarkResults> {
    console.log('🚀 Starting Comprehensive Performance Benchmark...\n');
    
    const results: BenchmarkResults = {
      timestamp: new Date().toISOString(),
      nearbyQueries: await this.benchmarkNearbyQueries(),
      locationDetails: await this.benchmarkLocationDetails(),
      concurrentQueries: await this.benchmarkConcurrentQueries(),
      cachePerformance: await this.benchmarkCachePerformance(),
      ratingOperations: await this.benchmarkRatingOperations(),
      stressTest: await this.benchmarkStressTest(),
      memoryUsage: await this.benchmarkMemoryUsage()
    };
    
    console.log('\n✅ Benchmark completed!');
    this.printSummary(results);
    
    return results;
  }
  
  private async benchmarkNearbyQueries(): Promise<BenchmarkResult> {
    console.log('📍 Benchmarking nearby location queries...');
    
    const coordinates = { lat: 40.7128, lng: -74.0060 };
    const iterations = 50;
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage().heapUsed;
      const start = performance.now();
      
      await this.locationRepository.getNearbyLocations(coordinates, 5000);
      
      const duration = performance.now() - start;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      durations.push(duration);
      memoryUsages.push(memoryDelta);
    }
    
    const result = this.calculateStats(durations, memoryUsages);
    console.log(`  ✓ Average: ${result.avgDuration.toFixed(2)}ms, Memory: ${result.avgMemory.toFixed(2)}KB`);
    
    return result;
  }
  
  private async benchmarkLocationDetails(): Promise<BenchmarkResult> {
    console.log('🏪 Benchmarking location detail queries...');
    
    // Get multiple locations for testing
    const locations = await this.locationRepository.getNearbyLocations(
      { lat: 40.7128, lng: -74.0060 },
      10000
    );
    
    if (locations.length === 0) {
      console.log('  ⚠️ No locations found for benchmark');
      return this.createEmptyResult();
    }
    
    const iterations = Math.min(30, locations.length);
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const locationId = locations[i % locations.length]!.id;
      const startMemory = process.memoryUsage().heapUsed;
      const start = performance.now();
      
      await this.locationRepository.getLocationById(locationId);
      
      const duration = performance.now() - start;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      durations.push(duration);
      memoryUsages.push(memoryDelta);
    }
    
    const result = this.calculateStats(durations, memoryUsages);
    console.log(`  ✓ Average: ${result.avgDuration.toFixed(2)}ms, Memory: ${result.avgMemory.toFixed(2)}KB`);
    
    return result;
  }
  
  private async benchmarkConcurrentQueries(): Promise<BenchmarkResult> {
    console.log('🔄 Benchmarking concurrent queries...');
    
    const coordinates = [
      { lat: 40.7128, lng: -74.0060 }, // NYC
      { lat: 34.0522, lng: -118.2437 }, // LA
      { lat: 41.8781, lng: -87.6298 }, // Chicago
      { lat: 29.7604, lng: -95.3698 }, // Houston
      { lat: 33.4484, lng: -112.0740 }, // Phoenix
      { lat: 39.9526, lng: -75.1652 }, // Philadelphia
      { lat: 29.4241, lng: -98.4936 }, // San Antonio
      { lat: 32.7157, lng: -117.1611 }, // San Diego
    ];
    
    const iterations = 10;
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage().heapUsed;
      const start = performance.now();
      
      const promises = coordinates.map(coord => 
        this.locationRepository.getNearbyLocations(coord, 5000)
      );
      
      await Promise.all(promises);
      
      const duration = performance.now() - start;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      durations.push(duration);
      memoryUsages.push(memoryDelta);
    }
    
    const result = this.calculateStats(durations, memoryUsages);
    console.log(`  ✓ ${coordinates.length} concurrent queries - Average: ${result.avgDuration.toFixed(2)}ms`);
    
    return result;
  }
  
  private async benchmarkCachePerformance(): Promise<BenchmarkResult> {
    console.log('💾 Benchmarking cache performance...');
    
    const coordinates = { lat: 40.7128, lng: -74.0060 };
    const iterations = 20;
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    // First query (no cache)
    await this.locationRepository.getNearbyLocations(coordinates, 5000);
    
    // Subsequent queries (should use cache)
    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage().heapUsed;
      const start = performance.now();
      
      await this.locationRepository.getNearbyLocations(coordinates, 5000);
      
      const duration = performance.now() - start;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      durations.push(duration);
      memoryUsages.push(memoryDelta);
    }
    
    const result = this.calculateStats(durations, memoryUsages);
    console.log(`  ✓ Cached queries - Average: ${result.avgDuration.toFixed(2)}ms`);
    
    return result;
  }
  
  private async benchmarkRatingOperations(): Promise<BenchmarkResult> {
    console.log('⭐ Benchmarking rating operations...');
    
    const locations = await this.locationRepository.getNearbyLocations(
      { lat: 40.7128, lng: -74.0060 },
      5000
    );
    
    if (locations.length === 0) {
      console.log('  ⚠️ No locations found for rating benchmark');
      return this.createEmptyResult();
    }
    
    const iterations = 20;
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const locationId = locations[i % locations.length]!.id;
      const score = Math.floor(Math.random() * 5) + 1;
      
      const startMemory = process.memoryUsage().heapUsed;
      const start = performance.now();
      
      await this.ratingRepository.createRating(locationId, score);
      
      const duration = performance.now() - start;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      durations.push(duration);
      memoryUsages.push(memoryDelta);
    }
    
    const result = this.calculateStats(durations, memoryUsages);
    console.log(`  ✓ Rating creation - Average: ${result.avgDuration.toFixed(2)}ms`);
    
    return result;
  }
  
  private async benchmarkStressTest(): Promise<BenchmarkResult> {
    console.log('🔥 Running stress test...');
    
    const coordinates = { lat: 40.7128, lng: -74.0060 };
    const concurrentRequests = 50;
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    const startMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    const promises = Array.from({ length: concurrentRequests }, (_, i) => 
      this.locationRepository.getNearbyLocations(
        { 
          lat: coordinates.lat + (Math.random() - 0.5) * 0.1, 
          lng: coordinates.lng + (Math.random() - 0.5) * 0.1 
        }, 
        5000
      )
    );
    
    await Promise.all(promises);
    
    const duration = performance.now() - start;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;
    
    durations.push(duration);
    memoryUsages.push(memoryDelta);
    
    const result = this.calculateStats(durations, memoryUsages);
    console.log(`  ✓ ${concurrentRequests} concurrent requests - Total: ${result.avgDuration.toFixed(2)}ms`);
    
    return result;
  }
  
  private async benchmarkMemoryUsage(): Promise<BenchmarkResult> {
    console.log('🧠 Benchmarking memory usage...');
    
    const initialMemory = process.memoryUsage();
    const coordinates = { lat: 40.7128, lng: -74.0060 };
    const iterations = 100;
    
    // Perform many operations to test memory leaks
    for (let i = 0; i < iterations; i++) {
      await this.locationRepository.getNearbyLocations(
        { 
          lat: coordinates.lat + (Math.random() - 0.5) * 0.1, 
          lng: coordinates.lng + (Math.random() - 0.5) * 0.1 
        }, 
        Math.floor(Math.random() * 10000) + 1000
      );
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    console.log(`  ✓ Memory increase after ${iterations} operations: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    
    return {
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      avgMemory: memoryIncrease / 1024,
      minMemory: memoryIncrease / 1024,
      maxMemory: memoryIncrease / 1024,
      totalOperations: iterations
    };
  }
  
  private calculateStats(durations: number[], memoryUsages: number[]): BenchmarkResult {
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const sortedMemory = [...memoryUsages].sort((a, b) => a - b);
    
    return {
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: sortedDurations[Math.floor(sortedDurations.length * 0.95)] || 0,
      p99Duration: sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0,
      avgMemory: memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length / 1024, // KB
      minMemory: Math.min(...memoryUsages) / 1024,
      maxMemory: Math.max(...memoryUsages) / 1024,
      totalOperations: durations.length
    };
  }
  
  private createEmptyResult(): BenchmarkResult {
    return {
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      avgMemory: 0,
      minMemory: 0,
      maxMemory: 0,
      totalOperations: 0
    };
  }
  
  private printSummary(results: BenchmarkResults): void {
    console.log('\n📊 BENCHMARK SUMMARY');
    console.log('='.repeat(50));
    
    const categories = [
      { name: 'Nearby Queries', data: results.nearbyQueries },
      { name: 'Location Details', data: results.locationDetails },
      { name: 'Concurrent Queries', data: results.concurrentQueries },
      { name: 'Cache Performance', data: results.cachePerformance },
      { name: 'Rating Operations', data: results.ratingOperations },
      { name: 'Stress Test', data: results.stressTest }
    ];
    
    categories.forEach(category => {
      if (category.data.totalOperations > 0) {
        console.log(`\n${category.name}:`);
        console.log(`  Avg Duration: ${category.data.avgDuration.toFixed(2)}ms`);
        console.log(`  P95 Duration: ${category.data.p95Duration.toFixed(2)}ms`);
        console.log(`  P99 Duration: ${category.data.p99Duration.toFixed(2)}ms`);
        console.log(`  Avg Memory: ${category.data.avgMemory.toFixed(2)}KB`);
        console.log(`  Operations: ${category.data.totalOperations}`);
      }
    });
    
    console.log(`\nMemory Usage Test:`);
    console.log(`  Memory Increase: ${results.memoryUsage.avgMemory.toFixed(2)}KB`);
    console.log(`  Operations: ${results.memoryUsage.totalOperations}`);
  }
}

// Benchmark result interfaces
interface BenchmarkResult {
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  avgMemory: number;
  minMemory: number;
  maxMemory: number;
  totalOperations: number;
}

interface BenchmarkResults {
  timestamp: string;
  nearbyQueries: BenchmarkResult;
  locationDetails: BenchmarkResult;
  concurrentQueries: BenchmarkResult;
  cachePerformance: BenchmarkResult;
  ratingOperations: BenchmarkResult;
  stressTest: BenchmarkResult;
  memoryUsage: BenchmarkResult;
}