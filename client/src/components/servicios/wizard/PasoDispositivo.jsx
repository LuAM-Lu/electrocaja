// components/servicios/wizard/PasoDispositivo.jsx - MEJORADO CON PRELLENADOS INTELIGENTES
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import Camera from 'lucide-react/dist/esm/icons/camera'
import X from 'lucide-react/dist/esm/icons/x'
import Upload from 'lucide-react/dist/esm/icons/upload'
import User from 'lucide-react/dist/esm/icons/user'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import CameraIcon from 'lucide-react/dist/esm/icons/camera'
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Laptop from 'lucide-react/dist/esm/icons/laptop'
import Monitor from 'lucide-react/dist/esm/icons/monitor'
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2'
import Tablet from 'lucide-react/dist/esm/icons/tablet'
import Watch from 'lucide-react/dist/esm/icons/watch'
import Headphones from 'lucide-react/dist/esm/icons/headphones'
import Zap from 'lucide-react/dist/esm/icons/zap'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Star from 'lucide-react/dist/esm/icons/star'
import toast from '../../../utils/toast.jsx';
import { useServiciosStore } from '../../../store/serviciosStore';
import { api } from '../../../config/api';

// Mapeo de clases de color para Tailwind
const COLOR_CLASSES = {
  blue: {
    bg: 'from-blue-600/20 to-blue-700/20',
    border: 'border-blue-500',
    text: 'text-blue-400'
  },
  purple: {
    bg: 'from-purple-600/20 to-purple-700/20',
    border: 'border-purple-500',
    text: 'text-purple-400'
  },
  indigo: {
    bg: 'from-indigo-600/20 to-indigo-700/20',
    border: 'border-indigo-500',
    text: 'text-indigo-400'
  },
  green: {
    bg: 'from-green-600/20 to-green-700/20',
    border: 'border-green-500',
    text: 'text-green-400'
  },
  pink: {
    bg: 'from-pink-600/20 to-pink-700/20',
    border: 'border-pink-500',
    text: 'text-pink-400'
  },
  cyan: {
    bg: 'from-cyan-600/20 to-cyan-700/20',
    border: 'border-cyan-500',
    text: 'text-cyan-400'
  },
  orange: {
    bg: 'from-orange-600/20 to-orange-700/20',
    border: 'border-orange-500',
    text: 'text-orange-400'
  },
  gray: {
    bg: 'from-gray-600/20 to-gray-700/20',
    border: 'border-gray-500',
    text: 'text-gray-400'
  }
};

// Tipos de dispositivos con iconos
const TIPOS_DISPOSITIVOS = [
  { id: 'telefono', label: 'Teléfono', icon: Smartphone, color: 'blue' },
  { id: 'laptop', label: 'Laptop', icon: Laptop, color: 'purple' },
  { id: 'pc', label: 'PC/Escritorio', icon: Monitor, color: 'indigo' },
  { id: 'consola', label: 'Consola', icon: Gamepad2, color: 'green' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, color: 'pink' },
  { id: 'smartwatch', label: 'Smartwatch', icon: Watch, color: 'cyan' },
  { id: 'accesorio', label: 'Accesorio', icon: Headphones, color: 'orange' },
  { id: 'otro', label: 'Otro', icon: Zap, color: 'gray' }
];

