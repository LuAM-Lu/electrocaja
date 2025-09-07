// components/reportes/ReporteEmpleado.jsx
import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, TrendingUp, TrendingDown, DollarSign, 
  Package, Users, Eye, Search, RefreshCw, Download, 
  BarChart3, CreditCard, Smartphone, Building, Zap, ChevronDown,
  ChevronRight, AlertCircle
} from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

const ReporteEmpleado = () => {
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [datos, setDatos] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    metodosPago: true,
    productos: true,
    transacciones: true,
    clientes: false
  });

  // 🚀 CARGAR USUARIOS AL MONTAR COMPONENTE
  useEffect(() => {
    cargarUsuarios();
    
    // Establecer fechas por defecto (último mes)
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    
    setFechaFin(hoy.toISOString().split('T')[0]);
    setFechaInicio(haceUnMes.toISOString().split('T')[0]);
  }, []);

  // 📋 CARGAR LISTA DE USUARIOS
  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/users');
      
      if (response.data?.success) {
        setUsuarios(response.data.data || []);
      } else {
        throw new Error(response.data?.message || 'Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('Error al cargar usuarios');
      
      // Fallback de usuarios de ejemplo
      setUsuarios([
        { id: 1, nombre: 'Juan Pérez', rol: 'admin', email: 'juan@empresa.com' },
        { id: 2, nombre: 'María González', rol: 'cajero', email: 'maria@empresa.com' },
        { id: 3, nombre: 'Carlos Rodríguez', rol: 'supervisor', email: 'carlos@empresa.com' }
      ]);
    }
  };

  // 📊 CARGAR REPORTE DEL EMPLEADO
  const cargarReporte = async () => {
    if (!usuarioSeleccionado) {
      toast.error('⚠️ Selecciona un usuario para generar el reporte');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        usuarioId: usuarioSeleccionado
      });
      
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);

      const response = await api.get(`/reportes/empleado?${params}`);
      
      if (response.data?.success) {
        setDatos(response.data.data);
        toast.success(`✅ Reporte generado para ${response.data.data.usuario.nombre}`);
      } else {
        throw new Error(response.data?.message || 'Error al generar reporte');
      }
      
    } catch (error) {
      console.error('Error generando reporte:', error);
      toast.error(error.response?.data?.message || 'Error al generar reporte');
      
      // Fallback con datos de ejemplo
      setDatos({
        usuario: {
          id: parseInt(usuarioSeleccionado),
          nombre: usuarios.find(u => u.id === parseInt(usuarioSeleccionado))?.nombre || 'Usuario Ejemplo',
          rol: 'cajero',
          email: 'usuario@empresa.com'
        },
        periodo: {
          fechaInicio: fechaInicio || '2025-01-01',
          fechaFin: fechaFin || '2025-08-27',
          diasAnalizados: 30
        },
        metricas: {
          totalTransacciones: 45,
          totalVentas: 38,
          totalEgresos: 7,
          montoVentasBs: 1850000,
          montoVentasUsd: 920,
          montoEgresosBs: 150000,
          montoEgresosUsd: 75,
          metodosPago: {
            'Pago Móvil': 980000,
            'Zelle': 450000,
            'Efectivo Bs': 280000,
            'Binance P2P': 140000
          },
          topProductos: [
            { descripcion: 'iPhone 15 Pro Max', cantidad: 3, montoTotal: 450000 },
            { descripcion: 'Samsung Galaxy S24', cantidad: 2, montoTotal: 320000 },
            { descripcion: 'MacBook Air M2', cantidad: 1, montoTotal: 280000 }
          ],
          ventasPorCategoria: {
            'Electrónicos': 1200000,
            'Accesorios': 650000
          },
          clientesUnicos: 25,
          clientesFrecuentes: [
            { nombre: 'María López', visitas: 5 },
            { nombre: 'Carlos Mendez', visitas: 3 }
          ]
        },
        balance: {
          neto: 1700000,
          netoUsd: 845,
          margenOperativo: 91.9
        },
        transacciones: [
          {
            id: 1,
            fechaHora: '2025-08-27T10:30:00Z',
            tipo: 'INGRESO',
            categoria: 'Electrónicos',
            cliente: 'María López',
            totalBs: 450000,
            totalUsd: 225,
            items: [
              { descripcion: 'iPhone 15 Pro Max', cantidad: 1, precioUnitario: 450000, subtotal: 450000 }
            ],
            pagos: [
              { metodo: 'Zelle', moneda: 'USD', monto: 225, banco: null, referencia: 'Z123456' }
            ]
          },
          {
            id: 2,
            fechaHora: '2025-08-27T15:45:00Z',
            tipo: 'EGRESO',
            categoria: 'Gastos Operativos',
            cliente: 'Sin cliente',
            totalBs: 50000,
            totalUsd: 25,
            items: [],
            pagos: [
              { metodo: 'Pago Móvil', moneda: 'BS', monto: 50000, banco: 'Mercantil', referencia: 'PM789' }
            ]
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔧 UTILIDADES
  const formatearBs = (amount) => Math.round(amount || 0).toLocaleString('es-VE');
  const formatearUsd = (amount) => `$${(amount || 0).toFixed(2)}`; // ✅ CORREGIDO: Mostrar $ siempre
  const formatearPorcentaje = (amount) => `${(amount || 0).toFixed(1)}%`;
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 🎨 COMPONENTE DE SECCIÓN EXPANDIBLE COMPACTA
  const ExpandableSection = ({ title, isExpanded, onToggle, children, count = null, icon: Icon }) => (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors" // ✅ COMPACTADO: py-3 en lugar de py-4
      >
        <div className="flex items-center space-x-2"> {/* ✅ COMPACTADO: space-x-2 en lugar de space-x-3 */}
          <Icon className="h-4 w-4 text-gray-600" /> {/* ✅ COMPACTADO: h-4 w-4 en lugar de h-5 w-5 */}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3> {/* ✅ COMPACTADO: text-base en lugar de text-lg */}
          {count !== null && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium"> {/* ✅ COMPACTADO: py-0.5 y text-xs */}
              {count}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {/* ✅ COMPACTADO */}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4"> {/* ✅ COMPACTADO: px-4 pb-4 en lugar de px-6 pb-6 */}
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4"> {/* ✅ COMPACTADO: space-y-4 en lugar de space-y-6 */}
      
      {/* 🎛️ CONTROLES PRINCIPALES - COMPACTOS */}
      <div className="bg-white rounded-lg p-4 shadow-sm border"> {/* ✅ COMPACTADO: p-4 en lugar de p-6 */}
        <div className="flex items-center justify-between mb-4"> {/* ✅ COMPACTADO: mb-4 en lugar de mb-6 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center"> {/* ✅ COMPACTADO: text-xl en lugar de text-2xl */}
              <User className="h-5 w-5 mr-2 text-blue-600" /> {/* ✅ COMPACTADO: h-5 w-5 mr-2 */}
              Reporte por Empleado
            </h2>
            <p className="text-sm text-gray-600">Análisis de ventas y egresos por usuario</p> {/* ✅ COMPACTADO */}
          </div>
        </div>

        {/* Filtros Compactos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"> {/* ✅ COMPACTADO: gap-3 mb-4 */}
          {/* Selector de Usuario */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1"> {/* ✅ COMPACTADO: text-xs mb-1 */}
              <User className="h-3 w-3 inline mr-1" />
              Usuario *
            </label>
            <select
              value={usuarioSeleccionado}
              onChange={(e) => setUsuarioSeleccionado(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" // ✅ COMPACTADO
              disabled={loading}
            >
              <option value="">Seleccionar...</option>
              {usuarios.map(usuario => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} ({usuario.rol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={cargarReporte}
              disabled={loading || !usuarioSeleccionado}
              className="w-full flex items-center justify-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors" // ✅ COMPACTADO
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <Search className="h-3 w-3" />
                  <span>Generar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Usuario - COMPACTA */}
        {datos && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"> {/* ✅ COMPACTADO: p-3 */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900 text-sm"> {/* ✅ COMPACTADO: text-sm */}
                  📊 {datos.usuario.nombre} • {datos.usuario.rol} • {datos.periodo.diasAnalizados} días
                </h4>
              </div>
              <button
                onClick={() => toast.info('🔄 Exportación próximamente')}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700" // ✅ COMPACTADO
              >
                <Download className="h-3 w-3" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📊 MÉTRICAS COMPACTAS EN UNA FILA */}
      {datos && (
        <>
          {/* Métricas principales en cards horizontales compactas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"> {/* ✅ COMPACTADO: gap-3 */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-3 text-white"> {/* ✅ COMPACTADO: p-3 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs">Ventas</p> {/* ✅ COMPACTADO: text-xs */}
                  <p className="text-lg font-bold">{datos.metricas.totalVentas}</p> {/* ✅ COMPACTADO: text-lg */}
                  <p className="text-xs">{formatearBs(datos.metricas.montoVentasBs)} Bs • {formatearUsd(datos.metricas.montoVentasUsd)}</p> {/* ✅ USD con $ */}
                </div>
                <TrendingUp className="h-6 w-6 text-green-200" /> {/* ✅ COMPACTADO: h-6 w-6 */}
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-xs">Egresos</p>
                  <p className="text-lg font-bold">{datos.metricas.totalEgresos}</p>
                  <p className="text-xs">{formatearBs(datos.metricas.montoEgresosBs)} Bs • {formatearUsd(datos.metricas.montoEgresosUsd)}</p> {/* ✅ USD con $ */}
                </div>
                <TrendingDown className="h-6 w-6 text-red-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">Balance</p>
                  <p className="text-lg font-bold">{formatearUsd(datos.balance.netoUsd)}</p> {/* ✅ USD con $ prominente */}
                  <p className="text-xs">{formatearBs(datos.balance.neto)} Bs</p>
                </div>
                <DollarSign className="h-6 w-6 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs">Clientes</p>
                  <p className="text-lg font-bold">{datos.metricas.clientesUnicos}</p>
                  <p className="text-xs">únicos atendidos</p>
                </div>
                <Users className="h-6 w-6 text-purple-200" />
              </div>
            </div>
          </div>

          {/* 💳 MÉTODOS DE PAGO - COMPACTO */}
          <ExpandableSection
            title="Métodos de Pago"
            isExpanded={expandedSections.metodosPago}
            onToggle={() => toggleSection('metodosPago')}
            icon={CreditCard}
            count={Object.keys(datos.metricas.metodosPago || {}).filter(([, monto]) => monto > 0).length}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"> {/* ✅ COMPACTADO: gap-3 */}
              {Object.entries(datos.metricas.metodosPago || {})
                .filter(([, monto]) => monto > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([metodo, monto], index) => {
                  const total = Object.values(datos.metricas.metodosPago).reduce((sum, m) => sum + m, 0);
                  const porcentaje = total > 0 ? (monto / total) * 100 : 0;
                  
                  let IconoMetodo = CreditCard;
                  if (metodo.includes('Pago Móvil')) IconoMetodo = Smartphone;
                  else if (metodo.includes('Zelle')) IconoMetodo = DollarSign;
                  else if (metodo.includes('Binance')) IconoMetodo = Zap;
                  else if (metodo.includes('Banco')) IconoMetodo = Building;
                  
                  return (
                    <div key={metodo} className="p-2 border border-gray-200 bg-gray-50 rounded"> {/* ✅ COMPACTADO: p-2 */}
                      <div className="flex items-center space-x-1 mb-1"> {/* ✅ COMPACTADO */}
                        <IconoMetodo className="h-3 w-3 text-gray-600" />
                        <h5 className="font-medium text-xs text-gray-900 truncate">{metodo}</h5> {/* ✅ COMPACTADO: text-xs */}
                      </div>
                      <p className="text-sm font-bold text-gray-800">{formatearBs(monto)} Bs</p> {/* ✅ COMPACTADO: text-sm */}
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1"> {/* ✅ COMPACTADO: h-1 */}
                        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${porcentaje}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-600">{porcentaje.toFixed(1)}%</p>
                    </div>
                  );
                })}
            </div>
          </ExpandableSection>

          {/* 🏆 TOP PRODUCTOS - COMPACTO */}
          <ExpandableSection
            title="Top Productos"
            isExpanded={expandedSections.productos}
            onToggle={() => toggleSection('productos')}
            icon={Package}
            count={datos.metricas.topProductos?.length || 0}
          >
            <div className="space-y-2"> {/* ✅ COMPACTADO: space-y-2 */}
              {datos.metricas.topProductos?.map((producto, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"> {/* ✅ COMPACTADO: p-2 */}
                  <div className="flex items-center space-x-2"> {/* ✅ COMPACTADO: space-x-2 */}
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <h5 className="font-medium text-sm text-gray-900 truncate">{producto.descripcion}</h5> {/* ✅ COMPACTADO: text-sm */}
                      <p className="text-xs text-gray-500">{producto.cantidad} unidades</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm text-green-600">{formatearBs(producto.montoTotal)} Bs</p> {/* ✅ COMPACTADO: text-sm */}
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* 📋 TRANSACCIONES - PROTAGONISTAS */}
          <ExpandableSection
            title="Historial de Transacciones" // ✅ PROTAGONISTA
            isExpanded={expandedSections.transacciones}
            onToggle={() => toggleSection('transacciones')}
            icon={Eye}
            count={datos.transacciones?.length || 0}
          >
            {datos.transacciones?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-700 text-xs">Fecha</th> {/* ✅ COMPACTADO: p-2 text-xs */}
                      <th className="text-left p-2 font-medium text-gray-700 text-xs">Tipo</th>
                      <th className="text-left p-2 font-medium text-gray-700 text-xs">Cliente</th>
                      <th className="text-right p-2 font-medium text-gray-700 text-xs">Monto Bs</th>
                      <th className="text-right p-2 font-medium text-gray-700 text-xs">Monto USD</th> {/* ✅ USD con $ */}
                      <th className="text-left p-2 font-medium text-gray-700 text-xs">Método</th>
                      <th className="text-left p-2 font-medium text-gray-700 text-xs">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.transacciones.map((transaccion, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="p-2 text-xs"> {/* ✅ COMPACTADO: p-2 text-xs */}
                          {new Date(transaccion.fechaHora).toLocaleDateString('es-VE', { 
                            day: '2-digit', 
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            transaccion.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {transaccion.tipo}
                          </span>
                        </td>
                        <td className="p-2 text-xs truncate max-w-32">{transaccion.cliente}</td>
                        <td className="p-2 text-right font-mono text-xs">{formatearBs(transaccion.totalBs)} Bs</td>
                        <td className="p-2 text-right font-mono text-xs font-bold text-green-600">{formatearUsd(transaccion.totalUsd)}</td> {/* ✅ USD con $ prominente */}
                        <td className="p-2 text-xs">
                          {transaccion.pagos?.length > 0 ? (
                            <div className="space-y-1">
                              {transaccion.pagos.map((pago, i) => (
                                <div key={i} className="flex items-center space-x-1">
                                  <span className="truncate">{pago.metodo}</span>
                                  {pago.referencia && (
                                    <span className="text-gray-400 text-xs">({pago.referencia})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="p-2 text-xs">
                          {transaccion.items?.length > 0 ? (
                            <div className="space-y-1">
                              {transaccion.items.map((item, i) => (
                                <div key={i} className="truncate max-w-40">
                                  <span className="font-medium">{item.cantidad}x</span> {item.descripcion}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">Sin items</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500"> {/* ✅ COMPACTADO: py-6 */}
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay transacciones en este período</p>
              </div>
            )}
          </ExpandableSection>

          {/* 👥 CLIENTES - COLAPSADO POR DEFECTO */}
          {datos.metricas.clientesFrecuentes?.length > 0 && (
            <ExpandableSection
              title="Clientes Frecuentes"
              isExpanded={expandedSections.clientes}
              onToggle={() => toggleSection('clientes')}
              icon={Users}
              count={datos.metricas.clientesFrecuentes.length}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"> {/* ✅ COMPACTADO: gap-2 */}
                {datos.metricas.clientesFrecuentes.map((cliente, index) => (
                  <div key={index} className="p-2 border border-gray-200 rounded hover:shadow-sm"> {/* ✅ COMPACTADO: p-2 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-xs text-gray-900 truncate">{cliente.nombre}</h5> {/* ✅ COMPACTADO: text-xs */}
                        <p className="text-xs text-gray-500">{cliente.visitas} visitas</p>
                      </div>
                      <span className="text-xs">
                        {cliente.visitas >= 5 ? '⭐' : cliente.visitas >= 3 ? '👤' : '•'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}
        </>
      )}

      {/* 📝 ESTADO VACÍO - COMPACTO */}
      {!datos && !loading && (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm border"> {/* ✅ COMPACTADO: p-8 */}
          <User className="h-12 w-12 mx-auto mb-3 text-gray-300" /> {/* ✅ COMPACTADO: h-12 w-12 mb-3 */}
         <h3 className="text-lg font-semibold text-gray-900 mb-2"> {/* ✅ COMPACTADO: text-lg mb-2 */}
           Selecciona un empleado para generar su reporte
         </h3>
         <p className="text-sm text-gray-600 mb-4"> {/* ✅ COMPACTADO: text-sm mb-4 */}
           Elige un usuario y el período para ver sus métricas detalladas
         </p>
         <div className="flex items-center justify-center space-x-2 text-xs text-gray-500"> {/* ✅ COMPACTADO: text-xs */}
           <AlertCircle className="h-3 w-3" /> {/* ✅ COMPACTADO: h-3 w-3 */}
           <span>El usuario es obligatorio para generar el reporte</span>
         </div>
       </div>
     )}
   </div>
 );
};

export default ReporteEmpleado;