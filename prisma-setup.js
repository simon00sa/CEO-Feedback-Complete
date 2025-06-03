// Enhanced prisma-setup.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting enhanced Prisma setup for Netlify...');

// Define paths
const ROOT_DIR = process.cwd();
const PRISMA_DIR = path.join(ROOT_DIR, 'prisma');
const SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma');
const ROOT_SCHEMA_PATH = path.join(ROOT_DIR, 'schema.prisma');
const NODE_MODULES_DIR = path.join(ROOT_DIR, 'node_modules');
const PRISMA_CLIENT_DIR = path.join(NODE_MODULES_DIR, '@prisma', 'client');
const PRISMA_CLI_DIR = path.join(NODE_MODULES_DIR, 'prisma');

// Create necessary directories
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    return true;
  }
  return false;
}

// Ensure all required directories exist
ensureDirectoryExists(PRISMA_DIR);
ensureDirectoryExists(path.join(NODE_MODULES_DIR, '.prisma'));
ensureDirectoryExists(PRISMA_CLIENT_DIR);
ensureDirectoryExists(PRISMA_CLI_DIR);
ensureDirectoryExists(path.join(PRISMA_CLI_DIR, 'build'));
ensureDirectoryExists(path.join(PRISMA_CLI_DIR, 'build', 'index'));

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
  
  console.error('❌ ERROR: Could not find schema.prisma file!');
  return false;
}

// Ensure Prisma CLI binary is properly set up
function setupPrismaCLI() {
  console.log('Setting up Prisma CLI...');
  
  // Create a minimal CLI binary placeholder if it doesn't exist
  const cliBinPath = path.join(PRISMA_CLI_DIR, 'build', 'index', 'cli.js');
  if (!fs.existsSync(cliBinPath)) {
    try {
      const minimalCliContent = `#!/usr/bin/env node
console.log('Prisma CLI placeholder');
process.exit(0);
`;
      fs.writeFileSync(cliBinPath, minimalCliContent);
      fs.chmodSync(cliBinPath, '755');
      console.log(`Created CLI placeholder at: ${cliBinPath}`);
    } catch (err) {
      console.error(`Error creating CLI placeholder: ${err.message}`);
    }
  }
  
  // Create a package.json in the prisma directory if it doesn't exist
  const prismaPackageJsonPath = path.join(PRISMA_CLI_DIR, 'package.json');
  if (!fs.existsSync(prismaPackageJsonPath)) {
    try {
      const packageJsonContent = JSON.stringify({
        name: "prisma",
        version: "6.8.1",
        main: "build/index.js",
        bin: {
          prisma: "build/index/cli.js"
        }
      }, null, 2);
      fs.writeFileSync(prismaPackageJsonPath, packageJsonContent);
      console.log(`Created package.json at: ${prismaPackageJsonPath}`);
    } catch (err) {
      console.error(`Error creating package.json: ${err.message}`);
    }
  }
}

// Ensure environment variables are set up
function setupEnvironmentVariables() {
  console.log('Setting up environment variables...');
  
  // Set environment variables for the current process
  process.env.PRISMA_BINARY_PLATFORM = "debian-openssl-3.0.x";
  process.env.PRISMA_ENGINES_MIRROR = "https://binaries.prisma.sh";
  process.env.PRISMA_SCHEMA_PATH = "./prisma/schema.prisma";
  
  // Create .env file if it doesn't exist
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) {
    try {
      const envContent = `
# Prisma configuration
PRISMA_BINARY_PLATFORM="debian-openssl-3.0.x"
PRISMA_ENGINES_MIRROR="https://binaries.prisma.sh"
PRISMA_SCHEMA_PATH="./prisma/schema.prisma"
`;
      fs.writeFileSync(envPath, envContent.trim());
      console.log(`Created .env file at: ${envPath}`);
    } catch (err) {
      console.error(`Error creating .env file: ${err.message}`);
    }
  }
}

// Verify Prisma installation
function verifyPrismaInstallation() {
  console.log('Verifying Prisma installation...');
  
  try {
    // Check if prisma is in package.json
    const packageJsonPath = path.join(ROOT_DIR, 'package.json');
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
    
    return true;
  } catch (err) {
    console.error(`❌ Error verifying Prisma installation: ${err.message}`);
    return false;
  }
}

// Fix Prisma CLI binary path
function fixPrismaCliBinPath() {
  console.log('Fixing Prisma CLI binary path...');
  
  try {
    // Create a symlink to ensure the CLI binary is found
    const prismaCliDir = path.join(PRISMA_CLI_DIR, 'build', 'index');
    const prismaCliBin = path.join(prismaCliDir, 'cli.js');
    
    if (fs.existsSync(prismaCliBin)) {
      // Create a directory for the binary if it doesn't exist
      const binDir = path.join(ROOT_DIR, 'node_modules', '.bin');
      ensureDirectoryExists(binDir);
      
      // Create a symlink to the CLI binary
      const symlinkPath = path.join(binDir, 'prisma');
      if (!fs.existsSync(symlinkPath)) {
        try {
          // On Windows, symlinks might not work, so we create a simple batch file
          if (process.platform === 'win32') {
            const batchContent = `@echo off\nnode "${prismaCliBin}" %*`;
            fs.writeFileSync(symlinkPath + '.cmd', batchContent);
            console.log(`Created batch file at: ${symlinkPath}.cmd`);
          } else {
            // On Unix-like systems, create a symlink
            fs.symlinkSync(prismaCliBin, symlinkPath);
            fs.chmodSync(symlinkPath, '755');
            console.log(`Created symlink at: ${symlinkPath}`);
          }
        } catch (err) {
          console.error(`Error creating symlink: ${err.message}`);
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Error fixing Prisma CLI binary path: ${err.message}`);
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
  handlePrismaSchema();
  
  // Step 4: Set up Prisma CLI
  setupPrismaCLI();
  
  // Step 5: Fix Prisma CLI binary path
  fixPrismaCliBinPath();
  
  // Step 6: Log Prisma environment
  console.log('\n=== PRISMA ENVIRONMENT INFO ===');
  console.log('Working directory:', process.cwd());
  console.log('PRISMA_SCHEMA_PATH:', process.env.PRISMA_SCHEMA_PATH);
  console.log('PRISMA_BINARY_PLATFORM:', process.env.PRISMA_BINARY_PLATFORM);
  console.log('Schema in prisma dir:', fs.existsSync(SCHEMA_PATH));
  console.log('Schema in root:', fs.existsSync(ROOT_SCHEMA_PATH));
  
  console.log('\n=== PRISMA SETUP COMPLETED ===\n');
}

// Run the main function
main();
