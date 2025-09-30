import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/main.ts',
        onstart(options) {
          // concurrently에서 이미 electron을 실행하므로 여기서는 실행하지 않음
          // if (options.startup) {
          //   options.startup(['--inspect=5858']);
          // }
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'sqlite3', 'chokidar']
            }
          },
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src'),
              '@main': resolve(__dirname, 'src/main'),
              '@renderer': resolve(__dirname, 'src/renderer'),
              '@shared': resolve(__dirname, 'src/shared')
            }
          }
        }
      },
      {
        entry: 'src/preload/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            sourcemap: 'inline',
            minify: false,
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron']
            }
          },
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src'),
              '@main': resolve(__dirname, 'src/main'),
              '@renderer': resolve(__dirname, 'src/renderer'),
              '@shared': resolve(__dirname, 'src/shared')
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
