// client/src/hooks/useRealtimeStock.js
//  HOOK PARA MANEJO DE STOCK EN TIEMPO REAL CON CLEANUP AUTOMÁTICO
import { createElement, useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useInventarioStore } from '../store/inventarioStore';
import { api } from '../config/api';
import toast from '../utils/toast.jsx';
import { Lock, Unlock, AlertTriangle, XCircle, Clock } from 'lucide-react';

export const useRealtimeStock = (sesionId, enabled = true) => {
  const [stockData, setStockData] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const heartbeatIntervalRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);
  const { socket, usuario } = useAuthStore();
  const { 
    actualizarStockReservado, 
    actualizarStockDisponible, 
    sincronizarStockDesdeWebSocket,
    limpiarReservasExpiradas,
    obtenerEstadisticasStock
  } = useInventarioStore();

  //  RESERVAR STOCK CON MANEJO DE ERRORES MEJORADO
  const reservarStock = useCallback(async (productoId, cantidad) => {
    if (!enabled || !sesionId) return { success: false, error: 'Sesión no válida' };

    try {
      console.log(` [useRealtimeStock] Reservando: ${productoId}, cantidad: ${cantidad}`);
      
      const response = await api.post('/ventas/stock/reservar', {
        productoId,
        cantidad,
        sesionId
      });

      if (response.data.success) {
        const data = response.data.data;
        
        // Actualizar estado local
        setStockData(prev => {
          const newMap = new Map(prev);
          newMap.set(productoId, {
            ...data,
            ultimaActualizacion: new Date().toISOString()
          });
          return newMap;
        });

        console.log(` [useRealtimeStock] Reserva exitosa:`, data);
        return { success: true, data };
      } else {
        throw new Error(response.data.message || 'Error reservando stock');
      }
    } catch (error) {
      console.error(` [useRealtimeStock] Error reservando stock:`, error);
      
      // Manejar errores específicos
      if (error.response?.status === 400) {
        const errorMessage = error.response.data.message || 'Stock insuficiente';
        toast.error(errorMessage, {
          duration: 4000,
          icon: createElement(AlertTriangle, { className: 'h-4 w-4' })
        });
        return { success: false, error: errorMessage };
      }

      toast.error('Error reservando stock', {
        icon: createElement(XCircle, { className: 'h-4 w-4' })
      });
      return { success: false, error: 'Error interno' };
    }
  }, [enabled, sesionId]);

  //  LIBERAR STOCK CON CLEANUP AUTOMÁTICO
  const liberarStock = useCallback(async (productoId, cantidad = null) => {
    if (!enabled || !sesionId) return { success: false, error: 'Sesión no válida' };

    try {
      console.log(` [useRealtimeStock] Liberando: ${productoId}, cantidad: ${cantidad}`);
      
      const response = await api.post('/ventas/stock/liberar', {
        productoId,
        cantidad,
        sesionId
      });

      if (response.data.success) {
        const data = response.data.data;
        
        // Actualizar estado local
        setStockData(prev => {
          const newMap = new Map(prev);
          if (newMap.has(productoId)) {
            const current = newMap.get(productoId);
            newMap.set(productoId, {
              ...current,
              stockDisponible: data.stockDisponible,
              stockReservado: data.stockReservado || 0,
              ultimaActualizacion: new Date().toISOString()
            });
          }
          return newMap;
        });

        console.log(` [useRealtimeStock] Liberación exitosa:`, data);
        return { success: true, data };
      } else {
        throw new Error(response.data.message || 'Error liberando stock');
      }
    } catch (error) {
      console.error(` [useRealtimeStock] Error liberando stock:`, error);
      toast.error('Error liberando stock', {
        icon: createElement(XCircle, { className: 'h-4 w-4' })
      });
      return { success: false, error: 'Error interno' };
    }
  }, [enabled, sesionId]);

  //  LIBERAR TODAS LAS RESERVAS DE LA SESIÓN
  const liberarTodasLasReservas = useCallback(async () => {
    if (!enabled || !sesionId) return { success: false, error: 'Sesión no válida' };

    try {
      console.log(` [useRealtimeStock] Liberación masiva para sesión: ${sesionId}`);
      
      const response = await api.post('/ventas/stock/liberar', {
        sesionId
      });

      if (response.data.success) {
        const data = response.data.data;
        
        // Limpiar estado local
        setStockData(new Map());
        
        console.log(` [useRealtimeStock] Liberación masiva exitosa:`, data);
        return { success: true, data };
      } else {
        throw new Error(response.data.message || 'Error en liberación masiva');
      }
    } catch (error) {
      console.error(` [useRealtimeStock] Error en liberación masiva:`, error);
      toast.error('Error liberando reservas', {
        icon: createElement(XCircle, { className: 'h-4 w-4' })
      });
      return { success: false, error: 'Error interno' };
    }
  }, [enabled, sesionId]);

  //  OBTENER STOCK DISPONIBLE CON CACHE LOCAL
  const obtenerStockDisponible = useCallback(async (productoId, forceRefresh = false) => {
    if (!enabled) return null;

    // Verificar cache local primero
    if (!forceRefresh && stockData.has(productoId)) {
      const cached = stockData.get(productoId);
      const ahora = new Date();
      const ultimaActualizacion = new Date(cached.ultimaActualizacion);
      const diferenciaMinutos = (ahora - ultimaActualizacion) / (1000 * 60);
      
      // Cache válido por 30 segundos
      if (diferenciaMinutos < 0.5) {
        console.log(` [useRealtimeStock] Usando cache para producto ${productoId}`);
        return cached;
      }
    }

    try {
      console.log(` [useRealtimeStock] Consultando stock: ${productoId}`);
      
      const response = await api.get(`/ventas/stock/disponible/${productoId}`, {
        params: { sesionId }
      });

      if (response.data.success) {
        const data = response.data.data;
        
        // Actualizar cache local
        setStockData(prev => {
          const newMap = new Map(prev);
          newMap.set(productoId, {
            ...data.stock,
            producto: data.producto,
            reservasActivas: data.reservasActivas,
            ultimaActualizacion: new Date().toISOString()
          });
          return newMap;
        });

        console.log(` [useRealtimeStock] Stock consultado:`, data);
        return data;
      } else {
        throw new Error(response.data.message || 'Error consultando stock');
      }
    } catch (error) {
      console.error(` [useRealtimeStock] Error consultando stock:`, error);
      return null;
    }
  }, [enabled, sesionId, stockData]);

  //  HEARTBEAT AUTOMÁTICO PARA MANTENER RESERVAS VIVAS
  const enviarHeartbeat = useCallback(async () => {
    if (!enabled || !sesionId || stockData.size === 0) return;

    try {
      console.log(` [useRealtimeStock] Enviando heartbeat para sesión: ${sesionId}`);
      
      const response = await api.post('/ventas/stock/heartbeat', {
        sesionId
      });

      if (response.data.success) {
        setLastHeartbeat(new Date().toISOString());
        console.log(` [useRealtimeStock] Heartbeat exitoso:`, response.data.data);
      }
    } catch (error) {
      console.error(` [useRealtimeStock] Error en heartbeat:`, error);
      // No mostrar toast para errores de heartbeat para evitar spam
    }
  }, [enabled, sesionId, stockData.size]);

  //  CONFIGURAR LISTENERS DE WEBSOCKET
  useEffect(() => {
    if (!socket || !enabled) return;

    console.log(' [useRealtimeStock] Configurando listeners WebSocket');

    const handleStockReservado = (data) => {
      console.log(' [useRealtimeStock] Stock reservado recibido:', data);
      
      // Actualizar estado local
      setStockData(prev => {
        const newMap = new Map(prev);
        newMap.set(data.productoId, {
          stockTotal: data.stockTotal,
          stockReservado: data.stockReservado,
          stockDisponible: data.stockDisponible,
          ultimaActualizacion: new Date().toISOString()
        });
        return newMap;
      });

      // Actualizar store global usando nueva función
      if (sincronizarStockDesdeWebSocket) {
        sincronizarStockDesdeWebSocket({
          productoId: data.productoId,
          stockTotal: data.stockTotal,
          stockReservado: data.stockReservado,
          stockDisponible: data.stockDisponible,
          operacion: 'RESERVA'
        });
      }

      // Mostrar notificación solo para otros usuarios
      if (data.usuario !== usuario?.nombre) {
        toast(
          `${data.nombre || data.usuario} reservó ${data.producto}. Disponible: ${data.stockDisponible}`,
          {
            duration: 3000,
            icon: createElement(Lock, { className: 'h-4 w-4' }),
            id: `reserva-${data.productoId}-${data.usuario || data.nombre}`
          }
        );
      }
    };

    const handleStockLiberado = (data) => {
      console.log(' [useRealtimeStock] Stock liberado recibido:', data);
      
      // Actualizar estado local
      setStockData(prev => {
        const newMap = new Map(prev);
        if (newMap.has(data.productoId)) {
          const current = newMap.get(data.productoId);
          newMap.set(data.productoId, {
            ...current,
            stockDisponible: data.stockDisponible,
            stockReservado: data.stockReservado || 0,
            ultimaActualizacion: new Date().toISOString()
          });
        }
        return newMap;
      });

      // Actualizar store global usando nueva función
      if (sincronizarStockDesdeWebSocket) {
        sincronizarStockDesdeWebSocket({
          productoId: data.productoId,
          stockTotal: data.stockTotal,
          stockReservado: data.stockReservado || 0,
          stockDisponible: data.stockDisponible,
          operacion: 'LIBERACION'
        });
      }

      // Mostrar notificación solo para otros usuarios
      if (data.usuario !== usuario?.nombre) {
        toast(
          `${data.nombre || data.usuario} liberó ${data.producto}. Disponible: ${data.stockDisponible}`,
          {
            duration: 3000,
            icon: createElement(Unlock, { className: 'h-4 w-4' }),
            id: `liberacion-${data.productoId}-${data.usuario || data.nombre}`
          }
        );
      }
    };

    const handleInventarioActualizado = (data) => {
      console.log(' [useRealtimeStock] Inventario actualizado:', data);
      
      // Limpiar cache local para forzar refresh
      setStockData(new Map());
      
      // Actualizar store global
      if (sincronizarStockDesdeWebSocket) {
        // Refrescar inventario completo
        useInventarioStore.getState().obtenerInventario().catch(err => 
          console.error('Error actualizando inventario:', err)
        );
      }
    };

    const handleReservasExpiradasLimpiadas = (data) => {
      console.log(' [useRealtimeStock] Reservas expiradas limpiadas:', data);
      
      // Limpiar cache local
      setStockData(new Map());
      
      // Actualizar store global
      if (limpiarReservasExpiradas && data.productosAfectados) {
        limpiarReservasExpiradas(data.productosAfectados);
      }
      
      // Mostrar notificación informativa
      if (data.reservasLimpiadas > 0) {
        toast(`${data.reservasLimpiadas} reservas expiradas liberadas`, {
          duration: 4000,
          icon: createElement(Clock, { className: 'h-4 w-4' })
        });
      }
    };

    const handleConnect = () => {
      console.log(' [useRealtimeStock] Socket conectado');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log(' [useRealtimeStock] Socket desconectado');
      setIsConnected(false);
    };

    // Registrar listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('stock_reservado', handleStockReservado);
    socket.on('stock_liberado', handleStockLiberado);
    socket.on('inventario_actualizado', handleInventarioActualizado);
    socket.on('reservas_expiradas_limpiadas', handleReservasExpiradasLimpiadas);

    // Cleanup
    return () => {
      console.log(' [useRealtimeStock] Limpiando listeners WebSocket');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('stock_reservado', handleStockReservado);
      socket.off('stock_liberado', handleStockLiberado);
      socket.off('inventario_actualizado', handleInventarioActualizado);
      socket.off('reservas_expiradas_limpiadas', handleReservasExpiradasLimpiadas);
    };
  }, [socket, enabled, usuario?.nombre, sincronizarStockDesdeWebSocket, limpiarReservasExpiradas]);

  //  CONFIGURAR HEARTBEAT AUTOMÁTICO
  useEffect(() => {
    if (!enabled || !sesionId) return;

    console.log(' [useRealtimeStock] Configurando heartbeat automático');

    // Limpiar intervalo anterior
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Configurar nuevo intervalo (cada 2 minutos)
    heartbeatIntervalRef.current = setInterval(() => {
      enviarHeartbeat();
    }, 2 * 60 * 1000);

    // Enviar heartbeat inicial
    enviarHeartbeat();

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [enabled, sesionId, enviarHeartbeat]);

  //  CLEANUP AUTOMÁTICO AL DESMONTAR COMPONENTE
  useEffect(() => {
    return () => {
      console.log(' [useRealtimeStock] Cleanup automático al desmontar');
      
      // Limpiar intervalos
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      // Liberar todas las reservas de la sesión
      if (enabled && sesionId && stockData.size > 0) {
        console.log(' [useRealtimeStock] Liberando reservas automáticamente');
        
        // Usar timeout para evitar bloqueo
        cleanupTimeoutRef.current = setTimeout(async () => {
          try {
            await api.post('/ventas/stock/liberar', { sesionId });
            console.log(' [useRealtimeStock] Reservas liberadas automáticamente');
          } catch (error) {
            console.error(' [useRealtimeStock] Error en cleanup automático:', error);
          }
        }, 100);
      }
    };
  }, [enabled, sesionId, stockData.size]);

  //  FUNCIÓN PARA OBTENER DATOS DE STOCK DESDE CACHE
  const getStockData = useCallback((productoId) => {
    return stockData.get(productoId) || null;
  }, [stockData]);

  //  FUNCIÓN PARA OBTENER ESTADÍSTICAS
  const getEstadisticas = useCallback(() => {
    const productos = Array.from(stockData.values());
    return {
      totalProductos: productos.length,
      productosConReservas: productos.filter(p => p.stockReservado > 0).length,
      stockTotalReservado: productos.reduce((sum, p) => sum + (p.stockReservado || 0), 0),
      ultimaActualizacion: productos.length > 0 ? 
        Math.max(...productos.map(p => new Date(p.ultimaActualizacion).getTime())) : null
    };
  }, [stockData]);

  return {
    // Estado
    stockData,
    isConnected,
    lastHeartbeat,
    
    // Funciones principales
    reservarStock,
    liberarStock,
    liberarTodasLasReservas,
    obtenerStockDisponible,
    
    // Utilidades
    getStockData,
    getEstadisticas,
    enviarHeartbeat
  };
};
