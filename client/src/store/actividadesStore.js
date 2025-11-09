// store/actividadesStore.js - VERSIÓN CON API + SOCKET.IO
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { api } from '../config/api';
import { useAuthStore } from './authStore';
import { useSocketEvents } from '../hooks/useSocketEvents';
import toast from '../utils/toast.jsx';

//  TIPOS Y CONSTANTES (mismo que antes)
export const TIPOS_ACTIVIDAD = {
  RECORDATORIO: 'recordatorio',
  CRONOMETRO: 'cronometro', 
  RESERVACION: 'reservacion'
};

export const TIPOS_ALQUILER = {
  TIEMPO_FIJO: 'fijo',
  TIEMPO_ABIERTO: 'abierto'
};

export const PRIORIDADES = {
  ALTA: { valor: 'alta', color: 'red', emoji: '' },
  MEDIA: { valor: 'media', color: 'yellow', emoji: '' },
  BAJA: { valor: 'baja', color: 'green', emoji: '' }
};

export const ESTADOS = {
  PENDIENTE: 'pendiente',
  EN_PROGRESO: 'en_progreso',
  COMPLETADO: 'completado',
  PAUSADO: 'pausado',
  CANCELADO: 'cancelado'
};

export const TIPOS_RESERVACION = {
  CUMPLEANOS: { valor: 'cumpleanos', emoji: '', nombre: 'Cumpleaños' },
  EVENTO: { valor: 'evento', emoji: '', nombre: 'Evento Especial' }
};

//  CÁLCULO DE TIEMPO (mismo que antes)
const calcularCostoTiempo = (minutos, precioPorHora) => {
  if (minutos <= 0) return 0;
  
  const minutosReales = minutos;
  let minutosACobrar;
  
  const fracciones15 = Math.ceil(minutosReales / 15);
  const minutosRedondeados = fracciones15 * 15;
  
  const diferencia = minutosRedondeados - minutosReales;
  
  if (diferencia <= 5) {
    minutosACobrar = Math.floor(minutosReales / 15) * 15;
    if (minutosACobrar === 0) minutosACobrar = 15;
  } else {
    minutosACobrar = minutosRedondeados;
  }
  
  const horasACobrar = minutosACobrar / 60;
  return horasACobrar * precioPorHora;
};

