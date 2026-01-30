// server/src/api/eweb/hooks/inventoryHooks.js
// 🔗 Hooks para integrar el inventario con la API externa
// Se llaman automáticamente cuando hay cambios en productos/stock

// Lazy loading para evitar dependencias circulares
let observers = null;

function getObservers() {
    if (!observers) {
        try {
            const eweb = require('../index');
            observers = eweb.observers;
        } catch (error) {
            console.error('⚠️ Error cargando observers de eweb:', error.message);
            // Retornar observers vacíos para evitar errores
            observers = {
                onProductCreated: async () => { },
                onProductUpdated: async () => { },
                onProductDeleted: async () => { },
                onStockUpdated: async () => { },
                onPriceUpdated: async () => { },
                onImageUpdated: async () => { }
            };
        }
    }
    return observers;
}

/**
 * Hook: Producto creado
 * Llamar después de crear un producto nuevo
 */
async function afterProductCreated(product, userId) {
    try {
        const obs = getObservers();
        await obs.onProductCreated(product, userId);
    } catch (error) {
        console.error('❌ Error en hook afterProductCreated:', error.message);
        // No lanzar error para no afectar la operación principal
    }
}

/**
 * Hook: Producto actualizado
 * Llamar después de actualizar un producto
 */
async function afterProductUpdated(product, changes, userId) {
    try {
        const obs = getObservers();

        // Detectar si cambió el precio
        if (changes.precioVenta) {
            await obs.onPriceUpdated(
                product,
                changes.precioVenta.old,
                changes.precioVenta.new,
                userId
            );
        }

        // Detectar si cambió la imagen
        if (changes.imagenUrl) {
            await obs.onImageUpdated(product, product.imagenUrl, userId);
        }

        // Notificar actualización general
        await obs.onProductUpdated(product, changes, userId);

    } catch (error) {
        console.error('❌ Error en hook afterProductUpdated:', error.message);
    }
}

/**
 * Hook: Producto eliminado
 * Llamar después de eliminar/desactivar un producto
 */
async function afterProductDeleted(productId, sku, userId) {
    try {
        const obs = getObservers();
        await obs.onProductDeleted(productId, sku, userId);
    } catch (error) {
        console.error('❌ Error en hook afterProductDeleted:', error.message);
    }
}

/**
 * Hook: Stock actualizado
 * Llamar cuando hay cambios en el stock (venta, ajuste, etc.)
 */
async function afterStockUpdated(product, stockAnterior, stockNuevo, motivo, userId) {
    try {
        const obs = getObservers();
        await obs.onStockUpdated(product, stockAnterior, stockNuevo, motivo, userId);
    } catch (error) {
        console.error('❌ Error en hook afterStockUpdated:', error.message);
    }
}

/**
 * Hook: Sincronización masiva de cambios
 * Para llamar después de operaciones bulk
 */
async function afterBulkUpdate(productIds, userId, operationType) {
    try {
        const obs = getObservers();
        // Para operaciones masivas, disparar un evento general
        console.log(`📦 Bulk update: ${productIds.length} productos (${operationType})`);
        // Podríamos disparar webhooks para cada producto o un solo evento de bulk
    } catch (error) {
        console.error('❌ Error en hook afterBulkUpdate:', error.message);
    }
}

module.exports = {
    afterProductCreated,
    afterProductUpdated,
    afterProductDeleted,
    afterStockUpdated,
    afterBulkUpdate
};
