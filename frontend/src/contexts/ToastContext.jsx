import { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/Toast'

const ToastContext = createContext()

/**
 * ToastProvider - Provides global toast notification functionality
 *
 * Usage:
 *   const { showToast } = useToast()
 *   showToast('Operation successful', 'success')
 *   showToast('Something went wrong', 'error')
 *   showToast('Please wait...', 'warning', 10000)
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    setToast({ message, type, duration })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  )
}

/**
 * Hook to access toast functionality
 * @returns {{ showToast: (message: string, type?: string, duration?: number) => void, hideToast: () => void }}
 */
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
