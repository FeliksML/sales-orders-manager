import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email, password, recaptchaToken) => {
    const response = await fetch('http://127.0.0.1:8000/auth/login', {
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

    // Store auth data
    const authToken = data.token || 'dummy-token' // Replace with actual token from backend
    const userData = {
      email: data.email || email,
      name: data.name || '',
      salesid: data.salesid || ''
    }

    localStorage.setItem('authToken', authToken)
    localStorage.setItem('user', JSON.stringify(userData))

    setToken(authToken)
    setUser(userData)

    return data
  }

  const signup = async (email, password, name, salesid, recaptchaToken) => {
    const response = await fetch('http://127.0.0.1:8000/auth/signup', {
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
    localStorage.removeItem('authToken')
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
