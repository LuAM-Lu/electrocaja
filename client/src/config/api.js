// client/src/config/api.js
import axios from 'axios';

//  DETECCIÓN AUTOMÁTICA DE IP/HOST
const getBaseURL = () => {
  // 1. Prioridad: Variable de entorno (útil para Docker o Vercel)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) return `${envApiUrl}/api`;

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // 2. Si estás en tu PC (Localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Aquí sí usamos el puerto de tu backend local
    return `http://localhost:3001/api`;
  }

  // 3. PRODUCCIÓN (Nginx en el VPS)
  // No usamos puerto 3001. Nginx recibe en 443 y pasa a 3000 interno.
  return `${protocol}//${hostname}/api`;
};

//  CONFIGURACIÓN PRINCIPAL
export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  SOCKET_URL: getBaseURL()
    .replace('/api', '')
    .replace('https', 'wss')  // ← CAMBIO: https → wss
    .replace('http', 'ws'),   // ← MANTENER: http → ws
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

//  INSTANCIA AXIOS PRINCIPAL
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

//  INTERCEPTOR DE AUTENTICACIÓN
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error(' API Request Error:', error);
    return Promise.reject(error);
  }
);

//  INTERCEPTOR DE RESPUESTAS (MEJORADO PARA TOKEN EXPIRADO)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // ✅ SILENCIAR ERROR 404 PARA ENDPOINTS DONDE ES ESPERADO
    const isDiscountRequestEndpoint = error.config?.url?.includes('/discount-requests/sesion/');
    if (error.response?.status === 404 && isDiscountRequestEndpoint) {
      // 404 esperado cuando no hay solicitud de descuento pendiente - silenciar completamente
      // Crear un error silencioso que no se mostrará en consola
      const silentError = new Error('Solicitud de descuento no encontrada (esperado)');
      silentError.isSilent = true;
      silentError.response = error.response;
      silentError.config = error.config;
      return Promise.reject(silentError);
    }

    // Solo loguear errores que no sean silenciosos
    if (!error.isSilent) {
      console.error(` API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    }

    //  MANEJO ESPECÍFICO DE TOKEN EXPIRADO
    if (error.response?.status === 401) {
      // ✅ Excluir endpoints que pueden devolver 401 legítimamente sin ser token expirado
      const isAuthValidationEndpoint = error.config?.url?.includes('/auth/validate-admin-token') ||
        error.config?.url?.includes('/auth/validate-quick-token');

      // ✅ Excluir endpoint de WhatsApp estado (puede fallar por otras razones)
      const isWhatsAppEstadoEndpoint = error.config?.url?.includes('/whatsapp/estado');

      // Si es un endpoint de validación o WhatsApp estado, no tratar como token expirado
      if (isAuthValidationEndpoint || isWhatsAppEstadoEndpoint) {
        console.log(' 401 de endpoint excluido, no es token expirado');
        return Promise.reject(error);
      }

      console.log(' Token expirado detectado en interceptor');

      // 1. Limpiar token inmediatamente
      localStorage.removeItem('auth-token');

      // 2. Prevenir loops infinitos - solo actuar si no es request de login
      const isLoginRequest = error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/users/login-by-token') ||
        error.config?.url?.includes('/auth/me');

      if (!isLoginRequest) {
        console.log(' Despachando evento token-expired...');

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

//  FUNCIÓN DE PRUEBA DE CONECTIVIDAD
export const testConnection = async () => {
  try {
    const response = await api.get('/test-cors');
    return { success: true, data: response.data };
  } catch (error) {
    console.error(' Error de conexión API:', error.message);
    return { success: false, error: error.message };
  }
};

//  FUNCIÓN DE RETRY AUTOMÁTICO
export const apiWithRetry = async (requestFunction, maxRetries = API_CONFIG.RETRY_ATTEMPTS) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      console.warn(` Intento ${attempt}/${maxRetries} falló:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

//  DEBUG INFO
console.log(' API Configuration:', {
  BASE_URL: API_CONFIG.BASE_URL,
  SOCKET_URL: API_CONFIG.SOCKET_URL,
  HOSTNAME: window.location.hostname,
  PROTOCOL: window.location.protocol
});

//  HELPER PARA URLs DE IMÁGENES
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';

  // Si ya es una URL completa, devolverla tal como está
  if (typeof imagePath === 'string' && imagePath.startsWith('http')) return imagePath;

  // Si es base64, devolverla tal como está
  if (typeof imagePath === 'string' && imagePath.startsWith('data:')) return imagePath;

  // Si es un objeto con url, extraer la url
  if (typeof imagePath === 'object' && imagePath.url) {
    return getImageUrl(imagePath.url);
  }

  // Para rutas de uploads, usar SERVER_URL sin /api
  const serverUrl = API_CONFIG.BASE_URL.replace('/api', '');

  if (typeof imagePath === 'string') {
    if (imagePath.startsWith('/uploads/')) {
      const fullUrl = `${serverUrl}${imagePath}`;
      console.log('🖼️ getImageUrl:', { path: imagePath, fullUrl });
      return fullUrl;
    }

    // Para rutas relativas sin /uploads/, agregarlas
    if (!imagePath.startsWith('/')) {
      const fullUrl = `${serverUrl}/uploads/products/thumbnails/${imagePath}`;
      console.log('🖼️ getImageUrl (relative):', { path: imagePath, fullUrl });
      return fullUrl;
    }

    return `${serverUrl}${imagePath}`;
  }

  console.warn('⚠️ getImageUrl: tipo de imagePath no soportado:', typeof imagePath, imagePath);
  return '';
};

export default api;
