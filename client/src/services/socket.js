import { io } from 'socket.io-client';

// URL del servidor backend
const SERVER_URL = import.meta.env.DEV 
  ? 'https://192.168.1.5:3001' 
  : window.location.origin.replace(/:\d+/, ':3001');

let socket = null;

export const initializeSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['polling', 'websocket'], // 🔧 Polling primero
    forceNew: true,
    upgrade: true,
    rememberUpgrade: false, // 🔧 No recordar upgrade fallido
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