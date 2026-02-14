// components/configuracion/UsuariosPanel.jsx - REFACTORIZADO CON MEJORES PRÁCTICAS
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Users from 'lucide-react/dist/esm/icons/users'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus'
import UserX from 'lucide-react/dist/esm/icons/user-x'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Crown from 'lucide-react/dist/esm/icons/crown'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import Monitor from 'lucide-react/dist/esm/icons/monitor'
import Activity from 'lucide-react/dist/esm/icons/activity'
import Globe from 'lucide-react/dist/esm/icons/globe'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import X from 'lucide-react/dist/esm/icons/x'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Eye from 'lucide-react/dist/esm/icons/eye'
import Edit from 'lucide-react/dist/esm/icons/edit'
import QrCode from 'lucide-react/dist/esm/icons/qr-code'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';
import UsuarioFormModal from './modals/UsuarioFormModal';
import BorrarUserModal from './modals/BorrarUserModal';
import QRTokenModal from './modals/QRTokenModal';

// ===================================
// 🎯 CONSTANTES
// ===================================
const USUARIOS_POR_PAGINA = 5;
const INTERVALO_POLLING = 10000; // 10 segundos (menos agresivo)
const ADMIN_PHONE = '584120552931';

// ===================================
// 🎨 CONFIGURACIÓN DE ROLES
// ===================================
const ROLE_CONFIG = {
  admin: {
    icon: Crown,
    color: 'bg-red-100 text-red-800 border-red-200',
    badge: 'from-red-500 to-red-600'
  },
  supervisor: {
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    badge: 'from-blue-500 to-blue-600'
  },
  cajero: {
    icon: UserCheck,
    color: 'bg-green-100 text-green-800 border-green-200',
    badge: 'from-green-500 to-green-600'
  },
  viewer: {
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    badge: 'from-gray-400 to-gray-500'
  }
};

// ===================================
// 🛠️ UTILITY FUNCTIONS (Memoizadas fuera del componente)
// ===================================
const formatearFecha = (fecha) => {
  if (!fecha) return 'N/A';
  try {
    return new Date(fecha).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  } catch {
    return 'Fecha inválida';
  }
};

const calcularTiempo = (timestamp) => {
  if (!timestamp) return '0m';
  try {
    const diferencia = Date.now() - new Date(timestamp).getTime();
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    return horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
  } catch {
    return '0m';
  }
};

const getRoleIcon = (rol) => {
  const Icon = ROLE_CONFIG[rol]?.icon || UserCheck;
  return <Icon className="h-3 w-3" />;
};

const getRoleColor = (rol) => {
  return ROLE_CONFIG[rol]?.color || 'bg-gray-100 text-gray-800 border-gray-200';
};

// ===================================
// 🔧 VALIDACIONES
// ===================================
const validarAccionUsuario = (user, currentUser, accion = 'modificar') => {
  // No se puede modificar al admin principal
  if (user.rol === 'admin' && user.id === 1) {
    return {
      valido: false,
      mensaje: `No se puede ${accion} al administrador principal`
    };
  }

  // No te puedes modificar a ti mismo (excepto en edición)
  if (user.email === currentUser?.email && accion !== 'editar') {
    return {
      valido: false,
      mensaje: `No puedes ${accion}te a ti mismo`
    };
  }

  return { valido: true };
};

