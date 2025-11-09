// components/reportes/ReportesCaja.jsx
import React, { useEffect, useState } from 'react';
import {
  Calendar, User, Eye, Package, DollarSign, Camera, X, ChevronLeft, ChevronRight,
  Download, Filter, Search, Smartphone
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Evidencias Fotográficas</h3>
              <p className="text-blue-100 text-sm">
                Caja del {new Date(caja.fecha).toLocaleDateString('es-VE')} • {caja.usuarioApertura}
              </p>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-300px)]">
          {fotos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No hay evidencias fotográficas disponibles</p>
              <p className="text-gray-400 text-sm">Esta caja no tiene fotos registradas</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {fotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFotoActual(i)}
                      className={`w-3 h-3 rounded-full ${i === fotoActual ? 'bg-blue-500' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
                <div className="text-sm text-gray-500">{fotoActual + 1} de {fotos.length}</div>
              </div>

              <div className="relative bg-gray-100 rounded-xl overflow-hidden">
                <div className="aspect-video flex items-center justify-center">
                  {fotos[fotoActual]?.url ? (
                    <img src={fotos[fotoActual].url} alt={fotos[fotoActual].tipo} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2" />
                      <p>Imagen no disponible</p>
                    </div>
                  )}
                </div>

                {fotos.length > 1 && (
                  <>
                    <button
                      onClick={anterior}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={siguiente}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
                  <p className="font-semibold">{fotos[fotoActual]?.tipo}</p>
                  <p className="text-sm text-gray-200">{fotos[fotoActual]?.descripcion}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <p><strong>Usuario:</strong> {caja.usuarioApertura}</p>
                  <p><strong>Fecha:</strong> {new Date(caja.fecha).toLocaleDateString('es-VE')}</p>
                  <p><strong>Horario:</strong> {caja.horaApertura} - {caja.horaCierre || 'En curso'}</p>
                  <p><strong>Tasa BCV:</strong> {caja.tasaBcv ? `${caja.tasaBcv} Bs/$` : 'No registrada'}</p>
                </div>
                <button
                  onClick={() => toast.info('Función de descarga próximamente')}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar</span>
                </button>
              </div>
            </>
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
        toast.success(`${(response.data.data || []).length} cajas encontradas`);
      } else {
        throw new Error(response.data?.message || 'Error al cargar cajas');
      }
    } catch (error) {
      console.error('Error cargando cajas:', error);
      toast.error(error.response?.data?.message || 'Error al cargar cajas');
      // Fallback de ejemplo
      setCajas([
        {
          id: 1,
          fecha: '2025-01-20',
          usuarioApertura: 'Juan Pérez',
          usuarioCierre: 'Juan Pérez',
          estado: 'CERRADA',
          montoInicialBs: 100000,
          montoInicialUsd: 50,
          montoInicialPagoMovil: 0,
          montoFinalBs: 450000,
          montoFinalUsd: 180,
          montoFinalPagoMovil: 25000,
          totalIngresosBs: 350000,
          totalEgresosBs: 0,
          totalIngresosUsd: 130,
          totalEgresosUsd: 0,
          diferenciaBs: 0,
          diferenciaUsd: 0,
          diferenciaPagoMovil: 0,
          fotoApertura: '/api/uploads/caja-1-apertura.jpg',
          fotoArqueo: '/api/uploads/caja-1-arqueo.jpg',
          fotoCierre: '/api/uploads/caja-1-cierre.jpg',
          observaciones: 'Operación normal',
          tasaBcv: 36.5,
          tasaParalelo: 38.2,
          horaApertura: '08:00',
          horaCierre: '18:30'
        },
        {
          id: 2,
          fecha: '2025-01-19',
          usuarioApertura: 'María González',
          usuarioCierre: 'María González',
          estado: 'CERRADA',
          montoInicialBs: 100000,
          montoInicialUsd: 50,
          montoInicialPagoMovil: 0,
          montoFinalBs: 280000,
          montoFinalUsd: 95,
          montoFinalPagoMovil: 15000,
          totalIngresosBs: 200000,
          totalEgresosBs: 20000,
          totalIngresosUsd: 60,
          totalEgresosUsd: 15,
          diferenciaBs: 5000,
          diferenciaUsd: 0,
          diferenciaPagoMovil: 0,
          fotoApertura: '/api/uploads/caja-2-apertura.jpg',
          fotoCierre: '/api/uploads/caja-2-cierre.jpg',
          observaciones: 'Ajuste Bs por cambio',
          tasaBcv: 36.2,
          tasaParalelo: 37.85,
          horaApertura: '08:15',
          horaCierre: '17:45'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatearBs = (amount) => Math.round(amount || 0).toLocaleString('es-VE');
  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'ABIERTA':
        return 'bg-green-100 text-green-800';
      case 'CERRADA':
        return 'bg-blue-100 text-blue-800';
      case 'PENDIENTE_CIERRE_FISICO':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const verEvidencias = (caja) => {
    setCajaSeleccionada(caja);
    setShowEvidencias(true);
  };

  const verDetalleCaja = (caja) => {
    setCajaSeleccionada(caja);
    setShowTransacciones(true);
  };

  const cajasFiltradas = cajas.filter((c) => {
    const byUser = !filtros.usuario || c.usuarioApertura?.toLowerCase().includes(filtros.usuario.toLowerCase());
    const byState = !filtros.estado || c.estado === filtros.estado;
    return byUser && byState;
  });

  const handleFiltroChange = (campo, valor) => setFiltros((p) => ({ ...p, [campo]: valor }));

  const limpiarFiltros = () => setFiltros({ fechaInicio: '', fechaFin: '', usuario: '', estado: '' });

  useEffect(() => {
    cargarCajas();
  }, [filtros.fechaInicio, filtros.fechaFin, filtros.estado]);

  return (
    <>
      <div className="space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 text-blue-500 mr-2" />
              Historial de Cajas con Evidencias
            </h3>
            <div className="flex items-center space-x-2">
              <button onClick={limpiarFiltros} className="flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                <Filter className="h-4 w-4" />
                <span>Limpiar</span>
              </button>
              <button
                onClick={cargarCajas}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                placeholder="Buscar por usuario..."
                value={filtros.usuario}
                onChange={(e) => handleFiltroChange('usuario', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => handleFiltroChange('estado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {estadosCaja.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Cajas</p>
                <p className="text-2xl font-bold">{cajasFiltradas.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Cerradas</p>
                <p className="text-2xl font-bold">{cajasFiltradas.filter((c) => c.estado === 'CERRADA').length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pendientes</p>
                <p className="text-2xl font-bold">{cajasFiltradas.filter((c) => c.estado === 'PENDIENTE_CIERRE_FISICO').length}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Con Evidencias</p>
                <p className="text-2xl font-bold">{cajasFiltradas.filter((c) => c.fotoApertura || c.fotoCierre).length}</p>
              </div>
              <Camera className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Tabla principal: Inicio y Cierre para Bs, USD y Pago Móvil */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">Detalle de Cajas ({cajasFiltradas.length} registros)</h4>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-gray-600">Cargando cajas...</span>
              </div>
            ) : cajasFiltradas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No se encontraron cajas con los filtros aplicados</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>

                    {/* Efectivo Bs. */}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Inicial (Bs)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Final (Bs)</th>

                    {/* Efectivo USD */}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Inicial (USD)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Final (USD)</th>

                    {/* Pago Móvil */}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Inicial (PM)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Final (PM)</th>

                    {/* Diferencias */}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Diferencias</th>

                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Evidencias</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cajasFiltradas.map((c) => {
                    const difBs = c.diferenciaBs || 0;
                    const difUsd = c.diferenciaUsd || 0;
                    const difPM = c.diferenciaPagoMovil || 0;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatearFecha(c.fecha)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900">{c.usuarioApertura}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeEstado(c.estado)}`}>
                            {c.estado === 'CERRADA' ? 'Cerrada' : c.estado === 'ABIERTA' ? 'Abierta' : 'Pendiente'}
                          </span>
                        </td>

                        {/* Efectivo Bs. (inicio / final) */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-mono">{formatearBs(c.montoInicialBs)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-mono">{formatearBs(c.montoFinalBs)}</td>

                        {/* Efectivo USD (inicio / final) */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-mono">${Number(c.montoInicialUsd || 0).toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-mono">${Number(c.montoFinalUsd || 0).toFixed(2)}</td>

                        {/* Pago Móvil (inicio / final) */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-mono">
                          <div className="flex items-center justify-end">
                            <Smartphone className="h-3 w-3 text-gray-400 mr-1" />
                            {formatearBs(c.montoInicialPagoMovil || 0)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-mono">
                          <div className="flex items-center justify-end">
                            <Smartphone className="h-3 w-3 text-gray-400 mr-1" />
                            {formatearBs(c.montoFinalPagoMovil || 0)}
                          </div>
                        </td>

                        {/* Diferencias resumidas */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          <div className="space-y-1 font-mono">
                            <div
                              className={`text-xs ${
                                Math.abs(difBs) < 1000 ? 'text-gray-600' : difBs > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              Bs: {Math.abs(difBs) < 1000 ? '' : (difBs > 0 ? '+' : '') + formatearBs(difBs)}
                            </div>
                            <div
                              className={`text-xs ${
                                Math.abs(difUsd) < 1 ? 'text-gray-600' : difUsd > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              USD: {Math.abs(difUsd) < 1 ? '' : (difUsd > 0 ? '+' : '') + Number(difUsd).toFixed(2)}
                            </div>
                            <div
                              className={`text-xs ${
                                Math.abs(difPM) < 1000 ? 'text-gray-600' : difPM > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              PM: {Math.abs(difPM) < 1000 ? '' : (difPM > 0 ? '+' : '') + formatearBs(difPM)}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => verEvidencias(c)}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
                          >
                            <Camera className="h-4 w-4" />
                            <span>Fotos</span>
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => verDetalleCaja(c)}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm"
                            title="Ver transacciones de la caja"
                          >
                            <Eye className="h-4 w-4" />
                            <span>VER</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      <EvidenciasModal isOpen={showEvidencias} onClose={() => setShowEvidencias(false)} caja={cajaSeleccionada} />

      <DetalleCajaModal isOpen={showTransacciones} onClose={() => setShowTransacciones(false)} caja={cajaSeleccionada} />
    </>
  );
};

export default ReportesCaja;
