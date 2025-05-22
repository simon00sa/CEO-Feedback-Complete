/** @type {import('next').NextConfig} */
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
  webpack: (config, { webpack, isServer }) => {
    // Reduce debug output to suppress jsconfig-paths-plugin warnings
    config.stats = {
      ...config.stats,
      logging: 'warn',
      moduleTrace: false,
      warnings: false,
    };
    
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
    
    if (isServer) {
      // Force lru-cache to resolve to a specific version
      config.resolve.alias = {
        ...config.resolve.alias,
        'lru-cache': require.resolve('lru-cache'),
      };
    } else {
      // Client-side alias for lru-cache
      config.resolve.alias = {
        ...config.resolve.alias,
        'lru-cache': require.resolve('lru-cache'),
      };
    }
    
    // Fix path resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
      '@/components': './src/components',
      '@/lib': './src/lib',
      '@/app': './src/app',
      '@/types': './src/types',
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
    
    return config;
  },
  
  // Experimental features to fix Netlify issues
  experimental: {
    optimizeCss: false,
    largePageDataBytes: 128 * 1000,
    esmExternals: true, // Better handling of ES modules
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
