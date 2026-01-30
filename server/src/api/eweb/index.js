// server/src/api/eweb/index.js
// 🌐 Módulo principal de la API Externa (eweb)
// Exporta todos los servicios y configuraciones

const ewebRoutes = require('./routes');
const webhookService = require('./services/webhookService');
const cacheService = require('./services/cacheService');
const productDTO = require('./dto/productDTO');

/**
 * Inicializa el módulo de API externa
 * @param {Object} app - Instancia de Express
 * @param {Object} options - Opciones de configuración
 */
function initializeEwebApi(app, options = {}) {
    const {
        basePath = '/api/eweb',
        enableWebhookProcessor = true,
        processorInterval = 30000,
        warmupCache = true,
        warmupLimit = 100
    } = options;

    console.log('🌐 Inicializando API Externa (eweb)...');

    // Registrar rutas
    app.use(basePath, ewebRoutes);
    console.log(`   📍 Rutas registradas en ${basePath}`);

    // Iniciar procesador de webhooks
    if (enableWebhookProcessor) {
        webhookService.startQueueProcessor(processorInterval);
        console.log(`   🚀 Procesador de webhooks iniciado (cada ${processorInterval / 1000}s)`);
    }

    // Precalentar cache
    if (warmupCache) {
        cacheService.warmup(warmupLimit)
            .then(count => console.log(`   💾 Cache precalentado: ${count} productos`))
            .catch(err => console.error('   ⚠️ Error en warmup de cache:', err.message));
    }

    console.log('✅ API Externa (eweb) inicializada');
}

/**
 * Observadores para integrar con el inventario existente
 * Estos se llaman desde inventoryController cuando hay cambios
 */
const observers = {
    /**
     * Llamar cuando se crea un producto
     */
    onProductCreated: async (product, userId) => {
        try {
            // Invalidar cache
            await cacheService.invalidate(product.id);
            // Disparar webhook
            await webhookService.onProductCreated(product, userId);
        } catch (error) {
            console.error('❌ Error en observer onProductCreated:', error);
        }
    },

    /**
     * Llamar cuando se actualiza un producto
     */
    onProductUpdated: async (product, changes, userId) => {
        try {
            await cacheService.invalidate(product.id);
            await webhookService.onProductUpdated(product, changes, userId);
        } catch (error) {
            console.error('❌ Error en observer onProductUpdated:', error);
        }
    },

    /**
     * Llamar cuando se elimina/desactiva un producto
     */
    onProductDeleted: async (productId, sku, userId) => {
        try {
            await cacheService.invalidate(productId);
            await webhookService.onProductDeleted(productId, sku, userId);
        } catch (error) {
            console.error('❌ Error en observer onProductDeleted:', error);
        }
    },

    /**
     * Llamar cuando cambia el stock
     */
    onStockUpdated: async (product, stockAnterior, stockNuevo, motivo, userId) => {
        try {
            await cacheService.invalidate(product.id);
            await webhookService.onStockUpdated(product, stockAnterior, stockNuevo, motivo, userId);
        } catch (error) {
            console.error('❌ Error en observer onStockUpdated:', error);
        }
    },

    /**
     * Llamar cuando cambia el precio
     */
    onPriceUpdated: async (product, precioAnterior, precioNuevo, userId) => {
        try {
            await cacheService.invalidate(product.id);
            await webhookService.onPriceUpdated(product, precioAnterior, precioNuevo, userId);
        } catch (error) {
            console.error('❌ Error en observer onPriceUpdated:', error);
        }
    },

    /**
     * Llamar cuando se actualiza la imagen
     */
    onImageUpdated: async (product, imagenUrl, userId) => {
        try {
            await cacheService.invalidate(product.id);
            await webhookService.onImageUpdated(product, imagenUrl, userId);
        } catch (error) {
            console.error('❌ Error en observer onImageUpdated:', error);
        }
    }
};

module.exports = {
    initializeEwebApi,
    observers,
    // Exportar servicios para uso directo
    webhookService,
    cacheService,
    productDTO,
    routes: ewebRoutes
};
