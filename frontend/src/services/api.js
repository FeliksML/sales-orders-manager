import axios from 'axios'

// Use environment variable, or auto-detect in production
const getApiBaseUrl = () => {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // In production (non-localhost), use same protocol with port 8000
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}:8000`
  }
  // Local development
  return 'http://localhost:8000'
}

const API_BASE_URL = getApiBaseUrl()
console.log('🌐 API Base URL:', API_BASE_URL)

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    console.log('🔑 Token from localStorage:', token ? 'Token exists' : 'No token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('✅ Authorization header set')
    } else {
      console.log('❌ No token found in localStorage')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('🚨 API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    })
    
    if (error.response?.status === 401) {
      console.error('🔒 401 Unauthorized - logging out user')
      console.error('🔒 Request that caused 401:', error.config?.url)
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
