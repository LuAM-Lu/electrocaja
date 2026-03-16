// pages/DisplaySlidesPage.jsx
// 🖼️ Pantalla 3 – Slideshow de imágenes y videos (100% pantalla, sin overlays)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_CONFIG } from '../config/api';
import io from 'socket.io-client';
import { buildRotationStyle } from '../hooks/useDisplayData';

const ANIMATION_STYLES = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes kenBurns { from { transform: scale(1); } to { transform: scale(1.05); } }
.slide-fadeIn { animation: fadeIn 0.8s ease-in-out forwards; }
.slide-fadeOut { animation: fadeOut 0.5s ease-in-out forwards; }
.kb-anim { animation: kenBurns 12s ease-out forwards; }
`;

const DisplaySlidesPage = () => {
    const [slides, setSlides] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [config, setConfig] = useState({ activo: true, nombre: 'Publicidad', tiempoRotacion: 8 });
    const [loading, setLoading] = useState(true);
    const [fadeClass, setFadeClass] = useState('slide-fadeIn');
    const [isPaused, setIsPaused] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [rotation, setRotation] = useState(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get('r')) return parseInt(p.get('r')) || 0;
        if (p.get('v') === '1') return 90;
        return 0;
    });
    const videoRef = useRef(null);
    const hintTimer = useRef(null);

    // ── Cargar config
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}/display/slides/config`);
                const json = await res.json();
                if (json.success) setConfig(json.data);
            } catch (e) {
                console.error('Error config slides:', e);
            }
        };
        load();
    }, []);

    // ── Cargar lista de slides (imágenes/videos)
    const fetchSlides = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_CONFIG.BASE_URL}/display/slides`);
            const json = await res.json();
            if (json.success) {
                setSlides(json.data || []);
                setCurrentIdx(0);
            }
        } catch (e) {
            console.error('Error cargando slides:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSlides();
    }, [fetchSlides]);

    // ── Socket.IO para actualizaciones en tiempo real de slides
    useEffect(() => {
        const socket = io(API_CONFIG.SOCKET_URL, { transports: ['websocket', 'polling'] });
        socket.on('connect', () => {
            socket.emit('display:connect', {
                screenId: 'slides',
                userAgent: navigator.userAgent,
                timestamp: new Date(),
                resolution: `${window.screen.width}x${window.screen.height}`,
                platform: navigator.platform
            });
        });
        socket.on('display:config_updated', (payload) => {
            if (payload?.screen === 'slides' || payload?.screen === 'all') {
                setConfig(prev => ({ ...prev, ...payload.config }));
            }
        });
        // Rotación en tiempo real
        socket.on('display:rotate', (payload) => {
            if (payload?.screenId === 'slides' || payload?.screenId === 'all') {
                setRotation(payload.degrees ?? 0);
            }
        });
        socket.on('display:slides_updated', () => fetchSlides());
        return () => {
            socket.emit('display:disconnect');
            socket.disconnect();
        };
    }, [fetchSlides]);

    // Prevenir scroll en rotaciones 90°/270°
    useEffect(() => {
        document.body.style.overflow = (rotation === 90 || rotation === 270) ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [rotation]);

    // ── Avanzar al siguiente slide
    const advance = useCallback(() => {
        if (slides.length <= 1) return;
        setFadeClass('slide-fadeOut');
        setTimeout(() => {
            setCurrentIdx(prev => (prev + 1) % slides.length);
            setFadeClass('slide-fadeIn');
        }, 500);
    }, [slides.length]);

    // ── Retroceder
    const goBack = useCallback(() => {
        if (slides.length <= 1) return;
        setFadeClass('slide-fadeOut');
        setTimeout(() => {
            setCurrentIdx(prev => (prev - 1 + slides.length) % slides.length);
            setFadeClass('slide-fadeIn');
        }, 500);
    }, [slides.length]);

    // ── Rotación automática para IMÁGENES (los videos avanzan solos al terminar)
    useEffect(() => {
        if (isPaused || slides.length <= 1) return;
        const currentSlide = slides[currentIdx];
        if (!currentSlide) return;
        // Si es imagen, rotar automáticamente
        if (currentSlide.type === 'image') {
            const timer = setTimeout(advance, config.tiempoRotacion * 1000);
            return () => clearTimeout(timer);
        }
        // Si es video, el avance se maneja en onEnded del <video>
    }, [currentIdx, isPaused, slides, config.tiempoRotacion, advance]);

    // ── Mostrar hint de controles al pasar el mouse
    const handleMouseMove = () => {
        setShowHint(true);
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setShowHint(false), 3000);
    };

    useEffect(() => () => clearTimeout(hintTimer.current), []);

    // ── Teclado: ← → Espacio
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowRight') advance();
            if (e.key === 'ArrowLeft') goBack();
            if (e.key === ' ') setIsPaused(p => !p);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [advance, goBack]);

    // ── Loading
    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <style>{ANIMATION_STYLES}</style>
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-white/60 text-lg tracking-widest font-light">Cargando publicidad...</p>
                </div>
            </div>
        );
    }

    // ── Sin slides
    if (!slides.length) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <style>{ANIMATION_STYLES}</style>
                <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-white/20 mx-auto mb-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white/50 text-2xl font-light tracking-widest">Sin contenido</p>
                    <p className="text-white/30 text-sm mt-3 tracking-wider">Sube imágenes o videos desde el panel de control</p>
                </div>
            </div>
        );
    }

    const currentSlide = slides[currentIdx];
    const isVideo = currentSlide?.type === 'video';
    const mediaUrl = currentSlide
        ? `${API_CONFIG.BASE_URL.replace('/api', '')}${currentSlide.url}`
        : null;

    const rotStyle = buildRotationStyle(rotation);

    return (
        <div
            className="h-screen w-full bg-black overflow-hidden relative select-none cursor-none"
            onMouseMove={handleMouseMove}
            onClick={() => setIsPaused(p => !p)}
            style={rotStyle}
        >
            <style>{ANIMATION_STYLES}</style>

            {/* ── Slide actual */}
            <div key={currentIdx} className={`absolute inset-0 ${fadeClass}`}>
                {isVideo ? (
                    // ── VIDEO: autoplay, mute (necesario en TVs), avanza al terminar
                    <video
                        ref={videoRef}
                        src={mediaUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                        onEnded={advance}
                        style={{ pointerEvents: 'none' }}
                    />
                ) : (
                    // ── IMAGEN con efecto Ken Burns sutil
                    <div className="w-full h-full overflow-hidden">
                        <img
                            src={mediaUrl}
                            alt={`Slide ${currentIdx + 1}`}
                            className="w-full h-full object-cover kb-anim"
                            style={{ pointerEvents: 'none' }}
                            onError={(e) => {
                                e.target.src = '/placeholder-product.png';
                                e.target.classList.remove('kb-anim');
                            }}
                        />
                    </div>
                )}
            </div>

            {/* ── Indicador de progreso (mini, bottom) */}
            {slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIdx(idx); }}
                            className={`rounded-full transition-all duration-500 ${idx === currentIdx
                                ? 'w-6 h-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                                : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* ── Barra de progreso temporal para imágenes */}
            {!isVideo && !isPaused && slides.length > 1 && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full z-20">
                    <div
                        key={`progress-${currentIdx}`}
                        className="h-full bg-white/80"
                        style={{
                            animation: `slideInRight ${config.tiempoRotacion}s linear forwards`,
                        }}
                    />
                </div>
            )}

            {/* ── Overlay de controles (visible solo al mover mouse, 3s) */}
            {showHint && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {/* Flechas */}
                    <div className="absolute inset-y-0 left-0 flex items-center px-6 pointer-events-auto"
                        onClick={(e) => { e.stopPropagation(); goBack(); }}>
                        <div className="bg-black/40 hover:bg-black/60 text-white p-4 rounded-full backdrop-blur-sm transition-all cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </div>
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center px-6 pointer-events-auto"
                        onClick={(e) => { e.stopPropagation(); advance(); }}>
                        <div className="bg-black/40 hover:bg-black/60 text-white p-4 rounded-full backdrop-blur-sm transition-all cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>

                    {/* Pausa/Play indicador (centro) */}
                    <div className="absolute top-4 right-4 pointer-events-auto">
                        <div className="bg-black/40 text-white px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-medium flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
                            {isPaused ? 'Pausado' : 'Reproduciendo'} · {currentIdx + 1}/{slides.length}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Pausa overlay */}
            {isPaused && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-25 pointer-events-none">
                    <div className="bg-black/60 text-white rounded-full p-8 backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisplaySlidesPage;
