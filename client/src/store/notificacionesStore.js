// store/notificacionesStore.js (SISTEMA COMPLETO DE NOTIFICACIONES)
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { api } from '../config/api';
import { useAuthStore } from './authStore';
import toast from '../utils/toast.jsx';

//  TIPOS DE NOTIFICACIONES
export const TIPOS_NOTIFICACION = {
 WHATSAPP_PENDIENTE: 'whatsapp_pendiente',
 WHATSAPP_FALLIDO: 'whatsapp_fallido',
 STOCK_BAJO: 'stock_bajo',
 DIFERENCIA_CAJA: 'diferencia_caja',
 ARQUEO_PENDIENTE: 'arqueo_pendiente',
 CAJA_ABIERTA_LARGO: 'caja_abierta_largo',
 ACCESO_SOSPECHOSO: 'acceso_sospechoso',
 SINCRONIZACION_FALLIDA: 'sincronizacion_fallida',
 RECORDATORIO: 'recordatorio',
 SISTEMA: 'sistema'
};

//  CONFIGURACIÓN VISUAL POR TIPO
export const NOTIFICACION_CONFIG = {
 [TIPOS_NOTIFICACION.WHATSAPP_PENDIENTE]: {
   icono: '',
   color: 'blue',
   prioridad: 2,
   autoRetry: true,
   maxIntentos: 3
 },
 [TIPOS_NOTIFICACION.WHATSAPP_FALLIDO]: {
   icono: '',
   color: 'red',
   prioridad: 3,
   autoRetry: true,
   maxIntentos: 3
 },
 [TIPOS_NOTIFICACION.STOCK_BAJO]: {
   icono: '',
   color: 'orange',
   prioridad: 2,
   autoRetry: false,
   maxIntentos: 1
 },
 [TIPOS_NOTIFICACION.DIFERENCIA_CAJA]: {
   icono: '',
   color: 'red',
   prioridad: 4,
   autoRetry: false,
   maxIntentos: 1
 },
 [TIPOS_NOTIFICACION.ARQUEO_PENDIENTE]: {
   icono: '',
   color: 'purple',
   prioridad: 3,
   autoRetry: false,
   maxIntentos: 1
 },
 [TIPOS_NOTIFICACION.SISTEMA]: {
   icono: '',
   color: 'gray',
   prioridad: 1,
   autoRetry: false,
   maxIntentos: 1
 }
};

