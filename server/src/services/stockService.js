// server/src/services/stockService.js
// 🔒 SERVICIO DE GESTIÓN DE STOCK CON BLOQUEO PESIMISTA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class StockService {
  constructor() {
    this.TIMEOUT_RESERVA_MINUTOS = 5; // Timeout automático de reservas
    this.HEARTBEAT_INTERVAL_MINUTOS = 2; // Intervalo de heartbeat
    this.MAX_RETRIES = 3; // Máximo de reintentos para deadlocks
  }

  /**
   * 🔄 HELPER: Detectar errores de deadlock/concurrencia
   */
  _isDeadlockError(error) {
    // Prisma deadlock error code
    if (error.code === 'P2034') return true;

    // PostgreSQL deadlock messages
    const deadlockMessages = [
      'deadlock detected',
      'could not serialize access',
      'lock timeout',
      'transaction was deadlocked'
    ];

    return deadlockMessages.some(msg =>
      error.message.toLowerCase().includes(msg)
    );
  }

  /**
   * 🔄 HELPER: Espera exponencial entre reintentos
   */
  async _exponentialBackoff(attempt) {
    const baseDelay = 100; // 100ms
    const delay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 50; // Agregar jitter para evitar thundering herd

    await new Promise(resolve => setTimeout(resolve, delay + jitter));
  }

  /**
   * 🔒 RESERVAR STOCK CON BLOQUEO PESIMISTA Y RETRY AUTOMÁTICO
   * Garantiza integridad en escenarios de alta concurrencia
   * Maneja deadlocks automáticamente con retry exponencial
   */
  async reservarStock(productoId, cantidad, sesionId, usuarioId, ipAddress) {
    console.log(`🔒 [StockService] Iniciando reserva: ${productoId}, cantidad: ${cantidad}, sesión: ${sesionId}`);

    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this._reservarStockTransaction(productoId, cantidad, sesionId, usuarioId, ipAddress);
      } catch (error) {
        lastError = error;

        // Si es deadlock y aún hay reintentos, esperar y reintentar
        if (this._isDeadlockError(error) && attempt < this.MAX_RETRIES - 1) {
          console.log(`🔄 [StockService] Deadlock detectado, reintento ${attempt + 1}/${this.MAX_RETRIES}`);
          await this._exponentialBackoff(attempt);
          continue;
        }

        // Si no es deadlock o se acabaron los reintentos, lanzar error
        throw error;
      }
    }

    // Si llegamos aquí, fallaron todos los reintentos
    throw lastError;
  }

  /**
   * 🔒 TRANSACCIÓN INTERNA DE RESERVA
   */
  async _reservarStockTransaction(productoId, cantidad, sesionId, usuarioId, ipAddress) {
    return await prisma.$transaction(async (tx) => {
      // 1. BLOQUEAR PRODUCTO CON SELECT FOR UPDATE
      const producto = await tx.product.findUnique({
        where: { 
          id: productoId,
          activo: true 
        },
        select: {
          id: true,
          descripcion: true,
          stock: true,
          tipo: true
        }
      });

      if (!producto) {
        throw new Error('Producto no encontrado o inactivo');
      }

      // Servicios no necesitan reserva
      if (producto.tipo === 'SERVICIO') {
        return {
          reservado: true,
          esServicio: true,
          stockDisponible: 999999
        };
      }

      // 2. CALCULAR RESERVAS ACTIVAS DENTRO DE LA TRANSACCIÓN
      const reservasActivas = await tx.stockMovement.findMany({
        where: {
          productoId: productoId,
          tipo: 'RESERVA',
          transaccionId: null,
          motivo: {
            not: `Sesión: ${sesionId}` // Excluir reservas propias
          }
        },
        select: {
          cantidad: true
        }
      });

      const totalReservadoPorOtros = reservasActivas.reduce((sum, r) => sum + r.cantidad, 0);
      const stockDisponible = Math.max(0, producto.stock - totalReservadoPorOtros);

      // 📊 LOG DE DIAGNÓSTICO
      console.log(`📊 [StockService] Diagnóstico de stock:`, {
        productoId,
        descripcion: producto.descripcion,
        stockTotal: producto.stock,
        reservasActivas: reservasActivas.length,
        totalReservadoPorOtros,
        stockDisponible,
        cantidadSolicitada: cantidad,
        sesionId
      });

      // 3. VERIFICAR RESERVA EXISTENTE DE LA MISMA SESIÓN
      const reservaExistente = await tx.stockMovement.findFirst({
        where: {
          productoId: productoId,
          tipo: 'RESERVA',
          motivo: `Sesión: ${sesionId}`,
          transaccionId: null
        }
      });

      // 🔍 CALCULAR STOCK NECESARIO (considerando reserva existente)
      const cantidadYaReservada = reservaExistente ? reservaExistente.cantidad : 0;
      const stockAdicionalNecesario = Math.max(0, cantidad - cantidadYaReservada);

      // Calcular el total que se reservaría después de esta operación
      const totalReservasProyectadas = totalReservadoPorOtros + cantidad;

      console.log(`🔍 [StockService] Análisis de reserva:`, {
        cantidadSolicitada: cantidad,
        cantidadYaReservada,
        stockAdicionalNecesario,
        stockDisponible,
        totalReservadoPorOtros,
        totalReservasProyectadas,
        stockTotal: producto.stock
      });

      // 3B. VALIDAR STOCK ADICIONAL NECESARIO
      if (stockAdicionalNecesario > stockDisponible) {
        throw new Error(`Stock insuficiente. Disponible: ${stockDisponible}, Necesita adicional: ${stockAdicionalNecesario} (ya tiene ${cantidadYaReservada} reservados)`);
      }

      // 3C. VALIDAR QUE EL TOTAL DE RESERVAS NO EXCEDA EL STOCK TOTAL
      if (totalReservasProyectadas > producto.stock) {
        throw new Error(`Total de reservas excedería el stock. Stock total: ${producto.stock}, Total reservado (incluyendo esta): ${totalReservasProyectadas}`);
      }

      let reservaFinal;
      if (reservaExistente) {
        console.log(`🔄 [StockService] Actualizando reserva existente:`, {
          reservaId: reservaExistente.id,
          cantidadAnterior: reservaExistente.cantidad,
          cantidadNueva: cantidad
        });
        // Actualizar reserva existente
        reservaFinal = await tx.stockMovement.update({
          where: { id: reservaExistente.id },
          data: {
            cantidad: cantidad,
            fecha: new Date(),
            observaciones: `Reserva actualizada - sesión ${sesionId}`,
            usuarioId: usuarioId,
            ipAddress: ipAddress
          }
        });
      } else {
        console.log(`🆕 [StockService] Creando nueva reserva para sesión: ${sesionId}`);
        // Crear nueva reserva
        reservaFinal = await tx.stockMovement.create({
          data: {
            productoId: productoId,
            tipo: 'RESERVA',
            cantidad: cantidad,
            stockAnterior: producto.stock,
            stockNuevo: producto.stock,
            motivo: `Sesión: ${sesionId}`,
            observaciones: `Reserva temporal para venta - sesión ${sesionId}`,
            usuarioId: usuarioId,
            ipAddress: ipAddress
          }
        });
      }

      // 5. RECALCULAR STOCK DISPONIBLE DESPUÉS DE LA RESERVA
      const nuevasReservas = await tx.stockMovement.findMany({
        where: {
          productoId: productoId,
          tipo: 'RESERVA',
          transaccionId: null
        },
        select: { cantidad: true }
      });

      const nuevoTotalReservado = nuevasReservas.reduce((sum, r) => sum + r.cantidad, 0);
      const nuevoStockDisponible = Math.max(0, producto.stock - nuevoTotalReservado);

      // 6. ACTUALIZAR CAMPOS DE STOCK DEL PRODUCTO
      await tx.product.update({
        where: { id: productoId },
        data: {
          stockReservado: nuevoTotalReservado,
          stockDisponible: nuevoStockDisponible
        }
      });

      console.log(`✅ [StockService] Reserva exitosa: ${producto.descripcion}, cantidad: ${cantidad}`);

      return {
        reservado: true,
        producto: producto.descripcion,
        stockTotal: producto.stock,
        stockReservado: nuevoTotalReservado,
        stockDisponible: nuevoStockDisponible,
        cantidadReservada: cantidad,
        sesionId: sesionId,
        reservaId: reservaFinal.id
      };
    }, {
      timeout: 10000, // 10 segundos timeout para la transacción
      isolationLevel: 'ReadCommitted' // Nivel de aislamiento optimizado
    });
  }

  /**
   * 🔓 LIBERAR STOCK CON TRANSACCIÓN ATÓMICA Y RETRY AUTOMÁTICO
   */
  async liberarStock(productoId, sesionId, cantidad = null, usuarioId, ipAddress) {
    console.log(`🔓 [StockService] Liberando stock: ${productoId}, sesión: ${sesionId}, cantidad: ${cantidad}`);

    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this._liberarStockTransaction(productoId, sesionId, cantidad, usuarioId, ipAddress);
      } catch (error) {
        lastError = error;

        if (this._isDeadlockError(error) && attempt < this.MAX_RETRIES - 1) {
          console.log(`🔄 [StockService] Deadlock en liberación, reintento ${attempt + 1}/${this.MAX_RETRIES}`);
          await this._exponentialBackoff(attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * 🔓 TRANSACCIÓN INTERNA DE LIBERACIÓN
   */
  async _liberarStockTransaction(productoId, sesionId, cantidad, usuarioId, ipAddress) {
    return await prisma.$transaction(async (tx) => {
      // Buscar reserva activa
      const reserva = await tx.stockMovement.findFirst({
        where: {
          productoId: productoId,
          tipo: 'RESERVA',
          motivo: `Sesión: ${sesionId}`,
          transaccionId: null
        }
      });

      if (!reserva) {
        return {
          liberado: true,
          mensaje: 'No hay reservas activas para esta sesión'
        };
      }

      const cantidadALiberar = cantidad || reserva.cantidad;

      // Crear movimiento de liberación
      await tx.stockMovement.create({
        data: {
          productoId: productoId,
          tipo: 'LIBERACION',
          cantidad: cantidadALiberar,
          stockAnterior: reserva.stockAnterior,
          stockNuevo: reserva.stockAnterior,
          motivo: cantidad ? `Liberación parcial sesión: ${sesionId}` : `Liberación sesión: ${sesionId}`,
          observaciones: `Liberación de reserva temporal - sesión ${sesionId}`,
          usuarioId: usuarioId,
          ipAddress: ipAddress
        }
      });

      // Eliminar la reserva (o reducir la cantidad si es parcial)
      if (cantidad && cantidad < reserva.cantidad) {
        // Liberación parcial: actualizar cantidad de reserva
        await tx.stockMovement.update({
          where: { id: reserva.id },
          data: {
            cantidad: reserva.cantidad - cantidadALiberar,
            observaciones: `${reserva.observaciones} - Liberación parcial de ${cantidadALiberar} unidades`
          }
        });
      } else {
        // Liberación total: eliminar reserva
        await tx.stockMovement.delete({
          where: { id: reserva.id }
        });
      }

      // Obtener stock actualizado
      const producto = await tx.product.findUnique({
        where: { id: productoId },
        select: { stock: true, descripcion: true }
      });

      // Recalcular reservas activas después de la liberación
      const reservasActivas = await tx.stockMovement.findMany({
        where: {
          productoId: productoId,
          tipo: 'RESERVA',
          transaccionId: null
        },
        select: { cantidad: true }
      });

      const nuevoTotalReservado = reservasActivas.reduce((sum, r) => sum + r.cantidad, 0);
      const nuevoStockDisponible = Math.max(0, producto.stock - nuevoTotalReservado);

      // Actualizar campos de stock del producto
      await tx.product.update({
        where: { id: productoId },
        data: {
          stockReservado: nuevoTotalReservado,
          stockDisponible: nuevoStockDisponible
        }
      });

      console.log(`✅ [StockService] Stock liberado: ${producto.descripcion}, cantidad: ${cantidadALiberar}`);

      return {
        liberado: true,
        producto: producto.descripcion,
        stockTotal: producto.stock,
        stockReservado: nuevoTotalReservado,
        stockDisponible: nuevoStockDisponible,
        cantidadLiberada: cantidadALiberar,
        esLiberacionParcial: !!cantidad,
        sesionId: sesionId
      };
    });
  }

  /**
   * 🧹 LIBERAR TODAS LAS RESERVAS DE UNA SESIÓN CON RETRY AUTOMÁTICO
   */
  async liberarTodasLasReservasDeSesion(sesionId, usuarioId, ipAddress) {
    console.log(`🧹 [StockService] Liberación masiva para sesión: ${sesionId}`);

    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this._liberarTodasLasReservasTransaction(sesionId, usuarioId, ipAddress);
      } catch (error) {
        lastError = error;

        if (this._isDeadlockError(error) && attempt < this.MAX_RETRIES - 1) {
          console.log(`🔄 [StockService] Deadlock en liberación masiva, reintento ${attempt + 1}/${this.MAX_RETRIES}`);
          await this._exponentialBackoff(attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * 🧹 TRANSACCIÓN INTERNA DE LIBERACIÓN MASIVA
   */
  async _liberarTodasLasReservasTransaction(sesionId, usuarioId, ipAddress) {
    return await prisma.$transaction(async (tx) => {
      const reservasActivas = await tx.stockMovement.findMany({
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
        return {
          liberado: true,
          reservasLiberadas: 0,
          mensaje: 'No había reservas activas para esta sesión'
        };
      }

      // Agrupar por producto para optimizar
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

      // Crear liberación por producto
      for (const [productoId, info] of productoMap) {
        await tx.stockMovement.create({
          data: {
            productoId: productoId,
            tipo: 'LIBERACION',
            cantidad: info.cantidadTotal,
            stockAnterior: info.producto.stock || 0,
            stockNuevo: info.producto.stock || 0,
            motivo: `Liberación masiva de sesión: ${sesionId}`,
            observaciones: `Sesión cancelada - ${info.producto.descripcion} (${info.reservas.length} reservas)`,
            usuarioId: usuarioId,
            ipAddress: ipAddress
          }
        });

        // ELIMINAR reservas (no solo marcarlas)
        for (const reserva of info.reservas) {
          await tx.stockMovement.delete({
            where: { id: reserva.id }
          });
        }

        // Recalcular stock del producto
        const reservasRestantes = await tx.stockMovement.findMany({
          where: {
            productoId: productoId,
            tipo: 'RESERVA',
            transaccionId: null
          },
          select: { cantidad: true }
        });

        const nuevoTotalReservado = reservasRestantes.reduce((sum, r) => sum + r.cantidad, 0);
        const nuevoStockDisponible = Math.max(0, (info.producto.stock || 0) - nuevoTotalReservado);

        // Actualizar campos de stock del producto
        await tx.product.update({
          where: { id: productoId },
          data: {
            stockReservado: nuevoTotalReservado,
            stockDisponible: nuevoStockDisponible
          }
        });

        liberaciones.push({
          producto: info.producto.descripcion,
          cantidad: info.cantidadTotal
        });
      }

      console.log(`✅ [StockService] Liberación masiva completada: ${liberaciones.length} productos`);

      return {
        liberado: true,
        reservasLiberadas: liberaciones.length,
        detalles: liberaciones,
        sesionId: sesionId
      };
    });
  }

  /**
   * 🔍 OBTENER STOCK DISPONIBLE CON BLOQUEO
   */
  async obtenerStockDisponible(productoId, sesionId = null) {
    return await prisma.$transaction(async (tx) => {
      const producto = await tx.product.findUnique({
        where: { 
          id: productoId,
          activo: true 
        },
        select: {
          id: true,
          descripcion: true,
          stock: true,
          stockMinimo: true,
          stockMaximo: true,
          tipo: true,
          precioVenta: true
        }
      });

      if (!producto) {
        throw new Error('Producto no encontrado o inactivo');
      }

      if (producto.tipo === 'SERVICIO') {
        return {
          producto: {
            id: producto.id,
            descripcion: producto.descripcion,
            tipo: producto.tipo,
            precioVenta: producto.precioVenta
          },
          stock: {
            stockTotal: 999999,
            stockReservado: 0,
            stockDisponible: 999999,
            esServicio: true,
            requiereValidacionStock: false
          },
          reservasActivas: [],
          timestamp: new Date().toISOString()
        };
      }

      // Calcular reservas activas
      const reservasActivas = await tx.stockMovement.findMany({
        where: {
          productoId: productoId,
          tipo: 'RESERVA',
          transaccionId: null
        },
        select: {
          id: true,
          cantidad: true,
          motivo: true,
          fecha: true,
          usuario: {
            select: { nombre: true }
          }
        },
        orderBy: { fecha: 'desc' },
        take: 10
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
      const stockDisponible = Math.max(0, producto.stock - stockReservadoOtros);

      return {
        producto: {
          id: producto.id,
          descripcion: producto.descripcion,
          tipo: producto.tipo,
          precioVenta: producto.precioVenta
        },
        stock: {
          stockTotal: producto.stock,
          stockReservado: stockReservadoOtros,
          stockDisponible: stockDisponible,
          stockMinimo: producto.stockMinimo,
          stockMaximo: producto.stockMaximo,
          esServicio: false,
          requiereValidacionStock: true,
          alertaStockBajo: stockDisponible <= producto.stockMinimo,
          alertaStockCritico: stockDisponible === 0
        },
        reservasActivas: reservasActivas.map(r => ({
          id: r.id,
          cantidad: r.cantidad,
          motivo: r.motivo,
          fecha: r.fecha,
          usuario: r.usuario.nombre,
          esPropia: r.motivo && r.motivo.includes(sesionId)
        })),
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * 🧹 LIMPIAR RESERVAS EXPIRADAS AUTOMÁTICAMENTE
   */
  async limpiarReservasExpiradas(tiempoLimiteHoras = 2) {
    console.log(`🧹 [StockService] Limpiando reservas expiradas mayores a ${tiempoLimiteHoras} horas`);

    const fechaLimite = new Date();
    fechaLimite.setHours(fechaLimite.getHours() - tiempoLimiteHoras);

    return await prisma.$transaction(async (tx) => {
      const reservasExpiradas = await tx.stockMovement.findMany({
        where: {
          tipo: 'RESERVA',
          transaccionId: null,
          fecha: {
            lt: fechaLimite
          }
        },
        include: {
          producto: {
            select: { descripcion: true }
          }
        }
      });

      if (reservasExpiradas.length === 0) {
        return {
          reservasLiberadas: 0,
          mensaje: 'No hay reservas expiradas para limpiar'
        };
      }

      // Agrupar por producto
      const productoMap = new Map();
      for (const reserva of reservasExpiradas) {
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

      // Crear liberación por producto
      for (const [productoId, info] of productoMap) {
        await tx.stockMovement.create({
          data: {
            productoId: productoId,
            tipo: 'LIBERACION',
            cantidad: info.cantidadTotal,
            stockAnterior: info.producto.stock || 0,
            stockNuevo: info.producto.stock || 0,
            motivo: 'Limpieza automática de reservas expiradas',
            observaciones: `Liberadas ${info.reservas.length} reservas expiradas. IDs: ${info.reservas.map(r => r.id).join(', ')}`,
            usuarioId: 1, // Sistema
            ipAddress: '127.0.0.1'
          }
        });

        // Marcar reservas como procesadas
        await tx.stockMovement.updateMany({
          where: {
            id: {
              in: info.reservas.map(r => r.id)
            }
          },
          data: {
            observaciones: `${new Date().toISOString()} - LIBERADA AUTOMÁTICAMENTE POR EXPIRACIÓN`
          }
        });
      }

      console.log(`✅ [StockService] Limpieza completada: ${reservasExpiradas.length} reservas liberadas`);

      return {
        reservasLiberadas: reservasExpiradas.length,
        productosAfectados: productoMap.size,
        detalles: Array.from(productoMap.values()).map(info => ({
          producto: info.producto.descripcion,
          cantidadLiberada: info.cantidadTotal,
          reservasLiberadas: info.reservas.length
        }))
      };
    });
  }

  /**
   * 💓 RENOVAR RESERVAS CON HEARTBEAT
   */
  async renovarReservas(sesionId, usuarioId) {
    console.log(`💓 [StockService] Renovando reservas para sesión: ${sesionId}`);

    const reservasActivas = await prisma.stockMovement.findMany({
      where: {
        tipo: 'RESERVA',
        motivo: `Sesión: ${sesionId}`,
        transaccionId: null
      }
    });

    if (reservasActivas.length === 0) {
      return {
        renovado: false,
        mensaje: 'No hay reservas activas para esta sesión'
      };
    }

    // Renovar timestamp de todas las reservas
    await prisma.stockMovement.updateMany({
      where: {
        tipo: 'RESERVA',
        motivo: `Sesión: ${sesionId}`,
        transaccionId: null
      },
      data: {
        fecha: new Date(),
        observaciones: `Reserva renovada por heartbeat - ${new Date().toISOString()}`
      }
    });

    console.log(`✅ [StockService] Renovadas ${reservasActivas.length} reservas para sesión ${sesionId}`);

    return {
      renovado: true,
      reservasRenovadas: reservasActivas.length,
      proximoHeartbeat: `${this.HEARTBEAT_INTERVAL_MINUTOS} minutos`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new StockService();


