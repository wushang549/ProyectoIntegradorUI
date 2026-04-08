const configuredApiBaseOrigin = import.meta.env.VITE_API_BASE_URL?.toString().trim() ?? ''
const browserOrigin = typeof window === 'undefined' ? '' : window.location.origin
const browserHostname = typeof window === 'undefined' ? '' : window.location.hostname
const isLocalHost = browserHostname === 'localhost' || browserHostname === '127.0.0.1'

export const apiConfigError =
  configuredApiBaseOrigin || isLocalHost
    ? null
    : 'Missing VITE_API_BASE_URL in production. Configure it in Cloudflare Pages before publishing.'

export const apiBaseOrigin = (configuredApiBaseOrigin || browserOrigin).replace(/\/+$/, '')

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!apiBaseOrigin) {
    return normalizedPath
  }
  return `${apiBaseOrigin}${normalizedPath}`
}
