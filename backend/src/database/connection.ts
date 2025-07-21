import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create pool configuration
const createPoolConfig = () => {
  // If DATABASE_URL is provided, use it (for Docker/production)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
  
  // Otherwise use individual environment variables (for local development)
  return {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'subway_lettuce_tracker',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};

const pool = new Pool(createPoolConfig());

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Initialize PostGIS extension
export const initializePostGIS = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS extension initialized');
    client.release();
  } catch (error) {
    console.error('❌ Failed to initialize PostGIS:', error);
    throw error;
  }
};

export default pool;