// client/src/utils/presupuestoUtils.js - UTILIDADES COMPLETAS PARA PRESUPUESTOS
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import toast from './toast.jsx';
import api from '../config/api';

// FUNCIÓN PARA FORMATEAR NÚMEROS VENEZOLANOS
const formatearVenezolano = (valor) => {
 if (!valor && valor !== 0) return '';
 const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
 return numero.toLocaleString('es-ES', {
   minimumFractionDigits: 2,
   maximumFractionDigits: 2
 });
};

// FUNCIÓN PARA CARGAR LOGO
const cargarLogo = () => {
 return new Promise((resolve) => {
   console.log('Cargando logo para presupuesto...');
   
   const img = new Image();
   
   img.onload = function() {
     console.log('Logo cargado exitosamente');
     try {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       canvas.width = 120;
       canvas.height = 120;
       ctx.drawImage(img, 0, 0, 120, 120);
       const dataUrl = canvas.toDataURL('image/png');
       resolve(dataUrl);
     } catch (error) {
       console.error('Error procesando logo:', error);
       resolve(null);
     }
   };
   
   img.onerror = (error) => {
     console.error('Error cargando logo:', error);
     resolve(null);
   };
   
   img.src = '/android-chrome-512x5129.png';
 });
};

// CALCULAR TOTALES DEL PRESUPUESTO
const calcularTotales = (presupuestoData, tasaCambio) => {
 const subtotal = presupuestoData.items.reduce((sum, item) => {
   return sum + (item.cantidad * item.precio_unitario);
 }, 0);

 const descuentoGlobal = presupuestoData.descuentoGlobal || 0;
 const tipoDescuento = presupuestoData.tipoDescuento || 'porcentaje';
 const impuesto = presupuestoData.impuestos || 16;

 let descuentoUsd;
 if (tipoDescuento === 'porcentaje') {
   descuentoUsd = (subtotal * descuentoGlobal) / 100;
 } else {
   descuentoUsd = descuentoGlobal / tasaCambio;
 }
 
 const baseImponible = subtotal - descuentoUsd;
 const ivaUsd = (baseImponible * impuesto) / 100;
 const totalUsd = baseImponible + ivaUsd;
 const totalBs = totalUsd * tasaCambio;

 return {
   subtotal,
   descuentoUsd,
   descuentoBs: descuentoUsd * tasaCambio,
   baseImponible,
   ivaUsd,
   ivaBs: ivaUsd * tasaCambio,
   totalUsd,
   totalBs,
   impuesto,
   tipoDescuento,
   descuentoGlobal
 };
};

