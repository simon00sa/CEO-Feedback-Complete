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
  
  // Fix webpack conflicts and suppress ALL debug logging
  webpack: (config, { webpack, isServer, dev }) => {
    // Completely suppress all debug logs and warnings
    config.infrastructureLogging = {
      level: 'error',
      debug: false,
    };
    
    config.stats = {
      all: false,
      errors: true,
      warnings: false,
      logging: 'error',
      moduleTrace: false,
      builtAt: false,
      timings: false,
    };
    
    // Completely suppress Next.js internal plugin warnings
    config.ignoreWarnings = [
      /next:jsconfig-paths-plugin/,
      /next-metadata-image-loader/,
      /next-app-loader/,
      /next-route-loader/,
      /moduleName did not match any paths pattern/,
      { module: /node_modules/ },
      /Failed to parse source map/,
      /Critical dependency/,
      /the request of a dependency is an expression/,
      /skipping request/,
      /inside node_modules/
    ];
    
    // Override module resolution for Next.js internal modules
    config.resolve.alias = {
      ...config.resolve.alias,
      // Fix lru-cache
      'lru-cache': require.resolve('lru-cache'),
      // Project aliases
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      // Suppress Next.js internal loader warnings by providing explicit paths
      'next-app-loader': path.resolve(__dirname, 'node_modules/next/dist/build/webpack/loaders/next-app-loader'),
      'next-route-loader': path.resolve(__dirname, 'node_modules/next/dist/build/webpack/loaders/next-route-loader'),
      'next-metadata-image-loader': path.resolve(__dirname, 'node_modules/next/dist/build/webpack/loaders/next-metadata-image-loader'),
    };
    
    // Fix lru-cache module parsing issue
    config.module.rules.push({
      test: /node_modules\/lru-cache/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    // Exclude problematic packages
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
    
    // Add buffer polyfill for client-side
    if (!isServer ) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    
    // Disable verbose plugin logging
    config.plugins = config.plugins.map(plugin => {
      if (plugin.constructor && plugin.constructor.name === 'JsConfigPathsPlugin') {
        // If we can disable the plugin's verbose logging, do it
        plugin.verbose = false;
      }
      return plugin;
    });
    
    return config;
  },
  
  // Experimental features
  experimental: {
    optimizeCss: false,
    largePageDataBytes: 128 * 1000,
    esmExternals: 'loose', // Changed from true to 'loose' for better compatibility
  },
  
  // Additional optimizations
  poweredByHeader: false,
  generateEtags: true,
  generateBuildId: () => 'build',
  staticPageGenerationTimeout: 120,
  distDir: '.next',
  
  // Completely disable all logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

module.exports = nextConfig;
