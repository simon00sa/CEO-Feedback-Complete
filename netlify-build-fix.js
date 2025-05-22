// netlify-build-fix.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Netlify build environment fix script...');

// Set environment variables to suppress warnings
process.env.MISE_IDIOMATIC_VERSION_FILES = "1";
process.env.USE_IDIOMATIC_VERSION_FILES = "true";

// Consolidated function to install and verify pnpm
function setupPnpm() {
  console.log('Setting up pnpm...');
  
  try {
    // Check if pnpm is already installed
    try {
      const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
      console.log(`pnpm is already installed, version: ${pnpmVersion}`);
      return true;
    } catch (error) {
      console.log('pnpm not found, installing globally...');
    }
    
    // Install pnpm globally
    execSync('npm install -g pnpm@10.11.0', { stdio: 'inherit' });
    console.log('pnpm installed globally');
    
    // Verify installation
    const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
    console.log(`Verified pnpm installation, version: ${pnpmVersion}`);
    
    // Add to PATH if needed
    const npmBin = execSync('npm bin -g', { stdio: 'pipe' }).toString().trim();
    process.env.PATH = `${npmBin}:${process.env.PATH}`;
    console.log(`Added npm global bin to PATH: ${npmBin}`);
    
    return true;
  } catch (error) {
    console.error('Error setting up pnpm:', error.message);
    return false;
  }
}

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

// Setup Python environment
function setupPython() {
  console.log('Setting up Python environment...');
  
  try {
    // Create .python-version file
    fs.writeFileSync('.python-version', '3.9.7');
    console.log('Created .python-version file');
    
    // Check Python installation
    try {
      const pythonVersion = execSync('python --version', { stdio: 'pipe' }).toString().trim();
      console.log(`Python version: ${pythonVersion}`);
    } catch (pythonError) {
      console.log('Python not found, checking for python3...');
      try {
        const python3Version = execSync('python3 --version', { stdio: 'pipe' }).toString().trim();
        console.log(`Python3 version: ${python3Version}`);
      } catch (python3Error) {
        console.warn('Neither python nor python3 found, but continuing...');
      }
    }
  } catch (error) {
    console.error('Error setting up Python:', error.message);
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
        let envContent = `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
        
        if (process.env.DIRECT_URL) {
          envContent += `DIRECT_URL="${process.env.DIRECT_URL}"\n`;
        }
        
        envContent += 'PRISMA_BINARY_PLATFORM="debian-openssl-3.0.x"\n';
        envContent += 'PRISMA_ENGINES_MIRROR="https://binaries.prisma.sh"\n';
        
        fs.writeFileSync(envPath, envContent);
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
    console.log('\n===== NETLIFY BUILD ENVIRONMENT SETUP =====');
    
    // Step 1: Setup pnpm
    const pnpmSuccess = setupPnpm();
    if (!pnpmSuccess) {
      console.warn('pnpm setup failed, build may fail later');
    }
    
    // Step 2: Setup Python
    setupPython();
    
    // Step 3: Fix Git references
    fixGitReferences();
    
    // Step 4: Set up Prisma environment
    setupPrismaEnvironment();
    
    // Step 5: Display environment information
    console.log('\n===== ENVIRONMENT INFORMATION =====');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- NODE_VERSION:', process.version);
    console.log('- PWD:', process.cwd());
    console.log('- HOME:', process.env.HOME || '/opt/buildhome');
    console.log('- MISE_IDIOMATIC_VERSION_FILES:', process.env.MISE_IDIOMATIC_VERSION_FILES);
    
    // Step 6: Verify environment variables
    console.log('\n===== VERIFYING ENVIRONMENT VARIABLES =====');
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
    
    // Step 7: Verify file structure
    console.log('\n===== VERIFYING FILE STRUCTURE =====');
    const importantFiles = [
      '.env',
      'package.json',
      'prisma/schema.prisma',
      '.python-version'
    ];
    
    importantFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      console.log(`${file}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    });
    
    console.log('\n===== BUILD ENVIRONMENT SETUP COMPLETED =====');
  } catch (error) {
    console.error('Error in Netlify build environment fix script:', error);
    // Don't exit with error to allow the build to continue
    console.log('Continuing with the build despite errors...');
  }
}

// Run the main function
main();
