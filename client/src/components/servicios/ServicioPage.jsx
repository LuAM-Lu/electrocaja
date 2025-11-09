// components/servicios/ServicioPage.jsx (ACTUALIZADO - CON BOTÓN HISTORIAL Y DATOS ORIGINALES)
import React, { useState, useEffect } from 'react';
import {
  PlusCircle, Eye, Pencil, Trash2, Inbox, Stethoscope, Clock,
  Wrench, CheckCircle, PackageCheck, Flag, Info, History
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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
  }
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
  onVerServicio, 
  onEditarServicio, 
  onBorrarServicio,
  onVerHistorial //  NUEVA PROP
}) {
  const { usuario } = useAuthStore();
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  //  DATOS SIMULADOS RESTAURADOS
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

  // Calcular paginación
  const itemsFiltrados = filtroEstado
    ? servicios.filter((s) => s.estado === filtroEstado)
    : servicios;

  const totalPages = Math.ceil(itemsFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = itemsFiltrados.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado]);

  const vencidos = servicios.filter(s => {
    const diasTranscurridos = calcularDiasTranscurridos(s.fechaEntrega);
    return s.estado === 'Recibido' && diasTranscurridos > 5;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">
            Órdenes de Servicio
          </h2>
        </div>
      </div>

      {/* TABLA DE SERVICIOS MEJORADA */}
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
        
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 border-b border-gray-600/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">
              Lista de Servicios Técnicos
            </h3>
            <div className="text-sm text-gray-400">
              Total: {itemsFiltrados.length} servicios
              {filtroEstado && (
                <span className="ml-2 px-2 py-1 bg-gray-600 rounded-full text-xs">
                  Filtrado por: {filtroEstado}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 text-gray-300 uppercase text-xs border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-left">Orden</th>
                <th className="px-6 py-4 font-semibold text-left">Cliente</th>
                <th className="px-6 py-4 font-semibold text-left">Dispositivo</th>
                <th className="px-6 py-4 font-semibold text-center">Estado</th>
                <th className="px-6 py-4 font-semibold text-center">Fechas</th>
                <th className="px-6 py-4 font-semibold text-center">Días transcurridos</th>
                <th className="px-6 py-4 font-semibold text-center">Total</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {currentItems.map((s) => {
                const estado = estadoConfig[s.estado];
                const diasTranscurridos = calcularDiasTranscurridos(s.fechaEntrega);
                const estaVencido = diasTranscurridos > 5 && s.estado === 'Recibido';

                let diasTexto = '—';
                if (s.estado !== 'Entregado') {
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
                    <td className="px-6 py-4 text-left font-semibold text-gray-100">
                      #{s.id}
                    </td>
                    <td className="px-6 py-4 text-left text-gray-200 font-medium">
                      {s.cliente}
                    </td>
                    <td className="px-6 py-4 text-left text-gray-300">
                      {s.dispositivo}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`
                        inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full font-medium
                        ${estaVencido ? 'bg-gradient-to-r from-red-600 to-red-700 text-red-100' : estado.color}
                        ${estado.textColor} shadow-lg backdrop-blur-sm
                      `}>
                        {estado.icon}
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xs leading-relaxed text-gray-300">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="text-gray-400">Recibido:</span>
                          <span className="text-gray-200 font-medium">
                            {formatearFecha(s.fechaIngreso)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-gray-400">Estimado:</span>
                          <span className="text-gray-200 font-medium">
                            {formatearFecha(s.fechaEntrega)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        {diasTexto}
                        {estaVencido && (
                          <Flag size={16} className="text-red-400 animate-pulse" title="Más de 5 días vencido" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-emerald-400 text-base font-bold">
                        {s.total}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {/* Botón Ver */}
                        <button
                          onClick={() => onVerServicio?.(s)}
                          className="p-2 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-blue-600 hover:border-blue-500 transition-all duration-200 group"
                          title="Ver detalles"
                        >
                          <Eye size={16} className="text-gray-400 group-hover:text-white" />
                        </button>
                        
                        {/*  Botón Editar - AHORA SOLO MUESTRA MENSAJE */}
                        <button
                          onClick={() => onEditarServicio?.(s)}
                          className="p-2 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-amber-600 hover:border-amber-500 transition-all duration-200 group"
                          title="Editar servicio"
                        >
                          <Pencil size={16} className="text-gray-400 group-hover:text-white" />
                        </button>

                        {/*  Botón Historial - ABRE MODAL DE HISTORIAL */}
                        <button
                          onClick={() => onVerHistorial?.(s)}
                          className="p-2 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-purple-600 hover:border-purple-500 transition-all duration-200 group"
                          title="Ver historial técnico completo"
                        >
                          <History size={16} className="text-gray-400 group-hover:text-white" />
                        </button>
                        
                        {/* Botón Eliminar - Solo para admin */}
                        {usuario?.rol === 'admin' && (
                          <button
                            onClick={() => onBorrarServicio?.(s)}
                            className="p-2 rounded-md bg-slate-700/50 border border-slate-600 hover:bg-red-600 hover:border-red-500 transition-all duration-200 group"
                            title="Eliminar servicio"
                          >
                            <Trash2 size={16} className="text-gray-400 group-hover:text-white" />
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