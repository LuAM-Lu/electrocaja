import React from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import { FaWhatsapp } from 'react-icons/fa';

const ModalConfirmarWhatsApp = ({ isOpen, onClose, onConfirmar, clienteNombre, numeroServicio }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-600/20 p-2 rounded-lg">
                <FaWhatsapp className="h-5 w-5 text-green-400" />
              </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Enviar por WhatsApp</h3>
              <p className="text-xs text-gray-400">Confirmar envío de orden al cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3 bg-blue-600/10 border border-blue-600/30 rounded-lg p-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-200 font-medium mb-1">¿Enviar orden de servicio por WhatsApp?</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p><span className="font-medium text-gray-300">Cliente:</span> {clienteNombre}</p>
                <p><span className="font-medium text-gray-300">Orden:</span> #{numeroServicio}</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-400">
            Se enviará un mensaje con los detalles de la orden y el código QR para seguimiento.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirmar();
              onClose();
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <FaWhatsapp className="h-4 w-4" />
            Sí, Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmarWhatsApp;

