// components/presupuesto/SeleccionarPresupuestoModal.jsx - MODAL PARA SELECCIONAR PRESUPUESTOS EXISTENTES
import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Search from 'lucide-react/dist/esm/icons/search'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import User from 'lucide-react/dist/esm/icons/user'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import api from '../../config/api';
import toast from '../../utils/toast.jsx';
import { useAuthStore } from '../../store/authStore';

const SeleccionarPresupuestoModal = ({ isOpen, onClose, onSeleccionar, onNuevo, onMinimize }) => {
  const { usuario } = useAuthStore();
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [eliminandoId, setEliminandoId] = useState(null);
  const itemsPorPagina = 5;

  useEffect(() => {
    if (isOpen) {
      cargarPresupuestos();
      setPaginaActual(1); // Resetear a primera página al abrir
    }
  }, [isOpen]);

  const cargarPresupuestos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100'); // Cargar más para búsqueda

      const response = await api.get(`/presupuestos?${params.toString()}`);
      if (response.data.success) {
        setPresupuestos(response.data.data.presupuestos || []);
      }
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      toast.error('Error al cargar presupuestos');
    } finally {
      setLoading(false);
    }
  };

  const presupuestosFiltrados = presupuestos.filter(p => {
    const matchBusqueda = !busqueda ||
      p.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.clienteNombre && p.clienteNombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (p.clienteCedulaRif && p.clienteCedulaRif.toLowerCase().includes(busqueda.toLowerCase()));

    return matchBusqueda;
  });

  // Paginación
  const totalPaginas = Math.ceil(presupuestosFiltrados.length / itemsPorPagina);
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const presupuestosPaginados = presupuestosFiltrados.slice(inicio, fin);

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearMonto = (monto) => {
    return parseFloat(monto || 0).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Función para eliminar presupuesto
  const handleEliminarPresupuesto = async (presupuestoId, e) => {
    e.stopPropagation(); // Prevenir que se abra el modal al hacer clic

    if (!window.confirm('¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.')) {
      return;
    }

    setEliminandoId(presupuestoId);
    try {
      await api.delete(`/presupuestos/${presupuestoId}`);
      toast.success('Presupuesto eliminado exitosamente');
      // Recargar la lista de presupuestos
      await cargarPresupuestos();
    } catch (error) {
      console.error('Error eliminando presupuesto:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar presupuesto');
    } finally {
      setEliminandoId(null);
    }
  };

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

  if (!shouldRender && !isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-emerald-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isClosing ? 'animate-modal-backdrop-exit' : 'animate-modal-backdrop-enter'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}>
        {/* Header - Verde/Emerald como PresupuestoModal */}
        <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-8 py-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Seleccionar Presupuesto</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Selecciona un presupuesto existente o crea uno nuevo
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onMinimize}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                title="Minimizar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <button
                onClick={handleClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, cliente o CI/RIF..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              onClick={onNuevo}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Nuevo Presupuesto</span>
            </button>
          </div>
        </div>

        {/* Lista de presupuestos */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : presupuestosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No se encontraron presupuestos</p>
              <p className="text-gray-400 text-sm mb-6">
                {busqueda ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer presupuesto'}
              </p>
              <button
                onClick={onNuevo}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Crear Nuevo Presupuesto</span>
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {presupuestosPaginados.map((presupuesto) => (
                  <div
                    key={presupuesto.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => onSeleccionar(presupuesto)}
                  >
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      {/* Número del presupuesto */}
                      <div className="flex-shrink-0 min-w-[120px]">
                        <h3 className="text-base font-bold text-gray-900 truncate">{presupuesto.numero}</h3>
                      </div>

                      {/* Cliente */}
                      <div className="flex items-center space-x-2 text-gray-600 flex-shrink-0 min-w-[150px]">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{presupuesto.clienteNombre || 'Sin cliente'}</span>
                      </div>

                      {/* Fecha */}
                      <div className="flex items-center space-x-2 text-gray-600 flex-shrink-0 min-w-[100px]">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm whitespace-nowrap">{formatearFecha(presupuesto.fecha)}</span>
                      </div>

                      {/* Total */}
                      <div className="flex-shrink-0 min-w-[120px] text-right">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-lg font-bold text-gray-900 truncate">
                          {formatearMonto(presupuesto.totalBs)} Bs
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          ${formatearMonto(presupuesto.totalUsd)} USD
                        </p>
                      </div>

                      {/* Creado por */}
                      <div className="flex-shrink-0 min-w-[100px] text-right">
                        <p className="text-xs text-gray-500">Creado por</p>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {presupuesto.creadoPor?.nombre || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {formatearFecha(presupuesto.createdAt)}
                        </p>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeleccionar(presupuesto);
                          }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 whitespace-nowrap"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Editar</span>
                        </button>

                        {/* Botón de borrar solo para admin */}
                        {usuario?.rol === 'admin' && (
                          <button
                            onClick={(e) => handleEliminarPresupuesto(presupuesto.id, e)}
                            disabled={eliminandoId === presupuesto.id}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            title="Eliminar presupuesto"
                          >
                            {eliminandoId === presupuesto.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Eliminando...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                <span>Borrar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Paginación - Siempre Visible - Estilo Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-4 py-2 grid grid-cols-3 items-center shrink-0 h-14 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {/* Izquierda: Contador */}
          <div className="text-left">
            <span className="text-xs text-white font-medium opacity-90">
              Total: {presupuestosFiltrados.length} presupuestos
            </span>
          </div>

          {/* Centro: Paginación */}
          <div className="flex justify-center">
            {totalPaginas > 0 && (
              <div className="flex items-center space-x-2 rounded-lg p-1">
                <button
                  onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                  disabled={paginaActual === 1}
                  className="p-1.5 rounded-md hover:bg-white/20 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center space-x-1 px-2 border-l border-r border-white/20 mx-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => {
                    // Lógica de visualización de páginas limitada
                    if (totalPaginas > 7 && Math.abs(num - paginaActual) > 2 && num !== 1 && num !== totalPaginas) {
                      if (num === paginaActual - 3 || num === paginaActual + 3) {
                        return <span key={num} className="text-emerald-100 text-xs">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={num}
                        onClick={() => setPaginaActual(num)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${paginaActual === num
                          ? 'bg-white text-emerald-700 shadow-md transform scale-105'
                          : 'text-emerald-50 hover:bg-white/10'
                          }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="p-1.5 rounded-md hover:bg-white/20 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Derecha: Espacio vacío */}
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default SeleccionarPresupuestoModal;