// GENERAR PDF DE PRESUPUESTO MODERNO Y PROFESIONAL
export const generarPDFPresupuesto = async (presupuestoData, tasaCambio) => {
 try {
   console.log('Generando PDF de presupuesto moderno...', presupuestoData.numero);
   
   const doc = new jsPDF('p', 'mm', 'a4');
   const pageWidth = doc.internal.pageSize.getWidth();
   const pageHeight = doc.internal.pageSize.getHeight();
   
   const logoData = await cargarLogo();
   const totales = calcularTotales(presupuestoData, tasaCambio);
   
   const fechaActual = new Date().toLocaleDateString('es-ES', {
     day: '2-digit',
     month: '2-digit',
     year: 'numeric'
   });

   // HEADER COMPACTO Y ELEGANTE
   // Gradiente de fondo
   doc.setFillColor(15, 23, 42);
   doc.rect(0, 0, pageWidth, 35, 'F');
   
   doc.setFillColor(30, 41, 59);
   doc.rect(0, 0, pageWidth, 25, 'F');
   
   // Línea dorada elegante
   doc.setFillColor(234, 179, 8);
   doc.rect(0, 32, pageWidth, 3, 'F');
   
   // Logo de alta calidad - más grande
   if (logoData) {
     doc.addImage(logoData, 'PNG', 12, 5, 25, 25);
   }
   
   // Información de empresa - compacta y elegante
   doc.setTextColor(255, 255, 255);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(16);
   doc.text('ELECTRO SHOP MORANDIN C.A.', logoData ? 45 : 15, 15);
   
   doc.setFontSize(8);
   doc.setFont('helvetica', 'normal');
   doc.text('RIF: J-405903333 | Especialistas en Tecnologia', logoData ? 45 : 15, 22);
   doc.text('Carrera 5ta, frente a la plaza Miranda | WhatsApp: +58 2572511282', logoData ? 45 : 15, 24);
   
   // Información de contacto compacta
   doc.setFontSize(7);
   //doc.text('Carrera 5ta, frente a la plaza Miranda | WhatsApp: +58 2572511282', pageWidth - 5, 12, { align: 'right' });
   doc.text('electroshopgre@gmail.com | @electroshopgre', pageWidth - 5, 18, { align: 'right' });

   let yPos = 50;
   
   // TÍTULO COMPACTO DEL PRESUPUESTO
   doc.setFillColor(248, 250, 252);
   doc.rect(15, yPos - 3, pageWidth - 30, 18, 'F');
   
   // Línea lateral dorada
   doc.setFillColor(234, 179, 8);
   doc.rect(15, yPos - 3, 4, 18, 'F');
   
   doc.setTextColor(15, 23, 42);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(16);
   doc.text(`PRESUPUESTO ${presupuestoData.numero}`, 25, yPos + 6);
   
   // Fechas compactas
   doc.setFontSize(8);
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(71, 85, 105);
   doc.text(`Fecha: ${fechaActual} | Valido hasta: ${new Date(presupuestoData.fechaVencimiento).toLocaleDateString('es-ES')}`, pageWidth - 5, yPos + 6, { align: 'right' });
   
   yPos += 25;

   // INFORMACIÓN DEL CLIENTE CON DISEÑO ELEGANTE
   if (presupuestoData.cliente) {
     doc.setFillColor(239, 246, 255);
     doc.rect(15, yPos, pageWidth - 30, 25, 'F');
     
     doc.setFillColor(59, 130, 246);
     doc.rect(15, yPos, 3, 25, 'F');
     
     doc.setTextColor(30, 64, 175);
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(11);
     doc.text('CLIENTE', 25, yPos + 6);
     
     doc.setTextColor(51, 65, 85);
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(9);
     
     doc.setFont('helvetica', 'bold');
     doc.text('Nombre:', 25, yPos + 14);
     doc.setFont('helvetica', 'normal');
     doc.text(presupuestoData.cliente.nombre, 50, yPos + 14);
     
     if (presupuestoData.cliente.cedula_rif) {
       doc.setFont('helvetica', 'bold');
       doc.text('CI/RIF:', 25, yPos + 20);
       doc.setFont('helvetica', 'normal');
       doc.text(presupuestoData.cliente.cedula_rif, 50, yPos + 20);
     }
     
     if (presupuestoData.cliente.telefono) {
       doc.setFont('helvetica', 'bold');
       doc.text('Telefono:', pageWidth/2 + 10, yPos + 14);
       doc.setFont('helvetica', 'normal');
       doc.text(presupuestoData.cliente.telefono, pageWidth/2 + 30, yPos + 14);
     }
     
     if (presupuestoData.cliente.email) {
       doc.setFont('helvetica', 'bold');
       doc.text('Email:', pageWidth/2 + 10, yPos + 20);
       doc.setFont('helvetica', 'normal');
       doc.text(presupuestoData.cliente.email, pageWidth/2 + 25, yPos + 20);
     }
     
     yPos += 35;
   }

   // TABLA DE PRODUCTOS - PROTAGONISTA DEL DISEÑO
   let tableY = yPos;

   // Header de tabla con gradiente elegante
   doc.setFillColor(15, 23, 42);
   doc.rect(15, tableY, pageWidth - 30, 12, 'F');
   
   doc.setFillColor(30, 41, 59);
   doc.rect(15, tableY, pageWidth - 30, 8, 'F');

   doc.setTextColor(255, 255, 255);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(8);

   // Columnas optimizadas para protagonismo de productos
   const cols = {
     num: 20,
     cant: 32,
     desc: 45,
     pUnitUsd: 118,
     pUnitBs: 138,
     totalUsd: 163,
     totalBs: 183
   };

   doc.text('#', cols.num, tableY + 7);
   doc.text('Cant.', cols.cant, tableY + 7);
   doc.text('PRODUCTO / SERVICIO', cols.desc, tableY + 7);
   doc.text('P.Unit $', cols.pUnitUsd, tableY + 7);
   doc.text('P.Unit Bs', cols.pUnitBs, tableY + 7);
   doc.text('Total $', cols.totalUsd, tableY + 7);
   doc.text('Total Bs', cols.totalBs, tableY + 7);

   tableY += 12;

   // Filas de productos con alternancia elegante
   doc.setTextColor(51, 65, 85);
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(8);

   presupuestoData.items.forEach((item, index) => {
     // Alternancia de colores elegante
     if (index % 2 === 0) {
       doc.setFillColor(250, 251, 252);
       doc.rect(15, tableY, pageWidth - 30, 10, 'F');
     } else {
       doc.setFillColor(248, 250, 252);
       doc.rect(15, tableY, pageWidth - 30, 10, 'F');
     }
     
     // Línea sutil entre filas
     doc.setDrawColor(226, 232, 240);
     doc.setLineWidth(0.2);
     doc.line(15, tableY + 10, pageWidth - 15, tableY + 10);
     
     doc.setTextColor(51, 65, 85);
     doc.text((index + 1).toString(), cols.num, tableY + 6);
     doc.text(item.cantidad.toString(), cols.cant + 5, tableY + 6, { align: 'center' });
     
     // Descripción destacada (protagonista)
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(8);
     const descripcion = item.descripcion.length > 42 
       ? item.descripcion.substring(0, 39) + '...'
       : item.descripcion;
     doc.text(descripcion, cols.desc, tableY + 6);
     
     // Precios con formato elegante
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(7);
     doc.text(`$${item.precio_unitario.toFixed(2)}`, cols.pUnitUsd + 12, tableY + 6, { align: 'right' });
     doc.text(`${formatearVenezolano(item.precio_unitario * tasaCambio)}`, cols.pUnitBs + 15, tableY + 6, { align: 'right' });
     doc.text(`$${(item.cantidad * item.precio_unitario).toFixed(2)}`, cols.totalUsd + 12, tableY + 6, { align: 'right' });
     
     // Total en destacado
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(8);
     doc.text(`${formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)}`, cols.totalBs + 15, tableY + 6, { align: 'right' });
     
     tableY += 10;
   });

   // Línea final de la tabla
   doc.setDrawColor(15, 23, 42);
   doc.setLineWidth(1);
   doc.line(15, tableY, pageWidth - 15, tableY);

   yPos = tableY + 20;

   // SECCIÓN DE TOTALES CON GRADIENTE ELEGANTE
   const totalBoxHeight = 45;
   
   // Fondo con gradiente simulado
   doc.setFillColor(236, 253, 245);
   doc.rect(pageWidth/2 + 5, yPos, pageWidth/2 - 20, totalBoxHeight, 'F');
   
   doc.setFillColor(220, 252, 231);
   doc.rect(pageWidth/2 + 5, yPos, pageWidth/2 - 20, 8, 'F');
   
   // Borde elegante
   doc.setDrawColor(16, 185, 129);
   doc.setLineWidth(1.5);
   doc.rect(pageWidth/2 + 5, yPos, pageWidth/2 - 20, totalBoxHeight);
   
   // Línea lateral dorada
   doc.setFillColor(234, 179, 8);
   doc.rect(pageWidth/2 + 5, yPos, 3, totalBoxHeight, 'F');
   
   doc.setTextColor(6, 78, 59);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(10);
   doc.text('RESUMEN FINANCIERO', pageWidth/2 + 12, yPos + 6);
   
   doc.setTextColor(51, 65, 85);
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(8);
   
   let totalY = yPos + 14;
   doc.text(`Subtotal: ${formatearVenezolano(totales.subtotal * tasaCambio)} Bs`, pageWidth/2 + 12, totalY);
   
   if (totales.descuentoGlobal > 0) {
     totalY += 5;
     doc.setTextColor(185, 28, 28);
     doc.text(`Descuento (${totales.tipoDescuento === 'porcentaje' ? totales.descuentoGlobal + '%' : 'fijo'}): -${formatearVenezolano(totales.descuentoBs)} Bs`, pageWidth/2 + 12, totalY);
     doc.setTextColor(51, 65, 85);
   }
   
   totalY += 5;
   doc.text(`Base Imponible: ${formatearVenezolano(totales.baseImponible * tasaCambio)} Bs`, pageWidth/2 + 12, totalY);
   
   totalY += 5;
   doc.text(`IVA (${totales.impuesto}%): ${formatearVenezolano(totales.ivaBs)} Bs`, pageWidth/2 + 12, totalY);
   
   // Total final destacado
   totalY += 8;
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(11);
   doc.setTextColor(6, 78, 59);
   doc.text(`TOTAL: ${formatearVenezolano(totales.totalBs)} Bs`, pageWidth/2 + 12, totalY);
   
   doc.setFontSize(8);
   doc.setTextColor(75, 85, 99);
   doc.text(`En USD: $${totales.totalUsd.toFixed(2)}`, pageWidth/2 + 12, totalY + 5);

   // OBSERVACIONES CON DISEÑO ELEGANTE
   if (presupuestoData.observaciones && presupuestoData.observaciones.length > 0) {
     yPos += totalBoxHeight + 15;
     
     if (yPos > pageHeight - 60) {
       doc.addPage();
       yPos = 20;
     }
     
     const obsHeight = 8 + (presupuestoData.observaciones.length * 5);
     doc.setFillColor(254, 249, 195);
     doc.rect(15, yPos, pageWidth - 30, obsHeight, 'F');
     
     doc.setFillColor(245, 158, 11);
     doc.rect(15, yPos, 3, obsHeight, 'F');
     
     doc.setTextColor(120, 53, 15);
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(10);
     doc.text('OBSERVACIONES IMPORTANTES', 25, yPos + 6);
     
     doc.setTextColor(92, 38, 6);
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(8);
     
     presupuestoData.observaciones.forEach((obs, index) => {
       doc.text(`• ${obs}`, 25, yPos + 12 + (index * 5));
     });
   }

   // FOOTER ELEGANTE Y COMPACTO
   const footerY = pageHeight - 20;
   
   // Línea decorativa elegante
   doc.setDrawColor(203, 213, 225);
   doc.setLineWidth(0.8);
   doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
   
   doc.setTextColor(100, 116, 139);
   doc.setFont('helvetica', 'italic');
   doc.setFontSize(8);
   doc.text('Este presupuesto es valido hasta la fecha indicada. Terminos y condiciones aplican.', pageWidth/2, footerY, { align: 'center' });
   
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(7);
   doc.text(`Generado por ElectroCaja v1.0 • ${new Date().toLocaleString('es-ES')}`, pageWidth/2, footerY + 5, { align: 'center' });

   const pdfBlob = doc.output('blob');
   console.log('PDF moderno y profesional generado exitosamente');
   return pdfBlob;
   
 } catch (error) {
   console.error('Error generando PDF moderno:', error);
   throw error;
 }
};

// DESCARGAR PDF
export const descargarPDFPresupuesto = async (presupuestoData, tasaCambio) => {
 try {
   const pdfBlob = await generarPDFPresupuesto(presupuestoData, tasaCambio);
   
   const url = URL.createObjectURL(pdfBlob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `Presupuesto_${presupuestoData.numero}_${new Date().getTime()}.pdf`;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
   
   console.log('PDF descargado exitosamente');
   return true;
   
 } catch (error) {
   console.error('Error descargando PDF:', error);
   throw error;
 }
};

// IMPRIMIR PRESUPUESTO - USA EL MISMO PDF
export const imprimirPresupuesto = async (presupuestoData, tasaCambio) => {
 try {
   console.log('Generando impresion de presupuesto...');
   
   const pdfBlob = await generarPDFPresupuesto(presupuestoData, tasaCambio);
   
   // Crear URL del PDF para impresión
   const pdfUrl = URL.createObjectURL(pdfBlob);
   
   // Abrir en ventana para imprimir
   const ventanaImpresion = window.open(pdfUrl, '_blank', 'width=800,height=1000,scrollbars=yes');
   
   if (!ventanaImpresion) {
     throw new Error('No se pudo abrir la ventana de impresion. Verifica que no este bloqueada por el navegador.');
   }
   
   // Esperar a que cargue y luego imprimir
   ventanaImpresion.onload = () => {
     setTimeout(() => {
       ventanaImpresion.print();
       setTimeout(() => {
         ventanaImpresion.close();
         URL.revokeObjectURL(pdfUrl);
       }, 1000);
     }, 1000);
   };
   
   console.log('Ventana de impresion abierta');
   return true;
   
 } catch (error) {
   console.error('Error en impresion:', error);
   throw error;
 }
};

// GENERAR IMAGEN PARA WHATSAPP
export const generarImagenPresupuestoWhatsApp = async (presupuestoData, tasaCambio) => {
 try {
   console.log('Generando imagen de presupuesto para WhatsApp...');
   
   const canvas = document.createElement('canvas');
   const ctx = canvas.getContext('2d');
   const totales = calcularTotales(presupuestoData, tasaCambio);
   
   canvas.width = 360;
   canvas.height = 1000;
   
   // Fondo blanco
   ctx.fillStyle = '#ffffff';
   ctx.fillRect(0, 0, canvas.width, canvas.height);
   
   // Header elegante
   const gradient = ctx.createLinearGradient(0, 0, canvas.width, 80);
   gradient.addColorStop(0, '#0f172a');
   gradient.addColorStop(1, '#1e293b');
   ctx.fillStyle = gradient;
   ctx.fillRect(0, 0, canvas.width, 80);
   
   // Línea dorada
   ctx.fillStyle = '#eab308';
   ctx.fillRect(0, 75, canvas.width, 5);
   
   ctx.fillStyle = '#ffffff';
   ctx.font = 'bold 16px Arial, sans-serif';
   ctx.textAlign = 'center';
   ctx.fillText('PRESUPUESTO', canvas.width / 2, 25);
   ctx.fillText(`#${presupuestoData.numero}`, canvas.width / 2, 45);
   
   ctx.font = '10px Arial, sans-serif';
   ctx.fillText('ELECTRO SHOP MORANDIN C.A.', canvas.width / 2, 65);
   
   let yPos = 100;
   
   // Información del presupuesto
   ctx.fillStyle = '#1f2937';
   ctx.font = '12px Arial, sans-serif';
   ctx.textAlign = 'left';
   
   ctx.fillText(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, yPos);
   yPos += 20;
   ctx.fillText(`Valido hasta: ${new Date(presupuestoData.fechaVencimiento).toLocaleDateString('es-ES')}`, 20, yPos);
   yPos += 25;
   
   // Cliente
   if (presupuestoData.cliente) {
     ctx.font = 'bold 12px Arial, sans-serif';
     ctx.fillText(`CLIENTE: ${presupuestoData.cliente.nombre}`, 20, yPos);
     yPos += 20;
     
     if (presupuestoData.cliente.cedula_rif) {
       ctx.font = '10px Arial, sans-serif';
       ctx.fillText(`CI/RIF: ${presupuestoData.cliente.cedula_rif}`, 20, yPos);
       yPos += 15;
     }
   }
   
   yPos += 20;
   
   // Productos
   ctx.fillStyle = '#374151';
   ctx.font = 'bold 12px Arial, sans-serif';
   ctx.fillText('PRODUCTOS:', 20, yPos);
   yPos += 25;
   
   ctx.font = '10px Arial, sans-serif';
   
   presupuestoData.items.forEach((item) => {
     const descripcion = `${item.cantidad}x ${item.descripcion.substring(0, 25)}`;
     const precio = formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio) + ' Bs';
     
     ctx.textAlign = 'left';
     ctx.fillText(descripcion, 20, yPos);
     
     ctx.textAlign = 'right';
     ctx.fillText(precio, canvas.width - 20, yPos);
     
     yPos += 18;
   });
   
   yPos += 20;
   
   // Línea separadora
   ctx.strokeStyle = '#e5e7eb';
   ctx.lineWidth = 1;
   ctx.beginPath();
   ctx.moveTo(20, yPos);
   ctx.lineTo(canvas.width - 20, yPos);
   ctx.stroke();
   yPos += 25;
   
   // Totales
   ctx.fillStyle = '#374151';
   ctx.font = '11px Arial, sans-serif';
   ctx.textAlign = 'left';
   
   ctx.fillText('Subtotal:', 20, yPos);
   ctx.textAlign = 'right';
   ctx.fillText(formatearVenezolano(totales.subtotal * tasaCambio) + ' Bs', canvas.width - 20, yPos);
   yPos += 18;
   
   if (totales.descuentoGlobal > 0) {
     ctx.fillStyle = '#dc2626';
     ctx.textAlign = 'left';
     ctx.fillText(`Descuento (${totales.tipoDescuento === 'porcentaje' ? totales.descuentoGlobal + '%' : 'fijo'}):`, 20, yPos);
     ctx.textAlign = 'right';
     ctx.fillText('-' + formatearVenezolano(totales.descuentoBs) + ' Bs', canvas.width - 20, yPos);
     yPos += 18;
     ctx.fillStyle = '#374151';
   }
   
   ctx.textAlign = 'left';
   ctx.fillText('Base Imponible:', 20, yPos);
   ctx.textAlign = 'right';
   ctx.fillText(formatearVenezolano(totales.baseImponible * tasaCambio) + ' Bs', canvas.width - 20, yPos);
   yPos += 18;
   
   ctx.textAlign = 'left';
   ctx.fillText(`IVA (${totales.impuesto}%):`, 20, yPos);
   ctx.textAlign = 'right';
   ctx.fillText(formatearVenezolano(totales.ivaBs) + ' Bs', canvas.width - 20, yPos);
   yPos += 25;
   
   // Total final destacado
   ctx.fillStyle = '#ecfdf5';
   ctx.fillRect(20, yPos, canvas.width - 40, 60);
   ctx.strokeStyle = '#10b981';
   ctx.lineWidth = 2;
   ctx.strokeRect(20, yPos, canvas.width - 40, 60);
   
   ctx.fillStyle = '#065f46';
   ctx.font = 'bold 18px Arial, sans-serif';
   ctx.textAlign = 'center';
   ctx.fillText(formatearVenezolano(totales.totalBs) + ' Bs', canvas.width / 2, yPos + 25);
   
   ctx.font = '10px Arial, sans-serif';
   ctx.fillText('TOTAL PRESUPUESTO', canvas.width / 2, yPos + 45);
   
   yPos += 80;
   
   // Observaciones
   if (presupuestoData.observaciones && presupuestoData.observaciones.length > 0) {
     yPos += 15;
     ctx.fillStyle = '#374151';
     ctx.font = 'bold 11px Arial, sans-serif';
     ctx.textAlign = 'left';
     ctx.fillText('OBSERVACIONES:', 20, yPos);
     yPos += 20;
     
     ctx.font = '10px Arial, sans-serif';
     presupuestoData.observaciones.forEach((obs) => {
       ctx.fillText(`• ${obs.substring(0, 40)}`, 25, yPos);
       yPos += 16;
     });
     yPos += 10;
   }
   
   // Footer
   ctx.fillStyle = '#6b7280';
   ctx.font = '10px Arial, sans-serif';
   ctx.textAlign = 'center';
   ctx.fillText('WhatsApp: +58 257 251 1282', canvas.width / 2, yPos);
   yPos += 15;
   ctx.fillText('Gracias por su consulta!', canvas.width / 2, yPos);
   yPos += 15;
   ctx.fillText(`Valido hasta: ${new Date(presupuestoData.fechaVencimiento).toLocaleDateString('es-ES')}`, canvas.width / 2, yPos);
   
   const finalHeight = yPos + 30;
   if (finalHeight !== canvas.height) {
     const newCanvas = document.createElement('canvas');
     const newCtx = newCanvas.getContext('2d');
     newCanvas.width = canvas.width;
     newCanvas.height = finalHeight;
     
     newCtx.drawImage(canvas, 0, 0);
     const imagenBase64 = newCanvas.toDataURL('image/jpeg', 0.9);
     
     console.log('Imagen de presupuesto generada para WhatsApp');
     return imagenBase64;
   }
   
   const imagenBase64 = canvas.toDataURL('image/jpeg', 0.9);
   console.log('Imagen de presupuesto generada para WhatsApp');
   return imagenBase64;
   
 } catch (error) {
   console.error('Error generando imagen para WhatsApp:', error);
   throw error;
 }
};

// ENVIAR PRESUPUESTO POR EMAIL
export const enviarPresupuestoPorEmail = async (presupuestoData, tasaCambio, destinatario) => {
 try {
   console.log('Enviando presupuesto por email...', destinatario);
   
   // Generar PDF
   const pdfBlob = await generarPDFPresupuesto(presupuestoData, tasaCambio);
   
   // Convertir blob a base64
   const reader = new FileReader();
   const pdfBase64 = await new Promise((resolve, reject) => {
     reader.onload = () => {
       const base64 = reader.result.split(',')[1];
       resolve(base64);
     };
     reader.onerror = reject;
     reader.readAsDataURL(pdfBlob);
   });
   
   // Preparar datos para el envio
   const emailData = {
     destinatario: destinatario,
     clienteNombre: presupuestoData.cliente?.nombre || 'Cliente',
     codigoPresupuesto: presupuestoData.numero,
     pdfBase64: pdfBase64,
     asunto: `Presupuesto #${presupuestoData.numero} - Electro Shop Morandin`,
     mensaje: `Estimado(a) cliente, adjunto encontrara su presupuesto solicitado.`
   };
   
   // Usar la instancia de api configurada
   const response = await api.post('/presupuestos/enviar-email', emailData);
   
   console.log('Presupuesto enviado por email exitosamente');
   
   return {
     success: true,
     message: 'Presupuesto enviado por email exitosamente',
     data: response.data.data
   };
   
 } catch (error) {
   console.error('Error enviando presupuesto por email:', error);
   throw error;
 }
};

