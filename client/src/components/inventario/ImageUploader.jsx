// components/inventario/ImageUploader.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Camera, Image, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import toast from '../../utils/toast.jsx';
import { API_CONFIG, getImageUrl } from '../../config/api';

const ImageUploader = ({ 
  value, 
  onChange, 
  productInfo = null, //  Info del producto para nombres inteligentes
  maxSize = 3, // MB
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  targetSize = 400, // px para redimensionar
  quality = 0.85,
  className = ""
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState(null); // Guardar info del archivo original
  const fileInputRef = useRef(null);
  

  // Actualizar preview cuando cambie el value desde fuera (para mostrar/ocultar la sección)
  useEffect(() => {
    console.log('📸 ImageUploader - value cambió:', {
      tipo: typeof value,
      esBase64: typeof value === 'string' && value?.startsWith('data:'),
      length: typeof value === 'string' ? value?.length : 'N/A'
    });
    
    // Actualizar preview solo para controlar si se muestra o no la sección
    if (value) {
      setPreview(value); // Puede ser base64, string URL, o objeto
    } else {
      setPreview('');
    }
  }, [value]);

  // Manejar eventos de drag
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Manejar drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = (e) => {
    e.preventDefault();
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  // Validar archivo
  const validateFile = (file) => {
    // Validar formato
    if (!allowedFormats.includes(file.type)) {
      const formatsText = allowedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ');
      toast.error(`Formato no válido\nSolo se permiten: ${formatsText}`);
      return false;
    }

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSize) {
      toast.error(`Archivo muy grande\nTamaño máximo: ${maxSize}MB\nTamaño actual: ${sizeMB.toFixed(1)}MB`);
      return false;
    }

    return true;
  };


  // Redimensionar imagen
  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        try {
          // Obtener dimensiones originales
          const { naturalWidth: originalWidth, naturalHeight: originalHeight } = img;
          
          // Calcular nuevas dimensiones manteniendo proporción
          let newWidth = originalWidth;
          let newHeight = originalHeight;
          
          // Redimensionar proporcionalmente
          if (originalWidth > originalHeight) {
            if (originalWidth > targetSize) {
              newWidth = targetSize;
              newHeight = (originalHeight * targetSize) / originalWidth;
            }
          } else {
            if (originalHeight > targetSize) {
              newHeight = targetSize;
              newWidth = (originalWidth * targetSize) / originalHeight;
            }
          }

          // Configurar canvas con fondo blanco
          canvas.width = targetSize;
          canvas.height = targetSize;

          // Limpiar canvas con fondo blanco
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetSize, targetSize);

          // Centrar la imagen
          const x = (targetSize - newWidth) / 2;
          const y = (targetSize - newHeight) / 2;

          // Dibujar imagen redimensionada
          ctx.drawImage(img, x, y, newWidth, newHeight);

          // Convertir a blob con alta calidad
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', quality);

        } catch (error) {
          console.error('Error in resize process:', error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error('Error loading image:', error);
        reject(new Error('Failed to load image'));
      };

      // Cargar imagen
      img.src = URL.createObjectURL(file);
    });
  };

