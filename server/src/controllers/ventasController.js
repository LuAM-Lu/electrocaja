// server/src/controllers/ventasController.js
const { PrismaClient, Decimal } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/responses');
const stockService = require('../services/stockService');

const prisma = new PrismaClient();

// 🔧 HELPER: Convertir Decimal a Number
const decimalToNumber = (decimal) => {
  return decimal ? parseFloat(decimal.toString()) : 0;
};

// 🔧 HELPER: Convertir Number a Decimal
const toDecimal = (value) => {
  return new Decimal(value || 0);
};


// 🔧 HELPER: Generar código de venta único - VERSIÓN CORTA
const generarCodigoVenta = async () => {
  let codigoGenerado;
  let intentos = 0;
  const maxIntentos = 5;
  
  while (intentos < maxIntentos) {
    const fecha = new Date();
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    
    // Obtener consecutivo del día
    const inicioDelDia = new Date(fecha);
    inicioDelDia.setHours(0, 0, 0, 0);
    const finDelDia = new Date(fecha);
    finDelDia.setHours(23, 59, 59, 999);
    
    const ventasDelDia = await prisma.transaccion.count({
      where: {
        fechaHora: {
          gte: inicioDelDia,
          lte: finDelDia
        },
        tipo: 'INGRESO'
      }
    });
    
    const consecutivo = (ventasDelDia + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 2).toUpperCase();
    
    // Formato: V22082544KL (V + día + mes + consecutivo + random)
    codigoGenerado = `V${dia}${mes}${consecutivo}${random}`;
    
    const existe = await prisma.transaccion.findUnique({
      where: { codigoVenta: codigoGenerado }
    });
    
    if (!existe) {
      return codigoGenerado;
    }
    
    intentos++;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  
  // Fallback más corto
  const fallback = `V${Date.now().toString().slice(-6)}`;
  return fallback;
};
// ===================================
// 🔒 RESERVAR STOCK CON BLOQUEO PESIMISTA
// ===================================
const reservarStock = async (req, res) => {
  const timestamp = new Date().toISOString();
  const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  console.log('🚨🚨🚨 BACKEND RESERVAR STOCK LLAMADA 🚨🚨🚨');
  console.log(`⏰ [${timestamp}] REQUEST ID: ${requestId}`);
  
  try {
    // 🆕 SOPORTAR TANTO PRODUCTO INDIVIDUAL COMO ARRAY
    const { productoId, cantidad, sesionId, items } = req.body;
    
    // Si viene array de items, procesar múltiples productos
    if (items && Array.isArray(items)) {
      return await reservarMultiplesProductos(req, res, items, sesionId, requestId);
    }
    
    // Si es producto individual, usar nuevo servicio
    const usuarioId = req.user.userId;

    console.log(`📋 [${requestId}] Parámetros:`, { productoId, cantidad, sesionId, usuarioId });
    console.log(`🌐 [${requestId}] Request info:`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substr(0, 50)
    });
    console.log(`🔒 [${requestId}] Iniciando reserva con bloqueo pesimista...`);

    // Validaciones
    if (!productoId || !cantidad || !sesionId) {
      return sendError(res, 'Faltan datos requeridos: productoId, cantidad, sesionId', 400);
    }

    if (cantidad <= 0) {
      return sendError(res, 'La cantidad debe ser mayor a 0', 400);
    }

    // 🔒 USAR NUEVO SERVICIO CON BLOQUEO PESIMISTA
    const resultado = await stockService.reservarStock(
      parseInt(productoId),
      cantidad,
      sesionId,
      usuarioId,
      req.ip || req.connection.remoteAddress
    );

    console.log(`✅ [${requestId}] Reserva exitosa:`, resultado);

    sendSuccess(res, resultado, 'Stock reservado correctamente');

    // 📡 EMITIR EVENTO WEBSOCKET PARA SINCRONIZACIÓN EN TIEMPO REAL
    if (req.io) {
      req.io.emit('stock_reservado', {
        productoId: parseInt(productoId),
        producto: resultado.producto,
        stockTotal: resultado.stockTotal,
        stockReservado: resultado.stockReservado,
        stockDisponible: resultado.stockDisponible,
        cantidadReservada: resultado.cantidadReservada,
        sesionId: sesionId,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Evento stock_reservado emitido via WebSocket');
    }

  } catch (error) {
    console.error('❌ Error reservando stock:', error);
    
    // Manejar errores específicos del servicio
    if (error.message.includes('Stock insuficiente')) {
      return sendError(res, error.message, 400);
    }
    
    if (error.message.includes('Producto no encontrado')) {
      return sendError(res, error.message, 404);
    }
    
    sendError(res, 'Error interno del servidor');
  }
};

// 🆕 FUNCIÓN OPTIMIZADA PARA MÚLTIPLES PRODUCTOS
const reservarMultiplesProductos = async (req, res, items, sesionId, requestId) => {
  const usuarioId = req.user.userId;
  
  console.log(`📦 [${requestId}] Reservando ${items.length} productos para sesión: ${sesionId}`);
  
  const resultados = [];
  const errores = [];
  
  try {
    
    // 🔒 TRANSACCIÓN ATÓMICA - TODO O NADA
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.cantidad <= 0) continue; // Skip items con cantidad 0
        
        const producto = await tx.product.findUnique({
          where: { id: item.productoId }
        });
        
        if (!producto) {
          errores.push({
            productoId: item.productoId,
            error: 'Producto no encontrado',
            descripcion: item.descripcion
          });
          continue;
        }
        
        // Servicios no necesitan reserva
        if (producto.tipo === 'SERVICIO') {
          resultados.push({
            productoId: item.productoId,
            producto: producto.descripcion,
            reservado: true,
            tipo: 'SERVICIO'
          });
          continue;
        }
        
        // 🔍 VERIFICAR STOCK DISPONIBLE
        const stockInfo = await verificarStockDisponible(tx, producto.id, item.cantidad, sesionId);
        
        if (!stockInfo.disponible) {
          errores.push({
            productoId: item.productoId,
            producto: producto.descripcion,
            error: 'Stock insuficiente',
            stockTotal: producto.stock,
            stockSolicitado: item.cantidad,
            stockDisponible: stockInfo.stockDisponible,
            reservadoPor: stockInfo.reservadoPor
          });
          continue;
        }
        
        // 🔒 CREAR/ACTUALIZAR RESERVA
        await crearOActualizarReserva(tx, producto.id, item.cantidad, sesionId, usuarioId, req.ip);
        
        resultados.push({
          productoId: item.productoId,
          producto: producto.descripcion,
          cantidadReservada: item.cantidad,
          reservado: true
        });
      }
      
      // Si hay errores, rechazar toda la transacción
      if (errores.length > 0) {
        throw new Error('STOCK_CONFLICTS');
      }
    });
    
    // ✅ TODO RESERVADO EXITOSAMENTE
    console.log(`✅ [${requestId}] ${resultados.length} productos reservados exitosamente`);
    
    sendSuccess(res, {
      reservadosExitosamente: resultados.length,
      detalles: resultados,
      sesionId: sesionId
    }, `${resultados.length} productos reservados correctamente`);
    
  } catch (error) {
    if (error.message === 'STOCK_CONFLICTS') {
      // 🚨 RESPUESTA CON CONFLICTOS DETALLADOS
      console.log(`❌ [${requestId}] Conflictos de stock:`, errores.length);
      
      return sendError(res, 'Stock reservado por otros usuarios', 409, {
        type: 'STOCK_RESERVADO',
        detalles: errores
      });
    }
    
    console.error(`❌ [${requestId}] Error en transacción múltiple:`, error);
    sendError(res, 'Error interno del servidor');
  }
};

