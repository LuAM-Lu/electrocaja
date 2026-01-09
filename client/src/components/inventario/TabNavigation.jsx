// components/inventario/TabNavigation.jsx
import React from 'react';
import { FileText, DollarSign, Package, Upload, Phone, Activity, CheckCircle, AlertTriangle, Building2, BarChart3, Wrench, Coffee } from 'lucide-react';

const TabNavigation = ({
  activeTab,
  setActiveTab,
  formData,
  editingItem = null,
  className = ""
}) => {

  const tabs = [
    {
      id: 'basico',
      label: 'Básico',
      icon: FileText,
      required: true,
      shortLabel: 'Básico'
    },
    {
      id: 'proveedor',
      label: 'Proveedor',
      icon: Building2,
      required: formData?.tipo !== 'servicio',
      shortLabel: 'Proveedor'
    },
    {
      id: 'precios',
      label: 'Precios',
      icon: DollarSign,
      required: true,
      shortLabel: 'Precios'
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: Package,
      required: formData?.tipo !== 'servicio',
      shortLabel: 'Stock'
    },
    {
      id: 'multimedia',
      label: 'Imagen',
      icon: Upload,
      required: false,
      shortLabel: 'Imagen'
    }
  ];

  // Evaluar completitud de cada tab
  const getTabStatus = (tab) => {
    if (!formData) return 'empty';

    switch (tab.id) {
      case 'basico':
        const hasBasicInfo = formData.descripcion?.trim() && formData.codigo_barras?.trim();
        return hasBasicInfo ? 'complete' : 'incomplete';

      case 'precios':
        const hasPrices = formData.precio_costo && formData.precio_venta &&
          parseFloat(formData.precio_costo) > 0 && parseFloat(formData.precio_venta) > 0;
        const validPrices = hasPrices && parseFloat(formData.precio_venta) > parseFloat(formData.precio_costo);
        return validPrices ? 'complete' : hasPrices ? 'warning' : 'incomplete';

      case 'stock':
        if (formData.tipo === 'servicio') return 'not_applicable';
        const hasStock = formData.stock !== undefined && formData.stock !== '' && parseInt(formData.stock) >= 0;
        return hasStock ? 'complete' : 'incomplete';

      case 'multimedia':
        return formData.imagen_url ? 'complete' : 'optional';

      case 'proveedor':
        if (formData.tipo === 'servicio') return 'not_applicable';
        return formData.proveedor ? 'complete' : 'optional';

      default:
        return 'optional';
    }
  };

  // Obtener estilo según el estado
  const getTabStyle = (tab, isActive) => {
    const status = getTabStatus(tab);

    const baseStyle = "flex items-center justify-center space-x-1 px-1 sm:px-2 py-2 text-xs font-medium rounded-t-lg transition-all duration-200 relative group min-w-0";

    if (isActive) {
      switch (status) {
        case 'complete':
          return `${baseStyle} bg-green-50/95 backdrop-blur-sm text-green-700 border-b-2 border-green-500 shadow-sm`;
        case 'warning':
          return `${baseStyle} bg-orange-50/95 backdrop-blur-sm text-orange-700 border-b-2 border-orange-500 shadow-sm`;
        case 'incomplete':
          return `${baseStyle} bg-red-50/95 backdrop-blur-sm text-red-700 border-b-2 border-red-500 shadow-sm`;
        case 'not_applicable':
          return `${baseStyle} bg-gray-50/95 backdrop-blur-sm text-gray-500 border-b-2 border-gray-400 shadow-sm`;
        default:
          return `${baseStyle} bg-blue-50/95 backdrop-blur-sm text-blue-700 border-b-2 border-blue-500 shadow-sm`;
      }
    } else {
      switch (status) {
        case 'complete':
          return `${baseStyle} text-green-600 hover:text-green-700 hover:bg-green-50/95 hover:backdrop-blur-sm`;
        case 'warning':
          return `${baseStyle} text-orange-600 hover:text-orange-700 hover:bg-orange-50/95 hover:backdrop-blur-sm`;
        case 'incomplete':
          return `${baseStyle} text-red-600 hover:text-red-700 hover:bg-red-50/95 hover:backdrop-blur-sm`;
        case 'not_applicable':
          return `${baseStyle} text-gray-400 hover:text-gray-500 hover:bg-gray-50/95 hover:backdrop-blur-sm cursor-not-allowed opacity-60`;
        default:
          return `${baseStyle} text-gray-500 hover:text-gray-700 hover:bg-gray-50/95 hover:backdrop-blur-sm`;
      }
    }
  };

  // Obtener indicador de estado
  const getStatusIndicator = (tab) => {
    const status = getTabStatus(tab);

    switch (status) {
      case 'complete':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      case 'incomplete':
        return tab.required ? (
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        ) : (
          <div className="w-2 h-2 bg-gray-300 rounded-full" />
        );
      case 'not_applicable':
        return <span className="text-xs text-gray-400">N/A</span>;
      case 'not_available':
        return <span className="text-xs text-gray-400">--</span>;
      default:
        return null;
    }
  };

  // Obtener tooltip descriptivo
  const getTooltip = (tab) => {
    const status = getTabStatus(tab);

    switch (tab.id) {
      case 'basico':
        return status === 'complete' ? 'Información básica completa' : 'Faltan: descripción o código';
      case 'precios':
        return status === 'complete' ? 'Precios configurados correctamente' :
          status === 'warning' ? 'Precio de venta debe ser mayor al costo' :
            'Faltan: precios de costo o venta';
      case 'stock':
        return formData?.tipo === 'servicio' ? 'Los servicios no manejan stock' :
          status === 'complete' ? 'Stock configurado' : 'Falta configurar stock';
      case 'multimedia':
        return status === 'complete' ? 'Imagen agregada' : 'Imagen opcional';
      case 'proveedor':
        return formData?.tipo === 'servicio' ? 'Los servicios no requieren proveedor' :
          status === 'complete' ? 'Proveedor asignado' : 'Proveedor opcional';
      default:
        return `Sección ${tab.label}`;
    }
  };

  // Calcular progreso general
  const getOverallProgress = () => {
    const requiredTabs = tabs.filter(tab => {
      if (tab.id === 'stock' || tab.id === 'proveedor') {
        return formData?.tipo !== 'servicio';
      }
      return tab.required;
    });

    const completedTabs = requiredTabs.filter(tab => getTabStatus(tab) === 'complete');
    const progress = (completedTabs.length / requiredTabs.length) * 100;

    return {
      completed: completedTabs.length,
      total: requiredTabs.length,
      percentage: Math.round(progress)
    };
  };

  const progress = getOverallProgress();

  return (
    <div className={`border-b border-white/30 mb-6 ${className}`}>

      {/* Barra de progreso */}
      <div className="mb-4 px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">
            Progreso del formulario
          </span>
          <span className="text-xs font-bold text-gray-900">
            {progress.completed}/{progress.total} ({progress.percentage}%)
          </span>
        </div>
        <div className="w-full bg-gray-200/50 backdrop-blur-sm rounded-full h-2 border border-gray-300/30">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${progress.percentage === 100 ? 'bg-green-500' :
              progress.percentage >= 50 ? 'bg-blue-500' :
                'bg-orange-500'
              }`}
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Navegación de tabs */}
      <nav className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const status = getTabStatus(tab);
          const isDisabled = status === 'not_applicable' && !isActive;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`${getTabStyle(tab, isActive)} justify-center min-w-0`}
              title={getTooltip(tab)}
            >
              <Icon className="h-3 w-3 flex-shrink-0" />

              {/* Texto adaptativo */}
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.shortLabel}</span>

              {/* Indicador de estado */}
              <div className="ml-1">
                {getStatusIndicator(tab)}
              </div>

              {/* Tooltip hover mejorado */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                <div className="bg-black text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                  {getTooltip(tab)}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Indicadores adicionales */}
      <div className="flex items-center justify-between mt-3 px-1">

        {/* Estado general */}
        <div className="flex items-center space-x-2">
          {progress.percentage === 100 ? (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span className="font-medium">Formulario completo</span>
            </div>
          ) : progress.percentage >= 50 ? (
            <div className="flex items-center space-x-1 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">En progreso</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">Campos requeridos pendientes</span>
            </div>
          )}
        </div>

        {/* Tipo de item */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Tipo:</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${formData?.tipo === 'producto' ? 'bg-blue-100 text-blue-700' :
            formData?.tipo === 'servicio' ? 'bg-green-100 text-green-700' :
              formData?.tipo === 'electrobar' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
            }`}>
            {formData?.tipo ? (
              formData.tipo === 'producto' ? <><Package className="h-3 w-3" /> Producto</> :
                formData.tipo === 'servicio' ? <><Wrench className="h-3 w-3" /> Servicio</> :
                  formData.tipo === 'electrobar' ? <><Coffee className="h-3 w-3" /> Electrobar</> :
                    formData.tipo
            ) : 'No definido'}
          </span>
        </div>
      </div>


    </div>
  );
};

export default TabNavigation;