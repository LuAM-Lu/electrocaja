// server/src/routes/whatsapp.js (NUEVO)
const express = require('express');
const { 
  conectar, 
  getEstado, 
  desconectar, 
  enviarMensaje,
  enviarPDF,
  enviarFactura,
  enviarServicio, // 🆕 Nueva función
  limpiarSesion,
  diagnostico,
  reconectar
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

// POST /api/whatsapp/enviar-servicio - Enviar mensaje de servicio técnico
router.post('/enviar-servicio', verifyToken, enviarServicio);

// POST /api/whatsapp/enviar-factura - Enviar factura por WhatsApp
router.post('/enviar-factura', verifyToken, enviarFactura);

// POST /api/whatsapp/limpiar-sesion - Limpiar sesión forzadamente
router.post('/limpiar-sesion', verifyToken, limpiarSesion);

// ✅ NUEVAS RUTAS DE DIAGNÓSTICO
router.get('/diagnostico', verifyToken, diagnostico);
router.post('/reconectar', verifyToken, reconectar);

module.exports = router;