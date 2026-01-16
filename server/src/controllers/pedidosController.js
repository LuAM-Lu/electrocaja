// controllers/pedidosController.js - Controlador de Pedidos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generar número de pedido único: PED-2026-0001
const generarNumeroPedido = async () => {
    const año = new Date().getFullYear();
    const ultimoPedido = await prisma.pedido.findFirst({
        where: {
            numero: {
                startsWith: `PED-${año}-`
            }
        },
        orderBy: { numero: 'desc' }
    });

    let consecutivo = 1;
    if (ultimoPedido) {
        const partes = ultimoPedido.numero.split('-');
        consecutivo = parseInt(partes[2]) + 1;
    }

    return `PED-${año}-${consecutivo.toString().padStart(4, '0')}`;
};

// Mensajes WhatsApp por estado
const MENSAJES_ESTADO = {
    PENDIENTE: (pedido) => `🛒 *NUEVO PEDIDO #${pedido.numero}*\n\nHola ${pedido.clienteNombre}!\nTu solicitud ha sido registrada.\n\n📦 Total: $${pedido.totalUsd}\n⏳ Estado: Pendiente de pago\n\nTe contactaremos pronto para confirmar.`,
    PAGADO: (pedido) => `✅ *PAGO CONFIRMADO - Pedido #${pedido.numero}*\n\nHola ${pedido.clienteNombre}!\nHemos recibido tu pago.\n\n📦 Total: $${pedido.totalUsd}\n🔄 Estamos procesando tu pedido.\n\nTe avisaremos cuando lo confirmemos con el proveedor.`,
    CONFIRMADO: (pedido) => `📋 *PEDIDO CONFIRMADO #${pedido.numero}*\n\nHola ${pedido.clienteNombre}!\nEl proveedor ha confirmado la disponibilidad de tu producto.\n\n⏳ Pronto estará en camino.`,
    EN_CAMINO: (pedido) => `🚚 *EN CAMINO - Pedido #${pedido.numero}*\n\nHola ${pedido.clienteNombre}!\nTu producto está en camino hacia nuestra tienda.\n\n📍 Te avisaremos cuando llegue.`,
    RECIBIDO: (pedido) => `📦 *¡LLEGÓ TU PEDIDO! #${pedido.numero}*\n\nHola ${pedido.clienteNombre}!\nTu producto ya está en nuestra tienda y listo para entrega.\n\n🏪 Pasa a recogerlo cuando puedas.\n📍 Tu Tienda de Tecnología`,
    ENTREGADO: (pedido) => `🎉 *PEDIDO ENTREGADO #${pedido.numero}*\n\nHola ${pedido.clienteNombre}!\nGracias por tu compra.\n\n⭐ Esperamos verte pronto!`,
    CANCELADO: (pedido) => `❌ *PEDIDO CANCELADO #${pedido.numero}*\n\nHola ${pedido.clienteNombre}!\nLamentamos informarte que tu pedido ha sido cancelado.\n\nSi tienes dudas, contáctanos.`
};

// ===================================
// CREAR PEDIDO
// ===================================
const crearPedido = async (req, res) => {
    try {
        const {
            cliente,
            items,
            subtotal,
            descuento = 0,
            totalUsd,
            totalBs,
            tasaCambio,
            observaciones,
            pagarAhora = false,
            pagos = [] // Si paga ahora, aquí van los datos de pago
        } = req.body;

        const usuario = req.user;
        const numero = await generarNumeroPedido();

        console.log(`📦 Creando pedido ${numero} para cliente: ${cliente.nombre}`);

        // Crear el pedido
        const pedido = await prisma.pedido.create({
            data: {
                numero,
                clienteId: cliente.id || null,
                clienteNombre: cliente.nombre,
                clienteTelefono: cliente.telefono || null,
                clienteEmail: cliente.email || null,
                clienteCedulaRif: cliente.cedula_rif || cliente.cedulaRif || null,
                items: items, // JSON con notas internas
                subtotal,
                descuento,
                totalUsd,
                totalBs,
                tasaCambio,
                observaciones,
                pagado: pagarAhora,
                fechaPago: pagarAhora ? new Date() : null,
                estado: pagarAhora ? 'PAGADO' : 'PENDIENTE',
                creadoPorId: usuario.userId,
                historialEstados: [{
                    estado: pagarAhora ? 'PAGADO' : 'PENDIENTE',
                    fecha: new Date().toISOString(),
                    usuario: usuario.nombre,
                    mensaje: pagarAhora ? 'Pedido creado con pago' : 'Pedido creado'
                }]
            },
            include: {
                cliente: true,
                creadoPor: {
                    select: { id: true, nombre: true }
                }
            }
        });

        // Si paga ahora, crear transacción en caja
        let transaccion = null;
        if (pagarAhora && pagos.length > 0) {
            transaccion = await crearTransaccionDesdePedido(pedido, pagos, usuario);

            // Actualizar pedido con la transacción
            await prisma.pedido.update({
                where: { id: pedido.id },
                data: { transaccionId: transaccion.id }
            });
        }

        // Enviar WhatsApp de confirmación (fire-and-forget, no bloquea)
        if (cliente.telefono) {
            enviarWhatsAppPedido(pedido, pedido.estado)
                .then(() => console.log('✅ WhatsApp enviado para pedido', numero))
                .catch(err => console.warn('⚠️ WhatsApp no enviado:', err.message));
        }

        console.log(`✅ Pedido ${numero} creado exitosamente`);

        res.status(201).json({
            success: true,
            message: `Pedido ${numero} creado exitosamente`,
            data: {
                pedido: { ...pedido, transaccion }
            }
        });

    } catch (error) {
        console.error('❌ Error creando pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear pedido',
            error: error.message
        });
    }
};

// ===================================
// LISTAR PEDIDOS
// ===================================
const listarPedidos = async (req, res) => {
    try {
        const {
            estado,
            pagado,
            fechaDesde,
            fechaHasta,
            busqueda,
            page = 1,
            limit = 20
        } = req.query;

        const where = {};

        if (estado) {
            where.estado = estado;
        }

        if (pagado !== undefined) {
            where.pagado = pagado === 'true';
        }

        if (fechaDesde || fechaHasta) {
            where.fecha = {};
            if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
            if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
        }

        if (busqueda) {
            where.OR = [
                { numero: { contains: busqueda, mode: 'insensitive' } },
                { clienteNombre: { contains: busqueda, mode: 'insensitive' } },
                { clienteTelefono: { contains: busqueda } }
            ];
        }

        const [pedidos, total] = await Promise.all([
            prisma.pedido.findMany({
                where,
                include: {
                    cliente: true,
                    transaccion: true,
                    creadoPor: {
                        select: { id: true, nombre: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit)
            }),
            prisma.pedido.count({ where })
        ]);

        res.json({
            success: true,
            data: pedidos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ Error listando pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar pedidos',
            error: error.message
        });
    }
};

// ===================================
// OBTENER PEDIDO POR ID
// ===================================
const obtenerPedido = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await prisma.pedido.findUnique({
            where: { id: parseInt(id) },
            include: {
                cliente: true,
                transaccion: {
                    include: {
                        pagos: true,
                        items: true
                    }
                },
                creadoPor: {
                    select: { id: true, nombre: true }
                }
            }
        });

        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        res.json({
            success: true,
            data: pedido
        });

    } catch (error) {
        console.error('❌ Error obteniendo pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pedido',
            error: error.message
        });
    }
};

// ===================================
// CAMBIAR ESTADO DEL PEDIDO
// ===================================
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoEstado, mensaje } = req.body;
        const usuario = req.user;

        const pedido = await prisma.pedido.findUnique({
            where: { id: parseInt(id) }
        });

        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        // Actualizar historial
        const historial = pedido.historialEstados || [];
        historial.push({
            estado: nuevoEstado,
            fecha: new Date().toISOString(),
            usuario: usuario.nombre,
            mensaje: mensaje || `Cambio a ${nuevoEstado}`
        });

        const pedidoActualizado = await prisma.pedido.update({
            where: { id: parseInt(id) },
            data: {
                estado: nuevoEstado,
                historialEstados: historial
            },
            include: {
                cliente: true,
                creadoPor: {
                    select: { id: true, nombre: true }
                }
            }
        });

        // Verificar si WhatsApp está disponible y enviar notificación
        let whatsappEnviado = false;
        let whatsappError = null;

        if (pedidoActualizado.clienteTelefono) {
            try {
                const whatsappService = require('../services/whatsappService');
                const estado = whatsappService.getEstado();

                if (estado.conectado) {
                    // WhatsApp está conectado, intentar enviar (fire-and-forget)
                    enviarWhatsAppPedido(pedidoActualizado, nuevoEstado)
                        .then(() => console.log('✅ WhatsApp enviado para cambio de estado'))
                        .catch(err => console.warn('⚠️ WhatsApp no enviado:', err.message));
                    whatsappEnviado = true; // Se intentó enviar
                } else {
                    whatsappError = 'WhatsApp no está conectado';
                    console.warn('⚠️ WhatsApp no conectado, no se enviará notificación');
                }
            } catch (err) {
                whatsappError = err.message;
                console.warn('⚠️ Error verificando WhatsApp:', err.message);
            }
        }

        console.log(`📦 Pedido ${pedido.numero} cambió a estado: ${nuevoEstado}`);

        res.json({
            success: true,
            message: `Estado actualizado a ${nuevoEstado}`,
            data: pedidoActualizado,
            whatsapp: {
                intentado: !!pedidoActualizado.clienteTelefono,
                enviado: whatsappEnviado,
                error: whatsappError
            }
        });

    } catch (error) {
        console.error('❌ Error cambiando estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado',
            error: error.message
        });
    }
};

// ===================================
// FACTURAR PEDIDO PENDIENTE
// ===================================
const facturarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { pagos } = req.body;
        const usuario = req.user;

        const pedido = await prisma.pedido.findUnique({
            where: { id: parseInt(id) }
        });

        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        if (pedido.pagado) {
            return res.status(400).json({
                success: false,
                message: 'El pedido ya está pagado'
            });
        }

        // Crear transacción en caja
        const transaccion = await crearTransaccionDesdePedido(pedido, pagos, usuario);

        // Actualizar historial
        const historial = pedido.historialEstados || [];
        historial.push({
            estado: 'PAGADO',
            fecha: new Date().toISOString(),
            usuario: usuario.nombre,
            mensaje: 'Pago registrado'
        });

        // Actualizar pedido
        const pedidoActualizado = await prisma.pedido.update({
            where: { id: parseInt(id) },
            data: {
                pagado: true,
                fechaPago: new Date(),
                estado: 'PAGADO',
                transaccionId: transaccion.id,
                historialEstados: historial
            },
            include: {
                cliente: true,
                transaccion: true
            }
        });

        // Enviar WhatsApp
        if (pedidoActualizado.clienteTelefono) {
            await enviarWhatsAppPedido(pedidoActualizado, 'PAGADO');
        }

        console.log(`💰 Pedido ${pedido.numero} facturado exitosamente`);

        res.json({
            success: true,
            message: 'Pedido facturado exitosamente',
            data: {
                pedido: pedidoActualizado,
                transaccion
            }
        });

    } catch (error) {
        console.error('❌ Error facturando pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error al facturar pedido',
            error: error.message
        });
    }
};

// ===================================
// HELPER: Crear transacción desde pedido
// ===================================
const crearTransaccionDesdePedido = async (pedido, pagos, usuario) => {
    // Obtener caja abierta
    const cajaAbierta = await prisma.caja.findFirst({
        where: {
            estado: 'ABIERTA',
            usuarioAperturaId: usuario.userId
        }
    });

    if (!cajaAbierta) {
        throw new Error('No hay caja abierta para registrar el pago');
    }

    // Generar código de venta
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ventasHoy = await prisma.transaccion.count({
        where: {
            cajaId: cajaAbierta.id,
            fechaHora: { gte: hoy }
        }
    });

    const consecutivo = ventasHoy + 1;
    const codigoVenta = `V-${Date.now()}-${consecutivo}`;

    // Preparar items para la transacción
    const itemsTransaccion = (pedido.items || []).map((item, index) => ({
        descripcion: item.descripcion,
        codigoBarras: `PED-${pedido.numero}-${index + 1}`,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        precioCosto: item.precioCosto || 0,
        descuento: item.descuento || 0,
        subtotal: item.subtotal
    }));

    // Crear transacción
    const transaccion = await prisma.transaccion.create({
        data: {
            cajaId: cajaAbierta.id,
            tipo: 'INGRESO',
            categoria: 'PEDIDO',
            observaciones: `Pago de Pedido #${pedido.numero}`,
            totalBs: pedido.totalBs,
            totalUsd: pedido.totalUsd,
            tasaCambioUsada: pedido.tasaCambio,
            usuarioId: usuario.userId,
            clienteId: pedido.clienteId,
            clienteNombre: pedido.clienteNombre,
            codigoVenta,
            consecutivoDelDia: consecutivo,
            metodoPagoPrincipal: pagos[0]?.metodo || 'efectivo_usd',
            descuentoTotal: pedido.descuento,
            cantidadItems: itemsTransaccion.length,
            items: {
                create: itemsTransaccion
            },
            pagos: {
                create: pagos.map(p => ({
                    metodo: p.metodo,
                    monto: p.monto,
                    moneda: p.moneda,
                    banco: p.banco || null,
                    referencia: p.referencia || null
                }))
            }
        },
        include: {
            items: true,
            pagos: true
        }
    });

    // Actualizar totales de caja según cada pago
    for (const pago of pagos) {
        const updateData = {};
        const esMetodoBs = pago.metodo === 'pago_movil' || pago.metodo === 'efectivo_bs';
        const monto = parseFloat(pago.monto);

        if (pago.metodo === 'pago_movil') {
            updateData.totalPagoMovil = { increment: monto };
        } else if (esMetodoBs) {
            updateData.totalIngresosBs = { increment: monto };
        } else {
            updateData.totalIngresosUsd = { increment: monto };
        }

        await prisma.caja.update({
            where: { id: cajaAbierta.id },
            data: updateData
        });
    }

    return transaccion;
};

// ===================================
// HELPER: Enviar WhatsApp
// ===================================
const enviarWhatsAppPedido = async (pedido, estado) => {
    try {
        const whatsappService = require('../services/whatsappService');

        if (!pedido.clienteTelefono || !whatsappService) {
            return;
        }

        const mensaje = MENSAJES_ESTADO[estado]?.(pedido);
        if (!mensaje) return;

        // Formatear número
        let numero = pedido.clienteTelefono.replace(/\D/g, '');
        if (!numero.startsWith('58')) {
            numero = `58${numero}`;
        }

        await whatsappService.enviarMensaje(numero, mensaje);
        console.log(`📱 WhatsApp enviado a ${numero} - Estado: ${estado}`);

    } catch (error) {
        console.error('⚠️ Error enviando WhatsApp:', error.message);
        // No lanzar error, solo loguear
    }
};

// ===================================
// OBTENER ESTADÍSTICAS
// ===================================
const obtenerEstadisticas = async (req, res) => {
    try {
        const [
            totalPedidos,
            pendientes,
            pagados,
            enCamino,
            recibidos,
            entregados
        ] = await Promise.all([
            prisma.pedido.count(),
            prisma.pedido.count({ where: { estado: 'PENDIENTE' } }),
            prisma.pedido.count({ where: { estado: 'PAGADO' } }),
            prisma.pedido.count({ where: { estado: 'EN_CAMINO' } }),
            prisma.pedido.count({ where: { estado: 'RECIBIDO' } }),
            prisma.pedido.count({ where: { estado: 'ENTREGADO' } })
        ]);

        res.json({
            success: true,
            data: {
                total: totalPedidos,
                pendientes,
                pagados,
                enCamino,
                recibidos,
                entregados
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};

module.exports = {
    crearPedido,
    listarPedidos,
    obtenerPedido,
    cambiarEstado,
    facturarPedido,
    obtenerEstadisticas
};
