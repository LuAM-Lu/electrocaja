// components/configuracion/GeneralPanel.jsx
import React, { useState } from 'react';
import { 
  Settings, Database, Download, Upload, RefreshCw, Shield, 
  Server, HardDrive, Wifi, Clock, Bell, Palette
} from 'lucide-react';
import toast from 'react-hot-toast';

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
      
      {/* Información del Sistema */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
          <Server className="h-5 w-5 mr-2" />
          Información del Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Base de Datos</span>
            </div>
            <div className="text-lg font-bold text-blue-800">PostgreSQL</div>
            <div className="text-xs text-gray-500">Conexión: Activa</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Socket.IO</span>
            </div>
            <div className="text-lg font-bold text-green-800">Activo</div>
            <div className="text-xs text-gray-500">Tiempo Real: Conectado</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <HardDrive className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Versión</span>
            </div>
            <div className="text-lg font-bold text-purple-800">v1.0.0</div>
            <div className="text-xs text-gray-500">Electro Caja</div>
          </div>
        </div>
      </div>

      {/* Configuración de Backup */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
          <h3 className="font-bold text-orange-900 text-sm flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Backup y Mantenimiento
          </h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  checked={configuraciones.autoBackup}
                  onChange={(e) => handleConfigChange('autoBackup', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Backup automático</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">Crear backup diario automáticamente</p>
            </div>
            
            <select 
              value={configuraciones.backupInterval}
              onChange={(e) => handleConfigChange('backupInterval', e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="12">Cada 12 horas</option>
              <option value="24">Cada 24 horas</option>
              <option value="48">Cada 48 horas</option>
            </select>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={realizarBackup}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Crear Backup</span>
              </button>

              <button
                onClick={limpiarCache}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Limpiar Caché</span>
              </button>

              <button
                onClick={optimizarBD}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Database className="h-4 w-4" />
                <span>Optimizar BD</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuraciones Compactas - Una sola fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Interfaz y Notificaciones */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-purple-50 px-3 py-2 border-b border-purple-100">
            <h3 className="font-bold text-purple-900 text-xs flex items-center">
              <Palette className="h-3 w-3 mr-2" />
              Interfaz y Notificaciones
            </h3>
          </div>
          
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={configuraciones.notificacionesSound}
                  onChange={(e) => handleConfigChange('notificacionesSound', e.target.checked)}
                  className="rounded border-gray-300 w-3 h-3"
                />
                <span className="text-xs font-medium">Sonidos de notificación</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={configuraciones.temaOscuro}
                  onChange={(e) => handleConfigChange('temaOscuro', e.target.checked)}
                  className="rounded border-gray-300 w-3 h-3"
                />
                <span className="text-xs font-medium">Tema oscuro (próximamente)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Seguridad y Sesiones */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-red-50 px-3 py-2 border-b border-red-100">
            <h3 className="font-bold text-red-900 text-xs flex items-center">
              <Shield className="h-3 w-3 mr-2" />
              Seguridad y Sesiones
            </h3>
          </div>
          
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Timeout (h)
                </label>
                <select 
                  value={configuraciones.sesionTimeout}
                  onChange={(e) => handleConfigChange('sesionTimeout', e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-1 py-1"
                >
                  <option value="4">4h</option>
                  <option value="8">8h</option>
                  <option value="12">12h</option>
                  <option value="24">24h</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Login
                </label>
                <select 
                  value={configuraciones.intentosLogin}
                  onChange={(e) => handleConfigChange('intentosLogin', e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-1 py-1"
                >
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bloqueo (min)
                </label>
                <select 
                  value={configuraciones.bloqueoTiempo}
                  onChange={(e) => handleConfigChange('bloqueoTiempo', e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-1 py-1"
                >
                  <option value="5">5m</option>
                  <option value="15">15m</option>
                  <option value="30">30m</option>
                  <option value="60">1h</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* Información Adicional - Compacto */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-2">
        <h4 className="font-semibold text-gray-900 mb-1 text-xs">Notas</h4>
        <div className="text-xs text-gray-600">
          <p>Los cambios se aplican inmediatamente • Backups en /uploads/backups/ • Configuraciones afectan a todos los usuarios</p>
        </div>
      </div>
    </div>
  );
};

export default GeneralPanel;