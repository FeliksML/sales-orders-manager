import api from './api';

export const adminService = {
  // Get paginated notifications with filters
  async getNotifications(params = {}) {
    const response = await api.get('/api/admin/notifications', { params });
    return response.data;
  },

  // Get upcoming notifications (predictive view)
  async getUpcomingNotifications() {
    const response = await api.get('/api/admin/notifications/upcoming');
    return response.data;
  },

  // Get delivery attempts for a specific notification
  async getNotificationDeliveries(notificationId) {
    const response = await api.get(`/api/admin/notifications/${notificationId}/deliveries`);
    return response.data;
  },

  // Retry failed notification delivery
  async retryNotification(notificationId, channel = null) {
    const response = await api.post(
      `/api/admin/notifications/${notificationId}/retry`,
      channel ? { channel } : {}
    );
    return response.data;
  },

  // Get notification delivery statistics
  async getNotificationStats() {
    const response = await api.get('/api/admin/notifications/stats');
    return response.data;
  }
};

export default adminService;
