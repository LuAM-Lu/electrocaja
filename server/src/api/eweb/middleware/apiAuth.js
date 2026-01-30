// server/src/api/eweb/middleware/apiAuth.js
// 🔐 Middleware de autenticación para API externa
// Soporta JWT, API Keys, IP Whitelist y Rate Limiting

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../../config/database');
const { errorResponse } = require('../dto/productDTO');

// Cache en memoria para rate limiting (en producción usar Redis)
const rateLimitCache = new Map();

/**
 * Genera hash SHA256 de una API Key
 */
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Valida formato de API Key
 */
function isValidApiKeyFormat(apiKey) {
    // Formato: ec_[tipo]_[32 caracteres hex]
    // Ejemplo: ec_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
    return /^ec_(live|test)_[a-f0-9]{32}$/i.test(apiKey);
}

/**
 * Middleware principal de autenticación
 * Soporta:
 * - Bearer Token (JWT)
 * - API Key en header X-API-Key
 * - API Key en query param ?api_key=
 */
async function authenticateApiClient(req, res, next) {
    const startTime = Date.now();

    try {
        let apiClient = null;
        let authMethod = null;

        // 1. Intentar autenticación por Bearer Token (JWT)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            apiClient = await verifyJWT(token);
            authMethod = 'jwt';
        }

        // 2. Intentar autenticación por API Key en header
        if (!apiClient) {
            const apiKey = req.headers['x-api-key'];
            if (apiKey) {
                apiClient = await verifyApiKey(apiKey);
                authMethod = 'api_key_header';
            }
        }

        // 3. Intentar autenticación por API Key en query
        if (!apiClient) {
            const apiKey = req.query.api_key;
            if (apiKey) {
                apiClient = await verifyApiKey(apiKey);
                authMethod = 'api_key_query';
            }
        }

        // Si no hay cliente autenticado, denegar acceso
        if (!apiClient) {
            await logApiRequest(req, null, 401, Date.now() - startTime, 'Autenticación requerida');
            return res.status(401).json(errorResponse(
                'Autenticación requerida. Proporciona un JWT válido o API Key.',
                'AUTH_REQUIRED'
            ));
        }

        // 4. Verificar si el cliente está activo
        if (!apiClient.activo) {
            await logApiRequest(req, apiClient.id, 403, Date.now() - startTime, 'Cliente desactivado');
            return res.status(403).json(errorResponse(
                'Cliente API desactivado. Contacta al administrador.',
                'CLIENT_DISABLED'
            ));
        }

        // 5. Verificar IP Whitelist
        const clientIp = getClientIp(req);
        if (!verifyIpWhitelist(apiClient, clientIp)) {
            await logApiRequest(req, apiClient.id, 403, Date.now() - startTime, `IP no autorizada: ${clientIp}`);
            return res.status(403).json(errorResponse(
                `IP no autorizada: ${clientIp}`,
                'IP_NOT_WHITELISTED'
            ));
        }

        // 6. Verificar Rate Limit
        const rateLimitResult = checkRateLimit(apiClient, req);
        if (!rateLimitResult.allowed) {
            await logApiRequest(req, apiClient.id, 429, Date.now() - startTime, 'Rate limit excedido');
            res.set({
                'X-RateLimit-Limit': rateLimitResult.limit,
                'X-RateLimit-Remaining': 0,
                'X-RateLimit-Reset': rateLimitResult.resetTime,
                'Retry-After': rateLimitResult.retryAfter
            });
            return res.status(429).json(errorResponse(
                'Límite de requests excedido. Intenta más tarde.',
                'RATE_LIMIT_EXCEEDED',
                { retryAfter: rateLimitResult.retryAfter }
            ));
        }

        // Agregar headers de rate limit
        res.set({
            'X-RateLimit-Limit': rateLimitResult.limit,
            'X-RateLimit-Remaining': rateLimitResult.remaining,
            'X-RateLimit-Reset': rateLimitResult.resetTime
        });

        // 7. Adjuntar cliente al request
        req.apiClient = apiClient;
        req.authMethod = authMethod;
        req.clientIp = clientIp;

        // 8. Actualizar estadísticas del cliente (async, no bloquea)
        updateClientStats(apiClient.id).catch(console.error);

        next();

    } catch (error) {
        console.error('❌ Error en autenticación API:', error);
        await logApiRequest(req, null, 500, Date.now() - startTime, error.message);
        return res.status(500).json(errorResponse(
            'Error interno de autenticación',
            'AUTH_ERROR'
        ));
    }
}

/**
 * Verifica JWT y retorna el cliente API
 */
