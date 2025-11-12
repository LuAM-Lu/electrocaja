// components/servicios/wizard/PasoConfirmacion.jsx
import React, { useState, useEffect } from 'react';
import {
  User, Smartphone, Package, Calendar,
  DollarSign, Clock, Star, Camera,
  Printer, CheckCircle, Wrench,
  CreditCard, AlertTriangle
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useCajaStore } from '../../../store/cajaStore';
import { imprimirTicketServicio } from '../../../utils/printUtils.js';
import { api } from '../../../config/api';
import toast from '../../../utils/toast.jsx';
import { delay } from '../../../utils/saleProcessingHelpers';
import { PROCESSING_CONFIG } from '../../../constants/processingConstants';

export default function PasoConfirmacion({ datos, onActualizar, loading, servicioCreado, onAccionesCompletadas, onOpcionesCambio, procesandoModalRef, opcionesProcesamiento: opcionesProcesamientoProp }) {
  const { tasaCambio } = useCajaStore();
  const [opcionesProcesamiento, setOpcionesProcesamiento] = useState({
    enviarWhatsapp: false,
    imprimir: true // 🆕 Por defecto seleccionado
  });
  const [ejecutandoAcciones, setEjecutandoAcciones] = useState(false);
  
  // Usar opciones del prop si están disponibles (desde el modal de procesamiento)
  const opcionesFinales = opcionesProcesamientoProp || opcionesProcesamiento;

  const calcularTotal = () => {
    const totalItems = (datos.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    return totalItems;
  };

  // Notificar cambios en las opciones al componente padre
  useEffect(() => {
    if (onOpcionesCambio) {
      onOpcionesCambio(opcionesProcesamiento);
    }
  }, [opcionesProcesamiento, onOpcionesCambio]);

  // 🆕 Ejecutar acciones cuando se crea el servicio
  useEffect(() => {
    if (servicioCreado && !ejecutandoAcciones) {
      ejecutarAcciones();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioCreado?.id]); // Solo ejecutar cuando cambie el ID del servicio creado

  const ejecutarAcciones = async () => {
    if (!servicioCreado || ejecutandoAcciones) return;
    
    setEjecutandoAcciones(true);
    const accionesEjecutadas = [];

    try {
      // 1. Imprimir si está seleccionado
      if (opcionesFinales.imprimir) {
        try {
          // Avanzar paso de impresión en el modal
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION - 500);
          if (procesandoModalRef?.current) {
            procesandoModalRef.current.avanzarPaso('imprimir');
          }
          
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);
          
          await imprimirTicketServicio(
            servicioCreado,
            { nombre: servicioCreado.usuarioCreador || 'Sistema' },
            servicioCreado.linkSeguimiento,
            servicioCreado.qrCode
          );
          accionesEjecutadas.push('imprimir');
          // ✅ ELIMINADO: toast.success('Ticket impreso exitosamente');
        } catch (error) {
          console.error('Error imprimiendo:', error);
          // ✅ ELIMINADO: toast.error('Error al imprimir: ' + (error.message || 'Error desconocido'));
          // Avanzar paso incluso si falla para no bloquear el flujo
          if (procesandoModalRef?.current) {
            procesandoModalRef.current.avanzarPaso('imprimir');
          }
        }
      }

      // 2. Enviar WhatsApp si está seleccionado
      if (opcionesFinales.enviarWhatsapp) {
        try {
          // Avanzar paso de WhatsApp en el modal
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION - 500);
          if (procesandoModalRef?.current) {
            procesandoModalRef.current.avanzarPaso('whatsapp');
          }
          
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);
          
          // Verificar estado de WhatsApp primero
          const estadoResponse = await api.get('/whatsapp/estado');
          const estadoWhatsApp = estadoResponse.data?.data || estadoResponse.data;
          
          
          if (!estadoWhatsApp || !estadoWhatsApp.conectado) {
            // ✅ ELIMINADO: toast.error('WhatsApp no está conectado. Por favor, conecta WhatsApp primero desde la configuración.');
            console.warn('⚠️ WhatsApp desconectado, no se enviará mensaje');
            // Continuar con el flujo aunque WhatsApp falle
            // Avanzar paso incluso si falla
            if (procesandoModalRef?.current) {
              procesandoModalRef.current.avanzarPaso('whatsapp');
            }
          } else {
            // Enviar WhatsApp solo si está conectado
            const response = await api.post('/whatsapp/enviar-servicio', {
              servicioId: servicioCreado.id,
              numero: servicioCreado.clienteTelefono
            });

            if (response.data.success) {
              accionesEjecutadas.push('whatsapp');
              // ✅ ELIMINADO: toast.success('Mensaje de WhatsApp enviado exitosamente');
            } else {
              throw new Error(response.data.message || 'Error enviando WhatsApp');
            }
          }
        } catch (error) {
          console.error('Error enviando WhatsApp:', error);
          // ✅ ELIMINADO: const mensajeError = error.response?.data?.message || error.message || 'Error desconocido';
          // ✅ ELIMINADO: toast.error('Error al enviar WhatsApp: ' + mensajeError);
          // Avanzar paso incluso si falla para no bloquear el flujo
          if (procesandoModalRef?.current) {
            procesandoModalRef.current.avanzarPaso('whatsapp');
          }
        }
      }

      // Notificar que las acciones se completaron
      if (onAccionesCompletadas) {
        onAccionesCompletadas(accionesEjecutadas);
      }
    } finally {
      setEjecutandoAcciones(false);
    }
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
                <span className="text-gray-100 font-medium">
                  {(() => {
                    const tecnico = datos.diagnostico.tecnico;
                    // Si es un objeto, extraer el nombre
                    if (tecnico && typeof tecnico === 'object') {
                      return tecnico.nombre || tecnico.email || 'No asignado';
                    }
                    // Si es un string, usarlo directamente
                    return tecnico || 'No asignado';
                  })()}
                </span>
              </div>

              {datos.diagnostico.fechaEstimada && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Fecha estimada:</span>
                  <span className="text-blue-400 font-medium">
                    {new Date(datos.diagnostico.fechaEstimada + 'T00:00:00').toLocaleDateString('es-VE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}

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
                        {item.cantidad} × {(item.precio_unitario * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                      </div>
                      <div className="text-emerald-400 font-semibold text-sm">
                        {(item.cantidad * item.precio_unitario * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                      </div>
                      <div className="text-xs text-gray-400">
                        ${(item.cantidad * item.precio_unitario).toFixed(2)} USD
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
                    {(total * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                  </span>
                  <span className="text-emerald-300/70 text-xs ml-2">
                    (${total.toFixed(2)} USD)
                  </span>
                </div>
              )}

              <div className="border-t border-emerald-700/50 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-100 font-semibold">Total Estimado:</span>
                  <div className="text-right">
                    <span className="text-emerald-100 font-bold text-xl">
                      {(total * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                    </span>
                    <div className="text-emerald-300/70 text-xs">
                      ${total.toFixed(2)} USD
                    </div>
                  </div>
                </div>
              </div>

              {total === 0 && (
                <div className="text-center text-emerald-300 text-sm italic">
                  Sin costos estimados aún
                </div>
              )}
            </div>
          </div>

          {/* MODALIDAD DE PAGO */}
          {datos.modalidadPago && (
            <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-400" />
                Modalidad de Pago
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Tipo:</span>
                  <span className="text-gray-100 font-medium">
                    {datos.modalidadPago === 'TOTAL_ADELANTADO' && 'Pago Total por Adelantado'}
                    {datos.modalidadPago === 'ABONO' && 'Abono Inicial'}
                    {datos.modalidadPago === 'PAGO_POSTERIOR' && 'Pago al Retirar'}
                  </span>
                </div>

                {datos.pagoInicial && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Monto pagado:</span>
                      <div className="text-right">
                        <span className="text-green-400 font-semibold">
                          {(datos.pagoInicial.monto * tasaCambio || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                        </span>
                        <div className="text-xs text-green-300/70">
                          ${datos.pagoInicial.monto?.toFixed(2) || '0.00'} USD
                        </div>
                      </div>
                    </div>

                    {datos.modalidadPago === 'ABONO' && total > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Saldo pendiente:</span>
                        <div className="text-right">
                          <span className="text-orange-400 font-semibold">
                            {((total - (datos.pagoInicial.monto || 0)) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                          </span>
                          <div className="text-xs text-orange-300/70">
                            ${(total - (datos.pagoInicial.monto || 0)).toFixed(2)} USD
                          </div>
                        </div>
                      </div>
                    )}

                    {datos.pagoInicial.pagos && datos.pagoInicial.pagos.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">Métodos de pago:</div>
                        <div className="flex flex-wrap gap-1">
                          {datos.pagoInicial.pagos.map((pago, index) => {
                            const montoBs = pago.moneda === 'bs' 
                              ? parseFloat(pago.monto) 
                              : parseFloat(pago.monto) * tasaCambio;
                            const montoUsd = pago.moneda === 'usd' 
                              ? parseFloat(pago.monto) 
                              : parseFloat(pago.monto) / tasaCambio;
                            
                            const metodoLabel = pago.metodo === 'efectivo_bs' ? 'Efectivo Bs' :
                              pago.metodo === 'efectivo_usd' ? 'Efectivo USD' :
                              pago.metodo === 'pago_movil' ? 'Pago Móvil' :
                              pago.metodo === 'transferencia' ? 'Transferencia' :
                              pago.metodo === 'zelle' ? 'Zelle' :
                              pago.metodo === 'binance' ? 'Binance' :
                              pago.metodo === 'tarjeta' ? 'Tarjeta' : pago.metodo;
                            
                            return (
                              <span key={index} className="text-xs bg-gray-700/50 px-2 py-1 rounded">
                                {metodoLabel}: {montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                                {pago.moneda === 'usd' && ` ($${montoUsd.toFixed(2)})`}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {datos.modalidadPago === 'PAGO_POSTERIOR' && (
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded p-2 text-sm text-blue-200">
                    El cliente pagará al retirar el dispositivo
                  </div>
                )}
              </div>
            </div>
          )}
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
                {(() => {
                  // ✅ Normalizar cliente: asegurar que sea un objeto con las propiedades correctas
                  const clienteNormalizado = (() => {
                    if (!datos.cliente) return null;
                    
                    // Si ya es un objeto con las propiedades correctas (sin id, createdAt, etc.)
                    if (typeof datos.cliente === 'object' && !Array.isArray(datos.cliente)) {
                      // Si tiene propiedades del backend (id, createdAt, etc.), extraer solo las necesarias
                      if ('id' in datos.cliente || 'createdAt' in datos.cliente) {
                        return {
                          nombre: datos.cliente.nombre || '',
                          telefono: datos.cliente.telefono || '',
                          email: datos.cliente.email || '',
                          direccion: datos.cliente.direccion || '',
                          cedula_rif: datos.cliente.cedula_rif || ''
                        };
                      }
                      // Si ya es el formato correcto, usarlo directamente
                      return datos.cliente;
                    }
                    
                    // Si es un string, crear objeto con ese nombre
                    if (typeof datos.cliente === 'string') {
                      return {
                        nombre: datos.cliente,
                        telefono: '',
                        email: '',
                        direccion: '',
                        cedula_rif: ''
                      };
                    }
                    
                    return null;
                  })();
                  
                  if (!clienteNormalizado) {
                    return (
                      <div className="text-gray-400 italic text-center py-4">
                        No hay cliente seleccionado
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="space-y-2">
                        {/* Grid 2x2 para información del cliente */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <div className="text-blue-300 text-xs">CI/RIF:</div>
                            <div className="text-blue-100 font-semibold">
                              {clienteNormalizado.cedula_rif || 'No especificado'}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 text-xs">Nombre:</div>
                            <div className="text-blue-100 font-semibold">
                              {clienteNormalizado.nombre || 'No especificado'}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 text-xs">TLF:</div>
                            <div className="text-blue-100 font-semibold">
                              {clienteNormalizado.telefono || 'No especificado'}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 text-xs">Dirección:</div>
                            <div className="text-blue-100 font-semibold text-xs">
                              {clienteNormalizado.direccion || 'No especificada'}
                            </div>
                          </div>
                        </div>

                        {/* Email en fila separada si existe */}
                        {clienteNormalizado.email && (
                          <div className="pt-1 border-t border-blue-700/30">
                            <div className="text-blue-300 text-xs">Email:</div>
                            <div className="text-blue-100 font-semibold text-xs">
                              {clienteNormalizado.email}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
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
        <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-400" />
          Opciones de Procesamiento
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Selecciona al menos una opción para crear la orden
        </p>
        
        {!opcionesFinales.imprimir && !opcionesFinales.enviarWhatsapp && (
          <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <p className="text-amber-200 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Debes seleccionar al menos una opción para continuar
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Imprimir Ticket Térmico */}
          <button
            onClick={() => toggleOpcion('imprimir')}
            disabled={loading || ejecutandoAcciones || servicioCreado}
            className={`p-4 rounded-lg border-2 transition-all ${
              opcionesFinales.imprimir
                ? 'border-blue-500 bg-blue-600/20 text-blue-200'
                : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Printer className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Imprimir Ticket Térmico</div>
                  <div className="text-xs opacity-75">Generar ticket físico impreso</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                opcionesFinales.imprimir
                  ? 'border-blue-400 bg-blue-500'
                  : 'border-gray-400'
              }`}>
                {opcionesFinales.imprimir && (
                  <CheckCircle className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
          </button>

          {/* Enviar por WhatsApp */}
          <button
            onClick={() => toggleOpcion('enviarWhatsapp')}
            disabled={loading || ejecutandoAcciones || servicioCreado}
            className={`p-4 rounded-lg border-2 transition-all ${
              opcionesFinales.enviarWhatsapp
                ? 'border-green-500 bg-green-600/20 text-green-200'
                : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaWhatsapp className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Enviar por WhatsApp</div>
                  <div className="text-xs opacity-75">Enviar información digital al cliente</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                opcionesFinales.enviarWhatsapp
                  ? 'border-green-400 bg-green-500'
                  : 'border-gray-400'
              }`}>
                {opcionesFinales.enviarWhatsapp && (
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