import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // import.meta.dirname es ESM y evita la deprecación de __dirname en Vite.
        '@': import.meta.dirname,
      },
    },
    server: {
      // HMR se desactiva en AI Studio mediante la variable DISABLE_HMR.
      // No modificar: el watching de archivos se deshabilita para ahorrar CPU
      // y evitar parpadeos durante las ediciones del agente.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Desarrollo local con backend Laravel: /api* se sirve vía proxy contra
      // `php artisan serve` (por defecto en el puerto 8000). En producción
      // Laravel sirve el build estático de Vite desde public/.
      proxy: {
        '/api': {
          target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: false,
        },
      },
    },
  };
});
