// server/src/api/eweb/controllers/clienteApiController.js
// 🔐 Controlador para gestión de clientes API
// CRUD de clientes, generación de API Keys, configuración de webhooks

const prisma = require('../../../config/database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { errorResponse } = require('../dto/productDTO');
const webhookService = require('../services/webhookService');

/**
 * Genera una API Key única
 * Formato: ec_[tipo]_[32 caracteres hex]
 */
function generateApiKey(tipo = 'live') {
    const randomPart = crypto.randomBytes(16).toString('hex');
    return `ec_${tipo}_${randomPart}`;
}

/**
 * Genera un secreto JWT único
 */
function generateJwtSecret() {
    return crypto.randomBytes(32).toString('base64');
}

/**
 * Genera secreto para webhooks
 */
function generateWebhookSecret() {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * POST /api/eweb/admin/clientes
 * Crear nuevo cliente API
 */
async function crearCliente(req, res) {
    try {
        const {
            nombre,
            descripcion,
            ipWhitelist = [],
            permisos = { read: true, write: false, webhook: true },
            syncConfig = {},
            rateLimitRpm = 60,
            rateLimitDaily = 10000
        } = req.body;

        // Validaciones
        if (!nombre) {
            return res.status(400).json(errorResponse('Nombre requerido', 'NAME_REQUIRED'));
        }

        // Verificar si ya existe
        const existente = await prisma.apiClient.findUnique({
            where: { nombre }
        });

        if (existente) {
            return res.status(409).json(errorResponse(
                'Ya existe un cliente con ese nombre',
                'CLIENT_EXISTS'
            ));
        }

        // Generar credenciales
        const apiKey = generateApiKey('live');
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const jwtSecret = generateJwtSecret();

        // Crear cliente
        const cliente = await prisma.apiClient.create({
            data: {
                nombre,
                descripcion,
                apiKey,
                apiKeyHash,
                jwtSecret,
                ipWhitelist: ipWhitelist.length > 0 ? ipWhitelist : null,
                permisos,
                syncConfig,
                rateLimitRpm,
                rateLimitDaily,
                creadoPorId: req.user?.id || 1
            }
        });

        // ⚠️ IMPORTANTE: La API Key solo se muestra una vez
        return res.status(201).json({
            success: true,
            message: 'Cliente API creado exitosamente',
            data: {
                id: cliente.id,
                nombre: cliente.nombre,
                apiKey, // ⚠️ Guardar esta clave, no se puede recuperar
                createdAt: cliente.createdAt
            },
            warning: 'Guarda la API Key de forma segura. No podrás verla de nuevo.'
        });

    } catch (error) {
        console.error('❌ Error creando cliente API:', error);
        return res.status(500).json(errorResponse(
            'Error creando cliente',
            'CREATE_ERROR',
            { message: error.message }
        ));
    }
}

/**
 * GET /api/eweb/admin/clientes
 * Listar todos los clientes API
 */
async function listarClientes(req, res) {
    try {
        const clientes = await prisma.apiClient.findMany({
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                activo: true,
                ipWhitelist: true,
                permisos: true,
                rateLimitRpm: true,
                totalRequests: true,
                lastRequest: true,
                createdAt: true,
                updatedAt: true,
                webhookEndpoints: {
                    select: {
                        id: true,
                        url: true,
                        eventos: true,
                        activo: true,
                        verificado: true,
                        totalEnvios: true,
                        enviosExitosos: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({
            success: true,
            data: clientes,
            total: clientes.length
        });

    } catch (error) {
        console.error('❌ Error listando clientes:', error);
        return res.status(500).json(errorResponse('Error listando clientes', 'LIST_ERROR'));
    }
}

/**
 * GET /api/eweb/admin/clientes/:id
 * Obtener detalle de un cliente
 */
async function obtenerCliente(req, res) {
    try {
        const { id } = req.params;

        const cliente = await prisma.apiClient.findUnique({
            where: { id: parseInt(id) },
            include: {
                webhookEndpoints: true,
                _count: {
                    select: {
                        apiLogs: true,
                        webhookLogs: true
                    }
                }
            }
        });

        if (!cliente) {
            return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
        }

        // No exponer apiKey ni jwtSecret
        const { apiKey, apiKeyHash, jwtSecret, ...clienteSafe } = cliente;

        return res.json({
            success: true,
            data: clienteSafe
        });

    } catch (error) {
        console.error('❌ Error obteniendo cliente:', error);
        return res.status(500).json(errorResponse('Error obteniendo cliente', 'GET_ERROR'));
    }
}

/**
 * PUT /api/eweb/admin/clientes/:id
 * Actualizar cliente API
 */
async function actualizarCliente(req, res) {
    try {
        const { id } = req.params;
        const {
            descripcion,
            ipWhitelist,
            permisos,
            syncConfig,
            rateLimitRpm,
            rateLimitDaily,
            activo
        } = req.body;

        const cliente = await prisma.apiClient.update({
            where: { id: parseInt(id) },
            data: {
                ...(descripcion !== undefined && { descripcion }),
                ...(ipWhitelist !== undefined && { ipWhitelist }),
                ...(permisos !== undefined && { permisos }),
                ...(syncConfig !== undefined && { syncConfig }),
                ...(rateLimitRpm !== undefined && { rateLimitRpm }),
                ...(rateLimitDaily !== undefined && { rateLimitDaily }),
                ...(activo !== undefined && { activo })
            }
        });

        return res.json({
            success: true,
            message: 'Cliente actualizado',
            data: {
                id: cliente.id,
                nombre: cliente.nombre,
                activo: cliente.activo
            }
        });

    } catch (error) {
        console.error('❌ Error actualizando cliente:', error);
        return res.status(500).json(errorResponse('Error actualizando cliente', 'UPDATE_ERROR'));
    }
}

/**
 * POST /api/eweb/admin/clientes/:id/regenerar-apikey
 * Regenerar API Key de un cliente
 */
async function regenerarApiKey(req, res) {
    try {
        const { id } = req.params;

        const newApiKey = generateApiKey('live');
        const newApiKeyHash = crypto.createHash('sha256').update(newApiKey).digest('hex');

        const cliente = await prisma.apiClient.update({
            where: { id: parseInt(id) },
            data: {
                apiKey: newApiKey,
                apiKeyHash: newApiKeyHash
            }
        });

        // Revocar todos los tokens existentes
        await prisma.apiToken.updateMany({
            where: { clienteId: parseInt(id), revocado: false },
            data: { revocado: true, revocadoAt: new Date() }
        });

        return res.json({
            success: true,
            message: 'API Key regenerada',
            data: {
                apiKey: newApiKey
            },
            warning: 'La API Key anterior ha sido invalidada. Todos los tokens han sido revocados.'
        });

    } catch (error) {
        console.error('❌ Error regenerando API Key:', error);
        return res.status(500).json(errorResponse('Error regenerando API Key', 'REGEN_ERROR'));
    }
}

/**
 * POST /api/eweb/admin/clientes/:id/token
 * Generar JWT para un cliente
 */
async function generarToken(req, res) {
    try {
        const { id } = req.params;
        const { duracionHoras = 24 } = req.body;

        const cliente = await prisma.apiClient.findUnique({
            where: { id: parseInt(id) }
        });

        if (!cliente) {
            return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
        }

        if (!cliente.activo) {
            return res.status(403).json(errorResponse('Cliente desactivado', 'CLIENT_DISABLED'));
        }

        // Crear payload del token
        const payload = {
            clienteId: cliente.id,
            nombre: cliente.nombre,
            permisos: cliente.permisos,
            tipo: 'access'
        };

        // Generar token
        const expiresIn = `${duracionHoras}h`;
        const token = jwt.sign(payload, cliente.jwtSecret, { expiresIn });
        const expiresAt = new Date(Date.now() + duracionHoras * 60 * 60 * 1000);

        // Guardar registro del token
        await prisma.apiToken.create({
            data: {
                clienteId: cliente.id,
                token,
                tipo: 'ACCESS',
                expiresAt,
                ipOrigen: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        return res.json({
            success: true,
            data: {
                token,
                tokenType: 'Bearer',
                expiresIn: duracionHoras * 60 * 60,
                expiresAt: expiresAt.toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error generando token:', error);
        return res.status(500).json(errorResponse('Error generando token', 'TOKEN_ERROR'));
    }
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * POST /api/eweb/admin/clientes/:id/webhooks
 * Agregar endpoint de webhook a un cliente
 */
async function agregarWebhook(req, res) {
    try {
        const { id } = req.params;
        const {
            url,
            eventos = ['STOCK_UPDATED', 'PRODUCT_UPDATED'],
            headers = {},
            maxReintentos = 5,
            timeoutMs = 10000
        } = req.body;

        if (!url) {
            return res.status(400).json(errorResponse('URL requerida', 'URL_REQUIRED'));
        }

        // Validar URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json(errorResponse('URL inválida', 'INVALID_URL'));
        }

        const secreto = generateWebhookSecret();

        const webhook = await prisma.webhookEndpoint.create({
            data: {
                clienteId: parseInt(id),
                url,
                eventos,
                secreto,
                headers,
                maxReintentos,
                timeoutMs,
                activo: true
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Webhook creado',
            data: {
                id: webhook.id,
                url: webhook.url,
                eventos: webhook.eventos,
                secreto: secreto // ⚠️ Solo se muestra una vez
            },
            warning: 'Guarda el secreto del webhook de forma segura.'
        });

    } catch (error) {
        console.error('❌ Error agregando webhook:', error);
        return res.status(500).json(errorResponse('Error agregando webhook', 'WEBHOOK_ERROR'));
    }
}

/**
 * POST /api/eweb/admin/webhooks/:id/test
 * Probar conexión a un webhook
 */
async function testWebhook(req, res) {
    try {
        const { id } = req.params;

        const resultado = await webhookService.testEndpoint(parseInt(id));

        return res.json({
            success: resultado.success,
            data: resultado
        });

    } catch (error) {
        console.error('❌ Error testeando webhook:', error);
        return res.status(500).json(errorResponse('Error testeando webhook', 'TEST_ERROR'));
    }
}

/**
 * DELETE /api/eweb/admin/webhooks/:id
 * Eliminar un webhook
 */
async function eliminarWebhook(req, res) {
    try {
        const { id } = req.params;

        await prisma.webhookEndpoint.delete({
            where: { id: parseInt(id) }
        });

        return res.json({
            success: true,
            message: 'Webhook eliminado'
        });

    } catch (error) {
        console.error('❌ Error eliminando webhook:', error);
        return res.status(500).json(errorResponse('Error eliminando webhook', 'DELETE_ERROR'));
    }
}

/**
 * GET /api/eweb/admin/logs
 * Obtener logs de API
 */
async function obtenerLogs(req, res) {
    try {
        const { clienteId, page = 1, pageSize = 50, status } = req.query;

        const where = {};
        if (clienteId) where.clienteId = parseInt(clienteId);
        if (status) where.httpStatus = parseInt(status);

        const [logs, total] = await Promise.all([
            prisma.apiLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(pageSize),
                take: parseInt(pageSize),
                include: {
                    cliente: {
                        select: { nombre: true }
                    }
                }
            }),
            prisma.apiLog.count({ where })
        ]);

        return res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / parseInt(pageSize))
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo logs:', error);
        return res.status(500).json(errorResponse('Error obteniendo logs', 'LOGS_ERROR'));
    }
}

/**
 * GET /api/eweb/admin/webhook-logs
 * Obtener logs de webhooks
 */
async function obtenerWebhookLogs(req, res) {
    try {
        const { clienteId, endpointId, estado, page = 1, pageSize = 50 } = req.query;

        const where = {};
        if (clienteId) where.clienteId = parseInt(clienteId);
        if (endpointId) where.endpointId = parseInt(endpointId);
        if (estado) where.estado = estado;

        const [logs, total] = await Promise.all([
            prisma.webhookLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(pageSize),
                take: parseInt(pageSize),
                include: {
                    cliente: { select: { nombre: true } },
                    endpoint: { select: { url: true } }
                }
            }),
            prisma.webhookLog.count({ where })
        ]);

        return res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / parseInt(pageSize))
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo webhook logs:', error);
        return res.status(500).json(errorResponse('Error obteniendo logs', 'LOGS_ERROR'));
    }
}

module.exports = {
    crearCliente,
    listarClientes,
    obtenerCliente,
    actualizarCliente,
    regenerarApiKey,
    generarToken,
    agregarWebhook,
    testWebhook,
    eliminarWebhook,
    obtenerLogs,
    obtenerWebhookLogs,
    // Helpers exportados para uso externo
    generateApiKey,
    generateWebhookSecret
};
