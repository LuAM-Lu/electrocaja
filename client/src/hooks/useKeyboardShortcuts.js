// hooks/useKeyboardShortcuts.js (ACTUALIZADO CON INVENTARIO)
import { useEffect } from 'react';

const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl + I para nuevo ingreso
      if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('openIngresoModal'));
      }
      
      // Ctrl + E para nuevo egreso
      if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('openEgresoModal'));
      }
      
      // Ctrl + Q para cerrar caja
      if (event.ctrlKey && event.key === 'q') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('openCerrarCajaModal'));
      }

      // 👈 NUEVO: Ctrl + P para inventario
      if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('openInventarioModal'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

export default useKeyboardShortcuts;