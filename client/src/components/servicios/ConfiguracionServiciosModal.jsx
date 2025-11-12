// components/servicios/ConfiguracionServiciosModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Users, Phone, Settings, Save, AlertCircle, AlertTriangle, Star } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useServiciosStore } from '../../store/serviciosStore';
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';
import {
  sanitizePhone,
  sanitizeInput,
  isValidPhone
} from '../../utils/sanitize';

export default function ConfiguracionServiciosModal({ isOpen, onClose }) {
  const { usuario } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]); // 🔧 Todos los usuarios del sistema
  const [tecnicosConfig, setTecnicosConfig] = useState([]);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Verificar que el usuario sea admin antes de cargar
      if (usuario?.rol !== 'admin') {
        toast.error('Solo los administradores pueden acceder a esta configuración');
        onClose();
        return;
      }
      cargarDatos();
    }
  }, [isOpen, usuario]);

  const cargarDatos = async () => {
    setLoading(true);
    setValidationErrors({});

    try {
      // 🔧 Cargar TODOS los usuarios del sistema (solo admin)
      const usuariosResponse = await api.get('/users');
      if (usuariosResponse.data.success) {
        setUsuarios(usuariosResponse.data.data || []);
      }

      // 🔧 Cargar configuración de técnicos desde la API
      const configResponse = await api.get('/servicios/tecnicos/config');
      if (configResponse.data.success) {
        setTecnicosConfig(configResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error cargando config:', error);
      if (error.response?.status === 403) {
        toast.error('No tienes permisos para acceder a esta configuración');
        onClose();
      } else {
      toast.error('Error al cargar la configuración');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = () => {
    const errors = {};
    let hasErrors = false;

    tecnicosConfig.forEach(config => {
      const userFound = usuarios.find(u => u.id === config.usuarioId);
      if (!userFound) return;

      // Validate phone if active and provided
      if (config.activo && config.telefono) {
        if (!isValidPhone(config.telefono)) {
          errors[`phone_${config.usuarioId}`] = 'Número de teléfono inválido';
          hasErrors = true;
        }
      }

      // Validate especialidad length
      if (config.especialidad && config.especialidad.length > 100) {
        errors[`especialidad_${config.usuarioId}`] = 'Especialidad muy larga (máx 100 caracteres)';
        hasErrors = true;
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      toast.error('Por favor corrige los errores de validación');
      return;
    }

    setSaving(true);

    try {
      // Sanitize data before saving
      const sanitizedConfig = tecnicosConfig.map(config => ({
        ...config,
        telefono: sanitizePhone(config.telefono || ''),
        especialidad: sanitizeInput(config.especialidad || '', 100),
        favorito: config.favorito === true
      }));

      // 🔧 Guardar en la API
      const response = await api.post('/servicios/tecnicos/config', {
        tecnicos: sanitizedConfig
      });

      if (response.data.success) {
        toast.success('✅ Configuración guardada correctamente');
        onClose();
      } else {
        throw new Error(response.data.message || 'Error guardando configuración');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error al guardar la configuración. Por favor intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleTelefonoChange = (usuarioId, telefono) => {
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`phone_${usuarioId}`];
      return newErrors;
    });

    // Sanitize phone input
    const sanitized = sanitizePhone(telefono);

    setTecnicosConfig(prev => {
      const existing = prev.find(t => t.usuarioId === usuarioId);
      if (existing) {
        return prev.map(t =>
          t.usuarioId === usuarioId ? { ...t, telefono: sanitized } : t
        );
      } else {
        return [...prev, { usuarioId, telefono: sanitized, activo: true, especialidad: '' }];
      }
    });
  };

  const handleEspecialidadChange = (usuarioId, especialidad) => {
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`especialidad_${usuarioId}`];
      return newErrors;
    });

    // Sanitize input
    const sanitized = sanitizeInput(especialidad, 100);

    setTecnicosConfig(prev => {
      const existing = prev.find(t => t.usuarioId === usuarioId);
      if (existing) {
        return prev.map(t =>
          t.usuarioId === usuarioId ? { ...t, especialidad: sanitized } : t
        );
      } else {
        return [...prev, { usuarioId, especialidad: sanitized, activo: true, telefono: '' }];
      }
    });
  };

  const handleActivoToggle = (usuarioId) => {
    setTecnicosConfig(prev => {
      const existing = prev.find(t => t.usuarioId === usuarioId);
      if (existing) {
        return prev.map(t =>
          t.usuarioId === usuarioId ? { ...t, activo: !t.activo } : t
        );
      } else {
        return [...prev, { usuarioId, activo: true, telefono: '', especialidad: '', favorito: false }];
      }
    });
  };

  const handleFavoritoToggle = (usuarioId) => {
    setTecnicosConfig(prev => {
      const existing = prev.find(t => t.usuarioId === usuarioId);
      const nuevoFavorito = !existing?.favorito;
      
      // Si no existe la configuración, crearla primero
      if (!existing) {
        return [...prev, { usuarioId, activo: true, telefono: '', especialidad: '', favorito: nuevoFavorito }];
      }
      
      // Si se marca como favorito, desmarcar los demás
      return prev.map(t => {
        if (t.usuarioId === usuarioId) {
          return { ...t, favorito: nuevoFavorito };
        } else if (nuevoFavorito) {
          // Desmarcar otros favoritos si se está marcando uno nuevo
          return { ...t, favorito: false };
        }
        return t;
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl animate-modal-enter">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Configuración de Servicios</h2>
                <p className="text-sm text-gray-300">Gestión de técnicos y preferencias</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">

          {/* Información */}
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Configuración de Técnicos</p>
              <p className="text-blue-300/80">
                Asigna números de WhatsApp y especialidades a los usuarios que realizarán servicios técnicos.
                Esta información se usará para notificaciones automáticas.
              </p>
            </div>
          </div>

          {/* Sección Técnicos */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Técnicos Disponibles</h3>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">Cargando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usuarios.map(user => {
                  const config = tecnicosConfig.find(t => t.usuarioId === user.id) || {
                    telefono: '',
                    especialidad: '',
                    activo: false,
                    favorito: false
                  };

                  return (
                    <div
                      key={user.id}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                            {user.nombre.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium text-white">{user.nombre}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.rol === 'admin' ? 'bg-purple-900/30 text-purple-300 border border-purple-700' :
                            user.rol === 'supervisor' ? 'bg-blue-900/30 text-blue-300 border border-blue-700' :
                            'bg-green-900/30 text-green-300 border border-green-700'
                          }`}>
                            {user.rol}
                          </span>
                          <button
                            onClick={() => handleActivoToggle(user.id)}
                            disabled={loading || saving}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              config.activo
                                ? 'bg-green-900/30 text-green-300 border border-green-700 hover:bg-green-900/50'
                                : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'
                            }`}
                          >
                            {config.activo ? 'Activo como Técnico' : 'Inactivo'}
                          </button>
                        </div>
                      </div>

                      {/* 🔧 Mostrar campos solo si el usuario está activo como técnico */}
                      {config.activo && (
                        <>
                          {/* Botón Favorito */}
                          <div className="mb-3 flex items-center justify-end">
                            <button
                              onClick={() => handleFavoritoToggle(user.id)}
                              disabled={loading || saving}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                config.favorito
                                  ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700 hover:bg-yellow-900/50'
                                  : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'
                              }`}
                              title={config.favorito ? 'Técnico favorito (aparecerá seleccionado por defecto)' : 'Marcar como técnico favorito'}
                            >
                              <Star className={`h-3.5 w-3.5 ${config.favorito ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                              {config.favorito ? 'Técnico Favorito' : 'Marcar como Favorito'}
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {/* Teléfono WhatsApp */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                <Phone className="h-4 w-4 inline mr-1" />
                                Teléfono WhatsApp
                              </label>
                            <input
                              type="text"
                              placeholder="+58 412-1234567"
                              value={config.telefono}
                              onChange={(e) => handleTelefonoChange(user.id, e.target.value)}
                              disabled={loading || saving}
                              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                validationErrors[`phone_${user.id}`]
                                  ? 'border-red-500 focus:ring-red-500'
                                  : 'border-gray-600'
                              }`}
                            />
                            {validationErrors[`phone_${user.id}`] && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                {validationErrors[`phone_${user.id}`]}
                              </div>
                            )}
                          </div>

                          {/* Especialidad */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Especialidad
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Smartphones, Laptops"
                              value={config.especialidad}
                              onChange={(e) => handleEspecialidadChange(user.id, e.target.value)}
                              disabled={loading || saving}
                              maxLength={100}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              validationErrors[`especialidad_${user.id}`]
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-gray-600'
                            }`}
                          />
                          {validationErrors[`especialidad_${user.id}`] && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              {validationErrors[`especialidad_${user.id}`]}
                            </div>
                          )}
                        </div>
                      </div>
                      </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Otras configuraciones futuras */}
          <div className="p-4 bg-gray-700/30 border border-gray-600 rounded-lg">
            <p className="text-sm text-gray-400 text-center">
              💡 Más opciones de configuración próximamente...
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800/50 px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
