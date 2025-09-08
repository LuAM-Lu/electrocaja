const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs'); // ✅ AGREGAR ESTA LÍNEA
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// 🆕 IMPORT DE PRISMA PARA LIBERACIÓN DE RESERVAS
const prisma = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const cajaRoutes = require('./routes/cajas');
const usersRoutes = require('./routes/users');
const clientesRoutes = require('./routes/clientes');
const proveedoresRoutes = require('./routes/proveedores');
const auditoriaRoutes = require('./routes/auditoria')
//const reporteEmpleadoRouter = require('./routes/reporteEmpleado');

const app = express();

// Crear servidor HTTPS usando los mismos certificados del frontend
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../../client/localhost+2-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../../client/localhost+2.pem'))
};

const server = https.createServer(httpsOptions, app);

// 🔧 CONFIGURAR SOCKET.IO CON CORS DESDE .ENV
const socketCorsOrigins = process.env.SOCKET_CORS_ORIGINS 
  ? process.env.SOCKET_CORS_ORIGINS.split(',')
  : [
      'https://localhost:5174', 
      'https://localhost:5173',
      'http://localhost:5173',
      `https://${process.env.LOCAL_IP || '192.168.1.11'}:5174`
    ];

const io = new Server(server, {
  cors: {
    origin: socketCorsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// 🆕 ESTADO GLOBAL MEJORADO PARA SESIONES ÚNICAS + BLOQUEOS
if (!global.estadoApp) {
  global.estadoApp = {
    usuarios_conectados: new Map(),
    sesiones_por_usuario: new Map(),
    sesiones_api: new Map(),
    // 🆕 Estados de bloqueo
    usuarios_bloqueados: false,
    motivo_bloqueo: '',
    usuario_cerrando: '',
    timestamp_bloqueo: null,
    diferencias_pendientes: null,
    // 🆕 Estado de tasa BCV
    // TODO: FUTURO - Migrar a tabla 'configuracion' para persistir reinicio servidor
    tasa_bcv: {
      valor: 0.00,           // Valor por defecto
      modo: 'ERROR',           // 'AUTO' o 'MANUAL'
      admin: null,            // Quién la cambió por última vez
      timestamp: new Date().toISOString()
    }
  };
}
// 🆕 Actualizar tasa BCV al iniciar servidor
const actualizarTasaInicial = async () => {
  try {
    console.log('🔄 Actualizando tasa BCV al iniciar servidor...');
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    
    if (response.ok) {
      const data = await response.json();
      const nuevaTasa = data.promedio;
      
      global.estadoApp.tasa_bcv = {
        valor: nuevaTasa,
        modo: 'AUTO',
        admin: 'SISTEMA',
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Tasa BCV actualizada al iniciar: $${nuevaTasa.toFixed(2)}`);
    } else {
      console.log('⚠️ No se pudo obtener tasa BCV - Conexión fallida');
      global.estadoApp.tasa_bcv.modo = 'ERROR';
    }
  } catch (error) {
    console.error('❌ Error actualizando tasa inicial:', error.message);
    console.log('⚠️ Usando tasa por defecto: $0.00');
  }
};

// Ejecutar actualización al iniciar
actualizarTasaInicial();

// 🆕 Middleware para autenticar Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('⚠️ Socket sin token, permitiendo conexión local');
      return next();
    }

    // Verificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    socket.userId = decoded.userId || decoded.id;
    socket.userEmail = decoded.email;
    socket.userName = decoded.nombre || decoded.name;
    
    next();
  } catch (error) {
    console.log('⚠️ Socket con token inválido, permitiendo conexión local');
    next(); // Permitir conexiones locales sin token válido
  }
});

// Middleware de logging
app.use(morgan('combined'));

// 🔧 CORS CONFIGURATION PRINCIPAL - USANDO .ENV
const localIP = process.env.LOCAL_IP || '192.168.1.11';
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      // Localhost variants
      'https://localhost:5174',
      'https://localhost:5173', 
      'http://localhost:5173',
      'https://localhost:3000',
      'http://localhost:3000',
      // 127.0.0.1 variants
      'https://127.0.0.1:5174',
      'https://127.0.0.1:5173',
      'http://127.0.0.1:5173',
      'https://127.0.0.1:3000',
      'http://127.0.0.1:3000',
      // Dynamic local IP variants
      `https://${localIP}:5174`,
      `https://${localIP}:5173`,
      `https://${localIP}:3000`,
      `http://${localIP}:5173`,
      `http://${localIP}:3000`
    ];

console.log('🔧 CORS - Orígenes permitidos:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (aplicaciones móviles, Postman, etc.)
    if (!origin) {
      console.log('🌐 Request sin origin permitido');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS permitido para origen:', origin);
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado para origen:', origin);
      // En desarrollo, permitir todos los orígenes
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Modo desarrollo: permitiendo origen no listado');
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Requested-With',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// 🔧 APLICAR CORS MIDDLEWARE PRIMERO
app.use(cors(corsOptions));

// 🔧 MIDDLEWARE ADICIONAL PARA PREFLIGHT REQUESTS
app.options('*', cors(corsOptions));

// 🔧 MIDDLEWARE ADICIONAL PARA HEADERS MANUALES (BACKUP)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '86400'); // 24 horas
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔧 Preflight request para:', req.path);
    return res.sendStatus(200);
  }
  
  next();
});
// Agregar después de los otros middlewares:
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Parsers de body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// PASAR IO A LAS RUTAS PARA NOTIFICACIONES EN TIEMPO REAL
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Ruta principal con estado
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Electro Caja API multisesión funcionando',
    timestamp: new Date().toISOString(),
    usuarios_conectados: global.estadoApp.usuarios_conectados.size,
    sesiones_api: global.estadoApp.sesiones_api.size,
    usuarios_bloqueados: global.estadoApp.usuarios_bloqueados,
    motivo_bloqueo: global.estadoApp.motivo_bloqueo,
    servidor: {
      ip_local: localIP,
      puerto: process.env.PORT || 3001,
      socket_io: 'activo',
      cors_origins: allowedOrigins,
      node_env: process.env.NODE_ENV
    },
    routes: {
      auth: '/api/auth',
      cajas: '/api/cajas'
    }
  });
});

// 🆕 Endpoint para debug de CORS
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS funcionando correctamente',
    origin: req.headers.origin,
    user_agent: req.headers['user-agent'],
    referer: req.headers.referer,
    timestamp: new Date().toISOString(),
    allowed_origins: allowedOrigins
  });
});

// 🆕 Endpoint para debug de sesiones
app.get('/api/sessions/debug', (req, res) => {
  const sesiones = Array.from(global.estadoApp.usuarios_conectados.values());
  const sesionesPorUsuario = Object.fromEntries(global.estadoApp.sesiones_por_usuario);
  const sesionesApi = Object.fromEntries(global.estadoApp.sesiones_api);
  
  res.json({
    success: true,
    data: {
      total_sesiones_socket: sesiones.length,
      total_sesiones_api: Object.keys(sesionesApi).length,
      usuarios_bloqueados: global.estadoApp.usuarios_bloqueados,
      motivo_bloqueo: global.estadoApp.motivo_bloqueo,
      usuario_cerrando: global.estadoApp.usuario_cerrando,
      sesiones_socket: sesiones,
      mapeo_usuarios: sesionesPorUsuario,
      sesiones_api: sesionesApi
    }
  });
});

// 🆕 Endpoint para consultar estado de tasa BCV
app.get('/api/tasa-bcv/estado', (req, res) => {
  res.json({
    success: true,
    data: global.estadoApp.tasa_bcv,
    timestamp_consulta: new Date().toISOString()
  });
});

// 🔥 INICIALIZAR WHATSAPP SERVICE AUTOMÁTICAMENTE
const whatsappService = require('./services/whatsappService');

// 🚀 FUNCIÓN DE INICIALIZACIÓN AUTOMÁTICA
async function inicializarServicios() {
  console.log('🔄 Inicializando servicios del servidor...');
  
  try {
    // 📱 INICIALIZAR WHATSAPP AUTOMÁTICAMENTE
    console.log('📱 Iniciando WhatsApp Service...');
    await whatsappService.inicializar();
    console.log('✅ WhatsApp Service operativo');
    
    // 📊 MOSTRAR ESTADO DE LA SESIÓN
    const estado = whatsappService.getEstado();
    if (estado.conectado) {
      console.log(`🟢 WhatsApp conectado con número: ${estado.numero}`);
    } else if (estado.qrCode) {
      console.log('📱 QR generado - Escanear para autenticar');
    } else {
      console.log('⏳ WhatsApp inicializando...');
    }
    
  } catch (error) {
    console.error('❌ Error inicializando WhatsApp:', error.message);
    console.log('⚠️ El servidor continuará funcionando sin WhatsApp');
  }
}

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/cajas', cajaRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/ventas', require('./routes/ventas')); // 🆕 RUTAS DE VENTAS
app.use('/api/email', require('./routes/email')); // 🆕 RUTAS DE EMAIL
app.use('/api/reportes', require('./routes/reportes')); // 🎯 RUTAS DE REPORTES
app.use('/api/auditoria', require('./routes/auditoria')); // 🆕 RUTAS DE AUDITORIA INVENTARIO
//app.use('/api/reportes', reporteEmpleadoRouter);// 🆕 RUTAS DE VENDEDOR
app.use('/api/presupuestos', require('./routes/presupuestos')); // 🆕 RUTAS DE PRESUPUESTOS


// 🔧 SOCKET.IO - EVENTOS COMPLETOS CON BLOQUEOS
io.on('connection', (socket) => {
  console.log('👤 Nueva conexión Socket.IO:', socket.id);

  // 🆕 Al conectarse, verificar si hay bloqueo activo
  if (global.estadoApp.usuarios_bloqueados) {
    console.log(`🔒 Enviando estado de bloqueo al nuevo usuario: ${socket.id}`);
    socket.emit('bloquear_usuarios', {
      motivo: global.estadoApp.motivo_bloqueo,
      usuario_cerrando: global.estadoApp.usuario_cerrando,
      timestamp: global.estadoApp.timestamp_bloqueo
    });
  }

  // 🆕 Evento: Usuario se conecta (desde login)
  socket.on('user-connected', (data) => {
    const { user, timestamp } = data;
    
    console.log(`✅ Usuario conectándose: ${user.nombre} (ID: ${user.id})`);
    
    // 🚨 VERIFICAR SESIÓN ÚNICA
    const sesionExistente = global.estadoApp.sesiones_por_usuario.get(user.id);
    
    if (sesionExistente && sesionExistente !== socket.id) {
      console.log(`⚠️ SESIÓN DUPLICADA detectada para ${user.nombre}`);
      console.log(`   - Sesión anterior: ${sesionExistente}`);
      console.log(`   - Nueva sesión: ${socket.id}`);
      
      // Forzar logout de la sesión anterior
console.log(`🚫 Enviando force_logout a sesión: ${sesionExistente}`);
io.to(sesionExistente).emit('force_logout', {
  message: `Tu sesión ha sido cerrada porque iniciaste sesión desde otro dispositivo`
});
      // Limpiar datos de la sesión anterior
      global.estadoApp.usuarios_conectados.delete(sesionExistente);
      
      // Notificar desconexión de la sesión anterior
      socket.broadcast.emit('user-disconnected', {
        userId: user.id,
        userName: user.nombre,
        timestamp: new Date().toISOString(),
        reason: 'force_logout'
      });
    }
    
    // Registrar nueva sesión
    global.estadoApp.sesiones_por_usuario.set(user.id, socket.id);
    global.estadoApp.usuarios_conectados.set(socket.id, {
      ...user,
      socket_id: socket.id,
      ip_cliente: socket.handshake.address,
      timestamp_conexion: timestamp,
      ultima_actividad: new Date().toISOString()
    });

    // Unirse a sala por sucursal
    socket.join(`sucursal_${user.sucursal}`);

    // Notificar a OTROS usuarios sobre la nueva conexión
    socket.broadcast.emit('user-connected', {
      user,
      timestamp
    });

    // Enviar lista completa de usuarios conectados al nuevo cliente
    const usuariosConectados = Array.from(global.estadoApp.usuarios_conectados.values());
    socket.emit('connected-users-list', usuariosConectados.map(u => ({
      id: u.id,
      nombre: u.nombre,
      rol: u.rol,
      sucursal: u.sucursal,
      ultima_actividad: u.ultima_actividad
    })));

    console.log(`👥 Total sesiones activas: ${global.estadoApp.usuarios_conectados.size}`);
    console.log(`📋 Usuarios conectados:`, usuariosConectados.map(u => `${u.nombre} (${u.rol})`));

     // 🔧 AGREGAR ESTA LÍNEA AQUÍ:
  io.emit('usuarios_conectados_actualizado', {
    total: global.estadoApp.usuarios_conectados.size,
    usuarios: usuariosConectados.map(u => `${u.nombre} (${u.rol})`)
  });

  });

  // 🆕 EVENTO: BLOQUEAR USUARIOS (CIERRE DE CAJA)
  socket.on('bloquear_usuarios', (data) => {
    const { motivo, usuario_cerrando, timestamp } = data;
    
    console.log('🔒 ===== BLOQUEANDO USUARIOS =====');
    console.log('🔒 Motivo:', motivo);
    console.log('🔒 Usuario cerrando:', usuario_cerrando);
    console.log('🔒 Timestamp:', timestamp);
    
    // Actualizar estado global
    global.estadoApp.usuarios_bloqueados = true;
    global.estadoApp.motivo_bloqueo = motivo;
    global.estadoApp.usuario_cerrando = usuario_cerrando;
    global.estadoApp.timestamp_bloqueo = timestamp;
    
    // Emitir a TODOS los usuarios conectados
    io.emit('bloquear_usuarios', {
      motivo,
      usuario_cerrando,
      timestamp
    });
    
    console.log(`🔒 Usuarios bloqueados: ${global.estadoApp.usuarios_conectados.size} usuarios afectados`);
    console.log('🔒 ================================');
  });

  // 🆕 EVENTO: BLOQUEAR USUARIOS POR DIFERENCIAS (CEO)
  socket.on('bloquear_usuarios_diferencia', (data) => {
    const { mensaje, diferencias, usuario_cerrando, timestamp } = data;
    
    console.log('🚨 ===== BLOQUEO POR DIFERENCIAS =====');
    console.log('🚨 Mensaje:', mensaje);
    console.log('🚨 Diferencias:', diferencias);
    console.log('🚨 Usuario cerrando:', usuario_cerrando);
    console.log('🚨 Timestamp:', timestamp);
    
    // Actualizar estado global
    global.estadoApp.usuarios_bloqueados = true;
    global.estadoApp.motivo_bloqueo = mensaje;
    global.estadoApp.usuario_cerrando = usuario_cerrando;
    global.estadoApp.timestamp_bloqueo = timestamp;
    global.estadoApp.diferencias_pendientes = diferencias;
    
    // Emitir a TODOS los usuarios conectados
    io.emit('bloquear_usuarios_diferencia', {
      mensaje,
      diferencias,
      usuario_cerrando,
      timestamp
    });
    
    console.log(`🚨 Usuarios bloqueados por diferencias: ${global.estadoApp.usuarios_conectados.size} usuarios afectados`);
    console.log('🚨 ===================================');
  });

  // 🆕 EVENTO: DESBLOQUEAR USUARIOS
  socket.on('desbloquear_usuarios', (data) => {
    const { motivo, timestamp } = data;
    
    console.log('🔓 ===== DESBLOQUEANDO USUARIOS =====');
    console.log('🔓 Motivo:', motivo);
    console.log('🔓 Timestamp:', timestamp);
    
    // Limpiar estado global
    global.estadoApp.usuarios_bloqueados = false;
    global.estadoApp.motivo_bloqueo = '';
    global.estadoApp.usuario_cerrando = '';
    global.estadoApp.timestamp_bloqueo = null;
    global.estadoApp.diferencias_pendientes = null;
    
    // Emitir a TODOS los usuarios conectados
    io.emit('desbloquear_usuarios', {
      motivo,
      timestamp
    });
    
    console.log(`🔓 Usuarios desbloqueados: ${global.estadoApp.usuarios_conectados.size} usuarios liberados`);
    console.log('🔓 ===================================');
  });

  // 🆕 Evento: Solicitar lista de usuarios conectados
  socket.on('get-connected-users', () => {
    const usuariosConectados = Array.from(global.estadoApp.usuarios_conectados.values());
    socket.emit('connected-users-list', usuariosConectados.map(u => ({
      id: u.id,
      nombre: u.nombre,
      rol: u.rol,
      sucursal: u.sucursal,
      ultima_actividad: u.ultima_actividad
    })));
    console.log(`📋 Lista enviada a ${socket.id}: ${usuariosConectados.length} usuarios`);
  });

  // 🔧 EVENTO: Usuario se está desconectando (logout manual)
  socket.on('user-disconnecting', (data) => {
    const { userId, userName, timestamp } = data;
    
    console.log(`👋 LOGOUT MANUAL recibido de: ${userName}`);
    console.log(`   - Socket ID: ${socket.id}`);
    console.log(`   - User ID: ${userId}`);
    
    // Buscar y eliminar la sesión
    const usuarioData = global.estadoApp.usuarios_conectados.get(socket.id);
    
    if (usuarioData) {
      console.log(`🧹 Eliminando sesión de ${userName}`);
      
      // Eliminar de ambos mapas
      global.estadoApp.usuarios_conectados.delete(socket.id);
      global.estadoApp.sesiones_por_usuario.delete(userId);
      
      // Notificar a TODOS los otros usuarios
      socket.broadcast.emit('user-disconnected', {
        userId,
        userName,
        timestamp,
        reason: 'manual-logout'
      });
       // 🔧 AGREGAR ESTA LÍNEA AQUÍ:
    io.emit('usuarios_conectados_actualizado', {
      total: global.estadoApp.usuarios_conectados.size,
      usuarios: Array.from(global.estadoApp.usuarios_conectados.values()).map(u => `${u.nombre} (${u.rol})`)
    });
      
      console.log(`✅ Sesión de ${userName} eliminada correctamente`);
      console.log(`👥 Sesiones activas restantes: ${global.estadoApp.usuarios_conectados.size}`);
      
      // Confirmar al cliente
      socket.emit('logout-confirmed', {
        message: 'Logout procesado correctamente en el servidor',
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`⚠️ No se encontró sesión para ${userName} en socket ${socket.id}`);
    }
  });

  // Eventos legacy del sistema anterior
  socket.on('user_login', (userData) => {
    console.log(`✅ Usuario conectado via evento legacy: ${userData.nombre}`);
    
    global.estadoApp.usuarios_conectados.set(socket.id, {
      ...userData,
      socket_id: socket.id,
      ip_cliente: socket.handshake.address,
      timestamp_conexion: new Date().toISOString(),
      ultima_actividad: new Date().toISOString()
    });

    socket.join(`sucursal_${userData.sucursal}`);
    socket.to(`sucursal_${userData.sucursal}`).emit('usuario_conectado', {
      usuario: userData.nombre,
      total_conectados: global.estadoApp.usuarios_conectados.size
    });

    io.emit('usuarios_updated', Array.from(global.estadoApp.usuarios_conectados.values()));
    
    socket.emit('sync_complete', {
      mensaje: 'Conectado exitosamente al servidor',
      usuarios_conectados: Array.from(global.estadoApp.usuarios_conectados.values()),
      tu_socket_id: socket.id
    });
  });

              // 🆕 EVENTOS DE CAJA - APERTURA Y CIERRE
              socket.on('caja_abierta', (data) => {
                console.log('📦 ===== CAJA ABIERTA =====');
                console.log('📦 Usuario:', data.usuario);
                console.log('📦 Caja ID:', data.caja?.id);
                console.log('📦 Timestamp:', data.timestamp);
                
                // Emitir a TODOS los usuarios conectados
                io.emit('caja_abierta', {
                  usuario: data.usuario,
                  caja: data.caja, // 🔧 INCLUIR DATOS COMPLETOS DE LA CAJA
                  timestamp: data.timestamp || new Date().toISOString()
                });
                
                console.log(`📦 Evento caja_abierta enviado a ${global.estadoApp.usuarios_conectados.size} usuarios`);
                console.log('📦 ===========================');
              });

              socket.on('caja_cerrada', (data) => {
                console.log('🔒 ===== CAJA CERRADA =====');
                console.log('🔒 Usuario:', data.usuario);
                console.log('🔒 Caja ID:', data.caja?.id);
                console.log('🔒 Timestamp:', data.timestamp);
                
                // Emitir a TODOS los usuarios conectados
                io.emit('caja_cerrada', {
                  usuario: data.usuario,
                  caja: data.caja, // 🔧 INCLUIR DATOS COMPLETOS DE LA CAJA
                  timestamp: data.timestamp || new Date().toISOString()
                });
                
                console.log(`🔒 Evento caja_cerrada enviado a ${global.estadoApp.usuarios_conectados.size} usuarios`);
                console.log('🔒 ===========================');
              });


  // Eventos de caja
  socket.on('caja_updated', (data) => {
    console.log(`📦 Caja actualizada via Socket.IO`);
    socket.broadcast.emit('caja_updated', data);
  });

// 🆕 EVENTO: Tasa BCV automática actualizada (refresh)
socket.on('tasa_auto_updated', (data) => {
  const { tasa, admin, timestamp } = data;
  
  console.log('🔄 ===== TASA AUTO ACTUALIZADA =====');
  console.log('🔄 Nueva tasa:', tasa);
  console.log('🔄 Admin que refrescó:', admin);
  console.log('🔄 Timestamp:', timestamp);
  
  // Actualizar estado global del servidor
  global.estadoApp.tasa_bcv = {
    valor: tasa,
    modo: 'AUTO',
    admin: admin,
    timestamp: timestamp
  };
  
  // Emitir a TODOS los usuarios conectados (incluyendo el que la refrescó)
  io.emit('tasa_auto_updated', {
    tasa,
    admin,
    timestamp
  });
  
  console.log(`🔄 Tasa AUTO enviada a ${global.estadoApp.usuarios_conectados.size} usuarios`);
  console.log('🔄 Estado servidor actualizado:', global.estadoApp.tasa_bcv);
  console.log('🔄 ===================================');
});

  socket.on('nueva_transaccion', (data) => {
    console.log(`💰 Nueva transacción via Socket.IO de ${data.usuario}: ${data.transaccion?.tipo}`);
    // Solo broadcast si es válida y tiene datos
    if (data && data.transaccion) {
      socket.broadcast.emit('transaction-added', data);
      console.log(`📡 Transaction-added enviado a otros usuarios`);
    } else {
      console.log('⚠️ Datos de transacción inválidos, no se envía broadcast');
    }
  });

  socket.on('transaccion_eliminada', (data) => {
    console.log(`🗑️ Transacción eliminada via Socket.IO: ${data.transaccionId}`);
    socket.broadcast.emit('transaction-deleted', data);
  });

  socket.on('arqueo_realizado', (arqueoData) => {
    console.log(`🧮 Arqueo realizado via Socket.IO`);
    socket.broadcast.emit('arqueo_actualizado', arqueoData);
  });

// 🆕 EVENTO: Tasa BCV manual actualizada
socket.on('tasa_manual_updated', (data) => {
  const { tasa, admin, timestamp } = data;
  
  console.log('💱 ===== TASA MANUAL ACTUALIZADA =====');
  console.log('💱 Nueva tasa:', tasa);
  console.log('💱 Admin que cambió:', admin);
  console.log('💱 Timestamp:', timestamp);
  
  // Actualizar estado global del servidor
  global.estadoApp.tasa_bcv = {
    valor: tasa,
    modo: 'MANUAL',
    admin: admin,
    timestamp: timestamp
  };
  
  // Emitir a TODOS los usuarios conectados (incluyendo el que la cambió)
  io.emit('tasa_manual_updated', {
    tasa,
    admin,
    timestamp
  });
  
  console.log(`💱 Tasa manual enviada a ${global.estadoApp.usuarios_conectados.size} usuarios`);
  console.log('💱 Estado servidor actualizado:', global.estadoApp.tasa_bcv);
  console.log('💱 ===================================');
});

  // Actividad del usuario
  socket.on('user_activity', (data) => {
    if (global.estadoApp.usuarios_conectados.has(socket.id)) {
      const usuario = global.estadoApp.usuarios_conectados.get(socket.id);
      usuario.ultima_actividad = new Date().toISOString();
      if (data?.accion) {
        usuario.ultima_accion = data.accion;
      }
      global.estadoApp.usuarios_conectados.set(socket.id, usuario);
    }
  });

  // 🔧 DESCONEXIÓN MEJORADA
  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket desconectado: ${socket.id} (${reason})`);
    
    const usuario = global.estadoApp.usuarios_conectados.get(socket.id);
    if (usuario) {
      console.log(`👋 Limpiando sesión por desconexión: ${usuario.nombre}`);
      
      // Limpiar mapeos
      global.estadoApp.usuarios_conectados.delete(socket.id);
      if (usuario.id) {
        global.estadoApp.sesiones_por_usuario.delete(usuario.id);
      }

      // 🆕 LIBERAR RESERVAS INMEDIATAMENTE AL DESCONECTAR
      liberarReservasPorDesconexion(usuario.email, reason);
      
      // Solo notificar si NO fue un logout manual previo
      if (reason !== 'client namespace disconnect') {
        socket.broadcast.emit('user-disconnected', {
          userId: usuario.id,
          userName: usuario.nombre,
          timestamp: new Date().toISOString(),
          reason: reason
        });
      }
      // 🔧 AGREGAR ESTA LÍNEA AQUÍ:
    io.emit('usuarios_conectados_actualizado', {
      total: global.estadoApp.usuarios_conectados.size,
      usuarios: Array.from(global.estadoApp.usuarios_conectados.values()).map(u => `${u.nombre} (${u.rol})`)
    });
      console.log(`👥 Sesiones activas tras desconexión: ${global.estadoApp.usuarios_conectados.size}`);
    }
  });

  // Error de Socket.IO
  socket.on('error', (error) => {
    console.error('❌ Error en Socket.IO:', error);
  });
});

// 🔓 FUNCIÓN PARA LIBERAR RESERVAS POR DESCONEXIÓN
const liberarReservasPorDesconexion = async (userEmail, reason) => {
  try {
    console.log(`🔓 ===== LIBERACIÓN POR DESCONEXIÓN =====`);
    console.log(`📱 Usuario: ${userEmail}`);
    console.log(`🔌 Motivo: ${reason}`);
    
    // Buscar reservas activas de sesiones (NO ventas en espera)
    const reservasUsuario = await prisma.stockMovement.findMany({
      where: {
        usuario: { email: userEmail },
        tipo: 'RESERVA',
        transaccionId: null,
        motivo: { startsWith: 'Sesión:' } // Solo sesiones de modal
      },
      include: {
        producto: {
          select: { descripcion: true }
        }
      }
    });
    
    if (reservasUsuario.length === 0) {
      console.log('✅ No hay reservas de sesión para liberar');
      return;
    }
    
    console.log(`🔓 Liberando ${reservasUsuario.length} reservas inmediatamente...`);
    
    // ✅ CORRECCIÓN: No usar transaccionId inválido
    await prisma.stockMovement.updateMany({
      where: {
        id: { in: reservasUsuario.map(r => r.id) }
      },
      data: {
        // ✅ NO USAR transaccionId que no existe
        observaciones: `LIBERADA POR DESCONEXIÓN: ${reason} - ${new Date().toISOString()} - PROCESADA`
      }
    });
    
    console.log(`✅ ${reservasUsuario.length} reservas liberadas por desconexión`);
    
    // 📡 NOTIFICAR A OTROS USUARIOS QUE HAY STOCK DISPONIBLE
    io.emit('stock_liberado_desconexion', {
      usuario: userEmail,
      reservasLiberadas: reservasUsuario.length,
      productos: reservasUsuario.map(r => r.producto.descripcion),
      motivo: reason,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📡 Notificación enviada: stock disponible por desconexión`);
    
  } catch (error) {
    console.error('❌ Error liberando reservas por desconexión:', error);
  }
};

