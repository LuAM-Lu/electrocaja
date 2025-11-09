// server/index.js (ACTUALIZADO CON WHATSAPP Y CRON JOBS)
require('dotenv').config();
const os = require('os');
const { server, inicializarServicios } = require('./src/app');
const cronService = require('./src/services/cronService');

const port = process.env.PORT || 3001;

// Función para obtener IPs de red
const getNetworkIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Saltar direcciones internas y no IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
};

server.listen(port, '0.0.0.0', async () => {
  const networkIPs = getNetworkIPs();

  console.log('🚀 ===== ELECTRO CAJA BACKEND =====');
  console.log(`✅ Servidor iniciado en puerto ${port}`);
  console.log(`📡 Backend disponible en:`);
  console.log(`   - Local:    https://localhost:${port}`);

  // Mostrar todas las IPs de red disponibles
  if (networkIPs.length > 0) {
    networkIPs.forEach(ip => {
      console.log(`   - Red:      https://${ip}:${port}`);
    });
  } else {
    console.log(`   - Red:      (No se detectó IP de red)`);
  }

  console.log(`   - Acceso desde cualquier dispositivo en la red usando las IPs mostradas arriba`);
  console.log('');
  console.log('🔗 Rutas disponibles:');
  console.log(`   - GET  /`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - POST /api/auth/logout`);
  console.log(`   - GET  /api/cajas/actual`);
  console.log(`   - POST /api/cajas/abrir`);
  console.log(`   - POST /api/cajas/cerrar`);
  console.log(`   - POST /api/users/crear`);
  console.log(`   - GET  /api/users`);
  console.log(`   - PUT  /api/users/:id`);
  console.log(`   - GET  /api/inventory/test`);
  console.log(`   - GET  /api/inventory/products`);
  console.log(`   - POST /api/inventory/products`);
  console.log(`   - PUT  /api/inventory/products/:id`);
  console.log(`   - DELETE /api/inventory/products/:id`);
  console.log(`   - GET  /api/inventory/search`);
  console.log(`   - GET  /api/inventory/stats`);
  console.log(`   - POST /api/inventory/upload-image`);
  console.log(`   - DELETE /api/inventory/products/:id/image`);
  console.log(`   - GET  /api/whatsapp/estado`);
  console.log(`   - POST /api/whatsapp/conectar`);
  console.log(`   - POST /api/whatsapp/enviar`);
  console.log(`   - GET  /api/whatsapp/diagnostico`);
  console.log('');
  console.log('📄 Socket.IO multisesión activo');
  console.log('=====================================');
  
  // 🔥 INICIALIZACIÓN AUTOMÁTICA DE SERVICIOS
  if (inicializarServicios) {
    console.log('');
    console.log('🔄 ===== INICIALIZANDO SERVICIOS =====');
    try {
      await inicializarServicios();
      console.log('✅ ===== TODOS LOS SERVICIOS OPERATIVOS =====');
    } catch (error) {
      console.error('❌ Error inicializando servicios:', error.message);
      console.log('⚠️ El servidor continuará sin algunos servicios');
    }
    console.log('');
  }

  // 🕐 INICIALIZAR TAREAS PROGRAMADAS (CRON JOBS)
  console.log('🕐 ===== INICIALIZANDO TAREAS PROGRAMADAS =====');
  try {
    cronService.initialize();
    const status = cronService.getStatus();
    console.log(`✅ ${status.totalJobs} cron jobs activos`);
    console.log('   - Limpieza de reservas expiradas: cada 1 hora');
    console.log('   - Health check del sistema: cada 30 minutos');
    console.log('==============================================');
  } catch (error) {
    console.error('❌ Error inicializando cron jobs:', error.message);
  }
});

// 🛡️ MANEJO GRACEFUL DE CIERRE
process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor gracefully...');
  cronService.stopAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Ctrl+C detectado, cerrando servidor...');
  cronService.stopAll();
  process.exit(0);
});