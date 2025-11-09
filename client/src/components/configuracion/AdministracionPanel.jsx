// client/src/components/configuracion/AdministracionPanel.jsx
import React, { useState } from 'react';
import { Users, Building, Plus, Search, Edit2, Trash2, Eye, UserCheck, UserX } from 'lucide-react';
import ClientesManager from './ClientesManager';
import ProveedoresManager from './ProveedoresManager';

const AdministracionPanel = () => {
  const [tabActiva, setTabActiva] = useState('clientes');

  const tabs = [
    { 
      id: 'clientes', 
      label: 'Clientes', 
      icono: Users,
      descripcion: 'Administrar base de clientes'
    },
    { 
      id: 'proveedores', 
      label: 'Proveedores', 
      icono: Building,
      descripcion: 'Gestionar proveedores y contactos'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Building className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Administración de Datos</h3>
            <p className="text-sm text-blue-600">Gestiona clientes, proveedores y relaciones comerciales</p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icono;
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  tabActiva === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido de tabs */}
      <div className="min-h-[400px]">
        {tabActiva === 'clientes' && <ClientesManager />}
        {tabActiva === 'proveedores' && <ProveedoresManager />}
      </div>

    </div>
  );
};

export default AdministracionPanel;