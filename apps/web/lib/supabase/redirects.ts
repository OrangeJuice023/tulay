/**
 * Post-auth continuation URLs. Only same-origin app paths are allowed, so a
 * crafted `next` parameter can never bounce a fresh session to another site.
 */

const DEFAULT_NEXT = '/home'

/**
 * Returns the safe in-app path for a `next` parameter, or `/home` when the
 * value is missing, absolute, protocol-relative, or otherwise suspicious.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_NEXT
  if (!value.startsWith('/')) return DEFAULT_NEXT
  if (value.startsWith('//')) return DEFAULT_NEXT
  if (value.includes('\\')) return DEFAULT_NEXT
  if (/[\s<>]/.test(value)) return DEFAULT_NEXT
  try {
    const parsed = new URL(value, 'https://tulay.internal')
    if (parsed.origin !== 'https://tulay.internal') return DEFAULT_NEXT
    return parsed.pathname + parsed.search + parsed.hash || DEFAULT_NEXT
  } catch {
    return DEFAULT_NEXT
  }
}
