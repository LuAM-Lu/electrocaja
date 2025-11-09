// components/servicios/ModalVerServicio.jsx - VERSIÓN OPTIMIZADA CON MEJORAS ESPECÍFICAS
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Flag, Inbox, Stethoscope, Clock, Wrench, CheckCircle, PackageCheck,
  User, CalendarDays, DollarSign, StickyNote, ShoppingCart, AlertTriangle,
  Printer, MessageCircle, Camera, Truck, Phone, Mail, MapPin, Zap, CreditCard, Mic,
  Banknote, Smartphone, Building2, Coins
} from 'lucide-react';
import toast from '../../utils/toast.jsx';
import PagoRetiroModal from './PagoRetiroModal';
import HistorialPagosPanel from './HistorialPagosPanel';
import { useAuthStore } from '../../store/authStore';
import { useServiciosStore } from '../../store/serviciosStore';

const estadoConfig = {
  'Recibido': { color: 'bg-gradient-to-r from-purple-400 to-purple-600', headerColor: 'bg-gradient-to-r from-purple-800 to-purple-900', textColor: 'text-gray-100', icon: <Inbox size={14} />, progreso: 20 },
  'En Diagnóstico': { color: 'bg-gradient-to-r from-amber-700 to-yellow-800', headerColor: 'bg-gradient-to-r from-amber-800 to-yellow-900', textColor: 'text-amber-100', icon: <Stethoscope size={14} />, progreso: 40 },
  'Esperando Aprobación': { color: 'bg-gradient-to-r from-orange-700 to-red-800', headerColor: 'bg-gradient-to-r from-orange-800 to-red-900', textColor: 'text-orange-100', icon: <Clock size={14} />, progreso: 60 },
  'En Reparación': { color: 'bg-gradient-to-r from-red-800 to-red-900', headerColor: 'bg-gradient-to-r from-red-900 to-red-950', textColor: 'text-red-100', icon: <Wrench size={14} />, progreso: 80 },
  'Listo para Retiro': { color: 'bg-gradient-to-r from-emerald-700 to-green-800', headerColor: 'bg-gradient-to-r from-emerald-800 to-green-900', textColor: 'text-emerald-100', icon: <CheckCircle size={14} />, progreso: 100 },
  'Entregado': { color: 'bg-gradient-to-r from-gray-800 to-gray-900', headerColor: 'bg-gradient-to-r from-gray-900 to-slate-900', textColor: 'text-gray-200', icon: <PackageCheck size={14} />, progreso: 100 }
};

