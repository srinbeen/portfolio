import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../server/dist', // Output the build to the server directory
    rollupOptions: {
      input: './client/index.html', // Explicitly set the entry file
    },
  }
})
