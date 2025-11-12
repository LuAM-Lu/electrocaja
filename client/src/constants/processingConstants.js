// constants/processingConstants.js
// Constantes centralizadas para el procesamiento de ventas

export const PROCESSING_CONFIG = {
  // Configuración de reintentos para ref
  MAX_REF_RETRIES: 25,
  REF_RETRY_DELAY: 100,
  
  // Delays para pasos del procesamiento (en milisegundos)
  STEP_DELAYS: {
    VALIDATION: 1000,        // Aumentado de 500ms a 1000ms
    PROCESSING: 1500,       // Aumentado de 800ms a 1500ms
    OPTION_EXECUTION: 2000, // Aumentado de 1000ms a 2000ms
    FINALIZATION: 2000,     // Aumentado de 1500ms a 2000ms
    SUCCESS_MESSAGE: 8000,  // Aumentado de 5000ms a 8000ms
    REDIRECTION: 1000
  },
  
  // Timeouts para limpieza
  CLEANUP_DELAY: 500,
  
  // Tiempo mínimo para mostrar mensaje de éxito
  MIN_SUCCESS_DISPLAY_TIME: 5000  // Aumentado de 3000ms a 5000ms
};

export const PROCESSING_STEPS = {
  VALIDATING: 'validando',
  PROCESSING: 'procesando',
  PDF: 'pdf',
  FACTURA: 'factura',
  IMPRIMIR: 'imprimir',
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  FINALIZING: 'finalizando'
};

export const PROCESSING_MESSAGES = {
  INITIALIZING: 'Inicializando procesamiento...',
  VALIDATING: 'Validando datos de la venta',
  PROCESSING: 'Procesando venta en el servidor',
  GENERATING_PDF: 'Generando PDF del comprobante',
  GENERATING_FACTURA: 'Generando factura térmica',
  PRINTING: 'Enviando a impresora',
  SENDING_WHATSAPP: 'Enviando comprobante por WhatsApp',
  SENDING_EMAIL: 'Enviando comprobante por email',
  FINALIZING: 'Finalizando proceso',
  SUCCESS: '¡Venta Completada!',
  REDIRECTING: 'Redirigiendo al dashboard...'
};

export const ERROR_MESSAGES = {
  MODAL_INIT_FAILED: 'Error al inicializar el modal de procesamiento',
  VALIDATION_FAILED: 'Error calculando totales de la venta',
  BACKEND_ERROR: 'Error procesando venta',
  PDF_ERROR: 'Error al generar PDF',
  PRINT_ERROR: 'Error al imprimir factura térmica',
  WHATSAPP_ERROR: 'Error al enviar WhatsApp',
  EMAIL_ERROR: 'Error al enviar email',
  INVALID_RESPONSE: 'Respuesta del backend inválida'
};

