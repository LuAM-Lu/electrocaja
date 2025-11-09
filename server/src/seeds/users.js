const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

// 🎯 GENERADOR DE TOKEN (12 caracteres alfanuméricos - compatible con barcode scanner)
const generateQuickAccessToken = () => {
  // Caracteres sin I, O, 0, 1 para evitar confusiones en QR/barcode
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';

  // Generar 12 caracteres aleatorios (seguro para escáner de código de barras)
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * caracteres.length);
    token += caracteres.charAt(randomIndex);
  }

  return token; // Ejemplo: "ABC123XYZ789"
};

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
      // 🎯 GENERAR TOKEN ÚNICO PARA CADA USUARIO
      let token;
      let isUnique = false;

      while (!isUnique) {
        token = generateQuickAccessToken();
        const existing = await prisma.user.findUnique({
          where: { quickAccessToken: token }
        });
        if (!existing) isUnique = true;
      }

      // Agregar token al usuario
      usuario.quickAccessToken = token;

      console.log(`🔄 Creando usuario: ${usuario.nombre} - Rol: ${usuario.rol} - Token: ${token}`);
      await prisma.user.create({ data: usuario });
    }

    console.log('\n✅ Usuarios creados correctamente');
    console.log('\n📋 Credenciales de prueba:');
    console.log('   🔑 Admin: admin@electrocaja.com / admin123');
    console.log('   🔑 Supervisor: supervisor@electrocaja.com / super123');
    console.log('   🔑 Cajero: cajera@electrocaja.com / cajera123');
    console.log('   🔑 Viewer: observador@electrocaja.com / obs123');

    console.log('\n🎯 Quick Access Tokens generados:');
    console.log('   ℹ️  Los tokens QR se mostraron arriba al crear cada usuario');
    console.log('   ℹ️  Puedes verlos en el panel de Configuración > Usuarios');
    console.log('   ℹ️  Click en el botón morado 🟣 para ver el QR de cada usuario');
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
    console.error('💡 Detalle del error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
};

// Ejecutar el seed
seedUsers();