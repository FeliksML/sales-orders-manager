import apiClient from './api'

export const auditService = {
  // Get audit history for a specific order
  getOrderHistory: async (orderId, limit = null) => {
    const params = {}
    if (limit) {
      params.limit = limit
    }

    const response = await apiClient.get(`/api/audit/${orderId}/history`, { params })
    return response.data
  },

  // Get a snapshot of an order at a specific timestamp
  getOrderSnapshot: async (orderId, timestamp) => {
    const params = { timestamp }
    const response = await apiClient.get(`/api/audit/${orderId}/snapshot`, { params })
    return response.data
  },

  // Revert an order to a previous state
  revertOrder: async (orderId, timestamp, reason = null) => {
    const response = await apiClient.post(`/api/audit/${orderId}/revert`, {
      timestamp,
      reason
    })
    return response.data
  },

  // Get current user's activity summary
  getUserActivity: async (days = 30) => {
    const params = { days }
    const response = await apiClient.get('/api/audit/user/activity', { params })
    return response.data
  },

  // Get recent changes across all orders
  getRecentChanges: async (limit = 50) => {
    const params = { limit }
    const response = await apiClient.get('/api/audit/orders/recent-changes', { params })
    return response.data
  }
}
