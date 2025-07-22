#!/usr/bin/env node

/**
 * Google API Key Validation Script
 * Tests Google Maps and Places API functionality for the AIO app
 */

const https = require('https');
const fs = require('fs');

// Simple .env file parser
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
        
        // Set environment variables
        Object.keys(envVars).forEach(key => {
            if (!process.env[key]) {
                process.env[key] = envVars[key];
            }
        });
    } catch (error) {
        console.log('No .env file found or error reading it, using system environment variables only');
    }
}

// Load environment variables
loadEnvFile();

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

class GoogleAPITester {
    constructor() {
        // Try to get API key from various environment variables
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY || 
                     process.env.VITE_GOOGLE_MAPS_API_KEY || 
                     process.env.GOOGLE_API_KEY;
        
        this.testResults = [];
    }

    log(message, color = colors.reset) {
        console.log(`${color}${message}${colors.reset}`);
    }

    logResult(test, status, details = '') {
        const statusColor = status === 'PASS' ? colors.green : 
                           status === 'FAIL' ? colors.red : colors.yellow;
        this.log(`${statusColor}[${status}]${colors.reset} ${test}${details ? ': ' + details : ''}`);
        this.testResults.push({ test, status, details });
    }

    async makeRequest(url) {
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

    async testAPIKeyBasic() {
        this.log(`\n${colors.bold}=== Testing API Key Configuration ===${colors.reset}`);
        
        if (!this.apiKey) {
            this.logResult('API Key Configuration', 'FAIL', 'No Google Maps API key found in environment variables');
            return false;
        }

        if (this.apiKey === 'your_google_maps_api_key_here' || 
            this.apiKey === 'test_key_for_development') {
            this.logResult('API Key Configuration', 'FAIL', 'Using placeholder/test API key');
            return false;
        }

        this.logResult('API Key Configuration', 'PASS', `Key found: ${this.apiKey.substring(0, 10)}...`);
        return true;
    }

    async testGeocodingAPI() {
        this.log(`\n${colors.bold}=== Testing Geocoding API ===${colors.reset}`);
        
        const testAddress = 'Times Square, New York, NY';
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${this.apiKey}`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (response.statusCode !== 200) {
                this.logResult('Geocoding API', 'FAIL', `HTTP ${response.statusCode}`);
                return false;
            }

            const data = response.data;
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                this.logResult('Geocoding API', 'PASS', `Found coordinates: ${location.lat}, ${location.lng}`);
                return true;
            } else {
                this.logResult('Geocoding API', 'FAIL', `API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            this.logResult('Geocoding API', 'FAIL', `Network error: ${error.message}`);
            return false;
        }
    }

    async testPlacesAPI() {
        this.log(`\n${colors.bold}=== Testing Places API ===${colors.reset}`);
        
        // Test Places Nearby Search (commonly used for finding Subway locations)
        const location = '40.7580,-73.9855'; // Times Square coordinates
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=1000&type=restaurant&keyword=subway&key=${this.apiKey}`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (response.statusCode !== 200) {
                this.logResult('Places API (Nearby Search)', 'FAIL', `HTTP ${response.statusCode}`);
                return false;
            }

            const data = response.data;
            
            if (data.status === 'OK') {
                this.logResult('Places API (Nearby Search)', 'PASS', `Found ${data.results.length} places`);
                return true;
            } else {
                this.logResult('Places API (Nearby Search)', 'FAIL', `API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            this.logResult('Places API (Nearby Search)', 'FAIL', `Network error: ${error.message}`);
            return false;
        }
    }

    async testPlacesTextSearch() {
        this.log(`\n${colors.bold}=== Testing Places Text Search ===${colors.reset}`);
        
        const query = 'Subway restaurant near Times Square New York';
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (response.statusCode !== 200) {
                this.logResult('Places API (Text Search)', 'FAIL', `HTTP ${response.statusCode}`);
                return false;
            }

            const data = response.data;
            
            if (data.status === 'OK') {
                this.logResult('Places API (Text Search)', 'PASS', `Found ${data.results.length} places`);
                return true;
            } else {
                this.logResult('Places API (Text Search)', 'FAIL', `API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            this.logResult('Places API (Text Search)', 'FAIL', `Network error: ${error.message}`);
            return false;
        }
    }

    async testMapsJavaScriptAPI() {
        this.log(`\n${colors.bold}=== Testing Maps JavaScript API ===${colors.reset}`);
        
        // Test if the API key works with Maps JavaScript API by checking a simple request
        const url = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (response.statusCode === 200) {
                this.logResult('Maps JavaScript API', 'PASS', 'API key accepted');
                return true;
            } else {
                this.logResult('Maps JavaScript API', 'FAIL', `HTTP ${response.statusCode}`);
                return false;
            }
        } catch (error) {
            this.logResult('Maps JavaScript API', 'FAIL', `Network error: ${error.message}`);
            return false;
        }
    }

    checkAPIPermissions() {
        this.log(`\n${colors.bold}=== API Permissions Recommendations ===${colors.reset}`);
        
        const requiredAPIs = [
            'Maps JavaScript API',
            'Places API',
            'Geocoding API',
            'Maps Static API (optional)'
        ];

        this.log(`${colors.yellow}Ensure these APIs are enabled in Google Cloud Console:${colors.reset}`);
        requiredAPIs.forEach(api => {
            this.log(`  • ${api}`);
        });

        this.log(`\n${colors.yellow}API Key Restrictions (recommended):${colors.reset}`);
        this.log(`  • HTTP referrers: Add your domain(s)`);
        this.log(`  • API restrictions: Enable only the APIs listed above`);
    }

    generateReport() {
        this.log(`\n${colors.bold}=== Test Summary ===${colors.reset}`);
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const warnings = this.testResults.filter(r => r.status === 'WARN').length;

        this.log(`${colors.green}Passed: ${passed}${colors.reset}`);
        this.log(`${colors.red}Failed: ${failed}${colors.reset}`);
        if (warnings > 0) {
            this.log(`${colors.yellow}Warnings: ${warnings}${colors.reset}`);
        }

        if (failed === 0) {
            this.log(`\n${colors.green}${colors.bold}✓ All tests passed! Your Google API key is working correctly.${colors.reset}`);
        } else {
            this.log(`\n${colors.red}${colors.bold}✗ Some tests failed. Check your API key and enabled services.${colors.reset}`);
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'Not found',
            results: this.testResults,
            summary: { passed, failed, warnings }
        };

        fs.writeFileSync('google-api-test-report.json', JSON.stringify(report, null, 2));
        this.log(`\n${colors.blue}Detailed report saved to: google-api-test-report.json${colors.reset}`);
    }

    async runAllTests() {
        this.log(`${colors.bold}${colors.blue}Google Maps API Key Validation${colors.reset}`);
        this.log(`${colors.blue}================================${colors.reset}`);

        const hasValidKey = await this.testAPIKeyBasic();
        
        if (!hasValidKey) {
            this.log(`\n${colors.red}Cannot proceed with API tests - invalid or missing API key${colors.reset}`);
            this.checkAPIPermissions();
            this.generateReport();
            return;
        }

        // Run all API tests
        await this.testGeocodingAPI();
        await this.testPlacesAPI();
        await this.testPlacesTextSearch();
        await this.testMapsJavaScriptAPI();

        this.checkAPIPermissions();
        this.generateReport();
    }
}

// Run the tests
const tester = new GoogleAPITester();
tester.runAllTests().catch(error => {
    console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
    process.exit(1);
});