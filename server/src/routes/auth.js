// server/src/routes/auth.js (CORREGIDO)
const express = require('express');
const { login, logout, me, forceLogout, clearAllSessions, loginByToken } = require('../controllers/authController');
const { verifyToken, checkPermissions } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - SIN MIDDLEWARE
router.post('/login', login);

// 🎯 POST /api/auth/login-token - Login por QR/Barcode (SIN MIDDLEWARE)
router.post('/login-token', loginByToken);

// POST /api/auth/logout 
router.post('/logout', verifyToken, logout);

// GET /api/auth/me
router.get('/me', verifyToken, me);

// POST /api/auth/force-logout - ROLES EN MINÚSCULAS
router.post('/force-logout', verifyToken, checkPermissions(['admin']), forceLogout);

// RUTA TEMPORAL: Limpiar todas las sesiones
router.post('/clear-sessions', clearAllSessions);

// POST /api/auth/validate-quick-token - Validar token de acceso rápido
router.post('/validate-quick-token', async (req, res) => {
  console.log('🔧 ENDPOINT /validate-quick-token EJECUTADO');
  console.log('🔧 req.body:', req.body);
  
  try {
    const { token, accion } = req.body;
    // ... resto del código
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    // Validar token contra lista predefinida
   // Buscar token en la base de datos
// Buscar token en la base de datos usando Prisma
const prisma = require('../config/database');

console.log('🔧 Buscando token en base de datos:', token);

const tokenValido = await prisma.user.findFirst({
  where: {
    quickAccessToken: token
  },
  select: {
    id: true,
    nombre: true,
    email: true,
    rol: true,
    sucursal: true
  }
});

console.log('🔧 Token encontrado en BD:', tokenValido);

if (tokenValido) {
  // Log de auditoría
  console.log(`✅ Token válido usado: ${token} para acción: ${accion} por usuario: ${tokenValido.nombre}`);
 
 const respuesta = {
success: true,
message: 'Token válido',
user: {
  id: tokenValido.id,
  nombre: tokenValido.nombre,
  email: tokenValido.email,
  rol: tokenValido.rol,
  sucursal: tokenValido.sucursal || 'Principal'
}
};

console.log('🔧 ENVIANDO RESPUESTA EXITOSA:', respuesta);
res.json(respuesta);
console.log('🔧 RESPUESTA EXITOSA ENVIADA');

    } else {
      console.log(`❌ Token inválido intentado: ${token}`);
      
      const respuestaError = {
  success: false,
  message: 'Token de autorización inválido'
};

console.log('🔧 ENVIANDO RESPUESTA ERROR 401:', respuestaError);
res.status(401).json(respuestaError);
console.log('🔧 RESPUESTA ERROR 401 ENVIADA');
    }

  } catch (error) {
    console.error('Error validando quick token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/validate-admin-token - Validar token de admin sin afectar sesión
router.post('/validate-admin-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    console.log('🔧 Validando admin token para autorización (sin login)');
    console.log('🔧 Token recibido:', token);

    // ✅ Usar Prisma para buscar usuario por quickAccessToken
    const prisma = require('../config/database');
    
    // Normalizar token: convertir a mayúsculas y eliminar espacios
    const tokenNormalizado = token.toUpperCase().trim().replace(/\s+/g, '');
    
    console.log('🔧 Token normalizado:', tokenNormalizado);
    
    // Buscar usuario por quick_access_token SIN hacer login
    const user = await prisma.user.findFirst({
      where: {
        activo: true,
        quickAccessToken: tokenNormalizado
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        sucursal: true,
        activo: true,
        quickAccessToken: true
      }
    });
    
    console.log('🔧 Usuario encontrado:', user ? `${user.nombre} (${user.rol})` : 'No encontrado');
    console.log('🔧 Token en BD:', user?.quickAccessToken);
    
    if (user && user.rol === 'admin') {
      console.log('✅ Admin token válido:', user.nombre);
      
      res.json({
        success: true,
        message: 'Token de admin válido',
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          sucursal: user.sucursal || 'Principal'
        }
      });
    } else if (user && user.rol !== 'admin') {
      console.log('❌ Token válido pero usuario no es admin:', user.rol);
      
      res.status(403).json({
        success: false,
        message: 'Solo administradores pueden autorizar esta acción'
      });
    } else {
      console.log('❌ Token no válido para autorización');
      
      res.status(401).json({
        success: false,
        message: 'Token de autorización inválido'
      });
    }

  } catch (error) {
    console.error('❌ Error validando admin token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

console.log('🔧 AUTH ROUTES LOADED - validate-quick-token endpoint registrado');
module.exports = router;