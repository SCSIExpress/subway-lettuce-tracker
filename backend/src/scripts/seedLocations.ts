import pool from '../database/connection';
import { StoreHours, Coordinates } from '../types';
import { validateCoordinates, isValidSubwayLocation } from '../utils/validation';

// Sample Subway locations data (real locations for testing)
const SAMPLE_LOCATIONS = [
  {
    name: "Subway - Times Square",
    address: "1560 Broadway, New York, NY 10036",
    coordinates: { lat: 40.7589, lng: -73.9851 },
    hours: {
      monday: { open: "06:00", close: "23:00" },
      tuesday: { open: "06:00", close: "23:00" },
      wednesday: { open: "06:00", close: "23:00" },
      thursday: { open: "06:00", close: "23:00" },
      friday: { open: "06:00", close: "24:00" },
      saturday: { open: "06:00", close: "24:00" },
      sunday: { open: "07:00", close: "22:00" },
      timezone: "America/New_York"
    }
  },
  {
    name: "Subway - Union Square",
    address: "4 Union Square S, New York, NY 10003",
    coordinates: { lat: 40.7359, lng: -73.9911 },
    hours: {
      monday: { open: "07:00", close: "22:00" },
      tuesday: { open: "07:00", close: "22:00" },
      wednesday: { open: "07:00", close: "22:00" },
      thursday: { open: "07:00", close: "22:00" },
      friday: { open: "07:00", close: "23:00" },
      saturday: { open: "08:00", close: "23:00" },
      sunday: { open: "08:00", close: "21:00" },
      timezone: "America/New_York"
    }
  },
  {
    name: "Subway - Central Park West",
    address: "2239 Broadway, New York, NY 10024",
    coordinates: { lat: 40.7831, lng: -73.9712 },
    hours: {
      monday: { open: "06:30", close: "22:30" },
      tuesday: { open: "06:30", close: "22:30" },
      wednesday: { open: "06:30", close: "22:30" },
      thursday: { open: "06:30", close: "22:30" },
      friday: { open: "06:30", close: "23:30" },
      saturday: { open: "07:00", close: "23:30" },
      sunday: { open: "07:00", close: "22:00" },
      timezone: "America/New_York"
    }
  },
  {
    name: "Subway - Brooklyn Heights",
    address: "142 Montague St, Brooklyn, NY 11201",
    coordinates: { lat: 40.6955, lng: -73.9927 },
    hours: {
      monday: { open: "07:00", close: "21:00" },
      tuesday: { open: "07:00", close: "21:00" },
      wednesday: { open: "07:00", close: "21:00" },
      thursday: { open: "07:00", close: "21:00" },
      friday: { open: "07:00", close: "22:00" },
      saturday: { open: "08:00", close: "22:00" },
      sunday: { open: "08:00", close: "20:00" },
      timezone: "America/New_York"
    }
  },
  {
    name: "Subway - Financial District",
    address: "100 Church St, New York, NY 10007",
    coordinates: { lat: 40.7127, lng: -74.0059 },
    hours: {
      monday: { open: "06:00", close: "20:00" },
      tuesday: { open: "06:00", close: "20:00" },
      wednesday: { open: "06:00", close: "20:00" },
      thursday: { open: "06:00", close: "20:00" },
      friday: { open: "06:00", close: "19:00" },
      saturday: { open: "08:00", close: "18:00" },
      sunday: { closed: true, open: "00:00", close: "00:00" },
      timezone: "America/New_York"
    }
  },
  {
    name: "Subway - San Francisco Downtown",
    address: "301 Mission St, San Francisco, CA 94105",
    coordinates: { lat: 37.7879, lng: -122.3972 },
    hours: {
      monday: { open: "07:00", close: "21:00" },
      tuesday: { open: "07:00", close: "21:00" },
      wednesday: { open: "07:00", close: "21:00" },
      thursday: { open: "07:00", close: "21:00" },
      friday: { open: "07:00", close: "22:00" },
      saturday: { open: "08:00", close: "22:00" },
      sunday: { open: "08:00", close: "20:00" },
      timezone: "America/Los_Angeles"
    }
  },
  {
    name: "Subway - Chicago Loop",
    address: "55 E Monroe St, Chicago, IL 60603",
    coordinates: { lat: 41.8796, lng: -87.6237 },
    hours: {
      monday: { open: "06:30", close: "21:30" },
      tuesday: { open: "06:30", close: "21:30" },
      wednesday: { open: "06:30", close: "21:30" },
      thursday: { open: "06:30", close: "21:30" },
      friday: { open: "06:30", close: "22:00" },
      saturday: { open: "07:30", close: "22:00" },
      sunday: { open: "08:00", close: "20:00" },
      timezone: "America/Chicago"
    }
  },
  {
    name: "Subway - Los Angeles Downtown",
    address: "800 W 6th St, Los Angeles, CA 90017",
    coordinates: { lat: 34.0522, lng: -118.2437 },
    hours: {
      monday: { open: "06:00", close: "22:00" },
      tuesday: { open: "06:00", close: "22:00" },
      wednesday: { open: "06:00", close: "22:00" },
      thursday: { open: "06:00", close: "22:00" },
      friday: { open: "06:00", close: "23:00" },
      saturday: { open: "07:00", close: "23:00" },
      sunday: { open: "07:00", close: "21:00" },
      timezone: "America/Los_Angeles"
    }
  }
];

