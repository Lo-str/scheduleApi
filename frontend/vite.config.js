import {
  defineConfig
} from 'vite'
import react from '@vitejs/plugin-react'

// Vite build config for static GitHub Pages deployment.
export default defineConfig({
  // Repo-relative base path used by Pages under /frontEnd/.
  base: '/frontEnd/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [react()],
})