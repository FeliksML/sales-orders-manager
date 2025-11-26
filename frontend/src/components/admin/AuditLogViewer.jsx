import { useState, useEffect } from 'react'
import { Activity, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import axios from 'axios'

import { API_BASE_URL } from '../../utils/apiUrl'

function AuditLogViewer() {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const limit = 50

  useEffect(() => {
    fetchAuditLogs()
  }, [actionFilter, entityTypeFilter, currentPage])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = {
        skip: currentPage * limit,
        limit,
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(entityTypeFilter !== 'all' && { entity_type: entityTypeFilter })
      }

      const response = await axios.get(`${API_BASE_URL}/api/admin/audit/system`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      })

      setAuditLogs(response.data)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return 'bg-green-500'
      case 'update':
        return 'bg-blue-500'
      case 'delete':
      case 'bulk_delete':
        return 'bg-red-500'
      case 'bulk_update':
      case 'bulk_reschedule':
        return 'bg-purple-500'
      case 'revert':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value.length > 100) return value.substring(0, 100) + '...'
    return value
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">System Audit Trail</h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setCurrentPage(0)
            }}
            className="px-4 py-2 rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.5)',
              border: '1px solid rgba(0, 200, 255, 0.3)'
            }}
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="bulk_update">Bulk Update</option>
            <option value="bulk_delete">Bulk Delete</option>
            <option value="revert">Revert</option>
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value)
              setCurrentPage(0)
            }}
            className="px-4 py-2 rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.5)',
              border: '1px solid rgba(0, 200, 255, 0.3)'
            }}
          >
            <option value="all">All Entities</option>
            <option value="order">Orders</option>
            <option value="user">Users</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Audit Log Timeline */}
          <div className="space-y-3">
            {auditLogs.map((log, index) => (
              <div
                key={log.auditid}
                className="relative pl-8 pb-4"
              >
                {/* Timeline line */}
                {index !== auditLogs.length - 1 && (
                  <div
                    className="absolute left-2 top-8 bottom-0 w-0.5"
                    style={{ backgroundColor: 'rgba(0, 200, 255, 0.3)' }}
                  />
                )}

                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-1 w-4 h-4 rounded-full border-2"
                  style={{
                    borderColor: 'rgba(0, 200, 255, 0.5)',
                    backgroundColor: 'rgba(0, 15, 33, 0.5)'
                  }}
                />

                {/* Audit entry */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.5)',
                    border: '1px solid rgba(0, 200, 255, 0.3)'
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded text-white ${getActionColor(log.action)}`}>
                        {log.action.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-sm text-cyan-400">{log.entity_type}</span>
                  </div>

                  <div className="mb-2">
                    <span className="text-white font-medium">{log.user_name}</span>
                    <span className="text-gray-400 text-sm ml-2">
                      {log.action === 'create' && `created ${log.entity_type} #${log.entity_id}`}
                      {log.action === 'update' && `updated ${log.entity_type} #${log.entity_id}`}
                      {log.action === 'delete' && `deleted ${log.entity_type} #${log.entity_id}`}
                      {log.action === 'bulk_update' && `bulk updated ${log.entity_type}s`}
                      {log.action === 'bulk_delete' && `bulk deleted ${log.entity_type}s`}
                      {log.action === 'revert' && `reverted ${log.entity_type} #${log.entity_id}`}
                    </span>
                  </div>

                  {log.field_name && (
                    <div className="mt-2 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-400">Field:</span>
                          <span className="text-white ml-2">{log.field_name}</span>
                        </div>
                        {log.old_value && (
                          <div>
                            <span className="text-gray-400">From:</span>
                            <span className="text-red-400 ml-2">{formatValue(log.old_value)}</span>
                          </div>
                        )}
                        {log.new_value && (
                          <div>
                            <span className="text-gray-400">To:</span>
                            <span className="text-green-400 ml-2">{formatValue(log.new_value)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {log.change_reason && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-400">Reason:</span>
                      <span className="text-white ml-2">{log.change_reason}</span>
                    </div>
                  )}

                  {log.ip_address && (
                    <div className="mt-2 text-xs text-gray-500">
                      IP: {log.ip_address}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No audit logs found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {auditLogs.length === limit && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {currentPage * limit + 1}-{(currentPage + 1) * limit}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white hover:bg-white/10"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.5)',
                    border: '1px solid rgba(0, 200, 255, 0.3)'
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={auditLogs.length < limit}
                  className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white hover:bg-white/10"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.5)',
                    border: '1px solid rgba(0, 200, 255, 0.3)'
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default AuditLogViewer
