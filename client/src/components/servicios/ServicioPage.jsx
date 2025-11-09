// components/servicios/ServicioPage.jsx (ACTUALIZADO - CON BOTÓN HISTORIAL Y DATOS ORIGINALES)
import React, { useState, useEffect } from 'react';
import {
  PlusCircle, Eye, Pencil, Trash2, Inbox, Stethoscope, Clock,
  Wrench, CheckCircle, PackageCheck, Flag, Info, History, Search, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useServiciosStore } from '../../store/serviciosStore';
import toast from '../../utils/toast.jsx'; //  IMPORT AGREGADO

const estadoConfig = {
  'Recibido': { 
    color: 'bg-gradient-to-r from-purple-400 to-purple-600',
    textColor: 'text-slate-100',
    icon: <Inbox size={14} /> 
  },
  'En Diagnóstico': { 
    color: 'bg-gradient-to-r from-amber-600 to-yellow-700',
    textColor: 'text-amber-100',
    icon: <Stethoscope size={14} /> 
  },
  'Esperando Aprobación': { 
    color: 'bg-gradient-to-r from-orange-600 to-red-600',
    textColor: 'text-orange-100',
    icon: <Clock size={14} /> 
  },
  'En Reparación': { 
    color: 'bg-gradient-to-r from-blue-600 to-indigo-700',
    textColor: 'text-blue-100',
    icon: <Wrench size={14} /> 
  },
  'Listo para Retiro': { 
    color: 'bg-gradient-to-r from-emerald-600 to-green-700',
    textColor: 'text-emerald-100',
    icon: <CheckCircle size={14} /> 
  },
  'Entregado': { 
    color: 'bg-gradient-to-r from-gray-600 to-gray-700',
    textColor: 'text-gray-200',
    icon: <PackageCheck size={14} /> 
  },
  'Cancelado': {
    color: 'bg-gradient-to-r from-red-600 to-red-700',
    textColor: 'text-red-100',
    icon: <Flag size={14} />
  }
};

// Función para normalizar estados de la API al formato del componente
const normalizarEstado = (estado) => {
  if (!estado) return 'Recibido';
  
  const estadoMap = {
    'RECIBIDO': 'Recibido',
    'EN_DIAGNOSTICO': 'En Diagnóstico',
    'ESPERANDO_APROBACION': 'Esperando Aprobación',
    'EN_REPARACION': 'En Reparación',
    'LISTO_RETIRO': 'Listo para Retiro',
    'ENTREGADO': 'Entregado',
    'CANCELADO': 'Cancelado'
  };
  
  return estadoMap[estado] || estado;
};

// Función para mapear datos de la API al formato esperado por el componente
const mapearServicio = (servicio) => {
  if (!servicio) return null;
  
  // Extraer campos que necesitamos mapear
  const clienteNombre = servicio.clienteNombre || servicio.cliente?.nombre || 'Sin nombre';
  const dispositivoTexto = `${servicio.dispositivoMarca || ''} ${servicio.dispositivoModelo || ''}`.trim() || 'Sin dispositivo';
  const estadoNormalizado = normalizarEstado(servicio.estado);
  const fechaEntrega = servicio.fechaEntregaEstimada || servicio.fechaEntrega;
  const totalFormateado = servicio.totalEstimado ? `$${parseFloat(servicio.totalEstimado).toFixed(2)}` : '$0.00';
  
  return {
    // Mantener datos originales primero
    ...servicio,
    // Sobrescribir con campos mapeados
    cliente: clienteNombre,
    dispositivo: dispositivoTexto,
    estado: estadoNormalizado,
    fechaEntrega: fechaEntrega,
    total: totalFormateado,
    // Asegurar que estos campos existan
    totalEstimado: servicio.totalEstimado || 0,
    totalPagado: servicio.totalPagado || 0,
    saldoPendiente: servicio.saldoPendiente || 0,
    telefono: servicio.clienteTelefono || servicio.cliente?.telefono || '',
    email: servicio.clienteEmail || servicio.cliente?.email || '',
    direccion: servicio.clienteDireccion || servicio.cliente?.direccion || ''
  };
};

