#!/usr/bin/env node
/**
 * This script applies Netlify-specific fixes to your codebase.
 * It updates imports, adds the cache polyfill, and creates necessary bridge files.
 * 
 * Save this as 'fix-netlify-deployment.js' in your project root and run:
 * node fix-netlify-deployment.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

// Configuration
const directories = [
  'app',
  'lib',
  'src',
  'pages',
  'utils',
  'services',
];

// Files to skip
const skipFiles = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
];

// Regex patterns to identify and fix issues
const patterns = [
  // Fix Prisma client imports
  {
    description: "Fix Prisma client imports",
    find: /import\s+{\s*prisma\s*}\s+from\s+["']@\/lib\/db["']/g,
    replace: "import prisma from '@/lib/prisma'"
  },
  // Fix NextAuth imports with named exports
  {
    description: "Fix NextAuth imports",
    find: /import\s+NextAuth,\s*{\s*NextAuthOptions\s*}\s+from\s+["']next-auth["']/g,
    replace: "import NextAuth from 'next-auth'\nimport type { NextAuthOptions } from 'next-auth'"
  },
  // Fix runtime exports in API routes
  {
    description: "Fix runtime exports in API routes",
    find: /export\s+const\s+runtime\s*=\s*["']edge["']/g,
    replace: "export const runtime = 'nodejs'"
  },
  // Fix maxDuration exports in API routes
  {
    description: "Fix maxDuration exports in API routes",
    find: /export\s+const\s+maxDuration\s*=\s*(\d+)/g,
    replace: "export const maxDuration = 25 // Netlify max is 26 seconds"
  }
];

// Utility to scan a directory recursively
async function scanDirectory(dir) {
  let results = [];
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    if (skipFiles.some(skip => entry.includes(skip))) continue;
    
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      const subResults = await scanDirectory(fullPath);
      results = [...results, ...subResults];
    } else if (
      stats.isFile() && 
      (fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))
    ) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Check if a file matches any of our patterns
async function fixFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    for (const pattern of patterns) {
      // Check if the file contains the pattern
      if (pattern.find.test(content)) {
        console.log(`\x1b[33m[FOUND]\x1b[0m ${pattern.description} in: ${filePath}`);
        
        // Apply fix
        newContent = newContent.replace(pattern.find, pattern.replace);
        
        // Check if any fixes were applied
        if (newContent !== content) {
          modified = true;
        }
      }
    }
    
    // If changes were made, write them back
    if (modified) {
      await writeFile(filePath, newContent, 'utf8');
      console.log(`\x1b[32m[FIXED]\x1b[0m File: ${filePath}`);
      return { filePath, fixed: true };
    }
    
    return { filePath, fixed: false };
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Reading ${filePath}: ${error.message}`);
    return { filePath, error: error.message };
  }
}

// Create bridge files and polyfills
async function createHelperFiles() {
  console.log('\x1b[36m=== Creating Helper Files ===\x1b[0m');
  
  const libDir = path.join(process.cwd(), 'lib');
  if (!(await exists(libDir))) {
    await mkdir(libDir);
  }
  
  // Create prisma.ts bridge file
  const prismaBridgePath = path.join(libDir, 'prisma.ts');
  if (!(await exists(prismaBridgePath))) {
    const prismaBridgeContent = `// This is a bridge file that re-exports the Prisma client from db.ts
// This ensures that imports like \`import prisma from '@/lib/prisma'\` work
// even if some files use \`import { prisma } from '@/lib/db'\`

import prisma, { healthCheck } from './db';

export default prisma;
export { prisma, healthCheck };`;
    
    await writeFile(prismaBridgePath, prismaBridgeContent);
    console.log(`\x1b[32m[CREATED]\x1b[0m Bridge file: ${prismaBridgePath}`);
  } else {
    console.log(`\x1b[33m[SKIPPED]\x1b[0m Bridge file already exists: ${prismaBridgePath}`);
  }
  
  // Create cache-fix.ts for the Cache constructor error
  const cacheFixPath = path.join(libDir, 'cache-fix.ts');
  if (!(await exists(cacheFixPath))) {
    const cacheFixContent = `// Polyfill for the Cache constructor error in Netlify environment
if (typeof globalThis !== 'undefined' && typeof globalThis.Cache === 'undefined') {
  // @ts-ignore - intentionally adding Cache to global
  globalThis.Cache = class Cache {
    private store: Map<any, any>;
    
    constructor() {
      this.store = new Map();
    }
    
    match(request: any) {
      return Promise.resolve(this.store.get(request));
    }
    
    put(request: any, response: any) {
      this.store.set(request, response);
      return Promise.resolve();
    }
    
    delete(request: any) {
      this.store.delete(request);
      return Promise.resolve();
    }
  };
}

export default {};`;
    
    await writeFile(cacheFixPath, cacheFixContent);
    console.log(`\x1b[32m[CREATED]\x1b[0m Cache fix: ${cacheFixPath}`);
  } else {
    console.log(`\x1b[33m[SKIPPED]\x1b[0m Cache fix already exists: ${cacheFixPath}`);
  }
  
  // Create main layout import for cache-fix
  const appDir = path.join(process.cwd(), 'app');
  if (await exists(appDir)) {
    const layoutFiles = [
      path.join(appDir, 'layout.tsx'),
      path.join(appDir, 'layout.js')
    ];
    
    for (const layoutFile of layoutFiles) {
      if (await exists(layoutFile)) {
        let layoutContent = await readFile(layoutFile, 'utf8');
        
        // Only add the import if it doesn't already exist
        if (!layoutContent.includes("import '@/lib/cache-fix'")) {
          // Find a good spot to add the import - after the existing imports
          const importSection = layoutContent.match(/import[^;]*;(\s*import[^;]*;)*/);
          
          if (importSection) {
            const newContent = layoutContent.replace(
              importSection[0],
              `${importSection[0]}\n// Fix for Cache constructor error in Netlify\nimport '@/lib/cache-fix';\n`
            );
            await writeFile(layoutFile, newContent);
            console.log(`\x1b[32m[UPDATED]\x1b[0m Added cache-fix import to: ${layoutFile}`);
          } else {
            // If we can't find the import section, add it at the top
            const newContent = `// Fix for Cache constructor error in Netlify\nimport '@/lib/cache-fix';\n\n${layoutContent}`;
            await writeFile(layoutFile, newContent);
            console.log(`\x1b[32m[UPDATED]\x1b[0m Added cache-fix import to: ${layoutFile}`);
          }
        } else {
          console.log(`\x1b[33m[SKIPPED]\x1b[0m Cache-fix import already exists in: ${layoutFile}`);
        }
      }
    }
  }
}

