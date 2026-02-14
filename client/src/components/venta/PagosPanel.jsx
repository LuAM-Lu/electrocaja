// components/venta/PagosPanel.jsx - SISTEMA DE PAGOS MODULAR (DISEÑO PREMIUM)
import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Plus from 'lucide-react/dist/esm/icons/plus'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Percent from 'lucide-react/dist/esm/icons/percent'
import MousePointerClick from 'lucide-react/dist/esm/icons/mouse-pointer-click'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import HandCoins from 'lucide-react/dist/esm/icons/hand-coins'
import Banknote from 'lucide-react/dist/esm/icons/banknote'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Landmark from 'lucide-react/dist/esm/icons/landmark'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import AlertOctagon from 'lucide-react/dist/esm/icons/alert-octagon'
import History from 'lucide-react/dist/esm/icons/history'
import CornerDownLeft from 'lucide-react/dist/esm/icons/corner-down-left'
import toast from '../../utils/toast.jsx';
import {
  generarPDFFactura,
  generarImagenWhatsApp,
  imprimirFacturaTermica,
  descargarPDF
} from '../../utils/printUtils';

// ===================================
//  FUNCIONES HELPER
// ===================================
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const limpiarNumero = (valor) => {
  if (!valor && valor !== 0) return 0;
  if (typeof valor === 'number' && valor > 0) return valor;

  let valorLimpio = valor.toString().replace(/[^\d.,]/g, '');

  if (valorLimpio.includes(',')) {
    const partes = valorLimpio.split(',');
    const entero = partes[0].replace(/\./g, '');
    const decimal = partes[1] || '0000';
    const decimalLimitado = decimal.substring(0, 4);
    const numero = parseFloat(entero + '.' + decimalLimitado);
    return numero > 0 ? numero : 0;
  } else if (valorLimpio.includes('.')) {
    const numero = parseFloat(valorLimpio);
    return numero > 0 ? numero : 0;
  }

  const numero = parseFloat(valorLimpio) || 0;
  return numero > 0 ? numero : 0;
};

// ===================================
//  CONFIGURACIÓN DE MÉTODOS DE PAGO
// ===================================
const METODOS_PAGO = [
  { value: 'efectivo_bs', label: 'Efectivo Bs', moneda: 'bs', requiere_referencia: false, icon: Banknote },
  { value: 'efectivo_usd', label: 'Efectivo USD', moneda: 'usd', requiere_referencia: false, icon: DollarSign },
  { value: 'pago_movil', label: 'Pago Móvil', moneda: 'bs', requiere_referencia: true, icon: Smartphone },
  { value: 'transferencia', label: 'Transferencia', moneda: 'bs', requiere_referencia: true, icon: Landmark },
  { value: 'zelle', label: 'Zelle', moneda: 'usd', requiere_referencia: true, icon: Wallet },
  { value: 'binance', label: 'Binance', moneda: 'usd', requiere_referencia: true, icon: Wallet },
  { value: 'tarjeta', label: 'Tarjeta', moneda: 'bs', requiere_referencia: true, icon: CreditCard }
];

const BANCOS_VENEZUELA = [
  'Venezuela - 0102', 'Venezolano Crédito - 0104', 'Mercantil - 0105', 'Provincial - 0108',
  'Bancaribe - 0114', 'Exterior - 0115', 'Caroní - 0128', 'Banesco - 0134', 'Sofitasa - 0137',
  'Plaza - 0138', 'Bangente - 0146', 'Fondo Común - 0151', '100% Banco - 0156', 'DelSur - 0157',
  'Tesoro - 0163', 'Agrícola - 0166', 'Bancrecer - 0168', 'R4 - 0169', 'Activo - 0171',
  'Bancamiga - 0172', 'Banplus - 0174', 'BANFANB - 0177', 'BNC - 0191', 'Crédito Popular - 0601'
];

const obtenerMetodosDisponibles = (pagosActuales, idActual = null) => {
  const metodosUsados = pagosActuales
    .filter(pago => pago.id !== idActual)
    .map(pago => pago.metodo);

  return METODOS_PAGO.filter(metodo => !metodosUsados.includes(metodo.value));
};

