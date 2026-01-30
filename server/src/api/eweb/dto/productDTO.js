// server/src/api/eweb/dto/productDTO.js
// 🔄 Data Transfer Object - Transforma Product de eapp a estructura eweb
// Sanitiza strings y formatea tipos de datos

const crypto = require('crypto');

/**
 * Transforma un producto interno al formato requerido por eweb
 * @param {Object} product - Producto de la base de datos (Prisma)
 * @param {Object} options - Opciones de transformación
 * @returns {Object} DTO formateado para eweb
 */
function toWebDTO(product, options = {}) {
    const {
        includeInternal = false,  // Incluir campos internos (id, codigoInterno)
        includeTimestamps = true, // Incluir updated_at
        sanitize = true,          // Sanitizar strings
        baseUrl = null            // URL base del servidor para imágenes
    } = options;

    if (!product) return null;

    // Sanitización de strings (eliminar scripts, caracteres peligrosos)
    const sanitizeString = (str) => {
        if (!sanitize || !str) return str || '';
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/[<>]/g, '')
            .trim();
    };

    // Formatear precio a 2 decimales
    const formatPrice = (price) => {
        const num = parseFloat(price) || 0;
        return parseFloat(num.toFixed(2));
    };

    // Construir URL absoluta para imágenes
    const buildImageUrl = (relativePath) => {
        if (!relativePath) return null;

        // Si ya es una URL absoluta, retornarla tal cual
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            return relativePath;
        }

        // Usar baseUrl si está disponible, sino usar variable de entorno
        const serverUrl = baseUrl || process.env.SERVER_PUBLIC_URL || process.env.API_PUBLIC_URL || '';

        // Asegurar que la ruta relativa comience con /
        const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

        return serverUrl ? `${serverUrl}${cleanPath}` : cleanPath;
    };

    // Construir DTO base
    const dto = {
        // Identificadores
        sku: sanitizeString(product.codigoBarras) || '',

        // Información del producto
        nombre: sanitizeString(product.descripcion) || '',
        descripcion: sanitizeString(product.observaciones) || '',
        categoria: sanitizeString(product.categoria) || 'Sin categoría',

        // Precios
        precioUSD: formatPrice(product.precioVenta),

        // Stock
        stock: parseInt(product.stock) || 0,
        stockDisponible: parseInt(product.stockDisponible) || parseInt(product.stock) || 0,

        // Estado
        activo: product.activo === true,
        destacado: product.destacado === true,

        // Imagen (URLs absolutas si hay baseUrl configurado)
        imagen: buildImageUrl(product.imagenUrl),
        imagenThumbnail: buildImageUrl(product.imagenThumbnail),

        // URL de descarga directa vía API (autenticada)
        imagenApiUrl: product.codigoBarras ? `/api/eweb/imagen/${encodeURIComponent(product.codigoBarras)}` : null
    };

    // Agregar campos internos si se solicitan
    if (includeInternal) {
        dto.id = product.id;
        dto.codigoInterno = product.codigoInterno || '';
        dto.tipo = product.tipo || 'PRODUCTO';
        dto.precioCosto = formatPrice(product.precioCosto);
        dto.margen = product.margenPorcentaje ? parseFloat(product.margenPorcentaje) : null;
        dto.stockMinimo = parseInt(product.stockMinimo) || 5;
        dto.ubicacion = sanitizeString(product.ubicacionFisica) || '';
        dto.proveedor = sanitizeString(product.proveedor) || '';
    }

    // Agregar timestamps para sincronización delta
    if (includeTimestamps) {
        dto.updatedAt = product.fechaActualizacion?.toISOString() ||
            product.updated_at?.toISOString() ||
            new Date().toISOString();
    }

    return dto;
}

/**
 * Transforma múltiples productos
 * @param {Array} products - Array de productos
 * @param {Object} options - Opciones de transformación
 * @returns {Array} Array de DTOs
 */
function toWebDTOList(products, options = {}) {
    if (!Array.isArray(products)) return [];
    return products.map(p => toWebDTO(p, options)).filter(Boolean);
}

/**
 * Genera hash MD5 de un DTO para detectar cambios
 * @param {Object} dto - DTO del producto
 * @returns {string} Hash MD5
 */
function generateHash(dto) {
    if (!dto) return '';
    const relevantData = {
        sku: dto.sku,
        nombre: dto.nombre,
        precioUSD: dto.precioUSD,
        stock: dto.stock,
        activo: dto.activo,
        imagen: dto.imagen
    };
    return crypto.createHash('md5').update(JSON.stringify(relevantData)).digest('hex');
}

/**
 * Compara dos DTOs y devuelve los campos que cambiaron
 * @param {Object} oldDTO - DTO anterior
 * @param {Object} newDTO - DTO nuevo
 * @returns {Object} Cambios detectados
 */
function detectChanges(oldDTO, newDTO) {
    if (!oldDTO || !newDTO) return { isNew: !oldDTO, changes: {} };

    const changes = {};
    const relevantFields = ['nombre', 'sku', 'descripcion', 'categoria', 'precioUSD', 'stock', 'activo', 'imagen'];

    for (const field of relevantFields) {
        if (oldDTO[field] !== newDTO[field]) {
            changes[field] = {
                old: oldDTO[field],
                new: newDTO[field]
            };
        }
    }

    return {
        isNew: false,
        hasChanges: Object.keys(changes).length > 0,
        changes
    };
}

/**
 * Transforma datos del request de eweb a formato interno (para validación de stock)
 * @param {Object} webData - Datos del request de eweb
 * @returns {Object} Datos formateados para consulta interna
 */
function fromWebRequest(webData) {
    return {
        sku: webData.sku || webData.codigo || '',
        cantidad: parseInt(webData.cantidad) || 1,
        productoId: webData.id || webData.productoId || null
    };
}

/**
 * Formato de respuesta paginada para sincronización batch
 * @param {Array} products - Productos transformados
 * @param {Object} pagination - Info de paginación
 * @returns {Object} Respuesta formateada
 */
function paginatedResponse(products, pagination) {
    return {
        success: true,
        data: products,
        pagination: {
            page: pagination.page || 1,
            pageSize: pagination.pageSize || 50,
            total: pagination.total || products.length,
            totalPages: Math.ceil((pagination.total || products.length) / (pagination.pageSize || 50)),
            hasMore: pagination.hasMore || false
        },
        meta: {
            timestamp: new Date().toISOString(),
            version: 'v1'
        }
    };
}

/**
 * Formato de respuesta de error
 * @param {string} message - Mensaje de error
 * @param {string} code - Código de error
 * @param {Object} details - Detalles adicionales
 * @returns {Object} Respuesta de error formateada
 */
function errorResponse(message, code = 'ERROR', details = {}) {
    return {
        success: false,
        error: {
            code,
            message,
            details,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Formato de webhook payload
 * @param {string} evento - Tipo de evento
 * @param {Object} data - Datos del evento
 * @param {Object} meta - Metadata adicional
 * @returns {Object} Payload del webhook
 */
function webhookPayload(evento, data, meta = {}) {
    return {
        evento,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            source: 'electrocaja',
            version: 'v1',
            ...meta
        }
    };
}

module.exports = {
    toWebDTO,
    toWebDTOList,
    generateHash,
    detectChanges,
    fromWebRequest,
    paginatedResponse,
    errorResponse,
    webhookPayload
};
