// components/inventario/ConexionApiModal.jsx
// Modal para gestionar clientes API y webhooks de sincronización con apps externas
import React, { useState, useEffect } from 'react';
import {
    X, Globe, Wifi, WifiOff, Settings, Link2, Shield, Clock, CheckCircle,
    AlertTriangle, RefreshCw, ExternalLink, Package, DollarSign, Boxes,
    Image, Tag, Eye, EyeOff, Server, Database, ArrowRight, Check, Wrench,
    Coffee, Plus, Trash2, Copy, Key, Bell, Activity, Users, Zap,
    TestTube, Send, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from '../../utils/toast.jsx';

import { api } from '../../config/api';

const ConexionApiModal = ({ isOpen, onClose }) => {
    // Estado principal
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'clientes', 'webhooks', 'logs'
    const [loading, setLoading] = useState(false);
    const [apiStatus, setApiStatus] = useState(null);

    // Estados de datos
    const [clientes, setClientes] = useState([]);
    const [webhookLogs, setWebhookLogs] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);

    // Estado para crear nuevo cliente
    const [showNewClienteForm, setShowNewClienteForm] = useState(false);
    const [newCliente, setNewCliente] = useState({
        nombre: '',
        descripcion: '',
        permisos: { read: true, write: false, webhook: true },
        rateLimitRpm: 60
    });

    // Estado para agregar webhook
    const [showNewWebhookForm, setShowNewWebhookForm] = useState(false);
    const [newWebhook, setNewWebhook] = useState({
        url: '',
        eventos: ['STOCK_UPDATED', 'PRODUCT_UPDATED'],
        maxReintentos: 5
    });

    // API Key recién generada (solo se muestra una vez)
    const [generatedApiKey, setGeneratedApiKey] = useState(null);
    // Webhook Secret recién generado (solo se muestra una vez)
    const [generatedWebhookSecret, setGeneratedWebhookSecret] = useState(null);

    // Cargar estado de la API
    const fetchApiStatus = async () => {
        try {
            const response = await api.get('/eweb/health');
            setApiStatus(response.data);
        } catch (error) {
            console.error('Error fetching API status:', error);
            setApiStatus({ success: false, error: 'No se pudo conectar' });
        }
    };

    // Cargar clientes API
    const fetchClientes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/eweb/admin/clientes');

            if (response.data) {
                setClientes(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching clientes:', error);
            if (error.response?.status === 401) {
                toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.');
            } else {
                toast.error('Error cargando clientes API');
            }
        } finally {
            setLoading(false);
        }
    };

    // Cargar logs de webhooks
    const fetchWebhookLogs = async () => {
        try {
            const response = await api.get('/eweb/admin/webhook-logs?pageSize=20');

            if (response.data) {
                setWebhookLogs(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching webhook logs:', error);
        }
    };

    // Crear nuevo cliente
    const crearCliente = async () => {
        if (!newCliente.nombre) {
            toast.error('El nombre del cliente es requerido');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/eweb/admin/clientes', newCliente);

            if (response.data?.success) {
                toast.success('✅ Cliente API creado exitosamente');
                setGeneratedApiKey(response.data.data.apiKey); // Mostrar API Key una sola vez
                setShowNewClienteForm(false);
                setNewCliente({
                    nombre: '',
                    descripcion: '',
                    permisos: { read: true, write: false, webhook: true },
                    rateLimitRpm: 60
                });
                fetchClientes();
            } else {
                toast.error(response.data?.error?.message || 'Error creando cliente');
            }
        } catch (error) {
            console.error('Error creando cliente:', error);
            toast.error(error.response?.data?.error?.message || 'Error creando cliente');
        } finally {
            setLoading(false);
        }
    };

    // Agregar webhook a cliente
    const agregarWebhook = async (clienteId) => {
        if (!newWebhook.url) {
            toast.error('La URL del webhook es requerida');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(`/eweb/admin/clientes/${clienteId}/webhooks`, newWebhook);

            if (response.data?.success) {
                toast.success('✅ Webhook agregado exitosamente');
                // Capturar el secreto generado por el backend
                if (response.data.data.secreto) {
                    setGeneratedWebhookSecret({
                        secreto: response.data.data.secreto,
                        url: response.data.data.url
                    });
                }

                setShowNewWebhookForm(false);
                setNewWebhook({
                    url: '',
                    eventos: ['STOCK_UPDATED', 'PRODUCT_UPDATED'],
                    maxReintentos: 5
                });
                fetchClientes();
            } else {
                toast.error(response.data?.error?.message || 'Error agregando webhook');
            }
        } catch (error) {
            console.error('Error agregando webhook:', error);
            toast.error(error.response?.data?.error?.message || 'Error agregando webhook');
        } finally {
            setLoading(false);
        }
    };

    // Probar webhook
    const testWebhook = async (webhookId) => {
        try {
            const response = await api.post(`/eweb/admin/webhooks/${webhookId}/test`);

            if (response.data?.success) {
                toast.success(`✅ Webhook respondió correctamente (${response.data.duracionMs}ms)`);
            } else {
                toast.error(`❌ Webhook falló: ${response.data?.error}`);
            }
        } catch (error) {
            toast.error('Error probando webhook');
        }
    };

    // Eliminar webhook
    const eliminarWebhook = async (webhookId) => {
        if (!confirm('¿Estás seguro de eliminar este webhook?')) return;

        try {
            const response = await api.delete(`/eweb/admin/webhooks/${webhookId}`);

            if (response.status === 200 || response.status === 204) {
                toast.success('Webhook eliminado');
                fetchClientes();
            }
        } catch (error) {
            toast.error('Error eliminando webhook');
        }
    };

    // Copiar al portapapeles
    const copyToClipboard = (text, label = 'Texto') => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    // Cargar datos al abrir
    useEffect(() => {
        if (isOpen) {
            fetchApiStatus();
            fetchClientes();
            fetchWebhookLogs();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Eventos disponibles para webhooks
    const eventosDisponibles = [
        { key: 'PRODUCT_CREATED', label: 'Producto Creado', icon: Package },
        { key: 'PRODUCT_UPDATED', label: 'Producto Actualizado', icon: RefreshCw },
        { key: 'PRODUCT_DELETED', label: 'Producto Eliminado', icon: X },
        { key: 'STOCK_UPDATED', label: 'Stock Modificado', icon: Boxes },
        { key: 'PRICE_UPDATED', label: 'Precio Modificado', icon: DollarSign },
        { key: 'IMAGE_UPDATED', label: 'Imagen Actualizada', icon: Image },
    ];

    const toggleEvento = (evento) => {
        setNewWebhook(prev => ({
            ...prev,
            eventos: prev.eventos.includes(evento)
                ? prev.eventos.filter(e => e !== evento)
                : [...prev.eventos, evento]
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Globe className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">API Externa - Sincronización</h2>
                                <p className="text-sm text-purple-200">Gestiona conexiones con electroshopve.com y otras apps</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Status indicator */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${apiStatus?.success ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                                }`}>
                                {apiStatus?.success ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                                <span className="text-sm font-medium">
                                    {apiStatus?.success ? 'API Activa' : 'Sin conexión'}
                                </span>
                            </div>
                            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4">
                        {[
                            { key: 'overview', label: 'Resumen', icon: Activity },
                            { key: 'clientes', label: 'Clientes API', icon: Users },
                            { key: 'endpoints', label: 'Endpoints', icon: Server },
                            { key: 'logs', label: 'Logs', icon: Database }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? 'bg-white text-purple-600'
                                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content - Altura fija para consistencia entre pestañas */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[500px]">

                    {/* Modal de API Key generada (solo se muestra una vez) */}
                    {generatedApiKey && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                            <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Key className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">¡Cliente API Creado!</h3>
                                    <p className="text-gray-500 mb-4">
                                        Guarda esta API Key en un lugar seguro. <strong className="text-red-600">No se volverá a mostrar.</strong>
                                    </p>

                                    <div className="bg-gray-100 rounded-xl p-4 font-mono text-sm break-all text-left mb-4">
                                        {generatedApiKey}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => copyToClipboard(generatedApiKey, 'API Key')}
                                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Copiar API Key
                                        </button>
                                        <button
                                            onClick={() => setGeneratedApiKey(null)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        >
                                            Entendido
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal de Webhook Secret generado (solo se muestra una vez) */}
                    {generatedWebhookSecret && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                            <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield className="h-8 w-8 text-purple-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">¡Webhook Configurado!</h3>
                                    <p className="text-gray-500 mb-4 text-sm">
                                        Para asegurar la conexión, añade este secreto en tu aplicación externa.
                                    </p>

                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left mb-4">
                                        <h5 className="text-xs font-bold text-amber-800 uppercase mb-1">Instrucciones:</h5>
                                        <p className="text-xs text-amber-900">
                                            Copia este secreto en el archivo <code className="bg-amber-100 px-1 rounded">.env</code> de tu aplicación receptora:
                                        </p>
                                        <div className="mt-2 text-xs font-mono bg-white p-2 rounded border border-amber-200 overflow-x-auto">
                                            SADES_WEBHOOK_SECRET="{generatedWebhookSecret.secreto}"
                                        </div>
                                    </div>

                                    <div className="bg-gray-100 rounded-xl p-4 font-mono text-sm break-all text-left mb-4">
                                        {generatedWebhookSecret.secreto}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => copyToClipboard(generatedWebhookSecret.secreto, 'Webhook Secret')}
                                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Copiar Secreto
                                        </button>
                                        <button
                                            onClick={() => setGeneratedWebhookSecret(null)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        >
                                            Entendido
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Resumen */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Status Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                            <Users className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-purple-900">{clientes.length}</div>
                                            <div className="text-sm text-purple-600">Clientes API</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                                            <Bell className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-green-900">
                                                {clientes.reduce((acc, c) => acc + (c.webhookEndpoints?.length || 0), 0)}
                                            </div>
                                            <div className="text-sm text-green-600">Webhooks Activos</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                            <Zap className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-blue-900">
                                                {apiStatus?.cache?.memoria?.items || 0}
                                            </div>
                                            <div className="text-sm text-blue-600">Productos en Cache</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                                            <Send className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-amber-900">
                                                {apiStatus?.webhooks?.total || 0}
                                            </div>
                                            <div className="text-sm text-amber-600">Webhooks Enviados</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Arquitectura Visual */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Server className="h-5 w-5 text-gray-500" />
                                    Flujo de Sincronización
                                </h4>
                                <div className="flex items-center justify-center gap-4 flex-wrap">
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                            <Database className="h-10 w-10 text-white" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 mt-2">ElectroCaja</span>
                                        <span className="text-xs text-gray-500">POS Local</span>
                                    </div>

                                    <div className="flex flex-col items-center px-4">
                                        <ArrowRight className="h-8 w-8 text-gray-400" />
                                        <span className="text-xs text-gray-500 mt-1">Webhook</span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                            <Globe className="h-10 w-10 text-white" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 mt-2">electroshopve.com</span>
                                        <span className="text-xs text-gray-500">Tienda Online</span>
                                    </div>

                                    <div className="flex flex-col items-center px-4">
                                        <ArrowRight className="h-8 w-8 text-gray-400" />
                                        <span className="text-xs text-gray-500 mt-1">API</span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                                            <Users className="h-10 w-10 text-white" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 mt-2">Clientes</span>
                                        <span className="text-xs text-gray-500">Compradores</span>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                                    <h5 className="font-medium text-gray-700 mb-2">¿Cómo funciona?</h5>
                                    <ol className="text-sm text-gray-600 space-y-1.5">
                                        <li className="flex items-start gap-2">
                                            <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                            Cuando modificas un producto en ElectroCaja, se dispara un webhook automáticamente
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                            electroshopve.com recibe la actualización en tiempo real
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                            Los clientes siempre ven el stock actualizado al momento
                                        </li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Clientes API */}
                    {activeTab === 'clientes' && (
                        <div className="space-y-6">
                            {/* Header con botón de agregar */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Clientes API</h3>
                                    <p className="text-sm text-gray-500">Aplicaciones autorizadas a consumir la API</p>
                                </div>
                                <button
                                    onClick={() => setShowNewClienteForm(true)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nuevo Cliente
                                </button>
                            </div>

                            {/* Formulario nuevo cliente */}
                            {showNewClienteForm && (
                                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                                    <h4 className="font-medium text-purple-900 mb-4 flex items-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        Crear Nuevo Cliente API
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                            <input
                                                type="text"
                                                value={newCliente.nombre}
                                                onChange={(e) => setNewCliente(prev => ({ ...prev, nombre: e.target.value }))}
                                                placeholder="electroshopve, publicidadtv, etc."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                            <input
                                                type="text"
                                                value={newCliente.descripcion}
                                                onChange={(e) => setNewCliente(prev => ({ ...prev, descripcion: e.target.value }))}
                                                placeholder="Tienda online principal"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Permisos</label>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { key: 'read', label: 'Leer catálogo' },
                                                { key: 'write', label: 'Modificar stock' },
                                                { key: 'webhook', label: 'Recibir webhooks' }
                                            ].map(perm => (
                                                <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newCliente.permisos[perm.key]}
                                                        onChange={() => setNewCliente(prev => ({
                                                            ...prev,
                                                            permisos: { ...prev.permisos, [perm.key]: !prev.permisos[perm.key] }
                                                        }))}
                                                        className="w-4 h-4 text-purple-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">{perm.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-4">
                                        <button
                                            onClick={() => setShowNewClienteForm(false)}
                                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={crearCliente}
                                            disabled={loading}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            Crear Cliente
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Lista de clientes */}
                            {loading && clientes.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
                                </div>
                            ) : clientes.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl">
                                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No hay clientes API configurados</p>
                                    <p className="text-sm text-gray-400 mt-1">Crea uno para empezar a sincronizar</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {clientes.map(cliente => (
                                        <div key={cliente.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                            {/* Cliente header */}
                                            <div
                                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                                onClick={() => setSelectedCliente(selectedCliente === cliente.id ? null : cliente.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cliente.activo ? 'bg-green-100' : 'bg-gray-100'
                                                        }`}>
                                                        <Globe className={`h-5 w-5 ${cliente.activo ? 'text-green-600' : 'text-gray-400'}`} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                                            {cliente.nombre}
                                                            {cliente.activo ? (
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span>
                                                            ) : (
                                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{cliente.descripcion || 'Sin descripción'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right text-sm">
                                                        <div className="text-gray-600">{cliente.totalRequests || 0} requests</div>
                                                        <div className="text-gray-400">{cliente.webhookEndpoints?.length || 0} webhooks</div>
                                                    </div>
                                                    {selectedCliente === cliente.id ? (
                                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Cliente detalles expandidos */}
                                            {selectedCliente === cliente.id && (
                                                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                                                    {/* Permisos */}
                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Permisos</h5>
                                                        <div className="flex flex-wrap gap-2">
                                                            {cliente.permisos?.read && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg flex items-center gap-1">
                                                                    <Eye className="h-3 w-3" /> Lectura
                                                                </span>
                                                            )}
                                                            {cliente.permisos?.write && (
                                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-lg flex items-center gap-1">
                                                                    <Wrench className="h-3 w-3" /> Escritura
                                                                </span>
                                                            )}
                                                            {cliente.permisos?.webhook && (
                                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg flex items-center gap-1">
                                                                    <Bell className="h-3 w-3" /> Webhooks
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Webhooks del cliente */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="text-sm font-medium text-gray-700">Webhooks</h5>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowNewWebhookForm(cliente.id);
                                                                }}
                                                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
                                                            >
                                                                <Plus className="h-3 w-3" /> Agregar
                                                            </button>
                                                        </div>

                                                        {/* Form nuevo webhook */}
                                                        {showNewWebhookForm === cliente.id && (
                                                            <div className="bg-white border border-purple-200 rounded-lg p-3 mb-3">
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-600 mb-1">URL del Webhook</label>
                                                                        <input
                                                                            type="url"
                                                                            value={newWebhook.url}
                                                                            onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                                                                            placeholder="https://electroshopve.com/api/webhook"
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Eventos a recibir</label>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {eventosDisponibles.map(ev => (
                                                                                <button
                                                                                    key={ev.key}
                                                                                    onClick={() => toggleEvento(ev.key)}
                                                                                    className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 ${newWebhook.eventos.includes(ev.key)
                                                                                        ? 'bg-purple-100 text-purple-700'
                                                                                        : 'bg-gray-100 text-gray-600'
                                                                                        }`}
                                                                                >
                                                                                    <ev.icon className="h-3 w-3" />
                                                                                    {ev.label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => setShowNewWebhookForm(false)}
                                                                            className="px-3 py-1.5 text-xs text-gray-600"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => agregarWebhook(cliente.id)}
                                                                            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg"
                                                                        >
                                                                            Agregar Webhook
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Lista de webhooks */}
                                                        {cliente.webhookEndpoints?.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {cliente.webhookEndpoints.map(wh => (
                                                                    <div key={wh.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                                                                                    <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                                                    {wh.url}
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                                    {(Array.isArray(wh.eventos) ? wh.eventos : []).map(ev => (
                                                                                        <span key={ev} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                                                            {ev}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                                <div className="text-xs text-gray-400 mt-1">
                                                                                    {wh.enviosExitosos || 0} exitosos / {wh.enviosFallidos || 0} fallidos
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-1 ml-2">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        testWebhook(wh.id);
                                                                                    }}
                                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                                                    title="Probar webhook"
                                                                                >
                                                                                    <TestTube className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        eliminarWebhook(wh.id);
                                                                                    }}
                                                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                                                    title="Eliminar webhook"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-4 text-sm text-gray-400">
                                                                Sin webhooks configurados
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Endpoints - Documentación de API */}
                    {activeTab === 'endpoints' && (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <Server className="h-6 w-6" />
                                    <h3 className="text-xl font-bold">Documentación de API</h3>
                                </div>
                                <p className="text-purple-200">
                                    Referencia rápida de todos los endpoints disponibles
                                </p>
                                <div className="mt-4 flex gap-3">
                                    <div className="bg-white/20 px-3 py-1.5 rounded-lg text-sm">
                                        <span className="opacity-70">Base URL:</span>{' '}
                                        <code className="font-mono">/api/eweb</code>
                                    </div>
                                    <div className="bg-white/20 px-3 py-1.5 rounded-lg text-sm">
                                        <span className="opacity-70">Auth:</span>{' '}
                                        <code className="font-mono">X-API-Key</code>
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Catálogo */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-blue-600" />
                                    <h4 className="font-semibold text-blue-900">Catálogo de Productos</h4>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {/* Endpoint: Listar catálogo */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                            <code className="font-mono text-sm font-medium">/catalogo</code>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Listar productos con paginación y filtros</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">page</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">pageSize</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">updated_since</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">categoria</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">stock_min</span>
                                        </div>
                                    </div>
                                    {/* Endpoint: Producto por SKU */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                            <code className="font-mono text-sm font-medium">/producto/:sku</code>
                                        </div>
                                        <p className="text-sm text-gray-600">Obtener producto específico por código de barras</p>
                                    </div>
                                    {/* Endpoint: Sync Batch */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                            <code className="font-mono text-sm font-medium">/sync-batch</code>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Sincronización masiva con cursor (para reconstruir catálogo)</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">cursor</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">limit</span>
                                        </div>
                                    </div>
                                    {/* Endpoint: Imagen */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                            <code className="font-mono text-sm font-medium">/imagen/:sku</code>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Descargar imagen del producto</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">type=original|thumbnail</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Stock */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center gap-2">
                                    <Boxes className="h-5 w-5 text-amber-600" />
                                    <h4 className="font-semibold text-amber-900">Gestión de Stock</h4>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {/* Validar stock */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">POST</span>
                                            <code className="font-mono text-sm font-medium">/validar-stock</code>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Validar disponibilidad antes del pago</p>
                                        <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600">
                                            {`{ "items": [{ "sku": "...", "cantidad": 1 }] }`}
                                        </div>
                                    </div>
                                    {/* Reservar stock */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">POST</span>
                                            <code className="font-mono text-sm font-medium">/reservar-stock</code>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Reservar temporalmente durante checkout</p>
                                        <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600">
                                            {`{ "items": [...], "sesionId": "checkout_xyz" }`}
                                        </div>
                                    </div>
                                    {/* Liberar stock */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">POST</span>
                                            <code className="font-mono text-sm font-medium">/liberar-stock</code>
                                        </div>
                                        <p className="text-sm text-gray-600">Liberar stock si cancela el checkout</p>
                                    </div>
                                    {/* Confirmar venta */}
                                    <div className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">POST</span>
                                            <code className="font-mono text-sm font-medium">/confirmar-venta</code>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Confirmar venta y descontar stock definitivo</p>
                                        <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600">
                                            {`{ "items": [...], "ordenId": "ORD-001" }`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Webhooks */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-purple-600" />
                                    <h4 className="font-semibold text-purple-900">Eventos de Webhook</h4>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Recibe notificaciones en tiempo real cuando ocurren cambios en el inventario
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {[
                                            { event: 'STOCK_UPDATED', label: 'Stock Modificado', color: 'bg-emerald-100 text-emerald-700' },
                                            { event: 'PRICE_UPDATED', label: 'Precio Modificado', color: 'bg-blue-100 text-blue-700' },
                                            { event: 'PRODUCT_CREATED', label: 'Producto Creado', color: 'bg-purple-100 text-purple-700' },
                                            { event: 'PRODUCT_UPDATED', label: 'Producto Actualizado', color: 'bg-amber-100 text-amber-700' },
                                            { event: 'PRODUCT_DELETED', label: 'Producto Eliminado', color: 'bg-red-100 text-red-700' },
                                            { event: 'IMAGE_UPDATED', label: 'Imagen Actualizada', color: 'bg-pink-100 text-pink-700' },
                                        ].map(({ event, label, color }) => (
                                            <div key={event} className={`${color} px-3 py-2 rounded-lg text-center`}>
                                                <div className="text-xs font-bold">{event}</div>
                                                <div className="text-xs opacity-70">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Autenticación */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-red-600" />
                                    <h4 className="font-semibold text-red-900">Autenticación</h4>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-24 text-xs font-medium text-gray-500 pt-1">Header</div>
                                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm">
                                            X-API-Key: {"<TU_API_KEY>"}
                                        </code>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-24 text-xs font-medium text-gray-500 pt-1">Query Param</div>
                                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm">
                                            ?api_key={"<TU_API_KEY>"}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Health Check */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                                        <Activity className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                            <code className="font-mono text-sm font-medium">/health</code>
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Público</span>
                                        </div>
                                        <p className="text-sm text-gray-600">Verificar estado del servicio (sin autenticación)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Logs */}
                    {activeTab === 'logs' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Logs de Webhooks</h3>
                                <button
                                    onClick={fetchWebhookLogs}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Actualizar
                                </button>
                            </div>

                            {webhookLogs.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl">
                                    <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No hay logs de webhooks</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {webhookLogs.map(log => (
                                        <div key={log.id} className={`p-3 rounded-lg border ${log.estado === 'EXITOSO' ? 'bg-green-50 border-green-200' :
                                            log.estado === 'FALLIDO' || log.estado === 'AGOTADO' ? 'bg-red-50 border-red-200' :
                                                'bg-yellow-50 border-yellow-200'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {log.estado === 'EXITOSO' ? (
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                    ) : log.estado === 'FALLIDO' || log.estado === 'AGOTADO' ? (
                                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-yellow-600" />
                                                    )}
                                                    <span className="font-medium text-sm">{log.evento}</span>
                                                    <span className="text-xs text-gray-500">
                                                        → {log.endpoint?.url?.substring(0, 40)}...
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {log.duracionMs && `${log.duracionMs}ms`}
                                                    {' • '}
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            {log.errorMensaje && (
                                                <div className="text-xs text-red-600 mt-1">{log.errorMensaje}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        API v{apiStatus?.version || '1'} •
                        {apiStatus?.timestamp ? new Date(apiStatus.timestamp).toLocaleTimeString() : 'Sin conexión'}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConexionApiModal;
