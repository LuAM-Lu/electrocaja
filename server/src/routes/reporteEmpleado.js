// server/routes/reporteEmpleado.js
const express = require('express');
const router = express.Router();

// Ajustar el path del middleware
const { verifyToken } = require('../middleware/auth');

const {
  listarUsuariosVendedores,
  reporteEmpleado,
} = require('../controllers/reporteEmpleadoController');

router.get('/usuarios', verifyToken, listarUsuariosVendedores);
router.get('/empleado', verifyToken, reporteEmpleado);
module.exports = router;