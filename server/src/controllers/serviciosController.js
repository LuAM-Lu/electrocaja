const prisma = require('../config/database');
const { generarTokenUnico, generarLinkSeguimiento } = require('../utils/servicioUtils');
const { generarHTMLTicketServicio, generarHTMLTicketInterno, generarQRBase64, generarHTMLTicketAbono } = require('../utils/printServicioUtils');
const { enviarWhatsAppCliente, enviarWhatsAppTecnico, enviarWhatsAppAbono, enviarWhatsAppListoRetiro, enviarWhatsAppEntrega } = require('../utils/whatsappServicioUtils');
const stockService = require('../services/stockService');

// Función auxiliar para validar y parsear fechas de manera segura
const parsearFechaSegura = (fecha) => {
  if (!fecha) return null;

  // Si ya es un objeto Date válido
  if (fecha instanceof Date && !isNaN(fecha.getTime())) {
    return fecha;
  }

  // Si es un string, intentar parsear
  if (typeof fecha === 'string') {
    // Si viene en formato YYYY-MM-DD (sin hora), agregar hora para evitar problemas de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      // Crear fecha en UTC para evitar problemas de zona horaria
      const [year, month, day] = fecha.split('-').map(Number);
      const fechaParseada = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

      if (!isNaN(fechaParseada.getTime())) {
        return fechaParseada;
      }
    }

    // Intentar parsear como string ISO o cualquier otro formato
    const fechaParseada = new Date(fecha);

    // Verificar si la fecha es válida
    if (!isNaN(fechaParseada.getTime())) {
      return fechaParseada;
    }
  }

  // Si es un número (timestamp), crear Date desde timestamp
  if (typeof fecha === 'number') {
    const fechaParseada = new Date(fecha);
    if (!isNaN(fechaParseada.getTime())) {
      return fechaParseada;
    }
  }

  return null;
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

    // Límite máximo para evitar cargas excesivas
    const MAX_LIMIT = 200;
    const limitValue = Math.min(parseInt(limit) || 50, MAX_LIMIT);
    const pageValue = Math.max(parseInt(page) || 1, 1);
    const offset = (pageValue - 1) * limitValue;

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
            take: 10 // 🆕 Aumentar a 10 para asegurar que se incluya la fecha de cambio a LISTO_RETIRO
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
        skip: offset,
        take: limitValue
      }),
      prisma.servicioTecnico.count({ where })
    ]);

    res.json({
      success: true,
      data: servicios,
      pagination: {
        page: pageValue,
        limit: limitValue,
        total,
        pages: Math.ceil(total / limitValue),
        maxLimit: MAX_LIMIT
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

    // Validar que el ID existe y es válido
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de servicio requerido'
      });
    }

    const servicioId = parseInt(id);
    if (isNaN(servicioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de servicio inválido'
      });
    }

    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: servicioId },
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
    // 🔍 DEBUG: Ver qué datos se reciben
    console.log('📥 [Backend] Datos recibidos en createServicio:', JSON.stringify(req.body, null, 2));
    console.log('📥 [Backend] Items recibidos:', req.body.items?.length || 0, 'items');
    console.log('📥 [Backend] Sesión ID:', req.body.sesionId);

    const {
      cliente,
      dispositivo,
      diagnostico,
      items,
      modalidadPago,
      pagoInicial,
      sesionId // 🆕 Sesión ID para liberar reservas antes de descontar stock
    } = req.body;

    // 🔍 DEBUG: Verificar datos desestructurados
    console.log('📥 [Backend] Items desestructurados:', items?.length || 0, 'items');

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

    // Validaciones específicas de campos requeridos
    if (!cliente.nombre || !cliente.nombre.trim()) {
      console.error('❌ Cliente nombre faltante o vacío');
      return res.status(400).json({
        success: false,
        message: 'El nombre del cliente es requerido'
      });
    }

    if (!cliente.telefono || !cliente.telefono.trim()) {
      console.error('❌ Cliente telefono faltante o vacío');
      return res.status(400).json({
        success: false,
        message: 'El teléfono del cliente es requerido'
      });
    }

    if (!cliente.cedula_rif || !cliente.cedula_rif.trim()) {
      console.error('❌ Cliente cedula_rif faltante o vacío');
      return res.status(400).json({
        success: false,
        message: 'La cédula/RIF del cliente es requerido'
      });
    }

    if (!dispositivo.marca || !dispositivo.marca.trim()) {
      console.error('❌ Dispositivo marca faltante o vacío');
      return res.status(400).json({
        success: false,
        message: 'La marca del dispositivo es requerida'
      });
    }

    if (!dispositivo.modelo || !dispositivo.modelo.trim()) {
      console.error('❌ Dispositivo modelo faltante o vacío');
      return res.status(400).json({
        success: false,
        message: 'El modelo del dispositivo es requerido'
      });
    }

    if (!dispositivo.imei || !dispositivo.imei.trim()) {
      console.error('❌ Dispositivo imei faltante o vacío');
      return res.status(400).json({
        success: false,
        message: 'El IMEI/Serial del dispositivo es requerido'
      });
    }

    // Permitir servicios sin items (solo diagnóstico)
    // Si hay items, validar que sean válidos
    if (items && items.length > 0) {
      const itemsInvalidos = items.filter(item =>
        !item.descripcion ||
        !item.cantidad ||
        item.cantidad <= 0 ||
        !item.precio_unitario ||
        item.precio_unitario < 0
      );

      if (itemsInvalidos.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Algunos items tienen datos inválidos (descripción, cantidad o precio)'
        });
      }
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

    // ✅ VALIDACIÓN MODIFICADA: Solo requerir caja abierta si hay operaciones financieras
    // Si la modalidad de pago es PAGO_POSTERIOR, no se requiere caja abierta
    const requiereCajaAbierta = modalidadPago !== 'PAGO_POSTERIOR';

    if (!cajaActual && requiereCajaAbierta) {
      return res.status(400).json({
        success: false,
        message: 'No hay caja abierta. Debes abrir una caja para registrar pagos'
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

    // Calcular totales con precisión (si hay items)
    const totalEstimado = items && items.length > 0
      ? parseFloat(
        items.reduce((sum, item) =>
          sum + (parseFloat(item.cantidad) * parseFloat(item.precio_unitario || item.precioUnitario)),
          0
        ).toFixed(2)
      )
      : 0;

    let totalPagado = 0;
    let saldoPendiente = totalEstimado;

    if (modalidadPago === 'TOTAL_ADELANTADO') {
      totalPagado = totalEstimado;
      saldoPendiente = 0;
    } else if (modalidadPago === 'ABONO' && pagoInicial) {
      // ✅ Calcular total pagado desde el array de pagos en USD
      // pagoInicial.totalUsd contiene la conversión correcta a USD
      // Si no está disponible, usar totalUsdEquivalent o calcular desde los pagos
      totalPagado = parseFloat(pagoInicial.totalUsd || pagoInicial.totalUsdEquivalent || pagoInicial.monto || 0);

      // ✅ Validar que el total pagado no sea mayor al total estimado
      if (totalPagado > totalEstimado) {
        console.warn(`⚠️ Total pagado (${totalPagado}) es mayor al total estimado (${totalEstimado}). Ajustando a total estimado.`);
        totalPagado = totalEstimado;
      }

      saldoPendiente = parseFloat((totalEstimado - totalPagado).toFixed(2));

      console.log(`💰 [Servicio ABONO] Total estimado: ${totalEstimado}, Total pagado: ${totalPagado}, Saldo pendiente: ${saldoPendiente}`);
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

    // 🆕 Generar token único y link de seguimiento ANTES de crear el servicio
    const tokenUnico = generarTokenUnico(numeroServicio, cliente.cedula_rif);

    // Obtener URL base del frontend desde variables de entorno o request
    const frontendBaseUrl = process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      (req.headers.origin ? req.headers.origin.replace(/\/$/, '') : 'https://localhost:5173');

    const linkSeguimiento = generarLinkSeguimiento(tokenUnico, frontendBaseUrl);

    // 🆕 0. Si hay sesionId, liberar reservas ANTES de iniciar la transacción principal
    // (esto evita problemas de transacciones anidadas)
    if (sesionId) {
      console.log(`🔓 [Backend] Liberando reservas de sesión ${sesionId} antes de crear servicio...`);
      try {
        // Liberar todas las reservas de la sesión
        await stockService.liberarTodasLasReservasDeSesion(
          sesionId,
          usuarioId,
          req.ip || req.connection.remoteAddress
        );
        console.log(`✅ [Backend] Reservas liberadas exitosamente para sesión ${sesionId}`);
      } catch (error) {
        console.error(`⚠️ [Backend] Error liberando reservas (continuando):`, error.message);
        // No fallar la creación del servicio si hay error liberando reservas
        // Las reservas se limpiarán automáticamente por timeout
      }
    } else {
      console.log(`ℹ️ [Backend] No hay sesionId, saltando liberación de reservas`);
    }

    // Crear servicio en transacción
    console.log(`🔄 [Backend] Iniciando transacción para crear servicio ${numeroServicio}...`);
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear servicio con token único y link de seguimiento
      console.log(`📝 [Backend] Creando servicio ${numeroServicio} en base de datos...`);
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
          accesorios: Array.isArray(dispositivo.accesorios) ? dispositivo.accesorios : [],
          problemas: (() => {
            // Normalizar problemas: debe ser un array no vacío
            if (Array.isArray(dispositivo.problemas) && dispositivo.problemas.length > 0) {
              return dispositivo.problemas.filter(p => p && p.trim());
            }
            if (dispositivo.problema && dispositivo.problema.trim()) {
              // Si viene como string, dividirlo por comas y limpiar
              return dispositivo.problema.split(',').map(p => p.trim()).filter(p => p);
            }
            // Si no hay problemas, usar array vacío (pero esto podría causar error en Prisma)
            return ['Sin especificar'];
          })(),
          evidencias: Array.isArray(dispositivo.evidencias) ? dispositivo.evidencias : [],
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
          // ✅ cajaIngresoId solo si hay caja abierta (null si no hay caja)
          cajaIngresoId: cajaActual ? cajaActual.id : null,
          // 🆕 Agregar token único y link de seguimiento
          tokenUnico,
          linkSeguimiento
        }
      });

      // 2. Crear items y descontar stock
      const productosAfectados = []; // Para emitir eventos después de la transacción

      console.log(`📦 [Backend] Procesando ${items.length} items para servicio ${numeroServicio}`);

      if (items.length === 0) {
        console.log(`ℹ️ [Backend] Servicio sin items (solo diagnóstico) - saltando procesamiento de productos`);
      }

      for (const item of items) {
        const cantidad = parseInt(item.cantidad);
        const precioUnitario = parseFloat(item.precio_unitario || item.precioUnitario);
        const subtotal = parseFloat((cantidad * precioUnitario).toFixed(2));

        // 🐛 DEBUG: Log del item recibido
        console.log(`📦 [Servicio] Item recibido:`, {
          descripcion: item.descripcion,
          cantidad,
          productoId: item.productoId,
          producto_id: item.producto_id,
          esPersonalizado: item.esPersonalizado || item.es_personalizado || false
        });

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

        // 3. Descontar stock si tiene producto vinculado (solo productos físicos)
        const productoId = item.productoId || item.producto_id;

        console.log(`🔍 [Servicio] Verificando productoId: ${productoId} para item: ${item.descripcion}`);

        if (productoId) {
          const producto = await tx.product.findUnique({
            where: { id: productoId }
          });

          if (producto) {
            console.log(`✅ [Servicio] Producto encontrado: ${producto.descripcion}, tipo: ${producto.tipo}, stock actual: ${producto.stock}`);

            // ✅ Validar que no sea un servicio (los servicios no tienen stock físico)
            if (producto.tipo === 'SERVICIO') {
              console.log(`⏭️ [Servicio] Saltando descuento de stock para servicio: ${producto.descripcion}`);
              // Los servicios no se descuentan del inventario
              continue;
            }

            // ✅ Validar que hay suficiente stock disponible
            if (producto.stock < cantidad) {
              console.error(`❌ [Stock] Stock insuficiente:`, {
                producto: producto.descripcion,
                stockDisponible: producto.stock,
                cantidadRequerida: cantidad
              });
              throw new Error(
                `Stock insuficiente para "${producto.descripcion}". ` +
                `Disponible: ${producto.stock}, Requerido: ${cantidad}`
              );
            }

            console.log(`🔽 [Servicio] Descontando ${cantidad} unidades de ${producto.descripcion} (stock antes: ${producto.stock})`);

            // ✅ Descontar stock usando decrement (más seguro y atómico)
            await tx.product.update({
              where: { id: productoId },
              data: {
                stock: { decrement: cantidad }
              }
            });

            console.log(`✅ [Servicio] Stock descontado exitosamente para ${producto.descripcion}`);

            // Obtener el stock actualizado para el movimiento
            const productoActualizado = await tx.product.findUnique({
              where: { id: productoId },
              select: { stock: true }
            });

            // Crear movimiento de stock
            await tx.stockMovement.create({
              data: {
                productoId,
                tipo: 'SALIDA',
                cantidad,
                stockAnterior: producto.stock,
                stockNuevo: productoActualizado.stock,
                precio: precioUnitario,
                motivo: `Servicio técnico ${numeroServicio}`,
                usuarioId
              }
            });

            // Guardar información para emitir evento después de la transacción
            productosAfectados.push({
              id: producto.id,
              descripcion: producto.descripcion,
              stock: productoActualizado.stock,
              cantidad: cantidad
            });
          } else {
            console.log(`⚠️ [Servicio] Producto no encontrado con ID: ${productoId}`);
          }
        } else {
          console.log(`⚠️ [Servicio] Item sin productoId: ${item.descripcion} - Saltando descuento de stock`);
          console.log(`⚠️ [Servicio] Item completo recibido:`, JSON.stringify(item, null, 2));
        }
      }

      // 4. Si hay pago inicial, crear transacción y registro de pago
      // Obtener tasa de cambio (necesaria para múltiples bloques)
      const tasaCambio = pagoInicial && pagoInicial.tasaCambio
        ? parseFloat(pagoInicial.tasaCambio)
        : parseFloat(global.estadoApp?.tasa_bcv?.valor || 38.20);

      if (pagoInicial && (modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO')) {
        // ✅ Validar que hay caja abierta para operaciones financieras
        if (!cajaActual) {
          throw new Error('No hay caja abierta para registrar el pago');
        }

        const totalBs = parseFloat(pagoInicial.totalBs || 0);
        const totalUsd = parseFloat(pagoInicial.totalUsd || pagoInicial.totalUsdEquivalent || 0);

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

        // Actualizar métodos de pago específicos (solo los que existen en el schema)
        pagoInicial.pagos.forEach(pago => {
          const monto = parseFloat(pago.monto);
          if (pago.metodo === 'pago_movil' || pago.metodo === 'pago movil') {
            updateData.totalPagoMovil = { increment: monto };
          }
          // Nota: totalPuntoVenta y totalZelle no existen en el schema Caja
          // Solo se actualiza totalIngresosBs/Usd y totalPagoMovil
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

      // ✅ Crear primera nota técnica pública al recibir la orden
      await tx.servicioTecnicoNota.create({
        data: {
          servicioId: servicio.id,
          tipo: 'CAMBIO_ESTADO',
          contenido: contenidoNota,
          tecnico: diagnostico.tecnico,
          estadoNuevo: 'RECIBIDO',
          publica: true // ✅ Primera nota siempre pública para que el cliente pueda verla
        }
      });

      // Recargar servicio con todas las relaciones
      const servicioCompleto = await tx.servicioTecnico.findUnique({
        where: { id: servicio.id },
        include: {
          items: true,
          pagos: {
            include: {
              transaccion: {
                include: {
                  pagos: true
                }
              }
            },
            orderBy: {
              fecha: 'desc'
            }
          },
          notas: {
            orderBy: {
              fecha: 'desc'
            }
          }
        }
      });

      // ✅ Asegurar que totalPagado y saldoPendiente estén correctamente calculados
      // Calcular totalPagado desde los pagos si no está disponible
      let totalPagadoCalculado = parseFloat(servicioCompleto.totalPagado) || 0;
      if (totalPagadoCalculado === 0 && servicioCompleto.pagos && servicioCompleto.pagos.length > 0) {
        totalPagadoCalculado = servicioCompleto.pagos.reduce((acc, pago) => {
          return acc + (parseFloat(pago.monto) || 0);
        }, 0);
      }

      // Calcular saldoPendiente
      const totalEstimadoCalculado = parseFloat(servicioCompleto.totalEstimado) || 0;
      const saldoPendienteCalculado = Math.max(0, totalEstimadoCalculado - totalPagadoCalculado);

      // Actualizar servicio con valores calculados si es necesario
      if (totalPagadoCalculado !== parseFloat(servicioCompleto.totalPagado) ||
        saldoPendienteCalculado !== parseFloat(servicioCompleto.saldoPendiente)) {
        await tx.servicioTecnico.update({
          where: { id: servicio.id },
          data: {
            totalPagado: totalPagadoCalculado,
            saldoPendiente: saldoPendienteCalculado
          }
        });

        // Recargar servicio actualizado
        const servicioActualizado = await tx.servicioTecnico.findUnique({
          where: { id: servicio.id },
          include: {
            items: true,
            pagos: {
              include: {
                transaccion: {
                  include: {
                    pagos: true
                  }
                }
              },
              orderBy: {
                fecha: 'desc'
              }
            },
            notas: {
              orderBy: {
                fecha: 'desc'
              }
            }
          }
        });

        // Retornar servicio actualizado y productos afectados
        return {
          servicio: servicioActualizado,
          productosAfectados,
          transaccion: servicioCompleto.pagos?.[0]?.transaccion || null // ✅ Incluir transacción para evento Socket.IO
        };
      }

      // Retornar servicio y productos afectados para emitir eventos después
      return {
        servicio: servicioCompleto,
        productosAfectados,
        transaccion: servicioCompleto.pagos?.[0]?.transaccion || null // ✅ Incluir transacción para evento Socket.IO
      };
    });

    // 📡 Emitir eventos de inventario actualizado DESPUÉS de la transacción
    if (req.io && resultado.productosAfectados && resultado.productosAfectados.length > 0) {
      resultado.productosAfectados.forEach(producto => {
        req.io.emit('inventario_actualizado', {
          operacion: 'VENTA_PROCESADA',
          producto: {
            id: producto.id,
            descripcion: producto.descripcion,
            stock: producto.stock
          },
          cantidad: producto.cantidad,
          usuario: req.user?.nombre || req.user?.email,
          motivo: `Servicio técnico ${resultado.servicio.numeroServicio}`,
          timestamp: new Date().toISOString()
        });
      });
      console.log(`📡 Emitidos ${resultado.productosAfectados.length} eventos de inventario actualizado`);
    }

    // 📡 Emitir evento Socket.IO para actualizar TransactionTable cuando hay pago inicial
    if (req.io && resultado.transaccion) {
      try {
        // Obtener transacción completa con todas las relaciones
        const transaccionCompleta = await prisma.transaccion.findUnique({
          where: { id: resultado.transaccion.id },
          include: {
            pagos: true,
            items: true,
            servicioTecnico: {
              select: {
                id: true,
                numeroServicio: true,
                clienteNombre: true,
                dispositivoMarca: true,
                dispositivoModelo: true
              }
            }
          }
        });

        if (transaccionCompleta) {
          // Convertir para el frontend
          const transaccionParaSocket = {
            ...transaccionCompleta,
            totalBs: parseFloat(transaccionCompleta.totalBs),
            totalUsd: parseFloat(transaccionCompleta.totalUsd),
            tasaCambioUsada: parseFloat(transaccionCompleta.tasaCambioUsada),
            servicioTecnicoId: transaccionCompleta.servicioTecnicoId,
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
            servicioId: resultado.servicio.id,
            numeroServicio: resultado.servicio.numeroServicio
          });

          // También emitir transaction-added para compatibilidad
          req.io.emit('transaction-added', {
            transaccion: transaccionParaSocket,
            usuario: req.user?.nombre || req.user?.email,
            timestamp: new Date().toISOString()
          });

          console.log(`📡 [createServicio] Evento nueva_transaccion emitido para transacción ${transaccionCompleta.id}`);
        }
      } catch (error) {
        console.error('❌ [createServicio] Error emitiendo evento de transacción:', error);
        // No fallar la creación del servicio por un error en el evento
      }
    }

    // Extraer solo el servicio del resultado para compatibilidad con el resto del código
    const servicioFinal = resultado.servicio;


    // 🆕 Obtener usuario que creó el servicio y técnico asignado para WhatsApp
    const usuarioCreador = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: { nombre: true }
    });

    let tecnicoData = null;
    if (servicioFinal.tecnicoId) {
      tecnicoData = await prisma.user.findUnique({
        where: { id: servicioFinal.tecnicoId },
        include: {
          tecnicoConfig: {
            select: { telefono: true }
          }
        }
      });
    }

    // 🆕 Generar QR code para el ticket
    let qrBase64 = null;
    try {
      qrBase64 = await generarQRBase64(linkSeguimiento);
    } catch (error) {
      console.error('❌ Error generando QR:', error);
    }

    // 🆕 Obtener tasa de cambio actual desde global.estadoApp (misma fuente que Header.jsx)
    const tasaCambio = parseFloat(global.estadoApp?.tasa_bcv?.valor || 38.20);

    // 🆕 Generar HTML del ticket térmico (cliente) con tasa de cambio
    const htmlTicket = generarHTMLTicketServicio(
      servicioFinal,
      usuarioCreador,
      linkSeguimiento,
      qrBase64,
      tasaCambio // 🆕 Pasar tasa de cambio
    );

    // 🆕 Generar HTML del ticket interno (uso interno en tienda)
    const htmlTicketInterno = generarHTMLTicketInterno(servicioFinal);

    // ✅ Asegurar que totalPagado y saldoPendiente estén en la respuesta
    const servicioParaRespuesta = {
      ...servicioFinal,
      // ✅ Convertir Decimal de Prisma a número y asegurar valores correctos
      totalEstimado: parseFloat(servicioFinal.totalEstimado) || 0,
      totalPagado: parseFloat(servicioFinal.totalPagado) || 0,
      saldoPendiente: parseFloat(servicioFinal.saldoPendiente) || 0,
      // ✅ Convertir pagos para incluir monto como número
      pagos: servicioFinal.pagos?.map(pago => ({
        ...pago,
        monto: parseFloat(pago.monto) || 0
      })) || []
    };

    // 🆕 Enviar respuesta con datos adicionales para impresión y WhatsApp
    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: {
        ...servicioParaRespuesta,
        tokenUnico,
        linkSeguimiento,
        // Datos para impresión térmica
        ticketHTML: htmlTicket,
        ticketHTMLInterno: htmlTicketInterno, // 🆕 Ticket interno
        qrCode: qrBase64,
        // Datos para WhatsApp
        usuarioCreador: usuarioCreador?.nombre || 'Sistema'
      }
    });

    // 🆕 Ejecutar acciones adicionales en segundo plano (no bloquear respuesta)
    setImmediate(async () => {
      try {
        // 1. Enviar WhatsApp al cliente
        if (servicioFinal.clienteTelefono) {
          const resultadoWhatsAppCliente = await enviarWhatsAppCliente(
            servicioFinal,
            linkSeguimiento,
            qrBase64, // Enviar QR como imagen si está disponible
            tasaCambio // 🆕 Pasar tasa de cambio
          );

          if (resultadoWhatsAppCliente.success) {
            // Actualizar flag de WhatsApp enviado
            await prisma.servicioTecnico.update({
              where: { id: servicioFinal.id },
              data: {
                whatsappEnviado: true,
                whatsappFechaEnvio: new Date()
              }
            });
          } else {
            console.error('❌ Error enviando WhatsApp al cliente:', resultadoWhatsAppCliente.message);
          }
        }

        // 2. Enviar WhatsApp al técnico asignado
        if (tecnicoData?.tecnicoConfig?.telefono) {
          const resultadoWhatsAppTecnico = await enviarWhatsAppTecnico(
            servicioFinal,
            tecnicoData.tecnicoConfig.telefono,
            tasaCambio // 🆕 Pasar tasa de cambio
          );

          if (resultadoWhatsAppTecnico.success) {
          } else {
            console.error('❌ Error enviando WhatsApp al técnico:', resultadoWhatsAppTecnico.message);
          }
        } else {
        }
      } catch (error) {
        console.error('❌ Error en acciones adicionales (WhatsApp):', error);
        // No lanzar error para no afectar la creación del servicio
      }
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
      let productosAfectados = []; // Para emitir eventos después de la transacción
      let productosDevueltos = []; // Para emitir eventos después de la transacción

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
              // ✅ Validar que no sea un servicio (los servicios no tienen stock físico)
              if (productoAntiguo.tipo === 'SERVICIO') {
                console.log(`⏭️ [UpdateServicio] Saltando devolución de stock para servicio: ${productoAntiguo.descripcion}`);
                // Los servicios no tienen stock que devolver
                continue;
              }

              const stockAnterior = productoAntiguo.stock;

              await tx.product.update({
                where: { id: itemAntiguo.productoId },
                data: {
                  stock: { increment: itemAntiguo.cantidad }
                }
              });

              // Obtener stock actualizado después del increment
              const productoActualizado = await tx.product.findUnique({
                where: { id: itemAntiguo.productoId },
                select: { stock: true }
              });

              // Crear movimiento de stock para devolución
              await tx.stockMovement.create({
                data: {
                  productoId: itemAntiguo.productoId,
                  tipo: 'AJUSTE_POSITIVO',
                  cantidad: itemAntiguo.cantidad,
                  stockAnterior: stockAnterior,
                  stockNuevo: productoActualizado.stock,
                  precio: itemAntiguo.precioUnitario,
                  motivo: `Devolución por edición de servicio ${servicioActual.numeroServicio}`,
                  usuarioId
                }
              });

              // Guardar información para emitir evento después de la transacción
              productosDevueltos.push({
                id: productoAntiguo.id,
                descripcion: productoAntiguo.descripcion,
                stock: productoActualizado.stock,
                cantidad: itemAntiguo.cantidad
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
              // ✅ Validar que no sea un servicio (los servicios no tienen stock físico)
              if (producto.tipo === 'SERVICIO') {
                console.log(`⏭️ [UpdateServicio] Saltando descuento de stock para servicio: ${producto.descripcion}`);
                // Los servicios no se descuentan del inventario
                continue;
              }

              // Validar que hay suficiente stock disponible
              if (producto.stock < cantidad) {
                throw new Error(`Stock insuficiente para ${producto.descripcion || producto.nombre}. Disponible: ${producto.stock}, Requerido: ${cantidad}`);
              }

              const stockAnterior = producto.stock;

              await tx.product.update({
                where: { id: productoId },
                data: {
                  stock: { decrement: cantidad }
                }
              });

              // Obtener el stock actualizado después del decrement
              const productoActualizado = await tx.product.findUnique({
                where: { id: productoId },
                select: { stock: true }
              });

              // Crear movimiento de stock
              await tx.stockMovement.create({
                data: {
                  productoId,
                  tipo: 'SALIDA',
                  cantidad,
                  stockAnterior: stockAnterior,
                  stockNuevo: productoActualizado.stock,
                  precio: precioUnitario,
                  motivo: `Actualización de servicio técnico ${servicioActual.numeroServicio}`,
                  usuarioId
                }
              });

              // Guardar información para emitir evento después de la transacción
              productosAfectados.push({
                id: producto.id,
                descripcion: producto.descripcion,
                stock: productoActualizado.stock,
                cantidad: cantidad
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
        notaModificacion: notaModificacionCreada,
        productosAfectados: productosAfectados || [],
        productosDevueltos: productosDevueltos || []
      };
    });

    // 📡 Emitir eventos de inventario actualizado DESPUÉS de la transacción
    // Emitir eventos para productos devueltos (stock incrementado)
    if (req.io && resultado.productosDevueltos && resultado.productosDevueltos.length > 0) {
      console.log(`📡 [UpdateServicio] Emitiendo ${resultado.productosDevueltos.length} eventos de stock devuelto`);
      resultado.productosDevueltos.forEach(producto => {
        const eventoData = {
          operacion: 'STOCK_DEVUELTO',
          producto: {
            id: producto.id,
            descripcion: producto.descripcion,
            stock: producto.stock
          },
          cantidad: producto.cantidad,
          usuario: req.user?.nombre || req.user?.email,
          motivo: `Devolución por edición de servicio ${resultado.servicio.numeroServicio}`,
          timestamp: new Date().toISOString()
        };
        console.log(`📡 [UpdateServicio] Emitiendo evento STOCK_DEVUELTO para producto ${producto.id}:`, eventoData);
        req.io.emit('inventario_actualizado', eventoData);
      });
      console.log(`✅ [UpdateServicio] Emitidos ${resultado.productosDevueltos.length} eventos de stock devuelto`);
    } else {
      console.log(`⚠️ [UpdateServicio] No se emitieron eventos de stock devuelto. req.io: ${!!req.io}, productosDevueltos: ${resultado.productosDevueltos?.length || 0}`);
    }

    // Emitir eventos para productos afectados (stock descontado)
    if (req.io && resultado.productosAfectados && resultado.productosAfectados.length > 0) {
      console.log(`📡 [UpdateServicio] Emitiendo ${resultado.productosAfectados.length} eventos de stock descontado`);
      resultado.productosAfectados.forEach(producto => {
        const eventoData = {
          operacion: 'VENTA_PROCESADA',
          producto: {
            id: producto.id,
            descripcion: producto.descripcion,
            stock: producto.stock
          },
          cantidad: producto.cantidad,
          usuario: req.user?.nombre || req.user?.email,
          motivo: `Actualización de servicio técnico ${resultado.servicio.numeroServicio}`,
          timestamp: new Date().toISOString()
        };
        console.log(`📡 [UpdateServicio] Emitiendo evento VENTA_PROCESADA para producto ${producto.id}:`, eventoData);
        req.io.emit('inventario_actualizado', eventoData);
      });
      console.log(`✅ [UpdateServicio] Emitidos ${resultado.productosAfectados.length} eventos de inventario actualizado`);
    } else {
      console.log(`⚠️ [UpdateServicio] No se emitieron eventos de stock descontado. req.io: ${!!req.io}, productosAfectados: ${resultado.productosAfectados?.length || 0}`);
    }


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
          estadoNuevo: estado,
          publica: true // Los cambios de estado siempre son públicos
        }
      });

      return servicio;
    });


    // 🆕 Si el estado cambió a LISTO_RETIRO, enviar WhatsApp al cliente
    let whatsappEnviado = false;
    let mensajeWhatsApp = null;

    if (estado === 'LISTO_RETIRO') {

      if (resultado.clienteTelefono) {
        // Enviar WhatsApp de forma síncrona para poder retornar el resultado
        try {

          // Obtener tasa de cambio actual
          const tasaCambio = parseFloat(global.estadoApp?.tasa_bcv?.valor || 38.20);

          // Obtener servicio completo con todos los datos
          let servicioCompleto = await prisma.servicioTecnico.findUnique({
            where: { id: parseInt(id) },
            include: {
              items: true,
              pagos: true
            }
          });

          if (!servicioCompleto) {
            console.error('❌ No se pudo obtener el servicio completo para WhatsApp');
          } else {
            // 🆕 Si no tiene linkSeguimiento, generarlo (para servicios antiguos)
            if (!servicioCompleto.linkSeguimiento || !servicioCompleto.tokenUnico) {
              const tokenUnico = generarTokenUnico(
                servicioCompleto.clienteCedulaRif,
                servicioCompleto.numeroServicio,
                servicioCompleto.id.toString()
              );

              const frontendBaseUrl = process.env.FRONTEND_URL ||
                (process.env.NODE_ENV === 'production'
                  ? 'https://sades.electroshopve.com'
                  : 'https://localhost:5173');

              const linkSeguimiento = generarLinkSeguimiento(tokenUnico, frontendBaseUrl);

              // Actualizar servicio con token y link
              servicioCompleto = await prisma.servicioTecnico.update({
                where: { id: parseInt(id) },
                data: {
                  tokenUnico,
                  linkSeguimiento
                },
                include: {
                  items: true,
                  pagos: true
                }
              });

            }

            const resultadoWhatsApp = await enviarWhatsAppListoRetiro(
              servicioCompleto,
              servicioCompleto.linkSeguimiento,
              tasaCambio
            );

            if (resultadoWhatsApp.success) {
              whatsappEnviado = true;
              mensajeWhatsApp = 'WhatsApp enviado exitosamente al cliente';
            } else {
              console.error('❌ Error enviando WhatsApp de LISTO_RETIRO:', resultadoWhatsApp.message);
              // 🆕 Mensaje más claro según el tipo de error
              if (resultadoWhatsApp.message === 'WhatsApp no está conectado') {
                mensajeWhatsApp = '⚠️ WhatsApp no está conectado. Conecta WhatsApp desde la configuración para notificar al cliente.';
              } else {
                mensajeWhatsApp = `Error enviando WhatsApp: ${resultadoWhatsApp.message}`;
              }
            }
          }
        } catch (error) {
          console.error('❌ Error enviando WhatsApp de LISTO_RETIRO:', error);
          console.error('Stack trace:', error.stack);
          mensajeWhatsApp = `Error enviando WhatsApp: ${error.message}`;
        }
      } else {
        console.warn('⚠️ No se puede enviar WhatsApp de LISTO_RETIRO: servicio sin teléfono del cliente');
        mensajeWhatsApp = '⚠️ No se pudo enviar WhatsApp: servicio sin teléfono del cliente';
      }
    } else {
    }

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

      }
    }

    res.json({
      success: true,
      message: `Estado cambiado a ${estado}`,
      data: resultado,
      whatsappEnviado: whatsappEnviado,
      mensajeWhatsApp: mensajeWhatsApp
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

      // 🆕 NO marcar automáticamente como ENTREGADO - dejar que el usuario confirme desde el modal
      // El estado se marcará como ENTREGADO cuando se confirme la entrega desde ModalConfirmarEntrega
      // Solo guardar la caja de entrega si es pago final y no hay saldo pendiente
      if (!esAbonoReal && nuevoSaldo <= 0.01) {
        updateData.cajaEntregaId = cajaActual.id;
        // NO actualizar estado aquí - se hará en finalizarEntrega
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

    // 🆕 Si es abono, generar ticket y WhatsApp automáticamente
    let ticketAbonoHTML = null;
    let qrAbonoBase64 = null;

    if (resultado.esAbono) {
      try {
        // Obtener servicio completo con todos los datos actualizados
        const servicioCompleto = await prisma.servicioTecnico.findUnique({
          where: { id: servicio.id },
          include: {
            items: true,
            pagos: true
          }
        });

        // Obtener tasa de cambio actual desde global.estadoApp (misma fuente que Header.jsx)
        const tasaCambioAbono = parseFloat(global.estadoApp?.tasa_bcv?.valor || 38.20);

        // Generar QR code si hay link de seguimiento
        if (servicioCompleto.linkSeguimiento) {
          try {
            qrAbonoBase64 = await generarQRBase64(servicioCompleto.linkSeguimiento);
          } catch (error) {
            console.error('❌ Error generando QR de abono:', error);
          }
        }

        // Preparar datos del pago para el ticket
        const pagoData = {
          monto: montoPago,
          pagos: pagos,
          vueltos: vueltos
        };

        // Generar HTML del ticket de abono
        ticketAbonoHTML = generarHTMLTicketAbono(
          servicioCompleto,
          pagoData,
          servicioCompleto.linkSeguimiento,
          qrAbonoBase64,
          tasaCambioAbono
        );


        // Enviar WhatsApp de abono en segundo plano
        setImmediate(async () => {
          try {
            if (servicioCompleto.clienteTelefono) {
              const resultadoWhatsAppAbono = await enviarWhatsAppAbono(
                servicioCompleto,
                pagoData,
                servicioCompleto.linkSeguimiento,
                qrAbonoBase64, // Enviar QR como imagen si está disponible
                tasaCambioAbono
              );

              if (resultadoWhatsAppAbono.success) {
              } else {
                console.error('❌ Error enviando WhatsApp de abono:', resultadoWhatsAppAbono.message);
              }
            }
          } catch (error) {
            console.error('❌ Error enviando WhatsApp de abono:', error);
          }
        });

      } catch (error) {
        console.error('❌ Error generando ticket/WhatsApp de abono:', error);
        // No fallar el registro del pago si falla la generación del ticket
      }
    }

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

    }

    res.json({
      success: true,
      message: resultado.esAbono ? 'Abono registrado exitosamente' : 'Pago registrado exitosamente',
      data: {
        ...resultado.servicio,
        // 🆕 Incluir ticket y QR de abono si existe
        ticketAbonoHTML: ticketAbonoHTML,
        qrAbonoCode: qrAbonoBase64
      }
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
// 🗑️ ELIMINAR NOTA TÉCNICA
// ===================================
const eliminarNota = async (req, res) => {
  try {
    const { id, notaId } = req.params;
    const usuarioActual = req.user;

    // Verificar que la nota existe
    const nota = await prisma.servicioTecnicoNota.findUnique({
      where: { id: parseInt(notaId) }
    });

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota no encontrada'
      });
    }

    // Verificar que la nota pertenece al servicio
    if (nota.servicioId !== parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'La nota no pertenece a este servicio'
      });
    }

    // Verificar permisos: solo el usuario que creó la nota o un admin puede eliminarla
    const puedeEliminar = usuarioActual.rol === 'admin' || nota.tecnico === usuarioActual.nombre;

    if (!puedeEliminar) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta nota'
      });
    }

    // Eliminar la nota
    await prisma.servicioTecnicoNota.delete({
      where: { id: parseInt(notaId) }
    });

    // 📡 Emitir evento Socket.IO para actualizar en tiempo real
    if (req.io) {
      // Obtener servicio completo actualizado
      const servicioCompleto = await prisma.servicioTecnico.findUnique({
        where: { id: parseInt(id) },
        include: {
          notas: {
            orderBy: { fecha: 'desc' }
          }
        }
      });

      req.io.emit('nota_servicio_eliminada', {
        servicioId: parseInt(id),
        notaId: parseInt(notaId),
        servicio: servicioCompleto,
        usuario: usuarioActual?.nombre || usuarioActual?.email,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Nota eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en eliminarNota:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando nota',
      error: error.message
    });
  }
};

// ===================================
// 📝 AGREGAR NOTA TÉCNICA
// ===================================
const agregarNota = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, contenido, archivoUrl, publica, grupoId } = req.body;

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: 'Tipo es requerido'
      });
    }

    // El contenido puede estar vacío si es solo una imagen o audio
    const contenidoFinal = contenido || (archivoUrl ? 'Archivo adjunto' : '');

    // Determinar si debe ser pública (respetar el valor del frontend)
    const debeSerPublica = publica === true || publica === 'true';

    const nota = await prisma.servicioTecnicoNota.create({
      data: {
        servicioId: parseInt(id),
        tipo,
        contenido: contenidoFinal,
        archivoUrl: archivoUrl || null,
        grupoId: grupoId || null, // Agregar grupoId si existe
        tecnico: req.user.nombre,
        publica: debeSerPublica
      }
    });


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
// 🔄 ACTUALIZAR VISIBILIDAD DE NOTA
// ===================================
const actualizarVisibilidadNota = async (req, res) => {
  try {
    const { id, notaId } = req.params;
    const { publica } = req.body;

    // Verificar que la nota pertenece al servicio
    const nota = await prisma.servicioTecnicoNota.findFirst({
      where: {
        id: parseInt(notaId),
        servicioId: parseInt(id)
      }
    });

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota no encontrada'
      });
    }

    // Actualizar solo el campo publica
    const notaActualizada = await prisma.servicioTecnicoNota.update({
      where: { id: parseInt(notaId) },
      data: {
        publica: publica === true || publica === 'true'
      }
    });


    res.json({
      success: true,
      message: 'Visibilidad de nota actualizada exitosamente',
      data: notaActualizada
    });

  } catch (error) {
    console.error('❌ Error en actualizarVisibilidadNota:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando visibilidad de nota',
      error: error.message
    });
  }
};

// ===================================
// 📸 PUBLICAR TODAS LAS IMÁGENES DE UN SERVICIO (TEMPORAL)
// ===================================
const publicarImagenesServicio = async (req, res) => {
  try {
    const { id } = req.params;

    // Actualizar todas las notas de tipo IMAGEN del servicio para que sean públicas
    const resultado = await prisma.servicioTecnicoNota.updateMany({
      where: {
        servicioId: parseInt(id),
        tipo: { in: ['IMAGEN', 'AUDIO'] } // Incluir también audios
      },
      data: {
        publica: true
      }
    });

    console.log(`✅ Marcadas ${resultado.count} imágenes/audios como públicas para servicio ${id}`);

    res.json({
      success: true,
      message: `${resultado.count} imágenes/audios marcadas como públicas`,
      data: { count: resultado.count }
    });

  } catch (error) {
    console.error('❌ Error en publicarImagenesServicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error publicando imágenes',
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
      // Si se marca un técnico como favorito, desmarcar los demás
      const tieneFavorito = tecnicos.some(t => t.favorito === true);
      if (tieneFavorito) {
        // Desmarcar todos los favoritos primero
        await tx.tecnicoConfig.updateMany({
          where: { favorito: true },
          data: { favorito: false }
        });
      }

      for (const config of tecnicos) {
        const { usuarioId, telefono, especialidad, activo, favorito } = config;

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
            activo: activo !== undefined ? activo : true,
            favorito: favorito === true
          },
          update: {
            telefono: telefono || null,
            especialidad: especialidad || null,
            activo: activo !== undefined ? activo : true,
            favorito: favorito === true
          }
        });
      }
    });


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

