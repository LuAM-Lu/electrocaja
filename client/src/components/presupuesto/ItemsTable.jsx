// components/presupuesto/ItemsTable.jsx - VERSIÓN COMPLETA ACTUALIZADA 
import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit3, Trash2, Save, X,
  Package, Scan, Calculator, AlertTriangle, Settings,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, GripVertical, Check,
  Zap, ShoppingCart, Tag, DollarSign, Eye,
  Barcode, Info, Star
} from 'lucide-react';
import { MdRemoveShoppingCart } from "react-icons/md";
import { useInventarioStore } from "../../store/inventarioStore";
import toast from '../../utils/toast.jsx';
import { api } from '../../config/api';

//  FUNCIONES API PARA STOCK (desde IngresoModal)
const liberarStockAPI = async (productoId, sesionId, cantidad = null) => {
  try {
    const payload = { productoId, sesionId };
    if (cantidad !== null) {
      payload.cantidad = cantidad;
    }

    const response = await api.post('/ventas/stock/liberar', payload);

    if (response.data.success) {
      console.log(' Stock liberado en backend:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error(' Error liberando stock:', error);
    throw error;
  }
};

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
    console.error(' Error obteniendo stock:', error);
    return null;
  }
};

const validarStockAntesDe = async (producto, cantidadSolicitada, itemsCarrito = [], sesionId = null) => {
  try {
    // Los servicios siempre tienen stock ilimitado
    if (producto.tipo === 'SERVICIO') return true;

    //  SIEMPRE consultar API para obtener stock real
    const stockInfo = await obtenerStockDisponibleAPI(producto.id, sesionId);

    if (stockInfo && stockInfo.stock) {
      const stockDisponible = stockInfo.stock.stockDisponible || 0;
      console.log(` Stock API - Producto: ${producto.descripcion}, Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`);
      const resultado = stockDisponible >= cantidadSolicitada;
      console.log(` RESULTADO VALIDACIÓN: ${resultado} (Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada})`);
      return resultado;
    }

    // Si API falla, rechazar por seguridad
    console.error(' API no disponible, rechazando por seguridad');
    return false;

  } catch (error) {
    console.error(' Error validando stock:', error);
    return false;
  }
};

