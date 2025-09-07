const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

const seedUsers = async () => {
  try {
    console.log('🌱 Iniciando creación de usuarios...');
    
    // 🔥 LIMPIAR USUARIOS EXISTENTES PRIMERO
    console.log('🧹 Limpiando usuarios existentes...');
    await prisma.user.deleteMany({});
    console.log('✅ Usuarios existentes eliminados');

    console.log('📝 Creando usuarios de prueba...');

    const usuarios = [
      {
        nombre: 'Admin ElectroCaja',
        email: 'admin@electrocaja.com',
        password: await bcrypt.hash('admin123', 12),
        rol: 'admin',  // 🔥 CAMBIADO A MINÚSCULA
        sucursal: 'Principal',
        turno: 'MATUTINO'
      },
      {
        nombre: 'Carlos Supervisor',
        email: 'supervisor@electrocaja.com',
        password: await bcrypt.hash('super123', 12),
        rol: 'supervisor',  // 🔥 CAMBIADO A MINÚSCULA
        sucursal: 'Principal',
        turno: 'MATUTINO'
      },
      {
        nombre: 'María Cajera',
        email: 'cajera@electrocaja.com',
        password: await bcrypt.hash('cajera123', 12),
        rol: 'cajero',  // 🔥 CAMBIADO A MINÚSCULA
        sucursal: 'Principal',
        turno: 'MATUTINO'
      },
      {
        nombre: 'Luis Observador',
        email: 'observador@electrocaja.com',
        password: await bcrypt.hash('obs123', 12),
        rol: 'viewer',  // 🔥 CAMBIADO A MINÚSCULA
        sucursal: 'Principal',
        turno: 'MATUTINO'
      }
    ];

    for (const usuario of usuarios) {
      console.log(`🔄 Creando usuario: ${usuario.nombre} - Rol: ${usuario.rol}`);
      await prisma.user.create({ data: usuario });
    }

    console.log('✅ Usuarios creados correctamente');
    console.log('📋 Credenciales de prueba:');
    console.log('   🔑 Admin: admin@electrocaja.com / admin123');
    console.log('   🔑 Supervisor: supervisor@electrocaja.com / super123');
    console.log('   🔑 Cajero: cajera@electrocaja.com / cajera123');
    console.log('   🔑 Viewer: observador@electrocaja.com / obs123');
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
    console.error('💡 Detalle del error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
};

// Ejecutar el seed
seedUsers();