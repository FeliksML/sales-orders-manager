// Get API base URL - ALWAYS use HTTPS in production to prevent mixed content errors
export const getApiBaseUrl = () => {
  // Production (non-localhost) - ALWAYS use HTTPS regardless of env var
  // This prevents mixed content errors when page is loaded over HTTPS
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `https://${window.location.hostname}`
  }
  
  // Local development - use env var or default
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  return 'http://localhost:8000'
}

export const API_BASE_URL = getApiBaseUrl()
