import { io } from 'socket.io-client';

// URL del servidor backend
const getServerURL = () => {
  // Usar variable de entorno si está disponible
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // Fallback: detectar automáticamente
  const hostname = window.location.hostname;
  
  // Para localhost, usar localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://localhost:3000';
  }
  
  // Para red local, usar la misma IP del frontend con puerto 3000
  return `https://${hostname}:3000`;
};

const SERVER_URL = getServerURL();

let socket = null;

export const initializeSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['polling', 'websocket'], //  Polling primero
    forceNew: true,
    upgrade: true,
    rememberUpgrade: false, //  No recordar upgrade fallido
    timeout: 15000,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
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