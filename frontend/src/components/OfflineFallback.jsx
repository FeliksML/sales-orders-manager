import { WifiOff, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

function OfflineFallback() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
          radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
          linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
        `
      }}
    >
      <div className="max-w-md w-full text-center">
        <div
          className="p-8 rounded-2xl backdrop-blur-md border"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="flex justify-center mb-6">
            <div
              className="p-4 rounded-full"
              style={{
                background: isOnline
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                border: isOnline
                  ? '2px solid rgba(34, 197, 94, 0.4)'
                  : '2px solid rgba(239, 68, 68, 0.4)'
              }}
            >
              <WifiOff
                size={48}
                className={isOnline ? 'text-green-400' : 'text-red-400'}
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">
            {isOnline ? 'Back Online!' : 'You\'re Offline'}
          </h1>

          <p className="text-white/80 mb-6">
            {isOnline
              ? 'Your connection has been restored. Click below to reload the page.'
              : 'It looks like you\'ve lost your internet connection. Some features may not be available.'
            }
          </p>

          {isOnline ? (
            <button
              onClick={handleReload}
              className="w-full px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9))',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)'
              }}
            >
              <RefreshCw size={20} className="text-white" />
              <span className="text-white">Reload Page</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div
                className="p-4 rounded-lg text-left"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <h3 className="text-white font-semibold mb-2">While You're Offline:</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• View previously loaded orders</li>
                  <li>• Access cached dashboard data</li>
                  <li>• Changes will sync when you're back online</li>
                </ul>
              </div>

              <button
                onClick={() => window.history.back()}
                className="w-full px-6 py-3 rounded-lg font-medium transition-all text-white"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                Go Back
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}
              style={{
                animation: isOnline ? 'none' : 'pulse 2s ease-in-out infinite'
              }}
            />
            <span className="text-white/60 text-sm">
              {isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OfflineFallback
