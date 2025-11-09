// server/src/controllers/authController.js (CON ACTUALIZACIÓN DE FOOTER CORREGIDA)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responses');

// Login con validación de sesiones completa (Socket.IO + API REST)
const login = async (req, res) => {
  try {
    console.log('🚀 ===== INICIO LOGIN =====');
    console.log('📥 Request body:', req.body);
    console.log('📍 IP Cliente:', req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']);
    
    const { email, password } = req.body;
    console.log('🔍 1. Datos extraídos:', { 
      email: email, 
      password: password ? '***' : 'undefined'
    });

    // Validar datos
    if (!email || !password) {
      console.log('❌ 2. Validación fallida: faltan email o password');
      return sendError(res, 'Email y contraseña son requeridos', 400);
    }
    console.log('✅ 2. Validación de datos OK');

    // Verificar variables de entorno
    console.log('🔍 3. Variables de entorno:');
    console.log('   - JWT_SECRET existe:', !!process.env.JWT_SECRET);
    console.log('   - JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
    console.log('   - DATABASE_URL existe:', !!process.env.DATABASE_URL);

    console.log('🔍 4. Buscando usuario en DB...');
    console.log('   - Email normalizado:', email.toLowerCase());
    
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        rol: true,
        sucursal: true,
        turno: true,
        activo: true
      }
    });

    // 🆕 VERIFICAR CAJA PENDIENTE DE CIERRE


    console.log('🔍 5. Resultado búsqueda usuario:');
    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log('   - ID:', user.id);
      console.log('   - Nombre:', user.nombre);
      console.log('   - Email:', user.email);
      console.log('   - Rol:', user.rol);
      console.log('   - Sucursal:', user.sucursal);
      console.log('   - Turno:', user.turno);
      console.log('   - Activo:', user.activo);
      console.log('   - Password hash existe:', !!user.password);
    } else {
      console.log('❌ Usuario NO encontrado');
    }

    if (!user) {
      console.log('❌ 6. Return: Credenciales incorrectas (usuario no existe)');
      return sendError(res, 'Credenciales incorrectas', 401);
    }

    console.log('🔍 7. Verificando si usuario está activo...');
    if (user.activo === false) {
      console.log('❌ 8. Return: Usuario inactivo');
      return sendError(res, 'Usuario inactivo', 401);
    }
    console.log('✅ 8. Usuario activo:', user.activo);

    console.log('🔍 9. Verificando password...');
    console.log('   - Password recibido:', password);
    console.log('   - Hash almacenado:', user.password?.substring(0, 10) + '...');
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔍 10. Resultado comparación password:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ 11. Return: Password incorrecto');
      return sendError(res, 'Credenciales incorrectas', 401);
    }
    console.log('✅ 11. Password correcto');

    const cajaPendiente = await prisma.caja.findFirst({
        where: { estado: 'PENDIENTE_CIERRE_FISICO' },
        include: {
          usuarioApertura: {
            select: { id: true, nombre: true }
          }
        }
      });

      if (cajaPendiente) {
        const esResponsable = user.id === cajaPendiente.usuarioAperturaId;
        const esAdmin = user.rol.toLowerCase() === 'admin';
        
        if (!esResponsable && !esAdmin) {
          return sendError(res, 
            `Sistema bloqueado - Caja del ${cajaPendiente.fecha.toLocaleDateString('es-VE')} pendiente de cierre físico. Contacte a ${cajaPendiente.usuarioApertura.nombre} o administrador.`, 
            423 // HTTP 423 Locked
          );
        }
        
        // Si es responsable o admin, incluir info de caja pendiente en respuesta
        user.cajaPendienteCierre = {
          id: cajaPendiente.id,
          fecha: cajaPendiente.fecha,
          usuarioResponsable: cajaPendiente.usuarioApertura.nombre,
          esResponsable: esResponsable
        };
      }


    // 👈 VERIFICACIÓN COMPLETA: SESIONES ACTIVAS (SOCKET.IO + API REST)
    console.log('🔍 12. Verificando sesiones activas...');
    
      if (!global.estadoApp) {
    global.estadoApp = { 
      usuarios_conectados: new Map(),    // Socket.IO sessions
      sesiones_api: new Map()           // API REST sessions
    };
  }

  // Asegurar que ambos Maps existen
  if (!global.estadoApp.usuarios_conectados) {
    global.estadoApp.usuarios_conectados = new Map();
  }
  if (!global.estadoApp.sesiones_api) {
    global.estadoApp.sesiones_api = new Map();
  }

  console.log('📊 Estado actual de sesiones:');
  console.log('   - Socket.IO activas:', global.estadoApp.usuarios_conectados.size);
  console.log('   - API REST activas:', global.estadoApp.sesiones_api.size);

    // Verificar sesiones Socket.IO
    const usuarioSocketConectado = Array.from(global.estadoApp.usuarios_conectados.values())
      .find(u => u.email === user.email);

    if (usuarioSocketConectado) {
      console.log('⚠️ 13a. Usuario ya conectado via Socket.IO - CERRANDO SESIÓN ANTERIOR:', {
        usuario: user.nombre,
        socket_id: usuarioSocketConectado.socket_id,
        ip: usuarioSocketConectado.ip_cliente,
        timestamp: usuarioSocketConectado.timestamp_conexion
      });

      // 🔧 CERRAR SESIÓN ANTERIOR AUTOMÁTICAMENTE
      console.log('🚨 Forzando cierre de sesión anterior para:', user.nombre);

      // Notificar al socket anterior que será desconectado
      if (req.io) {
        req.io.to(usuarioSocketConectado.socket_id).emit('force_logout', {
          message: 'Tu sesión ha sido cerrada porque iniciaste sesión desde otro dispositivo',
          reason: 'duplicate_session',
          timestamp: new Date().toISOString()
        });
      }

      // Eliminar sesión anterior
      global.estadoApp.usuarios_conectados.delete(usuarioSocketConectado.socket_id);
      global.estadoApp.sesiones_por_usuario.delete(user.id);

      console.log('✅ Sesión anterior cerrada, permitiendo nuevo login');
    }

    // Verificar sesiones API REST
    const usuarioApiConectado = global.estadoApp.sesiones_api.get(user.email);

    if (usuarioApiConectado) {
      const tiempoTranscurrido = Date.now() - new Date(usuarioApiConectado.timestamp).getTime();
      const minutosTranscurridos = Math.floor(tiempoTranscurrido / (1000 * 60));

      console.log('🕐 Verificando sesión API existente:', {
        usuario: user.nombre,
        minutos_transcurridos: minutosTranscurridos,
        limite: 30
      });

      // Expirar sesiones API después de 30 minutos sin actividad
      if (minutosTranscurridos > 30) {
        console.log('🕐 Sesión API expirada por inactividad, removiendo...');
        global.estadoApp.sesiones_api.delete(user.email);
      } else {
        // 🔧 CERRAR SESIÓN ANTERIOR AUTOMÁTICAMENTE (incluso si no está expirada)
        console.log('⚠️ 13b. Usuario ya conectado via API REST - CERRANDO SESIÓN ANTERIOR:', {
          usuario: user.nombre,
          ip: usuarioApiConectado.ip,
          timestamp: usuarioApiConectado.timestamp,
          minutos_activo: minutosTranscurridos
        });

        console.log('🚨 Forzando cierre de sesión API anterior para:', user.nombre);
        global.estadoApp.sesiones_api.delete(user.email);
        console.log('✅ Sesión API anterior cerrada, permitiendo nuevo login');
      }
    }

    console.log('✅ 12. No hay sesiones activas para este usuario');

    console.log('🔍 13. Generando JWT...');
    console.log('   - Payload:', {
      userId: user.id,
      email: user.email,
      rol: user.rol
    });
    
    // Generar JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        rol: user.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    console.log('✅ 14. JWT generado correctamente');
    console.log('   - Token length:', token?.length);
    console.log('   - Token preview:', token?.substring(0, 20) + '...');

    // 👈 REGISTRAR SESIÓN API
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Desconocida';
    
    console.log('📝 15. Registrando sesión API...');
    global.estadoApp.sesiones_api.set(user.email, {
      usuario: user.nombre,
      email: user.email,
      rol: user.rol,
      sucursal: user.sucursal,
      ip: clientIP,
      timestamp: new Date().toISOString(),
      token_preview: token?.substring(0, 20) + '...',
      user_agent: req.headers['user-agent'] || 'Desconocido'
    });

    console.log('✅ 15. Sesión API registrada:', {
      email: user.email,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    // Remover password de la respuesta
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('🔍 16. Preparando respuesta...');
    console.log('   - User sin password:', {
      id: userWithoutPassword.id,
      nombre: userWithoutPassword.nombre,
      email: userWithoutPassword.email,
      rol: userWithoutPassword.rol
    });

    console.log('✅ 17. Enviando respuesta exitosa - LOGIN AUTORIZADO');
    sendSuccess(res, {
      user: userWithoutPassword,
      token,
      session_info: {
        ip: clientIP,
        timestamp: new Date().toISOString(),
        expires_in: process.env.JWT_EXPIRES_IN
      }
    }, 'Login exitoso');

    console.log('🎉 ===== LOGIN COMPLETADO =====');

  } catch (error) {
    console.log('💥 ===== ERROR EN LOGIN =====');
    console.error('💥 Error message:', error.message);
    console.error('💥 Error name:', error.name);
    console.error('💥 Error code:', error.code);
    console.error('💥 Full error:', error);
    console.log('💥 ===========================');
    
    sendError(res, 'Error interno del servidor');
  }
};

