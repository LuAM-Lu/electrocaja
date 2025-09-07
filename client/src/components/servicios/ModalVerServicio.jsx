// components/servicios/ModalVerServicio.jsx - VERSIÓN OPTIMIZADA CON MEJORAS ESPECÍFICAS
import React, { useState, useEffect } from 'react';
import {
  X, Flag, Inbox, Stethoscope, Clock, Wrench, CheckCircle, PackageCheck,
  User, CalendarDays, DollarSign, StickyNote, ShoppingCart, AlertTriangle, 
  Printer, MessageCircle, Camera, Truck, Phone, Mail, MapPin, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const estadoConfig = {
  'Recibido': { color: 'bg-gradient-to-r from-purple-400 to-purple-600', headerColor: 'bg-gradient-to-r from-purple-800 to-purple-900', textColor: 'text-gray-100', icon: <Inbox size={14} />, progreso: 20 },
  'En Diagnóstico': { color: 'bg-gradient-to-r from-amber-700 to-yellow-800', headerColor: 'bg-gradient-to-r from-amber-800 to-yellow-900', textColor: 'text-amber-100', icon: <Stethoscope size={14} />, progreso: 40 },
  'Esperando Aprobación': { color: 'bg-gradient-to-r from-orange-700 to-red-800', headerColor: 'bg-gradient-to-r from-orange-800 to-red-900', textColor: 'text-orange-100', icon: <Clock size={14} />, progreso: 60 },
  'En Reparación': { color: 'bg-gradient-to-r from-red-800 to-red-900', headerColor: 'bg-gradient-to-r from-red-900 to-red-950', textColor: 'text-red-100', icon: <Wrench size={14} />, progreso: 80 },
  'Listo para Retiro': { color: 'bg-gradient-to-r from-emerald-700 to-green-800', headerColor: 'bg-gradient-to-r from-emerald-800 to-green-900', textColor: 'text-emerald-100', icon: <CheckCircle size={14} />, progreso: 100 },
  'Entregado': { color: 'bg-gradient-to-r from-gray-800 to-gray-900', headerColor: 'bg-gradient-to-r from-gray-900 to-slate-900', textColor: 'text-gray-200', icon: <PackageCheck size={14} />, progreso: 100 }
};

// Utilidades
const formatearFecha = (fecha) => {
  if (!fecha) return '—';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const calcularDiasTranscurridos = (fechaIngreso) => {
  if (!fechaIngreso) return 0;
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  if (isNaN(ingreso.getTime())) return 0;
  const diff = Math.floor((hoy - ingreso) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
};

export default function ModalVerServicio({ servicio, onClose, actualizarEstado }) {
  if (!servicio) return null;

  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('');
  const [tooltipAbierto, setTooltipAbierto] = useState(false); // ✨ Estado para tooltip clickeable

  // Variables calculadas
  const tecnicoAsignado = servicio.tecnico || 'Henderson Azuaje';
  const diasTranscurridos = calcularDiasTranscurridos(servicio.fechaIngreso);
  const estaVencido = diasTranscurridos > 5 && (servicio.estado === 'Recibido' || servicio.estado === 'En Diagnóstico');
  const estado = estadoConfig[servicio.estado] || estadoConfig['Recibido'];

  const totalGeneral = (servicio.productos || []).reduce((acc, item) => {
    const precio = Number(item.precio ?? 0);
    const cantidad = Number(item.cantidad ?? 0);
    return acc + (precio * cantidad);
  }, 0);

  // Tiempo real desde última actualización
  useEffect(() => {
    const interval = setInterval(() => {
      if (servicio.ultimaActualizacion) {
        const ahora = new Date();
        const ultima = new Date(servicio.ultimaActualizacion);
        const diff = Math.floor((ahora - ultima) / (1000 * 60));
        setTiempoTranscurrido(diff < 60 ? `${diff}m` : `${Math.floor(diff/60)}h`);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [servicio.ultimaActualizacion]);

  // ✨ Cerrar tooltip al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipAbierto && !event.target.closest('.tooltip-container')) {
        setTooltipAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltipAbierto]);

  const handleEntregarDispositivo = () => {
    if (window.confirm('¿Confirmar entrega del dispositivo al cliente?')) {
      if (typeof actualizarEstado === 'function') {
        actualizarEstado(servicio.id, {
          estado: 'Entregado',
          entregadoEn: new Date().toISOString()
        });
        toast.success('✅ Dispositivo marcado como entregado');
      }
      if (typeof onClose === 'function') onClose();
    }
  };

  const handleReimprimirOrden = () => {
    toast.success('🖨️ Función de reimprimir en desarrollo');
  };

  const handleNotificarWhatsApp = () => {
    toast.success('📱 Función de WhatsApp en desarrollo');
  };

  // ✨ Componente de contacto con tooltip clickeable
  const ContactoTooltip = () => (
    <div className="relative tooltip-container">
      <button 
        onClick={() => setTooltipAbierto(!tooltipAbierto)}
        className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm hover:bg-blue-600/30 transition-colors"
      >
        <User size={12} />
        {servicio.cliente}
        <MessageCircle size={10} />
      </button>
      
      {/* ✨ Tooltip que permanece abierto al hacer click */}
      {tooltipAbierto && (
        <div className="absolute bottom-full left-0 mb-2 z-20">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl min-w-[240px]">
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-green-400" />
                <span className="text-gray-300">{servicio.telefono || 'No disponible'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-blue-400" />
                <span className="text-gray-300">{servicio.email || 'No disponible'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={12} className="text-red-400 mt-0.5" />
                <span className="text-gray-300 leading-tight">{servicio.direccion || 'No disponible'}</span>
              </div>
              
              {/* Acciones rápidas en el tooltip */}
              <div className="flex gap-1 mt-3 pt-2 border-t border-gray-700">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${servicio.telefono}`);
                  }}
                  className="flex-1 px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded text-xs flex items-center justify-center gap-1"
                >
                  <Phone size={10} />
                  Llamar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://wa.me/${servicio.telefono?.replace(/\D/g, '')}`);
                  }}
                  className="flex-1 px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded text-xs flex items-center justify-center gap-1"
                >
                  <MessageCircle size={10} />
                  WA
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`mailto:${servicio.email}`);
                  }}
                  className="flex-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-xs flex items-center justify-center gap-1"
                >
                  <Mail size={10} />
                  Email
                </button>
              </div>
            </div>
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      {/* ✨ Modal responsive que se adapta al contenido */}
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-7xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col border border-gray-700">

        {/* ✨ HEADER CON ALERTA INTEGRADA */}
        <div className={`relative ${estado.headerColor} overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
          </div>

          <div className="relative px-8 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  {estado.icon && React.cloneElement(estado.icon, { className: "h-6 w-6" })}
                </div>
                <div>
                  <h1 className="text-xl font-bold">Orden #{servicio.id}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-white/90 text-xs font-medium flex items-center gap-1">
                      <User size={10} />
                      {tecnicoAsignado}
                    </span>
                    
                    {/* ✨ ALERTA VENCIDO MOVIDA AL HEADER */}
                    {estaVencido && (
                      <span className="bg-red-500/40 px-3 py-1 rounded-full text-red-100 text-xs font-medium flex items-center gap-1 animate-pulse border border-red-400/50">
                        <AlertTriangle size={12} />
                        ⚠️ Servicio vencido - Contactar cliente urgente ({diasTranscurridos}d)
                      </span>
                    )}
                    
                    {/* ✨ ALERTA LISTO TAMBIÉN EN HEADER */}
                    {servicio.estado === 'Listo para Retiro' && (
                      <span className="bg-green-500/40 px-3 py-1 rounded-full text-green-100 text-xs font-medium flex items-center gap-1 border border-green-400/50">
                        <CheckCircle size={12} />
                        ✅ Dispositivo listo - Notificar cliente
                      </span>
                    )}
                    
                    {tiempoTranscurrido && (
                      <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/70 text-xs flex items-center gap-1">
                        <Zap size={10} />
                        Actualizado hace {tiempoTranscurrido}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-white/70 text-xs">Total</div>
                  <div className="text-xl font-bold">${totalGeneral.toFixed(2)}</div>
                </div>
                <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ✨ CONTENIDO PRINCIPAL - ALTURA FLEXIBLE */}
        <div className="flex-1 overflow-hidden p-6 bg-gray-900">
          <div className="grid grid-cols-[45fr_55fr] gap-6 h-full">
            
            {/* COLUMNA IZQUIERDA: INFORMACIÓN Y PRODUCTOS (45%) */}
            <div className="flex flex-col space-y-4 min-h-0">
              
              {/* TIMELINE DE PROGRESO */}
              <div className="bg-gray-800/50 rounded-lg p-3 flex-shrink-0">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-400">Progreso del Servicio</span>
                  <span className="text-gray-300">{estado.progreso}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500" 
                    style={{width: `${estado.progreso}%`}}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mt-2 text-gray-500">
                  <span>Recibido</span>
                  <span>En Proceso</span>
                  <span>Completado</span>
                </div>
              </div>
              
              {/* ✨ INFORMACIÓN BÁSICA MÁS COMPACTA */}
              <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-red-400" />
                  Información del Servicio
                </h3>

                <div className="space-y-2">
                  {/* ✨ Cliente más compacto */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Cliente:</span>
                    <ContactoTooltip />
                  </div>

                  {/* ✨ Grid compacto 2x2 */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-400">Dispositivo:</span>
                      <div className="font-medium text-gray-100 text-xs leading-tight">{servicio.dispositivo || '—'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Días:</span>
                      <div className={`font-medium flex items-center gap-1 ${estaVencido ? 'text-red-400' : 'text-gray-100'}`}>
                        {servicio.estado === 'Entregado' ? '—' : `${diasTranscurridos}d`}
                        {estaVencido && <Flag size={10} className="text-red-400" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">F. Recepción:</span>
                      <div className="font-medium text-gray-100">{formatearFecha(servicio.fechaIngreso)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">F. Estimada:</span>
                      <div className="font-medium text-gray-100">{formatearFecha(servicio.fechaEntrega)}</div>
                    </div>
                  </div>

                  {/* ✨ Estado más compacto */}
                  <div className="flex justify-between items-center pt-1 border-t border-gray-700">
                    <span className="text-gray-400 text-xs">Estado:</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md font-medium ${estado.color} ${estado.textColor} shadow-md`}>
                      {estado.icon}
                      {servicio.estado}
                    </span>
                  </div>

                  {/* ✨ QUICK STATS MÁS COMPACTOS */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="bg-blue-900/30 rounded-md p-1.5 text-center">
                      <div className="text-blue-300 text-xs font-bold">{diasTranscurridos}</div>
                      <div className="text-blue-400 text-xs">Días</div>
                    </div>
                    <div className="bg-purple-900/30 rounded-md p-1.5 text-center">
                      <div className="text-purple-300 text-xs font-bold">{(servicio.productos || []).length}</div>
                      <div className="text-purple-400 text-xs">Items</div>
                    </div>
                    <div className="bg-emerald-900/30 rounded-md p-1.5 text-center">
                      <div className="text-emerald-300 text-xs font-bold">${totalGeneral.toFixed(0)}</div>
                      <div className="text-emerald-400 text-xs">Total</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✨ PRODUCTOS Y SERVICIOS - ALTURA FLEXIBLE */}
              <div className="bg-gray-800/70 rounded-xl border border-gray-700 flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-gray-700 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-400" />
                    Productos y Servicios
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
                      {(servicio.productos || []).length}
                    </span>
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-700 border-b border-gray-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-300">Item</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-300">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-300">Precio</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {servicio.productos?.length > 0 ? (
                        servicio.productos.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-700/50">
                            <td className="px-3 py-2 text-gray-200">{item.nombre}</td>
                            <td className="px-3 py-2 text-center text-gray-300">{item.cantidad}</td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              ${Number(item.precio ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-100">
                              ${Number((item.precio ?? 0) * (item.cantidad ?? 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-3 py-6 text-center text-gray-500 italic">
                            No hay productos registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 border-t border-gray-700 bg-emerald-800/20 flex-shrink-0">
                  <div className="flex justify-end">
                    <div className="bg-emerald-800/30 border border-emerald-600 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                        <DollarSign size={14} />
                        <span>Total: ${totalGeneral.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: NOTAS E IMÁGENES (55%) */}
            <div className="bg-gray-800/70 rounded-xl border border-gray-700 flex flex-col min-h-0">
              <div className="p-4 border-b border-gray-700 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-yellow-400" />
                  Notas e Imágenes
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
                    {(servicio.notasTecnicas || []).length}
                  </span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {servicio.notasTecnicas?.length > 0 ? (
                  servicio.notasTecnicas.map((nota, idx) => {
                    const imagenes = Array.isArray(nota.imagenes) ? nota.imagenes : [];
                    return (
                      <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                        <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
                          <span>{nota.fecha ? new Date(nota.fecha).toLocaleDateString('es-VE') : '—'}</span>
                          {imagenes.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-blue-400">
                              <Camera size={12} />
                              {imagenes.length}
                            </span>
                          )}
                        </div>

                        <div className="text-gray-200 text-sm leading-relaxed mb-3">
                          {nota.mensaje ? nota.mensaje : <i className="text-gray-500">Sin mensaje</i>}
                        </div>

                        {imagenes.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {imagenes.slice(0, 6).map((imagen, imgIdx) => (
                              <div key={imgIdx} className="relative group cursor-pointer">
                                <img
                                  src={imagen}
                                  alt={`Evidencia ${idx + 1}-${imgIdx + 1}`}
                                  className="w-full h-20 object-cover rounded border border-gray-600 hover:border-gray-500 transition-all duration-200 group-hover:scale-105"
                                  loading="lazy"
                                  onClick={() => setImagenExpandida(imagen)}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                      <Camera size={16} className="text-white" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {imagenes.length > 6 && (
                              <div className="w-full h-20 bg-gray-700 border border-gray-600 rounded flex items-center justify-center text-xs text-gray-400 hover:bg-gray-600 transition-colors cursor-pointer">
                                +{imagenes.length - 6} más
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <StickyNote className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 italic text-lg">Sin notas registradas</p>
                    <p className="text-gray-600 text-sm mt-2">Las notas e imágenes aparecerán aquí cuando se agreguen</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER OPTIMIZADO */}
        <div className="flex-shrink-0 bg-gray-800 px-8 py-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            
            {/* Acciones secundarias */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReimprimirOrden}
                className="group px-4 py-2 bg-gray-700/50 border border-gray-600 hover:bg-blue-600/70 hover:border-blue-500 text-gray-200 hover:text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <Printer size={14} className="group-hover:text-white transition-colors" />
                <span>Reimprimir</span>
              </button>

              <button
                onClick={handleNotificarWhatsApp}
                className="group px-4 py-2 bg-green-700/50 border border-green-600 hover:bg-green-600/70 hover:border-green-500 text-green-100 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <MessageCircle size={14} className="group-hover:text-white transition-colors" />
                <span>WhatsApp</span>
              </button>

              {/* Información adicional en el footer */}
              <div className="hidden md:flex items-center gap-4 ml-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} />
                  Creado: {formatearFecha(servicio.fechaIngreso)}
                </span>
                {servicio.ultimaActualizacion && (
                  <span className="flex items-center gap-1">
                    <Zap size={12} />
                    Actualizado: {tiempoTranscurrido || 'Reciente'}
                  </span>
                )}
              </div>
            </div>

            {/* Acciones principales */}
            <div className="flex items-center gap-3">
              {servicio.estado === 'Listo para Retiro' && (
                <button
                  onClick={handleEntregarDispositivo}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Truck size={18} />
                  <span>Entregar Dispositivo</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors font-medium"
             >
               Cerrar
             </button>
           </div>
         </div>
       </div>

       {/* MODAL DE IMAGEN EXPANDIDA */}
       {imagenExpandida && (
         <div 
           className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 animate-fadeIn" 
           onClick={() => setImagenExpandida(null)}
         >
           <div className="relative max-w-5xl max-h-[90vh]">
             <img 
               src={imagenExpandida} 
               className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
               alt="Imagen expandida"
             />
             <button 
               className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors" 
               onClick={() => setImagenExpandida(null)}
             >
               <X size={24} />
             </button>
             
             {/* Información de la imagen */}
             <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
               Clic fuera para cerrar
             </div>
           </div>
         </div>
       )}
     </div>
   </div>
 );
}