// utils/tokenGenerator.js
// 🔐 Generador de tokens de acceso rápido

/**
 * Genera un token de acceso rápido único de 12 caracteres
 * Formato: Alfanumérico puro (letras y números, sin símbolos)
 * Ejemplo: ABC123XYZ789
 * Legible por lectores de código de barras y QR
 */
export const generarQuickAccessToken = () => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, O, 0, 1 para evitar confusión
  let token = '';

  // Generar 12 caracteres aleatorios (más seguro para escáner)
  for (let i = 0; i < 12; i++) {
    token += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }

  return token;
};

/**
 * Genera una contraseña temporal aleatoria
 * @param {number} longitud - Longitud de la contraseña (default: 8)
 */
export const generarPasswordTemporal = (longitud = 8) => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&*';
  let password = '';

  for (let i = 0; i < longitud; i++) {
    password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }

  return password;
};

/**
 * Valida formato de token de acceso rápido
 * @param {string} token - Token a validar
 */
export const validarQuickAccessToken = (token) => {
  if (!token || typeof token !== 'string') return false;

  // Debe tener exactamente 6 caracteres
  if (token.length !== 6) return false;

  // Primeros 3 deben ser letras
  const letras = token.substring(0, 3);
  if (!/^[A-Z]{3}$/.test(letras)) return false;

  // Últimos 3 deben ser números
  const numeros = token.substring(3, 6);
  if (!/^[0-9]{3}$/.test(numeros)) return false;

  return true;
};

/**
 * Formatea el token para display (sin guión, solo letras y números)
 * @param {string} token - Token a formatear
 * @example formatearToken('ABC123') => 'ABC123'
 */
export const formatearToken = (token) => {
  if (!token) return token;
  // Remover cualquier caracter que no sea letra o número
  return token.replace(/[^A-Z0-9]/g, '').toUpperCase();
};
