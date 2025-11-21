// components/ServiciosDashboard.jsx - COMPLETO CON FUNCIONALIDAD DE EDICIÓN
import React, { useState, useEffect } from 'react';
import { Wrench, Store, BarChart3 } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { useServiciosStore } from '../store/serviciosStore';
import { useCajaStore } from '../store/cajaStore';
import ResumenEstadosServicios from './servicios/ResumenEstadosServicios';
import ServicioPage from './servicios/ServicioPage';
import ServiciosFloatingActions from './servicios/ServiciosFloatingActions';
import ModalVerServicio from './servicios/ModalVerServicio';
import ModalEditarServicio from './servicios/ModalHistoriaServicio';
import BorrarServicioModal from './servicios/BorrarServicioModal';
//  IMPORTAR EL WIZARD COMPLETO
import RegistroServicioWizard from './servicios/RegistroServicioWizard';
import ConfiguracionServiciosModal from './servicios/ConfiguracionServiciosModal';
import toast from '../utils/toast.jsx';

const ServiciosDashboard = () => {
  const { switchToMain, getTransitionClass } = useDashboardStore();
  const { usuario } = useAuthStore();
  const { servicios, loading, cambiarEstado, eliminarServicio, cargarServicios, obtenerServicio } = useServiciosStore();
  const { cajaActual } = useCajaStore();
  
  // Estados para modales de floating actions
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(null);

    //  ESTADO PARA PRUEBA DE CONEXIÓN
  const [showPruebaConexion, setShowPruebaConexion] = useState(false);
  

  // Estados para modales de servicios
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [modalBorrar, setModalBorrar] = useState(false);
  const [servicioBorrar, setServicioBorrar] = useState(null);

  //  NUEVOS ESTADOS PARA EDICIÓN CON WIZARD
  const [modalEditarWizard, setModalEditarWizard] = useState(false);
  const [servicioAEditar, setServicioAEditar] = useState(null);

  //  ESTADOS PARA MODAL DE HISTORIAL
  const [modalHistorial, setModalHistorial] = useState(false);
  const [servicioHistorial, setServicioHistorial] = useState(null);

  // 🔧 Cargar servicios al montar el componente
  useEffect(() => {
    cargarServicios({ incluirRelaciones: true });
  }, [cargarServicios]);

  // Lista de servicios (simulada - DEPRECADO - ahora usa el store)
  const [serviciosLista, setServiciosLista] = useState([
    {
      id: 1,
      cliente: 'Juan Pérez',
      telefono: '+58 412-1234567',
      email: 'juan.perez@email.com',
      direccion: 'Av. Principal, Caracas',
      cedula_rif: 'V-12345678',
      dispositivo: 'iPhone 16 Pro Max',
      color: 'Negro Titanio',
      imei: '123456789012345',
      accesorios: ['Cargador original', 'Cable USB', 'Funda'],
      problema: 'Pantalla quebrada y batería hinchada',
      problemas: ['Pantalla quebrada', 'Batería agotada'],
      evidencias: [],
      estado: 'Recibido',
      fechaIngreso: '2025-07-28',
      fechaEntrega: '2025-07-29',
      total: '$67,00',
      tecnico: 'Henderson Azuaje',
      observaciones: 'Cliente requiere reparación urgente',
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
      cliente: 'María González',
      telefono: '+58 424-9876543',
      email: 'maria.gonzalez@email.com',
      direccion: 'Calle 5, Maracaibo',
      cedula_rif: 'V-87654321',
      dispositivo: 'Samsung Galaxy S24 Ultra',
      color: 'Gris Titanio',
      imei: '987654321098765',
      accesorios: ['Cargador', 'S Pen'],
      problema: 'Problemas de carga',
      problemas: ['Problemas de carga', 'Puerto USB dañado'],
      evidencias: [],
      estado: 'En Diagnóstico',
      fechaIngreso: '2025-07-27',
      fechaEntrega: '2025-07-30',
      total: '$45,00',
      tecnico: 'Carlos Rodriguez',
      observaciones: 'Dispositivo presenta problemas intermitentes',
      productos: [
        { id: 2, nombre: 'Limpieza de puerto USB', cantidad: 1, precio: 10.00 },
       { id: 3, nombre: 'Actualización de software', cantidad: 1, precio: 20.00 },
     ],
     notasTecnicas: [
       {
         fecha: '2025-07-27T14:15:00Z',
         mensaje: 'Dispositivo presenta problemas de carga. Investigando posible daño en puerto USB.',
         imagenes: []
       }
     ]
   },
   {
     id: 3,
     cliente: 'Carlos Rodríguez',
     telefono: '+58 416-5555555',
     email: 'carlos.rodriguez@email.com',
     direccion: 'Av. Libertador, Valencia',
     cedula_rif: 'V-11111111',
     dispositivo: 'MacBook Pro 14"',
     color: 'Gris Espacial',
     imei: 'MBA123456789',
     accesorios: ['Cargador MagSafe', 'Funda'],
     problema: 'Múltiples teclas no funcionan',
     problemas: ['Botones no funcionan', 'Teclado defectuoso'],
     evidencias: [],
     estado: 'Esperando Aprobación',
     fechaIngreso: '2025-07-26',
     fechaEntrega: '2025-08-02',
     total: '$120,00',
     tecnico: 'María González',
     observaciones: 'Cliente solicita presupuesto antes de proceder',
     productos: [
       { id: 1, nombre: 'Reemplazo de teclado', cantidad: 1, precio: 80.00 },
       { id: 2, nombre: 'Limpieza interna', cantidad: 1, precio: 25.00 },
       { id: 3, nombre: 'Diagnóstico completo', cantidad: 1, precio: 15.00 },
     ],
     notasTecnicas: [
       {
         fecha: '2025-07-26T09:45:00Z',
         mensaje: 'Múltiples teclas no funcionan. Se requiere reemplazo completo del teclado. Esperando aprobación del cliente.',
         imagenes: []
       }
     ]
   },
   {
     id: 4,
     cliente: 'Ana Martínez',
     telefono: '+58 412-7777777',
     email: 'ana.martinez@email.com',
     direccion: 'Centro Comercial, Barquisimeto',
     cedula_rif: 'V-22222222',
     dispositivo: 'iPad Air 5ta Gen',
     color: 'Azul',
     imei: 'IPA987654321',
     accesorios: ['Apple Pencil', 'Smart Keyboard'],
     problema: 'Pantalla completamente rota',
     problemas: ['Pantalla quebrada'],
     evidencias: [],
     estado: 'En Reparación',
     fechaIngreso: '2025-07-25',
     fechaEntrega: '2025-07-31',
     total: '$85,00',
     tecnico: 'Henderson Azuaje',
     observaciones: 'Reparación en proceso',
     productos: [
       { id: 1, nombre: 'Reemplazo de pantalla', cantidad: 1, precio: 65.00 },
       { id: 2, nombre: 'Protector de pantalla', cantidad: 1, precio: 10.00 },
       { id: 3, nombre: 'Limpieza completa', cantidad: 1, precio: 10.00 },
     ],
     notasTecnicas: [
       {
         fecha: '2025-07-25T16:30:00Z',
         mensaje: 'Pantalla completamente rota. Iniciando proceso de reemplazo.',
         imagenes: []
       }
     ]
   },
   {
     id: 5,
     cliente: 'Luis Hernández',
     telefono: '+58 426-8888888',
     email: 'luis.hernandez@email.com',
     direccion: 'Urbanización Los Rosales, Caracas',
     cedula_rif: 'V-33333333',
     dispositivo: 'PlayStation 5',
     color: 'Blanco',
     imei: 'PS5123456789',
     accesorios: ['Control inalámbrico', 'Cable HDMI'],
     problema: 'Configuración inicial requerida',
     problemas: ['Configuración inicial'],
     evidencias: [],
     estado: 'Listo para Retiro',
     fechaIngreso: '2025-07-24',
     fechaEntrega: '2025-07-28',
     total: '$35,00',
     tecnico: 'Carlos Rodriguez',
     observaciones: 'Servicio completado satisfactoriamente',
     productos: [
       { id: 1, nombre: 'Configuración inicial PS5', cantidad: 1, precio: 25.00 },
       { id: 2, nombre: 'Instalación de juegos', cantidad: 1, precio: 10.00 },
     ],
     notasTecnicas: [
       {
         fecha: '2025-07-24T11:00:00Z',
         mensaje: 'Servicio de configuración completado. Consola lista para entrega.',
         imagenes: []
       }
     ]
   }
 ]);

 const handleBackToMain = () => {
   switchToMain();
 };

 //  MANEJAR CREACIÓN DE NUEVA ORDEN DE SERVICIO
 const handleNewService = () => {
   // ✅ YA NO SE VALIDA QUE LA CAJA ESTÉ ABIERTA
   // Permitir crear órdenes incluso con caja cerrada (limitando opciones de pago)
   setShowNewServiceModal(true);
 };

 //  MANEJAR SERVICIO CREADO DESDE EL WIZARD
 const handleServicioCreado = async (nuevoServicio) => {
   console.log(' Nuevo servicio creado:', nuevoServicio);
   
   // Recargar servicios desde el store
   await cargarServicios({ incluirRelaciones: true });
   
   // Cerrar modal del wizard
   setShowNewServiceModal(false);
   
   // NO mostrar el modal automáticamente - esperar a que terminen todas las acciones (impresión, WhatsApp, etc.)
   // El usuario puede ver el servicio desde la lista si lo desea
 };

 // 🔧 MANEJAR VER SERVICIO - Obtener datos completos desde API
 const handleVerServicio = async (servicio) => {
   try {
     // Mostrar indicador de carga
     toast.info('Cargando detalles del servicio...', { duration: 2000 });
     
     // Obtener servicio completo desde la API
     const servicioCompleto = await obtenerServicio(servicio.id);
     if (servicioCompleto) {
       setServicioSeleccionado(servicioCompleto);
     } else {
       // Si falla, usar el servicio mapeado como fallback
       toast.warning('No se pudieron cargar todos los detalles', { duration: 3000 });
       setServicioSeleccionado(servicio);
     }
   } catch (error) {
     console.error('Error obteniendo servicio completo:', error);
     toast.error('Error al cargar detalles del servicio', { duration: 3000 });
     // Usar servicio mapeado como fallback
     setServicioSeleccionado(servicio);
   }
 };

 //  MANEJAR BOTÓN EDITAR (WIZARD) - Obtener datos completos desde API
 const handleEditarServicioWizard = async (servicio) => {
   try {
     console.log(' Editando servicio con wizard:', servicio);
     // Mostrar indicador de carga
     toast.info('Cargando datos del servicio...', { duration: 2000 });
     
     // Obtener servicio completo desde la API
     const servicioCompleto = await obtenerServicio(servicio.id);
     if (servicioCompleto) {
       setServicioAEditar(servicioCompleto);
       setModalEditarWizard(true);
     } else {
       // Si falla, usar el servicio mapeado como fallback
       toast.warning('No se pudieron cargar todos los datos', { duration: 3000 });
       setServicioAEditar(servicio);
       setModalEditarWizard(true);
     }
   } catch (error) {
     console.error('Error obteniendo servicio completo:', error);
     toast.error('Error al cargar datos del servicio', { duration: 3000 });
     // Usar servicio mapeado como fallback
     setServicioAEditar(servicio);
     setModalEditarWizard(true);
   }
 };

 //  MANEJAR ACTUALIZACIÓN DE SERVICIO DESDE WIZARD
 const handleServicioActualizado = async (servicioActualizado) => {
   console.log(' Servicio actualizado:', servicioActualizado);
   
   // Recargar servicios desde el store
   await cargarServicios({ incluirRelaciones: true });
   
   // Cerrar modal
   setModalEditarWizard(false);
   setServicioAEditar(null);
   
   // Mostrar el servicio actualizado en el modal de vista
   setTimeout(() => {
     setServicioSeleccionado(servicioActualizado);
   }, 500);
 };

//  FUNCIÓN PARA MANEJAR HISTORIAL - Obtener datos completos desde API
 const handleVerHistorial = async (servicio) => {
   try {
     console.log(' Ver historial completo del servicio:', servicio);
     // Mostrar indicador de carga
     toast.info('Cargando historial del servicio...', { duration: 2000 });
     
     // Obtener servicio completo desde la API
     const servicioCompleto = await obtenerServicio(servicio.id);
     if (servicioCompleto) {
       setServicioHistorial(servicioCompleto);
       setModalHistorial(true);
     } else {
       // Si falla, usar el servicio mapeado como fallback
       toast.warning('No se pudieron cargar todos los datos del historial', { duration: 3000 });
       setServicioHistorial(servicio);
       setModalHistorial(true);
     }
   } catch (error) {
     console.error('Error obteniendo servicio completo:', error);
     toast.error('Error al cargar historial del servicio', { duration: 3000 });
     // Usar servicio mapeado como fallback
     setServicioHistorial(servicio);
     setModalHistorial(true);
   }
 };

 const handleSettings = () => {
   setShowConfigModal(true);
 };

 const handleReports = () => {
   setShowReportsModal(true);
 };

  //  FUNCIÓN PARA PRUEBA DE CONEXIÓN NUBE
 const handlePruebaConexion = () => {
   setShowPruebaConexion(true);
 };

 // 🔧 Función para normalizar estados (igual que en ServicioPage)
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

 // 🔧 Mapear servicios para el resumen (igual que en ServicioPage)
 const mapearServicio = (servicio) => {
   if (!servicio) return null;
   return {
     ...servicio,
     estado: normalizarEstado(servicio.estado)
   };
 };

 // Datos para el resumen (desde el store, mapeados)
 const serviciosMapeados = servicios.map(mapearServicio).filter(Boolean);
 
 // Calcular servicios vencidos
 const calcularDiasTranscurridos = (fechaEntrega) => {
   if (!fechaEntrega) return 0;
   const hoy = new Date();
   const entrega = new Date(fechaEntrega);
   return Math.floor((hoy - entrega) / (1000 * 60 * 60 * 24));
 };
 
 const vencidos = serviciosMapeados.filter(s => {
   const diasTranscurridos = calcularDiasTranscurridos(s.fechaEntregaEstimada || s.fechaEntrega);
   return s.estado === 'Recibido' && diasTranscurridos > 5;
 }).length;

 return (
   <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 relative overflow-hidden">
     
     {/* PATRÓN DE FONDO METÁLICO MEJORADO */}
     <div className="absolute inset-0">
       <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-slate-900/95" />
       <div 
         className="absolute inset-0 opacity-[0.03]"
         style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-27.614-22.386-50-50-50v100c27.614 0 50-22.386 50-50zM0 0h50v50H0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
           backgroundSize: '100px 100px'
         }}
       />
       <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
       <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
     </div>

     {/* CONTENIDO PRINCIPAL CON TRANSICIONES */}
     <div className={`relative z-10 transition-all duration-300 ease-in-out ${getTransitionClass()}`}>
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

         {/* PRIMERA FILA: RESUMEN DE ESTADOS */}
         <div className="mb-8">
           <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
             <div className="mb-4">
               <h2 className="text-xl font-semibold text-gray-100 mb-2 flex items-center gap-2">
                 <BarChart3 className="h-6 w-6 text-white" />
                 Resumen de Estados
               </h2>
             </div>
             <ResumenEstadosServicios
               servicios={serviciosMapeados}
               filtroEstado={filtroEstado}
               setFiltroEstado={setFiltroEstado}
               vencidos={vencidos}
             />
           </div>
         </div>

         {/* SEGUNDA FILA: TABLA DE SERVICIOS */}
         <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
           <ServicioPage 
             filtroEstado={filtroEstado}
             onVerServicio={handleVerServicio}
             onEditarServicio={handleEditarServicioWizard} //  USAR WIZARD PARA EDITAR
             onBorrarServicio={(servicio) => {
               setServicioBorrar(servicio);
               setModalBorrar(true);
             }}
             onVerHistorial={handleVerHistorial}
           />
         </div>
       </div>
     </div>
     
     {/* BOTÓN FLOTANTE PARA REGRESAR */}
     <button
       onClick={handleBackToMain}
       className="
         fixed right-4 top-1/2 -translate-y-1/2
         z-50 group
         bg-gradient-to-b from-blue-600 to-blue-700
         hover:from-blue-700 hover:to-blue-800
         text-gray-200 shadow-2xl
         ring-1 ring-blue-500/20
         transition-all duration-300
         px-5 py-4
         hover:scale-110 hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]
         active:scale-95
         clip-path-arrow-right
       "
       style={{
         clipPath: 'polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 15% 50%)'
       }}
     >
       <Store className="h-7 w-7 drop-shadow-sm transition-transform duration-300 group-hover:rotate-12 ml-1" />
       
       <span className="
         pointer-events-none absolute right-full mr-6
         px-3 py-2 rounded-lg text-sm font-medium
         bg-gray-900/90 backdrop-blur-sm text-gray-200 
         opacity-0 group-hover:opacity-100
         transition-all duration-300
         whitespace-nowrap border border-gray-700
         shadow-xl
       ">
         <span className="block">Volver al Dashboard</span>
         <span className="text-xs text-gray-400">Sistema de Caja</span>
       </span>
     </button>

     {/* FLOATING ACTIONS PARA SERVICIOS */}
       <ServiciosFloatingActions 
         onNewService={handleNewService}
         onSettings={handleSettings}
         onReports={handleReports}
       />

     {/*  MODALES CON Z-INDEX ALTO PARA ESTAR SOBRE HEADER/FOOTER STICKY */}
     
     {/* WIZARD DE NUEVA ORDEN */}
     {showNewServiceModal && (
       <RegistroServicioWizard
         isOpen={showNewServiceModal}
         onClose={() => setShowNewServiceModal(false)}
         onServicioCreado={handleServicioCreado}
         modoEdicion={false}
         cajaAbierta={!!cajaActual}
       />
     )}

     {/*  WIZARD DE EDICIÓN */}
     {modalEditarWizard && servicioAEditar && (
       <RegistroServicioWizard
         isOpen={modalEditarWizard}
         onClose={() => {
           setModalEditarWizard(false);
           setServicioAEditar(null);
         }}
         modoEdicion={true}
         servicioAEditar={servicioAEditar}
         onServicioActualizado={handleServicioActualizado}
       />
     )}

     {/* MODALES DE CONFIGURACIÓN Y REPORTES */}
     {showConfigModal && (
       <ConfiguracionServiciosModal
         isOpen={showConfigModal}
         onClose={() => setShowConfigModal(false)}
       />
     )}

     {showReportsModal && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center animate-fadeIn">
         <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl animate-scaleIn">
           <h3 className="text-xl font-bold text-gray-100 mb-4">Reportes de Servicios</h3>
           <p className="text-gray-400 mb-6">Módulo de reportes en desarrollo...</p>
           <button
             onClick={() => setShowReportsModal(false)}
             className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
           >
             Cerrar
           </button>
         </div>
       </div>
     )}

     {/* MODALES DE SERVICIOS - CON Z-INDEX ALTO PARA ESTAR SOBRE STICKY ELEMENTS */}
     {servicioSeleccionado && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center animate-fadeIn">
         <ModalVerServicio
           servicio={servicioSeleccionado}
           onClose={() => setServicioSeleccionado(null)}
           actualizarEstado={async (id, data) => {
             try {
               // 🔧 Convertir estado normalizado a formato de API si es necesario
               let estadoAPI = data.estado;
               if (data.estado && !data.estado.includes('_')) {
                 const estadoMap = {
                   'Recibido': 'RECIBIDO',
                   'En Diagnóstico': 'EN_DIAGNOSTICO',
                   'Esperando Aprobación': 'ESPERANDO_APROBACION',
                   'En Reparación': 'EN_REPARACION',
                   'Listo para Retiro': 'LISTO_RETIRO',
                   'Entregado': 'ENTREGADO',
                   'Cancelado': 'CANCELADO'
                 };
                 estadoAPI = estadoMap[data.estado] || data.estado;
               }
               
               // 🔧 Llamar a la API para cambiar el estado del servicio
               if (estadoAPI) {
                 await cambiarEstado(id, estadoAPI, data.nota || null);
                 toast.success('✅ Estado del servicio actualizado');
                 
                 // Obtener servicio actualizado
                 const servicioActualizado = await obtenerServicio(id);
                 if (servicioActualizado) {
                   setServicioSeleccionado(servicioActualizado);
                 } else {
                   // Recargar la lista de servicios
                   await cargarServicios({ incluirRelaciones: true });
                   setServicioSeleccionado(null);
                 }
               }
             } catch (error) {
               console.error('Error actualizando servicio:', error);
               toast.error(error.message || 'Error al actualizar el servicio');
             }
           }}
         />
       </div>
     )}

     {modalEditar && servicioEditando && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center animate-fadeIn">
         <ModalEditarServicio
           servicio={servicioEditando}
           onClose={() => {
             setModalEditar(false);
             setServicioEditando(null);
           }}
           onGuardar={async (id, data) => {
             //  Recargar servicios desde el store
             await cargarServicios({ incluirRelaciones: true });
             setModalEditar(false);
             setServicioEditando(null);
             console.log('Guardando servicio:', id, data);
           }}
         />
       </div>
     )}

     {modalBorrar && servicioBorrar && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center animate-fadeIn">
         <BorrarServicioModal
           servicio={servicioBorrar}
           onClose={() => {
             setModalBorrar(false);
             setServicioBorrar(null);
           }}
           onConfirmar={async (id, motivoEliminacion, adminToken) => {
             try {
               // El modal ya hizo la eliminación, solo recargar la lista
               await cargarServicios({ incluirRelaciones: true });
               setModalBorrar(false);
               setServicioBorrar(null);
             } catch (error) {
               console.error('Error recargando servicios:', error);
             }
           }}
         />
       </div>
     )}

     {/*  MODAL DE HISTORIAL TÉCNICO */}
     {modalHistorial && servicioHistorial && (
       <ModalEditarServicio
         servicio={servicioHistorial}
         onClose={() => {
           setModalHistorial(false);
           setServicioHistorial(null);
         }}
        onGuardar={async (id, data) => {
          try {
            // Recargar el servicio desde el store para obtener datos actualizados
            await obtenerServicio(id);
            // Recargar la lista de servicios
            await cargarServicios({ incluirRelaciones: true });
            setModalHistorial(false);
            setServicioHistorial(null);
            toast.success('Historial técnico actualizado');
            console.log('✅ Historial actualizado:', id, data);
          } catch (error) {
            console.error('Error actualizando historial:', error);
            toast.error('Error al actualizar historial');
          }
        }}
       />
     )}

     {/*  MODAL DE PRUEBA DE CONEXIÓN NUBE */}
     {showPruebaConexion && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center animate-fadeIn">
         <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full mx-4 border border-gray-700 shadow-2xl animate-scaleIn">
           <h3 className="text-xl font-bold text-gray-100 mb-4"> Prueba de Conexión Nube</h3>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">Cliente de Prueba</label>
               <input 
                 type="text" 
                 placeholder="Ej: Juan Pérez" 
                 className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">Descripción del Servicio</label>
               <input 
                 type="text" 
                 placeholder="Ej: Reparación de pantalla iPhone" 
                 className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               />
             </div>
             <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
               <p className="text-blue-300 text-sm">
                  Esta prueba creará una orden local y la enviará a la nube para verificar la conexión.
               </p>
             </div>
           </div>
           <div className="flex space-x-4 mt-6">
             <button
               onClick={() => {
                 // TODO: Implementar lógica de prueba
                 toast.success('Enviando prueba a la nube...');
                 setShowPruebaConexion(false);
               }}
               className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
             >
                Enviar Prueba
             </button>
             <button
               onClick={() => setShowPruebaConexion(false)}
               className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
             >
               Cancelar
             </button>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default ServiciosDashboard;