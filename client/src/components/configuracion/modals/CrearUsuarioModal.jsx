// components/CrearUsuarioModal.jsx
import React, { useState } from 'react';
import { X, UserPlus, Check, AlertCircle, Crown, Shield, UserCheck, Eye } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import toast from '../../../utils/toast.jsx';
import { api } from '../../../config/api';

const CrearUsuarioModal = ({ isOpen, onClose, onUserCreated }) => {
  const { usuario } = useAuthStore();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: 'cajero',
    sucursal: 'Principal',
    turno: 'matutino'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const roles = [
    { 
      value: 'admin', 
      label: 'Administrador', 
      icon: <Crown className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800 border-red-200',
      descripcion: 'Control total del sistema'
    },
    { 
      value: 'supervisor', 
      label: 'Supervisor', 
      icon: <Shield className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      descripcion: 'Puede abrir/cerrar caja y supervisar'
    },
    { 
      value: 'cajero', 
      label: 'Cajero', 
      icon: <UserCheck className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800 border-green-200',
      descripcion: 'Registra transacciones y ventas'
    },
    { 
      value: 'viewer', 
      label: 'Observador', 
      icon: <Eye className="h-4 w-4" />,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      descripcion: 'Solo puede ver información'
    }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    if (formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const response = await api.post('/users/crear', formData);

      const data = await response.json();

      if (response.ok) {
        toast.success(`Usuario ${formData.nombre} creado exitosamente`);
        
        // Limpiar formulario
        setFormData({
          nombre: '',
          email: '',
          password: '',
          confirmPassword: '',
          rol: 'cajero',
          sucursal: 'Principal',
          turno: 'matutino'
        });
        
        // Callback para actualizar lista
        if (onUserCreated) {
          onUserCreated(data.data?.usuario || formData);
        }
        
        onClose();
      } else {
        toast.error(data.message || 'Error al crear usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      
      //  OPCIÓN 2: Simulación si no hay backend
      console.log(' Simulando creación de usuario:', formData);
      toast.success(`Usuario ${formData.nombre} creado exitosamente (simulado)`);
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        rol: 'cajero',
        sucursal: 'Principal',
        turno: 'matutino'
      });
      
      // Callback para actualizar lista
      if (onUserCreated) {
        onUserCreated({ ...formData, id: Date.now() });
      }
      
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    
    setFormData({
      nombre: '',
      email: '',
      password: '',
      confirmPassword: '',
      rol: 'cajero',
      sucursal: 'Principal',
      turno: 'matutino'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const rolSeleccionado = roles.find(r => r.value === formData.rol);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600">
          <div className="px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Crear Nuevo Usuario</h2>
                  <div className="text-sm text-green-100">
                    Agregar cuenta al sistema
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Datos Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.nombre ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Juan Pérez"
                disabled={loading}
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="usuario@empresa.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Contraseñas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Repetir contraseña"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rol del Usuario *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map(rol => (
                <label 
                  key={rol.value} 
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    formData.rol === rol.value 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={rol.value}
                    checked={formData.rol === rol.value}
                    onChange={(e) => setFormData({...formData, rol: e.target.value})}
                    className="text-green-600 mr-3"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${rol.color} mb-1`}>
                      {rol.icon}
                      <span>{rol.label}</span>
                    </div>
                    <div className="text-xs text-gray-600">{rol.descripcion}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Configuración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal
              </label>
              <select
                value={formData.sucursal}
                onChange={(e) => setFormData({...formData, sucursal: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
              >
                <option value="Principal">Sucursal Principal</option>
                <option value="Norte">Sucursal Norte</option>
                <option value="Sur">Sucursal Sur</option>
                <option value="Centro">Sucursal Centro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turno
              </label>
              <select
                value={formData.turno}
                onChange={(e) => setFormData({...formData, turno: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
              >
                <option value="matutino">Matutino (6:00 AM - 2:00 PM)</option>
                <option value="vespertino">Vespertino (2:00 PM - 10:00 PM)</option>
                <option value="nocturno">Nocturno (10:00 PM - 6:00 AM)</option>
              </select>
            </div>
          </div>

          {/* Vista previa */}
          {rolSeleccionado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">
                  Rol: {rolSeleccionado.label}
                </span>
              </div>
              <div className="text-sm text-green-700">
                {rolSeleccionado.descripcion}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Crear Usuario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearUsuarioModal;