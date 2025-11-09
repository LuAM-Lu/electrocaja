// components/Footer.jsx (FULL RESPONSIVE MOBILE + TEMAS DINÁMICOS + STICKY)
import React, { useState, useEffect } from 'react';
import { Users, Activity, Wifi, WifiOff, Zap, MessageCircle, Calendar, Clock, Package } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import { useDashboardStore } from '../store/dashboardStore';
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
  const { theme, isDarkTheme } = useDashboardStore();
  const { enviarNotificacion } = useWhatsApp();

  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [whatsappStatus, setWhatsappStatus] = useState('checking');

  //  CONFIGURACIÓN DE TEMAS
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
    const interval = setInterval(() => {
      if (usuario) {
        actualizarActividad(usuario.id);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [usuario, actualizarActividad]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const checkWhatsAppStatus = async () => {
    try {
      const isBackend = isBackendConnected();
      if (!isBackend) {
        setWhatsappStatus('not_configured');
        return;
      }

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

  const getRoleColor = (rol) => {
    return currentTheme.badges[rol] || currentTheme.badges.viewer;
  };

  const getConnectionStatus = () => {
    const isBackend = isBackendConnected();
    const socketConnected = isSocketConnected();

    if (isBackend && socketConnected) {
      return {
        color: currentTheme.statusIndicators.online,
        icon: <Wifi className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentTheme.iconColor}`} />,
        text: 'Online',
        description: 'API + Socket'
      };
    } else if (isBackend) {
      return {
        color: currentTheme.statusIndicators.warning,
        icon: <Zap className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentTheme.iconColor}`} />,
        text: 'API Only',
        description: 'Sin tiempo real'
      };
    } else {
      return {
        color: currentTheme.statusIndicators.offline,
        icon: <WifiOff className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentTheme.iconColor}`} />,
        text: 'Local',
        description: 'Sin servidor'
      };
    }
  };

  const getWhatsAppStatus = () => {
    const statusConfig = {
      connected: {
        color: currentTheme.statusIndicators.online,
        icon: <MessageCircle className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: 'WA OK',
        textFull: 'WhatsApp OK',
        description: 'Notificaciones activas'
      },
      qr_pending: {
        color: currentTheme.statusIndicators.warning,
        icon: <MessageCircle className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: 'WA QR',
        textFull: 'WhatsApp QR',
        description: 'Esperando escaneo'
      },
      disconnected: {
        color: 'bg-orange-400',
        icon: <MessageCircle className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: 'WA OFF',
        textFull: 'WhatsApp OFF',
        description: 'Desconectado'
      },
      error: {
        color: currentTheme.statusIndicators.error,
        icon: <MessageCircle className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: 'WA Err',
        textFull: 'WhatsApp Error',
        description: 'Fallo de conexión'
      },
      not_configured: {
        color: currentTheme.statusIndicators.checking,
        icon: <MessageCircle className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: 'WA N/A',
        textFull: 'WhatsApp N/A',
        description: 'No configurado'
      },
      checking: {
        color: `${currentTheme.statusIndicators.checking} animate-pulse`,
        icon: <MessageCircle className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: '...',
        textFull: 'Verificando...',
        description: 'Comprobando estado'
      }
    };

    return statusConfig[whatsappStatus] || statusConfig.checking;
  };

  const getCajaStatus = () => {
    if (cajaActual) {
      return {
        color: `${currentTheme.statusIndicators.online} animate-pulse`,
        icon: <Package className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: 'Abierta',
        textFull: 'Caja Abierta',
        description: `Desde ${cajaActual.hora_apertura}`
      };
    } else {
      return {
        color: currentTheme.statusIndicators.checking,
        icon: <Package className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${currentTheme.iconColor}`} />,
        text: 'Cerrada',
        textFull: 'Caja Cerrada',
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-center h-8 sm:h-10">

          {/* ELEMENTOS CENTRADOS - FULL RESPONSIVE */}
          <div className={`flex items-center space-x-2 sm:space-x-3 lg:space-x-4 text-xs sm:text-sm ${currentTheme.text} flex-wrap justify-center`}>

            {/*  CONEXIÓN - RESPONSIVE */}
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${connectionStatus.color}`}></div>
              <div className="hidden sm:block">{connectionStatus.icon}</div>
              <span className="text-[10px] sm:text-xs font-medium" title={connectionStatus.description}>
                {connectionStatus.text}
              </span>
            </div>

            {/* WHATSAPP - Solo Admin - RESPONSIVE */}
            {usuario?.rol === 'admin' && (
              <>
                <div className={`h-2.5 sm:h-3 w-px ${currentTheme.separatorColor}`}></div>
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${whatsappStatusInfo.color}`}></div>
                  {whatsappStatusInfo.icon}
                  <span className="text-[10px] sm:text-xs font-medium hidden sm:inline">
                    {whatsappStatusInfo.textFull}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium sm:hidden">
                    {whatsappStatusInfo.text}
                  </span>
                </div>
              </>
            )}

            {/* Separador */}
            <div className={`h-3 sm:h-4 w-px ${currentTheme.separatorColor}`}></div>

            {/*  FECHA + HORA - RESPONSIVE */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-0.5 sm:space-x-1">
                <Calendar className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 ${currentTheme.iconColor}`} />
                <span className="font-medium text-[10px] sm:text-xs">{getCurrentDate()}</span>
              </div>

              <div className="flex items-center space-x-0.5 sm:space-x-1">
                <Clock className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 ${currentTheme.iconColor}`} />
                <span className={`font-mono ${currentTheme.text} text-[10px] sm:text-xs`}>{currentTime}</span>
              </div>
            </div>

            {/* Separador */}
            <div className={`h-3 sm:h-4 w-px ${currentTheme.separatorColor}`}></div>

            {/*  ESTADO DE CAJA - RESPONSIVE */}
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${cajaStatus.color}`}></div>
              {cajaStatus.icon}
              <span className="font-medium text-[10px] sm:text-xs hidden sm:inline" title={cajaStatus.description}>
                {cajaStatus.textFull}
              </span>
              <span className="font-medium text-[10px] sm:text-xs sm:hidden" title={cajaStatus.description}>
                {cajaStatus.text}
              </span>
            </div>

            {/* Separador */}
            <div className={`h-3 sm:h-4 w-px ${currentTheme.separatorColor}`}></div>

            {/*  SESIONES ACTIVAS - RESPONSIVE */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Users className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 ${currentTheme.iconColor}`} />
              <span className="font-medium text-[10px] sm:text-xs">{usuariosConectados.length}</span>
              <span className={`${isDarkTheme() ? 'text-gray-400' : 'text-white/70'} text-[10px] sm:text-xs hidden sm:inline`}>
                {usuariosConectados.length === 1 ? 'sesión' : 'sesiones'}
              </span>

              {/*  AVATARES - RESPONSIVE */}
              {usuariosConectados.length > 0 && (
                <div className="flex items-center space-x-0.5 sm:space-x-1 ml-1 sm:ml-2">
                  {usuariosConectados.slice(0, 3).map((user) => (
                    <div
                      key={user.id}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-xs flex items-center justify-center font-bold ${getRoleColor(user.rol)} border ${
                        isDarkTheme() ? 'border-gray-600' : 'border-white/30'
                      } shadow-sm backdrop-blur-sm`}
                      title={`${user.nombre} (${user.rol.toUpperCase()}) - ${user.sucursal}`}
                    >
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {usuariosConectados.length > 3 && (
                    <div
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${
                        isDarkTheme() ? 'bg-gray-700' : 'bg-white/20'
                      } ${currentTheme.text} text-[9px] sm:text-xs flex items-center justify-center font-bold border ${
                        isDarkTheme() ? 'border-gray-600' : 'border-white/30'
                      } shadow-sm backdrop-blur-sm`}
                      title={`${usuariosConectados.length - 3} usuarios más`}
                    >
                      +{usuariosConectados.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sesión Info - Solo Admin Desktop - RESPONSIVE */}
            {sessionInfo && usuario?.rol === 'admin' && (
              <>
                <div className={`hidden lg:block h-4 w-px ${currentTheme.separatorColor}`}></div>
                <div className="hidden lg:flex items-center space-x-2">
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
