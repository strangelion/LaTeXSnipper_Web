import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const localModelRoot = resolve('..', 'latexsnipper-core', 'release_models')
const allowedLocalModels = new Set([
  'latexsnipper-formula-det.zip',
  'latexsnipper-formula-rec.zip',
])

function localCoreModels() {
  return {
    name: 'latexsnipper-local-core-models',
    configureServer(server) {
      server.middlewares.use('/models/core/models-v2.0.0', (request, response, next) => {
        const asset = decodeURIComponent((request.url || '').replace(/^\//, '').split('?')[0])
        if (!allowedLocalModels.has(asset)) return next()
        const file = resolve(localModelRoot, asset)
        if (!existsSync(file)) return next()
        const size = statSync(file).size
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/zip')
        response.setHeader('Content-Length', String(size))
        response.setHeader('Cache-Control', 'no-store')
        if (request.method === 'HEAD') return response.end()
        createReadStream(file).pipe(response)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localCoreModels()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) 要求 manualChunks 为函数
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor';
          }
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    open: true,
  },
})
