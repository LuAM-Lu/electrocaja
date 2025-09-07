// server/src/controllers/presupuestoController.js - CONTROLLER ESPECÍFICO PARA PRESUPUESTOS 🎯
const nodemailer = require('nodemailer');
const { sendSuccess, sendError } = require('../utils/responses');

// 🔧 Configurar transporter de email (reutilizando configuración)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 📧 ENVIAR PRESUPUESTO POR EMAIL
const enviarPresupuestoPorEmail = async (req, res) => {
  try {
    const { destinatario, clienteNombre, codigoPresupuesto, pdfBase64, asunto, mensaje } = req.body;
    
    console.log('📧 Procesando envío de presupuesto por email:', {
      destinatario,
      clienteNombre,
      codigoPresupuesto,
      tienePDF: !!pdfBase64
    });
    
    if (!destinatario || !pdfBase64 || !codigoPresupuesto) {
      return sendError(res, 'Destinatario, PDF y código de presupuesto son requeridos', 400);
    }
    
    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
      return sendError(res, 'Formato de email inválido', 400);
    }
    
    // Configurar email del presupuesto
    const mailOptions = {
      from: `"Electro Shop Morandín" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto || `Presupuesto #${codigoPresupuesto} - Electro Shop Morandín`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">📋 PRESUPUESTO SOLICITADO</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Electro Shop Morandín C.A.</p>
          </div>
          
          <!-- Contenido -->
          <div style="background: white; padding: 30px;">
            <p style="font-size: 16px; color: #1F2937; margin-bottom: 20px;">
              Estimado(a) <strong>${clienteNombre || 'Cliente'}</strong>,
            </p>
            
            <p style="font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 25px;">
              ${mensaje || `Adjunto encontrará el presupuesto <strong>#${codigoPresupuesto}</strong> que ha solicitado. Hemos preparado una cotización detallada con los mejores precios del mercado.`}
            </p>
            
            <!-- Info del presupuesto -->
            <div style="background: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1E40AF; font-size: 18px;">📋 Detalles del Presupuesto</h3>
              <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 200px;">
                  <p style="margin: 5px 0; color: #374151;"><strong>📄 Documento:</strong> Presupuesto_${codigoPresupuesto}.pdf</p>
                  <p style="margin: 5px 0; color: #374151;"><strong>📅 Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            </div>
            
            <!-- Instrucciones -->
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #15803D;">✅ Próximos Pasos:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #166534; line-height: 1.6;">
                <li>Revise el presupuesto adjunto</li>
                <li>Contáctenos si tiene alguna pregunta</li>
                <li>Confirme su pedido antes de la fecha de vencimiento</li>
                <li>Reciba su pedido en tiempo récord</li>
              </ul>
            </div>
            
            <!-- Contacto -->
            <div style="text-align: center; margin: 30px 0;">
              <h4 style="color: #1F2937; margin-bottom: 15px;">📞 ¿Necesita ayuda?</h4>
              <p style="margin: 5px 0; color: #6B7280;">
                <strong>📱 WhatsApp:</strong> 
                <a href="https://wa.me/582572511282" style="color: #059669; text-decoration: none;">+58 257 251 1282</a>
              </p>
              <p style="margin: 5px 0; color: #6B7280;">
                <strong>📧 Email:</strong> 
                <a href="mailto:electroshopmorandin@gmail.com" style="color: #059669; text-decoration: none;">electroshopmorandin@gmail.com</a>
              </p>
              <p style="margin: 5px 0; color: #6B7280;">
                <strong>📍 Dirección:</strong> Carrera 5ta, frente a la plaza Miranda
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #F3F4F6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; font-size: 12px; color: #6B7280;">
              Este email fue enviado automáticamente por ElectroCaja v1.0<br>
              <strong>Electro Shop Morandín C.A.</strong> | RIF: J-405903333
            </p>
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #9CA3AF;">
              📧 No responda a este email. Para consultas use nuestros canales de contacto.
            </p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `Presupuesto_${codigoPresupuesto}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }]
    };
    
    // Enviar email
    console.log('📧 Enviando email de presupuesto...');
    const resultado = await transporter.sendMail(mailOptions);
    
    console.log('✅ Presupuesto enviado por email exitosamente:', resultado.messageId);
    
    sendSuccess(res, {
      messageId: resultado.messageId,
      destinatario: destinatario,
      codigoPresupuesto: codigoPresupuesto,
      timestamp: new Date().toISOString()
    }, 'Presupuesto enviado por email exitosamente');
    
  } catch (error) {
    console.error('❌ Error enviando presupuesto por email:', error);
    sendError(res, error.message || 'Error interno del servidor', 500);
  }
};

// 📱 ENVIAR PRESUPUESTO POR WHATSAPP
const enviarPresupuestoPorWhatsApp = async (req, res) => {
  try {
    const { numero, clienteNombre, codigoPresupuesto, pdfBase64, mensaje, nombreArchivo } = req.body;
    
    console.log('📱 Procesando envío de presupuesto por WhatsApp:', {
      numero,
      clienteNombre,
      codigoPresupuesto,
      tienePDF: !!pdfBase64,
      nombreArchivo
    });
    
    if (!numero || !pdfBase64 || !codigoPresupuesto) {
      return sendError(res, 'Número, PDF y código de presupuesto son requeridos', 400);
    }
    
    // Importar servicio de WhatsApp
    const whatsappService = require('../services/whatsappService');
    
    // Verificar estado de WhatsApp
    const estado = whatsappService.getEstado();
    if (!estado.conectado) {
      console.log('🔄 WhatsApp desconectado, intentando reconectar...');
      const reconectado = await whatsappService.reconectar();
      
      if (!reconectado) {
        return sendError(res, 'WhatsApp no está disponible en este momento', 503);
      }
      
      // Esperar conexión
      let intentos = 0;
      while (intentos < 10 && !whatsappService.getEstado().conectado) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        intentos++;
      }
      
      if (!whatsappService.getEstado().conectado) {
        return sendError(res, 'WhatsApp no se pudo conectar', 503);
      }
    }
    
    // Crear archivo PDF temporal
    const fs = require('fs');
    const path = require('path');
    const rutaTemporal = path.join(__dirname, '../../uploads/temp', nombreArchivo || `presupuesto_${codigoPresupuesto}.pdf`);
    
    // Crear directorio si no existe
    const dirTemp = path.dirname(rutaTemporal);
    if (!fs.existsSync(dirTemp)) {
      fs.mkdirSync(dirTemp, { recursive: true });
    }
    
    // Escribir PDF
    fs.writeFileSync(rutaTemporal, pdfBase64, 'base64');
    
    console.log('📱 Enviando PDF por WhatsApp...');
    const resultado = await whatsappService.enviarPDF(
      numero, 
      mensaje, 
      rutaTemporal,
      nombreArchivo || `Presupuesto_${codigoPresupuesto}.pdf`
    );
    
    // Limpiar archivo temporal
    if (fs.existsSync(rutaTemporal)) {
      fs.unlinkSync(rutaTemporal);
    }
    
    if (resultado && resultado.success !== false) {
      console.log('✅ Presupuesto PDF enviado por WhatsApp exitosamente');
      
      sendSuccess(res, {
        messageId: resultado.messageId || 'sent_successfully',
        numero: numero,
        clienteNombre: clienteNombre,
        codigoPresupuesto: codigoPresupuesto,
        archivoEnviado: nombreArchivo,
        timestamp: new Date().toISOString()
      }, 'Presupuesto PDF enviado por WhatsApp exitosamente');
    } else {
      throw new Error(resultado?.message || 'Error enviando WhatsApp');
    }
    
  } catch (error) {
    console.error('❌ Error enviando presupuesto por WhatsApp:', error);
    sendError(res, error.message || 'Error interno del servidor', 500);
  }
};

// 📊 OBTENER ESTADÍSTICAS DE PRESUPUESTOS (FUTURO)
const obtenerEstadisticasPresupuestos = async (req, res) => {
  try {
    // TODO: Implementar cuando se agregue tabla de presupuestos a la BD
    sendSuccess(res, {
      totalPresupuestos: 0,
      presupuestosEnviados: 0,
      presupuestosConfirmados: 0,
      tasaConversion: 0,
      mensaje: 'Estadísticas no disponibles aún - Funcionalidad en desarrollo'
    }, 'Estadísticas obtenidas');
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    sendError(res, error.message, 500);
  }
};

module.exports = {
  enviarPresupuestoPorEmail,
  enviarPresupuestoPorWhatsApp,
  obtenerEstadisticasPresupuestos
};