// client/src/components/configuracion/ClientesManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Edit2, Trash2, Eye, UserCheck, UserX, 
  Phone, Mail, MapPin, User, Building, Filter, X
} from 'lucide-react';
import toast from 'react-hot-toast';
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

const ClientesManager = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    cedula_rif: '',
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    tipo: 'persona'
  });

  // Cargar clientes
  const cargarClientes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filtroActivo !== 'todos') {
        params.append('activo', filtroActivo === 'activos' ? 'true' : 'false');
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await apiRequest(`/clientes?${params.toString()}`);
        console.log('🔧 DEBUG - response.data:', response.data);
        console.log('🔧 DEBUG - response.data.data:', response.data.data);
        console.log('🔧 DEBUG - Todas las propiedades de data.data:', Object.keys(response.data.data || {}));
        setClientes(response.data?.data?.data?.clientes || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, [filtroActivo]);

  // Buscar con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        cargarClientes();
      } else if (searchTerm === '') {
        cargarClientes();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Abrir modal para crear
  const handleNuevoCliente = () => {
    setEditingCliente(null);
    setFormData({
      cedula_rif: '',
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      tipo: 'persona'
    });
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEditarCliente = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      cedula_rif: cliente.cedula_rif,
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      tipo: cliente.tipo
    });
    setShowModal(true);
  };

  // Guardar cliente
  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    
    if (!formData.cedula_rif || !formData.nombre) {
      toast.error('Cédula/RIF y nombre son requeridos');
      return;
    }

    try {
      setLoading(true);
      
      if (editingCliente) {
        // Actualizar
        await apiRequest(`/clientes/${editingCliente.id}`, {
          method: 'PUT',
          body: formData
        });
        toast.success('Cliente actualizado exitosamente');
      } else {
        // Crear
        const response = await apiRequest('/clientes', {
            method: 'POST',
            body: formData
          });
          toast.success(response.message || 'Cliente creado exitosamente');
      }

      setShowModal(false);
      cargarClientes();
    } catch (error) {
      console.error('Error guardando cliente:', error);
      toast.error(error.message || 'Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado activo
  const handleToggleActivo = async (cliente) => {
    try {
      await apiRequest(`/clientes/${cliente.id}`, {
        method: 'PUT',
        body: { activo: !cliente.activo }
      });
      
      toast.success(`Cliente ${!cliente.activo ? 'activado' : 'desactivado'}`);
      cargarClientes();
    } catch (error) {
      toast.error('Error al cambiar estado del cliente');
    }
  };

  // Eliminar cliente
  const handleEliminarCliente = async (cliente) => {
    if (!confirm(`¿Estás seguro de desactivar a ${cliente.nombre}?`)) return;

    try {
      await apiRequest(`/clientes/${cliente.id}`, {
        method: 'DELETE'
      });
      
      toast.success('Cliente desactivado exitosamente');
      cargarClientes();
    } catch (error) {
      toast.error('Error al desactivar cliente');
    }
  };

  const clientesFiltrados = clientes.filter(cliente => {
    if (filtroActivo === 'activos' && !cliente.activo) return false;
    if (filtroActivo === 'inactivos' && cliente.activo) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Clientes</h3>
          <p className="text-sm text-gray-600">
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado{clientesFiltrados.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={handleNuevoCliente}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Filtro estado */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando clientes...</span>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se found clientes con ese criterio' : 'Comienza agregando tu primer cliente'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
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
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          cliente.tipo === 'empresa' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          {cliente.tipo === 'empresa' ? 
                            <Building className={`h-5 w-5 ${cliente.tipo === 'empresa' ? 'text-purple-600' : 'text-blue-600'}`} /> :
                            <User className="h-5 w-5 text-blue-600" />
                          }
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{cliente.cedula_rif}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {cliente.telefono && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {cliente.telefono}
                          </div>
                        )}
                        {cliente.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {cliente.email}
                          </div>
                        )}
                        {cliente.direccion && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-[200px]">{cliente.direccion}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        cliente.tipo === 'empresa' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {cliente.tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        cliente.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cliente.activo ? '✅ Activo' : '❌ Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditarCliente(cliente)}
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                          title="Editar cliente"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(cliente)}
                          className={`p-1 rounded ${
                            cliente.activo 
                              ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }`}
                          title={cliente.activo ? 'Desactivar' : 'Activar'}
                        >
                          {cliente.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEliminarCliente(cliente)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title="Eliminar cliente"
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
            <form onSubmit={handleGuardarCliente}>
              
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between text-white">
                  <h3 className="text-lg font-bold">
                    {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cliente *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tipo: 'persona' }))}
                      className={`p-3 border-2 rounded-lg text-center transition-colors ${
                        formData.tipo === 'persona'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <User className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">Persona</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tipo: 'empresa' }))}
                      className={`p-3 border-2 rounded-lg text-center transition-colors ${
                        formData.tipo === 'empresa'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Building className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">Empresa</div>
                    </button>
                  </div>
                </div>

                {/* Cédula/RIF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.tipo === 'empresa' ? 'RIF *' : 'Cédula *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cedula_rif}
                    onChange={(e) => setFormData(prev => ({ ...prev, cedula_rif: e.target.value }))}
                    placeholder={formData.tipo === 'empresa' ? 'J-12345678-9' : 'V-12345678'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.tipo === 'empresa' ? 'Razón Social *' : 'Nombre Completo *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder={formData.tipo === 'empresa' ? 'Empresa C.A.' : 'Juan Pérez'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="0424-1234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="cliente@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="Dirección completa..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (editingCliente ? 'Actualizar' : 'Crear')}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientesManager;