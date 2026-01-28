import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { // Si tus rutas de backend comienzan con /api (ej. /api/resoluciones)
        target: 'http://localhost:3000', // <-- ¡Asegúrate de que este sea el puerto de tu backend!
        changeOrigin: true, // Cambia el origen de la solicitud
        // rewrite: (path) => path.replace(/^\/api/, ''), // Descomenta si tu backend NO usa /api y tú SÍ quieres usarlo en el frontend
                                                          // Es decir, si en React llamas /api/resoluciones
                                                          // pero tu Express tiene router.get('/resoluciones')
      },
    },
  },
});
