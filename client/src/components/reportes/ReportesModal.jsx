// components/reportes/ReportesModal.jsx
import React, { useState, useEffect } from 'react';
import { X, BarChart, Package, TrendingDown, DollarSign, Search, Users, FileText, Calendar, Wrench } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';

// Pestañas existentes
import ReportesEgresos from './ReportesEgresos';
import ResumenGeneral from './ResumenGeneral';
import ReportesCaja from './ReportesCaja';
import AuditoriaInventario from './AuditoriaInventario';
// Nueva pestaña
import ReporteEmpleado from './ReporteEmpleado';
import ReporteTecnico from './ReporteTecnico';

const ReportesModal = ({ isOpen, onClose }) => {
  const { usuario, tienePermiso } = useAuthStore();
  const [tabActiva, setTabActiva] = useState('resumen');
  const [loading, setLoading] = useState(false);

  /* ----------------------------------------------------
     Manejo de Animación de Cierre
  ---------------------------------------------------- */
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!tienePermiso('VER_REPORTES') || usuario?.rol !== 'admin') return null;
  if (!shouldRender && !isOpen) return null;

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: BarChart, descripcion: 'Dashboard principal con métricas clave' },
    { id: 'cajas', label: 'Cajas', icon: Package, descripcion: 'Historial de cajas con evidencias fotográficas' },
    { id: 'egresos', label: 'Egresos', icon: TrendingDown, descripcion: 'Búsqueda por accionistas y trabajadores' },
    { id: 'inventario', label: 'Inventario', icon: Search, descripcion: 'Auditoría digital de inventario físico' },
    // NUEVA: Vendedor/Empleado
    { id: 'empleado', label: 'Vendedor', icon: Users, descripcion: 'Ventas y egresos por empleado' },
    { id: 'tecnico', label: 'Técnicos', icon: Wrench, descripcion: 'Servicios entregados por técnico' }
  ];

  const renderTabContent = () => {
    switch (tabActiva) {
      case 'resumen':
        return <ResumenGeneral />;
      case 'cajas':
        return <ReportesCaja />;
      case 'egresos':
        return <ReportesEgresos />;
      case 'inventario':
        return <AuditoriaInventario />;
      case 'empleado':
        return <ReporteEmpleado />;
      case 'tecnico':
        return <ReporteTecnico />;
      default:
        return <ResumenGeneral />;
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isClosing ? 'animate-modal-backdrop-exit' : 'animate-modal-backdrop-enter'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}>
        {/* Header Compacto */}
        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-700 overflow-hidden flex-shrink-0 shadow-md z-10">
          <div className="relative px-6 py-3 text-white">
            <div className="flex items-center justify-between gap-4">

              {/* Logo y Título */}
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight">
                    Reportes del Sistema
                  </h1>
                  <p className="text-purple-200 text-xs flex items-center gap-1">
                    Solo {usuario?.rol} • {new Date().toLocaleDateString('es-VE')}
                  </p>
                </div>
              </div>

              {/* Tabs Scrollable */}
              <div className="flex-1 overflow-x-auto no-scrollbar mx-4">
                <div className="flex space-x-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tabActiva === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setTabActiva(tab.id)}
                        className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all text-sm whitespace-nowrap ${isActive
                          ? 'bg-white text-purple-700 font-semibold shadow-sm'
                          : 'text-purple-100 hover:bg-white/10 hover:text-white'
                          }`}
                        title={tab.descripcion}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-purple-600' : 'text-purple-300 group-hover:text-white'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acciones Header */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="hidden sm:flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  <span>{usuario?.nombre}</span>
                </div>
                <button
                  onClick={handleClose}
                  className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Descripción de la pestaña activa (Subtítulo opcional si se quiere más compacto, se puede quitar) */}
            <div className="mt-2 text-xs text-purple-200/80 border-t border-white/10 pt-2 flex justify-between items-center">
              <span>{tabs.find((t) => t.id === tabActiva)?.descripcion}</span>
              <div className="hidden sm:block text-[10px] bg-purple-800/40 px-2 rounded">
                v2.0 Premium
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden bg-gray-50/50 relative flex flex-col">
          {tabActiva === 'resumen' ? (
            <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full flex-col gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                  <p className="text-gray-500 text-sm animate-pulse">Cargando datos...</p>
                </div>
              ) : (
                <ResumenGeneral />
              )}
            </div>
          ) : (
            /* Otros reportes: Scroll convencional */
            <div className="h-full w-full overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full flex-col gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                  <p className="text-gray-500 text-sm animate-pulse">Cargando datos...</p>
                </div>
              ) : (
                <div className="p-4 sm:p-6 min-h-full">
                  {renderTabContent()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Premium */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-700 border-t border-purple-500/30 px-6 py-3 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] z-10">
          <div className="flex items-center justify-between text-white">

            <div className="flex items-center gap-3 text-xs text-purple-100 opacity-80">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Actualizado: {new Date().toLocaleTimeString('es-VE')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  toast.success('Actualizando datos...');
                  setLoading(true);
                  setTimeout(() => setLoading(false), 1000);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/20 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <div className="bg-white/20 p-0.5 rounded-md">
                  <BarChart className="h-3 w-3" />
                </div>
                <span>Actualizar Datos</span>
              </button>

              <button
                onClick={handleClose}
                className="px-6 py-2 text-xs font-bold text-purple-700 bg-white hover:bg-purple-50 border border-transparent rounded-lg transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default ReportesModal;
