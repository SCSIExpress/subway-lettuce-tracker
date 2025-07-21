# Requirements Document

## Introduction

The Leaf App is a crowd-sourced web application that allows users to report and view the freshness status of lettuce at Subway restaurant locations. The app uses location-based services to help users find nearby Subway locations with the freshest lettuce, utilizing a rating system that prioritizes recent feedback. The application is designed with a bento box web design approach and will be built to transition into a mobile app in the future.

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a map of nearby Subway locations based on my current location, so that I can quickly identify restaurants near me.

#### Acceptance Criteria

1. WHEN the app loads THEN the system SHALL display a map centered on the user's current location
2. WHEN the user's location is available THEN the system SHALL show Subway locations as markers on the map
3. IF location permission is denied THEN the system SHALL prompt the user to enter their location manually
4. WHEN the map loads THEN the system SHALL display the closest Subway location in a slide-up panel at the bottom

### Requirement 2

**User Story:** As a user, I want to view a list of Subway locations ordered by distance from my location, so that I can see all nearby options with their lettuce freshness ratings.

#### Acceptance Criteria

1. WHEN the user pulls up the bottom slide panel THEN the system SHALL display an endless scrollable list of Subway locations
2. WHEN displaying locations THEN the system SHALL order them from nearest to furthest distance
3. WHEN showing each location THEN the system SHALL display the location in a rounded rectangle container
4. WHEN displaying location details THEN the system SHALL show the current lettuce freshness score (1-5 scale)
5. WHEN a location has been recently rated THEN the system SHALL display a visual indicator icon
6. WHEN showing location info THEN the system SHALL display the restaurant's open/close times

### Requirement 3

**User Story:** As a user, I want to rate the lettuce freshness at a Subway location, so that I can contribute to the crowd-sourced data and help other users.

#### Acceptance Criteria

1. WHEN the user selects a Subway location THEN the system SHALL display "Rate" and "Directions" buttons
2. WHEN the user clicks "Rate" THEN the system SHALL present a 1-5 rating scale for lettuce freshness
3. WHEN the user submits a rating THEN the system SHALL store the rating with a timestamp
4. WHEN displaying rating options THEN the system SHALL show how long since the last rating was submitted
5. WHEN historical data is available THEN the system SHALL display optimal freshness times (morning, lunch, afternoon)

### Requirement 4

**User Story:** As a user, I want to get directions to a selected Subway location, so that I can navigate to restaurants with fresh lettuce.

#### Acceptance Criteria

1. WHEN the user clicks "Directions" THEN the system SHALL integrate with Google Maps API
2. WHEN directions are requested THEN the system SHALL open navigation to the selected location
3. WHEN using Google Maps integration THEN the system SHALL pass the restaurant's exact address and coordinates

### Requirement 5

**User Story:** As a system administrator, I want the lettuce freshness scores to prioritize recent ratings, so that the data remains current and relevant.

#### Acceptance Criteria

1. WHEN calculating location scores THEN the system SHALL only consider the last 10 ratings for each location
2. WHEN multiple ratings exist THEN the system SHALL weight newer ratings more heavily than older ratings
3. WHEN no ratings exist THEN the system SHALL display "Not yet rated" or similar indicator
4. WHEN calculating weighted scores THEN the system SHALL update location scores in real-time as new ratings are submitted

### Requirement 6

**User Story:** As a user, I want the app to work responsively across different screen sizes, so that I can use it on various devices before the mobile app is available.

#### Acceptance Criteria

1. WHEN accessing the app on different devices THEN the system SHALL use responsive bento box web design
2. WHEN viewed on mobile browsers THEN the system SHALL maintain usability and readability
3. WHEN the slide-up panel is used THEN the system SHALL work smoothly on touch devices
4. WHEN displaying the map and list view THEN the system SHALL adapt layout for different screen orientations

### Requirement 7

**User Story:** As a user, I want to see historical patterns about lettuce freshness at locations, so that I can plan my visits during optimal times.

#### Acceptance Criteria

1. WHEN viewing a location's details THEN the system SHALL analyze historical rating patterns
2. WHEN sufficient data exists THEN the system SHALL indicate if lettuce is typically freshest in morning, lunch, or afternoon
3. WHEN displaying time-based recommendations THEN the system SHALL base suggestions on at least 20 historical ratings
4. IF insufficient data exists THEN the system SHALL display "Not enough data for time recommendations"