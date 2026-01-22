// components/IngresoModalV2.jsx - ESTRUCTURA BASE CON PESTAÑAS
import React, { useState, useEffect, useRef, useCallback } from 'react';
// ✅ REMOVIDO flushSync - usando alternativa más segura
import {
  X, ShoppingCart, User, Package, CreditCard, CheckCircle,
  AlertCircle, ArrowRight, ArrowLeft, Clock, DollarSign,
  Receipt, Send, FileText, Printer, Percent, AlertTriangle,
  Banknote, Star, Heart, Trash2, Lock, Info, Lightbulb
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import { useInventarioStore } from '../store/inventarioStore';
// ✅ Hook de protección eliminado para evitar bucle infinito
import toast from 'react-hot-toast';
import ClienteSelector from './presupuesto/ClienteSelector';
import ItemsTable from './presupuesto/ItemsTable';
import PagosPanel from './venta/PagosPanel';
import FinalizarVentaPanel from './venta/FinalizarVentaPanel';
import ConfirmacionVentaModal from './venta/ConfirmacionVentaModal';
import VentaProcesandoModal from './venta/VentaProcesandoModal';
import {
  generarPDFFactura,
  generarImagenWhatsApp,
  imprimirFacturaTermica,
  descargarPDF
} from '../utils/printUtils';
import DescuentoModal from './DescuentoModal';
import { api } from '../config/api';
// ✅ NUEVOS IMPORTS PARA MEJORAR CÓDIGO
import { PROCESSING_CONFIG, PROCESSING_STEPS, ERROR_MESSAGES } from '../constants/processingConstants';
import { handleError, validateBackendResponse } from '../utils/errorHandler';
import { executePostSaleOption, delay, waitForRef, prepareSalePayload } from '../utils/saleProcessingHelpers';


// 📡 COMPONENTE INDICADOR DE CONEXIÓN
const ConexionIndicador = ({ socket }) => {
  const [conectado, setConectado] = useState(true);
  const [ultimaDesconexion, setUltimaDesconexion] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setConectado(true);
      if (ultimaDesconexion) {
        const tiempoDesconectado = Date.now() - ultimaDesconexion;
        if (tiempoDesconectado > 2000) { // Más de 2 segundos
          toast.success('Conexión restaurada', {
            duration: 2000
          });
        }
        setUltimaDesconexion(null);
      }
    };

    const handleDisconnect = () => {
      setConectado(false);
      setUltimaDesconexion(Date.now());
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, ultimaDesconexion]);

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full transition-colors ${conectado ? 'bg-green-400' : 'bg-red-400 animate-pulse'
        }`}></div>
      <div className="text-xs text-emerald-100">
        {conectado ? 'En línea' : 'Desconectado'}
      </div>
    </div>
  );
};


const validarYCalcularTotales = (ventaData, descuento, tasaCambio) => {
  const errores = [];

  if (!ventaData) {
    errores.push('Datos de venta no disponibles');
    return { errores, totales: null };
  }

  if (!ventaData.items || ventaData.items.length === 0) {
    errores.push('No hay productos en la venta');
  }

  if (!tasaCambio || tasaCambio <= 0) {
    errores.push('Tasa de cambio inválida');
  }

  // 🔧 CALCULAR TOTALES CONSISTENTEMENTE
  // 1. Calcular subtotal en USD desde los items
  const subtotalUsd = (ventaData.items || []).reduce((sum, item) => {
    return sum + ((item.cantidad || 0) * (item.precio_unitario || 0));
  }, 0);

  // 2. Convertir subtotal a Bs
  const subtotalBs = subtotalUsd * tasaCambio;

  // 3. Aplicar descuento en Bs
  const descuentoFinal = Math.max(0, descuento || 0);

  // 4. Calcular total final en Bs
  const totalAPagarBs = Math.max(0, subtotalBs - descuentoFinal);

  // 5. Calcular total final en USD
  const totalAPagarUsd = totalAPagarBs / tasaCambio;

  const totales = {
    subtotalUsd: Math.round(subtotalUsd * 100) / 100,
    subtotalBs: Math.round(subtotalBs * 100) / 100,
    descuento: Math.round(descuentoFinal * 100) / 100,
    totalAPagar: Math.round(totalAPagarBs * 100) / 100,
    totalUsd: Math.round(totalAPagarUsd * 100) / 100,
    totalItems: (ventaData.items || []).reduce((sum, item) => sum + (item.cantidad || 0), 0),
    productosUnicos: (ventaData.items || []).length
  };

  return { errores, totales };
};

// 🏦 CONFIGURACIÓN DE MÉTODOS DE PAGO (Importada de PagosPanel)
const METODOS_PAGO = [
  { value: 'efectivo_bs', label: 'Efectivo Bs', moneda: 'bs', requiere_referencia: false },
  { value: 'efectivo_usd', label: 'Efectivo USD', moneda: 'usd', requiere_referencia: false },
  { value: 'pago_movil', label: 'Pago Móvil', moneda: 'bs', requiere_referencia: true },
  { value: 'transferencia', label: 'Transferencia', moneda: 'bs', requiere_referencia: true },
  { value: 'zelle', label: 'Zelle', moneda: 'usd', requiere_referencia: true },
  { value: 'binance', label: 'Binance', moneda: 'usd', requiere_referencia: true },
  { value: 'tarjeta', label: 'Tarjeta', moneda: 'bs', requiere_referencia: true }
];

// 🔧 FUNCIÓN PARA FORMATEAR NÚMEROS VENEZOLANOS
const formatearVenezolano = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
  return numero.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// 🆕 FUNCIÓN PARA GENERAR CÓDIGO ÚNICO DE VENTA
const generarCodigoVenta = () => {
  const fecha = new Date();
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear().toString().slice(-2);
  const timestamp = Date.now().toString().slice(-2);

  return `V${dia}${mes}${año}${timestamp}`;
};


const liberarStockAPI = async (productoId, sesionId, cantidad = null) => {
  try {
    const payload = { productoId, sesionId };
    if (cantidad !== null) {
      payload.cantidad = cantidad; // Para liberación parcial
    }

    const response = await api.post('/ventas/stock/liberar', payload);

    if (response.data.success) {
      console.log('✅ Stock liberado en backend:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ Error liberando stock:', error);
    throw error;
  }
};


// Generar ID de sesión único
const generarSesionId = () => {
  return `sesion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 🎨 CONFIGURACIÓN DE TABS (idéntica a PresupuestoModal)
const TABS = [
  { id: 'cliente', label: 'Cliente', icon: User, step: 1 },
  { id: 'items', label: 'Items', icon: Package, step: 2 },
  { id: 'pagos', label: 'Pagos', icon: CreditCard, step: 3 },
  { id: 'finalizar', label: 'Finalizar', icon: CheckCircle, step: 4 }
];

