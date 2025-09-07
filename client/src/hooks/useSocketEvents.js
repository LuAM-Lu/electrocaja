// client/src/hooks/useSocketEvents.js (CON FORCE LOGOUT AGREGADO)
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import { useNotificacionesStore } from '../store/notificacionesStore';
import toast from 'react-hot-toast';

export const useSocketEvents = () => {
  // 🔧 USAR TU AUTHSTORE
  const { 
    socket, 
    usuario, 
    isSocketConnected,
    logout, // 🆕 AGREGAR LOGOUT
    agregarUsuarioConectado, 
    eliminarUsuarioConectado,
    actualizarActividad 
  } = useAuthStore();
  
  const { updateCajaStatus, addTransaction, removeTransaction } = useCajaStore();

  
  // Estados para bloqueos
  const [usuariosBloqueados, setUsuariosBloqueados] = useState(false);
  const [motivoBloqueo, setMotivoBloqueo] = useState('');
  const [usuarioCerrando, setUsuarioCerrando] = useState('');

  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket no disponible en useSocketEvents');
      return;
    }

    console.log('✅ Configurando listeners para socket:', socket.id, 'conectado:', socket.connected);

    // 🔧 HANDLERS ESPECÍFICOS PARA BLOQUEOS
    const handleBloqueaUsuarios = (data) => {
      console.log('🔒 EVENTO: bloquear_usuarios', data);
      setUsuariosBloqueados(true);
      setMotivoBloqueo(data.motivo);
      setUsuarioCerrando(data.usuario_cerrando);
      
      // Solo mostrar toast si no es el usuario que está cerrando
      if (usuario?.nombre !== data.usuario_cerrando) {
        toast.error(`🔒 ${data.motivo}`, {
          duration: 5000,
          style: {
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '14px'
          }
        });
      }
    };

    const handleBloqueaDiferencia = (data) => {
      console.log('🚨 EVENTO: bloquear_usuarios_diferencia', data);
      setUsuariosBloqueados(true);
      setMotivoBloqueo(data.mensaje);
      setUsuarioCerrando(data.usuario_cerrando);
      
      if (usuario?.nombre !== data.usuario_cerrando) {
        toast.error(`🚨 ${data.mensaje}`, {
          duration: 8000,
          style: {
            background: '#FEF2F2',
            border: '2px solid #F87171',
            color: '#7F1D1D',
            fontSize: '14px',
            fontWeight: '600'
          }
        });
      }
    };

    const handleDesbloquea = (data) => {
      console.log('🔓 EVENTO: desbloquear_usuarios', data);
      setUsuariosBloqueados(false);
      setMotivoBloqueo('');
      setUsuarioCerrando('');
      
      toast.success(`🔓 ${data.motivo}`, {
        duration: 3000,
        style: {
          background: '#ECFDF5',
          border: '1px solid #BBF7D0',
          color: '#14532D'
        }
      });
    };

    // 🆕 NUEVO HANDLER PARA FORCE LOGOUT
    const handleForceLogout = (data) => {
      console.log('💀 FORCE LOGOUT recibido:', data);
      
      // Mensaje prominente al usuario kickeado
      toast.error(`🚨 ${data.message}`, {
        duration: 8000,
        style: {
          background: '#FEF2F2',
          border: '2px solid #F87171',
          color: '#7F1D1D',
          fontSize: '16px',
          fontWeight: '600'
        }
      });
      
      // Información adicional si está disponible
      if (data.admin_user) {
        toast.error(`👮‍♂️ Desconectado por: ${data.admin_user}`, {
          duration: 6000,
          style: {
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '14px'
          }
        });
      }
      
      // Forzar logout después de mostrar el mensaje
      setTimeout(() => {
        console.log('💀 Ejecutando logout forzado...');
        logout();
      }, 3000); // 3 segundos para leer el mensaje
    };

    const handleCajaAbierta = (data) => {
      console.log('📦 Caja abierta:', data);
      toast.success(`📦 Caja abierta por ${data.usuario}`, { 
        duration: 4000,
        style: {
          background: '#ECFDF5',
          color: '#14532D'
        }
      });
      
      // 🔧 ACTUALIZAR ESTADO DE CAJA EN LUGAR DE RECARGAR
      if (updateCajaStatus && data.caja) {
        console.log('🔧 Actualizando estado de caja abierta:', data.caja);
        updateCajaStatus(data.caja);
      }
    };
    
    const handleCajaCerrada = (data) => {
      console.log('🔒 Caja cerrada:', data);
      toast.success(`🔒 Caja cerrada por ${data.usuario}`, { 
        duration: 4000,
        style: {
          background: '#EFF6FF',
          color: '#1E40AF'
        }
      });
      
      // 🔧 ACTUALIZAR ESTADO DE CAJA EN LUGAR DE RECARGAR
      if (updateCajaStatus && data.caja) {
        console.log('🔧 Actualizando estado de caja cerrada:', data.caja);
        updateCajaStatus(data.caja);
      }
    };

    // 🔧 HANDLERS PARA USUARIOS CONECTADOS
    const handleUserConnected = (data) => {
      console.log('👤 Usuario conectado:', data);
      if (data.user && data.user.id !== usuario?.id) {
        agregarUsuarioConectado(data.user);
        toast(`👋 ${data.user.nombre} se ha conectado`, {
          duration: 2000,
          icon: '🟢'
        });
      }
    };

    const handleUserDisconnected = (data) => {
      console.log('👤 Usuario desconectado:', data);
      if (data.userId !== usuario?.id) {
        eliminarUsuarioConectado(data.userId);
        toast(`👋 ${data.userName || 'Usuario'} se ha desconectado`, {
          duration: 2000,
          icon: '🔴'
        });
      }
    };

                // En useSocketEvents.js, función handleUsuariosActualizados:
            const handleUsuariosActualizados = (data) => {
              console.log('📊 Contador usuarios actualizado:', data);
              
              if (data.usuarios && Array.isArray(data.usuarios)) {
                const usuariosFormateados = data.usuarios.map((userStr, index) => {
                  console.log('🔧 DEBUG - Procesando userStr:', userStr);
                  
                  // 🔧 REGEX MEJORADO
                  const match = userStr.match(/^(.+?)\s+\((.+)\)$/);
                  if (match) {
                    console.log('🔧 DEBUG - Match encontrado:', match);
                    return {
                      id: `user_${index}_${match[1].replace(/\s+/g, '_')}`,
                      nombre: match[1].trim(), // 👈 AGREGAR .trim()
                      rol: match[2],
                      sucursal: 'Principal',
                      ultima_actividad: new Date().toISOString()
                    };
                  }
                  
                  console.log('🔧 DEBUG - No match, usando fallback');
                  return {
                    id: `user_${index}_${userStr.replace(/\s+/g, '_')}`,
                    nombre: userStr || 'Usuario Desconocido',
                    rol: 'usuario',
                    sucursal: 'Principal',
                    ultima_actividad: new Date().toISOString()
                  };
                });
                
                console.log('🔧 DEBUG - Usuarios formateados finales:', usuariosFormateados);
                
                // ACTUALIZAR EL STORE
                useAuthStore.setState({ usuariosConectados: usuariosFormateados });
                
                console.log('✅ Store actualizado con', usuariosFormateados.length, 'usuarios conectados');
              }
            };

    const handleUsersUpdate = (data) => {
      console.log('👥 Lista de usuarios actualizada:', data);
      // Aquí podrías actualizar la lista completa si es necesario
    };

    // 🔧 HANDLERS PARA TRANSACCIONES
    const handleCajaUpdated = (cajaData) => {
      console.log('📊 Caja actualizada:', cajaData);
      if (updateCajaStatus) {
        updateCajaStatus(cajaData);
      }
      toast.success('Estado de caja actualizado');
    };

    const handleTransactionAdded = (transaction) => {
  console.log('💰 Nueva transacción recibida:', transaction);
  if (addTransaction && transaction?.transaccion) {
    // Verificar que no sea del mismo usuario para evitar duplicados
    const { usuario } = useAuthStore.getState();
    if (transaction.usuario !== usuario?.nombre) {
      // 🔧 MAPEAR DATOS CORRECTAMENTE ANTES DE AGREGAR
      const transaccionMapeada = {
        transaccion: {
          ...transaction.transaccion,
          usuario: transaction.usuario || 'Usuario desconocido',
          fecha_hora: transaction.transaccion.fechaHora || new Date().toISOString()
        }
      };
      
      addTransaction(transaccionMapeada);
      toast.success(`💰 ${transaction.usuario} registró una transacción`);
    } else {
      console.log('🔄 Transacción propia ignorada para evitar duplicado');
    }
  }
};

    const handleTransactionDeleted = (data) => {
      console.log('🗑️ Transacción eliminada:', data);
      if (removeTransaction) {
        removeTransaction(data.transaccionId);
      }
      toast.info('Transacción eliminada por otro usuario');
    };

    const handleError = (data) => {
    console.error('❌ Error del servidor:', data);
    toast.error(data.message || 'Error del servidor');
  };

  // 🆕 HANDLERS PARA CAJAS PENDIENTES
  const handleAutoCierreEjecutado = (data) => {
    console.log('🕚 Auto-cierre ejecutado:', data);
    
    const { cajas_afectadas, timestamp } = data;
    
    if (cajas_afectadas && cajas_afectadas.length > 0) {
      // Mostrar notificación a todos los usuarios
      toast.warning(`🕚 Auto-cierre ejecutado: ${cajas_afectadas.length} caja(s) pendiente(s) de conteo físico`, {
        duration: 8000,
        style: {
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          color: '#92400E'
        }
      });

      // Si el usuario actual es responsable de alguna caja, notificar específicamente
      const usuario = useAuthStore.getState().usuario;
      if (usuario) {
        const cajaUsuario = cajas_afectadas.find(caja => 
          caja.usuarioResponsable === usuario.nombre
        );
        
        if (cajaUsuario) {
          toast.error(`🚨 Tienes una caja pendiente de cierre del ${cajaUsuario.fechaApertura}`, {
            duration: 10000,
            style: {
              background: '#FEE2E2',
              border: '2px solid #EF4444',
              color: '#991B1B',
              fontSize: '14px',
              fontWeight: '600'
            }
          });
        }
      }
    }
  };

  const handleCajaPendienteResuelta = (data) => {
    console.log('✅ Caja pendiente resuelta:', data);
    
    const { resuelto_por, era_responsable } = data;
    
    toast.success(`✅ Caja pendiente resuelta por ${resuelto_por}${era_responsable ? ' (responsable)' : ' (admin)'}`, {
      duration: 5000,
      style: {
        background: '#ECFDF5',
        border: '1px solid #10B981',
        color: '#065F46'
      }
    });

    // Limpiar estado de bloqueo si el usuario actual tenía caja pendiente
    const { cajaPendienteCierre, limpiarCajaPendiente } = useAuthStore.getState();
    if (cajaPendienteCierre) {
      limpiarCajaPendiente();
      console.log('🧹 Estado de caja pendiente limpiado por resolución');
    }
  };

  const handleSistemaDesbloqueado = (data) => {
    console.log('🔓 Sistema desbloqueado:', data);
    
    toast.success(`🔓 ${data.motivo}`, {
      duration: 4000,
      style: {
        background: '#ECFDF5',
        border: '1px solid #10B981',
        color: '#065F46'
      }
    });

    // Asegurar que el estado local está limpio
    const { limpiarCajaPendiente } = useAuthStore.getState();
    limpiarCajaPendiente();
  };

    // 🔧 REGISTRAR TODOS LOS LISTENERS
    socket.on('bloquear_usuarios', handleBloqueaUsuarios);
    socket.on('bloquear_usuarios_diferencia', handleBloqueaDiferencia);
    socket.on('desbloquear_usuarios', handleDesbloquea);
    socket.on('force_logout', handleForceLogout); // 🆕 NUEVO LISTENER
    socket.on('caja_abierta', handleCajaAbierta);
    socket.on('caja_cerrada', handleCajaCerrada);
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('users-update', handleUsersUpdate);
    socket.on('caja-updated', handleCajaUpdated);
    // Limpiar listeners anteriores antes de agregar nuevos
    socket.off('transaction-added');
    socket.off('transaction-deleted');
    
    socket.on('transaction-added', handleTransactionAdded);
    socket.on('transaction-deleted', handleTransactionDeleted);
    
    socket.on('error', handleError);

    // ✅ DEBUG: Verificar listeners registrados
