// components/servicios/RegistroServicioWizard.jsx - COMPLETO CON MODO EDICIÓN
import React, { useState } from 'react';
import {
  X, User, Smartphone, ShoppingCart, CheckCircle, 
  ChevronLeft, ChevronRight, Save, Edit3, Eye
} from 'lucide-react';
import ClienteSelector from '../presupuesto/ClienteSelector';
import ItemsTable from '../presupuesto/ItemsTable';
import toast from 'react-hot-toast';

// Pasos del wizard
import PasoDispositivo from './wizard/PasoDispositivo';
import PasoConfirmacion from './wizard/PasoConfirmacion';

const PASOS = [
  {
    id: 1,
    titulo: 'Cliente',
    icono: <User className="h-5 w-5" />,
    descripcion: 'Seleccionar o crear cliente'
  },
  {
    id: 2,
    titulo: 'Dispositivo',
    icono: <Smartphone className="h-5 w-5" />,
    descripcion: 'Información del equipo y diagnóstico'
  },
  {
    id: 3,
    titulo: 'Items/Servicios',
    icono: <ShoppingCart className="h-5 w-5" />,
    descripcion: 'Productos y servicios estimados'
  },
  {
    id: 4,
    titulo: 'Confirmar',
    icono: <CheckCircle className="h-5 w-5" />,
    descripcion: 'Revisar y crear orden'
  }
];

