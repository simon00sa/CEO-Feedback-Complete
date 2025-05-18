/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure compatibility with Netlify's Next.js plugin
  output: 'standalone',
  
  // Image optimization for Netlify
  images: {
    domains: ['avatars.githubusercontent.com'], // Add your necessary domains here
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // Compression for better performance
  compress: true,
  
  // Ignore TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Fix webpack conflicts with LRU cache and other Node.js modules
  webpack: (config, { webpack, isServer }) => {
    if (isServer) {
      // Force lru-cache to resolve to a new version that works with webpack 5
      config.resolve.alias = {
        ...config.resolve.alias,
        'lru-cache': require.resolve('lru-cache')
      };
    }
    
    // Avoid issues with problematic packages
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    
    return config;
  },
  
  // Experimental features for compatibility
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  },
};

module.exports = nextConfig;