// 🧩 BREADCRUMB MODERNO CON VALIDACIONES (copiado de PresupuestoModal)
const BreadcrumbModerno = ({ tabs, activeTab, onTabChange, validaciones }) => {
  const currentIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-center">
        {/* Tabs/Pasos */}
        <div className="flex items-center space-x-2">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            const isCompleted = validaciones[tab.id]?.valido;
            const isPast = index < currentIndex;
            const isAccessible = validaciones[tab.id]?.accesible !== false; // Por defecto true si no está definido
            const canAccess = isAccessible && (index <= currentIndex || isPast || isCompleted);

            return (
              <React.Fragment key={tab.id}>
                <button
                  onClick={() => canAccess && onTabChange(tab.id)}
                  disabled={!canAccess}
                  title={!isAccessible ?
                    tab.id === 'items' ? 'Selecciona un cliente primero' :
                      tab.id === 'pagos' ? 'Completa items primero' :
                        tab.id === 'finalizar' ? 'Completa pagos primero' : ''
                    : ''
                  }
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${!isAccessible
                    ? 'text-gray-400 cursor-not-allowed border border-gray-200 opacity-50 bg-gray-50'
                    : isActive
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                      : isCompleted
                        ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                        : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${!isAccessible
                    ? 'bg-gray-200 text-gray-400'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                    {!isAccessible ? tab.step : isCompleted ? '✓' : tab.step}
                  </div>

                  <tab.icon className={`h-4 w-4 ${!canAccess ? 'text-gray-400' : ''}`} />
                  <span className={!canAccess ? 'text-gray-400' : ''}>{tab.label}</span>

                  {/* Badge de errores - solo mostrar si es accesible */}
                  {isAccessible && validaciones[tab.id]?.errores > 0 && (
                    <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {validaciones[tab.id].errores}
                    </div>
                  )}

                  {/* Icono de bloqueo para pestañas no accesibles */}
                  {!isAccessible && (
                    <Lock className="h-3 w-3 text-gray-500" />
                  )}
                </button>

                {index < tabs.length - 1 && (
                  <ArrowRight className={`h-4 w-4 ${canAccess ? 'text-gray-300' : 'text-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};


// 🎯 COMPONENTE PRINCIPAL
const IngresoModalV2 = ({ isOpen, onClose, emitirEvento, onMinimize }) => {
  const { usuario } = useAuthStore();

  // 🐛 DEBUG: INTERCEPTAR CAMBIOS EN isOpen PARA RASTREAR QUIÉN LO ABRE
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen !== isOpenRef.current) {
      const cambio = isOpen ? 'ABRIÓ' : 'CERRÓ';
      const stackTrace = new Error().stack;

      console.log(`🟢 [INGRESO MODAL] Estado cambió: ${cambio}`);
      console.log(`🟢 Anterior: ${isOpenRef.current}, Nuevo: ${isOpen}`);
      console.log(`🟢 Stack trace del cambio:`);
      console.log(stackTrace);

      // Buscar quién está llamando a setShowIngresoModal
      const stackLines = stackTrace?.split('\n') || [];
      const callerLine = stackLines.find(line =>
        line.includes('setShowIngresoModal') ||
        line.includes('handleNewTransaction') ||
        line.includes('FloatingActions') ||
        line.includes('Dashboard') ||
        line.includes('onClose')
      );

      if (callerLine) {
        console.log(`🟢 Llamado desde: ${callerLine}`);
      } else {
        console.log(`🟢 No se encontró el caller en el stack trace`);
      }

      isOpenRef.current = isOpen;
    }
  }, [isOpen]);

  // 🆕 HOOK PARA SOCKET (MEJORADO)
  const [socket, setSocket] = useState(null);
  const [socketLoading, setSocketLoading] = useState(false);

  useEffect(() => {
    // Inicializar socket cuando el modal se abre
    if (isOpen && !socket && !socketLoading) {
      setSocketLoading(true);
      import('../services/socket').then(socketModule => {
        // Obtener socket existente o inicializar si no existe
        let socketInstance = socketModule.getSocket();

        if (!socketInstance) {
          const token = localStorage.getItem('auth-token');
          if (token) {
            socketInstance = socketModule.initializeSocket(token);
          } else {
            return;
          }
        }

        if (socketInstance && typeof socketInstance.on === 'function') {
          setSocket(socketInstance);
        }
      }).catch(error => {
        console.error('❌ Error cargando socket:', error);
      }).finally(() => {
        setSocketLoading(false);
      });
    }
  }, [isOpen, socket, socketLoading]);

  // 🚨 MANEJO DE ERRORES DE SOCKET
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleSocketError = (error) => {
      console.error('❌ Error de socket:', error);
    };

    socket.on('error', handleSocketError);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('error', handleSocketError);
      }
    };
  }, [socket]);

  const { tasaCambio, agregarTransaccion } = useCajaStore();

  // 🆕 ID de sesión del backend
  const [sesionId] = useState(() => {
    const id = generarSesionId();
    return id;
  });

  // 🆕 CÓDIGO ÚNICO DE VENTA
  const [codigoVenta, setCodigoVenta] = useState('');

  // 📊 ESTADO PRINCIPAL DE LA VENTA (modificado)
  const [ventaData, setVentaData] = useState({
    cliente: null,
    items: [],
    pagos: [{
      id: 1,
      metodo: 'efectivo_bs',
      monto: '',
      banco: '',
      referencia: ''
    }],
    vueltos: [],
    descuentoAutorizado: 0,
    motivoDescuento: '',
    observaciones: '',
    subtotal: 0,
    totalUsd: 0,
    totalBs: 0
  });

  // 🎨 ESTADOS DE UI
  const [activeTab, setActiveTab] = useState('cliente');
  const [validaciones, setValidaciones] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🚨 ESTADO PARA MODAL DE CONFIRMACIÓN DE SALIDA
  const [showExitModal, setShowExitModal] = useState(false);

  // 💰 ESTADOS PARA DESCUENTO
  const [descuento, setDescuento] = useState(0);
  const [showDescuentoModal, setShowDescuentoModal] = useState(false);

  // 🛡️ PROTECCIÓN SIMPLIFICADA DE SUBMODALES
  useEffect(() => {
    if (isOpen) {
      // Registrar modal como activo
      if (typeof window !== 'undefined') {
        window.activeModals = window.activeModals || new Set();
        window.activeModals.add('ingreso-modal');
      }
    } else {
      // Desregistrar modal
      if (typeof window !== 'undefined') {
        window.activeModals = window.activeModals || new Set();
        window.activeModals.delete('ingreso-modal');
      }
    }

    return () => {
      // Cleanup
      if (typeof window !== 'undefined') {
        window.activeModals = window.activeModals || new Set();
        window.activeModals.delete('ingreso-modal');
      }
    };
  }, [isOpen]);

  // 🎈 ESTADOS PARA BURBUJA DE CONFLICTOS DE STOCK
  const [showStockConflictsModal, setShowStockConflictsModal] = useState(false);
  const [stockConflicts, setStockConflicts] = useState([]);

  // ✅ ESTADO PARA MODAL DE CONFIRMACIÓN DE VENTA
  const [showConfirmacionModal, setShowConfirmacionModal] = useState(false);

  // ✅ ESTADO PARA MODAL DE ALERT DE EXCEDENTE
  const [showExcedenteModal, setShowExcedenteModal] = useState(false);

  // ✅ ESTADO PARA MODAL DE PROCESAMIENTO DE VENTA
  const [showProcesandoModal, setShowProcesandoModal] = useState(false);
  const procesandoModalRef = useRef(null);
  // ✅ CAPTURAR OPCIONES DE PROCESAMIENTO PARA EL MODAL (evitar que se resetee)
  const [opcionesProcesamientoParaModal, setOpcionesProcesamientoParaModal] = useState(null);

  // ✅ REF PARA PREVENIR REAPERTURA DESPUÉS DE PROCESAR VENTA
  const ventaProcesadaRef = useRef(false);

  // ✅ PERSISTIR FLAG EN sessionStorage PARA SOBREVIVIR RE-MOUNTS
  const VENTA_PROCESADA_KEY = 'venta_procesada_flag';

  // ✅ INICIALIZAR FLAG DESDE sessionStorage INMEDIATAMENTE (ANTES DE CUALQUIER OTRO EFECTO)
  // Esto debe ejecutarse ANTES de cualquier otro useEffect que pueda resetear el flag
  const flagPersistido = typeof window !== 'undefined' ? sessionStorage.getItem(VENTA_PROCESADA_KEY) : null;
  if (flagPersistido === 'true' && !ventaProcesadaRef.current) {
    ventaProcesadaRef.current = true;
    console.log('🔵 [INGRESO MODAL] Flag de venta procesada restaurado desde sessionStorage (inicialización)');
  }

  // Inicializar desde sessionStorage si existe (backup para efectos)
  useEffect(() => {
    const flagPersistido = sessionStorage.getItem(VENTA_PROCESADA_KEY);
    if (flagPersistido === 'true' && !ventaProcesadaRef.current) {
      ventaProcesadaRef.current = true;
      console.log('🔵 [INGRESO MODAL] Flag de venta procesada restaurado desde sessionStorage (useEffect)');
    }
  }, []); // ✅ SOLO AL MONTAR, SIN DEPENDENCIAS

  // Función helper para marcar venta como procesada (persistente)
  const marcarVentaProcesada = useCallback(() => {
    ventaProcesadaRef.current = true;
    sessionStorage.setItem(VENTA_PROCESADA_KEY, 'true');
    console.log('🔵 [INGRESO MODAL] Venta marcada como procesada (persistente)');
  }, []);

  // Función helper para resetear flag (solo cuando realmente se abre una nueva venta)
  const resetearFlagVentaProcesada = useCallback(() => {
    ventaProcesadaRef.current = false;
    sessionStorage.removeItem(VENTA_PROCESADA_KEY);
    console.log('🔵 [INGRESO MODAL] Flag de venta procesada reseteado');
  }, []);

  // ✅ REF PARA RASTREAR SI EL COMPONENTE ESTÁ MONTADO (para limpiar setTimeout)
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef([]); // ✅ REF PARA RASTREAR TIMEOUTS Y LIMPIARLOS

  // 🐛 DEBUG: CONTADOR DE APERTURAS DEL MODAL
  const aperturasRef = useRef(0);
  const aperturasHistorialRef = useRef([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false; // Marcar como desmontado
      // ✅ LIMPIAR TODOS LOS TIMEOUTS PENDIENTES AL DESMONTAR
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  // 🐛 DEBUG: RASTREAR APERTURAS DEL MODAL (MEJORADO PARA DETECTAR STRICT MODE)
  useEffect(() => {
    if (isOpen) {
      // ✅ VERIFICAR FLAG DESDE sessionStorage ANTES DE CONTAR APERTURA
      const flagPersistido = sessionStorage.getItem(VENTA_PROCESADA_KEY);
      if (flagPersistido === 'true' && !ventaProcesadaRef.current) {
        ventaProcesadaRef.current = true;
        console.log('🔵 [INGRESO MODAL] Flag restaurado desde sessionStorage en rastreo de aperturas');
      }

      const ahora = Date.now();
      const ultimaApertura = aperturasHistorialRef.current[aperturasHistorialRef.current.length - 1];
      const tiempoDesdeUltimaApertura = ultimaApertura ? ahora - new Date(ultimaApertura.timestamp).getTime() : Infinity;

      // ✅ DETECTAR RE-RENDERS DE REACT STRICT MODE (menos de 50ms = probablemente Strict Mode)
      if (tiempoDesdeUltimaApertura < 50) {
        console.log('🟡 [INGRESO MODAL] Re-render de React Strict Mode detectado (ignorando)');
        console.log(`🟡 Tiempo desde última apertura: ${tiempoDesdeUltimaApertura}ms`);
        console.log('🟡 Esto es normal en desarrollo - React ejecuta efectos dos veces para detectar bugs');
        return; // No contar como apertura real
      }

      // ✅ PROTECCIÓN: NO CONTAR APERTURA SI LA VENTA FUE PROCESADA
      if (ventaProcesadaRef.current) {
        console.log('🔵 [INGRESO MODAL] PROTECCIÓN: Intento de contar apertura después de procesar venta - bloqueando (normal)');
        console.log('🔵 ventaProcesadaRef.current:', ventaProcesadaRef.current);
        return; // No contar como apertura real
      }

      aperturasRef.current += 1;
      const timestamp = new Date().toISOString();
      const stackTrace = new Error().stack;

      // Analizar stack trace para encontrar quién llamó a setShowIngresoModal
      const stackLines = stackTrace?.split('\n') || [];
      const callerLine = stackLines.find(line =>
        line.includes('setShowIngresoModal') ||
        line.includes('handleNewTransaction') ||
        line.includes('FloatingActions') ||
        line.includes('Dashboard')
      ) || 'No encontrado';

      const callerInfo = {
        ventaProcesada: ventaProcesadaRef.current,
        showProcesandoModal,
        isMounted: isMountedRef.current,
        activeTab,
        hasItems: ventaData.items.length > 0,
        hasCliente: !!ventaData.cliente,
        caller: callerLine.substring(0, 200) // Primeros 200 caracteres
      };

      aperturasHistorialRef.current.push({
        numero: aperturasRef.current,
        timestamp,
        ...callerInfo,
        stackTrace: stackTrace?.split('\n').slice(0, 10).join('\n') // Más líneas para mejor debugging
      });

      console.log('🔵 ============================================');
      console.log(`🔵 [INGRESO MODAL] APERTURA REAL #${aperturasRef.current}`);
      console.log(`🔵 Timestamp: ${timestamp}`);
      console.log(`🔵 Estado del componente:`, callerInfo);
      console.log(`🔵 Llamado desde:`, callerLine);
      console.log(`🔵 Total de aperturas REALES en esta sesión: ${aperturasRef.current}`);
      console.log('🔵 Stack trace completo:');
      console.log(stackTrace);
      console.log('🔵 ============================================');

      // También mostrar en la UI si está en modo desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('🔵 Historial completo de aperturas REALES:', aperturasHistorialRef.current);

        // Mostrar alerta si hay más de 1 apertura en menos de 1 segundo
        if (aperturasRef.current > 1) {
          const ultimasDos = aperturasHistorialRef.current.slice(-2);
          const tiempoEntreAperturas = new Date(ultimasDos[1].timestamp).getTime() - new Date(ultimasDos[0].timestamp).getTime();

          if (tiempoEntreAperturas < 1000) {
            console.warn('⚠️ [INGRESO MODAL] MÚLTIPLES APERTURAS REALES DETECTADAS EN MENOS DE 1 SEGUNDO');
            console.warn(`⚠️ Tiempo entre aperturas: ${tiempoEntreAperturas}ms`);
            console.warn('⚠️ Esto podría indicar un problema de aperturas no deseadas');
            console.warn('⚠️ Revisa el historial completo para ver quién está llamando al modal');
          }
        }
      }
    }
  }, [isOpen]); // ✅ SOLO DEPENDER DE isOpen PARA EVITAR RE-EJECUCIONES

  // 🧹 ESTADO PARA AUTO-LIMPIEZA INTELIGENTE
  const [totalAnterior, setTotalAnterior] = useState(0);
  const [hayPagosConfigurados, setHayPagosConfigurados] = useState(false);

  // 🆕 ESTADO PARA VALIDACIÓN DE PAGOS DESDE PAGOSPANEL
  const [pagosValidos, setPagosValidos] = useState(false);
  const [itemsDisponibles, setItemsDisponibles] = useState(false);

  const [excesoPendiente, setExcesoPendiente] = useState(0);

  const handlePagosValidationChange = (esValido, exceso = 0) => {
    setPagosValidos(esValido);
    setExcesoPendiente(exceso);
  };

  const handleItemsValidationChange = (tieneItems) => {
    setItemsDisponibles(tieneItems);
  };

  // 🔧 OPCIONES DE PROCESAMIENTO
  const [opcionesProcesamiento, setOpcionesProcesamiento] = useState({
    imprimirRecibo: false,    // 🧾 Recibo simple
    enviarWhatsApp: false,    // 📱 WhatsApp
    enviarEmail: false,       // 📧 Email
    generarFactura: true      // 📄 Factura no fiscal (por defecto activa)
  });

  // 🆕 GENERAR CÓDIGO AL ABRIR MODAL Y LIMPIAR AL CERRAR
  useEffect(() => {
    if (isOpen) {
      // ✅ PROTECCIÓN: NO LIMPIAR FLAG SI HAY UNA VENTA PROCESADA
      // Si el flag está activo, significa que hay una venta procesada recientemente
      // NO debemos limpiar el flag en este caso, sino cerrar el modal
      const flagPersistido = sessionStorage.getItem(VENTA_PROCESADA_KEY);
      if (flagPersistido === 'true' || ventaProcesadaRef.current) {
        console.log('🔵 [INGRESO MODAL] Intento de abrir modal con venta procesada - cerrando (normal)');
        console.log('🔵 Flag en sessionStorage:', flagPersistido);
        console.log('🔵 ventaProcesadaRef.current:', ventaProcesadaRef.current);
        // Cerrar el modal inmediatamente
        setTimeout(() => {
          onClose();
        }, 0);
        // NO limpiar el flag aquí - se limpiará cuando el usuario intente abrir una nueva venta manualmente
        return; // NO limpiar el flag ni generar código
      }

      // ✅ RESETEAR FLAG AL ABRIR MODAL (nueva venta) - SOLO SI NO HAY VENTA PROCESADA
      resetearFlagVentaProcesada();

      const codigo = generarCodigoVenta();
      setCodigoVenta(codigo);
    } else {
      // ✅ NO LIMPIAR SI EL MODAL DE PROCESAMIENTO ESTÁ ABIERTO
      if (showProcesandoModal) {
        return;
      }

      // ✅ NO LIMPIAR SI LA VENTA FUE PROCESADA (prevenir reapertura)
      if (ventaProcesadaRef.current) {
        return;
      }

      // 🧹 LIMPIAR RESERVAS AL CERRAR MODAL SIN GUARDAR
      const limpiarReservasAlCerrar = async () => {
        if (ventaData.items.length > 0) {
          try {
            for (const item of ventaData.items) {
              if (item.productoId) {
                await liberarStockAPI(item.productoId, sesionId);
              }
            }
          } catch (error) {
            console.error('❌ Error liberando reservas al cerrar modal:', error);
          }
        }
      };

      limpiarReservasAlCerrar();
    }
  }, [isOpen, showProcesandoModal]);

  // ✅ PROTECCIÓN: SOLO PREVENIR REAPERTURA SI EL MODAL SE INTENTA ABRIR DESPUÉS DE INICIAR PROCESAMIENTO
  // NO cerrar si el modal ya estaba abierto antes de iniciar el procesamiento
  // El modal principal debe permanecer abierto durante el procesamiento, solo ocultamos su contenido
  const prevIsOpenRef = useRef(false);
  const prevShowProcesandoModalRef = useRef(false);

  useEffect(() => {
    // Si el modal se intenta abrir (isOpen cambió de false a true) DESPUÉS de que el procesamiento ya estaba activo
    if (!prevIsOpenRef.current && isOpen && showProcesandoModal && prevShowProcesandoModalRef.current) {
      console.log('🔵 [INGRESO MODAL] Intento de abrir modal mientras se procesa venta - cerrando (normal)');
      setTimeout(() => {
        onClose();
      }, 0);
    }

    // Actualizar referencias
    prevIsOpenRef.current = isOpen;
    prevShowProcesandoModalRef.current = showProcesandoModal;
  }, [isOpen, showProcesandoModal, onClose]);

  /// 🔄 EFECTO PARA INICIALIZAR TOTAL ANTERIOR
  useEffect(() => {
    const totalActual = ventaData.totalBs || 0;
    if (totalAnterior === 0 && totalActual > 0) {
      setTotalAnterior(totalActual);
    }
  }, [ventaData.totalBs, totalAnterior]);


  // 🕒 MANEJAR CIERRE AUTOMÁTICO POR AFK (20 MIN)
  useEffect(() => {
    if (!isOpen || !socket || typeof socket.on !== 'function') return;

    const handleModalAFK = (data) => {
      // ✅ NO CERRAR SI EL MODAL DE DESCUENTO O PROCESAMIENTO ESTÁ ABIERTO
      if (showDescuentoModal || showProcesandoModal) {
        return;
      }

      // ✅ PROTECCIÓN ADICIONAL: NO CERRAR SI LA VENTA FUE PROCESADA
      if (ventaProcesadaRef.current) {
        console.log('🔵 [AFK] Intento de cerrar modal después de procesar venta - bloqueado (normal)');
        console.log('🔵 [AFK] ventaProcesadaRef.current:', ventaProcesadaRef.current);
        return;
      }

      // Mostrar notificación al usuario
      toast.error(data.message, {
        duration: 8000,
        style: {
          background: '#FEE2E2',
          border: '2px solid #F87171',
          color: '#991B1B',
          fontSize: '14px',
          maxWidth: '400px'
        }
      });

      // Cerrar modal automáticamente
      limpiarYCerrar();
    };

    // ✅ ESCUCHAR EVENTOS DE SINCRONIZACIÓN - SOLO EVENTOS ESPECÍFICOS DEL MODAL
    const handleInventarioActualizado = (data) => {
      // Actualizar store de inventario sin recargar
      import('../store/inventarioStore').then(({ useInventarioStore }) => {
        useInventarioStore.getState().obtenerInventario();
      });
    };

    // ✅ NO REGISTRAR venta_procesada - Ya lo maneja useSocketEvents.js
    socket.on('inventario_actualizado', handleInventarioActualizado);

    socket.on('cerrar_modal_venta_afk', handleModalAFK);

    // Cleanup
    return () => {
      socket.off('cerrar_modal_venta_afk', handleModalAFK);
      socket.off('inventario_actualizado', handleInventarioActualizado);
    };
  }, [isOpen, socket, showDescuentoModal, showProcesandoModal]); // ✅ AGREGAR showProcesandoModal

  // 🔄 RE-VALIDACIÓN AL RECONECTAR (PARA MÓVILES)
  useEffect(() => {
    if (!isOpen || !socket || typeof socket.on !== 'function') return;

    const handleReconexion = () => {
      // Solo re-validar si estamos en pestañas que requieren stock reservado
      if (activeTab === 'pagos' || activeTab === 'finalizar') {
        revalidarReservasAlReconectar();
      }
    };

    const handleStockLiberado = (data) => {
      // Mostrar notificación discreta de que hay stock disponible
      toast.success(`Stock disponible: ${data.productos.join(', ')}`, {
        duration: 4000,
        style: {
          background: '#F0FDF4',
          border: '1px solid #22C55E',
          color: '#15803D'
        }
      });
    };

    socket.on('connect', handleReconexion);
    socket.on('stock_liberado_desconexion', handleStockLiberado);

    return () => {
      socket.off('connect', handleReconexion);
      socket.off('stock_liberado_desconexion', handleStockLiberado);
    };
  }, [isOpen, activeTab, socket]);

  // 🔄 FUNCIÓN PARA RE-VALIDAR RESERVAS AL RECONECTAR
  const revalidarReservasAlReconectar = async () => {
    if (ventaData.items.length === 0) return;

    try {
      // Filtrar items que necesitan reserva
      const itemsParaRevalidar = ventaData.items
        .filter(item => item.cantidad > 0 && item.productoId && !item.esPersonalizado)
        .map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          descripcion: item.descripcion
        }));

      if (itemsParaRevalidar.length === 0) return;

      // Intentar reservar nuevamente
      const response = await api.post('/ventas/stock/reservar', {
        items: itemsParaRevalidar,
        sesionId: sesionId
      });

      if (response.data.success) {
        toast.success('Conexión restaurada - Stock reservado', {
          duration: 3000
        });
      }

    } catch (error) {
      console.error('❌ Error en re-validación:', error);

      if (error.response?.status === 409 && error.response?.data?.errors) {
        // Stock no disponible - mostrar opciones
        toast.warning('Algunos productos ya no están disponibles', {
          duration: 5000
        });

        // Opcional: Mostrar burbuja de conflictos
        const conflictos = Array.isArray(error.response.data.errors)
          ? error.response.data.errors
          : Object.values(error.response.data.errors || {});
        mostrarBurbujaConflictos(conflictos);
      } else {
        toast.error('Error al reconectar - Verifica tu venta', {
          duration: 4000
        });
      }
    }
  };


  // 💓 HEARTBEAT PARA MANTENER RESERVAS VIVAS (USUARIO ACTIVO)
  useEffect(() => {
    if (!isOpen || !socket || activeTab === 'cliente' || activeTab === 'items') return;

    // Solo enviar heartbeat en pestañas PAGOS y FINALIZAR
    const heartbeatInterval = setInterval(() => {
      // Verificar que el usuario sigue activo (mouse/teclado)
      const ultimaActividad = Date.now() - (window.lastActivity || Date.now());

      if (ultimaActividad < 3 * 60 * 1000) { // Activo en últimos 3 minutos
        // Llamar endpoint para renovar reservas
        api.post('/ventas/stock/heartbeat', {
          sesionId: sesionId
        }).catch(() => {
          // Silenciar errores de heartbeat
        });
      }
    }, 2 * 60 * 1000); // Cada 2 minutos

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isOpen, activeTab, sesionId, socket]);

  // 🎯 DETECTAR ACTIVIDAD DEL USUARIO
  useEffect(() => {
    if (!isOpen) return;

    const updateActivity = () => {
      window.lastActivity = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [isOpen, socket]);


  // 🔄 VALIDACIONES AUTOMÁTICAS CON DEPENDENCIAS OPTIMIZADAS
  useEffect(() => {
    const tieneCliente = !!ventaData.cliente;
    const tieneItems = ventaData.items.length > 0;
    const tieneItemsConCantidad = ventaData.items.some(item => item.cantidad > 0);
    const pagosCompletos = pagosValidos;

    const nuevasValidaciones = {
      cliente: {
        valido: tieneCliente,
        errores: !tieneCliente ? 1 : 0,
        accesible: true // Siempre accesible
      },
      items: {
        valido: tieneItemsConCantidad, // 🆕 VALIDAR QUE TENGA ITEMS CON CANTIDAD > 0
        errores: !tieneItemsConCantidad ? 1 : 0,
        accesible: tieneCliente // Solo accesible si hay cliente
      },
      pagos: {
        valido: pagosCompletos,
        errores: pagosCompletos ? 0 : 1,
        accesible: !!tieneCliente && tieneItemsConCantidad // 🆕 REQUIERE ITEMS CON CANTIDAD
      },
      finalizar: {
        valido: Object.values(opcionesProcesamiento).some(Boolean),
        errores: !Object.values(opcionesProcesamiento).some(Boolean) ? 1 : 0,
        accesible: !!tieneCliente && tieneItemsConCantidad && pagosCompletos // 🆕 REQUIERE ITEMS CON CANTIDAD
      }
    };

    setValidaciones(nuevasValidaciones);
  }, [
    ventaData.cliente?.id, // Solo ID para evitar renders innecesarios
    ventaData.items.length, // Solo longitud
    ventaData.items.map(i => `${i.id || i.codigo}-${i.cantidad}`).join(','), // Cambios en items
    opcionesProcesamiento.generarFactura,
    opcionesProcesamiento.imprimirRecibo,
    opcionesProcesamiento.enviarWhatsApp,
    opcionesProcesamiento.enviarEmail,
    descuento,
    activeTab,
    pagosValidos
  ]);

  // 🧮 FUNCIONES DE CÁLCULO
  const calcularSubtotal = () => {
    return ventaData.items.reduce((total, item) => {
      return total + (item.cantidad * item.precio_unitario);
    }, 0);
  };

  // 🎯 MANEJADORES DE NAVEGACIÓN
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleNavigateTab = async (direction) => {
    const currentIndex = TABS.findIndex(tab => tab.id === activeTab);

    if (direction === 'next' && activeTab === 'items') {
      // 🔒 RESERVAR STOCK al ir de ITEMS → PAGOS
      await reservarTodoElStockAlSiguiente();
    } else if (direction === 'prev' && activeTab === 'pagos') {
      // 🔓 LIBERAR STOCK al ir de PAGOS → ITEMS  
      await liberarTodoElStockAlAtras();
    } else if (direction === 'next' && activeTab === 'pagos') {
      // ✅ VALIDAR EXCEDENTE ANTES DE AVANZAR DESDE PAGOS (PASO 3)
      if (excesoPendiente > 100) {
        // Mostrar modal personalizado de excedente
        setShowExcedenteModal(true);
        return; // No avanzar hasta que el usuario confirme
      }

      // Continuar con la navegación normal
      if (currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1].id);
      }
    } else {
      // Navegación normal sin cambios de reserva
      if (direction === 'next' && currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1].id);
      } else if (direction === 'prev' && currentIndex > 0) {
        setActiveTab(TABS[currentIndex - 1].id);
      }
    }
  };

  // 🔧 MANEJADORES DE DATOS (modificado para reservas)
  const handleClienteSeleccionado = (cliente) => {
    setVentaData(prev => ({ ...prev, cliente }));
    setHasUnsavedChanges(true);
  };

  const handleItemsChange = async (items) => {
    // 🔒 GESTIONAR RESERVAS DE STOCK CON API
    const itemsAnteriores = ventaData.items;

    try {

      // 🧮 CALCULAR NUEVO TOTAL ANTES DE PROCESAR
      const nuevoSubtotal = items.reduce((total, item) => {
        return total + ((item.cantidad || 0) * (item.precio_unitario || 0));
      }, 0);
      const nuevoTotal = nuevoSubtotal * tasaCambio;

      // 🔍 DETECTAR CAMBIOS SIGNIFICATIVOS
      const totalCambio = Math.abs(nuevoTotal - totalAnterior);
      const hubocambioSignificativo = totalCambio > 0.01; // Más de 1 centavo de diferencia

      // 🧹 AUTO-LIMPIAR PAGOS SI HAY CAMBIOS Y PAGOS CONFIGURADOS
      if (hubocambioSignificativo && hayPagosConfigurados) {
        // Limpiar pagos y vueltos
        const pagosLimpios = [{
          id: 1,
          metodo: 'efectivo_bs',
          monto: '',
          banco: '',
          referencia: ''
        }];

        toast.success('Pagos limpiados - Total de venta cambió', {
          duration: 4000
        });

        // Actualizar estados
        setHayPagosConfigurados(false);
        setPagosValidos(false);
      }

      // Liberar stock de items eliminados - USANDO API
      for (const itemAnterior of itemsAnteriores) {
        const itemActual = items.find(item => item.codigo === itemAnterior.codigo);

        if (!itemActual) {
          // Item eliminado - liberar todo el stock
          try {
            await liberarStockAPI(itemAnterior.id || itemAnterior.codigo, sesionId);
            toast(`Stock liberado: ${itemAnterior.descripcion}`, {
              duration: 3000
            });
          } catch (error) {
            console.error('Error liberando stock:', error);
          }
        }
      }

      // 🆕 VALIDACIÓN INTELIGENTE PARA PRODUCTOS Y SERVICIOS - CON API
      const itemsValidados = await Promise.all(items.map(async (item) => {
        // Buscar información del producto en inventario
        const { inventario } = useInventarioStore.getState();
        const productoEnInventario = inventario.find(p =>
          p.codigo_barras === item.codigo ||
          p.codigo_interno === item.codigo
        );

        // 🔧 VALIDAR SEGÚN TIPO DE PRODUCTO
        if (productoEnInventario) {
          const tipoProducto = productoEnInventario.tipo;

          // Los servicios NO tienen restricción de stock
          if (tipoProducto === 'SERVICIO') {
            // ✅ Servicios: cantidad puede ser 0 inicialmente
            const cantidadFinal = Math.min(Math.max(item.cantidad, 0), 999);
            return {
              ...item,
              cantidad: cantidadFinal,
              subtotal: cantidadFinal * item.precio_unitario,
              productoId: productoEnInventario.id
            };
          }
          // Productos físicos SÍ tienen restricción de stock
          else if (tipoProducto === 'PRODUCTO' || tipoProducto === 'ELECTROBAR') {
            // ⚠️ Productos físicos: consultar stock real desde API
            try {
              const stockInfo = await obtenerStockDisponibleAPI(productoEnInventario.id);
              const stockDisponible = stockInfo?.stock?.stockDisponible || 0;

              if (item.cantidad > stockDisponible) {
                toast.warning(`Stock ajustado: ${item.descripcion}\nDisponible: ${stockDisponible} unidades`, {
                  duration: 4000
                });

                // Auto-ajustar a stock disponible
                return {
                  ...item,
                  cantidad: Math.max(stockDisponible, 0),
                  subtotal: Math.max(stockDisponible, 0) * item.precio_unitario,
                  productoId: productoEnInventario.id
                };
              }

              return {
                ...item,
                cantidad: Math.max(item.cantidad, 0),
                subtotal: Math.max(item.cantidad, 0) * item.precio_unitario,
                productoId: productoEnInventario.id
              };
            } catch (error) {
              console.error('❌ Error consultando stock:', error);
              // En caso de error, rechazar cambio
              toast.error(`Error consultando stock de ${item.descripcion}`);
              return {
                ...item,
                cantidad: Math.max(item.cantidad, 0),
                subtotal: Math.max(item.cantidad, 0) * item.precio_unitario,
                productoId: productoEnInventario.id
              };
            }
          }
        }

        // Si no hay restricciones, devolver item original (permitir 0)
        return {
          ...item,
          cantidad: Math.max(item.cantidad, 0),
          subtotal: Math.max(item.cantidad, 0) * item.precio_unitario
        };
      }));


      // 🆕 ELIMINAMOS RESERVAS AUTOMÁTICAS - SOLO VALIDACIÓN VISUAL

      // Calcular totales
      const subtotal = itemsValidados.reduce((total, item) => {
        return total + (item.cantidad * item.precio_unitario);
      }, 0);

      // 🧹 APLICAR LIMPIEZA DE PAGOS SI ES NECESARIO
      const ventaActualizada = {
        ...ventaData,
        items: itemsValidados,
        subtotal,
        totalUsd: subtotal,
        totalBs: Math.round(subtotal * tasaCambio * 100) / 100
      };

      // Si hay cambios significativos y pagos configurados, limpiar pagos
      if (hubocambioSignificativo && hayPagosConfigurados) {
        ventaActualizada.pagos = [{
          id: 1,
          metodo: 'efectivo_bs',
          monto: '',
          banco: '',
          referencia: ''
        }];
        ventaActualizada.vueltos = [];
      }

      setVentaData(ventaActualizada);

      // 📊 ACTUALIZAR TOTAL ANTERIOR PARA PRÓXIMA COMPARACIÓN
      setTotalAnterior(subtotal * tasaCambio);

      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('❌ Error gestionando items:', error);
      toast.error(`Error actualizando productos: ${error.message}`);
      // En caso de error, mantener items anteriores
      setVentaData(prev => ({
        ...prev,
        items: itemsAnteriores
      }));
    }
  };

  const handlePagosChange = (pagos, vueltos = []) => {
    setVentaData(prev => ({ ...prev, pagos, vueltos }));
    setHasUnsavedChanges(true);

    // 🔍 Detectar si hay pagos configurados
    const tieneMontosPagos = pagos.some(pago => pago.monto && parseFloat(pago.monto) > 0);
    const tieneMontosVueltos = vueltos.some(vuelto => vuelto.monto && parseFloat(vuelto.monto) > 0);
    setHayPagosConfigurados(tieneMontosPagos || tieneMontosVueltos);
  };

  const handleOpcionesChange = (opciones) => {
    setOpcionesProcesamiento(prev => ({ ...prev, ...opciones }));
    setHasUnsavedChanges(true);
  };

  // 💾 MANEJADORES DE ACCIONES
  const handleGuardarEnEspera = async () => {
    try {
      setLoading(true);

      // 💾 GUARDAR VENTA EN ESPERA CON API BACKEND
      const ventaEsperaData = {
        numeroVenta: codigoVenta,
        clienteId: ventaData.cliente?.id || null,
        clienteNombre: ventaData.cliente?.nombre || null,
        items: ventaData.items.map(item => ({
          productoId: item.productoId || null,
          descripcion: item.descripcion,
          codigoBarras: item.codigo,
          cantidad: item.cantidad,
          precioUnitario: item.precio_unitario,
          descuento: item.descuento || 0,
          subtotal: item.cantidad * item.precio_unitario
        })),
        subtotal: ventaData.totalUsd || 0,
        descuento: descuento || 0,
        total: ventaData.totalBs || 0,
        tasaCambio: tasaCambio,
        tipoEspera: 'INTENCIONAL',
        tiempoLimiteMin: 120,
        observaciones: ventaData.observaciones || null,
        sesionId: sesionId
      };

      const response = await api.post('/ventas/guardar-espera', ventaEsperaData);

      if (response.data.success) {
        toast.success('Venta guardada en espera exitosamente', {
          duration: 4000
        });
        setHasUnsavedChanges(false);

        // Opcional: cerrar modal después de guardar
        limpiarYCerrar();
      } else {
        throw new Error(response.data.message || 'Error guardando venta en espera');
      }
    } catch (error) {
      console.error('❌ Error guardando venta en espera:', error);
      toast.error(`Error al guardar en espera: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };


  // 🧹 Función para limpiar estado de venta
  const limpiarEstadoVenta = () => {
    setVentaData({
      cliente: null,
      items: [],
      pagos: [{
        id: 1,
        metodo: 'efectivo_bs',
        monto: '',
        banco: '',
        referencia: ''
      }],
      vueltos: [],
      descuentoAutorizado: 0,
      motivoDescuento: '',
      observaciones: '',
      subtotal: 0,
      totalUsd: 0,
      totalBs: 0
    });

    // Resetear estados
    setActiveTab('cliente');
    setDescuento(0);
    setHasUnsavedChanges(false);
    setTotalAnterior(0);
    setHayPagosConfigurados(false);
    setPagosValidos(false);
    setItemsDisponibles(false);
    setExcesoPendiente(0);

    // Limpiar opciones de procesamiento
    setOpcionesProcesamiento({
      imprimirRecibo: false,
      enviarWhatsApp: false,
      enviarEmail: false,
      generarFactura: true
    });
  };

  // 🔄 Función para procesar la venta (se ejecuta al confirmar en el modal)
  const procesarVentaConfirmada = async () => {
    // Cerrar modal de confirmación
    setShowConfirmacionModal(false);

    // ✅ CAPTURAR OPCIONES ANTES DE ABRIR EL MODAL
    const opcionesProcesamientoCapturadas = { ...opcionesProcesamiento };

    // ✅ ABRIR VENTANA DE IMPRESIÓN INMEDIATAMENTE (si se necesita) - ANTES DE CUALQUIER AWAIT
    // Esto evita que el navegador bloquee la ventana emergente
    let ventanaImpresion = null;
    if (opcionesProcesamientoCapturadas.generarFactura) {
      try {
        ventanaImpresion = window.open('', '_blank', 'width=302,height=800,scrollbars=yes');
        if (!ventanaImpresion) {
          console.warn('⚠️ No se pudo abrir la ventana de impresión. El navegador puede estar bloqueando ventanas emergentes.');
        }
      } catch (error) {
        console.warn('⚠️ Error al abrir ventana de impresión:', error);
      }
    }

    // ✅ ABRIR MODAL SIN flushSync (más seguro)
    setShowProcesandoModal(true);
    setOpcionesProcesamientoParaModal(opcionesProcesamientoCapturadas);

    // ✅ ESPERAR A QUE EL REF ESTÉ DISPONIBLE USANDO HELPER
    try {
      await waitForRef(procesandoModalRef, PROCESSING_CONFIG.MAX_REF_RETRIES);
    } catch (error) {
      setShowProcesandoModal(false);
      handleError(error, 'Modal Initialization', {
        customMessage: ERROR_MESSAGES.MODAL_INIT_FAILED
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    // ✅ CAPTURAR USUARIO ACTUAL AL MOMENTO DEL PROCESAMIENTO
    const ventaDataConUsuario = {
      ...ventaData,
      usuario: usuario
    };

    try {
      // ✅ CALCULAR TOTALES ANTES DE ENVIAR
      const { totales } = validarYCalcularTotales(ventaData, descuento, tasaCambio);

      if (!totales) {
        setShowProcesandoModal(false);
        handleError(new Error('Totales inválidos'), 'Sale Validation', {
          customMessage: ERROR_MESSAGES.VALIDATION_FAILED
        });
        setLoading(false);
        return;
      }

      // Avanzar paso de validación con delay usando constante
      await delay(PROCESSING_CONFIG.STEP_DELAYS.VALIDATION);
      if (procesandoModalRef.current) {
        procesandoModalRef.current.avanzarPaso(PROCESSING_STEPS.VALIDATING);
      }

      // 🚀 PROCESAR VENTA CON API BACKEND - USANDO HELPER PARA PREPARAR PAYLOAD
      const ventaParaEnviar = prepareSalePayload(
        ventaData,
        totales,
        descuento,
        tasaCambio,
        codigoVenta,
        sesionId,
        opcionesProcesamientoCapturadas,
        METODOS_PAGO
      );

      // ✅ MARCAR FLAG ANTES DE ENVIAR LA PETICIÓN (PROTECCIÓN TEMPRANA)
      // Esto previene que el modal se reabra incluso si el componente se re-monta durante el procesamiento
      marcarVentaProcesada();
      console.log('🔵 [INGRESO MODAL] Flag marcado ANTES de enviar petición (protección temprana)');

      // Llamar API de procesamiento de venta
      const response = await api.post('/ventas/procesar', ventaParaEnviar);

      let ventaProcesada = null;

      if (response.data.success) {
        // ✅ VALIDAR RESPUESTA DEL BACKEND
        ventaProcesada = validateBackendResponse(response.data.data, ['codigoVenta']);

        // ✅ CONFIRMAR FLAG (ya está marcado arriba, pero confirmamos aquí también)
        marcarVentaProcesada();
        console.log('🔵 [INGRESO MODAL] Venta procesada exitosamente - Flag confirmado');

        // Avanzar paso de procesamiento con delay usando constante
        await delay(PROCESSING_CONFIG.STEP_DELAYS.PROCESSING);

        if (procesandoModalRef.current) {
          procesandoModalRef.current.avanzarPaso(PROCESSING_STEPS.PROCESSING);
        }
      } else {
        throw new Error(response.data.message || ERROR_MESSAGES.BACKEND_ERROR);
      }

      // EJECUTAR OPCIONES SELECCIONADAS DESPUÉS DEL PROCESAMIENTO
      const opcionesEjecutadas = [];
      let erroresOpciones = [];

      // GENERAR PDF (si está seleccionado) - USANDO HELPER
      if (opcionesProcesamientoCapturadas.imprimirRecibo) {
        const resultado = await executePostSaleOption({
          optionName: 'PDF Generation',
          stepId: PROCESSING_STEPS.PDF,
          execute: () => descargarPDF(ventaDataConUsuario, ventaProcesada?.codigoVenta || codigoVenta, tasaCambio, descuento),
          modalRef: procesandoModalRef,
          isMountedRef: isMountedRef
        });

        if (resultado.success) {
          opcionesEjecutadas.push('PDF descargado');
        } else {
          erroresOpciones.push('PDF fallo');
        }
      }

      // IMPRIMIR FACTURA TÉRMICA (si está seleccionado) - USANDO HELPER
      if (opcionesProcesamientoCapturadas.generarFactura) {
        // Avanzar paso de factura primero
        await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION - 500);
        if (procesandoModalRef.current) {
          procesandoModalRef.current.avanzarPaso(PROCESSING_STEPS.FACTURA);
        }

        // Esperar antes de ejecutar la impresión
        await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);

        const resultado = await executePostSaleOption({
          optionName: 'Print Thermal',
          stepId: PROCESSING_STEPS.IMPRIMIR,
          execute: () => imprimirFacturaTermica(
            ventaDataConUsuario,
            ventaProcesada?.codigoVenta || codigoVenta,
            tasaCambio,
            descuento,
            ventanaImpresion // ✅ Pasar la ventana pre-abierta
          ),
          modalRef: procesandoModalRef,
          isMountedRef: isMountedRef
        });

        if (resultado.success) {
          opcionesEjecutadas.push('Enviado a impresora termica');
        } else {
          erroresOpciones.push('Impresion fallo');
        }

        // Esperar un poco más después de la impresión para que el usuario vea el progreso
        await delay(1000);
      }

      // ENVIAR WHATSAPP (si está seleccionado) - USANDO HELPER
      if (opcionesProcesamientoCapturadas.enviarWhatsApp && ventaData.cliente?.telefono) {
        const resultado = await executePostSaleOption({
          optionName: 'WhatsApp Send',
          stepId: PROCESSING_STEPS.WHATSAPP,
          execute: async () => {
            const imagenBase64 = await generarImagenWhatsApp(ventaDataConUsuario, ventaProcesada?.codigoVenta || codigoVenta, tasaCambio, descuento);
            const whatsappResponse = await api.post('/whatsapp/enviar-factura', {
              numero: ventaData.cliente.telefono,
              clienteNombre: ventaData.cliente.nombre,
              codigoVenta: ventaProcesada?.codigoVenta || codigoVenta,
              imagen: imagenBase64,
              mensaje: `Hola ${ventaData.cliente.nombre || 'Cliente'}, aqui tienes tu comprobante de compra #${ventaProcesada?.codigoVenta || codigoVenta}. Gracias por tu compra.`
            });

            if (!whatsappResponse.data.success) {
              throw new Error(whatsappResponse.data.message || 'Error enviando WhatsApp');
            }

            if (whatsappResponse.data.data?.tipo_fallback === 'simple_sin_imagen') {
              opcionesEjecutadas.push('WhatsApp enviado (sin imagen)');
            } else if (whatsappResponse.data.data?.fallback) {
              opcionesEjecutadas.push('WhatsApp enviado (texto)');
            } else {
              opcionesEjecutadas.push('WhatsApp con imagen enviado');
            }
          },
          modalRef: procesandoModalRef,
          isMountedRef: isMountedRef
        });

        if (!resultado.success) {
          erroresOpciones.push('WhatsApp fallo');
        }
      }

      // ENVIAR EMAIL (si está seleccionado) - USANDO HELPER
      if (opcionesProcesamientoCapturadas.enviarEmail && ventaData.cliente?.email) {
        const resultado = await executePostSaleOption({
          optionName: 'Email Send',
          stepId: PROCESSING_STEPS.EMAIL,
          execute: async () => {
            const pdfBlob = await generarPDFFactura(ventaDataConUsuario, ventaProcesada?.codigoVenta || codigoVenta, tasaCambio, descuento);

            // Convertir blob a base64
            const reader = new FileReader();
            const pdfBase64 = await new Promise((resolve) => {
              reader.onload = () => resolve(reader.result.split(',')[1]);
              reader.readAsDataURL(pdfBlob);
            });

            const emailResponse = await api.post('/email/enviar-factura', {
              destinatario: ventaData.cliente.email,
              clienteNombre: ventaData.cliente.nombre,
              codigoVenta: ventaProcesada?.codigoVenta || codigoVenta,
              pdfBase64: pdfBase64,
              asunto: `Comprobante #${ventaProcesada?.codigoVenta || codigoVenta} - Electro Shop Morandin`,
              mensaje: `Estimado(a) ${ventaData.cliente.nombre || 'Cliente'},\n\nAdjunto encontrara su comprobante de compra #${ventaProcesada?.codigoVenta || codigoVenta}.\n\nGracias por su compra.\n\nSaludos cordiales,\nElectro Shop Morandin C.A.`
            });

            if (!emailResponse.data.success) {
              throw new Error('Error enviando email');
            }

            opcionesEjecutadas.push('Email enviado');
          },
          modalRef: procesandoModalRef,
          isMountedRef: isMountedRef
        });

        if (!resultado.success) {
          erroresOpciones.push('Email fallo');
        }
      }

      // VENTA PROCESADA - Completar el proceso usando constantes
      if (!procesandoModalRef.current) {
        // Si el modal ya no está disponible, esperar un momento antes de cerrar
        await delay(PROCESSING_CONFIG.CLEANUP_DELAY);
        if (!isMountedRef.current) return;

        // ✅ MARCAR VENTA COMO PROCESADA ANTES DE CERRAR (CRÍTICO) - PERSISTENTE
        marcarVentaProcesada();

        setShowProcesandoModal(false);
        limpiarEstadoVenta();

        // ✅ CERRAR MODAL Y PREVENIR REAPERTURA
        console.log('🔴 [INGRESO MODAL] Cerrando modal después de procesar venta (fallback)');
        console.log('🔴 ventaProcesadaRef.current:', ventaProcesadaRef.current);

        // Cerrar modal inmediatamente
        onClose();

        // ✅ REDIRIGIR INMEDIATAMENTE PARA EVITAR REAPERTURA (reducir delay)
        const timeoutId = setTimeout(() => {
          if (!isMountedRef.current) return;
          console.log('🔴 [INGRESO MODAL] Redirigiendo al dashboard... (fallback)');
          // ✅ LIMPIAR FLAG DESPUÉS DE REDIRIGIR (no antes, para evitar reapertura)
          // El flag se limpiará automáticamente cuando el usuario intente abrir una nueva venta
          window.location.replace('/');
        }, 200); // Reducido de 1000ms a 200ms para evitar reapertura

        timeoutsRef.current.push(timeoutId);
        return;
      }

      // Avanzar paso final y completar usando constantes
      await delay(PROCESSING_CONFIG.STEP_DELAYS.FINALIZATION);

      if (procesandoModalRef.current && isMountedRef.current) {
        procesandoModalRef.current.avanzarPaso(PROCESSING_STEPS.FINALIZING);

        // Esperar antes de completar para que el usuario vea el paso "Finalizando"
        await delay(PROCESSING_CONFIG.STEP_DELAYS.OPTION_EXECUTION);

        const timeoutId1 = setTimeout(() => {
          if (!isMountedRef.current) return;

          if (procesandoModalRef.current) {
            procesandoModalRef.current.completar();
          }

          // Esperar para mostrar mensaje de éxito usando constante (aumentado)
          const timeoutId2 = setTimeout(() => {
            if (!isMountedRef.current) return;

            // ✅ MARCAR VENTA COMO PROCESADA ANTES DE CERRAR (CRÍTICO) - PERSISTENTE
            marcarVentaProcesada();

            setShowProcesandoModal(false);
            limpiarEstadoVenta();

            // ✅ CERRAR MODAL Y PREVENIR REAPERTURA
            console.log('🔴 [INGRESO MODAL] Cerrando modal después de procesar venta');
            console.log('🔴 ventaProcesadaRef.current:', ventaProcesadaRef.current);

            // Cerrar modal inmediatamente
            onClose();

            // ✅ REDIRIGIR INMEDIATAMENTE PARA EVITAR REAPERTURA (reducir delay)
            const timeoutId3 = setTimeout(() => {
              if (!isMountedRef.current) return;
              console.log('🔴 [INGRESO MODAL] Redirigiendo al dashboard...');
              // ✅ LIMPIAR FLAG DESPUÉS DE REDIRIGIR (no antes, para evitar reapertura)
              // El flag se limpiará automáticamente cuando el usuario intente abrir una nueva venta
              window.location.replace('/');
            }, 200); // Reducido de 1000ms a 200ms para evitar reapertura

            timeoutsRef.current.push(timeoutId3);
          }, PROCESSING_CONFIG.STEP_DELAYS.SUCCESS_MESSAGE);

          timeoutsRef.current.push(timeoutId2);
        }, PROCESSING_CONFIG.MIN_SUCCESS_DISPLAY_TIME);

        timeoutsRef.current.push(timeoutId1);
      }

      setLoading(false);


    } catch (error) {
      setShowProcesandoModal(false);
      handleError(error, 'Backend Processing', {
        customMessage: error.response?.data?.message || ERROR_MESSAGES.BACKEND_ERROR
      });
      setLoading(false);
    }
  };

  // 🚪 MANEJADORES DE SALIDA
  const handleCancelar = async () => {
    // ✅ NO PERMITIR CANCELAR SI EL MODAL DE PROCESAMIENTO ESTÁ ABIERTO
    if (showProcesandoModal) {
      toast.warning('No se puede cancelar mientras se procesa la venta');
      return;
    }

    // SIEMPRE liberar reservas, independiente de hasUnsavedChanges
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      await limpiarYCerrar();
    }
  };

  const handleConfirmExit = async () => {
    setShowExitModal(false);
    await limpiarYCerrar();
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const limpiarYCerrar = async () => {
    // ✅ NO CERRAR SI EL MODAL DE PROCESAMIENTO ESTÁ ABIERTO
    if (showProcesandoModal) {
      return;
    }

    // ✅ PROTECCIÓN ADICIONAL: NO CERRAR SI LA VENTA FUE PROCESADA
    if (ventaProcesadaRef.current) {
      console.log('🔵 [LIMPIAR] Intento de limpiar modal después de procesar venta - bloqueado (normal)');
      console.log('🔵 [LIMPIAR] ventaProcesadaRef.current:', ventaProcesadaRef.current);
      // Cerrar modal sin limpiar estados (solo cerrar)
      onClose();
      return;
    }

    // 🆕 CANCELAR SOLICITUD DE DESCUENTO PENDIENTE SI EXISTE
    try {
      await api.delete(`/discount-requests/sesion/${sesionId}`);
    } catch (error) {
      // Silenciar error 404 (normal que no exista)
    }

    // 🆕 LIBERACIÓN MASIVA POR SESIÓN (MÁS EFICIENTE)
    try {
      await liberarStockAPI(null, sesionId);

      const esLimpiezaManual = !document.querySelector('[data-afk-cleanup]');
      if (esLimpiezaManual) {
        toast.success('Reservas liberadas para sesión');
      }
    } catch (error) {
      console.error('Error en liberación masiva:', error);

      // 🔄 FALLBACK: Liberación individual
      const itemsConReserva = ventaData.items.filter(item =>
        item.productoId && !item.esPersonalizado && item.cantidad > 0
      );

      for (const item of itemsConReserva) {
        try {
          await liberarStockAPI(item.productoId, sesionId);
        } catch (error) {
          // Silenciar errores individuales
        }
      }
    }
    // Limpiar todo el estado de la venta
    setVentaData({
      cliente: null, // Se limpia pero será obligatorio seleccionar uno nuevo
      items: [],
      pagos: [{
        id: 1,
        metodo: 'efectivo_bs',
        monto: '',
        banco: '',
        referencia: ''
      }],
      vueltos: [],
      descuentoAutorizado: 0,
      motivoDescuento: '',
      observaciones: '',
      subtotal: 0,
      totalUsd: 0,
      totalBs: 0
    });

    // 💰 Limpiar descuento
    setDescuento(0);

    // Resetear tab activo
    setActiveTab('cliente');

    // Limpiar cambios sin guardar
    setHasUnsavedChanges(false);

    // 🧹 Resetear estados de auto-limpieza
    setTotalAnterior(0);
    setHayPagosConfigurados(false);
    setPagosValidos(false);

    // 🆕 MARCAR COMO LIMPIEZA COMPLETADA (para casos AFK)
    const esLimpiezaManual = !document.body.hasAttribute('data-afk-cleanup');
    if (esLimpiezaManual) {
      toast.success('Venta cancelada y limpiada');
    }

    document.body.setAttribute('data-afk-cleanup', 'true');
    setTimeout(() => {
      document.body.removeAttribute('data-afk-cleanup');
    }, 1000);

    onClose();
  };

  // 📐 FUNCIÓN DE ALTURA DINÁMICA (copiada de PresupuestoModal)
  const getContentHeight = () => {
    switch (activeTab) {
      case 'items':
        return 'h-[600px]'; // Más altura para tabla de productos
      case 'pagos':
        return 'h-[500px]'; // Altura media para pagos
      case 'finalizar':
        return 'h-[400px]'; // Menos altura para resumen
      default:
        return 'h-[450px]';
    }
  };


  // ✅ CONFIAR EN VALIDACIÓN DE PAGOSPANEL - NO DUPLICAR
  const ventaValida = pagosValidos && ventaData.cliente && ventaData.items.length > 0;

  // 🔒 RESERVAR TODO EL STOCK AL HACER "SIGUIENTE"
  const reservarTodoElStockAlSiguiente = async () => {
    setLoading(true);
    try {
      console.log('🔒 Reservando stock completo al hacer "Siguiente"...');

      // Filtrar solo items con cantidad > 0 y que necesiten reserva
      const itemsParaReservar = ventaData.items
        .filter(item => item.cantidad > 0 && item.productoId && !item.esPersonalizado)
        .map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          descripcion: item.descripcion
        }));

      if (itemsParaReservar.length === 0) {
        // No hay items físicos para reservar, continuar normalmente
        setActiveTab('pagos');
        return;
      }

      console.log(`🔒 Intentando reservar ${itemsParaReservar.length} productos:`, itemsParaReservar);

      // Llamar API para reservar múltiples productos
      const response = await api.post('/ventas/stock/reservar', {
        items: itemsParaReservar,
        sesionId: sesionId
      });

      if (response.data.success) {
        console.log('✅ Stock reservado exitosamente, navegando a PAGOS');
        setActiveTab('pagos');
        toast.success(`Stock reservado: ${response.data.data.reservadosExitosamente} productos`);
      }

    } catch (error) {
      console.error('❌ Error reservando stock:', error);
      console.log('🔍 ERROR COMPLETO:', error);
      console.log('🔍 ERROR RESPONSE:', error.response);
      console.log('🔍 ERROR DATA:', error.response?.data);
      console.log('🔍 ERROR TYPE:', error.response?.data?.type);

      if (error.response?.status === 409 && error.response?.data?.errors) {
        // 🎈 MOSTRAR BURBUJA CON CONFLICTOS
        const conflictos = Array.isArray(error.response.data.errors)
          ? error.response.data.errors
          : Object.values(error.response.data.errors || {});
        mostrarBurbujaConflictos(conflictos);
      } else {
        console.log('🔍 NO ES STOCK_RESERVADO, mostrando toast normal');
        toast.error(`Error al reservar stock: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔓 LIBERAR TODO EL STOCK AL HACER "ATRÁS"
  const liberarTodoElStockAlAtras = async () => {
    try {
      console.log('🔓 Liberando stock al regresar a ITEMS...');

      // Filtrar items que tienen stock reservado
      const itemsConReserva = ventaData.items.filter(item =>
        item.productoId && !item.esPersonalizado && item.cantidad > 0
      );

      if (itemsConReserva.length === 0) {
        setActiveTab('items');
        return;
      }

      // Liberar stock de cada producto
      for (const item of itemsConReserva) {
        try {
          await liberarStockAPI(item.productoId, sesionId);
          console.log(`🔓 Stock liberado: ${item.descripcion}`);
        } catch (error) {
          console.error(`❌ Error liberando ${item.descripcion}:`, error);
        }
      }

      setActiveTab('items');
      toast.success(`Stock liberado: ${itemsConReserva.length} productos`);

    } catch (error) {
      console.error('❌ Error liberando stock al retroceder:', error);
      // Aún así permitir navegación
      setActiveTab('items');
      toast.warning('Navegación permitida, pero revisa las reservas');
    }
  };

  // 🎈 MOSTRAR BURBUJA CON CONFLICTOS DE STOCK
  const mostrarBurbujaConflictos = (conflictos) => {
    console.log('🎈 Mostrando conflictos de stock:', conflictos);

    // Asegurar que sea un array
    const conflictosArray = Array.isArray(conflictos)
      ? conflictos
      : Object.values(conflictos || {});

    setStockConflicts(conflictosArray);
    setShowStockConflictsModal(true);
  };

  // 🔧 RESOLVER CONFLICTO: AJUSTAR CANTIDAD
  const resolverAjustarCantidad = (productoId, nuevaCantidad) => {
    const updatedItems = ventaData.items.map(item =>
      item.productoId === productoId
        ? {
          ...item,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * item.precio_unitario
        }
        : item
    );

    setVentaData(prev => ({ ...prev, items: updatedItems }));
    toast.success(`Cantidad ajustada a ${nuevaCantidad} unidades`);
  };

  // 🗑️ RESOLVER CONFLICTO: ELIMINAR PRODUCTO
  const resolverEliminarProducto = (productoId) => {
    const updatedItems = ventaData.items.filter(item => item.productoId !== productoId);
    setVentaData(prev => ({ ...prev, items: updatedItems }));
    toast.success('Producto eliminado del carrito');
  };

  // 🔄 REINTENTAR RESERVA DESPUÉS DE RESOLVER
  const reintentarReservasDespuesResolver = async () => {
    setShowStockConflictsModal(false);
    setStockConflicts([]);

    // Esperar un momento para que se actualice el estado
    setTimeout(async () => {
      await reservarTodoElStockAlSiguiente();
    }, 500);
  };

  if (!isOpen) return null;

  const currentIndex = TABS.findIndex(tab => tab.id === activeTab);
  const canGoNext = currentIndex < TABS.length - 1;
  const canGoPrev = currentIndex > 0;
  const allValid = Object.values(validaciones).every(v => v.valido);

  return (
    <>
      {/* ✅ PREVENIR QUE EL MODAL PRINCIPAL SE CIERRE MIENTRAS SE PROCESA */}
      {/* ✅ OCULTAR MODAL PRINCIPAL CUANDO SE ESTÁ PROCESANDO */}
      {!showProcesandoModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Prevenir cierre al hacer clic fuera si el modal de procesamiento está abierto
            if (showProcesandoModal && e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }}
          onKeyDown={(e) => {
            // Prevenir cierre con ESC si el modal de procesamiento está abierto
            if (showProcesandoModal && e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }}
        >
          {/* 🎯 MODAL CON ALTURA FIJA */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden h-[90vh] flex flex-col">

            {/* 🎨 HEADER ELEGANTE (FIJO) */}
            <div className="relative bg-gradient-to-r from-green-600 via-green-500 to-green-600 overflow-hidden flex-shrink-0 shadow-md">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
              </div>

              <div className="relative px-6 py-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight">Nueva Venta #{codigoVenta}</h1>
                      <p className="text-emerald-100/90 text-xs font-medium">
                        {usuario?.nombre || 'Usuario'}
                        {/* 🐛 DEBUG: Mostrar contador de aperturas en desarrollo */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="ml-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                            Dev: {aperturasRef.current}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Indicador de cambios */}
                    {hasUnsavedChanges && (
                      <div className="flex items-center space-x-2 bg-orange-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm animate-pulse-slow border border-orange-400/50">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">Sin guardar</span>
                      </div>
                    )}

                    {/* Indicador de conexión */}
                    <div className="flex items-center space-x-3 bg-black/20 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                      <ConexionIndicador socket={socket} />
                    </div>

                    {/* Separator */}
                    <div className="h-8 w-px bg-white/20 mx-2"></div>

                    {/* ✅ WINDOW CONTROLS (INLINE & LARGER) */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={onMinimize}
                        className="p-2 bg-white/10 hover:bg-white/30 text-white rounded-lg transition-all backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 border border-white/10"
                        title="Minimizar (Ocultar temporalmente)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelar}
                        className="p-2 bg-red-500/50 hover:bg-red-600 text-white rounded-lg transition-all backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 border border-red-400/50"
                        title="Cerrar Ventana"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* 📋 NAVEGACIÓN DE TABS (FIJA) */}
            <div className="flex-shrink-0">
              <BreadcrumbModerno
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                validaciones={validaciones}
              />
            </div>

            {/* 📄 CONTENIDO DE TABS CON ALTURA DINÁMICA (FLEX) */}
            <div className={`flex-1 overflow-y-auto p-8 ${getContentHeight()}`}>

              {activeTab === 'cliente' && (
                <div className="space-y-6">
                  <div className="max-w-2xl mx-auto">
                    <ClienteSelector
                      clienteSeleccionado={ventaData.cliente}
                      onClienteSeleccionado={handleClienteSeleccionado}
                      isEditable={true}
                      label="Cliente de la Venta"
                      required={true}
                      placeholder="Buscar cliente por cédula, nombre o email..."
                    />

                    {/* Información adicional - Solo mostrar si NO hay cliente */}
                    {!ventaData.cliente && (
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="bg-amber-100 p-2 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-amber-900 mb-1">Cliente Requerido</h4>
                            <div className="space-y-1 mt-1">
                              <p className="text-sm text-amber-700 flex items-center">
                                <AlertCircle className="h-3.5 w-3.5 inline mr-1.5" />
                                Debes seleccionar un cliente para continuar
                              </p>
                              <p className="text-sm text-amber-700 flex items-center">
                                <Lightbulb className="h-3.5 w-3.5 inline mr-1.5" />
                                Busca un cliente existente o crea uno nuevo
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {
                activeTab === 'items' && (
                  <div className="space-y-4">
                    <ItemsTable
                      items={ventaData.items}
                      onItemsChange={handleItemsChange}
                      isEditable={true}
                      tasaCambio={tasaCambio}
                      title="Productos de la Venta"
                      showAddCustom={false} // ✅ Solo productos del inventario para ventas
                      maxVisibleItems={10}
                      // 🆕 Props específicos para ventas - ACTIVAR VALIDACIONES
                      reservarStock={true}
                      mostrarStockDisponible={true}
                      validarStockAntes={true}
                      sesionId={sesionId} // 🆕 PASAR SESIÓN ID
                    />

                  </div>
                )
              }

              {
                activeTab === 'pagos' && (
                  <PagosPanel
                    pagos={ventaData.pagos}
                    vueltos={ventaData.vueltos}
                    onPagosChange={handlePagosChange}
                    totalVenta={ventaData.totalBs}
                    tasaCambio={tasaCambio}
                    title="Métodos de Pago de la Venta"
                    descuento={descuento}
                    onDescuentoChange={() => setShowDescuentoModal(true)}
                    onDescuentoLimpiar={async () => {
                      // 🧹 Cancelar solicitud pendiente en la base de datos si existe
                      try {
                        await api.delete(`/discount-requests/sesion/${sesionId}`);
                      } catch (error) {
                        // Si no existe la solicitud (404) o ya fue procesada, no es crítico - silenciar el error
                      }

                      // 🧹 Limpiar pagos si hay descuento y pagos configurados
                      if (hayPagosConfigurados && descuento > 0) {
                        setVentaData(prev => ({
                          ...prev,
                          descuentoAutorizado: 0,
                          motivoDescuento: '',
                          pagos: [{
                            id: 1,
                            metodo: 'efectivo_bs',
                            monto: '',
                            banco: '',
                            referencia: ''
                          }],
                          vueltos: []
                        }));
                        setHayPagosConfigurados(false);
                        setPagosValidos(false);
                        toast.success('Pagos limpiados - Descuento eliminado');
                      } else {
                        toast.success('Descuento eliminado');
                      }
                      setDescuento(0);
                    }}
                    onValidationChange={handlePagosValidationChange}
                  />
                )
              }

              {
                activeTab === 'finalizar' && (
                  <FinalizarVentaPanel
                    ventaData={ventaData}
                    opcionesProcesamiento={opcionesProcesamiento}
                    onOpcionesChange={handleOpcionesChange}
                    loading={loading}
                    codigoVenta={sesionId.slice(-6)} // Últimos 6 caracteres como código
                    descuento={descuento}
                    tasaCambio={tasaCambio}
                  />
                )
              }

            </div >

            {/* 🎮 BOTONES DE NAVEGACIÓN (PREMIUM & MATCHING HEADER) */}
            < div className="flex-shrink-0 bg-gradient-to-r from-green-600 via-green-500 to-green-600 px-8 py-4 border-t border-green-400 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] z-20" >
              <div className="flex items-center justify-between">

                {/* Botón Anterior (oculto en Cliente) */}
                <div className="w-32"> {/* Spacer para mantener centro */}
                  {activeTab !== 'cliente' && (
                    <button
                      onClick={() => handleNavigateTab('prev')}
                      disabled={!canGoPrev}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-all shadow-lg hover:shadow-xl backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed group w-full justify-center"
                    >
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      <span className="font-medium">Anterior</span>
                    </button>
                  )}
                </div>

                {/* Botones de acción centrales (Cancelar, Guardar) */}
                <div className="flex items-center space-x-4">

                  {/* Cancelar */}
                  <button
                    onClick={handleCancelar}
                    disabled={showProcesandoModal}
                    className={`flex items-center space-x-2 px-5 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 border border-red-400/50 backdrop-blur-sm ${showProcesandoModal ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    title="Cancelar Venta"
                  >
                    <X className="h-4 w-4" />
                    <span className="font-medium">Cancelar</span>
                  </button>

                  {/* Guardar en espera */}
                  <button
                    onClick={handleGuardarEnEspera}
                    disabled={ventaData.items.length === 0}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 backdrop-blur-sm"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Guardar</span>
                  </button>

                </div>

                {/* Botón Siguiente / Procesar */}
                <div className="w-48"> {/* Spacer ancho para botón principal */}
                  {activeTab !== 'finalizar' ? (
                    <button
                      onClick={() => handleNavigateTab('next')}
                      disabled={!canGoNext || !validaciones[activeTab]?.valido}
                      className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all shadow-lg hover:shadow-emerald-900/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none font-bold w-full border border-white/50"
                    >
                      <span>Siguiente</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConfirmacionModal(true)}
                      disabled={loading || !allValid || !ventaValida}
                      className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold w-full border border-white/50 ${ventaValida && allValid && !loading
                        ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300'
                        }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                          <span>Procesando...</span>
                        </>
                      ) : !ventaValida ? (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          <span>Incompleto</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>PROCESAR</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            </div >

          </div >
        </div >
      )}

      {/* ⚠️ MODAL DE ALERT DE EXCEDENTE */}
      {
        showExcedenteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-xl">
                <div className="flex items-center space-x-3 text-white">
                  <AlertTriangle className="h-6 w-6" />
                  <h3 className="text-lg font-bold">Excedente Significativo Detectado</h3>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-amber-100 rounded-full p-4">
                      <DollarSign className="h-8 w-8 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-gray-700 text-center mb-2">
                    El excedente es de{' '}
                    <span className="font-bold text-amber-600 text-lg">
                      {formatearVenezolano(excesoPendiente)} Bs
                    </span>
                  </p>
                  <p className="text-gray-600 text-sm text-center mb-4">
                    (Supera los 100 Bs)
                  </p>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
                    <p className="text-sm text-amber-800">
                      <strong>Nota:</strong> Este excedente deberá ser entregado como vuelto al cliente.
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowExcedenteModal(false);
                      toast.info('Operación cancelada. Revise el excedente antes de continuar.', {
                        duration: 3000
                      });
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowExcedenteModal(false);
                      // Continuar con la navegación normal
                      const currentIndex = TABS.findIndex(tab => tab.id === activeTab);
                      if (currentIndex < TABS.length - 1) {
                        setActiveTab(TABS[currentIndex + 1].id);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* 🚨 MODAL DE CONFIRMACIÓN DE SALIDA */}
      {
        showExitModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">

              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 rounded-t-xl">
                <div className="flex items-center space-x-3 text-white">
                  <AlertCircle className="h-6 w-6" />
                  <h3 className="text-lg font-bold">Cambios sin guardar</h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Tienes cambios sin guardar en la venta. ¿Estás seguro de que quieres salir?
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={handleCancelExit}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Continuar Editando
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Salir Sin Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }




      {/* 💰 MODAL DE DESCUENTO REFACTORIZADO */}
      {
        showDescuentoModal && (
          <DescuentoModal
            isOpen={showDescuentoModal}
            onClose={() => setShowDescuentoModal(false)}
            totalVenta={ventaData.totalBs}
            tasaCambio={tasaCambio}
            ventaData={ventaData}
            items={ventaData.items || []}
            cliente={ventaData.cliente || {}}
            sesionId={sesionId}
            onDescuentoAprobado={(montoDescuento, motivoDescuento = '') => {
              // ✅ SIEMPRE ACTUALIZAR EL DESCUENTO PRIMERO
              setDescuento(montoDescuento);

              // 🧹 Limpiar pagos si hay descuento y pagos configurados
              if (hayPagosConfigurados && montoDescuento > 0) {
                setVentaData(prev => ({
                  ...prev,
                  descuentoAutorizado: montoDescuento,
                  motivoDescuento: motivoDescuento,
                  pagos: [{
                    id: 1,
                    metodo: 'efectivo_bs',
                    monto: '',
                    banco: '',
                    referencia: ''
                  }],
                  vueltos: []
                }));
                setHayPagosConfigurados(false);
                setPagosValidos(false);
                toast.success(`Pagos limpiados - Se aplicó descuento de ${formatearVenezolano(montoDescuento)} Bs`);
              } else {
                setVentaData(prev => ({
                  ...prev,
                  descuentoAutorizado: montoDescuento,
                  motivoDescuento: motivoDescuento
                }));
                toast.success(`Descuento de ${formatearVenezolano(montoDescuento)} Bs aplicado`);
              }
              setShowDescuentoModal(false);
            }}
          />
        )
      }

      {/* 🎈 MODAL DE CONFLICTOS DE STOCK */}
      {
        showStockConflictsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">

              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-6 w-6" />
                    <h3 className="text-lg font-bold">📦 Stock Reservado por Otros Usuarios</h3>
                  </div>
                  <button
                    onClick={() => setShowStockConflictsModal(false)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {Array.isArray(stockConflicts) && stockConflicts.map((conflicto, index) => (
                    <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{conflicto.producto}</h4>
                          <p className="text-sm text-gray-600">Stock total: {conflicto.stockTotal}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                            Solicitado: {conflicto.stockSolicitado}
                          </div>
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            Disponible: {conflicto.stockDisponible}
                          </div>
                        </div>
                      </div>

                      {/* Info de quién tiene reservado */}
                      {conflicto.reservadoPor && conflicto.reservadoPor.length > 0 && (
                        <div className="mb-3 bg-blue-50 p-3 rounded text-sm">
                          <h5 className="font-medium text-blue-900 mb-2">👥 Reservado por:</h5>
                          {conflicto.reservadoPor.map((reserva, idx) => (
                            <div key={idx} className="flex justify-between text-blue-700">
                              <span>{reserva.usuario}</span>
                              <span>{reserva.cantidad} unidades</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Opciones de resolución */}
                      <div className="flex flex-wrap gap-2">
                        {conflicto.stockDisponible > 0 && (
                          <button
                            onClick={() => {
                              resolverAjustarCantidad(conflicto.productoId, conflicto.stockDisponible);
                              reintentarReservasDespuesResolver();
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full transition-colors"
                          >
                            Ajustar a {conflicto.stockDisponible}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            resolverEliminarProducto(conflicto.productoId);
                            reintentarReservasDespuesResolver();
                          }}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full transition-colors"
                        >
                          Eliminar producto
                        </button>
                      </div>

                      {/* Info de coordinación física */}
                      <div className="mt-3 bg-blue-50 p-3 rounded text-xs">
                        <h6 className="font-medium text-blue-900">💬 Coordinación Física:</h6>
                        <p className="text-blue-700 mt-1">
                          Habla con {conflicto.reservadoPor?.[0]?.usuario || 'el usuario'} para coordinar la liberación de stock si es necesario
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Opciones globales */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-3">🤝 Opciones Adicionales:</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setShowStockConflictsModal(false);
                        handleGuardarEnEspera();
                      }}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                    >
                      💾 Guardar mi venta en espera y continuar después
                    </button>
                    <button
                      onClick={() => setShowStockConflictsModal(false)}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                    >
                      ✏️ Modificar cantidades manualmente y reintentar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Confirmación de Venta */}
      <ConfirmacionVentaModal
        isOpen={showConfirmacionModal}
        onConfirm={procesarVentaConfirmada}
        onCancel={() => setShowConfirmacionModal(false)}
        opciones={opcionesProcesamiento}
      />

      {/* Modal de Procesamiento de Venta - SIEMPRE VISIBLE CUANDO SE ESTÁ PROCESANDO */}
      {
        showProcesandoModal && (
          <VentaProcesandoModal
            ref={procesandoModalRef}
            isOpen={showProcesandoModal}
            opcionesProcesamiento={opcionesProcesamientoParaModal || opcionesProcesamiento}
            onCompletado={() => {
              // ✅ NO HACER NADA - La redirección al dashboard se maneja en procesarVentaConfirmada
              // ✅ PROTECCIÓN: No permitir que onCompletado cause efectos secundarios
              if (ventaProcesadaRef.current) {
                console.log('🔵 [INGRESO MODAL] onCompletado llamado pero venta ya procesada - ignorando');
                return;
              }
            }}
            onNuevaVenta={null}
            onIrDashboard={null}
          />
        )
      }
    </>
  );
};

export default IngresoModalV2;

