// components/servicios/HistorialPagosPanel.jsx
import React from 'react';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import User from 'lucide-react/dist/esm/icons/user'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Clock from 'lucide-react/dist/esm/icons/clock'

export default function HistorialPagosPanel({ servicio }) {
  if (!servicio || !servicio.pagos || servicio.pagos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium">Sin pagos registrados</p>
        <p className="text-xs text-gray-500 mt-1">Los pagos aparecerán aquí cuando se registren</p>
      </div>
    );
  }

  const getMetodoIcon = (metodo) => {
    const iconMap = {
      'efectivo_bs': <DollarSign className="h-4 w-4" />,
      'efectivo_usd': <DollarSign className="h-4 w-4" />,
      'pago_movil': <Smartphone className="h-4 w-4" />,
      'transferencia': <CreditCard className="h-4 w-4" />,
      'zelle': <CreditCard className="h-4 w-4" />,
      'binance': <CreditCard className="h-4 w-4" />,
      'tarjeta': <CreditCard className="h-4 w-4" />
    };
    return iconMap[metodo] || <CreditCard className="h-4 w-4" />;
  };

  const getMetodoColor = (metodo) => {
    const colorMap = {
      'efectivo_bs': 'bg-indigo-900/30 text-indigo-300 border-indigo-700',
      'efectivo_usd': 'bg-green-900/30 text-green-300 border-green-700',
      'pago_movil': 'bg-purple-900/30 text-purple-300 border-purple-700',
      'transferencia': 'bg-orange-900/30 text-orange-300 border-orange-700',
      'zelle': 'bg-green-900/30 text-green-300 border-green-700',
      'binance': 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
      'tarjeta': 'bg-blue-900/30 text-blue-300 border-blue-700'
    };
    return colorMap[metodo] || 'bg-gray-700 text-gray-300 border-gray-600';
  };

  const getMetodoLabel = (metodo) => {
    const labelMap = {
      'efectivo_bs': 'Efectivo Bs',
      'efectivo_usd': 'Efectivo USD',
      'pago_movil': 'Pago Móvil',
      'transferencia': 'Transferencia',
      'zelle': 'Zelle',
      'binance': 'Binance',
      'tarjeta': 'Tarjeta'
    };
    return labelMap[metodo] || metodo;
  };

  const formatFecha = (fecha) => {
    try {
      return new Date(fecha).toLocaleString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  return (
    <div className="space-y-4">
      {servicio.pagos.map((pago, index) => {
        // Parsear pagos si viene como string
        const pagosParsed = typeof pago.pagos === 'string'
          ? JSON.parse(pago.pagos)
          : pago.pagos || [];

        const vueltosParsed = pago.vueltos
          ? (typeof pago.vueltos === 'string' ? JSON.parse(pago.vueltos) : pago.vueltos)
          : [];

        return (
          <div
            key={pago.id || index}
            className="bg-gray-700/30 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
          >
            {/* Header del pago */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    pago.tipo === 'PAGO_INICIAL'
                      ? 'bg-blue-900/30 text-blue-300 border-blue-700'
                      : 'bg-green-900/30 text-green-300 border-green-700'
                  }`}>
                    {pago.tipo === 'PAGO_INICIAL' ? '💰 Pago Inicial' : '✅ Pago Final'}
                  </div>
                  <span className="text-xs text-gray-500">
                    #{index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatFecha(pago.fecha)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Monto</div>
                <div className="text-2xl font-bold text-green-400">
                  ${parseFloat(pago.monto).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Detalles de métodos de pago */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Métodos de Pago:
              </div>

              <div className="space-y-2">
                {pagosParsed.map((metodoPago, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${getMetodoColor(metodoPago.metodo)}`}>
                        {getMetodoIcon(metodoPago.metodo)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-200">
                          {getMetodoLabel(metodoPago.metodo)}
                        </div>
                        {metodoPago.banco && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {metodoPago.banco}
                            {metodoPago.referencia && (
                              <span className="ml-2">
                                • Ref: <span className="font-mono">{metodoPago.referencia}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-200">
                        {metodoPago.moneda === 'bs' ? 'Bs' : '$'}
                        {parseFloat(metodoPago.monto).toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {metodoPago.moneda === 'bs' ? 'Bolívares' : 'Dólares'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vueltos si existen */}
              {vueltosParsed.length > 0 && (
                <div className="pt-3 border-t border-gray-600">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Vueltos Entregados:
                  </div>
                  <div className="space-y-2">
                    {vueltosParsed.map((vuelto, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-red-900/10 rounded-lg p-2 border border-red-800/30"
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-red-300">
                            {getMetodoLabel(vuelto.metodo)}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-red-300">
                          -{vuelto.moneda === 'bs' ? 'Bs' : '$'}
                          {parseFloat(vuelto.monto).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Usuario que registró */}
            {pago.usuario && (
              <div className="mt-4 pt-3 border-t border-gray-600 flex items-center gap-2 text-xs text-gray-400">
                <User className="h-3.5 w-3.5" />
                Registrado por: <span className="text-gray-300 font-medium">{pago.usuario.nombre}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Resumen total */}
      <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-lg p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-gray-300 font-medium">Total Pagado:</span>
          </div>
          <div className="text-3xl font-bold text-green-400">
            ${parseFloat(servicio.totalPagado || 0).toFixed(2)}
          </div>
        </div>

        {servicio.saldoPendiente > 0 && (
          <div className="flex justify-between items-center pt-3 border-t border-green-700/30">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-400" />
              <span className="text-gray-300 font-medium">Saldo Pendiente:</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">
              ${parseFloat(servicio.saldoPendiente).toFixed(2)}
            </div>
          </div>
        )}

        {servicio.saldoPendiente === 0 && servicio.totalPagado > 0 && (
          <div className="mt-3 p-2 bg-green-800/20 border border-green-700/30 rounded-lg flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Servicio Pagado Completamente</span>
          </div>
        )}
      </div>
    </div>
  );
}
