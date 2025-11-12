// components/ConteoDirectoModal.jsx - INTEGRADO CON useMontosEnCaja Y PDF + BLOQUEO DE USUARIOS
import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Coins, Smartphone, Calculator, Shield, AlertTriangle, Lock, Calendar, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { useMontosEnCaja, formatearBolivares, formatearDolares } from '../hooks/useMontosEnCaja';
import { api } from '../config/api';
import toast from '../utils/toast.jsx';

const ConteoDirectoModal = ({ cajaPendiente, onClose, onComplete }) => {
 // ===================================
 //  ESTADOS
 // ===================================
const [loading, setLoading] = useState(false);
const [montoFinalBs, setMontoFinalBs] = useState('');
const [montoFinalUsd, setMontoFinalUsd] = useState('');
const [montoFinalPagoMovil, setMontoFinalPagoMovil] = useState('');
const [observaciones, setObservaciones] = useState('');
const [datosEsperados, setDatosEsperados] = useState(null);
 const [bloqueandoUsuarios, setBloqueandoUsuarios] = useState(false);
 const { usuario } = useAuthStore();
 const { emitirEvento } = useSocketEvents();
 
 // 🔒 Usar useRef para rastrear si ya se bloqueó en esta sesión del modal
 const hasBloqueadoRef = useRef(false);

 //  USAR HOOK UNIFICADO CON DATOS DE CAJA PENDIENTE
 const montosCalculados = useMontosEnCaja(datosEsperados);

 // ===================================
 //  BLOQUEO DE USUARIOS AL ABRIR MODAL
 // ===================================
 useEffect(() => {
   // Solo bloquear si no se ha hecho en esta sesión
   if (!hasBloqueadoRef.current) {
     console.log('🔒 [ConteoDirectoModal] Abriendo modal - Bloqueando usuarios...');
     hasBloqueadoRef.current = true;
     setBloqueandoUsuarios(true);
     
     // ⏱️ Pequeño delay para asegurar que el socket esté listo
     setTimeout(() => {
       console.log('🔒 [ConteoDirectoModal] Emitiendo evento de bloqueo...');
       emitirEvento('bloquear_usuarios', {
         motivo: 'Resolviendo caja pendiente de cierre físico',
         usuario_cerrando: usuario?.nombre,
         timestamp: new Date().toISOString()
       });
     }, 100);
     
     toast.info('Usuarios bloqueados durante resolución de caja pendiente', { id: 'bloqueo-caja-pendiente' });
   }
   
   return () => {
     console.log('🔧 [ConteoDirectoModal] Cleanup - Reseteando ref');
     // NO desbloquear aquí, se hace explícitamente en handleSubmit y handleClose
   };
 }, []); // Ejecutar solo una vez al montar

 // ===================================
 //  EFECTOS - CARGAR DATOS
 // ===================================
 useEffect(() => {
   cargarDatosCajaPendiente();
 }, [cajaPendiente.id]);

 // ===================================
 //  FUNCIONES DE CARGA DE DATOS
 // ===================================
 const cargarDatosCajaPendiente = async () => {
   try {
     //  USAR ENDPOINT ESPECÍFICO PARA CAJA PENDIENTE
     const response = await fetch(`https://localhost:3001/api/cajas/${cajaPendiente.id}/detalle`, {
       headers: {
         'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
       }
     });
     
     if (response.ok) {
       const data = await response.json();
       if (data.data) {
         console.log(' Datos cargados para caja pendiente:', data.data);
         
         //  CONVERTIR FORMATO BACKEND A FORMATO ESPERADO POR HOOK
         const datosFormateados = {
           // Montos iniciales (formato consistente)
           monto_inicial_bs: parseFloat(data.data.montoInicialBs || cajaPendiente.montoInicialBs) || 0,
           monto_inicial_usd: parseFloat(data.data.montoInicialUsd || cajaPendiente.montoInicialUsd) || 0,
           monto_inicial_pago_movil: parseFloat(data.data.montoInicialPagoMovil || cajaPendiente.montoInicialPagoMovil) || 0,
           
           // Totales acumulados (usar datos del endpoint o de cajaPendiente)
           total_ingresos_bs: parseFloat(data.data.totalIngresosBs || cajaPendiente.totalIngresosBs) || 0,
           total_egresos_bs: parseFloat(data.data.totalEgresosBs || cajaPendiente.totalEgresosBs) || 0,
           total_ingresos_usd: parseFloat(data.data.totalIngresosUsd || cajaPendiente.totalIngresosUsd) || 0,
           total_egresos_usd: parseFloat(data.data.totalEgresosUsd || cajaPendiente.totalEgresosUsd) || 0,
           total_pago_movil: parseFloat(data.data.totalPagoMovil || cajaPendiente.totalPagoMovil) || 0,
           
           // Transacciones para cálculo detallado
           transacciones: data.data.transacciones || cajaPendiente.transacciones || [],
           
           // Metadata
           id: data.data.id || cajaPendiente.id,
           fecha: data.data.fecha || cajaPendiente.fecha,
           estado: data.data.estado || 'PENDIENTE_CIERRE_FISICO',
           horaApertura: data.data.horaApertura,
           usuarioApertura: data.data.usuarioApertura
         };
         
         setDatosEsperados(datosFormateados);
         console.log(' Datos formateados para hook:', datosFormateados);
       }
     } else {
       throw new Error('Error cargando datos del backend');
     }
   } catch (error) {
     console.error(' Error cargando datos de caja:', error);
     toast.error('Error cargando datos de la caja pendiente');
     
     //  FALLBACK: Usar datos básicos de cajaPendiente
     const datosFallback = {
       monto_inicial_bs: parseFloat(cajaPendiente.montoInicialBs) || 0,
       monto_inicial_usd: parseFloat(cajaPendiente.montoInicialUsd) || 0,
       monto_inicial_pago_movil: parseFloat(cajaPendiente.montoInicialPagoMovil) || 0,
       total_ingresos_bs: parseFloat(cajaPendiente.totalIngresosBs) || 0,
       total_egresos_bs: parseFloat(cajaPendiente.totalEgresosBs) || 0,
       total_ingresos_usd: parseFloat(cajaPendiente.totalIngresosUsd) || 0,
       total_egresos_usd: parseFloat(cajaPendiente.totalEgresosUsd) || 0,
       total_pago_movil: parseFloat(cajaPendiente.totalPagoMovil) || 0,
       transacciones: cajaPendiente.transacciones || [],
       id: cajaPendiente.id,
       fecha: cajaPendiente.fecha,
       estado: 'PENDIENTE_CIERRE_FISICO'
     };
     
     setDatosEsperados(datosFallback);
     console.log(' Usando datos de fallback:', datosFallback);
   }
 };

 // ===================================
 //  FUNCIONES DE CÁLCULO
 // ===================================
 const calcularDiferencias = () => {
   const contadoBs = parseFloat(montoFinalBs) || 0;
   const contadoUsd = parseFloat(montoFinalUsd) || 0;
   const contadoPagoMovil = parseFloat(montoFinalPagoMovil) || 0;

   return {
     bs: contadoBs - montosCalculados.efectivoBs,
     usd: contadoUsd - montosCalculados.efectivoUsd,
     pagoMovil: contadoPagoMovil - montosCalculados.pagoMovil
   };
 };

 const hayDiferencias = () => {
   const diff = calcularDiferencias();
   return Math.abs(diff.bs) > 0.01 || Math.abs(diff.usd) > 0.01 || Math.abs(diff.pagoMovil) > 0.01;
 };

 const hayDiferenciasSignificativas = () => {
   const diff = calcularDiferencias();
   return Math.abs(diff.bs) > 1000 || Math.abs(diff.usd) > 10 || Math.abs(diff.pagoMovil) > 500;
 };

 // ===================================
 //  FUNCIONES DE PDF
 // ===================================
 const generarPDFCierre = async () => {
   if (!datosEsperados || !montoFinalBs || !montoFinalUsd || !montoFinalPagoMovil) {
     toast.error('Datos insuficientes para generar PDF');
     return;
   }

  try {
    console.log(' Iniciando generación de PDF para caja pendiente...');
    
    // Preparar datos completos para el PDF
    const datosPDF = {
      // Información de la caja
      caja: {
        id: cajaPendiente.id,
        fecha: cajaPendiente.fecha,
        horaApertura: datosEsperados.horaApertura || '08:00',
        horaCierre: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        estado: 'CERRADA_PENDIENTE',
        
        // Montos iniciales
        montoInicialBs: montosCalculados.montosIniciales.efectivoBs,
        montoInicialUsd: montosCalculados.montosIniciales.efectivoUsd,
        montoInicialPagoMovil: montosCalculados.montosIniciales.pagoMovil,
        
        // Totales calculados
        totalIngresosBs: montosCalculados.ingresosBs,
        totalEgresosBs: montosCalculados.egresosBs,
        totalIngresosUsd: montosCalculados.ingresosUsd,
        totalEgresosUsd: montosCalculados.egresosUsd,
        totalPagoMovil: montosCalculados.ingresosPagoMovil,
        
        // Montos finales (conteo físico)
        montoFinalBs: parseFloat(montoFinalBs),
        montoFinalUsd: parseFloat(montoFinalUsd),
        montoFinalPagoMovil: parseFloat(montoFinalPagoMovil),
        
        // Usuario de cierre
        usuarioCierre: {
          nombre: usuario?.nombre || 'Usuario Desconocido'
        }
      },
      
      // Transacciones
      transacciones: datosEsperados.transacciones || [],
      
      // Usuario
      usuario: {
        nombre: usuario?.nombre || 'Usuario Desconocido',
        rol: usuario?.rol || 'cajero',
        sucursal: usuario?.sucursal || 'Principal'
      },
      
      // Diferencias si las hay
      diferencias: hayDiferencias() ? calcularDiferencias() : null,
      
      // Observaciones
      observaciones: observaciones.trim() || 'Caja pendiente resuelta mediante conteo físico',
      
      // Evidencia
      evidenciaFotografica: true, // Siempre true para cajas pendientes
      
      // Fecha de generación
      fechaGeneracion: new Date().toISOString()
    };

    console.log(' Datos preparados para PDF:', datosPDF);

    // Llamar al servicio de PDF unificado
    const response = await api.post('/cajas/generar-pdf-temporal', {
      ...datosPDF,
      esPendiente: true,
      transacciones: datosEsperados.transacciones || []
    });
    
    if (!response.data.success) {
      throw new Error('Error generando PDF en backend');
    }

    const pdfInfo = response.data.data;
    console.log(' PDF generado:', pdfInfo);

     // Preparar mensaje para WhatsApp
     const diferenciasTexto = hayDiferencias() ? 
       Object.entries(calcularDiferencias())
         .filter(([_, valor]) => Math.abs(valor) > 0.01)
         .map(([moneda, valor]) => {
           const tipo = valor > 0 ? 'SOBRANTE' : 'FALTANTE';
           const simbolo = moneda === 'usd' ? '$' : 'Bs';
           const formato = moneda === 'usd' ? formatearDolares(Math.abs(valor)) : formatearBolivares(Math.abs(valor));
           return `${tipo}: ${simbolo}${formato}`;
         })
         .join(', ') : 'Sin diferencias';

     const mensajeWhatsApp = ` *ELECTRO CAJA - CAJA PENDIENTE RESUELTA*

 *Fecha Original:* ${cajaPendiente.fecha}
 *Resuelta:* ${new Date().toLocaleDateString('es-VE')} - ${new Date().toLocaleTimeString('es-VE')}
 *Resuelto por:* ${usuario?.nombre}
 *Sucursal:* ${usuario?.sucursal || 'Principal'}

 *CONTEO FÍSICO FINAL:*
 Bolívares: ${formatearBolivares(parseFloat(montoFinalBs))} Bs
 Dólares: $${formatearDolares(parseFloat(montoFinalUsd))}
 Pago Móvil: ${formatearBolivares(parseFloat(montoFinalPagoMovil))} Bs

 *DIFERENCIAS:* ${diferenciasTexto}

 *Observaciones:* ${observaciones.trim() || 'Ninguna'}

 *Reporte PDF adjunto con detalles completos.*

_Caja pendiente resuelta - Electro Caja_`;

     // Enviar por WhatsApp
     console.log(' Enviando PDF por WhatsApp...');
     const whatsappResponse = await api.post('/whatsapp/pdf', {
       numero: '+584120552931',
       mensaje: mensajeWhatsApp,
       rutaPDF: pdfInfo.rutaPDF,
       nombreArchivo: pdfInfo.nombreArchivo
     });

     if (whatsappResponse.data.success) {
       toast.success('PDF generado y enviado por WhatsApp', { duration: 5000 });
       
       // Descargar PDF localmente
       if (pdfInfo.pdfBase64) {
         const link = document.createElement('a');
         link.href = `data:application/pdf;base64,${pdfInfo.pdfBase64}`;
         link.download = pdfInfo.nombreArchivo;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         console.log(' PDF descargado localmente');
       }
     } else {
       toast.warning('PDF generado pero WhatsApp falló');
     }

  } catch (error) {
    console.error(' Error generando PDF:', error);
    toast.error('Error generando PDF: ' + (error.response?.data?.message || error.message));
    throw error;
  }
};

 // ===================================
 //  FUNCIÓN PRINCIPAL DE ENVÍO
 // ===================================
 const handleSubmit = async (e) => {
   e.preventDefault();
   
   if (!montoFinalBs || !montoFinalUsd || !montoFinalPagoMovil) {
     toast.error('Todos los montos son obligatorios');
     return;
   }
   
   // Verificar diferencias significativas (solo para no-admins)
   if (hayDiferenciasSignificativas() && usuario?.rol?.toLowerCase() !== 'admin') {
     toast.error('Diferencias significativas detectadas. Se requiere autorización de administrador.');
     return;
   }

   // Si es admin, mostrar alerta pero permitir continuar
   if (hayDiferenciasSignificativas() && usuario?.rol?.toLowerCase() === 'admin') {
     toast.warning('Admin detectó diferencias significativas - Procediendo con autorización automática');
   }

   setLoading(true);
   
   try {
     const diferencias = calcularDiferencias();
     let observacionesCompletas = observaciones;
     
     if (hayDiferencias()) {
       const diferenciasTexto = [];
       if (Math.abs(diferencias.bs) > 0.01) {
         diferenciasTexto.push(`Bs: ${diferencias.bs > 0 ? '+' : ''}${formatearBolivares(diferencias.bs)}`);
       }
       if (Math.abs(diferencias.usd) > 0.01) {
         diferenciasTexto.push(`USD: ${diferencias.usd > 0 ? '+' : ''}$${formatearDolares(diferencias.usd)}`);
       }
       if (Math.abs(diferencias.pagoMovil) > 0.01) {
         diferenciasTexto.push(`PM: ${diferencias.pagoMovil > 0 ? '+' : ''}${formatearBolivares(diferencias.pagoMovil)}`);
       }
       
       observacionesCompletas = `${observaciones}\n\nDIFERENCIAS DETECTADAS: ${diferenciasTexto.join(', ')} - Resuelto por: ${usuario?.nombre} - ${new Date().toLocaleString('es-VE')}`;
     }
     
     console.log('🔄 Resolviendo caja pendiente:', cajaPendiente.id);

     // CORREGIDO: Usar api centralizada en lugar de fetch hardcodeado
     const response = await api.post(`/cajas/resolver-pendiente/${cajaPendiente.id}`, {
       montoFinalBs: parseFloat(montoFinalBs),
       montoFinalUsd: parseFloat(montoFinalUsd),
       montoFinalPagoMovil: parseFloat(montoFinalPagoMovil),
       observacionesCierre: observacionesCompletas
     });

     if (!response.data.success) {
       throw new Error(response.data.message || 'Error al resolver caja pendiente');
     }

     const result = response.data;
     console.log('✅ Caja resuelta:', result);

     // Limpiar estado de bloqueo
     useAuthStore.setState({
       cajaPendienteCierre: null,
       sistemaBloquedadoPorCaja: false
     });

    // 🔓 Desbloquear usuarios tras resolución exitosa
    emitirEvento('desbloquear_usuarios', {
      motivo: 'Caja pendiente resuelta exitosamente',
      timestamp: new Date().toISOString()
    });

    toast.success('Caja pendiente resuelta exitosamente');

    //  GENERAR PDF AUTOMÁTICAMENTE DESPUÉS DEL CIERRE
    try {
      console.log(' Generando PDF de caja pendiente resuelta...');
      await generarPDFCierre();
    } catch (pdfError) {
      console.warn(' Error generando PDF (no crítico):', pdfError);
      toast.warning('Caja cerrada correctamente, pero PDF falló');
    }

    //  ACTUALIZAR STORES EN LUGAR DE RECARGAR
    setTimeout(async () => {
      console.log(' Actualizando stores después de resolver caja pendiente...');

      // Actualizar auth store (limpiar caja pendiente)
      useAuthStore.getState().limpiarCajaPendiente();

      // Actualizar caja store
      try {
        await useCajaStore.getState().initialize();
      } catch (err) {
        console.error('Error actualizando caja store:', err);
      }

      // Llamar callback y cerrar modal
      setBloqueandoUsuarios(false);
      if (onComplete) onComplete();
      onClose();
    }, 1500);

  } catch (error) {
    console.error(' Error resolviendo caja:', error);
    toast.error('Error al resolver caja pendiente: ' + error.message);
    
    // 🔓 Desbloquear usuarios en caso de error
    emitirEvento('desbloquear_usuarios', {
      motivo: 'Error resolviendo caja pendiente',
      timestamp: new Date().toISOString()
    });
  } finally {
    setLoading(false);
  }
 };

// ===================================
//  FUNCIÓN DE CIERRE (CON DESBLOQUEO)
// ===================================
const handleClose = () => {
  if (loading) {
    toast.error('No se puede cancelar durante el proceso de resolución');
    return;
  }
  
  // 🔓 Desbloquear usuarios al cancelar
  emitirEvento('desbloquear_usuarios', {
    motivo: 'Resolución de caja pendiente cancelada',
    timestamp: new Date().toISOString()
  });
  
  setBloqueandoUsuarios(false);
  hasBloqueadoRef.current = false;
  onClose();
};

// ===================================
//  RENDERIZADO
// ===================================
const diferencias = calcularDiferencias();

 //  MOSTRAR LOADING MIENTRAS CARGAN DATOS
 if (!datosEsperados) {
   return (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center">
       <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
         <p className="text-gray-600">Cargando datos de caja pendiente...</p>
       </div>
     </div>
   );
 }

 return (
   <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center">
     <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden max-h-[95vh] overflow-y-auto">
       
       {/*  HEADER */}
       <div className="bg-gradient-to-r from-amber-500 to-amber-600">
         <div className="px-6 py-4 text-white">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-3">
               <div className="bg-white/20 p-2 rounded-lg">
                 <Shield className="h-6 w-6" />
               </div>
               <div>
                 <h2 className="text-xl font-bold">Resolver Caja Pendiente</h2>
                 <div className="text-sm text-amber-100 flex items-center space-x-4">
                   <div className="flex items-center space-x-1">
                     <Calendar className="h-4 w-4" />
                     <span>Caja del {cajaPendiente.fecha}</span>
                   </div>
                   <div className="flex items-center space-x-1">
                     <User className="h-4 w-4" />
                     <span>Responsable: {cajaPendiente.usuarioResponsable}</span>
                   </div>
                   {montosCalculados.esCajaPendiente && (
                     <div className="bg-amber-400/20 px-2 py-1 rounded-full text-xs">
                        Hook unificado
                     </div>
                   )}
                 </div>
               </div>
             </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
             >
               <X className="h-6 w-6" />
             </button>
           </div>
         </div>
       </div>

       {/* CONTENIDO PRINCIPAL */}
       <div className="p-6">
         
         {/* Alerta crítica */}
         <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
           <div className="flex items-center space-x-3">
             <AlertTriangle className="h-6 w-6 text-amber-600" />
             <div>
               <div className="font-bold text-amber-900 mb-1">Conteo Físico con Verificación</div>
               <div className="text-sm text-amber-700">
                 Esta caja quedó pendiente de cierre automático. El sistema está calculando automáticamente las diferencias entre lo esperado y lo contado usando el hook unificado.
               </div>
             </div>
           </div>
         </div>

         <form onSubmit={handleSubmit}>
           
           {/* SECCIÓN DE TOTALES ESPERADOS - USANDO HOOK UNIFICADO */}
           <div className="mb-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
               <Calculator className="h-5 w-5 mr-2" />
               Totales Esperados (Sistema)
               <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                 Hook Unificado
               </span>
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                 <div className="text-sm text-gray-600">Bolívares Esperados</div>
                 <div className="text-lg font-bold text-gray-900">
                   {formatearBolivares(montosCalculados.efectivoBs)} Bs
                 </div>
                 <div className="text-xs text-blue-600 mt-1">
                   Inicial: {formatearBolivares(montosCalculados.montosIniciales.efectivoBs)} + 
                   Ingresos: {formatearBolivares(montosCalculados.ingresosBs)} - 
                   Egresos: {formatearBolivares(montosCalculados.egresosBs)}
                 </div>
               </div>
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                 <div className="text-sm text-gray-600">Dólares Esperados</div>
                 <div className="text-lg font-bold text-gray-900">
                   ${formatearDolares(montosCalculados.efectivoUsd)}
                 </div>
                 <div className="text-xs text-green-600 mt-1">
                   Inicial: ${formatearDolares(montosCalculados.montosIniciales.efectivoUsd)} + 
                   Ingresos: ${formatearDolares(montosCalculados.ingresosUsd)} - 
                   Egresos: ${formatearDolares(montosCalculados.egresosUsd)}
                 </div>
               </div>
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                 <div className="text-sm text-gray-600">Pago Móvil Esperado</div>
                 <div className="text-lg font-bold text-gray-900">
                   {formatearBolivares(montosCalculados.pagoMovil)} Bs
                 </div>
                 <div className="text-xs text-purple-600 mt-1">
                   Inicial: {formatearBolivares(montosCalculados.montosIniciales.pagoMovil)} + 
                   Ingresos: {formatearBolivares(montosCalculados.ingresosPagoMovil)}
                 </div>
               </div>
             </div>
             
             {/*  ESTADÍSTICAS ADICIONALES */}
             <div className="grid grid-cols-3 gap-2 text-center text-xs bg-blue-50 p-3 rounded-lg">
               <div>
                 <div className="font-semibold text-blue-800">Transacciones</div>
                 <div className="text-blue-600">{montosCalculados.transaccionesTotales}</div>
               </div>
               <div>
                 <div className="font-semibold text-green-800">Ingresos</div>
                 <div className="text-green-600">{montosCalculados.ventasCount}</div>
               </div>
               <div>
                 <div className="font-semibold text-red-800">Egresos</div>
                 <div className="text-red-600">{montosCalculados.egresosCount}</div>
               </div>
             </div>
           </div>
           
           {/* SECCIÓN DE CONTEO FÍSICO */}
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Conteo Físico Actual</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
             
             {/* Bolívares */}
             <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
               <div className="flex items-center space-x-2 mb-3">
                 <Coins className="h-5 w-5 text-green-600" />
                 <span className="font-semibold text-green-800">Efectivo Bolívares</span>
               </div>
               <input
                 type="number"
                 step="0.01"
                 value={montoFinalBs}
                 onChange={(e) => setMontoFinalBs(e.target.value)}
                 className="w-full px-4 py-3 text-xl font-bold border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                 placeholder="0"
                 required
               />
               <div className="text-xs text-green-600 mt-1 text-center">
                 Conteo físico actual
               </div>
               {montoFinalBs && (
                 <div className={`text-xs mt-1 text-center font-semibold ${
                   diferencias.bs > 0 ? 'text-blue-600' : diferencias.bs < 0 ? 'text-red-600' : 'text-green-600'
                 }`}>
                   {diferencias.bs === 0 ? ' Exacto' : 
                    diferencias.bs > 0 ? `+${formatearBolivares(diferencias.bs)} Bs` : 
                    `${formatearBolivares(diferencias.bs)} Bs`}
                 </div>
               )}
             </div>
             {/* Dólares */}
             <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
               <div className="flex items-center space-x-2 mb-3">
                 <DollarSign className="h-5 w-5 text-blue-600" />
                 <span className="font-semibold text-blue-800">Efectivo Dólares</span>
               </div>
               <input
                 type="number"
                 step="0.01"
                 value={montoFinalUsd}
                 onChange={(e) => setMontoFinalUsd(e.target.value)}
                 className="w-full px-4 py-3 text-xl font-bold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                 placeholder="0.00"
                 required
               />
               <div className="text-xs text-blue-600 mt-1 text-center">
                 Conteo físico actual
               </div>
               {montoFinalUsd && (
                 <div className={`text-xs mt-1 text-center font-semibold ${
                   diferencias.usd > 0 ? 'text-blue-600' : diferencias.usd < 0 ? 'text-red-600' : 'text-green-600'
                 }`}>
                   {diferencias.usd === 0 ? ' Exacto' : 
                    diferencias.usd > 0 ? `+$${formatearDolares(diferencias.usd)}` : 
                    `-$${formatearDolares(Math.abs(diferencias.usd))}`}
                 </div>
               )}
             </div>

             {/* Pago Móvil */}
             <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
               <div className="flex items-center space-x-2 mb-3">
                 <Smartphone className="h-5 w-5 text-purple-600" />
                 <span className="font-semibold text-purple-800">Pago Móvil</span>
               </div>
               <input
                 type="number"
                 step="0.01"
                 value={montoFinalPagoMovil}
                 onChange={(e) => setMontoFinalPagoMovil(e.target.value)}
                 className="w-full px-4 py-3 text-xl font-bold border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center"
                 placeholder="0"
                 required
               />
               <div className="text-xs text-purple-600 mt-1 text-center">
                 Saldo en cuenta
               </div>
               {montoFinalPagoMovil && (
                 <div className={`text-xs mt-1 text-center font-semibold ${
                   diferencias.pagoMovil > 0 ? 'text-blue-600' : diferencias.pagoMovil < 0 ? 'text-red-600' : 'text-green-600'
                 }`}>
                   {diferencias.pagoMovil === 0 ? ' Exacto' : 
                    diferencias.pagoMovil > 0 ? `+${formatearBolivares(diferencias.pagoMovil)} Bs` : 
                    `${formatearBolivares(diferencias.pagoMovil)} Bs`}
                 </div>
               )}
             </div>
           </div>

           {/* ALERTAS DE DIFERENCIAS */}
           {hayDiferencias() && (
             <div className={`border-2 rounded-xl p-4 mb-6 ${
               hayDiferenciasSignificativas() ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
             }`}>
               <div className="flex items-center space-x-2 mb-2">
                 {hayDiferenciasSignificativas() ? (
                   <AlertTriangle className="h-5 w-5 text-red-600" />
                 ) : (
                   <AlertTriangle className="h-5 w-5 text-yellow-600" />
                 )}
                 <span className={`font-semibold ${
                   hayDiferenciasSignificativas() ? 'text-red-800' : 'text-yellow-800'
                 }`}>
                   {hayDiferenciasSignificativas() ? 'Diferencias Significativas Detectadas' : 'Diferencias Menores Detectadas'}
                 </span>
               </div>
               <div className={`text-sm space-y-1 ${
                 hayDiferenciasSignificativas() ? 'text-red-700' : 'text-yellow-700'
               }`}>
                 {Math.abs(diferencias.bs) > 0.01 && (
                   <div>• Bolívares: {diferencias.bs > 0 ? 'Sobrante' : 'Faltante'} de {formatearBolivares(Math.abs(diferencias.bs))} Bs</div>
                 )}
                 {Math.abs(diferencias.usd) > 0.01 && (
                   <div>• Dólares: {diferencias.usd > 0 ? 'Sobrante' : 'Faltante'} de ${formatearDolares(Math.abs(diferencias.usd))}</div>
                 )}
                 {Math.abs(diferencias.pagoMovil) > 0.01 && (
                   <div>• Pago Móvil: {diferencias.pagoMovil > 0 ? 'Sobrante' : 'Faltante'} de {formatearBolivares(Math.abs(diferencias.pagoMovil))} Bs</div>
                 )}
               </div>
               {hayDiferenciasSignificativas() && (
                 <div className="mt-2 text-xs font-semibold">
                   {usuario?.rol?.toLowerCase() === 'admin' ? (
                     <div className="text-blue-600">ℹ Como administrador, puede proceder con estas diferencias</div>
                   ) : (
                     <div className="text-red-600"> Se requiere autorización de administrador para proceder</div>
                   )}
                 </div>
               )}
             </div>
           )}

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones del Cierre (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={3}
              placeholder="Observaciones adicionales sobre el conteo físico..."
            />
          </div>

          {/* Indicador de progreso */}
          {loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                <div className="text-sm text-amber-700">
                  Procesando cierre de caja pendiente...
                </div>
              </div>
            </div>
          )}

           {/* Botones */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
             >
               Cancelar
             </button>
             <button
               type="submit"
               disabled={loading || !montoFinalBs || !montoFinalUsd || !montoFinalPagoMovil || (hayDiferenciasSignificativas() && usuario?.rol?.toLowerCase() !== 'admin')}
               className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
             >
               {loading ? (
                 <span className="flex items-center justify-center space-x-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                   <span>Resolviendo Caja...</span>
                 </span>
               ) : (
                 hayDiferencias() ? 'Resolver con Diferencias' : 'Completar Cierre Físico'
               )}
             </button>
           </div>
         </form>
       </div>
     </div>
   </div>
 );
};

export default ConteoDirectoModal;