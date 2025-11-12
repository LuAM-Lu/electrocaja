// store/serviciosStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api, apiWithRetry, testConnection } from '../config/api.js';
import toast from '../utils/toast.jsx';
import { imprimirTicketServicio } from '../utils/printUtils.js';

// ===================================
//  SERVICIOS TÉCNICOS STORE
// ===================================
const useServiciosStore = create()(
  devtools(
    (set, get) => ({
      // Estado inicial
      servicios: [],
      servicioActual: null,
      tecnicos: [],
      loading: false,
      error: null,
      conectado: false,
      
      // 🆕 Sistema de caché
      cacheServicios: {
        data: [],
        timestamp: null,
        filtros: null
      },
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutos en milisegundos

      // ===================================
      //  VERIFICAR CONEXIÓN
      // ===================================
      verificarConexion: async () => {
        try {
          const result = await testConnection();
          set({ conectado: result.success });

          if (!result.success) {
            toast.error('Sin conexión al servidor', {
              duration: 4000,
              position: 'top-right'
            });
          }

          return result.success;
        } catch (error) {
          set({ conectado: false });
          toast.error('Error de conexión al servidor', {
            duration: 4000,
            position: 'top-right'
          });
          return false;
        }
      },

      // ===================================
      //  CARGAR SERVICIOS (CON CACHÉ)
      // ===================================
      cargarServicios: async (filtros = {}, forzarRecarga = false) => {
        const conectado = await get().verificarConexion();
        if (!conectado) return;

        const state = get();
        const { cacheServicios, CACHE_DURATION } = state;
        
        // Normalizar filtros para comparación (sin incluirRelaciones que es solo frontend)
        const filtrosNormalizados = {
          estado: filtros.estado || null,
          tecnicoId: filtros.tecnicoId || null,
          clienteId: filtros.clienteId || null,
          fechaDesde: filtros.fechaDesde || null,
          fechaHasta: filtros.fechaHasta || null
        };
        
        // Verificar si hay caché válido y los filtros coinciden
        const ahora = Date.now();
        const cacheValido = cacheServicios.timestamp && 
                           (ahora - cacheServicios.timestamp) < CACHE_DURATION &&
                           JSON.stringify(cacheServicios.filtros) === JSON.stringify(filtrosNormalizados);
        
        if (cacheValido && !forzarRecarga) {
          // Usar datos del caché
          console.log('📦 Usando caché de servicios (válido por', Math.round((CACHE_DURATION - (ahora - cacheServicios.timestamp)) / 1000), 'segundos más)');
          set({
            servicios: cacheServicios.data,
            loading: false,
            conectado: true
          });
          return cacheServicios.data;
        }

        set({ loading: true, error: null });

        try {
          // Construir query params
          const params = new URLSearchParams();
          if (filtrosNormalizados.estado) params.append('estado', filtrosNormalizados.estado);
          if (filtrosNormalizados.tecnicoId) params.append('tecnicoId', filtrosNormalizados.tecnicoId);
          if (filtrosNormalizados.clienteId) params.append('clienteId', filtrosNormalizados.clienteId);
          if (filtrosNormalizados.fechaDesde) params.append('fechaDesde', filtrosNormalizados.fechaDesde);
          if (filtrosNormalizados.fechaHasta) params.append('fechaHasta', filtrosNormalizados.fechaHasta);

          const queryString = params.toString() ? `?${params.toString()}` : '';
          const response = await apiWithRetry(() => api.get(`/servicios${queryString}`));

          if (response.data.success) {
            const servicios = response.data.data || [];

            // Actualizar caché
            set({
              servicios,
              loading: false,
              conectado: true,
              cacheServicios: {
                data: servicios,
                timestamp: ahora,
                filtros: filtrosNormalizados
              }
            });

            return servicios;
          }
        } catch (error) {
          console.error('❌ Error al obtener servicios:', error);
          
          // Si hay error pero tenemos caché, usar el caché como fallback
          if (cacheServicios.data && cacheServicios.data.length > 0) {
            console.warn('⚠️ Error al cargar servicios, usando caché como fallback');
            set({
              servicios: cacheServicios.data,
              loading: false,
              error: error.message,
              conectado: false
            });
            return cacheServicios.data;
          }
          
          set({
            loading: false,
            error: error.message,
            conectado: false
          });

          toast.error(`Error al cargar servicios: ${error.message}`, {
            duration: 5000,
            position: 'top-right'
          });
        }
      },
      
      // ===================================
      //  INVALIDAR CACHÉ DE SERVICIOS
      // ===================================
      invalidarCacheServicios: () => {
        set({
          cacheServicios: {
            data: [],
            timestamp: null,
            filtros: null
          }
        });
        console.log('🗑️ Caché de servicios invalidado');
      },

      // ===================================
      //  OBTENER SERVICIO POR ID
      // ===================================
      obtenerServicio: async (id) => {
        const conectado = await get().verificarConexion();
        if (!conectado) return null;

        set({ loading: true, error: null });

        try {
          const response = await apiWithRetry(() => api.get(`/servicios/${id}`));

          if (response.data.success) {
            const servicio = response.data.data;

            set({
              servicioActual: servicio,
              loading: false,
              conectado: true
            });

            return servicio;
          }
        } catch (error) {
          console.error('❌ Error al obtener servicio:', error);
          set({
            loading: false,
            error: error.message,
            conectado: false
          });

          toast.error(`Error al cargar servicio: ${error.message}`, {
            duration: 5000,
            position: 'top-right'
          });
          return null;
        }
      },

      // ===================================
      //  CREAR SERVICIO
      // ===================================
      crearServicio: async (datos) => {
        const conectado = await get().verificarConexion();
        if (!conectado) {
          throw new Error('Sin conexión al servidor');
        }

        set({ loading: true, error: null });

        try {
          const response = await apiWithRetry(() => api.post('/servicios', datos));

          if (response.data.success) {
            const nuevoServicio = response.data.data;

            // Invalidar caché al crear un nuevo servicio
            get().invalidarCacheServicios();

            set(state => ({
              servicios: [nuevoServicio, ...state.servicios],
              servicioActual: nuevoServicio,
              loading: false,
              conectado: true
            }));

            // ✅ ELIMINADO: toast.success - Ahora se maneja con modal premium de procesamiento
            
            // 🆕 NO IMPRIMIR AUTOMÁTICAMENTE - Se mostrará modal de acciones
            // El modal de acciones permitirá al usuario elegir si imprimir o enviar WhatsApp
            
            return nuevoServicio;
          }
        } catch (error) {
          console.error('❌ Error al crear servicio:', error);
          // 🔍 DEBUG: Mostrar mensaje de error del backend si existe
          if (error.response?.data?.message) {
            console.error('❌ Mensaje del backend:', error.response.data.message);
            console.error('❌ Datos del error:', error.response.data);
          }
          set({
            loading: false,
            error: error.response?.data?.message || error.message,
            conectado: false
          });

          const mensaje = error.response?.data?.message || 'Error creando servicio';
          toast.error(mensaje, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

      // ===================================
      //  ACTUALIZAR SERVICIO
      // ===================================
      actualizarServicio: async (id, datos) => {
        const conectado = await get().verificarConexion();
        if (!conectado) {
          throw new Error('Sin conexión al servidor');
        }

        set({ loading: true, error: null });

        try {
          const response = await apiWithRetry(() => api.put(`/servicios/${id}`, datos));

          if (response.data.success) {
            const servicioActualizado = response.data.data;

            // Invalidar caché al actualizar un servicio
            get().invalidarCacheServicios();

            set(state => ({
              servicios: state.servicios.map(s =>
                s.id === id ? servicioActualizado : s
              ),
              servicioActual: state.servicioActual?.id === id
                ? servicioActualizado
                : state.servicioActual,
              loading: false,
              conectado: true
            }));

            toast.success('Servicio actualizado exitosamente', {
              duration: 3000,
              position: 'top-right'
            });

            return servicioActualizado;
          }
        } catch (error) {
          console.error('❌ Error al actualizar servicio:', error);
          set({
            loading: false,
            error: error.message,
            conectado: false
          });

          const mensaje = error.response?.data?.message || 'Error actualizando servicio';
          toast.error(mensaje, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

      // ===================================
      //  CAMBIAR ESTADO
      // ===================================
      cambiarEstado: async (id, nuevoEstado, nota = null) => {
        const conectado = await get().verificarConexion();
        if (!conectado) {
          throw new Error('Sin conexión al servidor');
        }

        try {
          const response = await apiWithRetry(() =>
            api.patch(`/servicios/${id}/estado`, {
              estado: nuevoEstado,
              nota
            })
          );

          if (response.data.success) {
            const servicioActualizado = response.data.data;

            // Invalidar caché al cambiar estado
            get().invalidarCacheServicios();

            set(state => ({
              servicios: state.servicios.map(s =>
                s.id === id ? servicioActualizado : s
              ),
              servicioActual: state.servicioActual?.id === id
                ? servicioActualizado
                : state.servicioActual,
              conectado: true
            }));

            // 🆕 Mostrar toast según el resultado del WhatsApp
            // Solo mostrar toast si el estado es LISTO_RETIRO (para evitar duplicados)
            if (nuevoEstado === 'LISTO_RETIRO') {
              if (response.data.whatsappEnviado) {
                toast.success(`✅ Estado cambiado a ${nuevoEstado}. ${response.data.mensajeWhatsApp || 'WhatsApp enviado exitosamente al cliente'}`, {
                  duration: 5000,
                  position: 'top-right'
                });
              } else if (response.data.mensajeWhatsApp) {
                toast.warning(`Estado cambiado a ${nuevoEstado}. ${response.data.mensajeWhatsApp}`, {
                  duration: 5000,
                  position: 'top-right'
                });
              } else {
                toast.success(`Estado cambiado a ${nuevoEstado}`, {
                  duration: 3000,
                  position: 'top-right'
                });
              }
            } else {
              // Para otros estados, mostrar toast normal
              toast.success(`Estado cambiado a ${nuevoEstado}`, {
                duration: 3000,
                position: 'top-right'
              });
            }

            // 🆕 Retornar también la información del WhatsApp para que el componente pueda usarla
            return {
              ...servicioActualizado,
              whatsappEnviado: response.data.whatsappEnviado,
              mensajeWhatsApp: response.data.mensajeWhatsApp
            };
          }
        } catch (error) {
          console.error('❌ Error al cambiar estado:', error);
          set({ conectado: false });

          const mensaje = error.response?.data?.message || 'Error cambiando estado';
          toast.error(mensaje, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

      // ===================================
      //  REGISTRAR PAGO
      // ===================================
      registrarPago: async (id, datosPago) => {
        const conectado = await get().verificarConexion();
        if (!conectado) {
          throw new Error('Sin conexión al servidor');
        }

        try {
          const response = await apiWithRetry(() =>
            api.post(`/servicios/${id}/pagos`, datosPago)
          );

          if (response.data.success) {
            const servicioActualizado = response.data.data;

            // Invalidar caché al registrar pago
            get().invalidarCacheServicios();

            set(state => ({
              servicios: state.servicios.map(s =>
                s.id === id ? servicioActualizado : s
              ),
              servicioActual: state.servicioActual?.id === id
                ? servicioActualizado
                : state.servicioActual,
              conectado: true
            }));

            toast.success('Pago registrado exitosamente', {
              duration: 3000,
              position: 'top-right'
            });

            return servicioActualizado;
          }
        } catch (error) {
          console.error('❌ Error al registrar pago:', error);
          set({ conectado: false });

          const mensaje = error.response?.data?.message || 'Error registrando pago';
          toast.error(mensaje, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

      // ===================================
      //  AGREGAR NOTA TÉCNICA
      // ===================================
      agregarNota: async (id, nota) => {
        const conectado = await get().verificarConexion();
        if (!conectado) {
          throw new Error('Sin conexión al servidor');
        }

        try {
          const response = await apiWithRetry(() =>
            api.post(`/servicios/${id}/notas`, nota)
          );

          if (response.data.success) {
            toast.success('Nota agregada exitosamente', {
              duration: 3000,
              position: 'top-right'
            });

            // Invalidar caché al agregar nota (afecta la lista de servicios)
            get().invalidarCacheServicios();

            // Recargar el servicio actual si es el mismo
            if (get().servicioActual?.id === id) {
              await get().obtenerServicio(id);
            }

            return response.data.data;
          }
        } catch (error) {
          console.error('❌ Error al agregar nota:', error);
          set({ conectado: false });

          const mensaje = error.response?.data?.message || 'Error agregando nota';
          toast.error(mensaje, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

      // ===================================
      //  CARGAR TÉCNICOS
      // ===================================
      cargarTecnicos: async () => {
        const conectado = await get().verificarConexion();
        if (!conectado) return;

        try {
          const response = await apiWithRetry(() => api.get('/servicios/tecnicos'));

          if (response.data.success) {
            const tecnicos = response.data.data || [];

            set({
              tecnicos,
              conectado: true
            });

            return tecnicos;
          }
        } catch (error) {
          console.error('❌ Error al cargar técnicos:', error);
          set({ conectado: false });

          toast.error('Error al cargar técnicos', {
            duration: 5000,
            position: 'top-right'
          });
        }
      },

      // ===================================
      //  ELIMINAR SERVICIO
      // ===================================
      eliminarServicio: async (id, motivoEliminacion, adminToken) => {
        const conectado = await get().verificarConexion();
        if (!conectado) {
          throw new Error('Sin conexión al servidor');
        }

        try {
          const response = await apiWithRetry(() => api.delete(`/servicios/${id}`, {
            data: {
              motivoEliminacion: motivoEliminacion?.trim() || '',
              adminToken: adminToken?.toUpperCase().trim() || ''
            }
          }));

          if (response.data.success) {
            // Invalidar caché al eliminar un servicio
            get().invalidarCacheServicios();

            set(state => ({
              servicios: state.servicios.filter(s => s.id !== id),
              servicioActual: state.servicioActual?.id === id ? null : state.servicioActual,
              conectado: true
            }));

            toast.success('Servicio eliminado exitosamente', {
              duration: 3000,
              position: 'top-right'
            });

          }
        } catch (error) {
          console.error('❌ Error al eliminar servicio:', error);
          set({ conectado: false });

          const mensaje = error.response?.data?.message || 'Error eliminando servicio';
          toast.error(mensaje, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

      // ===================================
      //  LIMPIAR SERVICIO ACTUAL
      // ===================================
      limpiarServicioActual: () => {
        set({ servicioActual: null });
      },

      // ===================================
      //  LIMPIAR ERROR
      // ===================================
      limpiarError: () => {
        set({ error: null });
      }
    }),
    { name: 'ServiciosStore' }
  )
);

export { useServiciosStore };
