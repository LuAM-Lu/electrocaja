// server/src/api/eweb/services/cacheService.js
// 💾 Servicio de Caché para API Externa
// Implementación optimizada con invalidación inteligente

const crypto = require('crypto');
const prisma = require('../../../config/database');
const { toWebDTO, generateHash } = require('../dto/productDTO');

class CacheService {
    constructor() {
        // Cache en memoria para acceso ultra-rápido
        this.memoryCache = new Map();
        this.memoryCacheTimestamps = new Map();

        // Configuración
        this.config = {
            memoryTTL: 5 * 60 * 1000,      // 5 minutos en memoria
            dbCacheTTL: 30 * 60 * 1000,    // 30 minutos en DB
            maxMemoryItems: 1000,          // Máximo items en memoria
            cleanupInterval: 60 * 1000     // Limpiar cada minuto
        };

        // Iniciar limpieza automática
        this.startCleanupJob();
    }

    /**
     * Inicia el job de limpieza de cache
     */
    startCleanupJob() {
        setInterval(() => {
            this.cleanupMemoryCache();
        }, this.config.cleanupInterval);
    }

    /**
     * Limpia entradas expiradas de la memoria
     */
    cleanupMemoryCache() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, timestamp] of this.memoryCacheTimestamps) {
            if (now - timestamp > this.config.memoryTTL) {
                this.memoryCache.delete(key);
                this.memoryCacheTimestamps.delete(key);
                cleaned++;
            }
        }

        // Si hay demasiados items, eliminar los más viejos
        if (this.memoryCache.size > this.config.maxMemoryItems) {
            const sortedByTime = [...this.memoryCacheTimestamps.entries()]
                .sort((a, b) => a[1] - b[1]);

            const toRemove = sortedByTime.slice(0, this.memoryCache.size - this.config.maxMemoryItems);
            for (const [key] of toRemove) {
                this.memoryCache.delete(key);
                this.memoryCacheTimestamps.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cache: Limpiadas ${cleaned} entradas de memoria`);
        }
    }

    /**
     * Obtener producto del cache
     * @param {number} productoId - ID del producto
     * @returns {Object|null} DTO cacheado o null
     */
    async get(productoId) {
        const key = `product:${productoId}`;

        // 1. Buscar en memoria primero (más rápido)
        if (this.memoryCache.has(key)) {
            const timestamp = this.memoryCacheTimestamps.get(key);
            if (Date.now() - timestamp < this.config.memoryTTL) {
                return this.memoryCache.get(key);
            }
            // Expirado en memoria, limpiar
            this.memoryCache.delete(key);
            this.memoryCacheTimestamps.delete(key);
        }

        // 2. Buscar en cache de DB
        try {
            const cached = await prisma.productCache.findUnique({
                where: { productoId }
            });

            if (cached && new Date(cached.expiresAt) > new Date()) {
                // Rehidratar en memoria para próximas consultas
                this.memoryCache.set(key, cached.dataCache);
                this.memoryCacheTimestamps.set(key, Date.now());
                return cached.dataCache;
            }

            // Cache expirado o no existe
            return null;

        } catch (error) {
            console.error('Error obteniendo cache:', error);
            return null;
        }
    }

    /**
     * Guardar producto en cache
     * @param {Object} product - Producto original de la DB
     * @param {Object} dto - DTO transformado
     */
    async set(product, dto = null) {
        const productoId = product.id;
        const key = `product:${productoId}`;

        try {
            // Generar DTO si no se proporciona
            const dataCache = dto || toWebDTO(product, { includeInternal: true });
            const hash = generateHash(dataCache);
            const expiresAt = new Date(Date.now() + this.config.dbCacheTTL);

            // Guardar en memoria
            this.memoryCache.set(key, dataCache);
            this.memoryCacheTimestamps.set(key, Date.now());

            // Guardar en DB (upsert)
            await prisma.productCache.upsert({
                where: { productoId },
                update: {
                    dataCache,
                    hash,
                    version: { increment: 1 },
                    cachedAt: new Date(),
                    expiresAt
                },
                create: {
                    productoId,
                    dataCache,
                    hash,
                    version: 1,
                    expiresAt
                }
            });

            return true;

        } catch (error) {
            console.error('Error guardando en cache:', error);
            return false;
        }
    }

    /**
     * Invalidar cache de un producto
     * @param {number} productoId - ID del producto
     */
    async invalidate(productoId) {
        const key = `product:${productoId}`;

        try {
            // Eliminar de memoria
            this.memoryCache.delete(key);
            this.memoryCacheTimestamps.delete(key);

            // Eliminar de DB
            await prisma.productCache.delete({
                where: { productoId }
            }).catch(() => { }); // Ignorar si no existe

            console.log(`🗑️ Cache invalidado para producto ${productoId}`);
            return true;

        } catch (error) {
            console.error('Error invalidando cache:', error);
            return false;
        }
    }

    /**
     * Invalidar múltiples productos
     * @param {Array<number>} productoIds - Array de IDs
     */
    async invalidateMany(productoIds) {
        const results = await Promise.all(
            productoIds.map(id => this.invalidate(id))
        );
        return results.filter(Boolean).length;
    }

    /**
     * Invalidar todo el cache
     */
    async invalidateAll() {
        try {
            // Limpiar memoria
            this.memoryCache.clear();
            this.memoryCacheTimestamps.clear();

            // Limpiar DB
            const result = await prisma.productCache.deleteMany({});

            console.log(`🗑️ Cache completamente invalidado (${result.count} entradas)`);
            return result.count;

        } catch (error) {
            console.error('Error invalidando todo el cache:', error);
            return 0;
        }
    }

    /**
     * Obtener múltiples productos del cache
     * @param {Array<number>} productoIds - Array de IDs
     * @returns {Object} Mapa de {id: dto}
     */
    async getMany(productoIds) {
        const results = {};
        const notInMemory = [];

        // 1. Buscar en memoria
        for (const id of productoIds) {
            const key = `product:${id}`;
            if (this.memoryCache.has(key)) {
                const timestamp = this.memoryCacheTimestamps.get(key);
                if (Date.now() - timestamp < this.config.memoryTTL) {
                    results[id] = this.memoryCache.get(key);
                    continue;
                }
            }
            notInMemory.push(id);
        }

        // 2. Buscar los faltantes en DB
        if (notInMemory.length > 0) {
            try {
                const cached = await prisma.productCache.findMany({
                    where: {
                        productoId: { in: notInMemory },
                        expiresAt: { gt: new Date() }
                    }
                });

                for (const item of cached) {
                    results[item.productoId] = item.dataCache;
                    // Rehidratar en memoria
                    const key = `product:${item.productoId}`;
                    this.memoryCache.set(key, item.dataCache);
                    this.memoryCacheTimestamps.set(key, Date.now());
                }
            } catch (error) {
                console.error('Error obteniendo cache masivo:', error);
            }
        }

        return results;
    }

    /**
     * Pre-calentar el cache con los productos más importantes
     * @param {number} limit - Cantidad de productos a cachear
     */
    async warmup(limit = 100) {
        try {
            console.log(`🔥 Precalentando cache con ${limit} productos...`);

            // Obtener productos activos con stock
            const productos = await prisma.product.findMany({
                where: {
                    activo: true,
                    tipo: 'PRODUCTO'
                },
                orderBy: [
                    { stock: 'desc' },
                    { fechaActualizacion: 'desc' }
                ],
                take: limit
            });

            let cached = 0;
            for (const producto of productos) {
                const dto = toWebDTO(producto, { includeInternal: true });
                await this.set(producto, dto);
                cached++;
            }

            console.log(`✅ Cache precalentado: ${cached} productos`);
            return cached;

        } catch (error) {
            console.error('Error en warmup de cache:', error);
            return 0;
        }
    }

    /**
     * Obtener estadísticas del cache
     */
    async getStats() {
        try {
            const dbCount = await prisma.productCache.count();
            const expiredCount = await prisma.productCache.count({
                where: { expiresAt: { lt: new Date() } }
            });

            return {
                memoria: {
                    items: this.memoryCache.size,
                    maxItems: this.config.maxMemoryItems,
                    usagePercent: ((this.memoryCache.size / this.config.maxMemoryItems) * 100).toFixed(2)
                },
                database: {
                    total: dbCount,
                    expired: expiredCount,
                    valid: dbCount - expiredCount
                },
                config: {
                    memoryTTL: `${this.config.memoryTTL / 1000}s`,
                    dbCacheTTL: `${this.config.dbCacheTTL / 1000}s`
                }
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Detectar si un producto cambió comparando hashes
     * @param {Object} product - Producto actual
     * @returns {boolean} true si cambió
     */
    async hasChanged(product) {
        try {
            const cached = await prisma.productCache.findUnique({
                where: { productoId: product.id }
            });

            if (!cached) return true;

            const currentDTO = toWebDTO(product, { includeInternal: true });
            const currentHash = generateHash(currentDTO);

            return cached.hash !== currentHash;

        } catch (error) {
            return true; // En caso de error, asumir que cambió
        }
    }

    /**
     * Limpiar cache expirado de la base de datos
     */
    async cleanupExpired() {
        try {
            const result = await prisma.productCache.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            });

            console.log(`🧹 Cache DB: Limpiadas ${result.count} entradas expiradas`);
            return result.count;

        } catch (error) {
            console.error('Error limpiando cache expirado:', error);
            return 0;
        }
    }
}

// Singleton
const cacheService = new CacheService();

module.exports = cacheService;
