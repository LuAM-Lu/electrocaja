// components/Footer.jsx (CON TEMAS DINÁMICOS + STICKY)
import React, { useState, useEffect } from 'react';
import { Users, Activity, Wifi, WifiOff, Zap, MessageCircle, Calendar, Clock, Package } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import { useDashboardStore } from '../store/dashboardStore'; // 🆕 NUEVO IMPORT
import { useWhatsApp } from '../hooks/useWhatsApp';
import { api } from '../config/api';

const Footer = () => {
  const { 
    usuario, 
    usuariosConectados, 
    actualizarActividad, 
    getSessionInfo,
    isSocketConnected,
    isBackendConnected 
  } = useAuthStore();

  const { cajaActual } = useCajaStore();
  const { theme, isDarkTheme } = useDashboardStore(); // 🆕 NUEVO HOOK
  const { enviarNotificacion } = useWhatsApp();

  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [whatsappStatus, setWhatsappStatus] = useState('checking');

  // 🆕 CONFIGURACIÓN DE TEMAS
  const themeConfig = {
    blue: {
      gradient: 'bg-gradient-to-r from-blue-600 to-blue-700',
      text: 'text-white',
      iconColor: 'text-white',
      separatorColor: 'bg-white/30',
      statusIndicators: {
        online: 'bg-green-400',
        warning: 'bg-yellow-400', 
        offline: 'bg-blue-400',
        error: 'bg-red-400',
        checking: 'bg-gray-400'
      },
      badges: {
        admin: 'text-red-200 bg-red-500/20',
        supervisor: 'text-blue-200 bg-blue-500/20',
        cajero: 'text-green-200 bg-green-500/20',
        viewer: 'text-gray-200 bg-gray-500/20'
      }
    },
    dark: {
      gradient: 'bg-gradient-to-r from-gray-700 to-gray-800',
      text: 'text-gray-100',
      iconColor: 'text-gray-300',
      separatorColor: 'bg-gray-600',
      statusIndicators: {
        online: 'bg-green-500',
        warning: 'bg-yellow-500',
        offline: 'bg-gray-500',
        error: 'bg-red-500',
        checking: 'bg-gray-500'
      },
      badges: {
        admin: 'text-red-200 bg-red-600/30',
        supervisor: 'text-blue-200 bg-blue-600/30',
        cajero: 'text-green-200 bg-green-600/30',
        viewer: 'text-gray-200 bg-gray-600/30'
      }
    }
  };

  const currentTheme = themeConfig[theme];

  useEffect(() => {
    // Actualizar actividad cada 30 segundos
    const interval = setInterval(() => {
      if (usuario) {
        actualizarActividad(usuario.id);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [usuario, actualizarActividad]);

  // Timer para la hora
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Verificar estado de WhatsApp al cargar
  useEffect(() => {
    checkWhatsAppStatus();
  }, []);

  function getCurrentTime() {
    return new Date().toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Verificar estado real de WhatsApp API
  const checkWhatsAppStatus = async () => {
    try {
      const isBackend = isBackendConnected();
      if (!isBackend) {
        setWhatsappStatus('not_configured');
        return;
      }

      // Usar API centralizada que maneja HTTPS automáticamente
      const response = await api.get('/whatsapp/estado');
      
      if (response.data.success) {
        const { conectado, qrCode } = response.data.data;
        
        if (conectado) {
          setWhatsappStatus('connected');
        } else if (qrCode) {
          setWhatsappStatus('qr_pending');
        } else {
          setWhatsappStatus('disconnected');
        }
      } else {
        setWhatsappStatus('error');
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setWhatsappStatus('error');
    }
  };

  // Función para obtener color por rol
  const getRoleColor = (rol) => {
    return currentTheme.badges[rol] || currentTheme.badges.viewer;
  };

  // Estados de conexión
  const getConnectionStatus = () => {
    const isBackend = isBackendConnected();
    const socketConnected = isSocketConnected();

    if (isBackend && socketConnected) {
      return {
        color: currentTheme.statusIndicators.online,
        icon: <Wifi className={`h-3.5 w-3.5 ${currentTheme.iconColor}`} />,
        text: 'Online',
        description: 'API + Socket'
      };
    } else if (isBackend) {
      return {
        color: currentTheme.statusIndicators.warning,
        icon: <Zap className={`h-3.5 w-3.5 ${currentTheme.iconColor}`} />,
        text: 'API Only',
        description: 'Sin tiempo real'
      };
    } else {
      return {
        color: currentTheme.statusIndicators.offline,
        icon: <WifiOff className={`h-3.5 w-3.5 ${currentTheme.iconColor}`} />,
        text: 'Local',
        description: 'Sin servidor'
      };
    }
  };

  // Estados de WhatsApp
  const getWhatsAppStatus = () => {
    const statusConfig = {
      connected: {
        color: currentTheme.statusIndicators.online,
        icon: <MessageCircle className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'WhatsApp OK',
        description: 'Notificaciones activas'
      },
      qr_pending: {
        color: currentTheme.statusIndicators.warning,
        icon: <MessageCircle className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'WhatsApp QR',
        description: 'Esperando escaneo'
      },
      disconnected: {
        color: 'bg-orange-400',
        icon: <MessageCircle className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'WhatsApp OFF',
        description: 'Desconectado'
      },
      error: {
        color: currentTheme.statusIndicators.error,
        icon: <MessageCircle className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'WhatsApp Error',
        description: 'Fallo de conexión'
      },
      not_configured: {
        color: currentTheme.statusIndicators.checking,
        icon: <MessageCircle className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'WhatsApp N/A',
        description: 'No configurado'
      },
      checking: {
        color: `${currentTheme.statusIndicators.checking} animate-pulse`,
        icon: <MessageCircle className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'Verificando...',
        description: 'Comprobando estado'
      }
    };

    return statusConfig[whatsappStatus] || statusConfig.checking;
  };

  // Estados de caja
  const getCajaStatus = () => {
    if (cajaActual) {
      return {
        color: `${currentTheme.statusIndicators.online} animate-pulse`,
        icon: <Package className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'Caja Abierta',
        description: `Desde ${cajaActual.hora_apertura}`
      };
    } else {
      return {
        color: currentTheme.statusIndicators.checking,
        icon: <Package className={`h-3 w-3 ${currentTheme.iconColor}`} />,
        text: 'Caja Cerrada',
        description: 'Sistema en espera'
      };
    }
  };

  const connectionStatus = getConnectionStatus();
  const whatsappStatusInfo = getWhatsAppStatus();
  const cajaStatus = getCajaStatus();
  const sessionInfo = getSessionInfo();

  return (
    <footer className={`sticky bottom-0 z-40 ${currentTheme.gradient} shadow-lg mt-auto transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-10">
          
          {/* ELEMENTOS CENTRADOS EN UNA SOLA FILA */}
          <div className={`flex items-center space-x-4 text-sm ${currentTheme.text}`}>
            
            {/* 🌐 CONEXIÓN + WHATSAPP */}
            <div className="flex items-center space-x-3">
              {/* Estado API/Socket */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${connectionStatus.color}`}></div>
                {connectionStatus.icon}
                <span className="text-xs font-medium" title={connectionStatus.description}>
                  {connectionStatus.text}
                </span>
              </div>
              
              {/* Separador mini + WhatsApp - Solo Admin */}
              {usuario?.rol === 'admin' && (
                <>
                  <div className={`h-3 w-px ${currentTheme.separatorColor}`}></div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${whatsappStatusInfo.color}`}></div>
                    {whatsappStatusInfo.icon}
                    <span className="text-xs font-medium">
                      {whatsappStatusInfo.text}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Separador */}
            <div className={`h-4 w-px ${currentTheme.separatorColor}`}></div>

            {/* 📅 FECHA + HORA */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Calendar className={`h-3.5 w-3.5 ${currentTheme.iconColor}`} />
                <span className="font-medium">{getCurrentDate()}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Clock className={`h-3.5 w-3.5 ${currentTheme.iconColor}`} />
                <span className={`font-mono ${currentTheme.text}`}>{currentTime}</span>
              </div>
            </div>

            {/* Separador */}
            <div className={`h-4 w-px ${currentTheme.separatorColor}`}></div>

            {/* 📦 ESTADO DE CAJA */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${cajaStatus.color}`}></div>
              {cajaStatus.icon}
              <span className="font-medium text-xs" title={cajaStatus.description}>
                {cajaStatus.text}
              </span>
            </div>

            {/* Separador */}
            <div className={`h-4 w-px ${currentTheme.separatorColor}`}></div>

            {/* 👥 SESIONES ACTIVAS DINÁMICAS */}
            <div className="flex items-center space-x-2">
              <Users className={`h-3.5 w-3.5 ${currentTheme.iconColor}`} />
              <span className="font-medium">{usuariosConectados.length}</span>
              <span className={`${isDarkTheme() ? 'text-gray-400' : 'text-white/70'} text-xs`}>
                {usuariosConectados.length === 1 ? 'sesión' : 'sesiones'}
              </span>
              
              {/* 🎯 AVATARES DINÁMICOS CON INICIALES */}
              {usuariosConectados.length > 0 && (
                <div className="flex items-center space-x-1 ml-2">
                  {usuariosConectados.slice(0, 4).map((user) => (
                    <div
                      key={user.id}
                      className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${getRoleColor(user.rol)} border ${
                        isDarkTheme() ? 'border-gray-600' : 'border-white/30'
                      } shadow-sm backdrop-blur-sm`}
                      title={`${user.nombre} (${user.rol.toUpperCase()}) - ${user.sucursal}`}
                    >
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {usuariosConectados.length > 4 && (
                    <div 
                      className={`w-5 h-5 rounded-full ${
                        isDarkTheme() ? 'bg-gray-700' : 'bg-white/20'
                      } ${currentTheme.text} text-xs flex items-center justify-center font-bold border ${
                        isDarkTheme() ? 'border-gray-600' : 'border-white/30'
                      } shadow-sm backdrop-blur-sm`}
                      title={`${usuariosConectados.length - 4} usuarios más`}
                    >
                      +{usuariosConectados.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Separador + Mi Sesión - Solo Admin */}
            {sessionInfo && usuario?.rol === 'admin' && (
              <>
                <div className={`h-4 w-px ${currentTheme.separatorColor}`}></div>
                <div className="flex items-center space-x-2">
                  <Activity className={`h-3.5 w-3.5 ${currentTheme.iconColor}`} />
                  <span className={`text-xs ${isDarkTheme() ? 'text-gray-400' : 'text-white/70'}`}>
                    Mi sesión:
                  </span>
                  <span className="font-mono text-xs">{sessionInfo.tiempoRestante}</span>
                  {sessionInfo.socketId && (
                    <span className={`text-xs ${isDarkTheme() ? 'text-gray-500' : 'text-white/50'}`}>
                      #{sessionInfo.socketId.slice(-4)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;