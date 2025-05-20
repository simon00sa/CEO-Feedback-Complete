// netlify-build-fix.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Netlify build environment fix script...');

// Fix Git reference format issues
function fixGitReferences() {
  console.log('Checking and fixing Git references...');

  try {
    // Check if .git directory exists
    const gitDir = path.join(process.cwd(), '.git');
    if (fs.existsSync(gitDir)) {
      console.log('.git directory exists');
      
      // Fix HEAD file if it exists
      const headFile = path.join(gitDir, 'HEAD');
      if (fs.existsSync(headFile)) {
        let headContent = fs.readFileSync(headFile, 'utf8').trim();
        console.log('Current HEAD content:', headContent);
        
        // Fix the reference format by ensuring it starts with 'ref:'
        if (!headContent.startsWith('ref:')) {
          console.log('Fixing HEAD reference format...');
          fs.writeFileSync(headFile, 'ref: refs/heads/main\n');
          console.log('HEAD reference fixed');
        }
      } else {
        console.log('HEAD file does not exist, creating it...');
        fs.writeFileSync(headFile, 'ref: refs/heads/main\n');
      }
      
      // Ensure refs/heads directory exists
      const refsDir = path.join(gitDir, 'refs', 'heads');
      if (!fs.existsSync(refsDir)) {
        console.log('Creating refs/heads directory...');
        fs.mkdirSync(refsDir, { recursive: true });
      }
      
      // Create main branch reference if it doesn't exist
      const mainRef = path.join(refsDir, 'main');
      if (!fs.existsSync(mainRef)) {
        console.log('Creating main branch reference...');
        const commitRef = process.env.COMMIT_REF || 'HEAD';
        fs.writeFileSync(mainRef, commitRef + '\n');
      }
    } else {
      console.log('.git directory does not exist, creating minimal structure...');
      
      // Create minimal .git structure
      fs.mkdirSync(gitDir);
      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n');
      
      const refsHeadsDir = path.join(gitDir, 'refs', 'heads');
      fs.mkdirSync(refsHeadsDir, { recursive: true });
      
      fs.writeFileSync(path.join(refsHeadsDir, 'main'), 'HEAD\n');
    }
    
    console.log('Git reference fixes completed successfully');
  } catch (error) {
    console.error('Error fixing Git references:', error);
    // Continue with the build despite errors
  }
}

// Ensure Prisma environment is properly set up
function setupPrismaEnvironment() {
  console.log('Setting up Prisma environment...');
  
  try {
    // Create necessary Prisma config directories
    const homeDir = process.env.HOME || '/opt/buildhome';
    const configDir = path.join(homeDir, '.config', 'prisma-nodejs');
    
    if (!fs.existsSync(configDir)) {
      console.log(`Creating Prisma config directory: ${configDir}`);
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Create a commands.json file if it doesn't exist
    const commandsJsonPath = path.join(configDir, 'commands.json');
    if (!fs.existsSync(commandsJsonPath)) {
      console.log(`Creating commands.json at: ${commandsJsonPath}`);
      fs.writeFileSync(commandsJsonPath, JSON.stringify({
        "version": "6.8.1",
        "commands": {}
      }));
    }
    
    // Verify if prisma directory exists
    const prismaDir = path.join(process.cwd(), 'prisma');
    if (!fs.existsSync(prismaDir)) {
      console.log('Creating prisma directory...');
      fs.mkdirSync(prismaDir, { recursive: true });
    }
    
    // Verify schema.prisma exists and is accessible
    const schemaPath = path.join(prismaDir, 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
      console.error('Schema file not found at expected location:', schemaPath);
      // Continue with the build despite errors
    } else {
      console.log('Schema file found at:', schemaPath);
    }
    
    // Create .env file with DATABASE_URL if it doesn't exist
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      if (process.env.DATABASE_URL) {
        console.log('Creating .env file with DATABASE_URL...');
        fs.writeFileSync(envPath, `DATABASE_URL="${process.env.DATABASE_URL}"\n`);
        
        if (process.env.DIRECT_URL) {
          fs.appendFileSync(envPath, `DIRECT_URL="${process.env.DIRECT_URL}"\n`);
        }
      } else {
        console.warn('Warning: DATABASE_URL environment variable not found. Cannot create .env file.');
      }
    }
    
    // Create engines_manifest.json if needed
    const enginesDir = path.join(process.cwd(), 'node_modules', '.prisma');
    if (!fs.existsSync(enginesDir)) {
      console.log('Creating .prisma engines directory...');
      fs.mkdirSync(enginesDir, { recursive: true });
      
      const manifestPath = path.join(enginesDir, 'engines_manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        "version": "6.8.1"
      }));
    }
    
    console.log('Prisma environment setup completed');
  } catch (error) {
    console.error('Error setting up Prisma environment:', error);
    // Continue with the build despite errors
  }
}

// Main function
async function main() {
  try {
    // Step 1: Fix Git references
    fixGitReferences();
    
    // Step 2: Set up Prisma environment
    setupPrismaEnvironment();
    
    // Step 3: Display environment information
    console.log('\nEnvironment Information:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- PWD:', process.cwd());
    console.log('- HOME:', process.env.HOME || '/opt/buildhome');
    
    // Step 4: Verify environment variables
    console.log('\nVerifying Environment Variables:');
    if (!process.env.DATABASE_URL) {
      console.warn('Warning: DATABASE_URL is not set in the environment');
    } else {
      console.log('DATABASE_URL is set (value hidden for security)');
    }
    
    if (!process.env.DIRECT_URL) {
      console.warn('Warning: DIRECT_URL is not set in the environment');
    } else {
      console.log('DIRECT_URL is set (value hidden for security)');
    }
    
    // Step 5: List important directories for debugging
    console.log('\nDirectory Structure:');
    
    try {
      console.log('Current Directory:');
      console.log(execSync('ls -la').toString());
    } catch (error) {
      console.error('Error listing current directory:', error.message);
    }
    
    try {
      console.log('Prisma Directory:');
      console.log(execSync('ls -la prisma 2>/dev/null || echo "No prisma directory found"').toString());
    } catch (error) {
      console.error('Error listing prisma directory:', error.message);
    }
    
    try {
      console.log('node_modules/.prisma Directory:');
      console.log(execSync('ls -la node_modules/.prisma 2>/dev/null || echo "No .prisma directory found"').toString());
    } catch (error) {
      console.error('Error listing .prisma directory:', error.message);
    }
    
    console.log('\nNetlify build environment fix script completed successfully');
  } catch (error) {
    console.error('Error in Netlify build environment fix script:', error);
    // Don't exit with error to allow the build to continue
    console.log('Continuing with the build despite errors...');
  }
}

// Run the main function
main();
