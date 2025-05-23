// netlify/functions/prisma-setup.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.handler = async function() {
  try {
    console.log('Running Prisma setup in Netlify function environment');
    
    // Create the configuration directory
    const configDir = path.join(process.env.HOME || '/var/task', '.config', 'prisma-nodejs');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`Created directory: ${configDir}`);
    }
    
    // Create commands.json file
    const commandsJsonPath = path.join(configDir, 'commands.json');
    if (!fs.existsSync(commandsJsonPath)) {
      fs.writeFileSync(commandsJsonPath, JSON.stringify({
        "version": "6.8.1",
        "commands": {}
      }, null, 2));
      console.log(`Created file: ${commandsJsonPath}`);
    }
    
    // Log environment to help with debugging
    console.log('Prisma environment setup:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- PWD:', process.env.PWD);
    console.log('- HOME:', process.env.HOME);
    
    // Display directory structure
    console.log('Directory structure:');
    try {
      console.log(execSync('ls -la').toString());
      console.log('Prisma directory:');
      console.log(execSync('ls -la prisma 2>/dev/null || echo "No prisma directory found"').toString());
    } catch (err) {
      console.error('Error listing directories:', err.message);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Prisma setup complete' })
    };
  } catch (error) {
    console.error('Error in Prisma setup function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to set up Prisma', details: error.message })
    };
  }
};
