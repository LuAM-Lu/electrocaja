import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Percent from 'lucide-react/dist/esm/icons/percent'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import Banknote from 'lucide-react/dist/esm/icons/banknote'
import Star from 'lucide-react/dist/esm/icons/star'
import Heart from 'lucide-react/dist/esm/icons/heart'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Clock from 'lucide-react/dist/esm/icons/clock'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import api from '../config/api';

const DescuentoModal = ({ 
  isOpen, 
  onClose, 
  totalVenta, 
  tasaCambio, 
  ventaData,
  items,
  cliente,
  sesionId,
  onDescuentoAprobado,
  onSolicitudCreada // ✅ Callback opcional para notificar cuando se crea una solicitud
}) => {
  const { usuario, socket } = useAuthStore();
  const [tipoDescuento, setTipoDescuento] = useState('porcentaje');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('bs');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [esperandoAprobacion, setEsperandoAprobacion] = useState(false);
  const [solicitudId, setSolicitudId] = useState(null);

  // Limpiar estados al cerrar
  useEffect(() => {
    if (!isOpen) {
      setTipoDescuento('porcentaje');
      setMonto('');
      setMoneda('bs');
      setMotivo('');
      setLoading(false);
      setEsperandoAprobacion(false);
      setSolicitudId(null);
    }
  }, [isOpen]);

  // Escuchar eventos de Socket.IO para aprobación/rechazo
  useEffect(() => {
    if (!socket || !esperandoAprobacion || !solicitudId) return;

    const handleAprobacion = (data) => {
      if (data.solicitud?.id === solicitudId || data.solicitud?.sesionId === sesionId) {
        setEsperandoAprobacion(false);
        const montoDescuento = parseFloat(data.solicitud.montoDescuento);
        onDescuentoAprobado(montoDescuento, data.solicitud.motivo);
        toast.success(`Descuento aprobado por ${data.aprobadoPor?.nombre || 'Administrador'}`, {
          icon: React.createElement(CheckCircle, { className: "h-5 w-5 text-green-500" })
        });
        onClose();
      }
    };

    const handleRechazo = (data) => {
      if (data.solicitud?.id === solicitudId || data.solicitud?.sesionId === sesionId) {
        setEsperandoAprobacion(false);
        toast.error(`Descuento rechazado: ${data.motivoRechazo || 'Sin motivo especificado'}`, {
          icon: React.createElement(XCircle, { className: "h-5 w-5 text-red-500" })
        });
        // Permitir modificar y reintentar
      }
    };

    socket.on('solicitud_descuento_aprobada', handleAprobacion);
    socket.on('solicitud_descuento_rechazada', handleRechazo);

    return () => {
      socket.off('solicitud_descuento_aprobada', handleAprobacion);
      socket.off('solicitud_descuento_rechazada', handleRechazo);
    };
  }, [socket, esperandoAprobacion, solicitudId, sesionId, onDescuentoAprobado, onClose]);

  // Cancelar solicitud si el usuario cierra el modal mientras espera
  useEffect(() => {
    if (!isOpen && esperandoAprobacion && solicitudId) {
      cancelarSolicitud();
    }
  }, [isOpen]);

  const cancelarSolicitud = async () => {
    if (!solicitudId) return;
    try {
      await api.delete(`/discount-requests/sesion/${sesionId}`);
      setEsperandoAprobacion(false);
      setSolicitudId(null);
    } catch (error) {
      console.error('Error cancelando solicitud:', error);
    }
  };

  const calcularMontoDescuento = () => {
    const montoDescuento = parseFloat(monto) || 0;
    if (montoDescuento <= 0) return 0;

    if (tipoDescuento === 'porcentaje') {
      return (totalVenta * montoDescuento) / 100;
    } else {
      return moneda === 'bs' ? montoDescuento : montoDescuento * tasaCambio;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const montoDescuento = parseFloat(monto) || 0;
    if (montoDescuento <= 0) {
      toast.error('El descuento debe ser mayor a 0');
      return;
    }

    // Validar límites según tipo
    if (tipoDescuento === 'porcentaje' && montoDescuento > 70) {
      toast.error('El porcentaje máximo permitido es 70%');
      return;
    }

    const montoEnBs = calcularMontoDescuento();
    
    if (montoEnBs >= totalVenta) {
      toast.error('El descuento no puede ser mayor o igual al total de la venta');
      return;
    }

    if (!motivo.trim()) {
      toast.error('Debes seleccionar un motivo del descuento');
      return;
    }

    // Si es admin, aplicar directamente sin solicitud
    if (usuario?.rol === 'admin') {
      onDescuentoAprobado(montoEnBs, motivo.trim());
      onClose();
      return;
    }

    // Si no es admin, crear solicitud pendiente
    setLoading(true);
    try {
      const response = await api.post('/discount-requests', {
        sesionId,
        ventaData,
        items,
        cliente,
        tipoDescuento,
        montoDescuento: montoEnBs,
        monedaDescuento: moneda,
        porcentajeDescuento: tipoDescuento === 'porcentaje' ? montoDescuento : null,
        motivo: motivo.trim(),
        totalVenta,
        totalConDescuento: totalVenta - montoEnBs,
        tasaCambio
      });

      if (response.data.success) {
        setSolicitudId(response.data.data.id);
        setEsperandoAprobacion(true);
        // ✅ Notificar al componente padre que se creó una solicitud
        if (onSolicitudCreada) {
          onSolicitudCreada(response.data.data.id);
        }
        toast('Solicitud de descuento enviada. Esperando aprobación de administrador...', {
          icon: React.createElement(Clock, { className: "h-5 w-5 text-blue-500" }),
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Error creando solicitud de descuento:', error);
      toast.error(error.response?.data?.message || 'Error al solicitar descuento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const montoEnBs = calcularMontoDescuento();
  const totalConDescuento = totalVenta - montoEnBs;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[80] p-4">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full relative border border-gray-100 ${
        esperandoAprobacion ? 'min-h-[500px] overflow-visible' : 'overflow-hidden'
      }`}>
        
        {/* Header Premium */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="relative flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Aplicar Descuento</h3>
                <p className="text-xs text-purple-100 mt-0.5">Configura el descuento para esta venta</p>
              </div>
            </div>
            {!esperandoAprobacion && (
              <button 
                onClick={onClose} 
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all hover:scale-110 backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Overlay de bloqueo mientras espera aprobación - Premium */}
        {esperandoAprobacion && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 backdrop-blur-md flex flex-col items-center justify-center z-50 p-8 rounded-2xl border-2 border-purple-200 shadow-inner min-h-[500px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-purple-200 rounded-full animate-ping opacity-20"></div>
              <div className="relative bg-gradient-to-br from-purple-600 to-indigo-600 p-4 rounded-full shadow-lg">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-2 text-center">Esperando Aprobación</h4>
            <p className="text-gray-600 text-center mb-6 max-w-sm">
              Tu solicitud de descuento ha sido enviada a los administradores.
              <br />
              <span className="font-medium text-purple-700">Por favor espera mientras revisan tu solicitud...</span>
            </p>
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-300 rounded-xl p-5 w-full max-w-sm shadow-md">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Percent className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 font-medium">Descuento Solicitado</div>
                    <div className="text-lg font-bold text-purple-900">
                      {montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                cancelarSolicitud();
                onClose();
              }}
              className="mt-6 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              Cancelar solicitud
            </button>
          </div>
        )}

        {/* Contenido del formulario */}
        {!esperandoAprobacion && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Tipo de Descuento */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Descuento
              </label>
              <select
                value={tipoDescuento}
                onChange={(e) => {
                  setTipoDescuento(e.target.value);
                  setMonto('');
                }}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white font-medium"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto Fijo</option>
              </select>
            </div>

            {/* Monto/Porcentaje y Moneda */}
            <div className={tipoDescuento === 'porcentaje' ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {tipoDescuento === 'porcentaje' ? 'Porcentaje' : 'Monto'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={tipoDescuento === 'porcentaje' ? '1' : '0.01'}
                    max={tipoDescuento === 'porcentaje' ? '70' : undefined}
                    min="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder={tipoDescuento === 'porcentaje' ? '0' : '0.00'}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium"
                    required
                  />
                  {tipoDescuento === 'porcentaje' && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-gray-500 text-sm font-semibold">%</span>
                    </div>
                  )}
                </div>
              </div>
              
              {tipoDescuento !== 'porcentaje' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Moneda</label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white font-medium"
                  >
                    <option value="bs">Bs</option>
                    <option value="usd">USD</option>
                  </select>
                </div>
              )}
            </div>

            {/* Vista Previa - Siempre visible */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-purple-900 mb-3 flex items-center space-x-2">
                <Percent className="h-4 w-4" />
                <span>Vista Previa del Descuento</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Venta:</span>
                  <span className="font-semibold text-gray-900">{totalVenta.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
                </div>
                {monto && parseFloat(monto) > 0 ? (
                  <>
                    <div className="flex justify-between items-center text-purple-700">
                      <span>Descuento:</span>
                      <span className="font-bold">
                        -{montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                        {tipoDescuento === 'porcentaje' && ` (${monto}%)`}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-xl pt-3 border-t-2 border-purple-200">
                      <span className="text-purple-900">Total a Pagar:</span>
                      <span className="text-purple-900">
                        {totalConDescuento.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-purple-600 italic text-center py-3 bg-white/50 rounded-lg">
                    Ingresa un {tipoDescuento === 'porcentaje' ? 'porcentaje' : 'monto'} para ver el descuento
                  </div>
                )}
              </div>
            </div>

            {/* Motivo - Solo botones */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Motivo del descuento *
              </label>
              
              {/* Botones Rápidos de Motivo */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icono: Banknote, texto: 'Pago Rápido', color: 'text-green-600', hoverClass: 'hover:bg-green-50', borderClass: 'border-green-300' },
                  { icono: Star, texto: 'Cliente Especial', color: 'text-yellow-600', hoverClass: 'hover:bg-yellow-50', borderClass: 'border-yellow-300' },
                  { icono: Heart, texto: 'Cliente Leal', color: 'text-red-600', hoverClass: 'hover:bg-red-50', borderClass: 'border-red-300' },
                  { icono: Percent, texto: 'Promoción Especial', color: 'text-purple-600', hoverClass: 'hover:bg-purple-50', borderClass: 'border-purple-300' },
                  { icono: AlertCircle, texto: 'Producto con Defecto', color: 'text-orange-600', hoverClass: 'hover:bg-orange-50', borderClass: 'border-orange-300' }
                ].map((motivoRapido, index) => {
                  const IconoComponente = motivoRapido.icono;
                  const isSelected = motivo === motivoRapido.texto;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setMotivo(motivoRapido.texto)}
                      className={`px-4 py-3 text-sm font-semibold rounded-xl text-center transition-all flex items-center justify-center space-x-2 border-2 ${
                        isSelected
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg scale-105'
                          : `bg-white text-gray-700 ${motivoRapido.borderClass} ${motivoRapido.hoverClass} hover:scale-105`
                      }`}
                    >
                      <IconoComponente className={`h-4 w-4 ${
                        isSelected ? 'text-white' : motivoRapido.color
                      }`} />
                      <span>{motivoRapido.texto}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-3 text-gray-700 font-semibold border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !monto || !motivo.trim()}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>{usuario?.rol === 'admin' ? 'Aplicar' : 'Solicitar Aprobación'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DescuentoModal;

