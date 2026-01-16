// components/NuevoPedidoModal.jsx - Modal para crear nuevo pedido
import React, { useState, useEffect } from 'react';
import {
    X, Package, User, ShoppingCart, DollarSign,
    CreditCard, Save, CheckCircle, ChevronLeft, ChevronRight,
    FileText, Send, ChevronDown, Building, AlertTriangle
} from 'lucide-react';
import { api } from '../config/api';
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import toast from '../utils/toast.jsx';

// Reutilizar componentes de presupuesto
import ClienteSelector from './presupuesto/ClienteSelector';
import ItemsTablePedido from './ItemsTablePedido';

// Tabs del wizard
const TABS = [
    { id: 'cliente', label: 'Cliente', icon: User, step: 1 },
    { id: 'items', label: 'Items', icon: ShoppingCart, step: 2 },
    { id: 'resumen', label: 'Resumen', icon: FileText, step: 3 },
    { id: 'pago', label: 'Pago', icon: CreditCard, step: 4 }
];

// Breadcrumb moderno
const BreadcrumbModerno = ({ tabs, activeTab, onTabChange, validaciones }) => {
    return (
        <div className="flex items-center justify-center space-x-2 py-3 bg-blue-50/50 border-b border-blue-100">
            {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isPast = tabs.findIndex(t => t.id === activeTab) > index;
                const isValid = validaciones[tab.id];

                return (
                    <React.Fragment key={tab.id}>
                        <button
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${isActive
                                ? 'bg-blue-600 text-white shadow-lg'
                                : isPast && isValid
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${isActive ? 'bg-white/20' : isPast && isValid ? 'bg-green-500 text-white' : 'bg-gray-300'
                                }`}>
                                {isPast && isValid ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <span className="text-xs font-bold">{tab.step}</span>
                                )}
                            </div>
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{tab.label}</span>
                        </button>
                        {index < tabs.length - 1 && (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const NuevoPedidoModal = ({ isOpen, onClose, onSuccess }) => {
    const { tasaCambio, cajaActual } = useCajaStore();
    const { usuario } = useAuthStore();

    // Estados
    const [activeTab, setActiveTab] = useState('cliente');
    const [loading, setLoading] = useState(false);

    // Datos del pedido
    const [cliente, setCliente] = useState(null);
    const [items, setItems] = useState([]);
    const [descuento, setDescuento] = useState(0);
    const [observaciones, setObservaciones] = useState('');
    const [pagarAhora, setPagarAhora] = useState(true);

    // Datos de pago (si paga ahora)
    const [metodoPago, setMetodoPago] = useState('efectivo_usd');
    const [referencia, setReferencia] = useState('');

    // Cálculos
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalUsd = subtotal - descuento;
    const totalBs = totalUsd * (tasaCambio || 1);

    // Validaciones
    const validaciones = {
        cliente: !!cliente?.nombre,
        items: items.length > 0,
        resumen: items.length > 0,
        pago: pagarAhora ? !!metodoPago : true
    };

    // Navegación con validación de caja
    const handleTabChange = (tabId) => {
        // Si va a pago y paga ahora, verificar caja
        if (tabId === 'pago' && pagarAhora && !cajaActual) {
            toast.error('Debes tener una caja abierta para procesar pagos');
            return;
        }
        setActiveTab(tabId);
    };

    const handleNavigate = (direction) => {
        const currentIndex = TABS.findIndex(t => t.id === activeTab);
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        // Validar caja si está en cliente, paga ahora y va al siguiente
        if (activeTab === 'cliente' && direction === 'next' && pagarAhora && !cajaActual) {
            toast.error('Debes abrir una caja primero para procesar pagos');
            return;
        }

        // Si no paga ahora, saltar el paso de pago
        if (!pagarAhora && TABS[newIndex]?.id === 'pago') {
            newIndex = direction === 'next' ? newIndex + 1 : newIndex - 1;
        }

        // Validar caja si va a pago
        if (pagarAhora && TABS[newIndex]?.id === 'pago' && !cajaActual) {
            toast.error('Debes abrir una caja primero para procesar pagos');
            return;
        }

        if (newIndex >= 0 && newIndex < TABS.length) {
            setActiveTab(TABS[newIndex].id);
        }
    };

    // Handlers
    const handleClienteSeleccionado = (clienteData) => {
        setCliente(clienteData);
    };

    const handleItemsChange = (newItems) => {
        setItems(newItems);
    };

    // Crear pedido
    const handleCrearPedido = async () => {
        if (!cliente?.nombre) {
            toast.error('Selecciona un cliente');
            setActiveTab('cliente');
            return;
        }

        if (items.length === 0) {
            toast.error('Agrega al menos un item');
            setActiveTab('items');
            return;
        }

        // Validar caja si paga ahora
        if (pagarAhora && !cajaActual) {
            toast.error('Debes tener una caja abierta para procesar pagos');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                cliente: {
                    id: cliente.id || null,
                    nombre: cliente.nombre,
                    telefono: cliente.telefono || null,
                    email: cliente.email || null,
                    cedula_rif: cliente.cedula_rif || cliente.cedulaRif || null
                },
                items: items.map(item => ({
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precioUnitario: item.precioUnitario,
                    precioCosto: item.precioCosto || 0,
                    subtotal: item.subtotal,
                    notaInterna: item.notaInterna || null
                })),
                subtotal,
                descuento,
                totalUsd,
                totalBs,
                tasaCambio: tasaCambio || 1,
                observaciones,
                pagarAhora,
                pagos: pagarAhora ? (() => {
                    // Determinar si es pago en Bs o USD según el método
                    const esMetodoBs = metodoPago === 'pago_movil' || metodoPago === 'efectivo_bs';
                    return [{
                        metodo: metodoPago,
                        monto: esMetodoBs ? totalBs : totalUsd,
                        moneda: esMetodoBs ? 'bs' : 'usd',
                        referencia: referencia || null
                    }];
                })() : []
            };

            const response = await api.post('/pedidos', payload);

            if (response.data.success) {
                toast.success(`Pedido ${response.data.data.pedido.numero} creado exitosamente`);
                onSuccess?.();
            }

        } catch (error) {
            console.error('Error creando pedido:', error);
            toast.error(error.response?.data?.message || 'Error al crear pedido');
        } finally {
            setLoading(false);
        }
    };

    // Limpiar al cerrar
    const handleClose = () => {
        setCliente(null);
        setItems([]);
        setDescuento(0);
        setObservaciones('');
        setPagarAhora(true);
        setMetodoPago('efectivo_usd');
        setReferencia('');
        setActiveTab('cliente');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] h-[95vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Package className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Nuevo Pedido</h2>
                            <p className="text-blue-100 text-sm">Solicitud de producto</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Breadcrumb */}
                <BreadcrumbModerno
                    tabs={TABS}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    validaciones={validaciones}
                />

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Tab Cliente */}
                    {activeTab === 'cliente' && (
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Datos del Cliente</h3>

                            {/* Cliente seleccionado */}
                            {cliente && (
                                <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-green-500 text-white p-2 rounded-full">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-green-800">{cliente.nombre}</div>
                                                <div className="text-sm text-green-600 space-x-2">
                                                    {cliente.cedula_rif && <span>{cliente.cedula_rif}</span>}
                                                    {cliente.telefono && <span>• {cliente.telefono}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setCliente(null)}
                                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Selector (solo si no hay cliente) */}
                            {!cliente && (
                                <ClienteSelector
                                    onClienteSeleccionado={handleClienteSeleccionado}
                                    clienteActual={cliente}
                                    showCrearCliente={true}
                                />
                            )}

                            {/* Toggle pagar ahora - EN EL PRIMER PASO */}
                            {cliente && (
                                <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-800">¿El cliente paga ahora?</div>
                                            <div className="text-sm text-gray-500">
                                                {pagarAhora
                                                    ? 'Se registrará el pago en caja al crear'
                                                    : 'Pendiente - Pagará cuando reciba el producto'}
                                            </div>
                                            {pagarAhora && !cajaActual && (
                                                <div className="flex items-center space-x-1 text-xs text-red-500 mt-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    <span>Necesitas abrir caja para procesar pagos</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setPagarAhora(!pagarAhora)}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${pagarAhora ? 'bg-green-500' : 'bg-gray-300'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${pagarAhora ? 'translate-x-7' : 'translate-x-1'
                                                }`} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Items */}
                    {activeTab === 'items' && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Items del Pedido</h3>
                            <ItemsTablePedido
                                items={items}
                                onItemsChange={handleItemsChange}
                                tasaCambio={tasaCambio || 1}
                                showNotasInternas={true}
                            />
                        </div>
                    )}

                    {/* Tab Resumen */}
                    {activeTab === 'resumen' && (
                        <div className="max-w-3xl mx-auto">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Resumen del Pedido</h3>

                            {/* Cliente - Centrado horizontalmente */}
                            <div className="bg-gray-50 rounded-lg px-4 py-2 mb-4 flex items-center justify-center">
                                <div className="flex items-center space-x-3 text-sm">
                                    <User className="h-4 w-4 text-blue-500" />
                                    <span className="font-semibold text-gray-800">{cliente?.nombre || 'No seleccionado'}</span>
                                    {cliente?.cedula_rif && (
                                        <span className="text-gray-500">• {cliente.cedula_rif}</span>
                                    )}
                                    {cliente?.telefono && (
                                        <span className="text-gray-500">• {cliente.telefono}</span>
                                    )}
                                    {cliente?.email && (
                                        <span className="text-gray-500">• {cliente.email}</span>
                                    )}
                                </div>
                            </div>

                            {/* Items - Estilo factura */}
                            <div className="border rounded-lg overflow-hidden mb-4">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-16">Cant.</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase w-24">P.Unit</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase w-28">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-center font-medium">{item.cantidad}</td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-gray-800">{item.descripcion}</div>
                                                    {item.notaInterna && (
                                                        <div className="flex items-center space-x-1 text-xs text-purple-600">
                                                            {item.notaInterna.proveedor && (
                                                                <><Building className="h-3 w-3" /><span>{item.notaInterna.proveedor}</span></>
                                                            )}
                                                            {item.notaInterna.codigoProducto && <span>• {item.notaInterna.codigoProducto}</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-600">
                                                    ${item.precioUnitario?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-green-600">
                                                    ${item.subtotal?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totales - Más grandes y formato VE */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium text-lg">${subtotal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {descuento > 0 && (
                                    <div className="flex justify-between items-center mb-2 text-red-600">
                                        <span>Descuento</span>
                                        <span className="font-medium">-${descuento.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="border-t border-blue-200 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-xl text-gray-800">Total USD</span>
                                        <span className="font-bold text-3xl text-green-600">${totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-gray-500">Total Bolívares</span>
                                        <span className="text-xl text-gray-600 font-medium">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Observaciones - Desplegable */}
                            <details className="mt-4 group">
                                <summary className="flex items-center justify-between cursor-pointer bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2 transition-colors">
                                    <span className="text-sm font-medium text-gray-700">Observaciones (opcional)</span>
                                    <ChevronDown className="h-4 w-4 text-gray-500 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="mt-2">
                                    <textarea
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        placeholder="Notas adicionales para el pedido..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        rows={2}
                                    />
                                </div>
                            </details>
                        </div>
                    )}

                    {/* Tab Pago - Solo se muestra si paga ahora */}
                    {activeTab === 'pago' && (
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Método de Pago</h3>

                            {/* Métodos de pago */}
                            {pagarAhora && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Método de Pago
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { value: 'efectivo_usd', label: 'Efectivo USD', icon: DollarSign },
                                                { value: 'efectivo_bs', label: 'Efectivo Bs', icon: DollarSign },
                                                { value: 'pago_movil', label: 'Pago Móvil', icon: CreditCard },
                                                { value: 'zelle', label: 'Zelle', icon: CreditCard },
                                                { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                                                { value: 'binance', label: 'Binance', icon: CreditCard }
                                            ].map(metodo => (
                                                <button
                                                    key={metodo.value}
                                                    onClick={() => setMetodoPago(metodo.value)}
                                                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${metodoPago === metodo.value
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <metodo.icon className="h-5 w-5" />
                                                    <span>{metodo.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Referencia */}
                                    {!metodoPago.includes('efectivo') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Referencia (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={referencia}
                                                onChange={(e) => setReferencia(e.target.value)}
                                                placeholder="Número de referencia..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}

                                    {/* Total a pagar */}
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                        <div className="text-center">
                                            <div className="text-sm text-gray-600 mb-1">Total a Pagar</div>
                                            <div className="text-3xl font-bold text-green-600">${totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                            <div className="text-lg text-gray-500">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50/50 border-t border-blue-100 flex items-center justify-between">
                    <button
                        onClick={() => handleNavigate('prev')}
                        disabled={activeTab === 'cliente'}
                        className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        <span>Anterior</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Cancelar
                        </button>

                        {activeTab !== 'pago' ? (
                            <button
                                onClick={() => handleNavigate('next')}
                                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <span>Siguiente</span>
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleCrearPedido}
                                disabled={loading}
                                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-5 w-5" />
                                        <span>{pagarAhora ? 'Crear y Facturar' : 'Crear Pedido'}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NuevoPedidoModal;
