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
      "node:util": "util",
      "node:stream": "stream",
      "node:buffer": "buffer",
      "node:crypto": "crypto",
      "node:events": "events",
    };
    
    // For client-side: provide empty implementations for Node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        child_process: false,
        tls: false,
        net: false,
        dns: false,
      };
    }
    
    // Exclude Node.js core modules from being bundled on the server side
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        "nodemailer",
        "pg-native",
        ({ request }, callback) => {
          // Handle node: prefixed modules explicitly
          if (request.startsWith("node:")) {
            return callback(null, `commonjs ${request.substring(5)}`);
          }
          callback();
        },
      ];
    }
    
    return config;
  },
};

module.exports = nextConfig;
