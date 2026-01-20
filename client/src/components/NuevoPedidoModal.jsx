// components/NuevoPedidoModal.jsx - Modal para crear nuevo pedido
import React, { useState, useEffect, useRef } from 'react';
import {
    X, Package, User, ShoppingCart, DollarSign,
    CreditCard, Save, CheckCircle, ChevronLeft, ChevronRight,
    FileText, Send, ChevronDown, Building, AlertTriangle,
    Banknote, Wallet, Truck, Monitor, PackageCheck
} from 'lucide-react';
import { api } from '../config/api';
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import toast from '../utils/toast.jsx';
import PedidoProcesandoModal from './PedidoProcesandoModal';

// Reutilizar componentes de presupuesto
import ClienteSelector from './presupuesto/ClienteSelector';
import ItemsTablePedido from './ItemsTablePedido';
import { generarReciboPedidoHTML, generarMensajeWhatsAppPedido } from '../utils/printUtils';

// Tabs del wizard - Items primero para cotizar rápido sin cliente
const TABS = [
    { id: 'items', label: 'Items', icon: ShoppingCart, step: 1 },
    { id: 'cliente', label: 'Cliente', icon: User, step: 2 },
    { id: 'resumen', label: 'Resumen', icon: FileText, step: 3 },
    { id: 'pago', label: 'Pago', icon: CreditCard, step: 4 }
];

