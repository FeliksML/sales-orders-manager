import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import notificationService from '../../services/notificationService'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

function NotificationsTab() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [filter])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await notificationService.getNotifications({
        unreadOnly: filter === 'unread'
      })
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId, isRead) => {
    try {
      await notificationService.updateNotification(notificationId, !isRead)
      loadNotifications()
    } catch (error) {
      console.error('Failed to update notification:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead()
      loadNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId)
      loadNotifications()
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleClearAll = async () => {
    try {
      await notificationService.deleteAllNotifications()
      setShowClearConfirm(false)
      loadNotifications()
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'install_reminder_24h':
        return '⏰'
      case 'today_install':
        return '📅'
      case 'followup_due':
        return '📞'
      default:
        return '🔔'
    }
  }

  return (
    <div className="p-4 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-2xl font-bold">Notifications</h1>
          <button
            onClick={() => navigate('/notification-settings')}
            className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white rounded-lg transition-all"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.3)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 200, 255, 0.3)',
            }}
          >
            <Settings size={18} />
            <span className="text-sm">Settings</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg backdrop-blur-md transition-all ${
              filter === 'all'
                ? 'bg-white/90 text-blue-700 font-semibold shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg backdrop-blur-md transition-all ${
              filter === 'unread'
                ? 'bg-white/90 text-blue-700 font-semibold shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Actions */}
        <div className="rounded-xl p-3 mb-4 backdrop-blur-md bg-white/20 border border-white/20">
          {showClearConfirm ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-white font-medium">
                Delete all notifications?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-sm text-white/80 hover:text-white font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-white font-medium bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                >
                  Yes, delete all
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium px-3 py-1.5 rounded-lg transition-all"
              >
                Mark all as read
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg transition-all"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Notification List */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-gray-400">
              <div className="text-6xl mb-4">🔔</div>
              <p className="text-lg text-white/80">No notifications</p>
              <p className="text-sm text-white/50">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.notificationid}
                  className={`p-4 backdrop-blur-md rounded-xl transition-all ${
                    !notification.is_read
                      ? 'bg-white/30 border-l-4 border-cyan-400 shadow-lg'
                      : 'bg-white/15 border border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold text-sm ${
                            !notification.is_read
                              ? 'text-white'
                              : 'text-white/80'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>

                      <p className="text-sm text-white/70 mt-1">
                        {notification.message}
                      </p>

                      {/* Delivery Channels */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {notification.sent_via_email && (
                          <span className="text-xs backdrop-blur-md bg-green-500/30 text-green-200 px-2 py-1 rounded-full border border-green-400/30">
                            📧 Email
                          </span>
                        )}
                        {notification.sent_via_sms && (
                          <span className="text-xs backdrop-blur-md bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full border border-blue-400/30">
                            📱 SMS
                          </span>
                        )}
                        {notification.sent_via_browser && (
                          <span className="text-xs backdrop-blur-md bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full border border-purple-400/30">
                            🌐 Browser
                          </span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-white/50">
                          {formatDate(notification.created_at)}
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleMarkAsRead(
                                notification.notificationid,
                                notification.is_read
                              )
                            }
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded-md transition-all"
                          >
                            {notification.is_read
                              ? 'Mark unread'
                              : 'Mark read'}
                          </button>
                          <span className="text-white/30">|</span>
                          <button
                            onClick={() =>
                              handleDelete(notification.notificationid)
                            }
                            className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-md transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationsTab
