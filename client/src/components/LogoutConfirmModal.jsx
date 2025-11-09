// components/LogoutConfirmModal.jsx
import React, { useEffect } from 'react';
import { LogOut, AlertTriangle, X, User } from 'lucide-react';

const LogoutConfirmModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  hasCajaAbierta = false, 
  userName = 'Usuario' 
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
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Backdrop con glassmorphism */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-lg transition-opacity duration-300"
          onClick={onCancel}
        ></div>
        
        {/* Modal Container */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl transition-all duration-300 scale-100 opacity-100 max-w-md w-full border border-white/20">
          
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 relative overflow-hidden">
            {/* Patrón decorativo de fondo */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <LogOut className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cerrar Sesión</h3>
                  <p className="text-sm text-red-100">Confirma tu decisión</p>
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
            
            {/* Avatar y mensaje principal */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
              
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">
                  ¡Hasta pronto, {userName}!
                </h4>
                <p className="text-gray-600">
                  ¿Estás seguro que quieres cerrar tu sesión?
                </p>
              </div>
            </div>

            {/* Advertencia si hay caja abierta */}
            {hasCajaAbierta && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-100 rounded-full p-2 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-amber-900 mb-1"> Caja Abierta</h5>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      Actualmente tienes una caja abierta. Asegúrate de que esté todo en orden antes de cerrar sesión.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Tu sesión se cerrará:</span>
                  <span className="font-medium text-gray-900">Inmediatamente</span>
                </div>
                <div className="flex justify-between">
                  <span>Datos guardados:</span>
                  <span className="font-medium text-green-600"> Automáticamente</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiempo de sesión:</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleTimeString('es-VE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm border-t border-gray-200/50">
            <div className="flex space-x-3">
              
              {/* Botón Cancelar */}
              <button
                onClick={onCancel}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-300 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancelar
              </button>
              
              {/* Botón Cerrar Sesión */}
              <button
                onClick={onConfirm}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
            
            {/* Texto de ayuda */}
            <p className="text-xs text-gray-500 text-center mt-3">
              Presiona <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">Esc</kbd> para cancelar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;