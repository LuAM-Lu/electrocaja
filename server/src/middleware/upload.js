// server/src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp'); // Para redimensionar imágenes

// Configurar storage de multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/products/temp');
    
    // Asegurar que el directorio existe
    try {
      await fs.access(uploadPath);
    } catch (error) {
      await fs.mkdir(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp-random-nombre.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo JPEG, PNG y WebP'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1 // Solo una imagen por vez
  }
});

// Función para procesar imagen (redimensionar y crear thumbnail)
const processImage = async (tempFilePath, filename) => {
  const originalPath = path.join(__dirname, '../../uploads/products/original', filename);
  const thumbnailPath = path.join(__dirname, '../../uploads/products/thumbnails', filename);
  
  try {
    // Mover/procesar imagen original (max 1200px de ancho)
    await sharp(tempFilePath)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(originalPath);

    // Crear thumbnail (200x200px)
    await sharp(tempFilePath)
      .resize(200, 200, { 
        fit: 'cover',
        position: 'center' 
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Eliminar archivo temporal
    await fs.unlink(tempFilePath);

    return {
      original: `/uploads/products/original/${filename}`,
      thumbnail: `/uploads/products/thumbnails/${filename}`
    };

  } catch (error) {
    // Limpiar archivo temporal si hay error
    try {
      await fs.unlink(tempFilePath);
    } catch (unlinkError) {
      console.error('Error eliminando archivo temporal:', unlinkError);
    }
    throw error;
  }
};

// Middleware para eliminar imagen anterior
const deleteOldImage = async (imagenUrl) => {
  if (!imagenUrl || imagenUrl.startsWith('data:')) return; // Skip base64

  try {
    const filename = path.basename(imagenUrl);
    
    const originalPath = path.join(__dirname, '../../uploads/products/original', filename);
    const thumbnailPath = path.join(__dirname, '../../uploads/products/thumbnails', filename);

    await Promise.allSettled([
      fs.unlink(originalPath),
      fs.unlink(thumbnailPath)
    ]);

    console.log(`Imagen eliminada: ${filename}`);
  } catch (error) {
    console.error('Error eliminando imagen anterior:', error);
  }
};

module.exports = {
  upload: upload.single('image'),
  processImage,
  deleteOldImage
};