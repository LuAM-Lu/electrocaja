// hooks/useBloqueo.js
// 🔒 Hook para usar el servicio de bloqueo en componentes React

import { useState, useEffect } from 'react';
import { bloqueoService } from '../services/bloqueoService';

/**
 * Hook para suscribirse al estado de bloqueo
 *
 * @returns {Object} Estado de bloqueo actualizado reactivamente
 *
 * @example
 * const { bloqueado, motivo, usuarioCerrando, tipo } = useBloqueo();
 *
 * if (bloqueado) {
 *   return <BloqueoOverlay motivo={motivo} usuarioCerrando={usuarioCerrando} />;
 * }
 */
export const useBloqueo = () => {
  // Estado local que se actualiza cuando el servicio notifica cambios
  const [estado, setEstado] = useState(() => bloqueoService.getEstado());

  useEffect(() => {
    // Suscribirse a cambios del servicio
    const unsuscribe = bloqueoService.suscribirse((nuevoEstado) => {
      console.log('🔒 useBloqueo: Estado actualizado', nuevoEstado);
      setEstado(nuevoEstado);
    });

    // Obtener estado inicial (por si cambió antes de montar)
    setEstado(bloqueoService.getEstado());

    // Cleanup: desuscribirse al desmontar
    return unsuscribe;
  }, []);

  return {
    bloqueado: estado.bloqueado,
    motivo: estado.motivo,
    usuarioCerrando: estado.usuarioCerrando,
    timestamp: estado.timestamp,
    diferencias: estado.diferencias,
    tipo: estado.tipo,

    // Helpers
    estaBloqueado: estado.bloqueado,
    esBloqueoPorDiferencia: estado.tipo === 'DIFERENCIA',
    esBloqueoPorArqueo: estado.tipo === 'ARQUEO',
    esBloqueoPorCierre: estado.tipo === 'CIERRE'
  };
};

/**
 * Hook para verificar si el usuario actual debe ver el overlay
 *
 * @param {string} nombreUsuario - Nombre del usuario actual
 * @returns {boolean} true si debe mostrar overlay
 */
export const useDebeBloquear = (nombreUsuario) => {
  const { bloqueado, usuarioCerrando } = useBloqueo();

  // No bloquear si no hay bloqueo activo
  if (!bloqueado) return false;

  // No bloquear al usuario que está cerrando
  if (nombreUsuario === usuarioCerrando) return false;

  // Bloquear a todos los demás
  return true;
};
