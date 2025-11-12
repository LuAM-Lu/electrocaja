// Script de prueba para descontar stock al crear una orden de servicio
// Uso: node server/scripts/test-descontar-stock-servicio.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDescontarStockServicio() {
  try {
    console.log('🧪 ===== TEST: DESCONTAR STOCK AL CREAR SERVICIO =====\n');

    // 1. Buscar un producto físico disponible
    const producto = await prisma.product.findFirst({
      where: {
        tipo: { in: ['PRODUCTO', 'ELECTROBAR'] },
        activo: true,
        stock: { gt: 0 }
      },
      select: {
        id: true,
        descripcion: true,
        stock: true,
        tipo: true
      }
    });

    if (!producto) {
      console.error('❌ No se encontró ningún producto físico con stock disponible');
      return;
    }

    console.log('📦 Producto seleccionado para prueba:');
    console.log(`   ID: ${producto.id}`);
    console.log(`   Descripción: ${producto.descripcion}`);
    console.log(`   Tipo: ${producto.tipo}`);
    console.log(`   Stock actual: ${producto.stock}\n`);

    // 2. Buscar un cliente de prueba
    const cliente = await prisma.cliente.findFirst({
      select: {
        id: true,
        nombre: true
      }
    });

    if (!cliente) {
      console.error('❌ No se encontró ningún cliente');
      return;
    }

    console.log('👤 Cliente seleccionado:');
    console.log(`   ID: ${cliente.id}`);
    console.log(`   Nombre: ${cliente.nombre}\n`);

    // 3. Buscar un usuario admin para crear el servicio
    const usuario = await prisma.user.findFirst({
      where: {
        rol: 'admin'
      },
      select: {
        id: true,
        nombre: true
      }
    });

    if (!usuario) {
      console.error('❌ No se encontró ningún usuario admin');
      return;
    }

    console.log('👨‍💼 Usuario seleccionado:');
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Nombre: ${usuario.nombre}\n`);

    // 4. Buscar una caja abierta
    const caja = await prisma.caja.findFirst({
      where: {
        estado: 'ABIERTA'
      },
      select: {
        id: true
      }
    });

    if (!caja) {
      console.error('❌ No se encontró ninguna caja abierta');
      return;
    }

    console.log('💰 Caja seleccionada:');
    console.log(`   ID: ${caja.id}\n`);

    // 5. Crear servicio de prueba con el producto
    const cantidadDescontar = 1;
    const precioUnitario = 10.00;

    console.log('🔨 Creando servicio de prueba...\n');

    const resultado = await prisma.$transaction(async (tx) => {
      // Crear servicio
      const servicio = await tx.servicioTecnico.create({
        data: {
          numeroServicio: `TEST-${Date.now()}`,
          consecutivoDelDia: 1,
          clienteId: cliente.id,
          clienteNombre: cliente.nombre,
          dispositivoMarca: 'TEST',
          dispositivoModelo: 'TEST MODEL',
          dispositivoImei: 'TEST-IMEI',
          estado: 'RECIBIDO',
          tecnicoAsignado: 'Técnico de Prueba',
          modalidadPago: 'PAGO_POSTERIOR',
          totalEstimado: precioUnitario * cantidadDescontar,
          totalPagado: 0,
          saldoPendiente: precioUnitario * cantidadDescontar,
          creadoPorId: usuario.id,
          cajaIngresoId: caja.id
        }
      });

      console.log(`✅ Servicio creado: ${servicio.numeroServicio} (ID: ${servicio.id})\n`);

      // Crear item del servicio
      await tx.servicioTecnicoItem.create({
        data: {
          servicioId: servicio.id,
          productoId: producto.id,
          descripcion: producto.descripcion,
          cantidad: cantidadDescontar,
          precioUnitario: precioUnitario,
          subtotal: precioUnitario * cantidadDescontar,
          esPersonalizado: false
        }
      });

      console.log(`✅ Item creado en servicio\n`);

      // Verificar stock antes de descontar
      const productoAntes = await tx.product.findUnique({
        where: { id: producto.id },
        select: { stock: true, descripcion: true }
      });

      console.log(`📊 Stock ANTES de descontar: ${productoAntes.stock}`);

      // Descontar stock
      await tx.product.update({
        where: { id: producto.id },
        data: {
          stock: { decrement: cantidadDescontar }
        }
      });

      // Verificar stock después de descontar
      const productoDespues = await tx.product.findUnique({
        where: { id: producto.id },
        select: { stock: true }
      });

      console.log(`📊 Stock DESPUÉS de descontar: ${productoDespues.stock}`);
      console.log(`✅ Diferencia: ${productoAntes.stock - productoDespues.stock} unidades\n`);

      // Crear movimiento de stock
      await tx.stockMovement.create({
        data: {
          productoId: producto.id,
          tipo: 'SALIDA',
          cantidad: cantidadDescontar,
          stockAnterior: productoAntes.stock,
          stockNuevo: productoDespues.stock,
          precio: precioUnitario,
          motivo: `Servicio técnico ${servicio.numeroServicio}`,
          usuarioId: usuario.id
        }
      });

      console.log(`✅ Movimiento de stock registrado\n`);

      return {
        servicio,
        stockAntes: productoAntes.stock,
        stockDespues: productoDespues.stock,
        diferencia: productoAntes.stock - productoDespues.stock
      };
    });

    console.log('✅ ===== TEST COMPLETADO EXITOSAMENTE =====');
    console.log(`\n📋 Resumen:`);
    console.log(`   Servicio: ${resultado.servicio.numeroServicio}`);
    console.log(`   Stock antes: ${resultado.stockAntes}`);
    console.log(`   Stock después: ${resultado.stockDespues}`);
    console.log(`   Diferencia: ${resultado.diferencia} unidades`);
    console.log(`\n✅ El stock se descontó correctamente!\n`);

  } catch (error) {
    console.error('❌ Error en el test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el test
testDescontarStockServicio()
  .then(() => {
    console.log('✅ Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

