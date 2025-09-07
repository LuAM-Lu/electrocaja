// server/src/services/whatsappService.js (VERSIÓN OPTIMIZADA)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.phoneNumber = null;
    
    // Limpiar sesión corrupta al iniciar
    this.limpiarSesionCompleta();
  }

  // ✅ FUNCIÓN PARA LIMPIAR SESIÓN COMPLETA
  limpiarSesionCompleta() {
    console.log('🧹 Limpiando sesión completa de WhatsApp...');
    
    try {
      // Limpiar directorio de sesión
      const sessionPath = path.join(__dirname, '../../whatsapp-session');
      if (fs.existsSync(sessionPath)) {
        console.log('🗑️ Eliminando ./whatsapp-session');
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      
      // Limpiar caché de WhatsApp Web.js
      const cachePath = path.join(__dirname, '../../.wwebjs_cache');
      if (fs.existsSync(cachePath)) {
        console.log('🗑️ Eliminando ./.wwebjs_cache');
        fs.rmSync(cachePath, { recursive: true, force: true });
      }
      
      console.log('✅ Limpieza completa realizada');
    } catch (error) {
      console.log('⚠️ Error en limpieza completa:', error.message);
    }
  }

  // ✅ FUNCIÓN CRÍTICA: _ensureReady()
  async _ensureReady(timeoutMs = 30000) {
    console.log('🔍 Verificando estado del cliente WhatsApp...');
    
    if (this.isReady) {
      console.log('✅ Cliente ya está listo');
      return true;
    }
    
    console.log('⏳ Esperando a que el cliente esté listo...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando cliente listo'));
      }, timeoutMs);
      
      // Si ya está listo, resolver inmediatamente
      if (this.isReady) {
        clearTimeout(timeout);
        resolve(true);
        return;
      }
      
      // Escuchar evento ready
      const onReady = () => {
        clearTimeout(timeout);
        this.client.off('ready', onReady);
        console.log('✅ Cliente listo después de espera');
        resolve(true);
      };
      
      this.client.on('ready', onReady);
    });
  }

  // ✅ FUNCIÓN PARA NORMALIZAR NÚMEROS
  _normalizePhoneNumber(numero) {
    console.log('📞 Normalizando número:', numero);
    
    // Limpiar número
    let cleanNumber = numero.replace(/[^\d+]/g, '');
    
    // Casos de normalización para Venezuela
    if (cleanNumber.startsWith('+58')) {
      cleanNumber = cleanNumber.substring(3); // Quitar +58
    } else if (cleanNumber.startsWith('58')) {
      cleanNumber = cleanNumber.substring(2); // Quitar 58
    } else if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1); // Quitar 0 inicial
    }
    
    // Formatear a WhatsApp: 58412XXXXXXX@c.us
    const whatsappNumber = `58${cleanNumber}@c.us`;
    
    console.log('📞 Número normalizado:', whatsappNumber);
    return whatsappNumber;
  }

  // ✅ CONFIGURACIÓN DE EVENT HANDLERS
  _setupEventHandlers() {
    // Evento: QR generado
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code generado');
      this.qrCode = qr;
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
      this.qrCode = null;
    });

    // Evento: Fallo de autenticación
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Fallo de autenticación WhatsApp:', msg);
      this.isReady = false;
    });

    // ✅ AUTO-REINICIALIZACIÓN EN DESCONEXIÓN
    this.client.on('disconnected', (reason) => {
      console.log('💀 WhatsApp desconectado:', reason);
      this.isReady = false;
      this.phoneNumber = null;
      
      // Auto-reinicializar después de desconexión
      console.log('🔄 Auto-reinicializando en 5 segundos...');
      setTimeout(async () => {
        try {
          await this.reinicializar();
        } catch (error) {
          console.error('❌ Error en auto-reinicialización:', error);
        }
      }, 5000);
    });

    // Eventos de debug
    this.client.on('loading_screen', (percent, message) => {
      console.log('⏳ Cargando WhatsApp Web:', percent, message);
    });

    this.client.on('remote_session_saved', () => {
      console.log('💾 Sesión remota guardada');
    });
  }

