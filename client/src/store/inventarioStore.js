// store/inventarioStore.js (100% BACKEND - SIN LOCALSTORAGE)
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api, apiWithRetry, testConnection } from '../config/api.js';
import toast from 'react-hot-toast';

// ===================================
// 🏪 STORE PRINCIPAL (SIN PERSIST)
// ===================================
const useInventarioStore = create()(
  devtools(
    (set, get) => ({
      // Estado inicial
      inventario: [],
      loading: false,
      error: null,
      conectado: false,

      // ===================================
      // 🔌 VERIFICAR CONEXIÓN
      // ===================================
      verificarConexion: async () => {
        try {
          const result = await testConnection();
          set({ conectado: result.success });
          
          if (!result.success) {
            toast.error('❌ Sin conexión al servidor', {
              duration: 4000,
              position: 'top-right'
            });
          }
          
          return result.success;
        } catch (error) {
          set({ conectado: false });
          toast.error('❌ Error de conexión al servidor', {
            duration: 4000,
            position: 'top-right'
          });
          return false;
        }
      },

      // ===================================
      // 📊 OBTENER INVENTARIO
      // ===================================
      obtenerInventario: async () => {
        const conectado = await get().verificarConexion();
        if (!conectado) return;

        set({ loading: true, error: null });
        
        try {
          console.log('🌐 Obteniendo inventario desde API');
          const response = await apiWithRetry(() => api.get('/inventory/products?limit=1000'));
          
          if (response.data.success) {
           // Convertir formato backend a frontend
              const productosAPI = response.data.data.map(item => ({
                id: item.id,
                descripcion: item.descripcion,
                precio: parseFloat(item.precioVenta || item.precio_venta || item.precio || 0),
                stock: item.tipo?.toUpperCase() === 'SERVICIO' ? null : (item.stock || 0),
                observaciones: item.observaciones || '',
                tipo: (item.tipo || 'producto').toLowerCase(),
                fecha_creacion: item.fechaCreacion || item.fecha_creacion,
                codigo_barras: item.codigoBarras || item.codigo_barras || '',
                codigo_interno: item.codigoInterno || item.codigo_interno || '',
                categoria: item.categoria || 'General',
                precio_costo: parseFloat(item.precioCosto || item.precio_costo || 0),
                precio_venta: parseFloat(item.precioVenta || item.precio_venta || item.precio || 0),
                margen_porcentaje: parseFloat(item.margenPorcentaje || item.margen_porcentaje || 0),
                stock_minimo: parseInt(item.stockMinimo || item.stock_minimo || 5),
                stock_maximo: parseInt(item.stockMaximo || item.stock_maximo || 100),
                ubicacion_fisica: item.ubicacionFisica || item.ubicacion_fisica || '',
                imagen_url: item.imagenUrl || item.imagen_url || '',
                proveedor: item.proveedor || '',
                telefono_proveedor: item.telefonoProveedor || item.telefono_proveedor || '',
                proveedor_factura_iva: item.proveedorFacturaIva !== undefined ? item.proveedorFacturaIva : true, // 🆕 NUEVO CAMPO
                activo: item.activo !== undefined ? item.activo : true
              }));
                          
            set({ 
              inventario: productosAPI, 
              loading: false,
              conectado: true 
            });
            
            console.log(`✅ ${productosAPI.length} productos cargados desde API`);
          }
        } catch (error) {
          console.error('❌ Error al obtener inventario:', error);
          set({ 
            loading: false, 
            error: error.message,
            conectado: false 
          });
          
          toast.error(`❌ Error al cargar inventario: ${error.message}`, {
            duration: 5000,
            position: 'top-right'
          });
        }
      },

      // ===================================
      // ➕ AGREGAR ITEM
      // ===================================
      agregarItem: async (itemData) => {
        const conectado = await get().verificarConexion();
        if (!conectado) return null;

        set({ loading: true, error: null });
        
        try {
          const backendData = {
            descripcion: itemData.descripcion,
            tipo: (itemData.tipo || 'PRODUCTO').toUpperCase(),
            codigoBarras: itemData.codigoBarras || itemData.codigo_barras || '',
            codigoInterno: itemData.codigoInterno || itemData.codigo_interno || '',
            categoria: itemData.categoria || 'General',
            precioCosto: parseFloat(itemData.precioCosto || itemData.precio_costo || 0),
            precioVenta: parseFloat(itemData.precioVenta || itemData.precio_venta || itemData.precio || 0),
            margenPorcentaje: parseFloat(itemData.margenPorcentaje || itemData.margen_porcentaje || 30),
            stock: itemData.tipo?.toLowerCase() === 'servicio' ? null : parseInt(itemData.stock || 0),
            stockMinimo: parseInt(itemData.stockMinimo || itemData.stock_minimo || 5),
            stockMaximo: parseInt(itemData.stockMaximo || itemData.stock_maximo || 100),
            ubicacionFisica: itemData.ubicacionFisica || itemData.ubicacion_fisica || '',
            imagenUrl: itemData.imagenUrl || itemData.imagen_url || '',
            proveedor: itemData.proveedor || 'SIN PROVEEDOR',
            telefonoProveedor: itemData.telefonoProveedor || itemData.telefono_proveedor || '',
            proveedorFacturaIva: itemData.proveedorFacturaIva !== undefined ? itemData.proveedorFacturaIva : (itemData.proveedor_factura_iva !== false),
            observaciones: itemData.observaciones || ''
          };

          console.log('📤 Enviando nuevo producto:', backendData);
          const response = await apiWithRetry(() => api.post('/inventory/products', backendData));
          
          if (response.data.success) {
            // Recargar inventario completo
            await get().obtenerInventario();
            set({ loading: false });
            
            toast.success(`✅ ${itemData.descripcion} agregado exitosamente`, {
              duration: 3000,
              position: 'top-right'
            });
            
            return response.data.data;
          }
        } catch (error) {
          console.error('❌ Error al agregar item:', error);
          set({ loading: false, error: error.message });
          
          toast.error(`❌ Error al agregar producto: ${error.response?.data?.message || error.message}`, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

      // ===================================
      // ✏️ ACTUALIZAR ITEM
      // ===================================
      actualizarItem: async (id, itemData) => {
        const conectado = await get().verificarConexion();
        if (!conectado) return null;

        set({ loading: true, error: null });
        
        try {
          // Preparar datos para backend
        const backendData = {
          descripcion: itemData.descripcion,
          categoria: itemData.categoria,
          precioCosto: parseFloat(itemData.precio_costo || 0),
          precioVenta: parseFloat(itemData.precio_venta || itemData.precio || 0),
          margenPorcentaje: parseFloat(itemData.margen_porcentaje || 30),
          stock: itemData.stock !== undefined ? parseInt(itemData.stock) : undefined,
          stockMinimo: parseInt(itemData.stock_minimo || 5),
          stockMaximo: parseInt(itemData.stock_maximo || 100),
          ubicacionFisica: itemData.ubicacion_fisica || '',
          imagenUrl: itemData.imagen_url || '',
          proveedor: itemData.proveedor || '',
          telefonoProveedor: itemData.telefono_proveedor || '',
          proveedorFacturaIva: itemData.proveedor_factura_iva !== false, // 🆕 NUEVO CAMPO
          observaciones: itemData.observaciones || ''
        };

          console.log(`📤 Actualizando producto ID ${id}:`, backendData);
          const response = await apiWithRetry(() => api.put(`/inventory/products/${id}`, backendData));
          
          if (response.data.success) {
            // Actualizar en estado local
            set(state => ({
              inventario: state.inventario.map(item => 
                item.id === id ? { ...item, ...response.data.data } : item
              ),
              loading: false
            }));
            
            toast.success(`✅ Producto actualizado exitosamente`, {
              duration: 3000,
              position: 'top-right'
            });
            
            return response.data.data;
          }
        } catch (error) {
          console.error('❌ Error al actualizar item:', error);
          set({ loading: false, error: error.message });
          
          toast.error(`❌ Error al actualizar producto: ${error.response?.data?.message || error.message}`, {
            duration: 5000,
            position: 'top-right'
          });
          throw error;
        }
      },

eliminarItem: async (id, options = {}) => {
  const conectado = await get().verificarConexion();
  if (!conectado) return false;

  set({ loading: true, error: null });
  
  try {
    const { motivo = 'ELIMINACION_MANUAL' } = options;
    
    console.log(`🗑️ Eliminando producto ID ${id} - Motivo: ${motivo}`);
    
    const response = await apiWithRetry(() => 
      api.delete(`/inventory/products/${id}`, {
        data: { motivo }  // Enviar motivo en el body
      })
    );
    
    if (response.data.success) {
      // Marcar como inactivo en lugar de eliminar del estado
      set(state => ({
        inventario: state.inventario.map(item => 
          item.id === id 
            ? { 
                ...item, 
                activo: false, 
                motivoInactivacion: motivo,
                fechaInactivacion: new Date().toISOString()
              }
            : item
        ),
        loading: false
      }));
      
      toast.success(`✅ Producto eliminado exitosamente`);
      
      return true;
    }
  } catch (error) {
    console.error('❌ Error al eliminar item:', error);
    set({ loading: false, error: error.message });
    
    toast.error(`❌ Error al eliminar producto: ${error.response?.data?.message || error.message}`);
    throw error;
  }
},

      // ===================================
      // 📉 REDUCIR STOCK
      // ===================================
      reducirStock: async (id, cantidad) => {
        const { inventario } = get();
        const item = inventario.find(i => i.id === id);
        
        if (!item) {
          toast.error('❌ Producto no encontrado');
          throw new Error('Item no encontrado');
        }

        if (item.tipo === 'servicio') {
          return item; // Los servicios no tienen stock
        }

        if (item.stock === null || item.stock < cantidad) {
          toast.error(`❌ Stock insuficiente. Disponible: ${item.stock || 0}, Solicitado: ${cantidad}`);
          throw new Error(`Stock insuficiente. Disponible: ${item.stock || 0}, Solicitado: ${cantidad}`);
        }

        const nuevoStock = item.stock - cantidad;
        return await get().actualizarStock(id, nuevoStock);
      },

      // ===================================
      // 📈 AUMENTAR STOCK
      // ===================================
      aumentarStock: async (id, cantidad) => {
        const { inventario } = get();
        const item = inventario.find(i => i.id === id);
        
        if (!item) {
          toast.error('❌ Producto no encontrado');
          throw new Error('Item no encontrado');
        }

        if (item.tipo === 'servicio') {
          toast.error('❌ Los servicios no manejan stock');
          throw new Error('Los servicios no manejan stock');
        }

        const nuevoStock = (item.stock || 0) + cantidad;
        return await get().actualizarStock(id, nuevoStock);
      },

      // ===================================
      // 🔄 ACTUALIZAR STOCK ESPECÍFICO
      // ===================================
      actualizarStock: async (id, nuevoStock) => {
        const conectado = await get().verificarConexion();
        if (!conectado) return null;

        try {
          const response = await apiWithRetry(() => 
            api.patch(`/inventory/products/${id}/stock`, { stock: nuevoStock })
          );
          
          if (response.data.success) {
            // Actualizar en estado local
            set(state => ({
              inventario: state.inventario.map(item => 
                item.id === id ? { ...item, stock: nuevoStock } : item
              )
            }));
            
            return response.data.data;
          }
        } catch (error) {
          console.error('❌ Error al actualizar stock:', error);
          toast.error(`❌ Error al actualizar stock: ${error.message}`);
          throw error;
        }
      },

      // ===================================
      // 🔒 ACTUALIZAR STOCK RESERVADO (WEBSOCKET)
      // ===================================
      actualizarStockReservado: (productoId, nuevoStockReservado) => {
        set(state => ({
          inventario: state.inventario.map(item => 
            item.id === productoId 
              ? { ...item, stockReservado: nuevoStockReservado }
              : item
          )
        }));
        
        console.log(`📦 Stock reservado actualizado para producto ${productoId}: ${nuevoStockReservado}`);
      },

      // ===================================
      // 🔍 FUNCIONES DE BÚSQUEDA Y FILTROS
      // ===================================
      buscarItems: (termino) => {
        const { inventario } = get();
        if (!termino) return inventario;
        
        const terminoLower = termino.toLowerCase();
        return inventario.filter(item =>
          item.descripcion.toLowerCase().includes(terminoLower) ||
          item.observaciones?.toLowerCase().includes(terminoLower) ||
          item.tipo.toLowerCase().includes(terminoLower) ||
          item.categoria?.toLowerCase().includes(terminoLower) ||
          item.codigo_barras?.toLowerCase().includes(terminoLower) ||
          item.codigo_interno?.toLowerCase().includes(terminoLower)
        );
      },

      obtenerPorTipo: (tipo) => {
        const { inventario } = get();
        if (tipo === 'todos') return inventario;
        return inventario.filter(item => item.tipo === tipo);
      },

      obtenerStockBajo: (limite = 10) => {
        const { inventario } = get();
        return inventario.filter(item => {
          if (item.tipo === 'servicio') return false;
          if (item.tipo === 'electrobar') return item.stock !== null && item.stock <= 5;
          return item.stock !== null && item.stock <= limite;
        });
      },

      // ===================================
      // 📊 ESTADÍSTICAS
      // ===================================
      obtenerEstadisticas: () => {
        const { inventario } = get();
        
        const stats = {
          total: inventario.length,
          productos: inventario.filter(i => i.tipo === 'producto').length,
          servicios: inventario.filter(i => i.tipo === 'servicio').length,
          electrobar: inventario.filter(i => i.tipo === 'electrobar').length,
          stockBajo: inventario.filter(i => {
            if (i.tipo === 'servicio') return false;
            if (i.tipo === 'electrobar') return i.stock !== null && i.stock <= 5;
            return i.stock !== null && i.stock <= 10;
          }).length,
          valorTotalProductos: inventario
            .filter(i => i.tipo === 'producto')
            .reduce((total, item) => total + (item.precio * (item.stock || 0)), 0),
          valorTotalElectrobar: inventario
            .filter(i => i.tipo === 'electrobar')
            .reduce((total, item) => total + (item.precio * (item.stock || 0)), 0)
        };

        stats.valorTotal = stats.valorTotalProductos + stats.valorTotalElectrobar;
        return stats;
      },

      obtenerPopulares: () => {
        const { inventario } = get();
        return inventario
          .filter(i => i.tipo !== 'servicio')
          .sort((a, b) => (a.stock || 0) - (b.stock || 0))
          .slice(0, 5);
      },

      // ===================================
      // 🧹 UTILIDADES
      // ===================================
      limpiarError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          inventario: [],
          loading: false,
          error: null,
          conectado: false
        });
      }
    }),
    {
      name: 'inventario-store'
    }
  )
);

/*
// ===================================
// 🚀 AUTO-INICIALIZACIÓN
// ===================================
if (typeof window !== 'undefined') {
  // Cargar inventario automáticamente al inicializar
  setTimeout(async () => {
    try {
      console.log('🔄 Auto-inicializando inventario...');
      const store = useInventarioStore.getState();
      await store.obtenerInventario();
    } catch (error) {
      console.warn('⚠️ Error en auto-inicialización:', error.message);
    }
  }, 1000);

  // Funciones globales para debug
  window.inventarioAPI = {
    estado: () => {
      const state = useInventarioStore.getState();
      return {
        conectado: state.conectado,
        totalProductos: state.inventario.length,
        loading: state.loading,
        error: state.error
      };
    },
    recargar: () => useInventarioStore.getState().obtenerInventario(),
    reset: () => useInventarioStore.getState().reset()
  };
}*/

export { useInventarioStore };