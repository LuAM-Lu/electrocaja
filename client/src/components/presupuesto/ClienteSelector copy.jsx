// components/ClienteSelector.jsx - VERSIÓN MEJORADA MODULAR 
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, UserPlus, X, User, Building, Phone, 
  Mail, MapPin, AlertCircle, CheckCircle 
} from 'lucide-react';
import toast from '../../utils/toast.jsx';
import { api } from "../../config/api";

//  DATOS SIMULADOS (mover a store después)
// Estado de clientes cargados desde backend
let CLIENTES_CACHE = [];

//  FUNCIONES DE VALIDACIÓN
const validarCedulaRif = (valor) => {
  const valorLimpio = valor.replace(/\s/g, '').toUpperCase();
  const patronPersona = /^[VE]\d{7,8}$/;
  const patronEmpresa = /^[JG]\d{8,9}$/;
  return patronPersona.test(valorLimpio) || patronEmpresa.test(valorLimpio);
};

const validarTelefono = (valor) => {
  const valorLimpio = valor.replace(/[\s\-\(\)]/g, '');
  const patronMovil = /^(0414|0424|0412|0416|0426)\d{7}$/;
  const patronFijo = /^(021|024|025|026|027|028|029)\d{7}$/;
  return patronMovil.test(valorLimpio) || patronFijo.test(valorLimpio);
};

const validarEmail = (valor) => {
  if (!valor) return true; // Email es opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(valor);
};

const detectarTipoCliente = (cedulaRif) => {
  if (!cedulaRif) return 'persona';
  const letra = cedulaRif.charAt(0).toUpperCase();
  return ['V', 'E'].includes(letra) ? 'persona' : 'empresa';
};

//  FUNCIÓN PARA CARGAR CLIENTES DESDE BACKEND
const cargarClientesDesdeBackend = async () => {
  try {
    const response = await api.get('/clientes');
    console.log(' DEBUG - Respuesta clientes:', response);
    console.log(' DEBUG - response.data:', response.data);
    CLIENTES_CACHE = response.data?.data?.clientes || response.data?.clientes || [];
    console.log(' DEBUG - CLIENTES_CACHE:', CLIENTES_CACHE);
    return CLIENTES_CACHE;
  } catch (error) {
    console.error('Error cargando clientes:', error);
    toast.error('Error al cargar clientes');
    return [];
  }
};

