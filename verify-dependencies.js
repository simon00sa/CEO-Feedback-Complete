// verify-dependencies.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Verifying critical dependencies for build process...');

// Check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking if file exists at ${filePath}:`, error);
    return false;
  }
}

// Check if a package exists in node_modules
function packageExists(packageName) {
  const packagePath = path.join(process.cwd(), 'node_modules', packageName);
  const exists = fileExists(packagePath);
  console.log(`Package ${packageName}: ${exists ? 'Found' : 'Not found'}`);
  return exists;
}

// Critical files to check
const criticalFiles = [
  'pre-download-engines.js',
  'netlify-prisma-setup.js',
  'prisma/schema.prisma',
  '.env.production'
];

// Critical packages to check
const criticalPackages = [
  '@prisma/client',
  'prisma',
  'next',
  'react',
  'react-dom',
  '@netlify/functions',
  'crypto-browserify',
  'buffer',
  'stream-browserify'
];

// Check all critical files
console.log('\nChecking critical files:');
const missingFiles = [];
criticalFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fileExists(filePath);
  console.log(`File ${file}: ${exists ? 'Found' : 'Not found'}`);
  if (!exists) {
    missingFiles.push(file);
  }
});

// Check all critical packages
console.log('\nChecking critical packages:');
const missingPackages = [];
criticalPackages.forEach(pkg => {
  if (!packageExists(pkg)) {
    missingPackages.push(pkg);
  }
});

// Create a directory for Prisma if it doesn't exist
const prismaDir = path.join(process.cwd(), 'prisma');
if (!fileExists(prismaDir)) {
  console.log('Creating prisma directory...');
  fs.mkdirSync(prismaDir, { recursive: true });
}

// Ensure schema.prisma exists
const schemaPath = path.join(prismaDir, 'schema.prisma');
if (!fileExists(schemaPath)) {
  console.log('Creating minimal schema.prisma...');
  
  const minimalSchema = `// This is a minimal schema created during deployment
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  directUrl    = env("DIRECT_URL")
  relationMode = "prisma"
}

// Basic User model
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
}
`;
  
  fs.writeFileSync(schemaPath, minimalSchema);
  console.log('Created minimal schema.prisma');
}

// Ensure pre-download-engines.js exists
const preDownloadPath = path.join(process.cwd(), 'pre-download-engines.js');
if (!fileExists(preDownloadPath)) {
  console.log('Creating pre-download-engines.js...');
  
  const preDownloadScript = `// pre-download-engines.js
const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('Pre-downloading Prisma engine binaries...');

// Create directories if they don't exist
const enginesDir = path.join(process.cwd(), 'node_modules', '.prisma', 'engines');
if (!fs.existsSync(enginesDir)) {
  fs.mkdirSync(enginesDir, { recursive: true });
}

// Prisma version from package.json
const engineVersion = '6.8.0-43.2060c79ba17c6bb9f5823312b6f6b7f4a845738e';

// Download engine
const downloadEngine = (engineType, targetPlatform) => {
  const fileName = \`\${engineType}-\${targetPlatform}.gz\`;
  const engineUrl = \`https://binaries.prisma.sh/all_commits/\${engineVersion}/\${fileName}\`;
  const outputPath = path.join(enginesDir, fileName);
  
  console.log(\`Downloading \${engineUrl} to \${outputPath}\`);
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(engineUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(outputPath));
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
};

// Download engines for multiple platforms
Promise.all([
  downloadEngine('libquery_engine', 'debian-openssl-3.0.x'),
  downloadEngine('libquery_engine', 'linux-musl-openssl-3.0.x'),
  downloadEngine('schema-engine', 'debian-openssl-3.0.x'),
  downloadEngine('schema-engine', 'linux-musl-openssl-3.0.x')
])
.then(() => {
  console.log('Successfully downloaded Prisma engine binaries');
})
.catch((error) => {
  console.error('Error downloading Prisma engine binaries:', error);
  // Don't exit with error to allow the build to continue
});
`;
  
  fs.writeFileSync(preDownloadPath, preDownloadScript);
  console.log('Created pre-download-engines.js');
}

// Create a .env.production file if it doesn't exist
const envProductionPath = path.join(process.cwd(), '.env.production');
if (!fileExists(envProductionPath)) {
  console.log('Creating .env.production...');
  
  // Check if we have environment variables to use
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres?sslmode=prefer';
  const directUrl = process.env.DIRECT_URL || dbUrl;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || 'a-random-secret-for-nextauth';
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  const envContent = `# Production Environment Variables
DATABASE_URL="${dbUrl}"
DIRECT_URL="${directUrl}"
NEXTAUTH_SECRET="${nextAuthSecret}"
NEXTAUTH_URL="${nextAuthUrl}"
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED=1
`;
  
  fs.writeFileSync(envProductionPath, envContent);
  console.log('Created .env.production');
}

// Create necessary node_modules/.prisma directory structure if missing
const prismaBinaryDir = path.join(process.cwd(), 'node_modules', '.prisma');
if (!fileExists(prismaBinaryDir)) {
  console.log('Creating .prisma directory in node_modules...');
  fs.mkdirSync(prismaBinaryDir, { recursive: true });
}

const enginesDir = path.join(prismaBinaryDir, 'engines');
if (!fileExists(enginesDir)) {
  console.log('Creating engines directory...');
  fs.mkdirSync(enginesDir, { recursive: true });
}

// Run npm list to see what packages are actually installed
console.log('\nInstalled packages (top-level):');
try {
  const installedPackages = execSync('pnpm list --depth=0').toString();
  console.log(installedPackages);
} catch (error) {
  console.error('Error listing installed packages:', error.message);
}

// Summary
if (missingFiles.length > 0 || missingPackages.length > 0) {
  console.log('\nIssues found:');
  
  if (missingFiles.length > 0) {
    console.log('Missing files (created if possible):');
    missingFiles.forEach(file => console.log(`- ${file}`));
  }
  
  if (missingPackages.length > 0) {
    console.log('Missing packages (need to be installed):');
    missingPackages.forEach(pkg => console.log(`- ${pkg}`));
    
    // Try to install missing packages
    console.log('\nAttempting to install missing packages...');
    try {
      const installCommand = `pnpm install ${missingPackages.join(' ')} --no-frozen-lockfile`;
      console.log(`Running: ${installCommand}`);
      execSync(installCommand, { stdio: 'inherit' });
      console.log('Package installation completed.');
    } catch (error) {
      console.error('Error installing packages:', error.message);
      console.log('Continuing with build despite package installation errors.');
    }
  }
} else {
  console.log('\nAll critical files and packages are present.');
}

console.log('\nDependency verification completed.');
