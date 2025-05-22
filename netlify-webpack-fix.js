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
