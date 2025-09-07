// components/BorrarUserModal.jsx
import React, { useState } from 'react';
import { AlertTriangle, Shield, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BorrarUserModal = ({ isOpen, usuario, onConfirm, onCancel }) => {
  const [clave, setClave] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (clave !== '1234') {
      setError('Clave de administrador incorrecta');
      setClave('');
      return;
    }

    if (confirmText !== 'BORRAR') {
      setError('Debes escribir exactamente "BORRAR" en mayúsculas');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      onConfirm();
      handleClose();
      setLoading(false);
    }, 500);
  };

  const handleClose = () => {
    if (loading) return;
    setClave('');
    setConfirmText('');
    setError('');
    onCancel();
  };

  if (!isOpen || !usuario) return null;

  const isFormValid = clave === '1234' && confirmText === 'BORRAR';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        
        {/* Header de Advertencia */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-xl">
          <div className="flex items-center space-x-3 text-white">
            <div className="bg-white/20 p-2 rounded-lg">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">⚠️ Confirmar Eliminación</h3>
              <p className="text-sm text-red-100">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {/* Información del Usuario */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {usuario.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-bold text-red-900">{usuario.nombre}</div>
                <div className="text-sm text-red-700">{usuario.email}</div>
                <div className="text-xs text-red-600">{usuario.rol.toUpperCase()} • {usuario.sucursal}</div>
              </div>
            </div>
            
            <div className="text-sm text-red-800 space-y-1">
              <p><strong>⚠️ ADVERTENCIA:</strong> Al borrar este usuario:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                <li>Se eliminará permanentemente del sistema</li>
                <li>No podrá recuperarse esta información</li>
                <li>Sus transacciones pasadas quedarán sin autor</li>
                <li>Se perderá la trazabilidad contable</li>
              </ul>
            </div>
          </div>

          {/* Recomendación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Recomendación</span>
            </div>
            <div className="text-xs text-blue-700">
              En lugar de borrar, considera <strong>desactivar</strong> al usuario para mantener la trazabilidad.
            </div>
          </div>

          {/* Formulario de Confirmación */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Clave de Administrador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave de administrador:
              </label>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Ingresa la clave..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  error && error.includes('clave') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            {/* Confirmación de Texto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para confirmar, escribe exactamente: <span className="font-bold text-red-600">BORRAR</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Escribe BORRAR en mayúsculas"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center ${
                  error && error.includes('BORRAR') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Confirmar Borrado</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BorrarUserModal;