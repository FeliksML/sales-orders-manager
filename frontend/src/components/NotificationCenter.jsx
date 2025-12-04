import { useState, useEffect } from 'react';
import notificationService from '../services/notificationService';

const NotificationCenter = ({ isOpen, onClose, onViewOrder }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Handle clicking on a notification to view the associated order
  const handleNotificationClick = async (notification) => {
    if (notification.orderid && onViewOrder) {
      // Mark as read when viewing
      if (!notification.is_read) {
        try {
          await notificationService.updateNotification(notification.notificationid, true);
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      }
      onViewOrder(notification.orderid);
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  // Reset confirmation when panel closes
  useEffect(() => {
    if (!isOpen) {
      setShowClearConfirm(false);
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications({
        unreadOnly: filter === 'unread'
      });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId, isRead) => {
    try {
      await notificationService.updateNotification(notificationId, !isRead);
      loadNotifications();
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationService.deleteAllNotifications();
      setShowClearConfirm(false);
      loadNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'install_reminder_24h':
        return '⏰';
      case 'today_install':
        return '📅';
      case 'followup_due':
        return '📞';
      default:
        return '🔔';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Click to close */}
      <div
        className="fixed inset-0 z-[100]"
        onClick={onClose}
      />

      {/* Slide-in Panel with Frosted Glass Effect */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-[101] flex flex-col animate-slide-in backdrop-blur-2xl bg-white/30 border-l border-white/20 rounded-l-[2rem] overflow-hidden">
        {/* Header with Frosted Glass */}
        <div className="backdrop-blur-md bg-gradient-to-r from-blue-700/80 to-green-600/80 text-white p-4 border-b border-white/30 rounded-tl-[2rem]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Notifications</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1 rounded-full backdrop-blur-md transition-all ${
                filter === 'all'
                  ? 'bg-white/95 text-blue-700 font-semibold shadow-lg'
                  : 'bg-white/25 text-white hover:bg-white/40'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-1 rounded-full backdrop-blur-md transition-all ${
                filter === 'unread'
                  ? 'bg-white/95 text-blue-700 font-semibold shadow-lg'
                  : 'bg-white/25 text-white hover:bg-white/40'
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Actions / Confirmation */}
        <div className="border-b border-white/20 p-3 backdrop-blur-md bg-white/30">
          {showClearConfirm ? (
            // Inline Confirmation
            <div className="flex items-center justify-between gap-2 animate-fade-in">
              <span className="text-sm text-gray-700 font-medium">
                Delete all notifications?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium bg-gray-100/70 hover:bg-gray-200/70 px-3 py-1.5 rounded-lg transition-all"
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
            // Normal Actions
            <div className="flex justify-between items-center">
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50/50 px-3 py-1.5 rounded-lg transition-all"
              >
                Mark all as read
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-sm text-red-600 hover:text-red-800 font-medium hover:bg-red-50/50 px-3 py-1.5 rounded-lg transition-all"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-400">
              <div className="text-6xl mb-4">🔔</div>
              <p className="text-lg">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.notificationid}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-white/50 transition-all backdrop-blur-md rounded-2xl mx-3 my-1.5 ${
                    !notification.is_read ? 'bg-white/40 border-l-4 border-blue-500 shadow-sm' : 'bg-white/20'
                  } ${notification.orderid ? 'cursor-pointer' : ''}`}
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
                              ? 'text-blue-900'
                              : 'text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>

                      {/* Account Name - Clickable hint */}
                      {notification.account_name && (
                        <p className={`text-xs font-medium mt-0.5 ${notification.orderid ? 'text-blue-600 hover:underline' : 'text-blue-600'}`}>
                          {notification.account_name}
                          {notification.orderid && <span className="ml-1 text-gray-400">→ View order</span>}
                        </p>
                      )}

                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>

                      {/* Delivery Channels */}
                      <div className="flex gap-2 mt-2">
                        {notification.sent_via_email && (
                          <span className="text-xs backdrop-blur-md bg-green-100/70 text-green-800 px-2 py-1 rounded-full border border-green-200/30">
                            📧 Email
                          </span>
                        )}
                        {notification.sent_via_sms && (
                          <span className="text-xs backdrop-blur-md bg-blue-100/70 text-blue-800 px-2 py-1 rounded-full border border-blue-200/30">
                            📱 SMS
                          </span>
                        )}
                        {notification.sent_via_browser && (
                          <span className="text-xs backdrop-blur-md bg-purple-100/70 text-purple-800 px-2 py-1 rounded-full border border-purple-200/30">
                            🌐 Browser
                          </span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(
                                notification.notificationid,
                                notification.is_read
                              );
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50/50 px-2 py-1 rounded-md transition-all"
                          >
                            {notification.is_read
                              ? 'Mark unread'
                              : 'Mark read'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.notificationid);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 font-medium hover:bg-red-50/50 px-2 py-1 rounded-md transition-all"
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
    </>
  );
};

export default NotificationCenter;
