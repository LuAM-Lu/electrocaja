const prisma = require('../config/database');

// Helper para respuestas exitosas
const sendSuccess = (res, data, message = 'Operación exitosa') => {
  res.json({ success: true, message, data });
};

// Helper para respuestas de error
const sendError = (res, message, statusCode = 400) => {
  res.status(statusCode).json({ success: false, message });
};

// ===================================
// 📝 CREAR SOLICITUD DE DESCUENTO
// ===================================
const crearSolicitudDescuento = async (req, res) => {
  try {
    const {
      sesionId,
      ventaData,
      items,
      cliente,
      tipoDescuento,
      montoDescuento,
      monedaDescuento,
      porcentajeDescuento,
      motivo,
      totalVenta,
      totalConDescuento,
      tasaCambio
    } = req.body;

    const usuarioId = parseInt(req.user.userId || req.user.id);

    // Validaciones
    if (!sesionId || !ventaData || !items || !motivo) {
      return sendError(res, 'Faltan datos requeridos', 400);
    }

    if (!tipoDescuento || !montoDescuento || montoDescuento <= 0) {
      return sendError(res, 'Datos de descuento inválidos', 400);
    }

    // Verificar si ya existe una solicitud pendiente para esta sesión
    const solicitudExistente = await prisma.discountRequest.findUnique({
      where: { sesionId },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    if (solicitudExistente) {
      // Si hay una solicitud pendiente, rechazar
      if (solicitudExistente.estado === 'PENDIENTE') {
        return sendError(res, 'Ya existe una solicitud pendiente para esta venta', 400);
      }
      
      // Si la solicitud anterior fue rechazada o cancelada, actualizar a PENDIENTE
      if (solicitudExistente.estado === 'RECHAZADO' || solicitudExistente.estado === 'CANCELADO') {
        const solicitudActualizada = await prisma.discountRequest.update({
          where: { sesionId },
          data: {
            estado: 'PENDIENTE',
            ventaData,
            items,
            cliente,
            tipoDescuento,
            montoDescuento: parseFloat(montoDescuento),
            monedaDescuento,
            porcentajeDescuento: porcentajeDescuento ? parseFloat(porcentajeDescuento) : null,
            motivo,
            totalVenta: parseFloat(totalVenta),
            totalConDescuento: parseFloat(totalConDescuento),
            tasaCambio: parseFloat(tasaCambio),
            // Limpiar campos de aprobación/rechazo anteriores
            aprobadoPorId: null,
            rechazadoPorId: null,
            motivoRechazo: null,
            aprobadoAt: null,
            rechazadoAt: null
          },
          include: {
            usuario: {
              select: { id: true, nombre: true, email: true, rol: true }
            }
          }
        });

        // 📡 Emitir evento Socket.IO para notificar a todos los admins
        if (req.io) {
          req.io.emit('nueva_solicitud_descuento', {
            solicitud: {
              ...solicitudActualizada,
              montoDescuento: parseFloat(solicitudActualizada.montoDescuento),
              totalVenta: parseFloat(solicitudActualizada.totalVenta),
              totalConDescuento: parseFloat(solicitudActualizada.totalConDescuento),
              tasaCambio: parseFloat(solicitudActualizada.tasaCambio)
            },
            usuario: solicitudActualizada.usuario,
            timestamp: new Date().toISOString()
          });
          console.log('Notificación de solicitud de descuento actualizada enviada');
        }

        return sendSuccess(res, solicitudActualizada, 'Solicitud de descuento actualizada exitosamente');
      }
      
      // Si la solicitud ya fue aprobada pero el usuario canceló el descuento, permitir crear nueva
      if (solicitudExistente.estado === 'APROBADO') {
        // Actualizar la solicitud aprobada a CANCELADO y crear una nueva
        await prisma.discountRequest.update({
          where: { sesionId },
          data: {
            estado: 'CANCELADO'
          }
        });
        // Continuar con la creación de una nueva solicitud
      }
    }

    // Crear solicitud
    const solicitud = await prisma.discountRequest.create({
      data: {
        sesionId,
        usuarioId,
        estado: 'PENDIENTE',
        ventaData,
        items,
        cliente,
        tipoDescuento,
        montoDescuento: parseFloat(montoDescuento),
        monedaDescuento,
        porcentajeDescuento: porcentajeDescuento ? parseFloat(porcentajeDescuento) : null,
        motivo,
        totalVenta: parseFloat(totalVenta),
        totalConDescuento: parseFloat(totalConDescuento),
        tasaCambio: parseFloat(tasaCambio)
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, rol: true }
        }
      }
    });

    // 📡 Emitir evento Socket.IO para notificar a todos los admins
    if (req.io) {
      req.io.emit('nueva_solicitud_descuento', {
        solicitud: {
          ...solicitud,
          montoDescuento: parseFloat(solicitud.montoDescuento),
          totalVenta: parseFloat(solicitud.totalVenta),
          totalConDescuento: parseFloat(solicitud.totalConDescuento),
          tasaCambio: parseFloat(solicitud.tasaCambio)
        },
        usuario: solicitud.usuario,
        timestamp: new Date().toISOString()
      });
      console.log('Notificación de nueva solicitud de descuento enviada');
    }

    sendSuccess(res, solicitud, 'Solicitud de descuento creada exitosamente');
  } catch (error) {
    console.error('Error creando solicitud de descuento:', error);
    sendError(res, 'Error interno del servidor', 500);
  }
};

