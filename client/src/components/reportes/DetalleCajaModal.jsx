// components/reportes/DetalleCajaModal.jsx
import React, { useEffect, useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Download from 'lucide-react/dist/esm/icons/download'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Filter from 'lucide-react/dist/esm/icons/filter'
import Search from 'lucide-react/dist/esm/icons/search'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3'
import PieChart from 'lucide-react/dist/esm/icons/pie-chart'
import Clock from 'lucide-react/dist/esm/icons/clock'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import Package from 'lucide-react/dist/esm/icons/package'
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag'
import Wrench from 'lucide-react/dist/esm/icons/wrench'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import User from 'lucide-react/dist/esm/icons/user'
import Eye from 'lucide-react/dist/esm/icons/eye'
import Receipt from 'lucide-react/dist/esm/icons/receipt'
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';

// Utility format function (defined outside for reuse)
const formatCurrency = (amount, currency = 'Bs') => {
  const locale = currency === 'Bs' ? 'es-VE' : 'en-US';
  const options = currency === 'Bs'
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { style: 'currency', currency: 'USD' };
  return new Intl.NumberFormat(locale, options).format(amount || 0) + (currency === 'Bs' ? ' Bs' : '');
};

const VerTransaccionModal = ({ transaction, onClose, tasaCaja }) => {
  if (!transaction) return null;
  const isIngreso = transaction.tipo === 'INGRESO';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center text-white ${isIngreso ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><Receipt className="h-6 w-6" /></div>
            <div>
              <h3 className="text-lg font-bold">Detalle de {transaction.tipo === 'INGRESO' ? 'Transacción' : 'Egreso'}</h3>
              <p className="text-sm opacity-90 font-mono">#{transaction.id} • {new Date(transaction.fechaHora).toLocaleString('es-VE')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* Info Context */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Responsable</p>
              <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" /> {transaction.usuario?.nombre || 'N/A'}
              </p>
              <p className="text-xs text-gray-400 ml-6">{transaction.usuario?.rol}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Cliente / Beneficiario</p>
              <p className="text-sm font-medium text-gray-800">{transaction.clienteNombre || transaction.cliente?.nombre || 'General'}</p>
              {transaction.cliente?.cedula_rif && <p className="text-xs text-gray-400">{transaction.cliente.cedula_rif}</p>}
            </div>
          </div>

          {/* Description & Tasa */}
          <div className="bg-white border boundary-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Concepto / Categoría</p>
              {transaction.codigoVenta && <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">{transaction.codigoVenta}</span>}
            </div>
            <p className="text-base font-medium text-gray-800 mb-1">{transaction.categoria}</p>
            <p className="text-sm text-gray-500">{transaction.observaciones || 'Sin observaciones adicionales'}</p>
          </div>

          {/* Items Table */}
          {transaction.items?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-indigo-500" /> Items / Productos</h4>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Descripción</th>
                      <th className="px-4 py-2 text-center font-medium">Cant</th>
                      <th className="px-4 py-2 text-right font-medium">Precio</th>
                      <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transaction.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-gray-800">{item.descripcion}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{item.cantidad}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.precioUnitario)}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-800">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-500" /> Método de Pago (Desglose)</h4>
            <div className="space-y-2">
              {transaction.pagos?.length > 0 ? transaction.pagos.map((p, ix) => (
                <div key={ix} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.metodo.replace('_', ' ')}</span>
                  </div>
                  <span className="font-mono font-bold text-gray-800">
                    {p.moneda === 'usd' ? formatCurrency(p.monto, 'USD') : formatCurrency(p.monto, 'Bs')}
                  </span>
                </div>
              )) : (
                <div className="text-center text-gray-400 text-sm">Sin desglose de pagos detallado</div>
              )}
            </div>

            {/* Grand Total */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase">Total Valor (Bs)</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(transaction.totalBs)}</p>
              </div>
              {transaction.totalUsd > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase">Ref USD</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(transaction.totalUsd, 'USD')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700">Cerrar Detalle</button>
        </div>
      </div>
    </div>
  );
};

const DetalleCajaModal = ({ isOpen, onClose, caja }) => {
  const [loading, setLoading] = useState(false);
  const [detalleCompleto, setDetalleCompleto] = useState(null);
  const [tabActiva, setTabActiva] = useState('resumen');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todas');
  const [selectedTx, setSelectedTx] = useState(null);

  const cargarDetalleCompleto = async () => {
    if (!caja) return;
    setLoading(true);
    try {
      const response = await api.get(`/reportes/caja/${caja.id}/detalle`);
      if (response.data?.success) {
        setDetalleCompleto(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Error al cargar detalle');
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
      toast.error('No se pudo cargar el detalle completo');
      setDetalleCompleto({ caja: { ...caja, transacciones: [] }, metricas: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && caja) {
      cargarDetalleCompleto();
      setTabActiva('resumen');
      setSelectedTx(null);
    }
  }, [isOpen, caja]);

  const parseTransacciones = () => {
    const txs = detalleCompleto?.caja?.transacciones || [];
    return {
      all: txs,
      ingresos: txs.filter(t => t.tipo === 'INGRESO'),
      egresos: txs.filter(t => t.tipo === 'EGRESO'),
      servicios: txs.filter(t => t.tipo === 'INGRESO' && t.categoria?.toLowerCase().includes('servicio')),
      pedidos: txs.filter(t => t.tipo === 'INGRESO' && (t.categoria?.toLowerCase().includes('venta') || t.categoria?.toLowerCase().includes('pedido'))),
      filtered: txs.filter(t => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = t.categoria?.toLowerCase().includes(q) ||
          t.observaciones?.toLowerCase().includes(q) ||
          t.usuario?.nombre?.toLowerCase().includes(q) ||
          t.codigoVenta?.toLowerCase().includes(q);
        const matchesFilter = filterType === 'todas' || t.tipo === filterType;
        return matchesSearch && matchesFilter;
      })
    };
  };

  const { all: transacciones, ingresos: txIngresos, egresos: txEgresos, servicios: txServicios, pedidos: txPedidos, filtered: transaccionesFiltradas } = parseTransacciones();

  // Helper to get raw payment sums grouped by currency
  const getTotalsByCurrency = (t) => {
    if (!t.pagos || t.pagos.length === 0) {
      // Fallback to total fields if no detailed payments
      const res = {};
      if (t.totalBs > 0) res.bs = t.totalBs;
      if (t.totalUsd > 0) res.usd = t.totalUsd;
      return res;
    }
    return t.pagos.reduce((acc, p) => {
      const curr = p.moneda?.toLowerCase() || 'bs';
      acc[curr] = (acc[curr] || 0) + Number(p.monto);
      return acc;
    }, {});
  }

  const getMetodoIcon = (metodo) => {
    const map = {
      efectivo_bs: <DollarSign className="h-3 w-3" />,
      efectivo_usd: <DollarSign className="h-3 w-3" />,
      pago_movil: <Smartphone className="h-3 w-3" />,
      transferencia: <CreditCard className="h-3 w-3" />,
      zelle: <CreditCard className="h-3 w-3" />,
      binance: <CreditCard className="h-3 w-3" />
    };
    return map[metodo] || <CreditCard className="h-3 w-3" />;
  };

  const getMetodoColor = (metodo) => {
    const map = {
      efectivo_bs: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      efectivo_usd: 'bg-green-50 text-green-700 border-green-200',
      pago_movil: 'bg-purple-50 text-purple-700 border-purple-200',
      transferencia: 'bg-orange-50 text-orange-700 border-orange-200',
      zelle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      binance: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    };
    return map[metodo] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  if (!isOpen || !caja) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex-shrink-0 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/10">
                <Package className="h-6 w-6 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-3">
                  Detalle de Caja #{caja.id}
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20 font-bold ${caja.estado === 'ABIERTA' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                    {caja.estado}
                  </span>
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(caja.fecha).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {caja.usuarioApertura}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toast.info('Generando PDF...')} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all border border-white/10 hover:border-white/30">
                <Download className="h-4 w-4" /> Exportar
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white border-b border-gray-100 px-6 py-1 flex gap-6 overflow-x-auto no-scrollbar flex-shrink-0">
            {[
              { id: 'resumen', label: 'Resumen Operativo', icon: BarChart3 },
              { id: 'transacciones', label: 'Transacciones', icon: FileText },
              { id: 'metricas', label: 'Métricas Financieras', icon: PieChart }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tabActiva === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden bg-gray-50/50 relative">
            <div className="h-full overflow-y-auto custom-scrollbar p-6">

              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
                  <div className="animate-spin h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full"></div>
                  <p className="text-sm font-medium">Cargando datos de la caja...</p>
                </div>
              ) : (
                <>
                  {/* RESUMEN VIEW */}
                  {tabActiva === 'resumen' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      {/* ... (Keep existing Resumen layout, it is premium) ... */}
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                          <div><p className="text-xs font-semibold text-gray-400 uppercase">Transacciones</p><p className="text-2xl font-bold text-gray-800">{transacciones.length}</p></div>
                          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><FileText className="h-6 w-6" /></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                          <div><p className="text-xs font-semibold text-gray-400 uppercase">Pedidos</p><p className="text-2xl font-bold text-gray-800">{txPedidos.length}</p></div>
                          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><ShoppingBag className="h-6 w-6" /></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                          <div><p className="text-xs font-semibold text-gray-400 uppercase">Servicios</p><p className="text-2xl font-bold text-gray-800">{txServicios.length}</p></div>
                          <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Wrench className="h-6 w-6" /></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                          <div><p className="text-xs font-semibold text-gray-400 uppercase">Egresos</p><p className="text-2xl font-bold text-rose-600">{txEgresos.length}</p></div>
                          <div className="bg-rose-50 p-3 rounded-xl text-rose-600"><TrendingDown className="h-6 w-6" /></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Detailed Balance display (reused from previous step logic) */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><DollarSign className="h-5 w-5 text-indigo-500" /> Balance de Caja</h3>
                          <div className="space-y-6">
                            {/* Bs */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-end"><span className="text-sm font-medium text-gray-600">Efectivo Bolívares</span><span className="font-bold text-indigo-600">{formatCurrency(caja.montoFinalBs)}</span></div>
                              <div className="relative h-2 bg-gray-100 rounded-full"><div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div></div>
                            </div>
                            {/* USD */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-end"><span className="text-sm font-medium text-gray-600">Efectivo Divisas</span><span className="font-bold text-emerald-600">{formatCurrency(caja.montoFinalUsd, 'USD')}</span></div>
                              <div className="relative h-2 bg-gray-100 rounded-full"><div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-end"><span className="text-sm font-medium text-gray-600">Pago Móvil</span><span className="font-bold text-purple-600">{formatCurrency(caja.montoFinalPagoMovil)}</span></div>
                              <div className="relative h-2 bg-gray-100 rounded-full"><div className="absolute top-0 left-0 h-full bg-purple-500 rounded-full" style={{ width: '100%' }}></div></div>
                            </div>
                          </div>
                        </div>
                        {/* Operational Details */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                          <h3 className="text-lg font-bold text-gray-800 mb-2">Detalles Operativos</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-xl border"><p className="text-xs text-gray-400 font-bold uppercase">Apertura</p><p className="font-bold">{caja.horaApertura || '--:--'}</p></div>
                            <div className="bg-gray-50 p-3 rounded-xl border"><p className="text-xs text-gray-400 font-bold uppercase">Cierre</p><p className="font-bold">{caja.horaCierre || 'En Curso'}</p></div>
                            <div className="bg-gray-50 p-3 rounded-xl border"><p className="text-xs text-gray-400 font-bold uppercase">Tasa BCV</p><p className="font-bold text-blue-600">{caja.tasaBcv} Bs</p></div>
                            <div className="bg-gray-50 p-3 rounded-xl border"><p className="text-xs text-gray-400 font-bold uppercase">Paralelo</p><p className="font-bold text-emerald-600">{caja.tasaParalelo} Bs</p></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TRANSACCIONES VIEW */}
                  {tabActiva === 'transacciones' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      {/* Filters ... */}
                      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-10">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-50 border rounded-lg px-4 py-2 text-sm outline-none">
                          <option value="todas">Todas</option>
                          <option value="INGRESO">Ingresos</option>
                          <option value="EGRESO">Egresos</option>
                        </select>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hora/ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Detalle</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monto Total</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Pagos</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {transaccionesFiltradas.length === 0 ? <tr><td colSpan="6" className="py-12 text-center text-gray-400">Sin resultados</td></tr> : transaccionesFiltradas.map(t => {
                                const isIngreso = t.tipo === 'INGRESO';
                                const totals = getTotalsByCurrency(t);
                                return (
                                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 align-top">
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{new Date(t.fechaHora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">#{t.id}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 align-top max-w-xs">
                                      <div className="flex flex-col gap-1">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold w-fit ${isIngreso ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{t.tipo} - {t.categoria}</span>
                                        <p className="text-sm text-gray-600 truncate">{t.observaciones || 'Sin descripción'}</p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-sm">{t.clienteNombre || t.cliente?.nombre || '-'}</td>
                                    <td className="px-6 py-4 align-top text-right">
                                      <div className="flex flex-col items-end gap-0.5">
                                        {totals.bs && <span className="text-sm font-bold text-gray-900">{formatCurrency(totals.bs)}</span>}
                                        {totals.usd && <span className="text-sm font-bold text-emerald-600">{formatCurrency(totals.usd, 'USD')}</span>}
                                        {!totals.bs && !totals.usd && <span className="text-xs text-gray-400">--</span>}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-right">
                                      <div className="flex flex-wrap justify-end gap-1">
                                        {t.pagos?.map((p, i) => (
                                          <span key={i} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${getMetodoColor(p.metodo)}`}>
                                            {getMetodoIcon(p.metodo)}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-center">
                                      <button onClick={() => setSelectedTx(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver Detalle">
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* METRICAS VIEW */}
                  {tabActiva === 'metricas' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                      {/* Products */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Productos más Vendidos</h3>
                        <div className="space-y-4">
                          {detalleCompleto?.metricas?.productosVendidos && Object.entries(detalleCompleto.metricas.productosVendidos).map(([name, data], i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                                <span className="text-sm font-medium">{name}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{data.cantidad} und</p>
                                <p className="text-xs text-emerald-600">{formatCurrency(data.total, 'USD')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Payments */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Mètodos de Pago</h3>
                        <div className="space-y-4">
                          {detalleCompleto?.metricas?.metodosDepago && Object.entries(detalleCompleto.metricas.metodosDepago).map(([metodo, monto], i) => {
                            const total = Object.values(detalleCompleto.metricas.metodosDepago).reduce((a, b) => a + b, 0);
                            const pct = total ? Math.round((monto / total) * 100) : 0;
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="capitalize">{metodo.split(' ')[0].replace('_', ' ')}</span>
                                  <span className="font-bold">{formatCurrency(monto)}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${getMetodoColor(metodo.split(' ')[0]).split(' ')[0].replace('50', '500')}`} style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <VerTransaccionModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </>
  );
};

export default DetalleCajaModal;
