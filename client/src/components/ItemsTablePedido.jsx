// components/ItemsTablePedido.jsx - Tabla de items para pedidos con notas internas
import React, { useState } from 'react';
import {
    Plus, Trash2, Edit3, Save, X, Package,
    FileText, Link as LinkIcon, Building, Tag
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

// Modal para agregar item personalizado
const ModalItemPersonalizado = ({ isOpen, onClose, onAgregar, tasaCambio }) => {
    const [descripcion, setDescripcion] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [precioUnitario, setPrecioUnitario] = useState('');
    const [precioCosto, setPrecioCosto] = useState('');
    // Notas internas
    const [proveedor, setProveedor] = useState('');
    const [codigoProducto, setCodigoProducto] = useState('');
    const [link, setLink] = useState('');

    if (!isOpen) return null;

    const handleAgregar = () => {
        if (!descripcion.trim()) {
            toast.error('Ingresa una descripción');
            return;
        }

        if (!precioUnitario || parseFloat(precioUnitario) <= 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        const precio = parseFloat(precioUnitario);
        const costo = parseFloat(precioCosto) || 0;

        // Construir nota interna si hay datos
        const notaInterna = (proveedor.trim() || codigoProducto.trim() || link.trim())
            ? {
                proveedor: proveedor.trim() || null,
                codigoProducto: codigoProducto.trim() || null,
                link: link.trim() || null
            }
            : null;

        onAgregar({
            id: `custom_${Date.now()}`,
            descripcion: descripcion.trim(),
            cantidad: parseInt(cantidad),
            precioUnitario: precio,
            precioCosto: costo,
            subtotal: precio * parseInt(cantidad),
            esPersonalizado: true,
            notaInterna
        });

        // Limpiar
        setDescripcion('');
        setCantidad(1);
        setPrecioUnitario('');
        setPrecioCosto('');
        setProveedor('');
        setCodigoProducto('');
        setLink('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between rounded-t-xl sticky top-0">
                    <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-white" />
                        <span className="font-bold text-white">Agregar Producto</span>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción del Producto *
                        </label>
                        <input
                            type="text"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej: Samsung Galaxy A54..."
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                            autoFocus
                        />
                    </div>

                    {/* Cantidad, Precio Venta y Precio Costo en una fila */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cantidad *
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Venta (USD) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={precioUnitario}
                                onChange={(e) => setPrecioUnitario(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Costo (USD)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={precioCosto}
                                onChange={(e) => setPrecioCosto(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                            />
                        </div>
                    </div>

                    {/* Separador con título */}
                    <div className="pt-2 border-t border-purple-100">
                        <div className="flex items-center space-x-2 mb-3">
                            <FileText className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-600">Notas Internas (Solo visible internamente)</span>
                        </div>

                        {/* Proveedor, Código y Link en una fila */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="flex items-center space-x-1 text-xs font-medium text-gray-600 mb-1">
                                    <Building className="h-3 w-3" />
                                    <span>Proveedor</span>
                                </label>
                                <input
                                    type="text"
                                    value={proveedor}
                                    onChange={(e) => setProveedor(e.target.value)}
                                    placeholder="Ej: ML..."
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-purple-50/30"
                                />
                            </div>
                            <div>
                                <label className="flex items-center space-x-1 text-xs font-medium text-gray-600 mb-1">
                                    <Tag className="h-3 w-3" />
                                    <span>Código</span>
                                </label>
                                <input
                                    type="text"
                                    value={codigoProducto}
                                    onChange={(e) => setCodigoProducto(e.target.value)}
                                    placeholder="SKU..."
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-purple-50/30"
                                />
                            </div>
                            <div>
                                <label className="flex items-center space-x-1 text-xs font-medium text-gray-600 mb-1">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>Link</span>
                                </label>
                                <input
                                    type="url"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-purple-50/30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    {precioUnitario && cantidad && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">Subtotal</span>
                                <span className="font-bold text-2xl text-blue-600">
                                    ${(parseFloat(precioUnitario) * parseInt(cantidad)).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-sm text-gray-500">En Bs.</span>
                                <span className="text-lg text-gray-600 font-medium">
                                    Bs. {((parseFloat(precioUnitario) * parseInt(cantidad)) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-b-xl flex justify-end space-x-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAgregar}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Agregar</span>
                    </button>
                </div>
            </div>
        </div>
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
                                        <div className="font-medium text-gray-800">{item.descripcion}</div>
                                        {/* Nota interna */}
                                        {showNotasInternas && item.notaInterna && (
                                            <div className="flex items-center space-x-2 mt-1 text-xs text-purple-600">
                                                <FileText className="h-3 w-3" />
                                                <span>
                                                    {item.notaInterna.proveedor && `${item.notaInterna.proveedor}`}
                                                    {item.notaInterna.codigoProducto && ` - ${item.notaInterna.codigoProducto}`}
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