// ENVIAR PRESUPUESTO POR WHATSAPP
export const enviarPresupuestoPorWhatsApp = async (presupuestoData, tasaCambio, numero, mensaje) => {
 try {
   console.log('Enviando presupuesto por WhatsApp...', numero);
   
   // Generar PDF en lugar de imagen
   const pdfBlob = await generarPDFPresupuesto(presupuestoData, tasaCambio);
   
   // Convertir PDF a base64
   const reader = new FileReader();
   const pdfBase64 = await new Promise((resolve, reject) => {
     reader.onload = () => {
       const base64 = reader.result.split(',')[1];
       resolve(base64);
     };
     reader.onerror = reject;
     reader.readAsDataURL(pdfBlob);
   });
   
   // Preparar mensaje
   const mensajeCompleto = mensaje || 
     `Hola ${presupuestoData.cliente?.nombre || 'Cliente'}!\n\n` +
     `Aqui tienes tu presupuesto #${presupuestoData.numero}\n\n` +
     `Total: ${formatearVenezolano(calcularTotales(presupuestoData, tasaCambio).totalBs)} Bs\n` +
     `Valido hasta: ${new Date(presupuestoData.fechaVencimiento).toLocaleDateString('es-ES')}\n\n` +
     `Te interesa? Contactanos para procesar tu pedido!`;
   
   // Preparar datos para WhatsApp con PDF
   const whatsappData = {
     numero: numero,
     clienteNombre: presupuestoData.cliente?.nombre || 'Cliente',
     codigoPresupuesto: presupuestoData.numero,
     pdfBase64: pdfBase64,
     mensaje: mensajeCompleto,
     nombreArchivo: `Presupuesto_${presupuestoData.numero}.pdf`
   };
   
   // Usar la instancia de api configurada
   const response = await api.post('/presupuestos/enviar-whatsapp', whatsappData);
   
   console.log('Presupuesto enviado por WhatsApp exitosamente');
   
   return {
     success: true,
     message: 'Presupuesto enviado por WhatsApp exitosamente',
     data: response.data.data
   };
   
 } catch (error) {
   console.error('Error enviando presupuesto por WhatsApp:', error);
   throw error;
 }
};

