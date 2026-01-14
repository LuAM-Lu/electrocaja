// components/inventario/PrintInventarioModal.jsx
import React, { useState, useRef } from 'react';
import {
    X, Printer, Eye, Filter, Package, ShoppingCart, Wrench, Coffee,
    DollarSign, MapPin, Store, Tag, Hash, Boxes, CheckCircle, XCircle,
    ChevronDown, ChevronUp, FileText, Image, Plus, Trash2, GripVertical
} from 'lucide-react';
import { useInventarioStore } from '../../store/inventarioStore';
import { useAuthStore } from '../../store/authStore';
import { getImageUrl } from '../../config/api';

const PrintInventarioModal = ({ isOpen, onClose }) => {
    const { inventario } = useInventarioStore();
    const { usuario } = useAuthStore();

    // Filtros de selección
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroUbicacion, setFiltroUbicacion] = useState('todos');
    const [filtroProveedor, setFiltroProveedor] = useState('todos');
    const [filtroCategoria, setFiltroCategoria] = useState('todos');
    const [soloActivos, setSoloActivos] = useState(true);
    const [orientacion, setOrientacion] = useState('landscape'); // 'landscape' o 'portrait'

    // Campos a incluir en la impresión
    const [camposSeleccionados, setCamposSeleccionados] = useState({
        id: true,
        imagen: false,
        descripcion: true,
        codigo_barras: true,
        codigo_interno: false,
        tipo: true,
        precio: true,
        precio_costo: false,
        stock: true,
        stock_minimo: false,
        ubicacion: true,
        proveedor: true,
        categoria: true,
        observaciones: false
    });

    // Columnas personalizadas
    const [columnasPersonalizadas, setColumnasPersonalizadas] = useState([]);
    const [nuevaColumna, setNuevaColumna] = useState('');

    const printRef = useRef();

    // Agregar columna personalizada
    const agregarColumnaPersonalizada = () => {
        if (nuevaColumna.trim() && !columnasPersonalizadas.includes(nuevaColumna.trim())) {
            setColumnasPersonalizadas([...columnasPersonalizadas, nuevaColumna.trim()]);
            setNuevaColumna('');
        }
    };

    // Eliminar columna personalizada
    const eliminarColumnaPersonalizada = (columna) => {
        setColumnasPersonalizadas(columnasPersonalizadas.filter(c => c !== columna));
    };

    // Estado para drag and drop
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Manejar inicio de arrastre
    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Manejar soltar
    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === dropIndex) return;

        const newOrder = [...columnasPersonalizadas];
        const [removed] = newOrder.splice(draggedItem, 1);
        newOrder.splice(dropIndex, 0, removed);
        setColumnasPersonalizadas(newOrder);
        setDraggedItem(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverIndex(null);
    };

    // Obtener valores únicos para filtros
    const ubicaciones = [...new Set(inventario.map(i => i.ubicacion_fisica).filter(Boolean))];
    const proveedores = [...new Set(inventario.map(i => i.proveedor).filter(Boolean))];
    const categorias = [...new Set(inventario.map(i => i.categoria).filter(Boolean))];

    // Filtrar inventario según selección
    const inventarioFiltrado = inventario.filter(item => {
        if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
        if (filtroUbicacion !== 'todos' && item.ubicacion_fisica !== filtroUbicacion) return false;
        if (filtroProveedor !== 'todos' && item.proveedor !== filtroProveedor) return false;
        if (filtroCategoria !== 'todos' && item.categoria !== filtroCategoria) return false;
        if (soloActivos && item.activo === false) return false;
        return true;
    });

    // Toggle campo
    const toggleCampo = (campo) => {
        setCamposSeleccionados(prev => ({ ...prev, [campo]: !prev[campo] }));
    };

    // Contar campos activos (incluyendo columnas personalizadas)
    const camposActivos = Object.values(camposSeleccionados).filter(Boolean).length + columnasPersonalizadas.length;

    // Calcular páginas estimadas (aproximado)
    const itemsPorPagina = orientacion === 'landscape' ? 25 : 35;
    const paginasEstimadas = Math.ceil(inventarioFiltrado.length / itemsPorPagina);

    // Mapa de labels para campos
    const campoLabels = {
        id: 'ID',
        imagen: 'Imagen',
        descripcion: 'Descripción',
        codigo_barras: 'Cód. Barras',
        codigo_interno: 'Cód. Interno',
        tipo: 'Tipo',
        precio: 'Precio',
        precio_costo: 'Costo',
        stock: 'Stock',
        stock_minimo: 'Stock Mín.',
        ubicacion: 'Ubicación',
        proveedor: 'Proveedor',
        categoria: 'Categoría',
        observaciones: 'Observaciones'
    };

    // Función para imprimir
    const handlePrint = () => {
        const content = printRef.current;
        const printWindow = window.open('', '_blank');

        // Calcular tamaño de imagen dinámico (menos columnas = imagen más grande)
        // Rango: 35px (14 cols) a 80px (3 cols o menos)
        const tamanoImagen = Math.min(80, Math.max(35, 90 - (camposActivos * 5)));

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Listado de Inventario - ElectroCaja</title>
        <style>
          @media print {
            @page { size: ${orientacion}; margin: 10mm; }
          }
          body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 10px; }
          h1 { font-size: 16px; margin-bottom: 5px; color: #4f46e5; }
          .info { font-size: 9px; color: #666; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { background: #f3f4f6; color: #374151; font-weight: bold; text-align: left; padding: 6px 4px; border-bottom: 2px solid #e5e7eb; font-size: 9px; text-transform: uppercase; }
          td { padding: 5px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
          tr:nth-child(even) { background: #f9fafb; }
          .tipo-producto { color: #2563eb; }
          .tipo-servicio { color: #16a34a; }
          .tipo-electrobar { color: #ea580c; }
          .stock-bajo { color: #dc2626; font-weight: bold; }
          .stock-ok { color: #16a34a; }
          .precio { font-family: monospace; }
          .footer { margin-top: 10px; font-size: 8px; color: #9ca3af; text-align: center; }
          img { max-width: ${tamanoImagen}px !important; max-height: ${tamanoImagen}px !important; width: ${tamanoImagen}px !important; height: ${tamanoImagen}px !important; object-fit: cover; border-radius: 4px; display: block; margin: 0 auto; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <div class="footer">
          Generado por ElectroCaja • ${new Date().toLocaleString('es-VE')} • Usuario: ${usuario?.nombre || 'Sistema'}
        </div>
      </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2.5 rounded-xl">
                            <Printer className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Imprimir Inventario</h2>
                            <p className="text-xs text-indigo-200">Configura y genera listado de productos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Panel de Filtros */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-indigo-600" />
                                    Filtrar Productos
                                </h3>

                                {/* Filtro por Tipo */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        value={filtroTipo}
                                        onChange={(e) => setFiltroTipo(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    >
                                        <option value="todos">Todos los tipos</option>
                                        <option value="producto">🛒 Productos</option>
                                        <option value="servicio">🔧 Servicios</option>
                                        <option value="electrobar">☕ Electrobar</option>
                                    </select>
                                </div>

                                {/* Filtro por Ubicación */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                                    <select
                                        value={filtroUbicacion}
                                        onChange={(e) => setFiltroUbicacion(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    >
                                        <option value="todos">Todas las ubicaciones</option>
                                        {ubicaciones.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filtro por Proveedor */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                                    <select
                                        value={filtroProveedor}
                                        onChange={(e) => setFiltroProveedor(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    >
                                        <option value="todos">Todos los proveedores</option>
                                        {proveedores.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filtro por Categoría */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                    <select
                                        value={filtroCategoria}
                                        onChange={(e) => setFiltroCategoria(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    >
                                        <option value="todos">Todas las categorías</option>
                                        {categorias.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Solo activos */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={soloActivos}
                                        onChange={(e) => setSoloActivos(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">Solo productos activos</span>
                                </label>
                            </div>

                            {/* Panel de Campos */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-indigo-600" />
                                    Campos a Incluir ({camposActivos})
                                </h3>

                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(campoLabels).map(([campo, label]) => (
                                        <label
                                            key={campo}
                                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${camposSeleccionados[campo]
                                                ? 'bg-indigo-100 border border-indigo-300'
                                                : 'bg-white border border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={camposSeleccionados[campo]}
                                                onChange={() => toggleCampo(campo)}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs text-gray-700">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Estadísticas y Orientación */}
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                                <div className="text-center mb-4">
                                    <div className="text-3xl font-bold text-indigo-700">{inventarioFiltrado.length}</div>
                                    <div className="text-sm text-indigo-600">productos seleccionados</div>
                                </div>

                                {/* Contador de páginas */}
                                <div className="bg-white rounded-lg p-3 mb-3 border border-indigo-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Páginas estimadas:</span>
                                        <span className="text-lg font-bold text-indigo-600">{paginasEstimadas}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">~{itemsPorPagina} items/página</div>
                                </div>

                                {/* Selector de orientación */}
                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-gray-700">Orientación:</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setOrientacion('landscape')}
                                            className={`p-2 rounded-lg border text-xs font-medium transition-all flex flex-col items-center gap-1 ${orientacion === 'landscape'
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                                                }`}
                                        >
                                            <div className="w-8 h-5 border-2 border-current rounded-sm"></div>
                                            Horizontal
                                        </button>
                                        <button
                                            onClick={() => setOrientacion('portrait')}
                                            className={`p-2 rounded-lg border text-xs font-medium transition-all flex flex-col items-center gap-1 ${orientacion === 'portrait'
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                                                }`}
                                        >
                                            <div className="w-5 h-8 border-2 border-current rounded-sm"></div>
                                            Vertical
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Columnas Personalizadas */}
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Plus className="h-4 w-4 text-amber-600" />
                                    Columnas Personalizadas
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">Agrega columnas vacías para escribir manualmente (ej: Check, Precio Nuevo, Notas)</p>

                                {/* Input para nueva columna */}
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={nuevaColumna}
                                        onChange={(e) => setNuevaColumna(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && agregarColumnaPersonalizada()}
                                        placeholder="Nombre de columna..."
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                    <button
                                        onClick={agregarColumnaPersonalizada}
                                        disabled={!nuevaColumna.trim()}
                                        className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Lista de columnas personalizadas */}
                                {columnasPersonalizadas.length > 0 ? (
                                    <div className="space-y-2">
                                        {columnasPersonalizadas.map((col, idx) => (
                                            <div
                                                key={idx}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, idx)}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDrop={(e) => handleDrop(e, idx)}
                                                onDragEnd={handleDragEnd}
                                                className={`flex items-center justify-between bg-white px-3 py-2 rounded-lg border transition-all cursor-move ${draggedItem === idx
                                                        ? 'opacity-50 border-amber-400 bg-amber-100'
                                                        : dragOverIndex === idx
                                                            ? 'border-amber-500 border-2 bg-amber-50'
                                                            : 'border-amber-200 hover:border-amber-400'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                                    <span className="text-sm text-gray-700">{col}</span>
                                                </div>
                                                <button
                                                    onClick={() => eliminarColumnaPersonalizada(col)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <p className="text-[10px] text-gray-400 text-center mt-2">Arrastra para reordenar</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-3 text-gray-400 text-xs">
                                        Sin columnas personalizadas
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Panel de Vista Previa */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
                                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-indigo-600" />
                                        Vista Previa
                                    </h3>
                                    <span className="text-xs text-gray-500">
                                        {inventarioFiltrado.length} items • {camposActivos} columnas
                                    </span>
                                </div>

                                <div className="flex-1 overflow-auto p-4" style={{ maxHeight: '400px' }}>
                                    <div ref={printRef}>
                                        <h1 style={{ marginBottom: '5px' }}>📦 Listado de Inventario - ElectroCaja</h1>
                                        <div className="info" style={{ fontSize: '10px', color: '#666', marginBottom: '10px' }}>
                                            Fecha: {new Date().toLocaleDateString('es-VE')} |
                                            Total: {inventarioFiltrado.length} productos |
                                            Filtros: {filtroTipo !== 'todos' ? filtroTipo : 'Todos'}
                                            {filtroUbicacion !== 'todos' ? ` • ${filtroUbicacion}` : ''}
                                            {filtroProveedor !== 'todos' ? ` • ${filtroProveedor}` : ''}
                                            {filtroCategoria !== 'todos' ? ` • ${filtroCategoria}` : ''}
                                        </div>

                                        {inventarioFiltrado.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                No hay productos que coincidan con los filtros
                                            </div>
                                        ) : (
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        {camposSeleccionados.id && <th className="px-2 py-2 text-left font-semibold">ID</th>}
                                                        {camposSeleccionados.imagen && <th className="px-2 py-2 text-center font-semibold">Img</th>}
                                                        {camposSeleccionados.descripcion && <th className="px-2 py-2 text-left font-semibold">Descripción</th>}
                                                        {camposSeleccionados.codigo_barras && <th className="px-2 py-2 text-left font-semibold">Cód. Barras</th>}
                                                        {camposSeleccionados.codigo_interno && <th className="px-2 py-2 text-left font-semibold">Cód. Interno</th>}
                                                        {camposSeleccionados.tipo && <th className="px-2 py-2 text-left font-semibold">Tipo</th>}
                                                        {camposSeleccionados.precio && <th className="px-2 py-2 text-right font-semibold">Precio</th>}
                                                        {camposSeleccionados.precio_costo && <th className="px-2 py-2 text-right font-semibold">Costo</th>}
                                                        {camposSeleccionados.stock && <th className="px-2 py-2 text-center font-semibold">Stock</th>}
                                                        {camposSeleccionados.stock_minimo && <th className="px-2 py-2 text-center font-semibold">Mín</th>}
                                                        {camposSeleccionados.ubicacion && <th className="px-2 py-2 text-left font-semibold">Ubicación</th>}
                                                        {camposSeleccionados.proveedor && <th className="px-2 py-2 text-left font-semibold">Proveedor</th>}
                                                        {camposSeleccionados.categoria && <th className="px-2 py-2 text-left font-semibold">Categoría</th>}
                                                        {camposSeleccionados.observaciones && <th className="px-2 py-2 text-left font-semibold">Obs.</th>}
                                                        {/* Columnas personalizadas headers */}
                                                        {columnasPersonalizadas.map((col, idx) => (
                                                            <th key={`custom-h-${idx}`} className="px-2 py-2 text-center font-semibold bg-amber-50">{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inventarioFiltrado.map((item, index) => (
                                                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            {camposSeleccionados.id && <td className="px-2 py-1.5 font-mono text-gray-500">#{item.id}</td>}
                                                            {camposSeleccionados.imagen && (
                                                                <td className="px-2 py-1.5 text-center">
                                                                    {item.imagen_url ? (
                                                                        <img
                                                                            src={getImageUrl(item.imagen_url)}
                                                                            alt=""
                                                                            className="w-8 h-8 object-cover rounded mx-auto"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                    ) : (
                                                                        <span className="text-gray-300">-</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            {camposSeleccionados.descripcion && <td className="px-2 py-1.5 font-medium text-gray-900">{item.descripcion}</td>}
                                                            {camposSeleccionados.codigo_barras && <td className="px-2 py-1.5 font-mono text-gray-600">{item.codigo_barras || '-'}</td>}
                                                            {camposSeleccionados.codigo_interno && <td className="px-2 py-1.5 font-mono text-gray-600">{item.codigo_interno || '-'}</td>}
                                                            {camposSeleccionados.tipo && (
                                                                <td className={`px-2 py-1.5 ${item.tipo === 'producto' ? 'text-blue-600' :
                                                                    item.tipo === 'servicio' ? 'text-green-600' : 'text-orange-600'
                                                                    }`}>
                                                                    {item.tipo === 'producto' ? '🛒' : item.tipo === 'servicio' ? '🔧' : '☕'} {item.tipo}
                                                                </td>
                                                            )}
                                                            {camposSeleccionados.precio && <td className="px-2 py-1.5 text-right font-mono font-semibold">${item.precio?.toFixed(2)}</td>}
                                                            {camposSeleccionados.precio_costo && <td className="px-2 py-1.5 text-right font-mono text-gray-500">${parseFloat(item.precio_costo || 0).toFixed(2)}</td>}
                                                            {camposSeleccionados.stock && (
                                                                <td className={`px-2 py-1.5 text-center font-semibold ${item.tipo === 'servicio' ? 'text-gray-400' :
                                                                    item.stock === 0 ? 'text-red-600' :
                                                                        (item.stock_minimo && item.stock <= item.stock_minimo) ? 'text-orange-600' : 'text-green-600'
                                                                    }`}>
                                                                    {item.tipo === 'servicio' ? 'N/A' : item.stock}
                                                                </td>
                                                            )}
                                                            {camposSeleccionados.stock_minimo && <td className="px-2 py-1.5 text-center text-gray-500">{item.stock_minimo || '-'}</td>}
                                                            {camposSeleccionados.ubicacion && <td className="px-2 py-1.5 text-gray-700">{item.ubicacion_fisica || '-'}</td>}
                                                            {camposSeleccionados.proveedor && <td className="px-2 py-1.5 text-gray-700">{item.proveedor || '-'}</td>}
                                                            {camposSeleccionados.categoria && <td className="px-2 py-1.5 text-gray-700">{item.categoria || '-'}</td>}
                                                            {camposSeleccionados.observaciones && <td className="px-2 py-1.5 text-gray-500 text-xs">{item.observaciones?.substring(0, 30) || '-'}</td>}
                                                            {/* Columnas personalizadas celdas vacías */}
                                                            {columnasPersonalizadas.map((col, idx) => (
                                                                <td key={`custom-c-${idx}`} className="px-2 py-1.5 text-center bg-amber-50/30 border-l border-amber-200">
                                                                    <div className="h-4 border-b border-dashed border-gray-300"></div>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Vista previa: {inventarioFiltrado.length} productos con {camposActivos} columnas
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={inventarioFiltrado.length === 0}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir ({inventarioFiltrado.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintInventarioModal;
