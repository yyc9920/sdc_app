import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
