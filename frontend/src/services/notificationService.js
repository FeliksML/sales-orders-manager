import api from './api';

export const notificationService = {
  // Get notification preferences
  async getPreferences() {
    const response = await api.get('/api/notifications/preferences');
    return response.data;
  },

  // Update notification preferences
  async updatePreferences(preferences) {
    const response = await api.put('/api/notifications/preferences', preferences);
    return response.data;
  },

  // Get notifications
  async getNotifications(params = {}) {
    const { skip = 0, limit = 50, unreadOnly = false } = params;
    const response = await api.get('/api/notifications', {
      params: { skip, limit, unread_only: unreadOnly }
    });
    return response.data;
  },

  // Get unread count
  async getUnreadCount() {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  },

  // Mark notification as read/unread
  async updateNotification(notificationId, isRead) {
    const response = await api.put(`/api/notifications/${notificationId}`, {
      is_read: isRead
    });
    return response.data;
  },

  // Mark all as read
  async markAllRead() {
    const response = await api.post('/api/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  async deleteNotification(notificationId) {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },

  // Delete all notifications
  async deleteAllNotifications() {
    const response = await api.delete('/api/notifications');
    return response.data;
  },

  // Request browser notification permission
  async requestBrowserPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  // Show browser notification
  showBrowserNotification(title, options = {}) {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icon.png',
        badge: '/badge.png',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    }
  },

  // Test send reminders
  async testSendReminders() {
    const response = await api.post('/api/notifications/test/send-reminders');
    return response.data;
  }
};

export default notificationService;
