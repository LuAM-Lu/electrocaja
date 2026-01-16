// server/src/services/cronService.js
// 🕐 SERVICIO DE TAREAS PROGRAMADAS (CRON JOBS)
const cron = require('node-cron');
const stockService = require('./stockService');
const autoCierreService = require('./autoCierreService');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * 🚀 INICIALIZAR TODOS LOS CRON JOBS
   */
  initialize() {
    if (this.isInitialized) {
      console.log('⚠️ [CronService] Ya está inicializado');
      return;
    }

    console.log('🕐 [CronService] Inicializando tareas programadas...');

    // Job 1: Auto-cierre de cajas a las 2:00 AM
    this.scheduleAutoCierre();

    // Job 2: Verificación de cajas antiguas abiertas (al iniciar y cada 6 horas)
    this.scheduleCajasAntiguasCheck();

    // Job 3: Limpieza de reservas expiradas cada 1 hora
    this.scheduleReservasExpiradasCleanup();

    // Job 4: Heartbeat de verificación cada 30 minutos
    this.scheduleHealthCheck();

    // Job 5: Actualización automática de tasa de cambio cada 1 hora
    this.scheduleTasaCambioUpdate();

    // Job 6: Limpieza de pedidos cancelados > 1 mes (diario a las 3:00 AM)
    this.schedulePedidosCanceladosCleanup();

    this.isInitialized = true;
    console.log(`✅ [CronService] ${this.jobs.size} tareas programadas activas`);
  }

  /**
   * 🕐 JOB: Auto-cierre automático de cajas a las 2:00 AM
   * Marca cajas abiertas como PENDIENTE_CIERRE_FISICO
   */
  scheduleAutoCierre() {
    const jobName = 'auto-cierre-cajas';

    // Cron: '0 2 * * *' = todos los días a las 2:00 AM
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🕐 [CronService] Ejecutando auto-cierre programado (2:00 AM)...');

        const resultado = await autoCierreService.ejecutarAutoCierre();

        if (resultado.success) {
          console.log(`✅ [CronService] Auto-cierre completado: ${resultado.message}`);

          if (resultado.resultados && resultado.resultados.length > 0) {
            console.log(`📋 [CronService] Cajas afectadas:`);
            resultado.resultados.forEach(r => {
              console.log(`   - Caja ${r.cajaId}: ${r.status} (${r.usuarioResponsable || 'Sin responsable'})`);
            });
          }
        } else {
          console.error('❌ [CronService] Error en auto-cierre:', resultado.error);
        }
      } catch (error) {
        console.error('❌ [CronService] Error ejecutando auto-cierre:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });

    this.jobs.set(jobName, job);
    console.log(`✅ [CronService] Job "${jobName}" programado (2:00 AM diario)`);
  }

  /**
   * 🔍 JOB: Verificar cajas antiguas abiertas
   * Detecta cajas del día anterior que quedaron abiertas y las marca como pendientes
   * Se ejecuta al iniciar y cada 6 horas
   */
  scheduleCajasAntiguasCheck() {
    const jobName = 'cajas-antiguas-check';

    // Ejecutar inmediatamente al iniciar
    this._checkCajasAntiguas();

    // Cron: '0 */6 * * *' = cada 6 horas
    const job = cron.schedule('0 */6 * * *', async () => {
      await this._checkCajasAntiguas();
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });

    this.jobs.set(jobName, job);
    console.log(`✅ [CronService] Job "${jobName}" programado (cada 6 horas + al iniciar)`);
  }

  /**
   * 🔍 HELPER: Verificar y cerrar cajas antiguas
   */
  async _checkCajasAntiguas() {
    try {
      console.log('🔍 [CronService] Verificando cajas antiguas abiertas...');

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Buscar cajas abiertas con fecha diferente a hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const cajasAntiguas = await prisma.caja.findMany({
        where: {
          estado: 'ABIERTA',
          fecha: {
            lt: hoy // Menor que hoy
          }
        },
        include: {
          usuarioApertura: {
            select: { id: true, nombre: true }
          }
        }
      });

      if (cajasAntiguas.length > 0) {
        console.warn(`⚠️ [CronService] ALERTA: ${cajasAntiguas.length} caja(s) antigua(s) encontrada(s)!`);

        for (const caja of cajasAntiguas) {
          const diasAntigua = Math.floor((hoy - new Date(caja.fecha)) / (1000 * 60 * 60 * 24));

          console.warn(`   - Caja ${caja.id}: Abierta desde ${new Date(caja.fecha).toLocaleDateString('es-VE')} (${diasAntigua} día(s) atrás)`);
          console.warn(`     Responsable: ${caja.usuarioApertura?.nombre || 'Desconocido'}`);

          // Marcar como pendiente automáticamente
          await prisma.caja.update({
            where: { id: caja.id },
            data: {
              estado: 'PENDIENTE_CIERRE_FISICO',
              fechaAutoCierre: new Date(),
              requiereConteoFisico: true,
              usuarioResponsableId: caja.usuarioAperturaId,
              motivoAutoCierre: `AUTO_CIERRE_CAJA_ANTIGUA_${diasAntigua}_DIAS`
            }
          });

          console.log(`   ✅ Caja ${caja.id} marcada como PENDIENTE_CIERRE_FISICO`);
        }

        // Notificar via Socket.IO si está disponible
        if (global.io) {
          global.io.emit('cajas_antiguas_detectadas', {
            timestamp: new Date().toISOString(),
            cajas: cajasAntiguas.map(c => ({
              id: c.id,
              fecha: c.fecha,
              usuarioResponsable: c.usuarioApertura?.nombre,
              diasAntigua: Math.floor((hoy - new Date(c.fecha)) / (1000 * 60 * 60 * 24))
            })),
            mensaje: 'Se detectaron cajas antiguas - Requieren cierre físico'
          });
          console.log('📡 Notificación de cajas antiguas enviada via Socket.IO');
        }
      } else {
        console.log('✅ [CronService] No hay cajas antiguas abiertas');
      }

      await prisma.$disconnect();

    } catch (error) {
      console.error('❌ [CronService] Error verificando cajas antiguas:', error);
    }
  }

  /**
   * 🧹 JOB: Limpieza automática de reservas expiradas
   * Se ejecuta cada 1 hora en el minuto 0
   */
  scheduleReservasExpiradasCleanup() {
    const jobName = 'reservas-expiradas-cleanup';

    // Cron: '0 * * * *' = cada hora en el minuto 0
    // Ejemplo: 10:00, 11:00, 12:00, etc.
    const job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('🧹 [CronService] Ejecutando limpieza de reservas expiradas...');

        const resultado = await stockService.limpiarReservasExpiradas(2); // >2 horas

        if (resultado.reservasLiberadas > 0) {
          console.log(`✅ [CronService] Limpieza completada: ${resultado.reservasLiberadas} reservas liberadas`);
          console.log(`📦 [CronService] Productos afectados: ${resultado.productosAfectados}`);

          // Log detallado de productos
          if (resultado.detalles && resultado.detalles.length > 0) {
            resultado.detalles.forEach(detalle => {
              console.log(`   - ${detalle.producto}: ${detalle.cantidadLiberada} unidades (${detalle.reservasLiberadas} reservas)`);
            });
          }
        } else {
          console.log('ℹ️ [CronService] No hay reservas expiradas para limpiar');
        }
      } catch (error) {
        console.error('❌ [CronService] Error en limpieza de reservas:', error);
        // No lanzar error para no detener el cron
      }
    }, {
      scheduled: true,
      timezone: "America/Caracas" // Ajustar según tu zona horaria
    });

    this.jobs.set(jobName, job);
    console.log(`✅ [CronService] Job "${jobName}" programado (cada 1 hora)`);
  }

  /**
   * 💓 JOB: Health check del sistema
   * Se ejecuta cada 30 minutos
   */
  scheduleHealthCheck() {
    const jobName = 'system-health-check';

    // Cron: '*/30 * * * *' = cada 30 minutos
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('💓 [CronService] Ejecutando health check del sistema...');

        // Verificar estado de la base de datos
        const dbCheck = await this._checkDatabase();

        // Estadísticas de reservas activas
        const stats = await this._getReservasStats();

        console.log('✅ [CronService] Health check completado:', {
          database: dbCheck ? 'OK' : 'ERROR',
          reservasActivas: stats.reservasActivas,
          uptime: process.uptime()
        });

        // Alerta si hay muchas reservas activas (posible problema)
        if (stats.reservasActivas > 100) {
          console.warn(`⚠️ [CronService] ALERTA: ${stats.reservasActivas} reservas activas (revisar)`);
        }

      } catch (error) {
        console.error('❌ [CronService] Error en health check:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });

    this.jobs.set(jobName, job);
    console.log(`✅ [CronService] Job "${jobName}" programado (cada 30 minutos)`);
  }

  /**
   * 🗄️ HELPER: Verificar conexión a base de datos
   */
  async _checkDatabase() {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();

      return true;
    } catch (error) {
      console.error('❌ [CronService] Error verificando BD:', error);
      return false;
    }
  }

  /**
   * 📊 HELPER: Obtener estadísticas de reservas
   */
  async _getReservasStats() {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const reservasActivas = await prisma.stockMovement.count({
        where: {
          tipo: 'RESERVA',
          transaccionId: null
        }
      });

      await prisma.$disconnect();

      return {
        reservasActivas,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [CronService] Error obteniendo stats:', error);
      return { reservasActivas: 0 };
    }
  }

  /**
   * 💱 JOB: Actualización automática de tasa BCV cada 1 hora
   * Obtiene la tasa oficial del BCV y la actualiza en el sistema
   * Se ejecuta cada hora en el minuto 0
   */
  scheduleTasaCambioUpdate() {
    const jobName = 'tasa-cambio-update';

    // Ejecutar inmediatamente al iniciar (si han pasado >55 minutos desde la última actualización)
    this._updateTasaCambio();

    // Cron: '0 * * * *' = cada hora en el minuto 0
    const job = cron.schedule('0 * * * *', async () => {
      await this._updateTasaCambio();
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });

    this.jobs.set(jobName, job);
    console.log(`✅ [CronService] Job "${jobName}" programado (cada 1 hora)`);
  }

  /**
   * 💱 HELPER: Actualizar tasa de cambio BCV
   */
  async _updateTasaCambio() {
    try {
      console.log('💱 [CronService] Actualizando tasa de cambio del BCV...');

      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const nuevaTasa = data.promedio;

      if (!nuevaTasa || nuevaTasa <= 0) {
        throw new Error('Tasa inválida recibida del API');
      }

      // Actualizar estado global
      const tasaAnterior = global.estadoApp.tasa_bcv.valor;
      const tasaCambio = Math.abs(nuevaTasa - tasaAnterior);
      const porcentajeCambio = tasaAnterior > 0 ? ((tasaCambio / tasaAnterior) * 100) : 0;

      global.estadoApp.tasa_bcv = {
        valor: nuevaTasa,
        modo: 'AUTO',
        admin: 'CRON_AUTO',
        timestamp: new Date().toISOString()
      };

      // Solo loggear y notificar si hay cambio significativo (>0.01 Bs)
      if (tasaCambio >= 0.01) {
        console.log(`✅ [CronService] Tasa BCV actualizada: $${tasaAnterior.toFixed(2)} → $${nuevaTasa.toFixed(2)} (${porcentajeCambio >= 0.01 ? porcentajeCambio.toFixed(2) + '%' : '<0.01%'})`);

        // Emitir evento Socket.IO a todos los clientes conectados
        if (global.io) {
          global.io.emit('tasa_auto_updated', {
            tasa: nuevaTasa,
            admin: 'Sistema (Auto)',
            timestamp: new Date().toISOString()
          });
          console.log('📡 [CronService] Actualización de tasa enviada a todos los clientes via Socket.IO');
        }
      } else {
        console.log(`ℹ️ [CronService] Tasa BCV sin cambios: $${nuevaTasa.toFixed(2)}`);
      }

      return { success: true, tasa: nuevaTasa };

    } catch (error) {
      console.error('❌ [CronService] Error actualizando tasa BCV:', error.message);

      // Marcar como ERROR si falla
      global.estadoApp.tasa_bcv.modo = 'ERROR';

      return { success: false, error: error.message };
    }
  }

  /**
   * 🗑️ JOB: Limpieza de pedidos cancelados con más de 1 mes
   * Se ejecuta diariamente a las 3:00 AM
   */
  schedulePedidosCanceladosCleanup() {
    const jobName = 'pedidos-cancelados-cleanup';

    // Cron: '0 3 * * *' = todos los días a las 3:00 AM
    const job = cron.schedule('0 3 * * *', async () => {
      await this._cleanupPedidosCancelados();
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });

    this.jobs.set(jobName, job);
    console.log(`✅ [CronService] Job "${jobName}" programado (3:00 AM diario)`);
  }

  /**
   * 🗑️ HELPER: Eliminar pedidos cancelados > 1 mes
   */
  async _cleanupPedidosCancelados() {
    try {
      console.log('🗑️ [CronService] Limpiando pedidos cancelados antiguos...');

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Calcular fecha límite (1 mes atrás)
      const unMesAtras = new Date();
      unMesAtras.setMonth(unMesAtras.getMonth() - 1);

      // Buscar pedidos cancelados con más de 1 mes
      const pedidosAntiguos = await prisma.pedido.findMany({
        where: {
          estado: 'CANCELADO',
          createdAt: {
            lt: unMesAtras
          }
        },
        select: {
          id: true,
          numero: true,
          createdAt: true,
          clienteNombre: true
        }
      });

      if (pedidosAntiguos.length > 0) {
        console.log(`🗑️ [CronService] Encontrados ${pedidosAntiguos.length} pedidos cancelados antiguos`);

        // Eliminar los pedidos
        const resultado = await prisma.pedido.deleteMany({
          where: {
            estado: 'CANCELADO',
            createdAt: {
              lt: unMesAtras
            }
          }
        });

        console.log(`✅ [CronService] ${resultado.count} pedidos cancelados eliminados`);

        // Log de detalles
        pedidosAntiguos.forEach(p => {
          console.log(`   - ${p.numero} (${p.clienteNombre}) - Creado: ${new Date(p.createdAt).toLocaleDateString('es-VE')}`);
        });

      } else {
        console.log('ℹ️ [CronService] No hay pedidos cancelados antiguos para eliminar');
      }

      await prisma.$disconnect();

    } catch (error) {
      console.error('❌ [CronService] Error limpiando pedidos cancelados:', error);
    }
  }

  /**
   * 🛑 DETENER TODOS LOS CRON JOBS
   */
  stopAll() {
    console.log('🛑 [CronService] Deteniendo todas las tareas programadas...');

    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`   - Job "${name}" detenido`);
    }

    this.jobs.clear();
    this.isInitialized = false;
    console.log('✅ [CronService] Todas las tareas detenidas');
  }

  /**
   * 🔍 OBTENER ESTADO DE LOS JOBS
   */
  getStatus() {
    const status = {};

    for (const [name, job] of this.jobs.entries()) {
      status[name] = {
        running: job.running || false,
        // Otros metadatos si están disponibles
      };
    }

    return {
      initialized: this.isInitialized,
      totalJobs: this.jobs.size,
      jobs: status
    };
  }

  /**
   * ▶️ EJECUTAR JOB MANUALMENTE (PARA TESTING)
   */
  async runManually(jobName) {
    console.log(`🔧 [CronService] Ejecutando "${jobName}" manualmente...`);

    switch (jobName) {
      case 'auto-cierre-cajas':
        try {
          const resultado = await autoCierreService.ejecutarAutoCierre();
          console.log('✅ [CronService] Auto-cierre manual completado:', resultado);
          return resultado;
        } catch (error) {
          console.error('❌ [CronService] Error en auto-cierre manual:', error);
          throw error;
        }

      case 'cajas-antiguas-check':
        try {
          await this._checkCajasAntiguas();
          console.log('✅ [CronService] Verificación de cajas antiguas completada');
          return { success: true, message: 'Verificación completada' };
        } catch (error) {
          console.error('❌ [CronService] Error verificando cajas antiguas:', error);
          throw error;
        }

      case 'reservas-expiradas-cleanup':
        try {
          const resultado = await stockService.limpiarReservasExpiradas(2);
          console.log('✅ [CronService] Limpieza manual completada:', resultado);
          return resultado;
        } catch (error) {
          console.error('❌ [CronService] Error en limpieza manual:', error);
          throw error;
        }

      case 'system-health-check':
        try {
          const dbCheck = await this._checkDatabase();
          const stats = await this._getReservasStats();
          const result = { database: dbCheck, stats };
          console.log('✅ [CronService] Health check manual completado:', result);
          return result;
        } catch (error) {
          console.error('❌ [CronService] Error en health check manual:', error);
          throw error;
        }

      case 'tasa-cambio-update':
        try {
          const resultado = await this._updateTasaCambio();
          console.log('✅ [CronService] Actualización manual de tasa completada:', resultado);
          return resultado;
        } catch (error) {
          console.error('❌ [CronService] Error en actualización manual de tasa:', error);
          throw error;
        }

      case 'pedidos-cancelados-cleanup':
        try {
          await this._cleanupPedidosCancelados();
          console.log('✅ [CronService] Limpieza de pedidos cancelados completada');
          return { success: true, message: 'Limpieza completada' };
        } catch (error) {
          console.error('❌ [CronService] Error en limpieza de pedidos:', error);
          throw error;
        }

      default:
        throw new Error(`Job "${jobName}" no encontrado`);
    }
  }
}

// Exportar singleton
module.exports = new CronService();
