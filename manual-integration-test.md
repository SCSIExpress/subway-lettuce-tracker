# Manual Integration Test Guide

This document provides a comprehensive manual testing guide to validate the complete integration of all components in the Subway Lettuce Tracker application.

## Prerequisites

1. **Environment Setup**
   - Node.js and npm installed
   - Docker (optional, for database)
   - Google Maps API key configured

2. **Start the Application**
   ```bash
   # Terminal 1: Start Backend
   cd backend
   npm install
   npm run dev

   # Terminal 2: Start Frontend  
   cd frontend
   npm install
   npm run dev
   ```

## Test Scenarios

### 1. Location Permission and Map Loading (Requirements 1.1, 1.2, 1.3, 1.4)

**Test Steps:**
1. Open browser to `http://localhost:3000`
2. Observe initial loading state
3. When prompted for location access, click "Allow"
4. Verify map loads with user location centered
5. Verify Subway location markers appear on map
6. Verify slide-up panel appears at bottom

**Expected Results:**
- ✅ App loads without errors
- ✅ Location permission request appears
- ✅ Map displays with user location
- ✅ Subway markers visible on map
- ✅ Location panel slides up from bottom

**Fallback Test (Location Denied):**
1. Refresh page and deny location access
2. Click "Enter Location Manually"
3. Enter coordinates: Lat: 40.7128, Lng: -74.0060
4. Click "Set Location"
5. Verify map centers on entered location

### 2. Location Search and Display (Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6)

**Test Steps:**
1. With map loaded, examine the location panel
2. Verify locations are ordered by distance
3. Check each location card displays:
   - Restaurant name
   - Address
   - Distance from user
   - Lettuce freshness score (1-5)
   - Open/closed status
   - Recently rated indicator (if applicable)
4. Scroll through location list
5. Click on different location cards

**Expected Results:**
- ✅ Locations sorted by distance (nearest first)
- ✅ All location details displayed correctly
- ✅ Scores show as numbers (1-5 scale)
- ✅ Distance shows in meters/km
- ✅ Open/closed status accurate
- ✅ Recently rated locations show indicator
- ✅ Smooth scrolling in panel
- ✅ Location selection highlights card

### 3. Rating Submission Flow (Requirements 3.1, 3.2, 3.3, 3.4, 3.5)

**Test Steps:**
1. Select a Subway location from the list
2. Click the "Rate" button
3. Verify rating modal opens
4. Check modal displays:
   - Location name and details
   - 1-5 star rating interface
   - Last rating timestamp (if available)
   - Optimal timing recommendations
5. Click on different star ratings (1-5)
6. Submit a rating
7. Verify modal closes and success message appears
8. Check location score updates in real-time

**Expected Results:**
- ✅ Rating modal opens smoothly
- ✅ Star rating interface functional (1-5 stars)
- ✅ Visual feedback when selecting stars
- ✅ Submit button enables after rating selection
- ✅ Success message after submission
- ✅ Modal closes automatically
- ✅ Location score updates immediately
- ✅ Recently rated indicator appears

### 4. Directions Integration (Requirements 4.1, 4.2, 4.3)

**Test Steps:**
1. Select a Subway location
2. Click the "Directions" button
3. Verify directions functionality:
   - Google Maps opens (new tab/window)
   - Correct destination address
   - Navigation route displayed

**Expected Results:**
- ✅ Directions button clickable
- ✅ Google Maps opens with correct location
- ✅ Route from user location to restaurant
- ✅ No JavaScript errors in console

### 5. Responsive Design Testing (Requirements 6.1, 6.2, 6.3, 6.4)

**Test Steps:**
1. **Desktop Testing (1024px+)**
   - Verify full layout with sidebar/panel
   - Check all elements properly spaced
   - Test hover effects on cards and buttons

2. **Tablet Testing (768px - 1023px)**
   - Resize browser window to tablet size
   - Verify layout adapts appropriately
   - Check touch interactions work

3. **Mobile Testing (320px - 767px)**
   - Resize to mobile dimensions
   - Verify slide-up panel behavior
   - Test touch gestures (tap, swipe)
   - Check text remains readable
   - Verify buttons are touch-friendly (44px minimum)

**Expected Results:**
- ✅ Layout adapts smoothly to all screen sizes
- ✅ Text remains readable at all sizes
- ✅ Buttons maintain proper touch targets
- ✅ Panel slides properly on mobile
- ✅ No horizontal scrolling
- ✅ All functionality works on touch devices

### 6. Historical Analysis and Timing (Requirements 7.1, 7.2, 7.3, 7.4)

**Test Steps:**
1. Open rating modal for a location with historical data
2. Check for optimal timing recommendations
3. Verify time periods displayed (morning, lunch, afternoon, evening)
4. Check confidence levels and sample sizes
5. Submit ratings at different times to test analysis

**Expected Results:**
- ✅ Time recommendations appear when data available
- ✅ Different time periods shown with scores
- ✅ Confidence levels indicated
- ✅ "Not enough data" message when insufficient ratings

### 7. Error Handling and Edge Cases

**Test Steps:**
1. **Network Errors**
   - Disconnect internet
   - Try to load locations
   - Verify offline indicator appears
   - Reconnect and test recovery

2. **Invalid Inputs**
   - Try manual location entry with invalid coordinates
   - Test rating submission without selection
   - Verify proper error messages

3. **API Failures**
   - Test with backend server stopped
   - Verify graceful degradation
   - Check error boundaries catch issues

**Expected Results:**
- ✅ Offline state properly indicated
- ✅ Error messages are user-friendly
- ✅ App doesn't crash on errors
- ✅ Recovery works when connection restored
- ✅ Fallback data shown when API unavailable

### 8. Performance and Load Testing

**Test Steps:**
1. **Load Testing**
   - Open multiple browser tabs
   - Test with many location markers
   - Check smooth scrolling with large lists

2. **Memory Usage**
   - Use browser dev tools to monitor memory
   - Navigate between locations multiple times
   - Check for memory leaks

**Expected Results:**
- ✅ App remains responsive with multiple tabs
- ✅ Smooth performance with many locations
- ✅ No significant memory leaks
- ✅ Fast initial load time

## Integration Validation Checklist

### Frontend-Backend Integration
- [ ] Location data loads from API
- [ ] Rating submissions save to backend
- [ ] Real-time score updates work
- [ ] Error handling between frontend/backend
- [ ] CORS properly configured

### Google Maps Integration
- [ ] Maps API key working
- [ ] User location detection
- [ ] Location markers display
- [ ] Directions open correctly
- [ ] Map interactions smooth

### Component Integration
- [ ] All components render without errors
- [ ] State management works across components
- [ ] Event handling between components
- [ ] Context providers functioning
- [ ] Hooks provide correct data

### Data Flow Validation
- [ ] User location → Map centering
- [ ] Location selection → Panel updates
- [ ] Rating submission → Score calculation
- [ ] Historical data → Time recommendations
- [ ] Error states → User feedback

## Success Criteria

The integration is considered successful when:

1. **All manual tests pass** without critical errors
2. **User workflows complete** from start to finish
3. **Responsive design works** on all target devices
4. **Performance is acceptable** (< 3s initial load)
5. **Error handling is graceful** with user-friendly messages
6. **Data persistence works** (ratings save and display)
7. **Real-time updates function** (scores update after rating)

## Common Issues and Solutions

### Issue: Map not loading
- **Solution**: Check Google Maps API key configuration
- **Check**: Browser console for API errors
- **Verify**: CORS settings allow Maps API

### Issue: Location permission denied
- **Solution**: Manual location entry should work
- **Check**: Geolocation service fallback
- **Verify**: Error messages are clear

### Issue: Ratings not saving
- **Solution**: Check backend API connection
- **Check**: Network tab for failed requests
- **Verify**: Database connection working

### Issue: Responsive layout broken
- **Solution**: Check Tailwind CSS classes
- **Check**: CSS compilation working
- **Verify**: Breakpoints configured correctly

## Conclusion

This manual integration test validates that all components work together to provide a complete user experience for finding and rating lettuce freshness at Subway locations. The test covers all requirements from the specification and ensures the application is ready for production deployment.