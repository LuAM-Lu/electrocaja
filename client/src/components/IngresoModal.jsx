// components/IngresoModalV2.jsx - ESTRUCTURA BASE CON PESTAÑAS
import React, { useState, useEffect } from 'react';
import {
  X, ShoppingCart, User, Package, CreditCard, CheckCircle,
  AlertCircle, ArrowRight, ArrowLeft, Clock, DollarSign,
  Receipt, Send, FileText, Printer, Percent, AlertTriangle,
  Banknote, Star, Heart, Trash2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import { useInventarioStore } from '../store/inventarioStore';
import toast from 'react-hot-toast';
import ClienteSelector from './presupuesto/ClienteSelector';
import ItemsTable from './presupuesto/ItemsTable';
import PagosPanel from './venta/PagosPanel';
import FinalizarVentaPanel from './venta/FinalizarVentaPanel';
import { 
  generarPDFFactura, 
  generarImagenWhatsApp, 
  imprimirFacturaTermica,
  descargarPDF 
} from '../utils/printUtils'; // ✅ AGREGAR ESTA LÍNEA
import { api } from '../config/api'; // 🆕 IMPORTAR API BACKEND
//import { socket } from '../services/socket';


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
          toast.success(' Conexión restaurada', {
            duration: 2000,
            icon: '✅'
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
      <div className={`w-3 h-3 rounded-full transition-colors ${
        conectado ? 'bg-green-400' : 'bg-red-400 animate-pulse'
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Procesar Venta</h3>
        <div className="text-sm text-gray-500">
          Paso {currentIndex + 1} de {tabs.length}
        </div>
      </div>

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
               className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  !isAccessible
                    ? 'text-gray-400 cursor-not-allowed border border-gray-200 opacity-50 bg-gray-50'
                    : isActive
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                      : isCompleted
                        ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                        : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  !isAccessible
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
                  <div className="bg-gray-300 text-gray-500 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    🔒
                  </div>
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
  );
};

// 💰 MODAL DE DESCUENTO CON VALIDACIÓN ADMIN
const DescuentoAdminModal = ({ isOpen, onClose, totalVenta, tasaCambio, onDescuentoAprobado }) => {
  const { usuario } = useAuthStore();
  const [tipoDescuento, setTipoDescuento] = useState('porcentaje');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('bs');
  const [motivo, setMotivo] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsAdminValidation, setNeedsAdminValidation] = useState(true);
  const [isQRValidated, setIsQRValidated] = useState(false);

// Verificar si es admin al abrir y limpiar al cerrar
  useEffect(() => {
    if (isOpen && usuario?.rol === 'admin') {
      setNeedsAdminValidation(false);
      setIsQRValidated(true); // Admin no necesita validar QR
    } else if (isOpen) {
      setNeedsAdminValidation(true);
      setIsQRValidated(false); // No admin necesita validar QR primero
    } else if (!isOpen) {
      // Limpiar estados al cerrar
      setTipoDescuento('porcentaje');
      setMonto('');
      setMoneda('bs');
      setMotivo('');
      setAdminCode('');
      setLoading(false);
      setIsQRValidated(false);
      if (usuario?.rol !== 'admin') {
        setNeedsAdminValidation(true);
      }
    }
  }, [isOpen, usuario]);

  const handleValidateQR = async () => {
    if (!adminCode.trim()) {
      toast.error('Código QR requerido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users/login-by-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminCode.trim() })
      });

      const data = await response.json();

      if (!data.success || data.data.user.rol !== 'admin') {
        toast.error('Código de admin inválido');
        setLoading(false);
        return;
      }

      // QR válido - habilitar inputs
      setIsQRValidated(true);
      setNeedsAdminValidation(false);
      toast.success('✅ Código validado - Puede aplicar descuento');
    } catch (error) {
      toast.error('Error validando código de admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const montoDescuento = parseFloat(monto) || 0;
    if (montoDescuento <= 0) {
      toast.error('El descuento debe ser mayor a 0');
      return;
    }

    // Validar límites según tipo
    if (tipoDescuento === 'porcentaje' && montoDescuento > 70) {
      toast.error('El porcentaje máximo permitido es 70%');
      return;
    }

    // Calcular monto final en Bs
    let montoEnBs;
    if (tipoDescuento === 'porcentaje') {
      montoEnBs = (totalVenta * montoDescuento) / 100;
    } else {
      montoEnBs = moneda === 'bs' ? montoDescuento : montoDescuento * tasaCambio;
    }
    
    if (montoEnBs >= totalVenta) {
      toast.error('El descuento no puede ser mayor o igual al total de la venta');
      return;
    }

    if (!motivo.trim()) {
      toast.error('El motivo del descuento es obligatorio');
      return;
    }

    // Validar admin si es necesario
    if (needsAdminValidation) {
      setLoading(true);
      try {
        const response = await fetch('/api/users/login-by-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: adminCode.trim() })
        });

        const data = await response.json();

        if (!data.success || data.data.user.rol !== 'admin') {
          toast.error('Código de admin inválido');
          setLoading(false);
          return;
        }
      } catch (error) {
        toast.error('Error validando código de admin');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    onDescuentoAprobado(montoEnBs, motivo.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Percent className="h-5 w-5" />
              <h3 className="text-lg font-bold">Aplicar Descuento</h3>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-1 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Solo mostrar código QR si no está validado y no es admin */}
          {needsAdminValidation && !isQRValidated && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Autorización requerida:</strong> Escanee o ingrese el código QR de administrador para continuar.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código QR de Administrador *</label>
                <input
                      type="password"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!loading && adminCode.trim()) {
                            handleValidateQR();
                          }
                        }
                      }}
                      placeholder="Escanee o ingrese el código QR..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                      autoFocus
                    />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleValidateQR}
                  disabled={loading || !adminCode.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar Código</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Mostrar campos de descuento solo después de validación */}
          {isQRValidated && (
            <form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              onClick={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {/* Tipo de Descuento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Descuento</label>
                <select
                  value={tipoDescuento}
                  onChange={(e) => {
                    setTipoDescuento(e.target.value);
                    setMonto(''); // Limpiar monto al cambiar tipo
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  onMouseMove={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="porcentaje">📊 Porcentaje (%)</option>
                  <option value="monto">💰 Monto Fijo</option>
                </select>
              </div>

              {/* Monto/Porcentaje y Moneda */}
              <div className={tipoDescuento === 'porcentaje' ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tipoDescuento === 'porcentaje' ? 'Porcentaje' : 'Monto'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={tipoDescuento === 'porcentaje' ? '1' : '0.01'}
                      max={tipoDescuento === 'porcentaje' ? '70' : undefined}
                      min="0"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder={tipoDescuento === 'porcentaje' ? '0' : '0.00'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                    {tipoDescuento === 'porcentaje' && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {tipoDescuento !== 'porcentaje' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="bs">Bolívares (Bs)</option>
                      <option value="usd">Dólares ($)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Botones Rápidos de Porcentaje */}
              {tipoDescuento === 'porcentaje' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <label className="block text-xs font-medium text-purple-700 mb-2">Porcentajes Rápidos:</label>
                  <div className="flex space-x-2">
                    {[
                      { valor: 25, etiqueta: '75% Margen', descripcion: 'Desc. Leve' },
                      { valor: 50, etiqueta: '50% Margen', descripcion: 'Desc. Medio' },
                      { valor: 70, etiqueta: '30% Margen', descripcion: 'Efectivo' }
                    ].map(boton => (
                      <button
                        key={boton.valor}
                        type="button"
                        onClick={() => setMonto(boton.valor.toString())}
                        className={`flex-1 px-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                          monto === boton.valor.toString()
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold">{boton.etiqueta}</div>
                          <div className="text-xs opacity-75">{boton.descripcion}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del descuento *</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Cliente frecuente, promoción especial..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  rows="2"
                  required
                />
                
                {/* Botones Rápidos de Motivo */}
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Motivos Frecuentes:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icono: Banknote, texto: 'Pago Rápido', color: 'text-green-600' },
                      { icono: Star, texto: 'Cliente Especial', color: 'text-yellow-600' },
                      { icono: Heart, texto: 'Cliente Leal', color: 'text-red-600' }
                    ].map((motivoRapido, index) => {
                      const IconoComponente = motivoRapido.icono;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setMotivo(motivoRapido.texto)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg text-center transition-colors flex items-center justify-center space-x-2 ${
                            motivo === motivoRapido.texto
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50 hover:border-purple-300'
                          }`}
                        >
                          <IconoComponente className={`h-4 w-4 ${
                            motivo === motivoRapido.texto ? 'text-white' : motivoRapido.color
                          }`} />
                          <span>{motivoRapido.texto}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Botón para limpiar motivo */}
                  {motivo && (
                    <button
                      type="button"
                      onClick={() => setMotivo('')}
                      className="mt-2 w-full px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Limpiar y escribir personalizado</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Vista Previa Mejorada */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">📋 Vista Previa del Descuento</h4>
                <div className="space-y-1 text-sm text-purple-700">
                  <div className="flex justify-between">
                    <span>Total venta:</span>
                    <span className="font-medium">{formatearVenezolano(totalVenta)} Bs</span>
                  </div>
                  {monto && parseFloat(monto) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Descuento:</span>
                        <span className="font-medium text-purple-800">
                          {tipoDescuento === 'porcentaje' 
                            ? `Margen final: ${100 - parseFloat(monto)}% = ${formatearVenezolano(
                                totalVenta - (totalVenta / 2) * (1 + (100 - parseFloat(monto)) / 100)
                              )} Bs descuento`
                            : `${formatearVenezolano(moneda === 'bs' ? parseFloat(monto) : parseFloat(monto) * tasaCambio)} Bs`
                          }
                        </span>
                      </div>
                      <hr className="border-purple-300" />
                      <div className="flex justify-between font-bold">
                        <span>Total final:</span>
                        <span className="text-purple-900">
                          {formatearVenezolano(
                            totalVenta - (tipoDescuento === 'porcentaje' 
                              ? (totalVenta * parseFloat(monto)) / 100
                              : (moneda === 'bs' ? parseFloat(monto) : parseFloat(monto) * tasaCambio)
                            )
                          )} Bs
                        </span>
                      </div>
                    </>
                  )}
                  {(!monto || parseFloat(monto) === 0) && (
                    <p className="text-purple-600 italic text-center py-2">
                      Ingresa un {tipoDescuento === 'porcentaje' ? 'porcentaje' : 'monto'} para ver la vista previa
                    </p>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Aplicar Descuento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// 🎯 COMPONENTE PRINCIPAL
const IngresoModalV2 = ({ isOpen, onClose, emitirEvento }) => {
  const { usuario } = useAuthStore();
  
  // 🆕 HOOK PARA SOCKET (MEJORADO)
  const [socket, setSocket] = useState(null);
  const [socketLoading, setSocketLoading] = useState(false);
  
  useEffect(() => {
    // Inicializar socket cuando el modal se abre
    if (isOpen && !socket && !socketLoading) {
      setSocketLoading(true);
      import('../services/socket').then(socketModule => {
        console.log('🔍 Módulo socket cargado:', Object.keys(socketModule));
        
        // Obtener socket existente o inicializar si no existe
        let socketInstance = socketModule.getSocket();
        
        if (!socketInstance) {
          console.log('🔧 Socket no inicializado, inicializando...');
          const token = localStorage.getItem('auth-token');
          if (token) {
            socketInstance = socketModule.initializeSocket(token);
          } else {
            console.warn('⚠️ No hay token disponible para inicializar socket');
            return;
          }
        }
        
        console.log('🔍 Socket obtenido:', socketInstance);
        console.log('🔍 Socket tiene .on?', typeof socketInstance?.on);
        
        if (socketInstance && typeof socketInstance.on === 'function') {
          setSocket(socketInstance);
          console.log('✅ Socket configurado correctamente');
        } else {
          console.error('❌ Socket inválido después de inicialización');
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
  console.log('🔑 SESIÓN ID GENERADO:', id);
  window.modalSesionId = id; // Para debugging
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

  // 🎈 ESTADOS PARA BURBUJA DE CONFLICTOS DE STOCK
  const [showStockConflictsModal, setShowStockConflictsModal] = useState(false);
  const [stockConflicts, setStockConflicts] = useState([]);

  // 🧹 ESTADO PARA AUTO-LIMPIEZA INTELIGENTE
  const [totalAnterior, setTotalAnterior] = useState(0);
  const [hayPagosConfigurados, setHayPagosConfigurados] = useState(false);

// 🆕 ESTADO PARA VALIDACIÓN DE PAGOS DESDE PAGOSPANEL
  const [pagosValidos, setPagosValidos] = useState(false);
  const [itemsDisponibles, setItemsDisponibles] = useState(false);

  const [excesoPendiente, setExcesoPendiente] = useState(0);

  const handlePagosValidationChange = (esValido, exceso = 0) => {
  console.log('🔍 PagosPanel validation:', esValido, 'Exceso:', exceso); // Debug
  setPagosValidos(esValido);
  setExcesoPendiente(exceso);
};

  const handleItemsValidationChange = (tieneItems) => {
    console.log('🔍 Items disponibles:', tieneItems); // Debug
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
      const codigo = generarCodigoVenta();
      setCodigoVenta(codigo);
    } else {
  // 🧹 LIMPIAR RESERVAS AL CERRAR MODAL SIN GUARDAR
  console.log('🚪 MODAL CERRADO - useEffect cleanup');
  const limpiarReservasAlCerrar = async () => {
    console.log('🧹 Limpiando reservas al cerrar modal...');
    if (ventaData.items.length > 0) {
      try {
        for (const item of ventaData.items) {
          if (item.productoId) {
            console.log('🔓 Liberando al cerrar:', item.descripcion);
            await liberarStockAPI(item.productoId, sesionId);
          }
        }
        console.log('✅ Reservas liberadas al cerrar modal');
      } catch (error) {
        console.error('❌ Error liberando reservas al cerrar modal:', error);
      }
    }
  };
  
  limpiarReservasAlCerrar();
}
  }, [isOpen]);

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
    
    console.log('🔍 Configurando eventos AFK...');
    
    const handleModalAFK = (data) => {
      console.log('🚨 Modal cerrado por AFK:', data);
      
      // Mostrar notificación al usuario
      toast.error(data.message, {
        duration: 8000,
        icon: '⏰',
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

// ✅ ESCUCHAR EVENTOS DE SINCRONIZACIÓN
  const handleVentaProcesada = (data) => {
    console.log('📡 Venta procesada por otro usuario:', data);
    
    // 🔧 NO RECARGAR SI ES NUESTRA PROPIA VENTA
    const esNuestraVenta = data.venta?.codigoVenta === codigoVenta || 
                          data.venta?.sesionId === sesionId;
    
    if (esNuestraVenta) {
      console.log('📡 Es nuestra propia venta - NO recargar');
      return;
    }
    
    // Solo recargar si es venta de otro usuario y estamos en dashboard
    if (window.location.pathname === '/') {
      console.log('📡 Venta de otro usuario - Actualizando dashboard');
      window.location.reload();
    }
  };

  const handleInventarioActualizado = (data) => {
    console.log('📦 Inventario actualizado:', data);
    // Actualizar store de inventario sin recargar
    import('../store/inventarioStore').then(({ useInventarioStore }) => {
      useInventarioStore.getState().obtenerInventario();
    });
  };

  socket.on('venta_procesada', handleVentaProcesada);
  socket.on('inventario_actualizado', handleInventarioActualizado);
    
    socket.on('cerrar_modal_venta_afk', handleModalAFK);
    
    // Cleanup
    return () => {
      socket.off('cerrar_modal_venta_afk', handleModalAFK);
        socket.off('venta_procesada', handleVentaProcesada);
        socket.off('inventario_actualizado', handleInventarioActualizado);
    };
  }, [isOpen, socket]);

  // 🔄 RE-VALIDACIÓN AL RECONECTAR (PARA MÓVILES)
  useEffect(() => {
    if (!isOpen || !socket || typeof socket.on !== 'function') return;
    
    console.log('🔍 Configurando eventos de reconexión...');
    
    const handleReconexion = () => {
      console.log('🔄 Socket reconectado - Verificando estado del modal...');
      
      // Solo re-validar si estamos en pestañas que requieren stock reservado
      if (activeTab === 'pagos' || activeTab === 'finalizar') {
        console.log('📱 Re-validando reservas después de reconexión...');
        revalidarReservasAlReconectar();
      }
    };
    
    const handleStockLiberado = (data) => {
      console.log('📡 Stock liberado por desconexión de otro usuario:', data);
      
      // Mostrar notificación discreta de que hay stock disponible
      toast.success(` Stock disponible: ${data.productos.join(', ')}`, {
        duration: 4000,
        icon: '📦',
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
      console.log('🔄 Re-validando stock después de reconexión...');
      
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
        console.log('✅ Re-validación exitosa - Stock reservado nuevamente');
        toast.success(' Conexión restaurada - Stock reservado', {
          duration: 3000,
          icon: '📱'
        });
      }
      
    } catch (error) {
      console.error('❌ Error en re-validación:', error);
      
      if (error.response?.status === 409 && error.response?.data?.errors) {
        // Stock no disponible - mostrar opciones
        toast.warning(' Algunos productos ya no están disponibles', {
          duration: 5000,
          icon: '⚠️'
        });
        
        // Opcional: Mostrar burbuja de conflictos
        const conflictos = Array.isArray(error.response.data.errors) 
        ? error.response.data.errors 
        : Object.values(error.response.data.errors || {});
        mostrarBurbujaConflictos(conflictos);
      } else {
        toast.error('❌ Error al reconectar - Verifica tu venta', {
          duration: 4000
        });
      }
    }
  };


  // 💓 HEARTBEAT PARA MANTENER RESERVAS VIVAS (USUARIO ACTIVO)
  useEffect(() => {
    if (!isOpen || !socket || activeTab === 'cliente' || activeTab === 'items') return;
    console.log('🔍 Configurando heartbeat...');
    
    // Solo enviar heartbeat en pestañas PAGOS y FINALIZAR
    const heartbeatInterval = setInterval(() => {
      // Verificar que el usuario sigue activo (mouse/teclado)
      const ultimaActividad = Date.now() - (window.lastActivity || Date.now());
      
      if (ultimaActividad < 3 * 60 * 1000) { // Activo en últimos 3 minutos
        console.log('💓 Enviando heartbeat para mantener reservas...');
        
        // Llamar endpoint para renovar reservas
        api.post('/ventas/stock/heartbeat', { 
          sesionId: sesionId 
        }).catch(error => {
          console.warn('⚠️ Error en heartbeat:', error);
        });
      }
    }, 2 * 60 * 1000); // Cada 2 minutos
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isOpen, activeTab, sesionId, socket]);

 // 🎯 DETECTAR ACTIVIDAD DEL USUARIO
  useEffect(() => {
    if (!isOpen) return; // Solo verificar isOpen, no necesita socket
    
    console.log('🔍 Configurando detección de actividad...');
    
    console.log('🔍 Configurando indicador de conexión...');
    
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


 // 🔄 VALIDACIONES AUTOMÁTICAS CON DEPENDENCIAS (ACTUALIZADO PARA RESERVAS EN "SIGUIENTE")
  useEffect(() => {
  const tieneCliente = !!ventaData.cliente; // Cliente obligatorio
  const tieneItems = ventaData.items.length > 0;
  const tieneItemsConCantidad = ventaData.items.some(item => item.cantidad > 0);
  const pagosCompletos = pagosValidos; // Viene de PagosPanel
  
  console.log('🔍 Validaciones:', { tieneCliente, tieneItems, tieneItemsConCantidad, pagosCompletos }); // Debug
  
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
  
    console.log('🔍 Nuevas validaciones:', nuevasValidaciones); // Debug
  console.log('🔍 Accesibilidad por pestaña:', {
    cliente: nuevasValidaciones.cliente.accesible,
    items: nuevasValidaciones.items.accesible,
    pagos: nuevasValidaciones.pagos.accesible,
    finalizar: nuevasValidaciones.finalizar.accesible
  });
  setValidaciones(nuevasValidaciones);
}, [ventaData.cliente, ventaData.items, ventaData.totalBs, opcionesProcesamiento, descuento, activeTab, pagosValidos]);

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
  console.log('🔄 ===== HANDLE ITEMS CHANGE =====');
  console.log('🔄 Items recibidos:', items.length);
  console.log('🔄 Items anteriores:', ventaData.items.length);
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
    
    toast.success(' Pagos limpiados - Total de venta cambió', {
      duration: 4000,
      icon: '🧹'
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
        toast(` Stock liberado: ${itemAnterior.descripcion}`, {
          icon: '🔓',
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
            toast(` Stock ajustado: ${item.descripcion}\n💡 Disponible: ${stockDisponible} unidades`, {
              icon: '⚠️',
              duration: 4000,
              style: {
                background: '#ffffffff',
                border: '1px solid #F59E0B',
                color: '#92400E'
              }
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
          toast.error(`❌ Error consultando stock de ${item.descripcion}`);
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
    console.log('📋 ===== VALIDACIÓN SIN RESERVAS =====');
    console.log('📋 Items validados:', itemsValidados.length);
    console.log('📋 Reservas se harán al hacer "Siguiente"');

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
 console.log('🔄 ===== FIN HANDLE ITEMS CHANGE =====');
  
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
        toast.success(' Venta guardada en espera exitosamente', {
          duration: 4000,
          icon: '💾'
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


const confirmarProcesamiento = () => {
  const opcionesActivas = Object.entries(opcionesProcesamiento)
    .filter(([key, value]) => value)
    .map(([key]) => {
      switch(key) {
        case 'imprimirRecibo': return '📄 Generar PDF';
        case 'generarFactura': return '🖨️ Imprimir factura';
        case 'enviarWhatsApp': return '📱 Enviar WhatsApp';
        case 'enviarEmail': return '📧 Enviar Email';
        default: return key;
      }
    });

  const mensaje = opcionesActivas.length > 0 
    ? `¿Procesar venta y ejecutar estas opciones?\n\n${opcionesActivas.join('\n')}`
    : '¿Procesar venta?';

  return window.confirm(mensaje);
};

const handleProcesarVenta = async () => {
  console.log('🚀 ===== INICIANDO PROCESAMIENTO DE VENTA =====');
  console.log('🔍 Opciones seleccionadas:', opcionesProcesamiento);
  console.log('🔍 Cliente:', ventaData.cliente);
  console.log('🔍 Items:', ventaData.items.length);
  console.log('🔍 Total venta:', ventaData.totalBs, 'Bs');
  
  setLoading(true);

  // ✅ CAPTURAR USUARIO ACTUAL AL MOMENTO DEL PROCESAMIENTO
  const ventaDataConUsuario = {
    ...ventaData,
    usuario: usuario // Usuario de la sesión que procesa la venta
  };

  console.log('👤 Usuario que procesa la venta:', usuario?.nombre);

  try {
   // ✅ CALCULAR TOTALES ANTES DE ENVIAR
    const { totales } = validarYCalcularTotales(ventaData, descuento, tasaCambio);
    
    if (!totales) {
      toast.error('❌ Error calculando totales de la venta');
      setLoading(false);
      return;
    }

    // 🚀 PROCESAR VENTA CON API BACKEND - AGREGANDO TOTALES CALCULADOS
    const ventaParaEnviar = {
      clienteId: ventaData.cliente?.id || null,
      clienteNombre: ventaData.cliente?.nombre || null,
      items: ventaData.items.map(item => ({
        productoId: item.productoId || null,
        descripcion: item.descripcion,
        codigoBarras: item.codigo,
        cantidad: item.cantidad,
        precioUnitario: item.precio_unitario,
        precioCosto: item.precio_costo || 0,
        descuento: item.descuento || 0
      })),
      pagos: ventaData.pagos.filter(pago => pago.monto && parseFloat(pago.monto) > 0).map(pago => {
        const metodoInfo = METODOS_PAGO.find(m => m.value === pago.metodo);
        return {
          metodo: pago.metodo,
          monto: Math.round(parseFloat(pago.monto) * 100) / 100,
          moneda: metodoInfo?.moneda || 'bs',
          banco: pago.banco || null,
          referencia: pago.referencia || null
        };
      }),
      vueltos: ventaData.vueltos.filter(vuelto => vuelto.monto && parseFloat(vuelto.monto) > 0).map(vuelto => {
  const metodoInfo = METODOS_PAGO.find(m => m.value === vuelto.metodo);
  const montoNumerico = parseFloat(vuelto.monto.replace(',', '.')) || 0;
  console.log('🔍 VUELTO ENVIADO AL BACKEND:', {
    metodo: vuelto.metodo,
    montoOriginal: vuelto.monto,
    montoNumerico: montoNumerico,
    moneda: metodoInfo?.moneda
  });
  return {
    metodo: vuelto.metodo,
    monto: montoNumerico,
    moneda: metodoInfo?.moneda || 'bs',
    banco: vuelto.banco || null,
    referencia: vuelto.referencia || null
  };
}),
     // ✅ AGREGAR TOTALES CALCULADOS PARA SINCRONIZAR CON BACKEND
      subtotalUsd: totales.subtotalUsd,
      subtotalBs: totales.subtotalBs,
      totalBs: totales.totalAPagar,
      totalUsd: totales.totalUsd,
     
      // ✅ DEBUG: Verificar que el descuento se está pasando correctamente
      descuentoTotal: (() => {
        console.log('🔍 DESCUENTO DEBUG:', {
          descuentoVariable: descuento,
          descuentoEnVentaData: ventaData.descuentoAutorizado,
          motivoDescuento: ventaData.motivoDescuento,
          tasaCambio: tasaCambio
        });
        return ventaData.descuentoAutorizado || descuento || 0;
      })(),
      observaciones: ventaData.observaciones || `Venta procesada con código ${codigoVenta}`,
      tasaCambio: tasaCambio,
      sesionId: sesionId,
      opcionesProcesamiento: opcionesProcesamiento
    };

    console.log('📊 TOTALES CALCULADOS ENVIADOS:', {
      subtotalUsd: totales.subtotalUsd,
      subtotalBs: totales.subtotalBs,
      totalBs: totales.totalAPagar,
      totalUsd: totales.totalUsd,
      descuento: descuento,
      tasaCambio: tasaCambio
    });

    // ✅ DEBUG: Ver exactamente qué se envía al backend
    console.log('🚀 DATOS COMPLETOS ENVIADOS AL BACKEND:', JSON.stringify(ventaParaEnviar, null, 2));

    // Llamar API de procesamiento de venta
    const response = await api.post('/ventas/procesar', ventaParaEnviar);
    
    let ventaProcesada = null;

    if (response.data.success) {
      ventaProcesada = response.data.data;
      console.log('✅ Venta procesada exitosamente:', ventaProcesada);
    } else {
      throw new Error(response.data.message || 'Error procesando venta');
    }

    // 🎯 EJECUTAR OPCIONES SELECCIONADAS DESPUÉS DEL PROCESAMIENTO
    const opcionesEjecutadas = [];
    let erroresOpciones = [];

    // 📄 GENERAR PDF (si está seleccionado)
    if (opcionesProcesamiento.imprimirRecibo) {
      try {
        console.log('📄 Ejecutando: Generar PDF...');
        toast.loading('📄 Generando PDF...', { id: 'pdf-process' });
        
        await descargarPDF(ventaDataConUsuario, ventaProcesada?.codigoVenta || codigoVenta, tasaCambio, descuento);
        
        opcionesEjecutadas.push('📄 PDF descargado');
        toast.success('📄 PDF generado', { id: 'pdf-process' });
      } catch (error) {
        console.error('❌ Error generando PDF:', error);
        erroresOpciones.push('PDF falló');
        toast.error('❌ Error generando PDF', { id: 'pdf-process' });
      }
    }
      // 🖨️ IMPRIMIR FACTURA TÉRMICA (si está seleccionado)
      if (opcionesProcesamiento.generarFactura) {
        try {
          console.log('🖨️ ===== INICIANDO IMPRESIÓN TÉRMICA =====');
          console.log('🖨️ Código venta:', ventaProcesada?.codigoVenta || codigoVenta);
          
          toast.loading('🖨️ Preparando impresión...', { id: 'print-process' });
          
          // 🛡️ ESPERAR UN POCO PARA EVITAR CONFLICTOS CON OTRAS OPERACIONES
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          toast.loading('🖨️ Abriendo ventana de impresión...', { id: 'print-process' });
          
         const resultadoImpresion = await imprimirFacturaTermica(
          ventaDataConUsuario, 
          ventaProcesada?.codigoVenta || codigoVenta, 
          tasaCambio, 
          descuento
        );
          
          console.log('✅ Resultado impresión:', resultadoImpresion);
          
          opcionesEjecutadas.push('🖨️ Enviado a impresora térmica');
          toast.success('🖨️ Impresión completada', { id: 'print-process' });
          
        } catch (error) {
          console.error('❌ ===== ERROR IMPRESIÓN =====');
          console.error('❌ Error:', error.message);
          console.error('❌ ========================');
          
          erroresOpciones.push('Impresión falló');
          
          if (error.message.includes('bloqueada')) {
            toast.error('⚠️ Popup bloqueado. Habilita popups para esta página', { 
              id: 'print-process',
              duration: 8000 
            });
          } else {
            toast.error(`❌ Error de impresión: ${error.message}`, { 
              id: 'print-process',
              duration: 6000 
            });
          }
        }
      }

    // 📱 ENVIAR WHATSAPP (si está seleccionado) - USANDO FUNCIÓN DE FINALIZARVENTA
    if (opcionesProcesamiento.enviarWhatsApp && ventaData.cliente?.telefono) {
      try {
        console.log('📱 Ejecutando: Enviar WhatsApp desde IngresoModal...');
        console.log('📱 Cliente:', ventaData.cliente.nombre, 'Tel:', ventaData.cliente.telefono);
        console.log('📱 Código venta:', ventaProcesada?.codigoVenta || codigoVenta);
        
        toast.loading('📱 Enviando WhatsApp...', { id: 'whatsapp-process' });
        
        const imagenBase64 = await generarImagenWhatsApp(ventaDataConUsuario, ventaProcesada?.codigoVenta || codigoVenta, tasaCambio, descuento);
        
        console.log('📱 Imagen generada, tamaño:', Math.round(imagenBase64.length / 1024), 'KB');
        
        const whatsappResponse = await api.post('/whatsapp/enviar-factura', {
          numero: ventaData.cliente.telefono,
          clienteNombre: ventaData.cliente.nombre,
          codigoVenta: ventaProcesada?.codigoVenta || codigoVenta,
          imagen: imagenBase64,
          mensaje: `Hola ${ventaData.cliente.nombre || 'Cliente'}, aquí tienes tu comprobante de compra #${ventaProcesada?.codigoVenta || codigoVenta}. ¡Gracias por tu Compra! 🚀`
        });
        
        console.log('📱 Respuesta API WhatsApp:', whatsappResponse.data);
        
        if (whatsappResponse.data.success) {
          console.log('✅ WhatsApp enviado exitosamente');
          
          if (whatsappResponse.data.data?.tipo_fallback === 'simple_sin_imagen') {
            opcionesEjecutadas.push('📱 WhatsApp enviado (sin imagen)');
            toast.success('📱 WhatsApp enviado (sin imagen)', { id: 'whatsapp-process' });
          } else if (whatsappResponse.data.data?.fallback) {
            opcionesEjecutadas.push('📱 WhatsApp enviado (texto)');
            toast.success('📱 WhatsApp enviado (solo texto)', { id: 'whatsapp-process' });
          } else {
            opcionesEjecutadas.push('📱 WhatsApp con imagen enviado');
            toast.success('📱 WhatsApp con imagen enviado', { id: 'whatsapp-process' });
          }
        } else {
          console.error('❌ Respuesta fallida de API WhatsApp:', whatsappResponse.data);
          throw new Error(whatsappResponse.data.message || 'Error enviando WhatsApp');
        }
      } catch (error) {
        console.error('❌ ===== ERROR WHATSAPP DETALLADO =====');
        console.error('❌ Error completo:', error);
        console.error('❌ Error response:', error.response?.data);
        console.error('❌ Status:', error.response?.status);
        console.error('❌ ===================================');
        
        erroresOpciones.push('WhatsApp falló');
        
        const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
        toast.error(`❌ Error WhatsApp: ${errorMsg}`, { id: 'whatsapp-process' });
      }
    } else {
      console.log('⚠️ WhatsApp NO ejecutado:', {
        opcionActivada: opcionesProcesamiento.enviarWhatsApp,
        clienteTelefono: ventaData.cliente?.telefono,
        cliente: ventaData.cliente
      });
    }

    // 📧 ENVIAR EMAIL (si está seleccionado)
    if (opcionesProcesamiento.enviarEmail && ventaData.cliente?.email) {
      try {
        console.log('📧 Ejecutando: Enviar Email...');
        toast.loading('📧 Enviando email...', { id: 'email-process' });
        
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
          asunto: `Comprobante #${ventaProcesada?.codigoVenta || codigoVenta} - Electro Shop Morandín`,
          mensaje: `Estimado(a) ${ventaData.cliente.nombre || 'Cliente'},\n\nAdjunto encontrará su comprobante de compra #${ventaProcesada?.codigoVenta || codigoVenta}.\n\nGracias por su compra.\n\nSaludos cordiales,\nElectro Shop Morandín C.A.`
        });
        
        if (emailResponse.data.success) {
          opcionesEjecutadas.push('📧 Email enviado');
          toast.success('📧 Email enviado', { id: 'email-process' });
        } else {
          throw new Error('Error enviando email');
        }
      } catch (error) {
        console.error('❌ Error enviando email:', error);
        erroresOpciones.push('Email falló');
        toast.error('❌ Error enviando email', { id: 'email-process' });
      }
    }

    // 🎯 MOSTRAR RESULTADO FINAL
    let mensajeFinal = '✅ Venta procesada exitosamente';
    
    if (opcionesEjecutadas.length > 0) {
      mensajeFinal += `\n\n✅ Completado:\n${opcionesEjecutadas.join('\n')}`;
    }
    
    if (erroresOpciones.length > 0) {
      mensajeFinal += `\n\n⚠️ Con errores:\n${erroresOpciones.join(', ')}`;
    }

    toast.success(mensajeFinal, {
      duration: 8000,
      icon: '🚀',
      style: {
        maxWidth: '400px'
      }
    });
    
    // ✅ VENTA PROCESADA - LIMPIAR PARA NUEVA VENTA PERO NO CERRAR
    console.log('✅ ===== VENTA PROCESADA EXITOSAMENTE =====');
    console.log('✅ Opciones ejecutadas:', opcionesEjecutadas);
    console.log('✅ Errores (si los hay):', erroresOpciones);
    
    // 🎉 MOSTRAR RESULTADO FINAL SIN CERRAR MODAL
    toast.success(' ¡Venta procesada exitosamente!\n\n' + mensajeFinal, {
      duration: 50000, // 10 segundos para que vea el resultado
      icon: '🚀',
      style: {
        maxWidth: '450px',
        fontSize: '14px'
      }
    });
    
    // 🔄 LIMPIAR PARA NUEVA VENTA (SIN CERRAR MODAL)
    console.log('🔄 Limpiando formulario para nueva venta...');
    
    // Limpiar venta actual
    setVentaData({
      cliente: null, // 🔧 FORZAR SELECCIÓN DE NUEVO CLIENTE
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
    setActiveTab('cliente'); // Volver a selección de cliente
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
      generarFactura: true // Mantener factura por defecto
    });
    
    console.log('✅ Modal listo para nueva venta');
    
    // 🚪 CERRAR MODAL AUTOMÁTICAMENTE DESPUÉS DE 5 SEGUNDOS
    setTimeout(() => {
      console.log('🚪 Cerrando modal automáticamente después de venta exitosa');
      onClose();
    }, 1000);


    } catch (error) {
      console.error('❌ Error procesando venta:', error);
      toast.error(`❌ Error al procesar venta: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

// 🚪 MANEJADORES DE SALIDA
const handleCancelar = async () => {
  console.log('🚫 BOTÓN CANCELAR PRESIONADO');
  
  // SIEMPRE liberar reservas, independiente de hasUnsavedChanges
  if (hasUnsavedChanges) {
    setShowExitModal(true);
  } else {
    console.log('🚫 Sin cambios, liberando directamente...');
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
  console.log('🧹 ===== INICIANDO LIMPIEZA OPTIMIZADA =====');
  console.log('🧹 SesionId a limpiar:', sesionId);
  
  // 🆕 LIBERACIÓN MASIVA POR SESIÓN (MÁS EFICIENTE)
  try {
    await liberarStockAPI(null, sesionId); // null = liberar toda la sesión
    console.log('✅ Liberación masiva completada exitosamente');
    
    // No mostrar toast si es cierre automático por AFK
    const esLimpiezaManual = !document.querySelector('[data-afk-cleanup]');
    if (esLimpiezaManual) {
      toast.success(`🔓 Reservas liberadas para sesión`);
    }
  } catch (error) {
    console.error('❌ Error en liberación masiva:', error);
    
    // 🔄 FALLBACK: Liberación individual
    const itemsConReserva = ventaData.items.filter(item => 
      item.productoId && !item.esPersonalizado && item.cantidad > 0
    );
    
    if (itemsConReserva.length > 0) {
      console.log('🔄 Fallback: liberación individual de', itemsConReserva.length, 'items');
      for (const item of itemsConReserva) {
        try {
          await liberarStockAPI(item.productoId, sesionId);
        } catch (error) {
          console.error(`❌ Error liberando ${item.descripcion}:`, error);
        }
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
    toast.success('🗑️ Venta cancelada y limpiada');
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
        toast.success(`🔒 Stock reservado: ${response.data.data.reservadosExitosamente} productos`);
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
      toast.error(`❌ Error al reservar stock: ${error.response?.data?.message || error.message}`);
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
      toast.success(`🔓 Stock liberado: ${itemsConReserva.length} productos`);
      
    } catch (error) {
      console.error('❌ Error liberando stock al retroceder:', error);
      // Aún así permitir navegación
      setActiveTab('items');
      toast.warning('⚠️ Navegación permitida, pero revisa las reservas');
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
    toast.success(`✅ Cantidad ajustada a ${nuevaCantidad} unidades`);
  };

  // 🗑️ RESOLVER CONFLICTO: ELIMINAR PRODUCTO
  const resolverEliminarProducto = (productoId) => {
    const updatedItems = ventaData.items.filter(item => item.productoId !== productoId);
    setVentaData(prev => ({ ...prev, items: updatedItems }));
    toast.success('🗑️ Producto eliminado del carrito');
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/* 🎯 MODAL CON ALTURA FIJA */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden h-[90vh] flex flex-col">

          {/* 🎨 HEADER ELEGANTE (FIJO) */}
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
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Nueva Venta #{codigoVenta}</h1>
                    <p className="text-emerald-100 text-sm">
                      Sistema de punto de venta - {usuario?.nombre || 'Usuario'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Indicador de cambios */}
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2 bg-orange-500/20 px-3 py-2 rounded-lg">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Cambios sin guardar</span>
                    </div>
                  )}

                  {/* Indicador de conexión */}
                  <div className="flex items-center space-x-3">
                    <ConexionIndicador socket={socket} />
                    
                    {/* Total rápido */}
                    <div className="text-right">
                      <div className="text-emerald-100 text-xs">Total</div>
                      <div className="text-xl font-bold">
                        {ventaData.totalBs.toLocaleString('es-ES', { 
                          minimumFractionDigits: 2 
                        })} Bs
                      </div>
                    </div>
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
              <p className="text-sm text-amber-700">
                ⚠️ Debes seleccionar un cliente para continuar
                <br />
                💡 Busca un cliente existente o crea uno nuevo
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}

            {activeTab === 'items' && (
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
)}

            {activeTab === 'pagos' && (
  <PagosPanel
  pagos={ventaData.pagos}
  vueltos={ventaData.vueltos}
  onPagosChange={handlePagosChange}
  totalVenta={ventaData.totalBs}
  tasaCambio={tasaCambio}
  title="Métodos de Pago de la Venta"
  descuento={descuento}
  onDescuentoChange={() => setShowDescuentoModal(true)}
  onDescuentoLimpiar={() => {
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
      toast.success('🧹 Pagos limpiados - Descuento eliminado');
    } else {
      toast.success('🗑️ Descuento eliminado');
    }
    setDescuento(0);
  }}
  onValidationChange={handlePagosValidationChange}
/>
)}

            {activeTab === 'finalizar' && (
                <FinalizarVentaPanel
                ventaData={ventaData}
                opcionesProcesamiento={opcionesProcesamiento}
                onOpcionesChange={handleOpcionesChange}
                loading={loading}
                codigoVenta={sesionId.slice(-6)} // Últimos 6 caracteres como código
                descuento={descuento}
                tasaCambio={tasaCambio}
              />
              )}

          </div>

          {/* 🎮 BOTONES DE NAVEGACIÓN (FIJOS) */}
          <div className="flex-shrink-0 bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              
              {/* Botón Anterior (oculto en Cliente) */}
                {activeTab !== 'cliente' && (
                  <button
                    onClick={() => handleNavigateTab('prev')}
                    disabled={!canGoPrev}
                    className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </button>
                )}

              {/* Botones de acción centrales */}
              <div className="flex items-center space-x-3">
                
                {/* Cancelar */}
                <button
                  onClick={handleCancelar}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>

                {/* Guardar en espera */}
                <button
                  onClick={handleGuardarEnEspera}
                  disabled={ventaData.items.length === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="h-4 w-4" />
                  <span>Guardar en Espera</span>
                </button>

                    {/* Procesar venta (solo en última pestaña) */}
                    {activeTab === 'finalizar' && (
                      <button
                        onClick={() => {
                            if (confirmarProcesamiento()) {
                              handleProcesarVenta();
                            }
                          }}
                        disabled={loading || !allValid || !ventaValida}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          ventaValida && allValid && !loading
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-gray-400 text-white cursor-not-allowed'
                        }`}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Procesando venta y ejecutando opciones...</span>
                          </>
                        ) : !ventaValida ? (
                          <>
                            <AlertTriangle className="h-4 w-4" />
                            <span>Datos Incompletos</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>
                              Procesar Venta
                              {Object.values(opcionesProcesamiento).filter(Boolean).length > 0 && (
                                <span className="ml-1 text-xs bg-white/20 px-1 rounded">
                                  +{Object.values(opcionesProcesamiento).filter(Boolean).length} opciones
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </button>
                    )}
              </div>

             {/* Botón Siguiente (oculto en Finalizar) */}
              {activeTab !== 'finalizar' && (
                <button
                  onClick={() => handleNavigateTab('next')}
                  disabled={!canGoNext || !validaciones[activeTab]?.valido}
                  className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

      </div>
      </div>

      {/* 🚨 MODAL DE CONFIRMACIÓN DE SALIDA */}
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
      )}




    {/* 💰 MODAL DE DESCUENTO CON VALIDACIÓN ADMIN */}
      {showDescuentoModal && (
        <DescuentoAdminModal
          isOpen={showDescuentoModal}
          onClose={() => setShowDescuentoModal(false)}
          totalVenta={ventaData.totalBs}
          tasaCambio={tasaCambio}
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
            toast.success(`🧹 Pagos limpiados - Se aplicó descuento de ${formatearVenezolano(montoDescuento)} Bs`);
          } else {
            setVentaData(prev => ({
              ...prev,
              descuentoAutorizado: montoDescuento,
              motivoDescuento: motivoDescuento
            }));
            toast.success(`✅ Descuento de ${formatearVenezolano(montoDescuento)} Bs aplicado`);
          }
          setShowDescuentoModal(false);
        }}
        />
      )}

      {/* 🎈 MODAL DE CONFLICTOS DE STOCK */}
      {showStockConflictsModal && (
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
      )}
    </>
  );
};

export default IngresoModalV2;