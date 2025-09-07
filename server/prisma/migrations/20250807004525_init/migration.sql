-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'supervisor', 'cajero', 'viewer');

-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('MATUTINO', 'VESPERTINO', 'NOCTURNO');

-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA', 'PENDIENTE_CIERRE_FISICO');

-- CreateEnum
CREATE TYPE "TipoTransaccion" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "MetodoPagoArqueo" AS ENUM ('EFECTIVO_BS', 'EFECTIVO_USD', 'PAGO_MOVIL');

-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('PRODUCTO', 'SERVICIO', 'ELECTROBAR');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'RESERVA', 'LIBERACION', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'TRANSFERENCIA', 'MERMA');

-- CreateEnum
CREATE TYPE "EstadoVentaEspera" AS ENUM ('ACTIVA', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "TipoVentaEspera" AS ENUM ('INTENCIONAL', 'EMERGENCIA', 'DESCONEXION');

-- CreateEnum
CREATE TYPE "AccionImportacion" AS ENUM ('CREAR', 'ACTUALIZAR', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoImportacion" AS ENUM ('PROCESANDO', 'COMPLETADA', 'ERROR', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AccionCarrito" AS ENUM ('AGREGAR', 'MODIFICAR', 'ELIMINAR', 'PROCESAR', 'CANCELAR', 'GUARDAR_ESPERA', 'RETOMAR_ESPERA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RECIBO_VENTA', 'FACTURA_NO_FISCAL', 'NOTA_ENTREGA', 'COMPROBANTE_PAGO', 'COTIZACION');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('GENERADO', 'ERROR_GENERACION', 'ELIMINADO', 'REEMPLAZADO');

-- CreateEnum
CREATE TYPE "FormatoImpresion" AS ENUM ('TERMICA_58MM', 'TERMICA_80MM', 'A4', 'TICKET', 'MEDIA_CARTA');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Role" NOT NULL DEFAULT 'cajero',
    "sucursal" TEXT NOT NULL,
    "turno" "Turno" NOT NULL DEFAULT 'MATUTINO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "quick_access_token" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas" (
    "id" SERIAL NOT NULL,
    "hora_apertura" TEXT,
    "monto_inicial_bs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_inicial_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "usuario_apertura_id" INTEGER NOT NULL,
    "usuario_cierre_id" INTEGER,
    "hora_cierre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fecha" DATE NOT NULL,
    "total_egresos_bs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_egresos_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_ingresos_bs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_ingresos_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_inicial_pago_movil" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_pago_movil" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "imagen_apertura" TEXT,
    "imagen_cierre" TEXT,
    "monto_final_bs" DECIMAL(12,2),
    "monto_final_pago_movil" DECIMAL(12,2),
    "monto_final_usd" DECIMAL(12,2),
    "observaciones_apertura" TEXT,
    "observaciones_cierre" TEXT,
    "tasa_bcv" DECIMAL(8,4),
    "tasa_paralelo" DECIMAL(8,4),
    "fechaAutoCierre" TIMESTAMP(3),
    "motivoAutoCierre" TEXT,
    "requiereConteoFisico" BOOLEAN NOT NULL DEFAULT false,
    "usuarioResponsableId" INTEGER,

    CONSTRAINT "cajas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arqueos" (
    "id" SERIAL NOT NULL,
    "caja_id" INTEGER NOT NULL,
    "metodo_pago" "MetodoPagoArqueo" NOT NULL,
    "monto_sistema" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_contado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diferencia" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arqueos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones" (
    "id" SERIAL NOT NULL,
    "caja_id" INTEGER NOT NULL,
    "tipo" "TipoTransaccion" NOT NULL,
    "categoria" TEXT NOT NULL,
    "observaciones" TEXT,
    "total_bs" DECIMAL(12,2) NOT NULL,
    "total_usd" DECIMAL(12,2) NOT NULL,
    "tasa_cambio_usada" DECIMAL(8,4),
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "cliente_nombre" TEXT,
    "codigo_venta" TEXT NOT NULL,
    "consecutivo_del_dia" INTEGER NOT NULL,
    "metodo_pago_principal" TEXT,
    "descuento_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cantidad_items" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "sesion_id" TEXT,
    "tiempo_servicio" INTEGER,
    "numero_comprobante" TEXT,
    "requiere_factura" BOOLEAN NOT NULL DEFAULT false,
    "factura_generada" BOOLEAN NOT NULL DEFAULT false,
    "recibo_generado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "transacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "transaccion_id" INTEGER NOT NULL,
    "metodo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL,
    "banco" TEXT,
    "referencia" TEXT,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" "TipoProducto" NOT NULL DEFAULT 'PRODUCTO',
    "codigo_barras" TEXT NOT NULL,
    "codigo_interno" TEXT NOT NULL,
    "categoria" TEXT,
    "precio_costo" DECIMAL(12,2) NOT NULL,
    "precio_venta" DECIMAL(12,2) NOT NULL,
    "margen_porcentaje" DECIMAL(5,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_disponible" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 5,
    "stock_maximo" INTEGER NOT NULL DEFAULT 100,
    "ubicacion_fisica" TEXT,
    "imagen_url" TEXT,
    "imagen_thumbnail" TEXT,
    "proveedor_factura_iva" BOOLEAN DEFAULT false,
    "proveedor" TEXT,
    "telefono_proveedor" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "creado_por_id" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "ultima_venta" TIMESTAMP(3),
    "fecha_inactivacion" TIMESTAMP(3),
    "motivo_inactivacion" TEXT,
    "proveedor_id" INTEGER,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_anterior" INTEGER NOT NULL,
    "stock_nuevo" INTEGER NOT NULL,
    "precio" DECIMAL(12,2),
    "transaccion_id" INTEGER,
    "venta_espera_id" INTEGER,
    "importacion_id" INTEGER,
    "motivo" TEXT,
    "observaciones" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_changes" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "motivo" TEXT,

    CONSTRAINT "product_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" SERIAL NOT NULL,
    "transaccion_id" INTEGER NOT NULL,
    "producto_id" INTEGER,
    "descripcion" TEXT NOT NULL,
    "codigo_barras" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "precio_costo" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_sales" (
    "id" SERIAL NOT NULL,
    "numero_venta" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "caja_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "cliente_nombre" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "tasa_cambio" DECIMAL(8,4) NOT NULL,
    "tipo_espera" "TipoVentaEspera" NOT NULL DEFAULT 'INTENCIONAL',
    "es_intencional" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "tiempo_limite_min" INTEGER NOT NULL DEFAULT 120,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesion_activa" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoVentaEspera" NOT NULL DEFAULT 'ACTIVA',
    "observaciones" TEXT,
    "motivo_cancelacion" TEXT,

    CONSTRAINT "pending_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_sale_items" (
    "id" SERIAL NOT NULL,
    "venta_espera_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "codigo_barras" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pending_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_imports" (
    "id" SERIAL NOT NULL,
    "numero_factura" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "telefono" TEXT,
    "fecha_compra" TIMESTAMP(3) NOT NULL,
    "total_productos" INTEGER NOT NULL,
    "productos_creados" INTEGER NOT NULL,
    "productos_actualizados" INTEGER NOT NULL,
    "monto_total" DECIMAL(12,2) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_importacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivo_original" TEXT,
    "observaciones" TEXT,
    "estado" "EstadoImportacion" NOT NULL DEFAULT 'COMPLETADA',

    CONSTRAINT "bulk_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_import_items" (
    "id" SERIAL NOT NULL,
    "importacion_id" INTEGER NOT NULL,
    "producto_id" INTEGER,
    "descripcion" TEXT NOT NULL,
    "codigo_barras" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_costo" DECIMAL(12,2) NOT NULL,
    "precio_venta" DECIMAL(12,2) NOT NULL,
    "accion" "AccionImportacion" NOT NULL,
    "mensaje_error" TEXT,

    CONSTRAINT "bulk_import_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "cedula_rif" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "tipo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "rif" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrito_auditoria" (
    "id" SERIAL NOT NULL,
    "sesion_id" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "accion" "AccionCarrito" NOT NULL,
    "cantidad_anterior" INTEGER,
    "cantidad_nueva" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "motivo_eliminacion" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "tiempo_en_carrito" INTEGER,
    "fue_comprado" BOOLEAN,
    "transaccion_id" INTEGER,
    "venta_espera_id" INTEGER,

    CONSTRAINT "carrito_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_documentos" (
    "id" SERIAL NOT NULL,
    "transaccion_id" INTEGER NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_comprobante" TEXT NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "tamaño" INTEGER,
    "hash" TEXT,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'GENERADO',
    "formato_impresion" "FormatoImpresion" NOT NULL,
    "impreso" BOOLEAN NOT NULL DEFAULT false,
    "fecha_impresion" TIMESTAMP(3),
    "reimpresiones" INTEGER NOT NULL DEFAULT 0,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_creacion" INTEGER NOT NULL,
    "observaciones" TEXT,
    "es_fiscal" BOOLEAN NOT NULL DEFAULT false,
    "numero_fiscal" TEXT,
    "tipo_contribuyente" TEXT,

    CONSTRAINT "venta_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_quick_access_token_key" ON "users"("quick_access_token");

-- CreateIndex
CREATE UNIQUE INDEX "transacciones_codigo_venta_key" ON "transacciones"("codigo_venta");

-- CreateIndex
CREATE UNIQUE INDEX "transacciones_numero_comprobante_key" ON "transacciones"("numero_comprobante");

-- CreateIndex
CREATE UNIQUE INDEX "pending_sales_numero_venta_key" ON "pending_sales"("numero_venta");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cedula_rif_key" ON "clientes"("cedula_rif");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_rif_key" ON "proveedores"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "venta_documentos_numero_comprobante_tipo_documento_key" ON "venta_documentos"("numero_comprobante", "tipo_documento");

-- AddForeignKey
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_usuario_apertura_id_fkey" FOREIGN KEY ("usuario_apertura_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_usuario_cierre_id_fkey" FOREIGN KEY ("usuario_cierre_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arqueos" ADD CONSTRAINT "arqueos_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "cajas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "cajas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "bulk_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_venta_espera_id_fkey" FOREIGN KEY ("venta_espera_id") REFERENCES "pending_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_changes" ADD CONSTRAINT "product_changes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_changes" ADD CONSTRAINT "product_changes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_sales" ADD CONSTRAINT "pending_sales_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "cajas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_sales" ADD CONSTRAINT "pending_sales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_sale_items" ADD CONSTRAINT "pending_sale_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_sale_items" ADD CONSTRAINT "pending_sale_items_venta_espera_id_fkey" FOREIGN KEY ("venta_espera_id") REFERENCES "pending_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_imports" ADD CONSTRAINT "bulk_imports_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_import_items" ADD CONSTRAINT "bulk_import_items_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "bulk_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_import_items" ADD CONSTRAINT "bulk_import_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_auditoria" ADD CONSTRAINT "carrito_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_auditoria" ADD CONSTRAINT "carrito_auditoria_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_auditoria" ADD CONSTRAINT "carrito_auditoria_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_auditoria" ADD CONSTRAINT "carrito_auditoria_venta_espera_id_fkey" FOREIGN KEY ("venta_espera_id") REFERENCES "pending_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_documentos" ADD CONSTRAINT "venta_documentos_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_documentos" ADD CONSTRAINT "venta_documentos_usuario_creacion_fkey" FOREIGN KEY ("usuario_creacion") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
