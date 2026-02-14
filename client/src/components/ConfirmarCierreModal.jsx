// components/ConfirmarCierreModal.jsx
import React, { useEffect } from 'react';
import Lock from 'lucide-react/dist/esm/icons/lock'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import X from 'lucide-react/dist/esm/icons/x'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'

const ConfirmarCierreModal = ({
  isOpen,
  onConfirm,
  onCancel,
  datosCierre
}) => {
  // Cerrar con ESC - HOOK DEBE IR ANTES DE CUALQUIER RETURN
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  // 🛡️ PROTECCIÓN: Validar que datosCierre no sea null antes de renderizar
  if (!isOpen || !datosCierre) return null;

  const {
    contadoBs = 0,
    contadoUsd = 0,
    contadoPagoMovil = 0,
    diferenciaBs = 0,
    diferenciaUsd = 0,
    diferenciaPagoMovil = 0,
    hayDiferencias = false
  } = datosCierre;

  // Formatear montos
  const formatearBolivares = (valor) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  };

  const formatearDolares = (valor) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(valor);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Backdrop con glassmorphism */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-lg transition-opacity duration-300"
          onClick={onCancel}
        ></div>

        {/* Modal Container */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl transition-all duration-300 scale-100 opacity-100 max-w-lg w-full border border-white/20">

          {/* Header con gradiente */}
          <div className={`${hayDiferencias
            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
            : 'bg-gradient-to-r from-blue-500 to-blue-600'
          } px-6 py-4 relative overflow-hidden`}>
            {/* Patrón decorativo de fondo */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirmar Cierre de Caja</h3>
                  <p className="text-sm text-white/90">Verifica los montos antes de continuar</p>
                </div>
              </div>

              <button
                onClick={onCancel}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="px-6 py-6 space-y-4">

            {/* Resumen de conteo */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Conteo Final
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Bolívares:</span>
                  <span className="font-bold text-blue-900">{formatearBolivares(contadoBs)} Bs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Dólares:</span>
                  <span className="font-bold text-blue-900">{formatearDolares(contadoUsd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Pago Móvil:</span>
                  <span className="font-bold text-blue-900">{formatearBolivares(contadoPagoMovil)} Bs</span>
                </div>
              </div>
            </div>

            {/* Advertencia de diferencias */}
            {hayDiferencias && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-100 rounded-full p-2 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-amber-900 mb-2">⚠️ Diferencias Detectadas</h5>
                    <div className="space-y-1.5 text-sm">
                      {diferenciaBs !== 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700">Bolívares:</span>
                          <span className={`font-bold flex items-center ${diferenciaBs > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diferenciaBs > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {diferenciaBs > 0 ? '+' : ''}{formatearBolivares(diferenciaBs)} Bs
                            <span className="ml-2 text-xs">({diferenciaBs > 0 ? 'Sobrante' : 'Faltante'})</span>
                          </span>
                        </div>
                      )}
                      {diferenciaUsd !== 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700">Dólares:</span>
                          <span className={`font-bold flex items-center ${diferenciaUsd > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diferenciaUsd > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {diferenciaUsd > 0 ? '+' : ''}{formatearDolares(diferenciaUsd)}
                            <span className="ml-2 text-xs">({diferenciaUsd > 0 ? 'Sobrante' : 'Faltante'})</span>
                          </span>
                        </div>
                      )}
                      {diferenciaPagoMovil !== 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700">Pago Móvil:</span>
                          <span className={`font-bold flex items-center ${diferenciaPagoMovil > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diferenciaPagoMovil > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {diferenciaPagoMovil > 0 ? '+' : ''}{formatearBolivares(diferenciaPagoMovil)} Bs
                            <span className="ml-2 text-xs">({diferenciaPagoMovil > 0 ? 'Sobrante' : 'Faltante'})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje de confirmación */}
            {!hayDiferencias && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-green-900">✅ Montos Exactos</h5>
                    <p className="text-sm text-green-700">
                      El conteo coincide perfectamente con el sistema
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Acción:</span>
                  <span className="font-medium text-gray-900">Cierre definitivo</span>
                </div>
                <div className="flex justify-between">
                  <span>PDF generado:</span>
                  <span className="font-medium text-green-600">✓ Automáticamente</span>
                </div>
                <div className="flex justify-between">
                  <span>Hora actual:</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm border-t border-gray-200/50">
            <div className="flex space-x-3">

              {/* Botón Cancelar */}
              <button
                onClick={onCancel}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-300 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancelar
              </button>

              {/* Botón Confirmar Cierre */}
              <button
                onClick={onConfirm}
                className={`flex-1 ${hayDiferencias
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 focus:ring-amber-500'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500'
                } text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center space-x-2`}
              >
                <Lock className="h-4 w-4" />
                <span>Confirmar Cierre</span>
              </button>
            </div>

            {/* Texto de ayuda */}
            <p className="text-xs text-gray-500 text-center mt-3">
              Presiona <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">Esc</kbd> para cancelar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarCierreModal;
