// components/venta/PagosPanel.jsx - SISTEMA DE PAGOS MODULAR CON HYBRID CHIPS 
import React from 'react';
import { 
 X, Plus, CreditCard, DollarSign, RefreshCw,
 AlertTriangle, CheckCircle, Percent, MousePointerClick, Trash2, HandCoins, BanknoteArrowUp
} from 'lucide-react';
import toast from '../../utils/toast.jsx';

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
   const decimal = partes[1] || '00';
   const decimalLimitado = decimal.substring(0, 2).padEnd(2, '0');
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
 { value: 'efectivo_bs', label: 'Efectivo Bs', moneda: 'bs', requiere_referencia: false },
 { value: 'efectivo_usd', label: 'Efectivo USD', moneda: 'usd', requiere_referencia: false },
 { value: 'pago_movil', label: 'Pago Móvil', moneda: 'bs', requiere_referencia: true },
 { value: 'transferencia', label: 'Transferencia', moneda: 'bs', requiere_referencia: true },
 { value: 'zelle', label: 'Zelle', moneda: 'usd', requiere_referencia: true },
 { value: 'binance', label: 'Binance', moneda: 'usd', requiere_referencia: true },
 { value: 'tarjeta', label: 'Tarjeta', moneda: 'bs', requiere_referencia: true }
];

const BANCOS_VENEZUELA = [
  'Venezuela - 0102',
  'Venezolano Crédito - 0104',
  'Mercantil - 0105',
  'Provincial - 0108',
  'Bancaribe - 0114',
  'Exterior - 0115',
  'Caroní - 0128',
  'Banesco - 0134',
  'Sofitasa - 0137',
  'Plaza - 0138',
  'Bangente - 0146',
  'Fondo Común - 0151',
  '100% Banco - 0156',
  'DelSur - 0157',
  'Tesoro - 0163',
  'Agrícola - 0166',
  'Bancrecer - 0168',
  'R4 - 0169',
  'Activo - 0171',
  'Bancamiga - 0172',
  'Banplus - 0174',
  'BANFANB - 0177',
  'BNC - 0191',
  'Crédito Popular - 0601'
];


// Obtener métodos disponibles (sin duplicados)
const obtenerMetodosDisponibles = (pagosActuales, idActual = null) => {
 const metodosUsados = pagosActuales
   .filter(pago => pago.id !== idActual)
   .map(pago => pago.metodo);
 
 return METODOS_PAGO.filter(metodo => !metodosUsados.includes(metodo.value));
};

