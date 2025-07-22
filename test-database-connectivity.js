#!/usr/bin/env node

/**
 * Database and Redis Connectivity Test
 * Tests PostgreSQL and Redis connections for the Subway Lettuce Tracker
 */

const { Client } = require('pg');
const redis = require('redis');
const fs = require('fs');

// Load environment variables
function loadEnvFile() {
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const envVars = {};
        
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        
        Object.keys(envVars).forEach(key => {
            if (!process.env[key]) {
                process.env[key] = envVars[key];
            }
        });
    } catch (error) {
        console.log('No .env file found or error reading it');
    }
}

loadEnvFile();

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

class DatabaseConnectivityTest {
    constructor() {
        this.issues = [];
        this.solutions = [];
    }

    addIssue(issue, solution) {
        this.issues.push(issue);
        this.solutions.push(solution);
    }

    async testPostgreSQL() {
        log(`\n${colors.bold}=== Testing PostgreSQL Connection ===${colors.reset}`);
        
        const databaseUrl = process.env.DATABASE_URL;
        const postgresPassword = process.env.POSTGRES_PASSWORD;
        
        if (!databaseUrl) {
            log(`${colors.red}✗ DATABASE_URL not found in environment${colors.reset}`);
            this.addIssue(
                'DATABASE_URL environment variable missing',
                'Add DATABASE_URL to your .env file'
            );
            return false;
        }
        
        log(`${colors.cyan}Database URL: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}${colors.reset}`);
        
        // Parse the database URL to check components
        try {
            const url = new URL(databaseUrl);
            log(`${colors.blue}  Host: ${url.hostname}${colors.reset}`);
            log(`${colors.blue}  Port: ${url.port}${colors.reset}`);
            log(`${colors.blue}  Database: ${url.pathname.substring(1)}${colors.reset}`);
            log(`${colors.blue}  Username: ${url.username}${colors.reset}`);
            
            // Check if using external host (not localhost/postgres)
            if (url.hostname !== 'localhost' && url.hostname !== 'postgres') {
                log(`${colors.yellow}⚠ Using external PostgreSQL host: ${url.hostname}${colors.reset}`);
                log(`${colors.yellow}  Make sure this host is accessible from your container${colors.reset}`);
            }
            
        } catch (error) {
            log(`${colors.red}✗ Invalid DATABASE_URL format: ${error.message}${colors.reset}`);
            this.addIssue(
                'Invalid DATABASE_URL format',
                'Check your DATABASE_URL format: postgresql://user:password@host:port/database'
            );
            return false;
        }
        
        // Test actual connection
        const client = new Client({
            connectionString: databaseUrl,
            connectionTimeoutMillis: 5000,
        });
        
        try {
            log(`${colors.yellow}Attempting to connect to PostgreSQL...${colors.reset}`);
            await client.connect();
            
            // Test basic query
            const result = await client.query('SELECT version()');
            log(`${colors.green}✓ PostgreSQL connection successful${colors.reset}`);
            log(`${colors.blue}  Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}${colors.reset}`);
            
            // Test if PostGIS extension is available
            try {
                const postgisResult = await client.query('SELECT PostGIS_Version()');
                log(`${colors.green}✓ PostGIS extension available${colors.reset}`);
                log(`${colors.blue}  PostGIS Version: ${postgisResult.rows[0].postgis_version}${colors.reset}`);
            } catch (postgisError) {
                log(`${colors.yellow}⚠ PostGIS extension not found${colors.reset}`);
                this.addIssue(
                    'PostGIS extension not available',
                    'Install PostGIS extension: CREATE EXTENSION IF NOT EXISTS postgis;'
                );
            }
            
            // Test if our tables exist
            try {
                const tablesResult = await client.query(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('locations', 'ratings')
                `);
                
                const tables = tablesResult.rows.map(row => row.table_name);
                if (tables.length > 0) {
                    log(`${colors.green}✓ Application tables found: ${tables.join(', ')}${colors.reset}`);
                } else {
                    log(`${colors.yellow}⚠ Application tables not found${colors.reset}`);
                    log(`${colors.blue}  This is normal for first-time setup${colors.reset}`);
                }
            } catch (tableError) {
                log(`${colors.yellow}⚠ Could not check application tables${colors.reset}`);
            }
            
            await client.end();
            return true;
            
        } catch (error) {
            log(`${colors.red}✗ PostgreSQL connection failed: ${error.message}${colors.reset}`);
            
            if (error.code === 'ECONNREFUSED') {
                this.addIssue(
                    'PostgreSQL connection refused',
                    'Check if PostgreSQL is running and accessible at the specified host/port'
                );
            } else if (error.code === 'ENOTFOUND') {
                this.addIssue(
                    'PostgreSQL host not found',
                    'Check if the hostname in DATABASE_URL is correct and resolvable'
                );
            } else if (error.message.includes('password authentication failed')) {
                this.addIssue(
                    'PostgreSQL authentication failed',
                    'Check username and password in DATABASE_URL'
                );
            } else {
                this.addIssue(
                    `PostgreSQL connection error: ${error.message}`,
                    'Check your DATABASE_URL configuration and network connectivity'
                );
            }
            
            try {
                await client.end();
            } catch (endError) {
                // Ignore cleanup errors
            }
            return false;
        }
    }

    async testRedis() {
        log(`\n${colors.bold}=== Testing Redis Connection ===${colors.reset}`);
        
        const redisUrl = process.env.REDIS_URL;
        const redisPassword = process.env.REDIS_PASSWORD;
        
        if (!redisUrl) {
            log(`${colors.red}✗ REDIS_URL not found in environment${colors.reset}`);
            this.addIssue(
                'REDIS_URL environment variable missing',
                'Add REDIS_URL to your .env file'
            );
            return false;
        }
        
        log(`${colors.cyan}Redis URL: ${redisUrl.replace(/:[^:@]*@/, ':***@')}${colors.reset}`);
        
        // Parse Redis URL
        try {
            const url = new URL(redisUrl);
            log(`${colors.blue}  Host: ${url.hostname}${colors.reset}`);
            log(`${colors.blue}  Port: ${url.port || '6379'}${colors.reset}`);
            
            if (url.password) {
                log(`${colors.blue}  Password: ***${colors.reset}`);
            } else if (redisPassword) {
                log(`${colors.blue}  Password: *** (from REDIS_PASSWORD)${colors.reset}`);
            } else {
                log(`${colors.yellow}  No password configured${colors.reset}`);
            }
            
        } catch (error) {
            log(`${colors.red}✗ Invalid REDIS_URL format: ${error.message}${colors.reset}`);
            this.addIssue(
                'Invalid REDIS_URL format',
                'Check your REDIS_URL format: redis://[:password@]host:port'
            );
            return false;
        }
        
        // Test actual connection
        let client;
        try {
            log(`${colors.yellow}Attempting to connect to Redis...${colors.reset}`);
            
            const redisConfig = {
                url: redisUrl,
                socket: {
                    connectTimeout: 5000,
                    commandTimeout: 5000,
                }
            };
            
            // Add password if specified separately
            if (redisPassword && !redisUrl.includes('@')) {
                redisConfig.password = redisPassword;
            }
            
            client = redis.createClient(redisConfig);
            
            client.on('error', (err) => {
                log(`${colors.red}Redis client error: ${err.message}${colors.reset}`);
            });
            
            await client.connect();
            
            // Test basic operations
            await client.set('test_key', 'test_value');
            const value = await client.get('test_key');
            await client.del('test_key');
            
            if (value === 'test_value') {
                log(`${colors.green}✓ Redis connection successful${colors.reset}`);
                
                // Get Redis info
                const info = await client.info('server');
                const version = info.match(/redis_version:([^\r\n]+)/);
                if (version) {
                    log(`${colors.blue}  Version: ${version[1]}${colors.reset}`);
                }
                
                await client.quit();
                return true;
            } else {
                throw new Error('Redis test operation failed');
            }
            
        } catch (error) {
            log(`${colors.red}✗ Redis connection failed: ${error.message}${colors.reset}`);
            
            if (error.code === 'ECONNREFUSED') {
                this.addIssue(
                    'Redis connection refused',
                    'Check if Redis is running and accessible at the specified host/port'
                );
            } else if (error.code === 'ENOTFOUND') {
                this.addIssue(
                    'Redis host not found',
                    'Check if the hostname in REDIS_URL is correct and resolvable'
                );
            } else if (error.message.includes('WRONGPASS') || error.message.includes('NOAUTH')) {
                this.addIssue(
                    'Redis authentication failed',
                    'Check password in REDIS_URL or REDIS_PASSWORD'
                );
            } else {
                this.addIssue(
                    `Redis connection error: ${error.message}`,
                    'Check your REDIS_URL configuration and network connectivity'
                );
            }
            
            if (client) {
                try {
                    await client.quit();
                } catch (quitError) {
                    // Ignore cleanup errors
                }
            }
            return false;
        }
    }

    async checkEnvironmentConfiguration() {
        log(`\n${colors.bold}=== Environment Configuration Analysis ===${colors.reset}`);
        
        const requiredVars = [
            'DATABASE_URL',
            'REDIS_URL',
            'VITE_GOOGLE_MAPS_API_KEY'
        ];
        
        const optionalVars = [
            'POSTGRES_PASSWORD',
            'REDIS_PASSWORD',
            'VITE_API_URL',
            'NODE_ENV'
        ];
        
        log(`${colors.cyan}Required Variables:${colors.reset}`);
        requiredVars.forEach(varName => {
            const value = process.env[varName];
            if (value) {
                if (varName.includes('PASSWORD') || varName.includes('API_KEY')) {
                    log(`  ${colors.green}✓ ${varName}: ${value.substring(0, 10)}...${colors.reset}`);
                } else {
                    log(`  ${colors.green}✓ ${varName}: ${value}${colors.reset}`);
                }
            } else {
                log(`  ${colors.red}✗ ${varName}: NOT SET${colors.reset}`);
            }
        });
        
        log(`\n${colors.cyan}Optional Variables:${colors.reset}`);
        optionalVars.forEach(varName => {
            const value = process.env[varName];
            if (value) {
                if (varName.includes('PASSWORD')) {
                    log(`  ${colors.blue}• ${varName}: ***${colors.reset}`);
                } else {
                    log(`  ${colors.blue}• ${varName}: ${value}${colors.reset}`);
                }
            } else {
                log(`  ${colors.yellow}• ${varName}: not set${colors.reset}`);
            }
        });
    }

    generateReport() {
        log(`\n${colors.bold}=== Connectivity Test Summary ===${colors.reset}`);
        
        if (this.issues.length === 0) {
            log(`${colors.green}✓ All connectivity tests passed!${colors.reset}`);
            log(`${colors.green}✓ PostgreSQL and Redis are properly configured${colors.reset}`);
            log(`${colors.blue}Your database connections should work correctly.${colors.reset}`);
        } else {
            log(`${colors.red}Found ${this.issues.length} connectivity issue(s):${colors.reset}`);
            
            this.issues.forEach((issue, index) => {
                log(`\n${colors.red}Issue ${index + 1}: ${issue}${colors.reset}`);
                log(`${colors.green}Solution: ${this.solutions[index]}${colors.reset}`);
            });
        }
        
        log(`\n${colors.bold}=== Next Steps ===${colors.reset}`);
        if (this.issues.length > 0) {
            log(`${colors.yellow}1. Fix the connectivity issues above${colors.reset}`);
            log(`${colors.yellow}2. Re-run this test: node test-database-connectivity.js${colors.reset}`);
            log(`${colors.yellow}3. Once connections work, test your location functionality${colors.reset}`);
        } else {
            log(`${colors.green}1. Your database connections are working${colors.reset}`);
            log(`${colors.green}2. Test your AIO container: ./test-aio-local.sh${colors.reset}`);
            log(`${colors.green}3. If location issues persist, check Google Maps API configuration${colors.reset}`);
        }
    }

    async runTests() {
        log(`${colors.bold}${colors.blue}Database Connectivity Test for Subway Lettuce Tracker${colors.reset}`);
        log(`${colors.blue}====================================================${colors.reset}`);
        
        await this.checkEnvironmentConfiguration();
        
        const postgresOk = await this.testPostgreSQL();
        const redisOk = await this.testRedis();
        
        this.generateReport();
        
        return postgresOk && redisOk;
    }
}

// Run the tests
const tester = new DatabaseConnectivityTest();
tester.runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
    process.exit(1);
});