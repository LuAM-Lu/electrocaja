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

// CALCULAR TOTALES DEL PRESUPUESTO - IVA DESGLOSADO (INCLUIDO EN EL PRECIO)
export const calcularTotales = (presupuestoData, tasaCambio) => {
 // ✅ CALCULAR SUBTOTAL TOTAL (PRECIO CON IVA INCLUIDO)
 // Si el precio es $10, ese $10 ya incluye el IVA
 const subtotalConIva = presupuestoData.items.reduce((sum, item) => {
   return sum + (item.cantidad * item.precio_unitario);
 }, 0);

 const descuentoGlobal = presupuestoData.descuentoGlobal || 0;
 const tipoDescuento = presupuestoData.tipoDescuento || 'porcentaje';
 const impuesto = presupuestoData.impuestos || 16;

 // Descuento en USD (sobre el subtotal con IVA)
 let descuentoUsd;
 if (tipoDescuento === 'porcentaje') {
   descuentoUsd = (subtotalConIva * descuentoGlobal) / 100;
 } else {
   descuentoUsd = descuentoGlobal / tasaCambio; // Convertir de Bs a USD
 }
 
 // Subtotal después del descuento (aún con IVA incluido)
 const subtotalDespuesDescuento = subtotalConIva - descuentoUsd;
 
 // ✅ DESGLOSAR IVA DEL SUBTOTAL (el IVA está incluido en el precio)
 // Si el subtotal es $10, el IVA incluido es: $10 * (16/116) = $1.38
 // La base imponible es: $10 - $1.38 = $8.62
 const ivaUsd = (subtotalDespuesDescuento * impuesto) / (100 + impuesto);
 const baseImponible = subtotalDespuesDescuento - ivaUsd;
 
 // Total en USD (igual al subtotal después del descuento, ya que el IVA está incluido)
 const totalUsd = subtotalDespuesDescuento;
 
 // Total en Bs
 const totalBs = totalUsd * tasaCambio;

 return {
   subtotal: subtotalConIva, // Subtotal original con IVA incluido
   descuentoUsd,
   descuentoBs: descuentoUsd * tasaCambio,
   baseImponible, // Base imponible después de desglosar IVA
   ivaUsd, // IVA desglosado (incluido en el precio)
   ivaBs: ivaUsd * tasaCambio,
   totalUsd, // Total = subtotal después del descuento (IVA ya incluido)
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
   
   const horaActual = new Date().toLocaleTimeString('es-ES', {
     hour: '2-digit',
     minute: '2-digit'
   });

   // HEADER PREMIUM CON PALETA AZUL - IGUAL A LA VISTA PREVIA
   // Gradiente azul oscuro a azul medio
   doc.setFillColor(30, 58, 138); // Azul oscuro (blue-800)
   doc.rect(0, 0, pageWidth, 45, 'F');
   
   doc.setFillColor(37, 99, 235); // Azul medio (blue-600)
   doc.rect(0, 0, pageWidth, 38, 'F');
   
   doc.setFillColor(59, 130, 246); // Azul (blue-500)
   doc.rect(0, 0, pageWidth, 35, 'F');
   
   // Línea azul claro elegante (arriba)
   doc.setFillColor(147, 197, 253); // Azul claro (blue-300)
   doc.rect(0, 0, pageWidth, 2, 'F');
   
   // Logo de alta calidad - más grande (igual a vista previa)
   if (logoData) {
     doc.addImage(logoData, 'PNG', 15, 8, 20, 20);
   }
   
   // Información de empresa - igual a vista previa (con límites de ancho)
   doc.setTextColor(255, 255, 255);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(18);
   const empresaNombre = doc.splitTextToSize('ELECTRO SHOP MORANDIN C.A.', pageWidth - (logoData ? 60 : 30));
   doc.text(empresaNombre, logoData ? 40 : 15, 18);
   
   doc.setFontSize(9);
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(255, 255, 255);
   doc.setGState(doc.GState({opacity: 0.9}));
   const rifText = doc.splitTextToSize('RIF: J-405903333 | Especialistas en Tecnologia', pageWidth - (logoData ? 60 : 30));
   doc.text(rifText, logoData ? 40 : 15, 25);
   const direccionText = doc.splitTextToSize('Carrera 5ta, frente a la plaza Miranda | WhatsApp: +58 2572511282', pageWidth - (logoData ? 60 : 30));
   doc.text(direccionText, logoData ? 40 : 15, 30);
   
   doc.setFontSize(8);
   doc.setGState(doc.GState({opacity: 0.75}));
   const emailText = doc.splitTextToSize('electroshopgre@gmail.com | @electroshopgre', pageWidth - (logoData ? 60 : 30));
   doc.text(emailText, logoData ? 40 : 15, 35);

   let yPos = 55;
   
   // TÍTULO PREMIUM DEL PRESUPUESTO - IGUAL A VISTA PREVIA
   doc.setFillColor(239, 246, 255); // Azul muy claro (blue-50)
   doc.rect(15, yPos, pageWidth - 30, 20, 'F');
   
   // Línea lateral azul (borde izquierdo)
   doc.setFillColor(59, 130, 246); // Azul (blue-500)
   doc.rect(15, yPos, 4, 20, 'F');
   
   doc.setTextColor(15, 23, 42); // Gris oscuro
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(20);
   const tituloPresupuesto = doc.splitTextToSize(`PRESUPUESTO ${presupuestoData.numero}`, pageWidth - 80);
   doc.text(tituloPresupuesto, 25, yPos + 12);
   
   // Fecha, hora y tasa de cambio (alineado a la derecha)
   doc.setFontSize(9);
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(71, 85, 105);
   doc.text(`Fecha: ${fechaActual}`, pageWidth - 15, yPos + 6, { align: 'right', maxWidth: 80 });
   doc.text(`Hora: ${horaActual}`, pageWidth - 15, yPos + 11, { align: 'right', maxWidth: 80 });
   const tasaText = doc.splitTextToSize(`Tasa: ${formatearVenezolano(tasaCambio)} Bs/$`, 80);
   doc.text(tasaText, pageWidth - 15, yPos + 16, { align: 'right' });
   
   yPos += 28;

   // INFORMACIÓN DEL CLIENTE - IGUAL A VISTA PREVIA
   if (presupuestoData.cliente) {
     doc.setFillColor(239, 246, 255); // Azul muy claro (blue-50)
     doc.rect(15, yPos, pageWidth - 30, 30, 'F');
     
     // Borde lateral azul
     doc.setFillColor(59, 130, 246); // Azul (blue-500)
     doc.rect(15, yPos, 4, 30, 'F');
     
     doc.setTextColor(30, 64, 175); // Azul oscuro
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(13);
     doc.text('CLIENTE', 25, yPos + 10);
     
     doc.setTextColor(51, 65, 85); // Gris oscuro
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(10);
     
     let clienteY = yPos + 18;
     doc.setFont('helvetica', 'bold');
     doc.text('Nombre:', 25, clienteY);
     doc.setFont('helvetica', 'normal');
     const nombreCliente = doc.splitTextToSize(presupuestoData.cliente.nombre || '', pageWidth - 70);
     doc.text(nombreCliente, 50, clienteY);
     clienteY += nombreCliente.length > 1 ? nombreCliente.length * 5 : 6;
     
     if (presupuestoData.cliente.cedula_rif) {
       doc.setFont('helvetica', 'bold');
       doc.text('CI/RIF:', 25, clienteY);
       doc.setFont('helvetica', 'normal');
       doc.text(presupuestoData.cliente.cedula_rif, 50, clienteY);
       clienteY += 6;
     }
     
     if (presupuestoData.cliente.telefono) {
       doc.setFont('helvetica', 'bold');
       doc.text('Teléfono:', 25, clienteY);
       doc.setFont('helvetica', 'normal');
       doc.text(presupuestoData.cliente.telefono, 50, clienteY);
       clienteY += 6;
     }
     
     if (presupuestoData.cliente.email) {
       doc.setFont('helvetica', 'bold');
       doc.text('Email:', 25, clienteY);
       doc.setFont('helvetica', 'normal');
       const emailCliente = doc.splitTextToSize(presupuestoData.cliente.email || '', pageWidth - 70);
       doc.text(emailCliente, 50, clienteY);
       clienteY += emailCliente.length > 1 ? emailCliente.length * 5 : 6;
     }
     
     // Ajustar altura del bloque de cliente según contenido
     const alturaCliente = Math.max(30, clienteY - yPos + 5);
     doc.setFillColor(239, 246, 255);
     doc.rect(15, yPos, pageWidth - 30, alturaCliente, 'F');
     doc.setFillColor(59, 130, 246);
     doc.rect(15, yPos, 4, alturaCliente, 'F');
     
     yPos += Math.max(38, alturaCliente + 5);
   }

   // TABLA DE PRODUCTOS - IGUAL A VISTA PREVIA (sin P.Unit Bs)
   let tableY = yPos;

   // Header de tabla con gradiente azul premium
   doc.setFillColor(37, 99, 235); // Azul medio (blue-600)
   doc.rect(15, tableY, pageWidth - 30, 12, 'F');
   
   doc.setFillColor(59, 130, 246); // Azul (blue-500)
   doc.rect(15, tableY, pageWidth - 30, 10, 'F');

   doc.setTextColor(255, 255, 255);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(10);

   // Columnas optimizadas - IGUAL A VISTA PREVIA (sin P.Unit Bs) - AJUSTADAS PARA EVITAR DESBORDAMIENTO
   const cols = {
     num: 20,
     cant: 30,
     desc: 50,
     pUnitUsd: 115,
     totalUsd: 145,
     totalBs: 170
   };

   doc.text('#', cols.num, tableY + 7);
   doc.text('Cant.', cols.cant, tableY + 7);
   doc.text('PRODUCTO / SERVICIO', cols.desc, tableY + 7);
   doc.text('P.Unit $', cols.pUnitUsd, tableY + 7);
   doc.text('Total $', cols.totalUsd, tableY + 7);
   doc.text('Total Bs', cols.totalBs, tableY + 7);

   tableY += 12;

   // Filas de productos con alternancia - IGUAL A VISTA PREVIA
   doc.setTextColor(51, 65, 85);
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(9);

   presupuestoData.items.forEach((item, index) => {
     // Verificar si necesitamos nueva página
     if (tableY > pageHeight - 50) {
       doc.addPage();
       tableY = 20;
       
       // Redibujar header de tabla en nueva página
       doc.setFillColor(37, 99, 235);
       doc.rect(15, tableY, pageWidth - 30, 12, 'F');
       doc.setFillColor(59, 130, 246);
       doc.rect(15, tableY, pageWidth - 30, 10, 'F');
       doc.setTextColor(255, 255, 255);
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(10);
       doc.text('#', cols.num, tableY + 7);
       doc.text('Cant.', cols.cant, tableY + 7);
       doc.text('PRODUCTO / SERVICIO', cols.desc, tableY + 7);
       doc.text('P.Unit $', cols.pUnitUsd, tableY + 7);
       doc.text('Total $', cols.totalUsd, tableY + 7);
       doc.text('Total Bs', cols.totalBs, tableY + 7);
       tableY += 12;
     }
     
     // Alternancia de colores: blanco y azul claro
     if (index % 2 === 0) {
       doc.setFillColor(255, 255, 255); // Blanco
       doc.rect(15, tableY, pageWidth - 30, 10, 'F');
     } else {
       doc.setFillColor(239, 246, 255); // Azul muy claro (blue-50)
       doc.rect(15, tableY, pageWidth - 30, 10, 'F');
     }
     
     // Línea sutil entre filas
     doc.setDrawColor(229, 231, 235); // Gris claro
     doc.setLineWidth(0.2);
     doc.line(15, tableY + 10, pageWidth - 15, tableY + 10);
     
     doc.setTextColor(51, 65, 85);
     doc.setFont('helvetica', 'bold');
     doc.text((index + 1).toString(), cols.num, tableY + 7);
     doc.setFont('helvetica', 'normal');
     doc.text(item.cantidad.toString(), cols.cant + 3, tableY + 7, { align: 'center' });
     
     // Descripción con límite de ancho para evitar desbordamiento
     const maxDescWidth = cols.pUnitUsd - cols.desc - 5;
     const descripcion = doc.splitTextToSize(item.descripcion || '', maxDescWidth);
     doc.text(descripcion, cols.desc, tableY + 7);
     
     // Ajustar altura de fila si la descripción es multilínea
     const filaHeight = Math.max(10, descripcion.length * 5 + 2);
     if (filaHeight > 10) {
       // Redibujar fondo con nueva altura
       if (index % 2 === 0) {
         doc.setFillColor(255, 255, 255);
         doc.rect(15, tableY, pageWidth - 30, filaHeight, 'F');
       } else {
         doc.setFillColor(239, 246, 255);
         doc.rect(15, tableY, pageWidth - 30, filaHeight, 'F');
       }
     }
     
     // Precios - solo P.Unit $, Total $ y Total Bs (con límites de ancho)
     doc.text(`$${item.precio_unitario.toFixed(2)}`, cols.pUnitUsd + 5, tableY + 7, { align: 'right', maxWidth: 15 });
     
     doc.setFont('helvetica', 'bold');
     doc.text(`$${(item.cantidad * item.precio_unitario).toFixed(2)}`, cols.totalUsd + 5, tableY + 7, { align: 'right', maxWidth: 15 });
     const totalBsText = doc.splitTextToSize(`${formatearVenezolano(item.cantidad * item.precio_unitario * tasaCambio)} Bs`, 20);
     doc.text(totalBsText, cols.totalBs + 5, tableY + 7, { align: 'right' });
     
     tableY += filaHeight;
   });

   // Línea final de la tabla
   doc.setDrawColor(37, 99, 235); // Azul medio
   doc.setLineWidth(1);
   doc.line(15, tableY, pageWidth - 15, tableY);

   // SECCIÓN DE TOTALES - IGUAL A VISTA PREVIA
   yPos = tableY + 15;
   const totalBoxHeight = 50;
   
   // Fondo con gradiente azul simulado
   doc.setFillColor(239, 246, 255); // Azul muy claro (blue-50)
   doc.rect(15, yPos, pageWidth - 30, totalBoxHeight, 'F');
   
   doc.setFillColor(219, 234, 254); // Azul claro (blue-100)
   doc.rect(15, yPos, pageWidth - 30, 10, 'F');
   
   // Borde azul elegante
   doc.setDrawColor(59, 130, 246); // Azul (blue-500)
   doc.setLineWidth(1.5);
   doc.rect(15, yPos, pageWidth - 30, totalBoxHeight);
   
   // Línea lateral azul premium
   doc.setFillColor(37, 99, 235); // Azul medio (blue-600)
   doc.rect(15, yPos, 4, totalBoxHeight, 'F');
   
   doc.setTextColor(30, 64, 175); // Azul oscuro
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(13);
   doc.text('RESUMEN FINANCIERO', 25, yPos + 8);
   
   doc.setTextColor(51, 65, 85);
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(10);
   
   // Verificar si los totales caben en la página actual
   if (yPos + totalBoxHeight > pageHeight - 30) {
     doc.addPage();
     yPos = 20;
     
     // Redibujar fondo de totales en nueva página
     doc.setFillColor(239, 246, 255);
     doc.rect(15, yPos, pageWidth - 30, totalBoxHeight, 'F');
     doc.setFillColor(219, 234, 254);
     doc.rect(15, yPos, pageWidth - 30, 10, 'F');
     doc.setDrawColor(59, 130, 246);
     doc.setLineWidth(1.5);
     doc.rect(15, yPos, pageWidth - 30, totalBoxHeight);
     doc.setFillColor(37, 99, 235);
     doc.rect(15, yPos, 4, totalBoxHeight, 'F');
   }
   
   let totalY = yPos + 18;
   doc.text(`Subtotal:`, 25, totalY);
   doc.setFont('helvetica', 'bold');
   const subtotalText = doc.splitTextToSize(`${formatearVenezolano(totales.subtotal * tasaCambio)} Bs`, 30);
   doc.text(subtotalText, pageWidth - 20, totalY, { align: 'right' });
   
   if (totales.descuentoGlobal > 0) {
     totalY += 7;
     doc.setFont('helvetica', 'normal');
     doc.setTextColor(220, 38, 38); // Rojo
     const descuentoLabel = doc.splitTextToSize(`Descuento (${totales.tipoDescuento === 'porcentaje' ? totales.descuentoGlobal + '%' : 'fijo'}):`, pageWidth - 100);
     doc.text(descuentoLabel, 25, totalY);
     doc.setFont('helvetica', 'bold');
     const descuentoText = doc.splitTextToSize(`-${formatearVenezolano(totales.descuentoBs)} Bs`, 30);
     doc.text(descuentoText, pageWidth - 20, totalY, { align: 'right' });
     doc.setTextColor(51, 65, 85);
   }
   
   totalY += 7;
   doc.setFont('helvetica', 'normal');
   doc.text(`Base Imponible:`, 25, totalY);
   doc.setFont('helvetica', 'bold');
   const baseText = doc.splitTextToSize(`${formatearVenezolano(totales.baseImponible * tasaCambio)} Bs`, 30);
   doc.text(baseText, pageWidth - 20, totalY, { align: 'right' });
   
   totalY += 7;
   doc.setFont('helvetica', 'normal');
   doc.text(`IVA (${totales.impuesto}%):`, 25, totalY);
   doc.setFont('helvetica', 'bold');
   const ivaText = doc.splitTextToSize(`${formatearVenezolano(totales.ivaBs)} Bs`, 30);
   doc.text(ivaText, pageWidth - 20, totalY, { align: 'right' });
   
   // Total final destacado en azul
   totalY += 10;
   doc.setDrawColor(59, 130, 246); // Azul
   doc.setLineWidth(0.5);
   doc.line(25, totalY - 2, pageWidth - 25, totalY - 2);
   
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(14);
   doc.setTextColor(30, 64, 175); // Azul oscuro
   doc.text(`TOTAL:`, 25, totalY + 5);
   doc.setFontSize(15);
   const totalText = doc.splitTextToSize(`${formatearVenezolano(totales.totalBs)} Bs`, 35);
   doc.text(totalText, pageWidth - 20, totalY + 5, { align: 'right' });
   
   totalY += 8;
   doc.setFontSize(9);
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(75, 85, 99);
   doc.text(`En USD: $${totales.totalUsd.toFixed(2)}`, pageWidth - 20, totalY, { align: 'right', maxWidth: 30 });

   // OBSERVACIONES CON DISEÑO AZUL PREMIUM
   if (presupuestoData.observaciones && presupuestoData.observaciones.length > 0) {
     yPos += totalBoxHeight + 15;
     
     if (yPos > pageHeight - 60) {
       doc.addPage();
       yPos = 20;
     }
     
     const obsHeight = 8 + (presupuestoData.observaciones.length * 5);
     doc.setFillColor(239, 246, 255); // Azul muy claro
     doc.rect(15, yPos, pageWidth - 30, obsHeight, 'F');
     
     doc.setFillColor(59, 130, 246); // Azul
     doc.rect(15, yPos, 3, obsHeight, 'F');
     
     doc.setTextColor(30, 64, 175); // Azul oscuro
     doc.setFont('helvetica', 'bold'); // Fuente moderna y redonda
     doc.setFontSize(11); // Más grande
     doc.text('OBSERVACIONES IMPORTANTES', 25, yPos + 7);
     
     doc.setTextColor(51, 65, 85); // Gris oscuro
     doc.setFont('helvetica', 'normal'); // Fuente moderna y redonda
     doc.setFontSize(9); // Más grande
     
     presupuestoData.observaciones.forEach((obs, index) => {
       const obsText = doc.splitTextToSize(`• ${obs}`, pageWidth - 50);
       doc.text(obsText, 25, yPos + 13 + (index * 6));
       // Ajustar altura si el texto es multilínea
       if (obsText.length > 1) {
         yPos += (obsText.length - 1) * 5;
       }
     });
   }

   // FOOTER ELEGANTE Y COMPACTO
   const footerY = pageHeight - 20;
   
   // Línea decorativa elegante
   doc.setDrawColor(191, 219, 254); // Azul claro
   doc.setLineWidth(0.5);
   doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
   
   doc.setTextColor(100, 116, 139);
   doc.setFont('helvetica', 'italic'); // Fuente moderna y redonda
   doc.setFontSize(9); // Más grande
   doc.text('Este presupuesto es válido según términos y condiciones aplicables.', pageWidth/2, footerY, { align: 'center' });
   
   doc.setFont('helvetica', 'normal'); // Fuente moderna y redonda
   doc.setFontSize(8); // Más grande
   doc.text(`Generado por ElectroCaja v1.0 • ${new Date().toLocaleString('es-ES')}`, pageWidth/2, footerY + 6, { align: 'center' });

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

// ENVIAR PRESUPUESTO POR WHATSAPP SIMPLE (SOLO MENSAJE DE TEXTO)
export const enviarPresupuestoPorWhatsAppSimple = async (presupuestoData, tasaCambio, numero) => {
 try {
   console.log('Enviando presupuesto por WhatsApp Simple (solo mensaje)...', numero);
   
   const totales = calcularTotales(presupuestoData, tasaCambio);
   
   // Preparar mensaje completo con información del presupuesto
   const mensajeCompleto = 
     `Hola ${presupuestoData.cliente?.nombre || 'Cliente'}! 👋\n\n` +
     `📋 *PRESUPUESTO #${presupuestoData.numero}*\n\n` +
     `📅 Fecha: ${new Date(presupuestoData.fecha).toLocaleDateString('es-ES')}\n` +
     `💼 Cliente: ${presupuestoData.cliente?.nombre || 'N/A'}\n` +
     `🆔 CI/RIF: ${presupuestoData.cliente?.cedula_rif || 'N/A'}\n\n` +
     `📦 *PRODUCTOS/SERVICIOS:*\n` +
     presupuestoData.items.map((item, index) => 
       `${index + 1}. ${item.descripcion} - Cant: ${item.cantidad} - $${item.precio_unitario.toFixed(2)} c/u`
     ).join('\n') +
     `\n\n` +
     `💰 *RESUMEN:*\n` +
     `Subtotal: ${formatearVenezolano(totales.subtotal * tasaCambio)} Bs\n` +
     (totales.descuentoUsd > 0 ? `Descuento: -${formatearVenezolano(totales.descuentoBs)} Bs\n` : '') +
     `Base Imponible: ${formatearVenezolano(totales.baseImponible * tasaCambio)} Bs\n` +
     `IVA (${totales.impuesto}%): ${formatearVenezolano(totales.ivaBs)} Bs\n` +
     `*TOTAL: ${formatearVenezolano(totales.totalBs)} Bs*\n` +
     `($${totales.totalUsd.toFixed(2)} USD)\n\n` +
     `💱 Tasa de cambio BCV: ${formatearVenezolano(tasaCambio)} Bs/$\n\n` +
     `✅ ¿Te interesa? Contáctanos para procesar tu pedido!\n\n` +
     `📞 WhatsApp: +58 257 251 1282`;
   
   // Preparar datos para WhatsApp solo mensaje
   const whatsappData = {
     numero: numero,
     mensaje: mensajeCompleto
   };
   
   // Usar endpoint de WhatsApp para solo mensaje
   const response = await api.post('/whatsapp/enviar', whatsappData);
   
   console.log('Presupuesto enviado por WhatsApp Simple exitosamente');
   
   return {
     success: true,
     message: 'Presupuesto enviado por WhatsApp Simple exitosamente',
     data: response.data.data
   };
   
 } catch (error) {
   console.error('Error enviando presupuesto por WhatsApp Simple:', error);
   throw error;
 }
};

// ENVIAR PRESUPUESTO POR WHATSAPP (CON PDF ADJUNTO)
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
 
 if (exportConfig.whatsappSimple) {
   if (!presupuestoData.cliente?.telefono) {
     errores.push('Cliente debe tener telefono para WhatsApp Simple');
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
   
   // WhatsApp (con PDF adjunto)
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
   
   // WhatsApp Simple (solo mensaje de texto)
   if (exportConfig.whatsappSimple) {
     try {
       await enviarPresupuestoPorWhatsAppSimple(
         presupuestoData, 
         tasaCambio, 
         presupuestoData.cliente.telefono
       );
       resultados.push('WhatsApp Simple enviado exitosamente');
     } catch (error) {
       console.error('Error en WhatsApp Simple:', error);
       resultados.push('Error en WhatsApp Simple: ' + error.message);
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