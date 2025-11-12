// components/servicios/wizard/PasoDispositivo.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Smartphone, Camera, X, Upload, User,
  AlertCircle, CheckCircle, CameraIcon, FolderOpen, ChevronDown, Calendar
} from 'lucide-react';
import toast from '../../../utils/toast.jsx';
import { useServiciosStore } from '../../../store/serviciosStore';

// Datos predefinidos para pills
const MARCAS_POPULARES = [
  'Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OPPO', 'Vivo',
  'OnePlus', 'Google', 'Sony', 'LG', 'Motorola', 'Nokia'
];

const ACCESORIOS_COMUNES = [
  'Cargador original', 'Cable USB', 'Funda/case', 'Auriculares',
  'Protector pantalla', 'Manual usuario', 'Caja original', 'Adaptador'
];

const PROBLEMAS_COMUNES = [
  'Pantalla quebrada', 'No enciende', 'Batería agotada', 'Problemas de carga',
  'Audio defectuoso', 'Cámara dañada', 'Botones no funcionan', 'WiFi no conecta',
  'Datos móviles', 'Sobrecalentamiento', 'Lento/congelado', 'Actualización fallida',
  'Touchscreen no responde', 'Altavoz sin sonido', 'Micrófono defectuoso'
];

export default function PasoDispositivo({ datos, onActualizar, errores, loading }) {
  // 🔧 Cargar técnicos desde el store
  const cargarTecnicos = useServiciosStore(state => state.cargarTecnicos);
  const tecnicos = useServiciosStore(state => state.tecnicos);

  // 🔧 Filtrar técnicos activos usando useMemo para evitar recalcular en cada render
  const tecnicosActivos = useMemo(() => {
    return tecnicos.filter(tecnico =>
      tecnico.tecnicoConfig && tecnico.tecnicoConfig.activo === true
    );
  }, [tecnicos]);
  const [mostrarOtroAccesorio, setMostrarOtroAccesorio] = useState(false);
  const [mostrarOtroProblema, setMostrarOtroProblema] = useState(false);
  const [otroAccesorio, setOtroAccesorio] = useState('');
  const [otroProblema, setOtroProblema] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [streamActual, setStreamActual] = useState(null);

  // 🔧 Cargar técnicos al montar el componente
  useEffect(() => {
    cargarTecnicos();
  }, []);

  // Cleanup: Stop camera stream on component unmount
  useEffect(() => {
    return () => {
      if (streamActual) {
        streamActual.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [streamActual]);

  // Actualizar dispositivo
  const actualizarDispositivo = (campo, valor) => {
    const nuevosDispositivo = { ...datos.dispositivo, [campo]: valor };
    onActualizar('dispositivo', nuevosDispositivo);
  };

  // Actualizar diagnóstico
  const actualizarDiagnostico = (campo, valor) => {
    const nuevosDiagnostico = { ...datos.diagnostico, [campo]: valor };
    onActualizar('diagnostico', nuevosDiagnostico);
  };

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

  // Manejar problemas múltiples (acumulables)
  const toggleProblema = (problema) => {
    const problemasActuales = Array.isArray(datos.dispositivo.problemas)
      ? datos.dispositivo.problemas
      : datos.dispositivo.problema
        ? [datos.dispositivo.problema]
        : [];

    const nuevosProblemas = problemasActuales.includes(problema)
      ? problemasActuales.filter(p => p !== problema)
      : [...problemasActuales, problema];

    // Actualizar ambos campos en una sola operación
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

      const nuevosProblemas = [...problemasActuales, otroProblema.trim()];

      // Actualizar ambos campos en una sola operación
      const nuevosDispositivo = {
        ...datos.dispositivo,
        problemas: nuevosProblemas,
        problema: nuevosProblemas.join(', ')
      };
      onActualizar('dispositivo', nuevosDispositivo);

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

    // Actualizar ambos campos en una sola operación
    const nuevosDispositivo = {
      ...datos.dispositivo,
      problemas: nuevosProblemas,
      problema: nuevosProblemas.join(', ')
    };
    onActualizar('dispositivo', nuevosDispositivo);

    toast.success('Problema eliminado');
  };

  // Iniciar cámara
  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Cámara trasera en móviles
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

  // Detener cámara
  const detenerCamara = () => {
    if (streamActual) {
      streamActual.getTracks().forEach(track => track.stop());
      setStreamActual(null);
    }
    setCamaraActiva(false);
  };

  // Tomar foto
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

  // Manejar archivos seleccionados
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

  // Comprimir imagen
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

  // Obtener problemas actuales para mostrar
  const problemasActuales = Array.isArray(datos.dispositivo.problemas) 
    ? datos.dispositivo.problemas 
    : datos.dispositivo.problema 
      ? [datos.dispositivo.problema] 
      : [];

  return (
    <div className="max-w-6xl mx-auto space-y-4">

      {/* FILA 1 Y 2: LAYOUT DE 2 COLUMNAS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-4">
          
        {/* IDENTIFICACIÓN DEL EQUIPO - COMPACTO */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-400" />
              Identificación del Equipo
            </h3>

            <div className="space-y-2.5">
              {/* Marca */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Marca *
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {MARCAS_POPULARES.map(marca => (
                    <button
                      key={marca}
                      onClick={() => actualizarDispositivo('marca', marca)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                        datos.dispositivo.marca === marca
                          ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {datos.dispositivo.marca === marca && ' '}
                      {marca}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={datos.dispositivo.marca}
                  onChange={(e) => actualizarDispositivo('marca', e.target.value)}
                  placeholder="O escribe otra marca..."
                  className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errores.marca && <p className="text-red-400 text-xs mt-1"> {errores.marca}</p>}
              </div>

              {/* Modelo y Color en la misma fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* Modelo */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Modelo específico *
                  </label>
                  <input
                    type="text"
                    value={datos.dispositivo.modelo}
                    onChange={(e) => actualizarDispositivo('modelo', e.target.value)}
                    placeholder="Ej: iPhone 16 Pro Max..."
                    className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errores.modelo && <p className="text-red-400 text-xs mt-1"> {errores.modelo}</p>}
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Color/Características
                  </label>
                  <input
                    type="text"
                    value={datos.dispositivo.color}
                    onChange={(e) => actualizarDispositivo('color', e.target.value)}
                    placeholder="Ej: Negro, 256GB..."
                    className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* IMEI/Serial */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  IMEI / Número de Serie *
                </label>
                <input
                  type="text"
                  value={datos.dispositivo.imei}
                  onChange={(e) => actualizarDispositivo('imei', e.target.value)}
                  placeholder="Marca *#06# para ver IMEI..."
                  className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errores.imei && <p className="text-red-400 text-xs mt-1"> {errores.imei}</p>}
              </div>
            </div>
          </div>

          {/* ACCESORIOS INCLUIDOS - COMPACTOS */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-semibold text-gray-100 mb-2.5 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              Accesorios Incluidos (Opcional)
            </h3>

            <div className="flex flex-wrap gap-1 mb-2">
              {ACCESORIOS_COMUNES.map(accesorio => (
                <button
                  key={accesorio}
                  onClick={() => toggleAccesorio(accesorio)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    (datos.dispositivo.accesorios || []).includes(accesorio)
                      ? 'bg-green-600 text-white shadow-md ring-1 ring-green-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {(datos.dispositivo.accesorios || []).includes(accesorio) && ' '}
                  {accesorio}
                </button>
              ))}
              
              <button
                onClick={() => setMostrarOtroAccesorio(true)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                + Otro
              </button>
            </div>

            {mostrarOtroAccesorio && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={otroAccesorio}
                  onChange={(e) => setOtroAccesorio(e.target.value)}
                  placeholder="Otro accesorio..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && agregarOtroAccesorio()}
                />
                <button
                  onClick={agregarOtroAccesorio}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Agregar
                </button>
                <button
                  onClick={() => setMostrarOtroAccesorio(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {(datos.dispositivo.accesorios || []).length > 0 && (
              <div className="text-sm text-gray-400">
                 {datos.dispositivo.accesorios.length} accesorio(s) seleccionado(s)
              </div>
            )}
          </div>

          {/* FECHA ESTIMADA DE ENTREGA */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-semibold text-gray-100 mb-2.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Fecha Estimada de Entrega
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                ¿Cuándo estará listo? *
              </label>
              <input
                type="date"
                value={datos.diagnostico.fechaEstimada || ''}
                onChange={(e) => actualizarDiagnostico('fechaEstimada', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errores.fechaEstimada && <p className="text-red-400 text-xs mt-1"> {errores.fechaEstimada}</p>}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-4">

          {/* PROBLEMA REPORTADO + TÉCNICO */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Problema Reportado
            </h3>

            <div className="space-y-2.5">
              {/* Pills de problemas comunes - ACUMULABLES Y COMPACTOS */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Selecciona uno o más problemas *
                </label>
                <div className="flex flex-wrap gap-1">
                  {PROBLEMAS_COMUNES.map(problema => (
                    <button
                      key={problema}
                      onClick={() => toggleProblema(problema)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                        problemasActuales.includes(problema)
                          ? 'bg-red-600 text-white shadow-md ring-1 ring-red-400'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {problemasActuales.includes(problema) && ' '}
                      {problema}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setMostrarOtroProblema(true)}
                    className="px-2 py-1 rounded-md text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    + Otro
                  </button>
                </div>
              </div>

              {/* Mostrar problemas seleccionados */}
              {problemasActuales.length > 0 && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                  <div className="text-red-300 text-sm font-medium mb-2">
                    Problemas seleccionados ({problemasActuales.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {problemasActuales.map((problema, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-700/50 text-red-100 rounded text-xs"
                      >
                        {problema}
                        <button
                          onClick={() => eliminarProblema(problema)}
                          className="text-red-300 hover:text-white ml-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mostrarOtroProblema && (
                <div className="space-y-2">
                  <textarea
                    value={otroProblema}
                    onChange={(e) => setOtroProblema(e.target.value)}
                    placeholder="Describe el problema específico..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={agregarOtroProblema}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                    >
                      Agregar Problema
                    </button>
                    <button
                      onClick={() => setMostrarOtroProblema(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {errores.problema && <p className="text-red-400 text-xs"> {errores.problema}</p>}

              {/* Técnico asignado - PILLS */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Técnico asignado *
                </label>
                {tecnicosActivos && tecnicosActivos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tecnicosActivos.map(tecnico => {
                      // ✅ Extraer nombre del técnico actual si es un objeto
                      const tecnicoActualNombre = (() => {
                        const t = datos.diagnostico.tecnico;
                        if (t && typeof t === 'object') {
                          return t.nombre || t.email || '';
                        }
                        return t || '';
                      })();
                      
                      const estaSeleccionado = tecnicoActualNombre === tecnico.nombre;
                      
                      return (
                        <button
                          key={tecnico.id}
                          type="button"
                          onClick={() => {
                            // Toggle: si ya está seleccionado, deseleccionar
                            if (estaSeleccionado) {
                              // Actualizar ambos campos a la vez
                              const nuevosDiagnostico = {
                                ...datos.diagnostico,
                                tecnico: '',
                                tecnicoId: null
                              };
                              onActualizar('diagnostico', nuevosDiagnostico);
                            } else {
                              // Actualizar ambos campos a la vez
                              const nuevosDiagnostico = {
                                ...datos.diagnostico,
                                tecnico: tecnico.nombre,
                                tecnicoId: tecnico.id
                              };
                              onActualizar('diagnostico', nuevosDiagnostico);
                            }
                          }}
                          className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                            estaSeleccionado
                              ? 'bg-yellow-600 text-white shadow-md ring-1 ring-yellow-400'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          }`}
                        >
                          {estaSeleccionado && '✓ '}
                          {tecnico.nombre}
                          {tecnico.tecnicoConfig?.especialidad && (
                            <span className="text-[10px] opacity-75 ml-1">
                              ({tecnico.tecnicoConfig.especialidad})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs">
                      No hay técnicos activos configurados.
                      <br />
                      <span className="text-gray-500">Configúralos en Configuración → Servicios Técnicos</span>
                    </p>
                  </div>
                )}
                {errores.tecnico && <p className="text-red-400 text-xs mt-1"> {errores.tecnico}</p>}
              </div>

              {/* Observaciones adicionales - COMPACTO */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Observaciones adicionales
                </label>
                <textarea
                  value={datos.diagnostico.observaciones}
                  onChange={(e) => actualizarDiagnostico('observaciones', e.target.value)}
                  placeholder="Detalles adicionales del problema, síntomas..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* EVIDENCIA VISUAL - BOTONES COMPACTOS */}
          <div className="bg-gray-800/70 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-semibold text-gray-100 mb-2.5 flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-400" />
              Evidencia Visual (Opcional)
            </h3>

            <div className="space-y-2.5">
              {/* Controles de cámara y archivo - COMPACTOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={camaraActiva ? tomarFoto : iniciarCamara}
                  className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-purple-600 hover:border-purple-500 rounded-lg text-purple-400 hover:text-purple-300 transition-colors text-sm"
                >
                  <CameraIcon className="h-4 w-4" />
                  <span>{camaraActiva ? 'Tomar Foto' : 'Usar Cámara'}</span>
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-lg text-gray-400 hover:text-purple-400 transition-colors text-sm"
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
              />

              {/* Vista previa de cámara */}
              {camaraActiva && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover rounded-lg border border-gray-600"
                  />
                  <button
                    onClick={detenerCamara}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {/* Grid de evidencias */}
              {(datos.dispositivo.evidencias || []).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {datos.dispositivo.evidencias.map(evidencia => (
                    <div key={evidencia.id} className="relative group">
                      <img
                        src={evidencia.file}
                        alt={evidencia.name}
                        className="w-full h-32 object-cover rounded-lg border border-gray-600"
                      />
                      <button
                        onClick={() => eliminarEvidencia(evidencia.id)}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                        {evidencia.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}