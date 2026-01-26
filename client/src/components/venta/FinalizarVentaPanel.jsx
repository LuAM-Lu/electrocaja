// components/venta/FinalizarVentaPanel.jsx - PANEL FINAL DE VENTA (DISEÑO PREMIUM)
import React, { useState } from 'react';
import {
  CheckCircle, Receipt, Send, FileText, Printer,
  Mail, MessageCircle, AlertTriangle, Info,
  User, Package, DollarSign, Clock, ShoppingCart, FileDown,
  Store, MapPin, ChevronDown, ChevronUp, Check, Smartphone, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

//  FUNCIONES HELPER
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '0,00';
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
    return parseFloat(entero + '.' + decimal);
  } else if (valorLimpio.includes('.')) {
    return parseFloat(valorLimpio);
  }
  return parseFloat(valorLimpio) || 0;
};

const calcularMontoPagado = (pagos, tasaCambio) => {
  return pagos.reduce((total, pago) => {
    const monto = limpiarNumero(pago.monto);
    // Asumimos que si el método incluye 'usd', 'zelle' o 'binance' es en dólares
    const esDolares = pago.metodo.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance';

    // Convertir todo a Bs para el total
    if (esDolares) {
      return total + (monto * tasaCambio);
    } else {
      return total + monto;
    }
  }, 0);
};

const FinalizarVentaPanel = ({
  ventaData,
  opcionesProcesamiento,
  onOpcionesChange,
  loading = false,
  codigoVenta = null,
  descuento = 0,
  tasaCambio = 1
}) => {

  const { usuario } = useAuthStore();
  const [mostrarDetalles, setMostrarDetalles] = useState(true);
  const alMenosUnaOpcion = Object.values(opcionesProcesamiento).some(Boolean);
  const clienteTieneWhatsApp = ventaData.cliente?.telefono;
  const clienteTieneEmail = ventaData.cliente?.email;

  const handleToggleOpcion = (opcion, valor) => {
    onOpcionesChange({ [opcion]: valor });
  };

  // Receipt Preview Data Calculation
  const fechaActual = new Date().toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).replace(/\./g, '').toUpperCase();

  const itemsRecibo = ventaData.items || [];

  // Total logic
  const totalPagar = ventaData.totalBs;

  // Calcular total pagado REAL sumando los pagos
  const totalPagadoBs = calcularMontoPagado(ventaData.pagos || [], tasaCambio);
  const totalPagadoUsd = totalPagadoBs / tasaCambio;

  return (
    <main className="flex-grow w-full h-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full p-1 overflow-y-auto">

        {/* LEFT COLUMN: RECEIPT PREVIEW (Compact Design) */}
        <div className="lg:col-span-3 xl:col-span-3 flex justify-center lg:justify-start">
          <div
            className="bg-white text-black p-2 font-mono text-[10px] leading-tight relative border border-slate-200"
            style={{
              width: '310px',
              minHeight: '380px',
              fontFamily: "'Courier New', Courier, monospace"
            }}
          >
            {/* Header Recibo */}
            <div className="text-center mb-2">
              <div className="flex justify-center mb-2">
                <img src="/termico.png" alt="Logo" className="w-16 h-12 object-contain" />
              </div>
              <h3 className="font-bold text-xs uppercase tracking-wide mb-0.5">ELECTRO SHOP MORANDIN C.A.</h3>
              <p className="font-bold">RIF: J-405903333</p>
              <p>Carrera 5ta, frente a la plaza Miranda</p>
              <p>Instagram: @electroshopgre- WA +582572511282</p>
            </div>

            <div className="border-b-2 border-black my-1.5"></div>

            {/* Info Block */}
            <div className="space-y-0.5 font-bold">
              <p className="text-xs">Nro Recibo: #{codigoVenta}</p>
              <p>Fecha: {fechaActual}</p>
              <p>Cliente: {ventaData.cliente?.nombre || 'General'}</p>
              <p>CI/RIF: {ventaData.cliente?.cedula_rif || 'V00000000'}</p>
              <p>Vendedor: {usuario?.nombre || 'Admin'}</p>
              <p>Tasa: {formatearVenezolano(tasaCambio)} Bs/$ - BCV</p>
            </div>

            <div className="border-b border-dashed border-black my-1.5"></div>

            {/* Items Table Header */}
            <div className="flex font-bold mb-1 justify-between w-full">
              <div className="w-5 text-center text-[9px]">Cnt</div>
              <div className="flex-1 px-1 text-left min-w-0 text-[9px]">Descripción</div>
              <div className="w-[50px] text-right text-[9px]">Total</div>
            </div>

            <div className="border-b border-dashed border-black mb-1.5"></div>

            {/* Items List */}
            <div className="space-y-2 mb-1.5">
              {itemsRecibo.map((item, idx) => (
                <div key={idx} className="flex flex-col border-b border-dashed border-slate-300 pb-1 mb-1 last:border-0">
                  <div className="flex items-start justify-between w-full">
                    <div className="w-5 font-bold text-center text-[9px] pt-0.5">{item.cantidad}</div>
                    <div className="flex-1 px-1 min-w-0">
                      <p className="font-bold uppercase leading-tight text-[9px] break-words line-clamp-2">{item.descripcion}</p>
                      <p className="text-[8px] text-slate-500">{formatearVenezolano(item.precio_unitario * tasaCambio)} Bs c/u</p>
                    </div>
                    <div className="w-[50px] text-right font-bold text-[9px] whitespace-nowrap pt-0.5">
                      {formatearVenezolano((item.cantidad * item.precio_unitario) * tasaCambio)} Bs
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b-2 border-black my-2"></div>

            {/* Totals Section */}
            <div className="bg-slate-50/50 p-1.5 text-center mb-1.5">
              {/* Mostrar SIEMPRE el TOTAL DE VENTA */}
              <p className="font-extrabold text-base">TOTAL: {formatearVenezolano(totalPagar)} Bs</p>
              <p className="text-[10px] font-bold text-slate-600">En USD: ${(totalPagar / tasaCambio).toFixed(2)}</p>
              {descuento > 0 && (
                <p className="text-[9px] mt-0.5">Descuento aplicado: -{formatearVenezolano(descuento)} Bs</p>
              )}
            </div>

            <div className="border-b border-dashed border-black my-1.5"></div>

            {/* Payments Section - Compacto */}
            <div className="mb-1.5">
              <p className="font-bold pt-0.5 uppercase mb-0.5">MÉTODOS DE PAGO:</p>
              <div className="grid grid-cols-1 gap-0.5 ml-1">
                {ventaData.pagos?.map((pago, i) => (
                  pago.monto && (
                    <div key={i} className="flex justify-between uppercase text-[9px] font-medium">
                      <span>{pago.metodo.replace('_', ' ')}</span>
                      <span>{pago.metodo.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance'
                        ? parseFloat(pago.monto).toFixed(2) + ' $'
                        : formatearVenezolano(pago.monto) + ' Bs'}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {ventaData.vueltos && ventaData.vueltos.length > 0 && (
              <>
                <div className="border-b border-dashed border-black my-1.5"></div>
                <div className="mb-1.5">
                  <p className="font-bold pt-0.5 uppercase mb-0.5 text-purple-700">VUELTOS:</p>
                  <div className="grid grid-cols-1 gap-0.5 ml-1">
                    {ventaData.vueltos.map((vuelto, i) => (
                      vuelto.monto && (
                        <div key={i} className="flex justify-between uppercase text-[9px] font-bold text-purple-600">
                          <span>- {vuelto.metodo.replace('_', ' ')}</span>
                          <span>{vuelto.metodo.includes('usd') || vuelto.metodo === 'zelle' || vuelto.metodo === 'binance'
                            ? parseFloat(vuelto.monto).toFixed(2) + ' $'
                            : formatearVenezolano(vuelto.monto) + ' Bs'}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="border-b border-dashed border-black my-1.5"></div>

            {/* Footer */}
            <div className="text-center font-bold space-y-0.5 mt-3">
              <p>Gracias por su compra</p>
              <p>ElectroCaja v1.0</p>
              <p className="italic font-normal mt-1.5 text-[8px]">NO REPRESENTA UN DOCUMENTO FISCAL</p>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY AND OPTIONS */}
        <div className="lg:col-span-9 xl:col-span-9 flex flex-col gap-6">

          {/* RESUMEN FINAL SECTION */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">
                <FileText className="h-5 w-5" />
              </span>
              <h2 className="font-bold text-lg text-slate-700">Resumen Final</h2>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${ventaData.vueltos && ventaData.vueltos.length > 0 ? '5' : '4'} gap-4`}>
              {/* CLIENTE CARD */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
                <div className="relative z-10 w-full">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center justify-center gap-1">
                    <User className="h-3 w-3" /> Cliente
                  </p>
                  <h3 className="font-bold text-base text-slate-800 truncate w-full">{ventaData.cliente?.nombre || 'Sin Cliente'}</h3>
                  <p className="text-xs text-slate-500 truncate w-full">{ventaData.cliente?.cedula_rif || 'V00000000'}</p>
                </div>
              </div>

              {/* PRODUCTOS CARD */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
                <div className="relative z-10 w-full">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center justify-center gap-1">
                    <Package className="h-3 w-3" /> Productos
                  </p>
                  <h3 className="font-bold text-base text-slate-800">{itemsRecibo.length} Items</h3>
                  <button
                    onClick={() => setMostrarDetalles(!mostrarDetalles)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1 mt-1 mx-auto"
                  >
                    Detalles {mostrarDetalles ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* TOTAL VENTA CARD (NEW) */}
              <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
                <div className="relative z-10 w-full">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center justify-center gap-1">
                    <DollarSign className="h-3 w-3" /> Total Venta
                  </p>
                  <p className="text-2xl font-black text-blue-700 tracking-tight">{formatearVenezolano(totalPagar)} Bs</p>
                  <p className="text-xs font-bold text-blue-500/80">${(totalPagar / tasaCambio).toFixed(2)} USD</p>
                </div>
              </div>

              {/* TOTALS CARD (PAGADO) */}
              <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
                <div className="relative z-10 w-full">
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center justify-center gap-1">
                    <DollarSign className="h-3 w-3" /> Monto Pagado
                  </p>
                  {/* Mostrar TOTAL PAGADO REAL */}
                  <p className="text-2xl font-black text-emerald-700 tracking-tight">{formatearVenezolano(totalPagadoBs)} Bs</p>
                  <p className="text-xs font-bold text-emerald-500/80">${totalPagadoUsd.toFixed(2)} USD</p>
                </div>
              </div>

              {/* VUELTO CARD - ACTUALIZADO CON DATA REAL DE VUELTOS */}
              {ventaData.vueltos && ventaData.vueltos.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
                  <div className="relative z-10 w-full">
                    <p className="text-xs font-bold text-purple-600 uppercase mb-2 flex items-center justify-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Vuelto
                    </p>
                    <div className="flex flex-col gap-1 items-center">
                      {/* Mostrar totales de vueltos sumados */}
                      {(() => {
                        const totalVueltoBs = ventaData.vueltos.reduce((total, v) => {
                          const monto = limpiarNumero(v.monto);
                          const esDolares = v.metodo.includes('usd') || v.metodo === 'zelle' || v.metodo === 'binance';
                          return total + (esDolares ? monto * tasaCambio : monto);
                        }, 0);
                        const totalVueltoUsd = totalVueltoBs / tasaCambio;

                        return (
                          <>
                            <p className="text-xl font-black text-purple-700 tracking-tight">{formatearVenezolano(totalVueltoBs)} Bs</p>
                            <p className="text-xs font-bold text-purple-500/80">${totalVueltoUsd.toFixed(2)} USD</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Details - PREMIUM */}
            {mostrarDetalles && (
              <div className="mt-4 bg-white rounded-xl p-6 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Detalle del pedido</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {itemsRecibo.map((item, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs flex flex-col gap-1 hover:bg-slate-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-700 line-clamp-2">{item.descripcion}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded text-[10px] border border-slate-200 font-mono">x{item.cantidad}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-slate-400">{formatearVenezolano(item.precio_unitario * tasaCambio)} c/u</span>
                        <span className="font-bold text-emerald-600">{formatearVenezolano((item.cantidad * item.precio_unitario) * tasaCambio)} Bs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* OPCIONES SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/10 text-blue-600 p-1.5 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-lg text-slate-700">Opciones de Procesamiento</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              {/* OPTION 1: PDF */}
              <button
                onClick={() => handleToggleOpcion('imprimirRecibo', !opcionesProcesamiento.imprimirRecibo)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 relative ${opcionesProcesamiento.imprimirRecibo
                  ? 'bg-blue-50 border-blue-500 shadow-md transform scale-[1.02]'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
              >
                {opcionesProcesamiento.imprimirRecibo && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className={`p-2 rounded-lg mb-2 ${opcionesProcesamiento.imprimirRecibo ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <FileDown className="h-5 w-5" />
                </div>
                <span className={`font-bold text-xs ${opcionesProcesamiento.imprimirRecibo ? 'text-blue-700' : 'text-slate-700'}`}>PDF</span>
                {opcionesProcesamiento.imprimirRecibo && <span className="text-[10px] text-blue-600/70 font-medium -mt-0.5">Generar</span>}
              </button>

              {/* OPTION 2: IMPRIMIR */}
              <button
                onClick={() => handleToggleOpcion('generarFactura', !opcionesProcesamiento.generarFactura)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 relative ${opcionesProcesamiento.generarFactura
                  ? 'bg-blue-50 border-blue-600 shadow-md transform scale-[1.02]'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
              >
                {opcionesProcesamiento.generarFactura && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className={`p-2 rounded-lg mb-2 ${opcionesProcesamiento.generarFactura ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Printer className="h-5 w-5" />
                </div>
                <span className={`font-bold text-xs ${opcionesProcesamiento.generarFactura ? 'text-blue-700' : 'text-slate-700'}`}>IMPRIMIR</span>
                {opcionesProcesamiento.generarFactura && <span className="text-[10px] text-blue-600/70 font-medium -mt-0.5">Ticket</span>}
              </button>

              {/* OPTION 3: WHATSAPP */}
              <button
                onClick={() => clienteTieneWhatsApp && handleToggleOpcion('enviarWhatsApp', !opcionesProcesamiento.enviarWhatsApp)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 relative ${!clienteTieneWhatsApp ? 'opacity-50 cursor-not-allowed bg-slate-50' :
                  opcionesProcesamiento.enviarWhatsApp
                    ? 'bg-emerald-50 border-emerald-500 shadow-md transform scale-[1.02]'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
              >
                {opcionesProcesamiento.enviarWhatsApp && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className={`p-2 rounded-lg mb-2 ${opcionesProcesamiento.enviarWhatsApp ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className={`font-bold text-xs ${opcionesProcesamiento.enviarWhatsApp ? 'text-emerald-700' : 'text-slate-700'}`}>WHATSAPP</span>
                {opcionesProcesamiento.enviarWhatsApp && <span className="text-[10px] text-emerald-600/70 font-medium -mt-0.5">Enviar</span>}
              </button>

              {/* OPTION 4: EMAIL */}
              <button
                onClick={() => clienteTieneEmail && handleToggleOpcion('enviarEmail', !opcionesProcesamiento.enviarEmail)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 relative ${!clienteTieneEmail ? 'opacity-50 cursor-not-allowed bg-slate-50' :
                  opcionesProcesamiento.enviarEmail
                    ? 'bg-purple-50 border-purple-500 shadow-md transform scale-[1.02]'
                    : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
                  }`}
              >
                {opcionesProcesamiento.enviarEmail && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-0.5 shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className={`p-2 rounded-lg mb-2 ${opcionesProcesamiento.enviarEmail ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Mail className="h-5 w-5" />
                </div>
                <span className={`font-bold text-xs ${opcionesProcesamiento.enviarEmail ? 'text-purple-700' : 'text-slate-700'}`}>EMAIL</span>
                {opcionesProcesamiento.enviarEmail && <span className="text-[10px] text-purple-600/70 font-medium -mt-0.5">Enviar</span>}
              </button>

            </div>
          </section>

        </div>
      </div>
    </main>
  );
};

export default FinalizarVentaPanel;