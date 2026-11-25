import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor-firebase-auth',
                test: /node_modules[\\/](firebase[\\/](app|auth)|@firebase[\\/](app|auth|component|logger|util))[\\/]/,
                priority: 25,
              },
              {
                name: 'vendor-firebase-firestore',
                test: /node_modules[\\/](firebase[\\/]firestore|@firebase[\\/]firestore|@firebase[\\/]webchannel-wrapper)[\\/]/,
                priority: 25,
              },
              {
                name: 'vendor-icons',
                test: /node_modules[\\/]lucide-react[\\/]/,
                priority: 20,
              },
              {
                name: 'vendor-jspdf',
                test: /node_modules[\\/]jspdf[\\/]/,
                priority: 20,
              },
              {
                name: 'vendor-html2canvas',
                test: /node_modules[\\/]html2canvas[\\/]/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
