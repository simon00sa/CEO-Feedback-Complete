// fix-netlify-prisma-path.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Enhanced Netlify Prisma Path Fix Script...');

try {
  // Display current environment
  console.log('Current working directory:', process.cwd());
  console.log('Node.js version:', process.version);
  
  console.log('Listing top-level directory contents:');
  console.log(execSync('ls -la').toString());
  
  // Check if .env exists in current directory
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('.env file found in current directory');
    console.log('Contents of .env file (without sensitive values):');
    
    // Read and show .env structure (without showing actual values)
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    const safeEnvContent = envLines.map(line => {
      const parts = line.split('=');
      if (parts.length > 1 && parts[0].trim()) {
        return `${parts[0]}=<value-hidden>`;
      }
      return line;
    }).join('\n');
    
    console.log(safeEnvContent);
  } else {
    console.log('.env file NOT found in current directory');
  }
  
  // Create /opt/build directory if it doesn't exist
  if (!fs.existsSync('/opt/build')) {
    console.log('Creating /opt/build directory');
    fs.mkdirSync('/opt/build', { recursive: true });
  }
  
  // Create /opt/build/repo directory if it doesn't exist
  if (!fs.existsSync('/opt/build/repo')) {
    console.log('Creating /opt/build/repo directory');
    fs.mkdirSync('/opt/build/repo', { recursive: true });
  }
  
  // Copy .env file to /opt/build/repo
  if (fs.existsSync(envPath)) {
    console.log('Copying .env file to /opt/build/repo');
    fs.copyFileSync(envPath, '/opt/build/repo/.env');
    console.log('.env file copied to /opt/build/repo');
  } else {
    console.log('Creating new .env file in /opt/build/repo');
    
    // Create a basic .env file with DATABASE_URL if available
    let newEnvContent = '';
    
    if (process.env.DATABASE_URL) {
      newEnvContent += `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
    }
    
    if (process.env.DIRECT_URL) {
      newEnvContent += `DIRECT_URL="${process.env.DIRECT_URL}"\n`;
    }
    
    newEnvContent += `PRISMA_BINARY_PLATFORM="debian-openssl-3.0.x"\n`;
    newEnvContent += `PRISMA_ENGINES_MIRROR="https://binaries.prisma.sh"\n`;
    
    // Write the new .env file
    fs.writeFileSync('/opt/build/repo/.env', newEnvContent);
    console.log('Created new .env file in /opt/build/repo');
  }
  
  // Copy schema.prisma to /opt/build/repo
  const prismaDir = path.join(process.cwd(), 'prisma');
  const schemaPath = path.join(prismaDir, 'schema.prisma');
  
  if (fs.existsSync(schemaPath)) {
    console.log('Found schema.prisma at:', schemaPath);
    
    // Copy to /opt/build/repo
    fs.copyFileSync(schemaPath, '/opt/build/repo/schema.prisma');
    console.log('Copied schema.prisma to /opt/build/repo');
    
    // Create prisma directory in /opt/build/repo
    if (!fs.existsSync('/opt/build/repo/prisma')) {
      fs.mkdirSync('/opt/build/repo/prisma', { recursive: true });
    }
    
    // Copy to /opt/build/repo/prisma
    fs.copyFileSync(schemaPath, '/opt/build/repo/prisma/schema.prisma');
    console.log('Copied schema.prisma to /opt/build/repo/prisma');
  } else {
    console.error('schema.prisma not found at expected location:', schemaPath);
    console.log('Searching for schema.prisma in other locations...');
    
    try {
      const findResults = execSync('find . -name "schema.prisma" 2>/dev/null').toString().trim();
      if (findResults) {
        console.log('Found schema.prisma at:', findResults);
        const foundSchemaPath = findResults.split('\n')[0];  // Take the first match
        
        // Copy to /opt/build/repo
        fs.copyFileSync(foundSchemaPath, '/opt/build/repo/schema.prisma');
        console.log('Copied schema.prisma to /opt/build/repo');
        
        // Create prisma directory in /opt/build/repo
        if (!fs.existsSync('/opt/build/repo/prisma')) {
          fs.mkdirSync('/opt/build/repo/prisma', { recursive: true });
        }
        
        // Copy to /opt/build/repo/prisma
        fs.copyFileSync(foundSchemaPath, '/opt/build/repo/prisma/schema.prisma');
        console.log('Copied schema.prisma to /opt/build/repo/prisma');
      } else {
        console.error('No schema.prisma found in the repository');
      }
    } catch (findError) {
      console.error('Error searching for schema.prisma:', findError.message);
    }
  }
  
  // Verify files exist in /opt/build/repo
  console.log('\nVerifying files in /opt/build/repo:');
  console.log('.env exists:', fs.existsSync('/opt/build/repo/.env'));
  console.log('schema.prisma exists:', fs.existsSync('/opt/build/repo/schema.prisma'));
  console.log('prisma/schema.prisma exists:', fs.existsSync('/opt/build/repo/prisma/schema.prisma'));
  
  // List the contents of /opt/build/repo
  console.log('\nContents of /opt/build/repo:');
  try {
    console.log(execSync('ls -la /opt/build/repo').toString());
  } catch (error) {
    console.error('Error listing /opt/build/repo:', error.message);
  }
  
  console.log('Netlify Prisma path fix completed');
} catch (error) {
  console.error('Error in Netlify Prisma path fix:', error.message);
  console.log('Continuing despite error...');
}
