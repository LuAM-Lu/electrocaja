// controllers/reportesController.js
const prisma = require('../config/database');
// Funciones de respuesta inline
const successResponse = (res, data, message = 'Operación exitosa') => {
  return res.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

const errorResponse = (res, message = 'Error interno', status = 500) => {
  return res.status(status).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

class ReportesController {

  // 📊 RESUMEN GENERAL - Dashboard Ejecutivo
  static async getResumenGeneral(req, res) {
    try {
      const { periodo = 'mes' } = req.query;

      // Calcular fechas según período
      const fechas = calcularFechasPeriodo(periodo);

      // 1. Estado de cajas
      const cajas = await prisma.caja.groupBy({
        by: ['estado'],
        where: {
          fecha: {
            gte: fechas.inicio,
            lte: fechas.fin
          }
        },
        _count: {
          estado: true
        }
      });

      const estadoCajas = {
        total: cajas.reduce((sum, c) => sum + c._count.estado, 0),
        abiertas: cajas.find(c => c.estado === 'ABIERTA')?._count.estado || 0,
        cerradas: cajas.find(c => c.estado === 'CERRADA')?._count.estado || 0,
        pendientes: cajas.find(c => c.estado === 'PENDIENTE_CIERRE_FISICO')?._count.estado || 0
      };

      // 2. Transacciones por tipo
      const transacciones = await prisma.transaccion.groupBy({
        by: ['tipo'],
        where: {
          fechaHora: {
            gte: fechas.inicio,
            lte: fechas.fin
          }
        },
        _count: {
          tipo: true
        },
        _sum: {
          totalBs: true,
          totalUsd: true
        }
      });

      const ingresos = transacciones.find(t => t.tipo === 'INGRESO');
      const egresos = transacciones.find(t => t.tipo === 'EGRESO');

      const montos = {
        totalIngresosBs: Number(ingresos?._sum.totalBs || 0),
        totalEgresosBs: Number(egresos?._sum.totalBs || 0),
        totalIngresosUsd: Number(ingresos?._sum.totalUsd || 0),
        totalEgresosUsd: Number(egresos?._sum.totalUsd || 0),
        balanceBs: Number(ingresos?._sum.totalBs || 0) - Number(egresos?._sum.totalBs || 0),
        balanceUsd: Number(ingresos?._sum.totalUsd || 0) - Number(egresos?._sum.totalUsd || 0)
      };

      // 3. Usuarios más activos
      const usuariosActivos = await prisma.transaccion.groupBy({
        by: ['usuarioId'],
        where: {
          fechaHora: {
            gte: fechas.inicio,
            lte: fechas.fin
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalBs: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      });

      // Obtener nombres de usuarios
      const usuariosConNombres = await Promise.all(
        usuariosActivos
          .filter(ua => ua.usuarioId !== null)
          .map(async (ua) => {
            const usuario = await prisma.user.findUnique({
              where: { id: ua.usuarioId },
              select: { nombre: true }
            });
            return {
              nombre: usuario?.nombre || 'Usuario eliminado',
              transacciones: ua._count.id,
              ventasTotal: Number(ua._sum.totalBs || 0)
            };
          })
      );

      // 4. Top productos (productos más vendidos)
      const topProductos = await prisma.transactionItem.groupBy({
        by: ['productoId'],
        where: {
          transaccion: {
            fechaHora: {
              gte: fechas.inicio,
              lte: fechas.fin
            },
            tipo: 'INGRESO'
          }
        },
        _sum: {
          cantidad: true,
          subtotal: true
        },
        orderBy: {
          _sum: {
            subtotal: 'desc'
          }
        },
        take: 5
      });

      const productosConNombres = await Promise.all(
        topProductos
          .filter(tp => tp.productoId !== null) // Filtramos nulos para evitar errores
          .map(async (tp) => {
            const producto = await prisma.product.findUnique({
              where: { id: tp.productoId },
              select: { descripcion: true }
            });
            return {
              descripcion: producto?.descripcion || 'Producto eliminado',
              ventas: tp._sum.cantidad || 0,
              ingresos: Number(tp._sum.subtotal || 0)
            };
          })
      );

      // 5. Actividad reciente (últimas 10 transacciones)
      const actividadReciente = await prisma.transaccion.findMany({
        where: {
          fechaHora: {
            gte: fechas.inicio,
            lte: fechas.fin
          }
        },
        include: {
          usuario: {
            select: { nombre: true }
          }
        },
        orderBy: {
          fechaHora: 'desc'
        },
        take: 10
      });

      const actividadFormateada = actividadReciente.map(t => ({
        tipo: t.tipo.toLowerCase(),
        descripcion: t.observaciones || `${t.tipo} - ${t.categoria}`,
        usuario: t.usuario?.nombre || 'Sistema',
        monto: Number(t.totalBs),
        fecha: t.fechaHora.toISOString()
      }));

      const resultado = {
        cajas: estadoCajas,
        transacciones: {
          total: (ingresos?._count.tipo || 0) + (egresos?._count.tipo || 0),
          ingresos: ingresos?._count.tipo || 0,
          egresos: egresos?._count.tipo || 0,
          ventas: ingresos?._count.tipo || 0
        },
        montos,
        usuarios: {
          activos: usuariosConNombres.length,
          transaccionesPorUsuario: usuariosConNombres
        },
        topProductos: productosConNombres,
        actividadReciente: actividadFormateada
      };

      return successResponse(res, resultado, 'Resumen general obtenido exitosamente');

    } catch (error) {
      console.error('Error en getResumenGeneral:', error);
      return errorResponse(res, 'Error al obtener resumen general', 500);
    }
  }

  // 💰 REPORTES FINANCIEROS - Flujo de efectivo y rentabilidad
  static async getReportesFinancieros(req, res) {
    try {
      const { periodo = 'mes', moneda = 'bs' } = req.query;

      const fechas = calcularFechasPeriodo(periodo);

      // 1. Flujo de efectivo
      const flujoEfectivo = await calcularFlujoEfectivo(fechas);

      // 2. Indicadores de rentabilidad
      const rentabilidad = await calcularRentabilidad(fechas, flujoEfectivo);

      // 3. Distribución de ingresos por categoría
      const distribucionIngresos = await prisma.transaccion.groupBy({
        by: ['categoria'],
        where: {
          tipo: 'INGRESO',
          fechaHora: {
            gte: fechas.inicio,
            lte: fechas.fin
          }
        },
        _sum: {
          totalBs: true
        },
        orderBy: {
          _sum: {
            totalBs: 'desc'
          }
        }
      });

      // 4. Distribución de egresos por categoría
      const distribucionEgresos = await prisma.transaccion.groupBy({
        by: ['categoria'],
        where: {
          tipo: 'EGRESO',
          fechaHora: {
            gte: fechas.inicio,
            lte: fechas.fin
          }
        },
        _sum: {
          totalBs: true
        },
        orderBy: {
          _sum: {
            totalBs: 'desc'
          }
        }
      });

      // 5. Tendencia mensual (últimos 3 meses)
      const tendenciaMensual = await calcularTendenciaMensual();

      // 6. Comparativo anual
      const comparativoAnual = await calcularComparativoAnual();

      const resultado = {
        flujoEfectivo,
        rentabilidad,
        distribucionIngresos: formatearDistribucion(distribucionIngresos, flujoEfectivo.ingresos.bs),
        distribucionEgresos: formatearDistribucion(distribucionEgresos, flujoEfectivo.egresos.bs),
        tendenciaMensual,
        comparativoAnual
      };

      return successResponse(res, resultado, 'Reportes financieros obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getReportesFinancieros:', error);
      return errorResponse(res, 'Error al obtener reportes financieros', 500);
    }
  }

  // 📉 REPORTES DE EGRESOS - Búsqueda por personas
  static async getReportesEgresos(req, res) {
    try {
      const {
        busqueda = '',
        tipoPersona = '',
        persona = '',
        fechaInicio,
        fechaFin
      } = req.query;

      let whereClause = {
        tipo: 'EGRESO'
      };

      // Filtros de fecha
      if (fechaInicio || fechaFin) {
        whereClause.fechaHora = {};
        if (fechaInicio) whereClause.fechaHora.gte = new Date(fechaInicio);
        if (fechaFin) whereClause.fechaHora.lte = new Date(fechaFin);
      }

      // Filtro por búsqueda general
      if (busqueda) {
        whereClause.OR = [
          { observaciones: { contains: busqueda, mode: 'insensitive' } },
          { categoria: { contains: busqueda, mode: 'insensitive' } }
        ];
      }

      const egresos = await prisma.transaccion.findMany({
        where: whereClause,
        include: {
          usuario: {
            select: { nombre: true }
          }
        },
        orderBy: {
          fechaHora: 'desc'
        }
      });

      // Procesar y clasificar egresos
      const egresosConPersonas = egresos.map(egreso => {
        const personaDetectada = detectarPersonaEnEgreso(egreso);
        return {
          ...egreso,
          total_bs: Number(egreso.totalBs),
          total_usd: Number(egreso.totalUsd),
          persona_relacionada: personaDetectada.nombre,
          tipo_persona: personaDetectada.tipo
        };
      });

      // Aplicar filtros de persona
      let egresosFiltrados = egresosConPersonas;

      if (tipoPersona) {
        egresosFiltrados = egresosFiltrados.filter(e => e.tipo_persona === tipoPersona);
      }

      if (persona) {
        egresosFiltrados = egresosFiltrados.filter(e => e.persona_relacionada === persona);
      }

      return successResponse(res, egresosFiltrados, 'Reportes de egresos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getReportesEgresos:', error);
      return errorResponse(res, 'Error al obtener reportes de egresos', 500);
    }
  }

  // 📦 REPORTES DE CAJAS - Historial con evidencias
  static async getReportesCajas(req, res) {
    try {
      const {
        fechaInicio,
        fechaFin,
        usuario = '',
        estado = ''
      } = req.query;

      let whereClause = {};

      // Filtros de fecha
      if (fechaInicio || fechaFin) {
        whereClause.fecha = {};
        if (fechaInicio) whereClause.fecha.gte = new Date(fechaInicio);
        if (fechaFin) whereClause.fecha.lte = new Date(fechaFin);
      }

      // Filtro por estado
      if (estado) {
        whereClause.estado = estado;
      }

      let cajas = await prisma.caja.findMany({
        where: whereClause,
        include: {
          usuarioApertura: {
            select: { nombre: true }
          },
          usuarioCierre: {
            select: { nombre: true }
          },
          arqueos: true
        },
        orderBy: {
          fecha: 'desc'
        }
      });

      // Filtro por usuario (aplicado después debido a la relación)
      if (usuario) {
        cajas = cajas.filter(caja =>
          caja.usuarioApertura?.nombre?.toLowerCase().includes(usuario.toLowerCase()) ||
          caja.usuarioCierre?.nombre?.toLowerCase().includes(usuario.toLowerCase())
        );
      }

      // Formatear datos para el frontend
      // Formatear datos para el frontend (camelCase consistente)
      const cajasFormateadas = cajas.map(caja => ({
        id: caja.id,
        fecha: caja.fecha,
        usuarioApertura: caja.usuarioApertura?.nombre || 'Usuario eliminado',
        usuarioCierre: caja.usuarioCierre?.nombre || null,
        estado: caja.estado,
        montoInicialBs: Number(caja.montoInicialBs),
        montoInicialUsd: Number(caja.montoInicialUsd),
        montoInicialPagoMovil: Number(caja.montoInicialPagoMovil),
        montoFinalBs: Number(caja.montoFinalBs || 0),
        montoFinalUsd: Number(caja.montoFinalUsd || 0),
        montoFinalPagoMovil: Number(caja.montoFinalPagoMovil || 0),
        totalIngresosBs: Number(caja.totalIngresosBs),
        totalEgresosBs: Number(caja.totalEgresosBs),
        totalIngresosUsd: Number(caja.totalIngresosUsd),
        totalEgresosUsd: Number(caja.totalEgresosUsd),
        diferenciaBs: calcularDiferenciaCaja(caja, 'bs'),
        diferenciaUsd: calcularDiferenciaCaja(caja, 'usd'),
        diferenciaPagoMovil: calcularDiferenciaCaja(caja, 'pago_movil'),
        fotoApertura: caja.imagenApertura,
        fotoArqueo: null, // TODO: Implementar si se requiere
        fotoCierre: caja.imagenCierre,
        observaciones: caja.observacionesCierre || caja.observacionesApertura,
        tasaBcv: Number(caja.tasaBcv || 0),
        tasaParalelo: Number(caja.tasaParalelo || 0),
        horaApertura: caja.horaApertura,
        horaCierre: caja.horaCierre
      }));

      return successResponse(res, cajasFormateadas, 'Reportes de cajas obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getReportesCajas:', error);
      return errorResponse(res, 'Error al obtener reportes de cajas', 500);
    }
  }

  // 📈 TASAS HISTÓRICAS - Consultar tasas por día
  static async getTasasHistoricas(req, res) {
    try {
      const { fechaInicio, fechaFin, tipo = 'todas' } = req.query;

      const ahora = new Date();
      const inicio = fechaInicio ? new Date(fechaInicio) : new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const fin = fechaFin ? new Date(fechaFin) : ahora;

      // Consultar tasas únicas por día de las cajas
      const tasasPorDia = await prisma.caja.findMany({
        where: {
          fecha: {
            gte: inicio,
            lte: fin
          },
          OR: [
            { tasaBcv: { not: null } },
            { tasaParalelo: { not: null } }
          ]
        },
        select: {
          fecha: true,
          tasaBcv: true,
          tasaParalelo: true,
          usuarioApertura: {
            select: { nombre: true }
          }
        },
        orderBy: { fecha: 'desc' }
      });

      // Agrupar por fecha (puede haber múltiples cajas por día)
      const tasasAgrupadas = {};

      tasasPorDia.forEach(caja => {
        const fechaKey = caja.fecha.toISOString().split('T')[0];

        if (!tasasAgrupadas[fechaKey]) {
          tasasAgrupadas[fechaKey] = {
            fecha: fechaKey,
            tasaBcv: Number(caja.tasaBcv || 0),
            tasaParalelo: Number(caja.tasaParalelo || 0),
            usuario: caja.usuarioApertura?.nombre || 'Sistema'
          };
        }
      });

      const resultado = Object.values(tasasAgrupadas).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      return successResponse(res, resultado, 'Tasas históricas obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getTasasHistoricas:', error);
      return errorResponse(res, 'Error al obtener tasas históricas', 500);
    }
  }

  // 🔍 DETALLE COMPLETO DE CAJA ESPECÍFICA
  static async getDetalleCaja(req, res) {
    try {
      const { id } = req.params;

      const cajaCompleta = await prisma.caja.findUnique({
        where: { id: parseInt(id) },
        include: {
          // 👥 Usuarios
          usuarioApertura: {
            select: { nombre: true, email: true, rol: true }
          },
          usuarioCierre: {
            select: { nombre: true, email: true, rol: true }
          },

          // 💰 TODAS las transacciones de esa caja
          transacciones: {
            include: {
              usuario: { select: { nombre: true, rol: true } },
              cliente: { select: { nombre: true, cedula_rif: true } },
              items: {
                include: {
                  producto: { select: { descripcion: true, codigoBarras: true } }
                }
              },
              pagos: true
            },
            orderBy: { fechaHora: 'asc' }
          },

          // 🧮 Arqueos realizados
          arqueos: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!cajaCompleta) {
        return errorResponse(res, 'Caja no encontrada', 404);
      }

      // 📊 Calcular métricas adicionales
      const metricas = {
        totalTransacciones: cajaCompleta.transacciones.length,
        ingresosPorCategoria: {},
        egresosPorCategoria: {},
        ventasPorUsuario: {},
        productosVendidos: {},
        metodosDepago: {},
        tiempoOperacion: calcularTiempoOperacion(cajaCompleta),
        transaccionesPorHora: []
      };

      // Procesar transacciones para métricas
      cajaCompleta.transacciones.forEach(t => {
        const totalBs = Number(t.totalBs);

        // Por categoría
        if (t.tipo === 'INGRESO') {
          metricas.ingresosPorCategoria[t.categoria] =
            (metricas.ingresosPorCategoria[t.categoria] || 0) + totalBs;
        } else {
          metricas.egresosPorCategoria[t.categoria] =
            (metricas.egresosPorCategoria[t.categoria] || 0) + totalBs;
        }

        // Por usuario
        const usuario = t.usuario?.nombre || 'Sistema';
        if (!metricas.ventasPorUsuario[usuario]) {
          metricas.ventasPorUsuario[usuario] = { transacciones: 0, total: 0 };
        }
        metricas.ventasPorUsuario[usuario].transacciones += 1;
        metricas.ventasPorUsuario[usuario].total += totalBs;

        // Productos vendidos (solo para ingresos)
        if (t.tipo === 'INGRESO') {
          t.items?.forEach(item => {
            const producto = item.producto?.descripcion || item.descripcion;
            if (!metricas.productosVendidos[producto]) {
              metricas.productosVendidos[producto] = { cantidad: 0, total: 0 };
            }
            metricas.productosVendidos[producto].cantidad += item.cantidad;
            metricas.productosVendidos[producto].total += Number(item.subtotal);
          });
        }

        // Métodos de pago
        t.pagos?.forEach(pago => {
          const metodo = `${pago.metodo} (${pago.moneda})`;
          metricas.metodosDepago[metodo] =
            (metricas.metodosDepago[metodo] || 0) + Number(pago.monto);
        });

        // Distribución por hora
        const hora = new Date(t.fechaHora).getHours();
        const horaKey = `${hora}:00`;
        if (!metricas.transaccionesPorHora[horaKey]) {
          metricas.transaccionesPorHora[horaKey] = 0;
        }
        metricas.transaccionesPorHora[horaKey] += 1;
      });

      const resultado = {
        caja: {
          ...cajaCompleta,
          montoInicialBs: Number(cajaCompleta.montoInicialBs),
          montoInicialUsd: Number(cajaCompleta.montoInicialUsd),
          montoFinalBs: Number(cajaCompleta.montoFinalBs || 0),
          montoFinalUsd: Number(cajaCompleta.montoFinalUsd || 0),
          totalIngresosBs: Number(cajaCompleta.totalIngresosBs),
          totalEgresosBs: Number(cajaCompleta.totalEgresosBs),
          totalIngresosUsd: Number(cajaCompleta.totalIngresosUsd),
          totalEgresosUsd: Number(cajaCompleta.totalEgresosUsd),
          tasaBcv: Number(cajaCompleta.tasaBcv || 0),
          tasaParalelo: Number(cajaCompleta.tasaParalelo || 0)
        },
        metricas,
        resumen: {
          diferenciaBs: calcularDiferenciaCaja(cajaCompleta, 'bs'),
          diferenciaUsd: calcularDiferenciaCaja(cajaCompleta, 'usd'),
          efectividad: calcularEfectividad(cajaCompleta),
          alertas: generarAlertas(cajaCompleta, metricas)
        }
      };

      return successResponse(res, resultado, 'Detalle de caja obtenido exitosamente');

    } catch (error) {
      console.error('Error en getDetalleCaja:', error);
      return errorResponse(res, 'Error al obtener detalle de caja', 500);
    }
  }

  // 🔍 BUSCAR TRANSACCIONES ESPECÍFICAS
  static async buscarTransacciones(req, res) {
    try {
      const {
        cajaId,
        tipo,
        categoria,
        usuario,
        cliente,
        montoMin,
        montoMax,
        fechaInicio,
        fechaFin,
        codigoVenta,
        metodoPago,
        limit = 100
      } = req.query;

      let whereClause = {};

      // Filtros específicos
      if (cajaId) whereClause.cajaId = parseInt(cajaId);
      if (tipo) whereClause.tipo = tipo;
      if (categoria) whereClause.categoria = { contains: categoria, mode: 'insensitive' };
      if (codigoVenta) whereClause.codigoVenta = { contains: codigoVenta, mode: 'insensitive' };

      // Filtro por rango de monto
      if (montoMin || montoMax) {
        whereClause.totalBs = {};
        if (montoMin) whereClause.totalBs.gte = parseFloat(montoMin);
        if (montoMax) whereClause.totalBs.lte = parseFloat(montoMax);
      }

      // Filtro por fechas
      if (fechaInicio || fechaFin) {
        whereClause.fechaHora = {};
        if (fechaInicio) whereClause.fechaHora.gte = new Date(fechaInicio);
        if (fechaFin) whereClause.fechaHora.lte = new Date(fechaFin);
      }

      // Filtro por usuario
      if (usuario) {
        whereClause.usuario = {
          nombre: { contains: usuario, mode: 'insensitive' }
        };
      }

      // Filtro por cliente
      if (cliente) {
        whereClause.OR = [
          { clienteNombre: { contains: cliente, mode: 'insensitive' } },
          { cliente: { nombre: { contains: cliente, mode: 'insensitive' } } }
        ];
      }

      // Filtro por método de pago
      if (metodoPago) {
        whereClause.pagos = {
          some: {
            metodo: { contains: metodoPago, mode: 'insensitive' }
          }
        };
      }

      const transacciones = await prisma.transaccion.findMany({
        where: whereClause,
        include: {
          usuario: { select: { nombre: true, rol: true } },
          cliente: { select: { nombre: true, cedula_rif: true } },
          caja: { select: { fecha: true } },
          items: {
            include: {
              producto: { select: { descripcion: true, codigoBarras: true } }
            }
          },
          pagos: true
        },
        orderBy: { fechaHora: 'desc' },
        take: parseInt(limit)
      });

      // Formatear números
      const transaccionesFormateadas = transacciones.map(t => ({
        ...t,
        totalBs: Number(t.totalBs),
        totalUsd: Number(t.totalUsd),
        descuentoTotal: Number(t.descuentoTotal || 0),
        items: t.items?.map(item => ({
          ...item,
          precioUnitario: Number(item.precioUnitario),
          precioCosto: Number(item.precioCosto),
          descuento: Number(item.descuento),
          subtotal: Number(item.subtotal)
        })),
        pagos: t.pagos?.map(pago => ({
          ...pago,
          monto: Number(pago.monto)
        }))
      }));

      return successResponse(res, transaccionesFormateadas, 'Búsqueda de transacciones completada');

    } catch (error) {
      console.error('Error en buscarTransacciones:', error);
      return errorResponse(res, 'Error al buscar transacciones', 500);
    }
  }
  // 👤 REPORTE POR EMPLEADO/USUARIO ESPECÍFICO - MAPEO CORRECTO SEGÚN SCHEMA
  static async getReporteEmpleado(req, res) {
    try {
      const {
        usuarioId,           // ⚡ CRÍTICO - Usuario específico
        fechaInicio,
        fechaFin
      } = req.query;

      // Validación crítica del usuarioId
      if (!usuarioId) {
        return errorResponse(res, 'El ID del usuario es obligatorio', 400);
      }

      // Configurar fechas
      let whereClause = {
        usuarioId: parseInt(usuarioId)
      };

      if (fechaInicio || fechaFin) {
        whereClause.fechaHora = {};
        if (fechaInicio) whereClause.fechaHora.gte = new Date(fechaInicio);
        if (fechaFin) whereClause.fechaHora.lte = new Date(fechaFin);
      }

      // 📊 CONSULTA PRINCIPAL: Transacciones del usuario con todos los detalles
      const transacciones = await prisma.transaccion.findMany({
        where: whereClause,
        include: {
          usuario: { select: { nombre: true, rol: true, email: true } },
          cliente: { select: { nombre: true, cedula_rif: true, telefono: true } },
          caja: { select: { fecha: true, estado: true } },
          items: {
            include: {
              producto: { select: { descripcion: true, categoria: true, codigoBarras: true } }
            }
          },
          pagos: true // ⚡ ESTO TRAE: metodo, monto, moneda, banco, referencia
        },
        orderBy: { fechaHora: 'desc' }
      });

      // 🧮 CÁLCULOS DE MÉTRICAS POR USUARIO
      const metricas = {
        // Totales generales
        totalTransacciones: transacciones.length,
        totalVentas: transacciones.filter(t => t.tipo === 'INGRESO').length,
        totalEgresos: transacciones.filter(t => t.tipo === 'EGRESO').length,

        // Montos
        montoVentasBs: 0,
        montoVentasUsd: 0,
        montoEgresosBs: 0,
        montoEgresosUsd: 0,

        // 💳 MÉTODOS DE PAGO VENEZUELA 2025 - BASADO EN SCHEMA REAL
        metodosPago: {
          // Efectivo tradicional
          'Efectivo Bs': 0,
          'Efectivo USD': 0,

          // Transferencias bancarias nacionales
          'Pago Móvil': 0,
          'Transferencia Bancaria': 0,

          // Bancos específicos (usando campo 'banco')
          'Banco del Tesoro': 0,
          'Banco Mercantil': 0,
          'Banco de Venezuela': 0,
          'BNC': 0,
          'Banesco': 0,
          'Provincial': 0,

          // Métodos internacionales
          'Zelle': 0,
          'PayPal': 0,

          // Criptomonedas y P2P
          'Binance Pay': 0,
          'Binance P2P': 0,
          'USDT': 0,
          'USDC': 0,
          'BUSD': 0,
          'Bitcoin': 0,

          // Billeteras digitales
          'Reserve': 0,
          'Zinli': 0,
          'AirTM': 0,

          // Tarjetas
          'Tarjeta Crédito': 0,
          'Tarjeta Débito': 0,
          'Biopago': 0,

          // Otros
          'Otros': 0
        },

        // Estadísticas por moneda (basado en campo 'moneda' del schema)
        montosPorMoneda: {
          'BS': 0,    // Bolívares
          'USD': 0,   // Dólares
          'EUR': 0    // Euros
        },

        // Productos vendidos
        productosVendidos: {},
        topProductos: [],

        // Categorías
        ventasPorCategoria: {},
        egresosPorCategoria: {},

        // Estadísticas temporales
        ventasPorDia: {},
        ventasPorHora: {},
        promedioVentaDiaria: 0,
        diaConMasVentas: null,
        horaConMasVentas: null,

        // Clientes atendidos
        clientesUnicos: new Set(),
        clientesFrecuentes: {},

        // Rendimiento
        tiempoPromedioAtencion: 0,
        transaccionMasAlta: 0,
        transaccionMasBaja: 999999999,
        ticketPromedio: 0
      };

      // 📈 PROCESAMIENTO DE TRANSACCIONES
      transacciones.forEach(transaccion => {
        const fecha = transaccion.fechaHora.toISOString().split('T')[0];
        const hora = transaccion.fechaHora.getHours();
        const totalBs = Number(transaccion.totalBs);
        const totalUsd = Number(transaccion.totalUsd);

        // Acumular montos por tipo
        if (transaccion.tipo === 'INGRESO') {
          metricas.montoVentasBs += totalBs;
          metricas.montoVentasUsd += totalUsd;

          // Ventas por categoría
          const categoria = transaccion.categoria || 'Sin categoría';
          metricas.ventasPorCategoria[categoria] = (metricas.ventasPorCategoria[categoria] || 0) + totalBs;

          // Ventas por día y hora
          metricas.ventasPorDia[fecha] = (metricas.ventasPorDia[fecha] || 0) + totalBs;
          metricas.ventasPorHora[hora] = (metricas.ventasPorHora[hora] || 0) + totalBs;

          // Transacciones máximas y mínimas
          if (totalBs > metricas.transaccionMasAlta) metricas.transaccionMasAlta = totalBs;
          if (totalBs < metricas.transaccionMasBaja && totalBs > 0) metricas.transaccionMasBaja = totalBs;

        } else {
          metricas.montoEgresosBs += totalBs;
          metricas.montoEgresosUsd += totalUsd;

          // Egresos por categoría
          const categoria = transaccion.categoria || 'Sin categoría';
          metricas.egresosPorCategoria[categoria] = (metricas.egresosPorCategoria[categoria] || 0) + totalBs;
        }

        // Clientes únicos
        if (transaccion.clienteId) {
          metricas.clientesUnicos.add(transaccion.clienteId);
          const clienteNombre = transaccion.cliente?.nombre || transaccion.clienteNombre || 'Cliente sin nombre';
          metricas.clientesFrecuentes[clienteNombre] = (metricas.clientesFrecuentes[clienteNombre] || 0) + 1;
        }

        // 💳 PROCESAMIENTO PAGOS - MAPEO EXACTO SEGÚN SCHEMA
        transaccion.pagos?.forEach(pago => {
          const monto = Number(pago.monto);
          const metodo = (pago.metodo || '').toLowerCase().trim();
          const moneda = (pago.moneda || 'BS').toUpperCase();
          const banco = (pago.banco || '').toLowerCase().trim();

          // Acumular por moneda
          metricas.montosPorMoneda[moneda] = (metricas.montosPorMoneda[moneda] || 0) + monto;

          // Clasificación inteligente por método
          let metodoKey = 'Otros';

          // EFECTIVO
          if (metodo.includes('efectivo')) {
            metodoKey = moneda === 'USD' ? 'Efectivo USD' : 'Efectivo Bs';
          }

          // PAGO MÓVIL
          else if (metodo.includes('pago móvil') || metodo.includes('pago movil') || metodo.includes('movil')) {
            metodoKey = 'Pago Móvil';
          }

          // TRANSFERENCIAS - Clasificar por banco específico
          else if (metodo.includes('transferencia') || metodo.includes('transfer')) {
            if (banco.includes('tesoro') || banco.includes('bt ')) {
              metodoKey = 'Banco del Tesoro';
            } else if (banco.includes('mercantil')) {
              metodoKey = 'Banco Mercantil';
            } else if (banco.includes('venezuela') || banco.includes('bdv')) {
              metodoKey = 'Banco de Venezuela';
            } else if (banco.includes('bnc') || banco.includes('nacional')) {
              metodoKey = 'BNC';
            } else if (banco.includes('banesco')) {
              metodoKey = 'Banesco';
            } else if (banco.includes('provincial')) {
              metodoKey = 'Provincial';
            } else {
              metodoKey = 'Transferencia Bancaria';
            }
          }

          // MÉTODOS INTERNACIONALES
          else if (metodo.includes('zelle')) {
            metodoKey = 'Zelle';
          } else if (metodo.includes('paypal')) {
            metodoKey = 'PayPal';
          }

          // CRIPTOMONEDAS Y BINANCE
          else if (metodo.includes('binance pay')) {
            metodoKey = 'Binance Pay';
          } else if (metodo.includes('binance p2p') || metodo.includes('binance peer')) {
            metodoKey = 'Binance P2P';
          } else if (metodo.includes('usdt') || metodo.includes('tether')) {
            metodoKey = 'USDT';
          } else if (metodo.includes('usdc')) {
            metodoKey = 'USDC';
          } else if (metodo.includes('busd')) {
            metodoKey = 'BUSD';
          } else if (metodo.includes('bitcoin') || metodo.includes('btc')) {
            metodoKey = 'Bitcoin';
          }

          // BILLETERAS DIGITALES
          else if (metodo.includes('reserve')) {
            metodoKey = 'Reserve';
          } else if (metodo.includes('zinli')) {
            metodoKey = 'Zinli';
          } else if (metodo.includes('airtm')) {
            metodoKey = 'AirTM';
          }

          // TARJETAS
          else if (metodo.includes('tarjeta crédito') || metodo.includes('credito') || metodo.includes('visa') || metodo.includes('mastercard')) {
            metodoKey = 'Tarjeta Crédito';
          } else if (metodo.includes('tarjeta débito') || metodo.includes('debito')) {
            metodoKey = 'Tarjeta Débito';
          } else if (metodo.includes('biopago')) {
            metodoKey = 'Biopago';
          }

          // Acumular monto por método
          metricas.metodosPago[metodoKey] += monto;
        });

        // Productos vendidos (solo ingresos)
        if (transaccion.tipo === 'INGRESO') {
          transaccion.items?.forEach(item => {
            const productoKey = item.producto?.descripcion || item.descripcion;
            if (!metricas.productosVendidos[productoKey]) {
              metricas.productosVendidos[productoKey] = {
                descripcion: productoKey,
                categoria: item.producto?.categoria || 'Sin categoría',
                codigoBarras: item.producto?.codigoBarras || item.codigoBarras,
                cantidad: 0,
                montoTotal: 0,
                precioPromedio: 0,
                vecesVendido: 0
              };
            }

            const producto = metricas.productosVendidos[productoKey];
            producto.cantidad += item.cantidad;
            producto.montoTotal += Number(item.subtotal);
            producto.vecesVendido += 1;
            producto.precioPromedio = producto.montoTotal / producto.cantidad;
          });
        }
      });

      // 🏆 TOP PRODUCTOS más vendidos
      metricas.topProductos = Object.values(metricas.productosVendidos)
        .sort((a, b) => b.montoTotal - a.montoTotal)
        .slice(0, 10)
        .map(p => ({
          descripcion: p.descripcion,
          categoria: p.categoria,
          cantidad: p.cantidad,
          montoTotal: p.montoTotal,
          precioPromedio: p.precioPromedio.toFixed(2),
          vecesVendido: p.vecesVendido
        }));

      // 📅 ESTADÍSTICAS TEMPORALES
      const diasConVentas = Object.keys(metricas.ventasPorDia);
      if (diasConVentas.length > 0) {
        metricas.promedioVentaDiaria = metricas.montoVentasBs / diasConVentas.length;
        metricas.diaConMasVentas = Object.entries(metricas.ventasPorDia)
          .sort(([, a], [, b]) => b - a)[0];
      }

      // Hora con más ventas
      if (Object.keys(metricas.ventasPorHora).length > 0) {
        metricas.horaConMasVentas = Object.entries(metricas.ventasPorHora)
          .sort(([, a], [, b]) => b - a)[0];
      }

      // Ticket promedio
      if (metricas.totalVentas > 0) {
        metricas.ticketPromedio = metricas.montoVentasBs / metricas.totalVentas;
      }

      // 👥 CLIENTES MÁS FRECUENTES
      const clientesFrecuentesArray = Object.entries(metricas.clientesFrecuentes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([nombre, visitas]) => ({ nombre, visitas }));

      // 💰 BALANCE Y RENTABILIDAD
      const balance = {
        neto: metricas.montoVentasBs - metricas.montoEgresosBs,
        netoUsd: metricas.montoVentasUsd - metricas.montoEgresosUsd,
        margenOperativo: metricas.montoVentasBs > 0 ?
          ((metricas.montoVentasBs - metricas.montoEgresosBs) / metricas.montoVentasBs * 100) : 0
      };

      // 📋 FORMATEAR TRANSACCIONES PARA FRONTEND - CON CAMPOS REALES
      const transaccionesFormateadas = transacciones.map(t => ({
        id: t.id,
        tipo: t.tipo,
        categoria: t.categoria,
        codigoVenta: t.codigoVenta,
        fechaHora: t.fechaHora,
        cliente: t.cliente?.nombre || t.clienteNombre || 'Sin cliente',
        clienteCedula: t.cliente?.cedula_rif || 'N/A',
        totalBs: Number(t.totalBs),
        totalUsd: Number(t.totalUsd),
        observaciones: t.observaciones,
        metodoPagoPrincipal: t.metodoPagoPrincipal,
        cantidadItems: t.cantidadItems,
        items: t.items?.map(item => ({
          descripcion: item.producto?.descripcion || item.descripcion,
          categoria: item.producto?.categoria || 'Sin categoría',
          cantidad: item.cantidad,
          precioUnitario: Number(item.precioUnitario),
          descuento: Number(item.descuento || 0),
          subtotal: Number(item.subtotal)
        })) || [],
        pagos: t.pagos?.map(pago => ({
          metodo: pago.metodo,        // ⚡ CAMPO REAL DEL SCHEMA
          moneda: pago.moneda,        // ⚡ CAMPO REAL DEL SCHEMA
          monto: Number(pago.monto),  // ⚡ CAMPO REAL DEL SCHEMA
          banco: pago.banco,          // ⚡ CAMPO REAL DEL SCHEMA (opcional)
          referencia: pago.referencia // ⚡ CAMPO REAL DEL SCHEMA (opcional)
        })) || []
      }));

      // 🎯 RESULTADO FINAL
      const resultado = {
        usuario: {
          id: parseInt(usuarioId),
          nombre: transacciones[0]?.usuario?.nombre || 'Usuario no encontrado',
          rol: transacciones[0]?.usuario?.rol || 'N/A',
          email: transacciones[0]?.usuario?.email || 'N/A'
        },
        periodo: {
          fechaInicio: fechaInicio || 'Desde el inicio',
          fechaFin: fechaFin || 'Hasta ahora',
          diasAnalizados: diasConVentas.length
        },
        metricas: {
          ...metricas,
          clientesUnicos: metricas.clientesUnicos.size,
          clientesFrecuentes: clientesFrecuentesArray,
          transaccionMasBaja: metricas.transaccionMasBaja === 999999999 ? 0 : metricas.transaccionMasBaja
        },
        balance,
        transacciones: transaccionesFormateadas,
        resumen: {
          totalOperaciones: metricas.totalTransacciones,
          eficienciaVentas: metricas.totalTransacciones > 0 ?
            ((metricas.totalVentas / metricas.totalTransacciones) * 100) : 0,
          ticketPromedio: metricas.ticketPromedio
        }
      };

      return successResponse(res, resultado, `Reporte del empleado ${resultado.usuario.nombre} generado exitosamente`);

    } catch (error) {
      console.error('Error en getReporteEmpleado:', error);
      return errorResponse(res, 'Error al generar reporte del empleado', 500);
    }
  }

}



// 🛠️ FUNCIONES AUXILIARES
function calcularFechasPeriodo(periodo) {
  const ahora = new Date();
  let inicio, fin;

  switch (periodo) {
    case 'dia':
    case 'hoy':
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
      break;
    case 'semana':
      const inicioSemana = ahora.getDate() - ahora.getDay();
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), inicioSemana);
      fin = new Date(ahora.getFullYear(), ahora.getMonth(), inicioSemana + 6, 23, 59, 59);
      break;
    case 'mes':
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'trimestre':
      const mesInicioTrimestre = Math.floor(ahora.getMonth() / 3) * 3;
      inicio = new Date(ahora.getFullYear(), mesInicioTrimestre, 1);
      fin = new Date(ahora.getFullYear(), mesInicioTrimestre + 3, 0, 23, 59, 59);
      break;
    case 'año':
      inicio = new Date(ahora.getFullYear(), 0, 1);
      fin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
      break;
    default:
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
  }

  return { inicio, fin };
}

async function calcularFlujoEfectivo(fechas) {
  const ingresos = await prisma.transaccion.aggregate({
    where: {
      tipo: 'INGRESO',
      fechaHora: {
        gte: fechas.inicio,
        lte: fechas.fin
      }
    },
    _sum: {
      totalBs: true,
      totalUsd: true
    }
  });

  const egresos = await prisma.transaccion.aggregate({
    where: {
      tipo: 'EGRESO',
      fechaHora: {
        gte: fechas.inicio,
        lte: fechas.fin
      }
    },
    _sum: {
      totalBs: true,
      totalUsd: true
    }
  });

  return {
    ingresos: {
      bs: Number(ingresos._sum.totalBs || 0),
      usd: Number(ingresos._sum.totalUsd || 0)
    },
    egresos: {
      bs: Number(egresos._sum.totalBs || 0),
      usd: Number(egresos._sum.totalUsd || 0)
    },
    balance: {
      bs: Number(ingresos._sum.totalBs || 0) - Number(egresos._sum.totalBs || 0),
      usd: Number(ingresos._sum.totalUsd || 0) - Number(egresos._sum.totalUsd || 0)
    }
  };
}

async function calcularRentabilidad(fechas, flujoEfectivo) {
  // Obtener costos reales de productos vendidos
  const costosVentas = await prisma.transactionItem.aggregate({
    where: {
      transaccion: {
        tipo: 'INGRESO',
        fechaHora: {
          gte: fechas.inicio,
          lte: fechas.fin
        }
      }
    },
    _sum: {
      precioCosto: true,
      subtotal: true
    }
  });

  const ingresosBs = flujoEfectivo.ingresos.bs;
  const egresosBs = flujoEfectivo.egresos.bs;
  const costoProductos = Number(costosVentas._sum.precioCosto || 0);

  // Cálculos más precisos
  const margenBruto = ingresosBs > 0 ? ((ingresosBs - costoProductos) / ingresosBs * 100) : 0;
  const margenNeto = ingresosBs > 0 ? ((ingresosBs - egresosBs) / ingresosBs * 100) : 0;
  const roi = ingresosBs > 0 ? (((ingresosBs - egresosBs) / egresosBs) * 100) : 0;

  return {
    margenBruto: Math.round(margenBruto * 100) / 100,
    margenNeto: Math.round(margenNeto * 100) / 100,
    roi: Math.round(roi * 100) / 100
  };
}

function detectarPersonaEnEgreso(egreso) {
  const texto = (egreso.observaciones + ' ' + egreso.categoria).toLowerCase();

  // Patrones para accionistas
  const patronesAccionista = [
    'accionista', 'dividendo', 'préstamo accionista', 'retiro accionista',
    'pago accionista', 'distribución', 'utilidades'
  ];

  // Patrones para trabajadores
  const patronesTrabajador = [
    'trabajador', 'empleado', 'salario', 'sueldo', 'prestación',
    'bonificación', 'aguinaldo', 'vacaciones', 'pago trabajador',
    'adelanto salario', 'liquidación'
  ];

  // Detectar tipo
  let tipo = 'otro';
  if (patronesAccionista.some(patron => texto.includes(patron))) {
    tipo = 'accionista';
  } else if (patronesTrabajador.some(patron => texto.includes(patron))) {
    tipo = 'trabajador';
  }

  // Extraer nombre
  const nombre = extraerNombreDeTexto(egreso.observaciones);

  return { nombre, tipo };
}

function extraerNombreDeTexto(texto) {
  if (!texto) return 'No especificado';

  // Buscar patrones comunes: "Pago a Juan Pérez", "Salario María González"
  const patronesNombre = [
    /(?:pago\s+a|salario|sueldo\s+a|para)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i,
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i
  ];

  for (const patron of patronesNombre) {
    const match = texto.match(patron);
    if (match) {
      return match[1];
    }
  }

  // Buscar palabras que empiecen con mayúscula (posibles nombres)
  const palabras = texto.split(' ');
  const posiblesNombres = palabras.filter(palabra =>
    palabra.length > 2 &&
    palabra[0] === palabra[0].toUpperCase() &&
    !/^\d/.test(palabra) && // No números
    !['Bs', 'USD', 'Pago', 'Salario'].includes(palabra)
  );

  if (posiblesNombres.length >= 2) {
    return posiblesNombres.slice(0, 2).join(' ');
  } else if (posiblesNombres.length === 1) {
    return posiblesNombres[0];
  }

  return 'No especificado';
}

function formatearDistribucion(datos, total) {
  return datos.map(item => ({
    categoria: item.categoria,
    monto: Number(item._sum.totalBs || 0),
    porcentaje: total > 0 ? Math.round((Number(item._sum.totalBs || 0) / total) * 100 * 100) / 100 : 0
  }));
}

function calcularDiferenciaCaja(caja, moneda) {
  let inicial, ingresos, egresos, final;

  switch (moneda) {
    case 'bs':
      inicial = Number(caja.montoInicialBs || 0);
      ingresos = Number(caja.totalIngresosBs || 0);
      egresos = Number(caja.totalEgresosBs || 0);
      final = Number(caja.montoFinalBs || 0);
      break;
    case 'usd':
      inicial = Number(caja.montoInicialUsd || 0);
      ingresos = Number(caja.totalIngresosUsd || 0);
      egresos = Number(caja.totalEgresosUsd || 0);
      final = Number(caja.montoFinalUsd || 0);
      break;
    case 'pago_movil':
      inicial = Number(caja.montoInicialPagoMovil || 0);
      ingresos = Number(caja.totalPagoMovil || 0);
      egresos = 0; // No hay egresos específicos de pago móvil
      final = Number(caja.montoFinalPagoMovil || 0);
      break;
    default:
      return 0;
  }

  const esperado = inicial + ingresos - egresos;
  return final - esperado;
}

async function calcularTendenciaMensual() {
  const ahora = new Date();
  const meses = [];

  // Últimos 3 meses
  for (let i = 2; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59);

    const flujo = await calcularFlujoEfectivo({ inicio: inicioMes, fin: finMes });

    meses.push({
      mes: fecha.toLocaleDateString('es-VE', { month: 'short' }),
      ingresos: flujo.ingresos.bs,
      egresos: flujo.egresos.bs
    });
  }

  return meses;
}

async function calcularComparativoAnual() {
  const añoActual = new Date().getFullYear();
  const añoAnterior = añoActual - 1;

  // Año actual
  const inicioActual = new Date(añoActual, 0, 1);
  const finActual = new Date(añoActual, 11, 31, 23, 59, 59);
  const flujoActual = await calcularFlujoEfectivo({ inicio: inicioActual, fin: finActual });

  // Año anterior
  const inicioAnterior = new Date(añoAnterior, 0, 1);
  const finAnterior = new Date(añoAnterior, 11, 31, 23, 59, 59);
  const flujoAnterior = await calcularFlujoEfectivo({ inicio: inicioAnterior, fin: finAnterior });

  return {
    añoActual: {
      ingresos: flujoActual.ingresos.bs,
      egresos: flujoActual.egresos.bs
    },
    añoAnterior: {
      ingresos: flujoAnterior.ingresos.bs,
      egresos: flujoAnterior.egresos.bs
    }
  };
}

function calcularTiempoOperacion(caja) {
  if (!caja.horaApertura || !caja.horaCierre) return null;

  try {
    const apertura = new Date(`${caja.fecha.toISOString().split('T')[0]}T${caja.horaApertura}`);
    const cierre = new Date(`${caja.fecha.toISOString().split('T')[0]}T${caja.horaCierre}`);

    const diffMs = cierre - apertura;
    if (diffMs <= 0) return null;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}h ${diffMinutes}m`;
  } catch (error) {
    return null;
  }
}

function calcularEfectividad(caja) {
  const transacciones = caja.transacciones || [];
  const tiempoOperacion = calcularTiempoOperacion(caja);

  if (!tiempoOperacion || transacciones.length === 0) return 'N/A';

  try {
    const horas = parseFloat(tiempoOperacion.split('h')[0]);
    if (horas <= 0) return 'N/A';

    const transaccionesPorHora = transacciones.length / horas;
    return `${transaccionesPorHora.toFixed(1)} trans/hora`;
  } catch (error) {
    return 'N/A';
  }
}

function generarAlertas(caja, metricas) {
  const alertas = [];

  // Alerta por diferencias significativas
  const difBs = calcularDiferenciaCaja(caja, 'bs');
  const difUsd = calcularDiferenciaCaja(caja, 'usd');

  if (Math.abs(difBs) > 10000) {
    alertas.push({
      tipo: 'diferencia',
      severidad: Math.abs(difBs) > 50000 ? 'alta' : 'media',
      mensaje: `Diferencia en Bs: ${difBs > 0 ? '+' : ''}${difBs.toLocaleString('es-VE')} Bs`,
      valor: difBs
    });
  }

  if (Math.abs(difUsd) > 5) {
    alertas.push({
      tipo: 'diferencia',
      severidad: Math.abs(difUsd) > 20 ? 'alta' : 'media',
      mensaje: `Diferencia en USD: ${difUsd > 0 ? '+' : ''}$${difUsd.toFixed(2)}`,
      valor: difUsd
    });
  }

  // Alerta por alto volumen
  if (metricas.totalTransacciones > 100) {
    alertas.push({
      tipo: 'volumen',
      severidad: 'info',
      mensaje: `Alto volumen: ${metricas.totalTransacciones} transacciones`,
      valor: metricas.totalTransacciones
    });
  }

  // Alerta por tiempo de operación largo
  const tiempoOperacion = metricas.tiempoOperacion;
  if (tiempoOperacion && tiempoOperacion.includes('h')) {
    const horas = parseInt(tiempoOperacion.split('h')[0]);
    if (horas > 12) {
      alertas.push({
        tipo: 'tiempo',
        severidad: 'media',
        mensaje: `Operación extendida: ${tiempoOperacion}`,
        valor: horas
      });
    }
  }

  // Alerta por falta de evidencias
  if (!caja.imagenApertura || !caja.imagenCierre) {
    alertas.push({
      tipo: 'evidencia',
      severidad: 'media',
      mensaje: 'Evidencias fotográficas incompletas',
      valor: null
    });
  }

  return alertas;
}

module.exports = ReportesController;