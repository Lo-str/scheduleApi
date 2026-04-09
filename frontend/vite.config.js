import {
  defineConfig
} from 'vite'
import react from '@vitejs/plugin-react'

// Vite build config for static GitHub Pages deployment.
export default defineConfig({
  // Repo-relative base path used by Pages under /frontEnd/.
  base: '/frontEnd/',
  plugins: [react()],
})