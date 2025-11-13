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
        console.log(`🧹 [PasoModalidadPago] Limpiando solicitud de descuento para sesión: ${sesionId}`);
        api.delete(`/discount-requests/sesion/${sesionId}`).catch((error) => {
          // Silenciar solo errores 404 (solicitud no existe) - esto es normal y esperado
          if (error.response?.status === 404 || error.isSilent) {
            console.log(`ℹ️ [PasoModalidadPago] Solicitud de descuento no encontrada (esperado) para sesión: ${sesionId}`);
          } else {
            console.error('❌ [PasoModalidadPago] Error eliminando solicitud de descuento:', error);
          }
        });
      }
    };
  }, [sesionId]);

  // Calculate totals with precision using utility function
  const calcularTotales = React.useCallback(() => {
    try {
      if (!isValidExchangeRate(tasaCambio)) {
        throw new Error('Tasa de cambio inválida');
      }
      return calculatePaymentTotals(pagos, tasaCambio);
    } catch (error) {
      console.error('Error calculando totales:', error);
      return { totalBs: 0, totalUsd: 0, totalUsdEquivalent: 0 };
    }
  }, [pagos, tasaCambio]);

  // Calcular monto del abono desde los pagos (para ABONO)
  const montoAbono = React.useMemo(() => {
    if (modalidadPago === 'ABONO') {
      const { totalUsd } = calcularTotales();
      return roundMoney(totalUsd);
    }
    return 0;
  }, [modalidadPago, calcularTotales]);

  // Actualizar datos cuando cambie modalidad o pagos
  useEffect(() => {
    const { totalBs, totalUsd, totalUsdEquivalent } = calcularTotales();

    const datosActualizados = {
      modalidadPago,
      pagoInicial: null
    };

    if (modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO') {
      // Calcular monto final: para TOTAL_ADELANTADO usar totalEstimado, para ABONO usar totalUsd de los pagos
      const montoFinal = roundMoney(
        modalidadPago === 'TOTAL_ADELANTADO' ? totalEstimado : totalUsd
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
  }, [modalidadPago, pagos, vueltos, descuento, totalEstimado, tasaCambio, calcularTotales]);

  const handleModalidadChange = (nuevaModalidad) => {
    setModalidadPago(nuevaModalidad);

    // Reset pagos si cambia a PAGO_POSTERIOR
    if (nuevaModalidad === 'PAGO_POSTERIOR') {
      setPagos([]);
      setVueltos([]);
      setDescuento(0);
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
                  Cliente paga parte ahora, el resto al entregar • Se registra abono en caja • Usa el panel de pagos abajo para ingresar el monto
                </div>
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
            {modalidadPago === 'TOTAL_ADELANTADO' ? 'Registrar Pago Total' : 'Registrar Abono Inicial'}
          </h3>

          {modalidadPago === 'ABONO' && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-300">Total del servicio:</span>
                <span className="font-bold text-white">
                  {(totalEstimado * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                </span>
              </div>
              {montoAbono > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-blue-700/30">
                    <span className="text-green-300">Monto del abono:</span>
                    <span className="font-bold text-green-400">
                      {(montoAbono * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-orange-300">Saldo pendiente:</span>
                    <span className="font-bold text-orange-400">
                      {(saldoPendiente * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <PagosPanel
            pagos={pagos}
            vueltos={vueltos}
            onPagosChange={handlePagosChange}
            totalVenta={modalidadPago === 'TOTAL_ADELANTADO' 
              ? roundMoney(totalEstimado * tasaCambio) - roundMoney(descuento) // ✅ Aplicar descuento
              : roundMoney(totalEstimado * tasaCambio) - roundMoney(descuento)} // ✅ Para ABONO, permitir pagar hasta el total
            tasaCambio={tasaCambio}
            title={modalidadPago === 'TOTAL_ADELANTADO' ? "Métodos de Pago" : "Métodos de Pago del Abono"}
            descuento={descuento}
            onDescuentoChange={() => setShowDescuentoModal(true)}
            onDescuentoLimpiar={async () => {
              // 🧹 Cancelar solicitud pendiente en la base de datos si existe
              console.log(`🧹 [PasoModalidadPago] Limpiando descuento para sesión: ${sesionId}`);
              try {
                await api.delete(`/discount-requests/sesion/${sesionId}`);
                console.log(`✅ [PasoModalidadPago] Solicitud de descuento eliminada para sesión: ${sesionId}`);
              } catch (error) {
                // Si no existe la solicitud (404) o ya fue procesada, no es crítico - silenciar el error
                if (error.response?.status === 404 || error.isSilent) {
                  console.log(`ℹ️ [PasoModalidadPago] Solicitud de descuento no encontrada (esperado) para sesión: ${sesionId}`);
                } else {
                  console.error('❌ [PasoModalidadPago] Error eliminando solicitud de descuento:', error);
                }
              }
              setDescuento(0);
              setSolicitudDescuentoId(null);
              toast.success('Descuento eliminado');
            }}
            onValidationChange={handleValidationChange}
          />
        </div>
      )}

      {/* Advertencia si modalidad requiere pago pero no está completo */}
      {(modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO') &&
       pagos.length > 0 &&
       !pagoValido && (
        <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-xl flex items-start gap-2.5 animate-pulse">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-200 text-sm">Pago Incompleto</div>
            <div className="text-xs text-red-300/80 mt-0.5">
              {modalidadPago === 'TOTAL_ADELANTADO' 
                ? 'Debes registrar el pago completo antes de continuar al siguiente paso.'
                : 'Debes registrar el abono antes de continuar al siguiente paso.'}
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
            : roundMoney(totalEstimado * tasaCambio)}
          tasaCambio={tasaCambio}
          ventaData={{
            cliente: datos.cliente || null,
            items: datos.items || [],
            totalBs: roundMoney(totalEstimado * tasaCambio),
            totalUsd: totalEstimado
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
