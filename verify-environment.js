// verify-environment.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Verifying build environment...');

try {
  // Check Node.js version
  console.log('Node.js version:', process.version);
  console.log('NODE_VERSION env var:', process.env.NODE_VERSION || 'not set');
  console.log('USE_IDIOMATIC_VERSION_FILES:', process.env.USE_IDIOMATIC_VERSION_FILES || 'not set');
  
  // Create .nvmrc file if it doesn't exist
  const nvmrcPath = path.join(process.cwd(), '.nvmrc');
  if (!fs.existsSync(nvmrcPath)) {
    fs.writeFileSync(nvmrcPath, '18.20.0');
    console.log('Created .nvmrc file with Node.js version 18.20.0');
  } else {
    console.log('.nvmrc file already exists with content:', fs.readFileSync(nvmrcPath, 'utf8').trim());
  }
  
  // Create .node-version file for broader compatibility
  const nodeVersionPath = path.join(process.cwd(), '.node-version');
  if (!fs.existsSync(nodeVersionPath)) {
    fs.writeFileSync(nodeVersionPath, '18.20.0');
    console.log('Created .node-version file with Node.js version 18.20.0');
  } else {
    console.log('.node-version file already exists with content:', fs.readFileSync(nodeVersionPath, 'utf8').trim());
  }
  
  // Check Python version
  try {
    const pythonVersion = execSync('python --version', { stdio: 'pipe' }).toString().trim();
    console.log('Python version:', pythonVersion);
  } catch (error) {
    console.log('Python not found or error checking version:', error.message);
  }
  
  // Create .python-version file if it doesn't exist
  const pythonVersionPath = path.join(process.cwd(), '.python-version');
  if (!fs.existsSync(pythonVersionPath)) {
    fs.writeFileSync(pythonVersionPath, '3.9.7');
    console.log('Created .python-version file with Python version 3.9.7');
  } else {
    console.log('.python-version file already exists with content:', fs.readFileSync(pythonVersionPath, 'utf8').trim());
  }
  
  // Check for pnpm
  try {
    const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
    console.log('pnpm version:', pnpmVersion);
  } catch (error) {
    console.log('pnpm not found, installing globally...');
    execSync('npm install -g pnpm@10.11.0', { stdio: 'inherit' });
    console.log('pnpm installed globally');
  }
  
  // Add pnpm as a dev dependency in package.json if it's not already there
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    
    if (!packageJson.devDependencies.pnpm) {
      packageJson.devDependencies.pnpm = '^10.11.0';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Added pnpm as a dev dependency in package.json');
    } else {
      console.log('pnpm is already in devDependencies');
    }
  }
  
  // Check environment variables
  console.log('\nEnvironment Variables:');
  console.log('PATH:', process.env.PATH);
  console.log('PNPM_HOME:', process.env.PNPM_HOME || 'not set');
  console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS || 'not set');
  console.log('PRISMA_BINARY_PLATFORM:', process.env.PRISMA_BINARY_PLATFORM || 'not set');
  console.log('PRISMA_SCHEMA_PATH:', process.env.PRISMA_SCHEMA_PATH || 'not set');
  
  console.log('Environment verification completed successfully');
} catch (error) {
  console.error('Error verifying environment:', error.message);
  console.log('Continuing despite error...');
}
