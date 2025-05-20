// prisma/setup.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Setting up Prisma environment for Netlify...');

try {
  // Check if schema.prisma exists in the expected location
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: schema.prisma not found at ${schemaPath}`);
    console.log('Current directory structure:');
    console.log(execSync('find . -type f -name "schema.prisma"').toString());
    process.exit(1);
  }
  
  console.log(`Found schema.prisma at ${schemaPath}`);
  
  // Create the Prisma cache directory if it doesn't exist
  const homeDir = process.env.HOME || '/opt/buildhome';
  const configDir = path.join(homeDir, '.config', 'prisma-nodejs');
  
  if (!fs.existsSync(configDir)) {
    console.log(`Creating Prisma config directory at ${configDir}`);
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Create a default commands.json file
  const commandsJsonPath = path.join(configDir, 'commands.json');
  if (!fs.existsSync(commandsJsonPath)) {
    console.log(`Creating commands.json at ${commandsJsonPath}`);
    fs.writeFileSync(commandsJsonPath, JSON.stringify({
      "version": "6.8.1",
      "commands": {}
    }, null, 2));
  }
  
  // Create a symlink to the schema file in the expected location
  const targetDir = '/opt/build/repo/prisma';
  if (!fs.existsSync(targetDir)) {
    console.log(`Creating target directory at ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const targetSchemaPath = path.join(targetDir, 'schema.prisma');
  if (!fs.existsSync(targetSchemaPath)) {
    console.log(`Copying schema to ${targetSchemaPath}`);
    fs.copyFileSync(schemaPath, targetSchemaPath);
  }
  
  console.log('Prisma environment setup complete');
} catch (error) {
  console.error('Error during Prisma setup:', error);
  process.exit(1);
}
