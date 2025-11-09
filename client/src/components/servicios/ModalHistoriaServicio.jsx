
import React, { useEffect, useRef, useState } from 'react';
import {
  X, User, Clock, CheckCircle, StickyNote, Save, XCircle, Plus, CalendarDays, 
  Edit3, Trash2, MessageSquarePlus, Camera, Mic, AlertTriangle, Eye, EyeOff,
  History, Settings, FileText, Package, CameraIcon, StopCircle
} from 'lucide-react';
import toast from '../../utils/toast.jsx';

// ====== Estados (SIN "Entregado") ======
const estadosConEstilo = {
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
  }
};

// ====== Utils ======
const formatearFechaVE = (date) =>
  new Date(date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatearHora = (date) =>
  new Date(date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

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

export default function ModalEditarServicio({ servicio, onClose, onGuardar }) {
  if (!servicio) return null;

  // ======= STATE =======
  const estadosDisponibles = Object.keys(estadosConEstilo);
  const estadoInicialValido = estadosDisponibles.includes(servicio?.estado) ? servicio?.estado : 'En Diagnóstico';

  const [estado, setEstado] = useState(estadoInicialValido);
  const [nota, setNota] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState(servicio?.fechaEntrega || '');
  const [loading, setLoading] = useState(false);

  // Notas en edición (draft) -> incluyen las del backend + locales previas
  const [notasDraft, setNotasDraft] = useState([]);

  //  ESTADOS DE CÁMARA MÓVIL
  const [camaraActiva, setCamaraActiva] = useState(false);
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
  const tecnicoAsignado = servicio?.tecnico || 'Técnico';
  const estadoConfig = estadosConEstilo[estado] || estadosConEstilo['En Diagnóstico'];
  const historialKey = `historial_servicio_${servicio.id}`;

  // Detectar si es móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // ======= EFFECTS =======
  useEffect(() => {
    // Cargar notas guardadas en localStorage (si existen) y unir con backend
    let saved = [];
    try {
      const raw = localStorage.getItem(historialKey);
      if (raw) saved = JSON.parse(raw) || [];
    } catch (_) {}
    const base = (servicio?.notasTecnicas || []).map((n) => ({ ...n }));
    const merged = [...base, ...saved].map((n) => ({ id: n.id || uid(), ...n }));
    setNotasDraft(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicio?.id]);

  // Limpiar stream al cerrar
  useEffect(() => {
    return () => {
      if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
      }
    };
  }, [streamActual]);

  // ======= FUNCIONES DE CÁMARA =======
  const iniciarCamara = async () => {
    try {
      // Detener stream anterior si existe
      if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          facingMode: facingMode
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
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

  const cambiarCamara = async () => {
    const nuevaFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nuevaFacing);
    
    if (camaraActiva) {
      detenerCamara();
      // Pequeño delay para que se libere la cámara anterior
      setTimeout(() => {
        iniciarCamara();
      }, 100);
    }
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
        id: uid(),
        tipo: 'imagen',
        texto: nota.trim() || '',
        fecha: new Date().toISOString(),
        tecnico: tecnicoAsignado,
        imagen: dataURL,
        nombreArchivo: `captura_${Date.now()}.jpg`,
        mime: 'image/jpeg'
      };

      setNotasDraft(prev => [...prev, nuevaEvidencia]);
      setNota('');
      toast.success('Foto capturada y agregada al historial');
      
      detenerCamara();
    }
  };

  // ======= NOTAS (Draft) =======
  const handleAgregarNotaRapida = () => {
    if (!nota.trim()) return toast.error('Escriba una nota antes de agregar');
    setNotasDraft((prev) => [
      ...prev,
      {
        id: uid(),
        tipo: 'texto',
        texto: nota.trim(),
        fecha: new Date().toISOString(),
        tecnico: tecnicoAsignado
      }
    ]);
    setNota('');
    toast.success('Nota agregada (pendiente de guardar)');
  };

  const handleEliminarNota = (id) => {
    setNotasDraft((prev) => prev.filter((n) => n.id !== id));
    toast.success('Nota eliminada (pendiente de guardar)');
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
      const approxSizeKB = Math.round((dataURL.length * 3) / 4 / 1024);
      if (approxSizeKB > 900) {
        toast.error('Imagen muy grande para almacenamiento local (≥900KB). Intenta otra más ligera.');
        return;
      }

      setNotasDraft((prev) => [
        ...prev,
        {
          id: uid(),
          tipo: 'imagen',
          texto: nota.trim() || '',
          fecha: new Date().toISOString(),
          tecnico: tecnicoAsignado,
          imagen: dataURL,
          nombreArchivo: file.name,
          mime: 'image/jpeg'
        }
      ]);
      setNota('');
      toast.success('Imagen añadida (pendiente de guardar)');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo procesar la imagen');
    }
  };

  const handleNotaVoz = async () => {
    if (!grabando) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        rec.ondataavailable = (ev) => ev.data.size && audioChunksRef.current.push(ev.data);
        rec.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result;
            const approxKB = Math.round((base64.length * 3) / 4 / 1024);
            if (approxKB > 1500) {
              toast.error('Audio muy grande (≥1.5MB). Intente grabar menos tiempo.');
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            setNotasDraft((prev) => [
              ...prev,
              {
                id: uid(),
                tipo: 'audio',
                texto: nota.trim() || '',
                fecha: new Date().toISOString(),
                tecnico: tecnicoAsignado,
                audio: base64,
                mime: 'audio/webm'
              }
            ]);
            setNota('');
            toast.success('Nota de voz añadida (pendiente de guardar)');
          };
          reader.readAsDataURL(blob);
          stream.getTracks().forEach((t) => t.stop());
        };
        mediaRecorderRef.current = rec;
        rec.start();
        setGrabando(true);
        toast.loading('Grabando... (máx 30s)');
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setGrabando(false);
          }
        }, 30000);
      } catch (err) {
        console.error(err);
        toast.error('No se pudo iniciar la grabación (permiso de micrófono requerido)');
      }
    } else {
      try {
        mediaRecorderRef.current?.stop();
      } finally {
        setGrabando(false);
      }
    }
  };

  // ======= GUARDAR CAMBIOS =======
  const handleGuardar = async () => {
    if (!nuevaFecha) return toast.error('La fecha de entrega es requerida');
    setLoading(true);
    try {
      const datosActualizados = {
        estado,
        fechaEntrega: nuevaFecha,
        notasTecnicas: notasDraft,
        ultimaActualizacion: new Date().toISOString()
      };

      // Persistir en localStorage SOLO al guardar
      localStorage.setItem(historialKey, JSON.stringify(notasDraft));

      await new Promise((r) => setTimeout(r, 400));
      onGuardar?.(servicio.id, datosActualizados);
      toast.success('Historial actualizado');
      onClose?.();
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar historial');
    } finally {
      setLoading(false);
    }
  };

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
                    {servicio.cliente} • {servicio.dispositivo}
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
                  {Object.entries(estadosConEstilo).map(([key, { color, icon }]) => (
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

                {/*  VISTA PREVIA DE CÁMARA - SOLO CUANDO ESTÁ ACTIVA */}
                {camaraActiva && (
                  <div className="p-4 bg-gray-900 border-b border-gray-700">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 object-cover"
                      />
                      
                      {/* Controles de cámara superpuestos */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                        {/* Cambiar cámara (solo en móvil) */}
                        {isMobile && (
                          <button
                            onClick={cambiarCamara}
                            className="p-3 bg-gray-800/80 hover:bg-gray-700/80 rounded-full text-white transition-colors"
                            title="Cambiar cámara"
                          >
                            <Camera size={20} />
                          </button>
                        )}
                        
                        {/* Tomar foto */}
                        <button
                          onClick={tomarFoto}
                          className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors shadow-lg"
                          title="Tomar foto"
                        >
                          <CameraIcon size={24} />
                        </button>
                        
                        {/* Cerrar cámara */}
                        <button
                          onClick={detenerCamara}
                          className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                          title="Cerrar cámara"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                              <span className="text-blue-400">• {n.tecnico}</span>
                            </div>
                            <button
                              onClick={() => handleEliminarNota(n.id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Contenido optimizado */}
                          {n.tipo === 'texto' && (
                            <div className="text-gray-200 text-sm leading-relaxed">
                              {n.texto || <i className="text-gray-500">Sin mensaje</i>}
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
                              {n.texto && (
                                <div className="text-gray-200 text-sm leading-relaxed">{n.texto}</div>
                              )}
                              <audio controls src={n.audio} className="w-full h-8" />
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

                        {/*  BOTÓN CÁMARA MÓVIL PROTAGONISTA */}
                        <button
                          onClick={camaraActiva ? detenerCamara : iniciarCamara}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                            camaraActiva 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {camaraActiva ? <StopCircle size={14} /> : <CameraIcon size={14} />}
                          {camaraActiva ? 'Cerrar' : 'Cámara'}
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
             onClick={onClose}
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
     </div>
   </div>
 );
}
