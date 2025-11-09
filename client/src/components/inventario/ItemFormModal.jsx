// components/inventario/ItemModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Save, AlertTriangle, CheckCircle, Loader, 
  ArrowLeft, ArrowRight, Zap, RotateCcw
} from 'lucide-react';
import { useInventarioStore } from '../../store/inventarioStore';
import BarcodeScanner from './BarcodeScanner';
import ImageUploader from './ImageUploader';
import PriceCalculator from './PriceCalculator';
import TabNavigation from './TabNavigation';
import toast from '../../utils/toast.jsx';
import { API_CONFIG } from '../../config/api';
import { api } from '../../config/api';



//  HELPER PARA FOCUS AUTOMÁTICO
const focusNextInput = (currentInput) => {
  // Obtener todos los inputs visibles y habilitados
  const allInputs = Array.from(document.querySelectorAll(
    'input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled])'
  )).filter(input => {
    const rect = input.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0; // Solo inputs visibles
  });
  
  const currentIndex = allInputs.indexOf(currentInput);
  if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
    const nextInput = allInputs[currentIndex + 1];
    nextInput.focus();
    
    // Si es un select, abrirlo
    if (nextInput.tagName === 'SELECT') {
      nextInput.click();
    }
    
    // Si es un input de texto, seleccionar contenido
    if (nextInput.type === 'text' || nextInput.type === 'number') {
      nextInput.select();
    }
    
    return true;
  }
  return false;
};

//  HANDLER UNIVERSAL PARA ENTER
const handleEnterKey = (e, callback = null) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    
    // Ejecutar callback si existe (para cálculos automáticos)
    if (callback) {
      callback();
    }
    
    // Saltar al siguiente campo
    focusNextInput(e.target);
  }
};

// ===========================
//  CONSTANTES
// ===========================
const CATEGORIAS_DEFAULT = [
  //  Dispositivos
  'Smartphones',
  'Tablets',
  'Laptops',
  'PC de Escritorio',
  'Consolas de Videojuegos',
  'Smartwatch',
  'Hogar Inteligente',

  //  Audio & Video
  'Audífonos',
  'Cornetas y Parlantes',
  'Micrófonos',
  'Monitores',
  'TV y Pantallas',
  'Proyectores',
  'Streaming & Cámaras',

  //  Gaming
  'Gaming',
  'Accesorios Gaming',
  'Sillas Gamer',
  'Componentes PC Gamer',
  'Controles & Joysticks',
  'Merchandising Gaming',

  //  Accesorios
  'Accesorios',
  'Cables y Adaptadores',
  'Cargadores y Fuentes',
  'Memorias USB y SD',
  'Discos Duros y SSD',
  'Fundas & Protectores',
  'Teclados y Mouse',
  'Redes & WiFi',

  //  Servicios Técnicos
  'Reparaciones',
  'Servicios Técnicos',
  'Mantenimiento de PC',
  'Formateo & Software',
  'Armado de PC',
  'Instalaciones Especiales',

  //  Electrobar / Gadgets
  'Electrobar',
  'Gadgets Curiosos',
  'Coleccionables',
  'Otros',

  //  Extra
  'Ofertas',
  'Accesorios Premium',
  'Otros Productos',
  'Protectores y Energía'
];

// Estado de proveedores cargados desde backend
let PROVEEDORES_CACHE = [];

const UBICACIONES_DEFAULT = [
  'Mostrador de Gancho', 'Mostrador 1 ', 'Mostrador 2', 'Electrobar', 'Servicio Técnico', "Oficina", "Vitrina Caja"
];

//  FUNCIÓN PARA CARGAR PROVEEDORES DESDE BACKEND
const cargarProveedoresDesdeBackend = async () => {
  try {
    const response = await api.get('/proveedores');
    PROVEEDORES_CACHE = response.data?.data?.proveedores || response.data?.proveedores || [];
    return PROVEEDORES_CACHE;
  } catch (error) {
    console.error('Error cargando proveedores:', error);
    toast.error('Error al cargar proveedores');
    return [];
  }
};


