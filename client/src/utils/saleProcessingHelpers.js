// utils/saleProcessingHelpers.js
// Funciones helper para el procesamiento de ventas

import { PROCESSING_CONFIG, PROCESSING_STEPS } from '../constants/processingConstants';
import { handleError, validateBackendResponse } from './errorHandler';

/**
 * Helper para ejecutar opciones post-venta con manejo consistente de errores
 * @param {Object} params - Parámetros de ejecución
 * @param {string} params.optionName - Nombre de la opción (para logging)
 * @param {string} params.stepId - ID del paso en el modal
 * @param {Function} params.execute - Función async a ejecutar
 * @param {Object} params.modalRef - Referencia al modal de procesamiento
 * @param {Object} params.isMountedRef - Referencia para verificar si el componente está montado
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
export const executePostSaleOption = async ({
  optionName,
  stepId,
  execute,
  modalRef,
  isMountedRef
}) => {
  try {
    await execute();
    
    // Delay antes de avanzar paso
    await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);
    
    if (modalRef?.current && isMountedRef?.current) {
      modalRef.current.avanzarPaso(stepId);
    }
    
    return { success: true };
  } catch (error) {
    handleError(error, optionName, {
      showToast: isMountedRef?.current,
      logToConsole: true
    });
    
    // Avanzar paso incluso si falla para no bloquear el flujo
    await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);
    
    if (modalRef?.current && isMountedRef?.current) {
      modalRef.current.avanzarPaso(stepId);
    }
    
    return { success: false, error };
  }
};

/**
 * Helper para delay (Promise-based setTimeout)
 */
export const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Helper para esperar a que un ref esté disponible usando callback
 */
export const waitForRef = (ref, maxRetries = PROCESSING_CONFIG.MAX_REF_RETRIES) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkRef = () => {
      if (ref?.current) {
        resolve(ref.current);
      } else if (attempts < maxRetries) {
        attempts++;
        setTimeout(checkRef, PROCESSING_CONFIG.REF_RETRY_DELAY);
      } else {
        reject(new Error('Ref no disponible después de múltiples intentos'));
      }
    };
    
    checkRef();
  });
};

/**
 * Helper para preparar datos de venta para el backend
 */
export const prepareSalePayload = (ventaData, totales, descuento, tasaCambio, codigoVenta, sesionId, opcionesProcesamiento, METODOS_PAGO) => {
  return {
    clienteId: ventaData.cliente?.id || null,
    clienteNombre: ventaData.cliente?.nombre || null,
    items: ventaData.items.map(item => ({
      productoId: item.productoId || null,
      descripcion: item.descripcion,
      codigoBarras: item.codigo,
      cantidad: item.cantidad,
      precioUnitario: item.precio_unitario,
      precioCosto: item.precio_costo || 0,
      descuento: item.descuento || 0
    })),
    pagos: ventaData.pagos
      .filter(pago => pago.monto && parseFloat(pago.monto) > 0)
      .map(pago => {
        const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);
        const montoNormalizado = typeof pago.monto === 'string'
          ? pago.monto.replace(',', '.')
          : pago.monto;
        const montoNumerico = Math.round(parseFloat(montoNormalizado) * 100) / 100;

        return {
          metodo: pago.metodo,
          monto: montoNumerico,
          moneda: metodoInfo?.moneda || 'bs',
          banco: pago.banco || null,
          referencia: pago.referencia || null
        };
      }),
    vueltos: ventaData.vueltos
      .filter(vuelto => vuelto.monto && parseFloat(vuelto.monto) > 0)
      .map(vuelto => {
        const metodoInfo = METODOS_PAGO.find(m => m.value === vuelto.metodo);
        const montoNumerico = parseFloat(vuelto.monto.replace(',', '.')) || 0;
        return {
          metodo: vuelto.metodo,
          monto: montoNumerico,
          moneda: metodoInfo?.moneda || 'bs',
          banco: vuelto.banco || null,
          referencia: vuelto.referencia || null
        };
      }),
    subtotalUsd: totales.subtotalUsd,
    subtotalBs: totales.subtotalBs,
    totalBs: totales.totalAPagar,
    totalUsd: totales.totalUsd,
    descuentoTotal: ventaData.descuentoAutorizado || descuento || 0,
    observaciones: ventaData.observaciones || `Venta procesada con código ${codigoVenta}`,
    tasaCambio: tasaCambio,
    sesionId: sesionId,
    opcionesProcesamiento: opcionesProcesamiento
  };
};

export { validateBackendResponse };

