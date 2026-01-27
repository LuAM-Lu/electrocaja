// components/TransactionTable.jsx (HEADER VERDE CORREGIDO)
import React, { useState, useEffect } from 'react';
import { Eye, Wrench, HandCoins, Trash2, Plus, Search, Filter, Calendar, Clock, TrendingUp, TrendingDown, CreditCard, DollarSign, Smartphone, ArrowUpDown, ChevronLeft, ChevronRight, FileText, Coffee, MonitorSmartphone, Package, User } from 'lucide-react';
import { FaCashRegister, FaLock } from 'react-icons/fa';
import { useTransactionTable } from '../store/cajaStore';
//import TransactionDetailModal from './TransactionDetailModal';
import DeleteTransactionModal from './DeleteTransactionModal';
import toast from '../utils/toast.jsx';
import { api } from '../config/api';
import { useAuthStore } from '../store/authStore'; //  AGREGAR ESTA LÍNEA




const TransactionTable = ({ itemsPerPage: itemsPerPageProp }) => {
  const { cajaActual, transacciones, eliminarTransaccion, cargarCajaActual } = useTransactionTable();
  const { socket, usuario } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todas');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = itemsPerPageProp || 6;

  // Estados para modales
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // ✅ ESCUCHAR EVENTOS DE SOCKET PARA ACTUALIZACIÓN EN TIEMPO REAL
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    // ✅ DEDUPLICACIÓN: Set para evitar procesar la misma transacción múltiples veces
    const transaccionesProcesadas = new Set();
    const timeouts = []; // Array para rastrear timeouts y limpiarlos

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

    // ✅ HANDLER UNIFICADO: Manejar ambos eventos con deduplicación
    const handleNuevaTransaccion = async (data) => {
      const transactionId = data.transaccion?.id || data.id;

      // ✅ DEDUPLICACIÓN: Evitar procesar la misma transacción dos veces
      if (transactionId && transaccionesProcesadas.has(transactionId)) {
        console.log(`⏭️ TransactionTable: Transacción ${transactionId} ya procesada, omitiendo`);
        return;
      }

      if (transactionId) {
        transaccionesProcesadas.add(transactionId);

        // Limpiar después de 5 minutos para evitar memory leak
        setTimeout(() => {
          transaccionesProcesadas.delete(transactionId);
        }, 5 * 60 * 1000);
      }

      // ✅ PREVENIR QUE SE EJECUTE SI HAY UN MODAL DE PROCESAMIENTO ABIERTO
      if (!hayModalProcesando()) {
        // ✅ SIEMPRE recargar caja para actualizar la lista en tiempo real
        const timeoutId = setTimeout(() => {
          cargarCajaActual(true); // forceRefresh = true para evitar cache
        }, 300);
        timeouts.push(timeoutId); // Registrar timeout para cleanup
      } else {
        console.log('⏸️ TransactionTable: cargarCajaActual omitido - Modal de procesamiento activo');
      }
    };

    // ✅ MANEJAR TRANSACCIONES ELIMINADAS
    const handleTransactionDeleted = async (data) => {
      // ✅ PREVENIR QUE SE EJECUTE SI HAY UN MODAL DE PROCESAMIENTO ABIERTO
      if (!hayModalProcesando()) {
        const timeoutId = setTimeout(() => {
          cargarCajaActual(true);
        }, 300);
        timeouts.push(timeoutId); // Registrar timeout para cleanup
      } else {
        console.log('⏸️ TransactionTable: cargarCajaActual omitido - Modal de procesamiento activo');
      }
    };

    // ✅ REGISTRAR LISTENERS PARA TODOS LOS EVENTOS DE TRANSACCIONES
    // Usar el mismo handler para ambos eventos duplicados
    socket.on('nueva_transaccion', handleNuevaTransaccion);
    socket.on('transaction-added', handleNuevaTransaccion); // ✅ Mismo handler para evitar duplicación
    socket.on('transaction-deleted', handleTransactionDeleted);

    // ✅ CLEANUP: Limpiar listeners y timeouts al desmontar
    return () => {
      socket.off('nueva_transaccion', handleNuevaTransaccion);
      socket.off('transaction-added', handleNuevaTransaccion);
      socket.off('transaction-deleted', handleTransactionDeleted);

      // ✅ LIMPIAR TODOS LOS TIMEOUTS PENDIENTES
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
      timeouts.length = 0; // Limpiar array
    };
  }, [socket, cargarCajaActual]);

  const filteredTransactions = transacciones.filter(t => {
    const matchesSearch = t.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.pagos?.some(pago => pago.metodo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'todas' || t.tipo === filterType;
    return matchesSearch && matchesFilter;
  });

  const sortedTransactions = React.useMemo(() => {
    if (!sortConfig.key) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredTransactions, sortConfig]);

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = sortedTransactions.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleViewDetails = async (transaccion) => {
    try {
      // Emitir evento al Dashboard para que maneje el modal
      if (window.showTransactionDetail) {
        window.showTransactionDetail(transaccion);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteClick = (transaccion) => {
    setSelectedTransaction(transaccion);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (transactionId) => {
    // El modal ya hizo la eliminación y recargó la caja
    // Este callback es solo para compatibilidad, no necesita hacer nada adicional
  };

  const formatCodigoVenta = (codigoVenta) => {
    if (!codigoVenta) return 'Sin código';

    // Si es un código de servicio técnico con formato largo (ej: S20251109002-F-1762665708704)
    // Mostrar solo la parte relevante (S20251109002-F o S20251109002-A)
    if (codigoVenta.includes('-F-') || codigoVenta.includes('-A-')) {
      // Extraer solo hasta el tipo de pago (F o A)
      const match = codigoVenta.match(/^(S\d+-[FA])/);
      if (match) {
        return match[1];
      }
    }

    // Para otros códigos, truncar si es muy largo
    if (codigoVenta.length > 20) {
      return codigoVenta.substring(0, 17) + '...';
    }

    return codigoVenta;
  };

  const formatTime = (fechaHora) => {
    if (!fechaHora) return '--:--';

    try {
      const date = new Date(fechaHora);
      if (isNaN(date.getTime())) return '--:--';

      return date.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando hora:', error);
      return '--:--';
    }
  };

  const formatAmount = (amount) => {
    return amount.toLocaleString('es-VE', { minimumFractionDigits: 2 });
  };

  const obtenerMontosOriginales = (transaccion) => {
    //  MEJORAR PRESENTACIÓN DE VUELTOS
    if (transaccion.categoria?.includes('Vuelto de venta')) {
      // Detectar moneda original del vuelto
      const esUSD = transaccion.metodoPagoPrincipal?.includes('usd') ||
        transaccion.metodoPagoPrincipal === 'zelle' ||
        transaccion.metodoPagoPrincipal === 'binance';

      if (esUSD) {
        return [{
          monto: parseFloat(transaccion.totalUsd) || 0,
          moneda: 'usd',
          metodo: transaccion.metodoPagoPrincipal,
          simbolo: '$'
        }];
      } else {
        return [{
          monto: parseFloat(transaccion.totalBs) || 0,
          moneda: 'bs',
          metodo: transaccion.metodoPagoPrincipal,
          simbolo: 'Bs'
        }];
      }
    }

    // Para transacciones con pagos registrados
    if (transaccion.pagos && transaccion.pagos.length > 0) {
      return transaccion.pagos.map(pago => ({
        monto: parseFloat(pago.monto) || 0,
        moneda: pago.moneda || 'usd',
        metodo: pago.metodo,
        simbolo: pago.moneda === 'bs' ? 'Bs' : '$'
      }));
    }

    // FALLBACK: Si no hay pagos, usar totalUsd con metodoPagoPrincipal
    const totalUsd = parseFloat(transaccion.totalUsd) || 0;
    if (totalUsd > 0) {
      return [{
        monto: totalUsd,
        moneda: 'usd',
        metodo: transaccion.metodoPagoPrincipal || 'efectivo_usd',
        simbolo: '$'
      }];
    }

    // Si no hay totalUsd, intentar con totalBs
    const totalBs = parseFloat(transaccion.totalBs) || 0;
    if (totalBs > 0) {
      return [{
        monto: totalBs,
        moneda: 'bs',
        metodo: transaccion.metodoPagoPrincipal || 'pago_movil',
        simbolo: 'Bs'
      }];
    }

    return [];
  };

  const getMetodoIcon = (metodo) => {
    const iconMap = {
      'efectivo_bs': <DollarSign className="h-2.5 w-2.5" />,
      'efectivo_usd': <DollarSign className="h-2.5 w-2.5" />,
      'pago_movil': <Smartphone className="h-2.5 w-2.5" />,
      'transferencia': <CreditCard className="h-2.5 w-2.5" />,
      'zelle': <CreditCard className="h-2.5 w-2.5" />,
      'binance': <CreditCard className="h-2.5 w-2.5" />,
      'tarjeta': <CreditCard className="h-2.5 w-2.5" />
    };
    return iconMap[metodo] || <CreditCard className="h-2.5 w-2.5" />;
  };

  const getMetodoColor = (metodo) => {
    const colorMap = {
      'efectivo_bs': 'bg-blue-50 text-blue-700 border-blue-200',
      'efectivo_usd': 'bg-emerald-50 text-emerald-700 border-emerald-200', // Green consistent
      'pago_movil': 'bg-purple-50 text-purple-700 border-purple-200',
      'transferencia': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'zelle': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'binance': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'tarjeta': 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    return colorMap[metodo] || 'bg-gray-50 text-gray-700 border-gray-200';
  };
  const getMetodoLabel = (metodo) => {
    const labelMap = {
      'efectivo_bs': 'EFE-BS',
      'efectivo_usd': 'EFE-USD',
      'pago_movil': 'P-MOV',
      'transferencia': 'TRANS',
      'zelle': 'ZELLE',
      'binance': 'BINANCE',
      'tarjeta': 'TARJ'
    };
    return labelMap[metodo] || metodo.slice(0, 4).toUpperCase();
  };

  const getInventarioIcon = (tipo) => {
    switch (tipo) {
      case 'producto': return '';
      case 'servicio': return '';
      case 'electrobar': return '';
      default: return '';
    }
  };

  if (!cajaActual) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
        {/* Header cuando caja está cerrada - GRIS */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Registro de Transacciones</h2>
              <p className="text-sm text-slate-200">Historial completo del día</p>
            </div>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="bg-gray-100/70 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/30">
            <div className="relative">
              <FaCashRegister className="h-10 w-10 text-gray-400" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px] border border-gray-100">
                <FaLock className="h-2.5 w-2.5 text-gray-400" />
              </div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Caja Cerrada</h3>
          <p className="text-gray-500">Abre la caja para comenzar a registrar transacciones</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/70 backdrop-blur-lg rounded-xl shadow-sm border border-white/20 overflow-hidden">

        {/* Header con VERDE cuando caja está abierta - CORREGIDO */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 backdrop-blur-sm px-6 py-4 border-b border-white/30">
          <div className="flex items-center justify-between gap-4">
            {/* LADO IZQUIERDO: Título y contador */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Registro de Transacciones</h2>
                <p className="text-sm text-emerald-100">
                  {sortedTransactions.length} transacciones registradas
                </p>
              </div>
            </div>

            {/* CENTRO: Indicadores de productos vendidos por tipo */}
            <div className="flex items-center space-x-2 flex-1 justify-center">
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-2 py-1">
                <Wrench className="h-5 w-5 text-white" />
                <span className="text-base font-medium text-white">
                  {transacciones
                    .filter(t => t.tipo === 'ingreso')
                    .reduce((sum, t) => {
                      return sum + (t.items?.filter(item => item.producto?.tipo === 'SERVICIO').reduce((itemSum, item) => itemSum + item.cantidad, 0) || 0);
                    }, 0)}
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-2 py-1">
                <MonitorSmartphone className="h-5 w-5 text-white" />
                <span className="text-base font-medium text-white">
                  {transacciones
                    .filter(t => t.tipo === 'ingreso')
                    .reduce((sum, t) => {
                      return sum + (t.items?.filter(item => item.producto?.tipo === 'PRODUCTO').reduce((itemSum, item) => itemSum + item.cantidad, 0) || 0);
                    }, 0)}
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-2 py-1">
                <Coffee className="h-5 w-5 text-white" />
                <span className="text-base font-medium text-white">
                  {transacciones
                    .filter(t => t.tipo === 'ingreso')
                    .reduce((sum, t) => {
                      return sum + (t.items?.filter(item => item.producto?.tipo === 'ELECTROBAR').reduce((itemSum, item) => itemSum + item.cantidad, 0) || 0);
                    }, 0)}
                </span>
              </div>
            </div>

            {/* LADO DERECHO: Controles de búsqueda y filtro */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white z-10 pointer-events-none" />
                <input
                  id="search-transactions-input"
                  name="searchTransactions"
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 pl-10 pr-4 py-2 border border-white/30 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/60 backdrop-blur-sm placeholder-gray-500 text-gray-900 relative z-0"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white z-10 pointer-events-none" />
                <select
                  id="filter-transactions-select"
                  name="filterTransactions"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-white/30 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white/60 backdrop-blur-sm min-w-[140px] text-gray-900 relative z-0"
                >
                  <option value="todas">Todas</option>
                  <option value="ingreso">Solo Ingresos</option>
                  <option value="egreso">Solo Egresos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla con fondo glassmorphism - SIN CAMBIOS */}
        <div className="overflow-x-auto bg-white/40 backdrop-blur-sm">
          {currentTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100/70 backdrop-blur-sm rounded-full p-6 w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-white/30">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm || filterType !== 'todas' ? 'No se encontraron resultados' : 'No hay transacciones'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterType !== 'todas'
                  ? 'Prueba ajustando los filtros de búsqueda'
                  : 'Usa los botones flotantes para agregar la primera transacción'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/80 backdrop-blur-sm border-b border-white/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                    <button
                      onClick={() => handleSort('id')}
                      className="flex items-center space-x-1 hover:text-emerald-600 transition-colors"
                    >
                      <span>ID/Hora</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>

                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider w-32">
                    Usuario
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[220px]">
                    <button
                      onClick={() => handleSort('categoria')}
                      className="flex items-center space-x-1 hover:text-emerald-600 transition-colors"
                    >
                      <span>Descripción</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                    <button
                      onClick={() => handleSort('total_bs')}
                      className="flex items-center justify-end space-x-1 hover:text-emerald-600 transition-colors w-full"
                    >
                      <span>Monto</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider w-32">
                    Forma de Pago
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider w-20">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/20 backdrop-blur-sm divide-y divide-white/20">
                {currentTransactions.map((transaccion, index) => {
                  const rowColors = transaccion.tipo === 'ingreso'
                    ? 'bg-emerald-50/60 hover:bg-emerald-50/80 border-l-4 border-l-emerald-400 backdrop-blur-sm'
                    : 'bg-red-50/60 hover:bg-red-50/80 border-l-4 border-l-red-400 backdrop-blur-sm';

                  const montosOriginales = obtenerMontosOriginales(transaccion);

                  return (
                    <tr key={transaccion.id} className={`transition-all duration-200 ${rowColors}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-gray-400 leading-tight">#{transaccion.id}</div>
                        <div className="text-xs text-gray-600 font-medium flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          {formatTime(transaccion.fechaHora || transaccion.fecha_hora)}
                        </div>
                      </td>

                      {/* Usuario */}
                      <td className="px-2 py-4 whitespace-nowrap min-w-[120px]">
                        <div className="text-xs font-medium text-gray-900">
                          {transaccion.usuario || 'N/A'}
                        </div>
                      </td>

                      {/* Descripción con info de inventario - 2 FILAS */}
                      <td className="px-6 py-4">
                        {/* FILA 1: Tipo, código, orden de servicio */}
                        <div className="flex items-center space-x-2 flex-wrap mb-1.5">
                          {transaccion.item_inventario && (
                            <span className="text-sm" title={`Del inventario: ${transaccion.item_inventario.tipo}`}>
                              {getInventarioIcon(transaccion.item_inventario.tipo)}
                            </span>
                          )}
                          {/* Tipo de transacción */}
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${transaccion.tipo === 'ingreso'
                            ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200'
                            : 'bg-red-50/80 text-red-700 border-red-200'
                            }`}>
                            {transaccion.tipo === 'ingreso' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {transaccion.tipo === 'ingreso' ? 'ING' : 'EGR'}
                          </div>
                          {/* Código de venta */}
                          <div className="text-base font-semibold text-gray-900">
                            {(() => {
                              const codigoVenta = transaccion.codigoVenta ||
                                transaccion.categoria.match(/V\d+/)?.[0] ||
                                'Sin código';
                              return `- ${formatCodigoVenta(codigoVenta)}`;
                            })()}
                          </div>
                          {/* Número real de orden de servicio si existe */}
                          {transaccion.servicioTecnico?.numeroServicio && (
                            <>
                              <span className="text-gray-400">•</span>
                              <Wrench className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                              <span className="text-xs font-semibold text-blue-700">Orden:</span>
                              <span className="text-xs text-blue-600 font-mono">{transaccion.servicioTecnico.numeroServicio}</span>
                            </>
                          )}
                        </div>

                        {/* FILA 2: Items, cliente, observaciones */}
                        <div className="flex items-start space-x-3 text-xs flex-wrap">
                          {/* Items y conteo */}
                          {transaccion.items && transaccion.items.length > 0 && (
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="text-gray-600 font-medium">
                                {(() => {
                                  const conteo = transaccion.items.reduce((acc, item) => {
                                    const tipo = item.producto?.tipo?.toLowerCase() || 'producto';
                                    acc[tipo] = (acc[tipo] || 0) + item.cantidad;
                                    return acc;
                                  }, {});
                                  const partes = [];
                                  if (conteo.producto) partes.push(`${conteo.producto} prod`);
                                  if (conteo.servicio) partes.push(`${conteo.servicio} serv`);
                                  if (conteo.electrobar) partes.push(`${conteo.electrobar} elec`);
                                  return partes.join(', ');
                                })()}
                              </span>
                              {/* Primeros 2 items con detalles */}
                              {transaccion.items.slice(0, 2).map((item, idx) => (
                                <span key={idx} className="text-gray-600">
                                  <span className="text-gray-400">•</span>
                                  <span className="font-medium ml-1">{item.descripcion || item.producto?.nombre || 'Item'}</span>
                                  {item.cantidad > 1 && <span className="text-gray-500 ml-1">(x{item.cantidad})</span>}
                                </span>
                              ))}
                              {transaccion.items.length > 2 && (
                                <span className="text-gray-500 italic">+{transaccion.items.length - 2} más</span>
                              )}
                            </div>
                          )}

                          {/* Cliente */}
                          {transaccion.servicioTecnico?.clienteNombre && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">{transaccion.servicioTecnico.clienteNombre}</span>
                              {transaccion.servicioTecnico.dispositivoMarca && transaccion.servicioTecnico.dispositivoModelo && (
                                <span className="text-gray-500">({transaccion.servicioTecnico.dispositivoMarca} {transaccion.servicioTecnico.dispositivoModelo})</span>
                              )}
                            </>
                          )}
                          {transaccion.clienteNombre && !transaccion.servicioTecnico && (
                            <>
                              <span className="text-gray-400">•</span>
                              <User className="h-3 w-3 text-gray-400 inline" />
                              <span className="text-gray-600 ml-1">{transaccion.clienteNombre}</span>
                            </>
                          )}

                          {/* Observaciones (solo si no es venta automática) */}
                          {transaccion.observaciones &&
                            !transaccion.observaciones.startsWith('Venta procesada con código') && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">
                                  {(() => {
                                    if (transaccion.observaciones.includes('Vuelto entregado')) {
                                      const metodo = transaccion.observaciones.match(/Método: (\w+)/)?.[1];
                                      const metodosMap = {
                                        'efectivo_bs': 'Efectivo Bs',
                                        'efectivo_usd': 'Efectivo USD',
                                        'pago_movil': 'Pago Móvil',
                                        'transferencia': 'Transferencia',
                                        'zelle': 'Zelle',
                                        'binance': 'Binance',
                                        'tarjeta': 'Tarjeta'
                                      };
                                      const metodoPretty = metodosMap[metodo] || metodo;
                                      return `Vuelto en ${metodoPretty}`;
                                    }
                                    return transaccion.observaciones.length > 50
                                      ? transaccion.observaciones.substring(0, 50) + '...'
                                      : transaccion.observaciones;
                                  })()}
                                </span>
                              </>
                            )}
                        </div>
                      </td>

                      {/* Montos Originales */}
                      <td className="px-4 py-4 whitespace-nowrap text-right min-w-[140px]">
                        <div className="space-y-1">
                          {montosOriginales.map((montoInfo, idx) => (
                            <div key={idx} className={`text-sm font-bold ${montoInfo.metodo === 'pago_movil' ? 'text-purple-700' :
                              montoInfo.moneda === 'usd' ? 'text-green-700' :
                                'text-blue-700'
                              }`}>
                              {transaccion.tipo === 'ingreso' ? '+' : '-'}
                              {montoInfo.simbolo}{formatAmount(montoInfo.monto)}
                              {montoInfo.metodo === 'pago_movil' && (
                                <span className="ml-1 text-xs text-purple-600">(PM)</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {transaccion.pagos && transaccion.pagos.length > 1 && (
                          <div className="text-xs text-gray-500 flex items-center justify-end mt-1">
                            <span className="bg-gray-100/70 backdrop-blur-sm text-gray-600 px-1.5 py-0.5 rounded text-xs border border-white/30">
                              {transaccion.pagos.length} método{transaccion.pagos.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Forma de Pago */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            // Para vueltos, mostrar método principal en lugar de pagos
                            if (transaccion.categoria?.includes('Vuelto de venta') && transaccion.metodoPagoPrincipal) {
                              return (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border backdrop-blur-sm ${getMetodoColor(transaccion.metodoPagoPrincipal).replace('bg-', 'bg-').replace('-50', '-50/80')}`}
                                  title={`Vuelto en ${transaccion.metodoPagoPrincipal.replace('_', ' ').toUpperCase()}`}
                                >

                                  {getMetodoIcon(transaccion.metodoPagoPrincipal)}
                                  <span className="ml-1 truncate max-w-[50px]">
                                    {getMetodoLabel(transaccion.metodoPagoPrincipal)}
                                  </span>
                                </span>
                              );
                            }

                            // Para transacciones con pagos
                            if (transaccion.pagos && transaccion.pagos.length > 0) {
                              return (
                                <>
                                  {transaccion.pagos.slice(0, 2).map((pago, idx) => (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border backdrop-blur-sm ${getMetodoColor(pago.metodo).replace('bg-', 'bg-').replace('-50', '-50/80')}`}
                                      title={`${pago.metodo?.replace('_', ' ').toUpperCase()}: ${pago.monto} ${pago.moneda?.toUpperCase()}`}
                                    >
                                      {getMetodoIcon(pago.metodo)}
                                      <span className="ml-1 truncate max-w-[50px]">
                                        {getMetodoLabel(pago.metodo)}
                                      </span>
                                    </span>
                                  ))}
                                  {transaccion.pagos.length > 2 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100/70 backdrop-blur-sm text-gray-600 border border-white/30">
                                      +{transaccion.pagos.length - 2}
                                    </span>
                                  )}
                                </>
                              );
                            }

                            // FALLBACK: Si no hay pagos pero hay metodoPagoPrincipal
                            if (transaccion.metodoPagoPrincipal) {
                              return (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border backdrop-blur-sm ${getMetodoColor(transaccion.metodoPagoPrincipal).replace('bg-', 'bg-').replace('-50', '-50/80')}`}
                                  title={transaccion.metodoPagoPrincipal.replace('_', ' ').toUpperCase()}
                                >
                                  {getMetodoIcon(transaccion.metodoPagoPrincipal)}
                                  <span className="ml-1 truncate max-w-[50px]">
                                    {getMetodoLabel(transaccion.metodoPagoPrincipal)}
                                  </span>
                                </span>
                              );
                            }

                            return <span className="text-gray-400 text-xs">-</span>;
                          })()}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(transaccion)}
                            className="bg-blue-50/80 backdrop-blur-sm hover:bg-blue-100/80 text-blue-600 p-2 rounded-md transition-colors border border-blue-200/50 hover:border-blue-300/50"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {usuario?.rol === 'admin' && (
                            <button
                              onClick={() => handleDeleteClick(transaccion)}
                              className="bg-red-50/80 backdrop-blur-sm hover:bg-red-100/80 text-red-600 p-2 rounded-md transition-colors border border-red-200/50 hover:border-red-300/50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Paginación - Estilo Azul Centrado Premium */}
        {sortedTransactions.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-t border-blue-500 px-4 py-2 grid grid-cols-3 items-center shrink-0 h-14 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 rounded-b-xl">
            {/* Izquierda: Contador */}
            <div className="text-left">
              <span className="text-xs text-blue-100 font-medium opacity-90">
                Mostrando {startIndex + 1} - {Math.min(endIndex, sortedTransactions.length)} de {sortedTransactions.length}
              </span>
            </div>

            {/* Centro: Paginación */}
            <div className="flex justify-center">
              {totalPages > 1 && (
                <div className="flex items-center space-x-2 rounded-lg p-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex items-center space-x-1 px-2 border-l border-r border-blue-400/30 mx-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Mostrar primera, última, actual y adyacentes
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${currentPage === page
                              ? 'bg-white text-blue-700 shadow-md transform scale-105'
                              : 'text-blue-100 hover:bg-white/10'
                              }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="text-blue-300 text-xs px-1 font-medium">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Derecha: Espacio vacío para balancear */}
            <div></div>
          </div>
        )}
      </div>

      {/* Modales sin cambios */}
      {/*{showDetailModal && (
        <div className="fixed inset-0 z-[80]">
          <TransactionDetailModal
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            transaccion={selectedTransaction}
          />
        </div>
      )}*/}

      <DeleteTransactionModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTransaction(null);
        }}
        transaccion={selectedTransaction}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default TransactionTable;