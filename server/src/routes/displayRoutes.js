// server/src/routes/displayRoutes.js
// 📺 Rutas para el sistema de Display/Publicidad
const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

/**
 * GET /api/display/config
 * Obtener configuración del display (público)
 */
router.get('/config', async (req, res) => {
    try {
        // Buscar configuración en BD o usar defaults
        let config = await prisma.configuracion.findFirst({
            where: { clave: 'display_config' }
        });

        if (config) {
            const data = typeof config.valor === 'string'
                ? JSON.parse(config.valor)
                : config.valor;
            return res.json({ success: true, data });
        }

        // Configuración por defecto
        const defaultConfig = {
            activo: true,
            tiempoRotacion: 10,
            soloDestacados: true,
            soloConStock: true,
            tipos: ['PRODUCTO', 'ELECTROBAR'],
            categorias: [],
            showDescription: true,
            showStock: true,
            showCode: true,
            logo: null,
            titulo: 'electroshopve.com',
            subtitulo: 'VISTA CLIENTE'
        };

        return res.json({ success: true, data: defaultConfig });

    } catch (error) {
        console.error('Error obteniendo config de display:', error);
        return res.status(500).json({
            success: false,
            error: 'Error obteniendo configuración'
        });
    }
});

/**
 * PUT /api/display/config
 * Actualizar configuración del display (requiere auth)
 */
router.put('/config', async (req, res) => {
    try {
        const newConfig = req.body;

        // Buscar o crear configuración
        const existing = await prisma.configuracion.findFirst({
            where: { clave: 'display_config' }
        });

        if (existing) {
            await prisma.configuracion.update({
                where: { id: existing.id },
                data: { valor: JSON.stringify(newConfig) }
            });
        } else {
            await prisma.configuracion.create({
                data: {
                    clave: 'display_config',
                    valor: JSON.stringify(newConfig)
                }
            });
        }

        // Emitir evento a todas las pantallas conectadas
        if (req.io) {
            req.io.emit('display:config_updated', newConfig);
        }

        return res.json({
            success: true,
            message: 'Configuración actualizada',
            data: newConfig
        });

    } catch (error) {
        console.error('Error actualizando config de display:', error);
        return res.status(500).json({
            success: false,
            error: 'Error actualizando configuración'
        });
    }
});

/**
 * GET /api/display/productos
 * Obtener productos para el display (público)
 */
router.get('/productos', async (req, res) => {
    try {
        const {
            destacado,
            stock_min,
            tipos,
            categorias,
            pageSize = 50
        } = req.query;

        // Construir filtros
        const where = {
            activo: true
        };

        if (destacado === 'true') {
            where.destacado = true;
        }

        if (stock_min) {
            where.stock = { gte: parseInt(stock_min) };
        }

        if (tipos) {
            where.tipo = { in: tipos.split(',') };
        }

        if (categorias) {
            where.categoria = { in: categorias.split(',') };
        }

        const productos = await prisma.product.findMany({
            where,
            select: {
                id: true,
                codigoBarras: true,
                codigoInterno: true,
                descripcion: true,
                categoria: true,
                tipo: true,
                precioVenta: true,
                stock: true,
                destacado: true,
                imagenUrl: true,
                imagenThumbnail: true,
                observaciones: true
            },
            orderBy: [
                { destacado: 'desc' },
                { fechaActualizacion: 'desc' }
            ],
            take: parseInt(pageSize)
        });

        return res.json({
            success: true,
            data: productos,
            total: productos.length
        });

    } catch (error) {
        console.error('Error obteniendo productos para display:', error);
        return res.status(500).json({
            success: false,
            error: 'Error obteniendo productos: ' + error.message,
            stack: error.stack // Solo para debug
        });
    }
});

/**
 * GET /api/display/clients
 * Obtener pantallas conectadas (requiere auth)
 */
router.get('/clients', async (req, res) => {
    try {
        // Los clientes se mantienen en memoria del socket
        const clients = req.io?.displayClients || [];

        return res.json({
            success: true,
            data: clients,
            total: clients.length
        });

    } catch (error) {
        console.error('Error obteniendo clientes de display:', error);
        return res.status(500).json({
            success: false,
            error: 'Error obteniendo clientes'
        });
    }
});

module.exports = router;
