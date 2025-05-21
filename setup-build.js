// setup-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up build environment...');

try {
  // Install pnpm globally
  console.log('Installing pnpm globally...');
  execSync('npm install -g pnpm@10.11.0', { stdio: 'inherit' });
  
  // Add global npm bin to PATH
  const npmBin = execSync('npm bin -g', { stdio: 'pipe' }).toString().trim();
  console.log(`Adding npm global bin to PATH: ${npmBin}`);
  process.env.PATH = `${npmBin}:${process.env.PATH}`;
  
  // Verify pnpm is installed and in PATH
  console.log('Verifying pnpm installation...');
  const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
  console.log(`pnpm version: ${pnpmVersion}`);
  
  // Copy .env to /opt/build/repo
  console.log('Setting up environment files...');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('Copying .env to /opt/build/repo');
    if (!fs.existsSync('/opt/build/repo')) {
      fs.mkdirSync('/opt/build/repo', { recursive: true });
    }
    fs.copyFileSync(envPath, '/opt/build/repo/.env');
  }
  
  // Copy schema.prisma to /opt/build/repo
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    console.log('Copying schema.prisma to /opt/build/repo');
    if (!fs.existsSync('/opt/build/repo/prisma')) {
      fs.mkdirSync('/opt/build/repo/prisma', { recursive: true });
    }
    fs.copyFileSync(schemaPath, '/opt/build/repo/prisma/schema.prisma');
    fs.copyFileSync(schemaPath, '/opt/build/repo/schema.prisma');
  }
  
  console.log('Build environment setup completed successfully');
} catch (error) {
  console.error('Error setting up build environment:', error.message);
  process.exit(1);
}
