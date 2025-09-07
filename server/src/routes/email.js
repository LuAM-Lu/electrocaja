// routes/email.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const { enviarFactura } = require('../controllers/emailController');

// 🔧 USAR EL MISMO IMPORT QUE whatsapp.js
const { verifyToken } = require('../middleware/auth'); // Si es opción B
// O const auth = require('../middleware/auth'); // Si es opción A

// 🔧 USAR EL MISMO MIDDLEWARE QUE whatsapp.js
router.post('/enviar-factura', verifyToken, enviarFactura); // Si es opción B
// O router.post('/enviar-factura', auth, enviarFactura); // Si es opción A

module.exports = router;