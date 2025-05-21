// verify-pnpm.js
const { execSync } = require('child_process');

console.log('Verifying pnpm installation...');

try {
  // Install pnpm globally
  console.log('Installing pnpm globally...');
  execSync('npm install -g pnpm@10.11.0', { stdio: 'inherit' });
  
  // Verify pnpm is installed
  console.log('Verifying pnpm installation...');
  const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
  console.log(`pnpm version: ${pnpmVersion}`);
  
  // Add to PATH if needed
  console.log('Ensuring pnpm is in PATH...');
  const npmBin = execSync('npm bin -g', { stdio: 'pipe' }).toString().trim();
  console.log(`npm global bin: ${npmBin}`);
  process.env.PATH = `${npmBin}:${process.env.PATH}`;
  
  console.log('pnpm verification successful');
} catch (error) {
  console.error('Error verifying pnpm:', error.message);
  process.exit(1);
}
