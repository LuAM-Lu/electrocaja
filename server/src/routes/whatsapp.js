// server/src/routes/whatsapp.js (NUEVO)
const express = require('express');
const { 
  conectar, 
  getEstado, 
  desconectar, 
  enviarMensaje,
  enviarPDF,
  enviarFactura,
  limpiarSesion,  // 🆕 NUEVA FUNCIÓN 
  diagnostico,    // ✅ NUEVA FUNCIÓN AGREGADA
  reconectar      // ✅ NUEVA FUNCIÓN AGREGADA
} = require('../controllers/whatsappController');

const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/whatsapp/estado - Obtener estado actual
router.get('/estado', verifyToken, getEstado);

// POST /api/whatsapp/conectar - Inicializar WhatsApp
router.post('/conectar', verifyToken, conectar);

// POST /api/whatsapp/desconectar - Desconectar WhatsApp
router.post('/desconectar', verifyToken, desconectar);

// POST /api/whatsapp/enviar - Enviar mensaje
router.post('/enviar', verifyToken, enviarMensaje);

// POST /api/whatsapp/pdf - Enviar PDF
router.post('/pdf', verifyToken, enviarPDF);

// Agregar esta ruta
router.post('/enviar-factura', verifyToken, enviarFactura);

// POST /api/whatsapp/limpiar-sesion - Limpiar sesión forzadamente
router.post('/limpiar-sesion', verifyToken, limpiarSesion);

// ✅ NUEVAS RUTAS DE DIAGNÓSTICO
router.get('/diagnostico', verifyToken, diagnostico);
router.post('/reconectar', verifyToken, reconectar);

module.exports = router;