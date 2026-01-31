// pages/DisplayPage.jsx
// 📺 Página pública de display/publicidad para mostrar productos
import React, { useState, useEffect, useCallback } from 'react';
import {
    Package, QrCode, Info, Store, Wifi, WifiOff,
    ChevronLeft, ChevronRight, Settings, Pause, Play
} from 'lucide-react';
import { API_CONFIG } from '../config/api';
import io from 'socket.io-client';

const DisplayPage = () => {
    // Estados
    const [productos, setProductos] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({
        activo: true,
        tiempoRotacion: 10, // segundos
        soloDestacados: true,
        soloConStock: true,
        tipos: ['PRODUCTO', 'ELECTROBAR'],
        categorias: []
    });
    const [isPaused, setIsPaused] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [tasaCambio, setTasaCambio] = useState(null);
    const [animationClass, setAnimationClass] = useState('animate-fadeIn');
    const [showControls, setShowControls] = useState(false);
    const [loadingPhrase, setLoadingPhrase] = useState('Iniciando sistema...');

    // Frases de carga
    useEffect(() => {
        if (!loading) return;
        const frases = [
            "Preparando vitrina digital...",
            "Organizando productos destacados...",
            "Consultando mejores precios...",
            "Abrillantando píxeles...",
            "Sincronizando inventario...",
            "Cargando ofertas exclusivas..."
        ];
        let i = 0;
        const interval = setInterval(() => {
            setLoadingPhrase(frases[i]);
            i = (i + 1) % frases.length;
        }, 800);
        return () => clearInterval(interval);
    }, [loading]);

    // Cargar configuración inicial
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const configRes = await fetch(`${API_CONFIG.BASE_URL}/display/config`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    if (configData.success) {
                        setConfig(configData.data);
                    }
                }
            } catch (error) {
                console.error('Error cargando config:', error);
            }
        };
        loadConfig();
    }, []);

    // Cargar productos y tasa
    const fetchContent = useCallback(async () => {
        try {
            setLoading(true);

            // Parametros basados en config
            const params = new URLSearchParams();
            if (config.soloDestacados) params.append('destacado', 'true');
            if (config.soloConStock) params.append('stock_min', '1');
            if (config.tipos?.length) params.append('tipos', config.tipos.join(','));
            params.append('pageSize', '50');
            params.append('activo', 'true');

            // Fetch tasa
            const tasaPromise = fetch(`${API_CONFIG.BASE_URL}/tasas`).then(r => r.json());

            // Fetch productos
            const prodPromise = fetch(`${API_CONFIG.BASE_URL}/display/productos?${params}`).then(r => r.json());

            const [tasaData, prodData] = await Promise.all([tasaPromise, prodPromise]);

            // Setear tasa
            if (tasaData.success && tasaData.data) {
                setTasaCambio(tasaData.data.bcv || tasaData.data.promedio);
            }

            // Setear productos
            if (prodData.success) {
                setProductos(prodData.data || []);
                setIsOnline(true);
            }
        } catch (error) {
            console.error('Error fetching content:', error);
            setIsOnline(false);
        } finally {
            setLoading(false);
        }
    }, [config.soloDestacados, config.soloConStock, config.tipos]); // Solo dependencias primitivas/array

    // Efecto para cargar contenido
    useEffect(() => {
        fetchContent();
        // Timer para refrescar cada 5 min
        const interval = setInterval(fetchContent, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchContent]);

    // Socket.IO para actualizaciones en tiempo real
    useEffect(() => {
        const socket = io(API_CONFIG.SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('📺 Display conectado');
            socket.emit('display:connect', {
                userAgent: navigator.userAgent,
                timestamp: new Date()
            });
            setIsOnline(true);
        });

        socket.on('disconnect', () => {
            setIsOnline(false);
        });

        // Escuchar cambios en configuración
        socket.on('display:config_updated', (newConfig) => {
            console.log('⚙️ Configuración actualizada:', newConfig);
            setConfig(prev => ({ ...prev, ...newConfig }));
        });

        // Escuchar actualizaciones de inventario
        socket.on('inventario_actualizado', () => {
            console.log('📦 Inventario actualizado, recargando...');
            fetchContent();
        });

        // Escuchar comando de pausa/play remoto
        socket.on('display:toggle_pause', (paused) => {
            setIsPaused(paused);
        });

        return () => {
            socket.emit('display:disconnect');
            socket.disconnect();
        };
    }, [fetchContent]);

    // Rotación automática
    useEffect(() => {
        if (isPaused || productos.length <= 1) return;

        const timer = setInterval(() => {
            setAnimationClass('animate-fadeOut');
            setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % productos.length);
                setAnimationClass('animate-fadeIn');
            }, 300);
        }, config.tiempoRotacion * 1000);

        return () => clearInterval(timer);
    }, [isPaused, productos.length, config.tiempoRotacion]);

    // Navegación manual
    const goToNext = () => {
        setAnimationClass('animate-slideOutLeft');
        setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % productos.length);
            setAnimationClass('animate-slideInRight');
        }, 300);
    };

    const goToPrev = () => {
        setAnimationClass('animate-slideOutRight');
        setTimeout(() => {
            setCurrentIndex(prev => (prev - 1 + productos.length) % productos.length);
            setAnimationClass('animate-slideInLeft');
        }, 300);
    };

    // Formatear precio en Bs
    const formatPrecioBs = (precioUSD) => {
        if (!tasaCambio || !precioUSD) return '0,00';
        const precioBs = precioUSD * tasaCambio;
        const [entero, decimal] = precioBs.toFixed(2).split('.');
        return { entero: parseInt(entero).toLocaleString('es-VE'), decimal };
    };

    // Obtener URL de imagen
    const getImageUrl = (producto) => {
        if (producto.imagenUrl) {
            if (producto.imagenUrl.startsWith('http')) return producto.imagenUrl;
            return `${API_CONFIG.BASE_URL.replace('/api', '')}${producto.imagenUrl}`;
        }
        return '/placeholder-product.png';
    };

    // Producto actual
    const producto = productos[currentIndex];

    // Si display está desactivado
    if (!config.activo) {
        return (
            <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Settings className="w-12 h-12 text-gray-600 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-400">Display Desactivado</h1>
                    <p className="text-gray-600 mt-2">Contacte al administrador</p>
                </div>
            </div>
        );
    }

    // Loading
    if (loading) {
        return (
            <div className="h-screen w-full bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10"></div>
                <div className="text-center flex flex-col items-center relative z-10 w-full max-w-2xl px-4">
                    <img
                        src="/android-chrome-512x5129.png"
                        alt="Cargando"
                        className="w-64 h-64 lg:w-80 lg:h-80 object-contain mb-8 animate-pulse drop-shadow-2xl"
                    />
                    <div className="h-2 w-64 bg-white/20 rounded-full overflow-hidden mb-4 relative">
                        <div className="absolute top-0 left-0 h-full w-1/3 bg-white blur-sm rounded-full animate-slideInRight" style={{ animationDuration: '1s', animationIterationCount: 'infinite' }}></div>
                    </div>

                    <div className="h-12 flex items-center justify-center overflow-hidden w-full">
                        <p key={loadingPhrase} className="text-2xl lg:text-3xl font-light text-white tracking-wider animate-fadeIn">
                            {loadingPhrase}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Sin productos
    if (!productos.length || !producto) {
        return (
            <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Package className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-gray-500">Sin productos para mostrar</h1>
                    <p className="text-gray-400 mt-2">Configure los productos destacados</p>
                </div>
            </div>
        );
    }

    const precioBs = formatPrecioBs(producto.precioVenta);

    return (
        <div
            className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden select-none"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Estilos de animación */}
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-50px); } }
        @keyframes slideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(50px); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-fadeOut { animation: fadeOut 0.3s ease-in forwards; }
        .animate-slideInRight { animation: slideInRight 0.4s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.4s ease-out forwards; }
        .animate-slideOutLeft { animation: slideOutLeft 0.3s ease-in forwards; }
        .animate-slideOutRight { animation: slideOutRight 0.3s ease-in forwards; }
      `}</style>

            {/* Header */}
            <header className="bg-[#0061F2] text-white shadow-xl h-[12vh] flex-none z-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0061F2] to-blue-600"></div>

                <div className="h-full px-6 flex justify-center items-center relative z-10 w-full">
                    {/* Contenido Centrado */}
                    <div className="flex items-center gap-4 bg-white/10 px-8 py-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                        <img
                            src="/android-chrome-512x5129.png"
                            alt="Logo"
                            className="h-14 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform"
                        />
                        <div className="text-left pl-2">
                            <h1 className="text-2xl font-bold leading-none tracking-tight">electroshopve.com</h1>
                            <p className="text-xs text-blue-100 font-medium tracking-wide opacity-80 mt-1 uppercase">Catálogo Digital</p>
                        </div>
                    </div>

                    {/* Indicador de progreso adaptable */}
                    <div className="absolute right-8 flex items-center">
                        {productos.length > 20 ? (
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] font-bold text-white/90 tracking-widest font-mono">
                                    {String(currentIndex + 1).padStart(2, '0')}/{productos.length}
                                </span>
                                <div className="w-24 lg:w-32 h-1.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                                    <div
                                        className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500 ease-out"
                                        style={{ width: `${((currentIndex + 1) / productos.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                {productos.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all duration-500 shadow-sm cursor-pointer ${idx === currentIndex
                                            ? 'w-6 bg-white opacity-100 scale-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                                            : 'w-1.5 bg-white/40 hover:bg-white/60'
                                            }`}
                                        onClick={() => setCurrentIndex(idx)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col h-[80vh] w-full relative overflow-hidden bg-gray-50/30 items-center">
                {/* Decorative blurs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#0061F2]/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/4"></div>

                {/* Content Wrapper limitado */}
                <div className="w-full max-w-[1100px] h-full flex flex-col p-3 gap-2 pb-0 relative z-10 transition-all duration-300">

                    {/* Título Principal del Producto */}
                    <div className={`flex-none w-full text-center py-0 z-20 ${animationClass}`}>
                        <h2 className="font-serif text-5xl lg:text-5xl font-black text-gray-800 leading-tight tracking-tight drop-shadow-sm px-4">
                            {producto.descripcion}
                        </h2>
                    </div>

                    {/* Producto - Imagen */}
                    <div className={`flex-[38] flex flex-col relative shrink-0 min-h-0 ${animationClass}`}>
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 w-full h-full p-2 flex flex-col items-center justify-center relative overflow-hidden group">
                            {/* Ribbon */}
                            <div className="absolute -top-2 -left-2 w-28 h-28 overflow-hidden z-20">
                                <div className="absolute bg-[#0061F2] text-white text-[10px] font-bold py-1 text-center transform -rotate-45 w-40 -left-10 top-6 shadow-md uppercase tracking-wider">
                                    {producto.tipo || 'Producto'}
                                </div>
                            </div>



                            {/* Imagen */}
                            <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
                                <img
                                    src={getImageUrl(producto)}
                                    alt={producto.descripcion}
                                    className="max-h-full max-w-full w-auto object-contain p-2 drop-shadow-xl z-10 transform transition-transform duration-700 ease-out group-hover:scale-105"
                                    onError={(e) => { e.target.src = '/placeholder-product.png'; }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Precio (Ajustado) */}
                    <div className={`flex-[25] flex flex-col shrink-0 min-h-0 ${animationClass}`} style={{ animationDelay: '0.1s' }}>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4 relative overflow-visible shadow-sm flex flex-col justify-center items-center text-center h-full w-full">
                            {/* Ribbon disponible */}
                            <div className="absolute -top-2 -left-2 w-24 h-24 overflow-hidden z-20">
                                <div className={`absolute ${producto.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] font-bold py-1 text-center transform -rotate-45 w-32 -left-8 top-6 shadow-md uppercase tracking-wider`}>
                                    {producto.stock > 0 ? 'Disponible' : 'Agotado'}
                                </div>
                            </div>

                            <div className="flex flex-col items-center relative z-10 w-full">
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-0">Precio de Venta</span>
                                <h2 className="text-6xl lg:text-7xl font-black text-emerald-600 tracking-tighter leading-none">
                                    {precioBs.entero}<span className="text-4xl align-top mt-1 inline-block">,{precioBs.decimal}</span>
                                </h2>
                                <span className="text-xl font-bold text-emerald-700 mt-0">Bolívares</span>
                                <div className="mt-2 flex flex-col items-center gap-1">
                                    <span className="text-xl font-medium text-slate-400 tracking-widest opacity-80 decoration-slate-300 underline underline-offset-4">
                                        REF: ${parseFloat(producto.precioVenta || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Premium Unificado: Stock/Código Arriba, Descripción Abajo */}
                    <div className={`flex-[22] flex flex-col gap-2 w-full min-h-0 ${animationClass}`} style={{ animationDelay: '0.2s' }}>

                        {/* Fila 1: Stock y Código */}
                        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
                            {/* Stock */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-2 flex flex-col justify-center items-center text-center shadow-sm h-full relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20"></div>
                                <div className="flex items-center gap-1.5 text-blue-600 mb-0.5">
                                    <Package className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Stock</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl lg:text-5xl font-extrabold text-gray-800 leading-none">{producto.stock || 0}</span>
                                    <span className="text-[10px] font-bold text-gray-400">unds</span>
                                </div>
                            </div>
                            {/* Código */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-2 flex flex-col justify-center items-center text-center shadow-sm h-full relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gray-500/20"></div>
                                <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                                    <QrCode className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Código</span>
                                </div>
                                <span className="font-mono font-bold text-base lg:text-lg text-gray-800 truncate px-2 w-full">{producto.codigoBarras || producto.codigoInterno || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Fila 2: Descripción (Full Width) */}
                        {producto.observaciones && (
                            <div className="flex-[0.8] bg-white border border-gray-100 rounded-2xl p-3 shadow-sm h-full relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-400 opacity-60"></div>
                                <div className="h-full flex flex-col justify-center pl-2">
                                    <div className="flex items-center gap-2 mb-0.5 opacity-70">
                                        <Info className="w-3 h-3 text-blue-500" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Detalles</span>
                                    </div>
                                    <p className="text-base text-gray-600 leading-snug font-medium line-clamp-2">
                                        {producto.observaciones}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Controles flotantes (visibles al pasar mouse) */}
                {showControls && (
                    <div className="absolute inset-x-0 bottom-20 flex justify-center gap-4 z-50 transition-opacity duration-300">
                        <button
                            onClick={goToPrev}
                            className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all"
                        >
                            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={goToNext}
                            className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 border-t border-gray-200 text-gray-500 h-[8vh] flex-none z-10">
                <div className="h-full px-6 flex justify-between items-center text-xs font-medium">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-gray-800 font-bold">
                            <Store className="w-4 h-4 text-[#0061F2]" />
                            <span>Electro Caja</span>
                        </div>
                        <span className="opacity-70">Sistema de Inventario</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200`}>
                            {isOnline ? (
                                <>
                                    <Wifi className="w-4 h-4 text-green-500" />
                                    <span>En Línea</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4 text-red-500" />
                                    <span>Sin conexión</span>
                                </>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-gray-800">
                                {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }).toUpperCase()}
                            </div>
                            <div className="text-[10px] opacity-70">{new Date().getFullYear()}</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DisplayPage;