//  MODAL REGISTRO CLIENTE
const ModalRegistroCliente = ({ isOpen, onClose, onClienteCreado, cedulaInicial = '' }) => {
  const [formData, setFormData] = useState({
    tipo: '',
    cedula: '',
    nombre: '',
    telefono: '',
    email: '',
    direccion: ''
  });

    console.log(' DEBUG Banner:', {
    cedulaInicial,
    esSoloNumeros: /^\d+$/.test(cedulaInicial),
    formDataCedula: formData.cedula,
    deberiaAparecerBanner: cedulaInicial && /^\d+$/.test(cedulaInicial) && !formData.cedula
  });

  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({});
  const nombreInputRef = useRef(null);

  // Pre-llenar y auto-detectar tipo
  useEffect(() => {
    if (isOpen && cedulaInicial.trim()) {
      const cedulaFormateada = cedulaInicial.trim().toUpperCase();
      const tipoDetectado = detectarTipoCliente(cedulaFormateada);
      
      setFormData(prev => ({ 
        ...prev, 
        cedula: cedulaFormateada,
        
      }));
      
      // Auto-focus al nombre si ya hay cédula
      setTimeout(() => {
        if (nombreInputRef.current) {
          nombreInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, cedulaInicial]);

  const validarFormulario = () => {
    const erroresTemp = {};

    // Validar cédula/RIF
    if (!formData.cedula.trim()) {
      erroresTemp.cedula = 'La cédula/RIF es obligatoria';
    } else if (!validarCedulaRif(formData.cedula)) {
      erroresTemp.cedula = 'Formato de cédula/RIF inválido';
    } else {
      // Verificar duplicados
      const existe = CLIENTES_CACHE.find(c => 
        c.cedula_rif.toLowerCase() === formData.cedula.toLowerCase()
      );
      if (existe) {
        erroresTemp.cedula = 'Ya existe un cliente con esta cédula/RIF';
      }
    }

    // Validar nombre
    if (!formData.nombre.trim()) {
      erroresTemp.nombre = 'El nombre es obligatorio';
    }

    // Validar teléfono (opcional pero si existe debe ser válido)
    if (formData.telefono.trim() && !validarTelefono(formData.telefono)) {
      erroresTemp.telefono = 'Formato de teléfono inválido para WhatsApp (debe ser móvil venezolano)';
    }

    // Validar email (opcional pero si existe debe ser válido)
    if (formData.email.trim() && !validarEmail(formData.email)) {
      erroresTemp.email = 'Formato de email inválido';
    }

    setErrores(erroresTemp);
    return Object.keys(erroresTemp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      // Crear cliente en backend
      const response = await api.post('/clientes', {
        cedula_rif: formData.cedula.toUpperCase(),
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim().toLowerCase() || null,
        direccion: formData.direccion.trim() || null,
        tipo: formData.tipo
      });

      const nuevoCliente = response.data?.data?.cliente || response.data?.cliente;

      // Agregar al cache local
      CLIENTES_CACHE.push(nuevoCliente);
      
      // Callback al padre
      onClienteCreado(nuevoCliente);
      
      // Limpiar y cerrar
      setFormData({
        tipo: '',
        cedula: '',
        nombre: '',
        telefono: '',
        email: '',
        direccion: ''
      });
      setErrores({});
      
      toast.success(`Cliente ${formData.tipo === 'empresa' ? 'empresa' : 'persona'} creado exitosamente`);
      onClose();
      
    } catch (error) {
      toast.error('Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tipo: '',
      cedula: '',
      nombre: '',
      telefono: '',
      email: '',
      direccion: ''
    });
    setErrores({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <h3 className="text-lg font-bold">Nuevo Cliente</h3>
            <button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

{/*  Banner moderno - Opción 1: Cards en grid */}
        {cedulaInicial && /^\d+$/.test(cedulaInicial) && /^\d+$/.test(formData.cedula) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 mx-6 mt-4 rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm"></span>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">Detectamos solo números</h4>
                <p className="text-xs text-blue-600">¿Qué tipo de documento es <span className="font-mono font-bold">{cedulaInicial.padStart(8, '0')}</span>?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {/* Persona Natural */}
              <button
                type="button"
                onClick={() => {
                  const cedulaCompleta = `V${cedulaInicial.padStart(8, '0')}`;
                  setFormData(prev => ({ ...prev, cedula: cedulaCompleta, tipo: 'persona' }));
                  toast.success('Persona Natural aplicada');
                }}
                className="group relative overflow-hidden bg-white hover:bg-green-50 border border-green-200 hover:border-green-300 rounded-lg p-3 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <div className="text-center">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1 font-bold text-sm">V</div>
                  <div className="text-xs font-medium text-green-700">Persona</div>
                  <div className="text-xs text-green-600">Natural</div>
                </div>
              </button>

              {/* Extranjero */}
              <button
                type="button"
                onClick={() => {
                  const cedulaCompleta = `E${cedulaInicial.padStart(8, '0')}`;
                  setFormData(prev => ({ ...prev, cedula: cedulaCompleta, tipo: 'persona' }));
                  toast.success('Extranjero aplicado');
                }}
                className="group relative overflow-hidden bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg p-3 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <div className="text-center">
                  <div className="text-lg mb-1"></div>
                  <div className="text-xs font-medium text-blue-700">Extranjero</div>
                  <div className="text-xs text-blue-600">Natural</div>
                </div>
              </button>

              {/* Firma Personal */}
              <button
                type="button"
                onClick={() => {
                  const cedulaCompleta = `V${cedulaInicial.padStart(8, '0')}`;
                  setFormData(prev => ({ ...prev, cedula: cedulaCompleta, tipo: 'empresa' }));
                  toast.success('Firma Personal aplicada');
                }}
                className="group relative overflow-hidden bg-white hover:bg-purple-50 border border-purple-200 hover:border-purple-300 rounded-lg p-3 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <div className="text-center">
                  <div className="text-lg mb-1"></div>
                  <div className="text-xs font-medium text-purple-700">Firma</div>
                  <div className="text-xs text-purple-600">Personal</div>
                </div>
              </button>

              {/* Empresa */}
              <button
                type="button"
                onClick={() => {
                  const cedulaCompleta = `J${cedulaInicial.padStart(8, '0')}`;
                  setFormData(prev => ({ ...prev, cedula: cedulaCompleta, tipo: 'empresa' }));
                  toast.success('Empresa aplicada');
                }}
                className="group relative overflow-hidden bg-white hover:bg-orange-50 border border-orange-200 hover:border-orange-300 rounded-lg p-3 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <div className="text-center">
                  <div className="text-lg mb-1"></div>
                  <div className="text-xs font-medium text-orange-700">Empresa</div>
                  <div className="text-xs text-orange-600">Jurídica</div>
                </div>
              </button>

              {/* Gobierno */}
              <button
                type="button"
                onClick={() => {
                  const cedulaCompleta = `G${cedulaInicial.padStart(8, '0')}`;
                  setFormData(prev => ({ ...prev, cedula: cedulaCompleta, tipo: 'empresa' }));
                  toast.success('Gobierno aplicado');
                }}
                className="group relative overflow-hidden bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg p-3 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <div className="text-center">
                  <div className="text-lg mb-1"></div>
                  <div className="text-xs font-medium text-gray-700">Gobierno</div>
                  <div className="text-xs text-gray-600">Público</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Tipo de cliente */}
          <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Cliente *
        </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo: 'persona' }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.tipo === 'persona'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : formData.tipo === '' 
                    ? 'border-gray-300 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50' //  NUEVO: Estado neutro
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <User className="h-4 w-4 mx-auto mb-1" />
                Persona Natural
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo: 'empresa' }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.tipo === 'empresa'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : formData.tipo === '' 
                    ? 'border-gray-300 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50' //  NUEVO: Estado neutro
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Building className="h-4 w-4 mx-auto mb-1" />
                Empresa
              </button>
            </div>
            {/*  NUEVO: Indicador cuando no hay tipo seleccionado */}
{formData.tipo === '' && (
  <div className="mt-2 text-center">
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
       Selecciona un tipo de cliente
    </span>
  </div>
)}
          </div>

          

          {/* Cédula/RIF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.tipo === 'persona' ? 'Cédula *' : 'RIF *'}
            </label>
            <input
              type="text"
              value={formData.cedula}
              onChange={(e) => {
                const valor = e.target.value;
                let valorProcesado = '';
                
                if (valor.length === 0) {
                  setFormData(prev => ({ ...prev, cedula: '' }));
                  return;
                }
                
                // Primera letra: Solo V, E, J, G (automáticamente mayúscula)
                const primeraLetra = valor.charAt(0).toUpperCase();
                if (['V', 'E', 'J', 'G'].includes(primeraLetra)) {
                  valorProcesado = primeraLetra;
                  
                  // Resto: Solo números
                  const restoNumeros = valor.slice(1).replace(/[^0-9]/g, '');
                  valorProcesado += restoNumeros;
                  
                  // Limitar longitud
                  if (['V', 'E'].includes(primeraLetra)) {
                    valorProcesado = valorProcesado.substring(0, 9); // V + 8 dígitos máximo
                  } else {
                    valorProcesado = valorProcesado.substring(0, 10); // J/G + 9 dígitos máximo
                  }
                  
                  setFormData(prev => ({ ...prev, cedula: valorProcesado }));
                  
                  // Auto-detectar tipo SOLO si no hay tipo seleccionado
                  if (formData.tipo === '') {
                    const tipoDetectado = detectarTipoCliente(valorProcesado);
                    setFormData(prev => ({ ...prev, tipo: tipoDetectado }));
                  }
                  
                } else if (/^\d/.test(valor.charAt(0))) {
                  // Si empieza con número, mostrar error
                  toast.error('Debe comenzar con una letra: V, E, J o G', { duration: 2000 });
                } else if (/^[a-zA-Z]/.test(valor.charAt(0))) {
                  // Si es otra letra, mostrar error
                  toast.error('Solo se permiten las letras V, E, J o G', { duration: 2000 });
                }
              }}
              placeholder={formData.tipo === 'persona' ? 'V12345678' : 'J123456789'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errores.cedula ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errores.cedula && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errores.cedula}
              </p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.tipo === 'persona' ? 'Nombre Completo *' : 'Razón Social *'}
            </label>
            <input
              ref={nombreInputRef}
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder={formData.tipo === 'persona' ? 'María González' : 'Empresa ABC C.A.'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errores.nombre ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errores.nombre && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errores.nombre}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono (Compatible WhatsApp)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => {
                  // Solo números, auto-agregar 0 si no empieza con 0
                  let valor = e.target.value.replace(/[^0-9]/g, '');
                  if (valor && !valor.startsWith('0')) {
                    valor = '0' + valor;
                  }
                  valor = valor.substring(0, 11); // Máximo 11 dígitos
                  setFormData(prev => ({ ...prev, telefono: valor }));
                }}
                placeholder="04141234567"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errores.telefono ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errores.telefono && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errores.telefono}
              </p>
            )}
            {formData.telefono && validarTelefono(formData.telefono) && (
              <p className="text-green-600 text-xs mt-1 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                 Compatible con WhatsApp
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                placeholder="cliente@email.com"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errores.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errores.email && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errores.email}
              </p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={formData.direccion}
                onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Dirección completa del cliente..."
                rows={2}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Info detectada */}
          {formData.cedula && validarCedulaRif(formData.cedula) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-xs font-medium text-emerald-800 mb-1">Información Detectada:</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${
                  formData.tipo === 'empresa' ? 'bg-purple-500' : 'bg-emerald-500'
                }`}></span>
                <span className="font-medium text-emerald-700">
                  {formData.tipo === 'empresa' ? ' Empresa (Jurídica)' : ' Persona Natural'}
                </span>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Crear Cliente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

//  COMPONENTE PRINCIPAL - SELECTOR DE CLIENTE
const ClienteSelector = ({ 
  clienteSeleccionado, 
  onClienteSeleccionado,
  isEditable = true,
  label = "Cliente",
  required = true,
  placeholder = "Buscar cliente por cédula o nombre..."
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [busquedaParaRegistro, setBusquedaParaRegistro] = useState('');
  const dropdownRef = useRef(null);

// Filtrar clientes
console.log(' DEBUG - CLIENTES_CACHE al filtrar:', CLIENTES_CACHE);
console.log(' DEBUG - busqueda actual:', busqueda);
const clientesFiltrados = CLIENTES_CACHE.filter(cliente => 
  cliente.cedula_rif.toLowerCase().includes(busqueda.toLowerCase()) ||
  cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
  (cliente.email && cliente.email.toLowerCase().includes(busqueda.toLowerCase()))
);
console.log(' DEBUG - clientesFiltrados:', clientesFiltrados);

  // Manejar selección
  const handleSeleccionar = (cliente) => {
    onClienteSeleccionado(cliente);
    setBusqueda('');
    setMostrarOpciones(false);
  };

  // Limpiar selección
  const handleLimpiar = () => {
    onClienteSeleccionado(null);
    setBusqueda('');
    setMostrarOpciones(false);
  };

  // Manejar cliente creado
  const handleClienteCreado = (nuevoCliente) => {
    handleSeleccionar(nuevoCliente);
    toast.success(`Cliente ${nuevoCliente.nombre} asignado`);
  };

  // Valor mostrado en el input
  const displayValue = clienteSeleccionado 
    ? `${clienteSeleccionado.cedula_rif} - ${clienteSeleccionado.nombre}`
    : '';

  // Cargar clientes al montar componente
useEffect(() => {
  cargarClientesDesdeBackend();
}, []);

  return (
    <>
      <div className="space-y-4">
        {/* Input principal */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
          <User className="h-4 w-4 mr-2 text-emerald-600" />
          {label} {required && '*'}
        </label>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busqueda || displayValue}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setMostrarOpciones(true);
              }}
              onFocus={async () => {
                console.log(' DEBUG - Input focused, cargando clientes...');
                setMostrarOpciones(true);
                
                try {
                  const response = await api.get('/clientes');
                  console.log(' DEBUG - Respuesta directa:', response.data);
                    console.log(' DEBUG - response.data.data:', response.data.data);
                    console.log(' DEBUG - response.data.data.data:', response.data.data.data);
                    CLIENTES_CACHE = response.data?.data?.data?.clientes || response.data?.data?.clientes || response.data?.clientes || [];
                    console.log(' DEBUG - CLIENTES_CACHE actualizado:', CLIENTES_CACHE);
                } catch (error) {
                  console.error('Error:', error);
                }
              }}
              onBlur={() => {
                // Reset busqueda cuando se pierde el foco
                setTimeout(() => {
                  if (!mostrarOpciones) {
                    setBusqueda('');
                  }
                }, 200);
              }}
              placeholder={placeholder}
              disabled={!isEditable}
              className={`w-full pl-10 pr-20 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                !isEditable ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
              }`}
            />
            
            {/* Botones de la derecha */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {/* Limpiar selección */}
              {clienteSeleccionado && isEditable && (
                <button
                  onClick={handleLimpiar}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  title="Limpiar selección"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              
              {/* Nuevo cliente */}
              {isEditable && (
                <button
                  onClick={() => setShowRegistroModal(true)}
                  className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                  title="Nuevo cliente"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown de opciones */}
          {mostrarOpciones && isEditable && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMostrarOpciones(false)}
              />
              
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                {clientesFiltrados.length === 0 ? (
                  <div className="p-4">
                    <div className="text-center text-gray-500 text-sm mb-3">
                      No se encontraron clientes
                    </div>
                    <button
                      onClick={() => {
                        setBusquedaParaRegistro(busqueda);
                        setShowRegistroModal(true);
                        setMostrarOpciones(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Crear Cliente</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-1">
                    {/* Opción crear nuevo */}
                    <button
                      onClick={() => {
                        setShowRegistroModal(true);
                        setMostrarOpciones(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors text-sm border-b border-gray-100 text-emerald-600 font-medium"
                    >
                      <div className="flex items-center space-x-2">
                        <UserPlus className="h-4 w-4" />
                        <span>Crear Nuevo Cliente</span>
                      </div>
                    </button>
                    
                    {/* Lista de clientes */}
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => handleSeleccionar(cliente)}
                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{cliente.cedula_rif}</div>
                            <div className="text-gray-600">{cliente.nombre}</div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              {cliente.telefono && (
                                <span className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{cliente.telefono}</span>
                                </span>
                              )}
                              {cliente.email && (
                                <span className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{cliente.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 ${
                            cliente.tipo === 'empresa' 
                              ? 'bg-purple-100 text-purple-700' 
                              : cliente.tipo === 'directo'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {cliente.tipo === 'empresa' ? '' : 
                             cliente.tipo === 'directo' ? '' : ''}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Cliente seleccionado - VERSIÓN GRANDE */}
        {clienteSeleccionado && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  clienteSeleccionado.tipo === 'persona' ? 'bg-emerald-100 text-emerald-600' :
                  clienteSeleccionado.tipo === 'empresa' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {clienteSeleccionado.tipo === 'persona' ? <User className="h-8 w-8" /> :
                   clienteSeleccionado.tipo === 'empresa' ? <Building className="h-8 w-8" /> :
                   <User className="h-8 w-8" />}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-emerald-900 mb-2">{clienteSeleccionado.nombre}</h4>
                  <div className="text-base  text-emerald-700 space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{clienteSeleccionado.cedula_rif}</span>
                    </div>
                    {clienteSeleccionado.telefono && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{clienteSeleccionado.telefono}</span>
                      </div>
                    )}
                    {clienteSeleccionado.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{clienteSeleccionado.email}</span>
                      </div>
                    )}
                    {clienteSeleccionado.direccion && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{clienteSeleccionado.direccion}</span>
                      </div>
                    )}
                  </div>
                  </div>
             </div>
             
             {/* Botón limpiar */}
             {isEditable && (
               <button
                 onClick={handleLimpiar}
                 className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                 title="Limpiar selección"
               >
                 <X className="h-5 w-5" />
               </button>
             )}
           </div>
         </div>
       )}
     </div>

     {/* Modal Registro Cliente */}
     <ModalRegistroCliente
       isOpen={showRegistroModal}
       onClose={() => {
         setShowRegistroModal(false);
         setBusquedaParaRegistro('');
       }}
       onClienteCreado={handleClienteCreado}
       cedulaInicial={busquedaParaRegistro}
     />
   </>
 );
};

export default ClienteSelector;