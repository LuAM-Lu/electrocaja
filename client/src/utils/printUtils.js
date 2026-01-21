import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas'; //  Para generar imágenes
import toast from './toast.jsx';

//  FUNCIÓN PARA FORMATEAR NÚMEROS VENEZOLANOS
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

//  FUNCIÓN PARA CARGAR LOGO
const cargarLogo = () => {
  return new Promise((resolve) => {
    console.log(' Cargando logo desde /termico.png...');

    const img = new Image();

    img.onload = function () {
      console.log(' Logo cargado exitosamente');
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        const dataUrl = canvas.toDataURL('image/png');
        console.log(' Logo convertido a base64, longitud:', dataUrl.length);
        resolve(dataUrl);
      } catch (error) {
        console.error(' Error procesando logo:', error);
        resolve(null);
      }
    };

    img.onerror = (error) => {
      console.error(' Error cargando logo:', error);
      resolve(null);
    };

    img.src = '/termico.png';
  });
};

//  FUNCIÓN PARA GENERAR HTML UNIFICADO (BASE PARA TODAS LAS OPCIONES)
const generarHTMLBase = (ventaData, codigoVenta, tasaCambio, descuento = 0, formato = 'termica') => {
  //  DEBUG: Verificar usuario recibido
  console.log(' generarHTMLBase - Usuario recibido:', ventaData.usuario?.nombre || 'No definido');

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  //  ESTILOS SEGÚN EL FORMATO
  const estilos = {
    termica: {
      width: '302px',        //  80mm = ~302px a 96 DPI
      fontSize: '11px',      //  Optimizado para 300 DPI
      padding: '8px',        //  Márgenes mínimos para 80mm
      logoSize: '80px',      //  Logo más compacto
      lineHeight: '1.2'      //  Espaciado optimizado
    },
    whatsapp: {
      width: '350px',
      fontSize: '14px',
      padding: '20px',
      logoSize: '100px'
    },
    pdf: {
      width: '600px',
      fontSize: '14px',
      padding: '30px',
      logoSize: '120px'
    }
  };

  const estilo = estilos[formato];

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Factura #${codigoVenta}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap');
            
            @media print {
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                body {
                    width: 80mm !important;
                    margin: 0 !important;
                    padding: 2mm !important;
                }
            }
            
            body {
                font-family: ${formato === 'termica' ? "'Roboto Mono', 'Courier New', monospace" : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"};
                font-size: ${estilo.fontSize};
                line-height: ${formato === 'termica' ? (estilo.lineHeight || '1.2') : '1.4'};
                margin: 0;
                padding: ${estilo.padding};
                width: ${estilo.width};
                max-width: ${formato === 'termica' ? '80mm' : 'none'};
                background: white;
                color: #000;
                position: relative;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .header-logo {
                text-align: center;
                margin-bottom: ${formato === 'termica' ? '8px' : '15px'};
            }
            
            .header-logo img {
                width: ${estilo.logoSize};
                height: ${estilo.logoSize};
                border-radius: ${formato === 'termica' ? '4px' : '8px'};
                margin-bottom: ${formato === 'termica' ? '4px' : '10px'};
                ${formato === 'termica' ? 'image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;' : ''}
            }
            
            .center { text-align: center; }
            .left { text-align: left; }
            .right { text-align: right; }
            .bold { font-weight: 600; }
            .semi-bold { font-weight: 500; }
            
            .title { 
                font-size: ${formato === 'whatsapp' ? '16px' : formato === 'termica' ? '13px' : '14px'}; 
                font-weight: 700;
                margin: ${formato === 'termica' ? '4px 0' : '8px 0'};
                letter-spacing: ${formato === 'termica' ? '-0.5px' : '0'};
            }
            
            .subtitle { 
                font-size: ${formato === 'whatsapp' ? '14px' : formato === 'termica' ? '10px' : '12px'}; 
                font-weight: 500;
                color: #000;
                margin: ${formato === 'termica' ? '2px 0' : '0'};
            }
            
            .normal { 
                font-size: ${formato === 'whatsapp' ? '14px' : formato === 'termica' ? '9px' : '12px'}; 
                font-weight: 400;
                margin: ${formato === 'termica' ? '1px 0' : '0'};
            }
            
            .separator { 
                border-top: 1px dashed #000000ff; 
                margin: ${formato === 'termica' ? '4px 0' : '8px 0'}; 
                width: 100%;
            }
            
            .thick-separator { 
                border-top: 2px solid #000; 
                margin: ${formato === 'termica' ? '6px 0' : '10px 0'}; 
                width: 100%;
            }
            
            .item-row { 
                display: flex; 
                justify-content: space-between;
                margin: ${formato === 'termica' ? '2px 0' : '3px 0'};
                align-items: flex-start;
                font-size: ${formato === 'termica' ? '9px' : formato === 'whatsapp' ? '14px' : '12px'};
            }
            
            .item-desc {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: ${formato === 'whatsapp' ? '220px' : formato === 'termica' ? '180px' : '180px'};
                font-size: ${formato === 'whatsapp' ? '14px' : formato === 'termica' ? '10px' : '12px'};
                padding-right: ${formato === 'termica' ? '4px' : '0'};
            }
            
            .item-total {
                text-align: right;
                min-width: ${formato === 'termica' ? '60px' : '80px'};
                font-weight: 500;
                font-size: ${formato === 'whatsapp' ? '14px' : formato === 'termica' ? '10px' : '12px'};
                font-family: ${formato === 'termica' ? "'Roboto Mono', monospace" : 'inherit'};
            }
            
            .total-section {
                background: #ffffffff;
                padding: ${formato === 'whatsapp' ? '15px' : formato === 'termica' ? '6px' : '10px'};
                border-radius: ${formato === 'termica' ? '2px' : '4px'};
                margin: ${formato === 'termica' ? '6px 0' : '10px 0'};
                ${formato === 'termica' ? 'border: 1px solid #fffdfdff;' : ''}
            }
            
            .total-amount {
                font-size: ${formato === 'whatsapp' ? '16px' : formato === 'termica' ? '12px' : '14px'};
                font-weight: 700;
                font-family: ${formato === 'termica' ? "'Roboto Mono', monospace" : 'inherit'};
            }
            
            .payment-method {
                font-size: ${formato === 'whatsapp' ? '14px' : formato === 'termica' ? '10px' : '13px'};
                margin: ${formato === 'termica' ? '1px 0' : '2px 0'};
                font-family: ${formato === 'termica' ? "'Roboto Mono', monospace" : 'inherit'};
            }
            
            .footer-disclaimer {
                text-align: center;
                font-style: italic;
                font-weight: 400;
                font-size: ${formato === 'whatsapp' ? '12px' : formato === 'termica' ? '10px' : '12px'};
                color: #000000ff;
                margin-top: ${formato === 'termica' ? '8px' : '15px'};
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            ${formato === 'termica' ? `
            .contact-vertical {
                position: absolute;
                right: 4px;
                top: 20px;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                font-size: 12px;
                color: #000;
                line-height: 1.0;
                letter-spacing: 0.3px;
                opacity: 0.8;
                font-weight: bold;
            }
            
            .thermal-optimized {
                width: 302px !important;
                max-width: 80mm !important;
                font-size: 11px !important;
                line-height: 1.1 !important;
            }
            
            .compact-spacing {
                margin: 1px 0 !important;
                padding: 2px 0 !important;
            }
            ` : ''}
            
            .no-break { 
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .info-line {
                margin: ${formato === 'termica' ? '1px 0' : '2px 0'};
                font-size: ${formato === 'whatsapp' ? '14px' : formato === 'termica' ? '11px' : '13px'};
            }

            ${formato === 'whatsapp' ? `
            .whatsapp-header {
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 15px;
                text-align: center;
            }
            .whatsapp-footer {
                background: #f0f0f0;
                padding: 15px;
                border-radius: 10px;
                margin-top: 15px;
                text-align: center;
                color: #666;
            }
            ` : ''}
        </style>
    </head>
    <body>
        ${formato === 'whatsapp' ? `
        <div class="whatsapp-header">
            <div class="title"> COMPROBANTE ELECTRÓNICO</div>
            <div class="subtitle">Enviado por WhatsApp</div>
        </div>
        ` : ''}

        ${formato === 'termica' ? `
        <div class="contact-vertical" style="top: 260px;">
        </div>
        ` : ''}
        
        <!-- HEADER CON LOGO -->
        <div class="header-logo">
            <img src="/termico.png" alt="Logo Electro Caja" onerror="this.style.display='none'" />
            <div class="title center">ELECTRO SHOP MORANDIN C.A.</div>
            <div class="normal center">RIF: J-405903333</div>
            <div class="subtitle center">Carrera 5ta, frente a la plaza Miranda</div>
            <div class="subtitle center">Instagram: @electroshopgre- WA +582572511282</div>
        </div>
        
        <div class="thick-separator"></div>
        
        <!-- INFORMACIÓN DE LA FACTURA -->
        <div class="title bold">Nro Recibo: #${codigoVenta}</div>
        <div class="info-line">Fecha: ${fechaActual}</div>
        <div class="info-line">Cliente: ${ventaData.cliente?.nombre || 'Sin Cliente'}</div>
        ${ventaData.cliente?.cedula_rif ? `<div class="info-line">CI/RIF: ${ventaData.cliente.cedula_rif}</div>` : ''}
        <div class="info-line">Vendedor: ${ventaData.usuario?.nombre || 'Sistema'}</div>
        <div class="info-line">Tasa: ${formatearVenezolano(tasaCambio)} Bs/$ - BCV</div>
        
        <div class="separator"></div>
        
       <!-- PRODUCTOS -->
        
       
        <!-- HEADER SIMPLIFICADO: 10% + 60% + 30% -->
        <div style="display: flex; font-weight: bold; font-size: ${formato === 'termica' ? '10px' : '12px'}; margin-bottom: 4px; padding: 2px 0;">
            <div style="width: 10%; text-align: center;">Cant</div>
            <div style="width: 60%; text-align: left;">Descripción</div>
            <div style="width: 30%; text-align: right;">Subtotal</div>
        </div>
        <div style="border-top: 1px dashed #000000ff; margin: 2px 0;"></div>
       
        ${ventaData.items.map(item => `
            <div class="item-row no-break" style="margin: 3px 0; font-size: ${formato === 'termica' ? '10px' : '11px'};">
                <!-- UNA SOLA LÍNEA: Cantidad + Descripción con precio + Subtotal -->
                <div style="display: flex; align-items: flex-start;">
                    <div style="width: 10%; text-align: center; font-weight: 700; font-family: ${formato === 'termica' ? "'Roboto Mono', monospace" : 'inherit'};">
                        ${item.cantidad}
                    </div>
                    <div style="width: 60%; text-align: left; line-height: 1.3;">
                        <div style="font-weight: 500; margin-bottom: 1px;">
                            ${item.descripcion} - 
                            <span style="font-size: ${formato === 'termica' ? '8px' : '9px'}; color: #000000ff; font-family: ${formato === 'termica' ? "'Roboto Mono', monospace" : 'inherit'};">
                                ${formatearVenezolano(item.precio_unitario * tasaCambio)} Bs. C/U
                            </span>
                        </div>
                    </div>
                    <div style="width: 30%; text-align: right; font-weight: 700; font-family: ${formato === 'termica' ? "'Roboto Mono', monospace" : 'inherit'};">
                        ${formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs
                    </div>
                </div>
            </div>
        `).join('')}
       
        <div class="thick-separator"></div>
        
        <!-- TOTAL -->
        <div class="total-section">
            ${descuento > 0 ? `
                <div class="center normal">Total a Pagar: ${formatearVenezolano(ventaData.totalBs)} Bs</div>
                <div class="center normal" style="color: #000000ff;">Descuento: -${formatearVenezolano(descuento)} Bs</div>
                ${ventaData.motivoDescuento ? `<div class="center" style="font-size: 10px; color: #000;">${ventaData.motivoDescuento}</div>` : ''}
                <div class="separator"></div>
                <div class="center total-amount">TOTAL PAGADO: ${formatearVenezolano(ventaData.totalBs - descuento)} Bs</div>
            ` : `
                <div class="center total-amount">TOTAL: ${formatearVenezolano(ventaData.totalBs)} Bs</div>
            `}
            <div class="center normal">En USD: $${((ventaData.totalBs - descuento) / tasaCambio).toFixed(2)}</div>
        </div>
        

        ${ventaData.pagos.length > 0 ? `
          <div class="separator"></div>
          <div class="subtitle bold">MÉTODOS DE PAGO:</div>
          ${ventaData.pagos.map(pago => {
    if (pago.monto && parseFloat(pago.monto) > 0) {
      const metodo = pago.metodo.replace('_', ' ').toUpperCase();
      const monto = parseFloat(pago.monto);

      //  DETERMINAR MONEDA SEGÚN EL MÉTODO
      let montoTexto;
      if (pago.metodo === 'efectivo_usd' || pago.metodo === 'zelle' || pago.metodo === 'binance') {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' $';
      } else {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' Bs';
      }

      return `<div class="payment-method">${metodo}: ${montoTexto}</div>`;
    }
    return '';
  }).join('')}
          <div class="separator"></div>
        ` : ''}

        ${ventaData.vueltos && ventaData.vueltos.length > 0 ? `
          <div class="subtitle bold">VUELTOS:</div>
          ${ventaData.vueltos.map(vuelto => {
    if (vuelto.monto && parseFloat(vuelto.monto) > 0) {
      const metodo = vuelto.metodo.replace('_', ' ').toUpperCase();
      const monto = parseFloat(vuelto.monto);

      //  DETERMINAR MONEDA SEGÚN EL MÉTODO
      let montoTexto;
      if (vuelto.metodo === 'efectivo_usd' || vuelto.metodo === 'zelle' || vuelto.metodo === 'binance') {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' $';
      } else {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' Bs';
      }

      return `<div class="payment-method">- ${metodo}: ${montoTexto}</div>`;
    }
    return '';
  }).join('')}
        ` : ''}
                
        <div class="separator"></div>
        <div class="subtitle center">Gracias por su compra</div>
        <div class="subtitle center">ElectroCaja v1.0</div>
        
        ${formato === 'whatsapp' ? `
        <div class="whatsapp-footer">
            <div class="normal"> Comprobante enviado automáticamente</div>
            <div class="normal"> Responda este mensaje para cualquier consulta</div>
        </div>
        ` : `
        <!-- FOOTER DISCLAIMER -->
        <div class="footer-disclaimer">
            NO REPRESENTA UN DOCUMENTO FISCAL
        </div>
        `}
        
        <br><br><br>
        
        <!-- ✅ SCRIPT PARA PREVENIR RECARGA AL CERRAR -->
        <script>
          (function() {
            'use strict';
            
            // ✅ PREVENIR TODOS LOS EVENTOS QUE PUEDAN CAUSAR REFRESH
            // Bloquear eventos antes de que se propaguen
            const preventDefault = function(e) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              return false;
            };
            
            // Prevenir beforeunload
            window.addEventListener('beforeunload', preventDefault, true);
            window.onbeforeunload = null;
            
            // Prevenir unload
            window.addEventListener('unload', preventDefault, true);
            window.onunload = null;
            
            // Prevenir que eventos de foco afecten la ventana principal
            window.addEventListener('blur', function(e) {
              e.stopPropagation();
              e.stopImmediatePropagation();
            }, true);
            
            window.addEventListener('focus', function(e) {
              e.stopPropagation();
              e.stopImmediatePropagation();
            }, true);
            
            // Prevenir que el cierre cause eventos en la ventana padre
            window.addEventListener('pagehide', preventDefault, true);
            window.addEventListener('pageshow', preventDefault, true);
            
            // ✅ AISLAR COMPLETAMENTE LA VENTANA DE IMPRESIÓN
            // No permitir que ningún evento escape de esta ventana
            const originalClose = window.close;
            window.close = function() {
              // Limpiar todos los listeners antes de cerrar
              window.onbeforeunload = null;
              window.onunload = null;
              originalClose.call(window);
            };
            
            // ✅ PREVENIR QUE EL CIERRE MANUAL CAUSE PROBLEMAS
            // Interceptar cualquier intento de cerrar la ventana
            document.addEventListener('visibilitychange', function(e) {
              e.stopPropagation();
            }, true);
          })();
        </script>
    </body>
    </html>
  `;
};

// DUPLICADO A BORRAR
const generarReciboPedidoHTML_OLD = (pedido, tasaCambio) => {
  const fechaActual = new Date(pedido.fecha || Date.now()).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Cálculos de montos
  const totalUsd = parseFloat(pedido.totalUsd || 0);
  const montoAnticipo = parseFloat(pedido.montoAnticipo || 0);
  const montoPendiente = parseFloat(pedido.montoPendiente || 0);
  const descuento = parseFloat(pedido.descuento || 0);

  // Determinar estado de pago
  let estadoPago = 'PENDIENTE';
  if (pedido.pagado) estadoPago = 'PAGADO';
  else if (montoAnticipo > 0) estadoPago = 'ANTICIPO';

  return `
    < !DOCTYPE html >
      <html>
        <head>
          <meta charset="utf-8">
            <title>Pedido #${pedido.numero}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap');
              @page {size: 80mm auto; margin: 0; }
              body {
                width: 80mm;
              font-family: 'Roboto Mono', monospace;
              font-size: 11px;
              line-height: 1.2;
              margin: 0;
              padding: 8px;
              background: white;
              color: #000;
            }
              .center {text - align: center; }
              .right {text - align: right; }
              .bold {font - weight: 700; }
              .title {font - size: 14px; font-weight: 700; margin: 4px 0; }
              .subtitle {font - size: 10px; font-weight: 500; }
              .separator {border - top: 1px dashed #000; margin: 4px 0; width: 100%; }
              .thick-separator {border - top: 2px solid #000; margin: 6px 0; width: 100%; }

              .item-row {display: flex; margin: 2px 0; align-items: flex-start; }
              .qty {width: 10%; text-align: center; font-weight: 700; }
              .desc {width: 60%; font-size: 10px; }
              .price {width: 30%; text-align: right; font-weight: 700; }

              .total-section {
                background: #fff;
              padding: 4px 0;
              border-top: 1px solid #000;
              margin-top: 4px;
            }
              .row {display: flex; justify-content: space-between; }
              .status-badge {
                border: 1px solid #000;
              padding: 2px 4px;
              display: inline-block;
              margin-top: 4px;
              font-weight: bold;
            }
            </style>
        </head>
        <body>
          <div class="center">
            <img src="/termico.png" alt="Logo" style="width: 60px; height: 60px; margin-bottom: 4px;" onerror="this.style.display='none'" />
            <div class="title">ELECTRO SHOP MORANDIN</div>
            <div class="subtitle">RIF: J-405903333</div>
            <div class="subtitle">PEDIDO DE VENTA</div>
          </div>

          <div class="thick-separator"></div>

          <div class="bold">Nro Pedido: #${pedido.numero}</div>
          <div>Fecha: ${fechaActual}</div>
          <div>Cliente: ${pedido.cliente?.nombre || 'General'}</div>
          ${pedido.cliente?.telefono ? `<div>Tel: ${pedido.cliente.telefono}</div>` : ''}
          <div>Vendedor: ${pedido.usuario?.nombre || 'Sistema'}</div>

          <div class="separator"></div>

          <!-- HEADER ITEMS -->
          <div style="display: flex; font-weight: bold; font-size: 10px; margin-bottom: 2px;">
            <div style="width: 10%; text-align: center;">Cant</div>
            <div style="width: 60%;">Descripción</div>
            <div style="width: 30%; text-align: right;">Total</div>
          </div>

          ${pedido.items.map(item => `
            <div class="item-row">
                <div class="qty">${item.cantidad}</div>
                <div class="desc">
                    ${item.descripcion}
                    <div style="font-size: 9px; color: #333;">$${parseFloat(item.precioUnitario).toFixed(2)} c/u</div>
                </div>
                <div class="price">$${(item.cantidad * item.precioUnitario).toFixed(2)}</div>
            </div>
        `).join('')}

          <div class="thick-separator"></div>

          <!-- TOTALES -->
          <div class="total-section">
            <div class="row">
              <span>Subtotal USD:</span>
              <span>$${(totalUsd + descuento).toFixed(2)}</span>
            </div>
            ${descuento > 0 ? `
            <div class="row">
                <span>Descuento:</span>
                <span>-$${descuento.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="row bold" style="font-size: 13px; margin: 4px 0;">
              <span>TOTAL:</span>
              <span>$${totalUsd.toFixed(2)}</span>
            </div>
            <div class="row" style="font-size: 11px;">
              <span>En Bolívares:</span>
              <span>Bs. ${(totalUsd * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <!-- INFO PAGO -->
          <div class="separator"></div>
          <div class="row bold">
            <span>Estado:</span>
            <span>${estadoPago}</span>
          </div>

          ${montoAnticipo > 0 ? `
        <div class="row">
            <span>Abonado:</span>
            <span>$${montoAnticipo.toFixed(2)}</span>
        </div>
        <div class="row bold" style="margin-top: 2px;">
            <span>PENDIENTE:</span>
            <span>$${montoPendiente.toFixed(2)}</span>
        </div>
        ` : ''}

          ${pedido.pagos && pedido.pagos.length > 0 ? `
        <div class="separator"></div>
        <div class="bold" style="font-size: 10px;">DETALLE PAGOS:</div>
        ${pedido.pagos.map(p => `
            <div class="row" style="font-size: 9px;">
                <span>${p.metodo.replace('_', ' ').toUpperCase()}:</span>
                <span>${p.moneda === 'bs' ? 'Bs' : '$'} ${parseFloat(p.monto).toFixed(2)}</span>
            </div>
        `).join('')}
        ` : ''}

          <div class="center" style="margin-top: 15px; font-size: 10px;">
            *** COMPROBANTE DE PEDIDO ***<br>
              No válido como factura fiscal<br>
                Válido por 3 días
              </div>

              <script>
                window.onload = function() {window.print(); window.close(); }
              </script>
            </body>
          </html>
          `;
};

// DUPLICADO A BORRAR
const generarMensajeWhatsAppPedido_OLD = (pedido) => {
  const totalUsd = parseFloat(pedido.totalUsd || 0);
  const montoAnticipo = parseFloat(pedido.montoAnticipo || 0);
  const montoPendiente = parseFloat(pedido.montoPendiente || 0);

  let estadoIcon = '⏳';
  if (pedido.pagado) estadoIcon = '✅';
  else if (montoAnticipo > 0) estadoIcon = '💰';

  let mensaje = `*PEDIDO #${pedido.numero}* ${estadoIcon}\n`;
  mensaje += `📅 Fecha: ${new Date().toLocaleDateString('es-VE')}\n`;
  mensaje += `👤 Cliente: ${pedido.cliente?.nombre || 'Cliente'}\n`;

  mensaje += `\n📋 *DETALLE DEL PEDIDO:*\n`;
  pedido.items.forEach(item => {
    mensaje += `▫️ ${item.cantidad}x ${item.descripcion}\n`;
  });

  mensaje += `\n💵 *RESUMEN FINANCIERO:*\n`;
  mensaje += `*TOTAL: $${totalUsd.toFixed(2)}*\n`;

  if (pedido.pagado) {
    mensaje += `✅ *PAGADO COMPLETO*\n`;
  } else {
    if (montoAnticipo > 0) {
      mensaje += `💰 Abonado: $${montoAnticipo.toFixed(2)}\n`;
    }
    mensaje += `🔴 *PENDIENTE: $${montoPendiente.toFixed(2)}*\n`;
  }

  if (pedido.observaciones) {
    mensaje += `\n📝 Nota: ${pedido.observaciones}\n`;
  }

  mensaje += `\nGracias por su compra en Electro Shop Morandin! 🚀`;

  return encodeURIComponent(mensaje);
};
export const imprimirFacturaTermica = async (ventaData, codigoVenta, tasaCambio, descuento = 0, ventanaPreAbierta = null) => {
  try {
    console.log(' Generando impresión térmica 80mm optimizada...');

    const contenidoHTML = generarHTMLBase(ventaData, codigoVenta, tasaCambio, descuento, 'termica');

    //  Configuración optimizada para impresoras térmicas 80mm
    // Si se proporciona una ventana pre-abierta, usarla; de lo contrario, intentar abrir una nueva
    let ventanaImpresion = ventanaPreAbierta;

    if (!ventanaImpresion) {
      ventanaImpresion = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');

      if (!ventanaImpresion) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
      }
    }

    // ✅ ESCRIBIR HTML CON SCRIPT DE PREVENCIÓN INCLUIDO
    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();

    ventanaImpresion.onload = () => {
      setTimeout(() => {
        ventanaImpresion.print();
        setTimeout(() => {
          // ✅ CERRAR SIN CAUSAR EVENTOS EN LA VENTANA PRINCIPAL
          try {
            if (!ventanaImpresion.closed) {
              ventanaImpresion.close();
            }
          } catch (e) {
            // Ignorar errores al cerrar
          }
        }, 1000);
      }, 500);
    };

    // ✅ PREVENIR QUE EL CIERRE MANUAL DE LA VENTANA CAUSE RECARGA
    // ✅ AISLAR COMPLETAMENTE LA REFERENCIA DE LA VENTANA
    let ventanaRef = ventanaImpresion;

    // ✅ PREVENIR QUE EVENTOS DE LA VENTANA DE IMPRESIÓN AFECTEN LA VENTANA PRINCIPAL
    // Agregar listener en la ventana principal para ignorar eventos de la ventana de impresión
    const preventMainWindowRefresh = (e) => {
      // Solo prevenir si la ventana de impresión está abierta
      if (ventanaRef && !ventanaRef.closed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Temporalmente prevenir eventos en la ventana principal mientras la ventana de impresión está abierta
    window.addEventListener('beforeunload', preventMainWindowRefresh, true);

    const verificarCierre = setInterval(() => {
      if (ventanaRef && ventanaRef.closed) {
        clearInterval(verificarCierre);
        // ✅ REMOVER LISTENER DE LA VENTANA PRINCIPAL CUANDO SE CIERRA LA VENTANA DE IMPRESIÓN
        window.removeEventListener('beforeunload', preventMainWindowRefresh, true);
        // Limpiar referencia
        ventanaRef = null;
      }
    }, 500);

    // Limpiar el intervalo después de un tiempo razonable
    setTimeout(() => {
      clearInterval(verificarCierre);
      window.removeEventListener('beforeunload', preventMainWindowRefresh, true);
      ventanaRef = null;
    }, 30000); // 30 segundos máximo

    console.log(' Ventana de impresión térmica abierta');

  } catch (error) {
    console.error(' Error en impresión térmica tradicional:', error);
    throw error;
  }
};

//  NUEVO - Generar PDF para descarga y email
export const generarPDFFactura = async (ventaData, codigoVenta, tasaCambio, descuento = 0) => {
  try {
    console.log(' Generando PDF para descarga/email...');

    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Cargar logo
    const logoData = await cargarLogo();

    // Logo centrado si está disponible
    if (logoData) {
      doc.addImage(logoData, 'PNG', 85, 5, 40, 40);
    }

    // Header de la empresa
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ELECTRO SHOP MORANDIN C.A.', 105, logoData ? 50 : 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Punto de Venta', 105, logoData ? 60 : 30, { align: 'center' });
    doc.text('RIF: J-405903333', 105, logoData ? 67 : 37, { align: 'center' });

    // Información de la venta
    const startY = logoData ? 85 : 55;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`FACTURA #${codigoVenta}`, 20, startY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${fechaActual}`, 20, startY + 10);
    doc.text(`Tasa de cambio: ${formatearVenezolano(tasaCambio)} Bs/$`, 20, startY + 17);

    // Información del cliente
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 120, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${ventaData.cliente?.nombre || 'Sin Cliente'}`, 120, startY + 10);
    if (ventaData.cliente?.cedula_rif) {
      doc.text(`CI/RIF: ${ventaData.cliente.cedula_rif}`, 120, startY + 17);
    }
    if (ventaData.cliente?.telefono) {
      doc.text(`Teléfono: ${ventaData.cliente.telefono}`, 120, startY + 24);
    }

    // Tabla de productos
    const tableData = ventaData.items.map(item => [
      item.cantidad.toString(),
      item.descripcion,
      `$${item.precio_unitario.toFixed(2)}`,
      `${formatearVenezolano(item.precio_unitario * tasaCambio)} Bs`,
      `$${(item.cantidad * item.precio_unitario).toFixed(2)}`,
      `${formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs`
    ]);

    doc.autoTable({
      startY: startY + 35,
      head: [['Cant.', 'Descripción', 'P.Unit $', 'P.Unit Bs', 'Total $', 'Total Bs']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [52, 168, 83], textColor: 255 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 60 },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 25 }
      }
    });

    // Totales
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');

    if (descuento > 0) {
      doc.text(`Subtotal: ${formatearVenezolano(ventaData.totalBs)} Bs`, 120, finalY);
      doc.text(`Descuento: -${formatearVenezolano(descuento)} Bs`, 120, finalY + 7);
      doc.text(`TOTAL: ${formatearVenezolano(ventaData.totalBs - descuento)} Bs`, 120, finalY + 14);
    } else {
      doc.text(`TOTAL: ${formatearVenezolano(ventaData.totalBs)} Bs`, 120, finalY);
    }

    // Métodos de pago
    if (ventaData.pagos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('MÉTODOS DE PAGO:', 20, finalY + 25);
      doc.setFont('helvetica', 'normal');

      let yPos = finalY + 35;
      ventaData.pagos.forEach(pago => {
        if (pago.monto && parseFloat(pago.monto) > 0) {
          const metodo = pago.metodo.replace('_', ' ').toUpperCase();
          doc.text(`• ${metodo}: ${formatearVenezolano(pago.monto)} ${pago.moneda?.toUpperCase() || 'BS'}`, 25, yPos);
          yPos += 7;
        }
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su compra', 105, 280, { align: 'center' });

    // Retornar blob para descarga o email
    const pdfBlob = doc.output('blob');

    console.log(' PDF generado exitosamente');
    return pdfBlob;

  } catch (error) {
    console.error(' Error generando PDF:', error);
    throw error;
  }
};


// ✅ FUNCIÓN HELPER PARA CARGAR IMÁGENES
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const generarImagenWhatsApp = async (ventaData, codigoVenta, tasaCambio, descuento = 0) => {
  try {
    console.log(' ===== INICIANDO GENERACIÓN IMAGEN WHATSAPP PREMIUM =====');
    console.log(' Usuario en WhatsApp:', ventaData.usuario?.nombre || 'No definido');
    console.log(' ventaData recibida:', ventaData);
    console.log(' codigoVenta:', codigoVenta);
    console.log(' tasaCambio:', tasaCambio);
    console.log(' descuento:', descuento);

    // ✅ CREAR CANVAS CON MAYOR RESOLUCIÓN PARA MEJOR CALIDAD
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Dimensiones aumentadas para mejor calidad (2x para retina)
    const scaleFactor = 2; // Factor de escala para alta calidad
    canvas.width = 720 * scaleFactor; // 1440px de ancho real
    canvas.height = 2000 * scaleFactor; // Altura inicial ajustable

    // Escalar contexto para que todo se dibuje al doble de tamaño
    ctx.scale(scaleFactor, scaleFactor);

    // Ahora trabajamos con dimensiones lógicas (360x1000)
    const width = 720;
    const height = 2000;

    console.log(' Canvas creado (alta calidad):', canvas.width, 'x', canvas.height, '(escala:', scaleFactor + 'x)');

    // ✅ FONDO BLANCO PREMIUM CON SOMBRA SUTIL
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Sombra sutil alrededor del comprobante
    ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    console.log(' Fondo premium aplicado');

    // ✅ HEADER PREMIUM CON GRADIENTE Y LOGO MEJORADO
    const headerHeight = 100;
    const gradient = ctx.createLinearGradient(0, 0, width, headerHeight);
    gradient.addColorStop(0, '#2563EB'); // Azul más vibrante
    gradient.addColorStop(0.5, '#1D4ED8');
    gradient.addColorStop(1, '#1E40AF'); // Azul más oscuro
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, headerHeight);

    // Sombra en el header
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    console.log(' Header premium aplicado');

    // ✅ CARGAR Y DIBUJAR LOGO MEJORADO (MÁS GRANDE Y CON SOMBRA)
    let logoLoaded = false;
    try {
      const logoUrl = `${window.location.origin}/android-chrome-512x5129.png`;
      console.log(' Cargando logo desde:', logoUrl);

      const logo = await loadImage(logoUrl);

      // Logo más grande y mejor posicionado
      const logoSize = 70; // Aumentado de 40 a 70
      const logoX = 30; // Margen izquierdo
      const logoY = (headerHeight - logoSize) / 2; // Centrado verticalmente

      // Sombra para el logo
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Dibujar logo con fondo circular blanco para mejor contraste
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
      ctx.restore();

      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      logoLoaded = true;

      // Resetear sombra
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      console.log(' Logo premium dibujado');

    } catch (error) {
      console.log(' No se pudo cargar el logo:', error.message);
      logoLoaded = false;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // ✅ TEXTO DEL HEADER MEJORADO (MEJOR TIPOGRAFÍA Y ESPACIADO)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif'; // Fuente más grande y mejor
    ctx.textAlign = 'left';

    const textStartX = logoLoaded ? 120 : 30; // Más espacio después del logo
    const textStartY = 35;

    ctx.fillText('ELECTRO SHOP MORANDIN C.A.', textStartX, textStartY);

    ctx.font = '13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText('RIF: J-405903333 - Guanare, Venezuela', textStartX, textStartY + 20);

    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('ElectroCaja v1.0', textStartX, textStartY + 38);

    console.log(' Texto del header premium aplicado');

    let yPos = 130; // Más espacio después del header

    // ✅ INFORMACIÓN DE LA VENTA MEJORADA
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';

    // Fondo sutil para el código de venta
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(width / 2 - 200, yPos - 25, 400, 50);

    ctx.fillStyle = '#1F2937';
    ctx.fillText(`COMPROBANTE #${codigoVenta}`, width / 2, yPos);
    yPos += 35;

    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText(`${new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, width / 2, yPos);
    yPos += 30;

    // Cliente con mejor formato
    if (ventaData.cliente && ventaData.cliente.nombre) {
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`Cliente: ${ventaData.cliente.nombre}`, width / 2, yPos);
      yPos += 25;
      if (ventaData.cliente.cedula_rif) {
        ctx.font = '13px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.fillText(`CI/RIF: ${ventaData.cliente.cedula_rif}`, width / 2, yPos);
        yPos += 25;
      }
      console.log(' Cliente aplicado:', ventaData.cliente.nombre);
    }

    yPos += 20;

    // ✅ PRODUCTOS CON MEJOR DISEÑO
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCTOS', 40, yPos);
    yPos += 30;

    // Línea decorativa bajo "PRODUCTOS"
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, yPos - 10);
    ctx.lineTo(width - 40, yPos - 10);
    ctx.stroke();
    yPos += 10;

    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#374151';

    if (ventaData.items && ventaData.items.length > 0) {
      console.log(' Productos a dibujar:', ventaData.items.length);

      ventaData.items.forEach((item, index) => {
        // Fondo alternado para mejor legibilidad
        if (index % 2 === 0) {
          ctx.fillStyle = '#F9FAFB';
          ctx.fillRect(40, yPos - 15, width - 80, 30);
        }

        const descripcion = `${item.cantidad}× ${item.descripcion}`;
        const precio = (item.cantidad * item.precio_unitario * tasaCambio).toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' Bs';

        ctx.fillStyle = '#374151';
        ctx.textAlign = 'left';
        ctx.fillText(descripcion.substring(0, 40), 50, yPos);

        ctx.textAlign = 'right';
        ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.fillText(precio, width - 50, yPos);

        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        yPos += 30;

        console.log(` Producto ${index + 1} dibujado:`, descripcion);
      });
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('Sin productos', width / 2, yPos);
      yPos += 30;
      console.log(' Sin productos para dibujar');
    }

    yPos += 20;

    // ✅ LÍNEA SEPARADORA MEJORADA
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, yPos);
    ctx.lineTo(width - 40, yPos);
    ctx.stroke();
    yPos += 30;

    // ✅ CÁLCULOS DE TOTALES
    let subtotal = 0;
    if (ventaData.items) {
      subtotal = ventaData.items.reduce((sum, item) => {
        return sum + (item.cantidad * item.precio_unitario);
      }, 0) * tasaCambio;
    }

    const totalFinal = subtotal - (descuento || 0);

    console.log(' Cálculos:', { subtotal, descuento, totalFinal });

    // ✅ SUBTOTAL Y DESCUENTO CON MEJOR FORMATO
    ctx.fillStyle = '#374151';
    ctx.font = '15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';

    ctx.fillText('Subtotal:', 40, yPos);
    ctx.textAlign = 'right';
    ctx.fillText(subtotal.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' Bs', width - 40, yPos);
    yPos += 25;

    // Descuento con mejor diseño
    if (descuento > 0) {
      ctx.fillStyle = '#DC2626';
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
      ctx.fillText('Descuento:', 40, yPos);
      ctx.textAlign = 'right';
      ctx.fillText('-' + descuento.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' Bs', width - 40, yPos);
      yPos += 25;

      if (ventaData.motivoDescuento) {
        ctx.font = '12px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#9CA3AF';
        ctx.textAlign = 'left';
        ctx.fillText(`Motivo: ${ventaData.motivoDescuento.substring(0, 50)}`, 50, yPos);
        yPos += 20;
        ctx.font = '15px "Segoe UI", Arial, sans-serif';
      }

      console.log(' Descuento aplicado:', descuento);
    }

    yPos += 15;

    // ✅ TOTAL FINAL PREMIUM CON DISEÑO MEJORADO
    const totalBoxHeight = 80;
    const totalBoxY = yPos - 10;

    // Fondo con gradiente verde
    const totalGradient = ctx.createLinearGradient(40, totalBoxY, width - 40, totalBoxY + totalBoxHeight);
    totalGradient.addColorStop(0, '#F0FDF4');
    totalGradient.addColorStop(1, '#DCFCE7');
    ctx.fillStyle = totalGradient;
    ctx.fillRect(40, totalBoxY, width - 80, totalBoxHeight);

    // Borde verde más grueso
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, totalBoxY, width - 80, totalBoxHeight);

    // Sombra para el total
    ctx.shadowColor = 'rgba(34, 197, 94, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    const totalTexto = totalFinal.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' Bs';
    ctx.fillText(totalTexto, width / 2, totalBoxY + 35);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#16A34A';
    ctx.fillText('TOTAL A PAGAR', width / 2, totalBoxY + 60);

    yPos += totalBoxHeight + 20;


    // ✅ MÉTODOS DE PAGO MEJORADOS
    if (ventaData.pagos && ventaData.pagos.length > 0) {
      const pagosConMonto = ventaData.pagos.filter(pago => pago.monto && parseFloat(pago.monto) > 0);

      if (pagosConMonto.length > 0) {
        yPos += 20;

        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('MÉTODOS DE PAGO', 40, yPos);
        yPos += 25;

        // Línea decorativa
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, yPos - 10);
        ctx.lineTo(width - 40, yPos - 10);
        ctx.stroke();
        yPos += 5;

        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#374151';

        pagosConMonto.forEach((pago, index) => {
          const metodoTexto = pago.metodo.replace('_', ' ').toUpperCase();

          let montoTexto;
          const monto = parseFloat(pago.monto);

          if (pago.metodo === 'efectivo_usd' || pago.metodo === 'zelle' || pago.metodo === 'binance') {
            montoTexto = monto.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) + ' $';
          } else {
            montoTexto = monto.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) + ' Bs';
          }

          ctx.textAlign = 'left';
          ctx.fillText(`• ${metodoTexto}:`, 50, yPos);
          ctx.textAlign = 'right';
          ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
          ctx.fillText(montoTexto, width - 50, yPos);
          ctx.font = '14px "Segoe UI", Arial, sans-serif';

          yPos += 22;

          if (pago.referencia && pago.referencia.trim()) {
            ctx.font = '12px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#6B7280';
            ctx.textAlign = 'left';
            ctx.fillText(`  Ref: ${pago.referencia.substring(0, 30)}`, 60, yPos);
            yPos += 18;
            ctx.font = '14px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#374151';
          }

          console.log(` Método de pago ${index + 1}:`, metodoTexto, montoTexto);
        });

        yPos += 15;
      }
    }

    // ✅ VUELTOS MEJORADOS
    if (ventaData.vueltos && ventaData.vueltos.length > 0) {
      const vueltosConMonto = ventaData.vueltos.filter(vuelto => vuelto.monto && parseFloat(vuelto.monto) > 0);

      if (vueltosConMonto.length > 0) {
        yPos += 15;

        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('VUELTOS', 40, yPos);
        yPos += 25;

        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#374151';

        vueltosConMonto.forEach((vuelto, index) => {
          const metodoTexto = vuelto.metodo.replace('_', ' ').toUpperCase();

          let montoTexto;
          const monto = parseFloat(vuelto.monto);

          if (vuelto.metodo === 'efectivo_usd' || vuelto.metodo === 'zelle' || vuelto.metodo === 'binance') {
            montoTexto = monto.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) + ' $';
          } else {
            montoTexto = monto.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) + ' Bs';
          }

          ctx.textAlign = 'left';
          ctx.fillText(`• ${metodoTexto}:`, 50, yPos);
          ctx.textAlign = 'right';
          ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
          ctx.fillText(montoTexto, width - 50, yPos);
          ctx.font = '14px "Segoe UI", Arial, sans-serif';

          yPos += 22;

          console.log(` Vuelto ${index + 1}:`, metodoTexto, montoTexto);
        });

        yPos += 15;
      }
    }

    yPos += 20;

    // ✅ FOOTER PREMIUM
    ctx.fillStyle = '#6B7280';
    ctx.font = '13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WhatsApp: +58 257 251 1282', width / 2, yPos);
    yPos += 20;
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#374151';
    ctx.fillText('Electro Shop Morandín C.A.', width / 2, yPos);
    yPos += 20;
    ctx.font = '13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#22C55E';
    ctx.fillText('¡Gracias por su compra!', width / 2, yPos);

    console.log(' Footer premium aplicado');

    // ✅ AJUSTAR ALTURA DEL CANVAS
    const finalHeight = Math.ceil((yPos + 40) * scaleFactor);
    if (finalHeight !== canvas.height) {
      const newCanvas = document.createElement('canvas');
      const newCtx = newCanvas.getContext('2d');
      newCanvas.width = canvas.width;
      newCanvas.height = finalHeight;

      newCtx.drawImage(canvas, 0, 0);

      // ✅ EXPORTAR EN PNG PARA MEJOR CALIDAD (sin compresión JPEG)
      const imagenBase64 = newCanvas.toDataURL('image/png');

      console.log(' Imagen premium generada:', {
        size_kb: Math.round(imagenBase64.length / 1024),
        width: newCanvas.width,
        height: finalHeight,
        format: 'PNG',
        scale: scaleFactor + 'x'
      });

      return imagenBase64;
    }

    // ✅ EXPORTAR EN PNG PARA MEJOR CALIDAD
    const imagenBase64 = canvas.toDataURL('image/png');

    console.log(' Imagen premium generada:', {
      size_kb: Math.round(imagenBase64.length / 1024),
      width: canvas.width,
      height: canvas.height,
      format: 'PNG',
      scale: scaleFactor + 'x'
    });

    if (imagenBase64.length < 1000) {
      throw new Error('Imagen generada está vacía o muy pequeña');
    }

    console.log(' ===== IMAGEN WHATSAPP PREMIUM COMPLETADA =====');

    return imagenBase64;

  } catch (error) {
    console.error(' Error generando imagen premium para WhatsApp:', error);
    throw error;
  }
};

//  FUNCIÓN FALLBACK - Crear imagen con Canvas API nativo
const generarImagenFallback = async (ventaData, codigoVenta, tasaCambio, descuento = 0) => {
  try {
    console.log(' Generando imagen fallback con Canvas...');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Configurar canvas
    canvas.width = 350;
    canvas.height = 600;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configurar texto
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';

    let y = 30;
    const lineHeight = 20;

    // Header
    ctx.fillText('ELECTRO SHOP MORANDÍN C.A.', canvas.width / 2, y);
    y += lineHeight;

    ctx.font = '12px Arial';
    ctx.fillText('RIF: J-405903333', canvas.width / 2, y);
    y += lineHeight * 2;

    // Información de la factura
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Recibo #${codigoVenta}`, canvas.width / 2, y);
    y += lineHeight * 1.5;

    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    const fechaActual = new Date().toLocaleDateString('es-ES');
    ctx.fillText(`Fecha: ${fechaActual}`, 20, y);
    y += lineHeight;

    ctx.fillText(`Cliente: ${ventaData.cliente?.nombre || 'Sin Cliente'}`, 20, y);
    y += lineHeight;

    if (ventaData.cliente?.cedula_rif) {
      ctx.fillText(`CI/RIF: ${ventaData.cliente.cedula_rif}`, 20, y);
      y += lineHeight;
    }

    ctx.fillText(`Tasa: ${formatearVenezolano(tasaCambio)} Bs/$`, 20, y);
    y += lineHeight * 2;

    // Línea separadora
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(canvas.width - 20, y);
    ctx.stroke();
    y += lineHeight;

    // Productos
    ctx.font = 'bold 12px Arial';
    ctx.fillText('PRODUCTOS:', 20, y);
    y += lineHeight;

    ctx.font = '11px Arial';

    ventaData.items.forEach(item => {
      const descripcion = `${item.cantidad}× ${item.descripcion}`;
      const precio = `${formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs`;

      // Texto a la izquierda
      ctx.textAlign = 'left';
      ctx.fillText(descripcion.substring(0, 35), 20, y);

      // Precio a la derecha
      ctx.textAlign = 'right';
      ctx.fillText(precio, canvas.width - 20, y);

      y += lineHeight;
    });

    y += lineHeight;

    // Línea separadora
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(canvas.width - 20, y);
    ctx.stroke();
    y += lineHeight;

    // Total
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    const totalFinal = ventaData.totalBs - (descuento || 0);
    ctx.fillText(`TOTAL: ${formatearVenezolano(totalFinal)} Bs`, canvas.width / 2, y);
    y += lineHeight;

    ctx.font = '12px Arial';
    ctx.fillText(`En USD: $${(totalFinal / tasaCambio).toFixed(2)}`, canvas.width / 2, y);
    y += lineHeight * 2;

    // Footer
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('Gracias por su compra', canvas.width / 2, y);
    y += lineHeight;
    ctx.fillText(' Enviado por WhatsApp', canvas.width / 2, y);

    // Convertir a base64
    const imagenBase64 = canvas.toDataURL('image/png', 0.9);

    console.log(' Imagen fallback generada exitosamente');
    return imagenBase64;

  } catch (error) {
    console.error(' Error en imagen fallback:', error);
    throw new Error('No se pudo generar la imagen para WhatsApp');
  }
};

//  NUEVO - Descargar PDF automáticamente
export const descargarPDF = async (ventaData, codigoVenta, tasaCambio, descuento = 0) => {
  try {
    const pdfBlob = await generarPDFFactura(ventaData, codigoVenta, tasaCambio, descuento);

    // Crear enlace de descarga
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factura_${codigoVenta}_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error descargando PDF:', error);
    toast.error('Error al descargar PDF: ' + error.message);
    throw error;
  }
};

// 🆕 IMPRESIÓN TÉRMICA PARA SERVICIOS TÉCNICOS
export const imprimirTicketServicio = async (servicio, usuario, linkSeguimiento, qrCode = null) => {
  try {
    console.log('🖨️ [printUtils] ========== INICIANDO IMPRESIÓN ==========');
    console.log('🖨️ [printUtils] Datos recibidos:', {
      servicioId: servicio?.id,
      numeroServicio: servicio?.numeroServicio,
      tieneTicketHTML: !!servicio?.ticketHTML,
      tieneTicketHTMLInterno: !!servicio?.ticketHTMLInterno,
      ticketHTMLLength: servicio?.ticketHTML?.length || 0,
      tieneQRCode: !!qrCode,
      tieneLinkSeguimiento: !!linkSeguimiento,
      usuario: usuario?.nombre || 'N/A'
    });

    // Validar que el servicio existe
    if (!servicio) {
      console.error('❌ [printUtils] ERROR: servicio es null o undefined');
      throw new Error('Servicio no válido para imprimir');
    }

    if (!servicio.id) {
      console.error('❌ [printUtils] ERROR: servicio no tiene ID');
      throw new Error('Servicio no tiene ID válido');
    }

    // Si no hay ticketHTML, solicitarlo al backend
    if (!servicio.ticketHTML && servicio.id) {
      console.log('📥 [printUtils] No hay ticketHTML en el servicio, solicitando al backend...');
      console.log('📥 [printUtils] Servicio ID:', servicio.id);
      try {
        const { api } = await import('../config/api');
        console.log('📡 [printUtils] Realizando petición GET a /servicios/' + servicio.id + '/ticket?tipo=cliente');
        const response = await api.get(`/servicios/${servicio.id}/ticket?tipo=cliente`);

        console.log('📥 [printUtils] Respuesta del backend:', {
          success: response.data?.success,
          tieneData: !!response.data?.data,
          tieneTicketHTML: !!response.data?.data?.ticketHTML,
          tieneTicketHTMLInterno: !!response.data?.data?.ticketHTMLInterno,
          tieneQRCode: !!response.data?.data?.qrCode,
          tieneLinkSeguimiento: !!response.data?.data?.linkSeguimiento
        });

        if (response.data.success && response.data.data) {
          servicio.ticketHTML = response.data.data.ticketHTML;
          servicio.ticketHTMLInterno = response.data.data.ticketHTMLInterno;
          if (!qrCode && response.data.data.qrCode) {
            qrCode = response.data.data.qrCode;
            console.log('✅ [printUtils] QR Code obtenido del backend');
          }
          if (!linkSeguimiento && response.data.data.linkSeguimiento) {
            linkSeguimiento = response.data.data.linkSeguimiento;
            console.log('✅ [printUtils] Link de seguimiento obtenido del backend');
          }
          console.log('✅ [printUtils] TicketHTML obtenido del backend:', {
            ticketHTMLLength: servicio.ticketHTML?.length || 0,
            ticketHTMLInternoLength: servicio.ticketHTMLInterno?.length || 0
          });
        } else {
          console.error('❌ [printUtils] Respuesta del backend no tiene datos válidos:', response.data);
          throw new Error('Respuesta del backend inválida');
        }
      } catch (error) {
        console.error('❌ [printUtils] Error obteniendo ticket del backend:', error);
        console.error('❌ [printUtils] Detalles del error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        });
        throw new Error('No se pudo obtener el ticket del servicio: ' + (error.message || 'Error desconocido'));
      }
    }

    // Si el backend ya generó el HTML, usarlo directamente
    if (servicio.ticketHTML) {
      console.log('✅ [printUtils] TicketHTML disponible, preparando impresión...');
      const contenidoHTML = servicio.ticketHTML;
      console.log('📄 [printUtils] Contenido HTML:', {
        length: contenidoHTML.length,
        preview: contenidoHTML.substring(0, 300) + '...'
      });

      // Si hay QR code, insertarlo en el HTML si hay placeholder
      let htmlConQR = contenidoHTML;
      const tieneQRPlaceholder = contenidoHTML.includes('qr-code-placeholder');
      console.log('🔍 [printUtils] Verificando QR Code:', {
        tieneQRCode: !!qrCode,
        tieneQRPlaceholder,
        qrCodeLength: qrCode?.length || 0
      });

      if (qrCode && tieneQRPlaceholder) {
        console.log('🔄 [printUtils] Insertando QR Code en HTML...');
        htmlConQR = contenidoHTML.replace(
          '<div id="qr-code-placeholder"',
          `<img src="${qrCode}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block;" />`
        );
        console.log('✅ [printUtils] QR Code insertado en HTML');
      } else if (qrCode && contenidoHTML.includes('qr-code-placeholder')) {
        // Si ya hay un placeholder pero sin img, reemplazar
        console.log('🔄 [printUtils] Reemplazando placeholder de QR Code...');
        htmlConQR = contenidoHTML.replace(
          /<div id="qr-code-placeholder"[^>]*>[\s\S]*?<\/div>/,
          `<img src="${qrCode}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block;" />`
        );
        console.log('✅ [printUtils] Placeholder de QR Code reemplazado');
      } else if (qrCode && !tieneQRPlaceholder) {
        console.log('⚠️ [printUtils] Hay QR Code pero no hay placeholder en el HTML');
      }

      // 🆕 IMPRIMIR TICKET DEL CLIENTE PRIMERO
      console.log('🪟 [printUtils] Abriendo ventana de impresión...');

      // 🆕 Asegurar que el modal no esté bloqueando
      const modalElement = document.querySelector('[data-procesando-modal="true"]');
      if (modalElement) {
        console.log('👁️ [printUtils] Modal detectado, asegurando que no bloquee la impresión...');
        modalElement.style.zIndex = '1'; // Reducir z-index temporalmente
        modalElement.style.pointerEvents = 'none'; // Deshabilitar eventos del modal
      }

      const ventanaImpresionCliente = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');

      if (!ventanaImpresionCliente) {
        console.error('❌ [printUtils] ERROR: No se pudo abrir la ventana de impresión');
        // Restaurar modal si falla
        if (modalElement) {
          modalElement.style.zIndex = '99999';
          modalElement.style.pointerEvents = 'auto';
        }
        throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
      }

      console.log('✅ [printUtils] Ventana de impresión abierta, escribiendo contenido HTML...');
      console.log('📝 [printUtils] HTML a escribir (primeros 500 caracteres):', htmlConQR.substring(0, 500));

      ventanaImpresionCliente.document.write(htmlConQR);
      ventanaImpresionCliente.document.close();
      console.log('✅ [printUtils] Contenido HTML escrito en ventana');

      // 🆕 Restaurar modal después de abrir la ventana
      if (modalElement) {
        setTimeout(() => {
          modalElement.style.zIndex = '99999';
          modalElement.style.pointerEvents = 'auto';
          console.log('👁️ [printUtils] Modal restaurado después de abrir ventana');
        }, 500);
      }

      // Bandera para evitar impresión duplicada del ticket interno
      let ticketInternoImpreso = false;

      const imprimirTicketInterno = () => {
        console.log('🖨️ [printUtils] imprimirTicketInterno llamado');
        // Evitar impresión duplicada
        if (ticketInternoImpreso) {
          console.log('⏭️ [printUtils] Ticket interno ya impreso, saltando...');
          return;
        }
        ticketInternoImpreso = true;

        // Cerrar ventana del cliente si aún está abierta
        if (!ventanaImpresionCliente.closed) {
          console.log('🔒 [printUtils] Cerrando ventana del cliente...');
          ventanaImpresionCliente.close();
        }

        // Imprimir ticket interno inmediatamente si existe
        if (servicio.ticketHTMLInterno) {
          console.log('✅ [printUtils] Ticket interno disponible, preparando impresión...');
          console.log('📄 [printUtils] Ticket interno length:', servicio.ticketHTMLInterno.length);
          // Pequeño delay para asegurar que la ventana anterior se cerró
          setTimeout(() => {
            console.log('🪟 [printUtils] Abriendo ventana para ticket interno...');
            const ventanaImpresionInterno = window.open('', '_blank', 'width=302,height=200,scrollbars=yes');

            if (ventanaImpresionInterno) {
              console.log('✅ [printUtils] Ventana de ticket interno abierta, escribiendo contenido...');
              ventanaImpresionInterno.document.write(servicio.ticketHTMLInterno);
              ventanaImpresionInterno.document.close();

              ventanaImpresionInterno.onload = () => {
                console.log('✅ [printUtils] Ticket interno cargado, imprimiendo...');
                setTimeout(() => {
                  ventanaImpresionInterno.print();
                  setTimeout(() => {
                    console.log('🔒 [printUtils] Cerrando ventana de ticket interno...');
                    ventanaImpresionInterno.close();
                  }, 1000);
                }, 500);
              };
            } else {
              console.error('❌ [printUtils] No se pudo abrir ventana para ticket interno');
            }
          }, 500);
        } else {
          console.log('ℹ️ [printUtils] No hay ticket interno para imprimir');
        }
      };

      ventanaImpresionCliente.onload = () => {
        console.log('✅ [printUtils] Ventana de impresión cargada, esperando 500ms antes de imprimir...');
        setTimeout(() => {
          console.log('🖨️ [printUtils] Llamando a window.print()...');
          try {
            ventanaImpresionCliente.print();
            console.log('✅ [printUtils] window.print() ejecutado exitosamente');

            // 🆕 DESPUÉS DE IMPRIMIR EL TICKET DEL CLIENTE, IMPRIMIR EL TICKET INTERNO INMEDIATAMENTE
            // Usar el evento afterprint para detectar cuando terminó la impresión del cliente
            console.log('👂 [printUtils] Registrando listener para evento afterprint...');
            ventanaImpresionCliente.addEventListener('afterprint', () => {
              console.log('📄 [printUtils] Evento afterprint detectado, imprimiendo ticket interno...');
              imprimirTicketInterno();
            }, { once: true });

            // Fallback: si afterprint no funciona, usar timeout
            setTimeout(() => {
              if (!ticketInternoImpreso) {
                console.log('⏰ [printUtils] Timeout alcanzado, usando fallback para imprimir ticket interno...');
                imprimirTicketInterno();
              }
            }, 2000); // Timeout como fallback
          } catch (error) {
            console.error('❌ [printUtils] Error al llamar window.print():', error);
            throw error;
          }
        }, 500);
      };

      // Fallback si onload no se dispara
      setTimeout(() => {
        if (ventanaImpresionCliente.document.readyState === 'complete') {
          console.log('⏰ [printUtils] Ventana lista (fallback), imprimiendo...');
          ventanaImpresionCliente.print();
        }
      }, 1000);

      console.log('✅ [printUtils] Ventana de impresión térmica configurada correctamente');
      return;
    }

    // Si no hay HTML del backend, generar uno básico
    console.warn('⚠️ [printUtils] No hay HTML del ticket del backend');
    console.warn('⚠️ [printUtils] Estado del servicio:', {
      tieneId: !!servicio.id,
      tieneTicketHTML: !!servicio.ticketHTML,
      servicioCompleto: servicio
    });
    toast.warning('Generando ticket básico (sin QR)', { duration: 3000 });

  } catch (error) {
    console.error('❌ [printUtils] ========== ERROR EN IMPRESIÓN ==========');
    console.error('❌ [printUtils] Error completo:', error);
    console.error('❌ [printUtils] Mensaje:', error.message);
    console.error('❌ [printUtils] Stack:', error.stack);
    console.error('❌ [printUtils] Detalles:', {
      servicioId: servicio?.id,
      numeroServicio: servicio?.numeroServicio,
      tieneTicketHTML: !!servicio?.ticketHTML,
      response: error.response?.data,
      status: error.response?.status
    });
    toast.error('Error al imprimir ticket: ' + error.message);
    throw error;
  }
};

// 🆕 GENERAR HTML PARA PEDIDOS (TÉRMICA 80MM)
// DEPRECATED
const generarReciboPedidoHTML_OLD2 = (pedido, tasaCambio) => {
  const fechaActual = new Date(pedido.fecha || Date.now()).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Cálculos de montos
  const totalUsd = parseFloat(pedido.totalUsd || 0);
  const montoAnticipo = parseFloat(pedido.montoAnticipo || 0);
  const montoPendiente = parseFloat(pedido.montoPendiente || 0);
  const descuento = parseFloat(pedido.descuento || 0);

  // Determinar estado de pago
  let estadoPago = 'PENDIENTE';
  if (pedido.pagado) estadoPago = 'PAGADO';
  else if (montoAnticipo > 0) estadoPago = 'ANTICIPO';

  return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
                <title>Pedido #${pedido.numero}</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap');
                  @page {size: 80mm auto; margin: 0; }
                  body {
                    width: 80mm;
                  font-family: 'Roboto Mono', monospace;
                  font-size: 11px;
                  line-height: 1.2;
                  margin: 0;
                  padding: 8px;
                  background: white;
                  color: #000;
            }
                  .center {text - align: center; }
                  .col-left {text - align: left; }
                  .col-right {text - align: right; }
                  .bold {font - weight: 700; }
                  .title {font - size: 14px; font-weight: 700; margin: 4px 0; }
                  .subtitle {font - size: 10px; font-weight: 500; }
                  .separator {border - top: 1px dashed #000; margin: 4px 0; width: 100%; }
                  .thick-separator {border - top: 2px solid #000; margin: 6px 0; width: 100%; }
                  .item-row {display: flex; margin: 2px 0; align-items: flex-start; }
                  .qty {width: 10%; text-align: center; font-weight: 700; }
                  .desc {width: 60%; font-size: 10px; }
                  .price {width: 30%; text-align: right; font-weight: 700; }
                  .total-section {
                    background: #fff;
                  padding: 4px 0;
                  border-top: 1px solid #000;
                  margin-top: 4px;
            }
                  .row {display: flex; justify-content: space-between; }
                </style>
            </head>
            <body>
              <div class="center">
                <img src="/termico.png" alt="Logo" style="width: 60px; height: 60px; margin-bottom: 4px;" onerror="this.style.display='none'" />
                <div class="title">ELECTRO SHOP MORANDIN</div>
                <div class="subtitle">RIF: J-405903333</div>
                <div class="subtitle">PEDIDO DE VENTA</div>
              </div>

              <div class="thick-separator"></div>

              <div class="bold">Nro Pedido: #${pedido.numero}</div>
              <div>Fecha: ${fechaActual}</div>
              <div>Cliente: ${pedido.cliente?.nombre || 'General'}</div>
              ${pedido.cliente?.telefono ? `<div>Tel: ${pedido.cliente.telefono}</div>` : ''}
              <div>Vendedor: ${pedido.usuario?.nombre || 'Sistema'}</div>

              <div class="separator"></div>

              <div style="display: flex; font-weight: bold; font-size: 10px; margin-bottom: 2px;">
                <div style="width: 10%; text-align: center;">Cant</div>
                <div style="width: 60%;">Descripción</div>
                <div style="width: 30%; text-align: right;">Total</div>
              </div>

              ${pedido.items.map(item => `
            <div class="item-row">
                <div class="qty">${item.cantidad}</div>
                <div class="desc">
                    ${item.descripcion}
                    <div style="font-size: 9px; color: #333;">$${parseFloat(item.precioUnitario).toFixed(2)} c/u</div>
                </div>
                <div class="price">$${(item.cantidad * item.precioUnitario).toFixed(2)}</div>
            </div>
        `).join('')}

              <div class="thick-separator"></div>

              <div class="total-section">
                <div class="row">
                  <span>Subtotal USD:</span>
                  <span>$${(totalUsd + descuento).toFixed(2)}</span>
                </div>
                ${descuento > 0 ? `
            <div class="row">
                <span>Descuento:</span>
                <span>-$${descuento.toFixed(2)}</span>
            </div>
            ` : ''}
                <div class="row bold" style="font-size: 13px; margin: 4px 0;">
                  <span>TOTAL:</span>
                  <span>$${totalUsd.toFixed(2)}</span>
                </div>
                <div class="row" style="font-size: 11px;">
                  <span>En Bolívares:</span>
                  <span>Bs. ${(totalUsd * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div class="separator"></div>
              <div class="row bold">
                <span>Estado:</span>
                <span>${estadoPago}</span>
              </div>

              ${montoAnticipo > 0 ? `
        <div class="row">
            <span>Abonado:</span>
            <span>$${montoAnticipo.toFixed(2)}</span>
        </div>
        <div class="row bold" style="margin-top: 2px;">
            <span>PENDIENTE:</span>
            <span>$${montoPendiente.toFixed(2)}</span>
        </div>
        ` : ''}

              ${pedido.pagos && pedido.pagos.length > 0 ? `
        <div class="separator"></div>
        <div class="bold" style="font-size: 10px;">DETALLE PAGOS:</div>
        ${pedido.pagos.map(p => `
            <div class="row" style="font-size: 9px;">
                <span>${p.metodo.replace('_', ' ').toUpperCase()}:</span>
                <span>${p.moneda === 'bs' ? 'Bs' : '$'} ${parseFloat(p.monto).toFixed(2)}</span>
            </div>
        `).join('')}
        ` : ''}

              <div class="center" style="margin-top: 15px; font-size: 10px;">
                *** COMPROBANTE DE PEDIDO ***<br>
                  No válido como factura fiscal<br>
                    Válido por 3 días
                  </div>

                  <script>
                    window.onload = function() {window.print(); window.close(); }
                  </script>
                </body>
              </html>
              `;
};

// 🆕 GENERAR MENSAJE WHATSAPP DETALLADO
// DEPRECATED
const generarMensajeWhatsAppPedido_OLD2 = (pedido) => {
  const totalUsd = parseFloat(pedido.totalUsd || 0);
  const montoAnticipo = parseFloat(pedido.montoAnticipo || 0);
  const montoPendiente = parseFloat(pedido.montoPendiente || 0);

  let estadoIcon = '⏳';
  if (pedido.pagado) estadoIcon = '✅';
  else if (montoAnticipo > 0) estadoIcon = '💰';

  let mensaje = `*PEDIDO #${pedido.numero}* ${estadoIcon}\n`;
  mensaje += `📅 Fecha: ${new Date().toLocaleDateString('es-VE')}\n`;
  mensaje += `👤 Cliente: ${pedido.cliente?.nombre || 'Cliente'}\n`;

  mensaje += `\n📋 *DETALLE DEL PEDIDO:*\n`;
  pedido.items.forEach(item => {
    mensaje += `▫️ ${item.cantidad}x ${item.descripcion}\n`;
  });

  mensaje += `\n💵 *RESUMEN FINANCIERO:*\n`;
  mensaje += `*TOTAL: $${totalUsd.toFixed(2)}*\n`;

  if (pedido.pagado) {
    mensaje += `✅ *PAGADO COMPLETO*\n`;
  } else {
    if (montoAnticipo > 0) {
      mensaje += `💰 Abonado: $${montoAnticipo.toFixed(2)}\n`;
    }
    mensaje += `🔴 *PENDIENTE: $${montoPendiente.toFixed(2)}*\n`;
  }

  // Agregar detalle de pagos realizados
  if (pedido.pagos && pedido.pagos.length > 0) {
    mensaje += `\n💳 *PAGOS REALIZADOS:*\n`;
    pedido.pagos.forEach(p => {
      const moneda = p.moneda === 'bs' ? 'Bs' : '$';
      mensaje += `▫️ ${p.metodo.replace(/_/g, ' ').toUpperCase()}: ${moneda} ${parseFloat(p.monto).toFixed(2)}\n`;
    });
  }

  if (pedido.observaciones) {
    mensaje += `\n📝 Nota: ${pedido.observaciones}\n`;
  }

  mensaje += `\nGracias por su compra en Electro Shop Morandin! 🚀`;

  return encodeURIComponent(mensaje);
};

// ==========================================
// 🆕 IMPLEMENTACIONES FINALES Y CORREGIDAS
// ==========================================

// 🆕 GENERAR HTML PARA PEDIDOS (TÉRMICA 80MM) - VERSIÓN FINAL
export const generarReciboPedidoHTML = (pedido, tasaCambioInput) => {
  const tasaCambio = parseFloat(tasaCambioInput || 0);
  const fechaActual = new Date(pedido.fecha || Date.now()).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Cálculos de montos
  const totalUsd = parseFloat(pedido.totalUsd || 0);
  const montoAnticipo = parseFloat(pedido.montoAnticipo || 0);
  const montoPendiente = parseFloat(pedido.montoPendiente || 0);
  const descuento = parseFloat(pedido.descuento || 0);

  // Determinar estado de pago
  let estadoPago = 'PENDIENTE DE PAGO';
  if (pedido.pagado) estadoPago = 'PAGADO';
  else if (montoAnticipo > 0) estadoPago = 'ANTICIPO';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Pedido #${pedido.numero}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap');
            @page { size: 80mm auto; margin: 0; }
            body {
                width: 80mm;
                font-family: 'Roboto Mono', monospace;
                font-size: 11px;
                line-height: 1.2;
                margin: 0;
                padding: 8px;
                background: white;
                color: #000;
            }
            .center { 
                text-align: center; 
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            }
            .col-left { text-align: left; }
            .col-right { text-align: right; }
            .bold { font-weight: 700; }
            .title { font-size: 14px; font-weight: 700; margin: 4px 0; }
            .subtitle { font-size: 10px; font-weight: 500; }
            .separator { border-top: 1px dashed #000; margin: 4px 0; width: 100%; }
            .thick-separator { border-top: 2px solid #000; margin: 6px 0; width: 100%; }
            .item-row { display: flex; margin: 2px 0; align-items: flex-start; }
            .qty { width: 10%; text-align: center; font-weight: 700; }
            .desc { width: 60%; font-size: 10px; }
            .price { width: 30%; text-align: right; font-weight: 700; }
            .total-section { 
                background: #fff; 
                padding: 4px 0; 
                border-top: 1px solid #000; 
                margin-top: 4px;
            }
            .row { display: flex; justify-content: space-between; }
        </style>
    </head>
    <body>
        <div class="center">
            <img src="/termico.png" alt="Logo" style="width: 60px; height: 60px; margin-bottom: 4px;" onerror="this.style.display='none'" />
            <div class="title">ELECTRO SHOP MORANDIN</div>
            <div class="subtitle">RIF: J-405903333</div>
            <div class="subtitle">PEDIDO DE VENTA</div>
        </div>
        
        <div class="thick-separator"></div>
        
        <div class="row">
            <span class="bold">Nro Pedido:</span>
            <span class="bold">#${pedido.numero}</span>
        </div>
        <div class="row">
            <span>Fecha:</span>
            <span>${fechaActual}</span>
        </div>
        <div class="row">
            <span>Tasa Cambio:</span>
            <span>Bs ${tasaCambio ? tasaCambio.toFixed(2) : '-'}</span>
        </div>
        
        <div class="separator"></div>
        
        <div><span class="bold">Cliente:</span> ${pedido.cliente?.nombre || 'General'}</div>
        ${pedido.cliente?.telefono ? `<div>Tel: ${pedido.cliente.telefono}</div>` : ''}
        <div><span class="bold">Vendedor:</span> ${pedido.usuario?.nombre || 'Sistema'}</div>
        
        <div class="separator"></div>
        
        <div style="display: flex; font-weight: bold; font-size: 10px; margin-bottom: 2px;">
            <div style="width: 10%; text-align: center;">Cant</div>
            <div style="width: 60%;">Descripción</div>
            <div style="width: 30%; text-align: right;">Total</div>
        </div>
        
        ${pedido.items.map(item => `
            <div class="item-row">
                <div class="qty">${item.cantidad}</div>
                <div class="desc">
                    ${item.descripcion}
                    <div style="font-size: 9px; color: #333;">$${parseFloat(item.precioUnitario).toFixed(2)} c/u</div>
                </div>
                <div class="price">$${(item.cantidad * item.precioUnitario).toFixed(2)}</div>
            </div>
        `).join('')}
        
        <div class="thick-separator"></div>
        
        <div class="total-section">
            <div class="row">
                <span>Subtotal USD:</span>
                <span>$${(totalUsd + descuento).toFixed(2)}</span>
            </div>
            ${descuento > 0 ? `
            <div class="row">
                <span>Descuento:</span>
                <span>-$${descuento.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="row bold" style="font-size: 13px; margin: 4px 0;">
                <span>TOTAL:</span>
                <span>$${totalUsd.toFixed(2)}</span>
            </div>
            <div class="row" style="font-size: 11px;">
                <span>En Bolívares:</span>
                <span>Bs. ${(totalUsd * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
            </div>
        </div>
        
        <div class="separator"></div>
        <div class="row bold">
            <span>Estado:</span>
            <span>${estadoPago}</span>
        </div>
        
        ${montoAnticipo > 0 ? `
        <div class="row">
            <span>Abonado:</span>
            <span>$${montoAnticipo.toFixed(2)}</span>
        </div>
        <div class="row bold" style="margin-top: 2px;">
            <span>PENDIENTE:</span>
            <span>$${montoPendiente.toFixed(2)}</span>
        </div>
        ` : ''}
        
        ${pedido.pagos && pedido.pagos.length > 0 ? `
        <div class="separator"></div>
        <div class="bold" style="font-size: 10px;">MÉTODOS DE PAGO:</div>
        ${pedido.pagos.map(p => `
            <div class="row" style="font-size: 9px;">
                <span>${p.metodo ? p.metodo.replace(/_/g, ' ').toUpperCase() : 'PAGO'}:</span>
                <span>${p.moneda === 'bs' ? 'Bs' : '$'} ${parseFloat(p.monto).toFixed(2)}</span>
            </div>
        `).join('')}
        ` : ''}
        
        <div class="center" style="margin-top: 15px; font-size: 10px;">
            *** COMPROBANTE DE PEDIDO ***<br>
            No válido como factura fiscal
        </div>
        
        <script>
            window.onload = function() { window.print(); window.close(); }
        </script>
    </body>
    </html>
  `;
};

// 🆕 GENERAR MENSAJE WHATSAPP DETALLADO - VERSIÓN FINAL
export const generarMensajeWhatsAppPedido = (pedido) => {
  const totalUsd = parseFloat(pedido.totalUsd || 0);
  const montoAnticipo = parseFloat(pedido.montoAnticipo || 0);
  const montoPendiente = parseFloat(pedido.montoPendiente || 0);

  let estadoIcon = '⏳';
  if (pedido.pagado) estadoIcon = '✅';
  else if (montoAnticipo > 0) estadoIcon = '💰';

  let mensaje = `*PEDIDO #${pedido.numero}* ${estadoIcon}\n`;
  mensaje += `📅 Fecha: ${new Date().toLocaleDateString('es-VE')}\n`;
  mensaje += `👤 Cliente: ${pedido.cliente?.nombre || 'Cliente'}\n`;

  mensaje += `\n📋 *DETALLE DEL PEDIDO:*\n`;
  pedido.items.forEach(item => {
    mensaje += `▫️ ${item.cantidad}x ${item.descripcion}\n`;
  });

  mensaje += `\n💵 *RESUMEN FINANCIERO:*\n`;
  mensaje += `*TOTAL: $${totalUsd.toFixed(2)}*\n`;

  if (pedido.pagado) {
    mensaje += `✅ *PAGADO COMPLETO*\n`;
  } else if (montoAnticipo > 0) {
    mensaje += `💰 Abonado: $${montoAnticipo.toFixed(2)}\n`;
    mensaje += `🔴 *PENDIENTE: $${montoPendiente.toFixed(2)}*\n`;
  } else {
    // Caso diferido / pago al final
    mensaje += `🔴 *PENDIENTE DE PAGO*\n`;
  }

  // Agregar detalle de pagos realizados
  if (pedido.pagos && pedido.pagos.length > 0) {
    mensaje += `\n💳 *MÉTODOS DE PAGO:*\n`;
    pedido.pagos.forEach(p => {
      if (p.metodo && p.monto > 0) {
        const moneda = p.moneda === 'bs' ? 'Bs' : '$';
        mensaje += `▫️ ${p.metodo.replace(/_/g, ' ').toUpperCase()}: ${moneda} ${parseFloat(p.monto).toFixed(2)}\n`;
      }
    });
  }

  if (pedido.observaciones) {
    mensaje += `\n📝 Nota: ${pedido.observaciones}\n`;
  }

  mensaje += `\nGracias por su compra en Electro Shop Morandin! 🚀\n`;
  mensaje += `Visítanos en: www.electroshopve.com`;

  return encodeURIComponent(mensaje);
};



//  NUEVO - IMPRIMIR TICKET DE ARQUEO
export const imprimirTicketArqueo = async (data) => {
  try {
    console.log('🖨️ Generando ticket de arqueo 80mm...');

    // Preparar el HTML del ticket de arqueo
    const generarHTMLArqueo = (arqueo) => {
      const fechaImpresion = new Date().toLocaleString('es-VE');
      const { caja, usuario, esperados, reales, diferencias, observaciones, autorizadoPor } = arqueo;

      // Estilos base
      const styles = `
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap');
            body { font-family: 'Roboto Mono', monospace; width: 80mm; margin: 0; padding: 5px; font-size: 11px; color: #000; background: white; }
            .header-logo { text-align: center; margin-bottom: 10px; }
            .header-logo img { width: 60px; height: 60px; }
            .title { font-size: 14px; font-weight: bold; text-align: center; margin: 5px 0; }
            .subtitle { font-size: 11px; text-align: center; margin-bottom: 5px; }
            .separator { border-top: 1px dashed #000; margin: 5px 0; }
            .thick-separator { border-top: 2px solid #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .bold { font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            .table-header { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px; font-size: 10px; display: flex; }
            .col-concept { width: 40%; }
            .col-val { width: 30%; text-align: right; }
            .col-diff { width: 30%; text-align: right; font-weight: bold; }
            .diff-pos { color: #000; }
            .box { border: 1px solid #000; padding: 5px; margin: 5px 0; font-weight: bold; text-align: center; font-size: 12px; }
            .signature-box { margin-top: 30px; border-top: 1px solid #000; text-align: center; padding-top: 5px; width: 80%; margin-left: auto; margin-right: auto; }
        `;

      return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Arqueo #${caja.id}</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="header-logo">
                    <img src="/termico.png" alt="Logo" onerror="this.style.display='none'" />
                    <div class="title">ELECTRO SHOP MORANDIN</div>
                    <div class="subtitle">RIF: J-405903333</div>
                </div>

                <div class="thick-separator"></div>
                <div class="title">COMPROBANTE DE ARQUEO</div>
                <div class="center bold">Caja #${caja.id}</div>
                <div class="center">${fechaImpresion}</div>

                <div class="separator"></div>
                
                <div class="bold">DATOS DE APERTURA DE CAJA:</div>
                <div class="row"><span>Fecha Ap.:</span> <span>${caja.fecha_apertura ? new Date(caja.fecha_apertura).toLocaleString('es-VE') : new Date().toLocaleString('es-VE')}</span></div>
                <div class="row"><span>Apertura:</span> <span class="bold">${caja.usuario?.nombre || caja.usuario_nombre || usuario.nombre}</span></div>
                
                <div class="row" style="margin-top: 4px; font-size: 10px;"><span>Inicial Bs:</span> <span>${formatearVenezolano(caja.monto_inicial_bs || 0)}</span></div>
                <div class="row" style="font-size: 10px;"><span>Inicial USD:</span> <span>$${(parseFloat(caja.monto_inicial_usd || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></div>
                <div class="row" style="font-size: 10px;"><span>Inicial PM:</span> <span>${formatearVenezolano(caja.monto_inicial_pago_movil || 0)}</span></div>
                
                <div class="separator"></div>

                <div class="bold center" style="margin-bottom: 5px;">DETALLE DE CONTEO</div>
                
                <div class="table-header">
                    <div class="col-concept">CONCEPTO</div>
                    <div class="col-val">REAL</div>
                    <div class="col-diff">DIF</div>
                </div>

                <!-- EFECTIVO BS -->
                <div class="row" style="font-size: 10px;">
                    <div class="col-concept">Efectivo Bs</div>
                    <div class="col-val">${formatearVenezolano(reales.efectivo_bs)}</div>
                    <div class="col-diff">${Math.abs(diferencias.bs) < 0.005 ? 'OK' : formatearVenezolano(diferencias.bs)}</div>
                </div>

                <!-- EFECTIVO USD -->
                <div class="row" style="font-size: 10px;">
                    <div class="col-concept">Efectivo USD</div>
                    <div class="col-val">$${reales.efectivo_usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                    <div class="col-diff">${Math.abs(diferencias.usd) < 0.005 ? 'OK' : '$' + diferencias.usd.toFixed(2)}</div>
                </div>

                <!-- PAGO MÓVIL -->
                <div class="row" style="font-size: 10px;">
                    <div class="col-concept">Pago Móvil</div>
                    <div class="col-val">${formatearVenezolano(reales.pago_movil)}</div>
                    <div class="col-diff">${Math.abs(diferencias.pagoMovil) < 0.005 ? 'OK' : formatearVenezolano(diferencias.pagoMovil)}</div>
                </div>

                <div class="thick-separator"></div>

                <div class="bold">RESUMEN DEL SISTEMA:</div>
                <div class="row"><span>Esperado Bs:</span> <span>${formatearVenezolano(esperados.efectivo_bs)}</span></div>
                <div class="row"><span>Esperado USD:</span> <span>$${esperados.efectivo_usd.toFixed(2)}</span></div>
                <div class="row"><span>Esperado PM:</span> <span>${formatearVenezolano(esperados.pago_movil)}</span></div>

                ${(Math.abs(diferencias.bs) > 0.005 || Math.abs(diferencias.usd) > 0.005 || Math.abs(diferencias.pagoMovil) > 0.005) ? `
                    <div class="box">
                        ⚠️ SE REGISTRARON DIFERENCIAS
                    </div>
                    ${autorizadoPor ? `<div class="center" style="font-size: 10px;">Autorizado por: ${autorizadoPor}</div>` : ''}
                ` : `
                    <div class="box" style="border: 1px solid #000;">
                        ✅ ARQUEO PERFECTO
                    </div>
                `}

                ${observaciones ? `
                    <div class="separator"></div>
                    <div class="bold">OBSERVACIONES:</div>
                    <div style="font-size: 10px; text-align: justify;">${observaciones}</div>
                ` : ''}

                <div class="signature-box" style="margin-top: 60px;">
                    Firma Responsable<br>
                    ${usuario.nombre}
                </div>

                <div class="center" style="margin-top: 20px; font-size: 9px;">
                    ElectroCaja Sistema de Control
                </div>
                
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;
    };

    const contenidoHTML = generarHTMLArqueo(data);

    // Abrir ventana
    const ventanaImpresion = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');
    if (!ventanaImpresion) {
      toast.error('Habilite ventanas emergentes para imprimir');
      return;
    }

    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();

    console.log('✅ Ticket de arqueo enviado a impresión');

  } catch (error) {
    console.error('❌ Error imprimiendo arqueo:', error);
    toast.error('Error al generar impresión');
  }
};