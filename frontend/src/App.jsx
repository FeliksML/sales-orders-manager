import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import GoogleMapsLoader from './components/GoogleMapsLoader'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/ui/LoadingSpinner'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import SyncStatus from './components/SyncStatus'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy load route components for code splitting
const Signup = lazy(() => import('./pages/Signup'))
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Admin = lazy(() => import('./pages/Admin'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'))

function App() {
  return (
    <ErrorBoundary>
      <GoogleMapsLoader>
        <AuthProvider>
          <Router>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notification-settings"
                  element={
                    <ProtectedRoute>
                      <NotificationSettings />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
            <PWAInstallPrompt />
            <SyncStatus />
          </Router>
        </AuthProvider>
      </GoogleMapsLoader>
    </ErrorBoundary>
  )
}

export default App
