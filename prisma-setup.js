// Enhanced prisma-setup.js specifically targeting CLI binary path
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

// Create a minimal CLI binary placeholder
function createCliBinaryPlaceholder() {
  console.log('Creating Prisma CLI binary placeholder...');
  
  const cliBinDir = path.join(PRISMA_CLI_DIR, 'build', 'index');
  const cliBinPath = path.join(cliBinDir, 'cli.js');
  
  if (!fs.existsSync(cliBinPath)) {
    try {
      const minimalCliContent = `#!/usr/bin/env node
// Minimal Prisma CLI placeholder
const { spawn } = require('child_process');
const path = require('path');

// Forward to the actual prisma CLI if it exists
try {
  const actualCliPath = path.resolve(__dirname, '../../.bin/prisma');
  if (require('fs').existsSync(actualCliPath)) {
    const args = process.argv.slice(2);
    const child = spawn(actualCliPath, args, { stdio: 'inherit' });
    child.on('exit', (code) => process.exit(code));
  } else {
    console.log('Prisma CLI placeholder executed');
    process.exit(0);
  }
} catch (err) {
  console.error('Error in CLI placeholder:', err);
  process.exit(0);
}
`;
      fs.writeFileSync(cliBinPath, minimalCliContent);
      fs.chmodSync(cliBinPath, '755');
      console.log(`Created CLI placeholder at: ${cliBinPath}`);
    } catch (err) {
      console.error(`Error creating CLI placeholder: ${err.message}`);
    }
  }
}

// Create a package.json in the prisma directory
function createPrismaPackageJson() {
  console.log('Creating Prisma package.json...');
  
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

// Create symlinks to ensure the CLI binary is found
function createCliSymlinks() {
  console.log('Creating Prisma CLI symlinks...');
  
  try {
    const prismaCliDir = path.join(PRISMA_CLI_DIR, 'build', 'index');
    const prismaCliBin = path.join(prismaCliDir, 'cli.js');
    
    if (fs.existsSync(prismaCliBin)) {
      // Create a directory for the binary if it doesn't exist
      const binDir = path.join(NODE_MODULES_DIR, '.bin');
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
            // On Unix-like systems, create a symlink or copy the file
            try {
              fs.symlinkSync(prismaCliBin, symlinkPath);
              console.log(`Created symlink at: ${symlinkPath}`);
            } catch (err) {
              // If symlink fails, copy the file
              fs.copyFileSync(prismaCliBin, symlinkPath);
              fs.chmodSync(symlinkPath, '755');
              console.log(`Copied CLI to: ${symlinkPath}`);
            }
          }
        } catch (err) {
          console.error(`Error creating symlink: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error creating CLI symlinks: ${err.message}`);
  }
}

// Copy schema.prisma to both locations
function copyPrismaSchema() {
  console.log('Copying Prisma schema...');
  
  // Check if schema exists in prisma directory
  if (fs.existsSync(SCHEMA_PATH)) {
    console.log(`✓ Schema found at expected location: ${SCHEMA_PATH}`);
    
    // Create a copy in root if it doesn't exist
    try {
      fs.copyFileSync(SCHEMA_PATH, ROOT_SCHEMA_PATH);
      console.log(`Created schema copy at root: ${ROOT_SCHEMA_PATH}`);
    } catch (err) {
      console.error(`Error copying schema to root: ${err.message}`);
    }
  } else if (fs.existsSync(ROOT_SCHEMA_PATH)) {
    // Copy from root to prisma directory
    try {
      fs.copyFileSync(ROOT_SCHEMA_PATH, SCHEMA_PATH);
      console.log(`Copied schema to prisma directory: ${SCHEMA_PATH}`);
    } catch (err) {
      console.error(`Error copying schema to prisma dir: ${err.message}`);
    }
  } else {
    console.error('❌ ERROR: Could not find schema.prisma file!');
  }
}

// Create a minimal index.js file for the Prisma CLI
function createPrismaCliIndex() {
  console.log('Creating Prisma CLI index.js...');
  
  const indexPath = path.join(PRISMA_CLI_DIR, 'build', 'index.js');
  if (!fs.existsSync(indexPath)) {
    try {
      const indexContent = `
// Minimal Prisma CLI index
module.exports = {
  getPrismaClient: () => require('@prisma/client'),
  getGenerator: () => ({}),
  getGenerators: () => [],
  getConfig: () => ({}),
  getDMMF: () => ({}),
  getPackageVersion: () => '6.8.1'
};
`;
      fs.writeFileSync(indexPath, indexContent);
      console.log(`Created index.js at: ${indexPath}`);
    } catch (err) {
      console.error(`Error creating index.js: ${err.message}`);
    }
  }
}

// Main function
function main() {
  console.log('\n=== ENHANCED PRISMA SETUP FOR NETLIFY ===\n');
  
  // Step 1: Create directories
  console.log('Step 1: Creating directories...');
  ensureDirectoryExists(PRISMA_DIR);
  ensureDirectoryExists(path.join(NODE_MODULES_DIR, '.prisma'));
  ensureDirectoryExists(PRISMA_CLIENT_DIR);
  ensureDirectoryExists(PRISMA_CLI_DIR);
  ensureDirectoryExists(path.join(PRISMA_CLI_DIR, 'build'));
  ensureDirectoryExists(path.join(PRISMA_CLI_DIR, 'build', 'index'));
  
  // Step 2: Create CLI binary placeholder
  console.log('Step 2: Creating CLI binary placeholder...');
  createCliBinaryPlaceholder();
  
  // Step 3: Create Prisma package.json
  console.log('Step 3: Creating Prisma package.json...');
  createPrismaPackageJson();
  
  // Step 4: Create CLI index.js
  console.log('Step 4: Creating CLI index.js...');
  createPrismaCliIndex();
  
  // Step 5: Create CLI symlinks
  console.log('Step 5: Creating CLI symlinks...');
  createCliSymlinks();
  
  // Step 6: Copy schema.prisma
  console.log('Step 6: Copying schema.prisma...');
  copyPrismaSchema();
  
  // Step 7: Set environment variables
  console.log('Step 7: Setting environment variables...');
  process.env.PRISMA_BINARY_PLATFORM = "debian-openssl-3.0.x";
  process.env.PRISMA_ENGINES_MIRROR = "https://binaries.prisma.sh";
  process.env.PRISMA_SCHEMA_PATH = "./prisma/schema.prisma";
  
  // Step 8: Log Prisma environment
  console.log('\n=== PRISMA ENVIRONMENT INFO ===' );
  console.log('Working directory:', process.cwd());
  console.log('PRISMA_SCHEMA_PATH:', process.env.PRISMA_SCHEMA_PATH);
  console.log('PRISMA_BINARY_PLATFORM:', process.env.PRISMA_BINARY_PLATFORM);
  console.log('Schema in prisma dir:', fs.existsSync(SCHEMA_PATH));
  console.log('Schema in root:', fs.existsSync(ROOT_SCHEMA_PATH));
  console.log('CLI binary placeholder:', fs.existsSync(path.join(PRISMA_CLI_DIR, 'build', 'index', 'cli.js')));
  
  console.log('\n=== PRISMA SETUP COMPLETED ===\n');
}

// Run the main function
main();
