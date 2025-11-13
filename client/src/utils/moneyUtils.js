/**
 * Utility functions for precise money calculations
 * Prevents floating-point precision errors in financial operations
 */

/**
 * Rounds a number to 2 decimal places with proper precision
 * @param {number|string} value - The value to round
 * @returns {number} - Rounded value with 2 decimal places
 */
export const roundMoney = (value) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
};

/**
 * Safely parses a monetary value from string or number
 * Handles comma/dot separators
 * @param {string|number} value - The value to parse
 * @returns {number} - Parsed value with 2 decimal precision
 */
export const parseMoney = (value) => {
  if (typeof value === 'number') {
    return roundMoney(value);
  }

  if (typeof value === 'string') {
    // Remove spaces and replace comma with dot
    const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : roundMoney(parsed);
  }

  return 0;
};

/**
 * Adds two monetary values with precision
 * @param {number|string} a - First value
 * @param {number|string} b - Second value
 * @returns {number} - Sum with 2 decimal precision
 */
export const addMoney = (a, b) => {
  return roundMoney(parseMoney(a) + parseMoney(b));
};

/**
 * Subtracts two monetary values with precision
 * @param {number|string} a - Value to subtract from
 * @param {number|string} b - Value to subtract
 * @returns {number} - Difference with 2 decimal precision
 */
export const subtractMoney = (a, b) => {
  return roundMoney(parseMoney(a) - parseMoney(b));
};

/**
 * Multiplies two monetary values with precision
 * @param {number|string} a - First value
 * @param {number|string} b - Second value
 * @returns {number} - Product with 2 decimal precision
 */
export const multiplyMoney = (a, b) => {
  return roundMoney(parseMoney(a) * parseMoney(b));
};

/**
 * Divides two monetary values with precision
 * @param {number|string} a - Dividend
 * @param {number|string} b - Divisor
 * @returns {number} - Quotient with 2 decimal precision
 */
export const divideMoney = (a, b) => {
  const divisor = parseMoney(b);
  if (divisor === 0) return 0;
  return roundMoney(parseMoney(a) / divisor);
};

/**
 * Converts currency using exchange rate with precision
 * @param {number|string} amount - Amount to convert
 * @param {number|string} rate - Exchange rate
 * @returns {number} - Converted amount with 2 decimal precision
 */
export const convertCurrency = (amount, rate) => {
  return multiplyMoney(amount, rate);
};

/**
 * Formats a monetary value for display
 * @param {number|string} value - Value to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} - Formatted string
 */
export const formatMoney = (value, currency = '$') => {
  const num = parseMoney(value);
  return `${currency}${num.toFixed(2)}`;
};

/**
 * Compares two monetary values for equality (with precision tolerance)
 * @param {number|string} a - First value
 * @param {number|string} b - Second value
 * @returns {boolean} - True if values are equal within 0.01 tolerance
 */
export const isMoneyEqual = (a, b) => {
  const diff = Math.abs(parseMoney(a) - parseMoney(b));
  return diff < 0.01;
};

/**
 * Checks if a value is a valid monetary amount
 * @param {any} value - Value to check
 * @returns {boolean} - True if valid
 */
export const isValidMoney = (value) => {
  const parsed = parseMoney(value);
  return parsed >= 0 && !isNaN(parsed);
};

/**
 * Validates exchange rate
 * @param {number|string} rate - Exchange rate to validate
 * @returns {boolean} - True if valid (> 0)
 */
export const isValidExchangeRate = (rate) => {
  const parsed = parseMoney(rate);
  return parsed > 0;
};

/**
 * Calculates total from array of payments with different currencies
 * @param {Array} pagos - Array of payment objects {monto, moneda}
 * @param {number|string} tasaCambio - Exchange rate (Bs to USD)
 * @returns {Object} - {totalBs, totalUsd, totalUsdEquivalent}
 */
export const calculatePaymentTotals = (pagos, tasaCambio) => {
  if (!Array.isArray(pagos) || pagos.length === 0) {
    return { totalBs: 0, totalUsd: 0, totalUsdEquivalent: 0 };
  }

  const rate = parseMoney(tasaCambio);
  if (!isValidExchangeRate(rate)) {
    throw new Error('Tasa de cambio inválida');
  }

  // Mapeo de métodos de pago a monedas (fallback si no viene moneda explícita)
  const metodoMonedaMap = {
    'efectivo_bs': 'bs',
    'efectivo_usd': 'usd',
    'pago_movil': 'bs',
    'transferencia': 'bs',
    'zelle': 'usd',
    'binance': 'usd',
    'tarjeta': 'bs'
  };

  let totalBs = 0;
  let totalUsd = 0;

  pagos.forEach(pago => {
    const monto = parseMoney(pago.monto);
    
    // Determinar moneda: usar explícita o determinar desde método de pago
    let moneda = pago.moneda;
    if (!moneda) {
      // Si el método contiene "_bs" o "bs", es bolívares
      if (pago.metodo && (pago.metodo.includes('_bs') || pago.metodo.includes('bs'))) {
        moneda = 'bs';
      }
      // Si el método contiene "_usd" o "usd", es dólares
      else if (pago.metodo && (pago.metodo.includes('_usd') || pago.metodo.includes('usd'))) {
        moneda = 'usd';
      }
      // Usar mapeo directo si existe
      else if (metodoMonedaMap[pago.metodo]) {
        moneda = metodoMonedaMap[pago.metodo];
      }
      // Por defecto, asumir bolívares
      else {
        moneda = 'bs';
      }
    }
    
    if (moneda === 'bs') {
      totalBs = addMoney(totalBs, monto);
    } else if (moneda === 'usd') {
      totalUsd = addMoney(totalUsd, monto);
    }
  });

  // Convert Bs to USD equivalent and add to USD total
  const bsInUsd = divideMoney(totalBs, rate);
  const totalUsdEquivalent = addMoney(totalUsd, bsInUsd);

  return {
    totalBs: roundMoney(totalBs),
    totalUsd: roundMoney(totalUsd),
    totalUsdEquivalent: roundMoney(totalUsdEquivalent)
  };
};