//  FUNCIONES HELPER
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '0,00';
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;

  // Formato venezolano: puntos para miles, coma para decimales
  const partes = numero.toFixed(2).split('.');
  const entero = partes[0];
  const decimal = partes[1] || '00';

  // Agregar separadores de miles (puntos)
  const enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${enteroFormateado},${decimal}`;
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

//  FUNCIÓN PARA DETECTAR SERVICIOS
const esServicio = (producto) => {
  const tipo = (producto.tipo || '').toLowerCase();
  const categoria = (producto.categoria || '').toLowerCase();
  const descripcion = (producto.descripcion || '').toLowerCase();

  return tipo === 'servicio' ||
    categoria === 'servicios' ||
    categoria === 'servicio' ||
    categoria === 'gaming' ||
    descripcion.includes('servicio') ||
    descripcion.includes('gaming') ||
    descripcion.includes('consola') ||
    descripcion.includes('hora') ||
    descripcion.includes('instalacion') ||
    descripcion.includes('configuracion') ||
    descripcion.includes('reparacion') ||
    descripcion.includes('alquiler') ||
    descripcion.includes('promocion');
};

//  MODAL ITEM PERSONALIZADO
const ModalItemPersonalizado = ({ isOpen, onClose, onAgregar, tasaCambio = 1, theme = 'light' }) => {
  const [formData, setFormData] = useState({
    descripcion: '',
    precio: '',
    categoria: 'cotizacion'
  });
  const [monedaSeleccionada, setMonedaSeleccionada] = useState('bs');
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  //  ESTILOS BASADOS EN THEME
  const getThemeStyles = () => {
    if (theme === 'dark') {
      return {
        modal: 'bg-slate-900 border-slate-700 shadow-2xl rounded-2xl ring-1 ring-white/10',
        header: 'bg-slate-800/50 border-b border-slate-700/50',
        input: 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 rounded-xl transition-all',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95 transition-all rounded-lg font-medium',
        buttonSecondary: 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700',
        text: 'text-slate-100',
        textSecondary: 'text-slate-400',
        card: 'bg-amber-900/20 border-amber-700/30 rounded-xl',
        cardText: 'text-amber-200',
        pillActive: 'bg-slate-700 text-white border-slate-600 shadow-sm',
        pillInactive: 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800'
      };
    }

    return {
      modal: 'bg-white border-slate-100 shadow-2xl rounded-2xl ring-1 ring-black/5',
      header: 'bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm',
      input: 'bg-white border-slate-200 text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-xl shadow-sm transition-all',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all rounded-lg font-bold',
      buttonSecondary: 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm',
      text: 'text-slate-800',
      textSecondary: 'text-slate-500',
      card: 'bg-amber-50 border-amber-100 rounded-xl',
      cardText: 'text-amber-700',
      pillActive: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
      pillInactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
    };
  };

  const styles = getThemeStyles();

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

      //  Convertir precio según moneda seleccionada
      let precioEnUsd;
      if (monedaSeleccionada === 'bs') {
        precioEnUsd = parseFloat(formData.precio.replace(',', '.')) / tasaCambio;
      } else {
        precioEnUsd = parseFloat(formData.precio);
      }

      const itemPersonalizado = {
        id: `CUSTOM_${Date.now()}`,
        codigo: 'CUSTOM',
        descripcion: formData.descripcion.trim(),
        categoria: 'personalizado',
        cantidad: 1,
        precio_unitario: precioEnUsd,
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
      setMonedaSeleccionada('bs');
      setErrores({});

      toast.success(`Item personalizado agregado (${monedaSeleccionada === 'bs' ? 'desde Bs' : 'desde USD'})`);
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
    setMonedaSeleccionada('bs');
    setErrores({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className={`${styles.modal} border rounded-xl shadow-2xl max-w-md w-full`}>

        <div className={`${styles.header} px-6 py-4 rounded-t-xl`}>
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
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-1`}>
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
              className={`w-full px-3 py-2 border rounded-lg ${styles.input} ${errores.descripcion ? 'border-red-300 bg-red-50' : ''
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
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-1`}>
              Precio *
            </label>

            {/* Selector de moneda */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setMonedaSeleccionada('bs')}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${monedaSeleccionada === 'bs'
                  ? `${styles.pillActive} border-current`
                  : `${styles.pillInactive} border-gray-300`
                  }`}
              >
                Precio en Bs
              </button>
              <button
                type="button"
                onClick={() => setMonedaSeleccionada('usd')}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${monedaSeleccionada === 'usd'
                  ? `${styles.pillActive} border-current`
                  : `${styles.pillInactive} border-gray-300`
                  }`}
              >
                Precio en USD
              </button>
            </div>

            <div className="relative">
              <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${styles.textSecondary} text-sm`}>
                {monedaSeleccionada === 'bs' ? 'Bs' : '$'}
              </span>
              <input
                type="text"
                value={formData.precio}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (/^\d*[.,]?\d*$/.test(valor)) {
                    setFormData(prev => ({ ...prev, precio: valor }));
                    if (errores.precio) {
                      setErrores(prev => ({ ...prev, precio: null }));
                    }
                  }
                }}
                placeholder={monedaSeleccionada === 'bs' ? '0,00' : '0.00'}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg ${styles.input} ${errores.precio ? 'border-red-300 bg-red-50' : ''
                  }`}
              />
            </div>
            {errores.precio && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {errores.precio}
              </p>
            )}
            <p className={`text-xs ${styles.textSecondary} mt-1`}>
              {monedaSeleccionada === 'bs'
                ? 'Solo números y coma decimal. Ej: 199,99'
                : 'Solo números y punto decimal. Ej: 199.99'
              }
            </p>
          </div>

          {/* Advertencia */}
          <div className={`${styles.card} border rounded-lg p-3`}>
            <div className={`flex items-center space-x-2 ${styles.cardText}`}>
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">Item Personalizado</span>
            </div>
            <p className={`text-xs ${styles.cardText} mt-1`}>
              Este item no afectará el inventario y es solo para cotización.
            </p>
          </div>

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className={`flex-1 px-4 py-2 border ${styles.buttonSecondary} border-gray-300 rounded-lg transition-colors font-medium`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 ${styles.button} text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2`}
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

//  COMPONENTE PRINCIPAL - ITEMS TABLE
const ItemsTable = ({
  items = [],
  onItemsChange,
  isEditable = true,
  tasaCambio = 1,
  title = "Productos y Servicios",
  showAddCustom = true,

  itemsPerPage = 5,
  //  NUEVOS PROPS PARA VALIDACIÓN DE STOCK
  reservarStock = false,
  mostrarStockDisponible = false,
  validarStockAntes = false,
  sesionId = null,
  theme = 'light' //  PROP PARA THEMING
}) => {
  const { inventario } = useInventarioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showPersonalizado, setShowPersonalizado] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [itemsPage, setItemsPage] = useState(1);
  const searchInputRef = useRef(null);

  //  ESTILOS BASADOS EN THEME
  const getThemeStyles = () => {
    if (theme === 'dark') {
      return {
        container: 'bg-slate-900/50 backdrop-blur-xl border-slate-700/50 shadow-2xl rounded-2xl',
        header: 'bg-slate-800/40 border-b border-slate-700/50',
        input: 'bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 rounded-xl transition-all duration-300',
        table: 'bg-transparent',
        tableHeader: 'bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider font-semibold py-4',
        tableRow: 'hover:bg-slate-800/50 border-slate-700/30 transition-colors duration-200 text-sm',
        dropdown: 'bg-slate-800 border-slate-700 shadow-xl rounded-xl ring-1 ring-black/5',
        dropdownOption: 'hover:bg-slate-700/50 text-slate-200 cursor-pointer transition-colors',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95 transition-all rounded-lg font-medium',
        buttonSecondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-sm border border-slate-600/50 transition-all rounded-lg',
        text: 'text-slate-100 font-medium',
        textSecondary: 'text-slate-400',
        textMuted: 'text-slate-500',
        emptyState: 'text-slate-500',
        summaryCard: 'bg-slate-800/40 border-slate-700/50 rounded-2xl backdrop-blur-sm',
        summaryText: 'text-slate-400',
        summaryValue: 'text-emerald-400 font-bold'
      };
    }

    return {
      container: 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl',
      header: 'bg-slate-50/50 border-b border-slate-100 backdrop-blur-sm',
      input: 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-xl shadow-sm transition-all duration-300',
      table: 'bg-white',
      tableHeader: 'bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider font-bold py-4',
      tableRow: 'hover:bg-slate-50/80 border-slate-100 transition-colors duration-200 text-sm group',
      dropdown: 'bg-white border-slate-100 shadow-2xl shadow-slate-200/50 rounded-xl ring-1 ring-slate-100',
      dropdownOption: 'hover:bg-emerald-50/50 text-slate-700 cursor-pointer transition-colors',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all rounded-lg font-bold tracking-wide',
      buttonSecondary: 'bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 transition-all rounded-lg font-medium',
      text: 'text-slate-800 font-bold',
      textSecondary: 'text-slate-500',
      textMuted: 'text-slate-400',
      emptyState: 'text-slate-400',
      summaryCard: 'bg-emerald-50/30 border-emerald-100 rounded-2xl backdrop-blur-sm',
      summaryText: 'text-emerald-700/80 font-medium',
      summaryValue: 'text-emerald-800 font-black tracking-tight'
    };
  };

  const styles = getThemeStyles();

  // Filtrar productos del inventario
  const productosDisponibles = inventario.filter(producto =>
    producto.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
    producto.codigo_barras?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    producto.codigo_interno?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  //  Búsqueda automática con Enter y navegación con flechas
  const handleSearchKeyPress = (e) => {
    // Solo procesar si el dropdown está visible
    if (!showProductSearch && e.key !== 'Enter') return;

    // Navegación con flecha hacia abajo
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (productosDisponibles.length > 0) {
        setSelectedProductIndex(prev =>
          prev < productosDisponibles.length - 1 ? prev + 1 : 0
        );
        setShowProductSearch(true); // Mantener dropdown visible
      }
      return;
    }

    // Navegación con flecha hacia arriba
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (productosDisponibles.length > 0) {
        setSelectedProductIndex(prev =>
          prev > 0 ? prev - 1 : productosDisponibles.length - 1
        );
        setShowProductSearch(true); // Mantener dropdown visible
      }
      return;
    }

    // Enter para seleccionar
    if (e.key === 'Enter') {
      e.preventDefault();

      // Si hay un producto seleccionado con las flechas
      if (selectedProductIndex >= 0 && productosDisponibles[selectedProductIndex]) {
        const producto = productosDisponibles[selectedProductIndex];
        handleAddProduct(producto);
        setSearchQuery('');
        setShowProductSearch(false);
        setSelectedProductIndex(-1);
        toast.success(`Producto seleccionado: ${producto.descripcion}`);
        return;
      }

      // Búsqueda directa por código si no hay selección
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toUpperCase();

        const producto = inventario.find(item =>
          item.codigo_barras?.toUpperCase() === query ||
          item.codigo_interno?.toUpperCase() === query
        );

        if (producto) {
          handleAddProduct(producto);
          setSearchQuery('');
          setShowProductSearch(false);
          setSelectedProductIndex(-1);
          toast.success(`Producto encontrado: ${producto.descripcion}`);
        } else {
          toast.error('Producto no encontrado', {
            duration: 3000,
            style: {
              background: theme === 'dark' ? '#374151' : '#FEE2E2',
              border: `1px solid ${theme === 'dark' ? '#6B7280' : '#F87171'}`,
              color: theme === 'dark' ? '#F87171' : '#991B1B'
            }
          });
          if (searchInputRef.current) {
            searchInputRef.current.select();
          }
        }
      }
    }

    // Escape para cerrar dropdown
    if (e.key === 'Escape') {
      setShowProductSearch(false);
      setSelectedProductIndex(-1);
    }
  };

  //  Agregar producto del inventario - CON VALIDACIÓN DE STOCK API CORREGIDA
  const handleAddProduct = async (producto) => {
    try {
      const existingItem = items.find(item => item.codigo === producto.codigo_barras);
      const cantidadSolicitada = existingItem ? existingItem.cantidad + 1 : 1;

      // Verificar si es servicio
      const esProductoServicio = esServicio(producto);

      //  VALIDACIÓN VISUAL FIFO - SOLO PARA PRODUCTOS FÍSICOS, NO SERVICIOS
      if (!esProductoServicio) {
        const stockTotal = producto.stock || 0;
        const stockReservadoPorOtros = producto.stockReservado || 0;
        const stockVisualDisponible = Math.max(0, stockTotal - stockReservadoPorOtros);

        if (stockVisualDisponible < cantidadSolicitada) {
          toast.error(`Stock insuficiente para ${producto.descripcion}. Solicitado: ${cantidadSolicitada}, Disponible: ${stockVisualDisponible}`, {
            duration: 4000
          });
          return;
        }

        if (stockVisualDisponible <= 5 && stockVisualDisponible > 0) {
          toast.warning(`Stock bajo: ${producto.descripcion} (${stockVisualDisponible} disponibles)`, {
            duration: 3000
          });
        }
      }

      if (existingItem) {
        const updatedItems = items.map(item =>
          item.codigo === producto.codigo_barras
            ? {
              ...item,
              cantidad: Number(item.cantidad || 0) + 1,
              subtotal: (Number(item.cantidad || 0) + 1) * Number(item.precio_unitario || item.precioUnitario || 0)
            }
            : item
        );
        onItemsChange(updatedItems);
        toast.success(`Cantidad aumentada: ${producto.descripcion}`);
      } else {
        const stockDisponible = esProductoServicio ? 999 : (producto.stock || 0) - (producto.stockReservado || 0);

        const newItem = {
          id: crypto.randomUUID(),
          codigo: producto.codigo_barras || producto.codigo_interno || 'SIN_CODIGO',
          descripcion: producto.descripcion,
          categoria: producto.categoria || 'general',
          cantidad: 1,
          precio_unitario: parseFloat(producto.precio_venta || producto.precio || 0),
          subtotal: parseFloat(producto.precio_venta || producto.precio || 0),
          sinStock: !esProductoServicio && stockDisponible <= 0,
          inactivo: !producto.activo,
          esPersonalizado: false,
          productoId: producto.id,
          tipoProducto: producto.tipo || 'PRODUCTO',
          requiereFocus: false
        };

        onItemsChange([...items, newItem]);

        const mensajeStock = esProductoServicio
          ? '(Servicio - Sin límite de stock)'
          : `(Stock disponible: ${stockDisponible})`;

        toast.success(`Producto agregado: ${producto.descripcion} ${mensajeStock}`);
      }

      setSearchQuery('');
      setShowProductSearch(false);
      setSelectedProductIndex(-1);
    } catch (error) {
      console.error('Error agregando producto:', error);
      toast.error('Error al agregar producto');
    }
  };

  //  Agregar item personalizado
  const handleAddPersonalizado = (itemPersonalizado) => {
    onItemsChange([...items, itemPersonalizado]);
  };

  //  Mover items
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

    [newItems[currentIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[currentIndex]];

    onItemsChange(newItems);
    toast.success('Item reordenado', { duration: 2000 });
  };

  //  Eliminar item
  const handleDeleteItem = async (itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    onItemsChange(updatedItems);
    toast.success('Item eliminado del carrito');
  };

  //  Editar item inline
  const handleStartEdit = (item) => {
    setEditingRowId(item.id);
    setEditingData({
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad || 0),
      precio_unitario: Number(item.precio_unitario || item.precioUnitario || 0)
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
    toast.success('Item actualizado');
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  //  Obtener color por categoría
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

  // Lógica de paginación
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    (itemsPage - 1) * itemsPerPage,
    itemsPage * itemsPerPage
  );

  // Efecto para resetear página si filtra o cambia
  useEffect(() => {
    if (itemsPage > totalPages && totalPages > 0) {
      setItemsPage(totalPages);
    }
  }, [items.length, itemsPage, totalPages]);

  const needsScroll = false; // Desactivar scroll infinito a favor de paginación

  return (
    <div className="space-y-4">

      {/*  BARRA DE BÚSQUEDA Y CONTROLES */}
      {isEditable && (
        <div className={`${styles.container} border rounded-lg p-3 relative z-20`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-base font-semibold ${styles.text} flex items-center`}>
              <ShoppingCart className={`h-4 w-4 mr-2 ${styles.textSecondary}`} />
              {title}
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${styles.textMuted}`}>
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
              {showAddCustom && (
                <button
                  onClick={() => setShowPersonalizado(true)}
                  className={`flex items-center space-x-1 px-2 py-1 ${styles.button} rounded text-xs font-medium transition-colors`}
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
                setSelectedProductIndex(-1); // Reset selección al escribir
              }}
              onKeyDown={handleSearchKeyPress}
              placeholder="Escanear código o buscar productos..."
              className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm ${styles.input}`}
            />
            <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${styles.textMuted}`}>
              Enter para buscar • ↑↓ para navegar
            </div>

            {/* Dropdown de productos */}
            {showProductSearch && searchQuery && (
              <div className={`absolute z-50 w-full mt-1 ${styles.dropdown} border rounded-lg shadow-xl max-h-60 overflow-y-auto`}>
                {productosDisponibles.length > 0 ? (
                  <div className="py-2">
                    {productosDisponibles.map((producto, index) => (
                      <button
                        key={producto.id}
                        onClick={() => handleAddProduct(producto)}
                        className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${index === selectedProductIndex
                          ? (theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-emerald-100 text-emerald-900')
                          : styles.dropdownOption
                          }`}
                      >
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Package className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${index === selectedProductIndex ? 'text-current' : styles.text} truncate`}>
                            {producto.descripcion}
                          </div>
                          <div className={`text-sm ${index === selectedProductIndex ? 'text-current opacity-75' : styles.textMuted} flex items-center space-x-2 flex-wrap`}>
                            <span className="font-mono">{producto.codigo_barras || producto.codigo_interno}</span>
                            <span>•</span>
                            {/* Mostrar precio en Bs. y USD */}
                            <span className="font-semibold text-emerald-600">
                              {formatearVenezolano(parseFloat(producto.precio_venta || producto.precio || 0) * tasaCambio)} Bs
                            </span>
                            <span className="text-xs text-gray-500">
                              (${parseFloat(producto.precio_venta || producto.precio || 0).toFixed(2)})
                            </span>

                            {/* Mostrar stock disponible siempre */}
                            {!esServicio(producto) && (
                              <>
                                <span>•</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(producto.stock - (producto.stockReservado || 0)) > 0
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                                  }`}>
                                  Stock: {producto.stock - (producto.stockReservado || 0)}
                                </span>
                              </>
                            )}

                            {esServicio(producto) && (
                              <>
                                <span>•</span>
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  Servicio
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
                  <div className={`py-8 text-center ${styles.emptyState}`}>
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

      {/*  TABLA DE ITEMS */}
      <div className={`${styles.container} border rounded-lg overflow-hidden`}>
        {items.length === 0 ? (
          /* Estado vacío */
          <div className="py-12 text-center">
            <ShoppingCart className={`h-12 w-12 mx-auto mb-4 ${styles.textMuted}`} />
            <h3 className={`text-lg font-medium ${styles.text} mb-2`}>
              No hay productos agregados
            </h3>
            <p className={`${styles.textMuted} mb-4`}>
              {isEditable
                ? 'Escanea códigos o busca productos para agregar'
                : 'Este presupuesto no tiene productos agregados'
              }
            </p>
            {isEditable && showAddCustom && (
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setShowProductSearch(true)}
                  className={`inline-flex items-center space-x-2 px-4 py-2 ${styles.button} rounded-lg transition-colors`}
                >
                  <Scan className="h-4 w-4" />
                  <span>Buscar Producto</span>
                </button>
                <button
                  onClick={() => setShowPersonalizado(true)}
                  className={`inline-flex items-center space-x-2 px-4 py-2 ${styles.button} rounded-lg transition-colors`}
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
              <thead className={`${styles.tableHeader} border-b ${needsScroll ? 'sticky top-0 z-10' : ''}`}>
                <tr>
                  {isEditable && <th className="w-12 px-4 py-3"></th>}
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    Producto/Servicio
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold w-24">
                    Cantidad
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold w-40">
                    Precio Unit.
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold w-40">
                    Subtotal
                  </th>
                  {isEditable && (
                    <th className="text-center px-4 py-3 text-sm font-semibold w-24">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${styles.tableRow.split(' ')[1]}`}>
                {paginatedItems.map((item, index) => (
                  <tr key={item.id} className={`${styles.tableRow} transition-colors`}>

                    {/* Controles de orden */}
                    {isEditable && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleMoveItem(item.id, 'up')}
                            disabled={index === 0}
                            className={`p-1 ${styles.textMuted} hover:text-blue-600 disabled:opacity-30 hover:bg-blue-50 rounded transition-colors group`}
                            title="Mover arriba"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <GripVertical className={`h-3 w-3 ${styles.textMuted} mx-auto`} />
                          <button
                            onClick={() => handleMoveItem(item.id, 'down')}
                            disabled={index === items.length - 1}
                            className={`p-1 ${styles.textMuted} hover:text-blue-600 disabled:opacity-30 hover:bg-blue-50 rounded transition-colors group`}
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
                          className={`w-full px-2 py-1 border rounded text-sm ${styles.input}`}
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div className={`font-medium ${styles.text} flex items-center space-x-2`}>
                            <span>{item.descripcion}</span>
                            {/* Badges de estado */}
                            {item.esPersonalizado && (
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                <MdRemoveShoppingCart className="h-3 w-3 inline mr-1" />
                                Fuera de sistema
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
                              <span className={`text-xs ${styles.textMuted} font-mono flex items-center`}>
                                <Barcode className="h-3 w-3 mr-1" />
                                {item.codigo}
                              </span>
                            )}
                            {/* Solo mostrar badge de categoría si NO es personalizado (ya tiene su propio badge) */}
                            {!item.esPersonalizado && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.categoria)}`}>
                                <Tag className="h-3 w-3 mr-1" />
                                {item.categoria}
                              </span>
                            )}
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
                          className={`w-16 px-2 py-1 border rounded text-sm text-center ${styles.input}`}
                        />
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={Number(item.cantidad || 0)}
                          onChange={async (e) => {
                            const nuevaCantidad = parseInt(e.target.value) || 0;

                            if (item.productoId && !item.esPersonalizado && nuevaCantidad > Number(item.cantidad || 0)) {
                              try {
                                const { inventario } = useInventarioStore.getState();
                                const productoInventario = inventario.find(p => p.id === item.productoId);

                                if (productoInventario && !esServicio(productoInventario)) {
                                  const stockInfo = await obtenerStockDisponibleAPI(item.productoId, sesionId);
                                  const stockTotal = stockInfo?.stock?.stockTotal || 0;

                                  if (stockTotal < nuevaCantidad) {
                                    toast.error(`Stock insuficiente para ${item.descripcion}. Intentaste: ${nuevaCantidad}, Disponible: ${stockTotal}`, {
                                      duration: 4000
                                    });

                                    const cantidadAjustada = Math.max(0, Math.min(nuevaCantidad, stockTotal));
                                    const updatedItems = items.map(i =>
                                      i.id === item.id
                                        ? {
                                          ...i,
                                          cantidad: cantidadAjustada,
                                          subtotal: cantidadAjustada * Number(i.precio_unitario || i.precioUnitario || 0)
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

                            const updatedItems = items.map(i =>
                              i.id === item.id
                                ? {
                                  ...i,
                                  cantidad: nuevaCantidad,
                                  subtotal: nuevaCantidad * Number(i.precio_unitario || i.precioUnitario || 0)
                                }
                                : i
                            );

                            onItemsChange(updatedItems);
                          }}
                          disabled={!isEditable}
                          className={`w-16 px-2 py-1 text-center text-sm border rounded ${styles.input} ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''
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
                          className={`w-24 px-2 py-1 border rounded text-sm text-right ${styles.input}`}
                        />
                      ) : (
                        <div>
                          <div className={`font-medium ${styles.text}`}>
                            {formatearVenezolano(Number(item.precio_unitario || item.precioUnitario || 0) * tasaCambio)} Bs
                          </div>
                          <div className={`text-xs ${styles.textMuted}`}>
                            ${Number(item.precio_unitario || item.precioUnitario || 0).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Subtotal */}
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-emerald-600">
                        {formatearVenezolano(Number(item.cantidad || 0) * Number(item.precio_unitario || item.precioUnitario || 0) * tasaCambio)} Bs
                      </div>
                      <div className={`text-xs ${styles.textMuted}`}>
                        ${(Number(item.cantidad || 0) * Number(item.precio_unitario || item.precioUnitario || 0)).toFixed(2)}
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
                              className={`p-1 ${styles.textMuted} hover:bg-gray-100 rounded transition-colors`}
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
                              <div className={`p-1 ${styles.textMuted}`} title="Item de inventario - No editable">
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

      {/*  RESUMEN RÁPIDO */}
      {items.length > 0 && (
        <div className={`mt-4 border-t-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} pt-6 px-4 md:px-12`}>
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-center">
              <div className={`text-sm ${styles.summaryText} font-medium mb-1`}>Total Items</div>
              <div className={`text-2xl font-bold ${styles.summaryValue}`}>
                {items.reduce((sum, item) => sum + item.cantidad, 0)}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className={`text-sm ${styles.summaryText} font-medium mb-1`}>Productos Únicos</div>
              <div className={`text-2xl font-bold ${styles.summaryValue}`}>
                {items.length}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className={`text-sm ${styles.summaryText} font-medium mb-1`}>Subtotal Bs</div>
              <div className={`text-2xl font-bold ${styles.summaryValue}`}>
                {formatearVenezolano(items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0) * tasaCambio)} Bs
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className={`text-sm ${styles.summaryText} font-medium mb-1`}>Subtotal USD</div>
              <div className={`text-2xl font-bold ${styles.summaryValue}`}>
                ${formatearVenezolano(items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0))}
              </div>
            </div>
          </div>

          {/* Indicadores especiales */}
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-current border-opacity-20">
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
                <MdRemoveShoppingCart className="h-3 w-3 mr-1" />
                {items.filter(item => item.esPersonalizado).length} fuera de sistema
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

      {/* Footer Paginación - Estilo Azul Centrado (Similar a PedidosModal) */}
      {items.length > itemsPerPage && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-t border-blue-500 px-4 py-2 grid grid-cols-3 items-center shrink-0 h-14 rounded-lg shadow-lg mt-4">
          {/* Izquierda: Contador */}
          <div className="text-left">
            <span className="text-xs text-blue-100 font-medium opacity-90">
              Total: {items.length} productos
            </span>
          </div>

          {/* Centro: Paginación */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 rounded-lg p-1">
              <button
                onClick={() => setItemsPage(p => Math.max(1, p - 1))}
                disabled={itemsPage === 1}
                className="p-1.5 rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center space-x-1 px-2 border-l border-r border-blue-400/30 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => setItemsPage(num)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${itemsPage === num
                      ? 'bg-white text-blue-700 shadow-md transform scale-105'
                      : 'text-blue-100 hover:bg-white/10'
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setItemsPage(p => Math.min(totalPages, p + 1))}
                disabled={itemsPage === totalPages}
                className="p-1.5 rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Derecha: Espacio vacío para balancear */}
          <div></div>
        </div>
      )}

      {/* Modal Item Personalizado */}
      <ModalItemPersonalizado
        isOpen={showPersonalizado}
        onClose={() => setShowPersonalizado(false)}
        onAgregar={handleAddPersonalizado}
        tasaCambio={tasaCambio}
        theme={theme}
      />
    </div>
  );
};

export default ItemsTable;