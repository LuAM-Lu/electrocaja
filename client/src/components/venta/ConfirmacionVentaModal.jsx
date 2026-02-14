// components/venta/ConfirmacionVentaModal.jsx - Modal de Confirmación de Venta
import React from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Printer from 'lucide-react/dist/esm/icons/printer'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square'
import Mail from 'lucide-react/dist/esm/icons/mail'

const iconosOpciones = {
  'imprimirRecibo': FileText,
  'generarFactura': Printer,
  'enviarWhatsApp': MessageSquare,
  'enviarEmail': Mail
};

const nombresOpciones = {
  'imprimirRecibo': 'Generar PDF',
  'generarFactura': 'Imprimir factura',
  'enviarWhatsApp': 'Enviar WhatsApp',
  'enviarEmail': 'Enviar Email'
};

const estilosBaseOpcion = {
  background: 'bg-emerald-50',
  border: 'border-emerald-200',
  texto: 'text-emerald-700',
  titulo: 'text-emerald-900',
  iconoBg: 'bg-emerald-100',
  icono: 'text-emerald-600'
};

const estilosOpciones = {
  'imprimirRecibo': {
    background: 'bg-orange-50',
    border: 'border-orange-200',
    texto: 'text-orange-700',
    titulo: 'text-orange-900',
    iconoBg: 'bg-orange-100',
    icono: 'text-orange-600'
  },
  'generarFactura': {
    background: 'bg-blue-50',
    border: 'border-blue-200',
    texto: 'text-blue-700',
    titulo: 'text-blue-900',
    iconoBg: 'bg-blue-100',
    icono: 'text-blue-600'
  },
  'enviarWhatsApp': {
    background: 'bg-green-50',
    border: 'border-green-200',
    texto: 'text-green-700',
    titulo: 'text-green-900',
    iconoBg: 'bg-green-100',
    icono: 'text-green-600'
  },
  'enviarEmail': {
    background: 'bg-purple-50',
    border: 'border-purple-200',
    texto: 'text-purple-700',
    titulo: 'text-purple-900',
    iconoBg: 'bg-purple-100',
    icono: 'text-purple-600'
  }
};

const ConfirmacionVentaModal = ({ isOpen, onConfirm, onCancel, opciones = {} }) => {
  if (!isOpen) return null;

  const opcionesActivas = Object.entries(opciones)
    .filter(([key, value]) => value)
    .map(([key]) => ({
      key,
      nombre: nombresOpciones[key] || key,
      Icono: iconosOpciones[key] || AlertCircle,
      estilos: estilosOpciones[key] || estilosBaseOpcion
    }));

  const tieneOpciones = opcionesActivas.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Confirmar Venta</h3>
                <p className="text-sm text-emerald-100">¿Deseas procesar esta venta?</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {tieneOpciones ? (
            <>
              <p className="text-gray-700 font-medium">
                Se ejecutarán las siguientes acciones:
              </p>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="space-y-3">
                  {opcionesActivas.map(({ key, nombre, Icono, estilos }) => (
                    <div
                      key={key}
                      className={`flex items-center space-x-3 border rounded-lg p-3 transition-colors ${estilos.background} ${estilos.border} ${estilos.texto}`}
                    >
                      <div className={`${estilos.iconoBg} p-2 rounded-lg`}>
                        <Icono className={`h-4 w-4 ${estilos.icono}`} />
                      </div>
                      <span className={`font-medium ${estilos.titulo}`}>{nombre}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> La venta se procesará inmediatamente y se ejecutarán todas las acciones seleccionadas.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-700 text-lg">
                ¿Confirmas que deseas procesar esta venta?
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Esta acción no se puede deshacer.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <CheckCircle className="h-5 w-5" />
            <span>Confirmar Venta</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmacionVentaModal;
