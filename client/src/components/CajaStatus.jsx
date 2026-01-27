// components/CajaStatus.jsx (FORMATO TABLA 3 COLUMNAS x 2 FILAS)
import React, { useState } from 'react';
import { Store, DollarSign, Coins, Smartphone, Unlock, Package, AlertTriangle, User, Calendar, Clock, MonitorSmartphone, Wrench, Coffee } from 'lucide-react';
import { FaCashRegister, FaUnlock } from "react-icons/fa";
import { useCajaStore } from '../store/cajaStore';
import { useInventarioStore } from '../store/inventarioStore';
import { useAuthStore } from '../store/authStore';
import AbrirCajaModal from './AbrirCajaModal';
import toast from '../utils/toast.jsx';

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

  // Procesar datos de apertura de forma robusta y SEGURA
  const getDatosApertura = () => {
    if (!cajaActual) return { nombre: '-', fecha: '-', hora: '-' };

    // Función helper para extraer nombre de cualquier cosa (objeto o string)
    const extraerNombre = (valor) => {
      if (!valor) return null;
      if (typeof valor === 'string') return valor;
      if (typeof valor === 'object') {
        // Si es objeto, intentar propiedades comunes
        return valor.nombre || valor.name || valor.usuario || 'Usuario';
      }
      return String(valor);
    };

    // Intentar obtener el nombre de varias fuentes en orden de prioridad
    const nombre = extraerNombre(cajaActual.usuario) ||
      extraerNombre(cajaActual.usuario_nombre) ||
      extraerNombre(cajaActual.usuarioApertura) ||
      extraerNombre(cajaActual.usuario_apertura) ||
      'Sistema';

    // Fecha: intentar createdAt o fecha_apertura
    const fechaRaw = cajaActual.fecha_apertura || cajaActual.createdAt || new Date();
    const fechaObj = new Date(fechaRaw);

    // Validar fecha
    if (isNaN(fechaObj.getTime())) return { nombre, fecha: '--/--/--', hora: '--:--' };

    return {
      nombre,
      fecha: fechaObj.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hora: fechaObj.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  // Helper seguro para usuario actual
  const getUsuarioNombre = () => {
    if (!usuario) return 'Invitado';
    if (typeof usuario === 'string') return usuario;
    return usuario.nombre || 'Usuario';
  };

  // SI NO HAY CAJA ABIERTA
  if (!cajaActual) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col w-full">
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
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg text-xl font-bold transition-all duration-200 flex items-center justify-center space-x-3 mx-auto shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
            >
              <div className="relative">
                <FaCashRegister className="h-8 w-8" />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px] shadow-sm">
                  <FaUnlock className="h-3 w-3 text-blue-600" />
                </div>
              </div>
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
              <div>Usuario: <span className="font-medium">{getUsuarioNombre()}</span></div>
              <div>Sucursal: <span className="font-medium">{usuario?.sucursal || '-'}</span></div>
              <div>Turno: <span className="font-medium">{usuario?.turno || '-'}</span></div>
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
  const { nombre: usuarioApertura, fecha: fechaApertura, hora: horaApertura } = getDatosApertura();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col w-full">
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
              ${(cajaActual.monto_inicial_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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


        {/*  NUEVA FILA 3: Footer Premium Compacto */}
        <div className="border-t border-gray-100 pt-1 mt-1">
          <div className="bg-gray-50/80 rounded-lg p-1.5 border border-gray-200/50">
            <div className="grid grid-cols-3 gap-1">

              {/* Columna 1: Usuario */}
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-1 mb-0.5">
                  <User className="h-2 w-2 text-blue-500" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Abierta por</span>
                </div>
                <div className="font-black text-[10px] text-gray-700 truncate w-full pl-0.5" title={usuarioApertura}>
                  {usuarioApertura}
                </div>
              </div>

              {/* Columna 2: Fecha (Centro) */}
              <div className="flex flex-col items-center border-l border-r border-gray-200/50 bg-white/50 rounded-sm">
                <div className="flex items-center space-x-1 mb-0.5">
                  <Calendar className="h-2 w-2 text-blue-500" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Fecha</span>
                </div>
                <div className="font-black text-[10px] text-gray-700 text-center">
                  {fechaApertura}
                </div>
              </div>

              {/* Columna 3: Hora (Derecha) */}
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-1 mb-0.5">
                  <Clock className="h-2 w-2 text-blue-500" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Hora</span>
                </div>
                <div className="font-black text-[10px] text-gray-700 text-right pr-0.5">
                  {horaApertura}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CajaStatus;