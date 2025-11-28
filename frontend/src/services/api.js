import axios from 'axios'
import { API_BASE_URL } from '../utils/apiUrl'

/**
 * Custom error class for API-related errors
 */
export class ApiError extends Error {
  constructor(message, status, type = 'api_error', data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
    this.data = data
  }
}

/**
 * Check if a JWT token is expired (client-side check)
 */
const isTokenExpired = (token) => {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now() + 60000
  } catch {
    return true
  }
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout
})

// Request interceptor - Add auth token and check expiration
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    
    // Check for expired token before making request
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login?expired=true'
      return Promise.reject(new ApiError('Session expired. Please log in again.', 401, 'token_expired'))
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors globally with user-friendly messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (no response)
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return Promise.reject(new ApiError(
          'Request timed out. Please check your connection and try again.',
          0,
          'timeout'
        ))
      }
      return Promise.reject(new ApiError(
        'Unable to connect to server. Please check your internet connection.',
        0,
        'network_error'
      ))
    }

    const { status, data } = error.response

    // Handle specific status codes
    switch (status) {
      case 401:
        // Unauthorized - clear auth and redirect
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Don't redirect if already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired'
        }
        return Promise.reject(new ApiError('Session expired. Please log in again.', 401, 'unauthorized'))
      
      case 403:
        return Promise.reject(new ApiError(
          data?.detail || data?.error || 'You do not have permission to perform this action.',
          403,
          'forbidden'
        ))
      
      case 404:
        return Promise.reject(new ApiError(
          data?.detail || data?.error || 'The requested resource was not found.',
          404,
          'not_found'
        ))
      
      case 422:
        // Validation error
        const validationMsg = data?.detail?.[0]?.msg || data?.error || 'Invalid data provided.'
        return Promise.reject(new ApiError(validationMsg, 422, 'validation_error', data?.detail))
      
      case 429:
        return Promise.reject(new ApiError(
          'Too many requests. Please wait a moment and try again.',
          429,
          'rate_limited'
        ))
      
      case 500:
      case 502:
      case 503:
        return Promise.reject(new ApiError(
          'Server error. Please try again later.',
          status,
          'server_error'
        ))
      
      default:
        return Promise.reject(new ApiError(
          data?.detail || data?.error || data?.message || 'An unexpected error occurred.',
          status,
          'unknown_error',
          data
        ))
    }
  }
)

export default apiClient
