// store/cajaStore.js (INTEGRADO CON BACKEND POSTGRESQL)
import { create } from 'zustand';

import { api, apiWithRetry, testConnection } from '../config/api.js';
import { useSocketEvents } from '../hooks/useSocketEvents';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore.js';


// Usar API centralizada con retry automático
const apiRequest = async (endpoint, options = {}) => {
  try {
    let response;
    
    if (options.method === 'POST') {
      response = await apiWithRetry(() => api.post(endpoint, options.body));
    } else if (options.method === 'PUT') {
      response = await apiWithRetry(() => api.put(endpoint, options.body));
    } else if (options.method === 'DELETE') {
      response = await apiWithRetry(() => api.delete(endpoint));
    } else {
      response = await apiWithRetry(() => api.get(endpoint));
    }
    
    return response.data.data || response.data;
  } catch (error) {
    // Mostrar toast de error
    const mensaje = error.response?.data?.message || error.message || 'Error de conexión';
    toast.error(`❌ ${mensaje}`, {
      duration: 4000,
      position: 'top-right'
    });
    
    throw new Error(mensaje);
  }
};

const useCajaStore = create((set, get) => ({
  // Estado inicial (mantiene la misma estructura)
  cajaActual: null,
  transacciones: [],
  ultimoCierre: null,
  tasaCambio: 37.50,
  loading: false,
  error: null,

//🆕 NUEVO: Cargar caja actual desde backend (CORREGIDO COMPLETAMENTE)
cargarCajaActual: async () => {
  set({ loading: true, error: null });
  
  try {
    const data = await apiRequest('/cajas/actual');
    
    console.log('🔍 === DIAGNÓSTICO CAJA ===');
    console.log('🔍 Datos recibidos del backend:', data);
    
    if (data && data.caja) {
      const caja = data.caja;
      console.log('🔍 Estado caja backend:', caja.estado);
      
     if (caja.estado === 'PENDIENTE_CIERRE_FISICO') {
        console.log('🚨 CAJA PENDIENTE DETECTADA - VERIFICANDO PERMISOS');
        
        // Verificar si el usuario actual puede resolver la caja
        const { usuario } = useAuthStore.getState();
        const esResponsable = usuario?.id === caja.usuarioAperturaId;
        const esAdmin = usuario?.rol?.toLowerCase() === 'admin';
        
        console.log('🔍 Verificación permisos:', {
          usuarioActual: usuario?.nombre,
          rolActual: usuario?.rol,
          responsableCaja: caja.usuarioApertura?.nombre,
          esResponsable,
          esAdmin
        });
        
        // 🆕 PREPARAR DATOS COMPLETOS PARA EL MODAL
        const datosCajaPendiente = {
          id: caja.id,
          fecha: new Date(caja.fecha).toLocaleDateString('es-VE'),
          usuarioResponsable: caja.usuarioApertura?.nombre,
          usuarioResponsableId: caja.usuarioAperturaId,
          
          // 🔥 DATOS ADICIONALES PARA CÁLCULOS
          montoInicialBs: parseFloat(caja.montoInicialBs) || 0,
          montoInicialUsd: parseFloat(caja.montoInicialUsd) || 0,
          montoInicialPagoMovil: parseFloat(caja.montoInicialPagoMovil) || 0,
          totalIngresosBs: parseFloat(caja.totalIngresosBs) || 0,
          totalEgresosBs: parseFloat(caja.totalEgresosBs) || 0,
          totalIngresosUsd: parseFloat(caja.totalIngresosUsd) || 0,
          totalEgresosUsd: parseFloat(caja.totalEgresosUsd) || 0,
          totalPagoMovil: parseFloat(caja.totalPagoMovil) || 0,
          
          // 📊 TRANSACCIONES PARA CÁLCULO DETALLADO
          transacciones: data.transacciones || [],
          
          // 🔍 PERMISOS CALCULADOS
          puedeResolver: esResponsable || esAdmin,
          esResponsable,
          esAdmin
        };
        
        if (esResponsable || esAdmin) {
          console.log('✅ Usuario autorizado - Datos completos preparados');
          useAuthStore.setState({
            sistemaBloquedadoPorCaja: true,
            cajaPendienteCierre: datosCajaPendiente
          });
        } else {
          console.log('🚫 Usuario SIN permisos - Bloquear sistema');
          useAuthStore.setState({
            sistemaBloquedadoPorCaja: true,
            cajaPendienteCierre: datosCajaPendiente
          });
        }
        
        set({
          cajaActual: null,
          transacciones: [],
          loading: false,
          error: `Caja pendiente de cierre físico`
        });
        
        console.log('🚨 Sistema bloqueado por caja pendiente');
        return;
      }
      
      // Resto del código para caja ABIERTA...
      set({
        cajaActual: {
          id: caja.id,
          fecha_apertura: new Date(caja.fecha).toLocaleDateString('es-VE'),
          hora_apertura: caja.horaApertura,
          monto_inicial_bs: parseFloat(caja.montoInicialBs) || 0,
          monto_inicial_usd: parseFloat(caja.montoInicialUsd) || 0,
          monto_inicial_pago_movil: parseFloat(caja.montoInicialPagoMovil) || 0,
          total_ingresos_bs: parseFloat(caja.totalIngresosBs) || 0,
          total_egresos_bs: parseFloat(caja.totalEgresosBs) || 0,
          total_ingresos_usd: parseFloat(caja.totalIngresosUsd) || 0,
          total_egresos_usd: parseFloat(caja.totalEgresosUsd) || 0,
          total_pago_movil: parseFloat(caja.totalPagoMovil) || 0,
          usuario_apertura: caja.usuarioApertura?.nombre || 'Usuario',
          timestamp_apertura: caja.createdAt,
          estado: caja.estado
        },
        transacciones: (data.transacciones || []).map(transaccion => ({
          ...transaccion,
          tipo: transaccion.tipo ? transaccion.tipo.toLowerCase() : 'ingreso',
          usuario: transaccion.usuario || 'Usuario desconocido' // 👈 AGREGAR ESTA LÍNEA
        })),
        loading: false
      });
    } else {
      set({
        cajaActual: null,
        transacciones: [],
        loading: false
      });
    }
    
    console.log('🔍 === FIN DIAGNÓSTICO ===');
    
  } catch (error) {
    console.error('❌ Error cargando caja:', error);
    set({ 
      loading: false, 
      error: error.message,
      cajaActual: null,
      transacciones: []
    });
    throw error;
  }
},

 initialize: async () => {
  set({ loading: true });
  try {
    // Verificar conexión primero
    const conexion = await testConnection();
    if (!conexion.success) {
      toast.error('❌ Sin conexión al servidor', {
        duration: 4000,
        position: 'top-right'
      });
      set({ loading: false, error: 'Sin conexión al servidor' });
      return;
    }
    
    // Cargar tasa de cambio
    await get().loadTasaFromServer();
    
    // Cargar caja actual si el usuario está autenticado
    const token = localStorage.getItem('auth-token');
    if (token) {
      await get().cargarCajaActual();
    }
    
    set({ loading: false });
    toast.success('✅ Sistema inicializado correctamente');
  } catch (error) {
    set({ loading: false, error: 'Error al inicializar la aplicación' });
    toast.error(`❌ Error al inicializar: ${error.message}`);
  }
},

  // Limpiar errores
  clearError: () => {
    set({ error: null });
  },

  // Cargar tasa de cambio desde API del BCV (mantener igual)
  loadTasaCambio: async () => {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!response.ok) {
        throw new Error('Error al obtener la tasa de cambio');
      }
      const data = await response.json();
      set({ tasaCambio: data.promedio || 37.50 });
      return data.promedio;
    } catch (error) {
      console.error('Error loading tasa de cambio:', error);
      return get().tasaCambio;
    }
  },

// 🆕 Cargar tasa consultando servidor primero
loadTasaFromServer: async () => {
  try {
    // 1. Consultar estado del servidor
    const response = await apiWithRetry(() => api.get('/tasa-bcv/estado'));
    const estadoServidor = response.data.data;
    
    console.log('🔍 Estado tasa en servidor (cajaStore):', estadoServidor);
    
    // 2. Usar estado del servidor (MANUAL o AUTO)
    set({ tasaCambio: estadoServidor.valor });
    
    return estadoServidor.valor;
  } catch (error) {
    console.error('Error loading tasa from server:', error);
    // Fallback: cargar desde BCV si no puede consultar servidor
    return await get().loadTasaCambio();
  }
},

  // 🔄 ACTUALIZADO: Abrir caja con backend (NOMBRES CORREGIDOS)
abrirCaja: async (montoInicialBs, montoInicialUsd, montoInicialPagoMovil) => {
  set({ loading: true, error: null });
  
  try {
    // Validaciones locales primero
    if (get().cajaActual) {
      throw new Error('Ya hay una caja abierta');
    }

    if (montoInicialBs < 0 || montoInicialUsd < 0 || montoInicialPagoMovil < 0) {
      throw new Error('Los montos iniciales no pueden ser negativos');
    }

    console.log('🔍 Enviando al backend:', {
      montoInicialBs: parseFloat(montoInicialBs) || 0,
      montoInicialUsd: parseFloat(montoInicialUsd) || 0,
      montoInicialPagoMovil: parseFloat(montoInicialPagoMovil) || 0
    });

    // Llamada al backend - NOMBRES CORREGIDOS (camelCase)
    const data = await apiRequest('/cajas/abrir', {
      method: 'POST',
      body: {
        montoInicialBs: parseFloat(montoInicialBs) || 0,        // ✅ camelCase
        montoInicialUsd: parseFloat(montoInicialUsd) || 0,      // ✅ camelCase
        montoInicialPagoMovil: parseFloat(montoInicialPagoMovil) || 0  // ✅ camelCase
      }
    });

    console.log('✅ Respuesta del backend:', data);

    // Actualizar estado local
    const nuevaCaja = {
      id: data.id,
      fecha_apertura: new Date(data.fecha).toLocaleDateString('es-VE'),
      hora_apertura: data.horaApertura,
      monto_inicial_bs: parseFloat(data.montoInicialBs) || 0,
      monto_inicial_usd: parseFloat(data.montoInicialUsd) || 0,
      monto_inicial_pago_movil: parseFloat(data.montoInicialPagoMovil) || 0,
      total_ingresos_bs: 0,
      total_egresos_bs: 0,
      total_ingresos_usd: 0,
      total_egresos_usd: 0,
      total_pago_movil: 0,
      usuario_apertura: data.usuarioApertura?.nombre || 'Usuario',
      timestamp_apertura: data.createdAt,
      estado: data.estado
    };

    set({
      cajaActual: nuevaCaja,
      transacciones: [],
      ultimoCierre: null,
      loading: false,
      error: null
    });

    // 🔄 RECARGAR CAJA ACTUAL DESDE BACKEND
    setTimeout(async () => {
      try {
        await get().cargarCajaActual();
        console.log('🔄 Caja recargada después de abrir');
      } catch (error) {
        console.log('⚠️ Error recargando caja:', error.message);
      }
    }, 500);

    return nuevaCaja;

  } catch (error) {
    console.error('❌ Error abriendo caja:', error);
    set({ loading: false, error: error.message });
    throw error;
  }
},

// 🔄 ACTUALIZADO: Cerrar caja con backend (NOMBRES CORREGIDOS)
cerrarCaja: async (datosCierre) => {
  const estado = get();
  if (!estado.cajaActual) {
    throw new Error('No hay una caja abierta');
  }

  set({ loading: true, error: null });

  try {
    console.log('🔍 Cerrando caja con datos:', datosCierre);

    // Llamada al backend - NOMBRES CORREGIDOS
    const data = await apiRequest('/cajas/cerrar', {
      method: 'PUT',
      body: {
        montoFinalBs: datosCierre.montoFinalBs,              // ✅ camelCase
        montoFinalUsd: datosCierre.montoFinalUsd,            // ✅ camelCase
        montoFinalPagoMovil: datosCierre.montoFinalPagoMovil, // ✅ camelCase
        observacionesCierre: datosCierre.observacionesCierre || ''  // ✅ camelCase
      }
    });

    console.log('✅ Caja cerrada en backend:', data);

    // Crear información del cierre para el estado local
    const cierreInfo = {
      id: data.id,
      tipo: 'cierre',
      fecha_hora: data.updatedAt,
      usuario_cierre: data.usuarioCierre?.nombre || 'Usuario',
      hora_apertura: estado.cajaActual.hora_apertura,
      hora_cierre: data.horaCierre,
      fecha_apertura: estado.cajaActual.fecha_apertura,
      fecha_cierre: new Date().toLocaleDateString('es-VE'),
      total_transacciones: estado.transacciones.length,
      total_ingresos_bs: parseFloat(data.totalIngresosBs) || 0,
      total_egresos_bs: parseFloat(data.totalEgresosBs) || 0,
      total_ingresos_usd: parseFloat(data.totalIngresosUsd) || 0,
      total_egresos_usd: parseFloat(data.totalEgresosUsd) || 0,
      total_pago_movil: parseFloat(data.totalPagoMovil) || 0,
      monto_inicial_bs: parseFloat(data.montoInicialBs),
      monto_inicial_usd: parseFloat(data.montoInicialUsd),
      monto_inicial_pago_movil: parseFloat(data.montoInicialPagoMovil),
      monto_final_bs: parseFloat(data.montoFinalBs) || 0,
      monto_final_usd: parseFloat(data.montoFinalUsd) || 0,
      saldo_final_bs: (parseFloat(data.montoInicialBs) + parseFloat(data.totalIngresosBs) - parseFloat(data.totalEgresosBs)),
      saldo_final_usd: (parseFloat(data.montoInicialUsd) + parseFloat(data.totalIngresosUsd) - parseFloat(data.totalEgresosUsd))
    };

    set({
      cajaActual: null,
      transacciones: [],
      ultimoCierre: cierreInfo,
      loading: false,
      error: null
    });

    console.log('✅ Estado local actualizado - Caja cerrada');
    return cierreInfo;

  } catch (error) {
    console.error('❌ Error cerrando caja:', error);
    set({ loading: false, error: error.message });
    throw error;
  }
},

// 🔄 VERSIÓN DEBUG: Para identificar el problema del tipo
agregarTransaccion: async (transaccion) => {
  const estado = get();
  if (!estado.cajaActual) {
    throw new Error('No hay una caja abierta');
  }

  set({ loading: true, error: null });

  try {
    console.log('🔍 DEBUG 1 - TRANSACCIÓN RECIBIDA:', {
      tipo: transaccion.tipo,
      tipoEsString: typeof transaccion.tipo,
      categoria: transaccion.categoria
    });

    // 1. VALIDACIONES LOCALES
    if (!transaccion.categoria || !transaccion.categoria.trim()) {
      throw new Error('La categoría es obligatoria');
    }

    if (!transaccion.pagos || transaccion.pagos.length === 0) {
      throw new Error('Debe agregar al menos un método de pago');
    }

    for (const pago of transaccion.pagos) {
      if (!pago.monto || parseFloat(pago.monto) <= 0) {
        throw new Error('Todos los montos deben ser mayores a 0');
      }
    }

    // 2. VALIDAR TIPO CORRECTO DESDE EL INICIO
    const tipoOriginal = transaccion.tipo.toLowerCase();
    const tipoBackend = tipoOriginal.toUpperCase();

    console.log('🔍 DEBUG 2 - TIPOS PROCESADOS:', {
      tipoOriginal: tipoOriginal,
      tipoBackend: tipoBackend,
      debeSerIngreso: tipoOriginal === 'ingreso',
      debeSerEgreso: tipoOriginal === 'egreso'
    });

    // 3. ENVIAR AL BACKEND
    const data = await apiRequest('/cajas/transacciones', {
      method: 'POST',
      body: {
        tipo: tipoBackend,
        categoria: transaccion.categoria.trim(),
        observaciones: transaccion.observaciones?.trim() || '',
        totalBs: parseFloat(transaccion.total_bs) || 0,
        totalUsd: parseFloat(transaccion.total_usd) || 0,
        tasaCambioUsada: parseFloat(transaccion.tasa_cambio_usada) || estado.tasaCambio,
        itemInventario: transaccion.item_inventario || null,
        cliente: transaccion.cliente || null,
        items: transaccion.items || [],
        pagos: transaccion.pagos.map(pago => ({
          metodo: pago.metodo,
          monto: parseFloat(pago.monto),
          moneda: pago.moneda || 'bs',
          banco: pago.banco || null,
          referencia: pago.referencia || null
        }))
      }
    });

    console.log('✅ DEBUG 3 - RESPUESTA BACKEND:', {
      backendTipo: data.tipo,
      backendId: data.id,
      backendCompleto: data
    });

    // 4. CREAR FECHA VÁLIDA
    let fechaValida;
    try {
      if (data.fechaHora) { // ✅ CAMBIO: usar fechaHora en lugar de createdAt
        fechaValida = new Date(data.fechaHora).toISOString();
        if (isNaN(new Date(fechaValida).getTime())) {
          throw new Error('Fecha inválida del backend');
        }
      } else {
        fechaValida = new Date().toISOString();
      }
    } catch (error) {
      console.warn('⚠️ Error con fecha del backend, usando fecha actual:', error);
      fechaValida = new Date().toISOString();
    }

    // 5. CREAR TRANSACCIÓN PARA FRONTEND
    const nuevaTransaccion = {
      id: data.id || Date.now(),
      tipo: tipoOriginal, // ✅ MANTENER TIPO ORIGINAL ('ingreso' o 'egreso')
      categoria: data.categoria || transaccion.categoria.trim(),
      observaciones: data.observaciones || transaccion.observaciones?.trim() || '',
      fecha_hora: fechaValida,
      
      // Valores seguros para toFixed()
      total_bs: parseFloat(data.totalBs) || parseFloat(transaccion.total_bs) || 0,
      total_usd: parseFloat(data.totalUsd) || parseFloat(transaccion.total_usd) || 0,
      tasa_cambio_usada: parseFloat(data.tasaCambioUsada) || parseFloat(transaccion.tasa_cambio_usada) || estado.tasaCambio,
      
      // Campos adicionales
      usuario: data.usuario?.nombre || 'Usuario',
      cliente: data.cliente || transaccion.cliente || null,
      items: data.items || transaccion.items || [],
      item_inventario: data.itemInventario || transaccion.item_inventario || null,
      
      // Pagos con validación segura
      pagos: (data.pagos || transaccion.pagos || []).map(pago => ({
        id: pago.id || Date.now() + Math.random(),
        metodo: pago.metodo || 'efectivo_bs',
        monto: parseFloat(pago.monto) || 0,
        moneda: pago.moneda || 'bs',
        banco: pago.banco || null,
        referencia: pago.referencia || null
      }))
    };

    console.log('🔍 DEBUG 4 - TRANSACCIÓN PARA FRONTEND CREADA:', {
      id: nuevaTransaccion.id,
      tipo: nuevaTransaccion.tipo,
      tipoEsString: typeof nuevaTransaccion.tipo,
      esIngreso: nuevaTransaccion.tipo === 'ingreso',
      esEgreso: nuevaTransaccion.tipo === 'egreso'
    });

    // 6. ACTUALIZAR ESTADO LOCAL
    const transaccionesActualizadas = [nuevaTransaccion, ...estado.transacciones];
    
    set({
      transacciones: transaccionesActualizadas,
      loading: false,
      error: null
    });

    console.log('🔍 DEBUG 5 - ESTADO ACTUALIZADO, VERIFICANDO PRIMERA TRANSACCIÓN:', {
      primeraTransaccion: transaccionesActualizadas[0],
      primerTipo: transaccionesActualizadas[0]?.tipo,
      cantidadTransacciones: transaccionesActualizadas.length
    });

    // 7. RECARGAR CAJA ACTUAL
    setTimeout(async () => {
      try {
        console.log('🔍 DEBUG 6 - ANTES DE RECARGAR CAJA');
        await get().cargarCajaActual();
        console.log('🔍 DEBUG 7 - DESPUÉS DE RECARGAR CAJA');
        
        // Verificar si la recarga afectó las transacciones
        const estadoDespues = get();
        console.log('🔍 DEBUG 8 - TRANSACCIONES DESPUÉS DE RECARGA:', {
          cantidad: estadoDespues.transacciones.length,
          primerTipo: estadoDespues.transacciones[0]?.tipo,
          primeraCompleta: estadoDespues.transacciones[0]
        });
      } catch (error) {
        console.log('⚠️ Error recargando caja:', error.message);
      }
    }, 300);

    // 8. EMITIR EVENTO SOCKET.IO PARA SINCRONIZACIÓN
      if (typeof globalEmitirEvento === 'function') {
        globalEmitirEvento('nueva_transaccion', {
          transaccion: nuevaTransaccion,
          usuario: estado.usuario?.nombre || 'Usuario',
          timestamp: new Date().toISOString()
        });
        console.log('📡 Evento nueva_transaccion emitido');
      } else {
        console.log('⚠️ globalEmitirEvento no está disponible para nueva transacción');
      }

// 9. MOSTRAR CONFIRMACIÓN
toast.success(`✅ ${tipoOriginal === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente`);

return nuevaTransaccion;

  } catch (error) {
    console.error('❌ Error agregando transacción:', error);
    set({ loading: false, error: error.message });
    throw error;
  }
},

// 🔄 ACTUALIZADO: Eliminar transacción con backend REAL
eliminarTransaccion: async (transaccionId) => {
  const estado = get();
  if (!estado.cajaActual) {
    throw new Error('No hay una caja abierta');
  }

  set({ loading: true, error: null });

  try {
    console.log('🗑️ ELIMINANDO TRANSACCIÓN:', transaccionId);

    // 1. BUSCAR TRANSACCIÓN LOCALMENTE PARA REFERENCIA
    const transaccionAEliminar = estado.transacciones.find(t => t.id === transaccionId);
    if (!transaccionAEliminar) {
      throw new Error('Transacción no encontrada');
    }

    console.log('🔍 Transacción a eliminar:', {
      id: transaccionAEliminar.id,
      tipo: transaccionAEliminar.tipo,
      categoria: transaccionAEliminar.categoria
    });

    // 2. ELIMINAR EN EL BACKEND
    await apiRequest(`/cajas/transacciones/${transaccionId}`, {
      method: 'DELETE'
    });

    console.log('✅ Transacción eliminada en backend');

    // 3. ACTUALIZAR ESTADO LOCAL INMEDIATAMENTE
    const transaccionesActualizadas = estado.transacciones.filter(t => t.id !== transaccionId);

    set({
      transacciones: transaccionesActualizadas,
      loading: false,
      error: null
    });

    console.log('✅ Estado local actualizado - Transacción eliminada');

    // 4. RECARGAR CAJA PARA SINCRONIZAR TOTALES
    setTimeout(async () => {
      try {
        await get().cargarCajaActual();
        console.log('🔄 Caja recargada después de eliminar transacción');
      } catch (error) {
        console.log('⚠️ Error recargando caja:', error.message);
      }
    }, 300);

      // 5. EMITIR EVENTO SOCKET.IO PARA SINCRONIZACIÓN
      if (typeof globalEmitirEvento === 'function') {
        globalEmitirEvento('transaccion_eliminada', {
          transaccionId: transaccionId,
          transaccion: transaccionAEliminar,
          usuario: estado.usuario?.nombre || 'Usuario',
          timestamp: new Date().toISOString()
        });
        console.log('📡 Evento transaccion_eliminada emitido');
      } else {
        console.log('⚠️ globalEmitirEvento no está disponible para eliminación');
      }

      // 6. MOSTRAR CONFIRMACIÓN
      toast.success(`✅ ${transaccionAEliminar.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} eliminado correctamente`);

      return transaccionAEliminar;

  } catch (error) {
    console.error('❌ Error eliminando transacción:', error);
    
    // Si el backend falla, mantener estado local y mostrar warning
    if (error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('Network Error')) {
      // Eliminar solo localmente si backend no está disponible
      const transaccionesActualizadas = estado.transacciones.filter(t => t.id !== transaccionId);
      
      set({
        transacciones: transaccionesActualizadas,
        loading: false,
        error: null
      });
      
      toast.error('⚠️ Backend desconectado - Eliminado solo localmente');
    } else {
      set({ loading: false, error: error.message });
      toast.error(`❌ Error al eliminar: ${error.message}`);
    }
    
    throw error;
  }
},

  // Funciones auxiliares (mantener igual)
  updateTasaCambio: (nuevaTasa) => {
    const tasa = parseFloat(nuevaTasa);
    if (tasa > 0) {
      set({ tasaCambio: tasa });
    }
  },

  getResumenDia: () => {
    const estado = get();
    if (!estado.cajaActual) return null;

    const ingresosBs = estado.cajaActual.total_ingresos_bs;
    const egresosBs = estado.cajaActual.total_egresos_bs;
    const ingresosUsd = estado.cajaActual.total_ingresos_usd;
    const egresosUsd = estado.cajaActual.total_egresos_usd;

    return {
      transaccionesTotales: estado.transacciones.length,
      transaccionesIngresos: estado.transacciones.filter(t => t.tipo === 'ingreso').length,
      transaccionesEgresos: estado.transacciones.filter(t => t.tipo === 'egreso').length,
      ingresosBs,
      egresosBs,
      ingresosUsd,
      egresosUsd,
      pagoMovil: estado.cajaActual.total_pago_movil,
      balanceBs: ingresosBs - egresosBs,
      balanceUsd: ingresosUsd - egresosUsd,
      saldoFinalBs: estado.cajaActual.monto_inicial_bs + ingresosBs - egresosBs,
      saldoFinalUsd: estado.cajaActual.monto_inicial_usd + ingresosUsd - egresosUsd,
      montoInicialBs: estado.cajaActual.monto_inicial_bs,
      montoInicialUsd: estado.cajaActual.monto_inicial_usd,
      montoInicialPagoMovil: estado.cajaActual.monto_inicial_pago_movil
    };
  },

  getTransaccionesPorTipo: (tipo) => {
    const estado = get();
    return estado.transacciones.filter(t => t.tipo === tipo);
  },

  getTransaccionesPorMetodo: (metodo) => {
    const estado = get();
    return estado.transacciones.filter(t => 
      t.pagos.some(pago => pago.metodo === metodo)
    );
  },

  getTransaccionesPorFecha: (fecha) => {
    const estado = get();
    const fechaBusqueda = new Date(fecha).toISOString().split('T')[0];
    return estado.transacciones.filter(t => 
      new Date(t.fecha_hora).toISOString().split('T')[0] === fechaBusqueda
    );
  },

  getEstadisticasMetodosPago: () => {
    const estado = get();
    const stats = {};
    
    estado.transacciones.forEach(transaccion => {
      transaccion.pagos.forEach(pago => {
        if (!stats[pago.metodo]) {
          stats[pago.metodo] = { 
            cantidad: 0, 
            totalBs: 0, 
            totalUsd: 0 
          };
        }
        stats[pago.metodo].cantidad++;
        if (pago.moneda === 'bs') {
          stats[pago.metodo].totalBs += pago.monto;
        } else {
          stats[pago.metodo].totalUsd += pago.monto;
        }
      });
    });

    return stats;
  },

  isCajaAbierta: () => {
    return get().cajaActual !== null;
  },

  getUltimaTransaccion: () => {
    const estado = get();
    return estado.transacciones.length > 0 ? estado.transacciones[0] : null;
  },

  reset: () => {
    set({
      cajaActual: null,
      transacciones: [],
      ultimoCierre: null,
      tasaCambio: 37.50,
      loading: false,
      error: null
    });
  },

// 🆕 FUNCIÓN PARA ACTUALIZAR ESTADO DE CAJA VIA SOCKET.IO (DETECCIÓN AUTOMÁTICA COMPLETA)
updateCajaStatus: (cajaData) => {
  console.log('🔧 updateCajaStatus llamada con:', cajaData);
  
  if (!cajaData) {
    console.log('⚠️ updateCajaStatus: cajaData es null/undefined');
    return;
  }

  // 🔧 DETECTAR FORMATO DE DATOS AUTOMÁTICAMENTE
  const yaEsProcesado = cajaData.fecha_apertura && !cajaData.fecha;
  
  let datosActuales;
  if (yaEsProcesado) {
    // 📋 DATOS YA PROCESADOS desde useSocketEvents
    datosActuales = cajaData;
    console.log('🔧 Usando datos YA PROCESADOS desde useSocketEvents');
  } else if (cajaData.caja && cajaData.caja.id) {
    datosActuales = cajaData.caja;
    console.log('🔧 Usando cajaData.caja (datos crudos del backend)');
  } else if (cajaData.id) {
    datosActuales = cajaData;
    console.log('🔧 Usando cajaData directamente (datos crudos del backend)');
  } else {
    console.log('⚠️ Formato de datos no reconocido:', cajaData);
    return;
  }

  console.log('🔧 Estado de la caja:', datosActuales.estado);
  console.log('🔧 Datos a procesar:', datosActuales);
  console.log('🔧 Formato detectado:', yaEsProcesado ? 'PROCESADO' : 'CRUDO');

  // 📦 ===================================
  // CAJA ABIERTA
  // ===================================
  if (datosActuales.estado === 'ABIERTA') {
    let cajaActualizada;
    
    if (yaEsProcesado) {
      // ✅ DATOS YA PROCESADOS - usar directamente
      cajaActualizada = {
        ...datosActuales,
        lastUpdated: Date.now()
      };
      console.log('✅ Usando datos procesados directamente sin modificación');
    } else {
      // 🔄 DATOS CRUDOS del backend - procesar normalmente
      cajaActualizada = {
        id: datosActuales.id,
        fecha_apertura: new Date(datosActuales.fecha).toLocaleDateString('es-VE'),
        hora_apertura: datosActuales.horaApertura,
        monto_inicial_bs: parseFloat(datosActuales.montoInicialBs) || 0,
        monto_inicial_usd: parseFloat(datosActuales.montoInicialUsd) || 0,
        monto_inicial_pago_movil: parseFloat(datosActuales.montoInicialPagoMovil) || 0,
        total_ingresos_bs: parseFloat(datosActuales.totalIngresosBs) || 0,
        total_egresos_bs: parseFloat(datosActuales.totalEgresosBs) || 0,
        total_ingresos_usd: parseFloat(datosActuales.totalIngresosUsd) || 0,
        total_egresos_usd: parseFloat(datosActuales.totalEgresosUsd) || 0,
        total_pago_movil: parseFloat(datosActuales.totalPagoMovil) || 0,
        usuario_apertura: datosActuales.usuarioApertura?.nombre || 'Usuario',
        timestamp_apertura: datosActuales.createdAt,
        estado: datosActuales.estado,
        lastUpdated: Date.now()
      };
      console.log('✅ Procesando datos crudos del backend');
    }

    // 🚀 ACTUALIZACIÓN DIRECTA (sin timeout para evitar parpadeos)
    set({
      cajaActual: cajaActualizada,
      transacciones: datosActuales.transacciones || [],
      error: null,
      loading: false
    });

    // 🔔 NOTIFICACIÓN DE CAJA ABIERTA
    toast.success(`🏪 Caja abierta por ${cajaActualizada.usuario_apertura}`, {
      duration: 4000,
      id: 'caja-abierta',
      icon: '✅',
      style: {
        background: '#F0FDF4',
        border: '2px solid #22C55E',
        color: '#166534',
        fontSize: '16px',
        fontWeight: '600'
      }
    });

    console.log('✅ Estado actualizado - Caja abierta:', cajaActualizada);
  }

  // 🔒 ===================================
  // CAJA CERRADA
  // ===================================
  else if (datosActuales.estado === 'CERRADA') {
    let cierreInfo;
    
    if (yaEsProcesado) {
      // ✅ DATOS YA PROCESADOS - adaptarlos al formato esperado
      cierreInfo = {
        id: datosActuales.id,
        tipo: 'cierre',
        fecha_hora: datosActuales.timestamp_apertura || new Date().toISOString(),
        usuario_cierre: datosActuales.usuario_cierre || 'Usuario',
        hora_apertura: datosActuales.hora_apertura,
        hora_cierre: datosActuales.hora_cierre,
        fecha_apertura: datosActuales.fecha_apertura,
        fecha_cierre: new Date().toLocaleDateString('es-VE'),
        total_ingresos_bs: datosActuales.total_ingresos_bs || 0,
        total_egresos_bs: datosActuales.total_egresos_bs || 0,
        total_ingresos_usd: datosActuales.total_ingresos_usd || 0,
        total_egresos_usd: datosActuales.total_egresos_usd || 0,
        total_pago_movil: datosActuales.total_pago_movil || 0,
        monto_inicial_bs: datosActuales.monto_inicial_bs || 0,
        monto_inicial_usd: datosActuales.monto_inicial_usd || 0,
        monto_inicial_pago_movil: datosActuales.monto_inicial_pago_movil || 0,
        monto_final_bs: datosActuales.monto_final_bs || 0,
        monto_final_usd: datosActuales.monto_final_usd || 0,
        lastUpdated: Date.now()
      };
    } else {
      // 🔄 DATOS CRUDOS del backend - procesar normalmente
      cierreInfo = {
        id: datosActuales.id,
        tipo: 'cierre',
        fecha_hora: datosActuales.updatedAt,
        usuario_cierre: datosActuales.usuarioCierre?.nombre || 'Usuario',
        hora_apertura: datosActuales.horaApertura,
        hora_cierre: datosActuales.horaCierre,
        fecha_apertura: new Date(datosActuales.fecha).toLocaleDateString('es-VE'),
        fecha_cierre: new Date().toLocaleDateString('es-VE'),
        total_ingresos_bs: parseFloat(datosActuales.totalIngresosBs) || 0,
        total_egresos_bs: parseFloat(datosActuales.totalEgresosBs) || 0,
        total_ingresos_usd: parseFloat(datosActuales.totalIngresosUsd) || 0,
        total_egresos_usd: parseFloat(datosActuales.totalEgresosUsd) || 0,
        total_pago_movil: parseFloat(datosActuales.totalPagoMovil) || 0,
        monto_inicial_bs: parseFloat(datosActuales.montoInicialBs),
        monto_inicial_usd: parseFloat(datosActuales.montoInicialUsd),
        monto_inicial_pago_movil: parseFloat(datosActuales.montoInicialPagoMovil),
        monto_final_bs: parseFloat(datosActuales.montoFinalBs) || 0,
        monto_final_usd: parseFloat(datosActuales.montoFinalUsd) || 0,
        lastUpdated: Date.now()
      };
    }

    set({
      cajaActual: null,
      transacciones: [],
      ultimoCierre: cierreInfo,
      error: null,
      loading: false
    });

    // 🔔 NOTIFICACIÓN DE CAJA CERRADA
    toast.success(`🔒 Caja cerrada por ${cierreInfo.usuario_cierre}`, {
      duration: 4000,
      id: 'caja-cerrada',
      icon: '✅',
      style: {
        background: '#FEF3C7',
        border: '2px solid #F59E0B',
        color: '#92400E',
        fontSize: '16px',
        fontWeight: '600'
      }
    });

    console.log('✅ Estado actualizado - Caja cerrada');
  }

  // 🚨 ===================================
  // CAJA PENDIENTE DE CIERRE FÍSICO
  // ===================================
  else if (datosActuales.estado === 'PENDIENTE_CIERRE_FISICO') {
    console.log('🚨 Caja pendiente de cierre físico detectada:', {
      id: datosActuales.id,
      fecha: datosActuales.fecha || datosActuales.fecha_apertura,
      usuario_responsable: datosActuales.usuarioApertura?.nombre || datosActuales.usuario_apertura
    });

    let fechaCaja;
    let usuarioResponsable;
    
    if (yaEsProcesado) {
      fechaCaja = datosActuales.fecha_apertura;
      usuarioResponsable = datosActuales.usuario_apertura;
    } else {
      fechaCaja = new Date(datosActuales.fecha).toLocaleDateString('es-VE');
      usuarioResponsable = datosActuales.usuarioApertura?.nombre;
    }

    // 🚨 ACTUALIZAR ESTADO LOCAL
    set({
      cajaActual: null,
      transacciones: [],
      error: `Caja pendiente de cierre físico. Contacte a ${usuarioResponsable || 'administrador'}.`,
      loading: false,
      cajaPendienteCierre: {
        id: datosActuales.id,
        fecha: fechaCaja,
        usuarioResponsable: usuarioResponsable,
        usuarioResponsableId: datosActuales.usuarioAperturaId || datosActuales.usuario_responsable_id
      }
    });

    // 🔔 TOAST DE ADVERTENCIA
    toast.error(`🚨 Caja del ${fechaCaja} pendiente de cierre físico`, {
      duration: 8000,
      style: {
        background: '#FEF2F2',
        border: '2px solid #F87171',
        color: '#7F1D1D',
        fontSize: '16px',
        fontWeight: '600'
      }
    });

    // 🌐 EMITIR EVENTO GLOBAL PARA MODAL DE BLOQUEO
    if (typeof window !== 'undefined' && window.emitirEventoGlobal) {
      window.emitirEventoGlobal('mostrar_modal_caja_pendiente', {
        caja: datosActuales,
        motivo: `Caja del ${fechaCaja} pendiente de cierre físico`,
        usuario_responsable: usuarioResponsable || 'Usuario desconocido',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🚨 Modal de caja pendiente activado');
  }

  // ⚠️ ===================================
  // ESTADO NO RECONOCIDO
  // ===================================
  else {
    console.log('⚠️ Estado de caja no reconocido:', datosActuales.estado);
    set({ 
      loading: false,
      error: `Estado de caja no reconocido: ${datosActuales.estado}`
    });

    // 🔔 TOAST DE ERROR
    toast.error(`⚠️ Estado de caja desconocido: ${datosActuales.estado}`, {
      duration: 5000,
      style: {
        background: '#FEF2F2',
        border: '2px solid #EF4444',
        color: '#7F1D1D'
      }
    });
  }
},

  // 🆕 FUNCIÓN PARA AGREGAR TRANSACCIÓN VIA SOCKET.IO
      addTransaction: (transactionData) => {
        console.log('🔧 addTransaction llamada con:', transactionData);
        
        if (!transactionData || !transactionData.transaccion) {
          console.log('⚠️ addTransaction: datos de transacción inválidos');
          return;
        }

        const estado = get();
        if (!estado.cajaActual) {
          console.log('⚠️ addTransaction: no hay caja abierta');
          return;
        }

        const transaccion = {
          ...transactionData.transaccion,
          usuario: transactionData.transaccion.usuario || transactionData.usuario || 'Usuario desconocido',
          fecha_hora: transactionData.transaccion.fecha_hora || transactionData.transaccion.fechaHora || new Date().toISOString()
        };
        
        // Agregar la nueva transacción al principio de la lista
        set({
          transacciones: [transaccion, ...estado.transacciones]
        });

        console.log('✅ Transacción agregada al estado local con usuario:', transaccion.usuario);
      },

      // 🆕 FUNCIÓN PARA PROCESAR VENTA COMPLETADA VIA SOCKET.IO
processVentaCompletada: (ventaData) => {
  console.log('🚀 processVentaCompletada llamada con:', ventaData);
  
  if (!ventaData || !ventaData.venta) {
    console.log('⚠️ processVentaCompletada: datos de venta inválidos');
    return;
  }

  const estado = get();
  if (!estado.cajaActual) {
    console.log('⚠️ processVentaCompletada: no hay caja abierta');
    return;
  }

  // Recargar caja actual para obtener totales actualizados
  setTimeout(async () => {
    try {
      await get().cargarCajaActual();
      console.log('✅ Dashboard actualizado automáticamente después de venta');
    } catch (error) {
      console.error('❌ Error recargando después de venta:', error);
    }
  }, 500);

  // Mostrar notificación
  toast.success(`💰 Venta procesada por ${ventaData.usuario}`, {
    duration: 3000,
    icon: '🚀'
  });
},

  // 🆕 FUNCIÓN PARA ELIMINAR TRANSACCIÓN VIA SOCKET.IO
  removeTransaction: (transaccionId) => {
    console.log('🔧 removeTransaction llamada con ID:', transaccionId);
    
    if (!transaccionId) {
      console.log('⚠️ removeTransaction: ID de transacción inválido');
      return;
    }

    const estado = get();
    if (!estado.cajaActual) {
      console.log('⚠️ removeTransaction: no hay caja abierta');
      return;
    }

    // Filtrar la transacción eliminada
    const transaccionesActualizadas = estado.transacciones.filter(t => t.id !== transaccionId);
    
    set({
      transacciones: transaccionesActualizadas
    });

    console.log('✅ Transacción eliminada del estado local');
  },

  debug: () => {
    console.log('Estado actual del store:', get());
  },

  // 🆕 ===================================
  // FUNCIONES PARA CAJAS PENDIENTES
  // ===================================

  // 📋 OBTENER CAJAS PENDIENTES
  obtenerCajasPendientes: async () => {
    set({ loading: true, error: null });
    
    try {
      const data = await apiRequest('/cajas/pendientes');
      
      console.log('📋 Cajas pendientes obtenidas:', data);
      
      return {
        success: true,
        cajasPendientes: data.cajas_pendientes || [],
        total: data.total || 0
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo cajas pendientes:', error);
      set({ loading: false, error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ✅ RESOLVER CAJA PENDIENTE
  resolverCajaPendiente: async (cajaId, datosResolucion) => {
    set({ loading: true, error: null });
    
    try {
      console.log('✅ Resolviendo caja pendiente:', {
        cajaId,
        datosResolucion
      });

      const data = await apiRequest(`/cajas/resolver-pendiente/${cajaId}`, {
        method: 'POST',
        body: {
          montoFinalBs: parseFloat(datosResolucion.montoFinalBs) || 0,
          montoFinalUsd: parseFloat(datosResolucion.montoFinalUsd) || 0,
          montoFinalPagoMovil: parseFloat(datosResolucion.montoFinalPagoMovil) || 0,
          observacionesCierre: datosResolucion.observacionesCierre || '',
          imagenCierre: datosResolucion.imagenCierre || null
        }
      });

      console.log('✅ Caja pendiente resuelta exitosamente:', data);

      // Crear información del cierre para el estado local
      const cierreInfo = {
        id: data.id,
        tipo: 'cierre_pendiente_resuelto',
        fecha_hora: data.updatedAt,
        usuario_cierre: data.usuarioCierre?.nombre || 'Usuario',
        hora_apertura: data.horaApertura,
        hora_cierre: data.horaCierre,
        fecha_apertura: new Date(data.fecha).toLocaleDateString('es-VE'),
        fecha_cierre: new Date().toLocaleDateString('es-VE'),
        total_ingresos_bs: parseFloat(data.totalIngresosBs) || 0,
        total_egresos_bs: parseFloat(data.totalEgresosBs) || 0,
        total_ingresos_usd: parseFloat(data.totalIngresosUsd) || 0,
        total_egresos_usd: parseFloat(data.totalEgresosUsd) || 0,
        total_pago_movil: parseFloat(data.totalPagoMovil) || 0,
        monto_inicial_bs: parseFloat(data.montoInicialBs),
        monto_inicial_usd: parseFloat(data.montoInicialUsd),
        monto_inicial_pago_movil: parseFloat(data.montoInicialPagoMovil),
        monto_final_bs: parseFloat(data.montoFinalBs) || 0,
        monto_final_usd: parseFloat(data.montoFinalUsd) || 0,
        monto_final_pago_movil: parseFloat(data.montoFinalPagoMovil) || 0,
        era_caja_pendiente: true,
        fecha_auto_cierre: data.fechaAutoCierre
      };

      set({
        cajaActual: null,
        transacciones: [],
        ultimoCierre: cierreInfo,
        loading: false,
        error: null
      });

      console.log('✅ Estado local actualizado - Caja pendiente resuelta');
      return cierreInfo;

    } catch (error) {
      console.error('❌ Error resolviendo caja pendiente:', error);
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // 🕚 FORZAR AUTO-CIERRE (SOLO ADMIN)
  forzarAutoCierre: async () => {
    set({ loading: true, error: null });
    
    try {
      console.log('🕚 Forzando auto-cierre...');

      const data = await apiRequest('/cajas/forzar-auto-cierre', {
        method: 'POST'
      });

      console.log('✅ Auto-cierre forzado exitoso:', data);

      toast.success('🕚 Auto-cierre ejecutado correctamente');
      
      return {
        success: true,
        resultados: data.resultados || [],
        message: data.message
      };

    } catch (error) {
      console.error('❌ Error forzando auto-cierre:', error);
      set({ loading: false, error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // 🔍 VERIFICAR SI HAY CAJAS PENDIENTES
  verificarCajasPendientes: async () => {
    try {
      const resultado = await get().obtenerCajasPendientes();
      
      return {
        hayCajasPendientes: resultado.total > 0,
        cajasPendientes: resultado.cajasPendientes,
        total: resultado.total
      };
      
    } catch (error) {
      console.error('❌ Error verificando cajas pendientes:', error);
      return {
        hayCajasPendientes: false,
        cajasPendientes: [],
        total: 0
      };
    }
  },

  // 🧹 LIMPIAR ESTADO DE CAJA PENDIENTE
  limpiarEstadoCajaPendiente: () => {
    // Esta función se llamará desde authStore después de resolver
    console.log('🧹 Limpiando estado de caja pendiente...');
    
    // Nota: No limpiar cajaActual aquí, eso se maneja en resolverCajaPendiente
    // Solo notificar que el estado pendiente se limpió
    
    return true;
  }
}));

// 🆕 Variable global para emitir eventos
let globalEmitirEvento = null;

// 🆕 Función para conectar el socket
export const conectarSocketAlStore = (emitirEvento) => {
  if (globalEmitirEvento === emitirEvento) {
    console.log('🔌 Socket ya conectado al cajaStore - omitiendo');
    return;
  }
  globalEmitirEvento = emitirEvento;
  console.log('🔌 Socket conectado al cajaStore');
};

// 🆕 Función auxiliar para emitir eventos
const emitirEventoSocket = (evento, data) => {
  if (globalEmitirEvento) {
    console.log('📡 Emitiendo evento:', evento, data);
    globalEmitirEvento(evento, data);
  } else {
    console.log('⚠️ Socket no conectado, no se puede emitir:', evento);
  }
};

export { useCajaStore };
