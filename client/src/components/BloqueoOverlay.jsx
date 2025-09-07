// components/BloqueoOverlay.jsx (CORREGIDO - NO BLOQUEAR AL QUE CIERRA)
import React from 'react';
import { Shield, Clock, User, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const BloqueoOverlay = ({ usuariosBloqueados, motivoBloqueo, usuarioCerrando }) => {
  const { usuario } = useAuthStore();
  
  // 🔧 NO mostrar overlay si no hay bloqueo
  if (!usuariosBloqueados) return null;
  
  // 🔧 NO mostrar overlay al usuario que está cerrando la caja
  if (usuario?.nombre === usuarioCerrando) {
    console.log('🔧 BloqueoOverlay: NO mostrar a', usuario.nombre, '(está cerrando)');
    return null;
  }
  
  console.log('🔧 BloqueoOverlay: MOSTRAR a', usuario?.nombre, '(no está cerrando)');

  const esBloqueoEspecial = motivoBloqueo.includes('CEO') || motivoBloqueo.includes('Andrés');

  return (
    <div className="fixed inset-0 bg-red-500/20 backdrop-blur-md flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-red-200">
        
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-xl ${
          esBloqueoEspecial 
            ? 'bg-gradient-to-r from-red-600 to-red-700' 
            : 'bg-gradient-to-r from-orange-500 to-orange-600'
        }`}>
          <div className="flex items-center space-x-3 text-white">
            {esBloqueoEspecial ? (
              <Shield className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
            <div>
              <h3 className="text-lg font-bold">
                {esBloqueoEspecial ? 'Autorización Requerida' : 'Sistema Bloqueado'}
              </h3>
              <p className="text-sm opacity-90">
                {esBloqueoEspecial ? 'Esperando CEO' : 'Operación en curso'}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <div className="text-center space-y-4">
            
            {/* Icono animado */}
            <div className="flex justify-center">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  esBloqueoEspecial ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  {esBloqueoEspecial ? (
                    <Shield className={`h-8 w-8 ${esBloqueoEspecial ? 'text-red-600' : 'text-orange-600'}`} />
                  ) : (
                    <Clock className={`h-8 w-8 ${esBloqueoEspecial ? 'text-red-600' : 'text-orange-600'} animate-pulse`} />
                  )}
                </div>
                {!esBloqueoEspecial && (
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200 animate-ping"></div>
                )}
              </div>
            </div>

            {/* Mensaje principal */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {esBloqueoEspecial ? 'Esperando Autorización CEO' : 'Cierre de Caja en Proceso'}
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                {motivoBloqueo}
              </p>
            </div>

            {/* Info del usuario */}
            {usuarioCerrando && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span>Iniciado por: <strong>{usuarioCerrando}</strong></span>
                </div>
              </div>
            )}

            {/* Mensaje especial para CEO */}
            {esBloqueoEspecial && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-800 mb-1">
                    Andrés Morandín
                  </div>
                  <div className="text-sm text-red-600">
                    Se ha detectado una diferencia en caja que requiere tu autorización
                  </div>
                </div>
              </div>
            )}

            {/* Instrucciones */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Todas las acciones están temporalmente bloqueadas</p>
              <p>• Por favor espera a que se complete el proceso</p>
              {esBloqueoEspecial && <p>• Solo el CEO puede autorizar este cierre</p>}
            </div>

            {/* Indicador de espera */}
            <div className="flex justify-center items-center space-x-2 text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span className="text-sm">Esperando...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BloqueoOverlay;