console.log('🔍 DEBUG: Registrando listeners...');
console.log('🔍 Socket ID:', socket.id);
console.log('🔍 Socket conectado:', socket.connected);

socket.on('venta_procesada', handleVentaProcesada);
console.log('✅ Listener venta_procesada REGISTRADO');
    socket.on('usuarios_conectados_actualizado', handleUsuariosActualizados);
    // 🆕 EVENTOS DE STOCK EN TIEMPO REAL
    socket.on('stock_reservado', handleStockReservado);
    socket.on('stock_liberado', handleStockLiberado);
     // 🆕 LISTENERS PARA CAJAS PENDIENTES
    socket.on('auto_cierre_ejecutado', handleAutoCierreEjecutado);
    socket.on('caja_pendiente_resuelta', handleCajaPendienteResuelta);
    socket.on('sistema_desbloqueado', handleSistemaDesbloqueado);

    // 🔧 CLEANUP
    return () => {
      console.log('🧹 Limpiando listeners de socket');
      socket.off('bloquear_usuarios', handleBloqueaUsuarios);
      socket.off('bloquear_usuarios_diferencia', handleBloqueaDiferencia);
      socket.off('desbloquear_usuarios', handleDesbloquea);
      socket.off('force_logout', handleForceLogout); // 🆕 NUEVO CLEANUP
      socket.off('caja_abierta', handleCajaAbierta);
      socket.off('caja_cerrada', handleCajaCerrada);
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('users-update', handleUsersUpdate);
      socket.off('caja-updated', handleCajaUpdated);
      socket.off('transaction-added', handleTransactionAdded);
      socket.off('transaction-deleted', handleTransactionDeleted);
      socket.off('error', handleError);
      socket.off('venta_procesada', handleVentaProcesada);
      console.log('🧹 Listener venta_procesada REMOVIDO');
      socket.off('usuarios_conectados_actualizado', handleUsuariosActualizados);
      socket.off('stock_reservado', handleStockReservado);
      socket.off('stock_liberado', handleStockLiberado);
      // 🆕 CLEANUP PARA CAJAS PENDIENTES
      socket.off('auto_cierre_ejecutado', handleAutoCierreEjecutado);
      socket.off('caja_pendiente_resuelta', handleCajaPendienteResuelta);
      socket.off('sistema_desbloqueado', handleSistemaDesbloqueado);
    };
  }, [socket?.id]);

