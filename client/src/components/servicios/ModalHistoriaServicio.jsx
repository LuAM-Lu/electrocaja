
import React, { useEffect, useRef, useState } from 'react';
import {
  X, User, Clock, CheckCircle, StickyNote, Save, XCircle, Plus, CalendarDays, 
  Edit3, Trash2, MessageSquarePlus, Camera, Mic, AlertTriangle, Eye, EyeOff,
  History, Settings, FileText, Package, CameraIcon, Zap
} from 'lucide-react';
import toast from '../../utils/toast.jsx';
import { useServiciosStore } from '../../store/serviciosStore';

// ====== Estados (SIN "Entregado") ======
const estadosConEstilo = {
  'Recibido': {
    color: 'bg-gradient-to-r from-purple-400 to-purple-600',
    headerColor: 'bg-gradient-to-r from-purple-800 to-purple-900',
    textColor: 'text-gray-100',
    icon: <Clock size={14} className="text-white" />
  },
  'En Diagnóstico': {
    color: 'bg-gradient-to-r from-amber-700 to-yellow-800',
    headerColor: 'bg-gradient-to-r from-amber-800 to-yellow-900',
    textColor: 'text-amber-100',
    icon: <Clock size={14} className="text-white" />
  },
  'Esperando Aprobación': {
    color: 'bg-gradient-to-r from-orange-700 to-red-800',
    headerColor: 'bg-gradient-to-r from-orange-800 to-red-900',
    textColor: 'text-orange-100',
    icon: <AlertTriangle size={14} className="text-white" />
  },
  'En Reparación': {
    color: 'bg-gradient-to-r from-red-800 to-red-900',
    headerColor: 'bg-gradient-to-r from-red-900 to-red-950',
    textColor: 'text-red-100',
    icon: <Settings size={14} className="text-white" />
  },
  'Listo para Retiro': {
    color: 'bg-gradient-to-r from-emerald-700 to-green-800',
    headerColor: 'bg-gradient-to-r from-emerald-800 to-green-900',
    textColor: 'text-emerald-100',
    icon: <CheckCircle size={14} className="text-white" />
  },
  'Entregado': {
    color: 'bg-gradient-to-r from-gray-800 to-gray-900',
    headerColor: 'bg-gradient-to-r from-gray-900 to-slate-900',
    textColor: 'text-gray-200',
    icon: <Package size={14} className="text-white" />
  }
};

