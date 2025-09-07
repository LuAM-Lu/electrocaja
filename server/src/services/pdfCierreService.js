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
            .col-metodo { width: 9%; text-align: center; }
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
            
            /* 🔥 MÉTODOS DE PAGO CORREGIDOS (BUG SOLUCIONADO) */
            .metodo-pago {
                font-size: 7px;
                padding: 1px 3px;
                border-radius: 2px;
                display: inline-block;
                margin: 1px;
                font-weight: bold;
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
                <h1>ELECTRO CAJA - REPORTE DE CIERRE</h1>
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
            
            <!-- RESUMEN FINANCIERO HORIZONTAL -->
            <div class="resumen-financiero">
                <div class="resumen-card bolivares">
                    <div class="titulo">BOLÍVARES</div>
                    <div>Inicial: ${this.formatearBolivares(caja.montoInicialBs || 0)}</div>
                    <div>+${this.formatearBolivares(caja.totalIngresosBs || 0)} / -${this.formatearBolivares(caja.totalEgresosBs || 0)}</div>
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
                    <div>+${this.formatearBolivares(caja.totalPagoMovil || 0)} / -0</div>
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

            <!-- ESTADÍSTICAS DEL DÍA -->
            <div class="footer-stats">
                <h3>Estadísticas del Día</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="label">ITEM MÁS VALIOSO</div>
                        <div class="value">${estadisticas.itemMasValioso?.descripcion || 'N/A'} - ${estadisticas.itemMasValioso?.precio || '0'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">MÁS VENDIDO</div>
                        <div class="value">${estadisticas.masVendido?.descripcion || 'N/A'} - ${estadisticas.masVendido?.cantidad || '0'} unidades</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">MEJOR VENDEDOR</div>
                        <div class="value">${estadisticas.mejorVendedor?.nombre || 'N/A'} - ${estadisticas.mejorVendedor?.ventas || '0'} ventas (${estadisticas.mejorVendedor?.montoFormateado || '0'})</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">MÁS ACTIVO</div>
                        <div class="value">${estadisticas.masActivo?.nombre || 'N/A'} - ${estadisticas.masActivo?.transacciones || '0'} transacciones</div>
                    </div>
                </div>
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
    console.log(`🔍 DEBUG Transacción ${transaccion.id}:`, {
      tipo: transaccion.tipo,
      categoria: transaccion.categoria,
      totalBs: transaccion.totalBs,
      totalUsd: transaccion.totalUsd,
      itemsCount: transaccion.items?.length || 0,
      usuario: transaccion.usuario
    });

    // 🔥 SI LA TRANSACCIÓN TIENE MÚLTIPLES ITEMS, CREAR FILA POR CADA ITEM
    if (transaccion.items && transaccion.items.length > 1) {
      console.log(`📦 Transacción ${transaccion.id} tiene ${transaccion.items.length} items - generando filas separadas`);
      
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
    
    // Determinar moneda del item
    const esDolares = precioUnitario < 100; // Heurística
    const moneda = esDolares ? '$' : 'Bs';
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
    
    // 🔥 TOTAL DEL ITEM INDIVIDUAL
    const signo = esIngreso ? '+' : '-';
    let subtotalFormateado;
    
    if (subtotal > 0) {
      subtotalFormateado = esDolares ? 
        `${signo}$${this.formatearDolares(subtotal)}` :
        `${signo}${this.formatearBolivares(subtotal)} Bs`;
    } else {
      // Si no hay subtotal, usar proporción del total de la transacción
      const totalItems = transaccion.items.length;
      const proporcionBs = (transaccion.totalBs || 0) / totalItems;
      const proporcionUsd = (transaccion.totalUsd || 0) / totalItems;
      
      if (proporcionUsd > 0) {
        subtotalFormateado = `${signo}$${this.formatearDolares(proporcionUsd)}`;
      } else {
        subtotalFormateado = `${signo}${this.formatearBolivares(proporcionBs)} Bs`;
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

  // 🔥 NUEVA FUNCIÓN PARA GENERAR DETALLE DE ITEM INDIVIDUAL
  static generarDetalleItemIndividual(item, transaccion) {
    let icon = '📦';
    let descripcion = item.descripcion || 'Item sin descripción';
    
    // Detectar icono por tipo de producto
    if (item.producto) {
      const tipo = item.producto.tipo?.toLowerCase();
      switch(tipo) {
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
    const descripcionTruncada = this.truncarTexto(descripcion, 45);
    
    // 🔥 AGREGAR INFORMACIÓN ADICIONAL DEL ITEM SI ESTÁ DISPONIBLE
    let infoAdicional = '';
    if (item.codigoBarras) {
      infoAdicional += ` <span style="opacity: 0.7; font-size: 6px;">[${item.codigoBarras}]</span>`;
    }
    
    return `<span class="item-icon">${icon}</span><span class="item-descripcion">${descripcionTruncada}${infoAdicional}</span>`;
  }

  // GENERAR DETALLES COMPLETOS DE ITEMS (PARA CASOS SIN ITEMS ESPECÍFICOS)
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
     
     const descripcionTruncada = this.truncarTexto(descripcion, 40);
     itemsTexto.push(`<span class="item-linea"><span class="item-icon">${icon}</span><span class="item-descripcion">${descripcionTruncada}</span></span>`);
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
         // Determinar moneda basada en el precio
         const esDolares = precio < 100; // Heurística: precios menores a 100 probablemente son USD
         const moneda = esDolares ? '$' : 'Bs';
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

 // 🔥 GENERAR MÉTODOS DE PAGO CORREGIDOS (BUG SOLUCIONADO)
 static generarMetodosPagoCorregidos(pagos, transaccion = null) {
   // 🔥 Caso especial: Vueltos usan metodoPagoPrincipal (CORREGIDO)
   if (transaccion && transaccion.categoria?.includes('Vuelto') && transaccion.metodoPagoPrincipal) {
     const metodo = transaccion.metodoPagoPrincipal;
     return this.formatearMetodoPago(metodo);
   }

   // 🔥 Caso normal: usar array de pagos (CORREGIDO)
   if (!pagos || pagos.length === 0) {
     return '<span class="metodo-pago">N/A</span>';
   }

   // Mostrar hasta 2 métodos para evitar overflow
   return pagos.slice(0, 2).map(pago => {
     return this.formatearMetodoPago(pago.metodo);
   }).join(' ') + (pagos.length > 2 ? ' +' + (pagos.length - 2) : '');
 }

 // 🔥 FUNCIÓN HELPER PARA FORMATEAR MÉTODO DE PAGO (NUEVA)
 static formatearMetodoPago(metodo) {
   let clase = 'metodo-pago';
   let texto = '';
   
   switch (metodo) {
     case 'pago_movil':
       clase += ' metodo-pm';
       texto = 'PM';
       break;
     case 'efectivo_bs':
       clase += ' metodo-bs';
       texto = 'Bs';
       break;
     case 'efectivo_usd':
       clase += ' metodo-usd';
       texto = 'USD';
       break;
     case 'punto_venta':
       clase += ' metodo-punto';
       texto = 'POS';
       break;
     case 'transferencia':
       clase += ' metodo-transferencia';
       texto = 'TRANS';
       break;
     default:
       texto = metodo ? metodo.replace(/_/g, ' ').toUpperCase().slice(0, 4) : 'N/A';
   }
   
   return `<span class="${clase}">${texto}</span>`;
 }

 // 🔥 GENERAR TOTAL POR MONEDA SEPARADA (BUG SOLUCIONADO)
 static generarTotalTransaccionCorregido(transaccion, esIngreso) {
   const signo = esIngreso ? '+' : '-';
   
   // Para vueltos, usar el monto específico del vuelto
   if (transaccion.categoria?.includes('Vuelto')) {
     const montoVuelto = transaccion.totalBs || transaccion.totalUsd || 0;
     if (transaccion.totalUsd > 0) {
       return `-$${this.formatearDolares(transaccion.totalUsd)}`;
     } else {
       return `-${this.formatearBolivares(montoVuelto)} Bs`;
     }
   }
   
   // 🔥 Para transacciones normales, SEPARAR MONEDAS CLARAMENTE (BUG SOLUCIONADO)
   const totalBs = transaccion.totalBs || 0;
   const totalUsd = transaccion.totalUsd || 0;
   
   const totales = [];
   
   // Agregar total en dólares si existe
   if (totalUsd > 0) {
     totales.push(`${signo}$${this.formatearDolares(totalUsd)}`);
   }
   
   // Agregar total en bolívares si existe
   if (totalBs > 0) {
     totales.push(`${signo}${this.formatearBolivares(totalBs)} Bs`);
   }
   
   // Si no hay totales, mostrar 0
   if (totales.length === 0) {
     return `${signo}0`;
   }
   
   // 🔥 RETORNAR SEPARADO POR LÍNEAS PARA CLARIDAD (BUG SOLUCIONADO)
   return totales.join('<br/>');
 }

 // 🔥 CALCULAR ESTADÍSTICAS CORREGIDAS (BUG SOLUCIONADO)
 static calcularEstadisticas(transacciones) {
   console.log('📊 Calculando estadísticas de', transacciones.length, 'transacciones');
   
   // 🔥 SEPARAR INGRESOS Y EGRESOS CORRECTAMENTE (BUG SOLUCIONADO)
   const ingresos = transacciones.filter(t => {
     const tipo = t.tipo?.toString().toLowerCase();
     console.log(`Transacción ${t.id}: tipo="${tipo}" -> es ingreso: ${tipo === 'ingreso'}`);
     return tipo === 'ingreso';
   });
   
   const egresos = transacciones.filter(t => {
     const tipo = t.tipo?.toString().toLowerCase();
     return tipo === 'egreso';
   });
   
   console.log(`📊 Estadísticas: ${ingresos.length} ingresos, ${egresos.length} egresos`);
   
   const usuarios = {};
   const items = {};
   
   // Procesar cada transacción CORRECTAMENTE
   transacciones.forEach(t => {
     const nombreUsuario = t.usuario || 'Sistema';
     const tipoTransaccion = t.tipo?.toString().toLowerCase();
     const esIngreso = tipoTransaccion === 'ingreso';
     
     // Estadísticas por usuario
     if (!usuarios[nombreUsuario]) {
       usuarios[nombreUsuario] = { 
         nombre: nombreUsuario, 
         ventas: 0, 
         ventasTotal: 0,
         monto: 0, 
         transacciones: 0 
       };
     }
     
     usuarios[nombreUsuario].transacciones++;
     
     // 🔥 SOLO CONTAR VENTAS (INGRESOS) PARA ESTADÍSTICAS (BUG SOLUCIONADO)
     if (esIngreso) {
       usuarios[nombreUsuario].ventas++;
       const montoUsd = t.totalUsd || 0;
       const montoBs = t.totalBs || 0;
       // Convertir todo a USD para comparación (usando tasa aproximada)
       const montoTotalUsd = montoUsd + (montoBs / 37);
       usuarios[nombreUsuario].monto += montoTotalUsd;
       usuarios[nombreUsuario].ventasTotal += montoTotalUsd;
     }
     
     // 🔥 ESTADÍSTICAS POR ITEM SOLO PARA INGRESOS (BUG SOLUCIONADO)
     if (esIngreso && t.items && t.items.length > 0) {
       t.items.forEach(item => {
         const descripcion = item.producto?.descripcion || item.descripcion || t.categoria || 'Item desconocido';
         const precio = item.precioUnitario || 0;
         const cantidad = item.cantidad || 1;
         
         if (!items[descripcion]) {
           items[descripcion] = {
             descripcion: this.truncarTexto(descripcion, 30),
             cantidad: 0,
             precio: precio,
             veces: 0,
             montoTotal: 0
           };
         }
         
         items[descripcion].cantidad += cantidad;
         items[descripcion].veces++;
         items[descripcion].montoTotal += (precio * cantidad);
         
         if (precio > items[descripcion].precio) {
           items[descripcion].precio = precio;
         }
       });
     } else if (esIngreso && t.categoria && !t.categoria.includes('Vuelto')) {
       // Si no hay items pero es un ingreso (no vuelto), usar la categoría
       const descripcion = t.categoria;
       const precio = (t.totalUsd || 0) || ((t.totalBs || 0) / 37);
       
       if (precio > 0) {
         if (!items[descripcion]) {
           items[descripcion] = {
             descripcion: this.truncarTexto(descripcion, 30),
             cantidad: 0,
             precio: precio,
             veces: 0,
             montoTotal: 0
           };
         }
         
         items[descripcion].cantidad += 1;
         items[descripcion].veces++;
         items[descripcion].montoTotal += precio;
         
         if (precio > items[descripcion].precio) {
           items[descripcion].precio = precio;
         }
       }
     }
   });

   // 🔥 ENCONTRAR ESTADÍSTICAS CORREGIDAS (BUG SOLUCIONADO)
   const usuariosArray = Object.values(usuarios);
   const itemsArray = Object.values(items);

   // Item más valioso (por precio unitario)
   const itemMasValioso = itemsArray.reduce((max, item) => 
     (item.precio > (max?.precio || 0)) ? item : max, null);
   
   // Más vendido (por cantidad)
   const masVendido = itemsArray.reduce((max, item) => 
     (item.cantidad > (max?.cantidad || 0)) ? item : max, null);
   
   // 🔥 MEJOR VENDEDOR CORREGIDO - Solo contar VENTAS (INGRESOS) (BUG SOLUCIONADO)
   const mejorVendedor = usuariosArray.reduce((max, user) => 
     (user.ventasTotal > (max?.ventasTotal || 0)) ? user : max, null);
   
   // Más activo (por número de transacciones)
   const masActivo = usuariosArray.reduce((max, user) => 
     (user.transacciones > (max?.transacciones || 0)) ? user : max, null);

   const estadisticas = {
     itemMasValioso: itemMasValioso ? {
       ...itemMasValioso,
       precio: itemMasValioso.precio > 50 ? 
         `${this.formatearBolivares(itemMasValioso.precio)} Bs` : 
         `$${this.formatearDolares(itemMasValioso.precio)}`
     } : null,
     
     masVendido: masVendido,
     
     mejorVendedor: mejorVendedor && mejorVendedor.ventasTotal > 0 ? {
       ...mejorVendedor,
       montoFormateado: `$${this.formatearDolares(mejorVendedor.ventasTotal)}`
     } : null,
     
     masActivo: masActivo
   };

   console.log('📊 Estadísticas calculadas:', {
     itemMasValioso: estadisticas.itemMasValioso?.descripcion,
     masVendido: estadisticas.masVendido?.descripcion,
     mejorVendedor: estadisticas.mejorVendedor?.nombre,
     masActivo: estadisticas.masActivo?.nombre
   });

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
     
     const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
     const tienesDif = datosCompletos.diferencias && (
       datosCompletos.diferencias.bs !== 0 || 
       datosCompletos.diferencias.usd !== 0 || 
       datosCompletos.diferencias.pagoMovil !== 0
     );
     
     const nombreArchivo = `cierre-detallado-${timestamp}-${Date.now()}${tienesDif ? '-DIF' : ''}.pdf`;
     
     const uploadsDir = path.join(__dirname, '../../uploads');
     if (!fs.existsSync(uploadsDir)) {
       fs.mkdirSync(uploadsDir, { recursive: true });
     }
     
     const rutaPDF = path.join(uploadsDir, nombreArchivo);
     
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
     
     console.log(`✅ PDF COMPLETAMENTE CORREGIDO Y DETALLADO generado: ${nombreArchivo}`);
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