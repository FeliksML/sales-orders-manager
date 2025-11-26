import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    const storedUser = localStorage.getItem('user')
    console.log('🔐 AuthContext init - user:', storedUser ? 'exists' : 'null')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token')
    console.log('🔐 AuthContext init - token:', storedToken ? 'exists' : 'null')
    return storedToken || null
  })
  const [loading, setLoading] = useState(false) // No loading needed since we init from localStorage

  // This effect is now just for logging/debugging
  useEffect(() => {
    console.log('🔐 AuthContext mounted, isAuthenticated:', !!token)
  }, [])

  const login = async (email, password, recaptchaToken) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, recaptcha_token: recaptchaToken })
    })

    const data = await response.json()

    // Check for email verification error
    if (data.error) {
      throw new Error(data.error)
    }

    if (!response.ok || data.message === 'Incorrect Login or Password') {
      throw new Error(data.message || 'Invalid email or password')
    }

    // Store auth data with new token format
    const authToken = data.access_token
    const userData = data.user

    localStorage.setItem('token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))

    setToken(authToken)
    setUser(userData)

    return data
  }

  const signup = async (email, password, name, salesid, recaptchaToken) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, salesid, name, recaptcha_token: recaptchaToken })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Signup failed. Please try again.')
    }

    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    setToken(null)
    setUser(null)
  }

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
