/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: process.env.NEXT_PUBLIC_DOMAIN || 'localhost' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_DOMAIN || 'localhost',
      ].filter(Boolean),
      bodySizeLimit: '500mb',
    },
  },
}

module.exports = nextConfig
