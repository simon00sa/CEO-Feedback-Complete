// lib/auth-cache-fix.ts
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
      console.log(`Applying ${name} polyfill`);
      // @ts-ignore - intentionally adding constructors to global
      globalThis[name] = class {
        constructor() {
          console.log(`${name} constructor called (polyfill)`);
        }
      };
    }
  });
}

export default {};
