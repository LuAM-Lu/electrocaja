// services/pdfCierreService.js - GENERADOR DE PDF PROFESIONAL DE CIERRE 
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PDFCierreService {
  
  //  GENERAR HTML PROFESIONAL PARA EL PDF
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
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                overflow: hidden;
            }
            
            /*  HEADER ELEGANTE */
            .header {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                padding: 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: rotate 20s linear infinite;
            }
            
            @keyframes rotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .header h1 {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                position: relative;
                z-index: 2;
            }
            
            .header .subtitle {
                font-size: 1.2rem;
                opacity: 0.9;
                position: relative;
                z-index: 2;
            }
            
            /*  INFORMACIÓN PRINCIPAL */
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
                padding: 40px;
                background: #f8fafc;
            }
            
            .info-card {
                background: white;
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.08);
                border-left: 5px solid #3b82f6;
            }
            
            .info-card h3 {
                color: #1e40af;
                font-size: 1.1rem;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .info-item:last-child {
                border-bottom: none;
                font-weight: 600;
                color: #059669;
                font-size: 1.1rem;
            }
            
            /*  RESUMEN FINANCIERO */
            .financial-summary {
                padding: 40px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }
            
            .financial-summary h2 {
                text-align: center;
                font-size: 2rem;
                margin-bottom: 30px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .financial-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }
            
            .financial-card {
                background: rgba(255,255,255,0.15);
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            .financial-card h4 {
                font-size: 0.9rem;
                opacity: 0.9;
                margin-bottom: 10px;
            }
            
            .financial-card .amount {
                font-size: 1.5rem;
                font-weight: 700;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            
            /*  TABLA DE TRANSACCIONES */
            .transactions-section {
                padding: 40px;
            }
            
            .transactions-section h2 {
                color: #1e40af;
                font-size: 1.8rem;
                margin-bottom: 25px;
                text-align: center;
            }
            
            .transaction-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 0.9rem;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            }
            
            .transaction-table th {
                background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
                color: white;
                font-weight: 600;
                padding: 15px 10px;
                text-align: left;
            }
            
            .transaction-table td {
                padding: 12px 10px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .transaction-table tr:nth-child(even) {
                background: #f8fafc;
            }
            
            .transaction-table tr:hover {
                background: #e0f2fe;
                transform: scale(1.01);
                transition: all 0.2s ease;
            }
            
            .ingreso {
                color: #059669;
                font-weight: 600;
            }
            
            .egreso {
                color: #dc2626;
                font-weight: 600;
            }
            
            /*  DIFERENCIAS */
            .diferencias-section {
                background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
                padding: 30px 40px;
                border-left: 5px solid #f59e0b;
            }
            
            .diferencias-section h3 {
                color: #92400e;
                font-size: 1.3rem;
                margin-bottom: 15px;
            }
            
            /*  OBSERVACIONES */
            .observaciones-section {
                padding: 30px 40px;
                background: #f1f5f9;
                border-left: 5px solid #64748b;
            }
            
            .observaciones-section h3 {
                color: #475569;
                margin-bottom: 15px;
            }
            
            /*  EVIDENCIA */
            .evidencia-section {
                padding: 30px 40px;
                text-align: center;
                background: #ecfdf5;
                border-left: 5px solid #10b981;
            }
            
            /*  FOOTER */
            .footer {
                background: #1f2937;
                color: white;
                text-align: center;
                padding: 30px;
                font-size: 0.9rem;
            }
            
            .footer .timestamp {
                opacity: 0.8;
                margin-top: 10px;
            }
            
            /*  RESPONSIVE */
            @media (max-width: 768px) {
                .info-grid {
                    grid-template-columns: 1fr;
                    padding: 20px;
                }
                
                .financial-grid {
                    grid-template-columns: 1fr;
                }
                
                .header h1 {
                    font-size: 2rem;
                }
                
                .transaction-table {
                    font-size: 0.8rem;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!--  HEADER -->
            <div class="header">
                <h1> ELECTRO CAJA</h1>
                <div class="subtitle">Reporte de Cierre de Caja - ${new Date(fechaGeneracion).toLocaleDateString('es-VE', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</div>
            </div>
            
            <!--  INFORMACIÓN PRINCIPAL -->
            <div class="info-grid">
                <div class="info-card">
                    <h3> Información del Usuario</h3>
                    <div class="info-item">
                        <span>Nombre:</span>
                        <span>${usuario.nombre}</span>
                    </div>
                    <div class="info-item">
                        <span>Rol:</span>
                        <span>${usuario.rol.toUpperCase()}</span>
                    </div>
                    <div class="info-item">
                        <span>Sucursal:</span>
                        <span>${usuario.sucursal || 'Principal'}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3> Horarios de Operación</h3>
                    <div class="info-item">
                        <span>Apertura:</span>
                        <span>${caja.fecha} - ${caja.horaApertura}</span>
                    </div>
                    <div class="info-item">
                        <span>Cierre:</span>
                        <span>${new Date().toLocaleDateString('es-VE')} - ${caja.horaCierre}</span>
                    </div>
                    <div class="info-item">
                        <span>Duración:</span>
                        <span>Jornada Completa</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3> Estadísticas Generales</h3>
                    <div class="info-item">
                        <span>Total Transacciones:</span>
                        <span>${transacciones.length}</span>
                    </div>
                    <div class="info-item">
                        <span>Ingresos:</span>
                        <span>${transacciones.filter(t => t.tipo === 'ingreso').length}</span>
                    </div>
                    <div class="info-item">
                        <span>Egresos:</span>
                        <span>${transacciones.filter(t => t.tipo === 'egreso').length}</span>
                    </div>
                </div>
            </div>
            
            <!--  RESUMEN FINANCIERO -->
            <div class="financial-summary">
                <h2> Resumen Financiero Final</h2>
                <div class="financial-grid">
                    <div class="financial-card">
                        <h4> Efectivo Bolívares</h4>
                        <div class="amount">${this.formatearBolivares(caja.montoFinalBs || 0)} Bs</div>
                    </div>
                    <div class="financial-card">
                        <h4> Efectivo Dólares</h4>
                        <div class="amount">$${this.formatearDolares(caja.montoFinalUsd || 0)}</div>
                    </div>
                    <div class="financial-card">
                        <h4> Pago Móvil</h4>
                        <div class="amount">${this.formatearBolivares(caja.montoFinalPagoMovil || 0)} Bs</div>
                    </div>
                </div>
            </div>
            
            <!--  TRANSACCIONES DETALLADAS -->
            <div class="transactions-section">
                <h2> Registro Detallado de Transacciones</h2>
                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Usuario</th>
                            <th>Método Pago</th>
                            <th>Monto</th>
                            <th>Tasa</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transacciones.map(t => `
                            <tr>
                                <td>${new Date(t.fechaHora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td class="${t.tipo}">${t.tipo.toUpperCase()}</td>
                                <td>${t.categoria}</td>
                                <td>${t.usuario || 'Sistema'}</td>
                                <td>${t.pagos?.map(p => p.metodo).join(', ') || 'N/A'}</td>
                                <td class="${t.tipo}">
                                    ${t.tipo === 'ingreso' ? '+' : '-'}
                                    ${this.formatearBolivares(t.totalBs)} Bs
                                    ${t.totalUsd > 0 ? ` / $${this.formatearDolares(t.totalUsd)}` : ''}
                                </td>
                                <td>${t.tasaCambioUsada ? this.formatearDolares(t.tasaCambioUsada) : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${diferencias ? `
            <!--  DIFERENCIAS -->
            <div class="diferencias-section">
                <h3> Diferencias Detectadas</h3>
                ${diferencias.bs !== 0 ? `<p><strong>Bolívares:</strong> ${diferencias.bs > 0 ? '+' : ''}${this.formatearBolivares(diferencias.bs)} Bs</p>` : ''}
                ${diferencias.usd !== 0 ? `<p><strong>Dólares:</strong> ${diferencias.usd > 0 ? '+' : ''}$${this.formatearDolares(diferencias.usd)}</p>` : ''}
                ${diferencias.pagoMovil !== 0 ? `<p><strong>Pago Móvil:</strong> ${diferencias.pagoMovil > 0 ? '+' : ''}${this.formatearBolivares(diferencias.pagoMovil)} Bs</p>` : ''}
                <p><em>Autorizado por CEO - Ajustes registrados automáticamente</em></p>
            </div>
            ` : ''}
            
            ${observaciones ? `
            <!--  OBSERVACIONES -->
            <div class="observaciones-section">
                <h3> Observaciones del Cierre</h3>
                <p>${observaciones}</p>
            </div>
            ` : ''}
            
            ${evidenciaFotografica ? `
            <!--  EVIDENCIA -->
            <div class="evidencia-section">
                <h3> Evidencia Fotográfica</h3>
                <p> Evidencia automática capturada y almacenada en el sistema</p>
                <p><em>Timestamp: ${fechaGeneracion}</em></p>
            </div>
            ` : ''}
            
            <!--  FOOTER -->
            <div class="footer">
                <p><strong>Electro Caja</strong> - Sistema de Control de Ventas</p>
                <p>Reporte generado automáticamente</p>
                <div class="timestamp">
                     ${new Date(fechaGeneracion).toLocaleString('es-VE')}
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  //  FORMATEAR MONTOS
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

  //  GENERAR PDF FINAL
  static async generarPDFCierre(datosCompletos) {
    let browser;
    
    try {
      console.log(' Iniciando generación de PDF de cierre...');
      
      // Generar HTML
      const htmlContent = this.generarHTMLCierre(datosCompletos);
      
      // Configurar Puppeteer
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Configurar página
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Generar nombre único
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const nombreArchivo = `cierre-caja-${timestamp}-${Date.now()}.pdf`;
      
      // Ruta de destino
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const rutaPDF = path.join(uploadsDir, nombreArchivo);
      
      // Generar PDF con configuración profesional
      await page.pdf({
        path: rutaPDF,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });
      
      console.log(` PDF generado exitosamente: ${rutaPDF}`);
      
      return {
        success: true,
        rutaPDF,
        nombreArchivo,
        size: fs.statSync(rutaPDF).size
      };
      
    } catch (error) {
      console.error(' Error generando PDF:', error);
      throw error;
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = PDFCierreService;