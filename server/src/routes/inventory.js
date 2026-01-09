// routes/inventory.js - VERSIÓN COMPLETA FUNCIONAL
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  adjustStock,
  searchProducts,
  getInventoryStats,
  uploadProductImage,
  deleteProductImage,
  moveTempImage,
  ajusteMasivo
} = require('../controllers/inventoryController');

// ===================================
// 🧪 RUTA DE PRUEBA
// ===================================
router.get('/test', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'API de inventario funcionando correctamente',
    user: req.user.email,
    timestamp: new Date().toISOString()
  });
});

// ===================================
// 🔍 RUTAS DE CONSULTA
// ===================================

// Obtener todos los productos (con filtros y paginación)
// GET /api/inventory/products?search=termo&categoria=electrobar&tipo=PRODUCTO&page=1&limit=20
router.get('/products', verifyToken, getProducts);

// Buscar productos (para modales de venta)
// GET /api/inventory/search?q=termo&limit=10
router.get('/search', verifyToken, searchProducts);

// Obtener estadísticas del inventario
// GET /api/inventory/stats
router.get('/stats', verifyToken, getInventoryStats);

// Obtener producto específico por ID
// GET /api/inventory/products/123
router.get('/products/:id', verifyToken, getProductById);

// ===================================
// ✏️ RUTAS DE MODIFICACIÓN (CRUD)
// ===================================

// Crear nuevo producto
// POST /api/inventory/products
router.post('/products', verifyToken, createProduct);

// Actualizar producto existente
// PUT /api/inventory/products/123
router.put('/products/:id', verifyToken, updateProduct);

// Eliminar producto (soft delete)
// DELETE /api/inventory/products/123
router.delete('/products/:id', verifyToken, deleteProduct);

// ===================================
// 📦 RUTAS DE GESTIÓN DE STOCK
// ===================================

// Ajustar stock manualmente
// POST /api/inventory/products/123/adjust-stock
// Body: { cantidad: 10, motivo: "Inventario físico", observaciones: "Conteo manual" }
router.post('/products/:id/adjust-stock', verifyToken, adjustStock);

// Mover imagen temporal a definitiva
// POST /api/inventory/move-temp-image
router.post('/move-temp-image', verifyToken, moveTempImage);

// ===================================
// 💰 AJUSTE MASIVO DE PRECIOS
// ===================================
// Ajuste masivo de precios (Solo Admin)
// POST /api/inventory/ajuste-masivo
router.post('/ajuste-masivo', verifyToken, ajusteMasivo);

// ===================================
// 🔍 RUTAS DE VALIDACIÓN (PARA FORMULARIOS)
// ===================================


// Validar códigos duplicados
// GET /api/inventory/validate-codes?codigoBarras=123456&codigoInterno=INT001&excludeId=5
router.get('/validate-codes', verifyToken, async (req, res) => {
  try {
    const { codigoBarras, codigoInterno, excludeId } = req.query;

    if (!codigoBarras && !codigoInterno) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un código para validar'
      });
    }

    const where = {
      ...(excludeId && { id: { not: parseInt(excludeId) } }),
      OR: [
        ...(codigoBarras ? [{ codigoBarras }] : []),
        ...(codigoInterno ? [{ codigoInterno }] : [])
      ]
    };

    const existingProduct = await prisma.product.findFirst({ where });

    if (existingProduct) {
      const duplicateField = existingProduct.codigoBarras === codigoBarras ? 'codigoBarras' : 'codigoInterno';
      const duplicateValue = existingProduct.codigoBarras === codigoBarras ? codigoBarras : codigoInterno;

      return res.json({
        success: false,
        isDuplicate: true,
        field: duplicateField,
        value: duplicateValue,
        existingProduct: {
          id: existingProduct.id,
          descripcion: existingProduct.descripcion,
          codigoBarras: existingProduct.codigoBarras,
          codigoInterno: existingProduct.codigoInterno
        },
        message: `El ${duplicateField === 'codigoBarras' ? 'código de barras' : 'código interno'} "${duplicateValue}" ya existe`
      });
    }

    res.json({
      success: true,
      isDuplicate: false,
      message: 'Códigos disponibles'
    });

  } catch (error) {
    console.error('Error en validate-codes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar códigos',
      error: error.message
    });
  }
});

