// prisma-setup.js - Enhanced Prisma setup for Netlify builds
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting enhanced Prisma setup for Netlify...');

// Define paths
const PRISMA_DIR = path.join(process.cwd(), 'prisma');
const SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma');
const ROOT_SCHEMA_PATH = path.join(process.cwd(), 'schema.prisma');
const ENV_PATH = path.join(process.cwd(), '.env');
const ENV_PROD_PATH = path.join(process.cwd(), '.env.production');

// Create necessary directories
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    return true;
  }
  return false;
}

// Ensure Prisma directory exists
ensureDirectoryExists(PRISMA_DIR);
ensureDirectoryExists(path.join(process.cwd(), 'node_modules', '.prisma'));
ensureDirectoryExists(path.join(process.cwd(), 'node_modules', '@prisma', 'client'));

// Check and handle schema.prisma
function handlePrismaSchema() {
  console.log('Checking Prisma schema...');
  
  // Check if schema exists in prisma directory
  if (fs.existsSync(SCHEMA_PATH)) {
    console.log(`✓ Schema found at expected location: ${SCHEMA_PATH}`);
    
    // Create a copy in root if it doesn't exist
    if (!fs.existsSync(ROOT_SCHEMA_PATH)) {
      try {
        fs.copyFileSync(SCHEMA_PATH, ROOT_SCHEMA_PATH);
        console.log(`Created schema copy at root: ${ROOT_SCHEMA_PATH}`);
      } catch (err) {
        console.error(`Error copying schema to root: ${err.message}`);
      }
    }
    return true;
  } 
  
  // Check if schema exists in root
  if (fs.existsSync(ROOT_SCHEMA_PATH)) {
    console.log(`Found schema in root, copying to prisma directory...`);
    try {
      fs.copyFileSync(ROOT_SCHEMA_PATH, SCHEMA_PATH);
      console.log(`Copied schema to: ${SCHEMA_PATH}`);
      return true;
    } catch (err) {
      console.error(`Error copying schema to prisma dir: ${err.message}`);
    }
  }
  
  // Search for schema.prisma in other common locations
  const possibleLocations = [
    path.join(process.cwd(), 'src', 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'api', 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'db', 'schema.prisma'),
    path.join(process.cwd(), 'database', 'schema.prisma')
  ];
  
  for (const location of possibleLocations) {
    if (fs.existsSync(location)) {
      console.log(`Found schema at alternative location: ${location}`);
      try {
        fs.copyFileSync(location, SCHEMA_PATH);
        console.log(`Copied schema to: ${SCHEMA_PATH}`);
        
        // Also copy to root
        fs.copyFileSync(location, ROOT_SCHEMA_PATH);
        console.log(`Copied schema to root: ${ROOT_SCHEMA_PATH}`);
        
        return true;
      } catch (err) {
        console.error(`Error copying schema: ${err.message}`);
      }
    }
  }
  
  console.error('❌ ERROR: Could not find schema.prisma file anywhere!');
  return false;
}

// Ensure environment variables are set up
function setupEnvironmentVariables() {
  console.log('Setting up environment variables...');
  
  // Create minimal .env file if it doesn't exist
  if (!fs.existsSync(ENV_PATH)) {
    console.log('Creating minimal .env file...');
    const envContent = `
# Prisma configuration
PRISMA_BINARY_PLATFORM="debian-openssl-3.0.x"
PRISMA_ENGINES_MIRROR="https://binaries.prisma.sh"
PRISMA_SCHEMA_PATH="./prisma/schema.prisma"
`;
    fs.writeFileSync(ENV_PATH, envContent.trim());
    console.log('✓ Created .env file');
  } else {
    console.log('✓ .env file already exists');
    
    // Check if it has the necessary Prisma config
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    if (!envContent.includes('PRISMA_BINARY_PLATFORM')) {
      console.log('Adding Prisma configuration to .env file...');
      const additionalContent = `
# Prisma configuration
PRISMA_BINARY_PLATFORM="debian-openssl-3.0.x"
PRISMA_ENGINES_MIRROR="https://binaries.prisma.sh"
PRISMA_SCHEMA_PATH="./prisma/schema.prisma"
`;
      fs.appendFileSync(ENV_PATH, additionalContent);
      console.log('✓ Updated .env file with Prisma configuration');
    }
  }
  
  // Set environment variables for the current process
  process.env.PRISMA_BINARY_PLATFORM = "debian-openssl-3.0.x";
  process.env.PRISMA_ENGINES_MIRROR = "https://binaries.prisma.sh";
  process.env.PRISMA_SCHEMA_PATH = "./prisma/schema.prisma";
}

// Create a minimal schema if none exists
function createMinimalSchema() {
  console.log('Creating minimal schema.prisma file...');
  
  const minimalSchema = `
// This is a minimal schema.prisma file created during build
// Replace with your actual schema in the repository

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  binaryTargets   = ["native", "debian-openssl-3.0.x"]
}

// Define your models here
`;

  fs.writeFileSync(SCHEMA_PATH, minimalSchema.trim());
  fs.writeFileSync(ROOT_SCHEMA_PATH, minimalSchema.trim());
  console.log('✓ Created minimal schema.prisma files');
}

// Verify Prisma installation
function verifyPrismaInstallation() {
  console.log('Verifying Prisma installation...');
  
  try {
    // Check if prisma is in package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const hasPrismaClient = packageJson.dependencies && packageJson.dependencies['@prisma/client'];
      const hasPrisma = packageJson.devDependencies && packageJson.devDependencies['prisma'];
      
      if (!hasPrismaClient || !hasPrisma) {
        console.warn('⚠️ Warning: Prisma dependencies missing from package.json');
      } else {
        console.log('✓ Prisma dependencies found in package.json');
      }
    }
    
    // Check if prisma binary is available
    try {
      execSync('npx prisma --version', { stdio: 'pipe' });
      console.log('✓ Prisma CLI is available');
    } catch (err) {
      console.warn('⚠️ Warning: Prisma CLI not available, attempting to install...');
      try {
        execSync('npm install -D prisma@6.8.1', { stdio: 'inherit' });
        console.log('✓ Installed Prisma CLI');
      } catch (installErr) {
        console.error(`❌ Error installing Prisma CLI: ${installErr.message}`);
      }
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Error verifying Prisma installation: ${err.message}`);
    return false;
  }
}

// Main function
function main() {
  console.log('\n=== ENHANCED PRISMA SETUP FOR NETLIFY ===\n');
  
  // Step 1: Verify Prisma installation
  verifyPrismaInstallation();
  
  // Step 2: Set up environment variables
  setupEnvironmentVariables();
  
  // Step 3: Handle schema.prisma
  const schemaFound = handlePrismaSchema();
  
  // Step 4: Create minimal schema if none found
  if (!schemaFound) {
    createMinimalSchema();
  }
  
  // Step 5: Log Prisma environment
  console.log('\n=== PRISMA ENVIRONMENT INFO ===');
  console.log('Working directory:', process.cwd());
  console.log('PRISMA_SCHEMA_PATH:', process.env.PRISMA_SCHEMA_PATH);
  console.log('PRISMA_BINARY_PLATFORM:', process.env.PRISMA_BINARY_PLATFORM);
  console.log('Schema in prisma dir:', fs.existsSync(SCHEMA_PATH));
  console.log('Schema in root:', fs.existsSync(ROOT_SCHEMA_PATH));
  console.log('Env file exists:', fs.existsSync(ENV_PATH));
  
  console.log('\n=== PRISMA SETUP COMPLETED ===\n');
}

// Run the main function
main();
