#!/usr/bin/env node

/**
 * Location Issues Diagnostic Script
 * Diagnoses common problems with location lookup in the AIO container
 */

const https = require('https');
const fs = require('fs');

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

class LocationDiagnostic {
    constructor() {
        this.issues = [];
        this.solutions = [];
    }

    addIssue(issue, solution) {
        this.issues.push(issue);
        this.solutions.push(solution);
    }

    async checkEnvironmentFiles() {
        log(`\n${colors.bold}=== Checking Environment Configuration ===${colors.reset}`);
        
        const envFiles = ['.env', 'frontend/.env', 'frontend/.env.production', 'frontend/.env.staging'];
        let foundValidKey = false;
        
        for (const file of envFiles) {
            try {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    const lines = content.split('\n');
                    
                    log(`\n${colors.cyan}Checking ${file}:${colors.reset}`);
                    
                    for (const line of lines) {
                        if (line.includes('GOOGLE_MAPS_API_KEY') || line.includes('VITE_GOOGLE_MAPS_API_KEY')) {
                            const [key, value] = line.split('=');
                            if (value && value.trim() && 
                                !value.includes('your_') && 
                                !value.includes('test_key') &&
                                value.length > 20) {
                                log(`  ${colors.green}✓ ${key.trim()}=${value.substring(0, 15)}...${colors.reset}`);
                                foundValidKey = true;
                            } else {
                                log(`  ${colors.red}✗ ${key.trim()}=${value || 'NOT_SET'}${colors.reset}`);
                            }
                        }
                    }
                } else {
                    log(`${colors.yellow}⚠ ${file} not found${colors.reset}`);
                }
            } catch (error) {
                log(`${colors.red}✗ Error reading ${file}: ${error.message}${colors.reset}`);
            }
        }
        
