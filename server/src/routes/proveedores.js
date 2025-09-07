// server/src/routes/proveedores.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  obtenerProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  obtenerProveedorPorId,
  obtenerProductosPorProveedor
} = require('../controllers/proveedorController');

// ===================================
// 🛣️ RUTAS DE PROVEEDORES
// ===================================

// GET /api/proveedores - Obtener todos los proveedores
router.get('/', verifyToken, obtenerProveedores);

// GET /api/proveedores/:id - Obtener proveedor por ID
router.get('/:id', verifyToken, obtenerProveedorPorId);

// GET /api/proveedores/:id/productos - Obtener productos de un proveedor
router.get('/:id/productos', verifyToken, obtenerProductosPorProveedor);

// POST /api/proveedores - Crear nuevo proveedor
router.post('/', verifyToken, crearProveedor);

// PUT /api/proveedores/:id - Actualizar proveedor
router.put('/:id', verifyToken, actualizarProveedor);

// DELETE /api/proveedores/:id - Eliminar/desactivar proveedor
router.delete('/:id', verifyToken, eliminarProveedor);

module.exports = router;