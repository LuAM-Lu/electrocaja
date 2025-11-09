// components/reportes/ReportesEgresos.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, TrendingDown, User, Calendar, DollarSign, FileText, Eye, Download } from 'lucide-react';
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';

const ReportesEgresos = () => {
  const [loading, setLoading] = useState(false);
  const [egresos, setEgresos] = useState([]);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    tipoPersona: '', // 'accionista' o 'trabajador'
    persona: '',
    fechaInicio: '',
    fechaFin: ''
  });
  const [totales, setTotales] = useState({
    totalBs: 0,
    totalUsd: 0,
    porPersona: {}
  });

  // Lista de accionistas y trabajadores (esto vendría del backend eventualmente)
  const personas = {
    accionistas: ['Juan Pérez', 'María González', 'Carlos Rodríguez'],
    trabajadores: ['Ana López', 'Pedro Martínez', 'Luis Fernández', 'Carmen Silva']
  };

  // Cargar egresos desde el backend
  const cargarEgresos = async () => {
    setLoading(true);
    try {
      console.log(' Cargando egresos...', filtros);
      
      const response = await api.get('/reportes/egresos', { params: filtros });
      
      console.log(' Egresos cargados:', response.data);
      
      if (response.data.success) {
        const egresosData = response.data.data || [];
        setEgresos(egresosData);
        calcularTotales(egresosData);
        toast.success(`${egresosData.length} egresos encontrados`);
      } else {
        throw new Error(response.data.message || 'Error al cargar egresos');
      }
      
    } catch (error) {
      console.error(' Error cargando egresos:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Error al cargar egresos';
      toast.error(`Error: ${errorMessage}`);
      
      // Datos de ejemplo como fallback
      console.log(' Usando datos de ejemplo debido al error');
      const egresosEjemplo = [
        {
          id: 1,
          descripcion: 'Pago accionista Juan Pérez - Dividendos Q4',
          categoria: 'Pago accionista',
          total_bs: 500000,
          total_usd: 250,
          fecha_hora: '2025-01-15T10:30:00Z',
          usuario: { nombre: 'Admin' },
          persona_relacionada: 'Juan Pérez',
          tipo_persona: 'accionista'
        },
        {
          id: 2,
          descripcion: 'Salario Ana López - Enero 2025',
          categoria: 'Pago trabajador',
          total_bs: 300000,
          total_usd: 150,
          fecha_hora: '2025-01-10T14:00:00Z',
          usuario: { nombre: 'Supervisor' },
          persona_relacionada: 'Ana López',
          tipo_persona: 'trabajador'
        }
      ];
      setEgresos(egresosEjemplo);
      calcularTotales(egresosEjemplo);
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales por tipo y persona
  const calcularTotales = (datosEgresos) => {
    const totalBs = datosEgresos.reduce((sum, egreso) => sum + (egreso.total_bs || 0), 0);
    const totalUsd = datosEgresos.reduce((sum, egreso) => sum + (egreso.total_usd || 0), 0);
    
    const porPersona = {};
    datosEgresos.forEach(egreso => {
      const persona = egreso.persona_relacionada;
      if (persona) {
        if (!porPersona[persona]) {
          porPersona[persona] = { bs: 0, usd: 0, count: 0, tipo: egreso.tipo_persona };
        }
        porPersona[persona].bs += egreso.total_bs || 0;
        porPersona[persona].usd += egreso.total_usd || 0;
        porPersona[persona].count += 1;
      }
    });

    setTotales({ totalBs, totalUsd, porPersona });
  };

  // Filtrar egresos según criterios (aplicado localmente después de recibir del backend)
  const egresosFiltrados = egresos.filter(egreso => {
    const matchBusqueda = !filtros.busqueda || 
      egreso.descripcion?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      egreso.categoria?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      egreso.persona_relacionada?.toLowerCase().includes(filtros.busqueda.toLowerCase());

    const matchTipoPersona = !filtros.tipoPersona || egreso.tipo_persona === filtros.tipoPersona;
    const matchPersona = !filtros.persona || egreso.persona_relacionada === filtros.persona;

    return matchBusqueda && matchTipoPersona && matchPersona;
  });

  // Formatear moneda venezolana
  const formatearBs = (amount) => {
    return Math.round(amount || 0).toLocaleString('es-VE');
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Manejar cambio de filtros
  const handleFiltroChange = (campo, valor) => {
    const nuevosFiltros = { ...filtros, [campo]: valor };
    
    // Si cambia tipo de persona, limpiar persona específica
    if (campo === 'tipoPersona') {
      nuevosFiltros.persona = '';
    }
    
    setFiltros(nuevosFiltros);
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      tipoPersona: '',
      persona: '',
      fechaInicio: '',
      fechaFin: ''
    });
  };

  useEffect(() => {
    cargarEgresos();
  }, [filtros.fechaInicio, filtros.fechaFin]); // Solo recargar del backend con cambios de fecha

  return (
    <div className="space-y-6">
      {/*  FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
            Búsqueda de Egresos por Personas
          </h3>
          <button
            onClick={cargarEgresos}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Búsqueda general */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción, categoría o persona..."
              value={filtros.busqueda}
              onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tipo de persona */}
          <select
            value={filtros.tipoPersona}
            onChange={(e) => handleFiltroChange('tipoPersona', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="accionista">Accionistas</option>
            <option value="trabajador">Trabajadores</option>
          </select>

          {/* Persona específica */}
          <select
            value={filtros.persona}
            onChange={(e) => handleFiltroChange('persona', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!filtros.tipoPersona}
          >
            <option value="">Todas las personas</option>
            {filtros.tipoPersona && personas[filtros.tipoPersona + 's']?.map(persona => (
              <option key={persona} value={persona}>{persona}</option>
            ))}
          </select>

          {/* Botón limpiar filtros */}
          <button
            onClick={limpiarFiltros}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Limpiar</span>
          </button>
        </div>

        {/* Filtros de fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/*  RESUMEN DE TOTALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Total Egresos (Bs)</p>
              <p className="text-2xl font-bold">{formatearBs(totales.totalBs)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Egresos (USD)</p>
              <p className="text-2xl font-bold">${totales.totalUsd.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Transacciones</p>
              <p className="text-2xl font-bold">{egresosFiltrados.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/*  TABLA DE EGRESOS */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">
            Detalle de Egresos ({egresosFiltrados.length} registros)
          </h4>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando egresos...</span>
            </div>
          ) : egresosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No se encontraron egresos con los filtros aplicados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto (Bs)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto (USD)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {egresosFiltrados.map((egreso) => (
                  <tr key={egreso.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatearFecha(egreso.fecha_hora || egreso.fechaHora)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={egreso.descripcion}>
                        {egreso.descripcion || egreso.observaciones}
                      </div>
                      <div className="text-xs text-gray-500">{egreso.categoria}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">
                          {egreso.persona_relacionada || 'No especificado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        egreso.tipo_persona === 'accionista' 
                          ? 'bg-purple-100 text-purple-800'
                          : egreso.tipo_persona === 'trabajador'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {egreso.tipo_persona === 'accionista' ? 'Accionista' : 
                         egreso.tipo_persona === 'trabajador' ? 'Trabajador' : 'Otro'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                      {formatearBs(egreso.total_bs || egreso.totalBs)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                      ${(egreso.total_usd || egreso.totalUsd || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {egreso.usuario?.nombre || 'Sistema'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/*  RESUMEN POR PERSONA */}
      {Object.keys(totales.porPersona).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen por Persona
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(totales.porPersona).map(([persona, datos]) => (
              <div key={persona} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{persona}</h5>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    datos.tipo === 'accionista' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {datos.tipo === 'accionista' ? 'Accionista' : 'Trabajador'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Transacciones</p>
                    <p className="font-semibold">{datos.count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Bs</p>
                    <p className="font-semibold">{formatearBs(datos.bs)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total USD</p>
                    <p className="font-semibold">${datos.usd.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesEgresos;