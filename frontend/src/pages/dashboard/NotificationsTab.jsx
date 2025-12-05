import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import notificationService from '../../services/notificationService'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import bellIcon from '../../assets/bell-icon.png'

function NotificationsTab() {
  const navigate = useNavigate()
  const { setViewOrderId } = useOutletContext()
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

  // Handle clicking on a notification to view the associated order
  const handleNotificationClick = async (notification) => {
    if (notification.orderid) {
      // Mark as read when viewing
      if (!notification.is_read) {
        try {
          await notificationService.updateNotification(notification.notificationid, true)
        } catch (error) {
          console.error('Failed to mark notification as read:', error)
        }
      }
      // Set order to view and navigate to orders tab
      setViewOrderId(notification.orderid)
      navigate('/dashboard/orders')
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
        return <img src={bellIcon} alt="Notification" className="w-24 h-24 object-contain" />
    }
  }

  return (
    <div className="px-3 pt-3 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 justify-end md:justify-start">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg backdrop-blur-md transition-all ${filter === 'all'
              ? 'bg-white/90 text-blue-700 font-semibold shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg backdrop-blur-md transition-all ${filter === 'unread'
              ? 'bg-white/90 text-blue-700 font-semibold shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'
              }`}
          >
            Unread
          </button>
        </div>

        {/* Actions */}
        {!loading && notifications.length > 0 && (
          <div className="rounded-xl p-3 mb-4 backdrop-blur-md bg-white/20 border border-white/20">
            {showClearConfirm ? (
              <div className="flex items-start gap-2">
                <span className="text-sm text-white font-medium">
                  Delete all notifications?
                </span>
                <div className="flex gap-2 ml-auto">
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
              <div className="flex items-center justify-end gap-3 md:justify-between">
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
        )}

        {/* Notification List */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-gray-400">
              <img src={bellIcon} alt="No notifications" className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg text-white/80">No notifications</p>
              <p className="text-sm text-white/50">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.notificationid}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 backdrop-blur-md rounded-xl transition-all ${!notification.is_read
                    ? 'bg-white/30 border-l-4 border-cyan-400 shadow-lg'
                    : 'bg-white/15 border border-white/10'
                    } ${notification.orderid ? 'cursor-pointer active:scale-[0.98]' : ''}`}
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
                          className={`font-semibold text-sm ${!notification.is_read
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

                      {/* Business & Customer Name - clickable hint */}
                      {notification.account_name && (
                        <p className={`text-xs font-medium mt-0.5 ${notification.orderid ? 'text-cyan-400' : 'text-cyan-400/70'
                          }`}>
                          {notification.account_name}
                          {notification.customer_name && (
                            <span className="text-white/50 font-normal"> · {notification.customer_name}</span>
                          )}
                          {notification.orderid && <span className="ml-1 text-white/40">→ View</span>}
                        </p>
                      )}

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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(
                                notification.notificationid,
                                notification.is_read
                              )
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded-md transition-all"
                          >
                            {notification.is_read
                              ? 'Mark unread'
                              : 'Mark read'}
                          </button>
                          <span className="text-white/30">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.notificationid)
                            }}
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
