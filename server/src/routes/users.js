// server/src/routes/users.js (NUEVO)
const express = require('express');
const {
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  borrarUsuario,
  generateAllTokens,    
  loginByToken,          
  regenerateToken,       
  obtenerPassword,       // 🆕 NUEVO
  resetearPassword      // 🆕 NUEVO
} = require('../controllers/userController');
const { verifyToken, checkPermissions } = require('../middleware/auth');


const router = express.Router();

// POST /api/users/crear - Solo admin
router.post('/crear', verifyToken, checkPermissions(['admin']), crearUsuario);

// GET /api/users - Solo admin
router.get('/', verifyToken, checkPermissions(['admin']), listarUsuarios);

// PUT /api/users/:id - Solo admin
router.put('/:id', verifyToken, checkPermissions(['admin']), actualizarUsuario);

// Agregar esta línea después de las rutas existentes
router.delete('/:id', verifyToken, checkPermissions(['admin']), borrarUsuario);

// 🆕 Nuevas rutas para tokens
router.post('/generate-tokens', verifyToken, generateAllTokens);

// Login por código de barras (sin auth - es un endpoint de login)
router.post('/login-by-token', loginByToken);

// Regenerar token para usuario específico (solo admin)
router.put('/:userId/regenerate-token', verifyToken, regenerateToken);

// 🆕 NUEVO: Ver password de usuario (solo admin)
router.get('/:id/password', verifyToken, checkPermissions(['admin']), obtenerPassword);

// 🆕 NUEVO: Resetear password de usuario (solo admin)
router.post('/:id/reset-password', verifyToken, checkPermissions(['admin']), resetearPassword);

module.exports = router;