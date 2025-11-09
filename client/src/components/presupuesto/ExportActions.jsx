// components/presupuesto/ExportActions.jsx - SOLO CONFIGURACIÓN 
import React, { useState } from 'react';
import { 
  FileText, Mail, MessageSquare, Download,
  CheckCircle, Eye, AlertTriangle, Check, 
  ChevronDown, Wifi, WifiOff
} from 'lucide-react';
import toast from '../../utils/toast.jsx';

const ExportActions = ({ 
  presupuestoData,
  onConfigChange,
  isEnabled = true,
  tasaCambio = 1
}) => {
  const [showVistaPrevia, setShowVistaPrevia] = useState(false);

  //  Estados de configuración ÚNICAMENTE
  const [exportConfig, setExportConfig] = useState({
    pdf: false,
    whatsapp: false,
    email: false
  });

  //  Manejar toggle de opciones - SOLO CONFIGURACIÓN
  const handleToggle = (type) => {
    const newConfig = {
      ...exportConfig,
      [type]: !exportConfig[type]
    };
    setExportConfig(newConfig);
    
    // Notificar al componente padre
    onConfigChange && onConfigChange(newConfig);
    
    // Feedback visual
    const labels = {
      pdf: 'PDF',
      whatsapp: 'WhatsApp',
      email: 'Email'
    };
    
    toast.success(
      `${exportConfig[type] ? '' : ''} ${labels[type]} ${exportConfig[type] ? 'desactivado' : 'activado'}`,
      { duration: 2000 }
    );
  };

  //  Validaciones
  const isEmailValid = presupuestoData.cliente?.email && 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(presupuestoData.cliente.email);

  const isPhoneValid = presupuestoData.cliente?.telefono && 
    presupuestoData.cliente.telefono.replace(/[^0-9]/g, '').length >= 10;

  //  Configuración de estilos
  const getCardStyle = (type, isActive) => {
    const configs = {
      pdf: {
        activeColor: 'from-red-500 to-red-600',
        activeBg: 'bg-red-50 border-red-300',
        inactiveColor: 'from-gray-400 to-gray-500',
        inactiveBg: 'bg-gray-50 border-gray-300',
        icon: FileText,
        label: 'Imprimir PDF',
        description: 'Documento profesional imprimible'
      },
      whatsapp: {
        activeColor: 'from-green-500 to-green-600',
        activeBg: 'bg-green-50 border-green-300',
        inactiveColor: 'from-gray-400 to-gray-500',
        inactiveBg: 'bg-gray-50 border-gray-300',
        icon: MessageSquare,
        label: 'WhatsApp',
        description: 'Envío directo al cliente'
      },
      email: {
        activeColor: 'from-blue-500 to-blue-600',
        activeBg: 'bg-blue-50 border-blue-300',
        inactiveColor: 'from-gray-400 to-gray-500',
        inactiveBg: 'bg-gray-50 border-gray-300',
        icon: Mail,
        label: 'Email',
        description: 'Correo profesional'
      }
    };
    return configs[type];
  };

  return (
    <div className="space-y-6">
      
      {/*  CARDS DE CONFIGURACIÓN - SOLO TOGGLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {Object.entries(exportConfig).map(([type, isActive]) => {
          const config = getCardStyle(type, isActive);
          const IconComponent = config.icon;
          
          const hasWarning = 
            (type === 'whatsapp' && !isPhoneValid) ||
            (type === 'email' && !isEmailValid);

          return (
            <button
              key={type}
              onClick={() => handleToggle(type)}
              disabled={!isEnabled}
              className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 cursor-pointer hover:shadow-lg ${
                isActive ? config.activeBg : config.inactiveBg
              } ${hasWarning ? 'ring-2 ring-yellow-300' : ''} ${
                !isEnabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="text-center">
                {/* Icono con gradiente */}
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-gradient-to-r ${
                  isActive ? config.activeColor : config.inactiveColor
                } relative`}>
                  <IconComponent className="h-6 w-6 text-white" />
                  
                  {/* Badge de estado activo */}
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                  )}
                  
                  {/* Badge de advertencia */}
                  {hasWarning && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Título */}
                <h3 className={`font-semibold mb-1 ${
                  isActive ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {config.label}
                </h3>
                
                {/* Descripción */}
                <p className={`text-sm ${
                  isActive ? 'text-gray-700' : 'text-gray-500'
                }`}>
                  {config.description}
                </p>
                
                {/* Estados especiales */}
                {type === 'whatsapp' && !isPhoneValid && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                       Sin teléfono
                    </span>
                  </div>
                )}
                
                {type === 'email' && !isEmailValid && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                       Sin email
                    </span>
                  </div>
                )}
                
                {isActive && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      type === 'pdf' ? 'bg-red-100 text-red-700' :
                      type === 'whatsapp' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      <Check className="h-3 w-3 mr-1" />
                      SELECCIONADO
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/*  RESUMEN DE CONFIGURACIÓN */}
      {Object.values(exportConfig).some(Boolean) && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
          <div className="text-center">
            <h4 className="text-lg font-bold text-emerald-900 mb-2">
               Configuración Lista
            </h4>
            
            <p className="text-emerald-700 text-sm mb-3">
              Se ejecutará: {Object.entries(exportConfig)
                .filter(([_, active]) => active)
                .map(([type, _]) => {
                  const labels = { pdf: 'PDF', whatsapp: 'WhatsApp', email: 'Email' };
                  return labels[type];
                }).join(' + ')}
            </p>
            
            <div className="bg-white/70 rounded-lg p-3 text-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className={exportConfig.pdf ? 'text-red-700 font-semibold' : 'text-gray-500'}>
                   {exportConfig.pdf ? 'PDF Activo' : 'PDF Inactivo'}
                </div>
                <div className={exportConfig.whatsapp ? 'text-green-700 font-semibold' : 'text-gray-500'}>
                   {exportConfig.whatsapp ? 'WhatsApp Activo' : 'WhatsApp Inactivo'}
                </div>
                <div className={exportConfig.email ? 'text-blue-700 font-semibold' : 'text-gray-500'}>
                   {exportConfig.email ? 'Email Activo' : 'Email Inactivo'}
                </div>
              </div>
            </div>
            
            <p className="text-xs text-emerald-600 mt-2">
               Haz clic en "Generar" para ejecutar las acciones seleccionadas
            </p>
          </div>
        </div>
      )}

      {/*  VISTA PREVIA SIMPLE */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <button
          onClick={() => setShowVistaPrevia(!showVistaPrevia)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-100 p-2 rounded-lg transition-colors"
        >
          <div className="flex items-center">
            <Eye className="h-5 w-5 mr-3 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Vista Previa del Presupuesto</h4>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-600 transition-transform ${showVistaPrevia ? 'rotate-180' : ''}`} />
        </button>
        
        {showVistaPrevia && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <VistaResumenPresupuesto 
              presupuestoData={presupuestoData} 
              tasaCambio={tasaCambio}
            />
          </div>
        )}
      </div>
    </div>
  );
};

//  COMPONENTE DE VISTA RESUMIDA
const VistaResumenPresupuesto = ({ presupuestoData, tasaCambio }) => {
  // Cálculo simple de totales
  const subtotal = presupuestoData.items?.reduce((sum, item) => {
    return sum + (item.cantidad * item.precio_unitario);
  }, 0) || 0;

  const descuentoGlobal = presupuestoData.descuentoGlobal || 0;
  const tipoDescuento = presupuestoData.tipoDescuento || 'porcentaje';
  const impuesto = presupuestoData.impuestos || 16;

  let descuentoUsd;
  if (tipoDescuento === 'porcentaje') {
    descuentoUsd = (subtotal * descuentoGlobal) / 100;
  } else {
    descuentoUsd = descuentoGlobal / tasaCambio;
  }
  
  const baseImponible = subtotal - descuentoUsd;
  const ivaUsd = (baseImponible * impuesto) / 100;
  const totalUsd = baseImponible + ivaUsd;
  const totalBs = totalUsd * tasaCambio;

  if (!presupuestoData.items || presupuestoData.items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
        <p>No hay productos agregados</p>
        <p className="text-sm">Agrega productos para ver el resumen</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header del presupuesto */}
      <div className="flex justify-between items-start border-b pb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">PRESUPUESTO</h2>
          <p className="text-gray-600">{presupuestoData.numero}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Fecha: {new Date(presupuestoData.fecha).toLocaleDateString('es-VE')}</p>
          <p className="text-sm text-gray-600">Válido hasta: {new Date(presupuestoData.fechaVencimiento).toLocaleDateString('es-VE')}</p>
        </div>
      </div>

      {/* Cliente */}
      {presupuestoData.cliente && (
        <div className="border-b pb-3">
          <h3 className="font-semibold text-gray-900 mb-2">Cliente:</h3>
          <p className="text-gray-700 font-medium">{presupuestoData.cliente.nombre}</p>
          <p className="text-gray-600">{presupuestoData.cliente.cedula_rif}</p>
          {presupuestoData.cliente.telefono && <p className="text-gray-600">Tel: {presupuestoData.cliente.telefono}</p>}
          {presupuestoData.cliente.email && <p className="text-gray-600">Email: {presupuestoData.cliente.email}</p>}
        </div>
      )}

      {/* Resumen de productos */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Resumen:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Productos:</span>
            <span className="font-medium ml-2">{presupuestoData.items.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Cantidad total:</span>
            <span className="font-medium ml-2">
              {presupuestoData.items.reduce((sum, item) => sum + item.cantidad, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Total destacado */}
      <div className="bg-emerald-50 p-4 rounded-lg border-2 border-emerald-200">
        <div className="text-center">
          <p className="text-emerald-600 text-sm mb-1">TOTAL PRESUPUESTO</p>
          <p className="text-2xl font-bold text-emerald-700">
            {totalBs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} Bs
          </p>
          <p className="text-emerald-600 text-sm">
            ${totalUsd.toFixed(2)} USD
          </p>
        </div>
      </div>

      {/* Observaciones */}
      {presupuestoData.observaciones?.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Observaciones:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            {presupuestoData.observaciones.map((obs, index) => (
              <li key={index}>• {obs}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExportActions;