// fix-netlify-prisma-path.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Enhanced Netlify Prisma path fix script...');

try {
  // Display current environment
  console.log('Current working directory:', process.cwd());
  console.log('Node.js version:', process.version);
  console.log('PRISMA_BINARY_PLATFORM:', process.env.PRISMA_BINARY_PLATFORM || 'not set');
  console.log('Listing top-level directory contents:');
  console.log(execSync('ls -la').toString());
  
  // Source of truth: the prisma schema in the repository
  const sourcePrismaSchema = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (fs.existsSync(sourcePrismaSchema)) {
    console.log('Found source schema at:', sourcePrismaSchema);
    
    // Copy to root directory
    fs.copyFileSync(sourcePrismaSchema, path.join(process.cwd(), 'schema.prisma'));
    console.log('Copied schema to root directory');
    
    // Create the /opt/build/repo directory if it doesn't exist
    if (!fs.existsSync('/opt/build/repo')) {
      fs.mkdirSync('/opt/build/repo', { recursive: true });
      console.log('Created /opt/build/repo directory');
    }
    
    // Create symlink if needed - links /opt/build/repo to current directory
    if (process.cwd() !== '/opt/build/repo') {
      console.log('Creating symbolic link from /opt/build/repo to current directory...');
      
      // Check if /opt/build/repo already exists
      if (fs.existsSync('/opt/build/repo')) {
        console.log('/opt/build/repo already exists, removing it...');
        execSync('rm -rf /opt/build/repo');
      }
      
      // Create the symlink
      execSync(`ln -sf ${process.cwd()} /opt/build/repo`);
      console.log('Created symlink successfully');
      
      // Verify symlink
      if (fs.existsSync('/opt/build/repo')) {
        console.log('Symlink verified: /opt/build/repo exists');
        console.log('Listing symlinked directory contents:');
        console.log(execSync('ls -la /opt/build/repo').toString());
      } else {
        console.error('Failed to create symlink. /opt/build/repo does not exist.');
      }
    } else {
      console.log('Current directory is already /opt/build/repo, no symlink needed');
    }
    
    // Copy to /opt/build/repo directly (in case symlink doesn't work)
    fs.copyFileSync(sourcePrismaSchema, path.join('/opt/build/repo', 'schema.prisma'));
    console.log('Copied schema to /opt/build/repo directly');
    
    // Create prisma directory in /opt/build/repo
    const optBuildRepoPrismaDir = path.join('/opt/build/repo', 'prisma');
    if (!fs.existsSync(optBuildRepoPrismaDir)) {
      fs.mkdirSync(optBuildRepoPrismaDir, { recursive: true });
    }
    
    // Copy to /opt/build/repo/prisma
    fs.copyFileSync(sourcePrismaSchema, path.join(optBuildRepoPrismaDir, 'schema.prisma'));
    console.log('Copied schema to /opt/build/repo/prisma');
    
    // Verify all locations
    console.log('\nVerifying schema locations:');
    console.log('Root schema exists:', fs.existsSync(path.join(process.cwd(), 'schema.prisma')));
    console.log('/opt/build/repo schema exists:', fs.existsSync(path.join('/opt/build/repo', 'schema.prisma')));
    console.log('/opt/build/repo/prisma schema exists:', fs.existsSync(path.join('/opt/build/repo/prisma', 'schema.prisma')));
  } else {
    console.error('Source schema.prisma not found at expected location:', sourcePrismaSchema);
    console.log('Attempting to find schema in other locations...');
    
    // Try to find schema.prisma in any location
    try {
      const findResults = execSync('find . -name "schema.prisma" 2>/dev/null').toString().trim();
      console.log('Found schema.prisma in these locations:\n', findResults);
      
      if (findResults) {
        const foundSchema = findResults.split('\n')[0]; // Use the first found schema
        console.log('Using schema from:', foundSchema);
        
        // Copy to required locations
        fs.copyFileSync(foundSchema, path.join(process.cwd(), 'schema.prisma'));
        
        if (!fs.existsSync('/opt/build/repo')) {
          fs.mkdirSync('/opt/build/repo', { recursive: true });
        }
        fs.copyFileSync(foundSchema, path.join('/opt/build/repo', 'schema.prisma'));
        
        const optBuildRepoPrismaDir = path.join('/opt/build/repo', 'prisma');
        if (!fs.existsSync(optBuildRepoPrismaDir)) {
          fs.mkdirSync(optBuildRepoPrismaDir, { recursive: true });
        }
        fs.copyFileSync(foundSchema, path.join(optBuildRepoPrismaDir, 'schema.prisma'));
        
        console.log('Copied schema to all required locations');
      } else {
        console.error('No schema.prisma found in the repository');
      }
    } catch (findError) {
      console.error('Error searching for schema.prisma:', findError.message);
    }
  }
  
  // Create .env files in required locations with DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('\nCreating .env files with DATABASE_URL...');
    
    const envContent = `DATABASE_URL="${process.env.DATABASE_URL}"
${process.env.DIRECT_URL ? `DIRECT_URL="${process.env.DIRECT_URL}"` : ''}
PRISMA_SCHEMA_PATH="/opt/build/repo/schema.prisma"
`;
    
    // Root directory .env
    fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
    console.log('Created .env in root directory');
    
    // /opt/build/repo .env
    fs.writeFileSync(path.join('/opt/build/repo', '.env'), envContent);
    console.log('Created .env in /opt/build/repo');
  } else {
    console.warn('DATABASE_URL environment variable not set');
  }
  
  // Create a gitkeep file in /opt/build/repo to ensure the directory exists
  fs.writeFileSync('/opt/build/repo/.gitkeep', '');
  
  console.log('Schema location and path fix completed');
} catch (error) {
  console.error('Error in schema location fix:', error.message);
  console.log('Continuing despite error...');
}
