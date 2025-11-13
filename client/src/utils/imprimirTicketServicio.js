// utils/imprimirTicketServicio.js
// Función para imprimir tickets de servicio técnico
// Basada en el método que funciona en IngresoModal.jsx (imprimirFacturaTermica)

import { api } from '../config/api';

/**
 * Imprime el ticket de un servicio técnico
 * @param {Object} servicio - Objeto del servicio con id (puede incluir ticketHTML si viene de creación)
 * @param {Object} opciones - Opciones de impresión
 * @param {Window} opciones.ventanaPreAbierta - Ventana pre-abierta (como en IngresoModal)
 * @param {string} opciones.tipo - 'cliente' (por defecto) o 'interno'
 * @returns {Promise<void>}
 */
export const imprimirTicketServicio = async (servicio, opciones = {}) => {
  const { ventanaPreAbierta = null, tipo = 'cliente' } = opciones;

  try {
    if (!servicio || !servicio.id) {
      throw new Error('Servicio no válido para imprimir');
    }

    console.log('🖨️ [imprimirTicketServicio] Iniciando impresión para servicio:', servicio.id, 'tipo:', tipo);

    let ticketHTML, qrCode, linkSeguimiento;

    // ✅ OPTIMIZACIÓN: Si el servicio ya tiene el ticket HTML (viene de creación), usarlo directamente
    const campoTicket = tipo === 'interno' ? 'ticketHTMLInterno' : 'ticketHTML';

    if (servicio[campoTicket] && servicio.qrCode && servicio.linkSeguimiento) {
      console.log('✅ [imprimirTicketServicio] Usando ticket HTML que ya viene en el servicio (sin llamada al backend)');
      ticketHTML = servicio[campoTicket];
      qrCode = servicio.qrCode;
      linkSeguimiento = servicio.linkSeguimiento;
    } else {
      // Si no está disponible, obtenerlo del backend
      console.log('🔄 [imprimirTicketServicio] Obteniendo ticket HTML del backend...');
      const response = await api.get(`/servicios/${servicio.id}/ticket?tipo=${tipo}`);

      if (!response.data.success || !response.data.data?.ticketHTML) {
        throw new Error('No se pudo obtener el ticket del servicio');
      }

      const data = response.data.data;
      ticketHTML = data.ticketHTML;
      qrCode = data.qrCode;
      linkSeguimiento = data.linkSeguimiento;
    }

    // Insertar QR code si existe
    let htmlConQR = ticketHTML;
    if (qrCode && ticketHTML.includes('qr-code-placeholder')) {
      htmlConQR = ticketHTML.replace(
        /<div id="qr-code-placeholder"[^>]*>[\s\S]*?<\/div>/,
        `<img src="${qrCode}" alt="QR Code" style="max-width: 150px; height: auto; margin: 5px auto; display: block;" />`
      );
    }

    // Usar ventana pre-abierta si está disponible, sino abrir una nueva (igual que imprimirFacturaTermica)
    let ventanaImpresion = ventanaPreAbierta;
    
    if (!ventanaImpresion) {
      ventanaImpresion = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');
      
      if (!ventanaImpresion) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
      }
    }

    // Escribir HTML en la ventana
    ventanaImpresion.document.write(htmlConQR);
    ventanaImpresion.document.close();

    // Esperar a que se cargue y luego imprimir (igual que imprimirFacturaTermica)
    ventanaImpresion.onload = () => {
      setTimeout(() => {
        ventanaImpresion.print();
        console.log('✅ [imprimirTicketServicio] Impresión ejecutada');
        
        setTimeout(() => {
          // Cerrar ventana después de imprimir (igual que imprimirFacturaTermica)
          try {
            if (!ventanaImpresion.closed) {
              ventanaImpresion.close();
            }
          } catch (e) {
            // Ignorar errores al cerrar
          }
        }, 1000);
      }, 500); // Mismo delay que imprimirFacturaTermica
    };

    console.log('✅ [imprimirTicketServicio] Proceso de impresión iniciado');

  } catch (error) {
    console.error('❌ [imprimirTicketServicio] Error:', error);
    throw error;
  }
};

