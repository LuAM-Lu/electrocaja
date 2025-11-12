// components/venta/FinalizarVentaPanel.jsx - PANEL FINAL DE VENTA 
import React, { useState } from 'react';
import { 
  CheckCircle, Receipt, Send, FileText, Printer,
  Mail, MessageCircle, AlertTriangle, Info,
  User, Package, DollarSign, Clock, ShoppingCart, FileDown, Phone
} from 'lucide-react';
import toast from '../../utils/toast.jsx';
import { 
  generarPDFFactura, 
  generarImagenWhatsApp, 
  imprimirFacturaTermica,
  descargarPDF 
} from '../../utils/printUtils';
import { api } from '../../config/api';

//  FUNCIONES HELPER
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '0,00';
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

//  COMPONENTE TOGGLE DE OPCIÓN
const OpcionToggle = ({ 
  id, 
  label, 
  descripcion, 
  icon: Icon, 
  enabled, 
  onToggle,
  color = "emerald",
  disabled = false,
  warning = null
}) => {
  const colors = {
    emerald: enabled ? 'bg-emerald-500' : 'bg-gray-300',
    blue: enabled ? 'bg-blue-500' : 'bg-gray-300',
    purple: enabled ? 'bg-purple-500' : 'bg-gray-300',
    amber: enabled ? 'bg-amber-500' : 'bg-gray-300'
  };

  return (
    <div className={`bg-white border rounded-lg p-4 transition-all ${
      enabled ? 'border-' + color + '-200 bg-' + color + '-50' : 'border-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
    onClick={() => !disabled && onToggle(id, !enabled)}
    >
      <div className="flex items-start space-x-3">
        {/* Toggle Switch */}
        <div className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${colors[color]} relative`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 ${
            enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`}></div>
        </div>

        {/* Contenido */}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Icon className={`h-5 w-5 ${enabled ? 'text-' + color + '-600' : 'text-gray-400'}`} />
            <h4 className={`font-medium ${enabled ? 'text-' + color + '-900' : 'text-gray-700'}`}>
              {label}
            </h4>
          </div>
          <p className={`text-sm ${enabled ? 'text-' + color + '-700' : 'text-gray-500'}`}>
            {descripcion}
          </p>
          {warning && enabled && (
            <div className="mt-2 flex items-center space-x-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">{warning}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

//  COMPONENTE PRINCIPAL
const FinalizarVentaPanel = ({ 
  ventaData,
  opcionesProcesamiento,
  onOpcionesChange,
  loading = false,
  codigoVenta = null,
  descuento = 0,
  tasaCambio = 1
}) => {

  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  //  SOLO VALIDAR OPCIONES - SIN CÁLCULOS NI VALIDACIONES DE PAGOS
  const alMenosUnaOpcion = Object.values(opcionesProcesamiento).some(Boolean);
  const clienteTieneWhatsApp = ventaData.cliente?.telefono;
  const clienteTieneEmail = ventaData.cliente?.email;

  const handleToggleOpcion = (opcion, valor) => {
    onOpcionesChange({ [opcion]: valor });
  };

  //  FUNCIONES DE PROCESAMIENTO MEJORADAS
  const handleGenerarPDF = async () => {
    try {
      console.log(' FinalizarVentaPanel - handleGenerarPDF:', { 
        descuento, 
        ventaDataDescuento: ventaData.descuentoAutorizado,
        totalBs: ventaData.totalBs,
        codigoVenta 
      });
      
      //  AGREGAR USUARIO ACTUAL
      const ventaDataConUsuario = {
        ...ventaData,
        usuario: ventaData.usuario || { nombre: 'Sistema' }
      };
      
      await descargarPDF(ventaDataConUsuario, codigoVenta, tasaCambio, descuento);
      toast.success('PDF descargado exitosamente');
    } catch (error) {
      toast.error('Error al generar PDF: ' + error.message);
      console.error('Error PDF:', error);
    }
  };

  const handleImprimirTermica = async () => {
    try {
      console.log(' FinalizarVentaPanel - handleImprimirTermica:', { 
        descuento, 
        ventaDataDescuento: ventaData.descuentoAutorizado,
        motivoDescuento: ventaData.motivoDescuento,
        totalBs: ventaData.totalBs,
        codigoVenta 
      });
      
      //  AGREGAR USUARIO ACTUAL
      const ventaDataConUsuario = {
        ...ventaData,
        usuario: ventaData.usuario || { nombre: 'Sistema' }
      };
      
      await imprimirFacturaTermica(ventaDataConUsuario, codigoVenta, tasaCambio, descuento);
      toast.success('Enviando a impresora térmica...');
    } catch (error) {
      toast.error('Error al imprimir en térmica: ' + error.message);
      console.error('Error impresión térmica:', error);
    }
  };

  const handleEnviarWhatsApp = async () => {
    try {
      if (!ventaData.cliente?.telefono) {
        toast.error('El cliente no tiene teléfono registrado');
        return;
      }

      console.log(' ===== INICIANDO ENVÍO WHATSAPP =====');
      console.log(' ventaData completa:', ventaData);
      console.log(' codigoVenta:', codigoVenta);
      console.log(' tasaCambio:', tasaCambio);
      console.log(' descuento:', descuento);

      toast.loading('Generando imagen para WhatsApp...', { id: 'whatsapp-sending' });
      
      //  AGREGAR USUARIO ACTUAL
      const ventaDataConUsuario = {
        ...ventaData,
        usuario: ventaData.usuario || { nombre: 'Sistema' }
      };
      
      const imagenBase64 = await generarImagenWhatsApp(ventaDataConUsuario, codigoVenta, tasaCambio, descuento);
      
      console.log(' Imagen generada exitosamente, enviando...');
      console.log(' Tamaño imagen:', Math.round(imagenBase64.length / 1024), 'KB');
      
      toast.loading('Enviando por WhatsApp...', { id: 'whatsapp-sending' });
      
      const response = await api.post('/whatsapp/enviar-factura', {
        numero: ventaData.cliente.telefono,
        clienteNombre: ventaData.cliente.nombre,
        codigoVenta: codigoVenta,
        imagen: imagenBase64,
        mensaje: `Hola ${ventaData.cliente.nombre || 'Cliente'}, aquí tienes tu comprobante de compra #${codigoVenta}. ¡Gracias por su compra! `
      });
      
      if (response.data.success) {
        if (response.data.data?.tipo_fallback === 'simple_sin_imagen') {
          toast.success('Comprobante enviado por WhatsApp (sin imagen)', {
            id: 'whatsapp-sending',
            duration: 6000,
          });
        } else if (response.data.data?.fallback) {
          toast.success('Mensaje enviado (imagen falló, pero texto OK)', {
            id: 'whatsapp-sending',
            duration: 5000,
          });
        } else {
          toast.success('Comprobante con imagen enviado exitosamente', {
            id: 'whatsapp-sending',
            duration: 5000,
          });
        }
      } else {
        throw new Error(response.data.message || 'Error enviando WhatsApp');
      }
    } catch (error) {
      console.error(' Error enviando WhatsApp:', error);
      
      const errorData = error.response?.data;
      
      if (errorData?.tipo === 'desconectado') {
        toast.error('WhatsApp no está conectado\n\n Ve a Configuración → WhatsApp', {
          id: 'whatsapp-sending',
          duration: 8000
        });
      } else if (errorData?.tipo === 'error_total') {
        toast.error('WhatsApp no pudo enviar el mensaje\n\n Verifica la conexión en Configuración', {
          id: 'whatsapp-sending',
          duration: 8000
        });
      } else {
        toast.error('Error enviando por WhatsApp: ' + (errorData?.message || error.message), {
          id: 'whatsapp-sending',
          duration: 5000
        });
      }
    }
  };

  //  NUEVA FUNCIÓN - Enviar por Email
  const handleEnviarEmail = async () => {
    try {
      if (!ventaData.cliente?.email) {
        toast.error('El cliente no tiene email registrado');
        return;
      }

      toast.loading('Generando PDF para email...', { id: 'email-sending' });
      
      //  AGREGAR USUARIO ACTUAL
      const ventaDataConUsuario = {
        ...ventaData,
        usuario: ventaData.usuario || { nombre: 'Sistema' }
      };
      
      const pdfBlob = await generarPDFFactura(ventaDataConUsuario, codigoVenta, tasaCambio, descuento);
      
      // Convertir blob a base64 para enviar al backend
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const pdfBase64 = reader.result.split(',')[1]; // Remover prefijo data:application/pdf;base64,
          
          toast.loading('Enviando por email...', { id: 'email-sending' });
          
          const response = await api.post('/email/enviar-factura', {
            destinatario: ventaData.cliente.email,
            clienteNombre: ventaData.cliente.nombre,
            codigoVenta: codigoVenta,
            pdfBase64: pdfBase64,
            asunto: `Comprobante #${codigoVenta} - Electro Shop Morandín`,
            mensaje: `Estimado(a) ${ventaData.cliente.nombre || 'Cliente'},\n\nAdjunto encontrará su comprobante de compra #${codigoVenta}.\n\nGracias por su compra.\n\nSaludos cordiales,\nElectro Shop Morandín C.A.`
          });
          
          if (response.data.success) {
            toast.success('Comprobante enviado por email exitosamente', {
              id: 'email-sending',
              duration: 5000
            });
          } else {
            throw new Error(response.data.message || 'Error enviando email');
          }
        } catch (error) {
          console.error('Error enviando email:', error);
          toast.error('Error enviando email: ' + (error.response?.data?.message || error.message), {
            id: 'email-sending'
          });
        }
      };
      
      reader.readAsDataURL(pdfBlob);
      
    } catch (error) {
      console.error('Error preparando email:', error);
      toast.error('Error preparando email: ' + error.message, {
        id: 'email-sending'
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/*  RESUMEN FINAL DE LA VENTA - PREMIUM COMPACTO */}
      <div className="relative bg-gradient-to-br from-emerald-50 via-blue-50 to-emerald-50 border-2 border-emerald-300/50 rounded-2xl p-4 shadow-lg backdrop-blur-sm overflow-hidden">
        {/* Efecto de brillo sutil */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50"></div>
        
        <div className="relative">
          {/* Header compacto */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-1.5 rounded-lg shadow-md">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-bold bg-gradient-to-r from-emerald-900 to-blue-900 bg-clip-text text-transparent">
                Resumen Final
              </h3>
            </div>
          </div>
          
          {/* Grid compacto horizontal */}
          <div className="grid grid-cols-3 gap-2">
            {/* Cliente compacto */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2.5 border border-emerald-200/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-1.5 mb-1.5">
                <div className="bg-blue-100 p-1 rounded-lg">
                  <User className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Cliente</span>
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-gray-900 text-xs truncate leading-tight">
                  {ventaData.cliente?.nombre || 'Sin cliente'}
                </div>
                {ventaData.cliente?.cedula_rif && (
                  <div className="text-[10px] text-gray-500 truncate">{ventaData.cliente.cedula_rif}</div>
              )}
                <div className="flex items-center space-x-1 flex-wrap gap-y-0.5">
              {ventaData.cliente?.telefono && (
                    <div className="flex items-center space-x-0.5 text-[10px] text-gray-500">
                      <Phone className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[60px]">{ventaData.cliente.telefono}</span>
                </div>
              )}
              {ventaData.cliente?.email && (
                    <div className="flex items-center space-x-0.5 text-[10px] text-gray-500">
                      <Mail className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[60px]">{ventaData.cliente.email.split('@')[0]}</span>
                </div>
              )}
            </div>
          </div>
            </div>

            {/* Productos compacto */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2.5 border border-emerald-200/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-1.5 mb-1.5">
                <div className="bg-green-100 p-1 rounded-lg">
                  <Package className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Productos</span>
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-gray-900 text-xs">
                  {ventaData.items.reduce((sum, item) => sum + (item.cantidad || 0), 0)} items
                </div>
                <div className="text-[10px] text-gray-500">
                  {ventaData.items.length} únicos
              </div>
              <button
                onClick={() => setMostrarDetalles(!mostrarDetalles)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium mt-0.5 flex items-center space-x-0.5"
              >
                  <span>{mostrarDetalles ? '▲' : '▼'}</span>
                  <span>{mostrarDetalles ? 'Ocultar' : 'Detalles'}</span>
              </button>
            </div>
            </div>

            {/* Totales compacto */}
            <div className="bg-gradient-to-br from-emerald-100 to-blue-100 rounded-xl p-2.5 border-2 border-emerald-300/50 shadow-sm">
              <div className="flex items-center space-x-1.5 mb-1.5">
                <div className="bg-emerald-500 p-1 rounded-lg">
                  <DollarSign className="h-3 w-3 text-white" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">Totales</span>
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-emerald-900 text-xs">
                  {formatearVenezolano(ventaData.totalBs)} Bs
                </div>
                <div className="text-[10px] text-emerald-700">
                  {formatearVenezolano(ventaData.totalUsd)} USD
                </div>
                {descuento > 0 && (
                  <div className="text-[10px] text-orange-600 font-medium">
                    -{formatearVenezolano(descuento)} Bs desc.
                  </div>
                )}
              </div>
          </div>
        </div>

          {/* Detalles expandibles compactos */}
        {mostrarDetalles && (
            <div className="mt-2 bg-white/90 backdrop-blur-sm rounded-xl p-2.5 border border-emerald-200/50 shadow-sm">
              <h5 className="font-semibold text-gray-900 mb-1.5 text-xs flex items-center">
                <Package className="h-3 w-3 mr-1 text-emerald-600" />
                Detalle de Productos:
              </h5>
              <div className="space-y-1 max-h-20 overflow-y-auto">
              {ventaData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-[10px] py-0.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700 truncate flex-1 mr-2">
                    {item.cantidad}× {item.descripcion}
                  </span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                    {formatearVenezolano(item.subtotal * (ventaData.totalBs / ventaData.totalUsd))} Bs
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/*  OPCIONES DE PROCESAMIENTO - PREMIUM */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-lg mr-3 shadow-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Opciones de Procesamiento
            </span>
        </h4>
          <div className="flex items-center space-x-3">
            {alMenosUnaOpcion && (
              <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-emerald-700">
                  {Object.values(opcionesProcesamiento).filter(Boolean).length} activa{Object.values(opcionesProcesamiento).filter(Boolean).length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {!alMenosUnaOpcion && (
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-xl px-3 py-2 shadow-lg border-2 border-white/50 backdrop-blur-sm animate-pulse">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-white" />
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Selecciona al menos una opción</div>
                    <div className="text-[10px] text-white/90 leading-tight">Elige una forma de procesar la venta</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          
          {/*  PREMIUM TOGGLE: Generar PDF */}
          <div 
            className={`group relative rounded-2xl cursor-pointer transition-all duration-300 ${
              opcionesProcesamiento.imprimirRecibo 
                ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-2 border-orange-400 shadow-xl shadow-orange-200/50 transform scale-[1.02]' 
                : 'bg-white border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg'
            }`}
            onClick={() => handleToggleOpcion('imprimirRecibo', !opcionesProcesamiento.imprimirRecibo)}
          >
            {/* Badge de check premium - FUERA del overflow */}
            {opcionesProcesamiento.imprimirRecibo && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg ring-4 ring-white z-50 animate-bounce">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            
            <div className="overflow-hidden rounded-2xl">
              {/* Efecto de brillo cuando está activa */}
              {opcionesProcesamiento.imprimirRecibo && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
              )}
            
            <div className="p-5 flex flex-col items-center text-center space-y-3">
              {/* Icono premium con fondo degradado */}
              <div className={`relative p-4 rounded-2xl transition-all duration-300 ${
                opcionesProcesamiento.imprimirRecibo 
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30 scale-105' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-orange-50 group-hover:to-orange-100'
              }`}>
                <FileDown className={`h-7 w-7 transition-all duration-300 ${
                  opcionesProcesamiento.imprimirRecibo ? 'text-white' : 'text-gray-500 group-hover:text-orange-600'
                }`} />
                {opcionesProcesamiento.imprimirRecibo && (
                  <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
                )}
              </div>
              
              <div className="space-y-1">
                <h5 className={`text-sm font-bold transition-colors ${
                  opcionesProcesamiento.imprimirRecibo ? 'text-orange-900' : 'text-gray-800 group-hover:text-orange-700'
              }`}>
                Generar PDF
              </h5>
                <p className={`text-xs transition-colors ${
                  opcionesProcesamiento.imprimirRecibo ? 'text-orange-700' : 'text-gray-500'
                }`}>
                  Recibo digital
                </p>
              </div>
              
              {opcionesProcesamiento.imprimirRecibo && (
                <div className="mt-1 px-2 py-1 bg-orange-100 rounded-full">
                  <span className="text-xs text-orange-700 font-semibold">
                    ✓ Descarga automática
                  </span>
                </div>
              )}
            </div>
            </div>
          </div>

          {/*  PREMIUM TOGGLE: Imprimir Factura */}
          <div 
            className={`group relative rounded-2xl cursor-pointer transition-all duration-300 ${
              opcionesProcesamiento.generarFactura 
                ? 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 border-2 border-blue-400 shadow-xl shadow-blue-200/50 transform scale-[1.02]' 
                : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg'
            }`}
            onClick={() => handleToggleOpcion('generarFactura', !opcionesProcesamiento.generarFactura)}
          >
            {/* Badge de check premium - FUERA del overflow */}
            {opcionesProcesamiento.generarFactura && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg ring-4 ring-white z-50 animate-bounce">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            
            <div className="overflow-hidden rounded-2xl">
              {/* Efecto de brillo cuando está activa */}
              {opcionesProcesamiento.generarFactura && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
              )}
            
            <div className="p-5 flex flex-col items-center text-center space-y-3">
              {/* Icono premium con fondo degradado */}
              <div className={`relative p-4 rounded-2xl transition-all duration-300 ${
                opcionesProcesamiento.generarFactura 
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30 scale-105' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-50 group-hover:to-blue-100'
              }`}>
                <Printer className={`h-7 w-7 transition-all duration-300 ${
                  opcionesProcesamiento.generarFactura ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                }`} />
                {opcionesProcesamiento.generarFactura && (
                  <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
                )}
              </div>
              
              <div className="space-y-1">
                <h5 className={`text-sm font-bold transition-colors ${
                  opcionesProcesamiento.generarFactura ? 'text-blue-900' : 'text-gray-800 group-hover:text-blue-700'
              }`}>
                Imprimir Factura
              </h5>
                <p className={`text-xs transition-colors ${
                  opcionesProcesamiento.generarFactura ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  80mm directo
                </p>
              </div>
              
              {opcionesProcesamiento.generarFactura && (
                <div className="mt-1 px-2 py-1 bg-blue-100 rounded-full">
                  <span className="text-xs text-blue-700 font-semibold">
                    ✓ Enviado a impresora
                  </span>
                </div>
              )}
            </div>
            </div>
          </div>

          {/*  PREMIUM TOGGLE: WhatsApp */}
          <div 
            className={`group relative rounded-2xl transition-all duration-300 ${
              !clienteTieneWhatsApp 
                ? 'bg-gray-50 border-2 border-gray-200 cursor-not-allowed opacity-50'
                : opcionesProcesamiento.enviarWhatsApp 
                  ? 'bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-2 border-green-400 shadow-xl shadow-green-200/50 transform scale-[1.02] cursor-pointer' 
                  : 'bg-white border-2 border-gray-200 hover:border-green-300 hover:shadow-lg cursor-pointer'
            }`}
            onClick={() => {
              if (clienteTieneWhatsApp) {
                handleToggleOpcion('enviarWhatsApp', !opcionesProcesamiento.enviarWhatsApp);
              }
            }}
          >
            {/* Badge de check premium - FUERA del overflow */}
            {opcionesProcesamiento.enviarWhatsApp && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg ring-4 ring-white z-50 animate-bounce">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            
            <div className="overflow-hidden rounded-2xl">
              {/* Efecto de brillo cuando está activa */}
              {opcionesProcesamiento.enviarWhatsApp && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
              )}
            
            <div className="p-5 flex flex-col items-center text-center space-y-3">
              {/* Icono premium con fondo degradado */}
              <div className={`relative p-4 rounded-2xl transition-all duration-300 ${
                !clienteTieneWhatsApp ? 'bg-gradient-to-br from-gray-100 to-gray-200' :
                opcionesProcesamiento.enviarWhatsApp 
                  ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30 scale-105' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-green-50 group-hover:to-green-100'
              }`}>
                <MessageCircle className={`h-7 w-7 transition-all duration-300 ${
                  !clienteTieneWhatsApp ? 'text-gray-300' :
                  opcionesProcesamiento.enviarWhatsApp ? 'text-white' : 'text-gray-500 group-hover:text-green-600'
                }`} />
                {opcionesProcesamiento.enviarWhatsApp && (
                  <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
                )}
              </div>
              
              <div className="space-y-1">
                <h5 className={`text-sm font-bold transition-colors ${
                !clienteTieneWhatsApp ? 'text-gray-400' :
                  opcionesProcesamiento.enviarWhatsApp ? 'text-green-900' : 'text-gray-800 group-hover:text-green-700'
              }`}>
                Enviar WhatsApp
              </h5>
                <p className={`text-xs transition-colors ${
                  !clienteTieneWhatsApp ? 'text-gray-400' :
                  opcionesProcesamiento.enviarWhatsApp ? 'text-green-700' : 'text-gray-500'
                }`}>
                {!clienteTieneWhatsApp ? 'Sin teléfono' : 'Al cliente'}
              </p>
              </div>
              
              {opcionesProcesamiento.enviarWhatsApp && clienteTieneWhatsApp && (
                <div className="mt-1 px-2 py-1 bg-green-100 rounded-full">
                  <span className="text-xs text-green-700 font-semibold truncate max-w-[120px]">
                    ✓ {ventaData.cliente?.telefono}
                  </span>
                </div>
              )}
            </div>
            </div>
          </div>

          {/*  PREMIUM TOGGLE: Email */}
          <div 
            className={`group relative rounded-2xl transition-all duration-300 ${
              !clienteTieneEmail 
                ? 'bg-gray-50 border-2 border-gray-200 cursor-not-allowed opacity-50'
                : opcionesProcesamiento.enviarEmail 
                  ? 'bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 border-2 border-purple-400 shadow-xl shadow-purple-200/50 transform scale-[1.02] cursor-pointer' 
                  : 'bg-white border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg cursor-pointer'
            }`}
            onClick={() => {
              if (clienteTieneEmail) {
                handleToggleOpcion('enviarEmail', !opcionesProcesamiento.enviarEmail);
              }
            }}
          >
            {/* Badge de check premium - FUERA del overflow */}
            {opcionesProcesamiento.enviarEmail && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg ring-4 ring-white z-50 animate-bounce">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            
            <div className="overflow-hidden rounded-2xl">
              {/* Efecto de brillo cuando está activa */}
              {opcionesProcesamiento.enviarEmail && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
              )}
            
            <div className="p-5 flex flex-col items-center text-center space-y-3">
              {/* Icono premium con fondo degradado */}
              <div className={`relative p-4 rounded-2xl transition-all duration-300 ${
                !clienteTieneEmail ? 'bg-gradient-to-br from-gray-100 to-gray-200' :
                opcionesProcesamiento.enviarEmail 
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30 scale-105' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-50 group-hover:to-purple-100'
              }`}>
                <Mail className={`h-7 w-7 transition-all duration-300 ${
                  !clienteTieneEmail ? 'text-gray-300' :
                  opcionesProcesamiento.enviarEmail ? 'text-white' : 'text-gray-500 group-hover:text-purple-600'
                }`} />
                {opcionesProcesamiento.enviarEmail && (
                  <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
                )}
              </div>
              
              <div className="space-y-1">
                <h5 className={`text-sm font-bold transition-colors ${
                !clienteTieneEmail ? 'text-gray-400' :
                  opcionesProcesamiento.enviarEmail ? 'text-purple-900' : 'text-gray-800 group-hover:text-purple-700'
              }`}>
                Enviar Email
              </h5>
                <p className={`text-xs transition-colors ${
                  !clienteTieneEmail ? 'text-gray-400' :
                  opcionesProcesamiento.enviarEmail ? 'text-purple-700' : 'text-gray-500'
                }`}>
                {!clienteTieneEmail ? 'Sin email' : 'Al cliente'}
              </p>
              </div>
              
              {opcionesProcesamiento.enviarEmail && clienteTieneEmail && (
                <div className="mt-1 px-2 py-1 bg-purple-100 rounded-full">
                  <span className="text-xs text-purple-700 font-semibold truncate max-w-[120px]">
                    ✓ {ventaData.cliente?.email?.split('@')[0]}...
                  </span>
                </div>
              )}
            </div>
            </div>
          </div>

        </div>
      </div>


    </div>
  );
};

export default FinalizarVentaPanel;