import React, { useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'

const ConfirmarEliminarNotaModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  cantidadElementos = 1
}) => {
  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop con glassmorphism */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
          onClick={onCancel}
        ></div>
        
        {/* Modal Container */}
        <div className="relative transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl transition-all duration-300 scale-100 opacity-100 max-w-md w-full">
          
          {/* Header con gradiente rojo */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 relative overflow-hidden">
            {/* Patrón decorativo de fondo */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Eliminar Nota</h3>
                  <p className="text-sm text-red-100">Esta acción no se puede deshacer</p>
                </div>
              </div>
              
              <button
                onClick={onCancel}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="px-6 py-6 space-y-4">
            {/* Mensaje de advertencia */}
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-gray-200 font-medium mb-1">
                  ¿Estás seguro de que deseas eliminar esta nota?
                </p>
                {cantidadElementos > 1 && (
                  <p className="text-sm text-gray-400">
                    Se eliminarán {cantidadElementos} elemento{cantidadElementos > 1 ? 's' : ''} relacionados.
                  </p>
                )}
                <p className="text-sm text-gray-400 mt-2">
                  Esta acción es permanente y no se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          {/* Footer con botones */}
          <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors font-medium border border-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-red-500/25 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEliminarNotaModal;

