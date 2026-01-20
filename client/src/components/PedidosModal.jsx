// components/PedidosModal.jsx - Modal principal de gestión de pedidos
import React, { useState, useEffect } from 'react';
import {
    X, Package, Search, Filter, Plus, Eye, Edit,
    DollarSign, Phone, Clock, CheckCircle, Truck,
    Store, XCircle, RefreshCw, MessageCircle, Monitor, Wallet,
    Trash2, ClipboardCheck, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { api } from '../config/api';
import toast from '../utils/toast.jsx';
import NuevoPedidoModal from './NuevoPedidoModal';
import DetallePedidoModal from './DetallePedidoModal';
import PagarPedidoModal from './PagarPedidoModal';
import { useAuthStore } from '../store/authStore';

// Colores por estado
const ESTADOS_CONFIG = {
    PENDIENTE: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pendiente' },
    ANTICIPO: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Wallet, label: 'Anticipo' },
    PAGADO: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: DollarSign, label: 'Pagado' },
    CONFIRMADO: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ClipboardCheck, label: 'Confirmado' },
    EN_CAMINO: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck, label: 'En Camino' },
    RECIBIDO: { color: 'bg-green-100 text-green-800 border-green-200', icon: Store, label: 'Recibido' },
    LISTO: { color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Monitor, label: 'Listo' },
    ENTREGADO: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle, label: 'Entregado' },
    CANCELADO: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Cancelado' }
};

// Estados por tipo de pedido
const ESTADOS_FISICO = ['PENDIENTE', 'ANTICIPO', 'PAGADO', 'CONFIRMADO', 'EN_CAMINO', 'RECIBIDO', 'ENTREGADO'];
const ESTADOS_DIGITAL = ['PENDIENTE', 'ANTICIPO', 'PAGADO', 'CONFIRMADO', 'LISTO', 'ENTREGADO'];

