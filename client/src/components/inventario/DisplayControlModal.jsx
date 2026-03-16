// components/inventario/DisplayControlModal.jsx
// 📺 Modal de control – Sistema Multi-Pantalla de Display/Publicidad
import React, { useState, useEffect, useCallback, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Play from 'lucide-react/dist/esm/icons/play';
import Pause from 'lucide-react/dist/esm/icons/pause';
import Eye from 'lucide-react/dist/esm/icons/eye';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Package from 'lucide-react/dist/esm/icons/package';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Tv from 'lucide-react/dist/esm/icons/tv';
import Tablet from 'lucide-react/dist/esm/icons/tablet';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import Check from 'lucide-react/dist/esm/icons/check';
import Save from 'lucide-react/dist/esm/icons/save';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Image from 'lucide-react/dist/esm/icons/image';
import Video from 'lucide-react/dist/esm/icons/video';
import Upload from 'lucide-react/dist/esm/icons/upload';
import RotateCw from 'lucide-react/dist/esm/icons/rotate-cw';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Tag from 'lucide-react/dist/esm/icons/tag';
import { API_CONFIG, api } from '../../config/api';
import toast from '../../utils/toast.jsx';
import { useAuthStore } from '../../store/authStore';

// ── Parsear User-Agent para info real del dispositivo
const parseUA = (ua = '') => {
    const u = ua.toLowerCase();
    let browser = 'Navegador', os = 'Sistema desconocido', deviceType = 'Desktop';
    if (u.includes('chrome') && !u.includes('chromium') && !u.includes('edg')) browser = 'Chrome';
    else if (u.includes('firefox')) browser = 'Firefox';
    else if (u.includes('safari') && !u.includes('chrome')) browser = 'Safari';
    else if (u.includes('edg')) browser = 'Edge';
    else if (u.includes('opr/') || u.includes('opera')) browser = 'Opera';
    if (u.includes('windows')) os = 'Windows';
    else if (u.includes('mac os x') || u.includes('macos')) os = 'macOS';
    else if (u.includes('android')) os = 'Android';
    else if (u.includes('iphone') || u.includes('ipad')) os = 'iOS';
    else if (u.includes('linux')) os = 'Linux';
    else if (u.includes('webos') || u.includes('tizen') || u.includes('smart-tv')) os = 'Smart TV';
    if (u.includes('mobile') || u.includes('iphone')) deviceType = 'Móvil';
    else if (u.includes('ipad') || u.includes('tablet')) deviceType = 'Tablet';
    else if (u.includes('smart-tv') || u.includes('webos') || u.includes('tizen') || u.includes('tv')) deviceType = 'Smart TV';
    else deviceType = 'PC / Monitor';
    return { browser, os, deviceType };
};

// ── Helper: formatear tamaño de archivo
const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Estado de rotación por pantalla: 0°, 90°, 180°, 270°
const ROTATION_OPTIONS = [
    { degrees: 0,   label: '0°',   hint: 'Normal' },
    { degrees: 90,  label: '90°',  hint: 'Derecha' },
    { degrees: 180, label: '180°', hint: 'Invertido' },
    { degrees: 270, label: '270°', hint: 'Izquierda' },
];

const SCREEN_LABELS = { main: 'Pantalla 1', cat: 'Pantalla 2', slides: 'Slides' };

const TIEMPOS = [
    { value: 5, label: '5 seg' }, { value: 8, label: '8 seg' },
    { value: 10, label: '10 seg' }, { value: 15, label: '15 seg' },
    { value: 20, label: '20 seg' }, { value: 30, label: '30 seg' },
    { value: 60, label: '1 min' }
];

const TIPOS_DISPONIBLES = [
    { value: 'PRODUCTO', label: 'Productos' },
    { value: 'ELECTROBAR', label: 'Electrobar' },
    { value: 'SERVICIO', label: 'Servicios' }
];

const TABS = [
    { key: 'screen1', label: 'Pantalla 1', icon: Monitor },
    { key: 'screen2', label: 'Pantalla 2', icon: Layers },
    { key: 'slides', label: 'Slides', icon: Image },
    { key: 'pantallas', label: 'Dispositivos', icon: Tv },
    { key: 'preview', label: 'Vista Previa', icon: Eye }
];

const DisplayControlModal = ({ isOpen, onClose }) => {
    const { socket } = useAuthStore();
    const fileInputRef = useRef(null);

    // ── Estados generales
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('screen1');
    const [displayClients, setDisplayClients] = useState([]);
    const [categorias, setCategorias] = useState([]);
    // Rotación actual por pantalla (espejo local del estado de las pantallas conectadas)
    const [rotations, setRotations] = useState({ main: 0, cat: 0, slides: 0 });
    const [rotatingScreen, setRotatingScreen] = useState(null); // id de pantalla en progreso

    // ── Config Pantalla 1
    const [saving1, setSaving1] = useState(false);
    const [config1, setConfig1] = useState({
        activo: true, nombre: 'Pantalla Principal', tiempoRotacion: 10,
        soloDestacados: true, soloConStock: true,
        tipos: ['PRODUCTO', 'ELECTROBAR'], categorias: [],
        showDescription: true, showStock: true, showCode: true,
        titulo: 'electroshopve.com'
    });
    const [productos1, setProductos1] = useState([]);

    // ── Config Pantalla 2
    const [saving2, setSaving2] = useState(false);
    const [config2, setConfig2] = useState({
        activo: true, nombre: 'Electro Bar', tiempoRotacion: 10,
        soloDestacados: false, soloConStock: true,
        tipos: [], categorias: [],
        showDescription: true, showStock: true, showCode: true
    });
    const [productos2, setProductos2] = useState([]);

    // ── Config Slides
    const [savingSlides, setSavingSlides] = useState(false);
    const [slidesConfig, setSlidesConfig] = useState({ activo: true, nombre: 'Publicidad', tiempoRotacion: 8 });
    const [slides, setSlides] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // ── URL base
    const baseUrl = window.location.origin;

    // ── Fetch de todo
    // NOTA: useCallback con [] vacío para evitar loop infinito.
    // Usamos la respuesta fresca de la API (freshConfig2) para filtrar productos2,
    // en lugar de leer config2 del estado (que causaría el loop al cambiar referencias de array).
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [c1Res, c2Res, csRes, slidesRes, clientsRes, invRes] = await Promise.all([
                api.get('/display/config'),
                api.get('/display/screen2/config'),
                api.get('/display/slides/config'),
                api.get('/display/slides'),
                api.get('/display/clients'),
                api.get('/inventory/products?pageSize=1000')
            ]);

            if (c1Res.data.success) setConfig1(prev => ({ ...prev, ...c1Res.data.data }));
            if (csRes.data.success) setSlidesConfig(prev => ({ ...prev, ...csRes.data.data }));
            if (slidesRes.data.success) setSlides(slidesRes.data.data || []);
            if (clientsRes.data.success) setDisplayClients(clientsRes.data.data || []);

            // Guardar config2 fresca en variable local para usarla en el filtro sin crear dependencias
            let freshConfig2 = { tipos: [], categorias: [] };
            if (c2Res.data.success) {
                freshConfig2 = c2Res.data.data;
                setConfig2(prev => ({ ...prev, ...freshConfig2 }));
            }

            if (invRes.data.success) {
                const cats = [...new Set((invRes.data.data || []).map(p => p.categoria).filter(Boolean))].sort();
                setCategorias(cats);
                const all = invRes.data.data || [];
                setProductos1(all.filter(p => p.activo && p.destacado).slice(0, 10));
                // Filtrar con freshConfig2 (respuesta de API, no state) → sin loop
                setProductos2(all.filter(p => {
                    if (!p.activo) return false;
                    if (freshConfig2.tipos?.length && !freshConfig2.tipos.includes(p.tipo)) return false;
                    if (freshConfig2.categorias?.length && !freshConfig2.categorias.includes(p.categoria)) return false;
                    return true;
                }).slice(0, 10));
            }
        } catch (e) {
            console.error('Error cargando datos de display:', e);
            toast.error('Error cargando configuración');
        } finally {
            setLoading(false);
        }
    }, []); // ← Deps vacías: no depende del estado, evita el loop infinito

    useEffect(() => { if (isOpen) fetchData(); }, [isOpen, fetchData]);

    // ── Socket: clientes conectados
    useEffect(() => {
        if (!socket || !isOpen) return;
        const h = (clients) => setDisplayClients(clients || []);
        socket.on('display:clients_updated', h);
        return () => socket.off('display:clients_updated', h);
    }, [socket, isOpen]);

    // ── Enviar comando de rotación en tiempo real
    const handleRotate = async (screenId, degrees) => {
        setRotatingScreen(screenId);
        try {
            await api.post('/display/rotate', { screenId, degrees });
            setRotations(prev => ({ ...prev, [screenId]: degrees }));
            toast.success(`Orientación ${degrees}° aplicada en ${SCREEN_LABELS[screenId] || screenId}`);
        } catch {
            toast.error('Error aplicando orientación');
        } finally {
            setRotatingScreen(null);
        }
    };

    // ── Guardar Pantalla 1
    const handleSave1 = async () => {
        setSaving1(true);
        try {
            await api.put('/display/config', config1);
            toast.success('Pantalla 1 guardada ✓');
        } catch { toast.error('Error guardando Pantalla 1'); }
        finally { setSaving1(false); }
    };

    // ── Guardar Pantalla 2
    const handleSave2 = async () => {
        setSaving2(true);
        try {
            await api.put('/display/screen2/config', config2);
            toast.success('Pantalla 2 guardada ✓');
        } catch { toast.error('Error guardando Pantalla 2'); }
        finally { setSaving2(false); }
    };

    // ── Guardar config Slides
    const handleSaveSlides = async () => {
        setSavingSlides(true);
        try {
            await api.put('/display/slides/config', slidesConfig);
            toast.success('Configuración de slides guardada ✓');
        } catch { toast.error('Error guardando slides'); }
        finally { setSavingSlides(false); }
    };

    // ── Subir slide
    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploading(true);
        let ok = 0, fail = 0;
        for (const file of files) {
            try {
                const fd = new FormData();
                fd.append('file', file);
                await api.post('/display/slides/upload', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progress) => {
                        setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
                    }
                });
                ok++;
            } catch { fail++; }
        }
        setUploading(false);
        setUploadProgress(0);
        if (ok > 0) toast.success(`${ok} archivo(s) subido(s) ✓`);
        if (fail > 0) toast.error(`${fail} archivo(s) fallaron`);
        await fetchData();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Eliminar slide
    const handleDeleteSlide = async (filename) => {
        if (!window.confirm(`¿Eliminar "${filename}"?`)) return;
        try {
            await api.delete(`/display/slides/${filename}`);
            toast.success('Archivo eliminado');
            setSlides(prev => prev.filter(s => s.filename !== filename));
        } catch { toast.error('Error eliminando archivo'); }
    };

    // ── Helpers de config
    const toggleTipo1 = (t) => setConfig1(p => ({ ...p, tipos: p.tipos.includes(t) ? p.tipos.filter(x => x !== t) : [...p.tipos, t] }));
    const toggleCat1 = (c) => setConfig1(p => ({ ...p, categorias: p.categorias.includes(c) ? p.categorias.filter(x => x !== c) : [...p.categorias, c] }));
    const toggleTipo2 = (t) => setConfig2(p => ({ ...p, tipos: p.tipos.includes(t) ? p.tipos.filter(x => x !== t) : [...p.tipos, t] }));
    const toggleCat2 = (c) => setConfig2(p => ({ ...p, categorias: p.categorias.includes(c) ? p.categorias.filter(x => x !== c) : [...p.categorias, c] }));

    // ── Icono de dispositivo
    const getDeviceIcon = (ua) => {
        if (!ua) return <Monitor className="w-5 h-5" />;
        const u = ua.toLowerCase();
        if (u.includes('mobile') || u.includes('android') || u.includes('iphone')) return <Smartphone className="w-5 h-5" />;
        if (u.includes('ipad') || u.includes('tablet')) return <Tablet className="w-5 h-5" />;
        if (u.includes('smart-tv') || u.includes('webos') || u.includes('tizen')) return <Tv className="w-5 h-5" />;
        return <Monitor className="w-5 h-5" />;
    };

    const fmtTime = (ts) => {
        if (!ts) return 'N/A';
        const diff = Math.floor((Date.now() - new Date(ts)) / 1000 / 60);
        if (diff < 1) return 'Ahora';
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    // ── Componente reutilizable: selector de tiempo
    const TimeSelector = ({ value, onChange }) => (
        <div className="flex gap-2 flex-wrap">
            {TIEMPOS.map(t => (
                <button key={t.value} onClick={() => onChange(t.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${value === t.value ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'}`}>
                    {t.label}
                </button>
            ))}
        </div>
    );

    // ── Componente: controles de rotación en tiempo real
    const RotationControls = ({ screenId, accentColor = 'purple' }) => {
        const currentDeg = rotations[screenId] ?? 0;
        const isLoading = rotatingScreen === screenId;
        const ac = accentColor === 'orange' ? {
            active: 'bg-orange-500 text-white border-orange-500',
            hover: 'hover:border-orange-400',
            ring: 'ring-orange-300'
        } : {
            active: 'bg-purple-600 text-white border-purple-600',
            hover: 'hover:border-purple-400',
            ring: 'ring-purple-300'
        };
        return (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <RotateCw className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Orientación en Tiempo Real</h3>
                    {isLoading && <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin ml-auto" />}
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {ROTATION_OPTIONS.map(({ degrees, label, hint }) => {
                        const isActive = currentDeg === degrees;
                        return (
                            <button
                                key={degrees}
                                onClick={() => handleRotate(screenId, degrees)}
                                disabled={isLoading}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
                                    isActive
                                        ? ac.active
                                        : `bg-white border-gray-200 text-gray-600 ${ac.hover}`
                                }`}
                            >
                                {/* Monitor icon girado según el ángulo – muestra visualmente la orientación */}
                                <Monitor
                                    className="w-7 h-7 transition-transform duration-500"
                                    style={{ transform: `rotate(${degrees}deg)` }}
                                />
                                <div className="text-center">
                                    <div className="text-xs font-bold leading-none">{label}</div>
                                    <div className="text-[10px] opacity-70 leading-tight mt-0.5">{hint}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Se aplica instantáneamente en las pantallas conectadas
                </p>
            </div>
        );
    };

    // ── Componente: URL card (sin emojis)
    const UrlCard = ({ label, url, color = 'blue' }) => {
        const colorMap = {
            blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
            orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
            purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' }
        };
        const c = colorMap[color] || colorMap.blue;
        return (
            <div className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-2 mb-2">
                    <Globe className={`w-4 h-4 ${c.text}`} />
                    <span className={`text-sm font-semibold ${c.text}`}>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-1.5 rounded-lg border text-xs font-mono overflow-x-auto">{url}</code>
                    <button onClick={() => { navigator.clipboard.writeText(url); toast.success('URL copiada'); }}
                        className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap">Copiar</button>
                    <button onClick={() => window.open(url, '_blank')}
                        className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 transition-colors whitespace-nowrap">Abrir</button>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => window.open(`${url}?v=1`, '_blank')}
                        className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1.5 transition-colors">
                        <Smartphone className="w-3.5 h-3.5" /> Vista Vertical
                    </button>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* ── Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-xl"><Tv className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-xl font-bold">Control de Display</h2>
                                <p className="text-purple-200 text-sm">Gestionar pantallas de publicidad</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                        {TABS.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-white text-purple-600' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}>
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
                        </div>
                    ) : (
                        <>
                            {/* ════════════════════════════════════════════
                                TAB: PANTALLA 1
                            ════════════════════════════════════════════ */}
                            {activeTab === 'screen1' && (
                                <div className="space-y-5">
                                    <UrlCard label="URL Pantalla 1" url={`${baseUrl}/display`} color="blue" />

                                    {/* Nombre */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Nombre de la Pantalla</h3>
                                        <input type="text" value={config1.nombre || ''} onChange={e => setConfig1(p => ({ ...p, nombre: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                            placeholder="ej: Pantalla Principal" />
                                    </div>

                                    {/* Estado */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Estado de la Pantalla</h3>
                                                <p className="text-sm text-gray-500">Activar o desactivar la publicidad</p>
                                            </div>
                                            <button onClick={() => setConfig1(p => ({ ...p, activo: !p.activo }))}
                                                className={`relative w-14 h-7 rounded-full transition-colors ${config1.activo ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${config1.activo ? 'translate-x-8' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        {!config1.activo && (
                                            <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg text-sm">
                                                <AlertCircle className="w-4 h-4" /><span>La pantalla mostrará "Desactivado"</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tiempo rotación */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Tiempo de Rotación</h3>
                                        <TimeSelector value={config1.tiempoRotacion} onChange={v => setConfig1(p => ({ ...p, tiempoRotacion: v }))} />
                                    </div>

                                    {/* Tipos */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Filter className="w-4 h-4" /> Tipos de Producto</h3>
                                        <div className="flex gap-3 flex-wrap">
                                            {TIPOS_DISPONIBLES.map(t => (
                                                <button key={t.value} onClick={() => toggleTipo1(t.value)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${config1.tipos.includes(t.value) ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'}`}>
                                                    {config1.tipos.includes(t.value) && <Check className="w-4 h-4" />}
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Categorías */}
                                    {categorias.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Filter className="w-4 h-4" /> Categorías</h3>
                                                {config1.categorias.length > 0 && (
                                                    <button onClick={() => setConfig1(p => ({ ...p, categorias: [] }))} className="text-sm text-red-500 hover:underline">Limpiar</button>
                                                )}
                                            </div>
                                            <div className="flex gap-2 flex-wrap max-h-36 overflow-y-auto">
                                                {categorias.map(cat => (
                                                    <button key={cat} onClick={() => toggleCat1(cat)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${config1.categorias.includes(cat) ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'}`}>
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {config1.categorias.length === 0 ? 'Mostrando todas las categorías' : `${config1.categorias.length} categoría(s) seleccionada(s)`}
                                            </p>
                                        </div>
                                    )}

                                    {/* Opciones */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3">Opciones de Visualización</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { key: 'soloDestacados', label: 'Solo destacados' },
                                                { key: 'soloConStock', label: 'Solo con stock' },
                                                { key: 'showStock', label: 'Mostrar stock' },
                                                { key: 'showCode', label: 'Mostrar código' }
                                            ].map(opt => (
                                                <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                                                    <div onClick={() => setConfig1(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                                                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${config1[opt.key] ? 'bg-purple-600' : 'bg-gray-200'}`}>
                                                        {config1[opt.key] && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="text-gray-700 text-sm">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-green-50 rounded-xl p-4 border border-green-200 flex items-center gap-3">
                                        <Package className="w-5 h-5 text-green-600" />
                                        <div>
                                            <span className="text-2xl font-bold text-green-600">{productos1.length}</span>
                                            <span className="text-sm text-gray-600 ml-2">productos en la previsualización</span>
                                        </div>
                                    </div>

                                    {/* Orientación en tiempo real */}
                                    <RotationControls screenId="main" accentColor="purple" />

                                    <div className="flex justify-end">
                                        <button onClick={handleSave1} disabled={saving1}
                                            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                                            {saving1 ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar Pantalla 1
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ════════════════════════════════════════════
                                TAB: PANTALLA 2
                            ════════════════════════════════════════════ */}
                            {activeTab === 'screen2' && (
                                <div className="space-y-5">
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                        <UrlCard label="URL Pantalla 2" url={`${baseUrl}/display/cat`} color="orange" />
                                    </div>

                                    {/* Nombre */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Nombre de la Pantalla</h3>
                                        <input type="text" value={config2.nombre || ''} onChange={e => setConfig2(p => ({ ...p, nombre: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                            placeholder="ej: Electro Bar, Servicios, Accesorios..." />
                                        <p className="text-xs text-gray-500 mt-1">Este nombre se muestra en el header de la pantalla</p>
                                    </div>

                                    {/* Estado */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Estado de la Pantalla</h3>
                                                <p className="text-sm text-gray-500">Activar o desactivar</p>
                                            </div>
                                            <button onClick={() => setConfig2(p => ({ ...p, activo: !p.activo }))}
                                                className={`relative w-14 h-7 rounded-full transition-colors ${config2.activo ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${config2.activo ? 'translate-x-8' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tiempo */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Tiempo de Rotación</h3>
                                        <TimeSelector value={config2.tiempoRotacion} onChange={v => setConfig2(p => ({ ...p, tiempoRotacion: v }))} />
                                    </div>

                                    {/* Filtro por Tipos */}
                                    <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                                        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><Filter className="w-4 h-4 text-orange-500" /> Filtrar por Tipo</h3>
                                        <p className="text-xs text-gray-500 mb-3">Dejar vacío para mostrar todos los tipos</p>
                                        <div className="flex gap-3 flex-wrap">
                                            {TIPOS_DISPONIBLES.map(t => (
                                                <button key={t.value} onClick={() => toggleTipo2(t.value)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${config2.tipos.includes(t.value) ? 'bg-orange-500 text-white' : 'bg-white border border-orange-200 text-gray-700 hover:border-orange-400'}`}>
                                                    {config2.tipos.includes(t.value) && <Check className="w-4 h-4" />}
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Filtro por Categorías */}
                                    {categorias.length > 0 && (
                                        <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Filter className="w-4 h-4 text-orange-500" /> Filtrar por Categoría</h3>
                                                {config2.categorias.length > 0 && (
                                                    <button onClick={() => setConfig2(p => ({ ...p, categorias: [] }))} className="text-sm text-red-500 hover:underline">Limpiar</button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3">Dejar vacío para mostrar todas las categorías</p>
                                            <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto">
                                                {categorias.map(cat => (
                                                    <button key={cat} onClick={() => toggleCat2(cat)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${config2.categorias.includes(cat) ? 'bg-orange-500 text-white' : 'bg-white border border-orange-200 text-gray-700 hover:border-orange-400'}`}>
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {config2.categorias.length === 0 ? 'Mostrando todas las categorías' : `Filtrando: ${config2.categorias.join(', ')}`}
                                            </p>
                                        </div>
                                    )}

                                    {/* Opciones */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3">Opciones de Visualización</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { key: 'soloDestacados', label: 'Solo destacados' },
                                                { key: 'soloConStock', label: 'Solo con stock' },
                                                { key: 'showStock', label: 'Mostrar stock' },
                                                { key: 'showCode', label: 'Mostrar código' }
                                            ].map(opt => (
                                                <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                                                    <div onClick={() => setConfig2(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                                                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${config2[opt.key] ? 'bg-orange-500' : 'bg-gray-200'}`}>
                                                        {config2[opt.key] && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="text-gray-700 text-sm">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Orientación en tiempo real */}
                                    <RotationControls screenId="cat" accentColor="orange" />

                                    <div className="flex justify-end">
                                        <button onClick={handleSave2} disabled={saving2}
                                            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                                            {saving2 ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar Pantalla 2
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ════════════════════════════════════════════
                                TAB: SLIDES
                            ════════════════════════════════════════════ */}
                            {activeTab === 'slides' && (
                                <div className="space-y-5">
                                    <UrlCard label="URL Pantalla de Slides" url={`${baseUrl}/display/slides`} color="purple" />

                                    {/* Nombre + Tiempo */}
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Tag className="w-4 h-4" /> Nombre</h3>
                                            <input type="text" value={slidesConfig.nombre || ''} onChange={e => setSlidesConfig(p => ({ ...p, nombre: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                                placeholder="ej: Publicidad, Promociones..." />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Tiempo por Imagen (los videos usan su duración)</h3>
                                            <TimeSelector value={slidesConfig.tiempoRotacion} onChange={v => setSlidesConfig(p => ({ ...p, tiempoRotacion: v }))} />
                                        </div>
                                        <button onClick={handleSaveSlides} disabled={savingSlides}
                                            className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                                            {savingSlides ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar configuración
                                        </button>
                                    </div>

                                    {/* Zone de Upload */}
                                    <div className="bg-purple-50 rounded-xl p-5 border-2 border-dashed border-purple-300">
                                        <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                                            className="hidden" onChange={handleUpload} />
                                        <div className="text-center">
                                            {uploading ? (
                                                <div>
                                                    <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                                                    <p className="text-purple-700 font-medium">Subiendo... {uploadProgress}%</p>
                                                    <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                                                        <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                                                    <p className="font-semibold text-purple-700 mb-1">Subir imágenes o videos</p>
                                                    <p className="text-xs text-gray-500 mb-3">JPG, PNG, GIF, WebP · MP4, WebM · Máx 200 MB por archivo</p>
                                                    <button onClick={() => fileInputRef.current?.click()}
                                                        className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                                                        Seleccionar archivos
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lista de slides */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">
                                                Slides actuales
                                                <span className="ml-2 text-sm text-gray-500 font-normal">({slides.length} archivo{slides.length !== 1 ? 's' : ''})</span>
                                            </h3>
                                            <button onClick={fetchData} className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                                                <RotateCcw className="w-3.5 h-3.5" /> Recargar
                                            </button>
                                        </div>

                                        {slides.length === 0 ? (
                                            <div className="text-center py-10 text-gray-400">
                                                <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p>No hay slides. Sube imágenes o videos arriba.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                                                {slides.map((slide, idx) => {
                                                    const mediaUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}${slide.url}`;
                                                    return (
                                                        <div key={slide.filename} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video">
                                                            {slide.type === 'video' ? (
                                                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                                                    <Video className="w-8 h-8 text-white/60" />
                                                                    <span className="absolute bottom-1 right-1 text-[9px] text-white/70 bg-black/50 px-1 rounded">VIDEO</span>
                                                                </div>
                                                            ) : (
                                                                <img src={mediaUrl} alt={slide.filename}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs">Error</div>'; }} />
                                                            )}
                                                            {/* Overlay info */}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                                <p className="text-white text-[10px] font-medium text-center line-clamp-2 leading-tight">{slide.filename.replace(/^\d+-/, '')}</p>
                                                                <p className="text-white/60 text-[9px]">{fmtSize(slide.size)}</p>
                                                                <button onClick={() => handleDeleteSlide(slide.filename)}
                                                                    className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            {/* Badge orden */}
                                                            <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                                {idx + 1}
                                                            </div>
                                                            {/* Badge tipo con icono Lucide */}
                                                            <div className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${slide.type === 'video' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                                                                {slide.type === 'video'
                                                                    ? <Video className="w-3 h-3" />
                                                                    : <Image className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Orientación en tiempo real para Slides */}
                                    <RotationControls screenId="slides" accentColor="purple" />
                                </div>
                            )}

                            {/* ════════════════════════════════════════════
                                TAB: DISPOSITIVOS CONECTADOS
                            ════════════════════════════════════════════ */}
                            {activeTab === 'pantallas' && (
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">Dispositivos Conectados</h3>
                                        <button onClick={fetchData} className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800">
                                            <RefreshCw className="w-4 h-4" /> Actualizar
                                        </button>
                                    </div>

                                    {displayClients.length === 0 ? (
                                        <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                                            <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 text-lg font-medium">No hay dispositivos conectados</p>
                                            <p className="text-gray-400 text-sm mt-2">Abre cualquiera de las URLs en una pantalla o TV</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {displayClients.map((client, idx) => {
                                                const { browser, os, deviceType } = parseUA(client.userAgent);
                                                const DevIcon = deviceType === 'Móvil' ? Smartphone
                                                    : deviceType === 'Tablet' ? Tablet
                                                    : deviceType === 'Smart TV' ? Tv
                                                    : Monitor;
                                                const screenLabel = SCREEN_LABELS[client.screenId] || client.screenId || 'Desconocido';
                                                const screenColor = client.screenId === 'main' ? 'bg-blue-100 text-blue-700'
                                                    : client.screenId === 'cat' ? 'bg-orange-100 text-orange-700'
                                                    : client.screenId === 'slides' ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-gray-100 text-gray-600';
                                                return (
                                                    <div key={client.id || idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                                        <div className="p-4 flex items-start gap-4">
                                                            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 flex-none">
                                                                <DevIcon className="w-6 h-6" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                    <span className="font-semibold text-gray-900">{deviceType}</span>
                                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${screenColor}`}>
                                                                        {screenLabel}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full">
                                                                        <Wifi className="w-3 h-3" /> Conectado
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-1">
                                                                    <span><strong>Browser:</strong> {browser}</span>
                                                                    <span><strong>OS:</strong> {os}</span>
                                                                    <span><strong>IP:</strong> {client.ip || 'N/A'}</span>
                                                                    <span><strong>Conectado:</strong> hace {fmtTime(client.connectedAt)}</span>
                                                                    {client.resolution && (
                                                                        <span><strong>Resolución:</strong> {client.resolution}</span>
                                                                    )}
                                                                </div>
                                                                {/* URL de la pantalla conectada */}
                                                                {(() => {
                                                                    const screenUrl = client.screenId === 'main' ? `${baseUrl}/display`
                                                                        : client.screenId === 'cat' ? `${baseUrl}/display/cat`
                                                                        : client.screenId === 'slides' ? `${baseUrl}/display/slides`
                                                                        : null;
                                                                    return screenUrl ? (
                                                                        <div className="mt-2 flex items-center gap-2">
                                                                            <Globe className="w-3 h-3 text-gray-400 flex-none" />
                                                                            <code className="text-[11px] text-indigo-600 font-mono truncate flex-1">{screenUrl}</code>
                                                                            <button
                                                                                onClick={() => window.open(screenUrl, '_blank')}
                                                                                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors whitespace-nowrap flex-none">
                                                                                Abrir
                                                                            </button>
                                                                        </div>
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        {/* Rotación individual por dispositivo */}
                                                        {client.screenId && (
                                                            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                                                                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                                                                    <RotateCw className="w-3 h-3" /> Orientación rápida para {screenLabel}
                                                                </p>
                                                                <div className="flex gap-2">
                                                                    {ROTATION_OPTIONS.map(({ degrees, label }) => (
                                                                        <button key={degrees}
                                                                            onClick={() => handleRotate(client.screenId, degrees)}
                                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                                                rotations[client.screenId] === degrees
                                                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
                                                                            }`}>
                                                                            <Monitor className="w-3.5 h-3.5" style={{ transform: `rotate(${degrees}deg)` }} />
                                                                            {label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4" /> Consejos
                                        </h4>
                                        <ul className="text-sm text-blue-700 space-y-1">
                                            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-none" /> Usa <strong>F11</strong> para modo pantalla completa en el navegador</li>
                                            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-none" /> Usa los controles de orientación para rotar en tiempo real (TV Box)</li>
                                            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-none" /> TV Box: usa Chrome en modo kiosco para mejor experiencia</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* ════════════════════════════════════════════
                                TAB: VISTA PREVIA
                            ════════════════════════════════════════════ */}
                            {activeTab === 'preview' && (
                                <div className="space-y-5">
                                    <h3 className="font-semibold text-gray-900">URLs disponibles</h3>

                                    {/* Cards de URLs */}
                                    <div className="space-y-3">
                                        <UrlCard label={`📺 Pantalla 1 – ${config1.nombre || 'Principal'}`} url={`${baseUrl}/display`} color="blue" />
                                        <UrlCard label={`📺 Pantalla 2 – ${config2.nombre || 'Categoría'}`} url={`${baseUrl}/display/cat`} color="orange" />
                                        <UrlCard label={`🖼️ Slides – ${slidesConfig.nombre || 'Publicidad'}`} url={`${baseUrl}/display/slides`} color="purple" />
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <h4 className="font-medium text-gray-900 mb-3">🔄 Modo Orientación Vertical</h4>
                                        <p className="text-sm text-gray-600 mb-3">Para TV Box o pantallas en posición vertical, agrega <code className="bg-gray-200 px-1 rounded">?v=1</code> al final de cualquier URL:</p>
                                        <div className="space-y-2">
                                            {[
                                                `${baseUrl}/display?v=1`,
                                                `${baseUrl}/display/cat?v=1`,
                                                `${baseUrl}/display/slides?v=1`
                                            ].map(url => (
                                                <div key={url} className="flex items-center gap-2">
                                                    <code className="flex-1 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-mono">{url}</code>
                                                    <button onClick={() => window.open(url, '_blank')} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap">Abrir ↗</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mini preview */}
                                    <div className="bg-gray-900 rounded-2xl p-4 aspect-video relative overflow-hidden shadow-2xl">
                                        <div className="h-full flex flex-col">
                                            <div className="bg-[#0061F2] text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
                                                <span className="font-bold text-sm">{config1.nombre || 'Pantalla Principal'}</span>
                                                <div className="flex gap-1">
                                                    {[0, 1, 2, 3, 4].map(i => (
                                                        <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/30'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-gray-100 p-3 flex flex-col gap-2">
                                                {productos1.length > 0 ? (
                                                    <>
                                                        <div className="bg-white rounded-lg p-3 flex-1 flex flex-col items-center justify-center">
                                                            <div className="w-16 h-16 bg-gray-200 rounded-lg mb-2" />
                                                            <div className="font-bold text-sm text-center text-gray-800 line-clamp-1">{productos1[0]?.descripcion || 'Producto'}</div>
                                                        </div>
                                                        <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                                            <div className="text-emerald-600 font-black text-xl">{(productos1[0]?.precioVenta * 40).toFixed(2)}</div>
                                                            <div className="text-emerald-700 text-xs font-bold">Bolívares</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Sin productos</div>
                                                )}
                                            </div>
                                            <div className="bg-gray-200 px-4 py-2 rounded-b-lg flex items-center justify-between text-xs text-gray-600">
                                                <span>Electro Caja</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />En línea</span>
                                            </div>
                                        </div>
                                        {config1.activo && (
                                            <div className="absolute bottom-6 right-6 bg-white/90 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                                                <Play className="w-4 h-4 text-green-600" fill="currentColor" />
                                                <span className="text-sm font-medium text-gray-700">Rotando cada {config1.tiempoRotacion}s</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer */}
                <div className="border-t border-gray-200 bg-gray-50 p-4 flex items-center justify-between flex-none">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Monitor className="w-4 h-4" />{displayClients.length} dispositivo(s)</span>
                        <span className="flex items-center gap-1"><Image className="w-4 h-4" />{slides.length} slide(s)</span>
                    </div>
                    <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DisplayControlModal;
