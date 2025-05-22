/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Ensure compatibility with Netlify's Next.js plugin
  output: 'standalone',
  
  // Image optimization for Netlify
  images: {
    domains: ['avatars.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: true,
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
  webpack: (config, { webpack, isServer, dev }) => {
    // Suppress debug logs and warnings in production
    if (!dev) {
      config.infrastructureLogging = {
        level: 'warn',
        debug: false,
      };
      
      config.stats = {
        ...config.stats,
        logging: 'warn',
        moduleTrace: false,
        warnings: false,
        warningsFilter: [
          /next:jsconfig-paths-plugin/,
          /next-metadata-image-loader/,
          /moduleName did not match any paths pattern/,
        ],
      };
    }
    
    // Fix lru-cache module parsing issue
    config.module.rules.push({
      test: /node_modules\/lru-cache/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    // Exclude lru-cache from being processed by next-flight-client-module-loader
    config.module.rules.push({
      test: /node_modules\/lru-cache/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
          cacheDirectory: true,
        },
      },
    });
    
    // Fix module resolution for Next.js loaders
    config.resolve.alias = {
      ...config.resolve.alias,
      'lru-cache': require.resolve('lru-cache'),
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/types': path.resolve(__dirname, './src/types'),
      // Fix Next.js loader paths
      'next-metadata-image-loader': path.resolve(__dirname, 'node_modules/next/dist/build/webpack/loaders/next-metadata-image-loader'),
      'next-app-loader': path.resolve(__dirname, 'node_modules/next/dist/build/webpack/loaders/next-app-loader'),
      'next-route-loader': path.resolve(__dirname, 'node_modules/next/dist/build/webpack/loaders/next-route-loader'),
    };
    
    // Avoid issues with problematic packages
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: require.resolve('crypto-browserify'),
      net: false,
      tls: false,
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      child_process: false,
      dns: false,
      http2: false,
      process: false,
      querystring: false,
      url: false,
      util: false,
      zlib: false,
    };
    
    // Add buffer polyfill
    if (!isServer) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    
    // Suppress specific warnings
    config.ignoreWarnings = [
      /next:jsconfig-paths-plugin/,
      /next-metadata-image-loader/,
      /moduleName did not match any paths pattern/,
      { module: /node_modules/ },
    ];
    
    return config;
  },
  
  // Experimental features to fix Netlify issues
  experimental: {
    optimizeCss: false,
    largePageDataBytes: 128 * 1000,
    esmExternals: true,
  },
  
  // Additional Netlify-specific optimizations
  poweredByHeader: false,
  generateEtags: true,
  generateBuildId: () => 'build',
  staticPageGenerationTimeout: 120,
  distDir: '.next',
  
  // Suppress debug logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

module.exports = nextConfig;
