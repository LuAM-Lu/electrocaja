// components/inventario/BarcodeScanner.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Scan from 'lucide-react/dist/esm/icons/scan'
import Zap from 'lucide-react/dist/esm/icons/zap'
import X from 'lucide-react/dist/esm/icons/x'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'

const BarcodeScanner = ({ 
  value, 
  onChange, 
  onScan, 
  existingCodes = [],
  placeholder = "Escanear o escribir código...",
  autoGenerate = true,
  required = false,
  className = ""
}) => {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [scanBuffer, setScanBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  // Detectar scanner USB (escritura muy rápida)
 //  NUEVO - Solo cuando presiona Enter
const handleKeyPress = (e) => {
  if (e.key === 'Enter' && value.length > 3) {
    e.preventDefault();
    handleScanComplete(value); // ← SOLO CON ENTER
    return;
  }
  // Quitar la detección automática por velocidad
};

  // Procesar scan completado - SIN NOTIFICACIONES
  const handleScanComplete = (code) => {
    setIsScanning(true);
    
    // Validar y limpiar código
    const cleanCode = code.trim().toUpperCase();
    
    if (cleanCode.length < 4) {
      setIsScanning(false);
      return;
    }

    // Ejecutar callback SIN notificaciones
    if (onScan) {
      onScan(cleanCode);
    }
    
    // Solo feedback visual
    setTimeout(() => {
      setIsScanning(false);
    }, 500);
  };

  // Validar duplicados en tiempo real
  useEffect(() => {
    if (value && value.length > 3) {
      const duplicate = existingCodes.some(code => 
        code && code.toUpperCase() === value.toUpperCase()
      );
      setIsDuplicate(duplicate);
    } else {
      setIsDuplicate(false);
    }
  }, [value, existingCodes]);

  // Generar código automático - SIN NOTIFICACIONES
  const generateAutoCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const prefix = 'EC'; // Electro Caja
    const newCode = `${prefix}${timestamp}${random}`;
    
    // Verificar que no exista
    if (existingCodes.includes(newCode)) {
      generateAutoCode(); // Recursivo si existe
      return;
    }
    
    onChange(newCode);
    //  SIN toast.success - solo cambiar el valor
  };

  // Limpiar código
  const clearCode = () => {
    onChange('');
    setIsDuplicate(false);
    setIsScanning(false);
    scannerRef.current?.focus();
  };

  // Obtener estilo del input según estado
  const getInputStyle = () => {
    const baseStyle = "w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm";
    
    if (isScanning) {
      return `${baseStyle} border-green-400 bg-green-50 animate-pulse`;
    }
    if (isDuplicate) {
      return `${baseStyle} border-red-400 bg-red-50`;
    }
    if (value && !isDuplicate) {
      return `${baseStyle} border-green-400 bg-green-50`;
    }
    return `${baseStyle} border-gray-300`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      
      {/* Input principal */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          
          {/* Campo de código */}
          <div className="relative flex-1">
            <Scan className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors z-10 ${
              isScanning ? 'text-green-500 animate-spin' : 
              isDuplicate ? 'text-red-500' : 
              value ? 'text-green-500' : 'text-gray-400'
            }`} />
            
            <input
              ref={scannerRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className={getInputStyle()}
              autoComplete="off"
              spellCheck="false"
              required={required}
            />
            
            {/* Botón limpiar */}
            {value && (
              <button
                type="button"
                onClick={clearCode}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                title="Limpiar código"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Botones de acción */}
          <div className="flex space-x-2">
            {/* Botón enfocar */}
            <button
              type="button"
              onClick={() => scannerRef.current?.focus()}
              className="flex-1 sm:flex-none px-3 py-2 bg-blue-100/80 backdrop-blur-sm text-blue-700 rounded-lg hover:bg-blue-200/80 hover:backdrop-blur-sm transition-colors flex items-center justify-center space-x-1"
              title="Enfocar para escanear"
            >
              <Scan className="h-4 w-4" />
              <span className="sm:hidden text-xs">Escanear</span>
            </button>
            
            {/* Botón generar automático */}
            {autoGenerate && (
              <button
                type="button"
                onClick={generateAutoCode}
                className="flex-1 sm:flex-none px-3 py-2 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-lg hover:bg-green-200/80 hover:backdrop-blur-sm transition-colors flex items-center justify-center space-x-1"
                title="Generar código automático"
              >
                <Zap className="h-4 w-4" />
                <span className="sm:hidden text-xs">Generar</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mensajes de estado - SOLO VISUAL */}
      <div className="min-h-[20px]">
        {isScanning && (
          <div className="text-xs text-green-600 flex items-center space-x-1 animate-pulse">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <span> Escaneando código...</span>
          </div>
        )}
        
        {isDuplicate && !isScanning && (
          <div className="text-xs text-red-600 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span> Este código ya existe en el inventario</span>
          </div>
        )}
        
        {value && !isDuplicate && !isScanning && (
          <div className="text-xs text-green-600 flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span> Código disponible - {value.length} caracteres</span>
          </div>
        )}
        
        {!value && !isScanning && (
          <div className="text-xs text-gray-500">
             Use el scanner USB, escriba manualmente o genere automático
          </div>
        )}
      </div>

    </div>
  );
};

export default BarcodeScanner;