// ===================================
// 📦 COMPONENTE PRINCIPAL
// ===================================
const UsuariosPanel = ({ usuario }) => {
  // 🎯 ESTADO CONSOLIDADO
  const [state, setState] = useState({
    // Secciones
    sesionesAbiertas: false,
    usuariosAbiertas: true,

    // Datos
    sesionesActivas: [],
    usuarios: [],

    // Loading
    loading: false,
    loadingUsuarios: false,

    // Modales
    showModalBorrar: false,
    showFormularioUsuario: false,
    showQRModal: false,

    // Selección
    usuarioABorrar: null,
    usuarioEditando: null,
    usuarioQR: null,

    // Paginación
    paginaActual: 1,

    // Error
    error: null
  });

  // Referencias para cleanup
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ===================================
  // 🔄 FUNCIONES DE ACTUALIZACIÓN
  // ===================================
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ===================================
  // 📡 API CALLS CON CANCELACIÓN
  // ===================================
  const cargarSesionesActivas = useCallback(async () => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      updateState({ loading: true, error: null });

      const response = await api.get('/sessions/debug', {
        signal: abortControllerRef.current.signal
      });

      const { data } = response.data;

      const sesiones = data.sesiones_socket?.map(s => ({
        ...s,
        tipo: 'Socket.IO',
        ip: s.ip_cliente,
        estado: 'Tiempo Real'
      })) || [];

      updateState({ sesionesActivas: sesiones, loading: false });
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
        console.error('Error cargando sesiones:', error);
        updateState({
          error: 'Error al cargar sesiones activas',
          loading: false
        });
      }
    }
  }, [updateState]);

  const cargarUsuarios = useCallback(async () => {
    try {
      updateState({ loadingUsuarios: true, error: null });
      console.log('🔄 Cargando usuarios del backend...');

      const response = await api.get('/users');

      // Validar estructura de respuesta
      if (!response?.data?.data) {
        throw new Error('Respuesta inválida del servidor');
      }

      const usuarios = response.data.data;
      console.log('✅ Usuarios cargados:', usuarios.length);

      updateState({
        usuarios,
        loadingUsuarios: false,
        paginaActual: 1,
        error: null
      });
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);

      updateState({
        error: 'Error al cargar usuarios. Por favor, recarga la página.',
        loadingUsuarios: false
      });

      toast.error('Error al cargar usuarios');
    }
  }, [updateState]);

  // ===================================
  // ⚡ EFFECTS
  // ===================================
  useEffect(() => {
    // Carga inicial
    cargarSesionesActivas();
    cargarUsuarios();

    // Polling de sesiones (10 segundos)
    intervalRef.current = setInterval(cargarSesionesActivas, INTERVALO_POLLING);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cargarSesionesActivas, cargarUsuarios]);

  // ===================================
  // 🎬 ACCIONES DE USUARIO
  // ===================================
  const desactivarUsuario = useCallback(async (user) => {
    const validacion = validarAccionUsuario(user, usuario, user.activo ? 'desactivar' : 'activar');
    if (!validacion.valido) {
      toast.error(validacion.mensaje);
      return;
    }

    try {
      await api.put(`/users/${user.id}`, {
        activo: !user.activo
      });

      toast.success(`Usuario ${user.activo ? 'desactivado' : 'activado'} exitosamente`);
      cargarUsuarios();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Error al cambiar estado del usuario');
    }
  }, [usuario, cargarUsuarios]);

  const borrarUsuario = useCallback((user) => {
    const validacion = validarAccionUsuario(user, usuario, 'borrar');
    if (!validacion.valido) {
      toast.error(validacion.mensaje);
      return;
    }

    updateState({
      usuarioABorrar: user,
      showModalBorrar: true
    });
  }, [usuario, updateState]);

  const confirmarBorrado = useCallback(async () => {
    if (!state.usuarioABorrar) return;

    try {
      await api.delete(`/users/${state.usuarioABorrar.id}`);
      toast.success(`Usuario ${state.usuarioABorrar.nombre} borrado exitosamente`);
      cargarUsuarios();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Error al borrar usuario');
    } finally {
      updateState({
        showModalBorrar: false,
        usuarioABorrar: null
      });
    }
  }, [state.usuarioABorrar, cargarUsuarios, updateState]);

  const resetearPassword = useCallback(async (user) => {
    try {
      toast.loading('Generando nueva contraseña...', { id: 'reset-pwd' });

      // 1. Resetear password en backend
      const response = await api.post(`/users/${user.id}/reset-password`);
      const { nuevaPassword, usuario_nombre } = response.data.data;

      // 2. Enviar a WhatsApp del admin
      try {
        await api.post('/whatsapp/enviar', {
          numero: ADMIN_PHONE,
          mensaje: `🔐 *RESET PASSWORD - ELECTRO CAJA*

👤 *Usuario:* ${usuario_nombre}
📧 *Email:* ${user.email}
🔑 *Nueva Contraseña:* \`${nuevaPassword}\`
📅 *Fecha:* ${new Date().toLocaleString('es-VE')}

⚠️ *IMPORTANTE:*
✅ Esta es una contraseña PERMANENTE
✅ Entregar al usuario de forma segura
✅ Usuario debe cambiarla en Configuración > Perfil

🎯 *Acción requerida:*
Notificar al usuario: ${usuario_nombre}

_Generado por: ${usuario?.nombre}_`
        });

        toast.success('Contraseña enviada por WhatsApp al administrador', {
          id: 'reset-pwd',
          duration: 8000
        });
      } catch (whatsappError) {
        console.warn('WhatsApp no disponible:', whatsappError);

        // Fallback: Mostrar en pantalla
        const copiarPassword = () => {
          navigator.clipboard.writeText(nuevaPassword);
          toast.success('Contraseña copiada al portapapeles');
        };

        toast(
          <div className="space-y-2">
            <div className="font-bold text-amber-900">⚠️ No se pudo enviar por WhatsApp</div>
            <div className="text-sm">Nueva contraseña para <strong>{usuario_nombre}</strong>:</div>
            <div className="flex items-center gap-2">
              <div
                onClick={copiarPassword}
                className="text-xl font-mono bg-white px-3 py-2 rounded border-2 border-amber-400 cursor-pointer hover:bg-amber-50 transition-colors flex-1 text-center select-all"
                title="Click para copiar"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && copiarPassword()}
              >
                {nuevaPassword}
              </div>
            </div>
            <div className="text-xs text-amber-700">
              ✏️ Click en la contraseña para copiar • Anota en papel si es necesario
            </div>
          </div>,
          {
            id: 'reset-pwd',
            duration: 20000,
            style: {
              background: '#FEF3C7',
              border: '2px solid #F59E0B',
              color: '#92400E',
              maxWidth: '500px'
            }
          }
        );
      }

      await cargarUsuarios();
    } catch (error) {
      console.error('Error reseteando password:', error);
      toast.error(error.response?.data?.message || 'Error al resetear contraseña del usuario', {
        id: 'reset-pwd'
      });
    }
  }, [usuario, cargarUsuarios]);

  const editarUsuario = useCallback((user) => {
    updateState({
      usuarioEditando: user,
      showFormularioUsuario: true
    });
  }, [updateState]);

  const verQRToken = useCallback((user) => {
    if (!user.quickAccessToken) {
      toast.error('Este usuario no tiene token de acceso rápido');
      return;
    }
    updateState({
      usuarioQR: user,
      showQRModal: true
    });
  }, [updateState]);

  const kickearUsuario = useCallback(async (sesion) => {
    if (sesion.email === usuario?.email) {
      toast.error('No puedes desconectar tu propia sesión');
      return;
    }

    if (sesion.rol === 'admin') {
      toast.error('No se puede desconectar al administrador');
      return;
    }

    try {
      await api.post('/auth/force-logout', {
        target_email: sesion.email,
        reason: 'Desconectado por administrador desde panel de control'
      });

      toast.success(`${sesion.nombre || sesion.usuario} desconectado exitosamente`, {
        id: `user-disconnect-${sesion.id}`
      });

      // Recargar sesiones después de kickear
      cargarSesionesActivas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al desconectar usuario');
    }
  }, [usuario, cargarSesionesActivas]);

  // ===================================
  // 🔢 PAGINACIÓN
  // ===================================
  const cambiarPagina = useCallback((nuevaPagina) => {
    const totalPaginas = Math.ceil(state.usuarios.length / USUARIOS_POR_PAGINA);
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      updateState({ paginaActual: nuevaPagina });
    }
  }, [state.usuarios.length, updateState]);

  // ===================================
  // 🎨 COMPUTED VALUES (Memoizados)
  // ===================================
  const usuariosPaginados = useMemo(() => {
    const indiceInicio = (state.paginaActual - 1) * USUARIOS_POR_PAGINA;
    const indiceFin = indiceInicio + USUARIOS_POR_PAGINA;
    return state.usuarios.slice(indiceInicio, indiceFin);
  }, [state.usuarios, state.paginaActual]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(state.usuarios.length / USUARIOS_POR_PAGINA);
  }, [state.usuarios.length]);

  const indiceInicio = useMemo(() => {
    return (state.paginaActual - 1) * USUARIOS_POR_PAGINA;
  }, [state.paginaActual]);

  const indiceFin = useMemo(() => {
    return Math.min(indiceInicio + USUARIOS_POR_PAGINA, state.usuarios.length);
  }, [indiceInicio, state.usuarios.length]);

  const estadisticas = useMemo(() => ({
    sesiones: state.sesionesActivas.length,
    activos: state.usuarios.filter(u => u.activo).length,
    admins: state.usuarios.filter(u => u.rol === 'admin').length,
    total: state.usuarios.length
  }), [state.sesionesActivas, state.usuarios]);

  // ===================================
  // 🎨 RENDER
  // ===================================
  return (
    <div className="space-y-6">

      {/* Error Global */}
      {state.error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{state.error}</p>
            <button
              onClick={() => updateState({ error: null })}
              className="ml-auto text-red-500 hover:text-red-700"
              aria-label="Cerrar mensaje de error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Resumen del Sistema - Premium Compacto */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Sesiones</p>
            <p className="text-xl font-bold text-blue-900 leading-tight group-hover:scale-105 transition-transform">{estadisticas.sesiones}</p>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <Monitor className="h-4 w-4 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 px-4 py-2.5 rounded-xl border border-green-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Activos</p>
            <p className="text-xl font-bold text-green-900 leading-tight group-hover:scale-105 transition-transform">{estadisticas.activos}</p>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <UserCheck className="h-4 w-4 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 px-4 py-2.5 rounded-xl border border-purple-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Admins</p>
            <p className="text-xl font-bold text-purple-900 leading-tight group-hover:scale-105 transition-transform">{estadisticas.admins}</p>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <Shield className="h-4 w-4 text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 px-4 py-2.5 rounded-xl border border-orange-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-orange-900 leading-tight group-hover:scale-105 transition-transform">{estadisticas.total}</p>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <Globe className="h-4 w-4 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Sesiones Activas (Siempre visible si hay contenido) */}
      {state.sesionesActivas.length > 0 && (
        <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-blue-900 text-sm">Sesiones Activas en Tiempo Real</h3>
            </div>
            <div className={`w-2 h-2 rounded-full ${state.loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {state.sesionesActivas.map((sesion, index) => (
              <div
                key={sesion.socket_id || index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center justify-between hover:border-blue-300 transition-colors"
                title={`${sesion.usuario || sesion.nombre} - ${sesion.rol}`}
              >
                <div className="flex items-center space-x-2 overflow-hidden">
                  <div className="w-7 h-7 flex-shrink-0 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-blue-700 shadow-sm">
                    {(sesion.usuario || sesion.nombre)?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-[10px] truncate">
                      {sesion.usuario || sesion.nombre}
                    </div>
                    <div className="flex items-center space-x-1 text-[9px] text-gray-500">
                      <span>{calcularTiempo(sesion.timestamp_conexion || sesion.timestamp)}</span>
                      <span>•</span>
                      <span className={`truncate ${getRoleColor(sesion.rol).replace('bg-', 'text-').split(' ')[1]}`}>{sesion.rol}</span>
                    </div>
                  </div>
                </div>

                {sesion.email !== usuario?.email && sesion.rol !== 'admin' && (
                  <button
                    onClick={() => kickearUsuario(sesion)}
                    className="flex-shrink-0 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Desconectar"
                  >
                    <UserX className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de Usuarios (Siempre Visible) */}
      <div className="bg-white border border-emerald-100 rounded-xl shadow-md overflow-hidden flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Gestión de Usuarios</h3>
          </div>

          <button
            onClick={() => {
              updateState({
                usuarioEditando: null,
                showFormularioUsuario: true
              });
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm hover:shadow transition-all text-sm font-medium flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        <div id="usuarios-content" className="flex-1 flex flex-col">
          {state.loadingUsuarios ? (
            <div className="p-6 text-center" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Cargando usuarios...</p>
            </div>
          ) : state.usuarios.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="font-medium text-sm">No hay usuarios registrados</p>
            </div>
          ) : (
            <>
              {/* Tabla Compacta */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label="Tabla de usuarios">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-semibold tracking-wider first:rounded-tl-lg">
                        Usuario
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold tracking-wider">
                        Rol
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-3 text-center font-semibold tracking-wider last:rounded-tr-lg">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usuariosPaginados.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${user.activo
                              ? 'bg-gradient-to-br from-green-500 to-green-600'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                              }`}>
                              {user.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-xs flex items-center space-x-1">
                                <span>{user.nombre}</span>
                                {user.rol === 'admin' && user.id === 1 && (
                                  <Crown className="h-3 w-3 text-yellow-500" aria-label="Administrador principal" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{user.sucursal}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{user.email}</div>
                          <div className="text-xs text-gray-500">{user.turno}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.rol)}`}>
                            {getRoleIcon(user.rol)}
                            <span>{user.rol.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${user.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                          {formatearFecha(user.createdAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {user.rol === 'admin' && user.id === 1 ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                Protegido
                              </span>
                            ) : user.email === usuario?.email ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                Tú
                              </span>
                            ) : (
                              <>
                                {/* Ver QR Token */}
                                {user.quickAccessToken && (
                                  <button
                                    onClick={() => verQRToken(user)}
                                    className="w-7 h-7 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-full transition-colors flex items-center justify-center"
                                    aria-label={`Ver código QR de ${user.nombre}`}
                                    title="Ver código QR"
                                  >
                                    <QrCode className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Editar Usuario */}
                                <button
                                  onClick={() => editarUsuario(user)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors flex items-center justify-center"
                                  aria-label={`Editar ${user.nombre}`}
                                  title="Editar usuario"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>

                                {/* Resetear Password */}
                                <button
                                  onClick={() => resetearPassword(user)}
                                  className="w-7 h-7 bg-cyan-100 hover:bg-cyan-200 text-cyan-600 rounded-full transition-colors flex items-center justify-center"
                                  aria-label={`Resetear contraseña de ${user.nombre}`}
                                  title="Resetear contraseña"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </button>

                                {/* Activar/Desactivar */}
                                <button
                                  onClick={() => desactivarUsuario(user)}
                                  className={`w-7 h-7 rounded-full transition-colors flex items-center justify-center ${user.activo
                                    ? 'bg-orange-100 hover:bg-orange-200 text-orange-600'
                                    : 'bg-green-100 hover:bg-green-200 text-green-600'
                                    }`}
                                  aria-label={user.activo ? `Desactivar ${user.nombre}` : `Activar ${user.nombre}`}
                                  title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                >
                                  {user.activo ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                </button>

                                {/* Borrar */}
                                <button
                                  onClick={() => borrarUsuario(user)}
                                  className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors flex items-center justify-center"
                                  aria-label={`Borrar ${user.nombre}`}
                                  title="Borrar usuario"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación Premium */}
              {totalPaginas > 1 && (
                <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-3 flex items-center justify-between">
                  <div className="text-xs text-emerald-700 font-medium">
                    Mostrando <span className="font-bold">{indiceInicio + 1}</span> - <span className="font-bold">{indiceFin}</span> de <span className="font-bold">{state.usuarios.length}</span> resultados
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => cambiarPagina(state.paginaActual - 1)}
                      disabled={state.paginaActual === 1}
                      className="p-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      title="Anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                        <button
                          key={pagina}
                          onClick={() => cambiarPagina(pagina)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all shadow-sm ${pagina === state.paginaActual
                            ? 'bg-emerald-600 text-white shadow-emerald-200 transform scale-105'
                            : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                        >
                          {pagina}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => cambiarPagina(state.paginaActual + 1)}
                      disabled={state.paginaActual === totalPaginas}
                      className="p-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      title="Siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Modales */}

      {/* Modal Formulario (Crear/Editar) */}
      {state.showFormularioUsuario && (
        <UsuarioFormModal
          isOpen={state.showFormularioUsuario}
          onClose={() => {
            updateState({
              showFormularioUsuario: false,
              usuarioEditando: null
            });
          }}
          onSuccess={() => {
            cargarUsuarios();
            updateState({
              showFormularioUsuario: false,
              usuarioEditando: null
            });
          }}
          usuarioEdit={state.usuarioEditando}
        />
      )}

      {/* Modal QR Token */}
      {state.showQRModal && state.usuarioQR && (
        <QRTokenModal
          isOpen={state.showQRModal}
          onClose={() => {
            updateState({
              showQRModal: false,
              usuarioQR: null
            });
          }}
          usuario={state.usuarioQR}
        />
      )}

      {/* Modal Borrar */}
      {state.showModalBorrar && (
        <BorrarUserModal
          isOpen={state.showModalBorrar}
          usuario={state.usuarioABorrar}
          onConfirm={confirmarBorrado}
          onCancel={() => {
            updateState({
              showModalBorrar: false,
              usuarioABorrar: null
            });
          }}
        />
      )}
    </div>
  );
};

export default UsuariosPanel;
