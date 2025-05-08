/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add external dependencies for Node.js modules
    if (isServer) {
      config.externals = [
        ...config.externals,
        { "node:fs/promises": "commonjs node:fs/promises" },
        { "node:child_process": "commonjs node:child_process" },
        { "node:fs": "commonjs node:fs" },
        { "node:module": "commonjs node:module" },
      ];
    }

    return config;
  },
  experimental: {
    appDir: true, // Ensure this is enabled if you're using the Next.js App Router
  },
};

module.exports = nextConfig;
