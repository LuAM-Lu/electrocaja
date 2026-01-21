// components/CerrarCajaModal.jsx (VERSIÓN CORREGIDA COMPLETA - BUGS CRÍTICOS SOLUCIONADOS)
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Lock, User, Calendar, Clock, Printer, AlertTriangle,
  DollarSign, Coins, Smartphone, ChevronDown, ChevronUp,
  TrendingUp, Shield, Eye, Camera, CameraOff, MessageCircle,
  FileText, Send, CheckCircle, Loader, Banknote, CreditCard,
  Download, Check
} from 'lucide-react';
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { useMontosEnCaja, formatearBolivares, formatearDolares } from '../hooks/useMontosEnCaja';
import toast from 'react-hot-toast';
import { api } from '../config/api';

// 🔥 FUNCIÓN MEJORADA PARA SANITIZAR INPUT (BUG #1 SOLUCIONADO)
const sanitizarNumero = (value) => {
  if (!value) return '';

  let sanitized = value.toString();

  // 🚫 ELIMINAR CARACTERES NO VÁLIDOS (incluyendo el guión -)
  sanitized = sanitized.replace(/[^\d.,]/g, '');

  // 🔄 CONVERTIR PUNTO A COMA (separador decimal español)
  sanitized = sanitized.replace(/\./g, ',');

  // ✅ SOLO PERMITIR UNA COMA DECIMAL
  const parts = sanitized.split(',');
  if (parts.length > 2) {
    sanitized = parts[0] + ',' + parts.slice(1).join('');
  }

  // 📏 LIMITAR LONGITUD MÁXIMA
  if (sanitized.length > 15) {
    sanitized = sanitized.substring(0, 15);
  }

  return sanitized;
};

// 🔥 FUNCIÓN PARA CONVERTIR COMA A PUNTO PARA CÁLCULOS (BUG #1 SOLUCIONADO)
const convertirANumero = (valorConComa) => {
  if (!valorConComa) return 0;
  return parseFloat(valorConComa.replace(',', '.')) || 0;
};

