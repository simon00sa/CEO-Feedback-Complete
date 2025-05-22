// netlify-webpack-fix.js
const fs = require('fs');
const path = require('path');

console.log('Applying webpack fixes for lru-cache...');

// Path to the problematic file
const lruCachePath = path.join(process.cwd(), 'node_modules', 'lru-cache', 'dist', 'esm', 'index.js');

if (fs.existsSync(lruCachePath)) {
  console.log(`Found lru-cache at ${lruCachePath}`);
  
  // Read the file content
  let content = fs.readFileSync(lruCachePath, 'utf8');
  
  // Check if the file contains the problematic declaration
  if (content.includes('const _delete = (')) {
    console.log('Found problematic _delete declaration, fixing...');
    
    // Replace the problematic declaration
    content = content.replace('const _delete = (', 'const _deleteItem = (');
    
    // Replace all usages of _delete with _deleteItem
    content = content.replace(/\b_delete\(/g, '_deleteItem(');
    
    // Write the fixed content back to the file
    fs.writeFileSync(lruCachePath, content);
    console.log('Fixed lru-cache module successfully');
  } else {
    console.log('No problematic _delete declaration found, skipping fix');
  }
} else {
  console.log(`lru-cache module not found at ${lruCachePath}`);
}

// Additional check for Prisma schema path
const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const rootSchemaPath = path.join(process.cwd(), 'schema.prisma');

console.log('Checking Prisma schema paths...');
if (fs.existsSync(prismaSchemaPath)) {
  console.log(`✓ Prisma schema found at: ${prismaSchemaPath}`);
  
  // Create a copy in root if it doesn't exist (some tools look for it there)
  if (!fs.existsSync(rootSchemaPath)) {
    try {
      fs.copyFileSync(prismaSchemaPath, rootSchemaPath);
      console.log(`Created schema copy at root: ${rootSchemaPath}`);
    } catch (err) {
      console.error(`Error copying schema to root: ${err.message}`);
    }
  }
} else {
  console.error(`✗ Prisma schema not found at expected location: ${prismaSchemaPath}`);
  
  // Check if schema exists in root and copy to prisma dir
  if (fs.existsSync(rootSchemaPath)) {
    console.log(`Found schema in root, copying to prisma directory...`);
    try {
      // Ensure prisma directory exists
      if (!fs.existsSync(path.dirname(prismaSchemaPath))) {
        fs.mkdirSync(path.dirname(prismaSchemaPath), { recursive: true });
      }
      fs.copyFileSync(rootSchemaPath, prismaSchemaPath);
      console.log(`Copied schema to: ${prismaSchemaPath}`);
    } catch (err) {
      console.error(`Error copying schema to prisma dir: ${err.message}`);
    }
  } else {
    console.error('Prisma schema not found in root directory either!');
  }
}

console.log('Webpack and Prisma fixes completed');
