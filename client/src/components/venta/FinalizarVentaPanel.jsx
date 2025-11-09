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
      
      {/*  RESUMEN FINAL DE LA VENTA - COMPACTO VERTICAL */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="text-lg font-bold text-emerald-900 mb-3 flex items-center">
          <ShoppingCart className="h-5 w-5 mr-2" />
          Resumen Final de Venta
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* COLUMNA 1: Cliente */}
          <div className="bg-white rounded-lg p-3 border-2 border-emerald-200">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-700 uppercase">Cliente</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="font-semibold text-gray-900 truncate">
                {ventaData.cliente?.nombre || 'Sin cliente seleccionado'}
              </div>
              {ventaData.cliente?.cedula_rif && (
                <div className="text-gray-600 text-xs">{ventaData.cliente.cedula_rif}</div>
              )}
              {ventaData.cliente?.telefono && (
                <div className="flex items-center space-x-1 text-gray-500 text-xs">
                  <Phone className="h-3 w-3" />
                  <span>{ventaData.cliente.telefono}</span>
                </div>
              )}
              {ventaData.cliente?.email && (
                <div className="flex items-center space-x-1 text-gray-500 text-xs">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{ventaData.cliente.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 2: Productos */}
          <div className="bg-white rounded-lg p-3 border-2 border-emerald-200">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-gray-700 uppercase">Productos</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="font-semibold text-gray-900">
                {ventaData.items.reduce((sum, item) => sum + (item.cantidad || 0), 0)} items
              </div>
              <div className="text-gray-600 text-xs">
                {ventaData.items.length} productos únicos
              </div>
              <button
                onClick={() => setMostrarDetalles(!mostrarDetalles)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>{mostrarDetalles ? 'Ocultar' : 'Ver'} detalles</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detalles expandibles */}
        {mostrarDetalles && (
          <div className="bg-white rounded-lg p-3 border mt-3">
            <h5 className="font-medium text-gray-900 mb-2 text-sm">Detalle de Productos:</h5>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {ventaData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="text-gray-700">
                    {item.cantidad}× {item.descripcion}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatearVenezolano(item.subtotal * (ventaData.totalBs / ventaData.totalUsd))} Bs
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/*  OPCIONES DE PROCESAMIENTO */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-emerald-600" />
          Opciones de Procesamiento
        </h4>

        <div className="grid grid-cols-4 gap-3">
          
          {/*  TOGGLE: Generar PDF */}
          <div 
            className={`border-2 rounded-xl p-3 cursor-pointer transition-all relative ${
              opcionesProcesamiento.imprimirRecibo 
                ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-200' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => handleToggleOpcion('imprimirRecibo', !opcionesProcesamiento.imprimirRecibo)}
          >
            {/* Burbuja de check cuando está activa */}
            {opcionesProcesamiento.imprimirRecibo && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
            
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-2 rounded-lg ${
                opcionesProcesamiento.imprimirRecibo ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <FileDown className={`h-5 w-5 ${
                  opcionesProcesamiento.imprimirRecibo ? 'text-orange-600' : 'text-gray-400'
                }`} />
              </div>
              <h5 className={`text-sm font-medium ${
                opcionesProcesamiento.imprimirRecibo ? 'text-orange-900' : 'text-gray-700'
              }`}>
                Generar PDF
              </h5>
              <p className="text-xs text-gray-500">Recibo digital</p>
              {opcionesProcesamiento.imprimirRecibo && (
                <div className="text-xs text-orange-600 font-medium">
                   Se descargará automáticamente
                </div>
              )}
            </div>
          </div>

          {/*  TOGGLE: Imprimir Factura */}
          <div 
            className={`border-2 rounded-xl p-3 cursor-pointer transition-all relative ${
              opcionesProcesamiento.generarFactura 
                ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => handleToggleOpcion('generarFactura', !opcionesProcesamiento.generarFactura)}
          >
            {opcionesProcesamiento.generarFactura && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
            
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-2 rounded-lg ${
                opcionesProcesamiento.generarFactura ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Printer className={`h-5 w-5 ${
                  opcionesProcesamiento.generarFactura ? 'text-blue-600' : 'text-gray-400'
                }`} />
              </div>
              <h5 className={`text-sm font-medium ${
                opcionesProcesamiento.generarFactura ? 'text-blue-900' : 'text-gray-700'
              }`}>
                Imprimir Factura
              </h5>
              <p className="text-xs text-gray-500">80mm directo</p>
              {opcionesProcesamiento.generarFactura && (
                <div className="text-xs text-blue-600 font-medium">
                   Se enviará a impresora
                </div>
              )}
            </div>
          </div>

          {/*  TOGGLE: WhatsApp */}
          <div 
            className={`border-2 rounded-xl p-3 transition-all relative ${
              !clienteTieneWhatsApp 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                : opcionesProcesamiento.enviarWhatsApp 
                  ? 'border-green-300 bg-green-50 cursor-pointer ring-2 ring-green-200' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer'
            }`}
            onClick={() => {
              if (clienteTieneWhatsApp) {
                handleToggleOpcion('enviarWhatsApp', !opcionesProcesamiento.enviarWhatsApp);
              }
            }}
          >
            {opcionesProcesamiento.enviarWhatsApp && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
            
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-2 rounded-lg ${
                !clienteTieneWhatsApp ? 'bg-gray-100' :
                opcionesProcesamiento.enviarWhatsApp ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <MessageCircle className={`h-5 w-5 ${
                  !clienteTieneWhatsApp ? 'text-gray-300' :
                  opcionesProcesamiento.enviarWhatsApp ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <h5 className={`text-sm font-medium ${
                !clienteTieneWhatsApp ? 'text-gray-400' :
                opcionesProcesamiento.enviarWhatsApp ? 'text-green-900' : 'text-gray-700'
              }`}>
                Enviar WhatsApp
              </h5>
              <p className="text-xs text-gray-500">
                {!clienteTieneWhatsApp ? 'Sin teléfono' : 'Al cliente'}
              </p>
              {opcionesProcesamiento.enviarWhatsApp && clienteTieneWhatsApp && (
                <div className="text-xs text-green-600 font-medium">
                   Se enviará a {ventaData.cliente?.telefono}
                </div>
              )}
            </div>
          </div>

          {/*  TOGGLE: Email */}
          <div 
            className={`border-2 rounded-xl p-3 transition-all relative ${
              !clienteTieneEmail 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                : opcionesProcesamiento.enviarEmail 
                  ? 'border-purple-300 bg-purple-50 cursor-pointer ring-2 ring-purple-200' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer'
            }`}
            onClick={() => {
              if (clienteTieneEmail) {
                handleToggleOpcion('enviarEmail', !opcionesProcesamiento.enviarEmail);
              }
            }}
          >
            {opcionesProcesamiento.enviarEmail && (
              <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
            
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-2 rounded-lg ${
                !clienteTieneEmail ? 'bg-gray-100' :
                opcionesProcesamiento.enviarEmail ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                <Mail className={`h-5 w-5 ${
                  !clienteTieneEmail ? 'text-gray-300' :
                  opcionesProcesamiento.enviarEmail ? 'text-purple-600' : 'text-gray-400'
                }`} />
              </div>
              <h5 className={`text-sm font-medium ${
                !clienteTieneEmail ? 'text-gray-400' :
                opcionesProcesamiento.enviarEmail ? 'text-purple-900' : 'text-gray-700'
              }`}>
                Enviar Email
              </h5>
              <p className="text-xs text-gray-500">
                {!clienteTieneEmail ? 'Sin email' : 'Al cliente'}
              </p>
              {opcionesProcesamiento.enviarEmail && clienteTieneEmail && (
                <div className="text-xs text-purple-600 font-medium">
                   Se enviará a {ventaData.cliente?.email}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/*  VALIDACIONES Y ADVERTENCIAS */}
      {!alMenosUnaOpcion && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h5 className="font-medium text-amber-900">Selecciona al menos una opción</h5>
              <p className="text-sm text-amber-700">
                Debes elegir al menos una forma de procesar la venta (recibo, factura, etc.)
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinalizarVentaPanel;