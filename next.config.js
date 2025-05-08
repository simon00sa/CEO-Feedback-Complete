/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Alias node-prefixed core modules to their plain counterparts
    config.resolve.alias = {
      ...config.resolve.alias,
      "node:fs": "fs",
      "node:path": "path",
      "node:os": "os",
      "node:url": "url",
      "node:process": "process",
    };

    return config;
  },
};

module.exports = nextConfig;
