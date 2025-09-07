// components/CajaStatus.jsx (FORMATO TABLA 3 COLUMNAS x 2 FILAS)
import React, { useState } from 'react';
import { Store, DollarSign, Coins, Smartphone, Unlock, Package, AlertTriangle, User, Calendar, Clock, MonitorSmartphone, Wrench, Coffee } from 'lucide-react';
import { useCajaStore } from '../store/cajaStore';
import { useInventarioStore } from '../store/inventarioStore';
import { useAuthStore } from '../store/authStore';
import AbrirCajaModal from './AbrirCajaModal';
import toast from 'react-hot-toast';

const CajaStatus = () => {
  const { cajaActual } = useCajaStore();
  const { obtenerEstadisticas } = useInventarioStore();
  const { tienePermiso, usuario } = useAuthStore();
  const [showAbrirModal, setShowAbrirModal] = useState(false);

  const statsInventario = obtenerEstadisticas();

  const formatearBolivares = (amount) => {
     return (amount || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  };

  const handleAbrirCaja = () => {
    if (!tienePermiso('ABRIR_CAJA')) {
      toast.error('No tienes permisos para abrir la caja');
      return;
    }
    setShowAbrirModal(true);
  };

  // SI NO HAY CAJA ABIERTA
  if (!cajaActual) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header elegante */}
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Estado de Caja</h3>
                  <p className="text-xs text-slate-200">Sistema cerrado</p>
                </div>
              </div>
              
              {/* Stats en header */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white/10 rounded-full px-2 py-1">
                  <Package className="h-3 w-3 text-white" />
                  <span className="text-xs font-medium text-white">{statsInventario.total}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenido: Call to action centrado */}
          <div className="p-4 text-center">
            <p className="text-gray-900 font-medium mb-1">Caja Cerrada</p>
            <p className="text-sm text-gray-500 mb-4">
              {tienePermiso('ABRIR_CAJA') 
                ? 'Inicia las operaciones del día' 
                : 'Esperando que un supervisor abra la caja'
              }
            </p>
            
            <button
              onClick={handleAbrirCaja}
              disabled={!tienePermiso('ABRIR_CAJA')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 mx-auto shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
            >
              <Unlock className="h-4 w-4" />
              <span>
                {tienePermiso('ABRIR_CAJA') ? 'Abrir Caja' : 'Sin Permisos'}
              </span>
            </button>
            
            {!tienePermiso('ABRIR_CAJA') && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center space-x-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium">Acceso Restringido</span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Solo <strong>Supervisores</strong> y <strong>Administradores</strong> pueden abrir la caja.
                  <br />Tu rol actual: <strong>{usuario?.rol?.toUpperCase()}</strong>
                </p>
              </div>
            )}

            {/* Info adicional del usuario */}
            <div className="mt-4 text-xs text-gray-500">
              <div>Usuario: <span className="font-medium">{usuario?.nombre}</span></div>
              <div>Sucursal: <span className="font-medium">{usuario?.sucursal}</span></div>
              <div>Turno: <span className="font-medium">{usuario?.turno}</span></div>
            </div>
          </div>
        </div>

        <AbrirCajaModal 
          isOpen={showAbrirModal}
          onClose={() => setShowAbrirModal(false)}
        />
      </>
    );
  }

  // SI HAY CAJA ABIERTA
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header profesional */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Montos Iniciales</h3>
              <p className="text-xs text-emerald-100">Caja operativa</p>
            </div>
          </div>

          {/* Stock total */}
          <div className="flex items-center space-x-2 bg-white/10 rounded-full px-2 py-1">
            <Package className="h-3 w-3 text-white" />
            <span className="text-xs font-medium text-white">{statsInventario.total}</span>
          </div>
        </div>
      </div>

      {/* Contenido en DOS FILAS */}
      <div className="p-4 space-y-3">
        
        {/* FILA 1: Montos iniciales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200/50 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="bg-blue-500 p-1 rounded shadow-sm">
                <Coins className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-800">Efectivo Bs</span>
            </div>
            <div className="text-sm font-bold text-blue-900">
              {formatearBolivares(cajaActual.monto_inicial_bs)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200/50 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="bg-green-500 p-1 rounded shadow-sm">
                <DollarSign className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-800">Efectivo $</span>
            </div>
            <div className="text-sm font-bold text-green-900">
              ${cajaActual.monto_inicial_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200/50 shadow-sm text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="bg-purple-500 p-1 rounded shadow-sm">
                <Smartphone className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-800">P. Móvil Bs</span>
            </div>
            <div className="text-sm font-bold text-purple-900">
              {formatearBolivares(cajaActual.monto_inicial_pago_movil || 0)}
            </div>
          </div>
        </div>

{/* FILA 2: Dashboard inventario */}
<div className="flex items-center space-x-2">
  {/* Inventario por tipos - NÚMERO AL LADO DEL ICONO */}
  <div className="flex-1 grid grid-cols-3 gap-1.5">

    {/* Servicios */}
    <div className="text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-1.5 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-center space-x-1 mb-0.5">
        <Wrench className="h-4 w-4 text-blue-600" />
        <span className="text-lg font-bold text-blue-600">{statsInventario.servicios}</span>
      </div>
      <div className="text-[10px] text-gray-500">Servicios</div>
    </div>

    {/* Productos */}
    <div className="text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-1.5 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-center space-x-1 mb-0.5">
        <MonitorSmartphone className="h-4 w-4 text-blue-600" />
        <span className="text-lg font-bold text-blue-600">{statsInventario.productos}</span>
      </div>
      <div className="text-[10px] text-gray-500">Productos</div>
    </div>

    {/* Electrobar */}
    <div className="text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-1.5 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-center space-x-1 mb-0.5">
        <Coffee className="h-4 w-4 text-blue-600" />
        <span className="text-lg font-bold text-blue-600">{statsInventario.electrobar}</span>
      </div>
      <div className="text-[10px] text-gray-500">Electrobar</div>
    </div>

  </div>
</div>


        {/* 👈 NUEVA FILA 3: Tabla 3 columnas x 2 filas */}
        <div className="border-t border-gray-100 pt-2">
          <div className="grid grid-cols-3 gap-1 text-xs">
            
            {/* FILA 1: Headers con iconos */}
            <div className="flex items-center space-x-1 text-gray-500">
              <User className="h-3 w-3 text-blue-600" />
              <span>Abierta por:</span>
            </div>
            
            <div className="flex items-center space-x-1 text-gray-500 justify-center">
              <Calendar className="h-3 w-3 text-blue-600" />
              <span>Fecha:</span>
            </div>
            
            <div className="flex items-center space-x-1 text-gray-500 justify-end">
              <Clock className="h-3 w-3 text-blue-600" />
              <span>Hora:</span>
            </div>
            
            {/* FILA 2: Valores */}
            <div className="font-bold text-gray-900">
              {cajaActual.usuario_apertura || usuario?.nombre}
            </div>
            
            <div className="font-bold text-gray-900 text-center">
              {cajaActual.fecha_apertura}
            </div>
            
            <div className="font-bold text-gray-900 text-right">
              {cajaActual.hora_apertura}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CajaStatus;