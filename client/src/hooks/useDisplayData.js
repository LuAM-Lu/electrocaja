// client/src/hooks/useDisplayData.js
// 🔁 Hook compartido para todas las pantallas de display
import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '../config/api';
import io from 'socket.io-client';

/**
 * Calcula el estilo CSS para rotar la pantalla completa.
 * Para 90°/270° ajusta width/height para que llene el viewport.
 */
export const buildRotationStyle = (degrees = 0) => {
    const transition = { transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' };
    if (!degrees || degrees === 0) return transition;
    const is90or270 = degrees === 90 || degrees === 270;
    return {
        ...transition,
        transform: `rotate(${degrees}deg)`,
        transformOrigin: 'center center',
        ...(is90or270 && {
            width: '100vh',
            height: '100vw',
            position: 'fixed',
            top: 'calc((100vh - 100vw) / 2)',
            left: 'calc((100vw - 100vh) / 2)',
            overflow: 'hidden',
        })
    };
};

/** Lee rotación inicial desde URL: ?v=1 → 90°, ?r=180 → 180° */
const getInitialRotation = () => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('r')) return parseInt(p.get('r')) || 0;
    if (p.get('v') === '1') return 90;
    return 0;
};

/**
 * @param {object} options
 * @param {string} options.configEndpoint  - Endpoint de config (ej: '/display/config')
 * @param {string} options.screenId        - Identificador de pantalla para socket ('main' | 'cat' | 'slides')
 */
export const useDisplayData = ({ configEndpoint = '/display/config', screenId = 'main' } = {}) => {
    const [productos, setProductos] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({
        activo: true,
        nombre: 'Pantalla Principal',
        tiempoRotacion: 10,
        soloDestacados: false,
        soloConStock: true,
        tipos: [],
        categorias: []
    });
    const [isPaused, setIsPaused] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [tasaCambio, setTasaCambio] = useState(null);
    const [rotation, setRotation] = useState(getInitialRotation);
    const [animationClass, setAnimationClass] = useState('animate-fadeIn');
    const [loadingPhrase, setLoadingPhrase] = useState('Iniciando sistema...');

    // ── Frases de carga
    useEffect(() => {
        if (!loading) return;
        const frases = [
            'Preparando vitrina digital...',
            'Organizando productos destacados...',
            'Consultando mejores precios...',
            'Abrillantando píxeles...',
            'Sincronizando inventario...',
            'Cargando ofertas exclusivas...'
        ];
        let i = 0;
        const interval = setInterval(() => {
            setLoadingPhrase(frases[i]);
            i = (i + 1) % frases.length;
        }, 800);
        return () => clearInterval(interval);
    }, [loading]);

    // ── Cargar configuración del endpoint específico
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}${configEndpoint}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) setConfig(json.data);
                }
            } catch (err) {
                console.error('Error cargando config:', err);
            }
        };
        loadConfig();
    }, [configEndpoint]);

    // ── Fetch de productos y tasa
    const fetchContent = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (config.soloDestacados) params.append('destacado', 'true');
            if (config.soloConStock) params.append('stock_min', '1');
            if (config.tipos?.length) params.append('tipos', config.tipos.join(','));
            if (config.categorias?.length) params.append('categorias', config.categorias.join(','));
            params.append('pageSize', '50');
            params.append('activo', 'true');

            const [tasaData, prodData] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}/tasas`).then(r => r.json()),
                fetch(`${API_CONFIG.BASE_URL}/display/productos?${params}`).then(r => r.json())
            ]);

            if (tasaData.success && tasaData.data) {
                setTasaCambio(tasaData.data.bcv || tasaData.data.promedio);
            }
            if (prodData.success) {
                setProductos(prodData.data || []);
                setIsOnline(true);
            }
        } catch (err) {
            console.error('Error fetch display:', err);
            setIsOnline(false);
        } finally {
            setLoading(false);
        }
    }, [config.soloDestacados, config.soloConStock, config.tipos, config.categorias]);

    useEffect(() => {
        fetchContent();
        const interval = setInterval(fetchContent, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchContent]);

    // ── Socket.IO
    useEffect(() => {
        const socket = io(API_CONFIG.SOCKET_URL, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            // Enviar información detallada del dispositivo al conectar
            socket.emit('display:connect', {
                screenId,
                userAgent: navigator.userAgent,
                timestamp: new Date(),
                resolution: `${window.screen.width}x${window.screen.height}`,
                colorDepth: window.screen.colorDepth,
                language: navigator.language,
                platform: navigator.platform,
                rotation: rotation
            });
            setIsOnline(true);
        });
        socket.on('disconnect', () => setIsOnline(false));

        socket.on('display:config_updated', (payload) => {
            if (payload?.screen === screenId || payload?.screen === 'all') {
                setConfig(prev => ({ ...prev, ...payload.config }));
            }
        });

        // 🔄 Rotación en tiempo real
        socket.on('display:rotate', (payload) => {
            if (payload?.screenId === screenId || payload?.screenId === 'all') {
                setRotation(payload.degrees ?? 0);
            }
        });

        socket.on('inventario_actualizado', () => fetchContent());
        socket.on('display:toggle_pause', (paused) => setIsPaused(paused));

        return () => {
            socket.emit('display:disconnect');
            socket.disconnect();
        };
    }, [fetchContent, screenId]);

    // ── Rotación automática
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

    // ── Helpers de navegación
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

    // ── Formatear precio en Bs
    const formatPrecioBs = (precioUSD) => {
        if (!tasaCambio || !precioUSD) return { entero: '0', decimal: '00' };
        const precioBs = precioUSD * tasaCambio;
        const [entero, decimal] = precioBs.toFixed(2).split('.');
        return { entero: parseInt(entero).toLocaleString('es-VE'), decimal };
    };

    // ── URL de imagen
    const getImageUrl = (producto) => {
        if (producto?.imagenUrl) {
            if (producto.imagenUrl.startsWith('http')) return producto.imagenUrl;
            return `${API_CONFIG.BASE_URL.replace('/api', '')}${producto.imagenUrl}`;
        }
        return '/placeholder-product.png';
    };

    return {
        productos,
        currentIndex,
        setCurrentIndex,
        loading,
        config,
        isPaused,
        setIsPaused,
        isOnline,
        tasaCambio,
        animationClass,
        loadingPhrase,
        goToNext,
        goToPrev,
        formatPrecioBs,
        getImageUrl,
        fetchContent,
        rotation,
        setRotation
    };
};
