import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import offlineService from '../services/offlineService'

function SyncStatus() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    syncInProgress: false,
    queuedItems: 0,
    lastSync: null,
    showDetails: false
  })

  const [message, setMessage] = useState(null)

  useEffect(() => {
    // Load initial status
    loadSyncStatus()

    // Subscribe to sync events
    const unsubscribe = offlineService.onSyncEvent((event) => {
      console.log('Sync event:', event)

      switch (event.type) {
        case 'online':
          setStatus(prev => ({ ...prev, isOnline: true }))
          showMessage('Back online - Syncing...', 'success')
          break

        case 'offline':
          setStatus(prev => ({ ...prev, isOnline: false }))
          showMessage('You are offline', 'warning')
          break

        case 'sync_started':
          setStatus(prev => ({ ...prev, syncInProgress: true }))
          break

        case 'sync_completed':
          setStatus(prev => ({ ...prev, syncInProgress: false }))
          loadSyncStatus()
          if (event.success > 0) {
            showMessage(`Synced ${event.success} change${event.success > 1 ? 's' : ''}`, 'success')
          }
          break

        case 'sync_failed':
          setStatus(prev => ({ ...prev, syncInProgress: false }))
          showMessage('Sync failed - will retry later', 'error')
          break

        case 'queued':
          loadSyncStatus()
          showMessage('Changes saved locally', 'info')
          break

        default:
          break
      }
    })

    // Refresh status periodically
    const interval = setInterval(loadSyncStatus, 30000) // Every 30 seconds

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const loadSyncStatus = async () => {
    try {
      const syncStatus = await offlineService.getSyncQueueStatus()
      setStatus(prev => ({
        ...prev,
        isOnline: syncStatus.isOnline,
        syncInProgress: syncStatus.syncInProgress,
        queuedItems: syncStatus.queuedItems,
        lastSync: syncStatus.lastSync
      }))
    } catch (error) {
      console.error('Error loading sync status:', error)
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleManualSync = async () => {
    if (!status.isOnline || status.syncInProgress) return

    try {
      await offlineService.syncWithServer()
    } catch (error) {
      console.error('Manual sync failed:', error)
      showMessage('Sync failed', 'error')
    }
  }

  const formatLastSync = (lastSync) => {
    if (!lastSync) return 'Never'

    const now = new Date()
    const syncTime = new Date(lastSync)
    const diffMs = now - syncTime
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  // Don't show anything if online and no queued items
  if (status.isOnline && status.queuedItems === 0 && !status.syncInProgress && !message) {
    return null
  }

  return (
    <>
      {/* Status Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 px-4 py-2 backdrop-blur-md border-b transition-all ${
          !status.isOnline
            ? 'bg-red-500/90 border-red-600 text-white'
            : status.queuedItems > 0
            ? 'bg-yellow-500/90 border-yellow-600 text-white'
            : status.syncInProgress
            ? 'bg-blue-500/90 border-blue-600 text-white'
            : 'bg-green-500/90 border-green-600 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!status.isOnline ? (
              <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : status.syncInProgress ? (
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : status.queuedItems > 0 ? (
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            )}

            <div className="flex flex-col xs:flex-row xs:items-center xs:gap-2">
              <span className="text-xs sm:text-sm font-semibold">
                {!status.isOnline
                  ? 'Offline Mode'
                  : status.syncInProgress
                  ? 'Syncing...'
                  : status.queuedItems > 0
                  ? `${status.queuedItems} change${status.queuedItems > 1 ? 's' : ''} pending`
                  : 'All synced'}
              </span>

              {status.lastSync && (
                <span className="text-xs opacity-80 hidden sm:inline">
                  • Last sync: {formatLastSync(status.lastSync)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status.isOnline && !status.syncInProgress && status.queuedItems > 0 && (
              <button
                onClick={handleManualSync}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-white/20 hover:bg-white/30 rounded transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Sync Now</span>
              </button>
            )}

            <button
              onClick={() => setStatus(prev => ({ ...prev, showDetails: !prev.showDetails }))}
              className="text-xs sm:text-sm font-medium underline hover:no-underline"
            >
              {status.showDetails ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>

        {/* Details Panel */}
        {status.showDetails && (
          <div className="mt-3 pt-3 border-t border-white/20 text-xs sm:text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="opacity-70">Connection</div>
                <div className="font-semibold flex items-center gap-1">
                  {status.isOnline ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="opacity-70">Queued</div>
                <div className="font-semibold">{status.queuedItems} items</div>
              </div>

              <div>
                <div className="opacity-70">Status</div>
                <div className="font-semibold">
                  {status.syncInProgress ? 'Syncing...' : 'Ready'}
                </div>
              </div>

              <div>
                <div className="opacity-70">Last Sync</div>
                <div className="font-semibold">{formatLastSync(status.lastSync)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Message */}
      {message && (
        <div className="fixed top-16 right-4 z-50 animate-slideUp">
          <div
            className={`px-4 py-3 rounded-lg backdrop-blur-md border shadow-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-500/90 border-green-600 text-white'
                : message.type === 'error'
                ? 'bg-red-500/90 border-red-600 text-white'
                : message.type === 'warning'
                ? 'bg-yellow-500/90 border-yellow-600 text-white'
                : 'bg-blue-500/90 border-blue-600 text-white'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default SyncStatus
