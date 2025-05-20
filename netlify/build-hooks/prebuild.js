// netlify/build-hooks/prebuild.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running prebuild hook to normalize Git references...');

try {
  // Ensure .git folder exists and is properly formatted
  if (fs.existsSync('.git')) {
    const headContent = fs.readFileSync('.git/HEAD', 'utf8').trim();
    console.log('Current HEAD content:', headContent);
    
    // Fix any malformed refs
    if (!headContent.includes('{') && !headContent.startsWith('ref:')) {
      console.log('Fixing malformed HEAD reference...');
      fs.writeFileSync('.git/HEAD', 'ref: refs/heads/main\n');
    }
    
    // Ensure refs directory exists
    const refsDir = path.join('.git', 'refs', 'heads');
    if (!fs.existsSync(refsDir)) {
      console.log('Creating refs directory structure...');
      fs.mkdirSync(refsDir, { recursive: true });
    }
    
    // Ensure main branch reference exists
    const mainRef = path.join(refsDir, 'main');
    if (!fs.existsSync(mainRef)) {
      console.log('Creating main branch reference...');
      // Get current commit hash
      const commitHash = execSync('git rev-parse HEAD').toString().trim();
      fs.writeFileSync(mainRef, commitHash + '\n');
    }
  } else {
    console.log('No .git directory found. Skipping Git reference normalization.');
  }
  
  console.log('Git reference normalization completed successfully.');
} catch (error) {
  console.error('Error during Git reference normalization:', error);
  // Don't fail the build
  process.exit(0);
}
