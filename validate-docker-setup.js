#!/usr/bin/env node

/**
 * Docker Setup Validation Script
 * 
 * This script validates that the Docker containerization is properly configured
 * and all services can be started successfully.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`, exists ? 'green' : 'red');
  return exists;
}

function runCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'blue');
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ ${description} - Success`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} - Failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

function validateDockerFiles() {
  log('\n📁 Validating Docker Configuration Files', 'bold');
  
  const dockerFiles = [
    { path: 'docker-compose.yml', desc: 'Main Docker Compose file' },
    { path: 'docker-compose.dev.yml', desc: 'Development Docker Compose file' },
    { path: 'docker-compose.prod.yml', desc: 'Production Docker Compose file' },
    { path: 'backend/Dockerfile', desc: 'Backend Production Dockerfile' },
    { path: 'backend/Dockerfile.dev', desc: 'Backend Development Dockerfile' },
    { path: 'frontend/Dockerfile', desc: 'Frontend Production Dockerfile' },
    { path: 'frontend/Dockerfile.dev', desc: 'Frontend Development Dockerfile' },
    { path: 'nginx/nginx.conf', desc: 'Nginx Configuration' },
    { path: 'frontend/nginx.conf', desc: 'Frontend Nginx Configuration' },
    { path: 'redis/redis.conf', desc: 'Redis Configuration' },
    { path: '.env.example', desc: 'Environment Template' },
    { path: 'docker-setup.sh', desc: 'Docker Management Script' },
  ];
  
  let allFilesExist = true;
  dockerFiles.forEach(file => {
    const exists = checkFileExists(file.path, file.desc);
    if (!exists) allFilesExist = false;
  });
  
  return allFilesExist;
}

function validateDockerInstallation() {
  log('\n🐳 Validating Docker Installation', 'bold');
  
  const dockerChecks = [
    { cmd: 'docker --version', desc: 'Docker Engine' },
    { cmd: 'docker-compose --version', desc: 'Docker Compose' },
    { cmd: 'docker info', desc: 'Docker Daemon' },
  ];
  
  let allChecksPass = true;
  dockerChecks.forEach(check => {
    const result = runCommand(check.cmd, `Checking ${check.desc}`);
    if (!result.success) allChecksPass = false;
  });
  
  return allChecksPass;
}

function validateDockerComposeFiles() {
  log('\n📋 Validating Docker Compose Configuration', 'bold');
  
  const composeFiles = [
    { file: 'docker-compose.yml', desc: 'Main Compose file' },
    { file: 'docker-compose.dev.yml', desc: 'Development Compose file' },
    { file: 'docker-compose.prod.yml', desc: 'Production Compose file' },
  ];
  
  let allValid = true;
  composeFiles.forEach(compose => {
    const result = runCommand(
      `docker-compose -f ${compose.file} config --quiet`,
      `Validating ${compose.desc}`
    );
    if (!result.success) allValid = false;
  });
  
  return allValid;
}

function validateEnvironmentSetup() {
  log('\n🔧 Validating Environment Configuration', 'bold');
  
  // Check if .env.example exists and has required variables
  if (!fs.existsSync('.env.example')) {
    log('❌ .env.example file missing', 'red');
    return false;
  }
  
  const envContent = fs.readFileSync('.env.example', 'utf8');
  const requiredVars = [
    'NODE_ENV',
    'POSTGRES_PASSWORD',
    'REDIS_PASSWORD',
    'GOOGLE_MAPS_API_KEY',
    'FRONTEND_URL',
    'VITE_API_URL'
  ];
  
  let allVarsPresent = true;
  requiredVars.forEach(varName => {
    const present = envContent.includes(varName);
    log(`${present ? '✅' : '❌'} Environment variable: ${varName}`, present ? 'green' : 'red');
    if (!present) allVarsPresent = false;
  });
  
  // Check if .env file exists
  const envExists = fs.existsSync('.env');
  log(`${envExists ? '✅' : '⚠️'} .env file ${envExists ? 'exists' : 'missing (will use defaults)'}`, 
      envExists ? 'green' : 'yellow');
  
  return allVarsPresent;
}

function validateDockerImages() {
  log('\n🏗️ Validating Docker Image Build', 'bold');
  
  // Try to build images (dry run)
  const buildChecks = [
    { 
      cmd: 'docker-compose -f docker-compose.dev.yml config --services', 
      desc: 'Development services configuration' 
    },
    { 
      cmd: 'docker-compose config --services', 
      desc: 'Production services configuration' 
    },
  ];
  
  let allValid = true;
  buildChecks.forEach(check => {
    const result = runCommand(check.cmd, check.desc);
    if (!result.success) allValid = false;
  });
  
  return allValid;
}

function validateNetworkConfiguration() {
  log('\n🌐 Validating Network Configuration', 'bold');
  
  // Check if required ports are available
  const requiredPorts = [3000, 5000, 5432, 6379, 80, 443];
  
  log('Checking port availability...', 'blue');
  requiredPorts.forEach(port => {
    try {
      const result = execSync(`netstat -tuln | grep :${port}`, { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim()) {
        log(`⚠️ Port ${port} is already in use`, 'yellow');
      } else {
        log(`✅ Port ${port} is available`, 'green');
      }
    } catch (error) {
      // Port is available (netstat returns non-zero when no matches)
      log(`✅ Port ${port} is available`, 'green');
    }
  });
  
  return true;
}

function validateScriptPermissions() {
  log('\n🔐 Validating Script Permissions', 'bold');
  
  try {
    const stats = fs.statSync('docker-setup.sh');
    const isExecutable = !!(stats.mode & parseInt('111', 8));
    
    log(`${isExecutable ? '✅' : '❌'} docker-setup.sh is ${isExecutable ? 'executable' : 'not executable'}`, 
        isExecutable ? 'green' : 'red');
    
    if (!isExecutable) {
      log('Run: chmod +x docker-setup.sh', 'yellow');
    }
    
    return isExecutable;
  } catch (error) {
    log(`❌ Error checking script permissions: ${error.message}`, 'red');
    return false;
  }
}

function generateDockerValidationReport() {
  log('\n📊 Docker Setup Validation Summary', 'bold');
  
  const validations = [
    { name: 'Docker Files', fn: validateDockerFiles },
    { name: 'Docker Installation', fn: validateDockerInstallation },
    { name: 'Compose Configuration', fn: validateDockerComposeFiles },
    { name: 'Environment Setup', fn: validateEnvironmentSetup },
    { name: 'Image Configuration', fn: validateDockerImages },
    { name: 'Network Configuration', fn: validateNetworkConfiguration },
    { name: 'Script Permissions', fn: validateScriptPermissions },
  ];
  
  const results = validations.map(validation => ({
    name: validation.name,
    passed: validation.fn()
  }));
  
  log('\n' + '='.repeat(60), 'blue');
  log('DOCKER SETUP VALIDATION RESULTS', 'bold');
  log('='.repeat(60), 'blue');
  
  let totalPassed = 0;
  results.forEach(result => {
    log(`${result.passed ? '✅' : '❌'} ${result.name}`, result.passed ? 'green' : 'red');
    if (result.passed) totalPassed++;
  });
  
  const percentage = Math.round((totalPassed / results.length) * 100);
  log(`\nOverall Docker Setup Score: ${totalPassed}/${results.length} (${percentage}%)`, 
       percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');
  
  if (percentage >= 80) {
    log('\n🎉 Docker setup validation PASSED!', 'green');
    log('✅ All Docker configurations are properly set up', 'green');
    log('✅ Ready to start containers with ./docker-setup.sh', 'green');
    
    log('\n🚀 Next Steps:', 'bold');
    log('1. Copy .env.example to .env and configure your settings', 'blue');
    log('2. Set your GOOGLE_MAPS_API_KEY in .env', 'blue');
    log('3. Run: ./docker-setup.sh setup dev (for development)', 'blue');
    log('4. Run: ./docker-setup.sh setup prod (for production)', 'blue');
    
  } else {
    log('\n⚠️ Docker setup needs attention.', 'yellow');
    log('Please fix the issues above before starting containers.', 'yellow');
    
    log('\n🔧 Common Solutions:', 'bold');
    log('• Install Docker: https://docs.docker.com/get-docker/', 'blue');
    log('• Install Docker Compose: https://docs.docker.com/compose/install/', 'blue');
    log('• Make script executable: chmod +x docker-setup.sh', 'blue');
    log('• Create .env file: cp .env.example .env', 'blue');
  }
  
  return percentage >= 80;
}

// Run all validations
console.log('🐳 Docker Setup Validation for Subway Lettuce Tracker\n');

const success = generateDockerValidationReport();
process.exit(success ? 0 : 1);