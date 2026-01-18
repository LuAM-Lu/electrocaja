// src/utils/shareUtils.js
import html2canvas from 'html2canvas';
import { api, getImageUrl } from '../config/api';
import toast from './toast.jsx';


//  Función helper para cargar imágenes
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log(' Imagen cargada exitosamente:', img.src);
      resolve(img);
    };
    img.onerror = (error) => {
      console.error(' Error cargando imagen:', img.src, error);
      reject(error);
    };

    // Construir URL completa
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      const imageUrl = getImageUrl(src);
      console.log(' URL original:', src);
      console.log(' URL construida:', imageUrl);
      img.src = imageUrl;
    } else {
      img.src = src;
      console.log(' URL directa:', img.src);
    }
  });
};

//  Capturar screenshot del modal
// Buscar y reemplazar la función completa:
export const captureModalScreenshot = async (modalRef, productName = 'producto', productData = {}, tasaCambio = 37.50) => {
  try {
    toast.loading('Generando imagen...', { id: 'capture' });

    // Crear canvas optimizado - Mayor resolución para mejor calidad
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Dimensiones optimizadas para redes sociales (aumentada para mejor calidad)
    const escala = 2; // Escala 2x para mejor calidad
    canvas.width = 720 * escala;
    canvas.height = 0;

    // NO escalar aquí todavía, primero establecer altura
    // ctx.scale(escala, escala); // Movido después de establecer altura

    // ===== CARGAR IMAGEN DEL PRODUCTO =====
    let productImage = null;
    if (productData && productData.imagen_url) {
      try {
        console.log(' Intentando cargar imagen:', productData.imagen_url);
        productImage = await loadImage(productData.imagen_url);
        console.log(' Imagen cargada - Dimensiones:', productImage.width, 'x', productImage.height);
        console.log(' Imagen del producto cargada correctamente');
      } catch (error) {
        console.log(' Error cargando imagen del producto:', error.message);
      }
    } else {
      console.log(' No hay imagen_url en productData:', productData);
    }


    // ===== CALCULAR ALTURA NECESARIA PRIMERO =====
    let yPos = 0;

    // Header
    yPos += 80;

    // Imagen del producto (solo si existe) - Tamaño grande para WhatsApp
    const imgHeight = productImage ? 420 : 0; // Aumentado de 320 a 420
    if (productImage) {
      yPos += imgHeight + 30;
    } else {
      yPos += 20; // Espacio mínimo si no hay imagen
    }

    // Nombre del producto (calcular líneas)
    const maxWidth = 680;
    const words = productName.split(' ');
    let line = '';
    const lines = [];

    // Crear contexto temporal para medir texto
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = 'bold 28px Arial, sans-serif';

    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = tempCtx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        lines.push(line);
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    yPos += lines.length * 35 + 30; // Espacio para nombre
    yPos += 130 + 30; // Espacio para precio (sin contenedor)

    // Información adicional (código y hora)
    yPos += 30; // Espacio para código y hora

    yPos += 80; // Contacto (más compacto)
    yPos += 30; // Footer (más pequeño)

    // Establecer altura del canvas (ya escalado)
    canvas.height = yPos * escala;
    console.log(' Canvas dinámico - Ancho:', canvas.width, 'Alto:', canvas.height, 'Escala:', escala);

    // AHORA escalar el contexto después de establecer las dimensiones
    ctx.scale(escala, escala);

    // ===== AHORA DIBUJAR TODO =====
    yPos = 0; // Resetear posición

    // Dimensiones sin escala (ya que el contexto está escalado)
    const width = canvas.width / escala;
    const height = canvas.height / escala;

    // Fondo blanco - PRIMERO dibujar el fondo completo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // ===== HEADER CON LOGO =====
    const gradient = ctx.createLinearGradient(0, 0, width, 80);
    gradient.addColorStop(0, '#3B82F6');
    gradient.addColorStop(1, '#1D4ED8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 80);

    // Cargar y dibujar logo
    try {
      const logoUrl = `${window.location.origin}/android-chrome-512x512.png`;
      const logo = await loadImage(logoUrl);
      const logoSize = 55; //  Logo más grande (era 45)

      // Calcular posiciones más hacia la izquierda (usar dimensiones sin escala)
      const totalWidth = logoSize + 15 + 300; // logo + espacio + texto estimado
      const startX = (width - totalWidth) / 2 - 40; //  Mover 40px a la izquierda

      const logoX = startX;
      const logoY = 12; // Ajustar para centrar mejor
      const textX = startX + logoSize + 15;

      //  SIN fondo - logo transparente
      // (Eliminamos el círculo blanco)

      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

      // Título header (centrado con el logo)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(' ELECTRO SHOP MORANDIN CA', textX, 35);
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText('        J-405903333 - Guanare, Venezuela', textX, 55);

    } catch (error) {
      console.log(' No se pudo cargar el logo:', error.message);
      // Fallback centrado (usar dimensiones sin escala)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ELECTRO SHOP MORANDIN CA', width / 2, 35);
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('            J-405903333 - GUANARE, VENEZUELA', width / 2, 60);
    }

    yPos = 110; // Después del header

    // ===== IMAGEN DEL PRODUCTO =====
    const imgWidth = 520; // Aumentado de 400 a 520 para mejor calidad en WhatsApp
    const imgX = (width - imgWidth) / 2;

    if (productImage) {
      // Fondo para la imagen
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(imgX - 10, yPos - 10, imgWidth + 20, imgHeight + 20);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.strokeRect(imgX - 10, yPos - 10, imgWidth + 20, imgHeight + 20);

      // Dibujar imagen con proporción mantenida
      const aspectRatio = productImage.width / productImage.height;
      let drawWidth = imgWidth;
      let drawHeight = imgHeight;

      if (aspectRatio > imgWidth / imgHeight) {
        drawHeight = imgWidth / aspectRatio;
      } else {
        drawWidth = imgHeight * aspectRatio;
      }

      const drawX = imgX + (imgWidth - drawWidth) / 2;
      const drawY = yPos + (imgHeight - drawHeight) / 2;

      ctx.drawImage(productImage, drawX, drawY, drawWidth, drawHeight);
      yPos += imgHeight + 50;
    } else {
      // Sin imagen, simplemente continuar sin mostrar placeholder innecesario
      yPos += 20; // Solo un pequeño espacio antes del nombre
    }

    // ===== NOMBRE DEL PRODUCTO =====
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';

    // Dibujar líneas del producto
    lines.forEach((line, index) => {
      ctx.fillText(line.trim(), width / 2, yPos + (index * 35));
    });

    yPos += lines.length * 35 + 5;

    // ===== PRECIO PRINCIPAL (SIN CONTENEDOR) =====

    // Calcular precio desde los datos del producto (más confiable que leer del DOM)
    const precioVentaUSD = parseFloat(productData.precio_venta || productData.precio || 0);
    const precioVentaBs = precioVentaUSD * (tasaCambio || 37.50);
    const precioTexto = precioVentaBs.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    console.log('💰 Precio calculado para imagen:', {
      precioVentaUSD,
      tasaCambio,
      precioVentaBs,
      precioTexto
    });

    // Precio en Bolívares (sin contenedor, centrado) - Más grande y grueso
    ctx.fillStyle = '#1D4ED8'; // Color del header (azul oscuro)
    ctx.font = 'bold 52px Arial, sans-serif'; // Aumentado de 44px a 52px
    ctx.textAlign = 'center';
    ctx.fillText(precioTexto, width / 2, yPos + 45);

    ctx.font = 'bold 20px Arial, sans-serif'; // Aumentado de 18px a 20px
    ctx.fillStyle = '#3B82F6'; // Color del header (azul)
    ctx.fillText('BOLÍVARES', width / 2, yPos + 70);

    // IVA y Tasa en la misma fila centrada
    const tasaTexto = `${(tasaCambio || 37.50).toFixed(2)} Bs/USD`;
    const ivaTasaTexto = `Incluye IVA 16% • Tasa: ${tasaTexto}`;
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#3B82F6'; // Color del header (azul)
    ctx.fillText(ivaTasaTexto, width / 2, yPos + 95);

    yPos += 130; // Espacio después del precio

    // ===== CÓDIGO Y HORA =====
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';

    // Obtener código del producto si existe
    const codigoProducto = productData.codigo_interno || productData.codigo_barras || '';
    const codigoTexto = codigoProducto ? `Código: ${codigoProducto}` : '';

    // Obtener hora actual
    const ahora = new Date();
    const horaTexto = ahora.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Mostrar código y hora en una sola línea centrada
    if (codigoTexto) {
      ctx.fillText(`${codigoTexto} • ${horaTexto}`, width / 2, yPos);
    } else {
      ctx.fillText(horaTexto, width / 2, yPos);
    }

    yPos += 25; // Espacio después de código/hora

    // ===== CONTACTO (más compacto) =====
    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(0, yPos, width, 80);

    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONSULTA DISPONIBILIDAD', width / 2, yPos + 25);

    // Mostrar WhatsApp e Instagram con sus datos
    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = '#4B5563';
    ctx.fillText('WhatsApp: +58 257 251 1282 • Instagram: @electroshopgre', width / 2, yPos + 50);
    ctx.fillText('Electro Shop Morandin CA - Tu tienda de confianza', width / 2, yPos + 65);

    yPos += 80;

    // ===== FOOTER (más pequeño) =====
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, yPos, width, 30);

    ctx.fillStyle = '#005effff';
    ctx.font = 'bold italic 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    const fecha = new Date().toLocaleDateString('es-VE');
    ctx.fillText(`Generado por SADES v1.0 el ${fecha}`, width / 2, yPos + 20);

    // Convertir a blob con debug - Calidad mejorada
    return new Promise((resolve) => {
      const calidad = 0.95; // Calidad alta (95%)
      canvas.toBlob((blob) => {
        const base64 = canvas.toDataURL('image/jpeg', calidad);

        // DEBUG de la imagen generada
        console.log(' Imagen generada:', {
          blob_size_kb: Math.round(blob.size / 1024),
          base64_length: base64.length,
          base64_starts_with: base64.substring(0, 50),
          canvas_width: canvas.width,
          canvas_height: canvas.height,
          calidad: calidad
        });

        toast.success('Imagen generada perfectamente', { id: 'capture' });
        resolve({ blob, base64, canvas });
      }, 'image/jpeg', calidad);
    });

  } catch (error) {
    console.error('Error generando imagen:', error);
    toast.error('Error generando imagen', { id: 'capture' });
    throw error;
  }
};

//  Verificar estado de WhatsApp
export const checkWhatsAppStatus = async () => {
  try {
    const response = await api.get('/whatsapp/estado');
    console.log(' Estado WhatsApp:', response.data);
    return response.data;
  } catch (error) {
    console.error(' Error verificando WhatsApp:', error);
    return { success: false, error: error.message };
  }
};

export const shareViaWhatsApp = async (imageBase64, phoneNumber, productName, price) => {
  try {
    //  VERIFICAR ESTADO PRIMERO
    console.log(' Verificando estado de WhatsApp...');
    const status = await checkWhatsAppStatus();

    if (!status.success || !status.data?.conectado) {
      toast.error('WhatsApp no está conectado. Ve a Configuración → WhatsApp');
      return false;
    }

    toast.loading('Enviando por WhatsApp...', { id: 'whatsapp' });

    // Mensaje predeterminado
    const mensaje = ` *${productName}*\n Precio: *${price}*\n\n Consulta disponibilidad y más detalles`;

    // Validar tamaño de imagen
    const imageSizeMB = imageBase64 ? (imageBase64.length * 0.75) / 1024 / 1024 : 0;
    console.log(' Enviando WhatsApp:', {
      numero: phoneNumber,
      mensaje: mensaje.substring(0, 50) + '...',
      imagen_size_MB: imageSizeMB.toFixed(2)
    });

    if (imageSizeMB > 5) {
      toast.error('Imagen muy grande (máx 5MB). Intenta de nuevo.');
      return false;
    }

    // Debug completo
    console.log(' DEBUG COMPLETO:', {
      numero: phoneNumber,
      mensaje_length: mensaje.length,
      imagen_presente: !!imageBase64,
      imagen_tipo: imageBase64 ? imageBase64.substring(0, 20) : 'null',
      imagen_size_kb: imageBase64 ? Math.round(imageBase64.length / 1024) : 0
    });

    const response = await api.post('/whatsapp/enviar', {
      numero: phoneNumber,
      mensaje: mensaje,
      imagen: imageBase64 // Imagen completa
    });

    console.log(' Respuesta backend completa:', {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
      status: response.status
    });

    if (response.data.success) {
      // Verificar si menciona imagen en la respuesta
      if (response.data.message?.includes('imagen') || response.data.data?.imagen_enviada) {
        toast.success('Mensaje e imagen enviados por WhatsApp', { id: 'whatsapp' });
      } else {
        toast.success('Mensaje enviado (verificar imagen)', { id: 'whatsapp' });
      }
      return true;
    } else {
      throw new Error(response.data.message || 'Error enviando mensaje');
    }

  } catch (error) {
    console.error(' Error enviando WhatsApp:', error);

    // Mostrar error específico
    if (error.response?.status === 500) {
      toast.error('Error del servidor WhatsApp - Revisa la conexión', { id: 'whatsapp' });
    } else if (error.response?.status === 404) {
      toast.error('Servicio WhatsApp no disponible', { id: 'whatsapp' });
    } else {
      toast.error('Error enviando por WhatsApp', { id: 'whatsapp' });
    }

    return false;
  }
};

