// pages/DisplayPage.jsx
// 📺 Página pública de display/publicidad para mostrar productos
import React, { useState, useEffect, useCallback } from 'react';
import Package from 'lucide-react/dist/esm/icons/package'
import QrCode from 'lucide-react/dist/esm/icons/qr-code'
import Info from 'lucide-react/dist/esm/icons/info'
import Store from 'lucide-react/dist/esm/icons/store'
import Wifi from 'lucide-react/dist/esm/icons/wifi'
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Settings from 'lucide-react/dist/esm/icons/settings'
import Pause from 'lucide-react/dist/esm/icons/pause'
import Play from 'lucide-react/dist/esm/icons/play'
import { API_CONFIG } from '../config/api';
import io from 'socket.io-client';

// Importar fuente premium Inter de Google Fonts
const GOOGLE_FONTS_LINK = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';

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
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {/* Fuente Premium Google Fonts */}
            <link href={GOOGLE_FONTS_LINK} rel="stylesheet" />

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

            {/* Header - Premium Simplificado */}
            <header className="bg-[#0061F2] text-white shadow-xl h-[8vh] flex-none z-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0061F2] to-blue-600"></div>

                <div className="h-full px-6 flex justify-center items-center relative z-10 w-full">
                    {/* Logo + Título (Sin tarjeta) */}
                    <div className="flex items-center gap-4">
                        <img
                            src="/android-chrome-512x5129.png"
                            alt="Logo"
                            className="h-12 w-auto object-contain drop-shadow-lg"
                        />
                        <div className="text-left">
                            <h1 className="text-2xl font-extrabold leading-none tracking-tight">Electro Shop</h1>
                            <p className="text-xs text-blue-100 font-medium tracking-wide opacity-90 mt-1">www.electroshopve.com</p>
                        </div>
                    </div>

                    {/* Indicador de progreso adaptable */}
                    <div className="absolute right-6 flex items-center">
                        {productos.length > 20 ? (
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[9px] font-bold text-white/90 tracking-widest font-mono">
                                    {String(currentIndex + 1).padStart(2, '0')}/{productos.length}
                                </span>
                                <div className="w-20 lg:w-28 h-1 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                                    <div
                                        className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500 ease-out"
                                        style={{ width: `${((currentIndex + 1) / productos.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                {productos.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1 rounded-full transition-all duration-500 shadow-sm cursor-pointer ${idx === currentIndex
                                            ? 'w-5 bg-white opacity-100 scale-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                                            : 'w-1 bg-white/40 hover:bg-white/60'
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
            <main className="flex-grow flex flex-col h-[84vh] w-full relative overflow-hidden bg-gray-50/30 items-center">
                {/* Decorative blurs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#0061F2]/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/4"></div>

                {/* Content Wrapper limitado */}
                <div className="w-full max-w-[1100px] h-full flex flex-col p-4 gap-3 pb-4 relative z-10 transition-all duration-300">

                    {/* Título Principal del Producto - Adaptable */}
                    <div className={`flex-none w-full text-center py-1 z-20 px-4 ${animationClass}`}>
                        <h2
                            className="font-black text-gray-800 leading-none tracking-tight drop-shadow-sm line-clamp-1 overflow-hidden"
                            style={{ fontSize: 'clamp(1.5rem, 4vw, 3.5rem)', fontFamily: "'Inter', sans-serif" }}
                        >
                            {producto.descripcion}
                        </h2>
                    </div>

                    {/* Producto - Imagen (Aumentada significativamente) */}
                    <div className={`flex-[55] flex flex-col relative shrink-0 min-h-0 ${animationClass}`}>
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 w-full h-full p-3 flex flex-col items-center justify-center relative overflow-hidden group">
                            {/* Ribbon */}
                            <div className="absolute -top-2 -left-2 w-28 h-28 overflow-hidden z-20">
                                <div className="absolute bg-[#0061F2] text-white text-[10px] font-bold py-1 text-center transform -rotate-45 w-40 -left-10 top-6 shadow-md uppercase tracking-wider">
                                    {producto.tipo || 'Producto'}
                                </div>
                            </div>

                            {/* Ribbon disponible */}
                            <div className="absolute -top-2 -right-2 w-28 h-28 overflow-hidden z-20">
                                <div className={`absolute ${producto.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] font-bold py-1 text-center transform rotate-45 w-40 -right-10 top-6 shadow-md uppercase tracking-wider`}>
                                    {producto.stock > 0 ? 'Disponible' : 'Agotado'}
                                </div>
                            </div>

                            {/* Imagen */}
                            <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
                                <img
                                    src={getImageUrl(producto)}
                                    alt={producto.descripcion}
                                    className="max-h-full max-w-full w-auto object-contain drop-shadow-2xl z-10 transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                                    onError={(e) => { e.target.src = '/placeholder-product.png'; }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fila Única Premium: Precio (60%) + Stock (20%) + Código (20%) */}
                    <div className={`flex-[20] flex gap-3 w-full min-h-0 ${animationClass}`} style={{ animationDelay: '0.1s' }}>

                        {/* Precio - 60% */}
                        <div className="flex-[6] bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 rounded-3xl p-3 relative overflow-visible shadow-lg flex flex-col justify-center items-center text-center h-full">
                            {/* Badge Superior */}
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                                    Precio de Venta
                                </div>
                            </div>

                            <div className="flex flex-col items-center relative z-10 w-full mt-0.5">
                                <h2 className="font-black text-emerald-600 tracking-tighter leading-none drop-shadow-sm" style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)' }}>
                                    <span className="font-bold text-emerald-700 mr-2" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)' }}>Bs.</span>
                                    {precioBs.entero}<span className="align-top mt-1 inline-block" style={{ fontSize: '60%' }}>,{precioBs.decimal}</span>
                                </h2>
                                <div className="mt-2 flex flex-col items-center gap-0.5">
                                    <span className="font-semibold text-slate-500 tracking-wide" style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)' }}>
                                        REF: ${parseFloat(producto.precioVenta || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stock - 20% */}
                        <div className="flex-[2] bg-white border-2 border-blue-200 rounded-3xl p-3 flex flex-col justify-center items-center text-center shadow-lg h-full relative overflow-visible group hover:shadow-xl hover:border-blue-300 transition-all">
                            {/* Badge Stock */}
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="bg-blue-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                                    Stock
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 mt-1">
                                <Package className="w-10 h-10 text-blue-600" strokeWidth={2.5} />
                                <span className="font-extrabold text-gray-800 leading-none" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}>{producto.stock || 0}</span>
                            </div>
                        </div>

                        {/* Código - 20% */}
                        <div className="flex-[2] bg-white border-2 border-gray-300 rounded-3xl p-3 flex flex-col justify-center items-center text-center shadow-lg h-full relative overflow-visible group hover:shadow-xl hover:border-gray-400 transition-all">
                            {/* Badge Código */}
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="bg-gray-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                                    Código
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 mt-1">
                                <QrCode className="w-10 h-10 text-gray-600" strokeWidth={2.5} />
                                <span className="font-mono font-extrabold text-gray-800 truncate w-full text-center line-clamp-2 break-all px-1" style={{ fontSize: 'clamp(1rem, 2vw, 1.75rem)' }}>
                                    {producto.codigoBarras || producto.codigoInterno || 'N/A'}
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* Tarjeta de Descripción del Producto - Estilo Premium */}
                    {producto.observaciones && (
                        <div className={`flex-[8] bg-white border-2 border-purple-200 rounded-3xl p-4 shadow-lg w-full relative overflow-visible group hover:shadow-xl hover:border-purple-300 transition-all ${animationClass}`} style={{ animationDelay: '0.2s' }}>
                            {/* Badge Detalles */}
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="bg-purple-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                                    Detalles del Producto
                                </div>
                            </div>
                            <div className="h-full flex flex-col justify-center items-center text-center mt-1">
                                <Info className="w-8 h-8 text-purple-500 mb-1" strokeWidth={2.5} />
                                <p className="text-base text-gray-700 leading-snug font-medium line-clamp-2 px-2">
                                    {producto.observaciones}
                                </p>
                            </div>
                        </div>
                    )}

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

            {/* Footer - Mismo color que Header */}
            <footer className="bg-[#0061F2] text-white h-[8vh] flex-none z-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0061F2] to-blue-600"></div>
                <div className="h-full px-6 flex justify-between items-center text-xs font-medium relative z-10">
                    {/* Izquierda: Info Sistema */}
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-bold">
                            <Store className="w-4 h-4" />
                            <span>Electro Caja</span>
                        </div>
                        <span className="opacity-80 text-blue-100">Sistema de Inventario</span>
                    </div>

                    {/* Centro: Tasa BCV (Sin tarjeta, centrado) */}
                    {tasaCambio && (
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <img
                                src="/BCV1.png"
                                alt="BCV"
                                className="h-8 w-auto object-contain drop-shadow-lg"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] opacity-90 leading-tight">Tasa BCV</span>
                                <span className="font-black text-lg leading-tight">{parseFloat(tasaCambio).toFixed(2)} Bs./$</span>
                            </div>
                        </div>
                    )}

                    {/* Derecha: Estado y Fecha */}
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10`}>
                            {isOnline ? (
                                <>
                                    <Wifi className="w-4 h-4" />
                                    <span>En Línea</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4 text-red-300" />
                                    <span>Sin conexión</span>
                                </>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="font-bold">
                                {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }).toUpperCase()}
                            </div>
                            <div className="text-[10px] opacity-80 text-blue-100">{new Date().getFullYear()}</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DisplayPage;
