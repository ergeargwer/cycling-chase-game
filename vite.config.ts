import { defineConfig } from 'vite'
import path from 'path'

// GitHub Pages 專案站：VITE_BASE=/cycling-chase-game/
// 本機 / Electron / 相對路徑預設 './'
const base = process.env.VITE_BASE || './'

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  publicDir: path.resolve(__dirname, 'public'),
  base,
  build: {
    target: 'es2022',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
