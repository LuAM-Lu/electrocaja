// server/index.js (ACTUALIZADO CON WHATSAPP)
require('dotenv').config();
const { server, inicializarServicios } = require('./src/app');

const port = process.env.PORT || 3001;

server.listen(port, '0.0.0.0', async () => {
  console.log('🚀 ===== ELECTRO CAJA BACKEND =====');
  console.log(`✅ Servidor iniciado en puerto ${port}`);
  console.log(`📡 Backend disponible en:`);
  console.log(`   - Local:    https://localhost:${port}`);
  console.log(`   - Red:      https://192.168.1.5:${port}`);
  console.log(`   - Frontend: https://192.168.1.5:5173`);
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
  
  // 🔥 INICIALIZACIÓN AUTOMÁTICA DE WHATSAPP
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
});

// 🛡️ MANEJO GRACEFUL DE CIERRE
process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Ctrl+C detectado, cerrando servidor...');
  process.exit(0);
});