// 🔍 FUNCIÓN HELPER: VERIFICAR STOCK DISPONIBLE
const verificarStockDisponible = async (tx, productoId, cantidadSolicitada, sesionId) => {
  const reservasActivas = await tx.stockMovement.findMany({
    where: {
      productoId: productoId,
      tipo: 'RESERVA',
      transaccionId: null
    },
    include: {
      usuario: {
        select: { nombre: true, email: true }
      }
    }
  });
  
  const producto = await tx.product.findUnique({
    where: { id: productoId }
  });
  
  // Separar reservas propias vs de otros
  const reservasPropias = reservasActivas.filter(r => 
    r.motivo && r.motivo.includes(sesionId)
  );
  const reservasDeOtros = reservasActivas.filter(r => 
    !r.motivo || !r.motivo.includes(sesionId)
  );
  
  const stockReservadoPropias = reservasPropias.reduce((sum, r) => sum + r.cantidad, 0);
  const stockReservadoOtros = reservasDeOtros.reduce((sum, r) => sum + r.cantidad, 0);
  const stockDisponible = producto.stock - stockReservadoOtros;
  
  return {
    disponible: stockDisponible >= cantidadSolicitada,
    stockDisponible,
    stockReservadoPropias,
    stockReservadoOtros,
    reservadoPor: reservasDeOtros.map(r => ({
      usuario: r.usuario.nombre,
      cantidad: r.cantidad,
      fecha: r.fecha
    }))
  };
};

// 🔒 FUNCIÓN HELPER: CREAR O ACTUALIZAR RESERVA
const crearOActualizarReserva = async (tx, productoId, cantidad, sesionId, usuarioId, ipAddress) => {
  const reservaExistente = await tx.stockMovement.findFirst({
    where: {
      productoId: productoId,
      tipo: 'RESERVA',
      motivo: `Sesión: ${sesionId}`,
      transaccionId: null
    }
  });
  
  if (reservaExistente) {
    // Actualizar reserva existente
    await tx.stockMovement.update({
      where: { id: reservaExistente.id },
      data: {
        cantidad: cantidad, // Reemplazar cantidad total (no acumular)
        fecha: new Date(),
        observaciones: `Reserva actualizada para venta completa - sesión ${sesionId}`
      }
    });
  } else {
    // Obtener stock actual del producto
        const producto = await tx.product.findUnique({
          where: { id: productoId }
        });

        await tx.stockMovement.create({
          data: {
            productoId: productoId,
            tipo: 'RESERVA',
            cantidad: cantidad,
            stockAnterior: producto.stock,
            stockNuevo: producto.stock, // Stock no cambia en reserva
            motivo: `Sesión: ${sesionId}`,
            observaciones: `Reserva para venta completa - sesión ${sesionId}`,
            usuarioId: usuarioId,
            ipAddress: ipAddress
          }
        });
  }
};

