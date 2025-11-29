import { useState, useEffect } from 'react'

/**
 * Hook to detect online/offline status
 * Uses navigator.onLine and listens for online/offline events
 *
 * @returns {boolean} - true if online, false if offline
 *
 * Usage:
 *   const isOnline = useOnlineStatus()
 *   if (!isOnline) {
 *     // Show offline indicator
 *   }
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

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

  return isOnline
}

export default useOnlineStatus
