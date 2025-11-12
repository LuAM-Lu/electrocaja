// components/servicios/ServicioProcesandoModal.jsx
// Pantalla de carga premium para procesamiento de orden de servicio
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CheckCircle, Loader2, Printer, Wrench } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

const ServicioProcesandoModal = forwardRef(({ 
  isOpen, 
  opcionesProcesamiento, 
  onCompletado
}, ref) => {
  const [pasos, setPasos] = useState([]);
  const [pasoActual, setPasoActual] = useState(0);
  const [procesando, setProcesando] = useState(true);
  const [avanceManual, setAvanceManual] = useState(false);

  // Exponer función para avanzar pasos desde el componente padre
  useImperativeHandle(ref, () => ({
    avanzarPaso: (pasoId) => {
      setAvanceManual(true);
      setPasos(prev => {
        const nuevos = [...prev];
        const indice = nuevos.findIndex(p => p.id === pasoId);
        if (indice !== -1 && !nuevos[indice].completado) {
          nuevos[indice].completado = true;
          setPasoActual(indice + 1);
          
          // Si es el último paso, completar
          if (indice + 1 >= nuevos.length) {
            setProcesando(false);
            if (onCompletado) {
              onCompletado();
            }
          }
          return nuevos;
        }
        return prev;
      });
    },
    completar: () => {
      setProcesando(false);
      if (onCompletado) {
        onCompletado();
      }
    },
    estaListo: () => {
      return pasos.length > 0 && procesando;
    }
  }), [pasos, procesando, onCompletado]);

  // Definir pasos según las opciones seleccionadas
  useEffect(() => {
    if (!isOpen) return;

    const pasosIniciales = [
      { id: 'validando', nombre: 'Validando datos', icon: CheckCircle, completado: false },
      { id: 'creando', nombre: 'Creando orden de servicio', icon: Wrench, completado: false }
    ];

    if (opcionesProcesamiento?.imprimir) {
      pasosIniciales.push({ id: 'imprimir', nombre: 'Imprimiendo ticket térmico', icon: Printer, completado: false });
    }

    if (opcionesProcesamiento?.enviarWhatsapp) {
      pasosIniciales.push({ id: 'whatsapp', nombre: 'Enviando WhatsApp', icon: FaWhatsapp, completado: false });
    }

    pasosIniciales.push({ id: 'finalizando', nombre: 'Finalizando', icon: CheckCircle, completado: false });

    setPasos(pasosIniciales);
    setPasoActual(0);
    setProcesando(true);
    setAvanceManual(false);
  }, [isOpen, opcionesProcesamiento]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4" 
      style={{ pointerEvents: 'auto' }}
      data-procesando-modal="true"
      role="dialog"
      aria-labelledby="processing-title"
      aria-describedby="processing-description"
      aria-modal="true"
      onBlur={(e) => {
        // Prevenir que el modal pierda el foco cuando se abre la ventana de impresión
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="processing-title" className="text-2xl font-bold flex items-center gap-3">
                <Wrench className="h-7 w-7" aria-hidden="true" />
                Procesando Orden de Servicio
              </h2>
              <p id="processing-description" className="text-blue-100 mt-1 text-sm">
                {procesando ? 'Por favor espera...' : '¡Orden completada exitosamente!'}
              </p>
            </div>
            {procesando && (
              <Loader2 className="h-8 w-8 animate-spin" aria-label="Cargando" />
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-8">
          {procesando ? (
            <>
              {/* Lista de pasos */}
              <div className="space-y-4 mb-8">
                {pasos.map((paso, index) => {
                  const Icon = paso.icon;
                  const estaCompletado = paso.completado;
                  const esActual = index === pasoActual && !estaCompletado;
                  
                  return (
                    <div
                      key={paso.id}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                        estaCompletado
                          ? 'bg-blue-500/20 border-2 border-blue-500/50'
                          : esActual
                          ? 'bg-blue-500/20 border-2 border-blue-500/50 animate-pulse'
                          : 'bg-gray-800/50 border-2 border-gray-700/50'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${
                        estaCompletado ? 'text-blue-400' : esActual ? 'text-blue-400' : 'text-gray-500'
                      }`}>
                        {estaCompletado ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : esActual ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold ${
                          estaCompletado ? 'text-blue-300' : esActual ? 'text-blue-300' : 'text-gray-400'
                        }`}>
                          {paso.nombre}
                        </div>
                        {esActual && (
                          <div className="text-xs text-gray-400 mt-1" aria-live="polite" aria-atomic="true">
                            En progreso...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barra de progreso */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Progreso</span>
                  <span>{Math.round(((pasoActual + (pasos[pasoActual]?.completado ? 1 : 0)) / pasos.length) * 100)}%</span>
                </div>
                <div 
                  className="w-full bg-gray-700 rounded-full h-3 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(((pasoActual + (pasos[pasoActual]?.completado ? 1 : 0)) / pasos.length) * 100)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label={`Progreso: ${Math.round(((pasoActual + (pasos[pasoActual]?.completado ? 1 : 0)) / pasos.length) * 100)}%`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((pasoActual + (pasos[pasoActual]?.completado ? 1 : 0)) / pasos.length) * 100}%`
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Pantalla de éxito */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-500/20 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">¡Orden Completada!</h3>
                <p className="text-gray-400 mb-4">Todos los procesos se ejecutaron correctamente</p>
                <p className="text-gray-300 text-sm animate-pulse">
                  Cerrando wizard...
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ServicioProcesandoModal.displayName = 'ServicioProcesandoModal';

export default ServicioProcesandoModal;

