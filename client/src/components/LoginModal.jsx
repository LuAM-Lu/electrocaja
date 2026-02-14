// components/LoginModal.jsx - Refactored Modern Luxury Login
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Eye from 'lucide-react/dist/esm/icons/eye'
import EyeOff from 'lucide-react/dist/esm/icons/eye-off'
import User from 'lucide-react/dist/esm/icons/user'
import Lock from 'lucide-react/dist/esm/icons/lock'
import QrCode from 'lucide-react/dist/esm/icons/qr-code'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import Camera from 'lucide-react/dist/esm/icons/camera'
import X from 'lucide-react/dist/esm/icons/x'
import Copyright from 'lucide-react/dist/esm/icons/copyright'
import { useAuthStore } from '../store/authStore';
import toast from '../utils/toast.jsx';

const LoginModal = ({ isOpen, onClose }) => {
  const { login, loading, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [quickAccessCode, setQuickAccessCode] = useState('');
  const [quickAccessLoading, setQuickAccessLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [validationError, setValidationError] = useState({ field: null, message: '' });

  const scannerInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const qrReaderRef = useRef(null);
  const decodeControlsRef = useRef(null);
  const lastDetectedCodeRef = useRef('');

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || hasTouchScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-focus for QR scanner
  useEffect(() => {
    if (showQuickAccess && scannerInputRef.current && isOpen && !showCameraScanner) {
      const timer = setTimeout(() => scannerInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [showQuickAccess, isOpen, showCameraScanner]);

  const stopCameraScanner = useCallback(({ skipStateUpdate = false } = {}) => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }

    if (decodeControlsRef.current) {
      try {
        decodeControlsRef.current.stop();
      } catch (error) {
        console.warn('No se pudo detener el lector QR:', error);
      }
      decodeControlsRef.current = null;
    }

    if (qrReaderRef.current) {
      try {
        qrReaderRef.current.reset();
      } catch (error) {
        console.warn('No se pudo reiniciar el lector QR:', error);
      }
    }

    const activeVideo = videoRef.current;
    if (activeVideo) {
      const { srcObject } = activeVideo;
      if (srcObject && typeof srcObject.getTracks === 'function') {
        srcObject.getTracks().forEach((track) => track.stop());
      }
      activeVideo.pause?.();
      activeVideo.srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext?.('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width || 0, canvasRef.current.height || 0);
      }
    }

    lastDetectedCodeRef.current = '';

    if (!skipStateUpdate) {
      setShowCameraScanner(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
    }
  }, [isOpen, stopCameraScanner]);

  useEffect(() => () => stopCameraScanner({ skipStateUpdate: true }), [stopCameraScanner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError?.();
    setHasError(false);
    setValidationError({ field: null, message: '' });

    // Validación premium
    if (!formData.email.trim()) {
      setValidationError({ field: 'email', message: 'Completa este campo' });
      const emailInput = document.getElementById('email');
      emailInput?.focus();
      setTimeout(() => setValidationError({ field: null, message: '' }), 4000);
      return;
    }

    if (!formData.password.trim()) {
      setValidationError({ field: 'password', message: 'Completa este campo' });
      const passwordInput = document.getElementById('password');
      passwordInput?.focus();
      setTimeout(() => setValidationError({ field: null, message: '' }), 4000);
      return;
    }

    try {
      await login({
        email: formData.email,
        password: formData.password,
        sucursal: 'Principal',
        turno: 'matutino'
      });
      onClose();
    } catch (error) {
      console.error('Error en login:', error);
      toast.error(error.message || 'Error de autenticación');
      setHasError(true);
      setTimeout(() => setHasError(false), 600);
    }
  };

  const handleQuickAccessLogin = async (code) => {
    if (!code.trim()) {
      toast.error('Código requerido');
      return;
    }

    if (code.length < 8) {
      toast.error('Código muy corto (mín. 8 caracteres)');
      return;
    }

    if (!/^[A-Z0-9]+$/i.test(code)) {
      toast.error('Código inválido (solo letras y números)');
      return;
    }

    setQuickAccessLoading(true);
    clearError?.();

    try {
      await login({ token: code.trim() });
      onClose();
    } catch (error) {
      console.error('Error en acceso rápido:', error);
      toast.error(error.message || 'Código inválido');
      setHasError(true);
      setTimeout(() => {
        setHasError(false);
        scannerInputRef.current?.focus();
        scannerInputRef.current?.select();
      }, 600);
    } finally {
      setQuickAccessLoading(false);
    }
  };

  const handleDetectedCode = (rawValue) => {
    const value =
      typeof rawValue === 'string'
        ? rawValue
        : rawValue?.rawValue || rawValue?.text || '';
    const detectedCode = value.trim();

    if (!detectedCode) return;

    if (lastDetectedCodeRef.current === detectedCode) {
      return;
    }
    lastDetectedCodeRef.current = detectedCode;

    stopCameraScanner();
    setQuickAccessCode(detectedCode);
    toast.success('Codigo QR detectado');
    handleQuickAccessLogin(detectedCode);
  };

  const startCameraScanner = async () => {
    if (showCameraScanner) return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error('Tu dispositivo no soporta la camara');
      return;
    }

    try {
      stopCameraScanner({ skipStateUpdate: true });
      setShowCameraScanner(true);

      if (typeof window !== 'undefined' && 'BarcodeDetector' in window && !barcodeDetectorRef.current) {
        try {
          barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch (detectorError) {
          console.warn('BarcodeDetector no disponible:', detectorError);
          barcodeDetectorRef.current = null;
        }
      }

      if (barcodeDetectorRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (!canvasRef.current && typeof document !== 'undefined') {
          canvasRef.current = document.createElement('canvas');
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext?.('2d', { willReadFrequently: true });

        const scanWithDetector = async () => {
          if (!barcodeDetectorRef.current || !videoRef.current || !ctx || !canvas) {
            return;
          }

          if (videoRef.current.readyState >= 2) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            try {
              const barcodes = await barcodeDetectorRef.current.detect(canvas);
              if (barcodes.length > 0) {
                const detectedValue = barcodes[0].rawValue?.trim();
                if (detectedValue) {
                  handleDetectedCode(detectedValue);
                  return;
                }
              }
            } catch (detectionError) {
              console.error('Error detectando QR:', detectionError);
            }
          }

          scanAnimationRef.current = requestAnimationFrame(scanWithDetector);
        };

        scanAnimationRef.current = requestAnimationFrame(scanWithDetector);
        toast.success('Camara activada');
        return;
      }

      const { BrowserQRCodeReader } = await import('@zxing/browser');

      if (!qrReaderRef.current) {
        qrReaderRef.current = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 400,
          delayBetweenScanSuccess: 1000
        });
      }

      const devices = await qrReaderRef.current.listVideoInputDevices();
      let deviceId = devices?.[0]?.deviceId;

      if (devices && devices.length > 1) {
        const rearCamera = devices.find((device) => /back|rear|environment/i.test(device.label));
        deviceId = rearCamera?.deviceId ?? devices[devices.length - 1].deviceId;
      }

      decodeControlsRef.current = await qrReaderRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error, controls) => {
          if (result) {
            const getText = typeof result.getText === 'function' ? result.getText() : '';
            const text = typeof getText === 'string' ? getText.trim() : '';
            if (text) {
              controls?.stop?.();
              decodeControlsRef.current = null;
              handleDetectedCode(text);
            }
          } else if (error && error.name !== 'NotFoundException') {
            console.error('Error al leer QR:', error);
          }
        }
      );

      toast.success('Camara activada');
    } catch (error) {
      console.error('Error al iniciar el escaner QR:', error);
      toast.error(
        error?.name === 'NotAllowedError'
          ? 'Permiso de camara denegado'
          : 'No se pudo acceder a la camara'
      );
      stopCameraScanner();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Background con patrón de cuadrados concéntricos */}
      <div className="fixed inset-0 z-40 min-h-screen w-full" style={{ backgroundColor: '#1e3a8a' }}>
        {/* Concentric Squares - Dark Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(59, 130, 246, 0.2) 5px, rgba(59, 130, 246, 0.2) 6px, transparent 6px, transparent 15px),
              repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(59, 130, 246, 0.2) 5px, rgba(59, 130, 246, 0.2) 6px, transparent 6px, transparent 15px),
              repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(96, 165, 250, 0.15) 10px, rgba(96, 165, 250, 0.15) 11px, transparent 11px, transparent 30px),
              repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(96, 165, 250, 0.15) 10px, rgba(96, 165, 250, 0.15) 11px, transparent 11px, transparent 30px)
            `,
            backgroundColor: '#1e3a8a'
          }}
        />
      </div>

      {/* Main Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/40 ring-1 ring-black/5 relative">

          {/* QR Access Badge - Top Right */}
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              onClick={() => setShowQuickAccess(!showQuickAccess)}
              className="group relative"
              aria-label={showQuickAccess ? "Volver al login" : "Acceso rápido QR"}
            >
              <div className={`
                relative flex items-center justify-center
                ${showQuickAccess
                  ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 hover:from-blue-600 hover:via-blue-700 hover:to-cyan-700'
                  : 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 hover:from-purple-600 hover:via-purple-700 hover:to-indigo-700'
                }
                text-white font-bold
                w-12 h-12 sm:w-14 sm:h-14
                rounded-2xl
                shadow-xl hover:shadow-2xl hover:shadow-purple-500/40
                transition-all duration-300
                hover:scale-110 active:scale-95
                border-2 ${showQuickAccess ? 'border-blue-400/40' : 'border-purple-400/40'}
              `}>
                {!showQuickAccess && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-full w-full bg-green-500 border-2 border-white shadow-lg"></span>
                  </span>
                )}

                {showQuickAccess
                  ? <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-lg" />
                  : <QrCode className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-lg" />
                }
              </div>

              {/* Tooltip Premium */}
              <div className="
                hidden md:block
                absolute top-full right-0 mt-4 z-50
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                pointer-events-none
              ">
                {/* Flecha fuera del tooltip */}
                <div className="absolute -top-2 right-6">
                  <div className={`w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent ${showQuickAccess 
                    ? 'border-b-blue-600' 
                    : 'border-b-purple-600'
                  }`}></div>
                </div>
                {/* Tooltip */}
                <div className={`bg-gradient-to-r ${showQuickAccess 
                  ? 'from-blue-600 via-blue-700 to-cyan-600 border-blue-400/30' 
                  : 'from-purple-600 via-purple-700 to-indigo-600 border-purple-400/30'
                } text-white px-4 py-2.5 rounded-lg shadow-2xl border backdrop-blur-sm`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-xs font-bold tracking-wide whitespace-nowrap">
                      {showQuickAccess ? 'Volver al Login' : 'Acceso Rápido QR'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Header */}
          <div className={`relative overflow-hidden transition-all duration-700 ${
            showQuickAccess
              ? 'bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800'
              : 'bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800'
          }`}>
            <div className="px-6 py-8 text-white text-center relative z-10">
              <div className="flex justify-center mb-0">
                {/* Logo - Sin badge */}
                <img
                  src="/favicon.svg"
                  alt="Logo Electro Caja"
                  className="h-32 sm:h-40 md:h-48 w-32 sm:w-40 md:w-48 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="relative overflow-hidden min-h-[320px] sm:min-h-[360px]">

            {/* Normal Login Form */}
            <div className={`transition-all duration-700 ease-in-out transform-gpu ${
              showQuickAccess
                ? '-translate-x-full opacity-0 scale-95 absolute inset-0'
                : 'translate-x-0 opacity-100 scale-100'
            } ${hasError ? 'animate-shake' : ''}`}>
              <div className="px-6 py-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    Bienvenido
                  </h2>
                  <p className="text-gray-500 text-sm font-medium tracking-wide">Ingresa tus credenciales</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 flex flex-col items-center">
                  {/* Email Input */}
                  <div className="w-full max-w-xs">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 text-center" htmlFor="email">
                      Correo Electrónico
                    </label>
                    <div className="relative group">
                      <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors duration-200 group-focus-within:text-blue-500 z-10" />
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (validationError.field === 'email') {
                            setValidationError({ field: null, message: '' });
                          }
                        }}
                        className={`w-full pl-12 pr-4 py-3 text-base border rounded-xl focus:ring-2 focus:ring-opacity-20 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal relative z-0 text-center ${
                          validationError.field === 'email' || hasError
                            ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-600 hover:border-blue-300'
                        }`}
                        placeholder="email@electrocaja.com"
                      />
                      {validationError.field === 'email' && (
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
                          <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white px-4 py-2.5 rounded-lg shadow-2xl border border-red-400/30 backdrop-blur-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-lg"></div>
                              <span className="text-sm font-bold tracking-wide">{validationError.message}</span>
                            </div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 transform translate-y-full">
                              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-red-600"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="w-full max-w-xs">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 text-center" htmlFor="password">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors duration-200 group-focus-within:text-blue-500 z-10" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          if (validationError.field === 'password') {
                            setValidationError({ field: null, message: '' });
                          }
                        }}
                        className={`w-full pl-12 pr-14 py-3 text-base border rounded-xl focus:ring-2 focus:ring-opacity-20 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal relative z-0 text-center ${
                          validationError.field === 'password' || hasError
                            ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-600 hover:border-blue-300'
                        }`}
                        placeholder="tu contraseña"
                      />
                      {validationError.field === 'password' && (
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
                          <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white px-4 py-2.5 rounded-lg shadow-2xl border border-red-400/30 backdrop-blur-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-lg"></div>
                              <span className="text-sm font-bold tracking-wide">{validationError.message}</span>
                            </div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 transform translate-y-full">
                              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-red-600"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded p-1"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full max-w-xs electric-button py-3 px-4 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-[1.01] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Conectando...</span>
                      </>
                    ) : (
                      <>
                        <User className="h-5 w-5" />
                        <span>Iniciar Sesión</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1">
                    <Copyright className="h-3 w-3" />
                    Sades V1.0157
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Access Form */}
            <div className={`transition-all duration-700 ease-in-out transform-gpu ${
              showQuickAccess
                ? 'translate-x-0 opacity-100 scale-100'
                : 'translate-x-full opacity-0 scale-95 absolute inset-0'
            } ${hasError ? 'animate-shake' : ''}`}>
              <div className="px-6 py-6 flex flex-col justify-center min-h-[320px] sm:min-h-[360px]">

                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 bg-clip-text text-transparent">
                    Acceso Rápido
                  </h2>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed tracking-wide">
                    Escanea tu código QR de empleado<br/>o ingrésalo manualmente
                  </p>
                </div>

                <div className="mb-6">
                  {showCameraScanner ? (
                    // Camera View
                    <div className="relative w-full h-56 bg-black rounded-xl overflow-hidden shadow-inner">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                      />
                      <div className="absolute inset-0 border-2 border-purple-500 rounded-xl pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-purple-400 rounded-lg">
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-purple-500 rounded-tl-lg"></div>
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-purple-500 rounded-tr-lg"></div>
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-purple-500 rounded-bl-lg"></div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-purple-500 rounded-br-lg"></div>
                        </div>
                      </div>
                      <button
                        onClick={() => stopCameraScanner()}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                        Posiciona el código QR en el cuadro
                      </div>
                    </div>
                  ) : (
                    // Scanner Placeholder
                    <div className="relative w-full h-28 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl border border-dashed border-purple-300 flex items-center justify-center mb-4 overflow-hidden shadow-inner">
                      <div className="absolute inset-0 scanner-effect"></div>
                      <div className="text-center relative z-10">
                        <div className="relative inline-block p-4">
                          <div className="relative">
                            <QrCode className="h-12 w-12 text-purple-400 mx-auto mb-2 drop-shadow-sm" />
                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent laser-scan opacity-80 shadow-md shadow-purple-500/50"></div>
                            </div>
                            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-purple-500 rounded-tl-lg"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-purple-500 rounded-tr-lg"></div>
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-purple-500 rounded-bl-lg"></div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-purple-500 rounded-br-lg"></div>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-purple-600">
                          {isMobile ? 'Escáner QR Disponible' : 'Escáner QR Activo'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleQuickAccessLogin(quickAccessCode); }} className="space-y-5">
                  <div className="relative group">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 text-center" htmlFor="qr-code">
                      Código de Empleado
                    </label>
                    <input
                      id="qr-code"
                      ref={scannerInputRef}
                      type="password"
                      value={quickAccessCode}
                      onChange={(e) => setQuickAccessCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAccessLogin(e.target.value);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="Escanea o ingresa tu código"
                      className={`w-full px-5 py-3 text-base border rounded-xl focus:ring-2 focus:ring-opacity-20 text-center font-mono tracking-widest transition-all duration-300 bg-white/90 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-bold ${
                        hasError
                          ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50'
                          : 'border-purple-300 focus:ring-purple-500 focus:border-purple-600 hover:border-purple-400'
                      }`}
                      disabled={quickAccessLoading || showCameraScanner}
                      autoComplete="off"
                      maxLength="20"
                    />

                    {isMobile && !showCameraScanner && (
                      <div className="absolute right-2 top-9 group group-camera">
                        <button
                          type="button"
                          onClick={startCameraScanner}
                          className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors shadow-md relative"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                        {/* Tooltip Premium */}
                        <div className="absolute top-full right-0 mt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white px-4 py-2.5 rounded-lg shadow-2xl border border-purple-400/30 backdrop-blur-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-lg"></div>
                              <span className="text-xs font-bold tracking-wide whitespace-nowrap">
                                Usar cámara para escanear
                              </span>
                            </div>
                            <div className="absolute bottom-0 right-6 transform translate-y-full">
                              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-purple-600"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 text-center mt-2 font-medium">
                      {isMobile
                        ? 'Usa el lector de código o la cámara'
                        : 'El código se ingresará automáticamente al escanear'}
                    </p>
                  </div>

                  {quickAccessLoading && (
                    <div className="flex items-center justify-center py-3 bg-purple-50 rounded-xl border border-purple-200">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                      <span className="ml-3 text-purple-700 font-semibold">Verificando código...</span>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx="true">{`

        /* Button Styles */
        .electric-button {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%);
          background-size: 200% 200%;
          color: white;
          border: 1px solid rgba(59, 130, 246, 0.4);
          position: relative;
          overflow: hidden;
          animation: circuitButtonFlow 8s ease-in-out infinite;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
        }

        .electric-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent);
          animation: circuitButtonSweep 6s ease-in-out infinite;
        }

        @keyframes circuitButtonFlow {
          0%, 100% { background-position: 0% 50%; transform: translateY(0px); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2); }
          50% { background-position: 100% 50%; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3); }
        }

        @keyframes circuitButtonSweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        /* Scanner Effects */
        .scanner-effect {
          background: linear-gradient(45deg, transparent 30%, rgba(16, 185, 129, 0.05) 50%, transparent 70%);
          animation: circuitScannerMove 8s ease-in-out infinite;
        }

        @keyframes circuitScannerMove {
          0% { transform: translateX(-100%) translateY(-100%); opacity: 0; }
          50% { transform: translateX(0%) translateY(0%); opacity: 0.6; }
          100% { transform: translateX(100%) translateY(100%); opacity: 0; }
        }

        .laser-scan {
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent);
          animation: circuitLaserScan 4s ease-in-out infinite;
        }

        @keyframes circuitLaserScan {
          0% { transform: translateY(-6px); opacity: 0.3; }
          50% { transform: translateY(0px); opacity: 1; }
          100% { transform: translateY(6px); opacity: 0.3; }
        }

        /* Error Animation */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }

        .animate-shake {
          animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        /* Tooltip Animation */
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .electric-button, .scanner-effect, .laser-scan, .animate-fade-in {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default LoginModal;
