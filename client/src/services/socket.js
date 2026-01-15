import { io } from 'socket.io-client';

// URL del servidor backend
const getServerURL = () => {
  // Usar variable de entorno si está disponible
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    console.log('🔌 [SOCKET] Usando VITE_API_URL:', envApiUrl);
    return envApiUrl;
  }

  // Fallback: detectar automáticamente
  const hostname = window.location.hostname;

  // Para localhost, usar localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = 'http://localhost:3001';
    console.log('🔌 [SOCKET] Usando localhost:', url);
    return url;
  }

  // Para red local, usar la misma IP del frontend con puerto 3000
  const url = `http://${hostname}:3001`;
  console.log('🔌 [SOCKET] Usando IP de red local:', url);
  return url;
};

const SERVER_URL = getServerURL();

let socket = null;

export const initializeSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  console.log('🔌 [SOCKET] Inicializando socket con URL:', SERVER_URL);
  console.log('🔌 [SOCKET] Token disponible:', !!token);

  socket = io(SERVER_URL, {
    auth: { token },
    // ✅ COINCIDIR CON CONFIGURACIÓN DEL SERVIDOR: Solo websocket
    transports: ['websocket'], // Solo websocket (como el servidor)
    upgrade: false, // No permitir upgrade (como allowUpgrades: false en servidor)
    forceNew: true,
    timeout: 15000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    // ⚡ Optimizaciones para baja latencia (coincidir con servidor)
    perMessageDeflate: false, // Sin compresión
    pingInterval: 10000,
    pingTimeout: 5000
  });

  // Agregar listeners para debugging
  socket.on('connect', () => {
    console.log('✅ [SOCKET] Conectado exitosamente:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ [SOCKET] Error de conexión:', error.message);
    console.error('❌ [SOCKET] Detalles:', {
      type: error.type,
      description: error.description,
      context: error.context
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 [SOCKET] Desconectado:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 [SOCKET] Reconectado en intento:', attemptNumber);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 [SOCKET] Intentando reconectar...', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ [SOCKET] Error de reconexión:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ [SOCKET] Falló la reconexión después de todos los intentos');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};