// ===================================
//  COMPONENTE HYBRID CHIP
// ===================================
const PagoItemHybrid = ({ 
 pago, index, onUpdate, onDelete, canDelete, tipo = "pago"
}) => {
 const [isEditing, setIsEditing] = React.useState(false);
 const metodo = METODOS_PAGO.find(m => m.value === pago.metodo);
 const esVuelto = tipo === "vuelto";
 const monto = limpiarNumero(pago.monto);
 
 //  Obtener icono y colores por método
 const getMetodoConfig = (metodoValue) => {
   const configs = {
     efectivo_bs: { icon: '', color: 'emerald', label: 'Efectivo Bs' },
     efectivo_usd: { icon: '', color: 'green', label: 'Efectivo USD' },
     pago_movil: { icon: '', color: 'blue', label: 'Pago Móvil' },
     transferencia: { icon: '', color: 'indigo', label: 'Transferencia' },
     zelle: { icon: '', color: 'purple', label: 'Zelle' },
     binance: { icon: '', color: 'yellow', label: 'Binance' },
     tarjeta: { icon: '', color: 'gray', label: 'Tarjeta' }
   };
   return configs[metodoValue] || configs.efectivo_bs;
 };
 
 const config = getMetodoConfig(pago.metodo);
 
 //  Colores dinámicos
 const getColorClasses = (color, isVuelto) => {
   const baseColors = {
     emerald: isVuelto ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800',
     blue: isVuelto ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-blue-50 border-blue-200 text-blue-800',
     green: isVuelto ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-green-50 border-green-200 text-green-800',
     indigo: isVuelto ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800',
     purple: 'bg-purple-50 border-purple-200 text-purple-800',
     yellow: isVuelto ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800',
     gray: isVuelto ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-gray-50 border-gray-200 text-gray-800'
   };
   return baseColors[color] || baseColors.emerald;
 };
 
 //  Estado del pago
 const getEstadoPago = () => {
   if (!pago.monto || monto === 0) return { icon: '', text: 'Pendiente', color: 'text-orange-600' };
   if (metodo?.requiere_referencia && (!pago.banco || !pago.referencia)) return { icon: '', text: 'Incompleto', color: 'text-red-600' };
   return { icon: '', text: 'Completo', color: 'text-green-600' };
 };
 
 const estado = getEstadoPago();
 const colorClasses = getColorClasses(config.color, esVuelto);
 
 const handleMontoChange = (valor) => {
   // Permitir números, comas y puntos
   let valorLimpio = valor.replace(/[^\d.,]/g, '');
   
   // Contar separadores
   const comas = (valorLimpio.match(/,/g) || []).length;
   const puntos = (valorLimpio.match(/\./g) || []).length;
   
   // Solo permitir un separador decimal
   if (comas > 1 || puntos > 1) {
     if (comas > 1) {
       const ultimaComa = valorLimpio.lastIndexOf(',');
       valorLimpio = valorLimpio.substring(0, ultimaComa).replace(/,/g, '') + valorLimpio.substring(ultimaComa);
     }
     if (puntos > 1) {
       const ultimoPunto = valorLimpio.lastIndexOf('.');
       valorLimpio = valorLimpio.substring(0, ultimoPunto).replace(/\./g, '') + valorLimpio.substring(ultimoPunto);
     }
   }
   
   // Si hay tanto coma como punto, mantener solo el último introducido
   if (comas > 0 && puntos > 0) {
     const ultimaComa = valorLimpio.lastIndexOf(',');
     const ultimoPunto = valorLimpio.lastIndexOf('.');
     
     if (ultimaComa > ultimoPunto) {
       valorLimpio = valorLimpio.replace(/\./g, '');
     } else {
       valorLimpio = valorLimpio.replace(/,/g, '');
     }
   }
   
   onUpdate(pago.id, 'monto', valorLimpio);
 };
 
 if (isEditing) {
   return (
     <div className={`border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl p-4 transition-all duration-200`}>
       <div className="space-y-3">
         {/* Selector de método */}
         <div>
           <label className="block text-xs font-medium text-gray-600 mb-1">Método de Pago</label>
           <select
             value={pago.metodo}
             onChange={(e) => onUpdate(pago.id, 'metodo', e.target.value)}
             className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
           >
             {obtenerMetodosDisponibles([], pago.id).map(metodo => (
               <option key={metodo.value} value={metodo.value}>
                 {metodo.label}
               </option>
             ))}
           </select>
         </div>
         
         {/* Input de monto */}
         <div>
           <label className="block text-xs font-medium text-gray-600 mb-1">
             Monto ({metodo?.moneda === 'usd' ? 'USD' : 'Bs'})
           </label>
           <input
             type="text"
             value={pago.monto}
             onChange={(e) => handleMontoChange(e.target.value)}
             placeholder={metodo?.moneda === 'usd' ? '0.00' : '0,00'}
             className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
           />
         </div>
         
         {/* Campos adicionales si requiere referencia */}
         {metodo?.requiere_referencia && (
           <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
               <select
                 value={pago.banco || ''}
                 onChange={(e) => onUpdate(pago.id, 'banco', e.target.value)}
                 className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
               >
                 <option value="">Seleccionar...</option>
                 {BANCOS_VENEZUELA.map(banco => (
                   <option key={banco} value={banco}>{banco}</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
               <input
                 type="text"
                 value={pago.referencia || ''}
                 onChange={(e) => onUpdate(pago.id, 'referencia', e.target.value)}
                 placeholder="Nº referencia"
                 className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
               />
             </div>
           </div>
         )}
         
         {/* Botones */}
         <div className="flex justify-end space-x-2 pt-2">
           <button
             onClick={() => setIsEditing(false)}
             className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
           >
             Cancelar
           </button>
           <button
             onClick={() => setIsEditing(false)}
             className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
           >
             Guardar
           </button>
         </div>
       </div>
     </div>
   );
 }
 
 return (
   <div 
     className={`${colorClasses} border-2 rounded-xl p-3 transition-all duration-200 hover:shadow-md cursor-pointer group relative min-w-[150px] max-w-[160px] flex-shrink-0`}
     onClick={() => setIsEditing(true)}
   >
     {/* Header compacto con icono y método */}
     <div className="flex items-center justify-between mb-2">
       <div className="flex items-center space-x-1">
         <span className="text-sm">{config.icon}</span>
         <span className="font-medium text-xs truncate">{config.label}</span>
       </div>
       
       {/* Botón eliminar más pequeño */}
       {canDelete && (
         <button
           onClick={(e) => {
             e.stopPropagation();
             onDelete(pago.id);
           }}
           className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5 hover:bg-red-100 rounded transition-all"
           title="Eliminar"
         >
           <X className="h-3 w-3" />
         </button>
       )}
     </div>
     
     {/* Monto principal centrado */}
     <div className="text-center mb-2">
       <div className="text-sm font-bold">
         {monto > 0 ? (
           <>
             {metodo?.moneda === 'usd' ? '$' : 'Bs'} {monto >= 1000 ? (monto/1000).toFixed(1) + 'k' : formatearVenezolano(monto)}
           </>
         ) : (
           <span className="text-gray-400 text-xs">Sin monto</span>
         )}
       </div>
     </div>
     
     {/* Estado y detalles compactos */}
     <div className="flex items-center justify-center text-xs">
       <div className="flex items-center space-x-1">
         <span>{estado.icon}</span>
         <span className={`font-medium ${estado.color} truncate`}>{estado.text}</span>
       </div>
     </div>
     
     {/* Detalles bancarios (solo si hay espacio) */}
     {metodo?.requiere_referencia && pago.banco && (
       <div className="text-center mt-1">
         <div className="text-xs text-gray-600 truncate">{pago.banco}</div>
         {pago.referencia && (
           <div className="text-xs text-gray-500 font-mono">•••{pago.referencia.slice(-4)}</div>
         )}
       </div>
     )}
     
     {/* Indicador de hover más sutil */}
     <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-30 transition-opacity rounded-b-xl"></div>
   </div>
 );
};

// ===================================
//  COMPONENTE PRINCIPAL PAGOS PANEL
// ===================================
const PagosPanel = ({ 
 pagos, 
 vueltos, 
 onPagosChange, 
 totalVenta, 
 tasaCambio,
 title = "Métodos de Pago",
 descuento = 0,
 onDescuentoChange = () => {},
 onDescuentoLimpiar = () => {},
 onValidationChange = () => {}
}) => {
 const [totalVentaClicked, setTotalVentaClicked] = React.useState(false);
 const [descuentoClicked, setDescuentoClicked] = React.useState(false);
 
 // ===================================
 //  CALCULAR TOTALES
 // ===================================
 const calcularTotalPagado = () => {
   return pagos.reduce((total, pago) => {
     const monto = limpiarNumero(pago.monto);
     const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);
     
     if (metodoInfo?.moneda === 'bs') {
       return total + monto;
     } else {
       return total + (monto * tasaCambio);
     }
   }, 0);
 };

 const calcularTotalVuelto = () => {
   return vueltos.reduce((total, vuelto) => {
     const monto = limpiarNumero(vuelto.monto);
     const metodoInfo = METODOS_PAGO.find(m => m.value === vuelto.metodo);
     
     if (metodoInfo?.moneda === 'bs') {
       return total + monto;
     } else {
       return total + (monto * tasaCambio);
     }
   }, 0);
 };

 const totalPagado = calcularTotalPagado();
 const totalVuelto = calcularTotalVuelto();
 const totalConDescuento = totalVenta - descuento;
 const diferencia = totalPagado - totalConDescuento;
 const faltante = Math.max(0, -diferencia);
 const exceso = Math.max(0, diferencia);
 const excesoPendiente = exceso - totalVuelto;

 // Estado de la transacción
 const transaccionCompleta = faltante <= 0.01;
 const necesitaVuelto = excesoPendiente > 0.01;

 // Notificar cambios de validación al componente padre
 React.useEffect(() => {
   onValidationChange(transaccionCompleta, excesoPendiente);
 }, [transaccionCompleta, excesoPendiente, onValidationChange]);

 // ===================================
 //  MANEJADORES DE EVENTOS
 // ===================================
 const agregarPago = () => {
   const metodosDisponibles = obtenerMetodosDisponibles(pagos);
   if (metodosDisponibles.length === 0) {
     toast.warning('Todos los métodos de pago ya están en uso');
     return;
   }

   const nuevosPagos = [...pagos, {
     id: crypto.randomUUID(),
     metodo: metodosDisponibles[0].value,
     monto: '',
     banco: '',
     referencia: ''
   }];
   
   onPagosChange(nuevosPagos, vueltos);
 };

 const agregarVuelto = () => {
   const metodosDisponibles = obtenerMetodosDisponibles(vueltos);
   if (metodosDisponibles.length === 0) {
     toast.warning('Todos los métodos de vuelto ya están en uso');
     return;
   }

   const nuevosVueltos = [...vueltos, {
     id: crypto.randomUUID(),
     metodo: metodosDisponibles[0].value,
     monto: '',
     banco: '',
     referencia: ''
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
   }
 };

 const eliminarVuelto = (id) => {
   const nuevosVueltos = vueltos.filter(v => v.id !== id);
   onPagosChange(pagos, nuevosVueltos);
 };

 const handleTotalVentaClick = () => {
   setTotalVentaClicked(true);
   
   const primerPagoVacio = pagos.find(p => !p.monto || parseFloat(p.monto) === 0);
   
   if (primerPagoVacio) {
     const metodoInfo = METODOS_PAGO.find(m => m.value === primerPagoVacio.metodo);
     let montoAEnviar;
     
     if (metodoInfo?.moneda === 'bs') {
       montoAEnviar = totalConDescuento.toFixed(2);
     } else {
       montoAEnviar = (totalConDescuento / tasaCambio).toFixed(2);
     }
     
     actualizarPago(primerPagoVacio.id, 'monto', montoAEnviar);
     toast.success(`Monto enviado al ${metodoInfo.label}`);
   } else {
     toast.warning('Todos los métodos de pago ya tienen montos asignados');
   }
 };

 const handleDescuentoClick = () => {
   setDescuentoClicked(true);
   onDescuentoChange();
 };

 const handleLimpiarDescuento = (e) => {
   e.stopPropagation();

   if (onDescuentoLimpiar) {
     onDescuentoLimpiar();
     toast.success('Descuento eliminado');
   } else {
     toast.error('Función onDescuentoLimpiar no disponible');
   }
 };

 return (
   <div className="space-y-4">
     
     {/* ===================================
          RESUMEN VISUAL DE TOTALES
         =================================== */}
     <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-6">
       <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-bold text-blue-900 flex items-center">
           <DollarSign className="h-5 w-5 mr-2" />
           Resumen de Pagos
         </h3>
         
         {/* Indicador de estado inline */}
         {transaccionCompleta ? (
           <div className="flex items-center space-x-2 text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
             <CheckCircle className="h-4 w-4" />
             <span className="text-sm font-medium">Pago Completo</span>
           </div>
         ) : (
           <div className="flex items-center space-x-2 text-red-700 bg-red-100 px-3 py-1.5 rounded-full">
             <AlertTriangle className="h-4 w-4" />
             <span className="text-sm font-medium">Faltan {formatearVenezolano(faltante)} Bs</span>
           </div>
         )}
       </div>
       
       <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
         {/* TOTAL VENTA */}
         <div 
           className={`bg-white rounded-lg p-3 border-2 border-blue-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 ${!totalVentaClicked ? 'animate-pulse' : ''} hover:animate-none relative group text-center`}
           onClick={handleTotalVentaClick}
         >
           <div className={`absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg ${!totalVentaClicked ? 'animate-bounce' : ''}`}>
             <MousePointerClick className="h-3 w-3" />
           </div>
           
           <div className="text-xs text-blue-600 mb-1 uppercase tracking-wide font-medium">Total Venta</div>
           <div className="font-bold text-base text-blue-900">{formatearVenezolano(totalVenta)} Bs</div>
           <div className="text-xs text-blue-500">${(totalVenta / tasaCambio).toFixed(2)}</div>
           
           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
             Click para enviar al método de pago
             <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
           </div>
         </div>
         
         {/* DESCUENTO - NUEVA POSICIÓN 2 */}
         <div 
           className={`bg-white rounded-lg p-3 border-2 border-purple-200 shadow-sm cursor-pointer hover:shadow-md hover:border-purple-300 transition-all duration-200 ${!descuentoClicked ? 'animate-pulse' : ''} hover:animate-none relative group text-center`}
           onClick={handleDescuentoClick}
         >
           {descuento > 0 && (
             <div 
               className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-bounce hover:animate-none cursor-pointer z-10"
               onClick={handleLimpiarDescuento}
               title="Eliminar descuento"
             >
               <Trash2 className="h-3 w-3" />
             </div>
           )}
           
           <div className={`absolute -bottom-2 -right-2 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg ${!descuentoClicked ? 'animate-bounce' : ''}`}>
             <MousePointerClick className="h-3 w-3" />
           </div>
           
           <div className="text-xs text-purple-600 mb-1 uppercase tracking-wide flex items-center justify-center font-medium">
             <Percent className="h-3 w-3 mr-1" />
             Descuento
           </div>
           <div className="font-bold text-base text-purple-700">
             {descuento > 0 ? `-${formatearVenezolano(descuento)} Bs` : '0 Bs'}
           </div>
           <div className="text-xs text-purple-500">
             ${(descuento / tasaCambio).toFixed(2)}
           </div>
           
           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
             {descuento > 0 ? 'Click para modificar o eliminar descuento' : 'Click para aplicar descuento'}
             <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
           </div>
         </div>
         
         
         
         {/* FALTANTE */}
          <div className={`rounded-lg p-3 border-2 shadow-sm text-center ${faltante > 0 ? 'border-red-400 bg-red-100' : 'border-gray-200 bg-white'}`}>
            <div className={`text-xs mb-1 uppercase tracking-wide flex items-center justify-center ${faltante > 0 ? 'text-red-700' : 'text-gray-600'}`}>
              {faltante > 0 ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
              FALTA POR PAGAR
            </div>
            <div className={`font-bold text-base ${faltante > 0 ? 'text-red-800' : 'text-gray-500'}`}>
              {formatearVenezolano(faltante)} Bs
            </div>
            <div className={`text-xs ${faltante > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              ${(faltante / tasaCambio).toFixed(2)}
            </div>
          </div>
         
         {/* EXCEDENTE */}
          <div className={`rounded-lg p-3 border-2 shadow-sm text-center ${excesoPendiente > 0 ? 'border-amber-400 bg-amber-100' : 'border-gray-200 bg-white'}`}>
            <div className={`text-xs mb-1 uppercase tracking-wide flex items-center justify-center ${excesoPendiente > 0 ? 'text-amber-700' : 'text-gray-600'}`}>
              {excesoPendiente > 0 ? <HandCoins className="h-3 w-3 mr-1" /> : <HandCoins className="h-3 w-3 mr-1" />}
              EXCEDENTE
            </div>
            <div className={`font-bold text-base ${excesoPendiente > 0 ? 'text-amber-800' : 'text-gray-500'}`}>
              {formatearVenezolano(excesoPendiente)} Bs
            </div>
            <div className={`text-xs ${excesoPendiente > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              ${(excesoPendiente / tasaCambio).toFixed(2)}
            </div>
          </div>

         {/* TOTAL PAGADO - NUEVA POSICIÓN 3 */}
          <div className={`rounded-lg p-3 border-2 shadow-sm text-center ${totalPagado > 0 ? 'border-emerald-400 bg-emerald-100' : 'border-gray-200 bg-white'}`}>
            <div className={`text-xs mb-1 uppercase tracking-wide flex items-center justify-center ${totalPagado > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>
              <BanknoteArrowUp className="h-3 w-3 mr-1" />
              MONTO PAGADO
            </div>
            <div className={`font-bold text-base ${totalPagado > 0 ? 'text-emerald-800' : 'text-gray-500'}`}>
              {formatearVenezolano(totalPagado)} Bs
            </div>
            <div className={`text-xs ${totalPagado > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
              ${(totalPagado / tasaCambio).toFixed(2)}
            </div>
          </div>
       </div>
     </div>

     {/* ===================================
          MÉTODOS DE PAGO - HYBRID CHIPS
         =================================== */}
     <div className="space-y-2">
       <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 backdrop-blur-sm border border-gray-200/50 rounded-xl p-3 shadow-lg flex items-center justify-between">
         {/* Lado izquierdo: Icono + Título */}
         <div className="flex items-center space-x-3">
           <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-lg shadow-md">
             <CreditCard className="h-4 w-4 text-white" />
           </div>
           <span className="text-gray-800 font-semibold text-base">
             {title}
           </span>
         </div>

         {/* Lado derecho: Botón compacto */}
         <button
           onClick={agregarPago}
           disabled={obtenerMetodosDisponibles(pagos).length === 0}
           className="group bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
         >
           <div className="bg-white/20 p-1 rounded group-hover:bg-white/30 transition-all duration-200">
             <Plus className="h-3 w-3" />
           </div>
           <span className="text-sm">Agregar Método</span>
         </button>
       </div>
       
       <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 mt-1">
         {pagos.map((pago, index) => (
           <PagoItemHybrid
             key={pago.id}
             pago={pago}
             index={index}
             onUpdate={actualizarPago}
             onDelete={eliminarPago}
             canDelete={pagos.length > 1}
             tipo="pago"
           />
         ))}
       </div>
     </div>

     {/* ===================================
          VUELTOS - HYBRID CHIPS (solo si hay exceso)
         =================================== */}
     {necesitaVuelto && (
       <div className="space-y-2">
         <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 backdrop-blur-sm border border-gray-200/50 rounded-xl p-3 shadow-lg flex items-center justify-between">
           {/* Lado izquierdo: Icono + Texto */}
           <div className="flex items-center space-x-3">
             <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg shadow-md">
               <RefreshCw className="h-4 w-4 text-white" />
             </div>
             <span className="text-gray-800 font-semibold text-base">
               Vuelto a entregar
             </span>
           </div>

           {/* Centro: Monto destacado */}
           <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-4 py-2 rounded-lg shadow-inner">
             <span className="text-white font-bold text-base font-mono">
               {formatearVenezolano(exceso - totalVuelto)} Bs
             </span>
           </div>

           {/* Centro-derecha: Mensaje */}
           <span className="text-gray-600 text-sm hidden lg:block">
             Especifica método de entrega
           </span>

           {/* Lado derecho: Botón compacto */}
           <button
             onClick={agregarVuelto}
             disabled={obtenerMetodosDisponibles(vueltos).length === 0}
             className="group bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
           >
             <div className="bg-white/20 p-1 rounded group-hover:bg-white/30 transition-all duration-200">
               <Plus className="h-3 w-3" />
             </div>
             <span className="text-sm">Agregar Método</span>
           </button>
         </div>
         
         <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 mt-2">
           {vueltos.map((vuelto, index) => (
             <PagoItemHybrid
               key={vuelto.id}
               pago={vuelto}
               index={index}
               onUpdate={actualizarVuelto}
               onDelete={eliminarVuelto}
               canDelete={true}
               tipo="vuelto"
             />
           ))}
         </div>
       </div>
     )}
   </div>
 );
};

export default PagosPanel;