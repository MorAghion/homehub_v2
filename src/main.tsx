import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

// Apply persisted theme on boot (before first paint)
const theme = localStorage.getItem('homehub-theme') ?? 'burgundy'
document.documentElement.setAttribute('data-theme', theme)

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <Suspense fallback={null}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nextProvider>
    </Suspense>
  </StrictMode>,
)