// 🆕 CLEANUP: Limpiar sesiones inactivas cada 10 minutos
setInterval(() => {
  const ahora = Date.now();
  const diezMinutosAtras = ahora - (10 * 60 * 1000);
  
  let sesionesLimpiadas = 0;
  
  // Limpiar sesiones Socket.IO inactivas
  for (const [socketId, usuario] of global.estadoApp.usuarios_conectados.entries()) {
    const ultimaActividad = new Date(usuario.ultima_actividad).getTime();
    
    if (ultimaActividad < diezMinutosAtras) {
      console.log(`🧹 Limpiando sesión Socket.IO inactiva: ${usuario.nombre}`);
      
      global.estadoApp.usuarios_conectados.delete(socketId);
      if (usuario.id) {
        global.estadoApp.sesiones_por_usuario.delete(usuario.id);
      }
      
      io.emit('user-disconnected', {
        userId: usuario.id,
        userName: usuario.nombre,
        timestamp: new Date().toISOString(),
        reason: 'inactivity'
      });
      
      sesionesLimpiadas++;
    }
  }
  
  // Limpiar sesiones API inactivas (30 minutos)
  const treintaMinutosAtras = ahora - (30 * 60 * 1000);
  
  for (const [email, sesion] of global.estadoApp.sesiones_api.entries()) {
    const ultimaActividad = new Date(sesion.timestamp).getTime();
    
    if (ultimaActividad < treintaMinutosAtras) {
      console.log(`🧹 Limpiando sesión API inactiva: ${sesion.usuario}`);
      global.estadoApp.sesiones_api.delete(email);
      sesionesLimpiadas++;
    }
  }
  
  if (sesionesLimpiadas > 0) {
    console.log(`🧹 Sesiones limpiadas por inactividad: ${sesionesLimpiadas}`);
    console.log(`👥 Sesiones activas restantes: Socket.IO=${global.estadoApp.usuarios_conectados.size}, API=${global.estadoApp.sesiones_api.size}`);
  }
}, 10 * 60 * 1000); // Cada 10 minutos

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
// 🕚 PROGRAMAR AUTO-CIERRE DIARIO A LAS 11:55 PM
const AutoCierreService = require('./services/autoCierreService');

