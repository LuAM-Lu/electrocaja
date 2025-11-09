// components/ServiciosDashboard.jsx - COMPLETO CON FUNCIONALIDAD DE EDICIÓN
import React, { useState } from 'react';
import { Wrench, Store } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import ResumenEstadosServicios from './servicios/ResumenEstadosServicios';
import ServicioPage from './servicios/ServicioPage'; 
import ServiciosFloatingActions from './servicios/ServiciosFloatingActions';
import ModalVerServicio from './servicios/ModalVerServicio';
import ModalEditarServicio from './servicios/ModalHistoriaServicio'; 
import BorrarServicioModal from './servicios/BorrarServicioModal';
//  IMPORTAR EL WIZARD COMPLETO
import RegistroServicioWizard from './servicios/RegistroServicioWizard';
import toast from '../utils/toast.jsx';

const ServiciosDashboard = () => {
  const { switchToMain, getTransitionClass } = useDashboardStore();
  const { usuario } = useAuthStore();
  
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

  // Lista de servicios (simulada - integrar con store después)
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
   setShowNewServiceModal(true);
 };

 //  MANEJAR SERVICIO CREADO DESDE EL WIZARD
 const handleServicioCreado = (nuevoServicio) => {
   console.log(' Nuevo servicio creado:', nuevoServicio);
   
   // Agregar a la lista de servicios
   setServiciosLista(prev => [nuevoServicio, ...prev]);
   
   // Cerrar modal
   setShowNewServiceModal(false);
   
   // Opcional: Mostrar el servicio recién creado
   setTimeout(() => {
     setServicioSeleccionado(nuevoServicio);
   }, 500);
 };

 //  MANEJAR BOTÓN EDITAR (WIZARD)
 const handleEditarServicioWizard = (servicio) => {
   console.log(' Editando servicio con wizard:', servicio);
   setServicioAEditar(servicio);
   setModalEditarWizard(true);
 };

 //  MANEJAR ACTUALIZACIÓN DE SERVICIO DESDE WIZARD
 const handleServicioActualizado = (servicioActualizado) => {
   console.log(' Servicio actualizado:', servicioActualizado);
   
   // Actualizar en la lista de servicios
   setServiciosLista(prev => prev.map(s => 
     s.id === servicioActualizado.id ? servicioActualizado : s
   ));
   
   // Cerrar modal
   setModalEditarWizard(false);
   setServicioAEditar(null);
   
   // Mostrar el servicio actualizado en el modal de vista
   setTimeout(() => {
     setServicioSeleccionado(servicioActualizado);
   }, 500);
 };

//  FUNCIÓN PARA MANEJAR HISTORIAL
 const handleVerHistorial = (servicio) => {
   console.log(' Ver historial completo del servicio:', servicio);
   setServicioHistorial(servicio);
   setModalHistorial(true);
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

 // Datos para el resumen (calculados desde serviciosLista)
 const serviciosSimulados = serviciosLista;

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
               <h2 className="text-xl font-semibold text-gray-100 mb-2">
                 Resumen de Estados
               </h2>
             </div>
             <ResumenEstadosServicios
               servicios={serviciosSimulados}
               filtroEstado={filtroEstado}
               setFiltroEstado={setFiltroEstado}
               vencidos={3}
             />
           </div>
         </div>

         {/* SEGUNDA FILA: TABLA DE SERVICIOS */}
         <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
           <ServicioPage 
             servicios={serviciosLista}
             filtroEstado={filtroEstado}
             onVerServicio={setServicioSeleccionado}
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
     <div className="fixed bottom-6 left-6 z-50">
       <ServiciosFloatingActions 
         onNewService={handleNewService}
         onSettings={handleSettings}
         onReports={handleReports}
         onPruebaConexion={handlePruebaConexion}
       />
     </div>

     {/*  MODALES CON Z-INDEX ALTO PARA ESTAR SOBRE HEADER/FOOTER STICKY */}
     
     {/* WIZARD DE NUEVA ORDEN */}
     {showNewServiceModal && (
       <RegistroServicioWizard
         isOpen={showNewServiceModal}
         onClose={() => setShowNewServiceModal(false)}
         onServicioCreado={handleServicioCreado}
         modoEdicion={false}
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

     {/* MODALES DE CONFIGURACIÓN Y REPORTES (placeholders) */}
     {showConfigModal && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center animate-fadeIn">
         <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl animate-scaleIn">
           <h3 className="text-xl font-bold text-gray-100 mb-4">Configuración de Servicios</h3>
           <p className="text-gray-400 mb-6">Panel de configuración en desarrollo...</p>
           <button
             onClick={() => setShowConfigModal(false)}
             className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
           >
             Cerrar
           </button>
         </div>
       </div>
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
           actualizarEstado={(id, data) => {
             //  ACTUALIZAR SERVICIO EN LA LISTA
             setServiciosLista(prev => prev.map(s => 
               s.id === id ? { ...s, ...data } : s
             ));
             setServicioSeleccionado(null);
             console.log('Actualizando servicio:', id, data);
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
           onGuardar={(id, data) => {
             //  ACTUALIZAR SERVICIO EN LA LISTA
             setServiciosLista(prev => prev.map(s => 
               s.id === id ? { ...s, ...data } : s
             ));
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
           onConfirmar={(id) => {
             //  ELIMINAR SERVICIO DE LA LISTA
             setServiciosLista(prev => prev.filter(s => s.id !== id));
             setModalBorrar(false);
             setServicioBorrar(null);
             console.log('Eliminando servicio:', id);
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
         onGuardar={(id, data) => {
           //  ACTUALIZAR SERVICIO EN LA LISTA
           setServiciosLista(prev => prev.map(s => 
             s.id === id ? { ...s, ...data } : s
           ));
           setModalHistorial(false);
           setServicioHistorial(null);
           toast.success('Historial técnico actualizado');
           console.log('Actualizando historial servicio:', id, data);
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