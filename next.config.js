/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', '@auth/prisma-adapter'],
  webpack: (config) => {
    // Handle Node.js core modules
    config.externals = {
      ...config.externals,
      "node:fs/promises": "commonjs2 node:fs/promises",
      "node:child_process": "commonjs2 node:child_process",
      "node:fs": "commonjs2 node:fs",
      "node:module": "commonjs2 node:module",
    };
    
    // Maintain your existing fallbacks
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      async_hooks: false,
      child_process: false,
      events: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;
