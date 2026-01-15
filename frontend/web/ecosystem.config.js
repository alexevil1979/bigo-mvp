const path = require('path');

module.exports = {
  apps: [{
    name: 'nio-frontend',
    script: 'npm',
    args: 'start',
    cwd: path.resolve(__dirname),
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // WebRTC TURN сервер для мобильных устройств
      NEXT_PUBLIC_WEBRTC_TURN_SERVER: process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER || 'turn:bigo.1tlt.ru:3478?transport=udp',
      NEXT_PUBLIC_WEBRTC_TURN_SECRET: process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET || '',
      NEXT_PUBLIC_WEBRTC_TURN_USERNAME: process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME || '',
      NEXT_PUBLIC_WEBRTC_TURN_PASSWORD: process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD || '',
      // Socket и API URL
      NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.bigo.1tlt.ru',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.bigo.1tlt.ru'
    },
    error_file: './logs/nio-frontend-error.log',
    out_file: './logs/nio-frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', '.next', 'logs']
  }]
};

