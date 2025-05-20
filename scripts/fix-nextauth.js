// scripts/fix-nextauth.js
const fs = require('fs');
const path = require('path');

console.log('Fixing NextAuth routes for Netlify...');

try {
  // Create the auth cache fix if it doesn't exist
  const authCacheFixPath = path.join(process.cwd(), 'lib', 'auth-cache-fix.ts');
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
  const constructorNames = ['TextEncoder', 'TextDecoder', 'Headers', 'Request', 'Response', 'FormData', 'URLSearchParams'];
  
  constructorNames.forEach(name => {
    if (typeof globalThis[name] === 'undefined') {
      console.log(\`Applying \${name} polyfill\`);
      // @ts-ignore - intentionally adding constructors to global
      globalThis[name] = class {
        constructor() {
          console.log(\`\${name} constructor called (polyfill)\`);
        }
      };
    }
  });
}

export default {};`;
    
    // Ensure the lib directory exists
    const libDir = path.join(process.cwd(), 'lib');
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }
    
    // Create the auth-cache-fix.ts file
    fs.writeFileSync(authCacheFixPath, authCacheFixContent);
    console.log(`Created auth cache fix at: ${authCacheFixPath}`);
  }
  
  // Check if the NextAuth route exists
  const nextAuthDir = path.join(process.cwd(), 'app', 'api', 'auth', '[...nextauth]');
  if (!fs.existsSync(nextAuthDir)) {
    // Create the directory structure
    fs.mkdirSync(nextAuthDir, { recursive: true });
    console.log(`Created NextAuth directory: ${nextAuthDir}`);
    
    // Create the route.ts file
    const routePath = path.join(nextAuthDir, 'route.ts');
    const routeContent = `// Import the cache fix at the top to ensure it's loaded first
import '@/lib/auth-cache-fix';

// Your existing imports
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Use dynamic imports for API handlers to prevent SSR issues
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Disable SSR for this route
export const dynamic = 'force-dynamic';
// Configure the Netlify serverless function
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit`;
    
    fs.writeFileSync(routePath, routeContent);
    console.log(`Created NextAuth route at: ${routePath}`);
  } else {
    console.log(`NextAuth directory already exists: ${nextAuthDir}`);
  }
  
  console.log('NextAuth routes fixed for Netlify');
} catch (error) {
  console.error('Error fixing NextAuth routes:', error);
}
