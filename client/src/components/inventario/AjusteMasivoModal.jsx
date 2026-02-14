// components/inventario/AjusteMasivoModal.jsx
import React, { useState, useMemo } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Percent from 'lucide-react/dist/esm/icons/percent'
import Calculator from 'lucide-react/dist/esm/icons/calculator'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Package from 'lucide-react/dist/esm/icons/package'
import Wrench from 'lucide-react/dist/esm/icons/wrench'
import Coffee from 'lucide-react/dist/esm/icons/coffee'
import { useInventarioStore } from '../../store/inventarioStore';
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';

const AjusteMasivoModal = ({ isOpen, onClose }) => {
    const { inventario, obtenerInventario } = useInventarioStore();

    const [tipoAjuste, setTipoAjuste] = useState('ganancia'); // 'ganancia' | 'precio' | 'porcentaje'
    const [valorAjuste, setValorAjuste] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [confirmar, setConfirmar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState([]);

    // Obtener categorías únicas
    const categorias = useMemo(() => {
        const cats = [...new Set(inventario.map(i => i.categoria).filter(Boolean))];
        return cats.sort();
    }, [inventario]);

    // Productos afectados
    const productosAfectados = useMemo(() => {
        return inventario.filter(item => {
            if (item.activo === false) return false;
            if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
            if (filtroCategoria && item.categoria !== filtroCategoria) return false;
            return true;
        });
    }, [inventario, filtroTipo, filtroCategoria]);

    // Calcular preview
    const calcularPreview = () => {
        if (!valorAjuste || isNaN(parseFloat(valorAjuste))) {
            toast.error('Ingresa un valor válido');
            return;
        }

        const valor = parseFloat(valorAjuste);

        const previewData = productosAfectados.slice(0, 10).map(item => {
            const precioCosto = parseFloat(item.precio_costo) || 0;
            const precioActual = parseFloat(item.precio) || 0;
            let precioNuevo = precioActual;
            let gananciaVieja = precioCosto > 0 ? ((precioActual - precioCosto) / precioCosto * 100) : 0;
            let gananciaNueva = gananciaVieja;

            switch (tipoAjuste) {
                case 'ganancia':
                    // Establecer % de ganancia fijo
                    if (precioCosto > 0) {
                        precioNuevo = precioCosto * (1 + valor / 100);
                        gananciaNueva = valor;
                    }
                    break;
                case 'porcentaje':
                    // Aumentar/disminuir precio en %
                    precioNuevo = precioActual * (1 + valor / 100);
                    gananciaNueva = precioCosto > 0 ? ((precioNuevo - precioCosto) / precioCosto * 100) : 0;
                    break;
                case 'precio':
                    // Aumentar/disminuir precio fijo
                    precioNuevo = precioActual + valor;
                    gananciaNueva = precioCosto > 0 ? ((precioNuevo - precioCosto) / precioCosto * 100) : 0;
                    break;
            }

            return {
                id: item.id,
                descripcion: item.descripcion,
                tipo: item.tipo,
                precioCosto,
                precioActual,
                precioNuevo: Math.max(0, precioNuevo),
                gananciaVieja,
                gananciaNueva: Math.max(-100, gananciaNueva),
                diferencia: precioNuevo - precioActual
            };
        });

        setPreview(previewData);
        toast.success('Vista previa generada');
    };

    // Aplicar ajuste masivo
    const aplicarAjuste = async () => {
        if (!confirmar) {
            toast.error('Debes confirmar la operación');
            return;
        }

        setLoading(true);
        try {
            const valor = parseFloat(valorAjuste);

            // Preparar datos para el backend
            const ajustes = productosAfectados.map(item => {
                const precioCosto = parseFloat(item.precio_costo) || 0;
                const precioActual = parseFloat(item.precio) || 0;
                let precioNuevo = precioActual;

                switch (tipoAjuste) {
                    case 'ganancia':
                        if (precioCosto > 0) {
                            precioNuevo = precioCosto * (1 + valor / 100);
                        }
                        break;
                    case 'porcentaje':
                        precioNuevo = precioActual * (1 + valor / 100);
                        break;
                    case 'precio':
                        precioNuevo = precioActual + valor;
                        break;
                }

                return {
                    id: item.id,
                    precio: Math.max(0.01, Math.round(precioNuevo * 100) / 100),
                    porcentaje_ganancia: tipoAjuste === 'ganancia' ? valor : null
                };
            });

            // Llamar al endpoint de ajuste masivo
            const response = await api.post('/inventory/ajuste-masivo', { ajustes });

            if (response.data.success) {
                toast.success(`✅ ${ajustes.length} productos actualizados`);
                await obtenerInventario();
                onClose();
            } else {
                throw new Error(response.data.message);
            }

        } catch (error) {
            console.error('Error en ajuste masivo:', error);
            toast.error(error.response?.data?.message || 'Error al aplicar ajuste masivo');
        } finally {
            setLoading(false);
        }
    };

    const getIconoTipo = (tipo) => {
        switch (tipo) {
            case 'producto': return <Package className="h-4 w-4 text-blue-500" />;
            case 'servicio': return <Wrench className="h-4 w-4 text-green-500" />;
            case 'electrobar': return <Coffee className="h-4 w-4 text-orange-500" />;
            default: return <Package className="h-4 w-4" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Calculator className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Ajuste Masivo de Precios</h2>
                                <p className="text-sm text-amber-100">Modifica precios y ganancias de múltiples productos</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Tipo de ajuste */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-amber-600" />
                            Tipo de Ajuste
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setTipoAjuste('ganancia')}
                                className={`p-3 rounded-lg border-2 text-center transition-all ${tipoAjuste === 'ganancia'
                                        ? 'border-amber-500 bg-amber-100 text-amber-800'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'
                                    }`}
                            >
                                <Percent className="h-6 w-6 mx-auto mb-1" />
                                <div className="font-medium text-sm">% Ganancia Fijo</div>
                                <div className="text-xs opacity-75">Sobre costo</div>
                            </button>
                            <button
                                onClick={() => setTipoAjuste('porcentaje')}
                                className={`p-3 rounded-lg border-2 text-center transition-all ${tipoAjuste === 'porcentaje'
                                        ? 'border-amber-500 bg-amber-100 text-amber-800'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'
                                    }`}
                            >
                                <RefreshCw className="h-6 w-6 mx-auto mb-1" />
                                <div className="font-medium text-sm">Ajustar %</div>
                                <div className="text-xs opacity-75">+/- precio actual</div>
                            </button>
                            <button
                                onClick={() => setTipoAjuste('precio')}
                                className={`p-3 rounded-lg border-2 text-center transition-all ${tipoAjuste === 'precio'
                                        ? 'border-amber-500 bg-amber-100 text-amber-800'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'
                                    }`}
                            >
                                <DollarSign className="h-6 w-6 mx-auto mb-1" />
                                <div className="font-medium text-sm">Monto Fijo</div>
                                <div className="text-xs opacity-75">+/- en USD</div>
                            </button>
                        </div>
                    </div>

                    {/* Filtros y valor */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de producto</label>
                            <select
                                value={filtroTipo}
                                onChange={(e) => setFiltroTipo(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="todos">Todos los tipos</option>
                                <option value="producto">Solo Productos</option>
                                <option value="servicio">Solo Servicios</option>
                                <option value="electrobar">Solo Electrobar</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                            <select
                                value={filtroCategoria}
                                onChange={(e) => setFiltroCategoria(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {tipoAjuste === 'ganancia' && 'Porcentaje de ganancia (%)'}
                            {tipoAjuste === 'porcentaje' && 'Porcentaje de ajuste (%) - Usa valores negativos para reducir'}
                            {tipoAjuste === 'precio' && 'Monto a ajustar ($) - Usa valores negativos para reducir'}
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={valorAjuste}
                                    onChange={(e) => setValorAjuste(e.target.value)}
                                    placeholder={tipoAjuste === 'precio' ? 'Ej: 5.00 o -2.50' : 'Ej: 30 o -10'}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {tipoAjuste === 'precio' ? '$' : '%'}
                                </span>
                            </div>
                            <button
                                onClick={calcularPreview}
                                disabled={!valorAjuste}
                                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium disabled:opacity-50"
                            >
                                Vista Previa
                            </button>
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Productos afectados:</span>
                            <span className="font-bold text-blue-700 text-xl">{productosAfectados.length}</span>
                        </div>
                    </div>

                    {/* Preview */}
                    {preview.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">Vista Previa (primeros 10)</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {preview.map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-lg border text-sm">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {getIconoTipo(item.tipo)}
                                            <span className="truncate">{item.descripcion}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-right">
                                            <div>
                                                <div className="text-gray-400 line-through">${item.precioActual.toFixed(2)}</div>
                                                <div className={`font-bold ${item.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ${item.precioNuevo.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-medium ${item.diferencia >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {item.diferencia >= 0 ? '+' : ''}{item.diferencia.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Confirmación */}
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={confirmar}
                                onChange={(e) => setConfirmar(e.target.checked)}
                                className="w-5 h-5 text-red-600 rounded focus:ring-red-500 mt-0.5"
                            />
                            <div>
                                <span className="font-medium text-red-800 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Confirmo que deseo aplicar este ajuste masivo
                                </span>
                                <p className="text-sm text-red-600 mt-1">
                                    Esta acción modificará el precio de {productosAfectados.length} productos y no se puede deshacer fácilmente.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={aplicarAjuste}
                        disabled={!confirmar || !valorAjuste || productosAfectados.length === 0 || loading}
                        className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Aplicando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Aplicar Ajuste Masivo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AjusteMasivoModal;
