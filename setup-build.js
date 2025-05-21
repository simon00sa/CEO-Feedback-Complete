// setup-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up build environment...');

try {
  // Allow script to continue despite errors
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    console.log('Continuing despite error...');
  });

  // Set environment variable for mise
  process.env.MISE_IDIOMATIC_VERSION_FILES = "1";

  // Install pnpm globally with additional error handling
  console.log('Installing pnpm globally...');
  try {
    execSync('npm install -g pnpm@10.11.0', { stdio: 'inherit' });
    console.log('pnpm installed globally');
  } catch (pnpmInstallError) {
    console.error('Error installing pnpm globally:', pnpmInstallError.message);
    console.log('Attempting alternative pnpm installation...');
    try {
      execSync('mkdir -p ~/.npm-global && npm config set prefix \'~/.npm-global\' && npm install -g pnpm@10.11.0', { stdio: 'inherit' });
      process.env.PATH = `${process.env.HOME}/.npm-global/bin:${process.env.PATH}`;
      console.log('pnpm installed to custom location');
    } catch (altPnpmError) {
      console.error('Alternative pnpm installation failed:', altPnpmError.message);
    }
  }
  
  // Add global npm bin to PATH
  try {
    const npmBin = execSync('npm bin -g', { stdio: 'pipe' }).toString().trim();
    console.log(`Adding npm global bin to PATH: ${npmBin}`);
    process.env.PATH = `${npmBin}:${process.env.PATH}`;
  } catch (npmBinError) {
    console.error('Error getting npm global bin path:', npmBinError.message);
  }
  
  // Verify pnpm is installed and in PATH
  console.log('Verifying pnpm installation...');
  try {
    const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
    console.log(`pnpm version: ${pnpmVersion}`);
  } catch (pnpmVerifyError) {
    console.error('pnpm verification failed:', pnpmVerifyError.message);
    console.log('Will fall back to npm for installation if needed');
  }
  
  // Create Python version files
  console.log('Setting up Python version files...');
  fs.writeFileSync('.python-version', '3.9.7');
  console.log('Created .python-version file');
  
  // Explicitly check for Vercel remnants (just to verify your concern)
  console.log('Checking for Vercel configuration...');
  const vercelConfigPath = path.join(process.cwd(), '.vercel');
  if (fs.existsSync(vercelConfigPath)) {
    console.log('Found Vercel configuration directory. This might cause conflicts.');
    // Don't delete it - just inform
  } else {
    console.log('No Vercel configuration directory found.');
  }
  
  // Create a symlink from /opt/build/repo to current directory if they're different
  if (process.cwd() !== '/opt/build/repo') {
    console.log('Creating /opt/build/repo directory and symlink...');
    try {
      execSync('mkdir -p /opt/build', { stdio: 'inherit' });
      if (fs.existsSync('/opt/build/repo')) {
        execSync('rm -rf /opt/build/repo', { stdio: 'inherit' });
      }
      execSync(`ln -sf ${process.cwd()} /opt/build/repo`, { stdio: 'inherit' });
      console.log('Created symlink from /opt/build/repo to current directory');
    } catch (symlinkError) {
      console.error('Error creating symlink:', symlinkError.message);
    }
  }
  
  // Copy .env to /opt/build/repo (whether symlinked or not)
  console.log('Setting up environment files...');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('Copying .env to /opt/build/repo');
    try {
      if (!fs.existsSync('/opt/build/repo')) {
        fs.mkdirSync('/opt/build/repo', { recursive: true });
      }
      fs.copyFileSync(envPath, '/opt/build/repo/.env');
      console.log('.env file copied successfully');
    } catch (envCopyError) {
      console.error('Error copying .env file:', envCopyError.message);
    }
  } else {
    console.warn('.env file not found in current directory');
  }
  
  // Copy schema.prisma to /opt/build/repo
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    console.log('Found schema.prisma at expected location');
    try {
      if (!fs.existsSync('/opt/build/repo/prisma')) {
        fs.mkdirSync('/opt/build/repo/prisma', { recursive: true });
      }
      fs.copyFileSync(schemaPath, '/opt/build/repo/prisma/schema.prisma');
      fs.copyFileSync(schemaPath, '/opt/build/repo/schema.prisma');
      console.log('schema.prisma copied to /opt/build/repo and /opt/build/repo/prisma');
    } catch (schemaCopyError) {
      console.error('Error copying schema.prisma:', schemaCopyError.message);
    }
  } else {
    console.warn('schema.prisma not found at expected location');
    // Try to find it elsewhere
    try {
      const findResults = execSync('find . -name "schema.prisma" 2>/dev/null', { stdio: 'pipe' }).toString().trim();
      if (findResults) {
        console.log(`Found schema.prisma at: ${findResults}`);
        const foundSchemaPath = findResults.split('\n')[0];
        if (!fs.existsSync('/opt/build/repo/prisma')) {
          fs.mkdirSync('/opt/build/repo/prisma', { recursive: true });
        }
        fs.copyFileSync(foundSchemaPath, '/opt/build/repo/prisma/schema.prisma');
        fs.copyFileSync(foundSchemaPath, '/opt/build/repo/schema.prisma');
        console.log('schema.prisma copied from found location');
      } else {
        console.error('Could not find schema.prisma anywhere in the repository');
      }
    } catch (findError) {
      console.error('Error searching for schema.prisma:', findError.message);
    }
  }
  
  // Test if the build environment has what we need
  console.log('\nVerifying build environment:');
  try {
    console.log('Node version:', process.version);
    console.log('NPM version:', execSync('npm --version', { stdio: 'pipe' }).toString().trim());
    console.log('Current directory:', process.cwd());
    console.log('/opt/build/repo exists:', fs.existsSync('/opt/build/repo'));
    console.log('/opt/build/repo/.env exists:', fs.existsSync('/opt/build/repo/.env'));
    console.log('/opt/build/repo/schema.prisma exists:', fs.existsSync('/opt/build/repo/schema.prisma'));
    console.log('/opt/build/repo/prisma/schema.prisma exists:', fs.existsSync('/opt/build/repo/prisma/schema.prisma'));
  } catch (envCheckError) {
    console.error('Error verifying environment:', envCheckError.message);
  }
  
  console.log('Build environment setup completed');
} catch (error) {
  console.error('Error in setup-build.js:', error.message);
  console.log('Continuing despite errors to see full build log');
}
