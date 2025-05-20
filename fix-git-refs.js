// fix-git-refs.js
const fs = require('fs');
const path = require('path');

console.log('Starting Git reference format fix script...');

try {
  // Check if .git directory exists
  const gitDir = path.join(process.cwd(), '.git');
  if (fs.existsSync(gitDir)) {
    console.log('.git directory exists');
    
    // Fix HEAD file if it exists
    const headFile = path.join(gitDir, 'HEAD');
    if (fs.existsSync(headFile)) {
      let headContent = fs.readFileSync(headFile, 'utf8').trim();
      console.log('Current HEAD content:', headContent);
      
      // Fix the reference format by ensuring it starts with 'ref:'
      if (!headContent.startsWith('ref:')) {
        console.log('Fixing HEAD reference format...');
        fs.writeFileSync(headFile, 'ref: refs/heads/main\n');
        console.log('HEAD reference fixed');
      }
    } else {
      console.log('HEAD file does not exist, creating it...');
      fs.writeFileSync(headFile, 'ref: refs/heads/main\n');
    }
    
    // Ensure refs/heads directory exists
    const refsDir = path.join(gitDir, 'refs', 'heads');
    if (!fs.existsSync(refsDir)) {
      console.log('Creating refs/heads directory...');
      fs.mkdirSync(refsDir, { recursive: true });
    }
    
    // Create main branch reference if it doesn't exist
    const mainRef = path.join(refsDir, 'main');
    if (!fs.existsSync(mainRef)) {
      console.log('Creating main branch reference...');
      const commitRef = process.env.COMMIT_REF || 'HEAD';
      fs.writeFileSync(mainRef, commitRef + '\n');
    }
  } else {
    console.log('.git directory does not exist, which is unusual for Netlify deployments');
  }
  
  console.log('Git reference format fix script completed successfully');
} catch (error) {
  console.error('Error in Git reference format fix script:', error);
  // Don't fail the build
}
