module.exports = {
  apps: [{
    name: 'conference-registration',
    script: 'backend/server.js',
    instances: 2, // Use 2 instances for better performance
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/conference-registration-error.log',
    out_file: '/var/log/pm2/conference-registration-out.log',
    log_file: '/var/log/pm2/conference-registration-combined.log',
    time: true,
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      'frontend/public/uploads'
    ],
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    autorestart: true,
    cron_restart: '0 2 * * *', // Restart every day at 2 AM
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}; 