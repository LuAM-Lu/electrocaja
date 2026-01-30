// server/src/api/eweb/controllers/catalogoController.js
// 📦 Controlador de Catálogo para API Externa
// Endpoints para sincronización con electroshopve, publicidadtv, etc.

const prisma = require('../../../config/database');
const {
    toWebDTO,
    toWebDTOList,
    paginatedResponse,
    errorResponse,
    fromWebRequest
} = require('../dto/productDTO');
const cacheService = require('../services/cacheService');
const webhookService = require('../services/webhookService');

/**
 * GET /api/eweb/catalogo
 * Obtener catálogo completo con paginación y filtros
 */
async function getCatalogo(req, res) {
    try {
        const {
            page = 1,
            pageSize = 50,
            updated_since,        // Filtro delta: solo productos actualizados después de esta fecha
            categoria,
            tipo = 'PRODUCTO',    // PRODUCTO, SERVICIO, ELECTROBAR
            activo,
            stock_min,            // Stock mínimo
            includeInternal = 'false',
            orderBy = 'updated_at',
            order = 'desc'
        } = req.query;

        // Parsear parámetros
        const skip = (parseInt(page) - 1) * parseInt(pageSize);
        const take = Math.min(parseInt(pageSize), 100); // Máximo 100 por página
        const includeInternalBool = includeInternal === 'true';

        // Construir filtros
        const where = {};

        // Filtro por tipo de producto según configuración del cliente
        const syncConfig = req.apiClient?.syncConfig || {};
        const tiposPermitidos = [];

        if (syncConfig.tipoProducto !== false) tiposPermitidos.push('PRODUCTO');
        if (syncConfig.tipoServicio === true) tiposPermitidos.push('SERVICIO');
        if (syncConfig.tipoElectrobar === true) tiposPermitidos.push('ELECTROBAR');

        if (tiposPermitidos.length > 0) {
            where.tipo = { in: tiposPermitidos };
        } else {
            where.tipo = tipo;
        }

        // Filtro de activos
        if (syncConfig.soloActivos !== false) {
            where.activo = true;
        } else if (activo !== undefined) {
            where.activo = activo === 'true';
        }

        // Filtro delta (solo cambios desde cierta fecha)
        if (updated_since) {
            const sinceDate = new Date(updated_since);
            if (!isNaN(sinceDate)) {
                where.fechaActualizacion = { gte: sinceDate };
            }
        }

        // Filtro por categoría
        if (categoria) {
            where.categoria = { contains: categoria, mode: 'insensitive' };
        }

        // Filtro por stock mínimo
        if (stock_min !== undefined) {
            where.stock = { gte: parseInt(stock_min) };
        }

        // Ordenamiento
        const orderByClause = {};
        const validOrderFields = ['fechaActualizacion', 'descripcion', 'precioVenta', 'stock', 'id'];
        const orderField = validOrderFields.includes(orderBy) ? orderBy : 'fechaActualizacion';
        orderByClause[orderField] = order === 'asc' ? 'asc' : 'desc';

        // Obtener productos y conteo total en paralelo
        const [productos, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take,
                orderBy: orderByClause
            }),
            prisma.product.count({ where })
        ]);

        // Transformar a DTOs
        const dtos = toWebDTOList(productos, { includeInternal: includeInternalBool });

        // Respuesta paginada
        return res.json(paginatedResponse(dtos, {
            page: parseInt(page),
            pageSize: take,
            total,
            hasMore: skip + productos.length < total
        }));

    } catch (error) {
        console.error('❌ Error en getCatalogo:', error);
        return res.status(500).json(errorResponse(
            'Error obteniendo catálogo',
            'CATALOG_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * GET /api/eweb/producto/:sku
 * Obtener un producto específico por SKU
 */
async function getProductoBySku(req, res) {
    try {
        const { sku } = req.params;

        if (!sku) {
            return res.status(400).json(errorResponse('SKU requerido', 'SKU_REQUIRED'));
        }

        // Buscar por código de barras
        const producto = await prisma.product.findFirst({
            where: {
                codigoBarras: sku,
                activo: true
            }
        });

        if (!producto) {
            return res.status(404).json(errorResponse(
                'Producto no encontrado',
                'PRODUCT_NOT_FOUND',
                { sku }
            ));
        }

        const dto = toWebDTO(producto, { includeInternal: true });

        return res.json({
            success: true,
            data: dto
        });

    } catch (error) {
        console.error('❌ Error en getProductoBySku:', error);
        return res.status(500).json(errorResponse(
            'Error obteniendo producto',
            'PRODUCT_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * POST /api/eweb/validar-stock
 * Validación de último minuto antes de procesar pago
 * Implementa Optimistic Locking
 */
async function validarStock(req, res) {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json(errorResponse(
                'Se requiere un array de items con sku y cantidad',
                'ITEMS_REQUIRED'
            ));
        }

        // Parsear items del request
        const itemsToValidate = items.map(fromWebRequest);
        const skus = itemsToValidate.map(i => i.sku).filter(Boolean);

        // Obtener productos actuales
        const productos = await prisma.product.findMany({
            where: {
                codigoBarras: { in: skus },
                activo: true
            },
            select: {
                id: true,
                codigoBarras: true,
                descripcion: true,
                stock: true,
                stockDisponible: true,
                precioVenta: true,
                fechaActualizacion: true
            }
        });

        // Mapear por SKU para acceso rápido
        const productosPorSku = new Map();
        for (const p of productos) {
            productosPorSku.set(p.codigoBarras, p);
        }

        // Validar cada item
        const resultados = [];
        let todosDisponibles = true;

        for (const item of itemsToValidate) {
            const producto = productosPorSku.get(item.sku);

            if (!producto) {
                resultados.push({
                    sku: item.sku,
                    disponible: false,
                    motivo: 'PRODUCTO_NO_ENCONTRADO',
                    cantidadSolicitada: item.cantidad,
                    stockActual: 0
                });
                todosDisponibles = false;
                continue;
            }

            const stockDisponible = producto.stockDisponible || producto.stock;
            const disponible = stockDisponible >= item.cantidad;

            if (!disponible) {
                todosDisponibles = false;
            }

            resultados.push({
                sku: item.sku,
                nombre: producto.descripcion,
                disponible,
                motivo: disponible ? 'OK' : 'STOCK_INSUFICIENTE',
                cantidadSolicitada: item.cantidad,
                stockActual: stockDisponible,
                precioUSD: parseFloat(producto.precioVenta),
                updatedAt: producto.fechaActualizacion?.toISOString()
            });
        }

        return res.json({
            success: true,
            todosDisponibles,
            items: resultados,
            timestamp: new Date().toISOString(),
            validezSegundos: 60 // Esta validación es válida por 60 segundos
        });

    } catch (error) {
        console.error('❌ Error en validarStock:', error);
        return res.status(500).json(errorResponse(
            'Error validando stock',
            'VALIDATION_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * POST /api/eweb/reservar-stock
 * Reserva temporal de stock durante el checkout
 */
async function reservarStock(req, res) {
    try {
        const { items, sesionId, tiempoReservaMinutos = 5 } = req.body;
        const stockService = require('../../../services/stockService');

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json(errorResponse('Items requeridos', 'ITEMS_REQUIRED'));
        }

        if (!sesionId) {
            return res.status(400).json(errorResponse('Sesión ID requerido', 'SESSION_REQUIRED'));
        }

        const resultados = [];
        let todasExitosas = true;

        for (const item of items) {
            const producto = await prisma.product.findFirst({
                where: { codigoBarras: item.sku, activo: true }
            });

            if (!producto) {
                resultados.push({
                    sku: item.sku,
                    reservado: false,
                    motivo: 'PRODUCTO_NO_ENCONTRADO'
                });
                todasExitosas = false;
                continue;
            }

            try {
                const resultado = await stockService.reservarStock(
                    producto.id,
                    item.cantidad,
                    sesionId,
                    null, // usuarioId
                    req.clientIp
                );

                resultados.push({
                    sku: item.sku,
                    reservado: resultado.success,
                    motivo: resultado.success ? 'OK' : resultado.error,
                    stockReservado: resultado.success ? item.cantidad : 0
                });

                if (!resultado.success) {
                    todasExitosas = false;
                }

            } catch (error) {
                resultados.push({
                    sku: item.sku,
                    reservado: false,
                    motivo: error.message
                });
                todasExitosas = false;
            }
        }

        // Si alguna falló, liberar las exitosas
        if (!todasExitosas) {
            for (const resultado of resultados) {
                if (resultado.reservado) {
                    const producto = await prisma.product.findFirst({
                        where: { codigoBarras: resultado.sku }
                    });
                    if (producto) {
                        await stockService.liberarStock(
                            producto.id,
                            sesionId,
                            null,
                            null,
                            req.clientIp
                        ).catch(console.error);
                    }
                }
            }
        }

        return res.json({
            success: todasExitosas,
            items: resultados,
            sesionId,
            expiresAt: new Date(Date.now() + tiempoReservaMinutos * 60 * 1000).toISOString()
        });

    } catch (error) {
        console.error('❌ Error en reservarStock:', error);
        return res.status(500).json(errorResponse(
            'Error reservando stock',
            'RESERVATION_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * POST /api/eweb/liberar-stock
 * Libera stock reservado (cuando cancela checkout)
 */
async function liberarStock(req, res) {
    try {
        const { sesionId } = req.body;
        const stockService = require('../../../services/stockService');

        if (!sesionId) {
            return res.status(400).json(errorResponse('Sesión ID requerido', 'SESSION_REQUIRED'));
        }

        const resultado = await stockService.liberarTodasLasReservasDeSesion(
            sesionId,
            null,
            req.clientIp
        );

        return res.json({
            success: true,
            liberados: resultado.productosLiberados || 0,
            sesionId
        });

    } catch (error) {
        console.error('❌ Error en liberarStock:', error);
        return res.status(500).json(errorResponse(
            'Error liberando stock',
            'RELEASE_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * POST /api/eweb/confirmar-venta
 * Confirma una venta procesada en eweb (descuenta stock definitivo)
 */
async function confirmarVenta(req, res) {
    try {
        const { sesionId, items, ordenId } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json(errorResponse('Items requeridos', 'ITEMS_REQUIRED'));
        }

        const stockService = require('../../../services/stockService');
        const resultados = [];

        // Si hay sesión con reservas, primero liberar (ya que descontaremos el stock real)
        if (sesionId) {
            await stockService.liberarTodasLasReservasDeSesion(
                sesionId,
                null,
                req.clientIp
            ).catch(console.error);
        }

        // Descontar stock definitivamente
        for (const item of items) {
            const producto = await prisma.product.findFirst({
                where: { codigoBarras: item.sku, activo: true }
            });

            if (!producto) {
                resultados.push({
                    sku: item.sku,
                    procesado: false,
                    motivo: 'PRODUCTO_NO_ENCONTRADO'
                });
                continue;
            }

            try {
                // Descontar stock
                await prisma.product.update({
                    where: { id: producto.id },
                    data: {
                        stock: { decrement: item.cantidad },
                        stockDisponible: { decrement: item.cantidad },
                        ultimaVenta: new Date()
                    }
                });

                // Registrar movimiento
                await prisma.stockMovement.create({
                    data: {
                        productoId: producto.id,
                        tipo: 'SALIDA',
                        cantidad: item.cantidad,
                        stockAnterior: producto.stock,
                        stockNuevo: producto.stock - item.cantidad,
                        precio: producto.precioVenta,
                        motivo: `Venta Web - Orden ${ordenId || 'N/A'}`,
                        usuarioId: 1, // Sistema
                        fecha: new Date(),
                        ipAddress: req.clientIp
                    }
                });

                resultados.push({
                    sku: item.sku,
                    procesado: true,
                    stockAnterior: producto.stock,
                    stockNuevo: producto.stock - item.cantidad
                });

                // Disparar webhook de stock actualizado
                const productoActualizado = await prisma.product.findUnique({
                    where: { id: producto.id }
                });

                webhookService.onStockUpdated(
                    productoActualizado,
                    producto.stock,
                    productoActualizado.stock,
                    `Venta Web - Orden ${ordenId || 'N/A'}`,
                    null
                ).catch(console.error);

            } catch (error) {
                resultados.push({
                    sku: item.sku,
                    procesado: false,
                    motivo: error.message
                });
            }
        }

        return res.json({
            success: true,
            items: resultados,
            ordenId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error en confirmarVenta:', error);
        return res.status(500).json(errorResponse(
            'Error confirmando venta',
            'CONFIRM_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * GET /api/eweb/sync-batch
 * Sincronización masiva con paginación para reconstruir catálogo
 */
async function syncBatch(req, res) {
    try {
        const {
            cursor,           // ID del último producto procesado
            limit = 100,
            updated_since
        } = req.query;

        const take = Math.min(parseInt(limit), 500);

        const where = {
            activo: true,
            tipo: 'PRODUCTO'
        };

        if (cursor) {
            where.id = { gt: parseInt(cursor) };
        }

        if (updated_since) {
            const sinceDate = new Date(updated_since);
            if (!isNaN(sinceDate)) {
                where.fechaActualizacion = { gte: sinceDate };
            }
        }

        const productos = await prisma.product.findMany({
            where,
            take: take + 1, // +1 para detectar si hay más
            orderBy: { id: 'asc' }
        });

        const hasMore = productos.length > take;
        const data = productos.slice(0, take);
        const dtos = toWebDTOList(data, { includeInternal: true });

        const lastProduct = data[data.length - 1];

        return res.json({
            success: true,
            data: dtos,
            pagination: {
                nextCursor: hasMore ? lastProduct?.id : null,
                hasMore,
                count: dtos.length
            },
            meta: {
                timestamp: new Date().toISOString(),
                version: 'v1'
            }
        });

    } catch (error) {
        console.error('❌ Error en syncBatch:', error);
        return res.status(500).json(errorResponse(
            'Error en sincronización batch',
            'SYNC_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * GET /api/eweb/health
 * Healthcheck del servicio
 */
async function health(req, res) {
    try {
        // Verificar conexión a DB
        await prisma.$queryRaw`SELECT 1`;

        const stats = await cacheService.getStats();
        const webhookStats = await webhookService.getStats(req.apiClient?.id);

        return res.json({
            success: true,
            status: 'healthy',
            service: 'electrocaja-api',
            version: 'v1',
            timestamp: new Date().toISOString(),
            cache: stats,
            webhooks: webhookStats
        });

    } catch (error) {
        return res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
}

/**
 * GET /api/eweb/imagen/:sku
 * Servir imagen del producto (proxy autenticado)
 * @query type - 'original' (default) o 'thumbnail'
 */
async function getProductImage(req, res) {
    const path = require('path');
    const fs = require('fs').promises;

    try {
        const { sku } = req.params;
        const { type = 'original' } = req.query;

        if (!sku) {
            return res.status(400).json(errorResponse('SKU requerido', 'SKU_REQUIRED'));
        }

        // Buscar producto por SKU
        const producto = await prisma.product.findFirst({
            where: {
                codigoBarras: sku,
                activo: true
            },
            select: {
                id: true,
                imagenUrl: true,
                imagenThumbnail: true,
                descripcion: true
            }
        });

        if (!producto) {
            return res.status(404).json(errorResponse(
                'Producto no encontrado',
                'PRODUCT_NOT_FOUND',
                { sku }
            ));
        }

        // Seleccionar imagen según tipo
        const imagenPath = type === 'thumbnail'
            ? producto.imagenThumbnail
            : producto.imagenUrl;

        if (!imagenPath) {
            return res.status(404).json(errorResponse(
                'El producto no tiene imagen',
                'IMAGE_NOT_FOUND',
                { sku, type }
            ));
        }

        // Construir ruta absoluta del archivo
        // Las imágenes están en client/public/uploads/products/
        const uploadsBase = path.resolve(__dirname, '../../../../client/public');
        const absolutePath = path.join(uploadsBase, imagenPath);

        // Verificar que el archivo existe
        try {
            await fs.access(absolutePath);
        } catch {
            // Intentar ruta alternativa (directamente en server/uploads)
            const altPath = path.resolve(__dirname, '../../../..', imagenPath.replace(/^\//, ''));
            try {
                await fs.access(altPath);
                // Usar ruta alternativa
                return sendImageFile(res, altPath, imagenPath);
            } catch {
                return res.status(404).json(errorResponse(
                    'Archivo de imagen no encontrado',
                    'FILE_NOT_FOUND',
                    { sku, path: imagenPath }
                ));
            }
        }

        return sendImageFile(res, absolutePath, imagenPath);

    } catch (error) {
        console.error('❌ Error en getProductImage:', error);
        return res.status(500).json(errorResponse(
            'Error obteniendo imagen',
            'IMAGE_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * Helper: Enviar archivo de imagen con headers apropiados
 */
async function sendImageFile(res, filePath, originalPath) {
    const path = require('path');
    const fs = require('fs');

    // Determinar content-type basado en extensión
    const ext = path.extname(originalPath).toLowerCase();
    const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Headers de caché (1 hora)
    res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
    });

    // Stream del archivo
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
        console.error('Error streaming image:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Error leyendo imagen' });
        }
    });

    stream.pipe(res);
}

module.exports = {
    getCatalogo,
    getProductoBySku,
    getProductImage,
    validarStock,
    reservarStock,
    liberarStock,
    confirmarVenta,
    syncBatch,
    health
};