// Base de datos inteligente de marcas y modelos por tipo
const DISPOSITIVOS_INTELIGENTES = {
  telefono: {
    marcas: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OPPO', 'Vivo', 'OnePlus', 'Google', 'Motorola', 'Nokia', 'Realme', 'Honor'],
    modelos: {
      'Apple': ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone SE'],
      'Samsung': ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy A54', 'Galaxy A34', 'Galaxy Note 20', 'Galaxy Z Fold', 'Galaxy Z Flip'],
      'Xiaomi': ['Redmi Note 13 Pro', 'Redmi Note 13', 'Mi 14', 'POCO X6', 'POCO M6'],
      'Huawei': ['P60 Pro', 'Mate 60', 'Nova 12', 'P50'],
      'OPPO': ['Find X7', 'Reno 11', 'A98'],
      'Google': ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a']
    },
    colores: ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Rosa', 'Dorado', 'Plateado', 'Gris', 'Púrpura']
  },
  laptop: {
    marcas: ['HP', 'Dell', 'Lenovo', 'ASUS', 'Acer', 'Apple', 'MSI', 'Toshiba', 'Sony'],
    modelos: {
      'HP': ['Pavilion', 'Envy', 'Spectre', 'ProBook', 'EliteBook'],
      'Dell': ['XPS', 'Inspiron', 'Latitude', 'Alienware'],
      'Lenovo': ['ThinkPad', 'IdeaPad', 'Yoga', 'Legion'],
      'ASUS': ['ZenBook', 'VivoBook', 'ROG', 'TUF'],
      'Apple': ['MacBook Pro', 'MacBook Air', 'MacBook']
    },
    colores: ['Negro', 'Plata', 'Gris', 'Blanco', 'Azul', 'Rojo']
  },
  pc: {
    marcas: ['HP', 'Dell', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Gigabyte', 'Custom'],
    modelos: {
      'HP': ['Pavilion', 'EliteDesk', 'ProDesk'],
      'Dell': ['OptiPlex', 'Precision', 'Alienware'],
      'Custom': ['Armado', 'Gaming', 'Oficina']
    },
    colores: ['Negro', 'Blanco', 'Gris', 'RGB']
  },
  consola: {
    marcas: ['Sony', 'Microsoft', 'Nintendo', 'Steam'],
    modelos: {
      'Sony': ['PlayStation 5', 'PlayStation 4', 'PlayStation 4 Pro', 'PS Vita'],
      'Microsoft': ['Xbox Series X', 'Xbox Series S', 'Xbox One X', 'Xbox One'],
      'Nintendo': ['Switch OLED', 'Switch', 'Switch Lite', '3DS'],
      'Steam': ['Steam Deck']
    },
    colores: ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Rosa']
  },
  tablet: {
    marcas: ['Apple', 'Samsung', 'Huawei', 'Lenovo', 'Amazon'],
    modelos: {
      'Apple': ['iPad Pro', 'iPad Air', 'iPad', 'iPad mini'],
      'Samsung': ['Galaxy Tab S9', 'Galaxy Tab A9', 'Galaxy Tab S8'],
      'Huawei': ['MatePad Pro', 'MediaPad']
    },
    colores: ['Negro', 'Blanco', 'Azul', 'Rosa', 'Gris', 'Dorado']
  },
  smartwatch: {
    marcas: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Garmin'],
    modelos: {
      'Apple': ['Apple Watch Series 9', 'Apple Watch Series 8', 'Apple Watch SE'],
      'Samsung': ['Galaxy Watch 6', 'Galaxy Watch 5']
    },
    colores: ['Negro', 'Blanco', 'Azul', 'Rosa', 'Rojo', 'Verde']
  },
  accesorio: {
    marcas: ['Apple', 'Samsung', 'Sony', 'JBL', 'Bose', 'Logitech', 'Razer'],
    modelos: {
      'Apple': ['AirPods Pro', 'AirPods', 'Magic Mouse', 'Magic Keyboard'],
      'Sony': ['WH-1000XM5', 'WF-1000XM5'],
      'JBL': ['Tune', 'Charge', 'Flip']
    },
    colores: ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde']
  },
  otro: {
    marcas: [],
    modelos: {},
    colores: ['Negro', 'Blanco', 'Gris', 'Otro']
  }
};

// Accesorios comunes por tipo
const ACCESORIOS_POR_TIPO = {
  telefono: ['Cargador original', 'Cable USB', 'Funda/case', 'Auriculares', 'Protector pantalla', 'Manual usuario', 'Caja original', 'Adaptador'],
  laptop: ['Cargador original', 'Mouse', 'Mochila', 'Funda', 'Cable HDMI', 'Adaptador USB-C', 'Manual usuario'],
  pc: ['Teclado', 'Mouse', 'Monitor', 'Cable HDMI', 'Cable de poder', 'Manual usuario'],
  consola: ['Control original', 'Cable HDMI', 'Cable de poder', 'Juegos incluidos', 'Manual usuario'],
  tablet: ['Cargador original', 'Funda', 'Teclado', 'Stylus', 'Manual usuario'],
  smartwatch: ['Cargador/Base', 'Correa adicional', 'Manual usuario'],
  accesorio: ['Caja original', 'Manual usuario', 'Cable adicional'],
  otro: ['Cargador', 'Cable', 'Manual usuario', 'Caja original']
};

// Problemas comunes por tipo
const PROBLEMAS_POR_TIPO = {
  telefono: ['Pantalla quebrada', 'No enciende', 'Batería agotada', 'Problemas de carga', 'Audio defectuoso', 'Cámara dañada', 'Botones no funcionan', 'WiFi no conecta', 'Datos móviles', 'Sobrecalentamiento', 'Lento/congelado', 'Touchscreen no responde'],
  laptop: ['No enciende', 'Pantalla rota', 'Teclado defectuoso', 'Batería no carga', 'Sobrecalentamiento', 'Lento/congelado', 'Puertos USB no funcionan', 'Audio defectuoso', 'WiFi no conecta', 'Cargador defectuoso'],
  pc: ['No enciende', 'Pantalla negra', 'Sobrecalentamiento', 'Lento/congelado', 'Puertos no funcionan', 'Audio defectuoso', 'WiFi no conecta', 'Fuente de poder defectuosa'],
  consola: ['No enciende', 'No lee discos', 'Sobrecalentamiento', 'Control no conecta', 'Audio defectuoso', 'HDMI no funciona', 'Lento/congelado'],
  tablet: ['Pantalla quebrada', 'No enciende', 'Batería agotada', 'Problemas de carga', 'Touchscreen no responde', 'Audio defectuoso'],
  smartwatch: ['Pantalla quebrada', 'No enciende', 'Batería agotada', 'No sincroniza', 'Correa rota'],
  accesorio: ['No funciona', 'Cable roto', 'Sin sonido', 'No carga', 'Botones defectuosos'],
  otro: ['No funciona', 'No enciende', 'Daño físico', 'Falla eléctrica']
};

const PROBLEMAS_COMUNES_GENERALES = [
  'Pantalla quebrada', 'No enciende', 'Batería agotada', 'Problemas de carga',
  'Audio defectuoso', 'Cámara dañada', 'Botones no funcionan', 'WiFi no conecta',
  'Datos móviles', 'Sobrecalentamiento', 'Lento/congelado', 'Actualización fallida',
  'Touchscreen no responde', 'Altavoz sin sonido', 'Micrófono defectuoso'
];

export default function PasoDispositivo({ datos, onActualizar, errores, loading, soloLectura = false }) {
  const cargarTecnicos = useServiciosStore(state => state.cargarTecnicos);
  const tecnicos = useServiciosStore(state => state.tecnicos);

  const tecnicosActivos = useMemo(() => {
    return tecnicos.filter(tecnico =>
      tecnico.tecnicoConfig && tecnico.tecnicoConfig.activo === true
    );
  }, [tecnicos]);

  const [mostrarOtroAccesorio, setMostrarOtroAccesorio] = useState(false);
  const [mostrarOtroProblema, setMostrarOtroProblema] = useState(false);
  const [otroAccesorio, setOtroAccesorio] = useState('');
  const [otroProblema, setOtroProblema] = useState('');
  const [marcaInput, setMarcaInput] = useState('');
  const [modeloInput, setModeloInput] = useState('');
  const [mostrarSugerenciasMarca, setMostrarSugerenciasMarca] = useState(false);
  const [mostrarSugerenciasModelo, setMostrarSugerenciasModelo] = useState(false);
  const [mostrarModalLimpiar, setMostrarModalLimpiar] = useState(false);
  
  // Estados para sugerencias del backend
  const [sugerenciasBackendMarca, setSugerenciasBackendMarca] = useState([]);
  const [sugerenciasBackendModelo, setSugerenciasBackendModelo] = useState([]);
  const [sugerenciasBackendProblema, setSugerenciasBackendProblema] = useState([]);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const marcaInputRef = useRef(null);
  const modeloInputRef = useRef(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [streamActual, setStreamActual] = useState(null);

  // Obtener tipo actual (sin valor por defecto)
  const tipoDispositivoActual = datos.dispositivo.tipo || null;
  const dispositivoConfig = tipoDispositivoActual 
    ? (DISPOSITIVOS_INTELIGENTES[tipoDispositivoActual] || DISPOSITIVOS_INTELIGENTES.telefono)
    : null;

  // Cargar técnicos al montar
  useEffect(() => {
    cargarTecnicos();
  }, []);

  // Seleccionar técnico favorito automáticamente cuando se cargan los técnicos
  useEffect(() => {
    if (tecnicosActivos.length > 0 && !datos.diagnostico.tecnicoId) {
      const tecnicoFavorito = tecnicosActivos.find(t => t.tecnicoConfig?.favorito === true);
      if (tecnicoFavorito) {
        const nuevosDiagnostico = {
          ...datos.diagnostico,
          tecnico: tecnicoFavorito.nombre,
          tecnicoId: tecnicoFavorito.id
        };
        onActualizar('diagnostico', nuevosDiagnostico);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tecnicosActivos.length]);

  // Cargar sugerencias del backend cuando cambia el tipo de dispositivo
  useEffect(() => {
    const cargarSugerencias = async () => {
      if (!tipoDispositivoActual) return;

      try {
        // Cargar marcas
        const responseMarcas = await api.get('/servicios/sugerencias', {
          params: { tipo: 'marca', tipoDispositivo: tipoDispositivoActual }
        });
        if (responseMarcas.data.success) {
          setSugerenciasBackendMarca(responseMarcas.data.data || []);
        }

        // Cargar problemas
        const responseProblemas = await api.get('/servicios/sugerencias', {
          params: { tipo: 'problema', tipoDispositivo: tipoDispositivoActual }
        });
        if (responseProblemas.data.success) {
          setSugerenciasBackendProblema(responseProblemas.data.data || []);
        }
      } catch (error) {
        console.error('Error cargando sugerencias:', error);
      }
    };

    cargarSugerencias();
  }, [tipoDispositivoActual]);

  // Cargar modelos cuando cambia la marca
  useEffect(() => {
    const cargarModelos = async () => {
      if (!tipoDispositivoActual || !datos.dispositivo.marca) return;

      try {
        const response = await api.get('/servicios/sugerencias', {
          params: {
            tipo: 'modelo',
            tipoDispositivo: tipoDispositivoActual,
            marcaPadre: datos.dispositivo.marca
          }
        });
        if (response.data.success) {
          setSugerenciasBackendModelo(response.data.data || []);
        }
      } catch (error) {
        console.error('Error cargando modelos:', error);
      }
    };

    cargarModelos();
  }, [tipoDispositivoActual, datos.dispositivo.marca]);

  // Función para guardar sugerencia en el backend
  const guardarSugerenciaBackend = async (tipo, valor, marcaPadre = null) => {
    if (!valor || !valor.trim()) return;

    try {
      await api.post('/servicios/sugerencias', {
        tipo,
        tipoDispositivo: tipoDispositivoActual,
        valor: valor.trim(),
        marcaPadre
      });
    } catch (error) {
      // Silenciar errores, no es crítico si falla
      console.warn('No se pudo guardar sugerencia:', error);
    }
  };

  // Cleanup cámara
  useEffect(() => {
    return () => {
      if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
      }
    };
  }, [streamActual]);

  // Actualizar dispositivo
  const actualizarDispositivo = (campo, valor) => {
    const nuevosDispositivo = { ...datos.dispositivo, [campo]: valor };
    
    // Prellenado inteligente: cuando se selecciona marca, sugerir modelos
    if (campo === 'marca' && valor && dispositivoConfig && dispositivoConfig.modelos && dispositivoConfig.modelos[valor]) {
      setMarcaInput(valor);
      setMostrarSugerenciasMarca(false);
      // Auto-focus en modelo
      setTimeout(() => modeloInputRef.current?.focus(), 100);
      
      // Guardar marca nueva si no está en las predefinidas
      if (tipoDispositivoActual && !dispositivoConfig.marcas.includes(valor)) {
        guardarSugerenciaBackend('marca', valor);
      }
    }
    
    // Prellenado inteligente: cuando se selecciona modelo, sugerir colores comunes
    if (campo === 'modelo' && valor && !datos.dispositivo.color) {
      setModeloInput(valor);
      setMostrarSugerenciasModelo(false);
      
      // Guardar modelo nuevo si no está en los predefinidos
      if (tipoDispositivoActual && datos.dispositivo.marca) {
        const modelosPredefinidos = dispositivoConfig?.modelos?.[datos.dispositivo.marca] || [];
        if (!modelosPredefinidos.includes(valor)) {
          guardarSugerenciaBackend('modelo', valor, datos.dispositivo.marca);
        }
      }
    }
    
    onActualizar('dispositivo', nuevosDispositivo);
  };

  // Actualizar diagnóstico
  const actualizarDiagnostico = (campo, valor) => {
    const nuevosDiagnostico = { ...datos.diagnostico, [campo]: valor };
    onActualizar('diagnostico', nuevosDiagnostico);
  };

  // Cambiar tipo de dispositivo
  const cambiarTipoDispositivo = (tipo) => {
    const nuevoTipo = tipo;
    
    // Solo actualizar el tipo, sin forzar otros campos
    // El usuario puede mantener sus datos si los tiene
    actualizarDispositivo('tipo', nuevoTipo);
    
    // Si no hay fecha estimada, establecerla a mañana
    if (!datos.diagnostico.fechaEstimada) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const fechaManana = manana.toISOString().split('T')[0];
      actualizarDiagnostico('fechaEstimada', fechaManana);
    }
    
    toast.success(`Tipo cambiado a ${TIPOS_DISPOSITIVOS.find(t => t.id === nuevoTipo)?.label}`);
  };

  // Función para mostrar el modal de confirmación
  const solicitarLimpiarTodo = () => {
    if (soloLectura) return;
    setMostrarModalLimpiar(true);
  };

  // Función para limpiar todo el formulario
  const limpiarTodo = () => {
    // Calcular fecha de mañana por defecto (+1 día)
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];
    
    // Limpiar dispositivo completamente (incluyendo tipo)
    const dispositivoLimpio = {
      tipo: null,
      marca: '',
      modelo: '',
      color: '',
      imei: '',
      accesorios: [],
      problema: '',
      problemas: [],
      evidencias: []
    };
    onActualizar('dispositivo', dispositivoLimpio);
    
    // Limpiar diagnóstico completamente (con fecha estimada = mañana)
    const diagnosticoLimpio = {
      tecnico: '',
      tecnicoId: null,
      observaciones: '',
      fechaEstimada: fechaManana,
      estado: 'En Diagnóstico'
    };
    onActualizar('diagnostico', diagnosticoLimpio);
    
    // Limpiar estados locales
    setOtroAccesorio('');
    setOtroProblema('');
    setMostrarOtroAccesorio(false);
    setMostrarOtroProblema(false);
    setMarcaInput('');
    setModeloInput('');
    setMostrarSugerenciasMarca(false);
    setMostrarSugerenciasModelo(false);
    
    // Detener cámara si está activa
    if (camaraActiva) {
      detenerCamara();
    }
    
    // Cerrar modal
    setMostrarModalLimpiar(false);
    
    toast.success('Formulario limpiado exitosamente');
  };

  // Obtener sugerencias de marca (combinando predefinidas y del backend)
  const sugerenciasMarca = useMemo(() => {
    const marcasPredefinidas = dispositivoConfig?.marcas || [];
    const todasLasMarcas = [...new Set([...marcasPredefinidas, ...sugerenciasBackendMarca])];
    
    if (!marcaInput.trim()) return todasLasMarcas.slice(0, 6);
    return todasLasMarcas.filter(m => 
      m.toLowerCase().includes(marcaInput.toLowerCase())
    ).slice(0, 6);
  }, [marcaInput, dispositivoConfig, sugerenciasBackendMarca]);

  // Obtener sugerencias de modelo (combinando predefinidas y del backend)
  const sugerenciasModelo = useMemo(() => {
    const marca = datos.dispositivo.marca;
    if (!marca) return [];
    
    const modelosPredefinidos = dispositivoConfig?.modelos?.[marca] || [];
    const todosLosModelos = [...new Set([...modelosPredefinidos, ...sugerenciasBackendModelo])];
    
    if (!modeloInput.trim()) {
      return todosLosModelos.slice(0, 6);
    }
    return todosLosModelos.filter(m => 
      m.toLowerCase().includes(modeloInput.toLowerCase())
    ).slice(0, 6);
  }, [modeloInput, datos.dispositivo.marca, dispositivoConfig, sugerenciasBackendModelo]);

  // Manejar pills de accesorios
  const toggleAccesorio = (accesorio) => {
    const accesorios = datos.dispositivo.accesorios || [];
    const nuevosAccesorios = accesorios.includes(accesorio)
      ? accesorios.filter(a => a !== accesorio)
      : [...accesorios, accesorio];
    actualizarDispositivo('accesorios', nuevosAccesorios);
  };

  const agregarOtroAccesorio = () => {
    if (otroAccesorio.trim()) {
      const accesorios = datos.dispositivo.accesorios || [];
      actualizarDispositivo('accesorios', [...accesorios, otroAccesorio.trim()]);
      setOtroAccesorio('');
      setMostrarOtroAccesorio(false);
      toast.success('Accesorio agregado');
    }
  };

  // Manejar problemas múltiples
  const toggleProblema = (problema) => {
    const problemasActuales = Array.isArray(datos.dispositivo.problemas)
      ? datos.dispositivo.problemas
      : datos.dispositivo.problema
        ? [datos.dispositivo.problema]
        : [];

    const nuevosProblemas = problemasActuales.includes(problema)
      ? problemasActuales.filter(p => p !== problema)
      : [...problemasActuales, problema];

    const nuevosDispositivo = {
      ...datos.dispositivo,
      problemas: nuevosProblemas,
      problema: nuevosProblemas.join(', ')
    };
    onActualizar('dispositivo', nuevosDispositivo);
  };

  const agregarOtroProblema = () => {
    if (otroProblema.trim()) {
      const problemasActuales = Array.isArray(datos.dispositivo.problemas)
        ? datos.dispositivo.problemas
        : datos.dispositivo.problema
          ? [datos.dispositivo.problema]
          : [];

      const problemaNuevo = otroProblema.trim();
      const nuevosProblemas = [...problemasActuales, problemaNuevo];
      const nuevosDispositivo = {
        ...datos.dispositivo,
        problemas: nuevosProblemas,
        problema: nuevosProblemas.join(', ')
      };
      onActualizar('dispositivo', nuevosDispositivo);

      // Guardar problema nuevo si no está en los predefinidos
      if (tipoDispositivoActual) {
        const problemasPredefinidos = PROBLEMAS_POR_TIPO[tipoDispositivoActual] || [];
        if (!problemasPredefinidos.includes(problemaNuevo)) {
          guardarSugerenciaBackend('problema', problemaNuevo);
        }
      }

      setOtroProblema('');
      setMostrarOtroProblema(false);
      toast.success('Problema agregado');
    }
  };

  const eliminarProblema = (problemaAEliminar) => {
    const problemasActuales = Array.isArray(datos.dispositivo.problemas)
      ? datos.dispositivo.problemas
      : [];

    const nuevosProblemas = problemasActuales.filter(p => p !== problemaAEliminar);
    const nuevosDispositivo = {
      ...datos.dispositivo,
      problemas: nuevosProblemas,
      problema: nuevosProblemas.join(', ')
    };
    onActualizar('dispositivo', nuevosDispositivo);
    toast.success('Problema eliminado');
  };

  // Cámara y evidencias (mantener funciones existentes)
  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActual(stream);
        setCamaraActiva(true);
        toast.success('Cámara activada');
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      toast.error('No se pudo acceder a la cámara');
    }
  };

  const detenerCamara = () => {
    if (streamActual) {
      streamActual.getTracks().forEach(track => track.stop());
      setStreamActual(null);
    }
    setCamaraActiva(false);
  };

  const tomarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      const nuevaEvidencia = {
        id: Date.now() + Math.random(),
        file: dataURL,
        name: `captura_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: dataURL.length
      };

      const evidencias = datos.dispositivo.evidencias || [];
      actualizarDispositivo('evidencias', [...evidencias, nuevaEvidencia]);
      toast.success('Foto capturada');
      detenerCamara();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes');
        continue;
      }

      try {
        const compressedDataURL = await compressImage(file);
        const nuevaEvidencia = {
          id: Date.now() + Math.random(),
          file: compressedDataURL,
          name: file.name,
          type: file.type,
          size: file.size
        };

        const evidencias = datos.dispositivo.evidencias || [];
        actualizarDispositivo('evidencias', [...evidencias, nuevaEvidencia]);
        toast.success('Imagen agregada');
      } catch (error) {
        toast.error('Error procesando imagen');
      }
    }

    e.target.value = '';
  };

  const eliminarEvidencia = (id) => {
    const evidencias = (datos.dispositivo.evidencias || []).filter(e => e.id !== id);
    actualizarDispositivo('evidencias', evidencias);
    toast.success('Imagen eliminada');
  };

  const compressImage = (file, maxWidth = 1280, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/jpeg', quality);
        resolve(dataURL);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Obtener problemas actuales
  const problemasActuales = Array.isArray(datos.dispositivo.problemas) 
    ? datos.dispositivo.problemas 
    : datos.dispositivo.problema 
      ? [datos.dispositivo.problema] 
      : [];

  // Obtener accesorios y problemas según tipo
  const accesoriosDisponibles = tipoDispositivoActual 
    ? (ACCESORIOS_POR_TIPO[tipoDispositivoActual] || ACCESORIOS_POR_TIPO.otro)
    : [];
  // Combinar problemas predefinidos con los del backend
  const problemasDisponibles = useMemo(() => {
    const problemasPredefinidos = tipoDispositivoActual
      ? (PROBLEMAS_POR_TIPO[tipoDispositivoActual] || PROBLEMAS_COMUNES_GENERALES)
      : PROBLEMAS_COMUNES_GENERALES;
    return [...new Set([...problemasPredefinidos, ...sugerenciasBackendProblema])];
  }, [tipoDispositivoActual, sugerenciasBackendProblema]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* PASO 1: TIPO DE DISPOSITIVO - GRID MODERNO */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-4 border border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <Smartphone className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">¿Qué tipo de dispositivo es?</h3>
              <p className="text-xs text-gray-400">Selecciona el tipo para prellenar opciones inteligentes</p>
            </div>
          </div>
          {!soloLectura && (
            <button
              type="button"
              onClick={solicitarLimpiarTodo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-medium transition-all border border-red-600/30 hover:border-red-600/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar Todo
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIPOS_DISPOSITIVOS.map(tipo => {
            const Icono = tipo.icon;
            const estaSeleccionado = tipoDispositivoActual === tipo.id;
            const colorClasses = COLOR_CLASSES[tipo.color];
            
            return (
              <button
                key={tipo.id}
                type="button"
                onClick={() => !soloLectura && cambiarTipoDispositivo(tipo.id)}
                disabled={soloLectura}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-200
                  ${estaSeleccionado
                    ? `bg-gradient-to-br ${colorClasses.bg} ${colorClasses.border} shadow-md scale-105`
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800/70'
                  }
                  ${soloLectura ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-102'}
                `}
              >
                {estaSeleccionado && (
                  <div className="absolute top-1.5 right-1.5">
                    <CheckCircle className={`h-4 w-4 ${colorClasses.text}`} />
                  </div>
                )}
                <Icono className={`h-6 w-6 mx-auto mb-1 ${estaSeleccionado ? colorClasses.text : 'text-gray-400'}`} />
                <div className={`text-xs font-semibold ${estaSeleccionado ? 'text-gray-100' : 'text-gray-300'}`}>
                  {tipo.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* LAYOUT DE 2 COLUMNAS - CON ANIMACIÓN DE DESPLIEGUE */}
      {tipoDispositivoActual && (
        <div 
          className="grid grid-cols-1 xl:grid-cols-2 gap-4"
          style={{ 
            animation: 'fadeInSlideDown 0.5s ease-out',
            animationFillMode: 'both'
          }}
        >
          {/* COLUMNA IZQUIERDA - INFORMACIÓN DEL DISPOSITIVO */}
          <div className="space-y-3">
          
          {/* IDENTIFICACIÓN DEL EQUIPO - MEJORADO */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-4 border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-blue-500/20 rounded-lg">
                <Smartphone className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-100">Identificación del Equipo</h3>
            </div>

            <div className="space-y-3">
              {/* Marca con autocompletado inteligente */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Marca <span className="text-red-400">*</span>
                </label>
                
                {/* Pills rápidas de marcas populares */}
                {dispositivoConfig && dispositivoConfig.marcas && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {dispositivoConfig.marcas.slice(0, 6).map(marca => (
                      <button
                        key={marca}
                        type="button"
                        onClick={() => !soloLectura && actualizarDispositivo('marca', marca)}
                        disabled={soloLectura}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${datos.dispositivo.marca === marca
                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                          }
                          ${soloLectura ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {datos.dispositivo.marca === marca && '✓ '}
                        {marca}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input con autocompletado */}
                <div className="relative">
                  <input
                    ref={marcaInputRef}
                    type="text"
                    value={datos.dispositivo.marca}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setMarcaInput(valor);
                      actualizarDispositivo('marca', valor);
                      setMostrarSugerenciasMarca(valor.length > 0);
                    }}
                    onFocus={() => setMostrarSugerenciasMarca(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerenciasMarca(false), 200)}
                    placeholder="Escribe o selecciona una marca..."
                    disabled={soloLectura}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-500"
                  />
                  
                  {/* Dropdown de sugerencias */}
                  {mostrarSugerenciasMarca && sugerenciasMarca.length > 0 && !soloLectura && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {sugerenciasMarca.map(marca => (
                        <button
                          key={marca}
                          type="button"
                          onClick={() => {
                            actualizarDispositivo('marca', marca);
                            setMostrarSugerenciasMarca(false);
                            modeloInputRef.current?.focus();
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          {marca}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errores.marca && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errores.marca}
                </p>}
              </div>

              {/* Modelo con autocompletado inteligente */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Modelo específico <span className="text-red-400">*</span>
                </label>
                
                {/* Pills rápidas de modelos si hay marca seleccionada */}
                {datos.dispositivo.marca && dispositivoConfig && dispositivoConfig.modelos && dispositivoConfig.modelos[datos.dispositivo.marca] && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {dispositivoConfig.modelos[datos.dispositivo.marca].slice(0, 4).map(modelo => (
                      <button
                        key={modelo}
                        type="button"
                        onClick={() => !soloLectura && actualizarDispositivo('modelo', modelo)}
                        disabled={soloLectura}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${datos.dispositivo.modelo === modelo
                            ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                          }
                          ${soloLectura ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {datos.dispositivo.modelo === modelo && '✓ '}
                        {modelo}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    ref={modeloInputRef}
                    type="text"
                    value={datos.dispositivo.modelo}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setModeloInput(valor);
                      actualizarDispositivo('modelo', valor);
                      setMostrarSugerenciasModelo(valor.length > 0 && datos.dispositivo.marca);
                    }}
                    onFocus={() => datos.dispositivo.marca && setMostrarSugerenciasModelo(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerenciasModelo(false), 200)}
                    placeholder="Ej: iPhone 16 Pro Max, Galaxy S24..."
                    disabled={soloLectura || !datos.dispositivo.marca}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  
                  {/* Dropdown de sugerencias de modelo */}
                  {mostrarSugerenciasModelo && sugerenciasModelo.length > 0 && !soloLectura && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {sugerenciasModelo.map(modelo => (
                        <button
                          key={modelo}
                          type="button"
                          onClick={() => {
                            actualizarDispositivo('modelo', modelo);
                            setMostrarSugerenciasModelo(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          {modelo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errores.modelo && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errores.modelo}
                </p>}
              </div>

              {/* Color y Serial en fila */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Color con pills */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Color/Características
                  </label>
                  
                  {/* Pills de colores comunes */}
                  {dispositivoConfig && dispositivoConfig.colores && dispositivoConfig.colores.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {dispositivoConfig.colores.slice(0, 6).map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => !soloLectura && actualizarDispositivo('color', color)}
                          disabled={soloLectura}
                          className={`
                            px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                            ${datos.dispositivo.color === color
                              ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                            }
                            ${soloLectura ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          {datos.dispositivo.color === color && '✓ '}
                          {color}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <input
                    type="text"
                    value={datos.dispositivo.color || ''}
                    onChange={(e) => actualizarDispositivo('color', e.target.value)}
                    placeholder="Ej: Negro, 256GB, 8GB RAM..."
                    disabled={soloLectura}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-500"
                  />
                </div>

                {/* IMEI/Serial */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    IMEI / Número de Serie <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={datos.dispositivo.imei || ''}
                    onChange={(e) => actualizarDispositivo('imei', e.target.value)}
                    placeholder="Marca *#06# para ver IMEI..."
                    disabled={soloLectura}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-500"
                  />
                  {errores.imei && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errores.imei}
                  </p>}
                </div>
              </div>
            </div>
          </div>

          {/* ACCESORIOS INCLUIDOS - MEJORADO */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-4 border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-100">Accesorios Incluidos</h3>
              <span className="text-xs text-gray-400">(Opcional)</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {accesoriosDisponibles.map(accesorio => (
                <button
                  key={accesorio}
                  type="button"
                  onClick={() => !soloLectura && toggleAccesorio(accesorio)}
                  disabled={soloLectura}
                  className={`
                    px-3 py-2 rounded-lg text-xs font-medium transition-all
                    ${(datos.dispositivo.accesorios || []).includes(accesorio)
                      ? 'bg-green-600 text-white shadow-md ring-2 ring-green-400'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                    }
                    ${soloLectura ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {(datos.dispositivo.accesorios || []).includes(accesorio) && '✓ '}
                  {accesorio}
                </button>
              ))}
              
              {!soloLectura && (
                <button
                  type="button"
                  onClick={() => setMostrarOtroAccesorio(true)}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-all"
                >
                  + Otro
                </button>
              )}
            </div>

            {mostrarOtroAccesorio && !soloLectura && (
              <div className="flex gap-2 mb-3 p-3 bg-gray-700/30 rounded-lg">
                <input
                  type="text"
                  value={otroAccesorio}
                  onChange={(e) => setOtroAccesorio(e.target.value)}
                  placeholder="Escribe otro accesorio..."
                  onKeyPress={(e) => e.key === 'Enter' && agregarOtroAccesorio()}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={agregarOtroAccesorio}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarOtroAccesorio(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {(datos.dispositivo.accesorios || []).length > 0 && (
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                {datos.dispositivo.accesorios.length} accesorio(s) seleccionado(s)
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA DERECHA - PROBLEMA Y TÉCNICO */}
        <div className="space-y-3">
          
          {/* PROBLEMA REPORTADO - MEJORADO */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-4 border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-red-500/20 rounded-lg">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-100">Problema Reportado</h3>
              <span className="text-red-400 text-xs">*</span>
            </div>

            <div className="space-y-3">
              {/* Pills de problemas según tipo */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Selecciona uno o más problemas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {problemasDisponibles.map(problema => (
                    <button
                      key={problema}
                      type="button"
                      onClick={() => !soloLectura && toggleProblema(problema)}
                      disabled={soloLectura}
                      className={`
                        px-3 py-2 rounded-lg text-xs font-medium transition-all
                        ${problemasActuales.includes(problema)
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                        }
                        ${soloLectura ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {problemasActuales.includes(problema) && '✓ '}
                      {problema}
                    </button>
                  ))}
                  
                  {!soloLectura && (
                    <button
                      type="button"
                      onClick={() => setMostrarOtroProblema(true)}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 transition-all"
                    >
                      + Otro
                    </button>
                  )}
                </div>
              </div>

              {/* Problemas seleccionados */}
              {problemasActuales.length > 0 && (
                <div className="bg-red-900/20 border-2 border-red-700/50 rounded-lg p-3">
                  <div className="text-red-300 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Problemas seleccionados ({problemasActuales.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {problemasActuales.map((problema, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700/50 text-red-100 rounded-lg text-xs font-medium"
                      >
                        {problema}
                        {!soloLectura && (
                          <button
                            type="button"
                            onClick={() => eliminarProblema(problema)}
                            className="text-red-300 hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Input para otro problema */}
              {mostrarOtroProblema && !soloLectura && (
                <div className="space-y-2 p-3 bg-gray-700/30 rounded-lg">
                  <textarea
                    value={otroProblema}
                    onChange={(e) => setOtroProblema(e.target.value)}
                    placeholder="Describe el problema específico..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={agregarOtroProblema}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Agregar Problema
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarOtroProblema(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {errores.problema && <p className="text-red-400 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errores.problema}
              </p>}

              {/* Observaciones adicionales */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Observaciones adicionales
                </label>
                <textarea
                  value={datos.diagnostico.observaciones || ''}
                  onChange={(e) => actualizarDiagnostico('observaciones', e.target.value)}
                  placeholder="Detalles adicionales del problema, síntomas, historial..."
                  rows={2}
                  disabled={soloLectura}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* TÉCNICO Y FECHA ESTIMADA - COMPARTEN ESPACIO */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-4 border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-yellow-500/20 rounded-lg">
                <User className="h-3.5 w-3.5 text-yellow-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-100">Técnico y Fecha Estimada</h3>
              <span className="text-red-400 text-xs">*</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Técnico - Desplegable */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  Técnico Asignado <span className="text-red-400">*</span>
                  {(() => {
                    const tecnicoSeleccionado = tecnicosActivos.find(t => t.id === datos.diagnostico.tecnicoId);
                    if (tecnicoSeleccionado?.tecnicoConfig?.favorito) {
                      return <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" title="Técnico favorito" />;
                    }
                    return null;
                  })()}
                </label>
                {tecnicosActivos && tecnicosActivos.length > 0 ? (
                  <select
                    value={datos.diagnostico.tecnicoId || ''}
                    onChange={(e) => {
                      const tecnicoId = e.target.value ? parseInt(e.target.value) : null;
                      const tecnicoSeleccionado = tecnicosActivos.find(t => t.id === tecnicoId);
                      const nuevosDiagnostico = {
                        ...datos.diagnostico,
                        tecnico: tecnicoSeleccionado ? tecnicoSeleccionado.nombre : '',
                        tecnicoId: tecnicoId
                      };
                      onActualizar('diagnostico', nuevosDiagnostico);
                    }}
                    disabled={soloLectura}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecciona un técnico...</option>
                    {tecnicosActivos.map(tecnico => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nombre}
                        {tecnico.tecnicoConfig?.especialidad && ` - ${tecnico.tecnicoConfig.especialidad}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs">
                      No hay técnicos activos configurados.
                      <br />
                      <span className="text-gray-500 text-[10px]">Configúralos en Configuración → Servicios Técnicos</span>
                    </p>
                  </div>
                )}
                {errores.tecnico && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errores.tecnico}
                </p>}
              </div>

              {/* Fecha Estimada */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Fecha Estimada de Entrega <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={datos.diagnostico.fechaEstimada || ''}
                  onChange={(e) => actualizarDiagnostico('fechaEstimada', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={soloLectura}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {errores.fechaEstimada && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errores.fechaEstimada}
                </p>}
              </div>
            </div>
          </div>

          {/* EVIDENCIA VISUAL - MEJORADO */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-4 border border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-purple-500/20 rounded-lg">
                <Camera className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-100">Evidencia Visual</h3>
              <span className="text-xs text-gray-400">(Opcional)</span>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={camaraActiva ? tomarFoto : iniciarCamara}
                  disabled={soloLectura}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-600 hover:border-purple-500 rounded-xl text-purple-400 hover:text-purple-300 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CameraIcon className="h-4 w-4" />
                  <span>{camaraActiva ? 'Tomar Foto' : 'Usar Cámara'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={soloLectura}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-xl text-gray-400 hover:text-purple-400 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Subir Archivo</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={soloLectura}
              />

              {camaraActiva && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover rounded-xl border-2 border-purple-600"
                  />
                  <button
                    type="button"
                    onClick={detenerCamara}
                    className="absolute top-3 right-3 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {(datos.dispositivo.evidencias || []).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {datos.dispositivo.evidencias.map(evidencia => (
                    <div key={evidencia.id} className="relative group">
                      <img
                        src={evidencia.file}
                        alt={evidencia.name}
                        className="w-full h-32 object-cover rounded-xl border-2 border-gray-600 group-hover:border-purple-500 transition-all"
                      />
                      {!soloLectura && (
                        <button
                          type="button"
                          onClick={() => eliminarEvidencia(evidencia.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/70 px-2 py-1 rounded-lg">
                        {evidencia.name.length > 15 ? evidencia.name.substring(0, 15) + '...' : evidencia.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ESTILOS PARA ANIMACIÓN */}
      <style jsx="true">{`
        @keyframes fadeInSlideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* MODAL DE CONFIRMACIÓN PARA LIMPIAR TODO */}
      {mostrarModalLimpiar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-100 mb-2">
                  ¿Limpiar todo el formulario?
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Esta acción eliminará todos los datos ingresados del dispositivo, incluyendo:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-300 list-disc list-inside">
                  <li>Tipo, marca, modelo y color</li>
                  <li>IMEI/Serial</li>
                  <li>Accesorios seleccionados</li>
                  <li>Problemas reportados</li>
                  <li>Técnico asignado y fecha estimada</li>
                  <li>Evidencias visuales</li>
                  <li>Observaciones</li>
                </ul>
                <p className="mt-4 text-xs text-red-400 font-medium">
                  ⚠️ Esta acción no se puede deshacer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalLimpiar(false)}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarModalLimpiar(false)}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={limpiarTodo}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
