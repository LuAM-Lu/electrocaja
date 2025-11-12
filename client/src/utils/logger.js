/**
 * Sistema de logging configurable
 * Solo activo en desarrollo, silencioso en producción
 */

const isDevelopment = import.meta.env.MODE === 'development';

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor(name = 'App', level = LogLevel.ERROR) {
    this.name = name;
    this.level = LogLevel.ERROR; // Solo errores, sin debug
  }

  /**
   * Formatea el mensaje con timestamp y nombre del logger
   */
  format(level, ...args) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return [`[${timestamp}] [${this.name}] [${level}]`, ...args];
  }

  /**
   * Log de debug - solo en desarrollo
   */
  debug(...args) {
    if (this.level <= LogLevel.DEBUG && isDevelopment) {
      console.log(...this.format('DEBUG', ...args));
    }
  }

  /**
   * Log informativo
   */
  info(...args) {
    if (this.level <= LogLevel.INFO && isDevelopment) {
      console.info(...this.format('INFO', ...args));
    }
  }

  /**
   * Advertencias
   */
  warn(...args) {
    if (this.level <= LogLevel.WARN) {
      console.warn(...this.format('WARN', ...args));
    }
  }

  /**
   * Errores - siempre se muestran
   */
  error(...args) {
    if (this.level <= LogLevel.ERROR) {
      console.error(...this.format('ERROR', ...args));
    }
  }

  /**
   * Agrupa logs relacionados
   */
  group(label, callback) {
    if (isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Mide tiempo de ejecución
   */
  time(label) {
    if (isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
}

/**
 * Factory para crear loggers por módulo
 */
export const createLogger = (name) => new Logger(name);

// Loggers por defecto
export const logger = new Logger('App');
export const apiLogger = new Logger('API');
export const storeLogger = new Logger('Store');
export const componentLogger = new Logger('Component');

export default logger;




