// components/ConfiguracionModal.jsx (MODULAR Y CORREGIDO)
import React, { useState } from 'react';
import { X, Settings, Building } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import WhatsAppPanel from './configuracion/WhatsAppPanel';
import UsuariosPanel from './configuracion/UsuariosPanel';
import GeneralPanel from './configuracion/GeneralPanel';
import AdministracionPanel from './configuracion/AdministracionPanel';

const ConfiguracionModal = ({ isOpen, onClose }) => {
  const { usuario } = useAuthStore();
  const [tabActiva, setTabActiva] = useState('whatsapp');

  if (!isOpen) return null;

  // Si es supervisor, solo mostrar la pestaña de WhatsApp
  const esSupervisor = usuario?.rol === 'supervisor';

  const tabs = esSupervisor
    ? [
        { id: 'whatsapp', label: 'WhatsApp', icono: 'Smartphone' }
      ]
    : [
        { id: 'whatsapp', label: 'WhatsApp', icono: 'Smartphone' },
        { id: 'cuentas', label: 'Cuentas', icono: 'Users' },
        { id: 'administracion', label: 'Administración', icono: 'Building' },
        { id: 'general', label: 'General', icono: 'Settings' }
      ];

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-500 to-gray-600">
          <div className="px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Settings className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Configuración del Sistema</h2>
                  <div className="text-sm text-gray-100">
                    Configurar integraciones, cuentas y ajustes del sistema
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  tabActiva === tab.id
                    ? 'bg-white text-gray-900 border-b-2 border-gray-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {tabActiva === 'whatsapp' && <WhatsAppPanel />}
          {!esSupervisor && tabActiva === 'cuentas' && <UsuariosPanel usuario={usuario} />}
          {!esSupervisor && tabActiva === 'administracion' && <AdministracionPanel />}
          {!esSupervisor && tabActiva === 'general' && <GeneralPanel />}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionModal;