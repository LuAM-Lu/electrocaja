// hooks/useDescuentoRequests.js - Hook para manejar solicitudes de descuento pendientes
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../config/api';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import React from 'react';

export const useDescuentoRequests = () => {
  const { usuario, socket } = useAuthStore();
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar solicitudes pendientes al montar (solo para admins)
  useEffect(() => {
    if (usuario?.rol === 'admin') {
      cargarSolicitudesPendientes();
    }
  }, [usuario?.rol]);

  // Escuchar eventos de Socket.IO para nuevas solicitudes
  useEffect(() => {
    if (!socket || usuario?.rol !== 'admin') return;

    const handleNuevaSolicitud = (data) => {
      console.log('Nueva solicitud de descuento recibida:', data);
      setSolicitudesPendientes(prev => {
        // Evitar duplicados
        const existe = prev.some(s => s.id === data.solicitud.id);
        if (existe) return prev;
        return [data.solicitud, ...prev];
      });
      
      // Mostrar notificación visual
      toast.success(
        `Nueva solicitud de descuento de ${data.usuario?.nombre || 'Usuario'}`,
        {
          duration: 5000,
          icon: React.createElement(Bell, { className: "h-5 w-5 text-blue-500" }),
          position: 'top-right'
        }
      );
    };

    const handleSolicitudResuelta = (data) => {
      console.log('Solicitud de descuento resuelta:', data);
      setSolicitudesPendientes(prev => 
        prev.filter(s => s.id !== data.solicitudId)
      );
    };

    socket.on('nueva_solicitud_descuento', handleNuevaSolicitud);
    socket.on('solicitud_descuento_resuelta', handleSolicitudResuelta);

    return () => {
      socket.off('nueva_solicitud_descuento', handleNuevaSolicitud);
      socket.off('solicitud_descuento_resuelta', handleSolicitudResuelta);
    };
  }, [socket, usuario?.rol]);

  const cargarSolicitudesPendientes = async () => {
    if (usuario?.rol !== 'admin') return;
    
    setLoading(true);
    try {
      const response = await api.get('/discount-requests/pendientes');
      if (response.data.success) {
        setSolicitudesPendientes(response.data.data || []);
      }
    } catch (error) {
      console.error('Error cargando solicitudes pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    solicitudesPendientes,
    loading,
    cargarSolicitudesPendientes
  };
};

