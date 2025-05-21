// netlify-build-fallback.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running Netlify build fallback script...');

try {
  // Try to use pnpm first
  console.log('Attempting to build with pnpm...');
  try {
    // Try to check pnpm version
    execSync('pnpm --version', { stdio: 'pipe' });
    
    // If we got here, pnpm is available
    console.log('Using pnpm for build...');
    
    // Run the build with pnpm
    execSync('node fix-netlify-prisma-path.js && cp .env /opt/build/repo/.env && pnpm config set enable-pre-post-scripts true && pnpm install react-hook-form@^7.55.0 --no-frozen-lockfile && pnpm install --shamefully-hoist --no-frozen-lockfile && PRISMA_BINARY_PLATFORM=debian-openssl-3.0.x PRISMA_SCHEMA_PATH=/opt/build/repo/schema.prisma pnpm prisma:generate && pnpm build', {
      stdio: 'inherit'
    });
    
  } catch (pnpmError) {
    // pnpm not available, fall back to npm
    console.error('Error with pnpm:', pnpmError.message);
    console.log('Falling back to npm for build...');
    
    // Convert pnpm-lock.yaml to package-lock.json if needed
    if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml')) && !fs.existsSync(path.join(process.cwd(), 'package-lock.json'))) {
      console.log('Converting pnpm-lock.yaml to package-lock.json...');
      try {
        // Install latest pnpm using npm
        execSync('npm install -g pnpm@latest', { stdio: 'inherit' });
        
        // Use pnpm to generate the lock file
        execSync('pnpm import', { stdio: 'inherit' });
      } catch (convertError) {
        console.error('Error converting lock file:', convertError.message);
        console.log('Continuing without lock file conversion...');
      }
    }
    
    // Run the build with npm
    console.log('Running build with npm...');
    execSync('node fix-netlify-prisma-path.js && cp .env /opt/build/repo/.env && npm install react-hook-form@^7.55.0 && npm install && PRISMA_BINARY_PLATFORM=debian-openssl-3.0.x PRISMA_SCHEMA_PATH=/opt/build/repo/schema.prisma npm run prisma:generate && npm run build', {
      stdio: 'inherit'
    });
  }
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Error in build fallback script:', error.message);
  process.exit(1);
}
