import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 'localhost' 로 두면 Node 가 ::1(IPv6) 로 먼저 붙는데, 백엔드가 0.0.0.0(IPv4) 로만
  // listen 하는 환경에서는 프록시가 전부 ECONNREFUSED → 502 로 죽는다. 127.0.0.1 로 고정한다.
  const proxyTarget = env.VITE_PROXY_API_TARGET || 'http://127.0.0.1:3000'
  const isVercelBuild = process.env.VERCEL === '1' || process.env.VERCEL === 'true'
  const basePath = isVercelBuild ? '/' : '/dojeon-frontend/'
  const apiPaths = [
    '/auth',
    '/user',
    '/home',
    '/courses',
    '/lessons',
    '/practice',
    '/section',
    '/scrap',
    '/subscription',
    '/nlp',
  ]

  return {
    base: basePath,
    plugins: [react()],
    server: {
      proxy: Object.fromEntries(
        apiPaths.map((path) => [
          path,
          {
            target: proxyTarget,
            changeOrigin: true,
            secure: false,
          },
        ]),
      ),
    },
  }
})
