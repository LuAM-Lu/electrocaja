// components/venta/DescuentoAdminModal.jsx - Modal de Descuentos con Validación Admin
import React, { useState, useEffect, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Percent from 'lucide-react/dist/esm/icons/percent'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Banknote from 'lucide-react/dist/esm/icons/banknote'
import Star from 'lucide-react/dist/esm/icons/star'
import Heart from 'lucide-react/dist/esm/icons/heart'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import { useAuthStore } from '../../store/authStore';
import toast from '../../utils/toast.jsx';

const formatearVenezolano = (numero) => {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
};

const DescuentoAdminModal = ({
  isOpen,
  onClose,
  totalVenta,
  tasaCambio,
  onDescuentoAprobado,
  onModalActivity // Callback para notificar actividad al padre
}) => {
  const { usuario } = useAuthStore();
  const [tipoDescuento, setTipoDescuento] = useState('porcentaje');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('bs');
  const [motivo, setMotivo] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsAdminValidation, setNeedsAdminValidation] = useState(true);
  const [isQRValidated, setIsQRValidated] = useState(false);
  const activityTimerRef = useRef(null);

  // Notificar actividad al componente padre (prevenir AFK)
  const notificarActividad = () => {
    if (onModalActivity) {
      onModalActivity();
    }
  };

  // Monitorear actividad del usuario en el modal
  useEffect(() => {
    if (!isOpen) return;

    const resetActivityTimer = () => {
      notificarActividad();

      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }

      // Notificar cada 30 segundos mientras el modal esté activo
      activityTimerRef.current = setTimeout(() => {
        notificarActividad();
      }, 30000);
    };

    resetActivityTimer();

    return () => {
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
    };
  }, [isOpen, onModalActivity]);

  // Verificar si es admin al abrir y limpiar al cerrar
  useEffect(() => {
    if (isOpen && usuario?.rol === 'admin') {
      setNeedsAdminValidation(false);
      setIsQRValidated(true);
    } else if (isOpen) {
      setNeedsAdminValidation(true);
      setIsQRValidated(false);
    } else if (!isOpen) {
      // Limpiar estados al cerrar
      resetForm();
    }
  }, [isOpen, usuario]);

  const resetForm = () => {
    setTipoDescuento('porcentaje');
    setMonto('');
    setMoneda('bs');
    setMotivo('');
    setAdminCode('');
    setLoading(false);
    setIsQRValidated(false);
    if (usuario?.rol !== 'admin') {
      setNeedsAdminValidation(true);
    }
  };

  const handleValidateQR = async () => {
    if (!adminCode.trim()) {
      toast.error('Código QR requerido');
      return;
    }

    setLoading(true);
    notificarActividad(); // Notificar actividad durante validación

    try {
      const response = await fetch('/api/users/login-by-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminCode.trim() })
      });

      const data = await response.json();

      if (!data.success || data.data.user.rol !== 'admin') {
        toast.error('Código de admin inválido');
        setLoading(false);
        return;
      }

      setIsQRValidated(true);
      setNeedsAdminValidation(false);
      toast.success('Código validado - Puede aplicar descuento');
    } catch (error) {
      toast.error('Error validando código de admin');
    } finally {
      setLoading(false);
      notificarActividad();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    notificarActividad(); // Notificar actividad al enviar

    const montoDescuento = parseFloat(monto) || 0;
    if (montoDescuento <= 0) {
      toast.error('El descuento debe ser mayor a 0');
      return;
    }

    // Validar límites según tipo
    if (tipoDescuento === 'porcentaje' && montoDescuento > 70) {
      toast.error('El porcentaje máximo permitido es 70%');
      return;
    }

    // Calcular monto final en Bs
    let montoEnBs;
    if (tipoDescuento === 'porcentaje') {
      montoEnBs = (totalVenta * montoDescuento) / 100;
    } else {
      montoEnBs = moneda === 'bs' ? montoDescuento : montoDescuento * tasaCambio;
    }

    if (montoEnBs >= totalVenta) {
      toast.error('El descuento no puede ser mayor o igual al total de la venta');
      return;
    }

    if (!motivo.trim()) {
      toast.error('El motivo del descuento es obligatorio');
      return;
    }

    // Validar admin si es necesario (doble verificación)
    if (needsAdminValidation) {
      setLoading(true);
      try {
        const response = await fetch('/api/users/login-by-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: adminCode.trim() })
        });

        const data = await response.json();

        if (!data.success || data.data.user.rol !== 'admin') {
          toast.error('Código de admin inválido');
          setLoading(false);
          return;
        }
      } catch (error) {
        toast.error('Error validando código de admin');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    onDescuentoAprobado(montoEnBs, motivo.trim());
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4"
      onMouseMove={notificarActividad}
      onClick={notificarActividad}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => {
          e.stopPropagation();
          notificarActividad();
        }}
      >

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Percent className="h-5 w-5" />
              <h3 className="text-lg font-bold">Aplicar Descuento</h3>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* QR de Admin - Solo si no está validado */}
          {needsAdminValidation && !isQRValidated && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Autorización requerida:</strong> Escanee o ingrese el código QR de administrador para continuar.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código QR de Administrador *
                </label>
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => {
                    setAdminCode(e.target.value);
                    notificarActividad();
                  }}
                  onKeyDown={(e) => {
                    notificarActividad();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!loading && adminCode.trim()) {
                        handleValidateQR();
                      }
                    }
                  }}
                  placeholder="Escanee o ingrese el código QR..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleValidateQR}
                  disabled={loading || !adminCode.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Validando...</span>
                    </>
                  ) : (
                    <span>Validar Código</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Formulario de Descuento - Solo después de validación */}
          {isQRValidated && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              onClick={(e) => {
                e.stopPropagation();
                notificarActividad();
              }}
            >
              {/* Tipo de Descuento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Descuento
                </label>
                <select
                  value={tipoDescuento}
                  onChange={(e) => {
                    setTipoDescuento(e.target.value);
                    setMonto('');
                    notificarActividad();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto">Monto Fijo</option>
                </select>
              </div>

              {/* Monto/Porcentaje y Moneda */}
              <div className={tipoDescuento === 'porcentaje' ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tipoDescuento === 'porcentaje' ? 'Porcentaje' : 'Monto'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={tipoDescuento === 'porcentaje' ? '1' : '0.01'}
                      max={tipoDescuento === 'porcentaje' ? '70' : undefined}
                      min="0"
                      value={monto}
                      onChange={(e) => {
                        setMonto(e.target.value);
                        notificarActividad();
                      }}
                      placeholder={tipoDescuento === 'porcentaje' ? '0' : '0.00'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                    {tipoDescuento === 'porcentaje' && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    )}
                  </div>
                </div>

                {tipoDescuento !== 'porcentaje' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => {
                        setMoneda(e.target.value);
                        notificarActividad();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="bs">Bolívares (Bs)</option>
                      <option value="usd">Dólares ($)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Botones Rápidos de Porcentaje */}
              {tipoDescuento === 'porcentaje' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <label className="block text-xs font-medium text-purple-700 mb-2">
                    Porcentajes Rápidos:
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { valor: 25, etiqueta: '75% Margen', descripcion: 'Desc. Leve' },
                      { valor: 50, etiqueta: '50% Margen', descripcion: 'Desc. Medio' },
                      { valor: 70, etiqueta: '30% Margen', descripcion: 'Efectivo' }
                    ].map(boton => (
                      <button
                        key={boton.valor}
                        type="button"
                        onClick={() => {
                          setMonto(boton.valor.toString());
                          notificarActividad();
                        }}
                        className={`flex-1 px-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                          monto === boton.valor.toString()
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold">{boton.etiqueta}</div>
                          <div className="text-xs opacity-75">{boton.descripcion}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del descuento *
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    notificarActividad();
                  }}
                  placeholder="Ej: Cliente frecuente, promoción especial..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  rows="2"
                  required
                />

                {/* Botones Rápidos de Motivo */}
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Motivos Frecuentes:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icono: Banknote, texto: 'Pago Rápido', color: 'text-green-600' },
                      { icono: Star, texto: 'Cliente Especial', color: 'text-yellow-600' },
                      { icono: Heart, texto: 'Cliente Leal', color: 'text-red-600' }
                    ].map((motivoRapido, index) => {
                      const IconoComponente = motivoRapido.icono;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setMotivo(motivoRapido.texto);
                            notificarActividad();
                          }}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg text-center transition-colors flex items-center justify-center space-x-2 ${
                            motivo === motivoRapido.texto
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50 hover:border-purple-300'
                          }`}
                        >
                          <IconoComponente className={`h-4 w-4 ${
                            motivo === motivoRapido.texto ? 'text-white' : motivoRapido.color
                          }`} />
                          <span>{motivoRapido.texto}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Botón para limpiar motivo */}
                  {motivo && (
                    <button
                      type="button"
                      onClick={() => {
                        setMotivo('');
                        notificarActividad();
                      }}
                      className="mt-2 w-full px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Limpiar y escribir personalizado</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Vista Previa */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">
                  Vista Previa del Descuento
                </h4>
                <div className="space-y-1 text-sm text-purple-700">
                  <div className="flex justify-between">
                    <span>Total venta:</span>
                    <span className="font-medium">{formatearVenezolano(totalVenta)} Bs</span>
                  </div>
                  {monto && parseFloat(monto) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Descuento:</span>
                        <span className="font-medium text-purple-800">
                          {tipoDescuento === 'porcentaje'
                            ? `${parseFloat(monto)}% = ${formatearVenezolano((totalVenta * parseFloat(monto)) / 100)} Bs`
                            : `${formatearVenezolano(moneda === 'bs' ? parseFloat(monto) : parseFloat(monto) * tasaCambio)} Bs`
                          }
                        </span>
                      </div>
                      <hr className="border-purple-300" />
                      <div className="flex justify-between font-bold">
                        <span>Total final:</span>
                        <span className="text-purple-900">
                          {formatearVenezolano(
                            totalVenta - (tipoDescuento === 'porcentaje'
                              ? (totalVenta * parseFloat(monto)) / 100
                              : (moneda === 'bs' ? parseFloat(monto) : parseFloat(monto) * tasaCambio)
                            )
                          )} Bs
                        </span>
                      </div>
                    </>
                  )}
                  {(!monto || parseFloat(monto) === 0) && (
                    <p className="text-purple-600 italic text-center py-2">
                      Ingresa un {tipoDescuento === 'porcentaje' ? 'porcentaje' : 'monto'} para ver la vista previa
                    </p>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Aplicar Descuento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DescuentoAdminModal;
