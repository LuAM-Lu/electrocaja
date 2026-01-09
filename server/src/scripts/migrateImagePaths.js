/**
 * Script para migrar rutas de imágenes de /uploads/temp/ a /uploads/products/
 * 
 * Problema: Algunas imágenes de productos quedaron con rutas temporales
 * que no existen en producción.
 * 
 * Uso: node src/scripts/migrateImagePaths.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function migrateImagePaths() {
    console.log('🔄 Iniciando migración de rutas de imágenes...\n');

    try {
        // Buscar productos con rutas que apuntan a /uploads/temp/
        const productosConRutasTmp = await prisma.product.findMany({
            where: {
                imagenUrl: {
                    contains: '/uploads/temp/'
                }
            },
            select: {
                id: true,
                descripcion: true,
                imagenUrl: true,
                codigoInterno: true
            }
        });

        console.log(`📊 Encontrados ${productosConRutasTmp.length} productos con rutas temporales\n`);

        if (productosConRutasTmp.length === 0) {
            console.log('✅ No hay productos con rutas temporales. Nada que migrar.');
            return;
        }

        let migrados = 0;
        let sinImagen = 0;
        let errores = 0;

        for (const producto of productosConRutasTmp) {
            console.log(`\n📦 Procesando: ${producto.descripcion} (ID: ${producto.id})`);
            console.log(`   Ruta actual: ${producto.imagenUrl}`);

            // Extraer nombre del archivo
            const filename = path.basename(producto.imagenUrl);

            // Verificar si existe en temp
            const tempPath = path.join(__dirname, '../../uploads/temp', filename);
            const productsPath = path.join(__dirname, '../../uploads/products/thumbnails', filename);

            let fileExists = false;
            try {
                await fs.access(tempPath);
                fileExists = true;
                console.log(`   ✅ Archivo temp existe: ${tempPath}`);
            } catch {
                console.log(`   ⚠️ Archivo temp NO existe: ${tempPath}`);
            }

            // Si existe en temp, mover a products
            if (fileExists) {
                try {
                    // Asegurar que existe el directorio de destino
                    await fs.mkdir(path.join(__dirname, '../../uploads/products/thumbnails'), { recursive: true });

                    // Copiar archivo (usar copy en lugar de move para mayor seguridad)
                    await fs.copyFile(tempPath, productsPath);
                    console.log(`   📁 Archivo copiado a: ${productsPath}`);

                    // Actualizar ruta en la BD
                    await prisma.product.update({
                        where: { id: producto.id },
                        data: {
                            imagenUrl: `/uploads/products/thumbnails/${filename}`
                        }
                    });
                    console.log(`   ✅ Ruta actualizada en BD`);
                    migrados++;
                } catch (error) {
                    console.log(`   ❌ Error moviendo archivo: ${error.message}`);
                    errores++;
                }
            } else {
                // Archivo no existe - limpiar la referencia
                console.log(`   🧹 Limpiando referencia a imagen inexistente...`);
                await prisma.product.update({
                    where: { id: producto.id },
                    data: {
                        imagenUrl: null
                    }
                });
                sinImagen++;
            }
        }

        console.log('\n========================================');
        console.log('📊 RESUMEN DE MIGRACIÓN:');
        console.log(`   ✅ Migrados: ${migrados}`);
        console.log(`   🧹 Limpiados (sin imagen): ${sinImagen}`);
        console.log(`   ❌ Errores: ${errores}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error en migración:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar
migrateImagePaths();
