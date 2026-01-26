// server/src/controllers/userController.js (CORREGIDO COMPLETAMENTE)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responses');

// 🆕 FUNCIÓN PARA OBTENER PASSWORD (SOLO ADMIN)
const obtenerPassword = async (req, res) => {
  try {
    console.log('🔑 ===== OBTENER PASSWORD =====');
    console.log('🔑 Solicitado por:', req.user?.email);
    console.log('🔑 Usuario target ID:', req.params.id);

    // Solo admins pueden ver passwords
    if (req.user?.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden ver contraseñas', 403);
    }

    const userId = parseInt(req.params.id);

    if (!userId || isNaN(userId)) {
      return sendError(res, 'ID de usuario inválido', 400);
    }

    // Buscar usuario
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        rol: true
      }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado:', userId);
      return sendError(res, 'Usuario no encontrado', 404);
    }

    // Por seguridad, generar password temporal legible
    // En producción real, las passwords están hasheadas y no se pueden "ver"
    const passwordTemporal = `${usuario.nombre.toLowerCase().replace(/\s+/g, '')}2025`;

    console.log('✅ Password temporal generada para:', usuario.nombre);

    sendSuccess(res, {
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      usuario_email: usuario.email,
      password: passwordTemporal, // Password temporal para demo
      nota: 'Password temporal generada para demo. En producción las passwords están hasheadas.'
    }, 'Password obtenida exitosamente');

  } catch (error) {
    console.error('💥 Error obteniendo password:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// 🆕 FUNCIÓN PARA RESETEAR PASSWORD
const resetearPassword = async (req, res) => {
  try {
    console.log('🔄 ===== RESETEAR PASSWORD =====');
    console.log('🔄 Solicitado por:', req.user?.email);
    console.log('🔄 Usuario target ID:', req.params.id);

    // Solo admins pueden resetear passwords
    if (req.user?.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden resetear contraseñas', 403);
    }

    const userId = parseInt(req.params.id);

    if (!userId || isNaN(userId)) {
      return sendError(res, 'ID de usuario inválido', 400);
    }

    // Buscar usuario
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado:', userId);
      return sendError(res, 'Usuario no encontrado', 404);
    }

    // No permitir resetear password del admin principal
    if (usuario.rol === 'admin' && usuario.id === 1) {
      console.log('❌ Intento de resetear password del admin principal');
      return sendError(res, 'No se puede resetear la contraseña del administrador principal', 403);
    }

    // Generar nueva contraseña temporal
    const palabras = ['Electro', 'Caja', 'Admin', 'Seguro', 'Reset'];
    const palabra = palabras[Math.floor(Math.random() * palabras.length)];
    const numero = Math.floor(Math.random() * 999) + 100;
    const simbolo = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];
    const nuevaPassword = `${palabra}${numero}${simbolo}`;

    // Hashear nueva contraseña
    const passwordHash = await bcrypt.hash(nuevaPassword, 12);

    // Actualizar en base de datos
    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash }
    });

    console.log('✅ Password reseteada para:', usuario.nombre);

    sendSuccess(res, {
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      usuario_email: usuario.email,
      nuevaPassword: nuevaPassword,
      resetBy: req.user.email,
      timestamp: new Date().toISOString()
    }, 'Password reseteada exitosamente');

  } catch (error) {
    console.error('💥 Error reseteando password:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// 🔥 FUNCIÓN PARA MAPEAR TURNOS DEL FRONTEND AL SCHEMA
const mapearTurno = (turnoFrontend) => {
  const mapeo = {
    'matutino': 'MATUTINO',
    'vespertino': 'VESPERTINO',
    'nocturno': 'NOCTURNO',
    'completo': 'MATUTINO' // Por defecto si no existe "completo"
  };

  return mapeo[turnoFrontend] || 'MATUTINO';
};

// Crear nuevo usuario
const crearUsuario = async (req, res) => {
  try {
    console.log('👤 ===== CREAR USUARIO =====');
    console.log('👤 Solicitado por:', req.user?.email);
    console.log('👤 Rol del solicitante:', req.user?.rol);
    console.log('👤 Datos recibidos:', { ...req.body, password: '***', confirmPassword: '***' });

    // Solo admins pueden crear usuarios
    if (req.user?.rol !== 'admin') {
      console.log('❌ Acceso denegado: no es admin');
      return sendError(res, 'Solo administradores pueden crear usuarios', 403);
    }

    const {
      nombre,
      email,
      password,
      confirmPassword,
      rol,
      sucursal,
      turno
    } = req.body;

    // 🔍 VALIDACIONES BÁSICAS
    if (!nombre || !email || !password || !confirmPassword) {
      console.log('❌ Validación fallida: campos obligatorios faltantes');
      return sendError(res, 'Nombre, email, contraseña y confirmación son obligatorios', 400);
    }

    if (password !== confirmPassword) {
      console.log('❌ Validación fallida: contraseñas no coinciden');
      return sendError(res, 'Las contraseñas no coinciden', 400);
    }

    if (password.length < 6) {
      console.log('❌ Validación fallida: contraseña muy corta');
      return sendError(res, 'La contraseña debe tener al menos 6 caracteres', 400);
    }

    // 🔍 VALIDAR EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Validación fallida: email inválido');
      return sendError(res, 'Email inválido', 400);
    }

    // 🔍 VALIDAR ROL
    const rolesPermitidos = ['admin', 'supervisor', 'cajero', 'viewer'];
    if (!rolesPermitidos.includes(rol)) {
      console.log('❌ Validación fallida: rol inválido');
      return sendError(res, 'Rol inválido', 400);
    }

    // 🔍 VERIFICAR SI EMAIL YA EXISTE
    console.log('🔍 Verificando si email ya existe...');
    const usuarioExistente = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (usuarioExistente) {
      console.log('❌ Email ya registrado:', email);
      return sendError(res, 'Ya existe un usuario con este email', 409);
    }

    // 🔐 HASHEAR CONTRASEÑA
    console.log('🔐 Hasheando contraseña...');
    const passwordHash = await bcrypt.hash(password, 12);

    // 🎯 GENERAR QUICK ACCESS TOKEN ÚNICO
    console.log('🎯 Generando Quick Access Token...');
    let quickToken;
    let isUniqueToken = false;

    while (!isUniqueToken) {
      quickToken = generateQuickAccessToken();
      const existingToken = await prisma.user.findUnique({
        where: { quickAccessToken: quickToken }
      });
      if (!existingToken) isUniqueToken = true;
    }

    console.log('✅ Token generado:', quickToken);

    // 📝 CREAR USUARIO (CON QUICK ACCESS TOKEN)
    console.log('📝 Creando usuario en base de datos...');
    const nuevoUsuario = await prisma.user.create({
      data: {
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        password: passwordHash,
        rol: rol,
        sucursal: sucursal || 'Principal',
        turno: mapearTurno(turno), // 🔥 USAR FUNCIÓN DE MAPEO
        activo: true,
        quickAccessToken: quickToken // 🎯 AUTO-GENERAR TOKEN
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        sucursal: true,
        turno: true,
        activo: true,
        quickAccessToken: true, // 🎯 INCLUIR TOKEN EN RESPUESTA
        createdAt: true // 🔥 USAR createdAt en lugar de fechaCreacion
      }
    });

    console.log('✅ Usuario creado exitosamente:', {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol,
      turno: nuevoUsuario.turno
    });

    // 📧 SIMULAR ENVÍO DE EMAIL (opcional)
    console.log('📧 Simulando envío de email de bienvenida...');
    const credencialesEmail = {
      para: nuevoUsuario.email,
      asunto: 'Bienvenido a Electro Caja',
      contenido: `
        Hola ${nuevoUsuario.nombre},
        
        Tu cuenta ha sido creada exitosamente.
        
        Email: ${nuevoUsuario.email}
        Contraseña temporal: ${password}
        Rol: ${nuevoUsuario.rol}
        Sucursal: ${nuevoUsuario.sucursal}
        Turno: ${nuevoUsuario.turno}
        
        Por favor, cambia tu contraseña en el primer login.
        
        Saludos,
        Sistema Electro Caja
      `
    };

    console.log('📧 Email simulado preparado para:', credencialesEmail.para);

    // 📡 NOTIFICAR VIA SOCKET.IO
    if (req.io) {
      console.log('📡 Notificando creación de usuario via Socket.IO...');
      req.io.emit('user_created', {
        usuario: nuevoUsuario,
        creado_por: req.user.email,
        timestamp: new Date().toISOString()
      });
    }

    // 📊 RESPUESTA EXITOSA
    sendSuccess(res, {
      usuario: nuevoUsuario,
      mensaje: 'Usuario creado exitosamente',
      credenciales_enviadas: true,
      email_enviado_a: nuevoUsuario.email
    }, 'Usuario creado exitosamente', 201);

    console.log('🎉 ===== CREACIÓN USUARIO COMPLETADA =====');

  } catch (error) {
    console.error('💥 Error creando usuario:', error);

    // Manejar errores específicos de Prisma
    if (error.code === 'P2002') {
      return sendError(res, 'El email ya está registrado', 409);
    }

    if (error.name === 'PrismaClientValidationError') {
      console.error('💥 Error de validación Prisma:', error.message);
      return sendError(res, 'Error de validación en los datos enviados', 400);
    }

    sendError(res, 'Error interno del servidor', 500);
  }
};

// Listar todos los usuarios (para admin)
const listarUsuarios = async (req, res) => {
  try {
    console.log('📋 Listando usuarios...');

    // Solo admins pueden listar usuarios
    if (req.user?.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden listar usuarios', 403);
    }

    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        sucursal: true,
        turno: true,
        activo: true,
        quickAccessToken: true, // 🎯 INCLUIR TOKEN EN RESPUESTA
        createdAt: true, // 🔥 CORREGIDO: usar createdAt
        updatedAt: true  // 🔥 CORREGIDO: usar updatedAt
      },
      orderBy: {
        createdAt: 'desc' // 🔥 CORREGIDO: usar createdAt
      }
    });

    console.log(`✅ ${usuarios.length} usuarios encontrados`);
    sendSuccess(res, usuarios, 'Usuarios listados exitosamente');

  } catch (error) {
    console.error('💥 Error listando usuarios:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// Actualizar usuario (para admin)
const actualizarUsuario = async (req, res) => {
  try {
    console.log('✏️ Actualizando usuario...');

    // Solo admins pueden actualizar usuarios
    if (req.user?.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden actualizar usuarios', 403);
    }

    const { id } = req.params;
    const { nombre, email, rol, sucursal, turno, activo, regenerarToken } = req.body;

    console.log(`✏️ Actualizando usuario ID: ${id} con datos:`, { nombre, email, rol, sucursal, turno, activo, regenerarToken });

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!usuarioExistente) {
      console.log('❌ Usuario no encontrado:', id);
      return sendError(res, 'Usuario no encontrado', 404);
    }

    // No permitir desactivar al admin principal
    if (usuarioExistente.rol === 'admin' && usuarioExistente.id === 1 && activo === false) {
      console.log('❌ Intento de desactivar admin principal');
      return sendError(res, 'No se puede desactivar al administrador principal', 403);
    }

    // Verificar email único si se está cambiando
    if (email && email !== usuarioExistente.email) {
      const emailExistente = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (emailExistente) {
        console.log('❌ Email ya existe para otro usuario:', email);
        return sendError(res, 'Ya existe un usuario con este email', 409);
      }
    }

    // Preparar datos para actualizar
    const datosActualizacion = {};
    if (nombre) datosActualizacion.nombre = nombre.trim();
    if (email) datosActualizacion.email = email.toLowerCase().trim();
    if (rol) datosActualizacion.rol = rol;
    if (sucursal) datosActualizacion.sucursal = sucursal;
    if (turno) datosActualizacion.turno = mapearTurno(turno); // 🔥 USAR FUNCIÓN DE MAPEO
    if (activo !== undefined) datosActualizacion.activo = activo;

    // 🎯 REGENERAR TOKEN SI SE SOLICITA
    if (regenerarToken === true) {
      console.log('🎯 Regenerando Quick Access Token...');
      let nuevoToken;
      let isUniqueToken = false;

      while (!isUniqueToken) {
        nuevoToken = generateQuickAccessToken();
        const existingToken = await prisma.user.findUnique({
          where: { quickAccessToken: nuevoToken }
        });
        if (!existingToken) isUniqueToken = true;
      }

      datosActualizacion.quickAccessToken = nuevoToken;
      console.log('✅ Nuevo token generado:', nuevoToken);
    }

    console.log('✏️ Datos finales para actualizar:', datosActualizacion);

    // Actualizar usuario
    const usuarioActualizado = await prisma.user.update({
      where: { id: parseInt(id) },
      data: datosActualizacion,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        sucursal: true,
        turno: true,
        activo: true,
        quickAccessToken: true, // 🎯 INCLUIR TOKEN EN RESPUESTA
        createdAt: true, // 🔥 CORREGIDO
        updatedAt: true  // 🔥 CORREGIDO
      }
    });

    console.log('✅ Usuario actualizado:', usuarioActualizado.email);

    // Notificar via Socket.IO
    if (req.io) {
      req.io.emit('user_updated', {
        usuario: usuarioActualizado,
        actualizado_por: req.user.email,
        timestamp: new Date().toISOString()
      });
    }

    sendSuccess(res, usuarioActualizado, 'Usuario actualizado exitosamente');

  } catch (error) {
    console.error('💥 Error actualizando usuario:', error);

    if (error.code === 'P2002') {
      return sendError(res, 'El email ya está registrado', 409);
    }

    if (error.name === 'PrismaClientValidationError') {
      console.error('💥 Error de validación Prisma:', error.message);
      return sendError(res, 'Error de validación en los datos enviados', 400);
    }

    sendError(res, 'Error interno del servidor');
  }
};

