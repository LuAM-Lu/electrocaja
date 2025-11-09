// components/inventario/CargaMasivaModal.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { 
  X, Package, Plus, Save, AlertTriangle, CheckCircle,
  Building2, Calendar, FileText, Trash2, Edit3
} from 'lucide-react';
import { useInventarioStore } from '../../store/inventarioStore';
import BarcodeScanner from './BarcodeScanner';
import toast from '../../utils/toast.jsx';
import { api } from '../../config/api';

//  CONSTANTES
// Estado de proveedores cargados desde backend
let PROVEEDORES_CACHE = [];

const CATEGORIAS_DEFAULT = [
  'Smartphones', 'Tablets', 'Accesorios', 'Reparaciones',
  'Electrobar', 'Servicios Técnicos', 'Otros'
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

const CargaMasivaModal = ({ isOpen, onClose, onSuccess }) => {
  const { inventario, agregarItem, actualizarItem } = useInventarioStore();

 //  Estados del Proveedor
const [proveedorData, setProveedorData] = useState({
  proveedor: '',
  telefono: '',
  numeroFactura: '',
  fechaCompra: new Date().toISOString().split('T')[0],
  proveedorFacturaIva: true
});

  //  Estados de Productos
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  //  Estados para selección de duplicados
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState([]);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [selectedDuplicateIndex, setSelectedDuplicateIndex] = useState(0);

  //  Estado para modal de confirmación
  const [showExitModal, setShowExitModal] = useState(false);

  //  Agregar producto vacío
//  Agregar producto vacío con validación
  const agregarProductoVacio = () => {
    // Validar que el último producto esté completo
    if (productos.length > 0) {
      const ultimoProducto = productos[productos.length - 1];
      const camposRequeridos = ['descripcion', 'codigo_barras', 'categoria', 'cantidad', 'precio_costo', 'precio_venta'];
      
      for (const campo of camposRequeridos) {
        if (!ultimoProducto[campo] || ultimoProducto[campo].toString().trim() === '') {
          toast.error(`Producto #${productos.length} incompleto. Falta: ${campo.replace('_', ' ')}`);
          return;
        }
      }
    }

    const nuevoProducto = {
  id: crypto.randomUUID(),
  descripcion: '',
  codigo_barras: '',
  codigo_interno: '',
  tipo: 'producto',
  categoria: '',
  cantidad: '',
  precio_costo: '',
  precio_venta: '',
  margen_porcentaje: '30',
  calculoAutomatico: false,
  existingProduct: null,
  moneda_costo: 'USD', //  NUEVO CAMPO
  moneda_venta: 'USD'   //  NUEVO CAMPO
};
    
    setProductos([...productos, nuevoProducto]);
    
    // Focus a descripción del nuevo producto
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[placeholder="Nombre del producto..."]');
      const ultimoInput = inputs[inputs.length - 1];
      if (ultimoInput) ultimoInput.focus();
    }, 100);
  };