// ===================================
// ✅ APROBAR SOLICITUD DE DESCUENTO
// ===================================
const aprobarSolicitudDescuento = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    // Verificar que el usuario es admin
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: { rol: true, nombre: true }
    });

    if (usuario.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden aprobar descuentos', 403);
    }

    // Buscar solicitud
    const solicitud = await prisma.discountRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    if (!solicitud) {
      return sendError(res, 'Solicitud no encontrada', 404);
    }

    if (solicitud.estado !== 'PENDIENTE') {
      return sendError(res, `La solicitud ya fue ${solicitud.estado.toLowerCase()}`, 400);
    }

    // Actualizar solicitud como aprobada
    const solicitudAprobada = await prisma.discountRequest.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'APROBADO',
        aprobadoPorId: usuarioId,
        aprobadoAt: new Date()
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        },
        aprobadoPor: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    // 📡 Emitir evento Socket.IO para notificar al usuario que solicitó
    if (req.io) {
      req.io.emit('solicitud_descuento_aprobada', {
        solicitud: {
          ...solicitudAprobada,
          montoDescuento: parseFloat(solicitudAprobada.montoDescuento),
          totalVenta: parseFloat(solicitudAprobada.totalVenta),
          totalConDescuento: parseFloat(solicitudAprobada.totalConDescuento),
          tasaCambio: parseFloat(solicitudAprobada.tasaCambio)
        },
        aprobadoPor: solicitudAprobada.aprobadoPor,
        timestamp: new Date().toISOString()
      });

      // También notificar a todos los admins que la solicitud fue aprobada
      req.io.emit('solicitud_descuento_resuelta', {
        solicitudId: solicitudAprobada.id,
        estado: 'APROBADO',
        aprobadoPor: solicitudAprobada.aprobadoPor,
        timestamp: new Date().toISOString()
      });

      console.log('Notificación de aprobación de descuento enviada');
    }

    sendSuccess(res, solicitudAprobada, 'Solicitud de descuento aprobada exitosamente');
  } catch (error) {
    console.error('Error aprobando solicitud de descuento:', error);
    sendError(res, 'Error interno del servidor', 500);
  }
};

// ===================================
// ❌ RECHAZAR SOLICITUD DE DESCUENTO
// ===================================
const rechazarSolicitudDescuento = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoRechazo } = req.body;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    // Verificar que el usuario es admin
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: { rol: true, nombre: true }
    });

    if (usuario.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden rechazar descuentos', 403);
    }

    // Buscar solicitud
    const solicitud = await prisma.discountRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    if (!solicitud) {
      return sendError(res, 'Solicitud no encontrada', 404);
    }

    if (solicitud.estado !== 'PENDIENTE') {
      return sendError(res, `La solicitud ya fue ${solicitud.estado.toLowerCase()}`, 400);
    }

    // Actualizar solicitud como rechazada
    const solicitudRechazada = await prisma.discountRequest.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'RECHAZADO',
        rechazadoPorId: usuarioId,
        motivoRechazo: motivoRechazo || 'Descuento rechazado por administrador',
        rechazadoAt: new Date()
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        },
        rechazadoPor: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    // 📡 Emitir evento Socket.IO para notificar al usuario que solicitó
    if (req.io) {
      req.io.emit('solicitud_descuento_rechazada', {
        solicitud: {
          ...solicitudRechazada,
          montoDescuento: parseFloat(solicitudRechazada.montoDescuento),
          totalVenta: parseFloat(solicitudRechazada.totalVenta),
          totalConDescuento: parseFloat(solicitudRechazada.totalConDescuento),
          tasaCambio: parseFloat(solicitudRechazada.tasaCambio)
        },
        rechazadoPor: solicitudRechazada.rechazadoPor,
        motivoRechazo: solicitudRechazada.motivoRechazo,
        timestamp: new Date().toISOString()
      });

      // También notificar a todos los admins que la solicitud fue rechazada
      req.io.emit('solicitud_descuento_resuelta', {
        solicitudId: solicitudRechazada.id,
        estado: 'RECHAZADO',
        rechazadoPor: solicitudRechazada.rechazadoPor,
        timestamp: new Date().toISOString()
      });

      console.log('Notificación de rechazo de descuento enviada');
    }

    sendSuccess(res, solicitudRechazada, 'Solicitud de descuento rechazada');
  } catch (error) {
    console.error('Error rechazando solicitud de descuento:', error);
    sendError(res, 'Error interno del servidor', 500);
  }
};

// ===================================
// 🗑️ CANCELAR SOLICITUD DE DESCUENTO
// ===================================
const cancelarSolicitudDescuento = async (req, res) => {
  try {
    const { sesionId } = req.params;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    // Buscar solicitud
    const solicitud = await prisma.discountRequest.findUnique({
      where: { sesionId }
    });

    if (!solicitud) {
      return sendError(res, 'Solicitud no encontrada', 404);
    }

    // Solo el usuario que creó la solicitud puede cancelarla
    if (solicitud.usuarioId !== usuarioId) {
      return sendError(res, 'No tienes permiso para cancelar esta solicitud', 403);
    }

    // Permitir cancelar solicitudes pendientes o aprobadas (cuando el usuario cancela el descuento desde PagosPanel)
    if (solicitud.estado !== 'PENDIENTE' && solicitud.estado !== 'APROBADO') {
      return sendError(res, 'Solo se pueden cancelar solicitudes pendientes o aprobadas', 400);
    }

    // Actualizar solicitud como cancelada
    const solicitudCancelada = await prisma.discountRequest.update({
      where: { sesionId },
      data: {
        estado: 'CANCELADO',
        // Limpiar campos de aprobación si estaba aprobada
        aprobadoPorId: null,
        aprobadoAt: null
      }
    });

    // 📡 Emitir evento Socket.IO para notificar a los admins
    if (req.io) {
      req.io.emit('solicitud_descuento_cancelada', {
        solicitudId: solicitudCancelada.id,
        sesionId: solicitudCancelada.sesionId,
        timestamp: new Date().toISOString()
      });

      console.log('Notificación de cancelación de descuento enviada');
    }

    sendSuccess(res, solicitudCancelada, 'Solicitud de descuento cancelada');
  } catch (error) {
    console.error('Error cancelando solicitud de descuento:', error);
    sendError(res, 'Error interno del servidor', 500);
  }
};

// ===================================
// 📋 OBTENER SOLICITUDES PENDIENTES (PARA ADMINS)
// ===================================
const obtenerSolicitudesPendientes = async (req, res) => {
  try {
    const usuarioId = parseInt(req.user.userId || req.user.id);

    // Verificar que el usuario es admin
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: { rol: true }
    });

    if (usuario.rol !== 'admin') {
      return sendError(res, 'Solo administradores pueden ver solicitudes pendientes', 403);
    }

    // Obtener solicitudes pendientes
    const solicitudes = await prisma.discountRequest.findMany({
      where: {
        estado: 'PENDIENTE'
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, rol: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Convertir Decimal a Number para el frontend
    const solicitudesFormateadas = solicitudes.map(s => ({
      ...s,
      montoDescuento: parseFloat(s.montoDescuento),
      totalVenta: parseFloat(s.totalVenta),
      totalConDescuento: parseFloat(s.totalConDescuento),
      tasaCambio: parseFloat(s.tasaCambio),
      porcentajeDescuento: s.porcentajeDescuento ? parseFloat(s.porcentajeDescuento) : null
    }));

    sendSuccess(res, solicitudesFormateadas, 'Solicitudes pendientes obtenidas');
  } catch (error) {
    console.error('Error obteniendo solicitudes pendientes:', error);
    sendError(res, 'Error interno del servidor', 500);
  }
};

// ===================================
// 📋 OBTENER ESTADO DE SOLICITUD POR SESIÓN
// ===================================
const obtenerEstadoSolicitud = async (req, res) => {
  try {
    const { sesionId } = req.params;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    const solicitud = await prisma.discountRequest.findUnique({
      where: { sesionId },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        },
        aprobadoPor: {
          select: { id: true, nombre: true, email: true }
        },
        rechazadoPor: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    if (!solicitud) {
      return sendSuccess(res, null, 'No hay solicitud para esta sesión');
    }

    // Solo el usuario que creó la solicitud puede verla
    if (solicitud.usuarioId !== usuarioId) {
      return sendError(res, 'No tienes permiso para ver esta solicitud', 403);
    }

    // Convertir Decimal a Number
    const solicitudFormateada = {
      ...solicitud,
      montoDescuento: parseFloat(solicitud.montoDescuento),
      totalVenta: parseFloat(solicitud.totalVenta),
      totalConDescuento: parseFloat(solicitud.totalConDescuento),
      tasaCambio: parseFloat(solicitud.tasaCambio),
      porcentajeDescuento: solicitud.porcentajeDescuento ? parseFloat(solicitud.porcentajeDescuento) : null
    };

    sendSuccess(res, solicitudFormateada, 'Estado de solicitud obtenido');
  } catch (error) {
    console.error('Error obteniendo estado de solicitud:', error);
    sendError(res, 'Error interno del servidor', 500);
  }
};

module.exports = {
  crearSolicitudDescuento,
  aprobarSolicitudDescuento,
  rechazarSolicitudDescuento,
  cancelarSolicitudDescuento,
  obtenerSolicitudesPendientes,
  obtenerEstadoSolicitud
};

