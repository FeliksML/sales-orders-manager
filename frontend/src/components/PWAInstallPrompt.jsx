import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Store the event so it can be triggered later
      setDeferredPrompt(e)
      // Show the custom install prompt
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    console.log(`User response to the install prompt: ${outcome}`)

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Store in localStorage to not show again for this session
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Don't show if user dismissed recently (within 7 days)
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      if (dismissedTime > sevenDaysAgo) {
        setShowPrompt(false)
      }
    }
  }, [])

  if (!showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
      <div
        className="p-4 rounded-lg shadow-2xl backdrop-blur-md border"
        style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(59, 130, 246, 0.95))',
          borderColor: 'rgba(96, 165, 250, 0.5)',
          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)'
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download size={24} className="text-white" />
            <h3 className="text-white font-bold text-lg">Install App</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-white/90 mb-4 text-sm">
          Install Sales Order Manager for quick access and offline support. Works like a native app!
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-white/90 hover:text-white font-medium transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
