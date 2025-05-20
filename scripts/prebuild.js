// scripts/prebuild.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running prebuild script for Netlify environment...');

// Create necessary directories for Prisma
try {
  const homeDir = process.env.HOME || '/opt/buildhome';
  const configDir = path.join(homeDir, '.config', 'prisma-nodejs');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`Created Prisma config directory: ${configDir}`);
  }
  
  // Create an empty commands.json file
  const commandsJsonPath = path.join(configDir, 'commands.json');
  if (!fs.existsSync(commandsJsonPath)) {
    fs.writeFileSync(commandsJsonPath, JSON.stringify({}, null, 2));
    console.log(`Created commands.json at: ${commandsJsonPath}`);
  }
  
  // Run Prisma generate with specific flags
  console.log('Running Prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('Prebuild script completed successfully.');
} catch (error) {
  console.error('Error in prebuild script:', error);
  process.exit(1);
}
