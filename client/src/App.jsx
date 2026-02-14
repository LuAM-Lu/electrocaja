// src/App.jsx (COMPLETO Y ORDENADO)
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import BloqueoOverlay from './components/BloqueoOverlay';
import BloqueoCojeModal from './components/BloqueoCojeModal';
import VistaPublicaServicio from './components/servicios/VistaPublicaServicio';
import DisplayPage from './pages/DisplayPage'; // 📺 Página de display/publicidad
import { useCajaStore } from './store/cajaStore';
import { useAuthStore } from './store/authStore';
import { useSocketEvents } from './hooks/useSocketEvents';
import { useNotificacionesStore } from './store/notificacionesStore';
import { useInventarioStore } from './store/inventarioStore';
import toast, { Toaster } from './utils/toast.jsx';
import { api } from './config/api';

function App() {
  // ===================================
  //  ESTADOS LOCALES
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
  //  STORES
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
  //  SOCKET EVENTS
  // ===================================
  //  HOOK PARA MANEJAR SOCKET.IO Y BLOQUEOS
  const {
    emitirEvento,
    usuariosBloqueados,
    motivoBloqueo,
    usuarioCerrando,
    socketConnected
  } = useSocketEvents();


  //  CONECTAR SOCKET AL CAJASTORE (EVITAR DUPLICADOS)
  useEffect(() => {
    if (emitirEvento && !window.socketConnectedToCajaStore) {
      window.socketConnectedToCajaStore = true;

      import('./store/cajaStore').then(({ conectarSocketAlStore }) => {
        conectarSocketAlStore(emitirEvento);
      });
    }
  }, [emitirEvento]);

  //  LISTENER GLOBAL PARA EVENTOS DE INVENTARIO EN TIEMPO REAL
  useEffect(() => {
    const { socket } = useAuthStore.getState();

    if (!socket || typeof socket.on !== 'function') {
      console.log('⚠️ [App] Socket no disponible para listener de inventario');
      return;
    }

    const handleInventarioActualizado = async (data) => {
      console.log('📦 [App] Evento inventario_actualizado recibido:', data.operacion, data.producto?.descripcion);

      const { usuario: usuarioActual } = useAuthStore.getState();
      const { obtenerInventario, sincronizarStockDesdeWebSocket } = useInventarioStore.getState();

      // Actualizar el stock específico del producto si viene en el evento
      if (data.producto?.id && sincronizarStockDesdeWebSocket) {
        sincronizarStockDesdeWebSocket({
          productoId: data.producto.id,
          stockTotal: data.producto.stock,
          stockReservado: 0, // No tenemos esta info en el evento
          stockDisponible: data.producto.stock,
          operacion: data.operacion
        });
      }

      // Recargar inventario completo para asegurar sincronización
      // Solo si no hay modales críticos abiertos
      const modalProtectionKeys = [
        'itemFormModalActive',
        'ingresoModalActive',
        'productViewModalActive'
      ];

      const anyModalActive = modalProtectionKeys.some(key =>
        sessionStorage.getItem(key) === 'true'
      );

      if (!anyModalActive) {
        await obtenerInventario();
      } else {
        // Marcar que hay actualización pendiente
        sessionStorage.setItem('inventarioPendienteActualizar', 'true');
      }

      // Mostrar toast solo si es de otro usuario
      if (data.usuario && data.usuario !== usuarioActual?.nombre) {
        switch (data.operacion) {
          case 'VENTA_PROCESADA':
            toast.info(`📦 ${data.producto?.descripcion}: Stock actualizado (-${data.cantidad} unidades)`, { duration: 3000 });
            break;
          case 'STOCK_DEVUELTO':
            toast.success(`↩️ ${data.producto?.descripcion}: Stock devuelto (+${data.cantidad} unidades)`, { duration: 3000 });
            break;
          default:
            toast.info(`📦 ${data.producto?.descripcion}: Inventario actualizado`, { duration: 2000 });
            break;
        }
      }
    };

    // Registrar listener global
    console.log('✅ [App] Registrando listener global de inventario_actualizado');
    socket.on('inventario_actualizado', handleInventarioActualizado);

    return () => {
      console.log('🧹 [App] Limpiando listener global de inventario_actualizado');
      socket.off('inventario_actualizado', handleInventarioActualizado);
    };
  }, [socketConnected]);

  // ===================================
  //  INFO DE SESIÓN
  // ===================================
  const sessionInfo = getSessionInfo();

  // ===================================
  //  FUNCIONES DE NOTIFICACIONES
  // ===================================
  const initializeNotifications = async () => {
    const { usuario } = useAuthStore.getState();
    const { setupSocketListeners, addNotificacion } = useNotificacionesStore.getState();

    if (!usuario) return;

    // Configurar listeners de Socket.IO
    setupSocketListeners();

    // Verificar inventario para stock bajo
    await checkInventoryAlerts();
  };

  const checkInventoryAlerts = async () => {
    try {
      const { inventario, obtenerStockBajo, obtenerInventario } = useInventarioStore.getState();
      const { notificaciones, addNotificacion } = useNotificacionesStore.getState();

      if (inventario.length === 0) {
        await obtenerInventario();
      }

      const stockBajo = obtenerStockBajo(10);

      //  VERIFICAR SI YA EXISTE NOTIFICACIÓN DE STOCK BAJO
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
      }
    } catch (error) {
      console.error(' Error verificando stock:', error);
    }
  };

  // ===================================
  //  FUNCIONES DE MANEJO
  // ===================================
  const handleLoginSuccess = () => {
    setShowLogin(false);
    initialize();
  };

  // ===================================
  //  EFECTOS PRINCIPALES
  // ===================================


  //  EFECTO PRINCIPAL: Verificar autenticación al cargar
  useEffect(() => {
    let mounted = true;

    //  CONFIGURAR SISTEMA DE EVENTOS GLOBALES
    window.emitirEventoGlobal = (evento, datos) => {
      const eventoCustom = new CustomEvent(evento, { detail: datos });
      window.dispatchEvent(eventoCustom);
    };

    //  LISTENER PARA TOKEN EXPIRADO
    const handleTokenExpired = (event) => {
      useAuthStore.getState().handleTokenExpired();
    };

    window.addEventListener('token-expired', handleTokenExpired);

    const checkAuth = async () => {
      if (!mounted) return;

      const tokenExists = localStorage.getItem('auth-token');
      if (tokenExists) {
        try {
          const authResult = await useAuthStore.getState().checkAuth();

          if (!mounted) return;

          if (authResult) {
            setShowLogin(false);
            setIsLoading(false);
            initialize();

            //  PREVENIR DUPLICADOS
            if (!window.notificationsInitialized) {
              window.notificationsInitialized = true;
              setTimeout(() => {
                initializeNotifications();
              }, 2000);
            }
          } else {
            if (mounted) {
              setShowLogin(true);
              setIsLoading(false);
            }
          }
        } catch (error) {
          console.error(' Error en checkAuth:', error);
          if (mounted) setShowLogin(true);
        }
      } else {
        if (mounted) setShowLogin(true);
      }

      if (mounted) setIsLoading(false);
    };
    const timer = setTimeout(checkAuth, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      window.removeEventListener('token-expired', handleTokenExpired); //  LÍNEA NUEVA
    };
  }, []);

  //  Escuchar cambios en isAuthenticated (para logout)
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
    }
  }, [isAuthenticated]);

  //  Auto-verificación de sesión cada minuto
  useEffect(() => {
    if (!isAuthenticated || showLogin) return; //  AGREGAR showLogin

    const interval = setInterval(() => {
      const sesionValida = verificarSesion();
      if (!sesionValida) {
        setShowLogin(true);
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, verificarSesion]); //  AGREGAR showLogin

  //  ✅ OPTIMIZACIÓN: useRef para evitar re-suscripciones de event listeners
  const extenderSesionRef = useRef(extenderSesion);

  useEffect(() => {
    extenderSesionRef.current = extenderSesion;
  }, [extenderSesion]);

  //  Extender sesión en actividad del usuario (CON DEBOUNCE)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId;
    const handleActivity = () => {
      //  DEBOUNCE: Solo ejecutar después de 5 segundos de inactividad
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        extenderSesionRef.current(); // ✅ Usa ref estable
      }, 5000);
    };

    const eventos = [
      { type: 'click', options: {} },
      { type: 'keydown', options: {} },
      { type: 'mousemove', options: { passive: true } }, // ✅ Passive listener
      { type: 'scroll', options: { passive: true } }      // ✅ Passive listener
    ];

    eventos.forEach(({ type, options }) => {
      document.addEventListener(type, handleActivity, options);
    });

    return () => {
      eventos.forEach(({ type }) => {
        document.removeEventListener(type, handleActivity);
      });
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated]); // ✅ Solo depende de isAuthenticated

  //  Verificar estado WhatsApp periódicamente
  useEffect(() => {
    //  SOLO EJECUTAR SI ESTÁ AUTENTICADO
    if (!isAuthenticated) return;

    const checkWhatsApp = async () => {
      try {
        const response = await api.get('/whatsapp/estado');
        const conectado = response.data.data?.conectado || false;
        const nuevoEstado = conectado ? 'ONLINE' : 'OFFLINE';

        setPanelStats(prev => {
          if (prev.whatsappStatus !== nuevoEstado) {
            console.log(' WhatsApp cambió de', prev.whatsappStatus, 'a', nuevoEstado);
            return {
              ...prev,
              whatsappStatus: nuevoEstado
            };
          }
          return prev;
        });
      } catch (error) {
        console.warn(' Error verificando WhatsApp - manteniendo estado anterior');
      }
    };

    const whatsappInterval = setInterval(checkWhatsApp, 30000);
    return () => clearInterval(whatsappInterval);
  }, [isAuthenticated]); //  AGREGAR DEPENDENCIA

  //  Actualizar stats cada 10 segundos
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

  //  Shortcut para panel debug: Ctrl + Shift + D
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setShowDebugPanel(prev => !prev);

        if (!showDebugPanel) {
          toast.success('Panel debug activado', {
            duration: 2000,
          });
        } else {
          toast.success('Panel debug desactivado', {
            duration: 2000,
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
  //  RENDERIZADO CONDICIONAL
  // ===================================

  //  Pantalla de carga inicial
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
      </>
    );
  }

  // Verificar si estamos en una ruta pública (no requiere autenticación)
  const location = window.location.pathname;
  const esRutaPublica = location.startsWith('/servicio/') || location === '/display';

  //  Mostrar login si no está autenticado y no es ruta pública
  if ((!isAuthenticated || showLogin) && !esRutaPublica) {
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
      </>
    );
  }


  // ===================================
  //  APP PRINCIPAL
  // ===================================
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública para seguimiento de servicios */}
        <Route path="/servicio/:token" element={<VistaPublicaServicio />} />

        {/* 📺 Ruta pública para display/publicidad en TV */}
        <Route path="/display" element={<DisplayPage />} />

        {/* Ruta principal de la aplicación */}
        <Route path="*" element={
          <>
            {!isAuthenticated ? (
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
              </>
            ) : (
              <>
                <div className="min-h-screen bg-gray-100 flex flex-col">
                  <Header />
                  <Dashboard emitirEvento={emitirEvento} />
                  <Footer />
                </div>

                {/*  Overlay de bloqueo */}
                <BloqueoOverlay
                  usuariosBloqueados={usuariosBloqueados}
                  motivoBloqueo={motivoBloqueo}
                  usuarioCerrando={usuarioCerrando}
                />

                {/*  MODAL DE BLOQUEO POR CAJA PENDIENTE - MÁXIMA PRIORIDAD */}
                {sistemaBloquedadoPorCaja && cajaPendienteCierre && (
                  <BloqueoCojeModal
                    cajaPendiente={cajaPendienteCierre}
                    esResponsable={usuario?.id === cajaPendienteCierre?.usuarioResponsableId}
                  />
                )}
              </>
            )}
          </>
        } />
      </Routes>

      {/* Componentes globales */}
      {showDebugPanel && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-50 text-xs max-w-xs border border-gray-700">
          <div className="font-bold mb-2 text-yellow-400">Debug Panel</div>
          <div className="space-y-1">
            <div className="text-green-400 flex items-center space-x-2">
              <span>✅ Conectado:</span>
              <span>{socketConnected ? 'Sí' : 'No'}</span>
            </div>
            <div className="text-blue-400 flex items-center space-x-2">
              <span>🔐 Autenticado:</span>
              <span>{isAuthenticated ? 'Sí' : 'No'}</span>
            </div>
            <div className="text-purple-400 flex items-center space-x-2">
              <span>👤 Usuario:</span>
              <span>{usuario?.nombre || 'N/A'}</span>
            </div>
            <div className="text-cyan-400 flex items-center space-x-2">
              <span>📦 Caja:</span>
              <span>{cajaActual?.estado || 'N/A'}</span>
            </div>
            <div className="text-orange-400 flex items-center space-x-2">
              <span>⏱️ Uptime:</span>
              <span>{Math.floor(panelStats.uptime / 60)}m {panelStats.uptime % 60}s</span>
            </div>
            <div className="text-pink-400 flex items-center space-x-2">
              <span>💾 RAM:</span>
              <span>{panelStats.ram.toFixed(2)} MB</span>
            </div>
            <div className="text-indigo-400 flex items-center space-x-2">
              <span>🌐 Online:</span>
              <span>{panelStats.online ? 'Sí' : 'No'}</span>
            </div>
            <div className="text-yellow-400 flex items-center space-x-2">
              <span>📱 WhatsApp:</span>
              <span>{panelStats.whatsappStatus}</span>
            </div>
            <div className="text-gray-300 flex items-center space-x-2">
              <span>🖥️ Dispositivo:</span>
              <span>{(() => {
                const ua = navigator.userAgent;
                if (/Mobile|Android|iPhone|iPad/.test(ua)) return 'Móvil';
                if (/Tablet/.test(ua)) return 'Tablet';
                return 'Desktop';
              })()}</span>
            </div>
            <div className="text-pink-400 flex items-center space-x-2">
              <span></span>
              <span>{screen.width}x{screen.height}</span>
            </div>
            {sessionInfo.socketId && (
              <div className="text-gray-300 flex items-center space-x-2">
                <span></span>
                <span>{sessionInfo.socketId.substring(0, 8)}...</span>
              </div>
            )}
            {usuariosBloqueados && (
              <div className="text-red-300 border-t border-gray-600 pt-1 mt-2 flex items-center space-x-2">
                <span></span>
                <span>BLOQUEADO: {motivoBloqueo.substring(0, 15)}...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <Toaster />
    </BrowserRouter>
  );
}

export default App;
