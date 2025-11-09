// components/servicios/BorrarServicioModal.jsx (SOLO ADMIN - ESTILO ELECTRO CAJA)
import React, { useState } from 'react';
import {
  X, Trash2, AlertTriangle, Shield, Lock, Key, Eye, EyeOff
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';

export default function BorrarServicioModal({ servicio, onClose, onConfirmar }) {
  const { usuario } = useAuthStore();
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Verificación admin, 2: Confirmación final

  // Solo admins pueden acceder
  if (usuario?.rol !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[70]">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h3>
            <p className="text-gray-600 mb-6">Solo los administradores pueden eliminar servicios.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!servicio) return null;

  const verificarAdmin = async () => {
    if (!adminPassword.trim()) {
      toast.error('Ingresa tu contraseña de administrador');
      return;
    }

    setLoading(true);
    try {
      // Simular verificación de contraseña admin
      // En producción, esto debería ser una llamada a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulación - en producción verificar contra backend
      if (adminPassword === 'admin123') { // Cambiar por verificación real
        setStep(2);
        toast.success('Verificación exitosa');
      } else {
        toast.error('Contraseña incorrecta');
      }
    } catch (error) {
      toast.error('Error en la verificación');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (confirmText !== `ELIMINAR-${servicio.id}`) {
      toast.error('El texto de confirmación no coincide');
      return;
    }

    setLoading(true);
    try {
      // Simular eliminación
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (typeof onConfirmar === 'function') {
        onConfirmar(servicio.id);
      }
      
      toast.success('Servicio eliminado permanentemente');
      onClose?.();
    } catch (error) {
      toast.error('Error al eliminar el servicio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/*  HEADER PELIGROSO */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-700 to-red-800 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpolygon points='30 10 50 50 10 50'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>

          <div className="relative px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Eliminar Servicio</h1>
                  <p className="text-red-100 text-sm">
                    Orden #{servicio.id} • Acción irreversible
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/*  CONTENIDO */}
        <div className="p-6">

          {step === 1 ? (
            /* PASO 1: Verificación de administrador */
            <div className="space-y-6">
              
              {/* Advertencia */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 mb-1"> Acción Peligrosa</h3>
                    <p className="text-red-700 text-sm">
                      Estás a punto de eliminar permanentemente este servicio. 
                      Esta acción <strong>no se puede deshacer</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalles del servicio */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Servicio a eliminar:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{servicio.cliente}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dispositivo:</span>
                    <span className="font-medium">{servicio.dispositivo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className="font-medium">{servicio.estado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-green-600">{servicio.total}</span>
                  </div>
                </div>
              </div>

              {/* Verificación de contraseña admin */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">
                  <Key className="h-4 w-4 inline mr-2" />
                  Contraseña de Administrador
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ingresa tu contraseña de admin..."
                    onKeyPress={(e) => e.key === 'Enter' && verificarAdmin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Se requiere verificación de identidad para eliminar servicios
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={verificarAdmin}
                  disabled={loading || !adminPassword.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Shield size={16} />
                      Verificar
                    </>
                  )}
                </button>
              </div>
            </div>

          ) : (
            /* PASO 2: Confirmación final */
            <div className="space-y-6">
              
              {/* Confirmación final */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                <h3 className="font-bold text-red-900 mb-2"> Confirmación Final</h3>
                <p className="text-red-700 text-sm">
                  Esta acción eliminará permanentemente el servicio y todos sus datos asociados.
                  <br /><strong>No podrás recuperar esta información.</strong>
                </p>
              </div>

              {/* Campo de confirmación */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">
                  Para confirmar, escribe: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-red-600">ELIMINAR-{servicio.id}</code>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                  placeholder={`ELIMINAR-${servicio.id}`}
                />
              </div>

              {/* Botones finales */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ← Volver
                </button>
                <button
                  onClick={confirmarEliminacion}
                  disabled={loading || confirmText !== `ELIMINAR-${servicio.id}`}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Eliminar Definitivamente
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}