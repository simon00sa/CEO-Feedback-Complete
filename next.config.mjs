/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', '@auth/prisma-adapter'],
  webpack: (conf) => {
    conf.resolve.fallback = {
      ...conf.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      async_hooks: false,
      child_process: false,
      events: false,
    };
    return conf;
  },
};

export default nextConfig;
