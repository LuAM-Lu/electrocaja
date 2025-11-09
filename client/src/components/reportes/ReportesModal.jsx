// components/reportes/ReportesModal.jsx
import React, { useState } from 'react';
import { X, BarChart, Package, TrendingDown, DollarSign, Search, Users, FileText, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';

// Pestañas existentes
import ReportesEgresos from './ReportesEgresos';
import ResumenGeneral from './ResumenGeneral';
import ReportesCaja from './ReportesCaja';
import ReportesFinancieros from './ReportesFinancieros';
import AuditoriaInventario from './AuditoriaInventario';
// Nueva pestaña
import ReporteEmpleado from './ReporteEmpleado';

const ReportesModal = ({ isOpen, onClose }) => {
  const { usuario, tienePermiso } = useAuthStore();
  const [tabActiva, setTabActiva] = useState('resumen');
  const [loading, setLoading] = useState(false);

  if (!tienePermiso('VER_REPORTES') || usuario?.rol !== 'admin') return null;
  if (!isOpen) return null;

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: BarChart, descripcion: 'Dashboard principal con métricas clave' },
    { id: 'cajas', label: 'Cajas', icon: Package, descripcion: 'Historial de cajas con evidencias fotográficas' },
    { id: 'egresos', label: 'Egresos', icon: TrendingDown, descripcion: 'Búsqueda por accionistas y trabajadores' },
    { id: 'financiero', label: 'Financiero', icon: DollarSign, descripcion: 'Flujo de dinero y rentabilidad' },
    { id: 'inventario', label: 'Inventario', icon: Search, descripcion: 'Auditoría digital de inventario físico' },
    // NUEVA: Vendedor/Empleado
    { id: 'empleado', label: 'Vendedor', icon: Users, descripcion: 'Ventas y egresos por empleado' }
  ];

  const renderTabContent = () => {
    switch (tabActiva) {
      case 'resumen':
        return <ResumenGeneral />;
      case 'cajas':
        return <ReportesCaja />;
      case 'egresos':
        return <ReportesEgresos />;
      case 'financiero':
        return <ReportesFinancieros />;
      case 'inventario':
        return <AuditoriaInventario />;
      case 'empleado':
        return <ReporteEmpleado />;
      default:
        return <ResumenGeneral />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 overflow-hidden flex-shrink-0">
          <div className="relative px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    Reportes del Sistema |{' '}
                    <span className="text-xl font-normal">{tabs.find((t) => t.id === tabActiva)?.descripcion}</span>
                  </h1>
                  <p className="text-purple-100 text-sm">
                    Panel administrativo • Solo {usuario?.rol} • {new Date().toLocaleDateString('es-VE')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">{usuario?.nombre}</span>
                </div>

                <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <div className="flex flex-wrap gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setTabActiva(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all font-medium ${
                        tabActiva === tab.id ? 'bg-white text-purple-600 shadow-lg' : 'text-purple-100 hover:bg-white/20'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Cargando reportes...</p>
                </div>
              </div>
            ) : (
              <div className="p-6 max-h-[calc(90vh-280px)] overflow-y-auto">{renderTabContent()}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Última actualización: {new Date().toLocaleTimeString('es-VE')}</span>
              </div>
              <span>•</span>
              <span>Electro Caja Reportes v1.1</span>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  toast.success('Actualizando datos...');
                  setLoading(true);
                  setTimeout(() => setLoading(false), 1000);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                <BarChart className="h-4 w-4" />
                <span>Actualizar</span>
              </button>

              <button onClick={onClose} className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesModal;
