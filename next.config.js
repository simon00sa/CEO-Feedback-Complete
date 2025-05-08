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
      "node:querystring": "querystring",
      "node:string_decoder": "string_decoder",
      "node:timers": "timers",
      "node:assert": "assert",
    };

    // Fallbacks for client-side builds
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
        module: false, // Ensure module is excluded on client-side
      };
    }

    // Prevent server-side dependencies from being bundled
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        ({ request }, callback) => {
          // Exclude modules that are Node.js core modules
          const isNodeModule = [
            "child_process",
            "fs",
            "os",
            "path",
            "module",
            "fs/promises",
          ].some((module) => request === module || request.startsWith(`node:${module}`));

          if (isNodeModule) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
        "nodemailer", // Exclude nodemailer from the server-side bundle
        "pg-native",  // Exclude pg-native from the server-side bundle
      ];
    }

    return config;
  },
};

module.exports = nextConfig;
