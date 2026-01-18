// components/PagarPedidoModal.jsx - Modal para procesar pago de pedido existente
import React, { useState, useEffect, useRef } from 'react';
import {
    X, DollarSign, CreditCard, CheckCircle,
    Banknote, Wallet, Package, User, Phone, Mail,
    Monitor, Truck, Building, Smartphone
} from 'lucide-react';
import { api } from '../config/api';
import { useCajaStore } from '../store/cajaStore';
import toast from '../utils/toast.jsx';
import PedidoProcesandoModal from './PedidoProcesandoModal';

const PagarPedidoModal = ({ isOpen, pedido, onClose, onSuccess }) => {
    const { tasaCambio, cajaActual } = useCajaStore();

    // Estados de pago
    const [loading, setLoading] = useState(false);
    const [metodoPago, setMetodoPago] = useState('efectivo_usd');
    const [pagoMixto, setPagoMixto] = useState(false);
    const [pagos, setPagos] = useState([]);
    const [referencia, setReferencia] = useState('');

    // Modal de procesamiento
    const [showProcesando, setShowProcesando] = useState(false);
    const procesandoRef = useRef(null);

    // Calcular monto a pagar
    const montoPendiente = parseFloat(pedido?.montoPendiente || pedido?.totalUsd || 0);
    const totalUsd = parseFloat(pedido?.totalUsd || 0);
    const totalBs = totalUsd * (tasaCambio || 1);
    const montoPendienteBs = montoPendiente * (tasaCambio || 1);

    // Para pago mixto
    const totalPagadoMixto = pagos.reduce((sum, p) => {
        if (p.moneda === 'bs') {
            return sum + (p.monto / (tasaCambio || 1));
        }
        return sum + p.monto;
    }, 0);
    const faltanteUsd = montoPendiente - totalPagadoMixto;
    const faltanteBs = faltanteUsd * (tasaCambio || 1);
    const esMetodoBs = metodoPago === 'pago_movil' || metodoPago === 'efectivo_bs';

    // Reset al abrir
    useEffect(() => {
        if (isOpen && pedido) {
            setMetodoPago('efectivo_usd');
            setPagoMixto(false);
            setPagos([]);
            setReferencia('');
            setShowProcesando(false);
        }
    }, [isOpen, pedido]);

    // Delay helper
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Procesar pago con pantalla de carga
    const handlePagar = async () => {
        if (!cajaActual) {
            toast.error('Debes tener una caja abierta para procesar pagos');
            return;
        }

        // Validar pago mixto
        if (pagoMixto && totalPagadoMixto < montoPendiente) {
            toast.error(`Los pagos no cubren el monto. Faltan $${faltanteUsd.toFixed(2)}`);
            return;
        }

        try {
            setLoading(true);
            setShowProcesando(true);

            // Esperar a que el modal esté listo
            await delay(300);

            // Paso 1: Validando
            procesandoRef.current?.avanzarPaso('validando');
            await delay(800);

            // Paso 2: Procesando
            procesandoRef.current?.avanzarPaso('procesando');

            const payload = {
                metodoPago: pagoMixto ? 'mixto' : metodoPago,
                pagos: pagoMixto ? pagos : [{
                    metodo: metodoPago,
                    monto: esMetodoBs ? montoPendienteBs : montoPendiente,
                    moneda: esMetodoBs ? 'bs' : 'usd'
                }],
                referencia,
                cajaId: cajaActual.id
            };

            const response = await api.post(`/pedidos/${pedido.id}/pagar`, payload);
            await delay(500);

            // Paso 3: Actualizando
            procesandoRef.current?.avanzarPaso('actualizando');
            await delay(600);

            // Paso 4: Imprimiendo comprobante (placeholder para futuro)
            procesandoRef.current?.avanzarPaso('comprobante');
            await delay(400);

            // Paso 5: WhatsApp (con manejo de error)
            if (response.data?.data?.whatsappEnviado) {
                procesandoRef.current?.avanzarPaso('whatsapp');
            } else {
                procesandoRef.current?.marcarError('whatsapp', 'WhatsApp no disponible');
            }
            await delay(400);

            // Paso 6: Finalizando
            procesandoRef.current?.avanzarPaso('finalizando');
            await delay(500);

            // Completar
            procesandoRef.current?.completar();
            await delay(1500);

            toast.success('¡Pago registrado exitosamente!');

            // Actualizar caja para reflejar la nueva transacción
            const { cargarCajaActual } = useCajaStore.getState();
            await cargarCajaActual(true); // force refresh

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error al pagar:', error);
            setShowProcesando(false);
            toast.error(error.response?.data?.message || 'Error al procesar pago');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !pedido) return null;

    const esDigital = pedido.tipoPedido === 'digital';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Pagar Pedido {pedido.numero}</h2>
                            <p className="text-green-100 text-sm">{pedido.clienteNombre}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-5">

                    {/* Resumen del pedido */}
                    <div className="bg-gradient-to-r from-slate-50 to-green-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 text-sm">Pedido</span>
                            <span className="font-bold">{pedido.numero}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 text-sm">Total del pedido</span>
                            <span className="font-bold">${totalUsd.toFixed(2)}</span>
                        </div>
                        {pedido.montoAnticipo > 0 && (
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-600 text-sm">Anticipo pagado</span>
                                <span className="font-bold text-green-600">-${parseFloat(pedido.montoAnticipo).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t border-green-200 pt-2 mt-2">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">Monto a pagar</span>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-green-600">${montoPendiente.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">
                                        Bs. {montoPendienteBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tipo de pago */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                        <div className="flex space-x-2 mb-3">
                            <button
                                onClick={() => { setPagoMixto(false); setPagos([]); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!pagoMixto
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Un solo método
                            </button>
                            <button
                                onClick={() => setPagoMixto(true)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${pagoMixto
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Pago Mixto
                            </button>
                        </div>

                        {!pagoMixto ? (
                            /* Pago simple */
                            <div className="space-y-3">
                                <select
                                    value={metodoPago}
                                    onChange={(e) => setMetodoPago(e.target.value)}
                                    className="w-full text-sm border-2 border-green-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="efectivo_usd">Efectivo USD ($)</option>
                                    <option value="efectivo_bs">Efectivo Bs</option>
                                    <option value="pago_movil">Pago Móvil (Bs)</option>
                                    <option value="zelle">Zelle (USD)</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="binance">Binance (USD)</option>
                                </select>

                                {(metodoPago !== 'efectivo_usd' && metodoPago !== 'efectivo_bs') && (
                                    <input
                                        type="text"
                                        value={referencia}
                                        onChange={(e) => setReferencia(e.target.value)}
                                        placeholder="Número de referencia..."
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                                    />
                                )}

                                {esMetodoBs && (
                                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                                        <span className="text-sm text-gray-600">Monto en Bs: </span>
                                        <span className="font-bold text-blue-600">
                                            Bs. {montoPendienteBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Pago mixto */
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-3">
                                {/* Lista de pagos */}
                                {pagos.length > 0 && (
                                    <div className="space-y-2">
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

                                {/* Faltante */}
                                {faltanteUsd > 0.01 && (
                                    <div className="bg-white rounded-lg p-3 border border-orange-200">
                                        <div className="text-xs text-gray-500 mb-1">Faltante por pagar:</div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-lg text-orange-600">${faltanteUsd.toFixed(2)}</span>
                                            <span className="text-sm text-gray-500">= Bs. {faltanteBs.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Agregar pago */}
                                <div className="space-y-2">
                                    <select
                                        value={metodoPago}
                                        onChange={(e) => setMetodoPago(e.target.value)}
                                        className="w-full text-sm border border-purple-200 rounded-lg px-3 py-2"
                                    >
                                        <option value="efectivo_usd">Efectivo USD ($)</option>
                                        <option value="efectivo_bs">Efectivo Bs</option>
                                        <option value="pago_movil">Pago Móvil (Bs)</option>
                                        <option value="zelle">Zelle (USD)</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="binance">Binance (USD)</option>
                                    </select>

                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder={esMetodoBs ? `Monto en Bs (faltan Bs. ${faltanteBs.toFixed(2)})` : `Monto en USD (faltan $${faltanteUsd.toFixed(2)})`}
                                            value={referencia}
                                            onChange={(e) => setReferencia(e.target.value)}
                                            className="w-full text-sm border border-purple-200 rounded-lg px-3 py-2"
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

                                {/* Barra de progreso */}
                                <div className="mt-2">
                                    <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${totalPagadoMixto >= montoPendiente ? 'bg-green-500' : 'bg-purple-500'}`}
                                            style={{ width: `${Math.min(100, (totalPagadoMixto / montoPendiente) * 100)}%` }}
                                        />
                                    </div>
                                    {totalPagadoMixto >= montoPendiente && (
                                        <div className="flex items-center justify-center space-x-1 text-xs text-green-600 mt-1 font-medium">
                                            <CheckCircle className="h-3 w-3" />
                                            <span>Monto completo cubierto</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-green-50 border-t border-gray-200 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-all"
                    >
                        <X className="h-4 w-4" />
                        <span>Cancelar</span>
                    </button>

                    <button
                        onClick={handlePagar}
                        disabled={loading || (!pagoMixto && !metodoPago) || (pagoMixto && totalPagadoMixto < montoPendiente)}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        ) : (
                            <>
                                <CheckCircle className="h-5 w-5" />
                                <span>Confirmar Pago ${montoPendiente.toFixed(2)}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Modal de procesamiento */}
            <PedidoProcesandoModal
                ref={procesandoRef}
                isOpen={showProcesando}
                titulo="Procesando Pago"
            />
        </div>
    );
};

export default PagarPedidoModal;
