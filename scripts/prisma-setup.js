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
  
  // Check if schema.prisma exists
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: schema.prisma not found at ${schemaPath}`);
    console.log('Searching for schema.prisma in the project...');
    try {
      const result = execSync('find . -name "schema.prisma"').toString();
      console.log('Found schema.prisma files:', result);
      
      if (result) {
        // Copy the first found schema to the expected location
        const foundSchemaPath = result.split('\n')[0].trim();
        if (foundSchemaPath && fs.existsSync(foundSchemaPath)) {
          ensureDirectoryExists(path.join(process.cwd(), 'prisma'));
          fs.copyFileSync(foundSchemaPath, schemaPath);
          console.log(`Copied schema from ${foundSchemaPath} to ${schemaPath}`);
        }
      }
    } catch (err) {
      console.error('Error searching for schema.prisma:', err.message);
    }
  } else {
    console.log(`Found schema.prisma at: ${schemaPath}`);
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
  console.log('Netlify Build Directory:');
  console.log(execSync('ls -la /opt/build/repo 2>/dev/null || echo "Not in Netlify environment"').toString());
  
  // Create symlinks to ensure Prisma can find the schema in expected locations
  try {
    const netlifyPrismaDir = '/opt/build/repo/prisma';
    if (!fs.existsSync(netlifyPrismaDir) && fs.existsSync(schemaPath)) {
      ensureDirectoryExists(netlifyPrismaDir);
      fs.copyFileSync(schemaPath, path.join(netlifyPrismaDir, 'schema.prisma'));
      console.log(`Copied schema to Netlify build directory: ${netlifyPrismaDir}`);
    }
  } catch (err) {
    console.error('Error creating symlinks:', err.message);
  }
  
  console.log('Prisma environment setup complete');
} catch (error) {
  console.error('Error setting up Prisma environment:', error);
  process.exit(1);
}