// Modal CEO sin cambios
const ModalCEO = ({ isOpen, diferencias, onAutorizar, usuarioActual }) => {
  const [claveCEO, setClaveCEO] = useState('');
  const [loading, setLoading] = useState(false);
  const [intentosFallidos, setIntentosFallidos] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (claveCEO === '1234') {
      setLoading(true);
      // 🔇 Toast eliminado - el modal de progreso mostrará el estado

      setTimeout(() => {
        onAutorizar();
        setClaveCEO('');
        setLoading(false);
        setIntentosFallidos(0);
      }, 500);
    } else {
      toast.error('Clave incorrecta');
      setIntentosFallidos(prev => prev + 1);
      setClaveCEO('');
    }
  };

  const formatearDiferencias = () => {
    const diferenciasTexto = [];

    if (diferencias?.bs !== 0) {
      const tipo = diferencias.bs > 0 ? 'SOBRANTE' : 'FALTANTE';
      const monto = formatearBolivares(Math.abs(diferencias.bs));
      diferenciasTexto.push(`${tipo}: ${monto} Bs`);
    }

    if (diferencias?.usd !== 0) {
      const tipo = diferencias.usd > 0 ? 'SOBRANTE' : 'FALTANTE';
      const monto = formatearDolares(Math.abs(diferencias.usd));
      diferenciasTexto.push(`${tipo}: $${monto}`);
    }

    if (diferencias?.pagoMovil !== 0) {
      const tipo = diferencias.pagoMovil > 0 ? 'SOBRANTE' : 'FALTANTE';
      const monto = formatearBolivares(Math.abs(diferencias.pagoMovil));
      diferenciasTexto.push(`${tipo}: ${monto} Bs PM`);
    }

    return diferenciasTexto;
  };

  if (!isOpen) return null;

  const diferenciasFormateadas = formatearDiferencias();

  return (
    <div className="fixed inset-0 bg-red-500/40 backdrop-blur-md flex items-center justify-center z-[70]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-xl">
          <div className="flex items-center space-x-3 text-white">
            <Shield className="h-6 w-6" />
            <div>
              <h3 className="text-lg font-bold">Autorización CEO Requerida</h3>
              <p className="text-sm text-red-100">Diferencia detectada en caja</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-red-800 mb-2">Diferencias Encontradas:</h4>
            <div className="space-y-1 text-sm">
              {diferenciasFormateadas.map((diff, index) => (
                <div key={index} className="text-red-700">
                  • {diff}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="text-lg font-bold text-gray-900 mb-2">
              Comunicarse con el CEO
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              Andrés Morandín
            </div>
            <div className="text-sm text-gray-600">
              Se requiere autorización para proceder con el cierre
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave de Autorización CEO:
              </label>
              <input
                type="password"
                value={claveCEO}
                onChange={(e) => setClaveCEO(e.target.value)}
                placeholder="Ingrese la clave..."
                className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-lg font-mono"
                autoFocus
                required
              />

              {intentosFallidos > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  Intentos fallidos: {intentosFallidos}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading || !claveCEO}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Autorizando...</span>
                  </span>
                ) : (
                  'Autorizar Cierre'
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-xs text-gray-500">
            <p>Sistema en espera de autorización</p>
            <p>No se puede cancelar hasta ingresar la clave correcta</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal de progreso de cierre MEJORADO
const ModalProgresoCierre = ({ isOpen, pasoActual, pasos, mensajePaso }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[80]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="text-center">
          <div className="mb-4">
            <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-4">Procesando Cierre</h3>

          {/* Mensaje dinámico del paso actual */}
          {mensajePaso && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm font-medium text-blue-800">
                {mensajePaso}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {pasos.map((paso, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${index < pasoActual ? 'bg-green-500 text-white' :
                  index === pasoActual ? 'bg-blue-500 text-white animate-pulse' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                  {index < pasoActual ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : index === pasoActual ? (
                    <Loader className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className={`text-sm ${index <= pasoActual ? 'text-gray-900 font-medium' : 'text-gray-400'
                  }`}>
                  {paso}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Por favor espere, no cierre esta ventana
          </div>
        </div>
      </div>
    </div>
  );
};

const CerrarCajaModal = ({ isOpen, onClose, cajaPendiente = null }) => {
  const { cerrarCaja, cajaActual, loading } = useCajaStore();
  const montosReales = useMontosEnCaja();
  const { usuario, tienePermiso } = useAuthStore();
  const { emitirEvento } = useSocketEvents();

  // Estados del formulario con sanitización MEJORADA
  const [montoFinalBs, setMontoFinalBs] = useState('');
  const [montoFinalUsd, setMontoFinalUsd] = useState('');
  const [montoFinalPagoMovil, setMontoFinalPagoMovil] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [observacionesAbiertas, setObservacionesAbiertas] = useState(false);

  // Estados del sistema
  const [bloqueandoUsuarios, setBloqueandoUsuarios] = useState(false);
  const [showModalCEO, setShowModalCEO] = useState(false);
  const [diferenciasCalculadas, setDiferenciasCalculadas] = useState(null);
  const [ceoAutorizado, setCeoAutorizado] = useState(false);

  // Estados de progreso MEJORADOS
  const [showProgreso, setShowProgreso] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);
  const [mensajePaso, setMensajePaso] = useState('');
  const pasos = [
    'Validando datos',
    'Generando PDF',
    'Enviando WhatsApp',
    'Capturando evidencia',
    'Cerrando caja',
    'Finalizando'
  ];

  // Referencias para cámara
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState('initializing');
  const [fotoEvidencia, setFotoEvidencia] = useState(null);

  const cajaParaCerrar = cajaPendiente ? {
    ...cajaPendiente,
    monto_inicial_bs: 0,
    monto_inicial_usd: 0,
    monto_inicial_pago_movil: 0,
    total_ingresos_bs: 0,
    total_egresos_bs: 0,
    total_ingresos_usd: 0,
    total_egresos_usd: 0,
    total_pago_movil: 0
  } : cajaActual;

  const esCajaPendiente = !!cajaPendiente;

  // 🔥 HANDLERS MEJORADOS PARA INPUTS (BUG #1 SOLUCIONADO)
  const handleMontoChange = (setter) => (e) => {
    const valorSanitizado = sanitizarNumero(e.target.value);
    setter(valorSanitizado);
  };

  useEffect(() => {
    if (isOpen && !bloqueandoUsuarios) {
      setBloqueandoUsuarios(true);
      initializeCamera();

      emitirEvento('bloquear_usuarios', {
        motivo: 'Cierre de caja en proceso',
        usuario_cerrando: usuario?.nombre,
        timestamp: new Date().toISOString()
      });

      // 🔇 Toast eliminado - el modal de progreso muestra el estado del cierre
    }

    return () => {
      cleanupCamera();
      if (bloqueandoUsuarios) {
        emitirEvento('desbloquear_usuarios', {
          motivo: 'Cierre de caja cancelado/completado',
          timestamp: new Date().toISOString()
        });
        setBloqueandoUsuarios(false);
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
        console.log('Cámara inicializada silenciosamente para cierre');
      }
    } catch (error) {
      console.warn('No se pudo acceder a la cámara:', error);
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
          console.warn('Cámara no disponible para captura');
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

        console.log('Evidencia de cierre capturada silenciosamente');
        setCameraStatus('ready');
        resolve(imageData);

      } catch (error) {
        console.error('Error capturando evidencia de cierre:', error);
        setCameraStatus('error');
        resolve(null);
      }
    });
  };

  if (!isOpen || !cajaActual) return null;

  const resumen = {
    transacciones: montosReales.transaccionesTotales,
    inicialBs: montosReales.montosIniciales.efectivoBs,
    ingresosBs: montosReales.ingresosBs,
    egresosBs: montosReales.egresosBs,
    balanceBs: montosReales.balanceBs,
    esperadoBs: montosReales.efectivoBs,

    inicialUsd: montosReales.montosIniciales.efectivoUsd,
    ingresosUsd: montosReales.ingresosUsd,
    egresosUsd: montosReales.egresosUsd,
    balanceUsd: montosReales.balanceUsd,
    esperadoUsd: montosReales.efectivoUsd,

    inicialPagoMovil: montosReales.montosIniciales.pagoMovil,
    totalPagoMovil: montosReales.ingresosPagoMovil,
    egresosPagoMovil: montosReales.egresosPagoMovil || 0,
    esperadoPagoMovil: montosReales.pagoMovil
  };

  // 🔥 CALCULAR DIFERENCIAS CON TOLERANCIA DE PUNTO FLOTANTE (BUG +0.00/-0.00 SOLUCIONADO)
  const TOLERANCIA_REDONDEO = 0.005; // Medio centavo de tolerancia

  const calcularDiferencias = () => {
    const contadoBs = convertirANumero(montoFinalBs);
    const contadoUsd = convertirANumero(montoFinalUsd);
    const contadoPagoMovil = convertirANumero(montoFinalPagoMovil);

    // Calcular diferencias con redondeo a 2 decimales
    let difBs = Math.round((contadoBs - resumen.esperadoBs) * 100) / 100;
    let difUsd = Math.round((contadoUsd - resumen.esperadoUsd) * 100) / 100;
    let difPagoMovil = Math.round((contadoPagoMovil - resumen.esperadoPagoMovil) * 100) / 100;

    // Si la diferencia es menor a la tolerancia, considerarla como 0
    if (Math.abs(difBs) < TOLERANCIA_REDONDEO) difBs = 0;
    if (Math.abs(difUsd) < TOLERANCIA_REDONDEO) difUsd = 0;
    if (Math.abs(difPagoMovil) < TOLERANCIA_REDONDEO) difPagoMovil = 0;

    return {
      bs: difBs,
      usd: difUsd,
      pagoMovil: difPagoMovil
    };
  };

  // 🔥 FUNCIÓN MEJORADA PARA GENERAR OBSERVACIÓN AUTOMÁTICA (BUG #2 SOLUCIONADO)
  const generarObservacionAutomatica = (diferencias, hayDiferencias) => {
    const fechaActual = new Date().toLocaleDateString('es-VE');
    const horaActual = new Date().toLocaleTimeString('es-VE');
    const usuarioNombre = usuario?.nombre?.toUpperCase() || 'USUARIO';

    let observacionAuto = '';

    if (hayDiferencias) {
      // Si hay diferencias, generar observación detallada
      const diferenciasTexto = [];

      if (diferencias.bs !== 0) {
        const tipo = diferencias.bs > 0 ? 'SOBRANTE' : 'FALTANTE';
        const monto = formatearBolivares(Math.abs(diferencias.bs));
        diferenciasTexto.push(`${tipo}: ${monto} Bs`);
      }

      if (diferencias.usd !== 0) {
        const tipo = diferencias.usd > 0 ? 'SOBRANTE' : 'FALTANTE';
        const monto = formatearDolares(Math.abs(diferencias.usd));
        diferenciasTexto.push(`${tipo}: $${monto}`);
      }

      if (diferencias.pagoMovil !== 0) {
        const tipo = diferencias.pagoMovil > 0 ? 'SOBRANTE' : 'FALTANTE';
        const monto = formatearBolivares(Math.abs(diferencias.pagoMovil));
        diferenciasTexto.push(`${tipo}: ${monto} Bs PM`);
      }

      observacionAuto = `AUTORIZADO POR CEO ANDRÉS MORANDÍN - ${diferenciasTexto.join(', ')} - Usuario: ${usuarioNombre} - Fecha: ${fechaActual} - Hora: ${horaActual}`;
    } else {
      // Si no hay diferencias, observación estándar
      observacionAuto = `CIERRE EJECUTADO - Sin diferencias detectadas - Usuario: ${usuarioNombre} - Fecha: ${fechaActual} - Hora: ${horaActual}`;
    }

    return observacionAuto;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!montoFinalBs || !montoFinalUsd || !montoFinalPagoMovil) {
      toast.error('Todos los conteos finales son obligatorios');
      return;
    }

    const diferencias = calcularDiferencias();
    const hayDiferencias = diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0;

    if (hayDiferencias && !ceoAutorizado) {
      console.log('Diferencias detectadas:', diferencias);
      setDiferenciasCalculadas(diferencias);
      setShowModalCEO(true);

      emitirEvento('bloquear_usuarios_diferencia', {
        mensaje: 'Esperando autorización CEO Andrés Morandín',
        diferencias: diferencias,
        usuario_cerrando: usuario?.nombre,
        timestamp: new Date().toISOString()
      });

      return;
    }

    await procederConCierre();
  };

  // 🔥 FUNCIÓN PROCEDERCONCIERRE CORREGIDA (BUG #3 Y #4 SOLUCIONADOS)
  const procederConCierre = async () => {
    try {
      setShowProgreso(true);
      setPasoActual(0);

      // Paso 0: Validando datos
      setMensajePaso('Verificando conteos y diferencias...');
      console.log('🔍 Validando datos para cierre...');
      await new Promise(resolve => setTimeout(resolve, 1200));

      setPasoActual(1);

      // Paso 1: Generar PDF
      setMensajePaso('Creando reporte PDF con diferencias...');
      console.log('📄 Generando PDF de cierre...');
      let pdfGenerado = false;
      let pdfInfo = null;

      try {
        pdfInfo = await generarPDFConDiferencias();
        pdfGenerado = true;
        console.log('PDF generado exitosamente');

        // 🔥 DESCARGAR PDF LOCALMENTE INMEDIATAMENTE
        if (pdfInfo?.pdfBase64) {
          try {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${pdfInfo.pdfBase64}`;
            link.download = pdfInfo.nombreArchivo || `cierre-caja-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('PDF descargado localmente:', pdfInfo.nombreArchivo);
          } catch (downloadError) {
            console.warn('Error descargando PDF:', downloadError);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (pdfError) {
        console.warn('Error con PDF:', pdfError);
      }

      setPasoActual(2);

      // Paso 2: Enviar WhatsApp
      setMensajePaso('Enviando reporte por WhatsApp...');
      console.log('📱 Enviando por WhatsApp...');

      try {
        if (pdfInfo && pdfInfo.rutaPDF) {
          await enviarWhatsAppConPDF(pdfInfo);
          console.log('WhatsApp enviado exitosamente');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (whatsappError) {
        console.warn('Error WhatsApp:', whatsappError);
        // 🔇 Toast eliminado - no interrumpir el flujo de cierre
      }

      setPasoActual(3);

      // Paso 3: Capturar evidencia
      setMensajePaso('Capturando evidencia fotográfica...');
      console.log('📸 Capturando evidencia...');
      const evidenciaFoto = await capturePhoto();
      setFotoEvidencia(evidenciaFoto);
      await new Promise(resolve => setTimeout(resolve, 800));

      setPasoActual(4);

      // Paso 4: Cerrar caja en el backend
      setMensajePaso('Guardando cierre en base de datos...');
      console.log('💾 Cerrando caja en backend...');

      // 🔥 GENERAR OBSERVACIONES FINALES AUTOMÁTICAS (BUG #2 SOLUCIONADO)
      const diferencias = calcularDiferencias();
      const hayDiferencias = diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0;

      let observacionesFinales = observacionesCierre.trim();

      // Si no hay observaciones manuales, generar automática
      if (!observacionesFinales) {
        observacionesFinales = generarObservacionAutomatica(diferencias, hayDiferencias);
      } else {
        // Si hay observaciones manuales pero también diferencias, agregar info de diferencias
        if (hayDiferencias && ceoAutorizado) {
          const observacionAuto = generarObservacionAutomatica(diferencias, hayDiferencias);
          observacionesFinales = `${observacionesFinales}\n\n${observacionAuto}`;
        }
      }

      const evidenciaInfo = `\n\nEVIDENCIA FOTOGRÁFICA: ${evidenciaFoto ? 'CAPTURADA AUTOMÁTICAMENTE' : 'NO DISPONIBLE'} - Timestamp: ${new Date().toISOString()}`;
      observacionesFinales = observacionesFinales ?
        `${observacionesFinales}${evidenciaInfo}` :
        evidenciaInfo.trim();

      const cajaData = await cerrarCaja({
        montoFinalBs: convertirANumero(montoFinalBs),
        montoFinalUsd: convertirANumero(montoFinalUsd),
        montoFinalPagoMovil: convertirANumero(montoFinalPagoMovil),
        observacionesCierre: observacionesFinales
      });

      // Enviar evidencia fotográfica al backend
      if (evidenciaFoto && cajaData?.id) {
        try {
          await api.post('/cajas/evidencia-fotografica', {
            caja_id: cajaData.id,
            evento: 'cierre',
            imagen_base64: evidenciaFoto,
            usuario_id: usuario?.id,
            diferencias: diferenciasCalculadas,
            ceo_autorizado: ceoAutorizado,
            timestamp: new Date().toISOString()
          });
          console.log('📸 Evidencia de cierre enviada al backend');
        } catch (error) {
          console.warn('⚠️ Error enviando evidencia:', error);
        }
      }

      setPasoActual(5);

      // Paso 5: Finalizar
      setMensajePaso('Finalizando y desbloqueando sistema...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Desbloquear usuarios
      emitirEvento('desbloquear_usuarios', {
        motivo: 'Caja cerrada exitosamente',
        timestamp: new Date().toISOString()
      });

      // 🔇 Toasts eliminados - el modal de progreso muestra todo el estado
      // El PDF ya fue descargado en el paso 1

      limpiarFormulario();

      // Esperar un momento antes de cerrar
      setTimeout(() => {
        setShowProgreso(false);
        onClose();
      }, 2000);

    } catch (error) {
      console.error('⛔ Error cerrando caja:', error);
      toast.error('Error al cerrar la caja: ' + error.message);
      setShowProgreso(false);
      setMensajePaso('');

      emitirEvento('desbloquear_usuarios', {
        motivo: 'Error en cierre de caja',
        timestamp: new Date().toISOString()
      });
    }
  };

  // 🔥 FUNCIÓN CORREGIDA PARA GENERAR PDF CON DIFERENCIAS (BUG #4 SOLUCIONADO)
  const generarPDFConDiferencias = async () => {
    const diferencias = calcularDiferencias();
    const hayDiferencias = diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0;

    // 🔥 PREPARAR DATOS COMPLETOS CORREGIDOS PARA PDF (BUG #4 SOLUCIONADO)
    const datosCompletos = {
      usuario: {
        nombre: usuario?.nombre || 'Usuario',
        rol: usuario?.rol || 'cajero',
        sucursal: usuario?.sucursal || 'Principal'
      },
      caja: {
        // Montos iniciales CORREGIDOS
        montoInicialBs: resumen.inicialBs,
        montoInicialUsd: resumen.inicialUsd,
        montoInicialPagoMovil: resumen.inicialPagoMovil,

        // Totales del día CORREGIDOS
        totalIngresosBs: resumen.ingresosBs,
        totalEgresosBs: resumen.egresosBs,
        totalIngresosUsd: resumen.ingresosUsd,
        totalEgresosUsd: resumen.egresosUsd,
        totalPagoMovil: resumen.totalPagoMovil,

        // Montos esperados vs contados CORREGIDOS
        montoEsperadoBs: resumen.esperadoBs,
        montoEsperadoUsd: resumen.esperadoUsd,
        montoEsperadoPagoMovil: resumen.esperadoPagoMovil,

        // 🔥 DATOS ADICIONALES REQUERIDOS POR PDF SERVICE (BUG #4 SOLUCIONADO)
        fecha: cajaActual.fecha_apertura,
        horaApertura: cajaActual.hora_apertura,
        horaCierre: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        usuarioApertura: cajaActual.usuario_apertura,
        estado: cajaActual.estado
      },
      // 🔥 MONTOS FINALES CONTADOS CORREGIDOS (BUG #4 SOLUCIONADO)
      montosFinales: {
        bs: convertirANumero(montoFinalBs),
        usd: convertirANumero(montoFinalUsd),
        pagoMovil: convertirANumero(montoFinalPagoMovil)
      },
      // 🔥 DIFERENCIAS CALCULADAS CORRECTAMENTE (BUG #4 SOLUCIONADO)
      diferencias: hayDiferencias ? diferencias : null,
      ceoAutorizado: ceoAutorizado,
      // 🔥 OBSERVACIONES CORREGIDAS (BUG #2 SOLUCIONADO)
      observaciones: observacionesCierre.trim() || generarObservacionAutomatica(diferencias, hayDiferencias),
      fechaGeneracion: new Date().toISOString(),

      // 🔥 TRANSACCIONES CON DATOS COMPLETOS PARA PDF (BUG #4 SOLUCIONADO)
      transacciones: montosReales.transaccionesCompletas || []
    };

    console.log('📊 Datos corregidos para PDF:', datosCompletos);

    const pdfResponse = await api.post('/cajas/generar-pdf-temporal', datosCompletos);

    if (!pdfResponse.data.success) {
      throw new Error('Error generando PDF temporal');
    }

    return pdfResponse.data.data;
  };

  // 🔥 FUNCIÓN CORREGIDA PARA ENVIAR WHATSAPP (BUG #3 SOLUCIONADO)
  const enviarWhatsAppConPDF = async (pdfInfo) => {
    const diferencias = calcularDiferencias();
    const hayDiferencias = diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0;

    // 🔥 MENSAJE MEJORADO PARA WHATSAPP CON DIFERENCIAS Y OBSERVACIONES CORREGIDAS (BUG #3 SOLUCIONADO)
    let mensajeDiferencias = '';
    if (hayDiferencias && ceoAutorizado) {
      const diferenciasTexto = [];
      if (diferencias.bs !== 0) {
        diferenciasTexto.push(`Bolívares: ${diferencias.bs > 0 ? 'SOBRANTE' : 'FALTANTE'} ${formatearBolivares(Math.abs(diferencias.bs))} Bs`);
      }
      if (diferencias.usd !== 0) {
        diferenciasTexto.push(`Dólares: ${diferencias.usd > 0 ? 'SOBRANTE' : 'FALTANTE'} $${formatearDolares(Math.abs(diferencias.usd))}`);
      }
      if (diferencias.pagoMovil !== 0) {
        diferenciasTexto.push(`Pago Móvil: ${diferencias.pagoMovil > 0 ? 'SOBRANTE' : 'FALTANTE'} ${formatearBolivares(Math.abs(diferencias.pagoMovil))} Bs PM`);
      }

      mensajeDiferencias = `

🚨 *DIFERENCIAS AUTORIZADAS POR CEO:*
${diferenciasTexto.join('\n')}
*Autorizado por: Andrés Morandín*`;
    }

    // 🔥 OBSERVACIONES CORREGIDAS PARA WHATSAPP (BUG #3 SOLUCIONADO)
    let mensajeObservaciones = '';
    const observacionesParaWhatsApp = observacionesCierre.trim() || generarObservacionAutomatica(diferencias, hayDiferencias);

    if (observacionesParaWhatsApp) {
      mensajeObservaciones = `

📝 *OBSERVACIONES:*
${observacionesParaWhatsApp}`;
    }

    // 🔥 MENSAJE COMPLETO CORREGIDO PARA WHATSAPP (BUG #3 SOLUCIONADO)
    const mensajeWhatsApp = `📄 *ELECTRO CAJA - REPORTE DE CIERRE*

📅 *Fecha:* ${new Date().toLocaleDateString('es-VE')}
🕐 *Hora:* ${new Date().toLocaleTimeString('es-VE')}
👤 *Usuario:* ${usuario?.nombre}
🏢 *Sucursal:* ${usuario?.sucursal || 'Principal'}

💰 *MONTOS INICIALES:*
💵 Bolívares: ${formatearBolivares(resumen.inicialBs)} Bs
💵 Dólares: $${formatearDolares(resumen.inicialUsd)}
📱 Pago Móvil: ${formatearBolivares(resumen.inicialPagoMovil)} Bs

📊 *MOVIMIENTOS DEL DÍA:*
📈 Ingresos Bs: ${formatearBolivares(resumen.ingresosBs)} Bs
📉 Egresos Bs: ${formatearBolivares(resumen.egresosBs)} Bs
📈 Ingresos $: $${formatearDolares(resumen.ingresosUsd)}
📉 Egresos $: $${formatearDolares(resumen.egresosUsd)}
📱 Pago Móvil: ${formatearBolivares(resumen.totalPagoMovil)} Bs

💰 *MONTOS FINALES (CONTEO):*
💵 Bolívares: ${formatearBolivares(convertirANumero(montoFinalBs))} Bs
💵 Dólares: $${formatearDolares(convertirANumero(montoFinalUsd))}
📱 Pago Móvil: ${formatearBolivares(convertirANumero(montoFinalPagoMovil))} Bs

💯 *MONTOS ESPERADOS:*
💵 Bolívares: ${formatearBolivares(resumen.esperadoBs)} Bs
💵 Dólares: $${formatearDolares(resumen.esperadoUsd)}
📱 Pago Móvil: ${formatearBolivares(resumen.esperadoPagoMovil)} Bs${mensajeDiferencias}${mensajeObservaciones}

📄 *Reporte PDF adjunto con detalles completos.*

_Reporte de cierre - Electro Caja_`;

    const whatsappResponse = await api.post('/whatsapp/pdf', {
      numero: '+584120552931',
      mensaje: mensajeWhatsApp,
      rutaPDF: pdfInfo.rutaPDF,
      nombreArchivo: pdfInfo.nombreArchivo
    });

    if (!whatsappResponse.data.success) {
      throw new Error(whatsappResponse.data.message || 'Error enviando por WhatsApp');
    }

    // Descargar PDF localmente si está disponible
    try {
      if (pdfInfo.pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdfInfo.pdfBase64}`;
        link.download = pdfInfo.nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('📄 PDF descargado localmente:', pdfInfo.nombreArchivo);
      }
    } catch (downloadError) {
      console.warn('⚠️ Error descargando PDF:', downloadError);
    }

    return whatsappResponse.data;
  };

  const limpiarFormulario = () => {
    setMontoFinalBs('');
    setMontoFinalUsd('');
    setMontoFinalPagoMovil('');
    setObservacionesCierre('');
    setObservacionesAbiertas(false);
    setDiferenciasCalculadas(null);
    setCeoAutorizado(false);
    setFotoEvidencia(null);
    setCameraStatus('initializing');
    setMensajePaso('');
  };

  const handleAutorizacionCEO = () => {
    setShowModalCEO(false);
    setCeoAutorizado(true);
    // 🔇 Toast eliminado - el modal de progreso mostrará el estado

    setTimeout(() => {
      procederConCierre();
    }, 300);
  };

  const handleEnviarPDFWhatsApp = async () => {
    try {
      if (!montoFinalBs || !montoFinalUsd || !montoFinalPagoMovil) {
        toast.error('Completa todos los conteos antes de generar el PDF');
        return;
      }

      const diferencias = calcularDiferencias();
      const hayDiferencias = diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0;

      if (hayDiferencias && !ceoAutorizado) {
        toast.error('Se detectaron diferencias. Se requiere autorización CEO para continuar.');
        setDiferenciasCalculadas(diferencias);
        setShowModalCEO(true);
        return;
      }

      const confirmar = window.confirm(
        `¿Generar PDF de cierre y enviarlo por WhatsApp?\n\n` +
        `Montos a incluir:\n` +
        `Bolívares: ${formatearBolivares(convertirANumero(montoFinalBs))} Bs\n` +
        `Dólares: $${formatearDolares(convertirANumero(montoFinalUsd))}\n` +
        `Pago Móvil: ${formatearBolivares(convertirANumero(montoFinalPagoMovil))} Bs\n\n` +
        `${hayDiferencias ? 'Con diferencias autorizadas por CEO' : 'Sin diferencias detectadas'}`
      );

      if (!confirmar) return;

      const pdfInfo = await generarPDFConDiferencias();
      await enviarWhatsAppConPDF(pdfInfo);

      toast.success('📱 PDF enviado por WhatsApp exitosamente', {
        duration: 5000
      });

      return pdfInfo;

    } catch (error) {
      console.error('⛔ Error generando/enviando PDF:', error);
      toast.error('Error: ' + (error.response?.data?.message || error.message));
      throw error;
    }
  };

  const handleClose = () => {
    if (loading || showProgreso) {
      toast.error('No se puede cancelar durante el proceso de cierre');
      return;
    }

    cleanupCamera();

    emitirEvento('desbloquear_usuarios', {
      motivo: 'Cierre de caja cancelado',
      timestamp: new Date().toISOString()
    });

    limpiarFormulario();
    setBloqueandoUsuarios(false);
    onClose();
  };

  const diferenciasActuales = calcularDiferencias();

  return (
    <>
      <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm modal-backdrop flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden h-[90vh] flex flex-col">

            {/* Header elegante */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 relative">
              <div className="px-5 py-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {esCajaPendiente ? '🚨 Cerrar Caja Pendiente' : 'Cerrar Caja'}
                      </h2>
                      <div className="text-sm text-red-100 flex items-center space-x-4">
                        <span>
                          {esCajaPendiente
                            ? `Completar cierre del ${cajaPendiente.fecha}`
                            : 'Finalizar operaciones del día'
                          }
                        </span>
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
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    disabled={loading || showProgreso}
                    className="text-white/70 hover:text-white transition-colors p-1 disabled:opacity-50"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Notificación de bloqueo - Centrada en el header */}
              {bloqueandoUsuarios && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="relative">
                    {/* Efecto de pulso */}
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
                    <div className="relative bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/30 flex items-center space-x-2">
                      <Shield className="h-4 w-4 animate-pulse" />
                      <span className="text-xs font-semibold tracking-wide">SISTEMA BLOQUEADO</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Información compacta del usuario - MEJORADA CON ICONOS Y FALLBACKS */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex flex-wrap items-center justify-between text-xs transition-all">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-red-500 font-medium">Abierta por:</span>
                  <span className="font-bold text-red-900 uppercase">
                    {cajaActual.usuarioApertura?.nombre || cajaActual.usuario_apertura || cajaActual.usuario?.nombre || 'Sistema'}
                  </span>
                </div>
                <div className="w-px h-3 bg-red-200"></div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-red-500 font-medium">Fecha:</span>
                  <span className="font-bold text-red-900">
                    {cajaActual.fecha ? new Date(cajaActual.fecha).toLocaleDateString('es-VE') : (cajaActual.fecha_apertura || new Date().toLocaleDateString('es-VE'))}
                  </span>
                </div>
                <div className="w-px h-3 bg-red-200"></div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-red-500 font-medium">Hora:</span>
                  <span className="font-bold text-red-900">
                    {cajaActual.horaApertura || cajaActual.hora_apertura || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 border-l border-red-200 pl-4 ml-4">
                <User className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500 font-medium">Cerrando:</span>
                <span className="font-bold text-red-900 uppercase">{usuario?.nombre}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {/* Resumen más compacto */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 mb-4 border border-slate-200">
                {/* HEADER "Resumen del Día" */}
                <h3 className="font-bold text-slate-900 mb-2 flex items-center px-1">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Resumen del Día
                  <span className="ml-auto text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-0.5 rounded-full border border-blue-100">
                    {resumen.transacciones} transacciones
                  </span>
                </h3>

                {/* GRID DE CARDS RESUMEN - ESTILO PREMIUM */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

                  {/* BOLÍVARES */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-orange-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                    <div className="relative z-10">

                      {/* Header Card */}
                      <div className="flex flex-col items-center gap-1 mb-2 text-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center shadow-inner mb-0.5">
                          <Coins className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">Bolívares</h4>
                        </div>
                      </div>

                      {/* Body Details */}
                      <div className="space-y-1.5 mb-2">
                        <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                          <span className="text-gray-500 font-medium">Inicial</span>
                          <span className="font-mono font-medium text-gray-700">{formatearBolivares(resumen.inicialBs)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                          <span className="text-gray-500 font-medium">Ingresos</span>
                          <span className="font-mono font-medium text-green-600">+{formatearBolivares(resumen.ingresosBs)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pb-1">
                          <span className="text-gray-500 font-medium">Egresos</span>
                          <span className="font-mono font-medium text-red-500">-{formatearBolivares(resumen.egresosBs)}</span>
                        </div>
                      </div>

                      {/* Footer Total */}
                      <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Esperado en Caja</div>
                        <div className="text-lg font-bold text-gray-700 tracking-tight font-mono">
                          {formatearBolivares(resumen.esperadoBs)} <span className="text-[10px] text-gray-400 font-sans">Bs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DÓLARES */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-green-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                    <div className="relative z-10">

                      {/* Header Card */}
                      <div className="flex flex-col items-center gap-1 mb-2 text-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center shadow-inner mb-0.5">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">Dólares</h4>
                        </div>
                      </div>

                      {/* Body Details */}
                      <div className="space-y-1.5 mb-2">
                        <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                          <span className="text-gray-500 font-medium">Inicial</span>
                          <span className="font-mono font-medium text-gray-700">${formatearDolares(resumen.inicialUsd)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                          <span className="text-gray-500 font-medium">Ingresos</span>
                          <span className="font-mono font-medium text-green-600">+${formatearDolares(resumen.ingresosUsd)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pb-1">
                          <span className="text-gray-500 font-medium">Egresos</span>
                          <span className="font-mono font-medium text-red-500">-${formatearDolares(resumen.egresosUsd)}</span>
                        </div>
                      </div>

                      {/* Footer Total */}
                      <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Esperado en Caja</div>
                        <div className="text-lg font-bold text-gray-700 tracking-tight font-mono">
                          ${formatearDolares(resumen.esperadoUsd)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PAGO MÓVIL */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-purple-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                    <div className="relative z-10">

                      {/* Header Card */}
                      <div className="flex flex-col items-center gap-1 mb-2 text-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center shadow-inner mb-0.5">
                          <Smartphone className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">Pago Móvil</h4>
                        </div>
                      </div>

                      {/* Body Details */}
                      <div className="space-y-1.5 mb-2">
                        <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                          <span className="text-gray-500 font-medium">Inicial</span>
                          <span className="font-mono font-medium text-gray-700">{formatearBolivares(resumen.inicialPagoMovil)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                          <span className="text-gray-500 font-medium">Recibidos</span>
                          <span className="font-mono font-medium text-green-600">+{formatearBolivares(resumen.totalPagoMovil)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pb-1">
                          <span className="text-gray-500 font-medium">Egresos</span>
                          <span className="font-mono font-medium text-red-500">-{formatearBolivares(resumen.egresosPagoMovil || 0)}</span>
                        </div>
                      </div>

                      {/* Footer Total */}
                      <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Esperado en Cuentas</div>
                        <div className="text-lg font-bold text-gray-700 tracking-tight font-mono">
                          {formatearBolivares(resumen.esperadoPagoMovil)} <span className="text-[10px] text-gray-400 font-sans">Bs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* 🔥 CONTEO FINAL OBLIGATORIO CON INPUTS MEJORADOS (BUG #1 SOLUCIONADO) */}
              <form id="form-cierre-caja" onSubmit={handleSubmit}>

                {/* BARRA DE ADVERTENCIA COMPACTA */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3 flex items-center justify-between flex-wrap gap-2 shadow-sm relative z-10 backdrop-blur-xl bg-orange-50/95 sticky top-0 transition-all">
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
                </div>

                {/* GRID DE CARDS DE CONTEO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">

                  {/* EFECTIVO BS */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-orange-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="flex flex-col items-center gap-1 mb-2 text-center relative w-full">
                        {/* WARNING BADGE - FLOTANTE */}
                        {montoFinalBs && diferenciasActuales.bs !== 0 && (
                          <div className="absolute -top-1 left-0 transform -translate-x-2 -translate-y-2 z-20 animate-in zoom-in duration-300">
                            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{diferenciasActuales.bs > 0 ? '+' : ''}{formatearBolivares(diferenciasActuales.bs)}</span>
                            </div>
                          </div>
                        )}
                        <div className="w-9 h-9 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center shadow-inner mb-0.5">
                          <Coins className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-base">Efectivo Bs</h4>
                        </div>
                      </div>



                      <div className="w-full">
                        <label className="block text-xs font-bold text-orange-700 mb-1.5 uppercase text-center">Monto Contado</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={montoFinalBs}
                            onChange={handleMontoChange(setMontoFinalBs)}
                            placeholder="0,00"
                            className="w-full text-center py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-lg font-mono font-medium transition-all shadow-sm"
                            required
                            onKeyDown={(e) => {
                              if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || (e.ctrlKey)) return;
                              if (!/[\d,.]/.test(e.key) || (e.key === ',' && montoFinalBs.includes(',')) || (e.key === '.' && montoFinalBs.includes(','))) e.preventDefault();
                              if (e.key === '.') {
                                e.preventDefault();
                                setMontoFinalBs(sanitizarNumero(montoFinalBs + ','));
                              }
                            }}
                          />
                        </div>
                        {montoFinalBs && (
                          <div className={`mt-2 text-center text-xs font-bold ${Math.abs(diferenciasActuales.bs) < 0.01 ? 'text-green-600' : diferenciasActuales.bs > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {Math.abs(diferenciasActuales.bs) < 0.01 ? '✓ EXACTO' : diferenciasActuales.bs > 0 ? `+${formatearBolivares(diferenciasActuales.bs)} Bs` : `${formatearBolivares(diferenciasActuales.bs)} Bs`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* EFECTIVO USD */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-green-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="flex flex-col items-center gap-1 mb-2 text-center relative w-full">
                        {/* WARNING BADGE - FLOTANTE */}
                        {montoFinalUsd && diferenciasActuales.usd !== 0 && (
                          <div className="absolute -top-1 left-0 transform -translate-x-2 -translate-y-2 z-20 animate-in zoom-in duration-300">
                            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{diferenciasActuales.usd > 0 ? '+' : ''}${formatearDolares(diferenciasActuales.usd)}</span>
                            </div>
                          </div>
                        )}
                        <div className="w-9 h-9 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center shadow-inner">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-base">Efectivo USD</h4>
                        </div>
                      </div>



                      <div className="w-full">
                        <label className="block text-xs font-bold text-green-700 mb-1.5 uppercase text-center">Monto Contado</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={montoFinalUsd}
                            onChange={handleMontoChange(setMontoFinalUsd)}
                            placeholder="0,00"
                            className="w-full text-center py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-lg font-mono font-medium transition-all shadow-sm"
                            required
                            onKeyDown={(e) => {
                              if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || (e.ctrlKey)) return;
                              if (!/[\d,.]/.test(e.key) || (e.key === ',' && montoFinalUsd.includes(',')) || (e.key === '.' && montoFinalUsd.includes(','))) e.preventDefault();
                              if (e.key === '.') {
                                e.preventDefault();
                                setMontoFinalUsd(sanitizarNumero(montoFinalUsd + ','));
                              }
                            }}
                          />
                        </div>
                        {montoFinalUsd && (
                          <div className={`mt-2 text-center text-xs font-bold ${Math.abs(diferenciasActuales.usd) < 0.01 ? 'text-green-600' : diferenciasActuales.usd > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {Math.abs(diferenciasActuales.usd) < 0.01 ? '✓ EXACTO' : diferenciasActuales.usd > 0 ? `+$${formatearDolares(diferenciasActuales.usd)}` : `$${formatearDolares(diferenciasActuales.usd)}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PAGO MÓVIL */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-purple-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="flex flex-col items-center gap-1 mb-2 text-center relative w-full">
                        {/* WARNING BADGE - FLOTANTE */}
                        {montoFinalPagoMovil && diferenciasActuales.pagoMovil !== 0 && (
                          <div className="absolute -top-1 left-0 transform -translate-x-2 -translate-y-2 z-20 animate-in zoom-in duration-300">
                            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{diferenciasActuales.pagoMovil > 0 ? '+' : ''}{formatearBolivares(diferenciasActuales.pagoMovil)}</span>
                            </div>
                          </div>
                        )}
                        <div className="w-9 h-9 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center shadow-inner">
                          <Smartphone className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-base">Pago Móvil</h4>
                        </div>
                      </div>



                      <div className="w-full">
                        <label className="block text-xs font-bold text-purple-700 mb-1.5 uppercase text-center">Monto Contado</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={montoFinalPagoMovil}
                            onChange={handleMontoChange(setMontoFinalPagoMovil)}
                            placeholder="0,00"
                            className="w-full text-center py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-lg font-mono font-medium transition-all shadow-sm"
                            required
                            onKeyDown={(e) => {
                              if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || (e.ctrlKey)) return;
                              if (!/[\d,.]/.test(e.key) || (e.key === ',' && montoFinalPagoMovil.includes(',')) || (e.key === '.' && montoFinalPagoMovil.includes(','))) e.preventDefault();
                              if (e.key === '.') {
                                e.preventDefault();
                                setMontoFinalPagoMovil(sanitizarNumero(montoFinalPagoMovil + ','));
                              }
                            }}
                          />
                        </div>
                        {montoFinalPagoMovil && (
                          <div className={`mt-2 text-center text-xs font-bold ${Math.abs(diferenciasActuales.pagoMovil) < 0.01 ? 'text-green-600' : diferenciasActuales.pagoMovil > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                            {Math.abs(diferenciasActuales.pagoMovil) < 0.01 ? '✓ EXACTO' : diferenciasActuales.pagoMovil > 0 ? `+${formatearBolivares(diferenciasActuales.pagoMovil)} Bs` : `${formatearBolivares(diferenciasActuales.pagoMovil)} Bs`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>



                {/* Observaciones desplegables */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setObservacionesAbiertas(!observacionesAbiertas)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-medium text-slate-700">Observaciones del Cierre</span>
                    {observacionesAbiertas ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {observacionesAbiertas && (
                    <div className="mt-3 p-3 border border-slate-200 rounded-lg bg-white">
                      <textarea
                        value={observacionesCierre}
                        onChange={(e) => setObservacionesCierre(e.target.value)}
                        placeholder="Observaciones sobre el cierre..."
                        rows={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      />
                      <div className="mt-1 text-xs text-slate-500">
                        {/* 🔥 TEXTO CORREGIDO SOBRE OBSERVACIONES AUTOMÁTICAS (BUG #2 SOLUCIONADO) */}
                        {observacionesCierre.trim() ?
                          'Las diferencias se registrarán automáticamente si requieren autorización CEO.' :
                          'Si no agrega observaciones, se generará automáticamente "CIERRE EJECUTADO".'
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* Indicador de progreso */}
                {loading && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      <div className="text-sm text-red-700">
                        Procesando cierre de caja...
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmación de evidencia capturada */}
                {fotoEvidencia && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <Camera className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-800">Evidencia Fotográfica Capturada</div>
                        <div className="text-sm text-green-700">Se ha registrado automáticamente la evidencia del cierre</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
              </form>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 border-t border-red-700 shadow-inner z-20">
              {/* Botón Cancelar */}
              <button
                type="button"
                onClick={handleClose}
                disabled={loading || showProgreso}
                className="flex-1 px-6 py-3 text-red-700 bg-white border border-red-100 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <X className="h-5 w-5" />
                <span>CANCELAR OPERACIÓN</span>
              </button>

              {/* Botón Cerrar Caja */}
              <button
                type="submit"
                form="form-cierre-caja"
                disabled={loading || showProgreso || !montoFinalBs || !montoFinalUsd || !montoFinalPagoMovil}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-slate-700 flex items-center justify-center gap-2"
              >
                {loading || showProgreso ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>PROCESANDO CIERRE...</span>
                  </span>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    <span>CONFIRMAR CIERRE DE CAJA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Modal CEO para diferencias */}
          <ModalCEO
            isOpen={showModalCEO}
            diferencias={diferenciasCalculadas}
            onAutorizar={handleAutorizacionCEO}
            usuarioActual={usuario}
          />

          {/* Modal de progreso de cierre MEJORADO */}
          <ModalProgresoCierre
            isOpen={showProgreso}
            pasoActual={pasoActual}
            pasos={pasos}
            mensajePaso={mensajePaso}
          />

          {/* Elementos ocultos para cámara */}
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
        </div>
      </div>
    </>
  );
};

export default CerrarCajaModal;
