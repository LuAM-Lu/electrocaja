// client/src/hooks/usePresupuesto.js - HOOK PARA MANEJAR PRESUPUESTOS 🎯
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCajaStore } from '../store/cajaStore';
import toast from 'react-hot-toast';
import {
  generarPDFPresupuesto,
  descargarPDFPresupuesto,
  imprimirPresupuesto,
  generarImagenPresupuestoWhatsApp,
  enviarPresupuestoPorEmail,
  enviarPresupuestoPorWhatsApp,
  ejecutarExportPresupuesto,
  validarPresupuesto,
  validarExportConfig
} from '../utils/presupuestoUtils';

export const usePresupuesto = () => {
  const { usuario } = useAuthStore();
  const { tasaCambio } = useCajaStore();
  
  // Estados del hook
  const [loading, setLoading] = useState({});
  const [exportando, setExportando] = useState(false);

  // 📄 Generar PDF
  const generarPDF = async (presupuestoData) => {
    try {
      setLoading(prev => ({ ...prev, pdf: true }));
      
      const validacion = validarPresupuesto(presupuestoData);
      if (!validacion.valido) {
        throw new Error(validacion.errores.join('\n'));
      }

      const pdfBlob = await generarPDFPresupuesto(presupuestoData, tasaCambio);
      
      toast.success('📄 PDF generado exitosamente');
      return pdfBlob;
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      toast.error('Error generando PDF: ' + error.message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  // 💾 Descargar PDF
  const descargarPDF = async (presupuestoData) => {
    try {
      setLoading(prev => ({ ...prev, descarga: true }));
      
      await descargarPDFPresupuesto(presupuestoData, tasaCambio);
      
      toast.success('💾 PDF descargado exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error descargando PDF:', error);
      toast.error('Error descargando PDF: ' + error.message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, descarga: false }));
    }
  };

  // 🖨️ Imprimir presupuesto
  const imprimir = async (presupuestoData) => {
    try {
      setLoading(prev => ({ ...prev, imprimir: true }));
      
      await imprimirPresupuesto(presupuestoData, tasaCambio);
      
      toast.success('🖨️ Enviado a impresora');
      return true;
      
    } catch (error) {
      console.error('❌ Error imprimiendo:', error);
      toast.error('Error imprimiendo: ' + error.message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, imprimir: false }));
    }
  };

  // 📱 Enviar por WhatsApp
  const enviarWhatsApp = async (presupuestoData, numero, mensaje) => {
    try {
      setLoading(prev => ({ ...prev, whatsapp: true }));
      
      if (!numero) {
        throw new Error('Número de teléfono requerido');
      }

      const resultado = await enviarPresupuestoPorWhatsApp(
        presupuestoData, 
        tasaCambio, 
        numero, 
        mensaje
      );
      
      if (resultado.success) {
        toast.success('📱 Presupuesto enviado por WhatsApp');
        return resultado.data;
      } else {
        throw new Error(resultado.message || 'Error enviando WhatsApp');
      }
      
    } catch (error) {
      console.error('❌ Error enviando WhatsApp:', error);
      toast.error('Error enviando WhatsApp: ' + error.message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, whatsapp: false }));
    }
  };

  // 📧 Enviar por Email
  const enviarEmail = async (presupuestoData, destinatario) => {
    try {
      setLoading(prev => ({ ...prev, email: true }));
      
      if (!destinatario) {
        throw new Error('Email destinatario requerido');
      }

      const resultado = await enviarPresupuestoPorEmail(
        presupuestoData, 
        tasaCambio, 
        destinatario
      );
      
      if (resultado.success) {
        toast.success('📧 Presupuesto enviado por email');
        return resultado.data;
      } else {
        throw new Error(resultado.message || 'Error enviando email');
      }
      
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      toast.error('Error enviando email: ' + error.message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  // 🚀 Ejecutar múltiples exports
  const ejecutarExports = async (presupuestoData, exportConfig) => {
    try {
      setExportando(true);
      
      console.log('🚀 Ejecutando exports:', exportConfig);
      
      // Validar configuración
      const validacionConfig = validarExportConfig(exportConfig, presupuestoData);
      if (!validacionConfig.valido) {
        throw new Error(validacionConfig.errores.join('\n'));
      }

      const resultado = await ejecutarExportPresupuesto(
        presupuestoData, 
        tasaCambio, 
        exportConfig
      );
      
      // Mostrar resumen de resultados
      if (resultado.success) {
        const exitosos = resultado.resultados.filter(r => !r.includes('❌')).length;
        const fallidos = resultado.errores;
        
        if (fallidos > 0) {
          toast.success(`✅ ${exitosos} exports exitosos, ${fallidos} fallidos`, {
            duration: 4000
          });
        } else {
          toast.success(`🎉 Todos los exports completados exitosamente (${exitosos})`, {
            duration: 4000
          });
        }
        
        // Mostrar detalles
        resultado.resultados.forEach(resultado => {
          if (resultado.includes('❌')) {
            toast.error(resultado, { duration: 6000 });
          }
        });
      }
      
      return resultado;
      
    } catch (error) {
      console.error('❌ Error ejecutando exports:', error);
      toast.error('Error ejecutando exports: ' + error.message);
      throw error;
    } finally {
      setExportando(false);
    }
  };

  // 📊 Generar imagen para vista previa
  const generarImagenPrevia = async (presupuestoData) => {
    try {
      setLoading(prev => ({ ...prev, vista_previa: true }));
      
      const imagen = await generarImagenPresupuestoWhatsApp(presupuestoData, tasaCambio);
      
      return imagen;
      
    } catch (error) {
      console.error('❌ Error generando vista previa:', error);
      toast.error('Error generando vista previa');
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, vista_previa: false }));
    }
  };

  // 🎯 Validar presupuesto
  const validar = (presupuestoData) => {
    return validarPresupuesto(presupuestoData);
  };

  // 📊 Validar configuración de export
  const validarConfig = (exportConfig, presupuestoData) => {
    return validarExportConfig(exportConfig, presupuestoData);
  };

  // 📋 Obtener resumen del presupuesto
  const obtenerResumen = (presupuestoData) => {
    if (!presupuestoData.items || presupuestoData.items.length === 0) {
      return null;
    }

    const subtotal = presupuestoData.items.reduce((sum, item) => {
      return sum + (item.cantidad * item.precio_unitario);
    }, 0);

    const descuentoGlobal = presupuestoData.descuentoGlobal || 0;
    const tipoDescuento = presupuestoData.tipoDescuento || 'porcentaje';
    const impuesto = presupuestoData.impuestos || 16;

    let descuentoUsd;
    if (tipoDescuento === 'porcentaje') {
      descuentoUsd = (subtotal * descuentoGlobal) / 100;
    } else {
      descuentoUsd = descuentoGlobal / tasaCambio;
    }
    
    const baseImponible = subtotal - descuentoUsd;
    const ivaUsd = (baseImponible * impuesto) / 100;
    const totalUsd = baseImponible + ivaUsd;
    const totalBs = totalUsd * tasaCambio;

    return {
      cantidadItems: presupuestoData.items.reduce((sum, item) => sum + item.cantidad, 0),
      subtotalUsd: subtotal,
      subtotalBs: subtotal * tasaCambio,
      descuentoUsd,
      descuentoBs: descuentoUsd * tasaCambio,
      baseImponibleUsd: baseImponible,
      baseImponibleBs: baseImponible * tasaCambio,
      ivaUsd,
      ivaBs: ivaUsd * tasaCambio,
      totalUsd,
      totalBs,
      tasaCambio,
      cliente: presupuestoData.cliente?.nombre || 'Sin cliente',
      validoHasta: presupuestoData.fechaVencimiento
    };
  };

  return {
    // Estados
    loading,
    exportando,
    
    // Funciones principales
    generarPDF,
    descargarPDF,
    imprimir,
    enviarWhatsApp,
    enviarEmail,
    ejecutarExports,
    generarImagenPrevia,
    
    // Utilidades
    validar,
    validarConfig,
    obtenerResumen,
    
    // Datos del contexto
    usuario,
    tasaCambio
  };
};