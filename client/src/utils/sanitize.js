/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return '';

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
};

/**
 * Removes potentially dangerous HTML tags and attributes
 * @param {string} html - HTML string to sanitize
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHtml = (html) => {
  if (typeof html !== 'string') return '';

  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  clean = clean.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  clean = clean.replace(/data:text\/html/gi, '');

  return clean;
};

/**
 * Sanitizes user input for general text fields
 * Removes control characters and trims whitespace
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return '';

  // Remove control characters except newline and tab
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  clean = clean.trim();

  // Limit length
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }

  return clean;
};

/**
 * Sanitizes email input
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';

  // Remove whitespace and convert to lowercase
  let clean = email.trim().toLowerCase();

  // Remove any characters that are not valid in email addresses
  clean = clean.replace(/[^a-z0-9@._+-]/g, '');

  // Limit length
  if (clean.length > 254) {
    clean = clean.substring(0, 254);
  }

  return clean;
};

/**
 * Sanitizes phone number input
 * @param {string} phone - Phone to sanitize
 * @returns {string} - Sanitized phone
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';

  // Remove all non-numeric characters except + and -
  let clean = phone.replace(/[^\d+-\s()]/g, '');

  // Trim whitespace
  clean = clean.trim();

  // Limit length
  if (clean.length > 20) {
    clean = clean.substring(0, 20);
  }

  return clean;
};

/**
 * Sanitizes numeric input
 * @param {string|number} value - Value to sanitize
 * @returns {string} - Sanitized numeric string
 */
export const sanitizeNumeric = (value) => {
  if (typeof value === 'number') return value.toString();
  if (typeof value !== 'string') return '';

  // Remove all non-numeric characters except decimal point and minus sign
  let clean = value.replace(/[^\d.-]/g, '');

  // Ensure only one decimal point
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }

  // Ensure minus sign only at the beginning
  if (clean.includes('-')) {
    const isNegative = clean[0] === '-';
    clean = clean.replace(/-/g, '');
    if (isNegative) clean = '-' + clean;
  }

  return clean;
};

/**
 * Validates and sanitizes URL
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';

  const clean = url.trim();

  // Check for javascript: protocol and other dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = clean.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Only allow http:, https:, and relative URLs
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('/') || clean.startsWith('./')) {
    return clean;
  }

  // If no protocol, assume https
  if (!clean.includes('://')) {
    return clean;
  }

  return '';
};

/**
 * Sanitizes object properties recursively
 * @param {Object} obj - Object to sanitize
 * @param {Array<string>} skipFields - Fields to skip sanitization
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj, skipFields = []) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, skipFields));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (skipFields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, skipFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates phone number format
 * @param {string} phone - Phone to validate
 * @returns {boolean} - True if valid
 */
export const isValidPhone = (phone) => {
  if (typeof phone !== 'string') return false;

  // Remove formatting characters
  const cleaned = phone.replace(/[\s()-]/g, '');

  // Check if it's a valid phone number (7-15 digits, optionally starting with +)
  const phoneRegex = /^\+?[\d]{7,15}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Prevents SQL injection by escaping single quotes
 * Note: This is a basic protection. Always use parameterized queries on the backend.
 * @param {string} input - Input to escape
 * @returns {string} - Escaped input
 */
export const escapeSql = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/'/g, "''");
};

/**
 * Sanitizes filename to prevent directory traversal
 * @param {string} filename - Filename to sanitize
 * @returns {string} - Safe filename
 */
export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return '';

  // Remove directory traversal patterns
  let clean = filename.replace(/\.\./g, '');
  clean = clean.replace(/[\/\\]/g, '');

  // Remove any non-alphanumeric characters except dots, underscores, and hyphens
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (clean.length > 255) {
    const ext = clean.split('.').pop();
    const nameWithoutExt = clean.substring(0, clean.lastIndexOf('.'));
    clean = nameWithoutExt.substring(0, 250 - ext.length) + '.' + ext;
  }

  return clean;
};