const obtenerMonedaPredominante = (pagos) => {
  if (!pagos || pagos.length === 0) return 'bs';
  const conteoMonedas = { bs: 0, usd: 0 };
  pagos.forEach(pago => {
    if (pago.monto && limpiarNumero(pago.monto) > 0) {
      const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);
      if (metodoInfo) conteoMonedas[metodoInfo.moneda]++;
    }
  });
  return conteoMonedas.usd > conteoMonedas.bs ? 'usd' : 'bs';
};

// ===================================
//  COMPONENTE PAGO ITEM (CONTROLLED)
// ===================================
const PagoItem = ({
  pago, index, onUpdate, onDelete, canDelete, tipo = "pago",
  exceso = 0, totalVueltoActual = 0, tasaCambio = 1,
  isEditing, onEdit, onSave
}) => {
  const metodo = METODOS_PAGO.find(m => m.value === pago.metodo) || METODOS_PAGO[0];
  const esVuelto = tipo === "vuelto";
  const monto = limpiarNumero(pago.monto);
  const MetodoIcon = metodo.icon;

  const handleMontoChange = (valor) => {
    let valorLimpio = valor.replace(/[^\d.,]/g, '').replace(/\./g, ',');
    const comas = (valorLimpio.match(/,/g) || []).length;
    if (comas > 1) {
      const ultimaComa = valorLimpio.lastIndexOf(',');
      valorLimpio = valorLimpio.substring(0, ultimaComa).replace(/,/g, '') + valorLimpio.substring(ultimaComa);
    }
    onUpdate(pago.id, 'monto', valorLimpio);
  };

  const handleGuardar = () => {
    // Usar limpiarNumero para validar correctamente montos con formato venezolano (ej: 10.000,00)
    if (!pago.monto || limpiarNumero(pago.monto) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    onSave(pago.id);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGuardar();
    }
  };

  // ESTILO EDICIÓN: CARD FORM
  if (isEditing) {
    return (
      <div className={`grid grid-cols-1 gap-2 border-2 border-dashed p-4 rounded-xl mb-4 relative animate-in fade-in zoom-in duration-200 ${esVuelto ? 'border-purple-500/20 bg-purple-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>

        {canDelete && (
          <button
            onClick={() => onDelete(pago.id)}
            className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Método</label>
            <div className="relative">
              <select
                value={pago.metodo}
                onChange={(e) => onUpdate(pago.id, 'metodo', e.target.value)}
                className="w-full bg-white border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none pr-8 py-2 pl-3 text-sm font-medium text-slate-700 h-[42px]"
                autoFocus
              >
                {obtenerMetodosDisponibles([], pago.id).map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Monto ({metodo.moneda === 'usd' ? 'USD' : 'Bs'})</label>
            <div className="relative group">
              <input
                className="w-full bg-white border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 transition-all text-lg font-bold py-2 px-3 text-emerald-700 font-mono h-[42px]"
                type="text"
                value={pago.monto}
                onChange={(e) => handleMontoChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0,00"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold pointer-events-none">
                {metodo.moneda === 'bs'
                  ? `$${(limpiarNumero(pago.monto) / tasaCambio).toFixed(2)}`
                  : `${(limpiarNumero(pago.monto) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`
                }
              </span>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 italic flex items-center gap-1 mt-1 justify-end">
          <CornerDownLeft className="h-2.5 w-2.5" /> Enter para guardar
        </p>

        {metodo.requiere_referencia && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Banco</label>
              <div className="relative">
                <select
                  value={pago.banco || ''}
                  onChange={(e) => onUpdate(pago.id, 'banco', e.target.value)}
                  className="w-full bg-white border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none py-2 px-3 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {BANCOS_VENEZUELA.map(banco => (
                    <option key={banco} value={banco}>{banco}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Referencia</label>
              <input
                className="w-full bg-white border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 transition-all py-2 px-3 text-sm font-mono"
                placeholder="Ej: 4852"
                type="text"
                value={pago.referencia || ''}
                onChange={(e) => onUpdate(pago.id, 'referencia', e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => onUpdate(pago.id, 'monto', '')}
            className="px-6 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all border border-slate-200 text-sm"
          >
            Limpiar
          </button>
          <button
            onClick={handleGuardar}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" /> Guardar
          </button>
        </div>
      </div>
    );
  }

  // ESTILO VISTA: LIST ITEM
  if (!isEditing) {
    const isVueltoStyle = tipo === 'vuelto';
    const bgClass = isVueltoStyle ? 'bg-purple-50/50 border-purple-100 hover:bg-purple-100/50' : 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100/50';
    const iconWrapperClass = isVueltoStyle ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600';
    const textClass = isVueltoStyle ? 'text-purple-700' : 'text-slate-700';
    const amountClass = isVueltoStyle ? 'text-purple-600' : 'text-emerald-600';

    return (
      <div
        className={`flex items-center justify-between p-2 rounded-lg border mb-2 cursor-pointer transition-colors group animate-in fade-in slide-in-from-left-4 duration-300 ${bgClass}`}
        onClick={() => onEdit(pago.id)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconWrapperClass}`}>
            <MetodoIcon className="h-4 w-4" />
          </div>
          <div>
            <p className={`text-xs font-bold leading-tight uppercase ${textClass}`}>{metodo.label}</p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              {metodo.requiere_referencia && (pago.banco || pago.referencia) ? (
                <>
                  {pago.referencia && <span className="font-mono">Ref: {pago.referencia}</span>}
                  {pago.banco && <span>• {pago.banco.split('-')[0].trim()}</span>}
                </>
              ) : (
                'Pago directo'
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xs font-bold leading-tight ${amountClass}`}>
            {isVueltoStyle ? '-' : ''} {metodo.moneda === 'bs' ? `${formatearVenezolano(monto)} Bs` : `$${formatearVenezolano(monto)}`}
          </p>
          <p className="text-[9px] text-slate-400">
            {metodo.moneda === 'bs' ? `$${(monto / tasaCambio).toFixed(2)}` : `${(monto * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`}
          </p>
        </div>
      </div>
    );
  }

};
// ===================================
//  COMPONENTE PRINCIPAL PAGOS PANEL
// ===================================
const PagosPanel = ({
  pagos, vueltos, onPagosChange, totalVenta, tasaCambio,
  title = "Métodos de Pago", descuento = 0, onDescuentoChange = () => { },
  onDescuentoLimpiar = () => { }, onValidationChange = () => { },
  permitirPagoParcial = false
}) => {
  const [editingIds, setEditingIds] = useState(new Set());

  // Inicializar edición para pagos vacíos al montar
  useEffect(() => {
    const idsParaEditar = pagos.filter(p => !p.monto).map(p => p.id);
    if (idsParaEditar.length > 0) {
      setEditingIds(prev => {
        const next = new Set(prev);
        idsParaEditar.forEach(id => next.add(id));
        return next;
      });
    }
  }, [pagos.length]); // Solo cuando cambia la longitud (agregado)

  const toggleEdit = (id, shouldEdit) => {
    setEditingIds(prev => {
      const next = new Set(prev);
      if (shouldEdit) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const calcularTotalPagado = () => {
    const total = pagos.reduce((total, pago) => {
      const monto = limpiarNumero(pago.monto);
      const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);
      return total + (metodoInfo?.moneda === 'bs' ? monto : (monto * tasaCambio));
    }, 0);
    return Math.round(total * 10000) / 10000;
  };

  const calcularTotalVuelto = () => {
    const total = vueltos.reduce((total, vuelto) => {
      const monto = limpiarNumero(vuelto.monto);
      const metodoInfo = METODOS_PAGO.find(m => m.value === vuelto.metodo);
      return total + (metodoInfo?.moneda === 'bs' ? monto : (monto * tasaCambio));
    }, 0);
    return Math.round(total * 10000) / 10000;
  };

  const totalPagado = calcularTotalPagado();
  const totalVuelto = calcularTotalVuelto();
  const totalConDescuento = totalVenta - descuento;
  const diferencia = totalPagado - totalConDescuento;
  const faltante = Math.max(0, -diferencia);
  const exceso = Math.max(0, diferencia);
  const excesoPendiente = Math.round((exceso - totalVuelto) * 100) / 100;

  const transaccionCompleta = permitirPagoParcial
    ? (totalPagado > 0.01 && totalPagado <= totalConDescuento + 0.01)
    : (faltante <= 0.01);
  const necesitaVuelto = excesoPendiente > 0.01;

  React.useEffect(() => {
    const excesoPendienteSignificativo = Math.abs(excesoPendiente) > 0.01 ? excesoPendiente : 0;
    const esValido = permitirPagoParcial
      ? (totalPagado > 0.01 && excesoPendiente <= 0.01)
      : (transaccionCompleta);

    onValidationChange(esValido, excesoPendienteSignificativo);
  }, [transaccionCompleta, excesoPendiente, onValidationChange, permitirPagoParcial, totalPagado]);

  const agregarPago = () => {
    if (obtenerMetodosDisponibles(pagos).length === 0) {
      toast.error('Todos los métodos de pago están en uso');
      return;
    }
    const newId = crypto.randomUUID();
    const nuevosPagos = [...pagos, {
      id: newId,
      metodo: obtenerMetodosDisponibles(pagos)[0].value,
      monto: '', banco: '', referencia: ''
    }];
    onPagosChange(nuevosPagos, vueltos);
  };

  const agregarVuelto = () => {
    if (obtenerMetodosDisponibles(vueltos).length === 0) {
      toast.error('Todos los métodos de vuelto están en uso');
      return;
    }
    const monedaPredominante = obtenerMonedaPredominante(pagos);
    const metodosDisp = obtenerMetodosDisponibles(vueltos);
    const metodoPreferido = metodosDisp.find(m => m.moneda === monedaPredominante) || metodosDisp[0];

    const nuevosVueltos = [...vueltos, {
      id: crypto.randomUUID(),
      metodo: metodoPreferido.value,
      monto: '', banco: '', referencia: ''
    }];
    onPagosChange(pagos, nuevosVueltos);
  };

  const actualizarPago = (id, campo, valor) => {
    const nuevosPagos = pagos.map(p => p.id === id ? { ...p, [campo]: valor } : p);
    onPagosChange(nuevosPagos, vueltos);
  };

  const actualizarVuelto = (id, campo, valor) => {
    const nuevosVueltos = vueltos.map(v => v.id === id ? { ...v, [campo]: valor } : v);
    onPagosChange(pagos, nuevosVueltos);
  };

  const eliminarPago = (id) => {
    if (pagos.length > 1) {
      const nuevosPagos = pagos.filter(p => p.id !== id);
      onPagosChange(nuevosPagos, vueltos);
      toggleEdit(id, false);
    }
  };

  const eliminarVuelto = (id) => {
    const nuevosVueltos = vueltos.filter(v => v.id !== id);
    onPagosChange(pagos, nuevosVueltos);
  };

  // Filtros para columnas
  const pagosEnEdicion = pagos.filter(p => editingIds.has(p.id));
  const pagosGuardados = pagos.filter(p => !editingIds.has(p.id));

  // Manejador para clic en Total Venta (Auto-llenar)
  const handleTotalVentaClick = () => {
    if (faltante <= 0.01) {
      toast.success('El monto ya está cubierto');
      return;
    }

    // Buscar si hay un pago actual en edición
    const pagoEnEdicion = pagos.find(p => editingIds.has(p.id));

    if (pagoEnEdicion) {
      // Actualizar el pago existente en edición
      actualizarPago(pagoEnEdicion.id, 'monto', faltante.toFixed(2).replace('.', ','));
      toast.info('Monto actualizado al restante');
    } else {
      // Crear nuevo pago con el restante
      if (obtenerMetodosDisponibles(pagos).length === 0) {
        toast.error('No hay más métodos de pago disponibles');
        return;
      }

      const newId = crypto.randomUUID();
      const metodoDisponibles = obtenerMetodosDisponibles(pagos);
      const metodo = metodoDisponibles.length > 0 ? metodoDisponibles[0].value : 'efectivo_bs';

      const nuevosPagos = [...pagos, {
        id: newId,
        metodo: metodo,
        monto: faltante.toFixed(2).replace('.', ','),
        banco: '',
        referencia: ''
      }];

      onPagosChange(nuevosPagos, vueltos);
      toggleEdit(newId, true);
      toast.success('Pago agregado por el restante');
    }
  };

  return (
    <main className="flex-grow w-full space-y-6">
      {/* HEADER SUMMARY */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <Banknote className="h-6 w-6 text-blue-600" />
            <h2 className="font-bold text-slate-700 text-lg">Resumen de Pagos</h2>
          </div>
          {faltante > 0.01 ? (
            <div className="flex items-center gap-2 bg-red-50 text-red-500 px-3 py-1 rounded-full text-sm font-bold border border-red-100 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              Faltan {formatearVenezolano(faltante)} Bs
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-500 px-3 py-1 rounded-full text-sm font-bold border border-emerald-100">
              <CheckCircle className="h-4 w-4" />
              Pago Completo
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow relative group" onClick={handleTotalVentaClick}>
            <p className="text-[10px] uppercase font-bold text-blue-600 mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Total Venta
            </p>
            <p className="text-xl font-bold text-slate-800 leading-tight">{formatearVenezolano(totalVenta)} Bs</p>
            <p className="text-sm text-blue-500 font-medium">${(totalVenta / tasaCambio).toFixed(2)}</p>
            <div className="absolute inset-0 bg-blue-100/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <span className="bg-white text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">Click para completar</span>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow relative group" onClick={onDescuentoChange}>
            {descuento > 0 && <span onClick={(e) => { e.stopPropagation(); onDescuentoLimpiar(); }} className="absolute top-2 right-2 text-purple-400 hover:text-red-500 z-10"><X className="h-3 w-3" /></span>}
            <p className="text-[10px] uppercase font-bold text-purple-600 mb-1 flex items-center gap-1">
              <Percent className="h-3 w-3" /> % Descuento
            </p>
            <p className="text-xl font-bold text-slate-800 leading-tight">{formatearVenezolano(descuento)} Bs</p>
            <p className="text-sm text-purple-500 font-medium">${(descuento / tasaCambio).toFixed(2)}</p>
            <div className="absolute inset-0 bg-purple-100/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
              <span className="bg-white text-purple-600 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">Clic para aplicar descuento</span>
            </div>
          </div>
          <div className={`bg-red-50 border-2 border-red-200 p-4 rounded-xl ring-offset-2 ${faltante > 0.01 ? 'ring-2 ring-red-500/10' : ''}`}>
            <p className="text-[10px] uppercase font-bold text-red-600 mb-1 flex items-center gap-1">
              <AlertOctagon className="h-3 w-3" /> Falta por Pagar
            </p>
            <p className="text-xl font-bold text-red-700 leading-tight">{formatearVenezolano(faltante)} Bs</p>
            <p className="text-sm text-red-500 font-medium">${(faltante / tasaCambio).toFixed(2)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
              <HandCoins className="h-3 w-3" /> Excedente
            </p>
            <p className="text-xl font-bold text-slate-600 leading-tight">{formatearVenezolano(excesoPendiente)} Bs</p>
            <p className="text-sm text-slate-400 font-medium">${(excesoPendiente / tasaCambio).toFixed(2)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1 flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Monto Pagado
            </p>
            <p className="text-xl font-bold text-emerald-700 leading-tight">{formatearVenezolano(totalPagado)} Bs</p>
            <p className="text-sm text-emerald-500 font-medium">${(totalPagado / tasaCambio).toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT COLUMN: PAYMENTS (Unified Section) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
          <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500 text-white p-1.5 rounded-lg">
                <Landmark className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-slate-700">Métodos de Pago</h3>
            </div>
            <button
              onClick={agregarPago}
              disabled={obtenerMetodosDisponibles(pagos).length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" /> Agregar
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {/* 1. PAGOS EN EDICIÓN (FORMULARIOS) */}
            {pagosEnEdicion.length > 0 && (
              <div className="space-y-4 mb-4">
                {pagosEnEdicion.map((pago, idx) => (
                  <PagoItem
                    key={pago.id}
                    pago={pago}
                    index={idx}
                    onUpdate={actualizarPago}
                    onDelete={eliminarPago}
                    canDelete={pagos.length > 1}
                    tipo="pago"
                    exceso={exceso}
                    totalVueltoActual={totalVuelto}
                    tasaCambio={tasaCambio}
                    isEditing={true}
                    onEdit={() => toggleEdit(pago.id, true)}
                    onSave={() => toggleEdit(pago.id, false)}
                  />
                ))}
              </div>
            )}

            {/* 2. PAGOS GUARDADOS (LISTA) */}
            {pagosGuardados.length > 0 && (
              <>
                {pagosEnEdicion.length > 0 && <div className="border-t border-slate-100 my-4"></div>}

                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">Pagos Guardados</h4>
                <div className="space-y-3">
                  {pagosGuardados.map((pago, idx) => (
                    <PagoItem
                      key={pago.id}
                      pago={pago}
                      index={idx}
                      onUpdate={actualizarPago}
                      onDelete={eliminarPago}
                      canDelete={pagos.length > 1}
                      tipo="pago"
                      exceso={exceso}
                      totalVueltoActual={totalVuelto}
                      tasaCambio={tasaCambio}
                      isEditing={false}
                      onEdit={() => toggleEdit(pago.id, true)}
                      onSave={() => toggleEdit(pago.id, false)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Empty State global */}
            {pagosEnEdicion.length === 0 && pagosGuardados.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <Landmark className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay pagos registrados</p>
                <p className="text-xs">Usa "Agregar" para iniciar</p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: VUELTOS ONLY */}
        <section className="flex flex-col gap-6">

          {/* VUELTOS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="bg-purple-500 text-white p-1.5 rounded-lg">
                  <RefreshCw className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-700">Vueltos</h3>
              </div>
              <button
                onClick={() => {
                  const monedaPredominante = obtenerMonedaPredominante(pagos);
                  const metodosDisp = obtenerMetodosDisponibles(vueltos);
                  const metodoPreferido = metodosDisp.find(m => m.moneda === monedaPredominante) || metodosDisp[0];
                  const newId = crypto.randomUUID();
                  const nuevosVueltos = [...vueltos, {
                    id: newId,
                    metodo: metodoPreferido?.value || 'efectivo_bs',
                    monto: '', banco: '', referencia: ''
                  }];
                  onPagosChange(pagos, nuevosVueltos);
                  toggleEdit(newId, true);
                }}
                disabled={!necesitaVuelto}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${necesitaVuelto ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {/* 1. VUELTOS EN EDICIÓN (FORMULARIOS) */}
              {vueltos.filter(v => editingIds.has(v.id)).length > 0 && (
                <div className="space-y-4 mb-4">
                  {vueltos.filter(v => editingIds.has(v.id)).map((vuelto, idx) => (
                    <PagoItem
                      key={vuelto.id}
                      pago={vuelto}
                      index={idx}
                      onUpdate={actualizarVuelto}
                      onDelete={eliminarVuelto}
                      canDelete={true}
                      tipo="vuelto"
                      exceso={exceso}
                      totalVueltoActual={totalVuelto}
                      tasaCambio={tasaCambio}
                      isEditing={true}
                      onEdit={() => toggleEdit(vuelto.id, true)}
                      onSave={() => toggleEdit(vuelto.id, false)}
                    />
                  ))}
                </div>
              )}

              {/* 2. VUELTOS GUARDADOS (LISTA) */}
              {vueltos.filter(v => !editingIds.has(v.id)).length > 0 && (
                <>
                  {vueltos.filter(v => editingIds.has(v.id)).length > 0 && <div className="border-t border-slate-100 my-4"></div>}

                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">Vueltos Guardados</h4>
                  <div className="space-y-3">
                    {vueltos.filter(v => !editingIds.has(v.id)).map((vuelto, idx) => (
                      <PagoItem
                        key={vuelto.id}
                        pago={vuelto}
                        index={idx}
                        onUpdate={actualizarVuelto}
                        onDelete={eliminarVuelto}
                        canDelete={true}
                        tipo="vuelto"
                        exceso={exceso}
                        totalVueltoActual={totalVuelto}
                        tasaCambio={tasaCambio}
                        isEditing={false}
                        onEdit={() => toggleEdit(vuelto.id, true)}
                        onSave={() => toggleEdit(vuelto.id, false)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Empty State Vueltos */}
              {vueltos.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-4 min-h-[200px]">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-4 border-slate-100 mb-2">
                    <RefreshCw className="h-6 w-6 text-slate-300" />
                  </div>
                  <h4 className="font-bold text-slate-600 text-sm">No hay vuelto pendiente</h4>
                </div>
              )}
            </div>
          </div>

        </section>
      </div>
    </main>
  );
};

export default PagosPanel;