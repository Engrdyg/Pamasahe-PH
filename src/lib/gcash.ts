/** Open the GCash app, or its store page when it is not installed.
 *  GCash has no public deep link that pre-fills a transfer, so the user
 *  still scans the QR or enters the number inside the app. */
const PACKAGE = 'com.globe.gcash.android'
const ANDROID_STORE = `https://play.google.com/store/apps/details?id=${PACKAGE}`
const IOS_STORE = 'https://apps.apple.com/ph/app/gcash/id520020791'

export function openGcash(): void {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) {
    // An intent URL names the exact package, so only GCash can answer it;
    // Chrome opens the fallback URL itself when the app is missing.
    window.location.href =
      `intent://#Intent;package=${PACKAGE};scheme=gcash;` +
      `S.browser_fallback_url=${encodeURIComponent(ANDROID_STORE)};end`
    return
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    // Try the app scheme; if the page is still visible shortly after, go to the App Store.
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.href = IOS_STORE
    }, 1500)
    document.addEventListener('visibilitychange', () => window.clearTimeout(timer), { once: true })
    window.location.href = 'gcash://'
    return
  }
  window.open(ANDROID_STORE, '_blank', 'noopener')
}
