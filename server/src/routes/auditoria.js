// server/src/routes/auditoria.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const AuditoriaController = require('../controllers/auditoriaController');

// ===================================
// 🛣️ RUTAS DE AUDITORÍA INVENTARIO
// ===================================

// GET /api/auditoria/productos - Obtener productos para auditoría
router.get('/productos', verifyToken, AuditoriaController.getProductosAuditoria);

// GET /api/auditoria/historial - Obtener historial de auditorías
router.get('/historial', verifyToken, AuditoriaController.getHistorialAuditorias);

// POST /api/auditoria/crear - Crear nueva auditoría
router.post('/crear', verifyToken, AuditoriaController.crearAuditoria);

// POST /api/auditoria/aplicar-ajustes - Aplicar ajustes de inventario
router.post('/aplicar-ajustes', verifyToken, AuditoriaController.aplicarAjustes);

module.exports = router;