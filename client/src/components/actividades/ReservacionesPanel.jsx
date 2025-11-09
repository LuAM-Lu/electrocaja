// components/actividades/ReservacionesPanel.jsx - PANEL DE RESERVACIONES CON CALENDARIO
import React, { useState, useEffect } from 'react';
import {
  Plus, Calendar, MapPin, User, Phone, DollarSign,
  Clock, PartyPopper, Gift, ChevronLeft, ChevronRight,
  Eye, Edit3, Trash2, CheckCircle, AlertTriangle,
  CreditCard, CalendarDays, Users, Star, Package,
  X, MoreVertical, Search, Filter
} from 'lucide-react';
import { 
  useActividadesStore, 
  TIPOS_RESERVACION, 
  ESTADOS,
  selectReservaciones
} from '../../store/actividadesStore';
import { useCajaStore } from '../../store/cajaStore';
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';

//  UTILIDADES DE FECHA
const obtenerDiasDelMes = (fecha) => {
  const año = fecha.getFullYear();
  const mes = fecha.getMonth();
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const diasAnterior = new Date(año, mes, 0).getDate();
  
  const dias = [];
  
  // Días del mes anterior para completar la primera semana
  const diaSemanaInicio = primerDia.getDay();
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    dias.push({
      fecha: new Date(año, mes - 1, diasAnterior - i),
      esDelMes: false,
      esHoy: false
    });
  }
  
  // Días del mes actual
  const hoy = new Date();
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const fechaDia = new Date(año, mes, dia);
    dias.push({
      fecha: fechaDia,
      esDelMes: true,
      esHoy: fechaDia.toDateString() === hoy.toDateString()
    });
  }
  
  // Días del mes siguiente para completar la última semana
  const totalDias = dias.length;
  const diasRestantes = 42 - totalDias; // 6 semanas × 7 días
  for (let dia = 1; dia <= diasRestantes; dia++) {
    dias.push({
      fecha: new Date(año, mes + 1, dia),
      esDelMes: false,
      esHoy: false
    });
  }
  
  return dias;
};

