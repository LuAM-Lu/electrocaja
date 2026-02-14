// components/ProductViewModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Package from 'lucide-react/dist/esm/icons/package'
import Hash from 'lucide-react/dist/esm/icons/hash'
import Barcode from 'lucide-react/dist/esm/icons/barcode'
import Printer from 'lucide-react/dist/esm/icons/printer'
import Eye from 'lucide-react/dist/esm/icons/eye'
import MapPin from 'lucide-react/dist/esm/icons/map-pin'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Tag from 'lucide-react/dist/esm/icons/tag'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Tags from 'lucide-react/dist/esm/icons/tags'
import Share2 from 'lucide-react/dist/esm/icons/share-2'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import Instagram from 'lucide-react/dist/esm/icons/instagram'
import Music from 'lucide-react/dist/esm/icons/music'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import toast from '../utils/toast.jsx';
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

  // 🎯 FUNCIÓN PARA DETERMINAR ESTADO DE STOCK
  const getStockStatus = () => {
    // ✅ SERVICIOS siempre muestran "Disponible" (no aplica stock)
    if (product?.tipo === 'servicio') {
      return {
        label: 'Disponible',
        bgColor: 'bg-green-500',
        textColor: 'text-white',
        icon: CheckCircle,
        pulse: true,
        gradient: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200'
      };
    }

    const stock = parseInt(product?.stock) || 0;
    const stockMinimo = parseInt(product?.stock_minimo) || 5;

    if (stock <= 0) {
      return {
        label: 'Agotado',
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        icon: XCircle,
        pulse: false,
        gradient: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200'
      };
    } else if (stock <= stockMinimo) {
      return {
        label: 'Stock Bajo',
        bgColor: 'bg-amber-500',
        textColor: 'text-white',
        icon: AlertTriangle,
        pulse: true,
        gradient: 'from-amber-50 to-yellow-50',
        borderColor: 'border-amber-200'
      };
    } else {
      return {
        label: 'Disponible',
        bgColor: 'bg-green-500',
        textColor: 'text-white',
        icon: CheckCircle,
        pulse: true,
        gradient: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200'
      };
    }
  };

  // 🎯 FUNCIÓN PARA CALCULAR TAMAÑO DE FUENTE ADAPTATIVO
  const getAdaptiveFontSize = (text, maxLength = 20) => {
    if (!text) return 'text-sm';
    const length = text.length;
    if (length > maxLength * 2) return 'text-[10px]';
    if (length > maxLength * 1.5) return 'text-xs';
    if (length > maxLength) return 'text-sm';
    return 'text-sm';
  };

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
  < !DOCTYPE html > <html><head><title>Código de Barras - ${product.descripcion}</title>
    <style>
      body {font - family: Arial, sans-serif; margin: 10px; text-align: center; font-size: 12px; }
      .barcode-container {border: 2px solid #000; padding: 15px; margin: 10px auto; width: 280px; }
      .product-name {font - size: 12px; font-weight: bold; margin-bottom: 10px; word-wrap: break-word; line-height: 1.2; }
      .barcode-visual {margin: 2mm 0; padding: 1mm; background: white; height: auto; display: flex; align-items: center; justify-content: center; border: 1px solid #000; }
      .barcode-text {font - family: 'Courier New', monospace; font-size: 10px; letter-spacing: 1px; margin: 5px 0; color: #333; }
      .price-bs {font - size: 18px; font-weight: bold; margin: 10px 0; color: #000; }
      .price-ref {font - size: 10px; color: #666; margin-top: 5px; }
      @media print {body {margin: 0; } .barcode-container {width: 260px; border: 1px solid #000; } .price-bs {font - size: 16px; } }
    </style></head><body>
      <div class="barcode-container">
        <div class="product-name">${product.descripcion.substring(0, 50)}</div>
        <div class="barcode-visual"><img src="${generateRealBarcode(product.codigo_barras)}" alt="Código de barras" style="max-width: 100%; height: auto;"></div>
        <div class="barcode-text">${product.codigo_barras}</div>
        <div class="price-bs">${precioBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</div>
        <div class="price-ref">REF. ${precioReferencia}</div>
      </div>
    </body></html>
`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = function () { printWindow.close(); }
    }, 800);
    toast.success('Enviando a impresora...');
  };

  const getIconoTipo = (tipo) => {
    switch (tipo) {
      case 'producto': return '';
      case 'servicio': return '';
      case 'electrobar': return '';
      default: return '';
    }
  };

  const getColorTipo = (tipo) => {
    switch (tipo) {
      case 'producto': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'servicio': return 'bg-green-50 text-green-700 border-green-200';
      case 'electrobar': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleWhatsAppShare = async (phoneNumber) => {
    try {
      setSharingLoading(true);
      const { base64 } = await captureModalScreenshot(modalRef, product.descripcion, product, tasaCambio);
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
      const { base64 } = await captureModalScreenshot(modalRef, product.descripcion, product, tasaCambio);
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
      const { blob } = await captureModalScreenshot(modalRef, product.descripcion, product, tasaCambio);
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
      const { blob } = await captureModalScreenshot(modalRef, product.descripcion, product, tasaCambio);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      {/* MODAL ajustado a altura de pantalla, con header/footer fijos y contenido scrolleable - RESPONSIVE */}
      <div ref={modalRef} className="bg-white rounded-lg sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-[96vh] sm:h-[92vh] flex flex-col overflow-hidden">

        {/* Header (fijo) - RESPONSIVE */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-white/20 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                <Eye className="h-5 w-5 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Mostrador de Precio</h2>
                <p className="text-xs sm:text-sm text-blue-100 hidden sm:block">Vista para cliente</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {product.codigo_barras && (
                <button
                  onClick={handlePrintBarcode}
                  className="bg-white/20 hover:bg-white/30 p-1.5 sm:p-2 rounded-lg transition-colors"
                  title="Imprimir código de barras"
                >
                  <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-1.5 sm:p-2 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido Principal (responsive y compacto) */}
        <div className="p-2 sm:p-6 lg:p-8 flex-1 overflow-y-auto lg:overflow-hidden">

          {/* 🎯 TÍTULO CENTRADO - ANCHO COMPLETO DE LAS 2 COLUMNAS */}
          <div className="w-full mb-4 sm:mb-6">
            <h1
              className="font-bold text-blue-700 text-center truncate leading-tight"
              style={{
                fontSize: product.descripcion?.length > 50 ? 'clamp(1rem, 3vw, 1.5rem)' :
                  product.descripcion?.length > 35 ? 'clamp(1.25rem, 3.5vw, 1.875rem)' :
                    product.descripcion?.length > 20 ? 'clamp(1.5rem, 4vw, 2.25rem)' :
                      'clamp(1.75rem, 4.5vw, 2.5rem)'
              }}
              title={product.descripcion}
            >
              {product.descripcion}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 lg:h-full">

            {/* Columna Izquierda - Imagen y Acciones */}
            <div className="flex flex-col gap-3 sm:gap-6 lg:overflow-y-auto lg:pr-2 lg:-mr-2">

              {/* Contenedor de Imagen con Badges Superpuestos - ASPECTO 1:1 */}
              <div className="relative aspect-square w-full max-w-[400px] mx-auto">
                {/* Imagen */}
                {product.imagen_url ? (
                  <img
                    src={getImageUrl(product.imagen_url)}
                    alt={product.descripcion}
                    className="w-full h-full object-contain bg-gray-50 rounded-lg sm:rounded-xl shadow-lg border border-blue-100"
                    onError={(e) => {
                      if (e.target) e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-5xl sm:text-7xl mb-2 sm:mb-4 block">{getIconoTipo(product.tipo)}</span>
                      <p className="text-sm sm:text-base text-gray-500">Sin imagen</p>
                    </div>
                  </div>
                )}

                {/* 🎯 BADGES FLOTANTES SUPERPUESTOS - DENTRO DEL CONTENEDOR */}
                <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                  {/* Badge Tipo */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold backdrop-blur-sm shadow-sm ${product.tipo === 'producto' ? 'bg-blue-500/90 text-white' : product.tipo === 'servicio' ? 'bg-emerald-500/90 text-white' : 'bg-orange-500/90 text-white'}`}>
                    <Package className="h-2.5 w-2.5" />
                    {product.tipo.charAt(0).toUpperCase() + product.tipo.slice(1)}
                  </span>

                  {/* Badge Categoría */}
                  {product.categoria && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-white/85 text-gray-700 backdrop-blur-sm shadow-sm">
                      <Tag className="h-2.5 w-2.5 text-gray-500" />
                      {product.categoria}
                    </span>
                  )}
                </div>
              </div>

              {/* Compartir */}
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-100">
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <button onClick={handleOpenWhatsApp} disabled={sharingLoading} className="flex-1 group flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 shadow-md">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </button>
                  <button onClick={handleInstagramShare} disabled={sharingLoading} className="flex-1 group flex items-center justify-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 shadow-md">
                    <Instagram className="h-4 w-4" />
                    <span className="text-sm font-medium">Instagram</span>
                  </button>
                  <button onClick={handleTikTokShare} disabled={sharingLoading} className="flex-1 group flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 shadow-md">
                    <Music className="h-4 w-4" />
                    <span className="text-sm font-medium">TikTok</span>
                  </button>
                </div>
                {sharingLoading && (
                  <div className="mt-3 flex items-center justify-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-xs font-medium">Generando imagen...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha - Información y Precios */}
            <div className="flex flex-col gap-3 sm:gap-6 lg:overflow-y-auto lg:pr-2 lg:-mr-2">

              {/* 🎯 SECCIÓN DE PRECIOS CON BADGE DINÁMICO POR STOCK */}
              {(() => {
                const stockStatus = getStockStatus();
                const StockIcon = stockStatus.icon;
                return (
                  <div className={`bg-gradient-to-r ${stockStatus.gradient} rounded-lg sm:rounded-2xl p-3 sm:p-6 border ${stockStatus.borderColor} relative`}>
                    {/* Badges de disponibilidad e IVA */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <div className={`${stockStatus.bgColor} ${stockStatus.textColor} px-2 sm:px-3 py-1 rounded-full text-xs font-medium shadow-md flex items-center space-x-1`}>
                        <StockIcon className={`w-3 h-3 ${stockStatus.pulse ? 'animate-pulse' : ''}`} />
                        <span>{stockStatus.label}</span>
                      </div>
                      <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
                        <span className="hidden sm:inline">Incluye IVA 16%</span>
                        <span className="sm:hidden">IVA 16%</span>
                      </div>
                    </div>

                    <h2 className="text-base sm:text-xl font-semibold text-green-800 mb-3 sm:mb-4 flex items-center space-x-2">
                      <Tags className="h-4 w-4 sm:h-6 sm:w-6" />
                      <span>Precio de Venta</span>
                    </h2>
                    <div className="text-center space-y-2 sm:space-y-3">
                      <div>
                        <div className="text-3xl sm:text-5xl lg:text-6xl font-bold text-green-700">
                          {precioVentaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-green-600 mt-1">Bolívares</div>
                      </div>
                    </div>
                    <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-green-600">
                      BCV: {tasaCambio.toFixed(2)} Bs/USD
                    </div>
                  </div>
                );
              })()}

              <div className={`grid ${(product.tipo === 'producto' || product.tipo === 'electrobar') ? 'grid-cols-2' : 'grid-cols-1'} gap-4 sm:gap-6`}>
                {/* 🎯 TARJETA STOCK - MEJOR ORGANIZADA EN 2 FILAS */}
                {(product.tipo === 'producto' || product.tipo === 'electrobar') && (
                  <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      <span className="text-sm sm:text-base font-semibold text-blue-900">Stock Disponible</span>
                    </div>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-blue-700">{product.stock || 0}</span>
                      <span className="text-sm sm:text-base text-blue-600 font-medium">unidades</span>
                    </div>
                    {product.stock <= (product.stock_minimo || 5) && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-amber-600 bg-amber-50/80 rounded py-1 px-2">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="text-[10px] sm:text-xs font-medium truncate">Stock bajo</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 🎯 CÓDIGOS CON FUENTE ADAPTATIVA E ÍCONO BARCODE */}
                <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                  <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2 sm:mb-3 flex items-center justify-center space-x-2">
                    <Barcode className="h-4 w-4 text-blue-600" />
                    <span>Códigos</span>
                  </h3>
                  <div className="space-y-2">
                    {product.codigo_interno && (
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-blue-600 text-xs sm:text-sm flex-shrink-0">Interno:</span>
                        <span className={`font-mono text-right break-all ${getAdaptiveFontSize(product.codigo_interno, 15)}`}>
                          {product.codigo_interno}
                        </span>
                      </div>
                    )}
                    {product.codigo_barras && (
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-blue-600 text-xs sm:text-sm flex-shrink-0">Barras:</span>
                        <span className={`font-mono text-right break-all ${getAdaptiveFontSize(product.codigo_barras, 15)}`}>
                          {product.codigo_barras}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 🎯 NOTAS CON TEXTO ADAPTATIVO */}
              {product.observaciones && (
                <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Notas</span>
                  </h3>
                  <p className={`text-blue-800 ${getAdaptiveFontSize(product.observaciones, 100)} leading-relaxed line-clamp-3`}>
                    {product.observaciones}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎯 FOOTER CON MISMO ESTILO DEL HEADER (gradiente azul) */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-blue-100 gap-2">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Actualizado: {new Date().toLocaleDateString('es-VE')}</span>
              </div>
              {product.ubicacion_fisica && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Ubicación: {product.ubicacion_fisica}</span>
                </div>
              )}
            </div>
            <div className="text-white font-medium">Electro Caja - Sistema de Inventario</div>
          </div>
        </div>
      </div>

      {/*  Modal de WhatsApp */}
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
