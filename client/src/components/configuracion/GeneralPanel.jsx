// components/configuracion/GeneralPanel.jsx
import React, { useState } from 'react';
import Settings from 'lucide-react/dist/esm/icons/settings'
import Database from 'lucide-react/dist/esm/icons/database'
import Download from 'lucide-react/dist/esm/icons/download'
import Upload from 'lucide-react/dist/esm/icons/upload'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Server from 'lucide-react/dist/esm/icons/server'
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive'
import Wifi from 'lucide-react/dist/esm/icons/wifi'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Bell from 'lucide-react/dist/esm/icons/bell'
import Palette from 'lucide-react/dist/esm/icons/palette'
import toast from '../../utils/toast.jsx';

const GeneralPanel = () => {
  const [configuraciones, setConfiguraciones] = useState({
    // Configuración de la aplicación
    autoBackup: true,
    backupInterval: '24', // horas
    notificacionesSound: true,
    temaOscuro: false,

    // Configuración de base de datos
    autoVacuum: true,
    compressionLevel: 'medio',

    // Configuración de seguridad
    sesionTimeout: '8', // horas
    intentosLogin: '3',
    bloqueoTiempo: '15' // minutos
  });

  const handleConfigChange = (key, value) => {
    setConfiguraciones(prev => ({
      ...prev,
      [key]: value
    }));

    // Aquí se podría hacer una llamada a la API para guardar la configuración
    toast.success('Configuración actualizada');
  };

  const realizarBackup = async () => {
    try {
      toast.loading('Creando backup...', { id: 'backup' });

      // Simular backup (en producción sería una llamada real a la API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Backup creado exitosamente', { id: 'backup' });
    } catch (error) {
      toast.error('Error al crear backup', { id: 'backup' });
    }
  };

  const limpiarCache = async () => {
    try {
      toast.loading('Limpiando caché...', { id: 'cache' });

      // Limpiar localStorage excepto auth-token
      const authToken = localStorage.getItem('auth-token');
      localStorage.clear();
      if (authToken) {
        localStorage.setItem('auth-token', authToken);
      }

      // Simular limpieza de caché del servidor
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Caché limpiado', { id: 'cache' });
    } catch (error) {
      toast.error('Error al limpiar caché', { id: 'cache' });
    }
  };

  const optimizarBD = async () => {
    try {
      toast.loading('Optimizando base de datos...', { id: 'optimize' });

      // Simular optimización (en producción sería una llamada real)
      await new Promise(resolve => setTimeout(resolve, 3000));

      toast.success('Base de datos optimizada', { id: 'optimize' });
    } catch (error) {
      toast.error('Error al optimizar BD', { id: 'optimize' });
    }
  };

  return (
    <div className="space-y-6">

      {/* Información del Sistema - Premium Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Server className="h-24 w-24 text-white" />
        </div>

        <h3 className="relative font-bold text-white mb-6 flex items-center text-lg tracking-tight">
          <div className="p-2 bg-white/10 rounded-lg mr-3 backdrop-blur-sm border border-white/10">
            <Server className="h-5 w-5 text-blue-300" />
          </div>
          Información del Sistema
        </h3>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300 group-hover:text-blue-200 transition-colors">
                <Database className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-300">Base de Datos</span>
            </div>
            <div className="text-xl font-bold text-white tracking-wide">PostgreSQL</div>
            <div className="mt-1 flex items-center text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              Conexión Estable
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300 group-hover:text-emerald-200 transition-colors">
                <Wifi className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-300">Socket.IO</span>
            </div>
            <div className="text-xl font-bold text-white tracking-wide">Activo</div>
            <div className="mt-1 flex items-center text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              Tiempo Real
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-300 group-hover:text-purple-200 transition-colors">
                <HardDrive className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-300">Versión</span>
            </div>
            <div className="text-xl font-bold text-white tracking-wide">v2.0.0</div>
            <div className="mt-1 text-xs text-slate-400">Electro Caja Release</div>
          </div>
        </div>
      </div>

      {/* Configuración de Backup - Premium Style */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center">
            <div className="p-1.5 bg-white/20 rounded-lg mr-3 backdrop-blur-md">
              <Download className="h-4 w-4 text-white" />
            </div>
            Backup y Mantenimiento
          </h3>
          <span className="text-white/80 text-xs font-medium px-2 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
            Area Crítica
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={configuraciones.autoBackup}
                    onChange={(e) => handleConfigChange('autoBackup', e.target.checked)}
                    className="checkbox-premium w-5 h-5 rounded text-orange-600 focus:ring-orange-500 border-gray-300 transition-colors"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-orange-700 transition-colors">Backup Automático</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">Genera copias de seguridad periódicas del sistema</p>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <select
                value={configuraciones.backupInterval}
                onChange={(e) => handleConfigChange('backupInterval', e.target.value)}
                className="text-sm border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white shadow-sm"
              >
                <option value="12">Cada 12 horas</option>
                <option value="24">Cada 24 horas</option>
                <option value="48">Cada 48 horas</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={realizarBackup}
                className="group relative px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-200 flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <Download className="h-4 w-4 mr-2" />
                <span>Crear Backup</span>
              </button>

              <button
                onClick={limpiarCache}
                className="group relative px-4 py-3 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg hover:from-orange-400 hover:to-orange-500 transition-all duration-200 flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Limpiar Caché</span>
              </button>

              <button
                onClick={optimizarBD}
                className="group relative px-4 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg hover:from-emerald-500 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <Database className="h-4 w-4 mr-2" />
                <span>Optimizar BD</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralPanel;