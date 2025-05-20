// prisma-fix.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Prisma fix script for Netlify...');

// Function to ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

try {
  // Step 1: Fix Prisma command state issues
  console.log('Fixing Prisma command state issues...');
  
  // Create Prisma global config directory if it doesn't exist
  const homeDir = process.env.HOME || '/opt/buildhome';
  const prismaConfigDir = path.join(homeDir, '.config', 'prisma');
  ensureDirectoryExists(prismaConfigDir);
  
  // Create additional Prisma config directory for migrations
  const prismaMigrationsDir = path.join(prismaConfigDir, 'migrations');
  ensureDirectoryExists(prismaMigrationsDir);
  
  // Create the nodejs-specific config directory
  const prismaNodejsDir = path.join(homeDir, '.config', 'prisma-nodejs');
  ensureDirectoryExists(prismaNodejsDir);
  
  // Create basic commands.json file to prevent "Invalid command state schema" error
  const commandsJsonPath = path.join(prismaNodejsDir, 'commands.json');
  if (!fs.existsSync(commandsJsonPath)) {
    console.log(`Creating commands.json at: ${commandsJsonPath}`);
    fs.writeFileSync(commandsJsonPath, JSON.stringify({
      "version": "6.8.1",
      "commands": {}
    }, null, 2));
  }
  
  // Step 2: Create correct .prisma directory in node_modules
  const prismaBinaryDir = path.join(process.cwd(), 'node_modules', '.prisma');
  ensureDirectoryExists(prismaBinaryDir);
  
  // Create engines_manifest.json if it doesn't exist
  const manifestPath = path.join(prismaBinaryDir, 'engines_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log(`Creating engines_manifest.json at: ${manifestPath}`);
    fs.writeFileSync(manifestPath, JSON.stringify({
      "version": "6.8.1"
    }, null, 2));
  }
  
  // Step 3: Verify or create schema.prisma
  const prismaDir = path.join(process.cwd(), 'prisma');
  ensureDirectoryExists(prismaDir);
  
  const schemaPath = path.join(prismaDir, 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.prisma not found! Creating a minimal version...');
    
    const minimalSchema = `generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  directUrl    = env("DIRECT_URL")
  relationMode = "prisma"
}
`;
    
    fs.writeFileSync(schemaPath, minimalSchema);
    console.log('Created minimal schema.prisma file');
  } else {
    // Update schema.prisma to include binary targets if needed
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    if (!schemaContent.includes('binaryTargets')) {
      console.log('Adding binaryTargets to schema.prisma...');
      
      schemaContent = schemaContent.replace(
        'generator client {',
        'generator client {\n  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]'
      );
      
      fs.writeFileSync(schemaPath, schemaContent);
      console.log('Updated schema.prisma with binaryTargets');
    }
  }
  
  // Step 4: Make sure .env file has the environment variables
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file with database variables...');
    
    let envContent = '';
    
    if (process.env.DATABASE_URL) {
      envContent += `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
    } else {
      console.warn('Warning: DATABASE_URL environment variable not set');
    }
    
    if (process.env.DIRECT_URL) {
      envContent += `DIRECT_URL="${process.env.DIRECT_URL}"\n`;
    } else {
      console.warn('Warning: DIRECT_URL environment variable not set');
    }
    
    if (envContent) {
      fs.writeFileSync(envPath, envContent);
      console.log('Created .env file with database variables');
    }
  }
  
  // Step 5: Display diagnostic information
  console.log('\nDiagnostic Information:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- PWD:', process.cwd());
  console.log('- HOME:', homeDir);
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set');
  console.log('- DIRECT_URL:', process.env.DIRECT_URL ? 'Set (hidden)' : 'Not set');
  
  // List current directory structure
  console.log('\nCurrent directory structure:');
  try {
    console.log(execSync('ls -la').toString());
  } catch (error) {
    console.error('Error listing current directory:', error.message);
  }
  
  console.log('\nPrisma directory structure:');
  try {
    if (fs.existsSync('prisma')) {
      console.log(execSync('ls -la prisma').toString());
    } else {
      console.log('Prisma directory not found');
    }
  } catch (error) {
    console.error('Error listing prisma directory:', error.message);
  }
  
  console.log('\nPrisma configuration in node_modules:');
  try {
    if (fs.existsSync('node_modules/.prisma')) {
      console.log(execSync('ls -la node_modules/.prisma').toString());
    } else {
      console.log('node_modules/.prisma directory not found');
    }
  } catch (error) {
    console.error('Error listing .prisma directory:', error.message);
  }
  
  console.log('Prisma fix script completed successfully');
} catch (error) {
  console.error('Error in Prisma fix script:', error);
  console.log('Continuing with build despite errors');
}