// Función para programar el próximo auto-cierre
const programarAutoCierre = () => {
  const ahora = new Date();
  const proximoAutoCierre = new Date();
  proximoAutoCierre.setHours(23, 55, 0, 0); // 11:55 PM
  
  // Si ya pasó la hora de hoy, programar para mañana
  if (ahora > proximoAutoCierre) {
    proximoAutoCierre.setDate(proximoAutoCierre.getDate() + 1);
  }
  
  const tiempoHastaAutoCierre = proximoAutoCierre.getTime() - ahora.getTime();
  
  console.log(`⏰ Auto-cierre programado para: ${proximoAutoCierre.toLocaleString('es-VE')}`);
  console.log(`⏱️ Tiempo restante: ${Math.round(tiempoHastaAutoCierre / 1000 / 60)} minutos`);
  
  setTimeout(async () => {
    console.log('🕚 Ejecutando auto-cierre programado...');
    await AutoCierreService.ejecutarAutoCierre();
    
    // Programar el siguiente auto-cierre (mañana)
    programarAutoCierre();
  }, tiempoHastaAutoCierre);
};

// Iniciar programación de auto-cierre
programarAutoCierre();

// 🧹 PROGRAMAR LIMPIEZA AUTOMÁTICA DE RESERVAS CADA 30 MINUTOS
setInterval(async () => {
  try {
    console.log('🧹 Ejecutando limpieza automática de reservas...');
    
    // Buscar reservas expiradas (más de 2 horas)
    const fechaLimite = new Date();
    fechaLimite.setHours(fechaLimite.getHours() - 2);

    const reservasExpiradas = await prisma.stockMovement.findMany({
      where: {
        tipo: 'RESERVA',
        transaccionId: null,
        fecha: {
          lt: fechaLimite
        }
      }
    });

    if (reservasExpiradas.length > 0) {
      console.log(`🧹 Encontradas ${reservasExpiradas.length} reservas expiradas, limpiando...`);
      
      // Marcar como procesadas
      // ✅ CORRECCIÓN: No usar transaccionId inválido
      await prisma.stockMovement.updateMany({
        where: {
          id: {
            in: reservasExpiradas.map(r => r.id)
          }
        },
        data: {
          // ✅ NO USAR transaccionId que no existe
          observaciones: `${new Date().toISOString()} - AUTO-LIBERADA POR EXPIRACIÓN - PROCESADA`
        }
      });

      // Notificar via WebSocket si está disponible
      if (global.estadoApp && io) {
        io.emit('reservas_auto_limpiadas', {
          reservasLiberadas: reservasExpiradas.length,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ ${reservasExpiradas.length} reservas limpiadas automáticamente`);
    }
  } catch (error) {
    console.error('❌ Error en limpieza automática de reservas:', error);
  }
}, 30 * 60 * 1000); // Cada 30 minutos

// 🕒 AUTO-LIMPIEZA AGRESIVA PARA MODALES DE VENTA (AFK 20 MIN)
setInterval(async () => {
  try {
    console.log('🚨 Ejecutando limpieza AFK para modales de venta...');
    
    const ahora = new Date();
    const veinteMinutosAtras = new Date(ahora.getTime() - (20 * 60 * 1000));
    
    // Buscar reservas de sesiones activas > 20 min (excluyendo ventas en espera)
    // 💓 RESPETA HEARTBEAT: Solo elimina reservas SIN actividad reciente
    const reservasVentasAFK = await require('./config/database').stockMovement.findMany({
      where: {
        tipo: 'RESERVA',
        transaccionId: null,
        fecha: {
          lt: veinteMinutosAtras
        },
        motivo: {
          startsWith: 'Sesión:'  // Solo sesiones de modal, no ventas en espera
        },
        // 🆕 EXCLUIR reservas renovadas recientemente por heartbeat
        NOT: {
          observaciones: {
            contains: 'renovada por heartbeat'
          },
          fecha: {
            gte: new Date(ahora.getTime() - (5 * 60 * 1000)) // Renovadas en últimos 5 min
          }
        }
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });
    
    if (reservasVentasAFK.length > 0) {
      console.log(`🚨 Modal AFK detectado: ${reservasVentasAFK.length} reservas > 20 min`);
      
      // Agrupar por usuario
      const usuariosAFK = new Map();
      reservasVentasAFK.forEach(reserva => {
        if (!usuariosAFK.has(reserva.usuario.email)) {
          usuariosAFK.set(reserva.usuario.email, {
            usuario: reserva.usuario,
            reservas: []
          });
        }
        usuariosAFK.get(reserva.usuario.email).reservas.push(reserva);
      });
      
      // Cerrar modales y liberar reservas
      for (const [email, info] of usuariosAFK) {
        console.log(`🚨 Cerrando modal AFK: ${info.usuario.nombre} (${info.reservas.length} reservas)`);
        
        // Buscar socket del usuario
        const usuarioSocket = Array.from(global.estadoApp.usuarios_conectados.entries())
          .find(([_, usuario]) => usuario.email === email);
        
        if (usuarioSocket) {
          const [socketId] = usuarioSocket;
          
          // Cerrar modal vía Socket.IO
          io.to(socketId).emit('cerrar_modal_venta_afk', {
            message: '⏰ Modal de venta cerrado por inactividad (20 min)\n🔓 Stock liberado automáticamente',
            reason: 'venta_afk_20_min',
            reservasLiberadas: info.reservas.length,
            timestamp: new Date().toISOString()
          });
        }
        
        // ✅ CORRECCIÓN: No usar transaccionId inválido, solo marcar como procesada
          await prisma.stockMovement.updateMany({
            where: {
              id: {
                in: info.reservas.map(r => r.id)
              }
            },
            data: {
              // ✅ NO USAR transaccionId que no existe
              observaciones: `${new Date().toISOString()} - LIBERADA POR MODAL AFK 20MIN - PROCESADA`
            }
          });
      }
      
      console.log(`✅ Modales AFK cerrados: ${usuariosAFK.size} usuarios`);
    }
  } catch (error) {
    console.error('❌ Error en limpieza AFK modal:', error);
  }
}, 5 * 60 * 1000); // Cada 5 minutos

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('❌ Error global del servidor:', error);
  
  // Si es un error de CORS
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Error CORS: Origen no permitido',
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});


// EXPORTAR SERVER Y FUNCIÓN DE INICIALIZACIÓN
module.exports = { server, inicializarServicios };