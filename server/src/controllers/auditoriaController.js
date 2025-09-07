// controllers/auditoriaController.js
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

class AuditoriaController {
  
  // Obtener productos para auditoría
  static async getProductosAuditoria(req, res) {
    try {
      const { categoria, proveedor, soloConStock } = req.query;
      
      let whereClause = {
        activo: true
      };

      if (categoria) {
        whereClause.categoria = categoria;
      }

      if (proveedor) {
        whereClause.proveedor = proveedor;
      }

      if (soloConStock === 'true') {
        whereClause.stock = {
          gt: 0
        };
      }

      const productos = await prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          descripcion: true,
          codigoBarras: true,
          categoria: true,
          stock: true,
          stockMinimo: true,
          precioVenta: true,
          imagenThumbnail: true,
          proveedor: true,
          ubicacionFisica: true
        },
        orderBy: [
          { categoria: 'asc' },
          { descripcion: 'asc' }
        ]
      });

      return successResponse(res, productos, `${productos.length} productos obtenidos para auditoría`);

    } catch (error) {
      console.error('Error en getProductosAuditoria:', error);
      return errorResponse(res, 'Error al obtener productos para auditoría', 500);
    }
  }

  // Crear nueva auditoría
  static async crearAuditoria(req, res) {
    try {
      const { 
        auditor, 
        observaciones, 
        productosAuditados 
      } = req.body;

      if (!auditor || !auditor.trim()) {
        return errorResponse(res, 'El auditor es requerido', 400);
      }

      if (!productosAuditados || Object.keys(productosAuditados).length === 0) {
        return errorResponse(res, 'Debe auditar al menos un producto', 400);
      }

      // Crear registro de auditoría
      const auditoria = await prisma.auditoriaInventario.create({
        data: {
          auditor: auditor.trim(),
          observaciones: observaciones || '',
          fechaAuditoria: new Date(),
          estado: 'completada',
          totalProductos: Object.keys(productosAuditados).length
        }
      });

      // Crear detalles de auditoría
      const detallesAuditoria = [];
      
      for (const [productoId, datosAuditoria] of Object.entries(productosAuditados)) {
        if (!datosAuditoria.verificado) continue;

        const producto = await prisma.product.findUnique({
          where: { id: parseInt(productoId) }
        });

        if (!producto) continue;

        const diferencia = (datosAuditoria.cantidadFisica || 0) - producto.stock;

        detallesAuditoria.push({
          auditoriaId: auditoria.id,
          productoId: parseInt(productoId),
          stockSistema: producto.stock,
          stockFisico: datosAuditoria.cantidadFisica || 0,
          diferencia: diferencia,
          valorDiferencia: diferencia * Number(producto.precioVenta),
          observaciones: datosAuditoria.observaciones || null
        });
      }

      if (detallesAuditoria.length > 0) {
        await prisma.auditoriaInventarioDetalle.createMany({
          data: detallesAuditoria
        });
      }

      // Actualizar totales de la auditoría
      const totalDiferencias = detallesAuditoria.filter(d => d.diferencia !== 0).length;
      const valorTotalDiferencias = detallesAuditoria.reduce((sum, d) => sum + Math.abs(d.valorDiferencia), 0);

      await prisma.auditoriaInventario.update({
        where: { id: auditoria.id },
        data: {
          totalDiferencias: totalDiferencias,
          valorTotalDiferencias: valorTotalDiferencias
        }
      });

      return successResponse(res, {
        auditoria: {
          ...auditoria,
          totalDiferencias,
          valorTotalDiferencias
        },
        detalles: detallesAuditoria
      }, 'Auditoría creada exitosamente');

    } catch (error) {
      console.error('Error en crearAuditoria:', error);
      return errorResponse(res, 'Error al crear auditoría', 500);
    }
  }

  // Obtener historial de auditorías
  static async getHistorialAuditorias(req, res) {
    try {
      const { fechaInicio, fechaFin, auditor } = req.query;

      let whereClause = {};

      if (fechaInicio || fechaFin) {
        whereClause.fechaAuditoria = {};
        if (fechaInicio) whereClause.fechaAuditoria.gte = new Date(fechaInicio);
        if (fechaFin) whereClause.fechaAuditoria.lte = new Date(fechaFin);
      }

      if (auditor) {
        whereClause.auditor = {
          contains: auditor,
          mode: 'insensitive'
        };
      }

      const auditorias = await prisma.auditoriaInventario.findMany({
        where: whereClause,
        include: {
          detalles: {
            include: {
              producto: {
                select: {
                  descripcion: true,
                  codigoBarras: true
                }
              }
            }
          }
        },
        orderBy: {
          fechaAuditoria: 'desc'
        }
      });

      return successResponse(res, auditorias, `${auditorias.length} auditorías encontradas`);

    } catch (error) {
      console.error('Error en getHistorialAuditorias:', error);
      return errorResponse(res, 'Error al obtener historial de auditorías', 500);
    }
  }

  // Aplicar ajustes de inventario
  static async aplicarAjustes(req, res) {
    try {
      const { auditoriaId, aplicarTodos = false } = req.body;

      if (!auditoriaId) {
        return errorResponse(res, 'ID de auditoría requerido', 400);
      }

      const auditoria = await prisma.auditoriaInventario.findUnique({
        where: { id: auditoriaId },
        include: {
          detalles: {
            where: {
              diferencia: { not: 0 }
            }
          }
        }
      });

      if (!auditoria) {
        return errorResponse(res, 'Auditoría no encontrada', 404);
      }

      if (auditoria.ajustesAplicados) {
        return errorResponse(res, 'Los ajustes ya han sido aplicados', 400);
      }

      const ajustesAplicados = [];

      for (const detalle of auditoria.detalles) {
        if (!aplicarTodos && Math.abs(detalle.diferencia) < 1) continue;

        // Actualizar stock del producto
        await prisma.product.update({
          where: { id: detalle.productoId },
          data: {
            stock: detalle.stockFisico,
            stockDisponible: detalle.stockFisico
          }
        });

        // Crear movimiento de stock
        await prisma.stockMovement.create({
          data: {
            productoId: detalle.productoId,
            tipo: detalle.diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
            cantidad: Math.abs(detalle.diferencia),
            stockAnterior: detalle.stockSistema,
            stockNuevo: detalle.stockFisico,
            motivo: `Ajuste por auditoría #${auditoriaId}`,
            observaciones: `Auditor: ${auditoria.auditor}`,
            usuarioId: req.user?.id || 1
          }
        });

        ajustesAplicados.push({
          productoId: detalle.productoId,
          diferencia: detalle.diferencia,
          stockAnterior: detalle.stockSistema,
          stockNuevo: detalle.stockFisico
        });
      }

      // Marcar auditoría como aplicada
      await prisma.auditoriaInventario.update({
        where: { id: auditoriaId },
        data: {
          ajustesAplicados: true,
          fechaAplicacionAjustes: new Date()
        }
      });

      return successResponse(res, {
        ajustesAplicados: ajustesAplicados.length,
        detalles: ajustesAplicados
      }, `${ajustesAplicados.length} ajustes aplicados correctamente`);

    } catch (error) {
      console.error('Error en aplicarAjustes:', error);
      return errorResponse(res, 'Error al aplicar ajustes', 500);
    }
  }
}

module.exports = AuditoriaController;