// services/pdfCierreService.js - OPTIMIZADO PARA CARTA HORIZONTAL 📄
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PDFCierreService {
  
  // 🎨 GENERAR HTML OPTIMIZADO PARA CARTA HORIZONTAL
  static generarHTMLCierre(datosCompletos) {
    const {
      caja,
      transacciones,
      usuario,
      diferencias,
      observaciones,
      evidenciaFotografica,
      fechaGeneracion
    } = datosCompletos;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: 'Segoe UI', Tahoma, sans-serif;
                font-size: 9px;
                line-height: 1.2;
                color: #333;
                background: white;
            }
            
            .container {
                max-width: 100%;
                margin: 0;
                padding: 10px;
            }
            
            /* 🎯 HEADER HORIZONTAL COMPACTO */
            .header {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                padding: 8px 15px;
                border-radius: 5px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .header-left h1 {
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 2px;
            }
            
            .header-left .subtitle {
                font-size: 8px;
                opacity: 0.9;
            }
            
            .header-right {
                text-align: right;
                font-size: 8px;
            }
            
            /* 📊 INFO HORIZONTAL EN DOS COLUMNAS */
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .info-card {
                background: #f8fafc;
                padding: 6px 10px;
                border-radius: 4px;
                border-left: 2px solid #3b82f6;
                font-size: 8px;
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
            }
            
            .info-label {
                font-weight: 500;
                color: #475569;
            }
            
            .info-value {
                font-weight: 600;
                color: #1e40af;
            }
            
            /* 💰 RESUMEN FINANCIERO HORIZONTAL */
            .financial-summary {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 8px 15px;
                border-radius: 5px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .financial-title {
                font-size: 11px;
                font-weight: 600;
            }
            
            .financial-grid {
                display: flex;
                gap: 20px;
                font-size: 8px;
            }
            
            .financial-item {
                text-align: center;
            }
            
            .financial-item h4 {
                font-size: 7px;
                margin-bottom: 2px;
                opacity: 0.9;
            }
            
            .financial-item .amount {
                font-size: 9px;
                font-weight: 700;
            }
            
            /* 📋 TRANSACCIONES EN TABLA HORIZONTAL */
            .transactions-section h2 {
                color: #1e40af;
                font-size: 10px;
                font-weight: 600;
                margin-bottom: 6px;
                text-align: center;
            }
            
            .transactions-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 7px;
                margin-bottom: 8px;
            }
            
            .transactions-table th {
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                padding: 4px 3px;
                text-align: left;
                font-weight: 600;
                color: #1e40af;
                font-size: 7px;
            }
            
            .transactions-table td {
                border: 1px solid #e2e8f0;
                padding: 3px 3px;
                vertical-align: top;
                font-size: 7px;
            }
            
            .transactions-table tbody tr:nth-child(even) {
                background: #f9fafb;
            }
            
            .transaction-row.ingreso {
                background: #ecfdf5 !important;
                border-left: 3px solid #10b981;
            }
            
            .transaction-row.egreso {
                background: #fef2f2 !important;
                border-left: 3px solid #ef4444;
            }
            
            .transaction-type {
                font-weight: 600;
                font-size: 6px;
                padding: 1px 3px;
                border-radius: 6px;
                text-transform: uppercase;
            }
            
            .transaction-type.ingreso {
                background: #10b981;
                color: white;
            }
            
            .transaction-type.egreso {
                background: #ef4444;
                color: white;
            }
            
            .transaction-amount {
                font-weight: 600;
                text-align: right;
            }
            
            .transaction-amount.ingreso {
                color: #059669;
            }
            
            .transaction-amount.egreso {
                color: #dc2626;
            }
            
            /* 🛒 ITEMS COMPACTOS EN TABLA */
            .items-list {
                margin: 2px 0;
                font-size: 6px;
                line-height: 1.1;
            }
            
            .item-line {
                display: flex;
                align-items: center;
                margin-bottom: 1px;
            }
            
            .item-badge {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 1px;
                margin-right: 3px;
                font-size: 5px;
                text-align: center;
                line-height: 8px;
                color: white;
                font-weight: bold;
            }
            
            .item-badge.producto {
                background: #3b82f6;
            }
            
            .item-badge.servicio {
                background: #8b5cf6;
            }
            
            .item-badge.electrobar {
                background: #f59e0b;
            }
            
            .item-text {
                flex: 1;
                font-weight: 500;
            }
            
            .item-price {
                font-weight: 600;
                color: #059669;
                margin-left: 5px;
            }
            
            /* 💳 MÉTODOS DE PAGO COMPACTOS */
            .payment-list {
                font-size: 6px;
                margin-top: 2px;
            }
            
            .payment-item {
                display: inline-block;
                background: #e2e8f0;
                padding: 1px 2px;
                border-radius: 2px;
                margin-right: 2px;
                margin-bottom: 1px;
                font-weight: 500;
            }
            
            .payment-item.pago_movil {
                background: #ddd6fe;
                color: #7c3aed;
            }
            
            .payment-item.efectivo_usd {
                background: #dcfce7;
                color: #16a34a;
            }
            
            .payment-item.efectivo_bs {
                background: #fef3c7;
                color: #d97706;
            }
            
            /* 🚨 DIFERENCIAS HORIZONTALES */
            .diferencias-section {
                background: #fef3c7;
                padding: 6px 10px;
                border-radius: 4px;
                margin-bottom: 6px;
                border-left: 3px solid #f59e0b;
                font-size: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .diferencias-title {
                color: #92400e;
                font-weight: 600;
            }
            
            .diferencias-list {
                display: flex;
                gap: 15px;
            }
            
            /* 📝 OBSERVACIONES HORIZONTALES */
            .observaciones-section {
                background: #f1f5f9;
                padding: 6px 10px;
                border-radius: 4px;
                margin-bottom: 6px;
                border-left: 3px solid #64748b;
                font-size: 8px;
            }
            
            .observaciones-section h3 {
                color: #475569;
                font-weight: 600;
                margin-bottom: 3px;
                display: inline;
                margin-right: 10px;
            }
            
            /* 🔒 FOOTER HORIZONTAL */
            .footer {
                background: #1f2937;
                color: white;
                padding: 6px 15px;
                border-radius: 4px;
                font-size: 7px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .footer-left {
                font-weight: 600;
            }
            
            .footer-right {
                text-align: right;
                opacity: 0.8;
            }
            
            /* 📱 OPTIMIZACIÓN PARA CARTA */
            @media print {
                @page {
                    size: letter landscape;
                    margin: 0.5in;
                }
                .container {
                    padding: 0;
                }
                .transactions-table {
                    page-break-inside: avoid;
                }
                .transaction-row {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- 🎯 HEADER HORIZONTAL -->
            <div class="header">
                <div class="header-left">
                    <h1>🏪 ELECTRO CAJA - CIERRE DE CAJA</h1>
                    <div class="subtitle">${new Date(fechaGeneracion).toLocaleDateString('es-VE', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })}</div>
                </div>
                <div class="header-right">
                    <div>📊 ${transacciones.length} transacciones</div>
                    <div>⏰ ${caja.horaApertura} - ${caja.horaCierre || 'En proceso'}</div>
                </div>
            </div>
            
            <!-- 📊 INFO EN DOS COLUMNAS -->
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-row">
                        <span class="info-label">👤 Usuario:</span>
                        <span class="info-value">${usuario.nombre} (${usuario.rol.toUpperCase()})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🏢 Sucursal:</span>
                        <span class="info-value">${usuario.sucursal || 'Principal'}</span>
                    </div>
                </div>
                <div class="info-card">
                    <div class="info-row">
                        <span class="info-label">📅 Fecha:</span>
                        <span class="info-value">${caja.fecha}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">📸 Evidencia:</span>
                        <span class="info-value">${evidenciaFotografica ? 'Sí' : 'No'}</span>
                    </div>
                </div>
            </div>
            
            <!-- 💰 RESUMEN FINANCIERO HORIZONTAL -->
            <div class="financial-summary">
                <div class="financial-title">💰 Resumen Final</div>
                <div class="financial-grid">
                    <div class="financial-item">
                        <h4>💵 Efectivo Bs</h4>
                        <div class="amount">${this.formatearBolivares(caja.montoFinalBs || 0)}</div>
                    </div>
                    <div class="financial-item">
                        <h4>💵 Efectivo USD</h4>
                        <div class="amount">$${this.formatearDolares(caja.montoFinalUsd || 0)}</div>
                    </div>
                    <div class="financial-item">
                        <h4>📱 Pago Móvil</h4>
                        <div class="amount">${this.formatearBolivares(caja.montoFinalPagoMovil || 0)}</div>
                    </div>
                </div>
            </div>
            
            <!-- 📋 TRANSACCIONES EN TABLA HORIZONTAL -->
            <div class="transactions-section">
                <h2>📋 Detalle de Transacciones (${transacciones.length})</h2>
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th style="width: 8%;">Tipo/Usuario</th>
                            <th style="width: 6%;">Hora</th>
                            <th style="width: 12%;">Código</th>
                            <th style="width: 35%;">Items</th>
                            <th style="width: 20%;">Métodos de Pago</th>
                            <th style="width: 10%;">Monto Bs</th>
                            <th style="width: 9%;">Monto USD</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transacciones.map((t, index) => `
                            <tr class="transaction-row ${t.tipo.toLowerCase()}">
                                <td>
                                    <span class="transaction-type ${t.tipo.toLowerCase()}">${t.tipo}</span>
                                    <div style="font-size: 6px; margin-top: 1px; color: #64748b;">
                                        👤 ${t.usuario || 'Sistema'}
                                    </div>
                                </td>
                                <td>${new Date(t.fechaHora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td style="font-weight: 600;">${t.codigoVenta || t.categoria}</td>
                                <td>
                                    ${t.items && t.items.length > 0 ? `
                                        <div class="items-list">
                                            ${t.items.map(item => `
                                                <div class="item-line">
                                                    <span class="item-badge ${(item.producto?.tipo || 'PRODUCTO').toLowerCase()}">
                                                        ${this.getIconoTipo(item.producto?.tipo || 'PRODUCTO')}
                                                    </span>
                                                    <span class="item-text">${item.cantidad}× ${item.descripcion}</span>
                                                    <span class="item-price">${this.formatearBolivares(item.subtotal)} Bs</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : `
                                        <div style="font-style: italic; color: #64748b;">
                                            ${t.categoria}${t.observaciones && !t.observaciones.startsWith('Venta procesada') ? 
                                                ` • ${t.observaciones.substring(0, 40)}${t.observaciones.length > 40 ? '...' : ''}` : ''
                                            }
                                        </div>
                                    `}
                                </td>
                                <td>
                                    ${t.pagos && t.pagos.length > 0 ? `
                                        <div class="payment-list">
                                            ${t.pagos.map(p => 
                                                `<span class="payment-item ${p.metodo}">${this.formatearMetodoPago(p.metodo)}: ${this.formatearMonto(p.monto, p.moneda)}</span>`
                                            ).join('')}
                                        </div>
                                    ` : '-'}
                                </td>
                                <td class="transaction-amount ${t.tipo.toLowerCase()}">
                                    ${t.tipo === 'INGRESO' ? '+' : '-'}${this.formatearBolivares(t.totalBs)}
                                </td>
                                <td class="transaction-amount ${t.tipo.toLowerCase()}">
                                    ${t.totalUsd > 0 ? `${t.tipo === 'INGRESO' ? '+' : '-'}$${this.formatearDolares(t.totalUsd)}` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${diferencias ? `
            <!-- 🚨 DIFERENCIAS HORIZONTALES -->
            <div class="diferencias-section">
                <div class="diferencias-title">⚠️ Diferencias Autorizadas por CEO:</div>
                <div class="diferencias-list">
                    ${diferencias.bs !== 0 ? `<span><strong>Bs:</strong> ${diferencias.bs > 0 ? '+' : ''}${this.formatearBolivares(diferencias.bs)}</span>` : ''}
                    ${diferencias.usd !== 0 ? `<span><strong>USD:</strong> ${diferencias.usd > 0 ? '+' : ''}$${this.formatearDolares(diferencias.usd)}</span>` : ''}
                    ${diferencias.pagoMovil !== 0 ? `<span><strong>PM:</strong> ${diferencias.pagoMovil > 0 ? '+' : ''}${this.formatearBolivares(diferencias.pagoMovil)} Bs</span>` : ''}
                </div>
            </div>
            ` : ''}
            
            ${observaciones ? `
            <!-- 📝 OBSERVACIONES HORIZONTALES -->
            <div class="observaciones-section">
                <h3>📝 Observaciones:</h3>
                <span>${observaciones}</span>
            </div>
            ` : ''}
            
            <!-- 🔒 FOOTER HORIZONTAL -->
            <div class="footer">
                <div class="footer-left">
                    <strong>Electro Caja</strong> • Sistema de Control de Ventas
                </div>
                <div class="footer-right">
                    📅 ${new Date(fechaGeneracion).toLocaleString('es-VE')}
                    ${evidenciaFotografica ? ' • 📸 Con evidencia' : ''}
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // 🔧 MÉTODOS AUXILIARES (sin cambios)
  static formatearBolivares(amount) {
    return (amount || 0).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static formatearDolares(amount) {
    return (amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static formatearMonto(amount, moneda) {
    if (moneda === 'usd') {
      return `$${this.formatearDolares(amount)}`;
    }
    return `${this.formatearBolivares(amount)} Bs`;
  }

  static formatearMetodoPago(metodo) {
    const nombres = {
      'efectivo_bs': 'EFE-BS',
      'efectivo_usd': 'EFE-USD',
      'pago_movil': 'P-MOV',
      'transferencia': 'TRANS',
      'zelle': 'ZELLE',
      'binance': 'BINANCE',
      'tarjeta': 'TARJ'
    };
    return nombres[metodo] || metodo.toUpperCase();
  }

  static getIconoTipo(tipo) {
    switch(tipo?.toUpperCase()) {
      case 'PRODUCTO': return 'P';
      case 'SERVICIO': return 'S';
      case 'ELECTROBAR': return 'E';
      default: return 'P';
    }
  }

  static contarTiposItems(items) {
    const conteo = items.reduce((acc, item) => {
      const tipo = (item.producto?.tipo || 'PRODUCTO').toLowerCase();
      acc[tipo] = (acc[tipo] || 0) + item.cantidad;
      return acc;
    }, {});

    const partes = [];
    if (conteo.producto) partes.push(`${conteo.producto}P`);
    if (conteo.servicio) partes.push(`${conteo.servicio}S`);
    if (conteo.electrobar) partes.push(`${conteo.electrobar}E`);

    return partes.join(' ') || '0 items';
  }

  // 🚀 GENERAR PDF OPTIMIZADO PARA CARTA HORIZONTAL
  static async generarPDFCierre(datosCompletos) {
    let browser;
    
    try {
      console.log('🚀 Generando PDF optimizado para carta horizontal...');
      
      const htmlContent = this.generarHTMLCierre(datosCompletos);
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const nombreArchivo = `cierre-caja-${timestamp}-${Date.now()}.pdf`;
      
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const rutaPDF = path.join(uploadsDir, nombreArchivo);
      
      // 📄 CONFIGURACIÓN PARA CARTA HORIZONTAL
      await page.pdf({
        path: rutaPDF,
        format: 'letter', // Tamaño carta
        landscape: false,  // Orientación horizontal
        printBackground: true,
        margin: {
          top: '12mm',
          right: '12mm',
          bottom: '12mm',
          left: '12mm'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        scale: 1.0 // Escala completa para aprovechar el ancho
      });
      
      console.log(`✅ PDF carta horizontal generado: ${rutaPDF}`);
      
      return {
        success: true,
        rutaPDF,
        nombreArchivo,
        size: fs.statSync(rutaPDF).size
      };
      
    } catch (error) {
      console.error('❌ Error generando PDF carta horizontal:', error);
      throw error;
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = PDFCierreService;