const PedidosModal = ({ isOpen, onClose }) => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadisticas, setEstadisticas] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [showNuevoPedido, setShowNuevoPedido] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [dropdownAbierto, setDropdownAbierto] = useState(null);
    const [pedidoAPagar, setPedidoAPagar] = useState(null); // Para modal de pago
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
            // Buscar el pedido para validar
            const pedido = pedidos.find(p => p.id === pedidoId);

            // Validar: no puede entregar si no está pagado
            if (nuevoEstado === 'ENTREGADO' && pedido && !pedido.pagado) {
                toast.error('No se puede entregar sin pago completo. Use el botón "$" para registrar el pago.');
                return;
            }

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

    // Abrir modal de pago
    const facturarPedido = (pedido) => {
        setPedidoAPagar(pedido);
    };

    // Eliminar pedido (solo admin)
    const ejecutarEliminacion = async () => {
        if (!confirmarEliminar) return;
        try {
            await api.delete(`/pedidos/${confirmarEliminar.id}`);
            toast.success(`Pedido ${confirmarEliminar.numero} eliminado`);
            setConfirmarEliminar(null);
            cargarPedidos();
        } catch (error) {
            console.error('Error eliminando pedido:', error);
            toast.error('Error al eliminar pedido');
        }
    };

    // Obtener usuario del store
    const usuario = useAuthStore(state => state.usuario);
    const esAdmin = usuario?.rol === 'admin';

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

                    {/* Estadísticas Premium */}
                    {estadisticas && (
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 grid grid-cols-6 gap-4">
                            {[
                                { key: 'total', label: 'Total', icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' },
                                { key: 'pendientes', label: 'Pendientes', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                                { key: 'pagados', label: 'Pagados', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-100' },
                                { key: 'enCamino', label: 'En Camino', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
                                { key: 'recibidos', label: 'Recibidos', icon: Store, color: 'text-green-600', bg: 'bg-green-100' },
                                { key: 'entregados', label: 'Entregados', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' }
                            ].map(({ key, label, icon: Icon, color, bg }) => (
                                <div
                                    key={key}
                                    className="bg-white rounded-xl border border-gray-200/60 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 group cursor-default"
                                    title={label}
                                >
                                    <div className={`p-2 rounded-lg ${bg} group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className={`h-5 w-5 ${color}`} />
                                    </div>
                                    <span className="text-xl font-bold text-gray-700">{estadisticas[key] || 0}</span>
                                </div>
                            ))}
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
                                    const esDigital = pedido.tipoPedido === 'digital';

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
                                                        <div className="flex items-center flex-wrap gap-1.5">
                                                            <span className="font-bold text-gray-800">{pedido.numero}</span>
                                                            {/* Badge tipo compacto */}
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${esDigital ? 'bg-cyan-100 text-cyan-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {esDigital ? <Monitor className="h-2.5 w-2.5 mr-0.5" /> : <Truck className="h-2.5 w-2.5 mr-0.5" />}
                                                                {esDigital ? 'DIG' : 'FÍS'}
                                                            </span>
                                                            {!pedido.pagado && pedido.tipoPago !== 'diferido' && pedido.tipoPago !== 'anticipo' && (
                                                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded font-medium">Sin pagar</span>
                                                            )}
                                                            {pedido.tipoPago === 'anticipo' && (
                                                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded font-medium">Anticipo</span>
                                                            )}
                                                            {pedido.tipoPago === 'diferido' && (
                                                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded font-medium">Al recibir</span>
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

                                                {/* Breadcrumb de progreso - CENTRO */}
                                                {pedido.estado !== 'CANCELADO' && (() => {
                                                    const estadosFlujo = esDigital ? ESTADOS_DIGITAL : ESTADOS_FISICO;
                                                    const indiceActual = estadosFlujo.indexOf(pedido.estado);
                                                    return (
                                                        <div className="flex-1 flex items-center justify-center px-4">
                                                            <div className="flex items-center space-x-1">
                                                                {estadosFlujo.map((estado, idx) => {
                                                                    const esActual = estado === pedido.estado;
                                                                    const esPasado = idx < indiceActual;
                                                                    const configEst = ESTADOS_CONFIG[estado];
                                                                    const IconoEst = configEst?.icon || Clock;
                                                                    return (
                                                                        <React.Fragment key={estado}>
                                                                            <div
                                                                                className={`flex items-center justify-center rounded-full transition-all ${esActual ? 'w-7 h-7 bg-blue-500 text-white shadow-md' : esPasado ? 'w-6 h-6 bg-green-500 text-white' : 'w-5 h-5 bg-gray-200 text-gray-400'}`}
                                                                                title={configEst?.label}
                                                                            >
                                                                                {esActual ? <IconoEst className="h-3.5 w-3.5" /> : esPasado ? <CheckCircle className="h-3 w-3" /> : <span className="text-[9px]">{idx + 1}</span>}
                                                                            </div>
                                                                            {idx < estadosFlujo.length - 1 && <div className={`w-4 h-1 rounded ${idx < indiceActual ? 'bg-green-400' : 'bg-gray-200'}`} />}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Totales y acciones */}
                                                <div className="flex items-center space-x-6">
                                                    {/* Total y deuda */}
                                                    <div className="text-right">
                                                        <div className="font-bold text-lg text-green-600">
                                                            ${parseFloat(pedido.totalUsd).toFixed(2)}
                                                        </div>
                                                        {parseFloat(pedido.montoPendiente || 0) > 0 ? (
                                                            <div className="text-xs text-red-500 font-medium">Deuda: ${parseFloat(pedido.montoPendiente).toFixed(2)}</div>
                                                        ) : (
                                                            <div className="text-xs text-gray-400">{new Date(pedido.fecha).toLocaleDateString('es-VE')}</div>
                                                        )}
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

                                                        {/* Cambiar estado - Dropdown Premium */}
                                                        {pedido.estado !== 'ENTREGADO' && pedido.estado !== 'CANCELADO' && (() => {
                                                            const ordenEstados = esDigital ? ESTADOS_DIGITAL : ESTADOS_FISICO;
                                                            const indiceActual = ordenEstados.indexOf(pedido.estado);
                                                            const estadosDesdeActual = indiceActual >= 0
                                                                ? ordenEstados.slice(indiceActual)
                                                                : ordenEstados;
                                                            const estadosDisponibles = [...estadosDesdeActual, 'CANCELADO'];
                                                            const estaAbierto = dropdownAbierto === pedido.id;
                                                            const estadoActualConfig = ESTADOS_CONFIG[pedido.estado];
                                                            const IconoActual = estadoActualConfig?.icon || Clock;

                                                            return (
                                                                <div className="relative">
                                                                    {/* Botón trigger */}
                                                                    <button
                                                                        onClick={() => setDropdownAbierto(estaAbierto ? null : pedido.id)}
                                                                        className="flex items-center space-x-2 text-sm font-medium border-2 border-indigo-200 rounded-xl px-3 py-1.5 
                                                                            bg-gradient-to-r from-indigo-50 to-purple-50 
                                                                            hover:from-indigo-100 hover:to-purple-100
                                                                            focus:ring-2 focus:ring-indigo-400
                                                                            cursor-pointer transition-all shadow-sm"
                                                                    >
                                                                        <IconoActual className="h-4 w-4 text-indigo-600" />
                                                                        <span>{estadoActualConfig?.label}</span>
                                                                        <ChevronDown className={`h-4 w-4 text-indigo-400 transition-transform ${estaAbierto ? 'rotate-180' : ''}`} />
                                                                    </button>

                                                                    {/* Dropdown menu */}
                                                                    {estaAbierto && (
                                                                        <>
                                                                            {/* Overlay para cerrar */}
                                                                            <div
                                                                                className="fixed inset-0 z-10"
                                                                                onClick={() => setDropdownAbierto(null)}
                                                                            />
                                                                            {/* Menu */}
                                                                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                                                                                {estadosDisponibles.filter(k => k !== pedido.estado).map(key => {
                                                                                    const config = ESTADOS_CONFIG[key];
                                                                                    const IconoItem = config?.icon || Clock;
                                                                                    const esCancelado = key === 'CANCELADO';
                                                                                    return (
                                                                                        <button
                                                                                            key={key}
                                                                                            onClick={() => {
                                                                                                cambiarEstado(pedido.id, key);
                                                                                                setDropdownAbierto(null);
                                                                                            }}
                                                                                            className={`w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors ${esCancelado
                                                                                                ? 'text-red-600 hover:bg-red-50'
                                                                                                : 'text-gray-700 hover:bg-indigo-50'
                                                                                                }`}
                                                                                        >
                                                                                            <IconoItem className={`h-4 w-4 ${esCancelado ? 'text-red-500' : 'text-indigo-500'}`} />
                                                                                            <span>{config?.label || key}</span>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Eliminar - Solo Admin */}
                                                        {esAdmin && (
                                                            <button
                                                                onClick={() => setConfirmarEliminar(pedido)}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Eliminar pedido (Admin)"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview de items */}
                                            <div className="mt-2 pt-2 border-t border-gray-50">
                                                <div className="text-xs text-gray-500">
                                                    {(pedido.items || []).slice(0, 3).map((item, idx) => (
                                                        <span key={idx} className="mr-2">• {item.descripcion} x{item.cantidad}</span>
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
                    </div>

                    {/* Footer Paginación - Estilo Azul Centrado */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-t border-blue-500 px-4 py-2 grid grid-cols-3 items-center shrink-0 h-14 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
                        {/* Izquierda: Contador */}
                        <div className="text-left">
                            <span className="text-xs text-blue-100 font-medium opacity-90">
                                Total: {pedidos.length} registros
                            </span>
                        </div>

                        {/* Centro: Paginación */}
                        <div className="flex justify-center">
                            {!loading && pedidos.length > PEDIDOS_POR_PAGINA && (
                                <div className="flex items-center space-x-2 rounded-lg p-1">
                                    <button
                                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                        disabled={paginaActual === 1}
                                        className="p-1.5 rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        title="Anterior"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>

                                    <div className="flex items-center space-x-1 px-2 border-l border-r border-blue-400/30 mx-1">
                                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setPaginaActual(num)}
                                                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${paginaActual === num
                                                        ? 'bg-white text-blue-700 shadow-md transform scale-105'
                                                        : 'text-blue-100 hover:bg-white/10'
                                                    }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaActual === totalPaginas}
                                        className="p-1.5 rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        title="Siguiente"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Derecha: Espacio vacío para balancear */}
                        <div></div>
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

            {/* Modal confirmación eliminar */}
            {confirmarEliminar && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header rojo */}
                        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <Trash2 className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Eliminar Pedido</h3>
                                    <p className="text-red-100 text-sm">Acción permanente</p>
                                </div>
                            </div>
                        </div>

                        {/* Contenido */}
                        <div className="p-6">
                            <div className="text-center mb-4">
                                <p className="text-gray-600">
                                    ¿Estás seguro de eliminar el pedido?
                                </p>
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <span className="font-bold text-lg text-gray-800">{confirmarEliminar.numero}</span>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {confirmarEliminar.clienteNombre} • ${parseFloat(confirmarEliminar.totalUsd).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-red-700">
                                    ⚠️ Esta acción no se puede deshacer. El pedido será eliminado permanentemente sin notificar al cliente.
                                </p>
                            </div>

                            {/* Botones */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setConfirmarEliminar(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={ejecutarEliminacion}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center justify-center space-x-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pago */}
            <PagarPedidoModal
                isOpen={!!pedidoAPagar}
                pedido={pedidoAPagar}
                onClose={() => setPedidoAPagar(null)}
                onSuccess={() => {
                    cargarPedidos();
                    setPedidoAPagar(null);
                }}
            />
        </>
    );
};

export default PedidosModal;
