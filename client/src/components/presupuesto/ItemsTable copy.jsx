// components/ItemsTable.jsx - VERSIÓN MEJORADA MODULAR 🎯
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Search, Edit3, Trash2, Save, X, 
  Package, Scan, Calculator, AlertTriangle, Settings,
  ChevronUp, ChevronDown, GripVertical, Check,
  Zap, ShoppingCart, Tag, DollarSign, Eye,
  Barcode, Info, Star
} from 'lucide-react';
import { useInventarioStore } from "../../store/inventarioStore";
import toast from 'react-hot-toast';
import { api } from '../../config/api';

// 🆕 FUNCIONES API PARA STOCK (desde IngresoModal)
const liberarStockAPI = async (productoId, sesionId, cantidad = null) => {
  try {
    const payload = { productoId, sesionId };
    if (cantidad !== null) {
      payload.cantidad = cantidad;
    }
    
    const response = await api.post('/ventas/stock/liberar', payload);
    
    if (response.data.success) {
      console.log('✅ Stock liberado en backend:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ Error liberando stock:', error);
    throw error;
  }
};

// 🆕 FUNCIONES API PARA STOCK
const obtenerStockDisponibleAPI = async (productoId, sesionId = null) => {
  try {
    const url = sesionId 
      ? `/ventas/stock/disponible/${productoId}?sesionId=${sesionId}`
      : `/ventas/stock/disponible/${productoId}`;
    const response = await api.get(url);
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo stock:', error);
    return null;
  }
};

const validarStockAntesDe = async (producto, cantidadSolicitada, itemsCarrito = [], sesionId = null) => {
  try {
    // Los servicios siempre tienen stock ilimitado
    if (producto.tipo === 'SERVICIO') return true;
    
    // 🆕 SIEMPRE consultar API para obtener stock real
    const stockInfo = await obtenerStockDisponibleAPI(producto.id, sesionId);
    
    if (stockInfo && stockInfo.stock) {
      const stockDisponible = stockInfo.stock.stockDisponible || 0;
      console.log(`🔍 Stock API - Producto: ${producto.descripcion}, Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`);
      const resultado = stockDisponible >= cantidadSolicitada;
      console.log(`🔍 RESULTADO VALIDACIÓN: ${resultado} (Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada})`);
      return resultado;
    }
    
    // Si API falla, rechazar por seguridad
    console.error('❌ API no disponible, rechazando por seguridad');
    return false;
    
  } catch (error) {
    console.error('❌ Error validando stock:', error);
    // En caso de error, rechazar por seguridad
    return false;
  }
};

// 🔧 FUNCIONES HELPER
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const limpiarNumero = (valor) => {
  if (!valor && valor !== 0) return 0;
  if (typeof valor === 'number' && valor > 0) return valor;
  
  let valorLimpio = valor.toString().replace(/[^\d.,]/g, '');
  
  if (valorLimpio.includes(',')) {
    const partes = valorLimpio.split(',');
    const entero = partes[0].replace(/\./g, '');
    const decimal = partes[1] || '00';
    const numero = parseFloat(entero + '.' + decimal);
    return numero > 0 ? numero : 0;
  } else if (valorLimpio.includes('.')) {
    const numero = parseFloat(valorLimpio);
    return numero > 0 ? numero : 0;
  }
  
  const numero = parseFloat(valorLimpio) || 0;
  return numero > 0 ? numero : 0;
};

// 🧩 MODAL ITEM PERSONALIZADO
const ModalItemPersonalizado = ({ isOpen, onClose, onAgregar, tasaCambio = 1 }) => {
  const [formData, setFormData] = useState({
  descripcion: '',
  precio: '',
  categoria: 'cotizacion'
});
  const [monedaSeleccionada, setMonedaSeleccionada] = useState('bs'); // 🆕 NUEVO
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  const validarFormulario = () => {
    const erroresTemp = {};

    if (!formData.descripcion.trim()) {
      erroresTemp.descripcion = 'La descripción es obligatoria';
    }

    const precio = parseFloat(formData.precio);
    if (!precio || precio <= 0) {
      erroresTemp.precio = 'El precio debe ser mayor a 0';
    }

    setErrores(erroresTemp);
    return Object.keys(erroresTemp).length === 0;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validarFormulario()) return;

  setLoading(true);
  try {
    await new Promise(resolve => setTimeout(resolve, 500));

    // 🔧 NUEVO: Convertir precio según moneda seleccionada
    let precioEnUsd;
    if (monedaSeleccionada === 'bs') {
      // Si está en Bs, convertir a USD dividiendo por tasa de cambio
      precioEnUsd = parseFloat(formData.precio.replace(',', '.')) / tasaCambio;
    } else {
      // Si ya está en USD, usar directamente
      precioEnUsd = parseFloat(formData.precio);
    }

    const itemPersonalizado = {
      id: `CUSTOM_${Date.now()}`,
      codigo: 'CUSTOM',
      descripcion: formData.descripcion.trim(),
      categoria: 'personalizado',
      cantidad: 1,
      precio_unitario: precioEnUsd, // 🔧 NUEVO: Siempre guardar en USD
      subtotal: precioEnUsd,
      esPersonalizado: true,
      sinStock: false,
      inactivo: false
    };

    onAgregar(itemPersonalizado);
    
    // Limpiar formulario
    setFormData({
      descripcion: '',
      precio: '',
      categoria: 'cotizacion'
    });
    setMonedaSeleccionada('bs'); // 🔧 NUEVO: Resetear moneda
    setErrores({});
    
    toast.success(`✅ Item personalizado agregado (${monedaSeleccionada === 'bs' ? 'desde Bs' : 'desde USD'})`);
    onClose();
    
  } catch (error) {
    toast.error('Error al agregar item personalizado');
  } finally {
    setLoading(false);
  }
};

 const handleClose = () => {
  setFormData({
    descripcion: '',
    precio: '',
    categoria: 'cotizacion'
  });
  setMonedaSeleccionada('bs'); // 🔧 NUEVO: Resetear moneda
  setErrores({});
  onClose();
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <h3 className="text-lg font-bold flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Item Personalizado
            </h3>
            <button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, descripcion: e.target.value }));
                if (errores.descripcion) {
                  setErrores(prev => ({ ...prev, descripcion: null }));
                }
              }}
              placeholder="Ej: iPhone 16 Pro (Cotización especial)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errores.descripcion ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus
            />
            {errores.descripcion && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {errores.descripcion}
              </p>
            )}
          </div>

          {/* Precio */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Precio *
  </label>
  
  {/* 🆕 NUEVO: Selector de moneda */}
  <div className="grid grid-cols-2 gap-2 mb-3">
    <button
      type="button"
      onClick={() => setMonedaSeleccionada('bs')}
      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
        monedaSeleccionada === 'bs'
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
      }`}
    >
      💰 Precio en Bs
    </button>
    <button
      type="button"
      onClick={() => setMonedaSeleccionada('usd')}
      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
        monedaSeleccionada === 'usd'
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      💵 Precio en USD
    </button>
  </div>
  
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
      {monedaSeleccionada === 'bs' ? 'Bs' : '$'}
    </span>
    <input
      type="text"
      value={formData.precio}
      onChange={(e) => {
        const valor = e.target.value;
        // Solo permitir números y punto/coma decimal
        if (/^\d*[.,]?\d*$/.test(valor)) {
          setFormData(prev => ({ ...prev, precio: valor }));
          if (errores.precio) {
            setErrores(prev => ({ ...prev, precio: null }));
          }
        }
      }}
      placeholder={monedaSeleccionada === 'bs' ? '0,00' : '0.00'}
      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        errores.precio ? 'border-red-300 bg-red-50' : 'border-gray-300'
      }`}
    />
  </div>
  {errores.precio && (
    <p className="text-red-600 text-xs mt-1 flex items-center">
      <AlertTriangle className="h-3 w-3 mr-1" />
      {errores.precio}
    </p>
  )}
  <p className="text-xs text-gray-500 mt-1">
    {monedaSeleccionada === 'bs' 
      ? 'Solo números y coma decimal. Ej: 199,99' 
      : 'Solo números y punto decimal. Ej: 199.99'
    }
  </p>
