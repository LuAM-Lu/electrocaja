// components/ChangelogModal.jsx - ACTUALIZADO CON NUEVAS FUNCIONALIDADES
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Bug, Zap, ShieldCheck, Wrench, Package, Star, Calendar, Clock, CheckCircle, Edit3, History, Camera, Smartphone } from 'lucide-react';

const ChangelogModal = ({ isOpen, onClose, className = '' }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('latest');

  // Versión actual del sistema
  const currentVersion = "2.1.0 Alpha";
  const releaseDate = "18 de Agosto, 2025";

  // Datos del changelog - aquí puedes agregar nuevas actualizaciones
  const changelog = {
    latest: {
      version: "2.1.0 Alpha",
      date: "18 de Agosto, 2025",
      type: "major",
      items: [
        {
          type: 'feature',
          icon: <Smartphone className="h-4 w-4" />,
          title: 'Sistema Completo de Servicios Técnicos',
          description: 'Nuevo módulo integral para gestión de órdenes de servicio con wizard de 4 pasos: cliente, dispositivo, productos/servicios y confirmación. Incluye dashboard especializado con resumen de estados y tabla de servicios.'
        },
        {
          type: 'feature',
          icon: <Edit3 className="h-4 w-4" />,
          title: 'Wizard de Edición de Servicios',
          description: 'Sistema de edición completo que reutiliza el wizard de registro. Pasos 1-2 en modo solo lectura, paso 3 editable para productos/servicios, con pre-carga de datos existentes y validaciones inteligentes.'
        },
        {
          type: 'feature',
          icon: <History className="h-4 w-4" />,
          title: 'Historial Técnico con Cámara Móvil',
          description: 'Modal especializado para gestión de estados y notas técnicas. Incluye funcionalidad completa de cámara móvil: captura en tiempo real, alternancia frontal/trasera, compresión automática de imágenes y grabación de audio.'
        },
        {
          type: 'feature',
          icon: <Camera className="h-4 w-4" />,
          title: 'Captura de Evidencias Avanzada',
          description: 'Sistema integrado de evidencias técnicas con soporte para texto, imágenes (cámara y archivo) y audio. Compresión automática de imágenes a 1280px, límite de 900KB, grabación de audio hasta 30s en formato WebM.'
        },
        {
          type: 'improvement',
          icon: <Zap className="h-4 w-4" />,
          title: 'Modal de Vista Optimizado Sin Scroll',
          description: 'Diseño UX/UI experto con layout 45/55, información compacta, tooltip clickeable para contacto, alertas inteligentes en header, timeline de progreso visual y vista expandida de imágenes.'
        },
        {
          type: 'feature',
          icon: <Package className="h-4 w-4" />,
          title: 'Gestión de Estados Técnicos',
          description: 'Sistema completo de estados: En Diagnóstico, Esperando Aprobación, En Reparación, Listo para Retiro y Entregado. Cada estado con colores específicos, iconos y validaciones correspondientes.'
        },
        {
          type: 'improvement',
          icon: <ShieldCheck className="h-4 w-4" />,
          title: 'Alertas Contextuales Inteligentes',
          description: 'Sistema de alertas automáticas: servicios vencidos (>5 días), dispositivos listos para retiro, progreso visual del servicio y notificaciones en tiempo real con cálculo de días transcurridos.'
        },
        {
          type: 'feature',
          icon: <Wrench className="h-4 w-4" />,
          title: 'Acciones Rápidas de Comunicación',
          description: 'Integración directa de comunicación desde la interfaz: llamadas telefónicas, WhatsApp y email con un solo clic. Tooltip persistente con información de contacto completa del cliente.'
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
            description: 'Nuevo módulo de reportes con 7 endpoints especializados: Dashboard ejecutivo, análisis financiero, seguimiento de egresos por personas, historial de cajas con evidencias, tasas históricas, detalle completo de cajas y búsqueda avanzada de transacciones.'
          },
          {
            type: 'feature',
            icon: <Package className="h-4 w-4" />,
            title: 'Dashboard Financiero en Tiempo Real',
            description: 'Panel ejecutivo que calcula automáticamente ROI, márgenes de rentabilidad, distribución de ingresos/egresos, tendencias mensuales y comparativos anuales con datos reales del negocio.'
          },
          {
            type: 'feature',
            icon: <ShieldCheck className="h-4 w-4" />,
            title: 'Detección Inteligente de Personas en Egresos',
            description: 'Sistema automático que identifica y clasifica pagos a accionistas vs trabajadores en las descripciones de egresos, generando reportes específicos por tipo de persona.'
          },
          {
            type: 'security',
            icon: <ShieldCheck className="h-4 w-4" />,
            title: 'Acceso Restringido Solo para Administradores',
            description: 'Sistema de seguridad que garantiza que únicamente usuarios con rol de administrador puedan acceder a los reportes ejecutivos, protegiendo información sensible del negocio.'
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
            title: 'Corrección Crítica de Validación de Vueltos',
            description: 'Solucionado error donde el backend no consideraba los vueltos configurados en la validación de regalías, causando rechazos incorrectos de ventas válidas.'
          },
          {
            type: 'improvement',
            icon: <Zap className="h-4 w-4" />,
            title: 'Mejora en Presentación de Vueltos',
            description: 'Los vueltos ahora se muestran en su moneda original (ej: $10.00 USD) en lugar de la conversión automática a bolívares.'
          },
          {
            type: 'fix',
            icon: <Bug className="h-4 w-4" />,
            title: 'Sincronización de Descuentos',
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
            description: 'Implementación completa del sistema de vueltos con soporte para múltiples métodos de pago y validaciones de regalías.'
          },
          {
            type: 'improvement',
            icon: <Zap className="h-4 w-4" />,
            title: 'Optimización de PagosPanel',
            description: 'Mejorado el componente PagosPanel con cálculos más precisos y mejor manejo de excesos de pago.'
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
            description: 'Nueva arquitectura para procesamiento de ventas con soporte para múltiples métodos de pago y validaciones avanzadas.'
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
            description: 'Primera versión alpha del sistema Electro Caja con funcionalidades básicas de punto de venta, gestión de inventario y reportes.'
          },
          {
            type: 'feature',
            icon: <Package className="h-4 w-4" />,
            title: 'Módulo de Inventario',
            description: 'Sistema completo de gestión de inventario con soporte para productos, servicios y electrobar con códigos de barras.'
          },
          {
            type: 'feature',
            icon: <Wrench className="h-4 w-4" />,
            title: 'Dashboard de Servicios',
            description: 'Interfaz principal para gestión de ventas, caja y reportes con diseño moderno y responsivo.'
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
      fix: 'Corrección',
      security: 'Seguridad',
      patch: 'Parche'
    };
    return labels[type] || 'Actualización';
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Marcar como visto en localStorage
  const markAsViewed = () => {
    localStorage.setItem('changelog-viewed', currentVersion);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/40 backdrop-blur-sm z-[80] flex items-center justify-center animate-modal-backdrop-enter">
      <div className={`
        bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative
        animate-modal-enter
        ${isClosing ? 'animate-modal-exit' : ''}
        ${className}
      `}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">¿Qué hay de nuevo?</h2>
                <div className="text-sm text-blue-100 mt-1">
                  Electro Caja v{currentVersion} • {releaseDate}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-colors group"
            >
              <X className="h-6 w-6 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mt-6">
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'latest'
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4" />
                <span>Última Versión</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('previous')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'previous'
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Versiones Anteriores</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'latest' && (
            <div className="space-y-6">
              <div className="text-center pb-6 border-b border-gray-200">
                <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full font-medium border border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <span>Versión {changelog.latest.version} - Sistema de Servicios Técnicos</span>
                </div>
                <p className="text-gray-600 mt-2">
                  Lanzamiento completo del módulo de servicios técnicos con wizard de edición, historial avanzado, cámara móvil, gestión de estados y alertas inteligentes.
                </p>
              </div>

              <div className="space-y-4">
                {changelog.latest.items.map((item, index) => (
                  <div key={index} className="flex space-x-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(item.type)}`}>
                      {item.icon}
                      <span className="ml-1">{getTypeLabel(item.type)}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-gray-600 text-sm">{item.description}</p>
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
                    <h3 className="text-lg font-bold text-gray-900">Versión {release.version}</h3>
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

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Para soporte técnico, contacta al administrador del sistema.
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Recordar después
              </button>
              <button
                onClick={markAsViewed}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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