// ===================================
// 🌐 OBTENER SERVICIO PÚBLICO POR TOKEN (SIN AUTENTICACIÓN)
// ===================================
const getServicioPublico = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    // Buscar servicio por token único
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { tokenUnico: token },
      include: {
        items: true,
        pagos: {
          orderBy: { fecha: 'desc' }
        },
        notas: {
          where: {
            publica: true // Solo mostrar notas públicas al cliente
          },
          orderBy: { fecha: 'desc' }
        }
      }
    });

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado o token inválido'
      });
    }

    // Verificar si el servicio puede ser accedido públicamente
    // (no debe estar eliminado, y opcionalmente no entregado)
    if (servicio.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Este servicio ya no está disponible'
      });
    }

    // Si está entregado, el link ya no es válido
    if (servicio.estado === 'ENTREGADO') {
      return res.status(404).json({
        success: false,
        message: 'Este servicio ya fue entregado. El link de seguimiento ya no está disponible.'
      });
    }

    // 🆕 Obtener tasa de cambio actual desde global.estadoApp (misma fuente que Header.jsx)
    const tasaCambio = parseFloat(global.estadoApp?.tasa_bcv?.valor || 38.20);

    // Retornar datos del servicio (sin información sensible) con tasa de cambio
    res.json({
      success: true,
      data: {
        ...servicio,
        tasaCambio // 🆕 Incluir tasa de cambio del backend
      }
    });

  } catch (error) {
    console.error('❌ Error en getServicioPublico:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo servicio',
      error: error.message
    });
  }
};

