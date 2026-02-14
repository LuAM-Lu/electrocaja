// components/RecentActivity.jsx (CÓDIGO COMPLETO - INVENTARIO Y MONTOS EN MISMA FILA)
import React from 'react';
import Clock from 'lucide-react/dist/esm/icons/clock'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import Activity from 'lucide-react/dist/esm/icons/activity'
import Lock from 'lucide-react/dist/esm/icons/lock'
import User from 'lucide-react/dist/esm/icons/user'
import Package from 'lucide-react/dist/esm/icons/package'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Coins from 'lucide-react/dist/esm/icons/coins'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
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
    switch (tipo) {
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
      const key = pago.metodo === 'pago_movil' ? 'pm' : pago.moneda;
      if (!acc[key]) acc[key] = 0;
      acc[key] += pago.monto;
      return acc;
    }, {});

    return Object.entries(montosPorMoneda).map(([key, monto]) => ({
      monto,
      moneda: key === 'pm' ? 'bs' : key,
      tipo: key, // 'usd', 'bs', 'pm'
      simbolo: key === 'usd' ? '$' : 'Bs'
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col w-full transition-all duration-300 hover:shadow-md">
      {/* Header Premium */}
      <div className={`px-4 py-3 relative overflow-hidden ${cajaActual
        ? 'bg-gradient-to-r from-blue-600 to-indigo-700'
        : 'bg-gradient-to-r from-slate-700 to-slate-800'
        }`}>
        {/* Shine Effect Overlay */}
        <div className="absolute inset-0 bg-white/5 opacity-20 transform -skew-x-12 translate-x-full animate-[shimmer_2s_infinite]"></div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-md rounded-lg p-1.5 shadow-inner border border-white/10">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Última Actividad</h3>
              <p className={`text-[10px] font-medium uppercase tracking-wider ${cajaActual ? 'text-blue-100' : 'text-slate-300'
                }`}>
                {cajaActual ? 'En Tiempo Real' : 'Historial de Cierre'}
              </p>
            </div>
          </div>

          {/* ID/Hora Badge */}
          {ultimaActividad && ultimaActividad.tipo !== 'cierre' && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-white/80 font-mono bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                #{ultimaActividad.id}
              </span>
              <span className="text-xs text-white font-bold mt-0.5">
                {formatearHora(ultimaActividad.fechaHora || ultimaActividad.fecha_hora || ultimaActividad.createdAt || ultimaActividad.timestamp)}
              </span>
            </div>
          )}
          {ultimaActividad && ultimaActividad.tipo === 'cierre' && (
            <div className="text-xs text-white/90 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm border border-white/10 shadow-sm">
              {formatearFecha(ultimaActividad.fechaHora || ultimaActividad.fecha_hora)} • {formatearHora(ultimaActividad.fechaHora || ultimaActividad.fecha_hora)}
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="p-4 flex-1 flex flex-col justify-center bg-gradient-to-b from-white to-gray-50/50">
        {!ultimaActividad ? (
          <div className="text-center py-8">
            <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3 border border-gray-100 shadow-inner">
              <Clock className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium text-sm">Esperando movimientos...</p>
          </div>
        ) : ultimaActividad.tipo === 'cierre' ? (
          // ==============================
          // VISTA DE CIERRE
          // ==============================
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Caja Cerrada</h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <User className="h-3 w-3 mr-1" />
                    <span>{ultimaActividad.usuario_cierre || ultimaActividad.usuario || 'Usuario'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-emerald-50/50 rounded-lg p-2 border border-emerald-100/50 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Ingresos</span>
                <div className="text-sm font-bold text-emerald-700">+{formatearBolivares(ultimaActividad.total_ingresos_bs)} Bs</div>
              </div>
              <div className="bg-red-50/50 rounded-lg p-2 border border-red-100/50 text-center">
                <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Egresos</span>
                <div className="text-sm font-bold text-red-700">-{formatearBolivares(ultimaActividad.total_egresos_bs)} Bs</div>
              </div>
            </div>
          </div>
        ) : (
          // ==============================
          // VISTA DE TRANSACCIÓN PREMIUM
          // ==============================
          <div className="space-y-4">

            {/* Header Tarjeta */}
            {/* Header Tarjeta - Una sola fila */}
            <div className="flex items-center justify-center w-full px-2 gap-2">
              <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${ultimaActividad.tipo === 'ingreso'
                ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200'
                : 'bg-rose-100/50 text-rose-700 border-rose-200'
                }`}>
                {ultimaActividad.tipo === 'ingreso' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {ultimaActividad.tipo === 'ingreso' ? 'INGRESO' : 'EGRESO'}
              </span>

              <h4 className="text-sm font-bold text-gray-900 truncate max-w-[180px]" title={ultimaActividad.categoria}>
                {ultimaActividad.categoria}
              </h4>

              {ultimaActividad.item_inventario && (
                <span className="flex-shrink-0 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                  Inv.
                </span>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="w-full">

              {/* Card de Montos - Highlight con Grid Dinámico */}
              <div className={(() => {
                const numMontos = obtenerMontosOriginales(ultimaActividad).length;
                return `grid gap-2 ${numMontos >= 3 ? 'grid-cols-3' : numMontos === 2 ? 'grid-cols-2' : 'grid-cols-1'}`;
              })()}>
                {(() => {
                  const montosOriginales = obtenerMontosOriginales(ultimaActividad);
                  return montosOriginales.map((montoInfo, idx) => {
                    const theme = {
                      pm: {
                        bg: 'bg-purple-500',
                        text: 'text-purple-600',
                        amount: 'text-purple-900',
                        border: 'border-purple-100',
                        bgGrad: 'bg-gradient-to-br from-white to-purple-50',
                        shadow: 'shadow-purple-100/50'
                      },
                      usd: {
                        bg: 'bg-emerald-500',
                        text: 'text-emerald-600',
                        amount: 'text-emerald-900',
                        border: 'border-emerald-100',
                        bgGrad: 'bg-gradient-to-br from-white to-emerald-50',
                        shadow: 'shadow-emerald-100/50'
                      },
                      bs: {
                        bg: 'bg-blue-500',
                        text: 'text-blue-600',
                        amount: 'text-blue-900',
                        border: 'border-blue-100',
                        bgGrad: 'bg-gradient-to-br from-white to-blue-50',
                        shadow: 'shadow-blue-100/50'
                      }
                    }[montoInfo.tipo] || {
                      bg: 'bg-gray-500',
                      text: 'text-gray-600',
                      amount: 'text-gray-900',
                      border: 'border-gray-100',
                      bgGrad: 'bg-white',
                      shadow: 'shadow-sm'
                    };

                    const formattedAmount = montoInfo.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 });
                    const fontSize = montosOriginales.length >= 3
                      ? (formattedAmount.length > 10 ? 'text-xs' : 'text-sm')
                      : (formattedAmount.length > 10 ? 'text-base' : 'text-lg');

                    return (
                      <div key={idx} className={`relative overflow-hidden rounded-xl p-3 border transition-all duration-300 hover:shadow-md group ${theme.bgGrad} ${theme.border} ${theme.shadow}`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 group-hover:to-white/20 transition-all duration-500"></div>

                        <div className="flex flex-col items-center justify-center relative z-10 space-y-1">
                          <div className={`p-2 rounded-full shadow-sm mb-1 ${theme.bg} text-white`}>
                            {montoInfo.tipo === 'usd' ? (
                              <DollarSign className="h-4 w-4" />
                            ) : montoInfo.tipo === 'pm' ? (
                              <Smartphone className="h-4 w-4" />
                            ) : (
                              <Coins className="h-4 w-4" />
                            )}
                          </div>

                          <div className="flex flex-col items-center">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} opacity-80`}>
                              {montoInfo.tipo === 'usd' ? 'Dólares' : montoInfo.tipo === 'pm' ? 'Pago Móvil' : 'Bolívares'}
                            </span>
                            <span className={`${fontSize} font-black tracking-tight ${theme.amount}`}>
                              {ultimaActividad.tipo === 'ingreso' ? '+' : '-'}
                              {montoInfo.simbolo}{formattedAmount}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Card Inventario (Si existe) */}
              {ultimaActividad.item_inventario && (
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 relative group overflow-hidden">
                  <div className="absolute -right-4 -top-4 bg-blue-100 rounded-full h-16 w-16 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-2">
                      <div className="bg-white p-1.5 rounded-md shadow-sm text-blue-600 border border-blue-50">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Item</div>
                        <div className="text-sm font-bold text-blue-900">
                          {ultimaActividad.item_inventario.cantidad} un. <span className="text-blue-400 mx-1">×</span> {ultimaActividad.item_inventario.precio_unitario.toFixed(2)}$
                        </div>
                      </div>
                    </div>

                    {(ultimaActividad.item_inventario.tipo === 'producto' || ultimaActividad.item_inventario.tipo === 'electrobar') && (
                      <div className="text-right pl-2 border-l border-blue-200/50">
                        <span className="text-[10px] text-blue-500 font-medium block">Stock</span>
                        <span className={`text-sm font-bold ${ultimaActividad.item_inventario.stock_actual <= 5 ? 'text-orange-500' : 'text-blue-700'
                          }`}>
                          {ultimaActividad.item_inventario.stock_actual}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer Información */}
            <div className="pt-2 mt-1 border-t border-gray-100">
              <div className="flex items-center justify-between">
                {/* Payment Methods Badges */}
                <div className="flex flex-wrap gap-1 align-center">
                  {(() => {
                    if (ultimaActividad.categoria?.includes('Vuelto de venta') && ultimaActividad.metodoPagoPrincipal) {
                      return (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border bg-gray-50 border-gray-200 text-gray-600 shadow-sm">
                          <TrendingDown className="h-2.5 w-2.5 mr-1 text-orange-500" />
                          Vuelto: {ultimaActividad.metodoPagoPrincipal.replace('_', ' ').toUpperCase()}
                        </span>
                      );
                    }

                    return ultimaActividad.pagos?.slice(0, 2).map((pago, idx) => (
                      <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold border bg-gray-50/80 border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors cursor-default">
                        {pago.metodo.split('_')[0].toUpperCase()}
                        <span className="ml-0.5 text-gray-400">|</span>
                        <span className="ml-0.5 font-bold">{pago.moneda.toUpperCase()}</span>
                      </span>
                    ));
                  })()}
                  {(ultimaActividad.pagos?.length || 0) > 2 && (
                    <span className="text-[9px] text-gray-400 font-medium self-center">
                      +{ultimaActividad.pagos.length - 2} más
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex items-center text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100 shrink-0">
                  <User className="h-2.5 w-2.5 mr-1" />
                  <span className="font-medium text-gray-600 max-w-[70px] truncate">
                    {ultimaActividad.usuario || 'Usuario'}
                  </span>
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