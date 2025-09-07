// server/src/middleware/auth.js (CORREGIDO PARA ROLES EN MINÚSCULAS)
const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responses');

// Verificar JWT
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return sendError(res, 'Token de acceso requerido', 401);
    }

    const token = authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    if (!token) {
      return sendError(res, 'Token de acceso requerido', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expirado', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Token inválido', 401);
    }
    
    console.error('Error verificando token:', error);
    return sendError(res, 'Error de autenticación', 401);
  }
};

// 🔥 CORREGIDO: Verificar permisos con roles en minúsculas
const checkPermissions = (rolesPermitidos) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      console.log('🔍 Verificando permisos:');
      console.log('   - Usuario:', req.user.email);
      console.log('   - Rol actual:', req.user.rol);
      console.log('   - Roles permitidos:', rolesPermitidos);

      // 🔥 NORMALIZAR ROLES: Convertir a minúsculas para comparación
      const rolUsuario = req.user.rol?.toLowerCase();
      const rolesPermitidosNormalizados = rolesPermitidos.map(rol => rol.toLowerCase());

      if (!rolesPermitidosNormalizados.includes(rolUsuario)) {
        console.log('❌ Acceso denegado');
        console.log(`   - Rol del usuario: "${rolUsuario}"`);
        console.log(`   - Roles permitidos: ${rolesPermitidosNormalizados.join(', ')}`);
        return sendError(res, `No tienes permisos para esta acción. Rol requerido: ${rolesPermitidos.join(' o ')}`, 403);
      }

      console.log('✅ Permisos verificados correctamente');
      next();
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return sendError(res, 'Error de autorización', 403);
    }
  };
};

module.exports = {
  verifyToken,
  checkPermissions
};