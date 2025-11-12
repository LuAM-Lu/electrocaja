// services/bloqueoService.js
// 🔒 Servicio centralizado para gestión de bloqueos multi-usuario

/**
 * BloqueoService - Singleton para gestionar estado de bloqueo del sistema
 *
 * Responsabilidades:
 * - Mantener estado de bloqueo en memoria
 * - Sincronizar con socket events
 * - Notificar a componentes que escuchan cambios
 * - Persistir en localStorage para sobrevivir F5
 */

class BloqueoService {
  constructor() {
    // Estado interno
    this.state = {
      bloqueado: false,
      motivo: '',
      usuarioCerrando: '',
      timestamp: null,
      diferencias: null,
      tipo: null // 'ARQUEO' | 'CIERRE' | 'DIFERENCIA'
    };

    // Listeners que se notificarán cuando cambie el estado
    this.listeners = new Set();

    // Cargar estado persistente del localStorage
    this.cargarEstadoPersistente();

  }

  /**
   * Cargar estado desde localStorage (para sobrevivir F5)
   */
  cargarEstadoPersistente() {
    try {
      const estadoGuardado = localStorage.getItem('bloqueo-state');
      if (estadoGuardado) {
        const parsed = JSON.parse(estadoGuardado);
        // Solo restaurar si el timestamp es reciente (menos de 1 hora)
        const ahora = Date.now();
        const timestampGuardado = new Date(parsed.timestamp).getTime();
        const unHora = 60 * 60 * 1000;

        if (ahora - timestampGuardado < unHora) {
          this.state = parsed;
          console.log('🔒 Estado de bloqueo restaurado desde localStorage:', this.state);
        } else {
          console.log('🔒 Estado guardado expirado, limpiando...');
          localStorage.removeItem('bloqueo-state');
        }
      }
    } catch (error) {
      console.error('❌ Error cargando estado persistente:', error);
    }
  }

  /**
   * Guardar estado en localStorage
   */
  guardarEstadoPersistente() {
    try {
      localStorage.setItem('bloqueo-state', JSON.stringify(this.state));
    } catch (error) {
      console.error('❌ Error guardando estado persistente:', error);
    }
  }

  /**
   * Bloquear sistema
   */
  bloquear({ motivo, usuarioCerrando, tipo = 'ARQUEO', diferencias = null }) {
    console.log('🔒 BLOQUEANDO SISTEMA:', { motivo, usuarioCerrando, tipo });

    this.state = {
      bloqueado: true,
      motivo,
      usuarioCerrando,
      timestamp: new Date().toISOString(),
      diferencias,
      tipo
    };

    // Persistir
    this.guardarEstadoPersistente();

    // Notificar a todos los listeners
    this.notificarCambio();
  }

  /**
   * Desbloquear sistema
   */
  desbloquear(motivo = 'Sistema desbloqueado') {
    console.log('🔓 DESBLOQUEANDO SISTEMA:', motivo);

    this.state = {
      bloqueado: false,
      motivo: '',
      usuarioCerrando: '',
      timestamp: null,
      diferencias: null,
      tipo: null
    };

    // Limpiar localStorage
    localStorage.removeItem('bloqueo-state');

    // Notificar a todos los listeners
    this.notificarCambio();
  }

  /**
   * Obtener estado actual
   */
  getEstado() {
    return { ...this.state };
  }

  /**
   * Verificar si está bloqueado
   */
  estaBloqueado() {
    return this.state.bloqueado;
  }

  /**
   * Verificar si el usuario actual es quien está cerrando
   */
  esUsuarioCerrando(nombreUsuario) {
    return this.state.usuarioCerrando === nombreUsuario;
  }

  /**
   * Suscribirse a cambios de estado
   * @param {Function} listener - Función que será llamada cuando cambie el estado
   * @returns {Function} Función para desuscribirse
   */
  suscribirse(listener) {
    this.listeners.add(listener);

    // Retornar función de cleanup
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notificar a todos los listeners
   */
  notificarCambio() {
    const estadoActual = this.getEstado();
    console.log('📢 Notificando cambio a', this.listeners.size, 'listeners');

    this.listeners.forEach(listener => {
      try {
        listener(estadoActual);
      } catch (error) {
        console.error('❌ Error en listener:', error);
      }
    });
  }

  /**
   * Debug: Ver estado completo
   */
  debug() {
    console.log('🔍 BloqueoService Estado:', {
      ...this.state,
      listeners: this.listeners.size
    });
  }
}

// Exportar singleton
export const bloqueoService = new BloqueoService();
