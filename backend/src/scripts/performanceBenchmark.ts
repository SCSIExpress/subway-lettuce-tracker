#!/usr/bin/env ts-node

import { LocationQueryBenchmark } from '../__tests__/performance/location-queries.test';
import { testConnection, initializePostGIS } from '../database/connection';
import { connectRedis } from '../cache/redisClient';
import { cacheWarmingService } from '../services/cacheWarmingService';
import { PerformanceMonitor, MemoryMonitor } from '../utils/performanceMonitor';
import fs from 'fs';
import path from 'path';

/**
 * Performance Benchmark Script
 * 
 * This script runs comprehensive performance benchmarks for the Subway Lettuce Tracker API.
 * It tests database queries, caching performance, memory usage, and concurrent operations.
 * 
 * Usage:
 *   npm run benchmark
 *   or
 *   ts-node src/scripts/performanceBenchmark.ts
 */

interface BenchmarkConfig {
  warmCache: boolean;
  iterations: {
    nearby: number;
    details: number;
    concurrent: number;
    cache: number;
    ratings: number;
    stress: number;
    memory: number;
  };
  outputFile?: string;
  verbose: boolean;
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  warmCache: true,
  iterations: {
    nearby: 50,
    details: 30,
    concurrent: 10,
    cache: 20,
    ratings: 20,
    stress: 50,
    memory: 100
  },
  verbose: true
};

