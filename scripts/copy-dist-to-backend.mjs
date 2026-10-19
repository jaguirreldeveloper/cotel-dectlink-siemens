/**
 * Copia el build de Vite (dist/) a backend/public/ para que Laravel sirva el
 * SPA en producción (Laravel Cloud). Los assets con hash se limpian antes de
 * copiar para no acumular versiones viejas.
 *
 * Uso: npm run build:backend  (vite build && node scripts/copy-dist-to-backend.mjs)
 */
import {cpSync, existsSync, readdirSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const destino = join(root, 'backend', 'public');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('No existe dist/index.html. Ejecuta primero: npm run build');
  process.exit(1);
}

// Limpiar build anterior (conservar index.php, .htaccess, favicon, robots).
const assetsPrevios = join(destino, 'assets');
if (existsSync(assetsPrevios)) {
  rmSync(assetsPrevios, {recursive: true, force: true});
}

cpSync(join(dist, 'index.html'), join(destino, 'index.html'));

if (existsSync(join(dist, 'assets'))) {
  cpSync(join(dist, 'assets'), join(destino, 'assets'), {recursive: true});
}

// Copiar también estáticos extra que Vite sirva desde dist/ (favicon, etc.).
for (const entry of readdirSync(dist)) {
  if (entry === 'index.html' || entry === 'assets') {
    continue;
  }
  cpSync(join(dist, entry), join(destino, entry), {recursive: true});
}

const assets = existsSync(join(destino, 'assets')) ? readdirSync(join(destino, 'assets')) : [];
console.log(`Build copiado a backend/public/ (${assets.length} assets).`);
