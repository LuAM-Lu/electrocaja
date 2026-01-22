// components/reportes/ReportesEgresos.jsx
import React, { useState, useEffect } from 'react';
import {
  Search, Filter, TrendingDown, User, Calendar, DollarSign,
  FileText, ArrowDownRight, Wallet, PieChart, Users, ArrowRight
} from 'lucide-react';
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';

// Helper for currency formatting
const formatCurrency = (amount, currency = 'Bs') => {
  const locale = currency === 'Bs' ? 'es-VE' : 'en-US';
  const options = currency === 'Bs'
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { style: 'currency', currency: 'USD' };
  return new Intl.NumberFormat(locale, options).format(Number(amount) || 0) + (currency === 'Bs' ? ' Bs' : '');
};

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

  // Lista de ejemplo (idealmente vendría de backend)
  const personas = {
    accionistas: ['Juan Pérez', 'María González', 'Carlos Rodríguez'],
    trabajadores: ['Ana López', 'Pedro Martínez', 'Luis Fernández', 'Carmen Silva']
  };

  const cargarEgresos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reportes/egresos', { params: filtros });
      if (response.data.success) {
        const egresosData = response.data.data || [];
        setEgresos(egresosData);
        calcularTotales(egresosData);
        toast.success(`Datos actualizados`);
      } else {
        throw new Error(response.data.message || 'Error al cargar egresos');
      }
    } catch (error) {
      console.error('Error cargando egresos:', error);
      // Fallback data
      const egresosEjemplo = [
        {
          id: 1, descripcion: 'Pago accionista Juan Pérez - Dividendos Q4', categoria: 'Pago accionista',
          total_bs: 500000, total_usd: 250, fecha_hora: new Date().toISOString(),
          usuario: { nombre: 'Admin' }, persona_relacionada: 'Juan Pérez', tipo_persona: 'accionista'
        },
        {
          id: 2, descripcion: 'Salario Ana López', categoria: 'Pago trabajador',
          total_bs: 150000, total_usd: 50, fecha_hora: new Date(Date.now() - 86400000).toISOString(),
          usuario: { nombre: 'Admin' }, persona_relacionada: 'Ana López', tipo_persona: 'trabajador'
        }
      ];
      setEgresos(egresosEjemplo);
      calcularTotales(egresosEjemplo);
      toast.error('Modo offline: mostrando datos de ejemplo');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = (datos) => {
    // Totales se calculan sumando los valores que ya vienen "reales" del backend
    const totalBs = datos.reduce((sum, e) => sum + Number(e.total_bs || e.totalBs || 0), 0);
    const totalUsd = datos.reduce((sum, e) => sum + Number(e.total_usd || e.totalUsd || 0), 0);

    const porPersona = {};
    datos.forEach(e => {
      const persona = e.persona_relacionada;
      if (persona) {
        if (!porPersona[persona]) {
          porPersona[persona] = { bs: 0, usd: 0, count: 0, tipo: e.tipo_persona || e.tipoPersona };
        }
        porPersona[persona].bs += Number(e.total_bs || e.totalBs || 0);
        porPersona[persona].usd += Number(e.total_usd || e.totalUsd || 0);
        porPersona[persona].count += 1;
      }
    });
    setTotales({ totalBs, totalUsd, porPersona });
  };

  const egresosFiltrados = egresos.filter(e => {
    const q = filtros.busqueda.toLowerCase();
    const matchBusqueda = !q ||
      e.descripcion?.toLowerCase().includes(q) ||
      e.categoria?.toLowerCase().includes(q) ||
      e.persona_relacionada?.toLowerCase().includes(q);
    const matchTipo = !filtros.tipoPersona || (e.tipo_persona || e.tipoPersona) === filtros.tipoPersona;
    const matchPersona = !filtros.persona || e.persona_relacionada === filtros.persona;
    return matchBusqueda && matchTipo && matchPersona;
  });

  const handleFiltroChange = (f, v) => {
    const nuevos = { ...filtros, [f]: v };
    if (f === 'tipoPersona') nuevos.persona = '';
    setFiltros(nuevos);
  };

  useEffect(() => { cargarEgresos(); }, [filtros.fechaInicio, filtros.fechaFin]);

  return (
    <div className="space-y-6">

      {/* FILTROS PREMIUM */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-rose-500" /> Control de Gastos y Egresos
            </h3>
            <p className="text-xs text-gray-500 mt-1">Gestión de pagos a personal, accionistas y operativos.</p>
          </div>
          <button onClick={cargarEgresos} className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors flex items-center gap-2">
            {loading ? <div className="animate-spin h-3 w-3 border-2 border-rose-600 rounded-full border-t-transparent"></div> : <Search className="h-3 w-3" />}
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar egreso..." value={filtros.busqueda} onChange={e => handleFiltroChange('busqueda', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select value={filtros.tipoPersona} onChange={e => handleFiltroChange('tipoPersona', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none appearance-none cursor-pointer">
              <option value="">Todos los tipos</option>
              <option value="accionista">Accionistas</option>
              <option value="trabajador">Trabajadores</option>
            </select>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select value={filtros.persona} onChange={e => handleFiltroChange('persona', e.target.value)} disabled={!filtros.tipoPersona}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none appearance-none cursor-pointer disabled:opacity-50">
              <option value="">Todas las personas</option>
              {filtros.tipoPersona && personas[filtros.tipoPersona + 's']?.map(p => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
          <div className="flex gap-2">
            <input type="date" value={filtros.fechaInicio} onChange={e => handleFiltroChange('fechaInicio', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            <input type="date" value={filtros.fechaFin} onChange={e => handleFiltroChange('fechaFin', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
        </div>
      </div>

      {/* DASHBOARD SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Egresado (Bs)</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totales.totalBs)}</p>
            </div>
            <div className="bg-rose-50 p-2 rounded-lg text-rose-600"><TrendingDown className="h-6 w-6" /></div>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Egresado (USD)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totales.totalUsd, 'USD')}</p>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><DollarSign className="h-6 w-6" /></div>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Movimientos</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{egresosFiltrados.length}</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><FileText className="h-6 w-6" /></div>
          </div>
          <p className="text-xs text-gray-400 mt-4">Transacciones registradas</p>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border boundary-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h4 className="font-bold text-gray-800 flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-rose-500" />
            Detalle de Movimientos
          </h4>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">{egresosFiltrados.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Beneficiario</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pl-8">Registrado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-rose-500 rounded-full border-t-transparent mx-auto"></div></td></tr>
              ) : egresosFiltrados.length === 0 ? (
                <tr><td colSpan="5" className="py-12 text-center text-gray-400 text-sm">No se encontraron egresos</td></tr>
              ) : (
                egresosFiltrados.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(e.fecha_hora || e.fechaHora).toLocaleDateString('es-VE')}
                      </div>
                      <p className="text-[10px] text-gray-400 pl-5.5 mt-0.5">{new Date(e.fecha_hora || e.fechaHora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2" title={e.descripcion}>{e.descripcion || e.observaciones}</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase mt-1">{e.categoria}</span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${(e.tipo_persona || e.tipoPersona) === 'accionista' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                          {(e.persona_relacionada || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{e.persona_relacionada || 'No especificado'}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{(e.tipo_persona || e.tipoPersona)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-right text-sm">
                      {(!e.total_usd && e.total_bs > 0) && (
                        <span className="font-mono font-medium text-gray-800">{formatCurrency(e.total_bs)}</span>
                      )}
                      {(e.total_usd > 0 && !e.total_bs) && (
                        <span className="font-mono font-bold text-emerald-600">{formatCurrency(e.total_usd, 'USD')}</span>
                      )}
                      {(e.total_usd > 0 && e.total_bs > 0) && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono font-medium text-gray-800">{formatCurrency(e.total_bs)}</span>
                          <span className="font-mono font-bold text-emerald-600 text-xs">{formatCurrency(e.total_usd, 'USD')}</span>
                        </div>
                      )}
                      {(!e.total_bs && !e.total_usd) && <span className="text-gray-400">0,00</span>}
                    </td>
                    <td className="px-6 py-4 align-top pl-8">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="h-3 w-3" /> {e.usuario?.nombre || 'Sistema'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUMMARY BY PERSON */}
      {Object.keys(totales.porPersona).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" /> Resumen por Beneficiario
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(totales.porPersona).map(([persona, d]) => (
              <div key={persona} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-indigo-200 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${d.tipo === 'accionista' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                      {persona.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{persona}</p>
                      <p className="text-xs text-gray-500 font-medium capitalize">{d.tipo}</p>
                    </div>
                  </div>
                  <span className="bg-white px-2 py-1 rounded text-xs font-bold text-gray-600 border shadow-sm">{d.count} Tx</span>
                </div>
                <div className="space-y-1">
                  {d.bs > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Total Bs</span>
                      <span className="font-bold text-gray-800">{formatCurrency(d.bs)}</span>
                    </div>
                  )}
                  {d.usd > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Total USD</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(d.usd, 'USD')}</span>
                    </div>
                  )}
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