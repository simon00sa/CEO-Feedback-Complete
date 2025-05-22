// netlify-build-fix.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Enhanced Netlify build environment fix script...');

// Set environment variables to suppress warnings
process.env.MISE_IDIOMATIC_VERSION_FILES = "1";
process.env.USE_IDIOMATIC_VERSION_FILES = "true";
process.env.MISE_LOG_LEVEL = "error";
process.env.MISE_QUIET = "1";
process.env.MISE_EXPERIMENTAL = "1";
process.env.MISE_TIMEOUT = "600";

// Enhanced Python setup with stable version
function setupPython() {
  console.log('Setting up Python environment with stable version...');
  
  try {
    // Force Python version to stable 3.11.9
    const stablePythonVersion = '3.11.9';
    
    // Create .python-version file with stable version
    fs.writeFileSync('.python-version', stablePythonVersion);
    console.log(`Created .python-version file with version: ${stablePythonVersion}`);
    
    // Create runtime.txt file for Netlify
    fs.writeFileSync('runtime.txt', `python-${stablePythonVersion}`);
    console.log(`Created runtime.txt file with version: python-${stablePythonVersion}`);
    
    // Try to set Python version using mise with timeout
    try {
      console.log('Attempting to set Python version using mise...');
      
      // Set a shorter timeout for mise operations
      execSync(`timeout 30 mise use python@${stablePythonVersion} --global`, { 
        stdio: 'pipe',
        timeout: 30000 
      });
      console.log(`Successfully set Python version to ${stablePythonVersion}`);
    } catch (miseError) {
      console.log('Note: mise Python setup skipped (this is normal if mise is not available or times out)');
      console.log('Continuing with system Python...');
    }
    
    // Check what Python version is actually available
    try {
      const pythonVersion = execSync('python --version', { stdio: 'pipe', timeout: 5000 }).toString().trim();
      console.log(`System Python version: ${pythonVersion}`);
    } catch (pythonError) {
      try {
        const python3Version = execSync('python3 --version', { stdio: 'pipe', timeout: 5000 }).toString().trim();
        console.log(`System Python3 version: ${python3Version}`);
      } catch (python3Error) {
        console.log('Python version check failed, but continuing...');
      }
    }
    
    console.log('Python environment setup completed');
  } catch (error) {
    console.error('Error setting up Python:', error.message);
    console.log('Continuing despite Python setup errors...');
  }
}

// Suppress Python warnings with better error handling
function suppressPythonWarnings() {
  console.log('Configuring mise to suppress Python warnings...');
  
  try {
    // Set mise settings with timeout protection
    const commands = [
      'mise settings set experimental true',
      'mise settings set python.compile false',
      'mise settings set python.timeout 600'
    ];
    
    commands.forEach(cmd => {
      try {
        execSync(cmd, { 
          stdio: 'pipe', 
          timeout: 10000 // 10 second timeout for each command
        });
        console.log(`Successfully executed: ${cmd}`);
      } catch (error) {
        console.log(`Note: Command "${cmd}" failed or timed out (this is normal)`);
      }
    });
  } catch (error) {
    console.log('Note: Could not configure all mise settings (this is normal if mise is not available)');
  }
}

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

// Enhanced Git reference fixing
function fixGitReferences() {
  console.log('Checking and fixing Git references...');

  try {
    // Get current branch name from multiple sources
    let currentBranch = 'main'; // default fallback
    
    if (process.env.BRANCH) {
      currentBranch = process.env.BRANCH;
    } else if (process.env.HEAD) {
      currentBranch = process.env.HEAD;
    } else if (process.env.NETLIFY_BRANCH) {
      currentBranch = process.env.NETLIFY_BRANCH;
    }
    
    // Clean up branch name
    currentBranch = currentBranch.replace(/^refs\/heads\//, '');
    console.log(`Using branch: ${currentBranch}`);
    
    // Check if .git directory exists
    const gitDir = path.join(process.cwd(), '.git');
    if (fs.existsSync(gitDir)) {
      console.log('.git directory exists');
      
      // Fix HEAD file
      const headFile = path.join(gitDir, 'HEAD');
      const correctHeadContent = `ref: refs/heads/${currentBranch}`;
      
      if (fs.existsSync(headFile)) {
        const currentHeadContent = fs.readFileSync(headFile, 'utf8').trim();
        
        if (currentHeadContent !== correctHeadContent) {
          fs.writeFileSync(headFile, correctHeadContent + '\n');
          console.log(`HEAD reference fixed: ${correctHeadContent}`);
        }
      } else {
        fs.writeFileSync(headFile, correctHeadContent + '\n');
        console.log(`Created HEAD file: ${correctHeadContent}`);
      }
      
      // Ensure refs/heads directory exists
      const refsHeadsDir = path.join(gitDir, 'refs', 'heads');
      if (!fs.existsSync(refsHeadsDir)) {
        fs.mkdirSync(refsHeadsDir, { recursive: true });
      }
      
      // Create or update branch reference
      const branchRefFile = path.join(refsHeadsDir, currentBranch);
      const commitRef = process.env.COMMIT_REF || 
                       process.env.NETLIFY_COMMIT_REF || 
                       'HEAD';
      
      if (!fs.existsSync(branchRefFile)) {
        fs.writeFileSync(branchRefFile, commitRef + '\n');
        console.log(`Created branch reference: ${currentBranch} -> ${commitRef}`);
      }
    }
    
    console.log('Git reference fixes completed successfully');
  } catch (error) {
    console.error('Error fixing Git references:', error.message);
    console.log('Continuing despite Git reference errors...');
  }
}

// Ensure Prisma environment is properly set up
function setupPrismaEnvironment() {
  console.log('Setting up Prisma environment...');
  
  try {
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
        console.log('.env file created successfully');
      } else {
        console.warn('Warning: DATABASE_URL environment variable not found');
      }
    } else {
      console.log('.env file already exists');
    }
    
    console.log('Prisma environment setup completed');
  } catch (error) {
    console.error('Error setting up Prisma environment:', error.message);
    console.log('Continuing despite Prisma setup errors...');
  }
}

// Main function
async function main() {
  try {
    console.log('\n===== ENHANCED NETLIFY BUILD ENVIRONMENT SETUP =====');
    
    // Step 1: Suppress Python warnings first
    suppressPythonWarnings();
    
    // Step 2: Setup Python with stable version
    setupPython();
    
    // Step 3: Setup pnpm
    const pnpmSuccess = setupPnpm();
    if (!pnpmSuccess) {
      console.warn('pnpm setup failed, build may fail later');
    }
    
    // Step 4: Fix Git references
    fixGitReferences();
    
    // Step 5: Set up Prisma environment
    setupPrismaEnvironment();
    
    // Step 6: Verify file structure
    console.log('\n===== VERIFYING FILE STRUCTURE =====');
    const importantFiles = [
      '.env',
      'package.json',
      'prisma/schema.prisma',
      '.python-version',
      'runtime.txt',
      '.npmrc'
    ];
    
    importantFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      console.log(`${file}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    });
    
    console.log('\n===== BUILD ENVIRONMENT SETUP COMPLETED =====');
  } catch (error) {
    console.error('Error in Enhanced Netlify build environment fix script:', error.message);
    console.log('Continuing with the build despite errors...');
  }
}

// Run the main function
main();
