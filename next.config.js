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
};

module.exports = nextConfig;