//  STORE PRINCIPAL
export const useNotificacionesStore = create(
 subscribeWithSelector(
   persist(
     (set, get) => ({
       //  ESTADO
       notificaciones: [],
       loading: false,
       error: null,
       lastUpdate: null,
       socketConnected: false,

       //  CONFIGURACIÓN
       maxNotificaciones: 100,
       autoCleanupHours: 24,

       //  AGREGAR NOTIFICACIÓN
       addNotificacion: (notifData) => {
         const { notificaciones, maxNotificaciones } = get();
         
         const nuevaNotificacion = {
           id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
           timestamp: new Date().toISOString(),
           leida: false,
           intentos: 0,
           maxIntentos: NOTIFICACION_CONFIG[notifData.tipo]?.maxIntentos || 1,
           prioridad: NOTIFICACION_CONFIG[notifData.tipo]?.prioridad || 1,
           usuario: useAuthStore.getState().usuario?.nombre || 'Sistema',
           ...notifData
         };

         // Evitar duplicados (mismo tipo + contenido similar)
         const duplicada = notificaciones.find(n => 
           n.tipo === nuevaNotificacion.tipo && 
           n.titulo === nuevaNotificacion.titulo &&
           (Date.now() - new Date(n.timestamp).getTime()) < 5000 // 5 segundos
         );

         if (duplicada) {
           console.log(' Notificación duplicada ignorada:', nuevaNotificacion.titulo);
           return duplicada.id;
         }

         // Limitar cantidad máxima
         let notificacionesActualizadas = [nuevaNotificacion, ...notificaciones];
         if (notificacionesActualizadas.length > maxNotificaciones) {
           notificacionesActualizadas = notificacionesActualizadas.slice(0, maxNotificaciones);
         }

         set({
           notificaciones: notificacionesActualizadas,
           lastUpdate: new Date().toISOString()
         });

         console.log(' Nueva notificación agregada:', nuevaNotificacion);
         
         // Emitir via Socket.IO si está conectado
         get().emitirNotificacion(nuevaNotificacion);
         
         return nuevaNotificacion.id;
       },

       //  ELIMINAR NOTIFICACIÓN
       removeNotificacion: (id) => {
         set(state => ({
           notificaciones: state.notificaciones.filter(n => n.id !== id),
           lastUpdate: new Date().toISOString()
         }));
       },

       //  MARCAR COMO LEÍDA
       markAsRead: (id) => {
         set(state => ({
           notificaciones: state.notificaciones.map(n => 
             n.id === id ? { ...n, leida: true } : n
           ),
           lastUpdate: new Date().toISOString()
         }));
       },

       //  MARCAR TODAS COMO LEÍDAS
       markAllAsRead: () => {
         set(state => ({
           notificaciones: state.notificaciones.map(n => ({ ...n, leida: true })),
           lastUpdate: new Date().toISOString()
         }));
       },

       //  REINTENTAR NOTIFICACIÓN ESPECÍFICA
       retryNotificacion: async (id) => {
         const { notificaciones } = get();
         const notificacion = notificaciones.find(n => n.id === id);
         
         if (!notificacion) return false;

         if (notificacion.intentos >= notificacion.maxIntentos) {
           toast.error('Máximo de intentos alcanzado');
           return false;
         }

         set({ loading: true });

         try {
           let exito = false;

           // Diferentes tipos de retry
           switch (notificacion.tipo) {
             case TIPOS_NOTIFICACION.WHATSAPP_PENDIENTE:
             case TIPOS_NOTIFICACION.WHATSAPP_FALLIDO:
               exito = await get().retryWhatsApp(notificacion);
               break;
             
             case TIPOS_NOTIFICACION.SINCRONIZACION_FALLIDA:
               exito = await get().retrySincronizacion(notificacion);
               break;
             
             default:
               console.warn('Tipo de retry no implementado:', notificacion.tipo);
               exito = false;
           }

           if (exito) {
             get().removeNotificacion(id);
             toast.success('Reintento exitoso');
             return true;
           } else {
             // Incrementar contador de intentos
             set(state => ({
               notificaciones: state.notificaciones.map(n => 
                 n.id === id ? { ...n, intentos: n.intentos + 1 } : n
               )
             }));
             toast.error('Reintento fallido');
             return false;
           }

         } catch (error) {
           console.error('Error en retry:', error);
           toast.error('Error en reintento: ' + error.message);
           return false;
         } finally {
           set({ loading: false });
         }
       },

       //  REINTENTAR TODAS LAS NOTIFICACIONES
       retryAll: async () => {
         const { notificaciones } = get();
         const pendientes = notificaciones.filter(n => 
           !n.leida && 
           NOTIFICACION_CONFIG[n.tipo]?.autoRetry &&
           n.intentos < n.maxIntentos
         );

         if (pendientes.length === 0) {
           toast.info('No hay notificaciones pendientes para reintentar');
           return;
         }

         set({ loading: true });
         let exitosos = 0;

         for (const notif of pendientes) {
           const exito = await get().retryNotificacion(notif.id);
           if (exito) exitosos++;
           
           // Pausa entre reintentos para no saturar
           await new Promise(resolve => setTimeout(resolve, 500));
         }

         set({ loading: false });
         toast.success(`${exitosos}/${pendientes.length} notificaciones reenviadas`);
       },

       //  LIMPIAR TODAS LAS NOTIFICACIONES
       clearAll: () => {
         set({
           notificaciones: [],
           lastUpdate: new Date().toISOString()
         });
         toast.success('Todas las notificaciones eliminadas');
       },

       //  LIMPIAR NOTIFICACIONES ANTIGUAS
       cleanupOldNotifications: () => {
         const { notificaciones, autoCleanupHours } = get();
         const cutoffTime = Date.now() - (autoCleanupHours * 60 * 60 * 1000);
         
         const notificacionesActuales = notificaciones.filter(n => 
           new Date(n.timestamp).getTime() > cutoffTime
         );

         if (notificacionesActuales.length !== notificaciones.length) {
           set({
             notificaciones: notificacionesActuales,
             lastUpdate: new Date().toISOString()
           });
           console.log(` ${notificaciones.length - notificacionesActuales.length} notificaciones antiguas eliminadas`);
         }
       },

       //  EMITIR NOTIFICACIÓN VIA SOCKET.IO
       emitirNotificacion: (notificacion) => {
         const { socket } = useAuthStore.getState();
         if (socket && socket.connected) {
           socket.emit('nueva_notificacion', {
             notificacion,
             emisor: useAuthStore.getState().usuario?.nombre,
             timestamp: new Date().toISOString()
           });
         }
       },

       //  CONFIGURAR LISTENERS DE SOCKET.IO
       setupSocketListeners: () => {
         const { socket } = useAuthStore.getState();
         if (!socket) return;

         // Recibir notificaciones de otros usuarios
         socket.on('nueva_notificacion', (data) => {
           const { notificacion, emisor } = data;
           
           // No agregamos notificaciones que nosotros mismos emitimos
           if (emisor !== useAuthStore.getState().usuario?.nombre) {
             get().addNotificacion({
               ...notificacion,
               fromOtherUser: true,
               emisor
             });
           }
         });

         set({ socketConnected: true });
       },

       //  RETRY ESPECÍFICOS POR TIPO
       retryWhatsApp: async (notificacion) => {
         try {
           const response = await api.post('/whatsapp/enviar', {
             numero: notificacion.datos?.numero || '+584120552931',
             mensaje: notificacion.datos?.mensaje || notificacion.descripcion
           });

           return response.data.success;
         } catch (error) {
           console.error('Error retry WhatsApp:', error);
           return false;
         }
       },

       retrySincronizacion: async (notificacion) => {
         try {
           // Implementar según el tipo de sincronización
           console.log('Reintentando sincronización:', notificacion);
           return true; // Placeholder
         } catch (error) {
           console.error('Error retry sincronización:', error);
           return false;
         }
       },

       //  GETTERS Y SELECTORES
       getNotificaciones: () => get().notificaciones,
       
       getPendientes: () => get().notificaciones.filter(n => !n.leida),
       
       getByTipo: (tipo) => get().notificaciones.filter(n => n.tipo === tipo),
       
       getCount: () => get().notificaciones.filter(n => !n.leida).length,
       
       getCountByTipo: (tipo) => get().notificaciones.filter(n => 
         n.tipo === tipo && !n.leida
       ).length,

       getPorPrioridad: () => {
         return get().notificaciones
           .filter(n => !n.leida)
           .sort((a, b) => b.prioridad - a.prioridad);
       },

       getEstadisticas: () => {
         const notificaciones = get().notificaciones;
         const pendientes = notificaciones.filter(n => !n.leida);
         
         return {
           total: notificaciones.length,
           pendientes: pendientes.length,
           leidas: notificaciones.length - pendientes.length,
           conErrores: notificaciones.filter(n => n.intentos >= n.maxIntentos).length,
           porTipo: Object.keys(TIPOS_NOTIFICACION).reduce((acc, tipo) => {
             acc[tipo] = notificaciones.filter(n => n.tipo === tipo).length;
             return acc;
           }, {})
         };
       },

       //  UTILIDADES
       debug: () => {
         console.log(' Estado Notificaciones:', {
           total: get().notificaciones.length,
           pendientes: get().getCount(),
           ultimaActualizacion: get().lastUpdate,
           socketConectado: get().socketConnected
         });
       },

       reset: () => {
         set({
           notificaciones: [],
           loading: false,
           error: null,
           lastUpdate: null,
           socketConnected: false
         });
       }
     }),
     {
       name: 'notificaciones-storage',
       partialize: (state) => ({
         notificaciones: state.notificaciones,
         lastUpdate: state.lastUpdate
       })
     }
   )
 )
);

