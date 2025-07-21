import pool from '../database/connection';
import { SubwayLocation, SubwayLocationDetail, Coordinates } from '../types';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/redisClient';
import { PerformanceMonitor } from '../utils/performanceMonitor';

export class LocationRepository {
  
  /**
   * Get nearby Subway locations within specified radius
   */
  async getNearbyLocations(
    userCoordinates: Coordinates, 
    radiusMeters: number = 5000
  ): Promise<SubwayLocation[]> {
    const timerName = 'db_getNearbyLocations';
    PerformanceMonitor.startTimer(timerName, {
      method: 'getNearbyLocations',
      lat: userCoordinates.lat,
      lng: userCoordinates.lng,
      radius: radiusMeters
    });

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.NEARBY_LOCATIONS(userCoordinates.lat, userCoordinates.lng, radiusMeters);
      const cachedData = await CacheService.get<SubwayLocation[]>(cacheKey);
      
      if (cachedData) {
        PerformanceMonitor.endTimer(timerName);
        return cachedData;
      }

      const query = `
        SELECT * FROM get_nearby_locations_optimized($1, $2, $3)
      `;
      
      const result = await pool.query(query, [
        userCoordinates.lat,
        userCoordinates.lng,
        radiusMeters
      ]);
      
      const locations = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        address: row.address,
        coordinates: {
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng)
        },
        hours: row.hours,
        lettuceScore: parseFloat(row.lettuce_score) || 0,
        lastRated: row.last_rated,
        recentlyRated: row.recently_rated,
        distanceFromUser: row.distance_meters
      }));

      // Cache the results
      await CacheService.set(cacheKey, locations, CACHE_TTL.NEARBY_LOCATIONS);
      
      PerformanceMonitor.endTimer(timerName);
      return locations;
    } catch (error) {
      PerformanceMonitor.endTimer(timerName);
      console.error('Error fetching nearby locations:', error);
      throw new Error('Failed to fetch nearby locations');
    }
  }

  /**
   * Get detailed information for a specific location
   */
  async getLocationById(locationId: string): Promise<SubwayLocationDetail | null> {
    const timerName = 'db_getLocationById';
    PerformanceMonitor.startTimer(timerName, {
      method: 'getLocationById',
      locationId: locationId
    });

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.LOCATION_DETAIL(locationId);
      const cachedData = await CacheService.get<SubwayLocationDetail>(cacheKey);
      
      if (cachedData) {
        PerformanceMonitor.endTimer(timerName);
        return cachedData;
      }

      const locationQuery = `
        SELECT 
          l.id,
          l.name,
          l.address,
          ST_Y(l.coordinates::geometry) as lat,
          ST_X(l.coordinates::geometry) as lng,
          l.hours,
          calculate_lettuce_score(l.id) as lettuce_score,
          (
            SELECT MAX(timestamp) 
            FROM ratings r 
            WHERE r.location_id = l.id
          ) as last_rated,
          (
            SELECT COUNT(*) > 0
            FROM ratings r 
            WHERE r.location_id = l.id 
            AND r.timestamp > NOW() - INTERVAL '2 hours'
          ) as recently_rated
        FROM locations l
        WHERE l.id = $1
      `;

      const ratingsQuery = `
        SELECT id, score, timestamp, user_id
        FROM ratings
        WHERE location_id = $1
        ORDER BY timestamp DESC
        LIMIT 50
      `;

      const timeRecommendationsQuery = `
        SELECT 
          CASE 
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 6 AND 10 THEN 'morning'
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 11 AND 14 THEN 'lunch'
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 15 AND 18 THEN 'afternoon'
            ELSE 'evening'
          END as period,
          AVG(score) as average_score,
          COUNT(*) as sample_size,
          CASE 
            WHEN COUNT(*) >= 10 THEN 'high'
            WHEN COUNT(*) >= 5 THEN 'medium'
            ELSE 'low'
          END as confidence
        FROM ratings
        WHERE location_id = $1
        AND timestamp > NOW() - INTERVAL '30 days'
        GROUP BY 
          CASE 
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 6 AND 10 THEN 'morning'
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 11 AND 14 THEN 'lunch'
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 15 AND 18 THEN 'afternoon'
            ELSE 'evening'
          END
        ORDER BY average_score DESC
      `;

      const [locationResult, ratingsResult, timeRecommendationsResult] = await Promise.all([
        pool.query(locationQuery, [locationId]),
        pool.query(ratingsQuery, [locationId]),
        pool.query(timeRecommendationsQuery, [locationId])
      ]);

      if (locationResult.rows.length === 0) {
        PerformanceMonitor.endTimer(timerName);
        return null;
      }

      const locationRow = locationResult.rows[0];
      
      const locationDetail = {
        id: locationRow.id,
        name: locationRow.name,
        address: locationRow.address,
        coordinates: {
          lat: parseFloat(locationRow.lat),
          lng: parseFloat(locationRow.lng)
        },
        hours: locationRow.hours,
        lettuceScore: parseFloat(locationRow.lettuce_score) || 0,
        lastRated: locationRow.last_rated,
        recentlyRated: locationRow.recently_rated,
        ratings: ratingsResult.rows.map(row => ({
          id: row.id,
          locationId: row.location_id,
          score: row.score,
          timestamp: row.timestamp,
          userId: row.user_id
        })),
        timeRecommendations: timeRecommendationsResult.rows.map(row => ({
          period: row.period as 'morning' | 'lunch' | 'afternoon' | 'evening',
          averageScore: parseFloat(row.average_score),
          confidence: row.confidence as 'low' | 'medium' | 'high',
          sampleSize: parseInt(row.sample_size),
          timeRange: this.getTimeRangeForPeriod(row.period)
        })),
        totalRatings: ratingsResult.rows.length,
        averageScore: ratingsResult.rows.length > 0 
          ? ratingsResult.rows.reduce((sum, r) => sum + r.score, 0) / ratingsResult.rows.length 
          : 0
      };

      // Cache the results
      await CacheService.set(cacheKey, locationDetail, CACHE_TTL.LOCATION_DETAIL);
      
      PerformanceMonitor.endTimer(timerName);
      return locationDetail;
    } catch (error) {
      PerformanceMonitor.endTimer(timerName);
      console.error('Error fetching location details:', error);
      throw new Error('Failed to fetch location details');
    }
  }

  /**
   * Create a new Subway location
   */
  async createLocation(location: Omit<SubwayLocation, 'id' | 'lettuceScore' | 'lastRated' | 'recentlyRated' | 'distanceFromUser'>): Promise<string> {
    const query = `
      INSERT INTO locations (name, address, coordinates, hours)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
      RETURNING id
    `;

    try {
      const result = await pool.query(query, [
        location.name,
        location.address,
        location.coordinates.lng,
        location.coordinates.lat,
        JSON.stringify(location.hours)
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating location:', error);
      throw new Error('Failed to create location');
    }
  }

  /**
   * Update location information
   */
  async updateLocation(locationId: string, updates: Partial<Omit<SubwayLocation, 'id' | 'lettuceScore' | 'lastRated' | 'recentlyRated' | 'distanceFromUser'>>): Promise<boolean> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name) {
      setParts.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.address) {
      setParts.push(`address = $${paramIndex++}`);
      values.push(updates.address);
    }

    if (updates.coordinates) {
      setParts.push(`coordinates = ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)`);
      values.push(updates.coordinates.lng, updates.coordinates.lat);
    }

    if (updates.hours) {
      setParts.push(`hours = $${paramIndex++}`);
      values.push(JSON.stringify(updates.hours));
    }

    if (setParts.length === 0) {
      return false;
    }

    setParts.push(`updated_at = NOW()`);
    values.push(locationId);

    const query = `
      UPDATE locations 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
    `;

    try {
      const result = await pool.query(query, values);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error updating location:', error);
      throw new Error('Failed to update location');
    }
  }

  /**
   * Delete a location and all its ratings
   */
  async deleteLocation(locationId: string): Promise<boolean> {
    const query = `DELETE FROM locations WHERE id = $1`;

    try {
      const result = await pool.query(query, [locationId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw new Error('Failed to delete location');
    }
  }

  /**
   * Invalidate cache for a specific location
   */
  async invalidateLocationCache(locationId: string): Promise<void> {
    try {
      // Invalidate specific location caches
      await Promise.all([
        CacheService.del(CACHE_KEYS.LOCATION_DETAIL(locationId)),
        CacheService.del(CACHE_KEYS.LOCATION_SCORE(locationId)),
        CacheService.del(CACHE_KEYS.RATING_SUMMARY(locationId)),
        CacheService.del(CACHE_KEYS.TIME_ANALYSIS(locationId)),
      ]);

      // Invalidate nearby location caches (pattern-based)
      await CacheService.delPattern('nearby:*');
    } catch (error) {
      console.error('Error invalidating location cache:', error);
    }
  }

  /**
   * Get time range string for a given period
   */
  private getTimeRangeForPeriod(period: string): string {
    switch (period) {
      case 'morning':
        return '6:00 AM - 11:00 AM';
      case 'lunch':
        return '11:00 AM - 3:00 PM';
      case 'afternoon':
        return '3:00 PM - 6:00 PM';
      case 'evening':
        return '6:00 PM - 11:00 PM';
      default:
        return 'Unknown';
    }
  }
}