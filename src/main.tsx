import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
})

// PWA service worker is only useful in web browsers, not native apps
if (!Capacitor.isNativePlatform()) {
  registerSW({
    onNeedRefresh() {
      if (confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
        window.location.reload()
      }
    },
    onOfflineReady() {
      console.log('오프라인 사용 준비 완료')
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
