// pre-download-engines.js
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
const engineVersion = '6.8.0-43.2060c79ba17c6bb9f5823312b6f6b7f4a845738e'; // Match your @prisma/engines-version

// Download query engine
const downloadEngine = (engineType, targetPlatform) => {
  const fileName = `${engineType}-${targetPlatform}.gz`;
  const engineUrl = `https://binaries.prisma.sh/all_commits/${engineVersion}/${fileName}`;
  const outputPath = path.join(enginesDir, fileName);
  
  console.log(`Downloading ${engineUrl} to ${outputPath}`);
  
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