// ✅ HANDLER PARA VENTA PROCESADA CORREGIDO - SIEMPRE RECARGA
const handleVentaProcesada = (data) => {
  console.log('🚀🚀🚀 VENTA PROCESADA RECIBIDA - INICIO DEBUG 🚀🚀🚀');
  console.log('📊 Data recibida:', data);
  
  const { usuario } = useAuthStore.getState();
  const esDelMismoUsuario = data.usuario === usuario?.nombre;
  
  console.log('🔍 Debug checks:');
  console.log('  - Usuario del evento:', data.usuario);
  console.log('  - Usuario actual:', usuario?.nombre);
  console.log('  - Es del mismo usuario?:', esDelMismoUsuario);
  
  // ✅ SIEMPRE RECARGAR TRANSACCIONES (para todos los usuarios)
  // ✅ SIEMPRE RECARGAR TRANSACCIONES (para todos los usuarios)
const cajaState = useCajaStore.getState();
console.log('📦 CajaStore funciones disponibles:', Object.keys(cajaState));

// Buscar la función correcta de obtener transacciones
const funcionesTransacciones = Object.keys(cajaState).filter(key => 
  key.toLowerCase().includes('transaccion') || 
  key.toLowerCase().includes('obtener') ||
  key.toLowerCase().includes('load') ||
  key.toLowerCase().includes('fetch')
);

console.log('🔍 Funciones relacionadas con transacciones:', funcionesTransacciones);

// ✅ USAR LAS FUNCIONES CORRECTAS DISPONIBLES
let funcionEjecutada = false;

// Opción 1: Usar processVentaCompletada que está específicamente para ventas
if (cajaState.processVentaCompletada && data.venta) {
  console.log('🔄 EJECUTANDO processVentaCompletada...');
  cajaState.processVentaCompletada(data);
  funcionEjecutada = true;
}

// Opción 2: Usar addTransaction para agregar la transacción manualmente
else if (cajaState.addTransaction && data.venta) {
  console.log('🔄 EJECUTANDO addTransaction...');
  // Convertir datos de venta a formato de transacción
  const transaccionParaAgregar = {
    transaccion: {
      id: data.venta.id,
      tipo: 'INGRESO',
      categoria: `Venta - ${data.venta.items?.length || 0} productos`,
      totalBs: data.venta.totalBs,
      totalUsd: data.venta.totalUsd,
      fechaHora: data.venta.fechaHora || data.timestamp,
      usuario: data.usuario,
      clienteNombre: data.venta.clienteNombre,
      codigoVenta: data.venta.codigoVenta,
      metodoPagoPrincipal: data.venta.metodoPagoPrincipal || 'efectivo_bs'
    }
  };
  cajaState.addTransaction(transaccionParaAgregar);
  funcionEjecutada = true;
}

// Opción 3: Re-inicializar todo como fallback
else if (cajaState.initialize) {
  console.log('🔄 EJECUTANDO initialize como fallback...');
  cajaState.initialize();
  funcionEjecutada = true;
}

else {
  console.error('❌ NO SE PUDO ejecutar ninguna función de actualización');
}

if (funcionEjecutada) {
  console.log('✅ Función de transacciones ejecutada');
}
  
  // Solo mostrar toast a OTROS usuarios
  if (!esDelMismoUsuario) {
    toast.success(`🚀 ${data.usuario} procesó una venta`, {
      duration: 4000,
      icon: '✅'
    });
    console.log('✅ Toast mostrado para otro usuario');
  } else {
    console.log('🔄 Toast omitido (venta propia) pero datos recargados');
  }
  
  console.log('🚀🚀🚀 VENTA PROCESADA - FIN DEBUG 🚀🚀🚀');
};

  // 🔒 HANDLER PARA STOCK RESERVADO
  const handleStockReservado = async (data) => {
    console.log('📦 Stock reservado en tiempo real:', data);
    
    // Actualizar inventario local si está disponible
    try {
      const { useInventarioStore } = await import('../store/inventarioStore');
      const { actualizarStockReservado } = useInventarioStore.getState();
      if (actualizarStockReservado) {
        actualizarStockReservado(data.productoId, data.stockReservado);
      }
    } catch (error) {
      console.log('Inventario store no disponible:', error);
    }
    
    // Mostrar notificación SOLO para reservas de otros usuarios
    const { usuario: usuarioActual } = useAuthStore.getState();
    if (data.usuario !== usuarioActual?.nombre) {
      toast(`🔒 ${data.usuario} reservó stock de ${data.producto}\n📦 Disponible: ${data.stockDisponible}`, {
      duration: 4000,
      icon: '📦'
    });
}
  };


  // 🔓 HANDLER PARA STOCK LIBERADO  
  const handleStockLiberado = async (data) => {
    console.log('📦 Stock liberado en tiempo real:', data);
    
    // Actualizar inventario local si está disponible
    try {
      const { useInventarioStore } = await import('../store/inventarioStore');
      const { actualizarStockReservado } = useInventarioStore.getState();
      if (actualizarStockReservado) {
        actualizarStockReservado(data.productoId, data.stockReservado);
      }
    } catch (error) {
      console.log('Inventario store no disponible:', error);
    }
    
    // Mostrar notificación SOLO para liberaciones de otros usuarios
      const { usuario: usuarioActual } = useAuthStore.getState();
      if (data.usuario !== usuarioActual?.nombre) {
        toast(`🔓 ${data.usuario} liberó stock de ${data.producto}\n📦 Disponible: ${data.stockDisponible}`, {
            duration: 4000,
            icon: '🔓'
          });
      }
  };

  // 🎯 FUNCIÓN PARA EMITIR EVENTOS
  const emitirEvento = (evento, data) => {
    if (!socket) {
      console.warn('⚠️ Socket no inicializado para emitir:', evento);
      toast.error('Conexión no disponible');
      return false;
    }

    if (!socket.connected) {
      console.warn('⚠️ Socket no conectado para emitir:', evento);
      toast.error('Conexión perdida, reintentando...');
      return false;
    }

    console.log(`📡 EMITIENDO EVENTO: ${evento}`, data);
    socket.emit(evento, data);
    return true;
  };

  // 🔌 CONECTAR SOCKET AL STORE
 
  
  

  return {
    emitirEvento,
    usuariosBloqueados,
    motivoBloqueo,
    usuarioCerrando,
    socketConnected: isSocketConnected(),
    socket // Exposer el socket para debug
  };
};