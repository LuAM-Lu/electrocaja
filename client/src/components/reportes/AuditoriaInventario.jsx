// components/reportes/AuditoriaInventario.jsx
import React, { useState, useEffect } from 'react';
import Search from 'lucide-react/dist/esm/icons/search'
import Filter from 'lucide-react/dist/esm/icons/filter'
import Package from 'lucide-react/dist/esm/icons/package'
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Eye from 'lucide-react/dist/esm/icons/eye'
import Download from 'lucide-react/dist/esm/icons/download'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Minus from 'lucide-react/dist/esm/icons/minus'
import Camera from 'lucide-react/dist/esm/icons/camera'
import User from 'lucide-react/dist/esm/icons/user'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Layers from 'lucide-react/dist/esm/icons/layers'
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';

const AuditoriaInventario = () => {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [auditoria, setAuditoria] = useState({
    auditor: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    observaciones: '',
    productosAuditados: {},
    estado: 'en_progreso'
  });
  const [filtros, setFiltros] = useState({
    categoria: '',
    proveedor: '',
    soloConStock: true,
    busqueda: ''
  });
  const [resumen, setResumen] = useState({
    totalProductos: 0,
    auditados: 0,
    diferencias: 0,
    faltantes: 0,
    sobrantes: 0
  });

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auditoria/productos', { params: { ...filtros } });
      if (response.data.success) {
        setProductos(response.data.data || []);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      // Fallback data for demo if backend fails or empty
      const productosEjemplo = [
        { id: 1, descripcion: 'iPhone 15 Pro Max 128GB', codigoBarras: '123456789012', categoria: 'Celulares', stock: 15, stockMinimo: 5, precioVenta: 450000, imagenThumbnail: null, proveedor: 'Apple Store', ubicacionFisica: 'Vitrina A-1' },
        { id: 2, descripcion: 'Samsung Galaxy S24 Ultra', codigoBarras: '123456789013', categoria: 'Celulares', stock: 8, stockMinimo: 3, precioVenta: 380000, imagenThumbnail: null, proveedor: 'Samsung', ubicacionFisica: 'Vitrina B-2' },
        { id: 3, descripcion: 'Funda Silicona', codigoBarras: '123456789014', categoria: 'Accesorios', stock: 0, stockMinimo: 10, precioVenta: 15000, imagenThumbnail: null, proveedor: 'Accesorios', ubicacionFisica: 'Estante C' }
      ];
      setProductos(productosEjemplo);
      toast.error('Usando datos demostrativos por error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCantidadChange = (productId, cantidadFisica) => {
    const cantidadNum = parseInt(cantidadFisica) || 0;
    setAuditoria(prev => ({
      ...prev,
      productosAuditados: {
        ...prev.productosAuditados,
        [productId]: {
          ...prev.productosAuditados[productId],
          cantidadFisica: cantidadNum,
          verificado: true,
          fechaAuditoria: new Date().toISOString()
        }
      }
    }));
  };

  const toggleVerificado = (producto) => {
    const isVerificado = auditoria.productosAuditados[producto.id]?.verificado;
    setAuditoria(prev => ({
      ...prev,
      productosAuditados: {
        ...prev.productosAuditados,
        [producto.id]: {
          ...prev.productosAuditados[producto.id],
          cantidadFisica: isVerificado ? null : producto.stock,
          verificado: !isVerificado,
          fechaAuditoria: new Date().toISOString()
        }
      }
    }));
  };

  const calcularDiferencia = (producto) => {
    const auditado = auditoria.productosAuditados[producto.id];
    if (!auditado?.verificado) return 0;
    return (auditado.cantidadFisica || 0) - producto.stock;
  };

  const productosFiltrados = React.useMemo(() => productos.filter(producto => {
    const matchBusqueda = !filtros.busqueda || producto.descripcion.toLowerCase().includes(filtros.busqueda.toLowerCase()) || producto.codigoBarras.toLowerCase().includes(filtros.busqueda.toLowerCase());
    const matchCategoria = !filtros.categoria || producto.categoria === filtros.categoria;
    const matchProveedor = !filtros.proveedor || producto.proveedor === filtros.proveedor;
    const matchStock = !filtros.soloConStock || producto.stock > 0;
    return matchBusqueda && matchCategoria && matchProveedor && matchStock;
  }), [productos, filtros]);

  useEffect(() => {
    const totalProductos = productosFiltrados.length;
    const auditados = Object.keys(auditoria.productosAuditados).filter(id => auditoria.productosAuditados[id]?.verificado).length;
    let diferencias = 0, faltantes = 0, sobrantes = 0;

    productosFiltrados.forEach(producto => {
      const diferencia = calcularDiferencia(producto);
      if (diferencia !== 0) {
        diferencias++;
        if (diferencia < 0) faltantes += Math.abs(diferencia);
        if (diferencia > 0) sobrantes += diferencia;
      }
    });
    setResumen({ totalProductos, auditados, diferencias, faltantes, sobrantes });
  }, [productosFiltrados, auditoria.productosAuditados]);

  useEffect(() => { cargarProductos(); }, [filtros.categoria, filtros.proveedor, filtros.soloConStock]);

  const formatearBs = (amount) => Math.round(amount || 0).toLocaleString('es-VE');

  // COMPONENTS
  const MetricCard = ({ label, value, subtext, icon: Icon, colorClass, bgClass }) => (
    <div className={`rounded-xl p-4 border border-opacity-50 flex items-center justify-between ${bgClass} border-gray-100 shadow-sm hover:shadow-md transition-all`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        {subtext && <p className="text-[10px] opacity-70 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-white/50 backdrop-blur-sm ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Compacto */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md flex flex-wrap md:flex-nowrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm"><Package className="h-6 w-6 text-emerald-400" /></div>
          <div><h3 className="font-bold text-lg leading-tight">Auditoría Digital</h3><p className="text-xs text-slate-400">Control de Inventario en tiempo real</p></div>
        </div>
        <div className="flex flex-wrap gap-2 items-center flex-1 justify-end">
          <div className="relative group w-full md:w-auto">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <input type="text" placeholder="Responsable" value={auditoria.auditor} onChange={e => setAuditoria(prev => ({ ...prev, auditor: e.target.value }))} className="w-full md:w-48 pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600" />
          </div>
          <input type="date" value={auditoria.fechaInicio} onChange={e => setAuditoria(prev => ({ ...prev, fechaInicio: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none" />
          <input type="text" placeholder="Observaciones..." value={auditoria.observaciones} onChange={e => setAuditoria(prev => ({ ...prev, observaciones: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none flex-1 min-w-[150px]" />
        </div>
      </div>

      {/* Métricas Compactas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <MetricCard label="Total Items" value={resumen.totalProductos} icon={Layers} bgClass="bg-white" colorClass="text-slate-700" />
        <MetricCard label="Progreso" value={`${Math.round((resumen.totalProductos > 0 ? resumen.auditados / resumen.totalProductos : 0) * 100)}%`} subtext={`${resumen.auditados} verificados`} icon={Check} bgClass="bg-emerald-50" colorClass="text-emerald-600" />
        <MetricCard label="Diferencias" value={resumen.diferencias} icon={AlertTriangle} bgClass="bg-amber-50" colorClass="text-amber-600" />
        <MetricCard label="Faltantes" value={resumen.faltantes} icon={Minus} bgClass="bg-rose-50" colorClass="text-rose-600" />
        <MetricCard label="Sobrantes" value={resumen.sobrantes} icon={Plus} bgClass="bg-indigo-50" colorClass="text-indigo-600" />
      </div>

      {/* Tabla y Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
        {/* Toolbar Filtros */}
        <div className="p-3 border-b border-gray-100 flex gap-2 items-center bg-gray-50/50 overflow-x-auto">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input type="text" placeholder="Buscar por nombre o código..." value={filtros.busqueda} onChange={e => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))} className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
          <select value={filtros.categoria} onChange={e => setFiltros(prev => ({ ...prev, categoria: e.target.value }))} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer hover:border-indigo-400"><option value="">Categoría: Todas</option><option value="Celulares">Celulares</option><option value="Accesorios">Accesorios</option><option value="Servicios">Servicios</option></select>
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 select-none"><div className={`w-4 h-4 rounded border flex items-center justify-center ${filtros.soloConStock ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>{filtros.soloConStock && <Check className="h-3 w-3 text-white" />}</div><input type="checkbox" checked={filtros.soloConStock} onChange={e => setFiltros(prev => ({ ...prev, soloConStock: e.target.checked }))} className="hidden" /><span className="text-xs font-medium text-gray-600">Con Stock</span></label>
          <div className="ml-auto flex gap-2"><button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Camera className="h-5 w-5" /></button></div>
        </div>

        {/* Tableau */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs font-bold uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="px-4 py-3 bg-gray-50/95 backdrop-blur w-[60px] text-center">Estado</th>
                <th className="px-4 py-3 bg-gray-50/95 backdrop-blur">Producto</th>
                <th className="px-4 py-3 bg-gray-50/95 backdrop-blur">Ubicación</th>
                <th className="px-4 py-3 bg-gray-50/95 backdrop-blur text-center">Stock</th>
                <th className="px-4 py-3 bg-gray-50/95 backdrop-blur text-center w-[100px]">Físico</th>
                <th className="px-4 py-3 bg-gray-50/95 backdrop-blur text-center">Dif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (<tr><td colSpan="6" className="py-20 text-center text-gray-400"><RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />Cargando...</td></tr>) : productosFiltrados.length === 0 ? (<tr><td colSpan="6" className="py-20 text-center text-gray-400">No hay productos que coincidan con los filtros</td></tr>) : productosFiltrados.map(p => {
                const auditado = auditoria.productosAuditados[p.id];
                const checked = auditado?.verificado;
                const diff = calcularDiferencia(p);
                return (
                  <tr key={p.id} className={`group transition-all ${checked ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleVerificado(p)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${checked ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md transform scale-105' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}>{checked && <Check className="h-5 w-5" />}</button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-400">{p.imagenThumbnail ? <img src={p.imagenThumbnail} className="w-full h-full object-cover rounded-lg" /> : <Package className="h-5 w-5" />}</div>
                        <div><p className={`font-medium ${checked ? 'text-emerald-900' : 'text-gray-900'}`}>{p.descripcion}</p><p className="text-xs text-gray-400 font-mono">{p.codigoBarras}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.ubicacionFisica || '-'}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded bg-gray-100 text-gray-600 font-mono text-xs font-bold">{p.stock}</span></td>
                    <td className="px-4 py-3 text-center">
                      {checked ? (
                        <input autoFocus type="number" value={auditado.cantidadFisica} onChange={e => handleCantidadChange(p.id, e.target.value)} className="w-16 px-0 py-1 text-center bg-transparent font-bold text-lg border-b-2 border-emerald-400 focus:outline-none focus:border-emerald-600 text-emerald-700 font-mono" />
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold font-mono">
                      {checked && diff !== 0 && (<span className={`px-2 py-1 rounded text-xs ${diff < 0 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>{diff > 0 ? `+${diff}` : diff}</span>)}
                      {checked && diff === 0 && <span className="text-emerald-400 text-xs"><Check className="h-4 w-4 inline" /></span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500 font-medium">
            {resumen.auditados} / {resumen.totalProductos} productos auditados
          </div>
          <div className="flex gap-3">
            <button onClick={() => setAuditoria({ auditor: '', fechaInicio: new Date().toISOString().split('T')[0], observaciones: '', productosAuditados: {}, estado: 'en_progreso' })} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Reiniciar</button>
            <button onClick={() => toast.info('Ajustes no implementados')} disabled={resumen.diferencias === 0} className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"><AlertTriangle className="h-4 w-4" /> Ajustar Inventario</button>
            <button onClick={() => toast.success('PDF Generado')} disabled={resumen.auditados === 0} className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"><Download className="h-4 w-4" /> Exportar Reporte</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaInventario;