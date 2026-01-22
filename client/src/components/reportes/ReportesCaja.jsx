// components/reportes/ReportesCaja.jsx
import React, { useEffect, useState } from 'react';
import {
  Calendar, User, Eye, Package, DollarSign, Camera, X, ChevronLeft, ChevronRight,
  Download, Filter, Search, Smartphone, ArrowRight, AlertTriangle, CheckCircle, FileText,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';
import DetalleCajaModal from './DetalleCajaModal';

// Modal de evidencias (se mantiene local aquí)
const EvidenciasModal = ({ isOpen, onClose, caja }) => {
  const [fotoActual, setFotoActual] = useState(0);
  if (!isOpen || !caja) return null;

  const fotos = [
    { tipo: 'Apertura', url: caja.fotoApertura, descripcion: 'Foto tomada al abrir la caja' },
    { tipo: 'Arqueo', url: caja.fotoArqueo, descripcion: 'Foto tomada durante el arqueo' },
    { tipo: 'Cierre', url: caja.fotoCierre, descripcion: 'Foto tomada al cerrar la caja' }
  ].filter((f) => f.url);

  const siguiente = () => setFotoActual((p) => (p + 1) % fotos.length);
  const anterior = () => setFotoActual((p) => (p - 1 + fotos.length) % fotos.length);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Camera className="h-5 w-5" /> Evidencias Fotográficas
              </h3>
              <p className="text-blue-100 text-xs mt-1">
                {new Date(caja.fecha).toLocaleDateString('es-VE')} • {caja.usuarioApertura}
              </p>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {fotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="bg-gray-100 p-4 rounded-full mb-3">
                <Camera className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No hay evidencias registradas</p>
              <p className="text-gray-400 text-sm">Esta caja no tiene fotos adjuntas</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-fit mx-auto">
                {fotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFotoActual(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === fotoActual ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-gray-400'}`}
                  />
                ))}
              </div>

              <div className="relative bg-black rounded-xl overflow-hidden shadow-lg group">
                <div className="aspect-video flex items-center justify-center bg-zinc-900">
                  <img src={fotos[fotoActual].url} alt={fotos[fotoActual].tipo} className="max-w-full max-h-[60vh] object-contain" />
                </div>

                {fotos.length > 1 && (
                  <>
                    <button
                      onClick={anterior}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={siguiente}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12 text-white">
                  <h4 className="font-bold text-lg">{fotos[fotoActual].tipo}</h4>
                  <p className="text-sm text-gray-300">{fotos[fotoActual].descripcion}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => toast.info('Descargando...')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" /> Guardar imagen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportesCaja = () => {
  const [loading, setLoading] = useState(false);
  const [cajas, setCajas] = useState([]);
  const [filtros, setFiltros] = useState({ fechaInicio: '', fechaFin: '', usuario: '', estado: '' });
  const [showEvidencias, setShowEvidencias] = useState(false);
  const [showTransacciones, setShowTransacciones] = useState(false);
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);

  const estadosCaja = [
    { value: '', label: 'Todos los estados' },
    { value: 'ABIERTA', label: 'Abierta' },
    { value: 'CERRADA', label: 'Cerrada' },
    { value: 'PENDIENTE_CIERRE_FISICO', label: 'Pendiente Cierre' }
  ];

  const cargarCajas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reportes/cajas', { params: filtros });
      if (response.data?.success) {
        setCajas(response.data.data || []);
        toast.success(`Datos actualizados: ${response.data.data?.length || 0} cajas`);
      } else {
        throw new Error(response.data?.message || 'Error al cargar cajas');
      }
    } catch (error) {
      console.error('Error cargando cajas:', error);
      toast.error('Error de conexión con el servidor');
      // Fallback data for demo
      setCajas([
        {
          id: 1, fecha: new Date().toISOString(), usuarioApertura: 'Admin', estado: 'CERRADA',
          montoInicialBs: 1500, montoFinalBs: 5600.50,
          montoInicialUsd: 100, montoFinalUsd: 120,
          montoInicialPagoMovil: 0, montoFinalPagoMovil: 4500,
          diferenciaBs: 0, diferenciaUsd: 0, diferenciaPagoMovil: 0,
          fotoApertura: 'https://via.placeholder.com/150'
        },
        {
          id: 2, fecha: new Date(Date.now() - 86400000).toISOString(), usuarioApertura: 'Juan Perez', estado: 'PENDIENTE_CIERRE_FISICO',
          montoInicialBs: 1000, montoFinalBs: 1000,
          montoInicialUsd: 50, montoFinalUsd: 50,
          montoInicialPagoMovil: 0, montoFinalPagoMovil: 0,
          diferenciaBs: -100, diferenciaUsd: 0, diferenciaPagoMovil: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'Bs') => {
    const locale = currency === 'Bs' ? 'es-VE' : 'en-US';
    const style = currency === 'Bs' ? undefined : 'currency';
    const options = currency === 'Bs'
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { style: 'currency', currency: 'USD' };

    return new Intl.NumberFormat(locale, options).format(amount || 0) + (currency === 'Bs' ? ' Bs' : '');
  };

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'ABIERTA': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CERRADA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PENDIENTE_CIERRE_FISICO': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLabelEstado = (estado) => {
    switch (estado) {
      case 'ABIERTA': return 'Abierta';
      case 'CERRADA': return 'Cerrada';
      case 'PENDIENTE_CIERRE_FISICO': return 'Pendiente';
      default: return estado;
    }
  }

  const verEvidencias = (caja) => {
    setCajaSeleccionada(caja);
    setShowEvidencias(true);
  };

  const verDetalleCaja = (caja) => {
    setCajaSeleccionada(caja);
    setShowTransacciones(true);
  };

  const handleFiltroChange = (campo, valor) => setFiltros((p) => ({ ...p, [campo]: valor }));
  const limpiarFiltros = () => setFiltros({ fechaInicio: '', fechaFin: '', usuario: '', estado: '' });

  useEffect(() => { cargarCajas(); }, [filtros.fechaInicio, filtros.fechaFin, filtros.estado]);

  const cajasFiltradas = cajas.filter((c) => {
    const byUser = !filtros.usuario || c.usuarioApertura?.toLowerCase().includes(filtros.usuario.toLowerCase());
    return byUser;
  }).sort((a, b) => {
    if (a.estado === 'ABIERTA' && b.estado !== 'ABIERTA') return -1;
    if (a.estado !== 'ABIERTA' && b.estado === 'ABIERTA') return 1;
    return 0;
  });

  // Calculo de totales para footer
  const totalDiffBs = cajasFiltradas.reduce((acc, curr) => acc + (curr.diferenciaBs || 0), 0);
  const totalFinalBs = cajasFiltradas.reduce((acc, curr) => acc + (curr.montoFinalBs || 0), 0);
  const totalFinalUsd = cajasFiltradas.reduce((acc, curr) => acc + (curr.montoFinalUsd || 0), 0);
  const totalFinalPM = cajasFiltradas.reduce((acc, curr) => acc + (curr.montoFinalPagoMovil || 0), 0);

  return (
    <>
      <div className="space-y-6">
        {/* Cabecera y Filtros Premium */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                Historial de Cajas
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Control de aperturas, cierres y evidencias</p>
            </div>
            <div className="flex gap-2">
              <button onClick={limpiarFiltros} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 transition-colors border border-gray-200">
                <Filter className="h-3.5 w-3.5" /> Limpiar
              </button>
              <button onClick={cargarCajas} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-sm shadow-indigo-200 transition-all active:scale-95">
                <Search className="h-3.5 w-3.5" /> Actualizar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="date" value={filtros.fechaInicio} onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="date" value={filtros.fechaFin} onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Buscar usuario..." value={filtros.usuario} onChange={(e) => handleFiltroChange('usuario', e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select value={filtros.estado} onChange={(e) => handleFiltroChange('estado', e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                {estadosCaja.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tarjetas Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Cajas</p>
              <p className="text-2xl font-bold text-gray-800">{cajasFiltradas.length}</p>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg"><Package className="h-5 w-5 text-gray-600" /></div>
          </div>
          {/* Cerradas */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cerradas</p>
              <p className="text-2xl font-bold text-blue-600">{cajasFiltradas.filter(c => c.estado === 'CERRADA').length}</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg"><CheckCircle className="h-5 w-5 text-blue-600" /></div>
          </div>
          {/* Pendientes */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-amber-500">{cajasFiltradas.filter(c => c.estado === 'PENDIENTE_CIERRE_FISICO').length}</p>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          </div>
          {/* Con Fotos */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Evidencias</p>
              <p className="text-2xl font-bold text-purple-600">{cajasFiltradas.filter(c => c.fotoApertura || c.fotoCierre).length}</p>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg"><Camera className="h-5 w-5 text-purple-600" /></div>
          </div>
        </div>

        {/* Tabla Premium */}
        <div className="bg-white border boundary-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Caja Info</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsable</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Operativa</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Efectivo (Bs)</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Divisa ($)</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pago Móvil</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="8" className="py-12 text-center"><div className="animate-spin h-6 w-6 border-2 border-indigo-600 rounded-full border-t-transparent mx-auto"></div></td></tr>
                ) : cajasFiltradas.length === 0 ? (
                  <tr><td colSpan="8" className="py-12 text-center text-gray-400 text-sm">No se encontraron registros</td></tr>
                ) : (
                  cajasFiltradas.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors group">
                      {/* Caja Info */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-gray-800 text-sm">
                            <span className="text-gray-400">#</span>{c.id}
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatearFecha(c.fecha)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase w-fit mt-1 ${getBadgeEstado(c.estado)}`}>
                            {getLabelEstado(c.estado)}
                          </span>
                        </div>
                      </td>

                      {/* Responsable */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {c.usuarioApertura?.charAt(0) || 'U'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-700 leading-tight">{c.usuarioApertura}</span>
                            <span className="text-[10px] text-gray-400">Apertura</span>
                          </div>
                        </div>
                      </td>

                      {/* Operativa */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex flex-col gap-1 text-[10px] font-medium text-gray-600">
                          <span title="Total Transacciones">Transacciones: {c.cantidadTransacciones || 0}</span>
                          <span title="Servicios" className="text-indigo-600">Servicios: {c.cantidadServicios || 0}</span>
                          <span title="Pedidos/Ventas" className="text-emerald-600">Pedidos: {c.cantidadPedidos || 0}</span>
                        </div>
                      </td>

                      {/* Efectivo Bs */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-400 text-[10px]">Ini: {formatCurrency(c.montoInicialBs)}</span>
                          <span className="text-gray-900 text-sm font-mono font-medium">{formatCurrency(c.montoFinalBs)}</span>
                        </div>
                      </td>

                      {/* Divisa */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-400 text-[10px]">Ini: {formatCurrency(c.montoInicialUsd, 'USD')}</span>
                          <span className="text-emerald-700 text-sm font-mono font-medium">{formatCurrency(c.montoFinalUsd, 'USD')}</span>
                        </div>
                      </td>

                      {/* Pago Móvil */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-400 text-[10px]">Ini: {formatCurrency(c.montoInicialPagoMovil)}</span>
                          <span className="text-blue-700 text-sm font-mono font-medium">{formatCurrency(c.montoFinalPagoMovil)}</span>
                        </div>
                      </td>

                      {/* Balance (Diff) */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex flex-col items-center justify-center h-full pt-1">
                          {(c.diferenciaBs !== 0 || c.diferenciaUsd !== 0) ? (
                            <div className="flex flex-col items-end gap-0.5">
                              {Math.abs(c.diferenciaBs) > 0.01 && (
                                <span className={`text-xs font-bold ${c.diferenciaBs > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {c.diferenciaBs > 0 ? '+' : ''}{formatCurrency(c.diferenciaBs)}
                                </span>
                              )}
                              {Math.abs(c.diferenciaUsd) > 0.01 && (
                                <span className={`text-[10px] font-bold ${c.diferenciaUsd > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {c.diferenciaUsd > 0 ? '+' : ''}{formatCurrency(c.diferenciaUsd, 'USD')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">
                              <CheckCircle className="h-3 w-3" /> OK
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => verEvidencias(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver Fotos">
                            <Camera className="h-4 w-4" />
                          </button>
                          <button onClick={() => verDetalleCaja(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalles">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50/80 border-t border-gray-200 font-bold text-xs text-gray-700">
                <tr>
                  <td colSpan="3" className="py-3 px-4 text-right uppercase text-gray-400">Totales Globales</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(totalFinalBs)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(totalFinalUsd, 'USD')}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(totalFinalPM)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`${totalDiffBs >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {totalDiffBs > 0 ? '+' : ''}{formatCurrency(totalDiffBs)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <EvidenciasModal isOpen={showEvidencias} onClose={() => setShowEvidencias(false)} caja={cajaSeleccionada} />
      <DetalleCajaModal isOpen={showTransacciones} onClose={() => setShowTransacciones(false)} caja={cajaSeleccionada} />
    </>
  );
};

export default ReportesCaja;
