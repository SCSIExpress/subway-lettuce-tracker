-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  coordinates GEOMETRY(POINT, 4326) NOT NULL, -- PostGIS point type with SRID 4326 (WGS84)
  hours JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT valid_coordinates CHECK (ST_IsValid(coordinates)),
  CONSTRAINT valid_hours CHECK (jsonb_typeof(hours) = 'object')
);

-- Create spatial index for location queries
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST (coordinates);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 5) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NULL, -- for future use
  
  -- Add constraint to prevent duplicate ratings from same user within short time
  CONSTRAINT valid_score CHECK (score BETWEEN 1 AND 5)
);

-- Create indexes for ratings
CREATE INDEX IF NOT EXISTS idx_ratings_location_timestamp ON ratings (location_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_timestamp ON ratings (timestamp DESC);

-- Create function to calculate weighted lettuce score
CREATE OR REPLACE FUNCTION calculate_lettuce_score(location_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  weighted_score DECIMAL(3,2);
BEGIN
  SELECT 
    COALESCE(
      SUM(score * weight) / SUM(weight),
      0
    )
  INTO weighted_score
  FROM (
    SELECT 
      score,
      -- More recent ratings get higher weight (exponential decay)
      EXP(-EXTRACT(EPOCH FROM (NOW() - timestamp)) / 86400.0) as weight
    FROM ratings 
    WHERE location_id = location_uuid
    ORDER BY timestamp DESC
    LIMIT 10
  ) recent_ratings;
  
  RETURN COALESCE(weighted_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to get nearby locations
CREATE OR REPLACE FUNCTION get_nearby_locations(
  user_lat DECIMAL(10,8),
  user_lng DECIMAL(11,8),
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  address TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  hours JSONB,
  lettuce_score DECIMAL(3,2),
  distance_meters INTEGER,
  last_rated TIMESTAMP WITH TIME ZONE,
  recently_rated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.address,
    ST_Y(l.coordinates)::DECIMAL(10,8) as lat,
    ST_X(l.coordinates)::DECIMAL(11,8) as lng,
    l.hours,
    calculate_lettuce_score(l.id) as lettuce_score,
    ST_Distance(
      l.coordinates,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
    )::INTEGER as distance_meters,
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
  WHERE ST_DWithin(
    l.coordinates,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326),
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;