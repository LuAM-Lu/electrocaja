// components/servicios/ModalConfirmarEntrega.jsx
import React, { useState } from 'react';
import { X, Truck, User, AlertTriangle, CheckCircle, UserCheck } from 'lucide-react';
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';

export default function ModalConfirmarEntrega({ servicio, isOpen, onClose, onEntregaCompletada }) {
  const [loading, setLoading] = useState(false);
  const [esDiferente, setEsDiferente] = useState(false);
  const [nombreRetiro, setNombreRetiro] = useState('');
  const [cedulaRetiro, setCedulaRetiro] = useState('');

  if (!isOpen || !servicio) return null;

  const handleConfirmar = async () => {
    // Validar si es diferente y no tiene datos
    if (esDiferente && (!nombreRetiro.trim() || !cedulaRetiro.trim())) {
      toast.error('Debes ingresar el nombre y cédula de la persona que retira');
      return;
    }

    setLoading(true);

    try {
      const datosRetiro = esDiferente ? {
        esDiferente: true,
        nombreRetiro: nombreRetiro.trim(),
        cedulaRetiro: cedulaRetiro.trim()
      } : {
        esDiferente: false
      };

      const response = await api.post(`/servicios/${servicio.id}/entregar`, {
        datosRetiro
      });

      if (response.data.success) {
        toast.success('✅ Dispositivo entregado exitosamente');
        
        if (onEntregaCompletada) {
          onEntregaCompletada(response.data.data);
        }
        
        onClose();
      } else {
        throw new Error(response.data.message || 'Error al entregar el dispositivo');
      }
    } catch (error) {
      console.error('Error entregando dispositivo:', error);
      toast.error(error.response?.data?.message || error.message || 'Error al entregar el dispositivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-modal-backdrop-enter">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden border border-gray-700 shadow-2xl animate-modal-enter">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Finalizar Entrega</h2>
                <p className="text-sm text-emerald-100">
                  Orden #{servicio.numeroServicio}
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
        <div className="p-6">
          {/* Información del Cliente */}
          <div className="bg-gray-700/50 rounded-xl p-4 mb-4 border border-gray-600">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-gray-400 text-xs mb-1">Cliente del Ticket</div>
                <div className="text-white font-semibold">{servicio.clienteNombre}</div>
                {servicio.clienteCedulaRif && (
                  <div className="text-gray-400 text-sm mt-1">Cédula/RIF: {servicio.clienteCedulaRif}</div>
                )}
              </div>
            </div>
          </div>

          {/* Pregunta si quien retira es diferente */}
          <div className="mb-4">
            <label className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-xl border border-gray-600 cursor-pointer hover:bg-gray-700/70 transition-colors">
              <input
                type="checkbox"
                checked={esDiferente}
                onChange={(e) => setEsDiferente(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 focus:ring-2"
                disabled={loading}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-white font-medium">¿Quien retira es diferente al cliente del ticket?</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Marca esta opción si otra persona retira el equipo
                </p>
              </div>
            </label>
          </div>

          {/* Campos para datos de quien retira (si es diferente) */}
          {esDiferente && (
            <div className="space-y-3 mb-4 animate-fadeIn">
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-200 text-xs">
                    Ingresa los datos de la persona que está retirando el equipo. Esta información será registrada y notificada al cliente.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre Completo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nombreRetiro}
                  onChange={(e) => setNombreRetiro(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cédula <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={cedulaRetiro}
                  onChange={(e) => setCedulaRetiro(e.target.value)}
                  placeholder="Ej: V-12345678"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-emerald-200 text-xs">
                <p className="font-medium mb-1">Al confirmar:</p>
                <ul className="list-disc list-inside space-y-1 text-emerald-300/80">
                  <li>El servicio se marcará como ENTREGADO</li>
                  <li>Se enviará un mensaje de WhatsApp al cliente</li>
                  {esDiferente && (
                    <li>Se notificará que el equipo fue retirado por otra persona</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
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
            disabled={loading || (esDiferente && (!nombreRetiro.trim() || !cedulaRetiro.trim()))}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4" />
                Confirmar Entrega
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

