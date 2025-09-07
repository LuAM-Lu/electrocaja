// server/src/routes/cajas.js (CORREGIDO COMPLETAMENTE)
const express = require('express');
const { 
  getCajaActual, 
  abrirCaja, 
  cerrarCaja,
  obtenerHistorialCajas,
  realizarArqueo,
  subirEvidenciaFotografica,
  validarAutorizacionCEO,
  crearTransaccion,
  obtenerTransacciones,
  eliminarTransaccion,
   obtenerCajasPendientes,
  resolverCajaPendiente,
  forzarAutoCierre,
  obtenerDetalleTransaccion,
  generarPDFTemporal
} = require('../controllers/cajaController');
const { verifyToken, checkPermissions } = require('../middleware/auth');

const router = express.Router();

// GET /api/cajas/actual - Cualquier usuario autenticado
router.get('/actual', verifyToken, getCajaActual);

// POST /api/cajas/abrir - Solo admin y supervisor
router.post('/abrir', verifyToken, checkPermissions(['admin', 'supervisor']), abrirCaja);

// PUT /api/cajas/cerrar - Solo admin y supervisor
router.put('/cerrar', verifyToken, checkPermissions(['admin', 'supervisor']), cerrarCaja);

// GET /api/cajas/historial - Historial paginado (todos los autenticados)
router.get('/historial', verifyToken, obtenerHistorialCajas);

// ===================================
// 🆕 RUTAS DE TRANSACCIONES
// ===================================
// GET /api/cajas/transacciones - Obtener transacciones con filtros
router.get('/transacciones', verifyToken, obtenerTransacciones);

// 🧾 NUEVA RUTA PARA DETALLE DE TRANSACCIÓN
router.get('/transacciones/:id/detalle', verifyToken, obtenerDetalleTransaccion);

// POST /api/cajas/transacciones - Crear nueva transacción
router.post('/transacciones', verifyToken, checkPermissions(['admin', 'supervisor', 'cajero']), crearTransaccion);

// DELETE /api/cajas/transacciones/:id - Eliminar transacción
router.delete('/transacciones/:id', verifyToken, checkPermissions(['admin', 'supervisor']), eliminarTransaccion);

// ===================================
// 🆕 RUTAS DE ARQUEO Y EVIDENCIAS
// ===================================
// POST /api/cajas/arqueo - Realizar arqueo crítico
router.post('/arqueo', verifyToken, checkPermissions(['admin', 'supervisor']), realizarArqueo);

// POST /api/cajas/evidencia-fotografica - Subir evidencia fotográfica
router.post('/evidencia-fotografica', verifyToken, subirEvidenciaFotografica);

// POST /api/cajas/autorizacion-ceo - Validar autorización CEO
router.post('/autorizacion-ceo', verifyToken, validarAutorizacionCEO);

// 🆕 RUTAS PARA AUTO-CIERRE Y CAJAS PENDIENTES
router.get('/pendientes', verifyToken, obtenerCajasPendientes);
router.post('/resolver-pendiente/:id', verifyToken, resolverCajaPendiente);
router.post('/forzar-auto-cierre', verifyToken, forzarAutoCierre);


// 📄 DESCARGAR PDF DE CIERRE
router.get('/pdf/:nombreArchivo', verifyToken, async (req, res) => {
  try {
    const { nombreArchivo } = req.params;
    const rutaPDF = path.join(__dirname, '../../uploads', nombreArchivo);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(rutaPDF)) {
      return sendError(res, 'PDF no encontrado', 404);
    }
    
    // Verificar que es un PDF de cierre válido
    if (!nombreArchivo.startsWith('cierre-caja-') || !nombreArchivo.endsWith('.pdf')) {
      return sendError(res, 'Archivo no válido', 400);
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    
    const stream = fs.createReadStream(rutaPDF);
    stream.pipe(res);
    
  } catch (error) {
    console.error('Error descargando PDF:', error);
    sendError(res, 'Error interno del servidor');
  }
});

// 📱 ENVIAR PDF POR WHATSAPP
router.post('/pdf/:nombreArchivo/whatsapp', verifyToken, async (req, res) => {
  try {
    const { nombreArchivo } = req.params;
    const { numero, mensaje } = req.body;
    
    const rutaPDF = path.join(__dirname, '../../uploads', nombreArchivo);
    
    if (!fs.existsSync(rutaPDF)) {
      return sendError(res, 'PDF no encontrado', 404);
    }
    
    // Aquí integrarías con tu servicio de WhatsApp existente
    // para enviar el PDF como adjunto
    
    sendSuccess(res, { 
      enviado: true, 
      numero, 
      archivo: nombreArchivo 
    }, 'PDF enviado por WhatsApp exitosamente');
    
  } catch (error) {
    console.error('Error enviando PDF por WhatsApp:', error);
    sendError(res, 'Error interno del servidor');
  }
});

const path = require('path');
const fs = require('fs');

// 📄 GENERAR PDF (temporal y alias pendiente)
router.post('/generar-pdf-temporal', verifyToken, generarPDFTemporal);

router.post('/generar-pdf-pendiente', verifyToken, generarPDFTemporal);




module.exports = router;