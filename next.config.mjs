/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  serverExternalPackages: ['@vercel/blob', '@vercel/sandbox'],
  outputFileTracingIncludes: {
    '/api/verification/run': [
      './sandbox/notification-service/template/package.json',
      './sandbox/notification-service/template/tsconfig.json',
      './sandbox/notification-service/template/vitest.config.ts',
    ],
  },
};
export default nextConfig;
