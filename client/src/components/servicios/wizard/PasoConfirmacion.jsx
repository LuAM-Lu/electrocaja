// components/servicios/wizard/PasoConfirmacion.jsx
import React, { useState } from 'react';
import {
  User, Smartphone, Package, Calendar,
  DollarSign, Clock, Star, Camera,
  MessageCircle, Printer, CheckCircle, Wrench
} from 'lucide-react';

export default function PasoConfirmacion({ datos, onActualizar, loading }) {
  const [opcionesProcesamiento, setOpcionesProcesamiento] = useState({
    enviarWhatsapp: false,
    imprimir: false
  });

  const calcularTotal = () => {
    const totalItems = (datos.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    return totalItems;
  };

  const toggleOpcion = (opcion) => {
    setOpcionesProcesamiento(prev => ({
      ...prev,
      [opcion]: !prev[opcion]
    }));
  };

  // Obtener problemas como array
  const problemasArray = Array.isArray(datos.dispositivo.problemas) 
    ? datos.dispositivo.problemas 
    : datos.dispositivo.problema 
      ? [datos.dispositivo.problema] 
      : [];

  const total = calcularTotal();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* COLUMNA IZQUIERDA 60% - TÉCNICO, ITEMS Y RESUMEN */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* TÉCNICO Y OBSERVACIONES */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-yellow-400" />
              Diagnóstico
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Técnico asignado:</span>
                <span className="text-gray-100 font-medium">{datos.diagnostico.tecnico || 'No asignado'}</span>
              </div>
              
              {datos.diagnostico.observaciones && (
                <div>
                  <div className="text-gray-400 text-sm mb-1">Observaciones:</div>
                  <div className="bg-gray-700/50 p-2 rounded text-gray-200 text-sm">
                    {datos.diagnostico.observaciones}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ITEMS/SERVICIOS */}
          {datos.items && datos.items.length > 0 && (
            <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-400" />
                Items y Servicios Estimados
              </h3>
              
              <div className="space-y-2">
                {datos.items.map((item, index) => (
                  <div key={item.id || index} className="flex justify-between items-center p-2 bg-gray-700/30 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-100 text-sm">{item.descripcion}</div>
                      {item.esPersonalizado && (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-300">
                          <Star className="h-3 w-3" />
                          Personalizado
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-gray-100 text-sm">
                        {item.cantidad} × ${item.precio_unitario.toFixed(2)}
                      </div>
                      <div className="text-emerald-400 font-semibold text-sm">
                        ${(item.cantidad * item.precio_unitario).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESUMEN FINANCIERO */}
          <div className="bg-gradient-to-br from-emerald-800/40 to-emerald-900/40 rounded-xl p-4 border border-emerald-700/50">
            <h3 className="text-lg font-semibold text-emerald-100 mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Resumen
            </h3>
            
            <div className="space-y-2">
              {datos.items && datos.items.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-200">Items/Servicios:</span>
                  <span className="text-emerald-100 font-medium">
                    ${datos.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-emerald-700/50 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-100 font-semibold">Total Estimado:</span>
                  <span className="text-emerald-100 font-bold text-xl">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {total === 0 && (
                <div className="text-center text-emerald-300 text-sm italic">
                  Sin costos estimados aún
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA 40% - CLIENTE Y DISPOSITIVO */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* INFORMACIÓN DEL CLIENTE - LAYOUT COMPACTO */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              Cliente
            </h3>
            
            {datos.cliente ? (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                <div className="space-y-2">
                  {/* Grid 2x2 para información del cliente */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <div className="text-blue-300 text-xs">CI/RIF:</div>
                      <div className="text-blue-100 font-semibold">
                        {datos.cliente.cedula_rif || 'No especificado'}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-xs">Nombre:</div>
                      <div className="text-blue-100 font-semibold">
                        {datos.cliente.nombre || 'No especificado'}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-xs">TLF:</div>
                      <div className="text-blue-100 font-semibold">
                        {datos.cliente.telefono || 'No especificado'}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-xs">Dirección:</div>
                      <div className="text-blue-100 font-semibold text-xs">
                        {datos.cliente.direccion || 'No especificada'}
                      </div>
                    </div>
                  </div>

                  {/* Email en fila separada si existe */}
                  {datos.cliente.email && (
                    <div className="pt-1 border-t border-blue-700/30">
                      <div className="text-blue-300 text-xs">Email:</div>
                      <div className="text-blue-100 font-semibold text-xs">
                        {datos.cliente.email}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 italic text-center py-4">
                No hay cliente seleccionado
              </div>
            )}
          </div>

          {/* INFORMACIÓN DEL DISPOSITIVO - LAYOUT COMPACTO */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-400" />
              Dispositivo
            </h3>
            
            <div className="space-y-3">
              {/* Grid 2x2 para información básica */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <div className="text-gray-400 text-xs">Marca</div>
                  <div className="text-gray-100 font-semibold">
                    {datos.dispositivo.marca || 'No especificada'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Modelo</div>
                  <div className="text-gray-100 font-semibold">
                    {datos.dispositivo.modelo || 'No especificado'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Color</div>
                  <div className="text-gray-100 font-semibold">
                    {datos.dispositivo.color || 'No especificado'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">IMEI/Serial</div>
                  <div className="text-gray-100 font-semibold font-mono text-xs">
                    {datos.dispositivo.imei || 'No especificado'}
                  </div>
                </div>
              </div>

              {/* Accesorios */}
              {datos.dispositivo.accesorios && datos.dispositivo.accesorios.length > 0 && (
                <div>
                  <div className="text-gray-400 text-xs mb-1">Accesorios</div>
                  <div className="flex flex-wrap gap-1">
                    {datos.dispositivo.accesorios.map((accesorio, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-700/30 text-green-300 rounded text-xs font-medium border border-green-600/30"
                      >
                        {accesorio}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Problemas reportados */}
              {problemasArray.length > 0 && (
                <div>
                  <div className="text-gray-400 text-xs mb-1">Problemas</div>
                  <div className="flex flex-wrap gap-1">
                    {problemasArray.map((problema, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-700/30 text-red-200 rounded text-xs font-medium border border-red-600/30"
                      >
                        {problema}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidencias */}
              {datos.dispositivo.evidencias && datos.dispositivo.evidencias.length > 0 && (
                <div>
                  <div className="text-gray-400 text-xs mb-1 flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    Fotos ({datos.dispositivo.evidencias.length})
                  </div>
                  <div className="flex gap-1">
                    {datos.dispositivo.evidencias.slice(0, 3).map(evidencia => (
                      <img
                        key={evidencia.id}
                        src={evidencia.file}
                        alt={evidencia.name}
                        className="w-10 h-10 object-cover rounded border border-gray-600 flex-shrink-0"
                      />
                    ))}
                    {datos.dispositivo.evidencias.length > 3 && (
                      <div className="w-10 h-10 bg-gray-700 border border-gray-600 rounded flex items-center justify-center text-xs text-gray-400">
                        +{datos.dispositivo.evidencias.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OPCIONES DE PROCESAMIENTO - ANCHO COMPLETO */}
      <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-400" />
          Opciones de Procesamiento
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WhatsApp Toggle */}
          <button
            onClick={() => toggleOpcion('enviarWhatsapp')}
            className={`p-4 rounded-lg border-2 transition-all ${
              opcionesProcesamiento.enviarWhatsapp
                ? 'border-green-500 bg-green-600/20 text-green-200'
                : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Enviar WhatsApp</div>
                  <div className="text-xs opacity-75">Notificar al cliente por WhatsApp</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                opcionesProcesamiento.enviarWhatsapp
                  ? 'border-green-400 bg-green-500'
                  : 'border-gray-400'
              }`}>
                {opcionesProcesamiento.enviarWhatsapp && (
                  <CheckCircle className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
          </button>

          {/* Imprimir Toggle */}
          <button
            onClick={() => toggleOpcion('imprimir')}
            className={`p-4 rounded-lg border-2 transition-all ${
              opcionesProcesamiento.imprimir
                ? 'border-blue-500 bg-blue-600/20 text-blue-200'
                : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Printer className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Imprimir Orden</div>
                  <div className="text-xs opacity-75">Generar orden de servicio impresa</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                opcionesProcesamiento.imprimir
                  ? 'border-blue-400 bg-blue-500'
                  : 'border-gray-400'
              }`}>
                {opcionesProcesamiento.imprimir && (
                  <CheckCircle className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}