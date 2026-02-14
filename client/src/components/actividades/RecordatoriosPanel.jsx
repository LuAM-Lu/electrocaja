// components/actividades/RecordatoriosPanel.jsx - PANEL DE RECORDATORIOS CON @MENCIONES
import React, { useState, useEffect, useRef } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import User from 'lucide-react/dist/esm/icons/user'
import Users from 'lucide-react/dist/esm/icons/users'
import Clock from 'lucide-react/dist/esm/icons/clock'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Search from 'lucide-react/dist/esm/icons/search'
import Filter from 'lucide-react/dist/esm/icons/filter'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square'
import Bell from 'lucide-react/dist/esm/icons/bell'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical'
import X from 'lucide-react/dist/esm/icons/x'
import Send from 'lucide-react/dist/esm/icons/send'
import AtSign from 'lucide-react/dist/esm/icons/at-sign'
import Flag from 'lucide-react/dist/esm/icons/flag'
import Target from 'lucide-react/dist/esm/icons/target'
import Zap from 'lucide-react/dist/esm/icons/zap'
import Archive from 'lucide-react/dist/esm/icons/archive'
import { 
  useActividadesStore, 
  PRIORIDADES, 
  ESTADOS,
  selectRecordatorios
} from '../../store/actividadesStore';
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';

//  OBTENER COLOR POR PRIORIDAD
const getPrioridadColor = (prioridad) => {
  switch(prioridad) {
    case PRIORIDADES.ALTA.valor:
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        dot: 'bg-red-500'
      };
    case PRIORIDADES.MEDIA.valor:
      return {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-700',
        dot: 'bg-yellow-500'
      };
    case PRIORIDADES.BAJA.valor:
      return {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
        dot: 'bg-green-500'
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-700',
        dot: 'bg-gray-500'
      };
  }
};

