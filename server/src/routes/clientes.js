// server/src/routes/clientes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerClientePorId
} = require('../controllers/clienteController');

// ===================================
// 🛣️ RUTAS DE CLIENTES
// ===================================

// GET /api/clientes - Obtener todos los clientes
router.get('/', verifyToken, obtenerClientes);

// GET /api/clientes/:id - Obtener cliente por ID
router.get('/:id', verifyToken, obtenerClientePorId);

// POST /api/clientes - Crear nuevo cliente
router.post('/', verifyToken, crearCliente);

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', verifyToken, actualizarCliente);

// DELETE /api/clientes/:id - Eliminar/desactivar cliente
router.delete('/:id', verifyToken, eliminarCliente);

module.exports = router;