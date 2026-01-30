import React from 'react';
import { TrendingUp, TrendingDown, Smartphone, BarChart3, Coins, DollarSign } from 'lucide-react';
import { FaCashRegister, FaLock } from 'react-icons/fa';
import { useCajaStore } from '../store/cajaStore';
import { useMontosEnCaja, formatearBolivares, formatearDolares } from '../hooks/useMontosEnCaja';

const Summary = () => {
  const { cajaActual } = useCajaStore();
  const montosReales = useMontosEnCaja();

  if (!cajaActual) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col w-full">
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Resumen del Día</h3>
              <p className="text-xs text-slate-200">Sistema cerrado</p>
            </div>
          </div>
        </div>
        <div className="p-4 text-center py-6 text-gray-500">
          <div className="bg-gray-100/70 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/30">
            <div className="relative">
              <FaCashRegister className="h-10 w-10 text-gray-400" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px] border border-gray-100">
                <FaLock className="h-2.5 w-2.5 text-gray-400" />
              </div>
            </div>
          </div>
          <p>Abre la caja para ver el resumen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Resumen del Día</h3>
              <p className="text-xs text-emerald-100">MONTOS EN CAJA</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-white/10 rounded-full px-2 py-1">
              <TrendingUp className="h-3 w-3 text-white" />
              <span className="text-xs font-medium text-white">
                {montosReales.ventasCount}
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 rounded-full px-2 py-1">
              <TrendingDown className="h-3 w-3 text-white" />
              <span className="text-xs font-medium text-white">
                {montosReales.egresosCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200/50 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="bg-blue-500 p-1 rounded shadow-sm">
                <Coins className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-800">Efectivo Bs</span>
            </div>
            <div className="text-sm font-bold text-blue-900">
              {formatearBolivares(montosReales.efectivoBs)}
            </div>
            <div className="text-xs text-blue-700 mt-0.5">
              Caja física
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200/50 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="bg-green-500 p-1 rounded shadow-sm">
                <DollarSign className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-800">Efectivo $</span>
            </div>
            <div className="text-sm font-bold text-green-900">
              ${formatearDolares(montosReales.efectivoUsd)}
            </div>
            <div className="text-xs text-green-700 mt-0.5">
              Caja física
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200/50 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="bg-purple-500 p-1 rounded shadow-sm">
                <Smartphone className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-800">P. Móvil Bs</span>
            </div>
            <div className="text-sm font-bold text-purple-900">
              {formatearBolivares(montosReales.pagoMovil)}
            </div>
            <div className="text-xs text-purple-700 mt-0.5">
              Cta. Bancaria
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="space-y-2">

            {/* Segunda fila: Balance centrado con iconos */}
            <div className="w-full">
              <div className="flex items-center justify-between w-full bg-blue-50 px-3 py-1 rounded border border-blue-200 text-xs">
                {/* Bolívares */}
                <div className="flex items-center space-x-1">
                  <Coins className="h-3 w-3 text-blue-600" />
                  <span className={`font-semibold ${montosReales.balanceBs >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                    }`}>
                    {formatearBolivares(montosReales.balanceBs)} Bs
                  </span>
                </div>

                <span className="text-gray-400">•</span>

                {/* Dólares */}
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className={`font-semibold ${montosReales.balanceUsd >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                    }`}>
                    ${formatearDolares(montosReales.balanceUsd)}
                  </span>
                </div>

                <span className="text-gray-400">•</span>

                {/* Pago Móvil */}
                <div className="flex items-center space-x-1">
                  <Smartphone className="h-3 w-3 text-purple-600" />
                  <span className="text-purple-600 font-semibold">
                    {formatearBolivares(montosReales.ingresosPagoMovil)} PM
                  </span>
                </div>
              </div>
            </div>

            {/* Primera fila: Solo egresos con contenedor naranja/rojo */}
            <div className="w-full">
              <div className="flex items-center justify-between w-full bg-orange-50 px-3 py-1 rounded border border-orange-200 text-xs">
                {/* Bolívares Egresos */}
                <div className="flex items-center space-x-1">
                  <Coins className="h-3 w-3 text-orange-600" />
                  <span className="text-red-600 font-semibold">
                    -{formatearBolivares(montosReales.egresosBs)} Bs
                  </span>
                </div>

                <span className="text-gray-400">•</span>

                {/* Dólares Egresos */}
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="text-red-600 font-semibold">
                    -{formatearDolares(montosReales.egresosUsd)}
                  </span>
                </div>

                <span className="text-gray-400">•</span>

                {/* Pago Móvil Egresos */}
                <div className="flex items-center space-x-1">
                  <Smartphone className="h-3 w-3 text-purple-600" />
                  <span className="text-red-600 font-semibold">
                    -{formatearBolivares(montosReales.egresosPagoMovil)} PM
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Summary;