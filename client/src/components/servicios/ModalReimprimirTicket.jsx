import React from 'react';
import Printer from 'lucide-react/dist/esm/icons/printer'
import X from 'lucide-react/dist/esm/icons/x'
import User from 'lucide-react/dist/esm/icons/user'
import Package from 'lucide-react/dist/esm/icons/package'

const ModalReimprimirTicket = ({ isOpen, onClose, onImprimirCliente, onImprimirInterno }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg">
              <Printer className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Reimprimir Ticket</h3>
              <p className="text-xs text-gray-400">Selecciona el tipo de ticket a imprimir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Opciones */}
        <div className="p-4 space-y-3">
          {/* Ticket Cliente */}
          <button
            onClick={() => {
              onImprimirCliente();
              onClose();
            }}
            className="w-full p-4 bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-2 border-blue-500/50 rounded-lg hover:border-blue-400 hover:from-blue-600/30 hover:to-blue-700/30 transition-all duration-200 flex items-center gap-4 group"
          >
            <div className="bg-blue-600/30 p-3 rounded-lg group-hover:bg-blue-600/40 transition-colors">
              <User className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-100 group-hover:text-white transition-colors">
                Ticket del Cliente
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Incluye QR, información completa y será marcado como "COPIA"
              </div>
            </div>
          </button>

          {/* Ticket Interno */}
          <button
            onClick={() => {
              onImprimirInterno();
              onClose();
            }}
            className="w-full p-4 bg-gradient-to-r from-gray-700/20 to-gray-800/20 border-2 border-gray-600/50 rounded-lg hover:border-gray-500 hover:from-gray-700/30 hover:to-gray-800/30 transition-all duration-200 flex items-center gap-4 group"
          >
            <div className="bg-gray-600/30 p-3 rounded-lg group-hover:bg-gray-600/40 transition-colors">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-100 group-hover:text-white transition-colors">
                Ticket de Uso Interno
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Solo número de orden e información mínima para identificación
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalReimprimirTicket;

