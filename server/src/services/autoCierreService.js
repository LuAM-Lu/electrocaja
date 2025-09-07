// services/autoCierreService.js
const prisma = require('../config/database');
const { Decimal } = require('@prisma/client/runtime/library');

const AutoCierreService = {
  // 🕚 EJECUTAR AUTO-CIERRE A LAS 11:55 PM
  ejecutarAutoCierre: async () => {
    try {
      console.log('🕚 Iniciando auto-cierre programado...');
      
      // Buscar cajas abiertas
      const cajasAbiertas = await prisma.caja.findMany({
        where: { estado: 'ABIERTA' },
        include: {
          usuarioApertura: {
            select: { id: true, nombre: true }
          }
        }
      });

      if (cajasAbiertas.length === 0) {
        console.log('✅ No hay cajas abiertas para auto-cerrar');
        return { success: true, message: 'No hay cajas para cerrar' };
      }

      const resultados = [];

      for (const caja of cajasAbiertas) {
        try {
          // Marcar como pendiente de cierre físico
          const cajaActualizada = await prisma.caja.update({
            where: { id: caja.id },
            data: {
              estado: 'PENDIENTE_CIERRE_FISICO',
              fechaAutoCierre: new Date(),
              requiereConteoFisico: true,
              usuarioResponsableId: caja.usuarioAperturaId,
              motivoAutoCierre: 'AUTO_CIERRE_PROGRAMADO_11_55_PM'
            }
          });

          console.log(`✅ Caja ${caja.id} marcada como pendiente - Responsable: ${caja.usuarioApertura.nombre}`);
          
          resultados.push({
            cajaId: caja.id,
            fechaApertura: caja.fecha,
            usuarioResponsable: caja.usuarioApertura.nombre,
            status: 'PENDIENTE_CIERRE_FISICO'
          });

        } catch (error) {
          console.error(`❌ Error auto-cerrando caja ${caja.id}:`, error);
          resultados.push({
            cajaId: caja.id,
            status: 'ERROR',
            error: error.message
          });
        }
      }

      // 📡 NOTIFICAR VIA SOCKET.IO SI ESTÁ DISPONIBLE
      if (global.io) {
        global.io.emit('auto_cierre_ejecutado', {
          timestamp: new Date().toISOString(),
          cajas_afectadas: resultados,
          mensaje: 'Sistema programó auto-cierre - Se requiere conteo físico'
        });
        console.log('📡 Notificación de auto-cierre enviada via Socket.IO');
      }

      return { 
        success: true, 
        message: `Auto-cierre ejecutado para ${resultados.length} cajas`,
        resultados 
      };

    } catch (error) {
      console.error('❌ Error en auto-cierre programado:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // 🔍 VERIFICAR SI HAY CAJAS PENDIENTES
  verificarCajasPendientes: async () => {
    try {
      const cajasPendientes = await prisma.caja.findMany({
        where: { estado: 'PENDIENTE_CIERRE_FISICO' },
        include: {
          usuarioApertura: {
            select: { id: true, nombre: true }
          }
        },
        orderBy: { fechaAutoCierre: 'desc' }
      });

      return {
        success: true,
        cajasPendientes: cajasPendientes.map(caja => ({
          id: caja.id,
          fecha: caja.fecha,
          fechaAutoCierre: caja.fechaAutoCierre,
          usuarioResponsable: caja.usuarioApertura,
          motivoAutoCierre: caja.motivoAutoCierre
        }))
      };

    } catch (error) {
      console.error('❌ Error verificando cajas pendientes:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = AutoCierreService;