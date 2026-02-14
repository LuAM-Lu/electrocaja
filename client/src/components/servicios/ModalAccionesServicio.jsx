// client/src/components/servicios/ModalAccionesServicio.jsx
// Modal que muestra opciones de acción después de crear un servicio
import React, { useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Printer from 'lucide-react/dist/esm/icons/printer'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import { FaWhatsapp } from 'react-icons/fa';
import toast from '../../utils/toast.jsx';
import { imprimirTicketServicio } from '../../utils/printUtils.js';
import { api } from '../../config/api';

export default function ModalAccionesServicio({ 
  isOpen, 
  onClose, 
  servicio 
}) {
  const [loading, setLoading] = useState(false);
  const [accionRealizada, setAccionRealizada] = useState(null);

  if (!isOpen || !servicio) return null;

  const handleImprimir = async () => {
    try {
      setLoading(true);
      setAccionRealizada('imprimir');
      
      await imprimirTicketServicio(
        servicio,
        { nombre: servicio.usuarioCreador || 'Sistema' },
        servicio.linkSeguimiento,
        servicio.qrCode
      );
      
      toast.success('Ticket impreso exitosamente');
    } catch (error) {
      console.error('Error imprimiendo:', error);
      toast.error('Error al imprimir: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarWhatsApp = async () => {
    try {
      setLoading(true);
      setAccionRealizada('whatsapp');
      
      // Verificar estado de WhatsApp primero
      const estadoResponse = await api.get('/whatsapp/estado');
      const estadoWhatsApp = estadoResponse.data?.data || estadoResponse.data;
      
      
      if (!estadoWhatsApp || !estadoWhatsApp.conectado) {
        toast.error('WhatsApp no está conectado. Por favor, conecta WhatsApp primero desde la configuración.');
        return;
      }

      // Enviar WhatsApp
      const response = await api.post('/whatsapp/enviar-servicio', {
        servicioId: servicio.id,
        numero: servicio.clienteTelefono
      });

      if (response.data.success) {
        toast.success('Mensaje de WhatsApp enviado exitosamente');
      } else {
        throw new Error(response.data.message || 'Error enviando WhatsApp');
      }
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      toast.error('Error al enviar WhatsApp: ' + (error.response?.data?.message || error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    if (accionRealizada) {
      toast.success('Servicio creado exitosamente');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-green-800 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Orden Creada</h2>
                <p className="text-emerald-100 text-sm">#{servicio.numeroServicio}</p>
              </div>
            </div>
            <button
              onClick={handleCerrar}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <p className="text-gray-300 mb-6 text-center">
            ¿Qué deseas hacer ahora?
          </p>

          <div className="space-y-3">
            {/* Botón Imprimir */}
            <button
              onClick={handleImprimir}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 hover:border-blue-400 text-blue-300 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={20} />
              <span className="font-semibold">
                {loading && accionRealizada === 'imprimir' ? 'Imprimiendo...' : 'Imprimir Ticket'}
              </span>
            </button>

            {/* Botón WhatsApp */}
            <button
              onClick={handleEnviarWhatsApp}
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 hover:border-green-400 text-green-300 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaWhatsapp size={20} />
              <span className="font-semibold">
                {loading && accionRealizada === 'whatsapp' ? 'Enviando...' : 'Enviar por WhatsApp'}
              </span>
            </button>

            {/* Botón Cerrar */}
            <button
              onClick={handleCerrar}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600 text-gray-300 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cerrar
            </button>
          </div>

          {/* Info adicional */}
          {servicio.linkSeguimiento && (
            <div className="mt-6 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
              <p className="text-xs text-gray-400 mb-1">Link de seguimiento:</p>
              <p className="text-xs text-emerald-400 break-all font-mono">
                {servicio.linkSeguimiento}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

