const prisma = require('../config/database');

// Función auxiliar para validar y parsear fechas de manera segura
const parsearFechaSegura = (fecha) => {
  if (!fecha) return null;
  
  // Si ya es un objeto Date válido
  if (fecha instanceof Date && !isNaN(fecha.getTime())) {
    return fecha;
  }
  
  // Intentar parsear como string
  const fechaParseada = new Date(fecha);
  
  // Verificar si la fecha es válida
  if (isNaN(fechaParseada.getTime())) {
    return null;
  }
  
  return fechaParseada;
};

// ===================================
// 🔍 LISTAR SERVICIOS
// ===================================
const getServicios = async (req, res) => {
  try {
    const {
      estado,
      tecnicoId,
      clienteId,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros dinámicos
    const where = {};
    if (estado) where.estado = estado;
    if (tecnicoId) where.tecnicoId = parseInt(tecnicoId);
    if (clienteId) where.clienteId = parseInt(clienteId);
    // ✅ Filtrar servicios eliminados (soft-delete)
    where.deletedAt = null;

    if (fechaDesde || fechaHasta) {
      where.fechaIngreso = {};
      if (fechaDesde) where.fechaIngreso.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaIngreso.lte = new Date(fechaHasta);
    }

    const [servicios, total] = await Promise.all([
      prisma.servicioTecnico.findMany({
        where,
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  descripcion: true,
                  codigoBarras: true
                }
              }
            }
          },
          pagos: {
            include: {
              usuario: {
                select: { nombre: true, email: true }
              },
              transaccion: {
                select: { id: true, numeroComprobante: true }
              }
            },
            orderBy: { fecha: 'desc' }
          },
          notas: {
            orderBy: { fecha: 'desc' },
            take: 5
          },
          cliente: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
              email: true
            }
          },
          tecnico: {
            select: { id: true, nombre: true, email: true }
          },
          creadoPor: {
            select: { id: true, nombre: true }
          },
          cajaIngreso: {
            select: { id: true, fecha: true }
          },
          cajaEntrega: {
            select: { id: true, fecha: true }
          }
        },
        orderBy: { fechaIngreso: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.servicioTecnico.count({ where })
    ]);

    res.json({
      success: true,
      data: servicios,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error en getServicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo servicios',
      error: error.message
    });
  }
};

// ===================================
// 🔍 OBTENER SERVICIO POR ID
// ===================================
const getServicioById = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            producto: true
          }
        },
        pagos: {
          include: {
            usuario: {
              select: { nombre: true, email: true }
            },
            transaccion: true
          },
          orderBy: { fecha: 'desc' }
        },
        notas: {
          orderBy: { fecha: 'desc' }
        },
        cliente: true,
        tecnico: {
          select: {
            id: true,
            nombre: true,
            email: true,
            tecnicoConfig: true
          }
        },
        creadoPor: {
          select: { id: true, nombre: true, email: true }
        },
        cajaIngreso: true,
        cajaEntrega: true
      }
    });

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    res.json({
      success: true,
      data: servicio
    });

  } catch (error) {
    console.error('❌ Error en getServicioById:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo servicio',
      error: error.message
    });
  }
};

// ===================================
// ➕ CREAR SERVICIO
// ===================================
const createServicio = async (req, res) => {
  try {
    const {
      cliente,
      dispositivo,
      diagnostico,
      items,
      modalidadPago,
      pagoInicial
    } = req.body;

    // Validar autenticación
    if (!req.user || (!req.user.userId && !req.user.id)) {
      console.error('❌ Usuario no autenticado. req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado. Debes iniciar sesión para crear servicios'
      });
    }

    // Compatibilidad con userId (middleware) e id (legacy)
    const usuarioIdRaw = req.user.userId || req.user.id;
    const usuarioId = parseInt(usuarioIdRaw);

    if (isNaN(usuarioId)) {
      console.error('❌ ID de usuario inválido:', usuarioIdRaw, 'req.user:', req.user);
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    console.log('🔍 Validando datos recibidos:', {
      tieneCliente: !!cliente,
      tieneDispositivo: !!dispositivo,
      tieneDiagnostico: !!diagnostico,
      tieneItems: !!items,
      tieneModalidadPago: !!modalidadPago,
      cantidadItems: items?.length,
      usuarioId
    });

    // Validaciones básicas
    if (!cliente || !dispositivo || !diagnostico || !items || !modalidadPago) {
      const faltantes = [];
      if (!cliente) faltantes.push('cliente');
      if (!dispositivo) faltantes.push('dispositivo');
      if (!diagnostico) faltantes.push('diagnostico');
      if (!items) faltantes.push('items');
      if (!modalidadPago) faltantes.push('modalidadPago');

      console.error('❌ Faltan datos:', faltantes);
      return res.status(400).json({
        success: false,
        message: `Faltan datos requeridos: ${faltantes.join(', ')}`
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un item'
      });
    }

    // Obtener caja actual - buscar cualquier caja abierta, no solo la del usuario
    const cajaActual = await prisma.caja.findFirst({
      where: {
        estado: 'ABIERTA'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!cajaActual) {
      return res.status(400).json({
        success: false,
        message: 'No hay caja abierta. Debes abrir una caja para registrar servicios'
      });
    }

    // Generar número de servicio único
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0));
    const fechaStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Buscar el último servicio del día para obtener el consecutivo correcto
    const ultimoServicio = await prisma.servicioTecnico.findFirst({
      where: {
        numeroServicio: {
          startsWith: `S${fechaStr}`
        }
      },
      orderBy: {
        consecutivoDelDia: 'desc'
      },
      select: {
        consecutivoDelDia: true
      }
    });

    const consecutivo = ultimoServicio ? ultimoServicio.consecutivoDelDia + 1 : 1;
    let numeroServicio = `S${fechaStr}${consecutivo.toString().padStart(3, '0')}`;
    
    // Verificar que el número no exista (por si acaso hay alguna condición de carrera)
    let intentos = 0;
    while (intentos < 10) {
      const existe = await prisma.servicioTecnico.findUnique({
        where: { numeroServicio },
        select: { id: true }
      });
      
      if (!existe) {
        break; // El número es único, podemos usarlo
      }
      
      // Si existe, incrementar el consecutivo y generar uno nuevo
      const nuevoConsecutivo = consecutivo + intentos + 1;
      numeroServicio = `S${fechaStr}${nuevoConsecutivo.toString().padStart(3, '0')}`;
      intentos++;
    }
    
    if (intentos >= 10) {
      // Si después de 10 intentos no encontramos uno único, usar timestamp
      const timestamp = Date.now().toString().slice(-6);
      numeroServicio = `S${fechaStr}${timestamp}`;
    }

    // Calcular totales con precisión
    const totalEstimado = parseFloat(
      items.reduce((sum, item) =>
        sum + (parseFloat(item.cantidad) * parseFloat(item.precio_unitario || item.precioUnitario)),
        0
      ).toFixed(2)
    );

    let totalPagado = 0;
    let saldoPendiente = totalEstimado;

    if (modalidadPago === 'TOTAL_ADELANTADO') {
      totalPagado = totalEstimado;
      saldoPendiente = 0;
    } else if (modalidadPago === 'ABONO' && pagoInicial) {
      totalPagado = parseFloat(pagoInicial.monto);
      saldoPendiente = parseFloat((totalEstimado - totalPagado).toFixed(2));
    }

    // Buscar o crear cliente si tiene cédula
    let clienteId = cliente.id || null;
    if (cliente.cedula_rif && !clienteId) {
      const clienteExistente = await prisma.cliente.findUnique({
        where: { cedula_rif: cliente.cedula_rif }
      });

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      }
    }

    // Crear servicio en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear servicio
      const servicio = await tx.servicioTecnico.create({
        data: {
          numeroServicio,
          consecutivoDelDia: consecutivo,
          clienteId,
          clienteNombre: cliente.nombre,
          clienteTelefono: cliente.telefono,
          clienteEmail: cliente.email || null,
          clienteDireccion: cliente.direccion || null,
          clienteCedulaRif: cliente.cedula_rif,
          dispositivoMarca: dispositivo.marca,
          dispositivoModelo: dispositivo.modelo,
          dispositivoColor: dispositivo.color || null,
          dispositivoImei: dispositivo.imei || 'N/A',
          accesorios: dispositivo.accesorios || [],
          problemas: Array.isArray(dispositivo.problemas)
            ? dispositivo.problemas
            : [dispositivo.problema || ''],
          evidencias: dispositivo.evidencias || [],
          estado: 'RECIBIDO',
          tecnicoAsignado: diagnostico.tecnico,
          tecnicoId: diagnostico.tecnicoId || null,
          observaciones: diagnostico.observaciones || null,
          fechaEntregaEstimada: (() => {
            // Intentar parsear fecha de diferentes campos posibles
            const fechaOriginal = diagnostico.fechaEstimadaEntrega || 
              diagnostico.fechaEstimada || 
              diagnostico.fechaEntrega;
            
            const fechaParseada = parsearFechaSegura(fechaOriginal);
            
            // Si no se pudo parsear, usar mañana por defecto
            if (!fechaParseada && fechaOriginal) {
              console.warn(`⚠️ Fecha inválida recibida: "${fechaOriginal}". Usando fecha por defecto (mañana)`);
            }
            
            return fechaParseada || new Date(Date.now() + 24 * 60 * 60 * 1000);
          })(),
          modalidadPago,
          totalEstimado,
          totalPagado,
          saldoPendiente,
          creadoPorId: usuarioId,
          cajaIngresoId: cajaActual.id
        }
      });

      // 2. Crear items y descontar stock
      for (const item of items) {
        const cantidad = parseInt(item.cantidad);
        const precioUnitario = parseFloat(item.precio_unitario || item.precioUnitario);
        const subtotal = parseFloat((cantidad * precioUnitario).toFixed(2));

        await tx.servicioTecnicoItem.create({
          data: {
            servicioId: servicio.id,
            productoId: item.productoId || item.producto_id || null,
            descripcion: item.descripcion,
            cantidad,
            precioUnitario,
            subtotal,
            esPersonalizado: item.esPersonalizado || item.es_personalizado || false
          }
        });

        // 3. Descontar stock si tiene producto vinculado
        const productoId = item.productoId || item.producto_id;
        if (productoId) {
          const producto = await tx.product.findUnique({
            where: { id: productoId }
          });

          if (producto) {
            const nuevoStock = producto.stock - cantidad;

            await tx.product.update({
              where: { id: productoId },
              data: {
                stock: nuevoStock
              }
            });

            // Crear movimiento de stock
            await tx.stockMovement.create({
              data: {
                productoId,
                tipo: 'SALIDA',
                cantidad,
                stockAnterior: producto.stock,
                stockNuevo: nuevoStock,
                precio: precioUnitario,
                motivo: `Servicio técnico ${numeroServicio}`,
                usuarioId
              }
            });
          }
        }
      }

      // 4. Si hay pago inicial, crear transacción y registro de pago
      if (pagoInicial && (modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO')) {
        const totalBs = parseFloat(pagoInicial.totalBs || 0);
        const totalUsd = parseFloat(pagoInicial.totalUsd || pagoInicial.totalUsdEquivalent || 0);
        const tasaCambio = parseFloat(pagoInicial.tasaCambio || cajaActual.tasaParalelo);

        // Crear transacción en caja
        const transaccion = await tx.transaccion.create({
          data: {
            cajaId: cajaActual.id,
            tipo: 'INGRESO',
            categoria: `Servicio Técnico - ${modalidadPago === 'TOTAL_ADELANTADO' ? 'Pago Total' : 'Abono Inicial'}`,
            observaciones: `Servicio: ${numeroServicio} - ${dispositivo.marca} ${dispositivo.modelo}`,
            totalBs,
            totalUsd,
            tasaCambioUsada: tasaCambio,
            usuarioId,
            clienteId,
            clienteNombre: cliente.nombre,
            codigoVenta: numeroServicio,
            consecutivoDelDia: consecutivo,
            servicioTecnicoId: servicio.id
          }
        });

        // Crear registros de pago
        for (const pago of pagoInicial.pagos) {
          await tx.pago.create({
            data: {
              transaccionId: transaccion.id,
              metodo: pago.metodo,
              monto: parseFloat(pago.monto),
              moneda: pago.moneda,
              banco: pago.banco || null,
              referencia: pago.referencia || null
            }
          });
        }

        // Registrar pago en servicio
        await tx.servicioTecnicoPago.create({
          data: {
            servicioId: servicio.id,
            transaccionId: transaccion.id,
            tipo: 'PAGO_INICIAL',
            monto: totalPagado,
            pagos: pagoInicial.pagos,
            vueltos: pagoInicial.vueltos || [],
            usuarioId
          }
        });

        // Actualizar totales de caja
        const updateData = {
          totalIngresosBs: { increment: totalBs },
          totalIngresosUsd: { increment: totalUsd }
        };

        // Actualizar métodos de pago específicos
        pagoInicial.pagos.forEach(pago => {
          const monto = parseFloat(pago.monto);
          if (pago.metodo === 'pago_movil' || pago.metodo === 'pago movil') {
            updateData.totalPagoMovil = { increment: monto };
          } else if (pago.metodo === 'punto_venta' || pago.metodo === 'punto de venta') {
            updateData.totalPuntoVenta = { increment: monto };
          } else if (pago.metodo === 'zelle') {
            updateData.totalZelle = { increment: monto };
          }
        });

        await tx.caja.update({
          where: { id: cajaActual.id },
          data: updateData
        });
      }

      // 5. Crear nota de recepción o pago inicial
      let contenidoNota = `Dispositivo recibido. ${diagnostico.observaciones || ''}`.trim();
      
      // Si hay pago inicial, agregar información detallada del pago
      if (pagoInicial && (modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO')) {
        const metodoMonedaMap = {
          'efectivo_bs': { label: 'Efectivo Bs', moneda: 'bs', icon: '[ICON:CASH]' },
          'efectivo_usd': { label: 'Efectivo USD', moneda: 'usd', icon: '[ICON:DOLLAR]' },
          'pago_movil': { label: 'Pago Móvil', moneda: 'bs', icon: '[ICON:MOBILE]' },
          'transferencia': { label: 'Transferencia', moneda: 'bs', icon: '[ICON:BANK]' },
          'zelle': { label: 'Zelle', moneda: 'usd', icon: '[ICON:CARD]' },
          'binance': { label: 'Binance', moneda: 'usd', icon: '[ICON:CRYPTO]' },
          'tarjeta': { label: 'Tarjeta', moneda: 'bs', icon: '[ICON:CARD]' }
        };

        const detallePagos = pagoInicial.pagos.map(pago => {
          const metodoInfo = metodoMonedaMap[pago.metodo] || { label: pago.metodo, moneda: 'bs', icon: '[ICON:PAYMENT]' };
          const monto = parseFloat(pago.monto);
          
          // ✅ Mostrar solo la moneda del método de pago, sin conversiones
          let detalle = `${metodoInfo.icon} ${metodoInfo.label}: `;
          
          if (metodoInfo.moneda === 'usd') {
            detalle += `$${monto.toFixed(2)} USD`;
          } else {
            detalle += `${monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`;
          }
          
          if (pago.banco) {
            detalle += ` - ${pago.banco}`;
          }
          if (pago.referencia) {
            detalle += ` - Ref: ${pago.referencia}`;
          }
          return detalle;
        }).join(' | ');

        const tipoPagoTexto = modalidadPago === 'TOTAL_ADELANTADO' ? 'Pago Total' : 'Abono Inicial';
        const saldoRestante = modalidadPago === 'ABONO' 
          ? (totalEstimado - totalPagado) 
          : 0;

        // ✅ Formato del mensaje: mostrar solo USD (sin conversiones visuales)
        contenidoNota += `\n\n[ICON:PAYMENT] ${tipoPagoTexto} registrado: ${totalPagado.toFixed(2)} USD. Métodos: ${detallePagos}.`;
        
        if (saldoRestante > 0) {
          contenidoNota += ` Saldo pendiente: ${saldoRestante.toFixed(2)} USD.`;
        }
        
        contenidoNota += ` Tasa: ${tasaCambio.toFixed(2)} Bs/$`;
      }

      await tx.servicioTecnicoNota.create({
        data: {
          servicioId: servicio.id,
          tipo: 'CAMBIO_ESTADO',
          contenido: contenidoNota,
          tecnico: diagnostico.tecnico,
          estadoNuevo: 'RECIBIDO'
        }
      });

      // Recargar servicio con todas las relaciones
      return await tx.servicioTecnico.findUnique({
        where: { id: servicio.id },
        include: {
          items: true,
          pagos: true,
          notas: true
        }
      });
    });

    console.log(`✅ Servicio ${numeroServicio} creado exitosamente`);

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error en createServicio:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Datos recibidos:', JSON.stringify(req.body, null, 2));
    console.error('❌ Usuario:', req.user);
    
    // Si es un error de Prisma, dar más detalles
    if (error.code) {
      console.error('❌ Código de error:', error.code);
      console.error('❌ Meta:', error.meta);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creando servicio',
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        meta: error.meta
      } : undefined
    });
  }
};

// ===================================
// ✏️ ACTUALIZAR SERVICIO
// ===================================
const updateServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, diagnostico, dispositivo, cliente } = req.body;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    const servicioActual = await prisma.servicioTecnico.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });

    if (!servicioActual) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // No permitir actualizar si ya está entregado
    if (servicioActual.estado === 'ENTREGADO') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar un servicio ya entregado'
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const updateData = {};
      let notaModificacionCreada = null; // ✅ Variable para guardar la nota creada

      // Actualizar información del cliente si se envió
      if (cliente) {
        if (cliente.nombre) updateData.clienteNombre = cliente.nombre;
        if (cliente.telefono) updateData.clienteTelefono = cliente.telefono;
        if (cliente.email) updateData.clienteEmail = cliente.email;
        if (cliente.direccion) updateData.clienteDireccion = cliente.direccion;
      }

      // Actualizar información del dispositivo si se envió
      if (dispositivo) {
        if (dispositivo.marca) updateData.dispositivoMarca = dispositivo.marca;
        if (dispositivo.modelo) updateData.dispositivoModelo = dispositivo.modelo;
        if (dispositivo.color) updateData.dispositivoColor = dispositivo.color;
        if (dispositivo.imei) updateData.dispositivoImei = dispositivo.imei;
        if (dispositivo.accesorios) updateData.accesorios = dispositivo.accesorios;
        if (dispositivo.problemas) updateData.problemas = dispositivo.problemas;
        if (dispositivo.evidencias) updateData.evidencias = dispositivo.evidencias;
      }

      // Actualizar diagnóstico si se envió
      if (diagnostico) {
        if (diagnostico.tecnico) updateData.tecnicoAsignado = diagnostico.tecnico;
        if (diagnostico.tecnicoId) updateData.tecnicoId = diagnostico.tecnicoId;
        if (diagnostico.observaciones) updateData.observaciones = diagnostico.observaciones;
        if (diagnostico.fechaEstimada || diagnostico.fechaEntrega) {
          const fechaParseada = parsearFechaSegura(diagnostico.fechaEstimada || diagnostico.fechaEntrega);
          if (fechaParseada) {
            updateData.fechaEntregaEstimada = fechaParseada;
          }
        }
      }

      // Si hay items nuevos, recalcular total
      if (items && items.length > 0) {
        // Devolver stock de items antiguos y crear movimientos de stock
        for (const itemAntiguo of servicioActual.items) {
          if (itemAntiguo.productoId) {
            const productoAntiguo = await tx.product.findUnique({
              where: { id: itemAntiguo.productoId }
            });

            if (productoAntiguo) {
              await tx.product.update({
                where: { id: itemAntiguo.productoId },
                data: {
                  stock: { increment: itemAntiguo.cantidad }
                }
              });

              // Crear movimiento de stock para devolución
              await tx.stockMovement.create({
                data: {
                  productoId: itemAntiguo.productoId,
                  tipo: 'AJUSTE_POSITIVO',
                  cantidad: itemAntiguo.cantidad,
                  stockAnterior: productoAntiguo.stock,
                  stockNuevo: productoAntiguo.stock + itemAntiguo.cantidad,
                  precio: itemAntiguo.precioUnitario,
                  motivo: `Devolución por edición de servicio ${servicioActual.numeroServicio}`,
                  usuarioId
                }
              });
            }
          }
        }

        // Eliminar items antiguos
        await tx.servicioTecnicoItem.deleteMany({
          where: { servicioId: parseInt(id) }
        });

        // Crear nuevos items y descontar stock
        let nuevoTotal = 0;
        for (const item of items) {
          const cantidad = parseInt(item.cantidad);
          const precioUnitario = parseFloat(item.precio_unitario || item.precioUnitario);
          const subtotal = parseFloat((cantidad * precioUnitario).toFixed(2));
          nuevoTotal += subtotal;
          
          const productoId = item.productoId || item.producto_id || null;

          await tx.servicioTecnicoItem.create({
            data: {
              servicioId: parseInt(id),
              productoId: productoId,
              descripcion: item.descripcion,
              cantidad,
              precioUnitario,
              subtotal,
              esPersonalizado: item.esPersonalizado || false
            }
          });

          // ✅ Descontar stock solo si tiene productoId vinculado
          if (productoId) {
            const producto = await tx.product.findUnique({
              where: { id: productoId }
            });

            if (producto) {
              // Validar que hay suficiente stock disponible
              if (producto.stock < cantidad) {
                throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Requerido: ${cantidad}`);
              }

              await tx.product.update({
                where: { id: productoId },
                data: {
                  stock: { decrement: cantidad }
                }
              });

              // Crear movimiento de stock
              await tx.stockMovement.create({
                data: {
                  productoId,
                  tipo: 'SALIDA',
                  cantidad,
                  stockAnterior: producto.stock,
                  stockNuevo: producto.stock - cantidad,
                  precio: precioUnitario,
                  motivo: `Actualización de servicio técnico ${servicioActual.numeroServicio}`,
                  usuarioId
                }
              });
            }
          }
        }

        // Actualizar totales
        updateData.totalEstimado = parseFloat(nuevoTotal.toFixed(2));
        
        // ✅ Convertir valores Decimal de Prisma a números
        const saldoPendienteActual = parseFloat(servicioActual.saldoPendiente) || 0;
        const totalEstimadoActual = parseFloat(servicioActual.totalEstimado) || 0;
        
        const diferencia = updateData.totalEstimado - totalEstimadoActual;
        updateData.saldoPendiente = parseFloat((saldoPendienteActual + diferencia).toFixed(2));

        // Crear nota de modificación con icono y detalles
        const diferenciaTotal = updateData.totalEstimado - totalEstimadoActual;
        const diferenciaTexto = diferenciaTotal > 0 
          ? `aumentó en $${Math.abs(diferenciaTotal).toFixed(2)}`
          : diferenciaTotal < 0
            ? `disminuyó en $${Math.abs(diferenciaTotal).toFixed(2)}`
            : 'se mantiene igual';
        
        // Detalles de items modificados (comparar por descripción y cantidad)
        const itemsAntiguos = servicioActual.items || [];
        const itemsNuevos = items || [];
        
        // Comparar cantidades de items
        const cantidadItemsAntiguos = itemsAntiguos.length;
        const cantidadItemsNuevos = itemsNuevos.length;
        
        let detalleItems = '';
        if (cantidadItemsNuevos !== cantidadItemsAntiguos) {
          if (cantidadItemsNuevos > cantidadItemsAntiguos) {
            detalleItems += ` Items agregados: ${cantidadItemsNuevos - cantidadItemsAntiguos}.`;
          } else {
            detalleItems += ` Items eliminados: ${cantidadItemsAntiguos - cantidadItemsNuevos}.`;
          }
        }
        
        // Listar items nuevos agregados (los que no estaban antes)
        const descripcionesAntiguas = itemsAntiguos.map(i => (i.descripcion || '').toLowerCase().trim());
        const itemsAgregados = itemsNuevos.filter(nuevo => {
          const descNuevo = (nuevo.descripcion || '').toLowerCase().trim();
          return !descripcionesAntiguas.includes(descNuevo);
        });
        
        if (itemsAgregados.length > 0 && itemsAgregados.length <= 3) {
          detalleItems += ` Nuevos: ${itemsAgregados.map(i => `${i.descripcion} (${i.cantidad})`).join(', ')}.`;
        }
        
        const notaModificacion = await tx.servicioTecnicoNota.create({
          data: {
            servicioId: parseInt(id),
            tipo: 'MODIFICACION_ITEMS',
            contenido: `[ICON:WRENCH] Items actualizados. Total ${diferenciaTexto}. Nuevo total: $${updateData.totalEstimado.toFixed(2)}. Saldo pendiente actualizado: $${updateData.saldoPendiente.toFixed(2)}.${detalleItems}`,
            tecnico: req.user?.nombre || req.user?.email || 'Sistema'
          }
        });
        
        // ✅ Guardar referencia de la nota para emitir después de la transacción
        notaModificacionCreada = notaModificacion;
      }

      // Actualizar servicio
      const servicioActualizado = await tx.servicioTecnico.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          items: true,
          pagos: true,
          notas: {
            orderBy: { fecha: 'desc' }
          }
        }
      });
      
      return {
        servicio: servicioActualizado,
        notaModificacion: notaModificacionCreada
      };
    });

    console.log(`✅ Servicio ${servicioActual.numeroServicio} actualizado`);

    // 📡 Emitir evento Socket.IO para actualizar notas en tiempo real
    if (req.io && resultado?.notaModificacion) {
      // Obtener servicio completo con notas actualizadas
      const servicioCompleto = await prisma.servicioTecnico.findUnique({
        where: { id: parseInt(id) },
        include: {
          notas: {
            orderBy: { fecha: 'desc' }
          }
        }
      });

      req.io.emit('nota_servicio_agregada', {
        servicioId: parseInt(id),
        nota: resultado.notaModificacion,
        servicio: servicioCompleto,
        usuario: req.user?.nombre || req.user?.email || 'Sistema',
        timestamp: new Date().toISOString()
      });
      
      console.log('📡 Evento Socket.IO emitido - nota de modificación de items agregada');
    }

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: resultado.servicio
    });

  } catch (error) {
    console.error('❌ Error en updateServicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando servicio',
      error: error.message
    });
  }
};

// ===================================
// 🔄 CAMBIAR ESTADO
// ===================================
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, nota } = req.body;

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }

    const servicioActual = await prisma.servicioTecnico.findUnique({
      where: { id: parseInt(id) }
    });

    if (!servicioActual) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Validar que si pasa a ENTREGADO, debe estar pagado
    if (estado === 'ENTREGADO' && parseFloat(servicioActual.saldoPendiente) > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede entregar el servicio con saldo pendiente. Debe registrar el pago final primero'
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar estado
      const servicio = await tx.servicioTecnico.update({
        where: { id: parseInt(id) },
        data: {
          estado,
          fechaEntregaReal: estado === 'ENTREGADO' ? new Date() : servicioActual.fechaEntregaReal
        },
        include: {
          items: true,
          pagos: true,
          notas: true
        }
      });

      // Crear nota de cambio de estado con icono según estado
      const estadoIconMap = {
        'RECIBIDO': '[ICON:INBOX]',
        'EN_DIAGNOSTICO': '[ICON:STETHOSCOPE]',
        'ESPERANDO_APROBACION': '[ICON:CLOCK]',
        'EN_REPARACION': '[ICON:WRENCH]',
        'LISTO_RETIRO': '[ICON:CHECK]',
        'ENTREGADO': '[ICON:PACKAGE]'
      };
      
      const iconEstado = estadoIconMap[estado] || '[ICON:FLAG]';
      const contenidoNota = nota || `Estado cambiado de ${servicioActual.estado} a ${estado}`;
      
      await tx.servicioTecnicoNota.create({
        data: {
          servicioId: parseInt(id),
          tipo: 'CAMBIO_ESTADO',
          contenido: `${iconEstado} ${contenidoNota}`,
          tecnico: req.user?.nombre || req.user?.email || 'Sistema',
          estadoAnterior: servicioActual.estado,
          estadoNuevo: estado
        }
      });

      return servicio;
    });

    console.log(`✅ Estado del servicio ${servicioActual.numeroServicio} actualizado a ${estado}`);

    // 📡 Emitir evento Socket.IO para actualizar ModalVerServicio en tiempo real
    if (req.io) {
      // Obtener servicio completo con notas actualizadas (después de la transacción)
      const servicioCompleto = await prisma.servicioTecnico.findUnique({
        where: { id: parseInt(id) },
        include: {
          notas: {
            orderBy: { fecha: 'desc' }
          }
        }
      });

      // Obtener la última nota creada (debe ser la de cambio de estado)
      const ultimaNota = servicioCompleto?.notas?.[0];

      if (ultimaNota) {
        req.io.emit('nota_servicio_agregada', {
          servicioId: parseInt(id),
          nota: ultimaNota,
          servicio: servicioCompleto,
          usuario: req.user?.nombre || req.user?.email,
          timestamp: new Date().toISOString()
        });
        
        console.log('📡 Evento Socket.IO emitido - nota de cambio de estado agregada');
      }
    }

    res.json({
      success: true,
      message: `Estado cambiado a ${estado}`,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error en cambiarEstado:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request params:', req.params);
    console.error('Request body:', req.body);
    console.error('User info:', req.user);
    res.status(500).json({
      success: false,
      message: 'Error cambiando estado',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ===================================
// 💰 REGISTRAR PAGO
// ===================================
const registrarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { pagos, vueltos, tasaCambio, esAbono } = req.body;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    if (!pagos || pagos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un método de pago'
      });
    }

    if (!tasaCambio || parseFloat(tasaCambio) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tasa de cambio inválida o no proporcionada'
      });
    }

    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: parseInt(id) }
    });

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    if (parseFloat(servicio.saldoPendiente) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El servicio no tiene saldo pendiente'
      });
    }

    // Calcular monto del pago con precisión
    let totalBs = 0;
    let totalUsd = 0;
    let montoPago = 0;
    const tasa = parseFloat(tasaCambio);

    // Mapeo de métodos de pago a monedas (fallback si no viene moneda explícita)
    const metodoMonedaMap = {
      'efectivo_bs': 'bs',
      'efectivo_usd': 'usd',
      'pago_movil': 'bs',
      'transferencia': 'bs',
      'zelle': 'usd',
      'binance': 'usd',
      'tarjeta': 'bs'
    };

    pagos.forEach(pago => {
      const monto = parseFloat(pago.monto);
      
      // ✅ Determinar moneda: usar la explícita o determinar por método
      let moneda = pago.moneda;
      if (!moneda) {
        // Si el método contiene "_bs" o "bs", es bolívares
        if (pago.metodo && (pago.metodo.includes('_bs') || pago.metodo.includes('bs'))) {
          moneda = 'bs';
        }
        // Si el método contiene "_usd" o "usd", es dólares
        else if (pago.metodo && (pago.metodo.includes('_usd') || pago.metodo.includes('usd'))) {
          moneda = 'usd';
        }
        // Usar mapeo directo si existe
        else if (metodoMonedaMap[pago.metodo]) {
          moneda = metodoMonedaMap[pago.metodo];
        }
        // Por defecto, asumir bolívares
        else {
          moneda = 'bs';
        }
      }
      
      if (moneda === 'bs') {
        totalBs += monto;
        montoPago += monto / tasa;
      } else {
        totalUsd += monto;
        montoPago += monto;
      }
    });

    montoPago = parseFloat(montoPago.toFixed(2));
    totalBs = parseFloat(totalBs.toFixed(2));
    totalUsd = parseFloat(totalUsd.toFixed(2));

    // Determinar si es abono o pago final
    const esPagoFinal = servicio.estado === 'LISTO_RETIRO' || servicio.estado === 'Listo para Retiro';
    const esAbonoReal = esAbono === true || (!esPagoFinal && montoPago < parseFloat(servicio.saldoPendiente) - 0.01);
    
    // Validar que no exceda saldo pendiente (con margen de 0.01 por redondeo)
    // Para abonos, permitir pagos parciales
    if (!esAbonoReal && montoPago > parseFloat(servicio.saldoPendiente) + 0.01) {
      return res.status(400).json({
        success: false,
        message: `El monto ($${montoPago.toFixed(2)}) excede el saldo pendiente ($${parseFloat(servicio.saldoPendiente).toFixed(2)})`
      });
    }
    
    // Validar monto mínimo para abonos
    if (esAbonoReal && montoPago <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto del abono debe ser mayor a $0.00'
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener caja actual (cualquier caja abierta, no solo la del usuario)
      const cajaActual = await tx.caja.findFirst({
        where: {
          estado: 'ABIERTA'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!cajaActual) {
        throw new Error('No hay caja abierta. Debes abrir una caja para registrar pagos');
      }

      // Generar código de venta único (evitar duplicados) - Formato corto
      const tipoPagoCodigo = esAbonoReal ? 'A' : 'F';
      
      // ✅ Acortar número de servicio: S20251109001 → S1109001 (eliminar año completo)
      const numeroServicioCorto = servicio.numeroServicio.startsWith('S') 
        ? 'S' + servicio.numeroServicio.slice(5) // Eliminar "S2025" y dejar el resto
        : servicio.numeroServicio;
      
      let codigoVenta = `${numeroServicioCorto}-${tipoPagoCodigo}`;
      let intentos = 0;
      
      // Si el código ya existe, agregar un número secuencial corto (A1, A2, F1, F2, etc.)
      while (intentos < 10) {
        const existe = await tx.transaccion.findUnique({
          where: { codigoVenta }
        });
        if (!existe) break;
        
        // Usar número secuencial corto en lugar de timestamp largo
        const numeroSecuencial = intentos + 1;
        codigoVenta = `${numeroServicioCorto}-${tipoPagoCodigo}${numeroSecuencial}`;
        intentos++;
      }
      
      // Si aún hay conflicto después de 10 intentos, usar timestamp corto (últimos 6 dígitos)
      if (intentos >= 10) {
        const timestampCorto = Date.now().toString().slice(-6);
        codigoVenta = `${numeroServicioCorto}-${tipoPagoCodigo}${timestampCorto}`;
      }

      // Crear transacción
      const categoriaTransaccion = esAbonoReal 
        ? 'Servicio Técnico - Abono'
        : 'Servicio Técnico - Pago Final';
      
      const transaccion = await tx.transaccion.create({
        data: {
          cajaId: cajaActual.id,
          tipo: 'INGRESO',
          categoria: categoriaTransaccion,
          observaciones: `${esAbonoReal ? 'Abono' : 'Pago'} - Orden #${servicio.id}`,
          totalBs,
          totalUsd,
          tasaCambioUsada: tasa, // ✅ Guardar tasa de cambio para auditoría
          usuarioId,
          clienteId: servicio.clienteId,
          clienteNombre: servicio.clienteNombre,
          codigoVenta,
          consecutivoDelDia: servicio.consecutivoDelDia || 1,
          descuentoTotal: 0,
          cantidadItems: 0,
          servicioTecnicoId: servicio.id
        }
      });

      // Crear pagos
      for (const pago of pagos) {
        // Determinar moneda basándose en el método de pago si no viene explícitamente
        let moneda = pago.moneda;
        if (!moneda) {
          // Mapeo de métodos de pago a monedas
          const metodoMonedaMap = {
            'efectivo_bs': 'bs',
            'efectivo_usd': 'usd',
            'pago_movil': 'bs',
            'transferencia': 'bs',
            'zelle': 'usd',
            'binance': 'usd',
            'tarjeta': 'bs'
          };
          
          // Si el método contiene "_bs" o "bs", es bolívares
          if (pago.metodo && (pago.metodo.includes('_bs') || pago.metodo.includes('bs'))) {
            moneda = 'bs';
          }
          // Si el método contiene "_usd" o "usd", es dólares
          else if (pago.metodo && (pago.metodo.includes('_usd') || pago.metodo.includes('usd'))) {
            moneda = 'usd';
          }
          // Usar mapeo directo si existe
          else if (metodoMonedaMap[pago.metodo]) {
            moneda = metodoMonedaMap[pago.metodo];
          }
          // Por defecto, asumir bolívares
          else {
            moneda = 'bs';
          }
        }
        
        // Normalizar monto (convertir formato venezolano "13,00" a "13.00")
        const montoNormalizado = typeof pago.monto === 'string' 
          ? parseFloat(pago.monto.replace(',', '.'))
          : parseFloat(pago.monto);
        
        await tx.pago.create({
          data: {
            transaccionId: transaccion.id,
            metodo: pago.metodo,
            monto: montoNormalizado,
            moneda: moneda,
            banco: pago.banco || null,
            referencia: pago.referencia || null
          }
        });
      }

      // Registrar pago en servicio
      // Asegurar que pagos y vueltos sean arrays válidos para JSON
      const pagosJson = Array.isArray(pagos) ? pagos.map(p => ({
        ...p,
        tasaCambioUsada: tasa // ✅ Guardar tasa de cambio en cada pago
      })) : [];
      const vueltosJson = Array.isArray(vueltos) ? vueltos : [];
      
      const tipoPago = esAbonoReal ? 'PAGO_ABONO' : 'PAGO_FINAL';
      
      await tx.servicioTecnicoPago.create({
        data: {
          servicioId: servicio.id,
          transaccionId: transaccion.id,
          tipo: tipoPago,
          monto: montoPago,
          pagos: pagosJson,
          vueltos: vueltosJson.length > 0 ? vueltosJson : null,
          usuarioId,
          tasaCambioUsada: tasa // ✅ Guardar tasa de cambio en el registro de pago
        }
      });

      // Actualizar servicio
      const nuevoSaldo = parseFloat((parseFloat(servicio.saldoPendiente) - montoPago).toFixed(2));
      
      // Solo actualizar estado a ENTREGADO si es pago final y saldo es 0
      const updateData = {
        totalPagado: { increment: montoPago },
        saldoPendiente: Math.max(0, nuevoSaldo)
      };
      
      // Solo marcar como entregado si es pago final y no hay saldo pendiente
      if (!esAbonoReal && nuevoSaldo <= 0.01) {
        updateData.estado = 'ENTREGADO';
        updateData.cajaEntregaId = cajaActual.id;
      }
      
      const servicioActualizado = await tx.servicioTecnico.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          pagos: {
            include: {
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                  email: true
                }
              }
            },
            orderBy: {
              fecha: 'desc'
            }
          },
          items: true,
          notas: {
            orderBy: {
              fecha: 'desc'
            }
          }
        }
      });

      // Actualizar totales de caja
      const updateCajaData = {
        totalIngresosBs: { increment: totalBs },
        totalIngresosUsd: { increment: totalUsd }
      };

      pagos.forEach(pago => {
        const monto = parseFloat(pago.monto);
        if (pago.metodo === 'pago_movil' || pago.metodo === 'pago movil') {
          updateCajaData.totalPagoMovil = { increment: monto };
        } else if (pago.metodo === 'punto_venta' || pago.metodo === 'punto de venta') {
          updateCajaData.totalPuntoVenta = { increment: monto };
        } else if (pago.metodo === 'zelle') {
          updateCajaData.totalZelle = { increment: monto };
        }
      });

      await tx.caja.update({
        where: { id: cajaActual.id },
        data: updateCajaData
      });

      // Agregar nota de pago con información detallada
      const metodoMonedaMap = {
        'efectivo_bs': { label: 'Efectivo Bs', moneda: 'bs', icon: '[ICON:CASH]' },
        'efectivo_usd': { label: 'Efectivo USD', moneda: 'usd', icon: '[ICON:DOLLAR]' },
        'pago_movil': { label: 'Pago Móvil', moneda: 'bs', icon: '[ICON:MOBILE]' },
        'transferencia': { label: 'Transferencia', moneda: 'bs', icon: '[ICON:BANK]' },
        'zelle': { label: 'Zelle', moneda: 'usd', icon: '[ICON:CARD]' },
        'binance': { label: 'Binance', moneda: 'usd', icon: '[ICON:CRYPTO]' },
        'tarjeta': { label: 'Tarjeta', moneda: 'bs', icon: '[ICON:CARD]' }
      };

      // Construir detalle de métodos de pago (sin conversiones, solo la moneda del método)
      const detallePagos = pagos.map(pago => {
        const metodoInfo = metodoMonedaMap[pago.metodo] || { label: pago.metodo, moneda: 'bs', icon: '[ICON:PAYMENT]' };
        const monto = parseFloat(pago.monto);
        
        // ✅ Mostrar solo la moneda del método de pago, sin conversiones
        let detalle = `${metodoInfo.icon} ${metodoInfo.label}: `;
        
        if (metodoInfo.moneda === 'usd') {
          detalle += `$${monto.toFixed(2)} USD`;
        } else {
          detalle += `${monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`;
        }
        
        if (pago.banco) {
          detalle += ` - ${pago.banco}`;
        }
        if (pago.referencia) {
          detalle += ` - Ref: ${pago.referencia}`;
        }
        return detalle;
      }).join(' | ');

      // ✅ Formato del mensaje: mostrar solo USD (sin conversiones visuales)
      const mensajeNota = esAbonoReal
        ? `[ICON:PAYMENT] Abono registrado: ${montoPago.toFixed(2)} USD. Métodos: ${detallePagos}. Saldo restante: ${Math.max(0, nuevoSaldo).toFixed(2)} USD. Tasa: ${tasa.toFixed(2)} Bs/$`
        : `[ICON:PAYMENT] Pago final registrado: ${montoPago.toFixed(2)} USD. Métodos: ${detallePagos}. Saldo restante: ${Math.max(0, nuevoSaldo).toFixed(2)} USD. Tasa: ${tasa.toFixed(2)} Bs/$`;
      
      const notaPagoCreada = await tx.servicioTecnicoNota.create({
        data: {
          servicioId: servicio.id,
          tipo: 'TEXTO',
          contenido: mensajeNota,
          tecnico: req.user?.nombre || req.user?.email || 'Sistema'
        }
      });

      return {
        servicio: servicioActualizado,
        transaccion: transaccion,
        esAbono: esAbonoReal,
        tasaCambioUsada: tasa,
        notaPago: notaPagoCreada
      };
    });

    console.log(`✅ ${resultado.esAbono ? 'Abono' : 'Pago'} registrado para servicio ${servicio.numeroServicio}`);

    // 📡 Emitir evento Socket.IO para actualizar ModalVerServicio en tiempo real (nota de pago)
    if (req.io && resultado.notaPago) {
      // Obtener servicio completo con notas actualizadas
      const servicioCompleto = await prisma.servicioTecnico.findUnique({
        where: { id: servicio.id },
        include: {
          notas: {
            orderBy: { fecha: 'desc' }
          }
        }
      });

      req.io.emit('nota_servicio_agregada', {
        servicioId: servicio.id,
        nota: {
          ...resultado.notaPago,
          fecha: resultado.notaPago.fecha || new Date()
        },
        servicio: servicioCompleto,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      
      console.log('📡 Evento Socket.IO emitido - nota de pago agregada');
    }

    // 📡 Emitir evento Socket.IO para actualizar TransactionTable en tiempo real
    if (req.io) {
      // Obtener transacción completa con pagos para el evento
      const transaccionCompleta = await prisma.transaccion.findUnique({
        where: { id: resultado.transaccion.id },
        include: {
          pagos: true,
          items: true
        }
      });

      // Convertir para el frontend
      const transaccionParaSocket = {
        ...transaccionCompleta,
        totalBs: parseFloat(transaccionCompleta.totalBs),
        totalUsd: parseFloat(transaccionCompleta.totalUsd),
        tasaCambioUsada: parseFloat(transaccionCompleta.tasaCambioUsada),
        servicioTecnicoId: transaccionCompleta.servicioTecnicoId, // ✅ Asegurar que esté presente
        pagos: transaccionCompleta.pagos.map(p => ({
          ...p,
          monto: parseFloat(p.monto)
        }))
      };

      req.io.emit('nueva_transaccion', {
        transaccion: transaccionParaSocket,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString(),
        tipo: 'servicio_tecnico',
        servicioId: servicio.id,
        numeroServicio: servicio.numeroServicio
      });
      
      console.log('📡 Evento Socket.IO emitido - nueva transacción de servicio técnico');
    }

    res.json({
      success: true,
      message: resultado.esAbono ? 'Abono registrado exitosamente' : 'Pago registrado exitosamente',
      data: resultado.servicio
    });

  } catch (error) {
    console.error('❌ Error en registrarPago:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('User ID:', req.user?.userId || req.user?.id);
    console.error('Service ID:', req.params.id);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error registrando pago',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ===================================
// 📝 AGREGAR NOTA TÉCNICA
// ===================================
const agregarNota = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, contenido, archivoUrl } = req.body;

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: 'Tipo es requerido'
      });
    }

    // El contenido puede estar vacío si es solo una imagen o audio
    const contenidoFinal = contenido || (archivoUrl ? 'Archivo adjunto' : '');

    console.log(`📝 Agregando nota al servicio ${id}:`, {
      tipo,
      tieneContenido: !!contenidoFinal,
      tieneArchivo: !!archivoUrl,
      tamañoArchivo: archivoUrl ? Math.round(archivoUrl.length / 1024) + 'KB' : 'N/A'
    });

    const nota = await prisma.servicioTecnicoNota.create({
      data: {
        servicioId: parseInt(id),
        tipo,
        contenido: contenidoFinal,
        archivoUrl: archivoUrl || null,
        tecnico: req.user.nombre
      }
    });

    console.log(`✅ Nota agregada al servicio ${id} - ID: ${nota.id}`);

    // 📡 Emitir evento Socket.IO para actualizar ModalVerServicio en tiempo real
    if (req.io) {
      // Obtener servicio completo para enviar la nota actualizada
      const servicioCompleto = await prisma.servicioTecnico.findUnique({
        where: { id: parseInt(id) },
        include: {
          notas: {
            orderBy: { fecha: 'desc' }
          }
        }
      });

      req.io.emit('nota_servicio_agregada', {
        servicioId: parseInt(id),
        nota: {
          ...nota,
          fecha: nota.fecha || new Date()
        },
        servicio: servicioCompleto,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
      
      console.log('📡 Evento Socket.IO emitido - nota agregada al servicio');
    }

    res.status(201).json({
      success: true,
      message: 'Nota agregada exitosamente',
      data: nota
    });

  } catch (error) {
    console.error('❌ Error en agregarNota:', error);
    res.status(500).json({
      success: false,
      message: 'Error agregando nota',
      error: error.message
    });
  }
};

