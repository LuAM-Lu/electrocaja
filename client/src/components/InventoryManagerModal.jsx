// components/InventoryManagerModal.jsx
import React, { useState, useEffect } from 'react';

import {
  X, Package, Plus, Edit2, Trash2, Search,
  Eye, DollarSign, AlertCircle, Hash, Image,
  Folder, Phone, CheckCircle, XCircle, BarChart3,
  AlertTriangle, ShoppingCart, Wrench, Coffee, Tag, Boxes, Store, Circle, Settings, ChevronDown, FileJson, Calculator, Globe, RefreshCw, Printer, MapPin
} from 'lucide-react';
import { useInventarioStore } from '../store/inventarioStore';
import { useAuthStore } from '../store/authStore';
import ItemFormModal from './inventario/ItemFormModal';
import toast from '../utils/toast.jsx';
import { useCajaStore } from '../store/cajaStore';
import ProductViewModal from './ProductViewModal';
import CargaMasivaModal from './inventario/CargaMasivaModal';
import RespaldoJsonModal from './inventario/RespaldoJsonModal';
import AjusteMasivoModal from './inventario/AjusteMasivoModal';
import ConexionApiModal from './inventario/ConexionApiModal';
import PrintInventarioModal from './inventario/PrintInventarioModal';
import { getImageUrl, API_CONFIG } from '../config/api';

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
  const [showRespaldoJson, setShowRespaldoJson] = useState(false);
  const [showAjusteMasivo, setShowAjusteMasivo] = useState(false);
  const [showConexionApi, setShowConexionApi] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  //  ESTADO PARA ANIMACIÓN DE SALIDA
  const [isClosing, setIsClosing] = useState(false);

  // Estados para animaciones del header
  const [valorTotalType, setValorTotalType] = useState('total');
  const [isRotating, setIsRotating] = useState(false);

  // Estado para tasas de cambio
  const [tasas, setTasas] = useState({
    bcv: null,
    paralelo: null,
    euro: null,
    usdt: null,
    promedio: null,
    brecha: null,
    brechaPar: null,
    brechaUsdt: null,
    loading: true,
    lastUpdate: null
  });

  // Obtener tasas de cambio
  useEffect(() => {
    const fetchTasas = async () => {
      try {
        // Intentar primero nuestro servidor (incluye USDT)
        const serverRes = await fetch(`${API_CONFIG.BASE_URL}/tasas`);

        if (serverRes.ok) {
          const serverData = await serverRes.json();
          if (serverData.success) {
            setTasas({
              bcv: serverData.data.bcv,
              paralelo: serverData.data.paralelo,
              euro: serverData.data.euro,
              usdt: serverData.data.usdt,
              promedio: serverData.data.promedio,
              brecha: serverData.data.brecha,
              brechaPar: serverData.data.brechaPar,
              brechaUsdt: serverData.data.brechaUsdt,
              loading: false,
              lastUpdate: new Date()
            });
            return;
          }
        }

        // Fallback a DolarAPI si el servidor falla
        const response = await fetch('https://ve.dolarapi.com/v1/dolares');
        if (!response.ok) throw new Error('Error en API');

        const data = await response.json();
        const bcvData = data.find(t => t.fuente === 'oficial');
        const paraleloData = data.find(t => t.fuente === 'paralelo');

        setTasas({
          bcv: bcvData?.promedio || null,
          paralelo: paraleloData?.promedio || null,
          euro: bcvData?.promedio ? bcvData.promedio * 1.17 : null,
          usdt: null,
          loading: false,
          lastUpdate: new Date()
        });
      } catch (error) {
        setTasas(prev => ({ ...prev, loading: false }));
      }
    };

    if (isOpen) {
      fetchTasas();
    }
  }, [isOpen]);

  // Función para refrescar tasas manualmente
  const refreshTasas = async () => {
    setTasas(prev => ({ ...prev, loading: true }));
    try {
      const serverRes = await fetch(`${API_CONFIG.BASE_URL}/tasas`);
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData.success) {
          setTasas({
            bcv: serverData.data.bcv,
            paralelo: serverData.data.paralelo,
            euro: serverData.data.euro,
            usdt: serverData.data.usdt,
            promedio: serverData.data.promedio,
            brecha: serverData.data.brecha,
            brechaPar: serverData.data.brechaPar,
            brechaUsdt: serverData.data.brechaUsdt,
            loading: false,
            lastUpdate: new Date()
          });
          return;
        }
      }
      // Fallback
      const response = await fetch('https://ve.dolarapi.com/v1/dolares');
      if (response.ok) {
        const data = await response.json();
        const bcvData = data.find(t => t.fuente === 'oficial');
        const paraleloData = data.find(t => t.fuente === 'paralelo');
        setTasas({
          bcv: bcvData?.promedio || null,
          paralelo: paraleloData?.promedio || null,
          euro: bcvData?.promedio ? bcvData.promedio * 1.17 : null,
          usdt: null,
          loading: false,
          lastUpdate: new Date()
        });
      }
    } catch (error) {
      setTasas(prev => ({ ...prev, loading: false }));
    }
  };

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
    switch (tipo) {
      case 'producto': return <ShoppingCart className="h-3 w-3" />;
      case 'servicio': return <Wrench className="h-3 w-3" />;
      case 'electrobar': return <Coffee className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  // Función para obtener color por tipo
  const getColorTipo = (tipo) => {
    switch (tipo) {
      case 'producto': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'servicio': return 'bg-green-100 text-green-700 border-green-200';
      case 'electrobar': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Función para obtener label del tipo
  const getLabelTipo = (tipo) => {
    switch (tipo) {
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
          className={`bg-white rounded-lg sm:rounded-xl shadow-2xl w-full sm:max-w-[85vw] h-[98vh] sm:h-[95vh] overflow-hidden flex flex-col ${isClosing ? 'animate-modal-exit' : ''
            }`}
          onClick={(e) => e.stopPropagation()} //  Prevenir propagación de clics
        >

          {/* 🎨 HEADER PREMIUM - Tasa BCV + Fecha + Título */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 flex-shrink-0">
            <div className="px-4 sm:px-6 py-3 sm:py-4 text-white">
              <div className="flex items-center justify-between gap-4">
                {/* Lado izquierdo: Título */}
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                  <div className="bg-white/20 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl border border-white/10 shadow-lg">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight">Gestión de Inventario</h2>
                    <div className="text-xs text-indigo-200 mt-0.5 hidden sm:block">
                      ElectroCaja • Sistema de Control
                    </div>
                  </div>
                </div>

                {/* Centro: Tasas de Cambio Compactas - Full Responsive */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                    {/* Tasa BCV - Siempre visible */}
                    <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs">
                      <span className="text-white/60 font-medium">BCV</span>
                      <span className="font-bold text-white">{tasaCambio?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Tasa Euro */}
                    {tasas.euro && (
                      <div className="hidden sm:flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs">
                        <span className="text-purple-300 font-medium">EUR</span>
                        <span className="font-bold text-white">{tasas.euro?.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Tasa Paralelo */}
                    {tasas.paralelo && (
                      <div className="hidden md:flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs">
                        <span className="text-orange-300 font-medium">PAR</span>
                        <span className="font-bold text-white">{tasas.paralelo?.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Tasa USDT */}
                    {tasas.usdt && (
                      <div className="hidden lg:flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs">
                        <span className="text-blue-300 font-medium">USDT</span>
                        <span className="font-bold text-white">{tasas.usdt?.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Promedio */}
                    {tasas.promedio && (
                      <div className="hidden xl:flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs">
                        <span className="text-cyan-300 font-medium">PROM</span>
                        <span className="font-bold text-white">{tasas.promedio?.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Brecha % */}
                    {(tasas.brecha || tasas.brechaPar) && (
                      <div className="hidden xl:flex items-center bg-white/10 px-2 py-1 rounded-lg text-xs">
                        <span className={`font-bold ${(tasas.brecha || tasas.brechaPar) > 50 ? 'text-red-300' : (tasas.brecha || tasas.brechaPar) > 20 ? 'text-yellow-300' : 'text-green-300'}`}>
                          +{(tasas.brecha || tasas.brechaPar)?.toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {/* Fecha Actual - Solo en pantallas grandes */}
                    <div className="hidden lg:flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs">
                      <svg className="h-3 w-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-white">
                        {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    {/* Botón refrescar tasas */}
                    <button
                      onClick={refreshTasas}
                      disabled={tasas.loading}
                      className="flex items-center bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-xs transition-all"
                      title="Actualizar tasas"
                    >
                      <RefreshCw className={`h-3 w-3 text-white/80 ${tasas.loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Lado derecho: Botón cerrar */}
                <button
                  onClick={handleClose}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 sm:p-2.5 rounded-xl transition-all group border border-white/10 shadow-lg hover:shadow-xl"
                >
                  <X className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Contenido principal mejorado - Ocupar espacio restante - RESPONSIVE */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Controles superiores - TODO EN UNA FILA */}
            <div className="flex-shrink-0 p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">

                {/* 📊 Estadísticas compactas - Ocultar algunas en móvil */}
                {/* Total Items */}
                <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm min-w-[90px]">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-md flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{stats.total}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">Items</div>
                  </div>
                </div>

                {/* Valor Total Rotativo */}
                <div
                  className="hidden md:flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-green-300 transition-all group min-w-[100px]"
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
                  <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-md flex items-center justify-center">
                    <DollarSign className={`h-3.5 w-3.5 text-white transition-transform duration-300 ${isRotating ? 'rotate-180' : ''}`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      ${(() => {
                        switch (valorTotalType) {
                          case 'productos': return stats.valorTotalProductos?.toFixed(0) || '0';
                          case 'electrobar': return stats.valorTotalElectrobar?.toFixed(0) || '0';
                          default: return stats.valorTotal?.toFixed(0) || '0';
                        }
                      })()}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      {valorTotalType === 'productos' ? 'Prod' : valorTotalType === 'electrobar' ? 'Elec' : 'Total'}
                      <svg className="w-2 h-2 opacity-40 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Inactivos */}
                <div className="hidden xl:flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm min-w-[90px]">
                  <div className="w-7 h-7 bg-gradient-to-br from-gray-400 to-gray-500 rounded-md flex items-center justify-center">
                    <XCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-700">{inventario.filter(item => item.activo === false).length}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">Inactivos</div>
                  </div>
                </div>

                {/* Separador visual */}
                <div className="hidden sm:block w-px h-8 bg-gray-300" />

                {/* 🔍 Búsqueda - Siempre visible, ocupa espacio restante */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nombre, código, proveedor, categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
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
                              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base flex items-center space-x-2 hover:bg-gray-50 transition-colors ${filterType === option.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
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

                {/* 🔧 MENÚ DE ADMINISTRACIÓN - Solo Admin */}
                {usuario?.rol === 'admin' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowAdminMenu(!showAdminMenu)}
                      className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline">Menú Inventario</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAdminMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showAdminMenu && (
                      <>
                        <div className="fixed inset-0 z-[10]" onClick={() => setShowAdminMenu(false)} />
                        <div className="absolute right-0 z-[20] mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                          {/* Header del menú */}
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 border-b border-gray-200">
                            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Menú Inventario</span>
                          </div>

                          {/* Opciones */}
                          <div className="py-1">
                            {/* Mostrar/Ocultar Inactivos */}
                            <button
                              onClick={() => { setHideInactive(!hideInactive); setShowAdminMenu(false); }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              {hideInactive ? <XCircle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                              <div>
                                <div className="font-medium text-gray-900">{hideInactive ? 'Mostrar Inactivos' : 'Ocultar Inactivos'}</div>
                                <div className="text-xs text-gray-500">{hideInactive ? 'Ver productos desactivados' : 'Solo productos activos'}</div>
                              </div>
                            </button>

                            <div className="border-t border-gray-100 my-1" />

                            {/* Agregar Item */}
                            <button
                              onClick={() => { handleNewItem(); setShowAdminMenu(false); }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <Plus className="h-5 w-5 text-indigo-500" />
                              <div>
                                <div className="font-medium text-gray-900">Agregar Item</div>
                                <div className="text-xs text-gray-500">Crear nuevo producto o servicio</div>
                              </div>
                            </button>

                            {/* Cargar Items */}
                            <button
                              onClick={() => { setShowCargaMasiva(true); setShowAdminMenu(false); }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <Package className="h-5 w-5 text-green-500" />
                              <div>
                                <div className="font-medium text-gray-900">Cargar Items</div>
                                <div className="text-xs text-gray-500">Importación masiva desde archivo</div>
                              </div>
                            </button>

                            <div className="border-t border-gray-100 my-1" />

                            {/* Respaldo JSON */}
                            <button
                              onClick={() => { setShowRespaldoJson(true); setShowAdminMenu(false); }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <FileJson className="h-5 w-5 text-emerald-500" />
                              <div>
                                <div className="font-medium text-gray-900">Respaldo JSON</div>
                                <div className="text-xs text-gray-500">Exportar inventario completo</div>
                              </div>
                            </button>

                            {/* Ajuste Masivo */}
                            <button
                              onClick={() => { setShowAjusteMasivo(true); setShowAdminMenu(false); }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <Calculator className="h-5 w-5 text-amber-500" />
                              <div>
                                <div className="font-medium text-gray-900">Ajuste Masivo</div>
                                <div className="text-xs text-gray-500">Modificar precios y ganancias</div>
                              </div>
                            </button>

                            <div className="border-t border-gray-100 my-1" />

                            {/* Imprimir Inventario */}
                            <button
                              onClick={() => { setShowPrintModal(true); setShowAdminMenu(false); }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <Printer className="h-5 w-5 text-blue-500" />
                              <div>
                                <div className="font-medium text-gray-900">Imprimir Inventario</div>
                                <div className="text-xs text-gray-500">Generar listado para impresión</div>
                              </div>
                            </button>

                            <div className="border-t border-gray-100 my-1" />

                            {/* Conexión API */}
                            <button
                              onClick={() => { setShowConexionApi(true); setShowAdminMenu(false); }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <Globe className="h-5 w-5 text-purple-500" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">Conexión API</div>
                                <div className="text-xs text-gray-500">Sincronizar con tienda web</div>
                              </div>
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pronto</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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

                  <div className="bg-white rounded-lg sm:rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                    <table className="w-full table-fixed">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="w-[5%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center">
                              <Hash className="h-3 w-3" />
                            </div>
                          </th>

                          <th className="w-[5%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center">
                              <Image className="h-3 w-3" />
                            </div>
                          </th>

                          <th className="w-[22%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>Descripción</span>
                            </div>
                          </th>

                          <th className="w-[12%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              <span>Código</span>
                            </div>
                          </th>

                          <th className="w-[7%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center">
                              <Tag className="h-3 w-3" />
                            </div>
                          </th>

                          <th className="w-[10%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>Precio</span>
                            </div>
                          </th>

                          <th className="w-[7%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center">
                              <Boxes className="h-3 w-3" />
                            </div>
                          </th>

                          <th className="w-[8%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="hidden lg:inline">Ubic.</span>
                            </div>
                          </th>

                          <th className="w-[8%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <Store className="h-3 w-3" />
                              <span className="hidden lg:inline">Prov.</span>
                            </div>
                          </th>

                          <th className="w-[6%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase">
                            <div className="flex items-center justify-center">
                              <Circle className="h-3 w-3" />
                            </div>
                          </th>

                          <th className="w-[10%] px-1 py-2 text-center text-[10px] font-bold text-gray-700 uppercase bg-gray-100/80">
                            <div className="flex items-center justify-center gap-1">
                              <Settings className="h-3 w-3" />
                              <span className="hidden sm:inline">Acc.</span>
                            </div>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-indigo-50 transition-colors group cursor-pointer"
                            onClick={() => handleViewItem(item)}
                          >
                            {/* ID - Compacto */}
                            <td className="px-1 py-2 text-center">
                              <div className="text-[10px] font-mono text-gray-400 truncate" title={`#${item.id}`}>
                                {item.id}
                              </div>
                            </td>

                            {/* Imagen - Más pequeña */}
                            <td className="px-1 py-2 text-center">
                              {item.imagen_url ? (
                                <img
                                  src={getImageUrl(item.imagen_url)}
                                  alt={item.descripcion}
                                  className="w-8 h-8 object-cover rounded border border-gray-200 mx-auto"
                                  onError={(e) => {
                                    if (e.target) e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
                                  {getIconoTipo(item.tipo)}
                                </div>
                              )}
                            </td>

                            {/* Descripción */}
                            <td className="px-1 py-2">
                              <div
                                className="font-medium text-gray-900 text-xs truncate cursor-help"
                                title={item.descripcion}
                              >
                                {item.descripcion}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {item.categoria || ''}
                              </div>
                            </td>

                            {/* Código de Barras */}
                            <td className="px-1 py-2 text-center">
                              <div
                                className="font-mono text-[10px] text-gray-600 truncate cursor-help"
                                title={item.codigo_barras}
                              >
                                {item.codigo_barras || '-'}
                              </div>
                            </td>

                            {/* Tipo - Solo icono */}
                            <td className="px-1 py-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-medium rounded-full ${getColorTipo(item.tipo)}`}
                                title={item.tipo === 'producto' ? 'Producto' : item.tipo === 'servicio' ? 'Servicio' : 'Electrobar'}
                              >
                                {item.tipo === 'producto' ? (
                                  <ShoppingCart className="h-3 w-3" />
                                ) : item.tipo === 'servicio' ? (
                                  <Wrench className="h-3 w-3" />
                                ) : (
                                  <Coffee className="h-3 w-3" />
                                )}
                              </span>
                            </td>

                            {/* Precio */}
                            <td className="px-1 py-2 text-center">
                              <div className="font-bold text-gray-900 text-xs">
                                ${item.precio.toFixed(0)}
                              </div>
                            </td>

                            {/* Stock */}
                            <td className="px-1 py-2 text-center">
                              {item.tipo === 'servicio' ? (
                                <span className="text-gray-400 text-[10px]">-</span>
                              ) : (
                                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${item.stock === 0 ? 'bg-red-100 text-red-700' :
                                  (item.stock_minimo && item.stock <= item.stock_minimo) ? 'bg-orange-100 text-orange-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                  {item.stock}
                                </span>
                              )}
                            </td>

                            {/* Ubicación */}
                            <td className="px-1 py-2 text-center">
                              <div
                                className="text-[10px] text-gray-600 truncate cursor-help"
                                title={item.ubicacion_fisica}
                              >
                                {item.ubicacion_fisica || '-'}
                              </div>
                            </td>

                            {/* Proveedor */}
                            <td className="px-1 py-2 text-center">
                              <div
                                className="text-[10px] text-gray-600 truncate cursor-help"
                                title={item.proveedor}
                              >
                                {item.proveedor || '-'}
                              </div>
                            </td>

                            {/* Estado */}
                            <td className="px-1 py-2 text-center">
                              {item.activo !== false ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="px-1 py-2 text-center bg-gray-50" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-0.5">
                                <button
                                  onClick={() => handleViewItem(item)}
                                  className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-100 rounded transition-all"
                                  title="Ver"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                {usuario?.rol === 'admin' && (
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-indigo-600 hover:text-indigo-700 p-1 hover:bg-indigo-100 rounded transition-all"
                                    title="Editar"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {usuario?.rol === 'admin' && (
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    className="text-red-600 hover:text-red-700 p-1 hover:bg-red-100 rounded transition-all"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
      </div >

      {/* Modal del formulario -  NO INTERFERIR CON SU CIERRE */}
      < ItemFormModal
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

      {/* Modal de Respaldo JSON */}
      <RespaldoJsonModal
        isOpen={showRespaldoJson}
        onClose={() => setShowRespaldoJson(false)}
      />

      {/* Modal de Ajuste Masivo */}
      <AjusteMasivoModal
        isOpen={showAjusteMasivo}
        onClose={() => setShowAjusteMasivo(false)}
      />

      {/* Modal de Conexión API */}
      <ConexionApiModal
        isOpen={showConexionApi}
        onClose={() => setShowConexionApi(false)}
      />

      {/* Modal de Impresión de Inventario */}
      <PrintInventarioModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </>
  );
};

export default InventoryManagerModal;