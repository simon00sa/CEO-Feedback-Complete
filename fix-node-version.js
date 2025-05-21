// fix-node-version.js
const fs = require('fs');
const path = require('path');

console.log('Running Node.js version file fix script...');

try {
  // Current working directory
  const cwd = process.cwd();
  
  // Specific Node.js version to use
  const nodeVersion = '18.20.0';
  
  // Update .nvmrc
  const nvmrcPath = path.join(cwd, '.nvmrc');
  fs.writeFileSync(nvmrcPath, nodeVersion);
  console.log(`Updated .nvmrc to use Node.js ${nodeVersion}`);
  
  // Create .node-version
  const nodeVersionPath = path.join(cwd, '.node-version');
  fs.writeFileSync(nodeVersionPath, nodeVersion);
  console.log(`Created .node-version to use Node.js ${nodeVersion}`);
  
  // If .npmrc exists, ensure it uses the correct Node.js version
  const npmrcPath = path.join(cwd, '.npmrc');
  if (fs.existsSync(npmrcPath)) {
    let npmrcContent = fs.readFileSync(npmrcPath, 'utf8');
    
    // Check if node-version is already in .npmrc
    if (npmrcContent.includes('node-version=')) {
      // Replace existing node-version
      npmrcContent = npmrcContent.replace(
        /node-version=.*/g,
        `node-version=${nodeVersion}`
      );
    } else {
      // Add node-version to .npmrc
      npmrcContent += `\nnode-version=${nodeVersion}`;
    }
    
    fs.writeFileSync(npmrcPath, npmrcContent);
    console.log(`Updated .npmrc to use Node.js ${nodeVersion}`);
  } else {
    // Create .npmrc with node-version
    fs.writeFileSync(npmrcPath, `node-version=${nodeVersion}`);
    console.log(`Created .npmrc to use Node.js ${nodeVersion}`);
  }
  
  console.log('Node.js version file fix completed');
  
  // Print environment information
  console.log('\nEnvironment information:');
  console.log('Node.js version:', process.version);
  console.log('USE_IDIOMATIC_VERSION_FILES:', process.env.USE_IDIOMATIC_VERSION_FILES || 'not set');
  console.log('--use-idiomatic-version-files flag:', process.execArgv.includes('--use-idiomatic-version-files=true') ? 'enabled' : 'not enabled');
  
} catch (error) {
  console.error('Error in Node.js version file fix:', error.message);
  console.log('Continuing despite error...');
}
