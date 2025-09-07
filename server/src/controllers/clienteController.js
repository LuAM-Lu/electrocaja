// server/src/controllers/clienteController.js
const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responses');

// ===================================
// 📋 OBTENER TODOS LOS CLIENTES
// ===================================
const obtenerClientes = async (req, res) => {
  try {
    const { activo, search, page = 1, limit = 1000 } = req.query;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where = {};
    
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { cedula_rif: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.cliente.count({ where })
    ]);

    sendSuccess(res, {
  data: {
    clientes,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  }
});

  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    sendError(res, 'Error obteniendo clientes');
  }
};

// ===================================
// 📝 CREAR CLIENTE
// ===================================
const crearCliente = async (req, res) => {
  try {
    const { cedula_rif, nombre, telefono, email, direccion, tipo } = req.body;

    // Validaciones básicas
    if (!cedula_rif || !nombre || !tipo) {
      return sendError(res, 'Cédula/RIF, nombre y tipo son requeridos', 400);
    }

    if (!['persona', 'empresa'].includes(tipo)) {
      return sendError(res, 'Tipo debe ser "persona" o "empresa"', 400);
    }

    // Verificar si ya existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { cedula_rif: cedula_rif.toUpperCase() }
    });

    if (clienteExistente) {
      return sendError(res, 'Ya existe un cliente con esta cédula/RIF', 409);
    }

    // Crear cliente
    const cliente = await prisma.cliente.create({
      data: {
        cedula_rif: cedula_rif.toUpperCase(),
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null,
        email: email?.toLowerCase().trim() || null,
        direccion: direccion?.trim() || null,
        tipo
      }
    });

    sendSuccess(res, { cliente }, 'Cliente creado exitosamente', 201);

  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    
    if (error.code === 'P2002') {
      return sendError(res, 'Ya existe un cliente con esta cédula/RIF', 409);
    }
    
    sendError(res, 'Error creando cliente');
  }
};

// ===================================
// ✏️ ACTUALIZAR CLIENTE
// ===================================
const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula_rif, nombre, telefono, email, direccion, tipo, activo } = req.body;

    // Verificar que existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!clienteExistente) {
      return sendError(res, 'Cliente no encontrado', 404);
    }

    // Preparar datos para actualizar
    const dataToUpdate = {};
    
    if (cedula_rif !== undefined) dataToUpdate.cedula_rif = cedula_rif.toUpperCase();
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (telefono !== undefined) dataToUpdate.telefono = telefono?.trim() || null;
    if (email !== undefined) dataToUpdate.email = email?.toLowerCase().trim() || null;
    if (direccion !== undefined) dataToUpdate.direccion = direccion?.trim() || null;
    if (tipo !== undefined) {
      if (!['persona', 'empresa'].includes(tipo)) {
        return sendError(res, 'Tipo debe ser "persona" o "empresa"', 400);
      }
      dataToUpdate.tipo = tipo;
    }
    if (activo !== undefined) dataToUpdate.activo = activo;

    // Actualizar
    const clienteActualizado = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    sendSuccess(res, clienteActualizado, 'Cliente actualizado exitosamente');

  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
    
    if (error.code === 'P2002') {
      return sendError(res, 'Ya existe un cliente con esta cédula/RIF', 409);
    }
    
    sendError(res, 'Error actualizando cliente');
  }
};

// ===================================
// 🗑️ ELIMINAR/DESACTIVAR CLIENTE
// ===================================
const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { forzar = false } = req.query;

    // Verificar que existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!cliente) {
      return sendError(res, 'Cliente no encontrado', 404);
    }

    // TODO: Verificar si tiene transacciones asociadas
    // const tieneTransacciones = await prisma.transaccion.count({
    //   where: { clienteId: parseInt(id) }
    // });

    if (forzar === 'true') {
      // Eliminación física (peligroso)
      await prisma.cliente.delete({
        where: { id: parseInt(id) }
      });
      sendSuccess(res, null, 'Cliente eliminado permanentemente');
    } else {
      // Desactivación (recomendado)
      const clienteDesactivado = await prisma.cliente.update({
        where: { id: parseInt(id) },
        data: { activo: false }
      });
      sendSuccess(res, clienteDesactivado, 'Cliente desactivado exitosamente');
    }

  } catch (error) {
    console.error('❌ Error eliminando cliente:', error);
    sendError(res, 'Error eliminando cliente');
  }
};

// ===================================
// 👁️ OBTENER CLIENTE POR ID
// ===================================
const obtenerClientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!cliente) {
      return sendError(res, 'Cliente no encontrado', 404);
    }

    sendSuccess(res, cliente);

  } catch (error) {
    console.error('❌ Error obteniendo cliente:', error);
    sendError(res, 'Error obteniendo cliente');
  }
};

module.exports = {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerClientePorId
};