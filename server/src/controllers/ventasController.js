// server/src/controllers/ventasController.js
const { PrismaClient, Decimal } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/responses');

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
// 🔒 RESERVAR STOCK
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
    
    // Si es producto individual, usar lógica actual
    const usuarioId = req.user.userId;

    console.log(`📋 [${requestId}] Parámetros:`, { productoId, cantidad, sesionId, usuarioId });
    console.log(`🌐 [${requestId}] Request info:`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substr(0, 50)
    });
    console.log(`🔒 [${requestId}] Iniciando reserva...`);

    // Validaciones
    if (!productoId || !cantidad || !sesionId) {
      return sendError(res, 'Faltan datos requeridos: productoId, cantidad, sesionId', 400);
    }

    if (cantidad <= 0) {
      return sendError(res, 'La cantidad debe ser mayor a 0', 400);
    }

    // Buscar el producto
    const producto = await prisma.product.findUnique({
      where: { id: parseInt(productoId) }
    });

    if (!producto) {
      return sendError(res, 'Producto no encontrado', 404);
    }

    // Solo productos físicos necesitan reserva de stock
    if (producto.tipo === 'SERVICIO') {
      return sendSuccess(res, {
        reservado: true,
        mensaje: 'Los servicios no requieren reserva de stock',
        stockDisponible: 999999
      });
    }
    // 🆕 CALCULAR STOCK REAL DISPONIBLE (stock - reservas activas)
      const reservasActivasQuery = await prisma.stockMovement.findMany({
        where: {
          productoId: parseInt(productoId),
          tipo: 'RESERVA',
          transaccionId: null // Solo reservas no procesadas
        },
        select: {
          cantidad: true,
          motivo: true
        }
      });

    // Excluir MI propia reserva del cálculo de stock disponible
    const reservasDeOtros = reservasActivasQuery.filter(reserva => 
      !reserva.motivo || !reserva.motivo.includes(sesionId)
    );
    const totalReservadoPorOtros = reservasDeOtros.reduce((sum, reserva) => sum + reserva.cantidad, 0);
    const stockRealDisponible = Math.max(0, producto.stock - totalReservadoPorOtros);

    if (stockRealDisponible < cantidad) {
      return sendError(res, `Stock insuficiente. Disponible: ${stockRealDisponible}, Solicitado: ${cantidad}`, 400);
    }

    // Verificar si ya existe una reserva para esta sesión y producto
    const reservaExistente = await prisma.stockMovement.findFirst({
      where: {
        productoId: parseInt(productoId),
        tipo: 'RESERVA',
        motivo: `Sesión: ${sesionId}`,
        transaccionId: null
      }
    });

    if (reservaExistente) {
      // Acumular a la reserva existente
      const nuevaCantidadTotal = reservaExistente.cantidad + cantidad;
      
      await prisma.stockMovement.update({
        where: { id: reservaExistente.id },
        data: {
          cantidad: nuevaCantidadTotal,
          stockNuevo: producto.stock,
          fecha: new Date(),
          observaciones: `${reservaExistente.observaciones} + ${cantidad} = ${nuevaCantidadTotal}`
        }
      });

     console.log('✅ Reserva acumulada exitosamente:', nuevaCantidadTotal);
      
      // 🆕 DEBUG: Estado después de acumular
      console.log('🔍 DEBUG POST-ACUMULACIÓN:', {
        stockTotal: producto.stock,
        miReservaAcumulada: nuevaCantidadTotal,
        sesionId: sesionId
      });
    } else {
      // Crear nueva reserva
      await prisma.stockMovement.create({
        data: {
          productoId: parseInt(productoId),
          tipo: 'RESERVA',
          cantidad: cantidad,
          stockAnterior: producto.stock,
          stockNuevo: producto.stock,
          motivo: `Sesión: ${sesionId}`,
          observaciones: `Reserva temporal para venta en sesión ${sesionId}`,
          usuarioId: usuarioId,
          ipAddress: req.ip || req.connection.remoteAddress
        }
      });

      console.log('✅ Nueva reserva creada exitosamente');
    }

    // 🆕 RECALCULAR STOCK DESPUÉS DE RESERVAR
    const nuevasReservasQuery = await prisma.stockMovement.findMany({
      where: {
        productoId: parseInt(productoId),
        tipo: 'RESERVA',
        transaccionId: null
      },
      select: {
        cantidad: true
      }
    });

    const nuevoTotalReservado = nuevasReservasQuery.reduce((sum, reserva) => sum + reserva.cantidad, 0);
    const nuevoStockDisponible = Math.max(0, producto.stock - nuevoTotalReservado);

    sendSuccess(res, {
      reservado: true,
      producto: producto.descripcion,
      stockTotal: producto.stock,
      stockReservado: nuevoTotalReservado,
      stockDisponible: nuevoStockDisponible,
      cantidadReservada: cantidad,
      sesionId: sesionId
    }, 'Stock reservado correctamente');

    // 📡 EMITIR EVENTO WEBSOCKET PARA SINCRONIZACIÓN EN TIEMPO REAL
    if (req.io) {
      req.io.emit('stock_reservado', {
        productoId: parseInt(productoId),
        producto: producto.descripcion,
        stockTotal: producto.stock,
        stockReservado: nuevoTotalReservado,
        stockDisponible: nuevoStockDisponible,
        cantidadReservada: cantidad,
        sesionId: sesionId,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Evento stock_reservado emitido via WebSocket');
    }

  } catch (error) {
    console.error('❌ Error reservando stock:', error);
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
// 🔓 LIBERAR STOCK
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
    console.log(`🔓 [${requestId}] Iniciando liberación...`);

    // Validaciones
    if (!productoId || !sesionId) {
      return sendError(res, 'Faltan datos requeridos: productoId, sesionId', 400);
    }

    // Buscar el producto
    const producto = await prisma.product.findUnique({
      where: { id: parseInt(productoId) }
    });

    if (!producto) {
      return sendError(res, 'Producto no encontrado', 404);
    }

    // Solo productos físicos tienen reservas
    if (producto.tipo === 'SERVICIO') {
      return sendSuccess(res, {
        liberado: true,
        mensaje: 'Los servicios no tienen reservas que liberar'
      });
    }

    // Buscar reserva activa para esta sesión
    const reserva = await prisma.stockMovement.findFirst({
      where: {
        productoId: parseInt(productoId),
        tipo: 'RESERVA',
        motivo: `Sesión: ${sesionId}`,
        transaccionId: null // Solo reservas no procesadas
      }
    });

    if (!reserva) {
      return sendSuccess(res, {
        liberado: true,
        mensaje: 'No hay reservas activas para esta sesión'
      });
    }

   // Liberar reserva (completa o parcial)
const cantidadALiberar = cantidad || reserva.cantidad; // 🆕 Usar cantidad específica o total

await prisma.$transaction(async (tx) => {
  // Reducir stock reservado
  await tx.product.update({
    where: { id: parseInt(productoId) },
    data: {
     // stockReservado: {
        //decrement: cantidadALiberar  // 🆕 USAR cantidad específica
      //}
    }
  });

      // Registrar movimiento de liberación
      await tx.stockMovement.create({
        data: {
          productoId: parseInt(productoId),
          tipo: 'LIBERACION',
          cantidad: cantidadALiberar,  // 🆕 USAR cantidad específica
          stockAnterior: producto.stock,
          stockNuevo: producto.stock,
          motivo: cantidad ? `Liberación parcial sesión: ${sesionId}` : `Liberación de sesión: ${sesionId}`,  // 🆕 DIFERENCIAR
          observaciones: cantidad ? 
            `Liberación parcial (${cantidadALiberar}) de sesión ${sesionId}` : 
            `Liberación de reserva temporal de sesión ${sesionId}`,  // 🆕 MEJORAR DESCRIPCIÓN
          usuarioId: usuarioId,
          ipAddress: req.ip || req.connection.remoteAddress
        }
      });

      // Marcar la reserva como procesada (soft delete)
      await tx.stockMovement.update({
        where: { id: reserva.id },
        data: {
          observaciones: `${reserva.observaciones || ''} - LIBERADA el ${new Date().toISOString()}`
        }
      });
    });

    // Obtener stock actualizado
    const productoActualizado = await prisma.product.findUnique({
      where: { id: parseInt(productoId) },
      select: {
        stock: true,
        //stockReservado: true,
        descripcion: true
      }
    });

    console.log('✅ Stock liberado exitosamente');

    sendSuccess(res, {
      liberado: true,
      producto: productoActualizado.descripcion,
      stockTotal: productoActualizado.stock,
      stockReservado: 0, // productoActualizado.stockReservado,
      stockDisponible: productoActualizado.stock, // - productoActualizado.stockReservado,
      cantidadLiberada: cantidadALiberar,  // 🆕 USAR cantidad específica
      esLiberacionParcial: !!cantidad,     // 🆕 INDICAR SI ES PARCIAL
      sesionId: sesionId
    }, cantidad ? 'Stock liberado parcialmente' : 'Stock liberado correctamente');  // 🆕 MENSAJE ESPECÍFICO

    // 📡 EMITIR EVENTO WEBSOCKET PARA SINCRONIZACIÓN EN TIEMPO REAL
   if (req.io) {
  req.io.emit('stock_liberado', {
    productoId: parseInt(productoId),
    producto: productoActualizado.descripcion,
    stockTotal: productoActualizado.stock,
    stockReservado: 0, // productoActualizado.stockReservado,
      stockDisponible: productoActualizado.stock, // - productoActualizado.stockReservado,
    cantidadLiberada: cantidadALiberar,  // ✅ USAR cantidad específica
    esLiberacionParcial: !!cantidad,    // 🆕 INDICAR SI ES PARCIAL
    sesionId: sesionId,
    usuario: req.user?.nombre || req.user?.email,
    timestamp: new Date().toISOString()
  });
  console.log(`📡 Evento stock_liberado emitido via WebSocket - ${cantidad ? 'Parcial' : 'Total'}: ${cantidadALiberar}`);
}
  } catch (error) {
    console.error('❌ Error liberando stock:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// 🆕 FUNCIÓN PARA LIBERAR TODAS LAS RESERVAS DE UNA SESIÓN
const liberarTodasLasReservasDeSesion = async (req, res, sesionId, requestId) => {
  const usuarioId = req.user.userId;
  
  console.log(`🧹 [${requestId}] Liberando todas las reservas de sesión: ${sesionId}`);
  
  try {
    const reservasActivas = await prisma.stockMovement.findMany({
      where: {
        tipo: 'RESERVA',
        motivo: `Sesión: ${sesionId}`,
        transaccionId: null
      },
      include: {
        producto: {
          select: { descripcion: true }
        }
      }
    });
    
    if (reservasActivas.length === 0) {
      console.log(`✅ [${requestId}] No hay reservas activas para sesión ${sesionId}`);
      return sendSuccess(res, {
        liberado: true,
        reservasLiberadas: 0,
        mensaje: 'No había reservas activas para esta sesión'
      });
    }
    
    console.log(`🔓 [${requestId}] Encontradas ${reservasActivas.length} reservas activas`);
    
    // 🔄 LIBERAR TODAS EN TRANSACCIÓN AGRUPADAS POR PRODUCTO
        const resultados = await prisma.$transaction(async (tx) => {
          // 📊 AGRUPAR RESERVAS POR PRODUCTO
          const productoMap = new Map();
          
          for (const reserva of reservasActivas) {
            const productoId = reserva.productoId;
            if (!productoMap.has(productoId)) {
              productoMap.set(productoId, {
                producto: reserva.producto,
                cantidadTotal: 0,
                reservas: []
              });
            }
            
            const info = productoMap.get(productoId);
            info.cantidadTotal += reserva.cantidad;
            info.reservas.push(reserva);
          }
          
          const liberaciones = [];
  
        // 🔓 CREAR UNA LIBERACIÓN POR PRODUCTO CON CANTIDAD TOTAL
        for (const [productoId, info] of productoMap) {
          // Obtener stock actual del producto
          const producto = await tx.product.findUnique({
            where: { id: productoId }
          });

          // Crear movimiento de liberación AGRUPADO
          await tx.stockMovement.create({
            data: {
              productoId: productoId,
              tipo: 'LIBERACION',
              cantidad: info.cantidadTotal, // ✅ CANTIDAD TOTAL AGRUPADA
              stockAnterior: producto.stock,
              stockNuevo: producto.stock,
              motivo: `Liberación masiva de sesión: ${sesionId}`,
              observaciones: `Sesión cancelada - ${info.producto.descripcion} (${info.reservas.length} reservas)`,
              usuarioId: usuarioId,
              ipAddress: req.ip || req.connection.remoteAddress
            }
          });
          
          // Marcar TODAS las reservas del producto como procesadas
          for (const reserva of info.reservas) {
            await tx.stockMovement.update({
              where: { id: reserva.id },
              data: {
                observaciones: `${reserva.observaciones} - LIBERADA MASIVAMENTE ${new Date().toISOString()}`,
                motivo: `${reserva.motivo} - PROCESADA`
              }
            });
          }
          
          liberaciones.push({
            producto: info.producto.descripcion,
            cantidad: info.cantidadTotal // ✅ CANTIDAD TOTAL
          });
        }
        
        return liberaciones;
            });
          
          console.log(`✅ [${requestId}] ${resultados.length} reservas liberadas exitosamente`);
          
          sendSuccess(res, {
            liberado: true,
            reservasLiberadas: resultados.length,
            detalles: resultados,
            sesionId: sesionId
          }, `${resultados.length} reservas liberadas correctamente`);
          
          // 📡 EMITIR EVENTO WEBSOCKET
          if (req.io) {
            req.io.emit('reservas_liberadas_masivamente', {
              sesionId: sesionId,
              reservasLiberadas: resultados.length,
              productos: resultados,
              usuario: req.user?.nombre || req.user?.email,
              timestamp: new Date().toISOString()
            });
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

      // 🔧 TOLERANCIA PARA ERRORES DE REDONDEO
    const TOLERANCIA_REDONDEO = 1.0; // 1 Bs de tolerancia para redondeo
    
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

    // Convertir para el frontend
        const ventaConvertida = {
          ...ventaProcesada.transaccion,
          totalBs: decimalToNumber(ventaProcesada.transaccion.totalBs),
          totalUsd: decimalToNumber(ventaProcesada.transaccion.totalUsd),
          tasaCambioUsada: decimalToNumber(ventaProcesada.transaccion.tasaCambioUsada),
          descuentoTotal: decimalToNumber(ventaProcesada.transaccion.descuentoTotal),
          usuario: req.user?.nombre || req.user?.email || 'Usuario',
          fechaHora: new Date().toISOString(),
          pagos: ventaProcesada.pagos.map(p => ({
            ...p,
            monto: decimalToNumber(p.monto)
          })),
          items: ventaProcesada.items.map(i => ({
            ...i,
            precioUnitario: decimalToNumber(i.precioUnitario),
            precioCosto: decimalToNumber(i.precioCosto),
            descuento: decimalToNumber(i.descuento),
            subtotal: decimalToNumber(i.subtotal)
          }))
        };

    // 📡 Notificar via Socket.IO
    if (req.io) {
      req.io.emit('venta_procesada', {
        venta: ventaConvertida,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Notificación Socket.IO enviada - venta procesada');
    }

    sendSuccess(res, ventaConvertida, 'Venta procesada correctamente');

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
const obtenerStockDisponible = async (req, res) => {
  try {
    const { id } = req.params;
    const { sesionId } = req.query; // 🆕 OBTENER SESION ID DE QUERY PARAMS
    
    console.log('🔍 CONSULTA STOCK - ID:', id, 'SesionId:', sesionId);
    console.log('📊 Consultando stock disponible para producto:', id);

    // Buscar el producto
    const producto = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        descripcion: true,
        codigoBarras: true,
        codigoInterno: true,
        tipo: true,
        stock: true,
        stockMinimo: true,
        stockMaximo: true,
        precioVenta: true,
        activo: true
      }
    });

    if (!producto) {
      return sendError(res, 'Producto no encontrado', 404);
    }

    if (!producto.activo) {
      return sendError(res, 'Producto inactivo', 400);
    }

    // Calcular stock disponible
    let stockInfo;

    if (producto.tipo === 'SERVICIO') {
      // Los servicios tienen stock "ilimitado"
      stockInfo = {
        stockTotal: 999999,
        stockReservado: 0,
        stockDisponible: 999999,
        esServicio: true,
        requiereValidacionStock: false
      };
    } else {
      // 🆕 CALCULAR RESERVAS ACTIVAS DESDE stock_movements
      const reservasActivasQuery = await prisma.stockMovement.findMany({
        where: {
          productoId: parseInt(id),
          tipo: 'RESERVA',
          transaccionId: null // Solo reservas no procesadas
        },
        select: {
          cantidad: true
        }
      });

     // Excluir MI propia reserva si tengo sesionId
        const reservasDeOtros = sesionId 
          ? reservasActivasQuery.filter(reserva => 
              !reserva.motivo || reserva.motivo !== `Sesión: ${sesionId}`
            )
          : reservasActivasQuery;
          
        const totalReservadoPorOtros = reservasDeOtros.reduce((sum, reserva) => sum + reserva.cantidad, 0);
        const stockDisponible = Math.max(0, producto.stock - totalReservadoPorOtros);

        console.log('🔍 CALCULO STOCK:', {
          stockTotal: producto.stock,
          reservasTotal: reservasActivasQuery.length,
          reservasDeOtros: reservasDeOtros.length,
          stockDisponible,
          sesionId
        });
      
      stockInfo = {
        stockTotal: producto.stock,
        stockReservado: totalReservadoPorOtros,
        stockDisponible: stockDisponible,
        stockMinimo: producto.stockMinimo,
        stockMaximo: producto.stockMaximo,
        esServicio: false,
        requiereValidacionStock: true,
        alertaStockBajo: stockDisponible <= producto.stockMinimo,
        alertaStockCritico: stockDisponible === 0
      };
    }

    // Obtener reservas activas detalladas para este producto
    const reservasActivas = await prisma.stockMovement.findMany({
      where: {
        productoId: parseInt(id),
        tipo: 'RESERVA',
        transaccionId: null // Solo reservas no procesadas
      },
      select: {
        id: true,
        cantidad: true,
        motivo: true,
        fecha: true,
        usuario: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 10 // Últimas 10 reservas
    });

    console.log('✅ Stock disponible consultado exitosamente');

    // 🆕 MEJORAR INFO DE RESERVAS CON DETALLES DE USUARIO
    const reservasConDetalles = reservasActivas.map(reserva => ({
      id: reserva.id,
      cantidad: reserva.cantidad,
      motivo: reserva.motivo,
      fecha: reserva.fecha,
      usuario: reserva.usuario.nombre,
      esPropia: reserva.motivo && reserva.motivo.includes(sesionId)
    }));

    sendSuccess(res, {
      producto: {
        id: producto.id,
        descripcion: producto.descripcion,
        codigoBarras: producto.codigoBarras,
        codigoInterno: producto.codigoInterno,
        tipo: producto.tipo,
        precioVenta: decimalToNumber(producto.precioVenta)
      },
      stock: stockInfo,
      reservasActivas: reservasConDetalles,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error consultando stock disponible:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 🧹 LIMPIAR RESERVAS EXPIRADAS
// ===================================
const limpiarReservasExpiradas = async (req, res) => {
  try {
    const { tiempoLimiteHoras = 2 } = req.body;

    console.log('🧹 Limpiando reservas expiradas mayores a', tiempoLimiteHoras, 'horas');

    const fechaLimite = new Date();
    fechaLimite.setHours(fechaLimite.getHours() - tiempoLimiteHoras);

    // Buscar reservas expiradas
    const reservasExpiradas = await prisma.stockMovement.findMany({
      where: {
        tipo: 'RESERVA',
        transaccionId: null, // Solo reservas no procesadas
        fecha: {
          lt: fechaLimite
        }
      },
      include: {
        producto: {
          select: {
            id: true,
            descripcion: true,
            stock: true
          }
        }
      }
    });

    if (reservasExpiradas.length === 0) {
      return sendSuccess(res, {
        reservasLiberadas: 0,
        mensaje: 'No hay reservas expiradas para limpiar'
      });
    }

    // Liberar reservas expiradas
    const resultados = await prisma.$transaction(async (tx) => {
      const productosAfectados = new Map();

      for (const reserva of reservasExpiradas) {
        // Acumular cantidades por producto
        const productoId = reserva.productoId;
        if (!productosAfectados.has(productoId)) {
          productosAfectados.set(productoId, {
            producto: reserva.producto,
            cantidadTotal: 0,
            reservas: []
          });
        }
        
        const info = productosAfectados.get(productoId);
        info.cantidadTotal += reserva.cantidad;
        info.reservas.push(reserva);
      }

      // Crear movimiento de liberación por cada producto
      for (const [productoId, info] of productosAfectados) {
        await tx.stockMovement.create({
          data: {
            productoId: productoId,
            tipo: 'LIBERACION',
            cantidad: info.cantidadTotal,
            stockAnterior: info.producto.stock,
            stockNuevo: info.producto.stock,
            motivo: 'Limpieza automática de reservas expiradas',
            observaciones: `Liberadas ${info.reservas.length} reservas expiradas. IDs: ${info.reservas.map(r => r.id).join(', ')}`,
            usuarioId: req.user.userId,
            ipAddress: req.ip || req.connection.remoteAddress
          }
        });
      }

      // 🆕 MARCAR RESERVAS COMO PROCESADAS (asignar transaccionId especial)
      await tx.stockMovement.updateMany({
        where: {
          id: {
            in: reservasExpiradas.map(r => r.id)
          }
        },
        data: {
          transaccionId: -1, // ID especial para reservas expiradas
          observaciones: `${new Date().toISOString()} - LIBERADA AUTOMÁTICAMENTE POR EXPIRACIÓN`
        }
      });

      return {
        reservasLiberadas: reservasExpiradas.length,
        productosAfectados: productosAfectados.size,
        detalles: Array.from(productosAfectados.values()).map(info => ({
          producto: info.producto.descripcion,
          cantidadLiberada: info.cantidadTotal,
          reservasLiberadas: info.reservas.length
        }))
      };
    });

    console.log('✅ Reservas expiradas limpiadas exitosamente:', resultados);

    // 📡 EMITIR EVENTO WEBSOCKET PARA NOTIFICAR LIMPIEZA
    if (req.io) {
      req.io.emit('reservas_expiradas_limpiadas', {
        reservasLiberadas: resultados.reservasLiberadas,
        productosAfectados: resultados.productosAfectados,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Evento reservas_expiradas_limpiadas emitido via WebSocket');
    }

    sendSuccess(res, resultados, 'Reservas expiradas limpiadas correctamente');

  } catch (error) {
    console.error('❌ Error limpiando reservas expiradas:', error);
    sendError(res, 'Error interno del servidor');
  }
};

// ===================================
// 💓 HEARTBEAT PARA MANTENER RESERVAS VIVAS
// ===================================
const heartbeatReservas = async (req, res) => {
  try {
    const { sesionId } = req.body;
    const usuarioId = req.user.userId;
    
    console.log('💓 Heartbeat recibido para sesión:', sesionId);
    
    if (!sesionId) {
      return sendError(res, 'SesionId requerido', 400);
    }
    
    // Buscar reservas activas de esta sesión
    const reservasActivas = await prisma.stockMovement.findMany({
      where: {
        tipo: 'RESERVA',
        motivo: `Sesión: ${sesionId}`,
        transaccionId: null
      }
    });
    
    if (reservasActivas.length === 0) {
      console.log('⚠️ No hay reservas activas para renovar');
      return sendSuccess(res, {
        renovado: false,
        mensaje: 'No hay reservas activas para esta sesión'
      });
    }
    
    // Renovar timestamp de todas las reservas de la sesión
    await prisma.stockMovement.updateMany({
      where: {
        tipo: 'RESERVA',
        motivo: `Sesión: ${sesionId}`,
        transaccionId: null
      },
      data: {
        fecha: new Date(), // Renovar timestamp
        observaciones: `Reserva renovada por heartbeat - ${new Date().toISOString()}`
      }
    });
    
    console.log(`✅ Renovadas ${reservasActivas.length} reservas para sesión ${sesionId}`);
    
    sendSuccess(res, {
      renovado: true,
      reservasRenovadas: reservasActivas.length,
      proximoHeartbeat: '2 minutos',
      timestamp: new Date().toISOString()
    }, 'Reservas renovadas correctamente');
    
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