//  Compartir en Instagram (descarga)
export const shareViaInstagram = async (blob, productName) => {
  try {
    downloadImage(blob, `instagram_${productName}.png`);

    toast.success('¡Imagen descargada! Compártela en Instagram', {
      duration: 4000,
    });

    // Opcional: Abrir Instagram en nueva pestaña
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank');
    }, 1000);

  } catch (error) {
    console.error('Error compartiendo en Instagram:', error);
    toast.error('Error descargando imagen');
  }
};

//  Compartir en TikTok (descarga)
export const shareViaTikTok = async (blob, productName) => {
  try {
    downloadImage(blob, `tiktok_${productName}.png`);

    toast.success('¡Imagen descargada! Compártela en TikTok', {
      duration: 4000,
    });

    // Opcional: Abrir TikTok en nueva pestaña
    setTimeout(() => {
      window.open('https://www.tiktok.com/', '_blank');
    }, 1000);

  } catch (error) {
    console.error('Error compartiendo en TikTok:', error);
    toast.error('Error descargando imagen');
  }
};

//  Función auxiliar para descargar imagen
const downloadImage = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

//  Limpiar nombre para archivo (sin guiones bajos)
export const cleanProductName = (name) => {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '') //  Mantener mayúsculas y minúsculas
    .replace(/\s+/g, '-')           // Espacios a guiones
    .replace(/-+/g, '-')            // Múltiples guiones a uno solo
    .replace(/^-|-$/g, '')          // Remover guiones al inicio/final
    .substring(0, 30);
};