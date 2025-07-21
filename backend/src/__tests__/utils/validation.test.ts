import {
  validateCoordinates,
  validateRatingScore,
  validateUUID,
  validateLocationData,
  validateRatingData,
  validateNearbyQuery,
  calculateDistance,
  isValidSubwayLocation,
  validateStoreHours,
  isValidTimeRange,
  timeToMinutes,
  isStoreOpen,
  isValidTimezone,
  validateLocationSeedData
} from '../../utils/validation';
import { StoreHours } from '../../types';

describe('Validation Utils', () => {
  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(validateCoordinates({ lat: 40.7128, lng: -74.0060 })).toBe(true);
      expect(validateCoordinates({ lat: 0, lng: 0 })).toBe(true);
      expect(validateCoordinates({ lat: -90, lng: -180 })).toBe(true);
      expect(validateCoordinates({ lat: 90, lng: 180 })).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(validateCoordinates({ lat: 91, lng: 0 })).toBe(false);
      expect(validateCoordinates({ lat: 0, lng: 181 })).toBe(false);
      expect(validateCoordinates({ lat: -91, lng: 0 })).toBe(false);
      expect(validateCoordinates({ lat: 0, lng: -181 })).toBe(false);
      expect(validateCoordinates({ lat: 'invalid', lng: 0 })).toBe(false);
      expect(validateCoordinates({})).toBe(false);
    });
  });

  describe('validateRatingScore', () => {
    it('should validate correct rating scores', () => {
      expect(validateRatingScore(1)).toBe(true);
      expect(validateRatingScore(3)).toBe(true);
      expect(validateRatingScore(5)).toBe(true);
    });

    it('should reject invalid rating scores', () => {
      expect(validateRatingScore(0)).toBe(false);
      expect(validateRatingScore(6)).toBe(false);
      expect(validateRatingScore(3.5)).toBe(false);
      expect(validateRatingScore('3')).toBe(false);
      expect(validateRatingScore(null)).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(validateUUID('invalid-uuid')).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(validateUUID('')).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456-42661417400g')).toBe(false);
    });
  });

  describe('validateLocationData', () => {
    const validLocationData = {
      name: 'Subway Downtown',
      address: '123 Main St, New York, NY',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      hours: {
        monday: { open: "06:00", close: "22:00" },
        tuesday: { open: "06:00", close: "22:00" },
        wednesday: { open: "06:00", close: "22:00" },
        thursday: { open: "06:00", close: "22:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "07:00", close: "23:00" },
        sunday: { open: "07:00", close: "21:00" },
        timezone: "America/New_York"
      }
    };

    it('should validate correct location data', () => {
      expect(() => validateLocationData(validLocationData)).not.toThrow();
      
      const result = validateLocationData(validLocationData);
      expect(result.name).toBe('Subway Downtown');
      expect(result.coordinates.lat).toBe(40.7128);
    });

    it('should reject invalid location data', () => {
      expect(() => validateLocationData({})).toThrow('Invalid location data');
      
      expect(() => validateLocationData({
        ...validLocationData,
        name: ''
      })).toThrow('Invalid location data');

      expect(() => validateLocationData({
        ...validLocationData,
        coordinates: { lat: 91, lng: 0 }
      })).toThrow('Invalid location data');

      expect(() => validateLocationData({
        ...validLocationData,
        hours: { open: '25:00', close: '22:00', isOpen: true }
      })).toThrow('Invalid location data');
    });
  });

  describe('validateRatingData', () => {
    it('should validate correct rating data', () => {
      const validRating = {
        score: 4,
        locationId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '550e8400-e29b-41d4-a716-446655440000'
      };

      expect(() => validateRatingData(validRating)).not.toThrow();
      
      const result = validateRatingData(validRating);
      expect(result.score).toBe(4);
    });

    it('should reject invalid rating data', () => {
      expect(() => validateRatingData({
        score: 6,
        locationId: '123e4567-e89b-12d3-a456-426614174000'
      })).toThrow('Invalid rating data');

      expect(() => validateRatingData({
        score: 4,
        locationId: 'invalid-uuid'
      })).toThrow('Invalid rating data');
    });
  });

  describe('validateNearbyQuery', () => {
    it('should validate correct nearby query', () => {
      const validQuery = { lat: 40.7128, lng: -74.0060, radius: 1000 };
      
      expect(() => validateNearbyQuery(validQuery)).not.toThrow();
      
      const result = validateNearbyQuery(validQuery);
      expect(result.radius).toBe(1000);
    });

    it('should apply default radius', () => {
      const queryWithoutRadius = { lat: 40.7128, lng: -74.0060 };
      
      const result = validateNearbyQuery(queryWithoutRadius);
      expect(result.radius).toBe(5000);
    });

    it('should reject invalid queries', () => {
      expect(() => validateNearbyQuery({
        lat: 91,
        lng: 0
      })).toThrow('Invalid query parameters');

      expect(() => validateNearbyQuery({
        lat: 40.7128,
        lng: -74.0060,
        radius: 50 // too small
      })).toThrow('Invalid query parameters');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between coordinates', () => {
      const coord1 = { lat: 40.7128, lng: -74.0060 }; // NYC
      const coord2 = { lat: 40.7589, lng: -73.9851 }; // Times Square

      const distance = calculateDistance(coord1, coord2);
      
      // Distance should be approximately 5.7 km
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(7000);
    });

    it('should return 0 for identical coordinates', () => {
      const coord = { lat: 40.7128, lng: -74.0060 };
      
      const distance = calculateDistance(coord, coord);
      expect(distance).toBeCloseTo(0, 1);
    });
  });

  describe('isValidSubwayLocation', () => {
    it('should validate coordinates within reasonable bounds', () => {
      // US locations
      expect(isValidSubwayLocation({ lat: 40.7128, lng: -74.0060 })).toBe(true); // NYC
      expect(isValidSubwayLocation({ lat: 34.0522, lng: -118.2437 })).toBe(true); // LA
      expect(isValidSubwayLocation({ lat: 25.7617, lng: -80.1918 })).toBe(true); // Miami
      
      // Canadian locations
      expect(isValidSubwayLocation({ lat: 43.6532, lng: -79.3832 })).toBe(true); // Toronto
    });

    it('should reject coordinates outside reasonable bounds', () => {
      // Antarctica
      expect(isValidSubwayLocation({ lat: -80, lng: 0 })).toBe(false);
      
      // Middle of Pacific Ocean
      expect(isValidSubwayLocation({ lat: 0, lng: -150 })).toBe(false);
      
      // Europe (outside typical Subway coverage)
      expect(isValidSubwayLocation({ lat: 48.8566, lng: 2.3522 })).toBe(false);
    });
  });

  describe('validateStoreHours', () => {
    const validHours: StoreHours = {
      monday: { open: "06:00", close: "22:00" },
      tuesday: { open: "06:00", close: "22:00" },
      wednesday: { open: "06:00", close: "22:00" },
      thursday: { open: "06:00", close: "22:00" },
      friday: { open: "06:00", close: "23:00" },
      saturday: { open: "07:00", close: "23:00" },
      sunday: { open: "07:00", close: "21:00" },
      timezone: "America/New_York"
    };

    it('should validate correct store hours', () => {
      expect(validateStoreHours(validHours)).toBe(true);
    });

    it('should reject missing timezone', () => {
      const invalidHours = { ...validHours };
      delete (invalidHours as any).timezone;
      expect(validateStoreHours(invalidHours)).toBe(false);
    });

    it('should reject invalid time format', () => {
      const invalidHours = { 
        ...validHours, 
        monday: { open: "6:00", close: "22:00" } // Missing leading zero
      };
      expect(validateStoreHours(invalidHours)).toBe(false);
    });

    it('should reject invalid time values', () => {
      const invalidHours = { 
        ...validHours, 
        monday: { open: "25:00", close: "22:00" }
      };
      expect(validateStoreHours(invalidHours)).toBe(false);
    });

    it('should allow 24:00 as close time', () => {
      const validHours24 = { 
        ...validHours, 
        friday: { open: "06:00", close: "24:00" }
      };
      expect(validateStoreHours(validHours24)).toBe(true);
    });

    it('should handle closed days', () => {
      const closedSundayHours = { 
        ...validHours, 
        sunday: { open: "00:00", close: "00:00", closed: true }
      };
      expect(validateStoreHours(closedSundayHours)).toBe(true);
    });

    it('should reject missing day', () => {
      const missingDayHours = { ...validHours };
      delete (missingDayHours as any).monday;
      expect(validateStoreHours(missingDayHours)).toBe(false);
    });
  });

  describe('isValidTimeRange', () => {
    it('should validate normal time ranges', () => {
      expect(isValidTimeRange("06:00", "22:00")).toBe(true);
      expect(isValidTimeRange("09:30", "17:45")).toBe(true);
    });

    it('should allow 24:00 as close time', () => {
      expect(isValidTimeRange("06:00", "24:00")).toBe(true);
    });

    it('should allow overnight hours', () => {
      expect(isValidTimeRange("22:00", "00:00")).toBe(true);
    });

    it('should reject invalid ranges', () => {
      expect(isValidTimeRange("22:00", "06:00")).toBe(false);
      expect(isValidTimeRange("12:00", "11:00")).toBe(false);
    });
  });

  describe('timeToMinutes', () => {
    it('should convert time strings to minutes', () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("01:00")).toBe(60);
      expect(timeToMinutes("12:30")).toBe(750);
      expect(timeToMinutes("23:59")).toBe(1439);
    });
  });

  describe('isStoreOpen', () => {
    const testHours: StoreHours = {
      monday: { open: "06:00", close: "22:00" },
      tuesday: { open: "06:00", close: "22:00" },
      wednesday: { open: "06:00", close: "22:00" },
      thursday: { open: "06:00", close: "22:00" },
      friday: { open: "06:00", close: "24:00" },
      saturday: { open: "07:00", close: "23:00" },
      sunday: { open: "00:00", close: "00:00", closed: true },
      timezone: "America/New_York"
    };

    it('should return true when store is open', () => {
      // Monday at 10:00 AM EST
      const mondayMorning = new Date('2024-01-15T15:00:00Z'); // 10:00 AM EST
      expect(isStoreOpen(testHours, mondayMorning)).toBe(true);
    });

    it('should return false when store is closed', () => {
      // Monday at 2:00 AM EST
      const mondayNight = new Date('2024-01-15T07:00:00Z'); // 2:00 AM EST
      expect(isStoreOpen(testHours, mondayNight)).toBe(false);
    });

    it('should return false for closed days', () => {
      // Sunday (closed day)
      const sunday = new Date('2024-01-14T15:00:00Z'); // 10:00 AM EST on Sunday
      expect(isStoreOpen(testHours, sunday)).toBe(false);
    });

    it('should handle 24:00 close time', () => {
      // Friday at 11:30 PM EST (before midnight) - 2024-01-19 is a Friday
      const fridayNight = new Date('2024-01-19T23:30:00-05:00'); // 11:30 PM EST explicitly
      expect(isStoreOpen(testHours, fridayNight)).toBe(true);
    });
  });

  describe('isValidTimezone', () => {
    it('should validate correct timezones', () => {
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("America/Los_Angeles")).toBe(true);
      expect(isValidTimezone("America/Chicago")).toBe(true);
      expect(isValidTimezone("UTC")).toBe(true);
    });

    it('should reject invalid timezones', () => {
      expect(isValidTimezone("Invalid/Timezone")).toBe(false);
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("EST")).toBe(false); // Abbreviations not supported
    });
  });

  describe('validateLocationSeedData', () => {
    const validLocationSeedData = {
      name: "Subway - Test Location",
      address: "123 Test St, Test City, NY 10001",
      coordinates: { lat: 40.7589, lng: -73.9851 },
      hours: {
        monday: { open: "06:00", close: "22:00" },
        tuesday: { open: "06:00", close: "22:00" },
        wednesday: { open: "06:00", close: "22:00" },
        thursday: { open: "06:00", close: "22:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "07:00", close: "23:00" },
        sunday: { open: "07:00", close: "21:00" },
        timezone: "America/New_York"
      }
    };

    it('should validate correct location seed data', () => {
      expect(validateLocationSeedData(validLocationSeedData)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const invalidData = {
        ...validLocationSeedData,
        coordinates: { lat: 91, lng: -73.9851 }
      };
      expect(validateLocationSeedData(invalidData)).toBe(false);
    });

    it('should reject coordinates outside Subway range', () => {
      const invalidData = {
        ...validLocationSeedData,
        coordinates: { lat: 48.8566, lng: 2.3522 } // Paris
      };
      expect(validateLocationSeedData(invalidData)).toBe(false);
    });

    it('should reject invalid store hours', () => {
      const invalidData = {
        ...validLocationSeedData,
        hours: {
          ...validLocationSeedData.hours,
          monday: { open: "25:00", close: "22:00" }
        }
      };
      expect(validateLocationSeedData(invalidData)).toBe(false);
    });

    it('should reject invalid timezone', () => {
      const invalidData = {
        ...validLocationSeedData,
        hours: {
          ...validLocationSeedData.hours,
          timezone: "Invalid/Timezone"
        }
      };
      expect(validateLocationSeedData(invalidData)).toBe(false);
    });
  });
});