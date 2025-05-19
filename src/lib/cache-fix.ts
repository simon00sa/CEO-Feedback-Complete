// Polyfill for the Cache constructor error in Netlify environment
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

export default {};