// VALIDAR DATOS DE PRESUPUESTO
export const validarPresupuesto = (presupuestoData) => {
 const errores = [];
 
 if (!presupuestoData.numero) {
   errores.push('Numero de presupuesto requerido');
 }
 
 if (!presupuestoData.cliente) {
   errores.push('Cliente requerido para exportar');
 }
 
 if (!presupuestoData.items || presupuestoData.items.length === 0) {
   errores.push('Al menos un producto es requerido');
 }
 
 if (!presupuestoData.fechaVencimiento) {
   errores.push('Fecha de vencimiento requerida');
 }
 
 // Validar fecha de vencimiento no sea pasada
 if (new Date(presupuestoData.fechaVencimiento) <= new Date()) {
   errores.push('Fecha de vencimiento debe ser futura');
 }
 
 return {
   valido: errores.length === 0,
   errores
 };
};

// VALIDAR CONFIGURACION DE EXPORT
export const validarExportConfig = (exportConfig, presupuestoData) => {
 const errores = [];
 
 if (!Object.values(exportConfig).some(Boolean)) {
   errores.push('Selecciona al menos una opcion de exportacion');
 }
 
 if (exportConfig.whatsapp) {
   if (!presupuestoData.cliente?.telefono) {
     errores.push('Cliente debe tener telefono para WhatsApp');
   }
 }
 
 if (exportConfig.email) {
   if (!presupuestoData.cliente?.email) {
     errores.push('Cliente debe tener email para envio por correo');
   }
   
   // Validar formato de email
   if (presupuestoData.cliente?.email && 
       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(presupuestoData.cliente.email)) {
     errores.push('Email del cliente no tiene formato valido');
   }
 }
 
 return {
   valido: errores.length === 0,
   errores
 };
};

