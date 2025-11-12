// components/Header.jsx (FULL RESPONSIVE MOBILE + TEMAS DINÁMICOS + STICKY)
import React, { useEffect, useState } from 'react';
import { DollarSign, RefreshCw, LogOut, Loader2, Edit3, Bell, BellRing, RotateCcw, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import LogoutConfirmModal from './LogoutConfirmModal';
import toast from '../utils/toast.jsx';
import { api } from '../config/api';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { useNotificacionesStore, useNotificacionesCount, NOTIFICACION_CONFIG } from '../store/notificacionesStore';

const Header = () => {
 const { cajaActual, tasaCambio, loadTasaCambio, loadTasaFromServer, updateTasaCambio } = useCajaStore();
 const {
   usuario,
   logout,
   loading
 } = useAuthStore();
 const { theme, isDarkTheme } = useDashboardStore();
 const { emitirEvento } = useSocketEvents();

 const [lastUpdate, setLastUpdate] = useState(new Date());
 const [isLoggingOut, setIsLoggingOut] = useState(false);
 const [isEditingTasa, setIsEditingTasa] = useState(false);
 const [tempTasa, setTempTasa] = useState('');
 const [tasaMode, setTasaMode] = useState('AUTO');
 const [showLogoutModal, setShowLogoutModal] = useState(false);

 //  Estados de notificaciones
 const [showNotificaciones, setShowNotificaciones] = useState(false);
 const notificacionesCount = useNotificacionesCount();
 const { notificaciones, retryNotificacion, retryAll, markAllAsRead, clearAll, removeNotificacion } = useNotificacionesStore();

 //  CONFIGURACIÓN DE TEMAS
 const themeConfig = {
   blue: {
     gradient: 'bg-gradient-to-r from-blue-600 to-blue-700',
     logoText: 'text-white',
     subtitle: 'text-blue-100',
     tasaSection: 'text-white',
     tasaLabel: 'text-blue-200',
     tasaValue: 'text-white',
     tasaBadge: {
       AUTO: 'bg-green-500/20 text-green-200',
       MANUAL: 'bg-orange-500/20 text-orange-200',
       ERROR: 'bg-red-500/20 text-red-200'
     },
     buttons: 'text-white/70 hover:text-white hover:bg-white/10',
     userSection: 'text-white',
     roleBadge: {
       admin: 'text-red-100 bg-red-500/20',
       supervisor: 'text-blue-100 bg-blue-500/20',
       cajero: 'text-green-100 bg-green-500/20',
       viewer: 'text-gray-100 bg-gray-500/20'
     }
   },
   dark: {
     gradient: 'bg-gradient-to-r from-gray-700 to-gray-800',
     logoText: 'text-gray-100',
     subtitle: 'text-gray-400',
     tasaSection: 'text-gray-100',
     tasaLabel: 'text-gray-400',
     tasaValue: 'text-gray-100',
     tasaBadge: {
       AUTO: 'bg-green-600/30 text-green-300',
       MANUAL: 'bg-orange-600/30 text-orange-300',
       ERROR: 'bg-red-600/30 text-red-300'
     },
     buttons: 'text-gray-400 hover:text-gray-100 hover:bg-gray-700/50',
     userSection: 'text-gray-100',
     roleBadge: {
       admin: 'text-red-200 bg-red-600/30',
       supervisor: 'text-blue-200 bg-blue-600/30',
       cajero: 'text-green-200 bg-green-600/30',
       viewer: 'text-gray-200 bg-gray-600/30'
     }
   }
 };

 const currentTheme = themeConfig[theme];

 //  AUTO-ACTUALIZACIÓN CADA 1 HORA
 useEffect(() => {
   if (!usuario) return;

   const HORA_EN_MS = 60 * 60 * 1000;

   const actualizarAutomaticamente = async () => {
     try {
       console.log(' Auto-actualización de tasa BCV (cada 1 hora)...');
       const nuevaTasa = await loadTasaCambio();

       if (nuevaTasa && nuevaTasa > 0 && tasaMode === 'AUTO') {
         updateTasaCambio(nuevaTasa);
         setLastUpdate(new Date());
         console.log(` Tasa BCV actualizada automáticamente: $${nuevaTasa.toFixed(2)}`);

         if (usuario?.rol === 'admin') {
           toast.success(`Tasa BCV actualizada: $${nuevaTasa.toFixed(2)}`, {
             duration: 3000,
           });
         }
       }
     } catch (error) {
       console.error(' Error en auto-actualización de tasa:', error);
     }
   };

   const intervalo = setInterval(actualizarAutomaticamente, HORA_EN_MS);

   return () => clearInterval(intervalo);
 }, [usuario, tasaMode, loadTasaCambio, updateTasaCambio]);

 // Listener para cambios de tasa manual
 useEffect(() => {
   const { socket } = useAuthStore.getState();
   if (!socket) return;

   const handleTasaManualUpdated = (data) => {
     const { tasa, admin, timestamp } = data;
     console.log(' Tasa manual recibida:', data);

     updateTasaCambio(tasa);
     setTasaMode('MANUAL');
     setLastUpdate(new Date(timestamp));

     if (admin !== usuario?.nombre) {
       toast.success(`Tasa actualizada por ${admin}: $${tasa.toFixed(2)}`, {
         duration: 4000,
       });
     }
   };

   const handleTasaAutoUpdated = (data) => {
     const { tasa, admin, timestamp } = data;
     console.log(' Tasa AUTO recibida:', data);

     updateTasaCambio(tasa);
     setTasaMode('AUTO');
     setLastUpdate(new Date(timestamp));

     if (admin !== usuario?.nombre) {
       toast.success(`Tasa actualizada automáticamente por ${admin}: $${tasa.toFixed(2)}`, {
         duration: 4000,
       });
     }
   };

   socket.on('tasa_manual_updated', handleTasaManualUpdated);
   socket.on('tasa_auto_updated', handleTasaAutoUpdated);

   return () => {
     socket.off('tasa_manual_updated', handleTasaManualUpdated);
     socket.off('tasa_auto_updated', handleTasaAutoUpdated);
   };
 }, [usuario?.nombre, updateTasaCambio]);

 // Cargar estado de tasa al inicializar
 useEffect(() => {
   const inicializarTasa = async () => {
     if (window.tasaInitializing) {
       return;
     }

     window.tasaInitializing = true;

     try {
       const tasa = await loadTasaFromServer();

       const estadoResponse = await api.get('/tasa-bcv/estado');
       const estadoServidor = estadoResponse.data.data;

       setTasaMode(estadoServidor.modo);
       setLastUpdate(new Date(estadoServidor.timestamp));

     } catch (error) {
       console.error('Error inicializando tasa en Header:', error);
     } finally {
       window.tasaInitializing = false;
     }
   };

   if (usuario && loadTasaFromServer) {
     inicializarTasa();
   }
 }, [usuario?.id, loadTasaFromServer]); // ✅ AGREGADO loadTasaFromServer a las dependencias

 const handleRefresh = async () => {
   try {
     console.log(' Admin forzando actualización desde BCV...');
     const nuevaTasa = await loadTasaCambio();
     if (nuevaTasa && nuevaTasa > 0) {
       updateTasaCambio(nuevaTasa);
       setTasaMode('AUTO');
       setLastUpdate(new Date());

       emitirEvento('tasa_auto_updated', {
         tasa: nuevaTasa,
         admin: usuario?.nombre,
         timestamp: new Date().toISOString()
       });

       toast.success('Tasa BCV actualizada desde API');
     }
   } catch (error) {
     console.error('Error al forzar actualización:', error);
     toast.error('Error al actualizar tasa BCV');
   }
 };

 const handleManualEdit = () => {
   if (!usuario || usuario.rol !== 'admin') {
     toast.error('Solo administradores pueden editar la tasa');
     return;
   }
   setTempTasa(tasaCambio.toFixed(2));
   setIsEditingTasa(true);
 };

 const handleSaveManualTasa = () => {
   const nuevaTasa = parseFloat(tempTasa);
   if (isNaN(nuevaTasa) || nuevaTasa <= 0) {
     toast.error('Ingresa una tasa válida');
     return;
   }

   updateTasaCambio(nuevaTasa);
   setTasaMode('MANUAL');
   setIsEditingTasa(false);
   setLastUpdate(new Date());

   emitirEvento('tasa_manual_updated', {
     tasa: nuevaTasa,
     admin: usuario.nombre,
     timestamp: new Date().toISOString()
   });

   toast.success(`Tasa actualizada manualmente: $${nuevaTasa.toFixed(2)}`);
 };

 const handleCancelEdit = () => {
   setIsEditingTasa(false);
   setTempTasa('');
 };

 const handleLogoutClick = () => {
   setShowLogoutModal(true);
 };

 const handleLogoutConfirm = async () => {
   setIsLoggingOut(true);
   setShowLogoutModal(false);

   try {
     await logout();
   } catch (error) {
     toast.error('Error al cerrar sesión');
     console.error('Error logout:', error);
   } finally {
     setIsLoggingOut(false);
   }
 };

 const handleLogoutCancel = () => {
   setShowLogoutModal(false);
 };

 const handleCloseNotificaciones = () => {
   setShowNotificaciones(false);
 };

 const handleToggleNotificaciones = () => {
  setShowNotificaciones(!showNotificaciones);
};

const handleRetryNotificacion = async (id) => {
  await retryNotificacion(id);
};

const handleRetryAll = async () => {
  await retryAll();
  setShowNotificaciones(false);
};

const handleMarkAllRead = () => {
  const notificationElements = document.querySelectorAll('.notification-item');
  notificationElements.forEach((el, index) => {
    setTimeout(() => {
      el.style.opacity = '0.5';
      el.style.transform = 'scale(0.98)';
    }, index * 50);
  });

  setTimeout(() => {
    markAllAsRead();
    setShowNotificaciones(false);
    toast.success('Todas las notificaciones marcadas como leídas', {
      duration: 2000,
      style: {
        background: '#10B981',
        color: 'white',
      },
    });
  }, 300);
};

 return (
   <>
     {/*  HEADER STICKY CON TEMAS DINÁMICOS - FULL RESPONSIVE */}
     <header className={`sticky top-0 z-40 ${currentTheme.gradient} shadow-lg transition-all duration-300`}>
       <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
         <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">

           {/* LOGO + TÍTULO - RESPONSIVE */}
           <div className={`flex items-center space-x-2 sm:space-x-3 ${currentTheme.logoText} flex-shrink-0`}>
             <img
               src="/android-chrome-512x512.png"
               alt="Logo Electro Caja"
               className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-full object-cover"
             />
             <div className="hidden sm:block">
               <h1 className="text-sm sm:text-base lg:text-lg font-bold">Electro Shop</h1>
               <p className={`text-xs italic ${currentTheme.subtitle}`}>SADES V1.0</p>
             </div>
           </div>

           {/* CENTRO - TASA BCV - RESPONSIVE */}
           <div className="flex-1 flex justify-center min-w-0">
             <div className={`text-center ${currentTheme.tasaSection}`}>
               <div className={`text-[10px] sm:text-xs ${currentTheme.tasaLabel} font-medium uppercase tracking-wide mb-0.5 sm:mb-1 hidden sm:block`}>
                 Tasa BCV Oficial
               </div>

               {isEditingTasa ? (
                 // Modo edición (solo admin) - RESPONSIVE
                 <div className="flex items-center justify-center space-x-1 sm:space-x-3">
                   <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-300" />
                   <input
                     id="tasa-cambio-input"
                     name="tasaCambio"
                     type="number"
                     value={tempTasa}
                     onChange={(e) => setTempTasa(e.target.value)}
                     className={`w-16 sm:w-20 lg:w-24 px-2 sm:px-3 py-0.5 sm:py-1 text-base sm:text-lg font-bold ${
                       isDarkTheme()
                         ? 'bg-gray-700/50 border-gray-600 text-gray-100 placeholder-gray-400'
                         : 'bg-white/20 border-white/30 text-white placeholder-white/50'
                     } border rounded focus:outline-none focus:ring-2 ${
                       isDarkTheme() ? 'focus:ring-gray-500' : 'focus:ring-white/50'
                     } text-center`}
                     placeholder="0.00"
                     step="0.01"
                     onKeyPress={(e) => e.key === 'Enter' && handleSaveManualTasa()}
                   />
                   <span className={`text-xs sm:text-sm ${currentTheme.tasaLabel}`}>Bs</span>
                   <button
                     onClick={handleSaveManualTasa}
                     className={`text-green-300 hover:text-green-100 p-1 sm:p-1.5 ${
                       isDarkTheme() ? 'bg-gray-700/50' : 'bg-white/10'
                     } rounded transition-colors text-xs sm:text-base`}
                     title="Guardar"
                   >
                     
                   </button>
                   <button
                     onClick={handleCancelEdit}
                     className={`text-red-300 hover:text-red-100 p-1 sm:p-1.5 ${
                       isDarkTheme() ? 'bg-gray-700/50' : 'bg-white/10'
                     } rounded transition-colors text-xs sm:text-base`}
                     title="Cancelar"
                   >
                     
                   </button>
                 </div>
               ) : (
                 // Modo visualización - RESPONSIVE
                 <div className="flex items-center justify-center space-x-1 sm:space-x-2 lg:space-x-3">
                   <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-green-300" />
                   <span className={`font-bold text-base sm:text-xl lg:text-2xl ${currentTheme.tasaValue}`}>
                     {tasaCambio.toFixed(2)}
                   </span>
                   <span className={`text-xs sm:text-sm ${currentTheme.tasaLabel}`}>Bs</span>

                   {/* Badge AUTO/MANUAL - RESPONSIVE */}
                   <span className={`hidden sm:inline px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${currentTheme.tasaBadge[tasaMode] || currentTheme.tasaBadge.ERROR}`}>
                     {tasaMode}
                   </span>

                   {/* Botones admin - RESPONSIVE */}
                   {usuario?.rol === 'admin' && (
                     <>
                       <button
                         onClick={handleManualEdit}
                         className={`${currentTheme.buttons} p-1 sm:p-2 rounded-lg transition-colors`}
                         title="Editar tasa manualmente"
                       >
                         <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                       </button>
                       <button
                         onClick={handleRefresh}
                         className={`${currentTheme.buttons} p-1 sm:p-2 rounded-lg transition-colors`}
                         title={`Última actualización: ${lastUpdate.toLocaleTimeString()}`}
                       >
                         <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                       </button>
                     </>
                   )}
                 </div>
               )}
             </div>
           </div>

           {/* LADO DERECHO - RESPONSIVE */}
           <div className={`flex items-center space-x-2 sm:space-x-3 lg:space-x-4 ${currentTheme.userSection} text-sm flex-shrink-0`}>

             {/*  NOTIFICACIONES - RESPONSIVE */}
             <div className="relative">
               <button
                 onClick={handleToggleNotificaciones}
                 className={`relative ${currentTheme.buttons} p-1.5 sm:p-2 rounded-lg transition-colors`}
                 title={notificacionesCount > 0 ? `${notificacionesCount} notificaciones` : 'Sin notificaciones'}
               >
                 {notificacionesCount > 0 ? (
                   <BellRing className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                 ) : (
                   <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                 )}

                 {/* Badge - RESPONSIVE */}
                 {notificacionesCount > 0 && (
                   <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white text-[9px] sm:text-xs font-bold rounded-full min-w-[14px] sm:min-w-[18px] h-[14px] sm:h-[18px] flex items-center justify-center px-0.5 sm:px-1 shadow-lg notification-badge">
                     {notificacionesCount > 99 ? '99+' : notificacionesCount}
                   </span>
                 )}
               </button>

               {/* DROPDOWN DE NOTIFICACIONES - RESPONSIVE */}
               {showNotificaciones && (
                 <>
                   <div
                     className="fixed inset-0 z-40"
                     onClick={handleCloseNotificaciones}
                   />

                   <div className="absolute top-full right-0 mt-2 w-[calc(100vw-1rem)] sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden notification-dropdown flex flex-col">
                     <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0">
                       <div className="flex items-center space-x-2 text-white">
                         <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                         <span className="font-semibold text-xs sm:text-sm">Notificaciones</span>
                         {notificacionesCount > 0 && (
                           <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold">
                             {notificacionesCount}
                           </span>
                         )}
                       </div>
                       <button
                         onClick={handleCloseNotificaciones}
                         className="text-white/70 hover:text-white p-1 rounded transition-colors"
                       >
                         <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                       </button>
                     </div>

                     <div className="flex-1 overflow-y-auto notification-list">
                       {notificacionesCount === 0 ? (
                         <div className="p-4 sm:p-6 text-center text-gray-500">
                           <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                           <p className="font-medium text-gray-700 text-sm sm:text-base">No hay notificaciones</p>
                           <p className="text-xs sm:text-sm text-gray-500">Todas las operaciones están al día</p>
                         </div>
                       ) : (
                         <div className="divide-y divide-gray-100">
                           {notificaciones
                             .filter(n => !n.leida)
                             .slice(0, 10)
                             .map((notif) => {
                               const config = NOTIFICACION_CONFIG[notif.tipo] || {};
                               return (
                                 <div
                                   key={notif.id}
                                   className={`p-2 sm:p-3 hover:bg-gray-50 transition-colors relative group ${
                                     notif.prioridad >= 3 ? 'border-l-4 border-red-400 bg-red-50/30' : ''
                                   }`}
                                 >
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       removeNotificacion(notif.id);
                                     }}
                                     className="absolute top-1 right-1 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-gray-200 hover:bg-red-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600"
                                     title="Eliminar"
                                   >
                                     <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                   </button>

                                   <div className="flex items-start space-x-2 sm:space-x-3">
                                     <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${
                                       config.color === 'red' ? 'bg-red-100 text-red-600' :
                                       config.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                       config.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                       config.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                       'bg-gray-100 text-gray-600'
                                     }`}>
                                       {config.icono || ''}
                                     </div>

                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-start justify-between">
                                         <div className="flex-1 min-w-0">
                                           <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                             {notif.titulo}
                                           </p>
                                           <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 line-clamp-2">
                                             {notif.descripcion}
                                           </p>
                                           <div className="flex items-center space-x-1.5 sm:space-x-2 mt-1 sm:mt-2">
                                             <div className="flex items-center space-x-0.5 sm:space-x-1 text-[10px] sm:text-xs text-gray-500">
                                               <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                               <span>{new Date(notif.timestamp).toLocaleTimeString('es-VE', {
                                                 hour: '2-digit', minute: '2-digit'
                                               })}</span>
                                             </div>
                                             {notif.intentos > 0 && (
                                               <span className="text-[9px] sm:text-xs bg-yellow-100 text-yellow-700 px-1 sm:px-2 py-0.5 rounded-full">
                                                 {notif.intentos}/{notif.maxIntentos}
                                               </span>
                                             )}
                                             {notif.prioridad >= 3 && (
                                               <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />
                                             )}
                                           </div>
                                         </div>

                                         {config.autoRetry && notif.intentos < notif.maxIntentos && (
                                           <button
                                             onClick={() => handleRetryNotificacion(notif.id)}
                                             className="flex-shrink-0 p-1 sm:p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                             title="Reintentar"
                                           >
                                             <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                           </button>
                                         )}
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               );
                             })
                           }
                         </div>
                       )}
                     </div>

                     {notificacionesCount > 0 && (
                       <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 flex-shrink-0">
                         <div className="flex items-center justify-between gap-2 sm:gap-3">
                           <button
                             onClick={handleMarkAllRead}
                             className="group flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-600 hover:text-gray-800 hover:bg-white/80 rounded-lg transition-all duration-200 hover:shadow-sm"
                           >
                             <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-400 group-hover:border-green-500 flex items-center justify-center transition-colors">
                               <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-transparent group-hover:bg-green-500 transition-all duration-200"></div>
                             </div>
                             <span className="font-medium hidden sm:inline">Marcar leídas</span>
                             <span className="font-medium sm:hidden">Leídas</span>
                           </button>

                           <button
                             onClick={handleRetryAll}
                             className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-2 hover:shadow-md transform hover:scale-105"
                           >
                             <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                             <span className="font-medium">Reintentar</span>
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                 </>
               )}
             </div>

             {/* SEPARADOR - RESPONSIVE */}
             <div className={`hidden sm:block h-6 sm:h-8 w-px ${isDarkTheme() ? 'bg-gray-600' : 'bg-white/30'}`}></div>

             {/* USUARIO - RESPONSIVE */}
             <div className="hidden sm:flex items-center space-x-2 sm:space-x-3">
               <div className={`w-7 h-7 sm:w-8 sm:h-8 ${
                 isDarkTheme() ? 'bg-gray-700' : 'bg-white/20'
               } rounded-full flex items-center justify-center backdrop-blur-sm`}>
                 <span className={`text-xs sm:text-sm font-bold ${currentTheme.userSection}`}>
                   {usuario?.nombre?.charAt(0)?.toUpperCase()}
                 </span>
               </div>
               <div className="hidden md:block">
                 <div className={`text-xs sm:text-sm font-medium ${currentTheme.userSection}`}>
                   {usuario?.nombre}
                 </div>
                 <div className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${currentTheme.roleBadge[usuario?.rol] || currentTheme.roleBadge.viewer}`}>
                   {usuario?.rol?.toUpperCase()}
                 </div>
               </div>
             </div>

             {/* SEPARADOR - RESPONSIVE */}
             <div className={`hidden sm:block h-6 sm:h-8 w-px ${isDarkTheme() ? 'bg-gray-600' : 'bg-white/30'}`}></div>

             {/* LOGOUT - RESPONSIVE */}
             <button
               onClick={handleLogoutClick}
               disabled={isLoggingOut}
               className={`${currentTheme.buttons} p-1.5 sm:p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
               title="Cerrar sesión"
             >
               {isLoggingOut ? (
                 <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
               ) : (
                 <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
               )}
             </button>
           </div>

         </div>
       </div>
     </header>

     {/* Modal de confirmación de logout */}
     <LogoutConfirmModal
       isOpen={showLogoutModal}
       onConfirm={handleLogoutConfirm}
       onCancel={handleLogoutCancel}
       hasCajaAbierta={!!cajaActual}
       userName={usuario?.nombre}
     />
   </>
 );
};

export default Header;
