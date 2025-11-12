// utils/errorHandler.js
// Servicio centralizado para manejo de errores

import toast from 'react-hot-toast';

/**
 * Maneja errores de forma consistente en toda la aplicación
 * @param {Error} error - El error a manejar
 * @param {string} context - Contexto donde ocurrió el error
 * @param {Object} options - Opciones adicionales
 */
export const handleError = (error, context, options = {}) => {
  const {
    showToast = true,
    logToConsole = true,
    reportToService = process.env.NODE_ENV === 'production',
    customMessage = null
  } = options;

  // Log local
  if (logToConsole) {
    console.error(`[${context}]`, error);
  }

  // Mensaje amigable para el usuario
  const userMessage = customMessage || getUserFriendlyMessage(error, context);

  // Toast para usuario
  if (showToast) {
    toast.error(userMessage, {
      duration: 5000,
      icon: '⚠️'
    });
  }

  // Reporte a servicio externo (Sentry, etc.) en producción
  if (reportToService && typeof window !== 'undefined' && window.reportError) {
    window.reportError(error, {
      context,
      message: error.message,
      stack: error.stack
    });
  }

  return {
    error,
    context,
    userMessage
  };
};

/**
 * Obtiene un mensaje amigable para el usuario basado en el error
 */
const getUserFriendlyMessage = (error, context) => {
  // Mensajes específicos por contexto
  const contextMessages = {
    'PDF Generation': 'Error al generar PDF del comprobante',
    'Print Thermal': 'Error al imprimir factura térmica',
    'WhatsApp Send': 'Error al enviar comprobante por WhatsApp',
    'Email Send': 'Error al enviar comprobante por email',
    'Sale Validation': 'Error validando datos de la venta',
    'Backend Processing': 'Error procesando venta en el servidor'
  };

  if (contextMessages[context]) {
    return contextMessages[context];
  }

  // Mensajes por tipo de error
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
  }

  if (error.message?.includes('timeout')) {
    return 'La operación tardó demasiado. Intenta nuevamente.';
  }

  if (error.response?.status === 400) {
    return 'Datos inválidos. Verifica la información e intenta nuevamente.';
  }

  if (error.response?.status === 500) {
    return 'Error en el servidor. Contacta al administrador.';
  }

  // Mensaje genérico
  return error.message || 'Ocurrió un error inesperado. Intenta nuevamente.';
};

/**
 * Valida la respuesta del backend
 */
export const validateBackendResponse = (data, requiredFields = ['codigoVenta']) => {
  if (!data) {
    throw new Error('Respuesta del backend vacía');
  }

  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Campo requerido faltante en respuesta: ${field}`);
    }
  }

  return data;
};