// ===================================
// 🔓 LIBERAR STOCK CON TRANSACCIÓN ATÓMICA
// ===================================
const liberarStock = async (req, res) => {
  const timestamp = new Date().toISOString();
  const requestId = `LIBERAR_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  console.log('🚨🚨🚨 BACKEND LIBERAR STOCK LLAMADA 🚨🚨🚨');
  console.log(`⏰ [${timestamp}] REQUEST ID: ${requestId}`);
  
  try {
    const { productoId, sesionId, cantidad = null } = req.body;
    const usuarioId = req.user.userId;

    console.log(`📋 [${requestId}] Parámetros:`, { productoId, sesionId, cantidad, usuarioId });

    // 🆕 LIBERACIÓN MASIVA POR SESIÓN (productoId = null)
    if (!productoId && sesionId) {
      return await liberarTodasLasReservasDeSesion(req, res, sesionId, requestId);
    }

    console.log(`🌐 [${requestId}] Request info:`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substr(0, 50)
    });
    console.log(`🔓 [${requestId}] Iniciando liberación con transacción atómica...`);

    // Validaciones
    if (!productoId || !sesionId) {
      return sendError(res, 'Faltan datos requeridos: productoId, sesionId', 400);
    }

    // 🔓 USAR NUEVO SERVICIO CON TRANSACCIÓN ATÓMICA
    const resultado = await stockService.liberarStock(
      parseInt(productoId),
      sesionId,
      cantidad,
      usuarioId,
      req.ip || req.connection.remoteAddress
    );

    console.log(`✅ [${requestId}] Liberación exitosa:`, resultado);

    sendSuccess(res, resultado, cantidad ? 'Stock liberado parcialmente' : 'Stock liberado correctamente');

    // 📡 EMITIR EVENTO WEBSOCKET PARA SINCRONIZACIÓN EN TIEMPO REAL
    if (req.io) {
      req.io.emit('stock_liberado', {
        productoId: parseInt(productoId),
        producto: resultado.producto,
        stockTotal: resultado.stockTotal,
        stockReservado: 0,
        stockDisponible: resultado.stockTotal,
        cantidadLiberada: resultado.cantidadLiberada,
        esLiberacionParcial: resultado.esLiberacionParcial,
        sesionId: sesionId,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log(`📡 Evento stock_liberado emitido via WebSocket - ${cantidad ? 'Parcial' : 'Total'}: ${resultado.cantidadLiberada}`);
    }

  } catch (error) {
    console.error('❌ Error liberando stock:', error);
    
    // Manejar errores específicos del servicio
    if (error.message.includes('No hay reservas activas')) {
      return sendSuccess(res, {
        liberado: true,
        mensaje: error.message
      });
    }
    
    sendError(res, 'Error interno del servidor');
  }
};

// 🆕 FUNCIÓN PARA LIBERAR TODAS LAS RESERVAS DE UNA SESIÓN
const liberarTodasLasReservasDeSesion = async (req, res, sesionId, requestId) => {
  const usuarioId = req.user.userId;
  
  console.log(`🧹 [${requestId}] Liberando todas las reservas de sesión: ${sesionId}`);
  
  try {
    // 🧹 USAR NUEVO SERVICIO PARA LIBERACIÓN MASIVA
    const resultado = await stockService.liberarTodasLasReservasDeSesion(
      sesionId,
      usuarioId,
      req.ip || req.connection.remoteAddress
    );
    
    console.log(`✅ [${requestId}] Liberación masiva completada:`, resultado);

    sendSuccess(res, resultado, `${resultado.reservasLiberadas} reservas liberadas correctamente`);

    // 📡 EMITIR EVENTOS WEBSOCKET PARA TODOS LOS USUARIOS
    if (req.io && resultado.detalles && resultado.detalles.length > 0) {
      // Evento individual por cada producto liberado
      for (const liberacion of resultado.detalles) {
        req.io.emit('stock_liberado', {
          productoNombre: liberacion.producto,
          cantidad: liberacion.cantidad,
          sesionId: sesionId,
          usuario: req.user?.nombre || req.user?.email,
          timestamp: new Date().toISOString()
        });
      }

      // Evento de actualización de inventario global
      req.io.emit('inventario_actualizado', {
        operacion: 'STOCK_LIBERADO',
        usuario: req.user?.nombre || req.user?.email,
        productosAfectados: resultado.reservasLiberadas,
        productos: resultado.detalles,
        timestamp: new Date().toISOString()
      });

      console.log(`📡 Eventos emitidos: ${resultado.reservasLiberadas} stock_liberado + inventario_actualizado`);
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error en liberación masiva:`, error);
    sendError(res, 'Error interno en liberación masiva');
  }
};