//  AUTO-LIMPIEZA CADA HORA
//if (typeof window !== 'undefined') {
 //setInterval(() => {
  // useNotificacionesStore.getState().cleanupOldNotifications();
 //}, 60 * 60 * 1000); // 1 hora
//}

//  HOOKS PERSONALIZADOS
export const useNotificacionesPendientes = () => {
 return useNotificacionesStore(state => state.getPendientes());
};

export const useNotificacionesCount = () => {
 return useNotificacionesStore(state => state.getCount());
};

export const useNotificacionesPorTipo = (tipo) => {
 return useNotificacionesStore(state => state.getByTipo(tipo));
};

//  FUNCIONES HELPER PARA USO FÁCIL
export const agregarNotificacionWhatsApp = (datos) => {
 return useNotificacionesStore.getState().addNotificacion({
   tipo: TIPOS_NOTIFICACION.WHATSAPP_FALLIDO,
   titulo: 'WhatsApp no enviado',
   descripcion: `Mensaje pendiente: ${datos.tipo || 'Notificación'}`,
   datos: datos,
   accionable: true
 });
};

export const agregarNotificacionSistema = (titulo, descripcion) => {
 return useNotificacionesStore.getState().addNotificacion({
   tipo: TIPOS_NOTIFICACION.SISTEMA,
   titulo,
   descripcion,
   accionable: false
 });
};

export default useNotificacionesStore;