// ===================================
// 🖨️ REGENERAR TICKET DE SERVICIO
// ===================================
const regenerarTicketServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.query; // 'cliente' o 'interno'
    const esReimpresion = tipo === 'cliente'; // Solo el ticket del cliente marca como reimpresión

    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: true,
        pagos: true,
        notas: true
      }
    });

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Obtener usuario que creó el servicio
    const usuarioCreador = await prisma.user.findUnique({
      where: { id: servicio.creadoPorId },
      select: { nombre: true }
    });

    // Generar QR code si hay link de seguimiento
    let qrBase64 = null;
    if (servicio.linkSeguimiento) {
      try {
        qrBase64 = await generarQRBase64(servicio.linkSeguimiento);
      } catch (error) {
        console.error('Error generando QR:', error);
      }
    }

    // Obtener tasa de cambio actual - usar la misma fuente que Header.jsx
    const tasaCambio = parseFloat(global.estadoApp?.tasa_bcv?.valor || 38.20);

    // Si es reimpresión del ticket del cliente, incrementar contador ANTES de generar el ticket
    let numeroReimpresion = servicio.reimpresiones || 0;
    if (esReimpresion) {
      const servicioActualizado = await prisma.servicioTecnico.update({
        where: { id: parseInt(id) },
        data: {
          reimpresiones: { increment: 1 }
        },
        select: {
          reimpresiones: true
        }
      });
      numeroReimpresion = servicioActualizado.reimpresiones || 0;

      // Actualizar el objeto servicio con el nuevo número de reimpresiones para que se refleje en el ticket
      servicio.reimpresiones = numeroReimpresion;
    }

    // Generar HTML del ticket (cliente) con tasa de cambio
    const htmlTicket = generarHTMLTicketServicio(
      servicio,
      usuarioCreador,
      servicio.linkSeguimiento,
      qrBase64,
      tasaCambio, // 🆕 Pasar tasa de cambio
      esReimpresion, // 🆕 Pasar flag de reimpresión
      numeroReimpresion // 🆕 Pasar número de reimpresión
    );

    // Generar HTML del ticket interno
    const htmlTicketInterno = generarHTMLTicketInterno(servicio);

    res.json({
      success: true,
      data: {
        ticketHTML: htmlTicket,
        ticketHTMLInterno: htmlTicketInterno, // 🆕 Ticket interno
        qrCode: qrBase64,
        linkSeguimiento: servicio.linkSeguimiento
      }
    });

  } catch (error) {
    console.error('❌ Error en regenerarTicketServicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerando ticket',
      error: error.message
    });
  }
};

