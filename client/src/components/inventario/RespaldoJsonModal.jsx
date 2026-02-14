// components/inventario/RespaldoJsonModal.jsx
import React, { useState, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Download from 'lucide-react/dist/esm/icons/download'
import Upload from 'lucide-react/dist/esm/icons/upload'
import FileJson from 'lucide-react/dist/esm/icons/file-json'
import Check from 'lucide-react/dist/esm/icons/check'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Package from 'lucide-react/dist/esm/icons/package'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Tag from 'lucide-react/dist/esm/icons/tag'
import Boxes from 'lucide-react/dist/esm/icons/boxes'
import Store from 'lucide-react/dist/esm/icons/store'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import FileUp from 'lucide-react/dist/esm/icons/file-up'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import Database from 'lucide-react/dist/esm/icons/database'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Eye from 'lucide-react/dist/esm/icons/eye'
import { useInventarioStore } from '../../store/inventarioStore';
import toast from '../../utils/toast.jsx';

const RespaldoJsonModal = ({ isOpen, onClose }) => {
    const { inventario, agregarItem, actualizarItem } = useInventarioStore();
    const fileInputRef = useRef(null);

    // Tab activo
    const [activeTab, setActiveTab] = useState('exportar');

    // ========== ESTADOS EXPORTACIÓN ==========
    const camposDisponibles = [
        { key: 'id', label: 'ID', icon: Package, default: true },
        { key: 'descripcion', label: 'Descripción', icon: Tag, default: true },
        { key: 'tipo', label: 'Tipo', icon: Tag, default: true },
        { key: 'codigo_barras', label: 'Código de Barras', icon: Tag, default: true },
        { key: 'codigo_interno', label: 'Código Interno', icon: Tag, default: false },
        { key: 'categoria', label: 'Categoría', icon: Tag, default: true },
        { key: 'precio', label: 'Precio Venta', icon: DollarSign, default: true },
        { key: 'precio_costo', label: 'Precio Costo', icon: DollarSign, default: true },
        { key: 'porcentaje_ganancia', label: '% Ganancia', icon: DollarSign, default: false },
        { key: 'stock', label: 'Stock', icon: Boxes, default: true },
        { key: 'stock_minimo', label: 'Stock Mínimo', icon: Boxes, default: false },
        { key: 'proveedor', label: 'Proveedor', icon: Store, default: true },
        { key: 'telefono_proveedor', label: 'Teléfono Proveedor', icon: Store, default: false },
        { key: 'proveedor_factura_iva', label: 'Factura IVA', icon: Store, default: false },
        { key: 'ubicacion_fisica', label: 'Ubicación Física', icon: Store, default: false },
        { key: 'activo', label: 'Activo', icon: Check, default: true },
        { key: 'observaciones', label: 'Observaciones', icon: Tag, default: false },
        { key: 'imagen_url', label: 'URL Imagen', icon: Tag, default: false },
        { key: 'createdAt', label: 'Fecha Creación', icon: Calendar, default: false },
        { key: 'updatedAt', label: 'Fecha Actualización', icon: Calendar, default: false },
    ];

    const [camposSeleccionados, setCamposSeleccionados] = useState(
        camposDisponibles.filter(c => c.default).map(c => c.key)
    );
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [soloActivos, setSoloActivos] = useState(true);

    // ========== ESTADOS IMPORTACIÓN INTELIGENTE ==========
    const [archivoImportado, setArchivoImportado] = useState(null);
    const [jsonCompleto, setJsonCompleto] = useState(null);
    const [estructuraDetectada, setEstructuraDetectada] = useState(null); // 'array' | 'object' | 'electrocaja'
    const [tablasDisponibles, setTablasDisponibles] = useState([]); // [{key, label, count, sample}]
    const [tablaSeleccionada, setTablaSeleccionada] = useState(null);
    const [datosAImportar, setDatosAImportar] = useState(null);
    const [modoImportacion, setModoImportacion] = useState('agregar');
    const [importando, setImportando] = useState(false);
    const [preview, setPreview] = useState([]);
    const [paso, setPaso] = useState(1); // 1: Cargar, 2: Seleccionar tabla, 3: Confirmar

    // ========== FUNCIONES EXPORTACIÓN ==========
    const toggleCampo = (key) => {
        setCamposSeleccionados(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const seleccionarTodos = () => setCamposSeleccionados(camposDisponibles.map(c => c.key));
    const deseleccionarTodos = () => setCamposSeleccionados(['id', 'descripcion']);

    const generarExportacion = () => {
        if (camposSeleccionados.length === 0) {
            toast.error('Selecciona al menos un campo');
            return;
        }

        let datos = inventario.filter(item => {
            if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
            if (soloActivos && item.activo === false) return false;
            return true;
        });

        const datosExportados = datos.map(item => {
            const obj = {};
            camposSeleccionados.forEach(campo => {
                if (item[campo] !== undefined) obj[campo] = item[campo];
            });
            return obj;
        });

        const exportacion = {
            metadata: {
                fechaExportacion: new Date().toISOString(),
                totalRegistros: datosExportados.length,
                camposIncluidos: camposSeleccionados,
                filtros: { tipo: filtroTipo, soloActivos },
                version: '1.0',
                sistema: 'ElectroCaja'
            },
            datos: datosExportados
        };

        const blob = new Blob([JSON.stringify(exportacion, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_electrocaja_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Exportados ${datosExportados.length} productos`);
        onClose();
    };

    // ========== FUNCIONES IMPORTACIÓN INTELIGENTE ==========
    const analizarEstructuraJSON = (content) => {
        // Detectar tipo de estructura
        if (Array.isArray(content)) {
            // Es un array directo
            return { tipo: 'array', datos: content, tablas: [] };
        }

        if (content.datos && Array.isArray(content.datos)) {
            // Formato ElectroCaja exportado
            return { tipo: 'electrocaja', datos: content.datos, tablas: [], metadata: content.metadata };
        }

        // Es un objeto con múltiples tablas/colecciones
        const tablas = [];
        for (const [key, value] of Object.entries(content)) {
            if (Array.isArray(value) && value.length > 0) {
                const sample = value[0];
                const esProducto = sample.descripcion || sample.nombre || sample.codigo_barras || sample.precio !== undefined;
                tablas.push({
                    key,
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    count: value.length,
                    sample,
                    esProducto,
                    campos: Object.keys(sample)
                });
            }
        }

        return { tipo: 'object', datos: null, tablas };
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            toast.error('El archivo debe ser .json');
            return;
        }

        setArchivoImportado(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = JSON.parse(event.target.result);
                setJsonCompleto(content);

                const analisis = analizarEstructuraJSON(content);
                setEstructuraDetectada(analisis.tipo);

                if (analisis.tipo === 'array') {
                    // Array directo - ir a confirmar
                    setDatosAImportar(analisis.datos);
                    setPreview(analisis.datos.slice(0, 5));
                    setPaso(3);
                    toast.success(`${analisis.datos.length} registros encontrados`);
                } else if (analisis.tipo === 'electrocaja') {
                    // Formato propio - ir a confirmar
                    setDatosAImportar(analisis.datos);
                    setPreview(analisis.datos.slice(0, 5));
                    setPaso(3);
                    toast.success(`${analisis.datos.length} productos encontrados (formato ElectroCaja)`);
                } else {
                    // Objeto con múltiples tablas - mostrar selector
                    setTablasDisponibles(analisis.tablas);
                    setPaso(2);
                    toast.info(`${analisis.tablas.length} tablas encontradas en el archivo`);
                }
            } catch (error) {
                toast.error('Error al leer el archivo JSON');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };

    const seleccionarTabla = (tabla) => {
        setTablaSeleccionada(tabla);
        const datos = jsonCompleto[tabla.key];
        setDatosAImportar(datos);
        setPreview(datos.slice(0, 5));
        setPaso(3);
    };

    const ejecutarImportacion = async () => {
        if (!datosAImportar || datosAImportar.length === 0) {
            toast.error('No hay datos para importar');
            return;
        }

        setImportando(true);
        let exitosos = 0;
        let fallidos = 0;
        const errores = [];

        try {
            for (const item of datosAImportar) {
                try {
                    // Normalizar campos - usar camelCase como espera el store
                    const producto = {
                        descripcion: item.descripcion || item.nombre || item.name || item.title || 'Sin descripción',
                        tipo: (item.tipo || item.type || 'producto').toUpperCase(),
                        categoria: item.categoria || item.category || 'General',
                        // Campos en camelCase para el store
                        precioVenta: parseFloat(item.precio || item.precioVenta || item.precio_venta || item.price || 0),
                        precioCosto: parseFloat(item.precio_costo || item.precioCosto || item.costo || item.cost || 0),
                        stock: parseInt(item.stock || item.cantidad || item.quantity || 0),
                        stockMinimo: parseInt(item.stock_minimo || item.stockMinimo || item.min_stock || 5),
                        stockMaximo: parseInt(item.stock_maximo || item.stockMaximo || 100),
                        codigoBarras: item.codigo_barras || item.codigoBarras || item.barcode || item.sku || '',
                        codigoInterno: item.codigo_interno || item.codigoInterno || item.internal_code || '',
                        proveedor: item.proveedor || item.supplier || item.vendor || 'SIN PROVEEDOR',
                        telefonoProveedor: item.telefono_proveedor || item.telefonoProveedor || item.supplier_phone || '',
                        ubicacionFisica: item.ubicacion_fisica || item.ubicacionFisica || item.location || '',
                        observaciones: item.observaciones || item.notes || '',
                        margenPorcentaje: parseFloat(item.porcentaje_ganancia || item.margenPorcentaje || item.margen_porcentaje || 30),
                        imagenUrl: item.imagen_url || item.imagenUrl || ''
                    };

                    // Calcular margen si no viene y hay costo
                    if (producto.precioCosto > 0 && producto.precioVenta > 0) {
                        producto.margenPorcentaje = parseFloat(((producto.precioVenta - producto.precioCosto) / producto.precioCosto * 100).toFixed(2));
                    }

                    if (modoImportacion === 'actualizar' && item.id) {
                        await actualizarItem(item.id, producto);
                    } else {
                        await agregarItem(producto);
                    }
                    exitosos++;
                } catch (err) {
                    const errorMsg = err.response?.data?.message || err.message || 'Error desconocido';
                    const esDuplicado = errorMsg.toLowerCase().includes('duplicado') || errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('ya existe');
                    errores.push({
                        nombre: item.descripcion || item.nombre || 'Item',
                        error: errorMsg,
                        duplicado: esDuplicado
                    });
                    console.error('Error importando:', item.descripcion, errorMsg);
                    fallidos++;
                }
            }

            const duplicados = errores.filter(e => e.duplicado).length;
            const otrosErrores = fallidos - duplicados;

            if (exitosos > 0) {
                let msg = `✅ ${exitosos} productos importados`;
                if (duplicados > 0) msg += ` | ⚠️ ${duplicados} duplicados omitidos`;
                if (otrosErrores > 0) msg += ` | ❌ ${otrosErrores} errores`;
                toast.success(msg);
            } else if (duplicados === fallidos) {
                toast.warning(`Todos los ${duplicados} productos ya existían en el inventario`);
            } else {
                toast.error('No se pudo importar ningún producto');
            }

            // Mostrar errores en consola para debug
            if (errores.length > 0) {
                console.log('📋 Resumen de importación:', { exitosos, duplicados, otrosErrores, errores });
            }

            limpiarImportacion();
            if (exitosos > 0) onClose();
        } catch (error) {
            toast.error('Error durante la importación');
            console.error(error);
        } finally {
            setImportando(false);
        }
    };

    const limpiarImportacion = () => {
        setArchivoImportado(null);
        setJsonCompleto(null);
        setEstructuraDetectada(null);
        setTablasDisponibles([]);
        setTablaSeleccionada(null);
        setDatosAImportar(null);
        setPreview([]);
        setPaso(1);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    const itemsFiltrados = inventario.filter(item => {
        if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
        if (soloActivos && item.activo === false) return false;
        return true;
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <FileJson className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Respaldo JSON</h2>
                                <p className="text-sm text-emerald-100">Exporta o importa tu inventario</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => { setActiveTab('exportar'); limpiarImportacion(); }}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'exportar'
                            ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Download className="h-4 w-4" />
                        Exportar
                    </button>
                    <button
                        onClick={() => setActiveTab('importar')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'importar'
                            ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Upload className="h-4 w-4" />
                        Importar
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* ========== TAB EXPORTAR ========== */}
                    {activeTab === 'exportar' && (
                        <>
                            {/* Filtros */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-gray-500" />
                                    Filtros de Exportación
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de producto</label>
                                        <select
                                            value={filtroTipo}
                                            onChange={(e) => setFiltroTipo(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="todos">Todos los tipos</option>
                                            <option value="producto">Solo Productos</option>
                                            <option value="servicio">Solo Servicios</option>
                                            <option value="electrobar">Solo Electrobar</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                                            <span className="text-sm font-medium text-gray-700">Solo productos activos</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
                                    <Boxes className="h-4 w-4" />
                                    Se exportarán <span className="font-bold text-emerald-600 mx-1">{itemsFiltrados.length}</span> de {inventario.length} productos
                                </div>
                            </div>

                            {/* Campos */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-gray-500" />
                                        Campos a incluir
                                    </h3>
                                    <div className="flex gap-2">
                                        <button onClick={seleccionarTodos} className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">Todos</button>
                                        <button onClick={deseleccionarTodos} className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Mínimos</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {camposDisponibles.map(campo => {
                                        const isSelected = camposSeleccionados.includes(campo.key);
                                        return (
                                            <button key={campo.key} onClick={() => toggleCampo(campo.key)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${isSelected ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {isSelected ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 border-2 border-gray-300 rounded" />}
                                                <span className="truncate">{campo.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ========== TAB IMPORTAR ========== */}
                    {activeTab === 'importar' && (
                        <>
                            {/* Indicador de pasos */}
                            <div className="flex items-center justify-center gap-2 mb-4">
                                {[1, 2, 3].map(n => (
                                    <React.Fragment key={n}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${paso >= n ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            {n}
                                        </div>
                                        {n < 3 && <div className={`w-12 h-1 rounded ${paso > n ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* PASO 1: Cargar archivo */}
                            {paso === 1 && (
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
                                    <FileUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <p className="text-lg font-medium text-gray-700">Haz clic o arrastra un archivo JSON</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Soporta: Arrays, objetos con tablas, formato ElectroCaja
                                    </p>
                                </div>
                            )}

                            {/* PASO 2: Seleccionar tabla */}
                            {paso === 2 && tablasDisponibles.length > 0 && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center gap-2 text-blue-800">
                                            <Database className="h-5 w-5" />
                                            <span className="font-medium">Se detectaron {tablasDisponibles.length} tablas en el archivo</span>
                                        </div>
                                        <p className="text-sm text-blue-600 mt-1">Selecciona la tabla que contiene los productos a importar:</p>
                                    </div>

                                    <div className="space-y-2">
                                        {tablasDisponibles.map(tabla => (
                                            <button
                                                key={tabla.key}
                                                onClick={() => seleccionarTabla(tabla)}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-blue-400 hover:bg-blue-50 ${tabla.esProducto ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${tabla.esProducto ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                            <Package className={`h-5 w-5 ${tabla.esProducto ? 'text-blue-600' : 'text-gray-500'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{tabla.label}</p>
                                                            <p className="text-sm text-gray-500">{tabla.count} registros • {tabla.campos.length} campos</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {tabla.esProducto && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Probable productos</span>}
                                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-400 truncate">
                                                    Campos: {tabla.campos.slice(0, 5).join(', ')}{tabla.campos.length > 5 ? '...' : ''}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <button onClick={limpiarImportacion} className="text-sm text-gray-500 hover:text-gray-700">
                                        ← Cargar otro archivo
                                    </button>
                                </div>
                            )}

                            {/* PASO 3: Confirmar importación */}
                            {paso === 3 && datosAImportar && (
                                <>
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-100 p-2 rounded-lg">
                                                    <Package className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-green-900">{datosAImportar.length} registros listos</p>
                                                    <p className="text-sm text-green-700">
                                                        {tablaSeleccionada ? `Tabla: ${tablaSeleccionada.label}` : archivoImportado?.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={limpiarImportacion} className="text-sm text-green-600 hover:text-green-800">Cambiar</button>
                                        </div>
                                    </div>

                                    {/* Modo */}
                                    <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="font-medium text-yellow-900 mb-2">Modo de importación</p>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" name="modo" value="agregar" checked={modoImportacion === 'agregar'} onChange={() => setModoImportacion('agregar')} className="text-blue-600" />
                                                        <span className="text-sm"><strong>Agregar:</strong> Crear nuevos productos</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" name="modo" value="actualizar" checked={modoImportacion === 'actualizar'} onChange={() => setModoImportacion('actualizar')} className="text-blue-600" />
                                                        <span className="text-sm"><strong>Actualizar:</strong> Actualizar por ID existente</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <Eye className="h-4 w-4" /> Vista previa
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-gray-600">Nombre/Descripción</th>
                                                        <th className="px-3 py-2 text-left text-gray-600">Tipo</th>
                                                        <th className="px-3 py-2 text-right text-gray-600">Precio</th>
                                                        <th className="px-3 py-2 text-right text-gray-600">Stock</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {preview.map((item, idx) => (
                                                        <tr key={idx} className="border-t border-gray-200">
                                                            <td className="px-3 py-2 text-gray-900 truncate max-w-[200px]">
                                                                {item.descripcion || item.nombre || item.name || 'Sin nombre'}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-600">{item.tipo || item.type || '-'}</td>
                                                            <td className="px-3 py-2 text-right text-gray-900">${item.precio || item.price || 0}</td>
                                                            <td className="px-3 py-2 text-right text-gray-600">{item.stock || item.cantidad || 0}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {datosAImportar.length > 5 && (
                                                <div className="text-center text-xs text-gray-500 py-2 bg-gray-100">
                                                    ... y {datosAImportar.length - 5} registros más
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancelar
                    </button>

                    {activeTab === 'exportar' && (
                        <button onClick={generarExportacion} disabled={camposSeleccionados.length === 0 || itemsFiltrados.length === 0}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="h-4 w-4" />
                            Descargar JSON
                        </button>
                    )}

                    {activeTab === 'importar' && paso === 3 && (
                        <button onClick={ejecutarImportacion} disabled={!datosAImportar || datosAImportar.length === 0 || importando}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {importando ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Importando...</>
                            ) : (
                                <><Upload className="h-4 w-4" />Importar {datosAImportar?.length || 0} productos</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RespaldoJsonModal;
