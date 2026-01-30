// server/src/api/eweb/routes/index.js
// 🌐 Rutas de la API Externa (eweb)
// Endpoints para electroshopve.com, publicidadtv, y futuras apps

const express = require('express');
const router = express.Router();

// Middleware de autenticación
const {
    authenticateApiClient,
    requirePermission,
    logResponse
} = require('../middleware/apiAuth');

// Controladores
const catalogoController = require('../controllers/catalogoController');
const clienteApiController = require('../controllers/clienteApiController');

// ============================================
// 📖 RUTAS PÚBLICAS (Solo healthcheck)
// ============================================

/**
 * @route GET /api/eweb/health
 * @desc Health check del servicio
 * @access Público
 */
router.get('/health', catalogoController.health);

// ============================================
// 📦 RUTAS DE CATÁLOGO (Requieren autenticación)
// ============================================

/**
 * @route GET /api/eweb/catalogo
 * @desc Obtener catálogo completo paginado
 * @access API Key / JWT
 * @query page, pageSize, updated_since, categoria, tipo, activo, stock_min
 */
router.get('/catalogo',
    authenticateApiClient,
    logResponse,
    requirePermission('read'),
    catalogoController.getCatalogo
);

/**
 * @route GET /api/eweb/producto/:sku
 * @desc Obtener producto por SKU
 * @access API Key / JWT
 */
router.get('/producto/:sku',
    authenticateApiClient,
    logResponse,
    requirePermission('read'),
    catalogoController.getProductoBySku
);

/**
 * @route GET /api/eweb/sync-batch
 * @desc Sincronización batch con cursor para reconstrucción de catálogo
 * @access API Key / JWT
 * @query cursor, limit, updated_since
 */
router.get('/sync-batch',
    authenticateApiClient,
    logResponse,
    requirePermission('read'),
    catalogoController.syncBatch
);

/**
 * @route GET /api/eweb/imagen/:sku
 * @desc Descargar imagen del producto por SKU
 * @access API Key / JWT (autenticado)
 * @param sku - SKU del producto (código de barras)
 * @query type - 'original' (default) o 'thumbnail'
 */
router.get('/imagen/:sku',
    authenticateApiClient,
    catalogoController.getProductImage
);

// ============================================
// 🔒 RUTAS DE VALIDACIÓN DE STOCK (Tiempo Real)
// ============================================

/**
 * @route POST /api/eweb/validar-stock
 * @desc Validar disponibilidad de stock (último minuto antes de pago)
 * @access API Key / JWT
 * @body { items: [{ sku, cantidad }] }
 */
router.post('/validar-stock',
    authenticateApiClient,
    logResponse,
    requirePermission('read'),
    catalogoController.validarStock
);

/**
 * @route POST /api/eweb/reservar-stock
 * @desc Reservar stock temporalmente durante checkout
 * @access API Key / JWT
 * @body { items: [{ sku, cantidad }], sesionId, tiempoReservaMinutos }
 */
router.post('/reservar-stock',
    authenticateApiClient,
    logResponse,
    requirePermission('write'),
    catalogoController.reservarStock
);

/**
 * @route POST /api/eweb/liberar-stock
 * @desc Liberar stock reservado (cancelación de checkout)
 * @access API Key / JWT
 * @body { sesionId }
 */
router.post('/liberar-stock',
    authenticateApiClient,
    logResponse,
    requirePermission('write'),
    catalogoController.liberarStock
);

/**
 * @route POST /api/eweb/confirmar-venta
 * @desc Confirmar venta procesada en web (descuenta stock definitivo)
 * @access API Key / JWT
 * @body { sesionId, items: [{ sku, cantidad }], ordenId }
 */
router.post('/confirmar-venta',
    authenticateApiClient,
    logResponse,
    requirePermission('write'),
    catalogoController.confirmarVenta
);

// ============================================
// 🔐 RUTAS DE ADMINISTRACIÓN (Solo Admin de Electrocaja)
// ============================================

// Middleware para verificar que es un admin interno (no un cliente API externo)
const { verifyToken: verificarAdminInterno } = require('../../../middleware/auth');

/**
 * @route POST /api/eweb/admin/clientes
 * @desc Crear nuevo cliente API
 * @access Admin interno
 */
router.post('/admin/clientes',
    verificarAdminInterno,
    clienteApiController.crearCliente
);

/**
 * @route GET /api/eweb/admin/clientes
 * @desc Listar todos los clientes API
 * @access Admin interno
 */
router.get('/admin/clientes',
    verificarAdminInterno,
    clienteApiController.listarClientes
);

/**
 * @route GET /api/eweb/admin/clientes/:id
 * @desc Obtener detalle de un cliente
 * @access Admin interno
 */
router.get('/admin/clientes/:id',
    verificarAdminInterno,
    clienteApiController.obtenerCliente
);

/**
 * @route PUT /api/eweb/admin/clientes/:id
 * @desc Actualizar cliente API
 * @access Admin interno
 */
router.put('/admin/clientes/:id',
    verificarAdminInterno,
    clienteApiController.actualizarCliente
);

/**
 * @route POST /api/eweb/admin/clientes/:id/regenerar-apikey
 * @desc Regenerar API Key de un cliente
 * @access Admin interno
 */
router.post('/admin/clientes/:id/regenerar-apikey',
    verificarAdminInterno,
    clienteApiController.regenerarApiKey
);

/**
 * @route POST /api/eweb/admin/clientes/:id/token
 * @desc Generar JWT para un cliente
 * @access Admin interno
 */
router.post('/admin/clientes/:id/token',
    verificarAdminInterno,
    clienteApiController.generarToken
);

/**
 * @route POST /api/eweb/admin/clientes/:id/webhooks
 * @desc Agregar webhook a un cliente
 * @access Admin interno
 */
router.post('/admin/clientes/:id/webhooks',
    verificarAdminInterno,
    clienteApiController.agregarWebhook
);

/**
 * @route POST /api/eweb/admin/webhooks/:id/test
 * @desc Probar conexión a un webhook
 * @access Admin interno
 */
router.post('/admin/webhooks/:id/test',
    verificarAdminInterno,
    clienteApiController.testWebhook
);

/**
 * @route DELETE /api/eweb/admin/webhooks/:id
 * @desc Eliminar un webhook
 * @access Admin interno
 */
router.delete('/admin/webhooks/:id',
    verificarAdminInterno,
    clienteApiController.eliminarWebhook
);

/**
 * @route GET /api/eweb/admin/logs
 * @desc Obtener logs de API
 * @access Admin interno
 */
router.get('/admin/logs',
    verificarAdminInterno,
    clienteApiController.obtenerLogs
);

/**
 * @route GET /api/eweb/admin/webhook-logs
 * @desc Obtener logs de webhooks
 * @access Admin interno
 */
router.get('/admin/webhook-logs',
    verificarAdminInterno,
    clienteApiController.obtenerWebhookLogs
);

module.exports = router;
