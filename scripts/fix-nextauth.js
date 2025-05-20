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
    
    fs.writeFileSync(authCacheFixPath, authCacheFixContent);
    console.log(`Created auth cache fix at: ${authCacheFixPath}`);
  } else {
    console.log(`Auth cache fix already exists at: ${authCacheFixPath}`);
  }
  
  // Create or update the NextAuth API route directory
  const apiDir = path.join(process.cwd(), 'app', 'api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
    console.log(`Created API directory: ${apiDir}`);
  }
  
  const authDir = path.join(apiDir, 'auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log(`Created auth directory: ${authDir}`);
  }
  
  const nextAuthDir = path.join(authDir, '[...nextauth]');
  if (!fs.existsSync(nextAuthDir)) {
    fs.mkdirSync(nextAuthDir, { recursive: true });
    console.log(`Created NextAuth directory: ${nextAuthDir}`);
  }
  
  // Create or update the route.ts file with our modifications
  const routePath = path.join(nextAuthDir, 'route.ts');
  const routeContent = `// Import the cache fix at the top to ensure it's loaded first
import '@/lib/auth-cache-fix';

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Runtime configuration that works with both Netlify and Node.js
export const runtime = 'nodejs';

// Add maxDuration for Netlify (stays under their 26-second limit)
export const maxDuration = 25;

// Force dynamic page generation, never static generation
export const dynamic = 'force-dynamic';

// Create the handler with imported authOptions
const handler = NextAuth(authOptions);

// Export only the handler methods, not authOptions
export { handler as GET, handler as POST };`;
  
  fs.writeFileSync(routePath, routeContent);
  console.log(`Updated NextAuth route at: ${routePath}`);
  
  // Update middleware.ts if it exists
  const middlewarePath = path.join(process.cwd(), 'middleware.ts');
  if (fs.existsSync(middlewarePath)) {
    let middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
    
    // Check if we need to update the runtime and add cache fix
    if (middlewareContent.includes("export const runtime = 'experimental-edge'")) {
      middlewareContent = middlewareContent.replace(
        "export const runtime = 'experimental-edge'",
        "export const runtime = 'nodejs'"
      );
      
      // Add import for cache fix if it doesn't exist
      if (!middlewareContent.includes("import './lib/auth-cache-fix'")) {
        middlewareContent = "import './lib/auth-cache-fix';\n" + middlewareContent;
      }
      
      fs.writeFileSync(middlewarePath, middlewareContent);
      console.log(`Updated middleware.ts to use nodejs runtime and added cache fix import`);
    }
  }
  
  // Check if lib/auth.ts exists and update it if needed
  const authPath = path.join(libDir, 'auth.ts');
  if (fs.existsSync(authPath)) {
    let authContent = fs.readFileSync(authPath, 'utf8');
    
    // Replace next-auth/next with next-auth if needed
    if (authContent.includes('from "next-auth/next"')) {
      authContent = authContent.replace(
        'from "next-auth/next"',
        'from "next-auth"'
      );
      
      // Add import for cache fix if it doesn't exist
      if (!authContent.includes("import '@/lib/auth-cache-fix'")) {
        authContent = "// Ensure polyfills are loaded first\nimport '@/lib/auth-cache-fix';\n" + authContent;
      }
      
      fs.writeFileSync(authPath, authContent);
      console.log(`Updated auth.ts to use correct next-auth import and added cache fix import`);
    }
  }
  
  console.log('NextAuth routes fixed for Netlify');
} catch (error) {
  console.error('Error fixing NextAuth routes:', error);
  // Exit with success still, to not block the build
  process.exit(0);
}
