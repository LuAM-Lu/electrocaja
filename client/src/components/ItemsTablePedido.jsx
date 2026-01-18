// components/ItemsTablePedido.jsx - Tabla de items para pedidos con notas internas
import React, { useState } from 'react';
import {
    Plus, Trash2, Edit3, Save, X, Package,
    FileText, Link as LinkIcon, Building, Tag, Monitor, Truck, Sparkles, DollarSign,
    Wallet, PiggyBank, Mail, PackageCheck, AlertCircle, TrendingUp
} from 'lucide-react';
import toast from '../utils/toast.jsx';

// Modal para agregar notas internas
const ModalNotaInterna = ({ isOpen, onClose, onGuardar, notaActual }) => {
    const [proveedor, setProveedor] = useState(notaActual?.proveedor || '');
    const [codigoProducto, setCodigoProducto] = useState(notaActual?.codigoProducto || '');
    const [link, setLink] = useState(notaActual?.link || '');

    if (!isOpen) return null;

    const handleGuardar = () => {
        onGuardar({
            proveedor: proveedor.trim() || null,
            codigoProducto: codigoProducto.trim() || null,
            link: link.trim() || null
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between rounded-t-xl">
                    <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-white" />
                        <span className="font-bold text-white">Nota Interna</span>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-500">
                        Esta información es solo para uso interno y no se muestra al cliente.
                    </p>

                    {/* Proveedor */}
                    <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1">
                            <Building className="h-4 w-4" />
                            <span>Proveedor</span>
                        </label>
                        <input
                            type="text"
                            value={proveedor}
                            onChange={(e) => setProveedor(e.target.value)}
                            placeholder="Nombre del proveedor..."
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                        />
                    </div>

                    {/* Código de producto */}
                    <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1">
                            <Tag className="h-4 w-4" />
                            <span>Código de Producto</span>
                        </label>
                        <input
                            type="text"
                            value={codigoProducto}
                            onChange={(e) => setCodigoProducto(e.target.value)}
                            placeholder="Código o SKU del proveedor..."
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                        />
                    </div>

                    {/* Link */}
                    <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1">
                            <LinkIcon className="h-4 w-4" />
                            <span>Link (opcional)</span>
                        </label>
                        <input
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                        />
                    </div>
                </div>

                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-purple-50/50 rounded-b-xl flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        <Save className="h-4 w-4" />
                        <span>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal para agregar item personalizado - Diseño Premium
const ModalItemPersonalizado = ({ isOpen, onClose, onAgregar, tasaCambio, itemsExistentes = [] }) => {
    const [descripcion, setDescripcion] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [precioCosto, setPrecioCosto] = useState('');
    const [precioUnitario, setPrecioUnitario] = useState('');
    // Notas internas
    const [proveedor, setProveedor] = useState('');
    const [codigoProducto, setCodigoProducto] = useState('');
    const [link, setLink] = useState('');
    // Errores de validación
    const [errors, setErrors] = useState({});

    // Determinar tipo requerido según items existentes
    const tipoRequerido = itemsExistentes.length > 0
        ? (itemsExistentes[0].tipoProducto || 'fisico')
        : null;

    // Si hay items existentes, forzar el mismo tipo
    const [tipoProducto, setTipoProducto] = useState(tipoRequerido || 'fisico');

    // El tipo está bloqueado si ya hay items
    const tipoBloqueado = itemsExistentes.length > 0;

    if (!isOpen) return null;

    // Validar URL
    const isValidUrl = (string) => {
        if (!string) return true; // URL es opcional
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    // Validar todo el formulario
    const validateForm = () => {
        const newErrors = {};

        // Descripción requerida
        if (!descripcion.trim()) {
            newErrors.descripcion = 'La descripción es requerida';
        } else if (descripcion.trim().length < 3) {
            newErrors.descripcion = 'Mínimo 3 caracteres';
        }

        // Cantidad
        const cantidadNum = parseInt(cantidad);
        if (!cantidad || cantidadNum < 1) {
            newErrors.cantidad = 'Mínimo 1';
        } else if (cantidadNum > 999) {
            newErrors.cantidad = 'Máximo 999';
        }

        // Precio de venta requerido
        const precioNum = parseFloat(precioUnitario);
        if (!precioUnitario || isNaN(precioNum)) {
            newErrors.precioUnitario = 'Precio requerido';
        } else if (precioNum <= 0) {
            newErrors.precioUnitario = 'Debe ser mayor a 0';
        }

        // Validar URL si se proporciona
        if (link && !isValidUrl(link)) {
            newErrors.link = 'URL inválida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAgregar = () => {
        if (!validateForm()) {
            toast.error('Corrige los errores del formulario');
            return;
        }

        const precio = parseFloat(precioUnitario);
        const costo = parseFloat(precioCosto) || 0;

        // Advertencia si venta < costo (pero permitir)
        if (costo > 0 && precio < costo) {
            toast('⚠️ El precio de venta es menor al costo', { icon: '⚠️' });
        }

        // Construir nota interna (siempre incluir tipo)
        const notaInterna = {
            tipo: tipoProducto,
            proveedor: proveedor.trim() || null,
            codigoProducto: codigoProducto.trim() || null,
            link: link.trim() || null
        };

        onAgregar({
            id: `custom_${Date.now()}`,
            descripcion: descripcion.trim(),
            cantidad: parseInt(cantidad),
            precioUnitario: precio,
            precioCosto: costo,
            subtotal: precio * parseInt(cantidad),
            esPersonalizado: true,
            tipoProducto, // Para acceso directo
            notaInterna
        });

        // Limpiar
        setDescripcion('');
        setCantidad(1);
        setPrecioCosto('');
        setPrecioUnitario('');
        setTipoProducto('fisico');
        setProveedor('');
        setCodigoProducto('');
        setLink('');
        setErrors({});
        onClose();
    };

    // Calcular margen
    const margen = precioUnitario && precioCosto
        ? ((parseFloat(precioUnitario) - parseFloat(precioCosto)) / parseFloat(precioCosto) * 100).toFixed(1)
        : null;


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-white to-blue-50/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden border border-white/50">

                {/* Header Premium */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Agregar Producto</h2>
                                <p className="text-blue-100 text-xs">Nuevo item para el pedido</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">

                    {/* Descripción - Campo principal destacado */}
                    <div>
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span>Descripción del Producto</span>
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={descripcion}
                            onChange={(e) => { setDescripcion(e.target.value); setErrors(prev => ({ ...prev, descripcion: null })); }}
                            placeholder="Ej: Samsung Galaxy A54 256GB Negro..."
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 font-medium transition-all placeholder:text-gray-400 ${errors.descripcion ? 'border-red-400 bg-red-50' : 'border-blue-200 focus:border-blue-400'
                                }`}
                            autoFocus
                        />
                        {errors.descripcion && (
                            <p className="flex items-center gap-1 text-red-500 text-xs mt-1">
                                <AlertCircle className="h-3 w-3" /> {errors.descripcion}
                            </p>
                        )}
                    </div>

                    {/* Fila 1: Cantidad + Costo + Venta - Todo junto */}
                    <div className="flex gap-3 items-end">
                        {/* Cantidad - Compacto */}
                        <div className="w-16 flex-shrink-0">
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">
                                Cant. *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="999"
                                value={cantidad}
                                onChange={(e) => { setCantidad(e.target.value); setErrors(prev => ({ ...prev, cantidad: null })); }}
                                className={`w-full px-1 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-center font-bold text-base transition-all ${errors.cantidad ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-400'
                                    }`}
                            />
                            {errors.cantidad && (
                                <p className="text-red-500 text-[8px] mt-0.5 text-center">{errors.cantidad}</p>
                            )}
                        </div>

                        {/* Precio Costo */}
                        <div className="flex-1">
                            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 mb-1 uppercase">
                                <Wallet className="h-3 w-3 text-orange-500" />
                                <span>Costo USD</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={precioCosto}
                                    onChange={(e) => setPrecioCosto(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-6 pr-2 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-400 bg-orange-50/50 text-right font-medium transition-all"
                                />
                            </div>
                        </div>

                        {/* Precio Venta */}
                        <div className="flex-1">
                            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 mb-1 uppercase">
                                <PiggyBank className="h-3 w-3 text-green-600" />
                                <span>Venta USD *</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-green-600 font-bold text-sm">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={precioUnitario}
                                    onChange={(e) => { setPrecioUnitario(e.target.value); setErrors(prev => ({ ...prev, precioUnitario: null })); }}
                                    placeholder="0.00"
                                    className={`w-full pl-6 pr-2 py-2 border-2 rounded-lg focus:ring-2 focus:ring-green-500 text-right font-bold text-green-700 transition-all ${errors.precioUnitario ? 'border-red-400 bg-red-50' : 'border-green-300 focus:border-green-400 bg-green-50'
                                        }`}
                                />
                            </div>
                            {errors.precioUnitario && (
                                <p className="text-red-500 text-[8px] mt-0.5">{errors.precioUnitario}</p>
                            )}
                        </div>
                    </div>

                    {/* Fila 2: Botones de margen + Badge - Todo en línea */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 rounded-lg p-2">
                        <span className="text-[10px] text-gray-500 font-medium">Margen:</span>
                        {[30, 40, 50, 60, 70].map((pct) => (
                            <button
                                key={pct}
                                type="button"
                                disabled={!precioCosto || parseFloat(precioCosto) <= 0}
                                onClick={() => {
                                    const costo = parseFloat(precioCosto);
                                    if (costo > 0) {
                                        const venta = costo * (1 + pct / 100);
                                        setPrecioUnitario(venta.toFixed(2));
                                    }
                                }}
                                className={`px-2 py-1 rounded font-bold text-[10px] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${margen && Math.round(parseFloat(margen)) === pct
                                    ? 'bg-green-500 text-white shadow-sm'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                            >
                                {pct}%
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={!precioCosto || parseFloat(precioCosto) <= 0}
                            onClick={() => {
                                const costo = parseFloat(precioCosto);
                                if (costo > 0) {
                                    const venta = costo * 2;
                                    setPrecioUnitario(venta.toFixed(2));
                                }
                            }}
                            className={`px-2 py-1 rounded font-bold text-[10px] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${margen && parseFloat(margen) >= 95 && parseFloat(margen) <= 105
                                ? 'bg-purple-500 text-white shadow-sm'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                }`}
                        >
                            x2
                        </button>

                        {/* Badge de Margen - Inline */}
                        {margen && parseFloat(margen) > 0 ? (
                            <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${parseFloat(margen) >= 40 ? 'bg-green-100 text-green-700' :
                                parseFloat(margen) >= 25 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {margen}% (${(parseFloat(precioUnitario) - parseFloat(precioCosto)).toFixed(2)})
                            </span>
                        ) : (
                            <span className="ml-auto text-[10px] text-gray-400">Ingresa costo</span>
                        )}
                    </div>


                    {/* Sección Notas Internas */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200/50">
                        <div className="flex items-center space-x-2 mb-4">
                            <FileText className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-bold text-purple-700">Notas Internas</span>
                            <span className="text-[10px] text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">Solo staff</span>
                        </div>

                        {/* Tipo de Producto - Digital o Físico */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-purple-700 mb-2">
                                Tipo de Producto
                                {tipoBloqueado && (
                                    <span className="ml-2 text-[10px] text-orange-600 font-normal">
                                        (Bloqueado - mismo tipo que items existentes)
                                    </span>
                                )}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => !tipoBloqueado && setTipoProducto('fisico')}
                                    disabled={tipoBloqueado && tipoProducto !== 'fisico'}
                                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 transition-all ${tipoProducto === 'fisico'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                                            : tipoBloqueado
                                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <Truck className="h-5 w-5" />
                                    <span className="font-medium">Físico</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => !tipoBloqueado && setTipoProducto('digital')}
                                    disabled={tipoBloqueado && tipoProducto !== 'digital'}
                                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 transition-all ${tipoProducto === 'digital'
                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-md'
                                            : tipoBloqueado
                                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <Monitor className="h-5 w-5" />
                                    <span className="font-medium">Digital</span>
                                </button>
                            </div>
                            {tipoBloqueado && (
                                <p className="flex items-center justify-center gap-1 text-[10px] text-orange-500 mt-2 bg-orange-50 rounded p-1.5">
                                    <AlertCircle className="h-3 w-3" />
                                    Todos los productos del pedido deben ser del mismo tipo
                                </p>
                            )}
                            <p className="flex items-center justify-center gap-1 text-[10px] text-purple-500 mt-1">
                                {tipoProducto === 'digital' ? (
                                    <><Mail className="h-3 w-3" /> No requiere envío - Entrega inmediata</>
                                ) : (
                                    <><PackageCheck className="h-3 w-3" /> Requiere envío físico</>
                                )}
                            </p>
                        </div>

                        {/* Proveedor, Código y Link */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="flex items-center space-x-1 text-[10px] font-semibold text-purple-600 mb-1 uppercase">
                                    <Building className="h-3 w-3" />
                                    <span>Proveedor</span>
                                </label>
                                <input
                                    type="text"
                                    value={proveedor}
                                    onChange={(e) => setProveedor(e.target.value)}
                                    placeholder="ML, Amazon..."
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-white/80 transition-all"
                                />
                            </div>
                            <div>
                                <label className="flex items-center space-x-1 text-[10px] font-semibold text-purple-600 mb-1 uppercase">
                                    <Tag className="h-3 w-3" />
                                    <span>Código</span>
                                </label>
                                <input
                                    type="text"
                                    value={codigoProducto}
                                    onChange={(e) => setCodigoProducto(e.target.value)}
                                    placeholder="SKU..."
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-white/80 transition-all"
                                />
                            </div>
                            <div>
                                <label className="flex items-center space-x-1 text-[10px] font-semibold text-purple-600 mb-1 uppercase">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>Link</span>
                                </label>
                                <input
                                    type="url"
                                    value={link}
                                    onChange={(e) => { setLink(e.target.value); setErrors(prev => ({ ...prev, link: null })); }}
                                    placeholder="https://..."
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-white/80 transition-all ${errors.link ? 'border-red-400 bg-red-50' : 'border-purple-200'
                                        }`}
                                />
                                {errors.link && (
                                    <p className="text-red-500 text-[8px] mt-0.5">{errors.link}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview de Subtotal */}
                    {precioUnitario && cantidad && (
                        <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-xl p-4 border border-green-200 shadow-inner">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    <span className="text-gray-600 font-semibold">Subtotal</span>
                                </div>
                                <span className="font-bold text-3xl text-green-600">
                                    ${(parseFloat(precioUnitario) * parseInt(cantidad)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-200/50">
                                <span className="text-sm text-gray-500">Equivalente en Bs.</span>
                                <span className="text-lg text-gray-600 font-medium">
                                    Bs. {((parseFloat(precioUnitario) * parseInt(cantidad)) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Premium */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 via-blue-50/50 to-purple-50/50 border-t border-gray-200/50 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAgregar}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Agregar Producto</span>
                    </button>
                </div>
            </div>
        </div >
    );
};


// Componente principal
const ItemsTablePedido = ({
    items = [],
    onItemsChange,
    tasaCambio = 1,
    showNotasInternas = true
}) => {
    const [showModalItem, setShowModalItem] = useState(false);
    const [showModalNota, setShowModalNota] = useState(false);
    const [itemEditandoNota, setItemEditandoNota] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});

    // Agregar item
    const handleAgregarItem = (nuevoItem) => {
        onItemsChange([...items, nuevoItem]);
        toast.success('Producto agregado');
    };

    // Eliminar item
    const handleEliminarItem = (itemId) => {
        onItemsChange(items.filter(item => item.id !== itemId));
        toast.info('Producto eliminado');
    };

    // Editar item
    const handleStartEdit = (item) => {
        setEditingId(item.id);
        setEditValues({
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario
        });
    };

    const handleSaveEdit = (itemId) => {
        const updatedItems = items.map(item => {
            if (item.id === itemId) {
                const cantidad = parseInt(editValues.cantidad) || 1;
                const precio = parseFloat(editValues.precioUnitario) || 0;
                return {
                    ...item,
                    cantidad,
                    precioUnitario: precio,
                    subtotal: cantidad * precio
                };
            }
            return item;
        });
        onItemsChange(updatedItems);
        setEditingId(null);
        toast.success('Item actualizado');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValues({});
    };

    // Notas internas
    const handleAbrirNotaInterna = (item) => {
        setItemEditandoNota(item);
        setShowModalNota(true);
    };

    const handleGuardarNotaInterna = (notaInterna) => {
        const updatedItems = items.map(item => {
            if (item.id === itemEditandoNota.id) {
                return { ...item, notaInterna };
            }
            return item;
        });
        onItemsChange(updatedItems);
        setItemEditandoNota(null);
        toast.success('Nota interna guardada');
    };

    // Total
    const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    return (
        <div className="space-y-4">
            {/* Botón agregar */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </div>
                <button
                    onClick={() => setShowModalItem(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Producto</span>
                </button>
            </div>

            {/* Lista de items */}
            {items.length === 0 ? (
                <div className="text-center py-12 bg-blue-50/50 rounded-xl border-2 border-dashed border-blue-200">
                    <Package className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay productos agregados</p>
                    <p className="text-sm text-gray-400">Haz clic en "Agregar Producto" para comenzar</p>
                </div>
            ) : (
                <div className="border border-blue-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Cant.</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">Precio</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">Subtotal</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-28">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    {/* Producto */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-gray-800">{item.descripcion}</span>
                                            {/* Badge de tipo */}
                                            {item.tipoProducto && (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.tipoProducto === 'digital'
                                                    ? 'bg-cyan-100 text-cyan-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {item.tipoProducto === 'digital' ? (
                                                        <><Monitor className="h-2.5 w-2.5 mr-0.5" />Digital</>
                                                    ) : (
                                                        <><Truck className="h-2.5 w-2.5 mr-0.5" />Físico</>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        {/* Nota interna */}
                                        {showNotasInternas && item.notaInterna && (
                                            <div className="flex items-center space-x-2 mt-1 text-xs text-purple-600">
                                                <FileText className="h-3 w-3" />
                                                <span>
                                                    {item.notaInterna.proveedor && `${item.notaInterna.proveedor}`}
                                                    {item.notaInterna.codigoProducto && ` • ${item.notaInterna.codigoProducto}`}
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Cantidad */}
                                    <td className="px-4 py-3 text-center">
                                        {editingId === item.id ? (
                                            <input
                                                type="number"
                                                min="1"
                                                value={editValues.cantidad}
                                                onChange={(e) => setEditValues({ ...editValues, cantidad: e.target.value })}
                                                className="w-16 px-2 py-1 text-center border rounded"
                                            />
                                        ) : (
                                            <span className="text-gray-800">{item.cantidad}</span>
                                        )}
                                    </td>

                                    {/* Precio */}
                                    <td className="px-4 py-3 text-right">
                                        {editingId === item.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={editValues.precioUnitario}
                                                onChange={(e) => setEditValues({ ...editValues, precioUnitario: e.target.value })}
                                                className="w-20 px-2 py-1 text-right border rounded"
                                            />
                                        ) : (
                                            <span className="text-gray-800">${item.precioUnitario?.toFixed(2)}</span>
                                        )}
                                    </td>

                                    {/* Subtotal */}
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                        ${item.subtotal?.toFixed(2)}
                                    </td>

                                    {/* Acciones */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center space-x-1">
                                            {editingId === item.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSaveEdit(item.id)}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        title="Guardar"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                                        title="Cancelar"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleStartEdit(item)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Editar"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    {showNotasInternas && (
                                                        <button
                                                            onClick={() => handleAbrirNotaInterna(item)}
                                                            className={`p-1 rounded ${item.notaInterna
                                                                ? 'text-purple-600 hover:bg-purple-50'
                                                                : 'text-gray-400 hover:bg-gray-100'
                                                                }`}
                                                            title="Nota interna"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEliminarItem(item.id)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <tr>
                                <td colSpan="3" className="px-4 py-3 text-right font-bold text-gray-700">
                                    Total
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-xl text-green-600">
                                    ${total.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                            <tr>
                                <td colSpan="3" className="px-4 py-1 text-right text-sm text-gray-500">
                                    En Bolívares
                                </td>
                                <td className="px-4 py-1 text-right text-sm text-gray-500">
                                    Bs. {(total * tasaCambio).toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Modal agregar item */}
            <ModalItemPersonalizado
                isOpen={showModalItem}
                onClose={() => setShowModalItem(false)}
                onAgregar={handleAgregarItem}
                tasaCambio={tasaCambio}
                itemsExistentes={items}
            />

            {/* Modal nota interna */}
            {itemEditandoNota && (
                <ModalNotaInterna
                    isOpen={showModalNota}
                    onClose={() => {
                        setShowModalNota(false);
                        setItemEditandoNota(null);
                    }}
                    onGuardar={handleGuardarNotaInterna}
                    notaActual={itemEditandoNota?.notaInterna}
                />
            )}
        </div>
    );
};

export default ItemsTablePedido;
