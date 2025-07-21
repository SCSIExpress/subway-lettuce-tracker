import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection, initializePostGIS } from './database/connection';
import pool from './database/connection';
import { runMigrations } from './database/migrate';
import { connectRedis } from './cache/redisClient';
import { performanceMiddleware, PerformanceMonitor, MemoryMonitor } from './utils/performanceMonitor';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Rate limiting with environment-specific settings
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: express.Request) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/health') || req.path.startsWith('/ready') || req.path.startsWith('/live');
  }
};

const limiter = rateLimit(rateLimitConfig);
app.use('/api/', limiter);

// Stricter rate limiting for rating submissions
const ratingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 ratings per minute per IP
  message: {
    error: 'Too many rating submissions. Please wait before submitting another rating.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/locations/*/ratings', ratingLimiter);

// Performance monitoring middleware
app.use(performanceMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const { CacheService } = await import('./cache/redisClient');
    const cacheStats = await CacheService.getStats();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cache: {
        connected: cacheStats.connected,
        keyCount: cacheStats.keyCount
      }
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cache: {
        connected: false,
        keyCount: 0
      }
    });
  }
});

// Detailed health check for monitoring systems
app.get('/health/detailed', async (req, res) => {
  const healthChecks: {
    status: string;
    timestamp: string;
    environment: string;
    version: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    database: { connected: boolean; responseTime: number; error?: string };
    cache: { connected: boolean; keyCount: number; responseTime: number; error?: string };
    services: any[];
  } = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: { connected: false, responseTime: 0 },
    cache: { connected: false, keyCount: 0, responseTime: 0 },
    services: []
  };

  try {
    // Database health check
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    healthChecks.database = {
      connected: true,
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    healthChecks.status = 'DEGRADED';
    healthChecks.database = {
      connected: false,
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  try {
    // Cache health check
    const { CacheService } = await import('./cache/redisClient');
    const cacheStart = Date.now();
    const cacheStats = await CacheService.getStats();
    healthChecks.cache = {
      connected: cacheStats.connected,
      keyCount: cacheStats.keyCount,
      responseTime: Date.now() - cacheStart
    };
  } catch (error) {
    healthChecks.cache = {
      connected: false,
      keyCount: 0,
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Set appropriate status code
  const statusCode = healthChecks.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthChecks);
});

// Readiness probe (for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness probe (for Kubernetes)
app.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Import routes
import locationRoutes from './routes/locations';
import performanceRoutes from './routes/performance';

// API routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is running!' });
});

// Location routes
app.use('/api/locations', locationRoutes);

// Performance monitoring routes
app.use('/api/performance', performanceRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize PostGIS extension
    await initializePostGIS();

    // Run database migrations
    await runMigrations();

    // Initialize Redis connection (optional - app works without it)
    const redisConnected = await connectRedis();
    if (!redisConnected) {
      console.warn('⚠️ Redis connection failed - caching disabled');
    }

    // Start cache warming if Redis is connected
    if (redisConnected) {
      const { cacheWarmingService } = await import('./services/cacheWarmingService');
      cacheWarmingService.startCacheWarming(30); // Warm cache every 30 minutes
      console.log('🔥 Cache warming service started');
    }

    // Start memory monitoring
    MemoryMonitor.startMemoryMonitoring(60000); // Monitor every minute

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🗄️  Database: Connected and initialized`);
      console.log(`🔄 Redis: ${redisConnected ? 'Connected' : 'Disabled'}`);
      console.log(`📊 Performance monitoring: Enabled`);
      
      // Cleanup old metrics every hour
      setInterval(() => {
        PerformanceMonitor.cleanup();
      }, 3600000);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();