/** Fade out the inline loading screen from index.html once the app has
 *  rendered. Keeps it on screen for a short minimum so it never flickers. */
export function hideSplash(minVisibleMs = 0): void {
  const el = document.getElementById('splash')
  if (!el) return
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const elapsed = performance.now()
  const wait = reduced ? 0 : Math.max(0, minVisibleMs - elapsed)
  window.setTimeout(() => {
    el.classList.add('hide')
    const remove = () => el.remove()
    if (reduced) remove()
    else {
      el.addEventListener('transitionend', remove, { once: true })
      window.setTimeout(remove, 500) // fallback if transitionend never fires
    }
  }, wait)
}
