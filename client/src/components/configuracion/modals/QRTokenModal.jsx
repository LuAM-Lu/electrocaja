// components/configuracion/modals/QRTokenModal.jsx
// 📱 Modal para visualizar e imprimir QR del token de acceso rápido

import React, { useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Printer from 'lucide-react/dist/esm/icons/printer'
import QrCode from 'lucide-react/dist/esm/icons/qr-code'
import Download from 'lucide-react/dist/esm/icons/download'
import User from 'lucide-react/dist/esm/icons/user'
import { QRCodeSVG } from 'qrcode.react';
import { formatearToken } from '../../../utils/tokenGenerator';
import toast from '../../../utils/toast.jsx';

const QRTokenModal = ({ isOpen, onClose, usuario }) => {
  const qrRef = useRef(null);

  if (!isOpen || !usuario) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const qrSvg = qrRef.current?.querySelector('svg');

    if (!qrSvg) {
      toast.error('Error al generar código QR');
      return;
    }

    // Convertir SVG a Data URL
    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const qrDataUrl = URL.createObjectURL(svgBlob);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Token - ${usuario.nombre}</title>
          <style>
            @media print {
              @page { margin: 1cm; size: A6 portrait; }
              body { margin: 0; }
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: white;
            }

            .card {
              width: 10cm;
              padding: 1.5cm;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              text-align: center;
              background: white;
            }

            .header {
              margin-bottom: 1cm;
              padding-bottom: 0.5cm;
              border-bottom: 2px solid #e5e7eb;
            }

            .header h1 {
              margin: 0;
              font-size: 18pt;
              color: #1f2937;
              font-weight: 700;
            }

            .header p {
              margin: 0.3cm 0 0 0;
              font-size: 11pt;
              color: #6b7280;
            }

            .qr-container {
              margin: 1cm 0;
              display: flex;
              justify-content: center;
            }

            .qr-container img {
              width: 5cm;
              height: 5cm;
            }

            .token {
              font-size: 24pt;
              font-weight: 700;
              color: #059669;
              letter-spacing: 3px;
              margin: 0.8cm 0;
            }

            .info {
              margin-top: 1cm;
              padding-top: 0.5cm;
              border-top: 2px solid #e5e7eb;
            }

            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 0.3cm 0;
              font-size: 10pt;
            }

            .info-label {
              color: #6b7280;
              font-weight: 600;
            }

            .info-value {
              color: #1f2937;
              font-weight: 500;
            }

            .rol-badge {
              display: inline-block;
              padding: 0.2cm 0.4cm;
              background: #dcfce7;
              color: #166534;
              border-radius: 6px;
              font-size: 9pt;
              font-weight: 700;
              text-transform: uppercase;
            }

            .footer {
              margin-top: 1cm;
              padding-top: 0.5cm;
              border-top: 1px dashed #d1d5db;
              font-size: 8pt;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>🔐 ElectroCaja</h1>
              <p>Token de Acceso Rápido</p>
            </div>

            <div class="qr-container">
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>

            <div class="token">${formatearToken(usuario.quickAccessToken)}</div>

            <div class="info">
              <div class="info-row">
                <span class="info-label">Usuario:</span>
                <span class="info-value">${usuario.nombre}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${usuario.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Rol:</span>
                <span class="rol-badge">${usuario.rol}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Sucursal:</span>
                <span class="info-value">${usuario.sucursal}</span>
              </div>
            </div>

            <div class="footer">
              <p>Generado: ${new Date().toLocaleString('es-VE')}</p>
              <p>⚠️ No compartir este código con terceros</p>
            </div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };

            window.onafterprint = () => {
              window.close();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleDownload = () => {
    const qrSvg = qrRef.current?.querySelector('svg');
    if (!qrSvg) return;

    // Convertir SVG a PNG usando canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const img = new Image();

    canvas.width = 300;
    canvas.height = 300;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `QR_${usuario.quickAccessToken}_${usuario.nombre.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Código QR de Acceso</h2>
                <p className="text-sm text-green-100">Token de acceso rápido</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">

          {/* Info del usuario */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{usuario.nombre}</div>
                <div className="text-sm text-gray-600">{usuario.email}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Rol:</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                {usuario.rol.toUpperCase()}
              </span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-4">
            <div ref={qrRef} className="bg-white p-6 rounded-2xl border-4 border-green-500 shadow-lg">
              <QRCodeSVG
                value={usuario.quickAccessToken || 'NO_TOKEN'}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Token */}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Token de Acceso</div>
              <div className="text-3xl font-bold text-green-600 tracking-wider">
                {formatearToken(usuario.quickAccessToken)}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Escanea el código o ingresa el token manualmente
              </div>
            </div>
          </div>

          {/* Advertencia */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="text-amber-600 mt-0.5">⚠️</div>
              <div className="text-xs text-amber-800">
                <div className="font-semibold mb-1">Importante:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>No compartir este código con terceros</li>
                  <li>Guardar en un lugar seguro</li>
                  <li>Si se pierde, contactar al administrador</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Descargar</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRTokenModal;
