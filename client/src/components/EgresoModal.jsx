// components/EgresoModal.jsx - HEADER MODERNIZADO
import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Minus from 'lucide-react/dist/esm/icons/minus'
import Calculator from 'lucide-react/dist/esm/icons/calculator'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import Coins from 'lucide-react/dist/esm/icons/coins'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Settings from 'lucide-react/dist/esm/icons/settings'
import { useCajaStore } from '../store/cajaStore';
import toast from '../utils/toast.jsx';
import PagosPanel from './venta/PagosPanel';
import DescuentoModal from './DescuentoModal';
import { api } from '../config/api';

const METODOS_PAGO = [
  { value: 'efectivo_bs', label: 'Efectivo Bs', requiere_referencia: false, moneda: 'bs' },
  { value: 'efectivo_usd', label: 'Efectivo USD', requiere_referencia: false, moneda: 'usd' },
  { value: 'pago_movil', label: 'Pago Móvil', requiere_referencia: true, moneda: 'bs' },
  { value: 'transferencia', label: 'Transferencia', requiere_referencia: true, moneda: 'bs' },
  { value: 'binance', label: 'Binance (USDT)', requiere_referencia: true, moneda: 'usd' }
];

const BANCOS = [
  'Venezuela', 'Provincial', 'Mercantil', 'BNC'
];

const CATEGORIAS_EGRESO = [
  'Gastos Operativos',
  'Compra de Mercancía',
  'Servicios Básicos',
  'Mantenimiento',
  'Transporte',
  'Alimentación',
  'Suministros de Oficina',
  'Impuestos',
  'Pago a Proveedores',
  'Otros Gastos'
];

// Categorías que se consideran servicios y requieren modal de descuento
const CATEGORIAS_SERVICIO = ['Servicios Básicos', 'Mantenimiento'];

// ===========================
//  FUNCIONES DE FORMATEO VENEZOLANO
// ===========================

const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '';

  // Si ya es un número, usarlo directamente
  if (typeof valor === 'number') {
    return valor.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Si es string, procesarlo
  let valorLimpio = valor.toString().replace(/[^\d.,]/g, '');
  if (!valorLimpio) return '';

  let numero;

  if (valorLimpio.includes(',')) {
    const partes = valorLimpio.split(',');
    const entero = partes[0].replace(/\./g, '');
    const decimal = partes[1] || '00';
    numero = parseFloat(entero + '.' + decimal.substring(0, 2));
  }
  else if (valorLimpio.includes('.')) {
    const partes = valorLimpio.split('.');
    if (partes.length === 2 && partes[1].length <= 2) {
      numero = parseFloat(valorLimpio);
    } else {
      const entero = valorLimpio.replace(/\./g, '');
      numero = parseFloat(entero);
    }
  }
  else {
    numero = parseFloat(valorLimpio);
  }

  if (isNaN(numero)) return valor;

  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatearTasa = (valor) => {
  if (!valor && valor !== 0) return '';

  const numero = parseFloat(valor);
  if (isNaN(numero)) return '';

  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false
  });
};

const limpiarNumero = (valor) => {
  if (!valor && valor !== 0) return 0;

  // Si ya es un número, devolverlo
  if (typeof valor === 'number') return valor;

  let valorLimpio = valor.toString().replace(/[^\d.,]/g, '');

  if (valorLimpio.includes(',')) {
    const partes = valorLimpio.split(',');
    const entero = partes[0].replace(/\./g, '');
    const decimal = partes[1] || '00';
    return parseFloat(entero + '.' + decimal);
  } else if (valorLimpio.includes('.')) {
    const partes = valorLimpio.split('.');
    if (partes.length === 2 && partes[1].length <= 2) {
      return parseFloat(valorLimpio);
    } else {
      return parseFloat(valorLimpio.replace(/\./g, ''));
    }
  }

  return parseFloat(valorLimpio) || 0;
};

