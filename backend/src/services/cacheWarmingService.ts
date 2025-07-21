import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/redisClient';
import { LocationRepository } from '../repositories/LocationRepository';
import { RatingRepository } from '../repositories/RatingRepository';
import { PerformanceMonitor } from '../utils/performanceMonitor';
import pool from '../database/connection';

export class CacheWarmingService {
  private locationRepository: LocationRepository;
  private ratingRepository: RatingRepository;
  private warmingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.locationRepository = new LocationRepository();
    this.ratingRepository = new RatingRepository();
  }

  /**
   * Start automatic cache warming
   */
  startCacheWarming(intervalMinutes: number = 30): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }

    console.log(`🔥 Starting cache warming every ${intervalMinutes} minutes`);
    
    // Initial warming
    this.warmCache().catch(error => {
      console.error('Initial cache warming failed:', error);
    });

    // Schedule periodic warming
    this.warmingInterval = setInterval(() => {
      this.warmCache().catch(error => {
        console.error('Scheduled cache warming failed:', error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic cache warming
   */
  stopCacheWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
      console.log('🛑 Cache warming stopped');
    }
  }

  /**
   * Warm cache with popular locations and data
   */
  async warmCache(): Promise<void> {
    const timerName = 'cache_warming';
    PerformanceMonitor.startTimer(timerName);

    try {
      console.log('🔥 Starting cache warming process...');

      await Promise.all([
        this.warmPopularLocations(),
        this.warmMajorCityLocations(),
        this.warmRecentlyRatedLocations(),
        this.warmLocationStats(),
      ]);

      const duration = PerformanceMonitor.endTimer(timerName);
      console.log(`✅ Cache warming completed in ${duration.toFixed(2)}ms`);
    } catch (error) {
      PerformanceMonitor.endTimer(timerName);
      console.error('❌ Cache warming failed:', error);
    }
  }

  /**
   * Warm cache with most popular locations based on rating activity
   */
  private async warmPopularLocations(): Promise<void> {
    try {
      const query = `
        SELECT 
          l.id,
          l.name,
          l.address,
          ST_Y(l.coordinates::geometry) as lat,
          ST_X(l.coordinates::geometry) as lng,
          l.hours,
          COUNT(r.id) as rating_count,
          AVG(r.score) as avg_score,
          calculate_lettuce_score(l.id) as lettuce_score
        FROM locations l
        LEFT JOIN ratings r ON l.id = r.location_id
        WHERE r.timestamp > NOW() - INTERVAL '7 days'
        GROUP BY l.id, l.name, l.address, l.coordinates, l.hours
        ORDER BY rating_count DESC, avg_score DESC
        LIMIT 50
      `;

      const result = await pool.query(query);
      const popularLocations = result.rows.map(row => ({
        id: row.id,
        score: parseFloat(row.lettuce_score) || 0,
        ratingCount: parseInt(row.rating_count) || 0,
        location: {
          id: row.id,
          name: row.name,
          address: row.address,
          coordinates: {
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng)
          },
          hours: row.hours,
          lettuceScore: parseFloat(row.lettuce_score) || 0,
          lastRated: null,
          recentlyRated: false
        }
      }));

      // Cache popular locations in sorted set
      await CacheService.warmPopularLocations(
        popularLocations.map(loc => ({ id: loc.id, score: loc.score + loc.ratingCount }))
      );

      // Cache individual location details
      const cacheEntries = popularLocations.map(loc => ({
        key: CACHE_KEYS.LOCATION_DETAIL(loc.id),
        data: loc.location,
        ttl: CACHE_TTL.LOCATION_DETAIL
      }));

      await CacheService.setMultiple(cacheEntries);

      console.log(`🔥 Warmed ${popularLocations.length} popular locations`);
    } catch (error) {
      console.error('Error warming popular locations:', error);
    }
  }

  /**
   * Warm cache with locations in major cities
   */
  private async warmMajorCityLocations(): Promise<void> {
    try {
      const majorCities = [
        { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 10000 },
        { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, radius: 15000 },
        { name: 'Chicago', lat: 41.8781, lng: -87.6298, radius: 10000 },
        { name: 'Houston', lat: 29.7604, lng: -95.3698, radius: 12000 },
        { name: 'Phoenix', lat: 33.4484, lng: -112.0740, radius: 12000 },
        { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, radius: 8000 },
        { name: 'San Antonio', lat: 29.4241, lng: -98.4936, radius: 10000 },
        { name: 'San Diego', lat: 32.7157, lng: -117.1611, radius: 10000 },
        { name: 'Dallas', lat: 32.7767, lng: -96.7970, radius: 12000 },
        { name: 'San Jose', lat: 37.3382, lng: -121.8863, radius: 8000 },
      ];

      const cachePromises = majorCities.map(async (city) => {
        try {
          const locations = await this.locationRepository.getNearbyLocations(
            { lat: city.lat, lng: city.lng },
            city.radius
          );

          if (locations.length > 0) {
            console.log(`🔥 Warmed ${locations.length} locations for ${city.name}`);
          }
        } catch (error) {
          console.error(`Error warming locations for ${city.name}:`, error);
        }
      });

      await Promise.all(cachePromises);
    } catch (error) {
      console.error('Error warming major city locations:', error);
    }
  }

  /**
   * Warm cache with recently rated locations
   */
  private async warmRecentlyRatedLocations(): Promise<void> {
    try {
      const query = `
        SELECT DISTINCT l.id
        FROM locations l
        INNER JOIN ratings r ON l.id = r.location_id
        WHERE r.timestamp > NOW() - INTERVAL '24 hours'
        ORDER BY r.timestamp DESC
        LIMIT 100
      `;

      const result = await pool.query(query);
      const locationIds = result.rows.map(row => row.id);

      // Warm location details for recently rated locations
      const warmPromises = locationIds.map(async (locationId) => {
        try {
          await this.locationRepository.getLocationById(locationId);
        } catch (error) {
          console.error(`Error warming location ${locationId}:`, error);
        }
      });

      await Promise.all(warmPromises);
      console.log(`🔥 Warmed ${locationIds.length} recently rated locations`);
    } catch (error) {
      console.error('Error warming recently rated locations:', error);
    }
  }

  /**
   * Warm cache with location statistics
   */
  private async warmLocationStats(): Promise<void> {
    try {
      const query = `
        SELECT l.id
        FROM locations l
        INNER JOIN ratings r ON l.id = r.location_id
        WHERE r.timestamp > NOW() - INTERVAL '7 days'
        GROUP BY l.id
        HAVING COUNT(r.id) >= 5
        ORDER BY COUNT(r.id) DESC
        LIMIT 50
      `;

      const result = await pool.query(query);
      const locationIds = result.rows.map(row => row.id);

      // Warm rating statistics for active locations
      const statsPromises = locationIds.map(async (locationId) => {
        try {
          await this.ratingRepository.getRatingStats(locationId);
        } catch (error) {
          console.error(`Error warming stats for location ${locationId}:`, error);
        }
      });

      await Promise.all(statsPromises);
      console.log(`🔥 Warmed stats for ${locationIds.length} active locations`);
    } catch (error) {
      console.error('Error warming location stats:', error);
    }
  }

  /**
   * Warm cache for specific coordinates (useful for anticipated traffic)
   */
  async warmLocationsByCoordinates(coordinates: Array<{ lat: number; lng: number; radius?: number }>): Promise<void> {
    const warmPromises = coordinates.map(async (coord) => {
      try {
        const radius = coord.radius || 5000;
        await this.locationRepository.getNearbyLocations(
          { lat: coord.lat, lng: coord.lng },
          radius
        );
      } catch (error) {
        console.error(`Error warming coordinates ${coord.lat}, ${coord.lng}:`, error);
      }
    });

    await Promise.all(warmPromises);
    console.log(`🔥 Warmed ${coordinates.length} coordinate areas`);
  }

  /**
   * Get cache warming statistics
   */
  async getCacheWarmingStats(): Promise<{
    isRunning: boolean;
    lastWarming: Date | null;
    cacheStats: { connected: boolean; keyCount: number };
    hitRate: { hits: number; misses: number; hitRate: number };
  }> {
    try {
      const [cacheStats, hitRate] = await Promise.all([
        CacheService.getStats(),
        CacheService.getCacheHitRate()
      ]);

      return {
        isRunning: this.warmingInterval !== null,
        lastWarming: null, // Could be tracked with a timestamp cache key
        cacheStats,
        hitRate
      };
    } catch (error) {
      console.error('Error getting cache warming stats:', error);
      return {
        isRunning: false,
        lastWarming: null,
        cacheStats: { connected: false, keyCount: 0 },
        hitRate: { hits: 0, misses: 0, hitRate: 0 }
      };
    }
  }

  /**
   * Manual cache invalidation for specific patterns
   */
  async invalidateCache(patterns: string[]): Promise<void> {
    try {
      const deletePromises = patterns.map(pattern => 
        CacheService.delPattern(pattern)
      );

      const results = await Promise.all(deletePromises);
      const totalDeleted = results.reduce((sum, count) => sum + count, 0);

      console.log(`🗑️ Invalidated ${totalDeleted} cache entries`);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }
}

// Singleton instance
export const cacheWarmingService = new CacheWarmingService();