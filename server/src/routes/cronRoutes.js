// server/src/routes/cronRoutes.js
// 🕐 RUTAS PARA GESTIÓN DE CRON JOBS (ADMIN ONLY)
const express = require('express');
const router = express.Router();
const cronService = require('../services/cronService');
const { verifyToken, checkPermissions } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/responses');

/**
 * GET /api/cron/status
 * Obtener estado de todos los cron jobs
 */
router.get('/status', verifyToken, checkPermissions(['admin']), (req, res) => {
  try {
    const status = cronService.getStatus();

    sendSuccess(res, status, 'Estado de cron jobs obtenido');
  } catch (error) {
    console.error('Error obteniendo estado de cron:', error);
    sendError(res, 'Error obteniendo estado');
  }
});

/**
 * POST /api/cron/run/:jobName
 * Ejecutar un cron job manualmente (para testing)
 */
router.post('/run/:jobName', verifyToken, checkPermissions(['admin']), async (req, res) => {
  try {
    const { jobName } = req.params;

    console.log(`🔧 [CronRoutes] Ejecución manual de "${jobName}" solicitada por ${req.user.nombre}`);

    const resultado = await cronService.runManually(jobName);

    sendSuccess(res, resultado, `Job "${jobName}" ejecutado exitosamente`);
  } catch (error) {
    console.error('Error ejecutando cron manual:', error);

    if (error.message.includes('no encontrado')) {
      return sendError(res, error.message, 404);
    }

    sendError(res, 'Error ejecutando job');
  }
});

/**
 * POST /api/cron/stop-all
 * Detener todos los cron jobs (emergencia)
 */
router.post('/stop-all', verifyToken, checkPermissions(['admin']), (req, res) => {
  try {
    console.log(`🛑 [CronRoutes] Detención de todos los jobs solicitada por ${req.user.nombre}`);

    cronService.stopAll();

    sendSuccess(res, null, 'Todos los cron jobs detenidos');
  } catch (error) {
    console.error('Error deteniendo cron jobs:', error);
    sendError(res, 'Error deteniendo jobs');
  }
});

/**
 * POST /api/cron/restart
 * Reiniciar todos los cron jobs
 */
router.post('/restart', verifyToken, checkPermissions(['admin']), (req, res) => {
  try {
    console.log(`🔄 [CronRoutes] Reinicio de jobs solicitado por ${req.user.nombre}`);

    cronService.stopAll();
    cronService.initialize();

    const status = cronService.getStatus();

    sendSuccess(res, status, 'Cron jobs reiniciados exitosamente');
  } catch (error) {
    console.error('Error reiniciando cron jobs:', error);
    sendError(res, 'Error reiniciando jobs');
  }
});

module.exports = router;
