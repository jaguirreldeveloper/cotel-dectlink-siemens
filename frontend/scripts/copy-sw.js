/**
 * Script para copiar el Service Worker al directorio public
 * Este script se ejecuta después del build para asegurar que sw.js esté disponible
 */

import { copyFile, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Rutas
const swDistSource = resolve(__dirname, '../dist/sw.js');
const swPublicDest = resolve(__dirname, '../public/sw.js');
const manifestSource = resolve(__dirname, '../public/manifest.json');

console.log('📄 Copiando recursos PWA...');

try {
  // Asegurar que el directorio public existe
  const publicDir = dirname(swPublicDest);
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
    console.log('📁 Creado directorio:', publicDir);
  }

  // Copiar sw.js de dist/ a public/
  if (existsSync(swDistSource)) {
    copyFile(
      swDistSource,
      swPublicDest,
      (err) => {
        if (err) {
          console.error('❌ Error al copiar Service Worker:', err.message);
          process.exit(1);
        } else {
          console.log('✅ Service Worker copiado de dist/sw.js a public/sw.js');
        }
      }
    );
  } else {
    console.warn('⚠️  dist/sw.js no encontrado, revisando si ya existe en public/');
    if (existsSync(swPublicDest)) {
      console.log('✅ sw.js ya existe en public/');
    } else {
      console.error('❌ sw.js no encontrado en ninguna ubicación');
      process.exit(1);
    }
  }

  // Verificar manifest
  if (existsSync(manifestSource)) {
    console.log('✅ manifest.json ya existe en public/');
  } else {
    console.warn('⚠️  manifest.json no encontrado en public/');
  }

  console.log('✨ PWA resources ready!');
} catch (error) {
  console.error('❌ Error al copiar recursos PWA:', error);
  process.exit(1);
}
