// controllers/emailController.js
const nodemailer = require('nodemailer');

// Configurar transporter (ajustar según tu proveedor de email)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 📧 ENVIAR FACTURA POR EMAIL
const enviarFactura = async (req, res) => {
  try {
    const { destinatario, clienteNombre, codigoVenta, pdfBase64, asunto, mensaje } = req.body;
    
    if (!destinatario || !pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'Destinatario y PDF son requeridos'
      });
    }
    
    // Configurar email
    const mailOptions = {
      from: `"Electro Shop Morandín" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto || `Factura #${codigoVenta}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 20px; text-align: center;">
            <h1>Electro Shop Morandín C.A.</h1>
            <p>Comprobante de Compra</p>
          </div>
          
          <div style="padding: 20px;">
            <p>Estimado(a) <strong>${clienteNombre || 'Cliente'}</strong>,</p>
            
            <p>Adjunto encontrará su comprobante de compra <strong>#${codigoVenta}</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📄 Documento adjunto:</strong> Factura_${codigoVenta}.pdf</p>
            </div>
            
            <p>Gracias por su compra y confianza en nosotros.</p>
            
            <hr style="margin: 30px 0;">
            
            <div style="text-align: center; color: #666; font-size: 12px;">
              <p><strong>Electro Shop Morandín C.A.</strong></p>
              <p>RIF: J-405903333</p>
              <p>📱 WhatsApp: +58 257 251 1282</p>
              <p>📧 Email: electroshopmorandin@gmail.com</p>
              <p>📍 Dirección: [Tu dirección]</p>
            </div>
          </div>
        </div>
      `,
      attachments: [{
        filename: `Factura_${codigoVenta}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }]
    };
    
    // Enviar email
    const resultado = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente:', resultado.messageId);
    
    res.json({
      success: true,
      message: 'Factura enviada por email exitosamente',
      data: {
        messageId: resultado.messageId,
        destinatario: destinatario
      }
    });
    
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
};

module.exports = {
  enviarFactura
};