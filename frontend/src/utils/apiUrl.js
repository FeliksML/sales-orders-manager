// Get API base URL - ALWAYS use HTTPS in production to prevent mixed content errors
export const getApiBaseUrl = () => {
  const debugInfo = {
    envUrl: import.meta.env.VITE_API_URL || 'NOT_SET',
    windowProtocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
    windowHostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
  }
  
  // Production (non-localhost) - ALWAYS use HTTPS regardless of env var
  // This prevents mixed content errors when page is loaded over HTTPS
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const prodUrl = `https://${window.location.hostname}`
    console.log('🔍 API URL Debug:', { ...debugInfo, finalUrl: prodUrl, reason: 'PRODUCTION_FORCE_HTTPS' })
    return prodUrl
  }
  
  // Local development - use env var or default
  if (import.meta.env.VITE_API_URL) {
    console.log('🔍 API URL Debug:', { ...debugInfo, finalUrl: import.meta.env.VITE_API_URL, reason: 'LOCAL_ENV_VAR' })
    return import.meta.env.VITE_API_URL
  }
  
  console.log('🔍 API URL Debug:', { ...debugInfo, finalUrl: 'http://localhost:8000', reason: 'LOCAL_DEV_DEFAULT' })
  return 'http://localhost:8000'
}

export const API_BASE_URL = getApiBaseUrl()

