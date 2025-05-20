// scripts/fix-nextauth.js
const fs = require('fs');
const path = require('path');

console.log('Fixing NextAuth routes for Netlify...');

try {
  // Create the auth cache fix if it doesn't exist
  const libDir = path.join(process.cwd(), 'lib');
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
    console.log(`Created lib directory: ${libDir}`);
  }
  
  const authCacheFixPath = path.join(libDir, 'auth-cache-fix.ts');
  if (!fs.existsSync(authCacheFixPath)) {
    const authCacheFixContent = `// lib/auth-cache-fix.ts
// Polyfill for the constructor errors in Netlify environment

// Fix for Cache constructor
if (typeof globalThis !== 'undefined' && typeof globalThis.Cache === 'undefined') {
  console.log('Applying Cache polyfill');
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

// Fix for other constructors that might cause similar issues
if (typeof globalThis !== 'undefined') {
  const constructorNames = ['TextEncoder', 'TextDecoder', 'Headers
