/** Open the GCash app; fall back to its store page if it is not installed.
 *  GCash has no public deep link that pre-fills a transfer, so the user
 *  still scans the QR or enters the number inside the app. */
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.globe.gcash.android'
const IOS_STORE = 'https://apps.apple.com/ph/app/gcash/id520020791'
const SCHEME = 'gcash://'

export function openGcash(): void {
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua)
  const android = /android/i.test(ua)
  if (!ios && !android) {
    window.open(ANDROID_STORE, '_blank', 'noopener')
    return
  }
  const store = ios ? IOS_STORE : ANDROID_STORE
  const start = Date.now()
  // If the app opens, the page is hidden and the fallback never fires.
  const timer = window.setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - start < 2500) window.location.href = store
  }, 1500)
  document.addEventListener('visibilitychange', () => window.clearTimeout(timer), { once: true })
  window.location.href = SCHEME
}
