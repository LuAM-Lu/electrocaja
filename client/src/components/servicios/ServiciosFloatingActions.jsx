// components/servicios/ServiciosFloatingActions.jsx
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Wrench, Settings, FileText, BarChart3, Wifi } from 'lucide-react';

const ServiciosFloatingActions = ({ onNewService, onSettings, onReports, onPruebaConexion }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  const actions = [
    {
      icon: <Settings className="h-5 w-5" />,
      label: 'Configuración',
      onClick: onSettings,
      color: 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Reportes',
      onClick: onReports,
      color: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Historial',
      onClick: () => console.log('Historial'),
      color: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
    },
    {
      icon: <Wifi className="h-5 w-5" />,
      label: ' Prueba Conexión Nube',
      onClick: onPruebaConexion,
      color: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
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

  //  TOGGLE EN LUGAR DE HOVER
  const handleMainButtonClick = (e) => {
    e.stopPropagation();
    if (isExpanded) {
      // Si está expandido, crear nueva orden
      onNewService();
      setIsExpanded(false);
    } else {
      // Si está cerrado, expandir
      setIsExpanded(true);
    }
  };

  //  MANEJAR CLIC EN ACCIÓN SECUNDARIA
  const handleActionClick = (action, e) => {
    e.stopPropagation();
    action.onClick();
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
              className={`p-3 rounded-full bg-gradient-to-r ${action.color} text-gray-100 shadow-lg hover:shadow-2xl transition-all duration-200 hover:scale-110`}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Botón principal */}
      <div className="flex items-center space-x-3 group">
        {/* Tooltip del botón principal */}
        <span className={`bg-gray-900 text-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-opacity whitespace-nowrap ${
          isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isExpanded ? 'Nueva Orden de Servicio' : 'Menú de Acciones'}
        </span>
       
        {/* Botón principal */}
        <button
          onClick={handleMainButtonClick}
          className="p-4 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-gray-100 shadow-2xl hover:shadow-[0_0_30px_rgba(71,85,105,0.6)] transition-all duration-300 hover:scale-110 active:scale-95 group relative"
        >
          <PlusCircle 
            size={24} 
            className={`transition-transform duration-300 ${
              isExpanded ? 'rotate-45' : 'rotate-0'
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