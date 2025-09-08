// components/LoginModal.jsx (FONDO ANIMADO ÉPICO)
import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, User, Lock, AlertCircle, QrCode, ArrowLeft, Search, Copyright } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const LoginModal = ({ isOpen, onClose }) => {
  const { login, loading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    sucursal: 'Principal',
    turno: 'matutino'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [quickAccessCode, setQuickAccessCode] = useState('');
  const [quickAccessLoading, setQuickAccessLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasQuickAccessError, setHasQuickAccessError] = useState(false);

  // Ref para auto-focus del input del escáner
  const scannerInputRef = useRef(null);

  // Auto-focus mejorado
  useEffect(() => {
    if (showQuickAccess && scannerInputRef.current && isOpen) {
      if (!quickAccessCode) {
        const timer = setTimeout(() => {
          scannerInputRef.current?.focus();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [showQuickAccess, isOpen, quickAccessCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (clearError && typeof clearError === 'function') {
      clearError();
    }

    // Reset error state
    setHasError(false);

    try {
      const user = await login({
        email: formData.email,
        password: formData.password,
        sucursal: formData.sucursal,
        turno: formData.turno
      });

      // Toast de bienvenida centralizado en authStore
      onClose();
      
    } catch (error) {
      console.error('Error en login:', error);
      toast.error(error.message || 'Error de autenticación. Verifica tus credenciales.');
      
      // Trigger error animation
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
    
    if (clearError && typeof clearError === 'function') {
      clearError();
    }

    try {
      const user = await login({
        token: code.trim()
      });

      // Toast de bienvenida centralizado en authStore
      onClose();
      
    } catch (error) {
      console.error('Error en acceso rápido:', error);
      toast.error(error.message || 'Código inválido ❌');
      
      // Trigger error animation for quick access
      setHasQuickAccessError(true);
      setTimeout(() => setHasQuickAccessError(false), 600);
      
      setTimeout(() => {
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
          scannerInputRef.current.select();
        }
      }, 1000);
    } finally {
      setQuickAccessLoading(false);
    }
  };

  const handleQuickAccessSubmit = (e) => {
    e.preventDefault();
    handleQuickAccessLogin(quickAccessCode);
  };

  const handleScannerInput = (e) => {
    setQuickAccessCode(e.target.value);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAccessLogin(e.target.value);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 💥 PIXEL BLAST BACKGROUND */}
      <div className="fixed inset-0 z-40">
        {/* Fondo base pixel */}
        <div className="absolute inset-0 pixel-background"></div>
        
        {/* Partículas pixel explosivas */}
        <div className="absolute inset-0 pixel-container">
          
          {/* Pixel explosions principales */}
          <div className="pixel-blast blast-1"></div>
          <div className="pixel-blast blast-2"></div>
          <div className="pixel-blast blast-3"></div>
          <div className="pixel-blast blast-4"></div>
          <div className="pixel-blast blast-5"></div>
          
          {/* Partículas pequeñas */}
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
          
          {/* Partículas cuadradas grandes */}
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
                '--scale': `${0.5 + Math.random() * 1}`,
              }}
            ></div>
          ))}
          
          {/* Micro partículas flotantes */}
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
          
          {/* Ondas de explosión */}
          <div className="blast-wave wave-1"></div>
          <div className="blast-wave wave-2"></div>
          <div className="blast-wave wave-3"></div>
          
          {/* Fragmentos pixelados */}
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

      {/* MODAL PRINCIPAL */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white/98 backdrop-blur-xl rounded-xl shadow-xl w-full max-w-md overflow-hidden relative border border-white/30 ring-1 ring-black/5">
          
          {/* Header con gradiente mejorado */}
          <div className={`relative overflow-hidden transition-all duration-700 ${
            showQuickAccess 
              ? 'bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800' 
              : 'bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800'
          }`}>
            {/* Efecto de onda de energía en el header */}
            <div className="absolute inset-0 header-energy-wave opacity-30"></div>
            
            {/* Partículas pequeñas en el header */}
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
            
            <div className="px-6 py-6 text-white text-center relative z-10">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <img
                    src="/favicon.svg"
                    alt="Logo Electro Caja"
                    className="h-24 w-24 object-contain shadow-none"
                  />
                </div>
              </div>
              <h1 className="text-xl font-bold electric-text tracking-wide">Electro Caja</h1>
              <p className="text-blue-100/80 text-xs mt-2 font-medium tracking-wider uppercase">
                Versión 1.0
              </p>
            </div>
          </div>

          {/* Contenido del formulario */}
          <div className="relative overflow-hidden" style={{ minHeight: '360px' }}>
            
            {/* LOGIN NORMAL */}
            <div 
              className={`transition-all duration-700 ease-in-out transform-gpu ${
                showQuickAccess 
                  ? 'translate-x-[-100%] opacity-0 scale-95' 
                  : 'translate-x-0 opacity-100 scale-100'
              } ${
                hasError ? 'animate-shake' : ''
              }`}
            >
              <div className="px-6 py-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Bienvenido</h2>
                  <p className="text-gray-500 text-xs font-medium">Ingresa tus credenciales para continuar</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="email">
                      Correo Electrónico
                    </label>
                    <div className="relative group">
                      <User className="pointer-events-none z-10 absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors duration-200 group-focus-within:text-blue-500" />
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-opacity-20 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal ${
                          hasError 
                            ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-600 hover:border-blue-300'
                        }`}
                        placeholder="email@electrocaja.com"
                        required
                        aria-describedby="email-error"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="password">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <Lock className="pointer-events-none z-10 absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors duration-200 group-focus-within:text-blue-500" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-12 pr-14 py-3 border rounded-xl focus:ring-2 focus:ring-opacity-20 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal ${
                          hasError 
                            ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-600 hover:border-blue-300'
                        }`}
                        placeholder="tu contraseña"
                        required
                        aria-describedby="password-error"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full electric-button py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-[1.01] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30"
                    aria-label="Iniciar sesión con credenciales"
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
                  <p className="text-xs text-gray-400 font-medium flex items-center justify-center">
                    <Copyright className="h-3 w-3 mr-1" />
                    2025 Electro Caja v1.0
                  </p>
                </div>
              </div>
            </div>

            {/* ACCESO RÁPIDO */}
            <div 
              className={`absolute inset-0 transition-all duration-700 ease-in-out transform-gpu ${
                showQuickAccess 
                  ? 'translate-x-0 opacity-100 scale-100' 
                  : 'translate-x-full opacity-0 scale-95'
              } ${
                hasQuickAccessError ? 'animate-shake' : ''
              }`}
            >
              <div className="px-6 py-6 flex flex-col justify-center" style={{ minHeight: '360px' }}>
                
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Rápido</h2>
                  <p className="text-gray-600 text-xs font-medium leading-relaxed">Escanea tu código QR de empleado<br/>o ingrésalo manualmente</p>
                </div>

                <div className="mb-6">
                  <div className="relative w-full h-28 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl border border-dashed border-purple-300 flex items-center justify-center mb-4 overflow-hidden shadow-inner">
                    
                    <div className="absolute inset-0 scanner-effect bg-gradient-to-r from-transparent via-purple-100/50 to-transparent"></div>
                    
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
                      <p className="text-sm font-semibold text-purple-600 mb-1">Escáner QR Activo</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleQuickAccessSubmit} className="space-y-5">
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
                      onKeyDown={handleScannerInput}
                      onFocus={(e) => e.target.select()}
                      placeholder="Escanea o ingresa tu código"
                      className={`w-full px-5 py-3 border rounded-xl focus:ring-2 focus:ring-opacity-20 text-center font-mono text-base tracking-widest transition-all duration-300 bg-white/90 backdrop-blur-sm hover:bg-white focus:bg-white shadow-md hover:shadow-lg font-bold ${
                        hasQuickAccessError 
                          ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50' 
                          : 'border-purple-300 focus:ring-purple-500 focus:border-purple-600 hover:border-purple-400'
                      }`}
                      disabled={quickAccessLoading}
                      autoComplete="off"
                      aria-describedby="qr-help"
                      maxLength="20"
                    />
                    <p id="qr-help" className="text-xs text-gray-500 text-center mt-1 font-medium">
                      El código se ingresará automáticamente al escanear
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

      {/* BOTÓN FLOTANTE */}
      <div 
        className="fixed z-[60]" 
        style={{ 
          bottom: 'calc(50vh - 320px)', 
          right: 'calc(50vw - 240px)' 
        }}
      >
        <button
          type="button"
          onClick={() => setShowQuickAccess(!showQuickAccess)}
          className={`group relative electric-floating-button w-12 h-12 rounded-full shadow-xl transform transition-all duration-700 hover:scale-105 flex items-center justify-center ${
            showQuickAccess 
              ? 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' 
              : 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
          }`}
        >
          <div className="absolute inset-0 rounded-full star-travel">
            <div className="absolute w-1 h-1 bg-white rounded-full shadow-lg shadow-white/50 -top-0.5 left-1/2 transform -translate-x-1/2 floating-star"></div>
          </div>
          
          <div className={`transition-transform duration-300 ${showQuickAccess ? 'rotate-180' : 'rotate-0'}`}>
            {showQuickAccess ? (
              <ArrowLeft className="h-5 w-5 text-white" />
            ) : (
              <QrCode className="h-5 w-5 text-white" />
            )}
          </div>
          
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 group-hover:animate-ping"></div>
          
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
            {showQuickAccess ? 'Volver al login' : 'Acceso rápido'}
            <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      </div>

      {/* ESTILOS CSS ÉPICOS */}
      <style jsx="true">{`
        
        /* 💥 PIXEL BLAST BACKGROUND */
        
        /* Fondo base pixel */
        .pixel-background {
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 50%, #0f1419 75%, #0a0a0f 100%);
          background-size: 400% 400%;
          background-position: 0% 50%;
        }

        /* Contenedor de partículas pixel */
        .pixel-container {
          overflow: hidden;
        }

        /* 💥 EXPLOSIONES PIXEL PRINCIPALES */
        .pixel-blast {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #74b9ff;
          border-radius: 1px;
          animation: pixelBlastExplosion 4s ease-out infinite;
          image-rendering: pixelated;
          box-shadow: 
            0 0 10px #74b9ff,
            0 0 20px rgba(116, 185, 255, 0.5);
        }

        /* Posiciones de explosiones */
        .blast-1 {
          top: 15%;
          left: 20%;
          animation-delay: 0s;
          background: #74b9ff;
          box-shadow: 0 0 10px #74b9ff, 0 0 20px rgba(116, 185, 255, 0.5);
        }

        .blast-2 {
          top: 40%;
          left: 70%;
          animation-delay: 1.5s;
          background: #ddd;
          box-shadow: 0 0 10px #ddd, 0 0 20px rgba(221, 221, 221, 0.5);
        }

        .blast-3 {
          top: 70%;
          left: 30%;
          animation-delay: 3s;
          background: #0984e3;
          box-shadow: 0 0 10px #0984e3, 0 0 20px rgba(9, 132, 227, 0.5);
        }

        .blast-4 {
          top: 25%;
          left: 80%;
          animation-delay: 2s;
          background: #b2bec3;
          box-shadow: 0 0 10px #b2bec3, 0 0 20px rgba(178, 190, 195, 0.5);
        }

        .blast-5 {
          top: 60%;
          left: 10%;
          animation-delay: 0.5s;
          background: #ffffff;
          box-shadow: 0 0 10px #ffffff, 0 0 20px rgba(255, 255, 255, 0.5);
        }

        @keyframes pixelBlastExplosion {
          0% { 
            transform: scale(0); 
            opacity: 0;
          }
          10% { 
            transform: scale(1); 
            opacity: 1;
          }
          20% {
            transform: scale(3);
            opacity: 0.8;
          }
          40% {
            transform: scale(6);
            opacity: 0.4;
          }
          60% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% { 
            transform: scale(0); 
            opacity: 0;
          }
        }

        /* 💫 PARTÍCULAS PIXEL */
        .pixel-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ff6b6b;
          border-radius: 1px;
          animation: pixelParticleFloat var(--duration, 4s) ease-in-out infinite var(--delay, 0s);
          image-rendering: pixelated;
          opacity: 0;
        }

        @keyframes pixelParticleFloat {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          10% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(var(--end-x, 50px), var(--end-y, -50px)) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(calc(var(--end-x, 50px) * 2), calc(var(--end-y, -50px) * 2)) scale(0);
          }
        }

        .pixel-particle:nth-child(2n) { background: #74b9ff; }
        .pixel-particle:nth-child(3n) { background: #0984e3; }
        .pixel-particle:nth-child(4n) { background: #ddd; }
        .pixel-particle:nth-child(5n) { background: #b2bec3; }
        .pixel-particle:nth-child(6n) { background: #ffffff; }
        .pixel-particle:nth-child(7n) { background: #636e72; }

        /* 🌊 ONDAS DE EXPLOSIÓN */
        .blast-wave {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid #ff6b6b;
          border-radius: 50%;
          animation: pixelWaveExpand 3s ease-out infinite;
          opacity: 0;
        }

        .wave-1 {
          top: 20%;
          left: 40%;
          animation-delay: 0s;
          border-color: #74b9ff;
        }

        .wave-2 {
          top: 60%;
          left: 60%;
          animation-delay: 1s;
          border-color: #ddd;
        }

        .wave-3 {
          top: 40%;
          left: 20%;
          animation-delay: 2s;
          border-color: #0984e3;
        }

        @keyframes pixelWaveExpand {
          0% {
            transform: scale(0);
            opacity: 1;
            border-width: 4px;
          }
          50% {
            transform: scale(5);
            opacity: 0.6;
            border-width: 2px;
          }
          100% {
            transform: scale(10);
            opacity: 0;
            border-width: 1px;
          }
        }

        /* 🧪 FRAGMENTOS PIXELADOS */
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
          0% {
            opacity: 0;
            transform: rotate(0deg) scale(0);
          }
          10% {
            opacity: 1;
            transform: rotate(var(--rotate, 45deg)) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: rotate(calc(var(--rotate, 45deg) + 180deg)) scale(1.5);
          }
          80% {
            opacity: 0.3;
            transform: rotate(calc(var(--rotate, 45deg) + 270deg)) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: rotate(calc(var(--rotate, 45deg) + 360deg)) scale(0);
          }
        }

        .pixel-fragment:nth-child(2n) { background: linear-gradient(45deg, #74b9ff, #0984e3); }
        .pixel-fragment:nth-child(3n) { background: linear-gradient(45deg, #ddd, #b2bec3); }
        .pixel-fragment:nth-child(4n) { background: linear-gradient(45deg, #ffffff, #636e72); }

        /* 💥 EFECTOS PIXEL ADICIONALES */
        
        /* Partículas cuadradas grandes */
        .square-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #74b9ff;
          border-radius: 0;
          animation: squareParticleDance var(--duration, 5s) ease-in-out infinite var(--delay, 0s);
          image-rendering: pixelated;
          opacity: 0;
          transform: scale(var(--scale, 1));
        }

        @keyframes squareParticleDance {
          0% {
            opacity: 0;
            transform: rotate(0deg) scale(var(--scale, 1));
          }
          15% {
            opacity: 0.8;
            transform: rotate(var(--rotate, 45deg)) scale(calc(var(--scale, 1) * 1.2));
          }
          50% {
            opacity: 1;
            transform: rotate(calc(var(--rotate, 45deg) * 2)) scale(var(--scale, 1));
          }
          85% {
            opacity: 0.6;
            transform: rotate(calc(var(--rotate, 45deg) * 3)) scale(calc(var(--scale, 1) * 0.8));
          }
          100% {
            opacity: 0;
            transform: rotate(calc(var(--rotate, 45deg) * 4)) scale(0);
          }
        }
        
        .square-particle:nth-child(2n) { background: #0984e3; }
        .square-particle:nth-child(3n) { background: #ddd; }
        .square-particle:nth-child(4n) { background: #b2bec3; }
        .square-particle:nth-child(5n) { background: #ffffff; }
        .square-particle:nth-child(6n) { background: #636e72; }
        
        /* Micro partículas flotantes */
        .micro-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #74b9ff;
          border-radius: 0;
          animation: microParticleFloat var(--duration, 7s) linear infinite var(--delay, 0s);
          image-rendering: pixelated;
          opacity: 0;
        }

        @keyframes microParticleFloat {
          0% {
            opacity: 0;
            transform: translate(0, 0);
          }
          10% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
            transform: translate(var(--drift-x, 50px), var(--drift-y, -50px));
          }
          90% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
            transform: translate(calc(var(--drift-x, 50px) * 2), calc(var(--drift-y, -50px) * 2));
          }
        }
        
        .micro-particle:nth-child(2n) { background: #0984e3; }
        .micro-particle:nth-child(3n) { background: #ddd; }
        .micro-particle:nth-child(4n) { background: #b2bec3; }
        .micro-particle:nth-child(5n) { background: #ffffff; }
        .micro-particle:nth-child(6n) { background: #636e72; }

        /* 💫 EFECTOS PIXEL RESPONSIVOS */
        
        /* Responsividad para pixel art */
        @media (max-width: 640px) {
          .pixel-blast { width: 6px; height: 6px; }
          .pixel-particle { width: 3px; height: 3px; }
          .pixel-fragment { width: 4px; height: 4px; }
          .blast-wave { width: 15px; height: 15px; }
          .square-particle { width: 6px; height: 6px; }
          .micro-particle { width: 1px; height: 1px; }
        }
        
        @media (max-width: 480px) {
          .pixel-blast { width: 4px; height: 4px; }
          .pixel-particle { width: 2px; height: 2px; }
          .pixel-fragment { width: 3px; height: 3px; }
          .blast-wave { width: 12px; height: 12px; }
          .square-particle { width: 4px; height: 4px; }
          .micro-particle { width: 1px; height: 1px; }
        }

        /* 📱 RESPONSIVO */
        @media (max-width: 640px) {
          .circuit-line {
            height: 1px;
          }
          
          .circuit-line-1, .circuit-line-3 { width: 200px; }
          .circuit-line-2 { width: 150px; }
          .circuit-line-4 { width: 120px; }
          
          .isometric-led { width: 6px; height: 6px; }
          .isometric-resistor { width: 12px; height: 4px; }
          .isometric-chip { width: 15px; height: 15px; }
          .circuit-connector { width: 4px; height: 4px; }
          .current-flow { width: 3px; height: 3px; }
        }

        /* ♿ ACCESIBILIDAD */
        @media (prefers-reduced-motion: reduce) {
          .circuit-background,
          .circuit-line,
          .led-light,
          .isometric-resistor,
          .isometric-chip,
          .chip-processing,
          .circuit-connector,
          .current-flow {
            animation: none !important;
          }
          
          .circuit-line {
            opacity: 0.4;
            transform: scaleX(1);
          }
          
          .led-light {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* 🎨 EFECTOS PIXEL DEL HEADER */
        .header-energy-wave {
          background: linear-gradient(45deg, 
            transparent, 
            rgba(116, 185, 255, 0.1), 
            rgba(221, 221, 221, 0.1), 
            transparent
          );
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
          0%, 70% { 
            transform: translateY(0px) scale(0.8); 
            opacity: 0.3; 
          }
          85% { 
            transform: translateY(-20px) scale(1.2); 
            opacity: 1; 
          }
          100% { 
            transform: translateY(0px) scale(0.8); 
            opacity: 0.3; 
          }
        }

        .header-logo-glow {
          animation: headerLogoPixelGlow 5s ease-in-out infinite alternate;
        }

        @keyframes headerLogoPixelGlow {
          0% { 
            filter: drop-shadow(0 0 10px rgba(116, 185, 255, 0.4)) 
                    drop-shadow(0 0 20px rgba(221, 221, 221, 0.3)); 
          }
          100% { 
            filter: drop-shadow(0 0 16px rgba(116, 185, 255, 0.6)) 
                    drop-shadow(0 0 32px rgba(221, 221, 221, 0.4)); 
          }
        }

        .header-logo-pulse {
          background: radial-gradient(circle, rgba(116, 185, 255, 0.15), transparent);
          animation: headerLogoPixelPulse 6s ease-in-out infinite;
        }

        @keyframes headerLogoPixelPulse {
          0%, 60% { transform: scale(0.8); opacity: 0; }
          80% { transform: scale(1.4); opacity: 0.4; }
          100% { transform: scale(0.8); opacity: 0; }
        }

        /* 🗺 TEXTO PIXEL */
        .electric-text {
          text-shadow: 
            0 0 5px rgba(116, 185, 255, 0.8),
            0 0 10px rgba(221, 221, 221, 0.6),
            0 0 15px rgba(9, 132, 227, 0.4);
          animation: pixelTextGlow 6s ease-in-out infinite alternate;
        }

        @keyframes pixelTextGlow {
          0% { 
            text-shadow: 
              0 0 5px rgba(116, 185, 255, 0.8),
              0 0 10px rgba(221, 221, 221, 0.6); 
          }
          100% { 
            text-shadow: 
              0 0 8px rgba(116, 185, 255, 1),
              0 0 16px rgba(221, 221, 221, 0.8),
              0 0 24px rgba(9, 132, 227, 0.6),
              0 0 32px rgba(255, 255, 255, 0.4); 
          }
        }

        /* 🔌 BOTONES CIRCUITO */
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
          background: linear-gradient(90deg, 
            transparent, 
            rgba(16, 185, 129, 0.2), 
            transparent
          );
          animation: circuitButtonSweep 6s ease-in-out infinite;
        }

        @keyframes circuitButtonFlow {
          0%, 100% { 
            background-position: 0% 50%; 
            transform: translateY(0px);
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
          }
          50% { 
            background-position: 100% 50%; 
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
          }
        }

        @keyframes circuitButtonSweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .electric-button-purple {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%);
          background-size: 200% 200%;
          color: white;
          border: 1px solid rgba(168, 85, 247, 0.4);
          position: relative;
          overflow: hidden;
          animation: circuitButtonFlow 8s ease-in-out infinite;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.2);
        }

        .electric-button-purple::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(124, 58, 237, 0.2), 
            transparent
          );
          animation: circuitButtonSweep 6s ease-in-out infinite;
        }

        /* 🔌 BOTÓN FLOTANTE CIRCUITO */
        .electric-floating-button {
          background: linear-gradient(45deg, var(--tw-gradient-from), var(--tw-gradient-to));
          border: 1px solid rgba(16, 185, 129, 0.3);
          position: relative;
          overflow: hidden;
          animation: floatingCircuitButtonPulse 8s ease-in-out infinite;
        }

        .electric-floating-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, 
            rgba(16, 185, 129, 0.1), 
            transparent 70%
          );
          animation: floatingCircuitButtonRipple 6s ease-in-out infinite;
        }

        @keyframes floatingCircuitButtonPulse {
          0%, 100% { 
            box-shadow: 
              0 0 15px rgba(16, 185, 129, 0.3),
              0 0 30px rgba(6, 182, 212, 0.2);
            border-color: rgba(16, 185, 129, 0.3);
          }
          50% { 
            box-shadow: 
              0 0 25px rgba(16, 185, 129, 0.5),
              0 0 50px rgba(6, 182, 212, 0.3),
              0 0 75px rgba(16, 185, 129, 0.1);
            border-color: rgba(6, 182, 212, 0.5);
          }
        }

        @keyframes floatingCircuitButtonRipple {
          0%, 70% { transform: scale(0.9); opacity: 0; }
          85% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(0.9); opacity: 0; }
        }

        /* 🔌 ESTRELLA CIRCUITO */
        .star-travel {
          animation: circuitStarTravel 15s linear infinite;
        }

        .floating-star {
          background: radial-gradient(circle, #10b981, transparent);
          box-shadow: 0 0 4px rgba(16, 185, 129, 0.8);
        }

        @keyframes circuitStarTravel {
          0% { transform: rotate(0deg); opacity: 0.3; }
          50% { transform: rotate(180deg); opacity: 0.8; }
          100% { transform: rotate(360deg); opacity: 0.3; }
        }

        /* 🔌 EFECTO ESCÁNER CIRCUITO */
        .scanner-effect {
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(16, 185, 129, 0.05) 50%,
            transparent 70%
          );
          animation: circuitScannerMove 8s ease-in-out infinite;
        }

        @keyframes circuitScannerMove {
          0% { 
            transform: translateX(-100%) translateY(-100%); 
            opacity: 0; 
          }
          50% { 
            transform: translateX(0%) translateY(0%); 
            opacity: 0.6; 
          }
          100% { 
            transform: translateX(100%) translateY(100%); 
            opacity: 0; 
          }
        }

        /* 🔌 LÁSER SCAN CIRCUITO */
        .laser-scan {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(16, 185, 129, 0.8), 
            transparent
          );
          animation: circuitLaserScan 4s ease-in-out infinite;
        }

        @keyframes circuitLaserScan {
          0% { 
            transform: translateY(-6px);
            opacity: 0.3;
          }
          50% { 
            transform: translateY(0px);
            opacity: 1;
          }
          100% { 
            transform: translateY(6px);
            opacity: 0.3;
          }
        }

        /* 🔌 REFLEJO CIRCUITO */
        @keyframes circuitGleam {
          0% { 
            transform: translateX(-100%) skewX(-15deg); 
            background: linear-gradient(90deg, 
              transparent, 
              rgba(16, 185, 129, 0.2), 
              transparent
            );
          }
          100% { 
            transform: translateX(200%) skewX(-15deg); 
            background: linear-gradient(90deg, 
              transparent, 
              rgba(6, 182, 212, 0.3), 
              transparent
            );
          }
        }

        .animate-gleam {
          animation: circuitGleam 15s ease-in-out infinite;
        }

        /* 🔌 PULSO CIRCUITO */
        .animate-slow-pulse {
          animation: circuitSlowPulse 8s ease-in-out infinite;
        }

        @keyframes circuitSlowPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            filter: brightness(1);
          }
          50% { 
            opacity: 0.9; 
            transform: scale(1.02);
            filter: brightness(1.1);
          }
        }
          /* 📱 RESPONSIVIDAD COMPLETA */
        
        /* Tablets (768px y menor) */
        @media (max-width: 768px) {
          .pcb-container {
            perspective: 800px;
          }
          
          .circuit-line {
            height: 1.5px;
          }
          
          .circuit-line-1 { width: 250px; left: 10%; }
          .circuit-line-2 { width: 180px; left: 10%; }
          .circuit-line-3 { width: 220px; left: 15%; }
          .circuit-line-4 { width: 150px; left: 35%; }
          
          .isometric-chip {
            width: 18px;
            height: 18px;
            left: 35%;
          }
        }
        
        /* Móviles (640px y menor) */
        @media (max-width: 640px) {
          .pcb-container {
            perspective: 600px;
          }
          
          .circuit-line {
            height: 1px;
          }
          
          .circuit-line-1 { 
            width: 180px; 
            left: 8%; 
            top: 25%;
          }
          .circuit-line-2 { 
            width: 120px; 
            left: 8%; 
            top: 25%;
          }
          .circuit-line-3 { 
            width: 160px; 
            left: 12%; 
            top: 55%;
          }
          .circuit-line-4 { 
            width: 100px; 
            left: 30%; 
            top: 35%;
          }
          
          .isometric-led { 
            width: 6px; 
            height: 6px; 
          }
          
          .led-1 { 
            top: 23%; 
            left: 20%; 
          }
          .led-2 { 
            top: 53%; 
            left: 45%; 
          }
          
          .isometric-resistor { 
            width: 12px; 
            height: 4px; 
          }
          
          .resistor-1 { 
            top: 30%; 
            left: 15%; 
          }
          .resistor-2 { 
            top: 45%; 
            left: 50%; 
          }
          
          .isometric-chip { 
            width: 15px; 
            height: 15px; 
            top: 35%; 
            left: 32%; 
          }
          
          .circuit-connector { 
            width: 4px; 
            height: 4px; 
          }
          
          .connector-1 { top: 25%; left: 20%; }
          .connector-2 { top: 30%; left: 12%; }
          .connector-3 { top: 25%; left: 35%; }
          .connector-4 { top: 55%; left: 25%; }
          .connector-5 { top: 55%; left: 45%; }
          .connector-6 { top: 40%; left: 50%; }
          
          .current-flow { 
            width: 3px; 
            height: 3px; 
          }
          
          /* Ajustar animación de corriente para móvil */
          @keyframes currentMove {
            0% { 
              top: 25%; 
              left: 12%; 
              opacity: 0; 
            }
            25% { 
              top: 25%; 
              left: 25%; 
              opacity: 1; 
            }
            50% { 
              top: 35%; 
              left: 35%; 
              opacity: 0.8; 
            }
            75% { 
              top: 55%; 
              left: 45%; 
              opacity: 0.6; 
            }
            100% { 
              top: 55%; 
              left: 55%; 
              opacity: 0; 
            }
          }
        }
        
        /* Móviles pequeños (480px y menor) */
        @media (max-width: 480px) {
          .circuit-line-1, .circuit-line-3 { width: 140px; }
          .circuit-line-2 { width: 100px; }
          .circuit-line-4 { width: 80px; }
          
          .isometric-led { width: 5px; height: 5px; }
          .isometric-resistor { width: 10px; height: 3px; }
          .isometric-chip { width: 12px; height: 12px; }
          .circuit-connector { width: 3px; height: 3px; }
          .current-flow { width: 2px; height: 2px; }
        }

        /* ♿ ACCESIBILIDAD COMPLETA */
        @media (prefers-reduced-motion: reduce) {
          /* Deshabilitar todas las animaciones */
          .circuit-background,
          .circuit-line,
          .led-light,
          .isometric-resistor,
          .isometric-chip,
          .chip-processing,
          .circuit-connector,
          .current-flow,
          .header-energy-wave,
          .header-particle,
          .header-logo-glow,
          .header-logo-pulse,
          .electric-text,
          .electric-button,
          .electric-button-purple,
          .electric-floating-button,
          .star-travel,
          .scanner-effect,
          .laser-scan,
          .animate-gleam,
          .animate-slow-pulse {
            animation: none !important;
            transition: none !important;
          }
          
          /* Estados estáticos para elementos animados */
          .circuit-background {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          }
          
          .circuit-line {
            opacity: 0.5;
            transform: scaleX(1);
            background: rgba(16, 185, 129, 0.4);
          }
          
          .led-light {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(1);
          }
          
          .led-1 .led-light {
            background: #ef4444;
            box-shadow: 0 0 4px #ef4444;
          }
          
          .led-2 .led-light {
            background: #10b981;
            box-shadow: 0 0 4px #10b981;
          }
          
          .circuit-connector {
            background: #06b6d4;
            box-shadow: 0 0 4px rgba(6, 182, 212, 0.6);
          }
          
          .current-flow {
            opacity: 0.6;
            position: static;
            display: none; /* Ocultar flujo en modo sin animaciones */
          }
          
          .electric-button,
          .electric-button-purple {
            background: #1e293b;
            border-color: rgba(16, 185, 129, 0.5);
          }
          
          .electric-floating-button {
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
            border-color: rgba(16, 185, 129, 0.4);
          }
          
          .electric-text {
            text-shadow: 0 0 6px rgba(16, 185, 129, 0.7);
          }
        }

        /* 🌙 MODO OSCURO MEJORADO */
        @media (prefers-color-scheme: dark) {
          .circuit-background {
            background: linear-gradient(135deg, #000000 0%, #111827 50%, #000000 100%);
          }
          
          .circuit-line {
            background: linear-gradient(90deg, 
              transparent 0%, 
              rgba(34, 197, 94, 0.4) 10%, 
              rgba(34, 197, 94, 0.7) 50%, 
              rgba(34, 197, 94, 0.4) 90%, 
              transparent 100%
            );
          }
          
          .isometric-chip {
            background: #000000;
            box-shadow: 
              3px 3px 6px rgba(0, 0, 0, 0.6),
              inset 2px 2px 4px rgba(34, 197, 94, 0.1);
          }
          
          .electric-button,
          .electric-button-purple {
            background: linear-gradient(45deg, #000000, #111827, #000000);
            border-color: rgba(34, 197, 94, 0.4);
          }
        }

        /* 🎯 ANIMACIÓN DE VIBRACIÓN ERROR */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-10px); }
          20% { transform: translateX(10px); }
          30% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          50% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          70% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
          90% { transform: translateX(-2px); }
        }

        .animate-shake {
          animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        /* 🔍 MODO ALTO CONTRASTE */
        @media (prefers-contrast: high) {
          .circuit-line {
            background: rgba(16, 185, 129, 0.8);
            height: 3px;
          }
          
          .led-light {
            box-shadow: 
              0 0 8px currentColor, 
              0 0 16px currentColor;
          }
          
          .circuit-connector {
            background: #06b6d4;
            box-shadow: 0 0 8px #06b6d4;
            width: 8px;
            height: 8px;
          }
          
          .electric-text {
            text-shadow: 
              0 0 2px rgba(16, 185, 129, 1),
              0 0 4px rgba(16, 185, 129, 1);
          }
          
          .electric-button,
          .electric-button-purple {
            border: 2px solid rgba(16, 185, 129, 0.8);
            background: rgba(16, 185, 129, 0.1);
          }
        }

        /* 💻 PANTALLAS GRANDES (1440px y mayor) */
        @media (min-width: 1440px) {
          .circuit-line {
            height: 3px;
          }
          
          .circuit-line-1 { width: 400px; }
          .circuit-line-2 { width: 300px; }
          .circuit-line-3 { width: 350px; }
          .circuit-line-4 { width: 250px; }
          
          .isometric-led { width: 10px; height: 10px; }
          .isometric-resistor { width: 20px; height: 8px; }
          .isometric-chip { width: 25px; height: 25px; }
          .circuit-connector { width: 8px; height: 8px; }
          .current-flow { width: 6px; height: 6px; }
        }

        /* 🖱️ DISPOSITIVOS CON HOVER */
        @media (hover: hover) {
          .electric-button:hover {
            border-color: rgba(6, 182, 212, 0.7);
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
          }
          
          .electric-button-purple:hover {
            border-color: rgba(168, 85, 247, 0.7);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
          }
          
          .electric-floating-button:hover {
            transform: scale(1.05);
          }
        }

        /* 📱 ORIENTACIÓN LANDSCAPE EN MÓVILES */
        @media (max-width: 768px) and (orientation: landscape) {
          .circuit-line-1 { top: 15%; width: 200px; }
          .circuit-line-2 { top: 15%; width: 140px; }
          .circuit-line-3 { top: 65%; width: 180px; }
          .circuit-line-4 { top: 40%; width: 120px; }
          
          .led-1 { top: 13%; }
          .led-2 { top: 63%; }
          
          .resistor-1 { top: 25%; }
          .resistor-2 { top: 55%; }
          
          .isometric-chip { top: 40%; }
          
          .connector-1 { top: 15%; }
          .connector-4 { top: 65%; }
          .connector-5 { top: 65%; }
        }
        
     `}</style>
   </>
 );
};

export default LoginModal;



