module.exports = {
  apps: [{
    name: 'electro-backend',
    script: 'index.js',                       // (verifica la ruta real de tu entrypoint)
    cwd: '/home/luami/electrocaja/server',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
