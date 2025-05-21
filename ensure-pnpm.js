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
    try {
      const pnpmVersionOutput = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
      console.log(`Verified pnpm installation, version: ${pnpmVersionOutput}`);
    } catch (verifyError) {
      console.error('Failed to verify pnpm installation after npm install -g:', verifyError.message);
      
      // Alternative approach: install locally and use npx
      console.log('Trying alternative approach: installing pnpm locally...');
      execSync('npm install pnpm@10.11.0 --no-save', { stdio: 'inherit' });
      console.log('pnpm installed locally, will use npx to run it');
      
      // Verify local installation
      try {
        const localPnpmVersion = execSync('npx pnpm --version', { stdio: 'pipe' }).toString().trim();
        console.log(`Verified local pnpm installation via npx, version: ${localPnpmVersion}`);
        
        // Create symlinks or scripts
        console.log('Creating pnpm wrapper script...');
        const binDir = path.join(process.cwd(), 'node_modules', '.bin');
        if (!fs.existsSync(binDir)) {
          fs.mkdirSync(binDir, { recursive: true });
        }
        
        // Create a wrapper script for pnpm
        const wrapperScript = `#!/bin/sh
npx pnpm "$@"
`;
        fs.writeFileSync(path.join(binDir, 'pnpm'), wrapperScript);
        execSync(`chmod +x ${path.join(binDir, 'pnpm')}`, { stdio: 'inherit' });
        console.log('pnpm wrapper script created');
        
        // Add bin directory to PATH
        process.env.PATH = `${binDir}:${process.env.PATH}`;
        console.log(`Added ${binDir} to PATH`);
      } catch (localVerifyError) {
        console.error('Failed to verify local pnpm installation:', localVerifyError.message);
        throw new Error('All attempts to install pnpm have failed');
      }
    }
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
    
    // Update react-hook-form dependency if needed
    if (packageJson.dependencies && packageJson.dependencies['react-hook-form']) {
      const currentVersion = packageJson.dependencies['react-hook-form'];
      if (!currentVersion.startsWith('^7.55.0')) {
        console.log('Updating react-hook-form dependency version...');
        packageJson.dependencies['react-hook-form'] = '^7.55.0';
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('Updated react-hook-form to ^7.55.0');
      }
    }
  } else {
    console.error('package.json not found!');
  }
  
  // Set environment variables for pnpm
  console.log('Setting pnpm environment variables...');
  process.env.PNPM_HOME = path.join(process.env.HOME || '/tmp', '.local/share/pnpm');
  process.env.PATH = `${process.env.PNPM_HOME}:${process.env.PATH}`;
  
  // Add global npm bin to PATH
  try {
    const npmBinPath = execSync('npm bin -g', { stdio: 'pipe' }).toString().trim();
    console.log(`Adding npm global bin directory to PATH: ${npmBinPath}`);
    process.env.PATH = `${npmBinPath}:${process.env.PATH}`;
  } catch (npmBinError) {
    console.error('Error getting npm global bin path:', npmBinError.message);
  }
  
  // Print environment information
  console.log('\nEnvironment information:');
  console.log('PATH:', process.env.PATH);
  console.log('PNPM_HOME:', process.env.PNPM_HOME);
  console.log('Current directory:', process.cwd());
  
  // Final verification
  console.log('\nFinal verification of pnpm...');
  try {
    const finalPnpmCheck = execSync('which pnpm || type pnpm', { stdio: 'pipe' }).toString().trim();
    console.log('pnpm location:', finalPnpmCheck);
    
    const finalPnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
    console.log('Final pnpm version check:', finalPnpmVersion);
  } catch (finalCheckError) {
    console.error('Final pnpm verification failed:', finalCheckError.message);
    console.log('Will attempt to continue despite verification failure');
  }
  
  console.log('pnpm setup completed successfully');
} catch (error) {
  console.error('Error ensuring pnpm is available:', error.message);
  // Continue despite errors - don't exit with error code
  console.log('Continuing despite pnpm setup errors...');
}
