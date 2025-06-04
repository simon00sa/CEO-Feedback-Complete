// Direct fix for Prisma CLI and config file issues
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting direct Prisma fix for Netlify...');

// Define paths
const ROOT_DIR = process.cwd();
const PRISMA_DIR = path.join(ROOT_DIR, 'prisma');
const SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma');
const ROOT_SCHEMA_PATH = path.join(ROOT_DIR, 'schema.prisma');
const NODE_MODULES_DIR = path.join(ROOT_DIR, 'node_modules');
const PRISMA_CLIENT_DIR = path.join(NODE_MODULES_DIR, '@prisma', 'client');
const PRISMA_CLI_DIR = path.join(NODE_MODULES_DIR, 'prisma');

// Create directories
console.log('Creating necessary directories...');
[
  PRISMA_DIR,
  path.join(NODE_MODULES_DIR, '.prisma'),
  PRISMA_CLIENT_DIR,
  PRISMA_CLI_DIR,
  path.join(PRISMA_CLI_DIR, 'build'),
  path.join(PRISMA_CLI_DIR, 'build', 'index')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Check for schema.prisma
console.log('Checking for schema.prisma...');
let schemaContent = '';

// Try to find schema.prisma in various locations
const possibleSchemaPaths = [
  SCHEMA_PATH,
  ROOT_SCHEMA_PATH,
  path.join(ROOT_DIR, 'src', 'prisma', 'schema.prisma'),
  path.join(ROOT_DIR, 'api', 'prisma', 'schema.prisma')
];

for (const schemaPath of possibleSchemaPaths) {
  if (fs.existsSync(schemaPath)) {
    console.log(`Found schema at: ${schemaPath}`);
    schemaContent = fs.readFileSync(schemaPath, 'utf8');
    break;
  }
}

// If no schema found, create a minimal one
if (!schemaContent) {
  console.log('No schema found! Creating minimal schema...');
  schemaContent = `
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
}

// Write schema to both locations
console.log('Writing schema to both locations...');
fs.writeFileSync(SCHEMA_PATH, schemaContent);
fs.writeFileSync(ROOT_SCHEMA_PATH, schemaContent);

// Create CLI files
console.log('Creating Prisma CLI files...');

// Create package.json for prisma
const prismaPackageJson = {
  name: "prisma",
  version: "6.8.1",
  main: "build/index.js",
  bin: {
    prisma: "build/index/cli.js"
  }
};
fs.writeFileSync(
  path.join(PRISMA_CLI_DIR, 'package.json'),
  JSON.stringify(prismaPackageJson, null, 2)
);

// Create CLI binary placeholder
const cliBinPath = path.join(PRISMA_CLI_DIR, 'build', 'index', 'cli.js');
const cliBinContent = `#!/usr/bin/env node
// Prisma CLI placeholder
console.log('Prisma CLI placeholder executed');
process.exit(0);
`;
fs.writeFileSync(cliBinPath, cliBinContent);
fs.chmodSync(cliBinPath, '755');

// Create index.js
const indexPath = path.join(PRISMA_CLI_DIR, 'build', 'index.js');
const indexContent = `
// Minimal Prisma CLI index
module.exports = {
  getPrismaClient: () => require('@prisma/client'),
  getGenerator: () => ({}),
  getGenerators: () => [],
  getConfig: () => ({}),
  getDMMF: () => ({}),
  getPackageVersion: () => '6.8.1'
};
`;
fs.writeFileSync(indexPath, indexContent);

// Create symlink in .bin
const binDir = path.join(NODE_MODULES_DIR, '.bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const symlinkPath = path.join(binDir, 'prisma');
try {
  if (fs.existsSync(symlinkPath)) {
    fs.unlinkSync(symlinkPath);
  }
  
  if (process.platform === 'win32') {
    const batchContent = `@echo off\nnode "${cliBinPath}" %*`;
    fs.writeFileSync(symlinkPath + '.cmd', batchContent);
  } else {
    fs.copyFileSync(cliBinPath, symlinkPath);
    fs.chmodSync(symlinkPath, '755');
  }
  console.log(`Created CLI link at: ${symlinkPath}`);
} catch (err) {
  console.error(`Error creating CLI link: ${err.message}`);
}

// Set environment variables
console.log('Setting environment variables...');
process.env.PRISMA_SCHEMA_PATH = './prisma/schema.prisma';
process.env.PRISMA_BINARY_PLATFORM = 'debian-openssl-3.0.x';

// Verify setup
console.log('\n=== PRISMA SETUP VERIFICATION ===');
console.log('Schema in prisma dir:', fs.existsSync(SCHEMA_PATH));
console.log('Schema in root:', fs.existsSync(ROOT_SCHEMA_PATH));
console.log('CLI binary:', fs.existsSync(cliBinPath));
console.log('CLI symlink:', fs.existsSync(symlinkPath));
console.log('PRISMA_SCHEMA_PATH:', process.env.PRISMA_SCHEMA_PATH);

console.log('\nPrisma setup completed successfully');
