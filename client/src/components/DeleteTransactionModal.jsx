// components/DeleteTransactionModal.jsx (ACTUALIZADO CON TOKEN ADMIN Y SOFT-DELETE)
import React, { useState } from 'react';
import { X, AlertTriangle, Package, ArrowLeft, TrendingUp, TrendingDown, Shield, Key, ScanLine } from 'lucide-react';
import { useInventarioStore } from '../store/inventarioStore';
import { useAuthStore } from '../store/authStore';
import { useTransactionTable } from '../store/cajaStore';
import toast from '../utils/toast.jsx';
import { api } from '../config/api';

const DeleteTransactionModal = ({ isOpen, onClose, transaccion, onConfirm }) => {
  const { usuario } = useAuthStore();
  const { cargarCajaActual } = useTransactionTable();
  const [adminToken, setAdminToken] = useState('');
  const [motivoEliminacion, setMotivoEliminacion] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Verificación admin, 2: Confirmación final
  const [adminVerificado, setAdminVerificado] = useState(null);
  const { aumentarStock } = useInventarioStore();

  // Primero verificar si el modal está abierto
  if (!isOpen || !transaccion) return null;

  // Luego verificar permisos solo si el modal está abierto
  if (usuario?.rol !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h3>
            <p className="text-gray-600 mb-6">Solo los administradores pueden eliminar transacciones.</p>
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

  // Función: Formatear bolívares redondeados
  const formatBolivares = (amount) => {
    return Math.round(amount).toLocaleString('es-VE');
  };

  // Función: Obtener icono del inventario
  const getInventarioIcon = (tipo) => {
    switch(tipo) {
      case 'producto': return '';
      case 'servicio': return '';
      case 'electrobar': return '';
      default: return '';
    }
  };

  const verificarAdmin = async () => {
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
    if (confirmText !== `ELIMINAR-${transaccion.id}`) {
      toast.error('El texto de confirmación no coincide');
      return;
    }

    if (!motivoEliminacion.trim() || motivoEliminacion.trim().length < 10) {
      toast.error('Debe proporcionar un motivo de eliminación (mínimo 10 caracteres)');
      return;
    }

    setLoading(true);
    try {
      // Si la transacción tiene item del inventario, devolver stock
      if (transaccion.item_inventario && 
          (transaccion.item_inventario.tipo === 'producto' || transaccion.item_inventario.tipo === 'electrobar') &&
          transaccion.tipo === 'ingreso') {
        
        const cantidad = transaccion.item_inventario.cantidad;
        
        try {
          await aumentarStock(transaccion.item_inventario.id, cantidad);
          toast.success(`Stock devuelto: +${cantidad} ${transaccion.item_inventario.descripcion}`);
        } catch (stockError) {
          toast.warning(`No se pudo devolver el stock: ${stockError.message}`);
        }
      }

      // Eliminar la transacción con motivo y token
      const response = await api.delete(`/caja/transacciones/${transaccion.id}`, {
        data: {
          motivoEliminacion: motivoEliminacion.trim(),
          adminToken: adminToken.toUpperCase().trim()
        }
      });

      if (response.data.success) {
        toast.success('Transacción eliminada correctamente');
        
        // Cerrar modal primero
        onClose();
        
        // Recargar la caja actual para actualizar la lista
        await cargarCajaActual();
        
        // Llamar al callback si existe (para cualquier acción adicional)
        if (typeof onConfirm === 'function') {
          onConfirm(transaccion.id);
        }
        
        // Limpiar estados
        setAdminToken('');
        setMotivoEliminacion('');
        setConfirmText('');
        setStep(1);
        setAdminVerificado(null);
      }
    } catch (error) {
      console.error('Error eliminando transacción:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdminToken('');
    setMotivoEliminacion('');
    setConfirmText('');
    setStep(1);
    setAdminVerificado(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header Peligroso */}
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
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Eliminar Transacción</h1>
                  <p className="text-red-100 text-sm">
                    ID #{transaccion.id} • Acción irreversible
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">

          {step === 1 ? (
            /* PASO 1: Verificación de administrador */
            <div className="space-y-6">
              
              {/* Advertencia */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 mb-1">Acción Peligrosa</h3>
                    <p className="text-red-700 text-sm">
                      Estás a punto de eliminar permanentemente esta transacción. 
                      Esta acción <strong>no se puede deshacer</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Alerta de inventario si aplica */}
              {transaccion.item_inventario && 
               (transaccion.item_inventario.tipo === 'producto' || transaccion.item_inventario.tipo === 'electrobar') &&
               transaccion.tipo === 'ingreso' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Stock del Inventario</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getInventarioIcon(transaccion.item_inventario.tipo)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaccion.item_inventario.descripcion}
                        </div>
                        <div className="text-xs text-gray-600">
                          ID: #{transaccion.item_inventario.id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-sm text-orange-700 font-medium">
                        <ArrowLeft className="h-3 w-3" />
                        <span>+{transaccion.item_inventario.cantidad}</span>
                      </div>
                      <div className="text-xs text-orange-600">
                        Se devolverá al stock
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Información de la transacción */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Transacción a eliminar:</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-mono font-medium">#{transaccion.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha:</span>
                      <span className="font-medium">{new Date(transaccion.fecha_hora || transaccion.fechaHora).toLocaleDateString('es-VE')}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center border-t pt-2">
                    <div className="flex items-center space-x-2">
                      {transaccion.tipo === 'ingreso' || transaccion.tipo === 'INGRESO' ? (
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-xs text-gray-600">Categoría:</span>
                    </div>
                    <span className="font-medium text-sm truncate ml-2 max-w-[180px]">{transaccion.categoria}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Monto:</span>
                    <span className={`font-bold text-sm ${
                      transaccion.tipo === 'ingreso' || transaccion.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {transaccion.tipo === 'ingreso' || transaccion.tipo === 'INGRESO' ? '+' : '-'}{formatBolivares(transaccion.total_bs || transaccion.totalBs)} Bs
                    </span>
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
                  onClick={handleClose}
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
                <h3 className="font-bold text-red-900 mb-2">Confirmación Final</h3>
                <p className="text-red-700 text-sm">
                  Esta acción marcará la transacción como eliminada (soft-delete).
                  <br />La transacción quedará oculta pero los datos se conservarán para auditoría.
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
                  placeholder="Describe el motivo por el cual se está eliminando esta transacción (mínimo 10 caracteres)..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  {motivoEliminacion.length}/10 caracteres mínimos
                </p>
              </div>

              {/* Campo de confirmación */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">
                  Para confirmar, escribe: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-red-600">ELIMINAR-{transaccion.id}</code>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                  placeholder={`ELIMINAR-${transaccion.id}`}
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
                  disabled={loading || confirmText !== `ELIMINAR-${transaccion.id}` || !motivoEliminacion.trim() || motivoEliminacion.trim().length < 10}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      Eliminar Transacción
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
};

export default DeleteTransactionModal;