// Función para formatear fechas
const formatearFecha = (fecha) => {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Función para calcular diferencia en días
const calcularDiasTranscurridos = (fechaEntrega) => {
  const hoy = new Date();
  const entrega = new Date(fechaEntrega);
  const diferencia = Math.floor((hoy - entrega) / (1000 * 60 * 60 * 24));
  return diferencia;
};

export default function ServicioPage({
  filtroEstado,
  onVerServicio,
  onEditarServicio,
  onBorrarServicio,
  onVerHistorial //  NUEVA PROP
}) {
  const { usuario } = useAuthStore();
  const { servicios, loading, cargarServicios } = useServiciosStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const itemsPerPage = 10;

  // 🔧 Cargar servicios desde la API al montar el componente
  useEffect(() => {
    cargarServicios({ incluirRelaciones: true });
  }, [cargarServicios]);

  //  DATOS SIMULADOS RESTAURADOS (AHORA REEMPLAZADOS POR API)
  /* COMENTADO - AHORA USA EL STORE
  const [servicios, setServicios] = useState([
    {
      id: 1,
      cliente: 'Juan Pérez',
      dispositivo: 'iPhone 16 Pro Max',
      estado: 'Recibido',
      fechaIngreso: '2025-07-28',
      fechaEntrega: '2025-07-29',
      total: '$67,00',
      telefono: '+58 412-1234567',
      email: 'juan.perez@email.com',
      direccion: 'Av. Principal, Caracas',
      productos: [
        { id: 1, nombre: 'Cambio de pantalla', cantidad: 1, precio: 25.00 },
        { id: 2, nombre: 'Reemplazo de batería', cantidad: 1, precio: 18.50 },
        { id: 3, nombre: 'Cable flex', cantidad: 2, precio: 4.25 },
        { id: 4, nombre: 'Limpieza interna', cantidad: 1, precio: 10.00 },
        { id: 5, nombre: 'Servicio diagnóstico', cantidad: 1, precio: 5.00 },
      ],
      notasTecnicas: [
        {
          fecha: '2025-07-25T10:30:00Z',
          mensaje: 'Dispositivo recibido con pantalla quebrada y batería hinchada. Se procede a diagnóstico completo.',
          imagenes: []
        }
      ],
      historialNotas: [
        {
          fecha: '2025-07-25T10:30:00Z',
          texto: 'Dispositivo recibido con pantalla quebrada y batería hinchada. Se procede a diagnóstico completo.'
        }
      ]
    },
    {
      id: 2,
      cliente: 'Ana Gómez',
      dispositivo: 'iPhone 11',
      estado: 'En Diagnóstico',
      fechaIngreso: '2025-07-26',
      fechaEntrega: '2025-08-02',
      total: '$8.300,00',
      telefono: '+58 424-9876543',
      email: 'ana.gomez@email.com',
      direccion: 'Calle 5, Valencia',
      productos: [],
      notasTecnicas: [],
      historialNotas: []
    },
    {
      id: 3,
      cliente: 'Carlos Ruiz',
      dispositivo: 'Xbox One',
      estado: 'Esperando Aprobación',
      fechaIngreso: '2025-07-27',
      fechaEntrega: '2025-08-03',
      total: '$10.000,00',
      telefono: '+58 416-5551234',
      email: 'carlos.ruiz@email.com',
      direccion: 'Urbanización Los Naranjos, Maracay',
      productos: [],
      notasTecnicas: [],
      historialNotas: []
    },
    {
      id: 4,
      cliente: 'Luisa Martínez',
      dispositivo: 'MacBook Air',
      estado: 'En Reparación',
      fechaIngreso: '2025-04-28',
      fechaEntrega: '2025-05-04',
      total: '$15.200,00',
      telefono: '+58 414-7778888',
      email: 'luisa.martinez@email.com',
      direccion: 'Centro Comercial, Barquisimeto',
      productos: [],
      notasTecnicas: [],
      historialNotas: []
    },
    {
      id: 5,
      cliente: 'Pedro Sánchez',
      dispositivo: 'PlayStation 4',
      estado: 'Listo para Retiro',
      fechaIngreso: '2025-04-29',
      fechaEntrega: '2025-05-05',
      total: '$7.500,00',
      telefono: '+58 426-3334444',
      email: 'pedro.sanchez@email.com',
      direccion: 'Sector La Candelaria, Caracas',
      productos: [],
      notasTecnicas: [],
      historialNotas: []
    },
    {
      id: 6,
      cliente: 'Carlos Alvarran',
      dispositivo: 'Samsung Galaxy S21',
      estado: 'Entregado',
      fechaIngreso: '2025-04-20',
      fechaEntrega: '2025-04-24',
      total: '$9.800,00',
      telefono: '+58 412-6667777',
      email: 'carlos.alvarran@email.com',
      direccion: 'Zona Industrial, Puerto Ordaz',
      productos: [],
      notasTecnicas: [],
      historialNotas: []
    },
    {
      id: 7,
      cliente: 'Laura Morandin',
      dispositivo: 'Samsung Galaxy S21',
      estado: 'Recibido',
      fechaIngreso: '2025-08-11',
      fechaEntrega: '2025-08-15',
      total: '$6.800,00',
      telefono: '+58 424-1112222',
      email: 'laura.morandin@email.com',
      direccion: 'Avenida Bolívar, Mérida',
      productos: [],
      notasTecnicas: [],
      historialNotas: []
    },
    {
      id: 8,
      cliente: 'Lana Torres',
      dispositivo: 'Samsung Galaxy S22',
      estado: 'Recibido',
      fechaIngreso: '2025-04-22',
      fechaEntrega: '2025-04-23',
      total: '$6.800,00',
      telefono: '+58 416-9990000',
      email: 'lana.torres@email.com',
      direccion: 'Residencias del Este, Caracas',
      productos: [],
      notasTecnicas: [],
      historialNotas: []
    }
  ]);
  */

  // Calcular paginación con servicios mapeados y filtrados por búsqueda
  const serviciosMapeados = servicios.map(mapearServicio).filter(Boolean);
  
  // Filtrar por estado y búsqueda
  const itemsFiltrados = serviciosMapeados.filter((s) => {
    // Filtro por estado
    const cumpleEstado = !filtroEstado || s.estado === filtroEstado;
    
    // Filtro por búsqueda inteligente
    if (!busqueda.trim()) {
      return cumpleEstado;
    }
    
    const busquedaLower = busqueda.toLowerCase().trim();
    
    // Buscar por número de orden (ID o numeroServicio)
    const coincideOrden = 
      s.id?.toString().includes(busquedaLower) ||
      s.numeroServicio?.toLowerCase().includes(busquedaLower);
    
    // Buscar por cliente
    const coincideCliente = 
      s.cliente?.toLowerCase().includes(busquedaLower) ||
      s.clienteNombre?.toLowerCase().includes(busquedaLower);
    
    // Buscar por dispositivo
    const coincideDispositivo = 
      s.dispositivo?.toLowerCase().includes(busquedaLower) ||
      s.dispositivoMarca?.toLowerCase().includes(busquedaLower) ||
      s.dispositivoModelo?.toLowerCase().includes(busquedaLower);
    
    return cumpleEstado && (coincideOrden || coincideCliente || coincideDispositivo);
  });

  const totalPages = Math.ceil(itemsFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = itemsFiltrados.slice(startIndex, startIndex + itemsPerPage);

  // Resetear página cuando cambie el filtro o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado, busqueda]);

  // 🔧 Recargar servicios cuando cambie el filtro de estado
  useEffect(() => {
    const filtros = {};
    if (filtroEstado) {
      // Convertir estado normalizado a formato de API
      const estadoMap = {
        'Recibido': 'RECIBIDO',
        'En Diagnóstico': 'EN_DIAGNOSTICO',
        'Esperando Aprobación': 'ESPERANDO_APROBACION',
        'En Reparación': 'EN_REPARACION',
        'Listo para Retiro': 'LISTO_RETIRO',
        'Entregado': 'ENTREGADO',
        'Cancelado': 'CANCELADO'
      };
      filtros.estado = estadoMap[filtroEstado] || filtroEstado;
    }
    cargarServicios({ ...filtros, incluirRelaciones: true });
  }, [filtroEstado, cargarServicios]);

  const vencidos = serviciosMapeados.filter(s => {
    const diasTranscurridos = calcularDiasTranscurridos(s.fechaEntrega || s.fechaEntregaEstimada);
    return s.estado === 'Recibido' && diasTranscurridos > 5;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER DE LA SECCIÓN CON BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">
            Órdenes de Servicio
          </h2>
        </div>
        
        {/* BARRA DE BÚSQUEDA INTELIGENTE */}
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por orden, cliente o dispositivo..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {busqueda && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 p-2 text-xs text-gray-400">
              Buscando en: orden, cliente y dispositivo
            </div>
          )}
        </div>
      </div>

      {/* TABLA DE SERVICIOS MEJORADA */}
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 border-b border-gray-600/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-gray-100">
              Lista de Servicios Técnicos
            </h3>
            <div className="text-sm text-gray-400 flex items-center gap-2 flex-wrap">
              <span>
                Total: {itemsFiltrados.length} servicios
              </span>
              {filtroEstado && (
                <span className="px-2 py-1 bg-gray-600 rounded-full text-xs">
                  Filtrado por: {filtroEstado}
                </span>
              )}
              {busqueda && (
                <span className="px-2 py-1 bg-blue-600/30 border border-blue-500/30 rounded-full text-xs text-blue-300">
                  Búsqueda: "{busqueda}"
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 text-gray-300 uppercase text-xs border-b border-gray-700">
              <tr>
                <th className="px-3 py-3 font-semibold text-left w-16">#</th>
                <th className="px-3 py-3 font-semibold text-left min-w-[140px]">Dispositivo</th>
                <th className="px-3 py-3 font-semibold text-center min-w-[130px]">Estado</th>
                <th className="px-3 py-3 font-semibold text-center min-w-[140px]">Fechas</th>
                <th className="px-3 py-3 font-semibold text-center min-w-[100px]">Días</th>
                <th className="px-3 py-3 font-semibold text-center min-w-[90px]">Total</th>
                <th className="px-3 py-3 font-semibold text-center min-w-[110px]">Pago</th>
                <th className="px-3 py-3 font-semibold text-center min-w-[140px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {/* 🔧 Estado de carga */}
              {loading && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      <p className="text-gray-400">Cargando servicios...</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* 🔧 Estado vacío */}
              {!loading && currentItems.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Inbox className="h-16 w-16 text-gray-600" />
                      <p className="text-gray-400 text-lg">
                        {busqueda
                          ? `No se encontraron servicios que coincidan con "${busqueda}"`
                          : filtroEstado
                          ? `No hay servicios en estado "${filtroEstado}"`
                          : 'No hay servicios registrados'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {busqueda 
                          ? 'Intenta con otros términos de búsqueda'
                          : 'Crea una nueva orden de servicio para comenzar'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* 🔧 Lista de servicios */}
              {!loading && currentItems.map((s) => {
                const estadoNormalizado = normalizarEstado(s.estado);
                const estado = estadoConfig[estadoNormalizado] || estadoConfig['Recibido'];
                const diasTranscurridos = calcularDiasTranscurridos(s.fechaEntrega || s.fechaEntregaEstimada);
                const estaVencido = diasTranscurridos > 5 && estadoNormalizado === 'Recibido';

                let diasTexto = '—';
                if (estadoNormalizado !== 'Entregado') {
                  diasTexto =
                    diasTranscurridos < 0
                      ? <span className="text-emerald-400 font-semibold">{Math.abs(diasTranscurridos)} días restantes</span>
                      : <span className={estaVencido ? 'text-red-400 font-semibold' : 'text-gray-300'}>{diasTranscurridos} días</span>;
                }

                return (
                  <tr
                    key={s.id}
                    className={`
                      transition-all duration-200 hover:bg-gray-700/40
                      ${estaVencido ? 'bg-red-900/20 border-l-4 border-red-500' : ''}
                    `}
                  >
                    <td className="px-3 py-3 text-left font-semibold text-gray-100 text-xs">
                      #{s.id}
                    </td>
                    <td className="px-3 py-3 text-left text-gray-300 text-xs">
                      <div className="truncate max-w-[140px]" title={s.dispositivo}>
                        {s.dispositivo}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`
                        inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium
                        ${estaVencido ? 'bg-gradient-to-r from-red-600 to-red-700 text-red-100' : estado?.color || 'bg-gray-600'}
                        ${estado?.textColor || 'text-gray-200'} shadow-lg backdrop-blur-sm
                      `}>
                        {estado?.icon}
                        <span className="hidden sm:inline">{estadoNormalizado}</span>
                        <span className="sm:hidden">{estadoNormalizado.split(' ')[0]}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="text-xs leading-relaxed text-gray-300">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-[10px]">Rec:</span>
                            <span className="text-gray-200 font-medium text-[10px]">
                              {formatearFecha(s.fechaIngreso)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-[10px]">Est:</span>
                            <span className="text-gray-200 font-medium text-[10px]">
                              {formatearFecha(s.fechaEntrega || s.fechaEntregaEstimada)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <span className="text-xs">{diasTexto}</span>
                        {estaVencido && (
                          <Flag size={12} className="text-red-400 animate-pulse" title="Más de 5 días vencido" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-emerald-400 text-xs font-bold">
                        {s.total}
                      </span>
                    </td>
                    {/* 🔧 NUEVA COLUMNA: Estado de Pago */}
                    <td className="px-3 py-3 text-center">
                      {(() => {
                        const totalEstimado = parseFloat(s.totalEstimado || 0);
                        const totalPagado = parseFloat(s.totalPagado || 0);
                        const saldoPendiente = parseFloat(s.saldoPendiente || 0);

                        if (totalEstimado === 0) {
                          return (
                            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-700 text-gray-300">
                              Sin monto
                            </span>
                          );
                        }

                        if (saldoPendiente === 0 || totalPagado >= totalEstimado) {
                          return (
                            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-900/30 text-green-300 border border-green-700">
                              ✓ Pagado
                            </span>
                          );
                        }

                        if (totalPagado > 0) {
                          return (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-orange-900/30 text-orange-300 border border-orange-700">
                                Abonado
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ${saldoPendiente.toFixed(2)}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-900/30 text-red-300 border border-red-700">
                            Pendiente
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {/* Botón Ver */}
                        <button
                          onClick={() => onVerServicio?.(s)}
                          className="p-1.5 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-blue-600 hover:border-blue-500 transition-all duration-200 group"
                          title="Ver detalles"
                        >
                          <Eye size={14} className="text-gray-400 group-hover:text-white" />
                        </button>
                        
                        {/*  Botón Editar */}
                        <button
                          onClick={() => onEditarServicio?.(s)}
                          className="p-1.5 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-amber-600 hover:border-amber-500 transition-all duration-200 group"
                          title="Editar servicio"
                        >
                          <Pencil size={14} className="text-gray-400 group-hover:text-white" />
                        </button>

                        {/*  Botón Historial */}
                        <button
                          onClick={() => onVerHistorial?.(s)}
                          className="p-1.5 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-purple-600 hover:border-purple-500 transition-all duration-200 group"
                          title="Ver historial técnico completo"
                        >
                          <History size={14} className="text-gray-400 group-hover:text-white" />
                        </button>
                        
                        {/* Botón Eliminar - Solo para admin */}
                        {usuario?.rol === 'admin' && (
                          <button
                            onClick={() => onBorrarServicio?.(s)}
                            className="p-1.5 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-red-600 hover:border-red-500 transition-all duration-200 group"
                            title="Eliminar servicio"
                          >
                            <Trash2 size={14} className="text-gray-400 group-hover:text-white" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer de la tabla con paginación */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 border-t border-gray-600/50">
          <div className="flex justify-between items-center">
            
            {/* Info de páginas */}
            <div className="text-sm text-gray-400">
              Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, itemsFiltrados.length)} de {itemsFiltrados.length} servicios
            </div>

            {/* Controles de paginación */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-4 py-2 text-sm font-medium bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-500"
                disabled={currentPage === 1}
              >
                 Anterior
              </button>

              {/* Números de página */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
                      currentPage === i + 1 
                        ? 'bg-blue-600 text-white border-blue-500' 
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-200 border-gray-500'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-4 py-2 text-sm font-medium bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-500"
                disabled={currentPage === totalPages}
              >
                Siguiente 
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}