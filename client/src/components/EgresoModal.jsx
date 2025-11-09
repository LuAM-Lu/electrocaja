// components/EgresoModal.jsx - HEADER MODERNIZADO
import React, { useState } from 'react';
import { X, Minus, Calculator, Trash2, DollarSign, Smartphone, CreditCard, Coins, ChevronDown, ChevronUp, Plus, Settings } from 'lucide-react';
import { useCajaStore } from '../store/cajaStore';
import toast from '../utils/toast.jsx';

const METODOS_PAGO = [
 { value: 'efectivo_bs', label: 'Efectivo Bs', requiere_referencia: false, moneda: 'bs' },
 { value: 'efectivo_usd', label: 'Efectivo USD', requiere_referencia: false, moneda: 'usd' },
 { value: 'pago_movil', label: 'Pago Móvil', requiere_referencia: true, moneda: 'bs' },
 { value: 'transferencia', label: 'Transferencia', requiere_referencia: true, moneda: 'bs' },
 { value: 'binance', label: 'Binance (USDT)', requiere_referencia: true, moneda: 'usd' }
];

const BANCOS = [
 'Banesco', 'Mercantil', 'Venezuela', 'Bicentenario', 'Provincial',
 'Exterior', 'Caroni', 'Sofitasa', 'Plaza', 'Activo', 'Otro'
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
   <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
     <div className="flex items-center space-x-3">
       <div className="bg-red-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
         <span className="text-xs font-bold text-red-700">#{index + 1}</span>
       </div>
       
       <div className="flex-1">
         <select
           value={pago.metodo}
           onChange={(e) => onUpdate(pago.id, 'metodo', e.target.value)}
           className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all hover:border-red-300"
         >
           {METODOS_PAGO.map(metodo => (
             <option key={metodo.value} value={metodo.value}>
               {metodo.label}
             </option>
           ))}
         </select>
       </div>

       <div className="flex-1">
         <div className="relative">
           <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">
             {metodo?.moneda === 'usd' ? '$' : 'Bs'}
           </span>
           <input
             id={`egreso-monto-${pago.id}`}
             name={`egresoMonto${pago.id}`}
             type="text"
             value={pago.monto}
             onChange={(e) => handleMontoChange(e.target.value)}
             onBlur={(e) => handleMontoBlur(e.target.value)}
             placeholder="0,00"
             className="w-full pl-8 pr-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all hover:border-red-300 font-mono"
           />
         </div>
       </div>

       {canDelete && (
         <button
           type="button"
           onClick={() => onDelete(pago.id)}
           className="transition-all p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 group"
         >
           <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
         </button>
       )}
     </div>

     {metodo?.requiere_referencia && (
       <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-red-200">
         <div>
           <label className="block text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Banco</label>
           <select
             value={pago.banco}
             onChange={(e) => onUpdate(pago.id, 'banco', e.target.value)}
             className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
           >
             <option value="">Seleccionar banco...</option>
             {BANCOS.map(banco => (
               <option key={banco} value={banco}>{banco}</option>
             ))}
           </select>
         </div>

         <div>
           <label className="block text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Referencia</label>
           <input
             id={`egreso-referencia-${pago.id}`}
             name={`egresoReferencia${pago.id}`}
             type="text"
             value={pago.referencia}
             onChange={(e) => onUpdate(pago.id, 'referencia', e.target.value)}
             placeholder="Nº de referencia"
             className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all font-mono"
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
const EgresoModal = ({ isOpen, onClose, emitirEvento }) => {
 const { agregarTransaccion, tasaCambio } = useCajaStore();
 
 const [descripcion, setDescripcion] = useState('');
 const [categoriaEgreso, setCategoriaEgreso] = useState('');
 const [mostrarObservaciones, setMostrarObservaciones] = useState(false);
 const [observaciones, setObservaciones] = useState('');
 const [montoEgreso, setMontoEgreso] = useState('');
 const [monedaEgreso, setMonedaEgreso] = useState('usd');
 const [tasaActualTransaccion, setTasaActualTransaccion] = useState(tasaCambio);
 const [pagos, setPagos] = useState([{
   id: 1,
   metodo: 'efectivo_bs',
   monto: '',
   banco: '',
   referencia: ''
 }]);
 const [loading, setLoading] = useState(false);

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

 const actualizarPago = (id, campo, valor) => {
   setPagos(pagos.map(p => p.id === id ? { ...p, [campo]: valor } : p));
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
     setMonedaEgreso('usd');
     setMostrarObservaciones(false);
     setTasaActualTransaccion(tasaCambio);
     setPagos([{
       id: crypto.randomUUID(),
       metodo: 'efectivo_bs',
       monto: '',
       banco: '',
       referencia: ''
     }], emitirEvento);

     toast.success('Egreso registrado correctamente');
     onClose();
   } catch (error) {
     toast.error(error.message || 'Error al registrar el egreso');
   } finally {
     setLoading(false);
   }
 };

 if (!isOpen) return null;

 const estadisticas = obtenerEstadisticasEgreso();

 return (
   <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
       
       {/*  HEADER MODERNIZADO CON PATRÓN */}
       <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 overflow-hidden">
         {/* Patrón de fondo sutil */}
         <div className="absolute inset-0 opacity-10">
           <div className="absolute inset-0" style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
           }}></div>
         </div>

         {/* Efecto de brillo animado */}
         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer"></div>

         <div className="relative px-8 py-6 text-white">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-4">
               <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl shadow-lg">
                 <Minus className="h-8 w-8" />
               </div>
               <div>
                 <h1 className="text-2xl font-bold">Nuevo Egreso</h1>
                 <div className="text-red-100 text-sm flex items-center space-x-3 mt-1">
                   <span>Registra un nuevo gasto o egreso del negocio</span>
                   <div className="flex items-center space-x-1 bg-red-500/20 px-2 py-1 rounded-full text-xs">
                     <DollarSign className="h-3 w-3" />
                     <span>Control de gastos</span>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="flex items-center space-x-4">
               <SelectorTasaCambio 
                 tasaActual={tasaActualTransaccion}
                 onCambioTasa={handleCambioTasa}
               />
               <button
                 onClick={onClose}
                 className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all duration-200 backdrop-blur-sm shadow-lg group"
               >
                 <X className="h-6 w-6 group-hover:scale-110 transition-transform" />
               </button>
             </div>
           </div>
         </div>
       </div>

       {/* Contenido */}
       <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
         <form onSubmit={handleSubmit} className="space-y-8">
           
           {/* 1. Información General - MEJORADA */}
           <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border-2 border-red-200 shadow-sm">
             <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
               <div className="bg-red-200 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-red-700 mr-3">1</div>
               Información del Egreso
               <div className="ml-auto text-xs bg-red-200 text-red-800 px-3 py-1 rounded-full font-medium">
                 Obligatorio
               </div>
             </h3>
             
             <div className="space-y-4">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-semibold text-red-800 uppercase tracking-wide mb-2">
                     Categoría del Egreso *
                   </label>
                   <select
                     value={categoriaEgreso}
                     onChange={(e) => setCategoriaEgreso(e.target.value)}
                     className="w-full px-4 py-3 text-sm border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all hover:border-red-400 shadow-sm"
                     required
                   >
                     <option value="">Seleccionar categoría...</option>
                     {CATEGORIAS_EGRESO.map(categoria => (
                       <option key={categoria} value={categoria}>{categoria}</option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-red-800 uppercase tracking-wide mb-2">
                     Monto Total *
                   </label>
                   <div className="flex space-x-3">
                     <select
                       value={monedaEgreso}
                       onChange={(e) => setMonedaEgreso(e.target.value)}
                       className="px-3 py-3 text-sm border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all shadow-sm"
                     >
                       <option value="usd">USD</option>
                       <option value="bs">Bs</option>
                     </select>
                     
                     <div className="relative flex-1">
                       <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">
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
                         className="w-full pl-10 pr-4 py-3 text-sm border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all hover:border-red-400 shadow-sm font-mono"
                         required
                       />
                     </div>
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-semibold text-red-800 uppercase tracking-wide mb-2">
                   Descripción del Egreso *
                 </label>
                 <input
                   id="descripcion-egreso-input"
                   name="descripcionEgreso"
                   type="text"
                   value={descripcion}
                   onChange={(e) => setDescripcion(e.target.value)}
                   placeholder="Ej: Pago de electricidad, Compra de materiales, Mantenimiento..."
                   className="w-full px-4 py-3 text-sm border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all hover:border-red-400 shadow-sm"
                   required
                 />
               </div>

               <div>
                 <button
                   type="button"
                   onClick={() => setMostrarObservaciones(!mostrarObservaciones)}
                   className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700 transition-colors font-medium"
                 >
                   {mostrarObservaciones ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                   <span>Agregar observaciones adicionales</span>
                 </button>
                 
                 {mostrarObservaciones && (
                   <div className="mt-3">
                     <input
                       id="observaciones-egreso-input"
                       name="observacionesEgreso"
                       type="text"
                       value={observaciones}
                       onChange={(e) => setObservaciones(e.target.value)}
                       placeholder="Detalles adicionales del egreso..."
                       className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all shadow-sm"
                     />
                   </div>
                 )}
               </div>
             </div>
           </div>

           {/* 2. Formas de Pago - MEJORADAS */}
           <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-gray-900 flex items-center">
                 <div className="bg-red-100 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-red-600 mr-3">2</div>
                 Formas de Pago Utilizadas
                 <div className="ml-3 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                   {pagos.length} método{pagos.length !== 1 ? 's' : ''}
                 </div>
               </h3>
               <button
                 type="button"
                 onClick={agregarPago}
                 className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
               >
                 <Plus className="h-4 w-4" />
                 <span>Agregar Método</span>
               </button>
             </div>
             
             <div className="space-y-4">
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

          {/* 3. Resumen del Egreso - MODERNIZADO */}
          <div className="bg-gradient-to-br from-red-50 via-red-50 to-pink-50 rounded-2xl p-6 border-2 border-red-200 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-red-200 rounded-full w-10 h-10 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-red-700" />
              </div>
              <h3 className="text-lg font-bold text-red-900">Resumen del Egreso</h3>
              <div className="ml-auto">
                {estadisticas.completado ? (
                  <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span> Completo</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span>Pendiente</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 border-2 border-red-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <DollarSign className="h-5 w-5 text-red-600" />
                  <div className="text-xs text-red-600 font-semibold uppercase tracking-wide">Monto Total</div>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {monedaEgreso === 'usd' 
                    ? `$${formatearVenezolano(estadisticas.montoEgresoUSD)}` 
                    : `${formatearVenezolano(estadisticas.montoEgresoBs)} Bs`
                  }
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {monedaEgreso === 'usd' 
                    ? `${formatearVenezolano(estadisticas.montoEgresoBs)} Bs`
                    : `$${formatearVenezolano(estadisticas.montoEgresoUSD)}`
                  }
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Pagado</div>
                </div>
                {(() => {
                  const pagadoBs = pagos.reduce((total, pago) => {
                    const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);
                    if (metodoInfo?.moneda === 'bs') {
                      return total + limpiarNumero(pago.monto);
                    }
                    return total;
                  }, 0);
                  
                  const pagadoUsd = pagos.reduce((total, pago) => {
                    const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);
                    if (metodoInfo?.moneda === 'usd') {
                      return total + limpiarNumero(pago.monto);
                    }
                    return total;
                  }, 0);

                  return (
                    <div className="space-y-1">
                      {pagadoBs > 0 && (
                        <div className="text-lg font-bold text-blue-700">
                          {formatearVenezolano(pagadoBs)} Bs
                        </div>
                      )}
                      {pagadoUsd > 0 && (
                        <div className="text-lg font-bold text-blue-700">
                          ${formatearVenezolano(pagadoUsd)}
                        </div>
                      )}
                      {pagadoBs === 0 && pagadoUsd === 0 && (
                        <div className="text-lg text-gray-400 font-medium">Sin pagos</div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <Coins className="h-5 w-5 text-gray-600" />
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                    {estadisticas.faltante > 0 ? 'Faltante' : estadisticas.exceso > 0 ? 'Exceso' : 'Estado'}
                  </div>
                </div>
                {estadisticas.faltante > 0 ? (
                  <>
                   <div className="text-lg font-bold text-orange-700">
                     {formatearVenezolano(estadisticas.faltante)} Bs
                   </div>
                   <div className="text-sm text-orange-600">
                     ${formatearVenezolano(estadisticas.faltanteUSD)}
                   </div>
                 </>
               ) : estadisticas.exceso > 0 ? (
                 <>
                   <div className="text-lg font-bold text-orange-700">
                     {formatearVenezolano(estadisticas.exceso)} Bs
                   </div>
                   <div className="text-sm text-orange-600">
                     ${formatearVenezolano(estadisticas.excesoUSD)}
                   </div>
                 </>
               ) : (
                 <>
                   <div className="text-lg font-bold text-green-700 flex items-center space-x-2">
                     <span> Completo</span>
                   </div>
                   <div className="text-sm text-green-600">
                     Listo para procesar
                   </div>
                 </>
               )}
             </div>
           </div>

           <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border-2 border-red-200">
             <div className="flex items-center space-x-3">
               {estadisticas.faltante > 0 ? (
                 <>
                   <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                   <span className="text-sm font-semibold text-orange-600">
                     Faltan {formatearVenezolano(estadisticas.faltante)} Bs para completar
                   </span>
                 </>
               ) : estadisticas.exceso > 0 ? (
                 <>
                   <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                   <span className="text-sm font-semibold text-orange-600">
                     Exceso: {formatearVenezolano(estadisticas.exceso)} Bs
                   </span>
                 </>
               ) : (
                 <>
                   <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                   <span className="text-sm font-semibold text-green-600">
                      Egreso completo y listo
                   </span>
                 </>
               )}
             </div>

             <div className="flex items-center space-x-2 text-sm text-red-600 font-medium bg-red-50 px-3 py-1 rounded-lg">
               <DollarSign className="h-4 w-4" />
               <span>Tasa: {formatearTasa(tasaActualTransaccion)} Bs/USD</span>
             </div>
           </div>
          </div>

          {/* Botones de Acción - MODERNIZADOS */}
          <div className="flex space-x-4 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center space-x-2"
            >
              <X className="h-5 w-5" />
              <span>Cancelar</span>
            </button>
            <button
              type="submit"
              disabled={loading || !estadisticas.transaccionValida}
              className="flex-1 px-8 py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <Minus className="h-5 w-5" />
                  <span>Registrar Egreso</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* CSS para animaciones */}
    <style jsx>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%) skewX(-12deg); }
        100% { transform: translateX(200%) skewX(-12deg); }
      }
      .animate-shimmer {
        animation: shimmer 3s ease-in-out infinite;
      }
    `}</style>
  </div>
);
};

export default EgresoModal;