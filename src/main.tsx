import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { Analytics } from './components/Analytics'
import './i18n'
import './index.css'
import { hideSplash } from './lib/splash'
import { AppProvider } from './state'

registerSW({ immediate: true, onRegisteredSW: () => void warmShell() })

/**
 * The HTML shell is cached network-first when pages load through the
 * service worker, which only starts with the second visit. Fetch it once the
 * worker controls this page so a first-time visitor can reload offline too.
 */
async function warmShell() {
  const sw = navigator.serviceWorker
  if (!sw) return
  await sw.ready
  if (!sw.controller) await new Promise((r) => sw.addEventListener('controllerchange', r, { once: true }))
  await fetch(import.meta.env.BASE_URL, { credentials: 'same-origin' }).catch(() => {})
}

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
