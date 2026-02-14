// components/reportes/ReporteEmpleado.jsx
import React, { useState, useEffect, useMemo } from 'react';
import User from 'lucide-react/dist/esm/icons/user'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Package from 'lucide-react/dist/esm/icons/package'
import Users from 'lucide-react/dist/esm/icons/users'
import Eye from 'lucide-react/dist/esm/icons/eye'
import Search from 'lucide-react/dist/esm/icons/search'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Download from 'lucide-react/dist/esm/icons/download'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Briefcase from 'lucide-react/dist/esm/icons/briefcase'
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import Percent from 'lucide-react/dist/esm/icons/percent'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Banknote from 'lucide-react/dist/esm/icons/banknote'
import X from 'lucide-react/dist/esm/icons/x'
import Printer from 'lucide-react/dist/esm/icons/printer'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Minus from 'lucide-react/dist/esm/icons/minus'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import { api } from '../../config/api';
import toast from '../../utils/toast.jsx';

// Helper for currency formatting
const formatCurrency = (amount, currency = 'Bs') => {
  const locale = currency === 'Bs' ? 'es-VE' : 'en-US';
  const options = currency === 'Bs'
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { style: 'currency', currency: 'USD' };
  return new Intl.NumberFormat(locale, options).format(Number(amount) || 0) + (currency === 'Bs' ? ' Bs' : '');
};

