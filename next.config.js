/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
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

    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        ({ request }, callback) => {
          // Exclude Node.js core modules from being bundled
          if (request.startsWith("node:")) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },
};

module.exports = nextConfig;
