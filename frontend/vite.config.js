import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // Add the lines below
    allowedHosts: [
      'dealership-production-98d3.up.railway.app',
      '.up.railway.app' 
    ],
    watch: {
      usePolling: true,
    },
  },
})