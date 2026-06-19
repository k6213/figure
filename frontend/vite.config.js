import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Three.js 중복 인스턴스 방지 (GLTFExporter 등 examples/jsm 포함)
    dedupe: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing'],
  },
  optimizeDeps: {
    // Vite 사전 번들링에서 Three.js 단일 인스턴스 보장
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
      'three/examples/jsm/exporters/GLTFExporter.js',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
    ],
    exclude: [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three'],
          'r3f-vendor':   ['@react-three/fiber', '@react-three/drei'],
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 3000,
    proxy: {
      // Socket.IO WebSocket 연결 — ws:true 로 WS 업그레이드 프록시 활성화
      '/socket.io': {
        target:       'http://localhost:8000',
        ws:           true,
        changeOrigin: true,
      },
      '/api/v1/listings/stream': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['x-accel-buffering'] = 'no'
            delete proxyRes.headers['content-length']
          })
        },
      },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