const formatearFecha = (fecha) => {
  return fecha.toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

//  OBTENER COLOR POR TIPO DE RESERVACIÓN
const getTipoColor = (tipo) => {
  switch(tipo) {
    case TIPOS_RESERVACION.CUMPLEANOS.valor:
      return {
        bg: 'bg-pink-50 border-pink-200',
        text: 'text-pink-700',
        badge: 'bg-pink-100 text-pink-700',
        button: 'bg-pink-600 hover:bg-pink-700',
        emoji: TIPOS_RESERVACION.CUMPLEANOS.emoji
      };
    case TIPOS_RESERVACION.EVENTO.valor:
      return {
        bg: 'bg-purple-50 border-purple-200',
        text: 'text-purple-700',
        badge: 'bg-purple-100 text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700',
        emoji: TIPOS_RESERVACION.EVENTO.emoji
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-700',
        button: 'bg-gray-600 hover:bg-gray-700',
        emoji: ''
      };
  }
};

//  MODAL NUEVA RESERVACIÓN
const NuevaReservacionModal = ({ isOpen, onClose, onCrear, fechaSeleccionada = null }) => {
  const [formData, setFormData] = useState({
    tipoReservacion: TIPOS_RESERVACION.CUMPLEANOS.valor,
    titulo: '',
    clienteNombre: '',
    clienteTelefono: '',
    fechaEvento: fechaSeleccionada ? fechaSeleccionada.toISOString().split('T')[0] : '',
    horaEvento: '15:00',
    duracionHoras: 3,
    precioTotal: 150,
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const { tasaCambio } = useCajaStore();

  // Actualizar fecha cuando se selecciona una fecha del calendario
  useEffect(() => {
    if (fechaSeleccionada && isOpen) {
      setFormData(prev => ({
        ...prev,
        fechaEvento: fechaSeleccionada.toISOString().split('T')[0]
      }));
    }
  }, [fechaSeleccionada, isOpen]);

  // Precios base por tipo
  const preciosBase = {
    [TIPOS_RESERVACION.CUMPLEANOS.valor]: 150,
    [TIPOS_RESERVACION.EVENTO.valor]: 200
  };

  // Actualizar precio cuando cambia el tipo o duración
  useEffect(() => {
    const precioBase = preciosBase[formData.tipoReservacion] || 150;
    const precioCalculado = precioBase + (formData.duracionHoras - 3) * 30;
    setFormData(prev => ({ ...prev, precioTotal: Math.max(precioCalculado, precioBase) }));
  }, [formData.tipoReservacion, formData.duracionHoras]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.clienteNombre.trim() || !formData.fechaEvento) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    // Validar fecha futura
    const fechaEvento = new Date(`${formData.fechaEvento}T${formData.horaEvento}`);
    if (fechaEvento <= new Date()) {
      toast.error('La fecha del evento debe ser futura');
      return;
    }

    setLoading(true);
    try {
      await onCrear({
        ...formData,
        fechaEvento: fechaEvento.toISOString(),
        titulo: formData.titulo.trim(),
        clienteNombre: formData.clienteNombre.trim(),
        clienteTelefono: formData.clienteTelefono.trim(),
        observaciones: formData.observaciones.trim()
      });
      
      // Limpiar formulario
      setFormData({
        tipoReservacion: TIPOS_RESERVACION.CUMPLEANOS.valor,
        titulo: '',
        clienteNombre: '',
        clienteTelefono: '',
        fechaEvento: '',
        horaEvento: '15:00',
        duracionHoras: 3,
        precioTotal: 150,
        observaciones: ''
      });
      
      onClose();
    } catch (error) {
      toast.error('Error creando reservación');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tipoColors = getTipoColor(formData.tipoReservacion);
  const anticipo = formData.precioTotal * 0.5;
  const precioEnBs = formData.precioTotal * tasaCambio;
  const anticipoEnBs = anticipo * tasaCambio;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className={`bg-gradient-to-r ${tipoColors.button} px-6 py-4 rounded-t-xl`}>
          <div className="flex items-center justify-between text-white">
            <h3 className="text-lg font-bold flex items-center">
              <span className="text-2xl mr-3">{tipoColors.emoji}</span>
              Nueva Reservación
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Tipo de Reservación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Evento
            </label>
            <div className="grid grid-cols-2 gap-4">
              {Object.values(TIPOS_RESERVACION).map((tipo) => {
                const isSelected = formData.tipoReservacion === tipo.valor;
                const colors = getTipoColor(tipo.valor);
                
                return (
                  <button
                    key={tipo.valor}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipoReservacion: tipo.valor }))}
                    className={`p-4 rounded-lg border-2 text-center transition-all transform hover:scale-105 ${
                      isSelected 
                        ? `${colors.bg} border-current ${colors.text}` 
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{tipo.emoji}</div>
                    <div className="font-semibold">{tipo.nombre}</div>
                    <div className="text-xs mt-1 opacity-75">
                      Desde ${preciosBase[tipo.valor]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Información del Evento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del Evento *
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder={`Ej: ${formData.tipoReservacion === TIPOS_RESERVACION.CUMPLEANOS.valor ? 'Cumpleaños de María (15 años)' : 'Fiesta de Graduación'}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={formData.clienteNombre}
                onChange={(e) => setFormData(prev => ({ ...prev, clienteNombre: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                value={formData.clienteTelefono}
                onChange={(e) => {
                  let valor = e.target.value.replace(/[^0-9]/g, '');
                  if (valor && !valor.startsWith('0')) {
                    valor = '0' + valor;
                  }
                  valor = valor.substring(0, 11);
                  setFormData(prev => ({ ...prev, clienteTelefono: valor }));
                }}
                placeholder="04141234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del Evento *
              </label>
              <input
                type="date"
                value={formData.fechaEvento}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaEvento: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de Inicio
              </label>
              <select
                value={formData.horaEvento}
                onChange={(e) => setFormData(prev => ({ ...prev, horaEvento: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="12:00">12:00 PM</option>
                <option value="13:00">1:00 PM</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="16:00">4:00 PM</option>
                <option value="17:00">5:00 PM</option>
                <option value="18:00">6:00 PM</option>
                <option value="19:00">7:00 PM</option>
                <option value="20:00">8:00 PM</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración (horas)
              </label>
              <select
                value={formData.duracionHoras}
                onChange={(e) => setFormData(prev => ({ ...prev, duracionHoras: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value={2}>2 horas</option>
                <option value={3}>3 horas</option>
                <option value={4}>4 horas</option>
                <option value={5}>5 horas</option>
                <option value={6}>6 horas</option>
                <option value={8}>8 horas</option>
              </select>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones y Requerimientos Especiales
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              placeholder="Ej: Decoración temática de princesas, pastel personalizado, 20 invitados..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
          </div>

          {/* Resumen de Costos */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Resumen de Costos
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Precio base ({formData.tipoReservacion}):</span>
                <span className="font-medium">${preciosBase[formData.tipoReservacion]}</span>
              </div>
              
              {formData.duracionHoras > 3 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Horas adicionales ({formData.duracionHoras - 3}h × $30):</span>
                  <span className="font-medium">${(formData.duracionHoras - 3) * 30}</span>
                </div>
              )}
              
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total USD:</span>
                <span className="font-bold text-green-600">${formData.precioTotal}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total Bs:</span>
                <span className="font-bold text-green-600">
                  {precioEnBs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} Bs
                </span>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                <div className="flex items-center space-x-2 text-orange-800 mb-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">Anticipo Requerido (50%)</span>
                </div>
                <div className="text-orange-700">
                  <div className="font-bold">${anticipo.toFixed(2)} USD</div>
                  <div className="text-sm">
                    {anticipoEnBs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} Bs
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información Importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-blue-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Información Importante</span>
            </div>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• Se requiere anticipo del 50% para confirmar la reservación</li>
              <li>• El saldo restante se paga el día del evento</li>
              <li>• Incluye uso del espacio y servicios básicos</li>
              <li>• Decoración y catering son servicios adicionales</li>
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
              disabled={loading || !formData.titulo.trim() || !formData.clienteNombre.trim() || !formData.fechaEvento}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2 ${tipoColors.button}`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <PartyPopper className="h-4 w-4" />
                  <span>Crear Reservación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

//  COMPONENTE CALENDARIO
const CalendarioView = ({ fechaActual, onFechaChange, reservaciones, onFechaSeleccionada }) => {
  const dias = obtenerDiasDelMes(fechaActual);
  const nombreMes = fechaActual.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
  
  // Agrupar reservaciones por fecha
  const reservacionesPorFecha = reservaciones.reduce((acc, reservacion) => {
    const fecha = new Date(reservacion.fechaEvento).toDateString();
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(reservacion);
    return acc;
  }, {});

  const navegarMes = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(fechaActual.getMonth() + direccion);
    onFechaChange(nuevaFecha);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      
      {/* Header del calendario */}
      <div className="bg-purple-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes(-1)}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <h3 className="text-lg font-semibold capitalize">
            {nombreMes}
          </h3>
          
          <button
            onClick={() => navegarMes(1)}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
          <div key={dia} className="px-2 py-3 text-center text-sm font-medium text-gray-600">
            {dia}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7">
        {dias.map((dia, index) => {
          const reservacionesDia = reservacionesPorFecha[dia.fecha.toDateString()] || [];
          const tieneReservaciones = reservacionesDia.length > 0;
          const esHoy = dia.esHoy;
          const esPasado = dia.fecha < new Date() && !esHoy;
          
          return (
            <button
              key={index}
              onClick={() => !esPasado && onFechaSeleccionada && onFechaSeleccionada(dia.fecha)}
              disabled={esPasado}
              className={`h-20 p-1 border-b border-r border-gray-100 text-left transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                !dia.esDelMes ? 'bg-gray-50 text-gray-400' : 'bg-white'
              } ${esHoy ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              <div className={`text-sm font-medium ${
                esHoy ? 'text-blue-600' : dia.esDelMes ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {dia.fecha.getDate()}
              </div>
              
              {/* Indicadores de reservaciones */}
              {tieneReservaciones && (
                <div className="mt-1 space-y-1">
                  {reservacionesDia.slice(0, 2).map((reservacion, idx) => {
                    const colors = getTipoColor(reservacion.tipoReservacion);
                    return (
                      <div
                        key={idx}
                        className={`text-xs px-1 py-0.5 rounded truncate ${colors.badge}`}
                        title={reservacion.titulo}
                      >
                        {colors.emoji} {reservacion.clienteNombre}
                      </div>
                    );
                  })}
                  
                  {reservacionesDia.length > 2 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{reservacionesDia.length - 2} más
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

//  TARJETA DE RESERVACIÓN
const ReservacionCard = ({ reservacion, onEstadoChange, onEliminar, canEdit }) => {
  const [showDetalles, setShowDetalles] = useState(false);
  const { tasaCambio } = useCajaStore();
  
  const tipoColors = getTipoColor(reservacion.tipoReservacion);
  const fechaEvento = new Date(reservacion.fechaEvento);
  const ahora = new Date();
  const esHoy = fechaEvento.toDateString() === ahora.toDateString();
  const esPasado = fechaEvento < ahora;
  const esMañana = new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toDateString() === fechaEvento.toDateString();
  
  const anticipoRequerido = reservacion.anticipo || (reservacion.precioTotal * 0.5);
  const saldoPendiente = reservacion.precioTotal - anticipoRequerido;

  return (
    <div className={`bg-white rounded-lg border-2 p-4 shadow-sm transition-all duration-200 hover:shadow-md ${tipoColors.bg}`}>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-3xl">{tipoColors.emoji}</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{reservacion.titulo}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700 font-medium">{reservacion.clienteNombre}</span>
              {reservacion.clienteTelefono && (
                <>
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{reservacion.clienteTelefono}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Badges de estado */}
        <div className="space-y-1">
          {esHoy && (
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold animate-pulse">
               HOY
            </span>
          )}
          {esMañana && (
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
               MAÑANA
            </span>
          )}
          {esPasado && !esHoy && (
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
               REALIZADO
            </span>
          )}
        </div>
      </div>

      {/* Información del evento */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatearFecha(fechaEvento)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {fechaEvento.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })} 
              ({reservacion.duracionHoras}h)
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              ${reservacion.precioTotal}
            </div>
            <div className="text-sm text-gray-500">
              {(reservacion.precioTotal * tasaCambio).toLocaleString('es-ES', { minimumFractionDigits: 2 })} Bs
            </div>
          </div>
          
          <div className="text-right text-xs text-text-gray-500">
           Anticipo: ${anticipoRequerido.toFixed(2)} | Saldo: ${saldoPendiente.toFixed(2)}
         </div>
       </div>
     </div>

     {/* Observaciones (si existen) */}
     {reservacion.observaciones && (
       <div className="bg-gray-50 rounded-lg p-3 mb-3">
         <h4 className="text-sm font-medium text-gray-700 mb-1">Observaciones:</h4>
         <p className="text-sm text-gray-600">{reservacion.observaciones}</p>
       </div>
     )}

     {/* Acciones */}
     <div className="flex items-center justify-between pt-3 border-t border-gray-200">
       <button
         onClick={() => setShowDetalles(!showDetalles)}
         className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
       >
         <Eye className="h-4 w-4" />
         <span>{showDetalles ? 'Ocultar' : 'Ver'} detalles</span>
       </button>
       
       {canEdit && (
         <div className="flex items-center space-x-2">
           <button
             onClick={() => onEstadoChange && onEstadoChange(reservacion.id, 
               reservacion.estado === ESTADOS.COMPLETADO ? ESTADOS.PENDIENTE : ESTADOS.COMPLETADO
             )}
             className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
               reservacion.estado === ESTADOS.COMPLETADO
                 ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                 : 'bg-green-100 text-green-700 hover:bg-green-200'
             }`}
           >
             <CheckCircle className="h-4 w-4" />
             <span>{reservacion.estado === ESTADOS.COMPLETADO ? 'Pendiente' : 'Completar'}</span>
           </button>
           
           <button
             onClick={() => onEliminar && onEliminar(reservacion.id)}
             className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
           >
             <Trash2 className="h-4 w-4" />
             <span>Eliminar</span>
           </button>
         </div>
       )}
     </div>

     {/* Detalles expandidos */}
     {showDetalles && (
       <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
         <div className="grid grid-cols-2 gap-4 text-sm">
           <div>
             <span className="font-medium text-gray-700">Tipo:</span>
             <div className="flex items-center space-x-2 mt-1">
               <span className="text-xl">{tipoColors.emoji}</span>
               <span>{TIPOS_RESERVACION[reservacion.tipoReservacion.toUpperCase()]?.nombre}</span>
             </div>
           </div>
           
           <div>
             <span className="font-medium text-gray-700">Duración:</span>
             <p className="text-gray-600 mt-1">{reservacion.duracionHoras} horas</p>
           </div>
           
           <div>
             <span className="font-medium text-gray-700">Estado de Pago:</span>
             <div className="mt-1">
               {anticipoRequerido > 0 ? (
                 <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    Anticipo recibido
                 </span>
               ) : (
                 <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                    Anticipo pendiente
                 </span>
               )}
             </div>
           </div>
           
           <div>
             <span className="font-medium text-gray-700">Creado:</span>
             <p className="text-gray-600 mt-1">
               {new Date(reservacion.fechaCreacion).toLocaleDateString('es-VE')}
             </p>
           </div>
         </div>
         
         {/* Desglose de pagos */}
         <div className="bg-green-50 rounded-lg p-3">
           <h5 className="font-medium text-green-800 mb-2"> Desglose de Pagos</h5>
           <div className="space-y-1 text-sm">
             <div className="flex justify-between">
               <span className="text-green-700">Anticipo (50%):</span>
               <span className="font-medium">${anticipoRequerido.toFixed(2)}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-green-700">Saldo restante:</span>
               <span className="font-medium">${saldoPendiente.toFixed(2)}</span>
             </div>
             <div className="border-t border-green-200 pt-1 flex justify-between">
               <span className="font-semibold text-green-800">Total:</span>
               <span className="font-bold text-green-800">${reservacion.precioTotal}</span>
             </div>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

//  VISTA DE LISTA DE RESERVACIONES
const ListaReservaciones = ({ reservaciones, onEstadoChange, onEliminar, canEdit }) => {
 const [filtroEstado, setFiltroEstado] = useState('todas');
 const [ordenPor, setOrdenPor] = useState('fecha');
 
 // Filtrar y ordenar reservaciones
 const reservacionesFiltradas = reservaciones
   .filter(reservacion => {
     if (filtroEstado === 'todas') return true;
     if (filtroEstado === 'hoy') {
       const hoy = new Date().toDateString();
       return new Date(reservacion.fechaEvento).toDateString() === hoy;
     }
     if (filtroEstado === 'proximas') {
       const ahora = new Date();
       return new Date(reservacion.fechaEvento) > ahora;
     }
     if (filtroEstado === 'pasadas') {
       const ahora = new Date();
       return new Date(reservacion.fechaEvento) < ahora;
     }
     return reservacion.estado === filtroEstado;
   })
   .sort((a, b) => {
     if (ordenPor === 'fecha') {
       return new Date(a.fechaEvento) - new Date(b.fechaEvento);
     }
     if (ordenPor === 'precio') {
       return b.precioTotal - a.precioTotal;
     }
     if (ordenPor === 'cliente') {
       return a.clienteNombre.localeCompare(b.clienteNombre);
     }
     return 0;
   });

 return (
   <div className="space-y-4">
     {/* Filtros */}
     <div className="flex items-center justify-between">
       <div className="flex items-center space-x-4">
         <select
           value={filtroEstado}
           onChange={(e) => setFiltroEstado(e.target.value)}
           className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
         >
           <option value="todas"> Todas las reservas</option>
           <option value="hoy"> Hoy</option>
           <option value="proximas"> Próximas</option>
           <option value="pasadas"> Pasadas</option>
           <option value={ESTADOS.PENDIENTE}> Pendientes</option>
           <option value={ESTADOS.COMPLETADO}> Completadas</option>
         </select>
         
         <select
           value={ordenPor}
           onChange={(e) => setOrdenPor(e.target.value)}
           className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
         >
           <option value="fecha"> Por fecha</option>
           <option value="precio"> Por precio</option>
           <option value="cliente"> Por cliente</option>
         </select>
       </div>
       
       <div className="text-sm text-gray-600">
         {reservacionesFiltradas.length} reservacion{reservacionesFiltradas.length !== 1 ? 'es' : ''}
       </div>
     </div>

     {/* Lista de reservaciones */}
     <div className="space-y-4">
       {reservacionesFiltradas.length === 0 ? (
         <div className="text-center py-12">
           <PartyPopper className="h-16 w-16 text-gray-300 mx-auto mb-4" />
           <h3 className="text-lg font-medium text-gray-900 mb-2">
             {filtroEstado === 'todas' ? 'No hay reservaciones' : 
              filtroEstado === 'hoy' ? 'No hay eventos hoy' :
              filtroEstado === 'proximas' ? 'No hay eventos próximos' :
              'No hay reservaciones en esta categoría'}
           </h3>
           <p className="text-gray-500">
             {filtroEstado === 'todas' ? 'Crea tu primera reservación para eventos especiales' :
              'Intenta cambiar los filtros para ver otras reservaciones'}
           </p>
         </div>
       ) : (
         reservacionesFiltradas.map(reservacion => (
           <ReservacionCard
             key={reservacion.id}
             reservacion={reservacion}
             onEstadoChange={onEstadoChange}
             onEliminar={onEliminar}
             canEdit={canEdit}
           />
         ))
       )}
     </div>
   </div>
 );
};

//  COMPONENTE PRINCIPAL
const ReservacionesPanel = () => {
 const [showNuevaModal, setShowNuevaModal] = useState(false);
 const [vistaActual, setVistaActual] = useState('calendario'); // 'calendario' | 'lista'
 const [fechaCalendario, setFechaCalendario] = useState(new Date());
 const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
 
 const {
   crearReservacion,
   eliminarActividad,
   obtenerReservaciones,
   actualizarEstadoActividad
 } = useActividadesStore();
 
 const { usuario, tienePermiso } = useAuthStore();
 
 // Obtener reservaciones
 const reservaciones = obtenerReservaciones();
 
 // Manejadores
 const handleCrearReservacion = async (datosReservacion) => {
   try {
     await crearReservacion(datosReservacion);
     toast.success('Reservación creada exitosamente');
   } catch (error) {
     throw error;
   }
 };

 const handleEstadoChange = async (id, nuevoEstado) => {
   try {
     await actualizarEstadoActividad(id, nuevoEstado);
     toast.success(`Estado actualizado a ${nuevoEstado}`);
   } catch (error) {
     toast.error('Error actualizando estado');
   }
 };

 const handleEliminar = async (id) => {
   if (window.confirm('¿Estás seguro de eliminar esta reservación?')) {
     try {
       await eliminarActividad(id);
       toast.success('Reservación eliminada');
     } catch (error) {
       toast.error('Error eliminando reservación');
     }
   }
 };

 const handleFechaSeleccionada = (fecha) => {
   // Solo permitir fechas futuras
   if (fecha >= new Date().setHours(0, 0, 0, 0)) {
     setFechaSeleccionada(fecha);
     setShowNuevaModal(true);
   } else {
     toast.error('Solo puedes crear reservaciones para fechas futuras');
   }
 };

 const canEdit = tienePermiso && tienePermiso('admin', 'gerente');

 return (
   <div className="h-full flex flex-col space-y-6">
     
     {/* Header */}
     <div className="flex items-center justify-between">
       <div>
         <h2 className="text-xl font-bold text-gray-900 flex items-center">
           <Calendar className="h-6 w-6 mr-3 text-purple-600" />
           Reservaciones de Eventos
         </h2>
         <p className="text-gray-600 mt-1">
           Gestiona cumpleaños y eventos especiales
         </p>
       </div>
       
       <div className="flex items-center space-x-3">
         {/* Switcher de vista */}
         <div className="flex bg-gray-100 rounded-lg p-1">
           <button
             onClick={() => setVistaActual('calendario')}
             className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
               vistaActual === 'calendario'
                 ? 'bg-white text-purple-700 shadow-sm'
                 : 'text-gray-600 hover:text-purple-700'
             }`}
           >
              Calendario
           </button>
           <button
             onClick={() => setVistaActual('lista')}
             className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
               vistaActual === 'lista'
                 ? 'bg-white text-purple-700 shadow-sm'
                 : 'text-gray-600 hover:text-purple-700'
             }`}
           >
              Lista
           </button>
         </div>
         
         {/* Botón nueva reservación */}
         <button
           onClick={() => setShowNuevaModal(true)}
           className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
         >
           <Plus className="h-4 w-4" />
           <span>Nueva Reservación</span>
         </button>
       </div>
     </div>

     {/* Contenido principal */}
     <div className="flex-1 overflow-hidden">
       {vistaActual === 'calendario' ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
           {/* Calendario */}
           <div className="h-full">
             <CalendarioView
               fechaActual={fechaCalendario}
               onFechaChange={setFechaCalendario}
               reservaciones={reservaciones}
               onFechaSeleccionada={handleFechaSeleccionada}
             />
           </div>
           
           {/* Lista de próximas reservaciones */}
           <div className="h-full overflow-y-auto">
             <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
               <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                 <Clock className="h-4 w-4 mr-2 text-purple-600" />
                 Próximas Reservaciones
               </h3>
               
               <div className="space-y-3">
                 {reservaciones
                   .filter(res => new Date(res.fechaEvento) >= new Date())
                   .sort((a, b) => new Date(a.fechaEvento) - new Date(b.fechaEvento))
                   .slice(0, 5)
                   .map(reservacion => (
                     <ReservacionCard
                       key={reservacion.id}
                       reservacion={reservacion}
                       onEstadoChange={handleEstadoChange}
                       onEliminar={handleEliminar}
                       canEdit={canEdit}
                     />
                   ))
                 }
                 
                 {reservaciones.filter(res => new Date(res.fechaEvento) >= new Date()).length === 0 && (
                   <div className="text-center py-8">
                     <PartyPopper className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                     <p className="text-gray-500">No hay eventos próximos</p>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       ) : (
         <ListaReservaciones
           reservaciones={reservaciones}
           onEstadoChange={handleEstadoChange}
           onEliminar={handleEliminar}
           canEdit={canEdit}
         />
       )}
     </div>

     {/* Modal Nueva Reservación */}
     <NuevaReservacionModal
       isOpen={showNuevaModal}
       onClose={() => {
         setShowNuevaModal(false);
         setFechaSeleccionada(null);
       }}
       onCrear={handleCrearReservacion}
       fechaSeleccionada={fechaSeleccionada}
     />
   </div>
 );
};

export default ReservacionesPanel;