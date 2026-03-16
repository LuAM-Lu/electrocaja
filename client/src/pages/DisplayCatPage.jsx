// pages/DisplayCatPage.jsx
// 📺 Pantalla 2 – Productos filtrados (con rotación CSS en tiempo real)
import React, { useState, useEffect } from 'react';
import Package from 'lucide-react/dist/esm/icons/package';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import Info from 'lucide-react/dist/esm/icons/info';
import Store from 'lucide-react/dist/esm/icons/store';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Pause from 'lucide-react/dist/esm/icons/pause';
import Play from 'lucide-react/dist/esm/icons/play';
import { useDisplayData, buildRotationStyle } from '../hooks/useDisplayData';

const GOOGLE_FONTS_LINK = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';

const ANIMATION_STYLES = `
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
`;

// Color de acento para Pantalla 2 (naranja/amber – diferenciado visualmente de Pantalla 1)
const ACCENT = '#F97316'; // orange-500

const isVerticalMode = () => new URLSearchParams(window.location.search).get('v') === '1';

const DisplayCatPage = () => {
    const [showControls, setShowControls] = useState(false);

    const {
        productos, currentIndex, setCurrentIndex, loading, config,
        isPaused, setIsPaused, isOnline, tasaCambio,
        animationClass, loadingPhrase, goToNext, goToPrev,
        formatPrecioBs, getImageUrl, rotation
    } = useDisplayData({ configEndpoint: '/display/screen2/config', screenId: 'cat' });

    useEffect(() => {
        document.body.style.overflow = (rotation === 90 || rotation === 270) ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [rotation]);

    const rotStyle = buildRotationStyle(rotation);
    const producto = productos[currentIndex];

    // ── Display desactivado
    if (!config.activo) {
        return (
            <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-spin" style={{ animationDuration: '3s' }} />
                    <h1 className="text-2xl font-bold text-gray-400">{config.nombre || 'Pantalla 2'} – Desactivado</h1>
                    <p className="text-gray-600 mt-2">Contacte al administrador</p>
                </div>
            </div>
        );
    }

    // ── Loading
    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #c2410c)` }}>
                <div className="text-center flex flex-col items-center w-full max-w-2xl px-4">
                    <img src="/android-chrome-512x5129.png" alt="Cargando"
                        className="w-64 h-64 object-contain mb-8 animate-pulse drop-shadow-2xl" />
                    <div className="h-2 w-64 bg-white/20 rounded-full overflow-hidden mb-4">
                        <div className="h-full w-1/3 bg-white blur-sm rounded-full animate-slideInRight"
                            style={{ animationDuration: '1s', animationIterationCount: 'infinite' }} />
                    </div>
                    <p key={loadingPhrase} className="text-2xl font-light text-white tracking-wider animate-fadeIn">{loadingPhrase}</p>
                </div>
            </div>
        );
    }

    // ── Sin productos
    if (!productos.length || !producto) {
        return (
            <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Package className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-gray-500">Sin productos en "{config.nombre}"</h1>
                    <p className="text-gray-400 mt-2">Configure los filtros en el panel de control</p>
                </div>
            </div>
        );
    }

    const precioBs = formatPrecioBs(producto.precioVenta);




    // ══════════════════════════════════════════════════════════════════
    // 🖥️ LAYOUT HORIZONTAL
    // ══════════════════════════════════════════════════════════════════
    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden select-none"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            style={{ ...rotStyle, fontFamily: "'Inter', sans-serif" }}>
            <link href={GOOGLE_FONTS_LINK} rel="stylesheet" />
            <style>{ANIMATION_STYLES}</style>

            <header className="text-white shadow-xl h-[8vh] flex-none z-50 relative overflow-hidden" style={{ background: ACCENT }}>
                <div className="h-full px-6 flex justify-center items-center relative z-10 w-full">
                    <div className="flex items-center gap-4">
                        <img src="/android-chrome-512x5129.png" alt="Logo" className="h-12 w-auto object-contain drop-shadow-lg" />
                        <div className="text-left">
                            <h1 className="text-2xl font-extrabold leading-none tracking-tight">{config.titulo || 'Electro Shop'}</h1>
                            <p className="text-xs text-orange-100 font-medium tracking-wide opacity-90 mt-1">{config.nombre || 'Pantalla 2'}</p>
                        </div>
                    </div>
                    <div className="absolute right-6 flex items-center">
                        {productos.length > 20 ? (
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[9px] font-bold text-white/90 tracking-widest font-mono">
                                    {String(currentIndex + 1).padStart(2, '0')}/{productos.length}
                                </span>
                                <div className="w-20 lg:w-28 h-1 bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-500"
                                        style={{ width: `${((currentIndex + 1) / productos.length) * 100}%` }} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                {productos.map((_, idx) => (
                                    <div key={idx}
                                        className={`h-1 rounded-full transition-all duration-500 cursor-pointer ${idx === currentIndex ? 'w-5 bg-white' : 'w-1 bg-white/40'}`}
                                        onClick={() => setCurrentIndex(idx)} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col h-[84vh] w-full relative overflow-hidden bg-gray-50/30 items-center">
                <div className="w-full max-w-[1100px] h-full flex flex-col p-4 gap-3 pb-4 relative z-10">
                    <div className={`flex-none w-full text-center py-1 px-4 ${animationClass}`}>
                        <h2 className="font-black text-gray-800 leading-none tracking-tight line-clamp-1"
                            style={{ fontSize: 'clamp(1.5rem, 4vw, 3.5rem)' }}>
                            {producto.descripcion}
                        </h2>
                    </div>

                    <div className={`flex-[55] flex flex-col relative shrink-0 min-h-0 ${animationClass}`}>
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 w-full h-full p-3 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute -top-2 -left-2 w-28 h-28 overflow-hidden z-20">
                                <div className="absolute text-white text-[10px] font-bold py-1 text-center transform -rotate-45 w-40 -left-10 top-6 shadow-md uppercase tracking-wider"
                                    style={{ background: ACCENT }}>
                                    {producto.tipo || 'Producto'}
                                </div>
                            </div>
                            <div className="absolute -top-2 -right-2 w-28 h-28 overflow-hidden z-20">
                                <div className={`absolute ${producto.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] font-bold py-1 text-center transform rotate-45 w-40 -right-10 top-6 shadow-md uppercase tracking-wider`}>
                                    {producto.stock > 0 ? 'Disponible' : 'Agotado'}
                                </div>
                            </div>
                            <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
                                <img src={getImageUrl(producto)} alt={producto.descripcion}
                                    className="max-h-full max-w-full w-auto object-contain drop-shadow-2xl z-10 transform transition-transform duration-700 group-hover:scale-[1.02]"
                                    onError={(e) => { e.target.src = '/placeholder-product.png'; }} />
                            </div>
                        </div>
                    </div>

                    <div className={`flex-[20] flex gap-3 w-full min-h-0 ${animationClass}`} style={{ animationDelay: '0.1s' }}>
                        <div className="flex-[6] rounded-3xl p-3 relative overflow-visible shadow-lg flex flex-col justify-center items-center text-center h-full border-2"
                            style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider"
                                    style={{ background: ACCENT }}>Precio de Venta</div>
                            </div>
                            <div className="flex flex-col items-center relative z-10 w-full mt-0.5">
                                <h2 className="font-black tracking-tighter leading-none" style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', color: ACCENT }}>
                                    <span className="font-bold mr-2" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)' }}>Bs.</span>
                                    {precioBs.entero}<span className="align-top mt-1 inline-block" style={{ fontSize: '60%' }}>,{precioBs.decimal}</span>
                                </h2>
                                <span className="font-semibold text-slate-500 tracking-wide mt-2" style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)' }}>
                                    REF: ${parseFloat(producto.precioVenta || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex-[2] bg-white border-2 rounded-3xl p-3 flex flex-col justify-center items-center text-center shadow-lg h-full relative overflow-visible"
                            style={{ borderColor: '#fed7aa' }}>
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider"
                                    style={{ background: ACCENT }}>Stock</div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 mt-1">
                                <Package className="w-10 h-10" strokeWidth={2.5} style={{ color: ACCENT }} />
                                <span className="font-extrabold text-gray-800 leading-none" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}>{producto.stock || 0}</span>
                            </div>
                        </div>

                        <div className="flex-[2] bg-white border-2 border-gray-300 rounded-3xl p-3 flex flex-col justify-center items-center text-center shadow-lg h-full relative overflow-visible">
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="bg-gray-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">Código</div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 mt-1">
                                <QrCode className="w-10 h-10 text-gray-600" strokeWidth={2.5} />
                                <span className="font-mono font-extrabold text-gray-800 truncate w-full text-center break-all px-1"
                                    style={{ fontSize: 'clamp(1rem, 2vw, 1.75rem)' }}>
                                    {producto.codigoBarras || producto.codigoInterno || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {producto.observaciones && (
                        <div className={`flex-[8] bg-white border-2 border-orange-200 rounded-3xl p-4 shadow-lg w-full relative overflow-visible ${animationClass}`}
                            style={{ animationDelay: '0.2s' }}>
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                                <div className="text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider"
                                    style={{ background: ACCENT }}>Detalles</div>
                            </div>
                            <div className="h-full flex flex-col justify-center items-center text-center mt-1">
                                <Info className="w-8 h-8 mb-1" style={{ color: ACCENT }} strokeWidth={2.5} />
                                <p className="text-base text-gray-700 leading-snug font-medium line-clamp-2 px-2">{producto.observaciones}</p>
                            </div>
                        </div>
                    )}
                </div>

                {showControls && (
                    <div className="absolute inset-x-0 bottom-20 flex justify-center gap-4 z-50">
                        <button onClick={goToPrev} className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm"><ChevronLeft className="w-6 h-6" /></button>
                        <button onClick={() => setIsPaused(!isPaused)} className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm">{isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}</button>
                        <button onClick={goToNext} className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm"><ChevronRight className="w-6 h-6" /></button>
                    </div>
                )}
            </main>

            <footer className="text-white h-[8vh] flex-none z-10 relative overflow-hidden" style={{ background: ACCENT }}>
                <div className="h-full px-6 flex justify-between items-center text-xs font-medium relative z-10">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-bold"><Store className="w-4 h-4" /><span>Electro Caja</span></div>
                        <span className="opacity-80 text-orange-100">Sistema de Inventario</span>
                    </div>
                    {tasaCambio && (
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <img src="/BCV1.png" alt="BCV" className="h-8 w-auto object-contain drop-shadow-lg"
                                onError={(e) => { e.target.style.display = 'none'; }} />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] opacity-90 leading-tight">Tasa BCV</span>
                                <span className="font-black text-lg leading-tight">{parseFloat(tasaCambio).toFixed(2)} Bs./$</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full border border-white/10">
                            {isOnline ? <><Wifi className="w-4 h-4" /><span>En Línea</span></> : <><WifiOff className="w-4 h-4 text-red-200" /><span>Sin conexión</span></>}
                        </div>
                        <div className="text-right">
                            <div className="font-bold">{new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }).toUpperCase()}</div>
                            <div className="text-[10px] opacity-80">{new Date().getFullYear()}</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DisplayCatPage;