//  STORE CON API + SOCKETS
export const useActividadesStore = create(
  subscribeWithSelector((set, get) => ({
    //  ESTADO
    actividades: [],
    cronometrosActivos: new Map(),
    loading: false,
    error: null,
    socketConnected: false,
    
    //  INICIALIZACIÓN CON SOCKETS
    inicializar: async () => {
      const { emitirEvento } = useSocketEvents();
      
      // Cargar actividades desde API
      await get().cargarActividades();
      
      // Configurar listeners de socket
      get().configurarSocketListeners();
      
      // Emitir evento de conexión a actividades
      emitirEvento('actividades_join', {
        usuario: useAuthStore.getState().usuario?.id
      });
      
      set({ socketConnected: true });
    },
    
    configurarSocketListeners: () => {
      const { socket } = useAuthStore.getState();
      if (!socket) return;
      
      //  EVENTOS DE SOCKET PARA ACTIVIDADES
      
      // Cronómetro iniciado por otro usuario
      socket.on('cronometro_iniciado', (data) => {
        set(state => ({
          actividades: [...state.actividades, data.cronometro],
          cronometrosActivos: new Map(state.cronometrosActivos.set(data.cronometro.equipoId, data.cronometro))
        }));
        
        toast.success(`${data.cronometro.equipoNombre} iniciado por ${data.nombre || data.usuario}`, {
          id: `cronometro-${data.cronometro.id}`
        });
      });
      
      // Cronómetro actualizado
      socket.on('cronometro_actualizado', (data) => {
        const { cronometrosActivos } = get();
        if (cronometrosActivos.has(data.equipoId)) {
          set(state => ({
            cronometrosActivos: new Map(state.cronometrosActivos.set(data.equipoId, data.cronometro))
          }));
        }
      });
      
      // Cronómetro finalizado
      socket.on('cronometro_finalizado', (data) => {
        set(state => {
          const nuevosActivos = new Map(state.cronometrosActivos);
          nuevosActivos.delete(data.equipoId);
          
          return {
            cronometrosActivos: nuevosActivos,
            actividades: state.actividades.map(act => 
              act.id === data.cronometro.id ? data.cronometro : act
            )
          };
        });
        
        toast.success(`Sesión finalizada: ${data.cronometro.equipoNombre} - $${data.costoTotal.toFixed(2)}`);
      });
      
      // Nueva actividad creada
      socket.on('actividad_creada', (data) => {
        set(state => ({
          actividades: [...state.actividades, data.actividad]
        }));
        
        if (data.actividad.tipo === TIPOS_ACTIVIDAD.RECORDATORIO) {
          toast.info(`Nuevo recordatorio de ${data.creadorNombre}: ${data.actividad.titulo}`);
        }
      });
      
      // Recordatorio vencido
      socket.on('recordatorio_vencido', (data) => {
        toast.warning(`Recordatorio vencido: ${data.recordatorio.titulo}`, {
          duration: 8000,
        });
      });
      
      // Reservación próxima
      socket.on('reservacion_proxima', (data) => {
        toast.info(`Reservación en 1 hora: ${data.reservacion.titulo}`, {
          duration: 6000
        });
      });
    },
    
    //  API CALLS
    cargarActividades: async () => {
      set({ loading: true, error: null });
      try {
        const response = await api.get('/actividades');
        const actividades = response.data.data || [];
        
        // Reconstruir cronómetros activos
        const cronometrosActivos = new Map();
        actividades
          .filter(act => act.tipo === TIPOS_ACTIVIDAD.CRONOMETRO && act.estado === ESTADOS.EN_PROGRESO)
          .forEach(cronometro => {
            cronometrosActivos.set(cronometro.equipoId, cronometro);
            // Reanudar cronómetro si estaba activo
            setTimeout(() => get().reanudarCronometro(cronometro.equipoId), 100);
          });
        
        set({ actividades, cronometrosActivos, loading: false });
      } catch (error) {
        console.error('Error cargando actividades:', error);
        set({ error: error.message, loading: false });
        toast.error('Error cargando actividades');
      }
    },
    
    //  RECORDATORIOS CON API
    crearRecordatorio: async (datos) => {
      const { emitirEvento } = useSocketEvents();
      
      try {
        const response = await api.post('/actividades/recordatorios', {
          titulo: datos.titulo,
          descripcion: datos.descripcion || '',
          prioridad: datos.prioridad || PRIORIDADES.MEDIA.valor,
          fechaVencimiento: datos.fechaVencimiento,
          asignadoA: datos.asignadoA || [],
          mencionarUsuarios: datos.mencionarUsuarios || []
        });
        
        const nuevoRecordatorio = response.data.data;
        
        set(state => ({
          actividades: [...state.actividades, nuevoRecordatorio]
        }));
        
        // Emitir evento de socket
        emitirEvento('recordatorio_creado', {
          recordatorio: nuevoRecordatorio,
          asignadoA: datos.asignadoA
        });
        
        toast.success(`Recordatorio creado: ${datos.titulo}`);
        return nuevoRecordatorio;
        
      } catch (error) {
        console.error('Error creando recordatorio:', error);
        toast.error('Error creando recordatorio');
        throw error;
      }
    },
    
    //  CRONÓMETROS CON API + REAL TIME
    iniciarCronometro: async (datos, inventario) => {
      const { equipoId, clienteNombre, tipoAlquiler, duracionMinutos } = datos;
      const { emitirEvento } = useSocketEvents();
      
      // Verificar equipo
      const equipo = inventario.find(item => 
        item.id === equipoId && 
        item.categoria === 'Gaming' && 
        item.tipo === 'servicio'
      );
      
      if (!equipo) {
        toast.error('Equipo no encontrado');
        return null;
      }
      
      // Verificar disponibilidad
      const { cronometrosActivos } = get();
      if (cronometrosActivos.has(equipoId)) {
        toast.error('El equipo ya está en uso');
        return null;
      }
      
      try {
        const response = await api.post('/actividades/cronometros', {
          equipoId,
          equipoNombre: equipo.descripcion,
          equipoPrecio: equipo.precio_venta,
          clienteNombre,
          tipoAlquiler,
          duracionMinutos: tipoAlquiler === TIPOS_ALQUILER.TIEMPO_FIJO ? duracionMinutos : null
        });
        
        const nuevoCronometro = response.data.data;
        
        // Agregar al estado local
        set(state => ({
          actividades: [...state.actividades, nuevoCronometro],
          cronometrosActivos: new Map(state.cronometrosActivos.set(equipoId, nuevoCronometro))
        }));
        
        // Iniciar actualización en tiempo real
        get().actualizarCronometroTiempoReal(equipoId);
        
        // Emitir evento de socket
        emitirEvento('cronometro_iniciado', {
          cronometro: nuevoCronometro,
          equipoId
        });
        
        toast.success(`${equipo.descripcion} iniciado para ${clienteNombre}`);
        return nuevoCronometro;
        
      } catch (error) {
        console.error('Error iniciando cronómetro:', error);
        toast.error('Error iniciando cronómetro');
        throw error;
      }
    },
    
    pausarCronometro: async (equipoId) => {
      const { cronometrosActivos } = get();
      const cronometro = cronometrosActivos.get(equipoId);
      const { emitirEvento } = useSocketEvents();
      
      if (!cronometro) return;
      
      try {
        const response = await api.patch(`/actividades/cronometros/${cronometro.id}/pausar`);
        const cronometroActualizado = response.data.data;
        
        // Actualizar estado local
        set(state => ({
          cronometrosActivos: new Map(state.cronometrosActivos.set(equipoId, cronometroActualizado)),
          actividades: state.actividades.map(act => 
            act.id === cronometro.id ? cronometroActualizado : act
          )
        }));
        
        // Manejar intervals
        if (cronometroActualizado.estado === ESTADOS.PAUSADO) {
          get().pararActualizacionTiempoReal(equipoId);
          toast.success(`${cronometro.equipoNombre} pausado`);
        } else {
          get().actualizarCronometroTiempoReal(equipoId);
          toast.success(`${cronometro.equipoNombre} reanudado`);
        }
        
        // Emitir evento
        emitirEvento('cronometro_pausado', {
          equipoId,
          cronometro: cronometroActualizado
        });
        
      } catch (error) {
        console.error('Error pausando cronómetro:', error);
        toast.error('Error pausando cronómetro');
      }
    },
    
    finalizarCronometro: async (equipoId) => {
      const { cronometrosActivos } = get();
      const cronometro = cronometrosActivos.get(equipoId);
      const { emitirEvento } = useSocketEvents();
      
      if (!cronometro) return null;
      
      try {
        const response = await api.patch(`/actividades/cronometros/${cronometro.id}/finalizar`);
        const resultado = response.data.data;
        
        // Limpiar estado local
        get().pararActualizacionTiempoReal(equipoId);
        
        set(state => {
          const nuevosActivos = new Map(state.cronometrosActivos);
          nuevosActivos.delete(equipoId);
          
          return {
            cronometrosActivos: nuevosActivos,
            actividades: state.actividades.map(act => 
              act.id === cronometro.id ? resultado.cronometro : act
            )
          };
        });
        
        // Emitir evento
        emitirEvento('cronometro_finalizado', {
          equipoId,
          cronometro: resultado.cronometro,
          costoTotal: resultado.costoTotal
        });
        
        toast.success(`Sesión finalizada: ${resultado.minutosTotal} min - $${resultado.costoTotal.toFixed(2)}`);
        return resultado;
        
      } catch (error) {
        console.error('Error finalizando cronómetro:', error);
        toast.error('Error finalizando cronómetro');
        throw error;
      }
    },
    
    //  TIEMPO REAL LOCAL (COMPLEMENTA API)
    actualizarCronometroTiempoReal: (equipoId) => {
      const { cronometrosActivos } = get();
      const cronometro = cronometrosActivos.get(equipoId);
      
      if (!cronometro || cronometro.estado !== ESTADOS.EN_PROGRESO) return;
      
      // Limpiar interval anterior
      if (cronometro.intervalId) {
        clearInterval(cronometro.intervalId);
      }
      
      const intervalId = setInterval(() => {
        const { cronometrosActivos: actuales } = get();
        const cronActual = actuales.get(equipoId);
        
        if (!cronActual || cronActual.estado !== ESTADOS.EN_PROGRESO) {
          clearInterval(intervalId);
          return;
        }
        
        const tiempoActual = Date.now();
        const tiempoTranscurrido = cronActual.tiempoTranscurrido + (tiempoActual - cronActual.tiempoInicio);
        const minutosTranscurridos = Math.ceil(tiempoTranscurrido / 60000);
        
        // Verificar límite de tiempo
        if (cronActual.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_FIJO && 
            cronActual.duracionMinutos && 
            minutosTranscurridos >= cronActual.duracionMinutos) {
          
          get().finalizarCronometro(equipoId);
          toast.warning(`Tiempo agotado: ${cronActual.equipoNombre}`);
          return;
        }
        
        // Actualizar tiempo local
        set(state => ({
          cronometrosActivos: new Map(state.cronometrosActivos.set(equipoId, {
            ...cronActual,
            tiempoInicio: tiempoActual,
            tiempoTranscurrido
          }))
        }));
        
        // Sincronizar con servidor cada 30 segundos
        if (minutosTranscurridos % 0.5 === 0) {
          get().sincronizarCronometro(equipoId, tiempoTranscurrido);
        }
        
      }, 1000);
      
      // Guardar intervalId
      set(state => ({
        cronometrosActivos: new Map(state.cronometrosActivos.set(equipoId, {
          ...cronometro,
          intervalId
        }))
      }));
    },
    
    pararActualizacionTiempoReal: (equipoId) => {
      const { cronometrosActivos } = get();
      const cronometro = cronometrosActivos.get(equipoId);
      
      if (cronometro?.intervalId) {
        clearInterval(cronometro.intervalId);
        
        set(state => ({
          cronometrosActivos: new Map(state.cronometrosActivos.set(equipoId, {
            ...cronometro,
            intervalId: null
          }))
        }));
      }
    },
    
    sincronizarCronometro: async (equipoId, tiempoTranscurrido) => {
      const { cronometrosActivos } = get();
      const cronometro = cronometrosActivos.get(equipoId);
      
      if (!cronometro) return;
      
      try {
        await api.patch(`/actividades/cronometros/${cronometro.id}/sincronizar`, {
          tiempoTranscurrido
        });
      } catch (error) {
        console.warn('Error sincronizando cronómetro:', error);
      }
    },
    
    reanudarCronometro: (equipoId) => {
      // Reanudar cronómetro después de recarga/reconexión
      const { cronometrosActivos } = get();
      const cronometro = cronometrosActivos.get(equipoId);
      
      if (cronometro && cronometro.estado === ESTADOS.EN_PROGRESO) {
        get().actualizarCronometroTiempoReal(equipoId);
      }
    },
    
    //  RESERVACIONES CON API
    crearReservacion: async (datos) => {
      const { emitirEvento } = useSocketEvents();
      
      try {
        const response = await api.post('/actividades/reservaciones', {
          tipoReservacion: datos.tipoReservacion,
          titulo: datos.titulo,
          clienteNombre: datos.clienteNombre,
          clienteTelefono: datos.clienteTelefono,
          fechaEvento: datos.fechaEvento,
          duracionHoras: datos.duracionHoras,
          precioTotal: datos.precioTotal,
          observaciones: datos.observaciones || ''
        });
        
        const nuevaReservacion = response.data.data;
        
        set(state => ({
          actividades: [...state.actividades, nuevaReservacion]
        }));
        
        // Emitir evento
        emitirEvento('reservacion_creada', {
          reservacion: nuevaReservacion
        });
        
        toast.success(`Reservación creada: ${datos.titulo}`);
        return nuevaReservacion;
        
      } catch (error) {
        console.error('Error creando reservación:', error);
        toast.error('Error creando reservación');
        throw error;
      }
    },
    
    //  ELIMINAR CON API
    eliminarActividad: async (id) => {
      try {
        await api.delete(`/actividades/${id}`);
        
        set(state => ({
          actividades: state.actividades.filter(act => act.id !== id)
        }));
        
        toast.success('Actividad eliminada');
      } catch (error) {
        console.error('Error eliminando actividad:', error);
        toast.error('Error eliminando actividad');
      }
    },
    
    //  GETTERS (mismo que antes)
    obtenerRecordatorios: () => {
      return get().actividades.filter(act => act.tipo === TIPOS_ACTIVIDAD.RECORDATORIO);
    },
    
    obtenerCronometros: () => {
     return get().actividades.filter(act => act.tipo === TIPOS_ACTIVIDAD.CRONOMETRO);
   },
   
   obtenerReservaciones: () => {
     return get().actividades.filter(act => act.tipo === TIPOS_ACTIVIDAD.RESERVACION);
   },
   
   obtenerActividadesVencidas: () => {
     const ahora = new Date();
     return get().actividades.filter(act => {
       if (act.tipo === TIPOS_ACTIVIDAD.RECORDATORIO) {
         return new Date(act.fechaVencimiento) <= ahora && act.estado === ESTADOS.PENDIENTE;
       }
       if (act.tipo === TIPOS_ACTIVIDAD.RESERVACION) {
         const fechaEvento = new Date(act.fechaEvento);
         const unaHoraAntes = new Date(fechaEvento.getTime() - 60 * 60 * 1000);
         return ahora >= unaHoraAntes && ahora < fechaEvento && act.estado === ESTADOS.PENDIENTE;
       }
       return false;
     });
   },
   
   obtenerEquiposDisponibles: (inventario) => {
     const { cronometrosActivos } = get();
     return inventario.filter(item => 
       item.categoria === 'Gaming' && 
       item.tipo === 'servicio' && 
       item.activo && 
       !cronometrosActivos.has(item.id)
     );
   },
   
   obtenerEstadisticasGaming: () => {
     const cronometros = get().obtenerCronometros();
     const completados = cronometros.filter(c => c.estado === ESTADOS.COMPLETADO);
     
     const totalSesiones = completados.length;
     const tiempoTotal = completados.reduce((total, c) => total + (c.resumenSesion?.minutosJugados || 0), 0);
     const ingresoTotal = completados.reduce((total, c) => total + (c.resumenSesion?.costoTotal || 0), 0);
     
     return {
       totalSesiones,
       tiempoTotalMinutos: tiempoTotal,
       tiempoTotalHoras: Math.round(tiempoTotal / 60 * 100) / 100,
       ingresoTotal,
       promedioSesion: totalSesiones > 0 ? Math.round(tiempoTotal / totalSesiones) : 0,
       ingresoPromedio: totalSesiones > 0 ? Math.round(ingresoTotal / totalSesiones * 100) / 100 : 0
     };
   },
   
   //  LIMPIAR COMPLETADOS
   limpiarCompletados: async () => {
     try {
       await api.delete('/actividades/completados');
       
       set(state => ({
         actividades: state.actividades.filter(act => act.estado !== ESTADOS.COMPLETADO)
       }));
       
       toast.success('Actividades completadas eliminadas');
     } catch (error) {
       console.error('Error limpiando completados:', error);
       toast.error('Error limpiando actividades');
     }
   },
   
   //  SINCRONIZACIÓN MANUAL
   sincronizar: async () => {
     await get().cargarActividades();
     toast.success('Actividades sincronizadas');
   },
   
   //  CLEANUP AL CERRAR
   limpiarRecursos: () => {
     const { cronometrosActivos } = get();
     
     // Limpiar todos los intervals
     cronometrosActivos.forEach((cronometro, equipoId) => {
       if (cronometro.intervalId) {
         clearInterval(cronometro.intervalId);
       }
     });
     
     // Limpiar listeners de socket
     const { socket } = useAuthStore.getState();
     if (socket) {
       socket.off('cronometro_iniciado');
       socket.off('cronometro_actualizado');
       socket.off('cronometro_finalizado');
       socket.off('actividad_creada');
       socket.off('recordatorio_vencido');
       socket.off('reservacion_proxima');
     }
     
     set({
       cronometrosActivos: new Map(),
       socketConnected: false
     });
   }
 }))
);

