// netlify-build-fix.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Simplified Netlify build environment fix script...');

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

// Check system Python (don't try to manage versions)
function checkPython() {
  console.log('Checking system Python...');
  
  try {
    // Check what Python version is available
    try {
      const pythonVersion = execSync('python --version', { stdio: 'pipe', timeout: 5000 }).toString().trim();
      console.log(`System Python version: ${pythonVersion}`);
    } catch (pythonError) {
      try {
        const python3Version = execSync('python3 --version', { stdio: 'pipe', timeout: 5000 }).toString().trim();
        console.log(`System Python3 version: ${python3Version}`);
      } catch (python3Error) {
        console.log('Python not found, but this is usually not needed for Next.js builds');
      }
    }
    
    console.log('Python check completed');
  } catch (error) {
    console.log('Python check failed, but continuing (Python not required for Next.js)...');
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
    console.log('\n===== SIMPLIFIED NETLIFY BUILD ENVIRONMENT SETUP =====');
    
    // Step 1: Check Python (don't try to manage versions)
    checkPython();
    
    // Step 2: Setup pnpm
    const pnpmSuccess = setupPnpm();
    if (!pnpmSuccess) {
      console.warn('pnpm setup failed, build may fail later');
    }
    
    // Step 3: Fix Git references
    fixGitReferences();
    
    // Step 4: Set up Prisma environment
    setupPrismaEnvironment();
    
    // Step 5: Verify file structure
    console.log('\n===== VERIFYING FILE STRUCTURE =====');
    const importantFiles = [
      '.env',
      'package.json',
      'prisma/schema.prisma',
      '.npmrc'
    ];
    
    importantFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      console.log(`${file}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    });
    
    console.log('\n===== BUILD ENVIRONMENT SETUP COMPLETED =====');
  } catch (error) {
    console.error('Error in Simplified Netlify build environment fix script:', error.message);
    console.log('Continuing with the build despite errors...');
  }
}

// Run the main function
main();
