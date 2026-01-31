// components/inventario/DisplayControlModal.jsx
// 📺 Modal de control para configurar el display de publicidad
import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Monitor, Settings, Play, Pause, Eye, EyeOff, RefreshCw,
    Clock, Filter, Package, Smartphone, Tv, Tablet, Wifi, WifiOff,
    ChevronDown, Check, Save, RotateCcw, Globe, Trash2, AlertCircle
} from 'lucide-react';
import { API_CONFIG, api } from '../../config/api';
import toast from '../../utils/toast.jsx';
import { useAuthStore } from '../../store/authStore';

const DisplayControlModal = ({ isOpen, onClose }) => {
    const { socket } = useAuthStore();

    // Estados
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        activo: true,
        tiempoRotacion: 10,
        soloDestacados: true,
        soloConStock: true,
        tipos: ['PRODUCTO', 'ELECTROBAR'],
        categorias: [],
        showDescription: true,
        showStock: true,
        showCode: true,
        titulo: 'electroshopve.com',
        subtitulo: 'VISTA CLIENTE'
    });
    const [displayClients, setDisplayClients] = useState([]);
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [activeTab, setActiveTab] = useState('general');

    // Tipos disponibles
    const tiposDisponibles = [
        { value: 'PRODUCTO', label: 'Productos' },
        { value: 'ELECTROBAR', label: 'Electrobar' },
        { value: 'SERVICIO', label: 'Servicios' }
    ];

    // Tiempos de rotación disponibles
    const tiemposRotacion = [
        { value: 5, label: '5 seg' },
        { value: 10, label: '10 seg' },
        { value: 15, label: '15 seg' },
        { value: 20, label: '20 seg' },
        { value: 30, label: '30 seg' },
        { value: 60, label: '1 min' }
    ];

    // Cargar configuración inicial
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Obtener configuración
            const configRes = await api.get('/display/config'); // Usa axios con token
            if (configRes.data.success && configRes.data.data) {
                setConfig(prev => ({ ...prev, ...configRes.data.data }));
            }

            // Obtener productos para preview (Endpoint público o protegido, axios manejará auth si es necesaria)
            const prodRes = await api.get('/display/productos?pageSize=10');
            if (prodRes.data.success) {
                setProductos(prodRes.data.data || []);
            }

            // Obtener clientes conectados
            const clientsRes = await api.get('/display/clients');
            if (clientsRes.data.success) {
                setDisplayClients(clientsRes.data.data || []);
            }

            // Obtener categorías únicas del inventario (Definitivamente requiere Auth)
            const invRes = await api.get('/inventory/products?pageSize=1000');
            if (invRes.data.success) {
                const invData = invRes.data;
                const cats = [...new Set((invData.data || [])
                    .map(p => p.categoria)
                    .filter(c => c && c.trim() !== '')
                )].sort();
                setCategorias(cats);
            }

        } catch (error) {
            console.error('Error cargando datos de display:', error);
            toast.error('Error cargando configuración');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    // Escuchar actualizaciones de clientes via Socket.IO
    useEffect(() => {
        if (!socket || !isOpen) return;

        const handleClientsUpdate = (clients) => {
            console.log('📺 Clientes display actualizados:', clients);
            setDisplayClients(clients || []);
        };

        socket.on('display:clients_updated', handleClientsUpdate);

        return () => {
            socket.off('display:clients_updated', handleClientsUpdate);
        };
    }, [socket, isOpen]);

    // Guardar configuración
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put('/display/config', config);

            if (res.data.success) {
                toast.success('Configuración guardada');
                // Las pantallas se actualizarán automáticamente via WebSocket
            } else {
                throw new Error('Error guardando');
            }
        } catch (error) {
            console.error('Error guardando config:', error);
            toast.error('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    // Toggle tipo
    const toggleTipo = (tipo) => {
        setConfig(prev => ({
            ...prev,
            tipos: prev.tipos.includes(tipo)
                ? prev.tipos.filter(t => t !== tipo)
                : [...prev.tipos, tipo]
        }));
    };

    // Toggle categoría
    const toggleCategoria = (cat) => {
        setConfig(prev => ({
            ...prev,
            categorias: prev.categorias.includes(cat)
                ? prev.categorias.filter(c => c !== cat)
                : [...prev.categorias, cat]
        }));
    };

    // Obtener icono de dispositivo
    const getDeviceIcon = (userAgent) => {
        if (!userAgent) return <Monitor className="w-5 h-5" />;
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return <Smartphone className="w-5 h-5" />;
        }
        if (ua.includes('ipad') || ua.includes('tablet')) {
            return <Tablet className="w-5 h-5" />;
        }
        if (ua.includes('smart-tv') || ua.includes('webos') || ua.includes('tizen')) {
            return <Tv className="w-5 h-5" />;
        }
        return <Monitor className="w-5 h-5" />;
    };

    // Formatear tiempo conectado
    const formatConnectedTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        const connected = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - connected) / 1000 / 60);
        if (diff < 1) return 'Ahora';
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    // URL del display
    const displayUrl = `${window.location.origin}/display`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-xl">
                                <Tv className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Control de Display</h2>
                                <p className="text-purple-200 text-sm">Configurar publicidad en TV/pantallas</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        {[
                            { key: 'general', label: 'General', icon: Settings },
                            { key: 'filtros', label: 'Filtros', icon: Filter },
                            { key: 'pantallas', label: 'Pantallas', icon: Monitor },
                            { key: 'preview', label: 'Vista previa', icon: Eye }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? 'bg-white text-purple-600'
                                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Tab: General */}
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    {/* Estado del display */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Estado del Display</h3>
                                                <p className="text-sm text-gray-500">Activa o desactiva la publicidad</p>
                                            </div>
                                            <button
                                                onClick={() => setConfig(prev => ({ ...prev, activo: !prev.activo }))}
                                                className={`relative w-14 h-7 rounded-full transition-colors ${config.activo ? 'bg-green-500' : 'bg-gray-300'
                                                    }`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.activo ? 'translate-x-8' : 'translate-x-1'
                                                    }`} />
                                            </button>
                                        </div>

                                        {!config.activo && (
                                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-sm">El display mostrará "Desactivado" en las pantallas</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* URL del display */}
                                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Globe className="w-5 h-5 text-blue-600" />
                                            <h3 className="font-semibold text-gray-900">URL del Display</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-white px-4 py-2 rounded-lg border border-blue-200 text-sm font-mono text-blue-800">
                                                {displayUrl}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(displayUrl);
                                                    toast.success('URL copiada');
                                                }}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Copiar
                                            </button>
                                            <button
                                                onClick={() => window.open(displayUrl, '_blank')}
                                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                            >
                                                Abrir
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tiempo de rotación */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Clock className="w-5 h-5 text-gray-600" />
                                            <h3 className="font-semibold text-gray-900">Tiempo de Rotación</h3>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {tiemposRotacion.map(t => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => setConfig(prev => ({ ...prev, tiempoRotacion: t.value }))}
                                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${config.tiempoRotacion === t.value
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                                                        }`}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Opciones de visualización */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-4">Opciones de visualización</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { key: 'showDescription', label: 'Mostrar descripción' },
                                                { key: 'showStock', label: 'Mostrar stock' },
                                                { key: 'showCode', label: 'Mostrar código' },
                                                { key: 'soloDestacados', label: 'Solo destacados' },
                                                { key: 'soloConStock', label: 'Solo con stock' }
                                            ].map(opt => (
                                                <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                                                    <div
                                                        onClick={() => setConfig(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${config[opt.key] ? 'bg-purple-600' : 'bg-gray-200'
                                                            }`}
                                                    >
                                                        {config[opt.key] && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="text-gray-700">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Filtros */}
                            {activeTab === 'filtros' && (
                                <div className="space-y-6">
                                    {/* Tipos de productos */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-4">Tipos de productos</h3>
                                        <div className="flex gap-3 flex-wrap">
                                            {tiposDisponibles.map(tipo => (
                                                <button
                                                    key={tipo.value}
                                                    onClick={() => toggleTipo(tipo.value)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${config.tipos.includes(tipo.value)
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                                                        }`}
                                                >
                                                    {config.tipos.includes(tipo.value) && <Check className="w-4 h-4" />}
                                                    {tipo.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Categorías */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900">Categorías</h3>
                                            {config.categorias.length > 0 && (
                                                <button
                                                    onClick={() => setConfig(prev => ({ ...prev, categorias: [] }))}
                                                    className="text-sm text-red-600 hover:underline"
                                                >
                                                    Limpiar filtro
                                                </button>
                                            )}
                                        </div>
                                        {categorias.length === 0 ? (
                                            <p className="text-gray-500">No hay categorías definidas</p>
                                        ) : (
                                            <div className="flex gap-2 flex-wrap max-h-48 overflow-y-auto">
                                                {categorias.map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => toggleCategoria(cat)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${config.categorias.length === 0 || config.categorias.includes(cat)
                                                            ? config.categorias.includes(cat)
                                                                ? 'bg-purple-600 text-white'
                                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                                                            : 'bg-gray-100 text-gray-400'
                                                            }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            {config.categorias.length === 0
                                                ? 'Se mostrarán todas las categorías'
                                                : `${config.categorias.length} categoría(s) seleccionada(s)`
                                            }
                                        </p>
                                    </div>

                                    {/* Productos coincidentes */}
                                    <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package className="w-5 h-5 text-green-600" />
                                            <h3 className="font-semibold text-gray-900">Productos que se mostrarán</h3>
                                        </div>
                                        <div className="text-3xl font-bold text-green-600">
                                            {productos.length}
                                        </div>
                                        <p className="text-sm text-gray-500">productos coinciden con los filtros actuales</p>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Pantallas */}
                            {activeTab === 'pantallas' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">Pantallas Conectadas</h3>
                                        <button
                                            onClick={fetchData}
                                            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Actualizar
                                        </button>
                                    </div>

                                    {displayClients.length === 0 ? (
                                        <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                                            <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 text-lg font-medium">No hay pantallas conectadas</p>
                                            <p className="text-gray-400 text-sm mt-2">
                                                Abre {displayUrl} en cualquier dispositivo
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {displayClients.map((client, idx) => (
                                                <div
                                                    key={client.id || idx}
                                                    className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                                                            {getDeviceIcon(client.userAgent)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                                Pantalla #{idx + 1}
                                                                <span className="flex items-center gap-1 text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full">
                                                                    <Wifi className="w-3 h-3" />
                                                                    Conectada
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                IP: {client.ip} • Conectada hace {formatConnectedTime(client.connectedAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                        <h4 className="font-medium text-blue-900 mb-2">Consejo</h4>
                                        <p className="text-sm text-blue-700">
                                            Para pantallas de TV, usa el navegador en modo pantalla completa (F11)
                                            o abre la URL en modo kiosko.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Preview */}
                            {activeTab === 'preview' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-900 rounded-2xl p-4 aspect-video relative overflow-hidden shadow-2xl">
                                        {/* Mini preview del display */}
                                        <div className="h-full flex flex-col">
                                            {/* Mini header */}
                                            <div className="bg-[#0061F2] text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">SADES</div>
                                                    <span className="font-bold text-sm">{config.titulo}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {productos.slice(0, 5).map((_, i) => (
                                                        <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/30'}`} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Mini content */}
                                            <div className="flex-1 bg-gray-100 p-3 flex flex-col gap-2">
                                                {productos.length > 0 ? (
                                                    <>
                                                        {/* Producto */}
                                                        <div className="bg-white rounded-lg p-3 flex-1 flex flex-col items-center justify-center">
                                                            <div className="w-16 h-16 bg-gray-200 rounded-lg mb-2"></div>
                                                            <div className="font-bold text-sm text-center text-gray-800 line-clamp-1">
                                                                {productos[0]?.descripcion || 'Producto'}
                                                            </div>
                                                        </div>
                                                        {/* Precio */}
                                                        <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                                            <div className="text-emerald-600 font-black text-2xl">
                                                                {(productos[0]?.precioVenta * 40).toFixed(2)}
                                                            </div>
                                                            <div className="text-emerald-700 text-xs font-bold">Bolívares</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center text-gray-400">
                                                        Sin productos
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mini footer */}
                                            <div className="bg-gray-200 px-4 py-2 rounded-b-lg flex items-center justify-between text-xs text-gray-600">
                                                <span>Electro Caja</span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                    En línea
                                                </span>
                                            </div>
                                        </div>

                                        {/* Play indicator */}
                                        {config.activo && (
                                            <div className="absolute bottom-6 right-6 bg-white/90 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                                                <Play className="w-4 h-4 text-green-600" fill="currentColor" />
                                                <span className="text-sm font-medium text-gray-700">Rotando cada {config.tiempoRotacion}s</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => window.open(displayUrl, '_blank')}
                                        className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-5 h-5" />
                                        Ver display en pantalla completa
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <Monitor className="w-4 h-4" />
                            {displayClients.length} pantalla(s)
                        </span>
                        <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {productos.length} producto(s)
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DisplayControlModal;
