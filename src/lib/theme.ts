/** Light / Dark / System appearance. Applies <html class="dark"> and the
 *  browser theme-color so the address bar matches. */
export type Theme = 'light' | 'dark' | 'system'

const mq = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return mq()?.matches ? 'dark' : 'light'
  return theme
}

export function applyTheme(theme: Theme): 'light' | 'dark' {
  const effective = resolveTheme(theme)
  const root = document.documentElement
  root.classList.toggle('dark', effective === 'dark')
  root.dataset.theme = theme
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = effective === 'dark' ? '#0b1220' : '#0b3d91'
  return effective
}

/** Re-apply when the OS setting changes while in "system" mode. */
export function watchSystemTheme(getTheme: () => Theme): () => void {
  const m = mq()
  if (!m) return () => {}
  const onChange = () => {
    if (getTheme() === 'system') applyTheme('system')
  }
  m.addEventListener('change', onChange)
  return () => m.removeEventListener('change', onChange)
}
