// components/LoginModal.jsx - Refactored Modern Luxury Login
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, User, Lock, QrCode, ArrowLeft, Camera, X, Copyright } from 'lucide-react';
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
      {/* Pixel Blast Animated Background */}
      <div className="fixed inset-0 z-40 pointer-events-none" style={{ willChange: 'auto' }}>
        <div className="absolute inset-0 pixel-background"></div>
        <div className="absolute inset-0 pixel-container" style={{ willChange: 'auto' }}>
          {/* Pixel explosions */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`blast-${i}`} className={`pixel-blast blast-${i}`}></div>
          ))}

          {/* Pixel particles */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={`pixel-particle-${i}`}
              className="pixel-particle"
              style={{
                '--delay': `${i * 0.15}s`,
                '--duration': `${2.5 + Math.random() * 2}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                '--end-x': `${(Math.random() - 0.5) * 250}px`,
                '--end-y': `${(Math.random() - 0.5) * 250}px`
              }}
            ></div>
          ))}

          {/* Square particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`square-particle-${i}`}
              className="square-particle"
              style={{
                '--delay': `${i * 0.4}s`,
                '--duration': `${4 + Math.random() * 2}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                '--rotate': `${Math.random() * 360}deg`,
                '--scale': `${0.5 + Math.random() * 1}`
              }}
            ></div>
          ))}

          {/* Micro particles */}
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={`micro-particle-${i}`}
              className="micro-particle"
              style={{
                '--delay': `${i * 0.1}s`,
                '--duration': `${6 + Math.random() * 3}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                '--drift-x': `${(Math.random() - 0.5) * 100}px`,
                '--drift-y': `${(Math.random() - 0.5) * 100}px`
              }}
            ></div>
          ))}

          {/* Blast waves */}
          {[1, 2, 3].map((i) => (
            <div key={`wave-${i}`} className={`blast-wave wave-${i}`}></div>
          ))}

          {/* Pixel fragments */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={`pixel-fragment-${i}`}
              className="pixel-fragment"
              style={{
                '--delay': `${i * 0.3}s`,
                left: `${20 + i * 5}%`,
                top: `${30 + Math.random() * 40}%`,
                '--rotate': `${Math.random() * 360}deg`
              }}
            ></div>
          ))}
        </div>
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

              {/* Tooltip */}
              <div className="
                hidden md:block
                absolute top-full right-0 mt-2
                px-3 py-1.5 bg-gray-900/95 backdrop-blur-sm
                text-white text-xs font-medium rounded-lg
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                pointer-events-none whitespace-nowrap
                shadow-xl
              ">
                {showQuickAccess ? 'Volver al Login' : 'Acceso Rápido QR'}
                <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900/95"></div>
              </div>
            </button>
          </div>

          {/* Header */}
          <div className={`relative overflow-hidden transition-all duration-700 ${
            showQuickAccess
              ? 'bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800'
              : 'bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800'
          }`}>
            <div className="absolute inset-0 header-energy-wave opacity-30"></div>

            {/* Header particles */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`header-particle-${i}`}
                className="header-particle"
                style={{
                  '--delay': `${i * 0.3}s`,
                  left: `${20 + i * 15}%`,
                  top: `${30 + Math.random() * 40}%`
                }}
              ></div>
            ))}

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
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido</h2>
                  <p className="text-gray-600 text-sm">Ingresa tus credenciales</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="email">
                      Correo Electrónico
                    </label>
                    <div className="relative group">
                      <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors duration-200 group-focus-within:text-blue-500" />
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-12 pr-4 py-3 text-base border rounded-xl focus:ring-2 focus:ring-opacity-20 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal ${
                          hasError
                            ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-600 hover:border-blue-300'
                        }`}
                        placeholder="email@electrocaja.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="password">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors duration-200 group-focus-within:text-blue-500" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-12 pr-14 py-3 text-base border rounded-xl focus:ring-2 focus:ring-opacity-20 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal ${
                          hasError
                            ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-600 hover:border-blue-300'
                        }`}
                        placeholder="tu contraseña"
                        required
                      />
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
                    className="w-full electric-button py-3 px-4 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-[1.01] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30"
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
                    2025 Electro Caja v1.0
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

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Rápido</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">
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
                      <button
                        type="button"
                        onClick={startCameraScanner}
                        className="absolute right-2 top-9 bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors shadow-md"
                        title="Usar cámara para escanear"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
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
        /* Pixel Blast Background - Optimized */
        .pixel-background {
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 50%, #0f1419 75%, #0a0a0f 100%);
          background-size: 400% 400%;
          contain: layout style paint;
        }

        .pixel-container {
          overflow: hidden;
          contain: layout style paint;
          isolation: isolate;
        }

        /* Pixel Blast Animations - GPU Accelerated */
        .pixel-blast {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 1px;
          animation: pixelBlastExplosion 4s ease-out infinite;
          image-rendering: pixelated;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        .blast-1 { top: 15%; left: 20%; animation-delay: 0s; background: #74b9ff; box-shadow: 0 0 10px #74b9ff; }
        .blast-2 { top: 40%; left: 70%; animation-delay: 1.5s; background: #ddd; box-shadow: 0 0 10px #ddd; }
        .blast-3 { top: 70%; left: 30%; animation-delay: 3s; background: #0984e3; box-shadow: 0 0 10px #0984e3; }
        .blast-4 { top: 25%; left: 80%; animation-delay: 2s; background: #b2bec3; box-shadow: 0 0 10px #b2bec3; }
        .blast-5 { top: 60%; left: 10%; animation-delay: 0.5s; background: #ffffff; box-shadow: 0 0 10px #ffffff; }

        @keyframes pixelBlastExplosion {
          0% { transform: scale(0); opacity: 0; }
          10% { transform: scale(1); opacity: 1; }
          20% { transform: scale(3); opacity: 0.8; }
          40% { transform: scale(6); opacity: 0.4; }
          60% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(0); opacity: 0; }
        }

        .pixel-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ff6b6b;
          border-radius: 1px;
          animation: pixelParticleFloat var(--duration, 4s) ease-in-out infinite var(--delay, 0s);
          image-rendering: pixelated;
          opacity: 0;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        @keyframes pixelParticleFloat {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          10% { opacity: 1; transform: translate(0, 0) scale(1); }
          50% { opacity: 0.8; transform: translate(var(--end-x, 50px), var(--end-y, -50px)) scale(1.2); }
          100% { opacity: 0; transform: translate(calc(var(--end-x, 50px) * 2), calc(var(--end-y, -50px) * 2)) scale(0); }
        }

        .pixel-particle:nth-child(2n) { background: #74b9ff; }
        .pixel-particle:nth-child(3n) { background: #0984e3; }
        .pixel-particle:nth-child(4n) { background: #ddd; }
        .pixel-particle:nth-child(5n) { background: #b2bec3; }
        .pixel-particle:nth-child(6n) { background: #ffffff; }

        .square-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #74b9ff;
          border-radius: 0;
          animation: squareParticleDance var(--duration, 5s) ease-in-out infinite var(--delay, 0s);
          image-rendering: pixelated;
          opacity: 0;
          transform: scale(var(--scale, 1)) translateZ(0);
          will-change: transform, opacity;
        }

        @keyframes squareParticleDance {
          0% { opacity: 0; transform: rotate(0deg) scale(var(--scale, 1)); }
          15% { opacity: 0.8; transform: rotate(var(--rotate, 45deg)) scale(calc(var(--scale, 1) * 1.2)); }
          50% { opacity: 1; transform: rotate(calc(var(--rotate, 45deg) * 2)) scale(var(--scale, 1)); }
          85% { opacity: 0.6; transform: rotate(calc(var(--rotate, 45deg) * 3)) scale(calc(var(--scale, 1) * 0.8)); }
          100% { opacity: 0; transform: rotate(calc(var(--rotate, 45deg) * 4)) scale(0); }
        }

        .square-particle:nth-child(2n) { background: #0984e3; }
        .square-particle:nth-child(3n) { background: #ddd; }
        .square-particle:nth-child(4n) { background: #b2bec3; }

        .micro-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #74b9ff;
          border-radius: 0;
          animation: microParticleFloat var(--duration, 7s) linear infinite var(--delay, 0s);
          image-rendering: pixelated;
          opacity: 0;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        @keyframes microParticleFloat {
          0% { opacity: 0; transform: translate(0, 0); }
          10% { opacity: 0.6; }
          50% { opacity: 1; transform: translate(var(--drift-x, 50px), var(--drift-y, -50px)); }
          90% { opacity: 0.4; }
          100% { opacity: 0; transform: translate(calc(var(--drift-x, 50px) * 2), calc(var(--drift-y, -50px) * 2)); }
        }

        .micro-particle:nth-child(2n) { background: #0984e3; }
        .micro-particle:nth-child(3n) { background: #ddd; }

        .blast-wave {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid #ff6b6b;
          border-radius: 50%;
          animation: pixelWaveExpand 3s ease-out infinite;
          opacity: 0;
        }

        .wave-1 { top: 20%; left: 40%; animation-delay: 0s; border-color: #74b9ff; }
        .wave-2 { top: 60%; left: 60%; animation-delay: 1s; border-color: #ddd; }
        .wave-3 { top: 40%; left: 20%; animation-delay: 2s; border-color: #0984e3; }

        @keyframes pixelWaveExpand {
          0% { transform: scale(0); opacity: 1; border-width: 4px; }
          50% { transform: scale(5); opacity: 0.6; border-width: 2px; }
          100% { transform: scale(10); opacity: 0; border-width: 1px; }
        }

        .pixel-fragment {
          position: absolute;
          width: 6px;
          height: 6px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          border-radius: 1px;
          animation: pixelFragmentSpin 5s linear infinite var(--delay, 0s);
          image-rendering: pixelated;
          opacity: 0;
        }

        @keyframes pixelFragmentSpin {
          0% { opacity: 0; transform: rotate(0deg) scale(0); }
          10% { opacity: 1; transform: rotate(var(--rotate, 45deg)) scale(1); }
          50% { opacity: 0.7; transform: rotate(calc(var(--rotate, 45deg) + 180deg)) scale(1.5); }
          80% { opacity: 0.3; transform: rotate(calc(var(--rotate, 45deg) + 270deg)) scale(0.8); }
          100% { opacity: 0; transform: rotate(calc(var(--rotate, 45deg) + 360deg)) scale(0); }
        }

        .pixel-fragment:nth-child(2n) { background: linear-gradient(45deg, #74b9ff, #0984e3); }
        .pixel-fragment:nth-child(3n) { background: linear-gradient(45deg, #ddd, #b2bec3); }

        /* Header Effects */
        .header-energy-wave {
          background: linear-gradient(45deg, transparent, rgba(116, 185, 255, 0.1), rgba(221, 221, 221, 0.1), transparent);
          animation: headerPixelWave 10s ease-in-out infinite;
        }

        @keyframes headerPixelWave {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(0%); opacity: 0.8; }
          100% { transform: translateX(100%); opacity: 0; }
        }

        .header-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: #74b9ff;
          border-radius: 1px;
          image-rendering: pixelated;
          animation: headerPixelParticle 6s ease-in-out infinite var(--delay);
        }

        @keyframes headerPixelParticle {
          0%, 70% { transform: translateY(0px) scale(0.8); opacity: 0.3; }
          85% { transform: translateY(-20px) scale(1.2); opacity: 1; }
          100% { transform: translateY(0px) scale(0.8); opacity: 0.3; }
        }

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

        /* Responsive */
        @media (max-width: 640px) {
          .pixel-blast { width: 6px; height: 6px; }
          .pixel-particle { width: 3px; height: 3px; }
          .square-particle { width: 6px; height: 6px; }
          .micro-particle { width: 1px; height: 1px; }
          .blast-wave { width: 15px; height: 15px; }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .pixel-blast, .pixel-particle, .square-particle, .micro-particle, .blast-wave, .pixel-fragment,
          .header-energy-wave, .header-particle, .electric-button, .scanner-effect, .laser-scan {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default LoginModal;
