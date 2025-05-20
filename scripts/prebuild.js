// scripts/prebuild.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running prebuild script for Netlify environment...');

// Create necessary directories for Prisma
try {
  // Check and display working directory
  console.log('Current working directory:', process.cwd());
  console.log('Listing prisma directory:');
  try {
    console.log(execSync('ls -la prisma').toString());
  } catch (err) {
    console.error('Error listing prisma directory:', err.message);
  }

  // Check if schema.prisma exists in the expected location
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: schema.prisma not found at ${schemaPath}`);
    console.log('Searching for schema.prisma file:');
    try {
      console.log(execSync('find . -name "schema.prisma"').toString());
    } catch (err) {
      console.error('Error finding schema.prisma:', err.message);
    }
  } else {
    console.log(`Found schema.prisma at ${schemaPath}`);
  }

  // Create Prisma config directory
  const homeDir = process.env.HOME || '/opt/buildhome';
  const configDir = path.join(homeDir, '.config', 'prisma-nodejs');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`Created Prisma config directory: ${configDir}`);
  } else {
    console.log(`Prisma config directory already exists: ${configDir}`);
  }
  
  // Create an empty commands.json file
  const commandsJsonPath = path.join(configDir, 'commands.json');
  if (!fs.existsSync(commandsJsonPath)) {
    fs.writeFileSync(commandsJsonPath, JSON.stringify({
      "version": "6.8.1",
      "commands": {}
    }, null, 2));
    console.log(`Created commands.json at: ${commandsJsonPath}`);
  } else {
    console.log(`commands.json already exists at: ${commandsJsonPath}`);
  }
  
  // Ensure Netlify has access to the prisma directory
  const netlifyPrismaDir = '/opt/build/repo/prisma';
  if (!fs.existsSync(netlifyPrismaDir)) {
    console.log(`Creating directory: ${netlifyPrismaDir}`);
    fs.mkdirSync(netlifyPrismaDir, { recursive: true });
  }

  // Copy schema.prisma to the Netlify directory if it exists
  if (fs.existsSync(schemaPath)) {
    const netlifySchemaPath = path.join(netlifyPrismaDir, 'schema.prisma');
    fs.copyFileSync(schemaPath, netlifySchemaPath);
    console.log(`Copied schema.prisma to ${netlifySchemaPath}`);
  }
  
  // Run Prisma generate with specific flags
  console.log('Running Prisma generate...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('Prisma generate completed successfully.');
  } catch (error) {
    console.error('Error running Prisma generate:', error.message);
    // Try with explicit schema path
    try {
      console.log('Trying with explicit schema path...');
      execSync(`npx prisma generate --schema=${path.join(process.cwd(), 'prisma', 'schema.prisma')}`, { stdio: 'inherit' });
      console.log('Prisma generate with explicit schema path completed successfully.');
    } catch (err) {
      console.error('Error running Prisma generate with explicit schema path:', err.message);
      process.exit(1);
    }
  }
  
  console.log('Prebuild script completed successfully.');
} catch (error) {
  console.error('Error in prebuild script:', error);
  process.exit(1);
}
