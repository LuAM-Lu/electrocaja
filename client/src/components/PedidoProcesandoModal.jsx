// components/PedidoProcesandoModal.jsx
// Pantalla de carga premium para procesamiento de pedidos
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Printer from 'lucide-react/dist/esm/icons/printer'
import Package from 'lucide-react/dist/esm/icons/package'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import { FaWhatsapp } from 'react-icons/fa';

const PedidoProcesandoModal = forwardRef(({
    isOpen,
    titulo = 'Procesando Pedido',
    onCompletado,
    onError
}, ref) => {
    const [pasos, setPasos] = useState([]);
    const [pasoActual, setPasoActual] = useState(0);
    const [procesando, setProcesando] = useState(true);
    const [error, setError] = useState(null);
    const [completado, setCompletado] = useState(false);

    // Exponer funciones para control externo
    useImperativeHandle(ref, () => ({
        // Iniciar con pasos personalizados
        iniciar: (pasosConfig) => {
            setPasos(pasosConfig.map(p => ({ ...p, completado: false, error: false })));
            setPasoActual(0);
            setProcesando(true);
            setError(null);
            setCompletado(false);
        },
        // Avanzar al siguiente paso
        avanzarPaso: (pasoId) => {
            setPasos(prev => {
                const nuevos = [...prev];
                const indice = nuevos.findIndex(p => p.id === pasoId);
                if (indice !== -1) {
                    nuevos[indice].completado = true;
                    nuevos[indice].error = false;
                    setPasoActual(indice + 1);
                }
                return nuevos;
            });
        },
        // Marcar error en un paso (pero continuar)
        marcarError: (pasoId, mensaje = null) => {
            setPasos(prev => {
                const nuevos = [...prev];
                const indice = nuevos.findIndex(p => p.id === pasoId);
                if (indice !== -1) {
                    nuevos[indice].error = true;
                    nuevos[indice].errorMensaje = mensaje;
                    nuevos[indice].completado = true; // Continuar igual
                    setPasoActual(indice + 1);
                }
                return nuevos;
            });
        },
        // Completar todo
        completar: () => {
            setProcesando(false);
            setCompletado(true);
            if (onCompletado) onCompletado();
        },
        // Error fatal
        errorFatal: (mensaje) => {
            setProcesando(false);
            setError(mensaje);
            if (onError) onError(mensaje);
        },
        // Resetear
        reset: () => {
            setPasos([]);
            setPasoActual(0);
            setProcesando(true);
            setError(null);
            setCompletado(false);
        }
    }), [onCompletado, onError]);

    // Pasos por defecto para crear pedido
    const pasosCrearPedido = [
        { id: 'validando', nombre: 'Validando datos del pedido', icon: CheckCircle },
        { id: 'creando', nombre: 'Creando pedido en sistema', icon: Package },
        { id: 'registrando', nombre: 'Registrando pago en caja', icon: CreditCard },
        { id: 'comprobante', nombre: 'Imprimiendo comprobante', icon: Printer },
        { id: 'whatsapp', nombre: 'Notificando por WhatsApp', icon: FaWhatsapp },
        { id: 'finalizando', nombre: 'Finalizando proceso', icon: CheckCircle }
    ];

    // Pasos por defecto para pagar pedido
    const pasosPagarPedido = [
        { id: 'validando', nombre: 'Validando pago', icon: CheckCircle },
        { id: 'procesando', nombre: 'Procesando transacción', icon: CreditCard },
        { id: 'actualizando', nombre: 'Actualizando pedido', icon: Package },
        { id: 'comprobante', nombre: 'Imprimiendo comprobante', icon: Printer },
        { id: 'whatsapp', nombre: 'Notificando por WhatsApp', icon: FaWhatsapp },
        { id: 'finalizando', nombre: 'Finalizando proceso', icon: CheckCircle }
    ];

    // Inicializar pasos por defecto
    useEffect(() => {
        if (isOpen && pasos.length === 0) {
            const pasosDefault = titulo.includes('Pago') ? pasosPagarPedido : pasosCrearPedido;
            setPasos(pasosDefault.map(p => ({ ...p, completado: false, error: false })));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const progreso = pasos.length > 0 ? Math.round((pasoActual / pasos.length) * 100) : 0;

    return (
        <div
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
            style={{ pointerEvents: 'auto' }}
            data-procesando-modal="true"
        >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-700 overflow-hidden">
                {/* Header */}
                <div className={`px-8 py-6 text-white ${error ? 'bg-gradient-to-r from-red-600 to-red-700' : completado ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                {error ? (
                                    <AlertTriangle className="h-7 w-7" />
                                ) : completado ? (
                                    <CheckCircle className="h-7 w-7" />
                                ) : (
                                    <Package className="h-7 w-7" />
                                )}
                                {error ? 'Error en Proceso' : completado ? '¡Proceso Completado!' : titulo}
                            </h2>
                            <p className="text-white/80 mt-1 text-sm">
                                {error ? 'Ha ocurrido un error' : completado ? 'Todos los pasos completados' : 'Por favor espera...'}
                            </p>
                        </div>
                        {procesando && !error && (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        )}
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-8">
                    {!completado && !error && (
                        <>
                            {/* Lista de pasos */}
                            <div className="space-y-3 mb-8">
                                {pasos.map((paso, index) => {
                                    const Icon = paso.icon;
                                    const estaCompletado = paso.completado;
                                    const tieneError = paso.error;
                                    const esActual = index === pasoActual && !estaCompletado;

                                    return (
                                        <div
                                            key={paso.id}
                                            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${tieneError
                                                ? 'bg-orange-500/20 border-2 border-orange-500/50'
                                                : estaCompletado
                                                    ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                                                    : esActual
                                                        ? 'bg-blue-500/20 border-2 border-blue-500/50 animate-pulse'
                                                        : 'bg-gray-800/50 border-2 border-gray-700/50'
                                                }`}
                                        >
                                            <div className={`flex-shrink-0 ${tieneError
                                                ? 'text-orange-400'
                                                : estaCompletado
                                                    ? 'text-emerald-400'
                                                    : esActual
                                                        ? 'text-blue-400'
                                                        : 'text-gray-500'
                                                }`}>
                                                {tieneError ? (
                                                    <AlertTriangle className="h-6 w-6" />
                                                ) : estaCompletado ? (
                                                    <CheckCircle className="h-6 w-6" />
                                                ) : esActual ? (
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                ) : (
                                                    <Icon className="h-6 w-6" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className={`font-semibold ${tieneError
                                                    ? 'text-orange-300'
                                                    : estaCompletado
                                                        ? 'text-emerald-300'
                                                        : esActual
                                                            ? 'text-blue-300'
                                                            : 'text-gray-400'
                                                    }`}>
                                                    {paso.nombre}
                                                </div>
                                                {tieneError && paso.errorMensaje && (
                                                    <div className="text-xs text-orange-400 mt-1">
                                                        {paso.errorMensaje}
                                                    </div>
                                                )}
                                                {esActual && (
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        En progreso...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Barra de progreso */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-400 mb-2">
                                    <span>Progreso</span>
                                    <span>{progreso}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${progreso}%` }}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {completado && !error && (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500/20 rounded-full mb-4">
                                <CheckCircle className="h-12 w-12 text-emerald-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">¡Completado!</h3>
                            <p className="text-gray-400">Todos los procesos finalizaron correctamente</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-500/20 rounded-full mb-4">
                                <AlertTriangle className="h-12 w-12 text-red-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Error</h3>
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

PedidoProcesandoModal.displayName = 'PedidoProcesandoModal';

export default PedidoProcesandoModal;
