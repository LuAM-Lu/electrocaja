// components/servicios/PagoRetiroModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Package, AlertTriangle, CheckCircle, User, Calendar } from 'lucide-react';
import PagosPanel from '../venta/PagosPanel';
import { useCajaStore } from '../../store/cajaStore';
import { useServiciosStore } from '../../store/serviciosStore';
import toast from '../../utils/toast.jsx';
import {
  parseMoney,
  roundMoney,
  subtractMoney,
  isValidExchangeRate
} from '../../utils/moneyUtils';

export default function PagoRetiroModal({ servicio, isOpen, onClose, onPagoCompletado, esAbono = false }) {
  const { tasaCambio, cajaActual } = useCajaStore();
  const { registrarPago } = useServiciosStore();

  const [pagos, setPagos] = useState([]);
  const [vueltos, setVueltos] = useState([]);
  const [pagoValido, setPagoValido] = useState(false);
  const [loading, setLoading] = useState(false);

  // Double-click prevention using ref
  const processingRef = useRef(false);

  // Validate exchange rate on mount
  useEffect(() => {
    if (isOpen && !isValidExchangeRate(tasaCambio)) {
      toast.error('Tasa de cambio inválida. Por favor contacte al administrador.');
    }
  }, [isOpen, tasaCambio]);

  // Limpiar pagos al cerrar
  useEffect(() => {
    if (!isOpen) {
      setPagos([]);
      setVueltos([]);
      setPagoValido(false);
    }
  }, [isOpen]);

  if (!isOpen || !servicio) return null;

  // Use money utils for precise calculations
  const saldoPendiente = roundMoney(parseMoney(servicio.saldoPendiente));
  const totalEstimado = roundMoney(parseMoney(servicio.totalEstimado));
  const totalPagado = roundMoney(parseMoney(servicio.totalPagado));

  // Determinar si es abono o pago final
  const esPagoFinal = servicio.estado === 'LISTO_RETIRO' || servicio.estado === 'Listo para Retiro';
  const esAbonoReal = !esPagoFinal && saldoPendiente > 0;

  // Validation: saldo pendiente must be > 0
  if (saldoPendiente <= 0) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
        <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 border border-red-700 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <h3 className="text-xl font-bold text-white">Error de Validación</h3>
          </div>
          <p className="text-gray-300 mb-4">
            No hay saldo pendiente para este servicio. El saldo debe ser mayor a $0.00.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const handlePagosChange = (nuevosPagos, nuevosVueltos) => {
    setPagos(nuevosPagos);
    setVueltos(nuevosVueltos);
  };

  const handleValidationChange = (completa, exceso) => {
    // Para abonos, permitir pagos parciales (no necesita ser completo)
    if (esAbonoReal) {
      setPagoValido(completa && exceso <= 0.01); // Permitir hasta 1 centavo de diferencia
    } else {
      setPagoValido(completa && exceso === 0); // Pago final debe ser exacto
    }
  };

  const handleConfirmar = async () => {
    // Double-click prevention
    if (processingRef.current) {
      return;
    }

    if (!pagoValido) {
      toast.error(esAbonoReal ? 'Debes ingresar un monto válido' : 'Debes completar el pago antes de continuar');
      return;
    }

    if (!cajaActual) {
      toast.error('No hay caja abierta');
      return;
    }

    // Additional validation
    if (!isValidExchangeRate(tasaCambio)) {
      toast.error('Tasa de cambio inválida');
      return;
    }

    if (saldoPendiente <= 0) {
      toast.error('No hay saldo pendiente para este servicio');
      return;
    }

    // Set processing flag
    processingRef.current = true;
    setLoading(true);

    try {
      // ✅ Asegurar que cada pago tenga la moneda correcta según su método
      const pagosConMoneda = pagos.map(pago => {
        // Mapeo de métodos de pago a monedas (debe coincidir con METODOS_PAGO en PagosPanel)
        const metodoMonedaMap = {
          'efectivo_bs': 'bs',
          'efectivo_usd': 'usd',
          'pago_movil': 'bs',
          'transferencia': 'bs',
          'zelle': 'usd',
          'binance': 'usd',
          'tarjeta': 'bs'
        };
        
        // Si ya tiene moneda, mantenerla; si no, determinarla por método
        const moneda = pago.moneda || metodoMonedaMap[pago.metodo] || 'bs';
        
        return {
          ...pago,
          moneda: moneda // ✅ Asegurar que siempre tenga moneda
        };
      });

      // Registrar pago vía API
      const servicioActualizado = await registrarPago(servicio.id, {
        pagos: pagosConMoneda, // ✅ Enviar pagos con moneda explícita
        vueltos,
        tasaCambio: roundMoney(tasaCambio),
        esAbono: esAbonoReal // Indicar si es abono
      });

      toast.success(esAbonoReal ? '💰 Abono registrado exitosamente' : '💰 Pago registrado exitosamente');

      // Notificar al componente padre
      if (onPagoCompletado) {
        onPagoCompletado(servicioActualizado);
      }

      onClose();
    } catch (error) {
      toast.error(error.message || 'Error registrando pago');
      // Reset processing flag on error
      processingRef.current = false;
    } finally {
      setLoading(false);
      // Small delay before allowing next click
      setTimeout(() => {
        processingRef.current = false;
      }, 500);
    }
  };

  // Convertir montos a Bs. para mostrar
  const convertirABs = (montoUsd) => {
    return roundMoney(montoUsd * tasaCambio);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-modal-backdrop-enter">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl animate-modal-enter">

        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-700 ${
          esAbonoReal 
            ? 'bg-gradient-to-r from-blue-700 to-blue-800' 
            : 'bg-gradient-to-r from-green-700 to-emerald-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {esAbonoReal ? 'Registrar Abono' : 'Cobrar Servicio y Entregar'}
                </h2>
                <p className="text-sm text-green-100">
                  Servicio #{servicio.numeroServicio} - {servicio.dispositivoMarca} {servicio.dispositivoModelo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">

          {/* Info del Cliente */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <User className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">Información del Cliente</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-300 text-xs">Cliente</div>
                <div className="text-white font-semibold">{servicio.clienteNombre}</div>
              </div>
              <div>
                <div className="text-blue-300 text-xs">Teléfono</div>
                <div className="text-white font-semibold">{servicio.clienteTelefono}</div>
              </div>
              {servicio.clienteEmail && (
                <div className="col-span-2">
                  <div className="text-blue-300 text-xs">Email</div>
                  <div className="text-white font-semibold">{servicio.clienteEmail}</div>
                </div>
              )}
            </div>
          </div>

          {/* Info del Dispositivo */}
          <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-green-400" />
              <h3 className="font-semibold text-white">Dispositivo</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Marca:</span>
                <span className="text-white font-medium ml-2">{servicio.dispositivoMarca}</span>
              </div>
              <div>
                <span className="text-gray-400">Modelo:</span>
                <span className="text-white font-medium ml-2">{servicio.dispositivoModelo}</span>
              </div>
              {servicio.dispositivoImei && (
                <div className="col-span-2">
                  <span className="text-gray-400">IMEI/Serial:</span>
                  <span className="text-white font-medium font-mono ml-2 text-xs">{servicio.dispositivoImei}</span>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Pago */}
          <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-5 mb-6 border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-400" />
              Resumen de {esAbonoReal ? 'Abono' : 'Cobro'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-600">
                <span className="text-gray-300">Total del Servicio:</span>
                <div className="text-right">
                  <span className="text-white font-semibold text-lg">
                    ${totalEstimado.toFixed(2)}
                  </span>
                  <div className="text-xs text-gray-400">
                    ({convertirABs(totalEstimado).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
                  </div>
                </div>
              </div>

              {totalPagado > 0 && (
                <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-600">
                  <span className="text-gray-300 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Total Pagado:
                  </span>
                  <div className="text-right">
                    <span className="text-green-400 font-semibold">
                      ${totalPagado.toFixed(2)}
                    </span>
                    <div className="text-xs text-gray-400">
                      ({convertirABs(totalPagado).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className="text-white font-bold text-lg">Saldo {esAbonoReal ? 'Pendiente' : 'a Cobrar'}:</span>
                <div className="text-right">
                  <span className="text-3xl font-bold text-green-400">
                    ${saldoPendiente.toFixed(2)}
                  </span>
                  <div className="text-sm text-gray-400 mt-1">
                    ({convertirABs(saldoPendiente).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
                  </div>
                </div>
              </div>

              {servicio.fechaIngreso && (
                <div className="pt-3 border-t border-gray-600 flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>Recibido: {new Date(servicio.fechaIngreso).toLocaleDateString('es-VE')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Pagos */}
          <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-400" />
              {esAbonoReal ? 'Registrar Abono' : 'Registrar Pago Final'}
            </h3>

            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
              esAbonoReal 
                ? 'bg-blue-900/20 border border-blue-700/50' 
                : 'bg-green-900/20 border border-green-700/50'
            }`}>
              <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                esAbonoReal ? 'text-blue-400' : 'text-green-400'
              }`} />
              <div className={esAbonoReal ? 'text-blue-200' : 'text-green-200'}>
                <span className="font-medium">Al confirmar el {esAbonoReal ? 'abono' : 'pago'}:</span>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Se registrará el ingreso en la caja actual</li>
                  {esAbonoReal ? (
                    <>
                      <li>• El saldo pendiente se actualizará</li>
                      <li>• Puedes registrar más abonos después</li>
                    </>
                  ) : (
                    <>
                      <li>• El servicio se marcará como ENTREGADO</li>
                      <li>• Se podrá imprimir comprobante de entrega</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <PagosPanel
              pagos={pagos}
              vueltos={vueltos}
              onPagosChange={handlePagosChange}
              totalVenta={convertirABs(saldoPendiente)} // ✅ Convertir a Bs. porque PagosPanel espera valores en Bs.
              tasaCambio={tasaCambio}
              title="Métodos de Pago"
              onValidationChange={handleValidationChange}
              permitirPagoParcial={esAbonoReal} // Permitir pagos parciales para abonos
            />
          </div>

          {/* Advertencia si falta pago */}
          {pagos.length > 0 && !pagoValido && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-2 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-medium">⚠️ {esAbonoReal ? 'Monto inválido' : 'El pago no está completo'}</p>
                <p className="text-yellow-300/80 mt-1">
                  {esAbonoReal 
                    ? 'El monto ingresado debe ser mayor a $0.00'
                    : `El monto ingresado no cubre el saldo pendiente de ${saldoPendiente.toFixed(2)}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800/50 px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!pagoValido || loading}
            className={`px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl disabled:shadow-none ${
              esAbonoReal
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {esAbonoReal ? 'Confirmar Abono' : 'Confirmar Cobro y Entregar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
