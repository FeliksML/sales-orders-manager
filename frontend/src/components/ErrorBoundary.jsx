import React from 'react'
import axios from 'axios'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our backend
    this.logErrorToBackend(error, errorInfo)

    // Store error details in state
    this.setState({
      error,
      errorInfo
    })

    console.error('Error caught by boundary:', error, errorInfo)
  }

  async logErrorToBackend(error, errorInfo) {
    try {
      const token = localStorage.getItem('token')
      if (!token) return // Don't log if user is not authenticated

      await axios.post(
        `${API_BASE_URL}/api/admin/error-logs`,
        {
          error_type: 'frontend_error',
          error_message: error.toString(),
          stack_trace: errorInfo.componentStack,
          user_agent: navigator.userAgent,
          component_name: errorInfo.componentStack?.split('\n')[1]?.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      console.log('Error logged to backend successfully')
    } catch (err) {
      console.error('Failed to log error to backend:', err)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #0d4f8b 25%, #067a5b 75%, #059669 100%)',
          }}
        >
          <div
            className="max-w-2xl w-full p-8 rounded-xl"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.25)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 200, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
            }}
          >
            <div className="text-center mb-6">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Oops! Something went wrong</h1>
              <p className="text-gray-300">
                We've encountered an unexpected error. The error has been logged and we'll look into it.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6">
                <details className="cursor-pointer">
                  <summary className="text-sm text-gray-400 hover:text-white mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div
                    className="p-4 rounded-lg text-sm overflow-auto max-h-64"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 200, 255, 0.2)'
                    }}
                  >
                    <p className="text-red-400 font-mono mb-2">{this.state.error.toString()}</p>
                    <pre className="text-gray-300 text-xs overflow-x-auto">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-lg font-medium text-white transition-all hover:scale-105 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(59, 130, 246, 0.7))',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <RefreshCw className="w-5 h-5" />
              Return to Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
