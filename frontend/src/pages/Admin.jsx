import { useState, useEffect, lazy, Suspense } from 'react'
import { Users, AlertTriangle, Activity, Shield, TrendingUp, UserCheck, UserX, Search, CheckCircle, XCircle } from 'lucide-react'
import DashboardHeader from '../components/DashboardHeader'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// Lazy load admin components
const UsersTable = lazy(() => import('../components/admin/UsersTable'))
const ErrorLogsTable = lazy(() => import('../components/admin/ErrorLogsTable'))
const SystemAnalytics = lazy(() => import('../components/admin/SystemAnalytics'))
const AuditLogViewer = lazy(() => import('../components/admin/AuditLogViewer'))

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.is_admin) {
      navigate('/dashboard')
    }
  }, [navigate])

  // Fetch analytics data
  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAnalytics(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError('Failed to load analytics data')
      if (err.response?.status === 403) {
        navigate('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'errors', label: 'Error Logs', icon: AlertTriangle },
    { id: 'audit', label: 'Audit Trail', icon: Shield }
  ]

  if (loading && !analytics) {
    return (
      <div className="min-h-screen" style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #0d4f8b 25%, #067a5b 75%, #059669 100%)',
      }}>
        <DashboardHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #1e40af 0%, #0d4f8b 25%, #067a5b 75%, #059669 100%)',
    }}>
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Manage users, monitor errors, and review system activity</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: activeTab === tab.id
                      ? 'rgba(0, 200, 255, 0.2)'
                      : 'rgba(0, 15, 33, 0.3)',
                    border: `1px solid ${activeTab === tab.id ? 'rgba(0, 200, 255, 0.5)' : 'rgba(0, 200, 255, 0.2)'}`,
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.id === 'errors' && analytics?.unresolved_errors > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                      {analytics.unresolved_errors}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <Suspense fallback={<LoadingSpinner />}>
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              {analytics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    icon={Users}
                    title="Total Users"
                    value={analytics.total_users}
                    subtitle={`${analytics.verified_users} verified`}
                  />
                  <StatCard
                    icon={UserCheck}
                    title="Verified Users"
                    value={analytics.verified_users}
                    subtitle={`${Math.round((analytics.verified_users / analytics.total_users) * 100)}% of total`}
                  />
                  <StatCard
                    icon={UserX}
                    title="Unverified Users"
                    value={analytics.unverified_users}
                    subtitle="Need verification"
                  />
                  <StatCard
                    icon={Shield}
                    title="Admin Users"
                    value={analytics.admin_users}
                    subtitle="System administrators"
                  />
                  <StatCard
                    icon={TrendingUp}
                    title="Total Orders"
                    value={analytics.total_orders}
                    subtitle={`${analytics.orders_this_week} this week`}
                  />
                  <StatCard
                    icon={AlertTriangle}
                    title="Total Errors"
                    value={analytics.total_errors}
                    subtitle={`${analytics.unresolved_errors} unresolved`}
                    trend={analytics.unresolved_errors > 0 ? 'down' : 'up'}
                  />
                  <StatCard
                    icon={CheckCircle}
                    title="Pending Installs"
                    value={analytics.pending_installs}
                    subtitle="Upcoming installations"
                  />
                  <StatCard
                    icon={Activity}
                    title="Orders This Month"
                    value={analytics.orders_this_month}
                    subtitle="Last 30 days"
                  />
                </div>
              )}

              {/* System Analytics Charts */}
              <SystemAnalytics analytics={analytics} />

              {/* Recent Errors */}
              {analytics?.recent_errors && analytics.recent_errors.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                      Recent Unresolved Errors
                    </h2>
                    <button
                      onClick={() => setActiveTab('errors')}
                      className="px-4 py-2 rounded-lg font-medium text-white transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(59, 130, 246, 0.7))',
                        border: '1px solid rgba(0, 200, 255, 0.3)'
                      }}
                    >
                      View All Errors
                    </button>
                  </div>
                  <div className="space-y-3">
                    {analytics.recent_errors.map((error) => (
                      <div
                        key={error.errorid}
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 text-xs font-semibold rounded bg-red-500 text-white">
                                {error.error_type}
                              </span>
                              <span className="text-sm text-gray-400">
                                {new Date(error.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-white font-medium mb-1">{error.error_message}</p>
                            {error.endpoint && (
                              <p className="text-sm text-gray-400">
                                {error.method} {error.endpoint}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'users' && <UsersTable onRefresh={fetchAnalytics} />}
          {activeTab === 'errors' && <ErrorLogsTable onRefresh={fetchAnalytics} />}
          {activeTab === 'audit' && <AuditLogViewer />}
        </Suspense>
      </main>
    </div>
  )
}

export default Admin
