// server/src/controllers/proveedorController.js
const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responses');

// ===================================
// 📋 OBTENER TODOS LOS PROVEEDORES
// ===================================
const obtenerProveedores = async (req, res) => {
  try {
    const { activo, search, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where = {};
    
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { contacto: { contains: search, mode: 'insensitive' } },
        { rif: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [proveedores, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        include: {
          _count: {
            select: { productos: true }
          }
        },
        orderBy: { nombre: 'asc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.proveedor.count({ where })
    ]);

    sendSuccess(res, {
      proveedores,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    sendError(res, 'Error obteniendo proveedores');
  }
};

// ===================================
// 📝 CREAR PROVEEDOR
// ===================================
const crearProveedor = async (req, res) => {
  try {
    const { nombre, contacto, telefono, email, direccion, rif } = req.body;

    // Validaciones básicas
    if (!nombre) {
      return sendError(res, 'El nombre del proveedor es requerido', 400);
    }

    // Verificar RIF único si se proporciona
    if (rif) {
      const proveedorExistente = await prisma.proveedor.findUnique({
        where: { rif: rif.toUpperCase() }
      });

      if (proveedorExistente) {
        return sendError(res, 'Ya existe un proveedor con este RIF', 409);
      }
    }

    // Crear proveedor
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: nombre.trim(),
        contacto: contacto?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.toLowerCase().trim() || null,
        direccion: direccion?.trim() || null,
        rif: rif?.toUpperCase().trim() || null
      }
    });

    sendSuccess(res, proveedor, 'Proveedor creado exitosamente', 201);

  } catch (error) {
    console.error('❌ Error creando proveedor:', error);
    
    if (error.code === 'P2002') {
      return sendError(res, 'Ya existe un proveedor con este RIF', 409);
    }
    
    sendError(res, 'Error creando proveedor');
  }
};

// ===================================
// ✏️ ACTUALIZAR PROVEEDOR
// ===================================
const actualizarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, email, direccion, rif, activo } = req.body;

    // Verificar que existe
    const proveedorExistente = await prisma.proveedor.findUnique({
      where: { id: parseInt(id) }
    });

    if (!proveedorExistente) {
      return sendError(res, 'Proveedor no encontrado', 404);
    }

    // Preparar datos para actualizar
    const dataToUpdate = {};
    
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (contacto !== undefined) dataToUpdate.contacto = contacto?.trim() || null;
    if (telefono !== undefined) dataToUpdate.telefono = telefono?.trim() || null;
    if (email !== undefined) dataToUpdate.email = email?.toLowerCase().trim() || null;
    if (direccion !== undefined) dataToUpdate.direccion = direccion?.trim() || null;
    if (rif !== undefined) dataToUpdate.rif = rif?.toUpperCase().trim() || null;
    if (activo !== undefined) dataToUpdate.activo = activo;

    // Actualizar
    const proveedorActualizado = await prisma.proveedor.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    sendSuccess(res, proveedorActualizado, 'Proveedor actualizado exitosamente');

  } catch (error) {
    console.error('❌ Error actualizando proveedor:', error);
    
    if (error.code === 'P2002') {
      return sendError(res, 'Ya existe un proveedor con este RIF', 409);
    }
    
    sendError(res, 'Error actualizando proveedor');
  }
};

// ===================================
// 🗑️ ELIMINAR/DESACTIVAR PROVEEDOR
// ===================================
const eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { forzar = false } = req.query;

    // Verificar que existe
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    if (!proveedor) {
      return sendError(res, 'Proveedor no encontrado', 404);
    }

    // Verificar si tiene productos asociados
    if (proveedor._count.productos > 0 && forzar !== 'true') {
      return sendError(res, 
        `No se puede eliminar el proveedor porque tiene ${proveedor._count.productos} productos asociados. Use forzar=true para eliminarlo de todas formas.`, 
        409
      );
    }

    if (forzar === 'true') {
      // Primero desasociar productos
      await prisma.product.updateMany({
        where: { proveedorId: parseInt(id) },
        data: { proveedorId: null }
      });

      // Luego eliminar proveedor
      await prisma.proveedor.delete({
        where: { id: parseInt(id) }
      });
      sendSuccess(res, null, 'Proveedor eliminado permanentemente');
    } else {
      // Desactivación (recomendado)
      const proveedorDesactivado = await prisma.proveedor.update({
        where: { id: parseInt(id) },
        data: { activo: false }
      });
      sendSuccess(res, proveedorDesactivado, 'Proveedor desactivado exitosamente');
    }

  } catch (error) {
    console.error('❌ Error eliminando proveedor:', error);
    sendError(res, 'Error eliminando proveedor');
  }
};

// ===================================
// 👁️ OBTENER PROVEEDOR POR ID
// ===================================
const obtenerProveedorPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: parseInt(id) },
      include: {
        productos: {
          select: {
            id: true,
            descripcion: true,
            codigoInterno: true,
            precioVenta: true,
            stock: true,
            activo: true
          },
          where: { activo: true }
        },
        _count: {
          select: { productos: true }
        }
      }
    });

    if (!proveedor) {
      return sendError(res, 'Proveedor no encontrado', 404);
    }

    sendSuccess(res, proveedor);

  } catch (error) {
    console.error('❌ Error obteniendo proveedor:', error);
    sendError(res, 'Error obteniendo proveedor');
  }
};

// ===================================
// 📊 OBTENER PRODUCTOS POR PROVEEDOR
// ===================================
const obtenerProductosPorProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, activo } = req.query;
    const skip = (page - 1) * limit;

    // Verificar que el proveedor existe
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: parseInt(id) }
    });

    if (!proveedor) {
      return sendError(res, 'Proveedor no encontrado', 404);
    }

    // Construir filtros
    const where = { proveedorId: parseInt(id) };
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const [productos, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          descripcion: true,
          codigoInterno: true,
          codigoBarras: true,
          tipo: true,
          precioVenta: true,
          precioCosto: true,
          stock: true,
          stockMinimo: true,
          activo: true,
          fechaCreacion: true,
          ultimaVenta: true
        },
        orderBy: { descripcion: 'asc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.product.count({ where })
    ]);

    sendSuccess(res, {
      proveedor: {
        id: proveedor.id,
        nombre: proveedor.nombre,
        contacto: proveedor.contacto
      },
      productos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo productos del proveedor:', error);
    sendError(res, 'Error obteniendo productos del proveedor');
  }
};

module.exports = {
  obtenerProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  obtenerProveedorPorId,
  obtenerProductosPorProveedor
};