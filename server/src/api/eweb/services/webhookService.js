// server/src/api/eweb/services/webhookService.js
// 🚀 Servicio de Webhooks con cola de reintentos
// Dispara eventos a todos los endpoints suscritos

const crypto = require('crypto');
const prisma = require('../../../config/database');
const { webhookPayload, toWebDTO } = require('../dto/productDTO');

class WebhookService {
    constructor() {
        this.isProcessing = false;
        this.processInterval = null;

        // Configuración de reintentos (backoff exponencial)
        this.retryDelays = [
            1 * 60 * 1000,      // 1 minuto
            5 * 60 * 1000,      // 5 minutos
            15 * 60 * 1000,     // 15 minutos
            60 * 60 * 1000,     // 1 hora
            4 * 60 * 60 * 1000  // 4 horas
        ];
    }

    /**
     * Iniciar el procesador de cola
     */
    startQueueProcessor(intervalMs = 30000) {
        if (this.processInterval) {
            clearInterval(this.processInterval);
        }

        this.processInterval = setInterval(() => {
            this.processQueue().catch(console.error);
        }, intervalMs);

        console.log('🚀 Webhook queue processor iniciado');
    }

    /**
     * Detener el procesador
     */
    stopQueueProcessor() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        console.log('⏹️ Webhook queue processor detenido');
    }

    /**
     * Genera firma HMAC para el payload
     */
    signPayload(payload, secret) {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return hmac.digest('hex');
    }

    /**
     * Verifica firma de un payload recibido
     */
    verifySignature(payload, signature, secret) {
        const expectedSignature = this.signPayload(payload, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Dispara un evento a todos los endpoints suscritos
     * @param {string} evento - Tipo de evento (STOCK_UPDATED, PRODUCT_CREATED, etc.)
     * @param {Object} data - Datos del evento
     * @param {Object} meta - Metadata adicional
     */
    async dispatchEvent(evento, data, meta = {}) {
        try {
            console.log(`📤 Disparando webhook: ${evento}`);

            // Buscar todos los endpoints activos
            // Nota: El filtro por evento se hace en memoria ya que Prisma no soporta
            // array_contains para JSON de forma nativa en todas las DBs
            const allEndpoints = await prisma.webhookEndpoint.findMany({
                where: {
                    activo: true,
                    cliente: { activo: true }
                },
                include: {
                    cliente: true
                }
            });

            // Filtrar endpoints suscritos a este evento
            const endpoints = allEndpoints.filter(endpoint => {
                const eventos = Array.isArray(endpoint.eventos)
                    ? endpoint.eventos
                    : (typeof endpoint.eventos === 'string' ? JSON.parse(endpoint.eventos) : []);
                return eventos.includes(evento);
            });

            if (endpoints.length === 0) {
                console.log(`ℹ️ No hay endpoints suscritos a ${evento}`);
                return { dispatched: 0 };
            }

            console.log(`📧 Enviando a ${endpoints.length} endpoints`);

            // Crear payload
            const payload = webhookPayload(evento, data, meta);

            // Encolar para cada endpoint
            const results = await Promise.all(
                endpoints.map(endpoint => this.queueWebhook(endpoint, evento, payload))
            );

            // Procesar cola inmediatamente
            this.processQueue().catch(console.error);

            return {
                dispatched: results.length,
                endpoints: results.map(r => r.endpointId)
            };

        } catch (error) {
            console.error('❌ Error disparando webhook:', error);
            throw error;
        }
    }

    /**
     * Encola un webhook para envío
     */
    async queueWebhook(endpoint, evento, payload) {
        try {
            // Crear log del webhook
            const webhookLog = await prisma.webhookLog.create({
                data: {
                    endpointId: endpoint.id,
                    clienteId: endpoint.clienteId,
                    evento,
                    payload,
                    estado: 'PENDIENTE',
                    intentos: 0
                }
            });

            // Agregar a la cola
            await prisma.webhookQueue.create({
                data: {
                    endpointId: endpoint.id,
                    webhookLogId: webhookLog.id,
                    payload,
                    evento,
                    estado: 'PENDIENTE',
                    prioridad: this.getEventPriority(evento),
                    procesarEn: new Date()
                }
            });

            return { success: true, endpointId: endpoint.id, logId: webhookLog.id };

        } catch (error) {
            console.error('❌ Error encolando webhook:', error);
            return { success: false, endpointId: endpoint.id, error: error.message };
        }
    }

    /**
     * Obtener prioridad del evento
     */
    getEventPriority(evento) {
        const priorities = {
            'STOCK_UPDATED': 10,      // Máxima prioridad (afecta ventas)
            'PRICE_UPDATED': 9,
            'PRODUCT_DELETED': 8,
            'PRODUCT_UPDATED': 5,
            'PRODUCT_CREATED': 5,
            'IMAGE_UPDATED': 3,
            'BULK_SYNC': 1,
            'HEARTBEAT': 0
        };
        return priorities[evento] || 5;
    }

    /**
     * Procesa la cola de webhooks pendientes
     */
    async processQueue() {
        if (this.isProcessing) {
            console.log('⏳ Procesamiento de cola ya en progreso');
            return;
        }

        this.isProcessing = true;

        try {
            // Obtener webhooks pendientes o para reintentar
            const pendientes = await prisma.webhookQueue.findMany({
                where: {
                    estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
                    procesarEn: { lte: new Date() }
                },
                orderBy: [
                    { prioridad: 'desc' },
                    { createdAt: 'asc' }
                ],
                take: 10 // Procesar máximo 10 a la vez
            });

            if (pendientes.length === 0) return;

            console.log(`📦 Procesando ${pendientes.length} webhooks en cola`);

            for (const item of pendientes) {
                await this.processQueueItem(item);
            }

        } catch (error) {
            console.error('❌ Error procesando cola de webhooks:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Procesa un item de la cola
     */
    async processQueueItem(queueItem) {
        try {
            // Marcar como en proceso
            await prisma.webhookQueue.update({
                where: { id: queueItem.id },
                data: { estado: 'EN_PROCESO' }
            });

            // Obtener endpoint
            const endpoint = await prisma.webhookEndpoint.findUnique({
                where: { id: queueItem.endpointId },
                include: { cliente: true }
            });

            if (!endpoint || !endpoint.activo) {
                await this.markQueueItemComplete(queueItem.id, 'FALLIDO', 'Endpoint inactivo');
                return;
            }

            // Enviar el webhook
            const result = await this.sendWebhook(endpoint, queueItem.payload);

            if (result.success) {
                await this.handleSuccess(queueItem, endpoint, result);
            } else {
                await this.handleFailure(queueItem, endpoint, result);
            }

        } catch (error) {
            console.error('❌ Error procesando item de cola:', error);
            await this.markQueueItemComplete(queueItem.id, 'FALLIDO', error.message);
        }
    }

    /**
     * Envía el webhook al endpoint
     */
    async sendWebhook(endpoint, payload) {
        const startTime = Date.now();

        try {
            // Preparar headers
            const signature = this.signPayload(payload, endpoint.secreto);
            const headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': `sha256=${signature}`,
                'X-Webhook-Event': payload.evento,
                'X-Webhook-Timestamp': payload.meta?.timestamp || new Date().toISOString(),
                'User-Agent': 'ElectroCaja-Webhook/1.0',
                ...(endpoint.headers || {})
            };

            // Usar AbortController para timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), endpoint.timeoutMs || 10000);

            const response = await fetch(endpoint.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const duracionMs = Date.now() - startTime;
            const responseBody = await response.text().catch(() => '');

            return {
                success: response.ok,
                httpStatus: response.status,
                responseBody,
                duracionMs
            };

        } catch (error) {
            const duracionMs = Date.now() - startTime;
            return {
                success: false,
                httpStatus: null,
                error: error.name === 'AbortError' ? 'Timeout' : error.message,
                duracionMs
            };
        }
    }

    /**
     * Maneja éxito del webhook
     */
    async handleSuccess(queueItem, endpoint, result) {
        // Actualizar log
        await prisma.webhookLog.update({
            where: { id: queueItem.webhookLogId },
            data: {
                estado: 'EXITOSO',
                httpStatus: result.httpStatus,
                responseBody: result.responseBody?.substring(0, 1000),
                duracionMs: result.duracionMs,
                procesadoAt: new Date()
            }
        });

        // Actualizar estadísticas del endpoint
        await prisma.webhookEndpoint.update({
            where: { id: endpoint.id },
            data: {
                totalEnvios: { increment: 1 },
                enviosExitosos: { increment: 1 },
                ultimoEnvio: new Date(),
                ultimoError: null
            }
        });

        // Marcar item como completado
        await this.markQueueItemComplete(queueItem.id, 'COMPLETADO');

        console.log(`✅ Webhook enviado exitosamente a ${endpoint.url}`);
    }

    /**
     * Maneja fallo del webhook
     */
    async handleFailure(queueItem, endpoint, result) {
        const intentos = queueItem.intentos + 1;
        const maxIntentos = queueItem.maxIntentos || 5;

        const errorMsg = result.error || `HTTP ${result.httpStatus}`;
        console.log(`⚠️ Webhook falló (intento ${intentos}/${maxIntentos}): ${errorMsg}`);

        if (intentos >= maxIntentos) {
            // Agotados los reintentos
            await prisma.webhookLog.update({
                where: { id: queueItem.webhookLogId },
                data: {
                    estado: 'AGOTADO',
                    intentos,
                    httpStatus: result.httpStatus,
                    errorMensaje: errorMsg,
                    duracionMs: result.duracionMs,
                    procesadoAt: new Date()
                }
            });

            await prisma.webhookEndpoint.update({
                where: { id: endpoint.id },
                data: {
                    totalEnvios: { increment: 1 },
                    enviosFallidos: { increment: 1 },
                    ultimoEnvio: new Date(),
                    ultimoError: errorMsg
                }
            });

            await this.markQueueItemComplete(queueItem.id, 'FALLIDO', errorMsg);

            console.log(`❌ Webhook agotó reintentos para ${endpoint.url}`);

        } else {
            // Programar reintento
            const delay = this.retryDelays[intentos - 1] || this.retryDelays[this.retryDelays.length - 1];
            const proximoIntento = new Date(Date.now() + delay);

            await prisma.webhookLog.update({
                where: { id: queueItem.webhookLogId },
                data: {
                    estado: 'REINTENTAR',
                    intentos,
                    httpStatus: result.httpStatus,
                    errorMensaje: errorMsg,
                    proximoIntento
                }
            });

            await prisma.webhookQueue.update({
                where: { id: queueItem.id },
                data: {
                    estado: 'PENDIENTE',
                    intentos,
                    procesarEn: proximoIntento,
                    ultimoIntento: new Date(),
                    ultimoError: errorMsg
                }
            });

            console.log(`🔄 Webhook programado para reintento en ${Math.round(delay / 60000)} minutos`);
        }
    }

    /**
     * Marca un item de cola como completado
     */
    async markQueueItemComplete(queueId, estado, error = null) {
        await prisma.webhookQueue.update({
            where: { id: queueId },
            data: {
                estado,
                ultimoIntento: new Date(),
                ultimoError: error
            }
        });
    }

    // ============================================
    // EVENTOS DE PRODUCTO
    // ============================================

    /**
     * Dispara evento cuando se crea un producto
     */
    async onProductCreated(product, userId) {
        const dto = toWebDTO(product, { includeInternal: true });
        return this.dispatchEvent('PRODUCT_CREATED', dto, { userId });
    }

    /**
     * Dispara evento cuando se actualiza un producto
     */
    async onProductUpdated(product, changes, userId) {
        const dto = toWebDTO(product, { includeInternal: true });
        return this.dispatchEvent('PRODUCT_UPDATED', { product: dto, changes }, { userId });
    }

    /**
     * Dispara evento cuando se elimina/desactiva un producto
     */
    async onProductDeleted(productId, sku, userId) {
        return this.dispatchEvent('PRODUCT_DELETED', { id: productId, sku }, { userId });
    }

    /**
     * Dispara evento cuando cambia el stock
     */
    async onStockUpdated(product, stockAnterior, stockNuevo, motivo, userId) {
        const dto = toWebDTO(product, { includeInternal: false });
        return this.dispatchEvent('STOCK_UPDATED', {
            sku: dto.sku,
            stockAnterior,
            stockNuevo,
            diferencia: stockNuevo - stockAnterior,
            motivo
        }, { userId, prioridad: 'alta' });
    }

    /**
     * Dispara evento cuando cambia el precio
     */
    async onPriceUpdated(product, precioAnterior, precioNuevo, userId) {
        const dto = toWebDTO(product, { includeInternal: false });
        return this.dispatchEvent('PRICE_UPDATED', {
            sku: dto.sku,
            precioAnterior,
            precioNuevo,
            diferencia: precioNuevo - precioAnterior
        }, { userId });
    }

    /**
     * Dispara evento cuando se actualiza la imagen
     */
    async onImageUpdated(product, imagenUrl, userId) {
        return this.dispatchEvent('IMAGE_UPDATED', {
            sku: product.codigoBarras,
            id: product.id,
            imagen: imagenUrl
        }, { userId });
    }

    // ============================================
    // UTILIDADES
    // ============================================

    /**
     * Prueba de conexión a un endpoint
     */
    async testEndpoint(endpointId) {
        try {
            const endpoint = await prisma.webhookEndpoint.findUnique({
                where: { id: endpointId }
            });

            if (!endpoint) {
                return { success: false, error: 'Endpoint no encontrado' };
            }

            const testPayload = webhookPayload('HEARTBEAT', {
                message: 'Test de conexión desde ElectroCaja',
                timestamp: new Date().toISOString()
            });

            const result = await this.sendWebhook(endpoint, testPayload);

            // Actualizar estado de verificación
            await prisma.webhookEndpoint.update({
                where: { id: endpointId },
                data: {
                    verificado: result.success,
                    ultimaVerificacion: new Date(),
                    ultimoError: result.success ? null : result.error
                }
            });

            return {
                success: result.success,
                httpStatus: result.httpStatus,
                duracionMs: result.duracionMs,
                error: result.error
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener estadísticas de webhooks
     */
    async getStats(clienteId = null) {
        const where = clienteId ? { clienteId } : {};

        const [total, exitosos, fallidos, pendientes] = await Promise.all([
            prisma.webhookLog.count({ where }),
            prisma.webhookLog.count({ where: { ...where, estado: 'EXITOSO' } }),
            prisma.webhookLog.count({ where: { ...where, estado: { in: ['FALLIDO', 'AGOTADO'] } } }),
            prisma.webhookQueue.count({ where: { estado: 'PENDIENTE' } })
        ]);

        return {
            total,
            exitosos,
            fallidos,
            pendientes,
            tasaExito: total > 0 ? ((exitosos / total) * 100).toFixed(2) : 0
        };
    }

    /**
     * Limpiar logs antiguos
     */
    async cleanupOldLogs(diasAntiguedad = 30) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - diasAntiguedad);

        const result = await prisma.webhookLog.deleteMany({
            where: {
                createdAt: { lt: fecha },
                estado: { in: ['EXITOSO', 'AGOTADO', 'FALLIDO'] }
            }
        });

        console.log(`🧹 Limpiados ${result.count} logs de webhook antiguos`);
        return result.count;
    }
}

// Singleton
const webhookService = new WebhookService();

module.exports = webhookService;
