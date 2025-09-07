// components/ResumenEstadosServicios.jsx (MEJORADO PARA TEMA DARK)
import React from 'react';
import {
  Inbox, Stethoscope, Clock, Wrench,
  CheckCircle, PackageCheck, MessageCircle, Flag 
} from 'lucide-react';

const estados = {
  'Recibido': {
    label: 'Recibido',
    color: 'bg-gradient-to-br from-purple-400 to-purple-600',
    hoverColor: 'hover:from-slate-700 hover:to-slate-800',
    activeColor: 'from-sky-600 to-sky-700',
    icon: <Inbox size={36} className="opacity-30 group-hover:opacity-100 group-hover:scale-110 transition duration-300 absolute right-[10%] top-1/2 -translate-y-1/2 text-slate-300" />
  },
  'En Diagnóstico': {
    label: 'En Diagnóstico',
    color: 'bg-gradient-to-br from-amber-600 to-yellow-700',
    hoverColor: 'hover:from-amber-700 hover:to-yellow-800',
    activeColor: 'from-amber-500 to-yellow-600',
    icon: <Stethoscope size={36} className="opacity-30 group-hover:opacity-100 group-hover:scale-110 transition duration-300 absolute right-[10%] top-1/2 -translate-y-1/2 text-amber-200" />
  },
  'Esperando Aprobación': {
    label: 'Esperando Aprobación',
    color: 'bg-gradient-to-br from-orange-600 to-red-600',
    hoverColor: 'hover:from-orange-700 hover:to-red-700',
    activeColor: 'from-orange-500 to-red-500',
    icon: <Clock size={36} className="opacity-30 group-hover:opacity-100 group-hover:scale-110 transition duration-300 absolute right-[10%] top-1/2 -translate-y-1/2 text-orange-200" />
  },
  'En Reparación': {
    label: 'En Reparación',
    color: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    hoverColor: 'hover:from-blue-700 hover:to-indigo-800',
    activeColor: 'from-blue-500 to-indigo-600',
    icon: <Wrench size={36} className="opacity-30 group-hover:opacity-100 group-hover:scale-110 transition duration-300 absolute right-[10%] top-1/2 -translate-y-1/2 text-blue-200" />
  },
  'Listo para Retiro': {
    label: 'Listo para Retiro',
    color: 'bg-gradient-to-br from-emerald-600 to-green-700',
    hoverColor: 'hover:from-emerald-700 hover:to-green-800',
    activeColor: 'from-emerald-500 to-green-600',
    icon: <CheckCircle size={36} className="opacity-30 group-hover:opacity-100 group-hover:scale-110 transition duration-300 absolute right-[10%] top-1/2 -translate-y-1/2 text-emerald-200" />
  },
  'Entregado': {
    label: 'Entregado',
    color: 'bg-gradient-to-br from-gray-600 to-gray-700',
    hoverColor: 'hover:from-gray-700 hover:to-gray-800',
    activeColor: 'from-gray-500 to-gray-600',
    icon: <PackageCheck size={36} className="opacity-30 group-hover:opacity-100 group-hover:scale-110 transition duration-300 absolute right-[10%] top-1/2 -translate-y-1/2 text-gray-300" />
  }
};

export default function ResumenEstadosServicios({ servicios, filtroEstado, setFiltroEstado, vencidos = 0 }) {
  const conteo = {};
  Object.keys(estados).forEach((estado) => {
    conteo[estado] = servicios.filter((s) => s.estado === estado).length;
  });

  return (
    <div className="grid grid-cols-6 gap-4 w-full mb-8">
      {Object.entries(estados).map(([clave, config]) => {
        const estaActivo = filtroEstado === clave;
        return (
          <div
            key={clave}
            onClick={() => setFiltroEstado(estaActivo ? null : clave)}
            className={`
              group relative rounded-xl p-6 cursor-pointer 
              transition-all duration-300 ease-in-out
              transform hover:scale-105 hover:-translate-y-1
              shadow-lg hover:shadow-2xl
              border border-gray-700/50 hover:border-gray-600
              backdrop-blur-sm
              ${estaActivo 
                ? `bg-gradient-to-br ${config.activeColor} shadow-2xl scale-105 -translate-y-1 ring-2 ring-white/20` 
                : `${config.color} ${config.hoverColor}`
              }
            `}
          >
            {/* Brillo superior */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-xl" />
            
            {/* Contenido */}
            <div className="relative z-10">
              <p className="text-white text-3xl font-bold mb-1 drop-shadow-sm">
                {conteo[clave]}
              </p>
              <p className="text-gray-200 text-sm font-medium drop-shadow-sm">
                {config.label}
              </p>
            </div>

            {/* Ícono de fondo */}
            {config.icon}

            {/* Burbuja para "Recibido" con servicios vencidos */}
            {clave === 'Recibido' && vencidos > 0 && (
              <div className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center">
                <div className="relative">
                  <Flag 
                    size={32}
                    className="text-red-500 drop-shadow-lg animate-pulse"
                    fill="currentColor"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold z-10">
                    {vencidos}
                  </span>
                </div>
              </div>
            )}

            {/* Indicador de filtro activo */}
            {estaActivo && (
              <div className="absolute bottom-2 right-2">
                <div className="w-3 h-3 bg-white/80 rounded-full shadow-lg animate-pulse" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}