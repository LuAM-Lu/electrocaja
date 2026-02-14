// components/reportes/ReporteTecnico.jsx
import React, { useState, useEffect, useMemo } from 'react';
import User from 'lucide-react/dist/esm/icons/user'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Settings from 'lucide-react/dist/esm/icons/settings'
import Wrench from 'lucide-react/dist/esm/icons/wrench'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone'
import Search from 'lucide-react/dist/esm/icons/search'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
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
import Monitor from 'lucide-react/dist/esm/icons/monitor'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Minus from 'lucide-react/dist/esm/icons/minus'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
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

const GenerarPagoTecnicoModal = ({ usuarioId, fechaInicio, fechaFin, onClose, tecnicosList }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // States
    const [egresosExcluidos, setEgresosExcluidos] = useState(new Set());
    const [customEgresos, setCustomEgresos] = useState([]);
    const [isAddingDeduction, setIsAddingDeduction] = useState(false);
    const [newDeduction, setNewDeduction] = useState({ desc: '', amountBs: '', amountUsd: '' });

    const [serviciosExcluidos, setServiciosExcluidos] = useState(new Set());
    const [customIngresos, setCustomIngresos] = useState([]);
    const [isAddingIngreso, setIsAddingIngreso] = useState(false);
    const [newIngreso, setNewIngreso] = useState({ desc: '', amountBs: '', amountUsd: '' });

    const [sueldoBs, setSueldoBs] = useState(0);
    const [sueldoUsd, setSueldoUsd] = useState(0);
    const [comisionPorcBs, setComisionPorcBs] = useState(50); // Default 50%
    const [comisionPorcUsd, setComisionPorcUsd] = useState(50); // Default 50%
    const [observacionesPago, setObservacionesPago] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const params = new URLSearchParams({ usuarioId });
                if (fechaInicio) params.append('fechaInicio', fechaInicio);
                if (fechaFin) params.append('fechaFin', fechaFin);
                // ⚡ Endpoint para técnicos
                const res = await api.get(`/reportes/pago-tecnico/calculo?${params}`);
                if (res.data.success) setData(res.data.data);
                else setError(res.data.message);
            } catch (err) { setError('Error al calcular datos'); } finally { setLoading(false); }
        };
        if (usuarioId) fetchData();
    }, [usuarioId, fechaInicio, fechaFin]);

    const calculos = useMemo(() => {
        if (!data) return null;

        // Usamos 'ventas' del backend como 'servicios'
        const serviciosDbActivos = data.ventas.lista.filter(v => !serviciosExcluidos.has(v.id));
        let sumServiciosBs = 0, sumServiciosUsd = 0;

        const sumPayments = (txs) => {
            let bs = 0, usd = 0;
            txs.forEach(t => {
                // Logic adjusted for mapped services or raw transactions
                bs += Number(t.totalBs || 0);
                usd += Number(t.totalUsd || 0);
            });
            return { bs, usd };
        };

        const dbServiciosTotal = sumPayments(serviciosDbActivos);
        sumServiciosBs += dbServiciosTotal.bs; sumServiciosUsd += dbServiciosTotal.usd;
        customIngresos.forEach(c => { sumServiciosBs += Number(c.totalBs || 0); sumServiciosUsd += Number(c.totalUsd || 0); });

        const egresosDbActivos = data.egresos.lista.filter(e => !egresosExcluidos.has(e.id));
        const dbEgresosTotal = sumPayments(egresosDbActivos);
        let sumEgresosBs = dbEgresosTotal.bs, sumEgresosUsd = dbEgresosTotal.usd;
        customEgresos.forEach(c => { sumEgresosBs += Number(c.totalBs || 0); sumEgresosUsd += Number(c.totalUsd || 0); });

        const comisionBs = (sumServiciosBs * comisionPorcBs) / 100;
        const comisionUsd = (sumServiciosUsd * comisionPorcUsd) / 100;
        const netoBs = comisionBs + Number(sueldoBs) - sumEgresosBs;
        const netoUsd = comisionUsd + Number(sueldoUsd) - sumEgresosUsd;

        return {
            totalServiciosBs: sumServiciosBs, totalServiciosUsd: sumServiciosUsd, countServicios: serviciosDbActivos.length + customIngresos.length,
            totalEgresosBs: sumEgresosBs, totalEgresosUsd: sumEgresosUsd, countEgresos: egresosDbActivos.length + customEgresos.length,
            comisionBs, comisionUsd, netoBs, netoUsd
        };
    }, [data, egresosExcluidos, customEgresos, serviciosExcluidos, customIngresos, sueldoBs, sueldoUsd, comisionPorcBs, comisionPorcUsd]);

    if (!usuarioId) return null;

    const toggleEgresoDb = (id) => { const s = new Set(egresosExcluidos); if (s.has(id)) s.delete(id); else s.add(id); setEgresosExcluidos(s); };
    const addCustomDeduction = () => { if (!newDeduction.desc) return toast.error('Desc requerida'); setCustomEgresos([...customEgresos, { id: `custom-${Date.now()}`, descripcion: newDeduction.desc, totalBs: Number(newDeduction.amountBs), totalUsd: Number(newDeduction.amountUsd), isCustom: true }]); setNewDeduction({ desc: '', amountBs: '', amountUsd: '' }); setIsAddingDeduction(false); };
    const removeCustomDeduction = (id) => setCustomEgresos(customEgresos.filter(c => c.id !== id));

    const toggleServicioDb = (id) => { const s = new Set(serviciosExcluidos); if (s.has(id)) s.delete(id); else s.add(id); setServiciosExcluidos(s); };
    const addCustomIngreso = () => { if (!newIngreso.desc) return toast.error('Desc requerida'); setCustomIngresos([...customIngresos, { id: `custom-inc-${Date.now()}`, descripcion: newIngreso.desc, totalBs: Number(newIngreso.amountBs), totalUsd: Number(newIngreso.amountUsd), isCustom: true }]); setNewIngreso({ desc: '', amountBs: '', amountUsd: '' }); setIsAddingIngreso(false); };
    const removeCustomIngreso = (id) => setCustomIngresos(customIngresos.filter(c => c.id !== id));

    const usuarioNombre = tecnicosList.find(u => u.id == usuarioId)?.nombre;

    // PRINT FUNCTION
    const handlePrint = async () => {
        const code = `PAY-TECH-${Date.now().toString().slice(-6)}`;
        const dateStr = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
           <meta charset="utf-8">
           <title>Recibo Pago Técnico ${code}</title>
           <style>
               @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');
               @media print { @page { size: 80mm auto; margin: 0; } body { width: 80mm; margin: 0; padding: 2mm; } }
               body { font-family: 'Roboto Mono', monospace; font-size: 11px; margin: 0; padding: 8px; width: 80mm; background: white; color: black; }
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
               <div class="bold" style="font-size:13px">PAGO SERVICIO TÉCNICO</div>
               <div class="bold">ELECTRO CAJA</div>
               <div>${dateStr}</div>
               <div style="font-size:9px">Ref: ${code}</div>
           </div>
           
           <div class="line"></div>
           
           <div><strong>Técnico:</strong> ${usuarioNombre}</div>
           <div><strong>Periodo:</strong> ${fechaInicio} al ${fechaFin}</div>
           
           <div class="section-title">SERVICIOS</div>
           <div class="row"><span>Cant. Entregados:</span><span>${calculos.countServicios}</span></div>
           <div class="row"><span>Total Bs:</span><span>${formatCurrency(calculos.totalServiciosBs)}</span></div>
           <div class="row"><span>Total USD:</span><span>${formatCurrency(calculos.totalServiciosUsd, 'USD')}</span></div>
           
           <div class="section-title">ASIGNACIONES</div>
           <div class="row"><span>Sueldo Base Bs:</span><span>${formatCurrency(sueldoBs)}</span></div>
           <div class="row"><span>Sueldo Base USD:</span><span>${formatCurrency(sueldoUsd, 'USD')}</span></div>
           <div class="row"><span>Comisión Bs (${comisionPorcBs}%):</span><span>${formatCurrency(calculos.comisionBs)}</span></div>
           <div class="row"><span>Comisión USD (${comisionPorcUsd}%):</span><span>${formatCurrency(calculos.comisionUsd, 'USD')}</span></div>

           <div class="section-title">DEDUCCIONES</div>
           <div class="row"><span>Cant. Egresos:</span><span>${calculos.countEgresos}</span></div>
           <div class="row"><span>Total Egresos Bs:</span><span>-${formatCurrency(calculos.totalEgresosBs)}</span></div>
           <div class="row"><span>Total Egresos USD:</span><span>-${formatCurrency(calculos.totalEgresosUsd, 'USD')}</span></div>

           ${observacionesPago ? `<div class="section-title">OBSERVACIONES</div><div style="font-size:10px; white-space: pre-wrap;">${observacionesPago}</div>` : ''}

           <div class="line"></div>

           <div class="right bold" style="font-size:12px">NETO BS: ${formatCurrency(calculos.netoBs)}</div>
           <div class="right bold" style="font-size:12px">NETO USD: ${formatCurrency(calculos.netoUsd, 'USD')}</div>

           <br><br>
           <div class="center">_________________________</div>
           <div class="center">Recibido Conforme</div>
           <br>
           <div class="center" style="font-size:9px">Sades 2.0</div>

           <script>
               window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); };
           </script>
        </body>
      </html>
    `;

        // 1. Abrir ventana de impresión
        const printWindow = window.open('', 'PRINT', 'height=600,width=400');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();

            // 2. Registrar el pago generado en el backend
            try {
                await api.post('/reportes/pago-tecnico/registrar', {
                    tecnicoId: usuarioId,
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFin,
                    totalServicios: calculos.countServicios,
                    totalBs: calculos.netoBs,
                    totalUsd: calculos.netoUsd
                });
                toast.success('✅ Pago registrado exitosamente');
                // 3. Cerrar modal y recargar períodos en componente padre
                setTimeout(() => {
                    onClose(true); // true indica que se registró un pago
                }, 1000);
            } catch (error) {
                console.error('Error registrando pago:', error);
                toast.error('⚠️ Impresión exitosa, pero no se pudo registrar el período');
            }
        } else {
            toast.error('Habilita las ventanas emergentes para imprimir');
        }
    };


    const TicketPreview = () => (
        <div className="bg-white p-4 border border-gray-300 shadow-sm font-mono text-xs w-[300px] mx-auto leading-tight relative">
            <div className="text-center mb-4"><h3 className="font-bold text-sm">PAGO SERVICIO TÉCNICO</h3><p>ELECTRO CAJA</p><p>{new Date().toLocaleString()}</p></div>
            <div className="border-b border-dashed border-gray-400 mb-2"></div>
            <div className="mb-2"><p><strong>Técnico:</strong> {usuarioNombre}</p><p><strong>Periodo:</strong> {fechaInicio} al {fechaFin}</p></div>
            <div className="mb-2"><p className="font-bold border-b border-gray-200 mb-1">SERVICIOS ({calculos.countServicios} entregados)</p><div className="flex justify-between"><span>Total Bs:</span><span>{formatCurrency(calculos?.totalServiciosBs)}</span></div><div className="flex justify-between"><span>Total USD:</span><span>{formatCurrency(calculos?.totalServiciosUsd, 'USD')}</span></div></div>
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
                    <div><h3 className="text-xl font-bold flex items-center gap-2"><Banknote className="h-6 w-6 text-emerald-400" /> Generar Pago Técnico</h3><p className="text-sm opacity-80 mt-1">{usuarioNombre} • {fechaInicio} - {fechaFin}</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-6">
                    {loading ? (<div className="flex flex-col items-center justify-center h-full gap-4"><RefreshCw className="h-10 w-10 animate-spin text-indigo-500" /><p className="text-gray-500 font-medium">Calculando...</p></div>) : error ? (<div className="flex flex-col items-center justify-center h-full gap-4 text-center"><AlertCircle className="h-12 w-12 text-rose-500" /><p className="text-rose-600 font-medium">{error}</p></div>) : data ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp className="h-24 w-24 text-indigo-500" /></div>
                                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Total Servicios (Base)</h4>
                                    <div className="flex gap-4"><div><p className="text-2xl font-bold text-gray-900">{formatCurrency(calculos.totalServiciosBs)}</p><p className="text-xs text-gray-400">Total Bs</p></div><div className="h-full w-px bg-gray-200"></div><div><p className="text-2xl font-bold text-emerald-600">{formatCurrency(calculos.totalServiciosUsd, 'USD')}</p><p className="text-xs text-gray-400">Total USD</p></div></div>
                                    <p className="text-xs text-gray-400 mt-2">{calculos.countServicios} Servicios <span className="ml-1 text-[10px] text-gray-400">({serviciosExcluidos.size} excluidos)</span></p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingDown className="h-24 w-24 text-rose-500" /></div>
                                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Deducciones Totales</h4>
                                    <div className="flex gap-4"><div><p className="text-2xl font-bold text-rose-600">{formatCurrency(calculos.totalEgresosBs)}</p><p className="text-xs text-gray-400">Total Bs</p></div><div className="h-full w-px bg-gray-200"></div><div><p className="text-2xl font-bold text-rose-500">{formatCurrency(calculos.totalEgresosUsd, 'USD')}</p><p className="text-xs text-gray-400">Total USD</p></div></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                <div className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[400px]">
                                    <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                                        <h5 className="font-bold text-gray-700 text-sm">Detalle servicios ({calculos.countServicios})</h5>
                                        <button onClick={() => setIsAddingIngreso(true)} className="px-2 py-1 bg-white border border-indigo-200 text-indigo-600 text-xs rounded hover:bg-indigo-50 flex items-center gap-1"><Plus className="h-3 w-3" /> Agregar</button>
                                    </div>
                                    {isAddingIngreso && (<div className="bg-indigo-50/50 p-2 border-b border-indigo-100 animate-in slide-in-from-top-2"><div className="flex gap-2 mb-2"><input autoFocus type="text" placeholder="Motivo ingreso extra" className="flex-1 text-xs px-2 py-1 rounded border outline-none" value={newIngreso.desc} onChange={e => setNewIngreso({ ...newIngreso, desc: e.target.value })} /></div><div className="flex gap-2"><input type="number" placeholder="Monto Bs" className="w-24 text-xs px-2 py-1 rounded border outline-none" value={newIngreso.amountBs} onChange={e => setNewIngreso({ ...newIngreso, amountBs: e.target.value })} /><input type="number" placeholder="Monto USD" className="w-24 text-xs px-2 py-1 rounded border outline-none" value={newIngreso.amountUsd} onChange={e => setNewIngreso({ ...newIngreso, amountUsd: e.target.value })} /><div className="flex-1 flex justify-end gap-1"><button onClick={() => setIsAddingIngreso(false)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">Cancel</button><button onClick={addCustomIngreso} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Guardar</button></div></div></div>)}
                                    <div className="overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-xs"><thead className="bg-white text-gray-500 sticky top-0 shadow-sm"><tr className="border-b"><th className="px-2 py-2 w-8 bg-gray-50"></th><th className="px-3 py-2 text-left bg-gray-50">Fecha</th><th className="px-3 py-2 text-left bg-gray-50">N°/Código</th><th className="px-3 py-2 text-left bg-gray-50">Servicios Aplicados</th><th className="px-3 py-2 text-right bg-gray-50">Monto</th></tr></thead>
                                            <tbody className="divide-y relative z-0">
                                                {customIngresos.map(t => (<tr key={t.id} className="bg-emerald-50/50 hover:bg-emerald-50"><td className="px-2 py-2 text-center"><button onClick={() => removeCustomIngreso(t.id)} className="p-1 rounded bg-indigo-100 text-indigo-600"><X className="h-3 w-3" /></button></td><td className="px-3 py-2 text-gray-600">Manual</td><td className="px-3 py-2 font-mono text-emerald-600">EXTRA</td><td className="px-3 py-2 text-gray-700">{t.descripcion}</td><td className="px-3 py-2 text-right font-mono text-emerald-600">{t.totalBs > 0 && <div>{formatCurrency(t.totalBs)}</div>}{t.totalUsd > 0 && <div>{formatCurrency(t.totalUsd, 'USD')}</div>}</td></tr>))}
                                                {data.ventas.lista.map(t => { const isExcluded = serviciosExcluidos.has(t.id); return (<tr key={t.id} className={`transition-colors ${isExcluded ? 'bg-gray-100 opacity-50' : 'hover:bg-gray-50'}`}><td className="px-2 py-2 text-center"><button onClick={() => toggleServicioDb(t.id)} className={`p-1 rounded ${isExcluded ? 'bg-gray-300 text-gray-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{isExcluded ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}</button></td><td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(t.fechaHora).toLocaleString('es-VE', { day: '2-digit', month: '2-digit' })}</td><td className="px-3 py-2 font-mono text-gray-500">{t.codigoVenta}</td><td className="px-3 py-2 truncate max-w-[120px]" title={t.descripcion}>{t.descripcion}</td><td className="px-3 py-2 text-right font-mono"><div className="flex flex-col">{t.totalBs > 0 && <span>{formatCurrency(t.totalBs)}</span>}{t.totalUsd > 0 && <span className="text-emerald-600">{formatCurrency(t.totalUsd, 'USD')}</span>}</div></td></tr>) })}
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
                                                {data.egresos.lista.map(t => { const isExcluded = egresosExcluidos.has(t.id); return (<tr key={t.id} className={`transition-colors ${isExcluded ? 'bg-gray-100 opacity-50' : 'hover:bg-rose-50'}`}><td className="px-2 py-2 text-center"><button onClick={() => toggleEgresoDb(t.id)} className={`p-1 rounded ${isExcluded ? 'bg-gray-300 text-gray-500' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>{isExcluded ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}</button></td><td className="px-3 py-2 font-mono text-gray-500">{t.id}</td><td className="px-3 py-2 text-gray-700 truncate max-w-[150px]" title={`${t.descripcion} - ${t.observaciones || ''}`}>{t.descripcion}</td><td className="px-3 py-2 text-right font-mono text-rose-600">{t.totalBs > 0 && <div>{formatCurrency(t.totalBs)}</div>}{t.totalUsd > 0 && <div>{formatCurrency(t.totalUsd, 'USD')}</div>}</td></tr>); })}
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

const ReporteTecnico = () => {
    const [loading, setLoading] = useState(false);
    const [tecnicos, setTecnicos] = useState([]);
    const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [datos, setDatos] = useState(null);
    const [showPagoModal, setShowPagoModal] = useState(false);
    const [activeSection, setActiveSection] = useState('servicios');
    const [periodosPagados, setPeriodosPagados] = useState([]); // 📅 Períodos ya pagados

    useEffect(() => {
        cargarTecnicos();
        const hoy = new Date();
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        setFechaFin(hoy.toISOString().split('T')[0]);
        setFechaInicio(haceUnMes.toISOString().split('T')[0]);
    }, []);

    // 📅 Cargar períodos pagados cuando se selecciona un técnico
    useEffect(() => {
        if (tecnicoSeleccionado) {
            cargarPeriodosPagados();
        } else {
            setPeriodosPagados([]);
        }
    }, [tecnicoSeleccionado]);

    // 📅 Función para cargar períodos ya pagados
    const cargarPeriodosPagados = async () => {
        try {
            const response = await api.get(`/reportes/pago-tecnico/periodos-pagados?tecnicoId=${tecnicoSeleccionado}`);
            if (response.data?.success) {
                setPeriodosPagados(response.data.data || []);
            }
        } catch (error) {
            console.error('Error cargando períodos pagados:', error);
        }
    };

    // 📅 Verificar si una fecha está en un período ya pagado
    const isFechaPagada = (fecha) => {
        if (!fecha) return false;
        return periodosPagados.some(periodo => {
            const inicio = new Date(periodo.fechaInicio);
            const fin = new Date(periodo.fechaFin);
            const fechaCheck = new Date(fecha);
            return fechaCheck >= inicio && fechaCheck <= fin;
        });
    };


    const cargarTecnicos = async () => {
        try {
            const response = await api.get('/servicios/tecnicos');
            if (response.data?.success) setTecnicos(response.data.data || []);
        } catch (error) {
            console.error('Error cargando tecnicos:', error);
        }
    };

    const cargarReporte = async () => {
        if (!tecnicoSeleccionado) { toast.error('Selecciona un técnico'); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ usuarioId: tecnicoSeleccionado });
            if (fechaInicio) params.append('fechaInicio', fechaInicio);
            if (fechaFin) params.append('fechaFin', fechaFin);

            const response = await api.get(`/reportes/tecnico?${params}`);
            if (response.data?.success) {
                setDatos(response.data.data);
                toast.success(`Reporte generado`);
            }
            else throw new Error(response.data?.message || 'Error al cargar reporte');
        } catch (error) {
            console.error('Error reporte tecnico:', error);
            toast.error('Error al generar el reporte');
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-center mb-1"><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Wrench className="h-5 w-5 text-indigo-500" /> Reporte Técnico</h3></div>
                <div className="flex flex-col xl:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full xl:w-auto min-w-[200px]"><User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><select value={tecnicoSeleccionado} onChange={e => setTecnicoSeleccionado(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"><option value="">Seleccionar Técnico...</option>{tecnicos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>
                    <div className="flex gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 xl:w-40">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={e => setFechaInicio(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ${isFechaPagada(fechaInicio)
                                        ? 'bg-amber-50 border-amber-300 focus:ring-amber-500'
                                        : 'bg-gray-50 border-gray-200 focus:ring-indigo-500'
                                    }`}
                                title={isFechaPagada(fechaInicio) ? '⚠️ Esta fecha está en un período ya pagado' : ''}
                            />
                            {isFechaPagada(fechaInicio) && (
                                <div className="absolute right-2 top-2.5 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    PAGADO
                                </div>
                            )}
                        </div>
                        <div className="relative flex-1 xl:w-40">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={e => setFechaFin(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ${isFechaPagada(fechaFin)
                                        ? 'bg-amber-50 border-amber-300 focus:ring-amber-500'
                                        : 'bg-gray-50 border-gray-200 focus:ring-indigo-500'
                                    }`}
                                title={isFechaPagada(fechaFin) ? '⚠️ Esta fecha está en un período ya pagado' : ''}
                            />
                            {isFechaPagada(fechaFin) && (
                                <div className="absolute right-2 top-2.5 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    PAGADO
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3 w-full xl:w-auto mt-2 xl:mt-0"><button onClick={cargarReporte} disabled={!tecnicoSeleccionado} className="flex-1 xl:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm">{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Generar</button><button onClick={() => setShowPagoModal(true)} disabled={!tecnicoSeleccionado} className="flex-1 xl:flex-none bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"><Banknote className="h-4 w-4" /> Generar Pago</button></div>
                </div>
            </div>
            {datos ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-md"><p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Servicios Entregados</p><div className="flex justify-between items-end"><div><p className="text-3xl font-bold">{datos.metricas.totalServicios}</p><p className="text-xs opacity-90 mt-1">Total Completados</p></div><Smartphone className="h-10 w-10 text-white/20" /></div></div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Generado</p><div className="flex justify-between items-end"><div><p className="text-2xl font-bold text-gray-800">{formatCurrency(datos.metricas.montoTotalBs)}</p><p className="text-2xl font-bold text-emerald-500 mt-1">{formatCurrency(datos.metricas.montoTotalUsd, 'USD')}</p></div><Wallet className="h-8 w-8 text-emerald-100" /></div></div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><Smartphone className="h-4 w-4 text-indigo-500" /> Servicios Completados</h4>
                            <span className="bg-white px-2 py-1 text-xs font-bold border rounded-md">{datos.servicios.length} Items</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Fecha Entrega</th>
                                        <th className="px-6 py-3 text-left">N° Servicio</th>
                                        <th className="px-6 py-3 text-left">Cliente</th>
                                        <th className="px-6 py-3 text-left">Equipo</th>
                                        <th className="px-6 py-3 text-left">Falla</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {datos.servicios.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-600 font-mono text-xs">{new Date(s.fechaEntrega).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 font-mono text-xs font-bold text-indigo-600">{s.numeroServicio}</td>
                                            <td className="px-6 py-3 text-gray-800 font-medium">{s.cliente}</td>
                                            <td className="px-6 py-3 text-gray-600">{s.dispositivo}</td>
                                            <td className="px-6 py-3 text-gray-500 max-w-xs truncate" title={s.falla}>{s.falla}</td>
                                            <td className="px-6 py-3 text-right font-mono">
                                                <div className="flex flex-col items-end">
                                                    {s.totalBs > 0 && <span>{formatCurrency(s.totalBs)}</span>}
                                                    {s.totalUsd > 0 && <span className="text-emerald-600 text-[10px]">{formatCurrency(s.totalUsd, 'USD')}</span>}
                                                    {s.totalBs === 0 && s.totalUsd === 0 && <span className="text-gray-400 italic">Sin Ingreso</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><div className="bg-gray-50 p-4 rounded-full mb-4"> <Wrench className="h-10 w-10 text-gray-300" /> </div><p className="text-gray-500 font-medium">Selecciona un técnico para ver sus servicios entregados</p></div>}
            {showPagoModal && <GenerarPagoTecnicoModal
                usuarioId={tecnicoSeleccionado}
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
                tecnicosList={tecnicos}
                onClose={(reload) => {
                    setShowPagoModal(false);
                    if (reload) {
                        // Recargar períodos pagados si se registró un pago
                        cargarPeriodosPagados();
                    }
                }}
            />}
        </div>
    );
};
export default ReporteTecnico;