async function verifyJWT(token) {
    try {
        // Primero decodificar sin verificar para obtener el clienteId
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.clienteId) {
            return null;
        }

        // Obtener cliente para verificar con su secreto específico
        const cliente = await prisma.apiClient.findUnique({
            where: { id: decoded.clienteId },
            include: {
                webhookEndpoints: {
                    where: { activo: true }
                }
            }
        });

        if (!cliente) return null;

        // Verificar token con el secreto del cliente
        jwt.verify(token, cliente.jwtSecret);

        // Verificar que el token no esté revocado
        const tokenRecord = await prisma.apiToken.findFirst({
            where: {
                token,
                revocado: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (!tokenRecord) return null;

        return cliente;

    } catch (error) {
        console.error('❌ Error verificando JWT:', error.message);
        return null;
    }
}

/**
 * Verifica API Key y retorna el cliente
 */
async function verifyApiKey(apiKey) {
    try {
        if (!apiKey) return null;

        // Buscar por API Key (guardada en texto plano para comparación rápida)
        const cliente = await prisma.apiClient.findUnique({
            where: { apiKey },
            include: {
                webhookEndpoints: {
                    where: { activo: true }
                }
            }
        });

        return cliente;

    } catch (error) {
        console.error('❌ Error verificando API Key:', error.message);
        return null;
    }
}

/**
 * Obtiene la IP real del cliente
 */
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        '0.0.0.0';
}

/**
 * Verifica si la IP está en la whitelist del cliente
 */
function verifyIpWhitelist(client, ip) {
    // Si no hay whitelist configurada, permitir todo
    if (!client.ipWhitelist || !Array.isArray(client.ipWhitelist) || client.ipWhitelist.length === 0) {
        return true;
    }

    // Normalizar IP
    const normalizedIp = ip.replace('::ffff:', '');

    // Verificar si la IP está en la lista
    for (const allowedIp of client.ipWhitelist) {
        // Soporte para CIDR básico (ej: 192.168.1.0/24)
        if (allowedIp.includes('/')) {
            if (ipInCidr(normalizedIp, allowedIp)) return true;
        } else if (normalizedIp === allowedIp || ip === allowedIp) {
            return true;
        }
    }

    return false;
}

/**
 * Verifica si una IP está en un rango CIDR
 */
function ipInCidr(ip, cidr) {
    try {
        const [range, bits] = cidr.split('/');
        const mask = ~(2 ** (32 - parseInt(bits)) - 1);

        const ipInt = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
        const rangeInt = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);

        return (ipInt & mask) === (rangeInt & mask);
    } catch {
        return false;
    }
}

/**
 * Verifica y actualiza rate limit
 */
function checkRateLimit(client, req) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${client.id}:${minute}`;

    let record = rateLimitCache.get(key);

    if (!record) {
        record = { count: 0, resetTime: (minute + 1) * 60000 };
        rateLimitCache.set(key, record);

        // Limpiar entradas viejas cada minuto
        if (Math.random() < 0.1) {
            cleanupRateLimitCache();
        }
    }

    record.count++;

    const limit = client.rateLimitRpm || 60;
    const remaining = Math.max(0, limit - record.count);

    return {
        allowed: record.count <= limit,
        limit,
        remaining,
        resetTime: Math.ceil(record.resetTime / 1000),
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
    };
}

/**
 * Limpia entradas viejas del cache de rate limit
 */
function cleanupRateLimitCache() {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);

    for (const [key, value] of rateLimitCache) {
        const keyMinute = parseInt(key.split(':')[1]);
        if (keyMinute < currentMinute - 1) {
            rateLimitCache.delete(key);
        }
    }
}

/**
 * Actualiza estadísticas del cliente
 */
async function updateClientStats(clienteId) {
    try {
        await prisma.apiClient.update({
            where: { id: clienteId },
            data: {
                totalRequests: { increment: 1 },
                lastRequest: new Date()
            }
        });
    } catch (error) {
        console.error('Error actualizando stats del cliente:', error);
    }
}

/**
 * Registra el request en el log
 */
async function logApiRequest(req, clienteId, httpStatus, duracionMs, error = null) {
    try {
        await prisma.apiLog.create({
            data: {
                clienteId,
                metodo: req.method,
                endpoint: req.path,
                queryParams: Object.keys(req.query).length > 0 ? req.query : null,
                body: req.method !== 'GET' && req.body ? req.body : null,
                httpStatus,
                ipAddress: getClientIp(req),
                userAgent: req.headers['user-agent'],
                duracionMs,
                error
            }
        });
    } catch (err) {
        console.error('Error guardando log de API:', err);
    }
}

/**
 * Middleware para verificar permisos específicos
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.apiClient) {
            return res.status(401).json(errorResponse('No autenticado', 'NOT_AUTHENTICATED'));
        }

        const permisos = req.apiClient.permisos || {};

        if (!permisos[permission]) {
            return res.status(403).json(errorResponse(
                `Permiso requerido: ${permission}`,
                'PERMISSION_DENIED',
                { required: permission }
            ));
        }

        next();
    };
}

/**
 * Middleware de logging de respuesta
 */
function logResponse(req, res, next) {
    const startTime = Date.now();

    // Capturar el fin del response
    res.on('finish', async () => {
        if (req.apiClient) {
            await logApiRequest(
                req,
                req.apiClient.id,
                res.statusCode,
                Date.now() - startTime
            ).catch(console.error);
        }
    });

    next();
}

module.exports = {
    authenticateApiClient,
    requirePermission,
    logResponse,
    hashApiKey,
    isValidApiKeyFormat,
    getClientIp,
    verifyIpWhitelist
};
