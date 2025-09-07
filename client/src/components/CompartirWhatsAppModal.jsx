// src/components/CompartirWhatsAppModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Phone, Send, MessageCircle, Sparkles, Image as ImageIcon, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'ultimoNumeroWhatsApp';

const CompartirWhatsAppModal = ({
  isOpen,
  onClose,
  onSend,
  productName,
  loading = false,
  previewImage = null,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [lastNumber, setLastNumber] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setErrors({});
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setLastNumber(stored || null);
      } catch {
        setLastNumber(null);
      }
    }
  }, [isOpen]);

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const venezuelanMobile = /^(\+?58)?(0?4(14|24|12|16|26))\d{7}$/;
    const internationalFormat = /^(\+?58)(4(14|24|12|16|26))\d{7}$/;
    return venezuelanMobile.test(cleanPhone) || internationalFormat.test(cleanPhone);
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 0 && !cleaned.startsWith('58') && !cleaned.startsWith('0')) return '+58' + cleaned;
    if (cleaned.startsWith('0')) return '+58' + cleaned.substring(1);
    if (cleaned.startsWith('58')) return '+' + cleaned;
    return value;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    if (errors.phone) setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return setErrors({ phone: 'El número de teléfono es requerido' });
    if (!validatePhone(phoneNumber)) return setErrors({ phone: 'Formato inválido' });

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    let finalNumber = cleanNumber;
    if (cleanNumber.startsWith('0')) finalNumber = '58' + cleanNumber.substring(1);
    else if (!cleanNumber.startsWith('58')) finalNumber = '58' + cleanNumber;
    const finalWithPlus = '+' + finalNumber;

    try {
      localStorage.setItem(STORAGE_KEY, finalWithPlus);
      setLastNumber(finalWithPlus);
    } catch {}

    onSend(finalWithPlus);
  };

  const handleClose = () => {
    setPhoneNumber('');
    setErrors({});
    onClose();
  };

  const clearLastNumber = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLastNumber(null);
      toast.success('Último número borrado');
    } catch {
      toast.error('No se pudo borrar el número');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] p-3 sm:p-4 flex items-center justify-center">
      <div className="w-full max-w-xl h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-[0_25px_80px_-20px_rgba(0,0,0,0.55)]">
        <div className="bg-gradient-to-br from-emerald-500/60 via-green-500/50 to-teal-400/60 p-[1.5px] rounded-2xl h-full">
          <div className="bg-white rounded-[calc(theme(borderRadius.2xl)-2px)] h-full flex flex-col overflow-hidden">
            
            {/* HEADER */}
            <div className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-lg ring-1 ring-white/30">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="leading-none">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold tracking-wide">Compartir por WhatsApp</h3>
                    </div>
                    <p className="text-emerald-100/90 text-xs">Imagen del producto</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors ring-1 ring-white/30"
                  disabled={loading}
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* CONTENIDO */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              

              <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Número de WhatsApp *</label>
                <span className="text-xs text-gray-500">+584141234567</span>
              </div>

              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

                {lastNumber && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {/* Botón Último Número */}
                    <button
                      type="button"
                      onClick={() => setPhoneNumber(lastNumber)}
                      className="text-xs px-2 py-0.5 rounded-full bg-green-50 hover:bg-green-100 text-green font-medium shadow hover:scale-105 hover:shadow-lg transition-transform animate-pulse"
                    >
                      Último Número
                    </button>

                    {/* Botón Limpiar (pill rojo con animación) */}
                    <button
                      type="button"
                      onClick={() => setPhoneNumber('')}
                      className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow hover:scale-105 hover:shadow-lg transition-transform animate-pulse"
                    >
                      Limpiar
                    </button>
                  </div>
                )}

                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="+584141234567"
                  className={`w-full pl-10 pr-40 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/80 hover:bg-white text-base ${
                    errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  disabled={loading}
                />
              </div>

              {errors.phone && (
                <p className="text-red-600 text-xs mt-1">{errors.phone}</p>
              )}
            </div>


              <div className="relative w-[100%] mx-auto">
                <div className="relative h-[100%] rounded-2xl overflow-hidden bg-white shadow ring-1 ring-emerald-100">
                  <img
                    src={previewImage}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>


            </form>

            {/* FOOTER */}
            <div className="px-6 py-4 bg-white border-t">
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !phoneNumber.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Enviar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CompartirWhatsAppModal;