// Función para obtener colores de un estado (acepta formato backend o frontend)
const obtenerColorEstado = (estado) => {
  // Normalizar estado: convertir EN_DIAGNOSTICO -> En Diagnóstico
  let estadoNormalizado = estado;
  if (estado.includes('_')) {
    estadoNormalizado = estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  const config = estadosConEstilo[estadoNormalizado] || estadosConEstilo['En Diagnóstico'];
  
  // Determinar colores específicos según el estado
  let bgColor, textColor, borderColor, iconColor;
  
  if (estadoNormalizado === 'Recibido') {
    bgColor = 'bg-gradient-to-r from-purple-400 to-purple-600';
    textColor = 'text-gray-100';
    borderColor = 'border-purple-500/30';
    iconColor = 'bg-purple-400';
  } else if (estadoNormalizado === 'En Diagnóstico') {
    bgColor = 'bg-gradient-to-r from-amber-700 to-yellow-800';
    textColor = 'text-amber-100';
    borderColor = 'border-amber-500/30';
    iconColor = 'bg-amber-400';
  } else if (estadoNormalizado === 'Esperando Aprobación') {
    bgColor = 'bg-gradient-to-r from-orange-700 to-red-800';
    textColor = 'text-orange-100';
    borderColor = 'border-orange-500/30';
    iconColor = 'bg-orange-400';
  } else if (estadoNormalizado === 'En Reparación') {
    bgColor = 'bg-gradient-to-r from-red-800 to-red-900';
    textColor = 'text-red-100';
    borderColor = 'border-red-500/30';
    iconColor = 'bg-red-400';
  } else if (estadoNormalizado === 'Listo para Retiro') {
    bgColor = 'bg-gradient-to-r from-emerald-700 to-green-800';
    textColor = 'text-emerald-100';
    borderColor = 'border-emerald-500/30';
    iconColor = 'bg-emerald-400';
  } else if (estadoNormalizado === 'Entregado') {
    bgColor = 'bg-gradient-to-r from-gray-800 to-gray-900';
    textColor = 'text-gray-200';
    borderColor = 'border-gray-500/30';
    iconColor = 'bg-gray-400';
  } else {
    // Default
    bgColor = config.color;
    textColor = config.textColor;
    borderColor = 'border-amber-500/30';
    iconColor = 'bg-amber-400';
  }
  
  return {
    bg: bgColor,
    text: textColor,
    border: borderColor,
    icon: iconColor
  };
};

// ====== Utils ======
const formatearFechaVE = (date) =>
  new Date(date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatearHora = (date) =>
  new Date(date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Mapeo de estados backend -> frontend
const mapearEstadoAFrontend = (estadoBackend) => {
  const mapa = {
    'EN_DIAGNOSTICO': 'En Diagnóstico',
    'ESPERANDO_APROBACION': 'Esperando Aprobación',
    'EN_REPARACION': 'En Reparación',
    'LISTO_RETIRO': 'Listo para Retiro',
    'RECIBIDO': 'Recibido',
    'ENTREGADO': 'Entregado',
    'CANCELADO': 'Cancelado'
  };
  return mapa[estadoBackend] || 'En Diagnóstico';
};

// Mapeo de estados frontend -> backend
const mapearEstadoABackend = (estadoFrontend) => {
  const mapa = {
    'En Diagnóstico': 'EN_DIAGNOSTICO',
    'Esperando Aprobación': 'ESPERANDO_APROBACION',
    'En Reparación': 'EN_REPARACION',
    'Listo para Retiro': 'LISTO_RETIRO',
    'Recibido': 'RECIBIDO',
    'Entregado': 'ENTREGADO',
    'Cancelado': 'CANCELADO'
  };
  return mapa[estadoFrontend] || estadoFrontend;
};

// Mapeo de tipos de nota frontend -> backend
const mapearTipoNotaABackend = (tipoFrontend) => {
  const mapa = {
    'texto': 'TEXTO',
    'imagen': 'IMAGEN',
    'audio': 'AUDIO'
  };
  return mapa[tipoFrontend] || 'TEXTO';
};

async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Comprimir imagen a máx 1280px ancho/alto y calidad 0.8
async function compressImageToDataURL(file, maxSide = 1280, quality = 0.8) {
  const dataURL = await fileToDataURL(file);
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL('image/jpeg', quality);
      resolve(out);
    };
    img.src = dataURL;
  });
}

export default function ModalEditarServicio({ servicio: servicioInicial, onClose, onGuardar }) {
  // Store de servicios
  const { cambiarEstado, actualizarServicio, agregarNota, obtenerServicio } = useServiciosStore();
  const [servicio, setServicio] = useState(servicioInicial);
  const [loadingServicio, setLoadingServicio] = useState(false);

  // Recargar servicio desde backend al abrir el modal
  useEffect(() => {
    if (servicioInicial?.id) {
      setLoadingServicio(true);
      obtenerServicio(servicioInicial.id)
        .then(servicioCompleto => {
          if (servicioCompleto) {
            setServicio(servicioCompleto);
          }
        })
        .catch(error => {
          console.error('Error cargando servicio:', error);
          toast.error('Error al cargar servicio desde el servidor');
        })
        .finally(() => {
          setLoadingServicio(false);
        });
    }
  }, [servicioInicial?.id, obtenerServicio]);

  if (!servicio) return null;

  // ======= STATE =======
  const estadosDisponibles = Object.keys(estadosConEstilo).filter(
    estado => estado !== 'Recibido' && estado !== 'Entregado'
  );
  // Normalizar estado desde backend (ENUM) a frontend (string legible)
  const estadoBackend = servicio?.estado || 'EN_DIAGNOSTICO';
  const estadoNormalizado = mapearEstadoAFrontend(estadoBackend);
  // Si el estado actual es "Recibido" o "Entregado", usar "En Diagnóstico" como default
  const estadoInicialValido = estadosDisponibles.includes(estadoNormalizado) 
    ? estadoNormalizado 
    : (estadoNormalizado === 'Recibido' || estadoNormalizado === 'Entregado' 
        ? 'En Diagnóstico' 
        : 'En Diagnóstico');

  const [estado, setEstado] = useState(estadoInicialValido);
  const [nota, setNota] = useState('');
  // Normalizar fecha desde backend
  const fechaInicial = servicio?.fechaEntregaEstimada 
    ? new Date(servicio.fechaEntregaEstimada).toISOString().split('T')[0]
    : '';
  const [nuevaFecha, setNuevaFecha] = useState(fechaInicial);
  const [loading, setLoading] = useState(false);

  // Notas del backend (solo lectura)
  const [notasBackend, setNotasBackend] = useState([]);
  // Notas nuevas en draft (se guardan al hacer clic en Guardar)
  const [notasNuevas, setNotasNuevas] = useState([]);
  // Notas combinadas para mostrar (backend + nuevas)
  const notasDraft = [...notasBackend, ...notasNuevas];

  //  ESTADOS DE CÁMARA MÓVIL - Modal separado
  const [showModalCamara, setShowModalCamara] = useState(false);
  const [streamActual, setStreamActual] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' para frontal, 'environment' para trasera
  
  // Referencias
  const imageInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Grabación de audio
  const [grabando, setGrabando] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Cálculos
  const estadoConfig = estadosConEstilo[estado] || estadosConEstilo['En Diagnóstico'];
  
  // 🔧 Extraer nombre del técnico (puede ser objeto o string)
  const tecnicoAsignado = (() => {
    // Si ya es un string, usarlo directamente
    if (typeof servicio?.tecnicoAsignado === 'string') {
      return servicio.tecnicoAsignado;
    }
    
    // Si tecnico es un objeto, extraer el nombre
    if (servicio?.tecnico && typeof servicio.tecnico === 'object') {
      return servicio.tecnico.nombre || servicio.tecnico.email || 'Sin asignar';
    }
    
    // Si tecnico es un string, usarlo
    if (typeof servicio?.tecnico === 'string') {
      return servicio.tecnico;
    }
    
    // Fallback
    return 'Sin asignar';
  })();
  
  // 🔧 Extraer nombre del cliente (puede ser objeto o string)
  const clienteNombre = servicio?.clienteNombre || 
    (typeof servicio?.cliente === 'object' && servicio?.cliente?.nombre) || 
    servicio?.cliente || 
    'Sin nombre';
  
  // 🔧 Extraer datos del dispositivo
  const dispositivoTexto = servicio?.dispositivo || 
    (servicio?.dispositivoMarca && servicio?.dispositivoModelo 
      ? `${servicio.dispositivoMarca} ${servicio.dispositivoModelo}`.trim()
      : servicio?.dispositivoMarca || servicio?.dispositivoModelo || '—');

  // Detectar si es móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // ======= EFFECTS =======
  useEffect(() => {
    // 🔧 Cargar notas del backend (solo lectura)
    if (!servicio?.notas) {
      setNotasBackend([]);
      return;
    }
    
    const notasDelBackend = servicio.notas || [];
    // Normalizar notas del backend para mostrar en el UI
    const notasNormalizadas = notasDelBackend.map((n) => ({ 
      id: n.id, // Usar ID del backend
      esDelBackend: true, // Marcar como nota del backend
      tipo: (n.tipo?.toLowerCase() || 'texto'),
      contenido: n.contenido || '',
      texto: n.contenido || '', // Para compatibilidad con el UI
      archivoUrl: n.archivoUrl || null,
      imagen: n.archivoUrl && (n.tipo === 'IMAGEN' || n.tipo === 'imagen') ? n.archivoUrl : null,
      audio: n.archivoUrl && (n.tipo === 'AUDIO' || n.tipo === 'audio') ? n.archivoUrl : null,
      fecha: n.fecha || n.createdAt || new Date().toISOString(),
      tecnico: (() => {
        // Si n.tecnico es un objeto, extraer el nombre
        if (n.tecnico && typeof n.tecnico === 'object') {
          return n.tecnico.nombre || n.tecnico.email || tecnicoAsignado;
        }
        // Si es un string, usarlo directamente
        if (typeof n.tecnico === 'string') {
          return n.tecnico;
        }
        // Fallback
        return tecnicoAsignado;
      })(),
      estadoAnterior: n.estadoAnterior || null,
      estadoNuevo: n.estadoNuevo || null
    }));
    
    setNotasBackend(notasNormalizadas);
    // Limpiar notas nuevas cuando cambia el servicio
    setNotasNuevas([]);
  }, [servicio?.notas, servicio?.id, tecnicoAsignado]);

  // Inicializar video cuando se abre el modal
  useEffect(() => {
    if (showModalCamara && streamActual && videoRef.current) {
      videoRef.current.srcObject = streamActual;
      videoRef.current.play().catch(err => {
        console.error('Error reproduciendo video:', err);
      });
    }
  }, [showModalCamara, streamActual]);

  // Limpiar stream al cerrar modal de cámara
  useEffect(() => {
    if (!showModalCamara && streamActual) {
      streamActual.getTracks().forEach(track => track.stop());
      setStreamActual(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
      }
    };
  }, [showModalCamara, streamActual]);

  // ======= FUNCIONES DE CÁMARA =======
  const abrirModalCamara = async () => {
    try {
      // Detener stream anterior si existe
      if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
        setStreamActual(null);
      }

      const constraints = {
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          facingMode: facingMode
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setStreamActual(stream);
      setShowModalCamara(true);
      
      // Esperar a que el modal se monte antes de asignar el stream al video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
      setShowModalCamara(false);
    }
  };

  const cerrarModalCamara = () => {
    if (streamActual) {
      streamActual.getTracks().forEach(track => track.stop());
      setStreamActual(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowModalCamara(false);
  };

  const cambiarCamara = async () => {
    const nuevaFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nuevaFacing);
    
    if (streamActual) {
      streamActual.getTracks().forEach(track => track.stop());
      setStreamActual(null);
    }
    
    // Pequeño delay para que se libere la cámara anterior
    setTimeout(async () => {
      try {
        const constraints = {
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            facingMode: nuevaFacing
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActual(stream);
        }
      } catch (error) {
        console.error('Error cambiando cámara:', error);
        toast.error('Error al cambiar cámara');
      }
    }, 100);
  };

  const capturarFoto = () => {
    if (!videoRef.current) {
      toast.error('La cámara no está lista');
      return;
    }

    try {
      // Crear canvas temporal si no existe
      const canvas = canvasRef.current || document.createElement('canvas');
      const video = videoRef.current;
      
      if (!video.videoWidth || !video.videoHeight) {
        toast.error('El video aún no está listo. Espera un momento.');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);
      
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      
      // Agregar foto al draft (no se guarda hasta hacer clic en Guardar)
      const nuevaNota = {
        id: uid(), // ID temporal
        esDelBackend: false, // Es una nota nueva
        tipo: 'imagen',
        contenido: '',
        texto: '', // Se puede escribir después
        imagen: dataURL,
        archivoUrl: dataURL,
        fecha: new Date().toISOString(),
        tecnico: tecnicoAsignado
      };
      
      setNotasNuevas(prev => [...prev, nuevaNota]);
      cerrarModalCamara();
      toast.success('Foto capturada. Escribe una descripción y haz clic en Guardar para guardarla.');
    } catch (error) {
      console.error('Error capturando foto:', error);
      toast.error('Error al capturar la foto');
    }
  };

  // ======= NOTAS (Draft - se guardan al hacer clic en Guardar) =======
  const handleAgregarNotaRapida = () => {
    if (!nota.trim()) return toast.error('Escriba una nota antes de agregar');
    
    // Agregar nota al draft
    const nuevaNota = {
      id: uid(),
      esDelBackend: false,
      tipo: 'texto',
      contenido: nota.trim(),
      texto: nota.trim(),
      fecha: new Date().toISOString(),
      tecnico: tecnicoAsignado
    };
    
    setNotasNuevas(prev => [...prev, nuevaNota]);
    setNota('');
    toast.success('Nota agregada (pendiente de guardar)');
  };

  const handleEliminarNota = (id) => {
    // Solo se pueden eliminar notas nuevas (draft), no las del backend
    setNotasNuevas(prev => prev.filter(n => n.id !== id));
    toast.success('Nota eliminada del draft');
  };

  const handleEditarNotaNueva = (id, nuevoTexto) => {
    // Solo se pueden editar notas nuevas
    setNotasNuevas(prev => prev.map(n => 
      n.id === id ? { ...n, texto: nuevoTexto, contenido: nuevoTexto } : n
    ));
  };

  const handleAdjuntarImagen = () => {
    imageInputRef.current?.click();
  };

  const onImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Archivo no es imagen');

    try {
      const dataURL = await compressImageToDataURL(file, 1280, 0.8);
      
      // Agregar imagen al draft
      const nuevaNota = {
        id: uid(),
        esDelBackend: false,
        tipo: 'imagen',
        contenido: nota.trim() || `Imagen: ${file.name}`,
        texto: nota.trim() || `Imagen: ${file.name}`,
        imagen: dataURL,
        archivoUrl: dataURL,
        nombreArchivo: file.name,
        fecha: new Date().toISOString(),
        tecnico: tecnicoAsignado
      };
      
      setNotasNuevas(prev => [...prev, nuevaNota]);
      setNota('');
      toast.success('Imagen agregada (pendiente de guardar)');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo procesar la imagen');
    }
  };

  const handleNotaVoz = async () => {
    if (!grabando) {
      // Iniciar grabación
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
        let mimeType = 'audio/webm';
        
        // Verificar qué tipo de audio soporta el navegador
        for (const mime of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mime)) {
            mimeType = mime;
            break;
          }
        }

        const rec = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];
        
        rec.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };
        
        rec.onstop = () => {
          if (audioChunksRef.current.length === 0) {
            toast.error('No se grabó ningún audio');
            stream.getTracks().forEach((t) => t.stop());
            setGrabando(false);
            return;
          }

          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64 = reader.result;
            const approxKB = Math.round((base64.length * 3) / 4 / 1024);
            
            if (approxKB > 1500) {
              toast.error('Audio muy grande (≥1.5MB). Intente grabar menos tiempo.');
              stream.getTracks().forEach((t) => t.stop());
              setGrabando(false);
              return;
            }
            
            // Agregar audio al draft
            const nuevaNota = {
              id: uid(),
              esDelBackend: false,
              tipo: 'audio',
              contenido: nota.trim() || 'Nota de voz',
              texto: nota.trim() || 'Nota de voz',
              audio: base64,
              archivoUrl: base64,
              fecha: new Date().toISOString(),
              tecnico: tecnicoAsignado,
              mime: mimeType
            };
            
            setNotasNuevas(prev => [...prev, nuevaNota]);
            setNota('');
            toast.success('Nota de voz agregada (pendiente de guardar)');
            stream.getTracks().forEach((t) => t.stop());
            setGrabando(false);
          };
          
          reader.onerror = () => {
            toast.error('Error al procesar el audio');
            stream.getTracks().forEach((t) => t.stop());
            setGrabando(false);
          };
          
          reader.readAsDataURL(blob);
        };

        rec.onerror = (error) => {
          console.error('Error en MediaRecorder:', error);
          toast.error('Error durante la grabación');
          stream.getTracks().forEach((t) => t.stop());
          setGrabando(false);
        };

        mediaRecorderRef.current = rec;
        // Agregar timeslice para que capture datos continuamente
        rec.start(1000); // Capturar datos cada segundo
        setGrabando(true);
        // No mostrar toast.loading aquí, solo cambiar el estado del botón
        
        // Auto-detener después de 30 segundos
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            toast.success('Grabación completada (30s máximo)');
          }
        }, 30000);
      } catch (err) {
        console.error('Error iniciando grabación:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error('Permiso de micrófono denegado. Por favor, permite el acceso al micrófono.');
        } else if (err.name === 'NotFoundError') {
          toast.error('No se encontró ningún micrófono.');
        } else {
          toast.error('No se pudo iniciar la grabación. Verifica los permisos del micrófono.');
        }
        setGrabando(false);
      }
    } else {
      // Detener grabación manualmente
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          // El toast se mostrará en el onstop handler
        } else {
          setGrabando(false);
        }
      } catch (err) {
        console.error('Error deteniendo grabación:', err);
        setGrabando(false);
      }
    }
  };

  // ======= GUARDAR CAMBIOS =======
  const handleGuardar = async () => {
    if (!nuevaFecha) return toast.error('La fecha de entrega es requerida');
    setLoading(true);
    
    try {
      const servicioId = servicio.id;

      // 1. Actualizar estado si cambió
      const estadoBackend = mapearEstadoABackend(estado);
      const estadoActualBackend = servicio.estado || 'EN_DIAGNOSTICO';
      if (estadoActualBackend !== estadoBackend) {
        console.log(`🔄 Cambiando estado de ${estadoActualBackend} a ${estadoBackend}`);
        await cambiarEstado(servicioId, estadoBackend);
      }

      // 2. Actualizar fecha de entrega si cambió
      const fechaActual = servicio.fechaEntregaEstimada 
        ? new Date(servicio.fechaEntregaEstimada).toISOString().split('T')[0]
        : null;
      if (fechaActual !== nuevaFecha) {
        console.log(`📅 Actualizando fecha de entrega a ${nuevaFecha}`);
        await actualizarServicio(servicioId, {
          diagnostico: {
            fechaEntrega: nuevaFecha
          }
        });
      }

      // 3. Guardar todas las notas nuevas al backend
      if (notasNuevas.length > 0) {
        console.log(`📝 Guardando ${notasNuevas.length} notas nuevas`);
        for (const notaNueva of notasNuevas) {
          try {
            const tipoBackend = mapearTipoNotaABackend(notaNueva.tipo);
            const contenido = notaNueva.texto || notaNueva.contenido || '';
            // Priorizar archivoUrl, luego imagen, luego audio
            const archivoUrl = notaNueva.archivoUrl || notaNueva.imagen || notaNueva.audio || null;
            
            console.log(`📤 Enviando nota al backend:`, {
              tipo: tipoBackend,
              contenido: contenido.substring(0, 50) + (contenido.length > 50 ? '...' : ''),
              tieneArchivo: !!archivoUrl,
              tamañoArchivo: archivoUrl ? Math.round(archivoUrl.length / 1024) + 'KB' : 'N/A',
              tipoNota: notaNueva.tipo
            });
            
            const datosNota = {
              tipo: tipoBackend,
              contenido: contenido
            };
            
            // Solo agregar archivoUrl si existe
            if (archivoUrl) {
              datosNota.archivoUrl = archivoUrl;
            }
            
            await agregarNota(servicioId, datosNota);
            
            console.log(`✅ Nota guardada correctamente`);
          } catch (error) {
            console.error(`❌ Error guardando nota:`, error);
            console.error(`Detalles del error:`, {
              message: error.message,
              response: error.response?.data
            });
            toast.error(`Error guardando una nota: ${error.response?.data?.message || error.message}`);
          }
        }
      }

      // 4. Recargar servicio completo desde backend para obtener todos los cambios
      const servicioActualizado = await obtenerServicio(servicioId);
      if (servicioActualizado) {
        setServicio(servicioActualizado);
      }

      // 5. Limpiar notas nuevas después de guardar
      setNotasNuevas([]);

      // 6. Notificar al componente padre
      await onGuardar?.(servicioId, {
        estado: estadoBackend,
        fechaEntrega: nuevaFecha
      });

      toast.success('✅ Historial actualizado correctamente');
      onClose?.();
    } catch (e) {
      console.error('❌ Error al actualizar historial:', e);
      toast.error(`Error al actualizar historial: ${e.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // ======= CANCELAR =======
  const handleCancelar = () => {
    // Limpiar todas las notas nuevas (draft)
    setNotasNuevas([]);
    setNota('');
    // Cerrar modal de cámara si está abierto
    if (showModalCamara) {
      cerrarModalCamara();
    }
    // Cerrar modal principal
    onClose?.();
  };

  if (loadingServicio) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            <p className="text-gray-300">Cargando servicio desde el servidor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-7xl h-[95vh] shadow-2xl overflow-hidden flex flex-col border border-gray-700">

        {/* HEADER COMPACTO */}
        <div className={`relative ${estadoConfig.headerColor} overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            />
          </div>
          <div className="relative px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Historial #{servicio.id}</h1>
                  <div className="text-sm text-white/80">
                    {clienteNombre} • {dispositivoTexto}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO - LAYOUT 20% / 80% */}
        <div className="flex-1 min-h-0 overflow-hidden p-6 bg-gray-900">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-full min-h-0">

            {/* COLUMNA IZQUIERDA: CONFIGURACIÓN COMPACTA (20%) */}
            <div className="xl:col-span-1 flex flex-col space-y-4 min-h-0">

              {/* Estado del servicio - MÁS COMPACTO */}
              <div className="bg-gray-800/70 rounded-xl p-3 border border-gray-700 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Estado
                </h3>

                <div className="space-y-2">
                  {Object.entries(estadosConEstilo)
                    .filter(([key]) => estadosDisponibles.includes(key))
                    .map(([key, { color, icon }]) => (
                    <button
                      key={key}
                      onClick={() => setEstado(key)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg font-medium text-white transition-all ${
                        estado === key
                          ? `${color} ring-1 ring-white/30 shadow-md`
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {icon} 
                      <span className="text-left leading-tight">{key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha de entrega - COMPACTA */}
              <div className="bg-gray-800/70 rounded-xl p-3 border border-gray-700 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-purple-400" />
                  Fecha
                </h3>

                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full px-2 py-2 text-sm border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-800 text-gray-100"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Resumen - ULTRA COMPACTO */}
              <div className="bg-gray-800/70 rounded-xl p-3 border border-gray-700 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-400" />
                  Info
                </h3>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total:</span>
                    <span className="text-emerald-400 font-bold">{servicio.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Notas:</span>
                    <span className="text-gray-200">{notasDraft.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Técnico:</span>
                    <span className="text-gray-200 text-xs">{tecnicoAsignado}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: HISTORIAL PROTAGONISTA (80%) */}
            <div className="xl:col-span-4 flex flex-col min-h-0">
              <div className="bg-gray-800/70 rounded-xl border border-gray-700 flex flex-col flex-1 min-h-0">

                {/* Header minimalista del historial */}
                <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                      <StickyNote className="h-5 w-5 text-yellow-400" />
                      Historial Técnico
                    </h3>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded-full text-gray-300">
                      {notasDraft.length}
                    </span>
                  </div>
                </div>


                {/* Área de notas - MÁXIMO PROTAGONISMO */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {notasDraft.length > 0 ? (
                    notasDraft
                      .slice()
                      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) // Más recientes primero
                      .map((n) => (
                        <div key={n.id} className="bg-gray-900/70 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                          
                          {/* Header compacto de la nota */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock size={12} />
                              <span>{formatearFechaVE(n.fecha)}</span>
                              <span>{formatearHora(n.fecha)}</span>
                              <span className="text-blue-400">• {typeof n.tecnico === 'object' ? n.tecnico?.nombre || 'Técnico' : n.tecnico || 'Técnico'}</span>
                            </div>
                            {/* Solo mostrar botón eliminar para notas nuevas */}
                            {!n.esDelBackend && (
                              <button
                                onClick={() => handleEliminarNota(n.id)}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Contenido optimizado */}
                          {(n.tipo === 'texto' || n.tipo === 'cambio_estado') && (
                            <div className="text-gray-200 text-sm leading-relaxed">
                              {n.texto || n.contenido || <i className="text-gray-500">Sin mensaje</i>}
                              {n.estadoAnterior && n.estadoNuevo && (() => {
                                const colorAnterior = obtenerColorEstado(n.estadoAnterior);
                                const colorNuevo = obtenerColorEstado(n.estadoNuevo);
                                const estadoAnteriorTexto = n.estadoAnterior.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                const estadoNuevoTexto = n.estadoNuevo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                
                                return (
                                  <div className="mt-3 p-3 bg-gradient-to-r from-gray-900/60 via-gray-800/60 to-gray-900/60 border border-gray-600/30 rounded-lg backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className={`px-3 py-1.5 ${colorAnterior.bg} ${colorAnterior.text} rounded-md font-medium border ${colorAnterior.border} flex items-center gap-1.5`}>
                                          <div className={`w-2 h-2 rounded-full ${colorAnterior.icon}`}></div>
                                          {estadoAnteriorTexto}
                                        </span>
                                        <span className="text-gray-400 font-bold">→</span>
                                        <span className={`px-3 py-1.5 ${colorNuevo.bg} ${colorNuevo.text} rounded-md font-medium border ${colorNuevo.border} flex items-center gap-1.5`}>
                                          <div className={`w-2 h-2 rounded-full ${colorNuevo.icon}`}></div>
                                          {estadoNuevoTexto}
                                        </span>
                                      </div>
                                      <div className="ml-auto">
                                        <span className="text-blue-400 flex items-center gap-1">
                                          <Zap size={10} />
                                          Cambio de estado
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {n.tipo === 'imagen' && (
                            <div className="space-y-2">
                              {n.texto && (
                                <div className="text-gray-200 text-sm leading-relaxed">{n.texto}</div>
                              )}
                              <a href={n.imagen} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={n.imagen}
                                  alt={n.nombreArchivo || 'Evidencia'}
                                  className="max-h-60 w-auto rounded-md border border-gray-600 object-contain hover:border-gray-500 transition-colors cursor-zoom-in"
                                  loading="lazy"
                                />
                              </a>
                            </div>
                          )}

                          {n.tipo === 'audio' && (
                            <div className="space-y-2">
                              {/* Editable si es nota nueva */}
                              {!n.esDelBackend ? (
                                <textarea
                                  value={n.texto || ''}
                                  onChange={(e) => handleEditarNotaNueva(n.id, e.target.value)}
                                  placeholder="Escribe una descripción para esta nota de voz..."
                                  className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-gray-100 placeholder-gray-400"
                                  rows={2}
                                />
                              ) : (
                                n.texto && (
                                  <div className="text-gray-200 text-sm leading-relaxed">{n.texto}</div>
                                )
                              )}
                              <audio 
                                controls 
                                src={n.audio || n.archivoUrl} 
                                className="w-full h-8"
                              />
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-12">
                      <StickyNote className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 italic text-lg mb-2">Sin notas registradas</p>
                      <p className="text-gray-600 text-sm">Agregue la primera entrada</p>
                    </div>
                  )}
                </div>

                {/* Footer para nueva nota - COMPACTO PERO FUNCIONAL */}
                <div className="p-4 border-t border-gray-700 flex-shrink-0 bg-gray-800/30">
                  <div className="space-y-3">
                    <textarea
                      value={nota}
                      onChange={(e) => setNota(e.target.value.slice(0, 500))}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-gray-100 placeholder-gray-400"
                      placeholder="Escriba detalles técnicos..."
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Nota rápida */}
                        <button
                          onClick={handleAgregarNotaRapida}
                          disabled={!nota.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                        >
                          <MessageSquarePlus size={14} />
                          Nota
                        </button>

                        {/*  BOTÓN CÁMARA - Abre modal */}
                        <button
                          onClick={abrirModalCamara}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                        >
                          <CameraIcon size={14} />
                          Cámara
                        </button>

                        {/* Archivo */}
                        <button
                          onClick={handleAdjuntarImagen}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                        >
                          <FileText size={14} />
                          Archivo
                        </button>

                        {/* Audio */}
                        <button
                          onClick={handleNotaVoz}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                            grabando
                              ? 'bg-red-700 hover:bg-red-600 text-white'
                             : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                         }`}
                       >
                         <Mic size={14} />
                         {grabando ? 'Stop' : 'Audio'}
                       </button>
                     </div>

                     {/* Contador de caracteres */}
                     <div className="text-xs text-gray-500">
                       {nota.length}/500
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>

         </div>
       </div>

       {/* FOOTER COMPACTO */}
       <div className="flex-shrink-0 bg-gray-800 px-6 py-4 border-t border-gray-700">
         <div className="flex justify-center gap-3">
          <button
            onClick={handleCancelar}
            disabled={loading}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50 border border-gray-600"
          >
            <XCircle className="h-4 w-4 inline mr-2" />
            Cancelar
          </button>
           <button
             onClick={handleGuardar}
             disabled={loading}
             className="px-8 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 flex items-center gap-2 shadow-lg"
           >
             {loading ? (
               <>
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                 Guardando...
               </>
             ) : (
               <>
                 <Save className="h-4 w-4" />
                 Guardar
               </>
             )}
           </button>
         </div>
       </div>

      {/* Canvas oculto para captura de fotos */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Input oculto para archivos */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageSelected}
      />

      {/* MODAL DE CÁMARA */}
      {showModalCamara && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-4xl border border-gray-700 shadow-2xl overflow-hidden">
            {/* Header del modal de cámara */}
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <CameraIcon className="h-5 w-5 text-blue-400" />
                Capturar Foto
              </h3>
              <button
                onClick={cerrarModalCamara}
                className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-300" />
              </button>
            </div>

            {/* Vista previa de la cámara */}
            <div className="relative bg-black p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[60vh] object-contain rounded-lg"
                onLoadedMetadata={() => {
                  // Asegurar que el video esté listo
                  if (videoRef.current) {
                    videoRef.current.play().catch(err => {
                      console.error('Error reproduciendo video:', err);
                    });
                  }
                }}
              />
              
              {/* Controles de cámara superpuestos */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                {/* Cambiar cámara (solo en móvil) */}
                {isMobile && (
                  <button
                    onClick={cambiarCamara}
                    className="p-3 bg-gray-800/90 hover:bg-gray-700/90 rounded-full text-white transition-colors shadow-lg"
                    title="Cambiar cámara"
                  >
                    <Camera size={20} />
                  </button>
                )}
                
                {/* Botón de capturar */}
                <button
                  onClick={capturarFoto}
                  disabled={!streamActual}
                  className="p-5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full text-white transition-colors shadow-lg transform hover:scale-110 disabled:hover:scale-100"
                  title="Capturar foto"
                >
                  <CameraIcon size={28} />
                </button>
                
                {/* Cerrar cámara */}
                <button
                  onClick={cerrarModalCamara}
                  className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors shadow-lg"
                  title="Cerrar cámara"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-gray-800 px-6 py-3 border-t border-gray-700">
              <p className="text-sm text-gray-400 text-center">
                Haz clic en el botón azul para capturar la foto. Luego podrás escribir una descripción antes de guardar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
