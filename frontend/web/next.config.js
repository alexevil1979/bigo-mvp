/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA конфигурация
  // Для полной PWA поддержки установите next-pwa
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    NEXT_PUBLIC_SOCKET_URL: process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    // WebRTC TURN сервер для мобильных устройств
    NEXT_PUBLIC_WEBRTC_TURN_SERVER: process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER || 'turn:bigo.1tlt.ru:3478?transport=udp',
    NEXT_PUBLIC_WEBRTC_TURN_SECRET: process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET || '',
    NEXT_PUBLIC_WEBRTC_TURN_USERNAME: process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME || '',
    NEXT_PUBLIC_WEBRTC_TURN_PASSWORD: process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD || ''
  }
};

module.exports = nextConfig;