</div>

          {/* Advertencia */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">Item Personalizado</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Este item no afectará el inventario y es solo para cotización.
            </p>
          </div>

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Agregando...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Agregar Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 🎯 COMPONENTE PRINCIPAL - ITEMS TABLE
const ItemsTable = ({ 
  items = [], 
  onItemsChange,
  isEditable = true,
  tasaCambio = 1,
  title = "Productos y Servicios",
  showAddCustom = true,
  maxVisibleItems = 5,
  // 🆕 NUEVOS PROPS PARA VALIDACIÓN DE STOCK
  reservarStock = false,
  mostrarStockDisponible = false,
  validarStockAntes = false,
  sesionId = null // 🆕 PROP DESDE PADRE
}) => {
  const { inventario } = useInventarioStore();
  
  // 🆕 OBTENER SESIÓN ID PARA SINCRONIZACIÓN
  // sesionId viene como prop desde el componente padre

  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showPersonalizado, setShowPersonalizado] = useState(false);
  const searchInputRef = useRef(null);

  // Filtrar productos del inventario
  const productosDisponibles = inventario.filter(producto =>
    producto.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
    producto.codigo_barras?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    producto.codigo_interno?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  // 🔍 Búsqueda automática con Enter (lógica de FloatingActions)
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      
      // Buscar producto exacto por código
      const producto = inventario.find(item => 
        item.codigo_barras?.toUpperCase() === query ||
        item.codigo_interno?.toUpperCase() === query
      );

      if (producto) {
        handleAddProduct(producto);
        setSearchQuery('');
        setShowProductSearch(false);
        toast.success(`✅ Producto encontrado: ${producto.descripcion}`);
      } else {
        toast.error('❌ Producto no encontrado', {
          duration: 3000,
          icon: '🔍',
          style: {
            background: '#FEE2E2',
            border: '1px solid #F87171',
            color: '#991B1B'
          }
        });
        // Mantener el foco y seleccionar texto para reintento
        if (searchInputRef.current) {
          searchInputRef.current.select();
        }
      }
    }
  };