export default function RegistroServicioWizard({ 
  isOpen, 
  onClose, 
  onServicioCreado,
  // ✨ NUEVAS PROPS PARA MODO EDICIÓN
  modoEdicion = false,
  servicioAEditar = null,
  onServicioActualizado = null
}) {
  // Inicializar en paso 3 si es modo edición
  const [pasoActual, setPasoActual] = useState(modoEdicion ? 3 : 1);
  const [loading, setLoading] = useState(false);

  // Estados del wizard con datos pre-cargados si es modo edición
  const [datosServicio, setDatosServicio] = useState(() => {
    if (modoEdicion && servicioAEditar) {
      return {
        // Paso 1: Cliente (pre-cargado)
        cliente: {
          nombre: servicioAEditar.cliente,
          telefono: servicioAEditar.telefono || '',
          email: servicioAEditar.email || '',
          direccion: servicioAEditar.direccion || '',
          cedula_rif: servicioAEditar.cedula_rif || ''
        },
        
        // Paso 2: Dispositivo & Diagnóstico (pre-cargado)
        dispositivo: {
          marca: servicioAEditar.dispositivo?.split(' ')[0] || '',
          modelo: servicioAEditar.dispositivo?.split(' ').slice(1).join(' ') || '',
          color: servicioAEditar.color || '',
          imei: servicioAEditar.imei || '',
          accesorios: servicioAEditar.accesorios || [],
          problema: servicioAEditar.problema || '',
          problemas: servicioAEditar.problemas || [],
          evidencias: servicioAEditar.evidencias || []
        },
        diagnostico: {
          tecnico: servicioAEditar.tecnico || '',
          estado: servicioAEditar.estado || 'En Diagnóstico',
          observaciones: servicioAEditar.observaciones || ''
        },
        
        // Paso 3: Items (pre-cargados y editables)
        items: (servicioAEditar.productos || []).map(p => ({
          id: p.id || Date.now() + Math.random(),
          descripcion: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio,
          esPersonalizado: p.esPersonalizado || false
        })),
        
        // Totales
        subtotal: 0,
        total: 0
      };
    }
    
    // Datos vacíos para nuevo servicio
    return {
      cliente: null,
      dispositivo: {
        marca: '',
        modelo: '',
        color: '',
        imei: '',
        accesorios: [],
        problema: '',
        problemas: [],
        evidencias: []
      },
      diagnostico: {
        tecnico: '',
        estado: 'En Diagnóstico',
        observaciones: ''
      },
      items: [],
      subtotal: 0,
      total: 0
    };
  });

  const [erroresPaso, setErroresPaso] = useState({});

  // Títulos y descripciones dinámicos
  const titulo = modoEdicion 
    ? `Editar Orden #${servicioAEditar?.id}` 
    : 'Nueva Orden de Servicio';
    
  const descripcionPaso = modoEdicion 
    ? `Modificando servicio - ${PASOS[pasoActual - 1]?.descripcion}`
    : PASOS[pasoActual - 1]?.descripcion;

  // Validaciones por paso (ajustadas para modo edición)
  const validarPaso = (numeroPaso) => {
    const errores = {};

    switch (numeroPaso) {
      case 1:
        // Solo validar cliente si NO es modo edición
        if (!modoEdicion && !datosServicio.cliente) {
          errores.cliente = 'Debe seleccionar un cliente';
        }
        break;

      case 2:
        // Solo validar dispositivo si NO es modo edición
        if (!modoEdicion) {
          if (!datosServicio.dispositivo.marca) {
            errores.marca = 'La marca es obligatoria';
          }
          if (!datosServicio.dispositivo.modelo) {
            errores.modelo = 'El modelo es obligatorio';
          }
          if (!datosServicio.dispositivo.imei) {
            errores.imei = 'El IMEI/Serial es obligatorio';
          }
          if (!datosServicio.dispositivo.problema && !datosServicio.dispositivo.problemas?.length) {
            errores.problema = 'Debe describir el problema';
          }
          if (!datosServicio.diagnostico.tecnico) {
            errores.tecnico = 'Debe asignar un técnico';
          }
        }
        break;

      case 3:
        // Items es opcional, pero si hay items validar que tengan cantidad > 0
        const itemsInvalidos = datosServicio.items.filter(item => item.cantidad <= 0);
        if (itemsInvalidos.length > 0) {
          errores.items = 'Todos los items deben tener cantidad mayor a 0';
        }
        break;
    }

    setErroresPaso(errores);
    return Object.keys(errores).length === 0;
  };

  // Navegación
  const irAlPaso = (numeroPaso) => {
    if (modoEdicion) {
      // En modo edición, solo permitir pasos 3 y 4
      if (numeroPaso >= 3 && numeroPaso <= 4) {
        setPasoActual(numeroPaso);
        setErroresPaso({});
      }
    } else {
      // Modo normal: validar paso actual antes de avanzar
      if (numeroPaso < pasoActual || validarPaso(pasoActual)) {
        setPasoActual(numeroPaso);
        setErroresPaso({});
      }
    }
  };

  const siguientePaso = () => {
    if (validarPaso(pasoActual)) {
      if (pasoActual < PASOS.length) {
        setPasoActual(pasoActual + 1);
        setErroresPaso({});
      }
    }
  };

  const pasoAnterior = () => {
    if (modoEdicion) {
      // En modo edición, solo permitir retroceder al paso 3
      if (pasoActual > 3) {
        setPasoActual(pasoActual - 1);
        setErroresPaso({});
      }
    } else {
      // Modo normal
      if (pasoActual > 1) {
        setPasoActual(pasoActual - 1);
        setErroresPaso({});
      }
    }
  };

  // Actualizar datos del servicio
  const actualizarDatos = (seccion, datos) => {
    setDatosServicio(prev => ({
      ...prev,
      [seccion]: datos
    }));
  };

  // Finalizar y crear/actualizar servicio
  const finalizarAccion = async () => {
    if (!validarPaso(4)) return;

    setLoading(true);
    try {
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (modoEdicion) {
        // ✨ MODO EDICIÓN - ACTUALIZAR SERVICIO EXISTENTE
        const servicioActualizado = {
          ...servicioAEditar,
          productos: datosServicio.items.map(item => ({
            id: item.id || Date.now() + Math.random(),
            nombre: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio_unitario,
            esPersonalizado: item.esPersonalizado || false
          })),
          total: `$${datosServicio.items.reduce((sum, item) => 
            sum + (item.cantidad * item.precio_unitario), 0).toFixed(2)}`,
          observaciones: datosServicio.diagnostico.observaciones,
          ultimaActualizacion: new Date().toISOString()
        };

        onServicioActualizado?.(servicioActualizado);
        toast.success('✅ Servicio actualizado exitosamente');
        
      } else {
        // ✨ MODO CREACIÓN - CREAR NUEVO SERVICIO
        const nuevoServicio = {
          id: Date.now(),
          cliente: datosServicio.cliente.nombre,
          telefono: datosServicio.cliente.telefono,
          email: datosServicio.cliente.email,
          direccion: datosServicio.cliente.direccion,
          cedula_rif: datosServicio.cliente.cedula_rif,
          dispositivo: `${datosServicio.dispositivo.marca} ${datosServicio.dispositivo.modelo}`,
          color: datosServicio.dispositivo.color,
          imei: datosServicio.dispositivo.imei,
          accesorios: datosServicio.dispositivo.accesorios,
          problema: datosServicio.dispositivo.problema,
          problemas: datosServicio.dispositivo.problemas,
          evidencias: datosServicio.dispositivo.evidencias,
          estado: datosServicio.diagnostico.estado,
          fechaIngreso: new Date().toISOString(),
          fechaEntrega: datosServicio.diagnostico.fechaEstimada,
          total: `$${datosServicio.items.reduce((sum, item) => 
            sum + (item.cantidad * item.precio_unitario), 0).toFixed(2)}`,
          tecnico: datosServicio.diagnostico.tecnico,
          observaciones: datosServicio.diagnostico.observaciones,
          productos: datosServicio.items.map(item => ({
            id: item.id || Date.now() + Math.random(),
            nombre: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio_unitario,
            esPersonalizado: item.esPersonalizado || false
          })),
          notasTecnicas: [],
          historialNotas: []
        };

        onServicioCreado?.(nuevoServicio);
        toast.success('✅ Orden de servicio creada exitosamente');
      }
      
      onClose();

    } catch (error) {
      console.error('Error procesando servicio:', error);
      toast.error('❌ Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    // Z-INDEX ALTO PARA ESTAR SOBRE TODO
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-6xl h-[95vh] shadow-2xl overflow-hidden flex flex-col border border-gray-700">

        {/* HEADER DEL WIZARD */}
        <div className={`relative overflow-hidden flex-shrink-0 ${
          modoEdicion 
            ? 'bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800' 
            : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800'
        }`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>

          <div className="relative px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                  {modoEdicion ? <Edit3 className="h-8 w-8" /> : <Smartphone className="h-8 w-8" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{titulo}</h1>
                  <p className="text-slate-200 text-sm">
                    Paso {pasoActual} de {PASOS.length} - {descripcionPaso}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* STEPPER/BREADCRUMB - ADAPTADO PARA MODO EDICIÓN */}
        <div className="bg-gray-800/70 px-8 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {PASOS.map((paso, index) => {
              // En modo edición, deshabilitar pasos 1 y 2
              const estaDeshabilitado = modoEdicion && (paso.id === 1 || paso.id === 2);
              const estaActivo = pasoActual === paso.id;
              const estaCompletado = pasoActual > paso.id;
              
              return (
                <React.Fragment key={paso.id}>
                  <button
                    onClick={() => !estaDeshabilitado && irAlPaso(paso.id)}
                    disabled={loading || estaDeshabilitado}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                      estaActivo
                        ? modoEdicion 
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-slate-600 text-white shadow-lg scale-105'
                        : estaCompletado
                        ? 'bg-emerald-700/50 text-emerald-200 hover:bg-emerald-600/50'
                        : estaDeshabilitado
                        ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      estaActivo
                        ? 'bg-white text-slate-600'
                        : estaCompletado
                        ? 'bg-emerald-500 text-white'
                        : estaDeshabilitado
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {estaCompletado && !estaDeshabilitado ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : estaDeshabilitado ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        React.cloneElement(paso.icono, { className: "h-4 w-4" })
                      )}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="font-medium text-sm">
                        {paso.titulo}
                        {estaDeshabilitado && <span className="text-xs ml-1">(Solo lectura)</span>}
                      </div>
                    </div>
                  </button>

                  {index < PASOS.length - 1 && (
                    <div className={`hidden md:block flex-1 h-0.5 mx-4 ${
                      pasoActual > paso.id ? 'bg-emerald-500' : 'bg-gray-600'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* CONTENIDO DEL PASO ACTUAL */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-900">
          {pasoActual === 1 && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-semibold text-gray-100">
                  👤 {modoEdicion ? 'Cliente del Servicio' : 'Seleccionar Cliente'}
                </h2>
                {modoEdicion && (
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm font-medium">
                    Solo lectura
                  </span>
                )}
              </div>
              
              <ClienteSelector
                clienteSeleccionado={datosServicio.cliente}
                onClienteSeleccionado={(cliente) => actualizarDatos('cliente', cliente)}
                isEditable={!loading && !modoEdicion}
                theme="dark"
              />
              {erroresPaso.cliente && (
                <p className="text-red-400 text-sm mt-2">⚠️ {erroresPaso.cliente}</p>
              )}
            </div>
          )}

          {pasoActual === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-semibold text-gray-100">
                  📱 {modoEdicion ? 'Información del Dispositivo' : 'Dispositivo y Diagnóstico'}
                </h2>
                {modoEdicion && (
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm font-medium">
                    Solo lectura
                  </span>
                )}
              </div>
              
              <PasoDispositivo
                datos={datosServicio}
                onActualizar={actualizarDatos}
                errores={erroresPaso}
                loading={loading}
                soloLectura={modoEdicion}
              />
            </div>
          )}

          {pasoActual === 3 && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-semibold text-gray-100">
                  🛒 {modoEdicion ? 'Editar Productos y Servicios' : 'Productos y Servicios (Opcional)'}
                </h2>
                {modoEdicion && (
                  <span className="px-3 py-1 bg-green-600/20 text-green-300 rounded-full text-sm font-medium">
                    Editable
                  </span>
                )}
              </div>
              
              <ItemsTable
                items={datosServicio.items}
                onItemsChange={(items) => actualizarDatos('items', items)}
                isEditable={!loading}
                theme="dark"
                title="Items del Servicio"
                showAddCustom={true}
                maxVisibleItems={6}
              />
              {erroresPaso.items && (
                <p className="text-red-400 text-sm mt-2">⚠️ {erroresPaso.items}</p>
              )}
            </div>
          )}

          {pasoActual === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-semibold text-gray-100">
                  ✅ {modoEdicion ? 'Confirmar Cambios' : 'Confirmar y Crear'}
                </h2>
              </div>
              
              <PasoConfirmacion
                datos={datosServicio}
                onActualizar={actualizarDatos}
                loading={loading}
                modoEdicion={modoEdicion}
              />
            </div>
          )}
        </div>

        {/* FOOTER CON NAVEGACIÓN */}
        <div className="bg-gray-800 px-8 py-4 border-t border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={pasoAnterior}
              disabled={(modoEdicion ? pasoActual === 3 : pasoActual === 1) || loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>

            <div className="text-center text-gray-400 text-sm">
              {pasoActual === 4 
                ? modoEdicion 
                  ? '¡Listo para actualizar!' 
                  : '¡Listo para crear!'
                : `Paso ${pasoActual} de ${PASOS.length}`
              }
            </div>

            {pasoActual < PASOS.length ? (
              <button
                onClick={siguientePaso}
                disabled={loading}
                className={`flex items-center space-x-2 px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  modoEdicion 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-slate-600 hover:bg-slate-700'
                }`}
              >
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finalizarAccion}
                disabled={loading}
                className={`flex items-center space-x-2 px-8 py-3 text-white rounded-lg transition-colors disabled:opacity-50 font-semibold ${
                  modoEdicion 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>{modoEdicion ? 'Actualizando...' : 'Creando...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{modoEdicion ? 'Actualizar Servicio' : 'Crear Orden'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}