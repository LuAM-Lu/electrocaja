// components/configuracion/UsuariosPanel.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, ChevronDown, ChevronUp, UserPlus, UserX, Shield, Crown, RefreshCw, UserCheck,
  Monitor, Activity, Globe, Trash2, X, AlertCircle, Eye
} from 'lucide-react';
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';
import CrearUsuarioModal from './modals/CrearUsuarioModal';
import BorrarUserModal from './modals/BorrarUserModal';

const UsuariosPanel = ({ usuario }) => {
  const [sesionesAbiertas, setSesionesAbiertas] = useState(true);
  const [usuariosAbiertas, setUsuariosAbiertas] = useState(true);
  const [sesionesActivas, setSesionesActivas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuarioABorrar, setUsuarioABorrar] = useState(null);
  const [showModalBorrar, setShowModalBorrar] = useState(false);
  const [showCrearUsuario, setShowCrearUsuario] = useState(false);

  
  // Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 5;

  useEffect(() => {
    cargarSesionesActivas();
    cargarUsuarios();
    
    const interval = setInterval(() => {
      cargarSesionesActivas();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const cargarSesionesActivas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions/debug');
      const { data } = response.data;
      
      const sesiones = data.sesiones_socket?.map(s => ({ 
        ...s, 
        tipo: 'Socket.IO', 
        ip: s.ip_cliente,
        estado: 'Tiempo Real'
      })) || [];
      
      setSesionesActivas(sesiones);
    } catch (error) {
      console.error('Error cargando sesiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      setLoadingUsuarios(true);
      console.log(' Cargando usuarios del backend...');
      
      const response = await api.get('/users');
      const { data } = response.data;
      console.log(' Usuarios cargados del backend:', data);
      setUsuarios(data);
      setPaginaActual(1);
    } catch (error) {
      console.error(' Error cargando usuarios:', error);
      setUsuarios([
        { 
          id: 1, 
          nombre: 'Admin ElectroCaja', 
          email: 'admin@electrocaja.com', 
          rol: 'admin', 
          activo: true, 
          createdAt: new Date().toISOString(),
          sucursal: 'Principal',
          turno: 'MATUTINO'
        }
      ]);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Lógica de paginación
  const indiceInicio = (paginaActual - 1) * usuariosPorPagina;
  const indiceFin = indiceInicio + usuariosPorPagina;
  const usuariosPaginados = usuarios.slice(indiceInicio, indiceFin);
  const totalPaginas = Math.ceil(usuarios.length / usuariosPorPagina);

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  const desactivarUsuario = async (user) => {
    if (user.rol === 'admin' && user.id === 1) {
      toast.error('No se puede desactivar al administrador principal');
      return;
    }

    if (user.email === usuario?.email) {
      toast.error('No puedes desactivarte a ti mismo');
      return;
    }

    try {
      const response = await api.put(`/users/${user.id}`, {
        activo: !user.activo
      });

      toast.success(`Usuario ${user.activo ? 'desactivado' : 'activado'} exitosamente`);
      cargarUsuarios();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cambiar estado del usuario');
    }
  };

  const borrarUsuario = (user) => {
    if (user.rol === 'admin' && user.id === 1) {
      toast.error('No se puede borrar al administrador principal');
      return;
    }

    if (user.email === usuario?.email) {
      toast.error('No puedes borrarte a ti mismo');
      return;
    }

    setUsuarioABorrar(user);
    setShowModalBorrar(true);
  };

  const confirmarBorrado = async () => {
    if (!usuarioABorrar) return;

    try {
      const response = await api.delete(`/users/${usuarioABorrar.id}`);
      toast.success(`Usuario ${usuarioABorrar.nombre} borrado exitosamente`);
      cargarUsuarios();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al borrar usuario');
    } finally {
      setShowModalBorrar(false);
      setUsuarioABorrar(null);
    }
  };

const resetearPassword = async (user) => {
  try {
    // 1. Resetear password en backend
    const response = await api.post(`/users/${user.id}/reset-password`);
    const { nuevaPassword, usuario_nombre } = response.data.data;
    
    // 2. Intentar enviar a WhatsApp del admin
    try {
      await api.post('/whatsapp/enviar', {
        numero: '+584120552931',
        mensaje: ` *RESET PASSWORD - ELECTRO CAJA*

 *Usuario:* ${usuario_nombre}
 *Email:* ${user.email}
 *Nueva contraseña:* ${nuevaPassword}
 *Fecha:* ${new Date().toLocaleString('es-VE')}

 *IMPORTANTE:*
- Entregar esta contraseña al usuario
- Solicitar cambio inmediato en primer login
- Esta contraseña es temporal

 Generado por: ${usuario?.nombre}`
      });
      
      toast.success(`Nueva contraseña: ${nuevaPassword} (Enviada por WhatsApp)`, {
        duration: 10000
      });
    } catch (whatsappError) {
      console.warn('WhatsApp no disponible:', whatsappError);
      toast.success(`Nueva contraseña generada: ${nuevaPassword}`, {
        duration: 10000,
        style: {
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          color: '#92400E'
        }
      });
    }
    
  } catch (error) {
    console.error('Error reseteando password:', error);
    toast.error('Error al resetear contraseña del usuario');
  }
};

  const kickearUsuario = async (sesion) => {
    if (sesion.email === usuario?.email) {
      toast.error('No puedes desconectar tu propia sesión');
      return;
    }

    if (sesion.rol === 'admin') {
      toast.error('No se puede desconectar al administrador');
      return;
    }

    try {
      const response = await api.post('/auth/force-logout', {
        target_email: sesion.email,
        reason: 'Desconectado por administrador desde panel de control'
      });

      toast.success(`${sesion.nombre || sesion.usuario} desconectado exitosamente`, {
        id: `user-disconnect-${sesion.id}`
      });
    } catch (error) {
      toast.error('Error al desconectar usuario');
    }
  };

  const calcularTiempo = (timestamp) => {
    const diferencia = Date.now() - new Date(timestamp).getTime();
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    return horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
  };

  const getRoleIcon = (rol) => {
    const icons = {
      admin: <Crown className="h-3 w-3" />,
      supervisor: <Shield className="h-3 w-3" />,
      cajero: <UserCheck className="h-3 w-3" />,
      viewer: <Eye className="h-3 w-3" />
    };
    return icons[rol] || <UserCheck className="h-3 w-3" />;
  };

  const getRoleColor = (rol) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      supervisor: 'bg-blue-100 text-blue-800 border-blue-200',
      cajero: 'bg-green-100 text-green-800 border-green-200',
      viewer: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[rol] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Resumen del Sistema */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center text-base">
          <Activity className="h-4 w-4 mr-2 text-blue-600" />
          Estado del Sistema
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Monitor className="h-3 w-3 text-blue-600" />
              <span className="font-medium text-blue-900 text-xs">Sesiones</span>
            </div>
            <div className="text-xl font-bold text-blue-800">{sesionesActivas.length}</div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-green-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="h-3 w-3 text-green-600" />
              <span className="font-medium text-green-900 text-xs">Activos</span>
            </div>
            <div className="text-xl font-bold text-green-800">{usuarios.filter(u => u.activo).length}</div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Shield className="h-3 w-3 text-purple-600" />
              <span className="font-medium text-purple-900 text-xs">Admins</span>
            </div>
            <div className="text-xl font-bold text-purple-800">{usuarios.filter(u => u.rol === 'admin').length}</div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-orange-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Globe className="h-3 w-3 text-orange-600" />
              <span className="font-medium text-orange-900 text-xs">Total</span>
            </div>
            <div className="text-xl font-bold text-orange-800">{usuarios.length}</div>
          </div>
        </div>
      </div>

      {/* Sesiones Activas */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setSesionesAbiertas(!sesionesAbiertas)}
          className="w-full px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Monitor className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-blue-900 text-sm">Sesiones Activas</h3>
              <p className="text-xs text-blue-700">
                {sesionesActivas.length} activa{sesionesActivas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
            {sesionesAbiertas ? (
              <ChevronUp className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            )}
          </div>
        </button>

        {sesionesAbiertas && (
          <div className="p-4">
            {sesionesActivas.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Monitor className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-sm">No hay sesiones activas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sesionesActivas.map((sesion, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          {(sesion.usuario || sesion.nombre)?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {sesion.usuario || sesion.nombre}
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full font-medium border ${getRoleColor(sesion.rol)}`}>
                            {getRoleIcon(sesion.rol)}
                            <span>{sesion.rol?.toUpperCase()}</span>
                          </span>
                          <span className="text-gray-500">{calcularTiempo(sesion.timestamp_conexion || sesion.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {sesion.email !== usuario?.email && sesion.rol !== 'admin' ? (
                      <button
                        onClick={() => kickearUsuario(sesion)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium flex items-center space-x-1"
                      >
                        <UserX className="h-3 w-3" />
                        <span>Kick</span>
                      </button>
                    ) : (
                      <div className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">
                        {sesion.email === usuario?.email ? 'Tú' : 'Admin'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabla de Usuarios con Paginación */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setUsuariosAbiertas(!usuariosAbiertas)}
          className="w-full px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-green-900 text-sm">Gestión de Usuarios</h3>
              <p className="text-xs text-green-700">
                {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} • Página {paginaActual} de {totalPaginas}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCrearUsuario(true);
              }}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center space-x-1"
            >
              <UserPlus className="h-3 w-3" />
              <span>Crear</span>
            </button>
            {usuariosAbiertas ? (
              <ChevronUp className="h-4 w-4 text-green-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-green-600" />
            )}
          </div>
        </button>

        {usuariosAbiertas && (
          <div>
            {loadingUsuarios ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">Cargando usuarios...</p>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-sm">No hay usuarios registrados</p>
              </div>
            ) : (
              <>
                {/* Tabla Compacta */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center">
                    <thead className="bg-gray-50 text-center">
                      <tr>
                        <th className="px-3 py-2  font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usuariosPaginados.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                                user.activo 
                                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
                              }`}>
                                {user.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-xs flex items-center space-x-1">
                                  <span>{user.nombre}</span>
                                  {user.rol === 'admin' && user.id === 1 && (
                                    <Crown className="h-3 w-3 text-yellow-500" />
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
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                              user.activo 
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
        {/* Ver Password */}
        {/* Resetear Password */}
            <button
            onClick={() => resetearPassword(user)}
            className="w-7 h-7 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors flex items-center justify-center"
            title="Resetear contraseña"
            >
            <RefreshCw className="h-3 w-3" />
            </button>
        
        {/* Activar/Desactivar */}
        <button
          onClick={() => desactivarUsuario(user)}
          className={`w-7 h-7 rounded-full transition-colors flex items-center justify-center ${
            user.activo 
              ? 'bg-orange-100 hover:bg-orange-200 text-orange-600' 
              : 'bg-green-100 hover:bg-green-200 text-green-600'
          }`}
          title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
        >
          {user.activo ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
        </button>
        
        {/* Borrar */}
        <button
          onClick={() => borrarUsuario(user)}
          className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors flex items-center justify-center"
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

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-xs text-gray-700">
                      Mostrando {indiceInicio + 1} a {Math.min(indiceFin, usuarios.length)} de {usuarios.length} usuarios
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => cambiarPagina(paginaActual - 1)}
                        disabled={paginaActual === 1}
                        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                          <button
                            key={pagina}
                            onClick={() => cambiarPagina(pagina)}
                            className={`px-2 py-1 text-xs rounded ${
                              pagina === paginaActual
                                ? 'bg-green-600 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pagina}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => cambiarPagina(paginaActual + 1)}
                        disabled={paginaActual === totalPaginas}
                        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {showCrearUsuario && (
        <CrearUsuarioModal 
          isOpen={showCrearUsuario} 
          onClose={() => setShowCrearUsuario(false)}
          onUserCreated={(nuevoUsuario) => {
            console.log('Usuario creado:', nuevoUsuario);
            cargarUsuarios();
          }}
        />
      )}

      {showModalBorrar && (
        <BorrarUserModal
          isOpen={showModalBorrar}
          usuario={usuarioABorrar}
          onConfirm={confirmarBorrado}
          onCancel={() => {
            setShowModalBorrar(false);
            setUsuarioABorrar(null);
          }}
        />
      )}

    
    </div>
  );
};

export default UsuariosPanel;