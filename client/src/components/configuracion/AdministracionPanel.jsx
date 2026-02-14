// client/src/components/configuracion/AdministracionPanel.jsx
import React, { useState } from 'react';
import Users from 'lucide-react/dist/esm/icons/users'
import Building from 'lucide-react/dist/esm/icons/building'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Search from 'lucide-react/dist/esm/icons/search'
import Edit2 from 'lucide-react/dist/esm/icons/edit-2'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Eye from 'lucide-react/dist/esm/icons/eye'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import UserX from 'lucide-react/dist/esm/icons/user-x'
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



      {/* Tabs de navegación */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icono;
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${tabActiva === tab.id
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