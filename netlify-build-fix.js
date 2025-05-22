// netlify-build-fix.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Enhanced Netlify build environment fix script...');

// Install and verify pnpm
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
    
    return true;
  } catch (error) {
    console.error('Error setting up pnpm:', error.message);
    return false;
  }
}

// Comprehensive Prisma environment setup
function setupPrismaEnvironment() {
  console.log('Setting up comprehensive Prisma environment...');
  
  try {
    // 1. Ensure prisma directory exists
    const prismaDir = path.join(process.cwd(), 'prisma');
    if (!fs.existsSync(prismaDir)) {
      console.log('Creating prisma directory...');
      fs.mkdirSync(prismaDir, { recursive: true });
    }
    
    // 2. Verify schema.prisma exists
    const schemaPath = path.join(prismaDir, 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
      console.error('CRITICAL: Schema file not found at expected location:', schemaPath);
      
      // Try to find schema.prisma in other locations
      console.log('Searching for schema.prisma in alternative locations...');
      const possibleLocations = [
        path.join(process.cwd(), 'schema.prisma'),
        path.join(process.cwd(), 'src', 'prisma', 'schema.prisma'),
        path.join(process.cwd(), 'database', 'schema.prisma')
      ];
      
      let schemaFound = false;
      for (const location of possibleLocations) {
        if (fs.existsSync(location)) {
          console.log(`Found schema.prisma at: ${location}`);
          fs.copyFileSync(location, schemaPath);
          console.log(`Copied schema.prisma to: ${schemaPath}`);
          schemaFound = true;
          break;
        }
      }
      
      if (!schemaFound) {
        console.error('ERROR: Could not find schema.prisma file anywhere!');
        console.log('Please ensure schema.prisma exists in your repository');
        return false;
      }
    } else {
      console.log('✓ Schema file found at:', schemaPath);
    }
    
    // 3. Create .env file with DATABASE_URL if it doesn't exist
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
        console.log('✓ .env file created successfully');
      } else {
        console.warn('WARNING: DATABASE_URL environment variable not found');
        console.log('Creating minimal .env file...');
        const envContent = 'PRISMA_BINARY_PLATFORM="debian-openssl-3.0.x"\nPRISMA_ENGINES_MIRROR="https://binaries.prisma.sh"\n';
        fs.writeFileSync(envPath, envContent);
      }
    } else {
      console.log('✓ .env file already exists');
    }
    
    // 4. Ensure Prisma directories exist
    const nodeModulesPrismaDir = path.join(process.cwd(), 'node_modules', '.prisma');
    if (!fs.existsSync(nodeModulesPrismaDir)) {
      console.log('Creating node_modules/.prisma directory...');
      fs.mkdirSync(nodeModulesPrismaDir, { recursive: true });
    }
    
    const prismaClientDir = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
    if (!fs.existsSync(prismaClientDir)) {
      console.log('Creating @prisma/client directory...');
      fs.mkdirSync(prismaClientDir, { recursive: true });
    }
    
    // 5. Create schema copy in root for build process
    const rootSchemaPath = path.join(process.cwd(), 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      fs.copyFileSync(schemaPath, rootSchemaPath);
      console.log('✓ Created schema.prisma copy in root directory');
    }
    
    // 6. Verify Prisma dependencies in package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const hasPrismaClient = packageJson.dependencies && packageJson.dependencies['@prisma/client'];
      const hasPrisma = packageJson.devDependencies && packageJson.devDependencies['prisma'];
      
      if (!hasPrismaClient || !hasPrisma) {
        console.warn('WARNING: Prisma dependencies missing from package.json');
        console.log('Expected dependencies:');
        console.log('  - @prisma/client in dependencies');
        console.log('  - prisma in devDependencies');
      } else {
        console.log('✓ Prisma dependencies found in package.json');
      }
    }
    
    // 7. Log Prisma environment information
    console.log('\n=== PRISMA ENVIRONMENT INFO ===');
    console.log('Schema path:', schemaPath);
    console.log('Schema exists:', fs.existsSync(schemaPath));
    console.log('Root schema copy:', fs.existsSync(rootSchemaPath));
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.log('DIRECT_URL set:', !!process.env.DIRECT_URL);
    console.log('PRISMA_BINARY_PLATFORM:', process.env.PRISMA_BINARY_PLATFORM || 'not set');
    
    console.log('✓ Prisma environment setup completed');
    return true;
  } catch (error) {
    console.error('ERROR setting up Prisma environment:', error.message);
    console.log('Continuing despite Prisma setup errors...');
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('\n===== ENHANCED NETLIFY BUILD ENVIRONMENT SETUP =====');
    
    // Step 1: Setup pnpm
    const pnpmSuccess = setupPnpm();
    if (!pnpmSuccess) {
      console.warn('⚠ pnpm setup failed, build may fail later');
    }
    
    // Step 2: Set up Prisma environment (comprehensive)
    const prismaSuccess = setupPrismaEnvironment();
    if (!prismaSuccess) {
      console.warn('⚠ Prisma setup had issues, check the logs above');
    }
    
    // Step 3: Verify critical file structure
    console.log('\n===== VERIFYING CRITICAL FILE STRUCTURE =====');
    const criticalFiles = [
      'package.json',
      'prisma/schema.prisma',
      'schema.prisma',
      '.env',
      '.npmrc'
    ];
    
    let allFilesPresent = true;
    criticalFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      const status = exists ? '✓ EXISTS' : '✗ MISSING';
      console.log(`${file}: ${status}`);
      if (!exists && (file === 'package.json' || file === 'prisma/schema.prisma')) {
        allFilesPresent = false;
      }
    });
    
    if (!allFilesPresent) {
      console.error('⚠ CRITICAL FILES MISSING - Build may fail');
    } else {
      console.log('✓ All critical files present');
    }
    
    console.log('\n===== BUILD ENVIRONMENT SETUP COMPLETED =====');
  } catch (error) {
    console.error('ERROR in build environment fix script:', error.message);
    console.log('Continuing with the build despite errors...');
  }
}

// Run the main function
main();
