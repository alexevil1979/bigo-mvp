/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA конфигурация
  // Для полной PWA поддержки установите next-pwa
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    NEXT_PUBLIC_SOCKET_URL: process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  }
};

module.exports = nextConfig;

