// components/ProductViewModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Package, Hash, Barcode, 
  Printer, Eye, MapPin, Calendar,
  Tag, AlertCircle, Tags, Share2,
  MessageCircle, Instagram, Music
} from 'lucide-react';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import { api, getImageUrl } from '../config/api';
import CompartirWhatsAppModal from './CompartirWhatsAppModal';
import { 
  captureModalScreenshot, 
  shareViaWhatsApp, 
  shareViaInstagram, 
  shareViaTikTok, 
  cleanProductName 
} from '../utils/shareUtils';

const ProductViewModal = ({ isOpen, onClose, product, tasaCambio, openedFrom, onReopenMenu }) => {
  const [showFullBarcode, setShowFullBarcode] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        if (openedFrom === 'floating' && onReopenMenu) {
          setTimeout(() => onReopenMenu(), 200);
        }
      }
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, openedFrom, onReopenMenu]);

  if (!isOpen || !product) return null;

  const precioVentaUSD = parseFloat(product.precio_venta || product.precio || 0);
  const precioVentaBs = precioVentaUSD * (tasaCambio || 1);
  const precioCostoUSD = parseFloat(product.precio_costo || 0);
  const precioCostoBs = precioCostoUSD * (tasaCambio || 1);

  const handlePrintBarcode = () => {
    if (!product.codigo_barras) {
      toast.error('El producto no tiene código de barras');
      return;
    }
    const precioBolivares = Math.round(precioVentaBs);
    const precioReferencia = precioVentaUSD.toFixed(2);

    const generateRealBarcode = (code) => {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, code, { format: "CODE128", width: 1, height: 40, displayValue: false, margin: 0, background: "#ffffff", lineColor: "#000000" });
      return canvas.toDataURL('image/png');
    };

    const printWindow = window.open('', '_blank', 'width=400,height=400');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Código de Barras - ${product.descripcion}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 10px; text-align: center; font-size: 12px; }
        .barcode-container { border: 2px solid #000; padding: 15px; margin: 10px auto; width: 280px; }
        .product-name { font-size: 12px; font-weight: bold; margin-bottom: 10px; word-wrap: break-word; line-height: 1.2; }
        .barcode-visual { margin: 2mm 0; padding: 1mm; background: white; height: auto; display: flex; align-items: center; justify-content: center; border: 1px solid #000; }
        .barcode-text { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 1px; margin: 5px 0; color: #333; }
        .price-bs { font-size: 18px; font-weight: bold; margin: 10px 0; color: #000; }
        .price-ref { font-size: 10px; color: #666; margin-top: 5px; }
        @media print { body { margin: 0; } .barcode-container { width: 260px; border: 1px solid #000; } .price-bs { font-size: 16px; } }
      </style></head><body>
        <div class="barcode-container">
          <div class="product-name">${product.descripcion.substring(0, 50)}</div>
          <div class="barcode-visual"><img src="${generateRealBarcode(product.codigo_barras)}" alt="Código de barras" style="max-width: 100%; height: auto;"></div>
          <div class="barcode-text">${product.codigo_barras}</div>
          <div class="price-bs">${precioBolivares.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})} Bs</div>
          <div class="price-ref">REF. ${precioReferencia}</div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = function() { printWindow.close(); }
    }, 800);
    toast.success('📄 Enviando a impresora...');
  };

  const getIconoTipo = (tipo) => {
    switch(tipo) {
      case 'producto': return '📱';
      case 'servicio': return '🔧';
      case 'electrobar': return '🍿';
      default: return '📦';
    }
  };

  const getColorTipo = (tipo) => {
    switch(tipo) {
      case 'producto': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'servicio': return 'bg-green-50 text-green-700 border-green-200';
      case 'electrobar': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleWhatsAppShare = async (phoneNumber) => {
    try {
      setSharingLoading(true);
      const { base64 } = await captureModalScreenshot(modalRef, product.descripcion, product);
      const precioFormateado = `${precioVentaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
      const success = await shareViaWhatsApp(base64, phoneNumber, product.descripcion, precioFormateado);
      if (success) {
        setShowWhatsAppModal(false);
        setPreviewImage(null);
      }
    } catch (error) {
      console.error('Error compartiendo por WhatsApp:', error);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    try {
      setSharingLoading(true);
      setShowWhatsAppModal(true);
      const { base64 } = await captureModalScreenshot(modalRef, product.descripcion, product);
      setPreviewImage(base64);
    } catch (error) {
      console.error('Error generando preview:', error);
      setPreviewImage(null);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleInstagramShare = async () => {
    try {
      setSharingLoading(true);
      const { blob } = await captureModalScreenshot(modalRef, product.descripcion);
      await shareViaInstagram(blob, product.descripcion);
    } catch (error) {
      console.error('Error compartiendo en Instagram:', error);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleTikTokShare = async () => {
    try {
      setSharingLoading(true);
      const { blob } = await captureModalScreenshot(modalRef, product.descripcion);
      await shareViaTikTok(blob, product.descripcion);
    } catch (error) {
      console.error('Error compartiendo en TikTok:', error);
    } finally {
      setSharingLoading(false);
    }
  };

  const BarcodeDisplay = ({ code }) => {
    const canvasRef = React.useRef(null);
    React.useEffect(() => {
      if (canvasRef.current && code) {
        JsBarcode(canvasRef.current, code, { format: "CODE128", width: 2, height: 50, displayValue: false, margin: 5, background: "#ffffff", lineColor: "#000000" });
      }
    }, [code]);
    return <canvas ref={canvasRef}></canvas>;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* MODAL ajustado a altura de pantalla, con header/footer fijos y contenido scrolleable */}
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header (fijo) */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Eye className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Mostrador de Precio</h2>
                <p className="text-blue-100">Vista para cliente</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {product.codigo_barras && (
                <button
                  onClick={handlePrintBarcode}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  title="Imprimir código de barras"
                >
                  <Printer className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido Principal (scrollea) */}
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Columna Izquierda - Imagen y Info Básica */}
            <div className="space-y-6">
              
              {/* Imagen del Producto (MÁS GRANDE) */}
              <div className="relative">
                {product.imagen_url ? (
                  <img 
                    src={getImageUrl(product.imagen_url)} 
                    alt={product.descripcion}
                    className="w-full h-[28rem] lg:h-[32rem] object-contain bg-gray-50 rounded-xl shadow-lg border border-blue-100"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="w-full h-[28rem] lg:h-[32rem] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-7xl mb-4 block">{getIconoTipo(product.tipo)}</span>
                      <p className="text-gray-500">Sin imagen</p>
                    </div>
                  </div>
                )}
                
                {/* Badge de Tipo */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getColorTipo(product.tipo)}`}>
                    {product.tipo === 'producto' ? 'Producto' : 
                     product.tipo === 'servicio' ? 'Servicio' : 
                     product.tipo === 'electrobar' ? 'Electrobar' : product.tipo}
                  </span>
                </div>
              </div>

              {/* 🚫 Se eliminó el CONTENEDOR del código de barras (imagen) */}
              {/* (Si quieres dejar solo números de códigos, se ven abajo en "Códigos") */}

              

              {/* Compartir */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={handleOpenWhatsApp}
                    disabled={sharingLoading}
                    className="group flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </button>
                  <button
                    onClick={handleInstagramShare}
                    disabled={sharingLoading}
                    className="group flex items-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-4 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    <Instagram className="h-4 w-4" />
                    <span className="text-sm font-medium">Instagram</span>
                  </button>
                  <button
                    onClick={handleTikTokShare}
                    disabled={sharingLoading}
                    className="group flex items-center space-x-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg px-4 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    <Music className="h-4 w-4" />
                    <span className="text-sm font-medium">TikTok</span>
                  </button>
                </div>

                {sharingLoading && (
                  <div className="mt-4 flex items-center justify-center space-x-2 text-purple-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-sm font-medium">Generando imagen...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha - Información y Precios */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.descripcion}</h1>
                {product.categoria && (
                  <p className="text-lg text-gray-600 flex items-center space-x-2">
                    <Tag className="h-4 w-4" />
                    <span>{product.categoria}</span>
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 relative">
                {product.activo !== false ? (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>Disponible</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span>No Disponible</span>
                    </div>
                  </div>
                )}
                <div className="absolute top-6 -right-2">
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
                    <span>Incluye IVA 16%</span>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center space-x-2">
                  <Tags className="h-6 w-6" />
                  <span>Precio de Venta</span>
                </h2>
                <div className="text-center space-y-3">
                  <div>
                    <div className="text-6xl font-bold text-green-700">
                      {precioVentaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-2xl font-bold text-green-600 mt-1">Bolívares</div>
                  </div>
                </div>
                <div className="text-center mt-4 text-sm text-green-600">
                  BCV: {tasaCambio.toFixed(2)} Bs/USD
                </div>
              </div>

              {(product.tipo === 'producto' || product.tipo === 'electrobar') && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Stock Disponible</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-blue-700">{product.stock || 0}</span>
                      <span className="text-blue-600">unidades</span>
                    </div>
                  </div>
                  {product.stock <= (product.stock_minimo || 5) && (
                    <div className="mt-2 flex items-center space-x-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Stock bajo</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Hash className="h-4 w-4" />
                    <span>Códigos</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    {product.codigo_interno && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código Interno:</span>
                        <span className="font-mono">{product.codigo_interno}</span>
                      </div>
                    )}
                    {product.codigo_barras && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código de Barras:</span>
                        <span className="font-mono">{product.codigo_barras}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notas Adicionales */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Notas Adicionales</span>
                </h3>
                {product.observaciones ? (
                  <p className="text-amber-800 text-sm">{product.observaciones}</p>
                ) : (
                  <p className="text-amber-600 text-sm italic">Sin notas adicionales</p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Footer (fijo visible) */}
        <div className="bg-gray-50 px-8 py-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Actualizado: {new Date().toLocaleDateString('es-VE')}</span>
              </div>
              {product.ubicacion_fisica && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Ubicación: {product.ubicacion_fisica}</span>
                </div>
              )}
            </div>
            <div className="text-blue-600 font-medium">Electro Caja - Sistema de Inventario</div>
          </div>
        </div>
      </div>

      {/* 📱 Modal de WhatsApp */}
      <CompartirWhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          setPreviewImage(null);
        }}
        onSend={handleWhatsAppShare}
        productName={product.descripcion}
        loading={sharingLoading}
        previewImage={previewImage}
      />
    </div>
  );
};

export default ProductViewModal;
