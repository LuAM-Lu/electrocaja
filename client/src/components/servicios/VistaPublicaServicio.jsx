// client/src/components/servicios/VistaPublicaServicio.jsx
// Vista pública para que el cliente vea el progreso de su orden (sin botones de acción)
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Inbox, Stethoscope, Clock, Wrench, CheckCircle, PackageCheck,
  User, CalendarDays, DollarSign, StickyNote, ShoppingCart, AlertTriangle,
  Camera, Mic, CreditCard, Banknote, Smartphone, Building2, Coins, ChevronDown, ChevronUp, Zap, Flag
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { CgInstagram } from 'react-icons/cg';
import { api } from '../../config/api';

const estadoConfig = {
  'RECIBIDO': { color: 'bg-gradient-to-r from-purple-400 to-purple-600', textColor: 'text-gray-100', icon: <Inbox size={14} />, progreso: 0, label: 'Recibido' },
  'EN_DIAGNOSTICO': { color: 'bg-gradient-to-r from-amber-700 to-yellow-800', textColor: 'text-amber-100', icon: <Stethoscope size={14} />, progreso: 25, label: 'En Diagnóstico' },
  'ESPERANDO_APROBACION': { color: 'bg-gradient-to-r from-orange-700 to-red-800', textColor: 'text-orange-100', icon: <Clock size={14} />, progreso: 50, label: 'Esperando Aprobación' },
  'EN_REPARACION': { color: 'bg-gradient-to-r from-red-800 to-red-900', textColor: 'text-red-100', icon: <Wrench size={14} />, progreso: 75, label: 'En Reparación' },
  'LISTO_RETIRO': { color: 'bg-gradient-to-r from-emerald-700 to-green-800', textColor: 'text-emerald-100', icon: <CheckCircle size={14} />, progreso: 100, label: 'Listo para Retiro' },
  'ENTREGADO': { color: 'bg-gradient-to-r from-gray-800 to-gray-900', textColor: 'text-gray-200', icon: <PackageCheck size={14} />, progreso: 100, label: 'Entregado' }
};

