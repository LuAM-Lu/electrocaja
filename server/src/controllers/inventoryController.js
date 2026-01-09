const prisma = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const { processImage, deleteOldImage } = require('../middleware/upload');

// ===================================
// 🔍 OBTENER TODOS LOS PRODUCTOS
// ===================================
const getProducts = async (req, res) => {
  try {
    const {
      search = '',
      categoria = '',
      tipo = '',
      activo = 'true',
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros dinámicos
    const where = {
      activo: activo === 'true',
      ...(search && {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' } },
          { codigoBarras: { contains: search, mode: 'insensitive' } },
          { codigoInterno: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(categoria && { categoria }),
      ...(tipo && { tipo })
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          creadoPor: {
            select: { id: true, nombre: true }
          }
        },
        orderBy: { fechaCreacion: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.product.count({ where })
    ]);

    // Calcular stock disponible para cada producto
    const productsWithAvailableStock = products.map(product => ({
      ...product,
      stockDisponible: product.stock - product.stockReservado
    }));

    res.json({
      success: true,
      data: productsWithAvailableStock,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error en getProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
};

// ===================================
// 📦 CREAR PRODUCTO
// ===================================
const createProduct = async (req, res) => {
  try {
    console.log('🔍 DEBUG createProduct - req.body:', req.body);

    const {
      descripcion,
      tipo = 'PRODUCTO',
      codigoBarras,
      codigoInterno,
      categoria,
      precioCosto,
      precioVenta,
      margenPorcentaje,
      stock,
      stockMinimo,
      stockMaximo,
      ubicacionFisica,
      imagenUrl,
      proveedor,
      telefonoProveedor,
      proveedorFacturaIva,
      observaciones
    } = req.body;

    const usuarioId = req.user.userId;

    // Validaciones básicas
    if (!descripcion || !codigoBarras || !precioCosto || !precioVenta) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: descripcion, codigoBarras, precioCosto, precioVenta'
      });
    }

    // 🔧 VALIDAR CÓDIGOS DUPLICADOS (SOLO PRODUCTOS ACTIVOS)
    const codigosDuplicados = [];

    if (codigoBarras) {
      const existeCodigoBarras = await prisma.product.findFirst({
        where: {
          codigoBarras: codigoBarras,
          activo: true  // ✅ Solo verificar productos activos
        },
        select: { id: true, descripcion: true, codigoBarras: true }
      });
      console.log(`🔍 DEBUG - Código: ${codigoBarras}, Encontrado activo: ${existeCodigoBarras ? 'SÍ' : 'NO'}`);
      if (existeCodigoBarras) {
        codigosDuplicados.push(`Código de barras "${codigoBarras}" ya existe en producto activo: ${existeCodigoBarras.descripcion}`);
      }
    }

    if (codigoInterno) {
      const existeCodigoInterno = await prisma.product.findFirst({
        where: {
          codigoInterno: codigoInterno,
          activo: true  // ✅ Solo verificar productos activos
        },
        select: { id: true, descripcion: true, codigoInterno: true }
      });

      if (existeCodigoInterno) {
        codigosDuplicados.push(`Código interno "${codigoInterno}" ya existe en producto activo: ${existeCodigoInterno.descripcion}`);
      }
    }

    if (codigosDuplicados.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Códigos duplicados encontrados',
        errors: codigosDuplicados
      });
    }

    // Calcular margen si no se proporciona
    const calculatedMargen = margenPorcentaje ||
      ((parseFloat(precioVenta) - parseFloat(precioCosto)) / parseFloat(precioCosto)) * 100;

    // Crear producto
    // Crear producto
    const product = await prisma.product.create({
      data: {
        descripcion,
        tipo,
        codigoBarras,
        codigoInterno,
        categoria,
        precioCosto: parseFloat(precioCosto),
        precioVenta: parseFloat(precioVenta),
        margenPorcentaje: parseFloat(calculatedMargen),
        // ✅ OPCIÓN A: Stock 999 para servicios (disponibilidad ilimitada)
        stock: tipo === 'SERVICIO' ? 999 : parseInt(stock),
        stockReservado: 0,
        // ✅ OPCIÓN A: Stock disponible 999 para servicios
        stockDisponible: tipo === 'SERVICIO' ? 999 : parseInt(stock),
        stockMinimo: parseInt(stockMinimo),
        stockMaximo: parseInt(stockMaximo),
        ubicacionFisica,
        imagenUrl: typeof imagenUrl === 'object' && imagenUrl !== null
          ? (imagenUrl.isTemporary ? '' : (imagenUrl.url || ''))
          : imagenUrl,
        proveedor,
        telefonoProveedor,
        proveedorFacturaIva: req.body.proveedor_factura_iva || false,
        observaciones,
        creadoPor: {
          connect: {
            id: usuarioId
          }
        }
      },
      include: {
        creadoPor: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Registrar movimiento de stock inicial si hay stock (solo para productos, no servicios)
    if (tipo !== 'SERVICIO' && parseInt(stock) > 0) {
      await prisma.stockMovement.create({
        data: {
          productoId: product.id,
          tipo: 'ENTRADA',
          cantidad: parseInt(stock),
          stockAnterior: 0,
          stockNuevo: parseInt(stock),
          motivo: 'Stock inicial',
          usuarioId,
          ipAddress: req.ip
        }
      });
    }



    // 🔄 MANEJAR IMAGEN TEMPORAL - MOVER A DEFINITIVO
    if (typeof req.body.imagenUrl === 'object' && req.body.imagenUrl?.isTemporary) {
      try {
        const { tempFilename, finalName } = req.body.imagenUrl.tempData;

        // Procesar imagen desde temp a products
        const imagePaths = await processImage(
          path.join(__dirname, '../../uploads/temp', tempFilename),
          finalName
        );

        // Actualizar la URL en la base de datos
        await prisma.product.update({
          where: { id: product.id },
          data: { imagenUrl: `/uploads/products/thumbnails/${finalName}` }
        });

        console.log('✅ Imagen movida y URL actualizada:', finalName);
      } catch (error) {
        console.warn('⚠️ Error moviendo imagen:', error.message);
      }
    }

    // 📡 Emitir evento Socket.IO para sincronizar inventario
    if (req.io) {
      req.io.emit('inventario_actualizado', {
        operacion: 'CREAR',
        producto: product,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Evento inventario_actualizado emitido (CREAR)');
    }

    res.status(201).json({
      success: true,
      message: 'Producto creado correctamente',
      data: product
    });

  } catch (error) {
    console.error('Error en createProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: error.message
    });
  }
};

// ===================================
// ✏️ ACTUALIZAR PRODUCTO
// ===================================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;
    const updateData = req.body;

    // Obtener producto actual
    const currentProduct = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Verificar códigos únicos si se están cambiando
    if (updateData.codigoBarras || updateData.codigoInterno) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          AND: [
            { id: { not: parseInt(id) } },
            {
              OR: [
                ...(updateData.codigoBarras ? [{ codigoBarras: updateData.codigoBarras }] : []),
                ...(updateData.codigoInterno ? [{ codigoInterno: updateData.codigoInterno }] : [])
              ]
            }
          ]
        }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'El código de barras o código interno ya existe'
        });
      }
    }

    // 🔧 FILTRAR CAMPOS PERMITIDOS
    // 🔧 FILTRAR CAMPOS PERMITIDOS SEGÚN EL TIPO
    const allowedFields = [
      'descripcion', 'tipo', 'codigoBarras', 'codigoInterno', 'categoria',
      'precioCosto', 'precioVenta', 'margenPorcentaje',
      'stockMinimo', 'stockMaximo', 'ubicacionFisica', 'imagenUrl',
      'imagenThumbnail', 'proveedor', 'telefonoProveedor',
      'proveedorFacturaIva', 'observaciones', 'activo'
    ];

    // ✅ AGREGAR STOCK SOLO SI NO ES SERVICIO
    if (updateData.tipo !== 'SERVICIO' && currentProduct.tipo !== 'SERVICIO') {
      allowedFields.push('stock');
    }

    // Preparar datos de actualización (solo campos permitidos)
    const finalUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        finalUpdateData[key] = updateData[key];
      }
    });

    // Convertir campos numéricos SOLO si existen en finalUpdateData
    if (finalUpdateData.precioCosto !== undefined) finalUpdateData.precioCosto = parseFloat(finalUpdateData.precioCosto);
    if (finalUpdateData.precioVenta !== undefined) finalUpdateData.precioVenta = parseFloat(finalUpdateData.precioVenta);
    if (finalUpdateData.margenPorcentaje !== undefined) finalUpdateData.margenPorcentaje = parseFloat(finalUpdateData.margenPorcentaje);

    // ✅ SOLO PROCESAR STOCK SI NO ES SERVICIO
    if (finalUpdateData.stock !== undefined && updateData.tipo !== 'SERVICIO' && currentProduct.tipo !== 'SERVICIO') {
      const stockValue = parseInt(finalUpdateData.stock);
      if (isNaN(stockValue)) {
        return res.status(400).json({
          success: false,
          message: 'El valor de stock debe ser un número válido'
        });
      }
      finalUpdateData.stock = stockValue;
    } else if (updateData.tipo === 'SERVICIO' || currentProduct.tipo === 'SERVICIO') {
      // ✅ PARA SERVICIOS, MANTENER STOCK EN 999 (ILIMITADO)
      finalUpdateData.stock = 999;
    }

    if (finalUpdateData.stockMinimo !== undefined) finalUpdateData.stockMinimo = parseInt(finalUpdateData.stockMinimo);
    if (finalUpdateData.stockMaximo !== undefined) finalUpdateData.stockMaximo = parseInt(finalUpdateData.stockMaximo);

    // ✅ REMOVER stockDisponible - se calcula automáticamente
    if ('stockDisponible' in finalUpdateData) {
      delete finalUpdateData.stockDisponible;
    }

    // Manejar imagenUrl si es objeto temporal
    if (finalUpdateData.imagenUrl && typeof finalUpdateData.imagenUrl === 'object') {
      if (finalUpdateData.imagenUrl.isTemporary) {
        finalUpdateData.imagenUrl = finalUpdateData.imagenUrl.url || finalUpdateData.imagenUrl.tempData?.tempPath || '';
      } else {
        finalUpdateData.imagenUrl = finalUpdateData.imagenUrl.url || '';
      }
    }

    console.log('🔍 DEBUG - Datos finales para actualizar:', {
      id: parseInt(id),
      tipoProducto: currentProduct.tipo,
      finalUpdateData: JSON.stringify(finalUpdateData, null, 2)
    });
    // Actualizar producto
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: finalUpdateData,
      include: {
        creadoPor: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Registrar cambios para auditoría
    const changes = [];
    for (const [field, newValue] of Object.entries(updateData)) {
      if (currentProduct[field] !== newValue) {
        changes.push({
          productoId: parseInt(id),
          campo: field,
          valorAnterior: String(currentProduct[field] || ''),
          valorNuevo: String(newValue || ''),
          usuarioId,
          ipAddress: req.ip,
          motivo: 'Edición manual'
        });
      }
    }

    if (changes.length > 0) {
      await prisma.productChange.createMany({
        data: changes
      });
    }

    // 📡 Emitir evento Socket.IO para sincronizar inventario
    if (req.io) {
      req.io.emit('inventario_actualizado', {
        operacion: 'EDITAR',
        producto: updatedProduct,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Evento inventario_actualizado emitido (EDITAR)');
    }

    res.json({
      success: true,
      message: 'Producto actualizado correctamente',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Error en updateProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
};

// ===================================
// 🗑️ ELIMINAR PRODUCTO (SOFT DELETE)
// ===================================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Verificar si tiene stock reservado (ventas en espera)
    if (product.stockReservado > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Hay ${product.stockReservado} unidades reservadas en ventas en espera`
      });
    }

    // 🔍 VERIFICACIÓN EXHAUSTIVA para HARD DELETE seguro
    const motivo = req.body.motivo || 'ELIMINACION_MANUAL';

    const verificarRelaciones = await Promise.all([
      prisma.transactionItem.count({ where: { productoId: parseInt(id) } }),
      prisma.stockMovement.count({ where: { productoId: parseInt(id) } }),
      prisma.pendingSaleItem.count({ where: { productoId: parseInt(id) } }),
      prisma.productChange.count({ where: { productoId: parseInt(id) } })
    ]);

    const [transacciones, movimientos, ventasEspera, cambios] = verificarRelaciones;
    const tieneRelaciones = transacciones > 0 || movimientos > 0 || ventasEspera > 0 || cambios > 0;

    console.log(`🔍 Verificación para producto ${id}:`, {
      transacciones, movimientos, ventasEspera, cambios, tieneRelaciones, motivo
    });

    let deletedProduct;
    let tipoEliminacion;

    if (motivo === 'ERROR_REGISTRO' && !tieneRelaciones) {
      // 🔥 HARD DELETE - Liberar códigos de barras
      deletedProduct = await prisma.product.delete({
        where: { id: parseInt(id) }
      });
      tipoEliminacion = 'HARD_DELETE';
      console.log(`🔥 HARD DELETE: ${product.descripcion} - Códigos liberados`);

    } else {
      // 🔒 SOFT DELETE - Mantener historial
      deletedProduct = await prisma.product.update({
        where: { id: parseInt(id) },
        data: {
          activo: false,
          motivoInactivacion: motivo,
          fechaInactivacion: new Date(),
          fechaActualizacion: new Date()
        }
      });
      tipoEliminacion = 'SOFT_DELETE';
      console.log(`🔒 SOFT DELETE: ${product.descripcion} - Historial preservado`);
    }

    // 🔥 HARD DELETE - Liberar códigos de barras
    if (motivo === 'ERROR_REGISTRO' && !tieneRelaciones) {
      deletedProduct = await prisma.$transaction(async (tx) => {
        // Primero eliminar registros de auditoría
        await tx.productChange.deleteMany({
          where: { productoId: parseInt(id) }
        });

        // Luego eliminar el producto
        return await tx.product.delete({
          where: { id: parseInt(id) }
        });
      });
      tipoEliminacion = 'HARD_DELETE';
      console.log(`🔥 HARD DELETE: ${product.descripcion} - Códigos liberados`);

    } else {
      // 🔒 SOFT DELETE - Mantener historial
      deletedProduct = await prisma.$transaction(async (tx) => {
        // Primero registrar el cambio de auditoría
        await tx.productChange.create({
          data: {
            productoId: parseInt(id),
            campo: 'activo',
            valorAnterior: 'true',
            valorNuevo: 'false',
            usuarioId,
            ipAddress: req.ip,
            motivo: motivo || 'Eliminación de producto'
          }
        });

        // Luego hacer soft delete del producto
        return await tx.product.update({
          where: { id: parseInt(id) },
          data: {
            activo: false,
            motivoInactivacion: motivo,
            fechaInactivacion: new Date(),
            fechaActualizacion: new Date()
          }
        });
      });
      tipoEliminacion = 'SOFT_DELETE';
      console.log(`🔒 SOFT DELETE: ${product.descripcion} - Historial preservado`);
    }

    // 📡 Emitir evento Socket.IO para sincronizar inventario
    if (req.io) {
      req.io.emit('inventario_actualizado', {
        operacion: 'ELIMINAR',
        producto: product,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Evento inventario_actualizado emitido (ELIMINAR)');
    }

    res.json({
      success: true,
      message: 'Producto eliminado correctamente',
      data: deletedProduct
    });

  } catch (error) {
    console.error('Error en deleteProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
};

// ===================================
// 📊 OBTENER PRODUCTO POR ID
// ===================================
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        creadoPor: {
          select: { id: true, nombre: true }
        },
        movimientosStock: {
          include: {
            usuario: {
              select: { id: true, nombre: true }
            }
          },
          orderBy: { fecha: 'desc' },
          take: 10 // Últimos 10 movimientos
        },
        cambiosProducto: {
          include: {
            usuario: {
              select: { id: true, nombre: true }
            }
          },
          orderBy: { fecha: 'desc' },
          take: 20 // Últimos 20 cambios
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Calcular stock disponible
    const productWithAvailableStock = {
      ...product,
      stockDisponible: product.stock - product.stockReservado
    };

    res.json({
      success: true,
      data: productWithAvailableStock
    });

  } catch (error) {
    console.error('Error en getProductById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
};

// ===================================
// 📦 AJUSTAR STOCK
// ===================================
const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, observaciones } = req.body;
    const usuarioId = req.user.userId;

    if (!cantidad || cantidad === 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad de ajuste es requerida y debe ser diferente de 0'
      });
    }

    // Obtener producto actual
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const cantidadAjuste = parseInt(cantidad);
    const nuevoStock = product.stock + cantidadAjuste;

    // Validar que el stock no quede negativo
    if (nuevoStock < 0) {
      return res.status(400).json({
        success: false,
        message: `El ajuste resultaría en stock negativo. Stock actual: ${product.stock}`
      });
    }

    // Validar que no se afecte stock reservado
    const nuevoStockDisponible = nuevoStock - product.stockReservado;
    if (nuevoStockDisponible < 0) {
      return res.status(400).json({
        success: false,
        message: `El ajuste afectaría stock reservado. Stock reservado: ${product.stockReservado}`
      });
    }

    // Actualizar stock
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        stock: nuevoStock,
        stockDisponible: nuevoStockDisponible
      }
    });

    // Registrar movimiento de stock
    await prisma.stockMovement.create({
      data: {
        productoId: parseInt(id),
        tipo: cantidadAjuste > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
        cantidad: cantidadAjuste,
        stockAnterior: product.stock,
        stockNuevo: nuevoStock,
        motivo: motivo || (cantidadAjuste > 0 ? 'Ajuste de inventario positivo' : 'Ajuste de inventario negativo'),
        observaciones,
        usuarioId,
        ipAddress: req.ip
      }
    });

    // Registrar cambio para auditoría
    await prisma.productChange.create({
      data: {
        productoId: parseInt(id),
        campo: 'stock',
        valorAnterior: String(product.stock),
        valorNuevo: String(nuevoStock),
        usuarioId,
        ipAddress: req.ip,
        motivo: 'Ajuste de stock manual'
      }
    });

    res.json({
      success: true,
      message: `Stock ajustado correctamente. ${cantidadAjuste > 0 ? 'Agregado' : 'Reducido'}: ${Math.abs(cantidadAjuste)} unidades`,
      data: {
        ...updatedProduct,
        stockDisponible: nuevoStockDisponible
      }
    });

  } catch (error) {
    console.error('Error en adjustStock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al ajustar stock',
      error: error.message
    });
  }
};

// ===================================
// 🔍 BUSCAR PRODUCTOS (Para modal de ventas)
// ===================================
const searchProducts = async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const products = await prisma.product.findMany({
      where: {
        activo: true,
        OR: [
          { descripcion: { contains: q, mode: 'insensitive' } },
          { codigoBarras: { contains: q, mode: 'insensitive' } },
          { codigoInterno: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        descripcion: true,
        codigoBarras: true,
        precioVenta: true,
        stock: true,
        stockReservado: true,
        tipo: true,
        imagenUrl: true
      },
      take: parseInt(limit),
      orderBy: [
        { descripcion: 'asc' }
      ]
    });

    // Calcular stock disponible
    const productsWithAvailableStock = products.map(product => ({
      ...product,
      stockDisponible: product.stock - product.stockReservado
    }));

    res.json({
      success: true,
      data: productsWithAvailableStock
    });

  } catch (error) {
    console.error('Error en searchProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar productos',
      error: error.message
    });
  }
};

// ===================================
// 📊 OBTENER ESTADÍSTICAS
// ===================================
const getInventoryStats = async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalValue,
      recentMovements
    ] = await Promise.all([
      // Total de productos
      prisma.product.count(),

      // Productos activos
      prisma.product.count({ where: { activo: true } }),

      // Productos con stock bajo
      prisma.product.count({
        where: {
          activo: true,
          stock: { lte: prisma.product.fields.stockMinimo }
        }
      }),

      // Productos sin stock
      prisma.product.count({
        where: {
          activo: true,
          stock: 0
        }
      }),

      // Valor total del inventario
      prisma.product.aggregate({
        where: { activo: true },
        _sum: {
          stock: true
        }
      }),

      // Movimientos recientes
      prisma.stockMovement.findMany({
        include: {
          producto: {
            select: { descripcion: true }
          },
          usuario: {
            select: { nombre: true }
          }
        },
        orderBy: { fecha: 'desc' },
        take: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          totalProducts,
          activeProducts,
          inactiveProducts: totalProducts - activeProducts,
          lowStockProducts,
          outOfStockProducts,
          totalUnits: totalValue._sum.stock || 0
        },
        recentMovements
      }
    });

  } catch (error) {
    console.error('Error en getInventoryStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// ✅ VERSIÓN QUE MANEJA TANTO TEMPORAL COMO DEFINITIVO
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    const filename = req.file.filename;
    const tempPath = req.file.path;
    const isTemporary = req.body.isTemporary === 'true';

    if (isTemporary) {
      // 🆕 MODO TEMPORAL - Solo mover a /temp/
      const tempDir = path.join(__dirname, '../../uploads/temp');
      const tempFinalPath = path.join(tempDir, filename);

      // Asegurar que existe la carpeta temp
      await fs.mkdir(tempDir, { recursive: true });

      // Mover archivo a temp
      await fs.rename(tempPath, tempFinalPath);

      console.log('📁 Imagen temporal guardada:', filename);

      res.json({
        success: true,
        message: 'Imagen temporal subida correctamente',
        data: {
          filename: filename,
          tempPath: `/uploads/temp/${filename}`,
          productCode: req.body.productCode || ''
        }
      });

    } else {
      // 🔄 MODO DEFINITIVO - Procesar normalmente
      const imagePaths = await processImage(tempPath, filename);

      res.json({
        success: true,
        message: 'Imagen subida correctamente',
        data: {
          filename: filename,
          original: imagePaths.original,
          thumbnail: imagePaths.thumbnail
        }
      });
    }

  } catch (error) {
    console.error('Error subiendo imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la imagen',
      error: error.message
    });
  }
};

// ===================================
// 🗑️ ELIMINAR IMAGEN DE PRODUCTO
// ===================================
const deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Eliminar imagen física
    if (product.imagenUrl && !product.imagenUrl.startsWith('data:')) {
      await deleteOldImage(product.imagenUrl);
    }

    // Actualizar BD
    await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        imagenUrl: null,
        imagenThumbnail: null
      }
    });

    res.json({
      success: true,
      message: 'Imagen eliminada correctamente'
    });

  } catch (error) {
    console.error('Error eliminando imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar imagen',
      error: error.message
    });
  }
};

// ===================================
// 🆕 SUBIR IMAGEN TEMPORAL
// ===================================
const uploadTempImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    const filename = req.file.filename;
    const tempPath = req.file.path;

    console.log('📁 Imagen temporal subida:', {
      filename,
      tempPath,
      productCode: req.body.productCode
    });

    res.json({
      success: true,
      message: 'Imagen temporal subida correctamente',
      data: {
        filename: filename,
        tempPath: tempPath,
        productCode: req.body.productCode || ''
      }
    });

  } catch (error) {
    console.error('Error subiendo imagen temporal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la imagen temporal',
      error: error.message
    });
  }
};

// ===================================
// 🔄 MOVER IMAGEN DE TEMP A PRODUCTS
// ===================================
const moveTempToProducts = async (tempFilename, productCode) => {
  try {
    const tempPath = path.join(__dirname, '../../uploads/temp', tempFilename);
    const finalFilename = `${productCode}_${Date.now()}.${tempFilename.split('.').pop()}`;

    // Procesar imagen desde temp
    const imagePaths = await processImage(tempPath, finalFilename);

    // Eliminar archivo temporal
    await fs.unlink(tempPath).catch(() => { });

    console.log('✅ Imagen movida de temp a products:', finalFilename);

    return {
      filename: finalFilename,
      originalPath: imagePaths.original,
      thumbnailPath: imagePaths.thumbnail
    };

  } catch (error) {
    console.error('Error moviendo imagen:', error);
    throw error;
  }
};

// Al final del archivo, antes del module.exports
console.log('Funciones disponibles:', {
  getProducts: typeof getProducts,
  createProduct: typeof createProduct,
  updateProduct: typeof updateProduct,
  deleteProduct: typeof deleteProduct,
  getProductById: typeof getProductById,
  adjustStock: typeof adjustStock,
  searchProducts: typeof searchProducts,
  getInventoryStats: typeof getInventoryStats,
  uploadProductImage: typeof uploadProductImage,
  deleteProductImage: typeof deleteProductImage
});




// ===================================
// 🔄 MOVER IMAGEN DE TEMP A PRODUCTS
// ===================================
const moveTempImage = async (req, res) => {
  try {
    const { tempFilename, productCode } = req.body;

    if (!tempFilename) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de archivo temporal requerido'
      });
    }

    const tempPath = path.join(__dirname, '../../uploads/temp', tempFilename);

    // Verificar que existe el archivo temporal
    try {
      await fs.access(tempPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo temporal no encontrado'
      });
    }

    // Generar nombre final inteligente
    const extension = path.extname(tempFilename);
    const cleanCode = (productCode || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const timestamp = Date.now();
    const finalFilename = `${cleanCode}_${timestamp}${extension}`;

    console.log('🔄 Moviendo imagen:', {
      from: tempFilename,
      to: finalFilename,
      productCode
    });

    // Usar la función processImage existente que maneja original y thumbnail
    const imagePaths = await processImage(tempPath, finalFilename);

    res.json({
      success: true,
      message: 'Imagen movida correctamente',
      data: {
        filename: finalFilename,
        original: imagePaths.original,
        thumbnail: imagePaths.thumbnail
      }
    });

  } catch (error) {
    console.error('Error moviendo imagen temporal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al mover imagen temporal',
      error: error.message
    });
  }
};

// ===================================
// 💰 AJUSTE MASIVO DE PRECIOS
// ===================================
const ajusteMasivo = async (req, res) => {
  try {
    const { ajustes } = req.body;

    if (!ajustes || !Array.isArray(ajustes) || ajustes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron datos de ajuste válidos'
      });
    }

    console.log(`💰 Procesando ajuste masivo de ${ajustes.length} productos...`);

    let actualizados = 0;
    let errores = 0;
    const detalles = [];

    for (const ajuste of ajustes) {
      try {
        const updateData = {
          precio: ajuste.precio,
          updatedAt: new Date()
        };

        // Si se especifica porcentaje de ganancia, guardarlo
        if (ajuste.porcentaje_ganancia !== null && ajuste.porcentaje_ganancia !== undefined) {
          updateData.porcentaje_ganancia = ajuste.porcentaje_ganancia;
        }

        await prisma.product.update({
          where: { id: ajuste.id },
          data: updateData
        });

        actualizados++;
        detalles.push({ id: ajuste.id, status: 'ok', precio: ajuste.precio });

      } catch (error) {
        console.error(`Error actualizando producto ${ajuste.id}:`, error.message);
        errores++;
        detalles.push({ id: ajuste.id, status: 'error', error: error.message });
      }
    }

    console.log(`✅ Ajuste masivo completado: ${actualizados} actualizados, ${errores} errores`);

    // Emitir evento de socket si está disponible
    if (req.io) {
      req.io.emit('inventario_actualizado', {
        operacion: 'AJUSTE_MASIVO',
        cantidad: actualizados,
        usuario: req.user?.nombre || 'Sistema'
      });
    }

    res.json({
      success: true,
      message: `Ajuste masivo completado: ${actualizados} productos actualizados`,
      actualizados,
      errores,
      detalles: errores > 0 ? detalles.filter(d => d.status === 'error') : []
    });

  } catch (error) {
    console.error('❌ Error en ajuste masivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar ajuste masivo',
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  adjustStock,
  searchProducts,
  getInventoryStats,
  uploadProductImage,
  deleteProductImage,
  moveTempImage,
  ajusteMasivo
};