// 👈 LOGOUT FORZADO CORREGIDO (CON ACTUALIZACIÓN DE FOOTER)
const forceLogout = async (req, res) => {
  try {
    console.log('💀 ===== FORCE LOGOUT =====');
    console.log('💀 Solicitado por:', req.user?.email);
    console.log('💀 Rol del solicitante:', req.user?.rol);
    
    const { target_email, reason = 'Logout forzado por administrador' } = req.body;

    // Solo admins pueden hacer logout forzado
    if (req.user?.rol !== 'admin') {
      console.log('❌ Acceso denegado: no es admin');
      return sendError(res, 'Solo administradores pueden forzar logout', 403);
    }

    if (!target_email) {
      console.log('❌ Email del usuario objetivo no proporcionado');
      return sendError(res, 'Email del usuario objetivo es requerido', 400);
    }

    console.log('🔍 Buscando usuario objetivo:', target_email);

    // Buscar en sesiones Socket.IO
    let usuarioObjetivo = Array.from(global.estadoApp.usuarios_conectados.values())
      .find(u => u.email === target_email);

    let tipoSesion = 'Socket.IO';
    let identificador = null;

    // Si no está en Socket.IO, buscar en API REST
    if (!usuarioObjetivo) {
      const sesionApi = global.estadoApp.sesiones_api.get(target_email);
      if (sesionApi) {
        usuarioObjetivo = sesionApi;
        tipoSesion = 'API';
        identificador = target_email;
      }
    } else {
      identificador = usuarioObjetivo.socket_id;
    }

    if (!usuarioObjetivo) {
      console.log('❌ Usuario no encontrado en sesiones activas');
      return sendError(res, 'Usuario no encontrado en sesiones activas', 404);
    }

    console.log('✅ Usuario objetivo encontrado:', {
      nombre: usuarioObjetivo.usuario || usuarioObjetivo.nombre,
      tipo_sesion: tipoSesion,
      identificador: identificador,
      ip: usuarioObjetivo.ip_cliente || usuarioObjetivo.ip
    });

    // Notificar via Socket.IO si está disponible
    if (req.io && tipoSesion === 'Socket.IO') {
      console.log('📡 Enviando notificación de logout forzado via Socket.IO...');
      
      req.io.to(usuarioObjetivo.socket_id).emit('force_logout', {
        message: 'Tu sesión ha sido cerrada por un administrador',
        reason,
        admin_user: req.user.email,
        timestamp: new Date().toISOString()
      });

      // Notificar a todos los demás usuarios
      req.io.emit('user_force_logout', {
        target_user: usuarioObjetivo.nombre,
        admin_user: req.user.email,
        reason,
        timestamp: new Date().toISOString()
      });

      console.log('📡 Notificaciones Socket.IO enviadas');
    }

    // Remover sesión según el tipo
    if (tipoSesion === 'Socket.IO') {
      global.estadoApp.usuarios_conectados.delete(usuarioObjetivo.socket_id);
      console.log('💀 Sesión Socket.IO removida');
    } else {
      global.estadoApp.sesiones_api.delete(target_email);
      console.log('💀 Sesión API REST removida');
    }

              // 🆕 EMITIR ACTUALIZACIÓN PARA EL FOOTER
          if (req.io) {
            console.log('📡 Emitiendo actualización de usuarios conectados para footer...');
            
            // 🔧 DEBUG - AGREGAR ESTAS LÍNEAS
            console.log('🔧 DEBUG - Usuarios antes de emitir:', 
              Array.from(global.estadoApp.usuarios_conectados.values()).map(u => ({
                usuario: u.usuario,
                nombre: u.nombre,
                rol: u.rol
              }))
            );
            
            const usuariosActualizados = Array.from(global.estadoApp.usuarios_conectados.values())
              .map(u => `${u.usuario || u.nombre || 'Usuario'} (${u.rol || 'usuario'})`);

            console.log('🔧 DEBUG - Usuarios formateados:', usuariosActualizados);
            // 🔧 FIN DEBUG

            req.io.emit('usuarios_conectados_actualizado', {
              usuarios: usuariosActualizados,
              timestamp: new Date().toISOString(),
              action: 'user_kicked',
              target_user: usuarioObjetivo.usuario || usuarioObjetivo.nombre,
              kicked_by: req.user.email
            });

            console.log('📡 Actualización footer enviada:', {
              usuarios_restantes: usuariosActualizados.length,
              usuarios: usuariosActualizados,
              usuario_kickeado: usuarioObjetivo.usuario || usuarioObjetivo.nombre
            });
          }

    const nombreUsuario = usuarioObjetivo.usuario || usuarioObjetivo.nombre;
    console.log(`💀 Usuario ${nombreUsuario} desconectado forzadamente por ${req.user.email}`);
    console.log('💀 Sesiones restantes:', {
      socket_io: global.estadoApp.usuarios_conectados.size,
      api_rest: global.estadoApp.sesiones_api.size
    });

    sendSuccess(res, {
      disconnected_user: nombreUsuario,
      admin_user: req.user.email,
      session_type: tipoSesion,
      reason,
      timestamp: new Date().toISOString()
    }, `Usuario desconectado exitosamente (${tipoSesion})`);

    console.log('💀 ===== FORCE LOGOUT COMPLETADO =====');

  } catch (error) {
    console.error('💥 Error en force logout:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// Obtener usuario actual
const me = async (req, res) => {
  try {
    console.log('🔍 ME - Obteniendo usuario actual...');
    console.log('   - User ID del token:', req.user?.userId);
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        sucursal: true,
        turno: true,
        activo: true
      }
    });

    if (!user) {
      console.log('❌ ME - Usuario no encontrado');
      return sendError(res, 'Usuario no encontrado', 404);
    }

    console.log('✅ ME - Usuario encontrado:', user.email);
    sendSuccess(res, user);
  } catch (error) {
    console.error('💥 Error en ME:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// Logout con limpieza de sesión API
const logout = async (req, res) => {
  try {
    console.log('👋 ===== LOGOUT =====');
    console.log('👋 Usuario:', req.user?.email);
    
    // Remover de sesiones API
    if (global.estadoApp?.sesiones_api && req.user?.email) {
      const sesionRemovida = global.estadoApp.sesiones_api.delete(req.user.email);
      console.log('📝 Sesión API removida:', sesionRemovida);
    }

    // Remover de usuarios conectados Socket.IO si existe
    if (global.estadoApp?.usuarios_conectados) {
      const usuarioSocket = Array.from(global.estadoApp.usuarios_conectados.entries())
        .find(([_, usuario]) => usuario.email === req.user?.email);
      
      if (usuarioSocket) {
        const [socketId] = usuarioSocket;
        global.estadoApp.usuarios_conectados.delete(socketId);
        console.log('🔌 Usuario removido de sesiones Socket.IO');
        
        // Notificar via Socket.IO si está disponible
        if (req.io) {
          req.io.to(socketId).emit('logout_success', {
            message: 'Sesión cerrada correctamente',
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    console.log('📊 Sesiones restantes:', {
      socket_io: global.estadoApp?.usuarios_conectados?.size || 0,
      api_rest: global.estadoApp?.sesiones_api?.size || 0
    });
    
    sendSuccess(res, null, 'Logout exitoso');
    console.log('👋 ===== LOGOUT COMPLETADO =====');

  } catch (error) {
    console.error('💥 Error en logout:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// 👈 FUNCIÓN TEMPORAL: Limpiar todas las sesiones (CORREGIDA)
const clearAllSessions = async (req, res) => {
  try {
    console.log('🧹 ===== LIMPIAR TODAS LAS SESIONES =====');
    
    // Inicializar estado global si no existe
    if (!global.estadoApp) {
      global.estadoApp = { 
        usuarios_conectados: new Map(),
        sesiones_api: new Map()
      };
    }

    // Asegurar que ambos Maps existen
    if (!global.estadoApp.usuarios_conectados) {
      global.estadoApp.usuarios_conectados = new Map();
    }
    if (!global.estadoApp.sesiones_api) {
      global.estadoApp.sesiones_api = new Map();
    }

    const socketSessions = global.estadoApp.usuarios_conectados.size;
    const apiSessions = global.estadoApp.sesiones_api.size;

    console.log('🧹 Sesiones antes de limpiar:', {
      socket_io: socketSessions,
      api_rest: apiSessions
    });

    // Limpiar todo
    global.estadoApp.usuarios_conectados.clear();
    global.estadoApp.sesiones_api.clear();

    console.log('🧹 Sesiones limpiadas:', {
      socket_io_removidas: socketSessions,
      api_removidas: apiSessions
    });

    sendSuccess(res, {
      socket_io_removed: socketSessions,
      api_removed: apiSessions,
      total_removed: socketSessions + apiSessions
    }, 'Todas las sesiones han sido limpiadas');

    console.log('🧹 ===== LIMPIEZA COMPLETADA =====');

  } catch (error) {
    console.error('💥 Error limpiando sesiones:', error);
    sendError(res, 'Error interno del servidor');
  }
};



module.exports = {
  login,
  logout,
  me,
  forceLogout,
  clearAllSessions,
};