// Breadcrumb moderno - Tamaño aumentado
const BreadcrumbModerno = ({ tabs, activeTab, onTabChange, validaciones }) => {
    return (
        <div className="flex items-center justify-center space-x-3 py-4 bg-blue-50/50 border-b border-blue-100">
            {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isPast = tabs.findIndex(t => t.id === activeTab) > index;
                const isValid = validaciones[tab.id];

                return (
                    <React.Fragment key={tab.id}>
                        <button
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center space-x-3 px-5 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-blue-600 text-white shadow-lg scale-105'
                                : isPast && isValid
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isActive ? 'bg-white/20' : isPast && isValid ? 'bg-green-500 text-white' : 'bg-gray-300'
                                }`}>
                                {isPast && isValid ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    <span className="text-sm font-bold">{tab.step}</span>
                                )}
                            </div>
                            <Icon className="h-5 w-5" />
                            <span className="text-base font-semibold">{tab.label}</span>
                        </button>
                        {index < tabs.length - 1 && (
                            <ChevronRight className="h-6 w-6 text-gray-400" />
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
    const [activeTab, setActiveTab] = useState('items');
    const [loading, setLoading] = useState(false);

    // Modal de procesamiento
    const [showProcesando, setShowProcesando] = useState(false);
    const procesandoRef = useRef(null);

    // Datos del pedido
    const [cliente, setCliente] = useState(null);
    const [items, setItems] = useState([]);
    const [descuento, setDescuento] = useState(0);
    const [observaciones, setObservaciones] = useState('');

    // Tipo de pago: 'total' | 'anticipo' | 'diferido' (pagar al recibir)
    const [tipoPago, setTipoPago] = useState('diferido');
    const [anticipoPorcentaje, setAnticipoPorcentaje] = useState(60); // 50%, 60%, 70%
    const [anticipoMonto, setAnticipoMonto] = useState(0);

    // Datos de pago (si paga ahora o anticipo)
    const [metodoPago, setMetodoPago] = useState('efectivo_usd');
    const [referencia, setReferencia] = useState('');

    // Pago mixto - múltiples métodos
    const [pagoMixto, setPagoMixto] = useState(false);
    const [pagos, setPagos] = useState([]);

    // Compatibilidad con lógica existente
    const pagarAhora = tipoPago === 'total' || tipoPago === 'anticipo';

    // Cálculos
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalUsd = subtotal - descuento;
    const totalBs = totalUsd * (tasaCambio || 1);
    const minAnticipo = totalUsd * 0.6; // Mínimo 60%

    // Calcular monto a pagar según tipo
    const montoAnticipo = tipoPago === 'anticipo' ? anticipoMonto : 0;
    const montoPagarAhora = tipoPago === 'total' ? totalUsd : montoAnticipo;
    const montoPendiente = totalUsd - montoPagarAhora;

    // Para pago mixto: calcular total pagado y faltante
    const totalPagadoMixto = pagos.reduce((sum, p) => {
        // Convertir Bs a USD para sumar correctamente
        if (p.moneda === 'bs') {
            return sum + (p.monto / (tasaCambio || 1));
        }
        return sum + p.monto;
    }, 0);
    const faltanteUsd = montoPagarAhora - totalPagadoMixto;
    const faltanteBs = faltanteUsd * (tasaCambio || 1);

    // Verificar si método seleccionado es en Bs
    const esMetodoBs = metodoPago === 'pago_movil' || metodoPago === 'efectivo_bs';

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

    // Delay helper
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Crear pedido con pantalla de procesamiento
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

        // Validar anticipo mínimo 60%
        if (tipoPago === 'anticipo' && anticipoMonto < minAnticipo) {
            toast.error(`El anticipo debe ser mínimo 60% del pedido ($${minAnticipo.toFixed(2)})`);
            return;
        }

        // Validar pago mixto cubra el monto
        if (pagoMixto && totalPagadoMixto < montoPagarAhora) {
            toast.error(`Los pagos no cubren el monto. Faltan $${faltanteUsd.toFixed(2)}`);
            return;
        }

        try {
            setLoading(true);
            setShowProcesando(true);

            // Esperar al modal
            await delay(300);

            // Paso 1: Validando
            procesandoRef.current?.avanzarPaso('validando');
            await delay(800);

            // Paso 2: Creando pedido
            procesandoRef.current?.avanzarPaso('creando');

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
                    tipoProducto: item.tipoProducto || 'fisico',
                    notaInterna: item.notaInterna || null
                })),
                // Tipo general del pedido (digital o físico)
                tipoPedido: items.length > 0 ? (items[0].tipoProducto || 'fisico') : 'fisico',
                subtotal,
                descuento,
                totalUsd,
                totalBs,
                tasaCambio: tasaCambio || 1,
                observaciones,
                // Información de pago mejorada
                tipoPago, // 'total', 'anticipo', 'diferido'
                pagarAhora,
                montoAnticipo: tipoPago === 'anticipo' ? montoPagarAhora : 0,
                montoPendiente: tipoPago === 'diferido' ? totalUsd : montoPendiente,
                pagos: pagarAhora ? (() => {
                    // Si es pago mixto, usar el array de pagos directamente
                    if (pagoMixto && pagos.length > 0) {
                        return pagos.map(p => ({
                            metodo: p.metodo,
                            monto: p.monto,
                            moneda: p.moneda,
                            referencia: p.referencia || null,
                            tipo: tipoPago === 'anticipo' ? 'anticipo' : 'pago_total'
                        }));
                    }
                    // Pago simple
                    const esMetodoBs = metodoPago === 'pago_movil' || metodoPago === 'efectivo_bs';
                    const montoAPagar = tipoPago === 'total' ? totalUsd : montoPagarAhora;
                    const montoBs = montoAPagar * (tasaCambio || 1);
                    return [{
                        metodo: metodoPago,
                        monto: esMetodoBs ? montoBs : montoAPagar,
                        moneda: esMetodoBs ? 'bs' : 'usd',
                        referencia: referencia || null,
                        tipo: tipoPago === 'anticipo' ? 'anticipo' : 'pago_total'
                    }];
                })() : []
            };

            const response = await api.post('/pedidos', payload);
            await delay(500);

            // Paso 3: Registrando pago (si aplica)
            if (pagarAhora) {
                procesandoRef.current?.avanzarPaso('registrando');
                await delay(600);
            } else {
                procesandoRef.current?.avanzarPaso('registrando');
                await delay(300);
            }

            const pedidoCreado = response.data?.data?.pedido || {};

            // Paso 4: Imprimiendo comprobante
            procesandoRef.current?.avanzarPaso('comprobante');

            if (pagarAhora) {
                try {
                    // Preparar objeto para impresión
                    const datosImpresion = {
                        ...pedidoCreado,
                        // Datos robustos
                        fecha: pedidoCreado.fecha || new Date(),
                        usuario: pedidoCreado.usuario || usuario || { nombre: 'Sistema' },
                        cliente: cliente,
                        items: items,
                        pagos: payload.pagos || [],
                        montoAnticipo: tipoPago === 'anticipo' ? montoPagarAhora : 0,
                        montoPendiente: tipoPago === 'anticipo' ? montoPendiente : (tipoPago === 'total' ? 0 : totalUsd)
                    };

                    const htmlRecibo = generarReciboPedidoHTML(datosImpresion, tasaCambio);

                    // Abrir ventana de impresión
                    const printWindow = window.open('', '_blank', 'width=350,height=600');
                    if (printWindow) {
                        printWindow.document.write(htmlRecibo);
                        printWindow.document.close();
                    } else {
                        toast.error('Habilita los pop-ups para imprimir', { duration: 4000 });
                    }
                } catch (printError) {
                    console.error('Error impresión:', printError);
                }
            } else {
                await delay(500);
            }

            await delay(800);

            // Paso 5: WhatsApp
            procesandoRef.current?.avanzarPaso('whatsapp');

            if (cliente.telefono) {
                try {
                    const datosWhatsApp = {
                        ...pedidoCreado,
                        cliente: cliente,
                        items: items,
                        observaciones: observaciones,
                        totalUsd: totalUsd,
                        montoAnticipo: tipoPago === 'anticipo' ? montoPagarAhora : 0,
                        montoPendiente: tipoPago === 'anticipo' ? montoPendiente : (tipoPago === 'total' ? 0 : totalUsd),
                        pagado: tipoPago === 'total' || (tipoPago === 'anticipo' && montoPagarAhora >= totalUsd),
                        pagos: payload.pagos || []
                    };

                    const mensaje = generarMensajeWhatsAppPedido(datosWhatsApp);
                    const telefono = cliente.telefono.replace(/\D/g, '');
                    const urlWhatsApp = `https://wa.me/${telefono}?text=${mensaje}`;

                    window.open(urlWhatsApp, '_blank');
                } catch (waError) {
                    console.error('Error WhatsApp:', waError);
                }
            }

            await delay(600);

            // Paso 6: Finalizando
            procesandoRef.current?.avanzarPaso('finalizando');
            await delay(500);

            // Completar
            procesandoRef.current?.completar();
            await delay(1500);

            if (response.data.success) {
                toast.success(`Pedido ${response.data.data.pedido.numero} creado exitosamente`);

                // Actualizar caja para reflejar la nueva transacción
                const { cargarCajaActual } = useCajaStore.getState();
                await cargarCajaActual(true); // force refresh

                onSuccess?.();
            }

        } catch (error) {
            console.error('Error creando pedido:', error);
            setShowProcesando(false);
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
        setTipoPago('diferido');
        setAnticipoPorcentaje(50);
        setAnticipoMonto(0);
        setMetodoPago('efectivo_usd');
        setReferencia('');
        setPagoMixto(false);
        setPagos([]);
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

                            {/* Selector de Tipo de Pago - Premium, solo 3 opciones */}
                            {cliente && (
                                <div className="mt-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <CreditCard className="h-5 w-5 text-blue-600" />
                                        <span className="text-sm font-semibold text-gray-700">¿Cuándo paga el cliente?</span>
                                    </div>

                                    {/* Botones de tipo de pago - Premium */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setTipoPago('total')}
                                            className={`flex flex-col items-center px-4 py-4 rounded-xl transition-all ${tipoPago === 'total'
                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg scale-105'
                                                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50'
                                                }`}
                                        >
                                            <Banknote className="h-6 w-6 mb-1" />
                                            <span className="text-sm font-bold">Pago Total</span>
                                            <span className={`text-[10px] mt-1 ${tipoPago === 'total' ? 'text-green-100' : 'text-gray-400'}`}>Paga todo ahora</span>
                                        </button>
                                        <button
                                            onClick={() => setTipoPago('anticipo')}
                                            className={`flex flex-col items-center px-4 py-4 rounded-xl transition-all ${tipoPago === 'anticipo'
                                                ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg scale-105'
                                                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                                                }`}
                                        >
                                            <Wallet className="h-6 w-6 mb-1" />
                                            <span className="text-sm font-bold">Anticipo</span>
                                            <span className={`text-[10px] mt-1 ${tipoPago === 'anticipo' ? 'text-orange-100' : 'text-gray-400'}`}>Mínimo 60%</span>
                                        </button>
                                        <button
                                            onClick={() => setTipoPago('diferido')}
                                            className={`flex flex-col items-center px-4 py-4 rounded-xl transition-all ${tipoPago === 'diferido'
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                        >
                                            <PackageCheck className="h-6 w-6 mb-1" />
                                            <span className="text-sm font-bold">Al Recibir</span>
                                            <span className={`text-[10px] mt-1 ${tipoPago === 'diferido' ? 'text-blue-100' : 'text-gray-400'}`}>Paga al entregar</span>
                                        </button>
                                    </div>

                                    {/* Advertencia si necesita caja */}
                                    {pagarAhora && !cajaActual && (
                                        <div className="flex items-center space-x-2 text-xs text-red-600 mt-4 bg-red-50 p-3 rounded-lg border border-red-200">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span>Necesitas abrir caja para procesar pagos</span>
                                        </div>
                                    )}
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
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800">Resumen del Pedido</h3>
                                {/* Badge de tipo de pedido */}
                                {items.length > 0 && (
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${items[0].tipoProducto === 'digital'
                                        ? 'bg-cyan-100 text-cyan-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {items[0].tipoProducto === 'digital' ? (
                                            <><Monitor className="h-4 w-4 mr-1.5" />Pedido Digital</>
                                        ) : (
                                            <><Truck className="h-4 w-4 mr-1.5" />Pedido Físico</>
                                        )}
                                    </span>
                                )}
                            </div>

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
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase w-20">Tipo</th>
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
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${item.tipoProducto === 'digital'
                                                        ? 'bg-cyan-100 text-cyan-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {item.tipoProducto === 'digital' ? (
                                                            <><Monitor className="h-3 w-3 mr-0.5" />Digital</>
                                                        ) : (
                                                            <><Truck className="h-3 w-3 mr-0.5" />Físico</>
                                                        )}
                                                    </span>
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

                            {/* Sección de Anticipo - Solo si es anticipo */}
                            {tipoPago === 'anticipo' && (
                                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200 mb-4">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <Wallet className="h-5 w-5 text-orange-600" />
                                        <span className="text-sm font-semibold text-orange-800">Calcular Anticipo</span>
                                    </div>

                                    {/* Botones de porcentaje */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {[60, 70, 80].map(pct => (
                                            <button
                                                key={pct}
                                                onClick={() => setAnticipoMonto(totalUsd * (pct / 100))}
                                                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${Math.abs(anticipoMonto - (totalUsd * pct / 100)) < 0.01
                                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                                                    : 'bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-100'
                                                    }`}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>

                                    {/* Monto fijo */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-gray-600 font-medium">Monto fijo:</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min={minAnticipo}
                                                max={totalUsd}
                                                value={anticipoMonto || ''}
                                                onChange={(e) => setAnticipoMonto(parseFloat(e.target.value) || 0)}
                                                placeholder={`Mín $${minAnticipo.toFixed(2)}`}
                                                className={`w-full pl-8 pr-3 py-2 text-sm border-2 rounded-lg focus:ring-2 ${anticipoMonto > 0 && anticipoMonto < minAnticipo
                                                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                                    : 'border-orange-200 focus:ring-orange-500'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Resumen de montos */}
                                    <div className="bg-white rounded-lg p-3 border border-orange-200 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Total del pedido:</span>
                                            <span className="font-bold text-gray-700">${totalUsd.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-orange-700 font-medium">Anticipo a cobrar:</span>
                                            <span className="font-bold text-orange-700 text-lg">${anticipoMonto.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-orange-100 pt-2">
                                            <span className="text-sm text-red-600">Deuda pendiente:</span>
                                            <span className="font-bold text-red-600">${montoPendiente.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Validaciones */}
                                    {anticipoMonto > 0 && anticipoMonto < minAnticipo && (
                                        <div className="flex items-center space-x-2 text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-200">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span>Mínimo requerido: ${minAnticipo.toFixed(2)} (60%)</span>
                                        </div>
                                    )}
                                    {anticipoMonto >= minAnticipo && (
                                        <div className="flex items-center space-x-2 text-xs text-green-600 mt-2 bg-green-50 p-2 rounded-lg border border-green-200">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Anticipo válido ({((anticipoMonto / totalUsd) * 100).toFixed(0)}% del total)</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Métodos de pago */}
                            {pagarAhora && (
                                <div className="space-y-4">
                                    {/* Toggle pago mixto */}
                                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                        <div>
                                            <div className="text-sm font-medium text-gray-700">¿Pago Mixto?</div>
                                            <div className="text-xs text-gray-500">Combina varios métodos de pago</div>
                                        </div>
                                        <button
                                            onClick={() => setPagoMixto(!pagoMixto)}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${pagoMixto ? 'bg-purple-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pagoMixto ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>

                                    {!pagoMixto ? (
                                        /* Pago simple - Un solo método */
                                        <>
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
                                        </>
                                    ) : (
                                        /* Pago mixto - Múltiples métodos */
                                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-sm font-medium text-purple-700">Pagos Múltiples</div>
                                                <div className="text-xs text-gray-500">
                                                    Pagado: ${totalPagadoMixto.toFixed(2)} / ${montoPagarAhora.toFixed(2)}
                                                </div>
                                            </div>

                                            {/* Lista de pagos agregados */}
                                            {pagos.length > 0 && (
                                                <div className="space-y-2 mb-3">
                                                    {pagos.map((pago, idx) => (
                                                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-200">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-sm font-medium">{pago.metodoLabel}</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pago.moneda === 'bs' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {pago.moneda === 'bs' ? 'Bs' : 'USD'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="font-bold text-green-600">
                                                                    {pago.moneda === 'bs' ? `Bs. ${pago.monto.toFixed(2)}` : `$${pago.monto.toFixed(2)}`}
                                                                </span>
                                                                {pago.moneda === 'bs' && (
                                                                    <span className="text-xs text-gray-400">≈ ${(pago.monto / (tasaCambio || 1)).toFixed(2)}</span>
                                                                )}
                                                                <button
                                                                    onClick={() => setPagos(pagos.filter((_, i) => i !== idx))}
                                                                    className="text-red-500 hover:bg-red-50 rounded p-1"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Monto faltante con conversión */}
                                            {faltanteUsd > 0.01 && (
                                                <div className="bg-white rounded-lg p-3 mb-3 border border-orange-200">
                                                    <div className="text-xs text-gray-500 mb-1">Faltante por pagar:</div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-lg text-orange-600">${faltanteUsd.toFixed(2)}</span>
                                                        <span className="text-sm text-gray-500">= Bs. {faltanteBs.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Agregar nuevo pago - Solo si falta monto */}
                                            {faltanteUsd > 0.01 && (
                                                <div className="space-y-2 mb-2">
                                                    <select
                                                        value={metodoPago}
                                                        onChange={(e) => setMetodoPago(e.target.value)}
                                                        className="w-full text-sm border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        <option value="efectivo_usd">[$] Efectivo USD</option>
                                                        <option value="efectivo_bs">[Bs] Efectivo Bs</option>
                                                        <option value="pago_movil">[PM] Pago Móvil (Bs)</option>
                                                        <option value="zelle">[Z] Zelle (USD)</option>
                                                        <option value="tarjeta">[T] Tarjeta</option>
                                                        <option value="binance">[B] Binance (USD)</option>
                                                    </select>

                                                    {/* Input con hint de conversión */}
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder={esMetodoBs ? `Monto en Bs (faltan Bs. ${faltanteBs.toFixed(2)})` : `Monto en USD (faltan $${faltanteUsd.toFixed(2)})`}
                                                            value={referencia}
                                                            onChange={(e) => setReferencia(e.target.value)}
                                                            className="w-full text-sm border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                                                        />
                                                        {esMetodoBs && referencia && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                                                ≈ ${(parseFloat(referencia) / (tasaCambio || 1)).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            const monto = parseFloat(referencia) || 0;
                                                            if (monto <= 0) {
                                                                toast.error('Ingresa un monto válido');
                                                                return;
                                                            }
                                                            const metodoLabels = {
                                                                efectivo_usd: 'Efectivo USD',
                                                                efectivo_bs: 'Efectivo Bs',
                                                                pago_movil: 'Pago Móvil',
                                                                zelle: 'Zelle',
                                                                tarjeta: 'Tarjeta',
                                                                binance: 'Binance'
                                                            };
                                                            const esBs = metodoPago === 'pago_movil' || metodoPago === 'efectivo_bs';
                                                            setPagos([...pagos, {
                                                                metodo: metodoPago,
                                                                metodoLabel: metodoLabels[metodoPago],
                                                                monto,
                                                                moneda: esBs ? 'bs' : 'usd'
                                                            }]);
                                                            setReferencia('');
                                                        }}
                                                        className="w-full text-sm bg-purple-600 text-white rounded-lg px-3 py-2 hover:bg-purple-700 font-medium"
                                                    >
                                                        + Agregar Pago
                                                    </button>
                                                </div>
                                            )}

                                            {/* Barra de progreso */}
                                            <div className="mt-3">
                                                <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${totalPagadoMixto >= montoPagarAhora
                                                            ? 'bg-green-500'
                                                            : 'bg-purple-500'
                                                            }`}
                                                        style={{ width: `${Math.min(100, (totalPagadoMixto / montoPagarAhora) * 100)}%` }}
                                                    />
                                                </div>
                                                {totalPagadoMixto >= montoPagarAhora && (
                                                    <div className="flex items-center justify-center space-x-1 text-xs text-green-600 mt-1 font-medium">
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                        <span>Monto completo cubierto</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Monto a pagar ahora */}
                                    <div className={`rounded-xl p-4 border ${tipoPago === 'anticipo' ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'}`}>
                                        <div className="text-center">
                                            <div className="text-sm text-gray-600 mb-1">
                                                {tipoPago === 'anticipo' ? 'Anticipo a Cobrar' : 'Total a Pagar'}
                                            </div>
                                            <div className={`text-3xl font-bold ${tipoPago === 'anticipo' ? 'text-orange-600' : 'text-green-600'}`}>
                                                ${montoPagarAhora.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-lg text-gray-500">
                                                Bs. {(montoPagarAhora * (tasaCambio || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </div>
                                            {tipoPago === 'anticipo' && (
                                                <div className="mt-2 text-sm text-orange-700 bg-orange-100 rounded-lg px-3 py-1 inline-block">
                                                    Pendiente: ${montoPendiente.toFixed(2)}
                                                </div>
                                            )}
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

                        {/* Mostrar botón Crear Pedido si:
                            1. Estamos en pago (siempre)
                            2. Estamos en resumen Y no va a pagar ahora */}
                        {(activeTab === 'pago' || (activeTab === 'resumen' && !pagarAhora)) ? (
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
                        ) : (
                            <button
                                onClick={() => handleNavigate('next')}
                                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <span>Siguiente</span>
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de procesamiento */}
            <PedidoProcesandoModal
                ref={procesandoRef}
                isOpen={showProcesando}
                titulo="Creando Pedido"
            />
        </div>
    );
};

export default NuevoPedidoModal;