class PerformanceBenchmarkRunner {
  private config: BenchmarkConfig;
  private benchmark: LocationQueryBenchmark;
  private startTime: number = 0;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.benchmark = new LocationQueryBenchmark();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Performance Benchmark Suite');
    console.log('=' .repeat(60));
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🔧 Configuration:`, JSON.stringify(this.config, null, 2));
    console.log('=' .repeat(60));

    this.startTime = performance.now();

    try {
      // Initialize connections
      await this.initializeConnections();

      // Warm cache if requested
      if (this.config.warmCache) {
        await this.warmCache();
      }

      // Start monitoring
      this.startMonitoring();

      // Run benchmarks
      const results = await this.benchmark.runFullBenchmark();

      // Generate report
      await this.generateReport(results);

      console.log('\n✅ Benchmark suite completed successfully!');
      
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async initializeConnections(): Promise<void> {
    console.log('\n🔌 Initializing connections...');

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('  ✓ Database connected');

    // Initialize PostGIS
    await initializePostGIS();
    console.log('  ✓ PostGIS initialized');

    // Connect to Redis (optional)
    const redisConnected = await connectRedis();
    if (redisConnected) {
      console.log('  ✓ Redis connected');
    } else {
      console.log('  ⚠️ Redis not available - caching disabled');
    }
  }

  private async warmCache(): Promise<void> {
    console.log('\n🔥 Warming cache...');
    
    try {
      await cacheWarmingService.warmCache();
      console.log('  ✓ Cache warmed successfully');
    } catch (error) {
      console.log('  ⚠️ Cache warming failed:', error);
    }
  }

  private startMonitoring(): void {
    console.log('\n📊 Starting performance monitoring...');
    
    // Start memory monitoring
    MemoryMonitor.startMemoryMonitoring(5000); // Every 5 seconds during benchmark
    console.log('  ✓ Memory monitoring started');
  }

  private async generateReport(results: any): Promise<void> {
    const totalTime = performance.now() - this.startTime;
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalDuration: totalTime,
        config: this.config,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage()
        }
      },
      results,
      summary: this.generateSummary(results),
      recommendations: this.generateRecommendations(results)
    };

    // Print summary to console
    this.printConsoleSummary(report);

    // Save to file if requested
    if (this.config.outputFile) {
      await this.saveReportToFile(report);
    }
  }

  private generateSummary(results: any): any {
    const categories = [
      'nearbyQueries',
      'locationDetails', 
      'concurrentQueries',
      'cachePerformance',
      'ratingOperations',
      'stressTest'
    ];

    const summary = {
      totalOperations: 0,
      averageDuration: 0,
      p95Duration: 0,
      memoryEfficiency: 'good',
      cacheEffectiveness: 'unknown'
    };

    let totalDuration = 0;
    let maxP95 = 0;

    categories.forEach(category => {
      const data = results[category];
      if (data && data.totalOperations > 0) {
        summary.totalOperations += data.totalOperations;
        totalDuration += data.avgDuration * data.totalOperations;
        maxP95 = Math.max(maxP95, data.p95Duration);
      }
    });

    summary.averageDuration = summary.totalOperations > 0 
      ? totalDuration / summary.totalOperations 
      : 0;
    summary.p95Duration = maxP95;

    // Determine memory efficiency
    const memoryIncrease = results.memoryUsage?.avgMemory || 0;
    if (memoryIncrease > 10000) { // 10MB
      summary.memoryEfficiency = 'poor';
    } else if (memoryIncrease > 5000) { // 5MB
      summary.memoryEfficiency = 'fair';
    }

    // Determine cache effectiveness
    if (results.cachePerformance && results.nearbyQueries) {
      const cacheRatio = results.cachePerformance.avgDuration / results.nearbyQueries.avgDuration;
      if (cacheRatio < 0.3) {
        summary.cacheEffectiveness = 'excellent';
      } else if (cacheRatio < 0.5) {
        summary.cacheEffectiveness = 'good';
      } else {
        summary.cacheEffectiveness = 'poor';
      }
    }

    return summary;
  }

  private generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];

    // Check query performance
    if (results.nearbyQueries?.avgDuration > 200) {
      recommendations.push('Consider optimizing nearby location queries - average duration exceeds 200ms');
    }

    if (results.locationDetails?.avgDuration > 150) {
      recommendations.push('Location detail queries are slow - consider adding more indexes');
    }

    // Check memory usage
    const memoryIncrease = results.memoryUsage?.avgMemory || 0;
    if (memoryIncrease > 10000) {
      recommendations.push('High memory usage detected - investigate potential memory leaks');
    }

    // Check cache effectiveness
    if (results.cachePerformance && results.nearbyQueries) {
      const cacheRatio = results.cachePerformance.avgDuration / results.nearbyQueries.avgDuration;
      if (cacheRatio > 0.7) {
        recommendations.push('Cache is not providing significant performance benefits - review caching strategy');
      }
    }

    // Check concurrent performance
    if (results.concurrentQueries?.avgDuration > 1000) {
      recommendations.push('Concurrent query performance is poor - consider connection pool optimization');
    }

    // Check stress test results
    if (results.stressTest?.avgDuration > 5000) {
      recommendations.push('System struggles under stress - consider scaling improvements');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No immediate optimizations needed.');
    }

    return recommendations;
  }

  private printConsoleSummary(report: any): void {
    console.log('\n📋 BENCHMARK REPORT SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Duration: ${(report.metadata.totalDuration / 1000).toFixed(2)}s`);
    console.log(`Total Operations: ${report.summary.totalOperations}`);
    console.log(`Average Duration: ${report.summary.averageDuration.toFixed(2)}ms`);
    console.log(`P95 Duration: ${report.summary.p95Duration.toFixed(2)}ms`);
    console.log(`Memory Efficiency: ${report.summary.memoryEfficiency}`);
    console.log(`Cache Effectiveness: ${report.summary.cacheEffectiveness}`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach((rec: string, index: number) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  private async saveReportToFile(report: any): Promise<void> {
    try {
      const outputPath = path.resolve(this.config.outputFile!);
      const outputDir = path.dirname(outputPath);
      
      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write report
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${outputPath}`);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    try {
      // Stop cache warming
      cacheWarmingService.stopCacheWarming();
      
      // Clean up performance metrics
      PerformanceMonitor.cleanup();
      
      console.log('  ✓ Cleanup completed');
    } catch (error) {
      console.error('  ⚠️ Cleanup failed:', error);
    }
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config: Partial<BenchmarkConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-cache':
        config.warmCache = false;
        break;
      case '--output':
        const nextArg = args[++i];
        if (nextArg) {
          config.outputFile = nextArg;
        }
        break;
      case '--quiet':
        config.verbose = false;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  // Set default output file if not specified
  if (!config.outputFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    config.outputFile = `./benchmark-results/benchmark-${timestamp}.json`;
  }

  const runner = new PerformanceBenchmarkRunner(config);
  await runner.run();
}

function printHelp(): void {
  console.log(`
Performance Benchmark Tool

Usage: npm run benchmark [options]

Options:
  --no-cache    Skip cache warming before benchmark
  --output      Specify output file path (default: ./benchmark-results/benchmark-[timestamp].json)
  --quiet       Reduce console output
  --help        Show this help message

Examples:
  npm run benchmark
  npm run benchmark -- --output ./my-benchmark.json
  npm run benchmark -- --no-cache --quiet
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { PerformanceBenchmarkRunner, BenchmarkConfig };