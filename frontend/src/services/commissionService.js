import apiClient from './api'

export const commissionService = {
  // Get user's commission settings
  getSettings: async () => {
    const response = await apiClient.get('/api/commission/settings')
    return response.data
  },

  // Update commission settings
  updateSettings: async (settings) => {
    const response = await apiClient.put('/api/commission/settings', settings)
    return response.data
  },

  // Get rate tables
  getRates: async () => {
    const response = await apiClient.get('/api/commission/rates')
    return response.data
  },

  // Get auto-aggregated totals
  getAutoTotals: async () => {
    const response = await apiClient.get('/api/commission/auto-totals')
    return response.data
  },

  // Update value overrides
  updateOverrides: async (overrides) => {
    const response = await apiClient.put('/api/commission/overrides', overrides)
    return response.data
  },

  // Clear all overrides
  clearOverrides: async () => {
    const response = await apiClient.delete('/api/commission/overrides')
    return response.data
  },

  // Get monthly earnings with breakdown
  getEarnings: async () => {
    const response = await apiClient.get('/api/commission/earnings')
    return response.data
  },

  // Get commission estimate for a specific order
  getOrderEstimate: async (orderId) => {
    const response = await apiClient.get(`/api/commission/order/${orderId}/estimate`)
    return response.data
  }
}

export default commissionService

