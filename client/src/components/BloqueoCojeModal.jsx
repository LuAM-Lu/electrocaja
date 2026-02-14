// components/BloqueoCojeModal.jsx
import React, { useState } from 'react';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Lock from 'lucide-react/dist/esm/icons/lock'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import User from 'lucide-react/dist/esm/icons/user'
import Shield from 'lucide-react/dist/esm/icons/shield'
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import toast from '../utils/toast.jsx';
import CerrarCajaModal from './CerrarCajaModal';
import ConteoDirectoModal from './ConteoDirectoModal';

const BloqueoCojeModal = ({ cajaPendiente, esResponsable }) => {
  const [showCerrarCajaModal, setShowCerrarCajaModal] = useState(false);
  const { usuario } = useAuthStore();

 const handleRealizarConteo = () => {
  if (!esResponsable && usuario?.rol?.toLowerCase() !== 'admin') {
    toast.error('Solo el responsable o un administrador pueden realizar el conteo');
    return;
  }
  setShowCerrarCajaModal(true);
};

  const handleCierreCompleto = async (cajaResuelta) => {
    console.log(' Caja pendiente resuelta localmente:', cajaResuelta);
    
    try {
      // Usar la función del cajaStore para resolver
      const { resolverCajaPendiente } = useCajaStore.getState();
      
      if (cajaResuelta && cajaResuelta.id) {
        await resolverCajaPendiente(cajaResuelta.id, {
          montoFinalBs: cajaResuelta.monto_final_bs,
          montoFinalUsd: cajaResuelta.monto_final_usd,
          montoFinalPagoMovil: cajaResuelta.monto_final_pago_movil,
          observacionesCierre: cajaResuelta.observaciones_cierre || 'Caja pendiente resuelta'
        });
      }
      
      // Limpiar estado de bloqueo
      useAuthStore.setState({
        cajaPendienteCierre: null,
        sistemaBloquedadoPorCaja: false
      });
      
      setShowCerrarCajaModal(false);
      
      toast.success('Caja pendiente resuelta exitosamente');
      
    } catch (error) {
      console.error(' Error resolviendo caja pendiente:', error);
      toast.error('Error al resolver caja pendiente: ' + error.message);
    }
  };

  if (!cajaPendiente) return null;

  return (
    <>
      {/* Overlay que bloquea toda la pantalla */}
      <div className="fixed inset-0 bg-red-500/40 backdrop-blur-md z-[100] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border-4 border-red-500">
          
          {/* Header crítico */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-xl">
            <div className="flex items-center space-x-3 text-white">
              <AlertTriangle className="h-8 w-8 animate-pulse" />
              <div>
                <h2 className="text-xl font-bold"> Sistema Bloqueado</h2>
                <p className="text-sm text-red-100">Cierre de caja pendiente</p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Lock className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">Acceso Restringido</span>
              </div>
              
              <div className="space-y-2 text-sm text-red-700">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Caja abierta el: <strong>{cajaPendiente.fecha}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Responsable: <strong>{cajaPendiente.usuarioResponsable}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="text-lg font-bold text-gray-900 mb-2">
                Se requiere conteo físico para continuar
              </div>
              <div className="text-sm text-gray-600">
                {esResponsable 
                  ? 'Usted abrió esta caja y debe realizar el conteo físico'
                  : 'Solo el responsable o un administrador puede realizar el conteo'
                }
              </div>
            </div>

            {/* Botón obligatorio */}
            <div className="space-y-3">
              <button
                onClick={handleRealizarConteo}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold flex items-center justify-center space-x-2"
              >
                <Shield className="h-5 w-5" />
                <span>Realizar Conteo Físico Ahora</span>
              </button>

              <div className="text-center text-xs text-gray-500">
                <p> No se puede cancelar esta operación</p>
                <p>El sistema permanecerá bloqueado hasta completar el conteo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de conteo directo */}
      {showCerrarCajaModal && (
        <ConteoDirectoModal
          cajaPendiente={cajaPendiente}
          onClose={() => setShowCerrarCajaModal(false)}
          onComplete={handleCierreCompleto}
        />
      )}
    </>
  );
};

export default BloqueoCojeModal;