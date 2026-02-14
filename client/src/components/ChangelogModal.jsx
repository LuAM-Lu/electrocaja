// components/ChangelogModal.jsx - ACTUALIZADO CON NUEVAS FUNCIONALIDADES
import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles'
import Bug from 'lucide-react/dist/esm/icons/bug'
import Zap from 'lucide-react/dist/esm/icons/zap'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check'
import Wrench from 'lucide-react/dist/esm/icons/wrench'
import Package from 'lucide-react/dist/esm/icons/package'
import Star from 'lucide-react/dist/esm/icons/star'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Clock from 'lucide-react/dist/esm/icons/clock'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3'
import History from 'lucide-react/dist/esm/icons/history'
import Camera from 'lucide-react/dist/esm/icons/camera'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import { useAuthStore } from '../store/authStore';

const CHANGELOG_STORAGE_KEY = 'changelog-preferences';
const LEGACY_STORAGE_KEY = 'changelog-viewed';

const readPreferences = () => {
  if (typeof window === 'undefined') return { users: {} };

  try {
    const raw = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    if (!raw) return { users: {} };

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { users: parsed.users || {} };
    }
  } catch (error) {
    console.error('Error leyendo preferencias del changelog:', error);
  }

  return { users: {} };
};

const writePreferences = (preferences) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      CHANGELOG_STORAGE_KEY,
      JSON.stringify({ users: preferences.users || {} })
    );
  } catch (error) {
    console.error('Error guardando preferencias del changelog:', error);
  }
};

