// src/App.jsx (COMPLETO Y ORDENADO)
import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import BloqueoOverlay from './components/BloqueoOverlay';
import BloqueoCojeModal from './components/BloqueoCojeModal';
import { useCajaStore } from './store/cajaStore';
import { useAuthStore } from './store/authStore';
import { useSocketEvents } from './hooks/useSocketEvents';
import { useNotificacionesStore } from './store/notificacionesStore';
import { useInventarioStore } from './store/inventarioStore';
import toast, { Toaster } from 'react-hot-toast';
import { api } from './config/api';

function App() {
  // ===================================
  // 🔧 ESTADOS LOCALES
  // ===================================
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [panelStats, setPanelStats] = useState({
    uptime: 0,
    ram: 0,
    online: navigator.onLine,
    whatsappStatus: 'OFFLINE'
  });

  // ===================================
  // 🏪 STORES
  // ===================================
  const { initialize } = useCajaStore();
  const { 
    isAuthenticated, 
    verificarSesion, 
    extenderSesion, 
    getSessionInfo,
    isSocketConnected,
    usuario,
    cajaPendienteCierre,
  sistemaBloquedadoPorCaja
  } = useAuthStore();
  const { cajaActual } = useCajaStore();
  
  // ===================================
  // 🔔 SOCKET EVENTS
  // ===================================
 // 🆕 HOOK PARA MANEJAR SOCKET.IO Y BLOQUEOS
  const { 
    emitirEvento,
    usuariosBloqueados, 
    motivoBloqueo, 
    usuarioCerrando, 
    socketConnected 
  } = useSocketEvents();

// 🔌 CONECTAR SOCKET AL CAJASTORE (EVITAR DUPLICADOS)
useEffect(() => {
  if (emitirEvento && !window.socketConnectedToCajaStore) {
    window.socketConnectedToCajaStore = true;
    
    import('./store/cajaStore').then(({ conectarSocketAlStore }) => {
      conectarSocketAlStore(emitirEvento);
      console.log('🔌 Socket conectado al cajaStore desde App.jsx');
    });
  }
}, [emitirEvento]);

  // ===================================
  // 📊 INFO DE SESIÓN
  // ===================================
  const sessionInfo = getSessionInfo();

  // ===================================
  // 🔔 FUNCIONES DE NOTIFICACIONES
  // ===================================
  const initializeNotifications = async () => {
    const { usuario } = useAuthStore.getState();
    const { setupSocketListeners, addNotificacion } = useNotificacionesStore.getState();
    
    if (!usuario) return;
    
    console.log('🔔 Inicializando sistema de notificaciones...');
    
    // Configurar listeners de Socket.IO
    setupSocketListeners();
    
    // Verificar inventario para stock bajo
    await checkInventoryAlerts();
    
    // 🔧 COMENTADO - Notificación innecesaria
// addNotificacion({
//   tipo: 'sistema',
//   titulo: 'Sistema iniciado',
//   descripcion: `Bienvenido ${usuario.nombre}. Sistema de notificaciones activo.`,
//   accionable: false
// });
    
    console.log('✅ Sistema de notificaciones inicializado');
  };

  const checkInventoryAlerts = async () => {
  try {
    const { inventario, obtenerStockBajo, obtenerInventario } = useInventarioStore.getState();
    const { notificaciones, addNotificacion } = useNotificacionesStore.getState();
    
    console.log('📦 Verificando inventario actual:', inventario.length, 'productos');
    
    if (inventario.length === 0) {
      console.log('📦 Cargando inventario desde backend...');
      await obtenerInventario();
    }
    
    const stockBajo = obtenerStockBajo(10);
    console.log('⚠️ Stock bajo detectado:', stockBajo.length, 'productos');
    
    // 🔧 VERIFICAR SI YA EXISTE NOTIFICACIÓN DE STOCK BAJO
    const yaExisteStockBajo = notificaciones.some(n => 
      n.tipo === 'stock_bajo' && !n.leida
    );
    
    if (stockBajo.length > 0 && !yaExisteStockBajo) {
      addNotificacion({
        tipo: 'stock_bajo',
        titulo: `${stockBajo.length} producto${stockBajo.length > 1 ? 's' : ''} con stock bajo`,
        descripcion: stockBajo.map(p => `${p.descripcion} (${p.stock} unidades)`).join(', ').substring(0, 100),
        accionable: true,
        datos: { productos: stockBajo }
      });
      console.log('⚠️ Notificación stock bajo generada:', stockBajo.length, 'productos');
    } else if (yaExisteStockBajo) {
      console.log('ℹ️ Ya existe notificación de stock bajo, omitiendo duplicado');
    }
  } catch (error) {
    console.error('❌ Error verificando stock:', error);
  }
};

  // ===================================
  // 🔧 FUNCIONES DE MANEJO
  // ===================================
 const handleLoginSuccess = () => {
  console.log('✅ Login exitoso - inicializando sin recargar página');
  setShowLogin(false);
  initialize();
  
  // 🔧 NO MANIPULAR URL PARA EVITAR COMPORTAMIENTOS INESPERADOS
  console.log('✅ App inicializada correctamente');
};

  // ===================================
  // 🔄 EFECTOS PRINCIPALES
  // ===================================

  // 🔧 DEBUG: Detectar recargas
  useEffect(() => {
    console.log('🔧 APP.JSX MONTADO - Detectando si es recarga');
    console.log('🔧 performance.navigation.type:', performance.navigation?.type);
    console.log('🔧 document.referrer:', document.referrer);
    
    if (performance.navigation?.type === 1) {
      console.log('🚨 PÁGINA RECARGADA - Esto no debería pasar después del login');
    }
  }, []);

// 🔐 EFECTO PRINCIPAL: Verificar autenticación al cargar
useEffect(() => {
  let mounted = true;
 
  // 🆕 CONFIGURAR SISTEMA DE EVENTOS GLOBALES
  window.emitirEventoGlobal = (evento, datos) => {
    console.log('🌐 Evento global emitido:', evento, datos);
    const eventoCustom = new CustomEvent(evento, { detail: datos });
    window.dispatchEvent(eventoCustom);
  };
  console.log('✅ Sistema de eventos globales inicializado');
 
  // 🆕 LISTENER PARA TOKEN EXPIRADO
  const handleTokenExpired = (event) => {
    console.log('📡 Evento token-expired recibido:', event.detail);
    useAuthStore.getState().handleTokenExpired();
  };

  window.addEventListener('token-expired', handleTokenExpired);
 
  const checkAuth = async () => {
    if (!mounted) return;
   
    console.log('🔧 APP.JSX - Ejecutando checkAuth (una sola vez)...');
   
    const tokenExists = localStorage.getItem('auth-token');
    if (tokenExists) {
      console.log('🔧 Token encontrado, ejecutando checkAuth del store...');
      try {
        const authResult = await useAuthStore.getState().checkAuth();
       
        if (!mounted) return;
       
        if (authResult) {
        console.log('✅ CheckAuth exitoso - usuario reconectado');
        setShowLogin(false);
        setIsLoading(false); // 🔧 AGREGAR ESTA LÍNEA
        initialize();
         
          // 🔔 PREVENIR DUPLICADOS
          if (!window.notificationsInitialized) {
            window.notificationsInitialized = true;
            setTimeout(() => {
              initializeNotifications();
            }, 2000);
          } // Dar más tiempo para que carguen los stores
        } else {
          console.log('❌ CheckAuth falló - mostrar login');
          if (mounted) {
            setShowLogin(true);
            setIsLoading(false); // 🔧 AGREGAR ESTA LÍNEA
          }
        }
      } catch (error) {
        console.error('❌ Error en checkAuth:', error);
        if (mounted) setShowLogin(true);
      }
    } else {
      console.log('⚠️ No hay token - mostrar login');
      if (mounted) setShowLogin(true);
    }
   
    if (mounted) setIsLoading(false);
  };
  const timer = setTimeout(checkAuth, 100);
 
  return () => {
    mounted = false;
    clearTimeout(timer);
    window.removeEventListener('token-expired', handleTokenExpired); // 🆕 LÍNEA NUEVA
  };
}, []);

  // 👤 Escuchar cambios en isAuthenticated (para logout)
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
    }
  }, [isAuthenticated]);

  // ⏰ Auto-verificación de sesión cada minuto
    useEffect(() => {
  if (!isAuthenticated || showLogin) return; // 🔧 AGREGAR showLogin

    const interval = setInterval(() => {
      const sesionValida = verificarSesion();
      if (!sesionValida) {
        setShowLogin(true);
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, verificarSesion]); // 🔧 AGREGAR showLogin

  // 🖱️ Extender sesión en actividad del usuario (CON DEBOUNCE)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId;
    const handleActivity = () => {
      // 🚀 DEBOUNCE: Solo ejecutar después de 5 segundos de inactividad
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        extenderSesion();
      }, 5000);
    };

    const eventos = ['click', 'keydown', 'mousemove', 'scroll'];
    
    eventos.forEach(evento => {
      document.addEventListener(evento, handleActivity);
    });

    return () => {
      eventos.forEach(evento => {
        document.removeEventListener(evento, handleActivity);
      });
      clearTimeout(timeoutId); // 🆕 LIMPIAR TIMEOUT
    };
  }, [isAuthenticated, extenderSesion]);

 // 📱 Verificar estado WhatsApp periódicamente
  useEffect(() => {
    // 🛡️ SOLO EJECUTAR SI ESTÁ AUTENTICADO
    if (!isAuthenticated) return;

    const checkWhatsApp = async () => {
      try {
        const response = await api.get('/whatsapp/estado');
        const conectado = response.data.data?.conectado || false;
        const nuevoEstado = conectado ? 'ONLINE' : 'OFFLINE';
        
        setPanelStats(prev => {
          if (prev.whatsappStatus !== nuevoEstado) {
            console.log('📱 WhatsApp cambió de', prev.whatsappStatus, 'a', nuevoEstado);
            return {
              ...prev,
              whatsappStatus: nuevoEstado
            };
          }
          return prev;
        });
      } catch (error) {
        console.warn('❌ Error verificando WhatsApp - manteniendo estado anterior');
      }
    };

    const whatsappInterval = setInterval(checkWhatsApp, 30000);
    return () => clearInterval(whatsappInterval);
  }, [isAuthenticated]); // 🔧 AGREGAR DEPENDENCIA

  // 📊 Actualizar stats cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setPanelStats(prev => ({
        ...prev,
        uptime: Math.floor(performance.now() / 1000 / 60),
        ram: Math.round((performance.memory?.usedJSHeapSize || 0) / 1024 / 1024),
        online: navigator.onLine
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // 🔧 Shortcut para panel debug: Ctrl + Shift + D
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setShowDebugPanel(prev => !prev);
        
        if (!showDebugPanel) {
          toast.success('Panel debug activado', { 
            duration: 2000,
            icon: '🔧' 
          });
        } else {
          toast.success('Panel debug desactivado', { 
            duration: 2000,
            icon: '❌' 
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDebugPanel]);

  // ===================================
  // 🎨 RENDERIZADO CONDICIONAL
  // ===================================

  // 🔄 Pantalla de carga inicial
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-200">
              <img
                src="/favicon-96x96.png"
                alt="Electro Caja"
                className="h-16 w-16 mx-auto mb-4 rounded-full shadow-lg"
              />
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Electro Caja</h1>
              <p className="text-gray-600 text-sm">Iniciando sistema...</p>
            </div>
          </div>
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </>
    );
  }

  // 🔐 Mostrar login si no está autenticado
  if (!isAuthenticated || showLogin) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-200">
              <img
                src="/favicon-96x96.png"
                alt="Electro Caja"
                className="h-16 w-16 mx-auto mb-4 rounded-full shadow-lg"
              />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Electro Caja</h1>
              <p className="text-gray-600 text-sm">Sistema de control de ventas</p>
              <div className="mt-4 text-blue-600 text-sm">
                Esperando inicio de sesión...
              </div>
            </div>
          </div>
        </div>

        <LoginModal
          isOpen={true}
          onClose={handleLoginSuccess}
        />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </>
    );
  }


  // ===================================
  // 🏠 APP PRINCIPAL
  // ===================================
  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header />
        <Dashboard emitirEvento={emitirEvento} />
        <Footer />
      </div>
      
      {/* 🚫 Overlay de bloqueo */}
      <BloqueoOverlay 
        usuariosBloqueados={usuariosBloqueados}
        motivoBloqueo={motivoBloqueo}
        usuarioCerrando={usuarioCerrando}
      />

      {/* 🚨 MODAL DE BLOQUEO POR CAJA PENDIENTE - MÁXIMA PRIORIDAD */}
      {sistemaBloquedadoPorCaja && cajaPendienteCierre && (
        <BloqueoCojeModal
          cajaPendiente={cajaPendienteCierre}
          esResponsable={usuario?.id === cajaPendienteCierre?.usuarioResponsableId}
        />
      )}

      
      
      {/* 🔧 Panel debug avanzado (Ctrl+Shift+D) */}
      {showDebugPanel && sessionInfo && (
        <div className="fixed bottom-4 left-4 z-[60] bg-black/90 text-white text-xs p-3 rounded-lg font-mono max-w-sm border border-gray-700 shadow-2xl">
          <div className="space-y-1">
            <div className="text-amber-400 font-semibold border-b border-gray-600 pb-1 mb-2 flex items-center">
              🔧 PANEL ADMIN
              <div className="ml-auto text-gray-400 flex items-center space-x-1">
                <span title="Ctrl+Shift+D para ocultar" className="text-xs">👑</span>
                <span>v1.0.0</span>
              </div>
            </div>
            
            {/* Estado Socket */}
            <div className={`flex items-center space-x-2 ${
              socketConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              <span>{socketConnected ? '🟢' : '🔴'}</span>
              <span>Socket: {socketConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            
            {/* Información de Sesión */}
            <div className="text-blue-400 flex items-center space-x-2">
              <span>👤</span>
              <span>{sessionInfo.usuario?.nombre}</span>
            </div>
            
            {/* Usuarios Conectados */}
            <div className="text-yellow-400 flex items-center space-x-2">
              <span>📊</span>
              <span>Conectados: {sessionInfo.usuariosConectados}</span>
            </div>
            
            {/* Caja Actual */}
            <div className={`flex items-center space-x-2 ${
              cajaActual ? 'text-emerald-400' : 'text-gray-400'
            }`}>
              <span>💰</span>
              <span>Caja: {cajaActual ? 'ABIERTA' : 'CERRADA'}</span>
            </div>
            
            {/* Estado Base de Datos */}
            <div className="text-purple-400 flex items-center space-x-2">
              <span>🗄️</span>
              <span>BD: POSTGRESQL</span>
            </div>

            {/* Recursos del Sistema */}
            <div className="text-cyan-400 flex items-center space-x-2">
              <span>⚡</span>
              <span>RAM: {panelStats.ram}MB</span>
            </div>

            <div className="text-orange-400 flex items-center space-x-2">
              <span>⏱️</span>
              <span>Uptime: {panelStats.uptime}min</span>
            </div>

            {/* Conexión Online */}
            <div className={`flex items-center space-x-2 ${
              navigator.onLine ? 'text-green-400' : 'text-red-400'
            }`}>
              <span>{navigator.onLine ? '🌐' : '📶'}</span>
              <span>Internet: {navigator.onLine ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* Estado WhatsApp */}
            <div className={`flex items-center space-x-2 ${
              panelStats.whatsappStatus === 'ONLINE' ? 'text-green-400' : 
              panelStats.whatsappStatus === 'ERROR' ? 'text-red-400' : 'text-gray-400'
            }`}>
              <span>📱</span>
              <span>WhatsApp: {panelStats.whatsappStatus}</span>
            </div>

            {/* Navegador y Dispositivo */}
            <div className="text-indigo-400 flex items-center space-x-2">
              <span>🖥️</span>
              <span>{(() => {
                const ua = navigator.userAgent;
                if (ua.includes('Chrome')) return 'Chrome';
                if (ua.includes('Firefox')) return 'Firefox';
                if (ua.includes('Safari')) return 'Safari';
                if (ua.includes('Edge')) return 'Edge';
                return 'Desconocido';
              })()}</span>
            </div>

            <div className="text-violet-400 flex items-center space-x-2">
              <span>📱</span>
              <span>{(() => {
                const ua = navigator.userAgent;
                if (/Mobi|Android/i.test(ua)) return 'Móvil';
                if (/Tablet|iPad/i.test(ua)) return 'Tablet';
                return 'Desktop';
              })()}</span>
            </div>

            {/* Resolución de Pantalla */}
            <div className="text-pink-400 flex items-center space-x-2">
              <span>📺</span>
              <span>{screen.width}x{screen.height}</span>
            </div>

            
            
            {/* Socket ID */}
            {sessionInfo.socketId && (
              <div className="text-gray-300 flex items-center space-x-2">
                <span>🆔</span>
                <span>{sessionInfo.socketId.substring(0, 8)}...</span>
              </div>
            )}
            
            {/* Estado de Bloqueo */}
            {usuariosBloqueados && (
              <div className="text-red-300 border-t border-gray-600 pt-1 mt-2 flex items-center space-x-2">
                <span>🔒</span>
                <span>BLOQUEADO: {motivoBloqueo.substring(0, 15)}...</span>
              </div>
            )} 


          </div>
        </div>
      )}
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

export default App;