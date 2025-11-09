// store/dashboardStore.js (ACTUALIZAR CON ANIMACIONES BIDIRECCIONALES COMPLETAS)
import { create } from 'zustand';

export const useDashboardStore = create((set, get) => ({
  // Estado actual del dashboard
  activeDashboard: 'main', // 'main' | 'services'
 
  // Temas
  theme: 'blue', // 'blue' | 'dark'
 
  // Animaciones bidireccionales completas
  isTransitioning: false,
  transitionDirection: 'right', // 'right' | 'left'
  transitionPhase: 'idle', // 'idle' | 'exiting' | 'entering'
 
  // Acciones
  switchToServices: () => {
    set({ 
      isTransitioning: true, 
      transitionDirection: 'right',
      transitionPhase: 'exiting'
    });
    
    setTimeout(() => {
      set({
        activeDashboard: 'services',
        theme: 'dark',
        transitionPhase: 'entering'
      });
      
      // Completar la transición
      setTimeout(() => {
        set({ 
          isTransitioning: false,
          transitionPhase: 'idle'
        });
      }, 150); // Mitad del tiempo para entrada suave
      
    }, 300);
  },
 
  switchToMain: () => {
    set({ 
      isTransitioning: true, 
      transitionDirection: 'left',
      transitionPhase: 'exiting'
    });
    
    setTimeout(() => {
      set({
        activeDashboard: 'main',
        theme: 'blue',
        transitionPhase: 'entering'
      });
      
      // Completar la transición
      setTimeout(() => {
        set({ 
          isTransitioning: false,
          transitionPhase: 'idle'
        });
      }, 150); // Mitad del tiempo para entrada suave
      
    }, 300);
  },
 
  // Getters mejorados con transiciones bidireccionales
  isServicesActive: () => get().activeDashboard === 'services',
  isMainActive: () => get().activeDashboard === 'main',
  isDarkTheme: () => get().theme === 'dark',
  
  getTransitionClass: () => {
    const { isTransitioning, transitionDirection, transitionPhase } = get();
    
    // Sin transición - estado normal
    if (!isTransitioning && transitionPhase === 'idle') {
      return 'transform translate-x-0 opacity-100';
    }
    
    // Durante transición
    if (transitionPhase === 'exiting') {
      // Saliendo
      return transitionDirection === 'right'
        ? 'transform translate-x-full opacity-0'   // Salir hacia la derecha
        : 'transform -translate-x-full opacity-0'; // Salir hacia la izquierda
    }
    
    if (transitionPhase === 'entering') {
      // Entrando desde el lado opuesto
      return transitionDirection === 'right'
        ? 'transform translate-x-0 opacity-100'    // Entrar desde la izquierda
        : 'transform translate-x-0 opacity-100';   // Entrar desde la derecha
    }
    
    // Estado por defecto
    return 'transform translate-x-0 opacity-100';
  },
  
  //  Nuevo getter para obtener clase de entrada inicial
  getInitialTransitionClass: () => {
    const { transitionDirection, transitionPhase } = get();
    
    if (transitionPhase === 'entering') {
      // Inicializar desde el lado opuesto antes de animar
      return transitionDirection === 'right'
        ? 'transform -translate-x-full opacity-0' // Empezar desde la izquierda
        : 'transform translate-x-full opacity-0';  // Empezar desde la derecha
    }
    
    return 'transform translate-x-0 opacity-100';
  }
}));