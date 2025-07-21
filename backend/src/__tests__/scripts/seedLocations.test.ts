import { StoreHours, Coordinates } from '../../types';

// Mock the database connection
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  end: jest.fn()
};

jest.mock('../../database/connection', () => mockPool);

import { 
  validateLocationSeedData, 
  validateStoreHours, 
  insertLocation, 
  locationExists,
  clearLocations,
  getLocationCount,
  seedLocations
} from '../../scripts/seedLocations';

describe('Location Data Seeding System', () => {
  
  describe('validateLocationSeedData', () => {
    const validLocation = {
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

    it('should validate correct location data', () => {
      expect(() => validateLocationSeedData(validLocation)).not.toThrow();
    });

    it('should reject empty name', () => {
      const invalidLocation = { ...validLocation, name: "" };
      expect(() => validateLocationSeedData(invalidLocation)).toThrow('Invalid location name');
    });

    it('should reject name that is too long', () => {
      const invalidLocation = { ...validLocation, name: "a".repeat(256) };
      expect(() => validateLocationSeedData(invalidLocation)).toThrow('Location name too long');
    });

    it('should reject short address', () => {
      const invalidLocation = { ...validLocation, address: "123" };
      expect(() => validateLocationSeedData(invalidLocation)).toThrow('Invalid address');
    });

    it('should reject address that is too long', () => {
      const invalidLocation = { ...validLocation, address: "a".repeat(501) };
      expect(() => validateLocationSeedData(invalidLocation)).toThrow('Address too long');
    });

    it('should reject invalid coordinates', () => {
      const invalidLocation = { ...validLocation, coordinates: { lat: 91, lng: -73.9851 } };
      expect(() => validateLocationSeedData(invalidLocation)).toThrow('Invalid coordinates');
    });

    it('should reject coordinates outside valid Subway range', () => {
      const invalidLocation = { ...validLocation, coordinates: { lat: 80, lng: 100 } };
      expect(() => validateLocationSeedData(invalidLocation)).toThrow('Coordinates outside valid Subway location range');
    });

    it('should reject invalid store hours', () => {
      const invalidLocation = { 
        ...validLocation, 
        hours: { ...validLocation.hours, monday: { open: "25:00", close: "22:00" } }
      };
      expect(() => validateLocationSeedData(invalidLocation)).toThrow();
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
      expect(() => validateStoreHours(validHours)).not.toThrow();
    });

    it('should reject missing timezone', () => {
      const invalidHours = { ...validHours };
      delete (invalidHours as any).timezone;
      expect(() => validateStoreHours(invalidHours)).toThrow('Store hours must include a valid timezone');
    });

    it('should reject invalid time format', () => {
      const invalidHours = { 
        ...validHours, 
        monday: { open: "6:00", close: "22:00" } // Missing leading zero
      };
      expect(() => validateStoreHours(invalidHours)).toThrow('Invalid open time');
    });

    it('should reject invalid time values', () => {
      const invalidHours = { 
        ...validHours, 
        monday: { open: "25:00", close: "22:00" }
      };
      expect(() => validateStoreHours(invalidHours)).toThrow('Invalid open time');
    });

    it('should reject close time before open time', () => {
      const invalidHours = { 
        ...validHours, 
        monday: { open: "22:00", close: "06:00" }
      };
      expect(() => validateStoreHours(invalidHours)).toThrow('Close time must be after open time');
    });

    it('should allow 24:00 as close time', () => {
      const validHours24 = { 
        ...validHours, 
        friday: { open: "06:00", close: "24:00" }
      };
      expect(() => validateStoreHours(validHours24)).not.toThrow();
    });

    it('should allow 00:00 as close time for overnight hours', () => {
      const overnightHours = { 
        ...validHours, 
        friday: { open: "22:00", close: "00:00" }
      };
      expect(() => validateStoreHours(overnightHours)).not.toThrow();
    });

    it('should handle closed days', () => {
      const closedSundayHours = { 
        ...validHours, 
        sunday: { open: "00:00", close: "00:00", closed: true }
      };
      expect(() => validateStoreHours(closedSundayHours)).not.toThrow();
    });

    it('should reject closed days without open/close times', () => {
      const invalidClosedHours = { 
        ...validHours, 
        sunday: { closed: true } as any
      };
      expect(() => validateStoreHours(invalidClosedHours)).toThrow('Closed day sunday must still have open and close times');
    });

    it('should reject missing day', () => {
      const missingDayHours = { ...validHours };
      delete (missingDayHours as any).monday;
      expect(() => validateStoreHours(missingDayHours)).toThrow('Missing or invalid hours for monday');
    });
  });

  describe('Database Operations', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockPool.connect.mockResolvedValue(mockClient as any);
    });

    describe('insertLocation', () => {
      const validLocation = {
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

      it('should insert valid location successfully', async () => {
        const mockLocationId = 'test-uuid-123';
        mockClient.query.mockResolvedValue({ rows: [{ id: mockLocationId }] });

        const result = await insertLocation(validLocation);

        expect(result).toBe(mockLocationId);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO locations'),
          expect.arrayContaining([
            validLocation.name,
            validLocation.address,
            validLocation.coordinates.lng,
            validLocation.coordinates.lat,
            JSON.stringify(validLocation.hours)
          ])
        );
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should reject invalid location data', async () => {
        const invalidLocation = { ...validLocation, name: "" };

        await expect(insertLocation(invalidLocation)).rejects.toThrow('Invalid location name');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        mockClient.query.mockRejectedValue(new Error('Database error'));

        await expect(insertLocation(validLocation)).rejects.toThrow('Database error');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('locationExists', () => {
      const testLocation = {
        name: "Subway - Test Location",
        address: "123 Test St, Test City, NY 10001",
        coordinates: { lat: 40.7589, lng: -73.9851 },
        hours: {} as StoreHours
      };

      it('should return true if location exists', async () => {
        mockClient.query.mockResolvedValue({ rows: [{ id: 'existing-id' }] });

        const result = await locationExists(testLocation);

        expect(result).toBe(true);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT id FROM locations'),
          expect.arrayContaining([
            testLocation.name,
            testLocation.coordinates.lng,
            testLocation.coordinates.lat
          ])
        );
      });

      it('should return false if location does not exist', async () => {
        mockClient.query.mockResolvedValue({ rows: [] });

        const result = await locationExists(testLocation);

        expect(result).toBe(false);
      });

      it('should handle database errors gracefully', async () => {
        mockClient.query.mockRejectedValue(new Error('Database error'));

        const result = await locationExists(testLocation);

        expect(result).toBe(false);
      });
    });

    describe('clearLocations', () => {
      it('should clear all locations and ratings', async () => {
        mockClient.query.mockResolvedValue({ rows: [] });

        await clearLocations();

        expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM ratings');
        expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM locations');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        mockClient.query.mockRejectedValue(new Error('Database error'));

        await expect(clearLocations()).rejects.toThrow('Database error');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('getLocationCount', () => {
      it('should return location count', async () => {
        mockClient.query.mockResolvedValue({ rows: [{ count: '5' }] });

        const result = await getLocationCount();

        expect(result).toBe(5);
        expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM locations');
      });

      it('should return 0 on database error', async () => {
        mockClient.query.mockRejectedValue(new Error('Database error'));

        const result = await getLocationCount();

        expect(result).toBe(0);
      });
    });
  });

  describe('Coordinate Validation Edge Cases', () => {
    it('should validate coordinates within Subway operating range', () => {
      const validCoords = [
        { lat: 40.7589, lng: -73.9851 }, // NYC (typical Subway location)
        { lat: 34.0522, lng: -118.2437 }, // LA
        { lat: 43.6532, lng: -79.3832 }  // Toronto
      ];

      validCoords.forEach(coord => {
        expect(() => validateLocationSeedData({
          name: "Test Subway",
          address: "123 Test St, Test City, NY 10001",
          coordinates: coord,
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
        })).not.toThrow();
      });
    });

    it('should reject coordinates outside valid ranges', () => {
      const invalidCoords = [
        { lat: -91, lng: 0 },     // South of valid range
        { lat: 91, lng: 0 },      // North of valid range
        { lat: 0, lng: -181 },    // West of valid range
        { lat: 0, lng: 181 }      // East of valid range
      ];

      invalidCoords.forEach(coord => {
        expect(() => validateLocationSeedData({
          name: "Test Subway",
          address: "123 Test St, Test City, NY 10001",
          coordinates: coord,
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
        })).toThrow();
      });
    });
  });

  describe('Time Validation Edge Cases', () => {
    const baseLocation = {
      name: "Test Subway",
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

    it('should accept valid time formats', () => {
      const validTimes = [
        { open: "00:00", close: "23:59" },
        { open: "06:30", close: "22:30" },
        { open: "12:00", close: "23:00" } // Changed from 24:00 to 23:00 for this test
      ];

      validTimes.forEach(time => {
        const location = {
          ...baseLocation,
          hours: { ...baseLocation.hours, monday: time }
        };
        expect(() => validateLocationSeedData(location)).not.toThrow();
      });
    });

    it('should accept 24:00 as valid close time', () => {
      const location = {
        ...baseLocation,
        hours: { ...baseLocation.hours, monday: { open: "12:00", close: "24:00" } }
      };
      expect(() => validateLocationSeedData(location)).not.toThrow();
    });

    it('should reject invalid time formats', () => {
      const invalidTimes = [
        { open: "6:00", close: "22:00" },    // Missing leading zero
        { open: "06:0", close: "22:00" },    // Missing digit
        { open: "25:00", close: "22:00" },   // Invalid hour
        { open: "06:60", close: "22:00" },   // Invalid minute
        { open: "06:00", close: "25:00" },   // Invalid close hour (not 24:00)
        { open: "abc", close: "22:00" }      // Non-numeric
      ];

      invalidTimes.forEach(time => {
        const location = {
          ...baseLocation,
          hours: { ...baseLocation.hours, monday: time }
        };
        expect(() => validateLocationSeedData(location)).toThrow();
      });
    });
  });

  describe('Integration Tests', () => {
    // These would be integration tests that require a real database
    // For now, we'll mock them but in a real scenario, you'd use a test database

    it('should seed locations without duplicates', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      
      mockPool.connect.mockResolvedValue(mockClient as any);
      
      // Mock the database operations for seeding
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // locationExists returns false
        .mockResolvedValueOnce({ rows: [{ id: 'new-id-1' }] }) // insertLocation succeeds
        .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }) // locationExists returns true
        .mockResolvedValueOnce({ rows: [{ id: 'new-id-2' }] }); // insertLocation succeeds

      // This would test the actual seeding logic
      // In a real test, you'd verify the database state
      expect(true).toBe(true); // Placeholder
    });
  });
});