interface LocationSeedData {
  name: string;
  address: string;
  coordinates: Coordinates;
  hours: StoreHours;
}

/**
 * Validate location data before seeding
 */
export const validateLocationSeedData = (location: LocationSeedData): void => {
  // Validate name
  if (!location.name || location.name.trim().length === 0) {
    throw new Error(`Invalid location name: ${location.name}`);
  }
  if (location.name.length > 255) {
    throw new Error(`Location name too long: ${location.name}`);
  }

  // Validate address
  if (!location.address || location.address.trim().length < 5) {
    throw new Error(`Invalid address: ${location.address}`);
  }
  if (location.address.length > 500) {
    throw new Error(`Address too long: ${location.address}`);
  }

  // Validate coordinates
  if (!validateCoordinates(location.coordinates)) {
    throw new Error(`Invalid coordinates: ${JSON.stringify(location.coordinates)}`);
  }

  if (!isValidSubwayLocation(location.coordinates)) {
    throw new Error(`Coordinates outside valid Subway location range: ${JSON.stringify(location.coordinates)}`);
  }

  // Validate hours structure
  validateStoreHours(location.hours);
};

/**
 * Validate store hours data structure
 */
export const validateStoreHours = (hours: StoreHours): void => {
  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

  // Check timezone
  if (!hours.timezone || typeof hours.timezone !== 'string') {
    throw new Error('Store hours must include a valid timezone');
  }

  // Validate each day
  for (const day of requiredDays) {
    const dayHours = hours[day as keyof StoreHours];
    
    if (!dayHours || typeof dayHours !== 'object') {
      throw new Error(`Missing or invalid hours for ${day}`);
    }

    // Check if closed
    if (dayHours.closed) {
      // For closed days, open and close times should still be present but can be "00:00"
      if (!dayHours.open || !dayHours.close) {
        throw new Error(`Closed day ${day} must still have open and close times`);
      }
      continue;
    }

    // Validate open time
    if (!dayHours.open || !timePattern.test(dayHours.open)) {
      throw new Error(`Invalid open time for ${day}: ${dayHours.open}`);
    }

    // Validate close time (allow 24:00 as special case)
    if (!dayHours.close || (!timePattern.test(dayHours.close) && dayHours.close !== '24:00')) {
      throw new Error(`Invalid close time for ${day}: ${dayHours.close}`);
    }

    // Validate that close time is after open time (handle midnight crossing)
    const openMinutes = timeToMinutes(dayHours.open);
    const closeMinutes = timeToMinutes(dayHours.close);
    
    // Allow 24:00 as a special case for midnight
    if (dayHours.close === '24:00') {
      // This is valid - store closes at midnight
    } else if (closeMinutes <= openMinutes && dayHours.close !== '00:00') {
      // Only allow close <= open if close is 00:00 (midnight)
      throw new Error(`Close time must be after open time for ${day}: ${dayHours.open} - ${dayHours.close}`);
    }
  }
};

