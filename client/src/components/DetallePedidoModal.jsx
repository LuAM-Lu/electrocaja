// components/DetallePedidoModal.jsx - Modal de detalle y gestión de pedido
import React, { useState, useRef } from 'react';
import {
    X, Package, User, Phone, Mail, Calendar,
    DollarSign, Printer, MessageCircle, Clock,
    CheckCircle, Truck, Store, XCircle, FileText,
    ChevronRight, Building, Tag, Link as LinkIcon,
    History, Send
} from 'lucide-react';
import { api } from '../config/api';
import toast from '../utils/toast.jsx';
import { useReactToPrint } from 'react-to-print';

// Configuración de estados
const ESTADOS_CONFIG = {
    PENDIENTE: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'Pendiente',
        siguiente: 'PAGADO'
    },
    PAGADO: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: DollarSign,
        label: 'Pagado',
        siguiente: 'CONFIRMADO'
    },
    CONFIRMADO: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: CheckCircle,
        label: 'Confirmado',
        siguiente: 'EN_CAMINO'
    },
    EN_CAMINO: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Truck,
        label: 'En Camino',
        siguiente: 'RECIBIDO'
    },
    RECIBIDO: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Store,
        label: 'Listo para Entregar',
        siguiente: 'ENTREGADO'
    },
    ENTREGADO: {
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        label: 'Entregado',
        siguiente: null
    },
    CANCELADO: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: 'Cancelado',
        siguiente: null
    }
};

// Componente de Ticket para imprimir
const TicketPedido = React.forwardRef(({ pedido }, ref) => {
    const fecha = new Date(pedido.fecha).toLocaleDateString('es-VE');
    const hora = new Date(pedido.createdAt).toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div ref={ref} className="p-4 bg-white" style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px' }}>
            {/* Header */}
            <div className="text-center mb-4">
                <div className="text-lg font-bold">ELECTRO CAJA</div>
                <div className="text-xs">Tu Tienda de Tecnología</div>
                <div className="border-t border-dashed mt-2 pt-2">
                    <div className="font-bold">COMPROBANTE DE PEDIDO</div>
                </div>
            </div>

            {/* Info del pedido */}
            <div className="mb-3">
                <div className="flex justify-between">
                    <span>Pedido:</span>
                    <span className="font-bold">{pedido.numero}</span>
                </div>
                <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>{fecha} {hora}</span>
                </div>
                <div className="flex justify-between">
                    <span>Estado:</span>
                    <span className="font-bold">{ESTADOS_CONFIG[pedido.estado]?.label}</span>
                </div>
            </div>

            <div className="border-t border-dashed my-2"></div>

            {/* Cliente */}
            <div className="mb-3">
                <div className="font-bold">CLIENTE:</div>
                <div>{pedido.clienteNombre}</div>
                {pedido.clienteTelefono && <div>Tel: {pedido.clienteTelefono}</div>}
            </div>

            <div className="border-t border-dashed my-2"></div>

            {/* Items */}
            <div className="mb-3">
                <div className="font-bold mb-1">DETALLE:</div>
                {(pedido.items || []).map((item, idx) => (
                    <div key={idx} className="mb-1">
                        <div className="flex justify-between">
                            <span>{item.cantidad}x {item.descripcion}</span>
                        </div>
                        <div className="flex justify-between text-right">
                            <span></span>
                            <span>${item.subtotal?.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-dashed my-2"></div>

            {/* Totales */}
            <div className="mb-3">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${parseFloat(pedido.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(pedido.descuento) > 0 && (
                    <div className="flex justify-between">
                        <span>Descuento:</span>
                        <span>-${parseFloat(pedido.descuento).toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-1">
                    <span>TOTAL USD:</span>
                    <span>${parseFloat(pedido.totalUsd).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Total Bs.:</span>
                    <span>Bs. {parseFloat(pedido.totalBs).toFixed(2)}</span>
                </div>
            </div>

            <div className="border-t border-dashed my-2"></div>

            {/* Estado de pago */}
            <div className="text-center mb-3">
                {pedido.pagado ? (
                    <div className="font-bold text-lg">✓ PAGADO</div>
                ) : (
                    <div className="font-bold">PENDIENTE DE PAGO</div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-4">
                <div>¡Gracias por su preferencia!</div>
                <div>Le notificaremos cuando su</div>
                <div>pedido esté listo.</div>
            </div>
        </div>
    );
});

TicketPedido.displayName = 'TicketPedido';

const DetallePedidoModal = ({ isOpen, pedido, onClose, onUpdate }) => {
    const ticketRef = useRef();
    const [loading, setLoading] = useState(false);
    const [showHistorial, setShowHistorial] = useState(false);

    // Imprimir
    const handlePrint = useReactToPrint({
        content: () => ticketRef.current,
        documentTitle: `Pedido-${pedido?.numero}`,
        onAfterPrint: () => toast.success('Ticket impreso')
    });

    // Cambiar estado
    const handleCambiarEstado = async (nuevoEstado) => {
        try {
            setLoading(true);
            await api.patch(`/pedidos/${pedido.id}/estado`, { nuevoEstado });
            toast.success(`Estado cambiado a ${ESTADOS_CONFIG[nuevoEstado]?.label}`);
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cambiar estado');
        } finally {
            setLoading(false);
        }
    };

    // Enviar WhatsApp
    const handleEnviarWhatsApp = () => {
        if (!pedido.clienteTelefono) {
            toast.error('El cliente no tiene teléfono registrado');
            return;
        }

        const mensaje = encodeURIComponent(
            `Hola ${pedido.clienteNombre}!\n\n` +
            `Tu pedido *#${pedido.numero}* está en estado: *${ESTADOS_CONFIG[pedido.estado]?.label}*\n\n` +
            `Total: $${parseFloat(pedido.totalUsd).toFixed(2)}\n\n` +
            `¡Gracias por tu preferencia!`
        );

        let numero = pedido.clienteTelefono.replace(/\D/g, '');
        if (!numero.startsWith('58')) numero = `58${numero}`;

        window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
    };

    if (!isOpen || !pedido) return null;

    const estadoActual = ESTADOS_CONFIG[pedido.estado] || ESTADOS_CONFIG.PENDIENTE;
    const IconEstado = estadoActual.icon;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] h-[95vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Package className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Pedido {pedido.numero}</h2>
                            <p className="text-blue-100 text-sm">
                                {new Date(pedido.fecha).toLocaleDateString('es-VE')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Badge estado */}
                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${estadoActual.color}`}>
                            <IconEstado className="h-4 w-4" />
                            <span>{estadoActual.label}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Info Cliente - Compacto en una fila */}
                    <div className="bg-blue-50/50 rounded-xl px-4 py-2 border border-blue-100">
                        <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-1 text-sm">
                            <div className="flex items-center space-x-1">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-gray-800">{pedido.clienteNombre}</span>
                            </div>
                            {pedido.clienteTelefono && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    <span>{pedido.clienteTelefono}</span>
                                </div>
                            )}
                            {pedido.clienteEmail && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                    <Mail className="h-3 w-3" />
                                    <span>{pedido.clienteEmail}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="flex items-center space-x-2 font-bold text-gray-800 mb-3">
                            <Package className="h-5 w-5 text-blue-600" />
                            <span>Items del Pedido</span>
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Cant.</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(pedido.items || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center flex-wrap gap-x-2">
                                                    <span className="font-medium text-sm">{item.descripcion}</span>
                                                    {/* Nota interna - inline */}
                                                    {item.notaInterna && (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            {item.notaInterna.proveedor && (
                                                                <span className="flex items-center space-x-1 text-purple-600">
                                                                    <Building className="h-3 w-3" />
                                                                    <span>{item.notaInterna.proveedor}</span>
                                                                </span>
                                                            )}
                                                            {item.notaInterna.codigoProducto && (
                                                                <span className="text-gray-500">• {item.notaInterna.codigoProducto}</span>
                                                            )}
                                                            {item.notaInterna.link && (
                                                                <a
                                                                    href={item.notaInterna.link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    🔗
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center text-sm">{item.cantidad}</td>
                                            <td className="px-3 py-2 text-right text-sm">${item.precioUnitario?.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-green-600 text-sm">
                                                ${item.subtotal?.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-sm text-gray-500">Subtotal</div>
                                <div className="text-lg font-bold">${parseFloat(pedido.subtotal).toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Descuento</div>
                                <div className="text-lg font-bold text-red-600">
                                    -${parseFloat(pedido.descuento || 0).toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Total USD</div>
                                <div className="text-2xl font-bold text-green-600">
                                    ${parseFloat(pedido.totalUsd).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-400">
                                    Bs. {parseFloat(pedido.totalBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estado de pago */}
                    <div className={`rounded-xl p-4 ${pedido.pagado ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                {pedido.pagado ? (
                                    <>
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <span className="font-bold text-green-800">Pagado</span>
                                        {pedido.fechaPago && (
                                            <span className="text-sm text-green-600">
                                                ({new Date(pedido.fechaPago).toLocaleDateString('es-VE')})
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-5 w-5 text-yellow-600" />
                                        <span className="font-bold text-yellow-800">Pendiente de Pago</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Historial de estados */}
                    <div>
                        <button
                            onClick={() => setShowHistorial(!showHistorial)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
                        >
                            <History className="h-4 w-4" />
                            <span className="text-sm">Ver historial de estados</span>
                            <ChevronRight className={`h-4 w-4 transition-transform ${showHistorial ? 'rotate-90' : ''}`} />
                        </button>

                        {showHistorial && pedido.historialEstados && (
                            <div className="mt-3 space-y-2 pl-6 border-l-2 border-gray-200">
                                {(pedido.historialEstados || []).map((h, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-blue-500" />
                                        <div className="text-sm">
                                            <span className="font-medium">{h.estado}</span>
                                            <span className="text-gray-400 mx-2">•</span>
                                            <span className="text-gray-500">{new Date(h.fecha).toLocaleString('es-VE')}</span>
                                            <span className="text-gray-400 mx-2">•</span>
                                            <span className="text-gray-500">{h.usuario}</span>
                                        </div>
                                        {h.mensaje && (
                                            <div className="text-xs text-gray-400">{h.mensaje}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer con acciones */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50/50 border-t border-blue-100 flex items-center justify-between">
                    {/* Acciones secundarias */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Printer className="h-5 w-5" />
                            <span>Imprimir</span>
                        </button>
                        <button
                            onClick={handleEnviarWhatsApp}
                            className="flex items-center space-x-2 px-4 py-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        >
                            <MessageCircle className="h-5 w-5" />
                            <span>WhatsApp</span>
                        </button>
                    </div>

                    {/* Cambiar estado */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Cerrar
                        </button>

                        {estadoActual.siguiente && (
                            <button
                                onClick={() => handleCambiarEstado(estadoActual.siguiente)}
                                disabled={loading}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                ) : (
                                    <>
                                        <Send className="h-5 w-5" />
                                        <span>Pasar a {ESTADOS_CONFIG[estadoActual.siguiente]?.label}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Ticket oculto para imprimir */}
                <div className="hidden">
                    <TicketPedido ref={ticketRef} pedido={pedido} />
                </div>
            </div>
        </div>
    );
};

export default DetallePedidoModal;
