import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `vite --mode mock`: local UI preview with demo data (no access code, no real DB).
    alias: mode === 'mock'
      ? [
          { find: /^(\.\.?\/)+supabaseClient$/, replacement: fileURLToPath(new URL('./dev/mockSupabase.ts', import.meta.url)) },
          { find: /^\.\/AuthGate$/, replacement: fileURLToPath(new URL('./dev/OpenGate.tsx', import.meta.url)) },
        ]
      : [],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-vendor|es-toolkit|immer|redux|@reduxjs|reselect)/ },
            { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
          ],
        },
      },
    },
  },
}))