// ===================================
// 📊 RUTAS DE REPORTES
// ===================================

// Obtener productos con stock bajo
// GET /api/inventory/low-stock?limit=5
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const lowStockProducts = await prisma.product.findMany({
      where: {
        activo: true,
        stock: { lte: prisma.product.fields.stockMinimo }
      },
      include: {
        creadoPor: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: [
        { stock: 'asc' },
        { descripcion: 'asc' }
      ],
      take: parseInt(limit)
    });

    const productsWithAvailableStock = lowStockProducts.map(product => ({
      ...product,
      stockDisponible: product.stock - product.stockReservado
    }));

    res.json({
      success: true,
      data: productsWithAvailableStock,
      count: productsWithAvailableStock.length
    });

  } catch (error) {
    console.error('Error en low-stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos con stock bajo',
      error: error.message
    });
  }
});

// Obtener productos por categoría
// GET /api/inventory/by-category/electrobar
router.get('/by-category/:categoria', verifyToken, async (req, res) => {
  try {
    const { categoria } = req.params;
    const { activo = 'true', limit = 50 } = req.query;

    const products = await prisma.product.findMany({
      where: {
        categoria: { equals: categoria, mode: 'insensitive' },
        activo: activo === 'true'
      },
      include: {
        creadoPor: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { descripcion: 'asc' },
      take: parseInt(limit)
    });

    const productsWithAvailableStock = products.map(product => ({
      ...product,
      stockDisponible: product.stock - product.stockReservado
    }));

    res.json({
      success: true,
      data: productsWithAvailableStock,
      count: productsWithAvailableStock.length,
      categoria
    });

  } catch (error) {
    console.error('Error en by-category:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos por categoría',
      error: error.message
    });
  }
});

// ===================================
// 🔄 RUTAS DE SINCRONIZACIÓN
// ===================================

// Sincronizar inventario completo (para desarrollo)
// GET /api/inventory/sync
router.get('/sync', verifyToken, async (req, res) => {
  try {
    // Obtener todos los productos con información completa
    const products = await prisma.product.findMany({
      include: {
        creadoPor: {
          select: { id: true, nombre: true }
        },
        movimientosStock: {
          orderBy: { fecha: 'desc' },
          take: 5 // Últimos 5 movimientos
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    // Calcular estadísticas
    const stats = await prisma.product.aggregate({
      _count: { id: true },
      _sum: { stock: true },
      where: { activo: true }
    });

    const productsWithAvailableStock = products.map(product => ({
      ...product,
      stockDisponible: product.stock - product.stockReservado
    }));

    res.json({
      success: true,
      message: 'Inventario sincronizado correctamente',
      data: productsWithAvailableStock,
      stats: {
        totalProductos: stats._count.id,
        totalUnidades: stats._sum.stock || 0,
        ultimaActualizacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en sync:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sincronizar inventario',
      error: error.message
    });
  }
});

// ===================================
// 📝 MIDDLEWARE DE LOG
// ===================================

// ===================================
// 🖼️ RUTAS DE GESTIÓN DE IMÁGENES
// ===================================

// Subir imagen de producto
// POST /api/inventory/upload-image
router.post('/upload-image', verifyToken, upload, uploadProductImage);

// Eliminar imagen de producto
// DELETE /api/inventory/products/:id/image
router.delete('/products/:id/image', verifyToken, deleteProductImage);

// ===================================
// 📝 MIDDLEWARE DE LOG
// ===================================

// Log de todas las operaciones de inventario
router.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[INVENTORY] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - User: ${req.user?.email || 'Unknown'}`);
  });

  next();
});

module.exports = router;
