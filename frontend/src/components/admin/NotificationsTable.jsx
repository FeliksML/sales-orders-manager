import { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, Monitor, RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Filter, Calendar, User } from 'lucide-react'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import adminService from '../../services/adminService'

function NotificationsTable() {
  const [activeView, setActiveView] = useState('history')  // 'upcoming' or 'history'
  const [notifications, setNotifications] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [deliveries, setDeliveries] = useState({})
  const [retrying, setRetrying] = useState(null)

  // Filters
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  useEffect(() => {
    fetchData()
  }, [activeView, channelFilter, statusFilter, page])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeView === 'history') {
        const params = {
          skip: page * limit,
          limit,
          ...(channelFilter !== 'all' && { channel: channelFilter }),
          ...(statusFilter !== 'all' && { status: statusFilter })
        }
        const response = await adminService.getNotifications(params)
        setNotifications(response.data)
        setTotalPages(Math.ceil(response.meta.total / limit))
      } else {
        const upcomingData = await adminService.getUpcomingNotifications()
        setUpcoming(upcomingData)
      }

      // Always fetch stats
      const statsData = await adminService.getNotificationStats()
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch notification data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeliveries = async (notificationId) => {
    if (deliveries[notificationId]) {
      setExpandedId(expandedId === notificationId ? null : notificationId)
      return
    }

    try {
      const data = await adminService.getNotificationDeliveries(notificationId)
      setDeliveries(prev => ({ ...prev, [notificationId]: data }))
      setExpandedId(notificationId)
    } catch (err) {
      console.error('Failed to fetch deliveries:', err)
    }
  }

  const handleRetry = async (notificationId, channel = null) => {
    setRetrying({ notificationId, channel })
    try {
      await adminService.retryNotification(notificationId, channel)
      // Refresh deliveries and notifications
      const data = await adminService.getNotificationDeliveries(notificationId)
      setDeliveries(prev => ({ ...prev, [notificationId]: data }))
      fetchData()
    } catch (err) {
      console.error('Failed to retry notification:', err)
      alert('Failed to retry notification')
    } finally {
      setRetrying(null)
    }
  }

  const getStatusBadge = (status) => {
    if (!status) return null

    const styles = {
      sent: { bg: 'bg-green-500', icon: CheckCircle, text: 'Sent' },
      delivered: { bg: 'bg-green-500', icon: CheckCircle, text: 'Delivered' },
      failed: { bg: 'bg-red-500', icon: XCircle, text: 'Failed' },
      pending: { bg: 'bg-yellow-500', icon: Clock, text: 'Pending' }
    }

    const style = styles[status] || styles.pending
    const Icon = style.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${style.bg} text-white`}>
        <Icon className="w-3 h-3" />
        {style.text}
      </span>
    )
  }

  const getChannelIcon = (channel) => {
    const icons = {
      email: Mail,
      sms: MessageSquare,
      browser: Monitor
    }
    return icons[channel] || Bell
  }

  const formatNotificationType = (type) => {
    const types = {
      'install_reminder_24h': '24h Reminder',
      'today_install': 'Today Install',
      'followup_due': 'Follow-up',
      'custom_alert': 'Custom'
    }
    return types[type] || type
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 15, 33, 0.5)', border: '1px solid rgba(0, 200, 255, 0.3)' }}>
            <div className="text-2xl font-bold text-white">{stats.total_sent}</div>
            <div className="text-sm text-gray-400">Total Sent</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 15, 33, 0.5)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="text-2xl font-bold text-red-400">{stats.total_failed}</div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 15, 33, 0.5)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div className="text-2xl font-bold text-green-400">{stats.success_rate}%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 15, 33, 0.5)', border: '1px solid rgba(0, 200, 255, 0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <Mail className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-sm font-medium text-white">{stats.email_sent}</div>
              </div>
              <div className="text-center">
                <MessageSquare className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-sm font-medium text-white">{stats.sms_sent}</div>
              </div>
              <div className="text-center">
                <Monitor className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-sm font-medium text-white">{stats.browser_sent}</div>
              </div>
            </div>
            <div className="text-sm text-gray-400 mt-1">By Channel</div>
          </div>
        </div>
      )}

      <Card>
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveView('upcoming'); setPage(0); }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeView === 'upcoming' ? 'text-white' : 'text-gray-400'
              }`}
              style={{
                backgroundColor: activeView === 'upcoming' ? 'rgba(0, 200, 255, 0.2)' : 'transparent',
                border: `1px solid ${activeView === 'upcoming' ? 'rgba(0, 200, 255, 0.5)' : 'rgba(0, 200, 255, 0.2)'}`
              }}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Upcoming
            </button>
            <button
              onClick={() => { setActiveView('history'); setPage(0); }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeView === 'history' ? 'text-white' : 'text-gray-400'
              }`}
              style={{
                backgroundColor: activeView === 'history' ? 'rgba(0, 200, 255, 0.2)' : 'transparent',
                border: `1px solid ${activeView === 'history' ? 'rgba(0, 200, 255, 0.5)' : 'rgba(0, 200, 255, 0.2)'}`
              }}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              History
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Filters (History only) */}
        {activeView === 'history' && (
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value); setPage(0); }}
              className="px-4 py-2 rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
              style={{
                backgroundColor: 'rgba(0, 15, 33, 0.5)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="browser">Browser</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="px-4 py-2 rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
              style={{
                backgroundColor: 'rgba(0, 15, 33, 0.5)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : activeView === 'upcoming' ? (
          /* Upcoming Notifications */
          <div className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No upcoming notifications scheduled</p>
              </div>
            ) : (
              upcoming.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.5)',
                    border: '1px solid rgba(0, 200, 255, 0.3)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-cyan-500 text-white">
                          {formatNotificationType(item.type)}
                        </span>
                        <span className="text-sm text-gray-400">
                          Expected: {new Date(item.expected_send_time).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white font-medium">{item.business_name}</p>
                      <p className="text-sm text-gray-400">
                        {item.customer_name} - Install: {item.install_date} {item.install_time}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">{item.user_name} ({item.user_email})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.channels_enabled.map(channel => {
                        const Icon = getChannelIcon(channel)
                        return (
                          <span
                            key={channel}
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: 'rgba(0, 200, 255, 0.1)' }}
                            title={channel}
                          >
                            <Icon className="w-4 h-4 text-cyan-400" />
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Notification History */
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No notifications found</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notificationid}
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.5)',
                    border: '1px solid rgba(0, 200, 255, 0.3)'
                  }}
                >
                  {/* Main Row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => fetchDeliveries(notification.notificationid)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white">
                            {formatNotificationType(notification.notification_type)}
                          </span>
                          <span className="text-sm text-gray-400">
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-400 mt-1">{notification.user_name} ({notification.user_email})</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Channel Status Badges */}
                        <div className="flex items-center gap-2">
                          {notification.email_status && (
                            <div className="flex items-center gap-1" title={`Email: ${notification.email_status}`}>
                              <Mail className="w-4 h-4 text-gray-400" />
                              {getStatusBadge(notification.email_status)}
                            </div>
                          )}
                          {notification.sms_status && (
                            <div className="flex items-center gap-1" title={`SMS: ${notification.sms_status}`}>
                              <MessageSquare className="w-4 h-4 text-gray-400" />
                              {getStatusBadge(notification.sms_status)}
                            </div>
                          )}
                          {notification.browser_status && (
                            <div className="flex items-center gap-1" title={`Browser: ${notification.browser_status}`}>
                              <Monitor className="w-4 h-4 text-gray-400" />
                              {getStatusBadge(notification.browser_status)}
                            </div>
                          )}
                        </div>
                        {expandedId === notification.notificationid ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Delivery Details */}
                  {expandedId === notification.notificationid && deliveries[notification.notificationid] && (
                    <div className="border-t border-cyan-500/20 p-4 space-y-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Delivery Attempts</h4>
                      {deliveries[notification.notificationid].length === 0 ? (
                        <p className="text-sm text-gray-400">No delivery records found</p>
                      ) : (
                        deliveries[notification.notificationid].map((delivery) => {
                          const ChannelIcon = getChannelIcon(delivery.channel)
                          return (
                            <div
                              key={delivery.id}
                              className="flex items-center justify-between p-3 rounded-lg"
                              style={{ backgroundColor: 'rgba(0, 15, 33, 0.5)' }}
                            >
                              <div className="flex items-center gap-3">
                                <ChannelIcon className="w-5 h-5 text-cyan-400" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium capitalize">{delivery.channel}</span>
                                    {getStatusBadge(delivery.status)}
                                    <span className="text-xs text-gray-400">
                                      Attempt #{delivery.attempt_number}
                                    </span>
                                  </div>
                                  {delivery.sent_at && (
                                    <p className="text-xs text-gray-400">
                                      {new Date(delivery.sent_at).toLocaleString()}
                                    </p>
                                  )}
                                  {delivery.error_message && (
                                    <p className="text-xs text-red-400 mt-1">{delivery.error_message}</p>
                                  )}
                                </div>
                              </div>
                              {delivery.status === 'failed' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRetry(notification.notificationid, delivery.channel)
                                  }}
                                  disabled={retrying?.notificationId === notification.notificationid}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(59, 130, 246, 0.7))',
                                    border: '1px solid rgba(0, 200, 255, 0.3)'
                                  }}
                                >
                                  {retrying?.notificationId === notification.notificationid && retrying?.channel === delivery.channel ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Retry'
                                  )}
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}

                      {/* Retry All Failed Button */}
                      {(notification.email_status === 'failed' || notification.sms_status === 'failed') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetry(notification.notificationid)
                          }}
                          disabled={retrying?.notificationId === notification.notificationid}
                          className="w-full py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50 mt-4"
                          style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.7), rgba(5, 150, 105, 0.7))',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          {retrying?.notificationId === notification.notificationid && !retrying?.channel ? (
                            <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                          ) : null}
                          Retry All Failed Channels
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.5)',
                    border: '1px solid rgba(0, 200, 255, 0.3)'
                  }}
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.5)',
                    border: '1px solid rgba(0, 200, 255, 0.3)'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default NotificationsTable
