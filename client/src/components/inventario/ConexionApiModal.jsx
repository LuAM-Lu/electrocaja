// components/inventario/ConexionApiModal.jsx
// Modal para configurar sincronización de inventario con electroshopve.com
import React, { useState, useEffect } from 'react';
import { X, Globe, Wifi, WifiOff, Settings, Link2, Shield, Clock, CheckCircle, AlertTriangle, RefreshCw, ExternalLink, Package, DollarSign, Boxes, Image, Tag, Eye, EyeOff, Server, Database, ArrowRight, Check, Wrench, Coffee } from 'lucide-react';
import toast from '../../utils/toast.jsx';

const ConexionApiModal = ({ isOpen, onClose }) => {
    // Cargar configuración guardada
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('electrocaja_api_config');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return getDefaultConfig();
            }
        }
        return getDefaultConfig();
    });

    function getDefaultConfig() {
        return {
            apiUrl: 'https://electroshopve.com/api',
            apiKey: '',
            webhookSecret: '',
            syncInterval: '60',
            autoSync: false,
            // Eventos a sincronizar (qué se envía a la web)
            syncEvents: {
                productoCreado: true,
                productoActualizado: true,
                productoEliminado: true,
                stockModificado: true,
                precioModificado: true,
                imagenActualizada: false,
            },
            // Campos a sincronizar
            syncFields: {
                descripcion: true,
                precio: true,
                stock: true,
                categoria: true,
                imagenUrl: true,
                codigoBarras: true,
                codigoInterno: true,
                activo: true,
            },
            // Filtros de sincronización
            syncFilters: {
                soloActivos: true,
                tipoProducto: true,
                tipoServicio: false,
                tipoElectrobar: false,
            }
        };
    }

    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected' | 'testing' | 'connected' | 'error'
    const [lastSync, setLastSync] = useState(null);
    const [showApiKey, setShowApiKey] = useState(false);

    const testConnection = async () => {
        if (!config.apiUrl) {
            toast.error('Ingresa la URL de la API');
            return;
        }

        setConnectionStatus('testing');

        // Simular test de conexión (en futuro será real)
        setTimeout(() => {
            toast.info('🚧 Funcionalidad en desarrollo - Próximamente');
            setConnectionStatus('disconnected');
        }, 2000);
    };

    const saveConfig = () => {
        localStorage.setItem('electrocaja_api_config', JSON.stringify(config));
        toast.success('✅ Configuración guardada');
    };

    const toggleEvent = (event) => {
        setConfig(prev => ({
            ...prev,
            syncEvents: {
                ...prev.syncEvents,
                [event]: !prev.syncEvents[event]
            }
        }));
    };

    const toggleField = (field) => {
        setConfig(prev => ({
            ...prev,
            syncFields: {
                ...prev.syncFields,
                [field]: !prev.syncFields[field]
            }
        }));
    };

    const toggleFilter = (filter) => {
        setConfig(prev => ({
            ...prev,
            syncFilters: {
                ...prev.syncFilters,
                [filter]: !prev.syncFilters[filter]
            }
        }));
    };

    if (!isOpen) return null;

    const eventosConfig = [
        { key: 'productoCreado', label: 'Producto Creado', icon: Package, description: 'Cuando se agrega un nuevo producto' },
        { key: 'productoActualizado', label: 'Producto Actualizado', icon: RefreshCw, description: 'Cambios en información del producto' },
        { key: 'productoEliminado', label: 'Producto Eliminado', icon: X, description: 'Cuando se desactiva/elimina un producto' },
        { key: 'stockModificado', label: 'Stock Modificado', icon: Boxes, description: 'Cambios en cantidades disponibles' },
        { key: 'precioModificado', label: 'Precio Modificado', icon: DollarSign, description: 'Cambios en precios de venta/costo' },
        { key: 'imagenActualizada', label: 'Imagen Actualizada', icon: Image, description: 'Cuando se cambia la imagen del producto' },
    ];

    const camposConfig = [
        { key: 'descripcion', label: 'Descripción', essential: true },
        { key: 'precio', label: 'Precio de Venta', essential: true },
        { key: 'stock', label: 'Stock Disponible', essential: true },
        { key: 'categoria', label: 'Categoría', essential: false },
        { key: 'imagenUrl', label: 'URL de Imagen', essential: false },
        { key: 'codigoBarras', label: 'Código de Barras', essential: false },
        { key: 'codigoInterno', label: 'Código Interno', essential: false },
        { key: 'activo', label: 'Estado Activo', essential: true },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Globe className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Conexión API - electroshopve.com</h2>
                                <p className="text-sm text-purple-200">Sincroniza tu inventario con la tienda online</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Banner de desarrollo */}
                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Módulo en Desarrollo
                                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">Próximamente</span>
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Este módulo permitirá que <strong>electroshopve.com</strong> consuma automáticamente cualquier modificación del inventario de ElectroCaja.
                                Configura ahora los parámetros para estar listo cuando esté disponible.
                            </p>
                        </div>
                    </div>

                    {/* Arquitectura Visual */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Server className="h-4 w-4 text-gray-500" />
                            Arquitectura de Sincronización
                        </h4>
                        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Database className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-xs font-medium text-gray-700 mt-2">ElectroCaja</span>
                                <span className="text-[10px] text-gray-500">Sistema POS</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <ArrowRight className="h-6 w-6 text-gray-400" />
                                <span className="text-[10px] text-gray-500 mt-1">Webhook</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Globe className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-xs font-medium text-gray-700 mt-2">electroshopve.com</span>
                                <span className="text-[10px] text-gray-500">Tienda Online</span>
                            </div>
                        </div>
                    </div>

                    {/* Estado de conexión */}
                    <div className={`rounded-xl p-4 border-2 flex items-center justify-between ${connectionStatus === 'connected' ? 'bg-green-50 border-green-300' :
                        connectionStatus === 'testing' ? 'bg-blue-50 border-blue-300' :
                            connectionStatus === 'error' ? 'bg-red-50 border-red-300' :
                                'bg-gray-50 border-gray-300'
                        }`}>
                        <div className="flex items-center gap-3">
                            {connectionStatus === 'connected' ? (
                                <Wifi className="h-6 w-6 text-green-600" />
                            ) : connectionStatus === 'testing' ? (
                                <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                            ) : connectionStatus === 'error' ? (
                                <WifiOff className="h-6 w-6 text-red-600" />
                            ) : (
                                <WifiOff className="h-6 w-6 text-gray-400" />
                            )}
                            <div>
                                <div className="font-semibold text-gray-900">
                                    {connectionStatus === 'connected' && 'Conectado'}
                                    {connectionStatus === 'testing' && 'Probando conexión...'}
                                    {connectionStatus === 'error' && 'Error de conexión'}
                                    {connectionStatus === 'disconnected' && 'Sin conexión'}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {connectionStatus === 'connected' && 'Sincronización activa'}
                                    {connectionStatus === 'testing' && 'Verificando API...'}
                                    {connectionStatus === 'error' && 'Revisa la configuración'}
                                    {connectionStatus === 'disconnected' && 'Configura los parámetros para conectar'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={testConnection}
                            disabled={connectionStatus === 'testing'}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            Probar conexión
                        </button>
                    </div>

                    {/* Configuración de API */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Columna izquierda: Credenciales */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                                <Settings className="h-4 w-4 text-gray-500" />
                                Configuración de la API
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL de la API</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="url"
                                            value={config.apiUrl}
                                            onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                                            placeholder="https://electroshopve.com/api"
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <a
                                        href="https://electroshopve.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={config.apiKey}
                                        onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                        placeholder="sk_live_xxxxxxxxxxxxxxxxxxxx"
                                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo de sincronización</label>
                                <select
                                    value={config.syncInterval}
                                    onChange={(e) => setConfig(prev => ({ ...prev, syncInterval: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="realtime">Tiempo real (Webhook)</option>
                                    <option value="15">Cada 15 minutos</option>
                                    <option value="30">Cada 30 minutos</option>
                                    <option value="60">Cada hora</option>
                                    <option value="manual">Solo manual</option>
                                </select>
                            </div>

                            {/* Toggle de auto-sync */}
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="font-medium text-gray-900">Sincronización automática</div>
                                        <div className="text-sm text-gray-500">Enviar cambios automáticamente</div>
                                    </div>
                                    <div className={`relative w-14 h-7 rounded-full transition-colors ${config.autoSync ? 'bg-purple-600' : 'bg-gray-300'
                                        }`} onClick={() => setConfig(prev => ({ ...prev, autoSync: !prev.autoSync }))}>
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.autoSync ? 'translate-x-8' : 'translate-x-1'
                                            }`} />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Columna derecha: Filtros */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                                <Tag className="h-4 w-4 text-gray-500" />
                                Filtros de Sincronización
                            </h3>

                            <p className="text-sm text-gray-500">¿Qué tipos de productos sincronizar?</p>

                            <div className="space-y-2">
                                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${config.syncFilters.soloActivos ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={config.syncFilters.soloActivos}
                                        onChange={() => toggleFilter('soloActivos')}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Solo productos activos</div>
                                        <div className="text-xs text-gray-500">Ignorar productos desactivados</div>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${config.syncFilters.tipoProducto ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={config.syncFilters.tipoProducto}
                                        onChange={() => toggleFilter('tipoProducto')}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            <Package className="h-4 w-4" /> Productos
                                        </div>
                                        <div className="text-xs text-gray-500">Artículos físicos con stock</div>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${config.syncFilters.tipoServicio ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={config.syncFilters.tipoServicio}
                                        onChange={() => toggleFilter('tipoServicio')}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            <Wrench className="h-4 w-4" /> Servicios
                                        </div>
                                        <div className="text-xs text-gray-500">Reparaciones y servicios técnicos</div>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${config.syncFilters.tipoElectrobar ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={config.syncFilters.tipoElectrobar}
                                        onChange={() => toggleFilter('tipoElectrobar')}
                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            <Coffee className="h-4 w-4" /> Electrobar
                                        </div>
                                        <div className="text-xs text-gray-500">Café, bebidas, snacks</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Eventos a sincronizar */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                            <RefreshCw className="h-4 w-4 text-gray-500" />
                            Eventos a Sincronizar
                            <span className="text-xs text-gray-500 font-normal ml-2">(Qué cambios se envían a la web)</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {eventosConfig.map(evento => {
                                const IconComponent = evento.icon;
                                const isActive = config.syncEvents[evento.key];
                                return (
                                    <div
                                        key={evento.key}
                                        onClick={() => toggleEvent(evento.key)}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isActive
                                            ? 'border-purple-300 bg-purple-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-purple-600' : 'bg-gray-200'
                                                }`}>
                                                <IconComponent className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900 text-sm">{evento.label}</div>
                                                <div className="text-xs text-gray-500">{evento.description}</div>
                                            </div>
                                            {isActive && <Check className="h-4 w-4 text-purple-600" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Campos a sincronizar */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                            <Database className="h-4 w-4 text-gray-500" />
                            Campos a Sincronizar
                            <span className="text-xs text-gray-500 font-normal ml-2">(Qué información se comparte)</span>
                        </h3>

                        <div className="flex flex-wrap gap-2">
                            {camposConfig.map(campo => {
                                const isActive = config.syncFields[campo.key];
                                return (
                                    <button
                                        key={campo.key}
                                        onClick={() => toggleField(campo.key)}
                                        disabled={campo.essential}
                                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${isActive
                                            ? 'border-purple-300 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                            } ${campo.essential ? 'opacity-75 cursor-not-allowed' : ''}`}
                                    >
                                        {isActive && <Check className="h-3 w-3" />}
                                        {campo.label}
                                        {campo.essential && <span className="text-[10px] bg-gray-200 px-1 rounded">Requerido</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {lastSync ? `Última sincronización: ${lastSync}` : 'Sin sincronizaciones previas'}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={saveConfig}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConexionApiModal;
