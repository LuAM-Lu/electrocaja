// services/pdfCierreService.js - VERSIÓN COMPLETA CORREGIDA CON ITEMS DETALLADOS
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PDFCierreService {

  // GENERAR HTML COMPACTO CON TRANSACCIONES DETALLADAS CORREGIDO
  static generarHTMLCierre(datosCompletos) {
    const {
      caja,
      transacciones,
      usuario,
      diferencias,
      observaciones,
      evidenciaFotografica,
      fechaGeneracion,
      montosFinales,
      ceoAutorizado
    } = datosCompletos;

    // CALCULAR ESTADÍSTICAS DEL PIE
    const estadisticas = this.calcularEstadisticas(transacciones);
    const hayDiferencias = diferencias && (diferencias.bs !== 0 || diferencias.usd !== 0 || diferencias.pagoMovil !== 0);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: 'Arial', 'Helvetica', sans-serif;
                font-size: 12px;
                line-height: 1.2;
                color: #333;
                background: white;
                margin: 0;
                padding: 8mm;
            }
            
            .page {
                max-width: 100%;
                background: white;
                position: relative;
                page-break-inside: avoid;
            }
            
            /* HEADER COMPACTO */
            .header {
                background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                color: white;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 4px;
            }
            
            .header .subtitle {
                font-size: 10px;
                opacity: 0.9;
            }

            /* ALERTA DE DIFERENCIAS COMPACTA */
            ${hayDiferencias ? `
            .diferencias-banner {
                background: #dc2626;
                color: white;
                padding: 6px 12px;
                text-align: center;
                font-weight: bold;
                font-size: 10px;
                margin-bottom: 8px;
                border-radius: 3px;
            }
            ` : ''}
            
            /* RESUMEN FINANCIERO HORIZONTAL */
            .resumen-financiero {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .resumen-card {
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 4px;
                padding: 8px;
                text-align: center;
                font-size: 9px;
            }
            
            .resumen-card.bolivares { border-color: #f59e0b; }
            .resumen-card.dolares { border-color: #10b981; }
            .resumen-card.pago-movil { border-color: #8b5cf6; }
            
            .resumen-card .titulo {
                font-weight: bold;
                margin-bottom: 3px;
                font-size: 8px;
                text-transform: uppercase;
            }
            
            .bolivares .titulo { color: #92400e; }
            .dolares .titulo { color: #065f46; }
            .pago-movil .titulo { color: #6b21a8; }
            
            .resumen-card .monto-final {
                font-size: 11px;
                font-weight: bold;
                margin: 3px 0;
            }
            
            .resumen-card .diferencia {
                font-size: 7px;
                font-weight: bold;
                padding: 1px 4px;
                border-radius: 8px;
                display: inline-block;
                margin-top: 2px;
            }
            
            .diferencia.exacto { background: #dcfce7; color: #16a34a; }
            .diferencia.sobrante { background: #dbeafe; color: #1e40af; }
            .diferencia.faltante { background: #fee2e2; color: #dc2626; }
            
            /* TABLA DE TRANSACCIONES - PROTAGONISTA */
            .transacciones-section {
                margin-bottom: 12px;
            }
            
            .transacciones-section h2 {
                background: #1e40af;
                color: white;
                padding: 6px 12px;
                margin: 0;
                font-size: 12px;
                font-weight: bold;
                border-radius: 3px 3px 0 0;
            }
            
            .transaction-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8px;
                border: 1px solid #e5e7eb;
                page-break-inside: auto;
            }
            
            .transaction-table th {
                background: #f1f5f9;
                color: #374151;
                font-weight: bold;
                padding: 4px 3px;
                text-align: left;
                border-bottom: 1px solid #d1d5db;
                font-size: 7px;
                text-transform: uppercase;
            }
            
            .transaction-table td {
                padding: 3px;
                border-bottom: 1px solid #f3f4f6;
                vertical-align: top;
                font-size: 8px;
                line-height: 1.1;
            }
            
            .transaction-table tr:nth-child(even) {
                background: #fafafa;
            }
            
            /* 🔥 ESTILOS MEJORADOS PARA ITEMS DETALLADOS */
            .transaction-table .item-row {
                border-top: 1px dashed #d1d5db;
            }
            
            .transaction-table .item-row td {
                padding-top: 2px;
                padding-bottom: 2px;
                font-size: 7px;
            }
            
            /* Columnas específicas */
            .col-hora { width: 8%; text-align: center; }
            .col-usuario { width: 11%; font-weight: 600; color: #4f46e5; }
            .col-tipo { width: 6%; text-align: center; font-weight: bold; }
            .col-detalles { width: 40%; }
            .col-cantidad { width: 11%; text-align: center; font-family: monospace; }
            .col-metodo { width: 12%; text-align: center; font-size: 7px; }
            .col-total { width: 15%; text-align: right; font-weight: bold; font-family: monospace; }
            
            /* 🔥 COLORES CORREGIDOS PARA TIPOS (BUG SOLUCIONADO) */
            .tipo-ingreso { color: #059669; background: #ecfdf5; padding: 2px 4px; border-radius: 3px; }
            .tipo-egreso { color: #dc2626; background: #fef2f2; padding: 2px 4px; border-radius: 3px; }
            
            .item-icon {
                font-size: 10px;
                margin-right: 3px;
                display: inline-block;
                width: 12px;
            }
            
            .item-descripcion {
                font-weight: 500;
                color: #374151;
                line-height: 1.1;
            }
            
            .item-linea {
                display: block;
                margin-bottom: 1px;
            }
            
            /* 🔥 MÉTODOS DE PAGO CON MONTO MEJORADOS */
            .metodo-pago {
                font-size: 6px;
                padding: 1px 3px;
                border-radius: 2px;
                display: inline-block;
                margin: 1px;
                font-weight: bold;
                white-space: nowrap;
            }
            
            .metodo-pm { background: #e9d5ff; color: #6b21a8; }
            .metodo-bs { background: #fef3c7; color: #92400e; }
            .metodo-usd { background: #d1fae5; color: #065f46; }
            .metodo-punto { background: #e0e7ff; color: #3730a3; }
            .metodo-transferencia { background: #f3e8ff; color: #7c2d12; }
            
            /* Indicadores de continuación */
            .continuacion {
                color: #9ca3af;
                font-size: 10px;
                text-align: center;
                display: inline-block;
                width: 100%;
                opacity: 0.6;
            }
            
            /* ESTADÍSTICAS DEL PIE */
            .footer-stats {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                padding: 8px;
                margin-top: 10px;
                page-break-inside: avoid;
            }
            
            .footer-stats h3 {
                color: #1e40af;
                font-size: 10px;
                font-weight: bold;
                margin-bottom: 6px;
                text-align: center;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                font-size: 8px;
            }
            
            .stat-item {
                background: white;
                padding: 4px 6px;
                border-radius: 3px;
                border-left: 2px solid #3b82f6;
            }
            
            .stat-item .label {
                font-weight: bold;
                color: #1e40af;
                font-size: 7px;
                text-transform: uppercase;
                margin-bottom: 1px;
            }
            
            .stat-item .value {
                color: #374151;
                font-weight: 600;
                font-size: 8px;
                line-height: 1.2;
            }
            
            /* FOOTER MÍNIMO */
            .footer {
                text-align: center;
                font-size: 7px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 4px;
                margin-top: 8px;
                page-break-inside: avoid;
            }
            
            /* CORRECCIÓN PARA UNA SOLA PÁGINA */
            @media print {
                body { margin: 0; padding: 5mm; }
                .page { margin: 0; }
                .footer { position: static; }
            }
            
            @page {
                size: A4;
                margin: 5mm;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <!-- HEADER COMPACTO -->
            <div class="header">
                <h1>ELECTRO CAJA - REPORTE DE CIERRE${caja.esCajaPendiente ? ' PENDIENTE' : ''}</h1>
                <div class="subtitle">
                    ${new Date(fechaGeneracion).toLocaleDateString('es-VE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} • ${usuario.nombre} (${usuario.rol.toUpperCase()}) • ${transacciones.length} transacciones
                </div>
            </div>

            <!-- BANNER DE DIFERENCIAS -->
            ${hayDiferencias ? `
            <div class="diferencias-banner">
                DIFERENCIAS AUTORIZADAS POR CEO ANDRÉS MORANDÍN: 
                ${diferencias.bs !== 0 ? `Bs ${diferencias.bs > 0 ? '+' : ''}${this.formatearBolivares(diferencias.bs)}` : ''}
                ${diferencias.usd !== 0 ? ` • USD ${diferencias.usd > 0 ? '+' : ''}$${this.formatearDolares(diferencias.usd)}` : ''}
                ${diferencias.pagoMovil !== 0 ? ` • PM ${diferencias.pagoMovil > 0 ? '+' : ''}${this.formatearBolivares(diferencias.pagoMovil)}` : ''}
            </div>
            ` : ''}
            
            <!-- INFORMACIÓN DE LA CAJA -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 8px;">
                <div>
                    <div style="font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 7px;">Apertura</div>
                    <div style="color: #1e40af; font-weight: 600;">${caja.horaApertura || '08:00'}</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 7px;">Cierre</div>
                    <div style="color: #dc2626; font-weight: 600;">${caja.horaCierre || new Date(fechaGeneracion).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 7px;">Usuario Apertura</div>
                    <div style="color: #374151; font-weight: 600;">${caja.usuarioApertura?.nombre || usuario.nombre || 'Sistema'}</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 7px;">Evidencia</div>
                    <div style="color: ${evidenciaFotografica ? '#16a34a' : '#9ca3af'}; font-weight: 600;">${evidenciaFotografica ? '✓ Con foto' : '✗ Sin foto'}</div>
                </div>
            </div>
            
            <!-- RESUMEN FINANCIERO HORIZONTAL - CÁLCULOS CORREGIDOS -->
            <div class="resumen-financiero">
                <div class="resumen-card bolivares">
                    <div class="titulo">BOLÍVARES</div>
                    <div>Inicial: ${this.formatearBolivares(caja.montoInicialBs || 0)}</div>
                    <div>+${this.formatearBolivares(caja.totalIngresosBs || 0)} / -${this.formatearBolivares(caja.totalEgresosBs || 0)}</div>
                    <div style="font-size: 7px; color: #6b7280;">Esperado: ${this.formatearBolivares((parseFloat(caja.montoInicialBs) || 0) + (parseFloat(caja.totalIngresosBs) || 0) - (parseFloat(caja.totalEgresosBs) || 0))} Bs</div>
                    <div class="monto-final">${this.formatearBolivares(montosFinales?.bs || caja.montoFinalBs || 0)} Bs</div>
                    ${diferencias && diferencias.bs !== 0 ? `
                    <div class="diferencia ${diferencias.bs > 0 ? 'sobrante' : 'faltante'}">
                        ${diferencias.bs > 0 ? '+' : ''}${this.formatearBolivares(diferencias.bs)}
                    </div>
                    ` : `<div class="diferencia exacto">EXACTO</div>`}
                </div>
                
                <div class="resumen-card dolares">
                    <div class="titulo">DÓLARES</div>
                    <div>Inicial: $${this.formatearDolares(caja.montoInicialUsd || 0)}</div>
                    <div>+$${this.formatearDolares(caja.totalIngresosUsd || 0)} / -$${this.formatearDolares(caja.totalEgresosUsd || 0)}</div>
                    <div style="font-size: 7px; color: #6b7280;">Esperado: $${this.formatearDolares((parseFloat(caja.montoInicialUsd) || 0) + (parseFloat(caja.totalIngresosUsd) || 0) - (parseFloat(caja.totalEgresosUsd) || 0))}</div>
                    <div class="monto-final">$${this.formatearDolares(montosFinales?.usd || caja.montoFinalUsd || 0)}</div>
                    ${diferencias && diferencias.usd !== 0 ? `
                    <div class="diferencia ${diferencias.usd > 0 ? 'sobrante' : 'faltante'}">
                        ${diferencias.usd > 0 ? '+' : ''}$${this.formatearDolares(diferencias.usd)}
                    </div>
                    ` : `<div class="diferencia exacto">EXACTO</div>`}
                </div>
                
                <div class="resumen-card pago-movil">
                    <div class="titulo">PAGO MÓVIL</div>
                    <div>Inicial: ${this.formatearBolivares(caja.montoInicialPagoMovil || 0)}</div>
                    <div>+${this.formatearBolivares(caja.totalPagoMovil || caja.totalIngresosPagoMovil || 0)} / -${this.formatearBolivares(caja.totalEgresosPagoMovil || 0)}</div>
                    <div style="font-size: 7px; color: #6b7280;">Esperado: ${this.formatearBolivares((parseFloat(caja.montoInicialPagoMovil) || 0) + (parseFloat(caja.totalPagoMovil || caja.totalIngresosPagoMovil) || 0) - (parseFloat(caja.totalEgresosPagoMovil) || 0))} Bs</div>
                    <div class="monto-final">${this.formatearBolivares(montosFinales?.pagoMovil || caja.montoFinalPagoMovil || 0)} Bs</div>
                    ${diferencias && diferencias.pagoMovil !== 0 ? `
                    <div class="diferencia ${diferencias.pagoMovil > 0 ? 'sobrante' : 'faltante'}">
                        ${diferencias.pagoMovil > 0 ? '+' : ''}${this.formatearBolivares(diferencias.pagoMovil)}
                    </div>
                    ` : `<div class="diferencia exacto">EXACTO</div>`}
                </div>
            </div>

            <!-- TABLA DE TRANSACCIONES - PROTAGONISTA -->
            <div class="transacciones-section">
                <h2>Registro Detallado de Transacciones del Día</h2>
                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th class="col-hora">HORA</th>
                            <th class="col-usuario">USUARIO</th>
                            <th class="col-tipo">TIPO</th>
                            <th class="col-detalles">DETALLES DEL ITEM</th>
                            <th class="col-cantidad">CANT × PRECIO</th>
                            <th class="col-metodo">MÉTODO</th>
                            <th class="col-total">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transacciones.map(t => this.generarFilaTransaccion(t)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- ESTADÍSTICAS DEL DÍA - MEJORADO -->
            <div class="footer-stats">
                <h3>📊 Estadísticas del Día</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="label">ITEM MÁS VALIOSO</div>
                        <div class="value">${estadisticas.itemMasValioso?.descripcion || 'N/A'} - ${estadisticas.itemMasValioso?.precio || '0'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">MÁS VENDIDO</div>
                        <div class="value">${estadisticas.masVendido?.descripcion || 'N/A'} - ${estadisticas.masVendido?.cantidad || '0'} unidades</div>
                    </div>
                </div>
                
                <!-- 🔥 NUEVA SECCIÓN: RESUMEN DE VENTAS POR USUARIO -->
                <h3 style="margin-top: 10px;">👥 Resumen por Usuario</h3>
                <table class="transaction-table" style="margin-top: 5px;">
                    <thead>
                        <tr>
                            <th style="width: 25%;">USUARIO</th>
                            <th style="width: 15%; text-align: center;">VENTAS</th>
                            <th style="width: 20%; text-align: right;">TOTAL $</th>
                            <th style="width: 20%; text-align: right;">TOTAL Bs</th>
                            <th style="width: 20%; text-align: center;">TRANSACC.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${estadisticas.resumenUsuarios?.map(u => `
                            <tr>
                                <td style="font-weight: 600; color: #4f46e5;">${u.nombre}</td>
                                <td style="text-align: center;">${u.ventas}</td>
                                <td style="text-align: right; font-family: monospace; color: #065f46;">$${this.formatearDolares(u.totalUsd)}</td>
                                <td style="text-align: right; font-family: monospace; color: #92400e;">${this.formatearBolivares(u.totalBs)} Bs</td>
                                <td style="text-align: center;">${u.transacciones}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" style="text-align: center; color: #9ca3af;">Sin datos de usuarios</td></tr>'}
                    </tbody>
                </table>
                
                <!-- 🔥 NUEVA SECCIÓN: CAMBIOS DE TASA DEL DÍA -->
                ${estadisticas.cambiosTasa?.length > 0 ? `
                <h3 style="margin-top: 10px;">💱 Tasas de Cambio Utilizadas</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                    ${estadisticas.cambiosTasa.map(tasa => `
                        <span style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-size: 8px; font-weight: 600;">
                            ${tasa.hora}: ${this.formatearBolivares(tasa.valor)} Bs/$ 
                            ${tasa.usuario ? `(${tasa.usuario})` : ''}
                        </span>
                    `).join('')}
                </div>
                ` : ''}
            </div>

            <!-- FOOTER MÍNIMO -->
            <div class="footer">
                <strong>Electro Caja</strong> - Sistema de Control de Ventas • 
                Reporte generado automáticamente el ${new Date(fechaGeneracion).toLocaleString('es-VE')}
                ${hayDiferencias && ceoAutorizado ? ' • DIFERENCIAS AUTORIZADAS POR CEO' : ''}
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // 🔥 FUNCIÓN PRINCIPAL PARA GENERAR FILAS DE TRANSACCIONES (COMPLETAMENTE CORREGIDA)
  static generarFilaTransaccion(transaccion) {
    // 🔇 DEBUG deshabilitado en producción - activar con DEBUG_PDF=true si es necesario
    if (process.env.DEBUG_PDF === 'true') {
      console.log(`🔍 DEBUG Transacción ${transaccion.id}:`, {
        tipo: transaccion.tipo,
        categoria: transaccion.categoria,
        totalBs: transaccion.totalBs,
        totalUsd: transaccion.totalUsd,
        itemsCount: transaccion.items?.length || 0
      });
    }

    // 🔥 SI LA TRANSACCIÓN TIENE MÚLTIPLES ITEMS, CREAR FILA POR CADA ITEM
    if (transaccion.items && transaccion.items.length > 1) {
      return transaccion.items.map((item, index) => {
        return this.generarFilaIndividualPorItem(transaccion, item, index, transaccion.items.length);
      }).join('');
    }

    // 🔥 SI TIENE UN SOLO ITEM O NINGUNO, USAR MÉTODO INDIVIDUAL
    return this.generarFilaIndividual(transaccion);
  }

  // 🔥 NUEVA FUNCIÓN PARA GENERAR FILA INDIVIDUAL POR ITEM
  static generarFilaIndividualPorItem(transaccion, item, index, totalItems) {
    const hora = new Date(transaccion.fechaHora).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const usuario = this.truncarTexto(transaccion.usuario || 'Sistema', 12);

    // Detectar tipo correctamente
    const tipoOriginal = transaccion.tipo?.toString().toLowerCase();
    const esIngreso = tipoOriginal === 'ingreso';
    const tipoClass = esIngreso ? 'tipo-ingreso' : 'tipo-egreso';
    const tipoIcon = esIngreso ? '🟢' : '🔴';
    const tipoTexto = esIngreso ? 'ING' : 'EGR';

    // 🔥 DETALLES ESPECÍFICOS DEL ITEM INDIVIDUAL
    const detallesItem = this.generarDetalleItemIndividual(item, transaccion);

    // 🔥 CANTIDAD Y PRECIO ESPECÍFICO DEL ITEM
    const cantidad = item.cantidad || 1;
    const precioUnitario = item.precioUnitario || 0;
    const subtotal = item.subtotal || (cantidad * precioUnitario);

    // 🔥 CORREGIDO: Determinar moneda del item basándose en datos reales
    // Prioridad: 1) Campo moneda del item, 2) Comparar totales Bs vs USD de la transacción
    let esDolares = false;
    if (item.moneda) {
      esDolares = item.moneda === 'usd' || item.moneda === 'USD';
    } else {
      // Comparar totales: si hay más en USD que en Bs (convertido a referencia), es USD
      const totalBsTransaccion = parseFloat(transaccion.totalBs) || 0;
      const totalUsdTransaccion = parseFloat(transaccion.totalUsd) || 0;

      // Si solo hay totalUsd y no hay totalBs, es USD
      // Si hay ambos, determinar por el predominante
      if (totalUsdTransaccion > 0 && totalBsTransaccion === 0) {
        esDolares = true;
      } else if (totalBsTransaccion > 0) {
        // Hay Bs, entonces es Bs (predominante en Venezuela)
        esDolares = false;
      } else if (transaccion.pagos && transaccion.pagos.length > 0) {
        // Fallback: buscar el método de pago principal
        const pagoBs = transaccion.pagos.find(p =>
          p.metodo === 'efectivo_bs' || p.metodo === 'pago_movil' || p.metodo === 'transferencia'
        );
        const pagoUsd = transaccion.pagos.find(p =>
          p.metodo === 'efectivo_usd' || p.metodo === 'zelle' || p.metodo === 'binance'
        );
        // Si hay pago en Bs, priorizar Bs
        esDolares = !pagoBs && !!pagoUsd;
      }
    }

    const moneda = esDolares ? '$' : 'Bs ';
    const precioFormateado = esDolares ?
      this.formatearDolares(precioUnitario) :
      this.formatearBolivares(precioUnitario);

    const cantidadPrecio = precioUnitario > 0 ?
      `${cantidad} × ${moneda}${precioFormateado}` :
      `${cantidad} unidad${cantidad > 1 ? 'es' : ''}`;

    // 🔥 MÉTODO DE PAGO - SOLO EN LA PRIMERA FILA DEL ITEM
    const metodosPago = index === 0 ?
      this.generarMetodosPagoCorregidos(transaccion.pagos || [], transaccion) :
      '<span class="continuacion">↑</span>';

    // 🔥 TOTAL DEL ITEM INDIVIDUAL - CALCULAR DESDE PAGOS REALES SI ES POSIBLE Y MOSTRAR DESCUENTO
    const signo = esIngreso ? '+' : '-';
    let subtotalFormateado;

    if (subtotal > 0) {
      // Usar subtotal del item directamente
      subtotalFormateado = esDolares ?
        `${signo}$${this.formatearDolares(subtotal)}` :
        `${signo}${this.formatearBolivares(subtotal)} Bs`;
    } else {
      // Si no hay subtotal del item, calcular proporción desde pagos reales
      const totalItems = transaccion.items.length;
      let totalBsPagos = 0;
      let totalUsdPagos = 0;

      if (transaccion.pagos && transaccion.pagos.length > 0) {
        transaccion.pagos.forEach(pago => {
          const monto = parseFloat(pago.monto || 0);
          const moneda = pago.moneda || (pago.metodo?.includes('_usd') || pago.metodo?.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance' ? 'usd' : 'bs');
          if (moneda === 'usd') {
            totalUsdPagos += monto;
          } else {
            totalBsPagos += monto;
          }
        });
      } else {
        // Fallback: usar totales de transacción
        totalBsPagos = parseFloat(transaccion.totalBs || 0);
        totalUsdPagos = parseFloat(transaccion.totalUsd || 0);
      }

      const proporcionBs = totalBsPagos / totalItems;
      const proporcionUsd = totalUsdPagos / totalItems;

      if (proporcionUsd > 0) {
        subtotalFormateado = `${signo}$${this.formatearDolares(proporcionUsd)}`;
      } else if (proporcionBs > 0) {
        subtotalFormateado = `${signo}${this.formatearBolivares(proporcionBs)} Bs`;
      } else {
        subtotalFormateado = `${signo}0`;
      }
    }

    // 🔥 AGREGAR DESCUENTO DEL ITEM SI EXISTE (SOLO EN PRIMERA FILA)
    if (index === 0) {
      const descuentoItem = parseFloat(item.descuento || 0);
      if (descuentoItem > 0) {
        const descuentoFormateado = esDolares ?
          `-$${this.formatearDolares(descuentoItem)}` :
          `-${this.formatearBolivares(descuentoItem)} Bs`;
        subtotalFormateado += `<br/><span style="font-size: 7px; color: #dc2626; opacity: 0.8;">Desc: ${descuentoFormateado}</span>`;
      }
    }

    // 🔥 HORA Y USUARIO - SOLO EN LA PRIMERA FILA
    const horaColumna = index === 0 ? hora : '<span class="continuacion">↑</span>';
    const usuarioColumna = index === 0 ? usuario : '<span class="continuacion">↑</span>';
    const tipoColumna = index === 0 ? `${tipoIcon} ${tipoTexto}` : '<span class="continuacion">↑</span>';

    const rowClass = index > 0 ? ' item-row' : '';

    return `
      <tr class="${rowClass}">
        <td class="col-hora">${horaColumna}</td>
        <td class="col-usuario">${usuarioColumna}</td>
        <td class="col-tipo ${tipoClass}">${tipoColumna}</td>
        <td class="col-detalles">${detallesItem}</td>
        <td class="col-cantidad">${cantidadPrecio}</td>
        <td class="col-metodo">${metodosPago}</td>
        <td class="col-total ${tipoClass}">${subtotalFormateado}</td>
      </tr>
    `;
  }

  // 🔥 FUNCIÓN PARA GENERAR FILA INDIVIDUAL (TRANSACCIONES CON 1 O 0 ITEMS)
  static generarFilaIndividual(transaccion) {
    const hora = new Date(transaccion.fechaHora).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const usuario = this.truncarTexto(transaccion.usuario || 'Sistema', 12);

    // Detectar tipo correctamente
    const tipoOriginal = transaccion.tipo?.toString().toLowerCase();
    const esIngreso = tipoOriginal === 'ingreso';
    const tipoClass = esIngreso ? 'tipo-ingreso' : 'tipo-egreso';
    const tipoIcon = esIngreso ? '🟢' : '🔴';
    const tipoTexto = esIngreso ? 'ING' : 'EGR';

    // Generar detalles del item (método específico para casos simples)
    const detallesItem = transaccion.items && transaccion.items.length === 1 ?
      this.generarDetalleItemIndividual(transaccion.items[0], transaccion) :
      this.generarDetallesItemCompletos(transaccion);

    // Cantidad y precio
    const cantidadPrecio = this.generarCantidadPrecioCorregido(transaccion);

    // Métodos de pago
    const metodosPago = this.generarMetodosPagoCorregidos(transaccion.pagos || [], transaccion);

    // Total de la transacción
    const total = this.generarTotalTransaccionCorregido(transaccion, esIngreso);

    return `
      <tr>
        <td class="col-hora">${hora}</td>
        <td class="col-usuario">${usuario}</td>
        <td class="col-tipo ${tipoClass}">${tipoIcon} ${tipoTexto}</td>
        <td class="col-detalles">${detallesItem}</td>
        <td class="col-cantidad">${cantidadPrecio}</td>
        <td class="col-metodo">${metodosPago}</td>
        <td class="col-total ${tipoClass}">${total}</td>
      </tr>
    `;
  }

  // 🔥 NUEVA FUNCIÓN PARA GENERAR DETALLE DE ITEM INDIVIDUAL CON TASA DE CAMBIO Y DESCUENTO
  static generarDetalleItemIndividual(item, transaccion) {
    let icon = '📦';
    let descripcion = item.descripcion || 'Item sin descripción';

    // Detectar icono por tipo de producto
    if (item.producto) {
      const tipo = item.producto.tipo?.toLowerCase();
      switch (tipo) {
        case 'servicio':
          icon = '🔧';
          descripcion = item.producto.descripcion || descripcion;
          break;
        case 'electrobar':
          icon = '🍿';
          descripcion = item.producto.descripcion || descripcion;
          break;
        case 'producto':
          icon = '📱';
          descripcion = item.producto.descripcion || descripcion;
          break;
        default:
          icon = '📦';
      }
    } else {
      // Detectar por descripción del item
      const desc = descripcion.toLowerCase();
      if (desc.includes('servicio') || desc.includes('reparacion') || desc.includes('mantenimiento')) {
        icon = '🔧';
      } else if (desc.includes('electrobar') || desc.includes('combo')) {
        icon = '🍿';
      } else if (desc.includes('saldo') || desc.includes('robux')) {
        icon = '🎮';
      } else if (desc.includes('vuelto')) {
        icon = '💸';
      } else if (desc.includes('telefono') || desc.includes('celular') || desc.includes('smartphone')) {
        icon = '📱';
      } else if (desc.includes('accesorio') || desc.includes('cable') || desc.includes('cargador')) {
        icon = '🔌';
      } else if (desc.includes('laptop') || desc.includes('computador')) {
        icon = '💻';
      } else if (desc.includes('tablet')) {
        icon = '📟';
      }
    }

    // Truncar descripción si es muy larga
    const descripcionTruncada = this.truncarTexto(descripcion, 35);

    // 🔥 AGREGAR INFORMACIÓN ADICIONAL DEL ITEM SI ESTÁ DISPONIBLE
    let infoAdicional = '';
    if (item.codigoBarras) {
      infoAdicional += ` <span style="opacity: 0.7; font-size: 6px;">[${item.codigoBarras}]</span>`;
    }

    // 🔥 AGREGAR DESCUENTO DEL ITEM SI EXISTE
    const descuentoItem = parseFloat(item.descuento || 0);
    if (descuentoItem > 0) {
      const precioUnitario = parseFloat(item.precioUnitario || 0);
      const esDolares = precioUnitario < 100;
      const descuentoFormateado = esDolares ?
        `-$${this.formatearDolares(descuentoItem)}` :
        `-${this.formatearBolivares(descuentoItem)} Bs`;
      infoAdicional += ` <span style="opacity: 0.7; font-size: 6px; color: #dc2626;">[Desc: ${descuentoFormateado}]</span>`;
    }

    // 🔥 AGREGAR TASA DE CAMBIO SI ESTÁ DISPONIBLE (SOLO EN PRIMERA FILA)
    let tasaCambioInfo = '';
    if (transaccion.tasaCambioUsada || transaccion.tasa_cambio_usada) {
      const tasa = parseFloat(transaccion.tasaCambioUsada || transaccion.tasa_cambio_usada || 0);
      if (tasa > 0) {
        tasaCambioInfo = ` <span style="opacity: 0.6; font-size: 6px; color: #6b7280;">[TC: ${this.formatearBolivares(tasa)} Bs/$]</span>`;
      }
    }

    return `<span class="item-icon">${icon}</span><span class="item-descripcion">${descripcionTruncada}${infoAdicional}${tasaCambioInfo}</span>`;
  }

  // GENERAR DETALLES COMPLETOS DE ITEMS (PARA CASOS SIN ITEMS ESPECÍFICOS) CON TASA DE CAMBIO Y DESCUENTO
  static generarDetallesItemCompletos(transaccion) {
    let itemsTexto = [];

    // Si hay items específicos, mostrar TODOS
    if (transaccion.items && transaccion.items.length > 0) {
      transaccion.items.forEach((item, index) => {
        const detalleItem = this.generarDetalleItemIndividual(item, transaccion);
        const cantidad = item.cantidad || 1;
        const textoItem = cantidad > 1 ? `${cantidad}x ` + detalleItem : detalleItem;

        itemsTexto.push(`<span class="item-linea">${textoItem}</span>`);
      });
    } else {
      // Si no hay items, usar categoría
      let icon = '💰';
      let descripcion = transaccion.categoria || 'Transacción general';

      // Detectar por categoría
      const categoria = descripcion.toLowerCase();
      if (categoria.includes('servicio') || categoria.includes('reparacion')) {
        icon = '🔧';
      } else if (categoria.includes('venta') || categoria.includes('producto')) {
        icon = '📱';
      } else if (categoria.includes('vuelto')) {
        icon = '💸';
        descripcion = 'Vuelto entregado';
      } else if (categoria.includes('gasto') || categoria.includes('pago')) {
        icon = '💰';
      }

      const descripcionTruncada = this.truncarTexto(descripcion, 35);

      // 🔥 AGREGAR DESCUENTO TOTAL DE LA TRANSACCIÓN SI EXISTE
      let descuentoInfo = '';
      const descuentoTotal = parseFloat(transaccion.descuentoTotal || transaccion.descuento_total || 0);
      if (descuentoTotal > 0) {
        // Determinar moneda del descuento basándose en los pagos o totales
        const tieneUsd = parseFloat(transaccion.totalUsd || 0) > 0;
        const descuentoFormateado = tieneUsd ?
          `-$${this.formatearDolares(descuentoTotal)}` :
          `-${this.formatearBolivares(descuentoTotal)} Bs`;
        descuentoInfo = ` <span style="opacity: 0.7; font-size: 6px; color: #dc2626;">[Desc: ${descuentoFormateado}]</span>`;
      }

      // 🔥 AGREGAR TASA DE CAMBIO SI ESTÁ DISPONIBLE
      let tasaCambioInfo = '';
      if (transaccion.tasaCambioUsada || transaccion.tasa_cambio_usada) {
        const tasa = parseFloat(transaccion.tasaCambioUsada || transaccion.tasa_cambio_usada || 0);
        if (tasa > 0) {
          tasaCambioInfo = ` <span style="opacity: 0.6; font-size: 6px; color: #6b7280;">[TC: ${this.formatearBolivares(tasa)} Bs/$]</span>`;
        }
      }

      itemsTexto.push(`<span class="item-linea"><span class="item-icon">${icon}</span><span class="item-descripcion">${descripcionTruncada}${descuentoInfo}${tasaCambioInfo}</span></span>`);
    }

    // Si hay muchos items, mostrar todos con salto de línea
    return itemsTexto.join('');
  }

  // 🔥 GENERAR CANTIDAD Y PRECIO CORREGIDO (BUG SOLUCIONADO)
  static generarCantidadPrecioCorregido(transaccion) {
    // Si hay items específicos, calcular desde items
    if (transaccion.items && transaccion.items.length > 0) {
      if (transaccion.items.length === 1) {
        const item = transaccion.items[0];
        const cantidad = item.cantidad || 1;
        const precio = item.precioUnitario || 0;

        if (precio > 0) {
          // 🔥 CORREGIDO: Determinar moneda basándose en datos reales, priorizando Bs
          let esDolares = false;
          if (item.moneda) {
            esDolares = item.moneda === 'usd' || item.moneda === 'USD';
          } else {
            const totalBsTransaccion = parseFloat(transaccion.totalBs) || 0;
            const totalUsdTransaccion = parseFloat(transaccion.totalUsd) || 0;

            if (totalUsdTransaccion > 0 && totalBsTransaccion === 0) {
              esDolares = true;
            } else if (totalBsTransaccion > 0) {
              esDolares = false; // Priorizar Bs
            } else if (transaccion.pagos && transaccion.pagos.length > 0) {
              const pagoBs = transaccion.pagos.find(p =>
                p.metodo === 'efectivo_bs' || p.metodo === 'pago_movil' || p.metodo === 'transferencia'
              );
              esDolares = !pagoBs;
            }
          }
          const moneda = esDolares ? '$' : 'Bs ';
          const precioFormateado = esDolares ? this.formatearDolares(precio) : this.formatearBolivares(precio);
          return `${cantidad} × ${moneda}${precioFormateado}`;
        }
      } else {
        // Múltiples items
        const totalItems = transaccion.items.reduce((sum, item) => sum + (item.cantidad || 1), 0);
        return `${totalItems} items`;
      }
    }

    // 🔥 FALLBACK: Calcular desde totales de la transacción (CORREGIDO)
    const totalBs = transaccion.totalBs || 0;
    const totalUsd = transaccion.totalUsd || 0;

    // Si solo hay una moneda, mostrar como 1 unidad de esa moneda
    if (totalUsd > 0 && totalBs === 0) {
      return `1 × $${this.formatearDolares(totalUsd)}`;
    } else if (totalBs > 0 && totalUsd === 0) {
      return `1 × ${this.formatearBolivares(totalBs)} Bs`;
    } else if (totalUsd > 0 && totalBs > 0) {
      // Transacción mixta
      return `Mixta`;
    }

    return 'N/A';
  }

  // 🔥 GENERAR MÉTODOS DE PAGO CON MONTO Y MONEDA ORIGINAL (MEJORADO)
  static generarMetodosPagoCorregidos(pagos, transaccion = null) {
    // 🔥 Caso especial: Vueltos - usar pagos reales si existen, sino usar metodoPagoPrincipal como fallback
    if (transaccion && transaccion.categoria?.includes('Vuelto')) {
      // Si hay pagos reales, usarlos (preferido)
      if (pagos && pagos.length > 0) {
        return pagos.map(pago => {
          const monto = parseFloat(pago.monto || 0);
          const moneda = pago.moneda || (pago.metodo?.includes('_usd') || pago.metodo?.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance' ? 'usd' : 'bs');
          return this.formatearMetodoPagoConMonto(pago.metodo, monto, moneda);
        }).join('<br/>');
      }
      // Fallback: usar metodoPagoPrincipal si no hay pagos
      if (transaccion.metodoPagoPrincipal) {
        const metodo = transaccion.metodoPagoPrincipal;
        // Determinar moneda basándose en el método de pago
        const monedaVuelto = metodo?.includes('_usd') || metodo?.includes('usd') || metodo === 'zelle' || metodo === 'binance' ? 'usd' : 'bs';
        // Usar el monto en la moneda original del método
        const montoVuelto = monedaVuelto === 'usd'
          ? (transaccion.totalUsd || 0)
          : (transaccion.totalBs || 0);
        return this.formatearMetodoPagoConMonto(metodo, montoVuelto, monedaVuelto);
      }
    }

    // 🔥 Caso normal: usar array de pagos con montos reales (MEJORADO)
    if (!pagos || pagos.length === 0) {
      return '<span class="metodo-pago">N/A</span>';
    }

    // Mostrar todos los métodos con sus montos reales en su moneda original
    return pagos.map(pago => {
      const monto = parseFloat(pago.monto || 0);
      const moneda = pago.moneda || (pago.metodo?.includes('_usd') || pago.metodo?.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance' ? 'usd' : 'bs');
      return this.formatearMetodoPagoConMonto(pago.metodo, monto, moneda);
    }).join('<br/>');
  }

  // 🔥 FUNCIÓN HELPER PARA FORMATEAR MÉTODO DE PAGO CON MONTO Y MONEDA ORIGINAL (NUEVA)
  static formatearMetodoPagoConMonto(metodo, monto, moneda) {
    let clase = 'metodo-pago';
    let texto = '';
    let montoFormateado = '';

    // Determinar moneda si no está especificada
    if (!moneda) {
      if (metodo?.includes('_usd') || metodo?.includes('usd') || metodo === 'zelle' || metodo === 'binance') {
        moneda = 'usd';
      } else {
        moneda = 'bs';
      }
    }

    // Formatear monto según moneda
    if (monto > 0) {
      if (moneda === 'usd') {
        montoFormateado = `$${this.formatearDolares(monto)}`;
      } else {
        montoFormateado = `${this.formatearBolivares(monto)} Bs`;
      }
    }

    // Determinar texto y clase según método
    switch (metodo) {
      case 'pago_movil':
        clase += ' metodo-pm';
        texto = 'PM';
        break;
      case 'efectivo_bs':
        clase += ' metodo-bs';
        texto = 'Efec.'; // ✅ Cambiar "Bs" a "Efec." para efectivo en bolívares
        break;
      case 'efectivo_usd':
        clase += ' metodo-usd';
        texto = 'USD';
        break;
      case 'punto_venta':
      case 'punto de venta':
        clase += ' metodo-punto';
        texto = 'POS';
        break;
      case 'transferencia':
        clase += ' metodo-transferencia';
        texto = 'TRANS';
        break;
      case 'zelle':
        clase += ' metodo-usd';
        texto = 'ZELLE';
        break;
      case 'binance':
        clase += ' metodo-usd';
        texto = 'BIN';
        break;
      case 'tarjeta':
        clase += ' metodo-bs';
        texto = 'TARJ';
        break;
      default:
        texto = metodo ? metodo.replace(/_/g, ' ').toUpperCase().slice(0, 4) : 'N/A';
    }

    // Retornar método con monto en su moneda original
    return `<span class="${clase}">${texto} ${montoFormateado}</span>`;
  }

  // 🔥 FUNCIÓN HELPER LEGACY PARA COMPATIBILIDAD (mantener por si acaso)
  static formatearMetodoPago(metodo) {
    return this.formatearMetodoPagoConMonto(metodo, 0, null);
  }

  // 🔥 GENERAR TOTAL DESDE PAGOS REALES RESPETANDO MONEDA ORIGINAL Y MOSTRAR DESCUENTO (MEJORADO)
  static generarTotalTransaccionCorregido(transaccion, esIngreso) {
    const signo = esIngreso ? '+' : '-';

    // Para vueltos, usar los pagos reales para determinar la moneda correcta
    if (transaccion.categoria?.includes('Vuelto')) {
      // Si hay pagos reales, usarlos para determinar moneda y monto
      if (transaccion.pagos && transaccion.pagos.length > 0) {
        const pago = transaccion.pagos[0]; // Tomar el primer pago del vuelto
        const monto = parseFloat(pago.monto || 0);
        const moneda = pago.moneda || (pago.metodo?.includes('_usd') || pago.metodo?.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance' ? 'usd' : 'bs');

        if (moneda === 'usd') {
          return `-$${this.formatearDolares(monto)}`;
        } else {
          return `-${this.formatearBolivares(monto)} Bs`;
        }
      }
      // Fallback: usar totales si no hay pagos
      const montoVuelto = transaccion.totalBs || transaccion.totalUsd || 0;
      // Determinar moneda basándose en el método de pago principal
      const metodo = transaccion.metodoPagoPrincipal || '';
      const monedaVuelto = metodo.includes('_usd') || metodo.includes('usd') || metodo === 'zelle' || metodo === 'binance' ? 'usd' : 'bs';

      if (monedaVuelto === 'usd' && transaccion.totalUsd > 0) {
        return `-$${this.formatearDolares(transaccion.totalUsd)}`;
      } else {
        return `-${this.formatearBolivares(montoVuelto)} Bs`;
      }
    }

    // 🔥 CALCULAR TOTALES DESDE PAGOS REALES RESPETANDO MONEDA ORIGINAL (MEJORADO)
    let totalBsReal = 0;
    let totalUsdReal = 0;

    if (transaccion.pagos && transaccion.pagos.length > 0) {
      // Sumar montos desde pagos reales respetando su moneda original
      transaccion.pagos.forEach(pago => {
        const monto = parseFloat(pago.monto || 0);
        const moneda = pago.moneda || (pago.metodo?.includes('_usd') || pago.metodo?.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance' ? 'usd' : 'bs');

        if (moneda === 'usd') {
          totalUsdReal += monto;
        } else {
          totalBsReal += monto;
        }
      });
    } else {
      // Fallback: usar totales de la transacción si no hay pagos
      totalBsReal = parseFloat(transaccion.totalBs || 0);
      totalUsdReal = parseFloat(transaccion.totalUsd || 0);
    }

    // 🔥 AGREGAR INFORMACIÓN DE DESCUENTO SI EXISTE
    const descuentoTotal = parseFloat(transaccion.descuentoTotal || transaccion.descuento_total || 0);
    let descuentoInfo = '';

    if (descuentoTotal > 0) {
      // Determinar moneda del descuento basándose en los totales
      if (totalUsdReal > 0) {
        // Si hay pagos en USD, el descuento probablemente es en USD
        descuentoInfo = `<br/><span style="font-size: 7px; color: #dc2626; opacity: 0.8;">Desc: -$${this.formatearDolares(descuentoTotal)}</span>`;
      } else {
        // Si solo hay pagos en Bs, el descuento es en Bs
        descuentoInfo = `<br/><span style="font-size: 7px; color: #dc2626; opacity: 0.8;">Desc: -${this.formatearBolivares(descuentoTotal)} Bs</span>`;
      }
    }

    const totales = [];

    // Agregar total en dólares si existe (solo si hay pagos en USD)
    if (totalUsdReal > 0) {
      totales.push(`${signo}$${this.formatearDolares(totalUsdReal)}`);
    }

    // Agregar total en bolívares si existe (solo si hay pagos en Bs)
    if (totalBsReal > 0) {
      totales.push(`${signo}${this.formatearBolivares(totalBsReal)} Bs`);
    }

    // Si no hay totales, mostrar 0
    if (totales.length === 0) {
      return `${signo}0${descuentoInfo}`;
    }

    // 🔥 RETORNAR SEPARADO POR LÍNEAS PARA CLARIDAD + DESCUENTO
    return totales.join('<br/>') + descuentoInfo;
  }

  // 🔥 CALCULAR ESTADÍSTICAS CORREGIDAS USANDO PAGOS REALES (MEJORADO)
  static calcularEstadisticas(transacciones) {
    // 🔥 SEPARAR INGRESOS Y EGRESOS CORRECTAMENTE
    const ingresos = transacciones.filter(t => {
      const tipo = t.tipo?.toString().toLowerCase();
      return tipo === 'ingreso';
    });

    const egresos = transacciones.filter(t => {
      const tipo = t.tipo?.toString().toLowerCase();
      return tipo === 'egreso';
    });

    const usuarios = {};
    const items = {};

    // Procesar cada transacción CORRECTAMENTE usando pagos reales
    transacciones.forEach(t => {
      const nombreUsuario = t.usuario || 'Sistema';
      const tipoTransaccion = t.tipo?.toString().toLowerCase();
      const esIngreso = tipoTransaccion === 'ingreso';

      // Estadísticas por usuario
      if (!usuarios[nombreUsuario]) {
        usuarios[nombreUsuario] = {
          nombre: nombreUsuario,
          ventas: 0,
          ventasTotalUsd: 0,
          ventasTotalBs: 0,
          montoUsd: 0,
          montoBs: 0,
          transacciones: 0
        };
      }

      usuarios[nombreUsuario].transacciones++;

      // 🔥 CALCULAR MONTOS DESDE PAGOS REALES RESPETANDO MONEDA ORIGINAL
      let montoUsdReal = 0;
      let montoBsReal = 0;

      if (t.pagos && t.pagos.length > 0) {
        t.pagos.forEach(pago => {
          const monto = parseFloat(pago.monto || 0);
          const moneda = pago.moneda || (pago.metodo?.includes('_usd') || pago.metodo?.includes('usd') || pago.metodo === 'zelle' || pago.metodo === 'binance' ? 'usd' : 'bs');

          if (moneda === 'usd') {
            montoUsdReal += monto;
          } else {
            montoBsReal += monto;
          }
        });
      } else {
        // Fallback: usar totales de transacción
        montoUsdReal = parseFloat(t.totalUsd || 0);
        montoBsReal = parseFloat(t.totalBs || 0);
      }

      // 🔥 SOLO CONTAR VENTAS (INGRESOS) PARA ESTADÍSTICAS
      if (esIngreso) {
        usuarios[nombreUsuario].ventas++;
        usuarios[nombreUsuario].ventasTotalUsd += montoUsdReal;
        usuarios[nombreUsuario].ventasTotalBs += montoBsReal;
        usuarios[nombreUsuario].montoUsd += montoUsdReal;
        usuarios[nombreUsuario].montoBs += montoBsReal;
      }

      // 🔥 ESTADÍSTICAS POR ITEM SOLO PARA INGRESOS usando pagos reales
      if (esIngreso && t.items && t.items.length > 0) {
        t.items.forEach(item => {
          const descripcion = item.producto?.descripcion || item.descripcion || t.categoria || 'Item desconocido';
          const precio = parseFloat(item.precioUnitario || 0);
          const cantidad = parseInt(item.cantidad || 1);
          const subtotal = parseFloat(item.subtotal || (precio * cantidad));

          // 🔥 CORREGIDO: Determinar moneda del item basándose en datos reales
          let esDolares = false;
          if (item.moneda) {
            esDolares = item.moneda === 'usd' || item.moneda === 'USD';
          } else if (t.pagos && t.pagos.length > 0) {
            const pagoUsd = t.pagos.find(p =>
              p.moneda === 'usd' || p.metodo?.includes('_usd') || p.metodo === 'efectivo_usd' ||
              p.metodo === 'zelle' || p.metodo === 'binance'
            );
            esDolares = !!pagoUsd;
          } else if (montoUsdReal > 0 && montoBsReal === 0) {
            esDolares = true;
          }

          if (!items[descripcion]) {
            items[descripcion] = {
              descripcion: this.truncarTexto(descripcion, 30),
              cantidad: 0,
              precioUsd: 0,
              precioBs: 0,
              veces: 0,
              montoTotalUsd: 0,
              montoTotalBs: 0,
              esDolares: esDolares
            };
          }

          items[descripcion].cantidad += cantidad;
          items[descripcion].veces++;

          if (esDolares) {
            items[descripcion].montoTotalUsd += subtotal;
            if (precio > items[descripcion].precioUsd) {
              items[descripcion].precioUsd = precio;
            }
          } else {
            items[descripcion].montoTotalBs += subtotal;
            if (precio > items[descripcion].precioBs) {
              items[descripcion].precioBs = precio;
            }
          }
        });
      } else if (esIngreso && t.categoria && !t.categoria.includes('Vuelto')) {
        // Si no hay items pero es un ingreso (no vuelto), usar los pagos reales
        const descripcion = t.categoria;

        if (montoUsdReal > 0 || montoBsReal > 0) {
          if (!items[descripcion]) {
            items[descripcion] = {
              descripcion: this.truncarTexto(descripcion, 30),
              cantidad: 0,
              precioUsd: 0,
              precioBs: 0,
              veces: 0,
              montoTotalUsd: 0,
              montoTotalBs: 0,
              esDolares: montoUsdReal > 0
            };
          }

          items[descripcion].cantidad += 1;
          items[descripcion].veces++;
          items[descripcion].montoTotalUsd += montoUsdReal;
          items[descripcion].montoTotalBs += montoBsReal;

          if (montoUsdReal > items[descripcion].precioUsd) {
            items[descripcion].precioUsd = montoUsdReal;
          }
          if (montoBsReal > items[descripcion].precioBs) {
            items[descripcion].precioBs = montoBsReal;
          }
        }
      }
    });

    // 🔥 ENCONTRAR ESTADÍSTICAS CORREGIDAS
    const usuariosArray = Object.values(usuarios);
    const itemsArray = Object.values(items);

    // Item más valioso (por precio unitario más alto, usando tasa de cambio histórica cuando sea necesario)
    const itemMasValioso = itemsArray.reduce((max, item) => {
      if (!max) return item;

      // Si ambos tienen precio en USD, comparar directamente
      if (max.precioUsd > 0 && item.precioUsd > 0) {
        return item.precioUsd > max.precioUsd ? item : max;
      }

      // Si ambos tienen precio en Bs, comparar directamente
      if (max.precioBs > 0 && item.precioBs > 0) {
        return item.precioBs > max.precioBs ? item : max;
      }

      // Si uno es USD y otro Bs, usar una conversión aproximada conservadora (1 USD = 100 Bs mínimo)
      // Esto es solo para comparación, no para mostrar
      const valorMax = max.precioUsd > 0 ? max.precioUsd : max.precioBs / 100;
      const valorItem = item.precioUsd > 0 ? item.precioUsd : item.precioBs / 100;
      return valorItem > valorMax ? item : max;
    }, null);

    // Más vendido (por cantidad)
    const masVendido = itemsArray.reduce((max, item) =>
      (item.cantidad > (max?.cantidad || 0)) ? item : max, null);

    // 🔥 MEJOR VENDEDOR - Comparar usando montos reales, priorizando USD si existe
    const mejorVendedor = usuariosArray.reduce((max, user) => {
      if (!max) return user;

      // Si ambos tienen ventas en USD, comparar por USD
      if (max.ventasTotalUsd > 0 && user.ventasTotalUsd > 0) {
        return user.ventasTotalUsd > max.ventasTotalUsd ? user : max;
      }

      // Si ambos tienen ventas solo en Bs, comparar por Bs
      if (max.ventasTotalUsd === 0 && user.ventasTotalUsd === 0) {
        return user.ventasTotalBs > max.ventasTotalBs ? user : max;
      }

      // Si uno tiene USD y otro solo Bs, priorizar el que tiene USD
      if (user.ventasTotalUsd > 0 && max.ventasTotalUsd === 0) {
        return user;
      }
      if (max.ventasTotalUsd > 0 && user.ventasTotalUsd === 0) {
        return max;
      }

      return max;
    }, null);

    // Más activo (por número de transacciones)
    const masActivo = usuariosArray.reduce((max, user) =>
      (user.transacciones > (max?.transacciones || 0)) ? user : max, null);

    // 🔥 NUEVO: Generar resumen de usuarios ordenado por ventas
    const resumenUsuarios = usuariosArray
      .filter(u => u.ventas > 0 || u.transacciones > 0)
      .sort((a, b) => {
        // Ordenar por ventas totales (USD primero, luego Bs)
        if (b.ventasTotalUsd !== a.ventasTotalUsd) {
          return b.ventasTotalUsd - a.ventasTotalUsd;
        }
        return b.ventasTotalBs - a.ventasTotalBs;
      })
      .map(u => ({
        nombre: u.nombre,
        ventas: u.ventas,
        totalUsd: u.ventasTotalUsd,
        totalBs: u.ventasTotalBs,
        transacciones: u.transacciones
      }));

    // 🔥 NUEVO: Extraer cambios de tasa del día
    const tasasUsadas = new Map();
    transacciones.forEach(t => {
      const tasa = parseFloat(t.tasaCambioUsada || t.tasa_cambio_usada || 0);
      if (tasa > 0) {
        const hora = new Date(t.fechaHora).toLocaleTimeString('es-VE', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const key = `${tasa.toFixed(2)}`;

        if (!tasasUsadas.has(key)) {
          tasasUsadas.set(key, {
            valor: tasa,
            hora: hora,
            usuario: t.usuario || 'Sistema',
            fechaHora: new Date(t.fechaHora)
          });
        }
      }
    });

    // Convertir a array y ordenar por hora
    const cambiosTasa = Array.from(tasasUsadas.values())
      .sort((a, b) => a.fechaHora - b.fechaHora);

    const estadisticas = {
      itemMasValioso: itemMasValioso ? {
        ...itemMasValioso,
        precio: itemMasValioso.precioUsd > 0 ?
          `$${this.formatearDolares(itemMasValioso.precioUsd)}` :
          `${this.formatearBolivares(itemMasValioso.precioBs)} Bs`
      } : null,

      masVendido: masVendido ? {
        ...masVendido,
        cantidad: masVendido.cantidad
      } : null,

      mejorVendedor: mejorVendedor && (mejorVendedor.ventasTotalUsd > 0 || mejorVendedor.ventasTotalBs > 0) ? {
        ...mejorVendedor,
        montoFormateado: mejorVendedor.ventasTotalUsd > 0 ?
          `$${this.formatearDolares(mejorVendedor.ventasTotalUsd)}${mejorVendedor.ventasTotalBs > 0 ? ` + ${this.formatearBolivares(mejorVendedor.ventasTotalBs)} Bs` : ''}` :
          `${this.formatearBolivares(mejorVendedor.ventasTotalBs)} Bs`
      } : null,

      masActivo: masActivo,

      // 🔥 NUEVOS CAMPOS
      resumenUsuarios: resumenUsuarios,
      cambiosTasa: cambiosTasa
    };

    return estadisticas;
  }

  // FUNCIONES AUXILIARES
  static truncarTexto(texto, maxLength) {
    if (!texto) return 'N/A';
    return texto.length > maxLength ? texto.substring(0, maxLength - 3) + '...' : texto;
  }

  static formatearNumero(numero) {
    return (numero || 0).toFixed(2);
  }

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

  // GENERAR PDF FINAL CORREGIDO
  static async generarPDFCierre(datosCompletos) {
    let browser;

    try {
      console.log('🚀 Generando PDF COMPLETAMENTE CORREGIDO con items detallados...');

      if (!datosCompletos || !datosCompletos.caja) {
        throw new Error('Datos de caja incompletos para generar PDF');
      }

      // 🔥 DEBUG MEJORADO PARA DETECTAR TIPOS DE TRANSACCIONES E ITEMS
      console.log('🔍 DEBUG COMPLETO - Datos recibidos:', {
        total: datosCompletos.transacciones?.length || 0,
        transacciones: datosCompletos.transacciones?.map(t => ({
          id: t.id,
          tipo: t.tipo,
          categoria: t.categoria,
          totalBs: t.totalBs,
          totalUsd: t.totalUsd,
          itemsCount: t.items?.length || 0,
          items: t.items?.map(item => ({
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precioUnitario
          })) || []
        })) || []
      });

      const htmlContent = this.generarHTMLCierre(datosCompletos);

      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // ✅ Obtener fecha de la caja (fecha de apertura) para el nombre del archivo
      let fechaCaja = null;
      if (datosCompletos.caja?.fecha) {
        const fechaStr = datosCompletos.caja.fecha;

        // Intentar diferentes formatos de fecha
        // Formato 1: ISO string (2025-01-15T00:00:00.000Z)
        fechaCaja = new Date(fechaStr);

        if (isNaN(fechaCaja.getTime())) {
          // Formato 2: DD/MM/YYYY
          const partes = fechaStr.split('/');
          if (partes.length === 3) {
            fechaCaja = new Date(partes[2], partes[1] - 1, partes[0]);
          }
        }

        if (isNaN(fechaCaja.getTime())) {
          // Formato 3: YYYY-MM-DD
          const partes = fechaStr.split('-');
          if (partes.length === 3) {
            fechaCaja = new Date(partes[0], partes[1] - 1, partes[2]);
          }
        }

        // Si aún no es válida, usar null
        if (isNaN(fechaCaja.getTime())) {
          fechaCaja = null;
          console.warn(`⚠️ No se pudo parsear la fecha de la caja: ${fechaStr}`);
        }
      }

      // ✅ Usar fecha de generación para la hora exacta
      const fechaGeneracion = datosCompletos.fechaGeneracion
        ? new Date(datosCompletos.fechaGeneracion)
        : new Date();

      // Validar que la fecha de generación sea válida
      let fechaGeneracionObj = fechaGeneracion;
      if (isNaN(fechaGeneracionObj.getTime())) {
        console.warn('⚠️ Fecha de generación inválida, usando fecha actual');
        fechaGeneracionObj = new Date();
      }

      // ✅ Formatear fecha de caja: YYYY-MM-DD (usar fecha de caja si está disponible, sino fecha de generación)
      const fechaParaNombre = fechaCaja && !isNaN(fechaCaja.getTime()) ? fechaCaja : fechaGeneracionObj;
      const fechaFormateada = fechaParaNombre.toISOString().split('T')[0]; // YYYY-MM-DD

      // ✅ Formatear hora de generación: HHmmss
      const horaGeneracion = fechaGeneracionObj.toISOString()
        .split('T')[1]           // 02:04:06.926Z
        .split('.')[0]            // 02:04:06
        .replace(/:/g, '');       // 020406

      const tienesDif = datosCompletos.diferencias && (
        datosCompletos.diferencias.bs !== 0 ||
        datosCompletos.diferencias.usd !== 0 ||
        datosCompletos.diferencias.pagoMovil !== 0
      );

      const esPendiente = datosCompletos.caja?.esCajaPendiente || false;
      const sufijoPendiente = esPendiente ? '-PENDIENTE' : '';
      const sufijoDif = tienesDif ? '-DIF' : '';

      // ✅ Nombre del archivo: cierre-caja-YYYY-MM-DD-HHmmss[-PENDIENTE][-DIF].pdf
      const nombreArchivo = `cierre-caja-${fechaFormateada}-${horaGeneracion}${sufijoPendiente}${sufijoDif}.pdf`;

      // ✅ Ruta absoluta al directorio uploads (desde server/src/services -> server/uploads)
      const uploadsDir = path.join(__dirname, '../../uploads');

      // ✅ Crear directorio si no existe
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`📁 Directorio /uploads creado: ${uploadsDir}`);
      }

      // ✅ Ruta completa del archivo PDF
      const rutaPDF = path.join(uploadsDir, nombreArchivo);

      // ✅ Log para verificar ruta de guardado
      console.log(`📄 Guardando PDF en: ${rutaPDF}`);
      console.log(`📁 Directorio uploads: ${uploadsDir}`);

      await page.pdf({
        path: rutaPDF,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '5mm',
          right: '5mm',
          bottom: '5mm',
          left: '5mm'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: false,
        width: '210mm',
        height: '297mm'
      });

      // ✅ Verificar que el archivo se guardó correctamente
      if (!fs.existsSync(rutaPDF)) {
        throw new Error(`Error: El PDF no se guardó en ${rutaPDF}`);
      }

      const fileSize = fs.statSync(rutaPDF).size;
      const fileStats = fs.statSync(rutaPDF);

      console.log(`✅ PDF COMPLETAMENTE CORREGIDO Y DETALLADO generado: ${nombreArchivo}`);
      console.log(`📄 Ruta completa: ${rutaPDF}`);
      console.log(`📊 Tamaño del archivo: ${(fileSize / 1024).toFixed(2)} KB`);
      console.log(`📅 Fecha de creación del archivo: ${fileStats.birthtime.toISOString()}`);
      console.log(`📅 Fecha de modificación del archivo: ${fileStats.mtime.toISOString()}`);
      console.log(`📋 Tipo de cierre: ${esPendiente ? 'CAJA PENDIENTE' : 'CIERRE NORMAL'}${tienesDif ? ' CON DIFERENCIAS' : ''}`);
      console.log(`📊 TODAS LAS CORRECCIONES APLICADAS:`);
      console.log(`   - ✅ Tipos de transacción (INGRESO/EGRESO) corregidos`);
      console.log(`   - ✅ Métodos de pago legibles (USD, Bs, PM, POS)`);
      console.log(`   - ✅ Totales por moneda separados claramente`);
      console.log(`   - ✅ Items detallados FILA POR FILA`);
      console.log(`   - ✅ Estadísticas basadas en datos reales`);
      console.log(`   - ✅ Iconos específicos por tipo de producto`);
      console.log(`   - ✅ Precios unitarios y subtotales por item`);

      return {
        success: true,
        rutaPDF,
        nombreArchivo,
        size: fs.statSync(rutaPDF).size,
        incluyeDiferencias: tienesDif,
        diferenciasDetalle: tienesDif ? datosCompletos.diferencias : null,
        transaccionesIncluidas: datosCompletos.transacciones?.length || 0,
        itemsDetallados: datosCompletos.transacciones?.reduce((total, t) =>
          total + (t.items?.length || 0), 0) || 0,
        correccionesAplicadas: [
          '✅ Detección correcta de tipos INGRESO/EGRESO',
          '✅ Métodos de pago legibles y correctos',
          '✅ Totales separados por moneda claramente',
          '✅ Items detallados FILA POR FILA con iconos',
          '✅ Estadísticas calculadas desde datos reales',
          '✅ Formato cantidad × precio corregido',
          '✅ Colores y estilos diferenciados por tipo',
          '✅ Precios unitarios y subtotales individuales',
          '✅ Indicadores de continuación para items múltiples'
        ]
      };

    } catch (error) {
      console.error('⛔ Error generando PDF completamente corregido:', error);
      throw error;

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = PDFCierreService;