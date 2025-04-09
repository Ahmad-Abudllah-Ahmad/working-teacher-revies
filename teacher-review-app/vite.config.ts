import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/working-teacher-revies/', // Base path for GitHub Pages
  server: {
    port: 3000,
  },
});