// ===================================
// 📦 FINALIZAR ENTREGA
// ===================================
const finalizarEntrega = async (req, res) => {
  try {
    const { id } = req.params;
    const { datosRetiro } = req.body; // { esDiferente: boolean, nombreRetiro?: string, cedulaRetiro?: string }

    const servicioActual = await prisma.servicioTecnico.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: true,
        pagos: true
      }
    });

    if (!servicioActual) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Validar que no tenga saldo pendiente
    if (parseFloat(servicioActual.saldoPendiente) > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede entregar el servicio con saldo pendiente'
      });
    }

    // Validar que esté en LISTO_RETIRO
    if (servicioActual.estado !== 'LISTO_RETIRO') {
      return res.status(400).json({
        success: false,
        message: 'El servicio debe estar en estado LISTO_RETIRO para ser entregado'
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener caja actual si no está guardada en el servicio
      let cajaEntregaId = servicioActual.cajaEntregaId;
      if (!cajaEntregaId) {
        const cajaActual = await tx.caja.findFirst({
          where: { estado: 'ABIERTA' },
          orderBy: { createdAt: 'desc' }
        });
        if (cajaActual) {
          cajaEntregaId = cajaActual.id;
        }
      }

      // Actualizar estado a ENTREGADO
      const servicio = await tx.servicioTecnico.update({
        where: { id: parseInt(id) },
        data: {
          estado: 'ENTREGADO',
          fechaEntregaReal: new Date(),
          cajaEntregaId: cajaEntregaId || servicioActual.cajaEntregaId
        },
        include: {
          items: true,
          pagos: true,
          notas: true
        }
      });

      // Crear nota de entrega
      let contenidoNota = `[ICON:PACKAGE] Equipo entregado`;
      if (datosRetiro && datosRetiro.esDiferente && datosRetiro.nombreRetiro) {
        contenidoNota += `\n\n⚠️ Retirado por persona diferente:\n`;
        contenidoNota += `• Nombre: ${datosRetiro.nombreRetiro}\n`;
        contenidoNota += `• Cédula: ${datosRetiro.cedulaRetiro || 'N/A'}`;
      }

      await tx.servicioTecnicoNota.create({
        data: {
          servicioId: parseInt(id),
          tipo: 'CAMBIO_ESTADO',
          contenido: contenidoNota,
          tecnico: req.user?.nombre || req.user?.email || 'Sistema',
          estadoAnterior: 'LISTO_RETIRO',
          estadoNuevo: 'ENTREGADO'
        }
      });

      return servicio;
    });


    // Enviar WhatsApp de entrega
    const tasaCambio = parseFloat(global.estadoApp?.tasa_bcv?.valor || 38.20);

    setImmediate(async () => {
      try {
        if (resultado.clienteTelefono) {
          const resultadoWhatsApp = await enviarWhatsAppEntrega(
            resultado,
            datosRetiro,
            tasaCambio
          );

          if (resultadoWhatsApp.success) {
          } else {
            console.error('❌ Error enviando WhatsApp de entrega:', resultadoWhatsApp.message);
          }
        }
      } catch (error) {
        console.error('❌ Error enviando WhatsApp de entrega:', error);
      }
    });

    // 📡 Emitir evento Socket.IO
    if (req.io) {
      const servicioCompleto = await prisma.servicioTecnico.findUnique({
        where: { id: parseInt(id) },
        include: {
          notas: {
            orderBy: { fecha: 'desc' }
          }
        }
      });

      const ultimaNota = servicioCompleto?.notas?.[0];
      if (ultimaNota) {
        req.io.emit('nota_servicio_agregada', {
          servicioId: parseInt(id),
          nota: ultimaNota,
          servicio: servicioCompleto,
          usuario: req.user?.nombre || req.user?.email,
          timestamp: new Date().toISOString()
        });
      }

      req.io.emit('servicio_entregado', {
        servicioId: parseInt(id),
        servicio: resultado,
        usuario: req.user?.nombre || req.user?.email,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Servicio entregado exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error en finalizarEntrega:', error);
    res.status(500).json({
      success: false,
      message: 'Error finalizando entrega',
      error: error.message
    });
  }
};

// ===================================
// 💡 GUARDAR SUGERENCIA (MARCA/MODELO/PROBLEMA)
// ===================================
const guardarSugerencia = async (req, res) => {
  try {
    const { tipo, tipoDispositivo, valor, marcaPadre } = req.body;

    if (!tipo || !valor) {
      return res.status(400).json({
        success: false,
        message: 'Tipo y valor son requeridos'
      });
    }

    // Validar tipo
    const tiposValidos = ['marca', 'modelo', 'problema'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
      });
    }

    // Normalizar valor (trim y capitalize primera letra)
    const valorNormalizado = valor.trim();
    if (!valorNormalizado) {
      return res.status(400).json({
        success: false,
        message: 'El valor no puede estar vacío'
      });
    }

    // Buscar sugerencia existente usando findFirst ya que el índice único puede tener nulls
    const sugerenciaExistente = await prisma.sugerenciaServicio.findFirst({
      where: {
        tipo,
        tipoDispositivo: tipoDispositivo || null,
        valor: valorNormalizado,
        marcaPadre: marcaPadre || null
      }
    });

    if (sugerenciaExistente) {
      // Incrementar frecuencia
      const actualizada = await prisma.sugerenciaServicio.update({
        where: { id: sugerenciaExistente.id },
        data: { frecuencia: { increment: 1 } }
      });

      return res.json({
        success: true,
        data: actualizada,
        message: 'Sugerencia actualizada'
      });
    } else {
      // Crear nueva sugerencia
      const nueva = await prisma.sugerenciaServicio.create({
        data: {
          tipo,
          tipoDispositivo: tipoDispositivo || null,
          valor: valorNormalizado,
          marcaPadre: marcaPadre || null,
          frecuencia: 1
        }
      });

      return res.json({
        success: true,
        data: nueva,
        message: 'Sugerencia guardada'
      });
    }
  } catch (error) {
    console.error('❌ Error en guardarSugerencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error guardando sugerencia',
      error: error.message
    });
  }
};

