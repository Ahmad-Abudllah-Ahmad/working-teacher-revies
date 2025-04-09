import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/teacher-reviewing-anoumously/', // Base path for GitHub Pages
  server: {
    port: 3000,
  },
});
