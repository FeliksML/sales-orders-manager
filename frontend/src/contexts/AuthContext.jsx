import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

import { API_BASE_URL as API_URL } from '../utils/apiUrl'

/**
 * Custom error class for authentication-related errors
 */
class AuthError extends Error {
  constructor(message, type = 'auth_error') {
    super(message)
    this.name = 'AuthError'
    this.type = type
  }
}

/**
 * Safely parse JSON from localStorage, returning null on failure
 */
const safeJSONParse = (value) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Check if a JWT token is expired (client-side check)
 * Note: This is a rough check - the server is the source of truth
 */
const isTokenExpired = (token) => {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Add 60 second buffer to handle clock drift
    return payload.exp * 1000 < Date.now() + 60000
  } catch {
    return true
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  // Initialize from localStorage synchronously to prevent flash
  const [user, setUser] = useState(() => {
    return safeJSONParse(localStorage.getItem('user'))
  })
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token')
    // Clear expired tokens on init
    if (storedToken && isTokenExpired(storedToken)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return null
    }
    return storedToken || null
  })
  const [loading, setLoading] = useState(false)

  // Check token expiration periodically
  useEffect(() => {
    if (!token) return
    
    const checkExpiration = () => {
      if (isTokenExpired(token)) {
        // Token expired - log out user
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      }
    }
    
    // Check every minute
    const interval = setInterval(checkExpiration, 60000)
    return () => clearInterval(interval)
  }, [token])

  const login = useCallback(async (email, password, recaptchaToken) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptcha_token: recaptchaToken })
      })

      // Handle network errors
      if (!response) {
        throw new AuthError('Unable to connect to server. Please check your internet connection.', 'network_error')
      }

      const data = await response.json()

      // Handle specific error responses
      if (response.status === 401) {
        throw new AuthError(data.error || 'Invalid email or password.', 'invalid_credentials')
      }
      
      if (response.status === 403) {
        throw new AuthError(data.error || 'Please verify your email before logging in.', 'email_not_verified')
      }
      
      if (response.status === 400) {
        throw new AuthError(data.error || 'Login failed. Please try again.', 'bad_request')
      }
      
      if (response.status === 429) {
        throw new AuthError('Too many login attempts. Please try again later.', 'rate_limited')
      }

      if (!response.ok || !data.access_token) {
        throw new AuthError(data.error || data.message || 'Login failed. Please try again.', 'auth_error')
      }

      // Store auth data
      const authToken = data.access_token
      const userData = data.user

      localStorage.setItem('token', authToken)
      localStorage.setItem('user', JSON.stringify(userData))

      setToken(authToken)
      setUser(userData)

      return data
    } catch (error) {
      // Re-throw AuthError as-is
      if (error instanceof AuthError) {
        throw error
      }
      // Handle fetch/network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new AuthError('Unable to connect to server. Please check your internet connection.', 'network_error')
      }
      // Generic error
      throw new AuthError(error.message || 'An unexpected error occurred. Please try again.', 'unknown_error')
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (email, password, name, salesid, recaptchaToken) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, salesid, name, recaptcha_token: recaptchaToken })
      })

      // Handle network errors
      if (!response) {
        throw new AuthError('Unable to connect to server. Please check your internet connection.', 'network_error')
      }

      const data = await response.json()

      if (response.status === 400) {
        throw new AuthError(data.error || 'Signup failed. Please check your information and try again.', 'validation_error')
      }
      
      if (response.status === 422) {
        // Validation error from Pydantic
        const errorDetail = data.detail?.[0]?.msg || 'Invalid input. Please check your information.'
        throw new AuthError(errorDetail, 'validation_error')
      }
      
      if (response.status === 429) {
        throw new AuthError('Too many signup attempts. Please try again later.', 'rate_limited')
      }

      if (!response.ok) {
        throw new AuthError(data.error || data.message || 'Signup failed. Please try again.', 'signup_error')
      }

      return data
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new AuthError('Unable to connect to server. Please check your internet connection.', 'network_error')
      }
      throw new AuthError(error.message || 'An unexpected error occurred. Please try again.', 'unknown_error')
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    setToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!token
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
