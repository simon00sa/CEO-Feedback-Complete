// netlify-prisma-setup.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Enhanced Netlify Prisma setup script...');

// Display environment information
console.log('Environment Information:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PWD:', process.cwd());
console.log('- NODE_VERSION:', process.version);
console.log('- PRISMA_BINARY_PLATFORM:', process.env.PRISMA_BINARY_PLATFORM);

// Check for existing node_modules
try {
  const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
  console.log(`node_modules directory ${nodeModulesExists ? 'exists' : 'does not exist'}`);
  
  // Check for Prisma in node_modules
  const prismaClientExists = fs.existsSync(path.join(process.cwd(), 'node_modules', '@prisma', 'client'));
  console.log(`@prisma/client ${prismaClientExists ? 'exists' : 'does not exist'} in node_modules`);
} catch (error) {
  console.error('Error checking node_modules:', error.message);
}

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
  
  // List files in current directory for debugging
  console.log('Files in current directory:');
  try {
    console.log(execSync('ls -la').toString());
  } catch (error) {
    console.error('Error listing files:', error.message);
  }
  
  // Try to find schema.prisma in other locations
  const possibleLocations = [
    path.join(process.cwd(), 'src', 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'schema.prisma'),
    // Additional locations
    path.join(process.cwd(), 'src', 'schema.prisma'),
    path.join(process.cwd(), 'app', 'prisma', 'schema.prisma'),
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

// Required Models for NextAuth.js
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
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
  
  // Additional check: Remove "native" from binaryTargets if it exists
  let finalSchemaContent = fs.readFileSync(schemaPath, 'utf8');
  if (finalSchemaContent.includes('"native"')) {
    console.log('Removing "native" from binaryTargets...');
    finalSchemaContent = finalSchemaContent.replace('"native",', '');
    finalSchemaContent = finalSchemaContent.replace(', "native"', '');
    finalSchemaContent = finalSchemaContent.replace('"native"', '"debian-openssl-3.0.x"');
    fs.writeFileSync(schemaPath, finalSchemaContent);
    console.log('Removed "native" from binaryTargets');
  }
}

// Ensure .prisma directory exists in node_modules
const prismaBinaryDir = path.join(process.cwd(), 'node_modules', '.prisma');
if (!fs.existsSync(prismaBinaryDir)) {
  console.log('Creating .prisma directory in node_modules...');
  fs.mkdirSync(prismaBinaryDir, { recursive: true });
}

// Create the engines directory
const enginesDir = path.join(prismaBinaryDir, 'engines');
if (!fs.existsSync(enginesDir)) {
  console.log('Creating engines directory...');
  fs.mkdirSync(enginesDir, { recursive: true });
}

// Create a marker file to indicate setup completion
fs.writeFileSync(path.join(prismaDir, '.setup-complete'), new Date().toISOString());

console.log('Netlify Prisma setup completed successfully');

// Additional diagnostics
console.log('\nFile System Diagnostics:');
try {
  console.log('prisma directory:');
  console.log(execSync(`ls -la ${prismaDir}`).toString());
} catch (error) {
  console.error('Error listing prisma directory:', error.message);
}

console.log('\n.env file exists:', fs.existsSync(path.join(process.cwd(), '.env')));
console.log('.env.production file exists:', fs.existsSync(path.join(process.cwd(), '.env.production')));