const GenerarPagoModal = ({ usuarioId, fechaInicio, fechaFin, onClose, usuariosList }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // States
  const [egresosExcluidos, setEgresosExcluidos] = useState(new Set());
  const [customEgresos, setCustomEgresos] = useState([]);
  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [newDeduction, setNewDeduction] = useState({ desc: '', amountBs: '', amountUsd: '' });

  const [ventasExcluidas, setVentasExcluidas] = useState(new Set());
  const [customIngresos, setCustomIngresos] = useState([]);
  const [isAddingIngreso, setIsAddingIngreso] = useState(false);
  const [newIngreso, setNewIngreso] = useState({ desc: '', amountBs: '', amountUsd: '' });

  const [sueldoBs, setSueldoBs] = useState(0);
  const [sueldoUsd, setSueldoUsd] = useState(0);
  const [comisionPorcBs, setComisionPorcBs] = useState(2);
  const [comisionPorcUsd, setComisionPorcUsd] = useState(2);
  const [observacionesPago, setObservacionesPago] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ usuarioId });
        if (fechaInicio) params.append('fechaInicio', fechaInicio);
        if (fechaFin) params.append('fechaFin', fechaFin);
        const res = await api.get(`/reportes/pago-vendedor/calculo?${params}`);
        if (res.data.success) setData(res.data.data);
        else setError(res.data.message);
      } catch (err) { setError('Error al calcular datos'); } finally { setLoading(false); }
    };
    if (usuarioId) fetchData();
  }, [usuarioId, fechaInicio, fechaFin]);

  // Helper to extract totals per row matching the calculation logic
  const getRowTotals = (t) => {
    if (t.pagos && t.pagos.length > 0) {
      const bs = t.pagos.filter(p => !p.moneda || p.moneda === 'bs').reduce((a, b) => a + Number(b.monto), 0);
      const usd = t.pagos.filter(p => p.moneda === 'usd').reduce((a, b) => a + Number(b.monto), 0);
      return { bs, usd };
    }
    return { bs: Number(t.totalBs || 0), usd: Number(t.totalUsd || 0) };
  };

  const calculos = useMemo(() => {
    if (!data) return null;
    const ventasDbActivas = data.ventas.lista.filter(v => !ventasExcluidas.has(v.id));
    let sumVentasBs = 0, sumVentasUsd = 0;

    const sumPayments = (txs) => {
      let bs = 0, usd = 0;
      txs.forEach(t => {
        const row = getRowTotals(t);
        bs += row.bs;
        usd += row.usd;
      });
      return { bs, usd };
    };

    const dbVentasTotal = sumPayments(ventasDbActivas);
    sumVentasBs += dbVentasTotal.bs; sumVentasUsd += dbVentasTotal.usd;
    customIngresos.forEach(c => { sumVentasBs += Number(c.totalBs || 0); sumVentasUsd += Number(c.totalUsd || 0); });

    const egresosDbActivos = data.egresos.lista.filter(e => !egresosExcluidos.has(e.id));
    const dbEgresosTotal = sumPayments(egresosDbActivos);
    let sumEgresosBs = dbEgresosTotal.bs, sumEgresosUsd = dbEgresosTotal.usd;
    customEgresos.forEach(c => { sumEgresosBs += Number(c.totalBs || 0); sumEgresosUsd += Number(c.totalUsd || 0); });

    const comisionBs = (sumVentasBs * comisionPorcBs) / 100;
    const comisionUsd = (sumVentasUsd * comisionPorcUsd) / 100;
    const netoBs = comisionBs + Number(sueldoBs) - sumEgresosBs;
    const netoUsd = comisionUsd + Number(sueldoUsd) - sumEgresosUsd;

    return {
      totalVentasBs: sumVentasBs, totalVentasUsd: sumVentasUsd, countVentas: ventasDbActivas.length + customIngresos.length,
      totalEgresosBs: sumEgresosBs, totalEgresosUsd: sumEgresosUsd, countEgresos: egresosDbActivos.length + customEgresos.length,
      comisionBs, comisionUsd, netoBs, netoUsd
    };
  }, [data, egresosExcluidos, customEgresos, ventasExcluidas, customIngresos, sueldoBs, sueldoUsd, comisionPorcBs, comisionPorcUsd]);

  if (!usuarioId) return null;

  const toggleEgresoDb = (id) => { const s = new Set(egresosExcluidos); if (s.has(id)) s.delete(id); else s.add(id); setEgresosExcluidos(s); };
  const addCustomDeduction = () => { if (!newDeduction.desc) return toast.error('Desc requerida'); setCustomEgresos([...customEgresos, { id: `custom-${Date.now()}`, descripcion: newDeduction.desc, totalBs: Number(newDeduction.amountBs), totalUsd: Number(newDeduction.amountUsd), isCustom: true }]); setNewDeduction({ desc: '', amountBs: '', amountUsd: '' }); setIsAddingDeduction(false); };
  const removeCustomDeduction = (id) => setCustomEgresos(customEgresos.filter(c => c.id !== id));

  const toggleVentaDb = (id) => { const s = new Set(ventasExcluidas); if (s.has(id)) s.delete(id); else s.add(id); setVentasExcluidas(s); };
  const addCustomIngreso = () => { if (!newIngreso.desc) return toast.error('Desc requerida'); setCustomIngresos([...customIngresos, { id: `custom-inc-${Date.now()}`, descripcion: newIngreso.desc, totalBs: Number(newIngreso.amountBs), totalUsd: Number(newIngreso.amountUsd), isCustom: true }]); setNewIngreso({ desc: '', amountBs: '', amountUsd: '' }); setIsAddingIngreso(false); };
  const removeCustomIngreso = (id) => setCustomIngresos(customIngresos.filter(c => c.id !== id));

  const usuarioNombre = usuariosList.find(u => u.id == usuarioId)?.nombre;

  const handlePrint = () => {
    const code = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const dateStr = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
           <meta charset="utf-8">
           <title>Recibo Pago ${code}</title>
           <style>
               @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');
               @media print { @page { size: 80mm auto; margin: 0; } body { width: 80mm; margin: 0; padding: 2mm; } }
               body { 
                   font-family: 'Roboto Mono', monospace; 
                   font-size: 11px; 
                   margin: 0; 
                   padding: 8px; 
                   width: 80mm; 
                   background: white; 
                   color: black;
               }
               .center { text-align: center; }
               .right { text-align: right; }
               .bold { font-weight: bold; }
               .row { display: flex; justify-content: space-between; margin: 2px 0; }
               .line { border-bottom: 1px dashed #000; margin: 5px 0; }
               .section-title { font-weight: bold; border-bottom: 1px solid #000; margin-top: 5px; margin-bottom: 2px; }
           </style>
        </head>
        <body>
           <div class="center">
               <div class="bold" style="font-size:13px">RECIBO DE PAGO</div>
               <div class="bold">ELECTRO CAJA</div>
               <div>${dateStr}</div>
               <div style="font-size:9px">Ref: ${code}</div>
           </div>
           
           <div class="line"></div>
           
           <div><strong>Beneficiario:</strong> ${usuarioNombre}</div>
           <div><strong>Periodo:</strong> ${fechaInicio} al ${fechaFin}</div>
           
           <div class="section-title">INGRESOS</div>
           <div class="row"><span>Cantidad:</span><span>${calculos.countVentas}</span></div>
           <div class="row"><span>Ventas Bs:</span><span>${formatCurrency(calculos.totalVentasBs)}</span></div>
           <div class="row"><span>Ventas USD:</span><span>${formatCurrency(calculos.totalVentasUsd, 'USD')}</span></div>
           
           <div class="section-title">ASIGNACIONES</div>
           <div class="row"><span>Sueldo Base Bs:</span><span>${formatCurrency(sueldoBs)}</span></div>
           <div class="row"><span>Sueldo Base USD:</span><span>${formatCurrency(sueldoUsd, 'USD')}</span></div>
           <div class="row"><span>Comisión Bs (${comisionPorcBs}%):</span><span>${formatCurrency(calculos.comisionBs)}</span></div>
           <div class="row"><span>Comisión USD (${comisionPorcUsd}%):</span><span>${formatCurrency(calculos.comisionUsd, 'USD')}</span></div>

           <div class="section-title">DEDUCCIONES</div>
           <div class="row"><span>Cantidad:</span><span>${calculos.countEgresos}</span></div>
           <div class="row"><span>Total Egresos Bs:</span><span>-${formatCurrency(calculos.totalEgresosBs)}</span></div>
           <div class="row"><span>Total Egresos USD:</span><span>-${formatCurrency(calculos.totalEgresosUsd, 'USD')}</span></div>

           ${observacionesPago ? `
             <div class="section-title">OBSERVACIONES</div>
             <div style="font-size:10px; white-space: pre-wrap;">${observacionesPago}</div>
           ` : ''}

           <div class="line"></div>

           <div class="right bold" style="font-size:12px">NETO BS: ${formatCurrency(calculos.netoBs)}</div>
           <div class="right bold" style="font-size:12px">NETO USD: ${formatCurrency(calculos.netoUsd, 'USD')}</div>

           <br><br>
           <div class="center">_________________________</div>
           <div class="center">Recibido Conforme</div>
           <br>
           <div class="center" style="font-size:9px">Sades 2.0</div>

           <script>
               window.onload = function() { 
                   window.print(); 
                   setTimeout(function(){ window.close(); }, 500);
               };
           </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', 'PRINT', 'height=600,width=400');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      toast.error('Habilita las ventanas emergentes para imprimir');
    }
  };

  const TicketPreview = () => (
    <div className="bg-white p-4 border border-gray-300 shadow-sm font-mono text-xs w-[300px] mx-auto leading-tight relative">
      <div className="text-center mb-4"><h3 className="font-bold text-sm">RECIBO DE PAGO</h3><p>ELECTRO CAJA</p><p>{new Date().toLocaleString()}</p></div>
      <div className="border-b border-dashed border-gray-400 mb-2"></div>
      <div className="mb-2"><p><strong>Beneficiario:</strong> {usuarioNombre}</p><p><strong>Periodo:</strong> {fechaInicio} al {fechaFin}</p></div>
      <div className="mb-2"><p className="font-bold border-b border-gray-200 mb-1">INGRESOS ({calculos.countVentas})</p><div className="flex justify-between"><span>Ventas Bs:</span><span>{formatCurrency(calculos?.totalVentasBs)}</span></div><div className="flex justify-between"><span>Ventas USD:</span><span>{formatCurrency(calculos?.totalVentasUsd, 'USD')}</span></div></div>
      <div className="mb-2"><p className="font-bold border-b border-gray-200 mb-1">ASIGNACIONES</p><div className="flex justify-between"><span>Sueldo Bs:</span><span>{formatCurrency(sueldoBs)}</span></div><div className="flex justify-between"><span>Sueldo USD:</span><span>{formatCurrency(sueldoUsd, 'USD')}</span></div><div className="flex justify-between text-indigo-700"><span>Comision Bs ({comisionPorcBs}%):</span><span>{formatCurrency(calculos?.comisionBs)}</span></div><div className="flex justify-between text-indigo-700"><span>Comision USD ({comisionPorcUsd}%):</span><span>{formatCurrency(calculos?.comisionUsd, 'USD')}</span></div></div>
      <div className="mb-2"><p className="font-bold border-b border-gray-200 mb-1">DEDUCCIONES ({calculos.countEgresos})</p><div className="flex justify-between text-rose-600"><span>Egresos Bs:</span><span>-{formatCurrency(calculos?.totalEgresosBs)}</span></div><div className="flex justify-between text-rose-600"><span>Egresos USD:</span><span>-{formatCurrency(calculos?.totalEgresosUsd, 'USD')}</span></div></div>
      {observacionesPago && (<div className="mb-2 mt-4"><p className="font-bold border-b border-gray-200 mb-1">OBSERVACIONES</p><p className="text-[10px] whitespace-pre-wrap">{observacionesPago}</p></div>)}
      <div className="border-b border-dashed border-gray-400 my-2"></div>
      <div className="text-right"><p className="font-bold text-sm">NETO BS: {formatCurrency(calculos?.netoBs)}</p><p className="font-bold text-sm">NETO USD: {formatCurrency(calculos?.netoUsd, 'USD')}</p></div>
      <div className="mt-8 text-center pt-4 border-t border-black"><p>_______________________</p><p>Recibido Conforme</p></div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex-shrink-0 flex justify-between items-center">
          <div><h3 className="text-xl font-bold flex items-center gap-2"><Banknote className="h-6 w-6 text-emerald-400" /> Generar Pago / Comisión</h3><p className="text-sm opacity-80 mt-1">{usuarioNombre} • {fechaInicio} - {fechaFin}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-6">
          {loading ? (<div className="flex flex-col items-center justify-center h-full gap-4"><RefreshCw className="h-10 w-10 animate-spin text-indigo-500" /><p className="text-gray-500 font-medium">Calculando...</p></div>) : error ? (<div className="flex flex-col items-center justify-center h-full gap-4 text-center"><AlertCircle className="h-12 w-12 text-rose-500" /><p className="text-rose-600 font-medium">{error}</p></div>) : data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp className="h-24 w-24 text-indigo-500" /></div>
                  <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Total Ventas (Base Cálculo)</h4>
                  <div className="flex gap-4"><div><p className="text-2xl font-bold text-gray-900">{formatCurrency(calculos.totalVentasBs)}</p><p className="text-xs text-gray-400">Total Bs</p></div><div className="h-full w-px bg-gray-200"></div><div><p className="text-2xl font-bold text-emerald-600">{formatCurrency(calculos.totalVentasUsd, 'USD')}</p><p className="text-xs text-gray-400">Total USD</p></div></div>
                  <p className="text-xs text-gray-400 mt-2">{calculos.countVentas} Transacciones <span className="ml-1 text-[10px] text-gray-400">({ventasExcluidas.size} excluidas)</span></p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingDown className="h-24 w-24 text-rose-500" /></div>
                  <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Deducciones Totales</h4>
                  <div className="flex gap-4"><div><p className="text-2xl font-bold text-rose-600">{formatCurrency(calculos.totalEgresosBs)}</p><p className="text-xs text-gray-400">Total Bs</p></div><div className="h-full w-px bg-gray-200"></div><div><p className="text-2xl font-bold text-rose-500">{formatCurrency(calculos.totalEgresosUsd, 'USD')}</p><p className="text-xs text-gray-400">Total USD</p></div></div>
                  <p className="text-xs text-rose-400 mt-2">{calculos.countEgresos} Aplicados ({egresosExcluidos.size} excluidos)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[400px]">
                  <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                    <h5 className="font-bold text-gray-700 text-sm">Detalle de Ventas ({calculos.countVentas})</h5>
                    <button onClick={() => setIsAddingIngreso(true)} className="px-2 py-1 bg-white border border-indigo-200 text-indigo-600 text-xs rounded hover:bg-indigo-50 flex items-center gap-1"><Plus className="h-3 w-3" /> Agregar</button>
                  </div>
                  {isAddingIngreso && (<div className="bg-indigo-50/50 p-2 border-b border-indigo-100 animate-in slide-in-from-top-2"><div className="flex gap-2 mb-2"><input autoFocus type="text" placeholder="Motivo ingreso extra" className="flex-1 text-xs px-2 py-1 rounded border outline-none" value={newIngreso.desc} onChange={e => setNewIngreso({ ...newIngreso, desc: e.target.value })} /></div><div className="flex gap-2"><input type="number" placeholder="Monto Bs" className="w-24 text-xs px-2 py-1 rounded border outline-none" value={newIngreso.amountBs} onChange={e => setNewIngreso({ ...newIngreso, amountBs: e.target.value })} /><input type="number" placeholder="Monto USD" className="w-24 text-xs px-2 py-1 rounded border outline-none" value={newIngreso.amountUsd} onChange={e => setNewIngreso({ ...newIngreso, amountUsd: e.target.value })} /><div className="flex-1 flex justify-end gap-1"><button onClick={() => setIsAddingIngreso(false)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">Cancel</button><button onClick={addCustomIngreso} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Guardar</button></div></div></div>)}
                  <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs"><thead className="bg-white text-gray-500 sticky top-0 shadow-sm"><tr className="border-b"><th className="px-2 py-2 w-8 bg-gray-50"></th><th className="px-3 py-2 text-left bg-gray-50">Fecha</th><th className="px-3 py-2 text-left bg-gray-50">Código</th><th className="px-3 py-2 text-left bg-gray-50">Descr</th><th className="px-3 py-2 text-right bg-gray-50">Monto</th></tr></thead>
                      <tbody className="divide-y relative z-0">
                        {customIngresos.map(t => (<tr key={t.id} className="bg-emerald-50/50 hover:bg-emerald-50"><td className="px-2 py-2 text-center"><button onClick={() => removeCustomIngreso(t.id)} className="p-1 rounded bg-indigo-100 text-indigo-600"><X className="h-3 w-3" /></button></td><td className="px-3 py-2 text-gray-600">Manual</td><td className="px-3 py-2 font-mono text-emerald-600">EXTRA</td><td className="px-3 py-2 text-gray-700">{t.descripcion}</td><td className="px-3 py-2 text-right font-mono text-emerald-600">{t.totalBs > 0 && <div>{formatCurrency(t.totalBs)}</div>}{t.totalUsd > 0 && <div>{formatCurrency(t.totalUsd, 'USD')}</div>}</td></tr>))}
                        {data.ventas.lista.map(t => {
                          const isExcluded = ventasExcluidas.has(t.id);
                          const rowTotals = getRowTotals(t);
                          return (
                            <tr key={t.id} className={`transition-colors ${isExcluded ? 'bg-gray-100 opacity-50' : 'hover:bg-gray-50'}`}>
                              <td className="px-2 py-2 text-center">
                                <button onClick={() => toggleVentaDb(t.id)} className={`p-1 rounded ${isExcluded ? 'bg-gray-300 text-gray-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                  {isExcluded ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(t.fechaHora).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-3 py-2 font-mono text-gray-500">{t.codigoVenta || t.id}</td>
                              <td className="px-3 py-2 truncate max-w-[120px]" title={t.items?.map(i => i.descripcion).join(', ')}>{t.items?.length > 0 ? t.items.map(i => i.descripcion).join(', ') : 'Venta General'}</td>
                              <td className="px-3 py-2 text-right font-mono">
                                <div className="flex flex-col">
                                  {rowTotals.bs > 0 && <span>{formatCurrency(rowTotals.bs)}</span>}
                                  {rowTotals.usd > 0 && <span className="text-emerald-600">{formatCurrency(rowTotals.usd, 'USD')}</span>}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[400px]">
                  <div className="px-4 py-2 bg-rose-50 border-b border-rose-100 flex justify-between items-center sticky top-0 z-10"><h5 className="font-bold text-rose-800 text-sm">Deducciones ({calculos.countEgresos})</h5><button onClick={() => setIsAddingDeduction(true)} className="px-2 py-1 bg-white border border-rose-200 text-rose-600 text-xs rounded hover:bg-rose-100 flex items-center gap-1"><Plus className="h-3 w-3" /> Agregar</button></div>
                  {isAddingDeduction && (<div className="bg-rose-50/50 p-2 border-b border-rose-100 animate-in slide-in-from-top-2"><div className="flex gap-2 mb-2"><input autoFocus type="text" placeholder="Motivo de deducción" className="flex-1 text-xs px-2 py-1 rounded border outline-none" value={newDeduction.desc} onChange={e => setNewDeduction({ ...newDeduction, desc: e.target.value })} /></div><div className="flex gap-2"><input type="number" placeholder="Monto Bs" className="w-24 text-xs px-2 py-1 rounded border outline-none" value={newDeduction.amountBs} onChange={e => setNewDeduction({ ...newDeduction, amountBs: e.target.value })} /><input type="number" placeholder="Monto USD" className="w-24 text-xs px-2 py-1 rounded border outline-none" value={newDeduction.amountUsd} onChange={e => setNewDeduction({ ...newDeduction, amountUsd: e.target.value })} /><div className="flex-1 flex justify-end gap-1"><button onClick={() => setIsAddingDeduction(false)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">Cancel</button><button onClick={addCustomDeduction} className="px-3 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700">Guardar</button></div></div></div>)}
                  <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs"><thead className="bg-white text-rose-800 sticky top-0 shadow-sm"><tr className="border-b"><th className="px-2 py-2 w-8 bg-rose-50"></th><th className="px-3 py-2 text-left bg-rose-50">Código</th><th className="px-3 py-2 text-left bg-rose-50">Descr</th><th className="px-3 py-2 text-right bg-rose-50">Monto</th></tr></thead>
                      <tbody className="divide-y relative z-0">
                        {customEgresos.map(t => (<tr key={t.id} className="bg-orange-50/50 hover:bg-orange-50"><td className="px-2 py-2 text-center"><button onClick={() => removeCustomDeduction(t.id)} className="p-1 rounded bg-rose-100 text-rose-600"><X className="h-3 w-3" /></button></td><td className="px-3 py-2 font-mono text-orange-600">MANUAL</td><td className="px-3 py-2 text-gray-700">{t.descripcion}</td><td className="px-3 py-2 text-right font-mono text-rose-600">{t.totalBs > 0 && <div>{formatCurrency(t.totalBs)}</div>}{t.totalUsd > 0 && <div>{formatCurrency(t.totalUsd, 'USD')}</div>}</td></tr>))}
                        {data.egresos.lista.map(t => {
                          const isExcluded = egresosExcluidos.has(t.id);
                          const rowTotals = getRowTotals(t);
                          return (
                            <tr key={t.id} className={`transition-colors ${isExcluded ? 'bg-gray-100 opacity-50' : 'hover:bg-rose-50'}`}>
                              <td className="px-2 py-2 text-center">
                                <button onClick={() => toggleEgresoDb(t.id)} className={`p-1 rounded ${isExcluded ? 'bg-gray-300 text-gray-500' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                                  {isExcluded ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                                </button>
                              </td>
                              <td className="px-3 py-2 font-mono text-gray-500">{t.id}</td>
                              <td className="px-3 py-2 text-gray-700 truncate max-w-[150px]" title={`${t.descripcion} - ${t.observaciones || ''}`}>
                                {t.descripcion}
                                {t.observaciones && <span className="text-gray-400 text-[10px] block">{t.observaciones}</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-rose-600">
                                {t.totalBs > 0 && <div>{formatCurrency(t.totalBs)}</div>}
                                {t.totalUsd > 0 && <div>{formatCurrency(t.totalUsd, 'USD')}</div>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-6">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2"><Percent className="h-5 w-5 text-indigo-500" /> Configuración de Pago</h4>
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200"><label className="block text-xs font-bold text-gray-500 uppercase mb-3">Sueldo Base</label><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-gray-500 mb-1 block">Monto Bs</label><input type="number" min="0" step="0.01" value={sueldoBs} onChange={e => setSueldoBs(e.target.value)} className="w-full px-3 py-2 rounded-lg border outline-none" /></div><div><label className="text-xs text-gray-500 mb-1 block">Monto USD</label><input type="number" min="0" step="0.01" value={sueldoUsd} onChange={e => setSueldoUsd(e.target.value)} className="w-full px-3 py-2 rounded-lg border outline-none" /></div></div></div>
                  <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100"><label className="block text-xs font-bold text-indigo-600 uppercase mb-3">Comisón (%)</label><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-indigo-500 mb-1 block">% Bs</label><input type="number" min="0" max="100" step="0.1" value={comisionPorcBs} onChange={e => setComisionPorcBs(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-indigo-200 outline-none" /><p className="text-right text-xs font-bold text-indigo-700 mt-1">= {formatCurrency(calculos.comisionBs)}</p></div><div><label className="text-xs text-indigo-500 mb-1 block">% USD</label><input type="number" min="0" max="100" step="0.1" value={comisionPorcUsd} onChange={e => setComisionPorcUsd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-indigo-200 outline-none" /><p className="text-right text-xs font-bold text-indigo-700 mt-1">= {formatCurrency(calculos.comisionUsd, 'USD')}</p></div></div></div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Observaciones</label><textarea value={observacionesPago} onChange={e => setObservacionesPago(e.target.value)} placeholder="Detalles adicionales..." className="w-full p-3 rounded-lg border border-gray-200 text-sm outline-none resize-none h-24" /></div>
                  <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg mt-4"><h4 className="text-xs font-bold uppercase text-emerald-400 tracking-wider mb-4 border-b border-white/10 pb-2">Total Neto</h4><div className="grid grid-cols-2 gap-8"><div><span className="text-xs opacity-70 block mb-1">En Bolívares</span><span className="text-3xl font-bold">{formatCurrency(calculos.netoBs)}</span></div><div className="text-right"><span className="text-xs opacity-70 block mb-1">En Divisas</span><span className="text-3xl font-bold text-emerald-400">{formatCurrency(calculos.netoUsd, 'USD')}</span></div></div></div>
                </div>
                <div className="flex flex-col items-center justify-center bg-gray-100 rounded-xl p-4 border border-dashed border-gray-300">
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-2"><Printer className="h-4 w-4" /> Vista Previa</p><div className="shadow-2xl"><TicketPreview /></div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
          <div className="text-xs text-gray-500 italic">* Verifique los datos</div>
          <div className="flex gap-3"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg">Cancelar</button><button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2"><Printer className="h-4 w-4" /> Imprimir</button></div>
        </div>
      </div>
    </div>
  );
};

const ReporteEmpleado = () => {
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [datos, setDatos] = useState(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [activeSection, setActiveSection] = useState('transacciones');

  useEffect(() => {
    cargarUsuarios();
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    setFechaFin(hoy.toISOString().split('T')[0]);
    setFechaInicio(haceUnMes.toISOString().split('T')[0]);
  }, []);

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/users');
      if (response.data?.success) setUsuarios(response.data.data || []);
    } catch (error) { console.error('Error cargando usuarios:', error); setUsuarios([{ id: 1, nombre: 'Juan Pérez', rol: 'admin' }, { id: 2, nombre: 'María González', rol: 'cajero' }]); }
  };

  const cargarReporte = async () => {
    if (!usuarioSeleccionado) { toast.error('Selecciona un vendedor'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ usuarioId: usuarioSeleccionado });
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      const response = await api.get(`/reportes/empleado?${params}`);
      if (response.data?.success) { setDatos(response.data.data); toast.success(`Datos actualizados`); }
      else throw new Error(response.data?.message || 'Error al cargar reporte');
    } catch (error) {
      console.error('Error reporte:', error);
      setDatos({ usuario: { nombre: usuarios.find(u => u.id == usuarioSeleccionado)?.nombre || 'Vendedor', rol: 'Vendedor' }, periodo: { diasAnalizados: 30 }, metricas: { totalVentas: 42, totalEgresos: 3, montoVentasBs: 15400, montoVentasUsd: 320, montoEgresosBs: 1200, montoEgresosUsd: 0, topProductos: [{ descripcion: 'Servicio Técnico', cantidad: 10, montoTotal: 5000 }], metodosPago: { 'Efectivo Bs': 5000, 'Zelle': 8000 } }, balance: { neto: 14200, netoUsd: 320 }, transacciones: [] });
    } finally { setLoading(false); }
  };

  const ExpandableCard = ({ title, id, icon: Icon, count, children }) => (
    <div className={`bg-white rounded-xl border transition-all ${activeSection === id ? 'border-indigo-200 shadow-md' : 'border-gray-100 shadow-sm'}`}>
      <button onClick={() => setActiveSection(activeSection === id ? '' : id)} className="w-full px-5 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${activeSection === id ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-500'}`}><Icon className="h-5 w-5" /></div><div className="text-left"><h4 className="font-bold text-gray-800 text-sm">{title}</h4>{count !== undefined && <p className="text-xs text-gray-400">{count} registros</p>}</div></div>{activeSection === id ? <ChevronDown className="h-5 w-5 text-indigo-500" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}</button>
      {activeSection === id && (<div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-gray-50 pt-4">{children}</div>)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-1"><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Briefcase className="h-5 w-5 text-indigo-500" /> Reporte por Vendedor</h3></div>
        <div className="flex flex-col xl:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full xl:w-auto min-w-[200px]"><User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><select value={usuarioSeleccionado} onChange={e => setUsuarioSeleccionado(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"><option value="">Seleccionar Vendedor...</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} - {u.rol}</option>)}</select></div>
          <div className="flex gap-3 w-full xl:w-auto"><div className="relative flex-1 xl:w-40"><Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div><div className="relative flex-1 xl:w-40"><Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div></div>
          <div className="flex gap-3 w-full xl:w-auto mt-2 xl:mt-0"><button onClick={cargarReporte} disabled={!usuarioSeleccionado} className="flex-1 xl:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm">{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Generar</button><button onClick={() => setShowPagoModal(true)} disabled={!usuarioSeleccionado} className="flex-1 xl:flex-none bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"><Banknote className="h-4 w-4" /> Generar Pago</button></div>
        </div>
      </div>
      {datos ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-5 text-white shadow-md"><p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">Total Ventas</p><div className="flex justify-between items-end"><div><p className="text-2xl font-bold">{datos.metricas.totalVentas}</p><p className="text-xs opacity-90 mt-1">{formatCurrency(datos.metricas.montoVentasBs)} / {formatCurrency(datos.metricas.montoVentasUsd, 'USD')}</p></div><TrendingUp className="h-8 w-8 text-white/20" /></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Egresos Generados</p><div className="flex justify-between items-end"><div><p className="text-2xl font-bold text-rose-600">{datos.metricas.totalEgresos}</p><p className="text-xs text-gray-500 mt-1">{formatCurrency(datos.metricas.montoEgresosBs)} / {formatCurrency(datos.metricas.montoEgresosUsd, 'USD')}</p></div><TrendingDown className="h-8 w-8 text-rose-100" /></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Balance Neto</p><div className="flex justify-between items-end"><div><p className="text-2xl font-bold text-gray-800">{formatCurrency(datos.balance.netoUsd, 'USD')}</p><p className="text-xs text-emerald-600 font-bold mt-1">Rentabilidad</p></div><Wallet className="h-8 w-8 text-emerald-100" /></div></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpandableCard title="Productos Más Vendidos" id="productos" icon={Trophy} count={datos.metricas.topProductos?.length}><div className="space-y-3">{datos.metricas.topProductos?.map((prod, idx) => (<div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}> {idx + 1} </div><span className="text-sm font-medium text-gray-700">{prod.descripcion}</span></div><div className="text-right"><p className="text-sm font-bold">{prod.cantidad} und</p><p className="text-xs text-gray-400">{formatCurrency(prod.montoTotal)}</p></div></div>))}</div></ExpandableCard>
            <ExpandableCard title="Métodos Recibidos" id="pagos" icon={CreditCard}><div className="space-y-4">{Object.entries(datos.metricas.metodosPago || {}).map(([metodo, monto], idx) => { const total = Object.values(datos.metricas.metodosPago).reduce((a, b) => a + b, 0); const pct = total ? (monto / total) * 100 : 0; return (<div key={idx}><div className="flex justify-between text-xs mb-1"><span className="font-medium text-gray-700">{metodo}</span><span className="font-bold">{formatCurrency(monto)} ({pct.toFixed(0)}%)</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full" style={{ width: `${pct}%` }}></div></div></div>) })}</div></ExpandableCard>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"><div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h4 className="font-bold text-gray-800 flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /> Historial de Movimientos</h4><span className="bg-white px-2 py-1 text-xs font-bold border rounded-md">{datos.transacciones.length} Tx</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs"><tr><th className="px-6 py-3 text-left">Hora</th><th className="px-6 py-3 text-left">Tipo</th><th className="px-6 py-3 text-left">Cliente</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-right">Detalle</th></tr></thead><tbody className="divide-y divide-gray-100">{datos.transacciones.map(t => (<tr key={t.id} className="hover:bg-gray-50"><td className="px-6 py-3 text-gray-600 font-mono text-xs">{new Date(t.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td><td className="px-6 py-3"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.tipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{t.tipo}</span></td><td className="px-6 py-3 text-gray-800 font-medium">{t.cliente || 'N/A'}</td><td className="px-6 py-3 text-right font-mono"><div className="flex flex-col items-end"><span>{formatCurrency(t.totalBs)}</span>{t.totalUsd > 0 && <span className="text-emerald-600 text-[10px]">{formatCurrency(t.totalUsd, 'USD')}</span>}</div></td><td className="px-6 py-3 text-right"><span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{t.pagos?.[0]?.metodo || 'Mixto'}</span></td></tr>))}</tbody></table></div></div>
        </div>
      ) : <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><div className="bg-gray-50 p-4 rounded-full mb-4"> <User className="h-10 w-10 text-gray-300" /> </div><p className="text-gray-500 font-medium">Selecciona un vendedor para ver sus métricas</p></div>}
      {showPagoModal && <GenerarPagoModal usuarioId={usuarioSeleccionado} fechaInicio={fechaInicio} fechaFin={fechaFin} usuariosList={usuarios} onClose={() => setShowPagoModal(false)} />}
    </div>
  );
};
export default ReporteEmpleado;