        if (!foundValidKey) {
            this.addIssue(
                'No valid Google Maps API key found in environment files',
                'Set VITE_GOOGLE_MAPS_API_KEY in your .env file with a real API key'
            );
        }
    }

    async checkDockerConfiguration() {
        log(`\n${colors.bold}=== Checking Docker Configuration ===${colors.reset}`);
        
        // Check if using AIO container
        if (fs.existsSync('Dockerfile.aio')) {
            log(`${colors.yellow}⚠ Using AIO Docker container${colors.reset}`);
            
            const dockerfileContent = fs.readFileSync('Dockerfile.aio', 'utf8');
            
            // Check if frontend is built at build time
            if (dockerfileContent.includes('npm run build')) {
                log(`${colors.red}✗ Frontend is built at Docker build time${colors.reset}`);
                this.addIssue(
                    'AIO container builds frontend at build time, not runtime',
                    'Environment variables must be available during docker build, not just docker run'
                );
            }
            
            // Check if environment variables are passed to build
            if (!dockerfileContent.includes('ARG VITE_GOOGLE_MAPS_API_KEY')) {
                log(`${colors.red}✗ Google Maps API key not passed as build argument${colors.reset}`);
                this.addIssue(
                    'VITE_GOOGLE_MAPS_API_KEY not available during Docker build',
                    'Add ARG VITE_GOOGLE_MAPS_API_KEY to Dockerfile.aio and pass --build-arg during build'
                );
            }
        }
        
        // Check docker-compose files
        const composeFiles = ['docker-compose.yml', 'docker-compose.prod.yml'];
        
        for (const file of composeFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                log(`\n${colors.cyan}Checking ${file}:${colors.reset}`);
                
                if (content.includes('VITE_GOOGLE_MAPS_API_KEY')) {
                    log(`  ${colors.green}✓ VITE_GOOGLE_MAPS_API_KEY configured${colors.reset}`);
                } else {
                    log(`  ${colors.red}✗ VITE_GOOGLE_MAPS_API_KEY not found${colors.reset}`);
                }
            }
        }
    }

    async checkNetworkConnectivity() {
        log(`\n${colors.bold}=== Checking Network Connectivity ===${colors.reset}`);
        
        const testUrls = [
            'https://maps.googleapis.com',
            'https://www.google.com'
        ];
        
        for (const url of testUrls) {
            try {
                await this.testConnection(url);
                log(`${colors.green}✓ ${url} - Reachable${colors.reset}`);
            } catch (error) {
                log(`${colors.red}✗ ${url} - ${error.message}${colors.reset}`);
                this.addIssue(
                    `Cannot reach ${url}`,
                    'Check firewall settings and network connectivity from Docker container'
                );
            }
        }
    }

    async testConnection(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, { timeout: 5000 }, (res) => {
                resolve(res.statusCode);
            });
            
            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Connection timeout'));
            });
        });
    }

    async checkContainerLogs() {
        log(`\n${colors.bold}=== Container Log Analysis ===${colors.reset}`);
        
        log(`${colors.cyan}To check container logs, run:${colors.reset}`);
        log(`  docker logs subway-lettuce-aio 2>&1 | grep -i "google\\|maps\\|api"`);
        log(`  docker logs subway-lettuce-aio 2>&1 | grep -i "error\\|fail"`);
        
        log(`\n${colors.cyan}To check if Google Maps API is loaded in browser:${colors.reset}`);
        log(`  1. Open browser developer tools (F12)`);
        log(`  2. Go to Console tab`);
        log(`  3. Type: window.google`);
        log(`  4. Should show Google Maps API object, not undefined`);
    }

    generateSolutions() {
        log(`\n${colors.bold}=== Issues Found and Solutions ===${colors.reset}`);
        
        if (this.issues.length === 0) {
            log(`${colors.green}✓ No configuration issues detected!${colors.reset}`);
            log(`\n${colors.cyan}If you're still having issues:${colors.reset}`);
            log(`1. Check browser console for JavaScript errors`);
            log(`2. Verify your Google Cloud project has the APIs enabled`);
            log(`3. Check API key restrictions in Google Cloud Console`);
            return;
        }
        
        this.issues.forEach((issue, index) => {
            log(`\n${colors.red}Issue ${index + 1}: ${issue}${colors.reset}`);
            log(`${colors.green}Solution: ${this.solutions[index]}${colors.reset}`);
        });
        
        log(`\n${colors.bold}=== Quick Fix for AIO Container ===${colors.reset}`);
        log(`${colors.cyan}If using the AIO Docker container:${colors.reset}`);
        log(`\n1. Update your .env file with a real Google Maps API key:`);
        log(`   VITE_GOOGLE_MAPS_API_KEY=YOUR_REAL_API_KEY_HERE`);
        log(`\n2. Rebuild the AIO container with the API key:`);
        log(`   docker build -f Dockerfile.aio \\`);
        log(`     --build-arg VITE_GOOGLE_MAPS_API_KEY=YOUR_REAL_API_KEY_HERE \\`);
        log(`     -t subway-lettuce-aio .`);
        log(`\n3. Or use the regular docker-compose setup instead:`);
        log(`   docker-compose up -d`);
    }

    async runDiagnostics() {
        log(`${colors.bold}${colors.blue}Subway Lettuce Tracker - Location Issues Diagnostic${colors.reset}`);
        log(`${colors.blue}===================================================${colors.reset}`);
        
        await this.checkEnvironmentFiles();
        await this.checkDockerConfiguration();
        await this.checkNetworkConnectivity();
        await this.checkContainerLogs();
        
        this.generateSolutions();
        
        log(`\n${colors.bold}=== Additional Debugging Commands ===${colors.reset}`);
        log(`${colors.cyan}Test your API key:${colors.reset}`);
        log(`  node quick-google-api-test.js YOUR_API_KEY`);
        log(`\n${colors.cyan}Check container environment:${colors.reset}`);
        log(`  docker exec -it subway-lettuce-aio env | grep GOOGLE`);
        log(`\n${colors.cyan}Check if frontend files contain API key:${colors.reset}`);
        log(`  docker exec -it subway-lettuce-aio grep -r "VITE_GOOGLE_MAPS_API_KEY" /app/frontend/`);
    }
}

// Run diagnostics
const diagnostic = new LocationDiagnostic();
diagnostic.runDiagnostics().catch(error => {
    console.error(`${colors.red}Diagnostic error: ${error.message}${colors.reset}`);
    process.exit(1);
});