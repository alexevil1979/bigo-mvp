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
      PORT: 3000
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