//  OBTENER COLOR POR ESTADO
const getEstadoColor = (estado) => {
  switch(estado) {
    case ESTADOS.PENDIENTE:
      return { bg: 'bg-blue-100', text: 'text-blue-700', emoji: '' };
    case ESTADOS.EN_PROGRESO:
      return { bg: 'bg-purple-100', text: 'text-purple-700', emoji: '' };
    case ESTADOS.COMPLETADO:
      return { bg: 'bg-green-100', text: 'text-green-700', emoji: '' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', emoji: '' };
  }
};

//  COMPONENTE DE BÚSQUEDA Y FILTROS
const FiltrosRecordatorios = ({ filtros, onFiltrosChange, usuarios = [] }) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={filtros.busqueda}
          onChange={(e) => onFiltrosChange({ ...filtros, busqueda: e.target.value })}
          placeholder="Buscar recordatorios..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Filtros avanzados */}
      {mostrarFiltros && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Filtro por prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={filtros.prioridad}
                onChange={(e) => onFiltrosChange({ ...filtros, prioridad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              >
                <option value="">Todas</option>
                <option value={PRIORIDADES.ALTA.valor}> Alta</option>
                <option value={PRIORIDADES.MEDIA.valor}> Media</option>
                <option value={PRIORIDADES.BAJA.valor}> Baja</option>
              </select>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filtros.estado}
                onChange={(e) => onFiltrosChange({ ...filtros, estado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              >
                <option value="">Todos</option>
                <option value={ESTADOS.PENDIENTE}> Pendiente</option>
                <option value={ESTADOS.EN_PROGRESO}> En Progreso</option>
                <option value={ESTADOS.COMPLETADO}> Completado</option>
              </select>
            </div>

            {/* Filtro por asignado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asignado a
              </label>
              <select
                value={filtros.asignadoA}
                onChange={(e) => onFiltrosChange({ ...filtros, asignadoA: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              >
                <option value="">Todos</option>
                {usuarios.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimiento
              </label>
              <select
                value={filtros.fechaVencimiento}
                onChange={(e) => onFiltrosChange({ ...filtros, fechaVencimiento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              >
                <option value="">Todas</option>
                <option value="hoy">Hoy</option>
                <option value="esta_semana">Esta semana</option>
                <option value="vencidos">Vencidos</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

//  MODAL NUEVO RECORDATORIO
const NuevoRecordatorioModal = ({ isOpen, onClose, onCrear }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: PRIORIDADES.MEDIA.valor,
    fechaVencimiento: '',
    horaVencimiento: '',
    asignadoA: [],
    mencionarUsuarios: []
  });
  const [loading, setLoading] = useState(false);
  const [showMenciones, setShowMenciones] = useState(false);
  const [textareaRef] = useState(useRef(null));
  
  // Simulación de usuarios disponibles (en producción viene de API)
  const usuariosDisponibles = [
    { id: 1, nombre: 'Juan Admin', rol: 'admin' },
    { id: 2, nombre: 'María Supervisor', rol: 'supervisor' },
    { id: 3, nombre: 'Carlos Cajero', rol: 'cajero' },
    { id: 4, nombre: 'Ana Viewer', rol: 'viewer' }
  ];

  // Detectar @menciones en el texto
  const procesarMenciones = (texto) => {
    const menciones = texto.match(/@\w+/g) || [];
    const usuariosMencionados = menciones.map(mencion => {
      const nombreUsuario = mencion.replace('@', '');
      return usuariosDisponibles.find(u => 
        u.nombre.toLowerCase().includes(nombreUsuario.toLowerCase())
      );
    }).filter(Boolean);
    
    setFormData(prev => ({ 
      ...prev, 
      mencionarUsuarios: usuariosMencionados.map(u => u.id)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.fechaVencimiento) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const fechaCompleta = new Date(`${formData.fechaVencimiento}T${formData.horaVencimiento || '12:00'}`);
      
      await onCrear({
        ...formData,
        fechaVencimiento: fechaCompleta.toISOString(),
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim()
      });
      
      // Limpiar formulario
      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: PRIORIDADES.MEDIA.valor,
        fechaVencimiento: '',
        horaVencimiento: '',
        asignadoA: [],
        mencionarUsuarios: []
      });
      
      onClose();
    } catch (error) {
      toast.error('Error creando recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const insertarMencion = (usuario) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const texto = formData.descripcion;
    const nuevoTexto = texto.slice(0, cursorPos) + `@${usuario.nombre} ` + texto.slice(cursorPos);
    
    setFormData(prev => ({ ...prev, descripcion: nuevoTexto }));
    procesarMenciones(nuevoTexto);
    setShowMenciones(false);
    
    // Restablecer foco
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos + usuario.nombre.length + 2, cursorPos + usuario.nombre.length + 2);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <h3 className="text-lg font-bold flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Nuevo Recordatorio
            </h3>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título del Recordatorio *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ej: Hacer inventario mensual"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              autoFocus
            />
          </div>

          {/* Descripción con @menciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={formData.descripcion}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, descripcion: e.target.value }));
                  procesarMenciones(e.target.value);
                }}
                placeholder="Describe el recordatorio... Usa @nombre para mencionar usuarios"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
              
              {/* Botón de menciones */}
              <button
                type="button"
                onClick={() => setShowMenciones(!showMenciones)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                title="Mencionar usuarios"
              >
                <AtSign className="h-4 w-4" />
              </button>
            </div>
            
            {/* Panel de menciones */}
            {showMenciones && (
              <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-2">Mencionar usuario:</div>
                <div className="flex flex-wrap gap-2">
                  {usuariosDisponibles.map(usuario => (
                    <button
                      key={usuario.id}
                      type="button"
                      onClick={() => insertarMencion(usuario)}
                      className="flex items-center space-x-1 px-2 py-1 bg-white border border-gray-200 rounded-md hover:bg-emerald-50 hover:border-emerald-300 text-sm transition-colors"
                    >
                      <User className="h-3 w-3" />
                      <span>{usuario.nombre}</span>
                      <span className="text-xs text-gray-500">({usuario.rol})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Usuarios mencionados */}
            {formData.mencionarUsuarios.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">Usuarios mencionados:</div>
                <div className="flex flex-wrap gap-1">
                  {formData.mencionarUsuarios.map(userId => {
                    const usuario = usuariosDisponibles.find(u => u.id === userId);
                    return usuario ? (
                      <span key={userId} className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                        @{usuario.nombre}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prioridad y Fecha en grid */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={formData.prioridad}
                onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value={PRIORIDADES.BAJA.valor}> Baja</option>
                <option value={PRIORIDADES.MEDIA.valor}> Media</option>
                <option value={PRIORIDADES.ALTA.valor}> Alta</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora
              </label>
              <input
                type="time"
                value={formData.horaVencimiento}
                onChange={(e) => setFormData(prev => ({ ...prev, horaVencimiento: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Asignar a usuarios */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar a
            </label>
            <div className="space-y-2">
              {usuariosDisponibles.map(usuario => (
                <label key={usuario.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.asignadoA.includes(usuario.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ 
                          ...prev, 
                          asignadoA: [...prev.asignadoA, usuario.id] 
                        }));
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          asignadoA: prev.asignadoA.filter(id => id !== usuario.id) 
                        }));
                      }
                    }}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{usuario.nombre}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {usuario.rol}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-blue-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Información</span>
            </div>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• Los usuarios mencionados recibirán notificaciones</li>
              <li>• Los asignados pueden marcar como completado</li>
              <li>• Se enviará recordatorio en la fecha/hora indicada</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.titulo.trim() || !formData.fechaVencimiento}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Crear Recordatorio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

//  TARJETA DE RECORDATORIO
const RecordatorioCard = ({ recordatorio, onEstadoChange, onEliminar, canEdit }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { usuario } = useAuthStore();
  
  const prioridadColors = getPrioridadColor(recordatorio.prioridad);
  const estadoColors = getEstadoColor(recordatorio.estado);
  
  const fechaVencimiento = new Date(recordatorio.fechaVencimiento);
  const ahora = new Date();
  const esVencido = fechaVencimiento < ahora && recordatorio.estado === ESTADOS.PENDIENTE;
  const esHoy = fechaVencimiento.toDateString() === ahora.toDateString();
  
  // Verificar si el usuario actual puede marcar como completado
  const puedeCompletar = recordatorio.asignadoA?.includes(usuario?.id) || 
                        recordatorio.creadoPor === usuario?.id ||
                        canEdit;

  const handleCambiarEstado = (nuevoEstado) => {
    onEstadoChange(recordatorio.id, nuevoEstado);
    setShowMenu(false);
  };

  return (
    <div className={`bg-white rounded-lg border-2 p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
      esVencido ? 'border-red-300 bg-red-50' : prioridadColors.bg
    }`}>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          {/* Indicador de prioridad */}
          <div className={`w-3 h-3 rounded-full mt-1 ${prioridadColors.dot} ${
            recordatorio.prioridad === PRIORIDADES.ALTA.valor ? 'animate-pulse' : ''
          }`}></div>
          
          <div className="flex-1">
            <h3 className={`font-semibold text-gray-900 ${
              recordatorio.estado === ESTADOS.COMPLETADO ? 'line-through text-gray-500' : ''
            }`}>
              {recordatorio.titulo}
            </h3>
            
            {/* Badges de estado y prioridad */}
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors.bg} ${estadoColors.text}`}>
                {estadoColors.emoji} {recordatorio.estado}
              </span>
              
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${prioridadColors.badge}`}>
                {PRIORIDADES[recordatorio.prioridad.toUpperCase()]?.emoji} {recordatorio.prioridad}
              </span>
              
              {esVencido && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
                   VENCIDO
                </span>
              )}
              
              {esHoy && !esVencido && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                   HOY
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Menú de acciones */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                {puedeCompletar && recordatorio.estado !== ESTADOS.COMPLETADO && (
                  <button
                    onClick={() => handleCambiarEstado(ESTADOS.COMPLETADO)}
                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Marcar como completado</span>
                  </button>
                )}
                
                {recordatorio.estado === ESTADOS.PENDIENTE && puedeCompletar && (
                  <button
                    onClick={() => handleCambiarEstado(ESTADOS.EN_PROGRESO)}
                    className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center space-x-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Marcar en progreso</span>
                  </button>
                )}
                
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // TODO: Implementar edición
                      toast.info('Función de edición próximamente');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
                
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEliminar(recordatorio.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Descripción */}
      {recordatorio.descripcion && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {recordatorio.descripcion.split(' ').map((palabra, index) => {
              if (palabra.startsWith('@')) {
                return (
                  <span key={index} className="bg-emerald-100 text-emerald-700 px-1 rounded font-medium">
                    {palabra}
                  </span>
                );
              }
              return palabra + ' ';
            })}
          </p>
        </div>
      )}

      {/* Fecha y hora */}
      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4" />
          <span>{fechaVencimiento.toLocaleDateString('es-VE')}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>{fechaVencimiento.toLocaleTimeString('es-VE', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</span>
        </div>
      </div>

      {/* Asignados y creador */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {recordatorio.asignadoA?.length > 0 && (
            <div className="flex items-center space-x-1">
             <Users className="h-3 w-3" />
             <span>Asignado a {recordatorio.asignadoA.length} usuario{recordatorio.asignadoA.length !== 1 ? 's' : ''}</span>
           </div>
         )}
       </div>
       
       <div className="flex items-center space-x-1">
         <User className="h-3 w-3" />
         <span>Por {recordatorio.creadoPor}</span>
       </div>
     </div>
   </div>
 );
};

//  COMPONENTE PRINCIPAL
const RecordatoriosPanel = () => {
 const [showNuevoModal, setShowNuevoModal] = useState(false);
 const [filtros, setFiltros] = useState({
   busqueda: '',
   prioridad: '',
   estado: '',
   asignadoA: '',
   fechaVencimiento: ''
 });
 const [vistaActual, setVistaActual] = useState('todos'); // 'todos', 'mis_tareas', 'vencidos'
 
 const {
   crearRecordatorio,
   eliminarActividad,
   obtenerRecordatorios,
   obtenerActividadesVencidas
 } = useActividadesStore();
 
 const { usuario, tienePermiso } = useAuthStore();
 
 // Obtener recordatorios y aplicar filtros
 const recordatorios = obtenerRecordatorios();
 const recordatoriosVencidos = obtenerActividadesVencidas().filter(act => act.tipo === 'recordatorio');
 
 const recordatoriosFiltrados = recordatorios.filter(recordatorio => {
   // Filtro por búsqueda
   if (filtros.busqueda && !recordatorio.titulo.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
       !recordatorio.descripcion?.toLowerCase().includes(filtros.busqueda.toLowerCase())) {
     return false;
   }
   
   // Filtro por prioridad
   if (filtros.prioridad && recordatorio.prioridad !== filtros.prioridad) {
     return false;
   }
   
   // Filtro por estado
   if (filtros.estado && recordatorio.estado !== filtros.estado) {
     return false;
   }
   
   // Filtro por asignado
   if (filtros.asignadoA && !recordatorio.asignadoA?.includes(parseInt(filtros.asignadoA))) {
     return false;
   }
   
   // Filtro por fecha de vencimiento
   if (filtros.fechaVencimiento) {
     const fechaVenc = new Date(recordatorio.fechaVencimiento);
     const hoy = new Date();
     
     switch (filtros.fechaVencimiento) {
       case 'hoy':
         if (fechaVenc.toDateString() !== hoy.toDateString()) return false;
         break;
       case 'esta_semana':
         const inicioSemana = new Date(hoy);
         inicioSemana.setDate(hoy.getDate() - hoy.getDay());
         const finSemana = new Date(inicioSemana);
         finSemana.setDate(inicioSemana.getDate() + 6);
         if (fechaVenc < inicioSemana || fechaVenc > finSemana) return false;
         break;
       case 'vencidos':
         if (fechaVenc >= hoy || recordatorio.estado === ESTADOS.COMPLETADO) return false;
         break;
     }
   }
   
   // Filtros por vista
   switch (vistaActual) {
     case 'mis_tareas':
       return recordatorio.asignadoA?.includes(usuario?.id) || recordatorio.creadoPor === usuario?.id;
     case 'vencidos':
       const fechaVenc = new Date(recordatorio.fechaVencimiento);
       return fechaVenc < new Date() && recordatorio.estado === ESTADOS.PENDIENTE;
     default:
       return true;
   }
 });

 // Ordenar por prioridad y fecha
 const recordatoriosOrdenados = [...recordatoriosFiltrados].sort((a, b) => {
   // Primero por estado (pendientes primero)
   if (a.estado !== b.estado) {
     const ordenEstados = { [ESTADOS.PENDIENTE]: 0, [ESTADOS.EN_PROGRESO]: 1, [ESTADOS.COMPLETADO]: 2 };
     return ordenEstados[a.estado] - ordenEstados[b.estado];
   }
   
   // Luego por prioridad
   const ordenPrioridades = { [PRIORIDADES.ALTA.valor]: 0, [PRIORIDADES.MEDIA.valor]: 1, [PRIORIDADES.BAJA.valor]: 2 };
   if (a.prioridad !== b.prioridad) {
     return ordenPrioridades[a.prioridad] - ordenPrioridades[b.prioridad];
   }
   
   // Finalmente por fecha (más próximos primero)
   return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento);
 });

 // Manejar creación de recordatorio
 const handleCrearRecordatorio = async (datos) => {
   try {
     await crearRecordatorio(datos);
   } catch (error) {
     throw error;
   }
 };

 // Manejar cambio de estado
 const handleEstadoChange = async (recordatorioId, nuevoEstado) => {
   try {
     // TODO: Implementar actualización de estado en el store
     toast.success(`Estado actualizado a: ${nuevoEstado}`);
   } catch (error) {
     toast.error('Error actualizando estado');
   }
 };

 // Estadísticas rápidas
 const estadisticas = {
   total: recordatorios.length,
   pendientes: recordatorios.filter(r => r.estado === ESTADOS.PENDIENTE).length,
   enProgreso: recordatorios.filter(r => r.estado === ESTADOS.EN_PROGRESO).length,
   completados: recordatorios.filter(r => r.estado === ESTADOS.COMPLETADO).length,
   vencidos: recordatoriosVencidos.length,
   misTareas: recordatorios.filter(r => r.asignadoA?.includes(usuario?.id) || r.creadoPor === usuario?.id).length
 };

 return (
   <div className="h-full flex flex-col">
     
     {/* Header del Panel */}
     <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-xl font-bold text-gray-900 flex items-center">
             <Bell className="h-6 w-6 mr-3 text-emerald-600" />
             Recordatorios y Tareas
           </h2>
           <p className="text-gray-600 mt-1">
             Gestión de recordatorios con @menciones entre usuarios
           </p>
         </div>
         
         <div className="flex items-center space-x-3">
           {/* Botones de vista rápida */}
           <div className="flex bg-gray-100 rounded-lg p-1">
             <button
               onClick={() => setVistaActual('todos')}
               className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                 vistaActual === 'todos' 
                   ? 'bg-white text-emerald-600 shadow-sm' 
                   : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               Todos ({estadisticas.total})
             </button>
             <button
               onClick={() => setVistaActual('mis_tareas')}
               className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                 vistaActual === 'mis_tareas' 
                   ? 'bg-white text-emerald-600 shadow-sm' 
                   : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               Mis Tareas ({estadisticas.misTareas})
             </button>
             <button
               onClick={() => setVistaActual('vencidos')}
               className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                 vistaActual === 'vencidos' 
                   ? 'bg-white text-red-600 shadow-sm' 
                   : estadisticas.vencidos > 0 ? 'text-red-600 hover:text-red-700' : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               Vencidos ({estadisticas.vencidos})
             </button>
           </div>
           
           {/* Botón nuevo recordatorio */}
           {tienePermiso('REALIZAR_VENTAS') && (
             <button
               onClick={() => setShowNuevoModal(true)}
               className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
             >
               <Plus className="h-4 w-4" />
               <span>Nuevo Recordatorio</span>
             </button>
           )}
         </div>
       </div>

       {/* Estadísticas rápidas */}
       <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
         <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
           <div className="flex items-center space-x-2">
             <Clock className="h-4 w-4 text-blue-600" />
             <span className="text-sm font-medium text-blue-800">Pendientes</span>
           </div>
           <div className="text-2xl font-bold text-blue-700">
             {estadisticas.pendientes}
           </div>
         </div>
         
         <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
           <div className="flex items-center space-x-2">
             <Zap className="h-4 w-4 text-purple-600" />
             <span className="text-sm font-medium text-purple-800">En Progreso</span>
           </div>
           <div className="text-2xl font-bold text-purple-700">
             {estadisticas.enProgreso}
           </div>
         </div>
         
         <div className="bg-green-50 rounded-lg p-3 border border-green-200">
           <div className="flex items-center space-x-2">
             <CheckCircle className="h-4 w-4 text-green-600" />
             <span className="text-sm font-medium text-green-800">Completados</span>
           </div>
           <div className="text-2xl font-bold text-green-700">
             {estadisticas.completados}
           </div>
         </div>
         
         <div className="bg-red-50 rounded-lg p-3 border border-red-200">
           <div className="flex items-center space-x-2">
             <AlertTriangle className="h-4 w-4 text-red-600" />
             <span className="text-sm font-medium text-red-800">Vencidos</span>
           </div>
           <div className="text-2xl font-bold text-red-700">
             {estadisticas.vencidos}
           </div>
         </div>
         
         <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
           <div className="flex items-center space-x-2">
             <Target className="h-4 w-4 text-orange-600" />
             <span className="text-sm font-medium text-orange-800">Mis Tareas</span>
           </div>
           <div className="text-2xl font-bold text-orange-700">
             {estadisticas.misTareas}
           </div>
         </div>
       </div>
     </div>

     {/* Filtros */}
     <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
       <FiltrosRecordatorios 
         filtros={filtros} 
         onFiltrosChange={setFiltros}
         usuarios={[
           { id: 1, nombre: 'Juan Admin' },
           { id: 2, nombre: 'María Supervisor' },
           { id: 3, nombre: 'Carlos Cajero' },
           { id: 4, nombre: 'Ana Viewer' }
         ]}
       />
     </div>

     {/* Lista de Recordatorios */}
     <div className="flex-1 overflow-auto p-6">
       {recordatoriosOrdenados.length > 0 ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
           {recordatoriosOrdenados.map((recordatorio) => (
             <RecordatorioCard
               key={recordatorio.id}
               recordatorio={recordatorio}
               onEstadoChange={handleEstadoChange}
               onEliminar={eliminarActividad}
               canEdit={tienePermiso('REALIZAR_VENTAS')}
             />
           ))}
         </div>
       ) : (
         /* Estado vacío */
         <div className="flex flex-col items-center justify-center h-64">
           <div className="text-6xl mb-4">
             {vistaActual === 'vencidos' ? '' : 
              vistaActual === 'mis_tareas' ? '' : ''}
           </div>
           <h3 className="text-xl font-semibold text-gray-900 mb-2">
             {vistaActual === 'vencidos' ? 'No hay recordatorios vencidos' :
              vistaActual === 'mis_tareas' ? 'No tienes tareas asignadas' :
              filtros.busqueda ? 'No se encontraron recordatorios' : 'No hay recordatorios'}
           </h3>
           <p className="text-gray-500 text-center mb-4">
             {vistaActual === 'vencidos' ? '¡Excelente! Estás al día con tus recordatorios' :
              vistaActual === 'mis_tareas' ? 'Puedes crear nuevos recordatorios o esperar asignaciones' :
              filtros.busqueda ? 'Intenta ajustar los filtros de búsqueda' : 
              'Crea tu primer recordatorio para mantener al equipo organizado'}
           </p>
           
           {(!filtros.busqueda && vistaActual === 'todos') && (
             <button
               onClick={() => setShowNuevoModal(true)}
               className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
             >
               <Plus className="h-5 w-5" />
               <span>Crear Primer Recordatorio</span>
             </button>
           )}
         </div>
       )}
     </div>

     {/* Modal Nuevo Recordatorio */}
     <NuevoRecordatorioModal
       isOpen={showNuevoModal}
       onClose={() => setShowNuevoModal(false)}
       onCrear={handleCrearRecordatorio}
     />
   </div>
 );
};

export default RecordatoriosPanel;