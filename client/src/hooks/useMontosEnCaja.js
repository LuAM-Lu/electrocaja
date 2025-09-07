// hooks/useMontosEnCaja.js - CÁLCULOS REACTIVOS UNIFICADOS CON SOPORTE PARA CAJAS PENDIENTES 💰
import { useMemo } from 'react';
import { useCajaStore } from '../store/cajaStore';

export const useMontosEnCaja = (cajaPendienteData = null) => {
  const { cajaActual, transacciones } = useCajaStore();

  return useMemo(() => {
    // 🔧 DETERMINAR FUENTE DE DATOS
    const datosParaCalcular = cajaPendienteData || cajaActual;
    const transaccionesParaCalcular = cajaPendienteData?.transacciones || transacciones;

    if (!datosParaCalcular) {
      return {
        efectivoBs: 0,
        efectivoUsd: 0,
        pagoMovil: 0,
        ingresosBs: 0,
        egresosBs: 0,
        ingresosUsd: 0,
        egresosUsd: 0,
        ingresosPagoMovil: 0,
        egresosPagoMovil: 0,
        balanceBs: 0,
        balanceUsd: 0,
        balancePagoMovil: 0,
        transaccionesTotales: 0,
        ventasCount: 0,
        egresosCount: 0,
        montosIniciales: {
          efectivoBs: 0,
          efectivoUsd: 0,
          pagoMovil: 0
        },
        esCajaPendiente: false
      };
    }

    // 🏦 MONTOS INICIALES (físicos en caja)
    const montosIniciales = {
      efectivoBs: parseFloat(datosParaCalcular.monto_inicial_bs || datosParaCalcular.montoInicialBs) || 0,
      efectivoUsd: parseFloat(datosParaCalcular.monto_inicial_usd || datosParaCalcular.montoInicialUsd) || 0,
      pagoMovil: parseFloat(datosParaCalcular.monto_inicial_pago_movil || datosParaCalcular.montoInicialPagoMovil) || 0
    };

    // 📊 CONTADORES DE MOVIMIENTOS
    let ingresosBs = 0;
    let egresosBs = 0;
    let ingresosUsd = 0;
    let egresosUsd = 0;
    let ingresosPagoMovil = 0;
    let egresosPagoMovil = 0;

    // 💰 MONTOS FÍSICOS ACTUALES
    let efectivoBsActual = montosIniciales.efectivoBs;
    let efectivoUsdActual = montosIniciales.efectivoUsd;
    let pagoMovilActual = montosIniciales.pagoMovil;

    // 📄 PROCESAR CADA TRANSACCIÓN
    (transaccionesParaCalcular || []).forEach(transaccion => {
      
      // 🚨 CASO ESPECIAL: VUELTOS (usan metodoPagoPrincipal)
      if (transaccion.categoria?.includes('Vuelto de venta')) {
        const montoVuelto = parseFloat(transaccion.totalBs || transaccion.total_bs) || 0;
        const metodoVuelto = transaccion.metodoPagoPrincipal || 'efectivo_bs';
        
        // Los vueltos siempre son egresos físicos
        egresosBs += montoVuelto;
        
        // Afectar el método físico específico
        if (metodoVuelto === 'efectivo_bs') {
          efectivoBsActual -= montoVuelto;
        } else if (metodoVuelto === 'efectivo_usd') {
          const montoUsd = montoVuelto / (parseFloat(transaccion.tasaCambioUsada || transaccion.tasa_cambio_usada) || 1);
          efectivoUsdActual -= montoUsd;
          egresosUsd += montoUsd;
        } else if (metodoVuelto === 'pago_movil') {
          pagoMovilActual -= montoVuelto;
          egresosPagoMovil += montoVuelto;
        }
        
        return; // Skip procesamiento normal de pagos para vueltos
      }

      // 💳 CASO NORMAL: PROCESAR PAGOS DE LA TRANSACCIÓN
      const pagosTransaccion = transaccion.pagos || [];
      const tipoTransaccion = (transaccion.tipo || 'ingreso').toLowerCase();
      
      pagosTransaccion.forEach(pago => {
        const monto = parseFloat(pago.monto) || 0;
        const factor = tipoTransaccion === 'ingreso' ? 1 : -1;
        
        // Solo procesar los 3 métodos físicos
        if (pago.metodo === 'efectivo_bs' && pago.moneda === 'bs') {
          efectivoBsActual += monto * factor;
          
          if (tipoTransaccion === 'ingreso') {
            ingresosBs += monto;
          } else {
            egresosBs += monto;
          }
        }
        
        else if (pago.metodo === 'efectivo_usd' && pago.moneda === 'usd') {
          efectivoUsdActual += monto * factor;
          
          if (tipoTransaccion === 'ingreso') {
            ingresosUsd += monto;
          } else {
            egresosUsd += monto;
          }
        }
        
        else if (pago.metodo === 'pago_movil' && pago.moneda === 'bs') {
          pagoMovilActual += monto * factor;
          
          if (tipoTransaccion === 'ingreso') {
            ingresosPagoMovil += monto;
          } else {
            egresosPagoMovil += monto;
          }
        }
        
        // Los demás métodos (transferencia, zelle, etc.) son referenciales
        // Solo cuentan para estadísticas, no para montos físicos
      });
    });

    // 🧮 GARANTIZAR NO NEGATIVOS (físicamente imposible)
    efectivoBsActual = Math.max(0, efectivoBsActual);
    efectivoUsdActual = Math.max(0, efectivoUsdActual);
    pagoMovilActual = Math.max(0, pagoMovilActual);

    // 📈 BALANCES TOTALES
    const balanceBs = ingresosBs - egresosBs;
    const balanceUsd = ingresosUsd - egresosUsd;
    const balancePagoMovil = ingresosPagoMovil - egresosPagoMovil;

    return {
      // 💰 MONTOS FÍSICOS ACTUALES EN CAJA
      efectivoBs: efectivoBsActual,
      efectivoUsd: efectivoUsdActual,
      pagoMovil: pagoMovilActual,
      
      // 📊 MOVIMIENTOS DEL DÍA
      ingresosBs,
      egresosBs,
      ingresosUsd,
      egresosUsd,
      ingresosPagoMovil,
      egresosPagoMovil,
      
      // 📈 BALANCES (para estadísticas)
      balanceBs,
      balanceUsd,
      balancePagoMovil,
      
      // 🏦 MONTOS INICIALES (referencia)
      montosIniciales,
      
      // 📋 ESTADÍSTICAS
      transaccionesTotales: (transaccionesParaCalcular || []).length,
      ventasCount: (transaccionesParaCalcular || []).filter(t => (t.tipo || 'ingreso').toLowerCase() === 'ingreso').length,
      egresosCount: (transaccionesParaCalcular || []).filter(t => (t.tipo || 'egreso').toLowerCase() === 'egreso').length,
      
      // 🔍 INDICADOR DE FUENTE
      esCajaPendiente: !!cajaPendienteData
    };
  }, [cajaActual, transacciones, cajaPendienteData]); // 🔄 Se recalcula cuando cambian las transacciones o datos pendientes
};

// 🛠️ FUNCIONES AUXILIARES PARA FORMATEO CORRECTO
export const formatearBolivares = (amount) => {
  // 🇻🇪 FORMATO VENEZOLANO: 1.250,00 Bs
  return (amount || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatearDolares = (amount) => {
  // 🇺🇸 FORMATO ESTADOUNIDENSE: 1,250.00
  return (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};