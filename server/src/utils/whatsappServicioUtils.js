// server/src/utils/whatsappServicioUtils.js
// Utilidades para enviar mensajes de WhatsApp relacionados con servicios técnicos

const whatsappService = require('../services/whatsappService');

/**
 * Genera mensaje de WhatsApp para el cliente cuando se crea una orden
 * @param {Object} servicio - Datos del servicio
 * @param {string} linkSeguimiento - Link de seguimiento público
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 * @returns {string} Mensaje formateado para WhatsApp
 */
const generarMensajeCliente = (servicio, linkSeguimiento, tasaCambio = 37.50) => {
  const fechaEntrega = servicio.fechaEntregaEstimada 
    ? new Date(servicio.fechaEntregaEstimada).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : 'Por confirmar';

  const problemas = Array.isArray(servicio.problemas) 
    ? servicio.problemas.join(', ')
    : servicio.problemas || '—';

  const totalEstimado = parseFloat(servicio.totalEstimado || 0);
  const totalPagado = parseFloat(servicio.totalPagado || 0);
  const saldoPendiente = parseFloat(servicio.saldoPendiente || 0);

  // 🆕 Convertir montos a Bs usando la tasa de cambio
  const tasa = parseFloat(tasaCambio) || 37.50;
  const totalEstimadoBs = totalEstimado * tasa;
  const totalPagadoBs = totalPagado * tasa;
  const saldoPendienteBs = saldoPendiente * tasa;

  // Formatear montos en Bs
  const formatearBs = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  let mensaje = `🔧 *ORDEN DE SERVICIO TÉCNICO*\n\n`;
  mensaje += `*Número de Orden:* ${servicio.numeroServicio}\n`;
  mensaje += `*Fecha:* ${new Date().toLocaleDateString('es-VE')}\n\n`;
  
  mensaje += `*INFORMACIÓN DEL DISPOSITIVO:*\n`;
  mensaje += `Marca: ${servicio.dispositivoMarca}\n`;
  mensaje += `Modelo: ${servicio.dispositivoModelo}\n`;
  if (servicio.dispositivoColor) {
    mensaje += `Color: ${servicio.dispositivoColor}\n`;
  }
  mensaje += `IMEI: ${servicio.dispositivoImei || 'N/A'}\n`;
  
  // Mostrar accesorios si existen
  if (servicio.accesorios && Array.isArray(servicio.accesorios) && servicio.accesorios.length > 0) {
    mensaje += `Accesorios Dejados: ${servicio.accesorios.join(', ')}\n`;
  } else if (servicio.accesorios && typeof servicio.accesorios === 'string' && servicio.accesorios.trim()) {
    mensaje += `Accesorios Dejados: ${servicio.accesorios}\n`;
  }
  
  mensaje += `\n`;
  
  mensaje += `*PROBLEMAS REPORTADOS:*\n${problemas}\n\n`;
  
  mensaje += `*TÉCNICO ASIGNADO:*\n${servicio.tecnicoAsignado || 'Por asignar'}\n\n`;
  
  // 🆕 PRODUCTOS/ITEMS INCLUIDOS EN LA ORDEN
  if (servicio.items && Array.isArray(servicio.items) && servicio.items.length > 0) {
    mensaje += `*PRODUCTOS/ITEMS INCLUIDOS:*\n`;
    servicio.items.forEach((item, index) => {
      const cantidad = parseInt(item.cantidad) || 1;
      const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || 0);
      const subtotal = parseFloat(item.subtotal || cantidad * precioUnitario);
      const subtotalBs = subtotal * tasa;
      
      mensaje += `${index + 1}. ${item.descripcion}\n`;
      mensaje += `   Cantidad: ${cantidad}\n`;
      mensaje += `   Precio Unit: ${formatearBs(precioUnitario * tasa)} Bs\n`;
      mensaje += `   Subtotal: ${formatearBs(subtotalBs)} Bs\n`;
      
      if (item.esPersonalizado) {
        mensaje += `   (Item personalizado)\n`;
      }
      mensaje += `\n`;
    });
  }
  
  mensaje += `*INFORMACIÓN FINANCIERA:*\n`;
  mensaje += `Total Estimado: ${formatearBs(totalEstimadoBs)} Bs\n`;
  if (totalPagado > 0) {
    mensaje += `Pago Inicial: ${formatearBs(totalPagadoBs)} Bs\n`;
  }
  if (saldoPendiente > 0) {
    mensaje += `Saldo Pendiente: ${formatearBs(saldoPendienteBs)} Bs\n`;
  }
  mensaje += `Tasa de Cambio: ${formatearBs(tasa)} Bs/USD\n`;
  mensaje += `\n`;
  
  mensaje += `*FECHA ESTIMADA DE ENTREGA:*\n${fechaEntrega}\n\n`;
  
  mensaje += `*CONTRATO DE ACEPTACIÓN:*\n`;
  mensaje += `Al recibir este mensaje, usted acepta:\n`;
  mensaje += `✓ Que el dispositivo será reparado según los problemas reportados\n`;
  mensaje += `✓ Que el costo estimado es de ${formatearBs(totalEstimadoBs)} Bs\n`;
  mensaje += `✓ Que debe retirar el dispositivo en la fecha estimada\n`;
  mensaje += `✓ Que cualquier cambio en el diagnóstico será comunicado\n`;
  mensaje += `✓ Que debe presentar este ticket al retirar\n\n`;
  
  if (linkSeguimiento) {
    mensaje += `*SEGUIMIENTO EN LÍNEA:*\n`;
    mensaje += `Puede seguir el progreso de su orden escaneando el código QR en su ticket o visitando:\n`;
    mensaje += `${linkSeguimiento}\n\n`;
  }
  
  mensaje += `*CONTACTO:*\n`;
  mensaje += `WhatsApp: +58 257 251 1282\n`;
  mensaje += `Instagram: @electroshopgre\n\n`;
  
  mensaje += `Gracias por confiar en Electro Shop Morandin C.A.`;

  return mensaje;
};

/**
 * Genera mensaje de WhatsApp para el técnico cuando se asigna una orden
 * @param {Object} servicio - Datos del servicio
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 * @returns {string} Mensaje formateado para WhatsApp
 */
const generarMensajeTecnico = (servicio, tasaCambio = 37.50) => {
  const problemas = Array.isArray(servicio.problemas) 
    ? servicio.problemas.join(', ')
    : servicio.problemas || '—';

  const totalEstimado = parseFloat(servicio.totalEstimado || 0);
  
  // 🆕 Convertir montos a Bs usando la tasa de cambio
  const tasa = parseFloat(tasaCambio) || 37.50;
  const totalEstimadoBs = totalEstimado * tasa;

  // Formatear montos en Bs
  const formatearBs = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  let mensaje = `🔧 *NUEVA ORDEN DE SERVICIO ASIGNADA*\n\n`;
  mensaje += `*Número de Orden:* ${servicio.numeroServicio}\n`;
  mensaje += `*Fecha:* ${new Date().toLocaleDateString('es-VE')}\n\n`;
  
  mensaje += `*Cliente:*\n${servicio.clienteNombre}\n`;
  mensaje += `Tel: ${servicio.clienteTelefono || 'N/A'}\n\n`;
  
  mensaje += `*Dispositivo:*\n`;
  mensaje += `${servicio.dispositivoMarca} ${servicio.dispositivoModelo}\n`;
  mensaje += `IMEI: ${servicio.dispositivoImei || 'N/A'}\n\n`;
  
  mensaje += `*Problemas Reportados:*\n${problemas}\n\n`;
  
  // 🆕 PRODUCTOS/ITEMS INCLUIDOS EN LA ORDEN
  if (servicio.items && Array.isArray(servicio.items) && servicio.items.length > 0) {
    mensaje += `*PRODUCTOS/ITEMS INCLUIDOS:*\n`;
    servicio.items.forEach((item, index) => {
      const cantidad = parseInt(item.cantidad) || 1;
      const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || 0);
      const subtotal = parseFloat(item.subtotal || cantidad * precioUnitario);
      const subtotalBs = subtotal * tasa;
      
      mensaje += `${index + 1}. ${item.descripcion}\n`;
      mensaje += `   Cantidad: ${cantidad}\n`;
      mensaje += `   Precio Unit: ${formatearBs(precioUnitario * tasa)} Bs\n`;
      mensaje += `   Subtotal: ${formatearBs(subtotalBs)} Bs\n`;
      
      if (item.esPersonalizado) {
        mensaje += `   (Item personalizado)\n`;
      }
      mensaje += `\n`;
    });
  }
  
  mensaje += `*Total Estimado:* ${formatearBs(totalEstimadoBs)} Bs\n\n`;
  
  mensaje += `Por favor, proceda con el diagnóstico del dispositivo.`;

  return mensaje;
};