// ===================================
// 👨‍🔧 OBTENER TÉCNICOS
// ===================================
const getTecnicos = async (req, res) => {
  try {
    const tecnicos = await prisma.user.findMany({
      where: {
        activo: true,
        rol: { in: ['admin', 'supervisor', 'cajero'] }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        tecnicoConfig: true
      },
      orderBy: { nombre: 'asc' }
    });

    res.json({
      success: true,
      data: tecnicos
    });

  } catch (error) {
    console.error('❌ Error en getTecnicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo técnicos',
      error: error.message
    });
  }
};

// ===================================
// 🗑️ ELIMINAR SERVICIO
// ===================================
const deleteServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoEliminacion, adminToken } = req.body;
    const usuarioId = parseInt(req.user.userId || req.user.id);

    // Solo admin puede eliminar
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId }
    });

    if (usuario.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar servicios. Solo administradores pueden realizar esta acción'
      });
    }

    // ✅ Validar token de admin si se proporciona
    if (adminToken) {
      const adminTokenUser = await prisma.user.findFirst({
        where: {
          quickAccessToken: adminToken.toUpperCase().trim(),
          rol: 'admin',
          activo: true
        }
      });

      if (!adminTokenUser) {
        return res.status(401).json({
          success: false,
          message: 'Token de administrador inválido'
        });
      }
    }

    // Validar motivo de eliminación
    if (!motivoEliminacion || motivoEliminacion.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo de eliminación (mínimo 10 caracteres)'
      });
    }

    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: true,
        pagos: {
          include: {
            transaccion: true
          }
        }
      }
    });

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Verificar si ya está eliminado (soft-delete)
    if (servicio.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Este servicio ya ha sido eliminado'
      });
    }

    await prisma.$transaction(async (tx) => {
      // ✅ Eliminar transacciones relacionadas con el servicio primero
      if (servicio.pagos && servicio.pagos.length > 0) {
        const transaccionIds = servicio.pagos
          .map(p => p.transaccionId)
          .filter(id => id !== null);

        if (transaccionIds.length > 0) {
          // Eliminar transacciones relacionadas con el servicio
          // Nota: Esto eliminará las transacciones pero los pagos se eliminarán por cascade
          await tx.transaccion.deleteMany({
            where: {
              id: { in: transaccionIds }
            }
          });
          
          console.log(`🗑️ Eliminadas ${transaccionIds.length} transacciones relacionadas con el servicio ${servicio.numeroServicio}`);
        }
      }

      // Devolver stock de los items
      for (const item of servicio.items) {
        if (item.productoId) {
          const producto = await tx.product.findUnique({
            where: { id: item.productoId }
          });

          if (producto) {
            await tx.product.update({
              where: { id: item.productoId },
              data: {
                stock: { increment: item.cantidad }
              }
            });

            // Crear movimiento de stock
            await tx.stockMovement.create({
              data: {
                productoId: item.productoId,
                tipo: 'AJUSTE_POSITIVO',
                cantidad: item.cantidad,
                stockAnterior: producto.stock,
                stockNuevo: producto.stock + item.cantidad,
                precio: item.precioUnitario,
                motivo: `Devolución por eliminación de servicio ${servicio.numeroServicio}`,
                usuarioId
              }
            });
          }
        }
      }

      // ✅ Soft-delete: Marcar como eliminado en lugar de borrar físicamente
      await tx.servicioTecnico.update({
        where: { id: parseInt(id) },
        data: {
          deletedAt: new Date(),
          motivoEliminacion: motivoEliminacion.trim(),
          eliminadoPorId: usuarioId
        }
      });

      // Crear nota de eliminación
      await tx.servicioTecnicoNota.create({
        data: {
          servicioId: parseInt(id),
          tipo: 'ELIMINACION',
          contenido: `[ICON:TRASH] Servicio eliminado. Motivo: ${motivoEliminacion.trim()}`,
          tecnico: usuario.nombre || usuario.email || 'Sistema'
        }
      });
    });

    console.log(`✅ Servicio ${servicio.numeroServicio} eliminado (soft-delete) por ${usuario.nombre}`);

    res.json({
      success: true,
      message: 'Servicio eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en deleteServicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando servicio',
      error: error.message
    });
  }
};

