// client/src/utils/debounce.js
// 🚀 SISTEMA DE DEBOUNCE GLOBAL PARA EVITAR ACTUALIZACIONES MÚLTIPLES

/**
 * Función de debounce genérica
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @param {boolean} immediate - Si ejecutar inmediatamente
 * @returns {Function} - Función con debounce
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

/**
 * Debounce específico para actualizaciones de socket
 * Evita múltiples actualizaciones cuando llegan eventos rápidamente
 */
export const socketUpdateDebounce = debounce((updateFunction) => {
  console.log('🔄 Ejecutando actualización de socket debounced...');
  updateFunction();
}, 300); // 300ms de debounce para socket updates

/**
 * Debounce específico para actualizaciones de inventario
 */
export const inventoryUpdateDebounce = debounce((updateFunction) => {
  console.log('📦 Ejecutando actualización de inventario debounced...');
  updateFunction();
}, 200); // 200ms de debounce para inventario

/**
 * Debounce específico para actualizaciones de caja
 */
export const cajaUpdateDebounce = debounce((updateFunction) => {
  console.log('💰 Ejecutando actualización de caja debounced...');
  updateFunction();
}, 400); // 400ms de debounce para caja

/**
 * Sistema de throttling para evitar demasiadas actualizaciones
 * @param {Function} func - Función a throttlear
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function} - Función con throttling
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Sistema de gestión de timeouts globales
 * Evita conflictos entre diferentes debounces
 */
export const GlobalTimeoutManager = {
  timeouts: new Map(),

  set(key, callback, delay) {
    // Limpiar timeout anterior si existe
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    // Crear nuevo timeout
    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(key);
    }, delay);

    this.timeouts.set(key, timeoutId);
    return timeoutId;
  },

  clear(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
  },

  clearAll() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
};

/**
 * Debounce específico para eventos de venta procesada
 * Evita múltiples actualizaciones cuando se procesan ventas rápidamente
 */
export const ventaProcesadaDebounce = (updateFunction) => {
  GlobalTimeoutManager.set('venta_procesada', updateFunction, 500);
};

/**
 * Debounce específico para eventos de inventario actualizado
 */
export const inventarioActualizadoDebounce = (updateFunction) => {
  GlobalTimeoutManager.set('inventario_actualizado', updateFunction, 300);
};

/**
 * Debounce específico para eventos de caja actualizada
 */
export const cajaActualizadaDebounce = (updateFunction) => {
  GlobalTimeoutManager.set('caja_actualizada', updateFunction, 400);
};
