import axios from 'axios'
import { API_BASE_URL } from '../utils/apiUrl'
import { isTokenExpired, clearAuthData, redirectToLogin } from '../utils/authUtils'

/**
 * Create a cancellable request configuration
 * Returns an object with signal and cancel function for use with fetch/axios
 * @returns {{ signal: AbortSignal, cancel: () => void }}
 */
export const createCancellableRequest = () => {
  const controller = new AbortController()
  return {
    signal: controller.signal,
    cancel: () => controller.abort()
  }
}

/**
 * Check if an error is from a cancelled/aborted request
 * Works with both fetch AbortError and axios CanceledError
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
export const isRequestCancelled = (error) => {
  return axios.isCancel(error) ||
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED'
}

/**
 * Error type constants for consistent error handling
 */
export const ERROR_TYPES = {
  NETWORK: 'network_error',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limited',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  VALIDATION: 'validation_error',
  SERVER: 'server_error',
  TOKEN_EXPIRED: 'token_expired',
  UNKNOWN: 'unknown_error'
}

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
    this.retryAfter = null // For rate limiting
  }
}

/**
 * Retry configuration for exponential backoff
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  // Only retry on these status codes (5xx server errors)
  retryableStatuses: [500, 502, 503, 504],
  // Also retry on network errors
  retryOnNetworkError: true,
}

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateBackoffDelay = (retryCount) => {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, retryCount)
  // Add jitter (±25% randomization) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelay)
}

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Determine if a request should be retried
 */
const shouldRetry = (error) => {
  // Don't retry if max retries exceeded
  const retryCount = error.config?.__retryCount || 0
  if (retryCount >= RETRY_CONFIG.maxRetries) return false
  
  // Retry on network errors (no response)
  if (!error.response && RETRY_CONFIG.retryOnNetworkError) {
    // But not on timeout - that's handled differently
    if (error.code === 'ECONNABORTED') return false
    return true
  }
  
  // Retry on specific status codes
  if (error.response && RETRY_CONFIG.retryableStatuses.includes(error.response.status)) {
    return true
  }
  
  return false
}

// isTokenExpired is imported from ../utils/authUtils for consistency with AuthContext

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
      clearAuthData()
      redirectToLogin('expired')
      return Promise.reject(new ApiError('Session expired. Please log in again.', 401, ERROR_TYPES.TOKEN_EXPIRED))
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

// Response interceptor - Handle errors globally with user-friendly messages and retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if we should retry this request
    if (shouldRetry(error)) {
      const config = error.config
      config.__retryCount = (config.__retryCount || 0) + 1
      
      // Calculate backoff delay
      const delay = calculateBackoffDelay(config.__retryCount - 1)
      
      // Log retry attempt (useful for debugging)
      console.warn(
        `Request to ${config.url} failed. Retrying in ${Math.round(delay)}ms... ` +
        `(Attempt ${config.__retryCount}/${RETRY_CONFIG.maxRetries})`
      )
      
      // Wait before retrying
      await sleep(delay)
      
      // Retry the request
      return apiClient(config)
    }
    
    // Handle network errors (no response)
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return Promise.reject(new ApiError(
          'Request timed out. Please check your connection and try again.',
          408,
          ERROR_TYPES.TIMEOUT
        ))
      }
      return Promise.reject(new ApiError(
        'Unable to connect to server. Please check your internet connection.',
        0,
        ERROR_TYPES.NETWORK
      ))
    }

    const { status, data } = error.response

    // Handle specific status codes
    switch (status) {
      case 401:
        // Unauthorized - clear auth and redirect
        clearAuthData()
        redirectToLogin('expired')
        return Promise.reject(new ApiError('Session expired. Please log in again.', 401, ERROR_TYPES.UNAUTHORIZED))

      case 403:
        return Promise.reject(new ApiError(
          data?.detail || data?.error || 'You do not have permission to perform this action.',
          403,
          ERROR_TYPES.FORBIDDEN
        ))

      case 404:
        return Promise.reject(new ApiError(
          data?.detail || data?.error || 'The requested resource was not found.',
          404,
          ERROR_TYPES.NOT_FOUND
        ))

      case 422:
        // Validation error
        const validationMsg = data?.detail?.[0]?.msg || data?.error || 'Invalid data provided.'
        return Promise.reject(new ApiError(validationMsg, 422, ERROR_TYPES.VALIDATION, data?.detail))
      
      case 429:
        const retryAfter = error.response.headers?.['retry-after']
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : null
        const rateLimitMessage = retrySeconds
          ? `Too many requests. Please wait ${retrySeconds} seconds.`
          : 'Too many requests. Please wait a moment and try again.'
        const rateLimitError = new ApiError(rateLimitMessage, 429, ERROR_TYPES.RATE_LIMIT)
        rateLimitError.retryAfter = retrySeconds
        return Promise.reject(rateLimitError)
      
      case 500:
      case 502:
      case 503:
      case 504:
        return Promise.reject(new ApiError(
          'Server error. Please try again later.',
          status,
          ERROR_TYPES.SERVER
        ))

      default:
        return Promise.reject(new ApiError(
          data?.detail || data?.error || data?.message || 'An unexpected error occurred.',
          status,
          ERROR_TYPES.UNKNOWN,
          data
        ))
    }
  }
)

export default apiClient
