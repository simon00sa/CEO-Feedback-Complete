// netlify-prisma-setup.js
const fs = require('fs');
const path = require('path');

console.log('Running Netlify Prisma setup script...');

// Ensure prisma directory exists
const prismaDir = path.join(process.cwd(), 'prisma');
if (!fs.existsSync(prismaDir)) {
  console.log('Creating prisma directory...');
  fs.mkdirSync(prismaDir, { recursive: true });
}

// Check if schema.prisma exists
const schemaPath = path.join(prismaDir, 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('ERROR: schema.prisma file not found at expected location!');
  console.log('Current directory:', process.cwd());
  console.log('Expected schema path:', schemaPath);
  
  // Try to find schema.prisma in other locations
  const possibleLocations = [
    path.join(process.cwd(), 'src', 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'schema.prisma')
  ];
  
  let schemaFound = false;
  for (const location of possibleLocations) {
    if (fs.existsSync(location)) {
      console.log(`Found schema.prisma at alternative location: ${location}`);
      // Copy schema to proper location
      fs.copyFileSync(location, schemaPath);
      console.log(`Copied schema.prisma to ${schemaPath}`);
      schemaFound = true;
      break;
    }
  }
  
  if (!schemaFound) {
    console.log('Creating minimal schema.prisma file...');
    // Create a minimal schema.prisma file
    const minimalSchema = `// This is a minimal schema created during deployment
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  directUrl    = env("DIRECT_URL")
  relationMode = "prisma"
}
`;
    fs.writeFileSync(schemaPath, minimalSchema);
    console.log('Created minimal schema.prisma file');
  }
} else {
  console.log('Found schema.prisma at expected location');
  
  // Read schema to check if it has binary targets
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  if (!schemaContent.includes('binaryTargets')) {
    console.log('Updating schema.prisma to include binaryTargets...');
    const updatedSchema = schemaContent.replace(
      'generator client {',
      'generator client {\n  binaryTargets = ["debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]'
    );
    fs.writeFileSync(schemaPath, updatedSchema);
    console.log('Updated schema.prisma with binaryTargets');
  }
}

// Ensure .prisma directory exists in node_modules
const prismaBinaryDir = path.join(process.cwd(), 'node_modules', '.prisma');
if (!fs.existsSync(prismaBinaryDir)) {
  console.log('Creating .prisma directory in node_modules...');
  fs.mkdirSync(prismaBinaryDir, { recursive: true });
}

console.log('Netlify Prisma setup completed successfully');
