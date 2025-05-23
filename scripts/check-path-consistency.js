// scripts/check-path-consistency.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all JS/TS files
const files = glob.sync('**/*.{js,jsx,ts,tsx}', {
  ignore: ['node_modules/**', '.next/**', 'out/**']
});

// Check for import path case consistency
let hasErrors = false;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip node_modules and relative paths that start with .
    if (!importPath.startsWith('.') || importPath.includes('node_modules')) {
      continue;
    }
    
    // Resolve the actual path
    const basedir = path.dirname(file);
    let resolvedPath;
    try {
      // Handle index files and extensions
      const possiblePaths = [
        path.resolve(basedir, importPath),
        path.resolve(basedir, `${importPath}.js`),
        path.resolve(basedir, `${importPath}.ts`),
        path.resolve(basedir, `${importPath}.jsx`),
        path.resolve(basedir, `${importPath}.tsx`),
        path.resolve(basedir, `${importPath}/index.js`),
        path.resolve(basedir, `${importPath}/index.ts`),
        path.resolve(basedir, `${importPath}/index.jsx`),
        path.resolve(basedir, `${importPath}/index.tsx`)
      ];
      
      resolvedPath = possiblePaths.find(p => fs.existsSync(p));
      
      if (!resolvedPath) {
        console.error(`❌ In ${file}: Import path not found: ${importPath}`);
        hasErrors = true;
      }
    } catch (err) {
      console.error(`❌ Error resolving import in ${file}: ${importPath}`, err);
      hasErrors = true;
    }
  }
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log('✅ All import paths are consistent');
}
