-- Database optimizations for geospatial searches and performance

-- Create optimized indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_coordinates_gist 
ON locations USING GIST (coordinates);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_location_timestamp_desc 
ON ratings (location_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_timestamp_desc 
ON ratings (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_location_score 
ON ratings (location_id, score);

-- Create materialized view for frequently accessed location scores
CREATE MATERIALIZED VIEW IF NOT EXISTS location_scores AS
SELECT 
  l.id,
  l.name,
  l.address,
  l.coordinates,
  l.hours,
  COALESCE(calculate_lettuce_score(l.id), 0) as lettuce_score,
  (
    SELECT MAX(r.timestamp) 
    FROM ratings r 
    WHERE r.location_id = l.id
  ) as last_rated,
  (
    SELECT COUNT(*) > 0
    FROM ratings r 
    WHERE r.location_id = l.id 
    AND r.timestamp > NOW() - INTERVAL '2 hours'
  ) as recently_rated,
  l.created_at,
  l.updated_at
FROM locations l;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_location_scores_coordinates_gist 
ON location_scores USING GIST (coordinates);

CREATE INDEX IF NOT EXISTS idx_location_scores_lettuce_score 
ON location_scores (lettuce_score DESC);

-- Optimized function for nearby locations using materialized view
CREATE OR REPLACE FUNCTION get_nearby_locations_optimized(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  hours JSONB,
  lettuce_score DOUBLE PRECISION,
  last_rated TIMESTAMP,
  recently_rated BOOLEAN,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.name,
    ls.address,
    ST_Y(ls.coordinates::geometry) as lat,
    ST_X(ls.coordinates::geometry) as lng,
    ls.hours,
    ls.lettuce_score,
    ls.last_rated,
    ls.recently_rated,
    ST_Distance(
      ls.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM location_scores ls
  WHERE ST_DWithin(
    ls.coordinates::geography,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY 
    ls.coordinates::geography <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    ls.lettuce_score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_location_scores()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_scores;
END;
$$ LANGUAGE plpgsql;

-- Optimized function for calculating weighted scores with caching
CREATE OR REPLACE FUNCTION calculate_lettuce_score_optimized(location_uuid UUID)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  weighted_score DOUBLE PRECISION := 0;
  rating_record RECORD;
  weight_factor DOUBLE PRECISION;
  total_weight DOUBLE PRECISION := 0;
  rating_count INTEGER := 0;
BEGIN
  -- Get the last 10 ratings for this location, ordered by timestamp DESC
  FOR rating_record IN
    SELECT score, timestamp
    FROM ratings
    WHERE location_id = location_uuid
    ORDER BY timestamp DESC
    LIMIT 10
  LOOP
    rating_count := rating_count + 1;
    
    -- Calculate weight based on recency and position
    -- More recent ratings get higher weight, and earlier ratings in the top 10 get higher weight
    weight_factor := (11 - rating_count) * 
                    (1 + EXTRACT(EPOCH FROM (NOW() - rating_record.timestamp)) / 86400.0 * 0.1);
    
    weighted_score := weighted_score + (rating_record.score * weight_factor);
    total_weight := total_weight + weight_factor;
  END LOOP;
  
  -- Return weighted average, or 0 if no ratings
  IF total_weight > 0 THEN
    RETURN weighted_score / total_weight;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create partial indexes for better performance on common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_recent 
ON ratings (location_id, timestamp) 
WHERE timestamp > NOW() - INTERVAL '24 hours';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_high_scores 
ON ratings (location_id, timestamp DESC) 
WHERE score >= 4;

-- Function to get rating statistics efficiently
CREATE OR REPLACE FUNCTION get_rating_stats_optimized(location_uuid UUID)
RETURNS TABLE (
  average_score DOUBLE PRECISION,
  total_ratings BIGINT,
  recent_ratings BIGINT,
  score_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      AVG(r.score) as avg_score,
      COUNT(*) as total_count,
      COUNT(CASE WHEN r.timestamp > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_count
    FROM ratings r
    WHERE r.location_id = location_uuid
  ),
  distribution AS (
    SELECT jsonb_object_agg(r.score::text, r.count) as dist
    FROM (
      SELECT score, COUNT(*) as count
      FROM ratings
      WHERE location_id = location_uuid
      GROUP BY score
      ORDER BY score
    ) r
  )
  SELECT 
    COALESCE(s.avg_score, 0) as average_score,
    COALESCE(s.total_count, 0) as total_ratings,
    COALESCE(s.recent_count, 0) as recent_ratings,
    COALESCE(d.dist, '{}'::jsonb) as score_distribution
  FROM stats s
  CROSS JOIN distribution d;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigger to refresh materialized view when ratings change
CREATE OR REPLACE FUNCTION refresh_scores_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh the materialized view in the background
  PERFORM pg_notify('refresh_scores', NEW.location_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_refresh_scores ON ratings;
CREATE TRIGGER trigger_refresh_scores
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION refresh_scores_trigger();

-- Create function to handle background refresh
CREATE OR REPLACE FUNCTION handle_score_refresh()
RETURNS VOID AS $$
BEGIN
  -- This would be called by a background job
  PERFORM refresh_location_scores();
END;
$$ LANGUAGE plpgsql;
--
 Advanced geospatial optimizations
-- Create spatial index with different strategies for various zoom levels
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_coordinates_city 
ON locations USING GIST (coordinates) 
WHERE ST_DWithin(coordinates::geography, ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326)::geography, 50000);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_coordinates_metro 
ON locations USING GIST (coordinates) 
WHERE ST_DWithin(coordinates::geography, ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326)::geography, 100000);

-- Optimize for common radius searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_popular_radius 
ON locations USING GIST (coordinates) 
WHERE EXISTS (
  SELECT 1 FROM ratings r 
  WHERE r.location_id = locations.id 
  AND r.timestamp > NOW() - INTERVAL '30 days'
);

-- Create composite index for location scoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_location_score_timestamp 
ON ratings (location_id, score, timestamp DESC);

-- Optimize for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_hour_score 
ON ratings (location_id, EXTRACT(HOUR FROM timestamp), score) 
WHERE timestamp > NOW() - INTERVAL '90 days';

-- Create materialized view for hot locations (frequently accessed)
CREATE MATERIALIZED VIEW IF NOT EXISTS hot_locations AS
SELECT 
  l.id,
  l.name,
  l.address,
  l.coordinates,
  l.hours,
  COUNT(r.id) as rating_count,
  AVG(r.score) as avg_score,
  calculate_lettuce_score_optimized(l.id) as lettuce_score,
  MAX(r.timestamp) as last_rated,
  COUNT(CASE WHEN r.timestamp > NOW() - INTERVAL '2 hours' THEN 1 END) > 0 as recently_rated
FROM locations l
LEFT JOIN ratings r ON l.id = r.location_id
WHERE r.timestamp > NOW() - INTERVAL '7 days' OR r.timestamp IS NULL
GROUP BY l.id, l.name, l.address, l.coordinates, l.hours
HAVING COUNT(r.id) >= 3 OR COUNT(r.id) = 0;

-- Index for hot locations
CREATE INDEX IF NOT EXISTS idx_hot_locations_coordinates 
ON hot_locations USING GIST (coordinates);

CREATE INDEX IF NOT EXISTS idx_hot_locations_score 
ON hot_locations (lettuce_score DESC, rating_count DESC);

-- Ultra-fast nearby search for hot locations
CREATE OR REPLACE FUNCTION get_nearby_hot_locations(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  hours JSONB,
  lettuce_score DOUBLE PRECISION,
  last_rated TIMESTAMP,
  recently_rated BOOLEAN,
  distance_meters DOUBLE PRECISION,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hl.id,
    hl.name,
    hl.address,
    ST_Y(hl.coordinates::geometry) as lat,
    ST_X(hl.coordinates::geometry) as lng,
    hl.hours,
    hl.lettuce_score,
    hl.last_rated,
    hl.recently_rated,
    ST_Distance(
      hl.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters,
    hl.rating_count
  FROM hot_locations hl
  WHERE ST_DWithin(
    hl.coordinates::geography,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY 
    hl.coordinates::geography <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    hl.lettuce_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Batch location scoring for cache warming
CREATE OR REPLACE FUNCTION calculate_batch_lettuce_scores(location_ids UUID[])
RETURNS TABLE (
  location_id UUID,
  lettuce_score DOUBLE PRECISION
) AS $$
DECLARE
  loc_id UUID;
BEGIN
  FOREACH loc_id IN ARRAY location_ids
  LOOP
    RETURN QUERY
    SELECT loc_id, calculate_lettuce_score_optimized(loc_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized rating statistics function
CREATE OR REPLACE FUNCTION get_location_rating_stats_batch(location_ids UUID[])
RETURNS TABLE (
  location_id UUID,
  avg_score DOUBLE PRECISION,
  total_ratings BIGINT,
  recent_ratings BIGINT,
  score_1_count BIGINT,
  score_2_count BIGINT,
  score_3_count BIGINT,
  score_4_count BIGINT,
  score_5_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.location_id,
    AVG(r.score) as avg_score,
    COUNT(*) as total_ratings,
    COUNT(CASE WHEN r.timestamp > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_ratings,
    COUNT(CASE WHEN r.score = 1 THEN 1 END) as score_1_count,
    COUNT(CASE WHEN r.score = 2 THEN 1 END) as score_2_count,
    COUNT(CASE WHEN r.score = 3 THEN 1 END) as score_3_count,
    COUNT(CASE WHEN r.score = 4 THEN 1 END) as score_4_count,
    COUNT(CASE WHEN r.score = 5 THEN 1 END) as score_5_count
  FROM ratings r
  WHERE r.location_id = ANY(location_ids)
  GROUP BY r.location_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to refresh hot locations materialized view
CREATE OR REPLACE FUNCTION refresh_hot_locations()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY hot_locations;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS query_performance_log (
  id SERIAL PRIMARY KEY,
  query_type VARCHAR(100) NOT NULL,
  execution_time_ms DOUBLE PRECISION NOT NULL,
  parameters JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_query_performance_type_time 
ON query_performance_log (query_type, timestamp DESC);

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_type VARCHAR(100),
  p_execution_time_ms DOUBLE PRECISION,
  p_parameters JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO query_performance_log (query_type, execution_time_ms, parameters)
  VALUES (p_query_type, p_execution_time_ms, p_parameters);
  
  -- Keep only last 10000 records
  DELETE FROM query_performance_log 
  WHERE id < (
    SELECT id 
    FROM query_performance_log 
    ORDER BY id DESC 
    LIMIT 1 OFFSET 10000
  );
END;
$$ LANGUAGE plpgsql;

-- Cleanup old data function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
  -- Delete ratings older than 6 months
  DELETE FROM ratings 
  WHERE timestamp < NOW() - INTERVAL '6 months';
  
  -- Delete performance logs older than 30 days
  DELETE FROM query_performance_log 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Vacuum and analyze tables
  VACUUM ANALYZE locations;
  VACUUM ANALYZE ratings;
  VACUUM ANALYZE query_performance_log;
END;
$$ LANGUAGE plpgsql;