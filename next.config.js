/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle external dependencies for server-side only
      config.externals = [
        ...config.externals,
        "nodemailer", // Ensure nodemailer is treated as an external dependency
      ];
    }

    // Alias node-prefixed core modules to their plain counterparts
    config.resolve.alias = {
      ...config.resolve.alias,
      "node:fs": "fs",
      "node:fs/promises": "fs/promises",
      "node:path": "path",
      "node:os": "os",
      "node:process": "process",
      "node:url": "url",
      "node:child_process": "child_process",
      "node:module": "module",
    };

    return config;
  },
};

module.exports = nextConfig;
