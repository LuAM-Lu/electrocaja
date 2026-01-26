// components/presupuesto/ClienteSelector.jsx - VERSIÓN COMPLETA ACTUALIZADA 
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, UserPlus, X, User, Building, Phone,
  Mail, MapPin, AlertTriangle, CheckCircle,
  CreditCard, Globe, UserCheck, Building2, Landmark
} from 'lucide-react';
import toast from '../../utils/toast.jsx';
import { api } from "../../config/api";

//  DATOS SIMULADOS (mover a store después)
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
  const patronMovil = /^(0414|0424|0412|0416|0426|0422)\d{7}$/;
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
    CLIENTES_CACHE = response.data?.data?.data?.clientes || response.data?.data?.clientes || response.data?.clientes || [];
    return CLIENTES_CACHE;
  } catch (error) {
    console.error('Error cargando clientes:', error);
    toast.error('Error al cargar clientes');
    return [];
  }
};

//  MODAL REGISTRO CLIENTE
const ModalRegistroCliente = ({
  isOpen,
  onClose,
  onClienteCreado,
  cedulaInicial = '',
  theme = 'light'
}) => {
  const [formData, setFormData] = useState({
    tipo: '',
    cedula: '',
    nombre: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({});
  const nombreInputRef = useRef(null);

  //  ESTILOS BASADOS EN THEME
  const getThemeStyles = () => {
    if (theme === 'dark') {
      return {
        modal: 'bg-slate-900 border-slate-700 shadow-2xl rounded-2xl ring-1 ring-white/10',
        header: 'bg-slate-800/50 border-b border-slate-700/50',
        input: 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 rounded-xl transition-all',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95 transition-all rounded-lg font-medium',
        buttonSecondary: 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700',
        text: 'text-slate-100',
        textSecondary: 'text-slate-400',
        card: 'bg-slate-800/50 border-slate-700/50 rounded-xl',
        pillActive: 'bg-slate-700 text-white border-slate-600 shadow-sm',
        pillInactive: 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800'
      };
    }

    return {
      modal: 'bg-white border-slate-100 shadow-2xl rounded-2xl ring-1 ring-black/5',
      header: 'bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm',
      input: 'bg-white border-slate-200 text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-xl shadow-sm transition-all',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all rounded-lg font-bold',
      buttonSecondary: 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm',
      text: 'text-slate-800',
      textSecondary: 'text-slate-500',
      card: 'bg-slate-50/50 border-slate-100 rounded-xl',
      pillActive: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
      pillInactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
    };
  };

  const styles = getThemeStyles();

  // Pre-llenar y auto-detectar tipo
  useEffect(() => {
    if (isOpen && cedulaInicial.trim()) {
      const cedulaFormateada = cedulaInicial.trim().toUpperCase();
      const tipoDetectado = detectarTipoCliente(cedulaFormateada);

      setFormData(prev => ({
        ...prev,
        cedula: cedulaFormateada,
        tipo: tipoDetectado
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
      <div className={`${styles.modal} rounded-xl shadow-2xl max-w-md w-full border`}>

        {/* Header */}
        <div className={`${styles.header} px-6 py-4 rounded-t-xl`}>
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

        {/* Banner moderno - Cards en grid */}
        {cedulaInicial && /^\d+$/.test(cedulaInicial) && /^\d+$/.test(formData.cedula) && (
          <div className={`${styles.card} mx-6 mt-4 rounded-xl p-4 shadow-sm border`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Search className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className={`font-semibold text-sm ${styles.text}`}>Detectamos solo números</h4>
                <p className={`text-xs ${styles.textSecondary}`}>¿Qué tipo de documento es <span className="font-mono font-bold">{cedulaInicial.padStart(8, '0')}</span>?</p>
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
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1 shadow-sm">
                    <User className="h-3.5 w-3.5" />
                  </div>
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
                  <Globe className="h-4 w-4 text-blue-600 mx-auto mb-1" />
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
                  <UserCheck className="h-4 w-4 text-purple-600 mx-auto mb-1" />
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
                  <Building2 className="h-4 w-4 text-orange-600 mx-auto mb-1" />
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
                  <Landmark className="h-4 w-4 text-gray-600 mx-auto mb-1" />
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
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-2`}>
              Tipo de Cliente *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo: 'persona' }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${formData.tipo === 'persona'
                  ? `${styles.pillActive} border-current`
                  : formData.tipo === ''
                    ? `${styles.pillInactive} border-gray-300 hover:border-current`
                    : `${styles.pillInactive} border-gray-200 hover:border-gray-300`
                  }`}
              >
                <User className="h-4 w-4 mx-auto mb-1" />
                Persona Natural
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo: 'empresa' }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${formData.tipo === 'empresa'
                  ? `${styles.pillActive} border-current`
                  : formData.tipo === ''
                    ? `${styles.pillInactive} border-gray-300 hover:border-current`
                    : `${styles.pillInactive} border-gray-200 hover:border-gray-300`
                  }`}
              >
                <Building className="h-4 w-4 mx-auto mb-1" />
                Empresa
              </button>
            </div>
            {/* Indicador cuando no hay tipo seleccionado */}
            {formData.tipo === '' && (
              <div className="mt-2 text-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Selecciona un tipo de cliente
                </span>
              </div>
            )}
          </div>

          {/* Cédula/RIF */}
          <div>
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-1`}>
              {formData.tipo === 'persona' ? 'Cédula *' : 'RIF *'}
            </label>
            <input
              id="cliente-cedula-input"
              name="clienteCedula"
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
              className={`w-full px-3 py-2 border rounded-lg ${styles.input} ${errores.cedula ? 'border-red-300 bg-red-50' : ''
                }`}
            />
            {errores.cedula && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {errores.cedula}
              </p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-1`}>
              {formData.tipo === 'persona' ? 'Nombre Completo *' : 'Razón Social *'}
            </label>
            <input
              id="cliente-nombre-input"
              name="clienteNombre"
              ref={nombreInputRef}
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder={formData.tipo === 'persona' ? 'María González' : 'Empresa ABC C.A.'}
              className={`w-full px-3 py-2 border rounded-lg ${styles.input} ${errores.nombre ? 'border-red-300 bg-red-50' : ''
                }`}
            />
            {errores.nombre && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {errores.nombre}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-1`}>
              Teléfono (Compatible WhatsApp)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="cliente-telefono-input"
                name="clienteTelefono"
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
                className={`w-full pl-10 pr-3 py-2 border rounded-lg ${styles.input} ${errores.telefono ? 'border-red-300 bg-red-50' : ''
                  }`}
              />
            </div>
            {errores.telefono && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
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
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-1`}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="cliente-email-input"
                name="clienteEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                placeholder="cliente@email.com"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg ${styles.input} ${errores.email ? 'border-red-300 bg-red-50' : ''
                  }`}
              />
            </div>
            {errores.email && (
              <p className="text-red-600 text-xs mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {errores.email}
              </p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className={`block text-sm font-medium ${styles.textSecondary} mb-1`}>Dirección</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={formData.direccion}
                onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Dirección completa del cliente..."
                rows={2}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg resize-none ${styles.input}`}
              />
            </div>
          </div>

          {/* Info detectada */}
          {formData.cedula && validarCedulaRif(formData.cedula) && (
            <div className={`${styles.card} border rounded-lg p-3`}>
              <div className={`text-xs font-medium ${styles.textSecondary} mb-1`}>Información Detectada:</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${formData.tipo === 'empresa' ? 'bg-purple-500' : 'bg-emerald-500'
                  }`}></span>
                <span className={`font-medium ${styles.text} flex items-center gap-1`}>
                  {formData.tipo === 'empresa' ? (
                    <>
                      <Building2 className="h-3 w-3" />
                      Empresa (Jurídica)
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      Persona Natural
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className={`flex-1 px-4 py-2 border rounded-lg transition-colors font-medium ${styles.buttonSecondary} border-gray-300`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 ${styles.button} text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2`}
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
  placeholder = "Buscar cliente por cédula o nombre...",
  theme = "light"
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [busquedaParaRegistro, setBusquedaParaRegistro] = useState('');
  const dropdownRef = useRef(null);

  //  ESTILOS BASADOS EN THEME
  const getThemeStyles = () => {
    if (theme === 'dark') {
      return {
        container: 'bg-slate-900/50 backdrop-blur-xl border-slate-700/50 shadow-2xl rounded-2xl',
        input: 'bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 rounded-xl transition-all duration-300',
        dropdown: 'bg-slate-800 border-slate-700 shadow-xl rounded-xl ring-1 ring-black/5',
        option: 'hover:bg-slate-700/50 text-slate-200 cursor-pointer transition-colors',
        selectedCard: 'bg-slate-800/40 border-slate-700/50 rounded-2xl backdrop-blur-sm',
        label: 'text-slate-300 font-medium',
        labelIcon: 'text-emerald-400',
        button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95 transition-all rounded-lg font-medium',
        buttonSecondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-sm border border-slate-600/50 transition-all rounded-lg',
        text: 'text-slate-100 font-medium',
        textSecondary: 'text-slate-400',
        textMuted: 'text-slate-500'
      };
    }

    return {
      container: 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl',
      input: 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-xl shadow-sm transition-all duration-300',
      dropdown: 'bg-white border-slate-100 shadow-2xl shadow-slate-200/50 rounded-xl ring-1 ring-slate-100',
      option: 'hover:bg-emerald-50/50 text-slate-700 cursor-pointer transition-colors',
      selectedCard: 'bg-emerald-50/30 border-emerald-100 rounded-2xl backdrop-blur-sm shadow-sm',
      label: 'text-slate-700 font-bold',
      labelIcon: 'text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all rounded-lg font-bold tracking-wide',
      buttonSecondary: 'bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 transition-all rounded-lg font-medium',
      text: 'text-slate-800 font-bold',
      textSecondary: 'text-slate-500',
      textMuted: 'text-slate-400'
    };
  };

  const styles = getThemeStyles();

  // Filtrar clientes con validación de cache
  const clientesFiltrados = Array.isArray(CLIENTES_CACHE) ? CLIENTES_CACHE.filter(cliente => {
    if (!cliente) return false;
    const cedulaMatch = cliente.cedula_rif?.toLowerCase().includes(busqueda.toLowerCase()) || false;
    const nombreMatch = cliente.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || false;
    const emailMatch = cliente.email?.toLowerCase().includes(busqueda.toLowerCase()) || false;
    return cedulaMatch || nombreMatch || emailMatch;
  }) : [];

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

  // Cargar clientes al montar componente Y cuando se abre el modal
  useEffect(() => {
    const cargarClientesInicial = async () => {
      try {
        await cargarClientesDesdeBackend();
      } catch (error) {
        console.error('Error cargando clientes inicial:', error);
      }
    };

    cargarClientesInicial();
  }, []);

  return (
    <>
      <div className="space-y-4">
        {/* Input principal */}
        <div className="relative" ref={dropdownRef}>
          <label className={`block text-sm font-medium ${styles.label} mb-2 flex items-center`}>
            <User className={`h-4 w-4 mr-2 ${styles.labelIcon}`} />
            {label} {required && '*'}
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="cliente-search-input"
              name="clienteSearch"
              type="text"
              value={busqueda || displayValue}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setMostrarOpciones(true);
              }}
              onFocus={async () => {
                // Si no hay clientes cargados o el cache está vacío, cargarlos
                if (CLIENTES_CACHE.length === 0) {
                  try {
                    await cargarClientesDesdeBackend();
                  } catch (error) {
                    console.error('Error cargando clientes en focus:', error);
                  }
                }

                // Mostrar opciones después de asegurar que hay datos
                setMostrarOpciones(true);
              }}
              onClick={async () => {
                // Si ya está abierto, no hacer nada
                if (mostrarOpciones) {
                  return;
                }

                // Si no hay clientes, cargarlos primero
                if (CLIENTES_CACHE.length === 0) {
                  try {
                    await cargarClientesDesdeBackend();
                  } catch (error) {
                    console.error('Error cargando clientes en click:', error);
                  }
                }

                // Mostrar dropdown
                setMostrarOpciones(true);
              }}
              onBlur={(e) => {
                // No cerrar si el usuario hizo clic dentro del dropdown
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && relatedTarget.closest('.dropdown-container')) {
                  return;
                }

                // Reset búsqueda cuando se pierde el foco
                setTimeout(() => {
                  setMostrarOpciones(false);
                  if (!clienteSeleccionado) {
                    setBusqueda('');
                  }
                }, 150);
              }}
              placeholder={placeholder}
              disabled={!isEditable}
              className={`w-full pl-10 pr-20 py-3 border rounded-lg transition-colors ${styles.input} ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''
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
                  className={`${styles.labelIcon} hover:bg-opacity-10 hover:bg-current p-1 rounded transition-colors`}
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

              <div className={`dropdown-container absolute z-50 w-full mt-1 ${styles.dropdown} border rounded-lg shadow-xl max-h-96 overflow-y-auto`}>
                {clientesFiltrados.length === 0 ? (
                  <div className="p-4">
                    <div className={`text-center ${styles.textMuted} text-sm mb-3`}>
                      No se encontraron clientes
                    </div>
                    <button
                      onClick={() => {
                        setBusquedaParaRegistro(busqueda);
                        setShowRegistroModal(true);
                        setMostrarOpciones(false);
                      }}
                      className={`w-full flex items-center justify-center space-x-2 px-3 py-2 ${styles.button} rounded-lg transition-colors text-sm font-medium`}
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
                      className={`w-full px-4 py-3 text-left ${styles.option} transition-colors text-sm border-b border-gray-100 font-medium flex items-center space-x-2`}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Crear Nuevo Cliente</span>
                    </button>

                    {/* Lista de clientes */}
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => handleSeleccionar(cliente)}
                        className={`w-full px-4 py-3 text-left ${styles.option} transition-colors text-sm`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className={`font-medium ${styles.text}`}>{cliente.cedula_rif}</div>
                            <div className={styles.textSecondary}>{cliente.nombre}</div>
                            <div className={`flex items-center space-x-2 text-xs ${styles.textMuted} mt-1`}>
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
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 ${cliente.tipo === 'empresa'
                            ? 'bg-purple-100 text-purple-700'
                            : cliente.tipo === 'directo'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-emerald-100 text-emerald-700'
                            }`}>
                            {cliente.tipo === 'empresa' ? (
                              <Building2 className="h-3 w-3" />
                            ) : cliente.tipo === 'directo' ? (
                              <CreditCard className="h-3 w-3" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
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
          <div className={`${styles.selectedCard} border rounded-xl p-6 shadow-lg`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${clienteSeleccionado.tipo === 'persona' ? 'bg-emerald-100 text-emerald-600' :
                  clienteSeleccionado.tipo === 'empresa' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                  {clienteSeleccionado.tipo === 'persona' ? (
                    <User className="h-8 w-8" />
                  ) : clienteSeleccionado.tipo === 'empresa' ? (
                    <Building className="h-8 w-8" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <h4 className={`text-xl font-bold ${styles.text} mb-2`}>{clienteSeleccionado.nombre}</h4>
                  <div className={`text-base ${styles.textSecondary} space-y-1`}>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
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
                  className={`${styles.textMuted} hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors`}
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
        theme={theme}
      />
    </>
  );
};

export default ClienteSelector;