// store/authStore.js (CORREGIDO - SIN DUPLICADOS)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io } from 'socket.io-client';
import toast from '../utils/toast.jsx';
import { api, API_CONFIG, testConnection } from '../config/api.js';
import { bloqueoService } from '../services/bloqueoService.js';

// Socket URL desde configuración centralizada
const SOCKET_URL = API_CONFIG.BASE_URL.replace('/api', '');

console.log(' Socket URL determinada:', SOCKET_URL, 'para hostname:', window.location.hostname);

const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  CAJERO: 'cajero',
  VIEWER: 'viewer'
};

const PERMISOS = {
  ABRIR_CAJA: ['admin', 'supervisor'],
  CERRAR_CAJA: ['admin', 'supervisor'],
  ELIMINAR_TRANSACCION: ['admin', 'supervisor'],
  ARQUEO_CAJA: ['admin', 'supervisor'],
  VER_REPORTES: ['admin', 'supervisor', 'viewer'],
  GESTIONAR_INVENTARIO: ['admin', 'supervisor'],
  REALIZAR_VENTAS: ['admin', 'supervisor', 'cajero']
};

// Gestión de Socket.IO
let socket = null;

const initializeSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  console.log(' Inicializando socket con token...');

  socket = io(SOCKET_URL, {
    auth: { token },
    // ⚡ OPTIMIZACIÓN PARA BAJA LATENCIA
    transports: ['websocket'], // ⚡ Solo WebSocket (más rápido que polling)
    upgrade: false, // ⚡ No intentar upgrade desde polling
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000, // ⚡ Reducido de 20s a 10s
    // ⚡ NUEVAS OPCIONES PARA REDUCIR LATENCIA
    rememberUpgrade: true,
    perMessageDeflate: false, // ⚡ Deshabilitar compresión para mayor velocidad
    pingInterval: 10000, // ⚡ Ping cada 10s (default 25s)
    pingTimeout: 5000 // ⚡ Timeout de ping reducido
  });

  //  EVENTOS DE RECONEXIÓN
  socket.on('connect', () => {
    console.log(' Socket conectado:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log(' Socket desconectado:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(' Socket reconectado en intento:', attemptNumber);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(' Intentando reconectar...', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error(' Error de reconexión:', error);
  });

  socket.on('connect_error', (error) => {
    console.error(' Error de conexión:', error);
  });

  return socket;
};

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Usar API centralizada directamente
const apiRequest = async (endpoint, options = {}) => {
  try {
    let response;
    
    if (options.method === 'POST') {
      response = await api.post(endpoint, options.body);
    } else if (options.method === 'PUT') {
      response = await api.put(endpoint, options.body);
    } else if (options.method === 'DELETE') {
      response = await api.delete(endpoint);
    } else {
      response = await api.get(endpoint);
    }
    
    return response.data.data || response.data;
  } catch (error) {
    // El interceptor de api.js ya maneja el 401 automáticamente
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(error.message || 'Error de conexión con el servidor');
  }
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado inicial
      usuario: null,
      isAuthenticated: false,
      token: null,
      cajaPendienteCierre: null,
      sistemaBloquedadoPorCaja: false,
      socket: null,
      usuariosConectados: [],
      sessionTimeout: null,
      loading: false,
      error: null,

      // 🔒 ESTADO DE BLOQUEO (PERSISTENTE)
      usuariosBloqueados: false,
      motivoBloqueo: '',
      usuarioCerrando: '',
      timestampBloqueo: null,
      diferenciasPendientes: null,
      
      //  Login con sincronización de sesiones (MEJORADO PARA TOKENS)
        login: async (credentials) => {
          set({ loading: true, error: null });
          
          try {
            let data;
            
            //  DETECTAR SI ES LOGIN POR TOKEN O CREDENCIALES
            if (credentials.token) {
              // Login rápido por token QR
              data = await apiRequest('/users/login-by-token', {
                method: 'POST',
                body: { token: credentials.token }
              });
            } else {
              // Login normal por email/password
              data = await apiRequest('/auth/login', {
                method: 'POST',
                body: credentials
              });
            }

          const { user, token } = data;

          //  VERIFICAR CAJA PENDIENTE DE CIERRE
          if (user.cajaPendienteCierre) {
            console.log(' Caja pendiente detectada:', user.cajaPendienteCierre);
            
            // Guardar info de caja pendiente en el store
            set({
              cajaPendienteCierre: user.cajaPendienteCierre,
              sistemaBloquedadoPorCaja: true
            });
          }
          
          // 2. Guardar token en localStorage
          localStorage.setItem('auth-token', token);
          
          // 3. Inicializar Socket.IO
          const socketInstance = initializeSocket(token);
          
          // 4. Configurar eventos del socket
          get().setupSocketEvents(socketInstance);
          
          // 5. Crear usuario completo
          const usuarioCompleto = {
            ...user,
            sucursal: credentials.sucursal || 'Principal',
            turno: credentials.turno || 'matutino',
            sesion_activa: true,
            timestamp_login: new Date().toISOString(),
            ultima_actividad: new Date().toISOString()
          };

          // 6. Actualizar estado local
          set({
            usuario: usuarioCompleto,
            token,
            socket: null, //  NO guardar socket hasta que se conecte
            isAuthenticated: true,
            sessionTimeout: Date.now() + (8 * 60 * 60 * 1000),
            loading: false,
            error: null
          });

          //  DEBUG: Verificar socket después de inicializar
          console.log(' Socket inicializado:', {
            socket: !!socketInstance,
            socketId: socketInstance?.id,
            connected: socketInstance?.connected
          });
          // 7.  EMITIR EVENTO DE CONEXIÓN
          setTimeout(() => {
            if (socketInstance.connected) {
              console.log(' Enviando user-connected al servidor...');
              socketInstance.emit('user-connected', {
                user: usuarioCompleto,
                timestamp: new Date().toISOString()
              });
            } else {
              console.log(' Socket no conectado aún, esperando...');
              
              // Escuchar cuando se conecte
              socketInstance.on('connect', () => {
                console.log(' Socket conectado, enviando user-connected...');
                socketInstance.emit('user-connected', {
                  user: usuarioCompleto,
                  timestamp: new Date().toISOString()
                });
              });
            }
          }, 500);

          console.log(' NUEVO LOGIN (BACKEND + SOCKET):', {
            usuario: user.nombre,
            rol: user.rol,
            sucursal: usuarioCompleto.sucursal,
            socketId: socketInstance.id,
            timestamp: new Date().toLocaleString('es-VE')
          });

          toast.success(`Bienvenido ${user.nombre}`, { id: 'login-success' });
          
          //  DEBUG: Verificar si algo va a causar recarga
          console.log(' LOGIN COMPLETADO - NO debería haber recarga ahora');
          
          return usuarioCompleto;

        } catch (error) {
          set({ 
            loading: false, 
            error: error.message,
            isAuthenticated: false,
            usuario: null,
            token: null,
            socket: null
          });
          throw error;
        }
      },

      // Login local (mantener igual)
      loginLocal: async (userData) => {
        set({ loading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const usuarioCompleto = {
            ...userData,
            sesion_activa: true,
            timestamp_login: new Date().toISOString(),
            ultima_actividad: new Date().toISOString()
          };

          set(state => {
            const yaConectado = state.usuariosConectados.find(u => u.id === userData.id);
            const nuevosConectados = yaConectado 
              ? state.usuariosConectados.map(u => u.id === userData.id ? usuarioCompleto : u)
              : [...state.usuariosConectados, usuarioCompleto];

            return {
              usuario: usuarioCompleto,
              isAuthenticated: true,
              usuariosConectados: nuevosConectados,
              sessionTimeout: Date.now() + (8 * 60 * 60 * 1000),
              loading: false,
              error: null,
              socket: null
            };
          });

          console.log(' NUEVO LOGIN (LOCAL):', {
            usuario: userData.nombre,
            rol: userData.rol,
            sucursal: userData.sucursal,
            timestamp: new Date().toLocaleString('es-VE')
          });

          toast.success(`Bienvenido ${userData.nombre} (Modo Local)`, { id: 'login-success' });
          return usuarioCompleto;

        } catch (error) {
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      //  LOGOUT CORREGIDO
      logout: async () => {
        const { usuario, socket, token } = get();
        
        if (!usuario) {
          console.log(' No hay usuario para hacer logout');
          set({ loading: false });
          return;
        }

        console.log(' Iniciando logout para:', usuario.nombre);
        set({ loading: true });

        try {
          // 1. ENVIAR EVENTO AL SERVIDOR PRIMERO
          if (socket && socket.connected) {
            console.log(' Enviando user-disconnecting al servidor...');
            
            socket.emit('user-disconnecting', {
              userId: usuario.id,
              userName: usuario.nombre,
              timestamp: new Date().toISOString()
            });
            
            // Esperar un momento para que el evento llegue al servidor
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log(' Evento user-disconnecting enviado');
          } else {
            console.log(' Socket no conectado, logout solo local');
          }

          // 2. Logout en backend
          if (token) {
            try {
              console.log(' Enviando logout al backend API...');
              await apiRequest('/auth/logout', {
                method: 'POST'
              });
              console.log(' Logout backend API exitoso');
            } catch (error) {
              console.warn(' Error en logout backend:', error.message);
            }
          }

        } catch (error) {
          console.error(' Error durante logout:', error);
        } finally {
          // 3. LIMPIAR TODO SIEMPRE
          console.log(' Limpiando estado local...');
          
          // Desconectar socket DESPUÉS de enviar eventos
          disconnectSocket();
          
          // Limpiar localStorage
          localStorage.removeItem('auth-token');
          
          // Limpiar estado completamente
          set({
            usuario: null,
            token: null,
            socket: null,
            isAuthenticated: false,
            usuariosConectados: [],
            sessionTimeout: null,
            loading: false,
            error: null
          });
          window.notificationsInitialized = false;
  
          console.log(' LOGOUT COMPLETO para:', usuario.nombre);
          console.log(' Timestamp:', new Date().toLocaleString('es-VE'));

           
          // Mostrar mensaje de éxito

          toast.success(`Adiós ${usuario.nombre}! Sesión cerrada exitosamente`);
        }
      },

      setupSocketEvents: (socketInstance) => {
  if (!socketInstance) return;

  // ✅ NO manejar bloqueos aquí - lo maneja useSocketEvents con estados locales

  //  ACTUALIZAR SOCKET EN EL STORE CUANDO SE RECONECTE
    socketInstance.on('connect', () => {
    console.log(' Socket conectado:', socketInstance.id);

    //  ACTUALIZAR EL SOCKET EN EL STORE
    set({ socket: socketInstance });
    console.log(' Socket guardado en store'); //  NUEVO DEBUG

    toast.success('Conectado en tiempo real');

    // Solicitar lista de usuarios conectados
    socketInstance.emit('get-connected-users');
  });

  socketInstance.on('disconnect', (reason) => {
    console.log(' Socket desconectado:', reason);
    
    //  NO LIMPIAR EL SOCKET DEL STORE - MANTENERLO PARA RECONEXIÓN
    // set({ socket: null }); // NO HACER ESTO
    
    if (reason === 'io server disconnect') {
      toast.error('Desconectado del servidor');
    }
  });

  //  NUEVO: Cuando se reconecte, reenviar info del usuario
  socketInstance.on('reconnect', () => {
    console.log(' Socket reconectado, reenviando datos de usuario...');
    
    const { usuario } = get();
    if (usuario) {
      socketInstance.emit('user-connected', {
        user: usuario,
        timestamp: new Date().toISOString()
      });
    }
  });
  },

      // Forzar logout
      forceLogout: () => {
        const { usuario } = get();
        
        if (usuario) {
          console.log(' FORCE LOGOUT:', {
            usuario: usuario.nombre,
            timestamp: new Date().toLocaleString('es-VE')
          });
        }

        disconnectSocket();
        localStorage.removeItem('auth-token');
        
        set({
          usuario: null,
          token: null,
          socket: null,
          isAuthenticated: false,
          usuariosConectados: [],
          sessionTimeout: null,
          loading: false,
          error: 'Sesión cerrada: otro usuario ha iniciado sesión'
        });
      },

      checkAuth: async () => {
        const estado = get();
        
        // 🔧 FIX: Mejorar control de concurrencia
        if (estado.loading) {
          console.log('⏳ checkAuth ya en progreso (store loading), esperando...');
          return new Promise((resolve) => {
            const interval = setInterval(() => {
              const newState = get();
              if (!newState.loading) {
                clearInterval(interval);
                resolve(newState.isAuthenticated);
              }
            }, 100);
            
            // Timeout después de 5 segundos
            setTimeout(() => {
              clearInterval(interval);
              resolve(get().isAuthenticated);
            }, 5000);
          });
        }

        if (window.checkAuthInProgress) {
          console.log('⏳ checkAuth local en progreso, saltando...');
          return estado.isAuthenticated;
        }

        window.checkAuthInProgress = true;

        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.log('❌ No hay token, limpiando estado...');
          window.checkAuthInProgress = false;
          set({
            isAuthenticated: false,
            usuario: null,
            token: null,
            socket: null,
            usuariosConectados: [],
            cajaPendienteCierre: null,
            sistemaBloquedadoPorCaja: false,
            loading: false
          });
          return false;
        }

        try {
          set({ loading: true });
          console.log('✅ Ejecutando checkAuth con token existente...');

          const response = await api.get('/auth/me');
          const userData = response.data?.data || response.data;
          
          console.log('📥 Datos recibidos del servidor:', {
            id: userData.id,
            nombre: userData.nombre,
            email: userData.email,
            rol: userData.rol,
            cajaPendiente: !!userData.cajaPendienteCierre
          });

          const { usuario: usuarioLocal } = get();
          const usuarioCompleto = {
            ...userData,
            sucursal: usuarioLocal?.sucursal || userData.sucursal || 'Principal',
            turno: usuarioLocal?.turno || userData.turno || 'matutino',
            sesion_activa: true,
            timestamp_login: usuarioLocal?.timestamp_login || new Date().toISOString(),
            ultima_actividad: new Date().toISOString()
          };

          console.log('🔌 Reconectando socket después de recarga...');
          let socketInstance = get().socket;

          // 🔧 FIX: Siempre reinicializar socket si no está conectado
          if (!socketInstance || !socketInstance.connected) {
            console.log('🔌 Inicializando nuevo socket...');
            socketInstance = initializeSocket(token);
            get().setupSocketEvents(socketInstance);

            // 🔧 FIX: Esperar más tiempo para la conexión inicial
            setTimeout(() => {
              if (socketInstance.connected) {
                console.log('✅ Socket conectado, enviando user-connected...');
                socketInstance.emit('user-connected', {
                  user: usuarioCompleto,
                  timestamp: new Date().toISOString()
                });
              } else {
                console.log('⏳ Socket no conectado aún, configurando listener...');
                socketInstance.once('connect', () => {
                  console.log('✅ Socket reconectado, enviando user-connected...');
                  socketInstance.emit('user-connected', {
                    user: usuarioCompleto,
                    timestamp: new Date().toISOString()
                  });
                });
              }
            }, 1500); // 🔧 Aumentar delay a 1.5 segundos
          }

          const nuevoEstado = {
            usuario: usuarioCompleto,
            token,
            socket: socketInstance,
            isAuthenticated: true,
            loading: false,
            error: null,
            sessionTimeout: Date.now() + (8 * 60 * 60 * 1000)
          };

          if (userData.cajaPendienteCierre) {
            console.log('⚠️ checkAuth - caja pendiente detectada:', userData.cajaPendienteCierre);
            nuevoEstado.cajaPendienteCierre = userData.cajaPendienteCierre;
            nuevoEstado.sistemaBloquedadoPorCaja = true;
          } else {
            console.log('✅ checkAuth - sin caja pendiente');
            nuevoEstado.cajaPendienteCierre = null;
            nuevoEstado.sistemaBloquedadoPorCaja = false;
          }

          set(nuevoEstado);

          console.log('✅ CheckAuth completado exitosamente');
          window.checkAuthInProgress = false;
          return true;
        } catch (error) {
          console.error('💥 Error en checkAuth:', error);

          const status = error?.response?.status;
          
          // 🔧 FIX: Manejo mejorado de errores
          if (status === 401 || status === 403) {
            console.warn('🔒 Token inválido o expirado durante checkAuth');
            localStorage.removeItem('auth-token');
            disconnectSocket();
            set({
              usuario: null,
              token: null,
              socket: null,
              isAuthenticated: false,
              usuariosConectados: [],
              cajaPendienteCierre: null,
              sistemaBloquedadoPorCaja: false,
              loading: false,
              error: 'Sesión expirada'
            });
            
            // Solo mostrar toast si no estamos en la página de login
            if (window.location.pathname !== '/login') {
              toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
                id: 'session-expired-checkauth',
                duration: 5000
              });
            }
            
            window.checkAuthInProgress = false;
            return false;
          }

          // 🔧 FIX: Para errores de red, mantener sesión local pero marcar como offline
          const mensaje =
            error?.response?.data?.message ||
            error?.message ||
            'No se pudo validar la sesión con el servidor';

          console.warn('⚠️ checkAuth - error no crítico, manteniendo sesión local:', mensaje);
          
          // Solo mantener sesión local si ya estábamos autenticados
          const estadoActual = get();
          if (estadoActual.isAuthenticated && estadoActual.usuario) {
            console.log('ℹ️ Manteniendo sesión local existente');
            toast.warning('No se pudo validar con el servidor. Modo offline activado.', {
              id: 'checkauth-offline',
              duration: 4000
            });

            set({
              loading: false,
              error: null
            });

            window.checkAuthInProgress = false;
            return true; // Mantener autenticado en modo offline
          } else {
            // Si no había sesión local, cerrar sesión
            console.log('❌ No hay sesión local válida, cerrando sesión');
            localStorage.removeItem('auth-token');
            disconnectSocket();
            set({
              usuario: null,
              token: null,
              socket: null,
              isAuthenticated: false,
              usuariosConectados: [],
              cajaPendienteCierre: null,
              sistemaBloquedadoPorCaja: false,
              loading: false,
              error: 'No se pudo conectar al servidor'
            });
            
            window.checkAuthInProgress = false;
            return false;
          }
        }
      },

      // Resto de funciones
      verificarSesion: () => {
        const { sessionTimeout, usuario } = get();
        
        if (!usuario || !sessionTimeout) {
          return false;
        }

        if (Date.now() > sessionTimeout) {
          get().logout();
          return false;
        }

        return true;
      },

      extenderSesion: () => {
        const { isAuthenticated } = get();
        
        if (isAuthenticated) {
          set({
            sessionTimeout: Date.now() + (8 * 60 * 60 * 1000),
            usuario: {
              ...get().usuario,
              ultima_actividad: new Date().toISOString()
            }
          });
        }
      },

      tienePermiso: (accion) => {
        const { usuario } = get();
        if (!usuario) return false;
        return PERMISOS[accion]?.includes(usuario.rol) || false;
      },

      agregarUsuarioConectado: (usuario) => {
        set(state => {
          const yaExiste = state.usuariosConectados.find(u => u.id === usuario.id);
          if (yaExiste) return state;

          return {
            usuariosConectados: [...state.usuariosConectados, {
              ...usuario,
              ultima_actividad: new Date().toISOString()
            }]
          };
        });
      },
      
      eliminarUsuarioConectado: (userId) => {
        set(state => ({
          usuariosConectados: state.usuariosConectados.filter(u => u.id !== userId)
        }));
      },
      
      actualizarActividad: (userId) => {
        set(state => ({
          usuariosConectados: state.usuariosConectados.map(u => 
            u.id === userId 
              ? { ...u, ultima_actividad: new Date().toISOString() }
              : u
          )
        }));
        
        const { usuario } = get();
        if (usuario && usuario.id === userId) {
          set({
            usuario: {
              ...usuario,
              ultima_actividad: new Date().toISOString()
            }
          });
        }
      },

      simularUsuarioConectado: (userData) => {
        set(state => {
          const yaConectado = state.usuariosConectados.find(u => u.id === userData.id);
          if (yaConectado) return state;

          return {
            usuariosConectados: [...state.usuariosConectados, {
              ...userData,
              ultima_actividad: new Date().toISOString()
            }]
          };
        });
      },

      getSessionInfo: () => {
        const { usuario, sessionTimeout, usuariosConectados, socket } = get();
        
        if (!usuario || !sessionTimeout) return null;

        const tiempoRestante = sessionTimeout - Date.now();
        const horasRestantes = Math.floor(tiempoRestante / (1000 * 60 * 60));
        const minutosRestantes = Math.floor((tiempoRestante % (1000 * 60 * 60)) / (1000 * 60));

        return {
          usuario,
          tiempoRestante: `${horasRestantes}h ${minutosRestantes}m`,
          usuariosConectados: usuariosConectados.length,
          sesionActiva: tiempoRestante > 0,
          socketConectado: socket?.connected || false,
          socketId: socket?.id || null
        };
      },

      // Funciones de utilidad
      clearError: () => set({ error: null }),
      getToken: () => get().token || localStorage.getItem('auth-token'),
        isBackendConnected: () => !!get().token,
        getSocket: () => get().socket,
        isSocketConnected: () => {
          const { socket } = get();
          return socket?.connected || false;
        },

        //  FUNCIONES PARA CAJAS PENDIENTES
        //  FUNCIONES PARA CAJAS PENDIENTES
        limpiarCajaPendiente: () => {
          set({
            cajaPendienteCierre: null,
            sistemaBloquedadoPorCaja: false
          });
          console.log(' Estado de caja pendiente limpiado en authStore');
        },

        //  FUNCIÓN PARA MANEJAR TOKEN EXPIRADO DESDE INTERCEPTOR
        handleTokenExpired: () => {
          const { isAuthenticated, usuario } = get();
          
          if (isAuthenticated && usuario) {
            console.log(' Manejando token expirado para usuario:', usuario.nombre);
            
            // Desconectar socket
            disconnectSocket();
            
            // Limpiar estado completamente
            set({
              usuario: null,
              token: null,
              socket: null,
              isAuthenticated: false,
              usuariosConectados: [],
              sessionTimeout: null,
              error: 'Sesión expirada',
              loading: false
            });
            
            // Mostrar notificación
            import('../utils/toast.jsx').then(({ default: toast }) => {
              toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            });
          }
        }
          }),
          {
            name: 'auth-storage',
            partialize: (state) => ({ 
              usuario: state.usuario,
              token: state.token,
              isAuthenticated: state.isAuthenticated,
              sessionTimeout: state.sessionTimeout,
              cajaPendienteCierre: state.cajaPendienteCierre,  // ✅ FIX F5: Persistir caja pendiente
              sistemaBloquedadoPorCaja: state.sistemaBloquedadoPorCaja  // ✅ FIX F5: Persistir estado de bloqueo
            })
          }
        )
      );

export { useAuthStore, ROLES, PERMISOS };
