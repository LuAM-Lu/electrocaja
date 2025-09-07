// components/configuracion/WhatsAppPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, Wifi, WifiOff, QrCode as QrCodeIcon, Check, 
  Trash2, AlertTriangle, RefreshCw, Settings
} from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const WhatsAppPanel = () => {
  // 📊 ESTADO PRINCIPAL
  const [estadoWhatsApp, setEstadoWhatsApp] = useState({
    conectado: false,
    numero: '',
    qrCode: '',
    qrCodeImage: '',
    intentandoConectar: false,
    limpiandoSesion: false
  });

  // 🎯 REFS PARA CONTROL
  const pollingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // ===============================
  // 🔍 FUNCIONES DE ESTADO
  // ===============================

  // ✅ SOLO verificar estado inicial - SIN auto-conectar ni polling
  const verificarEstadoInicial = async () => {
    try {
      const response = await api.get('/whatsapp/estado');
      const { data } = response.data;

      // AGREGAR ESTO TEMPORALMENTE:
      console.log('ESTRUCTURA COMPLETA API:', JSON.stringify(response.data, null, 2));
      console.log('DATA EXTRAIDO:', JSON.stringify(data, null, 2));
      console.log('🔧 Estado inicial WhatsApp (solo lectura):', data);
     
      if (isMountedRef.current) {
        setEstadoWhatsApp(prev => ({
          ...prev,
          conectado: data.conectado || false,
          numero: data.numero || '',
          qrCode: '', // 🚫 NO mostrar QR automáticamente
          qrCodeImage: '',
          intentandoConectar: false
        }));
      }
    } catch (error) {
      console.error('Error verificando estado inicial:', error);
      if (isMountedRef.current) {
        // No mostrar toast de error al cargar, es normal si WhatsApp no está configurado
        console.log('ℹ️ WhatsApp aún no configurado');
      }
    }
  };

  // ===============================
  // 🔄 FUNCIONES DE POLLING
  // ===============================

  // 🚀 Polling inteligente SOLO cuando se necesita QR
  const iniciarPollingQR = () => {
    console.log('🔧 Iniciando polling SOLO para QR...');
    
    // Limpiar interval anterior por seguridad
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let attempts = 0;
    const maxAttempts = 40; // 40 x 3s = 2 minutos max
    
    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      console.log(`🔄 Polling QR attempt ${attempts}/${maxAttempts}`);
      
      try {
        const response = await api.get('/whatsapp/estado');
        const { data } = response.data;

        // AGREGAR ESTO TEMPORALMENTE:
        console.log('ESTRUCTURA COMPLETA API:', JSON.stringify(response.data, null, 2));
        console.log('DATA EXTRAIDO:', JSON.stringify(data, null, 2));
        
        // 🖼️ Generar imagen QR si hay código y no está conectado
        let qrCodeImage = '';
        if (data.qrCode && !data.conectado) {
          try {
            qrCodeImage = await QRCode.toDataURL(data.qrCode, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            console.log('📱 QR generado exitosamente');
          } catch (error) {
            console.error('Error generando imagen QR:', error);
          }
        }
        
        if (isMountedRef.current) {
          setEstadoWhatsApp(prev => ({
            ...prev,
            conectado: data.conectado,
            numero: data.numero,
            qrCode: data.qrCode,
            qrCodeImage: qrCodeImage,
            intentandoConectar: !data.conectado && !data.qrCode ? prev.intentandoConectar : false
          }));
        }

        // ✅ PARAR polling si conectado exitosamente
        if (data.conectado) {
          console.log('✅ WhatsApp conectado - Deteniendo polling');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          if (isMountedRef.current) {
            toast.success('📱 WhatsApp conectado exitosamente');
          }
          return;
        }

        // ⏰ PARAR polling si excede intentos máximos
        if (attempts >= maxAttempts) {
          console.log('⏰ Polling timeout - Deteniendo');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          if (isMountedRef.current) {
            setEstadoWhatsApp(prev => ({ 
              ...prev, 
              intentandoConectar: false,
              qrCode: '',
              qrCodeImage: ''
            }));
            toast.error('⏰ Tiempo de conexión agotado. Intenta limpiar sesión.');
          }
        }
        
      } catch (error) {
        console.error('Error en polling QR:', error);
        attempts++; // Contar errores como intentos
        
        if (attempts >= maxAttempts) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          if (isMountedRef.current) {
            setEstadoWhatsApp(prev => ({ ...prev, intentandoConectar: false }));
            toast.error('Error de conexión. Intenta limpiar sesión.');
          }
        }
      }
    }, 3000); // Cada 3 segundos
  };

  // 🛑 Detener polling
  const detenerPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('🛑 Polling detenido');
    }
  };

  // ===============================
  // 🔗 FUNCIONES DE CONEXIÓN
  // ===============================

  // 🔄 Conectar WhatsApp BAJO DEMANDA
  const iniciarConexionWhatsApp = async () => {
    // Prevenir múltiples clics
    if (estadoWhatsApp.intentandoConectar) {
      toast.warning('Ya se está intentando conectar...');
      return;
    }

    setEstadoWhatsApp(prev => ({ 
      ...prev, 
      intentandoConectar: true,
      qrCode: '',
      qrCodeImage: '' 
    }));
    
    try {
      console.log('🔄 Iniciando conexión WhatsApp BAJO DEMANDA...');
      
      // 1. Llamar backend para inicializar (AHORA SÍ se generará QR)
      console.log('🔄 Verificando estado antes de conectar...');
        const estadoActual = await api.get('/whatsapp/estado');
        console.log('📊 Estado actual:', estadoActual.data);

        if (estadoActual.data?.data?.conectado) {
          toast.success('WhatsApp ya está conectado');
          return;
        }

        const response = await api.post('/whatsapp/conectar');
      console.log('✅ Backend iniciado:', response.data);
      
      // 2. Esperar que el backend genere QR e iniciar polling
      setTimeout(() => {
        console.log('🚀 Iniciando polling QR tras inicialización...');
        iniciarPollingQR();
      }, 2000); // 2s delay para que backend inicialice completamente
      
      toast.success('📱 Iniciando WhatsApp... Generando QR...', { duration: 4000 });
      
    } catch (error) {
      console.error('Error conectando WhatsApp:', error);
      if (isMountedRef.current) {
        setEstadoWhatsApp(prev => ({ ...prev, intentandoConectar: false }));
        toast.error('Error al conectar WhatsApp: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // 🔌 Desconectar WhatsApp
  const desconectarWhatsApp = async () => {
    try {
      console.log('🔄 Desconectando WhatsApp...');
      
      // Detener polling si está activo
      detenerPolling();

      const response = await api.post('/whatsapp/desconectar');
        
      if (isMountedRef.current) {
        setEstadoWhatsApp({
          conectado: false,
          numero: '',
          qrCode: '',
          qrCodeImage: '',
          intentandoConectar: false,
          limpiandoSesion: false
        });
        
        toast.success('📱 WhatsApp desconectado');
      }
      
    } catch (error) {
      console.error('Error desconectando WhatsApp:', error);
      toast.error('Error al desconectar WhatsApp');
    }
  };

  // 🧹 Limpiar sesión forzadamente
  const limpiarSesionWhatsApp = async () => {
    if (!window.confirm(
      '¿Estás seguro de que quieres limpiar la sesión de WhatsApp?\n\n' +
      'Esto eliminará:\n' +
      '• Todos los datos de autenticación\n' +
      '• Caché de WhatsApp Web\n' +
      '• Archivos de sesión\n\n' +
      'Tendrás que escanear el QR nuevamente.'
    )) {
      return;
    }

    setEstadoWhatsApp(prev => ({ ...prev, limpiandoSesion: true }));
    
    try {
      console.log('🧹 Limpiando sesión WhatsApp...');
      
      // Detener polling si está activo
      detenerPolling();

      const response = await api.post('/whatsapp/limpiar-sesion');
      
      if (response.data.success) {
        console.log('✅ Sesión limpiada exitosamente:', response.data.data);
        
        if (isMountedRef.current) {
          setEstadoWhatsApp({
            conectado: false,
            numero: '',
            qrCode: '',
            qrCodeImage: '',
            intentandoConectar: false,
            limpiandoSesion: false
          });
          
          toast.success('🧹 Sesión de WhatsApp limpiada completamente', { duration: 5000 });
        }
      } else {
        throw new Error(response.data.message || 'Error limpiando sesión');
      }
      
    } catch (error) {
      console.error('Error limpiando sesión WhatsApp:', error);
      if (isMountedRef.current) {
        setEstadoWhatsApp(prev => ({ ...prev, limpiandoSesion: false }));
        toast.error('Error limpiando sesión: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // ===============================
  // 🧹 CLEANUP Y EFECTOS
  // ===============================

  // 🧹 Cleanup optimizado
  useEffect(() => {
    isMountedRef.current = true;
    
    // SOLO verificar estado inicial - NO auto-conectar
    verificarEstadoInicial();
    
    return () => {
      console.log('🧹 Limpiando WhatsAppPanel...');
      isMountedRef.current = false;
      
      // Limpiar polling al desmontar
      detenerPolling();
    };
  }, []);

  // ===============================
  // 🎨 COMPONENTES DE UI
  // ===============================

  // 📊 Indicador de estado
  const EstadoIndicador = () => (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
      estadoWhatsApp.conectado ? 'bg-green-100' : 'bg-red-100'
    }`}>
      {estadoWhatsApp.conectado ? (
        <Wifi className="h-5 w-5 text-green-600" />
      ) : (
        <WifiOff className="h-5 w-5 text-red-600" />
      )}
    </div>
  );

  // 🔄 Spinner de carga
  const SpinnerCarga = ({ texto = "Cargando..." }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
      <h4 className="font-semibold text-blue-900 mb-2">{texto}</h4>
      <p className="text-sm text-blue-700">
        Preparando conexión y generando código QR
      </p>
      <div className="text-xs text-blue-600 mt-2">
        ⏱️ Esto puede tomar hasta 15 segundos
      </div>
    </div>
  );

  // 📱 Componente QR
  const QRDisplay = () => (
    <div className="bg-white border-2 border-dashed border-green-300 rounded-lg p-6 shadow-md">
      {estadoWhatsApp.qrCodeImage ? (
        <>
          <img 
            src={estadoWhatsApp.qrCodeImage} 
            alt="WhatsApp QR Code" 
            className="mx-auto mb-4 rounded-lg shadow-lg border-2 border-gray-200"
          />
          {/* 🔄 Indicador de que está esperando escaneo */}
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-700 font-medium">QR activo - Esperando escaneo</span>
          </div>
        </>
      ) : (
        <div className="animate-pulse">
          <QrCodeIcon className="h-32 w-32 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Generando QR...</p>
        </div>
      )}
      
      <h4 className="font-semibold text-gray-900 mb-2">Escanea el código QR</h4>
      <div className="text-sm text-gray-600 space-y-1">
        <p>1. 📱 Abre WhatsApp en tu teléfono</p>
        <p>2. ⚙️ Ve a Configuración → Dispositivos vinculados</p>
        <p>3. 📷 Toca "Vincular un dispositivo" y escanea</p>
      </div>
      
      <div className="text-xs text-orange-600 mt-4 bg-orange-50 p-2 rounded border">
        ⏰ El código expira en 2 minutos. Si no funciona, usa "Limpiar Sesión"
      </div>

      {/* Botón limpiar aquí también */}
      <div className="mt-4">
        <button
          onClick={limpiarSesionWhatsApp}
          disabled={estadoWhatsApp.limpiandoSesion}
          className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm flex items-center space-x-2 mx-auto disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          <span>Limpiar y reintentar</span>
        </button>
      </div>
    </div>
  );

  // ===============================
  // 🖼️ RENDER PRINCIPAL
  // ===============================

  return (
    <div className="space-y-6">
      
      {/* ===== ESTADO ACTUAL ===== */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <EstadoIndicador />
          <div>
            <h3 className="font-semibold text-gray-900">
              Estado WhatsApp: {estadoWhatsApp.conectado ? 'Conectado' : 'Desconectado'}
            </h3>
            <p className="text-sm text-gray-600">
              {estadoWhatsApp.conectado 
                ? `Número vinculado: ${estadoWhatsApp.numero || '+584120552931'}`
                : 'No hay número vinculado'
              }
            </p>
          </div>
        </div>
        
        <div className="text-xs text-blue-700 space-y-1">
          <p>• Se enviarán notificaciones de apertura y cierre de caja</p>
          <p>• Alertas automáticas por diferencias significativas</p>
          <p>• Requerido: WhatsApp instalado en este dispositivo</p>
        </div>
      </div>

      {/* ===== BOTÓN CONECTAR - Solo cuando no hay QR ni está conectado ===== */}
      {!estadoWhatsApp.conectado && !estadoWhatsApp.qrCode && !estadoWhatsApp.intentandoConectar && (
        <div className="text-center space-y-4">
          <div className="text-gray-600">
            <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-semibold">WhatsApp no conectado</h4>
            <p className="text-sm">Haz clic en "Conectar" para generar el código QR</p>
          </div>
          
          <div className="flex justify-center space-x-3">
            <button
              onClick={iniciarConexionWhatsApp}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              <QrCodeIcon className="h-4 w-4" />
              <span>Conectar WhatsApp</span>
            </button>
            
            {/* Botón Limpiar Sesión */}
            <button
              onClick={limpiarSesionWhatsApp}
              disabled={estadoWhatsApp.limpiandoSesion}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Limpiar datos de sesión de WhatsApp"
            >
              {estadoWhatsApp.limpiandoSesion ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Limpiando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Limpiar Sesión</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===== ESTADO CARGANDO ===== */}
      {estadoWhatsApp.intentandoConectar && !estadoWhatsApp.qrCode && (
        <div className="text-center space-y-4">
          <SpinnerCarga texto="Inicializando WhatsApp Web..." />
        </div>
      )}

      {/* ===== QR CODE - Aparece SOLO cuando se genere tras hacer clic ===== */}
      {estadoWhatsApp.qrCode && !estadoWhatsApp.conectado && (
        <div className="text-center space-y-4">
          <QRDisplay />
        </div>
      )}

      {/* ===== WHATSAPP CONECTADO ===== */}
      {estadoWhatsApp.conectado && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-800 mb-2">
              <Check className="h-5 w-5" />
              <span className="font-semibold">WhatsApp conectado exitosamente</span>
            </div>
            <div className="text-sm text-green-700">
              Las notificaciones se enviarán automáticamente al número: +584120552931
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={desconectarWhatsApp}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm shadow-md hover:shadow-lg"
            >
              Desconectar WhatsApp
            </button>
            
            {/* Limpiar sesión también disponible cuando conectado */}
            <button
              onClick={limpiarSesionWhatsApp}
              disabled={estadoWhatsApp.limpiandoSesion}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm shadow-md hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
            >
              <Trash2 className="h-3 w-3" />
              <span>Limpiar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== ADVERTENCIA SI HAY PROBLEMAS ===== */}
      {!estadoWhatsApp.conectado && !estadoWhatsApp.intentandoConectar && !estadoWhatsApp.qrCode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">¿Problemas de conexión?</h4>
              <p className="text-sm text-yellow-700 mb-2">
                Si WhatsApp no se conecta o el QR no aparece:
              </p>
              <ul className="text-xs text-yellow-600 space-y-1">
                <li>• Usa el botón "Limpiar Sesión" para eliminar datos corruptos</li>
                <li>• Asegúrate de tener WhatsApp instalado en tu teléfono</li>
                <li>• Verifica que tu red tenga acceso a internet</li>
                <li>• Intenta cerrar otras sesiones de WhatsApp Web</li>
              </ul>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default WhatsAppPanel;