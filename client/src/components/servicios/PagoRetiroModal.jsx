// components/servicios/PagoRetiroModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Package, AlertTriangle, CheckCircle, User, Calendar } from 'lucide-react';
import PagosPanel from '../venta/PagosPanel';
import DescuentoModal from '../DescuentoModal';
import { useCajaStore } from '../../store/cajaStore';
import { useServiciosStore } from '../../store/serviciosStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../config/api';
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
  const { socket } = useAuthStore();

  const [pagos, setPagos] = useState([]);
  const [vueltos, setVueltos] = useState([]);
  const [pagoValido, setPagoValido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [descuento, setDescuento] = useState(0);
  const [showDescuentoModal, setShowDescuentoModal] = useState(false);
  const [solicitudDescuentoId, setSolicitudDescuentoId] = useState(null);
  
  // Generar sesión ID para el modal de descuento
  const [sesionId] = useState(() => {
    return `sesion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  // Escuchar eventos de aprobación de descuentos desde el componente padre
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function' || !isOpen) return;

    const handleAprobacionDescuento = (data) => {
      // Verificar que la solicitud corresponde a esta sesión
      if (data.solicitud?.sesionId === sesionId || data.solicitud?.id === solicitudDescuentoId) {
        const montoDescuento = parseFloat(data.solicitud.montoDescuento);
        setDescuento(roundMoney(montoDescuento));
        setSolicitudDescuentoId(null);
        toast.success(`Descuento aprobado por ${data.aprobadoPor?.nombre || 'Administrador'}`);
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
        toast.error(`Descuento rechazado: ${data.motivoRechazo || 'Sin motivo especificado'}`);
      }
    };

    socket.on('solicitud_descuento_aprobada', handleAprobacionDescuento);
    socket.on('solicitud_descuento_rechazada', handleRechazoDescuento);

    return () => {
      socket.off('solicitud_descuento_aprobada', handleAprobacionDescuento);
      socket.off('solicitud_descuento_rechazada', handleRechazoDescuento);
    };
  }, [socket, isOpen, sesionId, solicitudDescuentoId, showDescuentoModal]);

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
      setDescuento(0);
      setSolicitudDescuentoId(null);
    }
  }, [isOpen]);

  // Limpiar solicitud de descuento al desmontar
  useEffect(() => {
    return () => {
      // Limpiar solicitud pendiente si existe
      api.delete(`/discount-requests/sesion/${sesionId}`).catch((error) => {
        // Silenciar solo errores 404 (solicitud no existe) - esto es normal
        if (error.response?.status !== 404) {
          console.error('Error eliminando solicitud de descuento:', error);
        }
      });
    };
  }, [sesionId]);

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
        descuento: roundMoney(descuento), // ✅ Incluir descuento
        tasaCambio: roundMoney(tasaCambio),
        esAbono: esAbonoReal // Indicar si es abono
      });

      toast.success(esAbonoReal ? '💰 Abono registrado exitosamente' : '💰 Pago registrado exitosamente');

      // 🆕 Si es abono y hay ticket generado, imprimirlo automáticamente
      if (esAbonoReal && servicioActualizado.ticketAbonoHTML) {
        try {
          const ventanaImpresion = window.open('', '_blank', 'width=302,height=600,scrollbars=yes');
          
          if (ventanaImpresion) {
            let htmlConQR = servicioActualizado.ticketAbonoHTML;
            // Si hay QR code, asegurarse de que esté en el HTML
            if (servicioActualizado.qrAbonoCode && htmlConQR.includes('qr-code-placeholder')) {
              htmlConQR = htmlConQR.replace(
                /<div id="qr-code-placeholder"[^>]*>[\s\S]*?<\/div>/,
                `<img src="${servicioActualizado.qrAbonoCode}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block; border: 1px solid #000;" />`
              );
            } else if (servicioActualizado.qrAbonoCode) {
              // Si hay QR pero no placeholder, insertarlo en el contenedor QR
              htmlConQR = htmlConQR.replace(
                /<div class="qr-container"[^>]*>[\s\S]*?<div class="subtitle bold"[^>]*>ESCANEA PARA SEGUIMIENTO:<\/div>[\s\S]*?<\/div>/,
                `<div class="qr-container" style="color: #000;">
            <div class="subtitle bold" style="color: #000;">ESCANEA PARA SEGUIMIENTO:</div>
            <img src="${servicioActualizado.qrAbonoCode}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block; border: 1px solid #000;" />
        </div>`
              );
            }
            
            ventanaImpresion.document.write(htmlConQR);
            ventanaImpresion.document.close();
            
            ventanaImpresion.onload = () => {
              setTimeout(() => {
                ventanaImpresion.print();
                setTimeout(() => {
                  ventanaImpresion.close();
                }, 1000);
              }, 250);
            };
          }
        } catch (error) {
          console.error('Error imprimiendo ticket de abono:', error);
          // No mostrar error al usuario, solo log
        }
      }

      // Notificar al componente padre
      if (onPagoCompletado) {
        onPagoCompletado(servicioActualizado, esPagoFinal && servicioActualizado.saldoPendiente <= 0);
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

          {/* Info del Cliente + Dispositivo | Resumen Financiero - 2 columnas en 1 fila */}
          <div className="bg-gray-700/50 rounded-xl p-3 mb-4 border border-gray-600">
            <div className="grid grid-cols-2 gap-4">
              {/* Columna 1: Cliente + Dispositivo */}
              <div className="space-y-2">
                {/* Cliente */}
                <div className="flex items-start gap-2">
                  <User className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 text-[10px] mb-0.5">Cliente</div>
                    <div className="text-white font-medium text-[11px] truncate">{servicio.clienteNombre}</div>
                    {servicio.clienteTelefono && (
                      <div className="text-gray-400 text-[10px] mt-0.5">{servicio.clienteTelefono}</div>
                    )}
                  </div>
                </div>
                {/* Dispositivo */}
                <div className="flex items-start gap-2">
                  <Package className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 text-[10px] mb-0.5">Dispositivo</div>
                    <div className="text-white font-medium text-[11px] truncate">{servicio.dispositivoMarca} {servicio.dispositivoModelo}</div>
                    {servicio.dispositivoImei && (
                      <div className="text-gray-400 text-[10px] mt-0.5 font-mono truncate">{servicio.dispositivoImei}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna 2: Resumen Financiero */}
              <div className="flex flex-col justify-center items-end border-l border-gray-600 pl-4 space-y-1.5">
                <div className="w-full">
                  <div className="flex justify-between items-center text-[10px] mb-0.5">
                    <span className="text-gray-400">Total Estimado:</span>
                    <span className="text-white font-semibold text-[11px]">
                      {convertirABs(totalEstimado).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                </div>

                {totalPagado > 0 && (
                  <div className="w-full">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400 flex items-center gap-1">
                        <CheckCircle className="h-2.5 w-2.5 text-green-400" />
                        Total Pagado:
                      </span>
                      <span className="text-green-400 font-semibold text-[11px]">
                        {convertirABs(totalPagado).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                      </span>
                    </div>
                  </div>
                )}

                <div className="w-full pt-1 border-t border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-xs">Saldo {esAbonoReal ? 'Pendiente' : 'a Cobrar'}:</span>
                    <span className="text-lg font-bold text-green-400">
                      {convertirABs(saldoPendiente).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Pagos */}
          <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-400" />
              {esAbonoReal ? 'Registrar Abono' : 'Registrar Pago Final'}
            </h3>

            <PagosPanel
              pagos={pagos}
              vueltos={vueltos}
              onPagosChange={handlePagosChange}
              totalVenta={convertirABs(saldoPendiente) - roundMoney(descuento)} // ✅ Aplicar descuento
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

      {/* Modal de Descuento */}
      {showDescuentoModal && (
        <DescuentoModal
          isOpen={showDescuentoModal}
          onClose={() => setShowDescuentoModal(false)}
          totalVenta={convertirABs(saldoPendiente)}
          tasaCambio={tasaCambio}
          ventaData={{
            cliente: servicio.clienteNombre ? {
              nombre: servicio.clienteNombre,
              telefono: servicio.clienteTelefono,
              email: servicio.clienteEmail
            } : null,
            items: [],
            totalBs: convertirABs(saldoPendiente),
            totalUsd: saldoPendiente
          }}
          items={[]}
          cliente={servicio.clienteNombre ? {
            nombre: servicio.clienteNombre,
            telefono: servicio.clienteTelefono,
            email: servicio.clienteEmail
          } : {}}
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