// ===========================
//  COMPONENTE SELECTOR DE TASA
// ===========================
const SelectorTasaCambio = ({ tasaActual, onCambioTasa }) => {
  const [tipoTasa, setTipoTasa] = useState('bcv');
  const [tasaManual, setTasaManual] = useState('');
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  const handleCambioTipo = (tipo) => {
    setTipoTasa(tipo);
    if (tipo !== 'manual') {
      onCambioTasa(tipo);
    }
  };

  const handleTasaManual = (valor) => {
    setTasaManual(valor);
    const numeroLimpio = limpiarNumero(valor);
    if (numeroLimpio > 0) {
      onCambioTasa('manual', numeroLimpio);
    }
  };

  return (
    <div className="relative z-[9999]">
      <button
        type="button"
        onClick={() => setMostrarOpciones(!mostrarOpciones)}
        className="flex items-center space-x-2 px-3 py-2 text-xs bg-white/20 text-white rounded-lg border border-white/30 hover:bg-white/30 transition-colors backdrop-blur-sm"
      >
        <Settings className="h-3 w-3" />
        <span>Tasa: {formatearTasa(tasaActual)} Bs/USD</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${mostrarOpciones ? 'rotate-180' : ''}`} />
      </button>

      {mostrarOpciones && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setMostrarOpciones(false)}
          />

          <div
            className="fixed w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
            style={{
              top: '9rem',
              right: '42rem'
            }}
          >
            <div className="p-3 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-900 mb-2">Seleccionar Tasa de Cambio</div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    id="tipo-tasa-bcv"
                    type="radio"
                    name="tipoTasa"
                    value="bcv"
                    checked={tipoTasa === 'bcv'}
                    onChange={(e) => handleCambioTipo(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="text-xs text-gray-700">BCV Oficial</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    id="tipo-tasa-personalizado"
                    type="radio"
                    name="tipoTasa"
                    value="personalizado"
                    checked={tipoTasa === 'personalizado'}
                    onChange={(e) => handleCambioTipo(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="text-xs text-gray-700">Personalizado</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    id="tipo-tasa-manual"
                    type="radio"
                    name="tipoTasa"
                    value="manual"
                    checked={tipoTasa === 'manual'}
                    onChange={(e) => handleCambioTipo(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="text-xs text-gray-700">Manual</span>
                </label>

                {tipoTasa === 'manual' && (
                  <div className="ml-6 mt-2">
                    <input
                      id="tasa-manual-input"
                      name="tasaManual"
                      type="text"
                      value={tasaManual}
                      onChange={(e) => handleTasaManual(e.target.value)}
                      onBlur={(e) => {
                        const valorFormateado = formatearTasa(e.target.value);
                        setTasaManual(valorFormateado);
                      }}
                      placeholder="Ej: 37,50"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 placeholder-gray-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => setMostrarOpciones(false)}
                className="w-full text-xs text-gray-600 hover:text-gray-800 py-1 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ===========================
//  COMPONENTE PAGO ITEM
// ===========================
const PagoItemCompacto = ({ pago, index, onUpdate, onDelete, canDelete }) => {
  const metodo = METODOS_PAGO.find(m => m.value === pago.metodo);

  const handleMontoChange = (valor) => {
    const valorLimpio = valor.replace(/[^\d.,]/g, '');
    onUpdate(pago.id, 'monto', valorLimpio);
  };

  const handleMontoBlur = (valor) => {
    const valorFormateado = formatearVenezolano(valor);
    onUpdate(pago.id, 'monto', valorFormateado);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-100 rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-xs ring-1 ring-slate-200/50">
          {index + 1}
        </div>

        <div className="flex-[2]">
          <select
            value={pago.metodo}
            onChange={(e) => onUpdate(pago.id, 'metodo', e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white transition-all text-slate-700 font-medium"
          >
            {METODOS_PAGO.map(metodo => (
              <option key={metodo.value} value={metodo.value}>
                {metodo.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-[3]">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs font-medium">
              {metodo?.moneda === 'usd' ? 'USD' : 'Bs'}
            </span>
            <input
              id={`egreso-monto-${pago.id}`}
              name={`egresoMonto${pago.id}`}
              type="text"
              value={pago.monto}
              onChange={(e) => handleMontoChange(e.target.value)}
              onBlur={(e) => handleMontoBlur(e.target.value)}
              placeholder="0,00"
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white transition-all font-mono text-right font-semibold text-slate-700"
            />
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(pago.id)}
            className="transition-all p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100"
            title="Eliminar forma de pago"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {metodo?.requiere_referencia && (
        <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-100/80">
          <div>
            <select
              value={pago.banco}
              onChange={(e) => onUpdate(pago.id, 'banco', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 text-slate-600 transition-all"
            >
              <option value="">Banco...</option>
              {BANCOS.map(banco => (
                <option key={banco} value={banco}>{banco}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              value={pago.referencia}
              onChange={(e) => onUpdate(pago.id, 'referencia', e.target.value)}
              placeholder="Referencia / Nº Op."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 text-slate-600 transition-all font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================
//  COMPONENTE PRINCIPAL
// ===========================
const EgresoModal = ({ isOpen, onClose, emitirEvento, onMinimize }) => {
  const { agregarTransaccion, tasaCambio } = useCajaStore();

  const [descripcion, setDescripcion] = useState('');
  const [categoriaEgreso, setCategoriaEgreso] = useState('');
  const [mostrarObservaciones, setMostrarObservaciones] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [monedaEgreso, setMonedaEgreso] = useState('bs');
  const [tasaActualTransaccion, setTasaActualTransaccion] = useState(tasaCambio);
  const [pagos, setPagos] = useState([{
    id: 1,
    metodo: 'efectivo_bs',
    monto: '',
    banco: '',
    referencia: ''
  }]);
  const [vueltos, setVueltos] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [showDescuentoModal, setShowDescuentoModal] = useState(false);
  const [pagosValidos, setPagosValidos] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generar sesión ID para el modal de descuento
  const [sesionId] = useState(() => {
    return `sesion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  // Detectar si es servicio
  const esServicio = CATEGORIAS_SERVICIO.includes(categoriaEgreso);

  React.useEffect(() => {
    setTasaActualTransaccion(tasaCambio);
  }, [tasaCambio]);

  const handleCambioTasa = async (tipo, valorManual = null) => {
    if (tipo === 'manual' && valorManual) {
      setTasaActualTransaccion(valorManual);
    } else if (tipo === 'bcv') {
      setTasaActualTransaccion(tasaCambio);
    } else if (tipo === 'personalizado') {
      try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo');
        const data = await response.json();
        setTasaActualTransaccion(data.promedio);
      } catch (error) {
        toast.error('Error al cargar tasa paralelo');
      }
    }
  };

  const agregarPago = () => {
    setPagos([...pagos, {
      id: crypto.randomUUID(),
      metodo: 'efectivo_bs',
      monto: '',
      banco: '',
      referencia: ''
    }]);
  };

  const eliminarPago = (id) => {
    if (pagos.length > 1) {
      setPagos(pagos.filter(p => p.id !== id));
    }
  };

  const [usuariosSistema, setUsuariosSistema] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState([]);

  // Cargar usuarios del sistema para autocompletado
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const response = await api.get('/users/simple');
        if (response.data && response.data.data) {
          setUsuariosSistema(response.data.data);
        } else if (Array.isArray(response.data)) {
          setUsuariosSistema(response.data);
        }
      } catch (error) {
        console.error('Error cargando usuarios para autocomplete:', error);
      }
    };
    cargarUsuarios();
  }, []);

  const actualizarPago = (id, campo, valor) => {
    setPagos(pagos.map(p => {
      if (p.id === id) {
        const nuevoPago = { ...p, [campo]: valor };
        // Si cambia a pago móvil y no tiene banco, asignar Venezuela por defecto
        if (campo === 'metodo' && valor === 'pago_movil' && !p.banco) {
          nuevoPago.banco = 'Venezuela';
        }
        return nuevoPago;
      }
      return p;
    }));
  };

  const handleDescripcionChange = (e) => {
    const valor = e.target.value;
    setDescripcion(valor);

    // Lógica autocompletado con @
    const cursorEn = e.target.selectionStart;
    const textoHastaCursor = valor.substring(0, cursorEn);
    const busquedaMatch = textoHastaCursor.match(/@(\w*)$/);

    if (busquedaMatch) {
      const query = busquedaMatch[1].toLowerCase();
      const filtrados = usuariosSistema.filter(u =>
        u.nombre.toLowerCase().includes(query) ||
        u.usuario.toLowerCase().includes(query)
      );
      setSugerenciasFiltradas(filtrados);
      setMostrarSugerencias(filtrados.length > 0);
    } else {
      setMostrarSugerencias(false);
    }
  };

  const seleccionarUsuarioSugerido = (usuario) => {
    const valorActual = descripcion;
    const match = valorActual.match(/@(\w*)$/); // Match al final o cursor (simplificado para final)

    // Una implementación más robusta buscaría la posición del cursor, pero asumiremos final para simplificar la UX rápida
    if (match) {
      const nuevoValor = valorActual.substring(0, match.index) + usuario.nombre + ' ';
      setDescripcion(nuevoValor);
      setMostrarSugerencias(false);
    }
  };

  const calcularTotalPagado = () => {
    return pagos.reduce((total, pago) => {
      const monto = limpiarNumero(pago.monto);
      const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);

      if (metodoInfo?.moneda === 'bs') {
        return total + monto;
      } else {
        return total + (monto * tasaActualTransaccion);
      }
    }, 0);
  };

  const obtenerEstadisticasEgreso = () => {
    const montoEgresoNumero = limpiarNumero(montoEgreso);

    const montoEgresoBs = monedaEgreso === 'usd'
      ? montoEgresoNumero * tasaActualTransaccion
      : montoEgresoNumero;
    const montoEgresoUSD = monedaEgreso === 'usd'
      ? montoEgresoNumero
      : montoEgresoNumero / tasaActualTransaccion;

    const totalPagado = calcularTotalPagado();
    const diferencia = totalPagado - montoEgresoBs;
    const faltante = Math.max(0, -diferencia);
    const exceso = Math.max(0, diferencia);

    return {
      montoEgresoNumero,
      montoEgresoBs,
      montoEgresoUSD,
      totalPagado,
      totalPagadoUSD: totalPagado / tasaActualTransaccion,
      faltante,
      faltanteUSD: faltante / tasaActualTransaccion,
      exceso,
      excesoUSD: exceso / tasaActualTransaccion,
      completado: Math.abs(diferencia) <= 0.01,
      transaccionValida: Math.abs(diferencia) <= 0.01
    };
  };

  const validarFormulario = () => {
    if (!descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return false;
    }

    if (!categoriaEgreso) {
      toast.error('Debe seleccionar una categoría de egreso');
      return false;
    }

    if (!montoEgreso || limpiarNumero(montoEgreso) <= 0) {
      toast.error('El monto del egreso debe ser mayor a 0');
      return false;
    }

    const estadisticas = obtenerEstadisticasEgreso();

    if (!estadisticas.completado) {
      if (estadisticas.faltante > 0) {
        toast.error(`Faltan ${formatearVenezolano(estadisticas.faltante)} Bs para completar el egreso`);
      } else {
        toast.error(`Hay un exceso de ${formatearVenezolano(estadisticas.exceso)} Bs en los pagos`);
      }
      return false;
    }

    for (const pago of pagos) {
      if (!pago.monto || limpiarNumero(pago.monto) <= 0) {
        toast.error('Todos los montos de pago deben ser mayores a 0');
        return false;
      }

      const metodo = METODOS_PAGO.find(m => m.value === pago.metodo);
      if (metodo?.requiere_referencia && !pago.referencia.trim()) {
        toast.error(`${metodo.label} requiere número de referencia`);
        return false;
      }

      if (metodo?.requiere_referencia && !pago.banco) {
        toast.error(`${metodo.label} requiere seleccionar un banco`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const estadisticas = obtenerEstadisticasEgreso();

      const transaccionEgreso = {
        tipo: 'egreso',
        categoria: categoriaEgreso,
        observaciones: `${descripcion.trim()}${mostrarObservaciones && observaciones.trim() ? ` - ${observaciones.trim()}` : ''}`,
        tasa_cambio_usada: tasaActualTransaccion,
        pagos: pagos.map(p => {
          const metodoInfo = METODOS_PAGO.find(m => m.value === p.metodo);
          return {
            ...p,
            monto: limpiarNumero(p.monto),
            moneda: metodoInfo?.moneda || 'bs'
          };
        }),
        total_bs: estadisticas.montoEgresoBs,
        total_usd: estadisticas.montoEgresoUSD
      };

      await agregarTransaccion(transaccionEgreso);

      // Limpiar formulario
      setDescripcion('');
      setCategoriaEgreso('');
      setObservaciones('');
      setMontoEgreso('');
      setMonedaEgreso('bs');
      setMostrarObservaciones(false);
      setTasaActualTransaccion(tasaCambio);
      setPagos([{
        id: crypto.randomUUID(),
        metodo: 'efectivo_bs',
        monto: '',
        banco: '',
        referencia: ''
      }]);

      toast.success('Egreso registrado correctamente');
      handleClose();
    } catch (error) {
      toast.error(error.message || 'Error al registrar el egreso');
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
     Manejo de Animación de Cierre
  ---------------------------------------------------- */
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else {
      // Iniciar animación de salida
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200); // 200ms coincide con la duración de animate-modal-exit
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    // Esperar a que termine la animación antes de llamar a onClose real
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Interceptar la validación de cierre externa si isOpen cambia a false
  if (!shouldRender && !isOpen) return null;

  const estadisticas = obtenerEstadisticasEgreso();

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isClosing ? 'animate-modal-backdrop-exit' : 'animate-modal-backdrop-enter'}`}>
      <div className={`bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col ring-1 ring-black/5 ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}>

        {/* HEADER COMPACTO & PREMIUM */}
        <div className="relative bg-gradient-to-r from-orange-600 to-red-600 flex-shrink-0 shadow-md">
          <div className="px-5 py-3 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md shadow-sm">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Registrar Egreso</h1>
                <p className="text-orange-100 text-xs opacity-90">Gastos y salidas de caja</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <SelectorTasaCambio
                tasaActual={tasaActualTransaccion}
                onCambioTasa={handleCambioTasa}
              />
              <div className="h-6 w-px bg-white/20 mx-1"></div>
              <div className="flex items-center space-x-1">
                <button onClick={onMinimize} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90 hover:text-white" title="Minimizar">
                  <Minus className="h-4 w-4" />
                </button>
                <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90 hover:text-white" title="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-5" id="egreso-form">

            {/* 1. INFORMACIÓN PRINCIPAL */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>

              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">1</span>
                <span>Detalles del Gasto</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Categoría *</label>
                    <select
                      value={categoriaEgreso}
                      onChange={(e) => setCategoriaEgreso(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white transition-all text-slate-700"
                      required
                    >
                      <option value="">Seleccionar categoría...</option>
                      {CATEGORIAS_EGRESO.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Monto Total *</label>
                    <div className="flex space-x-2">
                      <select
                        value={monedaEgreso}
                        onChange={(e) => setMonedaEgreso(e.target.value)}
                        className="px-2 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50 font-medium text-slate-700"
                      >
                        <option value="usd">USD</option>
                        <option value="bs">Bs</option>
                      </select>

                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs font-bold">
                          {monedaEgreso === 'usd' ? '$' : 'Bs'}
                        </span>
                        <input
                          id="monto-egreso-input"
                          name="montoEgreso"
                          type="text"
                          value={montoEgreso}
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^\d.,]/g, '');
                            setMontoEgreso(valor);
                          }}
                          onBlur={(e) => {
                            const valorFormateado = formatearVenezolano(e.target.value);
                            setMontoEgreso(valorFormateado);
                          }}
                          placeholder="0,00"
                          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white transition-all font-mono font-bold text-slate-700 placeholder-slate-300"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descripción *</label>
                  <input
                    id="descripcion-egreso-input"
                    name="descripcionEgreso"
                    type="text"
                    value={descripcion}
                    onChange={handleDescripcionChange}
                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                    placeholder="Ej: Pago de electricidad, Compra de materiales... (use @ para usuarios)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white transition-all shadow-sm placeholder-slate-400 text-slate-700"
                    required
                    autoComplete="off"
                  />
                  {mostrarSugerencias && (
                    <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-auto">
                      {sugerenciasFiltradas.map((usuario) => (
                        <div
                          key={usuario.id}
                          className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 flex items-center justify-between group"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Evitar que el blur ocurra antes
                            seleccionarUsuarioSugerido(usuario);
                          }}
                        >
                          <span className="font-medium">{usuario.nombre}</span>
                          <span className="text-xs text-gray-400 group-hover:text-orange-400">@{usuario.usuario}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setMostrarObservaciones(!mostrarObservaciones)}
                    className="flex items-center space-x-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    {mostrarObservaciones ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>Observaciones adicionales (opcional)</span>
                  </button>

                  {mostrarObservaciones && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <textarea
                        rows={2}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detalles adicionales..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50 resize-none text-slate-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. FORMAS DE PAGO */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">2</span>
                  <span>Métodos de Pago</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">{pagos.length}</span>
                </h3>
                <button
                  type="button"
                  onClick={agregarPago}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Pago</span>
                </button>
              </div>

              <div className="space-y-3">
                {pagos.map((pago, index) => (
                  <PagoItemCompacto
                    key={pago.id}
                    pago={pago}
                    index={index}
                    onUpdate={actualizarPago}
                    onDelete={eliminarPago}
                    canDelete={pagos.length > 1}
                  />
                ))}
              </div>
            </div>

            {/* 3. RESUMEN Y BALANCE */}
            <div className={`rounded-xl p-4 border transition-all duration-300 ${estadisticas.completado
              ? 'bg-emerald-50/50 border-emerald-100'
              : estadisticas.exceso > 0
                ? 'bg-orange-50/50 border-orange-100'
                : 'bg-slate-50 border-slate-200'
              }`}>

              <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${estadisticas.completado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'
                  }`}>
                  <Calculator className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Resumen Financiero</h3>
                <div className="ml-auto">
                  {estadisticas.completado ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide border border-emerald-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Listo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wide border border-orange-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div> Pendiente
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Card 1: Total Gasto */}
                <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Monto Total</span>
                  <div className="text-base font-bold text-slate-800">
                    {monedaEgreso === 'usd' ? `$${formatearVenezolano(estadisticas.montoEgresoUSD)}` : `${formatearVenezolano(estadisticas.montoEgresoBs)} Bs`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {monedaEgreso === 'usd' ? `${formatearVenezolano(estadisticas.montoEgresoBs)} Bs` : `$${formatearVenezolano(estadisticas.montoEgresoUSD)}`}
                  </div>
                </div>

                {/* Card 2: Total Pagado */}
                <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pagado</span>
                  {(() => {
                    const pagadoBs = pagos.reduce((t, p) => METODOS_PAGO.find(m => m.value === p.metodo)?.moneda === 'bs' ? t + limpiarNumero(p.monto) : t, 0);
                    const pagadoUsd = pagos.reduce((t, p) => METODOS_PAGO.find(m => m.value === p.metodo)?.moneda === 'usd' ? t + limpiarNumero(p.monto) : t, 0);

                    if (pagadoBs === 0 && pagadoUsd === 0) return <div className="text-sm font-medium text-slate-300 italic">Sin pagos</div>;

                    return (
                      <div className="flex flex-col">
                        {pagadoBs > 0 && <span className="text-sm font-bold text-blue-600">{formatearVenezolano(pagadoBs)} Bs</span>}
                        {pagadoUsd > 0 && <span className="text-sm font-bold text-green-600">${formatearVenezolano(pagadoUsd)}</span>}
                      </div>
                    )
                  })()}
                </div>

                {/* Card 3: Estado */}
                <div className={`bg-white rounded-lg p-3 border shadow-sm ${estadisticas.faltante > 0 ? 'border-orange-100' : 'border-emerald-100'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {estadisticas.faltante > 0 ? 'Faltante' : estadisticas.exceso > 0 ? 'Exceso' : 'Estado'}
                  </span>
                  {estadisticas.faltante > 0 ? (
                    <div className="text-base font-bold text-orange-600">{formatearVenezolano(estadisticas.faltante)} Bs</div>
                  ) : estadisticas.exceso > 0 ? (
                    <div className="text-base font-bold text-orange-600">{formatearVenezolano(estadisticas.exceso)} Bs</div>
                  ) : (
                    <div className="text-base font-bold text-emerald-600">Completo</div>
                  )}
                </div>
              </div>

              {/* Alert Status */}
              {(estadisticas.faltante > 0 || estadisticas.exceso > 0) && (
                <div className="mt-3 bg-white/60 rounded-lg px-3 py-2 text-xs font-medium text-orange-700 border border-orange-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                  {estadisticas.faltante > 0 ? `Faltan ${formatearVenezolano(estadisticas.faltante)} Bs para completar` : `Hay un exceso de ${formatearVenezolano(estadisticas.exceso)} Bs`}
                </div>
              )}

            </div>
          </form>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-600 to-red-600 border-t border-orange-500/30 flex-shrink-0 z-10 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-xl transition-all text-sm shadow-sm backdrop-blur-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="egreso-form"
            disabled={loading || !estadisticas.transaccionValida}
            className="flex-1 px-4 py-2.5 bg-white text-orange-700 hover:bg-orange-50 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none border border-white/50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4" />
                <span>Registrar Egreso</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EgresoModal;