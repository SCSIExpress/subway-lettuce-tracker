#!/usr/bin/env ts-node

import { testConnection, initializePostGIS } from '../database/connection';
import { runMigrations } from '../database/migrate';
import { LocationRepository } from '../repositories/LocationRepository';
import { RatingRepository } from '../repositories/RatingRepository';

/**
 * Test script to verify database connection and setup
 * Run with: npm run test:db
 */
async function testDatabaseSetup() {
  console.log('🧪 Testing database setup...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful\n');

    // Test 2: PostGIS Extension
    console.log('2. Initializing PostGIS extension...');
    await initializePostGIS();
    console.log('✅ PostGIS extension initialized\n');

    // Test 3: Run Migrations
    console.log('3. Running database migrations...');
    await runMigrations();
    console.log('✅ Database migrations completed\n');

    // Test 4: Repository Functionality
    console.log('4. Testing repository functionality...');
    
    const locationRepo = new LocationRepository();
    const ratingRepo = new RatingRepository();

    // Test creating a sample location
    const sampleLocation = {
      name: 'Test Subway Location',
      address: '123 Test Street, Test City, TC 12345',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      hours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '21:00' },
        sunday: { open: '08:00', close: '20:00' },
        timezone: 'America/New_York'
      }
    };

    console.log('   Creating test location...');
    const locationId = await locationRepo.createLocation(sampleLocation);
    console.log(`   ✅ Test location created with ID: ${locationId}`);

    // Test creating a sample rating
    console.log('   Creating test rating...');
    const ratingId = await ratingRepo.createRating(locationId, 4);
    console.log(`   ✅ Test rating created with ID: ${ratingId}`);

    // Test fetching nearby locations
    console.log('   Testing nearby location query...');
    const nearbyLocations = await locationRepo.getNearbyLocations(
      { lat: 40.7128, lng: -74.0060 },
      10000
    );
    console.log(`   ✅ Found ${nearbyLocations.length} nearby locations`);

    // Test weighted score calculation
    console.log('   Testing weighted score calculation...');
    const weightedScore = await ratingRepo.getWeightedScore(locationId);
    console.log(`   ✅ Weighted score: ${weightedScore}`);

    // Clean up test data
    console.log('   Cleaning up test data...');
    await ratingRepo.deleteRating(ratingId);
    await locationRepo.deleteLocation(locationId);
    console.log('   ✅ Test data cleaned up\n');

    console.log('🎉 All database tests passed successfully!');
    console.log('\nYour hosted PostgreSQL database is properly configured and ready to use.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('\nPlease check your database configuration and ensure:');
    console.error('- Database connection details are correct in .env file');
    console.error('- PostgreSQL server is running and accessible');
    console.error('- PostGIS extension is available');
    console.error('- Database user has necessary permissions');
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDatabaseSetup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { testDatabaseSetup };