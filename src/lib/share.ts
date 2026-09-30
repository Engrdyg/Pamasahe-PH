/** Share via the Web Share API when available, else copy to clipboard. */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text })
      return 'shared'
    }
  } catch {
    /* user cancelled or share failed; fall through to clipboard */
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
