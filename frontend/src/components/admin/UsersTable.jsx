import { useState, useEffect } from 'react'
import { Search, Mail, MailCheck, Shield, ShieldOff, CheckCircle, XCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import axios from 'axios'

import { API_BASE_URL } from '../../utils/apiUrl'

function UsersTable({ onRefresh }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [selectedUser, setSelectedUser] = useState(null)
  const limit = 20

  useEffect(() => {
    fetchUsers()
  }, [search, verifiedFilter, currentPage])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = {
        skip: currentPage * limit,
        limit,
        ...(search && { search }),
        ...(verifiedFilter !== 'all' && { verified_only: verifiedFilter === 'verified' })
      }

      const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      })

      setUsers(response.data.data)
      setTotalUsers(response.data.meta.total)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyUser = async (userId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_BASE_URL}/api/admin/users/${userId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchUsers()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to verify user:', err)
      alert('Failed to verify user')
    }
  }

  const handleToggleAdmin = async (userId) => {
    if (!confirm('Are you sure you want to toggle admin status for this user?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${API_BASE_URL}/api/admin/users/${userId}/admin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchUsers()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to toggle admin status:', err)
      alert(err.response?.data?.detail || 'Failed to toggle admin status')
    }
  }

  const totalPages = Math.ceil(totalUsers / limit)

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or sales ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(0)
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-white placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
              style={{
                backgroundColor: 'rgba(0, 15, 33, 0.5)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            />
          </div>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value)
              setCurrentPage(0)
            }}
            className="px-4 py-2 rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.5)',
              border: '1px solid rgba(0, 200, 255, 0.3)'
            }}
          >
            <option value="all">All Users</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-400/30">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">User</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Sales ID</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Orders</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userid} className="border-b border-cyan-400/10 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-white font-medium">{user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white">{user.salesid}</td>
                    <td className="py-3 px-4">
                      {user.email_verified ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <XCircle className="w-4 h-4" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">
                        {user.total_orders} total
                        {user.pending_orders > 0 && (
                          <span className="text-sm text-gray-400 ml-1">
                            ({user.pending_orders} pending)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {user.is_admin ? (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Shield className="w-4 h-4" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-gray-400">User</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {!user.email_verified && (
                          <button
                            onClick={() => handleVerifyUser(user.userid)}
                            className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-all"
                            title="Verify Email"
                          >
                            <MailCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleAdmin(user.userid)}
                          className={`p-2 rounded-lg transition-all ${
                            user.is_admin
                              ? 'text-red-400 hover:bg-red-400/10'
                              : 'text-cyan-400 hover:bg-cyan-400/10'
                          }`}
                          title={user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                        >
                          {user.is_admin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <div
                key={user.userid}
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'rgba(0, 15, 33, 0.5)',
                  border: '1px solid rgba(0, 200, 255, 0.3)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-medium">{user.name}</div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                    <div className="text-sm text-gray-400 mt-1">Sales ID: {user.salesid}</div>
                  </div>
                  <div className="flex gap-2">
                    {!user.email_verified && (
                      <button
                        onClick={() => handleVerifyUser(user.userid)}
                        className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-all"
                      >
                        <MailCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleAdmin(user.userid)}
                      className={`p-2 rounded-lg transition-all ${
                        user.is_admin
                          ? 'text-red-400 hover:bg-red-400/10'
                          : 'text-cyan-400 hover:bg-cyan-400/10'
                      }`}
                    >
                      {user.is_admin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    {user.email_verified ? (
                      <span className="text-green-400">Verified</span>
                    ) : (
                      <span className="text-yellow-400">Unverified</span>
                    )}
                  </div>
                  <div className="text-white">
                    {user.total_orders} orders
                  </div>
                  {user.is_admin && (
                    <span className="text-cyan-400">Admin</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {currentPage * limit + 1}-{Math.min((currentPage + 1) * limit, totalUsers)} of {totalUsers}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
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

export default UsersTable