/**
 * Convert time string to minutes since midnight
 */
const timeToMinutes = (time: string): number => {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr || '0', 10);
  const minutes = parseInt(minutesStr || '0', 10);
  return hours * 60 + minutes;
};

/**
 * Insert a single location into the database
 */
export const insertLocation = async (location: LocationSeedData): Promise<string> => {
  const client = await pool.connect();
  
  try {
    // Validate data before insertion
    validateLocationSeedData(location);

    const query = `
      INSERT INTO locations (name, address, coordinates, hours)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
      RETURNING id
    `;

    const values = [
      location.name.trim(),
      location.address.trim(),
      location.coordinates.lng,
      location.coordinates.lat,
      JSON.stringify(location.hours)
    ];

    const result = await client.query(query, values);
    const locationId = result.rows[0].id;

    console.log(`✅ Inserted location: ${location.name} (ID: ${locationId})`);
    return locationId;

  } catch (error) {
    console.error(`❌ Failed to insert location ${location.name}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if a location already exists (by name and approximate coordinates)
 */
export const locationExists = async (location: LocationSeedData): Promise<boolean> => {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT id FROM locations 
      WHERE name = $1 
      AND ST_DWithin(
        coordinates, 
        ST_SetSRID(ST_MakePoint($2, $3), 4326), 
        100
      )
      LIMIT 1
    `;

    const result = await client.query(query, [
      location.name.trim(),
      location.coordinates.lng,
      location.coordinates.lat
    ]);

    return result.rows.length > 0;

  } catch (error) {
    console.error('Error checking if location exists:', error);
    return false;
  } finally {
    client.release();
  }
};

/**
 * Seed all sample locations
 */
export const seedLocations = async (skipExisting: boolean = true): Promise<void> => {
  console.log('🌱 Starting location seeding...');
  
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const location of SAMPLE_LOCATIONS) {
    try {
      if (skipExisting && await locationExists(location)) {
        console.log(`⏭️  Skipping existing location: ${location.name}`);
        skipped++;
        continue;
      }

      await insertLocation(location);
      inserted++;

    } catch (error) {
      console.error(`❌ Error seeding location ${location.name}:`, error);
      errors++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Inserted: ${inserted} locations`);
  console.log(`⏭️  Skipped: ${skipped} locations`);
  console.log(`❌ Errors: ${errors} locations`);
  console.log(`📍 Total sample locations: ${SAMPLE_LOCATIONS.length}`);
};

/**
 * Clear all locations (for testing)
 */
export const clearLocations = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM ratings');
    await client.query('DELETE FROM locations');
    console.log('🗑️  Cleared all locations and ratings');
  } catch (error) {
    console.error('Error clearing locations:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get location count
 */
export const getLocationCount = async (): Promise<number> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT COUNT(*) as count FROM locations');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting location count:', error);
    return 0;
  } finally {
    client.release();
  }
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    try {
      switch (command) {
        case 'seed':
          await seedLocations();
          break;
        case 'clear':
          await clearLocations();
          break;
        case 'count':
          const count = await getLocationCount();
          console.log(`📍 Total locations: ${count}`);
          break;
        case 'reseed':
          await clearLocations();
          await seedLocations(false);
          break;
        default:
          console.log('Usage: ts-node seedLocations.ts [seed|clear|count|reseed]');
          console.log('  seed   - Add sample locations (skip existing)');
          console.log('  clear  - Remove all locations');
          console.log('  count  - Show location count');
          console.log('  reseed - Clear and re-add all locations');
      }
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  })();
}