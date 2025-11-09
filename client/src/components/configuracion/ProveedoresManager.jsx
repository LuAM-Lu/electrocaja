// client/src/components/configuracion/ProveedoresManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building, Plus, Search, Edit2, Trash2, Eye, Package, 
  Phone, Mail, MapPin, User, Filter, ExternalLink, X
} from 'lucide-react';
import toast from '../../utils/toast.jsx';
import { api } from '../../config/api';

// Helper function para requests API
const apiRequest = async (endpoint, options = {}) => {
  try {
    if (options.method === 'POST') {
      return await api.post(endpoint, options.body);
    } else if (options.method === 'PUT') {
      return await api.put(endpoint, options.body);
    } else if (options.method === 'DELETE') {
      return await api.delete(endpoint);
    } else {
      return await api.get(endpoint);
    }
  } catch (error) {
    throw error.response?.data || error;
  }
};

const ProveedoresManager = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showProductosModal, setShowProductosModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [productosProveedor, setProductosProveedor] = useState([]);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    rif: ''
  });

  // Cargar proveedores
  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filtroActivo !== 'todos') {
        params.append('activo', filtroActivo === 'activos' ? 'true' : 'false');
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await apiRequest(`/proveedores?${params.toString()}`);
      console.log(' DEBUG - Respuesta proveedores:', response);
      setProveedores(response.data?.data?.proveedores || response.data?.proveedores || response.proveedores || []);
      } catch (error) {
      console.error('Error cargando proveedores:', error);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, [filtroActivo]);

  // Buscar con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        cargarProveedores();
      } else if (searchTerm === '') {
        cargarProveedores();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Abrir modal para crear
  const handleNuevoProveedor = () => {
    setEditingProveedor(null);
    setFormData({
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      rif: ''
    });
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEditarProveedor = (proveedor) => {
    setEditingProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      contacto: proveedor.contacto || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      rif: proveedor.rif || ''
    });
    setShowModal(true);
  };

  // Ver productos del proveedor
  const handleVerProductos = async (proveedor) => {
    try {
      setSelectedProveedor(proveedor);
      setLoading(true);
      const response = await apiRequest(`/proveedores/${proveedor.id}/productos`);
      setProductosProveedor(response.productos || []);
      setShowProductosModal(true);
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error('Error al cargar productos del proveedor');
    } finally {
      setLoading(false);
    }
  };

  // Guardar proveedor
  const handleGuardarProveedor = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre) {
      toast.error('El nombre del proveedor es requerido');
      return;
    }

    try {
      setLoading(true);
      
      if (editingProveedor) {
        // Actualizar
        await apiRequest(`/proveedores/${editingProveedor.id}`, {
          method: 'PUT',
          body: formData
        });
        toast.success('Proveedor actualizado exitosamente');
      } else {
        // Crear
        await apiRequest('/proveedores', {
          method: 'POST',
          body: formData
        });
        toast.success('Proveedor creado exitosamente');
      }

      setShowModal(false);
      cargarProveedores();
    } catch (error) {
      console.error('Error guardando proveedor:', error);
      toast.error(error.message || 'Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado activo
  const handleToggleActivo = async (proveedor) => {
    try {
      await apiRequest(`/proveedores/${proveedor.id}`, {
        method: 'PUT',
        body: { activo: !proveedor.activo }
      });
      
      toast.success(`Proveedor ${!proveedor.activo ? 'activado' : 'desactivado'}`);
      cargarProveedores();
    } catch (error) {
      toast.error('Error al cambiar estado del proveedor');
    }
  };

  // Eliminar proveedor
  const handleEliminarProveedor = async (proveedor) => {
    const tieneProductos = proveedor._count?.productos > 0;
    
    if (tieneProductos) {
      if (!confirm(`${proveedor.nombre} tiene ${proveedor._count.productos} productos asociados. ¿Estás seguro de desactivarlo?`)) {
        return;
      }
    } else {
      if (!confirm(`¿Estás seguro de desactivar a ${proveedor.nombre}?`)) {
        return;
      }
    }

    try {
      await apiRequest(`/proveedores/${proveedor.id}`, {
        method: 'DELETE'
      });
      
      toast.success('Proveedor desactivado exitosamente');
      cargarProveedores();
    } catch (error) {
      toast.error('Error al desactivar proveedor');
    }
  };

  const proveedoresFiltrados = proveedores.filter(proveedor => {
    if (filtroActivo === 'activos' && !proveedor.activo) return false;
    if (filtroActivo === 'inactivos' && proveedor.activo) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Proveedores</h3>
          <p className="text-sm text-gray-600">
            {proveedoresFiltrados.length} proveedor{proveedoresFiltrados.length !== 1 ? 'es' : ''} encontrado{proveedoresFiltrados.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={handleNuevoProveedor}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por nombre, contacto, RIF o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        {/* Filtro estado */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla de proveedores */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Cargando proveedores...</span>
          </div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay proveedores</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron proveedores con ese criterio' : 'Comienza agregando tu primer proveedor'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RIF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proveedoresFiltrados.map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Building className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{proveedor.nombre}</div>
                          {proveedor.contacto && (
                            <div className="text-sm text-gray-500"> {proveedor.contacto}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {proveedor.telefono && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {proveedor.telefono}
                          </div>
                        )}
                        {proveedor.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {proveedor.email}
                          </div>
                        )}
                        {proveedor.direccion && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-[200px]">{proveedor.direccion}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {proveedor.rif || (
                          <span className="text-gray-400 italic">Sin RIF</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <Package className="h-3 w-3 mr-1" />
                          {proveedor._count?.productos || 0}
                        </span>
                        {(proveedor._count?.productos || 0) > 0 && (
                          <button
                            onClick={() => handleVerProductos(proveedor)}
                            className="text-indigo-600 hover:text-indigo-700 p-1 hover:bg-indigo-50 rounded"
                            title="Ver productos"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        proveedor.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {proveedor.activo ? ' Activo' : ' Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditarProveedor(proveedor)}
                          className="text-indigo-600 hover:text-indigo-700 p-1 hover:bg-indigo-50 rounded"
                          title="Editar proveedor"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(proveedor)}
                          className={`p-1 rounded ${
                            proveedor.activo 
                              ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }`}
                          title={proveedor.activo ? 'Desactivar' : 'Activar'}
                        >
                          {proveedor.activo ? '' : ''}
                        </button>
                        <button
                          onClick={() => handleEliminarProveedor(proveedor)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title="Eliminar proveedor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleGuardarProveedor}>
              
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between text-white">
                  <h3 className="text-lg font-bold">
                    {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-4">
                
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Proveedor *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Distribuidora Electrónica C.A."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* RIF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RIF
                  </label>
                  <input
                    type="text"
                    value={formData.rif}
                    onChange={(e) => setFormData(prev => ({ ...prev, rif: e.target.value }))}
                    placeholder="J-12345678-9"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Contacto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={formData.contacto}
                    onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                    placeholder="Carlos Rodríguez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="0212-1234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="ventas@proveedor.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Dirección completa del proveedor..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Botones */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (editingProveedor ? 'Actualizar' : 'Crear')}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de productos del proveedor */}
      {showProductosModal && selectedProveedor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h3 className="text-lg font-bold">Productos de {selectedProveedor.nombre}</h3>
                  <p className="text-sm text-green-100">{productosProveedor.length} productos encontrados</p>
                </div>
                <button
                  onClick={() => setShowProductosModal(false)}
                  className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {productosProveedor.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Sin productos</h3>
                  <p className="mt-1 text-sm text-gray-500">Este proveedor no tiene productos asociados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productosProveedor.map((producto) => (
                        <tr key={producto.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{producto.descripcion}</div>
                            <div className="text-sm text-gray-500 capitalize">{producto.tipo?.toLowerCase()}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{producto.codigoInterno}</div>
                            {producto.codigoBarras && (
                              <div className="text-xs text-gray-500">{producto.codigoBarras}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              ${parseFloat(producto.precioVenta || 0).toFixed(2)}
                            </div>
                            {producto.precioCosto && (
                              <div className="text-xs text-gray-500">
                                Costo: ${parseFloat(producto.precioCosto).toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              producto.stock === 0 ? 'bg-red-100 text-red-800' :
                              producto.stock <= producto.stockMinimo ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {producto.stock}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              producto.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {producto.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProveedoresManager;