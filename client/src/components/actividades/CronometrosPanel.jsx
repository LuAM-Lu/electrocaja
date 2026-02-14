// components/actividades/CronometrosPanel.jsx - PANEL GAMING CON CRONÓMETROS
import React, { useState, useEffect } from 'react';
import Play from 'lucide-react/dist/esm/icons/play'
import Pause from 'lucide-react/dist/esm/icons/pause'
import Square from 'lucide-react/dist/esm/icons/square'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Clock from 'lucide-react/dist/esm/icons/clock'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2'
import Monitor from 'lucide-react/dist/esm/icons/monitor'
import Headphones from 'lucide-react/dist/esm/icons/headphones'
import Zap from 'lucide-react/dist/esm/icons/zap'
import User from 'lucide-react/dist/esm/icons/user'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Settings from 'lucide-react/dist/esm/icons/settings'
import Timer from 'lucide-react/dist/esm/icons/timer'
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import Target from 'lucide-react/dist/esm/icons/target'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import { 
  useActividadesStore, 
  TIPOS_ALQUILER, 
  ESTADOS,
  selectCronometrosActivos,
  selectEstadisticasGaming
} from '../../store/actividadesStore';
import { useInventarioStore } from '../../store/inventarioStore';
import { useCajaStore } from '../../store/cajaStore';
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';

//  ICONOS POR TIPO DE EQUIPO
const getEquipmentIcon = (descripcion) => {
  const desc = descripcion.toLowerCase();
  if (desc.includes('ps4')) return { icon: Gamepad2, color: 'blue', emoji: '' };
  if (desc.includes('ps5')) return { icon: Gamepad2, color: 'purple', emoji: '' };
  if (desc.includes('pc')) return { icon: Monitor, color: 'green', emoji: '' };
  if (desc.includes('vr') || desc.includes('virtual')) return { icon: Headphones, color: 'pink', emoji: '' };
  return { icon: Gamepad2, color: 'gray', emoji: '' };
};

//  FORMATEAR TIEMPO
const formatearTiempo = (milisegundos) => {
  const totalSegundos = Math.floor(milisegundos / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  
  if (horas > 0) {
    return `${horas}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
};

//  CALCULAR COSTO EN TIEMPO REAL
const calcularCostoTiempoReal = (milisegundos, precioPorHora) => {
  const minutos = Math.ceil(milisegundos / 60000);
  const fracciones15 = Math.ceil(minutos / 15);
  const minutosACobrar = fracciones15 * 15;
  const horasACobrar = minutosACobrar / 60;
  return horasACobrar * precioPorHora;
};

//  MODAL NUEVO CRONÓMETRO
const NuevoCronometroModal = ({ isOpen, onClose, onCrear }) => {
  const [formData, setFormData] = useState({
    equipoId: '',
    clienteNombre: '',
    tipoAlquiler: TIPOS_ALQUILER.TIEMPO_ABIERTO,
    duracionMinutos: 60
  });
  const [loading, setLoading] = useState(false);
  
  const { inventario } = useInventarioStore();
  const { obtenerEquiposDisponibles } = useActividadesStore();
  
  const equiposDisponibles = obtenerEquiposDisponibles(inventario);
  const equipoSeleccionado = inventario.find(e => e.id === parseInt(formData.equipoId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.equipoId || !formData.clienteNombre.trim()) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      await onCrear(formData);
      setFormData({
        equipoId: '',
        clienteNombre: '',
        tipoAlquiler: TIPOS_ALQUILER.TIEMPO_ABIERTO,
        duracionMinutos: 60
      });
      onClose();
    } catch (error) {
      toast.error('Error iniciando cronómetro');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <h3 className="text-lg font-bold flex items-center">
              <Play className="h-5 w-5 mr-2" />
              Iniciar Gaming
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
          
          {/* Seleccionar Equipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipo Gaming *
            </label>
            <select
              value={formData.equipoId}
              onChange={(e) => setFormData(prev => ({ ...prev, equipoId: e.target.value }))}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar equipo...</option>
              {equiposDisponibles.map((equipo) => {
                const { icon: Icon, color, emoji } = getEquipmentIcon(equipo.descripcion);
                return (
                  <option key={equipo.id} value={equipo.id}>
                    {emoji} {equipo.descripcion} - ${equipo.precio_venta}/hora
                  </option>
                );
              })}
            </select>
            
            {equiposDisponibles.length === 0 && (
              <p className="text-orange-600 text-sm mt-1 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Todos los equipos están ocupados
              </p>
            )}
          </div>

          {/* Información del equipo seleccionado */}
          {equipoSeleccionado && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                {(() => {
                  const { icon: Icon, color, emoji } = getEquipmentIcon(equipoSeleccionado.descripcion);
                  return (
                    <>
                      <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                        <span className="text-lg">{emoji}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{equipoSeleccionado.descripcion}</div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-green-600">${equipoSeleccionado.precio_venta}</span> por hora
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Nombre del Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Cliente *
            </label>
            <input
              type="text"
              value={formData.clienteNombre}
              onChange={(e) => setFormData(prev => ({ ...prev, clienteNombre: e.target.value }))}
              placeholder="Ej: Juan Pérez"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Tipo de Alquiler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Sesión
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoAlquiler: TIPOS_ALQUILER.TIEMPO_ABIERTO }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_ABIERTO
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <Zap className="h-4 w-4 mx-auto mb-1" />
                <div>Tiempo Abierto</div>
                <div className="text-xs opacity-75">Cliente decide cuándo parar</div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoAlquiler: TIPOS_ALQUILER.TIEMPO_FIJO }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_FIJO
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <Timer className="h-4 w-4 mx-auto mb-1" />
                <div>Tiempo Fijo</div>
                <div className="text-xs opacity-75">Duración específica</div>
              </button>
            </div>
          </div>

          {/* Duración (solo para tiempo fijo) */}
          {formData.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_FIJO && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración
              </label>
              <select
                value={formData.duracionMinutos}
                onChange={(e) => setFormData(prev => ({ ...prev, duracionMinutos: parseInt(e.target.value) }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
                <option value={180}>3 horas</option>
                <option value={240}>4 horas</option>
              </select>
              
              {equipoSeleccionado && (
                <div className="mt-2 text-sm text-gray-600">
                  Costo estimado: <span className="font-medium text-green-600">
                    ${(equipoSeleccionado.precio_venta * (formData.duracionMinutos / 60)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Información</span>
            </div>
            <ul className="text-xs text-yellow-700 mt-1 space-y-1">
              <li>• Se cobra por fracciones de 15 minutos</li>
              <li>• Diferencias ≤5min se redondean a favor del cliente</li>
              <li>• El cronómetro se sincroniza automáticamente</li>
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
              disabled={loading || !formData.equipoId || !formData.clienteNombre.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

//  TARJETA DE CRONÓMETRO ACTIVO
const CronometroCard = ({ cronometro, onPausar, onFinalizar }) => {
  const [tiempoActual, setTiempoActual] = useState(0);
  const { tasaCambio } = useCajaStore();
  
  // Calcular tiempo transcurrido
  useEffect(() => {
    let interval;
    
    if (cronometro.estado === ESTADOS.EN_PROGRESO) {
      interval = setInterval(() => {
        const ahora = Date.now();
        const transcurrido = cronometro.tiempoTranscurrido + (ahora - cronometro.tiempoInicio);
        setTiempoActual(transcurrido);
      }, 1000);
    } else {
      setTiempoActual(cronometro.tiempoTranscurrido);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cronometro]);

  const { icon: Icon, color, emoji } = getEquipmentIcon(cronometro.equipoNombre);
  const costoActual = calcularCostoTiempoReal(tiempoActual, cronometro.equipoPrecio);
  const costoEnBs = costoActual * tasaCambio;
  
  // Alerta de tiempo para sesiones fijas
  const minutosTranscurridos = Math.ceil(tiempoActual / 60000);
  const esTiempoFijo = cronometro.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_FIJO;
  const minutosRestantes = esTiempoFijo ? (cronometro.duracionMinutos - minutosTranscurridos) : null;
  const alertaTiempo = esTiempoFijo && minutosRestantes <= 5 && minutosRestantes > 0;
  const tiempoAgotado = esTiempoFijo && minutosRestantes <= 0;

  return (
    <div className={`bg-white rounded-xl border-2 p-4 shadow-lg transition-all duration-300 hover:shadow-xl ${
      cronometro.estado === ESTADOS.PAUSADO ? 'border-yellow-300 bg-yellow-50' :
      alertaTiempo ? 'border-orange-300 bg-orange-50 animate-pulse' :
      tiempoAgotado ? 'border-red-300 bg-red-50' :
      'border-green-300 bg-green-50'
    }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center`}>
            <span className="text-2xl">{emoji}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{cronometro.equipoNombre}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-3 w-3" />
              <span>{cronometro.clienteNombre}</span>
            </div>
          </div>
        </div>
        
        {/* Badge de estado */}
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          cronometro.estado === ESTADOS.EN_PROGRESO ? 'bg-green-100 text-green-700' :
          cronometro.estado === ESTADOS.PAUSADO ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {cronometro.estado === ESTADOS.EN_PROGRESO ? ' EN VIVO' :
           cronometro.estado === ESTADOS.PAUSADO ? ' PAUSADO' : ' DETENIDO'}
        </div>
      </div>

      {/* Tiempo y Costo */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center space-x-2 text-gray-600 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Tiempo</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatearTiempo(tiempoActual)}
          </div>
          {esTiempoFijo && (
            <div className={`text-sm font-medium ${
              alertaTiempo ? 'text-orange-600' :
              tiempoAgotado ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {tiempoAgotado ? ' TIEMPO AGOTADO' :
               alertaTiempo ? ` ${minutosRestantes} min restantes` :
               `${minutosRestantes} min restantes`}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center space-x-2 text-gray-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Costo</span>
          </div>
          <div className="text-xl font-bold text-green-600">
            ${costoActual.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            {costoEnBs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} Bs
          </div>
        </div>
      </div>

      {/* Información del tipo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {cronometro.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_ABIERTO ? (
            <>
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-600 font-medium">Tiempo Abierto</span>
            </>
          ) : (
            <>
              <Timer className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-purple-600 font-medium">
                Sesión de {cronometro.duracionMinutos} min
              </span>
            </>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          ${cronometro.equipoPrecio}/hora
        </div>
      </div>

      {/* Controles */}
      <div className="flex space-x-2">
        <button
          onClick={() => onPausar(cronometro.equipoId)}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-colors ${
            cronometro.estado === ESTADOS.PAUSADO
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          }`}
        >
          {cronometro.estado === ESTADOS.PAUSADO ? (
            <>
              <Play className="h-4 w-4" />
              <span>Reanudar</span>
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" />
              <span>Pausar</span>
            </>
          )}
        </button>
        
        <button
          onClick={() => onFinalizar(cronometro.equipoId)}
          className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <Square className="h-4 w-4" />
          <span>Finalizar</span>
        </button>
      </div>
    </div>
  );
};

//  COMPONENTE PRINCIPAL
const CronometrosPanel = () => {
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [vistaActual, setVistaActual] = useState('activos'); // 'activos', 'historial'
  
  const {
    iniciarCronometro,
    pausarCronometro,
    finalizarCronometro,
    obtenerCronometros
  } = useActividadesStore();
  
  const cronometrosActivos = useActividadesStore(selectCronometrosActivos);
  const estadisticas = useActividadesStore(selectEstadisticasGaming);
  const { inventario } = useInventarioStore();
  const { usuario, tienePermiso } = useAuthStore();

  // Obtener equipos disponibles
  const equiposGaming = inventario.filter(item => 
    item.categoria === 'Gaming' && 
    item.tipo === 'servicio' && 
    item.activo
  );

  const equiposDisponibles = equiposGaming.filter(equipo => 
    !cronometrosActivos.some(cron => cron.equipoId === equipo.id)
  );

  // Historial de cronómetros
  const historialCronometros = obtenerCronometros()
    .filter(c => c.estado === ESTADOS.COMPLETADO)
    .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
    .slice(0, 10);

  // Manejar creación de cronómetro
  const handleCrearCronometro = async (datos) => {
    try {
      await iniciarCronometro(datos, inventario);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="h-full flex flex-col">
      
      {/* Header del Panel */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Gamepad2 className="h-6 w-6 mr-3 text-blue-600" />
              Gaming Center
            </h2>
            <p className="text-gray-600 mt-1">
              Gestión de cronómetros PS4/PS5/PC/VR en tiempo real
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Botones de vista */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVistaActual('activos')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  vistaActual === 'activos' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Activos ({cronometrosActivos.length})
              </button>
              <button
                onClick={() => setVistaActual('historial')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  vistaActual === 'historial' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Historial
              </button>
            </div>
            
            {/* Botón nuevo cronómetro */}
            {tienePermiso('REALIZAR_VENTAS') && (
              <button
                onClick={() => setShowNuevoModal(true)}
                disabled={equiposDisponibles.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Iniciar Gaming</span>
              </button>
            )}
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Activos</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {cronometrosActivos.length}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Disponibles</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              {equiposDisponibles.length}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Hoy</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              ${estadisticas.ingresoTotal.toFixed(0)}
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Sesiones</span>
            </div>
            <div className="text-2xl font-bold text-orange-700">
              {estadisticas.totalSesiones}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto p-6">
        
        {vistaActual === 'activos' ? (
          /* Vista de cronómetros activos */
          cronometrosActivos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {cronometrosActivos.map((cronometro) => (
                <CronometroCard
                  key={cronometro.equipoId}
                  cronometro={cronometro}
                  onPausar={pausarCronometro}
                  onFinalizar={finalizarCronometro}
                />
              ))}
            </div>
          ) : (
            /* Estado vacío */
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay sesiones Gaming activas
              </h3>
              <p className="text-gray-500 text-center mb-4">
                Inicia una nueva sesión de PS4, PS5, PC o Realidad Virtual
              </p>
              
              {equiposDisponibles.length > 0 ? (
                <button
                  onClick={() => setShowNuevoModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Play className="h-5 w-5" />
                  <span>Iniciar Primera Sesión</span>
               </button>
             ) : (
               <div className="text-center">
                 <p className="text-orange-600 font-medium mb-2">
                    Todos los equipos están ocupados
                 </p>
                 <p className="text-sm text-gray-500">
                   Espera a que termine alguna sesión para iniciar una nueva
                 </p>
               </div>
             )}
           </div>
         )
       ) : (
         /* Vista de historial */
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-lg font-semibold text-gray-900">
               Historial de Sesiones (Últimas 10)
             </h3>
             <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
               Ver todas
             </button>
           </div>

           {historialCronometros.length > 0 ? (
             <div className="bg-white rounded-lg border overflow-hidden">
               <table className="w-full">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Equipo</th>
                     <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cliente</th>
                     <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Tiempo</th>
                     <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Costo</th>
                     <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Fecha</th>
                     <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Tipo</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {historialCronometros.map((cronometro) => {
                     const { emoji } = getEquipmentIcon(cronometro.equipoNombre);
                     const fecha = new Date(cronometro.resumenSesion?.fechaFinalizacion || cronometro.fechaCreacion);
                     
                     return (
                       <tr key={cronometro.id} className="hover:bg-gray-50">
                         <td className="px-4 py-3">
                           <div className="flex items-center space-x-2">
                             <span className="text-lg">{emoji}</span>
                             <div>
                               <div className="font-medium text-gray-900">
                                 {cronometro.equipoNombre.replace(' - ALQUILER POR HORA', '')}
                               </div>
                               <div className="text-sm text-gray-500">
                                 ${cronometro.equipoPrecio}/hora
                               </div>
                             </div>
                           </div>
                         </td>
                         
                         <td className="px-4 py-3">
                           <div className="flex items-center space-x-2">
                             <User className="h-4 w-4 text-gray-400" />
                             <span className="text-gray-900">{cronometro.clienteNombre}</span>
                           </div>
                         </td>
                         
                         <td className="px-4 py-3 text-center">
                           <div className="font-mono text-sm">
                             {cronometro.resumenSesion?.minutosJugados 
                               ? `${cronometro.resumenSesion.minutosJugados} min`
                               : formatearTiempo(cronometro.tiempoTranscurrido || 0)
                             }
                           </div>
                         </td>
                         
                         <td className="px-4 py-3 text-center">
                           <div className="font-medium text-green-600">
                             ${cronometro.resumenSesion?.costoTotal?.toFixed(2) || '0.00'}
                           </div>
                         </td>
                         
                         <td className="px-4 py-3 text-center">
                           <div className="text-sm text-gray-600">
                             {fecha.toLocaleDateString('es-VE')}
                           </div>
                           <div className="text-xs text-gray-500">
                             {fecha.toLocaleTimeString('es-VE', { 
                               hour: '2-digit', 
                               minute: '2-digit' 
                             })}
                           </div>
                         </td>
                         
                         <td className="px-4 py-3 text-center">
                           <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                             cronometro.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_ABIERTO
                               ? 'bg-blue-100 text-blue-700'
                               : 'bg-purple-100 text-purple-700'
                           }`}>
                             {cronometro.tipoAlquiler === TIPOS_ALQUILER.TIEMPO_ABIERTO ? (
                               <>
                                 <Zap className="h-3 w-3 mr-1" />
                                 Abierto
                               </>
                             ) : (
                               <>
                                 <Timer className="h-3 w-3 mr-1" />
                                 Fijo
                               </>
                             )}
                           </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           ) : (
             <div className="text-center py-8">
               <div className="text-4xl mb-4"></div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">
                 Sin historial de sesiones
               </h3>
               <p className="text-gray-500">
                 Las sesiones completadas aparecerán aquí
               </p>
             </div>
           )}
         </div>
       )}
     </div>

     {/* Información de equipos disponibles (sidebar flotante) */}
     {equiposGaming.length > 0 && (
       <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4">
         <div className="flex items-center justify-between">
           <h4 className="font-medium text-gray-900">Estado de Equipos Gaming</h4>
           <span className="text-sm text-gray-500">
             {equiposDisponibles.length}/{equiposGaming.length} disponibles
           </span>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
           {equiposGaming.map((equipo) => {
             const { emoji, color } = getEquipmentIcon(equipo.descripcion);
             const estaOcupado = cronometrosActivos.some(cron => cron.equipoId === equipo.id);
             const cronometroActivo = cronometrosActivos.find(cron => cron.equipoId === equipo.id);
             
             return (
               <div
                 key={equipo.id}
                 className={`p-3 rounded-lg border transition-all ${
                   estaOcupado 
                     ? 'bg-red-50 border-red-200' 
                     : 'bg-green-50 border-green-200'
                 }`}
               >
                 <div className="flex items-center space-x-2">
                   <span className="text-lg">{emoji}</span>
                   <div className="flex-1 min-w-0">
                     <div className="text-sm font-medium text-gray-900 truncate">
                       {equipo.descripcion.replace(' - ALQUILER POR HORA', '')}
                     </div>
                     <div className="text-xs text-gray-500">
                       ${equipo.precio_venta}/h
                     </div>
                   </div>
                 </div>
                 
                 <div className="mt-2">
                   {estaOcupado ? (
                     <div className="flex items-center space-x-1">
                       <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                       <span className="text-xs text-red-600 font-medium">
                         {cronometroActivo?.clienteNombre}
                       </span>
                     </div>
                   ) : (
                     <div className="flex items-center space-x-1">
                       <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                       <span className="text-xs text-green-600 font-medium">
                         Disponible
                       </span>
                     </div>
                   )}
                 </div>
               </div>
             );
           })}
         </div>
       </div>
     )}

     {/* Modal Nuevo Cronómetro */}
     <NuevoCronometroModal
       isOpen={showNuevoModal}
       onClose={() => setShowNuevoModal(false)}
       onCrear={handleCrearCronometro}
     />
   </div>
 );
};

export default CronometrosPanel;