// components/actividades/ActividadesModal.jsx - MODAL PRINCIPAL CON TABS
import React, { useState, useEffect } from 'react';
import {
  X, Activity, Clock, Calendar, Users, 
  ChevronRight, RefreshCw, Settings, BarChart3
} from 'lucide-react';
//import { useActividadesStore, TIPOS_ACTIVIDAD } from '../../store/actividadesStore';
import { useAuthStore } from '../../store/authStore';
import RecordatoriosPanel from './RecordatoriosPanel';
import CronometrosPanel from './CronometrosPanel';
import ReservacionesPanel from './ReservacionesPanel';
//import EstadisticasPanel from './EstadisticasPanel';
import toast from '../../utils/toast.jsx';

//  CONFIGURACIÓN DE TABS
const TABS = [
  {
    id: 'recordatorios',
    label: 'Recordatorios',
    icon: Users,
    color: 'emerald',
    description: 'Tareas y menciones entre usuarios'
  },
  {
    id: 'cronometros',
    label: 'Gaming',
    icon: Clock,
    color: 'blue',
    description: 'PS4/PS5/PC/VR en tiempo real'
  },
  {
    id: 'reservaciones',
    label: 'Reservas',
    icon: Calendar,
    color: 'purple',
    description: 'Cumpleaños y eventos especiales'
  },
  {
    id: 'estadisticas',
    label: 'Estadísticas',
    icon: BarChart3,
    color: 'orange',
    description: 'Reportes y análisis de actividades'
  }
];

//  OBTENER COLORES POR TAB
const getTabColors = (color, isActive) => {
  const colors = {
    emerald: {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      inactive: 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700',
      header: 'from-emerald-500 to-emerald-600'
    },
    blue: {
      active: 'bg-blue-100 text-blue-700 border-blue-300',
      inactive: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
      header: 'from-blue-500 to-blue-600'
    },
    purple: {
      active: 'bg-purple-100 text-purple-700 border-purple-300',
      inactive: 'text-purple-600 hover:bg-purple-50 hover:text-purple-700',
      header: 'from-purple-500 to-purple-600'
    },
    orange: {
      active: 'bg-orange-100 text-orange-700 border-orange-300',
      inactive: 'text-orange-600 hover:bg-orange-50 hover:text-orange-700',
      header: 'from-orange-500 to-orange-600'
    }
  };
  
  return colors[color] || colors.emerald;
};

const ActividadesModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('cronometros'); // Empezar con Gaming
  const [loading, setLoading] = useState(true);
  const [showConfiguracion, setShowConfiguracion] = useState(false);
  
  // Store y hooks (temporalmente comentado)
  // const { 
  //   actividades, 
  //   cronometrosActivos,
  //   socketConnected,
  //   inicializar,
  //   sincronizar,
  //   limpiarRecursos,
  //   obtenerRecordatorios,
  //   obtenerCronometros,
  //   obtenerReservaciones,
  //   obtenerActividadesVencidas
  // } = useActividadesStore();
  
  const { usuario, tienePermiso } = useAuthStore();

 //  INICIALIZACIÓN (temporalmente comentado)
  // useEffect(() => {
  //   if (isOpen) {
  //     setLoading(true);
  //     inicializar()
  //       .then(() => setLoading(false))
  //       .catch(() => {
  //         setLoading(false);
  //         toast.error('Error cargando actividades');
  //       });
  //   }
  //   
  //   return () => {
  //     if (!isOpen) {
  //       limpiarRecursos();
  //     }
  //   };
  // }, [isOpen, inicializar, limpiarRecursos]);

  //  CONTADORES POR TAB
  // const getTabCounts = () => {
  //   const recordatorios = obtenerRecordatorios().filter(r => r.estado !== 'completado').length;
  //   const cronometros = cronometrosActivos.size;
  //   const reservaciones = obtenerReservaciones().filter(r => r.estado !== 'completado').length;
  //   const vencidas = obtenerActividadesVencidas().length;
  //  
  //   return {
  //     recordatorios,
  //     cronometros,
  //     reservaciones,
  //     vencidas
  //   };
  // };
  const counts = { recordatorios: 0, cronometros: 0, reservaciones: 0, vencidas: 0 }; // temporal

  //const counts = getTabCounts();
  const currentTab = TABS.find(tab => tab.id === activeTab);
  const tabColors = getTabColors(currentTab?.color || 'emerald', true);

  //  MANEJAR CIERRE
  const handleClose = () => {
    // limpiarRecursos(); // temporal
    onClose();
  };

  //  MANEJAR SINCRONIZACIÓN
  const handleSincronizar = async () => {
    try {
      // await sincronizar(); // temporal
      toast.success('Sincronización temporal deshabilitada');
    } catch (error) {
      toast.error('Error sincronizando');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[85vh] overflow-hidden flex flex-col">
        
        {/*  HEADER DINÁMICO */}
        <div className={`relative bg-gradient-to-r ${tabColors.header} overflow-hidden`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>

          <div className="relative px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <Activity className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Centro de Actividades</h1>
                  <div className="flex items-center space-x-4 text-sm text-white/90 mt-1">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>0 equipos activos</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{counts.recordatorios} recordatorios</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{counts.reservaciones} reservas</span>
                    </span>
                    {counts.vencidas > 0 && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                         {counts.vencidas} vencidas
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Estado de conexión */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full bg-red-400`}></div>
                  <span className="text-sm text-white/90">
                    Desconectado
                  </span>
                </div>

                {/* Botón sincronizar */}
                <button
                  onClick={handleSincronizar}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  title="Sincronizar"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>

                {/* Configuración (solo admin) */}
                {usuario?.rol === 'admin' && (
                  <button
                    onClick={() => setShowConfiguracion(!showConfiguracion)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                    title="Configuración"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}

                {/* Cerrar */}
                <button
                  onClick={handleClose}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/*  NAVEGACIÓN DE TABS */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const colors = getTabColors(tab.color, isActive);
              const count = counts[tab.id] || 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-200 hover:scale-105 min-w-0 ${
                    isActive 
                      ? colors.active 
                      : `border-transparent ${colors.inactive}`
                  }`}
                >
                  <tab.icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{tab.label}</div>
                    <div className="text-xs opacity-75 truncate">{tab.description}</div>
                  </div>
                  
                  {/* Badge de contador */}
                  {count > 0 && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-white text-gray-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count > 99 ? '99+' : count}
                    </div>
                  )}
                  
                  {isActive && (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/*  CONTENIDO DE TABS */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            /* Estado de carga */
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 font-medium">Cargando actividades...</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full bg-red-500`}></div>
                  <span className="text-sm text-gray-500">
                    Conectando...
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Paneles de contenido */
            <div className="h-full">
              {activeTab === 'recordatorios' && (
                <RecordatoriosPanel />
              )}
              
              {activeTab === 'cronometros' && (
                <CronometrosPanel />
              )}
              
              {activeTab === 'reservaciones' && (
                <ReservacionesPanel />
              )}
              
              {activeTab === 'estadisticas' && (
                <EstadisticasPanel />
              )}
            </div>
          )}
        </div>

        {/*  FOOTER CON ESTADÍSTICAS RÁPIDAS */}
        {!loading && (
          <div className="bg-gray-50 px-8 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Total actividades: 0</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Gaming activo: 0</span>
                </div>
                
                {counts.vencidas > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-600 font-medium">Vencidas: {counts.vencidas}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <span>Usuario: {usuario?.nombre}</span>
                <span>•</span>
                <span>Rol: {usuario?.rol}</span>
                <span>•</span>
                <span>Última sync: {new Date().toLocaleTimeString('es-VE')}</span>
              </div>
            </div>
          </div>
        )}

        {/*  PANEL DE CONFIGURACIÓN (si está habilitado) */}
        {showConfiguracion && usuario?.rol === 'admin' && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Configuración de Actividades</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Notificaciones automáticas</span>
                  <button className="w-10 h-6 bg-emerald-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Sonido de alertas</span>
                  <button className="w-10 h-6 bg-gray-300 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Auto-sync cada 30s</span>
                  <button className="w-10 h-6 bg-emerald-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowConfiguracion(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActividadesModal;