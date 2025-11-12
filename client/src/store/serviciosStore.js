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
      //  CARGAR SERVICIOS
      // ===================================
      cargarServicios: async (filtros = {}) => {
        const conectado = await get().verificarConexion();
        if (!conectado) return;

        set({ loading: true, error: null });

        try {

          // Construir query params
          const params = new URLSearchParams();
          if (filtros.estado) params.append('estado', filtros.estado);
          if (filtros.tecnicoId) params.append('tecnicoId', filtros.tecnicoId);
          if (filtros.clienteId) params.append('clienteId', filtros.clienteId);
          if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
          if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);

          const queryString = params.toString() ? `?${params.toString()}` : '';
          const response = await apiWithRetry(() => api.get(`/servicios${queryString}`));

          if (response.data.success) {
            const servicios = response.data.data || [];

            set({
              servicios,
              loading: false,
              conectado: true
            });

          }
        } catch (error) {
          console.error('❌ Error al obtener servicios:', error);
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
          set({
            loading: false,
            error: error.message,
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