// ✅ INICIALIZACIÓN OPTIMIZADA - SOLO BAJO DEMANDA
async inicializar() {
  // 🚫 NO INICIALIZAR AUTOMÁTICAMENTE - Solo cuando se llame explícitamente
  if (this.client) {
    console.log('⚠️ Cliente WhatsApp ya inicializado');
    return;
  }
  
  console.log('📱 Inicializando WhatsApp Web BAJO DEMANDA...');
   
  this.client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'electro-caja-session',
      dataPath: './whatsapp-session'
    }),
    puppeteer: {
      headless: 'new',  // ✅ Headless moderno
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        // ✅ ELIMINADOS: --single-process, --display=:99
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-back-forward-cache',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
        '--memory-pressure-off',
        '--max_old_space_size=4096',
        '--disable-software-rasterizer',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio'
      ],
      // ✅ USAR CHROME DE PUPPETEER AUTOMÁTICAMENTE
      executablePath: require('puppeteer').executablePath(),
      defaultViewport: null,
      devtools: false,
      slowMo: 0,
      timeout: 60000
    },
    // ✅ CACHÉ LOCAL EN LUGAR DE REMOTO
    webVersionCache: {
      type: 'local',
      path: './.wwebjs_cache'
    },
    authTimeoutMs: 60000,
    qrMaxRetries: 5,
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0
  });

  // Evento: QR generado SOLO BAJO DEMANDA
  this.client.on('qr', (qr) => {
    console.log('📱 QR Code generado BAJO DEMANDA');
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

  // Configurar event handlers adicionales si los tienes
  if (this._setupEventHandlers && typeof this._setupEventHandlers === 'function') {
    this._setupEventHandlers();
  }
   
  // Inicializar cliente SOLO BAJO DEMANDA
  await this.client.initialize();
}

  // ✅ ENVÍO DE MENSAJE SIMPLE CON _ensureReady()
  async enviarMensaje(numero, mensaje) {
    try {
      // Asegurar que está listo
      await this._ensureReady();
      
      // Normalizar número
      const numeroFormateado = this._normalizePhoneNumber(numero);
      
      console.log('📱 Enviando mensaje a:', numeroFormateado);
      console.log('📄 Mensaje:', mensaje.substring(0, 100) + '...');
      
      // Verificar que el número existe en WhatsApp
      const numberDetails = await this.client.getNumberId(numeroFormateado);
      if (!numberDetails) {
        throw new Error(`Número ${numero} no está registrado en WhatsApp`);
      }
      
      console.log('✅ Número verificado:', numberDetails._serialized);
      
      const result = await this.client.sendMessage(numberDetails._serialized, mensaje);
      
      console.log('✅ Mensaje enviado exitosamente');
      
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

  // ✅ ENVÍO CON IMAGEN MEJORADO
  async enviarMensajeConImagen(numero, mensaje, imagenBase64) {
    try {
      // Asegurar que está listo
      await this._ensureReady();
      
      const { MessageMedia } = require('whatsapp-web.js');
      
      // Normalizar número
      const numeroFormateado = this._normalizePhoneNumber(numero);
      
      console.log('📱 Enviando mensaje con imagen a:', numeroFormateado);
      console.log('📄 Mensaje:', mensaje.substring(0, 50) + '...');
      console.log('🖼️ Imagen tamaño:', Math.round(imagenBase64.length / 1024), 'KB');
      
      // Verificar estado de conexión
      const state = await this.client.getState();
      console.log('🔍 Estado actual de WhatsApp:', state);
      
      if (state !== 'CONNECTED') {
        throw new Error(`WhatsApp no está conectado. Estado: ${state}`);
      }
      
      // Limpiar y validar base64
      let imagenLimpia;
      if (imagenBase64.startsWith('data:image')) {
        imagenLimpia = imagenBase64.split(',')[1];
      } else {
        imagenLimpia = imagenBase64;
      }
      
      // Validar base64
      try {
        const buffer = Buffer.from(imagenLimpia, 'base64');
        console.log('✅ Base64 válido, tamaño buffer:', Math.round(buffer.length / 1024), 'KB');
      } catch (error) {
        throw new Error('Imagen base64 inválida');
      }
      
      // Verificar número en WhatsApp
      const numberDetails = await this.client.getNumberId(numeroFormateado);
      if (!numberDetails) {
        throw new Error(`Número ${numero} no está registrado en WhatsApp`);
      }
      
      // Crear media
      const media = new MessageMedia(
        'image/jpeg',
        imagenLimpia,
        'comprobante.jpg'
      );
      
      console.log('📱 Enviando imagen a WhatsApp Web...');
      
      // Envío con reintentos
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`🔄 Intento ${attempts}/${maxAttempts}`);
          
          // Verificar conexión antes de cada intento
          const currentState = await this.client.getState();
          if (currentState !== 'CONNECTED') {
            throw new Error(`Perdió conexión. Estado: ${currentState}`);
          }
          
          const result = await Promise.race([
            this.client.sendMessage(numberDetails._serialized, media, {
              caption: mensaje,
              sendMediaAsSticker: false,
              sendMediaAsDocument: false
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout enviando mensaje')), 15000)
            )
          ]);
          
          console.log('✅ Mensaje con imagen enviado exitosamente en intento', attempts);
          
          let messageId = 'unknown';
          if (result && result.id && result.id._serialized) {
            messageId = result.id._serialized;
          } else if (result && result.id) {
            messageId = result.id;
          } else if (result) {
            messageId = 'sent_successfully';
          }
          
          return { success: true, messageId: messageId, attempts: attempts };
          
        } catch (attemptError) {
          console.error(`❌ Error en intento ${attempts}:`, attemptError.message);
          
          if (attempts === maxAttempts) {
            throw attemptError;
          }
          
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
    } catch (error) {
      console.error('❌ Error enviando mensaje con imagen:', error);
      
      // Fallback solo si no es error de conexión
      if (!error.message.includes('no está conectado') && !error.message.includes('Estado:')) {
        console.log('🔄 Intentando fallback: solo mensaje de texto...');
        try {
          // ✅ USAR _ensureReady() TAMBIÉN EN FALLBACK
          await this._ensureReady();
          const fallbackResult = await this.enviarMensaje(numero, mensaje + '\n\n📄 (Imagen no disponible por error técnico)');
          return { 
            success: true, 
            messageId: fallbackResult.messageId,
            fallback: true,
            originalError: error.message
          };
        } catch (fallbackError) {
          console.error('❌ Error en fallback:', fallbackError.message);
        }
      }
      
      throw new Error(`Error enviando WhatsApp: ${error.message}`);
    }
  }

  // ✅ MÉTODO SIMPLE PARA FALLBACK
  async enviarMensajeSimple(numero, mensaje) {
    try {
      // Asegurar que está listo
      await this._ensureReady();
      
      // Normalizar número
      const numeroFormateado = this._normalizePhoneNumber(numero);
      
      console.log('📱 [SIMPLE] Enviando mensaje a:', numeroFormateado);
      console.log('📄 [SIMPLE] Mensaje:', mensaje.substring(0, 100) + '...');
      
      // Verificar que el número existe en WhatsApp
      const numberDetails = await this.client.getNumberId(numeroFormateado);
      if (!numberDetails) {
        throw new Error(`Número ${numero} no está registrado en WhatsApp`);
      }
      
      console.log('✅ Número verificado en WhatsApp:', numberDetails._serialized);
      
      // Envío simple sin opciones adicionales
      const result = await this.client.sendMessage(numberDetails._serialized, mensaje);
      
      console.log('✅ [SIMPLE] Mensaje enviado exitosamente');
      
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
      console.error('❌ [SIMPLE] Error enviando mensaje:', error);
      throw error;
    }
  }

  // ✅ ENVÍO DE PDF
  async enviarPDF(numero, mensaje, rutaPDF, nombreArchivo) {
    try {
      // Asegurar que está listo
      await this._ensureReady();
      
      const { MessageMedia } = require('whatsapp-web.js');
      
      console.log('📄 WhatsappService - Enviando PDF:', {
        numero,
        archivo: nombreArchivo,
        rutaPDF,
        conectado: this.isReady
      });

      // Normalizar número
      const numeroFormateado = this._normalizePhoneNumber(numero);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(rutaPDF)) {
        throw new Error(`Archivo PDF no encontrado: ${rutaPDF}`);
      }
      
      // Verificar número en WhatsApp
      const numberDetails = await this.client.getNumberId(numeroFormateado);
      if (!numberDetails) {
        throw new Error(`Número ${numero} no está registrado en WhatsApp`);
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
      const resultado = await this.client.sendMessage(numberDetails._serialized, media, {
        caption: mensaje || `📄 ${nombreArchivo}`,
        sendMediaAsDocument: true
      });
      
      console.log('✅ PDF enviado exitosamente');
      
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

  // ✅ REINICIALIZACIÓN AUTOMÁTICA
  async reinicializar() {
    console.log('🔄 Reinicializando WhatsApp completamente...');
    
    try {
      // Limpiar cliente actual
      if (this.client) {
        try {
          await this.client.destroy();
        } catch (error) {
          console.log('⚠️ Error destruyendo cliente:', error.message);
        }
      }
      
      // Reset estados
      this.client = null;
      this.isReady = false;
      this.phoneNumber = null;
      this.qrCode = null;
      
      // Esperar un momento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reinicializar
      await this.inicializar();
      
      console.log('✅ Reinicialización completada');
      return true;
      
    } catch (error) {
      console.error('❌ Error en reinicialización:', error);
      return false;
    }
  }

  // ✅ RECONECTAR (ALIAS PARA COMPATIBILIDAD)
  async reconectar() {
    return await this.reinicializar();
  }

  // ✅ OBTENER ESTADO
  getEstado() {
    return {
      conectado: this.isReady,
      numero: this.phoneNumber,
      qrCode: this.qrCode
    };
  }

  // ✅ DESCONECTAR
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

// ✅ CLEANUP AL SALIR
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