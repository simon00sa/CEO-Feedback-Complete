// Simple prisma-setup.js focused on schema file placement
const fs = require('fs');
const path = require('path');

console.log('Starting simplified Prisma setup for Netlify...');

// Define paths
const ROOT_DIR = process.cwd();
const PRISMA_DIR = path.join(ROOT_DIR, 'prisma');
const SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma');
const ROOT_SCHEMA_PATH = path.join(ROOT_DIR, 'schema.prisma');

// Create prisma directory if it doesn't exist
if (!fs.existsSync(PRISMA_DIR)) {
  console.log(`Creating prisma directory: ${PRISMA_DIR}`);
  fs.mkdirSync(PRISMA_DIR, { recursive: true });
}

// Check for schema.prisma in both locations
const schemaInPrismaDir = fs.existsSync(SCHEMA_PATH);
const schemaInRoot = fs.existsSync(ROOT_SCHEMA_PATH);

console.log(`Schema in prisma dir: ${schemaInPrismaDir}`);
console.log(`Schema in root: ${schemaInRoot}`);

// Copy schema to ensure it exists in both locations
if (schemaInPrismaDir && !schemaInRoot) {
  console.log('Copying schema from prisma dir to root...');
  fs.copyFileSync(SCHEMA_PATH, ROOT_SCHEMA_PATH);
} else if (!schemaInPrismaDir && schemaInRoot) {
  console.log('Copying schema from root to prisma dir...');
  fs.copyFileSync(ROOT_SCHEMA_PATH, SCHEMA_PATH);
} else if (!schemaInPrismaDir && !schemaInRoot) {
  // Create a minimal schema if none exists
  console.log('No schema found! Creating minimal schema...');
  const minimalSchema = `
// This is a minimal schema.prisma file
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Define your models here
`;
  fs.writeFileSync(SCHEMA_PATH, minimalSchema);
  fs.writeFileSync(ROOT_SCHEMA_PATH, minimalSchema);
}

// Verify schema exists in both locations after setup
console.log(`Schema in prisma dir after setup: ${fs.existsSync(SCHEMA_PATH)}`);
console.log(`Schema in root after setup: ${fs.existsSync(ROOT_SCHEMA_PATH)}`);

console.log('Prisma setup completed');
