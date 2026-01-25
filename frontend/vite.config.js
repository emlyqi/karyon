import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mediaRoot = path.resolve(__dirname, '../backend/media')

function serveMediaFile(req, res) {
  const urlPath = decodeURIComponent(req.url.replace(/^\/media\//, '').split('?')[0])
  const filePath = path.join(mediaRoot, urlPath)

  if (!filePath.startsWith(mediaRoot)) return false

  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) return false

    const fileSize = stat.size
    const range = req.headers.range

    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.m4v': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      })
      fs.createReadStream(filePath, { start, end }).pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      })
      fs.createReadStream(filePath).pipe(res)
    }
    return true
  } catch {
    return false
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-media-with-range',
      configureServer(server) {
        // Add middleware that runs before Vite's internal middleware and proxy.
        // Serves media files from disk with Range request support
        // (needed for video seeking to work).
        server.middlewares.use((req, res, next) => {
          if (!req.url || !req.url.startsWith('/media/')) return next()
          if (!serveMediaFile(req, res)) return next()
        })
      }
    }
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