// Obtener configuración de técnicos
const getTecnicosConfig = async (req, res) => {
  try {
    const configs = await prisma.tecnicoConfig.findMany({
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('❌ Error en getTecnicosConfig:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración de técnicos',
      error: error.message
    });
  }
};

// Guardar configuración de técnicos
const saveTecnicosConfig = async (req, res) => {
  try {
    const { tecnicos } = req.body;

    if (!Array.isArray(tecnicos)) {
      return res.status(400).json({
        success: false,
        message: 'El campo tecnicos debe ser un array'
      });
    }

    // Usar transacción para actualizar todas las configuraciones
    await prisma.$transaction(async (tx) => {
      for (const config of tecnicos) {
        const { usuarioId, telefono, especialidad, activo } = config;

        // Verificar que el usuario existe
        const usuario = await tx.user.findUnique({
          where: { id: usuarioId }
        });

        if (!usuario) {
          throw new Error(`Usuario con ID ${usuarioId} no encontrado`);
        }

        // Upsert: crear o actualizar
        await tx.tecnicoConfig.upsert({
          where: { usuarioId },
          create: {
            usuarioId,
            telefono: telefono || null,
            especialidad: especialidad || null,
            activo: activo !== undefined ? activo : true
          },
          update: {
            telefono: telefono || null,
            especialidad: especialidad || null,
            activo: activo !== undefined ? activo : true
          }
        });
      }
    });

    console.log(`✅ Configuración de ${tecnicos.length} técnicos actualizada`);

    res.json({
      success: true,
      message: 'Configuración guardada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en saveTecnicosConfig:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error guardando configuración',
      error: error.message
    });
  }
};

module.exports = {
  getServicios,
  getServicioById,
  createServicio,
  updateServicio,
  cambiarEstado,
  registrarPago,
  agregarNota,
  getTecnicos,
  getTecnicosConfig,
  saveTecnicosConfig,
  deleteServicio
};
