/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', '@auth/prisma-adapter'],
  webpack: (config) => {
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

export default nextConfig;
