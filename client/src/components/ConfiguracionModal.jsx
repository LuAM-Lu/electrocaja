// components/ConfiguracionModal.jsx (MODULAR Y CORREGIDO)
import React, { useState } from 'react';
import { X, Settings, Building, Folder } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import WhatsAppPanel from './configuracion/WhatsAppPanel';
import UsuariosPanel from './configuracion/UsuariosPanel';
import GeneralPanel from './configuracion/GeneralPanel';
import AdministracionPanel from './configuracion/AdministracionPanel';
import ArchivosPanel from './configuracion/ArchivosPanel';

const ConfiguracionModal = ({ isOpen, onClose }) => {
  const { usuario } = useAuthStore();
  const [tabActiva, setTabActiva] = useState('whatsapp');

  if (!isOpen) return null;

  // Si es supervisor, solo mostrar la pestaña de WhatsApp
  const esSupervisor = usuario?.rol === 'supervisor';
  const isAdmin = usuario?.rol === 'admin';

  const tabs = esSupervisor
    ? [
      { id: 'whatsapp', label: 'WhatsApp', icono: 'Smartphone' }
    ]
    : [
      { id: 'whatsapp', label: 'WhatsApp', icono: 'Smartphone' },
      { id: 'cuentas', label: 'Cuentas', icono: 'Users' },
      { id: 'administracion', label: 'Administración', icono: 'Building' },
      ...(isAdmin ? [{ id: 'archivos', label: 'Archivos', icono: 'Folder' }] : []),
      { id: 'general', label: 'General', icono: 'Settings' }
    ];

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 flex-shrink-0">
          <div className="px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/10 shadow-inner">
                  <Settings className="h-6 w-6 text-gray-100" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Configuración del Sistema</h2>
                  <div className="text-xs text-gray-300 font-medium flex items-center space-x-2">
                    <span>Panel de Control</span>
                    <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                    <span>v2.0</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all duration-200 border border-white/10 hover:scale-105"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-100 flex-shrink-0 shadow-sm z-10">
          <div className="flex px-4 pt-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center justify-center space-x-2 py-3 px-6 text-sm font-medium transition-all duration-200 border-b-2 rounded-t-lg mx-1 ${tabActiva === tab.id
                  ? 'border-gray-800 text-gray-800 bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 relative">
          {tabActiva === 'whatsapp' && <WhatsAppPanel />}
          {!esSupervisor && tabActiva === 'cuentas' && <UsuariosPanel usuario={usuario} />}
          {!esSupervisor && tabActiva === 'administracion' && <AdministracionPanel />}
          {isAdmin && tabActiva === 'archivos' && <ArchivosPanel />}
          {!esSupervisor && tabActiva === 'general' && <GeneralPanel />}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 border-t border-gray-600 px-6 py-2 flex-shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all duration-200 font-medium flex items-center space-x-2 hover:shadow-lg backdrop-blur-sm"
          >
            <X className="h-4 w-4" />
            <span>Cerrar Panel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionModal;