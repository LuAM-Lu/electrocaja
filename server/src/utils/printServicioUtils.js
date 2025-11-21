// server/src/utils/printServicioUtils.js
// Utilidades para impresión de tickets de servicios técnicos

const QRCode = require('qrcode');

/**
 * Genera HTML para ticket térmico de servicio técnico
 * Similar al ticket de ventas pero adaptado para servicios
 * @param {Object} servicio - Datos del servicio
 * @param {Object} usuario - Usuario que atendió
 * @param {string} linkSeguimiento - Link de seguimiento público
 * @param {string} qrBase64 - QR code en base64 (opcional)
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 */
const generarHTMLTicketServicio = (servicio, usuario, linkSeguimiento, qrBase64 = null, tasaCambio = 37.50, esReimpresion = false, numeroReimpresion = 0) => {
  const fechaActual = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const fechaEntrega = servicio.fechaEntregaEstimada 
    ? new Date(servicio.fechaEntregaEstimada).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '—';

  const problemas = Array.isArray(servicio.problemas) 
    ? servicio.problemas.join(', ')
    : servicio.problemas || '—';

  const items = servicio.items || [];
  const totalEstimado = parseFloat(servicio.totalEstimado || 0);
  const totalPagado = parseFloat(servicio.totalPagado || 0);
  const saldoPendiente = parseFloat(servicio.saldoPendiente || 0);

  // 🆕 Convertir montos a Bs usando la tasa de cambio
  const tasa = parseFloat(tasaCambio) || 37.50;
  const totalEstimadoBs = totalEstimado * tasa;
  const totalPagadoBs = totalPagado * tasa;
  const saldoPendienteBs = saldoPendiente * tasa;

  // Formatear números venezolanos (DEBE IR ANTES de usarlo)
  const formatearVenezolano = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Formatear montos en formato dual (Bs + USD) para tickets
  const formatearDual = (valorBs) => {
    const valorUsd = valorBs / tasa;
    return `${formatearVenezolano(valorBs)} Bs <span style="font-size: 8px; color: #000;">($${valorUsd.toFixed(2)})</span>`;
  };

  // 🆕 Obtener métodos de pago del pago inicial (si existe)
  let metodosPago = '';
  if (servicio.pagos && servicio.pagos.length > 0) {
    // Buscar el pago inicial
    const pagoInicial = servicio.pagos.find(p => p.tipo === 'PAGO_INICIAL');
    if (pagoInicial && Array.isArray(pagoInicial.pagos)) {
      const nombresMetodos = {
        'efectivo_bs': 'Efectivo Bs',
        'efectivo_usd': 'Efectivo USD',
        'pago_movil': 'Pago Móvil',
        'transferencia': 'Transferencia',
        'zelle': 'Zelle',
        'binance': 'Binance',
        'tarjeta': 'Tarjeta'
      };

      metodosPago = pagoInicial.pagos.map(p => {
        const metodo = p.metodo || '';
        const monto = parseFloat(p.monto || 0);
        const moneda = p.moneda || 'bs';

        // Mostrar monto en la moneda original del método de pago
        if (moneda === 'usd') {
          return `${nombresMetodos[metodo] || metodo}: $${monto.toFixed(2)} USD`;
        } else {
          return `${nombresMetodos[metodo] || metodo}: ${formatearVenezolano(monto)} Bs`;
        }
      }).join('<br>');
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Orden de Servicio #${servicio.numeroServicio}</title>
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
                font-family: 'Roboto Mono', 'Courier New', monospace;
                font-size: 11px;
                line-height: 1.2;
                margin: 0;
                padding: 8px;
                width: 302px;
                max-width: 80mm;
                background: white;
                color: #000 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            * {
                color: #000 !important;
            }
            
            .header-logo {
                text-align: center;
                margin-bottom: 8px;
                color: #000 !important;
            }
            
            .header-logo img {
                width: 80px;
                height: 80px;
                border-radius: 4px;
                margin-bottom: 4px;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
            }
            
            .center { 
                text-align: center;
                color: #000 !important;
            }
            .left { 
                text-align: left;
                color: #000 !important;
            }
            .right { 
                text-align: right;
                color: #000 !important;
            }
            .bold { 
                font-weight: 600;
                color: #000 !important;
            }
            
            .title { 
                font-size: 13px; 
                font-weight: 700;
                margin: 4px 0;
                letter-spacing: -0.5px;
                color: #000 !important;
            }
            
            .subtitle { 
                font-size: 10px; 
                font-weight: 500;
                margin: 2px 0;
                color: #000 !important;
            }
            
            .normal { 
                font-size: 9px; 
                font-weight: 400;
                margin: 1px 0;
                color: #000 !important;
            }
            
            .separator { 
                border-top: 1px dashed #000 !important; 
                margin: 4px 0; 
                width: 100%;
                color: #000 !important;
            }
            
            .thick-separator { 
                border-top: 2px solid #000 !important; 
                margin: 6px 0; 
                width: 100%;
                color: #000 !important;
            }
            
            .info-line {
                margin: 1px 0;
                font-size: 11px;
                color: #000 !important;
            }
            
            .item-row {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
                font-size: 10px;
                color: #000 !important;
            }
            
            .item-desc {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 180px;
                color: #000 !important;
            }
            
            .item-total {
                text-align: right;
                min-width: 60px;
                font-weight: 500;
                color: #000 !important;
            }
            
            .total-section {
                background: #fff !important;
                padding: 6px;
                border-radius: 2px;
                margin: 6px 0;
                border: 1px solid #000;
                color: #000 !important;
            }
            
            .total-amount {
                font-size: 12px;
                font-weight: 700;
                color: #000 !important;
            }
            
            .qr-container {
                text-align: center;
                margin: 10px 0;
                padding: 8px;
                border: 1px dashed #000 !important;
                color: #000 !important;
            }
            
            .qr-container img {
                max-width: 150px;
                height: auto;
                border: 1px solid #000;
            }
            
            .footer-disclaimer {
                text-align: center;
                font-style: italic;
                font-size: 10px;
                margin-top: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #000 !important;
            }
        </style>
    </head>
    <body>
        <!-- HEADER CON LOGO -->
        <div class="header-logo" style="color: #000;">
            <img src="/termico.png" alt="Logo Electro Caja" onerror="this.style.display='none'" />
            <div class="title center" style="color: #000;">ELECTRO SHOP MORANDIN C.A.</div>
            <div class="normal center" style="color: #000;">RIF: J-405903333</div>
            <div class="subtitle center" style="color: #000;">Carrera 5ta, frente a la plaza Miranda</div>
            <div class="subtitle center" style="color: #000;">Instagram: @electroshopgre- WA +582572511282</div>
        </div>
        
        <div class="thick-separator"></div>
        
        <!-- INFORMACIÓN DE LA ORDEN -->
        <div class="title bold center" style="color: #000;">ORDEN DE SERVICIO #${servicio.numeroServicio}</div>
        <div class="info-line" style="color: #000;">Fecha: ${fechaActual}</div>
        <div class="info-line" style="color: #000;">Atendido por: ${usuario?.nombre || 'Sistema'}</div>
        
        <div class="separator"></div>
        
        <!-- CLIENTE Y DISPOSITIVO (OPTIMIZADO EN UNA FILA) -->
        <div style="display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; color: #000;">
            <div style="flex: 1; color: #000;">
                <div class="subtitle bold" style="color: #000;">CLIENTE:</div>
                <div class="info-line" style="font-size: 9px; color: #000;">${servicio.clienteNombre || '—'}</div>
                <div class="info-line" style="font-size: 8px; color: #000;">${servicio.clienteCedulaRif || '—'}</div>
                ${servicio.clienteTelefono ? `<div class="info-line" style="font-size: 8px; color: #000;">Tel: ${servicio.clienteTelefono}</div>` : ''}
            </div>
            <div style="flex: 1; margin-left: 8px; color: #000;">
                <div class="subtitle bold" style="color: #000;">DISPOSITIVO:</div>
                <div class="info-line" style="font-size: 9px; color: #000;">${servicio.dispositivoMarca} ${servicio.dispositivoModelo}</div>
                ${servicio.dispositivoColor ? `<div class="info-line" style="font-size: 8px; color: #000;">Color: ${servicio.dispositivoColor}</div>` : ''}
                <div class="info-line" style="font-size: 8px; color: #000;">IMEI: ${servicio.dispositivoImei || 'N/A'}</div>
            </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- PROBLEMAS REPORTADOS -->
        <div class="subtitle bold" style="color: #000;">PROBLEMAS REPORTADOS:</div>
        <div class="normal" style="margin: 4px 0; color: #000;">${problemas}</div>
        
        <div class="separator"></div>
        
        <!-- ITEMS/PRODUCTOS -->
        ${items.length > 0 ? `
        <div class="subtitle bold" style="color: #000;">PRODUCTOS/SERVICIOS:</div>
        <div style="display: flex; font-weight: bold; font-size: 10px; margin-bottom: 4px; color: #000;">
            <div style="width: 10%; text-align: center; color: #000;">Cant</div>
            <div style="width: 60%; text-align: left; color: #000;">Descripción</div>
            <div style="width: 30%; text-align: right; color: #000;">Subtotal</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 2px 0;"></div>
        ${items.map(item => {
          const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || item.precio || 0);
          const cantidad = parseFloat(item.cantidad || 0);
          const subtotal = precioUnitario * cantidad;
          const subtotalBs = subtotal * tasa;
          return `
            <div class="item-row" style="color: #000;">
                <div style="width: 10%; text-align: center; font-weight: 700; color: #000;">${cantidad}</div>
                <div style="width: 60%; text-align: left; color: #000;">
                    ${item.descripcion}
                </div>
                <div style="width: 30%; text-align: right; font-weight: 700; color: #000;">
                    ${formatearDual(subtotalBs)}
                </div>
            </div>
        `;
        }).join('')}
        <div class="separator"></div>
        ` : ''}
        
        <!-- TOTALES -->
        <div class="total-section" style="color: #000;">
            <div class="center normal" style="color: #000;">Total Estimado: ${formatearDual(totalEstimadoBs)}</div>
            ${totalPagado > 0 ? `
                <div class="center normal" style="color: #000;">Pago Inicial: ${formatearDual(totalPagadoBs)}</div>
                ${metodosPago ? `
                    <div class="separator" style="margin: 4px 0; border-top: 1px dashed #000;"></div>
                    <div class="subtitle bold center" style="color: #000; margin-top: 4px;">Métodos de Pago:</div>
                    <div class="normal center" style="color: #000; margin: 4px 0;">${metodosPago}</div>
                ` : ''}
            ` : ''}
            ${saldoPendiente > 0 ? `
                <div class="separator" style="margin: 4px 0; border-top: 1px dashed #000;"></div>
                <div class="center normal" style="color: #000;">Saldo Pendiente: ${formatearDual(saldoPendienteBs)}</div>
            ` : ''}
            <div class="separator" style="margin: 4px 0; border-top: 1px dashed #000;"></div>
            <div class="center normal" style="font-size: 8px; margin-top: 4px; color: #000;">
                Tasa de Cambio: ${formatearVenezolano(tasa)} Bs/USD
            </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- TÉCNICO ASIGNADO Y FECHA ESTIMADA (EN UNA FILA) -->
        <div style="display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; color: #000;">
            <div style="flex: 1; color: #000;">
                <div class="subtitle bold" style="color: #000;">TÉCNICO:</div>
                <div class="info-line" style="font-size: 9px; color: #000;">${servicio.tecnicoAsignado || 'Sin asignar'}</div>
            </div>
            <div style="flex: 1; margin-left: 8px; color: #000;">
                <div class="subtitle bold" style="color: #000;">ENTREGA:</div>
                <div class="info-line" style="font-size: 9px; color: #000;">${fechaEntrega}</div>
            </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- QR CODE PARA SEGUIMIENTO -->
        ${linkSeguimiento ? `
        <div class="qr-container" style="color: #000;">
            <div class="subtitle bold" style="color: #000;">ESCANEA PARA SEGUIMIENTO:</div>
            ${qrBase64 ? `
                <img src="${qrBase64}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block; border: 1px solid #000;" />
            ` : `
                <div id="qr-code-placeholder" style="margin: 10px 0; text-align: center; color: #000;">
                    <div class="normal" style="color: #000;">Código QR no disponible</div>
                </div>
            `}
        </div>
        ` : ''}
        
        <div class="separator"></div>
        
        <!-- FOOTER -->
        <div class="subtitle center" style="color: #000;">Conserve este ticket${esReimpresion && numeroReimpresion > 0 ? ` - COPIA #${numeroReimpresion}` : ''}</div>
        <div class="subtitle center" style="color: #000;">Gracias por su confianza</div>
        <div class="footer-disclaimer" style="color: #000;">
            NO REPRESENTA UN DOCUMENTO FISCAL
        </div>
        
        <br><br><br>
    </body>
    </html>
  `;
};

/**
 * Genera HTML para ticket interno simple (uso interno en la tienda)
 * Mínimo papel posible - solo número de orden grande y info esencial
 */
const generarHTMLTicketInterno = (servicio) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Ticket Interno #${servicio.numeroServicio}</title>
        <style>
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
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.1;
                margin: 0;
                padding: 4px;
                width: 302px;
                max-width: 80mm;
                background: white;
                color: #000;
                text-align: center;
            }
            
            .numero-orden {
                font-size: 32px;
                font-weight: 900;
                margin: 8px 0;
                letter-spacing: 2px;
            }
            
            .info-minima {
                font-size: 10px;
                margin: 4px 0;
            }
            
            .separator {
                border-top: 1px dashed #000;
                margin: 4px 0;
            }
        </style>
    </head>
    <body>
        <div class="numero-orden">#${servicio.numeroServicio}</div>
        <div class="separator"></div>
        <div class="info-minima">${servicio.clienteNombre || '—'}</div>
        <div class="info-minima">${servicio.dispositivoMarca} ${servicio.dispositivoModelo}</div>
        ${servicio.tecnicoAsignado ? `<div class="info-minima">Técnico: ${servicio.tecnicoAsignado}</div>` : ''}
        <div class="info-minima">${new Date(servicio.fechaEntregaEstimada || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        <br>
    </body>
    </html>
  `;
};

/**
 * Genera código QR como base64
 */
const generarQRBase64 = async (linkSeguimiento) => {
  try {
    const qrDataURL = await QRCode.toDataURL(linkSeguimiento, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataURL;
  } catch (error) {
    console.error('Error generando QR:', error);
    return null;
  }
};

/**
 * Genera HTML para ticket de abono (solo información financiera)
 * @param {Object} servicio - Datos del servicio
 * @param {Object} pagoData - Datos del abono registrado
 * @param {string} linkSeguimiento - Link de seguimiento público
 * @param {string} qrBase64 - QR code en base64
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 */
const generarHTMLTicketAbono = (servicio, pagoData, linkSeguimiento, qrBase64 = null, tasaCambio = 37.50) => {
  const fechaActual = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalEstimado = parseFloat(servicio.totalEstimado || 0);
  const totalPagado = parseFloat(servicio.totalPagado || 0);
  const saldoPendiente = parseFloat(servicio.saldoPendiente || 0);

  // Convertir montos a Bs
  const tasa = parseFloat(tasaCambio) || 37.50;
  const totalEstimadoBs = totalEstimado * tasa;
  const totalPagadoBs = totalPagado * tasa;
  const saldoPendienteBs = saldoPendiente * tasa;

  // Formatear números venezolanos
  const formatearVenezolano = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Formatear montos en formato dual (Bs + USD) para tickets
  const formatearDual = (valorBs) => {
    const valorUsd = valorBs / tasa;
    return `${formatearVenezolano(valorBs)} Bs <span style="font-size: 8px; color: #000;">($${valorUsd.toFixed(2)})</span>`;
  };

  // Formatear métodos de pago respetando la moneda original
  const metodosPago = Array.isArray(pagoData.pagos) ? pagoData.pagos.map(p => {
    const metodo = p.metodo || '';
    const monto = parseFloat(p.monto || 0);
    const moneda = p.moneda || 'bs';
    
    const nombresMetodos = {
      'efectivo_bs': 'Efectivo Bs',
      'efectivo_usd': 'Efectivo USD',
      'pago_movil': 'Pago Móvil',
      'transferencia': 'Transferencia',
      'zelle': 'Zelle',
      'binance': 'Binance',
      'tarjeta': 'Tarjeta'
    };
    
    // 🆕 Mostrar monto en la moneda original del método de pago
    if (moneda === 'usd') {
      return `${nombresMetodos[metodo] || metodo}: $${monto.toFixed(2)} USD`;
    } else {
      return `${nombresMetodos[metodo] || metodo}: ${formatearVenezolano(monto)} Bs`;
    }
  }).join('\n') : '—';
  
  // 🆕 Calcular monto del abono en ambas monedas para mostrar correctamente
  let montoAbonoBs = 0;
  let montoAbonoUsd = 0;
  
  if (Array.isArray(pagoData.pagos)) {
    pagoData.pagos.forEach(p => {
      const monto = parseFloat(p.monto || 0);
      const moneda = p.moneda || 'bs';
      if (moneda === 'usd') {
        montoAbonoUsd += monto;
        montoAbonoBs += monto * tasa;
      } else {
        montoAbonoBs += monto;
      }
    });
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Comprobante de Abono #${servicio.numeroServicio}</title>
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
                font-family: 'Roboto Mono', 'Courier New', monospace;
                font-size: 11px;
                line-height: 1.2;
                margin: 0;
                padding: 8px;
                width: 302px;
                max-width: 80mm;
                background: white;
                color: #000 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            * {
                color: #000 !important;
            }
            
            .header-logo {
                text-align: center;
                margin-bottom: 8px;
                color: #000 !important;
            }
            
            .header-logo img {
                width: 80px;
                height: 80px;
                border-radius: 4px;
                margin-bottom: 4px;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
            }
            
            .center { 
                text-align: center;
                color: #000 !important;
            }
            .bold { 
                font-weight: 600;
                color: #000 !important;
            }
            
            .title { 
                font-size: 13px; 
                font-weight: 700;
                margin: 4px 0;
                letter-spacing: -0.5px;
                color: #000 !important;
            }
            
            .subtitle { 
                font-size: 10px; 
                font-weight: 500;
                margin: 2px 0;
                color: #000 !important;
            }
            
            .normal { 
                font-size: 9px; 
                font-weight: 400;
                margin: 1px 0;
                color: #000 !important;
            }
            
            .separator { 
                border-top: 1px dashed #000 !important; 
                margin: 4px 0; 
                width: 100%;
                color: #000 !important;
            }
            
            .thick-separator { 
                border-top: 2px solid #000 !important; 
                margin: 6px 0; 
                width: 100%;
                color: #000 !important;
            }
            
            .info-line {
                margin: 1px 0;
                font-size: 11px;
                color: #000 !important;
            }
            
            .total-section {
                background: #fff !important;
                padding: 6px;
                border-radius: 2px;
                margin: 6px 0;
                border: 1px solid #000;
                color: #000 !important;
            }
            
            .total-amount {
                font-size: 12px;
                font-weight: 700;
                color: #000 !important;
            }
            
            .qr-container {
                text-align: center;
                margin: 10px 0;
                padding: 8px;
                border: 1px dashed #000 !important;
                color: #000 !important;
            }
            
            .qr-container img {
                max-width: 150px;
                height: auto;
                border: 1px solid #000;
            }
            
            .footer-disclaimer {
                text-align: center;
                font-style: italic;
                font-size: 10px;
                margin-top: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #000 !important;
            }
        </style>
    </head>
    <body>
        <!-- HEADER CON LOGO -->
        <div class="header-logo" style="color: #000;">
            <img src="/termico.png" alt="Logo Electro Caja" onerror="this.style.display='none'" />
            <div class="title center" style="color: #000;">ELECTRO SHOP MORANDIN C.A.</div>
            <div class="normal center" style="color: #000;">RIF: J-405903333</div>
        </div>
        
        <div class="thick-separator"></div>
        
        <!-- TÍTULO -->
        <div class="title bold center" style="color: #000;">COMPROBANTE DE ABONO</div>
        <div class="title bold center" style="color: #000;">#${servicio.numeroServicio}</div>
        <div class="info-line center" style="color: #000;">Fecha: ${fechaActual}</div>
        
        <div class="separator"></div>
        
        <!-- INFORMACIÓN FINANCIERA -->
        <div class="subtitle bold" style="color: #000;">RESUMEN FINANCIERO:</div>

        <div class="info-line" style="color: #000;">
            <span>Total Estimado:</span>
            <span style="float: right; font-weight: 600;">${formatearDual(totalEstimadoBs)}</span>
        </div>

        <div class="info-line" style="color: #000;">
            <span>Total Pagado:</span>
            <span style="float: right; font-weight: 600;">${formatearDual(totalPagadoBs)}</span>
        </div>
        
        <div class="separator"></div>
        
        <!-- ABONO REGISTRADO -->
        <div class="total-section" style="background: #f0f0f0 !important; border: 2px solid #000;">
            <div class="subtitle bold center" style="color: #000;">ABONO REGISTRADO:</div>
            ${montoAbonoUsd > 0 && montoAbonoBs > 0 
              ? `<div class="total-amount center" style="color: #000;">${formatearVenezolano(montoAbonoBs)} Bs / $${montoAbonoUsd.toFixed(2)} USD</div>`
              : montoAbonoUsd > 0 
                ? `<div class="total-amount center" style="color: #000;">$${montoAbonoUsd.toFixed(2)} USD</div>`
                : `<div class="total-amount center" style="color: #000;">${formatearVenezolano(montoAbonoBs)} Bs</div>`
            }
        </div>
        
        <!-- MÉTODOS DE PAGO -->
        <div class="subtitle bold" style="color: #000; margin-top: 8px;">MÉTODOS DE PAGO:</div>
        <div class="normal" style="color: #000; white-space: pre-line;">${metodosPago}</div>
        
        <div class="separator"></div>
        
        <!-- SALDO PENDIENTE -->
        <div class="info-line" style="color: #000; font-weight: 600;">
            <span>Saldo Pendiente:</span>
            <span style="float: right; font-size: 13px; font-weight: 700;">${formatearDual(saldoPendienteBs)}</span>
        </div>

        <div class="normal center" style="color: #000; margin-top: 4px;">
            Tasa: ${formatearVenezolano(tasa)} Bs/USD
        </div>
        
        <div class="separator"></div>
        
        <!-- QR CODE PARA SEGUIMIENTO -->
        ${linkSeguimiento && qrBase64 ? `
        <div class="qr-container" style="color: #000;">
            <div class="subtitle bold" style="color: #000;">ESCANEA PARA SEGUIMIENTO:</div>
            <img src="${qrBase64}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block; border: 1px solid #000;" />
        </div>
        ` : ''}
        
        <div class="separator"></div>
        
        <!-- FOOTER -->
        <div class="subtitle center" style="color: #000;">Conserve este comprobante</div>
        <div class="subtitle center" style="color: #000;">Gracias por su confianza</div>
        <div class="footer-disclaimer" style="color: #000;">
            NO REPRESENTA UN DOCUMENTO FISCAL
        </div>
        
        <br><br><br>
    </body>
    </html>
  `;
};

module.exports = {
  generarHTMLTicketServicio,
  generarHTMLTicketInterno,
  generarQRBase64,
  generarHTMLTicketAbono
};

