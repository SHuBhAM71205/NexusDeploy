import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true },
});