// ===================================
// 💾 GUARDAR VENTA EN ESPERA
// ===================================
const guardarVentaEnEspera = async (req, res) => {
  try {
    const {
      numeroVenta,
      clienteId,
      clienteNombre,
      items = [],
      subtotal,
      descuento = 0,
      total,
      tasaCambio,
      tipoEspera = 'INTENCIONAL',
      tiempoLimiteMin = 120,
      observaciones,
      sesionId
    } = req.body;

    const usuarioId = req.user.userId;

    console.log('💾 Guardando venta en espera:', {
      numeroVenta,
      clienteNombre,
      items: items.length,
      total,
      usuarioId
    });

    // Validaciones
    if (!numeroVenta || items.length === 0) {
      return sendError(res, 'Número de venta e items son requeridos', 400);
    }

    if (!total || total <= 0) {
      return sendError(res, 'El total debe ser mayor a 0', 400);
    }

    // Verificar que hay una caja abierta
    const cajaAbierta = await prisma.caja.findFirst({
      where: { estado: 'ABIERTA' }
    });

    if (!cajaAbierta) {
      return sendError(res, 'No hay una caja abierta', 400);
    }

    // Calcular fecha de expiración
    const fechaExpiracion = new Date();
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + tiempoLimiteMin);

    // Crear venta en espera con items
    const ventaEnEspera = await prisma.$transaction(async (tx) => {
      // Crear la venta en espera
      const venta = await tx.pendingSale.create({
        data: {
          numeroVenta,
          usuarioId,
          cajaId: cajaAbierta.id,
          clienteId: clienteId ? parseInt(clienteId) : null,
          clienteNombre: clienteNombre || null,
          subtotal: toDecimal(subtotal),
          descuento: toDecimal(descuento),
          total: toDecimal(total),
          tasaCambio: toDecimal(tasaCambio),
          tipoEspera,
          fechaExpiracion,
          tiempoLimiteMin,
          observaciones,
          cantidadItems: items.length
        }
      });

      // Crear los items de la venta en espera
      const itemsCreados = await Promise.all(
        items.map(item => 
          tx.pendingSaleItem.create({
            data: {
              ventaEsperaId: venta.id,
              productoId: item.productoId || null,
              descripcion: item.descripcion,
              codigoBarras: item.codigoBarras || item.codigo,
              cantidad: item.cantidad,
              precioUnitario: toDecimal(item.precioUnitario || item.precio_unitario),
              descuento: toDecimal(item.descuento || 0),
              subtotal: toDecimal(item.subtotal)
            }
          })
        )
      );

      // Registrar auditoría del carrito
      if (sesionId) {
        await Promise.all(
          items.map(item => 
            tx.carritoAuditoria.create({
              data: {
                sesionId,
                usuarioId,
                productoId: item.productoId,
                accion: 'GUARDAR_ESPERA',
                cantidadNueva: item.cantidad,
                precioUnitario: toDecimal(item.precioUnitario || item.precio_unitario),
                fechaHora: new Date(),
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                ventaEsperaId: venta.id
              }
            })
          )
        );
      }

      return { venta, items: itemsCreados };
    });

    console.log('✅ Venta en espera guardada exitosamente:', ventaEnEspera.venta.id);

    // Convertir para el frontend
    const ventaConvertida = {
      ...ventaEnEspera.venta,
      subtotal: decimalToNumber(ventaEnEspera.venta.subtotal),
      descuento: decimalToNumber(ventaEnEspera.venta.descuento),
      total: decimalToNumber(ventaEnEspera.venta.total),
      tasaCambio: decimalToNumber(ventaEnEspera.venta.tasaCambio),
      items: ventaEnEspera.items.map(item => ({
        ...item,
        precioUnitario: decimalToNumber(item.precioUnitario),
        descuento: decimalToNumber(item.descuento),
        subtotal: decimalToNumber(item.subtotal)
      }))
    };

    // 📡 Notificar via Socket.IO
    if (req.io) {
      req.io.emit('venta_guardada_espera', {
        venta: ventaConvertida,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Notificación Socket.IO enviada - venta guardada en espera');
    }

    sendSuccess(res, ventaConvertida, 'Venta guardada en espera correctamente');

  } catch (error) {
    console.error('❌ Error guardando venta en espera:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 📋 OBTENER VENTAS EN ESPERA
// ===================================
const obtenerVentasEnEspera = async (req, res) => {
  try {
    const { estado = 'ACTIVA', cajaId, usuarioId } = req.query;

    console.log('📋 Obteniendo ventas en espera:', { estado, cajaId, usuarioId });

    // Construir filtros
    const whereClause = {
      estado: estado
    };

    // Filtro por caja específica o caja actual
    if (cajaId) {
      whereClause.cajaId = parseInt(cajaId);
    } else {
      // Si no se especifica, usar caja actual
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

    // Filtro por usuario específico
    if (usuarioId) {
      whereClause.usuarioId = parseInt(usuarioId);
    }

    // Obtener ventas en espera
    const ventasEnEspera = await prisma.pendingSale.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                descripcion: true,
                stock: true,
                stockReservado: true,
                tipo: true
              }
            }
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
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
        fechaCreacion: 'desc'
      }
    });

    // Convertir para el frontend y calcular estados
    const ventasConvertidas = ventasEnEspera.map(venta => {
      const ahora = new Date();
      const tiempoRestante = Math.max(0, Math.floor((new Date(venta.fechaExpiracion) - ahora) / 1000 / 60)); // minutos
      const estaExpirada = ahora > new Date(venta.fechaExpiracion);
      
      return {
        ...venta,
        subtotal: decimalToNumber(venta.subtotal),
        descuento: decimalToNumber(venta.descuento),
        total: decimalToNumber(venta.total),
        tasaCambio: decimalToNumber(venta.tasaCambio),
        tiempoRestanteMin: tiempoRestante,
        estaExpirada: estaExpirada,
        items: venta.items.map(item => ({
          ...item,
          precioUnitario: decimalToNumber(item.precioUnitario),
          descuento: decimalToNumber(item.descuento),
          subtotal: decimalToNumber(item.subtotal),
          stockDisponible: item.producto ? 
           item.producto.stock : null // (item.producto.stock - item.producto.stockReservado) : null
        }))
      };
    });

    // Estadísticas
    const estadisticas = {
      total: ventasConvertidas.length,
      activas: ventasConvertidas.filter(v => !v.estaExpirada).length,
      expiradas: ventasConvertidas.filter(v => v.estaExpirada).length,
      montoTotal: ventasConvertidas.reduce((sum, v) => sum + v.total, 0),
      itemsTotal: ventasConvertidas.reduce((sum, v) => sum + v.cantidadItems, 0)
    };

    console.log('✅ Ventas en espera obtenidas:', {
      total: ventasConvertidas.length,
      activas: estadisticas.activas,
      expiradas: estadisticas.expiradas
    });

    sendSuccess(res, {
      ventas: ventasConvertidas,
      estadisticas: estadisticas,
      filtros_aplicados: {
        estado,
        cajaId: whereClause.cajaId,
        usuarioId
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo ventas en espera:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🚀 PROCESAR VENTA COMPLETA
// ===================================
const procesarVenta = async (req, res) => {
  try {
    console.log('🚀 ===== PROCESANDO VENTA - DATOS RECIBIDOS =====');
    console.log('📋 Body completo:', JSON.stringify(req.body, null, 2));
    console.log('👤 Usuario:', req.user?.userId, req.user?.nombre);
    console.log('=================================================');
    
    const {
      clienteId,
      clienteNombre,
      items = [],
      pagos = [],
      vueltos = [], // 🆕 AGREGAR VUELTOS
      descuentoTotal = 0,
      observaciones,
      tasaCambio,
      sesionId,
      tiempoServicio,
      opcionesProcesamiento = {}
    } = req.body;

    const usuarioId = req.user.userId;

    console.log('🚀 Procesando venta completa:', {
      clienteNombre,
      items: items.length,
      pagos: pagos.length,
      vueltos: vueltos.length, // 🆕 AGREGAR VUELTOS
      descuentoTotal,
      usuarioId
    });

    // Validaciones
    if (items.length === 0) {
      return sendError(res, 'No hay items en la venta', 400);
    }

    if (pagos.length === 0) {
      return sendError(res, 'Debe incluir al menos un método de pago', 400);
    }

    if (!tasaCambio || tasaCambio <= 0) {
      return sendError(res, 'Tasa de cambio inválida', 400);
    }

    // Verificar que hay una caja abierta
    const cajaAbierta = await prisma.caja.findFirst({
      where: { estado: 'ABIERTA' }
    });

    if (!cajaAbierta) {
      return sendError(res, 'No hay una caja abierta', 400);
    }

    // Calcular totales con redondeo consistente
    const subtotalUsd = items.reduce((sum, item) => {
      return sum + (item.cantidad * item.precioUnitario);
    }, 0);

    // 🔧 REDONDEO CONSISTENTE PARA EVITAR ERRORES DE DECIMALES
    let totalBs = Math.round(((subtotalUsd * tasaCambio) - descuentoTotal) * 100) / 100;
    let totalUsd = Math.round((subtotalUsd - (descuentoTotal / tasaCambio)) * 100) / 100;

    // Validar pagos
    let sumaTotalPagos = 0;
    for (const pago of pagos) {
      if (!pago.metodo || !pago.monto || !pago.moneda) {
        return sendError(res, 'Todos los pagos deben tener método, monto y moneda', 400);
      }
      
      const montoPago = parseFloat(pago.monto);
      if (montoPago <= 0) {
        return sendError(res, 'Todos los montos deben ser mayores a 0', 400);
      }
      
      // Convertir a Bs para validación total
      if (pago.moneda === 'usd') {
        sumaTotalPagos += montoPago * tasaCambio;
      } else {
        sumaTotalPagos += montoPago;
      }
    }

    // 🆕 CALCULAR TOTALES DE VUELTOS PRIMERO
      const totalVueltosBs = vueltos.reduce((total, vuelto) => {
        const monto = parseFloat(vuelto.monto) || 0;
        return total + (vuelto.moneda === 'bs' ? monto : monto * tasaCambio);
      }, 0);

      // 💰 LÍMITES DE REGALÍAS ACEPTABLES
      const LIMITE_REGALIA_BS = 50;  // 50 Bs
      const LIMITE_REGALIA_USD = 2;  // $2
      const limiteRegaliaTotalBs = LIMITE_REGALIA_BS + (LIMITE_REGALIA_USD * tasaCambio);

      // 🔧 TOLERANCIA PARA ERRORES DE REDONDEO - Ajustada para alta precisión
    const TOLERANCIA_REDONDEO = 0.01; // 0.01 Bs de tolerancia (1 céntimo)

    // Calcular diferencia de pagos PRIMERO
    const diferenciaPagos = sumaTotalPagos - totalBs;

      // ✅ CALCULAR EXCESO REAL (después de descontar vueltos configurados)
      const excesoReal = Math.max(0, diferenciaPagos - totalVueltosBs);

      console.log('💰 Validación de regalía:', {
        sumaTotalPagos,
        totalBs,
        diferenciaPagos,
        totalVueltosBs,
        excesoReal,
        limiteRegaliaTotalBs
      });
    
    // Validar que la suma de pagos coincida o sea una regalía aceptable
    if (diferenciaPagos < -TOLERANCIA_REDONDEO) {
      // Faltan pagos (más allá de la tolerancia)
      console.log('❌ Faltan pagos significativos:', {
        diferenciaPagos: diferenciaPagos.toFixed(2),
        tolerancia: TOLERANCIA_REDONDEO
      });
      return sendError(res, `Faltan ${Math.abs(diferenciaPagos).toFixed(2)} Bs en los pagos`, 400);
    } else if (diferenciaPagos < 0 && diferenciaPagos >= -TOLERANCIA_REDONDEO) {
      // Diferencia menor dentro de tolerancia - ajustar automáticamente
      console.log('⚙️ Ajuste automático por redondeo:', diferenciaPagos.toFixed(2), 'Bs');
      
      // Ajustar totales para compensar el redondeo
      totalBs = Math.round(sumaTotalPagos * 100) / 100;
      totalUsd = Math.round((totalBs / tasaCambio) * 100) / 100;
      
      console.log('🔧 Totales ajustados por redondeo:', {
        totalBsAjustado: totalBs.toFixed(2),
        totalUsdAjustado: totalUsd.toFixed(2)
      });
      } else if (excesoReal > limiteRegaliaTotalBs) {
        // ✅ VALIDAR EXCESO REAL (no el exceso bruto)
        return sendError(res, `Exceso real de ${excesoReal.toFixed(2)} Bs supera el límite de regalía (${limiteRegaliaTotalBs.toFixed(2)} Bs). El vuelto configurado (${totalVueltosBs.toFixed(2)} Bs) ya está siendo considerado.`, 400);
      }

      // Registrar regalía si la hay (solo el exceso real)
      if (excesoReal > 0.01 && excesoReal <= limiteRegaliaTotalBs) {
        console.log(`💰 Regalía aceptada: ${excesoReal.toFixed(2)} Bs (después de vueltos)`);
      }

    // Generar código de venta
    const codigoVenta = await generarCodigoVenta();


    // Determinar método de pago principal (el de mayor monto)
    const metodoPagoPrincipal = pagos.reduce((max, pago) => {
      const montoBs = pago.moneda === 'usd' ? pago.monto * tasaCambio : pago.monto;
      const maxMontoBs = max.moneda === 'usd' ? max.monto * tasaCambio : max.monto;
      return montoBs > maxMontoBs ? pago : max;
    }).metodo;


    const totalVueltosUsd = vueltos.reduce((total, vuelto) => {
      const monto = parseFloat(vuelto.monto) || 0;
      return total + (vuelto.moneda === 'usd' ? monto : monto / tasaCambio);
    }, 0);

    console.log('💰 Totales calculados:', { 
      totalBs, 
      totalVueltosBs, 
      totalVueltosUsd 
    });

    // Procesar venta en transacción
    const ventaProcesada = await prisma.$transaction(async (tx) => {
      // 1. Verificar y actualizar stock de productos físicos
      for (const item of items) {
        if (item.productoId) {
          const producto = await tx.product.findUnique({
            where: { id: item.productoId }
          });

          if (producto && (producto.tipo === 'PRODUCTO' || producto.tipo === 'ELECTROBAR')) {
            // Verificar stock disponible
            const stockDisponible = producto.stock; // - producto.stockReservado;
            if (stockDisponible < item.cantidad) {
              throw new Error(`Stock insuficiente para ${producto.descripcion}. Disponible: ${stockDisponible}, Solicitado: ${item.cantidad}`);
            }

            // Descontar del stock y liberar reserva
            await tx.product.update({
              where: { id: item.productoId },
              data: {
                stock: {
                  decrement: item.cantidad
                },
                //stockReservado: {
                  //decrement: item.cantidad // Liberar la reserva
                //},
                ultimaVenta: new Date()
              }
            });

            // Registrar movimiento de salida
            await tx.stockMovement.create({
              data: {
                productoId: item.productoId,
                tipo: 'SALIDA',
                cantidad: item.cantidad,
                stockAnterior: producto.stock,
                stockNuevo: producto.stock - item.cantidad,
                precio: toDecimal(item.precioUnitario),
                motivo: `Venta ${codigoVenta}`,
                observaciones: `Venta procesada - Cliente: ${clienteNombre || 'N/A'}`,
                usuarioId: usuarioId,
                ipAddress: req.ip || req.connection.remoteAddress
              }
            });
            
            // 📡 Emitir evento de inventario actualizado para actualización en tiempo real
            if (req.io) {
              req.io.emit('inventario_actualizado', {
                operacion: 'VENTA_PROCESADA',
                producto: {
                  id: producto.id,
                  descripcion: producto.descripcion,
                  stock: producto.stock - item.cantidad
                },
                cantidad: item.cantidad,
                usuario: req.user?.nombre || req.user?.email,
                motivo: `Venta ${codigoVenta}`,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }

      // 2. Crear la transacción principal
      const transaccion = await tx.transaccion.create({
        data: {
          cajaId: cajaAbierta.id,
          usuarioId: usuarioId,
          tipo: 'INGRESO',
          categoria: `Venta - ${items.length} productos`,
          observaciones: observaciones || `Venta procesada con código ${codigoVenta}`,
          totalBs: toDecimal(totalBs),
          totalUsd: toDecimal(totalUsd),
          tasaCambioUsada: toDecimal(tasaCambio),
          clienteId: clienteId ? parseInt(clienteId) : null,
          clienteNombre: clienteNombre,
          codigoVenta: codigoVenta,
          consecutivoDelDia: parseInt(codigoVenta.slice(-3)),
          metodoPagoPrincipal: metodoPagoPrincipal,
          descuentoTotal: toDecimal(descuentoTotal),
          cantidadItems: items.length,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sesionId: sesionId,
          tiempoServicio: tiempoServicio,
          requiereFactura: opcionesProcesamiento.generarFactura || false,
          reciboGenerado: false,
          facturaGenerada: false
        }
      });

      // 3. Crear los items de la transacción
      const itemsCreados = await Promise.all(
        items.map(item => 
          tx.transactionItem.create({
            data: {
              transaccionId: transaccion.id,
              productoId: item.productoId || null,
              descripcion: item.descripcion,
              codigoBarras: item.codigoBarras || item.codigo,
              cantidad: item.cantidad,
              precioUnitario: toDecimal(item.precioUnitario),
              precioCosto: toDecimal(item.precioCosto || 0),
              descuento: toDecimal(item.descuento || 0),
              subtotal: toDecimal(item.cantidad * item.precioUnitario - (item.descuento || 0))
            }
          })
        )
      );

      // 4. Crear los pagos
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

      // 5. Actualizar totales de la caja
      const updateData = {
        totalIngresosBs: { increment: toDecimal(totalBs) },
        totalIngresosUsd: { increment: toDecimal(totalUsd) }
      };

      // Calcular total de pago móvil
      const totalPagoMovil = pagos
        .filter(pago => pago.metodo === 'pago_movil')
        .reduce((total, pago) => total + parseFloat(pago.monto), 0);

      if (totalPagoMovil > 0) {
        updateData.totalPagoMovil = { increment: toDecimal(totalPagoMovil) };
      }

      await tx.caja.update({
        where: { id: cajaAbierta.id },
        data: updateData
      });

      // 6. 🆕 CREAR TRANSACCIONES DE EGRESO PARA LOS VUELTOS
      const vueltosCreados = [];
      if (vueltos.length > 0 && totalVueltosBs > 0) {
        console.log('💸 Procesando vueltos:', vueltos.length);
        
        for (const vuelto of vueltos) {
          const montoVuelto = parseFloat(vuelto.monto) || 0;
          if (montoVuelto > 0) {

            // Generar código único para el vuelto
            const codigoVuelto = `${codigoVenta}-V${vueltosCreados.length + 1}`;
            
            const transaccionVuelto = await tx.transaccion.create({
              data: {
                cajaId: cajaAbierta.id,
                usuarioId: usuarioId,
                tipo: 'EGRESO',
                categoria: `Vuelto de venta ${codigoVenta}`,
                observaciones: `Vuelto entregado - Método: ${vuelto.metodo} - Ref: ${vuelto.referencia || 'N/A'}`,
                totalBs: toDecimal(vuelto.moneda === 'bs' ? montoVuelto : montoVuelto * tasaCambio),
                totalUsd: toDecimal(vuelto.moneda === 'usd' ? montoVuelto : montoVuelto / tasaCambio),
                tasaCambioUsada: toDecimal(tasaCambio),
                metodoPagoPrincipal: vuelto.metodo,
                codigoVenta: codigoVuelto,
                consecutivoDelDia: parseInt(codigoVenta.slice(-3)) + 1000 + vueltosCreados.length,
                cantidadItems: 0,
                descuentoTotal: toDecimal(0),
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                sesionId: sesionId
              }
            });
            
            // 🔥 CREAR REGISTRO DE PAGO PARA EL VUELTO CON SU MONEDA ORIGINAL
            await tx.pago.create({
              data: {
                transaccionId: transaccionVuelto.id,
                metodo: vuelto.metodo,
                monto: toDecimal(montoVuelto), // Monto en su moneda original
                moneda: vuelto.moneda || 'bs', // Moneda original del vuelto
                banco: vuelto.banco || null,
                referencia: vuelto.referencia || null
              }
            });
            
            vueltosCreados.push(transaccionVuelto);
            console.log('✅ Vuelto registrado:', montoVuelto, vuelto.moneda);
          }
        }

        // 7. 🆕 ACTUALIZAR TOTALES DE CAJA RESTANDO VUELTOS
        if (totalVueltosBs > 0 || totalVueltosUsd > 0) {
          await tx.caja.update({
            where: { id: cajaAbierta.id },
            data: {
              totalEgresosBs: { increment: toDecimal(totalVueltosBs) },
              totalEgresosUsd: { increment: toDecimal(totalVueltosUsd) }
            }
          });
          console.log('✅ Totales de caja actualizados con vueltos');
        }
      }

      // 8. Registrar auditoría del carrito (venta procesada)
      if (sesionId) {
        await Promise.all(
          items.map(item => 
            tx.carritoAuditoria.create({
              data: {
                sesionId,
                usuarioId,
                productoId: item.productoId,
                accion: 'PROCESAR',
                cantidadNueva: item.cantidad,
                precioUnitario: toDecimal(item.precioUnitario),
                fechaHora: new Date(),
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                fueComprado: true,
                transaccionId: transaccion.id
              }
            })
          )
        );
      }

      return { transaccion, items: itemsCreados, pagos: pagosCreados, vueltos: vueltosCreados };
    });

    console.log('✅ Venta procesada exitosamente:', ventaProcesada.transaccion.id);

    // Convertir para el frontend con manejo seguro de errores
    try {
      // ✅ OBTENER TOTALES ACTUALIZADOS DE LA CAJA DESPUÉS DE LA TRANSACCIÓN
      const cajaActualizada = await prisma.caja.findUnique({
        where: { id: cajaAbierta.id },
        select: {
          totalIngresosBs: true,
          totalIngresosUsd: true,
          totalPagoMovil: true
        }
      });

      const ventaConvertida = {
        ...ventaProcesada.transaccion,
        totalBs: decimalToNumber(ventaProcesada.transaccion.totalBs),
        totalUsd: decimalToNumber(ventaProcesada.transaccion.totalUsd),
        tasaCambioUsada: decimalToNumber(ventaProcesada.transaccion.tasaCambioUsada),
        descuentoTotal: decimalToNumber(ventaProcesada.transaccion.descuentoTotal),
        usuario: req.user?.nombre || req.user?.email || 'Usuario',
        fechaHora: new Date().toISOString(),
        // ✅ AGREGAR TOTALES ACTUALIZADOS PARA SINCRONIZACIÓN EN FRONTEND
        totalesActualizados: cajaActualizada ? {
          totalIngresosBs: decimalToNumber(cajaActualizada.totalIngresosBs),
          totalIngresosUsd: decimalToNumber(cajaActualizada.totalIngresosUsd),
          totalPagoMovil: decimalToNumber(cajaActualizada.totalPagoMovil || 0)
        } : null,
        pagos: (ventaProcesada.pagos || []).map(p => ({
          ...p,
          monto: decimalToNumber(p.monto)
        })),
        items: (ventaProcesada.items || []).map(i => ({
          ...i,
          precioUnitario: decimalToNumber(i.precioUnitario),
          precioCosto: decimalToNumber(i.precioCosto || 0),
          descuento: decimalToNumber(i.descuento || 0),
          subtotal: decimalToNumber(i.subtotal)
        }))
      };

      // ✅ ENVIAR RESPUESTA HTTP PRIMERO
      try {
        sendSuccess(res, ventaConvertida, 'Venta procesada correctamente');
      } catch (errorRespuesta) {
        console.error('❌ Error enviando respuesta:', errorRespuesta);
        // Si ya se envió la respuesta, no intentar enviar otra
        if (!res.headersSent) {
          sendError(res, `Error procesando venta: ${errorRespuesta.message}`);
        }
        return;
      }

      // ✅ EMITIR EVENTOS SOCKET.IO DESPUÉS DE ENVIAR RESPUESTA HTTP
      // Esto asegura que el frontend reciba la respuesta HTTP antes de los eventos Socket
      if (req.io) {
        // Emitir evento venta_procesada (para ventas)
        req.io.emit('venta_procesada', {
          venta: ventaConvertida,
          usuario: req.user?.nombre || req.user?.email,
          timestamp: new Date().toISOString()
        });
        
        // También emitir nueva_transaccion para que TransactionTable se actualice
        req.io.emit('nueva_transaccion', {
          transaccion: ventaConvertida,
          usuario: req.user?.nombre || req.user?.email,
          timestamp: new Date().toISOString(),
          tipo: 'venta'
        });
        
        // También emitir transaction-added para compatibilidad (usar emit en lugar de broadcast.emit)
        req.io.emit('transaction-added', {
          transaccion: ventaConvertida,
          usuario: req.user?.nombre || req.user?.email,
          timestamp: new Date().toISOString()
        });
        
        console.log('📡 Notificaciones Socket.IO enviadas - venta procesada');
      }
    } catch (errorConversion) {
      console.error('❌ Error convirtiendo datos de venta:', errorConversion);
      console.error('Stack trace:', errorConversion.stack);
      sendError(res, `Error procesando venta: ${errorConversion.message}`);
      return;
    }

    // ✅ LIMPIAR RESERVAS TEMPORALES DE LA SESIÓN (DATOS TEMPORALES)
    try {
      const reservasEliminadas = await prisma.stockMovement.deleteMany({
        where: {
          tipo: 'RESERVA',
          motivo: `Sesión: ${sesionId}`
        }
      });

      console.log(`🗑️ Limpieza post-venta: ${reservasEliminadas.count} reservas temporales eliminadas`);

      // NO EMITIR inventario_actualizado aquí - ya se maneja en venta_procesada
      // Emitir este evento causa doble refresh para todos los usuarios
      console.log('ℹ️ Inventario se actualizará automáticamente via evento venta_procesada');
    } catch (errorLimpieza) {
      console.error('⚠️ Error limpiando reservas post-venta (no crítico):', errorLimpieza);
    }

} catch (error) {
    console.error('❌ Error procesando venta:', error);
    sendError(res, `Error procesando venta: ${error.message}`);
  }
};

// ===================================
// 🔄 RETOMAR VENTA EN ESPERA
// ===================================
const retomarVentaEnEspera = async (req, res) => {
  try {
    const { id } = req.params;
    const { sesionId } = req.body;
    const usuarioId = req.user.userId;

    console.log('🔄 Retomando venta en espera:', { id, sesionId, usuarioId });

    // Buscar la venta en espera
    const ventaEnEspera = await prisma.pendingSale.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                descripcion: true,
                stock: true,
                stockReservado: true,
                tipo: true,
                precioVenta: true
              }
            }
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!ventaEnEspera) {
      return sendError(res, 'Venta en espera no encontrada', 404);
    }

    if (ventaEnEspera.estado !== 'ACTIVA') {
      return sendError(res, `No se puede retomar venta en estado: ${ventaEnEspera.estado}`, 400);
    }

    // Verificar si está expirada
    const ahora = new Date();
    if (ahora > new Date(ventaEnEspera.fechaExpiracion)) {
      // Marcar como expirada
      await prisma.pendingSale.update({
        where: { id: parseInt(id) },
        data: { estado: 'EXPIRADA' }
      });
      return sendError(res, 'Esta venta en espera ha expirado', 400);
    }

    // Verificar disponibilidad de stock para productos físicos
    const stockInsuficiente = [];
    for (const item of ventaEnEspera.items) {
      if (item.producto && (item.producto.tipo === 'PRODUCTO' || item.producto.tipo === 'ELECTROBAR')) {
        const stockDisponible = item.producto.stock;
        if (stockDisponible < item.cantidad) {
          stockInsuficiente.push({
            descripcion: item.descripcion,
            solicitado: item.cantidad,
            disponible: stockDisponible
          });
        }
      }
    }

    if (stockInsuficiente.length > 0) {
      return sendError(res, 'Stock insuficiente para algunos productos', 400, {
        productosAfectados: stockInsuficiente
      });
    }

    // Actualizar estado y actividad
    const ventaActualizada = await prisma.$transaction(async (tx) => {
      // Actualizar la venta en espera
      const venta = await tx.pendingSale.update({
        where: { id: parseInt(id) },
        data: {
          ultimaActividad: new Date(),
          sesionActiva: true
        },
        include: {
          items: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        }
      });

      // Registrar auditoría del carrito
      if (sesionId) {
        await Promise.all(
          ventaEnEspera.items.map(item => 
            tx.carritoAuditoria.create({
              data: {
                sesionId,
                usuarioId,
                productoId: item.productoId,
                accion: 'RETOMAR_ESPERA',
                cantidadNueva: item.cantidad,
                precioUnitario: item.precioUnitario,
                fechaHora: new Date(),
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                ventaEsperaId: parseInt(id)
              }
            })
          )
        );
      }

      return venta;
    });

    // ✅ LIMPIAR RESERVAS TEMPORALES DE LA SESIÓN (DATOS TEMPORALES)
    try {
      const reservasEliminadas = await prisma.stockMovement.deleteMany({
        where: {
          tipo: 'RESERVA',
          motivo: `Sesión: ${sesionId}`
        }
      });
      
      console.log(`🗑️ Limpieza post-venta: ${reservasEliminadas.count} reservas temporales eliminadas para sesión ${sesionId}`);
    } catch (errorLimpieza) {
      console.error('⚠️ Error limpiando reservas post-venta (no crítico):', errorLimpieza);
    }

    // Convertir para el frontend
    const ventaConvertida = {
      ...ventaActualizada,
      subtotal: decimalToNumber(ventaActualizada.subtotal),
      descuento: decimalToNumber(ventaActualizada.descuento),
      total: decimalToNumber(ventaActualizada.total),
      tasaCambio: decimalToNumber(ventaActualizada.tasaCambio),
      tiempoRestanteMin: Math.max(0, Math.floor((new Date(ventaActualizada.fechaExpiracion) - ahora) / 1000 / 60)),
      items: ventaActualizada.items.map(item => ({
        ...item,
        precioUnitario: decimalToNumber(item.precioUnitario),
        descuento: decimalToNumber(item.descuento),
        subtotal: decimalToNumber(item.subtotal)
      }))
    };

    console.log('✅ Venta en espera retomada exitosamente');

    // 📡 Notificar via Socket.IO
    if (req.io) {
      req.io.emit('venta_retomada_espera', {
        venta: ventaConvertida,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Notificación Socket.IO enviada - venta retomada');
    }

    // 📡 Notificar via Socket.IO
      if (req.io) {
        const eventData = {
          venta: ventaConvertida,
          usuario: req.user?.nombre || req.user?.email,
          timestamp: new Date().toISOString()
        };
        
        console.log('📡📡📡 BACKEND EMITIENDO venta_procesada 📡📡📡');
        console.log('📊 Event data:', JSON.stringify(eventData, null, 2));
        console.log('📊 Usuarios conectados:', req.io.engine.clientsCount);
        
        req.io.emit('venta_procesada', eventData);
        console.log('✅ Evento venta_procesada EMITIDO');
        console.log('📡 Notificación Socket.IO enviada - venta procesada');
      }

    sendSuccess(res, ventaConvertida, 'Venta en espera retomada correctamente');

  } catch (error) {
    console.error('❌ Error retomando venta en espera:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 📊 OBTENER STOCK DISPONIBLE
// ===================================
// ===================================
// 📊 OBTENER STOCK DISPONIBLE CON BLOQUEO
// ===================================
const obtenerStockDisponible = async (req, res) => {
  try {
    const { id } = req.params;
    const { sesionId } = req.query; // 🆕 OBTENER SESION ID DE QUERY PARAMS
    
    console.log('🔍 CONSULTA STOCK - ID:', id, 'SesionId:', sesionId);
    console.log('📊 Consultando stock disponible para producto:', id);

    // 🔍 USAR NUEVO SERVICIO CON BLOQUEO
    const resultado = await stockService.obtenerStockDisponible(parseInt(id), sesionId);

    console.log('✅ Stock disponible consultado exitosamente');

    sendSuccess(res, resultado);

  } catch (error) {
    console.error('❌ Error consultando stock disponible:', error);
    
    // Manejar errores específicos del servicio
    if (error.message.includes('Producto no encontrado')) {
      return sendError(res, error.message, 404);
    }
    
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🧹 LIMPIAR RESERVAS EXPIRADAS CON SERVICIO
// ===================================
const limpiarReservasExpiradas = async (req, res) => {
  try {
    const { tiempoLimiteHoras = 2 } = req.body;

    console.log('🧹 Limpiando reservas expiradas mayores a', tiempoLimiteHoras, 'horas');

    // 🧹 USAR NUEVO SERVICIO PARA LIMPIEZA AUTOMÁTICA
    const resultado = await stockService.limpiarReservasExpiradas(tiempoLimiteHoras);

    console.log('✅ Reservas expiradas limpiadas exitosamente:', resultado);

    // 📡 EMITIR EVENTO WEBSOCKET PARA NOTIFICAR LIMPIEZA
    if (req.io) {
      req.io.emit('reservas_expiradas_limpiadas', {
        reservasLiberadas: resultado.reservasLiberadas,
        productosAfectados: resultado.productosAfectados,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Evento reservas_expiradas_limpiadas emitido via WebSocket');
    }

    sendSuccess(res, resultado, 'Reservas expiradas limpiadas correctamente');

  } catch (error) {
    console.error('❌ Error limpiando reservas expiradas:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 💓 HEARTBEAT PARA MANTENER RESERVAS VIVAS CON SERVICIO
// ===================================
const heartbeatReservas = async (req, res) => {
  try {
    const { sesionId } = req.body;
    const usuarioId = req.user.userId;
    
    console.log('💓 Heartbeat recibido para sesión:', sesionId);
    
    if (!sesionId) {
      return sendError(res, 'SesionId requerido', 400);
    }
    
    // 💓 USAR NUEVO SERVICIO PARA RENOVAR RESERVAS
    const resultado = await stockService.renovarReservas(sesionId, usuarioId);
    
    console.log(`✅ Heartbeat procesado:`, resultado);
    
    sendSuccess(res, resultado, resultado.renovado ? 'Reservas renovadas correctamente' : resultado.mensaje);
    
  } catch (error) {
    console.error('❌ Error en heartbeat:', error);
    sendError(res, 'Error interno del servidor');
  }
};

module.exports = {
  reservarStock,
  liberarStock,
  guardarVentaEnEspera,
  obtenerVentasEnEspera,
  procesarVenta,
  retomarVentaEnEspera,
  obtenerStockDisponible,
  limpiarReservasExpiradas,
  heartbeatReservas
};