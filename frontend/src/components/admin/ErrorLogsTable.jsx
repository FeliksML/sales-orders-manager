import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Eye, X, Layers } from 'lucide-react'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import CustomCheckbox from '../ui/CustomCheckbox'
import axios from 'axios'

import { API_BASE_URL } from '../../utils/apiUrl'

function ErrorLogsTable({ onRefresh }) {
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolvedFilter, setResolvedFilter] = useState('unresolved')
  const [errorTypeFilter, setErrorTypeFilter] = useState('all')
  const [groupErrors, setGroupErrors] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalErrors, setTotalErrors] = useState(0)
  const [selectedError, setSelectedError] = useState(null)
  const [selectedErrorIds, setSelectedErrorIds] = useState([])
  const limit = 100 // Backend max limit for grouping

  useEffect(() => {
    fetchErrors()
  }, [resolvedFilter, errorTypeFilter, currentPage])

  const fetchErrors = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = {
        skip: currentPage * limit,
        limit: 100, // Backend max limit
        ...(resolvedFilter !== 'all' && { resolved: resolvedFilter === 'resolved' }),
        ...(errorTypeFilter !== 'all' && { error_type: errorTypeFilter })
      }

      const response = await axios.get(`${API_BASE_URL}/api/admin/error-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      })

      setErrors(response.data.data)
      setTotalErrors(response.data.meta.total)
      setSelectedErrorIds([]) // Clear selection on refresh
    } catch (err) {
      console.error('Failed to fetch error logs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Normalize error message by removing dynamic parts
  const normalizeErrorMessage = (message) => {
    if (!message) return ''

    return message
      // Remove memory addresses like "0x10f17d510"
      .replace(/0x[0-9a-fA-F]+/g, '0xXXXX')
      // Remove file paths with line numbers like "file.py:123"
      .replace(/\.py:\d+/g, '.py:XXX')
      // Remove timestamps
      .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
      // Remove UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')
      // Remove numbers that might be IDs
      .replace(/\bid=\d+/gi, 'id=XXX')
      .replace(/\b\d{5,}\b/g, 'XXXXX')
      .trim()
  }

  // Group errors by normalized message
  const groupedErrors = useMemo(() => {
    if (!groupErrors) {
      return errors.map(error => ({
        ...error,
        count: 1,
        errorIds: [error.errorid],
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp
      }))
    }

    const groups = {}

    errors.forEach(error => {
      // Normalize the error message to group similar errors
      const normalizedMessage = normalizeErrorMessage(error.error_message)
      const key = `${error.error_type}|||${normalizedMessage}`

      if (!groups[key]) {
        groups[key] = {
          ...error,
          normalizedMessage,
          count: 1,
          errorIds: [error.errorid],
          firstOccurrence: error.timestamp,
          lastOccurrence: error.timestamp
        }
      } else {
        groups[key].count++
        groups[key].errorIds.push(error.errorid)

        // Track first and last occurrence
        if (new Date(error.timestamp) < new Date(groups[key].firstOccurrence)) {
          groups[key].firstOccurrence = error.timestamp
        }
        if (new Date(error.timestamp) > new Date(groups[key].lastOccurrence)) {
          groups[key].lastOccurrence = error.timestamp
        }
      }
    })

    return Object.values(groups).sort((a, b) =>
      new Date(b.lastOccurrence) - new Date(a.lastOccurrence)
    )
  }, [errors, groupErrors])

  const handleResolveError = async (errorIds, notes = null) => {
    const resolveNotes = notes || prompt('Resolution notes (optional):')
    if (resolveNotes === null) return // User cancelled

    try {
      const token = localStorage.getItem('token')

      // Resolve all error IDs
      await Promise.all(
        errorIds.map(errorId =>
          axios.patch(
            `${API_BASE_URL}/api/admin/error-logs/${errorId}/resolve`,
            { resolution_notes: resolveNotes },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      )

      fetchErrors()
      if (onRefresh) onRefresh()
      setSelectedError(null)
    } catch (err) {
      console.error('Failed to resolve error(s):', err)
      alert('Failed to resolve error(s)')
    }
  }

  const handleBulkResolve = async () => {
    if (selectedErrorIds.length === 0) return

    const notes = prompt(`Resolve ${selectedErrorIds.length} error(s)?\n\nResolution notes (optional):`)
    if (notes === null) return

    await handleResolveError(selectedErrorIds, notes)
    setSelectedErrorIds([])
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = groupedErrors.flatMap(group => group.errorIds)
      setSelectedErrorIds(allIds)
    } else {
      setSelectedErrorIds([])
    }
  }

  const handleSelectGroup = (errorIds, checked) => {
    if (checked) {
      setSelectedErrorIds(prev => [...new Set([...prev, ...errorIds])])
    } else {
      setSelectedErrorIds(prev => prev.filter(id => !errorIds.includes(id)))
    }
  }

  const isGroupSelected = (errorIds) => {
    return errorIds.every(id => selectedErrorIds.includes(id))
  }

  const allSelected = groupedErrors.length > 0 &&
    groupedErrors.every(group => isGroupSelected(group.errorIds))

  return (
    <>
      <Card>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Error Logs</h2>

            {/* Group Toggle */}
            <button
              onClick={() => setGroupErrors(!groupErrors)}
              className="flex items-center gap-2 cursor-pointer text-white px-3 py-2 rounded-lg transition-all hover:bg-white/10"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                groupErrors
                  ? 'bg-cyan-400 border-cyan-400'
                  : 'border-gray-400'
              }`}>
                {groupErrors && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <Layers className="w-4 h-4" />
              <span className="text-sm">Group similar errors</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={resolvedFilter}
              onChange={(e) => {
                setResolvedFilter(e.target.value)
                setCurrentPage(0)
              }}
              className="px-4 py-2 rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
              style={{
                backgroundColor: 'rgba(0, 15, 33, 0.5)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <option value="all">All Errors</option>
              <option value="unresolved">Unresolved Only</option>
              <option value="resolved">Resolved Only</option>
            </select>

            <select
              value={errorTypeFilter}
              onChange={(e) => {
                setErrorTypeFilter(e.target.value)
                setCurrentPage(0)
              }}
              className="px-4 py-2 rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
              style={{
                backgroundColor: 'rgba(0, 15, 33, 0.5)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <option value="all">All Types</option>
              <option value="api_error">API Errors</option>
              <option value="frontend_error">Frontend Errors</option>
              <option value="validation_error">Validation Errors</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedErrorIds.length > 0 && (
            <div className="mt-4 flex items-center justify-between p-3 rounded-lg"
              style={{
                backgroundColor: 'rgba(0, 200, 255, 0.1)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <span className="text-white font-medium">
                {selectedErrorIds.length} error(s) selected
              </span>
              <button
                onClick={handleBulkResolve}
                className="px-4 py-2 rounded-lg font-medium text-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.7), rgba(5, 150, 105, 0.7))',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Resolve Selected
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Error List */}
            <div className="space-y-4">
              {/* Select All */}
              {groupedErrors.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2">
                  <CustomCheckbox
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <span className="text-sm text-gray-400">Select All</span>
                </div>
              )}

              {groupedErrors.map((error, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg transition-all"
                  style={{
                    backgroundColor: error.is_resolved
                      ? 'rgba(0, 15, 33, 0.5)'
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${error.is_resolved ? 'rgba(0, 200, 255, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <CustomCheckbox
                        checked={isGroupSelected(error.errorIds)}
                        onChange={(e) => handleSelectGroup(error.errorIds, e.target.checked)}
                      />
                    </div>

                    {/* Error Content */}
                    <div className="flex-1 cursor-pointer" onClick={() => setSelectedError(error)}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          error.is_resolved ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {error.error_type}
                        </span>

                        {error.count > 1 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-orange-500 text-white">
                            {error.count}× occurrences
                          </span>
                        )}

                        <span className="text-sm text-gray-400">
                          {error.count > 1 ? (
                            <>First: {new Date(error.firstOccurrence).toLocaleString()}</>
                          ) : (
                            <>{new Date(error.timestamp).toLocaleString()}</>
                          )}
                        </span>

                        {error.is_resolved && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </span>
                        )}
                      </div>

                      <p className="text-white font-medium mb-1">{error.error_message}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        {error.endpoint && (
                          <span>{error.method} {error.endpoint}</span>
                        )}
                        {error.user_email && (
                          <span>User: {error.user_email}</span>
                        )}
                      </div>

                      {error.count > 1 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Last occurrence: {new Date(error.lastOccurrence).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedError(error)
                        }}
                        className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!error.is_resolved && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResolveError(error.errorIds)
                          }}
                          className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-all"
                          title={`Resolve ${error.count > 1 ? `all ${error.count}` : 'this'} error${error.count > 1 ? 's' : ''}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {groupedErrors.length === 0 && (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">No errors found</p>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Error Details Modal */}
      {selectedError && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedError(null)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.95)',
              border: '1px solid rgba(0, 200, 255, 0.3)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Error Details</h3>
              <button
                onClick={() => setSelectedError(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Type</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    selectedError.is_resolved ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {selectedError.error_type}
                  </span>
                  {selectedError.count > 1 && (
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-orange-500 text-white">
                      {selectedError.count} occurrences
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Timestamp</label>
                {selectedError.count > 1 ? (
                  <div className="text-white space-y-1">
                    <div>First: {new Date(selectedError.firstOccurrence).toLocaleString()}</div>
                    <div>Last: {new Date(selectedError.lastOccurrence).toLocaleString()}</div>
                  </div>
                ) : (
                  <p className="text-white">{new Date(selectedError.timestamp).toLocaleString()}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400">Error Message</label>
                <p className="text-white">{selectedError.error_message}</p>
              </div>

              {selectedError.endpoint && (
                <div>
                  <label className="text-sm text-gray-400">Endpoint</label>
                  <p className="text-white">{selectedError.method} {selectedError.endpoint}</p>
                </div>
              )}

              {selectedError.user_email && (
                <div>
                  <label className="text-sm text-gray-400">User</label>
                  <p className="text-white">{selectedError.user_email}</p>
                </div>
              )}

              {selectedError.stack_trace && (
                <div>
                  <label className="text-sm text-gray-400">Stack Trace</label>
                  <pre className="mt-1 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 200, 255, 0.2)'
                    }}
                  >
                    {selectedError.stack_trace}
                  </pre>
                </div>
              )}

              {selectedError.is_resolved && (
                <>
                  <div>
                    <label className="text-sm text-gray-400">Resolved At</label>
                    <p className="text-white">{new Date(selectedError.resolved_at).toLocaleString()}</p>
                  </div>
                  {selectedError.resolution_notes && (
                    <div>
                      <label className="text-sm text-gray-400">Resolution Notes</label>
                      <p className="text-white">{selectedError.resolution_notes}</p>
                    </div>
                  )}
                </>
              )}

              {!selectedError.is_resolved && (
                <button
                  onClick={() => handleResolveError(selectedError.errorIds)}
                  className="w-full py-3 rounded-lg font-medium text-white transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.7), rgba(5, 150, 105, 0.7))',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {selectedError.count > 1
                    ? `Resolve All ${selectedError.count} Occurrences`
                    : 'Mark as Resolved'
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ErrorLogsTable
