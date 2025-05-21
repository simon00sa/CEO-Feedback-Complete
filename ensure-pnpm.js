// ensure-pnpm.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Ensuring pnpm is available for build...');

try {
  // Try to check pnpm version
  console.log('Checking if pnpm is already installed...');
  try {
    const pnpmVersionOutput = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
    console.log(`pnpm is already installed, version: ${pnpmVersionOutput}`);
  } catch (error) {
    // pnpm not found, so install it globally
    console.log('pnpm not found, installing pnpm globally...');
    execSync('npm install -g pnpm@10.11.0', { stdio: 'inherit' });
    console.log('pnpm installed globally');
    
    // Verify installation
    const pnpmVersionOutput = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
    console.log(`Verified pnpm installation, version: ${pnpmVersionOutput}`);
  }
  
  // Add pnpm as a dev dependency in package.json if it's not already there
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('Checking package.json for pnpm dependency...');
    
    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check if pnpm is already in devDependencies
    if (!packageJson.devDependencies || !packageJson.devDependencies.pnpm) {
      console.log('Adding pnpm as a dev dependency in package.json...');
      
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }
      
      packageJson.devDependencies.pnpm = '^10.11.0';
      
      // Write updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Added pnpm to devDependencies in package.json');
    } else {
      console.log('pnpm is already in devDependencies');
    }
  } else {
    console.error('package.json not found!');
  }
  
  // Set environment variables for pnpm
  console.log('Setting pnpm environment variables...');
  process.env.PNPM_HOME = path.join(process.env.HOME || '/tmp', '.local/share/pnpm');
  process.env.PATH = `${process.env.PNPM_HOME}:${process.env.PATH}`;
  
  console.log('pnpm setup completed successfully');
} catch (error) {
  console.error('Error ensuring pnpm is available:', error.message);
  process.exit(1);
}
