import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  const backendPort = env.PORT ?? '3847'
  const devPort = parseInt(env.VITE_DEV_PORT ?? '5280', 10)

  return {
    // 统一读取 monorepo 根目录 .env 中的 VITE_* 变量
    envDir: '..',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: devPort,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/socket.io': {
          target: `http://localhost:${backendPort}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
