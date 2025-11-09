// components/servicios/RegistroServicioWizard.jsx - COMPLETO CON MODO EDICIÓN
import React, { useState } from 'react';
import {
  X, User, Smartphone, ShoppingCart, CheckCircle,
  ChevronLeft, ChevronRight, Save, Edit3, Eye
} from 'lucide-react';
import ClienteSelector from '../presupuesto/ClienteSelector';
import ItemsTable from '../presupuesto/ItemsTable';
import toast from '../../utils/toast.jsx';
import { useServiciosStore } from '../../store/serviciosStore';

// Pasos del wizard
import PasoDispositivo from './wizard/PasoDispositivo';
import PasoModalidadPago from './wizard/PasoModalidadPago';
import PasoConfirmacion from './wizard/PasoConfirmacion';
import { CreditCard } from 'lucide-react';

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
    titulo: 'Pago',
    icono: <CreditCard className="h-5 w-5" />,
    descripcion: 'Modalidad de pago'
  },
  {
    id: 5,
    titulo: 'Confirmar',
    icono: <CheckCircle className="h-5 w-5" />,
    descripcion: 'Revisar y crear orden'
  }
];

export default function RegistroServicioWizard({
  isOpen,
  onClose,
  onServicioCreado,
  //  NUEVAS PROPS PARA MODO EDICIÓN
  modoEdicion = false,
  servicioAEditar = null,
  onServicioActualizado = null
}) {
  // Store de servicios
  const { crearServicio, actualizarServicio } = useServiciosStore();

  // Inicializar en paso 3 si es modo edición
  const [pasoActual, setPasoActual] = useState(modoEdicion ? 3 : 1);
  const [loading, setLoading] = useState(false);

  // Estados del wizard con datos pre-cargados si es modo edición
  const [datosServicio, setDatosServicio] = useState(() => {
    if (modoEdicion && servicioAEditar) {
      return {
        // Paso 1: Cliente (pre-cargado)
        cliente: (() => {
          // Si cliente es un objeto del backend, extraer las propiedades
          if (servicioAEditar.cliente && typeof servicioAEditar.cliente === 'object' && !Array.isArray(servicioAEditar.cliente)) {
            return {
              nombre: servicioAEditar.cliente.nombre || servicioAEditar.clienteNombre || '',
              telefono: servicioAEditar.cliente.telefono || servicioAEditar.clienteTelefono || servicioAEditar.telefono || '',
              email: servicioAEditar.cliente.email || servicioAEditar.clienteEmail || servicioAEditar.email || '',
              direccion: servicioAEditar.cliente.direccion || servicioAEditar.clienteDireccion || servicioAEditar.direccion || '',
              cedula_rif: servicioAEditar.cliente.cedula_rif || servicioAEditar.cedula_rif || ''
            };
          }
          // Si cliente es un string (nombre), crear objeto con ese nombre
          if (typeof servicioAEditar.cliente === 'string') {
            return {
              nombre: servicioAEditar.cliente,
              telefono: servicioAEditar.telefono || servicioAEditar.clienteTelefono || '',
              email: servicioAEditar.email || servicioAEditar.clienteEmail || '',
              direccion: servicioAEditar.direccion || servicioAEditar.clienteDireccion || '',
              cedula_rif: servicioAEditar.cedula_rif || ''
            };
          }
          // Si hay clienteNombre como string separado
          if (servicioAEditar.clienteNombre && typeof servicioAEditar.clienteNombre === 'string') {
            return {
              nombre: servicioAEditar.clienteNombre,
              telefono: servicioAEditar.clienteTelefono || servicioAEditar.telefono || '',
              email: servicioAEditar.clienteEmail || servicioAEditar.email || '',
              direccion: servicioAEditar.clienteDireccion || servicioAEditar.direccion || '',
              cedula_rif: servicioAEditar.cedula_rif || ''
            };
          }
          // Fallback: objeto vacío
          return {
            nombre: '',
            telefono: '',
            email: '',
            direccion: '',
            cedula_rif: ''
          };
        })(),
        
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
          tecnico: (() => {
            // Si tecnico es un objeto, extraer el nombre
            if (servicioAEditar.tecnico && typeof servicioAEditar.tecnico === 'object') {
              return servicioAEditar.tecnico.nombre || servicioAEditar.tecnico.email || '';
            }
            // Si es un string, usarlo directamente
            if (typeof servicioAEditar.tecnico === 'string') {
              return servicioAEditar.tecnico;
            }
            // Si hay tecnicoAsignado, usarlo
            if (servicioAEditar.tecnicoAsignado && typeof servicioAEditar.tecnicoAsignado === 'string') {
              return servicioAEditar.tecnicoAsignado;
            }
            // Fallback
            return '';
          })(),
          tecnicoId: servicioAEditar.tecnicoId || 
            (servicioAEditar.tecnico && typeof servicioAEditar.tecnico === 'object' ? servicioAEditar.tecnico.id : null) ||
            null,
          estado: servicioAEditar.estado || 'En Diagnóstico',
          observaciones: servicioAEditar.observaciones || '',
          fechaEstimada: servicioAEditar.fechaEstimada || ''
        },
        
        // Paso 3: Items (pre-cargados y editables)
        items: (servicioAEditar.items || servicioAEditar.productos || []).map(p => ({
          id: p.id || Date.now() + Math.random(),
          descripcion: p.descripcion || p.nombre,
          cantidad: p.cantidad || 1,
          precio_unitario: p.precioUnitario || p.precio_unitario || p.precio || 0,
          producto_id: p.productoId || p.producto_id || null, // ✅ Incluir productoId para manejo de stock
          esPersonalizado: p.esPersonalizado || p.es_personalizado || false
        })),

        // Paso 4: Modalidad de Pago (pre-cargado)
        modalidadPago: servicioAEditar.modalidadPago || 'PAGO_POSTERIOR',
        pagoInicial: servicioAEditar.pagoInicial || null,

        // Totales
        subtotal: 0,
        total: 0
      };
    }
    
    // Datos vacíos para nuevo servicio
    // Calcular fecha de mañana por defecto (+1 día)
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];

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
        tecnicoId: null,
        estado: 'En Diagnóstico',
        observaciones: '',
        fechaEstimada: fechaManana
      },
      items: [],
      modalidadPago: 'PAGO_POSTERIOR',
      pagoInicial: null,
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
          if (!datosServicio.diagnostico.fechaEstimada) {
            errores.fechaEstimada = 'Debe indicar la fecha estimada de entrega';
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

      case 4:
        // Validar modalidad de pago solo si NO es modo edición
        if (!modoEdicion) {
          const { modalidadPago, pagoInicial } = datosServicio;
          if ((modalidadPago === 'TOTAL_ADELANTADO' || modalidadPago === 'ABONO') &&
              (!pagoInicial || !pagoInicial.pagos || pagoInicial.pagos.length === 0)) {
            errores.pago = 'Debes registrar el pago inicial';
          }
        }
        break;
    }

    setErroresPaso(errores);
    return Object.keys(errores).length === 0;
  };

  // Navegación
  const irAlPaso = (numeroPaso) => {
    if (modoEdicion) {
      // En modo edición, solo permitir pasos 3, 4 y 5
      if (numeroPaso >= 3 && numeroPaso <= 5) {
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
        // En modo edición, saltar del paso 3 al paso 5 (omitir pago)
        if (modoEdicion && pasoActual === 3) {
          setPasoActual(5);
        } else {
          setPasoActual(pasoActual + 1);
        }
        setErroresPaso({});
      }
    }
  };

  const pasoAnterior = () => {
    if (modoEdicion) {
      // En modo edición, solo permitir retroceder entre pasos 3 y 5
      if (pasoActual === 5) {
        setPasoActual(3); // Saltar de 5 a 3 (omitir paso 4)
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
    if (!validarPaso(5)) return;

    setLoading(true);
    try {
      if (modoEdicion) {
        // 🔧 MODO EDICIÓN - ACTUALIZAR SERVICIO EXISTENTE VÍA API
        const datosActualizacion = {
          items: datosServicio.items.map(item => ({
            productoId: item.producto_id || item.productoId || null, // ✅ Enviar como productoId (backend espera este formato)
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            esPersonalizado: item.esPersonalizado || false
          })),
          observaciones: datosServicio.diagnostico?.observaciones || null
        };

        const servicioActualizado = await actualizarServicio(
          servicioAEditar.id,
          datosActualizacion
        );

        toast.success('✅ Servicio actualizado exitosamente');
        if (onServicioActualizado) {
          onServicioActualizado(servicioActualizado);
        }

      } else {
        // 🔧 MODO CREACIÓN - CREAR NUEVO SERVICIO VÍA API
        const datosCreacion = {
          // Cliente
          cliente: {
            id: datosServicio.cliente?.id || null,
            nombre: datosServicio.cliente?.nombre || '',
            telefono: datosServicio.cliente?.telefono || null,
            email: datosServicio.cliente?.email || null,
            direccion: datosServicio.cliente?.direccion || null,
            cedula_rif: datosServicio.cliente?.cedula_rif || null
          },

          // Dispositivo
          dispositivo: {
            marca: datosServicio.dispositivo.marca,
            modelo: datosServicio.dispositivo.modelo,
            color: datosServicio.dispositivo.color || null,
            imei: datosServicio.dispositivo.imei,
            patron: datosServicio.dispositivo.patron || null,
            accesorios: datosServicio.dispositivo.accesorios || [],
            problema: datosServicio.dispositivo.problema ||
                     datosServicio.dispositivo.problemas?.join(', ') || '',
            evidencias: datosServicio.dispositivo.evidencias || []
          },

          // Diagnóstico
          diagnostico: {
            tecnico: datosServicio.diagnostico.tecnico || '',
            tecnicoId: datosServicio.diagnostico.tecnicoId || null,
            observaciones: datosServicio.diagnostico.observaciones || null,
            fechaEstimadaEntrega: datosServicio.diagnostico.fechaEstimada || null
          },

          // Items/Productos
          items: datosServicio.items.map(item => ({
            producto_id: item.producto_id || null,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario
          })),

          // Modalidad de pago
          modalidadPago: datosServicio.modalidadPago,
          pagoInicial: datosServicio.pagoInicial || null
        };

        const nuevoServicio = await crearServicio(datosCreacion);

        toast.success('✅ Orden de servicio creada exitosamente');
        if (onServicioCreado) {
          onServicioCreado(nuevoServicio);
        }
      }

      onClose();

    } catch (error) {
      console.error('Error procesando servicio:', error);
      toast.error(error.message || 'Error al procesar la solicitud');
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
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <h2 className="text-xs font-medium text-gray-500">
                   {modoEdicion ? 'Cliente del Servicio' : 'Seleccionar Cliente'}
                </h2>
                {modoEdicion && (
                  <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded text-[10px]">
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
                <p className="text-red-400 text-sm mt-2"> {erroresPaso.cliente}</p>
              )}
            </div>
          )}

          {pasoActual === 2 && (
            <div>
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <h2 className="text-xs font-medium text-gray-500">
                   {modoEdicion ? 'Información del Dispositivo' : 'Dispositivo y Diagnóstico'}
                </h2>
                {modoEdicion && (
                  <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded text-[10px]">
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
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <h2 className="text-xs font-medium text-gray-500">
                   {modoEdicion ? 'Editar Productos y Servicios' : 'Productos y Servicios (Opcional)'}
                </h2>
                {modoEdicion && (
                  <span className="px-1.5 py-0.5 bg-green-600/20 text-green-300 rounded text-[10px]">
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
                <p className="text-red-400 text-sm mt-2"> {erroresPaso.items}</p>
              )}
            </div>
          )}

          {pasoActual === 4 && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-1.5">
                <h2 className="text-xs font-medium text-gray-500">
                  Modalidad de Pago
                </h2>
              </div>

              <PasoModalidadPago
                datos={datosServicio}
                onActualizar={(datosPago) => {
                  setDatosServicio(prev => ({
                    ...prev,
                    ...datosPago
                  }));
                }}
                errores={erroresPaso}
                loading={loading}
              />
            </div>
          )}

          {pasoActual === 5 && (
            <div>
              <div className="flex items-center justify-center mb-1.5">
                <h2 className="text-xs font-medium text-gray-500">
                   {modoEdicion ? 'Confirmar Cambios' : 'Confirmar y Crear'}
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
              {pasoActual === 5
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