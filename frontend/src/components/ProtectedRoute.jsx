import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-green-700">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.warn('🚫 ProtectedRoute: Not authenticated, redirecting to login')
    console.warn('🚫 Current path:', location.pathname)
    console.warn('🚫 Token in localStorage:', !!localStorage.getItem('token'))
    console.warn('🚫 User in localStorage:', !!localStorage.getItem('user'))
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
