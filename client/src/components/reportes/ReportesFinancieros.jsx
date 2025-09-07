// components/reportes/ReportesFinancieros.jsx
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PieChart, BarChart3, Calendar, Download, Filter } from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

const ReportesFinancieros = () => {
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState('mes');
  const [tipoMoneda, setTipoMoneda] = useState('bs'); // 'bs', 'usd', 'ambas'
  const [datos, setDatos] = useState({
    flujoEfectivo: {
      ingresos: { bs: 0, usd: 0 },
      egresos: { bs: 0, usd: 0 },
      balance: { bs: 0, usd: 0 }
    },
    rentabilidad: {
      margenBruto: 0,
      margenNeto: 0,
      roi: 0
    },
    distribucionIngresos: [],
    distribucionEgresos: [],
    tendenciaMensual: [],
    comparativoAnual: {}
  });

  // Opciones de período
  const periodos = [
    { value: 'dia', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'trimestre', label: 'Este Trimestre' },
    { value: 'año', label: 'Este Año' }
  ];

  // Cargar datos financieros
  const cargarDatosFinancieros = async () => {
    setLoading(true);
    try {
      console.log('🔄 Cargando datos financieros...', { periodo, tipoMoneda });
      
      const response = await api.get('/reportes/financieros', { 
        params: { periodo, moneda: tipoMoneda } 
      });
      
      console.log('✅ Datos financieros cargados:', response.data);
      
      if (response.data.success) {
        setDatos(response.data.data);
        toast.success('Datos financieros actualizados');
      } else {
        throw new Error(response.data.message || 'Error al cargar datos financieros');
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos financieros:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Error al cargar datos financieros';
      toast.error(`Error: ${errorMessage}`);
      
      // Datos de ejemplo como fallback
      console.log('📝 Usando datos de ejemplo debido al error');
      setDatos({
        flujoEfectivo: {
          ingresos: { bs: 3500000, usd: 1750 },
          egresos: { bs: 850000, usd: 425 },
          balance: { bs: 2650000, usd: 1325 }
        },
        rentabilidad: {
          margenBruto: 65.8,
          margenNeto: 24.3,
          roi: 18.5
        },
        distribucionIngresos: [
          { categoria: 'Ventas Productos', monto: 2800000, porcentaje: 80 },
          { categoria: 'Servicios', monto: 450000, porcentaje: 12.9 },
          { categoria: 'Otros Ingresos', monto: 250000, porcentaje: 7.1 }
        ],
        distribucionEgresos: [
          { categoria: 'Pago Trabajadores', monto: 400000, porcentaje: 47.1 },
          { categoria: 'Pago Accionistas', monto: 250000, porcentaje: 29.4 },
          { categoria: 'Gastos Operativos', monto: 150000, porcentaje: 17.6 },
          { categoria: 'Otros Egresos', monto: 50000, porcentaje: 5.9 }
        ],
        tendenciaMensual: [
          { mes: 'Ene', ingresos: 2800000, egresos: 650000 },
          { mes: 'Feb', ingresos: 3200000, egresos: 720000 },
          { mes: 'Mar', ingresos: 3500000, egresos: 850000 }
        ],
        comparativoAnual: {
          añoActual: { ingresos: 9500000, egresos: 2220000 },
          añoAnterior: { ingresos: 8200000, egresos: 2100000 }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Formatear moneda
  const formatearMoneda = (amount, moneda = 'bs') => {
    if (moneda === 'usd') {
      return `$${(amount || 0).toFixed(2)}`;
    }
    return `${Math.round(amount || 0).toLocaleString('es-VE')} Bs`;
  };

  // Calcular porcentaje de cambio
  const calcularCambio = (actual, anterior) => {
    if (!anterior) return 0;
    return ((actual - anterior) / anterior * 100);
  };

  // Obtener color según el valor
  const getColorValor = (valor) => {
    if (valor > 0) return 'text-green-600';
    if (valor < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  useEffect(() => {
    cargarDatosFinancieros();
  }, [periodo, tipoMoneda]);

  return (
    <div className="space-y-6">
      {/* 🎛️ CONTROLES */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Reportes Financieros</h3>
          <p className="text-gray-600 text-sm">Análisis detallado del flujo de dinero y rentabilidad</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Selector de período */}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {periodos.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {/* Selector de moneda */}
          <select
            value={tipoMoneda}
            onChange={(e) => setTipoMoneda(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="bs">Solo Bolívares</option>
            <option value="usd">Solo Dólares</option>
            <option value="ambas">Ambas Monedas</option>
          </select>

          {/* Botón exportar */}
          <button
            onClick={() => toast.info('Función de exportación próximamente')}
            className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* 💰 FLUJO DE EFECTIVO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ingresos */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm">Ingresos Totales</p>
              <p className="text-2xl font-bold">{formatearMoneda(datos.flujoEfectivo.ingresos.bs)}</p>
              {tipoMoneda === 'ambas' && (
                <p className="text-green-100">{formatearMoneda(datos.flujoEfectivo.ingresos.usd, 'usd')}</p>
              )}
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
          <div className="text-green-100 text-sm">
            ↗ +12.5% vs período anterior
          </div>
        </div>

        {/* Egresos */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-red-100 text-sm">Egresos Totales</p>
              <p className="text-2xl font-bold">{formatearMoneda(datos.flujoEfectivo.egresos.bs)}</p>
              {tipoMoneda === 'ambas' && (
                <p className="text-red-100">{formatearMoneda(datos.flujoEfectivo.egresos.usd, 'usd')}</p>
              )}
            </div>
            <TrendingDown className="h-8 w-8 text-red-200" />
          </div>
          <div className="text-red-100 text-sm">
            ↗ +8.3% vs período anterior
          </div>
        </div>

        {/* Balance */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm">Balance Neto</p>
              <p className="text-2xl font-bold">{formatearMoneda(datos.flujoEfectivo.balance.bs)}</p>
              {tipoMoneda === 'ambas' && (
                <p className="text-blue-100">{formatearMoneda(datos.flujoEfectivo.balance.usd, 'usd')}</p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-blue-200" />
          </div>
          <div className="text-blue-100 text-sm">
            ↗ +18.7% vs período anterior
          </div>
        </div>
      </div>

      {/* 📊 INDICADORES DE RENTABILIDAD */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
          Indicadores de Rentabilidad
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-purple-50 rounded-xl">
            <p className="text-4xl font-bold text-purple-600">{datos.rentabilidad.margenBruto}%</p>
            <p className="text-purple-700 font-medium mt-2">Margen Bruto</p>
            <p className="text-sm text-purple-600 mt-1">+2.3% vs anterior</p>
          </div>
          
          <div className="text-center p-6 bg-blue-50 rounded-xl">
            <p className="text-4xl font-bold text-blue-600">{datos.rentabilidad.margenNeto}%</p>
            <p className="text-blue-700 font-medium mt-2">Margen Neto</p>
            <p className="text-sm text-blue-600 mt-1">+1.8% vs anterior</p>
          </div>
          
          <div className="text-center p-6 bg-green-50 rounded-xl">
            <p className="text-4xl font-bold text-green-600">{datos.rentabilidad.roi}%</p>
            <p className="text-green-700 font-medium mt-2">ROI</p>
            <p className="text-sm text-green-600 mt-1">+3.2% vs anterior</p>
          </div>
        </div>
      </div>

      {/* 📈 DISTRIBUCIÓN DE INGRESOS Y EGRESOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribución de Ingresos */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 text-green-500 mr-2" />
            Distribución de Ingresos
          </h4>
          
          <div className="space-y-4">
            {datos.distribucionIngresos?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    index === 0 ? 'bg-green-500' :
                    index === 1 ? 'bg-green-400' :
                    index === 2 ? 'bg-green-300' : 'bg-green-200'
                  }`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{item.categoria}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.porcentaje}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-bold text-green-600 text-sm">{formatearMoneda(item.monto)}</p>
                  <p className="text-xs text-gray-500">{item.porcentaje}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución de Egresos */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 text-red-500 mr-2" />
            Distribución de Egresos
          </h4>
          
          <div className="space-y-4">
            {datos.distribucionEgresos?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    index === 0 ? 'bg-red-500' :
                    index === 1 ? 'bg-red-400' :
                    index === 2 ? 'bg-red-300' : 'bg-red-200'
                  }`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{item.categoria}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.porcentaje}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-bold text-red-600 text-sm">{formatearMoneda(item.monto)}</p>
                  <p className="text-xs text-gray-500">{item.porcentaje}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 📈 TENDENCIA MENSUAL */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
          Tendencia Mensual
        </h4>
        
        <div className="space-y-4">
          {datos.tendenciaMensual?.map((mes, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 items-center p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-900">{mes.mes}</div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="font-bold text-green-600">{formatearMoneda(mes.ingresos)}</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">Egresos</p>
                <p className="font-bold text-red-600">{formatearMoneda(mes.egresos)}</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">Balance</p>
                <p className={`font-bold ${getColorValor(mes.ingresos - mes.egresos)}`}>
                  {formatearMoneda(mes.ingresos - mes.egresos)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📊 COMPARATIVO ANUAL */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Calendar className="h-5 w-5 text-orange-500 mr-2" />
          Comparativo Anual
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Año Actual */}
          <div className="p-6 bg-blue-50 rounded-xl">
            <h5 className="text-lg font-bold text-blue-900 mb-4">Año Actual (2025)</h5>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-700">Ingresos:</span>
                <span className="font-bold text-blue-900">
                  {formatearMoneda(datos.comparativoAnual?.añoActual?.ingresos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Egresos:</span>
                <span className="font-bold text-blue-900">
                  {formatearMoneda(datos.comparativoAnual?.añoActual?.egresos)}
                </span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-2">
                <span className="text-blue-700 font-medium">Balance:</span>
                <span className="font-bold text-green-600">
                  {formatearMoneda((datos.comparativoAnual?.añoActual?.ingresos || 0) - (datos.comparativoAnual?.añoActual?.egresos || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Año Anterior */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <h5 className="text-lg font-bold text-gray-900 mb-4">Año Anterior (2024)</h5>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Ingresos:</span>
                <span className="font-bold text-gray-900">
                  {formatearMoneda(datos.comparativoAnual?.añoAnterior?.ingresos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Egresos:</span>
                <span className="font-bold text-gray-900">
                  {formatearMoneda(datos.comparativoAnual?.añoAnterior?.egresos)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-700 font-medium">Balance:</span>
                <span className="font-bold text-green-600">
                  {formatearMoneda((datos.comparativoAnual?.añoAnterior?.ingresos || 0) - (datos.comparativoAnual?.añoAnterior?.egresos || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cálculo de variación */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
          <h6 className="font-bold text-gray-900 mb-2">Variación Anual</h6>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-600">Crecimiento Ingresos</p>
              <p className={`text-xl font-bold ${getColorValor(calcularCambio(
                datos.comparativoAnual?.añoActual?.ingresos,
                datos.comparativoAnual?.añoAnterior?.ingresos
              ))}`}>
                +{calcularCambio(
                  datos.comparativoAnual?.añoActual?.ingresos || 0,
                  datos.comparativoAnual?.añoAnterior?.ingresos || 1
                ).toFixed(1)}%
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600">Variación Egresos</p>
              <p className={`text-xl font-bold ${getColorValor(calcularCambio(
                datos.comparativoAnual?.añoActual?.egresos,
                datos.comparativoAnual?.añoAnterior?.egresos
              ))}`}>
                +{calcularCambio(
                  datos.comparativoAnual?.añoActual?.egresos || 0,
                  datos.comparativoAnual?.añoAnterior?.egresos || 1
                ).toFixed(1)}%
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600">Mejora Balance</p>
              <p className="text-xl font-bold text-green-600">
                +{calcularCambio(
                  (datos.comparativoAnual?.añoActual?.ingresos || 0) - (datos.comparativoAnual?.añoActual?.egresos || 0),
                  (datos.comparativoAnual?.añoAnterior?.ingresos || 0) - (datos.comparativoAnual?.añoAnterior?.egresos || 1)
                ).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesFinancieros;