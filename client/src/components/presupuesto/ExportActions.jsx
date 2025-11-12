// components/presupuesto/ExportActions.jsx - SOLO CONFIGURACIÓN 
import React, { useState } from 'react';
import { 
  FileText, Mail, Download,
  CheckCircle, Eye, AlertTriangle, Check, 
  ChevronDown, Wifi, WifiOff, X
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import toast from '../../utils/toast.jsx';
import { calcularTotales } from '../../utils/presupuestoUtils';

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
    whatsappSimple: false,
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
    
    // ✅ ELIMINADO: Toast de feedback innecesario
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
        icon: FaWhatsapp,
        label: 'WhatsApp',
        description: 'Envío con PDF adjunto'
      },
      whatsappSimple: {
        activeColor: 'from-emerald-500 to-emerald-600',
        activeBg: 'bg-emerald-50 border-emerald-300',
        inactiveColor: 'from-gray-400 to-gray-500',
        inactiveBg: 'bg-gray-50 border-gray-300',
        icon: FaWhatsapp,
        label: 'WhatsApp Simple',
        description: 'Solo mensaje de texto'
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {Object.entries(exportConfig).map(([type, isActive]) => {
          const config = getCardStyle(type, isActive);
          const IconComponent = config.icon;
          
          const hasWarning = 
            (type === 'whatsapp' && !isPhoneValid) ||
            (type === 'whatsappSimple' && !isPhoneValid) ||
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
                
                {type === 'whatsappSimple' && !isPhoneValid && (
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
                      type === 'whatsappSimple' ? 'bg-emerald-100 text-emerald-700' :
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

      {/*  RESUMEN DE CONFIGURACIÓN - ELIMINADO POR REDUNDANCIA */}
      
      {/*  BOTÓN PARA ABRIR VISTA PREVIA MODAL */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <button
          onClick={() => setShowVistaPrevia(true)}
          className="w-full flex items-center justify-center gap-2 hover:bg-gray-100 p-3 rounded-lg transition-colors text-gray-700 hover:text-gray-900"
        >
          <Eye className="h-5 w-5" />
          <span className="font-semibold">Vista Previa del Presupuesto</span>
        </button>
      </div>

      {/*  MODAL DE VISTA PREVIA */}
      {showVistaPrevia && (
        <VistaPreviaModal
          presupuestoData={presupuestoData}
          tasaCambio={tasaCambio}
          onClose={() => setShowVistaPrevia(false)}
        />
      )}
    </div>
  );
};

//  MODAL DE VISTA PREVIA CON DISEÑO SIMILAR AL PDF
const VistaPreviaModal = ({ presupuestoData, tasaCambio, onClose }) => {
  const totales = calcularTotales(presupuestoData, tasaCambio);
  
  const fechaActual = new Date(presupuestoData.fecha || new Date()).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  const horaActual = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const formatearVenezolano = (valor) => {
    if (!valor && valor !== 0) return '';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (!presupuestoData.items || presupuestoData.items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center text-gray-500 py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-semibold">No hay productos agregados</p>
            <p className="text-sm mt-2">Agrega productos para ver el resumen</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header del Modal */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-bold text-white">Vista Previa del Presupuesto</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido del Presupuesto */}
        <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* HEADER PREMIUM CON PALETA AZUL */}
            <div className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500 relative">
              <div className="bg-blue-300 h-1"></div>
              <div className="p-6 flex items-start gap-4">
                <img 
                  src="/android-chrome-512x5129.png" 
                  alt="Logo" 
                  className="w-20 h-20 rounded-lg shadow-lg"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="flex-1 text-white">
                  <h1 className="text-2xl font-bold mb-2">ELECTRO SHOP MORANDIN C.A.</h1>
                  <p className="text-sm opacity-90">RIF: J-405903333 | Especialistas en Tecnologia</p>
                  <p className="text-sm opacity-90">Carrera 5ta, frente a la plaza Miranda | WhatsApp: +58 2572511282</p>
                  <p className="text-xs opacity-75 mt-1">electroshopgre@gmail.com | @electroshopgre</p>
                </div>
              </div>
            </div>

            {/* TÍTULO DEL PRESUPUESTO */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-6 mt-6 rounded-r-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">PRESUPUESTO {presupuestoData.numero}</h2>
                <div className="text-right text-sm text-gray-600">
                  <p>Fecha: {fechaActual}</p>
                  <p>Hora: {horaActual}</p>
                  <p>Tasa: {formatearVenezolano(tasaCambio)} Bs/$</p>
                </div>
              </div>
            </div>

            {/* INFORMACIÓN DEL CLIENTE */}
            {presupuestoData.cliente && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-6 mt-4 rounded-r-lg">
                <h3 className="text-lg font-bold text-blue-900 mb-3">CLIENTE</h3>
                <div className="space-y-1 text-gray-700">
                  <p><span className="font-semibold">Nombre:</span> {presupuestoData.cliente.nombre}</p>
                  {presupuestoData.cliente.cedula_rif && (
                    <p><span className="font-semibold">CI/RIF:</span> {presupuestoData.cliente.cedula_rif}</p>
                  )}
                  {presupuestoData.cliente.telefono && (
                    <p><span className="font-semibold">Teléfono:</span> {presupuestoData.cliente.telefono}</p>
                  )}
                  {presupuestoData.cliente.email && (
                    <p><span className="font-semibold">Email:</span> {presupuestoData.cliente.email}</p>
                  )}
                </div>
              </div>
            )}

            {/* TABLA DE PRODUCTOS */}
            <div className="mx-6 mt-6">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-t-lg">
                <div className="grid grid-cols-7 gap-2 text-sm font-bold">
                  <div>#</div>
                  <div>Cant.</div>
                  <div className="col-span-2">PRODUCTO / SERVICIO</div>
                  <div className="text-right">P.Unit $</div>
                  <div className="text-right">Total $</div>
                  <div className="text-right">Total Bs</div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                {presupuestoData.items.map((item, index) => (
                  <div 
                    key={index}
                    className={`grid grid-cols-7 gap-2 p-3 text-sm border-b border-gray-100 last:border-b-0 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                    }`}
                  >
                    <div className="font-medium">{index + 1}</div>
                    <div>{item.cantidad}</div>
                    <div className="col-span-2">{item.descripcion}</div>
                    <div className="text-right">{item.precio_unitario.toFixed(2)}</div>
                    <div className="text-right font-semibold">
                      ${(item.cantidad * item.precio_unitario).toFixed(2)}
                    </div>
                    <div className="text-right font-semibold">
                      {formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN DE TOTALES */}
            <div className="mx-6 mt-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-r-lg p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-4">RESUMEN FINANCIERO</h3>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatearVenezolano(totales.subtotal * tasaCambio)} Bs</span>
                  </div>
                  {totales.descuentoGlobal > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento ({totales.tipoDescuento === 'porcentaje' ? totales.descuentoGlobal + '%' : 'fijo'}):</span>
                      <span className="font-semibold">-{formatearVenezolano(totales.descuentoBs)} Bs</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Base Imponible:</span>
                    <span className="font-semibold">{formatearVenezolano(totales.baseImponible * tasaCambio)} Bs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA ({totales.impuesto}%):</span>
                    <span className="font-semibold">{formatearVenezolano(totales.ivaBs)} Bs</span>
                  </div>
                  <div className="border-t border-blue-300 pt-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-blue-900">TOTAL:</span>
                      <span className="text-xl font-bold text-blue-900">
                        {formatearVenezolano(totales.totalBs)} Bs
                      </span>
                    </div>
                    <div className="text-right text-sm text-gray-600 mt-1">
                      En USD: ${totales.totalUsd.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* OBSERVACIONES */}
            {presupuestoData.observaciones && presupuestoData.observaciones.length > 0 && (
              <div className="mx-6 mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-3">OBSERVACIONES IMPORTANTES</h3>
                <ul className="space-y-2 text-gray-700">
                  {presupuestoData.observaciones.map((obs, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FOOTER */}
            <div className="mx-6 mt-6 pb-6 border-t border-gray-200 pt-4">
              <p className="text-center text-sm text-gray-500 italic">
                Este presupuesto es válido según términos y condiciones aplicables.
              </p>
              <p className="text-center text-xs text-gray-400 mt-2">
                Generado por ElectroCaja v1.0 • {new Date().toLocaleString('es-ES')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportActions;