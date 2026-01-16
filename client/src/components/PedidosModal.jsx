// components/PedidosModal.jsx - Modal principal de gestión de pedidos
import React, { useState, useEffect } from 'react';
import {
    X, Package, Search, Filter, Plus, Eye, Edit,
    DollarSign, Phone, Clock, CheckCircle, Truck,
    Store, XCircle, RefreshCw, MessageCircle
} from 'lucide-react';
import { api } from '../config/api';
import toast from '../utils/toast.jsx';
import NuevoPedidoModal from './NuevoPedidoModal';
import DetallePedidoModal from './DetallePedidoModal';

// Colores por estado
const ESTADOS_CONFIG = {
    PENDIENTE: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'Pendiente'
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

const PedidosModal = ({ isOpen, onClose }) => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadisticas, setEstadisticas] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [showNuevoPedido, setShowNuevoPedido] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const PEDIDOS_POR_PAGINA = 4;

    // Cargar pedidos
    const cargarPedidos = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtroEstado) params.append('estado', filtroEstado);
            if (busqueda) params.append('busqueda', busqueda);

            const [pedidosRes, statsRes] = await Promise.all([
                api.get(`/pedidos?${params.toString()}`),
                api.get('/pedidos/estadisticas')
            ]);

            // Filtrar pedidos cancelados con más de 1 mes
            const unMesAtras = new Date();
            unMesAtras.setMonth(unMesAtras.getMonth() - 1);

            const pedidosFiltrados = (pedidosRes.data.data || []).filter(pedido => {
                if (pedido.estado === 'CANCELADO') {
                    const fechaPedido = new Date(pedido.createdAt || pedido.fecha);
                    return fechaPedido > unMesAtras;
                }
                return true;
            });

            setPedidos(pedidosFiltrados);
            setEstadisticas(statsRes.data.data);
            setPaginaActual(1); // Reset paginación
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            cargarPedidos();
        }
    }, [isOpen, filtroEstado, busqueda]);

    // Calcular pedidos paginados
    const totalPaginas = Math.ceil(pedidos.length / PEDIDOS_POR_PAGINA);
    const pedidosPaginados = pedidos.slice(
        (paginaActual - 1) * PEDIDOS_POR_PAGINA,
        paginaActual * PEDIDOS_POR_PAGINA
    );

    // Cambiar estado del pedido
    const cambiarEstado = async (pedidoId, nuevoEstado) => {
        try {
            const response = await api.patch(`/pedidos/${pedidoId}/estado`, { nuevoEstado });

            // Mostrar toast de éxito
            toast.success(`Estado cambiado a ${ESTADOS_CONFIG[nuevoEstado]?.label}`);

            // Verificar si WhatsApp se envió
            if (response.data.whatsapp) {
                if (response.data.whatsapp.intentado && !response.data.whatsapp.enviado) {
                    // WhatsApp no se pudo enviar
                    toast.warning(`⚠️ No se envió WhatsApp: ${response.data.whatsapp.error || 'Error desconocido'}`);
                }
            }

            cargarPedidos();
        } catch (error) {
            console.error('Error cambiando estado:', error);
            toast.error('Error al cambiar estado');
        }
    };

    // Facturar pedido
    const facturarPedido = async (pedido) => {
        // TODO: Abrir modal de pago similar a IngresoModal
        toast.info('Función de facturación en desarrollo');
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] h-[95vh] flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Pedidos de Productos</h2>
                                <p className="text-blue-100 text-sm">Gestión de solicitudes y seguimiento</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Estadísticas */}
                    {estadisticas && (
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-6 gap-3">
                            <div className="bg-white rounded-lg p-2 text-center border border-gray-100 shadow-sm">
                                <div className="text-lg font-bold text-gray-800">{estadisticas.total}</div>
                                <div className="text-xs text-gray-500">Total</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-2 text-center border border-yellow-200">
                                <div className="text-lg font-bold text-yellow-700">{estadisticas.pendientes}</div>
                                <div className="text-xs text-yellow-600">Pendientes</div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
                                <div className="text-lg font-bold text-blue-700">{estadisticas.pagados}</div>
                                <div className="text-xs text-blue-600">Pagados</div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
                                <div className="text-lg font-bold text-orange-700">{estadisticas.enCamino}</div>
                                <div className="text-xs text-orange-600">En Camino</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                                <div className="text-lg font-bold text-green-700">{estadisticas.recibidos}</div>
                                <div className="text-xs text-green-600">Recibidos</div>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                                <div className="text-lg font-bold text-emerald-700">{estadisticas.entregados}</div>
                                <div className="text-xs text-emerald-600">Entregados</div>
                            </div>
                        </div>
                    )}

                    {/* Filtros y búsqueda */}
                    <div className="px-6 py-3 bg-white border-b border-blue-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            {/* Búsqueda */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente, teléfono o número..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                                />
                            </div>

                            {/* Filtro por estado */}
                            <select
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                                className="px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                            >
                                <option value="">Todos los estados</option>
                                {Object.entries(ESTADOS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>

                            {/* Refrescar */}
                            <button
                                onClick={cargarPedidos}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Nuevo pedido */}
                        <button
                            onClick={() => setShowNuevoPedido(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Nuevo Pedido</span>
                        </button>
                    </div>

                    {/* Lista de pedidos */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                            </div>
                        ) : pedidos.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-500">No hay pedidos</h3>
                                <p className="text-gray-400 mt-1">Los pedidos aparecerán aquí</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pedidosPaginados.map((pedido) => {
                                    const estadoConfig = ESTADOS_CONFIG[pedido.estado] || ESTADOS_CONFIG.PENDIENTE;
                                    const IconEstado = estadoConfig.icon;

                                    return (
                                        <div
                                            key={pedido.id}
                                            className="bg-white border border-blue-100 rounded-xl p-4 hover:shadow-lg hover:border-blue-200 transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                {/* Info principal */}
                                                <div className="flex items-center space-x-4">
                                                    {/* Badge estado */}
                                                    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${estadoConfig.color}`}>
                                                        <IconEstado className="h-4 w-4" />
                                                        <span>{estadoConfig.label}</span>
                                                    </div>

                                                    {/* Número y cliente */}
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-bold text-gray-800">{pedido.numero}</span>
                                                            {!pedido.pagado && (
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                                                    Sin pagar
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center space-x-3">
                                                            <span>{pedido.clienteNombre}</span>
                                                            {pedido.clienteTelefono && (
                                                                <span className="flex items-center space-x-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    <span>{pedido.clienteTelefono}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Totales y acciones */}
                                                <div className="flex items-center space-x-6">
                                                    {/* Total */}
                                                    <div className="text-right">
                                                        <div className="font-bold text-lg text-green-600">
                                                            ${parseFloat(pedido.totalUsd).toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {new Date(pedido.fecha).toLocaleDateString('es-VE')}
                                                        </div>
                                                    </div>

                                                    {/* Acciones */}
                                                    <div className="flex items-center space-x-2">
                                                        {/* Ver detalle */}
                                                        <button
                                                            onClick={() => setPedidoSeleccionado(pedido)}
                                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Ver detalle"
                                                        >
                                                            <Eye className="h-5 w-5" />
                                                        </button>

                                                        {/* Facturar (si no está pagado) */}
                                                        {!pedido.pagado && (
                                                            <button
                                                                onClick={() => facturarPedido(pedido)}
                                                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Facturar pedido"
                                                            >
                                                                <DollarSign className="h-5 w-5" />
                                                            </button>
                                                        )}

                                                        {/* Cambiar estado */}
                                                        {pedido.estado !== 'ENTREGADO' && pedido.estado !== 'CANCELADO' && (() => {
                                                            // Orden de estados (sin cancelado que siempre está disponible)
                                                            const ordenEstados = ['PENDIENTE', 'PAGADO', 'CONFIRMADO', 'EN_CAMINO', 'RECIBIDO', 'ENTREGADO'];
                                                            const indiceActual = ordenEstados.indexOf(pedido.estado);

                                                            // Filtrar: solo el estado actual y los siguientes + CANCELADO
                                                            const estadosDisponibles = ordenEstados
                                                                .slice(indiceActual)
                                                                .concat(['CANCELADO']);

                                                            return (
                                                                <select
                                                                    value={pedido.estado}
                                                                    onChange={(e) => cambiarEstado(pedido.id, e.target.value)}
                                                                    className="text-sm border border-blue-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 bg-blue-50"
                                                                >
                                                                    {estadosDisponibles.map(key => (
                                                                        <option key={key} value={key}>{ESTADOS_CONFIG[key]?.label || key}</option>
                                                                    ))}
                                                                </select>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview de items */}
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <div className="text-xs text-gray-500">
                                                    {(pedido.items || []).slice(0, 3).map((item, idx) => (
                                                        <span key={idx} className="mr-2">
                                                            • {item.descripcion} x{item.cantidad}
                                                        </span>
                                                    ))}
                                                    {(pedido.items || []).length > 3 && (
                                                        <span className="text-blue-600">+{pedido.items.length - 3} más</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Paginación */}
                        {!loading && pedidos.length > PEDIDOS_POR_PAGINA && (
                            <div className="flex items-center justify-center gap-2 pt-4 border-t border-blue-100 mt-4">
                                <button
                                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                    disabled={paginaActual === 1}
                                    className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setPaginaActual(num)}
                                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${paginaActual === num
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaActual === totalPaginas}
                                    className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Siguiente
                                </button>
                                <span className="text-xs text-gray-500 ml-2">
                                    {pedidos.length} pedidos
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal nuevo pedido */}
            {showNuevoPedido && (
                <NuevoPedidoModal
                    isOpen={showNuevoPedido}
                    onClose={() => setShowNuevoPedido(false)}
                    onSuccess={() => {
                        setShowNuevoPedido(false);
                        cargarPedidos();
                    }}
                />
            )}

            {/* Modal detalle pedido */}
            {pedidoSeleccionado && (
                <DetallePedidoModal
                    isOpen={!!pedidoSeleccionado}
                    pedido={pedidoSeleccionado}
                    onClose={() => setPedidoSeleccionado(null)}
                    onUpdate={cargarPedidos}
                />
            )}
        </>
    );
};

export default PedidosModal;