// FUNCION PRINCIPAL PARA EJECUTAR EXPORTS
export const ejecutarExportPresupuesto = async (presupuestoData, tasaCambio, exportConfig) => {
 try {
   console.log('Ejecutando export de presupuesto...', exportConfig);
   
   // Validar datos
   const validacionPresupuesto = validarPresupuesto(presupuestoData);
   if (!validacionPresupuesto.valido) {
     throw new Error(validacionPresupuesto.errores.join('\n'));
   }
   
   const validacionConfig = validarExportConfig(exportConfig, presupuestoData);
   if (!validacionConfig.valido) {
     throw new Error(validacionConfig.errores.join('\n'));
   }
   
   const resultados = [];
   
   // PDF - Imprimir o Descargar
   if (exportConfig.pdf) {
     try {
       await imprimirPresupuesto(presupuestoData, tasaCambio);
       resultados.push('PDF enviado a impresora');
     } catch (error) {
       console.error('Error en PDF:', error);
       resultados.push('Error en PDF: ' + error.message);
     }
   }
   
   // WhatsApp
   if (exportConfig.whatsapp) {
     try {
       await enviarPresupuestoPorWhatsApp(
         presupuestoData, 
         tasaCambio, 
         presupuestoData.cliente.telefono
       );
       resultados.push('WhatsApp enviado exitosamente');
     } catch (error) {
       console.error('Error en WhatsApp:', error);
       resultados.push('Error en WhatsApp: ' + error.message);
     }
   }
   
   // Email
   if (exportConfig.email) {
     try {
       await enviarPresupuestoPorEmail(
         presupuestoData, 
         tasaCambio, 
         presupuestoData.cliente.email
       );
       resultados.push('Email enviado exitosamente');
     } catch (error) {
       console.error('Error en Email:', error);
       resultados.push('Error en Email: ' + error.message);
     }
   }
   
   console.log('Export de presupuesto completado');
   
   return {
     success: true,
     resultados: resultados,
     errores: resultados.filter(r => r.includes('Error')).length
   };
   
 } catch (error) {
   console.error('Error ejecutando export:', error);
   throw error;
 }
};