//  Actualizar producto
  const actualizarProducto = (id, campo, valor) => {
    setProductos(productos.map(p => {
      if (p.id === id) {
        const updated = { ...p, [campo]: valor };
        
        //  Calcular precio automático cuando se activa o cuando cambian valores
if (campo === 'calculoAutomatico' && valor === true) {
  // Al activar modo automático, recalcular inmediatamente
  if (updated.precio_costo && updated.margen_porcentaje) {
    const costo = parseFloat(updated.precio_costo) || 0;
    const margen = parseFloat(updated.margen_porcentaje) || 0;
    if (costo > 0 && margen >= 0) {
      //  LÓGICA IVA VENEZOLANA CORRECTA
      let costoBase;
      if (proveedorData.proveedorFacturaIva) {
        // Proveedor CON factura: descontar IVA del costo
        costoBase = costo / 1.16;
      } else {
        // Proveedor SIN factura: el costo ya es base
        costoBase = costo;
      }
      
      // Calcular precio de venta (lo que paga el cliente)
      const precioVenta = costoBase * (1 + margen / 100);
      updated.precio_venta = precioVenta.toFixed(2);
      
      const tipoFactura = proveedorData.proveedorFacturaIva ? 'CON factura' : 'SIN factura';
      toast.success(`Modo automático activado: $${updated.precio_venta} (${tipoFactura})`, { duration: 2000 });
    }
  }
}
        
// Recalcular cuando cambian costo o margen Y está en modo automático
if ((campo === 'precio_costo' || campo === 'margen_porcentaje') && updated.calculoAutomatico) {
  const costo = parseFloat(updated.precio_costo) || 0;
  const margen = parseFloat(updated.margen_porcentaje) || 0;
  
  if (costo > 0 && margen >= 0) {
    //  LÓGICA IVA VENEZOLANA CORRECTA
    let costoBase;
    if (proveedorData.proveedorFacturaIva) {
      // Proveedor CON factura: descontar IVA del costo
      costoBase = costo / 1.16;
    } else {
      // Proveedor SIN factura: el costo ya es base
      costoBase = costo;
    }
    
    // Calcular precio de venta (lo que paga el cliente)
    const precioVenta = costoBase * (1 + margen / 100);
    updated.precio_venta = precioVenta.toFixed(2);
    
    // Mostrar notificación
    if (campo === 'precio_costo' || campo === 'margen_porcentaje') {
      const ganancia = (precioVenta - costoBase).toFixed(2);
      const tipoFactura = proveedorData.proveedorFacturaIva ? 'CON factura' : 'SIN factura';
      
      toast.success(`Auto-calculado: $${updated.precio_venta} (${tipoFactura}) | ${margen}% margen`, { 
        duration: 3000,
      });
    }
  } else if (costo <= 0 && campo === 'precio_costo') {
    toast.error('Ingrese un precio de costo válido para el cálculo automático');
  }
}
        
        return updated;
      }
      return p;
    }));
  };
//  EFECTO PARA RECALCULAR PRECIOS CUANDO CAMBIA IVA
useEffect(() => {
  if (productos.length > 0) {
    setProductos(prevProductos => 
      prevProductos.map(producto => {
        // Solo recalcular si está en modo automático
        if (producto.precio_costo && producto.margen_porcentaje && producto.calculoAutomatico) {
          const costo = parseFloat(producto.precio_costo) || 0;
          const margen = parseFloat(producto.margen_porcentaje) || 30;
          
          if (costo > 0) {
            //  LÓGICA IVA VENEZOLANA CORRECTA
            let costoBase;
            if (proveedorData.proveedorFacturaIva) {
              // Proveedor CON factura: descontar IVA del costo
              costoBase = costo / 1.16;
            } else {
              // Proveedor SIN factura: el costo ya es base
              costoBase = costo;
            }
            
            // Calcular precio de venta (lo que paga el cliente)
            const precioVenta = costoBase * (1 + margen / 100);
            return {
              ...producto,
              precio_venta: precioVenta.toFixed(2)
            };
          }
        }
        return producto;
      })
    );
    
    // Mostrar notificación solo si hay productos en modo automático
    const productosAutomaticos = productos.filter(p => p.calculoAutomatico).length;
    if (productosAutomaticos > 0) {
      toast.success(`${productosAutomaticos} productos recalculados según ${proveedorData.proveedorFacturaIva ? 'CON' : 'SIN'} factura IVA`, {
        duration: 3000,
      });
    }
  }
}, [proveedorData.proveedorFacturaIva]); // Solo cuando cambia el selector IVA

// Cargar proveedores al abrir modal
useEffect(() => {
  if (isOpen) {
    cargarProveedoresDesdeBackend();
  }
}, [isOpen]);

  //  Eliminar producto
  const eliminarProducto = (id) => {
    setProductos(productos.filter(producto => producto.id !== id));
  };

  //  Buscar productos duplicados
  const buscarDuplicados = (codigoBarras) => {
    if (!codigoBarras) return [];
    return inventario.filter(item => 
      item.codigo_barras && item.codigo_barras.toLowerCase() === codigoBarras.toLowerCase()
    );
  };

  //  Manejar escaneo de código de barras
  const handleBarcodeScan = useCallback((productId, codigoBarras) => {
    const duplicados = buscarDuplicados(codigoBarras);
    
    if (duplicados.length > 0) {
      setDuplicateResults(duplicados);
      setCurrentProductId(productId);
      setSelectedDuplicateIndex(0);
      setShowDuplicateModal(true);
    } else {
      actualizarProducto(productId, 'codigo_barras', codigoBarras);
    }
  }, [inventario, productos]);

  //  Seleccionar producto duplicado
//  Seleccionar producto duplicado
  const seleccionarDuplicado = () => {
    const productoSeleccionado = duplicateResults[selectedDuplicateIndex];
    
    // Actualizar el producto actual con los datos del seleccionado
    setProductos(prevProductos => 
      prevProductos.map(p => {
        if (p.id === currentProductId) {
          return {
            ...p,
            descripcion: productoSeleccionado.descripcion || '',
            codigo_barras: productoSeleccionado.codigo_barras || '',
            codigo_interno: productoSeleccionado.codigo_interno || '',
            tipo: productoSeleccionado.tipo || 'producto',
            categoria: productoSeleccionado.categoria || '',
            precio_costo: (productoSeleccionado.precio_costo || 0).toString(),
            precio_venta: (productoSeleccionado.precio_venta || productoSeleccionado.precio || 0).toString(),
            margen_porcentaje: (productoSeleccionado.margen_porcentaje || 30).toString(),
            existingProduct: productoSeleccionado
          };
        }
        return p;
      })
    );
    
    // Cerrar modal
    setShowDuplicateModal(false);
    setDuplicateResults([]);
    setCurrentProductId(null);
    
    toast.success(`Producto "${productoSeleccionado.descripcion}" cargado correctamente`);
  };

  //  Procesar importación
  const procesarImportacion = async () => {
    //  Validar número de factura
    if (!proveedorData.numeroFactura.trim()) {
      toast.error('El número de factura es obligatorio');
      return;
    }

    // Validar que hay productos
    if (productos.length === 0) {
      toast.error('Debe agregar al menos un producto');
      return;
    }

    // Validar productos
for (const producto of productos) {
  if (!producto.descripcion || !producto.codigo_barras || !producto.cantidad || 
      !producto.precio_costo || !producto.precio_venta || !producto.categoria) {
    toast.error(`Producto ${producto.descripcion || 'sin nombre'} tiene campos vacíos`);
    return;
  }
}

    setLoading(true);
    
    try {
      const proveedor = proveedorData.mostrarNuevoProveedor 
        ? proveedorData.nuevoProveedor 
        : proveedorData.proveedor;

      let productosCreados = 0;
      let productosActualizados = 0;

      for (const producto of productos) {
       if (producto.existingProduct) {
            // Actualizar producto existente
            const stockActual = parseInt(producto.existingProduct.stock) || 0;
            const cantidadAgregar = parseInt(producto.cantidad);
            const nuevoStock = stockActual + cantidadAgregar;
            
           await actualizarItem(producto.existingProduct.id, {
            stock: nuevoStock,
            precio_costo: parseFloat(producto.precio_costo),
            precio_venta: parseFloat(producto.precio_venta),
            margen_porcentaje: parseFloat(producto.margen_porcentaje),
            // Preservar solo imagen y ubicación existentes
            imagen_url: producto.existingProduct.imagen_url || producto.existingProduct.imagenUrl || '',
            ubicacion_fisica: producto.existingProduct.ubicacion_fisica || producto.existingProduct.ubicacionFisica || '',
            // Actualizar proveedor (puede cambiar)
            proveedor: proveedor,
            proveedor_factura_iva: proveedorData.proveedorFacturaIva
          });
            
            productosActualizados++;
          } else {
          // Crear nuevo producto
          const newItemData = {
          descripcion: producto.descripcion,
          codigoBarras: producto.codigo_barras,
          codigoInterno: producto.codigo_interno || `INT${Date.now()}-${productos.indexOf(producto)}`,
          tipo: producto.tipo.toUpperCase(),
          categoria: producto.categoria,
          precioCosto: parseFloat(producto.precio_costo),
          precioVenta: parseFloat(producto.precio_venta),
          margenPorcentaje: parseFloat(producto.margen_porcentaje),
          stock: parseInt(producto.cantidad),
          proveedor: proveedor,
          proveedorFacturaIva: proveedorData.proveedorFacturaIva,
          observaciones: `Factura: ${proveedorData.numeroFactura}${
                producto.observacion_personalizada ? `, ${producto.observacion_personalizada}` : ''
                }`,
          stockMinimo: parseInt(producto.stock_minimo) || 1,
          stockMaximo: parseInt(producto.stock_maximo) || 100,
          ubicacionFisica: producto.ubicacion_fisica || '',
          imagenUrl: producto.imagen_url || ''
                  };

          await agregarItem(newItemData);
          productosCreados++;
        }
      }

      toast.success(`Importación completada: ${productosCreados} creados, ${productosActualizados} actualizados`);
      //  FORZAR RECARGA DEL INVENTARIO
      setTimeout(() => {
        useInventarioStore.getState().obtenerInventario();
      }, 500);
      
      if (onSuccess) onSuccess();
      limpiarFormulario();
      onClose();
      
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error('Error al procesar la importación');
    } finally {
      setLoading(false);
    }
  };

  //  Limpiar formulario
const limpiarFormulario = () => {
  setProveedorData({
    proveedor: '',
    telefono: '',
    numeroFactura: '',
    fechaCompra: new Date().toISOString().split('T')[0],
    proveedorFacturaIva: true
  });
  setProductos([]);
};

  //  Manejar cierre con confirmación
  const handleClose = () => {
    if (productos.length > 0 || proveedorData.proveedor || proveedorData.numeroFactura) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  //  Confirmar salida
  const handleConfirmExit = () => {
    limpiarFormulario();
    setShowExitModal(false);
    onClose();
  };

  //  Cancelar salida
  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  // Obtener códigos existentes
  const existingCodes = inventario.map(item => item.codigo_barras).filter(Boolean);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Cargar Items desde Factura</h2>
                  <div className="text-sm text-green-100">
                    Importación masiva de productos
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          
          {/*  DATOS DEL PROVEEDOR - VERSIÓN COMPACTA */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <h3 className="text-base font-semibold text-blue-800 mb-3 flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Datos del Proveedor
                  
                  {/* Info del proveedor seleccionado en línea */}
                  {proveedorData.proveedor && (() => {
                    const proveedorSeleccionado = PROVEEDORES_CACHE.find(p => p.nombre === proveedorData.proveedor);
                    if (!proveedorSeleccionado) return null;
                    
                    const infos = [];
                    if (proveedorSeleccionado.telefono) infos.push(` ${proveedorSeleccionado.telefono}`);
                    if (proveedorSeleccionado.contacto) infos.push(` ${proveedorSeleccionado.contacto}`);
                    if (proveedorSeleccionado.direccion) infos.push(` ${proveedorSeleccionado.direccion}`);
                    
                    return infos.length > 0 ? (
                      <span className="ml-4 text-sm text-blue-600 font-normal">
                        | {infos.join(' | ')}
                      </span>
                    ) : null;
                  })()}
                </h3>
                
                <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
  
                {/* COLUMNA IZQUIERDA */}
                 <div className="space-y-3 max-w-sm">
                  {/* Proveedor */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Proveedor *
                    </label>
                    <select
                      value={proveedorData.proveedor}
                      onChange={(e) => setProveedorData({...proveedorData, proveedor: e.target.value})}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    >
                      <option value="">Seleccionar proveedor...</option>
                      {PROVEEDORES_CACHE.map(proveedor => (
                        <option key={proveedor.id} value={proveedor.nombre}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha de Compra */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fecha de Compra *
                    </label>
                    <input
                      type="date"
                      value={proveedorData.fechaCompra}
                      onChange={(e) => setProveedorData({...proveedorData, fechaCompra: e.target.value})}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>

                {/* COLUMNA DERECHA */}
                 <div className="space-y-3 max-w-sm">
                  {/* Selector IVA */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Factura con IVA *
                    </label>
                    <select
                      value={proveedorData.proveedorFacturaIva}
                      onChange={(e) => setProveedorData({...proveedorData, proveedorFacturaIva: e.target.value === 'true'})}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    >
                      <option value="true"> Con IVA (16%)</option>
                      <option value="false"> Sin IVA</option>
                    </select>
                  </div>

                  {/* Número de Factura */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Número de Factura *
                    </label>
                    <input
                      type="text"
                      value={proveedorData.numeroFactura}
                      onChange={(e) => setProveedorData({...proveedorData, numeroFactura: e.target.value})}
                      placeholder="FAC-001..."
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>

              </div>
              </div>

                        {/*  PRODUCTOS */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              <Package className="h-5 w-5 mr-2" />
                              Productos ({productos.length})
                            </h3>
                            <button
                              onClick={agregarProductoVacio}
                              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Agregar Producto</span>
                            </button>
                          </div>

                          {productos.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p>No hay productos agregados</p>
                              <p className="text-sm">Haz clic en "Agregar Producto" para comenzar</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {productos.map((producto, index) => (
                                <ProductoRow
                                key={producto.id}
                                producto={producto}
                                index={index}
                                onUpdate={actualizarProducto}
                                onDelete={eliminarProducto}
                                onBarcodeScan={handleBarcodeScan}
                                existingCodes={existingCodes}
                                proveedorData={proveedorData}
                              />
                              ))}
                            </div>
                          )}
                        </div>

{/*  RESUMEN - Versión horizontal que se actualiza con selector IVA */}
{productos.length > 0 && (() => {

// Cálculos corregidos - Precio venta YA INCLUYE IVA
const totalUnidades = productos.reduce((sum, p) => sum + (parseInt(p.cantidad) || 0), 0);
const costoTotal = productos.reduce((sum, p) => sum + (parseFloat(p.precio_costo) || 0) * (parseInt(p.cantidad) || 0), 0);
const ventaTotal = productos.reduce((sum, p) => sum + (parseFloat(p.precio_venta) || 0) * (parseInt(p.cantidad) || 0), 0);

//  LÓGICA CORRECTA: ventaTotal ($1.50) YA INCLUYE IVA
const precioFinalTotal = ventaTotal; // $1.50 = Lo que paga el cliente
const baseImponible = ventaTotal / 1.16; // $1.29 = Base sin IVA  
const ivaTotal = ventaTotal - baseImponible; // $0.21 = IVA desglosado
const gananciaBruta = ventaTotal - costoTotal; // Ganancia sobre costos
  return (
    <div key={`resumen-${proveedorData.proveedorFacturaIva}`} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
         Resumen de Importación
        <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          Incluye IVA 16%
        </span>
      </h3>
      
      {/* Grid horizontal con 6 columnas - SOLO cambié el layout */}
      <div className="grid grid-cols-6 gap-4 text-sm items-center">
        
        {/* Productos */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{productos.length}</div>
          <div className="text-green-700 text-xs">Productos</div>
        </div>
        
        {/* Unidades */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalUnidades}</div>
          <div className="text-green-700 text-xs">Unidades</div>
        </div>
        
        {/* Costo Total */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${costoTotal.toFixed(2)}</div>
          <div className="text-green-700 text-xs">Costo Total</div>
        </div>
        
       {/* Base Sin IVA */}
<div className="text-center">
  <div className="text-xl font-bold text-blue-600">${baseImponible.toFixed(2)}</div>
  <div className="text-blue-700 text-xs">Base (Sin IVA)</div>
</div>

{/* IVA 16% */}
<div className="text-center">
  <div className="text-xl font-bold text-orange-600">${ivaTotal.toFixed(2)}</div>
  <div className="text-orange-700 text-xs">IVA (16%)</div>
</div>

{/* Total Final */}
<div className="text-center">
  <div className="text-2xl font-bold text-purple-600">${precioFinalTotal.toFixed(2)}</div>
  <div className="text-purple-700 text-xs">Total Final</div>
</div>
      </div>
      
      {/* Ganancia Bruta - Exactamente como estaba */}
      <div className="mt-4 pt-3 border-t border-green-300">
        <div className="text-center">
          <span className="text-sm text-green-600">Ganancia Bruta: </span>
          <span className="font-bold text-green-800">${gananciaBruta.toFixed(2)}</span>
          <span className="text-xs text-green-600 ml-2">
            ({gananciaBruta > 0 ? ((gananciaBruta / costoTotal) * 100).toFixed(1) : 0}% margen promedio)
          </span>
        </div>
      </div>
    </div>
  );
})()}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                {productos.length} productos • Factura: {proveedorData.numeroFactura || 'No especificada'}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={procesarImportacion}
                disabled={loading || productos.length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Importar Todo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/*  Modal de Selección de Duplicados */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{duplicateResults.length} Productos con este Código</h3>
                    <p className="text-sm text-orange-100">Selecciona cuál usar como base</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDuplicateModal(false)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >
                  
                </button>
              </div>
            </div>

            {/* Lista de Productos Duplicados */}
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {duplicateResults.map((producto, index) => (
                  <label
                    key={producto.id}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDuplicateIndex === index
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="duplicate"
                      checked={selectedDuplicateIndex === index}
                      onChange={() => setSelectedDuplicateIndex(index)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{producto.descripcion}</div>
                      <div className="text-sm text-gray-600">
                        Stock: {producto.stock || 0} • ${producto.precio_venta}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="p-4 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={seleccionarDuplicado}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Usar Este Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  Modal de Confirmación de Salida */}
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
                  <h3 className="text-lg font-bold">¿Cerrar sin guardar?</h3>
                  <p className="text-sm text-orange-100">Se perderán todos los datos</p>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-gray-700 mb-4">
                  Tienes datos sin guardar que se perderán si sales ahora.
                </div>
                <div className="text-sm text-gray-600">
                  • {productos.length} productos agregados
                  {proveedorData.proveedor && (
                    <><br />• Proveedor: {proveedorData.proveedor}</>
                  )}
                  {proveedorData.numeroFactura && (
                    <><br />• Factura: {proveedorData.numeroFactura}</>
                  )}
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

//  COMPONENTE FILA DE PRODUCTO
const ProductoRow = ({ producto, index, onUpdate, onDelete, onBarcodeScan, existingCodes, proveedorData }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">Producto #{index + 1}</span>
       <button
         onClick={() => onDelete(producto.id)}
         className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
       >
         <Trash2 className="h-4 w-4" />
       </button>
     </div>

     {/* Alerta si producto existe */}
     {producto.existingProduct && (
       <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
         <div className="flex items-center space-x-2">
           <AlertTriangle className="h-4 w-4 text-orange-600" />
           <span className="text-sm font-medium text-orange-800">
             Producto encontrado: {producto.existingProduct.descripcion}
           </span>
         </div>
         <div className="text-xs text-orange-700 mt-1">
           Stock actual: {producto.existingProduct.stock || 0} • 
           Se agregará la cantidad especificada
         </div>
       </div>
     )}

     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
       {/* Primera fila */}
       <div className="lg:col-span-2">
         <label className="block text-xs font-medium text-gray-700 mb-1">
           Descripción *
         </label>
        <input
            type="text"
            value={producto.descripcion}
            onChange={(e) => {
              const valor = e.target.value.toUpperCase();
              onUpdate(producto.id, 'descripcion', valor);
            }}
            placeholder="Nombre del producto..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm uppercase"
          />
       </div>

       <div>
         <label className="block text-xs font-medium text-gray-700 mb-1">
           Tipo *
         </label>
         <select
           value={producto.tipo}
           onChange={(e) => onUpdate(producto.id, 'tipo', e.target.value)}
           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
         >
           <option value="producto"> Producto</option>
           <option value="electrobar"> Electrobar</option>
         </select>
       </div>

       {/* Segunda fila */}
       <div className="lg:col-span-2">
         <label className="block text-xs font-medium text-gray-700 mb-1">
           Código de Barras *
         </label>
         <BarcodeScanner
           value={producto.codigo_barras}
           onChange={(value) => onUpdate(producto.id, 'codigo_barras', value)}
           onScan={(code) => onBarcodeScan(producto.id, code)}
           existingCodes={existingCodes}
           className="text-sm"
         />
       </div>

       <div>
         <label className="block text-xs font-medium text-gray-700 mb-1">
           Código Interno
         </label>
         <input
           type="text"
           value={producto.codigo_interno || ''}
           onChange={(e) => onUpdate(producto.id, 'codigo_interno', e.target.value.toUpperCase())}
           placeholder="INT001..."
           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
         />
       </div>

       {/* Tercera fila - Campos horizontales alineados */}
       <div className="lg:col-span-3">
         <div className="grid grid-cols-4 gap-3">
           
           {/* Categoría */}
           <div>
             <label className="block text-xs font-medium text-gray-700 mb-1">
               Categoría *
             </label>
             <select
               value={producto.categoria}
               onChange={(e) => onUpdate(producto.id, 'categoria', e.target.value)}
               className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm h-10"
             >
               <option value="">Seleccionar...</option>
               {CATEGORIAS_DEFAULT.map(categoria => (
                 <option key={categoria} value={categoria}>{categoria}</option>
               ))}
             </select>
           </div>

           {/* Cantidad - Más pequeña */}
           <div className="flex flex-col items-center">
             <label className="block text-xs font-medium text-gray-700 mb-1">
               Cantidad *
             </label>
             <input
               type="number"
               value={producto.cantidad}
               onChange={(e) => onUpdate(producto.id, 'cantidad', e.target.value)}
               placeholder="0"
               min="1"
               className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-center h-10 mx-auto"
             />
           </div>

           {/* Precio Costo */}
           <div>
             <label className="block text-xs font-medium text-gray-700 mb-1">
               Precio Costo *
             </label>
             <div className="flex h-10">
               {/* Input de Precio Costo con prefix clickeable */}
<div className="relative">
  <button
    type="button"
    onClick={() => {
      // Toggle entre USD y Bs
      const nuevaMoneda = producto.moneda_costo === 'USD' ? 'Bs' : 'USD';
      onUpdate(producto.id, 'moneda_costo', nuevaMoneda);
      
      // Si cambia a Bs y hay tasa, convertir automáticamente
      if (nuevaMoneda === 'Bs' && producto.precio_costo) {
        const tasaCambio = 45; // Aquí podrías usar una tasa dinámica
        const precioEnBs = (parseFloat(producto.precio_costo) * tasaCambio).toFixed(2);
        onUpdate(producto.id, 'precio_costo', precioEnBs);
      }
    }}
    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-green-600 font-medium text-sm transition-colors z-10 bg-white px-1 rounded"
    title="Click para cambiar moneda"
  >
    {producto.moneda_costo || 'USD'}
  </button>
  <input
    type="number"
    value={producto.precio_costo}
    onChange={(e) => {
      const valor = e.target.value.replace(/[^0-9.]/g, '');
      onUpdate(producto.id, 'precio_costo', valor);
    }}
  onKeyDown={(e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const costo = parseFloat(e.target.value) || 0;
    const margen = parseFloat(producto.margen_porcentaje) || 30;
    
    if (costo > 0) {
      //  LÓGICA IVA VENEZOLANA CORRECTA
      let costoBase;
      if (proveedorData.proveedorFacturaIva) {
        // Proveedor CON factura: descontar IVA del costo
        costoBase = costo / 1.16;
      } else {
        // Proveedor SIN factura: el costo ya es base
        costoBase = costo;
      }
      
      // Calcular precio de venta (lo que paga el cliente)
      const precioVenta = costoBase * (1 + margen / 100);
      onUpdate(producto.id, 'precio_venta', precioVenta.toFixed(2));
      
      const tipoFactura = proveedorData.proveedorFacturaIva ? 'CON factura' : 'SIN factura';
      toast.success(`Precio calculado: $${precioVenta.toFixed(2)} (${tipoFactura}, ${margen}% margen)`, {
        duration: 2000,
      });
    }
  }
}}
    placeholder="0.00"
    className="w-full pl-12 pr-3 py-2 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
  />
</div>
             </div>
           </div>

           {/* Precio Venta con botón integrado y margen editable */}
           <div>
             <label className="block text-xs font-medium text-gray-700 mb-1">
               Precio Venta *
             </label>
             <div className="flex h-10">
            {/* Input de Precio Venta con prefix clickeable */}
          <div className="relative flex-1">
            <button
    type="button"
    onClick={() => {
      // Toggle entre USD y Bs
      const nuevaMoneda = producto.moneda_venta === 'USD' ? 'Bs' : 'USD';
      onUpdate(producto.id, 'moneda_venta', nuevaMoneda);
      
      // Si cambia a Bs y hay tasa, convertir automáticamente
      if (nuevaMoneda === 'Bs' && producto.precio_venta) {
        const tasaCambio = 45; // Aquí podrías usar una tasa dinámica
        const precioEnBs = (parseFloat(producto.precio_venta) * tasaCambio).toFixed(2);
        onUpdate(producto.id, 'precio_venta', precioEnBs);
      }
    }}
    disabled={producto.calculoAutomatico}
    className={`absolute left-2 top-1/2 transform -translate-y-1/2 font-medium text-sm transition-colors z-10 bg-white px-1 rounded ${
      producto.calculoAutomatico 
        ? 'text-gray-400 cursor-not-allowed' 
        : 'text-gray-600 hover:text-blue-600'
    }`}
    title="Click para cambiar moneda"
  >
    {producto.moneda_venta || 'USD'}
  </button>
  <input
    type="number"
    value={producto.precio_venta}
    onChange={(e) => {
      const valor = e.target.value.replace(/[^0-9.]/g, '');
      onUpdate(producto.id, 'precio_venta', valor);
    }}
 onKeyDown={(e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const venta = parseFloat(e.target.value) || 0;
    const costo = parseFloat(producto.precio_costo) || 0;
    
    if (venta > 0 && costo > 0) {
      //  LÓGICA IVA VENEZOLANA CORRECTA PARA MARGEN
      let costoBase;
      
      if (proveedorData.proveedorFacturaIva) {
        // Proveedor CON factura: descontar IVA del costo
        costoBase = costo / 1.16;
      } else {
        // Proveedor SIN factura: el costo ya es base
        costoBase = costo;
      }
      
      // Calcular margen sobre el costo base real
      const margenCalculado = ((venta - costoBase) / costoBase) * 100;
      onUpdate(producto.id, 'margen_porcentaje', margenCalculado.toFixed(1));
      
      // Cálculo silencioso para no molestar al usuario
    }
  }
}}
    disabled={producto.calculoAutomatico}
    placeholder="0.00"
    className={`w-full pl-12 pr-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm ${
  producto.calculoAutomatico 
    ? 'bg-gray-50 cursor-not-allowed' 
    : ''
}`}
  />
</div>
               {producto.calculoAutomatico ? (
                 <div className="flex items-center border border-l-0 border-gray-300 bg-green-50">
                   <input
                     type="number"
                     value={producto.margen_porcentaje}
                     onChange={(e) => onUpdate(producto.id, 'margen_porcentaje', e.target.value)}
                     placeholder="30"
                     min="0"
                     max="999"
                     className="w-8 px-0 py-2 border-0 text-xs text-center bg-transparent focus:ring-0 focus:outline-none"
                   />
                   <span className="text-xs text-green-700">%</span>
                   <button
                     type="button"
                     onClick={() => onUpdate(producto.id, 'calculoAutomatico', false)}
                     className="px-1 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 transition-colors flex items-center justify-center min-w-[28px]"
                     title="Desactivar cálculo automático"
                   >
                     
                   </button>
                 </div>
               ) : (
                 <button
                   type="button"
                   onClick={() => onUpdate(producto.id, 'calculoAutomatico', true)}
                   className="px-2 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[32px]"
                   title="Activar cálculo automático"
                 >
                   
                 </button>
               )}
             </div>
           </div>

         </div>

         {/* Info adicional del cálculo automático */}
         {producto.calculoAutomatico && (
           <div className="mt-2 text-xs text-green-600 flex items-center space-x-1">
             <span></span>
             <span>Auto-calculado con {producto.margen_porcentaje}% de margen</span>
           </div>
         )}

         {/* Observación personalizada */}
         <div className="mt-3 flex items-center space-x-2">
           <div className="flex-1 text-xs text-gray-600">
              Observación: Importado desde factura • {new Date().toISOString().split('T')[0]}
             {producto.observacion_personalizada && (
               <span className="text-blue-600"> • {producto.observacion_personalizada}</span>
             )}
           </div>
           <button
             type="button"
             onClick={() => {
               const observacion = prompt('Agregar observación personalizada:', producto.observacion_personalizada || '');
               if (observacion !== null) {
                 onUpdate(producto.id, 'observacion_personalizada', observacion.trim());
               }
             }}
             className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors text-xs"
             title="Agregar observación personalizada"
           >
             
           </button>
         </div>
       </div>
      </div>
   </div>
 );
};

export default CargaMasivaModal;