// components/servicios/ModalVerServicio.jsx - VERSIÓN OPTIMIZADA CON MEJORAS ESPECÍFICAS
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import X from 'lucide-react/dist/esm/icons/x'
import Flag from 'lucide-react/dist/esm/icons/flag'
import Inbox from 'lucide-react/dist/esm/icons/inbox'
import Stethoscope from 'lucide-react/dist/esm/icons/stethoscope'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Wrench from 'lucide-react/dist/esm/icons/wrench'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import PackageCheck from 'lucide-react/dist/esm/icons/package-check'
import User from 'lucide-react/dist/esm/icons/user'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import StickyNote from 'lucide-react/dist/esm/icons/sticky-note'
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Printer from 'lucide-react/dist/esm/icons/printer'
import Camera from 'lucide-react/dist/esm/icons/camera'
import Truck from 'lucide-react/dist/esm/icons/truck'
import Phone from 'lucide-react/dist/esm/icons/phone'
import Mail from 'lucide-react/dist/esm/icons/mail'
import MapPin from 'lucide-react/dist/esm/icons/map-pin'
import Zap from 'lucide-react/dist/esm/icons/zap'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import Mic from 'lucide-react/dist/esm/icons/mic'
import Banknote from 'lucide-react/dist/esm/icons/banknote'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import Building2 from 'lucide-react/dist/esm/icons/building-2'
import Coins from 'lucide-react/dist/esm/icons/coins'
import Laptop from 'lucide-react/dist/esm/icons/laptop'
import Monitor from 'lucide-react/dist/esm/icons/monitor'
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2'
import Tablet from 'lucide-react/dist/esm/icons/tablet'
import Watch from 'lucide-react/dist/esm/icons/watch'
import Headphones from 'lucide-react/dist/esm/icons/headphones'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
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

  // ✅ FIX: El store usa 'usuario', no 'user'. Aliamos para mantener compatibilidad con el código existente.
  const { socket, usuario: user } = useAuthStore();
  const { obtenerServicio, cambiarEstado } = useServiciosStore();
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
  const [clienteExpandido, setClienteExpandido] = useState(false);
  const [clienteDropdownPos, setClienteDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [dispositivoExpandido, setDispositivoExpandido] = useState(false);
  const [dispositivoDropdownPos, setDispositivoDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Estado para cancelación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const tooltipButtonRef = useRef(null);
  const clienteButtonRef = useRef(null);
  const dispositivoButtonRef = useRef(null);

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
  const problemaReportado = (Array.isArray(servicioActual.problemas) && servicioActual.problemas.length > 0
    ? servicioActual.problemas.join(', ')
    : servicioActual.problemas) ||
    servicioActual.fallaDeclarada ||
    servicioActual.problema ||
    '—';
  const diagnosticoTecnico = servicioActual.diagnostico || servicioActual.comentarios || servicioActual.observaciones || '—';

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
  // ✅ servicioActual.pagos contiene registros de servicioTecnicoPago
  // El campo 'monto' de cada pago YA está en USD (es el total del pago en USD)
  const totalPagadoCalculado = (servicioActual.pagos || []).reduce((acc, pago) => {
    return acc + (Number(pago.monto) || 0);
  }, 0);

  // ✅ Usar totalPagado del servicio (que viene del backend) o calcularlo desde pagos
  const totalPagado = parseFloat(servicioActual.totalPagado ?? totalPagadoCalculado);

  // ✅ Usar saldoPendiente del servicio (que viene del backend) o calcularlo
  const saldoPendiente = parseFloat(servicioActual.saldoPendiente ?? (totalGeneral - totalPagado));

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
        setTiempoTranscurrido(diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h`);
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

  const handleConfirmarCancelacion = async () => {
    if (!cancelReason.trim()) {
      toast.error('Debes ingresar un motivo para la cancelación');
      return;
    }

    try {
      setLoading(true);
      // Pasa inmediatamente el servicio a "CANCELADO" y agrega la nota
      await cambiarEstado(servicioActual.id, 'CANCELADO', `[ICON:FLAG] Orden Cancelada: ${cancelReason}`, true);

      toast.success('Orden cancelada exitosamente');
      setShowCancelModal(false);
      setCancelReason('');

    } catch (error) {
      console.error('Error cancelando orden:', error);
      toast.error('Error al cancelar la orden');
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

          <div className="relative px-6 py-3 text-white">
            {/* 🔧 HEADER EN UNA SOLA FILA */}
            <div className="flex items-center justify-between gap-4">
              {/* IZQUIERDA: Icono y Título */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  {estado.icon && React.cloneElement(estado.icon, { className: "h-4 w-4" })}
                </div>
                <div>
                  <h1 className="text-base font-bold leading-tight">Orden #{servicioActual.numeroServicio || servicioActual.id}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-white/90 text-[10px] font-medium flex items-center gap-1">
                      <User size={9} />
                      {tecnicoAsignado}
                    </span>
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/70 text-[10px] flex items-center gap-1">
                      <CalendarDays size={9} />
                      {formatearFecha(servicioActual.fechaIngreso)}
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
                    <span className="bg-red-500/40 px-2 py-0.5 rounded-full text-red-100 text-[9px] font-medium flex items-center gap-1 animate-pulse border border-red-400/50 whitespace-nowrap">
                      <AlertTriangle size={10} />
                      Vencido ({diasTranscurridos}d)
                    </span>
                  )}
                  {estadoNormalizado === 'Listo para Retiro' && (
                    <span className="bg-green-500/40 px-2 py-0.5 rounded-full text-green-100 text-[9px] font-medium flex items-center gap-1 border border-green-400/50 whitespace-nowrap">
                      <CheckCircle size={10} />
                      Listo
                    </span>
                  )}
                </div>

                {/* Barra de Progreso Compacta */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 flex items-center gap-2 min-w-[300px] max-w-[400px]">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[9px] mb-0.5">
                      <span className="text-white/80">Progreso</span>
                      <span className="text-white font-bold">{progreso}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5 shadow-inner relative overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden ${estadoNormalizado === 'Recibido'
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
                        style={{ width: `${progreso}%` }}
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
        <div className="flex-1 overflow-hidden p-4 bg-gray-900">
          <div className="grid grid-cols-[35fr_65fr] gap-4 h-full">

            {/* COLUMNA IZQUIERDA */}
            <div className="flex flex-col gap-3 min-h-0">

              {/* 🌟 INFORMACIÓN DE CLIENTE Y DISPOSITIVO - PREMIUM V2 */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/60 h-auto shrink-0 flex flex-col shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300 relative">
                {/* Efecto de fondo sutil */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-blue-400" />
                    Detalles del Cliente
                  </h3>
                  {/* ID Badge */}
                  <span className="text-[9px] font-mono text-gray-500 bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                    ID: {servicioActual.clienteId || 'N/A'}
                  </span>
                </div>

                <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto custom-scrollbar">

                  {/* Row: Cliente + Dispositivo */}
                  <div className="flex flex-row gap-2 w-full">
                    {/* 1. SECCIÓN CLIENTE (Portal Dropdown) */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Cliente</h4>
                      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50">
                        <button
                          ref={clienteButtonRef}
                          onClick={(e) => {
                            if (clienteButtonRef.current) {
                              const rect = clienteButtonRef.current.getBoundingClientRect();
                              setClienteDropdownPos({
                                top: rect.bottom + 5,
                                left: rect.left,
                                width: rect.width
                              });
                            }
                            setClienteExpandido(!clienteExpandido);
                            setDispositivoExpandido(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 hover:bg-gray-700/30 transition-colors rounded-xl"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 flex-shrink-0">
                              <User className="h-4 w-4 text-blue-300" />
                            </div>
                            <div className="text-left overflow-hidden">
                              <span className="block text-sm font-medium text-gray-200 truncate">{clienteNombre}</span>
                              <span className="block text-xs text-gray-400 truncate max-w-[120px]">{clienteTelefono || 'Sin teléfono'}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-1">
                            {clienteExpandido ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                          </div>
                        </button>

                        {/* PORTAL PARA CLIENTE */}
                        {clienteExpandido && createPortal(
                          <div
                            className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-200"
                            style={{
                              top: `${clienteDropdownPos.top}px`,
                              left: `${clienteDropdownPos.left}px`,
                              minWidth: `${clienteDropdownPos.width}px`
                            }}
                          >
                            <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 dropdown-portal">
                              <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2 text-xs text-gray-400 overflow-hidden">
                                    <MapPin size={12} className="text-gray-500 flex-shrink-0" />
                                    <span className="truncate">{clienteDireccion || 'Sin dirección'}</span>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0 ml-2">
                                    <button
                                      onClick={() => window.open(`tel:${clienteTelefono}`)}
                                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-700 hover:bg-green-500/20 text-gray-400 hover:text-green-400 border border-gray-600 hover:border-green-500/30 transition-all"
                                      title="Llamar"
                                    >
                                      <Phone size={13} />
                                    </button>
                                    <button
                                      onClick={() => window.open(`https://wa.me/${clienteTelefono?.replace(/\D/g, '')}`)}
                                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-700 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 border border-gray-600 hover:border-emerald-500/30 transition-all"
                                      title="WhatsApp"
                                    >
                                      <FaWhatsapp size={13} />
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-center gap-2 text-xs overflow-hidden">
                                    <Mail size={12} className="text-blue-400 flex-shrink-0" />
                                    <span className="text-gray-300 truncate" title={clienteEmail}>{clienteEmail || '—'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="absolute -top-1.5 left-6 w-3 h-3 bg-gray-800 border-t border-l border-gray-600 rotate-45 transform"></div>
                            </div>
                            <div className="fixed inset-0 -z-10" onClick={() => setClienteExpandido(false)}></div>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>

                    {/* 2. SECCIÓN DISPOSITIVO (Portal Dropdown) */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Dispositivo</h4>
                      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50">
                        <button
                          ref={dispositivoButtonRef}
                          onClick={(e) => {
                            if (dispositivoButtonRef.current) {
                              const rect = dispositivoButtonRef.current.getBoundingClientRect();
                              setDispositivoDropdownPos({
                                top: rect.bottom + 5,
                                left: rect.left,
                                width: rect.width
                              });
                            }
                            setDispositivoExpandido(!dispositivoExpandido);
                            setClienteExpandido(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 hover:bg-gray-700/30 transition-colors rounded-xl"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className={`p-1.5 rounded-lg ${dispositivoTipo === 'Apple' ? 'bg-white/10' : 'bg-green-500/10'} flex-shrink-0`}>
                              <IconoTipo className="h-4 w-4 text-green-300" />
                            </div>
                            <div className="text-left overflow-hidden">
                              <span className="block text-sm font-medium text-gray-200 truncate">{etiquetaTipo}</span>
                              <span className="block text-xs text-gray-400 truncate max-w-[120px]">{dispositivoMarca} {dispositivoModelo}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-1">
                            {dispositivoExpandido ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                          </div>
                        </button>

                        {/* PORTAL PARA DISPOSITIVO (OSCURO) */}
                        {dispositivoExpandido && createPortal(
                          <div
                            className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-200"
                            style={{
                              top: `${dispositivoDropdownPos.top}px`,
                              left: `${dispositivoDropdownPos.left}px`,
                              minWidth: `${dispositivoDropdownPos.width}px`
                            }}
                          >
                            <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 dropdown-portal space-y-3">
                              <div className="space-y-2 pb-2 border-b border-gray-700">
                                <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                                  <div className="flex items-center gap-1.5 mb-1 text-red-400">
                                    <AlertTriangle size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Problema Reportado</span>
                                  </div>
                                  <p className="text-xs text-gray-300 leading-snug">
                                    {(typeof servicioActual.descripcionProblema === 'string' ? servicioActual.descripcionProblema : servicioActual.descripcionProblema?.contenido) || problemaReportado || '—'}
                                  </p>
                                </div>
                                <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                                  <div className="flex items-center gap-1.5 mb-1 text-blue-400">
                                    <Stethoscope size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Notas Técnicas</span>
                                  </div>
                                  <p className="text-xs text-gray-300 leading-snug">
                                    Hay <span className="text-blue-300 font-bold">{notas.length}</span> notas técnicas
                                  </p>
                                </div>

                                {/* 🆕 OBSERVACIONES / DIAGNÓSTICO INICIAL */}
                                {(servicioActual.observaciones || diagnosticoTecnico) && (
                                  <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20 col-span-2">
                                    <div className="flex items-center gap-1.5 mb-1 text-purple-400">
                                      <StickyNote size={12} />
                                      <span className="text-[10px] font-bold uppercase tracking-wider">Diagnóstico Inicial / Observaciones</span>
                                    </div>
                                    <p className="text-xs text-gray-300 leading-snug">
                                      {servicioActual.observaciones || diagnosticoTecnico}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                                <div>
                                  <span className="block text-gray-500 text-[10px] mb-0.5">IMEI / Serial</span>
                                  <span className="font-mono text-gray-200 break-all">{dispositivoImei}</span>
                                </div>
                                <div>
                                  <span className="block text-gray-500 text-[10px] mb-0.5">Color</span>
                                  <span className="text-gray-200">{dispositivoColor || '—'}</span>
                                </div>
                                {accesorios.length > 0 && (
                                  <div className="col-span-2 mt-1 pt-2 border-t border-gray-700">
                                    <span className="block text-gray-500 text-[10px] mb-1">Accesorios</span>
                                    <div className="flex flex-wrap gap-1">
                                      {accesorios.map((acc, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-[10px] border border-gray-600">
                                          {acc}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="absolute -top-1.5 left-6 w-3 h-3 bg-gray-800 border-t border-l border-gray-600 rotate-45 transform"></div>
                            </div>
                            <div className="fixed inset-0 -z-10" onClick={() => setDispositivoExpandido(false)}></div>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. METADATA (Fechas y Estado) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/30 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] text-gray-500 mb-0.5">Ingreso</span>
                      <span className="text-[10px] font-medium text-gray-300">{formatearFecha(servicioActual.fechaIngreso)}</span>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/30 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] text-gray-500 mb-0.5">Estimado</span>
                      <span className="text-[10px] font-medium text-gray-300">{formatearFecha(fechaEntrega)}</span>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/30 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className={`absolute inset-0 opacity-10 ${estaVencido ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <span className="text-[9px] text-gray-500 mb-0.5">Días Taller</span>
                      <div className={`text-[10px] font-bold flex items-center gap-1 ${estaVencido ? 'text-red-400' : 'text-blue-300'}`}>
                        {diasTranscurridos} días
                        {estaVencido && <AlertTriangle size={10} />}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* INFORMACIÓN DE ITEMS - PREMIUM REFINED */}
              <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-700/60 flex-1 flex flex-col min-h-0 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="p-4 border-b border-gray-700 flex-shrink-0 bg-gradient-to-r from-gray-900 to-gray-800 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                  <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2 relative z-10 uppercase tracking-wide">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                      <ShoppingCart className="h-4 w-4 text-emerald-400" />
                    </div>
                    Productos y Servicios
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-300 border border-emerald-500/30 font-mono">
                      {items.length}
                    </span>
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-3 custom-scrollbar">
                  <div className="overflow-x-auto rounded-xl border border-gray-700/50">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-900/80 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-bold text-gray-400 uppercase text-[10px] tracking-wider">Descripción</th>
                          <th className="px-3 py-2.5 text-center font-bold text-gray-400 uppercase text-[10px] tracking-wider w-12 sm:w-16">Cant.</th>
                          <th className="px-3 py-2.5 text-right font-bold text-gray-400 uppercase text-[10px] tracking-wider w-24">P. Unit.</th>
                          <th className="px-3 py-2.5 text-right font-bold text-gray-400 uppercase text-[10px] tracking-wider w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/40 bg-gray-800/30">
                        {items.length > 0 ? (
                          items.map((item, i) => {
                            const precioUnitario = Number((item.precioUnitario || item.precio_unitario || item.precio) ?? 0);
                            const cantidad = Number(item.cantidad ?? 0);
                            const subtotal = precioUnitario * cantidad;
                            const precioUnitarioBs = precioUnitario * tasa;
                            const subtotalBs = subtotal * tasa;
                            return (
                              <tr key={i} className="hover:bg-white/5 transition-colors group/row">
                                <td className="px-3 py-2.5 text-gray-300 font-medium break-words align-middle">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover/row:bg-emerald-400 transition-colors"></div>
                                    <span title={item.descripcion || item.nombre || '—'}>{item.descripcion || item.nombre || '—'}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center text-gray-400 font-mono align-middle">{cantidad}</td>
                                <td className="px-3 py-2.5 text-right text-gray-400 whitespace-nowrap align-middle">
                                  <div className="text-gray-300 font-medium">{formatearBs(precioUnitarioBs)} Bs</div>
                                  <div className="text-[9px] text-gray-500">${precioUnitario.toFixed(2)}</div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold text-emerald-400 whitespace-nowrap align-middle">
                                  <div className="text-emerald-300">{formatearBs(subtotalBs)} Bs</div>
                                  <div className="text-[9px] text-emerald-600/80">${subtotal.toFixed(2)}</div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-3 py-12 text-center text-gray-500 italic">
                              <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-gray-800 rounded-full border border-gray-700">
                                  <ShoppingCart className="h-6 w-6 text-gray-600" />
                                </div>
                                <span className="text-xs font-medium">No hay productos registrados</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Totales */}
                <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex-shrink-0 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-medium">Subtotal</span>
                      <div className="text-gray-100 font-bold tracking-tight">{formatearBs(totalGeneralBs)} Bs <span className="text-gray-500 text-xs font-normal ml-1">(${totalGeneral.toFixed(2)})</span></div>
                    </div>

                    {totalPagado > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-700/50 text-xs">
                        <span className="text-gray-400">Pagado</span>
                        <div className="text-emerald-400 font-semibold">{formatearBs(totalPagadoBs)} Bs <span className="text-emerald-600/70 ml-1">(${parseFloat(totalPagado).toFixed(2)})</span></div>
                      </div>
                    )}

                    {saldoPendiente > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-700/50 text-sm">
                        <span className="text-gray-300 font-bold">Saldo Pendiente</span>
                        <div className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 shadow-sm">{formatearBs(saldoPendienteBs)} Bs <span className="text-red-500/70 text-xs ml-1">(${parseFloat(saldoPendiente).toFixed(2)})</span></div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-700/50">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>Tasa de cambio</span>
                        <span className="font-mono bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{formatearBs(tasa)} Bs/USD</span>
                      </div>
                    </div>

                    {/* 💰 HISTORIAL DE PAGOS Y MÉTODOS */}
                    {(servicioActual.pagos && servicioActual.pagos.length > 0) && (
                      <div className="pt-3 border-t border-gray-700 mt-2">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3" />
                          Historial de Pagos
                        </div>
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                          {servicioActual.pagos.map((pago, pagoIdx) => {
                            // Parsear pagos si viene como string
                            const pagosParsed = typeof pago.pagos === 'string'
                              ? JSON.parse(pago.pagos)
                              : pago.pagos || [];

                            return (
                              <div key={pagoIdx} className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                                <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-gray-700/50">
                                  <span className="text-[10px] font-medium text-gray-300 flex items-center gap-1">
                                    {pago.tipo === 'PAGO_INICIAL' ? <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> : <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                                    {pago.tipo === 'PAGO_INICIAL' ? 'Inicial' : 'Final'}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-gray-200">
                                    ${parseFloat(pago.monto).toFixed(2)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {pagosParsed.map((metodoPago, metodoIdx) => (
                                    <div
                                      key={metodoIdx}
                                      className="flex items-center justify-between text-[9px]"
                                    >
                                      <span className="text-gray-400 truncate flex-1 flex items-center gap-1">
                                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                                        {(() => {
                                          const labelMap = {
                                            'efectivo_bs': 'Efectivo Bs',
                                            'efectivo_usd': 'Efectivo USD',
                                            'pago_movil': 'Pago Móvil',
                                            'transferencia': 'Transferencia',
                                            'zelle': 'Zelle',
                                            'binance': 'Binance',
                                            'tarjeta': 'Tarjeta'
                                          };
                                          return labelMap[metodoPago.metodo] || metodoPago.metodo;
                                        })()}
                                      </span>
                                      <span className="text-gray-300 font-medium ml-2">
                                        {metodoPago.moneda === 'bs' ? 'Bs ' : '$'}
                                        {parseFloat(metodoPago.monto).toLocaleString('es-VE', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

                        return (
                          <>
                            {partes.map((parte, i) => {
                              if (parte.startsWith('[ICON:')) {
                                const iconInfo = iconMap[parte];
                                if (iconInfo) {
                                  const { Icon, color } = iconInfo;
                                  return <Icon key={i} size={16} className={`inline-block mr-1.5 ${color} align-middle`} />;
                                }
                                // Si el icono no se encuentra en el mapa, no mostrar nada
                                return null;
                              }
                              return <span key={i}>{parte}</span>;
                            })}
                          </>
                        );
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
                          // Renderizar grupo: texto + imágenes o solo imágenes
                          // ✅ Buscar nota de texto usando .find() como en ModalHistoriaServicio.jsx
                          const notaTexto = item.notas.find(n => (n.tipo?.toLowerCase() || '') === 'texto');
                          const imagenesNotas = item.notas.filter(n => (n.tipo?.toLowerCase() || '') === 'imagen');

                          // Si no hay texto, usar la primera nota como referencia
                          const primeraNota = notaTexto || item.notas[0];

                          const contenidoNota = notaTexto ? (notaTexto.contenido || notaTexto.mensaje || notaTexto.texto || '') : '';
                          const fechaNota = primeraNota.fecha || primeraNota.createdAt || primeraNota.updatedAt;
                          const tipoNota = notaTexto ? (notaTexto.tipo?.toLowerCase() || '') : '';

                          // Recopilar todas las imágenes del grupo
                          const imagenes = imagenesNotas
                            .map(n => n.imagen || n.archivoUrl)
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
                          const imagenes = tipoNota === 'imagen' && (nota.imagen || nota.archivoUrl)
                            ? [nota.imagen || nota.archivoUrl]
                            : Array.isArray(nota.imagenes)
                              ? nota.imagenes
                              : ((nota.imagen || nota.archivoUrl) && tipoNota !== 'audio' ? [nota.imagen || nota.archivoUrl] : []);

                          // Detectar audio
                          const audioUrl = tipoNota === 'audio'
                            ? (nota.archivoUrl || nota.audio)
                            : null;

                          // ✅ Si es una nota de cambio_estado sin los campos necesarios, no renderizarla
                          if (tipoNota === 'cambio_estado' && (!nota.estadoAnterior || !nota.estadoNuevo)) {
                            // Si tampoco tiene contenido ni imágenes ni audio, no mostrar nada
                            if (!contenidoNota && imagenes.length === 0 && !audioUrl) {
                              return null;
                            }
                          }

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
                              {/* Mostrar contenido solo si existe */}
                              {/* ✅ Si es cambio_estado CON ambos campos (estadoAnterior Y estadoNuevo), no mostrar contenido (se muestra visualmente abajo) */}
                              {/* ✅ Si es cambio_estado SIN ambos campos completos, SÍ mostrar contenido (es texto normal) */}
                              {contenidoNota && (tipoNota !== 'cambio_estado' || !nota.estadoAnterior || !nota.estadoNuevo) && (
                                <div className="text-gray-100 text-sm leading-relaxed mb-3 font-medium">
                                  {renderizarContenidoConIconos(contenidoNota)}
                                </div>
                              )}

                              {/* Renderizar cambio de estado visualmente (solo si tiene estadoAnterior/estadoNuevo) */}
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

        {/* FOOTER OPTIMIZADO - ESTILO PREMIUM */}
        <div className="flex-shrink-0 bg-gradient-to-b from-gray-800 to-gray-900 px-6 py-5 border-t border-gray-700/50 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] z-10 relative flex justify-between items-center">
          {/* GRUPO IZQUIERDO: Herramientas y Acciones Secundarias */}
          <div className="flex items-center gap-3">
            {/* Cancelar */}
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={estadoNormalizado === 'Entregado' || estadoNormalizado === 'Cancelado' || user?.rol !== 'admin'}
              className={`h-11 px-4 rounded-xl border flex items-center gap-2 font-medium transition-all duration-200 ${estadoNormalizado === 'Entregado' || estadoNormalizado === 'Cancelado' || user?.rol !== 'admin'
                  ? 'bg-gray-800/50 border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/10'
                }`}
              title={user?.rol !== 'admin' ? "Solo administradores pueden cancelar" : "Cancelar Orden"}
            >
              <Flag size={16} />
              <span className="hidden sm:inline">Cancelar</span>
            </button>

            {/* Reimprimir */}
            <button
              onClick={handleReimprimirOrden}
              className="h-11 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Reimprimir</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleNotificarWhatsApp}
              className="h-11 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-green-500/50 hover:text-green-400 text-gray-300 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <FaWhatsapp size={16} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>

          {/* GRUPO DERECHO: Acción Principal */}
          <div className="flex items-center gap-4">
            {/* Info de actualización (oculta en móvil) */}
            {servicio.ultimaActualizacion && (
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 mr-2">
                <Zap size={12} />
                <span>Actualizado: {tiempoTranscurrido || 'Reciente'}</span>
              </div>
            )}

            {/* Botón Principal (Pago o Entrega) */}
            {(tieneSaldoPendiente || (estadoNormalizado === 'Listo para Retiro' && !tieneSaldoPendiente)) && (
              <button
                onClick={tieneSaldoPendiente ? () => setShowPagoModal(true) : handleEntregarDispositivo}
                className={`h-11 px-6 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 ${!tieneSaldoPendiente && estadoNormalizado === 'Listo para Retiro'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/20'
                  }`}
              >
                {tieneSaldoPendiente ? <CreditCard size={18} /> : <Truck size={18} />}
                <span>
                  {tieneSaldoPendiente
                    ? (estadoNormalizado === 'Listo para Retiro' ? 'Pagar y Entregar' : 'Registrar Pago')
                    : 'Entregar Dispositivo'}
                </span>
              </button>
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

      {/* MODAL DE CANCELACIÓN DE ORDEN */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-red-900/50 shadow-2xl overflow-hidden animate-modal-enter">
            <div className="px-6 py-4 bg-gradient-to-r from-red-900/40 to-red-800/20 border-b border-red-900/30 flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-100 flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                Cancelar Orden
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200/80">
                  Esta acción marcará la orden como <strong>Entregada</strong> y agregará una nota de cancelación. Esta acción es irreversible.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Motivo de la cancelación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explique por qué se cancela la orden..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none h-24 text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarCancelacion}
                disabled={!cancelReason.trim() || loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Flag size={16} />
                    Confirmar Cancelación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}