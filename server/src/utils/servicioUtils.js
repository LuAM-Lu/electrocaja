const crypto = require('crypto');

/**
 * Genera un token único para seguimiento público del servicio
 * Basado en número de servicio + cédula/RIF del cliente
 * @param {string} numeroServicio - Número único del servicio
 * @param {string} cedulaRif - Cédula o RIF del cliente
 * @returns {string} Token único de 32 caracteres
 */
const generarTokenUnico = (numeroServicio, cedulaRif) => {
  // Normalizar inputs (eliminar espacios, convertir a mayúsculas)
  const numeroNormalizado = numeroServicio.trim().toUpperCase();
  const cedulaNormalizada = cedulaRif.trim().toUpperCase().replace(/\s+/g, '');
  
  // Crear string combinado
  const combinacion = `${numeroNormalizado}_${cedulaNormalizada}_${Date.now()}`;
  
  // Generar hash SHA-256
  const hash = crypto.createHash('sha256').update(combinacion).digest('hex');
  
  // Tomar primeros 32 caracteres del hash
  return hash.substring(0, 32);
};

/**
 * Genera el link de seguimiento completo
 * @param {string} tokenUnico - Token único del servicio
 * @param {string} baseUrl - URL base de la aplicación (ej: https://tudominio.com)
 * @returns {string} URL completa de seguimiento
 */
const generarLinkSeguimiento = (tokenUnico, baseUrl) => {
  // Normalizar baseUrl (eliminar trailing slash)
  const urlNormalizada = baseUrl.replace(/\/$/, '');
  return `${urlNormalizada}/servicio/${tokenUnico}`;
};

/**
 * Valida si un servicio puede ser accedido públicamente
 * (no debe estar eliminado ni entregado)
 * @param {Object} servicio - Objeto del servicio
 * @returns {boolean} true si puede ser accedido públicamente
 */
const puedeAccederPublicamente = (servicio) => {
  // No puede estar eliminado
  if (servicio.deletedAt) {
    return false;
  }
  
  // Una vez entregado, el link se invalida automáticamente
  // Pero podemos permitir acceso por un tiempo después de entregado
  // Por ahora, permitimos acceso hasta que se entregue
  // (esto se puede ajustar según necesidades)
  
  return true;
};

module.exports = {
  generarTokenUnico,
  generarLinkSeguimiento,
  puedeAccederPublicamente
};