// Utilidades
const formatearFecha = (fecha) => {
  if (!fecha) return '—';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const calcularDiasTranscurridos = (fechaIngreso) => {
  if (!fechaIngreso) return 0;
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  if (isNaN(ingreso.getTime())) return 0;
  
  // Normalizar ambas fechas a medianoche para calcular días completos
  const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const ingresoNormalizado = new Date(ingreso.getFullYear(), ingreso.getMonth(), ingreso.getDate());
  
  const diff = Math.floor((hoyNormalizado - ingresoNormalizado) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
};

export default function ModalVerServicio({ servicio, onClose, actualizarEstado }) {
  if (!servicio) return null;

  const { socket } = useAuthStore();
  const { obtenerServicio } = useServiciosStore();
  
  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('');
  const [tooltipAbierto, setTooltipAbierto] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [servicioLocal, setServicioLocal] = useState(servicio);
  const tooltipButtonRef = useRef(null);
  
  // ✅ Usar refs para mantener referencias estables y evitar loops infinitos
  const servicioIdRef = useRef(servicio?.id);
  const actualizarEstadoRef = useRef(actualizarEstado);
  const obtenerServicioRef = useRef(obtenerServicio);
  const actualizandoRef = useRef(false); // ✅ Bandera para evitar actualizaciones simultáneas
  
  // Actualizar refs cuando cambian (sin causar re-renders)
  useEffect(() => {
    servicioIdRef.current = servicio?.id;
  }, [servicio?.id]);
  
  useEffect(() => {
    actualizarEstadoRef.current = actualizarEstado;
  }, [actualizarEstado]);
  
  useEffect(() => {
    obtenerServicioRef.current = obtenerServicio;
  }, [obtenerServicio]);

  // ✅ Actualizar servicio local cuando cambia el prop (solo si es diferente y no estamos actualizando)
  useEffect(() => {
    // Solo actualizar si no estamos en medio de una actualización y el ID es diferente
    if (servicio && servicio.id !== servicioIdRef.current && !actualizandoRef.current) {
      setServicioLocal(servicio);
      servicioIdRef.current = servicio.id;
    }
  }, [servicio?.id]); // ✅ Solo depender del ID del prop para evitar loops

  // ✅ ESCUCHAR EVENTOS DE SOCKET.IO PARA ACTUALIZAR NOTAS EN TIEMPO REAL
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function' || !servicioIdRef.current) return;

    console.log('ModalVerServicio: Configurando listeners de socket para servicio', servicioIdRef.current);

    const handleNotaAgregada = async (data) => {
      console.log('ModalVerServicio: Nueva nota recibida', data);
      
      // ✅ Evitar procesamiento simultáneo
      if (actualizandoRef.current) {
        console.log('ModalVerServicio: Ya hay una actualización en curso, ignorando...');
        return;
      }
      
      // Solo actualizar si la nota es para este servicio
      if (data.servicioId === servicioIdRef.current) {
        console.log('ModalVerServicio: Nota corresponde a este servicio, actualizando...');
        
        // ✅ Marcar como actualizando
        actualizandoRef.current = true;
        
        try {
          // Recargar servicio completo desde el backend para obtener todas las notas actualizadas
          const servicioActualizado = await obtenerServicioRef.current(servicioIdRef.current);
          if (servicioActualizado) {
            setServicioLocal(servicioActualizado);
            // También actualizar el prop si hay callback (pero sin causar re-render del padre inmediatamente)
            if (typeof actualizarEstadoRef.current === 'function') {
              // Usar setTimeout para evitar actualizaciones en cascada
              setTimeout(() => {
                actualizarEstadoRef.current(servicioIdRef.current, servicioActualizado);
              }, 100);
            }
            toast.success('Nota actualizada en tiempo real', { duration: 2000 });
          }
        } catch (error) {
          console.error('Error recargando servicio:', error);
        } finally {
          // ✅ Liberar la bandera después de un pequeño delay para evitar actualizaciones rápidas
          setTimeout(() => {
            actualizandoRef.current = false;
          }, 500);
        }
      }
    };

    // Registrar listener
    socket.on('nota_servicio_agregada', handleNotaAgregada);

    // Cleanup
    return () => {
      socket.off('nota_servicio_agregada', handleNotaAgregada);
      console.log('ModalVerServicio: Listeners removidos');
      actualizandoRef.current = false; // Limpiar bandera al desmontar
    };
  }, [socket]); // ✅ Solo depender de socket para evitar loops infinitos

  // Usar servicioLocal en lugar de servicio para el resto del componente
  const servicioActual = servicioLocal || servicio;

  // Variables calculadas
  // 🔧 Extraer nombre del técnico (puede ser objeto o string)
  const tecnicoAsignado = (() => {
    // Si ya es un string, usarlo directamente
    if (typeof servicioActual.tecnicoAsignado === 'string') {
      return servicioActual.tecnicoAsignado;
    }
    
    // Si tecnico es un objeto, extraer el nombre
    if (servicioActual.tecnico && typeof servicioActual.tecnico === 'object') {
      return servicioActual.tecnico.nombre || servicioActual.tecnico.email || 'Sin asignar';
    }
    
    // Si tecnico es un string, usarlo
    if (typeof servicioActual.tecnico === 'string') {
      return servicioActual.tecnico;
    }
    
    // Fallback
    return 'Sin asignar';
  })();
  
  // 🔧 Extraer nombre del cliente (puede ser objeto o string)
  const clienteNombre = servicioActual.clienteNombre || 
    (typeof servicioActual.cliente === 'object' && servicioActual.cliente?.nombre) || 
    servicioActual.cliente || 
    'Sin nombre';
  
  // 🔧 Extraer datos del dispositivo
  const dispositivoTexto = servicioActual.dispositivo ||
    (servicioActual.dispositivoMarca && servicioActual.dispositivoModelo
      ? `${servicioActual.dispositivoMarca} ${servicioActual.dispositivoModelo}`.trim()
      : servicioActual.dispositivoMarca || servicioActual.dispositivoModelo || '—');
  
  // 🔧 Extraer datos del cliente
  const clienteTelefono = servicioActual.clienteTelefono ||
    (typeof servicioActual.cliente === 'object' && servicioActual.cliente?.telefono) ||
    servicioActual.telefono ||
    '';
  
  const clienteEmail = servicioActual.clienteEmail ||
    (typeof servicioActual.cliente === 'object' && servicioActual.cliente?.email) ||
    servicioActual.email ||
    '';
  
  const clienteDireccion = servicioActual.clienteDireccion ||
    (typeof servicioActual.cliente === 'object' && servicioActual.cliente?.direccion) ||
    servicioActual.direccion ||
    '';
  
  // 🔧 Extraer fecha de entrega
  const fechaEntrega = servicioActual.fechaEntrega || servicioActual.fechaEntregaEstimada || servicioActual.fechaEntregaReal;
  
  // 🔧 Función para normalizar estado del backend al formato del frontend
  const normalizarEstado = (estadoBackend) => {
    if (!estadoBackend) return 'Recibido';
    
    // Mapeo directo de estados del backend a frontend
    const mapaEstados = {
      'RECIBIDO': 'Recibido',
      'EN_DIAGNOSTICO': 'En Diagnóstico',
      'ESPERANDO_APROBACION': 'Esperando Aprobación',
      'EN_REPARACION': 'En Reparación',
      'LISTO_RETIRO': 'Listo para Retiro',
      'ENTREGADO': 'Entregado',
      'CANCELADO': 'Cancelado'
    };
    
    // Si está en el mapa, usar el valor mapeado
    if (mapaEstados[estadoBackend]) {
      return mapaEstados[estadoBackend];
    }
    
    // Si ya está en formato frontend, devolverlo tal cual
    if (Object.keys(estadoConfig).includes(estadoBackend)) {
      return estadoBackend;
    }
    
    // Si tiene guiones bajos, convertir a formato legible
    if (estadoBackend.includes('_')) {
      return estadoBackend.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Default
    return 'Recibido';
  };
  
  // Normalizar estado del servicio
  const estadoNormalizado = normalizarEstado(servicioActual.estado);
  
  const diasTranscurridos = calcularDiasTranscurridos(servicioActual.fechaIngreso);
  const estaVencido = diasTranscurridos > 5 && (estadoNormalizado === 'Recibido' || estadoNormalizado === 'En Diagnóstico');
  
  // Obtener configuración del estado (con fallback seguro)
  const estado = estadoConfig[estadoNormalizado] || estadoConfig['Recibido'];
  
  // Asegurar que el progreso esté definido
  const progreso = estado?.progreso ?? 20;
  
  // 🔧 Calcular totales desde items (API) o productos (legacy)
  const items = servicioActual.items || servicioActual.productos || [];
  const totalGeneral = items.reduce((acc, item) => {
    const precio = Number((item.precioUnitario || item.precio_unitario || item.precio) ?? 0);
    const cantidad = Number(item.cantidad ?? 0);
    return acc + (precio * cantidad);
  }, 0) || parseFloat(servicioActual.totalEstimado || 0);

  // Calcular saldo pendiente
  const totalPagadoCalculado = (servicioActual.pagos || []).reduce((acc, pago) => {
    return acc + (Number(pago.monto) || 0);
  }, 0);
  const totalPagado = parseFloat(servicioActual.totalPagado || totalPagadoCalculado);
  const saldoPendiente = parseFloat(servicioActual.saldoPendiente || (totalGeneral - totalPagado));
  const tieneSaldoPendiente = saldoPendiente > 0;
  
  // 🔧 Extraer notas (API usa 'notas', legacy usa 'notasTecnicas')
  const notas = servicioActual.notas || servicioActual.notasTecnicas || [];

  // Forzar re-render cuando cambia el estado del servicio
  useEffect(() => {
    // Este efecto asegura que el componente se actualice cuando cambia el servicio
    // especialmente cuando el estado cambia desde otro componente
  }, [servicioActual.estado, servicioActual.id]);

  // Tiempo real desde última actualización
  useEffect(() => {
    const interval = setInterval(() => {
      if (servicioActual.ultimaActualizacion) {
        const ahora = new Date();
        const ultima = new Date(servicioActual.ultimaActualizacion);
        const diff = Math.floor((ahora - ultima) / (1000 * 60));
        setTiempoTranscurrido(diff < 60 ? `${diff}m` : `${Math.floor(diff/60)}h`);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [servicioActual.ultimaActualizacion]);

  //  Cerrar tooltip al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipAbierto && !event.target.closest('.tooltip-container')) {
        setTooltipAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltipAbierto]);

  const handleEntregarDispositivo = () => {
    if (window.confirm('¿Confirmar entrega del dispositivo al cliente?')) {
      if (typeof actualizarEstado === 'function') {
        actualizarEstado(servicio.id, {
          estado: 'Entregado',
          entregadoEn: new Date().toISOString()
        });
        toast.success('Dispositivo marcado como entregado');
      }
      if (typeof onClose === 'function') onClose();
    }
  };

  const handleReimprimirOrden = () => {
    toast.success('Función de reimprimir en desarrollo');
  };

  const handleNotificarWhatsApp = () => {
    toast.success('Función de WhatsApp en desarrollo');
  };

  // Calcular posición del tooltip cuando se abre
  useEffect(() => {
    if (tooltipAbierto && tooltipButtonRef.current) {
      const rect = tooltipButtonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom
      });
    }
  }, [tooltipAbierto]);

  //  Componente de contacto con tooltip clickeable
  const ContactoTooltip = () => (
    <>
      <button 
        ref={tooltipButtonRef}
        onClick={() => setTooltipAbierto(!tooltipAbierto)}
        className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm hover:bg-blue-600/30 transition-colors"
      >
        <User size={12} />
        {clienteNombre}
        <MessageCircle size={10} />
      </button>
      
      {/*  Tooltip renderizado fuera del modal usando portal */}
      {tooltipAbierto && createPortal(
        <div 
          className="fixed z-[9999]"
          style={{
            top: `${tooltipPosition.top - 10}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl min-w-[240px] relative">
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-green-400" />
                <span className="text-gray-300">{clienteTelefono || 'No disponible'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-blue-400" />
                <span className="text-gray-300">{clienteEmail || 'No disponible'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={12} className="text-red-400 mt-0.5" />
                <span className="text-gray-300 leading-tight">{clienteDireccion || 'No disponible'}</span>
              </div>
              
              {/* Acciones rápidas en el tooltip */}
              <div className="flex gap-1 mt-3 pt-2 border-t border-gray-700">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${clienteTelefono}`);
                  }}
                  className="flex-1 px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded text-xs flex items-center justify-center gap-1"
                >
                  <Phone size={10} />
                  Llamar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://wa.me/${clienteTelefono?.replace(/\D/g, '')}`);
                  }}
                  className="flex-1 px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded text-xs flex items-center justify-center gap-1"
                >
                  <MessageCircle size={10} />
                  WA
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`mailto:${clienteEmail}`);
                  }}
                  className="flex-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-xs flex items-center justify-center gap-1"
                >
                  <Mail size={10} />
                  Email
                </button>
              </div>
            </div>
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      {/*  Modal responsive que se adapta al contenido */}
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-7xl h-full shadow-2xl overflow-hidden flex flex-col border border-gray-700">

        {/*  HEADER CON ALERTA INTEGRADA */}
        <div className={`relative ${estado.headerColor} overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
          </div>

          <div className="relative px-8 py-4 text-white">
            {/* 🔧 HEADER EN UNA SOLA FILA */}
            <div className="flex items-center justify-between gap-4">
              {/* IZQUIERDA: Icono y Título */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                  {estado.icon && React.cloneElement(estado.icon, { className: "h-5 w-5" })}
                </div>
                <div>
                  <h1 className="text-lg font-bold">Orden #{servicioActual.id}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-white/90 text-[10px] font-medium flex items-center gap-1">
                      <User size={9} />
                      Técnico asignado: {tecnicoAsignado}
                    </span>
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/70 text-[10px] flex items-center gap-1">
                      <CalendarDays size={9} />
                      Creado: {formatearFecha(servicioActual.fechaIngreso)}
                    </span>
                    {tiempoTranscurrido && (
                      <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/70 text-[10px] flex items-center gap-1">
                        <Zap size={9} />
                        {tiempoTranscurrido}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CENTRO: Badges y Barra de Progreso */}
              <div className="flex items-center gap-3 flex-1 justify-center">
                {/* Badges de Estado */}
                <div className="flex items-center gap-2">
                  {estaVencido && (
                    <span className="bg-red-500/40 px-2.5 py-1 rounded-full text-red-100 text-[10px] font-medium flex items-center gap-1 animate-pulse border border-red-400/50 whitespace-nowrap">
                      <AlertTriangle size={11} />
                      Vencido ({diasTranscurridos}d)
                    </span>
                  )}
                  {estadoNormalizado === 'Listo para Retiro' && (
                    <span className="bg-green-500/40 px-2.5 py-1 rounded-full text-green-100 text-[10px] font-medium flex items-center gap-1 border border-green-400/50 whitespace-nowrap">
                      <CheckCircle size={11} />
                      Listo
                    </span>
                  )}
                </div>

                {/* Barra de Progreso Compacta */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex items-center gap-3 min-w-[500px]">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-white/80">Progreso</span>
                      <span className="text-white font-bold">{progreso}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2.5 shadow-inner relative overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden ${
                          estadoNormalizado === 'Recibido' 
                            ? 'bg-gradient-to-r from-purple-400 to-purple-600 shadow-purple-500/50'
                            : estadoNormalizado === 'En Diagnóstico'
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-amber-500/50'
                            : estadoNormalizado === 'Esperando Aprobación'
                            ? 'bg-gradient-to-r from-orange-400 to-red-500 shadow-orange-500/50'
                            : estadoNormalizado === 'En Reparación'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/50'
                            : estadoNormalizado === 'Listo para Retiro'
                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-emerald-500/50'
                            : estadoNormalizado === 'Entregado'
                            ? 'bg-gradient-to-r from-gray-400 to-gray-500 shadow-gray-500/50'
                            : 'bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-500 shadow-emerald-500/50'
                        }`}
                        style={{width: `${progreso}%`}}
                      >
                        {/* Efecto de brillo animado que se mueve */}
                        <div 
                          className="absolute inset-0 animate-shimmer"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                            backgroundSize: '200% 100%'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DERECHA: Botón Cerrar */}
              <div className="flex items-center flex-shrink-0">
                <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-hidden p-6 bg-gray-900">
          <div className="grid grid-cols-[40fr_60fr] gap-6 h-full">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="flex flex-col gap-4 min-h-0">
              
              {/* INFORMACIÓN DE CLIENTE - 30% ALTO */}
              <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700 flex-[0.3] flex flex-col min-h-0 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2 flex-shrink-0">
                  <User className="h-4 w-4 text-blue-400" />
                  Información del Cliente
                </h3>
                <div className="flex-1 flex flex-col justify-between space-y-2 min-h-0">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <span className="text-gray-400 text-xs">Cliente:</span>
                    <ContactoTooltip />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs flex-1 min-h-0">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[10px]">Dispositivo:</span>
                      <div className="font-medium text-gray-100 text-xs mt-0.5 leading-tight break-words">{dispositivoTexto}</div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[10px]">Días:</span>
                      <div className={`font-medium flex items-center gap-1 text-xs mt-0.5 ${estaVencido ? 'text-red-400' : 'text-gray-100'}`}>
                        {estadoNormalizado === 'Entregado' ? '—' : `${diasTranscurridos}d`}
                        {estaVencido && <Flag size={9} />}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[10px]">F. Recepción:</span>
                      <div className="font-medium text-gray-100 text-xs mt-0.5">{formatearFecha(servicioActual.fechaIngreso)}</div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[10px]">F. Estimada:</span>
                      <div className="font-medium text-gray-100 text-xs mt-0.5">{formatearFecha(fechaEntrega)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700 flex-shrink-0">
                    <span className="text-gray-400 text-xs">Estado:</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md font-medium ${estado.color} ${estado.textColor}`}>
                      {estado.icon}
                      {estadoNormalizado}
                    </span>
                  </div>
                </div>
              </div>

              {/* INFORMACIÓN DE ITEMS - 70% ALTO */}
              <div className="bg-gray-800/70 rounded-xl border border-gray-700 flex-[0.7] flex flex-col min-h-0 shadow-lg">
                <div className="p-4 border-b border-gray-700 flex-shrink-0 bg-gradient-to-r from-gray-800 to-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-400" />
                    Productos y Servicios
                    <span className="text-xs bg-emerald-900/30 px-2 py-0.5 rounded-full text-emerald-300 border border-emerald-700/50">
                      {items.length}
                    </span>
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-4">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-700/50 border-b border-gray-600 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-300">Item</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-300">Cant.</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-300">Precio</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-300">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {items.length > 0 ? (
                        items.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-3 py-2 text-gray-200 font-medium">{item.descripcion || item.nombre || '—'}</td>
                            <td className="px-3 py-2 text-center text-gray-300">{item.cantidad}</td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              ${Number((item.precioUnitario || item.precio_unitario || item.precio) ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-emerald-400">
                              ${Number(item.subtotal || ((item.precioUnitario || item.precio_unitario || item.precio) ?? 0) * (item.cantidad ?? 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-3 py-8 text-center text-gray-500 italic">
                            <div className="flex flex-col items-center gap-2">
                              <ShoppingCart className="h-10 w-10 text-gray-600 opacity-50" />
                              <span className="text-xs">No hay productos registrados</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-gray-700 bg-gradient-to-r from-emerald-900/20 to-emerald-800/10 flex-shrink-0">
                  <div className="flex justify-end">
                    <div className="bg-emerald-800/40 border border-emerald-600/50 rounded-lg px-3 py-2 shadow-lg">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                        <DollarSign size={14} />
                        <span>Total: ${totalGeneral.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA - NOTAS E IMÁGENES */}
            <div className="flex flex-col min-h-0">
              <div className="bg-gray-800/70 rounded-xl border border-gray-700 h-full flex flex-col min-h-0 shadow-lg">
                <div className="p-4 border-b border-gray-700 flex-shrink-0 bg-gradient-to-r from-gray-800 to-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-yellow-400" />
                    Notas e Imágenes
                    {notas.length > 0 && (
                      <span className="text-xs bg-yellow-900/30 px-2 py-0.5 rounded-full text-yellow-300 border border-yellow-700/50">
                        {notas.length}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-4">
                  {notas.length > 0 ? (
                    <div className="space-y-3">
                      {notas.map((nota, idx) => {
                        const contenidoNota = nota.contenido || nota.mensaje || nota.texto || '';
                        const fechaNota = nota.fecha || nota.createdAt || nota.updatedAt;
                        const tipoNota = nota.tipo?.toLowerCase() || '';
                        
                        // Detectar imágenes
                        const imagenes = tipoNota === 'imagen' && nota.archivoUrl 
                          ? [nota.archivoUrl]
                          : Array.isArray(nota.imagenes) 
                            ? nota.imagenes 
                            : (nota.archivoUrl && tipoNota !== 'audio' ? [nota.archivoUrl] : []);
                        
                        // Detectar audio
                        const audioUrl = tipoNota === 'audio' 
                          ? (nota.archivoUrl || nota.audio)
                          : null;
                        
                        // ✅ Función para renderizar contenido con iconos de Lucide
                        const renderizarContenidoConIconos = (texto) => {
                          if (!texto) return <i className="text-gray-500">Sin mensaje</i>;
                          
                          // Mapeo de iconos
                          const iconMap = {
                            '[ICON:PAYMENT]': { Icon: CreditCard, color: 'text-emerald-400' },
                            '[ICON:CASH]': { Icon: Banknote, color: 'text-green-400' },
                            '[ICON:DOLLAR]': { Icon: DollarSign, color: 'text-emerald-400' },
                            '[ICON:MOBILE]': { Icon: Smartphone, color: 'text-blue-400' },
                            '[ICON:BANK]': { Icon: Building2, color: 'text-indigo-400' },
                            '[ICON:CARD]': { Icon: CreditCard, color: 'text-purple-400' },
                            '[ICON:CRYPTO]': { Icon: Coins, color: 'text-yellow-400' },
                            '[ICON:INBOX]': { Icon: Inbox, color: 'text-purple-400' },
                            '[ICON:STETHOSCOPE]': { Icon: Stethoscope, color: 'text-amber-400' },
                            '[ICON:CLOCK]': { Icon: Clock, color: 'text-orange-400' },
                            '[ICON:WRENCH]': { Icon: Wrench, color: 'text-red-400' },
                            '[ICON:CHECK]': { Icon: CheckCircle, color: 'text-emerald-400' },
                            '[ICON:PACKAGE]': { Icon: PackageCheck, color: 'text-gray-400' },
                            '[ICON:FLAG]': { Icon: Flag, color: 'text-blue-400' }
                          };
                          
                          // Dividir el texto por marcadores de iconos
                          const partes = texto.split(/(\[ICON:\w+\])/g);
                          
                          return partes.map((parte, i) => {
                            if (parte.startsWith('[ICON:')) {
                              const iconInfo = iconMap[parte];
                              if (iconInfo) {
                                const { Icon, color } = iconInfo;
                                return <Icon key={i} size={16} className={`inline-block mr-1.5 ${color} align-middle`} />;
                              }
                            }
                            return <span key={i}>{parte}</span>;
                          });
                        };
                        
                        // ✅ Determinar estilo premium según tipo de nota
                        const obtenerEstiloNota = () => {
                          if (tipoNota === 'cambio_estado') {
                            const estadoNuevo = nota.estadoNuevo || '';
                            const estadoConfigMap = {
                              'RECIBIDO': 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/50',
                              'EN_DIAGNOSTICO': 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border-amber-500/50',
                              'ESPERANDO_APROBACION': 'bg-gradient-to-r from-orange-500/20 to-red-600/20 border-orange-500/50',
                              'EN_REPARACION': 'bg-gradient-to-r from-red-500/20 to-red-700/20 border-red-500/50',
                              'LISTO_RETIRO': 'bg-gradient-to-r from-emerald-500/20 to-green-600/20 border-emerald-500/50',
                              'ENTREGADO': 'bg-gradient-to-r from-gray-500/20 to-slate-600/20 border-gray-500/50'
                            };
                            return estadoConfigMap[estadoNuevo] || 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/50';
                          } else if (contenidoNota.includes('[ICON:PAYMENT]')) {
                            return 'bg-gradient-to-r from-emerald-500/20 to-green-600/20 border-emerald-500/50';
                          } else if (tipoNota === 'modificacion_items' || contenidoNota.includes('[ICON:WRENCH]')) {
                            return 'bg-gradient-to-r from-blue-500/20 to-indigo-600/20 border-blue-500/50';
                          }
                          return 'bg-gray-800/50 border-gray-700/50';
                        };
                        
                        return (
                          <div key={idx} className={`${obtenerEstiloNota()} rounded-xl p-4 border-2 hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}>
                            <div className="flex items-center justify-between text-gray-300 text-xs mb-3">
                              <span className="font-medium">{fechaNota ? new Date(fechaNota).toLocaleDateString('es-VE', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '—'}</span>
                              <div className="flex items-center gap-2">
                                {imagenes.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                    <Camera size={12} />
                                    {imagenes.length}
                                  </span>
                                )}
                                {audioUrl && (
                                  <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                                    <Mic size={12} />
                                    Audio
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-gray-100 text-sm leading-relaxed mb-3 font-medium">
                              {renderizarContenidoConIconos(contenidoNota)}
                            </div>
                            
                            {/* Reproductor de audio */}
                            {audioUrl && (
                              <div className="mb-3 p-3 bg-gray-900/50 rounded-lg border border-purple-500/30">
                                <audio 
                                  controls 
                                  src={audioUrl} 
                                  className="w-full h-10"
                                  preload="metadata"
                                >
                                  Tu navegador no soporta el elemento de audio.
                                </audio>
                              </div>
                            )}
                            
                            {/* Imágenes */}
                            {imagenes.length > 0 && (
                              <div className="grid grid-cols-4 gap-2">
                                {imagenes.map((imagen, imgIdx) => (
                                  <div 
                                    key={imgIdx} 
                                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-600 hover:border-blue-400 transition-all duration-200"
                                    onClick={() => setImagenExpandida(imagen)}
                                  >
                                    <img
                                      src={imagen}
                                      alt={`Evidencia ${idx + 1}-${imgIdx + 1}`}
                                      className="w-full h-24 object-cover group-hover:scale-110 transition-transform duration-200"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                          <Camera size={16} className="text-white" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <StickyNote className="h-16 w-16 text-gray-600 opacity-50 mb-4" />
                      <p className="text-gray-500 italic text-sm">Sin notas registradas</p>
                      <p className="text-gray-600 text-xs mt-2">Las notas e imágenes aparecerán aquí cuando se agreguen</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER OPTIMIZADO */}
        <div className="flex-shrink-0 bg-gray-800 px-8 py-4 border-t border-gray-700">
          <div className="flex justify-center items-center gap-3">
            
            {/* Acciones secundarias */}
            <button
              onClick={handleReimprimirOrden}
              className="group px-4 py-2 bg-gray-700/50 border border-gray-600 hover:bg-blue-600/70 hover:border-blue-500 text-gray-200 hover:text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Printer size={14} className="group-hover:text-white transition-colors" />
              <span>Reimprimir</span>
            </button>

            <button
              onClick={handleNotificarWhatsApp}
              className="group px-4 py-2 bg-green-700/50 border border-green-600 hover:bg-green-600/70 hover:border-green-500 text-green-100 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <MessageCircle size={14} className="group-hover:text-white transition-colors" />
              <span>WhatsApp</span>
            </button>

            {/* Acciones principales */}
            {/* Siempre mostrar botón de pago si hay saldo pendiente */}
            {tieneSaldoPendiente && (
              <button
                onClick={() => setShowPagoModal(true)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ${
                  estadoNormalizado === 'Listo para Retiro'
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white shadow-blue-500/25'
                }`}
              >
                <CreditCard size={18} />
                <span>
                  {estadoNormalizado === 'Listo para Retiro' 
                    ? 'Pagar y Entregar' 
                    : 'Registrar Pago'}
                </span>
              </button>
            )}

            {/* Botón entregar solo si no hay saldo pendiente y está listo */}
            {estadoNormalizado === 'Listo para Retiro' && !tieneSaldoPendiente && (
              <button
                onClick={handleEntregarDispositivo}
                className="px-6 py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Truck size={18} />
                <span>Entregar Dispositivo</span>
              </button>
            )}

            {/* Información adicional en el footer */}
            {servicio.ultimaActualizacion && (
              <div className="hidden md:flex items-center gap-4 ml-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Zap size={12} />
                  Actualizado: {tiempoTranscurrido || 'Reciente'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE IMAGEN EXPANDIDA - PREMIUM */}
      {imagenExpandida && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setImagenExpandida(null)}
        >
          <div className="relative max-w-6xl max-h-[95vh] w-full h-full flex items-center justify-center">
            <img
              src={imagenExpandida}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border-2 border-gray-700"
              alt="Imagen expandida"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-200 shadow-lg hover:scale-110 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setImagenExpandida(null);
              }}
            >
              <X size={24} />
            </button>

            {/* Información de la imagen */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm border border-gray-600">
              <div className="flex items-center gap-2">
                <Camera size={16} />
                <span>Clic fuera para cerrar</span>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* MODAL DE PAGO AL RETIRO */}
       {showPagoModal && (
         <PagoRetiroModal
           isOpen={showPagoModal}
           onClose={() => setShowPagoModal(false)}
           servicio={servicioActual}
           saldoPendiente={saldoPendiente}
          onPagoCompletado={async (servicioActualizado) => {
            // El servicio ya viene actualizado del backend
            // Actualizar el servicio local para reflejar cambios
            if (servicioActualizado) {
              // ✅ Marcar como actualizando para evitar que el socket handler procese eventos duplicados
              actualizandoRef.current = true;
              
              // Actualizar servicio local con los datos del backend
              setServicioLocal(servicioActualizado);
              
              // Recalcular totales
              const nuevoTotalPagado = parseFloat(servicioActualizado.totalPagado || totalPagado);
              const nuevoSaldoPendiente = parseFloat(servicioActualizado.saldoPendiente || saldoPendiente);
              
              // Si ya no tiene saldo pendiente y está listo, mostrar mensaje
              if (nuevoSaldoPendiente <= 0 && estadoNormalizado === 'Listo para Retiro') {
                toast.success('El servicio está completamente pagado y listo para entregar');
              }
              
              // ✅ Liberar la bandera después de un delay para evitar procesamiento de eventos socket duplicados
              setTimeout(() => {
                actualizandoRef.current = false;
              }, 1000);
            }
            
            setShowPagoModal(false);
          }}
         />
       )}
    </div>
  );
}