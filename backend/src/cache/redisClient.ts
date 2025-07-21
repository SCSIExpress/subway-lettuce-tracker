import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
  },
});

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('disconnect', () => {
  console.log('⚠️ Redis disconnected');
});

// Connect to Redis
export const connectRedis = async (): Promise<boolean> => {
  try {
    await redisClient.connect();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    return false;
  }
};

// Cache keys
export const CACHE_KEYS = {
  NEARBY_LOCATIONS: (lat: number, lng: number, radius: number) => 
    `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`,
  LOCATION_DETAIL: (id: string) => `location:${id}`,
  LOCATION_SCORE: (id: string) => `score:${id}`,
  RATING_SUMMARY: (id: string) => `summary:${id}`,
  TIME_ANALYSIS: (id: string) => `time:${id}`,
  POPULAR_LOCATIONS: () => 'popular:locations',
  SEARCH_RESULTS: (query: string) => `search:${query.toLowerCase().replace(/\s+/g, '_')}`,
  USER_PREFERENCES: (userId: string) => `user:${userId}:prefs`,
  LOCATION_STATS: (id: string) => `stats:${id}`,
  HOT_LOCATIONS: () => 'hot:locations',
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  NEARBY_LOCATIONS: 300, // 5 minutes
  LOCATION_DETAIL: 600, // 10 minutes
  LOCATION_SCORE: 60, // 1 minute (frequently updated)
  RATING_SUMMARY: 300, // 5 minutes
  TIME_ANALYSIS: 3600, // 1 hour
  POPULAR_LOCATIONS: 1800, // 30 minutes
  SEARCH_RESULTS: 180, // 3 minutes
  USER_PREFERENCES: 86400, // 24 hours
} as const;

// Cache utility functions
export class CacheService {
  
  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (!redisClient.isOpen) {
        return null;
      }
      
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(key: string, data: any, ttl: number): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        return false;
      }
      
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  static async del(key: string): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        return false;
      }
      
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      if (!redisClient.isOpen) {
        return 0;
      }
      
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      
      return await redisClient.del(keys);
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if Redis is connected
   */
  static isConnected(): boolean {
    return redisClient.isOpen;
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{ connected: boolean; keyCount: number }> {
    try {
      if (!redisClient.isOpen) {
        return { connected: false, keyCount: 0 };
      }
      
      const info = await redisClient.info('keyspace');
      const keyCount = info.includes('keys=') 
        ? parseInt(info.split('keys=')[1]?.split(',')[0] || '0') 
        : 0;
      
      return { connected: true, keyCount };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { connected: false, keyCount: 0 };
    }
  }

  /**
   * Set multiple keys at once (pipeline)
   */
  static async setMultiple(entries: Array<{ key: string; data: any; ttl: number }>): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        return false;
      }

      const pipeline = redisClient.multi();
      
      entries.forEach(({ key, data, ttl }) => {
        pipeline.setEx(key, ttl, JSON.stringify(data));
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache setMultiple error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once (pipeline)
   */
  static async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      if (!redisClient.isOpen || keys.length === 0) {
        return {};
      }

      const values = await redisClient.mGet(keys);
      const result: Record<string, T | null> = {};

      keys.forEach((key, index) => {
        const value = values[index];
        result[key] = value ? JSON.parse(value) : null;
      });

      return result;
    } catch (error) {
      console.error('Cache getMultiple error:', error);
      return {};
    }
  }

  /**
   * Increment a counter with expiration
   */
  static async increment(key: string, ttl: number = 3600): Promise<number> {
    try {
      if (!redisClient.isOpen) {
        return 0;
      }

      const pipeline = redisClient.multi();
      pipeline.incr(key);
      pipeline.expire(key, ttl);
      
      const results = await pipeline.exec();
      return results?.[0] as number || 0;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Add to sorted set (for rankings, popular locations, etc.)
   */
  static async addToSortedSet(key: string, score: number, member: string, ttl: number = 3600): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        return false;
      }

      const pipeline = redisClient.multi();
      pipeline.zAdd(key, { score, value: member });
      pipeline.expire(key, ttl);
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache addToSortedSet error:', error);
      return false;
    }
  }

  /**
   * Get top N from sorted set
   */
  static async getTopFromSortedSet(key: string, count: number = 10): Promise<Array<{ member: string; score: number }>> {
    try {
      if (!redisClient.isOpen) {
        return [];
      }

      const results = await redisClient.zRangeWithScores(key, 0, count - 1, { REV: true });
      return results.map(item => ({ member: item.value, score: item.score }));
    } catch (error) {
      console.error('Cache getTopFromSortedSet error:', error);
      return [];
    }
  }

  /**
   * Cache warming for popular locations
   */
  static async warmPopularLocations(locations: Array<{ id: string; score: number }>): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      const hotLocationsKey = CACHE_KEYS.HOT_LOCATIONS();
      
      // Clear existing hot locations
      await redisClient.del(hotLocationsKey);
      
      // Add locations to sorted set
      const pipeline = redisClient.multi();
      locations.forEach(({ id, score }) => {
        pipeline.zAdd(hotLocationsKey, { score, value: id });
      });
      pipeline.expire(hotLocationsKey, CACHE_TTL.POPULAR_LOCATIONS);
      
      await pipeline.exec();
      
      console.log(`Cache warmed with ${locations.length} popular locations`);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  /**
   * Get cache hit rate statistics
   */
  static async getCacheHitRate(): Promise<{ hits: number; misses: number; hitRate: number }> {
    try {
      if (!redisClient.isOpen) {
        return { hits: 0, misses: 0, hitRate: 0 };
      }

      const info = await redisClient.info('stats');
      const lines = info.split('\r\n');
      
      let hits = 0;
      let misses = 0;
      
      lines.forEach(line => {
        if (line.startsWith('keyspace_hits:')) {
          hits = parseInt(line.split(':')[1] || '0');
        } else if (line.startsWith('keyspace_misses:')) {
          misses = parseInt(line.split(':')[1] || '0');
        }
      });

      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return { hits, misses, hitRate };
    } catch (error) {
      console.error('Cache hit rate error:', error);
      return { hits: 0, misses: 0, hitRate: 0 };
    }
  }
}

export default redisClient;