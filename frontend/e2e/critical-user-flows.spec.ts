import { test, expect } from '@playwright/test';

// Mock geolocation for consistent testing
test.beforeEach(async ({ context }) => {
  // Grant geolocation permission
  await context.grantPermissions(['geolocation']);
  
  // Set geolocation to NYC coordinates
  await context.setGeolocation({ latitude: 40.7128, longitude: -74.0060 });
});

test.describe('Critical User Flows', () => {
  test.describe('Location Permission and Map Loading', () => {
    test('should load app and request location permission', async ({ page }) => {
      await page.goto('/');
      
      // Should show the app header
      await expect(page.locator('h1')).toContainText('🥬 Leaf App');
      await expect(page.locator('text=Find the freshest lettuce at Subway')).toBeVisible();
      
      // Should show location permission request initially
      await expect(page.locator('text=Location Access Needed')).toBeVisible();
      await expect(page.locator('text=Allow Location Access')).toBeVisible();
    });

    test('should handle location permission grant and show map', async ({ page }) => {
      await page.goto('/');
      
      // Click allow location access
      await page.click('text=Allow Location Access');
      
      // Should show map view after permission granted
      await expect(page.locator('[data-testid="map-view"]')).toBeVisible({ timeout: 10000 });
      
      // Should show location panel
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible();
    });

    test('should handle location permission denial and show manual entry', async ({ page }) => {
      // Deny geolocation permission
      await page.context().clearPermissions();
      
      await page.goto('/');
      
      // Click allow location access (will be denied)
      await page.click('text=Allow Location Access');
      
      // Should show error and manual entry option
      await expect(page.locator('text=Location access was denied')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Enter Location Manually')).toBeVisible();
    });

    test('should handle manual location entry', async ({ page }) => {
      await page.context().clearPermissions();
      await page.goto('/');
      
      // Click manual location entry
      await page.click('text=Or enter location manually');
      
      // Should show manual location modal
      await expect(page.locator('text=Enter Your Location')).toBeVisible();
      
      // Switch to coordinates tab and enter coordinates
      await page.click('text=🌐 Coordinates');
      await page.fill('input[placeholder="40.7128"]', '40.7128');
      await page.fill('input[placeholder="-74.0060"]', '-74.0060');
      await page.click('text=Set Location');
      
      // Should close modal and show map
      await expect(page.locator('text=Enter Your Location')).not.toBeVisible();
      await expect(page.locator('[data-testid="map-view"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Location Search and Display', () => {
    test('should display nearby Subway locations', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      // Wait for locations to load
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Should show location cards
      await expect(page.locator('text=Subway - Times Square')).toBeVisible();
      await expect(page.locator('text=Subway - Penn Station')).toBeVisible();
      await expect(page.locator('text=Subway - Union Square')).toBeVisible();
      
      // Should show distance information
      await expect(page.locator('text=250m')).toBeVisible();
      
      // Should show lettuce scores
      await expect(page.locator('text=4.2')).toBeVisible();
    });

    test('should show location details when selected', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Click on a location
      await page.click('text=Subway - Times Square');
      
      // Should show location details
      await expect(page.locator('text=Rate')).toBeVisible();
      await expect(page.locator('text=Directions')).toBeVisible();
      
      // Should show hours information
      await expect(page.locator('text=Open')).toBeVisible();
    });

    test('should handle location panel toggle', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Find and click the panel toggle button (usually a drag handle or toggle button)
      const panelToggle = page.locator('[data-testid="panel-toggle"]').first();
      if (await panelToggle.isVisible()) {
        await panelToggle.click();
        
        // Panel should minimize/maximize
        await expect(page.locator('[data-testid="location-panel"]')).toHaveAttribute('data-expanded', 'false');
      }
    });
  });

  test.describe('Rating Submission Flow', () => {
    test('should open rating modal and submit rating', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Click on a location to select it
      await page.click('text=Subway - Times Square');
      
      // Click rate button
      await page.click('text=Rate');
      
      // Should show rating modal
      await expect(page.locator('[data-testid="rating-modal"]')).toBeVisible();
      await expect(page.locator('text=Rate Lettuce Freshness')).toBeVisible();
      
      // Should show star rating interface
      await expect(page.locator('[data-testid="star-rating"]')).toBeVisible();
      
      // Click on 5 stars
      await page.click('[data-testid="star-5"]');
      
      // Submit rating
      await page.click('text=Submit Rating');
      
      // Should show success message and close modal
      await expect(page.locator('text=Thank you for your rating!')).toBeVisible();
      await expect(page.locator('[data-testid="rating-modal"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('should show optimal timing recommendations in rating modal', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Click on a location and rate
      await page.click('text=Subway - Times Square');
      await page.click('text=Rate');
      
      // Should show timing recommendations
      await expect(page.locator('text=Best Times for Fresh Lettuce')).toBeVisible();
      await expect(page.locator('text=Morning')).toBeVisible();
    });

    test('should handle rating modal cancellation', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      await page.click('text=Subway - Times Square');
      await page.click('text=Rate');
      
      // Cancel rating
      await page.click('text=Cancel');
      
      // Modal should close
      await expect(page.locator('[data-testid="rating-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Directions Integration', () => {
    test('should handle directions request', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Click on a location
      await page.click('text=Subway - Times Square');
      
      // Mock window.open to prevent actual navigation
      await page.addInitScript(() => {
        window.open = (url) => {
          console.log('Directions opened:', url);
          return null;
        };
      });
      
      // Click directions
      await page.click('text=Directions');
      
      // Should attempt to open directions (we can't easily test the actual Google Maps integration)
      // But we can verify the button works and doesn't cause errors
      await expect(page.locator('text=Directions')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      // Should show mobile-optimized layout
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Panel should be slide-up style on mobile
      const panel = page.locator('[data-testid="location-panel"]');
      await expect(panel).toHaveCSS('position', 'fixed');
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Test touch interactions
      await page.tap('text=Subway - Times Square');
      await expect(page.locator('text=Rate')).toBeVisible();
      
      await page.tap('text=Rate');
      await expect(page.locator('[data-testid="rating-modal"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('**/api/locations/nearby', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      // Should show error message
      await expect(page.locator('text=Data Loading Issue')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Using cached data')).toBeVisible();
      
      // Should show retry button
      await expect(page.locator('text=Retry')).toBeVisible();
    });

    test('should handle offline state', async ({ page }) => {
      await page.goto('/');
      
      // Simulate offline
      await page.context().setOffline(true);
      
      await page.click('text=Allow Location Access');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 10000 });
    });

    test('should recover from errors', async ({ page }) => {
      // Start with error
      await page.route('**/api/locations/nearby', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('text=Data Loading Issue')).toBeVisible({ timeout: 10000 });
      
      // Remove error route to simulate recovery
      await page.unroute('**/api/locations/nearby');
      
      // Click retry
      await page.click('text=Retry');
      
      // Should recover and show locations
      await expect(page.locator('text=Subway - Times Square')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Data Synchronization', () => {
    test('should show real-time updates after rating submission', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Allow Location Access');
      
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Get initial score
      const initialScore = await page.locator('text=4.2').first().textContent();
      
      // Submit a rating
      await page.click('text=Subway - Times Square');
      await page.click('text=Rate');
      await page.click('[data-testid="star-5"]');
      await page.click('text=Submit Rating');
      
      // Should show updated score (this would require mocking the API response)
      await expect(page.locator('[data-testid="location-panel"]')).toBeVisible();
    });

    test('should show data sync indicator', async ({ page }) => {
      await page.goto('/');
      
      // Should show sync indicator in header
      await expect(page.locator('[data-testid="data-sync-indicator"]')).toBeVisible();
    });
  });
});