// components/RecentActivity.jsx (CÓDIGO COMPLETO - INVENTARIO Y MONTOS EN MISMA FILA)
import React from 'react';
import { Clock, TrendingUp, TrendingDown, Activity, Lock, User, Package, DollarSign, Coins } from 'lucide-react';
import { useRecentActivity } from '../store/cajaStore';

const RecentActivity = () => {
 const { transacciones, ultimoCierre, cajaActual } = useRecentActivity();

 const ultimaActividad = !cajaActual && ultimoCierre 
   ? ultimoCierre 
   : (transacciones.length > 0 ? transacciones[0] : null);

const formatearHora = (fechaHora) => {
   if (!fechaHora) return '--:--';
   const fecha = new Date(fechaHora);
   if (isNaN(fecha.getTime())) return '--:--';
   return fecha.toLocaleTimeString('es-VE', {
     hour: '2-digit',
     minute: '2-digit'
   });
 };

const formatearFecha = (fechaHora) => {
   if (!fechaHora) return '--/--';
   const fecha = new Date(fechaHora);
   if (isNaN(fecha.getTime())) return '--/--';
   return fecha.toLocaleDateString('es-VE', {
     day: '2-digit',
     month: '2-digit'
   });
 };

 const formatearBolivares = (amount) => {
   return Math.round(amount).toLocaleString('es-VE');
 };

 const getInventarioIcon = (tipo) => {
   switch(tipo) {
     case 'producto': return '';
     case 'servicio': return '';
     case 'electrobar': return '';
     default: return '';
   }
 };

const obtenerMontosOriginales = (transaccion) => {
   // Para vueltos, usar los datos directos de la transacción
   if (transaccion.categoria?.includes('Vuelto de venta')) {
     return [{
       monto: transaccion.totalBs,
       moneda: 'bs',
       simbolo: 'Bs'
     }];
   }
   
   // Para transacciones normales, usar pagos
   if (!transaccion.pagos || transaccion.pagos.length === 0) return [];
   
   const montosPorMoneda = transaccion.pagos.reduce((acc, pago) => {
     if (!acc[pago.moneda]) acc[pago.moneda] = 0;
     acc[pago.moneda] += pago.monto;
     return acc;
   }, {});

   return Object.entries(montosPorMoneda).map(([moneda, monto]) => ({
     monto,
     moneda,
     simbolo: moneda === 'usd' ? '$' : 'Bs'
   }));
 };

 return (
   <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col w-full">
     {/* Header estilo CajaStatus/Summary */}
     <div className={`px-4 py-3 ${
       cajaActual 
         ? 'bg-gradient-to-r from-blue-600 to-blue-700'
         : 'bg-gradient-to-r from-slate-600 to-slate-700'
     }`}>
       <div className="flex items-center justify-between">
         <div className="flex items-center space-x-3">
           <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
             <Activity className="h-4 w-4 text-white" />
           </div>
           <div>
             <h3 className="text-sm font-semibold text-white">Última Actividad</h3>
             <p className={`text-xs ${
               cajaActual ? 'text-emerald-100' : 'text-slate-200'
             }`}>
               {cajaActual ? 'Sistema operativo' : 'Sistema cerrado'}
             </p>
           </div>
         </div>
         
         {/* ID/Hora en el header */}
         {ultimaActividad && ultimaActividad.tipo !== 'cierre' && (
           <div className="text-xs text-white/90 font-mono bg-white/10 rounded-full px-2 py-1">
                  #{ultimaActividad.id} • {formatearHora(ultimaActividad.fechaHora || ultimaActividad.fecha_hora || ultimaActividad.createdAt || ultimaActividad.timestamp)}
           </div>
         )}
         {ultimaActividad && ultimaActividad.tipo === 'cierre' && (
           <div className="text-xs text-white/90 bg-white/10 rounded-full px-2 py-1">
             {formatearFecha(ultimaActividad.fechaHora || ultimaActividad.fecha_hora)} • {formatearHora(ultimaActividad.fechaHora || ultimaActividad.fecha_hora)}
           </div>
         )}
       </div>
     </div>

     {/* Contenido */}
     <div className="p-4">
       {!ultimaActividad ? (
         <div className="text-center py-4 text-gray-500">
           <p className="text-sm">No hay actividad registrada</p>
         </div>
       ) : ultimaActividad.tipo === 'cierre' ? (
         // Mostrar información del último cierre
         <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
           <div className="flex items-start justify-between">
             <div className="flex items-start space-x-2">
               <div className="p-1 rounded bg-red-100">
                 <Lock className="h-3 w-3 text-red-600" />
               </div>
               
               <div className="flex-1">
                 <div className="text-sm font-medium text-gray-900">
                   Caja Cerrada
                 </div>
                 <div className="text-xs text-gray-500 flex items-center space-x-1">
                   <User className="h-3 w-3" />
                   <span>Por: {ultimaActividad.usuario_cierre || ultimaActividad.usuario || 'Usuario'}</span>
                 </div>
               </div>
             </div>
             
             <div className="text-right">
               <div className="text-xs text-gray-500 mb-1">Resumen del día</div>
               <div className="text-xs space-y-0.5">
                 <div className="text-success-600 font-medium">
                   +{formatearBolivares(ultimaActividad.total_ingresos_bs)} Bs
                 </div>
                 <div className="text-danger-600 font-medium">
                   -{formatearBolivares(ultimaActividad.total_egresos_bs)} Bs
                 </div>
               </div>
             </div>
           </div>
         </div>
       ) : (
         // Mostrar última transacción
         <div className="space-y-3">
           {/* Título con badge de tipo */}
           <div className="flex items-center space-x-2">
             {ultimaActividad.item_inventario && (
               <span className="text-sm" title={`Del inventario: ${ultimaActividad.item_inventario.tipo}`}>
                 {getInventarioIcon(ultimaActividad.item_inventario.tipo)}
               </span>
             )}
             <div className="text-base font-semibold text-gray-900">
               {ultimaActividad.categoria}
             </div>
             <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
               ultimaActividad.tipo === 'ingreso'
                 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                 : 'bg-red-50 text-red-700 border-red-200'
             }`}>
               {ultimaActividad.tipo === 'ingreso' ? (
                 <TrendingUp className="h-3 w-3 mr-1" />
               ) : (
                 <TrendingDown className="h-3 w-3 mr-1" />
               )}
               {ultimaActividad.tipo === 'ingreso' ? 'INGRESO' : 'EGRESO'}
             </div>
           </div>

           {/* Info del inventario y montos en la misma fila */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
             
             {/* Inventario */}
             {ultimaActividad.item_inventario && (
               <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200/50 shadow-sm">
                 <div className="flex items-center space-x-2 mb-1">
                   <div className="bg-blue-500 p-1 rounded shadow-sm">
                     <Package className="h-3 w-3 text-white" />
                   </div>
                   <span className="text-xs font-semibold text-blue-800">Inventario</span>
                 </div>
                 
                 <div className="flex items-center space-x-2">
                   
                   <div className="flex-1">
                     <div className="text-sm font-bold text-blue-900">
                       {ultimaActividad.item_inventario.cantidad}× ${ultimaActividad.item_inventario.precio_unitario.toFixed(2)}
                     </div>
                     <div className="text-xs text-blue-700">
                       {ultimaActividad.item_inventario.tipo === 'electrobar' ? ' Electrobar' : 
                        ultimaActividad.item_inventario.tipo === 'producto' ? 'Producto' : 'Servicio'}
                     </div>
                   </div>
                   
                   {/* Stock si aplica */}
                   {(ultimaActividad.item_inventario.tipo === 'producto' || ultimaActividad.item_inventario.tipo === 'electrobar') && (
                     <div className="text-right">
                       <div className="text-xs text-blue-600">Stock</div>
                       <div className={`text-sm font-bold ${
                         ultimaActividad.item_inventario.stock_actual <= 5 ? 'text-orange-600' : 'text-green-600'
                       }`}>
                         {ultimaActividad.item_inventario.stock_actual}
                         {ultimaActividad.item_inventario.stock_actual <= 5 && ' '}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Montos originales */}
             <div className="space-y-2">
               {(() => {
                 const montosOriginales = obtenerMontosOriginales(ultimaActividad);
                 return montosOriginales.map((montoInfo, idx) => (
                   <div key={idx} className={`rounded-lg p-3 border shadow-sm ${
                     ultimaActividad.tipo === 'ingreso'
                       ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200/50'
                       : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200/50'
                   }`}>
                     <div className="flex items-center space-x-2 mb-1">
                       <div className={`p-1 rounded shadow-sm ${
                         ultimaActividad.tipo === 'ingreso' ? 'bg-emerald-500' : 'bg-red-500'
                       }`}>
                         {montoInfo.moneda === 'usd' ? (
                           <DollarSign className="h-3 w-3 text-white" />
                         ) : (
                           <Coins className="h-3 w-3 text-white" />
                         )}
                       </div>
                       <span className={`text-xs font-semibold ${
                         ultimaActividad.tipo === 'ingreso' ? 'text-emerald-800' : 'text-red-800'
                       }`}>
                         {montoInfo.moneda === 'usd' ? 'Dólares' : 'Bolívares'}
                       </span>
                     </div>
                     <div className={`text-sm font-bold ${
                       ultimaActividad.tipo === 'ingreso' ? 'text-emerald-900' : 'text-red-900'
                     }`}>
                       {ultimaActividad.tipo === 'ingreso' ? '+' : '-'}
                       {montoInfo.simbolo}{montoInfo.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                     </div>
                   </div>
                 ));
               })()}
             </div>
           </div>

           {/* Métodos de pago compactos */}
           <div className="flex flex-wrap gap-1">
             {(() => {
               // Para vueltos, mostrar método principal
               if (ultimaActividad.categoria?.includes('Vuelto de venta') && ultimaActividad.metodoPagoPrincipal) {
                 const getMetodoColor = (metodo) => {
                   const colorMap = {
                     'efectivo_bs': 'bg-indigo-100 text-indigo-700 border-indigo-200',
                     'efectivo_usd': 'bg-green-100 text-green-700 border-green-200',
                     'pago_movil': 'bg-purple-100 text-purple-700 border-purple-200',
                     'transferencia': 'bg-orange-100 text-orange-700 border-orange-200',
                     'binance': 'bg-yellow-100 text-yellow-700 border-yellow-200'
                   };
                   return colorMap[metodo] || 'bg-gray-100 text-gray-700 border-gray-200';
                 };

                 const getMetodoLabel = (metodo) => {
                   const labelMap = {
                     'efectivo_bs': 'Efectivo Bs',
                     'efectivo_usd': 'Efectivo USD',
                     'pago_movil': 'Pago Móvil',
                     'transferencia': 'Transferencia',
                     'binance': 'Binance'
                   };
                   return labelMap[metodo] || metodo.replace('_', ' ').toUpperCase();
                 };

                 return (
                   <span 
                     className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getMetodoColor(ultimaActividad.metodoPagoPrincipal)}`}
                     title={`Vuelto entregado en ${getMetodoLabel(ultimaActividad.metodoPagoPrincipal)}`}
                   >
                     <TrendingDown className="h-3 w-3 mr-1 text-orange-500" />
                     {getMetodoLabel(ultimaActividad.metodoPagoPrincipal).split(' ')[0]}: {ultimaActividad.totalBs} Bs
                   </span>
                 );
               }
               
               // Para transacciones normales, mostrar pagos
               const getMetodoColor = (metodo) => {
                 const colorMap = {
                   'efectivo_bs': 'bg-indigo-100 text-indigo-700 border-indigo-200',
                   'efectivo_usd': 'bg-green-100 text-green-700 border-green-200',
                   'pago_movil': 'bg-purple-100 text-purple-700 border-purple-200',
                   'transferencia': 'bg-orange-100 text-orange-700 border-orange-200',
                   'binance': 'bg-yellow-100 text-yellow-700 border-yellow-200'
                 };
                 return colorMap[metodo] || 'bg-gray-100 text-gray-700 border-gray-200';
               };

               const getMetodoLabel = (metodo) => {
                 const labelMap = {
                   'efectivo_bs': 'Efectivo Bs',
                   'efectivo_usd': 'Efectivo USD',
                   'pago_movil': 'Pago Móvil',
                   'transferencia': 'Transferencia',
                   'binance': 'Binance'
                 };
                 return labelMap[metodo] || metodo.replace('_', ' ').toUpperCase();
               };

               return ultimaActividad.pagos?.slice(0, 2).map((pago, idx) => (
                 <span 
                   key={idx}
                   className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getMetodoColor(pago.metodo)}`}
                   title={`${getMetodoLabel(pago.metodo)}: ${pago.monto} ${pago.moneda.toUpperCase()}`}
                 >
                   {getMetodoLabel(pago.metodo).split(' ')[0]}: {pago.monto} {pago.moneda.toUpperCase()}
                 </span>
               ));
             })()}
             {(ultimaActividad.pagos?.length || 0) > 2 && !ultimaActividad.categoria?.includes('Vuelto de venta') && (
               <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">
                 +{ultimaActividad.pagos.length - 2}
               </span>
             )}
           </div>

           {/* Info básica al final */}
           <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
             <div className="flex items-center space-x-2">
               <span>{ultimaActividad.pagos?.length || 0} método{(ultimaActividad.pagos?.length || 0) !== 1 ? 's' : ''} de pago</span>
               {ultimaActividad.item_inventario && (
                 <>
                   <span>•</span>
                   <div className="flex items-center space-x-1">
                     <Package className="h-3 w-3 text-indigo-500" />
                     <span className="text-indigo-600 font-medium">Inventario</span>
                   </div>
                 </>
               )}
             </div>
             <div className="text-right">
               <div className="text-gray-400">
                 {formatearFecha(ultimaActividad.fechaHora || ultimaActividad.fecha_hora)}
               </div>
               <div className="text-gray-500 text-xs">
                 Por: {ultimaActividad.usuario || 'Usuario'}
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   </div>
 );
};

export default RecentActivity;