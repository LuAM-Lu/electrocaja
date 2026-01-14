// client/src/hooks/useSocketEvents.js (CON FORCE LOGOUT AGREGADO)
import { useEffect, useRef, useState } from 'react';
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

  const { updateCajaStatus, addTransaction, removeTransaction, cargarCajaActual } = useCajaStore();


  // Estados locales para bloqueos (VERSIÓN SIMPLE QUE FUNCIONABA)
  const [usuariosBloqueados, setUsuariosBloqueados] = useState(false);
  const [motivoBloqueo, setMotivoBloqueo] = useState('');
  const [usuarioCerrando, setUsuarioCerrando] = useState('');

  useEffect(() => {
    if (!socket) {
      return;
    }

    // 🔧 HANDLERS ESPECÍFICOS PARA BLOQUEOS (VERSIÓN SIMPLE QUE FUNCIONABA)
    const handleBloqueaUsuarios = (data) => {
      // ✅ OBTENER USUARIO ACTUAL DEL STORE (no del closure)
      const { usuario: usuarioActual } = useAuthStore.getState();

      setUsuariosBloqueados(true);
      setMotivoBloqueo(data.motivo);
      setUsuarioCerrando(data.usuario_cerrando);

      // Solo mostrar toast si no es el usuario que está cerrando
      if (usuarioActual?.nombre !== data.usuario_cerrando) {
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
      // ✅ OBTENER USUARIO ACTUAL DEL STORE (no del closure)
      const { usuario: usuarioActual } = useAuthStore.getState();

      setUsuariosBloqueados(true);
      setMotivoBloqueo(data.mensaje);
      setUsuarioCerrando(data.usuario_cerrando);

      if (usuarioActual?.nombre !== data.usuario_cerrando) {
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
        logout();
      }, 3000); // 3 segundos para leer el mensaje
    };

    const handleCajaAbierta = (data) => {
      // ✅ OBTENER USUARIO ACTUAL DEL STORE (no del closure)
      const { usuario: usuarioActual } = useAuthStore.getState();

      // Evitar duplicado si el usuario actual abrió la caja
      if (usuarioActual?.nombre === data.usuario) return;
      toast.success(`📦 Caja abierta por ${data.usuario}`, {
        duration: 4000,
        id: 'caja-abierta',
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

      // ✅ OBTENER USUARIO ACTUAL DEL STORE (no del closure)
      const { usuario: usuarioActual } = useAuthStore.getState();

      // 🔇 NO MOSTRAR TOAST - El modal de cierre ya tiene su propia UI de progreso
      // Para otros usuarios, el estado de caja se actualiza silenciosamente
      // El toast era redundante y confuso con la pantalla de cierre
      /*
      if (usuarioActual?.nombre === data.usuario) return;
      toast.success(`🔒 Caja cerrada por ${data.usuario}`, {
        duration: 4000,
        id: 'caja-cerrada',
        style: {
          background: '#EFF6FF',
          color: '#1E40AF'
        }
      });
      */

      // 🔧 ACTUALIZAR ESTADO DE CAJA EN LUGAR DE RECARGAR
      if (updateCajaStatus && data.caja) {
        console.log('🔧 Actualizando estado de caja cerrada:', data.caja);
        updateCajaStatus(data.caja);
      }
    };

    // 🔧 HANDLERS PARA USUARIOS CONECTADOS
    const handleUserConnected = (data) => {
      console.log('👤 Usuario conectado:', data);

      // ✅ OBTENER USUARIO ACTUAL DEL STORE (no del closure)
      const { usuario: usuarioActual } = useAuthStore.getState();

      if (data.user && data.user.id !== usuarioActual?.id) {
        agregarUsuarioConectado(data.user);
        toast(`👋 ${data.user.nombre} se ha conectado`, {
          duration: 2000,
          icon: '🟢'
        });
      }
    };

    const handleUserDisconnected = (data) => {
      console.log('👤 Usuario desconectado:', data);

      // ✅ OBTENER USUARIO ACTUAL DEL STORE (no del closure)
      const { usuario: usuarioActual } = useAuthStore.getState();

      if (data.userId !== usuarioActual?.id) {
        eliminarUsuarioConectado(data.userId);
        toast(`👋 ${data.userName || 'Usuario'} se ha desconectado`, {
          duration: 2000,
          icon: '🔴'
        });
      }
    };

    // En useSocketEvents.js, función handleUsuariosActualizados:
    const handleUsuariosActualizados = (data) => {
      if (data.usuarios && Array.isArray(data.usuarios)) {
        const usuariosFormateados = data.usuarios.map((userStr, index) => {
          // 🔧 REGEX MEJORADO
          const match = userStr.match(/^(.+?)\s+\((.+)\)$/);
          if (match) {
            return {
              id: `user_${index}_${match[1].replace(/\s+/g, '_')}`,
              nombre: match[1].trim(),
              rol: match[2],
              sucursal: 'Principal',
              ultima_actividad: new Date().toISOString()
            };
          }

          return {
            id: `user_${index}_${userStr.replace(/\s+/g, '_')}`,
            nombre: userStr || 'Usuario Desconocido',
            rol: 'usuario',
            sucursal: 'Principal',
            ultima_actividad: new Date().toISOString()
          };
        });

        // ACTUALIZAR EL STORE
        useAuthStore.setState({ usuariosConectados: usuariosFormateados });
      }
    };

    const handleUsersUpdate = (data) => {
      // Aquí podrías actualizar la lista completa si es necesario
    };

    // 🔧 HANDLERS PARA TRANSACCIONES
    const handleCajaUpdated = (cajaData) => {
      if (updateCajaStatus) {
        updateCajaStatus(cajaData);
      }
      toast.success('Estado de caja actualizado');
    };

    const handleTransactionAdded = async (transaction) => {
      // ✅ SIEMPRE recargar caja para actualizar TransactionTable en tiempo real
      if (cargarCajaActual) {
        setTimeout(() => {
          cargarCajaActual(true); // forceRefresh = true
        }, 300);
      }

      // También intentar agregar la transacción al store (fallback)
      if (addTransaction && transaction?.transaccion) {
        const { usuario } = useAuthStore.getState();
        if (transaction.usuario !== usuario?.nombre) {
          const transaccionMapeada = {
            transaccion: {
              ...transaction.transaccion,
              tipo: transaction.transaccion.tipo?.toLowerCase() || 'ingreso',
              usuario: transaction.usuario || 'Usuario desconocido',
              fecha_hora: transaction.transaccion.fechaHora || transaction.transaccion.fecha_hora || new Date().toISOString()
            }
          };

          addTransaction(transaccionMapeada);
          toast.success(`💰 ${transaction.usuario} registró una transacción`);
        } else {
          // Transacción propia ignorada para evitar duplicado
        }
      }
    };

    const handleNuevaTransaccion = async (data) => {
      // ✅ SIEMPRE recargar caja para TODAS las transacciones (ingresos, egresos, servicios)
      // Esto asegura que TransactionTable se actualice en tiempo real
      if (cargarCajaActual) {
        // Forzar refresh para evitar cache y asegurar datos actualizados
        setTimeout(() => {
          cargarCajaActual(true); // forceRefresh = true
        }, 300);
      }

      // También intentar agregar la transacción al store si está disponible (fallback)
      if (addTransaction && data?.transaccion) {
        const { usuario } = useAuthStore.getState();
        // Agregar transacción de otros usuarios o si es servicio técnico (siempre actualizar)
        const esTransaccionServicio = data.tipo === 'servicio_tecnico' ||
          data.transaccion?.servicioTecnicoId ||
          data.transaccion?.tipo === 'servicio_tecnico';

        if (data.usuario !== usuario?.nombre || esTransaccionServicio) {
          const transaccionMapeada = {
            transaccion: {
              ...data.transaccion,
              tipo: data.transaccion.tipo?.toLowerCase() || 'ingreso',
              usuario: data.usuario || 'Usuario desconocido',
              fecha_hora: data.transaccion.fechaHora || data.transaccion.fecha_hora || new Date().toISOString()
            }
          };

          addTransaction(transaccionMapeada);
          if (!esTransaccionServicio && data.usuario !== usuario?.nombre) {
            toast.success(`💰 ${data.usuario} registró una transacción`);
          }
        }
      }
    };

    const handleTransactionDeleted = (data) => {
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

    //     // 🔧 REGISTRAR TODOS LOS LISTENERS
    //     socket\.off\('bloquear_usuarios'\);\nsocket\.off\('bloquear_usuarios_diferencia'\);\nsocket\.off\('desbloquear_usuarios'\);\nsocket\.off\('force_logout'\);\nsocket\.off\('caja_abierta'\);\nsocket\.off\('caja_cerrada'\);\nsocket\.off\('user-connected'\);\nsocket\.off\('user-disconnected'\);\nsocket\.off\('users-update'\);\nsocket\.off\('caja-updated'\);\nsocket\.off\('transaction-added'\);\nsocket\.off\('transaction-deleted'\);\nsocket\.off\('error'\);\nsocket\.off\('venta_procesada'\);\nsocket\.off\('usuarios_conectados_actualizado'\);\nsocket\.off\('stock_reservado'\);\nsocket\.off\('stock_liberado'\);\nsocket\.off\('auto_cierre_ejecutado'\);\nsocket\.off\('caja_pendiente_resuelta'\);\nsocket\.off\('sistema_desbloqueado'\);\n\n//\ REGISTRAR\ TODOS\ LOS\ LISTENERS\nsocket\.on\('bloquear_usuarios',\ handleBloqueaUsuarios\);
    // Pre-clean previous listeners to avoid duplicates
    socket.off('bloquear_usuarios');
    socket.off('bloquear_usuarios_diferencia');
    socket.off('desbloquear_usuarios');
    socket.off('force_logout');
    socket.off('caja_abierta');
    socket.off('caja_cerrada');
    socket.off('user-connected');
    socket.off('user-disconnected');
    socket.off('users-update');
    socket.off('caja-updated');
    socket.off('transaction-added');
    socket.off('transaction-deleted');
    socket.off('error');
    socket.off('venta_procesada');
    socket.off('usuarios_conectados_actualizado');
    socket.off('stock_reservado');
    socket.off('stock_liberado');
    socket.off('auto_cierre_ejecutado');
    socket.off('caja_pendiente_resuelta');
    socket.off('sistema_desbloqueado');

    // Register listeners
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
    // 🆕 ESCUCHAR evento nueva_transaccion del backend (para servicios técnicos)
    socket.on('nueva_transaccion', handleNuevaTransaccion);

    socket.on('error', handleError);

    socket.on('venta_procesada', handleVentaProcesada);
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
      // LIMPIAR SOCKET LISTENERS (NO window events - authStore los maneja)
      socket.off('bloquear_usuarios', handleBloqueaUsuarios);
      socket.off('bloquear_usuarios_diferencia', handleBloqueaDiferencia);
      socket.off('desbloquear_usuarios', handleDesbloquea);
      socket.off('force_logout', handleForceLogout);
      socket.off('caja_abierta', handleCajaAbierta);
      socket.off('caja_cerrada', handleCajaCerrada);
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('users-update', handleUsersUpdate);
      socket.off('caja-updated', handleCajaUpdated);
      socket.off('transaction-added', handleTransactionAdded);
      socket.off('transaction-deleted', handleTransactionDeleted);
      socket.off('nueva_transaccion', handleNuevaTransaccion);
      socket.off('error', handleError);
      socket.off('venta_procesada', handleVentaProcesada);
      socket.off('usuarios_conectados_actualizado', handleUsuariosActualizados);
      socket.off('stock_reservado', handleStockReservado);
      socket.off('stock_liberado', handleStockLiberado);
      // 🆕 CLEANUP PARA CAJAS PENDIENTES
      socket.off('auto_cierre_ejecutado', handleAutoCierreEjecutado);
      socket.off('caja_pendiente_resuelta', handleCajaPendienteResuelta);
      socket.off('sistema_desbloqueado', handleSistemaDesbloqueado);
    };
  }, [socket?.id]);

  // ✅ HANDLER PARA VENTA PROCESADA - OPTIMIZADO SIN REFRESH
  const handleVentaProcesada = (data) => {
    console.log('🚀 VENTA PROCESADA RECIBIDA');
    console.log('📊 Data recibida:', data);

    // ⚠️ VALIDACIÓN CRÍTICA: Verificar que data.venta existe
    if (!data || !data.venta) {
      console.error('❌ ERROR: data.venta es undefined o null');
      console.error('   Data completo:', data);
      return; // ⚠️ SALIR TEMPRANO para evitar errores
    }

    // ✅ HELPER: Función mejorada para detectar modal de procesamiento
    const hayModalProcesando = () => {
      // Verificar múltiples formas de detectar el modal
      const porAtributo = document.querySelector('[data-procesando-modal="true"]');
      const porClase = document.querySelector('.venta-procesando-modal');
      // Verificar z-index alto como fallback
      const modalesAltos = Array.from(document.querySelectorAll('[style*="z-index"]'))
        .filter(el => {
          const zIndex = parseInt(el.style.zIndex) || 0;
          return zIndex >= 99999;
        });

      return !!(porAtributo || porClase || modalesAltos.length > 0);
    };

    // ✅ HELPER: Comparación robusta de usuarios
    const esDelMismoUsuario = (dataUsuario, usuarioActual) => {
      if (!dataUsuario || !usuarioActual) return false;

      // Comparar por ID si está disponible
      if (dataUsuario.id && usuarioActual.id) {
        return dataUsuario.id === usuarioActual.id;
      }

      // Normalizar nombres para comparación (sin espacios, minúsculas)
      const normalizar = (str) => str?.toLowerCase().trim().replace(/\s+/g, '');
      const nombreData = typeof dataUsuario === 'string' ? dataUsuario : dataUsuario.nombre;
      const nombreActual = usuarioActual.nombre;

      return normalizar(nombreData) === normalizar(nombreActual);
    };

    const { usuario } = useAuthStore.getState();
    const esMismoUsuario = esDelMismoUsuario(data.usuario, usuario);

    console.log('🔍 Debug:');
    console.log('  - Usuario evento:', data.usuario);
    console.log('  - Usuario actual:', usuario?.nombre);
    console.log('  - Es mismo usuario?:', esMismoUsuario);
    console.log('  - Tiene venta.id?:', !!data.venta.id);
    console.log('  - Tiene venta.pagos?:', !!data.venta.pagos);

    const cajaState = useCajaStore.getState();

    // ✅ INTENTAR ACTUALIZAR TRANSACCIONES SIN RECARGAR TODO
    let funcionEjecutada = false;

    // Opción 1: Usar processVentaCompletada que está específicamente para ventas
    if (cajaState.processVentaCompletada && data.venta) {
      cajaState.processVentaCompletada(data);
      funcionEjecutada = true;
    }

    // Opción 2: Usar addTransaction + actualizar totales de caja (SIN recargar todo)
    else if (cajaState.addTransaction && data.venta) {

      // 1. Agregar la transacción a la lista
      const transaccionParaAgregar = {
        transaccion: {
          id: data.venta.id,
          tipo: 'ingreso', // ✅ Usar minúsculas para consistencia con cajaStore
          categoria: `Venta - ${data.venta.items?.length || 0} productos`,
          totalBs: data.venta.totalBs,
          totalUsd: data.venta.totalUsd,
          fechaHora: data.venta.fechaHora || data.timestamp,
          usuario: data.usuario,
          clienteNombre: data.venta.clienteNombre,
          codigoVenta: data.venta.codigoVenta,
          metodoPagoPrincipal: data.venta.metodoPagoPrincipal || 'efectivo_bs',
          // ✅ INCLUIR CAMPOS NECESARIOS PARA EVITAR UNDEFINED
          pagos: data.venta.pagos || [],  // ⚠️ Array de pagos
          items: data.venta.items || [],  // ⚠️ Array de items
          observaciones: data.venta.observaciones || ''
        }
      };
      cajaState.addTransaction(transaccionParaAgregar);

      // 2. Actualizar totales de la caja (sin recargar todo) - SOLO SI el servidor los envía
      const cajaActual = cajaState.cajaActual;
      if (cajaActual && data.venta.totalesActualizados) {
        useCajaStore.setState({
          cajaActual: {
            ...cajaActual,
            total_ingresos_bs: data.venta.totalesActualizados.totalIngresosBs || cajaActual.total_ingresos_bs,
            total_ingresos_usd: data.venta.totalesActualizados.totalIngresosUsd || cajaActual.total_ingresos_usd,
            total_pago_movil: data.venta.totalesActualizados.totalPagoMovil || cajaActual.total_pago_movil
          }
        });
      }

      funcionEjecutada = true;
    }

    // Opción 3: Recargar solo transacciones de forma ligera (SIN initialize)
    else if (cajaState.cargarCajaActual) {
      // ✅ PREVENIR QUE SE EJECUTE SI HAY UN MODAL DE PROCESAMIENTO ABIERTO
      if (!hayModalProcesando()) {
        // cargarCajaActual solo recarga transacciones, no toda la app
        cajaState.cargarCajaActual();
        funcionEjecutada = true;
      } else {
        console.log('⏸️ cargarCajaActual omitido - Modal de procesamiento activo');
        // No ejecutar para evitar conflictos con el modal de procesamiento
      }
    }

    else {
      console.warn('⚠️ No se encontró función para actualizar transacciones - La UI se actualizará en el próximo refresh manual');
      // NO hacer nada en lugar de recargar toda la app
      // La próxima vez que el usuario interactúe, verá la nueva transacción
    }

    if (funcionEjecutada) {
      console.log('✅ Transacción actualizada sin recargar página');
    } else {
      console.warn('⚠️ No se pudo actualizar transacción - requiere refresh manual');
    }

    // Solo mostrar toast a OTROS usuarios
    if (!esMismoUsuario) {
      toast.success(`🚀 ${data.usuario} procesó una venta`, {
        duration: 4000,
        icon: '✅'
      });
    }
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


