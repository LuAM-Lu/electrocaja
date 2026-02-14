// components/configuracion/modals/UsuarioFormModal.jsx
// 👤 Modal premium para crear/editar usuarios con todos los campos DB

import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus'
import Save from 'lucide-react/dist/esm/icons/save'
import Crown from 'lucide-react/dist/esm/icons/crown'
import Shield from 'lucide-react/dist/esm/icons/shield'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import Eye from 'lucide-react/dist/esm/icons/eye'
import Mail from 'lucide-react/dist/esm/icons/mail'
import Lock from 'lucide-react/dist/esm/icons/lock'
import Building2 from 'lucide-react/dist/esm/icons/building-2'
import Clock from 'lucide-react/dist/esm/icons/clock'
import QrCode from 'lucide-react/dist/esm/icons/qr-code'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Check from 'lucide-react/dist/esm/icons/check'
import { useAuthStore } from '../../../store/authStore';
import toast from '../../../utils/toast.jsx';
import { api } from '../../../config/api';
import { generarQuickAccessToken, formatearToken } from '../../../utils/tokenGenerator';

const UsuarioFormModal = ({ isOpen, onClose, onSuccess, usuarioEdit = null }) => {
  const { usuario: usuarioActual } = useAuthStore();
  const esEdicion = !!usuarioEdit;

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: 'cajero',
    sucursal: 'Principal',
    turno: 'MATUTINO',
    activo: true,
    quickAccessToken: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Wizard de 3 pasos

  // Cargar datos si es edición
  useEffect(() => {
    if (esEdicion && usuarioEdit) {
      setFormData({
        nombre: usuarioEdit.nombre || '',
        email: usuarioEdit.email || '',
        password: '', // No mostrar password en edición
        confirmPassword: '',
        rol: usuarioEdit.rol || 'cajero',
        sucursal: usuarioEdit.sucursal || 'Principal',
        turno: usuarioEdit.turno || 'MATUTINO',
        activo: usuarioEdit.activo !== undefined ? usuarioEdit.activo : true,
        quickAccessToken: usuarioEdit.quickAccessToken || ''
      });
    } else {
      // Generar token automáticamente para nuevo usuario
      setFormData(prev => ({
        ...prev,
        quickAccessToken: generarQuickAccessToken()
      }));
    }
  }, [esEdicion, usuarioEdit]);

  const roles = [
    {
      value: 'admin',
      label: 'Administrador',
      icon: <Crown className="h-5 w-5" />,
      color: 'from-red-500 to-red-600',
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      descripcion: 'Control total del sistema',
      permisos: ['Gestión completa', 'Configuración', 'Reportes avanzados', 'Administrar usuarios']
    },
    {
      value: 'supervisor',
      label: 'Supervisor',
      icon: <Shield className="h-5 w-5" />,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      descripcion: 'Supervisión y gestión de caja',
      permisos: ['Abrir/Cerrar caja', 'Supervisar ventas', 'Reportes básicos', 'Ver inventario']
    },
    {
      value: 'cajero',
      label: 'Cajero',
      icon: <UserCheck className="h-5 w-5" />,
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      descripcion: 'Operaciones de caja y ventas',
      permisos: ['Registrar ventas', 'Gestionar transacciones', 'Ver inventario', 'Imprimir recibos']
    },
    {
      value: 'viewer',
      label: 'Observador',
      icon: <Eye className="h-5 w-5" />,
      color: 'from-gray-500 to-gray-600',
      borderColor: 'border-gray-500',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      descripcion: 'Solo visualización de información',
      permisos: ['Ver reportes', 'Consultar inventario', 'Ver transacciones']
    }
  ];

  const sucursales = ['Principal', 'Norte', 'Sur', 'Centro', 'Oeste', 'Este'];
  const turnos = [
    { value: 'MATUTINO', label: 'Matutino', horario: '6:00 AM - 2:00 PM' },
    { value: 'VESPERTINO', label: 'Vespertino', horario: '2:00 PM - 10:00 PM' },
    { value: 'NOCTURNO', label: 'Nocturno', horario: '10:00 PM - 6:00 AM' },
    { value: 'COMPLETO', label: 'Jornada Completa', horario: '8:00 AM - 5:00 PM' }
  ];

  const validateStep = (stepNumber) => {
    const newErrors = {};

    if (stepNumber === 1) {
      // Validar datos básicos
      if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
      if (!formData.email.trim()) newErrors.email = 'El email es requerido';
      if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';

      // Solo validar password si es creación o si se está cambiando
      if (!esEdicion || formData.password) {
        if (!formData.password) newErrors.password = 'La contraseña es requerida';
        if (formData.password && formData.password.length < 6) {
          newErrors.password = 'Mínimo 6 caracteres';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }
      }
    }

    if (stepNumber === 2) {
      // Validar rol y permisos
      if (!formData.rol) newErrors.rol = 'Debe seleccionar un rol';
    }

    if (stepNumber === 3) {
      // Validar configuración
      if (!formData.sucursal) newErrors.sucursal = 'Debe seleccionar una sucursal';
      if (!formData.turno) newErrors.turno = 'Debe seleccionar un turno';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleRegenerarToken = () => {
    const nuevoToken = generarQuickAccessToken();
    setFormData({ ...formData, quickAccessToken: nuevoToken, regenerarToken: true });
    toast.success('Token regenerado (se aplicará al guardar)');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    setLoading(true);

    try {
      const endpoint = esEdicion ? `/users/${usuarioEdit.id}` : '/users/crear';
      const method = esEdicion ? 'put' : 'post';

      // Preparar data para enviar
      const dataToSend = {
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
        sucursal: formData.sucursal,
        turno: formData.turno,
        activo: formData.activo
      };

      // Solo incluir password si es creación o si se está cambiando
      if (!esEdicion) {
        // En creación, enviar password y confirmPassword
        dataToSend.password = formData.password;
        dataToSend.confirmPassword = formData.confirmPassword;
        // NO enviar quickAccessToken - el backend lo genera automáticamente
      } else {
        // En edición, solo enviar password si se está cambiando
        if (formData.password) {
          dataToSend.password = formData.password;
          dataToSend.confirmPassword = formData.confirmPassword;
        }
        // Si se solicitó regenerar token, enviar el flag
        if (formData.regenerarToken) {
          dataToSend.regenerarToken = true;
        }
      }

      const response = await api[method](endpoint, dataToSend);

      toast.success(
        esEdicion
          ? `Usuario ${formData.nombre} actualizado exitosamente`
          : `Usuario ${formData.nombre} creado exitosamente`
      );

      // Limpiar formulario
      setFormData({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        rol: 'cajero',
        sucursal: 'Principal',
        turno: 'MATUTINO',
        activo: true,
        quickAccessToken: generarQuickAccessToken()
      });

      setStep(1);

      if (onSuccess) {
        onSuccess(response.data.data || formData);
      }

      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Error al guardar usuario');
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
      turno: 'MATUTINO',
      activo: true,
      quickAccessToken: generarQuickAccessToken()
    });
    setErrors({});
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  const rolSeleccionado = roles.find(r => r.value === formData.rol);
  const turnoSeleccionado = turnos.find(t => t.value === formData.turno);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">

        {/* Header */}
        <div className={`bg-gradient-to-r ${rolSeleccionado?.color || 'from-green-500 to-green-600'}`}>
          <div className="px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  {esEdicion ? <Save className="h-7 w-7" /> : <UserPlus className="h-7 w-7" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {esEdicion ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                  </h2>
                  <p className="text-sm opacity-90">
                    {esEdicion ? 'Modificar información del usuario' : 'Agregar cuenta al sistema ElectroCaja'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center justify-between">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        step >= s
                          ? 'bg-white text-green-600'
                          : 'bg-white/20 text-white/60'
                      }`}
                    >
                      {step > s ? <Check className="h-6 w-6" /> : s}
                    </div>
                    <div className={`text-sm font-medium ${step >= s ? 'text-white' : 'text-white/60'}`}>
                      {s === 1 && 'Datos Básicos'}
                      {s === 2 && 'Rol y Permisos'}
                      {s === 3 && 'Configuración'}
                    </div>
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-4 rounded-full ${
                        step > s ? 'bg-white' : 'bg-white/20'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">

          {/* PASO 1: Datos Básicos */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all ${
                      errors.nombre ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Juan Pérez González"
                    disabled={loading}
                  />
                  {errors.nombre && (
                    <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.nombre}</span>
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Corporativo *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all ${
                        errors.email ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="usuario@electrocaja.com"
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Contraseñas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña {!esEdicion && '*'}
                    {esEdicion && <span className="text-gray-500 text-xs ml-2">(Dejar vacío para no cambiar)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all ${
                        errors.password ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder={esEdicion ? '••••••••' : 'Mínimo 6 caracteres'}
                      disabled={loading}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirmar Contraseña {!esEdicion && '*'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder={esEdicion ? '••••••••' : 'Repetir contraseña'}
                      disabled={loading}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Token de Acceso Rápido */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <QrCode className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">Token de Acceso Rápido</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerarToken}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Regenerar</span>
                  </button>
                </div>
                <div className="text-center py-3">
                  <div className="text-4xl font-bold text-green-600 tracking-wider">
                    {formatearToken(formData.quickAccessToken)}
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    Este código será usado para acceso rápido al sistema
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Rol y Permisos */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Seleccionar Rol del Usuario *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map((rol) => (
                    <label
                      key={rol.value}
                      className={`relative flex flex-col p-5 border-3 rounded-2xl cursor-pointer transition-all hover:shadow-xl ${
                        formData.rol === rol.value
                          ? `${rol.borderColor} bg-gradient-to-br ${rol.bgColor} shadow-lg scale-105`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rol"
                        value={rol.value}
                        checked={formData.rol === rol.value}
                        onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                        className="sr-only"
                        disabled={loading}
                      />

                      {/* Header del rol */}
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${rol.color} text-white`}>
                          {rol.icon}
                        </div>
                        {formData.rol === rol.value && (
                          <div className={`p-1 rounded-full bg-gradient-to-br ${rol.color}`}>
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className={`font-bold text-lg mb-1 ${formData.rol === rol.value ? rol.textColor : 'text-gray-900'}`}>
                        {rol.label}
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {rol.descripcion}
                      </div>

                      {/* Permisos */}
                      <div className="mt-auto">
                        <div className="text-xs font-semibold text-gray-500 mb-2">Permisos incluidos:</div>
                        <ul className="space-y-1">
                          {rol.permisos.map((permiso, idx) => (
                            <li key={idx} className="flex items-center space-x-2 text-xs text-gray-700">
                              <div className={`w-1.5 h-1.5 rounded-full ${formData.rol === rol.value ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span>{permiso}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vista previa del rol seleccionado */}
              {rolSeleccionado && (
                <div className={`bg-gradient-to-br ${rolSeleccionado.bgColor} border-2 ${rolSeleccionado.borderColor} rounded-xl p-5`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${rolSeleccionado.color} text-white`}>
                      {rolSeleccionado.icon}
                    </div>
                    <div>
                      <div className={`font-bold ${rolSeleccionado.textColor}`}>
                        Rol seleccionado: {rolSeleccionado.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {rolSeleccionado.descripcion}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Configuración */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Sucursal y Turno */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sucursal Asignada *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={formData.sucursal}
                      onChange={(e) => setFormData({ ...formData, sucursal: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all appearance-none bg-white"
                      disabled={loading}
                    >
                      {sucursales.map((suc) => (
                        <option key={suc} value={suc}>
                          Sucursal {suc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Turno de Trabajo *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={formData.turno}
                      onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all appearance-none bg-white"
                      disabled={loading}
                    >
                      {turnos.map((turno) => (
                        <option key={turno.value} value={turno.value}>
                          {turno.label} ({turno.horario})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Estado Activo */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-5">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-xl ${formData.activo ? 'bg-green-500' : 'bg-gray-400'} text-white transition-colors`}>
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Usuario Activo</div>
                      <div className="text-sm text-gray-600">
                        {formData.activo
                          ? 'El usuario puede acceder al sistema'
                          : 'El acceso al sistema está bloqueado'}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="sr-only"
                      disabled={loading}
                    />
                    <div
                      className={`w-14 h-8 rounded-full transition-colors ${
                        formData.activo ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                          formData.activo ? 'translate-x-7' : 'translate-x-1'
                        } mt-1`}
                      />
                    </div>
                  </div>
                </label>
              </div>

              {/* Resumen Final */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
                <div className="font-bold text-green-900 mb-4 text-lg">📋 Resumen del Usuario</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 font-medium">Nombre:</div>
                    <div className="text-gray-900 font-semibold">{formData.nombre || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-medium">Email:</div>
                    <div className="text-gray-900 font-semibold">{formData.email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-medium">Rol:</div>
                    <div className="text-gray-900 font-semibold">{rolSeleccionado?.label || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-medium">Sucursal:</div>
                    <div className="text-gray-900 font-semibold">{formData.sucursal}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-medium">Turno:</div>
                    <div className="text-gray-900 font-semibold">{turnoSeleccionado?.label || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-medium">Token:</div>
                    <div className="text-green-600 font-bold">{formatearToken(formData.quickAccessToken)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                ← Anterior
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className={`px-8 py-3 bg-gradient-to-r ${rolSeleccionado?.color || 'from-green-500 to-green-600'} hover:shadow-lg text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center space-x-2`}
              >
                <span>Siguiente</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3 bg-gradient-to-r ${rolSeleccionado?.color || 'from-green-500 to-green-600'} hover:shadow-lg text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center space-x-2`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    {esEdicion ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                    <span>{esEdicion ? 'Actualizar Usuario' : 'Crear Usuario'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuarioFormModal;
