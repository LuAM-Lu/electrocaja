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
    
    img.onload = function() {
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
    </body>
    </html>
  `;
};

//  MANTENER - Impresión térmica (función actual SIN CAMBIOS)
export const imprimirFacturaTermica = async (ventaData, codigoVenta, tasaCambio, descuento = 0) => {
  try {
    console.log(' Generando impresión térmica 80mm optimizada...');
    
    const contenidoHTML = generarHTMLBase(ventaData, codigoVenta, tasaCambio, descuento, 'termica');
    
    //  Configuración optimizada para impresoras térmicas 80mm
    const ventanaImpresion = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');
    
    if (!ventanaImpresion) {
      throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
    }
    
    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
    
    ventanaImpresion.onload = () => {
      setTimeout(() => {
        ventanaImpresion.print();
        setTimeout(() => {
          ventanaImpresion.close();
        }, 1000);
      }, 500);
    };
    
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


export const generarImagenWhatsApp = async (ventaData, codigoVenta, tasaCambio, descuento = 0) => {
  try {
    console.log(' ===== INICIANDO GENERACIÓN IMAGEN WHATSAPP =====');
    console.log(' Usuario en WhatsApp:', ventaData.usuario?.nombre || 'No definido');
    console.log(' ventaData recibida:', ventaData);
    console.log(' codigoVenta:', codigoVenta);
    console.log(' tasaCambio:', tasaCambio);
    console.log(' descuento:', descuento);
    
    //  CREAR IMAGEN MÁS COMPACTA (50% del ancho original)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Dimensiones más compactas para WhatsApp
    canvas.width = 360; //  Reducido de 720 a 360 (50%)
    canvas.height = 1000; // Altura inicial
    
    console.log(' Canvas creado (compacto):', canvas.width, 'x', canvas.height);
    
    // ===== FONDO BLANCO =====
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log(' Fondo blanco aplicado');
    
// ===== HEADER COMPACTO CON LOGO A LA IZQUIERDA =====
const gradient = ctx.createLinearGradient(0, 0, canvas.width, 60); //  Header más compacto (60px en lugar de 100px)
gradient.addColorStop(0, '#3B82F6');
gradient.addColorStop(1, '#1D4ED8');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, 60);
console.log(' Header compacto aplicado');

//  CARGAR Y DIBUJAR LOGO A LA IZQUIERDA
let logoLoaded = false;
try {
  const logoUrl = `${window.location.origin}/android-chrome-512x5129.png`;
  console.log(' Cargando logo desde:', logoUrl);
  
  const logo = await loadImage(logoUrl);
  
  // Dibujar logo a la izquierda del header
  const logoSize = 40; // Tamaño del logo
  const logoX = 15; // Margen izquierdo
  const logoY = 10; // Centrado verticalmente en el header compacto
  
  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  logoLoaded = true;
  console.log(' Logo dibujado a la izquierda');
  
} catch (error) {
  console.log(' No se pudo cargar el logo:', error.message);
  logoLoaded = false;
}

// Texto del header (a la derecha del logo)
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 12px Arial, sans-serif'; //  Fuente ajustada
ctx.textAlign = 'left'; //  Alineado a la izquierda

const textStartX = logoLoaded ? 65 : 15; //  Inicio del texto después del logo + margen
ctx.fillText('ELECTRO SHOP MORANDIN CA', textStartX, 20);

ctx.font = '9px Arial, sans-serif'; //  Fuente más pequeña
ctx.fillText('RIF: J-405903333 - Guanare, Venezuela', textStartX, 33);

ctx.font = '8px Arial, sans-serif';
ctx.fillText('ElectroCaja v1.0', textStartX, 45);

console.log(' Texto del header compacto aplicado');

let yPos = 80; //  Inicio después del header compacto (80px en lugar de 120px)
    
    // ===== INFORMACIÓN DE LA VENTA =====
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial, sans-serif'; //  Fuentes más pequeñas
    ctx.textAlign = 'center';
    ctx.fillText(`COMPROBANTE #${codigoVenta}`, canvas.width / 2, yPos);
    yPos += 20; //  Espacios más compactos
    
    ctx.font = '11px Arial, sans-serif'; //  Fuente más pequeña
    ctx.fillText(`${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`, canvas.width / 2, yPos);
    yPos += 18;
    
    // Cliente
    if (ventaData.cliente && ventaData.cliente.nombre) {
      ctx.fillText(`Cliente: ${ventaData.cliente.nombre}`, canvas.width / 2, yPos);
      yPos += 15;
      if (ventaData.cliente.cedula_rif) {
        ctx.font = '10px Arial, sans-serif';
        ctx.fillText(`CI/RIF: ${ventaData.cliente.cedula_rif}`, canvas.width / 2, yPos);
        yPos += 15;
        ctx.font = '11px Arial, sans-serif';
      }
      console.log(' Cliente aplicado:', ventaData.cliente.nombre);
    }
    
    yPos += 15;
    
    // ===== PRODUCTOS =====
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px Arial, sans-serif'; //  Fuente más pequeña
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCTOS:', 25, yPos); //  Márgenes más pequeños (25 en lugar de 50)
    yPos += 20; //  Espacio más compacto
    
    ctx.font = '10px Arial, sans-serif'; //  Fuente más pequeña para productos
    
    if (ventaData.items && ventaData.items.length > 0) {
      console.log(' Productos a dibujar:', ventaData.items.length);
      
      ventaData.items.forEach((item, index) => {
        const descripcion = `${item.cantidad}× ${item.descripcion}`;
        const precio = (item.cantidad * item.precio_unitario * tasaCambio).toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' Bs';
        
        // Texto a la izquierda (más corto para espacio compacto)
        ctx.textAlign = 'left';
        ctx.fillText(descripcion.substring(0, 25), 25, yPos); //  Márgenes y texto más pequeños
        
        // Precio a la derecha
        ctx.textAlign = 'right';
        ctx.fillText(precio, canvas.width - 25, yPos); //  Margen más pequeño
        
        yPos += 18; //  Espaciado más compacto
        
        console.log(` Producto ${index + 1} dibujado:`, descripcion);
      });
    } else {
      ctx.textAlign = 'center';
      ctx.fillText('Sin productos', canvas.width / 2, yPos);
      yPos += 18;
      console.log(' Sin productos para dibujar');
    }
    
    yPos += 15;
    
    // ===== LÍNEA SEPARADORA =====
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1; //  Línea más fina
    ctx.beginPath();
    ctx.moveTo(25, yPos); //  Márgenes más pequeños
    ctx.lineTo(canvas.width - 25, yPos);
    ctx.stroke();
    yPos += 20;
    
    // ===== CÁLCULOS DE TOTALES =====
    let subtotal = 0;
    if (ventaData.items) {
      subtotal = ventaData.items.reduce((sum, item) => {
        return sum + (item.cantidad * item.precio_unitario);
      }, 0) * tasaCambio;
    }
    
    const totalFinal = subtotal - (descuento || 0);
    
    console.log(' Cálculos:', { subtotal, descuento, totalFinal });
    
    // ===== SUBTOTAL Y DESCUENTO =====
    ctx.fillStyle = '#374151';
    ctx.font = '11px Arial, sans-serif'; //  Fuente más pequeña
    ctx.textAlign = 'left';
    
    ctx.fillText('Subtotal:', 25, yPos);
    ctx.textAlign = 'right';
    ctx.fillText(subtotal.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' Bs', canvas.width - 25, yPos);
    yPos += 18;
    
    //  MOSTRAR DESCUENTO SI EXISTE
    if (descuento > 0) {
      ctx.fillStyle = '#DC2626'; // Rojo para descuento
      ctx.textAlign = 'left';
      ctx.fillText('Descuento:', 25, yPos);
      ctx.textAlign = 'right';
      ctx.fillText('-' + descuento.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' Bs', canvas.width - 25, yPos);
      yPos += 18;
      
      // Mostrar motivo del descuento si existe
      if (ventaData.motivoDescuento) {
        ctx.font = '9px Arial, sans-serif'; //  Fuente más pequeña
        ctx.fillStyle = '#6B7280';
        ctx.textAlign = 'left';
        ctx.fillText(`Motivo: ${ventaData.motivoDescuento.substring(0, 30)}`, 25, yPos); //  Texto más corto
        yPos += 15;
        ctx.font = '11px Arial, sans-serif';
      }
      
      console.log(' Descuento aplicado:', descuento);
    }
    
    yPos += 10;
    
    // ===== TOTAL FINAL =====
    ctx.fillStyle = '#F0FDF4';
    ctx.fillRect(25, yPos, canvas.width - 50, 60); //  Caja más pequeña y márgenes ajustados
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.strokeRect(25, yPos, canvas.width - 50, 60);
    
    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 20px Arial, sans-serif'; //  Fuente más pequeña
    ctx.textAlign = 'center';
    const totalTexto = totalFinal.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' Bs';
    ctx.fillText(totalTexto, canvas.width / 2, yPos + 25);
    
    ctx.font = '10px Arial, sans-serif'; //  Fuente más pequeña
    ctx.fillText('TOTAL A PAGAR', canvas.width / 2, yPos + 45);
    
    yPos += 80;
    

//  MÉTODOS DE PAGO
if (ventaData.pagos && ventaData.pagos.length > 0) {
  const pagosConMonto = ventaData.pagos.filter(pago => pago.monto && parseFloat(pago.monto) > 0);
  
  if (pagosConMonto.length > 0) {
    yPos += 15;
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MÉTODOS DE PAGO:', 25, yPos);
    yPos += 20;
    
    ctx.font = '10px Arial, sans-serif';
    
    pagosConMonto.forEach((pago, index) => {
      const metodoTexto = pago.metodo.replace('_', ' ').toUpperCase();
      
      //  DETERMINAR MONEDA SEGÚN EL MÉTODO DE PAGO
      let montoTexto;
      const monto = parseFloat(pago.monto);
      
      // Métodos en USD
      if (pago.metodo === 'efectivo_usd' || pago.metodo === 'zelle' || pago.metodo === 'binance') {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' $';
      } 
      // Métodos en Bs (por defecto)
      else {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' Bs';
      }
      
      ctx.textAlign = 'left';
      ctx.fillText(`• ${metodoTexto}:`, 25, yPos);
      ctx.textAlign = 'right';
      ctx.fillText(montoTexto, canvas.width - 25, yPos);
      
      yPos += 16;
      
      // Mostrar referencia si existe
      if (pago.referencia && pago.referencia.trim()) {
        ctx.font = '9px Arial, sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.textAlign = 'left';
        ctx.fillText(`  Ref: ${pago.referencia.substring(0, 20)}`, 35, yPos);
        yPos += 14;
        ctx.font = '10px Arial, sans-serif';
        ctx.fillStyle = '#374151';
      }
      
      console.log(` Método de pago ${index + 1}:`, metodoTexto, montoTexto);
    });
    
    yPos += 10;
  }
}

//  VUELTOS (también corregir aquí)
if (ventaData.vueltos && ventaData.vueltos.length > 0) {
  const vueltosConMonto = ventaData.vueltos.filter(vuelto => vuelto.monto && parseFloat(vuelto.monto) > 0);
  
  if (vueltosConMonto.length > 0) {
    yPos += 10;
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('VUELTOS:', 25, yPos);
    yPos += 20;
    
    ctx.font = '10px Arial, sans-serif';
    
    vueltosConMonto.forEach((vuelto, index) => {
      const metodoTexto = vuelto.metodo.replace('_', ' ').toUpperCase();
      
      //  DETERMINAR MONEDA SEGÚN EL MÉTODO DE VUELTO
      let montoTexto;
      const monto = parseFloat(vuelto.monto);
      
      // Métodos en USD
      if (vuelto.metodo === 'efectivo_usd' || vuelto.metodo === 'zelle' || vuelto.metodo === 'binance') {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' $';
      } 
      // Métodos en Bs (por defecto)
      else {
        montoTexto = monto.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + ' Bs';
      }
      
      ctx.textAlign = 'left';
      ctx.fillText(`• ${metodoTexto}:`, 25, yPos);
      ctx.textAlign = 'right';
      ctx.fillText(montoTexto, canvas.width - 25, yPos);
      
      yPos += 16;
      
      console.log(` Vuelto ${index + 1}:`, metodoTexto, montoTexto);
    });
    
    yPos += 10;
  }
}
    
    yPos += 15;
    
    // ===== FOOTER =====
    ctx.fillStyle = '#6B7280';
    ctx.font = '10px Arial, sans-serif'; //  Fuente más pequeña
    ctx.textAlign = 'center';
    ctx.fillText('WhatsApp: +58 257 251 1282', canvas.width / 2, yPos);
    yPos += 15;
    ctx.fillText('Electro Shop Morandín CA', canvas.width / 2, yPos);
    yPos += 15;
    ctx.fillText('¡Gracias por su compra!', canvas.width / 2, yPos);
    
    console.log(' Footer aplicado');
    
    // ===== AJUSTAR ALTURA DEL CANVAS =====
    const finalHeight = yPos + 30; //  Margen final más pequeño
    if (finalHeight !== canvas.height) {
      // Crear nuevo canvas con altura ajustada
      const newCanvas = document.createElement('canvas');
      const newCtx = newCanvas.getContext('2d');
      newCanvas.width = canvas.width;
      newCanvas.height = finalHeight;
      
      // Copiar contenido
      newCtx.drawImage(canvas, 0, 0);
      
      // Usar el nuevo canvas
      const imagenBase64 = newCanvas.toDataURL('image/jpeg', 0.9);
      
      console.log(' Imagen generada con altura ajustada (compacta):', {
        size_kb: Math.round(imagenBase64.length / 1024),
        width: newCanvas.width,
        height: finalHeight,
        total_length: imagenBase64.length
      });
      
      return imagenBase64;
    }
    
    // ===== CONVERTIR A BASE64 =====
    const imagenBase64 = canvas.toDataURL('image/jpeg', 0.9);
    
    console.log(' Imagen generada (compacta):', {
      size_kb: Math.round(imagenBase64.length / 1024),
      width: canvas.width,
      starts_with: imagenBase64.substring(0, 50),
      total_length: imagenBase64.length
    });
    
    //  VERIFICAR QUE NO ESTÁ VACÍA
    if (imagenBase64.length < 1000) {
      throw new Error('Imagen generada está vacía o muy pequeña');
    }
    
    console.log(' ===== IMAGEN WHATSAPP COMPACTA COMPLETADA =====');
    
    return imagenBase64;
    
  } catch (error) {
    console.error(' Error generando imagen para WhatsApp:', error);
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
    
    console.log(' PDF descargado exitosamente');
    
  } catch (error) {
    console.error(' Error descargando PDF:', error);
    throw error;
  }
};