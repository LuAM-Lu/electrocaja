// components/servicios/wizard/PasoConfirmacion.jsx
import React, { useState, useEffect } from 'react';
import {
  User, Smartphone, Package, Calendar,
  DollarSign, Clock, Star, Camera,
  Printer, CheckCircle, Wrench,
  CreditCard, AlertTriangle, ChevronDown, ChevronUp, FileText, Building2
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useCajaStore } from '../../../store/cajaStore';
import { api } from '../../../config/api';
import { imprimirTicketServicio } from '../../../utils/imprimirTicketServicio';
import toast from '../../../utils/toast.jsx';
import { delay } from '../../../utils/saleProcessingHelpers';
import { PROCESSING_CONFIG } from '../../../constants/processingConstants';

export default function PasoConfirmacion({ datos, onActualizar, loading, servicioCreado, onAccionesCompletadas, onOpcionesCambio, procesandoModalRef, opcionesProcesamiento: opcionesProcesamientoProp }) {
  const { tasaCambio } = useCajaStore();
  const [opcionesProcesamiento, setOpcionesProcesamiento] = useState({
    enviarWhatsapp: false,
    imprimir: true
  });
  const [ejecutandoAcciones, setEjecutandoAcciones] = useState(false);
  
  // Estado unificado para secciones colapsables (Cliente y Dispositivo)
  const [informacionExpandida, setInformacionExpandida] = useState(false);
  
  // Usar opciones del prop si están disponibles
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

  // Ejecutar acciones cuando se crea el servicio
  const ejecutarAcciones = React.useCallback(async () => {
    console.log('🔄 [PasoConfirmacion] ejecutarAcciones llamado', {
      servicioCreado: !!servicioCreado,
      servicioId: servicioCreado?.id,
      ejecutandoAcciones,
      imprimirSeleccionado: opcionesFinales.imprimir,
      whatsappSeleccionado: opcionesFinales.enviarWhatsapp
    });

    if (!servicioCreado || ejecutandoAcciones) {
      console.log('⚠️ [PasoConfirmacion] Saliendo de ejecutarAcciones (sin servicio o ya ejecutando)');
      return;
    }
    
    setEjecutandoAcciones(true);
    const accionesEjecutadas = [];

    try {
      // 1. Imprimir si está seleccionado
      if (opcionesFinales.imprimir) {
        console.log('🖨️ [PasoConfirmacion] Iniciando proceso de impresión');
        try {
          console.log('⏳ [PasoConfirmacion] Esperando delay inicial...');
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION - 500);

          if (procesandoModalRef?.current) {
            console.log('📊 [PasoConfirmacion] Avanzando paso a "imprimir" en modal procesando');
            procesandoModalRef.current.avanzarPaso('imprimir');
          }

          // ✅ ABRIR VENTANA ANTES DE CUALQUIER AWAIT (igual que IngresoModal.jsx)
          let ventanaImpresion = null;
          try {
            console.log('🪟 [PasoConfirmacion] Abriendo ventana de impresión...');
            ventanaImpresion = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');
            if (!ventanaImpresion) {
              console.warn('⚠️ No se pudo abrir la ventana de impresión. El navegador puede estar bloqueando ventanas emergentes.');
            } else {
              console.log('✅ [PasoConfirmacion] Ventana de impresión abierta correctamente');
            }
          } catch (error) {
            console.warn('⚠️ Error al abrir ventana de impresión:', error);
          }

          console.log('⏳ [PasoConfirmacion] Esperando delay antes de imprimir...');
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);

          // Pasar la ventana pre-abierta a la función de impresión (igual que IngresoModal.jsx)
          console.log('🖨️ [PasoConfirmacion] Llamando imprimirTicketServicio con servicio:', servicioCreado?.id);
          await imprimirTicketServicio(servicioCreado, { ventanaPreAbierta: ventanaImpresion });

          console.log('✅ [PasoConfirmacion] imprimirTicketServicio completado');
          accionesEjecutadas.push('imprimir');
        } catch (error) {
          console.error('❌ [PasoConfirmacion] Error imprimiendo:', error);
          console.error('Stack trace:', error.stack);
          if (procesandoModalRef?.current) {
            procesandoModalRef.current.avanzarPaso('imprimir');
          }
        }
      } else {
        console.log('ℹ️ [PasoConfirmacion] Opción de impresión NO seleccionada');
      }

      // 2. Enviar WhatsApp si está seleccionado
      if (opcionesFinales.enviarWhatsapp) {
        try {
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION - 500);
          if (procesandoModalRef?.current) {
            procesandoModalRef.current.avanzarPaso('whatsapp');
          }
          
          await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);
          
          const estadoResponse = await api.get('/whatsapp/estado');
          const estadoWhatsApp = estadoResponse.data?.data || estadoResponse.data;
          
          if (!estadoWhatsApp || !estadoWhatsApp.conectado) {
            console.warn('⚠️ WhatsApp desconectado, no se enviará mensaje');
            if (procesandoModalRef?.current) {
              procesandoModalRef.current.avanzarPaso('whatsapp');
            }
          } else {
            const response = await api.post('/whatsapp/enviar-servicio', {
              servicioId: servicioCreado.id,
              numero: servicioCreado.clienteTelefono
            });

            if (response.data.success) {
              accionesEjecutadas.push('whatsapp');
            } else {
              throw new Error(response.data.message || 'Error enviando WhatsApp');
            }
          }
        } catch (error) {
          console.error('Error enviando WhatsApp:', error);
          if (procesandoModalRef?.current) {
            procesandoModalRef.current.avanzarPaso('whatsapp');
          }
        }
      }

      if (onAccionesCompletadas) {
        onAccionesCompletadas(accionesEjecutadas);
      }
    } finally {
      setEjecutandoAcciones(false);
    }
  }, [servicioCreado, ejecutandoAcciones, opcionesFinales, procesandoModalRef, onAccionesCompletadas]);

  // Disparar ejecutarAcciones cuando se crea el servicio
  useEffect(() => {
    console.log('🔍 [PasoConfirmacion] useEffect servicioCreado cambió', {
      servicioId: servicioCreado?.id,
      ejecutandoAcciones
    });

    if (servicioCreado?.id && !ejecutandoAcciones) {
      console.log('✅ [PasoConfirmacion] Llamando ejecutarAcciones');
      ejecutarAcciones();
    }
  }, [servicioCreado?.id, ejecutarAcciones, ejecutandoAcciones]);

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
  
  // Normalizar cliente
  const clienteNormalizado = (() => {
    if (!datos.cliente) return null;
    if (typeof datos.cliente === 'object' && !Array.isArray(datos.cliente)) {
      if ('id' in datos.cliente || 'createdAt' in datos.cliente) {
        return {
          nombre: datos.cliente.nombre || '',
          telefono: datos.cliente.telefono || '',
          email: datos.cliente.email || '',
          direccion: datos.cliente.direccion || '',
          cedula_rif: datos.cliente.cedula_rif || '',
          organizacion: datos.cliente.organizacion || 'Persona Natural'
        };
      }
      return datos.cliente;
    }
    if (typeof datos.cliente === 'string') {
      return {
        nombre: datos.cliente,
        telefono: '',
        email: '',
        direccion: '',
        cedula_rif: '',
        organizacion: 'Persona Natural'
      };
    }
    return null;
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* CLIENTE Y DISPOSITIVO - BOTÓN ÚNICO DE DESPLIEGUE */}
      <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-xl border-2 border-gray-700/50 shadow-xl overflow-hidden">
        {/* BOTÓN ÚNICO PARA AMBOS */}
        <button
          onClick={() => setInformacionExpandida(!informacionExpandida)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
        >
          {/* CLIENTE - IZQUIERDA */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold text-gray-100">Cliente</h3>
              <p className="text-xs text-gray-400">
                {clienteNormalizado?.nombre || 'No seleccionado'}
              </p>
            </div>
          </div>
          
          {/* DISPOSITIVO - DERECHA */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Smartphone className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-right">
              <h3 className="text-base font-bold text-gray-100">Dispositivo</h3>
              <p className="text-xs text-gray-400">
                {datos.dispositivo.marca || 'No especificado'} {datos.dispositivo.modelo || ''}
              </p>
            </div>
          </div>
          
          {/* CHEVRON */}
          {informacionExpandida ? (
            <ChevronUp className="h-5 w-5 text-gray-400 ml-4" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 ml-4" />
          )}
        </button>
        
        {/* CONTENIDO EXPANDIDO: CLIENTE Y DISPOSITIVO */}
        {informacionExpandida && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-700/50 pt-4">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* CLIENTE */}
              <div className="space-y-3 lg:w-[45%]">
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <div className="text-blue-300 text-xs font-medium">CI/RIF:</div>
                      <div className="text-blue-100 font-bold">{clienteNormalizado?.cedula_rif || '—'}</div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-xs font-medium">Nombre:</div>
                      <div className="text-blue-100 font-bold">{clienteNormalizado?.nombre || '—'}</div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-xs font-medium">Teléfono:</div>
                      <div className="text-blue-100 font-bold">{clienteNormalizado?.telefono || '—'}</div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-xs font-medium">Dirección:</div>
                      <div className="text-blue-100 font-bold text-xs">{clienteNormalizado?.direccion || '—'}</div>
                    </div>
                    {clienteNormalizado?.email && (
                      <div className="col-span-2 pt-1 border-t border-blue-700/30">
                        <div className="text-blue-300 text-xs font-medium">Email:</div>
                        <div className="text-blue-100 font-bold text-xs">{clienteNormalizado.email}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DISPOSITIVO */}
              <div className="space-y-3 lg:w-[55%]">
                {/* TÉCNICO ASIGNADO */}
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-yellow-300 text-xs font-semibold">Técnico:</span>
                      <span className="text-yellow-100 font-bold text-xs">
                        {(() => {
                          const tecnico = datos.diagnostico.tecnico;
                          if (tecnico && typeof tecnico === 'object') {
                            return tecnico.nombre || tecnico.email || 'No asignado';
                          }
                          return tecnico || 'No asignado';
                        })()}
                      </span>
                    </div>
                    {datos.diagnostico.fechaEstimada && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-yellow-400/70" />
                        <span className="text-yellow-300/70 text-xs">
                          {new Date(datos.diagnostico.fechaEstimada + 'T00:00:00').toLocaleDateString('es-VE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* INFORMACIÓN DEL DISPOSITIVO - DOS FILAS */}
                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 space-y-2">
                  {/* FILA 1: Identificación */}
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    {/* Tipo */}
                    {datos.dispositivo.tipo && (
                      <>
                        <span className="text-green-300 font-medium">Tipo:</span>
                        <span className="text-green-100 font-bold capitalize">{datos.dispositivo.tipo}</span>
                        <span className="text-green-600/50">•</span>
                      </>
                    )}
                    
                    {/* Marca */}
                    {datos.dispositivo.marca && (
                      <>
                        <span className="text-green-300 font-medium">Marca:</span>
                        <span className="text-green-100 font-bold">{datos.dispositivo.marca}</span>
                        <span className="text-green-600/50">•</span>
                      </>
                    )}
                    
                    {/* Modelo */}
                    {datos.dispositivo.modelo && (
                      <>
                        <span className="text-green-300 font-medium">Modelo:</span>
                        <span className="text-green-100 font-bold">{datos.dispositivo.modelo}</span>
                        <span className="text-green-600/50">•</span>
                      </>
                    )}
                    
                    {/* Color */}
                    {datos.dispositivo.color && (
                      <>
                        <span className="text-green-300 font-medium">Color:</span>
                        <span className="text-green-100 font-bold">{datos.dispositivo.color}</span>
                        <span className="text-green-600/50">•</span>
                      </>
                    )}
                    
                    {/* IMEI/Serial */}
                    {datos.dispositivo.imei && (
                      <>
                        <span className="text-green-300 font-medium">IMEI:</span>
                        <span className="text-green-100 font-bold font-mono">{datos.dispositivo.imei}</span>
                        {(datos.dispositivo.patron || datos.dispositivo.accesorios?.length > 0 || problemasArray.length > 0) && (
                          <span className="text-green-600/50">•</span>
                        )}
                      </>
                    )}
                    
                    {/* Patrón de desbloqueo */}
                    {datos.dispositivo.patron && (
                      <>
                        <span className="text-green-300 font-medium">Patrón:</span>
                        <span className="text-green-100 font-bold">{datos.dispositivo.patron}</span>
                        {(datos.dispositivo.accesorios?.length > 0 || problemasArray.length > 0) && (
                          <span className="text-green-600/50">•</span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* FILA 2: Accesorios Dejados */}
                  {datos.dispositivo.accesorios && datos.dispositivo.accesorios.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2 text-xs pt-1 border-t border-green-700/30">
                      <span className="text-green-300 font-semibold">Accesorios Dejados:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {datos.dispositivo.accesorios.map((accesorio, index) => (
                          <span key={index} className="px-2 py-1 bg-green-700/50 text-green-100 rounded-md text-xs font-semibold border border-green-600/50 shadow-sm">
                            {accesorio}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* FILA 3: Problemas */}
                  {problemasArray.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2 text-xs pt-1 border-t border-green-700/30">
                      <span className="text-green-300 font-semibold">Problemas Reportados:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {problemasArray.map((problema, index) => (
                          <span key={index} className="px-2 py-1 bg-red-700/50 text-red-100 rounded-md text-xs font-semibold border border-red-600/50 shadow-sm">
                            {problema}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {datos.diagnostico.observaciones && (
                  <div className="pt-2 border-t border-gray-700/50">
                    <div className="text-gray-400 text-xs font-medium mb-1">Observaciones</div>
                    <div className="bg-gray-700/50 p-2 rounded text-gray-200 text-xs">
                      {datos.diagnostico.observaciones}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CUERPO DE ORDEN: ITEMS + RESUMEN + MODALIDAD DE PAGO (UNA COLUMNA) */}
      <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-2xl border-2 border-gray-700/50 shadow-2xl overflow-hidden">
        
        {/* ENCABEZADO DEL CUERPO */}
        <div className="bg-gradient-to-r from-emerald-800/30 to-blue-800/30 border-b-2 border-gray-700/50 p-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-400" />
            Detalle de Orden
          </h2>
        </div>

        <div className="p-6 space-y-6">
          
          {/* FILA 1: ITEMS Y SERVICIOS */}
          <div className="space-y-4">
            {datos.items && datos.items.length > 0 ? (
              <div className="space-y-2">
                {datos.items.map((item, index) => {
                  // Normalizar precio_unitario (puede venir como precio_unitario o precioUnitario)
                  const precioUnitario = parseFloat(item.precio_unitario || item.precioUnitario || 0);
                  const cantidad = parseFloat(item.cantidad || 0);
                  
                  return (
                    <div key={item.id || index} className="bg-gray-700/40 rounded-lg p-3 border border-gray-600/50 hover:bg-gray-700/60 transition-colors">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        {/* Descripción - Ocupa más espacio */}
                        <div className="col-span-12 md:col-span-6">
                          <div className="font-bold text-gray-100 text-sm">{item.descripcion}</div>
                          {item.esPersonalizado && (
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-300 mt-1">
                              <Star className="h-3 w-3" />
                              Personalizado
                            </span>
                          )}
                        </div>
                        
                        {/* Cantidad */}
                        <div className="col-span-4 md:col-span-2 text-center">
                          <div className="text-gray-400 text-xs mb-0.5">Cantidad</div>
                          <div className="text-gray-200 font-semibold text-sm">{cantidad}</div>
                        </div>
                        
                        {/* Precio Unitario */}
                        <div className="col-span-4 md:col-span-2 text-center">
                          <div className="text-gray-400 text-xs mb-0.5">Precio Unit.</div>
                          <div className="text-gray-200 font-semibold text-xs">
                            {(precioUnitario * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                          </div>
                          <div className="text-gray-500 text-[10px]">
                            ${precioUnitario.toFixed(2)} USD
                          </div>
                        </div>
                        
                        {/* Subtotal */}
                        <div className="col-span-4 md:col-span-2 text-right">
                          <div className="text-gray-400 text-xs mb-0.5">Subtotal</div>
                          <div className="text-emerald-400 font-bold text-sm">
                            {(cantidad * precioUnitario * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                          </div>
                          <div className="text-gray-400 text-xs mt-0.5">
                            ${(cantidad * precioUnitario).toFixed(2)} USD
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 text-center">
                <p className="text-gray-400 text-sm italic">Sin items agregados</p>
              </div>
            )}
          </div>

          {/* FILA 2: MODALIDAD DE PAGO Y RESUMEN FINANCIERO (COMPARTEN FILA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMNA 1: MODALIDAD DE PAGO */}
            {datos.modalidadPago && (
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-3 border-2 border-gray-700/50 shadow-lg">
                <h3 className="text-base font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-400" />
                  Modalidad de Pago
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs font-medium">Tipo:</span>
                    <span className="text-gray-100 font-bold text-xs">
                      {datos.modalidadPago === 'TOTAL_ADELANTADO' && 'Pago Total por Adelantado'}
                      {datos.modalidadPago === 'ABONO' && 'Abono Inicial'}
                      {datos.modalidadPago === 'PAGO_POSTERIOR' && 'Pago al Retirar'}
                    </span>
                  </div>

                  {datos.pagoInicial && (
                    <>
                      {(() => {
                        // Calcular monto pagado desde los pagos si monto no está disponible o es 0
                        let montoPagadoUsd = datos.pagoInicial.monto || 0;
                        let montoPagadoBs = (montoPagadoUsd * tasaCambio) || 0;
                        
                        // Si el monto es 0 pero hay pagos, calcular desde los pagos
                        if (montoPagadoUsd === 0 && datos.pagoInicial.pagos && datos.pagoInicial.pagos.length > 0) {
                          const metodoMonedaMap = {
                            'efectivo_bs': 'bs',
                            'efectivo_usd': 'usd',
                            'pago_movil': 'bs',
                            'transferencia': 'bs',
                            'zelle': 'usd',
                            'binance': 'usd',
                            'tarjeta': 'bs'
                          };
                          
                          let totalBsCalculado = 0;
                          let totalUsdCalculado = 0;
                          
                          datos.pagoInicial.pagos.forEach(pago => {
                            const monto = parseFloat(pago.monto) || 0;
                            const moneda = pago.moneda || metodoMonedaMap[pago.metodo] || 'bs';
                            
                            if (moneda === 'bs') {
                              totalBsCalculado += monto;
                            } else {
                              totalUsdCalculado += monto;
                            }
                          });
                          
                          montoPagadoBs = totalBsCalculado + (totalUsdCalculado * tasaCambio);
                          montoPagadoUsd = (totalBsCalculado / tasaCambio) + totalUsdCalculado;
                        }
                        
                        return (
                          <>
                            <div className="flex justify-between items-center pt-1.5 border-t border-gray-700/50">
                              <span className="text-gray-400 text-xs font-medium">Monto pagado:</span>
                              <div className="text-right">
                                <span className="text-green-400 font-semibold text-xs">
                                  {montoPagadoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                                </span>
                                <div className="text-[10px] text-green-300/70">
                                  ${montoPagadoUsd.toFixed(2)} USD
                                </div>
                              </div>
                            </div>

                            {datos.modalidadPago === 'ABONO' && total > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-xs font-medium">Saldo pendiente:</span>
                                <div className="text-right">
                                  <span className="text-orange-400 font-semibold text-xs">
                                    {((total - montoPagadoUsd) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                                  </span>
                                  <div className="text-xs text-orange-300/70">
                                    ${(total - montoPagadoUsd).toFixed(2)} USD
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {datos.pagoInicial.pagos && datos.pagoInicial.pagos.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-700/50">
                          <div className="text-gray-400 text-[10px] mb-0.5 font-medium">Métodos de pago:</div>
                          <div className="flex flex-wrap gap-1">
                            {datos.pagoInicial.pagos.map((pago, index) => {
                              // Determinar moneda si no viene explícitamente
                              let moneda = pago.moneda;
                              if (!moneda) {
                                const metodoMonedaMap = {
                                  'efectivo_bs': 'bs',
                                  'efectivo_usd': 'usd',
                                  'pago_movil': 'bs',
                                  'transferencia': 'bs',
                                  'zelle': 'usd',
                                  'binance': 'usd',
                                  'tarjeta': 'bs'
                                };
                                moneda = metodoMonedaMap[pago.metodo] || 'bs';
                              }
                              
                              const monto = parseFloat(pago.monto) || 0;
                              const montoBs = moneda === 'bs' 
                                ? monto 
                                : monto * tasaCambio;
                              const montoUsd = moneda === 'usd' 
                                ? monto 
                                : monto / tasaCambio;
                              
                              const metodoLabel = pago.metodo === 'efectivo_bs' ? 'Efectivo Bs' :
                                pago.metodo === 'efectivo_usd' ? 'Efectivo USD' :
                                pago.metodo === 'pago_movil' ? 'Pago Móvil' :
                                pago.metodo === 'transferencia' ? 'Transferencia' :
                                pago.metodo === 'zelle' ? 'Zelle' :
                                pago.metodo === 'binance' ? 'Binance' :
                                pago.metodo === 'tarjeta' ? 'Tarjeta' : pago.metodo;
                              
                              return (
                                <span key={index} className="text-[10px] bg-gray-700/50 px-1.5 py-0.5 rounded border border-gray-600/50">
                                  {metodoLabel}: {montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                                  {moneda === 'usd' && ` ($${montoUsd.toFixed(2)})`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* COLUMNA 2: RESUMEN FINANCIERO */}
            <div className="bg-gradient-to-br from-emerald-800/50 to-emerald-900/50 rounded-xl p-4 border-2 border-emerald-700/50 shadow-lg">
              <h3 className="text-lg font-bold text-emerald-100 mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                Resumen Financiero
              </h3>
              
              <div className="space-y-3">
                {datos.items && datos.items.length > 0 ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-200 font-medium">Subtotal:</span>
                    <div className="text-right">
                      <span className="text-emerald-100 font-bold text-xs">
                        {(total * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                      </span>
                      <span className="text-emerald-300/70 text-[10px] ml-1.5">
                        (${total.toFixed(2)} USD)
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="border-t-2 border-emerald-700/50 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100 font-bold text-sm">Total Estimado:</span>
                    <div className="text-right">
                      <span className="text-emerald-100 font-bold text-lg">
                        {(total * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                      </span>
                      <div className="text-emerald-300/70 text-xs mt-0.5">
                        ${total.toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                </div>

                {total === 0 && (
                  <div className="text-center text-emerald-300 text-xs italic pt-1">
                    Sin costos estimados aún
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OPCIONES DE PROCESAMIENTO - ANCHO COMPLETO */}
      <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-2xl border-2 border-gray-700/50 shadow-xl p-4">
        <h3 className="text-lg font-bold text-gray-100 mb-1 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-400" />
          Opciones de Procesamiento
        </h3>
        <p className="text-xs text-gray-400 mb-2">
          Selecciona al menos una opción para crear la orden
        </p>
        
        {!opcionesFinales.imprimir && !opcionesFinales.enviarWhatsapp && (
          <div className="mb-2 p-2 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <p className="text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Debes seleccionar al menos una opción para continuar
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Imprimir Ticket Térmico */}
          <button
            onClick={() => toggleOpcion('imprimir')}
            disabled={loading || ejecutandoAcciones || servicioCreado}
            className={`p-3 rounded-lg border-2 transition-all ${
              opcionesFinales.imprimir
                ? 'border-blue-500 bg-blue-600/20 text-blue-200 shadow-lg'
                : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Imprimir Ticket Térmico</div>
                  <div className="text-[11px] opacity-75">Generar ticket físico impreso</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                opcionesFinales.imprimir
                  ? 'border-blue-400 bg-blue-500'
                  : 'border-gray-400'
              }`}>
                {opcionesFinales.imprimir && (
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                )}
              </div>
            </div>
          </button>

          {/* Enviar por WhatsApp */}
          <button
            onClick={() => toggleOpcion('enviarWhatsapp')}
            disabled={loading || ejecutandoAcciones || servicioCreado}
            className={`p-3 rounded-lg border-2 transition-all ${
              opcionesFinales.enviarWhatsapp
                ? 'border-green-500 bg-green-600/20 text-green-200 shadow-lg'
                : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaWhatsapp className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Enviar por WhatsApp</div>
                  <div className="text-[11px] opacity-75">Enviar información digital al cliente</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                opcionesFinales.enviarWhatsapp
                  ? 'border-green-400 bg-green-500'
                  : 'border-gray-400'
              }`}>
                {opcionesFinales.enviarWhatsapp && (
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
