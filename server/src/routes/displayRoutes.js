// server/src/routes/displayRoutes.js
// 📺 Rutas para el sistema de Display/Publicidad Multi-Pantalla
const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ──────────────────────────────────────────────────────────────────────────────
// 📁 CONFIGURACIÓN DE SLIDES (multer)
// ──────────────────────────────────────────────────────────────────────────────
const SLIDES_DIR = path.join(__dirname, '../../uploads/display-slides');

// Crear directorio si no existe
if (!fs.existsSync(SLIDES_DIR)) {
    fs.mkdirSync(SLIDES_DIR, { recursive: true });
}

const slidesStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SLIDES_DIR),
    filename: (req, file, cb) => {
        const ts = Date.now();
        const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `${ts}-${safe}`);
    }
});

const ALLOWED_MIME = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm'
];

const slidesUpload = multer({
    storage: slidesStorage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo no permitido: ${file.mimetype}. Usa JPG, PNG, GIF, WebP, MP4 o WebM.`));
        }
    }
});

// Helper: leer config de BD
const getConfig = async (clave, defaultVal) => {
    const row = await prisma.configuracion.findFirst({ where: { clave } });
    if (!row) return defaultVal;
    try { return typeof row.valor === 'string' ? JSON.parse(row.valor) : row.valor; }
    catch { return defaultVal; }
};

// Helper: guardar config en BD
const saveConfig = async (clave, valor) => {
    const existing = await prisma.configuracion.findFirst({ where: { clave } });
    const data = { clave, valor: JSON.stringify(valor) };
    if (existing) {
        await prisma.configuracion.update({ where: { id: existing.id }, data: { valor: JSON.stringify(valor) } });
    } else {
        await prisma.configuracion.create({ data });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// 📺 PANTALLA 1 – Config general (existente)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/display/config
 */
router.get('/config', async (req, res) => {
    try {
        const defaultConfig = {
            activo: true,
            nombre: 'Pantalla Principal',
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
        const data = await getConfig('display_config', defaultConfig);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo config de display:', error);
        return res.status(500).json({ success: false, error: 'Error obteniendo configuración' });
    }
});

/**
 * PUT /api/display/config
 */
router.put('/config', async (req, res) => {
    try {
        const newConfig = req.body;
        await saveConfig('display_config', newConfig);
        if (req.io) req.io.emit('display:config_updated', { screen: 'main', config: newConfig });
        return res.json({ success: true, message: 'Configuración actualizada', data: newConfig });
    } catch (error) {
        console.error('Error actualizando config de display:', error);
        return res.status(500).json({ success: false, error: 'Error actualizando configuración' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// 📺 PANTALLA 2 – Config de pantalla por categoría
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/display/screen2/config
 */
router.get('/screen2/config', async (req, res) => {
    try {
        const defaultConfig = {
            activo: true,
            nombre: 'Electro Bar',
            tiempoRotacion: 10,
            soloDestacados: false,
            soloConStock: true,
            tipos: [],
            categorias: [],
            showDescription: true,
            showStock: true,
            showCode: true
        };
        const data = await getConfig('display_screen2_config', defaultConfig);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo config screen2:', error);
        return res.status(500).json({ success: false, error: 'Error' });
    }
});

/**
 * PUT /api/display/screen2/config
 */
router.put('/screen2/config', async (req, res) => {
    try {
        const newConfig = req.body;
        await saveConfig('display_screen2_config', newConfig);
        if (req.io) req.io.emit('display:config_updated', { screen: 'cat', config: newConfig });
        return res.json({ success: true, data: newConfig });
    } catch (error) {
        console.error('Error guardando config screen2:', error);
        return res.status(500).json({ success: false, error: 'Error' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// 🖼️ PANTALLA 3 – Slides (imágenes y videos)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/display/slides/config
 */
router.get('/slides/config', async (req, res) => {
    try {
        const defaultConfig = {
            activo: true,
            nombre: 'Publicidad',
            tiempoRotacion: 8
        };
        const data = await getConfig('display_slides_config', defaultConfig);
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error' });
    }
});

/**
 * PUT /api/display/slides/config
 */
router.put('/slides/config', async (req, res) => {
    try {
        const newConfig = req.body;
        await saveConfig('display_slides_config', newConfig);
        if (req.io) req.io.emit('display:config_updated', { screen: 'slides', config: newConfig });
        return res.json({ success: true, data: newConfig });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error' });
    }
});

/**
 * GET /api/display/slides
 * Lista todos los archivos en /uploads/display-slides/
 */
router.get('/slides', async (req, res) => {
    try {
        const files = fs.readdirSync(SLIDES_DIR).map(filename => {
            const filePath = path.join(SLIDES_DIR, filename);
            const stat = fs.statSync(filePath);
            const ext = path.extname(filename).toLowerCase();
            const isVideo = ['.mp4', '.webm'].includes(ext);
            return {
                filename,
                url: `/uploads/display-slides/${filename}`,
                type: isVideo ? 'video' : 'image',
                size: stat.size,
                createdAt: stat.birthtime
            };
        }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return res.json({ success: true, data: files, total: files.length });
    } catch (error) {
        console.error('Error listando slides:', error);
        return res.status(500).json({ success: false, error: 'Error listando archivos' });
    }
});

/**
 * POST /api/display/slides/upload
 * Sube una imagen o video
 */
router.post('/slides/upload', slidesUpload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No se recibió archivo' });
        const ext = path.extname(req.file.filename).toLowerCase();
        const isVideo = ['.mp4', '.webm'].includes(ext);
        return res.json({
            success: true,
            data: {
                filename: req.file.filename,
                url: `/uploads/display-slides/${req.file.filename}`,
                type: isVideo ? 'video' : 'image',
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('Error subiendo slide:', error);
        return res.status(500).json({ success: false, error: 'Error subiendo archivo' });
    }
});

/**
 * DELETE /api/display/slides/:filename
 * Elimina un archivo de slides
 */
router.delete('/slides/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        // Seguridad: no permitir path traversal
        if (filename.includes('/') || filename.includes('..')) {
            return res.status(400).json({ success: false, error: 'Nombre de archivo inválido' });
        }
        const filePath = path.join(SLIDES_DIR, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
        }
        fs.unlinkSync(filePath);
        return res.json({ success: true, message: 'Archivo eliminado' });
    } catch (error) {
        console.error('Error eliminando slide:', error);
        return res.status(500).json({ success: false, error: 'Error eliminando archivo' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// 📦 PRODUCTOS – Ruta compartida para todas las pantallas
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/display/productos
 * Filtros via query: destacado, stock_min, tipos, categorias, pageSize
 */
router.get('/productos', async (req, res) => {
    try {
        const { destacado, stock_min, tipos, categorias, pageSize = 50 } = req.query;

        const where = { activo: true };
        if (destacado === 'true') where.destacado = true;
        if (stock_min) where.stock = { gte: parseInt(stock_min) };
        if (tipos) where.tipo = { in: tipos.split(',') };
        if (categorias) where.categoria = { in: categorias.split(',') };

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
            orderBy: [{ destacado: 'desc' }, { fechaActualizacion: 'desc' }],
            take: parseInt(pageSize)
        });

        return res.json({ success: true, data: productos, total: productos.length });
    } catch (error) {
        console.error('Error obteniendo productos para display:', error);
        return res.status(500).json({ success: false, error: 'Error obteniendo productos: ' + error.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// 🔌 CLIENTES CONECTADOS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/display/clients
 */
router.get('/clients', async (req, res) => {
    try {
        const clients = req.io?.displayClients || [];
        return res.json({ success: true, data: clients, total: clients.length });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error obteniendo clientes' });
    }
});

/**
 * POST /api/display/rotate
 * Envía comando de rotación en tiempo real a las pantallas conectadas
 * Body: { screenId: 'main'|'cat'|'slides'|'all', degrees: 0|90|180|270 }
 */
router.post('/rotate', (req, res) => {
    const { screenId = 'all', degrees = 0 } = req.body;
    if (req.io) {
        req.io.emit('display:rotate', { screenId, degrees });
    }
    return res.json({
        success: true,
        message: `Rotación enviada: ${screenId} → ${degrees}°`
    });
});

module.exports = router;