const ChangelogModal = ({ isOpen, onClose, className = '' }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('latest');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const { usuario } = useAuthStore();
  const userKey = usuario?.id || usuario?.email || 'global';
  const userDisplayName = usuario?.nombre || usuario?.email || 'este usuario';

  // VersiÃ³n actual del sistema
  const currentVersion = "2.1.0 Alpha";
  const releaseDate = "18 de Agosto, 2025";

  const saveUserPreferences = (updates) => {
    const preferences = readPreferences();
    const existing = preferences.users?.[userKey] || {};

    preferences.users = {
      ...preferences.users,
      [userKey]: {
        ...existing,
        ...updates,
        lastUpdatedAt: new Date().toISOString()
      }
    };

    writePreferences(preferences);
  };

  useEffect(() => {
    if (!isOpen) return;

    const preferences = readPreferences();
    const userPreferences = preferences.users?.[userKey];

    if (userPreferences?.lastActiveTab) {
      setActiveTab(userPreferences.lastActiveTab);
    } else {
      setActiveTab('latest');
    }

    setDontShowAgain(Boolean(userPreferences?.hidePermanently));
  }, [isOpen, userKey]);

  useEffect(() => {
    if (!isOpen) return;
    saveUserPreferences({ lastActiveTab: activeTab });
  }, [activeTab, isOpen, userKey]);

  const handleDontShowAgainChange = (checked) => {
    setDontShowAgain(checked);
    saveUserPreferences({ hidePermanently: checked });
  };

  // Datos del changelog - aquÃ­ puedes agregar nuevas actualizaciones
  const changelog = {
    latest: {
      version: "2.1.0 Alpha",
      date: "18 de Agosto, 2025",
      type: "major",
      items: [
        {
          type: 'feature',
          icon: <Smartphone className="h-4 w-4" />,
          title: 'Sistema Completo de Servicios TÃ©cnicos',
          description: 'Nuevo mÃ³dulo integral para gestiÃ³n de Ã³rdenes de servicio con wizard de 4 pasos: cliente, dispositivo, productos/servicios y confirmaciÃ³n. Incluye dashboard especializado con resumen de estados y tabla de servicios.'
        },
        {
          type: 'feature',
          icon: <Edit3 className="h-4 w-4" />,
          title: 'Wizard de EdiciÃ³n de Servicios',
          description: 'Sistema de ediciÃ³n completo que reutiliza el wizard de registro. Pasos 1-2 en modo solo lectura, paso 3 editable para productos/servicios, con pre-carga de datos existentes y validaciones inteligentes.'
        },
        {
          type: 'feature',
          icon: <History className="h-4 w-4" />,
          title: 'Historial TÃ©cnico con CÃ¡mara MÃ³vil',
          description: 'Modal especializado para gestiÃ³n de estados y notas tÃ©cnicas. Incluye funcionalidad completa de cÃ¡mara mÃ³vil: captura en tiempo real, alternancia frontal/trasera, compresiÃ³n automÃ¡tica de imÃ¡genes y grabaciÃ³n de audio.'
        },
        {
          type: 'feature',
          icon: <Camera className="h-4 w-4" />,
          title: 'Captura de Evidencias Avanzada',
          description: 'Sistema integrado de evidencias tÃ©cnicas con soporte para texto, imÃ¡genes (cÃ¡mara y archivo) y audio. CompresiÃ³n automÃ¡tica de imÃ¡genes a 1280px, lÃ­mite de 900KB, grabaciÃ³n de audio hasta 30s en formato WebM.'
        },
        {
          type: 'improvement',
          icon: <Zap className="h-4 w-4" />,
          title: 'Modal de Vista Optimizado Sin Scroll',
          description: 'DiseÃ±o UX/UI experto con layout 45/55, informaciÃ³n compacta, tooltip clickeable para contacto, alertas inteligentes en header, timeline de progreso visual y vista expandida de imÃ¡genes.'
        },
        {
          type: 'feature',
          icon: <Package className="h-4 w-4" />,
          title: 'GestiÃ³n de Estados TÃ©cnicos',
          description: 'Sistema completo de estados: En DiagnÃ³stico, Esperando AprobaciÃ³n, En ReparaciÃ³n, Listo para Retiro y Entregado. Cada estado con colores especÃ­ficos, iconos y validaciones correspondientes.'
        },
        {
          type: 'improvement',
          icon: <ShieldCheck className="h-4 w-4" />,
          title: 'Alertas Contextuales Inteligentes',
          description: 'Sistema de alertas automÃ¡ticas: servicios vencidos (>5 dÃ­as), dispositivos listos para retiro, progreso visual del servicio y notificaciones en tiempo real con cÃ¡lculo de dÃ­as transcurridos.'
        },
        {
          type: 'feature',
          icon: <Wrench className="h-4 w-4" />,
          title: 'Acciones RÃ¡pidas de ComunicaciÃ³n',
          description: 'IntegraciÃ³n directa de comunicaciÃ³n desde la interfaz: llamadas telefÃ³nicas, WhatsApp y email con un solo clic. Tooltip persistente con informaciÃ³n de contacto completa del cliente.'
        }
      ]
    },
    previous: [
      {
        version: "2.0.0 Alpha",
        date: "15 de Agosto, 2025",
        items: [
          {
            type: 'feature',
            icon: <Sparkles className="h-4 w-4" />,
            title: 'Sistema de Reportes Ejecutivos Completo',
            description: 'Nuevo mÃ³dulo de reportes con 7 endpoints especializados: Dashboard ejecutivo, anÃ¡lisis financiero, seguimiento de egresos por personas, historial de cajas con evidencias, tasas histÃ³ricas, detalle completo de cajas y bÃºsqueda avanzada de transacciones.'
          },
          {
            type: 'feature',
            icon: <Package className="h-4 w-4" />,
            title: 'Dashboard Financiero en Tiempo Real',
            description: 'Panel ejecutivo que calcula automÃ¡ticamente ROI, mÃ¡rgenes de rentabilidad, distribuciÃ³n de ingresos/egresos, tendencias mensuales y comparativos anuales con datos reales del negocio.'
          },
          {
            type: 'feature',
            icon: <ShieldCheck className="h-4 w-4" />,
            title: 'DetecciÃ³n Inteligente de Personas en Egresos',
            description: 'Sistema automÃ¡tico que identifica y clasifica pagos a accionistas vs trabajadores en las descripciones de egresos, generando reportes especÃ­ficos por tipo de persona.'
          },
          {
            type: 'security',
            icon: <ShieldCheck className="h-4 w-4" />,
            title: 'Acceso Restringido Solo para Administradores',
            description: 'Sistema de seguridad que garantiza que Ãºnicamente usuarios con rol de administrador puedan acceder a los reportes ejecutivos, protegiendo informaciÃ³n sensible del negocio.'
          }
        ]
      },
      {
        version: "1.03 Alpha",
        date: "14 de Agosto, 2025",
        items: [
          {
            type: 'fix',
            icon: <Bug className="h-4 w-4" />,
            title: 'CorrecciÃ³n CrÃ­tica de ValidaciÃ³n de Vueltos',
            description: 'Solucionado error donde el backend no consideraba los vueltos configurados en la validaciÃ³n de regalÃ­as, causando rechazos incorrectos de ventas vÃ¡lidas.'
          },
          {
            type: 'improvement',
            icon: <Zap className="h-4 w-4" />,
            title: 'Mejora en PresentaciÃ³n de Vueltos',
            description: 'Los vueltos ahora se muestran en su moneda original (ej: $10.00 USD) en lugar de la conversiÃ³n automÃ¡tica a bolÃ­vares.'
          },
          {
            type: 'fix',
            icon: <Bug className="h-4 w-4" />,
            title: 'SincronizaciÃ³n de Descuentos',
            description: 'Corregido problema donde el descuento no se sincronizaba correctamente entre PagosPanel y el procesamiento final de venta.'
          }
        ]
      },
      {
        version: "1.02 Alpha",
        date: "13 de Agosto, 2025",
        items: [
          {
            type: 'feature',
            icon: <Package className="h-4 w-4" />,
            title: 'Sistema de Vueltos Avanzado',
            description: 'ImplementaciÃ³n completa del sistema de vueltos con soporte para mÃºltiples mÃ©todos de pago y validaciones de regalÃ­as.'
          },
          {
            type: 'improvement',
            icon: <Zap className="h-4 w-4" />,
            title: 'OptimizaciÃ³n de PagosPanel',
            description: 'Mejorado el componente PagosPanel con cÃ¡lculos mÃ¡s precisos y mejor manejo de excesos de pago.'
          }
        ]
      },
      {
        version: "1.01 Alpha",
        date: "12 de Agosto, 2025",
        items: [
          {
            type: 'feature',
            icon: <Wrench className="h-4 w-4" />,
            title: 'Sistema de Procesamiento de Ventas',
            description: 'Nueva arquitectura para procesamiento de ventas con soporte para mÃºltiples mÃ©todos de pago y validaciones avanzadas.'
          },
          {
            type: 'improvement',
            icon: <ShieldCheck className="h-4 w-4" />,
            title: 'Validaciones de Seguridad',
            description: 'Implementadas validaciones robustas para prevenir inconsistencias en transacciones y pagos.'
          }
        ]
      },
      {
        version: "1.0 Alpha",
        date: "10 de Agosto, 2025",
        items: [
          {
            type: 'feature',
            icon: <Star className="h-4 w-4" />,
            title: 'Lanzamiento Inicial del Sistema',
            description: 'Primera versiÃ³n alpha del sistema Electro Caja con funcionalidades bÃ¡sicas de punto de venta, gestiÃ³n de inventario y reportes.'
          },
          {
            type: 'feature',
            icon: <Package className="h-4 w-4" />,
            title: 'MÃ³dulo de Inventario',
            description: 'Sistema completo de gestiÃ³n de inventario con soporte para productos, servicios y electrobar con cÃ³digos de barras.'
          },
          {
            type: 'feature',
            icon: <Wrench className="h-4 w-4" />,
            title: 'Dashboard de Servicios',
            description: 'Interfaz principal para gestiÃ³n de ventas, caja y reportes con diseÃ±o moderno y responsivo.'
          }
        ]
      }
    ]
  };

  const getTypeColor = (type) => {
    const colors = {
      feature: 'bg-green-50 text-green-700 border-green-200',
      improvement: 'bg-blue-50 text-blue-700 border-blue-200',
      fix: 'bg-red-50 text-red-700 border-red-200',
      security: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      patch: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return colors[type] || colors.improvement;
  };

  const getTypeLabel = (type) => {
    const labels = {
      feature: 'Nuevo',
      improvement: 'Mejora',
      fix: 'CorrecciÃ³n',
      security: 'Seguridad',
      patch: 'Parche'
    };
    return labels[type] || 'ActualizaciÃ³n';
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleClose = () => {
    closeModal();
  };

  // Marcar como visto en localStorage
  const markAsViewed = () => {
    if (typeof window !== 'undefined') {
      saveUserPreferences({
        lastViewedVersion: currentVersion,
        hidePermanently: dontShowAgain
      });

      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, currentVersion);
      } catch (error) {
        console.error('Error guardando clave legacy del changelog:', error);
      }
    }

    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/40 backdrop-blur-sm z-[80] flex items-center justify-center animate-modal-backdrop-enter p-2 sm:p-4">
      <div className={`
        bg-white rounded-lg sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col relative
        animate-modal-enter
        ${isClosing ? 'animate-modal-exit' : ''}
        ${className}
      `}>

        {/* Header - RESPONSIVE */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 sm:px-6 py-4 sm:py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-white/20 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                <Sparkles className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Â¿QuÃ© hay de nuevo?</h2>
                <div className="text-xs sm:text-sm text-blue-100 mt-1">
                  Electro Caja v{currentVersion} â€¢ {releaseDate}
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="bg-white/20 hover:bg-white/30 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-colors group"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* Tabs - RESPONSIVE con scroll horizontal en mÃ³vil */}
          <div className="flex space-x-2 sm:space-x-4 mt-4 sm:mt-6 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'latest'
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Ãšltima VersiÃ³n</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('previous')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'previous'
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Versiones Anteriores</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content - RESPONSIVE */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {activeTab === 'latest' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center pb-4 sm:pb-6 border-b border-gray-200">
                <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border border-green-200">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">VersiÃ³n {changelog.latest.version} - Sistema de Servicios TÃ©cnicos</span>
                  <span className="sm:hidden">v{changelog.latest.version} - Servicios</span>
                </div>
                <p className="text-xs sm:text-base text-gray-600 mt-2 px-2">
                  Lanzamiento completo del mÃ³dulo de servicios tÃ©cnicos con wizard de ediciÃ³n, historial avanzado, cÃ¡mara mÃ³vil, gestiÃ³n de estados y alertas inteligentes.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {changelog.latest.items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 p-3 sm:p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(item.type)} self-start`}>
                      {item.icon}
                      <span className="ml-1">{getTypeLabel(item.type)}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'previous' && (
            <div className="space-y-8">
              {changelog.previous.map((release, releaseIndex) => (
                <div key={releaseIndex} className="border-l-4 border-blue-200 pl-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">VersiÃ³n {release.version}</h3>
                    <span className="text-sm text-gray-500">{release.date}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {release.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex space-x-3 p-3 rounded-lg bg-gray-50">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(item.type)}`}>
                          {item.icon}
                          <span className="ml-1">{getTypeLabel(item.type)}</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">{item.title}</h5>
                          <p className="text-gray-600 text-xs mt-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - RESPONSIVE */}
        <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex flex-col items-center sm:items-start gap-2 text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              <span>Para soporte técnico, contacta al administrador del sistema.</span>
              <label className="inline-flex items-center space-x-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={dontShowAgain}
                  onChange={(event) => handleDontShowAgainChange(event.target.checked)}
                />
                <span className="text-xs sm:text-sm">
                  No mostrar nuevamente para {userDisplayName}
                </span>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:space-x-3">
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Recordar después
              </button>
              <button
                onClick={markAsViewed}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;

