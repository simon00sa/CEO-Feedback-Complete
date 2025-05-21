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
  
  // Create Python version files
  console.log('Setting up Python version files...');
  fs.writeFileSync('.python-version', '3.9.7');
  console.log('Created .python-version file');
  
  // Verify Python installation
  try {
    const pythonVersion = execSync('python --version', { stdio: 'pipe' }).toString().trim();
    console.log(`Python version: ${pythonVersion}`);
  } catch (pythonError) {
    console.error('Error checking Python version:', pythonError.message);
    console.log('Checking for python3...');
    try {
      const python3Version = execSync('python3 --version', { stdio: 'pipe' }).toString().trim();
      console.log(`Python3 version: ${python3Version}`);
      console.log('Creating symlink from python3 to python...');
      execSync('ln -sf $(which python3) /usr/local/bin/python', { stdio: 'inherit' });
    } catch (python3Error) {
      console.error('Error checking Python3 version:', python3Error.message);
    }
  }
  
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
  
  // Clean up cache if needed
  console.log('Preparing for clean installation...');
  if (fs.existsSync('node_modules')) {
    console.log('Removing existing node_modules to ensure clean install...');
    fs.rmSync('node_modules', { recursive: true, force: true });
  }
  
  if (fs.existsSync('pnpm-lock.yaml')) {
    console.log('Backing up pnpm-lock.yaml...');
    fs.copyFileSync('pnpm-lock.yaml', 'pnpm-lock.yaml.backup');
  }
  
  console.log('Build environment setup completed successfully');
} catch (error) {
  console.error('Error setting up build environment:', error.message);
  console.log('Continuing despite errors...');
}
