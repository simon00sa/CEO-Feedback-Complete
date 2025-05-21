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
  
  // Create symlink if needed - links /opt/build/repo to current directory
  if (process.cwd() !== '/opt/build/repo') {
    console.log('Creating symbolic link from /opt/build/repo to current directory...');
    
    // Ensure the parent directory exists
    if (!fs.existsSync('/opt/build')) {
      console.log('Creating parent directory /opt/build');
      execSync('mkdir -p /opt/build');
    }
    
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
  
  // Check if prisma directory exists in the repo
  const prismaDir = path.join(process.cwd(), 'prisma');
  if (fs.existsSync(prismaDir)) {
    console.log('Found prisma directory at:', prismaDir);
    console.log('Prisma directory contents:');
    console.log(execSync(`ls -la ${prismaDir}`).toString());
    
    // Copy schema.prisma to the root as a fallback
    const schemaPath = path.join(prismaDir, 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      console.log('Copying schema.prisma to repo root as fallback...');
      fs.copyFileSync(schemaPath, path.join(process.cwd(), 'schema.prisma'));
      console.log('Schema copied to root directory');
      
      // Also copy to /opt/build/repo directly
      console.log('Copying schema.prisma to /opt/build/repo directly...');
      fs.copyFileSync(schemaPath, path.join('/opt/build/repo', 'schema.prisma'));
      console.log('Schema copied to /opt/build/repo directory');
      
      // Also copy to /opt/build/repo/prisma
      const optBuildPrismaDir = path.join('/opt/build/repo', 'prisma');
      if (!fs.existsSync(optBuildPrismaDir)) {
        fs.mkdirSync(optBuildPrismaDir, { recursive: true });
      }
      fs.copyFileSync(schemaPath, path.join(optBuildPrismaDir, 'schema.prisma'));
      console.log('Schema copied to /opt/build/repo/prisma directory');
    } else {
      console.error('schema.prisma not found in prisma directory');
    }
  } else {
    console.error('prisma directory not found');
  }
  
  // Create .env file to ensure DATABASE_URL is available
  const envFile = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envFile) && process.env.DATABASE_URL) {
    console.log('Creating .env file with required environment variables...');
    const envContent = `
DATABASE_URL="${process.env.DATABASE_URL}"
${process.env.DIRECT_URL ? `DIRECT_URL="${process.env.DIRECT_URL}"` : ''}
PRISMA_SCHEMA_PATH="${path.join(process.cwd(), 'prisma', 'schema.prisma')}"
`;
    fs.writeFileSync(envFile, envContent);
    console.log('.env file created');
    
    // Copy .env to /opt/build/repo as well
    fs.copyFileSync(envFile, path.join('/opt/build/repo', '.env'));
    console.log('.env file copied to /opt/build/repo');
  }
  
  // Create a gitkeep file in /opt/build/repo to ensure the directory exists
  fs.writeFileSync('/opt/build/repo/.gitkeep', '');
  
  // Try to make prisma client importable from any location
  console.log('Setting up Prisma client compatibility...');
  
  // Ensure node_modules/.prisma exists
  const prismaBinDir = path.join(process.cwd(), 'node_modules', '.prisma');
  if (!fs.existsSync(prismaBinDir)) {
    fs.mkdirSync(prismaBinDir, { recursive: true });
    console.log('Created .prisma directory in node_modules');
  }
  
  // Check build environment
  console.log('\nEnvironment diagnostics:');
  console.log('NETLIFY_BUILD_BASE:', process.env.NETLIFY_BUILD_BASE || 'not set');
  console.log('NETLIFY_CACHE_DIR:', process.env.NETLIFY_CACHE_DIR || 'not set');
  console.log('HOME:', process.env.HOME || 'not set');
  
  console.log('\nPrisma client installation:');
  try {
    console.log(execSync('find /opt/build/repo -name "schema.prisma" 2>/dev/null || echo "No schema.prisma found in /opt/build/repo"').toString());
  } catch (e) {
    console.log('Error finding schema.prisma:', e.message);
  }
  
  console.log('Enhanced Netlify Prisma path fix completed');
} catch (error) {
  console.error('Error in Netlify Prisma path fix:', error.message);
  console.log('Continuing despite error...');
}
