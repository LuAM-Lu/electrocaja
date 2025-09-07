// server/src/services/whatsappService.js (NUEVO)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppService {
  constructor() {
  this.client = null;
  this.isReady = false;
  this.qrCode = null;
  this.phoneNumber = null;
  
  // Limpiar archivos bloqueados al iniciar
  this.limpiarSesionBloqueada();
}

limpiarSesionBloqueada() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const sessionPath = path.join(__dirname, '../../whatsapp-session');
    if (fs.existsSync(sessionPath)) {
      console.log('🧹 Limpiando sesión anterior...');
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.log('⚠️ No se pudo limpiar sesión anterior:', error.message);
  }
}

  async inicializar() {
    console.log('📱 Inicializando WhatsApp Web...');
    
    this.client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'electro-caja-session',
    dataPath: './whatsapp-session'
  }),
      puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
          executablePath: '/usr/bin/chromium-browser'
        }
    });

    // Evento: QR generado
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code generado');
      this.qrCode = qr;
      
      // Mostrar QR en terminal (opcional)
      qrcode.generate(qr, { small: true });
    });

    // Evento: Cliente listo
    this.client.on('ready', () => {
      console.log('✅ WhatsApp Web está listo!');
      this.isReady = true;
      this.phoneNumber = this.client.info.wid.user;
      console.log('📞 Número conectado:', this.phoneNumber);
    });

    // Evento: Autenticación exitosa
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp autenticado correctamente');
      this.qrCode = null; // Limpiar QR al autenticar
    });

    // Evento: Fallo de autenticación
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Fallo de autenticación WhatsApp:', msg);
      this.isReady = false;
    });

    // Evento: Desconectado
    this.client.on('disconnected', (reason) => {
      console.log('💀 WhatsApp desconectado:', reason);
      this.isReady = false;
      this.phoneNumber = null;
    });

    // Inicializar cliente
    await this.client.initialize();
  }

  async enviarMensaje(numero, mensaje) {
    if (!this.isReady) {
      throw new Error('WhatsApp no está conectado');
    }

    try {
      // Formatear número (remover + y agregar @c.us)
      const numeroFormateado = numero.replace('+', '') + '@c.us';
      
      console.log('📱 Enviando mensaje a:', numeroFormateado);
      console.log('📄 Mensaje:', mensaje);
      
      const result = await this.client.sendMessage(numeroFormateado, mensaje);
      
      console.log('✅ Mensaje enviado exitosamente');
      console.log('🔍 DEBUG result texto:', result);
      
      // Manejo seguro de result.id
      let messageId = 'unknown';
      if (result && result.id && result.id._serialized) {
        messageId = result.id._serialized;
      } else if (result && result.id) {
        messageId = result.id;
      } else if (result) {
        messageId = 'sent_successfully';
      }
      
      return { success: true, messageId: messageId };
      
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      throw error;
    }
  }

async enviarMensajeConImagen(numero, mensaje, imagenBase64) {
  if (!this.isReady) {
    throw new Error('WhatsApp no está conectado');
  }

  try {
    const { MessageMedia } = require('whatsapp-web.js');
    
    // Formatear número
    const numeroFormateado = numero.replace('+', '') + '@c.us';
    
    console.log('📱 Enviando mensaje con imagen a:', numeroFormateado);
    console.log('📄 Mensaje:', mensaje);
    console.log('🖼️ Imagen tamaño:', Math.round(imagenBase64.length / 1024), 'KB');
    
    // 🔧 LIMPIAR Y VALIDAR BASE64
    let imagenLimpia;
    if (imagenBase64.startsWith('data:image')) {
      imagenLimpia = imagenBase64.split(',')[1];
    } else {
      imagenLimpia = imagenBase64;
    }
    
    // 🔧 VALIDAR QUE SEA BASE64 VÁLIDO
    try {
      Buffer.from(imagenLimpia, 'base64');
    } catch (error) {
      throw new Error('Imagen base64 inválida');
    }
    
    // 🖼️ CREAR MEDIA CON FORMATO ESPECÍFICO
    const media = new MessageMedia(
      'image/png', 
      imagenLimpia,
      'factura.png'
    );
    
    console.log('📱 Enviando imagen a WhatsApp Web...');
    
    // 🚀 ENVIAR CON RETRY Y TIMEOUT
    const result = await Promise.race([
      this.client.sendMessage(numeroFormateado, media, {
        caption: mensaje,
        sendMediaAsSticker: false,
        sendMediaAsDocument: false
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout enviando mensaje')), 30000)
      )
    ]);
    
    console.log('✅ Mensaje con imagen enviado exitosamente');
    console.log('🔍 DEBUG result:', result);
    
    // Manejo seguro de result.id
    let messageId = 'unknown';
    if (result && result.id && result.id._serialized) {
      messageId = result.id._serialized;
    } else if (result && result.id) {
      messageId = result.id;
    } else if (result) {
      messageId = 'sent_successfully';
    }
    
    return { success: true, messageId: messageId };
    
  } catch (error) {
    console.error('❌ Error enviando mensaje con imagen:', error);
    
    // 🔄 FALLBACK: Intentar enviar solo el mensaje de texto
    console.log('🔄 Intentando fallback: solo mensaje de texto...');
    try {
      const fallbackResult = await this.enviarMensaje(numero, mensaje + '\n\n📄 (Imagen no disponible por error técnico)');
      return { 
        success: true, 
        messageId: fallbackResult.messageId,
        fallback: true,
        originalError: error.message
      };
    } catch (fallbackError) {
      throw new Error(`Error enviando imagen: ${error.message}. Error fallback: ${fallbackError.message}`);
    }
  }
}

// 📄 ENVIAR PDF POR WHATSAPP
  async enviarPDF(numero, mensaje, rutaPDF, nombreArchivo) {
    if (!this.isReady) {
      throw new Error('WhatsApp no está conectado');
    }

    try {
      const { MessageMedia } = require('whatsapp-web.js');
      const fs = require('fs');
      const path = require('path');
      
      console.log('📄 WhatsappService - Enviando PDF:', {
        numero,
        archivo: nombreArchivo,
        rutaPDF,
        conectado: this.isReady
      });

      // Formatear número
      const numeroFormateado = numero.replace('+', '') + '@c.us';
      
      // Verificar que el archivo existe
      if (!fs.existsSync(rutaPDF)) {
        throw new Error(`Archivo PDF no encontrado: ${rutaPDF}`);
      }
      
      // Leer el archivo PDF
      const pdfBuffer = fs.readFileSync(rutaPDF);
      console.log('📄 PDF leído, tamaño:', Math.round(pdfBuffer.length / 1024), 'KB');
      
      // Crear media object para PDF
      const media = new MessageMedia(
        'application/pdf', 
        pdfBuffer.toString('base64'), 
        nombreArchivo
      );
      
      console.log('📄 Enviando PDF a WhatsApp Web...');
      
      // Enviar PDF con mensaje como caption
      const resultado = await this.client.sendMessage(numeroFormateado, media, {
        caption: mensaje || `📄 ${nombreArchivo}`,
        sendMediaAsDocument: true // Enviar como documento
      });
      
      console.log('✅ PDF enviado exitosamente');
      console.log('🔍 DEBUG result PDF:', resultado);
      
      // Manejo seguro de result.id
      let messageId = 'unknown';
      if (resultado && resultado.id && resultado.id._serialized) {
        messageId = resultado.id._serialized;
      } else if (resultado && resultado.id) {
        messageId = resultado.id;
      } else if (resultado) {
        messageId = 'sent_successfully';
      }
      
      return {
        success: true,
        messageId: messageId,
        numero: numeroFormateado,
        archivo: nombreArchivo,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error enviando PDF:', error);
      throw error;
    }
  }
  

  getEstado() {
    return {
      conectado: this.isReady,
      numero: this.phoneNumber,
      qrCode: this.qrCode
    };
  }

 async desconectar() {
  if (this.client) {
    console.log('💀 Desconectando WhatsApp...');
    try {
      await this.client.logout();
      await this.client.destroy();
    } catch (error) {
      console.log('⚠️ Error al desconectar WhatsApp:', error.message);
      // Forzar limpieza
      this.client = null;
    }
    this.isReady = false;
    this.phoneNumber = null;
    this.qrCode = null;
  }
}
  
}

// Cleanup al salir
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando WhatsApp Service...');
  const service = module.exports;
  if (service && service.client) {
    try {
      await service.desconectar();
    } catch (error) {
      console.log('⚠️ Error al cerrar WhatsApp:', error.message);
    }
  }
  process.exit();
});

// Exportar instancia única
module.exports = new WhatsAppService();