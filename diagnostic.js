// diagnostic.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('===== BUILD ENVIRONMENT DIAGNOSTIC =====');

try {
  console.log('\n----- System Information -----');
  console.log('Current directory:', process.cwd());
  console.log('HOME:', process.env.HOME);
  console.log('PATH:', process.env.PATH);
  console.log('NODE_VERSION:', process.version);
  
  try {
    console.log('Python version:', execSync('python --version 2>&1', { stdio: 'pipe' }).toString().trim());
  } catch (e) {
    console.log('Python not found or error:', e.message);
  }
  
  try {
    console.log('pnpm version:', execSync('pnpm --version 2>&1', { stdio: 'pipe' }).toString().trim());
  } catch (e) {
    console.log('pnpm not found or error:', e.message);
  }
  
  console.log('\n----- Directory Structure -----');
  console.log('Top-level directories:');
  const dirs = fs.readdirSync(process.cwd())
    .filter(f => fs.statSync(path.join(process.cwd(), f)).isDirectory())
    .join(', ');
  console.log(dirs);
  
  console.log('\nTop-level files:');
  const files = fs.readdirSync(process.cwd())
    .filter(f => fs.statSync(path.join(process.cwd(), f)).isFile())
    .join(', ');
  console.log(files);
  
  console.log('\n----- Checking Key Files -----');
  const keyFiles = [
    '.env',
    'package.json',
    'prisma/schema.prisma',
    '.python-version',
    'netlify.toml'
  ];
  
  keyFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
  });
  
  console.log('\n----- Checking Netlify-specific Paths -----');
  const netlifyPaths = [
    '/opt/build/repo',
    '/opt/build/repo/.env',
    '/opt/build/repo/schema.prisma',
    '/opt/build/repo/prisma/schema.prisma'
  ];
  
  netlifyPaths.forEach(p => {
    const exists = fs.existsSync(p);
    console.log(`${p}: ${exists ? 'EXISTS' : 'MISSING'}`);
  });
  
  console.log('\n===== DIAGNOSTIC COMPLETE =====');
} catch (error) {
  console.error('Error running diagnostics:', error.message);
}
