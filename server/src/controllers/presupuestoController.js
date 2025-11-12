// server/src/controllers/presupuestoController.js - CONTROLLER ESPECÍFICO PARA PRESUPUESTOS 🎯
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { sendSuccess, sendError } = require('../utils/responses');
const prisma = new PrismaClient();

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

// 📝 CREAR PRESUPUESTO
const crearPresupuesto = async (req, res) => {
  try {
    // ✅ VALIDAR QUE EL USUARIO ESTÉ AUTENTICADO
    if (!req.user || !req.user.userId) {
      return sendError(res, 'Usuario no autenticado', 401);
    }
    
    const usuarioId = req.user.userId;

    const {
      numero,
      fecha,
      fechaVencimiento,
      validezDias,
      clienteId,
      clienteNombre,
      clienteCedulaRif,
      clienteTelefono,
      clienteEmail,
      items,
      subtotal,
      descuentoGlobal,
      tipoDescuento,
      impuestos,
      totalUsd,
      totalBs,
      tasaCambio,
      observaciones,
      exportConfig,
      estado
    } = req.body;

    if (!numero || !items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Número, items y cliente son requeridos', 400);
    }

    // Verificar si el número ya existe
    const existe = await prisma.presupuesto.findUnique({
      where: { numero }
    });

    if (existe) {
      return sendError(res, 'Ya existe un presupuesto con este número', 400);
    }

    const presupuesto = await prisma.presupuesto.create({
      data: {
        numero,
        fecha: new Date(fecha),
        fechaVencimiento: new Date(fechaVencimiento),
        validezDias: validezDias || 1,
        clienteId: clienteId || null,
        clienteNombre: clienteNombre || null,
        clienteCedulaRif: clienteCedulaRif || null,
        clienteTelefono: clienteTelefono || null,
        clienteEmail: clienteEmail || null,
        items: items,
        subtotal: parseFloat(subtotal) || 0,
        descuentoGlobal: parseFloat(descuentoGlobal) || 0,
        tipoDescuento: tipoDescuento || 'porcentaje',
        impuestos: parseFloat(impuestos) || 16,
        totalUsd: parseFloat(totalUsd) || 0,
        totalBs: parseFloat(totalBs) || 0,
        tasaCambio: parseFloat(tasaCambio) || 0,
        observaciones: observaciones || [],
        exportConfig: exportConfig || {},
        estado: estado || 'BORRADOR',
        creadoPorId: usuarioId // ✅ Usa el ID normalizado del usuario autenticado
      },
      include: {
        cliente: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    sendSuccess(res, presupuesto, 'Presupuesto creado exitosamente');
  } catch (error) {
    console.error('❌ Error creando presupuesto:', error);
    sendError(res, error.message, 500);
  }
};

// 📋 LISTAR PRESUPUESTOS
const listarPresupuestos = async (req, res) => {
  try {
    const { estado, clienteId, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = parseInt(clienteId);

    const [presupuestos, total] = await Promise.all([
      prisma.presupuesto.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              cedula_rif: true,
              telefono: true,
              email: true
            }
          },
          creadoPor: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.presupuesto.count({ where })
    ]);

    sendSuccess(res, {
      presupuestos,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }, 'Presupuestos obtenidos exitosamente');
  } catch (error) {
    console.error('❌ Error listando presupuestos:', error);
    sendError(res, error.message, 500);
  }
};

// 🔍 OBTENER PRESUPUESTO POR ID
const obtenerPresupuesto = async (req, res) => {
  try {
    const { id } = req.params;

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: parseInt(id) },
      include: {
        cliente: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!presupuesto) {
      return sendError(res, 'Presupuesto no encontrado', 404);
    }

    sendSuccess(res, presupuesto, 'Presupuesto obtenido exitosamente');
  } catch (error) {
    console.error('❌ Error obteniendo presupuesto:', error);
    sendError(res, error.message, 500);
  }
};

// ✏️ ACTUALIZAR PRESUPUESTO
const actualizarPresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizacion = req.body;

    // Eliminar campos que no se pueden actualizar directamente
    delete datosActualizacion.id;
    delete datosActualizacion.createdAt;
    delete datosActualizacion.creadoPorId;

    // Convertir fechas si existen
    if (datosActualizacion.fecha) {
      datosActualizacion.fecha = new Date(datosActualizacion.fecha);
    }
    if (datosActualizacion.fechaVencimiento) {
      datosActualizacion.fechaVencimiento = new Date(datosActualizacion.fechaVencimiento);
    }

    // Convertir números si existen
    if (datosActualizacion.subtotal !== undefined) {
      datosActualizacion.subtotal = parseFloat(datosActualizacion.subtotal);
    }
    if (datosActualizacion.descuentoGlobal !== undefined) {
      datosActualizacion.descuentoGlobal = parseFloat(datosActualizacion.descuentoGlobal);
    }
    if (datosActualizacion.impuestos !== undefined) {
      datosActualizacion.impuestos = parseFloat(datosActualizacion.impuestos);
    }
    if (datosActualizacion.totalUsd !== undefined) {
      datosActualizacion.totalUsd = parseFloat(datosActualizacion.totalUsd);
    }
    if (datosActualizacion.totalBs !== undefined) {
      datosActualizacion.totalBs = parseFloat(datosActualizacion.totalBs);
    }
    if (datosActualizacion.tasaCambio !== undefined) {
      datosActualizacion.tasaCambio = parseFloat(datosActualizacion.tasaCambio);
    }

    // Incrementar versión
    datosActualizacion.version = {
      increment: 1
    };

    const presupuesto = await prisma.presupuesto.update({
      where: { id: parseInt(id) },
      data: datosActualizacion,
      include: {
        cliente: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    sendSuccess(res, presupuesto, 'Presupuesto actualizado exitosamente');
  } catch (error) {
    console.error('❌ Error actualizando presupuesto:', error);
    if (error.code === 'P2025') {
      return sendError(res, 'Presupuesto no encontrado', 404);
    }
    sendError(res, error.message, 500);
  }
};

// 🗑️ ELIMINAR PRESUPUESTO (SOLO ADMIN)
const eliminarPresupuesto = async (req, res) => {
  try {
    // ✅ VALIDAR QUE SEA ADMIN
    if (!req.user || req.user.rol !== 'admin') {
      return sendError(res, 'Solo los administradores pueden eliminar presupuestos', 403);
    }
    
    const { id } = req.params;

    // Verificar que el presupuesto existe antes de eliminar
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: parseInt(id) }
    });

    if (!presupuesto) {
      return sendError(res, 'Presupuesto no encontrado', 404);
    }

    await prisma.presupuesto.delete({
      where: { id: parseInt(id) }
    });

    sendSuccess(res, { id: parseInt(id) }, 'Presupuesto eliminado exitosamente');
  } catch (error) {
    console.error('❌ Error eliminando presupuesto:', error);
    if (error.code === 'P2025') {
      return sendError(res, 'Presupuesto no encontrado', 404);
    }
    sendError(res, error.message, 500);
  }
};

module.exports = {
  crearPresupuesto,
  listarPresupuestos,
  obtenerPresupuesto,
  actualizarPresupuesto,
  eliminarPresupuesto,
  enviarPresupuestoPorEmail,
  enviarPresupuestoPorWhatsApp,
  obtenerEstadisticasPresupuestos
};