import { useState, useEffect } from 'react'
import {
  Clock, User, Edit2, Trash2, Plus, RotateCcw, AlertCircle, CheckCircle, Eye, X
} from 'lucide-react'
import { auditService } from '../services/auditService'

function AuditLog({ orderId }) {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)
  const [revertingTo, setRevertingTo] = useState(null)
  const [showSnapshot, setShowSnapshot] = useState(false)
  const [snapshotData, setSnapshotData] = useState(null)

  useEffect(() => {
    if (orderId) {
      loadAuditHistory()
    }
  }, [orderId])

  const loadAuditHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await auditService.getOrderHistory(orderId)
      setAuditLogs(data.audit_logs || [])
    } catch (err) {
      console.error('Failed to load audit history:', err)
      setError('Failed to load audit history')
    } finally {
      setLoading(false)
    }
  }

  const handleRevertClick = (log) => {
    setRevertingTo(log)
    setShowRevertConfirm(true)
  }

  const handleRevertConfirm = async () => {
    if (!revertingTo) return

    try {
      await auditService.revertOrder(
        orderId,
        revertingTo.timestamp,
        'Reverted from audit log'
      )

      // Reload audit history
      await loadAuditHistory()

      setShowRevertConfirm(false)
      setRevertingTo(null)

      // Notify parent to refresh order data
      window.location.reload() // Simple refresh - you can improve this with proper state management
    } catch (err) {
      console.error('Failed to revert order:', err)
      alert('Failed to revert order. Please try again.')
    }
  }

  const handleViewSnapshot = async (log) => {
    try {
      const data = await auditService.getOrderSnapshot(orderId, log.timestamp)
      setSnapshotData(data)
      setSelectedLog(log)
      setShowSnapshot(true)
    } catch (err) {
      console.error('Failed to load snapshot:', err)
      alert('Failed to load snapshot')
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-400" />
      case 'update':
        return <Edit2 className="w-4 h-4 text-blue-400" />
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-400" />
      case 'revert':
        return <RotateCcw className="w-4 h-4 text-purple-400" />
      case 'bulk_mark_installed':
      case 'bulk_reschedule':
      case 'bulk_delete':
        return <Edit2 className="w-4 h-4 text-orange-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return 'border-green-500/30 bg-green-500/10'
      case 'update':
        return 'border-blue-500/30 bg-blue-500/10'
      case 'delete':
        return 'border-red-500/30 bg-red-500/10'
      case 'revert':
        return 'border-purple-500/30 bg-purple-500/10'
      case 'bulk_mark_installed':
      case 'bulk_reschedule':
      case 'bulk_delete':
        return 'border-orange-500/30 bg-orange-500/10'
      default:
        return 'border-gray-500/30 bg-gray-500/10'
    }
  }

  const formatFieldName = (fieldName) => {
    if (!fieldName) return ''

    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value === '') return '(empty)'
    return value
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-white/60">Loading audit history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2 text-white/60">
          <Clock className="w-12 h-12 opacity-30" />
          <p>No audit history available for this order</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Audit Trail
        </h3>
        <span className="text-sm text-white/60">
          {auditLogs.length} change{auditLogs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {auditLogs.map((log, index) => (
          <div
            key={log.auditid}
            className={`relative border rounded-lg p-3 sm:p-4 ${getActionColor(log.action)}`}
          >
            {/* Timeline connector - hidden on mobile */}
            {index !== auditLogs.length - 1 && (
              <div className="hidden sm:block absolute left-8 top-12 bottom-[-12px] w-px bg-white/10" />
            )}

            <div className="flex items-start gap-2 sm:gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                {getActionIcon(log.action)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="mb-2">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-medium text-white capitalize">
                          {log.action.replace('_', ' ')}
                        </span>
                        {log.field_name && (
                          <span className="text-xs sm:text-sm text-white/60">
                            • {formatFieldName(log.field_name)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons - hidden on mobile, shown on hover */}
                    {(log.action === 'update' || log.action === 'create') && (
                      <div className="hidden xs:flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleViewSnapshot(log)}
                          className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                          title="View snapshot"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                        </button>
                        <button
                          onClick={() => handleRevertClick(log)}
                          className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                          title="Revert to this version"
                        >
                          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User and timestamp - stacked on mobile */}
                  <div className="flex flex-col xs:flex-row xs:items-center gap-0.5 xs:gap-2 text-xs sm:text-sm text-white/50">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{log.user_name}</span>
                    </div>
                    <span className="hidden xs:inline">•</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 flex-shrink-0 xs:hidden" />
                      <span className="text-xs">{formatTimestamp(log.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Change details - single column on mobile */}
                {log.field_name && log.old_value !== null && log.new_value !== null && (
                  <div className="mt-2 p-2 sm:p-2.5 rounded bg-black/20 border border-white/5">
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="flex items-start gap-1.5">
                        <span className="text-white/40 font-medium flex-shrink-0">From:</span>
                        <span className="text-red-300 break-words">{formatValue(log.old_value)}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-white/40 font-medium flex-shrink-0">To:</span>
                        <span className="text-green-300 break-words">{formatValue(log.new_value)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason */}
                {log.change_reason && (
                  <div className="mt-2 text-xs sm:text-sm text-white/50 italic">
                    "{log.change_reason}"
                  </div>
                )}

                {/* Mobile action buttons - shown at bottom on mobile */}
                {(log.action === 'update' || log.action === 'create') && (
                  <div className="flex xs:hidden gap-2 mt-3 pt-2 border-t border-white/10">
                    <button
                      onClick={() => handleViewSnapshot(log)}
                      className="flex-1 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1.5 text-xs text-white/70"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleRevertClick(log)}
                      className="flex-1 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1.5 text-xs text-white/70"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revert</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revert Confirmation Modal */}
      {showRevertConfirm && revertingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm Revert</h3>
                <p className="text-sm text-white/60">This action will restore the order to a previous state</p>
              </div>
            </div>

            <div className="p-3 rounded bg-black/30 border border-white/10 mb-4">
              <p className="text-sm text-white/70">
                Revert to state from <span className="font-medium text-white">{formatTimestamp(revertingTo.timestamp)}</span>
              </p>
              <p className="text-xs text-white/50 mt-1">
                by {revertingTo.user_name}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRevertConfirm(false)
                  setRevertingTo(null)
                }}
                className="flex-1 px-4 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevertConfirm}
                className="flex-1 px-4 py-2 rounded bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500 text-yellow-300 transition-colors"
              >
                Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {showSnapshot && snapshotData && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                  <span>Order Snapshot</span>
                </h3>
                <p className="text-xs sm:text-sm text-white/60 mt-1 break-words">
                  State at {formatTimestamp(selectedLog.timestamp)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSnapshot(false)
                  setSnapshotData(null)
                  setSelectedLog(null)
                }}
                className="p-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {Object.entries(snapshotData.snapshot || {}).map(([key, value]) => {
                // Skip system fields
                if (['orderid', 'userid', 'created_at', 'updated_at', 'created_by'].includes(key)) {
                  return null
                }

                return (
                  <div key={key} className="p-2.5 sm:p-3 rounded bg-black/20 border border-white/10">
                    <div className="text-xs text-white/40 mb-1 font-medium">{formatFieldName(key)}</div>
                    <div className="text-xs sm:text-sm text-white break-words">{formatValue(value)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLog
