// components/DetallePedidoModal.jsx - Modal de detalle y gestión de pedido
import React, { useState, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Package from 'lucide-react/dist/esm/icons/package'
import User from 'lucide-react/dist/esm/icons/user'
import Phone from 'lucide-react/dist/esm/icons/phone'
import Mail from 'lucide-react/dist/esm/icons/mail'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Printer from 'lucide-react/dist/esm/icons/printer'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import Clock from 'lucide-react/dist/esm/icons/clock'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Truck from 'lucide-react/dist/esm/icons/truck'
import Store from 'lucide-react/dist/esm/icons/store'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Building from 'lucide-react/dist/esm/icons/building'
import Tag from 'lucide-react/dist/esm/icons/tag'
import LinkIcon from 'lucide-react/dist/esm/icons/link'
import History from 'lucide-react/dist/esm/icons/history'
import Send from 'lucide-react/dist/esm/icons/send'
import Monitor from 'lucide-react/dist/esm/icons/monitor'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import { api } from '../config/api';
import toast from '../utils/toast.jsx';
import { generarReciboPedidoHTML } from '../utils/printUtils';

// Configuración de estados
const ESTADOS_CONFIG = {
    PENDIENTE: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'Pendiente'
    },
    ANTICIPO: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Wallet,
        label: 'Anticipo'
    },
    PAGADO: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: DollarSign,
        label: 'Pagado'
    },
    CONFIRMADO: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: CheckCircle,
        label: 'Confirmado'
    },
    EN_CAMINO: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Truck,
        label: 'En Camino'
    },
    RECIBIDO: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Store,
        label: 'Recibido'
    },
    LISTO: {
        color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        icon: Monitor,
        label: 'Listo para Entregar'
    },
    ENTREGADO: {
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        label: 'Entregado'
    },
    CANCELADO: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: 'Cancelado'
    }
};

// Estados según tipo de pedido
const ESTADOS_FISICO = ['PENDIENTE', 'ANTICIPO', 'PAGADO', 'CONFIRMADO', 'EN_CAMINO', 'RECIBIDO', 'ENTREGADO'];
const ESTADOS_DIGITAL = ['PENDIENTE', 'ANTICIPO', 'PAGADO', 'CONFIRMADO', 'LISTO', 'ENTREGADO'];

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

    // Imprimir Ticket Térmico 80mm
    const handlePrint = () => {
        const datosImpresion = {
            ...pedido,
            cliente: pedido.cliente || {
                nombre: pedido.clienteNombre,
                telefono: pedido.clienteTelefono,
                email: pedido.clienteEmail,
                cedula_rif: pedido.clienteCedulaRif
            },
            usuario: pedido.creadoPor || { nombre: 'Sistema' },
            items: Array.isArray(pedido.items) ? pedido.items : [],
            pagos: pedido.pagos || [], // Asegurar que vengan incluidos en el endpoint de detalle
            montoAnticipo: pedido.montoAnticipo || 0,
            montoPendiente: pedido.montoPendiente || 0
        };

        const html = generarReciboPedidoHTML(datosImpresion, pedido.tasaCambio || 1);

        const win = window.open('', '_blank', 'width=350,height=600');
        if (win) {
            win.document.write(html);
            win.document.close();
        } else {
            toast.error('Habilita los pop-ups para imprimir');
        }
    };

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

    // Enviar WhatsApp (Chat directo)
    const handleEnviarWhatsApp = () => {
        if (!pedido.clienteTelefono) {
            toast.error('El cliente no tiene teléfono registrado');
            return;
        }

        let numero = pedido.clienteTelefono.replace(/\D/g, '');
        if (!numero.startsWith('58')) numero = `58${numero}`;

        // Abrir chat directo sin mensaje predefinido para escribir personalizado
        window.open(`https://wa.me/${numero}`, '_blank');
    };

    if (!isOpen || !pedido) return null;

    const estadoActual = ESTADOS_CONFIG[pedido.estado] || ESTADOS_CONFIG.PENDIENTE;
    const IconEstado = estadoActual.icon;
    const esDigital = pedido.tipoPedido === 'digital';
    const estadosFlujo = esDigital ? ESTADOS_DIGITAL : ESTADOS_FISICO;
    const indiceActual = estadosFlujo.indexOf(pedido.estado);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] h-[95vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            {esDigital ? <Monitor className="h-6 w-6 text-white" /> : <Package className="h-6 w-6 text-white" />}
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-xl font-bold text-white">Pedido {pedido.numero}</h2>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${esDigital ? 'bg-cyan-400/30 text-cyan-100' : 'bg-blue-400/30 text-blue-100'
                                    }`}>
                                    {esDigital ? 'Digital' : 'Físico'}
                                </span>
                            </div>
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

                    {/* Info Cliente - Una sola fila */}
                    <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 rounded-xl px-4 py-3 border border-blue-100/50 shadow-sm">
                        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1">
                            <div className="flex items-center space-x-2">
                                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-lg">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-bold text-gray-800">{pedido.clienteNombre}</span>
                            </div>
                            {pedido.clienteTelefono && (
                                <span className="flex items-center space-x-1 text-sm text-gray-500">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>{pedido.clienteTelefono}</span>
                                </span>
                            )}
                            {pedido.clienteEmail && (
                                <span className="flex items-center space-x-1 text-sm text-gray-500">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>{pedido.clienteEmail}</span>
                                </span>
                            )}
                            {pedido.clienteCedulaRif && (
                                <span className="flex items-center space-x-1 text-sm">
                                    <span className="text-gray-400">RIF/CI:</span>
                                    <span className="font-mono font-medium text-gray-600">{pedido.clienteCedulaRif}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Items - Premium Table */}
                    <div>
                        <h3 className="flex items-center space-x-2 font-bold text-gray-800 mb-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg">
                                <Package className="h-4 w-4 text-white" />
                            </div>
                            <span>Items del Pedido</span>
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                {(pedido.items || []).length}
                            </span>
                        </h3>
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-500 to-purple-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Producto</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Cant.</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wide">Precio</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wide">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(pedido.items || []).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center flex-wrap gap-x-2">
                                                    <span className="font-medium text-gray-800">{item.descripcion}</span>
                                                    {item.notaInterna && (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            {item.notaInterna.proveedor && (
                                                                <span className="flex items-center space-x-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                    <Building className="h-3 w-3" />
                                                                    <span>{item.notaInterna.proveedor}</span>
                                                                </span>
                                                            )}
                                                            {item.notaInterna.codigoProducto && (
                                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {item.notaInterna.codigoProducto}
                                                                </span>
                                                            )}
                                                            {item.notaInterna.link && (
                                                                <a
                                                                    href={item.notaInterna.link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full hover:bg-blue-200 transition-colors"
                                                                >
                                                                    <LinkIcon className="h-3 w-3 inline" /> Link
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-gray-100 px-2.5 py-1 rounded-lg font-bold text-gray-700">{item.cantidad}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">${item.precioUnitario?.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-green-600 text-lg">${item.subtotal?.toFixed(2)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totales - Compacto sin Descuento */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3 shadow-md">
                        <div className="flex items-center justify-center space-x-6">
                            <div className="text-center">
                                <div className="text-[10px] text-white/70 uppercase tracking-wide">Total</div>
                                <div className="text-2xl font-black text-white">${parseFloat(pedido.totalUsd).toFixed(2)}</div>
                            </div>
                            <div className="text-white/40">|</div>
                            <div className="text-center">
                                <div className="text-[10px] text-white/70 uppercase tracking-wide">En Bs.</div>
                                <div className="text-lg font-bold text-white/90">
                                    Bs. {parseFloat(pedido.totalBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estado de pago - Una sola fila */}
                    <div className={`rounded-xl px-4 py-2.5 flex items-center justify-center flex-wrap gap-x-4 gap-y-1 ${pedido.pagado ? 'bg-green-50 border border-green-200' : pedido.tipoPago === 'anticipo' ? 'bg-orange-50 border border-orange-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        {/* Estado */}
                        <div className="flex items-center space-x-1.5">
                            {pedido.pagado ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="font-bold text-green-800 text-sm">Pagado</span>
                                    {pedido.tipoPago && (
                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                                            {pedido.tipoPago.replace('_', ' ')}
                                        </span>
                                    )}
                                    {pedido.fechaPago && (
                                        <span className="text-xs text-green-600">
                                            ({new Date(pedido.fechaPago).toLocaleDateString('es-VE')})
                                        </span>
                                    )}
                                </>
                            ) : pedido.tipoPago === 'anticipo' ? (
                                <>
                                    <Wallet className="h-4 w-4 text-orange-600" />
                                    <span className="font-bold text-orange-800 text-sm">Anticipo</span>
                                </>
                            ) : pedido.tipoPago === 'diferido' ? (
                                <>
                                    <Truck className="h-4 w-4 text-gray-600" />
                                    <span className="font-bold text-gray-700 text-sm">Pagar al Recibir</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                    <span className="font-bold text-yellow-800 text-sm">Pendiente</span>
                                </>
                            )}
                        </div>

                        {/* Montos inline */}
                        {parseFloat(pedido.montoAnticipo || 0) > 0 && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="text-sm">
                                    <span className="text-gray-500">Pagado:</span>{' '}
                                    <span className="font-bold text-green-600">${parseFloat(pedido.montoAnticipo).toFixed(2)}</span>
                                </span>
                            </>
                        )}
                        {parseFloat(pedido.montoPendiente || 0) > 0 && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="text-sm">
                                    <span className="text-gray-500">Deuda:</span>{' '}
                                    <span className="font-bold text-red-600">${parseFloat(pedido.montoPendiente).toFixed(2)}</span>
                                </span>
                            </>
                        )}

                        {/* Mostrar pagos de la transacción si existen */}
                        {pedido.transaccion?.pagos?.length > 0 && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="text-sm flex items-center gap-1">
                                    {pedido.transaccion.pagos.map((pago, idx) => (
                                        <span key={idx} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                            {pago.metodo?.replace('_', ' ')}: {pago.moneda === 'bs' ? 'Bs.' : '$'}{parseFloat(pago.monto).toFixed(2)}
                                        </span>
                                    ))}
                                </span>
                            </>
                        )}
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

                {/* Footer con acciones - Premium */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-gray-50 to-indigo-50 border-t border-gray-200 flex items-center justify-between">
                    {/* Acciones secundarias */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                        >
                            <Printer className="h-4 w-4" />
                            <span className="font-medium">Imprimir Ticket</span>
                        </button>
                        <button
                            onClick={handleEnviarWhatsApp}
                            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="font-medium">WhatsApp</span>
                        </button>
                    </div>

                    {/* Cerrar - Premium */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="flex items-center space-x-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-xl shadow-sm font-medium transition-all"
                        >
                            <X className="h-4 w-4" />
                            <span>Cerrar</span>
                        </button>
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

