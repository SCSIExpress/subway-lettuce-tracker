#!/usr/bin/env node

/**
 * Quick Google API Key Test
 * Usage: node quick-google-api-test.js YOUR_API_KEY_HERE
 */

const https = require('https');

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        }).on('error', reject);
    });
}

async function quickTest(apiKey) {
    log(`${colors.bold}${colors.blue}Quick Google API Test${colors.reset}`);
    log(`${colors.blue}=====================${colors.reset}\n`);
    
    log(`Testing API Key: ${apiKey.substring(0, 10)}...`);
    
    // Test Geocoding API with a simple address
    log(`\n${colors.yellow}Testing Geocoding API...${colors.reset}`);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=${apiKey}`;
    
    try {
        const response = await makeRequest(geocodeUrl);
        
        if (response.data.status === 'OK') {
            log(`${colors.green}✓ Geocoding API: Working${colors.reset}`);
        } else {
            log(`${colors.red}✗ Geocoding API: ${response.data.status} - ${response.data.error_message || 'Unknown error'}${colors.reset}`);
        }
    } catch (error) {
        log(`${colors.red}✗ Geocoding API: Network error - ${error.message}${colors.reset}`);
    }
    
    // Test Places API
    log(`\n${colors.yellow}Testing Places API...${colors.reset}`);
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurant&key=${apiKey}`;
    
    try {
        const response = await makeRequest(placesUrl);
        
        if (response.data.status === 'OK') {
            log(`${colors.green}✓ Places API: Working${colors.reset}`);
        } else {
            log(`${colors.red}✗ Places API: ${response.data.status} - ${response.data.error_message || 'Unknown error'}${colors.reset}`);
        }
    } catch (error) {
        log(`${colors.red}✗ Places API: Network error - ${error.message}${colors.reset}`);
    }
    
    log(`\n${colors.blue}Test complete!${colors.reset}`);
}

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
    log(`${colors.red}Usage: node quick-google-api-test.js YOUR_API_KEY_HERE${colors.reset}`);
    process.exit(1);
}

quickTest(apiKey).catch(error => {
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
});