// components/reportes/AuditoriaInventario.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, Check, X, AlertTriangle, Eye, Download, FileText, Plus, Minus, Camera, User } from 'lucide-react';
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
    estado: 'en_progreso' // en_progreso, completada, cancelada
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

  // Cargar productos desde el backend
  const cargarProductos = async () => {
    setLoading(true);
    try {
      console.log('Cargando productos para auditoría...', filtros);
      
      const response = await api.get('/auditoria/productos', { 
        params: { 
          ...filtros 
        } 
      });
      
      console.log('Productos cargados:', response.data);
      
      if (response.data.success) {
        const productosData = response.data.data || [];
        setProductos(productosData);
        toast.success(`${productosData.length} productos cargados`);
      } else {
        throw new Error(response.data.message || 'Error al cargar productos');
      }
      
    } catch (error) {
      console.error('Error cargando productos:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Error al cargar productos';
      toast.error(`Error: ${errorMessage}`);
      
      // Datos de ejemplo
      console.log('Usando datos de ejemplo debido al error');
      const productosEjemplo = [
        {
          id: 1,
          descripcion: 'iPhone 15 Pro Max 128GB',
          codigoBarras: '123456789012',
          categoria: 'Celulares',
          stock: 15,
          stockMinimo: 5,
          precioVenta: 450000,
          imagenThumbnail: '/api/uploads/products/thumbnails/iphone15.jpg',
          proveedor: 'Apple Store',
          ubicacionFisica: 'Vitrina A-1'
        },
        {
          id: 2,
          descripcion: 'Samsung Galaxy S24 Ultra 256GB',
          codigoBarras: '123456789013',
          categoria: 'Celulares',
          stock: 8,
          stockMinimo: 3,
          precioVenta: 380000,
          imagenThumbnail: '/api/uploads/products/thumbnails/galaxy-s24.jpg',
          proveedor: 'Samsung Venezuela',
          ubicacionFisica: 'Vitrina B-2'
        },
        {
          id: 3,
          descripcion: 'Funda Transparente Universal',
          codigoBarras: '123456789014',
          categoria: 'Accesorios',
          stock: 0,
          stockMinimo: 10,
          precioVenta: 15000,
          imagenThumbnail: '/api/uploads/products/thumbnails/funda.jpg',
          proveedor: 'Accesorios Miami',
          ubicacionFisica: 'Estante C-3'
        },
        {
          id: 4,
          descripcion: 'Reparación Pantalla iPhone',
          codigoBarras: 'SERV-001',
          categoria: 'Servicios',
          stock: 1, // Los servicios siempre en stock
          stockMinimo: 1,
          precioVenta: 120000,
          imagenThumbnail: '/api/uploads/products/thumbnails/servicio.jpg',
          proveedor: 'Técnico Local',
          ubicacionFisica: 'Taller'
        }
      ];
      setProductos(productosEjemplo);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio en cantidad auditada
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

  // Marcar/desmarcar producto como verificado
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

  // Calcular diferencia
  const calcularDiferencia = (producto) => {
    const auditado = auditoria.productosAuditados[producto.id];
    if (!auditado?.verificado) return 0;
    
    return (auditado.cantidadFisica || 0) - producto.stock;
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const matchBusqueda = !filtros.busqueda || 
      producto.descripcion.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      producto.codigoBarras.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    const matchCategoria = !filtros.categoria || producto.categoria === filtros.categoria;
    const matchProveedor = !filtros.proveedor || producto.proveedor === filtros.proveedor;
    const matchStock = !filtros.soloConStock || producto.stock > 0;
    
    return matchBusqueda && matchCategoria && matchProveedor && matchStock;
  });

  // Calcular resumen
  useEffect(() => {
    const totalProductos = productosFiltrados.length;
    const auditados = Object.keys(auditoria.productosAuditados).filter(
      id => auditoria.productosAuditados[id]?.verificado
    ).length;
    
    let diferencias = 0;
    let faltantes = 0;
    let sobrantes = 0;
    
    productosFiltrados.forEach(producto => {
      const diferencia = calcularDiferencia(producto);
      if (diferencia !== 0) {
        diferencias++;
        if (diferencia < 0) faltantes += Math.abs(diferencia);
        if (diferencia > 0) sobrantes += diferencia;
      }
    });
    
    setResumen({
      totalProductos,
      auditados,
      diferencias,
      faltantes,
      sobrantes
    });
  }, [productosFiltrados, auditoria.productosAuditados]);

  // Generar PDF de auditoría
  const generarReportePDF = () => {
    if (resumen.auditados === 0) {
      toast.error('Debe auditar al menos un producto');
      return;
    }
    
    if (!auditoria.auditor.trim()) {
      toast.error('Debe especificar quién realiza la auditoría');
      return;
    }
    
    toast.success('Generando reporte de auditoría...');
    // TODO: Implementar generación de PDF
  };

  // Aplicar ajustes al inventario
  const aplicarAjustes = () => {
    if (resumen.diferencias === 0) {
      toast.info('No hay diferencias para aplicar');
      return;
    }
    
    toast.info('Función de aplicar ajustes próximamente');
    // TODO: Implementar aplicación de ajustes
  };

  // Formatear moneda
  const formatearBs = (amount) => {
    return Math.round(amount || 0).toLocaleString('es-VE');
  };

  // Obtener color de diferencia
  const getColorDiferencia = (diferencia) => {
    if (diferencia === 0) return 'text-green-600';
    if (diferencia > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  // Obtener icono de diferencia
  const getIconoDiferencia = (diferencia) => {
    if (diferencia === 0) return <Check className="h-4 w-4" />;
    if (diferencia > 0) return <Plus className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  useEffect(() => {
    cargarProductos();
  }, [filtros.categoria, filtros.proveedor, filtros.soloConStock]);

  return (
    <div className="space-y-6">
      {/* Header con información del auditor */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 text-purple-500 mr-2" />
            Auditoría Digital de Inventario
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Estado:</span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              En progreso
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auditor responsable *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre del auditor"
                value={auditoria.auditor}
                onChange={(e) => setAuditoria(prev => ({ ...prev, auditor: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de auditoría
            </label>
            <input
              type="date"
              value={auditoria.fechaInicio}
              onChange={(e) => setAuditoria(prev => ({ ...prev, fechaInicio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones generales
            </label>
            <input
              type="text"
              placeholder="Observaciones de la auditoría"
              value={auditoria.observaciones}
              onChange={(e) => setAuditoria(prev => ({ ...prev, observaciones: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Filtros de productos</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto o código..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <select
            value={filtros.categoria}
            onChange={(e) => setFiltros(prev => ({ ...prev, categoria: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Todas las categorías</option>
            <option value="Celulares">Celulares</option>
            <option value="Accesorios">Accesorios</option>
            <option value="Servicios">Servicios</option>
          </select>

          <select
            value={filtros.proveedor}
            onChange={(e) => setFiltros(prev => ({ ...prev, proveedor: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Todos los proveedores</option>
            <option value="Apple Store">Apple Store</option>
            <option value="Samsung Venezuela">Samsung Venezuela</option>
            <option value="Accesorios Miami">Accesorios Miami</option>
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filtros.soloConStock}
              onChange={(e) => setFiltros(prev => ({ ...prev, soloConStock: e.target.checked }))}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Solo con stock</span>
          </label>
        </div>
      </div>

      {/* Resumen de auditoría */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Productos</p>
              <p className="text-2xl font-bold">{resumen.totalProductos}</p>
            </div>
            <Package className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Auditados</p>
              <p className="text-2xl font-bold">{resumen.auditados}</p>
              <p className="text-green-100 text-xs">
                {resumen.totalProductos > 0 ? Math.round((resumen.auditados / resumen.totalProductos) * 100) : 0}% completado
              </p>
            </div>
            <Check className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Diferencias</p>
              <p className="text-2xl font-bold">{resumen.diferencias}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Faltantes</p>
              <p className="text-2xl font-bold">{resumen.faltantes}</p>
            </div>
            <Minus className="h-8 w-8 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Sobrantes</p>
              <p className="text-2xl font-bold">{resumen.sobrantes}</p>
            </div>
            <Plus className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900">
            Productos para auditoría ({productosFiltrados.length} items)
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={() => toast.info('Función de escanear código próximamente')}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Camera className="h-4 w-4" />
              <span>Escanear</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Cargando productos...</span>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No se encontraron productos con los filtros aplicados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verificado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Sistema
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Físico
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosFiltrados.map((producto) => {
                  const auditado = auditoria.productosAuditados[producto.id];
                  const diferencia = calcularDiferencia(producto);
                  const isVerificado = auditado?.verificado || false;
                  
                  return (
                    <tr 
                      key={producto.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        isVerificado ? 'bg-green-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleVerificado(producto)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            isVerificado
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {isVerificado && <Check className="h-4 w-4" />}
                        </button>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            {producto.imagenThumbnail ? (
                              <img
                                className="h-12 w-12 rounded-lg object-cover border"
                                src={producto.imagenThumbnail}
                                alt={producto.descripcion}
                                onError={(e) => {
                                  e.target.src = '/api/placeholder-product.png';
                                }}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center border">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{producto.descripcion}</div>
                            <div className="text-sm text-gray-500">{producto.codigoBarras}</div>
                            <div className="text-xs text-gray-400">{producto.categoria}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.ubicacionFisica || 'No especificada'}
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                          producto.stock === 0 ? 'bg-red-100 text-red-800' :
                          producto.stock <= producto.stockMinimo ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {producto.stock}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {isVerificado ? (
                          <input
                            type="number"
                            min="0"
                            value={auditado.cantidadFisica || ''}
                            onChange={(e) => handleCantidadChange(producto.id, e.target.value)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {isVerificado ? (
                          <div className={`flex items-center justify-center space-x-1 ${getColorDiferencia(diferencia)}`}>
                            {getIconoDiferencia(diferencia)}
                            <span className="font-semibold">
                              {diferencia !== 0 ? Math.abs(diferencia) : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-mono">
                        {formatearBs(producto.precioVenta)} Bs
                        {isVerificado && diferencia !== 0 && (
                          <div className={`text-xs ${getColorDiferencia(diferencia)}`}>
                            {diferencia > 0 ? '+' : ''}{formatearBs(diferencia * producto.precioVenta)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Acciones finales */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Finalizar auditoría</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">Progreso</p>
            <p className="text-2xl font-bold text-green-800">
              {resumen.totalProductos > 0 ? Math.round((resumen.auditados / resumen.totalProductos) * 100) : 0}%
            </p>
            <p className="text-xs text-green-600">{resumen.auditados} de {resumen.totalProductos} productos</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-700">Valor en diferencias</p>
            <p className="text-2xl font-bold text-yellow-800">
              {formatearBs(
                productosFiltrados.reduce((sum, producto) => {
                  const diff = calcularDiferencia(producto);
                  return sum + Math.abs(diff * producto.precioVenta);
                }, 0)
              )} Bs
            </p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">Items con diferencia</p>
            <p className="text-2xl font-bold text-purple-800">{resumen.diferencias}</p>
            <p className="text-xs text-purple-600">{resumen.faltantes} falt. • {resumen.sobrantes} sobr.</p>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={() => {
              setAuditoria({
                auditor: '',
                fechaInicio: new Date().toISOString().split('T')[0],
                observaciones: '',
                productosAuditados: {},
                estado: 'en_progreso'
              });
              toast.info('Auditoría reiniciada');
            }}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Limpiar auditoría</span>
          </button>
          
          <button
            onClick={aplicarAjustes}
            disabled={resumen.diferencias === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Aplicar ajustes</span>
          </button>
          
          <button
            onClick={generarReportePDF}
            disabled={resumen.auditados === 0 || !auditoria.auditor.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>Generar reporte PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaInventario;