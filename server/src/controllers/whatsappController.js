// server/src/controllers/whatsappController.js (NUEVO)
const whatsappService = require('../services/whatsappService');
const { sendSuccess, sendError } = require('../utils/responses');
const fs = require('fs');
const path = require('path');

// Inicializar conexión WhatsApp
const conectar = async (req, res) => {
  try {
    console.log('🔄 Iniciando conexión WhatsApp...');
    
    await whatsappService.inicializar();
    
    sendSuccess(res, {
      mensaje: 'WhatsApp inicializado',
      estado: whatsappService.getEstado()
    });
    
  } catch (error) {
    console.error('❌ Error iniciando WhatsApp:', error);
    sendError(res, 'Error al inicializar WhatsApp', 500);
  }
};

// Obtener estado actual
const getEstado = async (req, res) => {
  try {
    const estado = whatsappService.getEstado();
    sendSuccess(res, estado);
  } catch (error) {
    sendError(res, 'Error obteniendo estado', 500);
  }
};

// Desconectar WhatsApp
const desconectar = async (req, res) => {
  try {
    await whatsappService.desconectar();
    sendSuccess(res, { mensaje: 'WhatsApp desconectado' });
  } catch (error) {
    sendError(res, 'Error al desconectar', 500);
  }
};

// Enviar mensaje (con o sin imagen)
const enviarMensaje = async (req, res) => {
  try {
    const { numero, mensaje, imagen } = req.body;
    
    if (!numero || !mensaje) {
      return sendError(res, 'Número y mensaje son requeridos', 400);
    }
    
    console.log('📥 Request recibido:', {
      numero,
      mensaje: mensaje.substring(0, 50) + '...',
      tiene_imagen: !!imagen,
      imagen_size: imagen ? Math.round(imagen.length / 1024) + 'KB' : 'sin imagen'
    });
    
    let result;
    
    if (imagen) {
      // Enviar con imagen
      console.log('🖼️ Enviando mensaje con imagen...');
      result = await whatsappService.enviarMensajeConImagen(numero, mensaje, imagen);
      console.log('✅ Resultado envío con imagen:', result);
    } else {
      // Enviar solo texto
      console.log('📝 Enviando solo mensaje de texto...');
      result = await whatsappService.enviarMensaje(numero, mensaje);
      console.log('✅ Resultado envío texto:', result);
    }
    
    // Asegurar que result tiene la estructura correcta
    if (result && result.success !== false) {
      console.log('✅ Enviando respuesta exitosa al frontend');
      sendSuccess(res, {
        ...result,
        imagen_enviada: !!imagen,
        tipo_envio: imagen ? 'con_imagen' : 'solo_texto'
      }, 'Mensaje enviado exitosamente');
    } else {
      console.log('❌ Resultado indica fallo:', result);
      sendError(res, result?.message || 'Error enviando mensaje', 500);
    }
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    console.error('❌ Stack trace:', error.stack);
    sendError(res, error.message, 500);
  }
};

// Enviar PDF por WhatsApp
const enviarPDF = async (req, res) => {
  try {
    const { numero, mensaje, rutaPDF, nombreArchivo } = req.body;
    
    if (!numero || !rutaPDF) {
      return sendError(res, 'Número y ruta del PDF son requeridos', 400);
    }
    
    console.log('📄 Enviando PDF por WhatsApp:', {
      numero,
      archivo: nombreArchivo,
      ruta: rutaPDF
    });
    
    
    if (!fs.existsSync(rutaPDF)) {
      return sendError(res, 'Archivo PDF no encontrado', 404);
    }
    
    // Construir ruta absoluta del PDF
    const path = require('path');
    const rutaAbsoluta = path.isAbsolute(rutaPDF) ? rutaPDF : path.join(__dirname, '../../', rutaPDF);
    
    console.log('📄 Ruta absoluta del PDF:', rutaAbsoluta);
    
    // Enviar PDF usando el servicio de WhatsApp
    const result = await whatsappService.enviarPDF(numero, mensaje, rutaAbsoluta, nombreArchivo);
    
    if (result && result.success !== false) {
      console.log('✅ PDF enviado exitosamente por WhatsApp');
      sendSuccess(res, {
        ...result,
        archivo_enviado: nombreArchivo,
        tamano_archivo: fs.statSync(rutaPDF).size
      }, 'PDF enviado exitosamente por WhatsApp');
    } else {
      console.log('❌ Error enviando PDF:', result);
      sendError(res, result?.message || 'Error enviando PDF', 500);
    }
    
  } catch (error) {
    console.error('❌ Error enviando PDF por WhatsApp:', error);
    sendError(res, error.message, 500);
  }
};

// server/src/controllers/whatsappController.js - BUSCAR Y REEMPLAZAR la función enviarFactura

const enviarFactura = async (req, res) => {
  try {
    const { numero, clienteNombre, codigoVenta, imagen, mensaje } = req.body;
    
    if (!numero || !imagen) {
      return res.status(400).json({
        success: false,
        message: 'Número y imagen son requeridos'
      });
    }
    
    console.log('📱 Enviando factura por WhatsApp:', {
      numero,
      clienteNombre,
      codigoVenta,
      tieneImagen: !!imagen,
      imagenTamaño: imagen ? Math.round(imagen.length / 1024) + 'KB' : 'sin imagen'
    });
    
    // 🆕 VERIFICAR ESTADO ANTES DE ENVIAR
    const estado = whatsappService.getEstado();
    if (!estado.conectado) {
      console.log('🔄 WhatsApp desconectado, intentando reconectar...');
      const reconectado = await whatsappService.reconectar();
      
      if (!reconectado) {
        return res.status(503).json({
          success: false,
          message: 'WhatsApp no está conectado y no se pudo reconectar',
          tipo: 'desconectado'
        });
      }
      
      // Esperar a que se conecte (máximo 30 segundos)
      let intentos = 0;
      while (intentos < 15 && !whatsappService.getEstado().conectado) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        intentos++;
      }
      
      if (!whatsappService.getEstado().conectado) {
        return res.status(503).json({
          success: false,
          message: 'WhatsApp no se pudo conectar en tiempo límite',
          tipo: 'timeout_conexion'
        });
      }
    }
    
    // ✅ LLAMAR AL SERVICE CON REINTENTOS
    let resultado;
    try {
      resultado = await whatsappService.enviarMensajeConImagen(
        numero, 
        mensaje || `Hola ${clienteNombre || 'Cliente'}, aquí tienes tu comprobante #${codigoVenta}`, 
        imagen
      );
    } catch (error) {
      // Si es error de conexión, intentar reconectar una vez más
      if (error.message.includes('no está conectado') || error.message.includes('Estado:')) {
        console.log('🔄 Error de conexión, reintentando con reconexión...');
        
        const reconectado = await whatsappService.reconectar();
        if (reconectado) {
          // Esperar y reintentar
          await new Promise(resolve => setTimeout(resolve, 5000));
          resultado = await whatsappService.enviarMensajeConImagen(numero, mensaje, imagen);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
    
    if (resultado && resultado.success !== false) {
      console.log('✅ Factura enviada por WhatsApp exitosamente');
      res.json({
        success: true,
        message: resultado.fallback 
          ? 'Mensaje enviado (sin imagen por error técnico)' 
          : 'Factura enviada por WhatsApp exitosamente',
        data: {
          ...resultado,
          cliente: clienteNombre,
          codigoVenta: codigoVenta
        }
      });
    } else {
      throw new Error(resultado?.message || 'Error enviando WhatsApp');
    }
    
  } catch (error) {
    console.error('❌ Error enviando factura por WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
      tipo: 'error_envio'
    });
  }
};

// 🧹 LIMPIAR SESIÓN FORZADAMENTE
const limpiarSesion = async (req, res) => {
  try {
    console.log('🧹 Limpiando sesión WhatsApp forzadamente...');
    
    // 1. Desconectar cliente actual si existe
    if (whatsappService.client) {
      try {
        await whatsappService.desconectar();
        console.log('✅ Cliente desconectado antes de limpiar');
      } catch (error) {
        console.log('⚠️ Error desconectando cliente:', error.message);
      }
    }
    
    // 2. Eliminar carpeta de sesión físicamente
    const fs = require('fs');
    const path = require('path');
    
    const sessionPath = path.join(__dirname, '../../whatsapp-session');
    const wwebjsAuthPath = path.join(__dirname, '../../.wwebjs_auth');
    
    // Eliminar ambas carpetas posibles
    const carpetasAEliminar = [sessionPath, wwebjsAuthPath];
    
    for (const carpeta of carpetasAEliminar) {
      if (fs.existsSync(carpeta)) {
        try {
          fs.rmSync(carpeta, { recursive: true, force: true });
          console.log(`✅ Carpeta eliminada: ${carpeta}`);
        } catch (error) {
          console.log(`⚠️ Error eliminando ${carpeta}:`, error.message);
        }
      } else {
        console.log(`ℹ️ Carpeta no existe: ${carpeta}`);
      }
    }
    
    // 3. Reinicializar servicio
    whatsappService.isReady = false;
    whatsappService.qrCode = null;
    whatsappService.phoneNumber = null;
    whatsappService.client = null;
    
    console.log('✅ Sesión WhatsApp limpiada completamente');
    
    sendSuccess(res, {
      message: 'Sesión WhatsApp limpiada exitosamente',
      carpetasEliminadas: carpetasAEliminar.filter(carpeta => 
        !fs.existsSync(carpeta) // Solo las que ya no existen
      )
    });
    
  } catch (error) {
    console.error('❌ Error limpiando sesión WhatsApp:', error);
    sendError(res, 'Error al limpiar sesión: ' + error.message, 500);
  }
};

// ✅ NUEVO: Diagnóstico completo de WhatsApp
const diagnostico = async (req, res) => {
  try {
    const diagnostico = await whatsappService.diagnosticarConexion();
    
    res.json({
      success: true,
      data: {
        ...diagnostico,
        timestamp: new Date().toISOString(),
        servidor: {
          uptime: process.uptime(),
          memoria: process.memoryUsage(),
          version_node: process.version
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo diagnóstico: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ✅ NUEVO: Forzar reconexión manual
const reconectar = async (req, res) => {
  try {
    console.log('🔄 Reconexión manual solicitada por usuario...');
    
    const resultado = await whatsappService.reconectar();
    
    if (resultado) {
      res.json({
        success: true,
        message: 'WhatsApp reinicializado exitosamente',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error en la reinicialización',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reconectando: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  conectar,
  getEstado,
  desconectar,
  enviarMensaje,
  enviarPDF,
  enviarFactura,
  limpiarSesion,  // 🆕 NUEVA FUNCIÓN
  diagnostico,    // ✅ NUEVA FUNCIÓN AGREGADA
  reconectar      // ✅ NUEVA FUNCIÓN AGREGADA
};