#!/usr/bin/env node
/**
 * This script searches through your codebase to find and fix instances of 
 * invalid Prisma configuration using previewFeatures in the PrismaClient constructor.
 * 
 * Save this as 'fix-prisma-constructor.js' in your project root and run:
 * node fix-prisma-constructor.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

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
  {
    // Find PrismaClient initialization with previewFeatures
    find: /new\s+PrismaClient\s*\(\s*\{[^}]*previewFeatures\s*:/g,
    // Check full constructor context
    context: /new\s+PrismaClient\s*\(\s*\{[^}]*\}\s*\)/g,
    // Common patterns to fix
    fixes: [
      {
        // Remove previewFeatures property entirely
        find: /,?\s*previewFeatures\s*:\s*\[[^\]]*\]/g,
        replace: ''
      },
      {
        // Remove empty objects after removing previewFeatures
        find: /new\s+PrismaClient\s*\(\s*\{\s*\}\s*\)/g,
        replace: 'new PrismaClient()'
      },
      {
        // Fix trailing commas
        find: /,\s*\}/g,
        replace: '}'
      }
    ]
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
async function checkFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    for (const pattern of patterns) {
      // Check if the file contains the pattern
      if (pattern.find.test(content)) {
        console.log(`\x1b[33m[FOUND]\x1b[0m Issue in file: ${filePath}`);
        
        // Apply fixes
        for (const fix of pattern.fixes) {
          newContent = newContent.replace(fix.find, fix.replace);
        }
        
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

// Main execution function
async function main() {
  console.log('\x1b[36m=== Prisma Constructor Validation Fix Tool ===\x1b[0m');
  console.log('Scanning project files for invalid Prisma client initialization...\n');
  
  // Get all project files
  let allFiles = [];
  for (const dir of directories) {
    try {
      // Check if directory exists before scanning
      if (fs.existsSync(dir)) {
        const files = await scanDirectory(dir);
        allFiles = [...allFiles, ...files];
      }
    } catch (error) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Scanning directory ${dir}: ${error.message}`);
    }
  }
  
  console.log(`Found ${allFiles.length} files to check.`);
  
  // Check and fix each file
  const results = await Promise.all(allFiles.map(checkFile));
  
  // Summarize results
  const fixed = results.filter(r => r.fixed).length;
  const errors = results.filter(r => r.error).length;
  
  console.log('\n\x1b[36m=== Summary ===\x1b[0m');
  console.log(`Total files checked: ${results.length}`);
  console.log(`Files fixed: ${fixed}`);
  console.log(`Errors encountered: ${errors}`);
  
  if (fixed > 0) {
    console.log('\n\x1b[32m✓ Fixes were applied! Please try deploying again.\x1b[0m');
  } else if (errors > 0) {
    console.log('\n\x1b[31m✗ Errors were encountered. Some issues may remain.\x1b[0m');
  } else {
    console.log('\n\x1b[33m⚠ No issues found with the current patterns. The issue might be elsewhere.\x1b[0m');
  }
}

// Run the script
main().catch(error => {
  console.error(`\x1b[31m[FATAL ERROR]\x1b[0m ${error.message}`);
  process.exit(1);
});