// ===========================
//  COMPONENTE PRINCIPAL
// ===========================
const ItemModal = ({ 
  isOpen, 
  onClose, 
  item = null, // null para nuevo, objeto para editar
  onSave = () => {} // callback cuando se guarda exitosamente
}) => {
  const { 
    inventario, 
    loading, 
    agregarItem, 
    actualizarItem 
  } = useInventarioStore();

  // Estados principales
  const [activeTab, setActiveTab] = useState('basico');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isEditing = !!item;
  
  //  Estado para validación visual de código interno
const [codigoInternoError, setCodigoInternoError] = useState(false);

//  ESTADO DEL FORMULARIO UNIFICADO
const [formData, setFormData] = useState({
  // Básico
  descripcion: '',
  tipo: 'producto',
  codigo_barras: '',
  codigo_interno: '',
  categoria: '',
  
  // Precios
  precio_costo: '',
  precio_venta: '',
  margen_porcentaje: '30',
  descuento_maximo: '0',
  
  // Stock
  stock: '',
  stock_minimo: '5',
  stock_maximo: '100',
  ubicacion_fisica: '',
  
  // Multimedia
  imagen_url: '',
  
  // Proveedor
  proveedor: '',
  telefono_proveedor: '',
  proveedor_factura_iva: true, //  NUEVO CAMPO
  
  // Control
  activo: true,
  observaciones: ''
});

  //  Flag para prevenir detección temprana de cambios
  const [isInitializing, setIsInitializing] = useState(true);

  // Detectar cambios no guardados
  useEffect(() => {
    //  NO detectar cambios durante la inicialización
    if (isInitializing) return;

    if (item) {
      // Comparar con datos originales si está editando
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(getInitialFormData(item));
      setHasUnsavedChanges(hasChanges);
    } else {
      // Para nuevo item, detectar si hay algún campo lleno
      const hasData = Object.values(formData).some(value =>
        value !== '' && value !== '30' && value !== '0' && value !== '5' && value !== '100' && value !== true
      );
      setHasUnsavedChanges(hasData);
    }
  }, [formData, item, isInitializing]);

const getInitialFormData = (itemData = null) => {
  if (itemData) {
    return {
      descripcion: itemData.descripcion || '',
      tipo: itemData.tipo || 'producto',
     
      //  CÓDIGOS - Mapeo robusto frontend/backend
      codigo_barras: itemData.codigo_barras || itemData.codigoBarras || '',
      codigo_interno: itemData.codigo_interno || itemData.codigoInterno || '',
     
      categoria: itemData.categoria || '',
     
      //  PRECIOS - Mapeo completo de todas las variantes
      precio_costo: itemData.precio_costo?.toString() || itemData.precioCosto?.toString() || '',
      precio_venta: itemData.precio_venta?.toString() || itemData.precioVenta?.toString() || itemData.precio?.toString() || '',
      margen_porcentaje: itemData.margen_porcentaje?.toString() || itemData.margenPorcentaje?.toString() || '30',
     
      descuento_maximo: itemData.descuento_maximo?.toString() || '0',
     
      //  STOCK - Mapeo de variantes
      stock: itemData.stock?.toString() || '',
      stock_minimo: itemData.stock_minimo?.toString() || itemData.stockMinimo?.toString() || '5',
      stock_maximo: itemData.stock_maximo?.toString() || itemData.stockMaximo?.toString() || '100',
     
      //  UBICACIÓN E IMAGEN
      ubicacion_fisica: itemData.ubicacion_fisica || itemData.ubicacionFisica || '',
      imagen_url: itemData.imagen_url || itemData.imagenUrl || '',
     
      //  PROVEEDOR
      proveedor: itemData.proveedor || '',
      telefono_proveedor: itemData.telefono_proveedor || itemData.telefonoProveedor || '',
      proveedor_factura_iva: itemData.proveedor_factura_iva !== undefined ? itemData.proveedor_factura_iva : true, //  NUEVO CAMPO
     
      //  CONTROL
      activo: itemData.activo !== undefined ? itemData.activo : true,
      observaciones: itemData.observaciones || ''
    };
  }
   
    return {
      descripcion: '',
      tipo: 'producto',
      codigo_barras: '',
      codigo_interno: '',
      categoria: '',
      precio_costo: '',
      precio_venta: '',
      margen_porcentaje: '30',
      descuento_maximo: '0',
      stock: '',
      stock_minimo: '5',
      stock_maximo: '100',
      ubicacion_fisica: '',
      imagen_url: '',
      proveedor: '',
      telefono_proveedor: '',
      proveedor_factura_iva: true, //  NUEVO CAMPO
      activo: true,
      observaciones: ''
    };
  };

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    console.log(' [ItemFormModal] useEffect isOpen cambió:', {
      isOpen,
      item: item?.id || 'nuevo',
      timestamp: new Date().toISOString()
    });

    if (isOpen) {
      console.log(' [ItemFormModal] Modal ABIERTO - Inicializando...');
      setIsInitializing(true); //  Marcar que estamos inicializando
      const initialData = getInitialFormData(item);
      setFormData(initialData);
      setActiveTab('basico');
      setHasUnsavedChanges(false);

      //  Desactivar flag de inicialización después de un momento
      const timer = setTimeout(() => {
        console.log(' [ItemFormModal] Inicialización completada - Listo para editar');
        setIsInitializing(false);
      }, 500);

      //  PROTECCIÓN: Marcar modal como activo en el almacenamiento de sesión
      // Esto evita que otros eventos cierren este modal
      sessionStorage.setItem('itemFormModalActive', 'true');
      console.log(' [ItemFormModal] Modal marcado como activo en sesión');

      return () => {
        console.log(' [ItemFormModal] Cleanup del useEffect');
        clearTimeout(timer);
        //  Limpiar marca de modal activo
        sessionStorage.removeItem('itemFormModalActive');
      };
    } else {
      console.log(' [ItemFormModal] Modal CERRADO');
      //  Resetear flag cuando se cierra
      setIsInitializing(true);
      //  Asegurar limpieza de marca de sesión
      sessionStorage.removeItem('itemFormModalActive');
    }
  }, [isOpen, item]);

// Cargar proveedores al abrir modal
useEffect(() => {
  if (isOpen) {
    cargarProveedoresDesdeBackend();
  }
}, [isOpen]);

  // Obtener códigos existentes para validación
  const existingCodes = inventario
    .filter(inventoryItem => inventoryItem.id !== item?.id) // Excluir item actual si está editando
    .map(inventoryItem => inventoryItem.codigo_barras)
    .filter(Boolean);

  // Actualizar campo del formulario
  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  //  Validar código interno en tiempo real
const validateCodigoInterno = useCallback((codigo) => {
  if (!codigo || isEditing) {
    setCodigoInternoError(false);
    return;
  }
  
  const existingInternalCodes = inventario
    .filter(inventoryItem => inventoryItem.id !== item?.id)
    .map(inventoryItem => inventoryItem.codigo_interno)
    .filter(Boolean);
    
  const isDuplicate = existingInternalCodes.includes(codigo.toUpperCase());
  setCodigoInternoError(isDuplicate);
}, [inventario, item, isEditing]);

// Ejecutar validación cuando cambie el código interno
useEffect(() => {
  validateCodigoInterno(formData.codigo_interno);
}, [formData.codigo_interno, validateCodigoInterno]);

  //  NUEVO - Sin spam de notificaciones
