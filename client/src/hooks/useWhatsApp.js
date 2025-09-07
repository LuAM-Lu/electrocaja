// hooks/useWhatsApp.js - VERSIÓN SIMPLIFICADA SIN CONFLICTOS
import { useAuthStore } from '../store/authStore';
import { api } from '../config/api';

export const useWhatsApp = () => {
  const { usuario } = useAuthStore();

  // 📩 FUNCIÓN ORIGINAL - Mantener igual
  const enviarNotificacion = async (tipo, datos) => {
    const configuraciones = {
      arqueo_diferencia: {
        numero: '+58414XXXXXXX', // Supervisor
        plantilla: `🚨 ALERTA ARQUEO - DIFERENCIA\n` +
                  `📍 Sucursal: ${datos.sucursal}\n` +
                  `👤 Usuario: ${datos.usuario}\n` +
                  `💰 Diferencia Bs: ${datos.diferencia_bs}\n` +
                  `💵 Diferencia USD: ${datos.diferencia_usd}\n` +
                  `🕐 ${new Date().toLocaleString('es-VE')}\n` +
                  `📝 ${datos.observaciones || 'Sin observaciones'}`
      },
      arqueo_normal: {
        numero: '+58414XXXXXXX',
        plantilla: `✅ Arqueo realizado\n` +
                  `📍 ${datos.sucursal} - ${datos.usuario}\n` +
                  `🕐 ${new Date().toLocaleTimeString('es-VE')}`
      },
      caja_cerrada: {
        numero: '+58414XXXXXXX',
        plantilla: `🔒 Caja cerrada\n` +
                  `📍 ${datos.sucursal}\n` +
                  `👤 ${datos.usuario}\n` +
                  `💰 Balance: ${datos.balance_bs} Bs / $${datos.balance_usd}\n` +
                  `🕐 ${new Date().toLocaleString('es-VE')}`
      }
    };

    const config = configuraciones[tipo];
    if (!config) return;

    console.log('📱 WHATSAPP NOTIFICATION:', {
      to: config.numero,
      message: config.plantilla,
      silent: tipo === 'arqueo_normal'
    });
  };

  // 📱 NUEVA FUNCIÓN - ENVIAR FACTURA POR WHATSAPP (SIN useState)
  const enviarFacturaWhatsApp = async (numero, ventaData, codigoVenta, tasaCambio, descuento = 0) => {
    try {
      console.log('📱 Preparando envío de factura por WhatsApp...');

      // Generar imagen usando printUtils
      const { generarImagenWhatsApp } = await import('../utils/printUtils');
      const imagenBase64 = await generarImagenWhatsApp(ventaData, codigoVenta, tasaCambio, descuento);

      // Preparar mensaje
      const clienteNombre = ventaData.cliente?.nombre || 'Cliente';
      const mensaje = `Hola ${clienteNombre}, aquí tienes tu comprobante de compra #${codigoVenta}.\n\n¡Gracias por tu preferencia! 🛒✨`;

      // Limpiar número de teléfono
      const numeroLimpio = numero.replace(/\D/g, '');
      
      console.log('📞 Enviando a número:', numeroLimpio);
      console.log('🎯 Código venta:', codigoVenta);

      // Enviar a la API del backend
      const response = await api.post('/whatsapp/enviar-factura', {
        numero: numeroLimpio,
        clienteNombre,
        codigoVenta,
        imagen: imagenBase64,
        mensaje
      });

      console.log('✅ Respuesta del servidor:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error al enviar factura por WhatsApp:', error);
      
      // Mensajes de error más específicos
      if (error.response?.status === 503) {
        throw new Error('WhatsApp no está conectado. Conecta WhatsApp desde Configuración.');
      } else if (error.response?.status === 400) {
        throw new Error('Datos inválidos para envío de WhatsApp');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message?.includes('Network Error')) {
        throw new Error('Error de conexión con el servidor');
      } else {
        throw new Error('Error al enviar la factura por WhatsApp');
      }
    }
  };

  // 📊 OBTENER ESTADO DE WHATSAPP (sin useState)
  const obtenerEstado = async () => {
    try {
      const response = await api.get('/whatsapp/estado');
      return response.data.data || { conectado: false };
    } catch (error) {
      console.error('Error obteniendo estado WhatsApp:', error);
      return { conectado: false };
    }
  };

  return { 
    enviarNotificacion,
    enviarFacturaWhatsApp,
    obtenerEstado
  };
};
