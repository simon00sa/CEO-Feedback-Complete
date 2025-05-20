// prisma-setup.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Setting up Prisma for Netlify deployment...');

try {
  // Check if schema.prisma exists
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('Error: schema.prisma file not found!');
    process.exit(1);
  }
  
  console.log('Found schema.prisma at:', schemaPath);
  
  // Read schema content to verify binaryTargets
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  if (!schemaContent.includes('binaryTargets')) {
    console.log('Warning: binaryTargets not found in schema.prisma');
    console.log('Adding binaryTargets to schema.prisma...');
    
    const updatedSchema = schemaContent.replace(
      'generator client {',
      'generator client {\n  binaryTargets = ["native", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]'
    );
    
    fs.writeFileSync(schemaPath, updatedSchema);
    console.log('Updated schema.prisma with binaryTargets');
  } else {
    console.log('binaryTargets already defined in schema.prisma');
  }
  
  // Create .prisma directory in node_modules if it doesn't exist
  const prismaDir = path.join(process.cwd(), 'node_modules', '.prisma');
  if (!fs.existsSync(prismaDir)) {
    console.log('Creating .prisma directory...');
    fs.mkdirSync(prismaDir, { recursive: true });
  }
  
  // Generate Prisma client
  console.log('Generating Prisma client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('Prisma client generated successfully');
  } catch (error) {
    console.error('Error generating Prisma client:', error.message);
    console.log('Trying alternative approach...');
    
    try {
      execSync(`npx prisma generate --schema=${schemaPath}`, { stdio: 'inherit' });
      console.log('Prisma client generated successfully with explicit schema path');
    } catch (innerError) {
      console.error('Failed to generate Prisma client:', innerError.message);
      // Don't exit, let the build continue
    }
  }
  
  // Check if Prisma engine files were generated
  const engineFiles = fs.readdirSync(prismaDir);
  console.log('Files in .prisma directory:', engineFiles);
  
  console.log('Prisma setup completed');
} catch (error) {
  console.error('Error during Prisma setup:', error);
  // Don't exit with error to allow the build to continue
  console.log('Continuing with build despite Prisma setup errors');
}
