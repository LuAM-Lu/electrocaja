// components/reportes/DetalleCajaModal.jsx
import React, { useEffect, useState } from 'react';
import {
  X, Download, FileText, Filter, Search, BarChart3, PieChart,
  Clock, TrendingUp, TrendingDown, DollarSign, Smartphone, CreditCard, Package
} from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

const DetalleCajaModal = ({ isOpen, onClose, caja }) => {
  const [loading, setLoading] = useState(false);
  const [detalleCompleto, setDetalleCompleto] = useState(null);
  const [tabActiva, setTabActiva] = useState('transacciones');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todas');

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
      toast.error('Error al cargar detalle de la caja');
      // Fallback de ejemplo (para que el modal funcione si el backend no responde):
      setDetalleCompleto({
        caja: {
          ...caja,
          transacciones: [
            {
              id: 1,
              tipo: 'INGRESO',
              categoria: 'Venta',
              codigoVenta: 'V-001-2025',
              observaciones: 'Venta iPhone 15 Pro Max + Funda',
              totalBs: 450000,
              totalUsd: 225,
              fechaHora: new Date().toISOString(),
              usuario: { nombre: 'Juan Pérez', rol: 'cajero' },
              cliente: { nombre: 'Carlos García', cedula_rif: 'V-12345678' },
              items: [
                { descripcion: 'iPhone 15 Pro Max 128GB', cantidad: 1, precioUnitario: 420000, subtotal: 420000, producto: { tipo: 'PRODUCTO' } },
                { descripcion: 'Funda Protectora', cantidad: 1, precioUnitario: 30000, subtotal: 30000, producto: { tipo: 'PRODUCTO' } }
              ],
              pagos: [
                { metodo: 'efectivo_usd', monto: 100, moneda: 'usd' },
                { metodo: 'pago_movil', monto: 125000, moneda: 'bs' }
              ]
            },
            {
              id: 2,
              tipo: 'EGRESO',
              categoria: 'Pago trabajador',
              observaciones: 'Adelanto salario',
              totalBs: 50000,
              totalUsd: 25,
              fechaHora: new Date(Date.now() - 3600000).toISOString(),
              usuario: { nombre: 'Admin', rol: 'admin' },
              pagos: [{ metodo: 'efectivo_bs', monto: 50000, moneda: 'bs' }]
            },
            {
              id: 3,
              tipo: 'INGRESO',
              categoria: 'Servicio',
              codigoVenta: 'S-001-2025',
              observaciones: 'Reparación Samsung',
              totalBs: 80000,
              totalUsd: 40,
              fechaHora: new Date(Date.now() - 7200000).toISOString(),
              usuario: { nombre: 'María González', rol: 'cajero' },
              cliente: { nombre: 'Ana López', cedula_rif: 'V-87654321' },
              items: [{ descripcion: 'Reparación pantalla', cantidad: 1, precioUnitario: 80000, subtotal: 80000, producto: { tipo: 'SERVICIO' } }],
              pagos: [{ metodo: 'transferencia', monto: 80000, moneda: 'bs' }]
            }
          ]
        },
        metricas: {
          totalTransacciones: 3,
          ingresosPorCategoria: { Venta: 450000, Servicio: 80000 },
          egresosPorCategoria: { 'Pago trabajador': 50000 },
          productosVendidos: {
            'iPhone 15 Pro Max 128GB': { cantidad: 1, total: 420000 },
            'Funda Protectora': { cantidad: 1, total: 30000 }
          },
          metodosDepago: {
            'efectivo_usd (usd)': 100,
            'pago_movil (bs)': 125000,
            'efectivo_bs (bs)': 50000,
            'transferencia (bs)': 80000
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatearBs = (amount) => Math.round(amount || 0).toLocaleString('es-VE');
  const formatearHora = (fecha) =>
    new Date(fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

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
      efectivo_bs: 'bg-indigo-50 text-indigo-700',
      efectivo_usd: 'bg-green-50 text-green-700',
      pago_movil: 'bg-purple-50 text-purple-700',
      transferencia: 'bg-orange-50 text-orange-700',
      zelle: 'bg-green-50 text-green-700',
      binance: 'bg-yellow-50 text-yellow-700'
    };
    return map[metodo] || 'bg-gray-50 text-gray-700';
  };

  const transacciones = detalleCompleto?.caja?.transacciones || [];
  const transaccionesFiltradas = transacciones.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      t.categoria?.toLowerCase().includes(q) ||
      t.observaciones?.toLowerCase().includes(q) ||
      t.usuario?.nombre?.toLowerCase().includes(q) ||
      t.codigoVenta?.toLowerCase().includes(q);
    const matchesFilter = filterType === 'todas' || t.tipo === filterType;
    return matchesSearch && matchesFilter;
  });

  const generarPDF = () => {
    toast.info('Generando PDF de la caja...');
    // TODO: Implementar exportación en backend o cliente
  };

  useEffect(() => {
    if (isOpen && caja) cargarDetalleCompleto();
  }, [isOpen, caja]);

  if (!isOpen || !caja) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2 border border-white/30">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Detalle Completo Caja #{caja.id}</h2>
                <p className="text-sm text-blue-100">
                  {new Date(caja.fecha).toLocaleDateString('es-VE')} • {caja.usuarioApertura} • {caja.estado}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={generarPDF} className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg">
                <Download className="h-4 w-4 text-white" />
                <span className="text-sm text-white">PDF</span>
              </button>
              <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl">
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-white/10 rounded-xl p-1">
            {[
              { id: 'transacciones', label: 'Transacciones', icon: FileText },
              { id: 'resumen', label: 'Resumen', icon: BarChart3 },
              { id: 'metricas', label: 'Métricas', icon: PieChart }
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTabActiva(t.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all font-medium ${
                    tabActiva === t.id ? 'bg-white text-blue-600 shadow-lg' : 'text-blue-100 hover:bg-white/20'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Controles de búsqueda */}
          {tabActiva === 'transacciones' && (
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por código, categoría o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-white/30 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white/60 text-gray-900"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white z-10 pointer-events-none" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-white/30 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white/60 min-w-[140px] text-gray-900"
                >
                  <option value="todas">Todas</option>
                  <option value="INGRESO">Solo Ingresos</option>
                  <option value="EGRESO">Solo Egresos</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <div className="h-full overflow-y-auto max-h-[calc(95vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Cargando detalle completo...</p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {tabActiva === 'transacciones' && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">Transacciones ({transaccionesFiltradas.length})</h4>
                    </div>
                    <div className="overflow-x-auto">
                      {transaccionesFiltradas.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No se encontraron transacciones</div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID/Hora</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Monto</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Forma de Pago</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {transaccionesFiltradas.map((t) => {
                              const ingreso = t.tipo === 'INGRESO';
                              return (
                                <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="text-xs font-mono text-gray-400">#{t.id}</div>
                                    <div className="text-xs text-gray-600 font-medium flex items-center">
                                      <Clock className="h-3 w-3 mr-1 text-gray-400" />
                                      {formatearHora(t.fechaHora)}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="text-xs font-medium text-gray-900">{t.usuario?.nombre || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{t.usuario?.rol || ''}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <div
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                            ingreso
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-red-50 text-red-700 border-red-200'
                                          }`}
                                        >
                                          {ingreso ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                          {ingreso ? 'ING' : 'EGR'}
                                        </div>
                                        {t.codigoVenta && <div className="text-base font-semibold text-gray-900">{t.codigoVenta}</div>}
                                      </div>
                                      <div className="text-sm font-medium text-gray-900">{t.categoria}</div>
                                      {t.items?.length > 0 && (
                                        <div className="text-xs text-gray-600">
                                          {t.items.length} item{t.items.length > 1 ? 's' : ''}:{' '}
                                          {t.items.slice(0, 2).map((i) => i.descripcion).join(', ')}
                                          {t.items.length > 2 && ` +${t.items.length - 2} más`}
                                        </div>
                                      )}
                                      {t.observaciones && <div className="text-xs text-gray-500 max-w-md">{t.observaciones}</div>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {t.cliente?.nombre || t.clienteNombre || '-'}
                                    {t.cliente?.cedula_rif && <div className="text-xs text-gray-400">{t.cliente.cedula_rif}</div>}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-right">
                                    <div className="space-y-1">
                                      <div className={`text-sm font-bold ${ingreso ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {ingreso ? '+' : '-'}
                                        {formatearBs(t.totalBs)} Bs
                                      </div>
                                      {t.totalUsd > 0 && (
                                        <div className={`text-sm font-bold ${ingreso ? 'text-green-600' : 'text-red-600'}`}>
                                          {ingreso ? '+' : '-'}${Number(t.totalUsd || 0).toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-1">
                                      {t.pagos?.slice(0, 3).map((p, idx) => (
                                        <span
                                          key={idx}
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getMetodoColor(
                                            p.metodo
                                          )}`}
                                          title={`${p.metodo}: ${p.monto} ${p.moneda?.toUpperCase?.() || ''}`}
                                        >
                                          {getMetodoIcon(p.metodo)}
                                          <span className="ml-1">{p.metodo.replace('_', ' ').toUpperCase().slice(0, 4)}</span>
                                        </span>
                                      ))}
                                      {t.pagos?.length > 3 && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                          +{t.pagos.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {tabActiva === 'resumen' && detalleCompleto && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="h-5 w-5 text-blue-500 mr-2" />
                        Información de Caja
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Usuario Apertura</p>
                          <p className="font-bold">{caja.usuarioApertura}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Horario</p>
                          <p className="font-bold">
                            {caja.horaApertura} - {caja.horaCierre || 'Abierta'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tasa BCV</p>
                          <p className="font-bold text-blue-600">{caja.tasaBcv || 'No registrada'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tasa Paralelo</p>
                          <p className="font-bold text-purple-600">{caja.tasaParalelo || 'No registrada'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                        Montos de Caja
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Inicial Bs</p>
                          <p className="font-bold text-blue-600">{formatearBs(caja.montoInicialBs)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Final Bs</p>
                          <p className="font-bold text-green-600">{formatearBs(caja.montoFinalBs)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Inicial USD</p>
                          <p className="font-bold text-blue-600">${Number(caja.montoInicialUsd || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Final USD</p>
                          <p className="font-bold text-green-600">${Number(caja.montoFinalUsd || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Inicial Pago Móvil</p>
                          <p className="font-bold text-blue-600">{formatearBs(caja.montoInicialPagoMovil || 0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Final Pago Móvil</p>
                          <p className="font-bold text-green-600">{formatearBs(caja.montoFinalPagoMovil || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tabActiva === 'metricas' && detalleCompleto?.metricas && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Productos Vendidos</h4>
                      <div className="space-y-3">
                        {Object.entries(detalleCompleto.metricas.productosVendidos).map(([prod, d]) => (
                          <div key={prod} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{prod}</span>
                            <div className="text-right">
                              <div className="text-sm font-bold">{d.cantidad} unids</div>
                              <div className="text-xs text-green-600">{formatearBs(d.total)} Bs</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h4>
                      <div className="space-y-3">
                        {Object.entries(detalleCompleto.metricas.metodosDepago).map(([metodo, monto]) => (
                          <div key={metodo} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium capitalize">{metodo.replace('_', ' ')}</span>
                            <span className="text-sm font-bold">{formatearBs(monto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Última actualización: {new Date().toLocaleTimeString('es-VE')}</div>
            <div className="flex space-x-3">
              <button onClick={generarPDF} className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                <Download className="h-4 w-4" />
                <span>Generar PDF</span>
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

export default DetalleCajaModal;
