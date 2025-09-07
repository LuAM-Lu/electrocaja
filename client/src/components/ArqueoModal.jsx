// components/ArqueoModal.jsx (VERSIÓN FINAL CORREGIDA)
import React, { useState, useRef, useEffect } from 'react';
import { X, Calculator, DollarSign, Coins, Smartphone, AlertTriangle, CheckCircle, Camera, CameraOff, Shield, Calendar, Clock, Unlock, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { useMontosEnCaja, formatearBolivares, formatearDolares } from '../hooks/useMontosEnCaja';
import { useNotificacionesStore } from '../store/notificacionesStore';
import toast from 'react-hot-toast';
import { api } from '../config/api';

const ArqueoModal = ({ isOpen, onClose }) => {
  const { cajaActual, agregarTransaccion } = useCajaStore();
  const { usuario } = useAuthStore();
  const { emitirEvento } = useSocketEvents();
  const montosReales = useMontosEnCaja();
  const { addNotificacion } = useNotificacionesStore();

  // ===================================
  // 🔧 ESTADOS
  // ===================================
  const [loading, setLoading] = useState(false);
  const [fase, setFase] = useState('conteo'); // conteo, diferencia, autorizacion, completado
  const [bloqueandoUsuarios, setBloqueandoUsuarios] = useState(false);
  
  // Estados del arqueo (3 MONEDAS)
  const [arqueo, setArqueo] = useState({
    efectivo_bs: '',
    efectivo_usd: '',
    pago_movil: '',
    observaciones: ''
  });

  // Estados de autorización
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [adminAutorizado, setAdminAutorizado] = useState(null);
    // 🆕 Estados para observaciones desplegables
  const [observacionesAbiertas, setObservacionesAbiertas] = useState(false);

  // Estados de cámara (COPIADO DE ABRIRCAJAMODAL)
  const [cameraStatus, setCameraStatus] = useState('initializing');
  const [fotoEvidencia, setFotoEvidencia] = useState(null);
  
  // Refs para cámara
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ===================================
  // 📸 CÁMARA SILENCIOSA (COPIADO DE ABRIRCAJAMODAL)
  // ===================================
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
      bloquearUsuarios();
    }
    
    return () => {
      cleanupCamera();
      if (bloqueandoUsuarios) {
        desbloquearUsuarios();
      }
    };
  }, [isOpen]);

  const initializeCamera = async () => {
    try {
      setCameraStatus('initializing');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraStatus('ready');
        console.log('📸 Cámara inicializada silenciosamente para arqueo');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo acceder a la cámara:', error);
      setCameraStatus('error');
    }
  };

  const cleanupCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStatus('initializing');
  };

  const capturePhoto = async () => {
    return new Promise((resolve) => {
      try {
        if (cameraStatus !== 'ready' || !videoRef.current || !canvasRef.current) {
          console.warn('📸 Cámara no disponible para captura');
          resolve(null);
          return;
        }

        setCameraStatus('capturing');
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log('📸 Evidencia de arqueo capturada silenciosamente');
        setCameraStatus('ready');
        resolve(imageData);
        
      } catch (error) {
        console.error('❌ Error capturando evidencia:', error);
        setCameraStatus('error');
        resolve(null);
      }
    });
  };

  // ===================================
  // 🔒 FUNCIONES DE BLOQUEO (ESPECÍFICAS PARA ARQUEO)
  // ===================================
  const bloquearUsuarios = () => {
    setBloqueandoUsuarios(true);
    emitirEvento('bloquear_usuarios', {
      motivo: `Arqueo crítico en proceso por ${usuario?.nombre}`,
      usuario_cerrando: usuario?.nombre,
      timestamp: new Date().toISOString()
    });
    console.log('🔒 Usuarios bloqueados para arqueo crítico');
  };

  const bloquearPorDiferencia = (diferencias) => {
    emitirEvento('bloquear_usuarios_diferencia', {
      mensaje: 'Diferencia crítica en arqueo - Requiere autorización administrativa',
      diferencias: diferencias,
      usuario_cerrando: usuario?.nombre,
      timestamp: new Date().toISOString()
    });
    console.log('🚨 Usuarios bloqueados por diferencia crítica en arqueo');
  };

  const desbloquearUsuarios = () => {
    setBloqueandoUsuarios(false);
    emitirEvento('desbloquear_usuarios', {
      motivo: 'Arqueo cancelado por usuario',
      timestamp: new Date().toISOString()
    });
    console.log('🔓 Usuarios desbloqueados después del arqueo');
  };

  // ===================================
  // 🧮 CÁLCULOS (3 MONEDAS)
  // ===================================
  if (!isOpen || !cajaActual) return null;

 // ✅ USAR HOOK UNIFICADO - Montos esperados calculados reactivamente
  const esperados = {
    efectivo_bs: montosReales.efectivoBs,
    efectivo_usd: montosReales.efectivoUsd,
    pago_movil: montosReales.pagoMovil
  };;
  
  const calcularDiferencias = () => {
    const contadoBs = parseFloat(arqueo.efectivo_bs) || 0;
    const contadoUsd = parseFloat(arqueo.efectivo_usd) || 0;
    const contadoPagoMovil = parseFloat(arqueo.pago_movil) || 0;
    
    return {
      bs: contadoBs - esperados.efectivo_bs,
      usd: contadoUsd - esperados.efectivo_usd,
      pagoMovil: contadoPagoMovil - esperados.pago_movil
    };
  };

  const diferencias = calcularDiferencias();
  const hayDiferencias = Math.abs(diferencias.bs) > 0.01 || Math.abs(diferencias.usd) > 0.01 || Math.abs(diferencias.pagoMovil) > 0.01;

 // ✅ Usar función unificada del hook
  // ===================================
  // 🎯 MANEJADORES DE EVENTOS
  // ===================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!arqueo.efectivo_bs || !arqueo.efectivo_usd || !arqueo.pago_movil) {
      toast.error('Todos los conteos son obligatorios');
      return;
    }

    // 📸 Capturar evidencia fotográfica
    const evidencia = await capturePhoto();
    setFotoEvidencia(evidencia);

    if (hayDiferencias) {
      console.log('🚨 Diferencias críticas detectadas en arqueo:', diferencias);
      setFase('diferencia');
      bloquearPorDiferencia(diferencias);
      
      // Notificación crítica a todos los usuarios
      addNotificacion({
        tipo: 'diferencia_caja',
        titulo: '🚨 Diferencia crítica en arqueo',
        descripcion: `Diferencias detectadas por ${usuario?.nombre}: ${diferencias.bs !== 0 ? `${diferencias.bs > 0 ? '+' : ''}${formatearBolivares(diferencias.bs)} Bs` : ''} ${diferencias.usd !== 0 ? `${diferencias.usd > 0 ? '+' : ''}$${diferencias.usd.toFixed(2)}` : ''} ${diferencias.pagoMovil !== 0 ? `${diferencias.pagoMovil > 0 ? '+' : ''}${formatearBolivares(diferencias.pagoMovil)} Bs PM` : ''}`,
        accionable: false,
        datos: { diferencias, usuario: usuario?.nombre }
      });
    } else {
      // Sin diferencias - completar directamente
      await completarArqueo();
    }
  };

  const handleAutorizacionAdmin = async (tokenData) => {
    console.log('🛡️ Autorización admin recibida:', tokenData);
    setAdminAutorizado(tokenData);
    setShowQRScanner(false);
    setFase('completado');
    
    // Proceder con ajustes automáticos
    await registrarAjustes();
    await completarArqueo();
  };

  const registrarAjustes = async () => {
    try {
      let contadorId = Date.now();

      // Ajustes para Bolívares
      if (diferencias.bs > 0) {
        await agregarTransaccion({
          id: contadorId++,
          tipo: 'ingreso',
          categoria: 'Ajuste de Arqueo',
          observaciones: `Sobrante detectado en arqueo por ${usuario?.nombre}. Autorizado por: ${adminAutorizado?.nombre || 'Admin'}. Diferencia: +${formatearBolivares(diferencias.bs)} Bs`,
          total_bs: diferencias.bs,
          total_usd: 0,
          tasa_cambio_usada: 0,
          pagos: [{ metodo: 'efectivo', monto: diferencias.bs, moneda: 'bs' }]
        });
      }

      if (diferencias.bs < 0) {
        await agregarTransaccion({
          id: contadorId++,
          tipo: 'egreso',
          categoria: 'Ajuste de Arqueo',
          observaciones: `Faltante detectado en arqueo por ${usuario?.nombre}. Autorizado por: ${adminAutorizado?.nombre || 'Admin'}. Diferencia: ${formatearBolivares(diferencias.bs)} Bs`,
          total_bs: Math.abs(diferencias.bs),
          total_usd: 0,
          tasa_cambio_usada: 0,
          pagos: [{ metodo: 'efectivo', monto: Math.abs(diferencias.bs), moneda: 'bs' }]
        });
      }

      // Ajustes para USD
      if (diferencias.usd > 0) {
        await agregarTransaccion({
          id: contadorId++,
          tipo: 'ingreso',
          categoria: 'Ajuste de Arqueo',
          observaciones: `Sobrante USD detectado en arqueo por ${usuario?.nombre}. Autorizado por: ${adminAutorizado?.nombre || 'Admin'}. Diferencia: +$${diferencias.usd.toFixed(2)}`,
          total_bs: 0,
          total_usd: diferencias.usd,
          tasa_cambio_usada: 0,
          pagos: [{ metodo: 'efectivo', monto: diferencias.usd, moneda: 'usd' }]
        });
      }

      if (diferencias.usd < 0) {
        await agregarTransaccion({
          id: contadorId++,
          tipo: 'egreso',
          categoria: 'Ajuste de Arqueo',
          observaciones: `Faltante USD detectado en arqueo por ${usuario?.nombre}. Autorizado por: ${adminAutorizado?.nombre || 'Admin'}. Diferencia: $${diferencias.usd.toFixed(2)}`,
          total_bs: 0,
          total_usd: Math.abs(diferencias.usd),
          tasa_cambio_usada: 0,
          pagos: [{ metodo: 'efectivo', monto: Math.abs(diferencias.usd), moneda: 'usd' }]
        });
      }

      // Ajustes para Pago Móvil
      if (diferencias.pagoMovil > 0) {
        await agregarTransaccion({
          id: contadorId++,
          tipo: 'ingreso',
          categoria: 'Ajuste de Arqueo',
          observaciones: `Sobrante Pago Móvil detectado en arqueo por ${usuario?.nombre}. Autorizado por: ${adminAutorizado?.nombre || 'Admin'}. Diferencia: +${formatearBolivares(diferencias.pagoMovil)} Bs`,
          total_bs: diferencias.pagoMovil,
          total_usd: 0,
          tasa_cambio_usada: 0,
          pagos: [{ metodo: 'pago_movil', monto: diferencias.pagoMovil, moneda: 'bs' }]
        });
      }

      if (diferencias.pagoMovil < 0) {
        await agregarTransaccion({
          id: contadorId++,
          tipo: 'egreso',
          categoria: 'Ajuste de Arqueo',
          observaciones: `Faltante Pago Móvil detectado en arqueo por ${usuario?.nombre}. Autorizado por: ${adminAutorizado?.nombre || 'Admin'}. Diferencia: ${formatearBolivares(diferencias.pagoMovil)} Bs`,
          total_bs: Math.abs(diferencias.pagoMovil),
          total_usd: 0,
          tasa_cambio_usada: 0,
          pagos: [{ metodo: 'pago_movil', monto: Math.abs(diferencias.pagoMovil), moneda: 'bs' }]
        });
      }

      console.log('✅ Ajustes de arqueo registrados automáticamente');
    } catch (error) {
      console.error('❌ Error registrando ajustes:', error);
      toast.error('Error registrando ajustes automáticos');
    }
  };

  const completarArqueo = async () => {
    try {
      setLoading(true);

      // Enviar evidencia al backend si está disponible
      if (fotoEvidencia && cajaActual.id) {
        try {
          await api.post('/cajas/evidencia-fotografica', {
            caja_id: cajaActual.id,
            evento: 'arqueo',
            imagen_base64: fotoEvidencia,
            usuario_id: usuario?.id,
            diferencias: hayDiferencias ? diferencias : null,
            timestamp: new Date().toISOString()
          });
          console.log('📸 Evidencia de arqueo enviada al backend');
        } catch (error) {
          console.warn('⚠️ Error enviando evidencia:', error);
        }
      }

      // WhatsApp solo si hay diferencias importantes (opcional)
    if (hayDiferencias) {
      try {
        await enviarNotificacionWhatsApp();
      } catch (error) {
        console.warn('⚠️ Error en WhatsApp, continuando con arqueo...');
      }
    }

      // Notificación a todos los usuarios del sistema
      addNotificacion({
        tipo: 'arqueo_completado',
        titulo: '🧮 Arqueo completado',
        descripcion: `Arqueo realizado por ${usuario?.nombre}. ${hayDiferencias ? 'Con diferencias ajustadas automáticamente.' : 'Sin diferencias detectadas.'}`,
        accionable: false,
        datos: { usuario: usuario?.nombre, diferencias: hayDiferencias ? diferencias : null }
      });

      // Desbloquear usuarios
      desbloquearUsuarios();

      toast.success('✅ Arqueo completado exitosamente');
      
      setTimeout(() => {
        onClose();
        resetModal();
      }, 1500);

    } catch (error) {
      console.error('❌ Error completando arqueo:', error);
      toast.error('Error al completar arqueo');
      desbloquearUsuarios();
    } finally {
      setLoading(false);
    }
  };

  const enviarNotificacionWhatsApp = async () => {
  const mensajeWhatsApp = `ELECTRO CAJA - ARQUEO CRÍTICO

Fecha: ${new Date().toLocaleDateString('es-VE')}
Hora: ${new Date().toLocaleTimeString('es-VE')}
Usuario: ${usuario?.nombre}
Sucursal: ${usuario?.sucursal || 'Principal'}

DIFERENCIAS DETECTADAS:
${diferencias.bs !== 0 ? `Bolívares: ${diferencias.bs > 0 ? '+' : ''}${formatearBolivares(diferencias.bs)} Bs\n` : ''}${diferencias.usd !== 0 ? `Dólares: ${diferencias.usd > 0 ? '+' : ''}$${formatearDolares(diferencias.usd)}\n` : ''}${diferencias.pagoMovil !== 0 ? `Pago Móvil: ${diferencias.pagoMovil > 0 ? '+' : ''}${formatearBolivares(diferencias.pagoMovil)} Bs\n` : ''}
AUTORIZADO POR: ${adminAutorizado?.nombre || 'Admin'}
AJUSTES: Registrados automáticamente como transacciones

Evidencia fotográfica capturada automáticamente.

Notificación automática del sistema Electro Caja`;

  try {
    console.log('📱 Intentando enviar WhatsApp de arqueo...');
    await api.post('/whatsapp/enviar', {
      numero: '+584120552931',
      mensaje: mensajeWhatsApp
    });
    console.log('✅ Notificación WhatsApp de arqueo enviada');
    toast.success('WhatsApp enviado al supervisor');
  } catch (error) {
    console.warn('⚠️ WhatsApp no disponible:', error.message);
    toast.warning('Arqueo completado. WhatsApp no disponible.');
    // NO FALLAR - Solo log de advertencia
  }
};

  const resetModal = () => {
    setFase('conteo');
    setArqueo({ efectivo_bs: '', efectivo_usd: '', pago_movil: '', observaciones: '' });
    setAdminAutorizado(null);
    setFotoEvidencia(null);
    setBloqueandoUsuarios(false);
    // 🆕 LIMPIAR ESTADOS DE OBSERVACIONES
    setObservacionesAbiertas(false);
  };

  const handleClose = () => {
    if (loading || fase === 'diferencia') {
      toast.warning('No se puede cancelar durante el proceso de arqueo crítico');
      return;
    }
    
    desbloquearUsuarios();
    resetModal();
    onClose();
  };

  // ===================================
  // 🎨 RENDERIZADO
  // ===================================
  return (
    <>
      <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm modal-backdrop flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden max-h-[95vh] overflow-y-auto">
          
          {/* 🎨 HEADER ANIMADO (COPIADO DE ABRIRCAJAMODAL) */}
          <div className={`bg-gradient-to-r ${
            fase === 'diferencia' ? 'from-red-500 to-red-600' :
            fase === 'completado' ? 'from-green-500 to-green-600' :
            'from-orange-500 to-orange-600'
          } relative overflow-hidden`}>
            {/* Efecto de brillo */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer"></div>
            
            <div className="px-6 py-4 text-white relative">
              <div className="flex items-center">
              <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                    {fase === 'diferencia' ? <AlertTriangle className="h-6 w-6" /> :
                     fase === 'completado' ? <CheckCircle className="h-6 w-6" /> :
                     <Calculator className="h-6 w-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {fase === 'diferencia' ? '🚨 Diferencia Crítica Detectada' :
                       fase === 'completado' ? '✅ Arqueo Completado' :
                       '🧮 Arqueo Crítico de Caja'}
                    </h2>
                    <div className="text-sm text-orange-100 flex items-center justify-between">
                      <span>
                        {fase === 'diferencia' ? 'Requiere autorización administrativa inmediata' :
                        fase === 'completado' ? 'Proceso finalizado exitosamente' :
                        'Verificación completa de efectivo • Usuarios bloqueados'}
                      </span>
                      {fase === 'conteo' && (
                        <div className="flex items-center space-x-1">
                          {cameraStatus === 'ready' && (
                            <div className="flex items-center space-x-1 bg-green-500/20 text-green-200 px-2 py-0.5 rounded-full text-xs">
                              <Camera className="h-3 w-3" />
                              <span>Cámara conectada</span>
                            </div>
                          )}
                          {cameraStatus === 'error' && (
                            <div className="flex items-center space-x-1 bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full text-xs">
                              <CameraOff className="h-3 w-3" />
                              <span>Sin cámara</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Botón X eliminado - usar botón Cancelar en su lugar */}
              </div>
            </div>
          </div>

         {/* 👤 INFORMACIÓN COMPACTA DEL USUARIO */}
          <div className="bg-orange-50 border-b border-orange-100 px-6 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <span className="font-semibold text-orange-900">{usuario?.nombre || 'Usuario'}</span>
                  <span className="text-orange-600 ml-2">{usuario?.rol?.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-xs text-orange-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{cajaActual.fecha_apertura}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date().toLocaleTimeString('es-VE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
                {bloqueandoUsuarios && (
                  <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full">
                    <Shield className="h-3 w-3" />
                    <span>Bloqueado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 📄 CONTENIDO PRINCIPAL */}
          <div className="p-6">

            {/* 🔧 INDICADOR DE PROGRESO DEL ARQUEO */}
            {fase === 'conteo' && (
              <div className="bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 rounded-lg p-3 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-orange-800">Arqueo en Progreso</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-orange-600">
                    <Shield className="h-3 w-3" />
                    <span>Sistema bloqueado • Evidencia automática activa</span>
                  </div>
                </div>
              </div>
            )}

            {fase === 'conteo' && (
              <form onSubmit={handleSubmit}>
                
                {/* 💰 CONTEO CRÍTICO CON CARDS MEJORADAS */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 mb-6">
                  <h4 className="font-bold text-orange-900 mb-4 flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Conteo Físico Obligatorio
                    <span className="text-xs font-normal ml-2 bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                      Crítico
                    </span>
                  </h4>
                  <div className="text-sm text-orange-700 mb-4">
                    Verifique cada monto cuidadosamente. Las diferencias requerirán autorización administrativa.
                  </div>
                
                {/* 📊 RESUMEN COMPACTO ARQUEO */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 mb-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold text-orange-900 text-sm">Verificación completa obligatoria</span>
                    </div>
                    <div className="text-xs text-orange-600">Compare físicamente vs sistema</div>
                  </div>
                </div>

                {/* 💰 3 TARJETAS EN FILA */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  
                  {/* 💵 BOLÍVARES */}
                  <div className="bg-white border-2 border-orange-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Coins className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-orange-900 text-lg">Efectivo Bolívares</h4>
                        <p className="text-orange-600 text-sm">Conteo físico obligatorio</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <div className="text-sm text-orange-600 mb-1 font-medium">Esperado (Sistema)</div>
                        <div className="text-2xl font-bold text-orange-800">
                          {formatearBolivares(esperados.efectivo_bs)} Bs
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-orange-800 mb-2">
                          💵 Contado Físicamente *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={arqueo.efectivo_bs}
                          onChange={(e) => setArqueo(prev => ({ ...prev, efectivo_bs: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-mono"
                          required
                        />
                      </div>
                      
                      {arqueo.efectivo_bs && (
                      <div className="p-2 bg-orange-50 rounded text-sm text-orange-700 text-center">
                        Ingresado: {formatearBolivares(parseFloat(arqueo.efectivo_bs))} Bs
                      </div>
                    )}
                    </div>
                  </div>

                  {/* 💵 DÓLARES */}
                  <div className="bg-white border-2 border-green-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-green-900 text-lg">Efectivo Dólares</h4>
                        <p className="text-green-600 text-sm">Conteo físico obligatorio</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm text-green-600 mb-1 font-medium">Esperado (Sistema)</div>
                        <div className="text-2xl font-bold text-green-800">
                          ${formatearDolares(esperados.efectivo_usd)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-green-800 mb-2">
                          💵 Contado Físicamente *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={arqueo.efectivo_usd}
                          onChange={(e) => setArqueo(prev => ({ ...prev, efectivo_usd: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-mono"
                          required
                        />
                      </div>
                      
                      {arqueo.efectivo_usd && (
                        <div className="p-2 bg-green-50 rounded text-sm text-green-700 text-center">
                          Ingresado: ${formatearDolares(parseFloat(arqueo.efectivo_usd))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 📱 PAGO MÓVIL */}
                  <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-purple-900 text-lg">Pago Móvil</h4>
                        <p className="text-purple-600 text-sm">Conteo digital obligatorio</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-purple-600 mb-1 font-medium">Esperado (Sistema)</div>
                        <div className="text-2xl font-bold text-purple-800">
                          {formatearBolivares(esperados.pago_movil)} Bs
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-purple-800 mb-2">
                          📱 Contado Digitalmente *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={arqueo.pago_movil}
                          onChange={(e) => setArqueo(prev => ({ ...prev, pago_movil: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-mono"
                          required
                        />
                      </div>
                      
                      {arqueo.pago_movil && (
                          <div className="p-2 bg-purple-50 rounded text-sm text-purple-700 text-center">
                            Ingresado: {formatearBolivares(parseFloat(arqueo.pago_movil))} Bs
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* 📝 OBSERVACIONES DESPLEGABLES (ESTILO CERRAR CAJA) */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setObservacionesAbiertas(!observacionesAbiertas)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-medium text-slate-700">Observaciones del Arqueo</span>
                    {observacionesAbiertas ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                  
                  {observacionesAbiertas && (
                    <div className="mt-3 p-4 border border-slate-200 rounded-lg bg-white">
                      <textarea
                        value={arqueo.observaciones}
                        onChange={(e) => setArqueo(prev => ({ ...prev, observaciones: e.target.value }))}
                        placeholder={`Agregue observaciones sobre el arqueo realizado por ${usuario?.nombre}...`}
                        rows={3}
                        className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 resize-none text-sm transition-colors ${
                          hayDiferencias && arqueo.efectivo_bs && arqueo.efectivo_usd && arqueo.pago_movil
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                        }`}
                      />
                      <div className={`mt-2 text-xs ${
                        hayDiferencias && arqueo.efectivo_bs && arqueo.efectivo_usd && arqueo.pago_movil
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}>
                        {hayDiferencias && arqueo.efectivo_bs && arqueo.efectivo_usd && arqueo.pago_movil
                          ? '🚨 Las observaciones son importantes para el registro de ajustes automáticos.'
                          : 'Estas observaciones se incluirán en el registro del arqueo.'
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* 🚨 ALERTA DE DIFERENCIAS */}
                {hayDiferencias && arqueo.efectivo_bs && arqueo.efectivo_usd && arqueo.pago_movil && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                      <span className="font-bold text-red-800 text-lg">⚠️ Diferencias Críticas Detectadas</span>
                    </div>
                    <div className="space-y-2 text-sm text-red-700">
                      <div className="font-semibold">Se procederá con el protocolo de emergencia:</div>
                      <div className="bg-red-100 p-3 rounded-lg space-y-1">
                        {diferencias.bs !== 0 && (
                          <div>• Bolívares: {diferencias.bs > 0 ? 'SOBRANTE' : 'FALTANTE'} de {formatearBolivares(Math.abs(diferencias.bs))} Bs</div>
                        )}
                        {diferencias.usd !== 0 && (
                          <div>• Dólares: {diferencias.usd > 0 ? 'SOBRANTE' : 'FALTANTE'} de ${formatearDolares(Math.abs(diferencias.usd))}</div>
                        )}
                        {diferencias.pagoMovil !== 0 && (
                          <div>• Pago Móvil: {diferencias.pagoMovil > 0 ? 'SOBRANTE' : 'FALTANTE'} de {formatearBolivares(Math.abs(diferencias.pagoMovil))} Bs</div>
                        )}
                      </div>
                      <div className="text-xs text-red-600 mt-2 space-y-1">
                        <div>🔒 Al continuar, se bloqueará todo el sistema hasta recibir autorización administrativa</div>
                        <div>📝 Se registrarán ajustes automáticos como transacciones de ingreso/egreso</div>
                        <div>📱 Se enviará notificación WhatsApp crítica al supervisor</div>
                        <div>📸 Se capturará evidencia fotográfica automáticamente</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔘 BOTONES DE ACCIÓN */}
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 px-6 py-3 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !arqueo.efectivo_bs || !arqueo.efectivo_usd || !arqueo.pago_movil}
                    className={`flex-1 px-6 py-3 ${
                      hayDiferencias 
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                        : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                    } text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transform hover:scale-105`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Procesando...</span>
                      </div>
                    ) : hayDiferencias ? (
                      <div className="flex items-center justify-center space-x-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>🚨 Continuar con Diferencias Críticas</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Calculator className="h-4 w-4" />
                        <span>✅ Completar Arqueo Sin Diferencias</span>
                      </div>
                    )}
                  </button>
                </div>
                </div>
              </form>
            )}

            {/* 🚨 FASE: AUTORIZACIÓN REQUERIDA */}
            {fase === 'diferencia' && (
              <div className="text-center py-8">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto">
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-red-800 mb-4">
                    🚨 Sistema Bloqueado - Autorización Crítica Requerida
                  </h3>
                  <div className="text-red-700 mb-6 space-y-2">
                    <p className="font-semibold">Diferencias críticas detectadas en arqueo:</p>
                    <div className="bg-red-100 p-3 rounded-lg text-sm space-y-1">
                      {diferencias.bs !== 0 && (
                        <div>💵 Bolívares: {diferencias.bs > 0 ? '+' : ''}{formatearBolivares(diferencias.bs)} Bs</div>
                      )}
                      {diferencias.usd !== 0 && (
                        <div>💵 Dólares: {diferencias.usd > 0 ? '+' : ''}${diferencias.usd.toFixed(2)}</div>
                      )}
                      {diferencias.pagoMovil !== 0 && (
                        <div>📱 Pago Móvil: {diferencias.pagoMovil > 0 ? '+' : ''}{formatearBolivares(diferencias.pagoMovil)} Bs</div>
                      )}
                    </div>
                    <p className="text-xs mt-3">
                      🔒 Todo el sistema está bloqueado hasta completar la autorización administrativa
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <Shield className="h-5 w-5" />
                    <span>🛡️ Autorizar con Quick Access Token</span>
                  </button>
                </div>
              </div>
            )}

            {/* 🆕 CONFIRMACIÓN DE EVIDENCIA CAPTURADA */}
             {fotoEvidencia && fase === 'conteo' && (
               <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                 <div className="flex items-center space-x-3">
                   <Camera className="h-5 w-5 text-green-600" />
                   <div>
                     <div className="font-semibold text-green-800">✅ Evidencia Fotográfica Capturada</div>
                     <div className="text-sm text-green-700">Se ha registrado automáticamente la evidencia del arqueo</div>
                   </div>
                 </div>
               </div>
             )}

             {/* ✅ FASE: COMPLETADO */}
             {fase === 'completado' && (
              <div className="text-center py-8">
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 max-w-md mx-auto">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-800 mb-4">
                    ✅ Arqueo Crítico Completado Exitosamente
                  </h3>
                  <div className="text-green-700 mb-4 space-y-2">
                    <p>Arqueo realizado por: <span className="font-semibold">{usuario?.nombre}</span></p>
                    {hayDiferencias && (
                      <div className="bg-green-100 p-3 rounded-lg text-sm">
                        <p className="font-semibold mb-1">✅ Ajustes registrados automáticamente:</p>
                        {diferencias.bs !== 0 && (
                          <div>• {diferencias.bs > 0 ? 'Ingreso' : 'Egreso'} por {formatearBolivares(Math.abs(diferencias.bs))} Bs</div>
                        )}
                        {diferencias.usd !== 0 && (
                          <div>• {diferencias.usd > 0 ? 'Ingreso' : 'Egreso'} por ${formatearDolares(Math.abs(diferencias.usd))}</div>
                        )}
                        {diferencias.pagoMovil !== 0 && (
                          <div>• {diferencias.pagoMovil > 0 ? 'Ingreso' : 'Egreso'} por {formatearBolivares(Math.abs(diferencias.pagoMovil))} Bs PM</div>
                        )}
                        <p className="text-xs mt-2">🛡️ Autorizado por: {adminAutorizado?.nombre}</p>
                      </div>
                    )}
                    <p className="text-sm">
                      🔓 Sistema desbloqueado • 📸 Evidencia capturada • 📱 Notificaciones enviadas
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 🔧 SCANNER QR PARA AUTORIZACIÓN (INTEGRADO CON LOGINMODAL) */}
      {showQRScanner && (
        <QuickAccessAuthModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onSuccess={handleAutorizacionAdmin}
          title="🚨 Autorización Crítica para Diferencias en Arqueo"
          subtitle={`Diferencias: ${diferencias.bs !== 0 ? `${formatearBolivares(diferencias.bs)} Bs` : ''} ${diferencias.usd !== 0 ? `$${formatearDolares(diferencias.usd)}` : ''} ${diferencias.pagoMovil !== 0 ? `${formatearBolivares(diferencias.pagoMovil)} Bs PM` : ''}`}
        />
      )}

      {/* 📸 ELEMENTOS OCULTOS PARA CÁMARA */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* CSS PARA ANIMACIONES (COPIADO DE ABRIRCAJAMODAL) */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

// ===================================
// 🔧 COMPONENTE QUICK ACCESS AUTH (OPTIMIZADO)
// ===================================
const QuickAccessAuthModal = ({ isOpen, onClose, onSuccess, title, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

const handleQuickAccess = async (codigo = null) => {
  setLoading(true);
  setError('');

  if (!codigo) {
    const input = document.querySelector('input[placeholder*="Escanee"]');
    codigo = input?.value?.trim();
  }
  
  if (!codigo) {
    setError('Ingrese el código de autorización');
    setLoading(false);
    return;
  }

  console.log('🔧 Validando Quick Access Token...');

  try {
    // Usar fetch en lugar de axios para evitar interceptores
    const response = await fetch('https://localhost:3001/api/auth/validate-quick-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: codigo,
        accion: 'autorizar_arqueo'
      })
    });

    const data = await response.json();

    if (response.ok && data.success && data.user) {
      const user = data.user;
      
      if (user.rol === 'admin') {
        onSuccess({
          nombre: user.nombre,
          rol: user.rol,
          timestamp: new Date().toISOString(),
          metodo: 'quick_access_token',
          codigo: codigo
        });
      } else {
        setError('Solo administradores pueden autorizar arqueos con diferencias');
        const input = document.querySelector('input[placeholder*="Escanee"]');
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    } else {
      setError(data.message || 'Token de autorización inválido');
      const input = document.querySelector('input[placeholder*="Escanee"]');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  } catch (error) {
    console.error('❌ Error validando Quick Access Token:', error);
    setError('Error de conexión con el servidor');
    const input = document.querySelector('input[placeholder*="Escanee"]');
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  setLoading(false);
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="text-center mb-6">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
       
          <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Autorización (QR/Lector de Barras)
              </label>
              <input
                type="password"
                placeholder="Escanee el código QR o ingrese manualmente..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-center"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleQuickAccess(e.target.value.trim());
                  }
                }}
              />
              <div className="text-xs text-gray-500 mt-1">
                Presione Enter después de escanear o ingresar el código
              </div>
            </div>

        <div className="space-y-4">
          <button
            onClick={() => handleQuickAccess()}
            disabled={loading}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Shield className="h-5 w-5" />
            )}
            <span>{loading ? 'Procesando autorización...' : 'Autorizar con Código Ingresado'}</span>
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>⚠️ Esta operación requiere autorización administrativa</p>
          <p>El sistema permanecerá bloqueado hasta completar la autorización</p>
        </div>
      </div>
    </div>
  );
};

export default ArqueoModal;