//  HOOK PERSONALIZADO PARA FÁCIL USO
export const useActividades = () => {
 const store = useActividadesStore();
 
 React.useEffect(() => {
   // Inicializar cuando se monta el componente
   store.inicializar();
   
   // Cleanup cuando se desmonta
   return () => {
     store.limpiarRecursos();
   };
 }, []);
 
 return store;
};

//  SELECTORES OPTIMIZADOS (para evitar re-renders innecesarios)
export const selectRecordatorios = (state) => state.obtenerRecordatorios();
export const selectCronometros = (state) => state.obtenerCronometros();
export const selectReservaciones = (state) => state.obtenerReservaciones();
export const selectCronometrosActivos = (state) => Array.from(state.cronometrosActivos.values());
export const selectActividadesVencidas = (state) => state.obtenerActividadesVencidas();
export const selectEstadisticasGaming = (state) => state.obtenerEstadisticasGaming();

//  HOOK PARA NOTIFICACIONES AUTOMÁTICAS
export const useNotificacionesActividades = () => {
 const obtenerActividadesVencidas = useActividadesStore(selectActividadesVencidas);
 
 React.useEffect(() => {
   const interval = setInterval(() => {
     const vencidas = obtenerActividadesVencidas();
     
     vencidas.forEach(actividad => {
       if (actividad.tipo === TIPOS_ACTIVIDAD.RECORDATORIO) {
         toast.warning(`Recordatorio vencido: ${actividad.titulo}`, {
           id: `recordatorio-${actividad.id}`, // Evitar duplicados
           duration: 8000,
         });
       }
     });
   }, 60000); // Verificar cada minuto
   
   return () => clearInterval(interval);
 }, [obtenerActividadesVencidas]);
};