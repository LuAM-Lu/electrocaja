// components/AbrirCajaModal.jsx (COMPLETO CON ESTILO CERRAR CAJA)
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Unlock, User, Calendar, Clock, Smartphone, CheckCircle, AlertCircle, Camera, CameraOff, ChevronDown, ChevronUp, TrendingUp, Coins, DollarSign } from 'lucide-react';
import { useCajaStore } from '../store/cajaStore';
import { useAuthStore } from '../store/authStore';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { agregarNotificacionWhatsApp, agregarNotificacionSistema } from '../store/notificacionesStore';
import toast from '../utils/toast.jsx';
import { api } from '../config/api';

const AbrirCajaModal = ({ isOpen, onClose }) => {
  const { abrirCaja, loading } = useCajaStore();
  const { usuario } = useAuthStore();
  const { emitirEvento } = useSocketEvents();


  // Estados del formulario
  const [montoInicialBs, setMontoInicialBs] = useState('');
  const [montoInicialUsd, setMontoInicialUsd] = useState('');
  const [montoInicialPagoMovil, setMontoInicialPagoMovil] = useState('');

  // Estados de la cámara
  const [cameraStatus, setCameraStatus] = useState('initializing'); // initializing, ready, error, capturing
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
  const [whatsappEnviado, setWhatsappEnviado] = useState(false);

  //  Estados para observaciones desplegables
  const [observacionesAbiertas, setObservacionesAbiertas] = useState(true);
  const [observacionesApertura, setObservacionesApertura] = useState('');

  // Refs para cámara
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  //  INICIALIZAR CÁMARA SILENCIOSAMENTE
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    }

    return () => {
      cleanupCamera();
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
        console.log(' Cámara inicializada silenciosamente');
      }
    } catch (error) {
      console.warn(' No se pudo acceder a la cámara:', error);
      setCameraStatus('error');
      // No mostrar error al usuario - silent fallback
    }
  };

  const cleanupCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStatus('initializing');
  };

  //  CAPTURAR FOTO SILENCIOSAMENTE
  const capturePhoto = async () => {
    return new Promise((resolve) => {
      try {
        if (cameraStatus !== 'ready' || !videoRef.current || !canvasRef.current) {
          console.warn(' Cámara no disponible para captura');
          resolve(null);
          return;
        }

        setCameraStatus('capturing');

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Configurar canvas con las dimensiones del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Capturar frame actual
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertir a base64 (JPEG con calidad optimizada)
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        console.log(' Foto capturada silenciosamente');
        setCameraStatus('ready');
        resolve(imageData);

      } catch (error) {
        console.error(' Error capturando foto:', error);
        setCameraStatus('error');
        resolve(null);
      }
    });
  };

  //  FUNCIÓN PARA ENVIAR WHATSAPP MEJORADA
  const enviarNotificacionWhatsApp = async (datosApertura, fotoBase64 = null) => {
    const { fecha, hora } = obtenerFechaHoraVenezolana();

    //  PLANTILLA DEL MENSAJE CON INFO DE FOTO
    let mensajeWhatsApp = ` *ELECTRO CAJA - APERTURA DE CAJA*

       *Fecha:* ${fecha}
       *Hora:* ${hora}
       *Usuario:* ${datosApertura.usuario}
       *Sucursal:* ${datosApertura.sucursal}
       *Turno:* ${datosApertura.turno}

       *MONTOS INICIALES:*
       Bolívares: ${Math.round(datosApertura.montoBs).toLocaleString('es-VE')} Bs
       Dólares: $${datosApertura.montoUsd.toLocaleString('en-US')}
       Pago Móvil: ${Math.round(datosApertura.montoPagoMovil).toLocaleString('es-VE')} Bs

      ${fotoBase64 ? ' *Evidencia fotográfica:* Capturada ' : ' *Evidencia fotográfica:* No disponible '}

       Caja abierta correctamente y lista para operar.

      _Notificación automática del sistema Electro Caja_`;

    try {
      setEnviandoWhatsApp(true);

      //  ENVÍO REAL AL BACKEND
      console.log(' ENVIANDO WHATSAPP APERTURA:', {
        numero: '+584120552931',
        mensaje: mensajeWhatsApp,
        evidencia_fotografica: !!fotoBase64,
        timestamp: new Date().toISOString()
      });

      const response = await api.post('/whatsapp/enviar', {
        numero: '+584120552931',
        mensaje: mensajeWhatsApp
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error enviando WhatsApp');
      }

      //  CORRECTO: Con axios, response.data ya contiene la respuesta parseada
      console.log(' WhatsApp enviado:', response.data);
      setWhatsappEnviado(true);
      toast.success('Notificación WhatsApp enviada al supervisor');

    } catch (error) {
      console.error(' Error enviando WhatsApp:', error);

      //  MANEJO GRACEFUL DEL ERROR
      if (error.response?.status === 500) {
        console.warn(' Servicio WhatsApp no disponible en backend');
        toast.error('Caja abierta correctamente. WhatsApp no disponible temporalmente.');
      } else {
        toast.error('Caja abierta, pero falló notificación WhatsApp');
      }

      // Agregar a cola de notificaciones para retry
      agregarNotificacionWhatsApp({
        tipo: 'apertura',
        numero: '+584120552931',
        mensaje: mensajeWhatsApp,
        usuario: datosApertura.usuario,
        timestamp: new Date().toISOString()
      });
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  // Obtener fecha y hora actual en formato venezolano
  const obtenerFechaHoraVenezolana = () => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const hora = ahora.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return { fecha, hora };
  };

  //  MANEJAR ENVÍO DEL FORMULARIO MEJORADO
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const montoBs = parseFloat(montoInicialBs) || 0;
    const montoUsd = parseFloat(montoInicialUsd) || 0;
    const montoPagoMovil = parseFloat(montoInicialPagoMovil) || 0;

    //  VALIDACIONES MEJORADAS
    if (montoBs < 0 || montoUsd < 0 || montoPagoMovil < 0) {
      toast.error('Los montos no pueden ser negativos');
      return;
    }

    if (montoBs > 1000000) {
      toast.error('Monto en bolívares muy alto. Verifique.');
      return;
    }

    if (montoUsd > 10000) {
      toast.error('Monto en dólares muy alto. Verifique.');
      return;
    }

    try {
      //  1. CAPTURAR FOTO SILENCIOSAMENTE
      console.log(' Iniciando captura silenciosa...');
      const fotoBase64 = await capturePhoto();

      //  2. ABRIR LA CAJA EN BACKEND
      const cajaData = await abrirCaja(montoBs, montoUsd, montoPagoMovil);

      //  3. ENVIAR DATOS AL BACKEND CON FOTO
      if (fotoBase64) {
        try {
          const response = await api.post('/cajas/evidencia-fotografica', {
            caja_id: cajaData.id,
            evento: 'apertura',
            imagen_base64: fotoBase64,
            usuario_id: usuario?.id,
            observaciones: observacionesApertura || '',
            timestamp: new Date().toISOString()
          });

          if (response.data.success) {
            console.log(' Evidencia fotográfica enviada al backend exitosamente');
          } else {
            console.warn(' Error en respuesta de evidencia:', response.data.message);
          }
        } catch (error) {
          console.warn(' Error enviando foto al backend:', error.response?.data?.message || error.message);
        }
      }

      //  4. ENVIAR NOTIFICACIÓN WHATSAPP
      const datosApertura = {
        usuario: usuario?.nombre || 'Usuario Desconocido',
        sucursal: usuario?.sucursal || 'Sucursal Principal',
        turno: usuario?.turno || 'No especificado',
        montoBs,
        montoUsd,
        montoPagoMovil
      };

      //  ENVIAR WHATSAPP (NO CRÍTICO)
      try {
        await enviarNotificacionWhatsApp(datosApertura, fotoBase64);
      } catch (error) {
        console.warn(' WhatsApp falló pero apertura exitosa');
      }

      //  5. EMITIR EVENTO SOCKET.IO
      emitirEvento('caja_abierta', {
        usuario: usuario?.nombre,
        caja: cajaData,
        evidencia_fotografica: !!fotoBase64,
        timestamp: new Date().toISOString()
      });

      //  6. LIMPIAR Y CERRAR
      setMontoInicialBs('');
      setMontoInicialUsd('');
      setMontoInicialPagoMovil('');
      setObservacionesApertura('');

      toast.success('Caja abierta correctamente' + (fotoBase64 ? ' con evidencia fotográfica' : ''), { id: 'caja-abierta' });

      // Cerrar modal después de un momento
      setTimeout(() => {
        onClose();
        setWhatsappEnviado(false);
        cleanupCamera();
      }, 1500);

    } catch (error) {
      console.error(' Error al abrir la caja:', error);
      toast.error('Error al abrir la caja: ' + error.message);
    }
  };

  //  MANEJAR CIERRE DEL MODAL
  const handleClose = () => {
    setWhatsappEnviado(false);
    cleanupCamera();
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm modal-backdrop flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col mx-4 overflow-hidden">

        {/*  HEADER MEJORADO - TODO EN UNA FILA - FIXED */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 relative overflow-hidden flex-shrink-0">
          {/* Efecto de brillo */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer"></div>

          <div className="px-5 py-3 text-white relative">
            <div className="flex items-center justify-between gap-4">
              {/* LADO IZQUIERDO: Título y cámara */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                  <Unlock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Abrir Caja del Día</h2>
                  <div className="text-sm text-emerald-100 flex items-center space-x-2">
                    <span>Iniciar operaciones</span>
                    {/*  INDICADORES DE CONECTIVIDAD */}
                    {cameraStatus === 'ready' && (
                      <div className="flex items-center space-x-1 bg-white/20 px-2 py-0.5 rounded-full">
                        <Camera className="h-3 w-3" />
                        <span className="text-xs">Cámara lista</span>
                      </div>
                    )}
                    {cameraStatus === 'error' && (
                      <div className="flex items-center space-x-1 bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <CameraOff className="h-3 w-3" />
                        <span className="text-xs">Sin cámara</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CENTRO: Información del usuario */}
              <div className="flex items-center space-x-3 flex-1 justify-center">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-white">
                    {usuario?.nombre || 'Usuario'}
                  </div>
                  <div className="text-xs text-emerald-100">
                    {usuario?.rol?.toUpperCase()} • {usuario?.sucursal}
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-xs text-emerald-100">
                  <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-full">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date().toLocaleDateString('es-VE')}</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-full">
                    <Clock className="h-3 w-3" />
                    <span>{new Date().toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>

              {/* LADO DERECHO: Botón cerrar */}
              <button
                onClick={handleClose}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 flex-shrink-0"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/*  CUERPO DEL FORMULARIO CON SCROLL */}
        <form id="form-abrir-caja" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 custom-scrollbar">

          {/*  RESUMEN PREVIO */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 mb-4 border border-emerald-200 text-center">
            <h3 className="font-bold text-emerald-900 mb-1 flex items-center justify-center text-base">
              <TrendingUp className="h-4 w-4 mr-2 text-emerald-600" />
              Montos Iniciales para Apertura
            </h3>
            <div className="text-xs text-emerald-700">
              Establezca la base financiera para las operaciones del día.
            </div>
          </div>

          {/*  CONTEO INICIAL CON CARDS (ESTILO CERRAR CAJA) */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
            <h4 className="font-bold text-emerald-900 mb-3 flex items-center text-sm">
              <Coins className="h-4 w-4 mr-2" />
              Conteo Inicial Obligatorio
            </h4>

            {/* Grid 3 columnas estilo CerrarCaja */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* Card Bolívares */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-orange-200 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10 flex flex-col items-center flex-1">
                  <div className="flex flex-col items-center gap-1 mb-3 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center shadow-inner mb-0.5">
                      <Coins className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-base">Bolívares</h4>
                    </div>
                  </div>

                  <div className="w-full mt-auto">
                    <label className="block text-xs font-bold text-orange-700 mb-2 text-center uppercase">
                      Monto Inicial *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={montoInicialBs}
                      onChange={(e) => setMontoInicialBs(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-center py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xl font-mono font-medium transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Card Dólares */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-green-200 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10 flex flex-col items-center flex-1">
                  <div className="flex flex-col items-center gap-1 mb-3 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center shadow-inner mb-0.5">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-base">Dólares</h4>
                    </div>
                  </div>

                  <div className="w-full mt-auto">
                    <label className="block text-xs font-bold text-green-700 mb-2 text-center uppercase">
                      Monto Inicial *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={montoInicialUsd}
                      onChange={(e) => setMontoInicialUsd(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-center py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-xl font-mono font-medium transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Card Pago Móvil */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group ring-1 ring-transparent hover:ring-purple-200 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10 flex flex-col items-center flex-1">
                  <div className="flex flex-col items-center gap-1 mb-3 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center shadow-inner mb-0.5">
                      <Smartphone className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-base">Pago Móvil</h4>
                    </div>
                  </div>

                  <div className="w-full mt-auto">
                    <label className="block text-xs font-bold text-purple-700 mb-2 text-center uppercase">
                      Saldo Inicial *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={montoInicialPagoMovil}
                      onChange={(e) => setMontoInicialPagoMovil(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-center py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xl font-mono font-medium transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/*  OBSERVACIONES DESPLEGABLES (ESTILO PREMIUM) */}
          <div className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={() => setObservacionesAbiertas(!observacionesAbiertas)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-white hover:from-emerald-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-1.5 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="font-bold text-gray-800">Observaciones de Apertura</span>
              </div>
              {observacionesAbiertas ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {observacionesAbiertas && (
              <div className="p-4 bg-white animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pl-1">
                  Detalles Adicionales
                </label>
                <textarea
                  value={observacionesApertura}
                  onChange={(e) => setObservacionesApertura(e.target.value)}
                  placeholder="Escriba aquí si hubo alguna novedad con los montos iniciales..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none text-sm transition-all text-gray-700 placeholder:text-gray-400"
                />
              </div>
            )}
          </div>

          {/* INDICADOR DE PROGRESO MEJORADO */}
          {(loading || enviandoWhatsApp) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                <div className="text-sm text-emerald-700 font-medium">
                  {loading ? ' Abriendo caja...' :
                    enviandoWhatsApp ? ' Enviando notificación...' :
                      ' Procesando...'}
                </div>
              </div>
            </div>
          )}

          {/* CONFIRMACIÓN WHATSAPP MEJORADA */}
          {whatsappEnviado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <div className="font-semibold"> Apertura Completada</div>
                  <div className="text-sm">Notificación WhatsApp enviada correctamente</div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/*  FOOTER CON BOTONES - FIXED */}
        {/*  FOOTER FIJO CON ESTILO PREMIUM */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 border-t border-emerald-700 shadow-inner z-20">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading || enviandoWhatsApp}
            className="flex-1 px-6 py-3 text-emerald-700 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-all disabled:opacity-50 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            CANCELAR
          </button>

          <button
            type="submit"
            form="form-abrir-caja"
            disabled={loading || enviandoWhatsApp}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition-all disabled:opacity-50 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-slate-700"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>ABRIENDO...</span>
              </div>
            ) : enviandoWhatsApp ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-pulse h-2 w-2 bg-white rounded-full"></div>
                <span>NOTIFICANDO...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Unlock className="h-5 w-5" />
                <span>CONFIRMAR APERTURA</span>
              </div>
            )}
          </button>
        </div>

        {/*  ELEMENTOS OCULTOS PARA CÁMARA */}
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

      {/* CSS PARA ANIMACIONES */}
      <style jsx="true">{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AbrirCajaModal;
