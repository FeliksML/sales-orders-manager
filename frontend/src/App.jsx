import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { DashboardDataProvider } from './contexts/DashboardDataContext'
import GoogleMapsLoader from './components/GoogleMapsLoader'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/ui/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'

// Kill old service workers and clear caches
const killOldServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Register the kill-switch service worker to replace any old ones
      const registration = await navigator.serviceWorker.register('/sw.js', { 
        updateViaCache: 'none' 
      })
      
      // Force update check
      registration.update()
      
      console.log('🧹 Service worker cleanup initiated')
    } catch (error) {
      console.log('Service worker registration skipped:', error.message)
    }
  }
}

// Version check - auto-refresh when new version is deployed
const checkForUpdates = async () => {
  try {
    // Fetch version.json with cache-busting query string
    const response = await fetch(`/version.json?t=${Date.now()}`)
    if (!response.ok) return
    
    const data = await response.json()
    const serverVersion = data.version
    const storedVersion = localStorage.getItem('app_version')
    
    if (storedVersion && storedVersion !== serverVersion) {
      console.log('🔄 New version detected, refreshing...')
      localStorage.setItem('app_version', serverVersion)
      // Force hard refresh to bypass all caches
      window.location.reload(true)
    } else if (!storedVersion) {
      // First visit, just store the version
      localStorage.setItem('app_version', serverVersion)
    }
  } catch (error) {
    // Silently fail - version check is not critical
    console.log('Version check skipped:', error.message)
  }
}

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
const Import = lazy(() => import('./pages/Import'))
const CommissionSettings = lazy(() => import('./pages/CommissionSettings'))

// Mobile dashboard tabs
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'))
const OrdersTab = lazy(() => import('./pages/dashboard/OrdersTab'))
const EarningsTab = lazy(() => import('./pages/dashboard/EarningsTab'))
const AnalyticsTab = lazy(() => import('./pages/dashboard/AnalyticsTab'))
const NotificationsTab = lazy(() => import('./pages/dashboard/NotificationsTab'))

function App() {
  // Check for updates and clean up old service workers on mount
  useEffect(() => {
    killOldServiceWorkers()
    checkForUpdates()
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
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
                      <DashboardDataProvider>
                        <DashboardLayout />
                      </DashboardDataProvider>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="earnings" replace />} />
                  <Route path="orders" element={<OrdersTab />} />
                  <Route path="earnings" element={<EarningsTab />} />
                  <Route path="analytics" element={<AnalyticsTab />} />
                  <Route path="notifications" element={<NotificationsTab />} />
                </Route>
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
                <Route
                  path="/import"
                  element={
                    <ProtectedRoute>
                      <Import />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/commission-settings"
                  element={
                    <ProtectedRoute>
                      <CommissionSettings />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
            </Router>
          </AuthProvider>
        </GoogleMapsLoader>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
