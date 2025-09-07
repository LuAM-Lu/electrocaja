  // server/src/services/whatsappService.js (VERSIÓN COMPLETA ACTUALIZADA)
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
      //this.limpiarSesionCompleta();
      
      // ✅ NUEVO: Verificar estado de sesión al construir
      this.verificarEstadoSesion();
    }

    // ✅ NUEVA FUNCIÓN: Verificar estado de sesión al inicio
    verificarEstadoSesion() {
      const sessionPath = path.join(__dirname, '../../whatsapp-session/session-electro-caja-session');
      
      if (fs.existsSync(sessionPath)) {
        try {
          const files = fs.readdirSync(sessionPath);
          const stats = fs.statSync(sessionPath);
          console.log('📂 Sesión WhatsApp encontrada:');
          console.log(`   📁 Archivos: ${files.length}`);
          console.log(`   📅 Última modificación: ${stats.mtime.toLocaleString()}`);
          console.log('   🔄 Se intentará restaurar automáticamente al inicializar');
        } catch (error) {
          console.log('⚠️ Error leyendo sesión WhatsApp:', error.message);
        }
      } else {
        console.log('📂 No hay sesión WhatsApp guardada - Se generará QR en primera conexión');
      }
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

    // ✅ INICIALIZACIÓN OPTIMIZADA CON RECONEXIÓN AUTOMÁTICA
    async inicializar() {
      if (this.client) {
        console.log('⚠️ Cliente WhatsApp ya inicializado');
        return;
      }
      
      console.log('📱 Inicializando WhatsApp Web...');
      
      // 🔍 VERIFICAR SI EXISTE SESIÓN GUARDADA
      const sessionPath = path.join(__dirname, '../../whatsapp-session/session-electro-caja-session');
      const existeSesion = fs.existsSync(sessionPath);
      
      if (existeSesion) {
        console.log('✅ Sesión existente encontrada, intentando restaurar automáticamente...');
      } else {
        console.log('🆕 Primera vez, se generará QR para nueva sesión');
      }
      
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'electro-caja-session',
          dataPath: './whatsapp-session'
        }),
        puppeteer: {
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
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
          executablePath: require('puppeteer').executablePath(),
          defaultViewport: null,
          devtools: false,
          slowMo: 0,
          timeout: 80000
        },
        webVersionCache: {
          type: 'local',
          path: './.wwebjs_cache'
        },
        authTimeoutMs: 90000,
        qrMaxRetries: 6,
        restartOnAuthFail: true,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 0
      });

      this._setupEventHandlers();
      
      try {
        await this.client.initialize();
        
        // 🕐 TIMEOUT PARA DETECTAR SI LA SESIÓN SE RESTAURÓ O NECESITA QR
        setTimeout(() => {
          if (!this.isReady && !this.qrCode) {
            console.log('⏰ Timeout esperando autenticación, puede que necesite QR');
          }
        }, 60000);
        
      } catch (error) {
        console.error('❌ Error inicializando WhatsApp:', error);
        throw error;
      }
    }

    // ✅ CONFIGURACIÓN DE EVENT HANDLERS MEJORADA
    _setupEventHandlers() {
      // QR generado (solo cuando no hay sesión)
      this.client.on('qr', (qr) => {
        console.log('📱 QR Code generado - Nueva autenticación requerida');
        this.qrCode = qr;
        qrcode.generate(qr, { small: true });
      });

      // ✅ NUEVO: Detectar cuando se carga sesión existente
      this.client.on('loading_screen', (percent, message) => {
        console.log(`⏳ Cargando WhatsApp Web: ${percent}% - ${message}`);
        if (message.includes('Restoring')) {
          console.log('🔄 Restaurando sesión guardada...');
        }
      });

      // Cliente listo
      this.client.on('ready', () => {
      console.log('*** EVENTO READY EJECUTÁNDOSE ***');
      console.log('Estado antes de actualizar:', {
        isReady: this.isReady,
        phoneNumber: this.phoneNumber
      });
      
      this.isReady = true;
      this.phoneNumber = this.client.info.wid.user;
      this.qrCode = null;
      
      console.log('*** ESTADO ACTUALIZADO EN READY ***');
      console.log('Estado después de actualizar:', {
        isReady: this.isReady,
        phoneNumber: this.phoneNumber
      });
      
      console.log('✅ WhatsApp Web está listo!');
      console.log('📞 Número conectado:', this.phoneNumber);
    });
      // Autenticación exitosa
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp autenticado correctamente');
      this.qrCode = null;
    });

    // Fallo de autenticación  
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Fallo de autenticación WhatsApp:', msg);
      this.isReady = false;
      
      // 🔄 INTENTAR LIMPIAR SESIÓN CORRUPTA Y REINICIAR
      console.log('🧹 Limpiando sesión corrupta...');
      this.limpiarSesionCompleta();
      
      setTimeout(async () => {
        console.log('🔄 Reiniciando tras fallo de autenticación...');
        await this.reinicializar();
      }, 5000);
    });

    // ✅ MEJORADO: Auto-reinicialización en desconexión
    this.client.on('disconnected', (reason) => {
      console.log('💀 WhatsApp desconectado:', reason);
      this.isReady = false;
      this.phoneNumber = null;
      
      // ⚡ REINICIALIZACIÓN INTELIGENTE
      if (reason === 'NAVIGATION') {
        console.log('🔄 Desconexión por navegación, reintentando inmediatamente...');
        setTimeout(async () => {
          await this.reinicializar();
        }, 2000);
      } else {
        console.log('🔄 Auto-reinicializando en 10 segundos...');
        setTimeout(async () => {
          await this.reinicializar();
        }, 10000);
      }
    });

    // Eventos de debug adicionales
    this.client.on('remote_session_saved', () => {
      console.log('💾 Sesión remota guardada');
    });
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

  // ✅ NUEVA FUNCIÓN: verificarSesionGuardada()
  verificarSesionGuardada() {
    const sessionPath = path.join(__dirname, '../../whatsapp-session/session-electro-caja-session');
    
    if (!fs.existsSync(sessionPath)) {
      return { existe: false, mensaje: 'No hay sesión guardada' };
    }
    
    try {
      const stats = fs.statSync(sessionPath);
      const archivos = fs.readdirSync(sessionPath);
      
      return {
        existe: true,
        mensaje: 'Sesión encontrada',
        fechaCreacion: stats.birthtime,
        fechaModificacion: stats.mtime,
        archivos: archivos.length,
        tamaño: this._calcularTamañoDirectorio(sessionPath)
      };
    } catch (error) {
      return { existe: false, mensaje: 'Error leyendo sesión: ' + error.message };
    }
  }

  _calcularTamañoDirectorio(dirPath) {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        totalSize += this._calcularTamañoDirectorio(filePath);
      } else {
        totalSize += stats.size;
      }
    });
    
    return Math.round(totalSize / 1024) + ' KB';
  }

  // ✅ FUNCIÓN DE DIAGNÓSTICO
  async diagnosticarConexion() {
    const diagnostico = {
      cliente: !!this.client,
      conectado: this.isReady,
      numero: this.phoneNumber,
      tieneQR: !!this.qrCode,
      sesionGuardada: this.verificarSesionGuardada()
    };
    
    if (this.client) {
      try {
        const state = await this.client.getState();
        diagnostico.estadoCliente = state;
      } catch (error) {
        diagnostico.estadoCliente = 'Error: ' + error.message;
      }
    }
    
    return diagnostico;
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
  const estado = {
    conectado: this.isReady,
    numero: this.phoneNumber,
    qrCode: this.qrCode
  };
  
  // DEBUG TEMPORAL
  console.log('getEstado() devolviendo:', estado);
  
  return estado;
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