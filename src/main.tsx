import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { Analytics } from './components/Analytics'
import './i18n'
import './index.css'
import { hideSplash } from './lib/splash'
import { AppProvider } from './state'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
    {__VERCEL__ && <Analytics />}
  </StrictMode>,
)

// The first paint of the app is enough to dismiss the loading screen.
requestAnimationFrame(() => hideSplash())
