/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure compatibility with Netlify's Next.js plugin
  output: 'standalone',
  
  // Image optimization for Netlify
  images: {
    domains: ['avatars.githubusercontent.com'], // Add your necessary domains here
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: true, // Add this for Netlify compatibility
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
        'lru-cache': require.resolve('lru-cache'),
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
      // Add crypto-browserify to fix Cache constructor error
      crypto: require.resolve('crypto-browserify'),
      net: false,
      tls: false,
      // Add additional polyfills for constructor errors
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      // Add additional fallbacks for Netlify
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
      // Add buffer to client-side bundle
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
    // Prevent optimization issues that can cause constructor errors
    optimizeCss: false,
    // Add this to fix some page loading issues
    largePageDataBytes: 128 * 1000, // 128KB
  },
  
  // Additional Netlify-specific optimizations
  poweredByHeader: false, // Remove the X-Powered-By header for security
  
  // Cache optimization
  generateEtags: true,
  
  // Simple build ID for Netlify
  generateBuildId: () => 'build',
  
  // Disable static optimization for auth-related routes
  staticPageGenerationTimeout: 120,
  distDir: '.next',
};

module.exports = nextConfig;
