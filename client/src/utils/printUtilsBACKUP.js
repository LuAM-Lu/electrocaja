import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Instagram, MessageCircle } from 'lucide-react';
import { FaInstagram, FaWhatsapp, FaDumbbell } from 'react-icons/fa';

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
    console.log(' Cargando logo desde /favicon-96x96.png...');
    
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
    
    // Usar ruta absoluta desde public
    img.src = '/favicon-96x96.png';
  });
};

//  GENERAR PDF DE FACTURA
export const generarPDFFactura = async (ventaData, codigoVenta, tasaCambio) => {
 const doc = new jsPDF();
 const fechaActual = new Date().toLocaleDateString('es-ES', {
   day: '2-digit',
   month: '2-digit',
   year: 'numeric',
   hour: '2-digit',
   minute: '2-digit'
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
 doc.text('ELECTRO CAJA', 105, logoData ? 50 : 20, { align: 'center' });
 
 doc.setFontSize(12);
 doc.setFont('helvetica', 'normal');
 doc.text('Sistema de Punto de Venta', 105, logoData ? 60 : 30, { align: 'center' });
 doc.text('RIF: J-XXXXXXXX-X', 105, logoData ? 67 : 37, { align: 'center' });

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
 doc.text(`Subtotal: $${ventaData.totalUsd.toFixed(2)} / ${formatearVenezolano(ventaData.totalBs)} Bs`, 120, finalY);
 doc.text(`TOTAL: $${ventaData.totalUsd.toFixed(2)} / ${formatearVenezolano(ventaData.totalBs)} Bs`, 120, finalY + 10);

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

 // Descargar PDF
 doc.save(`Factura_${codigoVenta}_${new Date().getTime()}.pdf`);
};

//  IMPRIMIR EN IMPRESORA TÉRMICA DE FORMA TRADICIONAL
export const imprimirFacturaTermica = async (ventaData, codigoVenta, tasaCambio, descuento = 0) => {
  try {
    console.log(' Generando impresión térmica tradicional...');
    console.log(' printUtils - imprimirFacturaTermica recibió:', { 
      descuento, 
      ventaDataDescuento: ventaData.descuentoAutorizado,
      motivoDescuento: ventaData.motivoDescuento,
      totalBs: ventaData.totalBs 
});
    
    // Generar contenido para impresión térmica
    const fechaActual = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Crear contenido HTML optimizado para impresión térmica 80mm
    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Factura Térmica #${codigoVenta}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 12px;
              line-height: 1.3;
              margin: 0;
              padding: 3mm;
              width: 74mm;
              color: #000;
            }
          }
          
          body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
  padding: 15px;
  padding-right: 30px;
  width: 280px;
  background: white;
  color: #000;
  position: relative;
}
          
          .header-logo {
            text-align: center;
            margin-bottom: 0px;
          }
          
          .header-logo img {
            width: 90px;
            height: 90px;
            border-radius: 8px;
            margin-bottom: 0px;
          }
          
          .center { text-align: center; }
          .left { text-align: left; }
          .right { text-align: right; }
          .bold { font-weight: 600; }
          .semi-bold { font-weight: 500; }
          
          .title { 
            font-size: 14px; 
            font-weight: 700;
            margin: 8px 0;
          }
          
          .subtitle { 
            font-size: 12px; 
            font-weight: 500;
            color: #000;
          }
          
          .normal { 
            font-size: 12px; 
            font-weight: 400;
          }
          
          .separator { 
            border-top: 1px dashed #333; 
            margin: 8px 0; 
            width: 100%;
          }
          
          .thick-separator { 
            border-top: 2px solid #000; 
            margin: 10px 0; 
            width: 100%;
          }
          
          .item-row { 
            display: flex; 
            justify-content: space-between;
            margin: 3px 0;
            align-items: flex-start;
          }
          
          .item-desc {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
            font-size: 12px;
          }
          
          .item-total {
            text-align: right;
            min-width: 80px;
            font-weight: 500;
            font-size: 12px;
          }
          
          .total-section {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
          }
          
          .total-amount {
            font-size: 14px;
            font-weight: 700;
          }
          
          .payment-method {
            font-size: 12px;
            margin: 2px 0;
          }
          
          .footer-disclaimer {
            text-align: center;
            font-style: italic;
            font-weight: 400;
            font-size: 10px;
            color: #666;
            margin-top: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
            .contact-vertical {
              position: absolute;
              right: 12px;
              top: 20px;
              writing-mode: vertical-rl;
              text-orientation: mixed;
              font-size: 12px;
              color: #000;
              line-height: 1.1;
              letter-spacing: 0.5px;
              opacity: 1;
              font-weight: bold;
            }
          
          .no-break { page-break-inside: avoid; }
          
          .info-line {
            margin: 2px 0;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <!-- CONTACTO VERTICAL REPETIDO -->

${[260].map(top => `
  <div class="contact-vertical" style="top: ${top}px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> @electroshopgre 
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.087"/></svg> +582572511282 
  </div>
`).join('')}
        <!-- HEADER CON LOGO -->
        <div class="header-logo">
          <img src="/favicon-96x96.png" alt="Logo Electro Caja" onerror="this.style.display='none'" />
          <div class="title center">ELECTRO SHOP MORANDIN C.A.</div>
          <div class="normal center">RIF: J-405903333</div>
          <div class="subtitle center">ElectroCaja v1.0</div>
          
        </div>
        
        <div class="thick-separator"></div>
        
        <!-- INFORMACIÓN DE LA FACTURA -->
        <div class="title bold">Nro Recibo: #${codigoVenta}</div>
        <div class="info-line">Fecha: ${fechaActual}</div>
        <div class="info-line">Cliente: ${ventaData.cliente?.nombre || 'Sin Cliente'}</div>
        ${ventaData.cliente?.cedula_rif ? `<div class="info-line">CI/RIF: ${ventaData.cliente.cedula_rif}</div>` : ''}
        <div class="info-line">Tasa: ${formatearVenezolano(tasaCambio)} Bs/$ - BCV</div>
        
        <div class="separator"></div>
        
        <!-- PRODUCTOS -->
        <div class="subtitle bold center">PRODUCTOS</div>
        <div class="separator"></div>
        
        ${ventaData.items.map(item => `
          <div class="item-row no-break">
            <div class="item-desc">
              <div class="semi-bold">${item.cantidad}× ${item.descripcion}</div>
              <div style="font-size: 10px; color: #666;">
                ${formatearVenezolano(item.precio_unitario * tasaCambio)} Bs c/u
              </div>
            </div>
            <div class="item-total">${formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs</div>
          </div>
        `).join('')}

        
        <div class="thick-separator"></div>
        
       <!-- TOTAL -->
<div class="total-section">
  ${ventaData.descuentoAutorizado > 0 ? `
    <div class="center normal">Total a Pagar: ${formatearVenezolano(ventaData.totalBs)} Bs</div>
    <div class="center normal" style="color: #d97706;">Descuento: -${formatearVenezolano(ventaData.descuentoAutorizado)} Bs</div>
    ${ventaData.motivoDescuento ? `<div class="center" style="font-size: 10px; color: #000;">${ventaData.motivoDescuento}</div>` : ''}
    <div class="separator"></div>
    <div class="center total-amount">TOTAL PAGADO: ${formatearVenezolano(ventaData.totalBs - ventaData.descuentoAutorizado)} Bs</div>
  ` : `
    <div class="center total-amount">TOTAL A PAGAR: ${formatearVenezolano(ventaData.totalBs)} Bs</div>
  `}
  <div class="center normal">En USD: $${((ventaData.totalBs - (ventaData.descuentoAutorizado || 0)) / tasaCambio).toFixed(2)}</div>
</div>
        
        ${ventaData.pagos.length > 0 ? `
          <div class="separator"></div>
          <div class="subtitle bold">MÉTODOS DE PAGO:</div>
          ${ventaData.pagos.map(pago => {
            if (pago.monto && parseFloat(pago.monto) > 0) {
              const metodo = pago.metodo.replace('_', ' ').toUpperCase();
              return `<div class="payment-method">${metodo}: ${formatearVenezolano(pago.monto)} ${pago.moneda?.toUpperCase() || 'BS'}</div>`;
            }
            return '';
          }).join('')}
        
          <div class="separator"></div>
        ` : ''}
        ${ventaData.vueltos.length > 0 ? `
        
        <div class="subtitle bold">VUELTOS:</div>
        ${ventaData.vueltos.map(vuelto => {
          if (vuelto.monto && parseFloat(vuelto.monto) > 0) {
            const metodo = vuelto.metodo.replace('_', ' ').toUpperCase();
            return `<div class="payment-method">- ${metodo}: ${formatearVenezolano(vuelto.monto)} ${vuelto.moneda?.toUpperCase() || 'BS'}</div>`;
          }
          return '';
        }).join('')}
      ` : ''}
        <div class="separator"></div>
        
        <div class="center normal">Gracias por su compra</div>
        
        <!-- FOOTER DISCLAIMER -->
        <div class="footer-disclaimer">
          NO REPRESENTA UN DOCUMENTO FISCAL
        </div>
        
        <br><br><br>
      </body>
      </html>
    `;
    
    // Abrir nueva ventana para impresión
    const ventanaImpresion = window.open('', '_blank', 'width=350,height=700');
    
    if (!ventanaImpresion) {
      throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
    }
    
    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
    
    // Esperar a que cargue y luego imprimir
    ventanaImpresion.onload = () => {
      setTimeout(() => {
        ventanaImpresion.print();
        // Cerrar ventana después de imprimir
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

//  GENERAR PDF DE RECIBO SIMPLE
export const generarPDFRecibo = async (ventaData, codigoVenta, tasaCambio) => {
 const doc = new jsPDF();
 const fechaActual = new Date().toLocaleDateString('es-ES', {
   day: '2-digit',
   month: '2-digit',
   year: 'numeric',
   hour: '2-digit',
   minute: '2-digit'
 });

 // Cargar logo
 const logoData = await cargarLogo();
 
 // Logo centrado si está disponible
 if (logoData) {
   doc.addImage(logoData, 'PNG', 85, 5, 30, 30);
 }

 // Header más simple
 doc.setFontSize(18);
 doc.setFont('helvetica', 'bold');
 doc.text('RECIBO DE VENTA', 105, logoData ? 45 : 20, { align: 'center' });
 
 doc.setFontSize(14);
 doc.text(`#${codigoVenta}`, 105, logoData ? 60 : 35, { align: 'center' });
 
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.text(`Fecha: ${fechaActual}`, 105, logoData ? 70 : 45, { align: 'center' });

 // Cliente
 const startY = logoData ? 85 : 60;
 doc.setFont('helvetica', 'bold');
 doc.text('Cliente:', 20, startY);
 doc.setFont('helvetica', 'normal');
 doc.text(`${ventaData.cliente?.nombre || 'Cliente Directo'}`, 45, startY);

 // Items de forma simplificada
 doc.setFont('helvetica', 'bold');
 doc.text('Productos:', 20, startY + 15);
 
 let yPos = startY + 25;
 ventaData.items.forEach(item => {
   doc.setFont('helvetica', 'normal');
   doc.text(`${item.cantidad}× ${item.descripcion}`, 25, yPos);
   doc.text(`${formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs`, 150, yPos);
   yPos += 10;
 });

 // Total
 yPos += 10;
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(14);
 doc.text(`TOTAL: ${formatearVenezolano(ventaData.totalBs)} Bs`, 105, yPos, { align: 'center' });

 // Descargar
 doc.save(`Recibo_${codigoVenta}_${new Date().getTime()}.pdf`);
};