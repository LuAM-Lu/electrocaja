const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileController = require('../controllers/fileController');

// Configuración de almacenamiento temporal para subidas
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determinar destino basado en query param 'root' y 'path'
        // Como middleware se ejecuta antes del controlador, necesitamos resolver el path aquí o mover el archivo después.
        // Para simplificar, subimos a temporal y movemos en el controlador, o usamos un destino temporal fijo.
        // Mejor: Usamos un directorio temporal y el controlador mueve el archivo.
        const tempDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware para mover el archivo al destino final
const moveFileToFinalDest = (req, res, next) => {
    if (!req.file) return next();

    try {
        const { root, path: relativePath } = req.body; // Multer puts non-file fields in body
        let rootDir;
        if (root === 'uploads') {
            rootDir = path.join(__dirname, '../../uploads');
        } else if (root === 'public') {
            rootDir = path.join(__dirname, '../../../client/public');
        } else {
            // Default to uploads if not specified or invalid
            rootDir = path.join(__dirname, '../../uploads');
        }

        const targetDir = path.resolve(rootDir, relativePath || '');

        // Security check
        if (!targetDir.startsWith(rootDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const finalPath = path.join(targetDir, req.file.originalname);
        fs.renameSync(req.file.path, finalPath);

        // Update req.file.path to point to the new location
        req.file.path = finalPath;
        req.file.destination = targetDir;

        next();
    } catch (error) {
        // Clean up temp file
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Error saving file: ' + error.message });
    }
};

router.get('/list', fileController.getFileTree);
router.post('/upload', upload.single('file'), moveFileToFinalDest, fileController.uploadFile);
router.delete('/', fileController.deleteItem);
router.post('/folder', fileController.createFolder);
router.get('/download', fileController.downloadFile);

module.exports = router;