// ➕ Agregar producto del inventario - CON VALIDACIÓN DE STOCK API
  const handleAddProduct = async (producto) => {
    try {
      const existingItem = items.find(item => item.codigo === producto.codigo_barras);
      const cantidadSolicitada = existingItem ? existingItem.cantidad + 1 : 0;
      
      console.log('🔍 DEBUG - Validando producto:', {
        descripcion: producto.descripcion,
        tipo: producto.tipo,
        stock: producto.stock,
        stockReservado: producto.stockReservado,
        cantidadSolicitada,
        validarStockAntes
      });
      
      // 🔍 VALIDACIÓN VISUAL FIFO - SIN RESERVAR STOCK
      if (producto.tipo !== 'SERVICIO') {
        const stockTotal = producto.stock || 0;
        const stockReservadoPorOtros = producto.stockReservado || 0;
        const stockVisualDisponible = Math.max(0, stockTotal - stockReservadoPorOtros);
        
        if (stockVisualDisponible < cantidadSolicitada) {
          toast.error(`❌ Stock aparentemente insuficiente: ${producto.descripcion}\n📦 Disponible visualmente: ${stockVisualDisponible}\n📋 Solicitado: ${cantidadSolicitada}\n💡 Stock real se validará al hacer "Siguiente" (FIFO)`, {
            duration: 6000,
            style: {
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              color: '#92400E'
            }
          });
          return;
        }
        
        // 💡 INFO VISUAL PARA USUARIO
        if (stockVisualDisponible <= 5 && stockVisualDisponible > 0) {
          toast(`⚠️ Stock bajo: ${producto.descripcion} (${stockVisualDisponible} disponibles)`, {
            duration: 3000,
            icon: '📦',
            style: {
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              color: '#92400E'
            }
          });
        }
      }
      
      if (existingItem) {
        // Si ya existe, aumentar cantidad
        const updatedItems = items.map(item =>
          item.codigo === producto.codigo_barras
            ? { 
                ...item, 
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precio_unitario
              }
            : item
        );
        onItemsChange(updatedItems);
        toast.success(`➕ AQUI HAY PROBLEMA DE RESERVA Cantidad aumentada: ${producto.descripcion}`);
      } else {
        // Agregar nuevo item con validación de stock mejorada
        const stockDisponible = producto.tipo === 'SERVICIO' ? 999 : (producto.stock || 0) - (producto.stockReservado || 0);
        
        const newItem = {
          id: crypto.randomUUID(),
          codigo: producto.codigo_barras || producto.codigo_interno || 'SIN_CODIGO',
          descripcion: producto.descripcion,
          categoria: producto.categoria || 'general',
          cantidad: 0, // 🆕 CAMBIAR DE 1 A 0
          precio_unitario: parseFloat(producto.precio_venta || producto.precio || 0),
          subtotal: 0, // 🆕 CAMBIAR A 0 (0 * precio)
          // Estados especiales mejorados
          sinStock: producto.tipo !== 'SERVICIO' && stockDisponible <= 0,
          inactivo: !producto.activo,
          esPersonalizado: false,
          productoId: producto.id,
          tipoProducto: producto.tipo || 'PRODUCTO',
          requiereFocus: true // Focus solo una vez al agregar
        };
        
        onItemsChange([...items, newItem]);
        
        const mensajeStock = producto.tipo === 'SERVICIO' 
          ? '(Servicio - Sin límite de stock)' 
          : `(Stock disponible: ${stockDisponible})`;
          
        toast.success(`✅ Producto agregado: ${producto.descripcion} ${mensajeStock}`);
      }
      
      setSearchQuery('');
      setShowProductSearch(false);
    } catch (error) {
      console.error('Error agregando producto:', error);
      toast.error('Error al agregar producto');
    }
  };

  // ➕ Agregar item personalizado
  const handleAddPersonalizado = (itemPersonalizado) => {
    onItemsChange([...items, itemPersonalizado]);
  };

  // ⬆️⬇️ Mover items
  const handleMoveItem = (itemId, direction) => {
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Intercambiar elementos
    [newItems[currentIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[currentIndex]];
    
    onItemsChange(newItems);
    toast.success('📦 Item reordenado', { duration: 2000 });
  };

  // 🗑️ Eliminar item - CON LIBERACIÓN DE STOCK
const handleDeleteItem = async (itemId) => {
  const itemAEliminar = items.find(item => item.id === itemId);
  
  // 🆕 SIMPLIFICADO: No liberamos stock aquí, se hará al final en "Siguiente"
  console.log('🗑️ Eliminando item del carrito (sin liberar stock individual):', itemAEliminar?.descripcion);
  
  const updatedItems = items.filter(item => item.id !== itemId);
  onItemsChange(updatedItems);
  toast.success('🗑️ Item eliminado del carrito');
};

  // ✏️ Editar item inline
  const handleStartEdit = (item) => {
    setEditingRowId(item.id);
    setEditingData({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario
    });
  };

  const handleSaveEdit = () => {
    if (!editingData.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    
    const cantidad = parseInt(editingData.cantidad);
    const precio = parseFloat(editingData.precio_unitario);
    
    if (cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    
    if (precio <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }

    const updatedItems = items.map(item =>
      item.id === editingRowId
        ? {
            ...item,
            descripcion: editingData.descripcion.trim(),
            cantidad: cantidad,
            precio_unitario: precio,
            subtotal: cantidad * precio
          }
        : item
    );

    onItemsChange(updatedItems);
    setEditingRowId(null);
    setEditingData({});
    toast.success('✅ Item actualizado');
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  // 🎨 Obtener color por categoría
  const getCategoryColor = (categoria) => {
    const colors = {
      smartphones: 'bg-blue-100 text-blue-700',
      accesorios: 'bg-green-100 text-green-700',
      servicios: 'bg-purple-100 text-purple-700',
      electrobar: 'bg-orange-100 text-orange-700',
      personalizado: 'bg-indigo-100 text-indigo-700',
      general: 'bg-gray-100 text-gray-700'
    };
    return colors[categoria] || colors.general;
  };

  // Determinar si necesita scroll
  const needsScroll = items.length > maxVisibleItems;

  return (
    <div className="space-y-4">
      
      {/* 🔍 BARRA DE BÚSQUEDA Y CONTROLES - VERSIÓN COMPACTA */}
{isEditable && (
  <div className="bg-white border border-gray-200 rounded-lg p-3">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold text-gray-900 flex items-center">
        <ShoppingCart className="h-4 w-4 mr-2 text-emerald-600" />
        {title}
      </h3>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        {showAddCustom && (
          <button
            onClick={() => setShowPersonalizado(true)}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
          >
            <Star className="h-3 w-3" />
            <span>Item Personalizado</span>
          </button>
        )}
      </div>
    </div>

    {/* Input de búsqueda con scanner */}
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
        <Scan className="h-3 w-3 text-purple-600" />
        <div className="w-0.5 h-3 bg-red-500 animate-pulse"></div>
      </div>
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowProductSearch(e.target.value.length > 0);
        }}
        onKeyPress={handleSearchKeyPress}
        placeholder="Escanear código o buscar productos..."
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
        Enter para buscar
      </div>

            {/* Dropdown de productos */}
            {showProductSearch && searchQuery && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {productosDisponibles.length > 0 ? (
                  <div className="py-2">
                    {productosDisponibles.map((producto) => (
                      <button
                        key={producto.id}
                        onClick={() => handleAddProduct(producto)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                      >
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Package className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {producto.descripcion}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <span className="font-mono">{producto.codigo_barras || producto.codigo_interno}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-600">
                              ${parseFloat(producto.precio_venta || producto.precio || 0).toFixed(2)}
                            </span>
                            
                            {/* 🆕 MOSTRAR STOCK DISPONIBLE EN TIEMPO REAL */}
                            {mostrarStockDisponible && producto.tipo !== 'SERVICIO' && (
                              <>
                                <span>•</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  (producto.stock - (producto.stockReservado || 0)) > 0 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  📦 {producto.stock - (producto.stockReservado || 0)} disp.
                                </span>
                              </>
                            )}
                            
                            {producto.tipo === 'SERVICIO' && (
                              <>
                                <span>•</span>
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  🛠️ Servicio
                                </span>
                              </>
                            )}
                            
                            {(producto.stock || 0) <= 0 && producto.tipo !== 'SERVICIO' && (
                              <>
                                <span>•</span>
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  Sin Stock
                                </span>
                              </>
                            )}
                            {!producto.activo && (
                              <>
                                <span>•</span>
                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  Inactivo
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">No se encontraron productos</p>
                    <p className="text-xs mt-1">Verifica el código o descripción</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📋 TABLA DE ITEMS */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {items.length === 0 ? (
          /* Estado vacío */
          <div className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay productos agregados
            </h3>
            <p className="text-gray-500 mb-4">
              {isEditable 
                ? 'Escanea códigos o busca productos para agregar'
                : 'Este presupuesto no tiene productos agregados'
              }
            </p>
            {isEditable && showAddCustom && (
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setShowProductSearch(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Scan className="h-4 w-4" />
                  <span>Buscar Producto</span>
                </button>
                <button
                  onClick={() => setShowPersonalizado(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Star className="h-4 w-4" />
                  <span>Item Personalizado</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Tabla con items */
          <div className={`overflow-x-auto ${needsScroll ? `max-h-96 overflow-y-auto` : ''}`}>
            <table className="w-full">
              <thead className={`bg-gray-50 border-b border-gray-200 ${needsScroll ? 'sticky top-0 z-10' : ''}`}>
                <tr>
                  {isEditable && <th className="w-12 px-4 py-3"></th>}
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                    Producto/Servicio
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-900 w-24">
                    Cantidad
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 w-40">
                    Precio Unit.
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 w-40">
                    Subtotal
                  </th>
                  {isEditable && (
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-900 w-24">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    
                    {/* Controles de orden */}
                    {isEditable && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleMoveItem(item.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 hover:bg-blue-50 rounded transition-colors group"
                            title="Mover arriba"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <GripVertical className="h-3 w-3 text-gray-400 mx-auto" />
                          <button
                            onClick={() => handleMoveItem(item.id, 'down')}
                            disabled={index === items.length - 1}
                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 hover:bg-blue-50 rounded transition-colors group"
                            title="Mover abajo"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Descripción del producto */}
                    <td className="px-4 py-3">
                      {editingRowId === item.id ? (
                        <input
                          type="text"
                          value={editingData.descripcion}
                          onChange={(e) => setEditingData(prev => ({ ...prev, descripcion: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900 flex items-center space-x-2">
                            <span>{item.descripcion}</span>
                            {/* Badges de estado */}
                            {item.esPersonalizado && (
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                <Star className="h-3 w-3 inline mr-1" />
                                Personalizado
                              </span>
                            )}
                            {item.sinStock && (
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium animate-pulse">
                                Sin Stock
                              </span>
                            )}
                            {item.inactivo && (
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {item.codigo !== 'CUSTOM' && (
                              <span className="text-xs text-gray-500 font-mono flex items-center">
                                <Barcode className="h-3 w-3 mr-1" />
                                {item.codigo}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.categoria)}`}>
                              <Tag className="h-3 w-3 mr-1" />
                              {item.categoria}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Cantidad */}
                    <td className="px-4 py-3 text-center">
                      {editingRowId === item.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editingData.cantidad}
                          onChange={(e) => setEditingData(prev => ({ ...prev, cantidad: e.target.value }))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      ) : (
                        <input
                          ref={item.requiereFocus ? (el) => {
                                  if (el) {
                                    setTimeout(() => {
                                      el.focus();
                                      el.select();
                                      // Limpiar la bandera después del focus
                                      const updatedItems = items.map(i =>
                                        i.id === item.id ? { ...i, requiereFocus: false } : i
                                      );
                                      onItemsChange(updatedItems);
                                    }, 100);
                                  }
                                } : null}
                          type="number"
                          min="0" // 🆕 CAMBIAR MIN DE 1 A 0
                          value={item.cantidad}
                          onChange={async (e) => {
                            console.log('🔍 DEBUG onChange input:', e.target.value);
                            const nuevaCantidad = parseInt(e.target.value) || 0;
                            console.log('🔍 DEBUG nuevaCantidad calculada:', nuevaCantidad);
                        
                        if (item.productoId && !item.esPersonalizado && nuevaCantidad > item.cantidad) {
                          try {
                            // Buscar producto en inventario para obtener tipo
                            const { inventario } = useInventarioStore.getState();
                            const productoInventario = inventario.find(p => p.id === item.productoId);
                            
                            if (productoInventario && productoInventario.tipo !== 'SERVICIO') {

                              // 🔧 VALIDAR SOLO STOCK TOTAL - NO RESERVAS
                                const stockInfo = await obtenerStockDisponibleAPI(item.productoId, sesionId);
                                const stockTotal = stockInfo?.stock?.stockTotal || 0;

                                // 🔍 DEBUG: Ver stock real vs disponible
                                console.log('🔍 DEBUG stockInfo completo:', stockInfo);
                                console.log('🔍 DEBUG stockTotal (real):', stockTotal);
                               // console.log('🔍 DEBUG stockDisponible (con reservas):', stockInfo?.stock?.stockDisponible);
                                console.log('🔍 DEBUG nuevaCantidad:', nuevaCantidad);
                                console.log('🔍 DEBUG stockTotal < nuevaCantidad:', stockTotal < nuevaCantidad);

                                if (stockTotal < nuevaCantidad) {
                                toast.error(`❌ Stock insuficiente: ${item.descripcion}\n📦 Stock total: ${stockTotal}\n📋 Intentaste: ${nuevaCantidad}`, {
                                  duration: 4000,
                                  style: {
                                    background: '#FEE2E2',
                                    border: '1px solid #F87171',
                                    color: '#991B1B'
                                  }
                                });
                                
                                // Ajustar a stock total (mínimo 0 para permitir eliminar)
                                const cantidadAjustada = Math.max(0, Math.min(nuevaCantidad, stockTotal));
                                const updatedItems = items.map(i =>
                                  i.id === item.id
                                    ? { 
                                        ...i, 
                                        cantidad: cantidadAjustada, 
                                        subtotal: cantidadAjustada * i.precio_unitario 
                                      }
                                    : i
                                );
                                onItemsChange(updatedItems);
                                return;
                              }
                            }
                          } catch (error) {
                            console.error('Error validando stock:', error);
                          }
                        }
                        
                        // ✅ Permitir cambio si validación pasa o no está habilitada
                        const updatedItems = items.map(i =>
                          i.id === item.id
                            ? { 
                                ...i, 
                                cantidad: nuevaCantidad, 
                                subtotal: nuevaCantidad * i.precio_unitario 
                              }
                            : i
                        );
                        
                        onItemsChange(updatedItems);
                    }}
                    disabled={!isEditable}
                    className={`w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      !isEditable ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                    />
                     )}
                   </td>

                   {/* Precio unitario */}
                    <td className="px-4 py-3 text-right">
                      {editingRowId === item.id ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingData.precio_unitario}
                          onChange={(e) => setEditingData(prev => ({ ...prev, precio_unitario: e.target.value }))}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatearVenezolano(item.precio_unitario * tasaCambio)} Bs
                          </div>
                          <div className="text-xs text-gray-500">
                            ${item.precio_unitario.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </td>

                   {/* Subtotal */}
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-emerald-600">
                        {formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs
                      </div>
                      <div className="text-xs text-gray-500">
                        ${(item.cantidad * item.precio_unitario).toFixed(2)}
                      </div>
                    </td>

                   {/* Acciones */}
{isEditable && (
  <td className="px-4 py-3">
    {editingRowId === item.id ? (
      <div className="flex items-center justify-center space-x-1">
        <button
          onClick={handleSaveEdit}
          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
          title="Guardar"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancelEdit}
          className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex items-center justify-center space-x-1">
        {/* Solo mostrar botón editar para items personalizados */}
        {item.esPersonalizado && (
          <button
            onClick={() => handleStartEdit(item)}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
            title="Editar"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
        
        {/* Botón eliminar para todos los items */}
        <button
          onClick={() => handleDeleteItem(item.id)}
          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        
        {/* Mostrar indicador para items de inventario */}
        {!item.esPersonalizado && (
          <div className="p-1 text-gray-400" title="Item de inventario - No editable">
            <Package className="h-4 w-4" />
          </div>
        )}
      </div>
    )}
  </td>
)}
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
     </div>

     {/* 📊 RESUMEN RÁPIDO */}
     {items.length > 0 && (
       <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
           <div>
             <div className="text-sm text-emerald-600 font-medium">Total Items</div>
             <div className="text-2xl font-bold text-emerald-900">
               {items.reduce((sum, item) => sum + item.cantidad, 0)}
             </div>
           </div>
           <div>
             <div className="text-sm text-emerald-600 font-medium">Productos Únicos</div>
             <div className="text-2xl font-bold text-emerald-900">
               {items.length}
             </div>
           </div>
           <div>
             <div className="text-sm text-emerald-600 font-medium">Subtotal Bs</div>
             <div className="text-xl font-bold text-emerald-900">
               {formatearVenezolano(items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0) * tasaCambio)} Bs
             </div>
           </div>
           <div>
             <div className="text-sm text-emerald-600 font-medium">Subtotal USD</div>
             <div className="text-lg font-bold text-emerald-900">
               ${items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0).toFixed(2)}
             </div>
           </div>
         </div>

         {/* Indicadores especiales */}
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-emerald-200">
           {items.some(item => item.sinStock) && (
             <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
               <AlertTriangle className="h-3 w-3 mr-1" />
               {items.filter(item => item.sinStock).length} sin stock
             </span>
           )}
           {items.some(item => item.inactivo) && (
             <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
               {items.filter(item => item.inactivo).length} inactivos
             </span>
           )}
           {items.some(item => item.esPersonalizado) && (
             <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
               <Star className="h-3 w-3 mr-1" />
               {items.filter(item => item.esPersonalizado).length} personalizados
             </span>
           )}
           {needsScroll && (
             <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
               <Eye className="h-3 w-3 mr-1" />
               Scroll activado (+{maxVisibleItems} items)
             </span>
           )}
         </div>
       </div>
     )}

     {/* Modal Item Personalizado */}
     <ModalItemPersonalizado
       isOpen={showPersonalizado}
       onClose={() => setShowPersonalizado(false)}
       onAgregar={handleAddPersonalizado}
       tasaCambio={tasaCambio} // 🔧 NUEVO
     />
   </div>
 );
};

export default ItemsTable;