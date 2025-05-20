// scripts/prisma-setup.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Setting up Prisma environment for Netlify build...');

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

try {
  // Create the necessary Prisma config directory
  const homeDir = process.env.HOME || '/opt/buildhome';
  const configDir = path.join(homeDir, '.config', 'prisma-nodejs');
  ensureDirectoryExists(configDir);
  
  // Create a commands.json file if it doesn't exist
  const commandsJsonPath = path.join(configDir, 'commands.json');
  if (!fs.existsSync(commandsJsonPath)) {
    console.log(`Creating commands.json at: ${commandsJsonPath}`);
    fs.writeFileSync(commandsJsonPath, JSON.stringify({
      "version": "6.8.1",
      "commands": {}
    }));
  }
  
  // Define all possible locations for schema.prisma
  const possibleSchemaLocations = [
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'src', 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'schema.prisma')
  ];
  
  // Check if schema.prisma exists in any of the locations
  let schemaFound = false;
  let foundSchemaPath = null;
  
  for (const schemaPath of possibleSchemaLocations) {
    if (fs.existsSync(schemaPath)) {
      console.log(`Found schema.prisma at: ${schemaPath}`);
      schemaFound = true;
      foundSchemaPath = schemaPath;
      break;
    }
  }
  
  if (!schemaFound) {
    console.error('Error: schema.prisma not found in any expected location');
    
    // Create the prisma directory
    const prismaDir = path.join(process.cwd(), 'prisma');
    ensureDirectoryExists(prismaDir);
    
    // Create the schema.prisma file with minimal content
    const schemaPath = path.join(prismaDir, 'schema.prisma');
    console.log(`Creating minimal schema.prisma at: ${schemaPath}`);
    
    const schemaContent = `
generator client {
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
    fs.writeFileSync(schemaPath, schemaContent);
    foundSchemaPath = schemaPath;
  } else {
    // Ensure schema.prisma has the correct binaryTargets for Netlify
    const schemaContent = fs.readFileSync(foundSchemaPath, 'utf8');
    if (!schemaContent.includes('binaryTargets')) {
      console.log('Adding binaryTargets to schema.prisma for Netlify compatibility...');
      
      // Update the schema.prisma file to include binaryTargets
      const updatedContent = schemaContent.replace(
        'generator client {',
        'generator client {\n  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]'
      );
      
      fs.writeFileSync(foundSchemaPath, updatedContent);
      console.log('Updated schema.prisma with binary targets for Netlify');
    }
  }
  
  // Create the .prisma directory in node_modules if it doesn't exist
  const prismaDirNodeModules = path.join(process.cwd(), 'node_modules', '.prisma');
  ensureDirectoryExists(prismaDirNodeModules);
  
  // Create engines_manifest.json if it doesn't exist
  const enginesManifestPath = path.join(prismaDirNodeModules, 'engines_manifest.json');
  if (!fs.existsSync(enginesManifestPath)) {
    console.log(`Creating engines_manifest.json at: ${enginesManifestPath}`);
    fs.writeFileSync(enginesManifestPath, JSON.stringify({
      "version": "6.8.1"
    }));
  }
  
  // Ensure environment variables are accessible in the .env file
  const envFile = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envFile) && process.env.DATABASE_URL) {
    console.log('Creating .env file with environment variables...');
    
    let envContent = '';
    
    if (process.env.DATABASE_URL) {
      envContent += `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
    }
    
    if (process.env.DIRECT_URL) {
      envContent += `DIRECT_URL="${process.env.DIRECT_URL}"\n`;
    }
    
    fs.writeFileSync(envFile, envContent);
  }
  
  // Display environment information for debugging
  console.log('Environment Information:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- PWD:', process.cwd());
  console.log('- HOME:', homeDir);
  
  // List directories for debugging
  console.log('Directory Structure:');
  console.log('Current Directory:');
  console.log(execSync('ls -la').toString());
  console.log('Prisma Directory:');
  console.log(execSync('ls -la prisma 2>/dev/null || echo "No prisma directory found"').toString());
  console.log('node_modules/.prisma Directory:');
  console.log(execSync('ls -la node_modules/.prisma 2>/dev/null || echo "No .prisma directory found"').toString());
  
  // Run Prisma generate with explicit schema path
  console.log(`Running Prisma generate with schema: ${foundSchemaPath}...`);
  try {
    execSync(`npx prisma generate --schema=${foundSchemaPath}`, { stdio: 'inherit' });
    console.log('Prisma generate completed successfully.');
  } catch (error) {
    console.error('Error running Prisma generate:', error.message);
    console.log('Prisma generate failed but continuing with the build...');
  }
  
  console.log('Prisma environment setup complete');
} catch (error) {
  console.error('Error setting up Prisma environment:', error);
  // Don't exit the process with an error code, let the build continue
  console.log('Continuing with the build despite Prisma setup errors...');
}
