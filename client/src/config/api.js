// client/src/config/api.js
import axios from 'axios';

// 🔧 DETECCIÓN AUTOMÁTICA DE IP/HOST
const getBaseURL = () => {
  // Usar variable de entorno si está disponible
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return `${envApiUrl}/api`;
  }
  
  // Fallback: detectar automáticamente basado en hostname
  const hostname = window.location.hostname;
  
  // Para localhost, usar localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `https://localhost:3001/api`;
  }
  
  // Para red local, usar la misma IP del frontend con puerto 3001
  return `https://${hostname}:3001/api`;
};

// 🌐 CONFIGURACIÓN PRINCIPAL
export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  SOCKET_URL: getBaseURL()
    .replace('/api', '')
    .replace('https', 'wss')  // ← CAMBIO: https → wss
    .replace('http', 'ws'),   // ← MANTENER: http → ws
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

// 📡 INSTANCIA AXIOS PRINCIPAL
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 🔐 INTERCEPTOR DE AUTENTICACIÓN
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// 🔥 INTERCEPTOR DE RESPUESTAS (MEJORADO PARA TOKEN EXPIRADO)
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    
    // 🚨 MANEJO ESPECÍFICO DE TOKEN EXPIRADO
    if (error.response?.status === 401) {
      console.log('🚨 Token expirado detectado en interceptor');
      
      // 1. Limpiar token inmediatamente
      localStorage.removeItem('auth-token');
      
      // 2. Prevenir loops infinitos - solo actuar si no es request de login
      const isLoginRequest = error.config?.url?.includes('/auth/login') || 
                           error.config?.url?.includes('/users/login-by-token') ||
                           error.config?.url?.includes('/auth/me');
      
      if (!isLoginRequest) {
        console.log('🧹 Despachando evento token-expired...');
        
        // 3. Despachar evento para que authStore limpie el estado
        window.dispatchEvent(new CustomEvent('token-expired', {
          detail: { 
            message: 'Token expirado',
            timestamp: new Date().toISOString(),
            url: error.config?.url
          }
        }));
      }
    }
    
    return Promise.reject(error);
  }
);

// 🧪 FUNCIÓN DE PRUEBA DE CONECTIVIDAD
export const testConnection = async () => {
  try {
    const response = await api.get('/test-cors');
    console.log('✅ Conexión API exitosa:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Error de conexión API:', error.message);
    return { success: false, error: error.message };
  }
};

// 🔄 FUNCIÓN DE RETRY AUTOMÁTICO
export const apiWithRetry = async (requestFunction, maxRetries = API_CONFIG.RETRY_ATTEMPTS) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      console.warn(`⚠️ Intento ${attempt}/${maxRetries} falló:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// 📊 DEBUG INFO
console.log('🔧 API Configuration:', {
  BASE_URL: API_CONFIG.BASE_URL,
  SOCKET_URL: API_CONFIG.SOCKET_URL,
  HOSTNAME: window.location.hostname,
  PROTOCOL: window.location.protocol
});

// 🖼️ HELPER PARA URLs DE IMÁGENES
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // Si ya es una URL completa, devolverla tal como está
  if (imagePath.startsWith('http')) return imagePath;
  
  // Si es base64, devolverla tal como está
  if (imagePath.startsWith('data:')) return imagePath;
  
  // Para rutas de uploads, usar SERVER_URL sin /api
  const serverUrl = API_CONFIG.BASE_URL.replace('/api', '');
  
  if (imagePath.startsWith('/uploads/')) {
    return `${serverUrl}${imagePath}`;
  }
  
  // Para rutas relativas sin /uploads/, agregarlas
  if (!imagePath.startsWith('/')) {
    return `${serverUrl}/uploads/products/thumbnails/${imagePath}`;
  }
  
  return `${serverUrl}${imagePath}`;
};

export default api;