// Utilidades
const formatearFecha = (fecha) => {
  if (!fecha) return '—';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-VE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const calcularDiasTranscurridos = (fechaIngreso) => {
  if (!fechaIngreso) return 0;
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  if (isNaN(ingreso.getTime())) return 0;
  
  const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const ingresoNormalizado = new Date(ingreso.getFullYear(), ingreso.getMonth(), ingreso.getDate());
  
  const diff = Math.floor((hoyNormalizado - ingresoNormalizado) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
};

export default function VistaPublicaServicio() {
  const { token } = useParams();
  const [servicio, setServicio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [tasaCambioBackend, setTasaCambioBackend] = useState(37.50); // 🆕 Tasa del backend
  const [clienteExpandido, setClienteExpandido] = useState(false); // Por defecto cerrado
  const [dispositivoExpandido, setDispositivoExpandido] = useState(false); // Por defecto cerrado
  const [fechasExpandido, setFechasExpandido] = useState(false); // Por defecto cerrado

  // Cargar servicio desde API pública
  useEffect(() => {
    if (!token) {
      setError('Token no válido');
      setLoading(false);
      return;
    }

    const cargarServicio = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/servicios/publico/${token}`);

        if (response.data.success) {
          setServicio(response.data.data);

          // 🆕 Usar tasa del backend si está disponible
          if (response.data.data.tasaCambio) {
            setTasaCambioBackend(parseFloat(response.data.data.tasaCambio));
          }
        } else {
          setError(response.data.message || 'Servicio no encontrado');
        }
      } catch (error) {
        console.error('Error cargando servicio:', error);
        setError(error.response?.data?.message || 'Error al cargar el servicio');
      } finally {
        setLoading(false);
      }
    };

    cargarServicio();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Cargando información del servicio...</p>
        </div>
      </div>
    );
  }

  if (error || !servicio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-red-500/50">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Servicio no encontrado</h1>
            <p className="text-gray-400">{error || 'El servicio solicitado no existe o ya fue entregado'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Normalizar estado
  const estadoNormalizado = servicio.estado || 'RECIBIDO';
  const estado = estadoConfig[estadoNormalizado] || estadoConfig['RECIBIDO'];
  const progreso = estado.progreso ?? 0;
  const diasTranscurridos = calcularDiasTranscurridos(servicio.fechaIngreso);
  const estaVencido = diasTranscurridos > 5 && (estadoNormalizado === 'RECIBIDO' || estadoNormalizado === 'EN_DIAGNOSTICO');

  // Calcular totales
  const items = servicio.items || [];
  const totalGeneral = items.reduce((acc, item) => {
    const precio = Number((item.precioUnitario || item.precio_unitario || item.precio) ?? 0);
    const cantidad = Number(item.cantidad ?? 0);
    return acc + (precio * cantidad);
  }, 0) || parseFloat(servicio.totalEstimado || 0);

  // ✅ servicio.pagos contiene registros de servicioTecnicoPago
  // El campo 'monto' de cada pago YA está en USD (es el total del pago en USD)
  const totalPagadoCalculado = (servicio.pagos || []).reduce((acc, pago) => {
    return acc + (Number(pago.monto) || 0);
  }, 0);

  // ✅ Usar totalPagado del servicio (que viene del backend) o calcularlo desde pagos
  const totalPagado = parseFloat(servicio.totalPagado ?? totalPagadoCalculado);

  // ✅ Usar saldoPendiente del servicio (que viene del backend) o calcularlo
  const saldoPendiente = parseFloat(servicio.saldoPendiente ?? (totalGeneral - totalPagado));
  
  // 🆕 Convertir montos a Bs usando la tasa de cambio del backend
  const tasa = tasaCambioBackend || 37.50;
  const totalGeneralBs = totalGeneral * tasa;
  const totalPagadoBs = totalPagado * tasa;
  const saldoPendienteBs = saldoPendiente * tasa;

  // Formatear montos en Bs
  const formatearBs = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  const notas = servicio.notas || [];

  // Función para renderizar contenido con iconos
  const renderizarContenidoConIconos = (texto) => {
    if (!texto) return <i className="text-gray-500">Sin mensaje</i>;

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
      '[ICON:PACKAGE]': { Icon: PackageCheck, color: 'text-gray-400' }
    };

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

  // Función para obtener configuración de estado por código
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

  // Función para renderizar cambio de estado visualmente
  const renderizarCambioEstado = (nota) => {
    if (nota.tipo?.toLowerCase() !== 'cambio_estado' || !nota.estadoAnterior || !nota.estadoNuevo) {
      return null;
    }

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

  // Obtener estilo de nota
  const obtenerEstiloNota = (nota) => {
    const tipoNota = nota.tipo?.toLowerCase() || '';
    const contenidoNota = nota.contenido || '';
    
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

  // Función para extraer el nombre del archivo de una URL
  const obtenerNombreArchivo = (url) => {
    if (!url) return 'Imagen';
    
    // Si es una data URL, retornar un nombre genérico
    if (url.startsWith('data:')) {
      return `Imagen ${new Date().getTime()}`;
    }
    
    // Intentar extraer el nombre del archivo de la URL
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const nombre = pathname.split('/').pop() || 'Imagen';
      
      // Si el nombre es muy largo o no tiene extensión, simplificarlo
      if (nombre.length > 30) {
        const extension = nombre.split('.').pop();
        return `Imagen.${extension || 'jpg'}`;
      }
      
      return nombre || 'Imagen';
    } catch (e) {
      // Si falla el parsing, intentar extraer de la cadena directamente
      const partes = url.split('/');
      const nombre = partes[partes.length - 1] || 'Imagen';
      
      // Limpiar parámetros de query si existen
      const nombreLimpio = nombre.split('?')[0];
      
      return nombreLimpio || 'Imagen';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* HEADER PÚBLICO */}
      <div className={`relative ${estado.color} overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
          }} />
        </div>

        <div className="relative px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 text-white">
          <div className="max-w-7xl mx-auto">
            {/* LOGO Y TÍTULO */}
            <div className="flex flex-col items-center mb-4 sm:mb-5 md:mb-6">
              <img
                src="/android-chrome-512x512.png"
                alt="Logo Electro Shop"
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full object-cover mb-3 sm:mb-4 border-2 border-white/30 shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-1">
                Electro Shop Morandin C.A.
              </h1>
              <p className="text-xs sm:text-sm text-white/80 text-center">
                Seguimiento de Servicio Técnico
              </p>
            </div>

            {/* NÚMERO DE ORDEN - SOLO ICONO + NÚMERO */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="bg-white/20 p-2 sm:p-3 rounded-lg sm:rounded-xl backdrop-blur-sm">
                {estado.icon && React.cloneElement(estado.icon, { className: "h-5 w-5 sm:h-6 sm:w-6" })}
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold whitespace-nowrap">#{servicio.numeroServicio || servicio.id}</h2>
            </div>

            {/* BADGES DE ESTADO Y VENCIMIENTO */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {estaVencido && (
                <span className="bg-red-500/40 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-red-100 text-xs font-medium flex items-center gap-1 animate-pulse border border-red-400/50">
                  <AlertTriangle size={12} />
                  <span className="hidden sm:inline">Vencido</span>
                  <span className="sm:hidden">Venc.</span>
                  <span>({diasTranscurridos}d)</span>
                </span>
              )}
            </div>

            {/* Barra de Progreso */}
            <div className="mt-4 sm:mt-5 md:mt-6 bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-5 md:px-6 py-3 sm:py-4 border border-white/20">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-white/80">Progreso del Servicio</span>
                <span className="text-white font-bold">{progreso}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 shadow-inner relative overflow-hidden">
                <div 
                  className={`h-2 sm:h-3 rounded-full transition-all duration-1000 ease-out shadow-lg ${
                    estadoNormalizado === 'RECIBIDO' 
                      ? 'bg-gradient-to-r from-purple-400 to-purple-600'
                      : estadoNormalizado === 'EN_DIAGNOSTICO'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                      : estadoNormalizado === 'ESPERANDO_APROBACION'
                      ? 'bg-gradient-to-r from-orange-400 to-red-500'
                      : estadoNormalizado === 'EN_REPARACION'
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : estadoNormalizado === 'LISTO_RETIRO'
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}
                  style={{width: `${progreso}%`}}
                >
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
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          
          {/* COLUMNA IZQUIERDA - INFORMACIÓN */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Información del Cliente - DESPLEGABLE */}
            <div className="bg-gray-800/70 rounded-lg sm:rounded-xl border border-gray-700 shadow-lg overflow-hidden">
              <button
                onClick={() => setClienteExpandido(!clienteExpandido)}
                className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
              >
                <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                  <span className="truncate">Información del Cliente</span>
                </h3>
                {clienteExpandido ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {clienteExpandido && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-400">Cliente:</span>
                    <div className="text-gray-100 font-medium">{servicio.clienteNombre || '—'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">CI/RIF:</span>
                    <div className="text-gray-100">{servicio.clienteCedulaRif || '—'}</div>
                  </div>
                  {servicio.clienteTelefono && (
                    <div>
                      <span className="text-gray-400">Teléfono:</span>
                      <div className="text-gray-100">{servicio.clienteTelefono}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Información del Dispositivo - DESPLEGABLE */}
            <div className="bg-gray-800/70 rounded-lg sm:rounded-xl border border-gray-700 shadow-lg overflow-hidden">
              <button
                onClick={() => setDispositivoExpandido(!dispositivoExpandido)}
                className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
              >
                <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">Dispositivo</span>
                </h3>
                {dispositivoExpandido ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {dispositivoExpandido && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-400">Marca/Modelo:</span>
                    <div className="text-gray-100 font-medium">{servicio.dispositivoMarca} {servicio.dispositivoModelo}</div>
                  </div>
                  {servicio.dispositivoColor && (
                    <div>
                      <span className="text-gray-400">Color:</span>
                      <div className="text-gray-100">{servicio.dispositivoColor}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">IMEI:</span>
                    <div className="text-gray-100 font-mono text-xs">{servicio.dispositivoImei || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Problemas:</span>
                    <div className="text-gray-100 mt-1">
                      {Array.isArray(servicio.problemas) 
                        ? servicio.problemas.join(', ')
                        : servicio.problemas || '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Información de Fechas - DESPLEGABLE */}
            <div className="bg-gray-800/70 rounded-lg sm:rounded-xl border border-gray-700 shadow-lg overflow-hidden">
              <button
                onClick={() => setFechasExpandido(!fechasExpandido)}
                className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
              >
                <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                  <span className="truncate">Fechas</span>
                </h3>
                {fechasExpandido ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {fechasExpandido && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-400">Fecha de Ingreso:</span>
                    <div className="text-gray-100">{formatearFecha(servicio.fechaIngreso)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Fecha Estimada de Entrega:</span>
                    <div className="text-gray-100 font-medium">{formatearFecha(servicio.fechaEntregaEstimada)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Días Transcurridos:</span>
                    <div className={`font-medium ${estaVencido ? 'text-red-400' : 'text-gray-100'}`}>
                      {diasTranscurridos} días
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Técnico Asignado y Estado */}
            <div className="bg-gray-800/70 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-700 shadow-lg">
              <div className="grid grid-cols-[auto_1fr_auto] gap-3">
                {/* Icono del técnico ocupando 2 filas */}
                <div className="flex items-stretch">
                  <div className="flex items-center justify-center bg-purple-500/20 rounded-md px-2 sm:px-3 h-full">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 flex-shrink-0" />
                  </div>
                </div>
                {/* Columna central: Técnico */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-400">Técnico Asignado</h3>
                  <div className="text-xs sm:text-sm text-gray-100 font-medium break-words">
                    {servicio.tecnicoAsignado || 'Sin asignar'}
                  </div>
                </div>
                {/* Columna derecha: Badge de estado ocupando 2 filas */}
                <div className="flex items-stretch">
                  <span className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md font-medium ${estado.color} ${estado.textColor} whitespace-nowrap h-full`}>
                    {estado.icon}
                    <span>{estado.label}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA - ITEMS Y NOTAS */}
          <div className="md:col-span-1 lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
            
            {/* Productos, Servicios e Información Financiera - COMBINADO - ESTILO FACTURA */}
            {items.length > 0 && (
              <div className="bg-gray-800/70 rounded-lg sm:rounded-xl border border-gray-700 shadow-lg">
                <div className="p-3 sm:p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/50">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2 flex-wrap">
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">Productos y Servicios</span>
                    <span className="text-xs bg-emerald-900/30 px-2 py-0.5 rounded-full text-emerald-300 border border-emerald-700/50">
                      {items.length}
                    </span>
                  </h3>
                </div>
                <div className="p-2 sm:p-3">
                  {/* Tabla estilo factura - Compacta y Responsive */}
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-[10px] sm:text-xs min-w-full">
                      <thead className="bg-gray-700/50 border-b-2 border-gray-600">
                        <tr>
                          <th className="px-1.5 sm:px-2 py-1.5 text-left font-semibold text-gray-300">Descripción</th>
                          <th className="px-1.5 sm:px-2 py-1.5 text-center font-semibold text-gray-300 w-10 sm:w-14">Cant.</th>
                          <th className="px-1.5 sm:px-2 py-1.5 text-right font-semibold text-gray-300 w-18 sm:w-24">P. Unit.</th>
                          <th className="px-1.5 sm:px-2 py-1.5 text-right font-semibold text-gray-300 w-22 sm:w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {items.map((item, i) => {
                          const precioUnitario = Number((item.precioUnitario || item.precio_unitario || item.precio) ?? 0);
                          const cantidad = Number(item.cantidad ?? 0);
                          const subtotal = precioUnitario * cantidad;
                          const precioUnitarioBs = precioUnitario * tasa;
                          const subtotalBs = subtotal * tasa;
                          return (
                            <tr key={i} className="hover:bg-gray-700/30 transition-colors">
                              <td className="px-1.5 sm:px-2 py-1.5 text-gray-100 font-medium break-words max-w-[100px] sm:max-w-none">
                                <div className="truncate sm:break-words" title={item.descripcion || '—'}>
                                  {item.descripcion || '—'}
                                </div>
                              </td>
                              <td className="px-1.5 sm:px-2 py-1.5 text-center text-gray-300 whitespace-nowrap">{cantidad}</td>
                              <td className="px-1.5 sm:px-2 py-1.5 text-right text-gray-300 whitespace-nowrap text-[9px] sm:text-xs">
                                {formatearBs(precioUnitarioBs)} Bs
                              </td>
                              <td className="px-1.5 sm:px-2 py-1.5 text-right text-emerald-400 font-semibold whitespace-nowrap text-[9px] sm:text-xs">
                                {formatearBs(subtotalBs)} Bs
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Información Financiera Combinada - Estilo Factura Compacta */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-gray-600">
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
            )}

            {/* Historial de Pagos */}
            {servicio.pagos && servicio.pagos.length > 0 && (
              <div className="bg-gray-800/70 rounded-lg sm:rounded-xl border border-gray-700 shadow-lg">
                <div className="p-3 sm:p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/50">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                    Historial de Pagos
                  </h3>
                </div>
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {servicio.pagos.map((pago, idx) => (
                    <div key={idx} className="bg-gray-700/30 rounded-lg p-2.5 sm:p-3 border border-gray-600/50">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm text-gray-100 font-medium break-words">
                            {pago.tipo === 'PAGO_INICIAL' ? 'Pago Inicial' : 
                             pago.tipo === 'PAGO_ABONO' ? 'Abono' : 
                             pago.tipo === 'PAGO_FINAL' ? 'Pago Final' : 'Pago'}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 sm:mt-1">{formatearFecha(pago.fecha)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs sm:text-sm text-emerald-400 font-bold whitespace-nowrap">{formatearBs(Number(pago.monto) * tasa)} Bs</div>
                        </div>
                      </div>
                      {Array.isArray(pago.pagos) && pago.pagos.length > 0 && (
                        <div className="text-xs text-gray-400 mt-2 break-words">
                          Métodos: {pago.pagos.map(p => p.metodo?.replace('_', ' ').toUpperCase() || 'N/A').join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas e Imágenes */}
            <div className="bg-gray-800/70 rounded-lg sm:rounded-xl border border-gray-700 shadow-lg">
              <div className="p-3 sm:p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/50">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2 flex-wrap">
                  <StickyNote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0" />
                  <span className="truncate">Notas e Imágenes</span>
                  {notas.length > 0 && (
                    <span className="text-xs bg-yellow-900/30 px-2 py-0.5 rounded-full text-yellow-300 border border-yellow-700/50">
                      {notas.length}
                    </span>
                  )}
                </h3>
              </div>
              <div className="p-3 sm:p-4">
                {notas.length > 0 ? (
                  (() => {
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
                    
                    return (
                  <div className="space-y-3">
                        {notasAgrupadas.map((item, idx) => {
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

                            // ✅ MEJOR PRÁCTICA: Mantener objetos completos de notas con imágenes
                            // Filtrar solo las que tienen imagen válida
                            const imagenes = imagenesNotas.filter(n => n.imagen || n.archivoUrl);

                            // 🐛 DEBUG: Log para verificar imágenes en grupos
                            console.log(`📸 GRUPO ${idx} - Análisis de imágenes:`, {
                              grupoId: primeraNota.grupoId,
                              totalNotasEnGrupo: item.notas.length,
                              imagenesNotas: imagenesNotas.length,
                              imagenesFiltradas: imagenes.length,
                              urls: imagenes.map(img => ({
                                id: img.id,
                                imagen: img.imagen,
                                archivoUrl: img.archivoUrl,
                                nombreArchivo: img.nombreArchivo,
                                url_final: img.imagen || img.archivoUrl
                              })),
                              todasLasNotas: item.notas.map(n => ({
                                id: n.id,
                                tipo: n.tipo,
                                imagen: n.imagen,
                                archivoUrl: n.archivoUrl
                              }))
                            });

                            return (
                              <div key={`grupo-${idx}`} className={`${obtenerEstiloNota(primeraNota)} rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-gray-300 text-xs mb-2 sm:mb-3">
                                  <span className="font-medium">{formatearFecha(fechaNota)}</span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {imagenes.length > 0 && (
                                      <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                        <Camera size={11} className="sm:w-3 sm:h-3" />
                                        {imagenes.length}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Mostrar texto solo si existe */}
                                {/* ✅ Si es cambio_estado CON ambos campos (estadoAnterior Y estadoNuevo), no mostrar contenido (se muestra visualmente abajo) */}
                                {/* ✅ Si es cambio_estado SIN ambos campos completos, SÍ mostrar contenido (es texto normal) */}
                                {contenidoNota && (tipoNota !== 'cambio_estado' || !primeraNota.estadoAnterior || !primeraNota.estadoNuevo) && (
                                  <div className="text-xs sm:text-sm text-gray-100 leading-relaxed mb-2 sm:mb-3 font-medium break-words">
                                    {renderizarContenidoConIconos(contenidoNota)}
                                  </div>
                                )}

                                {/* Imágenes agrupadas */}
                                {imagenes.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {imagenes.map((imgNota, imgIdx) => {
                                      const imagenUrl = imgNota.imagen || imgNota.archivoUrl;

                                      // 🐛 DEBUG: Log para cada imagen individual
                                      console.log(`🖼️ GRUPO ${idx} - IMAGEN ${imgIdx}:`, {
                                        id: imgNota.id,
                                        imagenUrl,
                                        imagen: imgNota.imagen,
                                        archivoUrl: imgNota.archivoUrl,
                                        nombreArchivo: imgNota.nombreArchivo,
                                        tieneUrl: !!imagenUrl
                                      });

                                      if (!imagenUrl) {
                                        console.warn(`⚠️ GRUPO ${idx} - IMAGEN ${imgIdx}: NO TIENE URL`);
                                        return null;
                                      }

                                      return (
                                        <div
                                          key={imgNota.id || imgIdx}
                                          className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-600 hover:border-blue-400 transition-all duration-200"
                                          style={{ width: '80px', height: '80px' }}
                                          onClick={() => {
                                            console.log(`🔍 EXPANDIR IMAGEN GRUPO ${idx} - ${imgIdx}:`, imagenUrl);
                                            setImagenExpandida(imagenUrl);
                                          }}
                                        >
                                          <div className="w-full h-full bg-gray-800">
                                            <img
                                              src={imagenUrl}
                                              alt={imgNota.nombreArchivo || `Evidencia ${idx + 1}-${imgIdx + 1}`}
                                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                              loading="lazy"
                                              onLoad={() => {
                                                console.log(`✅ GRUPO ${idx} - IMAGEN ${imgIdx} CARGADA:`, imagenUrl);
                                              }}
                                              onError={(e) => {
                                                console.error(`❌ GRUPO ${idx} - ERROR CARGANDO IMAGEN ${imgIdx}:`, imagenUrl);
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                              }}
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
                                      );
                                    })}
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
                      
                      // ✅ MEJOR PRÁCTICA: Extraer URLs de imágenes de manera consistente
                      let imagenes = [];
                      if (tipoNota === 'imagen' && (nota.imagen || nota.archivoUrl)) {
                        imagenes = [nota.imagen || nota.archivoUrl];
                      } else if (Array.isArray(nota.imagenes) && nota.imagenes.length > 0) {
                        imagenes = nota.imagenes;
                      } else if ((nota.imagen || nota.archivoUrl) && tipoNota !== 'audio') {
                        imagenes = [nota.imagen || nota.archivoUrl];
                      }

                      // 🐛 DEBUG: Log detallado para verificar imágenes individuales
                      console.log(`📷 NOTA INDIVIDUAL ${idx}:`, {
                        id: nota.id,
                        tipo: tipoNota,
                        grupoId: nota.grupoId,
                        totalImagenes: imagenes.length,
                        urls: imagenes,
                        nota_completa: {
                          imagen: nota.imagen,
                          archivoUrl: nota.archivoUrl,
                          imagenes: nota.imagenes,
                          nombreArchivo: nota.nombreArchivo,
                          contenido: nota.contenido?.substring(0, 30)
                        }
                      });

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
                        <div key={idx} className={`${obtenerEstiloNota(nota)} rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-gray-300 text-xs mb-2 sm:mb-3">
                            <span className="font-medium">{formatearFecha(fechaNota)}</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {imagenes.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                  <Camera size={11} className="sm:w-3 sm:h-3" />
                                  {imagenes.length}
                                </span>
                              )}
                              {audioUrl && (
                                <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                                  <Mic size={11} className="sm:w-3 sm:h-3" />
                                  Audio
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Mostrar contenido solo si existe */}
                          {/* ✅ Si es cambio_estado CON ambos campos (estadoAnterior Y estadoNuevo), no mostrar contenido (se muestra visualmente abajo) */}
                          {/* ✅ Si es cambio_estado SIN ambos campos completos, SÍ mostrar contenido (es texto normal) */}
                          {contenidoNota && (tipoNota !== 'cambio_estado' || !nota.estadoAnterior || !nota.estadoNuevo) && (
                            <div className="text-xs sm:text-sm text-gray-100 leading-relaxed mb-2 sm:mb-3 font-medium break-words">
                              {renderizarContenidoConIconos(contenidoNota)}
                            </div>
                          )}

                          {/* Renderizar cambio de estado visualmente (solo si tiene estadoAnterior/estadoNuevo) */}
                          {renderizarCambioEstado(nota)}
                          
                          {audioUrl && (
                            <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-gray-900/50 rounded-lg border border-purple-500/30">
                              <audio 
                                controls 
                                src={audioUrl} 
                                className="w-full h-8 sm:h-10"
                                preload="metadata"
                              >
                                Tu navegador no soporta el elemento de audio.
                              </audio>
                            </div>
                          )}
                          
                          {imagenes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {imagenes.map((imagen, imgIdx) => {
                                // 🐛 DEBUG: Log para cada imagen que se va a renderizar
                                console.log(`🖼️ INDIVIDUAL ${idx} - IMAGEN ${imgIdx}:`, {
                                  url: imagen,
                                  tipo: typeof imagen,
                                  longitud: imagen?.length,
                                  esValida: !!imagen
                                });

                                // Validar que la imagen sea válida
                                if (!imagen) {
                                  console.warn(`⚠️ INDIVIDUAL ${idx} - IMAGEN ${imgIdx}: NO TIENE URL`);
                                  return null;
                                }

                                return (
                                  <div
                                    key={imgIdx}
                                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-600 hover:border-blue-400 transition-all duration-200"
                                    style={{ width: '80px', height: '80px' }}
                                    onClick={() => {
                                      console.log(`🔍 EXPANDIR IMAGEN INDIVIDUAL ${idx} - ${imgIdx}:`, imagen);
                                      setImagenExpandida(imagen);
                                    }}
                                  >
                                    <div className="w-full h-full bg-gray-800">
                                      <img
                                        src={imagen}
                                        alt={`Evidencia ${idx + 1}-${imgIdx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                        loading="lazy"
                                        onLoad={() => {
                                          console.log(`✅ INDIVIDUAL ${idx} - IMAGEN ${imgIdx} CARGADA:`, imagen);
                                        }}
                                        onError={(e) => {
                                          console.error(`❌ INDIVIDUAL ${idx} - ERROR CARGANDO IMAGEN ${imgIdx}:`, imagen);
                                          e.target.style.display = 'none';
                                          e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500 text-xs">Error</div>';
                                        }}
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
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                          }
                    })}
                  </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <StickyNote className="h-16 w-16 text-gray-600 opacity-50 mb-4" />
                    <p className="text-gray-500 italic text-sm">Sin notas registradas</p>
                    <p className="text-gray-600 text-xs mt-2">Las notas aparecerán aquí cuando se agreguen</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE IMAGEN EXPANDIDA */}
      {imagenExpandida && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
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
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/70 hover:bg-black/90 text-white p-2 sm:p-3 rounded-full transition-all duration-200 shadow-lg hover:scale-110 z-10 touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                setImagenExpandida(null);
              }}
              aria-label="Cerrar imagen"
            >
              <span className="text-lg sm:text-xl">×</span>
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="bg-gray-900 border-t border-gray-800 py-4 sm:py-6 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 text-center">
          <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3">Sades v1.0</p>
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <a
              href="https://wa.me/582572511282"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 text-green-400 hover:text-green-300 transition-colors"
            >
              <FaWhatsapp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>+582572511282</span>
            </a>
            <span className="text-gray-600">|</span>
            <a
              href="https://instagram.com/electroshopgre"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <CgInstagram className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>@electroshopgre</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

