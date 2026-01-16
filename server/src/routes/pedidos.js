// routes/pedidos.js - Rutas de Pedidos
const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { verifyToken } = require('../middleware/auth');

// ===================================
// RUTAS DE PEDIDOS
// ===================================

// Obtener estadísticas (antes de :id para evitar conflictos)
router.get('/estadisticas', verifyToken, pedidosController.obtenerEstadisticas);

// CRUD básico
router.post('/', verifyToken, pedidosController.crearPedido);
router.get('/', verifyToken, pedidosController.listarPedidos);
router.get('/:id', verifyToken, pedidosController.obtenerPedido);

// Cambiar estado
router.patch('/:id/estado', verifyToken, pedidosController.cambiarEstado);

// Facturar pedido pendiente
router.post('/:id/facturar', verifyToken, pedidosController.facturarPedido);

module.exports = router;

