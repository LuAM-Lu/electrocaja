// server/src/routes/ventas.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  reservarStock,
  liberarStock,
  guardarVentaEnEspera,
  obtenerVentasEnEspera,
  procesarVenta,
  retomarVentaEnEspera,
  obtenerStockDisponible,
  limpiarReservasExpiradas,
  heartbeatReservas  // 🆕 AGREGAR
} = require('../controllers/ventasController');

// ===================================
// 🛣️ RUTAS DE VENTAS
// ===================================

// 🚀 PROCESAR VENTA COMPLETA
// POST /api/ventas/procesar
router.post('/procesar', verifyToken, procesarVenta);

// 💾 GUARDAR VENTA EN ESPERA
// POST /api/ventas/guardar-espera
router.post('/guardar-espera', verifyToken, guardarVentaEnEspera);

// 📋 OBTENER VENTAS EN ESPERA
// GET /api/ventas/en-espera
router.get('/en-espera', verifyToken, obtenerVentasEnEspera);

// 🔄 RETOMAR VENTA EN ESPERA
// POST /api/ventas/retomar/:id
router.post('/retomar/:id', verifyToken, retomarVentaEnEspera);

// ===================================
// 🛣️ RUTAS DE STOCK
// ===================================

// 🔒 RESERVAR STOCK
// POST /api/ventas/stock/reservar
router.post('/stock/reservar', verifyToken, reservarStock);

// 🔒 RESERVAR MÚLTIPLES PRODUCTOS (BOTÓN "SIGUIENTE")
// POST /api/ventas/stock/reservar-multiples
router.post('/stock/reservar-multiples', verifyToken, reservarStock); // Usa la misma función optimizada

// 🔓 LIBERAR STOCK
// POST /api/ventas/stock/liberar
router.post('/stock/liberar', verifyToken, liberarStock);

// 📊 OBTENER STOCK DISPONIBLE
// GET /api/ventas/stock/disponible/:id
router.get('/stock/disponible/:id', verifyToken, obtenerStockDisponible);

// 🧹 LIMPIAR RESERVAS EXPIRADAS (solo admin/supervisor)
// POST /api/ventas/stock/limpiar-reservas
router.post('/stock/limpiar-reservas', verifyToken, (req, res, next) => {
  // Validar permisos de administrador
  const rolNormalizado = req.user.rol?.toLowerCase();
  if (!['admin', 'supervisor'].includes(rolNormalizado)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para limpiar reservas'
    });
  }
  next();
}, limpiarReservasExpiradas);

// 💓 HEARTBEAT PARA MANTENER RESERVAS VIVAS
// POST /api/ventas/stock/heartbeat
router.post('/stock/heartbeat', verifyToken, heartbeatReservas);

module.exports = router;