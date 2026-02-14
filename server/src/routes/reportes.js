// routes/reportes.js
const express = require('express');
const router = express.Router();
const ReportesController = require('../controllers/reportesController');
const { verifyToken } = require('../middleware/auth'); // 👈 CORREGIDO

// 🔐 MIDDLEWARE: Todas las rutas de reportes requieren autenticación
router.use(verifyToken); // 👈 CORREGIDO

// 🔐 MIDDLEWARE: Solo ADMIN puede acceder a reportes
const soloAdmin = (req, res, next) => {
  // 👈 VALIDACIÓN MEJORADA CONSISTENTE CON TU PATRÓN
  const rolNormalizado = req.user.rol?.toLowerCase();
  if (rolNormalizado !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: Solo administradores pueden ver reportes',
      usuario: req.user.nombre,
      rol_actual: req.user.rol,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Aplicar middleware de admin a todas las rutas
router.use(soloAdmin);

// 📊 RUTAS PRINCIPALES DE REPORTES

/**
 * @route   GET /api/reportes/resumen-general
 * @desc    Dashboard ejecutivo con métricas clave
 * @params  ?periodo=mes|semana|dia|trimestre|año
 * @access  Admin only
 */
router.get('/resumen-general', ReportesController.getResumenGeneral);

/**
 * @route   GET /api/reportes/financieros
 * @desc    Análisis financiero completo (flujo, rentabilidad)
 * @params  ?periodo=mes&moneda=bs|usd|ambas
 * @access  Admin only
 */
router.get('/financieros', ReportesController.getReportesFinancieros);

/**
 * @route   GET /api/reportes/egresos
 * @desc    Búsqueda de egresos por personas (accionistas/trabajadores)
 * @params  ?busqueda=texto&tipoPersona=accionista|trabajador&persona=nombre&fechaInicio=date&fechaFin=date
 * @access  Admin only
 */
router.get('/egresos', ReportesController.getReportesEgresos);

/**
 * @route   GET /api/reportes/cajas
 * @desc    Historial de cajas con evidencias fotográficas
 * @params  ?fechaInicio=date&fechaFin=date&usuario=nombre&estado=ABIERTA|CERRADA|PENDIENTE_CIERRE_FISICO
 * @access  Admin only
 */
router.get('/cajas', ReportesController.getReportesCajas);

// 🆕 RUTAS ADICIONALES AVANZADAS

/**
 * @route   GET /api/reportes/tasas-historicas
 * @desc    Consultar tasas de cambio por día
 * @params  ?fechaInicio=date&fechaFin=date&tipo=todas|bcv|paralelo
 * @access  Admin only
 */
router.get('/tasas-historicas', ReportesController.getTasasHistoricas);

/**
 * @route   GET /api/reportes/caja/:id/detalle
 * @desc    Detalle completo de una caja específica con todas sus transacciones
 * @params  id (número de caja)
 * @access  Admin only
 */
router.get('/caja/:id/detalle', ReportesController.getDetalleCaja);

/**
 * @route   GET /api/reportes/transacciones/buscar
 * @desc    Búsqueda avanzada de transacciones con múltiples filtros
 * @params  ?cajaId=number&tipo=INGRESO|EGRESO&categoria=text&usuario=text&cliente=text&montoMin=number&montoMax=number&fechaInicio=date&fechaFin=date&codigoVenta=text&metodoPago=text&limit=number
 * @access  Admin only
 */
router.get('/transacciones/buscar', ReportesController.buscarTransacciones);

/**
 * @route   GET /api/reportes/empleado
 * @desc    Reporte detallado por empleado/usuario específico con ventas y egresos
 * @params  ?usuarioId=number&fechaInicio=date&fechaFin=date
 * @access  Admin only
 */
router.get('/empleado', ReportesController.getReporteEmpleado);

/**
 * @route   GET /api/reportes/pago-vendedor/calculo
 * @desc    Cálculo de pago/comisiones de vendedor
 * @params  ?usuarioId=number&fechaInicio=date&fechaFin=date
 * @access  Admin only
 */
router.get('/pago-vendedor/calculo', ReportesController.getPagoVendedorCalculo);

/**
 * @route   GET /api/reportes/pago-tecnico/calculo
 * @desc    Cálculo de pago/comisiones de técnico
 * @params  ?usuarioId=number&fechaInicio=date&fechaFin=date
 * @access  Admin only
 */
router.get('/pago-tecnico/calculo', ReportesController.getPagoTecnicoCalculo);

/**
 * @route   POST /api/reportes/pago-tecnico/registrar
 * @desc    Registrar un pago técnico generado (al imprimir)
 * @body    { tecnicoId, fechaInicio, fechaFin, totalServicios, totalBs, totalUsd }
 * @access  Admin only
 */
router.post('/pago-tecnico/registrar', ReportesController.registrarPagoTecnico);

/**
 * @route   GET /api/reportes/pago-tecnico/periodos-pagados
 * @desc    Consultar períodos ya pagados de un técnico (para marcar en calendario)
 * @params  ?tecnicoId=number
 * @access  Admin only
 */
router.get('/pago-tecnico/periodos-pagados', ReportesController.getPeriodosPagados);

/**
 * @route   GET /api/reportes/tecnico
 * @desc    Reporte de servicios entregados por técnico
 * @params  ?usuarioId=number&fechaInicio=date&fechaFin=date
 * @access  Admin only
 */
router.get('/tecnico', ReportesController.getReporteTecnico);

// 🔍 RUTAS DE UTILIDAD Y DEBUG

/**
 * @route   GET /api/reportes/test
 * @desc    Endpoint de prueba para verificar funcionamiento
 * @access  Admin only
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas de reportes funcionando correctamente',
    usuario: {
      nombre: req.user.nombre,
      email: req.user.email,
      rol: req.user.rol,
      id: req.user.id
    },
    timestamp: new Date().toISOString(),
    endpoints_disponibles: [
      'GET /api/reportes/resumen-general',
      'GET /api/reportes/financieros',
      'GET /api/reportes/egresos',
      'GET /api/reportes/cajas',
      'GET /api/reportes/tasas-historicas',
      'GET /api/reportes/caja/:id/detalle',
      'GET /api/reportes/transacciones/buscar',
      'GET /api/reportes/empleado'
    ],
    ejemplos: {
      resumen_general: '/api/reportes/resumen-general?periodo=mes',
      financieros: '/api/reportes/financieros?periodo=trimestre&moneda=ambas',
      egresos: '/api/reportes/egresos?tipoPersona=accionista&fechaInicio=2025-01-01',
      cajas: '/api/reportes/cajas?estado=CERRADA&fechaInicio=2025-01-01',
      tasas: '/api/reportes/tasas-historicas?fechaInicio=2025-01-01&fechaFin=2025-01-31',
      detalle_caja: '/api/reportes/caja/1/detalle',
      buscar: '/api/reportes/transacciones/buscar?tipo=INGRESO&montoMin=100000',
      empleado: '/api/reportes/empleado?usuarioId=1&fechaInicio=2025-01-01&fechaFin=2025-01-31'
    }
  });
});

/**
 * @route   GET /api/reportes/estadisticas
 * @desc    Estadísticas rápidas del sistema de reportes
 * @access  Admin only
 */
router.get('/estadisticas', async (req, res) => {
  try {
    const prisma = require('../config/database');

    // Contar datos principales
    const [totalCajas, totalTransacciones, totalUsuarios, totalProductos] = await Promise.all([
      prisma.caja.count(),
      prisma.transaccion.count(),
      prisma.user.count(),
      prisma.product.count()
    ]);

    // Fechas importantes
    const primeraTransaccion = await prisma.transaccion.findFirst({
      orderBy: { fechaHora: 'asc' },
      select: { fechaHora: true }
    });

    const ultimaTransaccion = await prisma.transaccion.findFirst({
      orderBy: { fechaHora: 'desc' },
      select: { fechaHora: true }
    });

    res.json({
      success: true,
      data: {
        usuario_consultante: {
          nombre: req.user.nombre,
          rol: req.user.rol,
          consulta_desde: req.ip || 'IP no disponible'
        },
        totales: {
          cajas: totalCajas,
          transacciones: totalTransacciones,
          usuarios: totalUsuarios,
          productos: totalProductos
        },
        periodo_datos: {
          primera_transaccion: primeraTransaccion?.fechaHora || null,
          ultima_transaccion: ultimaTransaccion?.fechaHora || null
        },
        capacidades_reportes: {
          periodos_disponibles: ['hoy', 'semana', 'mes', 'trimestre', 'año'],
          tipos_reportes: ['resumen', 'financiero', 'egresos', 'cajas', 'empleado'],
          formatos_exportacion: ['JSON'], // TODO: Agregar PDF, Excel
          funcionalidades_avanzadas: [
            'Detección automática de personas en egresos',
            'Cálculo de rentabilidad en tiempo real',
            'Alertas automáticas por diferencias',
            'Búsqueda inteligente de transacciones',
            'Historial completo de tasas de cambio',
            'Análisis detallado por caja individual',
            'Métricas de efectividad operacional',
            'Reportes detallados por empleado/vendedor'
          ]
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en estadísticas de reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de reportes',
      usuario: req.user.nombre,
      error_details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// 🚫 MANEJO DE RUTAS NO ENCONTRADAS
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta de reportes no encontrada: ${req.method} ${req.originalUrl}`,
    usuario: req.user?.nombre || 'Usuario no identificado',
    rutas_disponibles: [
      'GET /api/reportes/resumen-general',
      'GET /api/reportes/financieros',
      'GET /api/reportes/egresos',
      'GET /api/reportes/cajas',
      'GET /api/reportes/tasas-historicas',
      'GET /api/reportes/caja/:id/detalle',
      'GET /api/reportes/transacciones/buscar',
      'GET /api/reportes/empleado',
      'GET /api/reportes/test',
      'GET /api/reportes/estadisticas'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;