// ===================================
// 🔍 OBTENER SUGERENCIAS
// ===================================
const obtenerSugerencias = async (req, res) => {
  try {
    const { tipo, tipoDispositivo, marcaPadre } = req.query;

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: 'Tipo es requerido'
      });
    }

    const where = { tipo };

    // Solo agregar tipoDispositivo si está presente en la query
    if (tipoDispositivo !== undefined && tipoDispositivo !== null && tipoDispositivo !== 'null' && tipoDispositivo !== 'undefined') {
      where.tipoDispositivo = tipoDispositivo;
    }

    // Solo agregar marcaPadre si está presente en la query
    if (marcaPadre !== undefined && marcaPadre !== null && marcaPadre !== 'null' && marcaPadre !== 'undefined') {
      where.marcaPadre = marcaPadre;
    }

    const sugerencias = await prisma.sugerenciaServicio.findMany({
      where,
      orderBy: [
        { frecuencia: 'desc' },
        { valor: 'asc' }
      ],
      take: 50 // Limitar a 50 resultados
    });

    res.json({
      success: true,
      data: sugerencias.map(s => s.valor) || []
    });
  } catch (error) {
    console.error('❌ Error en obtenerSugerencias:', error);
    // En caso de error (por ejemplo, tabla no existe), devolver array vacío
    res.json({
      success: true,
      data: []
    });
  }
};

module.exports = {
  getServicios,
  getServicioById,
  getServicioPublico,
  createServicio,
  updateServicio,
  cambiarEstado,
  registrarPago,
  agregarNota,
  eliminarNota,
  actualizarVisibilidadNota,
  publicarImagenesServicio,
  regenerarTicketServicio,
  getTecnicos,
  getTecnicosConfig,
  saveTecnicosConfig,
  deleteServicio,
  finalizarEntrega,
  guardarSugerencia,
  obtenerSugerencias
};