//  NUEVA VERSIÓN CON BASE64 LOCAL + UPLOAD EN BACKGROUND
const handleFile = async (file) => {
  if (!validateFile(file)) return;

  setLoading(true);
  setUploadProgress(10);
  
  // GUARDAR INFO DEL ARCHIVO ORIGINAL
  const originalSizeKB = Math.round(file.size / 1024);
  setFileInfo({
    name: file.name,
    size: originalSizeKB,
    type: file.type
  });
  console.log('📁 Archivo original:', file.name, '-', originalSizeKB, 'KB');

  try {
    // PASO 1: Convertir imagen a Base64 para preview INMEDIATO
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const base64Image = e.target.result;
      console.log('📸 ========== IMAGEN CONVERTIDA ==========');
      console.log('📸 Tipo:', typeof base64Image);
      console.log('📸 Length:', base64Image?.length);
      console.log('📸 Primeros 100 chars:', base64Image?.substring(0, 100));
      console.log('📸 Es base64?:', base64Image?.startsWith('data:'));
      console.log('📸 =======================================');
      
      // Validar que el base64 es válido
      if (!base64Image || !base64Image.startsWith('data:')) {
        console.error('❌ Base64 inválido!');
        toast.error('Error: Imagen inválida');
        return;
      }
      
      // Mostrar preview inmediatamente
      console.log('📸 Estableciendo preview...');
      setPreview(base64Image);
      
      // IMPORTANTE: Pasar el base64 temporalmente al padre para que se vea en Vista Previa
      console.log('📸 Llamando onChange con base64...');
      onChange(base64Image);
      
      setUploadProgress(50);
      console.log('📸 Preview establecido correctamente');
    };
    
    reader.onerror = (error) => {
      console.error('❌ Error leyendo archivo:', error);
      throw new Error('Error al leer el archivo');
    };
    
    // Leer el archivo como Data URL (base64)
    reader.readAsDataURL(file);
    
    // PASO 2: Subir al servidor en background
    const generateTempFileName = () => {
      const productCode = productInfo?.codigo_interno || 
                         productInfo?.codigo_barras || 
                         productInfo?.codigoInterno ||
                         productInfo?.codigoBarras ||
                         `TEMP_${Date.now()}`;
      
      const cleanCode = productCode.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      
      return `${cleanCode}_${timestamp}.${extension}`;
    };

    const formData = new FormData();
    const tempFileName = generateTempFileName();
    
    const renamedFile = new File([file], tempFileName, {
      type: file.type
    });
    
    formData.append('image', renamedFile);
    formData.append('isTemporary', 'true');
    formData.append('productCode', productInfo?.codigo_interno || productInfo?.codigo_barras || '');

    const response = await fetch('/api/inventory/upload-image', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Upload exitoso al servidor:', result.data);
      
      const tempImageData = {
        tempPath: result.data.tempPath,
        tempFilename: result.data.filename,
        finalName: tempFileName
      };
      
      const imageUrl = `/uploads/temp/${result.data.filename}`;
      
      //  PASAR DATOS AL FORMULARIO (la URL del servidor para guardar después)
      onChange({
        url: imageUrl,
        tempData: tempImageData,
        isTemporary: true
      });
      
      setUploadProgress(100);
      setTimeout(() => {
        setLoading(false);
        setUploadProgress(0);
        toast.success(`Imagen cargada correctamente`, { duration: 2000 });
      }, 300);
    } else {
      throw new Error(result.message || 'Error al subir imagen temporal');
    }

  } catch (error) {
    setLoading(false);
    setUploadProgress(0);
    toast.error(`Error: ${error.message}`);
    console.error('❌ Error en handleFile:', error);
  }
};

  // Limpiar imagen
  const clearImage = () => {
    setPreview('');
    setFileInfo(null); // Limpiar info del archivo
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Imagen eliminada');
  };

  // Obtener estadísticas de la imagen - VERSIÓN SIMPLIFICADA
  const imageStats = value && fileInfo ? {
    size: fileInfo.size,
    format: 'JPEG optimizado',
    dimensions: `${targetSize}×${targetSize}px`
  } : null;

  return (
    <div className={`space-y-3 ${className}`}>
      
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={loading}
      />
      
      {/* Zona de subida compacta con info */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-all duration-300 bg-white/95 backdrop-blur-sm ${
            dragActive 
            ? 'border-blue-400 bg-blue-50/95 backdrop-blur-sm shadow-md' 
            : 'border-gray-300 hover:border-gray-400'
        } ${loading ? 'pointer-events-none opacity-75' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        >
        
        {loading ? (
          <div className="flex items-center gap-3">
            <Loader className="h-6 w-6 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
            <span className="text-sm text-blue-600 font-medium">{uploadProgress}%</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Fila principal */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Upload className="h-6 w-6 text-blue-500 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {value ? '✓ Imagen cargada' : 'Seleccionar imagen'}
                  </span>
                  {!value && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      JPG, PNG, WEBP • Máx. {maxSize}MB
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {value ? 'Cambiar' : 'Subir'}
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            {/* Fila de información de la imagen */}
            {value && fileInfo && (
              <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Image className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{fileInfo.name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>•</span>
                  <span>{fileInfo.size} KB</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>•</span>
                  <span>400×400px</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    ✓ Optimizada
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default ImageUploader;
