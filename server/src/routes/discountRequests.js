const express = require('express');
const router = express.Router();
const discountRequestController = require('../controllers/discountRequestController');
const { verifyToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// POST /api/discount-requests - Crear solicitud de descuento
router.post('/', discountRequestController.crearSolicitudDescuento);

// GET /api/discount-requests/pendientes - Obtener solicitudes pendientes (solo admin)
router.get('/pendientes', discountRequestController.obtenerSolicitudesPendientes);

// GET /api/discount-requests/sesion/:sesionId - Obtener estado de solicitud por sesión
router.get('/sesion/:sesionId', discountRequestController.obtenerEstadoSolicitud);

// POST /api/discount-requests/:id/aprobar - Aprobar solicitud (solo admin)
router.post('/:id/aprobar', discountRequestController.aprobarSolicitudDescuento);

// POST /api/discount-requests/:id/rechazar - Rechazar solicitud (solo admin)
router.post('/:id/rechazar', discountRequestController.rechazarSolicitudDescuento);

// DELETE /api/discount-requests/sesion/:sesionId - Cancelar solicitud
router.delete('/sesion/:sesionId', discountRequestController.cancelarSolicitudDescuento);

module.exports = router;

