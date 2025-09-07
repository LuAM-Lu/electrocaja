// components/inventario/ImageUploader.jsx
import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Image, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_CONFIG, getImageUrl } from '../../config/api';

const ImageUploader = ({ 
  value, 
  onChange, 
  productInfo = null, // 🆕 Info del producto para nombres inteligentes
  maxSize = 3, // MB
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  targetSize = 400, // px para redimensionar
  quality = 0.85,
  className = ""
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

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
      toast.error(`❌ Formato no válido\nSolo se permiten: ${formatsText}`);
      return false;
    }

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSize) {
      toast.error(`❌ Archivo muy grande\nTamaño máximo: ${maxSize}MB\nTamaño actual: ${sizeMB.toFixed(1)}MB`);
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

// ✅ VERSIÓN OPTIMIZADA CON CARPETA TEMPORAL
const handleFile = async (file) => {
  if (!validateFile(file)) return;

  setLoading(true);
  setUploadProgress(0);

  try {
    // 🔥 GENERAR NOMBRE INTELIGENTE TEMPORAL
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

    // Crear FormData para upload temporal
    const formData = new FormData();
    const tempFileName = generateTempFileName();
    
    // Renombrar archivo con código del producto
    const renamedFile = new File([file], tempFileName, {
      type: file.type
    });
    
    formData.append('image', renamedFile);
    formData.append('isTemporary', 'true'); // 🔥 FLAG para carpeta temporal
    formData.append('productCode', productInfo?.codigo_interno || productInfo?.codigo_barras || '');
    
    // Progreso simulado
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 15, 90));
    }, 200);

    // 🌐 UPLOAD A CARPETA TEMPORAL
    const response = await fetch('/api/inventory/upload-image', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });

    clearInterval(progressInterval);
    
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      // 🔥 GUARDAR INFO TEMPORAL para mover después
      const tempImageData = {
        tempPath: result.data.tempPath,
        tempFilename: result.data.filename,
        finalName: tempFileName
      };
      
      // Usar la URL temporal para preview
      const imageUrl = `/uploads/temp/${result.data.filename}`;
      setPreview(imageUrl);
      
      // 🔥 PASAR OBJETO CON INFO TEMPORAL
      onChange({
        url: imageUrl,
        tempData: tempImageData,
        isTemporary: true
      });
      
      setUploadProgress(100);
      setTimeout(() => {
        setLoading(false);
        setUploadProgress(0);
        
        toast.success(
          `📸 Imagen temporal: ${result.data.filename}\n✅ Se moverá al guardar el producto`, 
          { duration: 4000, icon: '⏳' }
        );
      }, 500);
    } else {
      throw new Error(result.message || 'Error al subir imagen temporal');
    }

  } catch (error) {
    setLoading(false);
    setUploadProgress(0);
    toast.error(`❌ Error al subir imagen: ${error.message}`);
    console.error('Error uploading temp image:', error);
  }
};

  // Limpiar imagen
  const clearImage = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('🗑️ Imagen eliminada');
  };

  // Obtener estadísticas de la imagen
  const getImageStats = () => {
    if (!preview) return null;
    
    const sizeKB = Math.round((preview.length * 0.75) / 1024); // Aproximación base64
    return {
      size: sizeKB,
      format: 'JPEG optimizado',
      dimensions: `${targetSize}×${targetSize}px`
    };
  };

  const imageStats = getImageStats();

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
      
      {/* Zona de drop principal */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 bg-white ${
            dragActive 
            ? 'border-indigo-400 bg-indigo-50 scale-105 shadow-lg' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${loading ? 'pointer-events-none opacity-75' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        >
        
        {loading ? (
          // Estado de carga
          <div className="space-y-3">
            <Loader className="h-12 w-12 text-indigo-600 mx-auto animate-spin" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-indigo-700">Procesando imagen...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-indigo-600">{uploadProgress}% completado</p>
            </div>
          </div>
        ) : preview ? (
          // Vista con imagen
          <div className="space-y-4">
            <div className="relative inline-block">
<img 
  src={(() => {
    // Si preview es un objeto con datos temporales, usar la URL temporal
    if (typeof preview === 'object' && preview.isTemporary) {
      return getImageUrl(preview.url);
    }
    // Si preview es una string (imagen existente), usar getImageUrl normal
    if (typeof preview === 'string') {
      return getImageUrl(preview);
    }
    // Si value existe (props desde el formulario), usarlo
    if (value) {
      return getImageUrl(value);
    }
    return '';
  })()} 
  alt="Preview" 
  className="w-40 h-40 object-contain rounded-xl mx-auto border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white"
/>
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-xl flex items-center justify-center">
                <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            
            {/* Estadísticas de la imagen */}
            {imageStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-4 text-xs text-green-700">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>{imageStats.format}</span>
                  </div>
                  <div>{imageStats.dimensions}</div>
                  <div>{imageStats.size}KB</div>
                </div>
              </div>
            )}
            
            {/* Botones de acción */}
            <div className="flex space-x-3 justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex items-center space-x-2 text-xs px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors font-medium"
              >
                <Camera className="h-3 w-3" />
                <span>Cambiar</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                className="flex items-center space-x-2 text-xs px-4 py-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors font-medium"
              >
                <X className="h-3 w-3" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        ) : (
          // Vista sin imagen
          <div className="py-8 px-4">
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-700">
                <span className="text-indigo-600 hover:text-indigo-700 transition-colors">Click para subir</span> o arrastra una imagen
              </p>
              <p className="text-sm text-gray-500">
                Formatos: {allowedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} • Máx. {maxSize}MB
              </p>
              <p className="text-xs text-gray-400">
                Se redimensionará automáticamente a {targetSize}×{targetSize}px
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ImageUploader;