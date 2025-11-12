// components/servicios/ModalVerServicio.jsx - VERSIÓN OPTIMIZADA CON MEJORAS ESPECÍFICAS
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Flag, Inbox, Stethoscope, Clock, Wrench, CheckCircle, PackageCheck,
  User, CalendarDays, DollarSign, StickyNote, ShoppingCart, AlertTriangle,
  Printer, Camera, Truck, Phone, Mail, MapPin, Zap, CreditCard, Mic,
  Banknote, Smartphone, Building2, Coins, Laptop, Monitor, Gamepad2, Tablet, Watch, Headphones, ChevronDown, ChevronUp
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import toast from '../../utils/toast.jsx';
import { imprimirTicketServicio } from '../../utils/printUtils.js';
import ModalReimprimirTicket from './ModalReimprimirTicket';
import ModalConfirmarWhatsApp from './ModalConfirmarWhatsApp';
import ModalConfirmarEntrega from './ModalConfirmarEntrega';
import PagoRetiroModal from './PagoRetiroModal';
import HistorialPagosPanel from './HistorialPagosPanel';
import { useAuthStore } from '../../store/authStore';
import { useServiciosStore } from '../../store/serviciosStore';
import { useCajaStore } from '../../store/cajaStore';
import { api } from '../../config/api';

const estadoConfig = {
  'Recibido': { color: 'bg-gradient-to-r from-purple-400 to-purple-600', headerColor: 'bg-gradient-to-r from-purple-800 to-purple-900', textColor: 'text-gray-100', icon: <Inbox size={14} />, progreso: 0 },
  'En Diagnóstico': { color: 'bg-gradient-to-r from-amber-700 to-yellow-800', headerColor: 'bg-gradient-to-r from-amber-800 to-yellow-900', textColor: 'text-amber-100', icon: <Stethoscope size={14} />, progreso: 25 },
  'Esperando Aprobación': { color: 'bg-gradient-to-r from-orange-700 to-red-800', headerColor: 'bg-gradient-to-r from-orange-800 to-red-900', textColor: 'text-orange-100', icon: <Clock size={14} />, progreso: 50 },
  'En Reparación': { color: 'bg-gradient-to-r from-red-800 to-red-900', headerColor: 'bg-gradient-to-r from-red-900 to-red-950', textColor: 'text-red-100', icon: <Wrench size={14} />, progreso: 75 },
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
  const { tasaCambio } = useCajaStore();
  
  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('');
  const [tooltipAbierto, setTooltipAbierto] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [servicioLocal, setServicioLocal] = useState(servicio);
  const [loading, setLoading] = useState(false);
  const [showModalReimprimir, setShowModalReimprimir] = useState(false);
  const [showModalWhatsApp, setShowModalWhatsApp] = useState(false);
  const [showModalEntrega, setShowModalEntrega] = useState(false);
  const [dispositivoExpandido, setDispositivoExpandido] = useState(false);
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


    const handleNotaAgregada = async (data) => {
      
      // ✅ Evitar procesamiento simultáneo
      if (actualizandoRef.current) {
        return;
      }
      
      // Solo actualizar si la nota es para este servicio
      if (data.servicioId === servicioIdRef.current) {
        
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
  
  // 🔧 Extraer información detallada del dispositivo
  const dispositivoMarca = servicioActual.dispositivoMarca || servicioActual.dispositivo?.marca || '—';
  const dispositivoModelo = servicioActual.dispositivoModelo || servicioActual.dispositivo?.modelo || '—';
  const dispositivoColor = servicioActual.dispositivoColor || servicioActual.dispositivo?.color || null;
  const dispositivoImei = servicioActual.dispositivoImei || servicioActual.dispositivo?.imei || servicioActual.imei || '—';
  const dispositivoTipo = servicioActual.dispositivoTipo || servicioActual.dispositivo?.tipo || servicioActual.tipo || null;
  
  // 🔧 Extraer accesorios
  const accesorios = (() => {
    if (servicioActual.accesorios) {
      if (Array.isArray(servicioActual.accesorios)) {
        return servicioActual.accesorios;
      }
      if (typeof servicioActual.accesorios === 'string') {
        try {
          const parsed = JSON.parse(servicioActual.accesorios);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [servicioActual.accesorios];
        }
      }
    }
    if (servicioActual.dispositivo?.accesorios) {
      return Array.isArray(servicioActual.dispositivo.accesorios) 
        ? servicioActual.dispositivo.accesorios 
        : [];
    }
    return [];
  })();
  
  // 🔧 Mapeo de tipos de dispositivo a iconos
  const obtenerIconoTipo = (tipo) => {
    if (!tipo) return Smartphone;
    const tipoLower = tipo.toLowerCase();
    const iconosMap = {
      'telefono': Smartphone,
      'laptop': Laptop,
      'pc': Monitor,
      'consola': Gamepad2,
      'tablet': Tablet,
      'smartwatch': Watch,
      'accesorio': Headphones,
      'otro': Zap
    };
    return iconosMap[tipoLower] || Smartphone;
  };
  
  // 🔧 Mapeo de tipos de dispositivo a etiquetas
  const obtenerEtiquetaTipo = (tipo) => {
    if (!tipo) return 'Dispositivo';
    const tipoLower = tipo.toLowerCase();
    const etiquetasMap = {
      'telefono': 'Teléfono',
      'laptop': 'Laptop',
      'pc': 'PC/Escritorio',
      'consola': 'Consola',
      'tablet': 'Tablet',
      'smartwatch': 'Smartwatch',
      'accesorio': 'Accesorio',
      'otro': 'Otro'
    };
    return etiquetasMap[tipoLower] || tipo;
  };
  
  const IconoTipo = obtenerIconoTipo(dispositivoTipo);
  const etiquetaTipo = obtenerEtiquetaTipo(dispositivoTipo);
  
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
  const progreso = estado?.progreso ?? 0;
  
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

  // Formatear montos en Bs
  const formatearBs = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Calcular montos en Bs usando la tasa de cambio
  const tasa = tasaCambio || 37.50;
  const totalGeneralBs = totalGeneral * tasa;
  const totalPagadoBs = totalPagado * tasa;
  const saldoPendienteBs = saldoPendiente * tasa;

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
    setShowModalEntrega(true);
  };

  const handleReimprimirOrden = () => {
    setShowModalReimprimir(true);
  };

  const handleImprimirCliente = async () => {
    try {
      setLoading(true);
      
      // Obtener servicio completo desde el backend con todos los datos necesarios
      const servicioCompleto = await obtenerServicio(servicioActual.id);
      
      if (!servicioCompleto) {
        toast.error('No se pudo cargar el servicio para reimprimir');
        return;
      }

      // Solicitar regeneración al backend con tipo 'cliente' para marcar como reimpresión
      try {
        const response = await api.get(`/servicios/${servicioActual.id}/ticket?tipo=cliente`);
        
        if (response.data.success && response.data.data) {
          const { ticketHTML, qrCode, linkSeguimiento } = response.data.data;
          
          // Imprimir solo el ticket del cliente
          const ventanaImpresion = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');
          
          if (!ventanaImpresion) {
            throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
          }
          
          let htmlConQR = ticketHTML;
          if (qrCode && ticketHTML.includes('qr-code-placeholder')) {
            htmlConQR = ticketHTML.replace(
              /<div id="qr-code-placeholder"[^>]*>[\s\S]*?<\/div>/,
              `<img src="${qrCode}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block;" />`
            );
          }
          
          ventanaImpresion.document.write(htmlConQR);
          ventanaImpresion.document.close();
          
          // Esperar a que se cargue y luego imprimir
          ventanaImpresion.onload = () => {
            setTimeout(() => {
              ventanaImpresion.print();
            }, 250);
          };
          
          toast.success('Ticket del cliente reimpreso exitosamente');
        } else {
          throw new Error('No se pudo generar el ticket');
        }
      } catch (error) {
        console.error('Error regenerando ticket:', error);
        toast.error('Error al reimprimir el ticket: ' + (error.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error reimprimiendo orden:', error);
      toast.error('Error al reimprimir el ticket: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleImprimirInterno = async () => {
    try {
      setLoading(true);
      
      // Obtener servicio completo desde el backend con todos los datos necesarios
      const servicioCompleto = await obtenerServicio(servicioActual.id);
      
      if (!servicioCompleto) {
        toast.error('No se pudo cargar el servicio para reimprimir');
        return;
      }

      // Solicitar regeneración al backend con tipo 'interno'
      try {
        const response = await api.get(`/servicios/${servicioActual.id}/ticket?tipo=interno`);
        
        if (response.data.success && response.data.data) {
          const { ticketHTMLInterno } = response.data.data;
          
          if (!ticketHTMLInterno) {
            throw new Error('No se pudo generar el ticket interno');
          }
          
          // Imprimir solo el ticket interno
          const ventanaImpresion = window.open('', '_blank', 'width=302,height=400,scrollbars=yes');
          
          if (!ventanaImpresion) {
            throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
          }
          
          ventanaImpresion.document.write(ticketHTMLInterno);
          ventanaImpresion.document.close();
          
          // Esperar a que se cargue y luego imprimir
          ventanaImpresion.onload = () => {
            setTimeout(() => {
              ventanaImpresion.print();
            }, 250);
          };
          
          toast.success('Ticket interno reimpreso exitosamente');
        } else {
          throw new Error('No se pudo generar el ticket');
        }
      } catch (error) {
        console.error('Error regenerando ticket:', error);
        toast.error('Error al reimprimir el ticket: ' + (error.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error reimprimiendo orden:', error);
      toast.error('Error al reimprimir el ticket: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleNotificarWhatsApp = () => {
    setShowModalWhatsApp(true);
  };

  const handleConfirmarWhatsApp = async () => {
    try {
      setLoading(true);
      
      // Verificar estado de WhatsApp primero
      const estadoResponse = await api.get('/whatsapp/estado');
      const estadoWhatsApp = estadoResponse.data?.data || estadoResponse.data;
      
      
      if (!estadoWhatsApp || !estadoWhatsApp.conectado) {
        toast.error('WhatsApp no está conectado. Por favor, conecta WhatsApp primero desde la configuración.');
        return;
      }

      // Enviar WhatsApp
      const response = await api.post('/whatsapp/enviar-servicio', {
        servicioId: servicioActual.id,
        numero: servicioActual.clienteTelefono
      });

      if (response.data.success) {
        toast.success('Mensaje de WhatsApp enviado exitosamente');
      } else {
        throw new Error(response.data.message || 'Error enviando WhatsApp');
      }
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      toast.error('Error al enviar WhatsApp: ' + (error.response?.data?.message || error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
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
        <FaWhatsapp size={10} />
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
                  <FaWhatsapp size={10} />
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
                  <h1 className="text-lg font-bold">Orden #{servicioActual.numeroServicio || servicioActual.id}</h1>
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
              
              {/* INFORMACIÓN DE CLIENTE - COMPACTA */}
              <div className="bg-gray-800/70 rounded-xl p-2.5 border border-gray-700 flex-[0.3] flex flex-col min-h-0 shadow-lg overflow-hidden">
                <h3 className="text-[11px] font-semibold text-gray-100 mb-1.5 flex items-center gap-1 flex-shrink-0">
                  <User className="h-3 w-3 text-blue-400" />
                  Información del Cliente
                </h3>
                <div className="flex-1 flex flex-col space-y-1.5 min-h-0 overflow-y-auto">
                  <div className="flex items-center justify-between flex-shrink-0 pb-1">
                    <span className="text-gray-400 text-[9px]">Cliente:</span>
                    <div className="scale-90 origin-right">
                      <ContactoTooltip />
                    </div>
                  </div>
                  
                  {/* INFORMACIÓN DEL DISPOSITIVO - DESPLEGABLE */}
                  <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 flex-shrink-0">
                    <button
                      onClick={() => setDispositivoExpandido(!dispositivoExpandido)}
                      className="w-full flex items-center justify-between p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <IconoTipo className="h-2.5 w-2.5 text-blue-400" />
                        <span className="text-gray-400 text-[8px] font-medium">{etiquetaTipo}</span>
                        <span className="text-gray-500 text-[8px]">• {dispositivoMarca} {dispositivoModelo}</span>
                      </div>
                      {dispositivoExpandido ? (
                        <ChevronUp className="h-3 w-3 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      )}
                    </button>
                    {dispositivoExpandido && (
                      <div className="px-1.5 pb-1.5 space-y-0.5 text-[9px] border-t border-gray-700/50 pt-1">
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-gray-500 text-[8px] whitespace-nowrap">Marca:</span>
                          <span className="text-gray-200 font-medium text-right truncate flex-1 ml-0.5 text-[8px]">{dispositivoMarca}</span>
                        </div>
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-gray-500 text-[8px] whitespace-nowrap">Modelo:</span>
                          <span className="text-gray-200 font-medium text-right truncate flex-1 ml-0.5 text-[8px]">{dispositivoModelo}</span>
                        </div>
                        {dispositivoColor && (
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-gray-500 text-[8px] whitespace-nowrap">Color:</span>
                            <span className="text-gray-200 font-medium text-right truncate flex-1 ml-0.5 text-[8px]">{dispositivoColor}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-gray-500 text-[8px] whitespace-nowrap">IMEI:</span>
                          <span className="text-gray-200 font-mono text-[8px] text-right break-all flex-1 ml-0.5 leading-tight">{dispositivoImei}</span>
                        </div>
                        {accesorios.length > 0 && (
                          <div className="pt-0.5 border-t border-gray-700/50 mt-0.5">
                            <div className="text-gray-500 text-[8px] mb-0.5">Accesorios:</div>
                            <div className="flex flex-wrap gap-0.5">
                              {accesorios.slice(0, 2).map((accesorio, idx) => (
                                <span key={idx} className="inline-flex items-center px-0.5 py-0.5 bg-green-500/20 text-green-300 rounded text-[7px] border border-green-500/30 truncate max-w-[45%]">
                                  {accesorio}
                                </span>
                              ))}
                              {accesorios.length > 2 && (
                                <span className="inline-flex items-center px-0.5 py-0.5 bg-gray-600/50 text-gray-400 rounded text-[7px]">
                                  +{accesorios.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-[9px] flex-shrink-0">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px]">Días:</span>
                      <div className={`font-medium flex items-center gap-0.5 text-[9px] mt-0.5 ${estaVencido ? 'text-red-400' : 'text-gray-100'}`}>
                        {estadoNormalizado === 'Entregado' ? '—' : `${diasTranscurridos}d`}
                        {estaVencido && <Flag size={7} />}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px]">F. Estimada:</span>
                      <div className="font-medium text-gray-100 text-[9px] mt-0.5">{formatearFecha(fechaEntrega)}</div>
                    </div>
                    <div className="flex flex-col col-span-2">
                      <span className="text-gray-400 text-[8px]">Estado:</span>
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] rounded-md font-medium mt-0.5 ${estado.color} ${estado.textColor}`}>
                        {React.cloneElement(estado.icon, { size: 9 })}
                        <span className="truncate">{estadoNormalizado}</span>
                      </span>
                    </div>
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
                <div className="flex-1 overflow-y-auto min-h-0 p-2 sm:p-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] sm:text-xs">
                      <thead className="bg-gray-700/50 border-b-2 border-gray-600 sticky top-0 z-10">
                        <tr>
                          <th className="px-1.5 sm:px-2 py-1.5 text-left font-semibold text-gray-300">Descripción</th>
                          <th className="px-1.5 sm:px-2 py-1.5 text-center font-semibold text-gray-300 w-12 sm:w-16">Cant.</th>
                          <th className="px-1.5 sm:px-2 py-1.5 text-right font-semibold text-gray-300 w-20 sm:w-24">P. Unit.</th>
                          <th className="px-1.5 sm:px-2 py-1.5 text-right font-semibold text-gray-300 w-24 sm:w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {items.length > 0 ? (
                          items.map((item, i) => {
                            const precioUnitario = Number((item.precioUnitario || item.precio_unitario || item.precio) ?? 0);
                            const cantidad = Number(item.cantidad ?? 0);
                            const subtotal = precioUnitario * cantidad;
                            const precioUnitarioBs = precioUnitario * tasa;
                            const subtotalBs = subtotal * tasa;
                            return (
                              <tr key={i} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-1.5 sm:px-2 py-1.5 text-gray-200 font-medium break-words max-w-[120px] sm:max-w-none">
                                  <div className="truncate sm:break-words" title={item.descripcion || item.nombre || '—'}>
                                    {item.descripcion || item.nombre || '—'}
                                  </div>
                                </td>
                                <td className="px-1.5 sm:px-2 py-1.5 text-center text-gray-300 whitespace-nowrap">{cantidad}</td>
                                <td className="px-1.5 sm:px-2 py-1.5 text-right text-gray-300 whitespace-nowrap text-[9px] sm:text-xs">
                                  {formatearBs(precioUnitarioBs)} Bs
                                </td>
                                <td className="px-1.5 sm:px-2 py-1.5 text-right font-semibold text-emerald-400 whitespace-nowrap text-[9px] sm:text-xs">
                                  {formatearBs(subtotalBs)} Bs
                                </td>
                              </tr>
                            );
                          })
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
                </div>
                <div className="p-2 sm:p-3 border-t-2 border-gray-600 bg-gradient-to-r from-emerald-900/20 to-emerald-800/10 flex-shrink-0">
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Subtotal:</span>
                      <div className="text-[10px] sm:text-xs text-gray-100 font-semibold break-all text-right">{formatearBs(totalGeneralBs)} Bs</div>
                    </div>
                    {totalPagado > 0 && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-gray-700">
                        <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Total Pagado:</span>
                        <div className="text-[10px] sm:text-xs text-emerald-400 font-semibold break-all text-right">{formatearBs(totalPagadoBs)} Bs</div>
                      </div>
                    )}
                    {saldoPendiente > 0 && (
                      <div className="flex justify-between items-center pt-1.5 border-t-2 border-gray-600">
                        <span className="text-[10px] sm:text-xs text-gray-300 font-bold">Saldo Pendiente:</span>
                        <div className="text-[10px] sm:text-xs text-red-400 font-bold break-all text-right">{formatearBs(saldoPendienteBs)} Bs</div>
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-gray-700 mt-1.5">
                      <div className="text-[9px] sm:text-[10px] text-gray-500 text-center">
                        Tasa: {formatearBs(tasa)} Bs/USD
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
                    (() => {
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
                      const obtenerEstiloNota = (nota) => {
                        const tipoNota = (nota.tipo?.toLowerCase() || '');
                        const contenidoNota = nota.contenido || nota.mensaje || nota.texto || '';
                        
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
                        
                        // ✅ Función para renderizar cambio de estado visualmente
                      const renderizarCambioEstado = (nota) => {
                        const tipoNota = (nota.tipo?.toLowerCase() || '');
                          if (tipoNota !== 'cambio_estado' || !nota.estadoAnterior || !nota.estadoNuevo) {
                            return null;
                          }

                          // Función para obtener configuración de estado
                          const obtenerConfigEstado = (estadoCodigo) => {
                            if (!estadoCodigo) return { color: 'bg-gray-600', textColor: 'text-gray-100', icon: <Flag size={12} />, label: 'Desconocido' };
                            
                            const estadoUpper = estadoCodigo.toUpperCase();
                            const mapaEstados = {
                              'RECIBIDO': { color: 'bg-gradient-to-r from-purple-400 to-purple-600', textColor: 'text-gray-100', icon: <Inbox size={12} />, label: 'Recibido' },
                              'EN_DIAGNOSTICO': { color: 'bg-gradient-to-r from-amber-700 to-yellow-800', textColor: 'text-amber-100', icon: <Stethoscope size={12} />, label: 'En Diagnóstico' },
                              'EN DIAGNOSTICO': { color: 'bg-gradient-to-r from-amber-700 to-yellow-800', textColor: 'text-amber-100', icon: <Stethoscope size={12} />, label: 'En Diagnóstico' },
                              'ESPERANDO_APROBACION': { color: 'bg-gradient-to-r from-orange-700 to-red-800', textColor: 'text-orange-100', icon: <Clock size={12} />, label: 'Esperando Aprobación' },
                              'ESPERANDO APROBACION': { color: 'bg-gradient-to-r from-orange-700 to-red-800', textColor: 'text-orange-100', icon: <Clock size={12} />, label: 'Esperando Aprobación' },
                              'EN_REPARACION': { color: 'bg-gradient-to-r from-red-800 to-red-900', textColor: 'text-red-100', icon: <Wrench size={12} />, label: 'En Reparación' },
                              'EN REPARACION': { color: 'bg-gradient-to-r from-red-800 to-red-900', textColor: 'text-red-100', icon: <Wrench size={12} />, label: 'En Reparación' },
                              'LISTO_RETIRO': { color: 'bg-gradient-to-r from-emerald-700 to-green-800', textColor: 'text-emerald-100', icon: <CheckCircle size={12} />, label: 'Listo para Retiro' },
                              'LISTO RETIRO': { color: 'bg-gradient-to-r from-emerald-700 to-green-800', textColor: 'text-emerald-100', icon: <CheckCircle size={12} />, label: 'Listo para Retiro' },
                              'ENTREGADO': { color: 'bg-gradient-to-r from-gray-800 to-gray-900', textColor: 'text-gray-200', icon: <PackageCheck size={12} />, label: 'Entregado' }
                            };
                            
                            // Buscar por código exacto primero
                            if (mapaEstados[estadoUpper]) {
                              return mapaEstados[estadoUpper];
                            }
                            
                            // Si no se encuentra, normalizar y buscar
                            const estadoNormalizado = estadoUpper.replace(/_/g, ' ');
                            if (mapaEstados[estadoNormalizado]) {
                              return mapaEstados[estadoNormalizado];
                            }
                            
                            // Fallback
                            return {
                              color: 'bg-gray-600',
                              textColor: 'text-gray-100',
                              icon: <Flag size={12} />,
                              label: estadoCodigo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                            };
                          };

                          const estadoAnterior = obtenerConfigEstado(nota.estadoAnterior);
                          const estadoNuevo = obtenerConfigEstado(nota.estadoNuevo);

                          return (
                            <div className="mt-3 p-2 sm:p-3 bg-gradient-to-r from-gray-900/60 via-gray-800/60 to-gray-900/60 border border-gray-600/30 rounded-lg backdrop-blur-sm">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                {/* Badges de estado - Responsive */}
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 flex-wrap w-full sm:w-auto">
                                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 ${estadoAnterior.color} ${estadoAnterior.textColor} rounded-md font-medium border border-white/20 flex items-center gap-1 sm:gap-1.5 shadow-sm text-xs sm:text-sm whitespace-nowrap`}>
                                    {estadoAnterior.icon}
                                    <span className="truncate">{estadoAnterior.label}</span>
                                  </span>
                                  <span className="text-gray-400 font-bold text-sm sm:text-lg flex-shrink-0">→</span>
                                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 ${estadoNuevo.color} ${estadoNuevo.textColor} rounded-md font-medium border border-white/20 flex items-center gap-1 sm:gap-1.5 shadow-sm text-xs sm:text-sm whitespace-nowrap`}>
                                    {estadoNuevo.icon}
                                    <span className="truncate">{estadoNuevo.label}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        };
                      
                      // ✅ Agrupar notas por grupoId (si existe)
                      // Crear un mapa de grupos por grupoId
                      const gruposPorId = new Map();
                      const notasSinGrupo = [];
                      
                      notas.forEach((nota) => {
                        const grupoId = nota.grupoId;
                        
                        // Si tiene grupoId, agregarlo al grupo correspondiente
                        if (grupoId) {
                          if (!gruposPorId.has(grupoId)) {
                            gruposPorId.set(grupoId, []);
                          }
                          gruposPorId.get(grupoId).push(nota);
                        } else {
                          // Nota sin grupoId, se mostrará individualmente
                          notasSinGrupo.push(nota);
                        }
                      });
                      
                      // Ordenar notas dentro de cada grupo: texto primero, luego imágenes
                      gruposPorId.forEach((notasGrupo) => {
                        notasGrupo.sort((a, b) => {
                          const tipoA = (a.tipo?.toLowerCase() || '');
                          const tipoB = (b.tipo?.toLowerCase() || '');
                          
                          // Texto primero
                          if (tipoA === 'texto' && tipoB !== 'texto') return -1;
                          if (tipoA !== 'texto' && tipoB === 'texto') return 1;
                          
                          // Luego por fecha (más antiguas primero dentro del grupo)
                          const fechaA = new Date(a.fecha || a.createdAt || a.updatedAt || 0);
                          const fechaB = new Date(b.fecha || b.createdAt || b.updatedAt || 0);
                          return fechaA - fechaB;
                        });
                      });
                      
                      const notasAgrupadas = [];
                      
                      // Agregar grupos (con grupoId)
                      gruposPorId.forEach((notasGrupo) => {
                        // Solo crear grupo si hay más de una nota o si hay texto + imágenes
                        const tieneTexto = notasGrupo.some(n => {
                          const tipo = (n.tipo?.toLowerCase() || '');
                          const contenido = n.contenido || n.mensaje || n.texto || '';
                          return tipo === 'texto' && contenido.trim();
                        });
                        const tieneImagenes = notasGrupo.some(n => {
                          const tipo = (n.tipo?.toLowerCase() || '');
                          return tipo === 'imagen';
                        });
                        
                        if (notasGrupo.length > 1 || (tieneTexto && tieneImagenes)) {
                          notasAgrupadas.push({ tipo: 'grupo', notas: notasGrupo });
                        } else {
                          // Si solo hay una nota en el grupo, tratarla como individual
                          notasSinGrupo.push(notasGrupo[0]);
                        }
                      });
                      
                      // Agregar notas sin grupo como individuales
                      notasSinGrupo.forEach((nota) => {
                        notasAgrupadas.push({ tipo: 'individual', nota: nota });
                      });
                      
                      // Ordenar los grupos/notas finales por fecha (más recientes primero) para visualización
                      notasAgrupadas.sort((a, b) => {
                        const fechaA = a.tipo === 'grupo' 
                          ? (a.notas[0].fecha || a.notas[0].createdAt || a.notas[0].updatedAt || 0)
                          : (a.nota.fecha || a.nota.createdAt || a.nota.updatedAt || 0);
                        const fechaB = b.tipo === 'grupo'
                          ? (b.notas[0].fecha || b.notas[0].createdAt || b.notas[0].updatedAt || 0)
                          : (b.nota.fecha || b.nota.createdAt || b.nota.updatedAt || 0);
                        return new Date(fechaB) - new Date(fechaA); // Más recientes primero para visualización
                      });
                      
                      return notasAgrupadas.map((item, idx) => {
                        if (item.tipo === 'grupo') {
                          // Renderizar grupo: puede ser texto + imágenes o solo imágenes
                          const primeraNota = item.notas[0];
                          const tipoPrimeraNota = (primeraNota.tipo?.toLowerCase() || '');
                          const contenidoPrimeraNota = primeraNota.contenido || primeraNota.mensaje || primeraNota.texto || '';
                          
                          // Determinar si el grupo tiene texto o solo imágenes
                          const tieneTexto = tipoPrimeraNota === 'texto' && contenidoPrimeraNota.trim();
                          
                          // Separar texto e imágenes
                          const notaTexto = tieneTexto ? primeraNota : null;
                          const imagenesNotas = tieneTexto ? item.notas.slice(1) : item.notas;
                          
                          const contenidoNota = notaTexto ? (notaTexto.contenido || notaTexto.mensaje || notaTexto.texto || '') : '';
                          const fechaNota = primeraNota.fecha || primeraNota.createdAt || primeraNota.updatedAt;
                          const tipoNota = tieneTexto ? (notaTexto.tipo?.toLowerCase() || '') : '';
                          
                          // Recopilar todas las imágenes del grupo
                          const imagenes = imagenesNotas
                            .map(n => n.archivoUrl)
                            .filter(Boolean);
                        
                        return (
                            <div key={`grupo-${idx}`} className={`${obtenerEstiloNota(primeraNota)} rounded-xl p-4 border-2 hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}>
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
                                </div>
                              </div>
                              
                              {/* Mostrar texto solo si existe */}
                              {contenidoNota && (
                                <div className="text-gray-100 text-sm leading-relaxed mb-3 font-medium">
                                  {tipoNota !== 'cambio_estado' && renderizarContenidoConIconos(contenidoNota)}
                                </div>
                              )}
                              
                              {/* Imágenes agrupadas */}
                              {imagenes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {imagenes.map((imagen, imgIdx) => (
                                    <div 
                                      key={imgIdx} 
                                      className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-600 hover:border-blue-400 transition-all duration-200"
                                      style={{ width: '80px', height: '80px' }}
                                      onClick={() => setImagenExpandida(imagen)}
                                    >
                                      <div className="w-full h-full bg-gray-800">
                                        <img
                                          src={imagen}
                                          alt={`Evidencia ${idx + 1}-${imgIdx + 1}`}
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                          loading="lazy"
                                        />
                                      </div>
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                                            <Camera size={12} className="text-white" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // Renderizar nota individual normal
                          const nota = item.nota;
                          const contenidoNota = nota.contenido || nota.mensaje || nota.texto || '';
                          const fechaNota = nota.fecha || nota.createdAt || nota.updatedAt;
                          const tipoNota = (nota.tipo?.toLowerCase() || '');
                          
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
                          
                          return (
                            <div key={idx} className={`${obtenerEstiloNota(nota)} rounded-xl p-4 border-2 hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}>
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
                              {/* Ocultar texto si es cambio de estado (ya se muestra visualmente con badges) */}
                              {tipoNota !== 'cambio_estado' && renderizarContenidoConIconos(contenidoNota)}
                            </div>
                            
                            {/* Renderizar cambio de estado visualmente */}
                              {renderizarCambioEstado(nota)}
                            
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
                                <div className="flex flex-wrap gap-2">
                                {imagenes.map((imagen, imgIdx) => (
                                  <div 
                                    key={imgIdx} 
                                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-600 hover:border-blue-400 transition-all duration-200"
                                      style={{ width: '80px', height: '80px' }}
                                    onClick={() => setImagenExpandida(imagen)}
                                  >
                                      <div className="w-full h-full bg-gray-800">
                                    <img
                                      src={imagen}
                                      alt={`Evidencia ${idx + 1}-${imgIdx + 1}`}
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                      loading="lazy"
                                    />
                                      </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                                            <Camera size={12} className="text-white" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                        }
                      });
                    })()
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
              <FaWhatsapp size={14} className="group-hover:text-white transition-colors" />
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

       {/* MODAL DE REIMPRESIÓN */}
       {showModalReimprimir && (
         <ModalReimprimirTicket
           isOpen={showModalReimprimir}
           onClose={() => setShowModalReimprimir(false)}
           onImprimirCliente={handleImprimirCliente}
           onImprimirInterno={handleImprimirInterno}
         />
       )}

       {/* MODAL DE CONFIRMACIÓN WHATSAPP */}
       {showModalWhatsApp && (
         <ModalConfirmarWhatsApp
           isOpen={showModalWhatsApp}
           onClose={() => setShowModalWhatsApp(false)}
           onConfirmar={handleConfirmarWhatsApp}
           clienteNombre={clienteNombre}
           numeroServicio={servicioActual.numeroServicio || servicioActual.id}
         />
       )}

       {/* MODAL DE PAGO AL RETIRO */}
       {showPagoModal && (
         <PagoRetiroModal
           isOpen={showPagoModal}
           onClose={() => setShowPagoModal(false)}
           servicio={servicioActual}
           saldoPendiente={saldoPendiente}
          onPagoCompletado={async (servicioActualizado, debeAbrirEntrega = false) => {
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
                
                // 🆕 Si debe abrir el modal de entrega (pago final completado), abrirlo automáticamente
                if (debeAbrirEntrega) {
                  // Verificar que el servicio esté en LISTO_RETIRO antes de abrir el modal
                  const estadoActual = servicioActualizado.estado;
                  const estadoNormalizadoActual = normalizarEstado(estadoActual);
                  
                  // Solo abrir el modal si el estado es LISTO_RETIRO y no hay saldo pendiente
                  if (estadoNormalizadoActual === 'Listo para Retiro' && nuevoSaldoPendiente <= 0) {
                    // Asegurar que el servicio local esté actualizado antes de abrir el modal
                    setServicioLocal(servicioActualizado);
                    
                    // Pequeño delay para que el usuario vea el mensaje de éxito y el estado se actualice
                    setTimeout(() => {
                      setShowModalEntrega(true);
                    }, 500);
                  } else {
                    console.warn('⚠️ No se puede abrir modal de entrega:', {
                      estado: estadoNormalizadoActual,
                      saldoPendiente: nuevoSaldoPendiente,
                      esperado: 'Listo para Retiro'
                    });
                    toast.warning('El servicio debe estar en estado "Listo para Retiro" para entregar');
                  }
                }
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

       {/* MODAL DE CONFIRMACIÓN DE ENTREGA */}
       {showModalEntrega && (
         <ModalConfirmarEntrega
           isOpen={showModalEntrega}
           onClose={() => setShowModalEntrega(false)}
           servicio={servicioActual}
           onEntregaCompletada={async (servicioActualizado) => {
             // Actualizar servicio local
             if (servicioActualizado) {
               actualizandoRef.current = true;
               setServicioLocal(servicioActualizado);
               
               setTimeout(() => {
                 actualizandoRef.current = false;
               }, 1000);
             }
             
             // Recargar servicio completo
             const servicioCompleto = await obtenerServicio(servicioActual.id);
             if (servicioCompleto) {
               setServicioLocal(servicioCompleto);
             }
             
             setShowModalEntrega(false);
             
             // Cerrar modal principal después de un delay
             setTimeout(() => {
               if (typeof onClose === 'function') {
                 onClose();
               }
             }, 1500);
           }}
         />
       )}
    </div>
  );
}