// components/servicios/TokenAccesoModal.jsx
import React, { useState, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Key from 'lucide-react/dist/esm/icons/key'
import Lock from 'lucide-react/dist/esm/icons/lock'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';
import { api } from '../../config/api';

const TokenAccesoModal = ({ isOpen, onClose, onTokenValidado, accion }) => {
  const { usuario } = useAuthStore();
  const [adminToken, setAdminToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const inputRef = useRef(null);

  // Limpiar token al cerrar
  React.useEffect(() => {
    if (!isOpen) {
      setAdminToken('');
      setLoading(false);
      setShakeError(false);
    }
  }, [isOpen]);

  // Enfocar input cuando se abre el modal
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Obtener colores según la acción
  const getColoresAccion = () => {
    switch(accion) {
      case 'editar':
        return {
          header: 'from-amber-600 to-orange-600',
          button: 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
          alertBg: 'bg-amber-50',
          alertBorder: 'border-amber-200',
          alertIcon: 'text-amber-600',
          alertText: 'text-amber-800',
          focusRing: 'focus:ring-amber-500 focus:border-amber-500'
        };
      case 'historial':
        return {
          header: 'from-purple-600 to-indigo-600',
          button: 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700',
          alertBg: 'bg-purple-50',
          alertBorder: 'border-purple-200',
          alertIcon: 'text-purple-600',
          alertText: 'text-purple-800',
          focusRing: 'focus:ring-purple-500 focus:border-purple-500'
        };
      default:
        return {
          header: 'from-gray-600 to-gray-700',
          button: 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800',
          alertBg: 'bg-gray-50',
          alertBorder: 'border-gray-200',
          alertIcon: 'text-gray-600',
          alertText: 'text-gray-800',
          focusRing: 'focus:ring-gray-500 focus:border-gray-500'
        };
    }
  };

  const colores = getColoresAccion();

  const verificarToken = async () => {
    if (!adminToken.trim()) {
      toast.error('Ingresa el token de acceso rápido de un administrador');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/validate-admin-token', {
        token: adminToken.toUpperCase().trim()
      });

      if (response.data.success && response.data.user) {
        const adminUser = response.data.user;
        
        if (adminUser.rol === 'admin') {
          toast.success(`Token verificado: ${adminUser.nombre}`);
          onTokenValidado(adminUser);
          onClose();
        } else {
          // Token válido pero no es admin
          setShakeError(true);
          setAdminToken('');
          setTimeout(() => {
            setShakeError(false);
            inputRef.current?.focus();
          }, 500);
          toast.error('El token no pertenece a un administrador');
        }
      } else {
        // Token inválido
        setShakeError(true);
        setAdminToken('');
        setTimeout(() => {
          setShakeError(false);
          inputRef.current?.focus();
        }, 500);
        toast.error('Token de administrador inválido');
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      // Error en la validación
      setShakeError(true);
      setAdminToken('');
      setTimeout(() => {
        setShakeError(false);
        inputRef.current?.focus();
      }, 500);
      toast.error(error.response?.data?.message || 'Error al verificar el token');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      verificarToken();
    }
  };

  const getAccionTexto = () => {
    switch(accion) {
      case 'editar':
        return 'editar este servicio';
      case 'historial':
        return 'ver el historial técnico';
      default:
        return 'realizar esta acción';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-700">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colores.header} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Acceso Restringido</h3>
              <p className="text-sm text-white/90">Se requiere autorización de administrador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 bg-gray-800">
          <div className={`${colores.alertBg} ${colores.alertBorder} rounded-lg p-4 flex items-start space-x-3`}>
            <AlertCircle className={`h-5 w-5 ${colores.alertIcon} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <p className={`text-sm ${colores.alertText} font-medium`}>
                Este servicio está en estado finalizado. Para {getAccionTexto()}, necesitas autorización de un administrador.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300">
              Token de Acceso Rápido
            </label>
            <div className="relative flex justify-center">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                maxLength={12}
                className={`w-[240px] pl-11 pr-4 py-3 border-2 rounded-lg ${colores.focusRing} text-lg font-mono tracking-wider text-center bg-gray-700 text-gray-100 ${
                  shakeError ? 'animate-shake border-red-500' : 'border-gray-600'
                }`}
                autoFocus
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-400 text-center">
              Ingresa el token de acceso rápido de un administrador para continuar.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-6 py-4 flex justify-center space-x-3 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 text-gray-300 bg-gray-700 border-2 border-gray-600 rounded-lg hover:bg-gray-600 hover:border-gray-500 transition-all disabled:opacity-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={verificarToken}
            disabled={loading || !adminToken.trim()}
            className={`px-6 py-2 bg-gradient-to-r ${colores.button} text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                <span>Verificar Token</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenAccesoModal;

