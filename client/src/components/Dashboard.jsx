// src/components/Dashboard.jsx (REORGANIZADO CON Z-INDEX, BACKDROP AZUL Y ANIMACIONES)
import React, { useState, useEffect, useCallback } from 'react';
import CajaStatus from './CajaStatus';
import Summary from './Summary';
import RecentActivity from './RecentActivity';
import TransactionTable from './TransactionTable';
import IngresoModal from './IngresoModal';
import EgresoModal from './EgresoModal';
import InventoryManagerModal from './InventoryManagerModal';
import ArqueoModal from './ArqueoModal';
import { Wrench, ChevronUp, ChevronDown } from 'lucide-react';
import FloatingActions from './FloatingActions';
import CerrarCajaModal from './CerrarCajaModal';
import { useDashboard } from '../store/cajaStore';
import { useInventarioStore } from '../store/inventarioStore';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { api } from '../config/api';
import ConfiguracionModal from './ConfiguracionModal';
import PresupuestoModal from './PresupuestoModal';
import SeleccionarPresupuestoModal from './presupuesto/SeleccionarPresupuestoModal';
import ActividadesModal from './actividades/ActividadesModal';
import ReportesModal from './reportes/ReportesModal';
import ServiciosDashboard from './ServiciosDashboard';
import TransactionDetailModal from './TransactionDetailModal';
import ChangelogModal from './ChangelogModal';
import DescuentoAprobacionModal from './DescuentoAprobacionModal';
import { useDescuentoRequests } from '../hooks/useDescuentoRequests';
import toast from '../utils/toast.jsx';

const ModalBackdrop = ({ children, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/40',
    green: 'bg-gradient-to-br from-green-900/40 via-green-800/30 to-green-900/40',
    orange: 'bg-gradient-to-br from-orange-900/40 via-orange-800/30 to-orange-900/40',
    red: 'bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40',
    indigo: 'bg-gradient-to-br from-indigo-900/40 via-indigo-800/30 to-indigo-900/40',
    gray: 'bg-gradient-to-br from-gray-900/40 via-gray-800/30 to-gray-900/40',
    emerald: 'bg-gradient-to-br from-emerald-900/40 via-emerald-800/30 to-emerald-900/40',
    cyan: 'bg-gradient-to-br from-cyan-900/40 via-cyan-800/30 to-cyan-900/40',
    purple: 'bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-purple-900/40'
  };
  
  return (
    <div className={`fixed inset-0 ${colorClasses[color] || colorClasses.blue} backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4 animate-modal-backdrop-enter`}>
    {children}
  </div>
);
};