/**
 * Envía mensaje de WhatsApp al cliente cuando se crea una orden
 * @param {Object} servicio - Datos del servicio
 * @param {string} linkSeguimiento - Link de seguimiento público
 * @param {string} imagenTicket - Imagen del ticket en base64 (opcional)
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 * @returns {Promise<Object>} Resultado del envío
 */
const enviarWhatsAppCliente = async (servicio, linkSeguimiento, imagenTicket = null, tasaCambio = 37.50) => {
  try {
    if (!servicio.clienteTelefono) {
      console.log('⚠️ Cliente no tiene teléfono, omitiendo WhatsApp');
      return { success: false, message: 'Cliente sin teléfono' };
    }

    const mensaje = generarMensajeCliente(servicio, linkSeguimiento, tasaCambio);
    
    // Verificar estado de WhatsApp
    const estado = whatsappService.getEstado();
    if (!estado.conectado) {
      console.log('🔄 WhatsApp desconectado, intentando reconectar...');
      const reconectado = await whatsappService.reconectar();
      
      if (!reconectado) {
        return { success: false, message: 'WhatsApp no está conectado' };
      }
      
      // Esperar conexión
      let intentos = 0;
      while (intentos < 15 && !whatsappService.getEstado().conectado) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        intentos++;
      }
      
      if (!whatsappService.getEstado().conectado) {
        return { success: false, message: 'WhatsApp no se pudo conectar' };
      }
    }

    // Enviar mensaje con o sin imagen
    let resultado;
    if (imagenTicket) {
      resultado = await whatsappService.enviarMensajeConImagen(
        servicio.clienteTelefono,
        mensaje,
        imagenTicket
      );
    } else {
      resultado = await whatsappService.enviarMensaje(
        servicio.clienteTelefono,
        mensaje
      );
    }

    return resultado;

  } catch (error) {
    console.error('❌ Error enviando WhatsApp al cliente:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Envía mensaje de WhatsApp al técnico cuando se asigna una orden
 * @param {Object} servicio - Datos del servicio
 * @param {string} telefonoTecnico - Teléfono del técnico
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 * @returns {Promise<Object>} Resultado del envío
 */
const enviarWhatsAppTecnico = async (servicio, telefonoTecnico, tasaCambio = 37.50) => {
  try {
    if (!telefonoTecnico) {
      console.log('⚠️ Técnico no tiene teléfono configurado, omitiendo WhatsApp');
      return { success: false, message: 'Técnico sin teléfono' };
    }

    const mensaje = generarMensajeTecnico(servicio, tasaCambio);
    
    // Verificar estado de WhatsApp
    const estado = whatsappService.getEstado();
    if (!estado.conectado) {
      console.log('🔄 WhatsApp desconectado, intentando reconectar...');
      const reconectado = await whatsappService.reconectar();
      
      if (!reconectado) {
        return { success: false, message: 'WhatsApp no está conectado' };
      }
      
      // Esperar conexión
      let intentos = 0;
      while (intentos < 15 && !whatsappService.getEstado().conectado) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        intentos++;
      }
      
      if (!whatsappService.getEstado().conectado) {
        return { success: false, message: 'WhatsApp no se pudo conectar' };
      }
    }

    // Enviar mensaje
    const resultado = await whatsappService.enviarMensaje(
      telefonoTecnico,
      mensaje
    );

    return resultado;

  } catch (error) {
    console.error('❌ Error enviando WhatsApp al técnico:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Genera mensaje de WhatsApp para abono (solo información financiera)
 * @param {Object} servicio - Datos del servicio
 * @param {Object} pagoData - Datos del abono registrado
 * @param {string} linkSeguimiento - Link de seguimiento público
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 * @returns {string} Mensaje formateado para WhatsApp
 */
const generarMensajeAbono = (servicio, pagoData, linkSeguimiento, tasaCambio = 37.50) => {
  const totalEstimado = parseFloat(servicio.totalEstimado || 0);
  const totalPagado = parseFloat(servicio.totalPagado || 0);
  const saldoPendiente = parseFloat(servicio.saldoPendiente || 0);

  // Convertir montos a Bs usando la tasa de cambio
  const tasa = parseFloat(tasaCambio) || 37.50;
  const totalEstimadoBs = totalEstimado * tasa;
  const totalPagadoBs = totalPagado * tasa;
  const saldoPendienteBs = saldoPendiente * tasa;

  // Formatear montos en Bs
  const formatearBs = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // 🆕 Calcular monto del abono en ambas monedas para mostrar correctamente
  let montoAbonoBs = 0;
  let montoAbonoUsd = 0;
  
  if (Array.isArray(pagoData.pagos)) {
    pagoData.pagos.forEach(p => {
      const monto = parseFloat(p.monto || 0);
      const moneda = p.moneda || 'bs';
      if (moneda === 'usd') {
        montoAbonoUsd += monto;
        montoAbonoBs += monto * tasa;
      } else {
        montoAbonoBs += monto;
      }
    });
  }

  // Formatear métodos de pago respetando la moneda original
  const metodosPago = Array.isArray(pagoData.pagos) ? pagoData.pagos.map(p => {
    const metodo = p.metodo || '';
    const monto = parseFloat(p.monto || 0);
    const moneda = p.moneda || 'bs';
    
    const nombresMetodos = {
      'efectivo_bs': 'Efectivo Bs',
      'efectivo_usd': 'Efectivo USD',
      'pago_movil': 'Pago Móvil',
      'transferencia': 'Transferencia',
      'zelle': 'Zelle',
      'binance': 'Binance',
      'tarjeta': 'Tarjeta'
    };
    
    // 🆕 Mostrar monto en la moneda original del método de pago
    if (moneda === 'usd') {
      return `• ${nombresMetodos[metodo] || metodo}: $${monto.toFixed(2)} USD`;
    } else {
      return `• ${nombresMetodos[metodo] || metodo}: ${formatearBs(monto)} Bs`;
    }
  }).join('\n') : '—';

  let mensaje = `💰 *COMPROBANTE DE ABONO*\n\n`;
  mensaje += `*Orden:* #${servicio.numeroServicio}\n`;
  mensaje += `*Fecha:* ${new Date().toLocaleDateString('es-VE')}\n\n`;
  
  mensaje += `*RESUMEN FINANCIERO:*\n`;
  mensaje += `Total Estimado: ${formatearBs(totalEstimadoBs)} Bs\n`;
  mensaje += `Total Pagado: ${formatearBs(totalPagadoBs)} Bs\n\n`;
  
  mensaje += `*ABONO REGISTRADO:*\n`;
  // 🆕 Mostrar abono en la moneda correspondiente
  if (montoAbonoUsd > 0 && montoAbonoBs > 0) {
    mensaje += `${formatearBs(montoAbonoBs)} Bs / $${montoAbonoUsd.toFixed(2)} USD\n\n`;
  } else if (montoAbonoUsd > 0) {
    mensaje += `$${montoAbonoUsd.toFixed(2)} USD\n\n`;
  } else {
    mensaje += `${formatearBs(montoAbonoBs)} Bs\n\n`;
  }
  
  mensaje += `*MÉTODOS DE PAGO:*\n`;
  mensaje += `${metodosPago}\n\n`;
  
  mensaje += `*SALDO PENDIENTE:*\n`;
  mensaje += `${formatearBs(saldoPendienteBs)} Bs\n\n`;
  
  mensaje += `Tasa de Cambio: ${formatearBs(tasa)} Bs/USD\n\n`;
  
  if (linkSeguimiento) {
    mensaje += `*SEGUIMIENTO EN LÍNEA:*\n`;
    mensaje += `${linkSeguimiento}\n\n`;
  }
  
  mensaje += `*CONTACTO:*\n`;
  mensaje += `WhatsApp: +58 257 251 1282\n`;
  mensaje += `Instagram: @electroshopgre\n\n`;
  
  mensaje += `Gracias por su pago.`;

  return mensaje;
};

/**
 * Envía mensaje de WhatsApp de abono al cliente
 * @param {Object} servicio - Datos del servicio
 * @param {Object} pagoData - Datos del abono registrado
 * @param {string} linkSeguimiento - Link de seguimiento público
 * @param {string} imagenTicket - Imagen del ticket en base64 (opcional)
 * @param {number} tasaCambio - Tasa de cambio actual (Bs/USD)
 * @returns {Promise<Object>} Resultado del envío
 */
const enviarWhatsAppAbono = async (servicio, pagoData, linkSeguimiento, imagenTicket = null, tasaCambio = 37.50) => {
  try {
    if (!servicio.clienteTelefono) {
      console.log('⚠️ Cliente no tiene teléfono, omitiendo WhatsApp');
      return { success: false, message: 'Cliente sin teléfono' };
    }

    const mensaje = generarMensajeAbono(servicio, pagoData, linkSeguimiento, tasaCambio);
    
    // Verificar estado de WhatsApp
    const estado = whatsappService.getEstado();
    if (!estado.conectado) {
      console.log('🔄 WhatsApp desconectado, intentando reconectar...');
      const reconectado = await whatsappService.reconectar();
      
      if (!reconectado) {
        return { success: false, message: 'WhatsApp no está conectado' };
      }
      
      // Esperar conexión
      let intentos = 0;
      while (intentos < 15 && !whatsappService.getEstado().conectado) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        intentos++;
      }
      
      if (!whatsappService.getEstado().conectado) {
        return { success: false, message: 'WhatsApp no se pudo conectar' };
      }
    }

    // Enviar mensaje con o sin imagen
    let resultado;
    if (imagenTicket) {
      resultado = await whatsappService.enviarMensajeConImagen(
        servicio.clienteTelefono,
        mensaje,
        imagenTicket
      );
    } else {
      resultado = await whatsappService.enviarMensaje(
        servicio.clienteTelefono,
        mensaje
      );
    }

    return resultado;

  } catch (error) {
    console.error('❌ Error enviando WhatsApp de abono:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Genera mensaje de WhatsApp cuando el servicio está LISTO_RETIRO
 */
const generarMensajeListoRetiro = (servicio, linkSeguimiento, tasaCambio = 37.50) => {
  const totalEstimado = parseFloat(servicio.totalEstimado || 0);
  const totalPagado = parseFloat(servicio.totalPagado || 0);
  const saldoPendiente = parseFloat(servicio.saldoPendiente || 0);

  // Convertir montos a Bs usando la tasa de cambio
  const tasa = parseFloat(tasaCambio) || 37.50;
  const totalEstimadoBs = totalEstimado * tasa;
  const totalPagadoBs = totalPagado * tasa;
  const saldoPendienteBs = saldoPendiente * tasa;

  // Formatear montos en Bs
  const formatearBs = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  let mensaje = `✅ *¡TU EQUIPO ESTÁ LISTO PARA RETIRAR!*\n\n`;
  mensaje += `*Orden:* #${servicio.numeroServicio}\n`;
  mensaje += `*Dispositivo:* ${servicio.dispositivoMarca} ${servicio.dispositivoModelo}\n\n`;
  
  mensaje += `*ESTADO FINANCIERO:*\n`;
  mensaje += `Total Estimado: ${formatearBs(totalEstimadoBs)} Bs\n`;
  mensaje += `Total Pagado: ${formatearBs(totalPagadoBs)} Bs\n`;
  
  if (saldoPendienteBs > 0) {
    mensaje += `*Saldo Pendiente: ${formatearBs(saldoPendienteBs)} Bs*\n`;
    mensaje += `\n⚠️ *IMPORTANTE:* Debes cancelar el saldo pendiente antes de retirar tu equipo.\n`;
  } else {
    mensaje += `✅ *Saldo Pendiente: ${formatearBs(saldoPendienteBs)} Bs*\n`;
    mensaje += `\n✅ *¡Tu equipo está completamente pagado y listo para retirar!*\n`;
  }
  
  mensaje += `\n📱 *Seguimiento en línea:*\n${linkSeguimiento}\n`;
  mensaje += `\n🔧 *Electroshop Morandin*\n`;
  mensaje += `📞 +58 257 251 1282\n`;
  mensaje += `📷 @electroshopgre\n`;

  return mensaje;
};

/**
 * Envía WhatsApp cuando el servicio está LISTO_RETIRO
 */
const enviarWhatsAppListoRetiro = async (servicio, linkSeguimiento, tasaCambio = 37.50) => {
  try {
    // Verificar conexión de WhatsApp
    // getEstado() devuelve directamente el objeto, no una respuesta HTTP
    const estado = whatsappService.getEstado();
    
    console.log('🔍 Estado de WhatsApp:', estado);
    
    if (!estado?.conectado) {
      console.error('❌ WhatsApp no está conectado. Estado:', estado);
      return { success: false, message: 'WhatsApp no está conectado' };
    }

    const mensaje = generarMensajeListoRetiro(servicio, linkSeguimiento, tasaCambio);
    const telefono = servicio.clienteTelefono?.replace(/\D/g, '') || servicio.clienteTelefono;

    if (!telefono) {
      return { success: false, message: 'No hay teléfono del cliente' };
    }

    const resultado = await whatsappService.enviarMensaje(telefono, mensaje);
    
    if (resultado.success) {
      return { success: true, message: 'WhatsApp enviado exitosamente' };
    } else {
      return { success: false, message: resultado.message || 'Error enviando WhatsApp' };
    }
  } catch (error) {
    console.error('❌ Error en enviarWhatsAppListoRetiro:', error);
    return { success: false, message: error.message || 'Error enviando WhatsApp' };
  }
};

/**
 * Genera mensaje de WhatsApp de entrega del dispositivo
 */
const generarMensajeEntrega = (servicio, datosRetiro = null, tasaCambio = 37.50) => {
  const fechaEntrega = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let mensaje = `📦 *EQUIPO ENTREGADO*\n\n`;
  mensaje += `*Orden:* #${servicio.numeroServicio}\n`;
  mensaje += `*Fecha de Entrega:* ${fechaEntrega}\n`;
  mensaje += `*Dispositivo:* ${servicio.dispositivoMarca} ${servicio.dispositivoModelo}\n\n`;
  
  // Si quien retira es diferente al cliente del ticket
  if (datosRetiro && datosRetiro.esDiferente) {
    mensaje += `*⚠️ IMPORTANTE:*\n`;
    mensaje += `El equipo fue retirado por una persona diferente al cliente registrado:\n\n`;
    mensaje += `*Cliente Registrado:*\n`;
    mensaje += `• Nombre: ${servicio.clienteNombre}\n`;
    mensaje += `• Cédula/RIF: ${servicio.clienteCedulaRif || 'N/A'}\n\n`;
    mensaje += `*Persona que Retiró:*\n`;
    mensaje += `• Nombre: ${datosRetiro.nombreRetiro}\n`;
    mensaje += `• Cédula: ${datosRetiro.cedulaRetiro}\n\n`;
  } else {
    mensaje += `*Cliente:* ${servicio.clienteNombre}\n`;
    mensaje += `*Cédula/RIF:* ${servicio.clienteCedulaRif || 'N/A'}\n\n`;
  }
  
  mensaje += `✅ *Tu equipo ha sido entregado exitosamente.*\n\n`;
  mensaje += `*Gracias por confiar en nosotros.*\n`;
  mensaje += `\n🔧 *Electroshop Morandin*\n`;
  mensaje += `📞 +58 257 251 1282\n`;
  mensaje += `📷 @electroshopgre\n`;

  return mensaje;
};

/**
 * Envía WhatsApp de entrega del dispositivo
 */
const enviarWhatsAppEntrega = async (servicio, datosRetiro = null, tasaCambio = 37.50) => {
  try {
    // Verificar conexión de WhatsApp
    // getEstado() devuelve directamente el objeto, no una respuesta HTTP
    const estado = whatsappService.getEstado();
    
    console.log('🔍 Estado de WhatsApp:', estado);
    
    if (!estado?.conectado) {
      console.error('❌ WhatsApp no está conectado. Estado:', estado);
      return { success: false, message: 'WhatsApp no está conectado' };
    }

    const mensaje = generarMensajeEntrega(servicio, datosRetiro, tasaCambio);
    const telefono = servicio.clienteTelefono?.replace(/\D/g, '') || servicio.clienteTelefono;

    if (!telefono) {
      return { success: false, message: 'No hay teléfono del cliente' };
    }

    const resultado = await whatsappService.enviarMensaje(telefono, mensaje);
    
    if (resultado.success) {
      return { success: true, message: 'WhatsApp de entrega enviado exitosamente' };
    } else {
      return { success: false, message: resultado.message || 'Error enviando WhatsApp' };
    }
  } catch (error) {
    console.error('❌ Error en enviarWhatsAppEntrega:', error);
    return { success: false, message: error.message || 'Error enviando WhatsApp' };
  }
};

module.exports = {
  generarMensajeCliente,
  generarMensajeTecnico,
  enviarWhatsAppCliente,
  enviarWhatsAppTecnico,
  generarMensajeAbono,
  enviarWhatsAppAbono,
  generarMensajeListoRetiro,
  enviarWhatsAppListoRetiro,
  generarMensajeEntrega,
  enviarWhatsAppEntrega
};

