// server/src/controllers/cajaController.js (VERSIÓN FINAL CORREGIDA)
const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responses');
const { Decimal } = require('@prisma/client/runtime/library');
const PDFCierreService = require('../services/pdfCierreService');

const path = require('path');
const fs = require('fs');

// Función para convertir a Decimal de forma segura
const toDecimal = (value) => {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  return new Decimal(value.toString());
};

// Función para convertir Decimal a Number para el frontend
const decimalToNumber = (decimal) => {
  if (!decimal) return 0;
  return parseFloat(decimal.toString());
};

// 🔥 FUNCIÓN SIMPLIFICADA SIN API (valores fijos)
const obtenerTasasCambio = async () => {
  try {
    return {
      tasaBcv: new Decimal('36.50'),
      tasaParalelo: new Decimal('38.20')
    };
  } catch (error) {
    console.error('Error obteniendo tasas:', error);
    return {
      tasaBcv: new Decimal('36.50'),
      tasaParalelo: new Decimal('38.20')
    };
  }
};

// ===================================
// 📊 OBTENER CAJA ACTUAL
// ===================================
const getCajaActual = async (req, res) => {
  try {
    const caja = await prisma.caja.findFirst({
  where: {
    estado: {
      in: ['ABIERTA', 'PENDIENTE_CIERRE_FISICO']  // ✅ BUSCAR AMBOS ESTADOS
    }
  },
  orderBy: {
    fecha: 'desc'
  },
      include: {
        usuarioApertura: {
          select: {
            id: true,
            nombre: true,
            rol: true
          }
        },
        usuarioCierre: {
          select: {
            id: true,
            nombre: true,
            rol: true
          }
        },
        transacciones: {
              include: {
                pagos: true,
                items: {
                  include: {
                    producto: {
                      select: {
                        id: true,
                        descripcion: true,
                        tipo: true
                      }
                    }
                  }
                },
                usuario: {
                  select: {
                    id: true,
                    nombre: true,
                    email: true,
                    rol: true
                  }
                }
              },
              orderBy: {
                fechaHora: 'desc'
              }
            },
        arqueos: true
      }
    });

    // Convertir Decimals a números para el frontend
    if (caja) {
      const cajaConvertida = {
        ...caja,
        montoInicialBs: decimalToNumber(caja.montoInicialBs),
        montoInicialUsd: decimalToNumber(caja.montoInicialUsd),
        montoInicialPagoMovil: decimalToNumber(caja.montoInicialPagoMovil),
        montoFinalBs: decimalToNumber(caja.montoFinalBs),
        montoFinalUsd: decimalToNumber(caja.montoFinalUsd),
        montoFinalPagoMovil: decimalToNumber(caja.montoFinalPagoMovil),
        totalIngresosBs: decimalToNumber(caja.totalIngresosBs),
        totalEgresosBs: decimalToNumber(caja.totalEgresosBs),
        totalIngresosUsd: decimalToNumber(caja.totalIngresosUsd),
        totalEgresosUsd: decimalToNumber(caja.totalEgresosUsd),
        totalPagoMovil: decimalToNumber(caja.totalPagoMovil),
        tasaBcv: decimalToNumber(caja.tasaBcv),
        tasaParalelo: decimalToNumber(caja.tasaParalelo),
        transacciones: caja.transacciones.map(t => ({
          ...t,
          totalBs: decimalToNumber(t.totalBs),
          totalUsd: decimalToNumber(t.totalUsd),
          tasaCambioUsada: decimalToNumber(t.tasaCambioUsada),
          usuario: t.usuario?.nombre || 'Usuario desconocido', // 👈 AGREGAR ESTA LÍNEA
          pagos: t.pagos.map(p => ({
            ...p,
            monto: decimalToNumber(p.monto)
          }))
        }))
      };
      
      sendSuccess(res, { caja: cajaConvertida, transacciones: cajaConvertida.transacciones });
    } else {
      sendSuccess(res, { caja: null, transacciones: [] });
    }
  } catch (error) {
    console.error('Error obteniendo caja actual:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🏪 ABRIR CAJA
// ===================================
const abrirCaja = async (req, res) => {
  try {
    const { 
      montoInicialBs = 0, 
      montoInicialUsd = 0, 
      montoInicialPagoMovil = 0,
      observacionesApertura = '',
      imagenApertura = null
    } = req.body;
    
    const userId = req.user.userId;
    const userRole = req.user.rol;

    console.log('🔍 Intentando abrir caja:');
    console.log('   - Usuario:', req.user.email);
    console.log('   - Rol:', userRole);
    console.log('   - Montos:', { montoInicialBs, montoInicialUsd, montoInicialPagoMovil });

    // Validación de roles
    const rolNormalizado = userRole?.toLowerCase();
    if (!['admin', 'supervisor'].includes(rolNormalizado)) {
      console.log('❌ Rol insuficiente:', rolNormalizado);
      return sendError(res, 'No tienes permisos para abrir caja', 403);
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Verificar si ya hay una caja abierta o pendiente de cierre
    const cajaExistente = await prisma.caja.findFirst({
      where: {
        estado: {
          in: ['ABIERTA', 'PENDIENTE_CIERRE_FISICO']
        }
      }
    });

    if (cajaExistente) {
      console.log('❌ Ya existe caja abierta:', cajaExistente.id);
      return sendError(res, 'Ya hay una caja abierta. Debe cerrarla primero.', 400);
    }

    // Validar montos
    const montoBsDecimal = toDecimal(montoInicialBs);
    const montoUsdDecimal = toDecimal(montoInicialUsd);
    const montoPagoMovilDecimal = toDecimal(montoInicialPagoMovil);

    if (montoBsDecimal.lt(0) || montoUsdDecimal.lt(0) || montoPagoMovilDecimal.lt(0)) {
      return sendError(res, 'Los montos iniciales no pueden ser negativos', 400);
    }

    // Obtener tasas de cambio
    const tasas = await obtenerTasasCambio();
    console.log('💱 Tasas obtenidas:', tasas);

    const horaActual = new Date().toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Crear nueva caja
    const nuevaCaja = await prisma.caja.create({
      data: {
        fecha: hoy,
        montoInicialBs: montoBsDecimal,
        montoInicialUsd: montoUsdDecimal,
        montoInicialPagoMovil: montoPagoMovilDecimal,
        horaApertura: horaActual,
        usuarioAperturaId: userId,
        estado: 'ABIERTA',
        tasaBcv: tasas.tasaBcv,
        tasaParalelo: tasas.tasaParalelo,
        observacionesApertura: observacionesApertura,
        imagenApertura: imagenApertura
      },
      include: {
        usuarioApertura: {
          select: {
            id: true,
            nombre: true,
            rol: true
          }
        }
      }
    });

    console.log('✅ Caja creada exitosamente:', nuevaCaja.id);

    // Convertir para el frontend
    const cajaConvertida = {
      ...nuevaCaja,
      montoInicialBs: decimalToNumber(nuevaCaja.montoInicialBs),
      montoInicialUsd: decimalToNumber(nuevaCaja.montoInicialUsd),
      montoInicialPagoMovil: decimalToNumber(nuevaCaja.montoInicialPagoMovil),
      tasaBcv: decimalToNumber(nuevaCaja.tasaBcv),
      tasaParalelo: decimalToNumber(nuevaCaja.tasaParalelo)
    };

    // Notificar via Socket.IO
    if (req.io) {
      console.log('📡 Emitiendo evento caja_abierta:', {
        caja_id: cajaConvertida.id,
        usuario: req.user?.email,
        timestamp: new Date().toISOString()
      });
      
      req.io.emit('caja_abierta', {
        caja: cajaConvertida,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      
      console.log('📡 Evento caja_abierta enviado a todos los usuarios conectados');
    } else {
      console.log('⚠️ req.io no disponible para emitir evento');
    }

    sendSuccess(res, cajaConvertida, 'Caja abierta correctamente');
  } catch (error) {
    console.error('❌ Error abriendo caja:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🔒 CERRAR CAJA
// ===================================
const cerrarCaja = async (req, res) => {
  try {
    const { 
      montoFinalBs,
      montoFinalUsd,
      montoFinalPagoMovil,
      observacionesCierre = '',
      imagenCierre = null
    } = req.body;
    
    const userId = req.user.userId;
    const userRole = req.user.rol;

    console.log('🔍 Intentando cerrar caja:');
    console.log('   - Usuario:', req.user.email);
    console.log('   - Rol:', userRole);
    console.log('   - Montos finales:', { montoFinalBs, montoFinalUsd, montoFinalPagoMovil });
    console.log('   - Observaciones:', observacionesCierre);

    // Validación de roles
    const rolNormalizado = userRole?.toLowerCase();
    if (!['admin', 'supervisor'].includes(rolNormalizado)) {
      return sendError(res, 'No tienes permisos para cerrar caja', 403);
    }

    // Buscar caja abierta
    const cajaAbierta = await prisma.caja.findFirst({
      where: {
        estado: 'ABIERTA'
      }
    });

    if (!cajaAbierta) {
      return sendError(res, 'No hay caja abierta para cerrar', 400);
    }

    const horaCierre = new Date().toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // 🔧 LIMPIAR ESTADOS GLOBALES DE BLOQUEO ANTES DEL CIERRE
    if (global.estadoApp) {
      global.estadoApp.usuarios_bloqueados = false;
      global.estadoApp.motivo_bloqueo = '';
      global.estadoApp.usuario_cerrando = '';
      global.estadoApp.timestamp_bloqueo = null;
      global.estadoApp.diferencias_pendientes = null;
      console.log('🔧 Estados globales de bloqueo limpiados');
    }

    // Convertir montos a Decimal
    const dataUpdate = {
      estado: 'CERRADA',
      horaCierre: horaCierre,
      usuarioCierreId: userId,
      observacionesCierre: observacionesCierre,
      imagenCierre: imagenCierre
    };

    // Solo agregar montos si se proporcionaron
    if (montoFinalBs !== null && montoFinalBs !== undefined) {
      dataUpdate.montoFinalBs = toDecimal(montoFinalBs);
    }
    if (montoFinalUsd !== null && montoFinalUsd !== undefined) {
      dataUpdate.montoFinalUsd = toDecimal(montoFinalUsd);
    }
    if (montoFinalPagoMovil !== null && montoFinalPagoMovil !== undefined) {
      dataUpdate.montoFinalPagoMovil = toDecimal(montoFinalPagoMovil);
    }

    console.log('🔧 Datos a actualizar en BD:', dataUpdate);

    // Cerrar caja
    // Cerrar caja
    const cajaCerrada = await prisma.caja.update({
      where: { id: cajaAbierta.id },
      data: dataUpdate,
      include: {
        usuarioApertura: {
          select: { id: true, nombre: true, rol: true }
        },
        usuarioCierre: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    // 📄 PDF YA FUE GENERADO EN EL FRONTEND
    // El frontend llama a /generar-pdf-temporal ANTES de cerrar la caja
    // No generamos otro PDF aquí para evitar duplicados
    console.log('ℹ️ PDF ya generado en frontend mediante /generar-pdf-temporal');
    let pdfInfo = null;

    console.log('✅ Caja cerrada exitosamente:', cajaCerrada.id);
    console.log('🔧 Observaciones guardadas:', cajaCerrada.observacionesCierre);

    // Convertir para el frontend
    const cajaConvertida = {
      ...cajaCerrada,
      montoInicialBs: decimalToNumber(cajaCerrada.montoInicialBs),
      montoInicialUsd: decimalToNumber(cajaCerrada.montoInicialUsd),
      montoInicialPagoMovil: decimalToNumber(cajaCerrada.montoInicialPagoMovil),
      montoFinalBs: decimalToNumber(cajaCerrada.montoFinalBs),
      montoFinalUsd: decimalToNumber(cajaCerrada.montoFinalUsd),
      montoFinalPagoMovil: decimalToNumber(cajaCerrada.montoFinalPagoMovil),
      totalIngresosBs: decimalToNumber(cajaCerrada.totalIngresosBs),
      totalEgresosBs: decimalToNumber(cajaCerrada.totalEgresosBs),
      totalIngresosUsd: decimalToNumber(cajaCerrada.totalIngresosUsd),
      totalEgresosUsd: decimalToNumber(cajaCerrada.totalEgresosUsd),
      totalPagoMovil: decimalToNumber(cajaCerrada.totalPagoMovil)
    };

    // 🔧 NOTIFICAR DESBLOQUEO A TODOS LOS USUARIOS VIA SOCKET.IO
    if (req.io) {
      // Primero desbloquear
      req.io.emit('desbloquear_usuarios', {
        motivo: 'Caja cerrada exitosamente',
        timestamp: new Date().toISOString()
      });

       console.log('📡 Emitiendo evento caja_cerrada:', {
        caja_id: cajaConvertida.id,
        usuario: req.user?.email,
        timestamp: new Date().toISOString()
      });
      
      req.io.emit('caja_cerrada', {
        caja: cajaConvertida,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      
      console.log('📡 Notificaciones Socket.IO enviadas (desbloqueo + cierre)');
    }

    sendSuccess(res, {
      ...cajaConvertida,
      pdfGenerado: pdfInfo ? {
        nombreArchivo: pdfInfo.nombreArchivo,
        rutaPDF: pdfInfo.rutaPDF,
        size: pdfInfo.size,
        generadoEn: new Date().toISOString()
      } : null
    }, `Caja cerrada correctamente${pdfInfo ? ' - PDF generado automáticamente' : ''}`);

  } catch (error) {
    console.error('❌ Error cerrando caja:', error);
    
    // 🔧 LIMPIAR ESTADOS EN CASO DE ERROR TAMBIÉN
    if (global.estadoApp) {
      global.estadoApp.usuarios_bloqueados = false;
      global.estadoApp.motivo_bloqueo = '';
      global.estadoApp.usuario_cerrando = '';
      global.estadoApp.timestamp_bloqueo = null;
      global.estadoApp.diferencias_pendientes = null;
    }
    
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 📊 OBTENER HISTORIAL DE CAJAS
// ===================================
const obtenerHistorialCajas = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const cajas = await prisma.caja.findMany({
      include: {
        usuarioApertura: {
          select: { id: true, nombre: true, rol: true }
        },
        usuarioCierre: {
          select: { id: true, nombre: true, rol: true }
        },
        arqueos: true,
        _count: {
          select: { transacciones: true }
        }
      },
      orderBy: { fecha: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.caja.count();

    // Convertir Decimals a números
    const cajasConvertidas = cajas.map(caja => ({
      ...caja,
      montoInicialBs: decimalToNumber(caja.montoInicialBs),
      montoInicialUsd: decimalToNumber(caja.montoInicialUsd),
      montoInicialPagoMovil: decimalToNumber(caja.montoInicialPagoMovil),
      montoFinalBs: decimalToNumber(caja.montoFinalBs),
      montoFinalUsd: decimalToNumber(caja.montoFinalUsd),
      montoFinalPagoMovil: decimalToNumber(caja.montoFinalPagoMovil),
      totalIngresosBs: decimalToNumber(caja.totalIngresosBs),
      totalEgresosBs: decimalToNumber(caja.totalEgresosBs),
      totalIngresosUsd: decimalToNumber(caja.totalIngresosUsd),
      totalEgresosUsd: decimalToNumber(caja.totalEgresosUsd),
      totalPagoMovil: decimalToNumber(caja.totalPagoMovil)
    }));

    sendSuccess(res, {
      cajas: cajasConvertidas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🧮 REALIZAR ARQUEO CON BLOQUEO DE USUARIOS Y EVIDENCIAS
// ===================================
const realizarArqueo = async (req, res) => {
  try {
    const {
      conteos, // { efectivo_bs, efectivo_usd, pago_movil }
      diferencias, // { bs, usd, pagoMovil }
      observaciones = '',
      evidenciaFotografica = null,
      adminAutorizado = null,
      usuarioBloqueado = false
    } = req.body;

    const userId = req.user.userId;
    const userRole = req.user.rol;

    console.log('🧮 Iniciando arqueo crítico:', {
      usuario: req.user.email,
      conteos,
      diferencias,
      adminAutorizado
    });

    // 🔒 BLOQUEAR TODOS LOS USUARIOS DURANTE EL ARQUEO - OPTIMIZADO PARA SER INSTANTÁNEO
    if (req.io && !usuarioBloqueado) {
      global.estadoApp.usuarios_bloqueados = true;
      global.estadoApp.motivo_bloqueo = `Arqueo crítico en proceso por ${req.user.nombre || req.user.email}`;
      global.estadoApp.usuario_cerrando = req.user.nombre || req.user.email;
      global.estadoApp.timestamp_bloqueo = new Date().toISOString();

      // ⚡ EMITIR BROADCAST INMEDIATAMENTE (sin await, sin delays)
      const payloadBloqueo = {
        motivo: global.estadoApp.motivo_bloqueo,
        usuario_cerrando: global.estadoApp.usuario_cerrando,
        timestamp: global.estadoApp.timestamp_bloqueo,
        priority: 'high' // ⚡ Flag para indicar prioridad alta
      };

      // ⚡ USAR volatile() PARA MÁXIMA VELOCIDAD (sacrifica garantía de entrega por velocidad)
      req.io.volatile.emit('bloquear_usuarios', payloadBloqueo);

      console.log('🔒⚡ BLOQUEO INSTANTÁNEO emitido a todos los usuarios');
    }

    // Verificar que hay una caja abierta
    const cajaAbierta = await prisma.caja.findFirst({
      where: { estado: 'ABIERTA' },
      include: {
        transacciones: {
          include: { pagos: true }
        }
      }
    });

    if (!cajaAbierta) {
      // 🔓 Desbloquear en caso de error
      if (req.io) {
        global.estadoApp.usuarios_bloqueados = false;
        req.io.emit('desbloquear_usuarios', {
          motivo: 'Error: No hay caja abierta',
          timestamp: new Date().toISOString()
        });
      }
      return sendError(res, 'No hay una caja abierta para arquear', 400);
    }

    // 🧮 CALCULAR MONTOS ESPERADOS DEL SISTEMA
    const montosEsperados = {
      efectivo_bs: decimalToNumber(cajaAbierta.montoInicialBs) + decimalToNumber(cajaAbierta.totalIngresosBs) - decimalToNumber(cajaAbierta.totalEgresosBs),
      efectivo_usd: decimalToNumber(cajaAbierta.montoInicialUsd) + decimalToNumber(cajaAbierta.totalIngresosUsd) - decimalToNumber(cajaAbierta.totalEgresosUsd),
      pago_movil: decimalToNumber(cajaAbierta.montoInicialPagoMovil) + decimalToNumber(cajaAbierta.totalPagoMovil)
    };

    console.log('💰 Montos esperados calculados:', montosEsperados);

    // 🔍 VALIDAR DIFERENCIAS CRÍTICAS
    const hayDiferencias = diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0;

    if (hayDiferencias) {
      console.log('🚨 Diferencias detectadas:', diferencias);

      // Validar que hay autorización administrativa
      if (!adminAutorizado || !adminAutorizado.nombre) {
        // 🔒 BLOQUEO ESPECIAL POR DIFERENCIAS
        if (req.io) {
          global.estadoApp.diferencias_pendientes = diferencias;
          req.io.emit('bloquear_usuarios_diferencia', {
            mensaje: 'Diferencia crítica en arqueo - Requiere autorización administrativa',
            diferencias: diferencias,
            usuario_cerrando: req.user.nombre || req.user.email,
            timestamp: new Date().toISOString()
          });
        }
        return sendError(res, 'Diferencias detectadas. Se requiere autorización administrativa.', 400);
      }

      console.log('✅ Diferencias autorizadas por admin:', adminAutorizado.nombre);
    }

    // 🗄️ CREAR REGISTROS DE ARQUEO EN BASE DE DATOS
    const arqueoData = await prisma.$transaction(async (tx) => {
      // Crear registros por cada método de pago
      const arqueosCreados = [];

      // Arqueo Efectivo BS
      if (conteos.efectivo_bs !== undefined) {
        const arqueoBS = await tx.arqueo.create({
          data: {
            cajaId: cajaAbierta.id,
            metodoPago: 'EFECTIVO_BS',
            montoSistema: toDecimal(montosEsperados.efectivo_bs),
            montoContado: toDecimal(conteos.efectivo_bs),
            diferencia: toDecimal(diferencias.bs || 0),
            observaciones: observaciones
          }
        });
        arqueosCreados.push(arqueoBS);
      }

      // Arqueo Efectivo USD
      if (conteos.efectivo_usd !== undefined) {
        const arqueoUSD = await tx.arqueo.create({
          data: {
            cajaId: cajaAbierta.id,
            metodoPago: 'EFECTIVO_USD',
            montoSistema: toDecimal(montosEsperados.efectivo_usd),
            montoContado: toDecimal(conteos.efectivo_usd),
            diferencia: toDecimal(diferencias.usd || 0),
            observaciones: observaciones
          }
        });
        arqueosCreados.push(arqueoUSD);
      }

      // Arqueo Pago Móvil
      if (conteos.pago_movil !== undefined) {
        const arqueoPM = await tx.arqueo.create({
          data: {
            cajaId: cajaAbierta.id,
            metodoPago: 'PAGO_MOVIL',
            montoSistema: toDecimal(montosEsperados.pago_movil),
            montoContado: toDecimal(conteos.pago_movil),
            diferencia: toDecimal(diferencias.pagoMovil || 0),
            observaciones: observaciones
          }
        });
        arqueosCreados.push(arqueoPM);
      }

      // 📊 CREAR TRANSACCIONES DE AJUSTE SI HAY DIFERENCIAS
      if (hayDiferencias) {
        if (diferencias.bs !== 0) {
          await tx.transaccion.create({
            data: {
              cajaId: cajaAbierta.id,
              tipo: diferencias.bs > 0 ? 'INGRESO' : 'EGRESO',
              categoria: 'AJUSTE_ARQUEO',
              observaciones: `Ajuste por arqueo - Diferencia: ${diferencias.bs > 0 ? '+' : ''}${diferencias.bs} Bs - Autorizado por: ${adminAutorizado.nombre}`,
              totalBs: toDecimal(Math.abs(diferencias.bs)),
              totalUsd: toDecimal(0),
              tasaCambioUsada: null,
              fechaHora: new Date()
            }
          });
        }

        if (diferencias.usd !== 0) {
          await tx.transaccion.create({
            data: {
              cajaId: cajaAbierta.id,
              tipo: diferencias.usd > 0 ? 'INGRESO' : 'EGRESO',
              categoria: 'AJUSTE_ARQUEO',
              observaciones: `Ajuste por arqueo - Diferencia: ${diferencias.usd > 0 ? '+' : ''}$${diferencias.usd} - Autorizado por: ${adminAutorizado.nombre}`,
              totalBs: toDecimal(0),
              totalUsd: toDecimal(Math.abs(diferencias.usd)),
              tasaCambioUsada: null,
              fechaHora: new Date()
            }
          });
        }

        if (diferencias.pagoMovil !== 0) {
          await tx.transaccion.create({
            data: {
              cajaId: cajaAbierta.id,
              tipo: diferencias.pagoMovil > 0 ? 'INGRESO' : 'EGRESO',
              categoria: 'AJUSTE_PAGO_MOVIL',
              observaciones: `Ajuste Pago Móvil por arqueo - Diferencia: ${diferencias.pagoMovil > 0 ? '+' : ''}${diferencias.pagoMovil} Bs - Autorizado por: ${adminAutorizado.nombre}`,
              totalBs: toDecimal(Math.abs(diferencias.pagoMovil)),
              totalUsd: toDecimal(0),
              tasaCambioUsada: null,
              fechaHora: new Date()
            }
          });
        }

        // 📊 ACTUALIZAR TOTALES DE LA CAJA
        const updateData = {};
        
        if (diferencias.bs !== 0) {
          if (diferencias.bs > 0) {
            updateData.totalIngresosBs = { increment: toDecimal(diferencias.bs) };
          } else {
            updateData.totalEgresosBs = { increment: toDecimal(Math.abs(diferencias.bs)) };
          }
        }

        if (diferencias.usd !== 0) {
          if (diferencias.usd > 0) {
            updateData.totalIngresosUsd = { increment: toDecimal(diferencias.usd) };
          } else {
            updateData.totalEgresosUsd = { increment: toDecimal(Math.abs(diferencias.usd)) };
          }
        }

        if (diferencias.pagoMovil !== 0) {
          updateData.totalPagoMovil = { increment: toDecimal(diferencias.pagoMovil) };
        }

        if (Object.keys(updateData).length > 0) {
          await tx.caja.update({
            where: { id: cajaAbierta.id },
            data: updateData
          });
        }
      }

      return arqueosCreados;
    });

    console.log('✅ Arqueo completado exitosamente');

    // 🔓 DESBLOQUEAR TODOS LOS USUARIOS
    if (req.io) {
      global.estadoApp.usuarios_bloqueados = false;
      global.estadoApp.motivo_bloqueo = '';
      global.estadoApp.usuario_cerrando = '';
      global.estadoApp.timestamp_bloqueo = null;
      global.estadoApp.diferencias_pendientes = null;

      req.io.emit('desbloquear_usuarios', {
        motivo: 'Arqueo completado exitosamente',
        timestamp: new Date().toISOString()
      });

      // 📡 NOTIFICAR ARQUEO COMPLETADO
      req.io.emit('arqueo_completado', {
        usuario: req.user.nombre || req.user.email,
        diferencias: hayDiferencias ? diferencias : null,
        adminAutorizado: adminAutorizado,
        timestamp: new Date().toISOString()
      });

      console.log('📡 Usuarios desbloqueados y notificados');
      }

    // Convertir para el frontend
    const arqueosConvertidos = arqueoData.map(arqueo => ({
      ...arqueo,
      montoSistema: decimalToNumber(arqueo.montoSistema),
      montoContado: decimalToNumber(arqueo.montoContado),
      diferencia: decimalToNumber(arqueo.diferencia)
    }));

    sendSuccess(res, {
      arqueos: arqueosConvertidos,
      diferencias: diferencias,
      ajustesCreados: hayDiferencias,
      adminAutorizado: adminAutorizado
    }, 'Arqueo completado exitosamente');

  } catch (error) {
    console.error('❌ Error realizando arqueo:', error);

    // 🔓 ASEGURAR DESBLOQUEO EN CASO DE ERROR
    if (req.io && global.estadoApp) {
      global.estadoApp.usuarios_bloqueados = false;
      global.estadoApp.motivo_bloqueo = '';
      global.estadoApp.usuario_cerrando = '';
      global.estadoApp.timestamp_bloqueo = null;
      global.estadoApp.diferencias_pendientes = null;

      req.io.emit('desbloquear_usuarios', {
        motivo: 'Error en arqueo - Sistema desbloqueado',
        timestamp: new Date().toISOString()
      });
    }

    sendError(res, 'Error interno del servidor durante el arqueo');
  }
};

// ===================================
// 📸 SUBIR EVIDENCIA FOTOGRÁFICA
// ===================================
const subirEvidenciaFotografica = async (req, res) => {
  try {
    const {
      caja_id,
      evento, // 'apertura', 'cierre', 'arqueo'
      imagen_base64,
      usuario_id,
      diferencias = null,
      ceo_autorizado = false,
      observaciones = ''
    } = req.body;

    console.log('📸 Subiendo evidencia fotográfica:', {
      caja_id,
      evento,
      usuario_id,
      tiene_imagen: !!imagen_base64,
      ceo_autorizado
    });

    // Validaciones básicas
    if (!caja_id || !evento || !imagen_base64) {
      return sendError(res, 'Faltan datos obligatorios (caja_id, evento, imagen_base64)', 400);
    }

    if (!['apertura', 'cierre', 'arqueo'].includes(evento)) {
      return sendError(res, 'Evento debe ser: apertura, cierre o arqueo', 400);
    }

    // Verificar que la caja existe
    const cajaExistente = await prisma.caja.findUnique({
      where: { id: parseInt(caja_id) }
    });

    if (!cajaExistente) {
      return sendError(res, 'Caja no encontrada', 404);
    }

    // 🔧 PROCESAR IMAGEN BASE64
    let rutaImagen = null;
    let nombreArchivo = null;

    if (imagen_base64) {
      try {
        // Extraer tipo de imagen del base64
        const matches = imagen_base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          return sendError(res, 'Formato de imagen base64 inválido', 400);
        }

        const tipoImagen = matches[1]; // jpeg, png, webp
        const datosImagen = matches[2];

        // Validar tipo de imagen
        if (!['jpeg', 'jpg', 'png', 'webp'].includes(tipoImagen.toLowerCase())) {
          return sendError(res, 'Tipo de imagen no soportado. Use: jpeg, png, webp', 400);
        }

        // Generar nombre único
        const timestamp = Date.now();
        const fechaHoy = new Date().toISOString().split('T')[0];
        nombreArchivo = `evidencia_${evento}_${caja_id}_${timestamp}.${tipoImagen}`;
        
        // Crear directorio si no existe
        const fs = require('fs');
        const path = require('path');
        const directorioEvidencias = path.join(__dirname, '../../uploads/evidencias', fechaHoy);
        
        if (!fs.existsSync(directorioEvidencias)) {
          fs.mkdirSync(directorioEvidencias, { recursive: true });
        }

        rutaImagen = path.join(directorioEvidencias, nombreArchivo);

        // Guardar imagen
        const buffer = Buffer.from(datosImagen, 'base64');
        fs.writeFileSync(rutaImagen, buffer);

        // Ruta relativa para la base de datos
        rutaImagen = `evidencias/${fechaHoy}/${nombreArchivo}`;

        console.log('✅ Imagen guardada:', rutaImagen);

      } catch (error) {
        console.error('❌ Error procesando imagen:', error);
        return sendError(res, 'Error procesando la imagen', 500);
      }
    }

    // 🗄️ ACTUALIZAR LA CAJA CON LA EVIDENCIA
    const campoImagen = evento === 'apertura' ? 'imagenApertura' : 'imagenCierre';
    const updateData = {};
    
    if (rutaImagen) {
      updateData[campoImagen] = rutaImagen;
    }

    // Para arqueos, agregamos observaciones especiales
    if (evento === 'arqueo') {
      const observacionesEvidencia = [
        observaciones,
        `EVIDENCIA FOTOGRÁFICA: Capturada automáticamente`,
        diferencias ? `DIFERENCIAS: ${JSON.stringify(diferencias)}` : null,
        ceo_autorizado ? `AUTORIZACIÓN CEO: Aprobada` : null,
        `TIMESTAMP: ${new Date().toISOString()}`
      ].filter(Boolean).join(' | ');

      updateData.observacionesCierre = observacionesEvidencia;
    }

    const cajaActualizada = await prisma.caja.update({
      where: { id: parseInt(caja_id) },
      data: updateData
    });

    // 📊 CREAR REGISTRO DE AUDITORÍA (OPCIONAL - TABLA FUTURA)
    const registroAuditoria = {
      caja_id: parseInt(caja_id),
      evento: evento,
      ruta_imagen: rutaImagen,
      usuario_id: usuario_id || req.user?.userId,
      diferencias_detectadas: diferencias,
      ceo_autorizado: ceo_autorizado,
      timestamp: new Date().toISOString(),
      ip_cliente: req.ip || 'desconocida',
      user_agent: req.get('User-Agent') || 'desconocido'
    };

    console.log('📋 Registro de auditoría creado:', registroAuditoria);

    // 📡 NOTIFICAR VIA SOCKET.IO
    if (req.io) {
      req.io.emit('evidencia_fotografica_subida', {
        caja_id: parseInt(caja_id),
        evento: evento,
        usuario: req.user?.nombre || req.user?.email,
        ruta_imagen: rutaImagen,
        diferencias: diferencias,
        ceo_autorizado: ceo_autorizado,
        timestamp: new Date().toISOString()
      });

      console.log('📡 Notificación Socket.IO enviada - evidencia subida');
    }

    // 🔧 RESPUESTA SEGÚN EL TIPO DE EVENTO
    let mensaje = '';
    switch (evento) {
      case 'apertura':
        mensaje = 'Evidencia de apertura de caja guardada correctamente';
        break;
      case 'cierre':
        mensaje = 'Evidencia de cierre de caja guardada correctamente';
        break;
      case 'arqueo':
        mensaje = 'Evidencia de arqueo guardada correctamente';
        break;
    }

    sendSuccess(res, {
      caja_id: parseInt(caja_id),
      evento: evento,
      ruta_imagen: rutaImagen,
      nombre_archivo: nombreArchivo,
      diferencias: diferencias,
      ceo_autorizado: ceo_autorizado,
      timestamp: new Date().toISOString(),
      registro_auditoria: registroAuditoria
    }, mensaje);

  } catch (error) {
    console.error('❌ Error subiendo evidencia fotográfica:', error);
    sendError(res, 'Error interno del servidor al subir evidencia');
  }
};

// ===================================
// 🔐 VALIDAR AUTORIZACIÓN CEO
// ===================================
const validarAutorizacionCEO = async (req, res) => {
  try {
    const {
      clave_ceo,
      diferencias,
      accion = 'cerrar_caja', // 'cerrar_caja', 'arqueo', 'diferencia_critica'
      caja_id,
      detalles_adicionales = {}
    } = req.body;

    console.log('🔐 Validando autorización CEO:', {
      accion,
      caja_id,
      tiene_diferencias: !!diferencias,
      usuario_solicitante: req.user?.email
    });

    // ⚠️ CLAVE HARDCODEADA - EN PRODUCCIÓN USAR HASH
    const CLAVE_CEO_CORRECTA = '1234'; // TODO: Usar bcrypt en producción

    if (!clave_ceo) {
      return sendError(res, 'Clave CEO requerida', 400);
    }

    // Validar clave
    if (clave_ceo !== CLAVE_CEO_CORRECTA) {
      // 📊 LOG DE INTENTO FALLIDO
      console.log('❌ Intento fallido de autorización CEO:', {
        usuario: req.user?.email,
        clave_intentada: clave_ceo,
        accion: accion,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });

      return sendError(res, 'Clave CEO incorrecta', 401);
    }

    // ✅ AUTORIZACIÓN EXITOSA
    console.log('✅ Autorización CEO exitosa:', {
      usuario: req.user?.email,
      accion: accion,
      timestamp: new Date().toISOString()
    });

    // 🗄️ REGISTRAR AUTORIZACIÓN EN ESTADO GLOBAL (TEMPORAL)
    if (global.estadoApp) {
      global.estadoApp.ultima_autorizacion_ceo = {
        usuario_solicitante: req.user?.email,
        accion: accion,
        diferencias: diferencias,
        timestamp: new Date().toISOString(),
        autorizado: true
      };
    }

    // 📡 NOTIFICAR AUTORIZACIÓN VIA SOCKET.IO
    if (req.io) {
      req.io.emit('autorizacion_ceo_exitosa', {
        accion: accion,
        diferencias: diferencias,
        usuario_solicitante: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString(),
        detalles: detalles_adicionales
      });

      console.log('📡 Notificación de autorización CEO enviada');
    }

    // 🔧 RESPUESTA SEGÚN LA ACCIÓN
    let mensaje = '';
    switch (accion) {
      case 'cerrar_caja':
        mensaje = 'Autorización CEO concedida para cierre de caja con diferencias';
        break;
      case 'arqueo':
        mensaje = 'Autorización CEO concedida para arqueo con diferencias críticas';
        break;
      case 'diferencia_critica':
        mensaje = 'Autorización CEO concedida para diferencia crítica';
        break;
      default:
        mensaje = 'Autorización CEO concedida';
    }

    sendSuccess(res, {
      autorizado: true,
      accion: accion,
      diferencias: diferencias,
      ceo_info: {
        nombre: 'Andrés Morandín',
        cargo: 'CEO'
      },
      timestamp_autorizacion: new Date().toISOString(),
      usuario_solicitante: req.user?.nombre || req.user?.email,
      detalles_adicionales: detalles_adicionales
    }, mensaje);

  } catch (error) {
    console.error('❌ Error validando autorización CEO:', error);
    sendError(res, 'Error interno del servidor durante autorización');
  }
};

// ===================================
// 💰 CREAR TRANSACCIÓN COMPLETA
// ===================================
const crearTransaccion = async (req, res) => {
  try {
    const {
      tipo, // 'INGRESO' o 'EGRESO'
      categoria,
      observaciones = '',
      totalBs = 0,
      totalUsd = 0,
      tasaCambioUsada,
      pagos = [],
      cliente = null,
      items = [], // Para futuras ventas con productos
      descuento = 0,
      numeroFactura = null
    } = req.body;

    console.log('💰 Creando transacción completa:', { 
      tipo, 
      categoria, 
      totalBs, 
      totalUsd,
      pagos: pagos.length,
      cliente: cliente?.nombre 
    });

    // Validaciones
    if (!['INGRESO', 'EGRESO'].includes(tipo)) {
      return sendError(res, 'Tipo de transacción inválido', 400);
    }

    if (!categoria || categoria.trim() === '') {
      return sendError(res, 'La categoría es obligatoria', 400);
    }

    const totalBsDecimal = toDecimal(totalBs);
    const totalUsdDecimal = toDecimal(totalUsd);
    const descuentoDecimal = toDecimal(descuento);

    if (totalBsDecimal.lt(0) || totalUsdDecimal.lt(0)) {
      return sendError(res, 'Los totales no pueden ser negativos', 400);
    }

    if (!pagos || pagos.length === 0) {
      return sendError(res, 'Debe incluir al menos un método de pago', 400);
    }

    // Verificar que hay una caja abierta
    const cajaAbierta = await prisma.caja.findFirst({
      where: { estado: 'ABIERTA' }
    });

    if (!cajaAbierta) {
      return sendError(res, 'No hay una caja abierta', 400);
    }

    // Validar pagos
    let sumaTotalPagos = new Decimal(0);
    for (const pago of pagos) {
      if (!pago.metodo || !pago.monto || !pago.moneda) {
        return sendError(res, 'Todos los pagos deben tener método, monto y moneda', 400);
      }
      const montoPago = toDecimal(pago.monto);
      if (montoPago.lte(0)) {
        return sendError(res, 'Todos los montos deben ser mayores a 0', 400);
      }
      
      // Convertir a Bs para validación total
      if (pago.moneda === 'usd' && tasaCambioUsada) {
        sumaTotalPagos = sumaTotalPagos.add(montoPago.mul(toDecimal(tasaCambioUsada)));
      } else {
        sumaTotalPagos = sumaTotalPagos.add(montoPago);
      }
    }

    // Validar que la suma de pagos coincida con el total
    const totalEsperado = totalBsDecimal.add(totalUsdDecimal.mul(tasaCambioUsada ? toDecimal(tasaCambioUsada) : new Decimal(1)));
    const diferenciaPagos = sumaTotalPagos.sub(totalEsperado).abs();
    
    if (diferenciaPagos.gt(new Decimal(0.01))) { // Tolerancia de 1 centavo
      console.log('⚠️ Diferencia en pagos:', {
        suma_pagos: sumaTotalPagos.toNumber(),
        total_esperado: totalEsperado.toNumber(),
        diferencia: diferenciaPagos.toNumber()
      });
    }

    // 🔄 CREAR TRANSACCIÓN EN TRANSACCIÓN DE BD
    const nuevaTransaccion = await prisma.$transaction(async (tx) => {
      // 🆕 GENERAR CÓDIGO ÚNICO DE TRANSACCIÓN
      const fecha = new Date();
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const año = fecha.getFullYear().toString().slice(-2);

      // Obtener consecutivo del día para transacciones de este tipo
      const inicioDelDia = new Date(fecha);
      inicioDelDia.setHours(0, 0, 0, 0);
      const finDelDia = new Date(fecha);
      finDelDia.setHours(23, 59, 59, 999);

      const transaccionesDelDia = await tx.transaccion.count({
        where: {
          fechaHora: {
            gte: inicioDelDia,
            lte: finDelDia
          },
          tipo: tipo
        }
      });

        const consecutivo = (transaccionesDelDia + 1);
        const prefijo = tipo === 'INGRESO' ? 'I' : 'E';
        const codigoTransaccion = `${prefijo}${dia}${mes}${año}${consecutivo.toString().padStart(3, '0')}`;

        // 1. Crear la transacción principal
        const transaccion = await tx.transaccion.create({
          data: {
            cajaId: cajaAbierta.id,
            usuarioId: req.user.userId,                    // ✅ AGREGAR usuarioId
            tipo: tipo,
            categoria: categoria.trim(),
            observaciones: observaciones.trim(),
            totalBs: totalBsDecimal,
            totalUsd: totalUsdDecimal,
            tasaCambioUsada: tasaCambioUsada ? toDecimal(tasaCambioUsada) : null,
            fechaHora: new Date(),
            // ✅ CAMPOS OBLIGATORIOS FALTANTES
            codigoVenta: codigoTransaccion,               // ✅ Código único generado
            consecutivoDelDia: consecutivo,               // ✅ Consecutivo del día
            clienteId: cliente?.id || null,
            clienteNombre: cliente?.nombre || null,
            metodoPagoPrincipal: pagos[0]?.metodo || null,
            descuentoTotal: descuentoDecimal,
            cantidadItems: items.length,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            requiereFactura: false,
            reciboGenerado: false,
            facturaGenerada: false
          }
        });

      // 2. Crear los pagos asociados
      const pagosCreados = await Promise.all(
        pagos.map(pago => 
          tx.pago.create({
            data: {
              transaccionId: transaccion.id,
              metodo: pago.metodo,
              monto: toDecimal(pago.monto),
              moneda: pago.moneda,
              banco: pago.banco || null,
              referencia: pago.referencia || null
            }
          })
        )
      );

      // 3. Crear items de transacción si existen
      let itemsCreados = [];
      if (items && items.length > 0) {
        itemsCreados = await Promise.all(
          items.map(item => 
            tx.transactionItem.create({
              data: {
                transaccionId: transaccion.id,
                productoId: item.productoId || null,
                descripcion: item.descripcion,
                codigoBarras: item.codigoBarras || '',
                cantidad: item.cantidad,
                precioUnitario: toDecimal(item.precioUnitario),
                precioCosto: toDecimal(item.precioCosto || 0),
                descuento: toDecimal(item.descuento || 0),
                subtotal: toDecimal(item.subtotal)
              }
            })
          )
        );
      }

      // 4. Actualizar totales de la caja
      const updateData = {};
      
      if (tipo === 'INGRESO') {
        updateData.totalIngresosBs = {
          increment: totalBsDecimal
        };
        updateData.totalIngresosUsd = {
          increment: totalUsdDecimal
        };
      } else {
        updateData.totalEgresosBs = {
          increment: totalBsDecimal
        };
        updateData.totalEgresosUsd = {
          increment: totalUsdDecimal
        };
      }

      // 5. Calcular total de pago móvil
      const totalPagoMovilDecimal = pagos
        .filter(pago => pago.metodo === 'pago_movil')
        .reduce((total, pago) => total.add(toDecimal(pago.monto)), new Decimal(0));

      if (totalPagoMovilDecimal.gt(0)) {
        updateData.totalPagoMovil = {
          increment: totalPagoMovilDecimal
        };
      }

      await tx.caja.update({
        where: { id: cajaAbierta.id },
        data: updateData
      });

      return { 
        transaccion, 
        pagos: pagosCreados, 
        items: itemsCreados 
      };
    });

    console.log('✅ Transacción completa creada exitosamente:', nuevaTransaccion.transaccion.id);

    // Convertir para el frontend
    const transaccionConvertida = {
      ...nuevaTransaccion.transaccion,
      totalBs: decimalToNumber(nuevaTransaccion.transaccion.totalBs),
      totalUsd: decimalToNumber(nuevaTransaccion.transaccion.totalUsd),
      tasaCambioUsada: decimalToNumber(nuevaTransaccion.transaccion.tasaCambioUsada),
      pagos: nuevaTransaccion.pagos.map(p => ({
        ...p,
        monto: decimalToNumber(p.monto)
      })),
      items: nuevaTransaccion.items.map(i => ({
        ...i,
        precioUnitario: decimalToNumber(i.precioUnitario),
        precioCosto: decimalToNumber(i.precioCosto),
        descuento: decimalToNumber(i.descuento),
        subtotal: decimalToNumber(i.subtotal)
      }))
    };

    // 📡 Notificar via Socket.IO
    if (req.io) {
      req.io.emit('nueva_transaccion', {
        transaccion: transaccionConvertida,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Notificación Socket.IO enviada - nueva transacción');
    }

    sendSuccess(res, transaccionConvertida, 'Transacción creada correctamente');

  } catch (error) {
    console.error('❌ Error creando transacción:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 📊 OBTENER TRANSACCIONES (PARA TRANSACTIONTABLE)
// ===================================
const obtenerTransacciones = async (req, res) => {
  try {
    
    const {
      cajaId,
      tipo, // 'INGRESO', 'EGRESO', 'TODOS'
      categoria,
      fechaInicio,
      fechaFin,
      metodoPago,
      page = 1,
      limit = 50,
      orderBy = 'fechaHora',
      orderDirection = 'desc'
    } = req.query;

    console.log('📊 Obteniendo transacciones:', {
      cajaId,
      tipo,
      categoria,
      page,
      limit
    });

    // Construir filtros
    const whereClause = {};

    // ✅ Filtrar transacciones eliminadas (soft-delete)
    whereClause.deletedAt = null;

    // Filtro por caja específica o caja actual
    if (cajaId) {
      whereClause.cajaId = parseInt(cajaId);
    } else {
      // Si no se especifica, usar caja actual (abierta o pendiente)
      const cajaActual = await prisma.caja.findFirst({
        where: { 
          estado: {
            in: ['ABIERTA', 'PENDIENTE_CIERRE_FISICO']
          }
        }
      });
      if (cajaActual) {
        whereClause.cajaId = cajaActual.id;
      }
    }

    // Filtro por tipo
    if (tipo && tipo !== 'TODOS') {
      whereClause.tipo = tipo;
    }

    // Filtro por categoría
    if (categoria) {
      whereClause.categoria = {
        contains: categoria,
        mode: 'insensitive'
      };
    }

    // Filtro por fechas
    if (fechaInicio || fechaFin) {
      whereClause.fechaHora = {};
      if (fechaInicio) {
        whereClause.fechaHora.gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        whereClause.fechaHora.lte = fechaFinDate;
      }
    }

    // Filtro por método de pago
    let havingMethodFilter = {};
    if (metodoPago) {
      havingMethodFilter = {
        pagos: {
          some: {
            metodo: metodoPago
          }
        }
      };
    }

    // Combinar filtros
    const finalWhereClause = { ...whereClause, ...havingMethodFilter };

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener transacciones
      const transacciones = await prisma.transaccion.findMany({
        where: finalWhereClause,
        include: {
          pagos: true,
          items: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true
            }
          },
          caja: {
            select: {
              id: true,
              fecha: true,
              estado: true
            }
          }
        },
        orderBy: {
          [orderBy]: orderDirection
        },
        skip: skip,
        take: parseInt(limit)
      });

      console.log('🔍🔍🔍 TRANSACCIONES OBTENIDAS:', transacciones.length);
    console.log('🔍🔍🔍 PRIMERA TRANSACCIÓN:', JSON.stringify(transacciones[0], null, 2));
    console.log('🔍🔍🔍 USUARIO DE PRIMERA TRANSACCIÓN:', transacciones[0]?.usuario);

    // Contar total para paginación
    const total = await prisma.transaccion.count({
      where: finalWhereClause
    });

    // 🔢 CALCULAR ESTADÍSTICAS ADICIONALES
    const estadisticas = await prisma.transaccion.aggregate({
      where: finalWhereClause,
      _sum: {
        totalBs: true,
        totalUsd: true
      },
      _count: {
        _all: true
      }
    });

    const estadisticasPorTipo = await prisma.transaccion.groupBy({
      by: ['tipo'],
      where: finalWhereClause,
      _sum: {
        totalBs: true,
        totalUsd: true
      },
      _count: {
        _all: true
      }
    });
    // Convertir Decimals a números para el frontend
const transaccionesConvertidas = transacciones.map(t => ({
  ...t,
  totalBs: decimalToNumber(t.totalBs),
  totalUsd: decimalToNumber(t.totalUsd),
  tasaCambioUsada: decimalToNumber(t.tasaCambioUsada),
  usuario: t.usuario?.nombre || 'Usuario desconocido',
  fechaHora: t.fechaHora, // Mantener el nombre original
  pagos: t.pagos.map(p => ({
    ...p,
    monto: decimalToNumber(p.monto)
  })),
  items: t.items?.map(i => ({
    ...i,
    precioUnitario: decimalToNumber(i.precioUnitario),
    precioCosto: decimalToNumber(i.precioCosto),
    descuento: decimalToNumber(i.descuento),
    subtotal: decimalToNumber(i.subtotal)
  })) || []
}));

    const estadisticasConvertidas = {
      total_transacciones: estadisticas._count._all,
      suma_total_bs: decimalToNumber(estadisticas._sum.totalBs),
      suma_total_usd: decimalToNumber(estadisticas._sum.totalUsd),
      por_tipo: estadisticasPorTipo.map(e => ({
        tipo: e.tipo,
        cantidad: e._count._all,
        suma_bs: decimalToNumber(e._sum.totalBs),
        suma_usd: decimalToNumber(e._sum.totalUsd)
      }))
    };

    console.log('✅ Transacciones obtenidas:', {
      total: transaccionesConvertidas.length,
      estadisticas: estadisticasConvertidas
    });

    sendSuccess(res, {
      transacciones: transaccionesConvertidas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filtros_aplicados: {
        cajaId: whereClause.cajaId,
        tipo,
        categoria,
        fechaInicio,
        fechaFin,
        metodoPago
      },
      estadisticas: estadisticasConvertidas
    });

  } catch (error) {
    console.error('❌ Error obteniendo transacciones:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🗑️ ELIMINAR TRANSACCIÓN
// ===================================
const eliminarTransaccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoEliminacion, adminToken } = req.body;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    console.log('🗑️ Eliminando transacción:', {
      id,
      motivoEliminacion,
      usuario: req.user?.email
    });

    // Solo admin puede eliminar
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId }
    });

    if (!usuario || usuario.rol !== 'admin') {
      return sendError(res, 'No tienes permisos para eliminar transacciones. Solo administradores pueden realizar esta acción', 403);
    }

    // ✅ Validar token de admin si se proporciona
    if (adminToken) {
      const adminTokenUser = await prisma.user.findFirst({
        where: {
          quickAccessToken: adminToken.toUpperCase().trim(),
          rol: 'admin',
          activo: true
        }
      });

      if (!adminTokenUser) {
        return sendError(res, 'Token de administrador inválido', 401);
      }
    }

    // Validar motivo de eliminación
    if (!motivoEliminacion || motivoEliminacion.trim().length < 10) {
      return sendError(res, 'Debe proporcionar un motivo de eliminación (mínimo 10 caracteres)', 400);
    }

    // Buscar la transacción
    const transaccion = await prisma.transaccion.findUnique({
      where: { id: parseInt(id) },
      include: {
        pagos: true,
        items: true,
        caja: true
      }
    });

    if (!transaccion) {
      return sendError(res, 'Transacción no encontrada', 404);
    }

    // Verificar si ya está eliminado (soft-delete)
    if (transaccion.deletedAt) {
      return sendError(res, 'Esta transacción ya ha sido eliminada', 400);
    }

    // Verificar que la caja esté abierta
    if (transaccion.caja.estado !== 'ABIERTA') {
      return sendError(res, 'No se pueden eliminar transacciones de cajas cerradas', 400);
    }

    // 🔄 SOFT-DELETE: Marcar como eliminado y revertir totales
    await prisma.$transaction(async (tx) => {
      // 1. Revertir totales de la caja
      const updateData = {};
      
      if (transaccion.tipo === 'INGRESO') {
        updateData.totalIngresosBs = {
          decrement: transaccion.totalBs
        };
        updateData.totalIngresosUsd = {
          decrement: transaccion.totalUsd
        };
      } else {
        updateData.totalEgresosBs = {
          decrement: transaccion.totalBs
        };
        updateData.totalEgresosUsd = {
          decrement: transaccion.totalUsd
        };
      }

      // Revertir pago móvil si aplica
      const totalPagoMovil = transaccion.pagos
        .filter(pago => pago.metodo === 'pago_movil')
        .reduce((total, pago) => total.add(pago.monto), new Decimal(0));

      if (totalPagoMovil.gt(0)) {
        updateData.totalPagoMovil = {
          decrement: totalPagoMovil
        };
      }

      await tx.caja.update({
        where: { id: transaccion.cajaId },
        data: updateData
      });

      // 2. ✅ Soft-delete: Marcar como eliminado en lugar de borrar físicamente
      await tx.transaccion.update({
        where: { id: parseInt(id) },
        data: {
          deletedAt: new Date(),
          motivoEliminacion: motivoEliminacion.trim(),
          eliminadoPorId: usuarioId
        }
      });
    });

    console.log(`✅ Transacción ${id} eliminada (soft-delete) por ${usuario.nombre}`);

    // 📡 Notificar via Socket.IO
    if (req.io) {
      req.io.emit('transaccion_eliminada', {
        transaccion_id: parseInt(id),
        tipo: transaccion.tipo,
        categoria: transaccion.categoria,
        total_bs: decimalToNumber(transaccion.totalBs),
        total_usd: decimalToNumber(transaccion.totalUsd),
        usuario_elimino: usuario.nombre || usuario.email,
        motivo: motivoEliminacion,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Notificación Socket.IO enviada - transacción eliminada');
    }

    sendSuccess(res, {
      transaccion_eliminada: {
        id: parseInt(id),
        tipo: transaccion.tipo,
        categoria: transaccion.categoria,
        total_bs: decimalToNumber(transaccion.totalBs),
        total_usd: decimalToNumber(transaccion.totalUsd)
      },
      motivo: motivoEliminacion,
      eliminada_por: usuario.nombre || usuario.email,
      timestamp: new Date().toISOString()
    }, 'Transacción eliminada exitosamente');

  } catch (error) {
    console.error('❌ Error eliminando transacción:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 📋 OBTENER CAJAS PENDIENTES DE CIERRE
// ===================================
const obtenerCajasPendientes = async (req, res) => {
  try {
    console.log('🔍 Obteniendo cajas pendientes de cierre físico...');

    const cajasPendientes = await prisma.caja.findMany({
      where: { estado: 'PENDIENTE_CIERRE_FISICO' },
      include: {
        usuarioApertura: {
          select: { id: true, nombre: true, rol: true }
        }
      },
      orderBy: { fechaAutoCierre: 'desc' }
    });

    // Convertir para el frontend
    const cajasPendientesConvertidas = cajasPendientes.map(caja => ({
      ...caja,
      montoInicialBs: decimalToNumber(caja.montoInicialBs),
      montoInicialUsd: decimalToNumber(caja.montoInicialUsd),
      montoInicialPagoMovil: decimalToNumber(caja.montoInicialPagoMovil),
      totalIngresosBs: decimalToNumber(caja.totalIngresosBs),
      totalEgresosBs: decimalToNumber(caja.totalEgresosBs),
      totalIngresosUsd: decimalToNumber(caja.totalIngresosUsd),
      totalEgresosUsd: decimalToNumber(caja.totalEgresosUsd),
      totalPagoMovil: decimalToNumber(caja.totalPagoMovil)
    }));

    console.log(`✅ Encontradas ${cajasPendientes.length} cajas pendientes`);

    sendSuccess(res, {
      cajas_pendientes: cajasPendientesConvertidas,
      total: cajasPendientes.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo cajas pendientes:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// ✅ RESOLVER CAJA PENDIENTE (COMPLETAR CIERRE)
// ===================================
const resolverCajaPendiente = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      montoFinalBs,
      montoFinalUsd,
      montoFinalPagoMovil,
      observacionesCierre = '',
      imagenCierre = null
    } = req.body;

    const userId = req.user.userId;
    const userRole = req.user.rol;

    console.log('✅ Resolviendo caja pendiente:', {
      cajaId: id,
      usuario: req.user.email,
      montos: { montoFinalBs, montoFinalUsd, montoFinalPagoMovil }
    });

    // Buscar caja pendiente
    const cajaPendiente = await prisma.caja.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuarioApertura: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (!cajaPendiente) {
      return sendError(res, 'Caja pendiente no encontrada', 404);
    }

    if (cajaPendiente.estado !== 'PENDIENTE_CIERRE_FISICO') {
      return sendError(res, 'Esta caja no está pendiente de cierre físico', 400);
    }

    // Verificar permisos: solo responsable o admin
    const esResponsable = userId === cajaPendiente.usuarioAperturaId;
    const esAdmin = userRole?.toLowerCase() === 'admin';

    if (!esResponsable && !esAdmin) {
      return sendError(res, 'Solo el responsable o un administrador pueden resolver esta caja', 403);
    }

    const horaCierre = new Date().toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Completar el cierre
    const cajaResuelta = await prisma.caja.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'CERRADA',
        horaCierre: horaCierre,
        usuarioCierreId: userId,
        montoFinalBs: montoFinalBs ? toDecimal(montoFinalBs) : null,
        montoFinalUsd: montoFinalUsd ? toDecimal(montoFinalUsd) : null,
        montoFinalPagoMovil: montoFinalPagoMovil ? toDecimal(montoFinalPagoMovil) : null,
        observacionesCierre: `${observacionesCierre}\n\nCIERRE FÍSICO COMPLETADO - Auto-cierre resuelto por: ${req.user.nombre || req.user.email} - ${new Date().toISOString()}`,
        imagenCierre: imagenCierre
      },
      include: {
        usuarioApertura: {
          select: { id: true, nombre: true, rol: true }
        },
        usuarioCierre: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    console.log('✅ Caja pendiente resuelta exitosamente:', id);

    // Convertir para el frontend
    const cajaConvertida = {
      ...cajaResuelta,
      montoInicialBs: decimalToNumber(cajaResuelta.montoInicialBs),
      montoInicialUsd: decimalToNumber(cajaResuelta.montoInicialUsd),
      montoInicialPagoMovil: decimalToNumber(cajaResuelta.montoInicialPagoMovil),
      montoFinalBs: decimalToNumber(cajaResuelta.montoFinalBs),
      montoFinalUsd: decimalToNumber(cajaResuelta.montoFinalUsd),
      montoFinalPagoMovil: decimalToNumber(cajaResuelta.montoFinalPagoMovil),
      totalIngresosBs: decimalToNumber(cajaResuelta.totalIngresosBs),
      totalEgresosBs: decimalToNumber(cajaResuelta.totalEgresosBs),
      totalIngresosUsd: decimalToNumber(cajaResuelta.totalIngresosUsd),
      totalEgresosUsd: decimalToNumber(cajaResuelta.totalEgresosUsd),
      totalPagoMovil: decimalToNumber(cajaResuelta.totalPagoMovil)
    };

    // 📡 NOTIFICAR RESOLUCIÓN VIA SOCKET.IO
    if (req.io) {
      req.io.emit('caja_pendiente_resuelta', {
        caja: cajaConvertida,
        resuelto_por: req.user?.nombre || req.user?.email,
        era_responsable: esResponsable,
        timestamp: new Date().toISOString()
      });

      // Desbloquear sistema
      req.io.emit('sistema_desbloqueado', {
        motivo: 'Caja pendiente resuelta exitosamente',
        timestamp: new Date().toISOString()
      });

      console.log('📡 Notificaciones enviadas - Sistema desbloqueado');
    }

    sendSuccess(res, cajaConvertida, 'Caja pendiente resuelta correctamente');

  } catch (error) {
    console.error('❌ Error resolviendo caja pendiente:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🕚 FORZAR AUTO-CIERRE (SOLO ADMIN)
// ===================================
const forzarAutoCierre = async (req, res) => {
  try {
    const userRole = req.user.rol;

    // Solo admin puede forzar auto-cierre
    if (userRole?.toLowerCase() !== 'admin') {
      return sendError(res, 'Solo administradores pueden forzar auto-cierre', 403);
    }

    console.log('🕚 Forzando auto-cierre por admin:', req.user.email);

    const AutoCierreService = require('../services/autoCierreService');
    const resultado = await AutoCierreService.ejecutarAutoCierre();

    if (resultado.success) {
      sendSuccess(res, resultado, 'Auto-cierre forzado ejecutado correctamente');
    } else {
      sendError(res, resultado.error || 'Error en auto-cierre forzado');
    }

  } catch (error) {
    console.error('❌ Error forzando auto-cierre:', error);
    sendError(res, 'Error interno del servidor');
  }
};


// 🧾 OBTENER DETALLE COMPLETO DE UNA TRANSACCIÓN
const obtenerDetalleTransaccion = async (req, res) => {
  try {
    const { id } = req.params;

    const transaccion = await prisma.transaccion.findUnique({
      where: { id: parseInt(id) },
      include: {
        // 📦 PRODUCTOS VENDIDOS
        items: {
          include: {
            producto: {
              select: {
                id: true,
                descripcion: true,
                codigoBarras: true,
                categoria: true,
                tipo: true,
                imagenThumbnail: true
              }
            }
          }
        },
        // 💳 MÉTODOS DE PAGO
        pagos: true,
        // 👤 CLIENTE
        cliente: {
          select: {
            id: true,
            nombre: true,
            cedula_rif: true,
            telefono: true,
            email: true,
            direccion: true
          }
        },
        // 👨‍💼 USUARIO QUE HIZO LA VENTA
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        }
      }
    });

    if (!transaccion) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    res.json({
      success: true,
      data: transaccion
    });

  } catch (error) {
    console.error('Error obteniendo detalle de transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ===================================
// 📄 GENERAR PDF TEMPORAL CON DIFERENCIAS (SIN CERRAR CAJA)
// ===================================
const generarPDFTemporal = async (req, res) => {
  try {
    const {
      usuario,
      caja,
      montosFinales,
      diferencias,
      ceoAutorizado,
      observaciones,
      fechaGeneracion
    } = req.body;

    console.log('📄 Generando PDF temporal de cierre con diferencias:', {
      usuario: usuario?.nombre,
      montosFinales,
      diferencias,
      ceoAutorizado,
      hayDiferencias: diferencias && (diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0)
    });

    // Verificar que hay una caja abierta
    const cajaActual = await prisma.caja.findFirst({
      where: { 
        estado: {
          in: ['ABIERTA', 'PENDIENTE_CIERRE_FISICO']
        }
      }
    });

    if (!cajaActual) {
      return sendError(res, 'No hay una caja abierta', 400);
    }

    // Obtener transacciones completas para el PDF
    const transaccionesCompletas = await prisma.transaccion.findMany({
      where: { cajaId: cajaActual.id },
      include: {
        pagos: true,
        items: {
          include: {
            producto: {
              select: {
                descripcion: true,
                tipo: true,
                categoria: true
              }
            }
          }
        },
        usuario: {
          select: {
            nombre: true,
            rol: true
          }
        }
      },
      orderBy: { fechaHora: 'asc' }
    });

    // Preparar datos completos para el PDF CON DIFERENCIAS
    const datosCompletos = {
      caja: {
        ...cajaActual,
        fecha: cajaActual.fecha ? new Date(cajaActual.fecha).toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE'),
        horaApertura: cajaActual.horaApertura || '08:00',
        horaCierre: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        
        // 🔥 USAR MONTOS DESDE EL FRONTEND
        montoInicialBs: decimalToNumber(cajaActual.montoInicialBs),
        montoInicialUsd: decimalToNumber(cajaActual.montoInicialUsd),
        montoInicialPagoMovil: decimalToNumber(cajaActual.montoInicialPagoMovil),
        totalIngresosBs: decimalToNumber(cajaActual.totalIngresosBs),
        totalEgresosBs: decimalToNumber(cajaActual.totalEgresosBs),
        totalIngresosUsd: decimalToNumber(cajaActual.totalIngresosUsd),
        totalEgresosUsd: decimalToNumber(cajaActual.totalEgresosUsd),
        totalPagoMovil: decimalToNumber(cajaActual.totalPagoMovil),
        
        // Montos finales del conteo
        montoFinalBs: montosFinales?.bs || 0,
        montoFinalUsd: montosFinales?.usd || 0,
        montoFinalPagoMovil: montosFinales?.pagoMovil || 0
      },
      transacciones: transaccionesCompletas.map(t => ({
        ...t,
        totalBs: decimalToNumber(t.totalBs),
        totalUsd: decimalToNumber(t.totalUsd),
        tasaCambioUsada: decimalToNumber(t.tasaCambioUsada),
        usuario: t.usuario?.nombre || 'Sistema',
        fechaHora: t.fechaHora
      })),
      usuario: {
        nombre: usuario?.nombre || req.user?.nombre || 'Usuario',
        rol: usuario?.rol || req.user?.rol || 'cajero',
        sucursal: usuario?.sucursal || req.user?.sucursal || 'Principal'
      },
      
      // 🔥 DATOS DE DIFERENCIAS Y AUTORIZACIÓN
      diferencias: diferencias || null,
      montosFinales: montosFinales || null,
      ceoAutorizado: ceoAutorizado || false,
      observaciones: observaciones || 'PDF generado antes del cierre oficial.',
      evidenciaFotografica: false, // No hay evidencia en PDF temporal
      fechaGeneracion: fechaGeneracion || new Date().toISOString()
    };

    console.log('🔍 Datos preparados para PDF:', {
      incluyeDiferencias: !!diferencias,
      ceoAutorizado,
      montosFinalesIncluidos: !!montosFinales,
      transaccionesCount: datosCompletos.transacciones.length
    });

    // Generar PDF
    const pdfInfo = await PDFCierreService.generarPDFCierre(datosCompletos);
    
    if (pdfInfo.success) {
      console.log('✅ PDF temporal generado con diferencias:', pdfInfo.nombreArchivo);
      
      // 💾 LEER ARCHIVO PDF Y CONVERTIR A BASE64
      let pdfBase64 = null;
      try {
        const fs = require('fs');
        const pdfBuffer = fs.readFileSync(pdfInfo.rutaPDF);
        pdfBase64 = pdfBuffer.toString('base64');
        console.log('✅ PDF convertido a base64 para descarga');
      } catch (error) {
        console.warn('⚠️ Error convirtiendo PDF a base64:', error);
      }
      
      sendSuccess(res, {
        nombreArchivo: pdfInfo.nombreArchivo,
        rutaPDF: pdfInfo.rutaPDF,
        pdfBase64: pdfBase64, // 🆕 AGREGAR BASE64 PARA DESCARGA
        size: pdfInfo.size,
        incluyeDiferencias: pdfInfo.incluyeDiferencias,
        diferenciasDetalle: pdfInfo.diferenciasDetalle,
        generadoEn: new Date().toISOString(),
        esTemporal: true
      }, 'PDF temporal generado correctamente con diferencias incluidas');
      
    } else {
      throw new Error('Error generando PDF temporal');
    }

  } catch (error) {
    console.error('❌ Error generando PDF temporal:', error);
    sendError(res, error.message || 'Error interno del servidor');
  }
};

module.exports = {
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
};