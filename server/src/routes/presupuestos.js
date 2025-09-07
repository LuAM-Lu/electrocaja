// server/src/routes/presupuestos.js - RUTAS ESPECÍFICAS PARA PRESUPUESTOS 🎯
const express = require('express');
const router = express.Router();

// Importar controladores
const { 
  enviarPresupuestoPorEmail,
  enviarPresupuestoPorWhatsApp,
  obtenerEstadisticasPresupuestos
} = require('../controllers/presupuestoController');

// Importar middleware de autenticación
const { verifyToken } = require('../middleware/auth');

// 📧 POST /api/presupuestos/enviar-email - Enviar presupuesto por email
router.post('/enviar-email', verifyToken, enviarPresupuestoPorEmail);

// 📱 POST /api/presupuestos/enviar-whatsapp - Enviar presupuesto por WhatsApp
router.post('/enviar-whatsapp', verifyToken, enviarPresupuestoPorWhatsApp);

// 📊 GET /api/presupuestos/estadisticas - Obtener estadísticas (futuro)
router.get('/estadisticas', verifyToken, obtenerEstadisticasPresupuestos);

// 🔍 GET /api/presupuestos/test - Endpoint de prueba
router.get('/test', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'API de presupuestos funcionando correctamente',
    timestamp: new Date().toISOString(),
    usuario: req.user?.nombre || 'Usuario autenticado',
    endpoints_disponibles: [
      'POST /api/presupuestos/enviar-email',
      'POST /api/presupuestos/enviar-whatsapp',
      'GET /api/presupuestos/estadisticas'
    ]
  });
});

module.exports = router;