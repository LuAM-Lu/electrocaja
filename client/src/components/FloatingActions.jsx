// components/FloatingActions.jsx (VERSIÓN CORREGIDA COMPLETA)
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Menu, X, Lock, Zap, Package, Calculator, Users, Settings, Search, Scan, FileText, /* Activity, */ DollarSign, Camera, XCircle, ClipboardList } from 'lucide-react';
import { TbTruckDelivery } from 'react-icons/tb';
import { useAuthStore } from '../store/authStore';
import { useInventarioStore } from '../store/inventarioStore';
import { useCajaStore } from '../store/cajaStore';
import ProductViewModal from './ProductViewModal';
import ReportesModal from './reportes/ReportesModal';
import toast from '../utils/toast.jsx';
import { Html5Qrcode } from 'html5-qrcode';

const FloatingActions = ({ onNewTransaction, onCerrarCaja, onOpenInventario, onOpenArqueo, onOpenConfiguracion, onOpenPresupuesto, onOpenPedidos, onOpenActividades, onOpenScanner, onOpenReportes, cajaActual }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProductView, setShowProductView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  //  Estados para múltiples resultados
  const [searchResults, setSearchResults] = useState([]);
  const [showResultsList, setShowResultsList] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  //  Estados para escáner de cámara móvil
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const { tienePermiso, usuario } = useAuthStore();
  const { inventario } = useInventarioStore();
  const { tasaCambio } = useCajaStore();
  const inputRef = useRef(null);

  //  Detectar si es dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    checkMobile();
  }, []);

  // Focus automático cuando se abre el menú
  useEffect(() => {
    if (isOpen && inputRef.current && !isScannerActive) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isOpen, isScannerActive]);

  // Cerrar atajos cuando se cierra el menú
  useEffect(() => {
    if (!isOpen) {
      setShowShortcuts(false);
    }
  }, [isOpen]);

  //  Limpiar escáner cuando se cierra
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(err => console.log('Error stopping scanner:', err));
      }
    };
  }, []);

  //  Navegación por teclado en lista de resultados
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showResultsList) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex(prev =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedProduct = searchResults[selectedResultIndex];
        setSelectedProduct(selectedProduct);
        setShowProductView(true);
        setShowResultsList(false);
        setSearchResults([]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowResultsList(false);
        setSearchResults([]);
        setIsOpen(true);
      }
    };

    if (showResultsList) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResultsList, searchResults, selectedResultIndex]);

  const handleAction = (action) => {
    setIsOpen(false);
    setSearchQuery('');
    setShowShortcuts(false);

    setTimeout(() => {
      if (action === 'ingreso') {
        onNewTransaction('ingreso');
      } else if (action === 'egreso') {
        onNewTransaction('egreso');
      } else if (action === 'cerrar' && cajaActual) {
        onCerrarCaja();
      } else if (action === 'inventario') {
        onOpenInventario();
      } else if (action === 'arqueo' && cajaActual) {
        onOpenArqueo();
      } else if (action === 'configuracion') {
        onOpenConfiguracion();
      } else if (action === 'reportes') {
        onOpenReportes();
        // TODO: Botón de Actividades - Comentado para uso posterior
        // } else if (action === 'actividades') {
        //   onOpenActividades();
      } else if (action === 'presupuesto') {
        onOpenPresupuesto();
      } else if (action === 'pedidos') {
        onOpenPedidos?.();
      }
    }, 100);
  };;

  //  Función para iniciar el escáner de cámara
  const startScanner = async () => {
    try {
      setIsScannerActive(true);

      //  Primero pedir permisos explícitamente
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      // Detener el stream de prueba inmediatamente
      stream.getTracks().forEach(track => track.stop());

      const html5QrCode = new Html5Qrcode("barcode-scanner");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
        //  Mejorar para móviles
        formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Todos los formatos de código de barras
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Cámara trasera
        config,
        (decodedText) => {
          // Código detectado
          console.log(' Código escaneado:', decodedText);
          setSearchQuery(decodedText);
          stopScanner();

          // Simular búsqueda automática
          setTimeout(() => {
            performSearch(decodedText);
          }, 100);
        },
        (errorMessage) => {
          // Error de escaneo (normal, no mostrar)
        }
      );

      toast.success('Cámara activada - Apunta al código de barras');
    } catch (err) {
      console.error('Error al iniciar escáner:', err);

      //  Mensajes de error más específicos
      if (err.name === 'NotAllowedError') {
        toast.error('Permiso de cámara denegado. Por favor, permite el acceso en la configuración del navegador.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No se encontró ninguna cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError') {
        toast.error('La cámara está siendo usada por otra aplicación.');
      } else {
        toast.error(`Error de cámara: ${err.message || 'Desconocido'}`);
      }

      setIsScannerActive(false);
    }
  };

  //  Función para detener el escáner
  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }
      setIsScannerActive(false);
    } catch (err) {
      console.error('Error al detener escáner:', err);
      setIsScannerActive(false);
    }
  };

  //  Función de búsqueda unificada (para teclado y escáner)
  const performSearch = (query) => {
    const searchTerm = query.trim().toUpperCase();

    // Buscar TODOS los productos que coincidan
    const productos = inventario.filter(item =>
      item.codigo_barras?.toUpperCase() === searchTerm ||
      item.codigo_interno?.toUpperCase() === searchTerm
    );

    if (productos.length === 1) {
      // Un solo resultado - abrir directamente
      setSelectedProduct(productos[0]);
      setShowProductView(true);
      setIsOpen(false);
      setSearchQuery('');
      setShowShortcuts(false);
      toast.success(`Producto encontrado: ${productos[0].descripcion}`);
    } else if (productos.length > 1) {
      // Múltiples resultados - mostrar lista
      setSearchResults(productos);
      setSelectedResultIndex(0);
      setShowResultsList(true);
      setIsOpen(false);
      setSearchQuery('');
      setShowShortcuts(false);
      toast.success(`${productos.length} productos encontrados`);
    } else {
      // No encontrado
      toast.error('Producto no encontrado');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  };

  //  Handler de búsqueda por Enter
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  return (
    <>
      {/* Backdrop cuando el menú está abierto -  z-40 para NO bloquear modales */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
            setShowShortcuts(false);
          }}
        />
      )}

      {/* Contenedor principal -  z-[45] para estar por debajo de modales z-50 */}
      <div className="fixed bottom-6 right-20 z-[45]">
        {/* Input de Búsqueda */}
        <div className={`absolute bottom-0 right-20 transition-all duration-300 ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
          }`}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-3 min-w-[350px]">
            <div className="flex items-center space-x-2 mb-2">

              {/* Scanner con línea móvil centrada */}
              <div className="relative">
                <Scan className="h-4 w-4 text-purple-600" />
                <div className="absolute inset-0 w-4 h-4 flex items-center justify-center overflow-hidden">
                  <div
                    className="w-3 h-0.5 bg-red-500"
                    style={{
                      animation: 'scanLine 2s ease-in-out infinite'
                    }}
                  ></div>
                </div>
              </div>

              <style>{`
                @keyframes scanLine {
                  0% {
                    transform: translateY(-8px);
                    opacity: 1;
                  }
                  50% {
                    transform: translateY(0px);
                    opacity: 0.8;
                  }
                  100% {
                    transform: translateY(8px);
                    opacity: 0;
                  }
                }
              `}</style>

              <span className="text-sm font-semibold text-gray-700">Búsqueda Rápida</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="floating-search-input"
                name="floatingSearch"
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearch}
                placeholder="Escanear código o escribir..."
                className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />

              {/*  Botón de Cámara para Móviles */}
              {isMobile && (
                <button
                  onClick={isScannerActive ? stopScanner : startScanner}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all ${isScannerActive
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
                  title={isScannerActive ? 'Cerrar cámara' : 'Escanear con cámara'}
                >
                  {isScannerActive ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>

            {/*  Visor de cámara */}
            {isScannerActive && (
              <div className="mt-3">
                <div id="barcode-scanner" className="w-full rounded-lg overflow-hidden border-2 border-purple-500"></div>
                <div className="text-xs text-center text-purple-600 mt-2 font-medium">
                  Apunta al código de barras
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2 flex items-center justify-center space-x-2">
              <span> Código Barras</span>
              <span>•</span>
              <span> Código Interno</span>
              {isMobile && (
                <>
                  <span>•</span>
                  <span> Cámara</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tooltip de Atajos */}
        {showShortcuts && (
          <div className="absolute bottom-16 right-0 bg-gray-900 text-white px-4 py-3 rounded-lg text-sm shadow-xl min-w-[220px] z-20">
            <div className="font-medium mb-3 text-amber-400"> Atajos de Teclado</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span>Inventario</span>
                <kbd className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">Ctrl+P</kbd>
              </div>
              {cajaActual && tienePermiso('REALIZAR_VENTAS') && (
                <>
                  <div className="flex justify-between items-center">
                    <span>Ingreso</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">Ctrl+I</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Egreso</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">Ctrl+E</kbd>
                  </div>
                </>
              )}
              {cajaActual && tienePermiso('ARQUEO_CAJA') && (
                <div className="flex justify-between items-center">
                  <span>Arqueo</span>
                  <kbd className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">Ctrl+A</kbd>
                </div>
              )}
              {cajaActual && tienePermiso('CERRAR_CAJA') && (
                <div className="flex justify-between items-center">
                  <span>Cerrar</span>
                  <kbd className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">Ctrl+Q</kbd>
                </div>
              )}
            </div>
            <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900"></div>
          </div>
        )}

        {/* Botones secundarios - misma estructura que servicios */}
        <div className={`flex flex-col-reverse items-end space-y-reverse space-y-3 mb-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>

          {/* 9. Configuración - ADMIN Y SUPERVISOR */}
          {(usuario?.rol === 'admin' || usuario?.rol === 'supervisor') && (
            <button
              onClick={() => handleAction('configuracion')}
              className="group relative bg-gray-500 hover:bg-gray-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <Settings className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                {usuario?.rol === 'supervisor' ? 'Configuración WhatsApp' : 'Configuración General'}
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}

          {/* 8. Reportes - SOLO ADMIN */}
          {usuario?.rol === 'admin' && (
            <button
              onClick={() => handleAction('reportes')}
              className="group relative bg-purple-500 hover:bg-purple-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <FileText className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                Reportes
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}

          {/* 7. Cerrar Caja */}
          {cajaActual && tienePermiso('CERRAR_CAJA') && (
            <button
              onClick={() => handleAction('cerrar')}
              className="group relative bg-red-500 hover:bg-red-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <Lock className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                Cerrar Caja
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}

          {/* 6. Arqueo de Caja - SOLO ADMIN */}
          {cajaActual && usuario?.rol === 'admin' && (
            <button
              onClick={() => handleAction('arqueo')}
              className="group relative bg-orange-500 hover:bg-orange-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <Calculator className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                Arqueo de Caja
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}

          {/* 5. Inventario - TODOS */}
          <button
            onClick={() => handleAction('inventario')}
            className="group relative bg-indigo-500 hover:bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
          >
            <Package className="h-6 w-6" />
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
              Inventario
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
            </div>
          </button>

          {/* 4. Pedidos - ADMIN/SUPERVISOR/CAJERO */}
          {(usuario?.rol === 'admin' || usuario?.rol === 'supervisor' || usuario?.rol === 'cajero') && (
            <button
              onClick={() => handleAction('pedidos')}
              className="group relative bg-blue-500 hover:bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <TbTruckDelivery className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                Pedidos
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}

          {/* 3. Presupuesto - ADMIN/SUPERVISOR/CAJERO */}
          {(usuario?.rol === 'admin' || usuario?.rol === 'supervisor' || usuario?.rol === 'cajero') && (
            <button
              onClick={() => handleAction('presupuesto')}
              className="group relative bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <DollarSign className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                Presupuesto
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}

          {/* 2. Nuevo Egreso */}
          {cajaActual && tienePermiso('REALIZAR_VENTAS') && (
            <button
              onClick={() => handleAction('egreso')}
              className="group relative bg-orange-500 hover:bg-orange-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <Minus className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                Nuevo Egreso
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}

          {/* 1. Nuevo Ingreso */}
          {cajaActual && tienePermiso('REALIZAR_VENTAS') && (
            <button
              onClick={() => handleAction('ingreso')}
              className="group relative bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center justify-center"
            >
              <Plus className="h-6 w-6" />
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
                Nuevo Ingreso
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </button>
          )}
        </div>

        {/* Botón principal con badge de ayuda */}
        <div className="relative">
          {/* Badge de ayuda - Solo visible cuando menú está abierto */}
          {isOpen && (
            <div
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold cursor-pointer shadow-lg transition-all duration-300 hover:scale-110 z-10"
            >
              ?
            </div>
          )}

          {/* Botón principal - mismas propiedades que servicios */}
          <div className="flex items-center space-x-3 group">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-110 active:scale-95 group relative ${isOpen ? 'rotate-45' : 'rotate-0'
                }`}
            >
              {isOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}

              {/* Anillo animado como en servicios */}
              <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/*  Modal de Lista de Resultados Múltiples -  z-55 para estar sobre FloatingActions pero bajo otros modales */}
      {showResultsList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[55]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">

                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{searchResults.length} Productos Encontrados</h3>
                    <p className="text-sm text-purple-100">Selecciona cuál deseas ver</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowResultsList(false);
                    setSearchResults([]);
                    setIsOpen(true);
                  }}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >

                </button>
              </div>
            </div>

            {/* Lista de Productos */}
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {searchResults.map((producto, index) => (
                  <label
                    key={producto.id}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedResultIndex === index
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      id={`producto-radio-${index}`}
                      type="radio"
                      name="producto"
                      checked={selectedResultIndex === index}
                      onChange={() => setSelectedResultIndex(index)}
                      className="mr-3 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {producto.descripcion}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {/* Primera línea: Códigos */}
                        <div className="flex items-center space-x-2">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {producto.codigo_barras}
                          </span>
                          <span>•</span>
                          <span className="font-mono bg-blue-100 px-2 py-0.5 rounded text-xs text-blue-700">
                            {producto.codigo_interno || 'Sin código'}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-green-600">
                            ${parseFloat(producto.precio || producto.precio_venta || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Segunda línea: Observaciones */}
                        {producto.observaciones && (
                          <div className="text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded border-l-2 border-yellow-400">
                            {producto.observaciones.length > 60
                              ? `${producto.observaciones.substring(0, 60)}...`
                              : producto.observaciones
                            }
                          </div>
                        )}

                        {/* Tercera línea: Stock */}
                        {producto.stock !== null && (
                          <div className="text-xs text-gray-500">
                            Stock: {producto.stock} unidades
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer con Botones */}
            <div className="bg-gray-50 px-6 py-4 border-t rounded-b-xl">
              <div className="flex items-center justify-between">
                {/* Instrucciones de teclado */}
                <div className="text-xs text-gray-500">
                  <div> Navegar • <kbd className="px-1 bg-gray-200 rounded">Enter</kbd> Seleccionar • <kbd className="px-1 bg-gray-200 rounded">Esc</kbd> Cancelar</div>
                </div>

                {/* Botones */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowResultsList(false);
                      setSearchResults([]);
                      setIsOpen(true);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const selectedProduct = searchResults[selectedResultIndex];
                      setSelectedProduct(selectedProduct);
                      setShowProductView(true);
                      setShowResultsList(false);
                      setSearchResults([]);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Ver Producto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ProductViewModal para mostrar producto encontrado */}
      <ProductViewModal
        isOpen={showProductView}
        onClose={() => {
          setShowProductView(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        tasaCambio={tasaCambio}
        openedFrom="floating"
        onReopenMenu={() => setIsOpen(true)}
      />
    </>
  );
};

export default FloatingActions;