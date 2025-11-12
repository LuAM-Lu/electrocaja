// components/servicios/wizard/PasoModalidadPago.jsx
import React, { useState, useEffect } from 'react';
import {
  CreditCard, DollarSign, Clock, CheckCircle,
  AlertCircle, Coins, Banknote, TrendingUp
} from 'lucide-react';
import PagosPanel from '../../venta/PagosPanel';
import DescuentoModal from '../../DescuentoModal';
import { useCajaStore } from '../../../store/cajaStore';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../config/api';
import {
  parseMoney,
  roundMoney,
  calculatePaymentTotals,
  isValidExchangeRate,
  subtractMoney,
  formatMoney
} from '../../../utils/moneyUtils';
import toast from 'react-hot-toast';

export default function PasoModalidadPago({ datos, onActualizar, errores }) {
  const { tasaCambio } = useCajaStore();
  const { socket } = useAuthStore();

  const [modalidadPago, setModalidadPago] = useState(
    datos.modalidadPago || 'PAGO_POSTERIOR'
  );

  const [montoAbono, setMontoAbono] = useState(
    datos.pagoInicial?.monto || 0
  );

  const [pagos, setPagos] = useState(datos.pagoInicial?.pagos || []);
  const [vueltos, setVueltos] = useState(datos.pagoInicial?.vueltos || []);
  const [pagoValido, setPagoValido] = useState(false);
  const [descuento, setDescuento] = useState(datos.pagoInicial?.descuento || 0);
  const [showDescuentoModal, setShowDescuentoModal] = useState(false);
  const [solicitudDescuentoId, setSolicitudDescuentoId] = useState(null);
  
  // Generar sesión ID para el modal de descuento
  const [sesionId] = useState(() => {
    return `sesion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  // Escuchar eventos de aprobación de descuentos desde el componente padre
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleAprobacionDescuento = (data) => {
      // Verificar que la solicitud corresponde a esta sesión
      if (data.solicitud?.sesionId === sesionId || data.solicitud?.id === solicitudDescuentoId) {
        const montoDescuento = parseFloat(data.solicitud.montoDescuento);
        setDescuento(roundMoney(montoDescuento));
        setSolicitudDescuentoId(null);
        toast.success(`Descuento aprobado por ${data.aprobadoPor?.nombre || 'Administrador'}`, {
          icon: React.createElement(CheckCircle, { className: "h-5 w-5 text-green-500" })
        });
        // Cerrar modal si está abierto
        if (showDescuentoModal) {
          setShowDescuentoModal(false);
        }
      }
    };

    const handleRechazoDescuento = (data) => {
      // Verificar que la solicitud corresponde a esta sesión
      if (data.solicitud?.sesionId === sesionId || data.solicitud?.id === solicitudDescuentoId) {
        setSolicitudDescuentoId(null);
        toast.error(`Descuento rechazado: ${data.motivoRechazo || 'Sin motivo especificado'}`, {
          icon: React.createElement(AlertCircle, { className: "h-5 w-5 text-red-500" })
        });
      }
    };

    socket.on('solicitud_descuento_aprobada', handleAprobacionDescuento);
    socket.on('solicitud_descuento_rechazada', handleRechazoDescuento);

    return () => {
      socket.off('solicitud_descuento_aprobada', handleAprobacionDescuento);
      socket.off('solicitud_descuento_rechazada', handleRechazoDescuento);
    };
  }, [socket, sesionId, solicitudDescuentoId, showDescuentoModal]);

  // Calculate total estimado with precision
  const totalEstimado = roundMoney(
    (datos.items || []).reduce(
      (sum, item) => sum + parseMoney(item.cantidad) * parseMoney(item.precio_unitario),
      0
    )
  );

  // Validate exchange rate on mount and when it changes
  useEffect(() => {
    if (!isValidExchangeRate(tasaCambio)) {
      toast.error('Tasa de cambio inválida. Debe ser mayor a 0.');
    }
  }, [tasaCambio]);

  // Limpiar solicitud de descuento al desmontar
  useEffect(() => {
    return () => {
      // Limpiar solicitud pendiente si existe
      if (sesionId) {
        api.delete(`/discount-requests/sesion/${sesionId}`).catch((error) => {
          // Silenciar solo errores 404 (solicitud no existe) - esto es normal y esperado
          if (error.response?.status !== 404) {
            console.error('Error eliminando solicitud de descuento:', error);
          }
          // Los errores 404 son esperados cuando la solicitud ya fue procesada o no existe
        }).catch(() => {
          // Ignorar completamente cualquier error en la limpieza
        });
      }
    };
  }, [sesionId]);

  // Calculate totals with precision using utility function
  const calcularTotales = () => {
    try {
      if (!isValidExchangeRate(tasaCambio)) {
        throw new Error('Tasa de cambio inválida');
      }
      return calculatePaymentTotals(pagos, tasaCambio);
    } catch (error) {
      console.error('Error calculando totales:', error);
      return { totalBs: 0, totalUsd: 0, totalUsdEquivalent: 0 };
    }
  };

  // Actualizar datos cuando cambie modalidad
  useEffect(() => {
    const { totalBs, totalUsd, totalUsdEquivalent } = calcularTotales();

    const datosActualizados = {
      modalidadPago,
      pagoInicial: null
    };

    if (modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO') {
      const montoFinal = roundMoney(
        modalidadPago === 'TOTAL_ADELANTADO' ? totalEstimado : montoAbono
      );

      datosActualizados.pagoInicial = {
        monto: montoFinal,
        pagos,
        vueltos,
        descuento: roundMoney(descuento),
        totalBs: roundMoney(totalBs),
        totalUsd: roundMoney(totalUsd),
        totalUsdEquivalent: roundMoney(totalUsdEquivalent),
        tasaCambio: roundMoney(tasaCambio)
      };
    }

    onActualizar(datosActualizados);
  }, [modalidadPago, montoAbono, pagos, vueltos, descuento, totalEstimado, tasaCambio]);

  const handleModalidadChange = (nuevaModalidad) => {
    setModalidadPago(nuevaModalidad);

    // Reset pagos si cambia a PAGO_POSTERIOR
    if (nuevaModalidad === 'PAGO_POSTERIOR') {
      setPagos([]);
      setVueltos([]);
      setMontoAbono(0);
      setDescuento(0);
    } else if (nuevaModalidad === 'TOTAL_ADELANTADO') {
      setMontoAbono(roundMoney(totalEstimado));
    }
  };

  const handlePagosChange = (nuevosPagos, nuevosVueltos) => {
    setPagos(nuevosPagos);
    setVueltos(nuevosVueltos);
  };

  const handleValidationChange = (completa, exceso) => {
    setPagoValido(completa && exceso === 0);
  };

  const saldoPendiente = subtractMoney(totalEstimado, montoAbono);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Total Estimado */}
      <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/40 rounded-xl p-6 border border-blue-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-300" />
            </div>
            <div>
              <div className="text-sm text-blue-300 font-medium">Total del Servicio</div>
              <div className="text-3xl font-bold text-white">
                {(totalEstimado * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
              </div>
              <div className="text-xs text-blue-400 mt-1">
                ${totalEstimado.toFixed(2)} USD • {datos.items?.length || 0} item(s) estimado(s)
              </div>
            </div>
          </div>
          {totalEstimado > 0 && (
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-700 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-300">Calculado</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opciones de Modalidad */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-green-400" />
          Selecciona la Modalidad de Pago
        </h3>

        {/* Opción 1: Pago Total Adelantado */}
        <button
          type="button"
          onClick={() => handleModalidadChange('TOTAL_ADELANTADO')}
          className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
            modalidadPago === 'TOTAL_ADELANTADO'
              ? 'border-green-500 bg-green-600/20 shadow-lg shadow-green-900/20'
              : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                modalidadPago === 'TOTAL_ADELANTADO'
                  ? 'bg-green-500/20 border border-green-600'
                  : 'bg-gray-700 border border-gray-600'
              }`}>
                <Banknote className={`h-5 w-5 ${
                  modalidadPago === 'TOTAL_ADELANTADO' ? 'text-green-300' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <div className={`font-semibold text-base ${
                  modalidadPago === 'TOTAL_ADELANTADO' ? 'text-green-100' : 'text-gray-300'
                }`}>
                  Pago Total Adelantado
                </div>
                <div className={`text-xs ${
                  modalidadPago === 'TOTAL_ADELANTADO' ? 'text-green-300/80' : 'text-gray-500'
                }`}>
                  Cliente paga el total ahora ({(totalEstimado * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.) • Se registra ingreso completo
                </div>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              modalidadPago === 'TOTAL_ADELANTADO'
                ? 'border-green-400 bg-green-500 scale-110'
                : 'border-gray-400'
            }`}>
              {modalidadPago === 'TOTAL_ADELANTADO' && (
                <CheckCircle className="h-3 w-3 text-white" />
              )}
            </div>
          </div>
        </button>

        {/* Opción 2: Abono Inicial */}
        <button
          type="button"
          onClick={() => handleModalidadChange('ABONO')}
          className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
            modalidadPago === 'ABONO'
              ? 'border-blue-500 bg-blue-600/20 shadow-lg shadow-blue-900/20'
              : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-2 rounded-lg ${
                modalidadPago === 'ABONO'
                  ? 'bg-blue-500/20 border border-blue-600'
                  : 'bg-gray-700 border border-gray-600'
              }`}>
                <Coins className={`h-5 w-5 ${
                  modalidadPago === 'ABONO' ? 'text-blue-300' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-base ${
                  modalidadPago === 'ABONO' ? 'text-blue-100' : 'text-gray-300'
                }`}>
                  Abono Inicial + Saldo Pendiente
                </div>
                <div className={`text-xs ${
                  modalidadPago === 'ABONO' ? 'text-blue-300/80' : 'text-gray-500'
                }`}>
                  Cliente paga parte ahora, el resto al entregar • Se registra abono en caja
                </div>

                {modalidadPago === 'ABONO' && (
                  <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-gray-800/50 rounded-lg p-2.5 border border-gray-600">
                      <label className="block text-xs font-medium text-blue-300 mb-1.5">
                        Monto del Abono Inicial
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Bs.</span>
                          <input
                            type="number"
                            min="0"
                            max={totalEstimado * tasaCambio}
                            step="0.01"
                            value={montoAbono * tasaCambio}
                            onChange={(e) => {
                              const valorBs = parseMoney(e.target.value);
                              const valorUsd = roundMoney(valorBs / tasaCambio);
                              if (valorUsd <= totalEstimado) {
                                setMontoAbono(roundMoney(valorUsd));
                              }
                            }}
                            className="w-full pl-8 pr-2.5 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="text-xs text-blue-200 whitespace-nowrap">
                          de {(totalEstimado * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                        </div>
                      </div>
                    </div>

                    {montoAbono > 0 && (
                      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-blue-300">Saldo pendiente:</span>
                          <span className="font-bold text-orange-400 text-base">
                            {(saldoPendiente * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                          </span>
                          <span className="text-xs text-blue-400 ml-2">
                            (${saldoPendiente.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              modalidadPago === 'ABONO'
                ? 'border-blue-400 bg-blue-500 scale-110'
                : 'border-gray-400'
            }`}>
              {modalidadPago === 'ABONO' && (
                <CheckCircle className="h-3 w-3 text-white" />
              )}
            </div>
          </div>
        </button>

        {/* Opción 3: Pago al Retiro */}
        <button
          type="button"
          onClick={() => handleModalidadChange('PAGO_POSTERIOR')}
          className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
            modalidadPago === 'PAGO_POSTERIOR'
              ? 'border-orange-500 bg-orange-600/20 shadow-lg shadow-orange-900/20'
              : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                modalidadPago === 'PAGO_POSTERIOR'
                  ? 'bg-orange-500/20 border border-orange-600'
                  : 'bg-gray-700 border border-gray-600'
              }`}>
                <Clock className={`h-5 w-5 ${
                  modalidadPago === 'PAGO_POSTERIOR' ? 'text-orange-300' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <div className={`font-semibold text-base ${
                  modalidadPago === 'PAGO_POSTERIOR' ? 'text-orange-100' : 'text-gray-300'
                }`}>
                  Pago al Finalizar Servicio
                </div>
                <div className={`text-xs ${
                  modalidadPago === 'PAGO_POSTERIOR' ? 'text-orange-300/80' : 'text-gray-500'
                }`}>
                  No se cobra ahora, se cobrará al entregar • No se registra ingreso hasta la entrega
                </div>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              modalidadPago === 'PAGO_POSTERIOR'
                ? 'border-orange-400 bg-orange-500 scale-110'
                : 'border-gray-400'
            }`}>
              {modalidadPago === 'PAGO_POSTERIOR' && (
                <CheckCircle className="h-3 w-3 text-white" />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Panel de Pagos (solo si es TOTAL_ADELANTADO o ABONO) */}
      {(modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO') && (
        <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-400" />
            Registrar Pago Inicial
          </h3>

          {modalidadPago === 'ABONO' && montoAbono === 0 && (
            <div className="mb-3 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-200">
                <p className="font-medium mb-0.5">Monto del abono requerido</p>
                <p className="text-yellow-300/80">
                  Debes especificar el monto del abono inicial en la opción de arriba antes de registrar el pago.
                </p>
              </div>
            </div>
          )}

          {((modalidadPago === 'TOTAL_ADELANTADO') || (modalidadPago === 'ABONO' && montoAbono > 0)) && (
            <PagosPanel
              pagos={pagos}
              vueltos={vueltos}
              onPagosChange={handlePagosChange}
              totalVenta={modalidadPago === 'TOTAL_ADELANTADO' 
                ? roundMoney(totalEstimado * tasaCambio) - roundMoney(descuento) // ✅ Aplicar descuento
                : roundMoney(montoAbono * tasaCambio) - roundMoney(descuento)} // ✅ Aplicar descuento
              tasaCambio={tasaCambio}
              title="Métodos de Pago"
              descuento={descuento}
              onDescuentoChange={() => setShowDescuentoModal(true)}
              onDescuentoLimpiar={async () => {
                // 🧹 Cancelar solicitud pendiente en la base de datos si existe
                try {
                  await api.delete(`/discount-requests/sesion/${sesionId}`);
                } catch (error) {
                  // Si no existe la solicitud (404) o ya fue procesada, no es crítico - silenciar el error
                  if (error.response?.status !== 404) {
                    console.error('Error eliminando solicitud de descuento:', error);
                  }
                }
                setDescuento(0);
                setSolicitudDescuentoId(null);
                toast.success('Descuento eliminado');
              }}
              onValidationChange={handleValidationChange}
            />
          )}
        </div>
      )}

      {/* Advertencia si modalidad requiere pago pero no está completo */}
      {(modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO') &&
       montoAbono > 0 &&
       pagos.length > 0 &&
       !pagoValido && (
        <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-xl flex items-start gap-2.5 animate-pulse">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-200 text-sm">Pago Incompleto</div>
            <div className="text-xs text-red-300/80 mt-0.5">
              Debes registrar el pago completo antes de continuar al siguiente paso.
            </div>
          </div>
        </div>
      )}

      {/* Info adicional */}
      {modalidadPago === 'PAGO_POSTERIOR' && (
        <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200">
            <p className="font-medium mb-0.5">Pago Posterior</p>
            <p className="text-blue-300/80">
              El servicio quedará pendiente de pago. Cuando el dispositivo esté listo para retiro,
              podrás registrar el cobro desde el detalle del servicio.
            </p>
          </div>
        </div>
      )}

      {/* Modal de Descuento */}
      {showDescuentoModal && (
        <DescuentoModal
          isOpen={showDescuentoModal}
          onClose={() => setShowDescuentoModal(false)}
          totalVenta={modalidadPago === 'TOTAL_ADELANTADO' 
            ? roundMoney(totalEstimado * tasaCambio)
            : roundMoney(montoAbono * tasaCambio)}
          tasaCambio={tasaCambio}
          ventaData={{
            cliente: datos.cliente || null,
            items: datos.items || [],
            totalBs: modalidadPago === 'TOTAL_ADELANTADO' 
              ? roundMoney(totalEstimado * tasaCambio)
              : roundMoney(montoAbono * tasaCambio),
            totalUsd: modalidadPago === 'TOTAL_ADELANTADO' 
              ? totalEstimado
              : montoAbono
          }}
          items={datos.items || []}
          cliente={datos.cliente || {}}
          sesionId={sesionId}
          onDescuentoAprobado={(montoDescuento, motivoDescuento = '') => {
            setDescuento(roundMoney(montoDescuento));
            setSolicitudDescuentoId(null);
            toast.success(`Descuento de ${montoDescuento.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs aplicado`);
            setShowDescuentoModal(false);
          }}
          onSolicitudCreada={(solicitudId) => {
            // Guardar el ID de la solicitud para escuchar eventos de aprobación
            setSolicitudDescuentoId(solicitudId);
          }}
        />
      )}
    </div>
  );
}
