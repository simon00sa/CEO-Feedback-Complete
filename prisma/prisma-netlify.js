// prisma/prisma-netlify.js
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

async function initializePrisma() {
  try {
    // Check if we're in a Netlify environment
    const isNetlify = process.env.NETLIFY === 'true';
    
    if (isNetlify) {
      console.log('Netlify environment detected. Setting up Prisma...');
      
      // Create needed directories if they don't exist
      const configDir = path.join(process.env.HOME || '/opt/buildhome', '.config', 'prisma-nodejs');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log(`Created Prisma config directory: ${configDir}`);
      }
      
      // Create an empty commands.json file if it doesn't exist
      const commandsJsonPath = path.join(configDir, 'commands.json');
      
      if (!fs.existsSync(commandsJsonPath)) {
        fs.writeFileSync(commandsJsonPath, JSON.stringify({}, null, 2));
        console.log(`Created commands.json at: ${commandsJsonPath}`);
      }
      
      console.log('Prisma environment setup complete.');
    }
  } catch (error) {
    console.error('Error initializing Prisma in Netlify environment:', error);
  }
}

module.exports = { initializePrisma };
