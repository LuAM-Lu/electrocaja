// components/InventoryManagerModal.jsx
import React, { useState, useEffect } from 'react';

import { 
 X, Package, Plus, Edit2, Trash2, Search, 
 Eye, DollarSign, AlertCircle, Hash, Image,
 Folder, Phone, CheckCircle, XCircle, BarChart3,
 AlertTriangle, ShoppingCart, Wrench, Coffee, Tag, Boxes, Store, Circle, Settings, ChevronDown
} from 'lucide-react';
import { useInventarioStore } from '../store/inventarioStore';
import { useAuthStore } from '../store/authStore';
import ItemFormModal from './inventario/ItemFormModal';
import toast from '../utils/toast.jsx';
import { useCajaStore } from '../store/cajaStore';
import ProductViewModal from './ProductViewModal';
import CargaMasivaModal from './inventario/CargaMasivaModal';
import { getImageUrl } from '../config/api';

const InventoryManagerModal = ({ isOpen, onClose, className = '' }) => {
 const {
   inventario,
   loading,
   eliminarItem,
   obtenerEstadisticas,
   obtenerStockBajo,
   obtenerInventario // Agregado para recargar
 } = useInventarioStore();

 const { usuario, socket } = useAuthStore();
 const { tasaCambio } = useCajaStore();

  //  SUSCRIBIRSE A EVENTOS DE INVENTARIO EN TIEMPO REAL
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleInventarioActualizado = async (data) => {
      console.log('📦 Inventario actualizado (Socket.IO):', data.operacion);

      //  PROTECCIÓN GLOBAL: NO actualizar si hay CUALQUIER modal crítico activo
      // Esto evita que modales se cierren cuando otro usuario completa una venta
      const modalProtectionKeys = [
        'itemFormModalActive',      // Modal de edición de productos
        'ingresoModalActive',        // Modal de venta/ingreso (con factura)
        'productViewModalActive'     // Modal de vista de productos
      ];

      const anyModalActive = modalProtectionKeys.some(key =>
        sessionStorage.getItem(key) === 'true'
      );

      if (anyModalActive) {
        const activeModal = modalProtectionKeys.find(key =>
          sessionStorage.getItem(key) === 'true'
        );
        console.log(`⚠️ Modal activo (${activeModal}) - Posponiendo actualización de inventario`);

        // Marcar que hay una actualización pendiente
        sessionStorage.setItem('inventarioPendienteActualizar', 'true');
        return;
      }

      // Actualizar inventario normalmente si no hay modales activos
      await obtenerInventario();

      // Toast solo si es de otro usuario
      if (data.usuario !== usuario?.nombre) {
         const message = `${data.usuario}: ${data.producto?.descripcion || 'procesó una venta'}`;
         switch (data.operacion) {
           case 'CREAR':
             toast.success(message, { duration: 3000 });
             break;
           case 'EDITAR':
             toast.info(message, { duration: 3000 });
             break;
           case 'ELIMINAR':
             toast.warning(message, { duration: 3000 });
             break;
           case 'VENTA_PROCESADA':
             toast.info(`📦 ${data.producto?.descripcion}: Stock actualizado (${data.cantidad} unidades)`, { duration: 3000 });
             break;
           case 'STOCK_DEVUELTO':
             toast.success(`↩️ ${data.producto?.descripcion}: Stock devuelto (+${data.cantidad} unidades)`, { duration: 3000 });
             break;
           default:
             toast(message, { duration: 3000 });
             break;
         }
       }
    };

    // ✅ ESCUCHAR TODOS LOS EVENTOS QUE AFECTAN EL INVENTARIO
    socket.on('inventario_actualizado', handleInventarioActualizado);
    socket.on('venta_procesada', handleInventarioActualizado);
    socket.on('nueva_transaccion', async (data) => {
      // Si es una transacción de servicio técnico que puede afectar inventario
      if (data.tipo === 'servicio_tecnico' && data.transaccion?.servicioTecnicoId) {
        console.log('📦 Transacción de servicio técnico detectada, actualizando inventario...');
        await obtenerInventario();
      }
    });

    return () => {
      socket.off('inventario_actualizado', handleInventarioActualizado);
      socket.off('venta_procesada', handleInventarioActualizado);
      socket.off('nueva_transaccion');
    };
  }, [socket, isOpen, obtenerInventario, usuario]);

 // Estados para la gestión de la lista
 const [searchTerm, setSearchTerm] = useState('');
 const [filterType, setFilterType] = useState('todos');
 const [hideInactive, setHideInactive] = useState(false);
 const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

 // Estados para modales
 const [showItemForm, setShowItemForm] = useState(false);
 const [editingItem, setEditingItem] = useState(null);
 const [showViewModal, setShowViewModal] = useState(false);
 const [selectedProduct, setSelectedProduct] = useState(null);
 const [showCargaMasiva, setShowCargaMasiva] = useState(false);

 //  ESTADO PARA ANIMACIÓN DE SALIDA
 const [isClosing, setIsClosing] = useState(false);

 // Estados para animaciones del header
 const [valorTotalType, setValorTotalType] = useState('total');
 const [isRotating, setIsRotating] = useState(false);

 // Función para abrir formulario de nuevo item
 const handleNewItem = () => {
   console.log(' [InventoryManagerModal] handleNewItem - Abriendo modal para nuevo item');
   setEditingItem(null);
   setShowItemForm(true);
 };

 // Función para editar item existente
 const handleEditItem = (item) => {
   console.log(' [InventoryManagerModal] handleEditItem - Abriendo modal para editar:', item.id);
   setEditingItem(item);
   setShowItemForm(true);
 };

 // Función cuando se guarda un item exitosamente
 const handleItemSaved = (savedItem) => {
   console.log(' [InventoryManagerModal] handleItemSaved - Item guardado:', savedItem);
   setShowItemForm(false);
   setEditingItem(null);

   //  FORZAR RECARGA DEL INVENTARIO
   setTimeout(() => {
     obtenerInventario();
   }, 500);
 };

 const handleViewItem = (item) => {
   setSelectedProduct(item);
   setShowViewModal(true);
 };

 const handleDeleteItem = async (item) => {
   if (usuario?.rol !== 'admin') {
     toast.error('Solo administradores pueden eliminar items');
     return;
   }

   //  Modal con opciones de motivo
   const motivos = [
     { valor: 'ELIMINACION_MANUAL', label: ' Eliminación general', descripcion: 'Eliminar producto sin motivo específico' },
     { valor: 'ERROR_REGISTRO', label: ' Error de registro', descripcion: 'Producto registrado incorrectamente' },
     { valor: 'PRODUCTO_DAÑADO', label: ' Producto dañado', descripcion: 'Mercancía física dañada o defectuosa' },
     { valor: 'DESCONTINUADO', label: ' Descontinuado', descripcion: 'Proveedor ya no fabrica este producto' },
     { valor: 'SIN_DEMANDA', label: ' Sin demanda', descripcion: 'Producto no se vende, sin rotación' }
   ];

   // Crear modal personalizado
   const motivoSeleccionado = await new Promise((resolve) => {
     const modalOverlay = document.createElement('div');
     modalOverlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]';
     
     modalOverlay.innerHTML = `
       <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
         <div class="p-6">
           <!-- Header -->
           <div class="flex items-center justify-between mb-4">
             <h3 class="text-lg font-semibold text-gray-900"> Eliminar Producto</h3>
             <button id="closeModal" class="text-gray-400 hover:text-gray-600 transition-colors">
               <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
               </svg>
             </button>
           </div>
           
           <!-- Producto info -->
           <div class="bg-gray-50 rounded-lg p-3 mb-4">
             <p class="text-sm text-gray-600">Producto a eliminar:</p>
             <p class="font-medium text-gray-900">${item.descripcion}</p>
             <p class="text-xs text-gray-500">ID: ${item.id}</p>
           </div>
           
           <!-- Opciones -->
           <div class="space-y-2 mb-6">
             <p class="text-sm font-medium text-gray-700 mb-3">Selecciona el motivo de eliminación:</p>
             ${motivos.map(motivo => `
               <label class="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors motivoOption">
                 <input type="radio" name="motivo" value="${motivo.valor}" class="mt-1 text-red-600 focus:ring-red-500 border-gray-300">
                 <div class="flex-1">
                   <div class="font-medium text-gray-900">${motivo.label}</div>
                   <div class="text-sm text-gray-500">${motivo.descripcion}</div>
                 </div>
               </label>
             `).join('')}
           </div>
           
           <!-- Botones -->
           <div class="flex space-x-3">
             <button id="cancelarBtn" class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
               Cancelar
             </button>
             <button id="eliminarBtn" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors opacity-50 cursor-not-allowed" disabled>
               Eliminar Producto
             </button>
           </div>
         </div>
       </div>
     `;
     
     document.body.appendChild(modalOverlay);
     
     // Event listeners
     const closeBtn = modalOverlay.querySelector('#closeModal');
     const cancelBtn = modalOverlay.querySelector('#cancelarBtn');
     const eliminarBtn = modalOverlay.querySelector('#eliminarBtn');
     const radioButtons = modalOverlay.querySelectorAll('input[name="motivo"]');
     
     // Habilitar botón cuando se selecciona opción
     radioButtons.forEach(radio => {
       radio.addEventListener('change', () => {
         eliminarBtn.disabled = false;
         eliminarBtn.classList.remove('opacity-50', 'cursor-not-allowed');
         eliminarBtn.classList.add('hover:bg-red-700');
       });
     });
     
     // Cerrar modal
     const cerrarModal = () => {
       document.body.removeChild(modalOverlay);
       resolve(null);
     };
     
     closeBtn.addEventListener('click', cerrarModal);
     cancelBtn.addEventListener('click', cerrarModal);
     modalOverlay.addEventListener('click', (e) => {
       if (e.target === modalOverlay) cerrarModal();
     });
     
     // Confirmar eliminación
     eliminarBtn.addEventListener('click', () => {
       const motivoSeleccionado = modalOverlay.querySelector('input[name="motivo"]:checked')?.value;
       document.body.removeChild(modalOverlay);
       resolve(motivoSeleccionado);
     });
   });

   // Si no seleccionó motivo, cancelar
   if (!motivoSeleccionado) return;

   // Proceder con eliminación
   try {
     await eliminarItem(item.id, { motivo: motivoSeleccionado });

     const motivoLabel = motivos.find(m => m.valor === motivoSeleccionado)?.label || motivoSeleccionado;
     toast.success(`${item.descripcion} eliminado: ${motivoLabel}`);

     //  FORZAR RECARGA DEL INVENTARIO DESPUÉS DE ELIMINAR
     setTimeout(() => {
       obtenerInventario();
     }, 500);
   } catch (error) {
     toast.error('Error al eliminar el item');
     console.error('Error:', error);
   }
 };

 // Función para filtrar items
 const filteredItems = inventario.filter(item => {
   const matchesSearch = item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.codigo_barras?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.observaciones?.toLowerCase().includes(searchTerm.toLowerCase());
   const matchesFilter = filterType === 'todos' || item.tipo === filterType;
   const isActive = hideInactive ? item.activo !== false : true;
   return matchesSearch && matchesFilter && isActive;
 });

 // Obtener estadísticas
 const stats = obtenerEstadisticas();

 // Función corregida para stock bajo
 const getStockBajo = () => {
   return inventario.filter(item => {
     if (item.tipo === 'servicio') return false;
     const stockActual = parseInt(item.stock) || 0;
     const stockMinimo = parseInt(item.stock_minimo) || 5;
     return stockActual <= stockMinimo;
   });
 };

 const itemsStockBajo = getStockBajo();

 //  EFECTO PARA ANIMACIÓN DE SALIDA
 useEffect(() => {
   if (!isOpen && isClosing) {
     const timer = setTimeout(() => {
       setIsClosing(false);
     }, 200);
     return () => clearTimeout(timer);
   }
 }, [isOpen, isClosing]);

 // Función de cierre con animación
 const handleClose = () => {
   setIsClosing(true);
   setTimeout(() => {
     onClose();
   }, 200);
 };

 // También actualiza la función getIconoTipo
 const getIconoTipo = (tipo) => {
   switch(tipo) {
     case 'producto': return <ShoppingCart className="h-3 w-3" />;
     case 'servicio': return <Wrench className="h-3 w-3" />;
     case 'electrobar': return <Coffee className="h-3 w-3" />;
     default: return <Package className="h-3 w-3" />;
   }
 };

 // Función para obtener color por tipo
 const getColorTipo = (tipo) => {
   switch(tipo) {
     case 'producto': return 'bg-blue-100 text-blue-700 border-blue-200';
     case 'servicio': return 'bg-green-100 text-green-700 border-green-200';
     case 'electrobar': return 'bg-orange-100 text-orange-700 border-orange-200';
     default: return 'bg-gray-100 text-gray-700 border-gray-200';
   }
 };

 // Función para obtener label del tipo
 const getLabelTipo = (tipo) => {
   switch(tipo) {
     case 'producto': return 'Productos';
     case 'servicio': return 'Servicios';
     case 'electrobar': return 'Electrobar';
     default: return 'Todos';
   }
 };

 // Opciones del filtro con iconos
 const filterOptions = [
   { value: 'todos', label: 'Todos', icon: Package, color: 'text-gray-600' },
   { value: 'producto', label: 'Productos', icon: ShoppingCart, color: 'text-blue-600' },
   { value: 'servicio', label: 'Servicios', icon: Wrench, color: 'text-green-600' },
   { value: 'electrobar', label: 'Electrobar', icon: Coffee, color: 'text-orange-600' }
 ];

 if (!isOpen) return null;

 return (
   <>
     <div
       className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 ${className}`}
       onClick={(e) => {
         console.log(' [InventoryManagerModal] Clic en backdrop padre:', {
           showItemForm,
           showViewModal,
           showCargaMasiva,
           isCurrentTarget: e.target === e.currentTarget
         });
         //  NO cerrar si hay un modal hijo abierto
         if (showItemForm || showViewModal || showCargaMasiva) {
           console.log(' [InventoryManagerModal] Modal hijo abierto, ignorando clic en backdrop');
           return;
         }
         // Solo cerrar si se hace clic en el backdrop
         if (e.target === e.currentTarget) {
           console.log(' [InventoryManagerModal] Cerrando modal padre por clic en backdrop');
           handleClose();
         }
       }}
     >
       <div
         className={`bg-white rounded-lg sm:rounded-xl shadow-2xl w-full sm:max-w-[85vw] h-[98vh] sm:h-[95vh] overflow-hidden flex flex-col ${
           isClosing ? 'animate-modal-exit' : ''
         }`}
         onClick={(e) => e.stopPropagation()} //  Prevenir propagación de clics
       >

         {/* Header mejorado con estadísticas compactas - UNA SOLA FILA */}
         <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 flex-shrink-0">
           <div className="px-3 sm:px-6 py-3 sm:py-4 text-white">
             <div className="flex items-center justify-between gap-3 sm:gap-4">
               {/* Lado izquierdo: Título */}
               <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                 <div className="bg-white/20 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                   <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                 </div>
                 <div>
                   <h2 className="text-base sm:text-xl font-bold">Gestión de Inventario</h2>
                   <div className="text-xs text-indigo-100 mt-0.5 hidden sm:block">
                     Administra productos, servicios y electrobar
                   </div>
                 </div>
               </div>

               {/* Lado derecho: Estadísticas y botón cerrar - UNA SOLA FILA */}
               <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
                 {/* Total Items - Compacto */}
                 <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-white/20 flex-shrink-0">
                   <div className="flex items-center space-x-1.5 sm:space-x-2">
                     <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80" />
                     <div>
                       <div className="text-sm sm:text-base font-bold">{stats.total}</div>
                       <div className="text-[9px] sm:text-[10px] text-white/70">Items</div>
                     </div>
                   </div>
                 </div>

                 {/* Valor Total Rotativo - Compacto */}
                 <div
                   className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-white/20 cursor-pointer hover:bg-white/20 transition-all group flex-shrink-0"
                   onClick={() => {
                     setIsRotating(true);
                     setTimeout(() => {
                       setValorTotalType(prev => {
                         const types = ['total', 'productos', 'electrobar'];
                         const currentIndex = types.indexOf(prev);
                         return types[(currentIndex + 1) % types.length];
                       });
                       setIsRotating(false);
                     }, 150);
                   }}
                 >
                   <div className="flex items-center space-x-1.5 sm:space-x-2">
                     <DollarSign className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80 transition-transform duration-300 ${isRotating ? 'rotate-180' : ''}`} />
                     <div>
                       <div className="text-sm sm:text-base font-bold">
                         ${(() => {
                           switch(valorTotalType) {
                             case 'productos': return stats.valorTotalProductos?.toFixed(0) || '0';
                             case 'electrobar': return stats.valorTotalElectrobar?.toFixed(0) || '0';
                             default: return stats.valorTotal.toFixed(0);
                           }
                         })()}
                       </div>
                       <div className="text-[9px] sm:text-[10px] text-white/70 flex items-center space-x-1">
                         <span>
                           {(() => {
                             switch(valorTotalType) {
                               case 'productos': return 'Prod.';
                               case 'electrobar': return 'Elec.';
                               default: return 'Total';
                             }
                           })()}
                         </span>
                         <svg className="w-2 h-2 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                         </svg>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Stock Bajo - Compacto */}
                 <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-white/20 flex-shrink-0">
                   <div className="flex items-center space-x-1.5 sm:space-x-2">
                     <AlertCircle className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${itemsStockBajo.length > 0 ? 'text-red-300' : 'text-green-300'}`} />
                     <div>
                       <div className="text-sm sm:text-base font-bold">{itemsStockBajo.length}</div>
                       <div className="text-[9px] sm:text-[10px] text-white/70">Stock</div>
                     </div>
                   </div>
                 </div>

                 {/* Inactivos - Compacto */}
                 <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-white/20 flex-shrink-0">
                   <div className="flex items-center space-x-1.5 sm:space-x-2">
                     <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-300" />
                     <div>
                       <div className="text-sm sm:text-base font-bold">
                         {inventario.filter(item => item.activo === false).length}
                       </div>
                       <div className="text-[9px] sm:text-[10px] text-white/70 hidden sm:block">Inactivos</div>
                     </div>
                   </div>
                 </div>

                 {/* Botón cerrar */}
                 <button
                   onClick={handleClose}
                   className="bg-white/20 hover:bg-white/30 p-1.5 sm:p-2 rounded-lg transition-colors group flex-shrink-0"
                 >
                   <X className="h-4 w-4 sm:h-5 sm:w-5 group-hover:rotate-90 transition-transform" />
                 </button>
               </div>
             </div>
           </div>
         </div>

         {/* Contenido principal mejorado - Ocupar espacio restante - RESPONSIVE */}
         <div className="flex-1 flex flex-col overflow-hidden">

           {/* Controles superiores - RESPONSIVE */}
           <div className="flex-shrink-0 p-3 sm:p-6 bg-white border-b border-gray-200">
               <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                 {/* Search mejorado - RESPONSIVE */}
                 <div className="relative flex-1">
                   <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                   <input
                     type="text"
                     placeholder="Buscar producto..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                   />
                 </div>

              {/* Dropdown de filtros con iconos - RESPONSIVE */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm font-medium flex items-center space-x-2 min-w-[140px] sm:min-w-[160px] hover:bg-gray-50 transition-colors"
                 >
                  <span className={`flex items-center space-x-2 flex-1 ${filterOptions.find(opt => opt.value === filterType)?.color || 'text-gray-600'}`}>
                    {(() => {
                      const selectedOption = filterOptions.find(opt => opt.value === filterType);
                      const IconComponent = selectedOption?.icon || Package;
                      return <IconComponent className="h-4 w-4" />;
                    })()}
                    <span>{getLabelTipo(filterType)}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {isFilterDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[5]" 
                      onClick={() => setIsFilterDropdownOpen(false)}
                    />
                    <div className="absolute z-[15] mt-1 w-full bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-lg overflow-hidden">
                      {filterOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setFilterType(option.value);
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base flex items-center space-x-2 hover:bg-gray-50 transition-colors ${
                              filterType === option.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                            }`}
                          >
                            <IconComponent className={`h-4 w-4 ${option.color}`} />
                            <span className="flex-1 text-left">{option.label}</span>
                            {filterType === option.value && (
                              <CheckCircle className="h-4 w-4 text-indigo-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

                 <button
                     onClick={() => setHideInactive(!hideInactive)}
                     className={`px-5 py-3 rounded-xl border transition-all shadow-sm hover:shadow-md ${
                       hideInactive 
                         ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                         : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                     }`}
                     title={hideInactive ? 'Mostrar inactivos' : 'Ocultar inactivos'}
                   >
                     {hideInactive ? (
                       <XCircle className="h-5 w-5" />
                     ) : (
                       <CheckCircle className="h-5 w-5" />
                     )}
                   </button>

              {/* Botones de acción - EN LA MISMA FILA */}
               {/* Solo Admin puede agregar items */}
              {usuario?.rol === 'admin' && (
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       handleNewItem();
                     }}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md text-sm sm:text-base"
                   >
                     <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                     <span>Agregar Item</span>
                   </button>
                 )}

                 {/* Admin y Supervisor pueden cargar items */}
                 {(usuario?.rol === 'admin' || usuario?.rol === 'supervisor') && (
                   <button
                     onClick={() => setShowCargaMasiva(true)}
                     className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md text-sm sm:text-base"
                   >
                     <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                     <span>Cargar Items</span>
                   </button>
                 )}
             </div>
           </div>

           {/* Área de tabla - Scrolleable horizontal y vertical para móvil */}
           <div className="flex-1 overflow-auto p-3 sm:p-6">
             {/* Tabla completamente adaptable - CON ICONOS LUCIDE */}
             {filteredItems.length === 0 ? (
               <div className="text-center py-12">
                 <div className="bg-gray-100/70 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/30">
                   <Package className="h-8 w-8 text-gray-400" />
                 </div>
                 <h3 className="text-lg font-semibold text-gray-600 mb-2">
                   {searchTerm || filterType !== 'todos' ? 'No se encontraron items' : 'Inventario vacío'}
                 </h3>
                 <p className="text-gray-500 mb-4">
                   {searchTerm || filterType !== 'todos' 
                     ? 'Prueba ajustando los filtros de búsqueda'
                     : 'Comienza agregando productos, servicios y items de electrobar'
                   }
                 </p>
                 {!searchTerm && filterType === 'todos' && usuario?.rol === 'admin' && (
                   <button
                     onClick={handleNewItem}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                   >
                     Agregar primer item
                   </button>
                 )}
               </div>
             ) : (
               <>
                 {/*  Indicador de scroll horizontal para móvil */}
                 <div className="sm:hidden bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 flex items-center justify-center space-x-2 text-blue-700 text-xs">
                   <span> Desliza para ver más columnas </span>
                 </div>

                 <div className="bg-white rounded-lg sm:rounded-2xl border border-gray-200 shadow-lg overflow-x-auto">
                   <table className="w-full min-w-[1200px]">
                   <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                     <tr>
                       <th className="w-[8%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Hash className="h-3 w-3" />
                           <span>ID</span>
                         </div>
                       </th>

                       <th className="w-[8%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Image className="h-3 w-3" />
                           <span>Img</span>
                         </div>
                       </th>

                       <th className="w-[25%] px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Package className="h-3 w-3" />
                           <span>Descripción</span>
                         </div>
                       </th>

                       <th className="w-[12%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <BarChart3 className="h-3 w-3" />
                           <span>Código</span>
                         </div>
                       </th>

                       {/* Tipo con icono */}
                       <th className="w-[8%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Tag className="h-3 w-3" />
                           <span>Tipo</span>
                         </div>
                       </th>

                       <th className="w-[10%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <DollarSign className="h-3 w-3" />
                           <span>Precio</span>
                         </div>
                       </th>

                       {/* Stock con icono */}
                       <th className="w-[8%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Boxes className="h-3 w-3" />
                           <span>Stock</span>
                         </div>
                       </th>

                       {/* Proveedor con icono */}
                       <th className="w-[13%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Store className="h-3 w-3" />
                           <span>Proveedor</span>
                         </div>
                       </th>

                       {/* Estado con icono */}
                       <th className="w-[8%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Circle className="h-3 w-3" />
                           <span>Estado</span>
                         </div>
                       </th>

                       {/* Acciones con icono */}
                       <th className="w-[12%] px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <div className="flex items-center justify-center space-x-1">
                           <Settings className="h-3 w-3" />
                           <span>Acciones</span>
                         </div>
                       </th>
                     </tr>
                   </thead>

                   <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredItems.map((item) => (
                       <tr key={item.id} className="hover:bg-indigo-200/100 transition-colors group">
                         {/* ID - Compacto */}
                         <td className="px-2 py-3 text-center w-[8%]">
                           <div className="text-xs font-mono text-gray-500 truncate flex items-center justify-center" title={`#${item.id}`}>
                             <Hash className="h-3 w-3 mr-1" />
                             {item.id}
                           </div>
                         </td>

                         {/* Imagen - Más pequeña */}
                         <td className="px-2 py-3 text-center w-[8%]">
                           {item.imagen_url ? (
                             <img 
                               src={getImageUrl(item.imagen_url)} 
                               alt={item.descripcion}
                               className="w-10 h-10 object-cover rounded-lg border border-gray-200 shadow-sm mx-auto"
                               onError={(e) => {
                                 e.target.style.display = 'none';
                                 e.target.nextSibling.style.display = 'flex';
                               }}
                             />
                           ) : (
                             <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-200 flex items-center justify-center mx-auto text-gray-500">
                               {getIconoTipo(item.tipo)}
                             </div>
                           )}
                         </td>
                         
                         {/* Descripción - Expandida con tooltip */}
                         <td className="px-3 py-3 w-[25%]">
                           <div className="space-y-1">
                             <div 
                               className="font-medium text-gray-900 text-sm truncate cursor-help" 
                               title={item.descripcion}
                             >
                               {item.descripcion}
                             </div>
                             <div className="flex items-center space-x-2 text-xs">
                              {item.categoria && (
                                 <span className="text-gray-500 truncate flex items-center" title={item.categoria}>
                                   <Folder className="h-3 w-3 mr-1" />
                                   {item.categoria}
                                 </span>
                               )}
                               {item.codigo_interno && (
                                 <span className="text-gray-400 font-mono truncate" title={item.codigo_interno}>
                                   {item.codigo_interno}
                                 </span>
                               )}
                             </div>
                           </div>
                         </td>

                         {/* Código de Barras - Truncado */}
                         <td className="px-2 py-3 text-center w-[12%]">
                           {item.codigo_barras ? (
                             <div 
                               className="font-mono text-xs bg-gray-100 px-1 py-1 rounded border truncate cursor-help" 
                               title={item.codigo_barras}
                             >
                               {item.codigo_barras}
                             </div>
                           ) : (
                             <span className="text-gray-400 text-xs">Sin código</span>
                           )}
                         </td>
                         
                         {/* Tipo - Compacto */}
                         <td className="px-2 py-3 text-center w-[8%]">
                           <span 
                             className={`inline-flex items-center px-1 py-1 text-xs font-medium rounded-full border ${getColorTipo(item.tipo)}`}
                             title={item.tipo === 'producto' ? 'Producto' : item.tipo === 'servicio' ? 'Servicio' : 'Electrobar'}
                           >
                             {item.tipo === 'producto' ? (
                               <>
                                 <ShoppingCart className="h-3 w-3 mr-1" />
                                 Prod
                               </>
                             ) : item.tipo === 'servicio' ? (
                               <>
                                 <Wrench className="h-3 w-3 mr-1" />
                                 Serv
                               </>
                             ) : (
                               <>
                                 <Coffee className="h-3 w-3 mr-1" />
                                 Elec
                               </>
                             )}
                           </span>
                         </td>
                         
                         {/* Precio - Compacto */}
                         <td className="px-2 py-3 text-center w-[10%]">
                           <div className="space-y-1">
                             <div className="font-bold text-gray-900 text-sm flex items-center justify-center">
                               <DollarSign className="h-3 w-3" />
                               {item.precio.toFixed(1)}
                             </div>
                             {item.precio_costo && (
                               <div className="text-xs text-gray-500 flex items-center justify-center">
                                 <DollarSign className="h-2 w-2" />
                                 {parseFloat(item.precio_costo || 0).toFixed(1)}
                               </div>
                             )}
                           </div>
                         </td>
                         
                         {/* Stock - Compacto */}
                         <td className="px-2 py-3 text-center w-[8%]">
                           {item.tipo === 'servicio' ? (
                             <span className="text-gray-400 text-xs">N/A</span>
                           ) : (
                             <div className="space-y-1">
                               <span className={`inline-flex items-center px-1 py-1 text-xs font-medium rounded-full ${
                                 item.stock === 0 ? 'bg-red-100 text-red-700' :
                                 (item.stock_minimo && item.stock <= item.stock_minimo) ? 'bg-orange-100 text-orange-700' :
                                 'bg-green-100 text-green-700'
                               }`}>
                                 {item.stock}
                                 {item.stock === 0 && <XCircle className="h-3 w-3 ml-1" />}
                                 {item.stock_minimo && item.stock <= item.stock_minimo && item.stock > 0 && <AlertTriangle className="h-3 w-3 ml-1" />}
                               </span>
                               {item.stock_minimo && (
                                 <div className="text-xs text-gray-400">
                                   {item.stock_minimo}
                                 </div>
                               )}
                             </div>
                           )}
                         </td>

                         {/* Proveedor - Truncado */}
                         <td className="px-2 py-3 text-center w-[13%]">
                           {item.proveedor ? (
                             <div className="space-y-1">
                               <div 
                                 className="text-sm font-medium text-gray-900 truncate cursor-help" 
                                 title={item.proveedor}
                               >
                                 {item.proveedor}
                               </div>
                               {item.telefono_proveedor && (
                                 <div 
                                   className="text-xs text-gray-500 truncate cursor-help flex items-center justify-center"
                                   title={item.telefono_proveedor}
                                 >
                                   <Phone className="h-3 w-3 mr-1" />
                                   {item.telefono_proveedor}
                                 </div>
                               )}
                             </div>
                           ) : (
                             <span className="text-gray-400 text-xs">Sin prov.</span>
                           )}
                         </td>

                         {/* Estado - Compacto */}
                         <td className="px-2 py-3 text-center w-[8%]">
                           <span className={`inline-flex items-center px-1 py-1 text-xs font-medium rounded-full ${
                             item.activo !== false 
                               ? 'bg-green-100 text-green-700 border border-green-200' 
                               : 'bg-red-100 text-red-700 border border-red-200'
                           }`}>
                             {item.activo !== false ? (
                               <CheckCircle className="h-3 w-3" />
                             ) : (
                               <XCircle className="h-3 w-3" />
                             )}
                           </span>
                         </td>
                         
                         {/* Acciones - Perfectamente visible */}
                         <td className="px-2 py-3 text-center w-[12%]">
                           <div className="flex justify-center space-x-1">
                             {/* Ver - Todos los roles */}
                             <button
                               onClick={() => handleViewItem(item)}
                               className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-all"
                               title="Ver producto"
                             >
                               <Eye className="h-4 w-4" />
                             </button>
                             
                             {/* Editar - Solo Admin */}
                             {usuario?.rol === 'admin' && (
                               <button
                                 onClick={() => handleEditItem(item)}
                                 className="text-indigo-600 hover:text-indigo-700 p-1.5 hover:bg-indigo-50 rounded-lg transition-all"
                                 title="Editar producto"
                               >
                                 <Edit2 className="h-4 w-4" />
                               </button>
                             )}
                             
                             {/* Borrar - Solo Admin */}
                             {usuario?.rol === 'admin' && (
                               <button
                                 onClick={() => handleDeleteItem(item)}
                                 className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                 title="Eliminar producto"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </button>
                             )}
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>

                 {/* Footer con estadísticas */}
                 <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-center">
                   <div className="text-xs text-gray-500 flex items-center justify-center space-x-1">
                     <BarChart3 className="h-3 w-3" />
                     <span>Mostrando {filteredItems.length} de {inventario.length} items</span>
                   </div>
                 </div>
               </div>
             </>
           )}
           </div>
         </div>
       </div>
     </div>

     {/* Modal del formulario -  NO INTERFERIR CON SU CIERRE */}
     <ItemFormModal
       isOpen={showItemForm}
       onClose={() => {
         //  Agregar pequeño delay para evitar conflictos
         setTimeout(() => {
           setShowItemForm(false);
           setEditingItem(null);
         }, 100);
       }}
       item={editingItem}
       onSave={handleItemSaved}
     />

     {/* Modal de vista del producto */}
     <ProductViewModal
       isOpen={showViewModal}
       onClose={() => {
         setShowViewModal(false);
         setSelectedProduct(null);
       }}
       product={selectedProduct}
       tasaCambio={tasaCambio}
     />

     {/* Modal de carga masiva */}
     <CargaMasivaModal
       isOpen={showCargaMasiva}
       onClose={() => setShowCargaMasiva(false)}
       onSuccess={() => {
         toast.success('Inventario actualizado');
         //  FORZAR RECARGA DESPUÉS DE CARGA MASIVA
         setTimeout(() => {
           obtenerInventario();
         }, 500);
       }}
     />
   </>
 );
};

export default InventoryManagerModal;