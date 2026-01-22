// components/PresupuestoModal.jsx - VERSIÓN CON ALTURAS AMPLIADAS Y EXPORT ARREGLADO 
import React, { useState, useEffect } from 'react';
import {
  X, Calculator, FileText, Send, Save,
  User, Package, DollarSign, Calendar,
  CheckCircle, AlertCircle, ArrowRight, ArrowLeft,
  Check, Clock, TrendingUp, ChevronRight, QrCode, ShoppingCart
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import ClienteSelector from './presupuesto/ClienteSelector';
import ItemsTable from './presupuesto/ItemsTable';
import TotalsPanel from './presupuesto/TotalsPanel';
import ExportActions from './presupuesto/ExportActions';
import toast from '../utils/toast.jsx';

//  CONFIGURACIÓN DE TABS
const TABS = [
  { id: 'cliente', label: 'Cliente', icon: User, step: 1 },
  { id: 'items', label: 'Items', icon: Package, step: 2 },
  { id: 'totales', label: 'Totales', icon: Calculator, step: 3 },
  { id: 'exportar', label: 'Exportar', icon: FileText, step: 4 }
];

//  BREADCRUMB MODERNO CON VALIDACIONES
const BreadcrumbModerno = ({ tabs, activeTab, onTabChange, validaciones }) => {
  const currentIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Crear Presupuesto</h3>
        <div className="text-sm text-gray-500">
          Paso {currentIndex + 1} de {tabs.length}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const isCompleted = validaciones[tab.id]?.valido;
          const isPast = index < currentIndex;
          const canAccess = index <= currentIndex || isPast || isCompleted;

          return (
            <React.Fragment key={tab.id}>
              <button
                onClick={() => canAccess && onTabChange(tab.id)}
                disabled={!canAccess}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isActive
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                  : isCompleted
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    : canAccess
                      ? 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                      : 'text-gray-400 cursor-not-allowed border border-gray-100'
                  }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCompleted
                  ? 'bg-green-500 text-white'
                  : isActive
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                  }`}>
                  {isCompleted ? <Check className="h-3 w-3" /> : tab.step}
                </div>
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {validaciones[tab.id]?.errores > 0 && (
                  <div className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                    {validaciones[tab.id].errores}
                  </div>
                )}
              </button>

              {index < tabs.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

//  COMPONENTE PRINCIPAL CON ALTURAS AMPLIADAS
const PresupuestoModal = ({ isOpen, onClose, presupuesto = null, onMinimize }) => {
  const { usuario } = useAuthStore();
  const { tasaCambio } = useCajaStore();

  // Estados principales
  const [activeTab, setActiveTab] = useState('cliente');
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [loadingCrear, setLoadingCrear] = useState(false);


  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Estado del presupuesto
  const [presupuestoData, setPresupuestoData] = useState({
    id: null,
    numero: '',
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], //  CAMBIAR: 1 día
    cliente: null,
    items: [],
    subtotal: 0,
    descuentoGlobal: 0,
    tipoDescuento: 'porcentaje',
    impuestos: 16,
    totalUsd: 0,
    observaciones: [],
    validezDias: 1, //  CAMBIAR: 1 día
    exportConfig: {
      pdf: false,
      whatsapp: false,
      email: false,
      vistaPrevia: false
    },
    creadoPor: usuario?.id,
    fechaCreacion: new Date().toISOString(),
    version: 1
  });

  // Validaciones por tab
  const [validaciones, setValidaciones] = useState({
    cliente: { valido: false, errores: 0 },
    items: { valido: false, errores: 0 },
    totales: { valido: true, errores: 0 },
    exportar: { valido: false, errores: 0 }
  });

  //  EFECTOS DE INICIALIZACIÓN
  useEffect(() => {
    if (isOpen) {
      if (presupuesto) {
        // Convertir presupuesto del backend al formato del modal
        setPresupuestoData({
          id: presupuesto.id,
          numero: presupuesto.numero,
          fecha: new Date(presupuesto.fecha).toISOString().split('T')[0],
          fechaVencimiento: new Date(presupuesto.fechaVencimiento).toISOString().split('T')[0],
          cliente: presupuesto.clienteId ? {
            id: presupuesto.clienteId,
            nombre: presupuesto.clienteNombre,
            cedula_rif: presupuesto.clienteCedulaRif,
            telefono: presupuesto.clienteTelefono,
            email: presupuesto.clienteEmail
          } : null,
          items: Array.isArray(presupuesto.items) ? presupuesto.items : [],
          subtotal: parseFloat(presupuesto.subtotal || 0),
          descuentoGlobal: parseFloat(presupuesto.descuentoGlobal || 0),
          tipoDescuento: presupuesto.tipoDescuento || 'porcentaje',
          impuestos: parseFloat(presupuesto.impuestos || 16),
          totalUsd: parseFloat(presupuesto.totalUsd || 0),
          observaciones: Array.isArray(presupuesto.observaciones) ? presupuesto.observaciones : [],
          validezDias: presupuesto.validezDias || 1,
          exportConfig: presupuesto.exportConfig || {
            pdf: false,
            whatsapp: false,
            email: false,
            vistaPrevia: false
          },
          creadoPor: presupuesto.creadoPorId,
          fechaCreacion: presupuesto.createdAt,
          version: presupuesto.version || 1
        });
      } else {
        const numero = `PRES-${Date.now().toString().slice(-6)}`;
        setPresupuestoData(prev => ({ ...prev, numero }));
      }
      setActiveTab('cliente');
      setHasUnsavedChanges(false);
    }
  }, [isOpen, presupuesto]);

  //  VALIDACIONES AUTOMÁTICAS
  useEffect(() => {
    const nuevasValidaciones = {
      cliente: {
        valido: !!presupuestoData.cliente,
        errores: !presupuestoData.cliente ? 1 : 0
      },
      items: {
        valido: presupuestoData.items.length > 0,
        errores: presupuestoData.items.length === 0 ? 1 : 0
      },
      totales: {
        valido: true,
        errores: 0
      },
      exportar: {
        valido: Object.values(presupuestoData.exportConfig || {}).some(Boolean),
        errores: !Object.values(presupuestoData.exportConfig || {}).some(Boolean) ? 1 : 0
      }
    };

    setValidaciones(nuevasValidaciones);
  }, [presupuestoData.cliente, presupuestoData.items, presupuestoData.exportConfig]);

  //  MANEJADORES DE NAVEGACIÓN
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleNavigateTab = (direction) => {
    const currentIndex = TABS.findIndex(tab => tab.id === activeTab);

    if (direction === 'next' && currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
  };

  //  MANEJADORES DE DATOS
  const handleClienteSeleccionado = (cliente) => {
    setPresupuestoData(prev => ({ ...prev, cliente }));
    setHasUnsavedChanges(true);
  };

  const handleItemsChange = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

    setPresupuestoData(prev => ({
      ...prev,
      items,
      subtotal,
      totalUsd: subtotal // Se recalculará en TotalsPanel
    }));
    setHasUnsavedChanges(true);
  };

  const handleDescuentoChange = (descuento, tipo) => {
    setPresupuestoData(prev => ({
      ...prev,
      descuentoGlobal: descuento,
      tipoDescuento: tipo
    }));
    setHasUnsavedChanges(true);
  };

  const handleObservacionesChange = (observaciones) => {
    setPresupuestoData(prev => ({ ...prev, observaciones }));
    setHasUnsavedChanges(true);
  };

  const handleExportConfigChange = (config) => {
    setPresupuestoData(prev => ({
      ...prev,
      exportConfig: { ...prev.exportConfig, ...config }
    }));
    setHasUnsavedChanges(true);
  };

  //  MANEJADORES DE ACCIONES PRINCIPALES
  const handleGuardarPresupuesto = async () => {
    setLoadingGuardar(true);  //  NUEVO
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Presupuesto guardado para aprobación', {
        duration: 4000,
        style: {
          background: '#DBEAFE',
          border: '1px solid #3B82F6',
          color: '#1E40AF'
        }
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error('Error al guardar presupuesto');
    } finally {
      setLoadingGuardar(false);  //  NUEVO
    }
  };

  //  EJECUTOR PRINCIPAL - FUNCIÓN CORREGIDA CON GUARDADO EN BACKEND
  const handleCrearPresupuesto = async () => {
    setLoadingCrear(true);

    try {
      console.log(' Ejecutando creación de presupuesto...', presupuestoData.exportConfig);

      //  IMPORTAR FUNCIONES DESDE UTILS DIRECTAMENTE
      const {
        ejecutarExportPresupuesto,
        validarPresupuesto,
        validarExportConfig
      } = await import('../utils/presupuestoUtils');

      // Validar datos del presupuesto
      const validacionPresupuesto = validarPresupuesto(presupuestoData);
      if (!validacionPresupuesto.valido) {
        toast.error('' + validacionPresupuesto.errores.join('\n'));
        return;
      }

      // Validar configuración de export
      const validacionConfig = validarExportConfig(presupuestoData.exportConfig, presupuestoData);
      if (!validacionConfig.valido) {
        toast.error('' + validacionConfig.errores.join('\n'));
        setLoadingCrear(false);
        return;
      }

      // ✅ VALIDAR QUE HAYA AL MENOS UNA OPCIÓN SELECCIONADA
      const tieneOpcionSeleccionada = Object.values(presupuestoData.exportConfig || {}).some(Boolean);
      if (!tieneOpcionSeleccionada) {
        toast.error('Debes seleccionar al menos una opción de exportación (PDF, WhatsApp, WhatsApp Simple o Email)');
        setLoadingCrear(false);
        return;
      }

      // ✅ GUARDAR EN BACKEND PRIMERO
      const presupuestoParaGuardar = {
        numero: presupuestoData.numero,
        fecha: presupuestoData.fecha,
        fechaVencimiento: presupuestoData.fechaVencimiento,
        validezDias: presupuestoData.validezDias,
        clienteId: presupuestoData.cliente?.id || null,
        clienteNombre: presupuestoData.cliente?.nombre || null,
        clienteCedulaRif: presupuestoData.cliente?.cedula_rif || null,
        clienteTelefono: presupuestoData.cliente?.telefono || null,
        clienteEmail: presupuestoData.cliente?.email || null,
        items: presupuestoData.items,
        subtotal: presupuestoData.subtotal,
        descuentoGlobal: presupuestoData.descuentoGlobal,
        tipoDescuento: presupuestoData.tipoDescuento,
        impuestos: presupuestoData.impuestos,
        totalUsd: presupuestoData.totalUsd,
        totalBs: presupuestoData.totalUsd * tasaCambio,
        tasaCambio: tasaCambio,
        observaciones: presupuestoData.observaciones || [],
        exportConfig: presupuestoData.exportConfig,
        estado: 'ENVIADO'
      };

      let presupuestoGuardado;
      if (presupuestoData.id) {
        // Actualizar presupuesto existente
        const { default: api } = await import('../config/api');
        const response = await api.put(`/presupuestos/${presupuestoData.id}`, presupuestoParaGuardar);
        presupuestoGuardado = response.data.data;
      } else {
        // Crear nuevo presupuesto
        const { default: api } = await import('../config/api');
        const response = await api.post('/presupuestos', presupuestoParaGuardar);
        presupuestoGuardado = response.data.data;
      }

      // Ejecutar exports según configuración
      const resultado = await ejecutarExportPresupuesto(presupuestoData, tasaCambio, presupuestoData.exportConfig);

      if (resultado.success) {
        const exitosos = resultado.resultados.filter(r => !r.includes('')).length;
        const fallidos = resultado.errores;

        let mensaje = ` Presupuesto ${presupuestoData.numero} ${presupuestoData.id ? 'actualizado' : 'creado'} exitosamente:\n\n`;

        resultado.resultados.forEach(r => {
          if (!r.includes('')) {
            mensaje += r + '\n';
          }
        });

        toast.success(mensaje, {
          duration: 6000,
          style: {
            background: '#ECFDF5',
            border: '1px solid #10B981',
            color: '#047857'
          }
        });

        // Mostrar errores si los hay
        if (fallidos > 0) {
          resultado.resultados.forEach(r => {
            if (r.includes('')) {
              toast.error(r, { duration: 6000 });
            }
          });
        }
      }

      setHasUnsavedChanges(false);
      onClose();

    } catch (error) {
      console.error(' Error creando presupuesto:', error);
      toast.error('Error creando presupuesto: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingCrear(false);
    }
  };

  //  MANEJADORES DE SALIDA
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  //  NUEVA: Función para cancelar y limpiar todo
  const handleCancelar = () => {
    // Limpiar todo el estado del presupuesto
    const numero = `PRES-${Date.now().toString().slice(-6)}`;
    setPresupuestoData({
      id: null,
      numero,
      fecha: new Date().toISOString().split('T')[0],
      fechaVencimiento: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cliente: null,
      items: [],
      subtotal: 0,
      descuentoGlobal: 0,
      tipoDescuento: 'porcentaje',
      impuestos: 16,
      totalUsd: 0,
      observaciones: [],
      validezDias: 1,
      exportConfig: {
        pdf: false,
        whatsapp: false,
        email: false,
        vistaPrevia: false
      },
      creadoPor: usuario?.id,
      fechaCreacion: new Date().toISOString(),
      version: 1
    });

    // Resetear tab activo
    setActiveTab('cliente');

    // Limpiar cambios sin guardar
    setHasUnsavedChanges(false);

    toast.success('Presupuesto cancelado y limpiado');
    onClose();
  };



  if (!isOpen) return null;

  const currentIndex = TABS.findIndex(tab => tab.id === activeTab);
  const canGoNext = currentIndex < TABS.length - 1;
  const canGoPrev = currentIndex > 0;
  const allValid = Object.values(validaciones).every(v => v.valido);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/*  MODAL CON ALTURA FIJA AMPLIADA */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden h-[90vh] flex flex-col">

          {/*  HEADER ELEGANTE (FIJO) */}
          <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
            </div>

            <div className="relative px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                    <Calculator className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {presupuesto ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} {presupuestoData.numero}
                    </h1>
                    <div className="flex items-center space-x-4 text-sm text-emerald-100 mt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(presupuestoData.fecha).toLocaleDateString('es-VE')}</span>
                      </span>
                      {/*  NUEVO: Selector de fecha de vencimiento */}
                      <span className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Válido hasta:</span>
                        <input
                          type="date"
                          value={presupuestoData.fechaVencimiento}
                          onChange={(e) => {
                            setPresupuestoData(prev => ({ ...prev, fechaVencimiento: e.target.value }));
                            setHasUnsavedChanges(true);
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="bg-white/20 border border-white/30 rounded px-2 py-1 text-xs text-white placeholder-emerald-200 focus:bg-white/30 focus:outline-none w-26"
                        />

                        {/*  NUEVO: Botones de acceso rápido */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              const fechaRapida = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                              setPresupuestoData(prev => ({ ...prev, fechaVencimiento: fechaRapida }));
                              setHasUnsavedChanges(true);
                            }}
                            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors"
                          >
                            7d
                          </button>
                        </div>
                      </span>
                      <span className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{usuario?.nombre}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2 text-emerald-200">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-sm">Cambios sin guardar</span>
                    </div>
                  )}

                  {/* Botones de acción rápida - MÁS GRANDES */}
                  {presupuestoData.cliente && presupuestoData.items?.length > 0 && (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toast.success('QR generado (próximamente)')}
                        className="bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition-colors backdrop-blur-sm flex items-center space-x-2"
                        title="Generar código QR"
                      >
                        <QrCode className="h-6 w-6" />
                        <span className="text-sm font-medium">Aprobación QR</span>
                      </button>

                      <button
                        onClick={() => toast.success('Convirtiendo a venta...')}
                        className="bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition-colors backdrop-blur-sm flex items-center space-x-2"
                        title="Convertir a venta"
                      >
                        <ShoppingCart className="h-6 w-6" />
                        <span className="text-sm font-medium">Pasar a Venta</span>
                      </button>
                    </div>
                  )}
                  {/* Botones de Ventana */}
                  <div className="flex items-center space-x-2 border-l border-white/20 pl-4 ml-2">
                    <button
                      onClick={handleClose}
                      className="bg-white/20 hover:bg-red-500/80 p-2 rounded-lg transition-colors group"
                      title="Cerrar"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/*  BREADCRUMB MODERNO (FIJO) */}
          <div className="flex-shrink-0">
            <BreadcrumbModerno
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              validaciones={validaciones}
            />
          </div>

          {/*  CONTENIDO DE TABS CON ALTURA AUTOMÁTICA (FLEX) */}
          <div className="flex-1 overflow-y-auto p-8 flex flex-col min-h-0 bg-gray-50/50">

            {activeTab === 'cliente' && (
              <div className="space-y-4">
                <ClienteSelector
                  clienteSeleccionado={presupuestoData.cliente}
                  onClienteSeleccionado={handleClienteSeleccionado}
                  label="Cliente del Presupuesto"
                  required={true}
                  placeholder="Buscar cliente para el presupuesto..."
                />
                {/* Espacio adicional para dropdown */}
                <div className="h-8"></div>
              </div>
            )}

            {activeTab === 'items' && (
              <ItemsTable
                items={presupuestoData.items}
                onItemsChange={handleItemsChange}
                isEditable={true}
                tasaCambio={tasaCambio}
                title="Productos y Servicios del Presupuesto"
                showAddCustom={true}
                itemsPerPage={5} // Paginación de 5 elementos
              />
            )}

            {activeTab === 'totales' && (
              <TotalsPanel
                items={presupuestoData.items}
                descuentoGlobal={presupuestoData.descuentoGlobal}
                tipoDescuento={presupuestoData.tipoDescuento}
                onDescuentoChange={handleDescuentoChange}
                impuesto={presupuestoData.impuestos}
                tasaCambio={tasaCambio}
                observaciones={presupuestoData.observaciones}
                onObservacionesChange={handleObservacionesChange}
                title="Totales del Presupuesto"
                showObservaciones={true}
                showDescuento={true}
              />
            )}

            {activeTab === 'exportar' && (
              <ExportActions
                presupuestoData={presupuestoData}
                onExport={(type, data) => {
                  console.log('Exportando:', type, data);
                }}
                onConfigChange={handleExportConfigChange}
                isEnabled={true}
                tasaCambio={tasaCambio}
              />
            )}
          </div>

          {/*  FOOTER REORGANIZADO - ANTERIOR | ACCIONES | SIGUIENTE */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-3 items-center">

              {/* IZQUIERDA: Botón Anterior (oculto en Cliente) */}
              <div className="flex justify-start">
                {activeTab !== 'cliente' && (
                  <button
                    onClick={() => handleNavigateTab('prev')}
                    disabled={!canGoPrev}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </button>
                )}
              </div>

              {/* CENTRO: Botones de Acción */}
              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"  //  AGREGAR
                  onClick={handleCancelar}
                  className="px-6 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>

                <button
                  type="button"  //  AGREGAR
                  onClick={handleGuardarPresupuesto}
                  disabled={loadingGuardar}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  {loadingGuardar ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Pendiente</span>
                    </>
                  )}
                </button>

                <button
                  type="button"  //  AGREGAR
                  onClick={handleCrearPresupuesto}
                  disabled={loadingCrear || !allValid}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  {loadingCrear ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Generar</span>
                    </>
                  )}
                </button>
              </div>

              {/* DERECHA: Botón Siguiente (oculto en Exportar) */}
              <div className="flex justify-end">
                {activeTab !== 'exportar' && (
                  <button
                    onClick={() => handleNavigateTab('next')}
                    disabled={!canGoNext}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 hover:text-emerald-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-100"
                  >
                    <span>Siguiente</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>

            </div>
          </div>


        </div>
      </div>

      {/*  MODAL DE CONFIRMACIÓN DE SALIDA */}
      {showExitModal && (
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
                Tienes cambios sin guardar en el presupuesto. ¿Estás seguro de que quieres salir?
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
      )}
    </>
  );
};

export default PresupuestoModal;