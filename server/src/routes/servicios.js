const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/serviciosController');
const { verifyToken } = require('../middleware/auth');

// ===================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ===================================
router.use(verifyToken);

// ===================================
// RUTAS PRINCIPALES
// ===================================

// GET /api/servicios - Listar servicios con filtros
router.get('/', serviciosController.getServicios);

// GET /api/servicios/tecnicos - Obtener lista de técnicos
router.get('/tecnicos', serviciosController.getTecnicos);

// GET /api/servicios/tecnicos/config - Obtener configuración de técnicos
router.get('/tecnicos/config', serviciosController.getTecnicosConfig);

// POST /api/servicios/tecnicos/config - Guardar configuración de técnicos
router.post('/tecnicos/config', serviciosController.saveTecnicosConfig);

// GET /api/servicios/:id - Obtener servicio por ID
router.get('/:id', serviciosController.getServicioById);

// POST /api/servicios - Crear nuevo servicio
router.post('/', serviciosController.createServicio);

// PUT /api/servicios/:id - Actualizar servicio
router.put('/:id', serviciosController.updateServicio);

// DELETE /api/servicios/:id - Eliminar servicio (solo admin)
router.delete('/:id', serviciosController.deleteServicio);

// ===================================
// RUTAS ESPECÍFICAS
// ===================================

// PATCH /api/servicios/:id/estado - Cambiar estado del servicio
router.patch('/:id/estado', serviciosController.cambiarEstado);

// POST /api/servicios/:id/pagos - Registrar pago (inicial o final)
router.post('/:id/pagos', serviciosController.registrarPago);

// POST /api/servicios/:id/notas - Agregar nota técnica
router.post('/:id/notas', serviciosController.agregarNota);

module.exports = router;
