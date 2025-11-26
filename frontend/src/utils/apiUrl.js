// Get API base URL with automatic HTTPS upgrade when page is loaded over HTTPS
export const getApiBaseUrl = () => {
  // If explicitly set, upgrade to HTTPS if page is HTTPS
  if (import.meta.env.VITE_API_URL) {
    const envUrl = import.meta.env.VITE_API_URL
    // If page is HTTPS but env URL is HTTP, upgrade it
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && envUrl.startsWith('http://')) {
      return envUrl.replace('http://', 'https://')
    }
    return envUrl
  }
  // In production (non-localhost), use same protocol (no port, assume reverse proxy)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}`
  }
  // Local development
  return 'http://localhost:8000'
}

export const API_BASE_URL = getApiBaseUrl()

