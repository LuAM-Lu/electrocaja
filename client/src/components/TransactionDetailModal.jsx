// components/TransactionDetailModal.jsx - FACTURA DIGITAL COMPLETA Y CORREGIDA
import React, { useState } from 'react';
import { 
  X, Receipt, Hash, Building2, DollarSign, User, Calendar, Clock,
  Smartphone, CreditCard, TrendingUp, TrendingDown, Package, 
  ShoppingCart, FileText, MapPin, Phone, Mail, Star, Tag,
  Loader2, AlertCircle, Printer, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { imprimirFacturaTermica } from '../utils/printUtils';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useCajaStore } from '../store/cajaStore';

// 🔎 Normaliza la tasa histórica desde distintos nombres y formatos
function getTasaHistorica(tx) {
  const candidatos = [
    tx?.tasa_cambio_usada,
    tx?.tasaCambioUsada,
    tx?.tasa_cambio,
    tx?.tasaCambio,
    tx?.tasa
  ];
  for (const v of candidatos) {
    const n = Number(v);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

const TransactionDetailModal = ({ isOpen, onClose, transaccion }) => {
  const [loading, setLoading] = useState(false);
  const { enviarFacturaWhatsApp } = useWhatsApp();
  const { tasaCambio: tasaCambioStore } = useCajaStore();

  if (!isOpen || !transaccion) return null;

  // 🟥 DEBUG - Entrada al modal con la transacción cruda
  console.log("🔴 MODAL TransactionDetail - transaccion:", transaccion);
  console.log("🔴 MODAL TransactionDetail - tasa_cambio_usada:", transaccion?.tasa_cambio_usada, 
              "| tasaCambioUsada:", transaccion?.tasaCambioUsada);

  // 📄 ESTADO DE CARGA
  if (transaccion.loading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3 text-blue-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg font-medium">Cargando detalles...</span>
          </div>
        </div>
      </div>
    );
  }

  // 📅 FORMATEAR FECHA
  function formatearFecha(fechaIso) {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);

    const opcionesFecha = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    const fechaFormateada = fecha.toLocaleDateString('es-VE', opcionesFecha);

    const opcionesHora = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    const horaFormateada = fecha.toLocaleTimeString('es-VE', opcionesHora);

    return `${fechaFormateada} - ${horaFormateada}`;
  }

  // 💰 FORMATEAR MONTOS
  const formatearMonto = (amount) => {
    if (!amount && amount !== 0) return '0,00';
    const number = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return number.toLocaleString('es-VE', { minimumFractionDigits: 2 });
  };

  const formatearBolivares = (amount) => {
    if (!amount && amount !== 0) return '0';
    const number = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return Math.round(number).toLocaleString('es-VE');
  };

  // 🧮 CALCULAR TOTALES CORRECTAMENTE CON TASA HISTÓRICA
  const calcularTotales = () => {
    // ✅ PRIORIZAR TASA HISTÓRICA - NO USAR TASA ACTUAL
    let tasaCambioUsada = getTasaHistorica(transaccion);

    console.log('💱 DEBUG Tasa de cambio (entrada):', {
      transaccion_id: transaccion.id,
      tasa_cambio_usada: transaccion?.tasa_cambio_usada,
      tasaCambioUsada: transaccion?.tasaCambioUsada,
      tasa_normalizada: tasaCambioUsada,
      tasa_actual_store: tasaCambioStore,
      fecha_transaccion: transaccion.fechaHora || transaccion.fecha_hora,
      categoria: transaccion.categoria
    });

    // ⚠️ SOLO HACER FALLBACK SI REALMENTE NO EXISTE
    if (!tasaCambioUsada || isNaN(tasaCambioUsada) || tasaCambioUsada <= 0) {
      const esVenta = transaccion.items && transaccion.items.length > 0;
      const esVuelto = transaccion.categoria?.includes('Vuelto de venta');
      
      if (esVenta) {
        console.error('🚨 ERROR CRÍTICO: Venta sin tasa de cambio histórica!', {
          transaccion_id: transaccion.id,
          fecha: transaccion.fechaHora,
          categoria: transaccion.categoria
        });
      } else if (esVuelto) {
        console.log('ℹ️ Vuelto sin tasa histórica (puede usar tasa de venta original)');
      } else {
        console.log('ℹ️ Transacción administrativa sin tasa histórica (normal)');
      }
      
      // Usar tasa actual como último recurso
      tasaCambioUsada = tasaCambioStore || 37.50;
      console.warn('📊 FALLBACK: Usando tasa actual:', tasaCambioUsada);
    }

    console.log('✅ TASA FINAL SELECCIONADA:', tasaCambioUsada);

    console.log('🔍 DEBUG calcularTotales - Datos originales:', {
      total_bs_original: transaccion.total_bs,
      items: transaccion.items?.length || 0,
      pagos: transaccion.pagos?.length || 0,
      tasaCambioUsada
    });

    // 💡 CALCULAR TOTAL REAL DESDE LOS ITEMS
    let totalRealBs = 0;
    let totalRealUsd = 0;

    if (transaccion.items && transaccion.items.length > 0) {
      // Si hay items, calcular desde los productos
      totalRealUsd = transaccion.items.reduce((total, item) => {
        const cantidad = parseFloat(item.cantidad || 1);
        const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || 0);
        return total + (cantidad * precioUnitario);
      }, 0);
      
      totalRealBs = totalRealUsd * tasaCambioUsada;
    } else {
      // Si no hay items, usar el total de la transacción
      totalRealBs = parseFloat(transaccion.total_bs) || 0;
      totalRealUsd = totalRealBs / tasaCambioUsada;
    }

    // Aplicar descuentos
    const descuento = parseFloat(transaccion.descuentoTotal) || 0;
    const totalConDescuento = totalRealBs - descuento;
    const totalConDescuentoUsd = totalConDescuento / tasaCambioUsada;

    // Total pagado (suma de todos los pagos)
    const totalPagado = transaccion.pagos?.reduce((total, pago) => {
      const monto = parseFloat(pago.monto) || 0;
      // Convertir a Bs si es necesario
      if (pago.moneda === 'usd') {
        return total + (monto * tasaCambioUsada);
      }
      return total + monto;
    }, 0) || 0;

    // Total de vueltos
    const totalVueltos = transaccion.vueltos?.reduce((total, vuelto) => {
      const monto = parseFloat(vuelto.monto) || 0;
      // Convertir a Bs si es necesario
      if (vuelto.moneda === 'usd') {
        return total + (monto * tasaCambioUsada);
      }
      return total + monto;
    }, 0) || 0;

    console.log('📊 DEBUG calcularTotales - OUT:', {
      totalRealBs,
      totalRealUsd,
      totalConDescuento,
      totalPagado,
      totalVueltos,
      descuento,
      tasaCambioUsada_final: tasaCambioUsada
    });

    return {
      totalNeto: totalConDescuento,        // Total final con descuentos aplicados
      totalNetoBruto: totalRealBs,         // Total antes de descuentos
      totalNetoUsd: totalConDescuentoUsd,  // Total en USD
      totalPagado,
      totalVueltos,
      totalEfectivo: totalPagado - totalVueltos,
      tasaCambioUsada,
      descuento
    };
  };

  const totales = calcularTotales();

  // 🖨️ FUNCIÓN DE REIMPRIMIR - CORREGIDA
  const handleReimprimir = async () => {
    if (!transaccion.items || transaccion.items.length === 0) {
      toast.error('No se puede reimprimir: transacción sin productos');
      return;
    }

    try {
      setLoading(true);
      
      // 🔄 NORMALIZAR DATOS PARA COMPATIBILIDAD CON printUtils.js
      console.log('🔍 DEBUG - Transacción original:', transaccion);

      const ventaData = {
        items: transaccion.items?.map(item => ({
          cantidad: parseFloat(item.cantidad || 1),
          descripcion: item.descripcion || item.nombre || 'Sin descripción',
          precio_unitario: parseFloat(item.precioUnitario || item.precio_unitario || 0),
          subtotal: parseFloat(item.subtotal || (item.cantidad * item.precioUnitario) || 0)
        })) || [],
        cliente: transaccion.cliente || null,
        usuario: {
          nombre: transaccion.usuario?.nombre || transaccion.usuario || 'Sistema'
        },
        pagos: transaccion.pagos || [],
        vueltos: transaccion.vueltos || [],
        totalBs: totales.totalNeto, // Usar el total calculado correctamente
        descuentoTotal: parseFloat(transaccion.descuentoTotal || 0),
        motivoDescuento: transaccion.motivoDescuento || ''
      };

      // ✅ USAR TASA HISTÓRICA ORIGINAL (normalizada)
      const tasaCambioHistorica = getTasaHistorica(transaccion);
      console.log('🖨️ DEBUG Reimprimir - tasaCambioHistorica:', tasaCambioHistorica);

      const codigoVenta = `RE-${transaccion.id}`;
      const descuento = parseFloat(transaccion.descuentoTotal) || 0;

      // Validar tasa de cambio y mostrar advertencia si es necesario
      let tasaCambioFinal = tasaCambioHistorica;
      if (!tasaCambioHistorica || tasaCambioHistorica <= 0) {
        const esVenta = transaccion.items && transaccion.items.length > 0;
        
        if (esVenta) {
          const fechaTransaccion = formatearFecha(transaccion.fechaHora || transaccion.fecha_hora);
          toast(`🚨 VENTA #${transaccion.id} sin tasa histórica`, {
            icon: '⚠️',
            duration: 5000,
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #F59E0B'
            }
          });
          console.error('🚨 PROBLEMA EN BD: Venta sin tasa_cambio_usada:', {
            id: transaccion.id,
            fecha: fechaTransaccion,
            total_bs: transaccion.total_bs,
            total_usd: transaccion.total_usd
          });
        }
        
        tasaCambioFinal = tasaCambioStore || 37.50;
        console.log(`📊 FALLBACK: Usando tasa actual (${tasaCambioFinal}) para transacción #${transaccion.id}`);
      }

      console.log('✅ DEBUG - Datos normalizados para printUtils:', {
        totalBs: ventaData.totalBs,
        itemsCount: ventaData.items.length,
        usuario: ventaData.usuario.nombre,
        primeraItem: ventaData.items[0],
        codigoVenta,
        tasaCambioFinal,
        descuento
      });

      await imprimirFacturaTermica(ventaData, codigoVenta, tasaCambioFinal, descuento);
      toast.success('Factura reimprimida correctamente');
      
    } catch (error) {
      console.error('Error al reimprimir:', error);
      toast.error('Error al reimprimir la factura');
    } finally {
      setLoading(false);
    }
  };

  // 📱 FUNCIÓN DE ENVIAR POR WHATSAPP - CORREGIDA
  const handleEnviarWhatsApp = async () => {
    if (!transaccion.items || transaccion.items.length === 0) {
      toast.error('No se puede enviar: transacción sin productos');
      return;
    }

    if (!transaccion.cliente?.telefono) {
      toast.error('El cliente no tiene teléfono registrado');
      return;
    }

    try {
      setLoading(true);
      
      // 🔄 NORMALIZAR DATOS PARA COMPATIBILIDAD CON printUtils.js
      const ventaData = {
        items: transaccion.items?.map(item => ({
          cantidad: parseFloat(item.cantidad || 1),
          descripcion: item.descripcion || item.nombre || 'Sin descripción',
          precio_unitario: parseFloat(item.precioUnitario || item.precio_unitario || 0),
          subtotal: parseFloat(item.subtotal || (item.cantidad * item.precioUnitario) || 0)
        })) || [],
        cliente: transaccion.cliente || null,
        usuario: {
          nombre: transaccion.usuario?.nombre || transaccion.usuario || 'Sistema'
        },
        pagos: transaccion.pagos || [],
        vueltos: transaccion.vueltos || [],
        totalBs: totales.totalNeto, // Usar el total calculado correctamente
        descuentoTotal: parseFloat(transaccion.descuentoTotal || 0),
        motivoDescuento: transaccion.motivoDescuento || ''
      };

      // ✅ USAR TASA HISTÓRICA ORIGINAL (normalizada)
      const tasaCambioHistorica = getTasaHistorica(transaccion);
      console.log('📲 DEBUG WhatsApp - tasaCambioHistorica:', tasaCambioHistorica);

      const codigoVenta = `WA-${transaccion.id}`;
      const descuento = parseFloat(transaccion.descuentoTotal) || 0;

      // Validar tasa de cambio
      let tasaCambioFinal = tasaCambioHistorica;
      if (!tasaCambioHistorica || tasaCambioHistorica <= 0) {
        const esVenta = transaccion.items && transaccion.items.length > 0;
        
        if (esVenta) {
          const fechaTransaccion = formatearFecha(transaccion.fechaHora || transaccion.fecha_hora);
          toast(`🚨 VENTA #${transaccion.id} sin tasa histórica`, {
            icon: '⚠️',
            duration: 5000,
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #F59E0B'
            }
          });
          console.error('🚨 PROBLEMA EN BD: Venta sin tasa_cambio_usada:', {
            id: transaccion.id,
            fecha: fechaTransaccion,
            total_bs: transaccion.total_bs,
            total_usd: transaccion.total_usd
          });
        }
        
        tasaCambioFinal = tasaCambioStore || 37.50;
        console.log(`📊 FALLBACK: Usando tasa actual (${tasaCambioFinal}) para transacción #${transaccion.id}`);
      }

      console.log('📱 DEBUG WhatsApp - Datos normalizados:', {
        totalBs: ventaData.totalBs,
        usuario: ventaData.usuario.nombre,
        codigoVenta,
        tasaCambioFinal,
        descuento,
        telefono: transaccion.cliente.telefono
      });

      await enviarFacturaWhatsApp(
        transaccion.cliente.telefono,
        ventaData,
        codigoVenta,
        tasaCambioFinal,
        descuento
      );
      
      toast.success(`Factura enviada por WhatsApp a ${transaccion.cliente.telefono}`);
      
    } catch (error) {
      console.error('Error al enviar por WhatsApp:', error);
      toast.error('Error al enviar la factura por WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  // 🎨 MÉTODOS DE PAGO
  const getMetodoInfo = (metodo) => {
    const metodos = {
      'efectivo_bs': { 
        label: 'Efectivo Bs', 
        icon: <DollarSign className="h-4 w-4" />,
        color: 'bg-green-100 text-green-700 border-green-300'
      },
      'efectivo_usd': { 
        label: 'Efectivo USD', 
        icon: <DollarSign className="h-4 w-4" />,
        color: 'bg-blue-100 text-blue-700 border-blue-300'
      },
      'pago_movil': { 
        label: 'Pago Móvil', 
        icon: <Smartphone className="h-4 w-4" />,
        color: 'bg-purple-100 text-purple-700 border-purple-300'
      },
      'transferencia': { 
        label: 'Transferencia', 
        icon: <CreditCard className="h-4 w-4" />,
        color: 'bg-orange-100 text-orange-700 border-orange-300'
      },
      'zelle': { 
        label: 'Zelle', 
        icon: <CreditCard className="h-4 w-4" />,
        color: 'bg-indigo-100 text-indigo-700 border-indigo-300'
      },
      'binance': { 
        label: 'Binance', 
        icon: <CreditCard className="h-4 w-4" />,
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
      },
      'tarjeta': { 
        label: 'Tarjeta', 
        icon: <CreditCard className="h-4 w-4" />,
        color: 'bg-gray-100 text-gray-700 border-gray-300'
      }
    };
    return metodos[metodo] || metodos.efectivo_bs;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-modal-backdrop-enter">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col relative z-10 animate-modal-enter">
        
        {/* 🏢 HEADER CON INFO DE TRANSACCIÓN */}
        <div className={`relative px-8 py-4 text-white ${
          transaccion.tipo === 'INGRESO' 
            ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700' 
            : 'bg-gradient-to-br from-red-500 via-red-600 to-rose-700'
        }`}>
    
          {/* Efectos de fondo */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Detalle de Transacción</h1>
                <p className="text-sm opacity-90">Información completa de la operación</p>
              </div>
                
              <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 mb-3">
                <p className="text-base font-bold">
                  <span className="text-sm font-medium opacity-90 mr-2">Transacción</span>
                  #{transaccion.id}
                </p>
              </div>
            </div>

            {/* 📊 INFO PRINCIPAL EN EL HEADER */}
            <div className="grid grid-cols-3 gap-3">
              {/* Tarjeta 1 */}
              <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs font-medium opacity-90">Fecha y Hora</span>
                </div>
                <p className="font-bold text-base">{formatearFecha(transaccion.fechaHora || transaccion.fecha_hora)}</p>
              </div>
              
              {/* Tarjeta 2 */}
              <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-5 w-5" />
                  <span className="text-xs font-medium opacity-90">Atendido por</span>
                </div>
                <p className="font-bold text-base">{transaccion.usuario?.nombre || transaccion.usuario || 'N/A'}</p>
              </div>

              {/* Tarjeta 3 */}
              <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="flex items-center space-x-2 mb-2">
                  {transaccion.tipo === 'INGRESO' ? 
                    <TrendingUp className="h-5 w-5" /> : 
                    <TrendingDown className="h-5 w-5" />
                  }
                  <span className="text-xs font-medium opacity-90">Tipo de Operación</span>
                </div>
                <p className="font-bold text-base">{transaccion.tipo?.toUpperCase()}</p>
              </div>
            </div>

            {/* 🔧 DEBUG: Tasa usada por el modal */}
            <div className="mt-3 flex items-center justify-end">
              {(() => {
                const tHist = getTasaHistorica(transaccion);
                const isFallback = !(tHist && tHist > 0);
                const valor = isFallback ? (tasaCambioStore || 0) : tHist;

                return (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
                      ${isFallback 
                        ? 'bg-amber-100/90 text-amber-800 border-amber-300' 
                        : 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                      }`}
                    title={isFallback ? 'Usando tasa actual (fallback)' : 'Usando tasa histórica de la transacción'}
                  >
                    {isFallback ? 'Fallback' : 'Histórica'} • {valor ? `${valor.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs/$` : 'N/D'}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 📋 CONTENIDO DE LA FACTURA */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1">
          
          {/* 👤 INFORMACIÓN DEL CLIENTE */}
          {transaccion.cliente && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Información del Cliente
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium uppercase">Nombre</p>
                  <p className="font-semibold text-gray-900 mt-1">{transaccion.cliente.nombre}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium uppercase">Cédula/RIF</p>
                  <p className="font-semibold text-gray-900 mt-1">{transaccion.cliente.cedula_rif}</p>
                </div>
                {transaccion.cliente.telefono ? (
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600 font-medium uppercase">Teléfono</p>
                    <p className="font-semibold text-gray-900 mt-1">{transaccion.cliente.telefono}</p>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-3 text-center opacity-50">
                    <p className="text-xs text-gray-500 font-medium uppercase">Teléfono</p>
                    <p className="text-gray-500 mt-1">No registrado</p>
                  </div>
                )}
                {transaccion.cliente.email ? (
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600 font-medium uppercase">Email</p>
                    <p className="font-semibold text-gray-900 mt-1">{transaccion.cliente.email}</p>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-3 text-center opacity-50">
                    <p className="text-xs text-gray-500 font-medium uppercase">Email</p>
                    <p className="text-gray-500 mt-1">No registrado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 📦 PRODUCTOS / DETALLES */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 text-white">
              <h3 className="font-semibold flex items-center">
                <Package className="h-5 w-5 mr-2" />
                {transaccion.items && transaccion.items.length > 0 ? 
                  'Productos y Servicios' : 
                  'Descripción de la Transacción'
                }
              </h3>
            </div>
            
            <div className="p-4">
              {transaccion.items && transaccion.items.length > 0 ? (
                <div className="space-y-3">
                  {transaccion.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{item.descripcion}</p>
                          <p className="text-sm text-gray-500">
                            Código: {item.codigoBarras} | 
                            Tipo: {item.producto?.tipo || 'Producto'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {item.cantidad} × ${formatearMonto(item.precioUnitario)}
                        </p>
                        <p className="text-lg font-bold text-emerald-600">
                          ${formatearMonto(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingDown className="h-12 w-12 text-red-500 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Detalle Transacción</p>
                  <p className="font-medium text-3xl">{transaccion.categoria}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Esta transacción no tiene detalles de productos individuales
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 💰 RESUMEN FINANCIERO MEJORADO */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-4 text-white">
              <h3 className="font-semibold flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Resumen Financiero
              </h3>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Totales Calculados Correctamente */}
                <div className="space-y-3">
                  {/* Mostrar subtotal antes de descuentos */}
                  {totales.descuento > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatearBolivares(totales.totalNetoBruto)} Bs</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de la Transacción:</span>
                    <span className="font-medium">{formatearBolivares(totales.totalNeto)} Bs</span>
                  </div>
                  
                  {totales.totalPagado > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Total Pagado:</span>
                      <span className="font-medium">{formatearBolivares(totales.totalPagado)} Bs</span>
                    </div>
                  )}

                  {totales.totalVueltos > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Total Vueltos:</span>
                      <span className="font-medium">-{formatearBolivares(totales.totalVueltos)} Bs</span>
                    </div>
                  )}

                  {totales.descuento > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento:</span>
                      <span className="font-medium">-{formatearBolivares(totales.descuento)} Bs</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total USD:</span>
                      <span className="text-green-600">${formatearMonto(totales.totalNetoUsd)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Bs:</span>
                      <span className="text-blue-600">{formatearBolivares(totales.totalNeto)} Bs</span>
                    </div>
                  </div>
                  
                  {totales.tasaCambioUsada && (
                    <div className="text-sm text-gray-500">
                      <div className="flex justify-between items-center">
                        <span>Tasa de cambio histórica:</span>
                        <span className="font-medium">{formatearMonto(totales.tasaCambioUsada)} Bs/$</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        ℹ️ Tasa usada al momento de la transacción ({formatearFecha(transaccion.fechaHora || transaccion.fecha_hora)})
                      </div>
                      {tasaCambioStore && Math.abs(totales.tasaCambioUsada - tasaCambioStore) > 1 && (
                        <div className="text-xs text-amber-600 mt-1">
                          💡 Tasa actual: {formatearMonto(tasaCambioStore)} Bs/$ (diferencia: {formatearMonto(Math.abs(totales.tasaCambioUsada - tasaCambioStore))} Bs/$)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Métodos de pago */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    {transaccion.categoria?.includes('Vuelto de venta') ?
                      'Método de Entrega del Vuelto' : 'Métodos de Pago'}
                 </h4>
                 <div className="space-y-2">
                   {(() => {
                     // Para vueltos, mostrar método principal
                     if (transaccion.categoria?.includes('Vuelto de venta') && transaccion.metodoPagoPrincipal) {
                       const metodoInfo = getMetodoInfo(transaccion.metodoPagoPrincipal);
                       return (
                         <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                           <div className="flex items-center space-x-2">
                             <div className={`p-2 rounded ${metodoInfo.color}`}>
                               {metodoInfo.icon}
                             </div>
                             <div>
                               <span className="text-sm font-medium">{metodoInfo.label}</span>
                               <p className="text-xs text-gray-500">Vuelto entregado</p>
                             </div>
                           </div>
                           <span className="font-bold text-red-600">
                             -{formatearBolivares(transaccion.totalBs)} Bs
                           </span>
                         </div>
                       );
                     }
                     
                     // Para transacciones normales, mostrar pagos
                     return transaccion.pagos?.map((pago, index) => {
                       const metodoInfo = getMetodoInfo(pago.metodo);
                       return (
                         <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                           <div className="flex items-center space-x-2">
                             <div className={`p-1 rounded ${metodoInfo.color}`}>
                               {metodoInfo.icon}
                             </div>
                             <span className="text-sm font-medium">{metodoInfo.label}</span>
                           </div>
                           <span className="font-medium">
                             {pago.moneda === 'usd' ? '$' : 'Bs'}{formatearMonto(pago.monto)}
                           </span>
                         </div>
                       );
                     });
                   })()}
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>

       {/* 🔻 FOOTER MEJORADO CON BOTONES DE ACCIÓN */}
       <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-8 py-6 border-t-2 border-gray-200 mt-auto">
         <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
           <div className="flex items-center space-x-3 text-sm text-gray-600">
             <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
             <span className="font-medium">
               Documento generado el {new Date().toLocaleDateString('es-VE', {
                 day: '2-digit',
                 month: 'long',
                 year: 'numeric'
               })}
             </span>
           </div>
           
           {/* Botones de acción */}
           <div className="flex items-center space-x-3">
             {/* Solo mostrar botones si hay productos */}
             {transaccion.items && transaccion.items.length > 0 && (
               <>
                 {/* Botón Reimprimir */}
                 <button
                   onClick={handleReimprimir}
                   disabled={loading}
                   className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {loading ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <Printer className="h-4 w-4" />
                   )}
                   <span>Reimprimir</span>
                 </button>

                 {/* Botón WhatsApp */}
                 {transaccion.cliente?.telefono && (
                   <button
                     onClick={handleEnviarWhatsApp}
                     disabled={loading}
                     className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {loading ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       <Send className="h-4 w-4" />
                     )}
                     <span>WhatsApp</span>
                   </button>
                 )}
               </>
             )}

             {/* Botón Cerrar */}
             <button
               onClick={onClose}
               className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
             >
               <X className="h-4 w-4" />
               <span>Cerrar Detalle</span>
             </button>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
};

export default TransactionDetailModal;
