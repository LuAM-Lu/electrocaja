// components/UserMenu.jsx (OPCIONAL - Menu más completo)
import React, { useState } from 'react';
import { 
  User, LogOut, Settings, Clock, Shield, 
  ChevronDown, Bell, Activity 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const UserMenu = () => {
  const { usuario, logout, getSessionInfo } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const sessionInfo = getSessionInfo();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
      toast.success('Sesión cerrada correctamente');
    }
    setIsOpen(false);
  };

  const getRoleColor = (rol) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      supervisor: 'bg-blue-100 text-blue-700',
      cajero: 'bg-green-100 text-green-700',
      viewer: 'bg-gray-100 text-gray-700'
    };
    return colors[rol] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white rounded-lg border border-blue-200 px-3 py-2 hover:bg-blue-50 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-blue-700">
            {usuario?.nombre?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-blue-900">
            {usuario?.nombre}
          </div>
          <div className="text-xs text-blue-600">
            {usuario?.sucursal}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
            
            {/* Header del menú */}
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-blue-900">{usuario?.nombre}</div>
                  <div className="text-sm text-blue-600">{usuario?.email}</div>
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(usuario?.rol)}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {usuario?.rol?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Información de sesión */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Sucursal</div>
                  <div className="font-medium text-gray-900">{usuario?.sucursal}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Turno</div>
                  <div className="font-medium text-gray-900">{usuario?.turno}</div>
                </div>
              </div>
              
              {sessionInfo && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Tiempo restante:</span>
                    <span className="font-medium text-gray-900">{sessionInfo.tiempoRestante}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">Usuarios conectados:</span>
                    <span className="font-medium text-gray-900">{sessionInfo.usuariosConectados}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Opciones del menú */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  toast.success('Configuración no disponible en demo');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-gray-700"
              >
                <Settings className="h-4 w-4 text-gray-500" />
                <span>Configuración</span>
              </button>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  toast.success('Notificaciones no disponibles en demo');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-gray-700"
              >
                <Bell className="h-4 w-4 text-gray-500" />
                <span>Notificaciones</span>
              </button>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  toast.success('Historial de actividad no disponible en demo');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-gray-700"
              >
                <Activity className="h-4 w-4 text-gray-500" />
                <span>Mi Actividad</span>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 py-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-3 text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;