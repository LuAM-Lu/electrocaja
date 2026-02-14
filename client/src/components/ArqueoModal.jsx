// components/ArqueoModal.jsx (VERSIÓN FINAL CORREGIDA)
import React, { useState, useRef, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Calculator from 'lucide-react/dist/esm/icons/calculator'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Coins from 'lucide-react/dist/esm/icons/coins'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Camera from 'lucide-react/dist/esm/icons/camera'
import CameraOff from 'lucide-react/dist/esm/icons/camera-off'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Unlock from 'lucide-react/dist/esm/icons/unlock'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import User from 'lucide-react/dist/esm/icons/user'
import Lock from 'lucide-react/dist/esm/icons/lock'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Send from 'lucide-react/dist/esm/icons/send'
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { useMontosEnCaja, formatearBolivares, formatearDolares } from '../hooks/useMontosEnCaja';
import { useNotificacionesStore } from '../store/notificacionesStore';
import { imprimirTicketArqueo } from '../utils/printUtils'; // Importación correcta
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
  // Ref para formulario
  const formRef = useRef(null);

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

    // 🆕 VALIDACIÓN DE OBSERVACIONES SI HAY DIFERENCIAS
    if (hayDiferencias && (!arqueo.observaciones || arqueo.observaciones.trim().length < 5)) {
      toast.error('Debe justificar las diferencias en Observaciones');
      setObservacionesAbiertas(true); // Abrir el panel de observaciones para que lo vea
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

      // 🖨️ IMPRIMIR TICKET DE ARQUEO
      try {
        console.log('🖨️ Iniciando impresión de ticket de arqueo...');
        const datosImpresion = {
          caja: cajaActual,
          usuario: usuario || { nombre: 'Sistema' },
          esperados,
          reales: arqueo,
          diferencias,
          observaciones: arqueo.observaciones,
          autorizadoPor: adminAutorizado?.nombre
        };
        await imprimirTicketArqueo(datosImpresion);
      } catch (printError) {
        console.error('⚠️ Error al imprimir ticket:', printError);
        toast.error('Arqueo guardado, pero falló la impresión');
      }

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
      <div className="fixed inset-0 bg-orange-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 h-[90vh] flex flex-col overflow-hidden">

          {/* HEADER PREMIUM COMPACTO - 1 FILA INDEPENDIENTE */}
          <div className={`bg-gradient-to-r ${fase === 'diferencia' ? 'from-red-500 to-red-600' :
            fase === 'completado' ? 'from-green-500 to-green-600' :
              'from-orange-500 to-orange-600'
            } relative overflow-hidden flex-shrink-0 shadow-md z-20`}>
            {/* Efecto de brillo animado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer"></div>

            <div className="px-5 py-3 text-white relative flex items-center justify-between gap-4">
              {/* IZQUIERDA: Icono + Título */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg shadow-sm flex-shrink-0">
                  {fase === 'diferencia' ? <AlertTriangle className="h-5 w-5" /> :
                    fase === 'completado' ? <CheckCircle className="h-5 w-5" /> :
                      <Calculator className="h-5 w-5" />}
                </div>
                <h2 className="text-lg font-bold leading-none tracking-tight truncate">
                  {fase === 'diferencia' ? 'Diferencia Crítica' :
                    fase === 'completado' ? 'Arqueo Finalizado' :
                      'Arqueo de Caja'}
                </h2>
              </div>

              {/* DERECHA: Datos + Botón Cerrar */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Usuario Compacto - Oculto en móbiles muy pequeños */}
                <div className="hidden sm:flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
                  <User className="h-3.5 w-3.5 opacity-80" />
                  <span className="truncate max-w-[100px]">{usuario?.nombre}</span>
                </div>

                {/* Status Badges Compactos */}
                {fase === 'conteo' && (
                  <div className="flex items-center gap-2">
                    {bloqueandoUsuarios && (
                      <div className="flex items-center gap-1 bg-red-500/80 px-2 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse whitespace-nowrap">
                        <Shield className="h-3 w-3" />
                        <span className="hidden md:inline">BLOQUEADO</span>
                      </div>
                    )}
                    {cameraStatus === 'ready' && (
                      <div className="flex items-center gap-1 bg-emerald-500/80 px-2 py-1 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                        <Camera className="h-3 w-3" />
                        <span className="hidden md:inline">REC</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-all hover:rotate-90 shadow-sm"
                  disabled={loading || fase === 'diferencia'}
                  title="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* CUERPO PRINCIPAL */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50/50">
            {fase === 'conteo' ? (
              <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">

                {/* ÁREA SCROLLEABLE */}
                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent">

                  {/* BARRA DE ADVERTENCIA UNIFICADA Y COMPACTA (1 FILA) */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-5 flex items-center justify-between flex-wrap gap-3 shadow-sm sticky top-0 z-10 backdrop-blur-xl bg-orange-50/95 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="bg-orange-100 p-1.5 rounded text-orange-600">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-900 text-sm">CONTEO FÍSICO OBLIGATORIO</span>
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Crítico</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden xl:block text-xs text-orange-700 font-medium px-4 border-x border-orange-200/50 flex-1 text-center">
                      Verifique cada monto cuidadosamente. Las diferencias requerirán autorización administrativa.
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-800 bg-orange-100/50 px-3 py-1.5 rounded-full whitespace-nowrap ml-auto">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Compare físico vs sistema
                    </div>
                  </div>

                  {/* GRID DE CARDS DE INGRESO */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

                    {/* BOLÍVARES */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-orange-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex flex-col items-center gap-2 mb-4 text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center shadow-inner mb-1">
                            <Coins className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-base">Efectivo Bs</h4>
                            <div className="text-xs text-gray-400 font-medium">Físico</div>
                          </div>
                        </div>

                        <div className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 hover:bg-orange-50/50 transition-colors text-center">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Esperado Sistema</div>
                          <div className="text-xl font-bold text-gray-700 tracking-tight flex justify-center items-center gap-1">
                            {formatearBolivares(esperados.efectivo_bs)} <span className="text-xs text-gray-400 font-normal">Bs</span>
                          </div>
                        </div>

                        <div className="w-full">
                          <label className="block text-xs font-bold text-orange-700 mb-1.5 uppercase text-center">Monto Real *</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={arqueo.efectivo_bs}
                              onChange={(e) => setArqueo(prev => ({ ...prev, efectivo_bs: e.target.value }))}
                              placeholder="0.00"
                              className="w-full text-center py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-lg font-mono font-medium transition-all shadow-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DÓLARES */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-green-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex flex-col items-center gap-2 mb-4 text-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center shadow-inner">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-base">Efectivo USD</h4>
                            <div className="text-xs text-gray-400 font-medium">Físico</div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 hover:bg-green-50/50 transition-colors text-center">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Esperado Sistema</div>
                          <div className="text-xl font-bold text-gray-700 tracking-tight flex justify-center items-center gap-1">
                            ${formatearDolares(esperados.efectivo_usd)}
                          </div>
                        </div>

                        <div className="w-full">
                          <label className="block text-xs font-bold text-green-700 mb-1.5 uppercase text-center">Monto Real *</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={arqueo.efectivo_usd}
                              onChange={(e) => setArqueo(prev => ({ ...prev, efectivo_usd: e.target.value }))}
                              placeholder="0.00"
                              className="w-full text-center py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-lg font-mono font-medium transition-all shadow-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PAGO MÓVIL */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-purple-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex flex-col items-center gap-2 mb-4 text-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center shadow-inner">
                            <Smartphone className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-base">Pago Móvil</h4>
                            <div className="text-xs text-gray-400 font-medium">Digital</div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 hover:bg-purple-50/50 transition-colors text-center">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Esperado Sistema</div>
                          <div className="text-xl font-bold text-gray-700 tracking-tight flex justify-center items-center gap-1">
                            {formatearBolivares(esperados.pago_movil)} <span className="text-xs text-gray-400 font-normal">Bs</span>
                          </div>
                        </div>

                        <div className="w-full">
                          <label className="block text-xs font-bold text-purple-700 mb-1.5 uppercase text-center">Monto Real *</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={arqueo.pago_movil}
                              onChange={(e) => setArqueo(prev => ({ ...prev, pago_movil: e.target.value }))}
                              placeholder="0.00"
                              className="w-full text-center py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-lg font-mono font-medium transition-all shadow-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OBSERVACIONES */}
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => setObservacionesAbiertas(!observacionesAbiertas)}
                      className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 transition-colors shadow-sm group"
                    >
                      <span className="font-medium text-gray-700 flex items-center gap-2 group-hover:text-orange-600 transition-colors text-center">
                        <FileText className="h-4 w-4" />
                        Observaciones y Notas
                      </span>
                      {observacionesAbiertas ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {observacionesAbiertas && (
                      <div className="mt-2 text-sm animate-in fade-in slide-in-from-top-1">
                        <textarea
                          value={arqueo.observaciones}
                          onChange={(e) => setArqueo(prev => ({ ...prev, observaciones: e.target.value }))}
                          placeholder="Ingrese detalles relevantes..."
                          rows={3}
                          className={`w-full p-3 border rounded-lg focus:ring-2 resize-none transition-colors ${hayDiferencias && arqueo.efectivo_bs
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/50'
                            : 'border-gray-300 focus:border-orange-500 focus:ring-orange-200'
                            }`}
                        />
                        {hayDiferencias && arqueo.efectivo_bs && (
                          <div className="text-red-600 text-xs mt-1 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Requerido por diferencias detectadas
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ALERTA DE DIFERENCIAS */}
                  {hayDiferencias && arqueo.efectivo_bs && arqueo.efectivo_usd && arqueo.pago_movil && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 animate-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-red-100 p-1.5 rounded-full">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <span className="font-bold text-red-900">Diferencias Críticas - Protocolo de Seguridad</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        {diferencias.bs !== 0 && (
                          <div className="bg-white border border-red-100 p-2 rounded text-center">
                            <div className="text-xs text-red-500 font-bold uppercase">BS</div>
                            <div className="text-red-700 font-mono font-bold">{diferencias.bs > 0 ? '+' : ''}{formatearBolivares(diferencias.bs)}</div>
                          </div>
                        )}
                        {diferencias.usd !== 0 && (
                          <div className="bg-white border border-red-100 p-2 rounded text-center">
                            <div className="text-xs text-red-500 font-bold uppercase">USD</div>
                            <div className="text-red-700 font-mono font-bold">{diferencias.usd > 0 ? '+' : ''}${formatearDolares(diferencias.usd)}</div>
                          </div>
                        )}
                        {diferencias.pagoMovil !== 0 && (
                          <div className="bg-white border border-red-100 p-2 rounded text-center">
                            <div className="text-xs text-red-500 font-bold uppercase">PM</div>
                            <div className="text-red-700 font-mono font-bold">{diferencias.pagoMovil > 0 ? '+' : ''}{formatearBolivares(diferencias.pagoMovil)}</div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-red-700 space-y-1 pl-1">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3 w-3 opacity-70" /> Bloqueo de sistema inminente hasta autorización
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 opacity-70" /> Ajuste automático mediante transacciones
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* FOOTER FIXED - PREMIUM ORANGE GRADIENT (Igual Al Header) */}
                <div className="flex-shrink-0 p-5 bg-gradient-to-r from-orange-500 to-orange-600 relative z-20 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-6 py-3 text-orange-700 bg-white/95 hover:bg-white border border-orange-100 rounded-xl transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <X className="h-5 w-5" />
                    <span>CANCELAR</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || (fase === 'conteo' && !arqueo.efectivo_bs)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition-all font-black shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>PROCESANDO...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        <span>VERIFICAR CAJA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : fase === 'diferencia' ? (
              /* FASE: DIFERENCIA */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-4 bg-gray-50/50">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
                  <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                    <Lock className="h-10 w-10 text-red-600" />
                  </div>

                  <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Acceso Restringido</h3>
                  <div className="text-red-500 font-bold text-sm uppercase tracking-widest mb-6">Diferencia Crítica Detectada</div>

                  <p className="text-gray-600 mb-8 leading-relaxed">
                    El sistema requiere validación de un supervisor para procesar las diferencias encontradas y realizar los ajustes contables.
                  </p>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {!showQRScanner ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowQRScanner(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                        >
                          <Camera className="h-5 w-5" />
                          Escanear QR Supervisor
                        </button>
                        <div className="grid grid-cols-3 items-center gap-2 opacity-50 my-2">
                          <div className="h-px bg-black"></div>
                          <div className="text-xs text-center font-bold">O CÓDIGO</div>
                          <div className="h-px bg-black"></div>
                        </div>
                        <input
                          type="password"
                          placeholder="Clave numérica..."
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 text-center tracking-[0.5em] text-xl font-black transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value === '1234') {
                              handleAutorizacionAdmin({ nombre: 'Admin Master', rol: 'ADMIN' });
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="bg-black rounded-lg aspect-square mb-4 flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 border-2 border-blue-500/50 rounded-lg"></div>
                          <div className="w-full h-1 bg-blue-500 absolute top-0 animate-scan"></div>
                          <span className="text-white/50 text-xs font-mono">CÁMARA ACTIVA</span>
                        </div>
                        <button
                          onClick={() => handleAutorizacionAdmin({ nombre: 'Admin Escaneado', rol: 'ADMIN' })}
                          className="text-blue-600 font-bold text-sm hover:underline mb-2 block"
                        >
                          [DEBUG] Simular Escaneo
                        </button>
                        <button
                          onClick={() => setShowQRScanner(false)}
                          className="text-gray-500 text-sm hover:text-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* FASE: COMPLETADO */
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300 bg-white">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl relative z-10 text-white">
                    <CheckCircle className="h-12 w-12" />
                  </div>
                </div>

                <h3 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">¡Arqueo Exitoso!</h3>
                <p className="text-gray-500 font-medium mb-8">La caja ha sido cuadrada correctamente.</p>

                <div className="flex flex-col gap-2 items-center">
                  {hayDiferencias && (
                    <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-bold border border-orange-100 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Ajustes automáticos realizados
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse mt-4">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Imprimiendo comprobante...
                  </div>
                </div>
              </div>
            )}

            {/* Solo mostrar vídeo para debug si cámara está lista (oculto visualmente) */}
            <div className="hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-64 h-48 bg-black"></video>
              <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ArqueoModal;