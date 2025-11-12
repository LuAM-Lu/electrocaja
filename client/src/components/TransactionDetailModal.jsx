// components/TransactionDetailModal.jsx - FACTURA DIGITAL COMPLETA Y CORREGIDA
import React, { useState } from 'react';
import { 
  X, Receipt, Hash, Building2, DollarSign, User, Calendar, Clock,
  Smartphone, CreditCard, TrendingUp, TrendingDown, Package, 
  ShoppingCart, FileText, MapPin, Phone, Mail, Star, Tag,
  Loader2, AlertCircle, Printer, Send, ChevronDown, ChevronUp, Wrench
} from 'lucide-react';
import toast from '../utils/toast.jsx';
import { imprimirFacturaTermica } from '../utils/printUtils';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useCajaStore } from '../store/cajaStore';

//  Normaliza la tasa histórica desde distintos nombres y formatos
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
  const [clienteExpandido, setClienteExpandido] = useState(false);
  const { enviarFacturaWhatsApp } = useWhatsApp();
  const { tasaCambio: tasaCambioStore } = useCajaStore();

  if (!isOpen || !transaccion) return null;

  // Detectar si es transacción de servicio técnico
  const esServicioTecnico = transaccion.servicioTecnicoId || 
                             transaccion.servicioTecnico ||
                             transaccion.categoria?.includes('Servicio Técnico');

  // Normalizar tipo de transacción para el header
  const tipoTransaccion = (transaccion.tipo || '').toUpperCase();
  const esIngreso = tipoTransaccion === 'INGRESO' || tipoTransaccion === 'INGRESOS';
  const esEgreso = tipoTransaccion === 'EGRESO' || tipoTransaccion === 'EGRESOS';

  //  DEBUG - Entrada al modal con la transacción cruda
  console.log(" MODAL TransactionDetail - transaccion:", transaccion);
  console.log(" MODAL TransactionDetail - esServicioTecnico:", esServicioTecnico);
  console.log(" MODAL TransactionDetail - servicioTecnico:", transaccion.servicioTecnico);
  console.log(" MODAL TransactionDetail - tasa_cambio_usada:", transaccion?.tasa_cambio_usada, 
              "| tasaCambioUsada:", transaccion?.tasaCambioUsada);

  //  ESTADO DE CARGA
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

  //  FORMATEAR FECHA
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

  //  FORMATEAR MONTOS
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

  //  CALCULAR TOTALES CORRECTAMENTE CON TASA HISTÓRICA
  const calcularTotales = () => {
    //  PRIORIZAR TASA HISTÓRICA - NO USAR TASA ACTUAL
    let tasaCambioUsada = getTasaHistorica(transaccion);

    console.log(' DEBUG Tasa de cambio (entrada):', {
      transaccion_id: transaccion.id,
      tasa_cambio_usada: transaccion?.tasa_cambio_usada,
      tasaCambioUsada: transaccion?.tasaCambioUsada,
      tasa_normalizada: tasaCambioUsada,
      tasa_actual_store: tasaCambioStore,
      fecha_transaccion: transaccion.fechaHora || transaccion.fecha_hora,
      categoria: transaccion.categoria,
      esServicioTecnico: esServicioTecnico
    });

    //  SOLO HACER FALLBACK SI REALMENTE NO EXISTE
    if (!tasaCambioUsada || isNaN(tasaCambioUsada) || tasaCambioUsada <= 0) {
      const esVenta = transaccion.items && transaccion.items.length > 0;
      const esVuelto = transaccion.categoria?.includes('Vuelto de venta');
      
      if (esVenta) {
        console.error(' ERROR CRÍTICO: Venta sin tasa de cambio histórica!', {
          transaccion_id: transaccion.id,
          fecha: transaccion.fechaHora,
          categoria: transaccion.categoria
        });
      } else if (esVuelto) {
        console.log('ℹ Vuelto sin tasa histórica (puede usar tasa de venta original)');
      } else {
        console.log('ℹ Transacción administrativa sin tasa histórica (normal)');
      }
      
      // Usar tasa actual como último recurso
      tasaCambioUsada = tasaCambioStore || 37.50;
      console.warn(' FALLBACK: Usando tasa actual:', tasaCambioUsada);
    }

    console.log(' TASA FINAL SELECCIONADA:', tasaCambioUsada);

    console.log(' DEBUG calcularTotales - Datos originales:', {
      total_bs_original: transaccion.total_bs,
      total_usd_original: transaccion.total_usd,
      items: transaccion.items?.length || 0,
      items_servicio: transaccion.servicioTecnico?.items?.length || 0,
      pagos: transaccion.pagos?.length || 0,
      tasaCambioUsada,
      esServicioTecnico
    });

    //  CALCULAR TOTAL REAL
    let totalRealBs = 0;
    let totalRealUsd = 0;

    if (esServicioTecnico) {
      // Para servicios técnicos, calcular desde los pagos directamente
      // porque los pagos pueden estar en diferentes monedas
      let montoTransaccionUsd = 0;
      let montoTransaccionBs = 0;
      
      if (transaccion.pagos && transaccion.pagos.length > 0) {
        transaccion.pagos.forEach(pago => {
          const monto = parseFloat(pago.monto) || 0;
          if (pago.moneda === 'usd') {
            montoTransaccionUsd += monto;
            montoTransaccionBs += monto * tasaCambioUsada;
          } else {
            montoTransaccionBs += monto;
            montoTransaccionUsd += monto / tasaCambioUsada;
          }
        });
      } else {
        // Fallback: usar totales de la transacción si no hay pagos
        totalRealBs = parseFloat(transaccion.totalBs || transaccion.total_bs || 0);
        totalRealUsd = parseFloat(transaccion.totalUsd || transaccion.total_usd || 0);
        
        if (totalRealUsd === 0 && totalRealBs > 0 && tasaCambioUsada > 0) {
          totalRealUsd = totalRealBs / tasaCambioUsada;
        }
        montoTransaccionUsd = totalRealUsd;
        montoTransaccionBs = totalRealBs;
      }
      
      totalRealUsd = montoTransaccionUsd;
      totalRealBs = montoTransaccionBs;
      
      console.log('💰 Servicio técnico - calculado desde pagos:', {
        montoTransaccionUsd,
        montoTransaccionBs,
        totalRealUsd,
        totalRealBs,
        pagos: transaccion.pagos,
        categoria: transaccion.categoria
      });
    } else if (transaccion.items && transaccion.items.length > 0) {
      // Si hay items, calcular desde los productos (ventas normales)
      totalRealUsd = transaccion.items.reduce((total, item) => {
        const cantidad = parseFloat(item.cantidad || 1);
        const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || 0);
        return total + (cantidad * precioUnitario);
      }, 0);
      
      totalRealBs = totalRealUsd * tasaCambioUsada;
    } else {
      // Si no hay items, usar el total de la transacción
      totalRealBs = parseFloat(transaccion.totalBs || transaccion.total_bs || 0);
      totalRealUsd = parseFloat(transaccion.totalUsd || transaccion.total_usd || 0);
      
      // Si no hay totalUsd pero hay totalBs y tasa, calcularlo
      if (totalRealUsd === 0 && totalRealBs > 0 && tasaCambioUsada > 0) {
        totalRealUsd = totalRealBs / tasaCambioUsada;
      }
    }

    // Aplicar descuentos
    const descuento = parseFloat(transaccion.descuentoTotal || 0);
    const totalConDescuento = totalRealBs - descuento;
    const totalConDescuentoUsd = totalRealUsd - (descuento / tasaCambioUsada);

    // Total pagado (suma de todos los pagos) - respetar moneda original
    const totalPagado = transaccion.pagos?.reduce((total, pago) => {
      const monto = parseFloat(pago.monto) || 0;
      // Convertir a Bs si es necesario para el cálculo
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

    console.log(' DEBUG calcularTotales - OUT:', {
      totalRealBs,
      totalRealUsd,
      totalConDescuento,
      totalConDescuentoUsd,
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

  // Calcular montos específicos para servicios técnicos desde pagos
  const calcularMontosServicio = () => {
    if (!esServicioTecnico || !transaccion.pagos || transaccion.pagos.length === 0) {
      return {
        montoUsd: totales.totalNetoUsd,
        montoBs: totales.totalNeto,
        monedaPrincipal: 'usd'
      };
    }

    let montoUsd = 0;
    let montoBs = 0;
    
    transaccion.pagos.forEach(pago => {
      const monto = parseFloat(pago.monto) || 0;
      if (pago.moneda === 'usd') {
        montoUsd += monto;
        montoBs += monto * totales.tasaCambioUsada;
      } else {
        montoBs += monto;
        montoUsd += monto / totales.tasaCambioUsada;
      }
    });

    // Determinar moneda principal
    const tienePagosUsd = transaccion.pagos.some(p => p.moneda === 'usd');
    const tienePagosBs = transaccion.pagos.some(p => p.moneda === 'bs');
    
    let monedaPrincipal = 'bs';
    if (tienePagosUsd && !tienePagosBs) {
      monedaPrincipal = 'usd';
    } else if (tienePagosUsd && tienePagosBs) {
      // Si hay ambas, usar la que tenga mayor monto
      const totalUsdEnBs = montoUsd * totales.tasaCambioUsada;
      monedaPrincipal = totalUsdEnBs > montoBs ? 'usd' : 'bs';
    }

    return {
      montoUsd,
      montoBs,
      monedaPrincipal
    };
  };

  const montosServicio = calcularMontosServicio();

  //  FUNCIÓN DE REIMPRIMIR - CORREGIDA
  const handleReimprimir = async () => {
    if (!transaccion.items || transaccion.items.length === 0) {
      toast.error('No se puede reimprimir: transacción sin productos');
      return;
    }

    try {
      setLoading(true);
      
      //  NORMALIZAR DATOS PARA COMPATIBILIDAD CON printUtils.js
      console.log(' DEBUG - Transacción original:', transaccion);

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

      //  USAR TASA HISTÓRICA ORIGINAL (normalizada)
      const tasaCambioHistorica = getTasaHistorica(transaccion);
      console.log(' DEBUG Reimprimir - tasaCambioHistorica:', tasaCambioHistorica);

      const codigoVenta = `RE-${transaccion.id}`;
      const descuento = parseFloat(transaccion.descuentoTotal) || 0;

      // Validar tasa de cambio y mostrar advertencia si es necesario
      let tasaCambioFinal = tasaCambioHistorica;
      if (!tasaCambioHistorica || tasaCambioHistorica <= 0) {
        const esVenta = transaccion.items && transaccion.items.length > 0;
        
        if (esVenta) {
          const fechaTransaccion = formatearFecha(transaccion.fechaHora || transaccion.fecha_hora);
          toast(`VENTA #${transaccion.id} sin tasa histórica`, {
            duration: 5000,
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #F59E0B'
            }
          });
          console.error(' PROBLEMA EN BD: Venta sin tasa_cambio_usada:', {
            id: transaccion.id,
            fecha: fechaTransaccion,
            total_bs: transaccion.total_bs,
            total_usd: transaccion.total_usd
          });
        }
        
        tasaCambioFinal = tasaCambioStore || 37.50;
        console.log(` FALLBACK: Usando tasa actual (${tasaCambioFinal}) para transacción #${transaccion.id}`);
      }

      console.log(' DEBUG - Datos normalizados para printUtils:', {
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

  //  FUNCIÓN DE ENVIAR POR WHATSAPP - CORREGIDA
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
      
      //  NORMALIZAR DATOS PARA COMPATIBILIDAD CON printUtils.js
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

      //  USAR TASA HISTÓRICA ORIGINAL (normalizada)
      const tasaCambioHistorica = getTasaHistorica(transaccion);
      console.log(' DEBUG WhatsApp - tasaCambioHistorica:', tasaCambioHistorica);

      const codigoVenta = `WA-${transaccion.id}`;
      const descuento = parseFloat(transaccion.descuentoTotal) || 0;

      // Validar tasa de cambio
      let tasaCambioFinal = tasaCambioHistorica;
      if (!tasaCambioHistorica || tasaCambioHistorica <= 0) {
        const esVenta = transaccion.items && transaccion.items.length > 0;
        
        if (esVenta) {
          const fechaTransaccion = formatearFecha(transaccion.fechaHora || transaccion.fecha_hora);
          toast(`VENTA #${transaccion.id} sin tasa histórica`, {
            duration: 5000,
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #F59E0B'
            }
          });
          console.error(' PROBLEMA EN BD: Venta sin tasa_cambio_usada:', {
            id: transaccion.id,
            fecha: fechaTransaccion,
            total_bs: transaccion.total_bs,
            total_usd: transaccion.total_usd
          });
        }
        
        tasaCambioFinal = tasaCambioStore || 37.50;
        console.log(` FALLBACK: Usando tasa actual (${tasaCambioFinal}) para transacción #${transaccion.id}`);
      }

      console.log(' DEBUG WhatsApp - Datos normalizados:', {
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

  //  MÉTODOS DE PAGO
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
        
        {/*  HEADER CON INFO DE TRANSACCIÓN - COMPACTO */}
        <div className={`relative px-6 py-3 text-white ${
          esIngreso
            ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700' 
            : esEgreso
            ? 'bg-gradient-to-br from-red-500 via-red-600 to-rose-700'
            : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700'
        }`}>
    
          {/* Efectos de fondo */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h1 className="text-xl font-bold">Detalle de Transacción</h1>
              </div>
                
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30">
                <p className="text-sm font-bold">
                  <span className="text-xs font-medium opacity-90 mr-1">#</span>
                  {transaccion.id}
                </p>
              </div>
            </div>

            {/*  INFO PRINCIPAL EN EL HEADER - COMPACTA */}
            <div className="grid grid-cols-3 gap-2">
              {/* Tarjeta 1 */}
              <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                <div className="flex items-center space-x-1 mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium opacity-90">Fecha y Hora</span>
                </div>
                <p className="font-bold text-sm leading-tight">{formatearFecha(transaccion.fechaHora || transaccion.fecha_hora)}</p>
              </div>
              
              {/* Tarjeta 2 */}
              <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                <div className="flex items-center space-x-1 mb-1">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium opacity-90">Atendido por</span>
                </div>
                <p className="font-bold text-sm leading-tight">{transaccion.usuario?.nombre || transaccion.usuario || 'N/A'}</p>
              </div>

              {/* Tarjeta 3 */}
              <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                <div className="flex items-center space-x-1 mb-1">
                  {esIngreso ? 
                    <TrendingUp className="h-3.5 w-3.5" /> : 
                    <TrendingDown className="h-3.5 w-3.5" />
                  }
                  <span className="text-xs font-medium opacity-90">Tipo</span>
                </div>
                <p className="font-bold text-sm leading-tight">{tipoTransaccion || 'N/A'}</p>
              </div>
            </div>

            {/*  DEBUG: Tasa usada por el modal - COMPACTA */}
            <div className="mt-2 flex items-center justify-end">
              {(() => {
                const tHist = getTasaHistorica(transaccion);
                const isFallback = !(tHist && tHist > 0);
                const valor = isFallback ? (tasaCambioStore || 0) : tHist;

                return (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
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

        {/*  CONTENIDO DE LA FACTURA */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/*  INFORMACIÓN DEL CLIENTE - DESPLEGABLE Y COMPACTA */}
          {transaccion.cliente && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
              <button
                onClick={() => setClienteExpandido(!clienteExpandido)}
                className="w-full px-4 py-2 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
              >
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <User className="h-4 w-4 mr-2 text-blue-600" />
                  Información del Cliente
                </h3>
                {clienteExpandido ? (
                  <ChevronUp className="h-4 w-4 text-blue-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                )}
              </button>
              
              {clienteExpandido && (
                <div className="px-4 pb-3 pt-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600 font-medium uppercase">Nombre</p>
                      <p className="font-semibold text-gray-900 mt-0.5 text-sm">{transaccion.cliente.nombre}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600 font-medium uppercase">Cédula/RIF</p>
                      <p className="font-semibold text-gray-900 mt-0.5 text-sm">{transaccion.cliente.cedula_rif}</p>
                    </div>
                    {transaccion.cliente.telefono ? (
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-blue-600 font-medium uppercase">Teléfono</p>
                        <p className="font-semibold text-gray-900 mt-0.5 text-sm">{transaccion.cliente.telefono}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-2 text-center opacity-50">
                        <p className="text-xs text-gray-500 font-medium uppercase">Teléfono</p>
                        <p className="text-gray-500 mt-0.5 text-xs">No registrado</p>
                      </div>
                    )}
                    {transaccion.cliente.email ? (
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-blue-600 font-medium uppercase">Email</p>
                        <p className="font-semibold text-gray-900 mt-0.5 text-sm break-all">{transaccion.cliente.email}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-2 text-center opacity-50">
                        <p className="text-xs text-gray-500 font-medium uppercase">Email</p>
                        <p className="text-gray-500 mt-0.5 text-xs">No registrado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/*  PRODUCTOS / DETALLES / SERVICIO TÉCNICO */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200/50 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2.5 text-white">
              <h3 className="font-semibold flex items-center text-sm">
                {esServicioTecnico ? (
                  <Wrench className="h-4 w-4 mr-2" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                {esServicioTecnico 
                  ? 'Información del Servicio Técnico'
                  : transaccion.items && transaccion.items.length > 0 
                    ? 'Productos y Servicios' 
                    : 'Descripción de la Transacción'
                }
              </h3>
            </div>
            
            <div className="p-3">
              {esServicioTecnico && transaccion.servicioTecnico ? (
                <div className="space-y-3">
                  {/* Información del servicio técnico */}
                  <div className="bg-white border rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Número de Servicio</p>
                        <p className="font-bold text-lg text-blue-600">
                          {transaccion.servicioTecnico.numeroServicio || transaccion.codigoVenta}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Tipo de Pago</p>
                        <p className="font-semibold">
                          {transaccion.categoria?.includes('Abono') ? 'Abono' : 
                           transaccion.categoria?.includes('Pago Final') ? 'Pago Final' :
                           transaccion.categoria?.includes('Pago Total') ? 'Pago Total' :
                           transaccion.categoria || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Dispositivo</p>
                        <p className="font-medium">
                          {transaccion.servicioTecnico.dispositivoMarca} {transaccion.servicioTecnico.dispositivoModelo}
                        </p>
                        {transaccion.servicioTecnico.dispositivoImei && (
                          <p className="text-xs text-gray-500 mt-1">
                            IMEI: {transaccion.servicioTecnico.dispositivoImei}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Cliente</p>
                        <p className="font-medium">{transaccion.servicioTecnico.clienteNombre || transaccion.clienteNombre}</p>
                        {transaccion.servicioTecnico.clienteTelefono && (
                          <p className="text-xs text-gray-500 mt-1">
                            Tel: {transaccion.servicioTecnico.clienteTelefono}
                          </p>
                        )}
                      </div>
                    </div>
                    {transaccion.servicioTecnico.problemas && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500 uppercase mb-1">Problemas Reportados</p>
                        <div className="text-sm">
                          {Array.isArray(transaccion.servicioTecnico.problemas) ? (
                            <ul className="list-disc list-inside space-y-1">
                              {transaccion.servicioTecnico.problemas.map((problema, idx) => (
                                <li key={idx}>{problema}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>{typeof transaccion.servicioTecnico.problemas === 'string' 
                              ? transaccion.servicioTecnico.problemas 
                              : JSON.stringify(transaccion.servicioTecnico.problemas)}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Items del servicio técnico si existen */}
                  {transaccion.servicioTecnico.items && transaccion.servicioTecnico.items.length > 0 && (
                    <div className="bg-gray-50 border rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase mb-2 font-medium">Items del Servicio</p>
                      <div className="space-y-2">
                        {transaccion.servicioTecnico.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                            <div className="flex-1">
                              <p className="font-medium">{item.descripcion}</p>
                              {item.producto?.codigoBarras && (
                                <p className="text-xs text-gray-500">
                                  Código: {item.producto.codigoBarras}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-medium">
                                {item.cantidad} × ${formatearMonto(item.precioUnitario)}
                              </p>
                              <p className="font-bold text-emerald-600">
                                ${formatearMonto(item.subtotal)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Observaciones de la transacción */}
                  {transaccion.observaciones && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-600 uppercase mb-1 font-medium">Observaciones</p>
                      <p className="text-sm text-gray-700">{transaccion.observaciones}</p>
                    </div>
                  )}
                </div>
              ) : transaccion.items && transaccion.items.length > 0 ? (
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
                  <p className="font-medium text-lg">{transaccion.categoria}</p>
                  {transaccion.observaciones && (
                    <p className="text-sm text-gray-500 mt-2">
                      {transaccion.observaciones}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/*  RESUMEN FINANCIERO MEJORADO - COMPACTO CON INFO DE SERVICIO */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200/50 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2.5 text-white">
              <h3 className="font-semibold flex items-center text-sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Resumen Financiero
              </h3>
            </div>
            
            <div className="p-3">
              {esServicioTecnico && transaccion.servicioTecnico ? (
                // Resumen financiero específico para servicios técnicos
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Columna 1: Totales del servicio */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Estimado del Servicio:</span>
                      <span className="font-medium">${formatearMonto(transaccion.servicioTecnico.totalEstimado || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Pagado del Servicio:</span>
                      <span className="font-medium text-green-600">${formatearMonto(transaccion.servicioTecnico.totalPagado || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Saldo Pendiente del Servicio:</span>
                      <span className="font-medium text-red-600">${formatearMonto(transaccion.servicioTecnico.saldoPendiente || 0)}</span>
                    </div>
                    <div className="border-t pt-1.5 mt-1.5">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Tipo de Pago:</span>
                        <span className="font-medium text-gray-700">
                          {transaccion.categoria?.includes('Abono') ? 'Abono' : 
                           transaccion.categoria?.includes('Pago Final') ? 'Pago Final' :
                           transaccion.categoria?.includes('Pago Total') ? 'Pago Total' :
                           transaccion.categoria || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Monto de esta Transacción:</span>
                        <span className="text-emerald-600">
                          {montosServicio.monedaPrincipal === 'usd' 
                            ? `$${formatearMonto(montosServicio.montoUsd)} USD`
                            : `${formatearBolivares(montosServicio.montoBs)} Bs`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                        <span>Equivalente:</span>
                        <span>
                          {montosServicio.monedaPrincipal === 'usd'
                            ? `${formatearBolivares(montosServicio.montoBs)} Bs`
                            : `$${formatearMonto(montosServicio.montoUsd)} USD`
                          }
                        </span>
                      </div>
                    </div>
                    {totales.tasaCambioUsada && (
                      <div className="text-xs text-gray-500 mt-1.5 pt-1.5 border-t">
                        <div className="flex justify-between items-center">
                          <span>Tasa de cambio:</span>
                          <span className="font-medium">{formatearMonto(totales.tasaCambioUsada)} Bs/$</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Columna 2: Métodos de pago */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">
                      Métodos de Pago de esta Transacción
                    </h4>
                    <div className="space-y-1.5">
                      {transaccion.pagos?.map((pago, index) => {
                        const metodoInfo = getMetodoInfo(pago.metodo);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <div className={`p-1 rounded ${metodoInfo.color}`}>
                                {metodoInfo.icon}
                              </div>
                              <span className="text-xs font-medium">{metodoInfo.label}</span>
                            </div>
                            <span className="font-medium text-sm">
                              {pago.moneda === 'usd' ? '$' : 'Bs'}{formatearMonto(pago.monto)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {totales.totalVueltos > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between text-xs text-red-600">
                          <span>Vueltos:</span>
                          <span className="font-medium">-{formatearBolivares(totales.totalVueltos)} Bs</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Resumen financiero normal para ventas
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Totales Calculados Correctamente - COMPACTO */}
                  <div className="space-y-1.5">
                    {/* Mostrar subtotal antes de descuentos */}
                    {totales.descuento > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatearBolivares(totales.totalNetoBruto)} Bs</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total de la Transacción:</span>
                      <span className="font-medium">{formatearBolivares(totales.totalNeto)} Bs</span>
                    </div>
                    
                    {totales.totalPagado > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Total Pagado:</span>
                        <span className="font-medium">{formatearBolivares(totales.totalPagado)} Bs</span>
                      </div>
                    )}

                    {totales.totalVueltos > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Total Vueltos:</span>
                        <span className="font-medium">-{formatearBolivares(totales.totalVueltos)} Bs</span>
                      </div>
                    )}

                    {totales.descuento > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento:</span>
                        <span className="font-medium">-{formatearBolivares(totales.descuento)} Bs</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-1.5 mt-1.5">
                      <div className="flex justify-between text-base font-bold">
                        <span>Total USD:</span>
                        <span className="text-green-600">${formatearMonto(totales.totalNetoUsd)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold">
                        <span>Total Bs:</span>
                        <span className="text-blue-600">{formatearBolivares(totales.totalNeto)} Bs</span>
                      </div>
                    </div>
                    
                    {totales.tasaCambioUsada && (
                      <div className="text-xs text-gray-500 mt-1.5 pt-1.5 border-t">
                        <div className="flex justify-between items-center">
                          <span>Tasa de cambio histórica:</span>
                          <span className="font-medium">{formatearMonto(totales.tasaCambioUsada)} Bs/$</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          ℹ Tasa usada al momento de la transacción ({formatearFecha(transaccion.fechaHora || transaccion.fecha_hora)})
                        </div>
                        {tasaCambioStore && Math.abs(totales.tasaCambioUsada - tasaCambioStore) > 1 && (
                          <div className="text-xs text-amber-600 mt-0.5">
                             Tasa actual: {formatearMonto(tasaCambioStore)} Bs/$ (diferencia: {formatearMonto(Math.abs(totales.tasaCambioUsada - tasaCambioStore))} Bs/$)
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Métodos de pago - COMPACTO */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">
                      {transaccion.categoria?.includes('Vuelto de venta') ?
                        'Método de Entrega del Vuelto' : 'Métodos de Pago'}
                 </h4>
                 <div className="space-y-1.5">
                   {(() => {
                     // Para vueltos, mostrar método principal
                     if (transaccion.categoria?.includes('Vuelto de venta') && transaccion.metodoPagoPrincipal) {
                       const metodoInfo = getMetodoInfo(transaccion.metodoPagoPrincipal);
                       return (
                         <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                           <div className="flex items-center space-x-2">
                             <div className={`p-1.5 rounded ${metodoInfo.color}`}>
                               {metodoInfo.icon}
                             </div>
                             <div>
                               <span className="text-xs font-medium">{metodoInfo.label}</span>
                               <p className="text-xs text-gray-500">Vuelto entregado</p>
                             </div>
                           </div>
                           <span className="font-bold text-red-600 text-sm">
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
                             <span className="text-xs font-medium">{metodoInfo.label}</span>
                           </div>
                           <span className="font-medium text-sm">
                             {pago.moneda === 'usd' ? '$' : 'Bs'}{formatearMonto(pago.monto)}
                           </span>
                         </div>
                       );
                     });
                   })()}
                 </div>
               </div>
             </div>
              )}
           </div>
         </div>
       </div>

       {/*  FOOTER MEJORADO CON BOTONES DE ACCIÓN - COMPACTO */}
       <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 border-t-2 border-gray-200 mt-auto">
         <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
           <div className="flex items-center space-x-2 text-xs text-gray-600">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
             <span className="font-medium">
               Generado el {new Date().toLocaleDateString('es-VE', {
                 day: '2-digit',
                 month: 'short',
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
                   className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {loading ? (
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   ) : (
                     <Printer className="h-3.5 w-3.5" />
                   )}
                   <span>Reimprimir</span>
                 </button>

                 {/* Botón WhatsApp */}
                 {transaccion.cliente?.telefono && (
                   <button
                     onClick={handleEnviarWhatsApp}
                     disabled={loading}
                     className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {loading ? (
                       <Loader2 className="h-3.5 w-3.5 animate-spin" />
                     ) : (
                       <Send className="h-3.5 w-3.5" />
                     )}
                     <span>WhatsApp</span>
                   </button>
                 )}
               </>
             )}

             {/* Botón Cerrar */}
             <button
               onClick={onClose}
               className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 flex items-center space-x-1.5"
             >
               <X className="h-3.5 w-3.5" />
               <span>Cerrar</span>
             </button>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
};

export default TransactionDetailModal;
