/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/life-hub-app/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'happy-dom',
  },
})
