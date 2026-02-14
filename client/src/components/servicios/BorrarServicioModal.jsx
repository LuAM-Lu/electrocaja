// components/servicios/BorrarServicioModal.jsx (SOLO ADMIN - ESTILO ELECTRO CAJA)
import React, { useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Key from 'lucide-react/dist/esm/icons/key'
import ScanLine from 'lucide-react/dist/esm/icons/scan-line'
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';
import { api } from '../../config/api';

export default function BorrarServicioModal({ servicio, onClose, onConfirmar }) {
  const { usuario } = useAuthStore();
  const [adminToken, setAdminToken] = useState('');
  const [motivoEliminacion, setMotivoEliminacion] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Verificación admin, 2: Confirmación final
  const [adminVerificado, setAdminVerificado] = useState(null);

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
    if (!adminToken.trim()) {
      toast.error('Ingresa el token de acceso rápido de un administrador');
      return;
    }

    setLoading(true);
    try {
      // ✅ Validar token de admin usando el endpoint existente
      const response = await api.post('/auth/validate-admin-token', {
        token: adminToken.toUpperCase().trim()
      });

      if (response.data.success && response.data.user) {
        const adminUser = response.data.user;
        
        if (adminUser.rol === 'admin') {
          setAdminVerificado(adminUser);
          setStep(2);
          toast.success(`Token verificado: ${adminUser.nombre}`);
        } else {
          toast.error('El token no pertenece a un administrador');
        }
      } else {
        toast.error('Token de administrador inválido');
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      toast.error(error.response?.data?.message || 'Error al verificar el token');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (confirmText !== `ELIMINAR-${servicio.id}`) {
      toast.error('El texto de confirmación no coincide');
      return;
    }

    if (!motivoEliminacion.trim() || motivoEliminacion.trim().length < 10) {
      toast.error('Debe proporcionar un motivo de eliminación (mínimo 10 caracteres)');
      return;
    }

    setLoading(true);
    try {
      // ✅ Llamar al endpoint de eliminación con motivo y token
      const response = await api.delete(`/servicios/${servicio.id}`, {
        data: {
          motivoEliminacion: motivoEliminacion.trim(),
          adminToken: adminToken.toUpperCase().trim()
        }
      });
      
      if (response.data.success) {
        toast.success('Servicio eliminado exitosamente');
        
        // Cerrar modal primero
        onClose?.();
        
        // Luego llamar al callback si existe (para recargar la lista)
        if (typeof onConfirmar === 'function') {
          // Pasar los parámetros necesarios si el callback los necesita
          onConfirmar(servicio.id, motivoEliminacion.trim(), adminToken.toUpperCase().trim());
        }
      }
    } catch (error) {
      console.error('Error eliminando servicio:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar el servicio');
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
                    Orden #{servicio.numeroServicio || servicio.id} • Acción irreversible
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

              {/* Verificación de token de acceso rápido de admin */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">
                  <Key className="h-4 w-4 inline mr-2" />
                  Token de Acceso Rápido (Admin)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={adminToken}
                    onChange={(e) => {
                      // Normalizar: convertir a mayúsculas y eliminar espacios
                      const valorNormalizado = e.target.value.toUpperCase().trim().replace(/\s+/g, '');
                      setAdminToken(valorNormalizado);
                    }}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-lg tracking-wider"
                    placeholder="Escanea o ingresa el código..."
                    onKeyPress={(e) => e.key === 'Enter' && verificarAdmin()}
                    autoFocus
                  />
                  <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <p className="text-xs text-gray-500">
                  Escanea el código QR de acceso rápido de cualquier administrador para autorizar esta acción
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
                  disabled={loading || !adminToken.trim()}
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
                      Verificar Token
                    </>
                  )}
                </button>
              </div>
            </div>

          ) : (
            /* PASO 2: Confirmación final */
            <div className="space-y-6">
              
              {/* Admin verificado */}
              {adminVerificado && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Token verificado</p>
                      <p className="text-xs text-green-700">{adminVerificado.nombre} ({adminVerificado.email})</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmación final */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                <h3 className="font-bold text-red-900 mb-2"> Confirmación Final</h3>
                <p className="text-red-700 text-sm">
                  Esta acción marcará el servicio como eliminado (soft-delete).
                  <br />El servicio quedará oculto pero los datos se conservarán para auditoría.
                </p>
              </div>

              {/* Campo de motivo de eliminación */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">
                  Motivo de Eliminación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivoEliminacion}
                  onChange={(e) => setMotivoEliminacion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  placeholder="Describe el motivo por el cual se está eliminando este servicio (mínimo 10 caracteres)..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  {motivoEliminacion.length}/10 caracteres mínimos
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
                  disabled={loading || confirmText !== `ELIMINAR-${servicio.id}` || !motivoEliminacion.trim() || motivoEliminacion.trim().length < 10}
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
                      Eliminar Servicio
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