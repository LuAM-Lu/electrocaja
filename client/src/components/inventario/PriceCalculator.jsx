// components/inventario/PriceCalculator.jsx
import React, { useState, useEffect } from 'react';
import Calculator from 'lucide-react/dist/esm/icons/calculator'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Zap from 'lucide-react/dist/esm/icons/zap'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Target from 'lucide-react/dist/esm/icons/target'
import Percent from 'lucide-react/dist/esm/icons/percent'
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import toast from '../../utils/toast.jsx';

const PriceCalculator = ({
  formData,
  setFormData,
  currency = 'USD',
  showAdvanced = true,
  className = ""
}) => {
  const [calculationMode, setCalculationMode] = useState('margin'); // 'margin' | 'price' | 'cost'
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculation, setLastCalculation] = useState(null);

  // Márgenes predefinidos venezolanos
  const MARGENES_RAPIDOS = [
    { label: '15%', value: 15, color: 'bg-red-100 text-red-700 hover:bg-red-200', desc: 'Mínimo' },
    { label: '25%', value: 25, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200', desc: 'Bajo' },
    { label: '30%', value: 30, color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', desc: 'Estándar' },
    { label: '50%', value: 50, color: 'bg-green-100 text-green-700 hover:bg-green-200', desc: 'Bueno' },
    { label: '75%', value: 75, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', desc: 'Alto' },
    { label: '100%', value: 100, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', desc: 'Premium' }
  ];

  // Limpiar y convertir a número
  const cleanNumber = (value) => {
    if (typeof value === 'number') return value;
    const cleaned = parseFloat(value) || 0;
    return Math.max(0, cleaned);
  };

  // Formatear número para mostrar
  const formatNumber = (value, decimals = 2) => {
    const num = cleanNumber(value);
    return num.toFixed(decimals);
  };

  // Calcular precio de venta basado en costo y margen
  // Calcular precio de venta basado en costo y margen
  const calcularPrecioVenta = (costo = null, margen = null) => {
    setIsCalculating(true);

    const costoValue = cleanNumber(costo || formData.precio_costo);
    const margenValue = cleanNumber(margen || formData.margen_porcentaje);
    const tieneFacturaIva = formData.proveedor_factura_iva !== false;

    //  LÓGICA DE IVA VENEZOLANA
    let costoBase;
    if (formData.tipo === 'servicio') {
      // Servicios: el costo es base (sin IVA)
      costoBase = costoValue;
    } else if (tieneFacturaIva) {
      // Proveedor CON factura: descontar IVA del costo
      costoBase = costoValue / 1.16;
    } else {
      // Proveedor SIN factura: el costo ya es base
      costoBase = costoValue;
    }

    if (costoValue <= 0) {
      toast.error('Ingrese un precio de costo válido');
      setIsCalculating(false);
      return;
    }

    if (margenValue < 0) {
      toast.error('El margen no puede ser negativo');
      setIsCalculating(false);
      return;
    }

    // Calcular precio de venta base (sin IVA)
    const precioVentaBase = costoBase * (1 + margenValue / 100);
    const gananciaReal = precioVentaBase - costoBase;

    setFormData(prev => ({
      ...prev,
      precio_venta: formatNumber(precioVentaBase)
    }));
    setLastCalculation({
      tipo: 'precio_venta',
      costo: costoValue,
      costoBase: costoBase,
      margen: margenValue,
      venta: precioVentaBase,
      ganancia: gananciaReal,
      tieneFacturaIva: tieneFacturaIva
    });
    setTimeout(() => {
      setIsCalculating(false);

      //  MENSAJE MEJORADO CON CONTEXTO IVA
      const mensajeIva = formData.tipo === 'servicio'
        ? ' (se agregará 16% IVA en venta)'
        : tieneFacturaIva
          ? ' (base sin IVA, se agregará 16% en venta)'
          : ' (se agregará 16% IVA en venta)';

      toast.success(`Precio calculado: $${formatNumber(precioVentaBase)}${mensajeIva}\n Ganancia: $${formatNumber(gananciaReal)}`, {
        duration: 3000,
      });
    }, 300);
  };

  // Calcular margen basado en costo y precio de venta
  const calcularMargen = () => {
    setIsCalculating(true);

    const costoValue = cleanNumber(formData.precio_costo);
    const ventaValue = cleanNumber(formData.precio_venta);

    if (costoValue <= 0) {
      toast.error('Ingrese un precio de costo válido');
      setIsCalculating(false);
      return;
    }

    if (ventaValue <= 0) {
      toast.error('Ingrese un precio de venta válido');
      setIsCalculating(false);
      return;
    }

    if (ventaValue <= costoValue) {
      toast.error('El precio de venta debe ser mayor al costo');
      setIsCalculating(false);
      return;
    }

    const margen = ((ventaValue - costoValue) / costoValue) * 100;
    const ganancia = ventaValue - costoValue;

    setFormData(prev => ({
      ...prev,
      margen_porcentaje: formatNumber(margen, 1)
    }));

    setLastCalculation({
      tipo: 'margen',
      costo: costoValue,
      venta: ventaValue,
      margen: margen,
      ganancia: ganancia
    });

    setTimeout(() => {
      setIsCalculating(false);
      toast.success(`Margen calculado: ${formatNumber(margen, 1)}%\n Ganancia: $${formatNumber(ganancia)}`, {
        duration: 3000,
      });
    }, 300);
  };

  // Calcular costo basado en precio de venta y margen
  const calcularCosto = () => {
    setIsCalculating(true);

    const ventaValue = cleanNumber(formData.precio_venta);
    const margenValue = cleanNumber(formData.margen_porcentaje);

    if (ventaValue <= 0) {
      toast.error('Ingrese un precio de venta válido');
      setIsCalculating(false);
      return;
    }

    if (margenValue < 0) {
      toast.error('El margen no puede ser negativo');
      setIsCalculating(false);
      return;
    }

    const costo = ventaValue / (1 + margenValue / 100);
    const ganancia = ventaValue - costo;

    setFormData(prev => ({
      ...prev,
      precio_costo: formatNumber(costo)
    }));

    setLastCalculation({
      tipo: 'costo',
      venta: ventaValue,
      margen: margenValue,
      costo: costo,
      ganancia: ganancia
    });

    setTimeout(() => {
      setIsCalculating(false);
      toast.success(`Costo calculado: $${formatNumber(costo)}\n Ganancia: $${formatNumber(ganancia)}`, {
        duration: 3000,
      });
    }, 300);
  };

  // Aplicar margen rápido
  const aplicarMargenRapido = (porcentaje) => {
    setFormData(prev => ({ ...prev, margen_porcentaje: porcentaje.toString() }));

    // Auto-calcular precio si hay costo
    if (formData.precio_costo && cleanNumber(formData.precio_costo) > 0) {
      setTimeout(() => {
        calcularPrecioVenta(null, porcentaje);
      }, 100);
    } else {
      toast.info(`Margen establecido en ${porcentaje}%\n Ingrese el costo para calcular precio`, {
        duration: 2000,
      });
    }
  };

  // Resetear calculadora
  const resetCalculator = () => {
    setLastCalculation(null);
    toast.success('Calculadora reiniciada');
  };

  // Obtener estado de validación
  const getValidationStatus = () => {
    const costo = cleanNumber(formData.precio_costo);
    const venta = cleanNumber(formData.precio_venta);
    const margen = cleanNumber(formData.margen_porcentaje);

    if (costo > 0 && venta > 0) {
      if (venta <= costo) {
        return { type: 'error', message: 'Precio de venta debe ser mayor al costo' };
      }
      if (margen < 10) {
        return { type: 'warning', message: 'Margen muy bajo (menos del 10%)' };
      }
      if (margen > 200) {
        return { type: 'warning', message: 'Margen muy alto (más del 200%)' };
      }
      return { type: 'success', message: 'Precios configurados correctamente' };
    }

    return { type: 'info', message: 'Complete los campos para validar' };
  };

  const validationStatus = getValidationStatus();

  // Obtener estadísticas calculadas
  const getStats = () => {
    const costo = cleanNumber(formData.precio_costo);
    const venta = cleanNumber(formData.precio_venta);
    const margen = cleanNumber(formData.margen_porcentaje);

    if (costo > 0 && venta > 0) {
      return {
        ganancia: venta - costo,
        margenReal: ((venta - costo) / costo) * 100,
        markup: ((venta - costo) / venta) * 100,
        roi: ((venta - costo) / costo) * 100
      };
    }

    return null;
  };

  const stats = getStats();

  return (
    <div className={`bg-gradient-to-br from-blue-50/80 to-blue-100/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-blue-200/50 shadow-sm ${className}`}>

      {/* Header + Margen en una fila */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Calculator className={`h-4 w-4 text-blue-600 ${isCalculating ? 'animate-bounce' : ''}`} />
          <h4 className="text-sm font-bold text-blue-900">Calculadora de Precios</h4>
          <span className="text-xs font-medium text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">{currency}</span>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="h-3 w-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">Margen</span>
          <input
            type="number"
            step="1"
            min="0"
            max="500"
            value={Math.round(cleanNumber(formData.margen_porcentaje))}
            onChange={(e) => {
              const margen = parseFloat(e.target.value) || 0;
              setFormData(prev => ({ ...prev, margen_porcentaje: e.target.value }));
              if (formData.precio_costo && cleanNumber(formData.precio_costo) > 0) {
                setTimeout(() => calcularPrecioVenta(null, margen), 100);
              }
            }}
            className="w-12 px-1 py-0.5 text-sm text-center font-bold border border-blue-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-bold text-blue-600">%</span>
          {lastCalculation && (
            <button
              type="button"
              onClick={resetCalculator}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="Reiniciar"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Slider con gradiente */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="200"
          step="5"
          value={Math.min(200, cleanNumber(formData.margen_porcentaje))}
          onChange={(e) => {
            const margen = parseFloat(e.target.value);
            setFormData(prev => ({ ...prev, margen_porcentaje: margen.toString() }));
            if (formData.precio_costo && cleanNumber(formData.precio_costo) > 0) {
              setTimeout(() => calcularPrecioVenta(null, margen), 100);
            }
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              #ef4444 0%, 
              #f97316 15%, 
              #eab308 25%, 
              #22c55e 40%, 
              #3b82f6 60%, 
              #8b5cf6 80%, 
              #ec4899 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span>
          <span className="text-yellow-600">30%</span>
          <span className="text-green-600">50%</span>
          <span className="text-blue-600">100%</span>
          <span className="text-purple-600">150%</span>
          <span className="text-pink-600">200%</span>
        </div>
      </div>

      {/* Estado de validación */}
      <div className="mb-4">
        <div className={`flex items-center space-x-2 p-2 rounded-lg text-xs backdrop-blur-sm ${validationStatus.type === 'success' ? 'bg-green-50/80 border border-green-200/50 text-green-700' :
          validationStatus.type === 'error' ? 'bg-red-50/80 border border-red-200/50 text-red-700' :
            validationStatus.type === 'warning' ? 'bg-orange-50/80 border border-orange-200/50 text-orange-700' :
              'bg-gray-50/80 border border-gray-200/50 text-gray-600'
          }`}>
          {validationStatus.type === 'success' && <CheckCircle className="h-3 w-3" />}
          {validationStatus.type === 'error' && <AlertTriangle className="h-3 w-3" />}
          {validationStatus.type === 'warning' && <AlertTriangle className="h-3 w-3" />}
          <span className="font-medium">{validationStatus.message}</span>
        </div>
      </div>

      {/* Resumen estadístico */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-blue-200/50 text-center">
            <div className="text-xs text-blue-600 mb-1">Costo</div>
            <div className="font-bold text-blue-900">${formatNumber(cleanNumber(formData.precio_costo))}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-green-200/50 text-center">
            <div className="text-xs text-green-600 mb-1">Ganancia</div>
            <div className="font-bold text-green-900">${formatNumber(stats.ganancia)}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-purple-200/50 text-center">
            <div className="text-xs text-purple-600 mb-1">Margen</div>
            <div className="font-bold text-purple-900">{formatNumber(stats.margenReal, 1)}%</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 text-center">
            <div className="text-xs text-orange-600 mb-1">Venta</div>
            <div className="font-bold text-orange-900">${formatNumber(cleanNumber(formData.precio_venta))}</div>
          </div>
        </div>
      )}

      {/* Última calculación - Una fila */}
      {lastCalculation && (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <ArrowRightLeft className="h-3 w-3" />
            <span className="capitalize">{lastCalculation.tipo.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Ganancia: <span className="font-bold text-green-600">${formatNumber(lastCalculation.ganancia)}</span></span>
            {lastCalculation.margen && (
              <span>Margen: <span className="font-bold text-blue-600">{formatNumber(lastCalculation.margen, 1)}%</span></span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PriceCalculator;