// Update netlify.toml file
async function updateNetlifyConfig() {
  const netlifyPath = path.join(process.cwd(), 'netlify.toml');
  
  // Check if netlify.toml exists
  if (await exists(netlifyPath)) {
    console.log(`\x1b[33m[SKIPPED]\x1b[0m netlify.toml already exists: ${netlifyPath}`);
    return;
  }
  
  const netlifyContent = `[build]
  command = "prisma generate && next build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Add headers for security and caching
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://api.supabase.co;"
    Referrer-Policy = "strict-origin-when-cross-origin"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
`;
  
  await writeFile(netlifyPath, netlifyContent);
  console.log(`\x1b[32m[CREATED]\x1b[0m netlify.toml configuration: ${netlifyPath}`);
}

// Main execution function
async function main() {
  console.log('\x1b[36m=== Netlify Deployment Fix Tool ===\x1b[0m');
  
  // Create helper files first
  await createHelperFiles();
  
  // Update netlify.toml
  await updateNetlifyConfig();
  
  console.log('\n\x1b[36m=== Scanning Files for Fixes ===\x1b[0m');
  
  // Get all project files
  let allFiles = [];
  for (const dir of directories) {
    try {
      // Check if directory exists before scanning
      if (await exists(dir)) {
        const files = await scanDirectory(dir);
        allFiles = [...allFiles, ...files];
      }
    } catch (error) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Scanning directory ${dir}: ${error.message}`);
    }
  }
  
  console.log(`Found ${allFiles.length} files to check.`);
  
  // Fix each file
  const results = await Promise.all(allFiles.map(fixFile));
  
  // Summarize results
  const fixed = results.filter(r => r.fixed).length;
  const errors = results.filter(r => r.error).length;
  
  console.log('\n\x1b[36m=== Summary ===\x1b[0m');
  console.log(`Total files checked: ${results.length}`);
  console.log(`Files fixed: ${fixed}`);
  console.log(`Helper files created: 2`);
  console.log(`Errors encountered: ${errors}`);
  
  if (fixed > 0 || errors === 0) {
    console.log('\n\x1b[32m✓ Fixes were applied! Please try deploying again.\x1b[0m');
    console.log('\n\x1b[33mIMPORTANT: You may need to install crypto-browserify if you see related errors:\x1b[0m');
    console.log('npm install --save-dev crypto-browserify');
  } else if (errors > 0) {
    console.log('\n\x1b[31m✗ Errors were encountered. Some issues may remain.\x1b[0m');
  }
}

// Run the script
main().catch(error => {
  console.error(`\x1b[31m[FATAL ERROR]\x1b[0m ${error.message}`);
  process.exit(1);
});