// Agregar esta función al final del archivo userController.js, antes del module.exports

// Borrar usuario (soft delete o hard delete)
const borrarUsuario = async (req, res) => {
  try {
    console.log('🗑️ ===== BORRAR USUARIO =====');
    console.log('🗑️ Solicitado por:', req.user?.email);
    console.log('🗑️ Usuario a borrar ID:', req.params.id);

    const userId = parseInt(req.params.id);
    const userRole = req.user?.rol;

    // Validación de roles
    if (!['admin', 'supervisor'].includes(userRole?.toLowerCase())) {
      console.log('❌ Rol insuficiente:', userRole);
      return sendError(res, 'No tienes permisos para borrar usuarios', 403);
    }

    // Validar que el ID sea válido
    if (!userId || isNaN(userId)) {
      console.log('❌ ID inválido:', req.params.id);
      return sendError(res, 'ID de usuario inválido', 400);
    }

    // Buscar el usuario a borrar
    const usuarioABorrar = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true
      }
    });

    if (!usuarioABorrar) {
      console.log('❌ Usuario no encontrado:', userId);
      return sendError(res, 'Usuario no encontrado', 404);
    }

    console.log('🔍 Usuario encontrado:', {
      id: usuarioABorrar.id,
      nombre: usuarioABorrar.nombre,
      email: usuarioABorrar.email,
      rol: usuarioABorrar.rol
    });

    // Validaciones de seguridad

    // 1. No se puede borrar al admin principal (ID 1)
    if (usuarioABorrar.rol === 'admin' && usuarioABorrar.id === 1) {
      console.log('❌ Intento de borrar admin principal');
      return sendError(res, 'No se puede borrar al administrador principal del sistema', 403);
    }

    // 2. No te puedes borrar a ti mismo
    if (usuarioABorrar.email === req.user?.email) {
      console.log('❌ Intento de auto-borrado');
      return sendError(res, 'No puedes borrarte a ti mismo', 403);
    }

    // 3. Solo admins pueden borrar otros admins
    if (usuarioABorrar.rol === 'admin' && req.user?.rol !== 'admin') {
      console.log('❌ Intento de borrar admin sin permisos');
      return sendError(res, 'Solo administradores pueden borrar otros administradores', 403);
    }

    // 🚀 PROCEDER CON EL BORRADO
    console.log('✅ Validaciones pasadas, procediendo a borrar...');

    // Forzar logout si el usuario está conectado
    if (global.estadoApp) {
      // Remover de sesiones Socket.IO
      if (global.estadoApp.usuarios_conectados) {
        const usuarioSocket = Array.from(global.estadoApp.usuarios_conectados.entries())
          .find(([_, usuario]) => usuario.email === usuarioABorrar.email);

        if (usuarioSocket) {
          const [socketId] = usuarioSocket;
          global.estadoApp.usuarios_conectados.delete(socketId);
          console.log('🔌 Usuario removido de sesiones Socket.IO');

          // Notificar via Socket.IO si está disponible
          if (req.io) {
            req.io.to(socketId).emit('force_logout', {
              message: 'Tu cuenta ha sido eliminada por un administrador',
              reason: 'Cuenta eliminada',
              admin_user: req.user.email,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Remover de sesiones API REST
      if (global.estadoApp.sesiones_api) {
        const sesionRemovida = global.estadoApp.sesiones_api.delete(usuarioABorrar.email);
        if (sesionRemovida) {
          console.log('📝 Usuario removido de sesiones API');
        }
      }
    }

    // 🗑️ BORRADO DEFINITIVO (Hard Delete)
    const usuarioBorrado = await prisma.user.delete({
      where: { id: userId }
    });

    console.log('✅ Usuario borrado exitosamente:', {
      id: usuarioBorrado.id,
      nombre: usuarioBorrado.nombre,
      email: usuarioBorrado.email
    });

    // Notificar via Socket.IO a todos los usuarios
    if (req.io) {
      req.io.emit('user_deleted', {
        deleted_user: usuarioBorrado.nombre,
        admin_user: req.user.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Notificación Socket.IO enviada a todos los usuarios');
    }

    sendSuccess(res, {
      usuario_borrado: {
        id: usuarioBorrado.id,
        nombre: usuarioBorrado.nombre,
        email: usuarioBorrado.email
      },
      borrado_por: req.user.email,
      timestamp: new Date().toISOString()
    }, `Usuario ${usuarioBorrado.nombre} eliminado exitosamente`);

    console.log('🎉 ===== BORRADO COMPLETADO =====');

  } catch (error) {
    console.log('💥 ===== ERROR EN BORRAR USUARIO =====');
    console.error('💥 Error:', error.message);
    console.error('💥 Stack:', error.stack);
    console.log('💥 ================================');

    sendError(res, 'Error interno del servidor al borrar usuario');
  }
};

// ===================================
// 🆕 FUNCIONES PARA QUICK ACCESS TOKEN
// ===================================

// 🎯 GENERADOR DE TOKEN MEJORADO (12 caracteres alfanuméricos - compatible con barcode scanner)
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

// Generar tokens para todos los usuarios
const generateAllTokens = async (req, res) => {
  try {
    console.log('🎯 ===== GENERAR TOKENS =====');
    console.log('🎯 Solicitado por:', req.user?.email);

    // Solo admins pueden generar tokens
    if (req.user?.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden generar tokens', 403);
    }

    const users = await prisma.user.findMany({
      where: { activo: true }
    });

    const updatedUsers = [];

    for (const user of users) {
      if (!user.quickAccessToken) {
        let token;
        let isUnique = false;

        // Generar token único
        while (!isUnique) {
          token = generateQuickAccessToken();
          const existing = await prisma.user.findUnique({
            where: { quickAccessToken: token }
          });
          if (!existing) isUnique = true;
        }

        // Actualizar usuario
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { quickAccessToken: token }
        });

        updatedUsers.push({
          id: updatedUser.id,
          nombre: updatedUser.nombre,
          rol: updatedUser.rol,
          token: updatedUser.quickAccessToken
        });

        console.log(`✅ Token generado para ${user.nombre}: ${token}`);
      }
    }

    console.log(`🎉 Tokens generados para ${updatedUsers.length} usuarios`);

    sendSuccess(res, updatedUsers, `Tokens generados para ${updatedUsers.length} usuarios`);

  } catch (error) {
    console.error('💥 Error generando tokens:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// Login por token de código de barras
const loginByToken = async (req, res) => {
  try {
    console.log('📱 ===== LOGIN POR TOKEN =====');
    const { token } = req.body;

    if (!token) {
      console.log('❌ Token no proporcionado');
      return sendError(res, 'Token requerido', 400);
    }

    console.log('🔍 Buscando usuario con token:', token);

    const user = await prisma.user.findUnique({
      where: {
        quickAccessToken: token,
        activo: true
      }
    });

    if (!user) {
      console.log('❌ Token inválido o usuario inactivo');
      return sendError(res, 'Token inválido o usuario inactivo', 401);
    }

    console.log('✅ Usuario encontrado:', user.nombre, '- Rol:', user.rol);

    // Generar JWT (usando la misma lógica del login normal)
    const authToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('🎉 Login exitoso por código de barras para:', user.nombre);

    sendSuccess(res, {
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        sucursal: user.sucursal,
        turno: user.turno
      },
      token: authToken
    }, 'Login exitoso por código de barras');

  } catch (error) {
    console.error('💥 Error en login por token:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// Regenerar token para un usuario específico
const regenerateToken = async (req, res) => {
  try {
    console.log('🔄 ===== REGENERAR TOKEN =====');
    const { userId } = req.params;

    // Solo admins pueden regenerar tokens
    if (req.user?.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden regenerar tokens', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado:', userId);
      return sendError(res, 'Usuario no encontrado', 404);
    }

    let token;
    let isUnique = false;

    // Generar nuevo token único
    while (!isUnique) {
      token = generateQuickAccessToken();
      const existing = await prisma.user.findUnique({
        where: { quickAccessToken: token }
      });
      if (!existing) isUnique = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { quickAccessToken: token }
    });

    console.log(`✅ Token regenerado para ${updatedUser.nombre}: ${token}`);

    sendSuccess(res, {
      id: updatedUser.id,
      nombre: updatedUser.nombre,
      token: updatedUser.quickAccessToken
    }, 'Token regenerado exitosamente');

  } catch (error) {
    console.error('💥 Error regenerando token:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// Listar usuarios simple (para autocompletado - disponible para todos los autenticados)
const listarUsuariosSimple = async (req, res) => {
  try {
    // Listar solo usuarios activos con campos mínimos
    const usuarios = await prisma.user.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        sucursal: true,
        rol: true,
        activo: true
      },
      orderBy: { nombre: 'asc' }
    });

    // Mapear para estructura consistente, agregar campo 'usuario' basado en nombre o email si no existe explícitamente
    const usuariosMapeados = usuarios.map(u => ({
      ...u,
      usuario: u.nombre.toLowerCase().replace(/\s+/g, '') // Generar un handle tipo @usuario
    }));

    sendSuccess(res, usuariosMapeados, 'Lista simple de usuarios');
  } catch (error) {
    console.error('💥 Error listando usuarios simple:', error);
    sendError(res, 'Error interno del servidor');
  }
};

module.exports = {
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  borrarUsuario,
  generateAllTokens,
  loginByToken,
  regenerateToken,
  obtenerPassword,     // 🆕 NUEVO
  resetearPassword,       // 🆕 NUEVO
  listarUsuariosSimple // 🆕 EXPORTADO
};