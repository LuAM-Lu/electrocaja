// server/src/services/cronService.js
// 🕐 SERVICIO DE TAREAS PROGRAMADAS (CRON JOBS)
const cron = require('node-cron');
const stockService = require('./stockService');

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

    // Job 1: Limpieza de reservas expiradas cada 1 hora
    this.scheduleReservasExpiradasCleanup();

    // Job 2: Heartbeat de verificación cada 30 minutos
    this.scheduleHealthCheck();

    this.isInitialized = true;
    console.log(`✅ [CronService] ${this.jobs.size} tareas programadas activas`);
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

      default:
        throw new Error(`Job "${jobName}" no encontrado`);
    }
  }
}

// Exportar singleton
module.exports = new CronService();
