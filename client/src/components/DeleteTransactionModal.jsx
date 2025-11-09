// components/DeleteTransactionModal.jsx (ACTUALIZADO CON INVENTARIO)
import React, { useState } from 'react';
import { X, AlertTriangle, Package, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { useInventarioStore } from '../store/inventarioStore'; //  NUEVO
import toast from '../utils/toast.jsx';

const DeleteTransactionModal = ({ isOpen, onClose, transaccion, onConfirm }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { aumentarStock } = useInventarioStore(); //  INTEGRACIÓN

  if (!isOpen || !transaccion) return null;

  //  NUEVA FUNCIÓN: Formatear bolívares redondeados
  const formatBolivares = (amount) => {
    return Math.round(amount).toLocaleString('es-VE');
  };

  //  NUEVA FUNCIÓN: Obtener icono del inventario
  const getInventarioIcon = (tipo) => {
    switch(tipo) {
      case 'producto': return '';
      case 'servicio': return '';
      case 'electrobar': return ''; //  COTUFAS
      default: return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== '1234') {
      toast.error('Clave incorrecta');
      return;
    }

    setLoading(true);
    try {
      //  NUEVO: Si la transacción tiene item del inventario, devolver stock
      if (transaccion.item_inventario && 
          (transaccion.item_inventario.tipo === 'producto' || transaccion.item_inventario.tipo === 'electrobar') &&
          transaccion.tipo === 'ingreso') { // Solo para ingresos (ventas)
        
        const cantidad = transaccion.item_inventario.cantidad;
        
        try {
          await aumentarStock(transaccion.item_inventario.id, cantidad);
          
          // Mensaje específico para electrobar
          if (transaccion.item_inventario.tipo === 'electrobar') {
            toast.success(`Stock devuelto: +${cantidad} ${transaccion.item_inventario.descripcion}`);
          } else {
            toast.success(`Stock devuelto: +${cantidad} ${transaccion.item_inventario.descripcion}`);
          }
        } catch (stockError) {
          toast.warning(`Transacción eliminada, pero no se pudo devolver el stock: ${stockError.message}`);
        }
      }

      // Eliminar la transacción
      await onConfirm(transaccion.id);
      toast.success('Transacción eliminada correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al eliminar la transacción');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        
        {/* Header Compacto */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="text-base font-bold">Eliminar Transacción</h3>
                <p className="text-red-100 text-xs">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          {/*  NUEVA SECCIÓN: Alerta de inventario si aplica */}
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

          {/* Información de la transacción ACTUALIZADA */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs text-red-800 mb-2 font-medium">
              Transacción a eliminar:
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-mono font-medium">#{transaccion.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{new Date(transaccion.fecha_hora).toLocaleDateString('es-VE')}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center border-t pt-2">
                <div className="flex items-center space-x-2">
                  {transaccion.tipo === 'ingreso' ? (
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
                  transaccion.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {transaccion.tipo === 'ingreso' ? '+' : '-'}{formatBolivares(transaccion.total_bs)} Bs {/*  REDONDEADO */}
                </span>
              </div>

              {/*  NUEVO: Mostrar cantidad si viene del inventario */}
              {transaccion.item_inventario && (
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-xs text-gray-600">Cantidad:</span>
                  <span className="font-medium text-sm">
                    {transaccion.item_inventario.cantidad} × ${transaccion.item_inventario.precio_unitario.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Campo de clave */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingresa la clave de seguridad
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-center text-sm"
              required
              maxLength={10}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Contacta al administrador si no conoces la clave
            </p>
          </div>

          {/*  NUEVA SECCIÓN: Advertencia adicional si hay inventario */}
          {transaccion.item_inventario && 
           (transaccion.item_inventario.tipo === 'producto' || transaccion.item_inventario.tipo === 'electrobar') &&
           transaccion.tipo === 'ingreso' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-yellow-800">Importante</div>
                  <div className="text-xs text-yellow-700 mt-1">
                    Al eliminar esta venta, el stock de "{transaccion.item_inventario.descripcion}" 
                    será devuelto automáticamente al inventario (+{transaccion.item_inventario.cantidad} unidades).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  <span>Eliminar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteTransactionModal;