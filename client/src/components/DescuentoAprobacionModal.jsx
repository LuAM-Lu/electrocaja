// components/DescuentoAprobacionModal.jsx - Modal de aprobación de descuentos para admins
import React, { useState } from 'react';
import { CheckCircle, XCircle, Percent, User, ShoppingCart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import api from '../config/api';

const DescuentoAprobacionModal = ({ solicitud, onClose, onAprobado, onRechazado }) => {
  const { usuario } = useAuthStore();
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  if (!solicitud) return null;

  const items = solicitud.items || [];
  const cliente = solicitud.cliente || {};
  const ventaData = solicitud.ventaData || {};

  const handleAprobar = async () => {
    if (usuario?.rol !== 'admin') {
      toast.error('Solo administradores pueden aprobar descuentos');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/discount-requests/${solicitud.id}/aprobar`);
      
      if (response.data.success) {
        toast.success(`Descuento aprobado por ${usuario.nombre}`, {
          icon: React.createElement(CheckCircle, { className: "h-5 w-5 text-green-500" })
        });
        if (onAprobado) onAprobado(solicitud);
        onClose();
      }
    } catch (error) {
      console.error('Error aprobando descuento:', error);
      toast.error(error.response?.data?.message || 'Error al aprobar descuento');
    } finally {
      setLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      toast.error('Debes proporcionar un motivo de rechazo');
      return;
    }

    if (usuario?.rol !== 'admin') {
      toast.error('Solo administradores pueden rechazar descuentos');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/discount-requests/${solicitud.id}/rechazar`, {
        motivoRechazo: motivoRechazo.trim()
      });
      
      if (response.data.success) {
        toast(`Descuento rechazado por ${usuario.nombre}`, {
          icon: React.createElement(XCircle, { className: "h-5 w-5 text-red-500" }),
          duration: 4000
        });
        if (onRechazado) onRechazado(solicitud);
        onClose();
      }
    } catch (error) {
      console.error('Error rechazando descuento:', error);
      toast.error(error.response?.data?.message || 'Error al rechazar descuento');
    } finally {
      setLoading(false);
    }
  };

  const formatearMoneda = (valor) => {
    return parseFloat(valor || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-100">
        
        {/* Header compacto */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-white">
          <div className="flex items-center space-x-2">
            <Percent className="h-5 w-5" />
            <h2 className="text-lg font-bold">Aprobar Descuento</h2>
          </div>
        </div>

        {/* Contenido scrolleable - Compacto */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* Información compacta - Usuario y Cliente en una fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1.5">
                <User className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-semibold text-blue-900 uppercase">Usuario</h3>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{solicitud.usuario?.nombre || 'N/A'}</div>
                <div className="text-xs text-gray-600">{solicitud.usuario?.email || ''}</div>
              </div>
            </div>

            {cliente && Object.keys(cliente).length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1.5">
                  <User className="h-4 w-4 text-gray-600" />
                  <h3 className="text-xs font-semibold text-gray-900 uppercase">Cliente</h3>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{cliente.nombre || 'N/A'}</div>
                  {cliente.telefono && (
                    <div className="text-xs text-gray-600">{cliente.telefono}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items de la venta - Compacto */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-gray-600" />
              <h3 className="text-xs font-semibold text-gray-900 uppercase">Items ({items.length})</h3>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700">{item.descripcion || 'N/A'}</span>
                  <span className="font-medium text-gray-900">
                    {item.cantidad || 0} × {formatearMoneda(item.precio_unitario || item.precioUnitario)} Bs
                  </span>
                </div>
              ))}
              {items.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-1">
                  +{items.length - 3} items más
                </div>
              )}
            </div>
          </div>

          {/* Información del descuento - Compacto */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Percent className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-bold text-purple-900">Detalles del Descuento</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white rounded-lg p-2 border border-purple-200">
                <div className="text-xs text-gray-600 mb-0.5">Tipo</div>
                <div className="text-sm font-semibold text-purple-900">
                  {solicitud.tipoDescuento === 'porcentaje' ? 'Porcentaje' : 'Monto Fijo'}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-2 border border-purple-200">
                <div className="text-xs text-gray-600 mb-0.5">Valor</div>
                <div className="text-sm font-semibold text-purple-900">
                  {solicitud.tipoDescuento === 'porcentaje' 
                    ? `${solicitud.porcentajeDescuento || 0}%`
                    : `${formatearMoneda(solicitud.montoDescuento)} ${solicitud.monedaDescuento?.toUpperCase() || 'BS'}`
                  }
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-purple-200 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Total Venta:</span>
                <span className="font-medium text-gray-900">
                  {formatearMoneda(solicitud.totalVenta)} Bs
                </span>
              </div>
              <div className="flex justify-between text-xs text-red-600">
                <span>Descuento:</span>
                <span className="font-medium">
                  -{formatearMoneda(solicitud.montoDescuento)} Bs
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1.5 border-t border-purple-200">
                <span className="text-purple-900">Total a Pagar:</span>
                <span className="text-purple-900">
                  {formatearMoneda(solicitud.totalConDescuento)} Bs
                </span>
              </div>
            </div>

            <div className="mt-3 bg-white rounded-lg p-2 border border-purple-200">
              <div className="text-xs text-gray-600 mb-1">Motivo</div>
              <div className="text-xs text-gray-900 font-medium">{solicitud.motivo || 'Sin motivo especificado'}</div>
            </div>
          </div>

          {/* Motivo de rechazo (si está rechazando) */}
          {mostrarRechazo && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <label className="block text-xs font-semibold text-red-900 mb-2">
                Motivo de Rechazo *
              </label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Explica por qué se rechaza el descuento..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
          )}
        </div>

        {/* Footer con botones de acción - Compacto */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
          {!mostrarRechazo ? (
            <>
              <button
                onClick={() => setMostrarRechazo(true)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
              >
                <XCircle className="h-4 w-4" />
                <span>Rechazar</span>
              </button>
              <button
                onClick={handleAprobar}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Aprobar</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMostrarRechazo(false)}
                className="px-4 py-2 text-sm text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={loading || !motivoRechazo.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>Confirmar Rechazo</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DescuentoAprobacionModal;

