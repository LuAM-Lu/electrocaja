// components/servicios/ServiciosFloatingActions.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Menu, PlusCircle, Wrench, Settings, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const ServiciosFloatingActions = ({ onNewService, onSettings, onReports }) => {
  const { usuario } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  // Orden invertido para que "Nueva Orden" aparezca primero (arriba) con flex-col-reverse
  const actions = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      label: 'Reportes',
      onClick: onReports,
      color: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
    },
    // Solo mostrar botón Técnico si el usuario es admin
    ...(usuario?.rol === 'admin' ? [{
      icon: <Wrench className="h-6 w-6" />,
      label: 'Técnico',
      onClick: onSettings,
      color: 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
    }] : []),
    {
      icon: <PlusCircle className="h-6 w-6" />,
      label: 'Nueva Orden',
      onClick: onNewService,
      color: 'from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800'
    }
  ];

  //  CERRAR AL HACER CLIC FUERA
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  //  TOGGLE DEL MENÚ
  const handleMainButtonClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  //  MANEJAR CLIC EN ACCIÓN SECUNDARIA
  const handleActionClick = (action, e) => {
    e.stopPropagation();
    if (action.onClick) {
      action.onClick();
    }
    setIsExpanded(false); // Cerrar después de ejecutar acción
  };

  return (
    <div ref={containerRef} className="fixed bottom-6 right-20 z-50">
     
      {/* Botones secundarios */}
      <div className={`flex flex-col-reverse items-end space-y-reverse space-y-3 mb-3 transition-all duration-300 ${
        isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, index) => (
          <div key={index} className="flex items-center space-x-3 group">
            {/* Tooltip */}
            <span className="bg-gray-900 text-gray-100 px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {action.label}
            </span>
            {/* Botón */}
            <button
              onClick={(e) => handleActionClick(action, e)}
              className={`w-14 h-14 rounded-full bg-gradient-to-r ${action.color} text-white shadow-lg hover:shadow-2xl transition-all duration-200 hover:scale-110 flex items-center justify-center`}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Botón principal - Menú hamburguesa */}
      <div className="flex items-center space-x-3 group">
        {/* Tooltip del botón principal */}
        <span className={`bg-gray-900 text-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-opacity whitespace-nowrap ${
          isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isExpanded ? 'Cerrar Menú' : 'Menú de Acciones'}
        </span>
       
        {/* Botón principal */}
        <button
          onClick={handleMainButtonClick}
          className="p-4 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-gray-100 shadow-2xl hover:shadow-[0_0_30px_rgba(71,85,105,0.6)] transition-all duration-300 hover:scale-110 active:scale-95 group relative"
        >
          <Menu 
            className={`h-8 w-8 transition-transform duration-300 ${
              isExpanded ? 'rotate-90' : 'rotate-0'
            }`} 
          />
         
          {/* Anillo animado */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-400/30 animate-pulse" />
        </button>
      </div>
    </div>
  );
};

export default ServiciosFloatingActions;