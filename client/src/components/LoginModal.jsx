// components/LoginModal.jsx (FONDO ANIMADO ÉPICO)
import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, User, Lock, AlertCircle, QrCode, ArrowLeft } from 'lucide-react';
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

    try {
      const user = await login({
        email: formData.email,
        password: formData.password,
        sucursal: formData.sucursal,
        turno: formData.turno
      });

      toast.success(`¡Bienvenido ${user.nombre}!`);
      onClose();
      
    } catch (error) {
      console.error('Error en login:', error);
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

      toast.success(`¡Bienvenido ${user.nombre}! 📱`);
      onClose();
      
    } catch (error) {
      console.error('Error en acceso rápido:', error);
      toast.error(error.message || 'Código inválido');
      
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
      {/* 🔌 FONDO CIRCUITO ISOMÉTRICO MINIMALISTA */}
      <div className="fixed inset-0 z-40">
        {/* Fondo base sutil */}
        <div className="absolute inset-0 circuit-background"></div>
        
        {/* Circuito PCB isométrico */}
        <div className="absolute inset-0 pcb-container">
          
          {/* Líneas de circuito principales */}
          <div className="circuit-line circuit-line-1"></div>
          <div className="circuit-line circuit-line-2"></div>
          <div className="circuit-line circuit-line-3"></div>
          <div className="circuit-line circuit-line-4"></div>
          
          {/* Componentes isométricos */}
          
          {/* LEDs */}
          <div className="isometric-led led-1">
            <div className="led-light"></div>
          </div>
          <div className="isometric-led led-2">
            <div className="led-light"></div>
          </div>
          
          {/* Resistencias */}
          <div className="isometric-resistor resistor-1">
            <div className="resistor-band band-1"></div>
            <div className="resistor-band band-2"></div>
            <div className="resistor-band band-3"></div>
          </div>
          <div className="isometric-resistor resistor-2">
            <div className="resistor-band band-1"></div>
            <div className="resistor-band band-2"></div>
            <div className="resistor-band band-3"></div>
          </div>
          
          {/* Microchip central */}
          <div className="isometric-chip">
            <div className="chip-pin chip-pin-1"></div>
            <div className="chip-pin chip-pin-2"></div>
            <div className="chip-pin chip-pin-3"></div>
            <div className="chip-pin chip-pin-4"></div>
            <div className="chip-processing"></div>
          </div>
          
          {/* Conectores */}
          <div className="circuit-connector connector-1"></div>
          <div className="circuit-connector connector-2"></div>
          <div className="circuit-connector connector-3"></div>
          <div className="circuit-connector connector-4"></div>
          <div className="circuit-connector connector-5"></div>
          <div className="circuit-connector connector-6"></div>
          
          {/* Flujo de corriente */}
          <div className="current-flow flow-1"></div>
          <div className="current-flow flow-2"></div>
          <div className="current-flow flow-3"></div>
          
        </div>
      </div>

      {/* MODAL PRINCIPAL */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-white/20">
          
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
                    src="/android-chrome-512x512.png"
                    alt="Logo Electro Caja"
                    className="h-20 w-20 rounded-xl object-cover header-logo-glow"
                  />
                  <div className="absolute inset-0 rounded-xl header-logo-pulse"></div>
                </div>
              </div>
              <h2 className="text-xl font-bold electric-text">Electro Caja</h2>
              <div className="text-blue-100 text-sm mt-1">
                Versión 1.0 • Guanare, Venezuela
              </div>
            </div>
          </div>

          {/* Contenido del formulario */}
          <div className="relative overflow-hidden" style={{ minHeight: '400px' }}>
            
            {/* LOGIN NORMAL */}
            <div 
              className={`transition-all duration-700 ease-in-out transform-gpu ${
                showQuickAccess 
                  ? 'translate-x-[-100%] opacity-0 scale-95' 
                  : 'translate-x-0 opacity-100 scale-100'
              }`}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Iniciar Sesión</h3>
                
                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Error de Autenticación</span>
                    </div>
                    <div className="text-sm text-red-700 mt-1">{error}</div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="usuario@electrocaja.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Ingresa tu contraseña"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full electric-button py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Conectando...</span>
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" />
                        <span>Iniciar Sesión</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <div className="text-xs text-gray-500">
                    Electro Caja v1.0
                  </div>
                </div>
              </div>
            </div>

            {/* ACCESO RÁPIDO */}
            <div 
              className={`absolute inset-0 transition-all duration-700 ease-in-out transform-gpu ${
                showQuickAccess 
                  ? 'translate-x-0 opacity-100 scale-100' 
                  : 'translate-x-full opacity-0 scale-95'
              }`}
            >
              <div className="p-6 flex flex-col justify-center" style={{ minHeight: '400px' }}>
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Acceso Rápido</h3>
                  <p className="text-gray-600 text-sm">Escanea o ingresa tu código de empleado</p>
                </div>

                <div className="mb-6">
                  <div className="relative w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-400 flex items-center justify-center mb-4 overflow-hidden">
                    
                    <div className="absolute inset-0 scanner-effect"></div>
                    
                    <div className="text-center relative z-10">
                      <div className="relative inline-block">
                        <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent laser-scan opacity-90 shadow-sm shadow-red-500/50"></div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">Lector activado</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleQuickAccessSubmit} className="space-y-4">
                  <div>
                    <input
                      ref={scannerInputRef}
                      type="password"
                      value={quickAccessCode}
                      onChange={(e) => setQuickAccessCode(e.target.value)}
                      onKeyDown={handleScannerInput}
                      onFocus={(e) => e.target.select()}
                      placeholder="Escanea tu código QR"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center font-mono text-sm tracking-widest transition-all"
                      disabled={quickAccessLoading}
                      autoComplete="off"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={quickAccessLoading || !quickAccessCode.trim()}
                    className="w-full electric-button-purple py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {quickAccessLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4" />
                        <span>Acceder</span>
                      </>
                    )}
                  </button>
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
          className={`group relative electric-floating-button w-16 h-16 rounded-full shadow-2xl transform transition-all duration-700 hover:scale-110 flex items-center justify-center ${
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
              <ArrowLeft className="h-6 w-6 text-white" />
            ) : (
              <QrCode className="h-6 w-6 text-white" />
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
        
        /* 🔌 CIRCUITO ISOMÉTRICO MINIMALISTA */
        
        /* Fondo base sutil */
        .circuit-background {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          animation: subtleGradientShift 20s ease-in-out infinite;
        }

        @keyframes subtleGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Contenedor del PCB */
        .pcb-container {
          perspective: 1000px;
          transform-style: preserve-3d;
        }

        /* 📏 LÍNEAS DE CIRCUITO ISOMÉTRICAS */
        .circuit-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(16, 185, 129, 0.3) 10%, 
            rgba(16, 185, 129, 0.6) 50%, 
            rgba(16, 185, 129, 0.3) 90%, 
            transparent 100%
          );
          transform-origin: left;
          opacity: 0;
          animation: lineDrawIn 4s ease-in-out infinite;
        }

        /* Línea 1: Horizontal superior */
        .circuit-line-1 {
          top: 20%;
          left: 15%;
          width: 300px;
          transform: rotateY(-30deg) rotateX(0deg);
          animation-delay: 0s;
        }

        /* Línea 2: Vertical izquierda */
        .circuit-line-2 {
          top: 20%;
          left: 15%;
          width: 200px;
          transform: rotateY(-30deg) rotateZ(90deg);
          animation-delay: 1s;
        }

        /* Línea 3: Horizontal inferior */
        .circuit-line-3 {
          top: 60%;
          left: 25%;
          width: 250px;
          transform: rotateY(-30deg) rotateX(0deg);
          animation-delay: 2s;
        }

        /* Línea 4: Diagonal conexión */
        .circuit-line-4 {
          top: 40%;
          left: 45%;
          width: 180px;
          transform: rotateY(-30deg) rotateZ(45deg);
          animation-delay: 3s;
        }

        @keyframes lineDrawIn {
          0%, 20% { 
            opacity: 0; 
            transform: scaleX(0); 
          }
          40%, 80% { 
            opacity: 0.6; 
            transform: scaleX(1); 
          }
          100% { 
            opacity: 0.3; 
            transform: scaleX(1); 
          }
        }

        /* 💡 LEDs ISOMÉTRICOS */
        .isometric-led {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #1f2937;
          border-radius: 2px;
          transform: rotateY(-30deg) rotateX(30deg);
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.3),
            inset 1px 1px 2px rgba(255, 255, 255, 0.1);
        }

        .led-1 {
          top: 18%;
          left: 25%;
          animation-delay: 1.5s;
        }

        .led-2 {
          top: 58%;
          left: 55%;
          animation-delay: 3.5s;
        }

        .led-light {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: ledPulse 3s ease-in-out infinite;
        }

        .led-1 .led-light {
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444, 0 0 16px rgba(239, 68, 68, 0.3);
          animation-delay: 1.5s;
        }

        .led-2 .led-light {
          background: #10b981;
          box-shadow: 0 0 8px #10b981, 0 0 16px rgba(16, 185, 129, 0.3);
          animation-delay: 3.5s;
        }

        @keyframes ledPulse {
          0%, 70% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.8); }
          85% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.8); }
        }

        /* 🎯 RESISTENCIAS ISOMÉTRICAS */
        .isometric-resistor {
          position: absolute;
          width: 16px;
          height: 6px;
          background: #fbbf24;
          border-radius: 2px;
          transform: rotateY(-30deg) rotateX(15deg);
          box-shadow: 
            2px 1px 3px rgba(0, 0, 0, 0.3),
            inset 1px 0 2px rgba(255, 255, 255, 0.2);
        }

        .resistor-1 {
          top: 35%;
          left: 20%;
          animation: componentGlow 6s ease-in-out infinite;
          animation-delay: 2s;
        }

        .resistor-2 {
          top: 50%;
          left: 60%;
          animation: componentGlow 6s ease-in-out infinite;
          animation-delay: 4s;
        }

        .resistor-band {
          position: absolute;
          width: 2px;
          height: 100%;
          top: 0;
        }

        .band-1 { left: 20%; background: #ef4444; }
        .band-2 { left: 50%; background: #3b82f6; }
        .band-3 { left: 80%; background: #f59e0b; }

        @keyframes componentGlow {
          0%, 60% { filter: brightness(1); }
          80% { filter: brightness(1.3) drop-shadow(0 0 4px rgba(251, 191, 36, 0.6)); }
          100% { filter: brightness(1); }
        }

        /* 🔲 MICROCHIP ISOMÉTRICO */
        .isometric-chip {
          position: absolute;
          top: 40%;
          left: 40%;
          width: 20px;
          height: 20px;
          background: #111827;
          border-radius: 2px;
          transform: rotateY(-30deg) rotateX(20deg);
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            inset 2px 2px 4px rgba(255, 255, 255, 0.1);
          animation: chipProcessing 8s ease-in-out infinite;
        }

        .chip-pin {
          position: absolute;
          width: 2px;
          height: 1px;
          background: #9ca3af;
        }

        .chip-pin-1 { top: 2px; left: -2px; }
        .chip-pin-2 { top: 8px; left: -2px; }
        .chip-pin-3 { top: 2px; right: -2px; }
        .chip-pin-4 { top: 8px; right: -2px; }

        .chip-processing {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
          opacity: 0;
          animation: processingPulse 2s ease-in-out infinite;
          animation-delay: 4s;
        }

        @keyframes chipProcessing {
          0%, 70% { transform: rotateY(-30deg) rotateX(20deg) scale(1); }
          85% { transform: rotateY(-30deg) rotateX(20deg) scale(1.1); }
          100% { transform: rotateY(-30deg) rotateX(20deg) scale(1); }
        }

        @keyframes processingPulse {
          0%, 30% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          60% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        }

        /* 🔗 CONECTORES ISOMÉTRICOS */
        .circuit-connector {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #6b7280;
          border-radius: 50%;
          transform: rotateY(-30deg) rotateX(45deg);
          box-shadow: 
            1px 1px 2px rgba(0, 0, 0, 0.4),
            inset 1px 1px 1px rgba(255, 255, 255, 0.3);
        }

        .connector-1 { top: 20%; left: 25%; animation: connectorPulse 4s ease-in-out infinite; animation-delay: 1s; }
        .connector-2 { top: 35%; left: 15%; animation: connectorPulse 4s ease-in-out infinite; animation-delay: 2s; }
        .connector-3 { top: 20%; left: 45%; animation: connectorPulse 4s ease-in-out infinite; animation-delay: 1.5s; }
        .connector-4 { top: 60%; left: 35%; animation: connectorPulse 4s ease-in-out infinite; animation-delay: 3s; }
        .connector-5 { top: 60%; left: 55%; animation: connectorPulse 4s ease-in-out infinite; animation-delay: 2.5s; }
        .connector-6 { top: 45%; left: 60%; animation: connectorPulse 4s ease-in-out infinite; animation-delay: 3.5s; }

        @keyframes connectorPulse {
          0%, 80% { 
            background: #6b7280; 
            box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
          }
          90% { 
            background: #06b6d4; 
            box-shadow: 
              1px 1px 2px rgba(0, 0, 0, 0.4),
              0 0 8px rgba(6, 182, 212, 0.6);
          }
          100% { 
            background: #6b7280; 
            box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
          }
        }

        /* ⚡ FLUJO DE CORRIENTE */
        .current-flow {
          position: absolute;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
          border-radius: 50%;
          opacity: 0;
          animation: currentMove 6s linear infinite;
        }

        .flow-1 {
          animation-delay: 0s;
        }

        .flow-2 {
          animation-delay: 2s;
        }

        .flow-3 {
          animation-delay: 4s;
        }

        @keyframes currentMove {
          0% { 
            top: 20%; 
            left: 15%; 
            opacity: 0; 
            transform: scale(0.5);
          }
          10% { 
            opacity: 1; 
            transform: scale(1);
          }
          25% { 
            top: 20%; 
            left: 35%; 
            opacity: 1;
          }
          50% { 
            top: 40%; 
            left: 45%; 
            opacity: 0.8;
          }
          75% { 
            top: 60%; 
            left: 55%; 
            opacity: 0.6;
          }
          90% { 
            opacity: 0; 
            transform: scale(0.3);
          }
          100% { 
            top: 60%; 
            left: 65%; 
            opacity: 0;
          }
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

        /* 🔌 EFECTOS MINIMALISTAS DEL HEADER */
        .header-energy-wave {
          background: linear-gradient(45deg, transparent, rgba(16, 185, 129, 0.08), transparent);
          animation: headerCircuitWave 12s ease-in-out infinite;
        }

        @keyframes headerCircuitWave {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(0%); opacity: 0.6; }
          100% { transform: translateX(100%); opacity: 0; }
        }

        .header-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(6, 182, 212, 0.4);
          border-radius: 50%;
          animation: headerCircuitParticle 8s ease-in-out infinite var(--delay);
        }

        @keyframes headerCircuitParticle {
          0%, 80% { transform: translateY(0px); opacity: 0.2; }
          90% { transform: translateY(-15px); opacity: 0.8; }
          100% { transform: translateY(0px); opacity: 0.2; }
        }

        .header-logo-glow {
          animation: headerLogoCircuitGlow 6s ease-in-out infinite alternate;
        }

        @keyframes headerLogoCircuitGlow {
          0% { 
            filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.3)) 
                    drop-shadow(0 0 16px rgba(6, 182, 212, 0.2)); 
          }
          100% { 
            filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.5)) 
                    drop-shadow(0 0 24px rgba(6, 182, 212, 0.3)); 
          }
        }

        .header-logo-pulse {
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent);
          animation: headerLogoCircuitPulse 8s ease-in-out infinite;
        }

        @keyframes headerLogoCircuitPulse {
          0%, 70% { transform: scale(0.9); opacity: 0; }
          85% { transform: scale(1.3); opacity: 0.3; }
          100% { transform: scale(0.9); opacity: 0; }
        }

        /* 🔌 TEXTO CIRCUITO */
        .electric-text {
          text-shadow: 
            0 0 3px rgba(16, 185, 129, 0.6),
            0 0 6px rgba(6, 182, 212, 0.4);
          animation: circuitTextGlow 8s ease-in-out infinite alternate;
        }

        @keyframes circuitTextGlow {
          0% { 
            text-shadow: 
              0 0 3px rgba(16, 185, 129, 0.6),
              0 0 6px rgba(6, 182, 212, 0.4); 
          }
          100% { 
            text-shadow: 
              0 0 6px rgba(16, 185, 129, 0.8),
              0 0 12px rgba(6, 182, 212, 0.6),
              0 0 18px rgba(16, 185, 129, 0.3); 
          }
        }

        /* 🔌 BOTONES CIRCUITO */
        .electric-button {
          background: linear-gradient(45deg, #0f172a, #1e293b, #0f172a);
          background-size: 200% 200%;
          color: white;
          border: 1px solid rgba(16, 185, 129, 0.3);
          position: relative;
          overflow: hidden;
          animation: circuitButtonFlow 8s ease-in-out infinite;
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
            border-color: rgba(16, 185, 129, 0.3);
          }
          50% { 
            background-position: 100% 50%; 
            border-color: rgba(6, 182, 212, 0.5);
          }
        }

        @keyframes circuitButtonSweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .electric-button-purple {
          background: linear-gradient(45deg, #0f172a, #312e81, #0f172a);
          background-size: 200% 200%;
          color: white;
          border: 1px solid rgba(124, 58, 237, 0.3);
          position: relative;
          overflow: hidden;
          animation: circuitButtonFlow 8s ease-in-out infinite;
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