const Dashboard = ({ emitirEvento }) => {
 const [showTestingPanel, setShowTestingPanel] = useState(false);

 // 🎨 Estado para paneles colapsables
 const [panelsCollapsed, setPanelsCollapsed] = useState(false);

 const { loading, cajaActual } = useDashboard();
 const { obtenerInventario } = useInventarioStore();
 const { tienePermiso, usuario } = useAuthStore();
 const {
   activeDashboard,
   isTransitioning,
   switchToServices,
   switchToMain,
   isServicesActive,
   isMainActive,
   getTransitionClass,
   transitionPhase
 } = useDashboardStore();
 
 // Ã°Å¸â€œâ€¹ ESTADOS PARA MODALES AGRUPADOS
 const [showIngresoModal, _setShowIngresoModal] = useState(false);
 
 // 🐛 DEBUG: WRAPPER PARA INTERCEPTAR setShowIngresoModal
 const setShowIngresoModal = useCallback((value) => {
   if (value === true) {
     const stackTrace = new Error().stack;
     const stackLines = stackTrace?.split('\n') || [];
     
     // Buscar la línea que realmente llama a setShowIngresoModal
     const callerLine = stackLines.find((line, index) => {
       // Buscar después de las primeras líneas del stack (omitir el wrapper y useState)
       return index > 3 && (
         line.includes('handleNewTransaction') ||
         line.includes('FloatingActions') ||
         line.includes('Dashboard.jsx:') ||
         line.includes('setShowIngresoModal') ||
         line.includes('keydown') ||
         line.includes('onClick')
       );
     }) || stackLines[4] || 'No encontrado';
     
     console.log('🔴 ============================================');
     console.log('🔴 [DASHBOARD] INTENTO DE ABRIR IngresoModal');
     console.log(`🔴 Llamado desde: ${callerLine}`);
     console.log('🔴 Stack trace completo:');
     console.log(stackTrace);
     console.log('🔴 ============================================');
   }
   
   _setShowIngresoModal(value);
 }, []);
 
 // 🐛 DEBUG: RASTREAR CAMBIOS EN showIngresoModal (solo para confirmación)
 useEffect(() => {
   if (showIngresoModal) {
     console.log(`🟣 [DASHBOARD] showIngresoModal confirmado: ${showIngresoModal}`);
   }
 }, [showIngresoModal]);
 const [showEgresoModal, setShowEgresoModal] = useState(false);
 const [showCerrarModal, setShowCerrarModal] = useState(false);
 const [showInventarioModal, setShowInventarioModal] = useState(false);
 const [showArqueoModal, setShowArqueoModal] = useState(false);
 const [showConfiguracionModal, setShowConfiguracionModal] = useState(false);
  const [showPresupuestoModal, setShowPresupuestoModal] = useState(false);
  const [showSeleccionarPresupuestoModal, setShowSeleccionarPresupuestoModal] = useState(false);
  const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState(null);
 const [showActividadesModal, setShowActividadesModal] = useState(false);
 const [showReportesModal, setShowReportesModal] = useState(false);
 const [showScannerSidebar, setShowScannerSidebar] = useState(false);

 const [showTransactionDetail, setShowTransactionDetail] = useState(false);
 const [selectedTransactionDetail, setSelectedTransactionDetail] = useState(null);
 const [showChangelog, setShowChangelog] = useState(false);
 
 // 💰 ESTADOS PARA SOLICITUDES DE DESCUENTO (SOLO ADMINS)
 const { solicitudesPendientes, loading: loadingSolicitudes } = useDescuentoRequests();
 const [solicitudActual, setSolicitudActual] = useState(null);
 const [showDescuentoAprobacionModal, setShowDescuentoAprobacionModal] = useState(false);
 const procesandoSolicitudRef = React.useRef(false);

 // Mostrar modal de aprobación cuando hay solicitudes pendientes (solo admins)
 useEffect(() => {
   if (usuario?.rol === 'admin' && solicitudesPendientes.length > 0 && !showDescuentoAprobacionModal && !procesandoSolicitudRef.current) {
     // Mostrar la primera solicitud pendiente solo si no es la que acabamos de procesar
     const siguienteSolicitud = solicitudesPendientes[0];
     if (!solicitudActual || solicitudActual.id !== siguienteSolicitud.id) {
       setSolicitudActual(siguienteSolicitud);
       setShowDescuentoAprobacionModal(true);
     }
   }
 }, [solicitudesPendientes, usuario?.rol, showDescuentoAprobacionModal]);

 const handleSolicitudAprobada = (solicitud) => {
   // Marcar que estamos procesando una solicitud para evitar que se vuelva a abrir el modal inmediatamente
   procesandoSolicitudRef.current = true;
   setSolicitudActual(null);
   setShowDescuentoAprobacionModal(false);

   // Después de un breve delay, permitir que se abra el modal con la siguiente solicitud
   setTimeout(() => {
     procesandoSolicitudRef.current = false;
   }, 500);
 };

 const handleSolicitudRechazada = (solicitud) => {
   // Marcar que estamos procesando una solicitud para evitar que se vuelva a abrir el modal inmediatamente
   procesandoSolicitudRef.current = true;
   setSolicitudActual(null);
   setShowDescuentoAprobacionModal(false);

   // Después de un breve delay, permitir que se abra el modal con la siguiente solicitud
   setTimeout(() => {
     procesandoSolicitudRef.current = false;
   }, 500);
 };

 const handleCerrarAprobacionModal = () => {
   setSolicitudActual(null);
   setShowDescuentoAprobacionModal(false);
 };
 
useEffect(() => {
  obtenerInventario();
}, [obtenerInventario]);

// Verificar si mostrar changelog
useEffect(() => {
  const currentVersion = "2.1.0 Alpha";
  const normalizedVersion = currentVersion.split(' ')[0];
  const userKey = usuario?.id || usuario?.email || 'global';
  let shouldShow = true;

  if (typeof window !== 'undefined') {
    try {
      const rawPreferences = localStorage.getItem('changelog-preferences');
      if (rawPreferences) {
        const parsed = JSON.parse(rawPreferences);
        const userPreferences = parsed?.users?.[userKey];

        if (userPreferences?.hidePermanently) {
          shouldShow = false;
        } else if (userPreferences?.lastViewedVersion) {
          const storedVersion = userPreferences.lastViewedVersion.split(' ')[0];
          if (storedVersion === normalizedVersion) {
            shouldShow = false;
          }
        }
      }

      if (shouldShow) {
        const legacyViewed = localStorage.getItem('changelog-viewed');
        if (legacyViewed) {
          const legacyVersion = legacyViewed.split(' ')[0];
          if (legacyVersion === normalizedVersion) {
            shouldShow = false;
          }
        }
      }
    } catch (error) {
      console.error('Error evaluando preferencias del changelog:', error);
    }
  }

  if (!shouldShow) {
    setShowChangelog(false);
    return;
  }

  const timer = setTimeout(() => {
    setShowChangelog(true);
  }, 1500);

  return () => clearTimeout(timer);
}, [usuario]);

 // Ã°Å¸Å½Â¯ HANDLERS DE NAVEGACIÃƒâ€œN CON PERMISOS
 const handleNewTransaction = (type) => {
   if (!tienePermiso('REALIZAR_VENTAS')) {
     toast.error('No tienes permisos para realizar transacciones');
     return;
   }

   if (type === 'ingreso') {
     // ✅ PROTECCIÓN: NO ABRIR MODAL SI HAY UNA VENTA PROCESADA RECIENTEMENTE
     const ventaProcesadaFlag = sessionStorage.getItem('venta_procesada_flag');
     if (ventaProcesadaFlag === 'true') {
       console.warn('⚠️ [DASHBOARD] Intento de abrir modal con venta procesada - bloqueando');
       console.warn('⚠️ Flag en sessionStorage:', ventaProcesadaFlag);
       // Limpiar el flag para permitir nueva venta (el proceso ya terminó)
       sessionStorage.removeItem('venta_procesada_flag');
       console.log('🔵 [DASHBOARD] Flag limpiado - permitiendo nueva venta');
       // Esperar un momento antes de abrir para asegurar que el proceso anterior terminó
       setTimeout(() => {
         setShowIngresoModal(true);
       }, 100);
       return; // NO abrir el modal inmediatamente
     }
     
     setShowIngresoModal(true);
   } else if (type === 'egreso') {
     setShowEgresoModal(true);
   }
 };

 const handleCerrarCaja = () => {
   if (!tienePermiso('CERRAR_CAJA')) {
     toast.error('No tienes permisos para cerrar la caja');
     return;
   }
   
   if (cajaActual) {
     setShowCerrarModal(true);
   }
 };

 const handleOpenScanner = () => {
   setShowScannerSidebar(true);
 };

 const handleOpenInventario = () => {
   setShowInventarioModal(true);
 };

 const handleOpenConfiguracion = () => {
   setShowConfiguracionModal(true);
 };

 const handleOpenPresupuesto = () => {
   setShowSeleccionarPresupuestoModal(true);
 };

 const handleSeleccionarPresupuesto = (presupuesto) => {
   setPresupuestoSeleccionado(presupuesto);
   setShowSeleccionarPresupuestoModal(false);
   setShowPresupuestoModal(true);
 };

 const handleNuevoPresupuesto = () => {
   setPresupuestoSeleccionado(null);
   setShowSeleccionarPresupuestoModal(false);
   setShowPresupuestoModal(true);
 };

 const handleOpenActividades = () => {
   setShowActividadesModal(true);
 };

 const handleOpenReportes = () => {
   setShowReportesModal(true);
 };

 const handleOpenServicios = () => {
   switchToServices();
 };

 const handleOpenArqueo = () => {
  if (!tienePermiso('ARQUEO_CAJA')) {
    toast.error('No tienes permisos para realizar arqueo');
    return;
  }
  
  if (cajaActual) {
    setShowArqueoModal(true);
  }
};

// FunciÃƒÂ³n para mostrar detalles de transacciÃƒÂ³n
const handleShowTransactionDetail = async (transaccion) => {
  try {
    // Mostrar loading
    setSelectedTransactionDetail({ ...transaccion, loading: true });
    setShowTransactionDetail(true);
    
    // Cargar detalles completos del backend
    const response = await api.get(`/cajas/transacciones/${transaccion.id}/detalle`);
    const transaccionCompleta = response.data.data;
    
    // Actualizar con datos completos
    setSelectedTransactionDetail(transaccionCompleta);
    
  } catch (error) {
    console.error('Error cargando detalles:', error);
    toast.error('Error cargando detalles de la transacciÃƒÂ³n');
    
    // Fallback: usar datos bÃƒÂ¡sicos
    setSelectedTransactionDetail(transaccion);
  }
};

 // Ã¢Å’Â¨Ã¯Â¸Â ATAJOS DE TECLADO
 useEffect(() => {
   const handleKeyDown = (event) => {
     // Solo procesar si no hay modales abiertos y estamos en dashboard principal
     if (showIngresoModal || showEgresoModal || showCerrarModal || showInventarioModal || 
         showArqueoModal || showConfiguracionModal || showActividadesModal || !isMainActive()) {
       return;
     }

     if (event.ctrlKey && event.key === 'i' && cajaActual && tienePermiso('REALIZAR_VENTAS')) {
       event.preventDefault();
       // ✅ PROTECCIÓN: NO ABRIR MODAL SI HAY UNA VENTA PROCESADA RECIENTEMENTE
       const ventaProcesadaFlag = sessionStorage.getItem('venta_procesada_flag');
       if (ventaProcesadaFlag === 'true') {
         console.warn('⚠️ [DASHBOARD] Intento de abrir modal con venta procesada (teclado) - bloqueando');
         return; // NO abrir el modal
       }
       setShowIngresoModal(true);
     } else if (event.ctrlKey && event.key === 'e' && cajaActual && tienePermiso('REALIZAR_VENTAS')) {
       event.preventDefault();
       setShowEgresoModal(true);
     } else if (event.ctrlKey && event.key === 'q' && cajaActual && tienePermiso('CERRAR_CAJA')) {
       event.preventDefault();
       setShowCerrarModal(true);
     } else if (event.ctrlKey && event.key === 'p') {
       event.preventDefault();
       setShowInventarioModal(true);
     } else if (event.ctrlKey && event.key === 'a' && cajaActual && tienePermiso('ARQUEO_CAJA')) {
       event.preventDefault();
       setShowArqueoModal(true);
     } else if (event.ctrlKey && event.key === 't') {
       event.preventDefault();
       setShowActividadesModal(true);
     } else if (event.ctrlKey && event.key === 's') {
       event.preventDefault();
       switchToServices();
     } else if (event.ctrlKey && event.key === 'h') {
       event.preventDefault();
       setPanelsCollapsed(prev => !prev);
     }
   };

   document.addEventListener('keydown', handleKeyDown);

   return () => {
     document.removeEventListener('keydown', handleKeyDown);
   };
 }, [showIngresoModal, showEgresoModal, showCerrarModal, showInventarioModal,
    showArqueoModal, showConfiguracionModal, cajaActual, tienePermiso, isMainActive, switchToServices, panelsCollapsed]);

// Registrar funciÃƒÂ³n global para TransactionTable
useEffect(() => {
  window.showTransactionDetail = handleShowTransactionDetail;
  
  return () => {
    delete window.showTransactionDetail;
  };
}, []);

 // Ã°Å¸â€â€ž ESTADO DE CARGA - RESPONSIVE
 if (loading) {
   return (
     <main className="min-h-screen bg-gray-50">
       <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
         <div className="flex items-center justify-center h-48 sm:h-64">
           <div className="flex flex-col items-center space-y-3 sm:space-y-4">
             <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
             <p className="text-sm sm:text-base text-gray-600 font-medium text-center px-4">Cargando Electro Caja...</p>
             <p className="text-xs sm:text-sm text-gray-500 text-center px-4">Usuario: {usuario?.nombre} ({usuario?.rol})</p>
           </div>
         </div>
       </div>
     </main>
   );
 }

 // Ã°Å¸â€Â§ RENDERIZAR DASHBOARD DE SERVICIOS SI ESTÃƒÂ ACTIVO
 if (isServicesActive()) {
   return <ServiciosDashboard />;
 }

 // Ã°Å¸Å½Â¨ DASHBOARD PRINCIPAL CON CAPAS ORDENADAS - FULL RESPONSIVE
 return (
   <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 relative overflow-x-hidden">

     {/* Ã°Å¸Å’Å  PATRÃƒâ€œN DE FONDO METÃƒÂLICO AZUL - CAPA BASE (z-0) */}
     <div className="absolute inset-0">
       <div className="absolute inset-0 bg-gradient-to-br from-blue-800/95 via-blue-700/90 to-blue-800/95" />
       <div
         className="absolute inset-0 opacity-[0.03] hidden sm:block"
         style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.7'%3E%3Cpath d='M50 50c0-27.614-22.386-50-50-50v100c27.614 0 50-22.386 50-50zM0 0h50v50H0z'/%3E%3C/g%3E%3C/svg%3E")`,
           backgroundSize: '100px 100px'
         }}
       />
       <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/5 rounded-full blur-3xl" />
       <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/5 rounded-full blur-3xl" />
     </div>

     {/* Ã°Å¸â€œÅ  CONTENIDO PRINCIPAL CON TRANSICIONES (z-10) - RESPONSIVE */}
     <div className={`relative z-10 transition-all duration-300 ease-in-out ${getTransitionClass()}`}>
       <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-3">
         <div className="space-y-2 sm:space-y-3">

           {/* 🎨 BOTÓN PARA COLAPSAR/EXPANDIR PANELES */}
           <div className="flex justify-center">
             <button
               onClick={() => setPanelsCollapsed(!panelsCollapsed)}
               title={`${panelsCollapsed ? 'Mostrar' : 'Ocultar'} Paneles (Ctrl + H)`}
               className="
                 group relative
                 bg-gradient-to-r from-blue-600 to-blue-700
                 hover:from-blue-700 hover:to-blue-800
                 text-white
                 px-4 py-1.5
                 rounded-full
                 shadow-lg hover:shadow-xl
                 transition-all duration-300
                 flex items-center space-x-2
                 border border-blue-500/20
                 hover:scale-105
                 active:scale-95
               "
             >
               {panelsCollapsed ? (
                 <>
                   <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                   <span className="font-medium text-xs">Mostrar Paneles</span>
                 </>
               ) : (
                 <>
                   <ChevronUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                   <span className="font-medium text-xs">Ocultar Paneles</span>
                 </>
               )}

               {/* Badge con atajo de teclado */}
               <span className="ml-1 text-[10px] bg-white/20 px-1 py-0.5 rounded font-mono">
                 Ctrl+H
               </span>

               {/* Efecto de brillo */}
               <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             </button>
           </div>

           {/* FILA 1: 3 COLUMNAS - Información y controles CON ANIMACIÓN DE COLAPSO */}
           <div
             className={`
               grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 items-stretch
               transition-all duration-700 ease-in-out
               ${panelsCollapsed
                 ? 'opacity-0 max-h-0 scale-y-0 -mt-2 overflow-hidden pointer-events-none'
                 : 'opacity-100 max-h-[1000px] scale-y-100 mt-0'
               }
             `}
             style={{
               transformOrigin: 'top center',
               transitionProperty: 'opacity, transform, max-height, margin',
               transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
             }}
           >
             <div className={`h-full w-full transition-all duration-500 delay-0 ${panelsCollapsed ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
               <CajaStatus />
             </div>
             <div className={`h-full w-full transition-all duration-500 delay-75 ${panelsCollapsed ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
               <Summary />
             </div>
             <div className={`h-full w-full transition-all duration-500 delay-150 ${panelsCollapsed ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
               <RecentActivity />
             </div>
           </div>

           {/* FILA 2: 1 COLUMNA COMPLETA - Tabla de transacciones */}
           <div className={`transition-all duration-500 ${panelsCollapsed ? 'delay-200' : 'delay-0'}`}>
             <TransactionTable itemsPerPage={panelsCollapsed ? 7 : 4} />
           </div>

         </div>
       </main>
     </div>

     {/* Ã°Å¸Å½Â¯ BOTONES FLOTANTES (z-50) */}
     
     {/* FloatingActions - Esquina inferior derecha */}
     <FloatingActions
       onNewTransaction={handleNewTransaction}
       onCerrarCaja={handleCerrarCaja}
       onOpenInventario={handleOpenInventario}
       onOpenArqueo={handleOpenArqueo}
       onOpenConfiguracion={handleOpenConfiguracion}
       onOpenPresupuesto={handleOpenPresupuesto}
       onOpenActividades={handleOpenActividades}
       onOpenReportes={handleOpenReportes}
       onOpenScanner={handleOpenScanner}
       cajaActual={cajaActual}
     />

     {/* Ã°Å¸â€Â§ BotÃƒÂ³n flotante para servicios - Lado izquierdo - RESPONSIVE */}
     <button
       onClick={handleOpenServicios}
       className="
         fixed left-2 sm:left-4 top-1/2 -translate-y-1/2
         z-40 group
         bg-gradient-to-b from-gray-600 to-gray-700
         hover:from-gray-700 hover:to-gray-800
         text-gray-200 shadow-2xl
         ring-1 ring-gray-500/20
         transition-all duration-300
         px-3 py-3 sm:px-5 sm:py-4
         hover:scale-110 hover:shadow-[0_0_25px_rgba(107,114,128,0.4)]
         active:scale-95
       "
       style={{
         clipPath: 'polygon(25% 0%, 100% 0%, 85% 50%, 100% 100%, 25% 100%, 0% 50%)'
       }}
       title="Ir a Servicios (Ctrl + S)"
     >
       <Wrench className="h-5 w-5 sm:h-7 sm:w-7 drop-shadow-sm transition-transform duration-300 group-hover:rotate-12" />

       <span
         className="
           hidden md:block
           pointer-events-none absolute left-14 sm:left-16 top-1/2 -translate-y-1/2
           px-3 py-2 rounded-lg text-sm font-medium
           bg-gray-900/95 backdrop-blur-sm text-gray-200
           opacity-0 group-hover:opacity-100
           transition-all duration-300 delay-150
           whitespace-nowrap border border-gray-700
           shadow-xl z-10
           before:content-['] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2
           before:border-4 before:border-transparent before:border-r-gray-900/95
         "
       >
         <span className="block">Ir a Servicios</span>
         <span className="text-xs text-gray-400">"Ctrl + S"</span>
       </span>
     </button>

     {/* Ã°Å¸Å½Â­ MODALES CON BACKDROP AZUL GRADIENTE - REFACTORIZADO Y LIMPIO */}
     <>
       {/* MODALES DE TRANSACCIONES */}
       {tienePermiso('REALIZAR_VENTAS') && showIngresoModal && (
         <ModalBackdrop color="green">
           <IngresoModal
             className="animate-modal-enter w-full"
             isOpen={showIngresoModal}
             onClose={() => setShowIngresoModal(false)}
             emitirEvento={emitirEvento}
           />
         </ModalBackdrop>
       )}

       {tienePermiso('REALIZAR_VENTAS') && showEgresoModal && (
         <ModalBackdrop color="orange">
           <EgresoModal
             className="animate-modal-enter w-full"
             isOpen={showEgresoModal}
             onClose={() => setShowEgresoModal(false)}
             emitirEvento={emitirEvento}
           />
         </ModalBackdrop>
       )}

       {/* MODALES DE CAJA */}
       {tienePermiso('CERRAR_CAJA') && showCerrarModal && (
         <ModalBackdrop color="red">
           <CerrarCajaModal
             className="animate-modal-enter w-full"
             isOpen={showCerrarModal}
             onClose={() => setShowCerrarModal(false)}
           />
         </ModalBackdrop>
       )}

       {tienePermiso('ARQUEO_CAJA') && showArqueoModal && (
         <ModalBackdrop color="orange">
           <ArqueoModal
             className="animate-modal-enter w-full"
             isOpen={showArqueoModal}
             onClose={() => setShowArqueoModal(false)}
           />
         </ModalBackdrop>
       )}

       {/* MODALES DE GESTION */}
       {showInventarioModal && (
         <ModalBackdrop color="indigo">
           <InventoryManagerModal
             className="animate-modal-enter w-full"
             isOpen={showInventarioModal}
             onClose={() => setShowInventarioModal(false)}
           />
         </ModalBackdrop>
       )}

       {showConfiguracionModal && (
         <ModalBackdrop color="gray">
           <ConfiguracionModal
             className="animate-modal-enter w-full"
             isOpen={showConfiguracionModal}
             onClose={() => setShowConfiguracionModal(false)}
           />
         </ModalBackdrop>
       )}

      {showSeleccionarPresupuestoModal && (
        <SeleccionarPresupuestoModal
          isOpen={showSeleccionarPresupuestoModal}
          onClose={() => setShowSeleccionarPresupuestoModal(false)}
          onSeleccionar={handleSeleccionarPresupuesto}
          onNuevo={handleNuevoPresupuesto}
        />
      )}

      {showPresupuestoModal && (
        <ModalBackdrop color="emerald">
          <PresupuestoModal
            className="animate-modal-enter w-full"
            isOpen={showPresupuestoModal}
            onClose={() => {
              setShowPresupuestoModal(false);
              setPresupuestoSeleccionado(null);
            }}
            presupuesto={presupuestoSeleccionado}
          />
        </ModalBackdrop>
      )}

       {/* MODALES DE REPORTES Y ACTIVIDADES */}
       {showActividadesModal && (
         <ModalBackdrop color="cyan">
           <ActividadesModal
             className="animate-modal-enter w-full"
             isOpen={showActividadesModal}
             onClose={() => setShowActividadesModal(false)}
           />
         </ModalBackdrop>
       )}

       {usuario?.rol === 'admin' && showReportesModal && (
         <ModalBackdrop color="purple">
           <ReportesModal
             className="animate-modal-enter w-full"
             isOpen={showReportesModal}
             onClose={() => setShowReportesModal(false)}
           />
         </ModalBackdrop>
       )}

       {/* MODAL DE DETALLE DE TRANSACCION */}
       {showTransactionDetail && (
         <ModalBackdrop>
           <TransactionDetailModal
             className="animate-modal-enter w-full"
             isOpen={showTransactionDetail}
             onClose={() => setShowTransactionDetail(false)}
             transaccion={selectedTransactionDetail}
           />
         </ModalBackdrop>
       )}

       {/* MODAL DE CHANGELOG */}
       {showChangelog && (
         <ChangelogModal
           isOpen={showChangelog}
           onClose={() => setShowChangelog(false)}
         />
       )}

       {/* 💰 MODAL DE APROBACIÓN DE DESCUENTOS (SOLO ADMINS) */}
       {usuario?.rol === 'admin' && showDescuentoAprobacionModal && solicitudActual && (
         <DescuentoAprobacionModal
           solicitud={solicitudActual}
           onClose={handleCerrarAprobacionModal}
           onAprobado={handleSolicitudAprobada}
           onRechazado={handleSolicitudRechazada}
         />
       )}
     </>
   </div>
 );
};

export default Dashboard;
