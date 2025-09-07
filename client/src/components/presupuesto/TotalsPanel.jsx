// components/presupuesto/TotalsPanel.jsx - VERSIÓN REORGANIZADA Y COMPACTA 🎯
import React, { useState, useEffect } from 'react';
import { 
  Calculator, DollarSign, Percent, TrendingUp, 
  Info, Plus, X, ChevronDown, ChevronUp,
  Tag, Edit3, Check, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

// 🎨 OBSERVACIONES PREDEFINIDAS
const OBSERVACIONES_PREDEFINIDAS = [
  "📱 Pago Móvil: 0414-XXX-XXXX",
  "💰 Zelle: usuario@email.com", 
  "🏦 Binance ID: XXXXXXXX",
  "⚠️ Precios sujetos a cambio sin previo aviso",
  "🚚 Incluye delivery en Guanare",
  "⏰ Oferta válida por 48 horas",
  "💎 Garantía de 6 meses",
  "🎁 Incluye accesorios premium",
  "📞 Contacto WhatsApp: +58-XXX-XXX-XXXX",
  "🏪 Retiro en tienda disponible",
  "📄 Cotización válida hasta agotar stock",
  "💳 Aceptamos tarjetas de crédito/débito"
];

// 🔧 FUNCIONES HELPER
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// 🧩 COMPONENTE OBSERVACIONES INTELIGENTES
const ObservacionesInteligentes = ({ 
  observaciones = [], 
  onObservacionesChange 
}) => {
  const [showObservaciones, setShowObservaciones] = useState(false);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [observacionEditada, setObservacionEditada] = useState('');

  const handleAgregarPredefinida = (obs) => {
    if (!observaciones.includes(obs)) {
      onObservacionesChange([...observaciones, obs]);
      toast.success('✅ Observación agregada');
    } else {
      toast.info('ℹ️ Ya está agregada');
    }
  };

  const handleAgregarPersonalizada = () => {
    const obs = nuevaObservacion.trim();
    if (obs && !observaciones.includes(obs)) {
      onObservacionesChange([...observaciones, obs]);
      setNuevaObservacion('');
      toast.success('✅ Observación personalizada agregada');
    } else if (observaciones.includes(obs)) {
      toast.info('ℹ️ Ya existe esta observación');
    }
  };

  const handleEliminar = (index) => {
    const nuevas = observaciones.filter((_, i) => i !== index);
    onObservacionesChange(nuevas);
    toast.success('🗑️ Observación eliminada');
  };

  const handleIniciarEdicion = (index) => {
    setEditandoIndex(index);
    setObservacionEditada(observaciones[index]);
  };

  const handleGuardarEdicion = () => {
    const obs = observacionEditada.trim();
    if (obs) {
      const nuevas = observaciones.map((obs, i) => 
        i === editandoIndex ? observacionEditada : obs
      );
      onObservacionesChange(nuevas);
      setEditandoIndex(null);
      setObservacionEditada('');
      toast.success('✅ Observación actualizada');
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoIndex(null);
    setObservacionEditada('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
          <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
          Observaciones
          {observaciones.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
              {observaciones.length}
            </span>
          )}
        </h4>
        <button
          onClick={() => setShowObservaciones(!showObservaciones)}
          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showObservaciones ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Observaciones seleccionadas */}
{observaciones.length > 0 && (
  <div className="mb-3">
    <div className="flex flex-wrap gap-2">
      {observaciones.map((obs, index) => (
        <div
          key={index}
          className={`inline-flex items-center bg-blue-50 border border-blue-200 rounded-full transition-all ${
            editandoIndex === index ? 'pr-2' : 'pr-1'
          }`}
        >
          {editandoIndex === index ? (
            <div className="flex items-center space-x-2 px-3 py-1">
              <input
                type="text"
                value={observacionEditada}
                onChange={(e) => setObservacionEditada(e.target.value)}
                className="w-32 px-2 py-1 text-xs border border-blue-300 rounded-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                autoFocus
              />
              <button
                onClick={handleGuardarEdicion}
                className="text-green-600 hover:bg-green-100 p-1 rounded-full transition-colors"
                title="Guardar"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={handleCancelarEdicion}
                className="text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
                title="Cancelar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <span className="text-blue-800 text-xs px-3 py-1.5 max-w-[200px] truncate">
                {obs}
              </span>
              <div className="flex items-center space-x-0.5">
                <button
                  onClick={() => handleIniciarEdicion(index)}
                  className="text-blue-600 hover:bg-blue-100 p-1 rounded-full transition-colors"
                  title="Editar"
                >
                  <Edit3 className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => handleEliminar(index)}
                  className="text-red-600 hover:bg-red-100 p-1 rounded-full transition-colors"
                  title="Eliminar"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
)}

      {showObservaciones && (
        <div className="space-y-3">
          
          {/* Badges predefinidos */}
          {/* Badges predefinidos */}
<div>
  <h5 className="font-medium text-gray-700 mb-2 flex items-center text-sm">
    <Tag className="h-3 w-3 mr-1" />
    Observaciones frecuentes:
  </h5>
  <div className="flex flex-wrap gap-2">
    {OBSERVACIONES_PREDEFINIDAS.map((obs, index) => (
      <button
        key={index}
        onClick={() => handleAgregarPredefinida(obs)}
        disabled={observaciones.includes(obs)}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 ${
          observaciones.includes(obs)
            ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-300'
            : 'bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 border border-gray-300 hover:border-blue-300'
        }`}
      >
        <span className="truncate max-w-[200px]">{obs}</span>
        {observaciones.includes(obs) && (
          <Check className="h-3 w-3 text-green-600 ml-1 flex-shrink-0" />
        )}
      </button>
    ))}
  </div>
</div>

          {/* Observación personalizada */}
          <div>
            <h5 className="font-medium text-gray-700 mb-1 flex items-center text-sm">
              <Edit3 className="h-3 w-3 mr-1" />
              Observación personalizada:
            </h5>
            <div className="flex space-x-2">
              <input
                type="text"
                value={nuevaObservacion}
                onChange={(e) => setNuevaObservacion(e.target.value)}
                placeholder="Escribe una observación personalizada..."
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAgregarPersonalizada();
                  }
                }}
              />
              <button
                onClick={handleAgregarPersonalizada}
                disabled={!nuevaObservacion.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                <span>Agregar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 🎯 COMPONENTE PRINCIPAL REORGANIZADO
const TotalsPanel = ({ 
  items = [], 
  descuentoGlobal = 0,
  tipoDescuento = 'porcentaje',
  onDescuentoChange,
  impuesto = 16,
  tasaCambio = 1,
  observaciones = [],
  onObservacionesChange,
  title = "Resumen de Totales",
  showObservaciones = true,
  showDescuento = true
}) => {
  const [animatingTotal, setAnimatingTotal] = useState(false);

  // 🧮 CÁLCULOS PRINCIPALES
  // 🧮 CÁLCULOS PRINCIPALES CON LÓGICA IVA VENEZOLANA
const calculos = React.useMemo(() => {
  // 🆕 CALCULAR SUBTOTAL CONSIDERANDO IVA POR PRODUCTO
  const subtotal = items.reduce((sum, item) => {
    const precioUnitario = item.precio_unitario || 0;
    
    // Determinar si el precio ya incluye IVA
    const tieneIvaIncluido = item.proveedor_factura_iva !== false;
    const esServicio = item.tipo === 'servicio';
    
    let precioBase;
    if (esServicio || !tieneIvaIncluido) {
      // Servicios o productos sin IVA del proveedor: precio es base
      precioBase = precioUnitario;
    } else {
      // Productos con IVA del proveedor: descontar IVA
      precioBase = precioUnitario / 1.16;
    }
    
    return sum + (item.cantidad * precioBase);
  }, 0);

  // Descuento en USD (sobre la base sin IVA)
  let descuentoUsd;
  if (tipoDescuento === 'porcentaje') {
    descuentoUsd = (subtotal * descuentoGlobal) / 100;
  } else {
    descuentoUsd = descuentoGlobal / tasaCambio; // Convertir de Bs a USD
  }
  
  // Base imponible (después del descuento)
  const baseImponible = subtotal - descuentoUsd;
  
  // IVA (siempre 16% sobre la base imponible final)
  const ivaUsd = (baseImponible * impuesto) / 100;
  
  // Total en USD
  const totalUsd = baseImponible + ivaUsd;
  
  // Total en Bs
  const totalBs = totalUsd * tasaCambio;

  // Estadísticas adicionales
  const cantidadItems = items.reduce((sum, item) => sum + item.cantidad, 0);

 return {
  subtotal,
  descuentoUsd,
  descuentoBs: descuentoUsd * tasaCambio,
  baseImponible,
  ivaUsd,
  ivaBs: ivaUsd * tasaCambio,
  totalUsd,
  totalBs,
  cantidadItems
};
  }, [items, descuentoGlobal, tipoDescuento, impuesto, tasaCambio]);

  // Efecto para animación cuando cambia el total
  useEffect(() => {
    setAnimatingTotal(true);
    const timer = setTimeout(() => setAnimatingTotal(false), 500);
    return () => clearTimeout(timer);
  }, [calculos.totalUsd]);

  // 🔧 Manejar cambio de descuento
  const handleDescuentoChange = (campo, valor) => {
    if (campo === 'tipo') {
      onDescuentoChange && onDescuentoChange(descuentoGlobal, valor);
    } else if (campo === 'valor') {
      const numero = parseFloat(valor) || 0;
      onDescuentoChange && onDescuentoChange(numero, tipoDescuento);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 📊 RESUMEN PRINCIPAL COMPACTO */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          {title}
        </h3>

        {/* 🆕 FILA REORGANIZADA: Items | Base Imponible | Descuento (20% | 40% | 40%) */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          
          {/* Items (20% = 1/5) */}
          <div className="bg-white text-center rounded-lg p-3 border border-emerald-100">
            <div className="text-xs text-emerald-600 font-medium mb-1">Items</div>
            <div className="text-2xl font-bold text-emerald-600">
              {calculos.cantidadItems}
            </div>
            <div className="text-xs text-emerald-500">productos</div>
          </div>

          {/* Base Imponible (40% = 2/5) */}
          <div className="col-span-2 text-center bg-white rounded-lg p-3 border border-emerald-100">
            <div className="text-xs text-emerald-600 font-medium mb-1">Base Imponible</div>
            <div className="text-xl font-bold text-gray-900">
              {formatearVenezolano(calculos.baseImponible * tasaCambio)} Bs
            </div>
            <div className="text-xs text-gray-500">
              ${calculos.baseImponible.toFixed(2)}
            </div>
          </div>

          {/* Descuento (40% = 2/5) */}
            <div className="col-span-2 bg-white rounded-lg p-3 border border-emerald-100">
              <div className="text-xs text-emerald-600 font-medium mb-1">Descuento</div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={tipoDescuento}
                  onChange={(e) => handleDescuentoChange('tipo', e.target.value)}
                  className="text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white px-1 py-1"
                >
                  <option value="porcentaje">%</option>
                  <option value="monto">Bs</option>
                </select>
                <input
                  type="number"
                  step={tipoDescuento === 'porcentaje' ? '0.1' : '0.01'}
                  min="0"
                  max={tipoDescuento === 'porcentaje' ? '100' : undefined}
                  value={descuentoGlobal}
                  onChange={(e) => handleDescuentoChange('valor', e.target.value)}
                  className="text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 px-1 py-1"
                  placeholder="0"
                />
                <div className="text-xs bg-emerald-50 border border-emerald-200 rounded font-medium text-emerald-700 px-1 py-1 text-center">
                  {formatearVenezolano(calculos.descuentoBs)} Bs
                </div>
              </div>
            </div>
        </div>

     {/* Total principal con desglose integrado */}
<div className={`bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg py-6 px-4 text-white transition-all duration-500 ${
  animatingTotal ? 'scale-105 shadow-2xl' : 'scale-100 shadow-lg'
}`}>
  <div className="flex items-center justify-between">
    {/* Lado izquierdo - Desglose */}
    <div className="flex-1">
      <div className="text-emerald-100 text-sm mb-3 font-medium">DESGLOSE DETALLADO</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {/* Fila 1 */}
        <div>
          <div className="text-emerald-200 text-xs">Subtotal:</div>
          <div className="font-medium">{formatearVenezolano(calculos.subtotal * tasaCambio)} Bs</div>
        </div>
        
        <div>
          <div className="text-emerald-200 text-xs">Base Imponible:</div>
          <div className="font-medium">{formatearVenezolano(calculos.baseImponible * tasaCambio)} Bs</div>
        </div>
        
        {/* Fila 2 */}
        <div>
          {descuentoGlobal > 0 ? (
            <>
              <div className="text-red-200 text-xs">Descuento:</div>
              <div className="font-medium text-red-200">-{formatearVenezolano(calculos.descuentoBs)} Bs</div>
            </>
          ) : (
            <>
              <div className="text-emerald-200 text-xs opacity-50">Descuento:</div>
              <div className="font-medium opacity-50">0 Bs</div>
            </>
          )}
        </div>
        
        <div>
          <div className="text-emerald-200 text-xs">IVA ({impuesto}%):</div>
          <div className="font-medium">{formatearVenezolano(calculos.ivaBs)} Bs</div>
        </div>
      </div>
    </div>

    {/* Línea separadora */}
    <div className="w-px h-20 bg-white/20 mx-6"></div>

    {/* Lado derecho - Total */}
    <div className="text-right">
      <div className="text-emerald-100 text-sm mb-2">TOTAL PRESUPUESTO</div>
      <div className="text-3xl font-bold mb-2">
        {formatearVenezolano(calculos.totalBs)} Bs
      </div>
      <div className="text-emerald-200 text-sm">
        ${calculos.totalUsd.toFixed(2)}
      </div>
      <div className="text-xs text-emerald-200 mt-3">
        Tasa: {formatearVenezolano(tasaCambio)} Bs/$
      </div>
    </div>
  </div>
</div>
        
      </div>

      {/* Observaciones inteligentes */}
      {showObservaciones && (
        <ObservacionesInteligentes
          observaciones={observaciones}
          onObservacionesChange={onObservacionesChange}
        />
      )}
    </div>
  );
};

export default TotalsPanel;