/**
 * API Service for making HTTP requests
 */
import axios from 'axios'
import { API_BASE_URL, API_TIMEOUT } from '../config/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    // Get token from AsyncStorage in future
    // const token = await AsyncStorage.getItem('auth_token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response

      switch (status) {
        case 401:
          // Handle unauthorized - redirect to login
          console.log('Unauthorized - redirect to login')
          break
        case 403:
          console.log('Forbidden')
          break
        case 404:
          console.log('Not found')
          break
        case 500:
          console.log('Server error')
          break
        default:
          console.log('Request failed:', data?.message || error.message)
      }
    } else if (error.request) {
      // Request made but no response
      console.log('Network error - no response')
    } else {
      // Error in request setup
      console.log('Request setup error:', error.message)
    }

    return Promise.reject(error)
  }
)

export default api