//  VERSIÓN ÁGIL CON AUTOSELECT Y FOCUS
const handleBarcodeScan = useCallback((code) => {
  // Buscar productos existentes (solo activos)
  const existingItem = inventario.find(inventoryItem =>
    inventoryItem.codigo_barras?.toUpperCase() === code.toUpperCase() &&
    inventoryItem.id !== item?.id &&
    inventoryItem.activo !== false // Solo productos activos
  );
 
  if (existingItem) {
    //  AUTOSELECT - Preguntar si quiere usar los datos existentes
    toast(
      (t) => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium"> Producto encontrado:</div>
          <div className="text-sm text-gray-600">{existingItem.descripcion}</div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                //  AUTO-LLENAR DATOS
                const datosExistentes = {
                  descripcion: existingItem.descripcion?.toUpperCase() || '',
                  tipo: existingItem.tipo || 'producto',
                  categoria: existingItem.categoria || '',
                  precio_costo: existingItem.precio_costo?.toString() || existingItem.precioCosto?.toString() || '',
                  precio_venta: existingItem.precio_venta?.toString() || existingItem.precioVenta?.toString() || existingItem.precio?.toString() || '',
                  margen_porcentaje: existingItem.margen_porcentaje?.toString() || existingItem.margenPorcentaje?.toString() || '30',
                  proveedor: existingItem.proveedor || '',
                  telefono_proveedor: existingItem.telefono_proveedor || existingItem.telefonoProveedor || '',
                  observaciones: `BASADO EN: ${existingItem.descripcion} - ${new Date().toLocaleDateString()}`
                };
                
                setFormData(prev => ({
                  ...prev,
                  ...datosExistentes,
                  codigo_barras: code
                }));
                
                toast.dismiss(t.id);
                toast.success('Datos cargados automáticamente');
                
                //  FOCUS AL STOCK
                setTimeout(() => {
                  const stockInput = document.querySelector('input[type="number"][placeholder="0"]');
                  if (stockInput) {
                    stockInput.focus();
                    stockInput.select();
                    toast.info('Ajuste el stock si es necesario', { duration: 2000 });
                  }
                }, 500);
              }}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
               Usar datos
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                // Solo guardar el código, mantener formulario actual
                updateFormData('codigo_barras', code);
              }}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
               Solo código
            </button>
          </div>
        </div>
      ),
      { duration: 8000, position: 'top-center' }
    );
  } else {
    // Código nuevo - comportamiento normal
    updateFormData('codigo_barras', code);
    
    // Generar código interno automáticamente
    if (!formData.codigo_interno) {
      const timestamp = Date.now().toString().slice(-4);
      updateFormData('codigo_interno', `INT${timestamp}`);
    }
    
    //  FOCUS AL SIGUIENTE CAMPO
    setTimeout(() => {
      if (!formData.descripcion) {
        const descripcionInput = document.querySelector('input[placeholder*="DESCRIPTIVO"]');
        if (descripcionInput) {
          descripcionInput.focus();
          toast.info('Complete la descripción', { duration: 2000 });
        }
      } else {
        const categoriaSelect = document.querySelector('select[value=""]');
        if (categoriaSelect) {
          categoriaSelect.focus();
          categoriaSelect.click();
          toast.info('Seleccione la categoría', { duration: 2000 });
        }
      }
    }, 300);
  }
}, [inventario, item, formData, updateFormData, setFormData]);

  // Validar formulario completo
  const validateForm = () => {
    const errors = [];

    // Validaciones básicas
    if (!formData.descripcion.trim()) {
      errors.push({ tab: 'basico', message: 'La descripción es obligatoria' });
    }

    if (!formData.codigo_barras.trim()) {
      errors.push({ tab: 'basico', message: 'El código de barras es obligatorio' });
    }

 //  PERMITIR códigos duplicados - solo mostrar warning en consola
if (!item && existingCodes.includes(formData.codigo_barras.toUpperCase())) {
  console.warn(' Código de barras duplicado detectado:', formData.codigo_barras);
  // Ya NO es error - permitir guardar items con códigos duplicados
}
//  VALIDAR que código interno SÍ sea único (CRÍTICO)
const existingInternalCodes = inventario
  .filter(inventoryItem => inventoryItem.id !== item?.id)
  .map(inventoryItem => inventoryItem.codigo_interno)
  .filter(Boolean);

if (formData.codigo_interno && existingInternalCodes.includes(formData.codigo_interno.toUpperCase())) {
  errors.push({ tab: 'basico', message: 'El código interno ya existe - debe ser único' });
}

    // Validaciones de precios
    if (!formData.precio_costo || parseFloat(formData.precio_costo) <= 0) {
      errors.push({ tab: 'precios', message: 'El precio de costo debe ser mayor a 0' });
    }

    if (!formData.precio_venta || parseFloat(formData.precio_venta) <= 0) {
      errors.push({ tab: 'precios', message: 'El precio de venta debe ser mayor a 0' });
    }

    if (formData.precio_costo && formData.precio_venta && 
        parseFloat(formData.precio_venta) <= parseFloat(formData.precio_costo)) {
      errors.push({ tab: 'precios', message: 'El precio de venta debe ser mayor al precio de costo' });
    }

    // Validaciones de stock (solo para productos y electrobar)
    if ((formData.tipo === 'producto' || formData.tipo === 'electrobar') && 
        (!formData.stock || parseInt(formData.stock) < 0)) {
      errors.push({ 
        tab: 'stock', 
        message: `Los ${formData.tipo === 'producto' ? 'productos' : 'items de electrobar'} deben tener stock válido` 
      });
    }

    // Validaciones de proveedor (solo para productos y electrobar)
    if ((formData.tipo === 'producto' || formData.tipo === 'electrobar') && !formData.proveedor) {
      errors.push({ tab: 'proveedor', message: 'Debe seleccionar un proveedor' });
    }

    return errors;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    
    if (errors.length > 0) {
      const firstError = errors[0];
      setActiveTab(firstError.tab);
      toast.error(firstError.message, {
        duration: 4000,
      });
      return;
    }

    setSaving(true);

  //  DEBUG TEMPORAL
  console.log(' ITEMFORMMODAL - Guardando producto...');
  console.log(' API Estado:', window.inventarioAPI?.estado());
  console.log(' FormData completo:', formData);
  console.log(' Precios específicos:', {
    precio_costo: formData.precio_costo,
    precio_venta: formData.precio_venta,
    tipo_precio_costo: typeof formData.precio_costo,
    tipo_precio_venta: typeof formData.precio_venta
  });

    try {
      const itemData = {
        descripcion: formData.descripcion.trim(),
        tipo: formData.tipo,
        codigoBarras: formData.codigo_barras.toUpperCase(),
        codigoInterno: formData.codigo_interno || `INT${Date.now()}`,
        categoria: formData.categoria,
        precioVenta: parseFloat(formData.precio_venta),
        precioCosto: parseFloat(formData.precio_costo),
        margenPorcentaje: parseFloat(formData.margen_porcentaje),
        stock: formData.tipo === 'servicio' ? null : parseInt(formData.stock) || 0,
        stockMinimo: parseInt(formData.stock_minimo) || 5,
        stockMaximo: parseInt(formData.stock_maximo) || 100,
        ubicacionFisica: formData.ubicacion_fisica,
        imagenUrl: typeof formData.imagen_url === 'object' 
          ? formData.imagen_url.url 
          : formData.imagen_url,
        proveedor: formData.proveedor,
        telefonoProveedor: formData.telefono_proveedor,
        activo: formData.activo,
        observaciones: formData.observaciones.trim(),
        fecha_actualizacion: new Date().toISOString(),
        ...(item ? {} : { fecha_creacion: new Date().toISOString() })
      };

      console.log(' ItemData final:', itemData);

      //  MANEJAR IMAGEN TEMPORAL - MOVER A DEFINITIVO
            let savedItem;
              if (item) {
                savedItem = await actualizarItem(item.id, formData);
                toast.success(`${formData.descripcion} actualizado correctamente`, {
                  duration: 3000,
                });
              } else {
                savedItem = await agregarItem(formData);
                toast.success(`${formData.descripcion} agregado al inventario`, {
                  duration: 3000,
                });
              }

      // Callback de éxito
      if (onSave && typeof onSave === 'function') {
        onSave(savedItem);
      }

      // Cerrar modal después de guardar exitosamente
      setHasUnsavedChanges(false);
      setIsInitializing(true);

      //  Limpiar marca de modal activo ANTES de cerrar
      sessionStorage.removeItem('itemFormModalActive');

      //  APLICAR ACTUALIZACIONES PENDIENTES DE INVENTARIO
      const actualizacionPendiente = sessionStorage.getItem('inventarioPendienteActualizar') === 'true';
      if (actualizacionPendiente) {
        console.log(' Aplicando actualización de inventario pendiente...');
        sessionStorage.removeItem('inventarioPendienteActualizar');

        // Recargar inventario después de cerrar el modal
        setTimeout(async () => {
          const { useInventarioStore } = await import('../../store/inventarioStore');
          await useInventarioStore.getState().obtenerInventario();
          toast.success('Inventario actualizado', { duration: 2000 });
        }, 300);
      }

      onClose();

    } catch (error) {
      console.error('Error al guardar item:', error);
      toast.error(error.message || 'Error al guardar el item', {
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };


  // Helper para convertir URLs de imagen
const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // Si ya es una URL completa, devolverla tal como está
  if (imagePath.startsWith('http')) return imagePath;
  
  // Si es una ruta de uploads, convertir a URL del servidor
  if (imagePath.startsWith('/uploads/')) {
    return `${API_CONFIG.BASE_URL.replace('/api', '')}${imagePath}`;
  }
  
  // Si es base64, devolverla tal como está
  if (imagePath.startsWith('data:')) return imagePath;
  
  return imagePath;
};

  // Manejar cierre con confirmación si hay cambios
 const [showExitModal, setShowExitModal] = useState(false);

const handleClose = () => {
  console.log(' handleClose llamado:', {
    hasUnsavedChanges,
    saving,
    isInitializing,
    willShowExitModal: hasUnsavedChanges && !saving && !isInitializing
  });

  //  NO mostrar confirmación si está inicializando o guardando
  if (hasUnsavedChanges && !saving && !isInitializing) {
    console.log(' Mostrando modal de confirmación');
    setShowExitModal(true);
  } else {
    console.log(' Cerrando modal directamente');
    //  Limpiar estados antes de cerrar
    setShowExitModal(false);
    setHasUnsavedChanges(false);
    setIsInitializing(true);

    //  Limpiar marca de modal activo
    sessionStorage.removeItem('itemFormModalActive');

    //  APLICAR ACTUALIZACIONES PENDIENTES
    const actualizacionPendiente = sessionStorage.getItem('inventarioPendienteActualizar') === 'true';
    if (actualizacionPendiente) {
      console.log(' Aplicando actualización de inventario pendiente (al cancelar)...');
      sessionStorage.removeItem('inventarioPendienteActualizar');

      setTimeout(async () => {
        const { useInventarioStore } = await import('../../store/inventarioStore');
        await useInventarioStore.getState().obtenerInventario();
        toast.success('Inventario actualizado', { duration: 2000 });
      }, 300);
    }

    onClose();
  }
};

const handleConfirmExit = () => {
  setHasUnsavedChanges(false);
  setShowExitModal(false);

  //  Limpiar marca de modal activo
  sessionStorage.removeItem('itemFormModalActive');

  //  APLICAR ACTUALIZACIONES PENDIENTES
  const actualizacionPendiente = sessionStorage.getItem('inventarioPendienteActualizar') === 'true';
  if (actualizacionPendiente) {
    console.log(' Aplicando actualización de inventario pendiente (confirmación de salida)...');
    sessionStorage.removeItem('inventarioPendienteActualizar');

    setTimeout(async () => {
      const { useInventarioStore } = await import('../../store/inventarioStore');
      await useInventarioStore.getState().obtenerInventario();
      toast.success('Inventario actualizado', { duration: 2000 });
    }, 300);
  }

  onClose();
};

const handleCancelExit = () => {
  setShowExitModal(false);
};

  // Resetear formulario
  const resetForm = () => {
    if (window.confirm('¿Resetear todos los campos del formulario?')) {
      const initialData = getInitialFormData(null);
      setFormData(initialData);
      setActiveTab('basico');
      setHasUnsavedChanges(false);
      toast.success('Formulario reiniciado');
    }
  };

  // Navegación entre tabs
  const navigateTab = (direction) => {
    const tabs = ['basico', 'proveedor', 'precios', 'stock', 'multimedia', 'estadisticas'];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (direction === 'next' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      // Ctrl+S para guardar
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSubmit(e);
      }
      
      // Escape para cerrar
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }

      // Ctrl+R para resetear
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        resetForm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasUnsavedChanges, saving]);

  if (!isOpen) {
    console.log(' [ItemFormModal] No renderizando - isOpen es false');
    return null;
  }

  console.log(' [ItemFormModal] Renderizando modal:', {
    isOpen,
    isInitializing,
    hasUnsavedChanges,
    saving
  });

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        console.log(' [ItemFormModal] Clic en backdrop:', {
          isCurrentTarget: e.target === e.currentTarget,
          isInitializing,
          willClose: e.target === e.currentTarget && !isInitializing
        });
        //  Solo cerrar si se hace clic en el backdrop, no en el contenido del modal
        if (e.target === e.currentTarget && !isInitializing) {
          console.log(' [ItemFormModal] Cerrando por clic en backdrop');
          handleClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => {
          console.log(' [ItemFormModal] Clic dentro del modal - Propagación detenida');
          e.stopPropagation();
        }} //  Prevenir que los clics dentro del modal se propaguen
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <span className="text-xl">
                    {formData.tipo === 'producto' ? '' : 
                     formData.tipo === 'servicio' ? '' : 
                     formData.tipo === 'electrobar' ? '' : ''}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {item ? ' Editar Item' : ' Nuevo Item'}
                  </h2>
                  <div className="text-sm text-white/90">
                    {formData.descripcion || 'Complete la información del item'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Indicador de cambios */}
                {hasUnsavedChanges && (
                  <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-300/30 text-orange-100 px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                    <div className="w-2 h-2 bg-orange-300 rounded-full animate-pulse"></div>
                    <span>Cambios sin guardar</span>
                  </div>
                )}
                
                {/* Botón reset */}
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
                  title="Resetear formulario (Ctrl+R)"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                
              </div>
            </div>
          </div>
        </div>

        {/* Contenido con tabs */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          
          {/* Tab Navigation */}
          <TabNavigation 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            formData={formData}
            editingItem={item}
          />

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* TAB 1: INFORMACIÓN BÁSICA */}
            {activeTab === 'basico' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                       Descripción del Item *
                    </label>
                    
                    {isEditing ? (
                      // Modo SOLO LECTURA cuando edita
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.descripcion}
                          readOnly
                          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                           Campo protegido - No se puede modificar al editar
                        </div>
                      </div>
                    ) : (
                      // Modo NORMAL cuando crea nuevo
                      <input
                        type="text"
                        value={formData.descripcion}
                        onChange={(e) => {
                          const valor = e.target.value.toUpperCase();
                          updateFormData('descripcion', valor);
                        }}
                        onKeyDown={handleEnterKey}
                        placeholder="NOMBRE DESCRIPTIVO DEL PRODUCTO, SERVICIO O ITEM"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors uppercase"
                        required
                        autoFocus
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                       Estado
                    </label>
                    <div className="flex justify-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <span className={`mr-3 text-sm font-medium ${
                          !formData.activo ? 'text-red-600' : 'text-gray-400'
                        }`}>
                           Inactivo
                        </span>
                        
                        <input
                          type="checkbox"
                          checked={formData.activo}
                          onChange={(e) => updateFormData('activo', e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out ${
                            formData.activo ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                          <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ease-in-out flex items-center justify-center ${
                            formData.activo ? 'transform translate-x-6' : ''
                          }`}>
                            <span className="text-xs">
                              {formData.activo ? 'I' : 'O'}
                            </span>
                          </div>
                        </div>
                        
                        <span className={`ml-3 text-sm font-medium ${
                          formData.activo ? 'text-green-700' : 'text-gray-400'
                        }`}>
                           Activo
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                       Tipo de Item *
                    </label>
                    
                    {isEditing ? (
                      // Modo SOLO LECTURA cuando edita
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.tipo === 'producto' ? ' Producto' : 
                                formData.tipo === 'servicio' ? ' Servicio' : 
                                ' Electrobar'}
                          readOnly
                          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                           Campo protegido - No se puede modificar al editar
                        </div>
                      </div>
                    ) : (
                      // Modo NORMAL cuando crea nuevo
                      <select
                        value={formData.tipo}
                        onChange={(e) => updateFormData('tipo', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        <option value="producto"> Producto</option>
                        <option value="servicio"> Servicio</option>
                        <option value="electrobar"> Electrobar</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                       Categoría
                    </label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => updateFormData('categoria', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Seleccionar categoría...</option>
                      {CATEGORIAS_DEFAULT.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
  
  {/* Código de Barras */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
       Código de Barras *
    </label>
    
    {isEditing ? (
      // Modo SOLO LECTURA cuando edita
      <div className="relative">
        <input
          type="text"
          value={formData.codigo_barras}
          readOnly
          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          
        </div>
        <div className="text-xs text-gray-500 mt-1">
           Campo protegido - No se puede modificar al editar
        </div>
      </div>
    ) : (
      // Modo NORMAL cuando crea nuevo
      <BarcodeScanner
        value={formData.codigo_barras}
        onChange={(value) => updateFormData('codigo_barras', value)}
        onScan={handleBarcodeScan}
        existingCodes={existingCodes}
        required
      />
    )}
  </div>

  {/* Código Interno */}
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
     Código Interno
  </label>
  <input
    type="text"
    value={formData.codigo_interno}
    onChange={isEditing ? undefined : (e) => updateFormData('codigo_interno', e.target.value.toUpperCase())}
    placeholder={isEditing ? "Campo protegido" : "INT001, SKU123..."}
    readOnly={isEditing}
    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
      isEditing 
        ? 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed' 
        : codigoInternoError
          ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
    }`}
  />
  <div className="text-xs mt-1">
    {isEditing ? (
      <span className="text-gray-500"> Campo protegido - No se puede modificar al editar</span>
    ) : codigoInternoError ? (
      <span className="text-red-600 flex items-center space-x-1">
        <span> Este código interno ya existe en el inventario</span>
      </span>
    ) : (
      <span className="text-gray-500"> Se genera automáticamente si se deja vacío</span>
    )}
  </div>
</div>

</div>

                  
                </div>

                {/* Observaciones Adicionales */}
                <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">
                         Observaciones Adicionales
                      </label>
                      <span className="text-xs text-gray-500">
                         Información adicional que aparecerá en el detalle del producto
                      </span>
                    </div>
                    
                    {isEditing ? (
                      // Modo SOLO LECTURA cuando edita
                      <div className="relative">
                        <textarea
                          value={formData.observaciones}
                          readOnly
                          rows={2}
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed resize-none"
                        />
                        <div className="absolute right-3 top-2">
                          
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                           Campo protegido - No se puede modificar al editar
                        </div>
                      </div>
                    ) : (
                      // Modo NORMAL cuando crea nuevo
                      <textarea
                        value={formData.observaciones}
                        onChange={(e) => updateFormData('observaciones', e.target.value)}
                        placeholder="Detalles adicionales, especificaciones, notas importantes..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      />
                    )}
                  </div>
              </div>
            )}

            {/* TAB 2: PRECIOS Y COSTOS */}
            {activeTab === 'precios' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                       Precio de Costo (USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio_costo}
                      onChange={(e) => updateFormData('precio_costo', e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, () => {
                        const costo = parseFloat(e.target.value) || 0;
                        const margen = parseFloat(formData.margen_porcentaje) || 30;
                        if (costo > 0) {
                          const precioVenta = costo * (1 + margen / 100);
                          updateFormData('precio_venta', precioVenta.toFixed(2));
                          toast.success(`Precio calculado: $${precioVenta.toFixed(2)}`, { duration: 2000 });
                        }
                      })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      required
                    />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                       Margen de Ganancia (%)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">%</span>
                      <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1000"
                      value={formData.margen_porcentaje}
                      onChange={(e) => updateFormData('margen_porcentaje', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const margen = parseFloat(e.target.value) || 30;
                          const costo = parseFloat(formData.precio_costo) || 0;
                          const venta = parseFloat(formData.precio_venta) || 0;
                          
                          if (costo > 0) {
                            // Calcular precio de venta basado en costo + margen
                            const nuevoPrecioVenta = costo * (1 + margen / 100);
                            updateFormData('precio_venta', nuevoPrecioVenta.toFixed(2));
                          } else if (venta > 0) {
                            // Calcular precio de costo basado en venta - margen
                            const nuevoPrecioCosto = venta / (1 + margen / 100);
                            updateFormData('precio_costo', nuevoPrecioCosto.toFixed(2));
                          }
                        }
                      }}
                      placeholder="30.0"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                       Precio de Venta (USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio_venta}
                      onChange={(e) => updateFormData('precio_venta', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const venta = parseFloat(e.target.value) || 0;
                          const costo = parseFloat(formData.precio_costo) || 0;
                          if (venta > 0 && costo > 0) {
                            // Calcular margen: ((venta - costo) / costo) * 100
                            const margenCalculado = ((venta - costo) / costo) * 100;
                            updateFormData('margen_porcentaje', margenCalculado.toFixed(1));
                            toast.success(`Margen calculado: ${margenCalculado.toFixed(1)}%`, {
                              duration: 2000,
                            });
                          }
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      required
                    />
                    </div>
                  </div>
                </div>

                {/* Calculadora de Precios */}
                <PriceCalculator 
                  formData={formData} 
                  setFormData={setFormData} 
                />

              </div>
            )}

            {/* TAB 3: INVENTARIO Y STOCK */}
            {activeTab === 'stock' && (
              <div className="space-y-6">
                
                {(formData.tipo === 'producto' || formData.tipo === 'electrobar') ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                           Stock Actual *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock}
                          onChange={(e) => updateFormData('stock', e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                           Stock Mínimo
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_minimo}
                          onChange={(e) => updateFormData('stock_minimo', e.target.value)}
                          placeholder="5"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                           Alerta cuando el stock esté por debajo
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                           Stock Máximo
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_maximo}
                          onChange={(e) => updateFormData('stock_maximo', e.target.value)}
                          placeholder="100"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                       />
                       <div className="text-xs text-gray-500 mt-1">
                          Capacidad máxima recomendada
                       </div>
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ubicación Física
                     </label>
                     <select
                       value={formData.ubicacion_fisica}
                       onChange={(e) => updateFormData('ubicacion_fisica', e.target.value)}
                       className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                     >
                       <option value="">Seleccionar ubicación...</option>
                       {UBICACIONES_DEFAULT.map(ubicacion => (
                         <option key={ubicacion} value={ubicacion}>{ubicacion}</option>
                       ))}
                     </select>
                     <div className="text-xs text-gray-500 mt-1">
                        Donde se encuentra físicamente el item en el negocio
                     </div>
                   </div>
                    {/* Alertas de Stock */}
                   {formData.stock && formData.stock_minimo && parseInt(formData.stock) <= parseInt(formData.stock_minimo) && (
                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                       <div className="flex items-center space-x-2">
                         <AlertTriangle className="h-5 w-5 text-orange-600" />
                         <span className="font-semibold text-orange-800"> Stock Bajo Detectado</span>
                       </div>
                       <div className="text-sm text-orange-700 mt-1">
                         El stock actual ({formData.stock}) está en el límite mínimo ({formData.stock_minimo}). 
                         Considere reabastecer pronto.
                       </div>
                     </div>
                   )}

                   {formData.tipo === 'electrobar' && (
                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                       <div className="flex items-center space-x-2 mb-2">
                         <span className="text-lg"></span>
                         <span className="font-semibold text-orange-800">Tips para Electrobar</span>
                       </div>
                       <div className="text-sm text-orange-700 space-y-1">
                         <div>•  Mantener stock mínimo de 10-15 unidades</div>
                         <div>•  Verificar fechas de vencimiento regularmente</div>
                         <div>•  Almacenar en lugar fresco y seco</div>
                         <div>•  Margen recomendado: 40-60%</div>
                       </div>
                     </div>
                   )}
                 </>
               ) : (
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                   <div className="flex items-center justify-center space-x-2 mb-3">
                     <span className="text-2xl"></span>
                     <span className="font-semibold text-blue-800 text-lg">Los servicios no manejan stock físico</span>
                   </div>
                   <div className="text-sm text-blue-700 max-w-md mx-auto">
                     Los servicios técnicos se registran por demanda y no requieren control de inventario físico.
                     El stock se considera ilimitado para este tipo de items.
                   </div>
                 </div>
               )}
             </div>
           )}

           {/* TAB 4: MULTIMEDIA */}
           {activeTab === 'multimedia' && (
             <div className="space-y-6">
               
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Imagen del Item
                 </label>
                 <ImageUploader
                    value={formData.imagen_url}
                    onChange={(value) => updateFormData('imagen_url', value)}
                    productInfo={{
                      id: item?.id,
                      codigo_interno: formData.codigo_interno,
                      codigo_barras: formData.codigo_barras,
                      codigoInterno: formData.codigo_interno,
                      codigoBarras: formData.codigo_barras
                    }}
                    className="w-full"
                  />
               </div>

               {/* Preview del item en el sistema */}
               {(formData.descripcion || formData.imagen_url) && (
                 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                   <h4 className="font-semibold text-gray-900 mb-3"> Vista Previa en Sistema:</h4>
                   <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                     {formData.imagen_url ? (
                       <img 
                         src={formData.imagen_url} 
                         alt="Preview" 
                         className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                       />
                     ) : (
                       <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                         <span className="text-2xl">
                           {formData.tipo === 'producto' ? '' : 
                            formData.tipo === 'servicio' ? '' : 
                            formData.tipo === 'electrobar' ? '' : ''}
                         </span>
                       </div>
                     )}
                     <div className="flex-1 min-w-0">
                       <div className="font-semibold text-gray-900 truncate">
                         {formData.descripcion || 'Nombre del item'}
                       </div>
                       <div className="text-sm text-gray-600 flex items-center space-x-2">
                         <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                           formData.tipo === 'producto' ? 'bg-blue-100 text-blue-700' :
                           formData.tipo === 'servicio' ? 'bg-green-100 text-green-700' :
                           formData.tipo === 'electrobar' ? 'bg-orange-100 text-orange-700' :
                           'bg-gray-100 text-gray-700'
                         }`}>
                           {formData.tipo}
                         </span>
                         {formData.categoria && (
                           <span className="text-gray-500">• {formData.categoria}</span>
                         )}
                       </div>
                       <div className="text-lg font-bold text-green-600 mt-1">
                         ${parseFloat(formData.precio_venta || 0).toFixed(2)}
                       </div>
                       {formData.stock && formData.tipo !== 'servicio' && (
                         <div className="text-xs text-gray-500">
                           Stock: {formData.stock} unidades
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}

           {/* TAB 2: PROVEEDORES Y DATOS */}
{activeTab === 'proveedor' && (
  <div className="space-y-6">
    
    {formData.tipo === 'servicio' ? (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <span className="text-2xl"></span>
          <span className="font-semibold text-blue-800 text-lg">Los servicios no requieren proveedor</span>
        </div>
        <div className="text-sm text-blue-700 max-w-md mx-auto">
          Los servicios técnicos son prestados directamente por el negocio, 
          por lo que no necesitan información de proveedores externos.
        </div>
        <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
          <div className="text-sm text-green-700 font-medium"> IVA automático:</div>
          <div className="text-xs text-green-600">Se aplicará 16% de IVA sobre el precio base en las ventas</div>
        </div>
      </div>
    ) : (
      <>
       {/*  SECCIÓN IVA DEL PROVEEDOR - COMPACTA */}
<div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4">
  <div className="flex items-center space-x-2 mb-3">
    <h4 className="text-sm font-bold text-yellow-900">Información de IVA del Proveedor</h4>
  </div>
  
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-yellow-800 mb-2">
        ¿El proveedor te facturó con IVA incluido?
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.proveedor_factura_iva 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-white hover:border-green-300'
                }`}>
                  <input
                    type="radio"
                    name="proveedor_factura_iva"
                    checked={formData.proveedor_factura_iva === true}
                    onChange={() => setFormData({...formData, proveedor_factura_iva: true})}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg"></span>
                      <span className="font-semibold text-green-700">SÍ, con factura</span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      El proveedor me cobró IVA (16% incluido en el precio)
                    </div>
                  </div>
                </label>
                
                <label className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  !formData.proveedor_factura_iva 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-300 bg-white hover:border-orange-300'
                }`}>
                  <input
                    type="radio"
                    name="proveedor_factura_iva"
                    checked={formData.proveedor_factura_iva === false}
                    onChange={() => setFormData({...formData, proveedor_factura_iva: false})}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg"></span>
                      <span className="font-semibold text-orange-700">NO, sin factura</span>
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      Proveedor informal, no me cobró IVA
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Explicación del impacto */}
            <div className={`p-4 rounded-lg ${
              formData.proveedor_factura_iva 
                ? 'bg-green-100 border border-green-200' 
                : 'bg-orange-100 border border-orange-200'
            }`}>
              <div className="text-sm">
                <div className={`font-medium mb-2 ${
                  formData.proveedor_factura_iva ? 'text-green-800' : 'text-orange-800'
                }`}>
                   Impacto en el cálculo de precios:
                </div>
                <div className={`text-xs ${
                  formData.proveedor_factura_iva ? 'text-green-700' : 'text-orange-700'
                }`}>
                  {formData.proveedor_factura_iva 
                    ? 'El sistema descontará el IVA del costo para calcular tu margen sobre la base real.'
                    : 'Tu costo registrado será la base para calcular márgenes, y se agregará IVA en la venta.'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* INFORMACIÓN DEL PROVEEDOR */}
        <div className="grid grid-cols-1 gap-5">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
               Proveedor *
            </label>
            <select
              value={formData.proveedor}
              onChange={(e) => updateFormData('proveedor', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required={formData.tipo !== 'servicio'}
            >
              <option value="">Seleccionar proveedor...</option>
              {PROVEEDORES_CACHE.map(proveedor => (
                <option key={proveedor.id} value={proveedor.nombre}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
               Puede agregar más proveedores desde Configuración
            </div>
          </div>
        </div>

       {/* Información del proveedor seleccionado */}
{formData.proveedor && (() => {
  const proveedorSeleccionado = PROVEEDORES_CACHE.find(p => p.nombre === formData.proveedor);
  return proveedorSeleccionado ? (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h4 className="font-semibold text-green-800 mb-3 flex items-center">
        <span className="mr-2"></span>
        Información del Proveedor
      </h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col">
          <span className="text-green-600 font-medium">Nombre:</span>
          <div className="text-green-800 font-semibold break-words">{proveedorSeleccionado.nombre}</div>
        </div>
        {proveedorSeleccionado.contacto && (
          <div className="flex flex-col">
            <span className="text-green-600 font-medium">Contacto:</span>
            <div className="text-green-800 break-words"> {proveedorSeleccionado.contacto}</div>
          </div>
        )}
        {proveedorSeleccionado.telefono && (
          <div className="flex flex-col">
            <span className="text-green-600 font-medium">Teléfono:</span>
            <div className="text-green-800 break-words"> {proveedorSeleccionado.telefono}</div>
          </div>
        )}
        {proveedorSeleccionado.email && (
          <div className="flex flex-col">
            <span className="text-green-600 font-medium">Email:</span>
            <div className="text-green-800 break-words"> {proveedorSeleccionado.email}</div>
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-green-600 font-medium">Estado:</span>
          <div className="text-green-800">{proveedorSeleccionado.activo ? ' Activo' : ' Inactivo'}</div>
        </div>
      </div>
    </div>
  ) : null;
})()}
              </>
            )}
          </div>
        )}

           {/* TAB 6: ESTADÍSTICAS */}
           {activeTab === 'estadisticas' && (
             <div className="space-y-6">
               
               {item ? (
                 <div className="space-y-5">
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                     
                     {/* Información de Creación */}
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                       <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                         <span className="mr-2"></span>
                         Información de Registro
                       </h4>
                       <div className="space-y-3 text-sm">
                         <div className="flex justify-between items-center">
                           <span className="text-blue-600">Creado:</span>
                           <span className="font-medium text-gray-900">
                             {item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString('es-VE') : 'No disponible'}
                           </span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-blue-600">Última actualización:</span>
                           <span className="font-medium text-gray-900">
                             {item.ultima_actualizacion ? new Date(item.ultima_actualizacion).toLocaleDateString('es-VE') : 'No disponible'}
                           </span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-blue-600">ID del sistema:</span>
                           <span className="font-mono font-bold text-indigo-700">#{item.id}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-blue-600">Código de barras:</span>
                           <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                             {formData.codigo_barras || 'Sin código'}
                           </span>
                         </div>
                       </div>
                     </div>

                     {/* Estadísticas de Ventas */}
                     <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                       <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                         <span className="mr-2"></span>
                         Estadísticas de Ventas
                       </h4>
                       <div className="space-y-3 text-sm">
                         <div className="flex justify-between items-center">
                           <span className="text-green-600">Ventas totales:</span>
                           <span className="font-bold text-green-900">0 unidades</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-green-600">Ingresos generados:</span>
                           <span className="font-bold text-green-900">$0.00</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-green-600">Última venta:</span>
                           <span className="font-medium text-gray-900">Nunca</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-green-600">Promedio mensual:</span>
                           <span className="font-medium text-gray-900">--</span>
                         </div>
                       </div>
                       <div className="mt-3 text-xs text-green-600 bg-green-100 rounded p-2">
                          Las estadísticas se actualizarán automáticamente con las futuras ventas
                       </div>
                     </div>
                   </div>

                   {/* Análisis de Precios */}
                   <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                     <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                       <span className="mr-2"></span>
                       Análisis de Precios
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-700">
                           ${parseFloat(formData.precio_costo || 0).toFixed(2)}
                         </div>
                         <div className="text-purple-600">Precio de Costo</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-700">
                           {parseFloat(formData.margen_porcentaje || 0).toFixed(1)}%
                         </div>
                         <div className="text-purple-600">Margen</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-700">
                           ${((parseFloat(formData.precio_venta || 0) - parseFloat(formData.precio_costo || 0))).toFixed(2)}
                         </div>
                         <div className="text-purple-600">Ganancia</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-700">
                           ${parseFloat(formData.precio_venta || 0).toFixed(2)}
                         </div>
                         <div className="text-purple-600">Precio de Venta</div>
                       </div>
                     </div>
                   </div>

                   {/* Alertas y Recomendaciones */}
                   <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                     <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                       <span className="mr-2"></span>
                       Recomendaciones
                     </h4>
                     <div className="space-y-2 text-sm text-orange-700">
                       {formData.stock && formData.stock_minimo && parseInt(formData.stock) <= parseInt(formData.stock_minimo) && formData.tipo !== 'servicio' && (
                          <div className="flex items-start space-x-2 p-2 bg-orange-100 rounded">
                            <span></span>
                            <span>Stock bajo: Considere reabastecer pronto</span>
                          </div>
                        )}
                       {!formData.imagen_url && (
                         <div className="flex items-start space-x-2 p-2 bg-orange-100 rounded">
                           <span></span>
                           <span>Agregar imagen mejorará la experiencia de venta</span>
                         </div>
                       )}
                       {parseFloat(formData.margen_porcentaje || 0) < 20 && (
                         <div className="flex items-start space-x-2 p-2 bg-orange-100 rounded">
                           <span></span>
                           <span>Margen bajo: Considere revisar estrategia de precios</span>
                         </div>
                       )}
                       {formData.tipo !== 'servicio' && !formData.proveedor && (
                         <div className="flex items-start space-x-2 p-2 bg-orange-100 rounded">
                           <span></span>
                           <span>Asignar proveedor facilitará el control de inventario</span>
                         </div>
                       )}
                       {!formData.categoria && (
                         <div className="flex items-start space-x-2 p-2 bg-orange-100 rounded">
                           <span></span>
                           <span>Agregar categoría ayudará con la organización</span>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               ) : (
                 // Vista para nuevo item
                 <div className="text-center py-12">
                   <div className="bg-gray-100 rounded-full p-8 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                     <span className="text-3xl"></span>
                   </div>
                   <h3 className="text-xl font-semibold text-gray-600 mb-3">
                     Estadísticas no disponibles
                   </h3>
                   <p className="text-gray-500 mb-4 max-w-md mx-auto">
                     Las estadísticas detalladas se mostrarán una vez que el item sea guardado 
                     y comience a generar historial de ventas en el sistema.
                   </p>
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm mx-auto">
                     <div className="text-sm text-blue-700">
                        <strong>Próximamente verás:</strong>
                       <ul className="text-left mt-2 space-y-1 text-xs">
                         <li>• Historial de ventas</li>
                         <li>• Tendencias de precios</li>
                         <li>• Rotación de inventario</li>
                         <li>• Análisis de rentabilidad</li>
                       </ul>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}

         </form>
       </div>

       {/* Footer con navegación mejorada */}
<div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
  <div className="flex items-center justify-between">
    
    {/* Botón Anterior - Izquierda */}
    <button
      type="button"
      onClick={() => navigateTab('prev')}
      disabled={activeTab === 'basico'}
      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Anterior</span>
    </button>

    {/* Botones centrales */}
    <div className="flex items-center space-x-4">
      {/* Cancelar */}
<button
  type="button"
  onClick={handleClose}
  disabled={saving}
  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50"
>
  <X className="h-4 w-4" />
  <span>Cancelar</span>
</button>

      {/* Guardar */}
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={saving}
        className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm hover:shadow-md"
      >
        {saving ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>{item ? 'Actualizar' : 'Guardar'}</span>
          </>
        )}
      </button>
    </div>

    {/* Botón Siguiente - Derecha */}
    <button
      type="button"
      onClick={() => navigateTab('next')}
      disabled={activeTab === 'estadisticas'}
      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span>Siguiente</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  </div>
</div>
  </div>

   {/* Modal de Confirmación Elegante */}
   {showExitModal && (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]">
       <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
         
         {/* Header */}
         <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 rounded-t-xl">
           <div className="flex items-center space-x-3 text-white">
             <div className="bg-white/20 p-2 rounded-lg">
               <span className="text-xl"></span>
             </div>
             <div>
               <h3 className="text-lg font-bold">Cambios Sin Guardar</h3>
               <p className="text-sm text-orange-100">¿Estás seguro de salir?</p>
             </div>
           </div>
         </div>

         {/* Contenido */}
         <div className="p-6">
           <div className="text-center mb-6">
             <div className="text-gray-700 mb-4">
               Tienes cambios sin guardar que se perderán si sales ahora.
             </div>
           </div>

           {/* Botones */}
           <div className="flex space-x-3">
             <button
               onClick={handleCancelExit}
               className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
             >
               Continuar Editando
             </button>
             <button
               onClick={handleConfirmExit}
               className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
             >
               Salir Sin Guardar
             </button>
           </div>
         </div>
       </div>
     </div>
   )}

   </div>
 );
 
};
export default ItemModal;